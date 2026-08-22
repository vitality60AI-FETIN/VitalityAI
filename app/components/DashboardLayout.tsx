"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Users, Brain, LayoutDashboard, FolderHeart, Activity, LogOut, Plus, ChevronLeft, ChevronRight, Sparkles, User } from "lucide-react";
import { auth } from "../../lib/firebase";
import { useInstitucaoId, useCuidadorData } from "../../lib/hooks";
import { onAuthStateChanged, signOut } from "firebase/auth";

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
  const fotoUrl = (cuidador as any)?.fotoUrl || null;

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
    ...(role === "Admin" ? [{ name: "Equipe", path: "/equipe", icon: Users }] : []),
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
          {/* Logo Brand */}
          <div className="flex items-center gap-4 px-6 py-8 border-b border-white/5 cursor-default h-[104px]">
            <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5l7 14 7-14" /></svg>
            </div>
            {!isSidebarCollapsed && (
              <span className="text-2xl font-semibold tracking-tight text-white whitespace-nowrap overflow-hidden transition-all duration-300">
                Vitalidade <span className="text-blue-500 italic font-black">AI</span>
              </span>
            )}
          </div>

          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3.5 top-[84px] bg-slate-800 border-2 border-slate-950 text-slate-400 hover:text-white rounded-full p-1.5 shadow-lg transition-transform hover:scale-110 z-30"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-2 mt-4">
            {menuItems.map((item) => {
              const isActive = isActivePath(item.path);
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.path)}
                  title={isSidebarCollapsed ? item.name : ""}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'} gap-4 py-4 rounded-2xl transition-all font-bold text-sm
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                    }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout at the bottom */}
        <div className="p-4 border-t border-white/5">
          {!isSidebarCollapsed && (
            <button
              onClick={() => router.push("/perfil")}
              className="w-full flex items-center gap-4 px-4 py-3.5 bg-slate-900 hover:bg-slate-800 rounded-[1.25rem] mb-3 border border-slate-800/50 text-left transition-colors group cursor-pointer"
              title="Acessar Meu Perfil"
            >
               <div className="h-10 w-10 rounded-[1rem] overflow-hidden bg-blue-900/40 flex items-center justify-center text-blue-400 font-black uppercase shrink-0 border border-blue-800/30 shadow-inner group-hover:border-blue-500">
                  {fotoUrl ? (
                    <img src={fotoUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
                  ) : (
                    displayName.charAt(0)
                  )}
               </div>
               <div className="truncate text-left flex-1">
                 <p className="text-sm font-black text-white truncate group-hover:text-blue-400 transition-colors">{displayName}</p>
                 <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{role === "Admin" ? "Administrador" : "Cuidador"}</p>
               </div>
            </button>
          )}
          <button 
            onClick={handleLogout} 
            title={isSidebarCollapsed ? "Encerrar Sessão" : ""}
            className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'} gap-4 py-4 text-sm font-bold text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-2xl transition-colors group`}
          >
            <LogOut className="w-5 h-5 shrink-0 text-slate-500 group-hover:text-red-400 transition-colors" />
            {!isSidebarCollapsed && <span className="whitespace-nowrap">Encerrar Sessão</span>}
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT AREA
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-y-auto print:overflow-visible relative print:block">

        {/* ── NEW TOP HEADER (Branding & Minimalist Focus — Mobile Only) ─────── */}
        <header className="md:hidden ios-header sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100/80 px-4 py-3 flex items-center justify-between transition-all">
          {/* Lado Esquerdo: Marca Vitality AI com gradiente e ícone Sparkles */}
          <button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-left group active:opacity-75 transition-opacity"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-500 bg-clip-text text-transparent font-bold text-lg tracking-tight">
              Vitality AI
            </span>
          </button>

          {/* Lado Direito: Avatar Squircle (Abre o menu popover do perfil) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className="w-9 h-9 rounded-2xl overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-semibold text-xs shadow-xs active:scale-95 transition-transform"
              aria-label="Menu do Perfil"
              title="Menu do Perfil"
            >
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
              ) : (
                userName.charAt(0).toUpperCase()
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
                      userName.charAt(0).toUpperCase()
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

        {/* ── DESKTOP NAVBAR — unchanged, hidden on mobile ──────── */}
        <nav className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4 transition-all hidden md:flex justify-end items-center print:hidden">
          <div className="flex items-center gap-4">
            {(pathname === "/pacientes" || pathname.startsWith("/pacientes/")) && (
              <button 
                onClick={irParaCadastroPaciente}
                className="px-6 py-3 bg-blue-600 text-white text-sm font-black rounded-full hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg shadow-blue-600/30 transition-all active:scale-95 hidden sm:flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Novo Paciente
              </button>
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
              <button
                key={tab.path}
                onClick={() => router.push(tab.path)}
                className="flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] flex-1 ios-press relative"
              >
                <Icon
                  className={`h-[22px] w-[22px] transition-colors duration-200 ${
                    active ? "text-blue-600" : "text-slate-400"
                  }`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span
                  className={`text-[10px] leading-tight font-semibold transition-colors duration-200 ${
                    active ? "text-blue-600 font-bold" : "text-slate-400"
                  }`}
                >
                  {tab.label}
                </span>
                {/* Active indicator dot — iOS style */}
                {active && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-[3px] w-5 rounded-full bg-blue-600" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
