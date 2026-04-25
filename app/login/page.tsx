"use client";

import { useState } from "react";
import { app } from "../../lib/firebase";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const auth = getAuth(app);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Sucesso! Redirecionando para o Dashboard...");
    } catch (err: any) {
      setError("Credenciais inválidas. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) return setError("Preencha todos os campos.");
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      alert("Conta de Cuidador criada!");
    } catch (err: any) {
      setError("Erro ao criar conta. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-white text-gray-900">
      {/* Lado Esquerdo: Apresentação (Enterprise/Hero) */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 bg-blue-600 p-12 text-white">
        <div className="max-w-lg mx-auto">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6">
            Vitalidade Senior AI
          </h1>
          <p className="text-xl leading-relaxed mb-8 text-blue-100">
            A plataforma inteligente que transforma a rotina de cuidados em longevidade ativa. [cite: 23]
          </p>
          
          <ul className="space-y-6">
            <li className="flex items-start gap-4">
              <div className="bg-blue-500 p-2 rounded-lg">🚀</div>
              <div>
                <h3 className="font-bold text-lg">Mentor Digital 24/7</h3>
                <p className="text-blue-100 text-sm">IA adaptativa que ajusta treinos e nutrição com base no feedback diário. [cite: 21]</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="bg-blue-500 p-2 rounded-lg">🛡️</div>
              <div>
                <h3 className="font-bold text-lg">Segurança Inteligente</h3>
                <p className="text-blue-100 text-sm">Monitoramento de inatividade com alertas críticos automáticos para a família. [cite: 16, 18]</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="bg-blue-500 p-2 rounded-lg">📱</div>
              <div>
                <h3 className="font-bold text-lg">Tecnologia PWA</h3>
                <p className="text-blue-100 text-sm">Instale direto no celular, sem a burocracia das lojas de aplicativos. [cite: 2, 4]</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Lado Direito: Login Interativo */}
      <div className="flex flex-col justify-center w-full lg:w-1/2 p-12 bg-gray-50">
        <div className="w-full max-w-md mx-auto bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Bem-vindo</h2>
            <p className="text-gray-500">Acesse sua conta de cuidador para gerenciar seus pacientes.</p>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm font-medium border border-red-100">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">E-mail Profissional</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="nome@exemplo.com"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
            >
              {loading ? "Processando..." : "Entrar no Sistema"}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-600 mb-4">Ainda não tem acesso?</p>
            <button 
              onClick={handleRegister}
              className="text-blue-600 font-bold hover:text-blue-800 transition-colors"
            >
              Solicitar Cadastro de Cuidador
            </button>
          </div>
        </div>
        
        <footer className="mt-12 text-center text-gray-400 text-xs">
          © 2026 Vitalidade Senior AI - Tecnologia para Longevidade Ativa.
        </footer>
      </div>
    </div>
  );
}