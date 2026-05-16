"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../../lib/firebase";
import { useInstitucaoId } from "../../../lib/hooks";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import PacienteForm, { PacienteFormData } from "../../components/PacienteForm";

export default function NovoPaciente() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { instituicaoId, loading: loadingInstituicao } = useInstitucaoId();

  // Proteção de Rota
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      // Ainda carregando instituicaoId
      if (loadingInstituicao) {
        return;
      }

      // Novo usuário que ainda não completou onboarding
      if (!instituicaoId) {
        router.push("/onboarding");
        return;
      }
    });
    return () => unsubscribe();
  }, [router, instituicaoId, loadingInstituicao]);

  const handleSubmit = async (formData: PacienteFormData) => {
    setLoading(true);
    setError("");

    const user = auth.currentUser;
    if (!user || !instituicaoId) {
      setError("Dados incompletos. Tente novamente.");
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(db, "Pacientes"), {
        ...formData,
        cuidadorId: user.uid,
        instituicaoId: instituicaoId, // ← MULTI-TENANCY!
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
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-6 font-bold border border-red-100">
              ⚠️ {error}
            </div>
          )}

          <PacienteForm
            onSubmit={handleSubmit}
            isLoading={loading}
            submitButtonText="Concluir e Ativar Mentor IA"
          />
        </div>
      </div>
    </div>
  );
}