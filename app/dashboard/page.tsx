"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function DashboardLobby() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Cuidador");
  
  // Simulando que inicialmente o cuidador tem 0 pacientes
  const [pacientes, setPacientes] = useState([]); 

  const router = useRouter();

  // Proteção de Rota: Só entra se estiver logado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Se quisermos, depois puxamos o nome real dele do Firestore aqui
        setUserName(user.email?.split("@")[0] || "Cuidador");
        setLoading(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const irParaCadastroPaciente = () => {
    // Rota que vamos criar a seguir!
    router.push("/pacientes/novo"); 
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* NAVBAR RESPONSIVA & GLASSMORPHISM */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-200 hover:rotate-12 transition-transform cursor-pointer">
              V
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800 hidden sm:block">
              Vitality AI
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">Olá, {userName}</p>
              <p className="text-xs text-slate-400 font-medium">Painel de Controle</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-700 font-bold uppercase">
              {userName.charAt(0)}
            </div>
            <button 
              onClick={handleLogout}
              className="ml-2 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Sair"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* CONTEÚDO PRINCIPAL (ANIMADO) */}
      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 mb-2">
            Meus Pacientes
          </h1>
          <p className="text-slate-500 text-lg">
            Acompanhe a rotina, segurança e saúde dos idosos sob seus cuidados.
          </p>
        </header>

        {/* ÁREA DE PACIENTES */}
        {pacientes.length === 0 ? (
          
          /* EMPTY STATE - ESTADO VAZIO (Quando não tem pacientes) */
          <div className="animate-in fade-in zoom-in-95 duration-700 delay-150">
            <button 
              onClick={irParaCadastroPaciente}
              className="group w-full md:w-2/3 lg:w-1/2 mx-auto flex flex-col items-center justify-center p-12 md:p-20 bg-white border-2 border-dashed border-slate-300 rounded-[2.5rem] hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-300"
            >
              <div className="w-20 h-20 mb-6 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-100 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-slate-400 group-hover:text-blue-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">
                Adicionar Primeiro Paciente
              </h3>
              <p className="text-slate-500 text-center max-w-sm">
                Inicie a Anamnese Digital e permita que o Vitality AI crie um plano hiper-personalizado.
              </p>
            </button>
          </div>

        ) : (
          /* AQUI ENTRARÃO OS CARDS DOS PACIENTES DEPOIS (Quando tiver dados no banco) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Cards vão aqui... */}
          </div>
        )}
      </main>

    </div>
  );
}