'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { 
  IconNotebook, IconChecklist, IconLogout, IconSparkles, IconUser
} from '@/components/icons';
import { signObservacion } from '@/app/actions/observador-actions';

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
        .select('id_estudiante, parentesco')
        .eq('id_acudiente', currentUser.id);

      if (relError || !relations || relations.length === 0) {
        setLoadingUser(false);
        return;
      }

      // Fetch profiles for these student IDs
      const kidIds = relations.map(r => r.id_estudiante);
      const { data: profiles, error: profError } = await supabase
        .from('usuarios')
        .select('id_usuario, nombre_completo, email')
        .in('id_usuario', kidIds);

      if (profError || !profiles) {
        setLoadingUser(false);
        return;
      }

      // Map everything
      const kidsList: KidProfile[] = relations.map(r => {
        const profile = profiles.find(p => p.id_usuario === r.id_estudiante);
        return {
          id_estudiante: r.id_estudiante,
          parentesco: r.parentesco,
          nombre_completo: profile?.nombre_completo || 'Estudiante',
          email: profile?.email || ''
        };
      });

      setKids(kidsList);
      if (kidsList.length > 0) {
        setSelectedKid(kidsList[0]);
      }
      setLoadingUser(false);
    }
    loadInitialData();
  }, [supabase, router]);

  // 2. Load Selected Student Academic Data
  useEffect(() => {
    async function loadAcademicData() {
      if (!selectedKid) return;
      setLoadingData(true);
      
      const currentYear = new Date().getFullYear();

      // A. Fetch student enrollment for the current year
      const { data: matricula } = await supabase
        .from('estudiantes_matriculados')
        .select(`
          id_matricula,
          id_curso,
          cursos (nombre)
        `)
        .eq('id_estudiante', selectedKid.id_estudiante)
        .eq('ano_lectivo', currentYear)
        .maybeSingle();

      if (!matricula) {
        setCourseName('Sin matrícula activa');
        setSubjects([]);
        setAbsences([]);
        setObservadorLogs([]);
        setLoadingData(false);
        return;
      }

      setCourseName(matricula.cursos?.nombre || 'Sin Curso');

      // B. Fetch assignments for this course
      const { data: assignments } = await supabase
        .from('asignaciones_academicas')
        .select(`
          id_asignacion,
          id_materia,
          materias (nombre, area),
          usuarios (nombre_completo)
        `)
        .eq('id_curso', matricula.id_curso)
        .eq('ano_lectivo', currentYear);

      if (!assignments) {
        setSubjects([]);
        setAbsences([]);
        setObservadorLogs([]);
        setLoadingData(false);
        return;
      }

      // C. Fetch grades
      const { data: grades } = await supabase
        .from('calificaciones')
        .select('id_calificacion, nota, periodo, comentario_docente, comentario_ia, id_asignacion, id_evidencia')
        .eq('id_matricula', matricula.id_matricula);

      // Fetch evidence configurations to calculate weighted averages
      const assignmentIds = assignments.map(a => a.id_asignacion);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: configs } = await (supabase as any)
        .from('configuracion_evidencias_periodo')
        .select('id_asignacion, id_periodo, id_evidencia, activo, peso')
        .in('id_asignacion', assignmentIds);

      // D. Fetch absences
      const { data: DBabsences } = await supabase
        .from('asistencias')
        .select(`
          id_asistencia,
          fecha,
          estado,
          asignaciones_academicas (
            materias (nombre)
          )
        `)
        .eq('id_matricula', matricula.id_matricula)
        .in('estado', ['FALTA_JUSTIFICADA', 'FALTA_INJUSTIFICADA']);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsedAbsences: AbsenceRecord[] = (DBabsences || []).map((a: any) => ({
        id_asistencia: a.id_asistencia,
        fecha: a.fecha,
        estado: a.estado,
        materiaNombre: a.asignaciones_academicas?.materias?.nombre || 'Asignatura'
      }));
      setAbsences(parsedAbsences);

      // E. Map subjects list
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsedSubjects: StudentSubject[] = assignments.map((ass: any) => {
        const studentGradesRaw = (grades || []).filter(g => g.id_asignacion === ass.id_asignacion);

        // Group raw grades by period
        const gradesByPeriod: Record<number, typeof studentGradesRaw> = {};
        studentGradesRaw.forEach(g => {
          if (!gradesByPeriod[g.periodo]) {
            gradesByPeriod[g.periodo] = [];
          }
          gradesByPeriod[g.periodo].push(g);
        });

        // Compute definitive grade for each period (1, 2, 3, 4)
        const periodGrades: SubjectGrade[] = Object.keys(gradesByPeriod).map(periodStr => {
          const periodNum = parseInt(periodStr, 10);
          const periodRawGrades = gradesByPeriod[periodNum];

          let totalWeighted = 0;
          let totalWeight = 0;
          let hasWeightedGrade = false;

          periodRawGrades.forEach(g => {
            const conf = (configs || []).find(
              (c: any) => c.id_asignacion === ass.id_asignacion && c.id_evidencia === g.id_evidencia
            );

            if (conf && conf.activo) {
              totalWeighted += Number(g.nota) * Number(conf.peso);
              totalWeight += Number(conf.peso);
              hasWeightedGrade = true;
            }
          });

          let rawAverage = 0;
          if (hasWeightedGrade && totalWeight > 0) {
            rawAverage = totalWeighted / totalWeight;
          } else {
            const sum = periodRawGrades.reduce((acc, curr) => acc + Number(curr.nota), 0);
            rawAverage = sum / periodRawGrades.length;
          }

          // Redondeo a un decimal (basado en la segunda cifra decimal)
          const roundedNota = Math.round(rawAverage * 10) / 10;

          const commentsDocente = periodRawGrades
            .map(g => g.comentario_docente)
            .filter(Boolean)
            .join(' | ');

          const commentsIa = periodRawGrades
            .map(g => g.comentario_ia)
            .filter(Boolean)
            .join(' | ');

          return {
            id_calificacion: periodRawGrades[0].id_calificacion,
            nota: roundedNota,
            periodo: periodNum,
            comentario_docente: commentsDocente || null,
            comentario_ia: commentsIa || null
          };
        });

        const studentAbsencesCount = parsedAbsences.filter(
          a => a.materiaNombre === ass.materias.nombre
        ).length;

        return {
          id_asignacion: ass.id_asignacion,
          materiaNombre: ass.materias.nombre,
          materiaArea: ass.materias.area,
          docenteNombre: ass.usuarios?.nombre_completo || 'Docente Asignado',
          grades: periodGrades,
          absencesCount: studentAbsencesCount
        };
      });
      setSubjects(parsedSubjects);

      // F. Fetch Observador Digital logs
      const { data: DBobservador } = await supabase
        .from('observador_digital')
        .select(`
          id_observador,
          tipo_nota,
          observacion_informal,
          observacion_formal_ia,
          fecha_registro,
          firmado,
          fecha_firma,
          firmado_por,
          docente:usuarios!observador_digital_id_docente_fkey (nombre_completo),
          firmador:usuarios!observador_digital_firmado_por_fkey (nombre_completo)
        `)
        .eq('id_estudiante', selectedKid.id_estudiante)
        .order('fecha_registro', { ascending: false });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsedObservador: ObservadorRecord[] = (DBobservador || []).map((o: any) => ({
        id_observador: o.id_observador,
        tipo_nota: o.tipo_nota,
        observacion_informal: o.observacion_informal,
        observacion_formal_ia: o.observacion_formal_ia,
        fecha_registro: o.fecha_registro,
        firmado: o.firmado,
        fecha_firma: o.fecha_firma,
        firmado_por: o.firmado_por,
        docenteNombre: o.docente?.nombre_completo || 'Docente/Coordinador',
        firmadorNombre: o.firmador?.nombre_completo
      }));
      setObservadorLogs(parsedObservador);

      setLoadingData(false);
    }
    loadAcademicData();
  }, [selectedKid, supabase]);

  const [signingObsId, setSigningObsId] = useState<string | null>(null);

  const handleSignObservacion = async (idObservador: string) => {
    setSigningObsId(idObservador);
    const res = await signObservacion(idObservador);
    if (res.error) {
      setModalConfig({
        show: true,
        title: 'Error al Firmar',
        message: `Error al firmar de enterado: ${res.error}`,
        type: 'error'
      });
    } else {
      // Re-fetch only observador logs to update state immediately
      if (selectedKid) {
        const { data: DBobservador } = await supabase
          .from('observador_digital')
          .select(`
            id_observador,
            tipo_nota,
            observacion_informal,
            observacion_formal_ia,
            fecha_registro,
            firmado,
            fecha_firma,
            firmado_por,
            docente:usuarios!observador_digital_id_docente_fkey (nombre_completo),
            firmador:usuarios!observador_digital_firmado_por_fkey (nombre_completo)
          `)
          .eq('id_estudiante', selectedKid.id_estudiante)
          .order('fecha_registro', { ascending: false });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsedObservador: ObservadorRecord[] = (DBobservador || []).map((o: any) => ({
          id_observador: o.id_observador,
          tipo_nota: o.tipo_nota,
          observacion_informal: o.observacion_informal,
          observacion_formal_ia: o.observacion_formal_ia,
          fecha_registro: o.fecha_registro,
          firmado: o.firmado,
          fecha_firma: o.fecha_firma,
          firmado_por: o.firmado_por,
          docenteNombre: o.docente?.nombre_completo || 'Docente/Coordinador',
          firmadorNombre: o.firmador?.nombre_completo
        }));
        setObservadorLogs(parsedObservador);
      }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-indigo-400 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-white/60 text-sm">Cargando tu Portal de Acudiente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-white/90 font-sans flex overflow-hidden relative">
      {/* Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Parent Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col justify-between shrink-0 bg-[#0c1220]/90 backdrop-blur-md relative z-10 h-full">
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Logo */}
          <div className="p-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <img src="/favicon.png" alt="Sophos Core Logo" className="w-8 h-8 object-contain rounded-lg shadow-lg shadow-indigo-500/20" />
              <span className="text-lg font-bold tracking-tight text-white">
                Portal<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"> Acudiente</span>
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="p-4 space-y-1 overflow-y-auto flex-1">
            <button
              onClick={() => setActiveTab('grades')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'grades'
                  ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <IconNotebook /> Calificaciones
            </button>
            <button
              onClick={() => setActiveTab('absences')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'absences'
                  ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <IconChecklist /> Reporte de Faltas
            </button>
            <button
              onClick={() => setActiveTab('observador')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'observador'
                  ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <IconUser className="w-5 h-5" /> Observador Digital
            </button>
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-[#0a0f1b] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-300 font-bold uppercase shrink-0">
              {user?.email?.charAt(0) ?? 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white/95 truncate">
                {user?.user_metadata?.nombre_completo || 'Acudiente'}
              </p>
              <p className="text-xs text-white/40 truncate">Familia / Acudiente</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-white/70 text-xs font-semibold transition-all duration-200"
          >
            <IconLogout /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10 flex flex-col">
        
        {/* Header containing Kid Selector */}
        <header className="px-8 py-6 border-b border-white/5 sticky top-0 bg-background/80 backdrop-blur-md z-20 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Seguimiento de Acudidos</h1>
              <p className="text-xs text-white/40 mt-0.5">Consulta las notas y reportes institucionales de tus hijos matriculados.</p>
            </div>
          </div>

          {/* Kid Selector Cards */}
          {kids.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-1 max-w-full">
              {kids.map(kid => (
                <button
                  key={kid.id_estudiante}
                  onClick={() => setSelectedKid(kid)}
                  className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 cursor-pointer ${
                    selectedKid?.id_estudiante === kid.id_estudiante
                      ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-white/3 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                    {kid.nombre_completo.charAt(0)}
                  </div>
                  <div>
                    <span className="block text-xs font-bold">{kid.nombre_completo}</span>
                    <span className="block text-[9px] text-white/35 font-normal capitalize mt-0.5">{kid.parentesco}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/25 text-xs text-yellow-300">
              No tienes ningún estudiante asociado a tu cuenta de acudiente. Contacta al administrador del colegio para vincular a tus hijos.
            </div>
          )}
        </header>

        {/* Loading academic data indicator */}
        {loadingData ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <svg className="animate-spin w-7 h-7 text-indigo-400 mx-auto" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-white/40 text-xs">Cargando reporte de {selectedKid?.nombre_completo}...</p>
            </div>
          </div>
        ) : selectedKid ? (
          <div className="flex-1 flex flex-col">
            
            {/* Kid Stats Grid */}
            <div className="p-8 pb-0 shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Course Name */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-md">
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider">Curso de Matrícula</div>
                  <div className="text-2xl font-extrabold text-white mt-2 truncate">
                    {courseName}
                  </div>
                  <div className="text-[10px] text-indigo-400 mt-1 font-semibold">Año Lectivo {new Date().getFullYear()}</div>
                </div>

                {/* Cumulative Average */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-md">
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider">Promedio Acumulado</div>
                  <div className="text-2xl font-extrabold text-white mt-2 flex items-baseline gap-1.5">
                    {getCumulativeAverage()}
                    <span className="text-[11px] text-white/20 font-bold">/ 5.0</span>
                  </div>
                  <div className="text-[10px] text-white/30 mt-1">Cálculo de todas las asignaturas</div>
                </div>

                {/* Semáforo */}
                <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-md">
                  <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider">Semáforo de Desempeño</div>
                  <div className="text-2xl font-extrabold mt-2">
                    <span className={`${
                      getAcademicStatus() === 'Excelente' 
                        ? 'text-teal-400' 
                        : getAcademicStatus() === 'Aprobando' 
                          ? 'text-indigo-400' 
                          : 'text-rose-400 animate-pulse'
                    }`}>
                      {getAcademicStatus()}
                    </span>
                  </div>
                  <div className="text-[10px] text-white/30 mt-1">Estimación automática de IA</div>
                </div>

              </div>
            </div>

            {/* Tab Details */}
            <div className="p-8 flex-1">
              
              {/* TAB 1: GRADES */}
              {activeTab === 'grades' && (
                <div className="space-y-6">
                  {subjects.length === 0 ? (
                    <div className="py-12 text-center border border-white/5 border-dashed rounded-2xl bg-white/[0.01] text-white/40 text-xs">
                      No hay materias ni calificaciones registradas para este año.
                    </div>
                  ) : (
                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-white/40 text-[9px] font-bold uppercase tracking-wider bg-white/[0.01]">
                              <th className="py-4 px-6">Asignatura</th>
                              <th className="py-4 px-6 text-center">P1</th>
                              <th className="py-4 px-6 text-center">P2</th>
                              <th className="py-4 px-6 text-center">P3</th>
                              <th className="py-4 px-6 text-center">P4</th>
                              <th className="py-4 px-6 text-center">Faltas</th>
                              <th className="py-4 px-6 text-right">Análisis Predictivo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs">
                            {subjects.map(sub => {
                              const isExpanded = expandedSubject === sub.id_asignacion;

                              return (
                                <React.Fragment key={sub.id_asignacion}>
                                  <tr className="hover:bg-white/[0.01] transition-colors">
                                    <td className="py-4 px-6">
                                      <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase">
                                        {sub.materiaArea}
                                      </span>
                                      <h4 className="text-sm font-bold text-white mt-1.5">{sub.materiaNombre}</h4>
                                      <p className="text-[10px] text-white/40 font-normal mt-0.5">Docente: {sub.docenteNombre}</p>
                                    </td>

                                    {/* Period 1 */}
                                    <td className="py-4 px-6 text-center">
                                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                                        sub.grades.find(g => g.periodo === 1)
                                          ? (sub.grades.find(g => g.periodo === 1)?.nota || 0) >= 3.0 ? 'text-teal-400 bg-teal-500/5' : 'text-rose-400 bg-rose-500/5'
                                          : 'text-white/15'
                                      }`}>
                                        {sub.grades.find(g => g.periodo === 1)?.nota.toFixed(1) || '-.-'}
                                      </span>
                                    </td>

                                    {/* Period 2 */}
                                    <td className="py-4 px-6 text-center">
                                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                                        sub.grades.find(g => g.periodo === 2)
                                          ? (sub.grades.find(g => g.periodo === 2)?.nota || 0) >= 3.0 ? 'text-teal-400 bg-teal-500/5' : 'text-rose-400 bg-rose-500/5'
                                          : 'text-white/15'
                                      }`}>
                                        {sub.grades.find(g => g.periodo === 2)?.nota.toFixed(1) || '-.-'}
                                      </span>
                                    </td>

                                    {/* Period 3 */}
                                    <td className="py-4 px-6 text-center">
                                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                                        sub.grades.find(g => g.periodo === 3)
                                          ? (sub.grades.find(g => g.periodo === 3)?.nota || 0) >= 3.0 ? 'text-teal-400 bg-teal-500/5' : 'text-rose-400 bg-rose-500/5'
                                          : 'text-white/15'
                                      }`}>
                                        {sub.grades.find(g => g.periodo === 3)?.nota.toFixed(1) || '-.-'}
                                      </span>
                                    </td>

                                    {/* Period 4 */}
                                    <td className="py-4 px-6 text-center">
                                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                                        sub.grades.find(g => g.periodo === 4)
                                          ? (sub.grades.find(g => g.periodo === 4)?.nota || 0) >= 3.0 ? 'text-teal-400 bg-teal-500/5' : 'text-rose-400 bg-rose-500/5'
                                          : 'text-white/15'
                                      }`}>
                                        {sub.grades.find(g => g.periodo === 4)?.nota.toFixed(1) || '-.-'}
                                      </span>
                                    </td>

                                    {/* Absences count */}
                                    <td className="py-4 px-6 text-center">
                                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                        sub.absencesCount > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-white/20'
                                      }`}>
                                        {sub.absencesCount}
                                      </span>
                                    </td>

                                    {/* AI comments trigger */}
                                    <td className="py-4 px-6 text-right">
                                      <button
                                        onClick={() => setExpandedSubject(isExpanded ? null : sub.id_asignacion)}
                                        className="flex items-center gap-1 ml-auto px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/20 transition-all cursor-pointer"
                                      >
                                        <IconSparkles className="w-3 h-3" />
                                        {isExpanded ? 'Ocultar IA' : 'Detalles / IA'}
                                      </button>
                                    </td>
                                  </tr>
                                  
                                  {/* Expanded content */}
                                  {isExpanded && (
                                    <tr className="bg-indigo-600/[0.01]">
                                      <td colSpan={7} className="p-6 border-b border-white/10">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {/* Teacher feedback */}
                                          <div className="space-y-2">
                                            <h5 className="text-[9px] font-bold uppercase tracking-wider text-white/40">Observaciones del Docente</h5>
                                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70 italic leading-relaxed">
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
                                              <IconSparkles className="w-3.5 h-3.5 text-indigo-400" />
                                              <h5 className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">Análisis Predictivo (IA)</h5>
                                            </div>
                                            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-200/90 leading-relaxed italic">
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
                  <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-white/40 text-[9px] font-bold uppercase tracking-wider bg-white/[0.01]">
                            <th className="py-4 px-6">Fecha</th>
                            <th className="py-4 px-6">Asignatura</th>
                            <th className="py-4 px-6">Estado</th>
                            <th className="py-4 px-6">Detalles de excusa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs">
                          {absences.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-12 text-center text-white/35">
                                ¡Excelente! {selectedKid.nombre_completo} no tiene fallas de asistencia reportadas.
                              </td>
                            </tr>
                          ) : (
                            absences.map(abs => (
                              <tr key={abs.id_asistencia} className="hover:bg-white/[0.01] transition-colors">
                                <td className="py-4 px-6 font-semibold text-white/90">
                                  {new Date(abs.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </td>
                                <td className="py-4 px-6 text-white/80">{abs.materiaNombre}</td>
                                <td className="py-4 px-6">
                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                    abs.estado === 'FALTA_JUSTIFICADA' 
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {abs.estado === 'FALTA_JUSTIFICADA' ? 'Justificada' : 'Injustificada'}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-white/45">
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
                    <div className="py-12 text-center border border-white/5 border-dashed rounded-2xl bg-white/[0.01] text-white/40 text-xs">
                      No hay anotaciones registradas en el Observador de este año escolar.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {observadorLogs.map(obs => (
                        <div key={obs.id_observador} className="bg-white/3 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-md space-y-4">
                          <div className="flex flex-wrap justify-between items-start gap-3 w-full">
                            <div className="space-y-1">
                              <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                obs.tipo_nota === 'DISCIPLINARIA' 
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                  : obs.tipo_nota === 'LOGRO_DESTACADO' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {obs.tipo_nota === 'DISCIPLINARIA' ? 'Anotación Disciplinaria' :
                                 obs.tipo_nota === 'LOGRO_DESTACADO' ? 'Reconocimiento / Logro Destacado' :
                                 'Anotación Pedagógica'}
                              </span>
                              <h4 className="text-sm font-bold text-white/95 mt-2">Registrado por: {obs.docenteNombre}</h4>
                              <p className="text-[10px] text-white/45">
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
                                  <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/5">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg> Firmado de Enterado
                                  </span>
                                  <span className="text-[9px] text-white/40 mt-1">
                                    Por: {obs.firmadorNombre || 'Acudiente'}
                                  </span>
                                  {obs.fecha_firma && (
                                    <span className="text-[8px] text-white/30">
                                      El {new Date(obs.fecha_firma).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleSignObservacion(obs.id_observador)}
                                  disabled={signingObsId === obs.id_observador}
                                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 active:scale-95"
                                >
                                  {signingObsId === obs.id_observador ? (
                                    <>
                                      <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
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

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-white/5 text-xs">
                            <div className="space-y-1.5">
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-white/40">Observación Original del Docente</span>
                              <p className="text-white/70 italic leading-relaxed">&ldquo;{obs.observacion_informal}&rdquo;</p>
                            </div>
                            
                            {obs.observacion_formal_ia && (
                              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1.5 text-indigo-200/90 leading-relaxed italic">
                                <span className="block text-[9px] font-bold uppercase tracking-wider text-indigo-400">Transcripción Formal / Pedagógica (IA)</span>
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
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/35 flex items-center justify-center mx-auto text-indigo-300">
                <IconUser />
              </div>
              <h3 className="text-base font-bold text-white">Ningún estudiante vinculado</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                No se encontraron registros de estudiantes asociados a tu parentesco. Por favor, solicita al administrador del colegio que asocie tus acudidos con tu dirección de correo electrónico.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DIALOG OVERRIDE FOR ALERTS & CONFIRMS */}
      {modalConfig?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[#0c1220]/95 border border-white/10 p-6 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 space-y-4 text-left">
            {/* Header / Icon */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                modalConfig.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                modalConfig.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
                'bg-amber-500/10 border border-amber-500/30 text-amber-400'
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
              <h3 className="text-base font-bold text-white leading-none">{modalConfig.title}</h3>
            </div>
            
            {/* Body Message */}
            <p className="text-xs text-white/60 leading-relaxed">{modalConfig.message}</p>
            
            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalConfig(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
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
