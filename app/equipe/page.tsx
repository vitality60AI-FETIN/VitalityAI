"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, KeyRound, CheckCircle2, Copy, FileText, Building2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { useInstitucaoId, useInstitucaoData } from "../../lib/hooks";
import { normalizeLogRecords } from "../../lib/logNormalizer";
import { enriquecerPacientesComStatus } from "../../lib/statusSeguranca";

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
  fotoUrl?: string;
}

interface Paciente {
  id: string;
  nome: string;
  idade: string;
  fotoUrl?: string;
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
  const { instituicaoId, role, loading: loadingInstituicao } = useInstitucaoId();
  const { instituicao } = useInstitucaoData();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

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

  return (
    <DashboardLayout>
        <main className="mx-auto w-full max-w-5xl">
          <header className="mb-6 md:mb-10 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {instituicao?.logotipoUrl ? (
                    <div className="h-9 w-9 rounded-xl overflow-hidden bg-white border border-slate-200 shadow-xs shrink-0">
                      <img src={instituicao.logotipoUrl} alt={instituicao.nome} className="h-full w-full object-cover" />
                    </div>
                  ) : null}
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                    <Users className="h-3.5 w-3.5" />
                    {instituicao?.nome || instituicaoNome || "Gestão da Instituição"}
                  </span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-4xl">Equipe Assistencial</h1>
                <p className="mt-2 max-w-2xl text-sm md:text-lg text-slate-500">
                  Gerencie os cuidadores e profissionais de saúde vinculados à sua unidade.
                </p>
              </div>
            </div>
          </header>

          <div className="flex flex-col gap-6">
            
            {/* Invite Section */}
            <section className="relative overflow-hidden rounded-3xl md:rounded-[2.5rem] border border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 p-5 md:p-8 shadow-sm shadow-blue-100/50 transition-all hover:border-blue-200 hover:shadow-md hover:shadow-blue-900/5">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-blue-950 flex items-center gap-3">
                    <KeyRound className="h-7 w-7 text-blue-600" />
                    Código de Convite
                  </h3>
                  <p className="text-base text-blue-700/80 mt-2 max-w-lg leading-relaxed">
                    Compartilhe este código com os novos cuidadores. Eles deverão informá-lo na etapa "Entrar em Instituição" durante o cadastro.
                  </p>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-2.5 rounded-[1.5rem] border border-blue-100 shadow-sm self-start md:self-center transition-all hover:shadow-md hover:border-blue-200">
                  <div className="px-5 py-3 bg-slate-50/80 rounded-[1.25rem] border border-slate-100/80">
                    <span className="font-black text-slate-800 tracking-[0.3em] font-mono text-xl">{codigoConvite}</span>
                  </div>
                  <button 
                    onClick={copiarCodigo}
                    className="group flex items-center gap-2 px-5 py-3.5 min-h-[44px] bg-blue-600 text-white font-bold rounded-[1.25rem] hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 transition-all hover:-translate-y-0.5 ios-press"
                  >
                    {copied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5 transition-transform group-hover:scale-110" />}
                    {copied ? "Copiado!" : "Copiar Código"}
                  </button>
                </div>
              </div>
            </section>

            {/* Team List Section */}
            <section className="mt-6">
              <h3 className="text-xl font-black tracking-tight text-slate-800 mb-6 flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-500" />
                Membros da Instituição ({membros.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                {membros.map((membro) => (
                  <div key={membro.id} className="group rounded-2xl md:rounded-[2rem] border border-slate-200/80 bg-white p-4 md:p-5 shadow-sm shadow-slate-100/50 flex items-center gap-4 md:gap-5 transition-all duration-300 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 ios-press">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-slate-50 text-xl font-black text-slate-500 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      {membro.fotoUrl ? (
                        <img src={membro.fotoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        membro.nomeCompleto?.charAt(0) || "U"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-900 truncate transition-colors group-hover:text-blue-700">{membro.nomeCompleto || "Sem Nome"}</p>
                      <p className="text-sm font-medium text-slate-500 truncate mt-0.5">{membro.email}</p>
                    </div>
                    <div>
                      {membro.id === auth.currentUser?.uid ? (
                        <span className={`px-4 py-2 rounded-2xl text-[11px] uppercase tracking-wider font-black ${
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
                          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer outline-none border-2 transition-all shadow-sm hover:shadow-md ${
                            membro.role === "Admin" 
                              ? "bg-purple-50/50 text-purple-700 border-purple-200 hover:border-purple-300 focus:border-purple-400 focus:ring-4 focus:ring-purple-100/50" 
                              : "bg-emerald-50/50 text-emerald-700 border-emerald-200 hover:border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/50"
                          }`}
                        >
                          <option value="Cuidador" className="bg-white text-slate-700 font-bold uppercase">Cuidador</option>
                          <option value="Admin" className="bg-white text-slate-700 font-bold uppercase">Admin</option>
                        </select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Patients List Section */}
            <section className="mt-8 mb-8">
              <h3 className="text-xl font-black tracking-tight text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="h-6 w-6 text-indigo-500" />
                Pacientes da Instituição ({pacientes.length})
              </h3>

              {pacientes.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                  <p className="text-slate-500 font-medium text-lg">Nenhum paciente cadastrado nesta instituição ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                  {pacientes.map((paciente) => (
                    <div key={paciente.id} className="group rounded-2xl md:rounded-[2rem] border border-slate-200/80 bg-white p-4 md:p-5 shadow-sm shadow-slate-100/50 flex items-center justify-between gap-4 transition-all duration-300 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-900/5 hover:-translate-y-1 ios-press">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-slate-50 text-xl font-black text-slate-500 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                          {paciente.fotoUrl ? (
                            <img src={paciente.fotoUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            paciente.nome?.charAt(0) || "P"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-slate-900 truncate transition-colors group-hover:text-indigo-700">{paciente.nome}</p>
                          <p className="text-sm font-medium text-slate-500 truncate mt-0.5">{paciente.idade} anos</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className={`px-4 py-2 rounded-2xl text-[10px] uppercase tracking-wider font-black border ${
                          paciente.statusSeguranca === "Verde" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          paciente.statusSeguranca === "Amarelo" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-red-50 text-red-700 border-red-100"
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
    </DashboardLayout>
  );
}
