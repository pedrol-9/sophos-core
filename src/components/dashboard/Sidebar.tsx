'use client';

import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import {
  IconHome, IconBuilding, IconNotebook, IconSparkles, 
  IconChecklist, IconSettings, IconLogout
} from '@/components/icons';

interface SidebarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export function Sidebar({ user, activeTab, setActiveTab, onLogout }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-white/10 flex flex-col justify-between shrink-0 bg-[#0c1220]/90 backdrop-blur-md">
      <div>
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Sophos<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"> Core</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <IconHome /> Panel General
          </button>
          <button
            onClick={() => setActiveTab('institutions')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'institutions'
                ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <IconBuilding /> Sedes e Institutos
            </div>
            <span className="text-[10px] bg-indigo-500/25 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">3</span>
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'courses'
                ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <IconNotebook /> Cursos y Materias
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'ai'
                ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <IconSparkles /> IA Académica
            </div>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full">Activo</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'attendance'
                ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <IconChecklist /> Asistencia
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <IconSettings /> Configuración
          </button>
        </nav>
      </div>

      {/* Profile Card / Logout */}
      <div className="p-4 border-t border-white/10 space-y-3 bg-[#0a0f1b]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-300 font-bold uppercase">
            {user?.email?.charAt(0) ?? 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white/95 truncate">
              {user?.email?.split('@')[0] ?? 'Administrador'}
            </p>
            <p className="text-xs text-white/40 truncate">{user?.email ?? 'conectando...'}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-white/70 text-xs font-semibold transition-all duration-200"
        >
          <IconLogout /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
