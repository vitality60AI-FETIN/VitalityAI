"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Users, Brain, LayoutDashboard, FolderHeart, Activity, LogOut, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "../../lib/firebase";
import { useInstitucaoId } from "../../lib/hooks";
import { onAuthStateChanged, signOut } from "firebase/auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [userName, setUserName] = useState("Cuidador");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { role } = useInstitucaoId();

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
  ];

  // ── Tab labels compactos para a Tab Bar iOS mobile ──
  const tabItems = [
    { label: "Painel", path: "/dashboard", icon: LayoutDashboard },
    { label: "Prontuários", path: "/pacientes", icon: FolderHeart },
    { label: "Rotina", path: "/rotina", icon: Activity },
    { label: "Insights", path: "/insights", icon: Brain },
    ...(role === "Admin" ? [{ label: "Equipe", path: "/equipe", icon: Users }] : []),
  ];

  // ── Título dinâmico baseado na rota ativa ──
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Painel Geral";
    if (pathname.startsWith("/pacientes")) return "Prontuários";
    if (pathname.startsWith("/rotina")) return "Log de Rotina";
    if (pathname.startsWith("/insights")) return "Insights IA";
    if (pathname.startsWith("/equipe")) return "Equipe";
    return "Vitality AI";
  };

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
            <div className="flex items-center gap-4 px-4 py-3.5 bg-slate-900 rounded-[1.25rem] mb-3 border border-slate-800/50">
               <div className="h-10 w-10 rounded-[1rem] bg-blue-900/40 flex items-center justify-center text-blue-400 font-black uppercase shrink-0 border border-blue-800/30 shadow-inner">
                  {userName.charAt(0)}
               </div>
               <div className="truncate text-left flex-1">
                 <p className="text-sm font-black text-white truncate">{userName}</p>
                 <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{role === "Admin" ? "Administrador" : "Cuidador"}</p>
               </div>
            </div>
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

        {/* ── iOS MOBILE HEADER — Large Title (mobile only) ─────── */}
        <header className="md:hidden ios-header bg-slate-50/90 glass-bar border-b border-slate-200/60 px-5 pb-3 pt-3 z-10 sticky top-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.15em] flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Vitality AI
              </p>
              <h1 className="text-[1.65rem] font-black tracking-tight text-slate-900 leading-tight mt-0.5">
                {getPageTitle()}
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-blue-600/25 ios-press"
              title="Perfil"
            >
              {userName.charAt(0).toUpperCase()}
            </button>
          </div>
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

        {/* ── CHILDREN RENDER ── */}
        <main className="max-w-7xl mx-auto w-full px-4 md:px-6 py-6 md:py-10 pb-tab-bar md:pb-10 print:py-0 print:px-0">
          {children}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          iOS TAB BAR — Bottom Navigation (mobile only)
          ═══════════════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-bar border-t border-black/8 pb-safe print:hidden">
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
