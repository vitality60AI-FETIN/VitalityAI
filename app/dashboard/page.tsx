"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase"; // <-- Importamos o db
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore"; // <-- Importamos as funções de busca

// Criamos uma tipagem rápida para o TypeScript não reclamar
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

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserName(user.email?.split("@")[0] || "Cuidador");
        
        // BUSCA NO FIREBASE: Pega apenas os pacientes deste cuidador
        try {
          const q = query(
            collection(db, "Pacientes"), 
            where("cuidadorId", "==", user.uid)
          );
          
          const querySnapshot = await getDocs(q);
          const listaPacientes: Paciente[] = [];
          
          querySnapshot.forEach((doc) => {
            // Empurra cada paciente encontrado para a nossa lista
            listaPacientes.push({ id: doc.id, ...doc.data() } as Paciente);
          });
          
          setPacientes(listaPacientes);
        } catch (error) {
          console.error("Erro ao buscar pacientes:", error);
        } finally {
          setLoading(false);
        }

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
      
      {/* NAVBAR */}
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
            <button 
              onClick={irParaCadastroPaciente}
              className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-bold rounded-full hover:bg-blue-100 transition-colors hidden sm:block"
            >
              + Novo Paciente
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">Olá, {userName}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center text-blue-700 font-bold uppercase">
              {userName.charAt(0)}
            </div>
            <button onClick={handleLogout} className="ml-2 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              Sair
            </button>
          </div>
        </div>
      </nav>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 flex justify-between items-end">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 mb-2">
              Meus Pacientes
            </h1>
            <p className="text-slate-500 text-lg">
              Acompanhe a rotina, segurança e saúde dos idosos sob seus cuidados.
            </p>
          </div>
          
          {/* Botão mobile de adicionar */}
          <button 
            onClick={irParaCadastroPaciente}
            className="sm:hidden w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-200"
          >
            +
          </button>
        </header>

        {pacientes.length === 0 ? (
          /* EMPTY STATE */
          <div className="animate-in fade-in zoom-in-95 duration-700 delay-150">
            <button onClick={irParaCadastroPaciente} className="group w-full md:w-2/3 lg:w-1/2 mx-auto flex flex-col items-center justify-center p-12 md:p-20 bg-white border-2 border-dashed border-slate-300 rounded-[2.5rem] hover:border-blue-500 hover:bg-blue-50/50 transition-all duration-300">
              <div className="w-20 h-20 mb-6 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-100 transition-transform">
                <span className="text-4xl text-slate-400 group-hover:text-blue-600">+</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-blue-700">Adicionar Primeiro Paciente</h3>
            </button>
          </div>
        ) : (
          /* CARDS DOS PACIENTES */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pacientes.map((paciente) => (
              <div 
                key={paciente.id} 
                onClick={() => router.push(`/pacientes/${paciente.id}`)}
                className="group bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all duration-300 cursor-pointer hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 rounded-2xl flex items-center justify-center font-black text-2xl group-hover:scale-110 transition-transform duration-300">
                    {paciente.nome.charAt(0)}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${paciente.statusSeguranca === 'Verde' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {paciente.statusSeguranca === 'Verde' ? '🟢 Seguro' : '🔴 Alerta'}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                  {paciente.nome}
                </h3>
                <p className="text-slate-500 text-sm font-medium mb-6">
                  {paciente.idade} anos • Plano Ativo
                </p>
                
                <div className="w-full py-3 bg-slate-50 text-slate-600 font-bold rounded-xl text-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  Abrir Painel IA →
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}