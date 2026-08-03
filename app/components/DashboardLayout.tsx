"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Users, Brain, Sparkles, LayoutDashboard, FolderHeart, Activity, LogOut, Plus } from "lucide-react";
import { auth } from "../../lib/firebase";
import { useInstitucaoId } from "../../lib/hooks";
import { onAuthStateChanged, signOut } from "firebase/auth";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [userName, setUserName] = useState("Cuidador");
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

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200/60 hidden md:flex flex-col justify-between shadow-[2px_0_10px_rgb(0,0,0,0.02)] z-20">
        <div>
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-6 py-8 border-b border-slate-100/50 cursor-default">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5l7 14 7-14" /></svg>
            </div>
            <span className="text-xl font-semibold tracking-tight text-slate-800">
              Vitalidade <span className="text-blue-600 italic font-black">AI</span>
            </span>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              // Pathname check (using startsWith for nested routes like /pacientes/123)
              const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-semibold text-sm border
                    ${isActive 
                      ? 'bg-blue-50/50 text-blue-700 border-blue-100/50 shadow-sm' 
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-100'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout at the bottom */}
        <div className="p-4 border-t border-slate-100/50">
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/50 rounded-2xl mb-2 border border-slate-100/50">
             <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase shrink-0">
                {userName.charAt(0)}
             </div>
             <div className="truncate text-left flex-1">
               <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
               <p className="text-xs text-slate-500">{role === "Admin" ? "Administrador" : "Cuidador"}</p>
             </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-colors group"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-y-auto relative">
        {/* NAVBAR SUPERIOR */}
        <nav className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4 transition-all flex justify-end items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={irParaCadastroPaciente}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95 hidden sm:flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Novo Paciente
            </button>
          </div>
        </nav>

        {/* CHILDREN RENDER */}
        <main className="max-w-7xl mx-auto w-full px-6 py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
