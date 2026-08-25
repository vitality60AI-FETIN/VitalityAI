"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  Pill,
  UtensilsCrossed,
  Droplets,
  ChevronDown,
  ChevronUp,
  Filter,
  Plus,
  Search,
  ShieldAlert,
  Check,
  X,
  FileText,
  HeartPulse,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Undo2,
  Trash2,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import ConfirmDialog from "../components/ConfirmDialog";

import { auth, db } from "../../lib/firebase";
import { useInstitucaoId } from "../../lib/hooks";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { normalizeLogRecords, NormalizedLogRecord } from "../../lib/logNormalizer";
import { Paciente } from "../../lib/types";
import { enriquecerPacientesComStatus } from "../../lib/statusSeguranca";
import { ACTIVITY_TYPES, ActivityType, useAllActivityTypes } from "../../lib/activityTypes";

interface DashboardAlert extends NormalizedLogRecord {
  pacienteNome: string;
  severidade: "urgente" | "atencao" | "estavel";
}

interface TarefaCronograma {
  id: string;
  horario: string;
  titulo: string;
  tipo: ActivityType;
  pacienteId: string;
  pacienteNome: string;
  detalhe: string;
  concluida: boolean;
}

export default function DashboardLobby() {
  const [loading, setLoading] = useState(true);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [logs, setLogs] = useState<NormalizedLogRecord[]>([]);
  const [incidentesHoje, setIncidentesHoje] = useState(0);
  const [timeRange, setTimeRange] = useState<"24h" | "7d">("24h");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [patientFilter, setPatientFilter] = useState("");
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

  // Estado para tarefas concluídas localmente no cronograma
  const [tarefasConcluidas, setTarefasConcluidas] = useState<Record<string, boolean>>({});

  // Confirmação de Execução de Tarefa (Prevenção de clique acidental)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingTarefa, setPendingTarefa] = useState<TarefaCronograma | null>(null);
  const [confirmingTask, setConfirmingTask] = useState(false);

  // Controle para recurso Desfazer (Undo)
  const [lastCreatedLogId, setLastCreatedLogId] = useState<string | null>(null);
  const [lastCreatedTarefaId, setLastCreatedTarefaId] = useState<string | null>(null);

  // Toast com opção de Desfazer
  const [toastInfo, setToastInfo] = useState<{ message: string; showUndo?: boolean } | null>(null);

  // Exclusão de Log (Restrito a Admin)
  const [deleteLogDialogOpen, setDeleteLogDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<{ id: string; pacienteNome: string; resumo: string } | null>(null);
  const [deletingLog, setDeletingLog] = useState(false);

  // Modal de Registro Rápido
  const [quickLogModalOpen, setQuickLogModalOpen] = useState(false);
  const [selectedPacienteId, setSelectedPacienteId] = useState("");
  const [quickTipo, setQuickTipo] = useState<ActivityType>("alimentacao");
  const [quickStatus, setQuickStatus] = useState("Comeu Tudo");
  const [quickDetail, setQuickDetail] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  // Modal de Residentes em Atenção Prioritária
  const [modalAtencaoOpen, setModalAtencaoOpen] = useState(false);

  const router = useRouter();
  const { instituicaoId, role, loading: loadingInstituicao } = useInstitucaoId();

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

      // Realtime Pacientes
      const qPacientes = query(
        collection(db, "Pacientes"),
        where("instituicaoId", "==", instituicaoId)
      );
      const unsubPacientes = onSnapshot(
        qPacientes,
        (snap) => {
          const lista: Paciente[] = [];
          snap.forEach((d) => lista.push({ id: d.id, ...d.data() } as Paciente));
          setPacientes(lista);
          setLoading(false);
        },
        (err) => {
          console.error("Erro realtime pacientes:", err);
          setLoading(false);
        }
      );

      // Realtime Logs
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

          const now = Date.now();
          const dayMs = 24 * 60 * 60 * 1000;
          const recentes = lista.filter((l) => {
            const ts =
              l.dataHora && typeof l.dataHora.toDate === "function"
                ? l.dataHora.toDate().getTime()
                : 0;
            return now - ts <= dayMs;
          });
          setIncidentesHoje(recentes.length);
        },
        (err) => console.error("Erro realtime logs:", err)
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

  // Pacientes com status calculado em tempo real
  const pacientesComStatus = useMemo(() => {
    return enriquecerPacientesComStatus(pacientes, logs);
  }, [pacientes, logs]);

  const pacientesAtencao = useMemo(() => {
    return pacientesComStatus.filter((p) => p.statusSeguranca !== "Verde");
  }, [pacientesComStatus]);

  // Classificar e DEDUPLICAR alertas por severidade (evita entradas exatamente iguais repetidas)
  const processedAlerts = useMemo(() => {
    const seen = new Set<string>();
    const result: DashboardAlert[] = [];

    // Sort logs descending by timestamp first so we get the latest update
    const sortedLogs = [...logs].sort((a, b) => {
      const tsA = a.dataHora && typeof a.dataHora.toDate === "function" ? a.dataHora.toDate().getTime() : 0;
      const tsB = b.dataHora && typeof b.dataHora.toDate === "function" ? b.dataHora.toDate().getTime() : 0;
      return tsB - tsA;
    });

    for (const l of sortedLogs) {
      const p = pacientesComStatus.find((p) => p.id === l.pacienteId);
      const pacienteNome = p?.nome || l.pacienteId || "Residente";
      const tipo = String(l.tipo || "").toLowerCase();
      const status = String(l.status || "").toLowerCase();
      const detalhe = String(l.detalhe || l.observacao || "").toLowerCase();
      const resumo = String(l.resumo || "").toLowerCase();
      const dataStr = l.dataTurno || (l.dataHora?.toDate ? l.dataHora.toDate().toISOString().slice(0, 10) : "");

      // Chave única para deduplicação visual na tela (1 log por tipo/dia por paciente)
      const dedupKey = `${l.pacienteId}-${tipo}-${dataStr}`;
      if (seen.has(dedupKey)) continue; // Pula ocorrências idênticas duplicadas do mesmo dia
      seen.add(dedupKey);

      const isSemIntercorrencia =
        status.includes("sem intercorrênc") ||
        status.includes("sem intercorrenc") ||
        status.includes("sem interferênc") ||
        status.includes("sem interferenc") ||
        status.includes("nenhum") ||
        status.includes("nenhuma") ||
        status.includes("normal") ||
        detalhe.includes("sem intercorrênc") ||
        detalhe.includes("sem intercorrenc") ||
        detalhe.includes("sem interferênc") ||
        detalhe.includes("sem interferenc") ||
        resumo.includes("sem intercorrênc") ||
        resumo.includes("sem intercorrenc") ||
        resumo.includes("sem interferênc") ||
        resumo.includes("sem interferenc");

      let severidade: "urgente" | "atencao" | "estavel" = "estavel";

      if (isSemIntercorrencia) {
        severidade = "estavel";
      } else if (
        tipo === "incidente" ||
        status.includes("queda") ||
        status.includes("febre") ||
        status.includes("desidratação") ||
        status.includes("infecção") ||
        status.includes("recusada")
      ) {
        severidade = "urgente";
      } else if (
        status.includes("recus") ||
        status.includes("metade") ||
        status.includes("pouca") ||
        status.includes("atrasad") ||
        status.includes("insônia") ||
        status.includes("triste")
      ) {
        severidade = "atencao";
      }

      result.push({
        ...l,
        pacienteNome,
        severidade,
      } as DashboardAlert);
    }

    return result;
  }, [logs, pacientesComStatus]);

  // Alertas filtrados por tempo, tipo, severidade e busca
  const filteredAlerts = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return processedAlerts.filter((a) => {
      const ts =
        a.dataHora && typeof a.dataHora.toDate === "function"
          ? a.dataHora.toDate().getTime()
          : 0;

      if (timeRange === "24h" && ts && now - ts > dayMs) return false;
      if (timeRange === "7d" && ts && now - ts > dayMs * 7) return false;

      if (typeFilter !== "all" && a.tipo !== typeFilter) return false;
      if (severityFilter !== "all" && a.severidade !== severityFilter) return false;

      if (
        patientFilter &&
        !a.pacienteNome.toLowerCase().includes(patientFilter.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [processedAlerts, timeRange, typeFilter, severityFilter, patientFilter]);

  // Cronograma de Tarefas do Turno (gerado dinamicamente para os residentes)
  const cronogramaTurno = useMemo(() => {
    const tarefas: TarefaCronograma[] = [];
    const horarios = [
      { hora: "08:00", titulo: "Medicação Matinal", tipo: "medicacao" as ActivityType, detalhe: "Administrar medicações prescritas do café" },
      { hora: "08:30", titulo: "Café da Manhã & Proteína", tipo: "alimentacao" as ActivityType, detalhe: "Refeição matinal + suplemento proteico" },
      { hora: "10:30", titulo: "Hidratação Fracionada (200ml)", tipo: "hidratacao" as ActivityType, detalhe: "Oferta de água/suco de frutas" },
      { hora: "12:00", titulo: "Almoço & Checagem Geral", tipo: "alimentacao" as ActivityType, detalhe: "Acompanhar aceitação da refeição" },
      { hora: "15:00", titulo: "Exercícios de Força & Mobilidade", tipo: "atividade_fisica" as ActivityType, detalhe: "Treino de marcha e equilíbrio com apoio" },
      { hora: "18:00", titulo: "Medicação Noturna & Jantar", tipo: "medicacao" as ActivityType, detalhe: "Checagem de sinais vitais e jantar" },
    ];

    const hojeStr = new Date().toISOString().slice(0, 10);

    pacientesComStatus.forEach((p, idx) => {
      const h = horarios[idx % horarios.length];
      const id = `${p.id}-${h.hora}-${h.tipo}`;

      // Verificar se esta tarefa já possui registro real de execução hoje no Firestore
      const jaConcluidaNoBanco = logs.some((l) => {
        if (l.pacienteId !== p.id) return false;
        const dStr = l.dataTurno || (l.dataHora?.toDate ? l.dataHora.toDate().toISOString().slice(0, 10) : "");
        if (dStr !== hojeStr) return false;

        if (l.tipo === h.tipo) return true;
        if (h.tipo === "alimentacao" && (l.tipo === "cafe_manha" || l.tipo === "almoco" || l.tipo === "jantar" || l.tipo === "lanche_tarde")) return true;
        if (h.tipo === "medicacao" && (l.tipo === "medicacao_manha" || l.tipo === "medicacao_tarde" || l.tipo === "medicacao_noite")) return true;
        if (h.tipo === "hidratacao" && l.tipo === "hidratacao_manha") return true;
        return false;
      });

      tarefas.push({
        id,
        horario: h.hora,
        titulo: h.titulo,
        tipo: h.tipo,
        pacienteId: p.id,
        pacienteNome: p.nome,
        detalhe: h.detalhe,
        concluida: Boolean(tarefasConcluidas[id] || jaConcluidaNoBanco),
      });
    });

    return tarefas;
  }, [pacientesComStatus, tarefasConcluidas, logs]);

  // 1. Iniciar confirmação (Prevenção de clique acidental)
  const handleInitiateCheckTarefa = (tarefa: TarefaCronograma) => {
    if (tarefa.concluida) return;
    setPendingTarefa(tarefa);
    setConfirmDialogOpen(true);
  };

  // 2. Executar confirmação com trava contra duplicatas no Firestore
  const handleConfirmCheckTarefa = async () => {
    if (!pendingTarefa) return;
    const tarefa = pendingTarefa;
    setConfirmingTask(true);

    try {
      const user = auth.currentUser;
      if (user && instituicaoId) {
        const hojeStr = new Date().toISOString().slice(0, 10);

        // Trava anti-duplicação: checa se já foi registrado hoje
        const jaExiste = logs.some(
          (l) =>
            l.pacienteId === tarefa.pacienteId &&
            l.tipo === tarefa.tipo &&
            (l.dataTurno === hojeStr || (l.dataHora?.toDate && l.dataHora.toDate().toISOString().slice(0, 10) === hojeStr))
        );

        if (jaExiste) {
          showToast(`⚠️ ${tarefa.titulo} para ${tarefa.pacienteNome} já foi realizada hoje!`);
          setTarefasConcluidas((prev) => ({ ...prev, [tarefa.id]: true }));
          setConfirmDialogOpen(false);
          setPendingTarefa(null);
          return;
        }

        const docRef = await addDoc(collection(db, "LogsRotina"), {
          pacienteId: tarefa.pacienteId,
          cuidadorId: user.uid,
          instituicaoId,
          dataHora: serverTimestamp(),
          dataTurno: hojeStr,
          tipo: tarefa.tipo,
          status: "Concluído",
          resumo: `${tarefa.titulo} - Executado no turno`,
          detalhe: tarefa.detalhe,
          observacaoTurno: "Concluído via Painel Rápido",
          turnoEncerrado: false,
        });

        setLastCreatedLogId(docRef.id);
        setLastCreatedTarefaId(tarefa.id);
        setTarefasConcluidas((prev) => ({ ...prev, [tarefa.id]: true }));
        showToast(`✓ ${tarefa.titulo} para ${tarefa.pacienteNome} registrada!`, true);
      }
    } catch (e) {
      console.warn("Erro ao salvar log de check:", e);
      showToast("Falha ao registrar atividade.");
    } finally {
      setConfirmingTask(false);
      setConfirmDialogOpen(false);
      setPendingTarefa(null);
    }
  };

  // 3. Desfazer último registro acidental (Undo)
  const handleUndoLastAction = async () => {
    if (!lastCreatedLogId) return;

    try {
      await deleteDoc(doc(db, "LogsRotina", lastCreatedLogId));
      if (lastCreatedTarefaId) {
        setTarefasConcluidas((prev) => ({ ...prev, [lastCreatedTarefaId]: false }));
      }
      showToast("↺ Registro cancelado e removido com sucesso.");
      setLastCreatedLogId(null);
      setLastCreatedTarefaId(null);
    } catch (err) {
      console.error("Erro ao desfazer registro:", err);
      showToast("Não foi possível reverter o registro.");
    }
  };

  // Iniciar exclusão de log individual (Restrito a Admin)
  const handleInitiateDeleteLog = (logId: string, pacienteNome: string, resumo: string) => {
    if (role !== "Admin") {
      showToast("⚠️ Apenas Administradores podem excluir registros do histórico.");
      return;
    }
    setLogToDelete({ id: logId, pacienteNome, resumo });
    setDeleteLogDialogOpen(true);
  };

  // Confirmar exclusão no Firestore
  const handleConfirmDeleteLog = async () => {
    if (!logToDelete) return;
    setDeletingLog(true);

    try {
      await deleteDoc(doc(db, "LogsRotina", logToDelete.id));
      showToast("✓ Registro excluído com sucesso do banco de dados.");
    } catch (err) {
      console.error("Erro ao excluir log:", err);
      showToast("Falha ao excluir registro.");
    } finally {
      setDeletingLog(false);
      setDeleteLogDialogOpen(false);
      setLogToDelete(null);
    }
  };

  // Abrir modal de log rápido
  const handleOpenQuickLog = (pId?: string) => {
    setSelectedPacienteId(pId || (pacientes[0]?.id ?? ""));
    setQuickTipo("alimentacao");
    setQuickStatus("Comeu Tudo");
    setQuickDetail("");
    setQuickLogModalOpen(true);
  };

  // Salvar log rápido (atualiza se já existir log no dia para este paciente)
  const handleSaveQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPacienteId) return;

    setQuickSaving(true);
    try {
      const user = auth.currentUser;
      if (user && instituicaoId) {
        const pNome = pacientes.find((p) => p.id === selectedPacienteId)?.nome || "Residente";
        const hojeStr = new Date().toISOString().slice(0, 10);
        const resumo = quickDetail ? `${quickStatus} - ${quickDetail}` : quickStatus;

        // Verificar se já existe log para este paciente, tipo e dia
        const qLog = query(
          collection(db, "LogsRotina"),
          where("instituicaoId", "==", instituicaoId),
          where("pacienteId", "==", selectedPacienteId),
          where("tipo", "==", quickTipo),
          where("dataTurno", "==", hojeStr)
        );
        const snap = await getDocs(qLog);

        if (!snap.empty) {
          // Atualizar o log existente de hoje
          const existingDoc = snap.docs[0];
          await updateDoc(doc(db, "LogsRotina", existingDoc.id), {
            cuidadorId: user.uid,
            dataHora: serverTimestamp(),
            status: quickStatus,
            resumo,
            detalhe: quickDetail,
            observacaoTurno: "Atualizado via Ação Rápida no Dashboard",
          });

          // Remover duplicatas extras se existirem do passado
          for (let i = 1; i < snap.docs.length; i++) {
            await deleteDoc(doc(db, "LogsRotina", snap.docs[i].id));
          }

          setLastCreatedLogId(existingDoc.id);
          showToast(`✓ Registro de ${quickTipo} atualizado para ${pNome}`, true);
        } else {
          // Criar novo registro se não existir hoje
          const docRef = await addDoc(collection(db, "LogsRotina"), {
            pacienteId: selectedPacienteId,
            cuidadorId: user.uid,
            instituicaoId,
            dataHora: serverTimestamp(),
            dataTurno: hojeStr,
            tipo: quickTipo,
            status: quickStatus,
            resumo,
            detalhe: quickDetail,
            observacaoTurno: "Registrado via Ação Rápida no Dashboard",
            turnoEncerrado: false,
          });
          setLastCreatedLogId(docRef.id);
          showToast(`✓ Registro de ${quickTipo} salvo para ${pNome}`, true);
        }
        setQuickLogModalOpen(false);
      }
    } catch (err) {
      console.error("Erro ao salvar ocorrência:", err);
      showToast("Erro ao salvar registro.");
    } finally {
      setQuickSaving(false);
    }
  };

  const showToast = (msg: string, showUndo = false) => {
    setToastInfo({ message: msg, showUndo });
    setTimeout(() => setToastInfo(null), 5000);
  };

  const handleCardAtencaoClick = () => {
    if (pacientesAtencao.length === 0) {
      showToast("✅ Todos os residentes estão em estado estável hoje!");
      return;
    }
    if (pacientesAtencao.length === 1) {
      router.push(`/pacientes/${pacientesAtencao[0].id}`);
      return;
    }
    setModalAtencaoOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-sm font-semibold text-slate-500">Carregando Painel Geral...</p>
        </div>
      </div>
    );
  }

  const totalTarefas = cronogramaTurno.length;
  const concluidasCount = cronogramaTurno.filter((t) => t.concluida).length;
  const progressoPercent = totalTarefas > 0 ? Math.round((concluidasCount / totalTarefas) * 100) : 0;

  return (
    <DashboardLayout>
      {/* Toast Notification com Opção de Desfazer */}
      {toastInfo && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4 rounded-2xl bg-slate-900 text-white px-5 py-3.5 shadow-2xl shadow-slate-900/30 border border-slate-700 text-sm font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>{toastInfo.message}</span>
            </div>
            {toastInfo.showUndo && lastCreatedLogId && (
              <button
                onClick={handleUndoLastAction}
                className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-amber-400 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-amber-500/30 transition-colors"
              >
                <Undo2 className="h-3.5 w-3.5" /> Desfazer
              </button>
            )}
          </div>
        </div>
      )}

      {/* HEADER PRINCIPAL DO DASHBOARD */}
      <header className="mb-6 md:mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700">
              Turno Ativo • Manhã
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })}
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">
            Painel Geral de Cuidados
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-1">
            Gestão operacional em tempo real da rotina e segurança dos residentes.
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => handleOpenQuickLog()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-5 py-3 min-h-[44px] text-sm font-bold shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 ios-press cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span className="hidden sm:inline">Registrar</span> Ocorrência
          </button>
          <button
            onClick={() => router.push("/pacientes/novo")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 md:px-5 py-3 min-h-[44px] text-sm font-bold shadow-sm transition-all hover:-translate-y-0.5 ios-press cursor-pointer"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">+</span> Residente
          </button>
        </div>
      </header>

      {pacientes.length === 0 ? (
        <div className="rounded-[2.5rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Users className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Nenhum residente cadastrado</h2>
          <p className="mt-2 text-slate-500 max-w-md mx-auto">
            Cadastre o primeiro residente da sua instituição para liberar o painel em tempo real.
          </p>
          <button
            onClick={() => router.push("/pacientes/novo")}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 cursor-pointer"
          >
            Cadastrar Primeiro Residente
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SEÇÃO 1: MÉTRICAS & INDICADORES CHAVE (CARDS CLICÁVEIS) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {/* Card 1: Total de Residentes */}
            <div
              onClick={() => router.push("/pacientes")}
              className="apple-card group rounded-3xl p-4 md:p-6 apple-button cursor-pointer hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
              title="Clique para ver a lista de residentes"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Monitorado</p>
                  <h3 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                    {pacientes.length}
                  </h3>
                  <p className="mt-1.5 text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    100% ativos na unidade
                  </p>
                  <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-2 group-hover:translate-x-0.5 transition-transform">
                    Ver prontuários ➔
                  </span>
                </div>
                <div className="rounded-2xl bg-blue-50/90 p-3 text-blue-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white shadow-xs">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Card 2: Requerem Atenção Prioritária (1-Click Direct Access) */}
            <div
              onClick={handleCardAtencaoClick}
              className={`apple-card group rounded-3xl border p-4 md:p-6 apple-button cursor-pointer transition-all active:scale-[0.98] ${
                pacientesAtencao.length > 0
                  ? "border-amber-300 bg-gradient-to-br from-amber-50/80 via-white to-white hover:border-amber-400 hover:shadow-lg hover:scale-[1.02] ring-1 ring-amber-200/50"
                  : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md"
              }`}
              title={pacientesAtencao.length > 0 ? "Clique para ver residentes em atenção prioritária" : "Todos em estado seguro"}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-700">Atenção Prioritária</p>
                  <h3 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-amber-900 group-hover:text-amber-600 transition-colors">
                    {pacientesAtencao.length}
                  </h3>
                  <p className="mt-1.5 text-xs font-bold text-amber-600">
                    {pacientesAtencao.length > 0 ? "Exigem checagem no turno" : "Todos em estado seguro"}
                  </p>
                  <span className="text-[10px] font-black text-amber-700 flex items-center gap-1 mt-2 group-hover:translate-x-0.5 transition-transform">
                    {pacientesAtencao.length > 0 ? "Ver idosos em atenção ➔" : "Tudo estável ✓"}
                  </span>
                </div>
                <div className="rounded-2xl bg-amber-100/80 p-3 text-amber-700 transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white shadow-xs">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Card 3: Progresso do Turno */}
            <div
              onClick={() => router.push("/rotina")}
              className="apple-card group rounded-3xl p-4 md:p-6 apple-button cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98]"
              title="Clique para ir para o Registro de Rotina"
            >
              <div className="flex items-start justify-between">
                <div className="w-full">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Rotinas do Turno</p>
                  <h3 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {concluidasCount} <span className="text-lg font-bold text-slate-400">/ {totalTarefas}</span>
                  </h3>
                  <div className="mt-3 w-full bg-slate-100/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200/50">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-blue-600 h-1.5 rounded-full transition-all duration-700 ease-out shadow-xs"
                      style={{ width: `${progressoPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 mt-2 group-hover:translate-x-0.5 transition-transform">
                    Ir para Rotina ➔
                  </span>
                </div>
                <div className="rounded-2xl bg-indigo-50/90 p-3 text-indigo-600 ml-3 transition-all duration-300 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white shrink-0 shadow-xs">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Card 4: Ocorrências / Incidentes 24h */}
            <div
              onClick={() => router.push("/rotina")}
              className="apple-card group rounded-3xl p-4 md:p-6 apple-button cursor-pointer hover:border-rose-300 hover:shadow-md transition-all active:scale-[0.98]"
              title="Clique para ver o log de rotina"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Registros 24h</p>
                  <h3 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
                    {incidentesHoje}
                  </h3>
                  <p className="mt-1.5 text-xs font-bold text-slate-500">
                    Entradas de rotina e alertas
                  </p>
                  <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-2 group-hover:translate-x-0.5 transition-transform">
                    Histórico de registros ➔
                  </span>
                </div>
                <div className="rounded-2xl bg-rose-50/90 p-3 text-rose-600 transition-all duration-300 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white shadow-xs">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
            </div>
          </section>

          {/* GRID DE DUAS COLUNAS: LINHA DO TEMPO (ESQUERDA) + FEED DE ALERTAS (DIREITA) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* COLUNA ESQUERDA (7 COLS): LINHA DO TEMPO & CRONOGRAMA DE AÇÕES */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                      <Clock className="h-5 w-5 text-indigo-600" />
                      Cronograma Interativo do Turno
                    </h2>
                    <p className="text-xs font-medium text-slate-500 mt-1">
                      Ações programadas para os residentes. Clique em ✓ Check para confirmar com segurança.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    {progressoPercent}% Concluído
                  </span>
                </div>

                <div className="space-y-4">
                  {cronogramaTurno.map((tarefa) => {
                    const activityConfig = ACTIVITY_TYPES[tarefa.tipo];

                    return (
                      <div
                        key={tarefa.id}
                        className={`group relative rounded-2xl border p-3 md:p-4 transition-all duration-300 ${
                          tarefa.concluida
                            ? "bg-slate-50/60 border-slate-200/60 opacity-75"
                            : "bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-md"
                        }`}
                      >
                        {/* Mobile: stacked layout / Desktop: horizontal */}
                        <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:gap-4">
                          {/* Row 1 mobile: Horário + Nome + Badge */}
                          <div className="flex items-center gap-3 md:contents">
                            {/* Indicador de Horário */}
                            <div className="shrink-0 flex flex-col items-center justify-center rounded-xl bg-slate-100 px-3 py-1.5 md:py-2 text-center min-w-[60px] md:min-w-[65px]">
                              <span className="text-xs font-black text-slate-800">{tarefa.horario}</span>
                              <span className="text-[10px] font-bold text-slate-400">Hora</span>
                            </div>

                            {/* Nome + badge (visível inline no mobile) */}
                            <div
                              onClick={() => router.push(`/pacientes/${tarefa.pacienteId}`)}
                              className="flex-1 min-w-0 md:hidden cursor-pointer group/mob"
                              title={`Abrir prontuário de ${tarefa.pacienteNome}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-slate-900 truncate group-hover/mob:text-blue-600 transition-colors">
                                  {tarefa.pacienteNome}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 shrink-0">
                                  {activityConfig?.label || tarefa.tipo}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-700 mt-0.5">{tarefa.titulo}</p>
                            </div>
                          </div>

                          {/* Conteúdo completo (desktop) */}
                          <div
                            onClick={() => router.push(`/pacientes/${tarefa.pacienteId}`)}
                            className="min-w-0 flex-1 hidden md:block cursor-pointer group/desk"
                            title={`Abrir prontuário de ${tarefa.pacienteNome}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-slate-900 truncate group-hover/desk:text-blue-600 transition-colors">
                                {tarefa.pacienteNome}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                {activityConfig?.label || tarefa.tipo}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">{tarefa.titulo}</p>
                            <p className="text-xs text-slate-500 truncate mt-1">{tarefa.detalhe}</p>
                          </div>

                          {/* Detalhe mobile (row separado) */}
                          <p className="text-xs text-slate-500 truncate md:hidden -mt-0.5">{tarefa.detalhe}</p>

                          {/* Ações */}
                          <div className="shrink-0 flex items-center gap-2 md:pt-1">
                            {tarefa.concluida ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                <Check className="h-3.5 w-3.5 stroke-[3]" /> Concluído
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleInitiateCheckTarefa(tarefa)}
                                  className="flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 min-h-[44px] md:min-h-0 md:py-2 text-xs font-bold shadow-sm transition-all ios-press cursor-pointer"
                                  title="Confirmar execução"
                                >
                                  <Check className="h-3.5 w-3.5 stroke-[3]" /> Check
                                </button>
                                <button
                                  onClick={() => handleOpenQuickLog(tarefa.pacienteId)}
                                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-2 min-h-[44px] md:min-h-0 md:py-2 text-xs font-bold shadow-sm transition-all ios-press cursor-pointer"
                                  title="Registrar observação"
                                >
                                  + Log
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA (5 COLS): FEED DE ALERTAS E NOTIFICAÇÕES (DEDUPLICADO) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
                <div className="flex flex-col gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                      <ShieldAlert className="h-5 w-5 text-rose-600" />
                      Feed de Alertas
                    </h2>
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-rose-700">
                      {filteredAlerts.length} únicos
                    </span>
                  </div>

                  {/* Filtros Rápidos de Alertas */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value as "24h" | "7d")}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="24h">Últimas 24h</option>
                      <option value="7d">Últimos 7 dias</option>
                    </select>

                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="all">Todas Prioridades</option>
                      <option value="urgente">🔴 Urgentes</option>
                      <option value="atencao">🟡 Atenção</option>
                    </select>

                    <input
                      placeholder="Buscar por nome..."
                      value={patientFilter}
                      onChange={(e) => setPatientFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none flex-1 min-w-[130px]"
                    />
                  </div>
                </div>

                {/* Lista do Feed de Alertas */}
                {filteredAlerts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-xs font-bold text-slate-400">
                    Nenhum alerta para o filtro selecionado.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {filteredAlerts.map((alerta) => {
                      const isUrgente = alerta.severidade === "urgente";
                      const isAtencao = alerta.severidade === "atencao";

                      const cardBg = isUrgente
                        ? "bg-rose-50/70 border-rose-200"
                        : isAtencao
                        ? "bg-amber-50/70 border-amber-200"
                        : "bg-slate-50 border-slate-200";

                      const badgeBg = isUrgente
                        ? "bg-rose-600 text-white"
                        : isAtencao
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-600 text-white";

                      const ts =
                        alerta.dataHora && typeof alerta.dataHora.toDate === "function"
                          ? alerta.dataHora.toDate().toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : alerta.dataTurno || "Recente";

                      return (
                        <div
                          key={alerta.id}
                          onClick={() => router.push(`/pacientes/${alerta.pacienteId}`)}
                          className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer hover:scale-[1.015] hover:shadow-md hover:border-slate-300 active:scale-[0.99] group/card ${cardBg}`}
                          title={`Clique para abrir o prontuário de ${alerta.pacienteNome}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-slate-800 font-black text-sm shadow-sm border border-slate-100 group-hover/card:scale-105 transition-transform">
                                {(() => { const fUrl = (pacientesComStatus.find(p => p.id === alerta.pacienteId) as any)?.fotoUrl; return fUrl ? <img src={fUrl} alt="" className="h-full w-full object-cover" /> : alerta.pacienteNome.charAt(0); })()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-slate-900 truncate group-hover/card:text-blue-600 transition-colors">
                                  {alerta.pacienteNome}
                                </p>
                                <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                                  {alerta.tipoLabel || alerta.tipo}: {alerta.status}
                                </p>
                              </div>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeBg}`}>
                              {alerta.severidade}
                            </span>
                          </div>

                          {alerta.resumo && (
                            <p className="mt-2 text-xs text-slate-600 line-clamp-2 bg-white/70 p-2 rounded-xl border border-slate-100">
                              {alerta.resumo}
                            </p>
                          )}

                          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/50 text-[11px]">
                            <span className="text-slate-400 font-medium">{ts}</span>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInitiateDeleteLog(alerta.id, alerta.pacienteNome, `${alerta.tipoLabel || alerta.tipo}: ${alerta.status}`);
                                }}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${role === "Admin" ? "text-slate-400 hover:text-red-600 hover:bg-red-50" : "text-slate-300 cursor-not-allowed"}`}
                                title={role === "Admin" ? "Excluir Registro (Admin)" : "Apenas administradores podem excluir registros"}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/pacientes/${alerta.pacienteId}`);
                                }}
                                className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover/card:underline cursor-pointer"
                              >
                                Prontuário <ArrowRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: VISÃO MODULAR DOS RESIDENTES (CARDS EXPANSÍVEIS EM 1 CLIQUE) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  Visão Modular dos Residentes
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-0.5">
                  Clique no card de qualquer idoso para expandir os últimos sinais e registros sem recarregar.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {pacientesComStatus.map((paciente) => {
                const isExpanded = expandedPatientId === paciente.id;
                const pLogs = logs
                  .filter((l) => l.pacienteId === paciente.id)
                  .sort((a, b) => {
                    const tsA = a.dataHora && typeof a.dataHora.toDate === "function" ? a.dataHora.toDate().getTime() : 0;
                    const tsB = b.dataHora && typeof b.dataHora.toDate === "function" ? b.dataHora.toDate().getTime() : 0;
                    return tsB - tsA;
                  });

                const ultAlimentacao = pLogs.find((l) => l.tipo === "alimentacao");
                const ultHidratacao = pLogs.find((l) => l.tipo === "hidratacao");
                const ultMedicacao = pLogs.find((l) => l.tipo === "medicacao");

                const statusColor =
                  paciente.statusSeguranca === "Verde"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : paciente.statusSeguranca === "Amarelo"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-rose-50 text-rose-700 border-rose-200";

                const statusLabel =
                  paciente.statusSeguranca === "Verde"
                    ? "Estável"
                    : paciente.statusSeguranca === "Amarelo"
                    ? "Atenção"
                    : "Alerta Crítico";

                return (
                  <div
                    key={paciente.id}
                    className={`group rounded-[2rem] border bg-white p-6 shadow-sm transition-all duration-300 ${
                      isExpanded
                        ? "border-blue-400 ring-2 ring-blue-100 shadow-xl"
                        : "border-slate-200/90 hover:border-blue-300 hover:shadow-md"
                    }`}
                  >
                    {/* Top Header Card */}
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpandedPatientId(isExpanded ? null : paciente.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-50 text-blue-700 font-black text-lg">
                          {(paciente as any).fotoUrl ? (
                            <img src={(paciente as any).fotoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            paciente.nome.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-black text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {paciente.nome}
                          </h3>
                          <p className="text-xs font-semibold text-slate-400">
                            {paciente.idade} anos
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusColor}`}>
                          {statusLabel}
                        </span>
                        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Resumo Rápido (Sempre Visível) */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-3">
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Alimentação</p>
                        <p className="text-xs font-black text-slate-800 truncate mt-0.5">
                          {ultAlimentacao?.status || "Pendente"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Hidratação</p>
                        <p className="text-xs font-black text-slate-800 truncate mt-0.5">
                          {ultHidratacao?.status || "Pendente"}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Medicação</p>
                        <p className="text-xs font-black text-slate-800 truncate mt-0.5">
                          {ultMedicacao?.status || "Pendente"}
                        </p>
                      </div>
                    </div>

                    {/* Conteúdo Expandido Inline (Accordion sem recarregar) */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-in fade-in duration-300">
                        <div className="rounded-2xl bg-blue-50/50 p-3.5 border border-blue-100">
                          <p className="text-xs font-black text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5 text-blue-600" /> Histórico Recente do Residente
                          </p>

                          <div className="space-y-1.5 text-xs text-slate-700">
                            <p>
                              <strong>Alimentação:</strong> {ultAlimentacao ? `${ultAlimentacao.status} (${ultAlimentacao.detalhe || "Sem observações"})` : "Sem registros hoje"}
                            </p>
                            <p>
                              <strong>Hidratação:</strong> {ultHidratacao ? `${ultHidratacao.status} (${ultHidratacao.detalhe || "Sem observações"})` : "Sem registros hoje"}
                            </p>
                            <p>
                              <strong>Medicação:</strong> {ultMedicacao ? `${ultMedicacao.status} (${ultMedicacao.detalhe || "Sem observações"})` : "Sem registros hoje"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => router.push(`/pacientes/${paciente.id}`)}
                            className="flex-1 rounded-xl bg-slate-900 hover:bg-blue-600 text-white py-2.5 text-xs font-bold transition-all text-center"
                          >
                            Ver Prontuário Completo
                          </button>
                          <button
                            onClick={() => handleOpenQuickLog(paciente.id)}
                            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2.5 text-xs font-bold transition-all"
                          >
                            + Registrar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* DIÁLOGO DE CONFIRMAÇÃO PARA PREVENIR ERROS E CLIQUES ACIDENTAIS */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        variant="info"
        title="Confirmar Execução de Atividade"
        description={
          pendingTarefa
            ? `Confirma a realização de "${pendingTarefa.titulo}" para o residente ${pendingTarefa.pacienteNome}?`
            : undefined
        }
        confirmText="Sim, Confirmar"
        cancelText="Cancelar"
        isLoading={confirmingTask}
        onConfirm={handleConfirmCheckTarefa}
        onCancel={() => {
          setConfirmDialogOpen(false);
          setPendingTarefa(null);
        }}
      />

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO DE LOG (EXCLUSIVO ADMIN) */}
      <ConfirmDialog
        isOpen={deleteLogDialogOpen}
        variant="danger"
        title="Excluir Registro de Rotina"
        description={
          logToDelete
            ? `Tem certeza que deseja excluir o registro "${logToDelete.resumo}" de ${logToDelete.pacienteNome}? Esta ação removerá o dado permanentemente do banco.`
            : undefined
        }
        confirmText="Excluir Registro"
        cancelText="Cancelar"
        isLoading={deletingLog}
        onConfirm={handleConfirmDeleteLog}
        onCancel={() => {
          setDeleteLogDialogOpen(false);
          setLogToDelete(null);
        }}
      />

      {/* MODAL GAVETA DE REGISTRO RÁPIDO DE OCORRÊNCIA / LOG */}
      {quickLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 font-bold">
                  <Plus className="h-5 w-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Registrar Ocorrência Rápida</h3>
                  <p className="text-xs text-slate-500">Salva o registro instantaneamente no Firestore</p>
                </div>
              </div>
              <button
                onClick={() => setQuickLogModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickLog} className="space-y-5">
              {/* Seleção do Residente */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Residente
                </label>
                <select
                  value={selectedPacienteId}
                  onChange={(e) => setSelectedPacienteId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                >
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.idade} anos)
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção do Tipo de Atividade */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Categoria de Rotina
                </label>
                <select
                  value={quickTipo}
                  onChange={(e) => {
                    const t = e.target.value as ActivityType;
                    setQuickTipo(t);
                    const opts = ACTIVITY_TYPES[t]?.options || [];
                    if (opts.length > 0) setQuickStatus(opts[0].value);
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                >
                  {useAllActivityTypes().map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção de Status / Opção */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Status do Registro
                </label>
                <select
                  value={quickStatus}
                  onChange={(e) => setQuickStatus(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                >
                  {ACTIVITY_TYPES[quickTipo]?.options?.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Detalhes / Observação Livre */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Detalhes / Observações (Opcional)
                </label>
                <textarea
                  value={quickDetail}
                  onChange={(e) => setQuickDetail(e.target.value)}
                  placeholder="Ex: Refeição aceita com boa deglutição, 2 copos de água ingeridos..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickLogModalOpen(false)}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={quickSaving || !selectedPacienteId}
                  className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-xs font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {quickSaving ? "Salvando..." : "Salvar Registro Agora"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE RESIDENTES EM ATENÇÃO PRIORITÁRIA (Acesso Rápido 1-Toque) */}
      {modalAtencaoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-slate-200/90 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header do Modal */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 font-black">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-slate-900">
                    Atenção Prioritária ({pacientesAtencao.length})
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Residentes que registraram intercorrências ou alertas recentes.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalAtencaoOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
                aria-label="Fechar Modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lista de Residentes em Atenção */}
            <div className="my-4 space-y-3 overflow-y-auto pr-1 flex-1">
              {pacientesAtencao.map((paciente) => {
                const ultimoAlerta = logs
                  .filter((l) => l.pacienteId === paciente.id)
                  .sort((a, b) => {
                    const tsA = a.dataHora?.toDate ? a.dataHora.toDate().getTime() : 0;
                    const tsB = b.dataHora?.toDate ? b.dataHora.toDate().getTime() : 0;
                    return tsB - tsA;
                  })[0];

                const isCritico = paciente.statusSeguranca === "Vermelho";

                return (
                  <div
                    key={paciente.id}
                    onClick={() => {
                      setModalAtencaoOpen(false);
                      router.push(`/pacientes/${paciente.id}`);
                    }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
                    title={`Clique para abrir o prontuário de ${paciente.nome}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-100 text-blue-800 font-black text-sm group-hover:scale-105 transition-transform">
                        {(paciente as any).fotoUrl ? (
                          <img src={(paciente as any).fotoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          paciente.nome.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {paciente.nome}
                          </p>
                          <span className="text-xs font-semibold text-slate-400">
                            • {paciente.idade} anos
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 truncate">
                          {ultimoAlerta
                            ? `${ultimoAlerta.status} - ${ultimoAlerta.detalhe || ultimoAlerta.resumo || "Sem detalhes"}`
                            : "Exige checagem no turno"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                          isCritico
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {isCritico ? "Alerta Crítico" : "Atenção"}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                        Abrir Prontuário <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer do Modal */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                Toque em qualquer idoso para abrir o prontuário
              </span>
              <button
                type="button"
                onClick={() => {
                  setModalAtencaoOpen(false);
                  router.push("/rotina");
                }}
                className="rounded-xl bg-slate-900 hover:bg-blue-600 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                Ir para Rotina
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}