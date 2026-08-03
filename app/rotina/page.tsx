"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Sparkles,
  StickyNote,
  Waves,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { auth, db } from "../../lib/firebase";
import { useInstitucaoId } from "../../lib/hooks";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import ActivitySection from "../components/ActivitySection";
import { ACTIVITY_TYPES, ActivityType, useAllActivityTypes } from "../../lib/activityTypes";
import ConfirmDialog from "../components/ConfirmDialog";

interface Paciente {
  id: string;
  nome: string;
  idade: string;
  statusSeguranca: string;
}

type FeedbackState = {
  pacienteId: string;
  tipoRotina: ActivityType;
  valor: string;
} | null;

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

const formatarDataHumana = (valor: string) => {
  const data = new Date(`${valor}T12:00:00`);
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function LogRotinaPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Cuidador");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [drafts, setDrafts] = useState<Record<string, LogDraft>>({});
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [conclusaoTurno, setConclusaoTurno] = useState<ConclusaoTurno | null>(null);
  const [salvandoTurno, setSalvandoTurno] = useState(false);

  const router = useRouter();
  const { instituicaoId, loading: loadingInstituicao } = useInstitucaoId();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      
      // Ainda carregando instituicaoId
      if (loadingInstituicao) {
        return;
      }

      // Novo usuário que ainda não completou onboarding
      if (!instituicaoId) {
        router.push("/onboarding");
        return;
      }

      try {
        // Mostrar pacientes da instituição (não apenas os do cuidador)
        const q = query(
          collection(db, "Pacientes"),
          where("instituicaoId", "==", instituicaoId)
        );
        const querySnapshot = await getDocs(q);
        const listaPacientes: Paciente[] = [];

        querySnapshot.forEach((doc) => {
          listaPacientes.push({ id: doc.id, ...doc.data() } as Paciente);
        });

        setPacientes(listaPacientes);
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error);
        setToast({ message: "Não foi possível carregar os residentes.", variant: "error" });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, instituicaoId, loadingInstituicao]);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2200);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const irParaCadastroPaciente = () => {
    router.push("/pacientes/novo");
  };

  const obterDraft = (pacienteId: string) => {
    return drafts[pacienteId] ?? criarDraftVazio();
  };

  const atualizarDraft = (pacienteId: string, tipo: ActivityType, campo: "status" | "detail", valor: string) => {
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

      setDrafts((current) => ({
        ...current,
        [conclusaoTurno.pacienteId]: criarDraftVazio(),
      }));
      setToast({ message: `Logs de ${conclusaoTurno.pacienteNome} salvos com sucesso.`, variant: "success" });
      setConclusaoTurno(null);
    } catch (error) {
      console.error("Erro ao salvar turno:", error);
      setToast({ message: "Falha ao salvar os logs do turno.", variant: "error" });
    } finally {
      setSalvandoTurno(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  const allActivityTypes = useAllActivityTypes();

  return (
    <DashboardLayout>
        {toast ? (
          <div className="pointer-events-none fixed right-4 top-4 z-50">
            <div
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md ${
                toast.variant === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-100"
                  : "border-red-200 bg-red-50 text-red-800 shadow-red-100"
              }`}
            >
              {toast.variant === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              <p className="text-sm font-semibold">{toast.message}</p>
            </div>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-7xl px-6 py-10">
          <header className="mb-10 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                <Sparkles className="h-3.5 w-3.5" />
                Registro Assistencial
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-800 md:text-4xl">Log de Rotina</h1>
              <p className="mt-2 max-w-2xl text-lg text-slate-500">
                Preencha as atividades ao longo do turno e, ao final, revise tudo antes de salvar. Nada vai para o prontuário sem sua confirmação.
              </p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-sm text-blue-800 shadow-sm">
              <div className="flex items-center gap-2 font-black">
                <History className="h-4 w-4" />
                Revisão final obrigatória
              </div>
              <p className="mt-2 max-w-sm leading-6 text-blue-700">
                Você pode marcar atividades, adicionar detalhes e só depois concluir o turno para salvar os logs do paciente.
              </p>
            </div>

            <button
              onClick={irParaCadastroPaciente}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-200 sm:hidden"
            >
              +
            </button>
          </header>

          {pacientes.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Waves className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Nenhum residente disponível</h2>
              <p className="mt-2 text-slate-500">Cadastre um paciente para começar a registrar os logs de rotina.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="mb-2">
                <input
                  placeholder="Buscar residente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                />
              </div>
              {pacientes
                .filter((p) => p.nome.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((paciente) => {
                const draft = obterDraft(paciente.id);
                const isExpanded = Boolean(expanded[paciente.id]);
                const atividadesPreenchidas = (Object.keys(ACTIVITY_TYPES) as ActivityType[]).filter(
                  (tipo) => Boolean(draft.atividades[tipo].status)
                );
                const resumoLabel = atividadesPreenchidas.length
                  ? `${atividadesPreenchidas.length} atividade(s) pronta(s) para concluir`
                  : "Ainda sem atividades marcadas neste turno";

                return (
                  <div key={paciente.id} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-100">
                    <div className="flex items-center justify-between gap-4 p-4 cursor-pointer" onClick={() => setExpanded((s) => ({ ...s, [paciente.id]: !s[paciente.id] }))}>
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl font-black text-blue-700">{paciente.nome.charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{paciente.nome} • {paciente.idade} anos</p>
                          <p className="mt-1 text-xs text-slate-500 truncate">Clique para expandir e registrar atividades</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`rounded-full px-3 py-1 text-xs font-bold ${paciente.statusSeguranca === "Verde" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>{paciente.statusSeguranca}</div>
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/pacientes/${paciente.id}`); }} className="rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600">Abrir</button>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-sm text-slate-600">
                      <span className="font-bold text-slate-900">Rascunho do turno:</span> {resumoLabel}
                    </div>

                    {isExpanded ? (
                      <>
                        <div className="grid gap-4 border-t border-slate-100 bg-slate-50/70 p-6 lg:grid-cols-2 xl:grid-cols-3">
                          {allActivityTypes.map((activityType) => {
                            const tipo = activityType.id as ActivityType;
                            const selectedStatus = draft.atividades[tipo].status;

                            return (
                              <ActivitySection
                                key={tipo}
                                tipo={tipo}
                                selectedStatus={selectedStatus}
                                onOptionClick={(status: string) => atualizarDraft(paciente.id, tipo, "status", status)}
                                detailValue={draft.atividades[tipo].detail}
                                onDetailChange={(value: string) => atualizarDraft(paciente.id, tipo, "detail", value)}
                              />
                            );
                          })}
                        </div>

                        <div className="border-t border-slate-100 bg-white px-6 pb-6 pt-5">
                          <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                              <StickyNote className="h-3.5 w-3.5" />
                              Observação do turno
                            </label>
                            <textarea
                              value={draft.observacaoTurno}
                              onChange={(e) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [paciente.id]: {
                                    ...obterDraft(paciente.id),
                                    observacaoTurno: e.target.value,
                                  },
                                }))
                              }
                              rows={2}
                              placeholder="Ex: residente mais sonolento, precisou de ajuda extra, houve visita da família..."
                              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
                            />
                            <p className="mt-2 text-xs text-slate-400">
                              Essa observação será anexada aos registros quando você concluir o turno.
                            </p>
                          </div>

                          <button
                            onClick={() => abrirConclusaoTurno(paciente)}
                            className="w-full rounded-3xl bg-slate-900 px-5 py-4 text-sm font-black text-white transition-all hover:bg-blue-600"
                          >
                            Concluir turno deste paciente
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <ConfirmDialog
          isOpen={Boolean(conclusaoTurno)}
          title={conclusaoTurno ? `Concluir turno de ${conclusaoTurno.pacienteNome}?` : "Concluir turno"}
          description={conclusaoTurno ? `Revisão dos registros do dia ${formatarDataHumana(conclusaoTurno.dataTurno)}. Nenhum log será salvo sem sua confirmação.` : undefined}
          variant="warning"
          confirmText="Salvar logs do paciente"
          cancelText="Voltar e editar"
          isLoading={salvandoTurno}
          onConfirm={salvarConclusaoTurno}
          onCancel={() => setConclusaoTurno(null)}
        >
          {conclusaoTurno ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Paciente</p>
                <p className="mt-2 text-base font-bold text-slate-900">{conclusaoTurno.pacienteNome}</p>
                <p className="mt-1 text-sm text-slate-500">Data de referência: {formatarDataHumana(conclusaoTurno.dataTurno)}</p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <label className="block text-xs font-black uppercase tracking-[0.2em] text-amber-800">
                  Alterar data do registro
                </label>
                <input
                  type="date"
                  value={conclusaoTurno.dataTurno}
                  onChange={(e) =>
                    setConclusaoTurno((current) =>
                      current ? { ...current, dataTurno: e.target.value } : current
                    )
                  }
                  className="mt-3 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-400"
                />
                <p className="mt-2 text-xs text-amber-800/70">
                  Use essa data quando estiver lançando um turno de um dia anterior.
                </p>
              </div>

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {conclusaoTurno.atividades.length > 0 ? (
                  conclusaoTurno.atividades.map((atividade) => (
                    <div key={atividade.tipo} className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-sm font-black text-slate-900">{atividade.label}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        <span className="font-semibold">Status:</span> {atividade.status}
                      </p>
                      {atividade.detail ? (
                        <p className="mt-1 text-sm text-slate-500">
                          <span className="font-semibold">Detalhe:</span> {atividade.detail}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Nenhuma atividade marcada. Apenas a observação do turno está preenchida.
                  </div>
                )}
              </div>

              {conclusaoTurno.observacaoTurno ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Observação do turno</p>
                  <p className="mt-2 text-sm leading-6 text-blue-900">{conclusaoTurno.observacaoTurno}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </ConfirmDialog>
    </DashboardLayout>
  );
}