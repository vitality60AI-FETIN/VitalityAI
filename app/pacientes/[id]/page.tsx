"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { ArrowLeft, Activity, AlertTriangle, CheckCircle2, HeartPulse, Phone, User, Users, LogOut, Droplets, History, Pill, UtensilsCrossed } from "lucide-react";
import { auth, db } from "../../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

interface PacienteDetail {
  nome: string;
  idade: string;
  genero: string;
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
  dataHora?: { toDate?: () => Date };
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

  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
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

      setUserName(user.email?.split("@")[0] || "Cuidador");

      if (!pacienteId) {
        setError("Paciente inválido ou não encontrado na URL.");
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "Pacientes", pacienteId));

        if (!snapshot.exists()) {
          setPaciente(null);
          setError("Paciente não encontrado na base de dados.");
        } else {
          setPaciente(snapshot.data() as PacienteDetail);
          setError("");

          const logsSnapshot = await getDocs(query(collection(db, "LogsRotina"), where("pacienteId", "==", pacienteId)));
          const listaLogs: LogRotina[] = [];

          logsSnapshot.forEach((logDoc) => {
            listaLogs.push({ id: logDoc.id, ...logDoc.data() } as LogRotina);
          });

          listaLogs.sort((a, b) => {
            const timeA = a.dataHora && typeof a.dataHora.toDate === "function" ? a.dataHora.toDate().getTime() : 0;
            const timeB = b.dataHora && typeof b.dataHora.toDate === "function" ? b.dataHora.toDate().getTime() : 0;
            return timeB - timeA;
          });

          setLogs(listaLogs);
        }
      } catch (fetchError) {
        console.error("Erro ao buscar paciente:", fetchError);
        setError("Não foi possível carregar o prontuário digital.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pacienteId, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const menuItems = [
    { name: "Painel Geral", path: "/dashboard", icon: "📊" },
    { name: "Prontuários", path: "/pacientes", icon: "🗂️" },
    { name: "Log de Rotina", path: "/rotina", icon: "📝" },
    { name: "Insights IA", path: "/insights", icon: "🧠" },
  ];

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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      <aside className="hidden w-64 flex-col justify-between border-r border-slate-200 bg-white shadow-sm md:flex z-10">
        <div>
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 font-black text-white shadow-md shadow-blue-200">
              V
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Vitality AI</span>
          </div>

          <nav className="space-y-2 p-4">
            {menuItems.map((item) => {
              const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

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
        <nav className="sticky top-0 z-40 flex items-center justify-end border-b border-slate-200/50 bg-white/75 px-6 py-4 backdrop-blur-xl">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md shadow-slate-200 transition-all hover:bg-blue-600"
          >
            ← Voltar ao Painel
          </button>
        </nav>

        <main className="mx-auto w-full max-w-7xl px-6 py-10">
          <header className="mb-10 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
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
          </header>

          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600" />
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
                <DetailCard
                  title="Card Biometria"
                  icon={<User className="h-5 w-5" />}
                  className="bg-blue-50/60 lg:col-span-2"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <InfoPill label="Idade" value={`${paciente.idade} anos`} />
                    <InfoPill label="Gênero" value={paciente.genero} />
                    <InfoPill label="Peso" value={`${paciente.peso} kg`} />
                    <InfoPill label="Altura" value={`${paciente.altura} cm`} />
                  </div>
                </DetailCard>

                <DetailCard title="Status Atual" icon={<CheckCircle2 className="h-5 w-5" />}>
                  <div className="flex h-full items-center justify-center">
                    <span className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-black uppercase tracking-[0.2em] ${getStatusClasses(paciente.statusSeguranca)}`}>
                      {paciente.statusSeguranca || "Sem status"}
                    </span>
                  </div>
                </DetailCard>
              </section>

              <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <DetailCard title="Card Condições" icon={<AlertTriangle className="h-5 w-5" />} className="lg:col-span-2">
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                        <HeartPulse className="h-4 w-4 text-rose-600" />
                        Doenças Crônicas / Medicações
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        {paciente.doencasCronicas || "Não informado."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Activity className="h-4 w-4 text-blue-600" />
                        Restrições Biomecânicas
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        {paciente.restricoesFisicas || "Não informado."}
                      </p>
                    </div>
                  </div>
                </DetailCard>

                <DetailCard title="Card Objetivo" icon={<Users className="h-5 w-5" />}>
                  <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-700">Objetivo Principal de Cuidado</p>
                    <p className="mt-3 text-lg font-bold leading-7 text-slate-900">
                      {paciente.objetivo || "Não informado."}
                    </p>
                  </div>
                </DetailCard>
              </section>

              <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <DetailCard title="Card Segurança" icon={<Phone className="h-5 w-5" />} className="lg:col-span-2 bg-red-50/70">
                  <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-red-700">
                      <Phone className="h-4 w-4" />
                      Contato de Emergência
                    </div>
                    <p className="text-2xl font-black tracking-tight text-slate-900">
                      {paciente.contatoEmergencia || "Não informado"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Este contato deve ser acionado em caso de alerta clínico ou indisponibilidade prolongada.
                    </p>
                  </div>
                </DetailCard>

                <DetailCard title="Resumo Rápido" icon={<Activity className="h-5 w-5" />}>
                  <div className="space-y-3 text-sm text-slate-600">
                    <MiniLine label="Status" value={paciente.statusSeguranca || "Sem status"} />
                    <MiniLine label="Paciente" value={paciente.nome} />
                    <MiniLine label="Documento" value={pacienteId || "-"} />
                    <MiniLine label="Cadastro" value={formatarCriacao(paciente.criadoEm)} />
                  </div>
                </DetailCard>
              </section>

                  <section>
                    <DetailCard title="Linha do Tempo Assistencial" icon={<History className="h-5 w-5" />}>
                      {logs.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                          Nenhum log de rotina registrado ainda para este residente.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {logs.map((log) => {
                            const isHidratacao = log.tipo === "hidratacao";
                            const isAlimentacao = log.tipo === "alimentacao";

                            return (
                              <article key={log.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                                      {isHidratacao ? <Droplets className="h-4 w-4 text-sky-600" /> : isAlimentacao ? <UtensilsCrossed className="h-4 w-4 text-amber-600" /> : <Pill className="h-4 w-4 text-emerald-600" />}
                                      {isHidratacao ? "Hidratação" : isAlimentacao ? "Alimentação" : "Medicação"}
                                    </div>
                                    <p className="mt-2 text-base font-bold text-slate-900">{log.resumo || log.status}</p>
                                    {log.detalhe ? <p className="mt-1 text-sm text-slate-600">Detalhe: {log.detalhe}</p> : null}
                                    {log.observacao ? <p className="mt-1 text-sm text-slate-500">Observação: {log.observacao}</p> : null}
                                  </div>

                                  <div className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm">
                                    {formatarData(log.dataHora)}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </DetailCard>
                  </section>
            </div>
          ) : null}
        </main>
      </div>
    </div>
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
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="max-w-[60%] truncate font-bold text-slate-900">{value}</span>
    </div>
  );
}