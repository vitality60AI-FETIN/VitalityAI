"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Onboarding() {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [tipo, setTipo] = useState("Familiar");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const router = useRouter();

  // Proteção de Rota: Só entra se estiver logado
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const user = auth.currentUser;

    if (!user) {
      setError("Sessão expirada. Faça login novamente.");
      return;
    }

    try {
      // Salva os dados no Firestore na coleção "Cuidadores"
      // Usamos o UID do usuário como ID do documento
      await setDoc(doc(db, "Cuidadores", user.uid), {
        nomeCompleto: nome,
        cpf: cpf,
        dataNascimento: dataNascimento,
        tipoCuidador: tipo,
        whatsapp: whatsapp,
        email: user.email,
        createdAt: new Date().toISOString(),
      });

      // Sucesso! Vai para o Dashboard
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
          <h1 className="text-3xl font-black text-slate-800 mb-2">Completar o seu Perfil</h1>
          <p className="text-slate-500 font-medium">
            Precisamos de alguns detalhes para personalizar a experiência do Vitalidade Senior AI.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 text-sm font-bold border border-red-100 animate-shake">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
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
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">CPF</label>
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
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Data de Nascimento</label>
            <input 
              type="date" 
              required
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700 text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Perfil do Cuidador</label>
            <select 
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700 appearance-none"
            >
              <option value="Familiar">Cuidador Familiar</option>
              <option value="Profissional">Profissional de Saúde</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">WhatsApp / Telemóvel</label>
            <input 
              type="tel" 
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+351 900 000 000"
              className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
            />
          </div>

          <div className="md:col-span-2 pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "A Guardar Perfil..." : "Concluir Cadastro e Iniciar"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}