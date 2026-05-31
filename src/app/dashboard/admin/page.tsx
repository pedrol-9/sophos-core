'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { IconPlus } from '@/components/icons';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { BulkImportModal } from '@/components/dashboard/BulkImportModal';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { StudentList } from '@/components/dashboard/admin/StudentList';
import { StudentDetail } from '@/components/dashboard/admin/StudentDetail';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddForm, setShowAddForm] = useState(false);

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
  } = useAdminDashboard();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-[#090d16] text-white">
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

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Panel Académico</h1>
            <p className="text-sm text-white/50 mt-1">Supervisión integrada e inteligencia predictiva académica</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 hover:-translate-y-0.5"
            >
              <IconPlus /> Cargar Usuarios (CSV)
            </button>
          </div>
        </div>

        {/* ─── STATS GRID ────────────────────────────────────────────────────── */}
        <StatsGrid />

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
            }} 
          />
        )}
      </main>
    </div>
  );
}
