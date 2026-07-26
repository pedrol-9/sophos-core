'use client';

import { User } from '@supabase/supabase-js';
import { IconNotebook, IconChecklist, IconLogout, IconUser } from '@/components/icons';
import { ThemeToggle } from '@/components/ThemeToggle';

interface AcudienteSidebarProps {
  user: User | null;
  activeTab: 'grades' | 'absences' | 'observador';
  setActiveTab: (tab: 'grades' | 'absences' | 'observador') => void;
  onLogout: () => void;
}

export function AcudienteSidebar({
  user,
  activeTab,
  setActiveTab,
  onLogout,
}: AcudienteSidebarProps) {
  return (
    <aside className="w-64 border-r border-border flex flex-col justify-between shrink-0 bg-card backdrop-blur-md relative z-10 h-full shadow-xs">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo */}
        <div className="p-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.png" alt="Sophos Core Logo" className="w-8 h-8 object-contain rounded-lg shadow-sm" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              Portal<span className="text-primary"> Acudiente</span>
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
          <button
            onClick={() => setActiveTab('grades')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'grades'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <IconNotebook /> Calificaciones
          </button>
          <button
            onClick={() => setActiveTab('absences')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'absences'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <IconChecklist /> Reporte de Faltas
          </button>
          <button
            onClick={() => setActiveTab('observador')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'observador'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <IconUser className="w-5 h-5" /> Observador Digital
          </button>
        </nav>
      </div>

      {/* Profile Card, Theme Toggle & Logout */}
      <div className="p-4 border-t border-border space-y-3 bg-secondary/30 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold uppercase shrink-0">
              {user?.email?.charAt(0) ?? 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.user_metadata?.nombre_completo || 'Acudiente'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">Familia / Acudiente</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-background border border-border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-muted-foreground text-xs font-semibold transition-all duration-200 cursor-pointer"
        >
          <IconLogout /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
