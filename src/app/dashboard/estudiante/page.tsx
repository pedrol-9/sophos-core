'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function EstudianteDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-emerald-500/8 blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-md">
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
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-emerald-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Portal Estudiantil</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Consulta tus calificaciones, boletines académicos y comentarios de la IA. Tu portal está en construcción.
          </p>
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-semibold">
            Próximamente
          </span>
        </div>

        <button onClick={handleLogout} className="mt-6 flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/25 hover:text-red-400 text-white/60 text-xs font-semibold transition-all duration-200">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
