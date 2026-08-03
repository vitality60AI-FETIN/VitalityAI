"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc, addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Step = "instituicao" | "perfil" | "termos";
type TipoInstituicao = "criar" | "entrar";

/** Gera um código de convite curto de 6 caracteres alfanuméricos (ex: A3F92B) */
function gerarCodigoConvite(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sem 0/O/1/I para evitar confusão visual
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

export default function Onboarding() {
  const [step, setStep] = useState<Step>("instituicao");
  const [tipoInstituicao, setTipoInstituicao] = useState<TipoInstituicao | null>(null);
  
  // Dados da Instituição
  const [nomeInstituicao, setNomeInstituicao] = useState("");
  const [cnpjInstituicao, setCnpjInstituicao] = useState("");
  const [codigoInstituicao, setCodigoInstituicao] = useState("");
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);
  
  // Dados do Cuidador
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [tipo, setTipo] = useState("Profissional");
  const [whatsapp, setWhatsapp] = useState("");

  // Termos LGPD
  const [aceitouTermos, setAceitouTermos] = useState(false);
  
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

        // Gerar ID único e código de convite para a instituição
        const novoInstituicaoId = `inst-${Date.now()}`;
        const novoCodigo = gerarCodigoConvite();

        // Criar documento da instituição com código de convite
        await setDoc(doc(db, "Instituicoes", novoInstituicaoId), {
          nome: nomeTratado,
          cnpj: cnpjInstituicao || "N/A",
          codigoConvite: novoCodigo,
          criadoEm: new Date().toISOString(),
          ativa: true,
          criadoPorUid: auth.currentUser?.uid,
        });

        setCodigoGerado(novoCodigo);

        setInstituicaoId(novoInstituicaoId);
        setStep("perfil");
      } else {
        // Entrar em instituição existente via código de convite
        const codigoTratado = codigoInstituicao.trim().toUpperCase();

        if (!codigoTratado) {
          setError("Informe o código de convite da instituição.");
          setLoading(false);
          return;
        }

        // Buscar instituição pelo código de convite (case-insensitive via toUpperCase)
        const q = query(
          collection(db, "Instituicoes"),
          where("codigoConvite", "==", codigoTratado)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setError("Código de convite não encontrado. Verifique com o administrador da instituição.");
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

  // PASSO 2: Validar Perfil e ir para Termos
  const handleGoToTermos = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!nome.trim() || !cpf.trim() || !dataNascimento || !whatsapp.trim()) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    setStep("termos");
  };

  // PASSO 3: Aceitar Termos e Salvar Tudo
  const handleAcceptAndSave = async () => {
    if (!aceitouTermos) {
      setError("Você precisa aceitar os termos para continuar.");
      return;
    }

    setLoading(true);
    setError("");

    const user = auth.currentUser;

    if (!user || !instituicaoId) {
      setError("Dados incompletos. Tente novamente.");
      setLoading(false);
      return;
    }

    try {
      const consentimentoTimestamp = new Date().toISOString();

      // Salvar cuidador com instituicaoId + consentimento LGPD
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
        criadoEm: consentimentoTimestamp,
        // Registro de consentimento LGPD
        consentimentoLGPD: {
          aceito: true,
          dataAceite: consentimentoTimestamp,
          versaoTermo: "1.0",
          uid: user.uid,
        },
      });

      // Registro separado na coleção ConsentimentosLGPD para auditoria
      await addDoc(collection(db, "ConsentimentosLGPD"), {
        uid: user.uid,
        email: user.email,
        nomeCompleto: nome,
        cpf: cpf,
        instituicaoId: instituicaoId,
        aceito: true,
        dataAceite: consentimentoTimestamp,
        versaoTermo: "1.0",
        termoResumo: "Termo de Privacidade e Consentimento para Tratamento de Dados Sensíveis (LGPD) - Vitality60AI",
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

  // Helper: Step indicator
  const stepNumber = step === "instituicao" ? 1 : step === "perfil" ? 2 : 3;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 selection:bg-blue-100">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 p-8 lg:p-12 border border-slate-100 animate-in fade-in zoom-in-95 duration-700">
        
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl font-black text-2xl mb-6 shadow-xl shadow-blue-200">V</div>
          <h1 className="text-3xl font-black text-slate-800 mb-2">
            {step === "instituicao" ? "Sua Instituição" : step === "perfil" ? "Seu Perfil" : "Termos de Consentimento"}
          </h1>
          <p className="text-slate-500 font-medium">
            {step === "instituicao"
              ? "Primeira, vamos definir a instituição (asilo, clínica ou unidade de cuidados)."
              : step === "perfil"
              ? "Agora complete os seus dados como cuidador."
              : "Leia e aceite os termos de privacidade para finalizar."}
          </p>

          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${
                    s < stepNumber
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                      : s === stepNumber
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {s < stepNumber ? "✓" : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-1 rounded-full transition-all duration-500 ${
                      s < stepNumber ? "bg-emerald-400" : "bg-slate-100"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
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
                Código de Convite
              </label>
              <input
                type="text"
                required
                value={codigoInstituicao}
                onChange={(e) => setCodigoInstituicao(e.target.value.toUpperCase())}
                placeholder="Ex: A3F92B"
                maxLength={6}
                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium font-mono text-lg tracking-[0.3em] text-slate-700 text-center uppercase"
              />
              <p className="text-xs text-slate-500 mt-2">
                Peça o código de 6 caracteres ao administrador da instituição
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
          <form onSubmit={handleGoToTermos} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              className="px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all"
            >
              Continuar →
            </button>
          </form>
        )}

        {/* PASSO 3: Termos de Consentimento LGPD */}
        {step === "termos" && (
          <div className="space-y-6">
            {/* Cabeçalho do Termo */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-black text-blue-800">Proteção de Dados — LGPD</h3>
                <p className="text-xs text-blue-600 font-medium">Lei nº 13.709/2018 • Versão 1.0</p>
              </div>
            </div>

            {/* Corpo do Termo (scrollável) */}
            <div className="max-h-[420px] overflow-y-auto pr-2 space-y-5 text-sm text-slate-600 leading-relaxed border border-slate-100 rounded-2xl p-6 bg-slate-50/50 scrollbar-thin">
              
              <div>
                <h4 className="text-base font-black text-slate-800 mb-3">
                  Termo de Privacidade e Consentimento para Tratamento de Dados Sensíveis
                </h4>
                <p>
                  Para garantir a excelência no monitoramento preventivo e a melhoria contínua da qualidade de vida dos residentes cadastrados, nossa plataforma necessita processar informações específicas de saúde. Em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018)</strong>, solicitamos o seu consentimento expresso.
                </p>
              </div>

              {/* Seção 1 */}
              <div className="border-t border-slate-200 pt-4">
                <h5 className="font-black text-slate-700 mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black">1</span>
                  Quais dados são coletados?
                </h5>
                <p className="mb-2">Durante o uso da plataforma, coletamos e processamos as seguintes categorias de dados:</p>
                <ul className="space-y-2 ml-1">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    <span><strong>Dados Cadastrais e Clínicos:</strong> Informações básicas de identificação, histórico médico e patologias preexistentes.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    <span><strong>Dados Fisiológicos e Biomecânicos:</strong> Padrões de marcha, mobilidade e métricas físicas coletadas automaticamente por meio de sensores, câmeras ou dispositivos vestíveis (smartwatches).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    <span><strong>Dados Nutricionais e Comportamentais:</strong> Registros de alimentação, hidratação, padrões de sono, oscilações de humor e interações sociais inseridos pela equipe técnica ou cuidadores.</span>
                  </li>
                </ul>
              </div>

              {/* Seção 2 */}
              <div className="border-t border-slate-200 pt-4">
                <h5 className="font-black text-slate-700 mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black">2</span>
                  Qual a finalidade do tratamento?
                </h5>
                <p className="mb-2">
                  Os dados coletados são classificados como <strong>sensíveis</strong> e serão utilizados exclusivamente para fins de <strong>prevenção à saúde e assistência clínica</strong>. O processamento é realizado por nossa Inteligência Artificial com o objetivo de:
                </p>
                <ul className="space-y-2 ml-1">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Gerar análises preditivas sobre o estado de saúde do idoso.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Emitir alertas automatizados de risco (como prevenção de quedas, desidratação ou declínio cognitivo) para a equipe técnica.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Auxiliar os profissionais da instituição na personalização de rotinas, dietas e exercícios.</span>
                  </li>
                </ul>
              </div>

              {/* Seção 3 */}
              <div className="border-t border-slate-200 pt-4">
                <h5 className="font-black text-slate-700 mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black">3</span>
                  Armazenamento e Compartilhamento
                </h5>
                <p className="mb-2">
                  A segurança dos seus dados é nossa prioridade. As informações são armazenadas em <strong>infraestrutura de nuvem segura e criptografada (Firebase)</strong>.
                </p>
                <ul className="space-y-2 ml-1">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span><strong>Acesso Restrito:</strong> Apenas profissionais de saúde e cuidadores devidamente autorizados pela instituição terão acesso aos relatórios e prontuários gerados.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span><strong>Privacidade:</strong> Sob nenhuma circunstância os dados serão comercializados, cedidos ou compartilhados com terceiros para fins publicitários ou que não tenham relação direta com o cuidado do paciente.</span>
                  </li>
                </ul>
              </div>

              {/* Seção 4 */}
              <div className="border-t border-slate-200 pt-4">
                <h5 className="font-black text-slate-700 mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black">4</span>
                  Direitos do Titular
                </h5>
                <p className="mb-2">
                  Como titular dos dados (ou seu representante legal), você possui o direito, a qualquer momento e mediante requisição, de:
                </p>
                <ul className="space-y-2 ml-1">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                    <span>Solicitar o acesso, a confirmação ou a correção de dados incompletos ou desatualizados.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                    <span>Revogar este consentimento, o que implicará na interrupção do monitoramento preditivo e na anonimização ou exclusão definitiva dos dados históricos da nossa base, ressalvadas as obrigações legais de retenção por parte da instituição de saúde.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Checkbox de Consentimento */}
            <div
              onClick={() => setAceitouTermos(!aceitouTermos)}
              className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 select-none ${
                aceitouTermos
                  ? "border-emerald-400 bg-emerald-50/80 shadow-lg shadow-emerald-100"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 mt-0.5 ${
                aceitouTermos
                  ? "bg-emerald-500 border-emerald-500 scale-110"
                  : "border-slate-300 bg-white"
              }`}>
                {aceitouTermos && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-sm font-bold leading-snug transition-colors ${
                  aceitouTermos ? "text-emerald-800" : "text-slate-700"
                }`}>
                  Declaração de Consentimento
                </p>
                <p className={`text-xs mt-1 leading-relaxed transition-colors ${
                  aceitouTermos ? "text-emerald-600" : "text-slate-500"
                }`}>
                  Declaro que li, compreendi e consinto expressamente com a coleta e o tratamento dos dados pessoais e dados sensíveis de saúde, nos termos descritos acima, para viabilizar o funcionamento da plataforma.
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep("perfil");
                  setAceitouTermos(false);
                  setError("");
                }}
                className="flex-1 px-4 py-3 text-slate-600 font-bold border-2 border-slate-200 rounded-2xl hover:bg-slate-50 transition-all"
              >
                ← Voltar
              </button>

              <button
                type="button"
                onClick={handleAcceptAndSave}
                disabled={!aceitouTermos || loading}
                className={`flex-1 px-4 py-3 font-bold rounded-2xl transition-all duration-300 ${
                  aceitouTermos
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 hover:-translate-y-0.5"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {loading ? "Finalizando..." : "Aceitar e Concluir ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}