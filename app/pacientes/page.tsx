"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, LogOut, FileText } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { auth, db } from "../../lib/firebase";
import { useInstitucaoId, useCuidadorData } from "../../lib/hooks";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

interface Paciente {
  id: string;
  nome: string;
  idade: string;
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

        setPacientes(listaPacientes);
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
          <header className="mb-10 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                <FileText className="h-3.5 w-3.5" />
                Índice de Prontuários
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-800 md:text-4xl">
                Prontuários Digital
              </h1>
              <p className="mt-2 text-lg text-slate-500">
                Selecione um residente para abrir seu prontuário completo
              </p>
            </div>
          </header>

          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar residente pelo nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-medium placeholder-slate-400 outline-none transition-colors focus:border-blue-500"
              />
            </div>
          </div>

          {pacientesFiltrados.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <FileText className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
                Nenhum prontuário encontrado
              </h2>
              <p className="mt-2 text-slate-500">
                {pacientes.length === 0
                  ? "Nenhum residente cadastrado. Clique no botão ao lado para cadastrar um novo."
                  : "Nenhum prontuário corresponde à sua busca."}
              </p>
              {pacientes.length === 0 && (
                <button
                  onClick={irParaCadastroPaciente}
                  className="mt-6 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-200 transition-all hover:bg-blue-700"
                >
                  + Cadastrar Primeiro Residente
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pacientesFiltrados.map((paciente) => (
                <button
                  key={paciente.id}
                  onClick={() => abrirProntuario(paciente.id)}
                  className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-100 transition-all hover:shadow-xl hover:border-blue-200 hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-2xl font-black text-blue-700 group-hover:scale-110 transition-transform duration-300">
                        {paciente.nome.charAt(0)}
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusColor(
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

                    <h3 className="text-xl font-black tracking-tight text-slate-900 mb-1 group-hover:text-blue-600 transition-colors text-left">
                      {paciente.nome}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 text-left mb-5">
                      {paciente.idade} anos
                    </p>

                    <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FileText className="h-4 w-4" />
                      Abrir Prontuário
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
