"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  History,
  LogOut,
  Pill,
  Sparkles,
  StickyNote,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { useInstitucaoId } from "../../lib/hooks";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";

interface Paciente {
  id: string;
  nome: string;
  idade: string;
  statusSeguranca: string;
}

type FeedbackState = {
  pacienteId: string;
  tipoRotina: string;
  valor: string;
} | null;

type LogDraft = {
  hidratacao: string;
  alimentacao: string;
  refeicao: string;
  medicacao: string;
  observacao: string;
};

export default function LogRotinaPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Cuidador");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [drafts, setDrafts] = useState<Record<string, LogDraft>>({});
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const { instituicaoId, loading: loadingInstituicao } = useInstitucaoId();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserName(user.email?.split("@")[0] || "Cuidador");
      
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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const irParaCadastroPaciente = () => {
    router.push("/pacientes/novo");
  };

  const obterDraft = (pacienteId: string) =>
    drafts[pacienteId] ?? {
      hidratacao: "",
      alimentacao: "",
      refeicao: "",
      medicacao: "",
      observacao: "",
    };

  const atualizarDraft = (pacienteId: string, campo: keyof LogDraft, valor: string) => {
    setDrafts((current) => ({
      ...current,
      [pacienteId]: {
        ...obterDraft(pacienteId),
        [campo]: valor,
      },
    }));
  };

  const registrarLog = async (pacienteId: string, tipoRotina: string, valor: string) => {
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

      const draft = obterDraft(pacienteId);
      const detalhe = tipoRotina === "alimentacao" ? draft.refeicao : tipoRotina === "medicacao" ? draft.medicacao : draft.hidratacao;
      const resumo = detalhe ? `${valor} - ${detalhe}` : valor;

      await addDoc(collection(db, "LogsRotina"), {
        pacienteId,
        cuidadorId: usuarioAtual.uid,
        instituicaoId: instituicaoId, // ← MULTI-TENANCY!
        dataHora: serverTimestamp(),
        tipo: tipoRotina,
        status: valor,
        resumo,
        detalhe,
        observacao: draft.observacao,
      });

      setFeedback({ pacienteId, tipoRotina, valor });
      setDrafts((current) => ({
        ...current,
        [pacienteId]: {
          hidratacao: "",
          alimentacao: "",
          refeicao: "",
          medicacao: "",
          observacao: "",
        },
      }));
      setToast({ message: "Registro salvo com sucesso.", variant: "success" });
    } catch (error) {
      console.error("Erro ao registrar log:", error);
      setToast({ message: "Falha ao salvar o registro.", variant: "error" });
    }
  };

  useEffect(() => {
    if (!feedback) return;

    const timeoutId = window.setTimeout(() => {
      setFeedback(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  const menuItems = [
    { name: "Painel Geral", path: "/dashboard", icon: "📊" },
    { name: "Prontuários", path: "/pacientes", icon: "🗂️" },
    { name: "Log de Rotina", path: "/rotina", icon: "📝" },
    { name: "Insights IA", path: "/insights", icon: "🧠" },
  ];

  const hidratacaoOptions = [
    { label: "Pouca", value: "Pouca", color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
    { label: "Adequada", value: "Adequada", color: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100" },
    { label: "Boa", value: "Boa", color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  ];

  const alimentacaoOptions = [
    { label: "Comeu Tudo", value: "Comeu Tudo", color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
    { label: "Metade", value: "Metade", color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
    { label: "Recusou", value: "Recusou", color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <aside className="hidden w-64 flex-col justify-between border-r border-slate-200 bg-white shadow-sm z-10 md:flex">
        <div>
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 font-black text-white shadow-md shadow-blue-200">
              V
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Vitality AI</span>
          </div>

          <nav className="space-y-2 p-4">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;

              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.path)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    isActive ? "bg-blue-50 font-bold text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold uppercase text-blue-700">
              {userName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-bold text-slate-800">{userName}</p>
              <p className="text-xs text-slate-400">Cuidador</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      <div className="relative flex-1 flex-col overflow-y-auto">
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

        <nav className="sticky top-0 z-40 flex items-center justify-end border-b border-slate-200/50 bg-white/75 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={irParaCadastroPaciente}
              className="hidden rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700 sm:block"
            >
              + Novo Paciente
            </button>
          </div>
        </nav>

        <main className="mx-auto w-full max-w-7xl px-6 py-10">
          <header className="mb-10 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                <Sparkles className="h-3.5 w-3.5" />
                Registro Assistencial
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-800 md:text-4xl">Log de Rotina</h1>
              <p className="mt-2 max-w-2xl text-lg text-slate-500">
                Registre alimentação, hidratação e medicação em poucos toques, com contexto suficiente para o prontuário virar um histórico real de cuidado.
              </p>
            </div>

            <div className="rounded-3xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-sm text-blue-800 shadow-sm">
              <div className="flex items-center gap-2 font-black">
                <History className="h-4 w-4" />
                Fluxo rápido
              </div>
              <p className="mt-2 max-w-sm leading-6 text-blue-700">
                Marque o estado, detalhe o que foi consumido e adicione uma observação opcional se houver algo relevante.
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
                const hidratacaoAtual = feedback?.pacienteId === paciente.id && feedback.tipoRotina === "hidratacao" ? feedback.valor : null;
                const alimentacaoAtual = feedback?.pacienteId === paciente.id && feedback.tipoRotina === "alimentacao" ? feedback.valor : null;
                const medicacaoAtual = feedback?.pacienteId === paciente.id && feedback.tipoRotina === "medicacao" ? feedback.valor : null;

                const isExpanded = Boolean(expanded[paciente.id]);
                const lastSummary = draft.observacao ? `Observação: ${draft.observacao}` : "Sem registros";

                return (
                  <div key={paciente.id} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-100">
                    <div className="flex items-center justify-between gap-4 p-4 cursor-pointer" onClick={() => setExpanded((s) => ({ ...s, [paciente.id]: !s[paciente.id] }))}>
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl font-black text-blue-700">{paciente.nome.charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{paciente.nome} • {paciente.idade} anos</p>
                          <p className="mt-1 text-xs text-slate-500 truncate">{lastSummary}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`rounded-full px-3 py-1 text-xs font-bold ${paciente.statusSeguranca === "Verde" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>{paciente.statusSeguranca}</div>
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/pacientes/${paciente.id}`); }} className="rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600">Abrir</button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <>
                        <div className="grid gap-4 border-t border-slate-100 bg-slate-50/70 p-6 lg:grid-cols-3">
                          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                                <Droplets className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Hidratação</h3>
                                <p className="text-sm text-slate-500">Quanto bebeu hoje?</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              {hidratacaoOptions.map((option) => {
                                const active = hidratacaoAtual === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    onClick={() => registrarLog(paciente.id, "hidratacao", option.value)}
                                    className={`rounded-2xl border px-3 py-3 text-sm font-bold transition-all ${active ? "border-emerald-300 bg-emerald-500 text-white shadow-lg shadow-emerald-100" : option.color}`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                              <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                                <StickyNote className="h-3.5 w-3.5" />
                                Detalhe rápido
                              </label>
                              <input
                                value={draft.hidratacao}
                                onChange={(e) => atualizarDraft(paciente.id, "hidratacao", e.target.value)}
                                placeholder="Ex: 2 copos, água com gelatina, soro..."
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                                <UtensilsCrossed className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Alimentação</h3>
                                <p className="text-sm text-slate-500">Comeu? O que foi consumido?</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              {alimentacaoOptions.map((option) => {
                                const active = alimentacaoAtual === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    onClick={() => registrarLog(paciente.id, "alimentacao", option.value)}
                                    className={`rounded-2xl border px-3 py-3 text-sm font-bold transition-all ${active ? "border-emerald-300 bg-emerald-500 text-white shadow-lg shadow-emerald-100" : option.color}`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                              <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                                <StickyNote className="h-3.5 w-3.5" />
                                O que comeu?
                              </label>
                              <input
                                value={draft.refeicao}
                                onChange={(e) => atualizarDraft(paciente.id, "refeicao", e.target.value)}
                                placeholder="Ex: arroz, feijão, frango, sopa, fruta..."
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                                <Pill className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Medicação Crítica</h3>
                                <p className="text-sm text-slate-500">Nomeie o medicamento administrado</p>
                              </div>
                            </div>

                            <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                              <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                                <StickyNote className="h-3.5 w-3.5" />
                                Medicação
                              </label>
                              <input
                                value={draft.medicacao}
                                onChange={(e) => atualizarDraft(paciente.id, "medicacao", e.target.value)}
                                placeholder="Ex: Losartana 50mg, Dipirona..."
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
                              />
                            </div>

                            <button
                              onClick={() => registrarLog(paciente.id, "medicacao", "Administrada")}
                              className={`flex w-full items-center justify-center gap-2 rounded-3xl px-4 py-4 text-sm font-black transition-all ${medicacaoAtual === "Administrada" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                            >
                              <CheckCircle2 className="h-5 w-5" />
                              Medicação Administrada
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 bg-white px-6 pb-6 pt-4">
                          <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                            <StickyNote className="h-3.5 w-3.5" />
                            Observação do turno
                          </label>
                          <textarea
                            value={draft.observacao}
                            onChange={(e) => atualizarDraft(paciente.id, "observacao", e.target.value)}
                            rows={2}
                            placeholder="Ex: aceitou bem a refeição, precisou de auxílio, recusou líquido, sonolento..."
                            className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
                          />
                          <p className="mt-2 text-xs text-slate-400">
                            A observação fica anexada ao log e ajuda no histórico do prontuário.
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}