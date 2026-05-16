"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation"; // <-- Adicionado usePathname para saber a rota ativa
import { Users, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

import { auth, db } from "../../lib/firebase";
import { useInstitucaoId } from "../../lib/hooks";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { normalizeLogRecords } from "../../lib/logNormalizer";

interface Paciente {
  id: string;
  nome: string;
  idade: string;
  statusSeguranca: string;
}

export default function DashboardLobby() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Cuidador");
  const [pacientes, setPacientes] = useState<Paciente[]>([]); 
  const [logs, setLogs] = useState<any[]>([]);
  const [incidentesHoje, setIncidentesHoje] = useState(0);
  const [timeRange, setTimeRange] = useState<'24h' | '7d'>('24h');
  const [typeFilter, setTypeFilter] = useState<'all' | 'alimentacao' | 'hidratacao' | 'medicacao'>('all');
  const [patientFilter, setPatientFilter] = useState('');

  const router = useRouter();
  const pathname = usePathname();
  const { instituicaoId, loading: loadingInstituicao } = useInstitucaoId();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
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

      // realtime pacientes (filtrado por instituição)
      const qPacientes = query(
        collection(db, "Pacientes"),
        where("instituicaoId", "==", instituicaoId)
      );
      const unsubPacientes = onSnapshot(qPacientes, (snap) => {
        const lista: Paciente[] = [];
        snap.forEach((d) => lista.push({ id: d.id, ...(d.data() as any) } as Paciente));
        setPacientes(lista);
        setLoading(false);
      }, (err) => {
        console.error('Erro realtime pacientes', err);
        setLoading(false);
      });

      // realtime logs da instituição (filtrado por instituicao)
      const qLogs = query(
        collection(db, "LogsRotina"),
        where("instituicaoId", "==", instituicaoId)
      );
      const unsubLogs = onSnapshot(qLogs, (snap) => {
        const lista = normalizeLogRecords(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
        setLogs(lista);

        // calcular incidentes das últimas 24h (exemplo simples)
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const recentes = lista.filter((l) => {
          const ts = l.dataHora && typeof l.dataHora.toDate === 'function' ? l.dataHora.toDate().getTime() : 0;
          return now - ts <= dayMs;
        });
        setIncidentesHoje(recentes.length);
      }, (err) => console.error('Erro realtime logs', err));

      // ensure we cleanup realtime listeners when auth changes or component unmounts
      // store unsubscribes on window (short-lived) and clear on sign-out / unmount
      (unsubscribeAuth as any)._unsubPacientes = unsubPacientes;
      (unsubscribeAuth as any)._unsubLogs = unsubLogs;
    });

    return () => {
      // call onAuth unsubscribe
      try {
        // unsubscribe auth
        if (typeof unsubscribeAuth === 'function') unsubscribeAuth();
        // also try to cleanup nested unsubscribes
        if ((unsubscribeAuth as any)?._unsubPacientes) (unsubscribeAuth as any)._unsubPacientes();
        if ((unsubscribeAuth as any)?._unsubLogs) (unsubscribeAuth as any)._unsubLogs();
      } catch (e) {
        console.warn('Erro ao limpar listeners', e);
      }
    };
  }, [router, instituicaoId, loadingInstituicao]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const irParaCadastroPaciente = () => {
    router.push("/pacientes/novo"); 
  };

  // dados de risco serão calculados a partir dos logs em tempo real (substitui mocks)

  const pacientesAtencao = pacientes.filter((paciente) => paciente.statusSeguranca !== "Verde");

  // Alertas transformados com pacienteNome
  const recentAlerts = logs.map((l) => ({
    ...l,
    pacienteNome: pacientes.find((p) => p.id === l.pacienteId)?.nome || l.pacienteId,
  }));

  const isAlert = (l: any) => {
    if (!l || !l.tipo) return false;
    if (typeFilter !== 'all' && l.tipo !== typeFilter) return false;
    if (l.tipo === 'alimentacao' && (l.status === 'Recusou' || l.status === 'Metade')) return true;
    if (l.tipo === 'hidratacao' && l.status === 'Pouca') return true;
    if (l.tipo === 'medicacao' && l.status && l.status !== 'Administrada') return true;
    return false;
  };

  const filteredAlerts = recentAlerts.filter((a) => {
    const ts = a.dataHora && typeof a.dataHora.toDate === 'function' ? a.dataHora.toDate().getTime() : 0;
    if (!ts) return false;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (timeRange === '24h' && now - ts > dayMs) return false;
    if (timeRange === '7d' && now - ts > dayMs * 7) return false;
    if (patientFilter && a.pacienteNome && !a.pacienteNome.toLowerCase().includes(patientFilter.toLowerCase())) return false;
    return isAlert(a);
  });

  // agregação para gráfico de risco (últimos 7 dias)
  const dadosRisco = (() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    return days.map((d) => {
      const start = d.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const count = logs.filter((l) => {
        const ts = l.dataHora && typeof l.dataHora.toDate === 'function' ? l.dataHora.toDate().getTime() : 0;
        if (ts < start || ts >= end) return false;
        if (l.tipo === 'alimentacao' && (l.status === 'Recusou' || l.status === 'Metade')) return true;
        if (l.tipo === 'hidratacao' && l.status === 'Pouca') return true;
        if (l.tipo === 'medicacao' && l.status && l.status !== 'Administrada') return true;
        return false;
      }).length;
      return { dia: d.toLocaleDateString('pt-BR', { weekday: 'short' }), incidentes: count };
    });
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ITENS DO MENU baseados no MVP do Vitalidade Care AI
  const menuItems = [
    { name: "Painel Geral", path: "/dashboard", icon: "📊" },
    { name: "Prontuários", path: "/pacientes", icon: "🗂️" },
    { name: "Log de Rotina", path: "/rotina", icon: "📝" },
    { name: "Insights IA", path: "/insights", icon: "🧠" },
  ];

  return (
    // THE WRAPPER: Container flex que segura a tela toda sem rolar (h-screen overflow-hidden)
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* 1. SIDEBAR CONFIGURATION */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col justify-between shadow-sm z-10">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-100">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black shadow-md shadow-blue-200">
              V
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800">
              Vitality AI
            </span>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 font-bold' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout at the bottom */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl mb-2">
             <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase shrink-0">
                {userName.charAt(0)}
             </div>
             <div className="truncate text-left flex-1">
               <p className="text-sm font-bold text-slate-800 truncate">{userName}</p>
               <p className="text-xs text-slate-400">Cuidador</p>
             </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA (Rolagem acontece apenas aqui) */}
      <div className="flex-1 flex flex-col overflow-y-auto relative">
        
        {/* NAVBAR SUPERIOR (Simplificada, já que o logo foi para a Sidebar) */}
        <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4 transition-all flex justify-end items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={irParaCadastroPaciente}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-full hover:bg-blue-700 shadow-md shadow-blue-200 transition-all hidden sm:block"
            >
              + Novo Paciente
            </button>
          </div>
        </nav>

        {/* CONTEÚDO PRINCIPAL (Exatamente como estava) */}
        <main className="max-w-7xl mx-auto w-full px-6 py-10">
          <header className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 flex justify-between items-end">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 mb-2">
                Painel Geral
              </h1>
              <p className="text-slate-500 text-lg">
                Visão rápida da rotina e segurança dos idosos sob seus cuidados.
              </p>
            </div>
            
            <button 
              onClick={irParaCadastroPaciente}
              className="sm:hidden w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-200"
            >
              +
            </button>
          </header>

          {pacientes.length === 0 ? (
            <div className="animate-in fade-in zoom-in-95 duration-700 delay-150">
               {/* Seu Empty State */}
            </div>
          ) : (
            <div className="space-y-8">
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Total de Residentes</p>
                        <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{pacientes.length}</h3>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Requerem Atenção</p>
                      <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{pacientesAtencao.length}</h3>
                    </div>
                    <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Rotinas Concluídas</p>
                      <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{incidentesHoje} / {pacientes.length}</h3>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Monitoramento em tempo real: alertas rápidos */}
              <section className="mt-6">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-slate-900">Monitoramento em Tempo Real</h3>
                      <p className="text-sm text-slate-500">Painel de alertas configurável</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as any)} className="rounded-2xl border px-3 py-2 text-sm outline-none">
                        <option value="24h">Últimas 24h</option>
                        <option value="7d">Últimos 7 dias</option>
                      </select>
                      <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)} className="rounded-2xl border px-3 py-2 text-sm outline-none">
                        <option value="all">Todos</option>
                        <option value="alimentacao">Alimentação</option>
                        <option value="hidratacao">Hidratação</option>
                        <option value="medicacao">Medicação</option>
                      </select>
                      <input placeholder="Filtrar por paciente..." value={patientFilter} onChange={(e) => setPatientFilter(e.target.value)} className="rounded-2xl border px-3 py-2 text-sm outline-none" />
                      <div className="text-sm text-slate-500 ml-2">{filteredAlerts.length} alertas</div>
                    </div>
                  </div>

                  {filteredAlerts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Nenhum alerta no intervalo selecionado.</div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAlerts.map((a) => {
                        const ts = a.dataHora && typeof a.dataHora.toDate === 'function' ? a.dataHora.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
                        return (
                          <div key={a.id} className="flex items-center justify-between gap-4 rounded-2xl border border-red-100 bg-red-50/60 p-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-700 font-black">{a.pacienteNome.charAt(0)}</div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-red-700 truncate">{a.pacienteNome}</p>
                                  <p className="mt-1 text-xs text-slate-600 truncate">{a.tipo}: {a.resumo || a.status}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-xs text-slate-500">{ts}</div>
                              <button onClick={() => router.push(`/pacientes/${a.pacienteId}`)} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">Abrir</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Indicador semanal
                      </p>
                      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">Risco Populacional</h2>
                    </div>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dadosRisco} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorIncidentes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="dia" tickLine={false} axisLine={false} stroke="#64748b" />
                        <YAxis tickLine={false} axisLine={false} stroke="#64748b" allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "16px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.12)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="incidentes"
                          stroke="#2563eb"
                          strokeWidth={3}
                          fill="url(#colorIncidentes)"
                          dot={{ r: 3, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                          activeDot={{ r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
                  <div className="mb-6">
                    <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                      Prioridade
                    </p>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">Atenção Prioritária</h2>
                  </div>

                  {pacientesAtencao.length > 0 ? (
                    <div className="space-y-3">
                      {pacientesAtencao.map((paciente) => {
                        const alertsCount = filteredAlerts.filter((a) => a.pacienteId === paciente.id).length;
                        return (
                        <div
                          key={paciente.id}
                          onClick={() => router.push(`/pacientes/${paciente.id}`)}
                          className="group cursor-pointer rounded-2xl border border-red-100 bg-red-50/60 p-4 transition-all hover:border-red-200 hover:bg-red-50 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-700 font-black">{paciente.nome.charAt(0)}</div>
                            <div>
                              <p className="text-sm font-semibold text-red-700">{paciente.nome}</p>
                              <p className="mt-1 text-xs font-medium text-slate-500">{paciente.idade} anos</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-red-600 shadow-sm">{paciente.statusSeguranca}</div>
                            {alertsCount > 0 ? <div className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">{alertsCount}</div> : null}
                          </div>
                        </div>
                      )})}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                      <p className="text-sm font-bold">Tudo tranquilo!</p>
                      <p className="mt-1 text-sm text-emerald-700">Nenhum residente exige atenção prioritária no momento.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}