'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function AcudienteDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-violet-500/8 blur-[120px] pointer-events-none" />

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
          <div className="w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-violet-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Portal de Acudientes</h1>
          <p className="text-white/50 text-sm leading-relaxed mb-6">
            Consulta el rendimiento académico, boletines y observaciones disciplinarias de tus acudidos. Portal en construcción.
          </p>
          <span className="inline-block px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-xs font-semibold">
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
