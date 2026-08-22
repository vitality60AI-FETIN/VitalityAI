"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Save,
  Loader2,
  Sparkles,
  Calendar,
  CreditCard,
  Stethoscope,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import FotoUpload from "../components/FotoUpload";
import { auth, db } from "../../lib/firebase";
import { useInstitucaoId, useCuidadorData } from "../../lib/hooks";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, getDoc } from "firebase/firestore";

const TIPOS_CUIDADOR = [
  "Profissional",
  "Enfermeiro(a)",
  "Médico(a)",
  "Fisioterapeuta",
  "Nutricionista",
  "Terapeuta Ocupacional",
  "Cuidador(a) de Idosos",
  "Familiar",
  "Outro",
];

export default function PerfilPage() {
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);

  // Campos do Perfil
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [tipoCuidador, setTipoCuidador] = useState("Profissional");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");

  // Dados da Instituição para o card informativo
  const [nomeInstituicao, setNomeInstituicao] = useState("");

  // Toast
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const router = useRouter();
  const { instituicaoId, role, loading: loadingInstituicao } = useInstitucaoId();
  const { cuidador, loading: loadingCuidador } = useCuidadorData();

  // Autenticação & Carga Inicial
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      if (loadingInstituicao || loadingCuidador) return;

      if (!instituicaoId) {
        router.push("/onboarding");
        return;
      }

      if (cuidador) {
        setNomeCompleto(cuidador.nomeCompleto || cuidador.nome || "");
        setFotoUrl(cuidador.fotoUrl || "");
        setWhatsapp(cuidador.whatsapp || "");
        setTipoCuidador(cuidador.tipoCuidador || "Profissional");
        setCpf(cuidador.cpf || "");
        setDataNascimento(cuidador.dataNascimento || "");
      }

      // Buscar nome da instituição
      try {
        const instRef = doc(db, "Instituicoes", instituicaoId);
        const instSnap = await getDoc(instRef);
        if (instSnap.exists()) {
          setNomeInstituicao(instSnap.data().nome || instituicaoId);
        } else {
          setNomeInstituicao(instituicaoId);
        }
      } catch (err) {
        console.error("Erro ao buscar nome da instituição:", err);
      } finally {
        setLoadingPage(false);
      }
    });

    return () => unsubscribeAuth();
  }, [router, instituicaoId, loadingInstituicao, loadingCuidador, cuidador]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Salvar Alterações do Perfil
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    setSaving(true);
    try {
      const cuidadorRef = doc(db, "Cuidadores", user.uid);
      await updateDoc(cuidadorRef, {
        nomeCompleto,
        fotoUrl,
        whatsapp,
        tipoCuidador,
        cpf,
        dataNascimento,
      });

      setToast({
        message: "Perfil atualizado com sucesso!",
        variant: "success",
      });
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      setToast({
        message: "Falha ao salvar as alterações. Tente novamente.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loadingPage || loadingInstituicao || loadingCuidador) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-600" />
          <p className="text-sm font-semibold text-slate-500">Carregando Perfil...</p>
        </div>
      </div>
    );
  }

  const currentUser = auth.currentUser;

  return (
    <DashboardLayout>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-2xl backdrop-blur-md ${
              toast.variant === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-100 font-bold"
                : "border-red-200 bg-red-50 text-red-800 shadow-red-100 font-bold"
            }`}
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <p className="text-sm">{toast.message}</p>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-4xl px-4 md:px-6 py-6 md:py-10 space-y-8">
        {/* Cabeçalho da Página */}
        <header className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700">
              <User className="h-3.5 w-3.5" />
              Sua Conta
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">
            Meu Perfil & Configurações
          </h1>
          <p className="mt-2 text-slate-500 text-sm md:text-base">
            Personalize seus dados de identificação profissional, foto e contatos. O acesso é autenticado via Conta Google.
          </p>
        </header>

        {/* DADOS DO PERFIL */}
        <form onSubmit={handleSaveProfile} className="space-y-8">
          {/* SEÇÃO 1: FOTO & IDENTIFICAÇÃO BÁSICA */}
          <section className="rounded-[2.5rem] border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Foto & Identificação Profissional
            </h2>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Upload de Foto */}
              <div className="shrink-0 flex flex-col items-center">
                <FotoUpload
                  currentUrl={fotoUrl}
                  onUpload={(url) => setFotoUrl(url)}
                  size={120}
                  label="Sua Foto"
                  fallbackName={nomeCompleto || currentUser?.email || "Cuidador"}
                />
              </div>

              {/* Formulário Nome + Especialidade */}
              <div className="flex-1 w-full space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Nome Completo
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-4 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={nomeCompleto}
                      onChange={(e) => setNomeCompleto(e.target.value)}
                      placeholder="Seu nome completo"
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Atuação / Profissão
                  </label>
                  <div className="relative flex items-center">
                    <Stethoscope className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
                    <select
                      value={tipoCuidador}
                      onChange={(e) => setTipoCuidador(e.target.value)}
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                    >
                      {TIPOS_CUIDADOR.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {tipo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: DADOS DE CONTATO & CADASTRO */}
          <section className="rounded-[2.5rem] border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <Phone className="h-5 w-5 text-blue-600" />
              Contato & Dados de Cadastro
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  WhatsApp / Celular
                </label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-4 h-5 w-5 text-slate-400" />
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Data de Nascimento */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Data de Nascimento
                </label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-4 h-5 w-5 text-slate-400" />
                  <input
                    type="date"
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* CPF */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  CPF
                </label>
                <div className="relative flex items-center">
                  <CreditCard className="absolute left-4 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* E-mail (Conectado via Google) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  E-mail de Acesso (Google)
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    disabled
                    value={currentUser?.email || ""}
                    className="w-full rounded-2xl border-2 border-slate-200/60 bg-slate-100/70 pl-12 pr-4 py-3 text-sm font-bold text-slate-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 ml-1 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Autenticação segura via Conta Google (OAuth)
                </p>
              </div>
            </div>
          </section>

          {/* SEÇÃO 3: CARD INSTITUIÇÃO & INFORMAÇÕES */}
          <section className="rounded-[2.5rem] border border-blue-100 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-blue-950">Instituição Ativa</h3>
                <p className="text-xs text-blue-700 font-medium">Sua conta está associada a:</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/90 p-5 border border-blue-100/80 shadow-xs space-y-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Nome da Instituição</p>
                <p className="text-base font-black text-slate-900">{nomeInstituicao || "Instituição Vitalidade"}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Nível de Acesso</p>
                  <span className="inline-block mt-0.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-700">
                    {role === "Admin" ? "Administrador" : "Cuidador"}
                  </span>
                </div>
                <Shield className="h-7 w-7 text-blue-500 opacity-80" />
              </div>
            </div>
          </section>

          {/* BOTÃO DE SALVAR DADOS DO PERFIL */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all min-h-[44px]"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 text-sm font-black shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 min-h-[44px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Dados do Perfil
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </DashboardLayout>
  );
}
