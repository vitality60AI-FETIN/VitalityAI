"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Users, KeyRound, CheckCircle2, Copy, FileText } from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { useInstitucaoId } from "../../lib/hooks";

/** Gera um código de convite curto de 6 caracteres alfanuméricos */
function gerarCodigoConvite(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

interface Membro {
  id: string;
  nomeCompleto: string;
  email: string;
  role: string;
  tipoCuidador: string;
}

interface Paciente {
  id: string;
  nome: string;
  idade: string;
  statusSeguranca: string;
}

export default function EquipePage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Admin");
  const [membros, setMembros] = useState<Membro[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [instituicaoNome, setInstituicaoNome] = useState<string>("");
  const [codigoConvite, setCodigoConvite] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { instituicaoId, role, loading: loadingInstituicao } = useInstitucaoId();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserName(user.email?.split("@")[0] || "Admin");

      if (loadingInstituicao) return;
      if (!instituicaoId) {
        router.push("/onboarding");
        return;
      }

      // Proteger a rota: Apenas admins podem acessar
      if (role && role !== "Admin") {
        router.push("/dashboard");
        return;
      }

      try {
        // Buscar o nome da instituição para o código de convite
        const instRef = doc(db, "Instituicoes", instituicaoId);
        const instSnap = await getDoc(instRef);
        if (instSnap.exists()) {
          const instData = instSnap.data();
          setInstituicaoNome(instData.nome || instituicaoId);

          // Migração automática: se não tem codigoConvite, gera um
          if (instData.codigoConvite) {
            setCodigoConvite(instData.codigoConvite);
          } else {
            const novoCodigo = gerarCodigoConvite();
            await updateDoc(instRef, { codigoConvite: novoCodigo });
            setCodigoConvite(novoCodigo);
          }
        }

        // Buscar todos os cuidadores/admins desta instituição
        const qMembros = query(
          collection(db, "Cuidadores"),
          where("instituicaoId", "==", instituicaoId)
        );
        const snapMembros = await getDocs(qMembros);
        const listaMembros: Membro[] = [];

        snapMembros.forEach((docSnap) => {
          listaMembros.push({ id: docSnap.id, ...docSnap.data() } as Membro);
        });

        setMembros(listaMembros);

        // Buscar todos os pacientes desta instituição
        const qPacientes = query(
          collection(db, "Pacientes"),
          where("instituicaoId", "==", instituicaoId)
        );
        const snapPacientes = await getDocs(qPacientes);
        const listaPacientes: Paciente[] = [];

        snapPacientes.forEach((docSnap) => {
          listaPacientes.push({ id: docSnap.id, ...docSnap.data() } as Paciente);
        });

        setPacientes(listaPacientes);
      } catch (err) {
        console.error("Erro ao carregar equipe:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [router, instituicaoId, role, loadingInstituicao]);

  const handleRoleChange = async (membroId: string, novoRole: string) => {
    try {
      // Atualizar o Firestore
      await updateDoc(doc(db, "Cuidadores", membroId), {
        role: novoRole
      });

      // Atualizar o estado local
      setMembros(current => 
        current.map(m => m.id === membroId ? { ...m, role: novoRole } : m)
      );
    } catch (err) {
      console.error("Erro ao atualizar papel:", err);
      alert("Não foi possível atualizar as permissões do usuário.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(codigoConvite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
      </div>
    );
  }

  // ITENS DO MENU
  const menuItems = [
    { name: "Painel Geral", path: "/dashboard", icon: "📊" },
    { name: "Prontuários", path: "/pacientes", icon: "🗂️" },
    { name: "Log de Rotina", path: "/rotina", icon: "📝" },
    { name: "Insights IA", path: "/insights", icon: "🧠" },
    ...(role === "Admin" ? [{ name: "Equipe", path: "/equipe", icon: "👥" }] : []),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      
      {/* 1. SIDEBAR CONFIGURATION */}
      <aside className="hidden w-64 flex-col justify-between border-r border-slate-200 bg-white shadow-sm z-10 md:flex">
        <div>
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 font-black text-white shadow-md shadow-blue-200">
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
                    isActive ? "bg-blue-50 font-bold text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
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
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold uppercase text-blue-700">
              {userName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-bold text-slate-800">{userName}</p>
              <p className="text-xs text-slate-400">Administrador</p>
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

      {/* 2. MAIN CONTENT AREA */}
      <div className="relative flex-1 flex-col overflow-y-auto">
        <main className="mx-auto w-full max-w-5xl px-6 py-10">
          <header className="mb-10 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                <Users className="h-3.5 w-3.5" />
                Gestão da Instituição
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-800 md:text-4xl">Equipe</h1>
              <p className="mt-2 max-w-2xl text-lg text-slate-500">
                Gerencie os cuidadores e profissionais de saúde da sua instituição.
              </p>
            </div>
          </header>

          <div className="flex flex-col gap-6">
            
            {/* Invite Section */}
            <section className="rounded-[2rem] border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-black tracking-tight text-blue-950 flex items-center gap-2">
                    <KeyRound className="h-6 w-6 text-blue-600" />
                    Código de Convite
                  </h3>
                  <p className="text-sm text-blue-700/80 mt-1 max-w-md">
                    Compartilhe este código com os novos cuidadores. Eles deverão informá-lo na etapa "Entrar em Instituição" durante o cadastro.
                  </p>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-blue-100 shadow-sm self-start md:self-center">
                  <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-800 tracking-[0.3em] font-mono text-lg">{codigoConvite}</span>
                  </div>
                  <button 
                    onClick={copiarCodigo}
                    className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
                  >
                    {copied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            </section>

            {/* Team List Section */}
            <section className="mt-4">
              <h3 className="text-xl font-black tracking-tight text-slate-800 mb-6 flex items-center gap-2">
                <Users className="h-6 w-6 text-slate-400" />
                Membros da Instituição ({membros.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {membros.map((membro) => (
                  <div key={membro.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-500">
                      {membro.nomeCompleto?.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-900 truncate">{membro.nomeCompleto || "Sem Nome"}</p>
                      <p className="text-sm text-slate-500 truncate">{membro.email}</p>
                    </div>
                    <div>
                      {membro.id === auth.currentUser?.uid ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          membro.role === "Admin" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {membro.role === "Admin" ? "Admin" : "Cuidador"} (Você)
                        </span>
                      ) : (
                        <select
                          value={membro.role}
                          onChange={(e) => {
                            if (window.confirm(`Tem certeza que deseja alterar o papel para ${e.target.value}?`)) {
                              handleRoleChange(membro.id, e.target.value);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer outline-none border transition-colors shadow-sm ${
                            membro.role === "Admin" 
                              ? "bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                          }`}
                        >
                          <option value="Cuidador" className="bg-white text-slate-700">Cuidador</option>
                          <option value="Admin" className="bg-white text-slate-700">Admin</option>
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Patients List Section */}
            <section className="mt-4">
              <h3 className="text-xl font-black tracking-tight text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="h-6 w-6 text-slate-400" />
                Pacientes da Instituição ({pacientes.length})
              </h3>

              {pacientes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                  <p className="text-slate-500 font-medium">Nenhum paciente cadastrado nesta instituição ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pacientes.map((paciente) => (
                    <div key={paciente.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-xl font-black text-blue-700">
                          {paciente.nome?.charAt(0) || "P"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-slate-900 truncate">{paciente.nome}</p>
                          <p className="text-sm text-slate-500 truncate">{paciente.idade} anos</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                          paciente.statusSeguranca === "Verde" ? "bg-emerald-50 text-emerald-700" :
                          paciente.statusSeguranca === "Amarelo" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                        }`}>
                          {paciente.statusSeguranca === "Verde" ? "Seguro" : 
                           paciente.statusSeguranca === "Amarelo" ? "Atenção" : "Alerta"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
