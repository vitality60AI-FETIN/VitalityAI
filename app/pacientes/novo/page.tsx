"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function NovoPaciente() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Estados do Formulário (Agora todos terão seus devidos inputs)
  const [form, setForm] = useState({
    nome: "",
    idade: "",
    genero: "Masculino",
    peso: "",
    altura: "",
    restricoesFisicas: "",
    doencasCronicas: "",
    contatoEmergencia: "",
    objetivo: "Manutenção de Massa Magra (Sarcopenia)"
  });

  // Proteção de Rota
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.push("/login");
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const user = auth.currentUser;
    if (!user) return;

    try {
      await addDoc(collection(db, "Pacientes"), {
        ...form,
        cuidadorId: user.uid,
        statusSeguranca: "Verde",
        criadoEm: serverTimestamp()
      });

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError("Erro ao salvar dados. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Cabeçalho */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-bold mb-8 transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar ao Painel
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 p-8 md:p-12 border border-slate-100">
          <header className="mb-12">
            <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-3">
              Nova Anamnese Digital
            </h1>
            <p className="text-slate-500 text-lg max-w-2xl">
              Preencha os dados de saúde do idoso. Essas informações alimentam nossa <span className="text-blue-600 font-bold">IA Adaptativa</span>.
            </p>
          </header>

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 font-bold border border-red-100">⚠️ {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-10">
            
            {/* SEÇÃO 1: DADOS BÁSICOS & BIOMETRIA */}
            <section>
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-6 border-b border-slate-100 pb-2">1. Identificação & Biometria</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Nome Completo do Idoso</label>
                  <input name="nome" required value={form.nome} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all" placeholder="Ex: José da Silva" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Idade</label>
                  <input name="idade" type="number" required value={form.idade} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all" placeholder="80" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Gênero</label>
                  <select name="genero" value={form.genero} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Peso (kg)</label>
                  <input name="peso" type="number" step="0.1" required value={form.peso} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all" placeholder="Ex: 75.5" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Altura (cm)</label>
                  <input name="altura" type="number" required value={form.altura} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all" placeholder="Ex: 170" />
                </div>

              </div>
            </section>

            {/* SEÇÃO 2: CONDIÇÕES & OBJETIVOS */}
            <section>
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-6 border-b border-slate-100 pb-2">2. Condições Clínicas & Objetivos</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Restrições Biomecânicas</label>
                  <textarea name="restricoesFisicas" value={form.restricoesFisicas} onChange={handleChange} rows={3} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all resize-none" placeholder="Ex: Dores no joelho, usa andador..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Doenças Crônicas / Medicações</label>
                  <textarea name="doencasCronicas" value={form.doencasCronicas} onChange={handleChange} rows={3} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all resize-none" placeholder="Ex: Hipertensão, toma Losartana..." />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Objetivo Principal de Cuidado</label>
                <select name="objetivo" value={form.objetivo} onChange={handleChange} className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                  <option value="Manutenção de Massa Magra (Sarcopenia)">Manutenção de Massa Magra (Sarcopenia)</option>
                  <option value="Melhora de Mobilidade e Equilíbrio">Melhora de Mobilidade e Equilíbrio</option>
                  <option value="Controle de Doenças Crônicas">Controle de Doenças Crônicas</option>
                  <option value="Acompanhamento Cognitivo e Rotina">Acompanhamento Cognitivo e Rotina</option>
                </select>
              </div>
            </section>

            {/* SEÇÃO 3: SEGURANÇA (GATILHO) */}
            <section className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-4">3. Gatilho de Segurança</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Contato de Emergência (WhatsApp)</label>
                  <input name="contatoEmergencia" type="tel" required value={form.contatoEmergencia} onChange={handleChange} className="w-full p-4 bg-white rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none transition-all" placeholder="+55 35 99999-9999" />
                  <p className="text-xs text-slate-400 mt-2 ml-1 italic">*Este número receberá o alerta SOS se houver inatividade prolongada no app.</p>
                </div>
              </div>
            </section>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black text-xl shadow-2xl shadow-slate-200 hover:bg-blue-600 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Salvando Dados..." : "Concluir e Ativar Mentor IA"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}