"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Users, Brain, LayoutDashboard, FolderHeart, Activity, LogOut, Plus, ChevronLeft, ChevronRight, Sparkles, User, Building2, ExternalLink } from "lucide-react";
import { auth } from "../../lib/firebase";
import { useInstitucaoId, useCuidadorData, useInstitucaoData } from "../../lib/hooks";
import { onAuthStateChanged, signOut } from "firebase/auth";
import AiInsightsWidget from "./AiInsightsWidget";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [userName, setUserName] = useState("Cuidador");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useInstitucaoId();
  const { cuidador } = useCuidadorData();
  const { instituicao } = useInstitucaoData();
  const fotoUrl = (cuidador as any)?.fotoUrl || null;
  const instLogoUrl = (instituicao as any)?.logotipoUrl || null;
  const instNome = (instituicao as any)?.nome || "Instituição";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        setUserName(user.email?.split("@")[0] || "Cuidador");
      }
    });
    return () => unsubscribe();
  }, [router]);
  const displayName = cuidador?.nomeCompleto || cuidador?.nome || userName;
  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const irParaCadastroPaciente = () => {
    router.push("/pacientes/novo"); 
  };

  const menuItems = [
    { name: "Painel Geral", path: "/dashboard", icon: LayoutDashboard },
    { name: "Prontuários", path: "/pacientes", icon: FolderHeart },
    { name: "Log de Rotina", path: "/rotina", icon: Activity },
    { name: "Insights IA", path: "/insights", icon: Brain },
    ...(role === "Admin" ? [
      { name: "Equipe", path: "/equipe", icon: Users },
      { name: "Instituição", path: "/instituicao", icon: Building2 },
    ] : []),
    { name: "Meu Perfil", path: "/perfil", icon: User },
  ];

  // ── Tab labels compactos para a Tab Bar iOS mobile ──
  const tabItems = [
    { label: "Painel", path: "/dashboard", icon: LayoutDashboard },
    { label: "Prontuários", path: "/pacientes", icon: FolderHeart },
    { label: "Rotina", path: "/rotina", icon: Activity },
    { label: "Insights", path: "/insights", icon: Brain },
    ...(role === "Admin" ? [{ label: "Equipe", path: "/equipe", icon: Users }] : []),
  ];

  const isActivePath = (path: string) =>
    pathname === path || (path !== "/dashboard" && pathname.startsWith(path));

  return (
    <div className="flex h-screen print:h-auto print:block bg-slate-50 font-sans text-slate-900 overflow-hidden print:overflow-visible">

      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR — Desktop only (100% unchanged)
          ═══════════════════════════════════════════════════════════ */}
      <aside className={`bg-slate-950 border-r border-slate-800 transition-all duration-300 hidden md:flex flex-col justify-between shadow-2xl shadow-slate-900/50 z-20 relative print:hidden ${isSidebarCollapsed ? 'w-24' : 'w-72'}`}>
        <div>
          {/* Logo Brand Interativo com Brilho e Shimmer */}
          <div className="flex flex-col border-b border-white/5 cursor-default">
            <div className="flex items-center gap-4 px-6 py-6 h-[88px]">
              <Link
                href="/dashboard"
                className="relative group flex items-center gap-3 text-left focus:outline-none"
              >
                {/* Ícone com Brilho Pulsante e Efeito Holográfico */}
                <div className="relative w-12 h-12 shrink-0">
                  <div className="absolute inset-0 bg-blue-500/30 rounded-2xl blur-md group-hover:bg-indigo-500/50 transition-all duration-500 animate-pulse" />
                  <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-900/50 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
                    <Sparkles className="w-6 h-6 text-white drop-shadow-md animate-pulse" />
                  </div>
                </div>

                {!isSidebarCollapsed && (
                  <div className="flex flex-col">
                    <span className="text-2xl font-black tracking-tight text-white whitespace-nowrap overflow-hidden transition-all duration-300">
                      Vitalidade{" "}
                      <span className="bg-gradient-to-r from-blue-400 via-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent italic animate-shimmer-text">
                        AI
                      </span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400/80 -mt-1">
                      IA Assistencial
                    </span>
                  </div>
                )}
              </Link>
            </div>

            {/* Badge/Card da Instituição com Logo */}
            {!isSidebarCollapsed && (
              <div className="px-4 pb-4">
                <button
                  onClick={() => role === "Admin" && router.push("/instituicao")}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 transition-all duration-300 ${
                    role === "Admin" ? "hover:border-blue-500/50 hover:bg-slate-900 cursor-pointer group" : "cursor-default"
                  }`}
                  title={role === "Admin" ? "Configurar Instituição" : instNome}
                >
                  <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0 border border-slate-700/60 shadow-xs">
                    {instLogoUrl ? (
                      <img src={instLogoUrl} alt={instNome} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-black text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                      {instNome}
                    </p>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {role === "Admin" ? "Configurar Unidade" : "Unidade Ativa"}
                    </span>
                  </div>
                  {role === "Admin" && (
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0 mr-1" />
                  )}
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3.5 top-[84px] bg-slate-800 border-2 border-slate-950 text-slate-400 hover:text-white rounded-full p-1.5 shadow-lg transition-transform hover:scale-110 z-30"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1.5 mt-4">
            {menuItems.map((item) => {
              const isActive = isActivePath(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  title={isSidebarCollapsed ? item.name : ""}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'} gap-4 py-3.5 rounded-2xl transition-all duration-200 font-bold text-sm select-none
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 font-black' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                    }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout at the bottom */}
        <div className="p-4 border-t border-white/5 space-y-2">
          {!isSidebarCollapsed && (
            <Link
              href="/perfil"
              className="w-full flex items-center gap-3.5 px-3.5 py-3 bg-slate-900/90 hover:bg-slate-900 rounded-2xl border border-slate-800/80 text-left transition-all group cursor-pointer"
              title="Acessar Meu Perfil"
            >
               <div className="h-10 w-10 rounded-xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm uppercase shrink-0 border border-blue-400/30 shadow-md group-hover:border-blue-400">
                  {fotoUrl ? (
                    <img src={fotoUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
               </div>
               <div className="truncate text-left flex-1">
                 <p className="text-xs font-black text-white truncate group-hover:text-blue-400 transition-colors">{displayName}</p>
                 <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{role === "Admin" ? "Administrador" : "Cuidador"}</p>
               </div>
            </Link>
          )}
          <button 
            onClick={handleLogout} 
            title={isSidebarCollapsed ? "Encerrar Sessão" : ""}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-3.5'} gap-3.5 py-3 text-xs font-bold text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-2xl transition-all group border border-transparent hover:border-red-900/40`}
          >
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all shrink-0 border border-red-500/20">
              <LogOut className="w-4.5 h-4.5" />
            </div>
            {!isSidebarCollapsed && <span className="whitespace-nowrap font-black text-slate-300 group-hover:text-red-400">Encerrar Sessão</span>}
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT AREA
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-y-auto print:overflow-visible relative print:block">

        {/* ── NEW TOP HEADER (Branding & Minimalist Focus — Mobile Only) ─────── */}
        <header className="md:hidden ios-header sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-100/80 px-4 py-3 flex items-center justify-between transition-all">
          {/* Lado Esquerdo: Marca Vitality AI interativa + Logo da Instituição */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-left group active:opacity-75 transition-opacity"
            >
              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent font-black text-lg tracking-tight animate-shimmer-text">
                Vitality AI
              </span>
            </button>
          </div>

          {/* Lado Direito: Logo da Instituição + Avatar do Cuidador */}
          <div className="flex items-center gap-2.5">
            {/* Logo da Instituição no Mobile Header */}
            <div
              onClick={() => role === "Admin" && router.push("/instituicao")}
              className="h-8 w-8 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 shadow-xs cursor-pointer"
              title={instNome}
            >
              {instLogoUrl ? (
                <img src={instLogoUrl} alt={instNome} className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <button
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="w-9 h-9 rounded-2xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs shadow-xs active:scale-95 transition-transform"
              aria-label="Menu do Perfil"
              title="Menu do Perfil"
            >
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          {/* Menu Dropdown Popover do Perfil */}
          {isProfileMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs md:hidden"
                onClick={() => setIsProfileMenuOpen(false)}
              />
              <div className="absolute right-4 top-12 z-50 w-72 rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 md:hidden">
                <div className="flex items-center gap-3 p-2 pb-3 border-b border-slate-100">
                  <div className="h-10 w-10 rounded-2xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold shadow-xs">
                    {fotoUrl ? (
                      <img src={fotoUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                    <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 mt-0.5">
                      {role === "Admin" ? "Administrador" : "Cuidador"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-3">
                  <button
                    onClick={() => {
                      router.push("/dashboard");
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4 text-blue-600" />
                    Ir para o Painel Geral
                  </button>

                  <button
                    onClick={() => {
                      router.push("/perfil");
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <User className="h-4 w-4 text-blue-600" />
                    Meu Perfil
                  </button>

                  <button
                    onClick={() => {
                      router.push("/pacientes");
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <FolderHeart className="h-4 w-4 text-blue-600" />
                    Prontuários
                  </button>

                  <button
                    onClick={() => {
                      handleLogout();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors mt-2 border-t border-slate-100 pt-3"
                  >
                    <LogOut className="h-4 w-4 text-rose-600" />
                    Encerrar Sessão
                  </button>
                </div>
              </div>
            </>
          )}
        </header>

        {/* ── DESKTOP NAVBAR — Topo com Logo da Instituição & Ações ──────── */}
        <nav className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-6 py-3.5 transition-all hidden md:flex justify-between items-center print:hidden">
          {/* Badge da Instituição Ativa no topo desktop */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-1.5 shadow-2xs">
              <div className="h-7 w-7 rounded-lg overflow-hidden bg-white flex items-center justify-center border border-slate-200 text-blue-600 shrink-0">
                {instLogoUrl ? (
                  <img src={instLogoUrl} alt={instNome} className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 block leading-tight">{instNome}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unidade Ativa</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {(pathname === "/pacientes" || pathname.startsWith("/pacientes/")) && (
              <Link 
                href="/pacientes/novo"
                className="px-6 py-3 bg-blue-600 text-white text-sm font-black rounded-full hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg shadow-blue-600/30 transition-all active:scale-95 hidden sm:flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Novo Paciente
              </Link>
            )}
          </div>
        </nav>

        {/* ── CHILDREN RENDER — pb-28 em mobile para a Tab Bar não cobrir conteúdo ── */}
        <main className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6 md:py-10 pb-28 md:pb-10 print:py-0 print:px-0">
          {children}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          iOS BOTTOM TAB BAR — Fixed Solid Blur (Mobile Only)
          ═══════════════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-200/80 pb-safe print:hidden shadow-lg shadow-slate-900/5">
        <div className="flex items-center justify-around px-1 pt-2 pb-1">
          {tabItems.map((tab) => {
            const active = isActivePath(tab.path);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] flex-1 ios-press relative"
              >
                <Icon
                  className={`h-[22px] w-[22px] transition-colors duration-200 ${
                    active ? "text-blue-600" : "text-slate-400"
                  }`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className={`text-[10px] font-extrabold tracking-tight transition-colors duration-200 ${
                    active ? "text-blue-600 font-black" : "text-slate-400 font-bold"
                  }`}
                >
                  {tab.label}
                </span>
                {/* Active indicator dot — iOS style */}
                {active && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Widget Flutuante da IA (Chatbot no canto inferior direito) */}
      <AiInsightsWidget />
    </div>
  );
}
