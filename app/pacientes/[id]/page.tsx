"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Activity, AlertTriangle, CheckCircle2, HeartPulse, Phone, User, Users, LogOut, Droplets, History, Pill, UtensilsCrossed, Edit2, Trash2 } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { auth, db } from "../../../lib/firebase";
import { useInstitucaoId } from "../../../lib/hooks";
import { ACTIVITY_TYPES, ActivityType } from "../../../lib/activityTypes";
import { normalizeLogRecords } from "../../../lib/logNormalizer";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";

import PacienteForm, { PacienteFormData } from "../../components/PacienteForm";
import ConfirmDialog from "../../components/ConfirmDialog";

interface PacienteDetail {
  nome: string;
  fotoUrl?: string;
  idade: string;
  genero: "Masculino" | "Feminino";
  peso: string;
  altura: string;
  restricoesFisicas: string;
  doencasCronicas: string;
  objetivo: string;
  contatoEmergencia: string;
  statusSeguranca: string;
  criadoEm?: unknown;
}

interface LogRotina {
  id: string;
  tipo: string;
  status: string;
  resumo?: string;
  detalhe?: string;
  observacao?: string;
  observacaoTurno?: string;
  dataTurno?: string;
  dataHora?: { toDate?: () => Date };
  tipoLabel?: string;
}

function getLogPresentation(tipo: string) {
  const config = ACTIVITY_TYPES[tipo as ActivityType];

  if (config) {
    return {
      label: config.label,
      icon: config.icon,
      accent: config.textColor,
    };
  }

  return {
    label: "Registro",
    icon: Pill,
    accent: "text-slate-600",
  };
}

