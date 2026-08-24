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
            <p className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-blue-50/90 px-3.5 py-1 text-xs font-black uppercase tracking-[0.2em] text-blue-700 border border-blue-200/50 shadow-2xs">
              <FileText className="h-3.5 w-3.5" />
              Índice de Prontuários
            </p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-4xl">
              Prontuário Digital Assistencial
            </h1>
            <p className="mt-2 text-sm md:text-base text-slate-500 max-w-2xl">
              Selecione um residente para visualizar e gerenciar seu prontuário clínico e histórico de saúde.
            </p>
          </div>
        </header>

        {/* Campo de Busca Apple Glass */}
        <div className="mb-8">
          <div className="group relative flex items-center rounded-2xl md:rounded-[2rem] border border-slate-200/90 bg-white/90 backdrop-blur-xl p-2 shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100/50 transition-all">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition-colors">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="Buscar residente pelo nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent px-4 py-3 text-base font-bold text-slate-800 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        {pacientesFiltrados.length === 0 ? (
          <div className="apple-card flex flex-col items-center justify-center rounded-[3rem] p-12 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-blue-50 text-blue-600 shadow-inner">
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
                className="mt-8 apple-button group flex items-center gap-3 rounded-full bg-blue-600 px-8 py-4 text-sm font-black text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700"
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
                className="apple-card group relative flex w-full flex-col overflow-hidden rounded-3xl md:rounded-[2.5rem] p-5 md:p-6 text-left apple-button cursor-pointer min-h-[44px]"
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-50 text-2xl font-black text-blue-700 shadow-sm border border-blue-100 transition-all duration-300 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white">
                    {paciente.fotoUrl ? (
                      <img src={paciente.fotoUrl} alt={`Foto de ${paciente.nome}`} className="h-full w-full object-cover" />
                    ) : (
                      paciente.nome.charAt(0)
                    )}
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusColor(
                      paciente.statusSeguranca
                    )}`}
                  >
                    {paciente.statusSeguranca === "Verde"
                      ? "Estável"
                      : paciente.statusSeguranca === "Amarelo"
                        ? "Atenção"
                        : "Alerta Crítico"}
                  </span>
                </div>

                <div className="relative z-10 mb-6">
                  <h3 className="text-xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-blue-600">
                    {paciente.nome}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {paciente.idade} anos
                  </p>
                </div>

                <div className="relative z-10 mt-auto flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-5 py-3.5 transition-all duration-300 group-hover:border-blue-200 group-hover:bg-blue-50/70">
                  <span className="text-xs font-black text-slate-700 transition-colors group-hover:text-blue-700">Acessar Prontuário</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-400 shadow-2xs transition-all duration-300 group-hover:bg-blue-600 group-hover:text-white group-hover:translate-x-1">
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
