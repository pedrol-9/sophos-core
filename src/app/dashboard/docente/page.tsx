'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function DocenteDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-cyan-500/8 blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-md">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-2.5 mb-10 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Sophos<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"> Core</span>
          </span>
        </Link>

        <div className="bg-white/3 border border-white/10 rounded-2xl p-10 backdrop-blur-sm shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-cyan-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Workspace Docente</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Tu panel de calificaciones, asistencia y comunicación con estudiantes está en construcción. Estará disponible muy pronto.
          </p>
          <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-300 text-xs font-semibold">
            Próximamente
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="mt-6 flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/25 hover:text-red-400 text-white/60 text-xs font-semibold transition-all duration-200"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