function getStatusClasses(status: string) {
  if (status === "Verde") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Amarelo") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function formatarDiaAgrupado(valor?: string | { toDate?: () => Date }) {
  if (!valor) return "Sem data";

  const data = typeof valor === "string" ? new Date(`${valor}T12:00:00`) : valor.toDate?.();
  if (!data) return "Sem data";

  return data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDiaAgrupador(log: LogRotina) {
  if (log.dataTurno) return log.dataTurno;
  if (log.dataHora && typeof log.dataHora.toDate === "function") {
    const data = log.dataHora.toDate();
    const ajusteFuso = data.getTimezoneOffset() * 60000;
    return new Date(data.getTime() - ajusteFuso).toISOString().slice(0, 10);
  }
  return "sem-data";
}

function getNomeArquivoFoto(nome?: string) {
  if (!nome) return "Paciente";
  return nome.split(" ")[0] || nome;
}

function DetailCard({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100 ${className}`}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">{icon}</div>
        <h2 className="text-lg font-black tracking-tight text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function ProntuarioDigitalPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("Cuidador");
  const [paciente, setPaciente] = useState<PacienteDetail | null>(null);
  const [logs, setLogs] = useState<LogRotina[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [showCadastroInfo, setShowCadastroInfo] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const router = useRouter();
  const params = useParams();
  const { instituicaoId, loading: loadingInstituicao } = useInstitucaoId();
  const pacienteId = useMemo(() => {
    const rawId = params?.id;
    return Array.isArray(rawId) ? rawId[0] : rawId;
  }, [params]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      if (loadingInstituicao) {
        return;
      }

      // Novo usuário que ainda não completou onboarding
      if (!instituicaoId) {
        router.push("/onboarding");
        return;
      }

      if (!pacienteId) {
        setError("Paciente não especificado.");
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "Pacientes", pacienteId!));

        if (!snapshot.exists()) {
          setPaciente(null);
          setError("Paciente não encontrado na base de dados.");
        } else {
          const pacienteData = snapshot.data() as PacienteDetail;
          
          // Validar se o paciente pertence à instituição do usuário
          const pacienteInst = (pacienteData as any).instituicaoId;
          if (pacienteInst !== instituicaoId) {
            // Tentar inferir instituição a partir do cuidador do paciente (caso paciente antigo sem campo)
            const cuidadorId = (pacienteData as any).cuidadorId;
            if (cuidadorId) {
              try {
                const cuidadorSnap = await getDoc(doc(db, "Cuidadores", cuidadorId));
                if (cuidadorSnap.exists() && (cuidadorSnap.data() as any).instituicaoId === instituicaoId) {
                  // Aceitar acesso e atualizar paciente para persistir instituicaoId
                  try {
                    await updateDoc(doc(db, "Pacientes", pacienteId!), { instituicaoId: instituicaoId });
                  } catch (updErr) {
                    console.warn("Falha ao atualizar paciente com instituicaoId (não crítico):", updErr);
                  }
                  setPaciente(pacienteData);
                } else {
                  setError("Acesso negado: você não tem permissão para visualizar este paciente.");
                  setLoading(false);
                  return;
                }
              } catch (infErr) {
                console.error("Erro ao inferir instituição do cuidador:", infErr);
                setError("Acesso negado: você não tem permissão para visualizar este paciente.");
                setLoading(false);
                return;
              }
            } else {
              setError("Acesso negado: você não tem permissão para visualizar este paciente.");
              setLoading(false);
              return;
            }
          } else {
            setPaciente(pacienteData);
          }
          setError("");

          // Buscar logs filtrados por instituição
          const logsSnapshot = await getDocs(
            query(
              collection(db, "LogsRotina"),
              where("pacienteId", "==", pacienteId),
              where("instituicaoId", "==", instituicaoId)
            )
          );
          const listaLogs = normalizeLogRecords(
            logsSnapshot.docs.map((logDoc) => ({ id: logDoc.id, ...(logDoc.data() as any) }))
          );

          listaLogs.sort((a, b) => {
            const timeA = a.dataHora && typeof a.dataHora.toDate === "function" ? a.dataHora.toDate().getTime() : 0;
            const timeB = b.dataHora && typeof b.dataHora.toDate === "function" ? b.dataHora.toDate().getTime() : 0;
            return timeB - timeA;
          });

          setLogs(listaLogs);
          setLogsPage(1);
        }
      } catch (fetchError) {
        console.error("Erro ao buscar paciente:", fetchError);
        setError("Não foi possível carregar o prontuário digital.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pacienteId, instituicaoId, router, loadingInstituicao]);

  const handleEditSubmit = async (formData: PacienteFormData) => {
    setEditLoading(true);
    try {
      if (!pacienteId) {
        setError("Paciente não especificado.");
        setEditLoading(false);
        return;
      }

      await updateDoc(doc(db, "Pacientes", pacienteId!), {
        nome: formData.nome,
        fotoUrl: formData.fotoUrl,
        idade: formData.idade,
        genero: formData.genero,
        peso: formData.peso,
        altura: formData.altura,
        restricoesFisicas: formData.restricoesFisicas,
        doencasCronicas: formData.doencasCronicas,
        contatoEmergencia: formData.contatoEmergencia,
        objetivo: formData.objetivo,
      });
      
      // Atualizar estado local
      setPaciente({
        ...paciente!,
        ...formData,
      });
      
      setEditMode(false);
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      setError("Falha ao atualizar dados do paciente.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeletePaciente = async () => {
    setDeleteLoading(true);
    try {
      // Deletar todos os logs do paciente
      const logsSnapshot = await getDocs(
        query(
          collection(db, "LogsRotina"),
          where("pacienteId", "==", pacienteId)
        )
      );
      
      for (const logDoc of logsSnapshot.docs) {
        await deleteDoc(logDoc.ref);
      }
      
      if (!pacienteId) {
        setError("Paciente não especificado.");
        setDeleteLoading(false);
        setDeleteConfirmOpen(false);
        return;
      }

      // Deletar o paciente
      await deleteDoc(doc(db, "Pacientes", pacienteId!));
      
      // Redirecionar para pacientes
      router.push("/pacientes");
    } catch (err) {
      console.error("Erro ao deletar:", err);
      setError("Falha ao deletar paciente.");
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  const isLoadingOrError = loading || Boolean(error && !paciente);

  const formatarData = (valor?: { toDate?: () => Date }) => {
    if (!valor || typeof valor.toDate !== "function") return "Sem data";

    return valor.toDate().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatarCriacao = (valor?: unknown) => {
    if (!valor || typeof valor !== "object") return "Data não informada";

    const possivelTimestamp = valor as { toDate?: () => Date };
    if (typeof possivelTimestamp.toDate !== "function") return "Data não informada";

    return possivelTimestamp.toDate().toLocaleDateString("pt-BR");
  };

  const formatarDataTurno = (valor?: string) => {
    if (!valor) return "Sem data";

    const data = new Date(`${valor}T12:00:00`);
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const logsPorPagina = 10;
  const totalPaginas = Math.max(1, Math.ceil(logs.length / logsPorPagina));
  const paginaAtual = Math.min(logsPage, totalPaginas);
  const inicio = (paginaAtual - 1) * logsPorPagina;
  const logsVisiveis = logs.slice(inicio, inicio + logsPorPagina);
  const gruposDeDia = logsVisiveis.reduce((acc, log) => {
    const chave = getDiaAgrupador(log);
    if (!acc[chave]) {
      acc[chave] = [];
    }
    acc[chave].push(log);
    return acc;
  }, {} as Record<string, LogRotina[]>);
  const diasOrdenados = Object.keys(gruposDeDia);

  return (
    <DashboardLayout>
        <div className="mb-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-200"
          >
            ← Voltar
          </button>
        </div>
        <main className="mx-auto w-full max-w-7xl">
          <header className="relative mb-10 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                  <Activity className="h-3.5 w-3.5" />
                  Prontuário Digital
                </p>
                <h1 className="text-3xl font-black tracking-tight text-slate-800 md:text-4xl">
                  {paciente?.nome || "Carregando paciente..."}
                </h1>
                <p className="mt-2 text-lg text-slate-500">
                  Visão consolidada das informações clínicas do residente
                </p>
              </div>

              {paciente && !editMode ? (
                <button
                  onClick={() => setShowCadastroInfo((current) => !current)}
                  className="group flex w-40 shrink-0 items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-3 text-left shadow-sm shadow-slate-100 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">
                    {paciente.fotoUrl ? (
                      <img
                        src={paciente.fotoUrl}
                        alt={`Foto de ${paciente.nome}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-black uppercase text-blue-700">
                        {getNomeArquivoFoto(paciente.nome).charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-slate-400">Paciente</p>
                    <p className="truncate text-sm font-bold text-slate-900">{paciente.nome}</p>
                    <p className="text-xs text-slate-500">{showCadastroInfo ? "Ocultar cadastro" : "Ver cadastro"}</p>
                  </div>
                </button>
              ) : null}
            </div>

            {paciente && showCadastroInfo && !editMode ? (
              <div className="absolute right-0 top-20 z-20 w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-200/70">
                <div className="flex items-start gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">
                    {paciente.fotoUrl ? (
                      <img
                        src={paciente.fotoUrl}
                        alt={`Foto de ${paciente.nome}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-black uppercase text-blue-700">
                        {getNomeArquivoFoto(paciente.nome).charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Cadastro</p>
                    <h3 className="mt-1 truncate text-lg font-black text-slate-900">{paciente.nome}</h3>
                    <p className="text-sm text-slate-500">Clique fora ou no card para ocultar.</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniLine label="Idade" value={`${paciente.idade} anos`} />
                  <MiniLine label="Gênero" value={paciente.genero} />
                  <MiniLine label="Peso" value={`${paciente.peso} kg`} />
                  <MiniLine label="Altura" value={`${paciente.altura} cm`} />
                </div>

                <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Objetivo Principal</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{paciente.objetivo || "Não informado."}</p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">Contato de Emergência</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{paciente.contatoEmergencia || "Não informado"}</p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Condições</p>
                    <p className="mt-1 text-sm text-slate-600">{paciente.doencasCronicas || "Não informado."}</p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Restrições</p>
                    <p className="mt-1 text-sm text-slate-600">{paciente.restricoesFisicas || "Não informado."}</p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
                  >
                    Deletar
                  </button>
                </div>
              </div>
            ) : null}
          </header>

          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600" />
            </div>
          ) : editMode && paciente ? (
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 p-8 md:p-12 border border-slate-100">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
                    Editar Prontuário
                  </h2>
                  <p className="text-slate-500">
                    Atualize as informações clínicas do residente
                  </p>
                </div>
                <button
                  onClick={() => setEditMode(false)}
                  className="rounded-xl px-4 py-2 bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
              
              <PacienteForm
                onSubmit={handleEditSubmit}
                isLoading={editLoading}
                submitButtonText="Atualizar Dados"
                initialData={paciente}
                title=""
                description=""
              />
            </div>
          ) : error && !paciente ? (
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-red-900">Paciente não localizado</h2>
                  <p className="mt-2 text-red-700">{error}</p>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="mt-6 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
                  >
                    Voltar ao Painel
                  </button>
                </div>
              </div>
            </div>
          ) : paciente ? (
            <div className="space-y-6">
              <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <DetailCard title="Linha do Tempo Assistencial" icon={<History className="h-5 w-5" />}>
                    {logs.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                        Nenhum log de rotina registrado ainda para este residente.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                          <p>
                            Mostrando {inicio + 1}-{Math.min(inicio + logsPorPagina, logs.length)} de {logs.length}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setLogsPage((current) => Math.max(1, current - 1))}
                              disabled={paginaAtual === 1}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Anterior
                            </button>
                            <button
                              onClick={() => setLogsPage((current) => Math.min(totalPaginas, current + 1))}
                              disabled={paginaAtual === totalPaginas}
                              className="rounded-full border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Próxima
                            </button>
                          </div>
                        </div>

                        <div className="space-y-5">
                          {diasOrdenados.map((dia) => {
                            const logsDoDia = gruposDeDia[dia];

                            return (
                              <div key={dia} className="space-y-3">
                                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                                  <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                                  <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
                                    {formatarDiaAgrupado(dia)}
                                  </p>
                                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 shadow-sm">
                                    {logsDoDia.length}
                                  </span>
                                </div>

                                <div className="space-y-3 pl-2">
                                  {logsDoDia.map((log) => {
                                    const presentation = getLogPresentation(log.tipo);
                                    const IconComponent = presentation.icon;
                                    const tituloPrincipal = log.resumo || log.status || log.tipoLabel;
                                    const dataExibida = log.dataTurno ? formatarDataTurno(log.dataTurno) : formatarData(log.dataHora);

                                    return (
                                      <article key={log.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                          <div>
                                            <div className={`flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] ${presentation.accent}`}>
                                              <IconComponent className="h-4 w-4" />
                                              {presentation.label}
                                            </div>
                                            <p className="mt-2 text-base font-bold text-slate-900">{tituloPrincipal}</p>
                                            {log.detalhe ? <p className="mt-1 text-sm text-slate-600">Detalhe: {log.detalhe}</p> : null}
                                            {log.observacaoTurno ? <p className="mt-1 text-sm text-slate-500">Observação: {log.observacaoTurno}</p> : null}
                                            {log.observacao ? <p className="mt-1 text-sm text-slate-500">Observação: {log.observacao}</p> : null}
                                          </div>

                                          <div className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm">
                                            {dataExibida}
                                          </div>
                                        </div>
                                      </article>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {totalPaginas > 1 ? (
                          <div className="flex items-center justify-center gap-2 pt-2">
                            {Array.from({ length: totalPaginas }).map((_, index) => {
                              const pageNumber = index + 1;
                              const isActive = pageNumber === paginaAtual;

                              return (
                                <button
                                  key={pageNumber}
                                  onClick={() => setLogsPage(pageNumber)}
                                  className={`h-2.5 rounded-full transition-all ${isActive ? "w-8 bg-blue-600" : "w-2.5 bg-slate-300 hover:bg-slate-400"}`}
                                  aria-label={`Ir para a página ${pageNumber}`}
                                />
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </DetailCard>
                </div>

                
              </section>
            </div>
          ) : null}
        </main>
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Deletar Paciente?"
        description={`Tem certeza que deseja deletar ${paciente?.nome}? Esta ação é irreversível e todos os logs serão removidos.`}
        variant="danger"
        confirmText="Sim, Deletar"
        cancelText="Cancelar"
        isLoading={deleteLoading}
        onConfirm={handleDeletePaciente}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </DashboardLayout>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm shadow-blue-50">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MiniLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm shadow-slate-100">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="max-w-[60%] truncate font-bold text-slate-900">{value}</span>
    </div>
  );
}