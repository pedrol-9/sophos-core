'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { isDemoEmail } from '@/config/demo-accounts';
import { DemoLauncherModal } from './DemoLauncherModal';
import { createClient } from '@/utils/supabase/client';

interface DemoFloatingBadgeProps {
  user: User | null;
  roleName?: string;
}

export function DemoFloatingBadge({ user, roleName }: DemoFloatingBadgeProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  if (!user || !isDemoEmail(user.email)) {
    return null;
  }

  const handleExitDemo = async () => {
    setIsExiting(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <>
      <aside aria-label="Controles del Modo Demo" className="fixed bottom-5 right-5 z-40 animate-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-2 p-2 pl-3.5 rounded-2xl bg-card/90 border border-primary/30 shadow-2xl backdrop-blur-xl text-foreground text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            <span className="text-muted-foreground hidden sm:inline">Modo Demo:</span>
            <span className="font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
              {roleName || user.app_metadata?.rol || 'DEMO'}
            </span>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[11px] transition-all cursor-pointer shadow-sm hover:shadow"
            title="Cambiar a otro rol de prueba"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="hidden sm:inline">Cambiar</span> Rol
          </button>

          <button
            onClick={handleExitDemo}
            disabled={isExiting}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Salir del Modo Demo y volver al inicio"
            aria-label="Salir del Modo Demo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      <DemoLauncherModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
