"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Phone,
  MapPin,
  FileText,
  KeyRound,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Save,
  Loader2,
  Sparkles,
  Shield,
  RefreshCw,
  Info,
} from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import FotoUpload from "../components/FotoUpload";
import { auth, db } from "../../lib/firebase";
import { useInstitucaoId } from "../../lib/hooks";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

/** Gera um código de convite curto de 6 caracteres alfanuméricos */
function gerarCodigoConvite(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

export default function InstituicaoPage() {
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Campos da Instituição
  const [nome, setNome] = useState("");
  const [logotipoUrl, setLogotipoUrl] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidadeEstado, setCidadeEstado] = useState("");
  const [descricao, setDescricao] = useState("");
  const [codigoConvite, setCodigoConvite] = useState("");

  // Toast
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  const router = useRouter();
  const { instituicaoId, role, loading: loadingInstituicao } = useInstitucaoId();

  const isAdmin = role === "Admin";

  // Carga inicial dos dados da Instituição
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

      try {
        const instRef = doc(db, "Instituicoes", instituicaoId);
        const instSnap = await getDoc(instRef);

        if (instSnap.exists()) {
          const data = instSnap.data();
          setNome(data.nome || "");
          setLogotipoUrl(data.logotipoUrl || "");
          setCnpj(data.cnpj || "");
          setTelefone(data.telefone || "");
          setEndereco(data.endereco || "");
          setCidadeEstado(data.cidadeEstado || "");
          setDescricao(data.descricao || "");

          if (data.codigoConvite) {
            setCodigoConvite(data.codigoConvite);
          } else {
            // Se não tiver código de convite, gera um automaticamente
            const novoCod = gerarCodigoConvite();
            await updateDoc(instRef, { codigoConvite: novoCod });
            setCodigoConvite(novoCod);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar instituição:", err);
      } finally {
        setLoadingPage(false);
      }
    });

    return () => unsubscribeAuth();
  }, [router, instituicaoId, loadingInstituicao]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Salvar Alterações no Firestore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instituicaoId || !isAdmin) return;

    setSaving(true);
    try {
      const instRef = doc(db, "Instituicoes", instituicaoId);
      await updateDoc(instRef, {
        nome,
        logotipoUrl,
        cnpj,
        telefone,
        endereco,
        cidadeEstado,
        descricao,
      });

      setToast({
        message: "Dados da instituição atualizados com sucesso!",
        variant: "success",
      });
    } catch (err) {
      console.error("Erro ao salvar instituição:", err);
      setToast({
        message: "Falha ao salvar as alterações da instituição.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Copiar código de convite
  const handleCopyCode = () => {
    if (!codigoConvite) return;
    navigator.clipboard.writeText(codigoConvite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Gerar Novo Código de Convite
  const handleRegenerateCode = async () => {
    if (!instituicaoId || !isAdmin) return;

    if (
      !window.confirm(
        "Tem certeza que deseja gerar um novo código de convite? O código antigo deixará de funcionar."
      )
    ) {
      return;
    }

    try {
      const novoCod = gerarCodigoConvite();
      const instRef = doc(db, "Instituicoes", instituicaoId);
      await updateDoc(instRef, { codigoConvite: novoCod });
      setCodigoConvite(novoCod);
      setToast({
        message: "Novo código de convite gerado!",
        variant: "success",
      });
    } catch (err) {
      console.error("Erro ao gerar novo código:", err);
      setToast({
        message: "Erro ao gerar novo código de convite.",
        variant: "error",
      });
    }
  };

  if (loadingPage || loadingInstituicao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-600" />
          <p className="text-sm font-semibold text-slate-500">Carregando Dados da Instituição...</p>
        </div>
      </div>
    );
  }

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
              <Building2 className="h-3.5 w-3.5" />
              Gestão de Unidade
            </span>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-purple-700">
                <Shield className="h-3.5 w-3.5" />
                Modo Administrador
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                Modo Leitura
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-slate-900">
            Personalizar Instituição
          </h1>
          <p className="mt-2 text-slate-500 text-sm md:text-base">
            Gerencie o logotipo, endereço, contatos e o código de convite da sua unidade assistencial.
          </p>
        </header>

        {/* Alerta Modo Leitura se não for Admin */}
        {!isAdmin && (
          <div className="flex items-start gap-4 rounded-3xl border border-amber-200 bg-amber-50/80 p-5 text-amber-900 shadow-sm">
            <Info className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold">Acesso em Modo de Visualização</p>
              <p className="text-xs text-amber-700 mt-1">
                Apenas usuários com permissão de <strong>Administrador</strong> podem editar as informações e alterar o código de convite da instituição.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* SEÇÃO 1: LOGOTIPO & NOME DA INSTITUIÇÃO */}
          <section className="rounded-[2.5rem] border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Identificação & Logotipo
            </h2>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Upload de Logo */}
              <div className="shrink-0 flex flex-col items-center">
                <FotoUpload
                  currentUrl={logotipoUrl}
                  onUpload={(url) => isAdmin && setLogotipoUrl(url)}
                  size={120}
                  label="Logotipo"
                  fallbackName={nome || "Instituição"}
                />
              </div>

              {/* Formulário Nome + CNPJ */}
              <div className="flex-1 w-full space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Nome da Instituição / Unidade
                  </label>
                  <div className="relative flex items-center">
                    <Building2 className="absolute left-4 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      required
                      disabled={!isAdmin}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: ILPI Recanto Solar"
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    CNPJ / Registro Fiscal
                  </label>
                  <div className="relative flex items-center">
                    <FileText className="absolute left-4 h-5 w-5 text-slate-400" />
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      placeholder="00.000.000/0001-00"
                      className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEÇÃO 2: CONTATO & ENDEREÇO */}
          <section className="rounded-[2.5rem] border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm transition-all hover:shadow-md">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <MapPin className="h-5 w-5 text-blue-600" />
              Localização & Contato
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Telefone */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Telefone / WhatsApp de Contato
                </label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-4 h-5 w-5 text-slate-400" />
                  <input
                    type="tel"
                    disabled={!isAdmin}
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 3333-4444"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Cidade / Estado */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Cidade / Estado (UF)
                </label>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-4 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={cidadeEstado}
                    onChange={(e) => setCidadeEstado(e.target.value)}
                    placeholder="Ex: São Paulo / SP"
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 pl-12 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Endereço Completo */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Descrição / Foco */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  Descrição da Instituição / Foco de Atendimento (Opcional)
                </label>
                <textarea
                  disabled={!isAdmin}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  placeholder="Resumo da infraestrutura, especialidades assistenciais e atendimento..."
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50/50 p-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </section>

          {/* SEÇÃO 3: CÓDIGO DE CONVITE DA EQUIPE */}
          <section className="relative overflow-hidden rounded-[2.5rem] border border-blue-200/80 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-black tracking-tight text-blue-950 flex items-center gap-3">
                  <KeyRound className="h-6 w-6 text-blue-600" />
                  Código de Convite da Instituição
                </h3>
                <p className="text-sm text-blue-700/90 mt-2 max-w-lg leading-relaxed">
                  Novos cuidadores devem informar este código de 6 caracteres na etapa de entrada para se vincularem à sua unidade.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-3xl border border-blue-100 shadow-sm">
                <div className="px-5 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="font-black text-slate-900 tracking-[0.3em] font-mono text-2xl">
                    {codigoConvite || "------"}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all active:scale-95 min-h-[44px]"
                  >
                    {copied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      title="Gerar novo código por segurança"
                      className="flex items-center justify-center p-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-2xl transition-colors min-h-[44px] min-w-[44px]"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* BARRA DE AÇÕES INFERIOR */}
          {isAdmin && (
            <div className="flex items-center justify-end gap-4 pt-2 border-t border-slate-200/60">
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
                    Salvar Dados da Instituição
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </main>
    </DashboardLayout>
  );
}
