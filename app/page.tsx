"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const modalSteps = [
  {
    title: "1. Configuração Inicial Simples",
    desc: "Acesso rápido com o Google. Crie ou entre na sua instituição e comece a acompanhar pacientes imediatamente."
  },
  {
    title: "2. Monitoramento Ativo por IA",
    desc: "A inteligência artificial analisa a rotina em tempo real, sugerindo adaptações em nutrição, exercícios e cuidados."
  },
  {
    title: "3. Relatórios e Alertas",
    desc: "Tenha total tranquilidade. Alertas automáticos notificam a família sobre gatilhos de inatividade e relatórios gerenciais."
  }
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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
          <div className="flex items-center gap-3 group cursor-default">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:rotate-12 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5l7 14 7-14" /></svg>
            </div>
            <span className="text-xl font-semibold tracking-tight text-slate-800">Vitalidade Senior <span className="text-blue-600 text-sm font-black italic">AI</span></span>
          </div>
          <Link 
            href="/login" 
            className="flex items-center gap-2 px-5 py-2 rounded-full border border-slate-200 text-slate-700 font-semibold text-sm hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Acesso do Cuidador
          </Link>
        </div>
      </nav>

      {/* HERO SECTION - APRESENTAÇÃO DE ALTO NÍVEL */}
      <section className="relative pt-32 lg:pt-48 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 text-slate-700 text-xs font-bold mb-8 shadow-sm">
            🚀 PLATAFORMA DE CUIDADO DIGITAL INTELIGENTE
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8 text-slate-900">
            Sua Parceria Inteligente para um<br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Envelhecimento Ativo</span> e Independente.
          </h1>

          <p className="max-w-3xl text-lg lg:text-xl text-slate-600 mb-12 leading-[1.6]">
            A Vitalidade Senior AI capacita você a manter sua independência com um mentor digital que se adapta às suas necessidades em tempo real, oferecendo suporte personalizado e contínuo.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Link 
              href="/login"
              className="px-10 py-4 bg-gradient-to-b from-blue-500 to-blue-600 text-white rounded-full font-bold text-lg hover:from-blue-600 hover:to-blue-700 hover:-translate-y-1 active:scale-95 shadow-[0_10px_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_15px_50px_-10px_rgba(37,99,235,0.6)] transition-all"
            >
              Começar Agora
            </Link>
            <button 
              onClick={() => {
                setCurrentStep(0);
                setIsModalOpen(true);
              }}
              className="group relative px-6 py-4 text-blue-600 font-bold text-lg transition-all active:scale-95"
            >
              Conheça a Solução
              <span className="absolute bottom-3 left-6 right-6 h-[2px] bg-blue-600 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"></span>
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES INTERATIVAS (O CORAÇÃO DO PROJETO) */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* CARD: DIGITAL CAREGIVER */}
            <div className="group p-10 rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-blue-200 transition-all duration-300">
              <div className="w-14 h-14 bg-blue-50/80 rounded-2xl flex items-center justify-center mb-8 text-blue-600 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM12 10.5c-2.5 0-4.5 1.5-5.5 4l1 7 4.5-3 4.5 3 1-7c-1-2.5-3-4-5.5-4z" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-800">Cuidador Digital Personalizado</h3>
              <p className="text-slate-600 font-normal leading-[1.6]">
                Simplificamos sua rotina diária com orientação proativa para o bem-estar físico e mental, adaptada ao seu ritmo.
              </p>
            </div>

            {/* CARD: DEAD MAN'S SWITCH */}
            <div className="group p-10 rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-blue-200 transition-all duration-300">
              <div className="w-14 h-14 bg-blue-50/80 rounded-2xl flex items-center justify-center mb-8 text-blue-600 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-800">Rede de Segurança Ativa</h3>
              <p className="text-slate-600 font-normal leading-[1.6]">
                Monitoramento contínuo e alertas instantâneos para sua família, garantindo proteção em qualquer situação de risco.
              </p>
            </div>

            {/* CARD: HIPER-PERSONALIZAÇÃO */}
            <div className="group p-10 rounded-3xl bg-white border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 hover:border-blue-200 transition-all duration-300">
              <div className="w-14 h-14 bg-blue-50/80 rounded-2xl flex items-center justify-center mb-8 text-blue-600 group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" /></svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-800">IA que Evolui com Você</h3>
              <p className="text-slate-600 font-normal leading-[1.6]">
                Nossa IA analisa seu histórico de saúde para criar planos de nutrição e exercícios dinâmicos que se ajustam à sua evolução diária.
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
      {/* MODAL "CONHEÇA A SOLUÇÃO" (LEVE, SEM FRAMER-MOTION) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <h2 className="text-2xl font-bold mb-8 text-slate-800 pr-10">Como Funciona a Vitalidade Senior AI</h2>
            
            {/* Carousel Content */}
            <div className="relative min-h-[120px] mb-8">
              <div key={currentStep} className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h3 className="text-lg font-bold text-blue-600 mb-2">{modalSteps[currentStep].title}</h3>
                <p className="text-slate-600 leading-[1.6]">{modalSteps[currentStep].desc}</p>
              </div>
            </div>

            {/* Dots */}
            <div className="flex gap-2 mb-8 justify-center">
              {modalSteps.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentStep(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentStep ? 'bg-blue-600' : 'bg-slate-200'}`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mt-4">
              <button 
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                className="text-slate-500 hover:text-slate-800 disabled:opacity-0 transition-opacity font-semibold px-4 py-2"
              >
                Voltar
              </button>
              
              {currentStep < modalSteps.length - 1 ? (
                <button 
                  onClick={() => setCurrentStep((prev) => Math.min(modalSteps.length - 1, prev + 1))}
                  className="bg-slate-100 text-slate-800 hover:bg-slate-200 px-6 py-3 rounded-full font-bold transition-colors active:scale-95"
                >
                  Próximo
                </button>
              ) : (
                <Link 
                  href="/login"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-full font-bold shadow-lg shadow-blue-200 transition-colors active:scale-95 inline-block"
                >
                  Experimentar Agora
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}