'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { IconPlus } from '@/components/icons';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { BulkImportModal } from '@/components/dashboard/BulkImportModal';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { StudentList } from '@/components/dashboard/admin/StudentList';
import { StudentDetail } from '@/components/dashboard/admin/StudentDetail';
import { OnboardingWizard } from '@/components/dashboard/admin/OnboardingWizard';
import { EvidenciasManager } from '@/components/dashboard/admin/EvidenciasManager';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEvidencias, setShowEvidencias] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
  const [dismissedOnboarding, setDismissedOnboarding] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('onboarding_dismissed') === 'true';
    }
    return false;
  });

  // ─── CUSTOM HOOK ─────────────────────────────────────────────────────────────
  const {
    user,
    students,
    selectedStudent,
    setSelectedStudent,
    search,
    setSearch,
    isGenerating,
    generatingProgress,
    handleGenerateAIComment,
    refresh,
  } = useAdminDashboard();

  useEffect(() => {
    async function checkOnboarding() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.app_metadata?.id_institucion) {
        const { data, error } = await supabase
          .from('periodos_academicos')
          .select('id_periodo')
          .eq('id_institucion', user.app_metadata.id_institucion)
          .limit(1);

        if (data && data.length > 0 && !error) {
          setIsOnboardingComplete(true);
        } else {
          setIsOnboardingComplete(false);
        }
      } else {
        setIsOnboardingComplete(false);
      }
    }
    checkOnboarding();
  }, [supabase, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (isOnboardingComplete === null) {
    return (
      <div className="flex h-screen bg-[#090d16] items-center justify-center text-white">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#090d16] text-white overflow-hidden">
      {!isOnboardingComplete && !dismissedOnboarding && user?.app_metadata?.id_institucion && (
        <OnboardingWizard
          idInstitucion={user.app_metadata.id_institucion}
          onComplete={() => setIsOnboardingComplete(true)}
          onDismiss={() => {
            sessionStorage.setItem('onboarding_dismissed', 'true');
            setDismissedOnboarding(true);
          }}
        />
      )}

      {/* ─── SIDEBAR ────────────────────────────────────────────────────────── */}
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-indigo-500/5 blur-[120px] pointer-events-none" />

        {/* WARNING BANNER FOR PENDING ONBOARDING */}
        {!isOnboardingComplete && dismissedOnboarding && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-in slide-in-from-top duration-300">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="text-sm font-bold text-amber-200">Configuración del Año Lectivo Pendiente</h4>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  La estructura de periodos, ponderaciones y escalas aún no se ha configurado. Las planillas de docentes no estarán operativas hasta completar este paso.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem('onboarding_dismissed');
                setDismissedOnboarding(false);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-[#090d16] font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
            >
              Configurar Ahora
            </button>
          </div>
        )}

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Panel Académico</h1>
            <p className="text-sm text-white/50 mt-1">Supervisión integrada e inteligencia predictiva académica</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEvidencias(!showEvidencias)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 ${
                showEvidencias
                  ? 'bg-teal-600 hover:bg-teal-500 shadow-md shadow-teal-600/20'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white/80'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Gestionar Evidencias
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 hover:-translate-y-0.5"
            >
              <IconPlus /> Cargar Usuarios (CSV)
            </button>
          </div>
        </div>

        {/* ─── PANEL EVIDENCIAS ─────────────────────────────────────────────── */}
        {showEvidencias && (
          <div className="mb-8 bg-[#0d1220]/70 border border-white/10 rounded-2xl p-6 animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-white">Gestión de Evidencias del Año Lectivo</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  Define las evidencias de aprendizaje por grado y materia que los docentes evaluarán cada periodo.
                </p>
              </div>
              <button
                onClick={() => setShowEvidencias(false)}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <EvidenciasManager />
          </div>
        )}

        {/* ─── STATS GRID ────────────────────────────────────────────────────── */}
        <StatsGrid totalStudents={students.length} />

        {/* ─── WORK AREA (FLEX LAYOUT) ────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT: STUDENT TABLE */}
          <StudentList 
            students={students}
            search={search}
            setSearch={setSearch}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
          />

          {/* RIGHT: DETAIL PANEL */}
          <StudentDetail 
            selectedStudent={selectedStudent}
            isGenerating={isGenerating}
            generatingProgress={generatingProgress}
            onGenerateAIComment={handleGenerateAIComment}
          />

        </div>

        {/* ─── SLIDE-OVER MODAL: BULK IMPORT CSV ──────────────────────────── */}
        {showAddForm && (
          <BulkImportModal 
            onClose={() => setShowAddForm(false)} 
            onSuccess={() => {
              console.log("Usuarios importados correctamente. Refrescar datos...");
              refresh();
            }} 
          />
        )}
      </main>
    </div>
  );
}
