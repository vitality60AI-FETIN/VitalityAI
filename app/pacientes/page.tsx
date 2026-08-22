"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, LogOut, FileText, ArrowRight, UserPlus } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { auth, db } from "../../lib/firebase";
import { useInstitucaoId, useCuidadorData } from "../../lib/hooks";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { normalizeLogRecords } from "../../lib/logNormalizer";
import { enriquecerPacientesComStatus } from "../../lib/statusSeguranca";

interface Paciente {
  id: string;
  nome: string;
  idade: string;
  fotoUrl?: string;
  statusSeguranca: string;
}

export default function ProntuariosPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Cuidador");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const router = useRouter();
  const { instituicaoId, role, loading: loadingInstituicao } = useInstitucaoId();
  const { cuidador, loading: loadingCuidador } = useCuidadorData();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserName(user.email?.split("@")[0] || "Cuidador");
      
      // Ainda carregando instituicaoId ou dados do cuidador
      if (loadingInstituicao || loadingCuidador) {
        return;
      }

      // Novo usuário que ainda não completou onboarding
      if (!instituicaoId) {
        router.push("/onboarding");
        return;
      }

      try {
        // Mostrar todos os pacientes da instituição (mesmo comportamento do dashboard/rotina)
        const q = query(
          collection(db, "Pacientes"),
          where("instituicaoId", "==", instituicaoId)
        );
        const querySnapshot = await getDocs(q);
        const listaPacientes: Paciente[] = [];

        querySnapshot.forEach((doc) => {
          listaPacientes.push({ id: doc.id, ...doc.data() } as Paciente);
        });

        // Buscar logs para derivar statusSeguranca vivo
        const qLogs = query(
          collection(db, "LogsRotina"),
          where("instituicaoId", "==", instituicaoId)
        );
        const snapLogs = await getDocs(qLogs);
        const logsList = normalizeLogRecords(
          snapLogs.docs.map((d) => ({ id: d.id, ...d.data() }))
        );

        const pacientesComStatus = enriquecerPacientesComStatus(listaPacientes, logsList);
        setPacientes(pacientesComStatus);
      } catch (error) {
        console.error("Erro ao buscar pacientes:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, instituicaoId, loadingInstituicao]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const irParaCadastroPaciente = () => {
    router.push("/pacientes/novo");
  };

  const abrirProntuario = (pacienteId: string) => {
    router.push(`/pacientes/${pacienteId}`);
  };

  const pacientesFiltrados = pacientes.filter((paciente) =>
    paciente.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    if (status === "Verde") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (status === "Amarelo") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-red-50 text-red-700 border-red-200";
  };

  return (
    <DashboardLayout>
        <main className="mx-auto w-full max-w-7xl">
          <header className="mb-6 md:mb-10 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                <FileText className="h-3.5 w-3.5" />
                Índice de Prontuários
              </p>
              <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-4xl">
                Prontuários Digital
              </h1>
              <p className="mt-2 text-sm md:text-lg text-slate-500">
                Selecione um residente para abrir seu prontuário completo
              </p>
            </div>
          </header>

          <div className="mb-10">
            <div className="group relative flex items-center rounded-2xl md:rounded-[2rem] border border-slate-200 bg-white p-2 shadow-sm shadow-slate-100 transition-all focus-within:border-blue-400 focus-within:shadow-md focus-within:shadow-blue-100/50 hover:border-blue-200">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.5rem] bg-slate-50 text-slate-400 transition-colors group-focus-within:bg-blue-50 group-focus-within:text-blue-600">
                <Search className="h-5 w-5" />
              </div>
              <input
                type="text"
                placeholder="Buscar residente pelo nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent px-4 py-3 text-base font-medium text-slate-800 placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          {pacientesFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[3rem] border border-dashed border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-slate-50 text-slate-400 shadow-inner">
                <Search className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                Nenhum prontuário encontrado
              </h2>
              <p className="mt-3 max-w-md text-base text-slate-500 leading-relaxed">
                {pacientes.length === 0
                  ? "Sua instituição ainda não possui residentes cadastrados. Inicie cadastrando o primeiro."
                  : "Não encontramos nenhum residente correspondente à sua busca. Tente outro termo."}
              </p>
              {pacientes.length === 0 && (
                <button
                  onClick={irParaCadastroPaciente}
                  className="mt-8 group flex items-center gap-3 rounded-full bg-blue-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-1 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30"
                >
                  <UserPlus className="h-5 w-5" />
                  Cadastrar Primeiro Residente
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pacientesFiltrados.map((paciente) => (
                <button
                  key={paciente.id}
                  onClick={() => abrirProntuario(paciente.id)}
                  className="group relative flex w-full flex-col overflow-hidden rounded-3xl md:rounded-[2.5rem] border border-slate-200/80 bg-white p-5 md:p-6 shadow-sm shadow-slate-200/30 transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 text-left ios-press min-h-[44px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
                  
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-slate-50 text-2xl font-black text-slate-500 shadow-sm shadow-slate-200/50 transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-blue-200">
                      {paciente.fotoUrl ? (
                        <img src={paciente.fotoUrl} alt={`Foto de ${paciente.nome}`} className="h-full w-full object-cover" />
                      ) : (
                        paciente.nome.charAt(0)
                      )}
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${getStatusColor(
                        paciente.statusSeguranca
                      )}`}
                    >
                      {paciente.statusSeguranca === "Verde"
                        ? "Seguro"
                        : paciente.statusSeguranca === "Amarelo"
                          ? "Atenção"
                          : "Alerta"}
                    </span>
                  </div>

                  <div className="relative z-10 mb-6">
                    <h3 className="text-xl font-black tracking-tight text-slate-800 transition-colors group-hover:text-blue-700">
                      {paciente.nome}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {paciente.idade} anos
                    </p>
                  </div>

                  <div className="relative z-10 mt-auto flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4 transition-colors duration-300 group-hover:border-blue-100 group-hover:bg-white">
                    <span className="text-sm font-bold text-slate-600 transition-colors group-hover:text-blue-700">Acessar Prontuário</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition-all duration-300 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:translate-x-1">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
    </DashboardLayout>
  );
}
