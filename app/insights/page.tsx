"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  Brain,
  LogOut,
  Sparkles,
  Loader2,
  Send,
  Clock
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

  const router = useRouter();
  const pathname = usePathname();
  const { instituicaoId, role, loading: loadingInstituicao } = useInstitucaoId();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserName(user.email?.split("@")[0] || "Cuidador");
      
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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

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

  const menuItems = [
    { name: "Painel Geral", path: "/dashboard", icon: "📊" },
    { name: "Prontuários", path: "/pacientes", icon: "🗂️" },
    { name: "Log de Rotina", path: "/rotina", icon: "📝" },
    { name: "Insights IA", path: "/insights", icon: "🧠" },
    ...(role === "Admin" ? [{ name: "Equipe", path: "/equipe", icon: "👥" }] : []),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <aside className="hidden w-64 flex-col justify-between border-r border-slate-200 bg-white shadow-sm z-10 md:flex">
        <div>
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 font-black text-white shadow-md shadow-indigo-200">
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
                    isActive ? "bg-indigo-50 font-bold text-indigo-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold uppercase text-indigo-700">
              {userName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-bold text-slate-800">{userName}</p>
              <p className="text-xs text-slate-400">{role === "Admin" ? "Administrador" : "Cuidador"}</p>
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
        <main className="mx-auto w-full max-w-5xl px-6 py-10">
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

          <div className="flex flex-col gap-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100 flex flex-col gap-4">
              <label className="text-sm font-bold text-slate-700">O que você gostaria de saber?</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Como posso melhorar a aceitação da medicação para idosos com Alzheimer?"
                className="w-full h-32 rounded-2xl border border-slate-200 p-4 text-sm outline-none transition-colors focus:border-indigo-500 resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleGenerateInsight}
                  disabled={isGenerating || !prompt.trim()}
                  className="flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isGenerating ? "Gerando Insight..." : "Perguntar à IA"}
                </button>
              </div>
            </div>

            {response && (
              <div className="rounded-[2rem] border border-indigo-100 bg-indigo-50/50 p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-black text-white shadow-sm">
                    <Brain className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-black text-indigo-950">Resposta da IA</h2>
                </div>
                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed">
                  <ReactMarkdown>{response}</ReactMarkdown>
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div className="mt-8 flex flex-col gap-4">
                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Histórico de Consultas
                </h3>
                <div className="space-y-4">
                  {history.map((item) => {
                    const timeStr = item.dataHora?.toDate ? item.dataHora.toDate().toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : 'Agora mesmo';
                    
                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-sm font-bold text-indigo-700 flex-1">Q: {item.pergunta}</p>
                          <span className="text-xs text-slate-400 font-medium whitespace-nowrap ml-4">{timeStr}</span>
                        </div>
                        <div className="prose prose-sm text-slate-600 max-w-none">
                          <ReactMarkdown>{item.resposta}</ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
