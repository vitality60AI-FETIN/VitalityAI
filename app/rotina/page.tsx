"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Sparkles,
  StickyNote,
  Waves,
  Search,
  Check,
  Clock,
  Radio,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { auth, db } from "../../lib/firebase";
import { useInstitucaoId } from "../../lib/hooks";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  doc,
  collection,
  query,
  serverTimestamp,
  where,
  onSnapshot,
} from "firebase/firestore";
import ActivitySection from "../components/ActivitySection";
import { ACTIVITY_TYPES, ActivityType, useAllActivityTypes } from "../../lib/activityTypes";
import ConfirmDialog from "../components/ConfirmDialog";
import { normalizeLogRecords, NormalizedLogRecord } from "../../lib/logNormalizer";
import { enriquecerPacientesComStatus } from "../../lib/statusSeguranca";

interface Paciente {
  id: string;
  nome: string;
  idade: string;
  fotoUrl?: string;
  statusSeguranca: string;
}

type ActivityDraft = {
  status: string;
  detail: string;
};

type LogDraft = {
  atividades: Record<ActivityType, ActivityDraft>;
  observacaoTurno: string;
};

type ConclusaoTurno = {
  pacienteId: string;
  pacienteNome: string;
  dataTurno: string;
  atividades: Array<{
    tipo: ActivityType;
    label: string;
    status: string;
    detail: string;
  }>;
  observacaoTurno: string;
};

const criarDraftVazio = (): LogDraft => {
  const atividades = Object.keys(ACTIVITY_TYPES).reduce((acc, key) => {
    const tipo = key as ActivityType;
    acc[tipo] = { status: "", detail: "" };
    return acc;
  }, {} as Record<ActivityType, ActivityDraft>);

  return {
    atividades,
    observacaoTurno: "",
  };
};

const formatarDataParaInput = (data: Date = new Date()) => {
  const ajusteFuso = data.getTimezoneOffset() * 60000;
  return new Date(data.getTime() - ajusteFuso).toISOString().slice(0, 10);
};

