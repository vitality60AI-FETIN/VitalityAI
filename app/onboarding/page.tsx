"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc, addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Step = "instituicao" | "perfil";
type TipoInstituicao = "criar" | "entrar";

export default function Onboarding() {
  const [step, setStep] = useState<Step>("instituicao");
  const [tipoInstituicao, setTipoInstituicao] = useState<TipoInstituicao | null>(null);
  
  // Dados da Instituição
  const [nomeInstituicao, setNomeInstituicao] = useState("");
  const [cnpjInstituicao, setCnpjInstituicao] = useState("");
  const [codigoInstituicao, setCodigoInstituicao] = useState("");
  
  // Dados do Cuidador
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [tipo, setTipo] = useState("Profissional");
  const [whatsapp, setWhatsapp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [instituicaoId, setInstituicaoId] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // PASSO 1: Criar ou Entrar em Instituição
  const handleInstituicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (tipoInstituicao === "criar") {
        if (!nomeInstituicao.trim()) {
          setError("Informe o nome da instituição.");
          setLoading(false);
          return;
        }

        const nomeTratado = nomeInstituicao.trim();

        // Verificar se já existe uma instituição com este nome exato
        const qExist = query(
          collection(db, "Instituicoes"),
          where("nome", "==", nomeTratado)
        );
        const snapExist = await getDocs(qExist);

        if (!snapExist.empty) {
          setError("Já existe uma instituição com este nome. Volte e escolha 'Entrar em Instituição Existente'.");
          setLoading(false);
          return;
        }

        // Gerar ID único para a instituição
        const novoInstituicaoId = `inst-${Date.now()}`;

        // Criar documento da instituição
        await setDoc(doc(db, "Instituicoes", novoInstituicaoId), {
          nome: nomeTratado,
          cnpj: cnpjInstituicao || "N/A",
          criadoEm: new Date().toISOString(),
          ativa: true,
          criadoPorUid: auth.currentUser?.uid,
        });

        setInstituicaoId(novoInstituicaoId);
        setStep("perfil");
      } else {
        // Entrar em instituição existente
        const codigoTratado = codigoInstituicao.trim();

        if (!codigoTratado) {
          setError("Informe o código da instituição.");
          setLoading(false);
          return;
        }

        // Buscar instituição pelo código (simplificado: usaremos o nome)
        // OBS: FireStore é case-sensitive. O usuário precisa digitar exatamente igual.
        const q = query(
          collection(db, "Instituicoes"),
          where("nome", "==", codigoTratado)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setError("Instituição não encontrada. Verifique se o nome está exato (letras maiúsculas e minúsculas importam).");
          setLoading(false);
          return;
        }

        setInstituicaoId(snap.docs[0].id);
        setStep("perfil");
      }
    } catch (err: any) {
      console.error("Erro ao processar instituição:", err);
      setError("Erro ao processar instituição. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // PASSO 2: Salvar Perfil do Cuidador
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const user = auth.currentUser;

    if (!user || !instituicaoId) {
      setError("Dados incompletos. Tente novamente.");
      setLoading(false);
      return;
    }

    try {
      // Salvar cuidador com instituicaoId
      await setDoc(doc(db, "Cuidadores", user.uid), {
        nomeCompleto: nome,
        cpf: cpf,
        dataNascimento: dataNascimento,
        tipoCuidador: tipo,
        whatsapp: whatsapp,
        email: user.email,
        instituicaoId: instituicaoId, // ← MULTI-TENANCY!
        // Definir papel: se criou a instituição, torna-se Admin
        role: tipoInstituicao === "criar" ? "Admin" : "Cuidador",
        criadoEm: new Date().toISOString(),
      });

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      setError("Erro ao salvar os seus dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 selection:bg-blue-100">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 p-8 lg:p-12 border border-slate-100 animate-in fade-in zoom-in-95 duration-700">
        
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl font-black text-2xl mb-6 shadow-xl shadow-blue-200">V</div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">
            {step === "instituicao" ? "Sua Instituição" : "Seu Perfil"}
          </h1>
          <p className="text-slate-500 font-medium">
            {step === "instituicao"
              ? "Primeira, vamos definir a instituição (asilo, clínica ou unidade de cuidados)."
              : "Agora complete os seus dados como cuidador."}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm font-bold border border-red-100">
            ⚠️ {error}
          </div>
        )}

        {/* PASSO 1: Instituição */}
        {step === "instituicao" && tipoInstituicao === null && (
          <div className="space-y-4">
            <p className="text-slate-600 font-medium mb-6">Você vai criar uma nova instituição ou entrar em uma existente?</p>
            
            <button
              type="button"
              onClick={() => setTipoInstituicao("criar")}
              className="w-full p-6 rounded-2xl border-2 border-blue-200 bg-blue-50 text-blue-700 font-bold hover:border-blue-500 hover:bg-blue-100 transition-all"
            >
              ➕ Criar Nova Instituição
            </button>

            <button
              type="button"
              onClick={() => setTipoInstituicao("entrar")}
              className="w-full p-6 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-700 font-bold hover:border-slate-400 hover:bg-slate-100 transition-all"
            >
              🔑 Entrar em Instituição Existente
            </button>
          </div>
        )}

        {/* PASSO 1A: Criar Nova Instituição */}
        {step === "instituicao" && tipoInstituicao === "criar" && (
          <form onSubmit={handleInstituicao} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Nome da Instituição
              </label>
              <input
                type="text"
                required
                value={nomeInstituicao}
                onChange={(e) => setNomeInstituicao(e.target.value)}
                placeholder="Ex: Asilo Vida Plena, Clínica Bem Viver"
                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                CNPJ (opcional)
              </label>
              <input
                type="text"
                value={cnpjInstituicao}
                onChange={(e) => setCnpjInstituicao(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTipoInstituicao(null)}
                className="flex-1 px-4 py-3 text-slate-600 font-bold border-2 border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
              >
                ← Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:bg-slate-400 transition-all"
              >
                {loading ? "Criando..." : "Criar Instituição"}
              </button>
            </div>
          </form>
        )}

        {/* PASSO 1B: Entrar em Instituição Existente */}
        {step === "instituicao" && tipoInstituicao === "entrar" && (
          <form onSubmit={handleInstituicao} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Código da Instituição
              </label>
              <input
                type="text"
                required
                value={codigoInstituicao}
                onChange={(e) => setCodigoInstituicao(e.target.value)}
                placeholder="Informe o nome da instituição"
                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
              />
              <p className="text-xs text-slate-500 mt-2">
                Peça o nome da instituição ao seu administrador
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTipoInstituicao(null)}
                className="flex-1 px-4 py-3 text-slate-600 font-bold border-2 border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
              >
                ← Voltar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:bg-slate-400 transition-all"
              >
                {loading ? "Validando..." : "Entrar"}
              </button>
            </div>
          </form>
        )}

        {/* PASSO 2: Perfil do Cuidador */}
        {step === "perfil" && (
          <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como gostaria de ser chamado?"
                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                CPF
              </label>
              <input
                type="text"
                required
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Data de Nascimento
              </label>
              <input
                type="date"
                required
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Perfil do Cuidador
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700 appearance-none"
              >
                <option value="Profissional">Profissional de Saúde</option>
                <option value="Cuidador">Cuidador Profissional</option>
                <option value="Familiar">Cuidador Familiar</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                WhatsApp / Telemóvel
              </label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+351 900 000 000"
                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setStep("instituicao");
                setTipoInstituicao(null);
              }}
              className="px-4 py-3 text-slate-600 font-bold border-2 border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
            >
              ← Voltar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:bg-slate-400 transition-all"
            >
              {loading ? "Salvando..." : "Concluir Onboarding"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}