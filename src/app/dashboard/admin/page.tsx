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
import { SubscriptionManager } from '@/components/dashboard/admin/SubscriptionManager';
import { CierrePeriodoManager } from '@/components/dashboard/admin/CierrePeriodoManager';
import {
  createCourse,
  createSubject,
  getIATokenLogs,
  uploadInstitutionLogo,
  updateInstitutionInfo,
  getInstitutionAdmins,
  createAdditionalAdmin
} from '@/app/actions/admin-actions';

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

  // ─── ESTADOS ADICIONALES PARA PANELES INTERACTIVOS ─────────────────────
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [iaLogs, setIaLogs] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [institution, setInstitution] = useState<any>(null);
  const [stats, setStats] = useState({ coursesCount: 0, teachersCount: 0 });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoTimestamp, setLogoTimestamp] = useState(Date.now());

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

  // ─── CARGADORES DE DATOS DINÁMICOS ──────────────────────────────────────
  const idInstitucion = user?.app_metadata?.id_institucion;

  const loadCoursesAndSubjects = async () => {
    if (!idInstitucion) return;
    const { data: c } = await supabase.from('cursos').select('*').eq('id_institucion', idInstitucion).order('nombre');
    const { data: m } = await supabase.from('materias').select('*').eq('id_institucion', idInstitucion).order('nombre');
    setCourses(c || []);
    setSubjects(m || []);
  };

  const loadIaLogs = async () => {
    const res = await getIATokenLogs();
    if (res.success && res.data) {
      setIaLogs(res.data);
    }
  };

  const loadAdmins = async () => {
    const res = await getInstitutionAdmins();
    if (res.success && res.data) {
      setAdmins(res.data);
    }
  };

  const loadInstitutionInfo = async () => {
    if (!idInstitucion) return;
    const { data } = await supabase
      .from('instituciones')
      .select('*, planes_suscripcion(nombre)')
      .eq('id_institucion', idInstitucion)
      .single();
    if (data) {
      setInstitution(data);
    }
    
    // Contar docentes y cursos
    const { count: cCount } = await supabase.from('cursos').select('*', { count: 'exact', head: true }).eq('id_institucion', idInstitucion);
    const { count: tCount } = await supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('id_institucion', idInstitucion).eq('rol', 'DOCENTE');
    
    setStats({
      coursesCount: cCount || 0,
      teachersCount: tCount || 0
    });
  };

  useEffect(() => {
    if (!idInstitucion) return;
    setActionError(null);
    setActionSuccess(null);

    if (activeTab === 'institutions') {
      loadInstitutionInfo();
    } else if (activeTab === 'courses') {
      loadCoursesAndSubjects();
    } else if (activeTab === 'ai') {
      loadIaLogs();
    } else if (activeTab === 'settings_profile') {
      loadInstitutionInfo();
    } else if (activeTab === 'settings_admins') {
      loadAdmins();
    }
  }, [activeTab, idInstitucion]);

  if (isOnboardingComplete === null) {
    return (
      <div className="flex h-screen bg-background items-center justify-center text-white">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden">
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
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-background font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
            >
              Configurar Ahora
            </button>
          </div>
        )}

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {activeTab === 'dashboard' ? 'Panel Académico' :
               activeTab === 'institutions' ? 'Sedes e Institutos' :
               activeTab === 'courses' ? 'Cursos y Materias' :
               activeTab === 'ai' ? 'IA Académica' :
               activeTab === 'settings_profile' ? 'Configuración de Perfil' :
               activeTab === 'settings_plans' ? 'Suscripción y Facturación' :
               activeTab === 'settings_academic' ? 'Configuración del Año Lectivo' :
               activeTab === 'settings_admins' ? 'Administradores' :
               activeTab === 'cierre' ? 'Boletines y Cierre de Periodo' : 'Panel General'}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {activeTab === 'dashboard' ? 'Supervisión integrada e inteligencia predictiva académica' :
               activeTab === 'institutions' ? 'Información y estadísticas de la sede principal' :
               activeTab === 'courses' ? 'Gestión curricular y administrativa de grados y asignaturas' :
               activeTab === 'ai' ? 'Consumo de recursos de inteligencia artificial de la institución' :
               activeTab === 'settings_profile' ? 'Actualización de datos legales y logotipos' :
               activeTab === 'settings_plans' ? 'Administración de la cuenta y límite de usuarios' :
               activeTab === 'settings_academic' ? 'Configuración inicial y re-onboarding de periodos' :
               activeTab === 'settings_admins' ? 'Gestión de personal de coordinación y administración' :
               activeTab === 'cierre' ? 'Generación de reportes finales y boletines académicos' : ''}
            </p>
          </div>
          {activeTab === 'dashboard' && (
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
          )}
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

        {/* ─── VISTAS DE TABS INTERACTIVAS ──────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <>
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
          </>
        )}

        {activeTab === 'institutions' && (
          <div className="space-y-6">
            {institution ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                <div className="md:col-span-2 bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 blur-[80px] pointer-events-none" />
                  <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between border-b border-white/10 pb-6 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center overflow-hidden shrink-0 relative">
                        <img 
                          src={`https://gxtuarqsfqrdvksmuioe.supabase.co/storage/v1/object/public/logos/${idInstitucion}/logo.png`} 
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          alt="Escudo" 
                          className="w-12 h-12 object-contain" 
                        />
                        <svg className="w-8 h-8 text-indigo-400 absolute" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" style={{ zIndex: -1 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.33-1.5M21 21H3" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{institution.nombre_legal}</h2>
                        <p className="text-sm text-white/40">NIT: {institution.nit} • Sede Principal</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 text-xs font-bold rounded-full uppercase tracking-wider">
                      {institution.estado_suscripcion}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-white/40 text-xs font-medium">Dominio Personalizado</p>
                      <p className="text-white font-semibold mt-0.5">{institution.dominio_personalizado || 'Ninguno (Usando dominio por defecto)'}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs font-medium">Suscripción Expiración</p>
                      <p className="text-white font-semibold mt-0.5">
                        {institution.fecha_expiracion ? new Date(institution.fecha_expiracion).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No especificada'}
                      </p>
                    </div>
                    <div className="col-span-1 sm:col-span-2 pt-4 border-t border-white/5">
                      <p className="text-white/40 text-xs font-medium mb-1">Administración de Sedes</p>
                      <p className="text-xs text-white/50 leading-relaxed">
                        Esta cuenta está configurada en la Sede Principal. Para añadir y gestionar sucursales (sedes adicionales), necesitas cambiar a un plan multisede. Contacta a soporte para más información.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-cyan-500/5 blur-[50px] pointer-events-none" />
                  <h3 className="text-sm font-bold text-white mb-4">Estadísticas de la Sede</h3>
                  <div className="space-y-4 flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                      <span className="text-white/50 text-sm">Cursos Activos</span>
                      <span className="text-white font-bold text-lg">{stats.coursesCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                      <span className="text-white/50 text-sm">Docentes Vinculados</span>
                      <span className="text-white font-bold text-lg">{stats.teachersCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-white/50 text-sm">Estudiantes Matriculados</span>
                      <span className="text-white font-bold text-lg">{students.length}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5 text-center">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                      Plan: {institution.planes_suscripcion?.nombre || 'Básico'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-[#0c1220]/50 border border-white/10 rounded-2xl">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-white/50 text-sm">Cargando información institucional...</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
            {/* COLUMN 1: CURSOS */}
            <div className="bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Gestión de Cursos (Grados)</h2>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                setActionError(null);
                setActionSuccess(null);
                const formData = new FormData(e.currentTarget);
                const nombre = formData.get('nombre') as string;
                const jornada = formData.get('jornada') as string;
                
                const res = await createCourse(nombre, jornada);
                setIsSubmitting(false);
                if (res.success) {
                  setActionSuccess('Curso creado correctamente.');
                  (e.target as any).reset();
                  loadCoursesAndSubjects();
                } else {
                  setActionError(res.error || 'Error al crear el curso.');
                }
              }} className="mb-6 bg-white/5 border border-white/5 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Registrar Nuevo Curso</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/40 mb-1">Nombre del Curso</label>
                    <input name="nombre" type="text" placeholder="Ej: 11-A" required className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/40 mb-1">Jornada</label>
                    <select name="jornada" required className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors">
                      <option value="Mañana" className="bg-slate-900">Mañana</option>
                      <option value="Tarde" className="bg-slate-900">Tarde</option>
                      <option value="Única" className="bg-slate-900">Única</option>
                      <option value="Nocturna" className="bg-slate-900">Nocturna</option>
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer">
                  {isSubmitting ? 'Guardando...' : 'Crear Curso'}
                </button>
              </form>

              <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
                {courses.length > 0 ? (
                  courses.map((c) => (
                    <div key={c.id_curso} className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl p-3.5 hover:bg-white/10 transition-colors">
                      <span className="font-bold text-sm text-white">{c.nombre}</span>
                      <span className="text-xs text-white/45 bg-white/5 px-2.5 py-1 rounded-full">{c.jornada}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-white/40 text-xs py-8">No hay cursos creados aún.</p>
                )}
              </div>
            </div>

            {/* COLUMN 2: MATERIAS */}
            <div className="bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Gestión de Materias (Asignaturas)</h2>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                setActionError(null);
                setActionSuccess(null);
                const formData = new FormData(e.currentTarget);
                const nombre = formData.get('nombre') as string;
                const area = formData.get('area') as string;
                
                const res = await createSubject(nombre, area);
                setIsSubmitting(false);
                if (res.success) {
                  setActionSuccess('Materia creada correctamente.');
                  (e.target as any).reset();
                  loadCoursesAndSubjects();
                } else {
                  setActionError(res.error || 'Error al crear la materia.');
                }
              }} className="mb-6 bg-white/5 border border-white/5 rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest">Registrar Nueva Materia</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/40 mb-1">Nombre</label>
                    <input name="nombre" type="text" placeholder="Ej: Matemáticas" required className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/40 mb-1">Área Académica</label>
                    <input name="area" type="text" placeholder="Ej: Ciencias Exactas" required className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer">
                  {isSubmitting ? 'Guardando...' : 'Crear Materia'}
                </button>
              </form>

              <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
                {subjects.length > 0 ? (
                  subjects.map((s) => (
                    <div key={s.id_materia} className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl p-3.5 hover:bg-white/10 transition-colors">
                      <span className="font-bold text-sm text-white">{s.nombre}</span>
                      <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">{s.area}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-white/40 text-xs py-8">No hay materias creadas aún.</p>
                )}
              </div>
            </div>

            {(actionError || actionSuccess) && (
              <div className="col-span-full mt-4">
                {actionError && <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold">{actionError}</div>}
                {actionSuccess && <div className="p-3 bg-teal-500/10 border border-teal-500/25 rounded-xl text-teal-400 text-xs font-semibold">{actionSuccess}</div>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-cyan-500/5 blur-[50px] pointer-events-none" />
                <div>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Total Tokens Consumidos</p>
                  <p className="text-3xl font-extrabold text-white mt-2">
                    {iaLogs.reduce((acc, log) => acc + log.tokens_usados, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-white/30 mt-1">Acumulado en consultas de docentes</p>
                </div>
                <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l8.912-5.813a2 2 0 001.275-1.275L21 12l-1.912-1.912a2 2 0 00-1.275-1.275L9 3l.813 5.096A2 2 0 0011.088 9.37L15 12l-3.912 2.63a2 2 0 00-1.275 1.274z" />
                  </svg>
                </div>
              </div>
              <div className="bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6 flex items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-teal-500/5 blur-[50px] pointer-events-none" />
                <div>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Costo Estimado Acumulado</p>
                  <p className="text-3xl font-extrabold text-teal-400 mt-2">
                    ${iaLogs.reduce((acc, log) => acc + parseFloat(log.costo_estimado), 0).toFixed(4)} USD
                  </p>
                  <p className="text-xs text-white/30 mt-1">Costo real basado en el consumo de API</p>
                </div>
                <div className="w-12 h-12 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-2xl flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4">Registro de Peticiones y Auditoría</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Servicio IA</th>
                      <th className="py-3 px-4">Tokens Usados</th>
                      <th className="py-3 px-4">Costo Estimado</th>
                      <th className="py-3 px-4">Fecha de Petición</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iaLogs.length > 0 ? (
                      iaLogs.map((log) => (
                        <tr key={log.id_ia_token} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4 font-bold text-white">{log.servicio_ia}</td>
                          <td className="py-3 px-4 text-white/70">{log.tokens_usados.toLocaleString()}</td>
                          <td className="py-3 px-4 text-teal-400 font-medium">${parseFloat(log.costo_estimado).toFixed(5)} USD</td>
                          <td className="py-3 px-4 text-white/40">
                            {log.fecha_peticion ? new Date(log.fecha_peticion).toLocaleString('es-CO') : 'Reciente'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-white/30">No hay registros de uso de IA para esta institución.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings_profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            {/* LOGO UPLOAD COLUMN */}
            <div className="bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center space-y-6">
              <h3 className="text-sm font-bold text-white text-center w-full">Escudo / Logotipo Institucional</h3>
              
              <div className="relative group w-40 h-40 rounded-2xl bg-indigo-600/5 border-2 border-dashed border-white/20 hover:border-indigo-500/50 flex flex-col items-center justify-center overflow-hidden transition-all shrink-0">
                <img 
                  src={`https://gxtuarqsfqrdvksmuioe.supabase.co/storage/v1/object/public/logos/${idInstitucion}/logo.png?t=${logoTimestamp}`} 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  alt="Escudo Oficial" 
                  className="w-32 h-32 object-contain" 
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer">
                  <svg className="w-6 h-6 text-white mb-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-[10px] text-white font-bold">Cambiar Escudo</span>
                </div>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  disabled={isSubmitting}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !idInstitucion) return;
                    
                    if (file.size > 1024 * 1024) {
                      setActionError('La imagen no puede pesar más de 1 MB.');
                      return;
                    }

                    setIsSubmitting(true);
                    setActionError(null);
                    setActionSuccess(null);

                    const reader = new FileReader();
                    reader.onloadend = async () => {
                      const base64 = reader.result as string;
                      const res = await uploadInstitutionLogo(idInstitucion, base64, file.type);
                      setIsSubmitting(false);
                      if (res.success) {
                        setActionSuccess('El logotipo se ha subido correctamente.');
                        setLogoTimestamp(Date.now());
                        setTimeout(() => {
                          window.location.reload();
                        }, 500);
                      } else {
                        setActionError(res.error || 'Error al subir la imagen.');
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                />
              </div>

              <p className="text-[11px] text-white/40 text-center leading-relaxed">
                Formatos recomendados: PNG o JPG.<br/>Tamaño óptimo: 512x512px, máx 1MB.
              </p>
            </div>

            {/* PROFILE DETAILS FORM */}
            <div className="lg:col-span-2 bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-5 border-b border-white/5 pb-3">Información de la Institución</h3>
              {institution ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  setActionError(null);
                  setActionSuccess(null);
                  const formData = new FormData(e.currentTarget);
                  const nombre = formData.get('nombre') as string;
                  const nit = formData.get('nit') as string;
                  const dominio = formData.get('dominio') as string || null;

                  const res = await updateInstitutionInfo(nombre, nit, dominio);
                  setIsSubmitting(false);
                  if (res.success) {
                    setActionSuccess('La información institucional se actualizó correctamente.');
                    loadInstitutionInfo();
                  } else {
                    setActionError(res.error || 'Error al actualizar información.');
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/40 mb-1">Nombre Legal de la Institución</label>
                    <input name="nombre" type="text" defaultValue={institution.nombre_legal} required className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-white/40 mb-1">NIT / Identificación Fiscal</label>
                      <input name="nit" type="text" defaultValue={institution.nit} required className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-white/40 mb-1">Dominio Personalizado (DNS)</label>
                      <input name="dominio" type="text" defaultValue={institution.dominio_personalizado || ''} placeholder="Ej: micolegio.edu.co" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer">
                      {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 bg-white/5 rounded-xl" />
                  <div className="h-10 bg-white/5 rounded-xl" />
                </div>
              )}

              {(actionError || actionSuccess) && (
                <div className="mt-4">
                  {actionError && <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold">{actionError}</div>}
                  {actionSuccess && <div className="p-3 bg-teal-500/10 border border-teal-500/25 rounded-xl text-teal-400 text-xs font-semibold">{actionSuccess}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings_plans' && <SubscriptionManager />}

        {activeTab === 'settings_academic' && (
          <div className="bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6 max-w-2xl animate-in fade-in duration-300">
            <h2 className="text-lg font-bold text-white mb-4">Configuración del Año Académico</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-indigo-500/5 border border-indigo-500/25 rounded-2xl p-4">
                <svg className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-bold text-indigo-200">
                    {isOnboardingComplete ? 'Configuración Completa' : 'Configuración Pendiente'}
                  </h4>
                  <p className="text-xs text-white/50 leading-relaxed mt-1">
                    La parametrización inicial del año lectivo (como el número de periodos, las escalas de valoración de desempeño, y los logros institucionales) se define mediante el asistente interactivo.
                  </p>
                </div>
              </div>

              {isOnboardingComplete ? (
                <div className="p-4 bg-teal-500/5 border border-teal-500/25 rounded-2xl text-xs text-teal-300 leading-relaxed">
                  ✅ Tu año académico ya ha sido configurado y las planillas de los docentes están operativas. Si necesitas volver a configurar o modificar los rangos de notas y periodos, puedes reiniciar el asistente.
                </div>
              ) : (
                <div className="p-4 bg-amber-500/5 border border-amber-500/25 rounded-2xl text-xs text-amber-300 leading-relaxed">
                  ⚠️ El asistente de configuración inicial no se ha completado. Los docentes no podrán subir calificaciones ni planificar materias hasta que se definan los periodos académicos y la escala de notas.
                </div>
              )}

              <div className="pt-4 border-t border-white/5">
                <button
                  onClick={() => {
                    sessionStorage.removeItem('onboarding_dismissed');
                    setDismissedOnboarding(false);
                    setIsOnboardingComplete(false);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  {isOnboardingComplete ? 'Reiniciar Asistente (Onboarding)' : 'Iniciar Configuración'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings_admins' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            {/* REGISTER NEW ADMIN */}
            <div className="bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4">Registrar Administrador Adicional</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                setActionError(null);
                setActionSuccess(null);
                const formData = new FormData(e.currentTarget);
                const nombre = formData.get('nombre') as string;
                const email = formData.get('email') as string;
                const contrasena = formData.get('contrasena') as string;

                const res = await createAdditionalAdmin(nombre, email, contrasena);
                setIsSubmitting(false);
                if (res.success) {
                  setActionSuccess('Administrador registrado con éxito.');
                  (e.target as any).reset();
                  loadAdmins();
                } else {
                  setActionError(res.error || 'Error al registrar el administrador.');
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1">Nombre Completo</label>
                  <input name="nombre" type="text" required placeholder="Ej: Coordinador Carlos" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1">Correo Electrónico</label>
                  <input name="email" type="email" required placeholder="Ej: carlos@micolegio.edu.co" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/40 mb-1">Contraseña Provisional</label>
                  <input name="contrasena" type="password" required placeholder="Mínimo 8 caracteres" className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer">
                  {isSubmitting ? 'Registrando...' : 'Registrar Administrador'}
                </button>
              </form>

              {(actionError || actionSuccess) && (
                <div className="mt-4">
                  {actionError && <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold">{actionError}</div>}
                  {actionSuccess && <div className="p-3 bg-teal-500/10 border border-teal-500/25 rounded-xl text-teal-400 text-xs font-semibold">{actionSuccess}</div>}
                </div>
              )}
            </div>

            {/* LIST OF ADMINS */}
            <div className="lg:col-span-2 bg-[#0c1220]/75 border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4">Administradores Registrados</h3>
              <div className="overflow-y-auto max-h-[400px] space-y-3 pr-1">
                {admins.length > 0 ? (
                  admins.map((admin) => (
                    <div key={admin.id_usuario} className="flex justify-between items-center bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                      <div>
                        <p className="font-bold text-sm text-white">{admin.nombre_completo}</p>
                        <p className="text-xs text-white/40 mt-0.5">{admin.email}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-3 py-1 rounded-full">
                        ADMIN
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-white/40 text-xs py-8">Cargando administradores...</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cierre' && <CierrePeriodoManager students={students} />}

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
