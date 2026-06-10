"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Brain,
  LogOut,
  Sparkles,
  Loader2,
  Send
} from "lucide-react";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Cuidador");
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserName(user.email?.split("@")[0] || "Cuidador");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const handleGenerateInsight = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setResponse("");

    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      
      if (data.error) {
        setResponse(`Erro: ${data.error}`);
      } else {
        setResponse(data.result);
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
                <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {response}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
