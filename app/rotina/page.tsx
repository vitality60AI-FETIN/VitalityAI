"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  LogOut,
  Pill,
  Sparkles,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import { auth, db } from "../../lib/firebase";
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

export default function LogRotinaPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Cuidador");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserName(user.email?.split("@")[0] || "Cuidador");
        try {
          const q = query(collection(db, "Pacientes"), where("cuidadorId", "==", user.uid));
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
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

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

  const registrarLog = async (pacienteId: string, tipoRotina: string, valor: string) => {
    try {
      const usuarioAtual = auth.currentUser;

      if (!usuarioAtual) {
        router.push("/login");
        return;
      }

      await addDoc(collection(db, "LogsRotina"), {
        pacienteId,
        cuidadorId: usuarioAtual.uid,
        dataHora: serverTimestamp(),
        tipo: tipoRotina,
        status: valor,
      });

      setFeedback({ pacienteId, tipoRotina, valor });
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
          <header className="mb-10 flex items-end justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                <Sparkles className="h-3.5 w-3.5" />
                Log Diário
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-800 md:text-4xl">Log Diário</h1>
              <p className="mt-2 text-lg text-slate-500">Check-in rápido de atividades dos residentes</p>
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
              {pacientes.map((paciente) => {
                const hidratacaoAtual = feedback?.pacienteId === paciente.id && feedback.tipoRotina === "hidratacao" ? feedback.valor : null;
                const alimentacaoAtual = feedback?.pacienteId === paciente.id && feedback.tipoRotina === "alimentacao" ? feedback.valor : null;
                const medicacaoAtual = feedback?.pacienteId === paciente.id && feedback.tipoRotina === "medicacao" ? feedback.valor : null;

                return (
                  <article
                    key={paciente.id}
                    className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-100"
                  >
                    <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl font-black text-blue-700">
                          {paciente.nome.charAt(0)}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-2xl font-black tracking-tight text-slate-900">{paciente.nome}</h2>
                            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${paciente.statusSeguranca === "Verde" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                              {paciente.statusSeguranca === "Verde" ? "Seguro" : "Atenção"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {paciente.idade} anos • Check-in rápido
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => router.push(`/pacientes/${paciente.id}`)}
                        className="inline-flex items-center justify-center rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        Abrir prontuário
                      </button>
                    </div>

                    <div className="grid gap-4 border-t border-slate-100 bg-slate-50/70 p-6 lg:grid-cols-3">
                      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                            <Droplets className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Hidratação</h3>
                            <p className="text-sm text-slate-500">Selecione o nível rapidamente</p>
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
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                            <UtensilsCrossed className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Alimentação</h3>
                            <p className="text-sm text-slate-500">Toque para marcar a refeição</p>
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
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                            <Pill className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Medicação Crítica</h3>
                            <p className="text-sm text-slate-500">Ação única para a medicação</p>
                          </div>
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
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}