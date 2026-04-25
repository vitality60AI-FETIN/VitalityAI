"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Hook para navegação
import { auth } from "@/lib/firebase"; // Importamos o auth já inicializado
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  // Garante que o componente está montado no cliente para evitar erros de hidratação
  useEffect(() => setMounted(true), []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      if (isLogin) {
        // LOGIN: Tenta entrar e vai para o Dashboard
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/dashboard"); 
      } else {
        // REGISTO: Cria a conta e vai para o Onboarding completar os dados
        await createUserWithEmailAndPassword(auth, email, password);
        router.push("/onboarding"); 
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Este e-mail já está a ser utilizado.");
      } else if (err.code === "auth/weak-password") {
        setError("A palavra-passe deve ter pelo menos 6 caracteres.");
      } else if (err.code === "auth/invalid-credential") {
        setError("E-mail ou palavra-passe incorretos.");
      } else {
        setError("Ocorreu um erro. Verifique os seus dados.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#fdfdfd] overflow-hidden">
      
      {/* LADO ESQUERDO: APRESENTAÇÃO (ESTILO ENTERPRISE) */}
      <div className="relative flex w-full lg:w-3/5 flex-col justify-center p-12 lg:p-24 bg-linear-to-br from-blue-700 via-blue-600 to-indigo-800 text-white">
        
        {/* Elementos Visuais de Fundo */}
        <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-5%] right-[5%] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-xl animate-in fade-in slide-in-from-left-8 duration-1000">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-700 font-black text-2xl shadow-2xl">V</div>
            <span className="text-2xl font-bold tracking-tight">Vitalidade Senior AI</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-black leading-[1.1] mb-8 tracking-tighter">
            Longevidade na <br /> 
            <span className="text-blue-200">Palma da Mão.</span>
          </h1>

          <div className="space-y-8 mt-12">
            <div className="group flex items-start gap-5 p-4 rounded-2xl hover:bg-white/5 transition-all">
              <span className="text-3xl group-hover:scale-125 transition-transform">🧘‍♂️</span>
              <div>
                <h3 className="text-xl font-bold">Digital Caregiver</h3>
                <p className="text-blue-100/80 text-sm italic">"O mentor que simplifica a rotina diária de cuidados."</p>
              </div>
            </div>

            <div className="group flex items-start gap-5 p-4 rounded-2xl hover:bg-white/5 transition-all">
              <span className="text-3xl group-hover:scale-125 transition-transform">🛡️</span>
              <div>
                <h3 className="text-xl font-bold">Gatilho de Inatividade</h3>
                <p className="text-blue-100/80 text-sm italic">"Segurança invisível que alerta a família em tempo real."</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LADO DIREITO: LOGIN / REGISTO INTERATIVO */}
      <div className="flex w-full lg:w-2/5 flex-col items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
          
          <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 p-10 relative overflow-hidden">
            
            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-800 mb-2">
                {isLogin ? "Bem-vindo" : "Criar Conta"}
              </h2>
              <p className="text-slate-500 font-medium">
                {isLogin ? "Aceda ao seu painel de cuidador." : "Registe-se para começar a sua jornada."}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm font-bold border border-red-100">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">E-mail Profissional</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                  placeholder="exemplo@vitalidade.com"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Palavra-passe</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                  placeholder="••••••••"
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? "A processar..." : isLogin ? "Entrar no Sistema" : "Solicitar Registo"}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col items-center text-center">
              <button 
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
                className="text-slate-400 font-bold hover:text-blue-600 transition-colors text-sm"
              >
                {isLogin ? "Não tem conta? Registe-se agora" : "Já possui conta? Inicie sessão"}
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-slate-400 text-xs font-bold uppercase tracking-tighter">
            Vitalidade Senior AI • Powered by Gemini & Firebase
          </p>
        </div>
      </div>
    </div>
  );
}