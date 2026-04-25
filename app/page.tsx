"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* BACKGROUND ANIMADO (INTERATIVIDADE SUTIL) */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100/50 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      {/* HEADER PROFESSIONAL */}
      <nav className="fixed w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-200 group-hover:rotate-12 transition-transform">V</div>
            <span className="text-xl font-bold tracking-tight text-slate-800">Vitalidade Senior <span className="text-blue-600 text-sm font-black italic">AI</span></span>
          </div>
          <Link 
            href="/login" 
            className="px-6 py-2 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-200 transition-all active:scale-95"
          >
            Acesso do Cuidador
          </Link>
        </div>
      </nav>

      {/* HERO SECTION - APRESENTAÇÃO DE ALTO NÍVEL */}
      <section className="relative pt-32 lg:pt-48 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-8 animate-bounce">
            ✨ TECNOLOGIA PWA PARA LONGEVIDADE
          </div>
          
          <h1 className="text-5xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-8 text-slate-900">
            Envelhecer com <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Força e Inteligência.</span>
          </h1>

          <p className="max-w-2xl text-xl text-slate-500 mb-12 leading-relaxed">
            O Vitalidade Senior AI remove barreiras tecnológicas e foca na autonomia do idoso através de um mentor digital que adapta cada detalhe em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row gap-6">
            <Link 
              href="/login"
              className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black text-xl hover:bg-blue-700 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-300 transition-all active:scale-95"
            >
              Começar Agora
            </Link>
            <button className="px-12 py-5 bg-white border-2 border-slate-200 text-slate-900 rounded-3xl font-bold text-xl hover:bg-slate-50 transition-all">
              Ver Demonstração
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES INTERATIVAS (O CORAÇÃO DO PROJETO) */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* CARD: DIGITAL CAREGIVER */}
            <div className="group p-10 rounded-[3rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all duration-500 hover:-translate-y-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:scale-110 group-hover:rotate-12 transition-transform">🧘‍♂️</div>
              <h3 className="text-2xl font-black mb-4">Digital Caregiver</h3>
              <p className="text-slate-500 leading-relaxed">
                Guia o idoso através de tarefas de bem-estar físico e mental ao longo do dia, promovendo uma rotina simplificada[cite: 13, 15].
              </p>
            </div>

            {/* CARD: DEAD MAN'S SWITCH */}
            <div className="group p-10 rounded-[3rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-200 transition-all duration-500 hover:-translate-y-4">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:scale-110 group-hover:rotate-12 transition-transform">🛡️</div>
              <h3 className="text-2xl font-black mb-4">Segurança Inteligente</h3>
              <p className="text-slate-500 leading-relaxed">
                Um gatilho de inatividade monitora interações e envia alertas automáticos para a família em situações críticas[cite: 16, 18].
              </p>
            </div>

            {/* CARD: HIPER-PERSONALIZAÇÃO */}
            <div className="group p-10 rounded-[3rem] bg-white border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-200 transition-all duration-500 hover:-translate-y-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:scale-110 group-hover:rotate-12 transition-transform">🧠</div>
              <h3 className="text-2xl font-black mb-4">IA Adaptativa</h3>
              <p className="text-slate-500 leading-relaxed">
                A IA analisa a ficha médica e o contexto diário para sugerir planos únicos de nutrição e treinos com total segurança[cite: 21, 23, 24].
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER PREMIUM */}
      <footer className="bg-slate-900 text-white py-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 text-center md:text-left">
          <div>
            <h2 className="text-3xl font-black mb-4">Vitalidade Senior AI</h2>
            <p className="text-slate-400 max-w-sm">"Longevidade ativa na palma da mão."</p>
          </div>
          <div className="flex gap-10">
            <div className="flex flex-col gap-3">
              <span className="font-bold text-blue-400 uppercase text-xs tracking-widest">Produto</span>
              <button className="text-slate-400 hover:text-white transition-colors">Funcionalidades</button>
              <button className="text-slate-400 hover:text-white transition-colors">Segurança</button>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-bold text-blue-400 uppercase text-xs tracking-widest">Institucional</span>
              <button className="text-slate-400 hover:text-white transition-colors">Sobre</button>
              <button className="text-slate-400 hover:text-white transition-colors">Contato</button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-800 text-slate-500 text-xs flex justify-between">
          <span>© 2026 Vitalidade Senior AI. Inatel FETIN.</span>
          <span>Desenvolvido com IA de Alta Performance.</span>
        </div>
      </footer>
    </div>
  );
}