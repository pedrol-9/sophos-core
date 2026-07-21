'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { 
  IconNotebook, IconChecklist, IconLogout, IconSparkles, IconUser
} from '@/components/icons';
import { signObservacion } from '@/app/actions/observador-actions';
import { ThemeToggle } from '@/components/ThemeToggle';

interface SubjectGrade {
  id_calificacion: string;
  nota: number;
  periodo: number;
  comentario_docente: string | null;
  comentario_ia: string | null;
}

interface StudentSubject {
  id_asignacion: string;
  materiaNombre: string;
  materiaArea: string;
  docenteNombre: string;
  grades: SubjectGrade[];
  absencesCount: number;
}

interface AbsenceRecord {
  id_asistencia: string;
  fecha: string;
  estado: 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA';
  materiaNombre: string;
}

interface ObservadorRecord {
  id_observador: string;
  tipo_nota: 'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO';
  observacion_informal: string;
  observacion_formal_ia: string | null;
  fecha_registro: string;
  docenteNombre: string;
  firmado: boolean;
  fecha_firma: string | null;
  firmado_por: string | null;
  firmadorNombre?: string;
}

interface KidProfile {
  id_estudiante: string;
  parentesco: string;
  nombre_completo: string;
  email: string;
}

export default function AcudienteDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  // Loading States
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // Family data
  const [kids, setKids] = useState<KidProfile[]>([]);
  const [selectedKid, setSelectedKid] = useState<KidProfile | null>(null);

  // Selected student academic data
  const [courseName, setCourseName] = useState<string>('');
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [observadorLogs, setObservadorLogs] = useState<ObservadorRecord[]>([]);

  // Navigation
  const [activeTab, setActiveTab] = useState<'grades' | 'absences' | 'observador'>('grades');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // Firma digital
  const [signingObsId, setSigningObsId] = useState<string | null>(null);

  // Modal de confirmación / alerta personalizado
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'confirm';
    onConfirm?: () => void;
  } | null>(null);

  // 1. Initial Load: Authenticate and Load related students
  useEffect(() => {
    async function loadInitialData() {
      setLoadingUser(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser || currentUser.app_metadata?.rol !== 'ACUDIENTE') {
        router.push('/login');
        return;
      }

      // Query parent-student relations
      const { data: relations, error: relError } = await supabase
        .from('perfiles_acudientes_estudiantes')
        .select(`
          id_estudiante,
          parentesco,
          usuarios!perfiles_acudientes_estudiantes_id_estudiante_fkey (
            nombre_completo,
            email
          )
        `)
        .eq('id_acudiente', currentUser.id);

      if (relError) {
        console.error("Error loading acudidos:", relError);
        setLoadingUser(false);
        return;
      }

      if (relations && relations.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedKids: KidProfile[] = relations.map((r: any) => ({
          id_estudiante: r.id_estudiante,
          parentesco: r.parentesco || 'Acudido',
          nombre_completo: r.usuarios?.nombre_completo || 'Estudiante',
          email: r.usuarios?.email || '',
        }));

        setKids(mappedKids);
        setSelectedKid(mappedKids[0]); // Default to first child
      }

      setLoadingUser(false);
    }

    loadInitialData();
  }, [supabase, router]);

  // 2. Load academic data whenever selectedKid changes
  useEffect(() => {
    async function loadKidAcademicData() {
      if (!selectedKid) return;

      setLoadingData(true);
      setSubjects([]);
      setAbsences([]);
      setObservadorLogs([]);

      // a. Get enrollment for current year (2026)
      const { data: matricula } = await supabase
        .from('estudiantes_matriculados')
        .select(`
          id_matricula,
          id_curso,
          cursos (nombre)
        `)
        .eq('id_estudiante', selectedKid.id_estudiante)
        .eq('ano_lectivo', new Date().getFullYear())
        .maybeSingle();

      if (!matricula) {
        setCourseName('Sin Matrícula Activa');
        setLoadingData(false);
        return;
      }

      setCourseName(matricula.cursos?.nombre || 'Sin Curso');

      // b. Fetch all assignments for this course
      const { data: assignments } = await supabase
        .from('asignaciones_academicas')
        .select(`
          id_asignacion,
          id_materia,
          materias (nombre, area),
          usuarios (nombre_completo)
        `)
        .eq('id_curso', matricula.id_curso)
        .eq('ano_lectivo', new Date().getFullYear());

      // c. Fetch grades
      const { data: grades } = await supabase
        .from('calificaciones')
        .select('id_calificacion, nota, periodo, comentario_docente, comentario_ia, id_asignacion')
        .eq('id_matricula', matricula.id_matricula);

      // d. Fetch absences
      const { data: absenceData } = await (supabase as any)
        .from('asistencias')
        .select(`
          id_asistencia,
          fecha,
          estado,
          id_asignacion,
          asignaciones_academicas (
            materias (nombre)
          )
        `)
        .eq('id_matricula', matricula.id_matricula)
        .order('fecha', { ascending: false });

      // e. Fetch Observador Digital logs
      const { data: obsData } = await (supabase as any)
        .from('observador_estudiantes')
        .select(`
          id_observador,
          tipo_nota,
          observacion_informal,
          observacion_formal_ia,
          fecha_registro,
          firmado,
          fecha_firma,
          firmado_por,
          usuarios!observador_estudiantes_id_docente_fkey (nombre_completo),
          firmador:usuarios!observador_estudiantes_firmado_por_fkey (nombre_completo)
        `)
        .eq('id_estudiante', selectedKid.id_estudiante)
        .order('fecha_registro', { ascending: false });

      // Map subjects
      if (assignments) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedSubjects: StudentSubject[] = assignments.map((ass: any) => {
          const studentGrades = (grades || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((g: any) => g.id_asignacion === ass.id_asignacion)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((g: any) => ({
              id_calificacion: g.id_calificacion,
              nota: g.nota,
              periodo: g.periodo,
              comentario_docente: g.comentario_docente,
              comentario_ia: g.comentario_ia,
            }));

          const subAbsencesCount = (absenceData || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((a: any) => a.id_asignacion === ass.id_asignacion).length;

          return {
            id_asignacion: ass.id_asignacion,
            materiaNombre: ass.materias?.nombre || 'Asignatura',
            materiaArea: ass.materias?.area || 'General',
            docenteNombre: ass.usuarios?.nombre_completo || 'Docente no asignado',
            grades: studentGrades,
            absencesCount: subAbsencesCount,
          };
        });

        setSubjects(mappedSubjects);
      }

      // Map absences list
      if (absenceData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedAbsences: AbsenceRecord[] = absenceData.map((a: any) => ({
          id_asistencia: a.id_asistencia,
          fecha: a.fecha,
          estado: a.estado,
          materiaNombre: a.asignaciones_academicas?.materias?.nombre || 'Asignatura',
        }));
        setAbsences(mappedAbsences);
      }

      // Map observador logs
      if (obsData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mappedObs: ObservadorRecord[] = obsData.map((o: any) => ({
          id_observador: o.id_observador,
          tipo_nota: o.tipo_nota,
          observacion_informal: o.observacion_informal,
          observacion_formal_ia: o.observacion_formal_ia,
          fecha_registro: o.fecha_registro,
          docenteNombre: o.usuarios?.nombre_completo || 'Docente',
          firmado: o.firmado,
          fecha_firma: o.fecha_firma,
          firmado_por: o.firmado_por,
          firmadorNombre: o.firmador?.nombre_completo || 'Acudiente'
        }));
        setObservadorLogs(mappedObs);
      }

      setLoadingData(false);
    }

    loadKidAcademicData();
  }, [selectedKid, supabase]);

  const handleSignObservacion = async (idObservador: string) => {
    setSigningObsId(idObservador);
    const res = await signObservacion(idObservador);
    if (res.error) {
      setModalConfig({
        show: true,
        title: 'Error al Firmar',
        message: `Error al registrar firma digital: ${res.error}`,
        type: 'error'
      });
    } else {
      setModalConfig({
        show: true,
        title: 'Firma Registrada',
        message: '¡Anotación firmada correctamente como enterado!',
        type: 'success'
      });
      // Update local state
      setObservadorLogs(prev => prev.map(item => {
        if (item.id_observador === idObservador) {
          return {
            ...item,
            firmado: true,
            fecha_firma: new Date().toISOString(),
            firmadorNombre: user?.user_metadata?.nombre_completo || 'Acudiente'
          };
        }
        return item;
      }));
    }
    setSigningObsId(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Calculations
  const getAllGrades = () => {
    return subjects.flatMap(s => s.grades.map(g => g.nota));
  };

  const getCumulativeAverage = () => {
    const allGrades = getAllGrades();
    if (allGrades.length === 0) return '-.-';
    const sum = allGrades.reduce((acc, curr) => acc + curr, 0);
    return (sum / allGrades.length).toFixed(1);
  };

  const getAcademicStatus = () => {
    const avgText = getCumulativeAverage();
    if (avgText === '-.-') return 'Sin registros';
    const avg = parseFloat(avgText);
    if (avg >= 4.5) return 'Excelente';
    if (avg >= 3.0) return 'Aprobando';
    return 'Alerta Académica';
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-primary mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-muted-foreground text-sm font-medium">Cargando tu Portal de Acudiente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground font-sans flex overflow-hidden relative">
      {/* Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Parent Sidebar */}
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
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-background border border-border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-muted-foreground text-xs font-semibold transition-all duration-200 cursor-pointer"
          >
            <IconLogout /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10 flex flex-col custom-scrollbar">
        
        {/* Header containing Kid Selector */}
        <header className="px-8 py-6 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-20 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Seguimiento de Acudidos</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Consulta las notas y reportes institucionales de tus hijos matriculados.</p>
            </div>
          </div>

          {/* Kid Selector Cards */}
          {kids.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 max-w-full custom-scrollbar">
              {kids.map(kid => (
                <button
                  key={kid.id_estudiante}
                  onClick={() => setSelectedKid(kid)}
                  className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 cursor-pointer ${
                    selectedKid?.id_estudiante === kid.id_estudiante
                      ? 'bg-primary/15 border-primary text-foreground shadow-xs'
                      : 'bg-card border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm uppercase shrink-0">
                    {kid.nombre_completo.charAt(0)}
                  </div>
                  <div>
                    <span className="block text-xs font-bold">{kid.nombre_completo}</span>
                    <span className="block text-[9px] text-muted-foreground font-normal capitalize mt-0.5">{kid.parentesco}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-600 dark:text-amber-300">
              No tienes ningún estudiante asociado a tu cuenta de acudiente. Contacta al administrador del colegio para vincular a tus hijos.
            </div>
          )}
        </header>

        {/* Loading academic data indicator */}
        {loadingData ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <svg className="animate-spin w-7 h-7 text-primary mx-auto" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-muted-foreground text-xs font-medium">Cargando reporte de {selectedKid?.nombre_completo}...</p>
            </div>
          </div>
        ) : selectedKid ? (
          <div className="flex-1 flex flex-col">
            
            {/* Kid Stats Grid */}
            <div className="p-8 pb-0 shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Course Name */}
                <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-sm shadow-xs">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Curso de Matrícula</div>
                  <div className="text-2xl font-extrabold text-foreground mt-2 truncate">
                    {courseName}
                  </div>
                  <div className="text-[10px] text-primary mt-1 font-semibold">Año Lectivo {new Date().getFullYear()}</div>
                </div>

                {/* Cumulative Average */}
                <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-sm shadow-xs">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Promedio Acumulado</div>
                  <div className="text-2xl font-extrabold text-foreground mt-2 flex items-baseline gap-1.5">
                    {getCumulativeAverage()}
                    <span className="text-[11px] text-muted-foreground font-bold">/ 5.0</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">Cálculo de todas las asignaturas</div>
                </div>

                {/* Semáforo */}
                <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-sm shadow-xs">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Semáforo de Desempeño</div>
                  <div className="text-2xl font-extrabold mt-2">
                    <span className={`${
                      getAcademicStatus() === 'Excelente' 
                        ? 'text-teal-600 dark:text-teal-400' 
                        : getAcademicStatus() === 'Aprobando' 
                          ? 'text-indigo-600 dark:text-indigo-400' 
                          : 'text-rose-500 animate-pulse'
                    }`}>
                      {getAcademicStatus()}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">Estimación automática de IA</div>
                </div>

              </div>
            </div>

            {/* Tab Details */}
            <div className="p-8 flex-1">
              
              {/* TAB 1: GRADES */}
              {activeTab === 'grades' && (
                <div className="space-y-6">
                  {subjects.length === 0 ? (
                    <div className="py-12 text-center border border-border border-dashed rounded-2xl bg-card text-muted-foreground text-xs font-medium">
                      No hay materias ni calificaciones registradas para este año.
                    </div>
                  ) : (
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground text-[9px] font-bold uppercase tracking-wider bg-secondary/50">
                              <th className="py-4 px-6">Asignatura</th>
                              <th className="py-4 px-6 text-center">P1</th>
                              <th className="py-4 px-6 text-center">P2</th>
                              <th className="py-4 px-6 text-center">P3</th>
                              <th className="py-4 px-6 text-center">P4</th>
                              <th className="py-4 px-6 text-center">Faltas</th>
                              <th className="py-4 px-6 text-right">Análisis Predictivo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border text-xs">
                            {subjects.map(sub => {
                              const isExpanded = expandedSubject === sub.id_asignacion;

                              return (
                                <React.Fragment key={sub.id_asignacion}>
                                  <tr className="hover:bg-secondary/40 transition-colors">
                                    <td className="py-4 px-6">
                                      <span className="text-[9px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded uppercase">
                                        {sub.materiaArea}
                                      </span>
                                      <h4 className="text-sm font-bold text-foreground mt-1.5">{sub.materiaNombre}</h4>
                                      <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Docente: {sub.docenteNombre}</p>
                                    </td>

                                    {/* Period 1 */}
                                    <td className="py-4 px-6 text-center">
                                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                                        sub.grades.find(g => g.periodo === 1)
                                          ? (sub.grades.find(g => g.periodo === 1)?.nota || 0) >= 3.0 ? 'text-teal-600 dark:text-teal-400 bg-teal-500/10' : 'text-rose-500 bg-rose-500/10'
                                          : 'text-muted-foreground/30'
                                      }`}>
                                        {sub.grades.find(g => g.periodo === 1)?.nota.toFixed(1) || '-.-'}
                                      </span>
                                    </td>

                                    {/* Period 2 */}
                                    <td className="py-4 px-6 text-center">
                                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                                        sub.grades.find(g => g.periodo === 2)
                                          ? (sub.grades.find(g => g.periodo === 2)?.nota || 0) >= 3.0 ? 'text-teal-600 dark:text-teal-400 bg-teal-500/10' : 'text-rose-500 bg-rose-500/10'
                                          : 'text-muted-foreground/30'
                                      }`}>
                                        {sub.grades.find(g => g.periodo === 2)?.nota.toFixed(1) || '-.-'}
                                      </span>
                                    </td>

                                    {/* Period 3 */}
                                    <td className="py-4 px-6 text-center">
                                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                                        sub.grades.find(g => g.periodo === 3)
                                          ? (sub.grades.find(g => g.periodo === 3)?.nota || 0) >= 3.0 ? 'text-teal-600 dark:text-teal-400 bg-teal-500/10' : 'text-rose-500 bg-rose-500/10'
                                          : 'text-muted-foreground/30'
                                      }`}>
                                        {sub.grades.find(g => g.periodo === 3)?.nota.toFixed(1) || '-.-'}
                                      </span>
                                    </td>

                                    {/* Period 4 */}
                                    <td className="py-4 px-6 text-center">
                                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                                        sub.grades.find(g => g.periodo === 4)
                                          ? (sub.grades.find(g => g.periodo === 4)?.nota || 0) >= 3.0 ? 'text-teal-600 dark:text-teal-400 bg-teal-500/10' : 'text-rose-500 bg-rose-500/10'
                                          : 'text-muted-foreground/30'
                                      }`}>
                                        {sub.grades.find(g => g.periodo === 4)?.nota.toFixed(1) || '-.-'}
                                      </span>
                                    </td>

                                    {/* Absences count */}
                                    <td className="py-4 px-6 text-center">
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                        sub.absencesCount > 0 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 'text-muted-foreground'
                                      }`}>
                                        {sub.absencesCount}
                                      </span>
                                    </td>

                                    {/* AI comments trigger */}
                                    <td className="py-4 px-6 text-right">
                                      <button
                                        onClick={() => setExpandedSubject(isExpanded ? null : sub.id_asignacion)}
                                        className="flex items-center gap-1 ml-auto px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold border border-primary/20 transition-all cursor-pointer"
                                      >
                                        <IconSparkles className="w-3 h-3" />
                                        {isExpanded ? 'Ocultar IA' : 'Detalles / IA'}
                                      </button>
                                    </td>
                                  </tr>
                                  
                                  {/* Expanded content */}
                                  {isExpanded && (
                                    <tr className="bg-primary/5">
                                      <td colSpan={7} className="p-6 border-b border-border">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {/* Teacher feedback */}
                                          <div className="space-y-2">
                                            <h5 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Observaciones del Docente</h5>
                                            <div className="p-4 rounded-xl bg-background border border-border text-xs text-foreground italic leading-relaxed">
                                              {sub.grades.filter(g => g.comentario_docente).length > 0 ? (
                                                sub.grades.map(g => g.comentario_docente && (
                                                  <p key={g.id_calificacion} className="mb-2 last:mb-0">
                                                    <strong>Periodo {g.periodo}:</strong> &ldquo;{g.comentario_docente}&rdquo;
                                                  </p>
                                                ))
                                              ) : (
                                                'No se han registrado observaciones del profesor.'
                                              )}
                                            </div>
                                          </div>

                                          {/* IA report */}
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-1.5">
                                              <IconSparkles className="w-3.5 h-3.5 text-primary" />
                                              <h5 className="text-[9px] font-bold uppercase tracking-wider text-primary">Análisis Predictivo (IA)</h5>
                                            </div>
                                            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground leading-relaxed italic">
                                              {sub.grades.filter(g => g.comentario_ia).length > 0 ? (
                                                sub.grades.map(g => g.comentario_ia && (
                                                  <p key={g.id_calificacion} className="mb-2.5 last:mb-0">
                                                    <strong>Periodo {g.periodo}:</strong> {g.comentario_ia}
                                                  </p>
                                                ))
                                              ) : (
                                                'Aún no hay retroalimentación automática generada por el motor de IA.'
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ABSENCES */}
              {activeTab === 'absences' && (
                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground text-[9px] font-bold uppercase tracking-wider bg-secondary/50">
                            <th className="py-4 px-6">Fecha</th>
                            <th className="py-4 px-6">Asignatura</th>
                            <th className="py-4 px-6">Estado</th>
                            <th className="py-4 px-6">Detalles de excusa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-xs">
                          {absences.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-muted-foreground font-medium">
                                ¡Excelente! {selectedKid.nombre_completo} no tiene fallas de asistencia reportadas.
                              </td>
                            </tr>
                          ) : (
                            absences.map(abs => (
                              <tr key={abs.id_asistencia} className="hover:bg-secondary/40 transition-colors">
                                <td className="py-4 px-6 font-semibold text-foreground">
                                  {new Date(abs.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </td>
                                <td className="py-4 px-6 text-foreground/80">{abs.materiaNombre}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                    abs.estado === 'FALTA_JUSTIFICADA' 
                                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                                      : 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                                  }`}>
                                    {abs.estado === 'FALTA_JUSTIFICADA' ? 'Justificada' : 'Injustificada'}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-muted-foreground">
                                  {abs.estado === 'FALTA_JUSTIFICADA' 
                                    ? 'Falla justificada y aceptada por el colegio' 
                                    : 'Falla sin excusa. Requiere radicar justificación ante coordinación.'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: OBSERVADOR DIGITAL */}
              {activeTab === 'observador' && (
                <div className="space-y-6">
                  {observadorLogs.length === 0 ? (
                    <div className="py-12 text-center border border-border border-dashed rounded-2xl bg-card text-muted-foreground text-xs font-medium">
                      No hay anotaciones registradas en el Observador de este año escolar.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {observadorLogs.map(obs => (
                        <div key={obs.id_observador} className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm shadow-xs space-y-4">
                          <div className="flex flex-wrap justify-between items-start gap-3 w-full">
                            <div className="space-y-1">
                              <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                obs.tipo_nota === 'DISCIPLINARIA' 
                                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20' 
                                  : obs.tipo_nota === 'LOGRO_DESTACADO' 
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {obs.tipo_nota === 'DISCIPLINARIA' ? 'Anotación Disciplinaria' :
                                 obs.tipo_nota === 'LOGRO_DESTACADO' ? 'Reconocimiento / Logro Destacado' :
                                 'Anotación Pedagógica'}
                              </span>
                              <h4 className="text-sm font-bold text-foreground mt-2">Registrado por: {obs.docenteNombre}</h4>
                              <p className="text-[10px] text-muted-foreground">
                                Fecha de anotación: {new Date(obs.fecha_registro).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>

                            {/* Digital Sign Section */}
                            <div className="flex items-center">
                              {obs.firmado ? (
                                <div className="flex flex-col items-end text-right">
                                  <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg> Firmado de Enterado
                                  </span>
                                  <span className="text-[9px] text-muted-foreground mt-1">
                                    Por: {obs.firmadorNombre || 'Acudiente'}
                                  </span>
                                  {obs.fecha_firma && (
                                    <span className="text-[8px] text-muted-foreground/60">
                                      El {new Date(obs.fecha_firma).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleSignObservacion(obs.id_observador)}
                                  disabled={signingObsId === obs.id_observador}
                                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                                >
                                  {signingObsId === obs.id_observador ? (
                                    <>
                                      <svg className="animate-spin h-3.5 w-3.5 text-slate-950" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                      </svg> Firmando...
                                    </>
                                  ) : (
                                    <>
                                      ✍️ Firmar Enterado
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-border text-xs">
                            <div className="space-y-1.5">
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Observación Original del Docente</span>
                              <p className="text-foreground italic leading-relaxed">&ldquo;{obs.observacion_informal}&rdquo;</p>
                            </div>
                            
                            {obs.observacion_formal_ia && (
                              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-1.5 text-foreground leading-relaxed italic">
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-primary">Transcripción Formal / Pedagógica (IA)</span>
                                <p>&ldquo;{obs.observacion_formal_ia}&rdquo;</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto text-primary">
                <IconUser />
              </div>
              <h3 className="text-base font-bold text-foreground">Ningún estudiante vinculado</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No se encontraron registros de estudiantes asociados a tu parentesco. Por favor, solicita al administrador del colegio que asocie tus acudidos con tu dirección de correo electrónico.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DIALOG OVERRIDE FOR ALERTS & CONFIRMS */}
      {modalConfig?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-black/60 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-card border border-border p-6 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 space-y-4 text-left text-foreground">
            {/* Header / Icon */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                modalConfig.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500' :
                modalConfig.type === 'error' ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500' :
                'bg-amber-500/10 border border-amber-500/30 text-amber-500'
              }`}>
                {modalConfig.type === 'success' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : modalConfig.type === 'error' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <h3 className="text-base font-bold text-foreground leading-none">{modalConfig.title}</h3>
            </div>
            
            {/* Body Message */}
            <p className="text-xs text-muted-foreground leading-relaxed">{modalConfig.message}</p>
            
            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalConfig(null)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-all shadow-md cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