export default function LogRotinaPage() {
  const [loading, setLoading] = useState(true);
  const [rawPacientes, setRawPacientes] = useState<Paciente[]>([]);
  const [logs, setLogs] = useState<NormalizedLogRecord[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [drafts, setDrafts] = useState<Record<string, LogDraft>>({});
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [conclusaoTurno, setConclusaoTurno] = useState<ConclusaoTurno | null>(null);
  const [salvandoTurno, setSalvandoTurno] = useState(false);

  const router = useRouter();
  const { instituicaoId, loading: loadingInstituicao } = useInstitucaoId();
  const allActivityTypes = useAllActivityTypes();

  // Escutar Pacientes e LogsRotina em TEMPO REAL (onSnapshot)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      if (loadingInstituicao) return;
      if (!instituicaoId) {
        router.push("/onboarding");
        return;
      }

      // 1. Listener em Tempo Real para Pacientes da instituição
      const qPacientes = query(
        collection(db, "Pacientes"),
        where("instituicaoId", "==", instituicaoId)
      );
      const unsubPacientes = onSnapshot(
        qPacientes,
        (snap) => {
          const lista: Paciente[] = [];
          snap.forEach((doc) => {
            lista.push({ id: doc.id, ...doc.data() } as Paciente);
          });
          setRawPacientes(lista);
          setLoading(false);
        },
        (err) => {
          console.error("Erro realtime pacientes:", err);
          setLoading(false);
        }
      );

      // 2. Listener em Tempo Real para LogsRotina da instituição
      const qLogs = query(
        collection(db, "LogsRotina"),
        where("instituicaoId", "==", instituicaoId)
      );
      const unsubLogs = onSnapshot(
        qLogs,
        (snap) => {
          const lista = normalizeLogRecords(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
          setLogs(lista);
        },
        (err) => {
          console.error("Erro realtime logs:", err);
        }
      );

      (unsubscribeAuth as unknown as Record<string, () => void>)._unsubPacientes = unsubPacientes;
      (unsubscribeAuth as unknown as Record<string, () => void>)._unsubLogs = unsubLogs;
    });

    return () => {
      try {
        const authUnsub = unsubscribeAuth as unknown as Record<string, (() => void) | undefined>;
        if (typeof unsubscribeAuth === "function") unsubscribeAuth();
        if (authUnsub._unsubPacientes) authUnsub._unsubPacientes();
        if (authUnsub._unsubLogs) authUnsub._unsubLogs();
      } catch (e) {}
    };
  }, [router, instituicaoId, loadingInstituicao]);

  // Derivar pacientes com statusSeguranca dinâmico baseado em logs em tempo real
  const pacientes = useMemo(() => {
    return enriquecerPacientesComStatus(rawPacientes, logs);
  }, [rawPacientes, logs]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  // Preencher drafts com os dados gravados hoje no banco para facilitar visualização e edição
  useEffect(() => {
    if (logs.length === 0 || rawPacientes.length === 0) return;
    const hojeStr = formatarDataParaInput();

    setDrafts((prevDrafts) => {
      const nextDrafts = { ...prevDrafts };
      let changed = false;

      rawPacientes.forEach((paciente) => {
        const pacienteDraft = nextDrafts[paciente.id] || criarDraftVazio();
        const logsHoje = logs.filter((l) => {
          if (l.pacienteId !== paciente.id) return false;
          const dStr = l.dataTurno || (l.dataHora?.toDate ? l.dataHora.toDate().toISOString().slice(0, 10) : "");
          return dStr === hojeStr;
        });

        if (logsHoje.length === 0) return;

        let draftUpdated = false;
        const newAtividades = { ...pacienteDraft.atividades };
        let obsTurno = pacienteDraft.observacaoTurno;

        logsHoje.forEach((log) => {
          const tipo = log.tipo as ActivityType;
          if (newAtividades[tipo] && !newAtividades[tipo].status && log.status) {
            newAtividades[tipo] = {
              status: log.status,
              detail: log.detalhe || "",
            };
            draftUpdated = true;
          }
          if (!obsTurno && log.observacaoTurno) {
            obsTurno = log.observacaoTurno;
            draftUpdated = true;
          }
        });

        if (draftUpdated) {
          nextDrafts[paciente.id] = {
            atividades: newAtividades,
            observacaoTurno: obsTurno,
          };
          changed = true;
        }
      });

      return changed ? nextDrafts : prevDrafts;
    });
  }, [logs, rawPacientes]);

  const irParaCadastroPaciente = () => {
    router.push("/pacientes/novo");
  };

  const obterDraft = (pacienteId: string) => {
    return drafts[pacienteId] ?? criarDraftVazio();
  };

  const atualizarDraft = (
    pacienteId: string,
    tipo: ActivityType,
    campo: "status" | "detail",
    valor: string
  ) => {
    setDrafts((current) => ({
      ...current,
      [pacienteId]: {
        ...obterDraft(pacienteId),
        atividades: {
          ...obterDraft(pacienteId).atividades,
          [tipo]: {
            ...obterDraft(pacienteId).atividades[tipo],
            [campo]: valor,
          },
        },
      },
    }));
  };

  const montarConclusaoTurno = (paciente: Paciente): ConclusaoTurno | null => {
    const draft = obterDraft(paciente.id);
    const atividades = (Object.keys(ACTIVITY_TYPES) as ActivityType[])
      .map((tipo) => ({
        tipo,
        label: ACTIVITY_TYPES[tipo].label,
        status: draft.atividades[tipo].status,
        detail: draft.atividades[tipo].detail,
      }))
      .filter((item) => item.status);

    if (atividades.length === 0 && !draft.observacaoTurno.trim()) {
      return null;
    }

    return {
      pacienteId: paciente.id,
      pacienteNome: paciente.nome,
      dataTurno: formatarDataParaInput(),
      atividades,
      observacaoTurno: draft.observacaoTurno.trim(),
    };
  };

  const abrirConclusaoTurno = (paciente: Paciente) => {
    const resumo = montarConclusaoTurno(paciente);
    if (!resumo) {
      setToast({ message: "Preencha ao menos uma atividade antes de concluir.", variant: "error" });
      return;
    }
    setConclusaoTurno(resumo);
  };

  const salvarConclusaoTurno = async () => {
    if (!conclusaoTurno) return;

    try {
      const usuarioAtual = auth.currentUser;
      if (!usuarioAtual) {
        router.push("/login");
        return;
      }
      if (!instituicaoId) {
        setToast({ message: "Instituição não encontrada.", variant: "error" });
        return;
      }

      setSalvandoTurno(true);
      const draft = obterDraft(conclusaoTurno.pacienteId);

      for (const atividade of conclusaoTurno.atividades) {
        const detalhe = atividade.detail;
        const resumo = detalhe ? `${atividade.status} - ${detalhe}` : atividade.status;

        // Limitar a 1 log por dia/tipo por paciente: se já existir log hoje, edita/atualiza ao invés de duplicar
        const qExisting = query(
          collection(db, "LogsRotina"),
          where("instituicaoId", "==", instituicaoId),
          where("pacienteId", "==", conclusaoTurno.pacienteId),
          where("tipo", "==", atividade.tipo),
          where("dataTurno", "==", conclusaoTurno.dataTurno)
        );
        const snap = await getDocs(qExisting);

        if (!snap.empty) {
          // Atualizar o log de hoje existente
          const existingDocId = snap.docs[0].id;
          await updateDoc(doc(db, "LogsRotina", existingDocId), {
            cuidadorId: usuarioAtual.uid,
            dataHora: serverTimestamp(),
            status: atividade.status,
            resumo,
            detalhe,
            observacaoTurno: draft.observacaoTurno.trim(),
            turnoEncerrado: true,
          });

          // Remover quaisquer duplicatas adicionais do mesmo dia
          for (let i = 1; i < snap.docs.length; i++) {
            await deleteDoc(doc(db, "LogsRotina", snap.docs[i].id));
          }
        } else {
          // Criar novo registro para hoje
          await addDoc(collection(db, "LogsRotina"), {
            pacienteId: conclusaoTurno.pacienteId,
            cuidadorId: usuarioAtual.uid,
            instituicaoId,
            dataHora: serverTimestamp(),
            dataTurno: conclusaoTurno.dataTurno,
            tipo: atividade.tipo,
            status: atividade.status,
            resumo,
            detalhe,
            observacaoTurno: draft.observacaoTurno.trim(),
            turnoEncerrado: true,
          });
        }
      }

      // Limpar rascunho do paciente recém-salvo
      setDrafts((prev) => ({
        ...prev,
        [conclusaoTurno.pacienteId]: criarDraftVazio(),
      }));

      setToast({
        message: `Turno de ${conclusaoTurno.pacienteNome} concluído e salvo com sucesso!`,
        variant: "success",
      });
      setConclusaoTurno(null);
    } catch (error) {
      console.error("Erro ao salvar turno:", error);
      setToast({ message: "Erro ao salvar os logs do turno.", variant: "error" });
    } finally {
      setSalvandoTurno(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600" />
          <p className="text-sm font-semibold text-slate-500">Carregando Logs de Rotina Ao Vivo...</p>
        </div>
      </div>
    );
  }

  const hojeStr = new Date().toISOString().slice(0, 10);

  return (
    <DashboardLayout>
      {/* Toast Notification */}
      {toast ? (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-2xl backdrop-blur-md ${
              toast.variant === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-100 font-bold"
                : "border-red-200 bg-red-50 text-red-800 shadow-red-100 font-bold"
            }`}
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <p className="text-sm">{toast.message}</p>
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-7xl px-4 md:px-6 py-6 md:py-10">
        {/* Header da Tela */}
        <header className="mb-6 md:mb-8 flex flex-col gap-4 md:gap-6 lg:flex-row lg:items-end lg:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-800">
                <Radio className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                Atualizações Ao Vivo (Realtime)
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">
              Log de Rotina Assistencial
            </h1>
            <p className="mt-2 text-slate-500 text-sm md:text-base max-w-2xl">
              Marque as atividades prestadas durante o turno. As informações atualizam instantaneamente e alimentam o status do residente.
            </p>
          </div>

          <div className="rounded-2xl md:rounded-3xl border border-blue-100 bg-blue-50/70 p-4 md:p-5 text-sm text-blue-900 shadow-sm min-w-0 md:min-w-[280px]">
            <div className="flex items-center gap-2 font-black">
              <History className="h-4 w-4 text-blue-600" />
              Rascunho Inteligente
            </div>
            <p className="mt-1 text-xs text-blue-700 leading-relaxed">
              Os itens marcados permanecem gravados em rascunho. Clique em <strong>"Concluir Turno"</strong> para registrar a validação assistencial.
            </p>
          </div>
        </header>

        {pacientes.length === 0 ? (
          <div className="rounded-[2.5rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Waves className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-slate-900">Nenhum residente cadastrado</h2>
            <p className="mt-2 text-slate-500">Cadastre o primeiro residente para liberar o registro de rotina.</p>
            <button
              onClick={irParaCadastroPaciente}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20"
            >
              + Cadastrar Residente
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Campo de Busca de Residentes */}
            <div className="relative flex items-center rounded-2xl md:rounded-[2rem] border border-slate-200 bg-white p-2 shadow-sm focus-within:border-blue-500 focus-within:shadow-md transition-all">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                placeholder="Buscar residente pelo nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent px-4 py-3 text-base font-bold text-slate-800 placeholder-slate-400 outline-none"
              />
            </div>

            {/* Lista de Cards dos Residentes */}
            {pacientes
              .filter((p) => p.nome.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((paciente) => {
                const draft = obterDraft(paciente.id);
                const isExpanded = Boolean(expanded[paciente.id]);

                // Identificar atividades já gravadas HOJE no banco
                const logsHojePaciente = logs.filter((l) => {
                  if (l.pacienteId !== paciente.id) return false;
                  const dataL = l.dataTurno || (l.dataHora?.toDate ? l.dataHora.toDate().toISOString().slice(0, 10) : "");
                  return dataL === hojeStr;
                });

                // Atividades marcadas no rascunho atual
                const atividadesPreenchidasDraft = (Object.keys(ACTIVITY_TYPES) as ActivityType[]).filter(
                  (tipo) => Boolean(draft.atividades[tipo].status)
                );

                const totalRegistradosBanco = logsHojePaciente.length;
                const totalRascunhoAtual = atividadesPreenchidasDraft.length;

                return (
                  <div
                    key={paciente.id}
                    className={`group/patient overflow-hidden rounded-3xl md:rounded-[2.5rem] border bg-white shadow-sm transition-all duration-300 ${
                      isExpanded
                        ? "border-blue-400 ring-2 ring-blue-100 shadow-xl"
                        : "border-slate-200 hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    {/* Top Header Card Residente */}
                    <div
                      className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 p-4 md:p-6 cursor-pointer hover:bg-slate-50/60 transition-colors"
                      onClick={() => setExpanded((s) => ({ ...s, [paciente.id]: !s[paciente.id] }))}
                    >
                      <div className="flex items-center gap-3 md:gap-4 min-w-0">
                        <div className="flex h-11 w-11 md:h-14 md:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl md:rounded-2xl bg-blue-50 text-blue-700 font-black text-lg md:text-xl shadow-sm">
                          {paciente.fotoUrl ? (
                            <img src={paciente.fotoUrl} alt={paciente.nome} className="h-full w-full object-cover" />
                          ) : (
                            paciente.nome.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight truncate group-hover/patient:text-blue-600 transition-colors">
                            {paciente.nome}
                            <span className="text-xs md:text-sm font-semibold text-slate-400 ml-1">
                              • {paciente.idade} anos
                            </span>
                          </h3>
                          <p className="text-[11px] md:text-xs font-semibold text-slate-500 mt-0.5">
                            {isExpanded ? "Clique para recolher" : "Toque para registrar rotina"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-14 md:ml-0">
                        <span
                          className={`rounded-full border px-2.5 md:px-3 py-1 text-[10px] md:text-[11px] font-black uppercase tracking-wider ${
                            paciente.statusSeguranca === "Verde"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : paciente.statusSeguranca === "Amarelo"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {paciente.statusSeguranca === "Verde"
                            ? "Estável"
                            : paciente.statusSeguranca === "Amarelo"
                            ? "Atenção"
                            : "Alerta Crítico"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/pacientes/${paciente.id}`);
                          }}
                          className="rounded-xl md:rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-3 md:px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all ios-press min-h-[44px] md:min-h-0"
                        >
                          Prontuário
                        </button>
                      </div>
                    </div>

                    {/* BANNER DINÂMICO AO VIVO: RASCUNHO & HISTÓRICO DE HOJE */}
                    <div className="border-t border-slate-100 bg-slate-50/70 px-4 md:px-6 py-3 md:py-3.5 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                          Rotina de Hoje:
                        </span>

                        {totalRegistradosBanco > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800 shadow-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {totalRegistradosBanco} registro(s) salvos no banco
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">Nenhuma atividade salva hoje</span>
                        )}

                        {totalRascunhoAtual > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-extrabold text-amber-900 border border-amber-200 shadow-sm">
                            + {totalRascunhoAtual} item(ns) prontos no rascunho
                          </span>
                        )}
                      </div>

                      <span className="font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" /> Realtime
                      </span>
                    </div>

                    {/* Conteúdo Expandido do Card do Residente */}
                    {isExpanded && (
                      <>
                        <div className="grid gap-3 md:gap-4 border-t border-slate-100 bg-slate-50/50 p-3 md:p-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                          {allActivityTypes.map((activityType) => {
                            const tipo = activityType.id as ActivityType;
                            const selectedStatus = draft.atividades[tipo].status;

                            return (
                              <ActivitySection
                                key={tipo}
                                tipo={tipo}
                                selectedStatus={selectedStatus}
                                onOptionClick={(status: string) =>
                                  atualizarDraft(paciente.id, tipo, "status", status)
                                }
                                detailValue={draft.atividades[tipo].detail}
                                onDetailChange={(value: string) =>
                                  atualizarDraft(paciente.id, tipo, "detail", value)
                                }
                              />
                            );
                          })}
                        </div>

                        <div className="border-t border-slate-100 bg-white p-4 md:p-8">
                          <div className="mb-4 md:mb-6 rounded-2xl md:rounded-[2rem] border border-slate-100 bg-slate-50/70 p-4 md:p-6">
                            <label className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                              <StickyNote className="h-4 w-4 text-blue-600" />
                              Observação Geral do Turno (Opcional)
                            </label>
                            <textarea
                              value={draft.observacaoTurno}
                              onChange={(e) =>
                                setDrafts((prev) => ({
                                  ...prev,
                                  [paciente.id]: {
                                    ...obterDraft(paciente.id),
                                    observacaoTurno: e.target.value,
                                  },
                                }))
                              }
                              rows={2}
                              placeholder="Observação geral para a passagem de plantão..."
                              className="w-full rounded-xl md:rounded-2xl border-2 border-slate-200 bg-white p-3 md:p-4 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 transition-all resize-none"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-xs font-semibold text-slate-500">
                              {totalRascunhoAtual > 0
                                ? `Pronto para registrar ${totalRascunhoAtual} atividade(s) para ${paciente.nome}.`
                                : "Selecione ao menos uma atividade acima para liberar a conclusão."}
                            </p>
                            <button
                              onClick={() => abrirConclusaoTurno(paciente)}
                              disabled={totalRascunhoAtual === 0 && !draft.observacaoTurno.trim()}
                              className="w-full sm:w-auto rounded-2xl bg-slate-900 hover:bg-blue-600 text-white px-6 md:px-8 py-3.5 md:py-4 min-h-[44px] font-black text-sm shadow-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 ios-press"
                            >
                              Concluir Turno de {paciente.nome.split(" ")[0]}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </main>

      {/* DIÁLOGO DE CONFIRMAÇÃO DE CONCLUSÃO DE TURNO */}
      {conclusaoTurno && (
        <ConfirmDialog
          isOpen={Boolean(conclusaoTurno)}
          variant="info"
          title={`Concluir Turno - ${conclusaoTurno.pacienteNome}`}
          description="Confira abaixo os itens que serão gravados no prontuário digital deste idoso:"
          confirmText="Salvar e Registrar Turno"
          cancelText="Revisar Rascunho"
          isLoading={salvandoTurno}
          onConfirm={salvarConclusaoTurno}
          onCancel={() => setConclusaoTurno(null)}
        >
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {conclusaoTurno.atividades.map((item) => (
              <div
                key={item.tipo}
                className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-xs border border-slate-100"
              >
                <div>
                  <span className="font-extrabold text-slate-900">{item.label}: </span>
                  <span className="font-bold text-blue-700">{item.status}</span>
                  {item.detail && <p className="text-slate-500 mt-0.5">Detalhe: {item.detail}</p>}
                </div>
              </div>
            ))}
            {conclusaoTurno.observacaoTurno && (
              <div className="rounded-2xl bg-blue-50/70 p-3 text-xs text-blue-900 border border-blue-100">
                <strong>Obs. Geral:</strong> {conclusaoTurno.observacaoTurno}
              </div>
            )}
          </div>
        </ConfirmDialog>
      )}
    </DashboardLayout>
  );
}