"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Verifica se o cuidador já completou o onboarding
      const cuidadorRef = doc(db, "Cuidadores", user.uid);
      const cuidadorSnap = await getDoc(cuidadorRef);

      if (cuidadorSnap.exists()) {
        // Já está cadastrado → Dashboard
        router.push("/dashboard");
      } else {
        // Primeira vez → Onboarding
        router.push("/onboarding");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Login cancelado. Tente novamente.");
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setError("Esta conta já está vinculada a outro método de login.");
      } else {
        setError("Ocorreu um erro ao entrar com o Google. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#fdfdfd] overflow-hidden">
      
      {/* LADO ESQUERDO: APRESENTAÇÃO (ESTILO ENTERPRISE) */}
      <div className="relative flex w-full lg:w-3/5 flex-col justify-center p-12 lg:p-24 bg-gradient-to-br from-blue-700 to-blue-900 text-white">
        
        {/* Elementos Visuais de Fundo */}
        <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-[-5%] right-[5%] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-xl animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="flex items-center gap-3 mb-10 cursor-default">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white shadow-xl">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5l7 14 7-14" /></svg>
            </div>
            <span className="text-2xl font-semibold tracking-tight">Vitalidade Senior <span className="text-blue-300 text-lg font-black italic">AI</span></span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.1] mb-8 tracking-tight">
            Longevidade na <br /> 
            <span className="text-blue-300">Palma da Mão.</span>
          </h1>

          <div className="space-y-6 mt-12">
            <div className="group flex items-start gap-5 p-5 rounded-3xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-default">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-200 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM12 10.5c-2.5 0-4.5 1.5-5.5 4l1 7 4.5-3 4.5 3 1-7c-1-2.5-3-4-5.5-4z" /></svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Cuidador Digital Personalizado</h3>
                <p className="text-blue-100/80 leading-[1.6]">O mentor que simplifica a rotina diária de cuidados físicos e mentais.</p>
              </div>
            </div>

            <div className="group flex items-start gap-5 p-5 rounded-3xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-default">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-200 shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-1">Rede de Segurança Ativa</h3>
                <p className="text-blue-100/80 leading-[1.6]">Segurança invisível que monitora inatividade e alerta a família em tempo real.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LADO DIREITO: LOGIN VIA GOOGLE */}
      <div className="flex w-full lg:w-2/5 flex-col items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
          
          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-10 relative overflow-hidden">
            
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
                Bem-vindo
              </h2>
              <p className="text-slate-600 font-normal">
                Acesse o painel do cuidador.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm font-semibold border border-red-100">
                ⚠️ {error}
              </div>
            )}

            {/* Botão Google Sign-In */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 p-4 rounded-2xl font-bold text-lg shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600" />
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {loading ? "Entrando..." : "Entrar com Google"}
            </button>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-slate-400 text-sm font-medium">
                Utilize sua conta Google institucional ou pessoal para acessar a plataforma.
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-slate-400 text-xs font-bold uppercase tracking-tighter">
            Vitalidade Senior AI • Powered by Gemini &amp; Firebase
          </p>
        </div>
      </div>
    </div>
  );
}