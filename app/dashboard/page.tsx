"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, AlertTriangle, CheckCircle2, TrendingUp, Brain, Sparkles, Loader2 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import DashboardLayout from "../components/DashboardLayout";

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
  const [pacientes, setPacientes] = useState<Paciente[]>([]); 
  const [logs, setLogs] = useState<any[]>([]);
  const [incidentesHoje, setIncidentesHoje] = useState(0);
  const [timeRange, setTimeRange] = useState<'24h' | '7d'>('24h');
  const [typeFilter, setTypeFilter] = useState<'all' | 'alimentacao' | 'hidratacao' | 'medicacao'>('all');
  const [patientFilter, setPatientFilter] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiReport, setAiReport] = useState<{resumo_geral: string, pontos_atencao: string[], recomendacoes_rotina: string[]} | null>(null);

  const router = useRouter();
  const { instituicaoId, role, loading: loadingInstituicao } = useInstitucaoId();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
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

  const handleGenerateReport = async () => {
    if (pacientes.length === 0) return;
    setIsGeneratingAI(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ patients: pacientes, logs: logs.slice(0, 50) })
      });
      const data = await res.json();
      if (!data.error && data.result) {
        let raw = data.result;
        raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(raw);
        setAiReport(parsed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingAI(false);
    }
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

  return (
    <DashboardLayout>
      <header className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 flex justify-between items-end">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
                Painel Geral
              </h1>
              <p className="text-slate-500 text-lg leading-relaxed">
                Visão rápida da rotina e segurança dos idosos sob seus cuidados.
              </p>
            </div>
            <button 
              onClick={() => router.push("/pacientes/novo")}
              className="sm:hidden w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 active:scale-95 transition-transform"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
          </header>

          {pacientes.length === 0 ? (
            <div className="animate-in fade-in zoom-in-95 duration-700 delay-150">
               {/* Seu Empty State */}
            </div>
          ) : (
            <div className="space-y-8">
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-transform cursor-default">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Total de Residentes</p>
                        <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{pacientes.length}</h3>
                    </div>
                    <div className="rounded-2xl bg-blue-50/80 p-3 text-blue-600">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-transform cursor-default">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Requerem Atenção</p>
                      <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{pacientesAtencao.length}</h3>
                    </div>
                    <div className="rounded-2xl bg-red-50/80 p-3 text-red-600">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-transform cursor-default">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Rotinas Concluídas</p>
                      <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">{incidentesHoje} <span className="text-lg font-medium text-slate-400">/ {pacientes.length}</span></h3>
                    </div>
                    <div className="rounded-2xl bg-emerald-50/80 p-3 text-emerald-600">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Análise Inteligente IA */}
              <section className="mt-6">
                <div className="rounded-3xl border border-indigo-100/60 bg-gradient-to-br from-indigo-50/50 to-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                        <Brain className="h-6 w-6 text-indigo-600" />
                        Análise de Saúde Geriátrica IA
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Relatório inteligente baseado nas métricas recentes de todos os pacientes.
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateReport}
                      disabled={isGeneratingAI || pacientes.length === 0}
                      className="flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                    >
                      {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {isGeneratingAI ? "Analisando dados..." : "Gerar Relatório Inteligente"}
                    </button>
                  </div>

                  {aiReport && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-2">Resumo Geral</h4>
                        <p className="text-slate-700 leading-relaxed">{aiReport.resumo_geral}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Pontos de Atenção
                          </h4>
                          <ul className="space-y-2">
                            {aiReport.pontos_atencao?.map((pt, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"></div>
                                <span>{pt}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Recomendações
                          </h4>
                          <ul className="space-y-2">
                            {aiReport.recomendacoes_rotina?.map((rec, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0"></div>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
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
    </DashboardLayout>
  );
}