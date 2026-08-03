"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import DashboardLayout from "../components/DashboardLayout";
import {
  Brain,
  Sparkles,
  Loader2,
  Send,
  Clock,
  ChevronDown,
  MessageSquare
} from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { useInstitucaoId } from "../../lib/hooks";
import { normalizeLogRecords } from "../../lib/logNormalizer";

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Cuidador");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

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

      const qPacientes = query(collection(db, "Pacientes"), where("instituicaoId", "==", instituicaoId));
      const unsubPacientes = onSnapshot(qPacientes, (snap) => {
        const lista: any[] = [];
        snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
        setPacientes(lista);
        setLoading(false);
      }, (err) => {
        console.error(err);
        setLoading(false);
      });

      const qLogs = query(collection(db, "LogsRotina"), where("instituicaoId", "==", instituicaoId));
      const unsubLogs = onSnapshot(qLogs, (snap) => {
        const lista = normalizeLogRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLogs(lista);
      }, (err) => console.error(err));

      const qHistory = query(collection(db, "InsightsHistory"), where("instituicaoId", "==", instituicaoId));
      const unsubHistory = onSnapshot(qHistory, (snap) => {
        const lista: any[] = [];
        snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
        
        // Ordenação local para não exigir index composto no Firestore
        lista.sort((a, b) => {
          const timeA = a.dataHora?.toMillis ? a.dataHora.toMillis() : 0;
          const timeB = b.dataHora?.toMillis ? b.dataHora.toMillis() : 0;
          return timeB - timeA;
        });

        setHistory(lista);
      }, (err) => console.error(err));

      (unsubscribeAuth as any)._unsubPacientes = unsubPacientes;
      (unsubscribeAuth as any)._unsubLogs = unsubLogs;
      (unsubscribeAuth as any)._unsubHistory = unsubHistory;
    });

    return () => {
      try {
        if (typeof unsubscribeAuth === 'function') unsubscribeAuth();
        if ((unsubscribeAuth as any)?._unsubPacientes) (unsubscribeAuth as any)._unsubPacientes();
        if ((unsubscribeAuth as any)?._unsubLogs) (unsubscribeAuth as any)._unsubLogs();
        if ((unsubscribeAuth as any)?._unsubHistory) (unsubscribeAuth as any)._unsubHistory();
      } catch (e) {}
    };
  }, [router, instituicaoId, loadingInstituicao]);

  const handleGenerateInsight = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setResponse("");

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          prompt, 
          mode: "chat",
          patients: pacientes,
          logs: logs.slice(0, 50)
        }),
      });

      const data = await res.json();
      
      if (data.error) {
        setResponse(`Erro: ${data.error}`);
      } else {
        setResponse(data.result);
        const currentUser = auth.currentUser;
        if (currentUser && instituicaoId) {
          try {
            await addDoc(collection(db, "InsightsHistory"), {
              instituicaoId,
              cuidadorId: currentUser.uid,
              pergunta: prompt,
              resposta: data.result,
              dataHora: serverTimestamp()
            });
          } catch (e) {
            console.error("Erro ao salvar histórico", e);
          }
        }
      }
    } catch (error: any) {
      setResponse("Erro ao conectar com a IA. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
        <main className="mx-auto w-full max-w-5xl">
          <header className="mb-10 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                Inteligência Artificial
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-800 md:text-4xl">Insights IA</h1>
              <p className="mt-2 max-w-2xl text-lg text-slate-500">
                Converse com o Gemini para obter orientações sobre os cuidados e rotinas dos residentes.
              </p>
            </div>
          </header>

          <div className="flex flex-col gap-8">
            {/* Input Section */}
            <div className="group relative rounded-[2.5rem] bg-white p-2 shadow-xl shadow-indigo-900/5 transition-all duration-500 focus-within:shadow-indigo-500/20 focus-within:-translate-y-1">
              <div className="absolute -inset-[2px] rounded-[2.6rem] bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-20 blur-sm transition-opacity duration-500 group-focus-within:opacity-60 group-focus-within:animate-pulse"></div>
              <div className="relative flex flex-col gap-4 rounded-[2.25rem] bg-white p-6 md:p-8">
                <label className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.15em] text-indigo-900/50">
                  <MessageSquare className="h-4 w-4" />
                  O que você gostaria de saber?
                </label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Como posso melhorar a aceitação da medicação para idosos com Alzheimer?"
                  className="w-full h-32 bg-transparent text-lg font-medium text-slate-800 placeholder-slate-300 outline-none resize-none leading-relaxed"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateInsight}
                    disabled={isGenerating || !prompt.trim()}
                    className="group/btn flex items-center gap-3 rounded-[2rem] bg-slate-900 px-8 py-4 text-sm font-black text-white shadow-xl shadow-slate-900/20 transition-all duration-300 hover:-translate-y-1 hover:bg-indigo-600 hover:shadow-indigo-600/30 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />}
                    {isGenerating ? "Processando Análise..." : "Gerar Insight"}
                  </button>
                </div>
              </div>
            </div>

            {/* Current Response */}
            {response && (
              <div className="relative overflow-hidden rounded-[3rem] border border-indigo-100/50 bg-gradient-to-b from-white to-indigo-50/30 p-8 md:p-10 shadow-2xl shadow-indigo-900/10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
                <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-purple-400/10 blur-3xl" />
                
                <div className="relative z-10 flex items-center gap-4 mb-8 border-b border-indigo-100/50 pb-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-indigo-950">Análise Concluída</h2>
                    <p className="text-sm font-bold uppercase tracking-wider text-indigo-600/70">Resposta da Inteligência Artificial</p>
                  </div>
                </div>
                <div className="relative z-10 prose prose-lg prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-strong:text-indigo-950 prose-strong:font-black leading-relaxed">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* History Section */}
            {history.length > 0 && (
              <div className="mt-12 flex flex-col gap-6 animate-in fade-in duration-1000 delay-300">
                <div className="flex items-center gap-3 px-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <Clock className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-slate-800">
                    Histórico de Consultas
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {history.map((item) => {
                    const isExpanded = expandedHistory[item.id];
                    const timeStr = item.dataHora?.toDate ? item.dataHora.toDate().toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : 'Agora mesmo';
                    
                    return (
                      <div key={item.id} className="group overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30 transition-all duration-300 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-900/5">
                        <div 
                          className="flex cursor-pointer items-start justify-between gap-4 p-6 transition-colors hover:bg-slate-50/50"
                          onClick={() => setExpandedHistory(s => ({ ...s, [item.id]: !s[item.id] }))}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-black uppercase tracking-[0.15em] text-indigo-400 mb-1">
                              {timeStr}
                            </p>
                            <p className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-700 transition-colors">
                              "{item.pergunta}"
                            </p>
                          </div>
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180 bg-indigo-50 text-indigo-600" : "group-hover:bg-indigo-50 group-hover:text-indigo-600"}`}>
                            <ChevronDown className="h-5 w-5" />
                          </div>
                        </div>
                        
                        <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                          <div className="overflow-hidden">
                            <div className="border-t border-slate-100 bg-slate-50/50 p-6 md:p-8">
                              <div className="prose prose-slate max-w-none prose-headings:font-black prose-a:text-indigo-600 prose-strong:text-slate-900 text-slate-700">
                                <ReactMarkdown>{item.resposta}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
    </DashboardLayout>
  );
}
