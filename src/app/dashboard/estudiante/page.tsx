'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { IconHome, IconNotebook, IconChecklist, IconLogout, IconSparkles } from '@/components/icons';

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

export default function EstudianteDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  
  // State
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState<string>('');
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'grades' | 'absences'>('grades');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudentData() {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser || currentUser.app_metadata?.rol !== 'ESTUDIANTE') {
        router.push('/login');
        return;
      }

      const idInstitucion = currentUser.app_metadata?.id_institucion;

      // 1. Get student enrollment for current year (2026)
      const { data: matricula } = await supabase
        .from('estudiantes_matriculados')
        .select(`
          id_matricula,
          id_curso,
          cursos (nombre)
        `)
        .eq('id_estudiante', currentUser.id)
        .eq('ano_lectivo', new Date().getFullYear())
        .maybeSingle();

      if (!matricula) {
        setLoading(false);
        return;
      }

      setCourseName(matricula.cursos?.nombre || 'Sin Curso');

      // 2. Fetch all assignments for this student's course
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

      if (!assignments) {
        setLoading(false);
        return;
      }

      // 3. Fetch grades for this student
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

      // 4. Fetch absences for this student
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

      // 5. Map everything into StudentSubject records
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
      setLoading(false);
    }
    loadStudentData();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Helper calculations
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
    return 'En Riesgo Académico';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-indigo-400 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-white/60 text-sm">Cargando tu Portal Académico...</p>
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

      {/* Student Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col justify-between shrink-0 bg-[#0c1220]/90 backdrop-blur-md relative z-10 h-full">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="p-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <img src="/favicon.png" alt="Sophos Core Logo" className="w-8 h-8 object-contain rounded-lg shadow-lg shadow-indigo-500/20" />
              <span className="text-lg font-bold tracking-tight text-white">
                Portal<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"> Estudiante</span>
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1 overflow-y-auto flex-1">
            <button
              onClick={() => setActiveTab('grades')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'grades'
                  ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <IconNotebook /> Mis Calificaciones
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
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-[#0a0f1b] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-300 font-bold uppercase shrink-0">
              {user?.email?.charAt(0) ?? 'E'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white/95 truncate">
                {user?.user_metadata?.nombre_completo || 'Estudiante'}
              </p>
              <p className="text-xs text-white/40 truncate">Curso {courseName}</p>
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
      <main className="flex-1 overflow-y-auto relative z-10">
        
        {/* Header */}
        <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Mi Rendimiento Académico</h1>
            <p className="text-sm text-white/50 mt-1">Curso actual: <strong className="text-indigo-400">{courseName}</strong> • Año lectivo 2026</p>
          </div>
        </header>

        {/* Grid Stats */}
        <div className="p-8 pb-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cumul average */}
            <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-md">
              <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Promedio Acumulado</div>
              <div className="text-3xl font-extrabold text-white mt-2 flex items-baseline gap-2">
                {getCumulativeAverage()}
                <span className="text-xs text-white/30 font-medium">/ 5.0</span>
              </div>
            </div>

            {/* Total absences */}
            <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-md">
              <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Inasistencias Reportadas</div>
              <div className="text-3xl font-extrabold text-white mt-2">
                {absences.length}
                <span className="text-xs text-white/30 font-medium ml-2">clases perdidas</span>
              </div>
            </div>

            {/* Academic status */}
            <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-md">
              <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Semáforo Académico</div>
              <div className="text-3xl font-extrabold mt-2">
                <span className={`${
                  getAcademicStatus() === 'Excelente' 
                    ? 'text-teal-400' 
                    : getAcademicStatus() === 'Aprobando' 
                      ? 'text-indigo-400' 
                      : 'text-red-400 animate-pulse'
                }`}>
                  {getAcademicStatus()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          
          {/* TAB 1: GRADES */}
          {activeTab === 'grades' && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-wider bg-white/[0.01]">
                        <th className="py-4 px-6">Asignatura</th>
                        <th className="py-4 px-6 text-center">Periodo 1</th>
                        <th className="py-4 px-6 text-center">Periodo 2</th>
                        <th className="py-4 px-6 text-center">Periodo 3</th>
                        <th className="py-4 px-6 text-center">Periodo 4</th>
                        <th className="py-4 px-6 text-center">Inasistencias</th>
                        <th className="py-4 px-6 text-right">Análisis Predictivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {subjects.map(sub => {
                        const isExpanded = expandedSubject === sub.id_asignacion;

                        return (
                          <React.Fragment key={sub.id_asignacion}>
                            <tr className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-4 px-6">
                                <span className="text-xs font-semibold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase">
                                  {sub.materiaArea}
                                </span>
                                <h4 className="text-base font-bold text-white mt-1.5">{sub.materiaNombre}</h4>
                                <p className="text-[11px] text-white/40 font-normal mt-0.5">Docente: {sub.docenteNombre}</p>
                              </td>

                              {/* Period 1 */}
                              <td className="py-4 px-6 text-center">
                                <span className={`text-sm font-bold px-2 py-1 rounded ${
                                  sub.grades.find(g => g.periodo === 1)
                                    ? (sub.grades.find(g => g.periodo === 1)?.nota || 0) >= 3.0 ? 'text-teal-400 bg-teal-500/5' : 'text-red-400 bg-red-500/5'
                                    : 'text-white/20'
                                }`}>
                                  {sub.grades.find(g => g.periodo === 1)?.nota.toFixed(1) || '-.-'}
                                </span>
                              </td>

                              {/* Period 2 */}
                              <td className="py-4 px-6 text-center">
                                <span className={`text-sm font-bold px-2 py-1 rounded ${
                                  sub.grades.find(g => g.periodo === 2)
                                    ? (sub.grades.find(g => g.periodo === 2)?.nota || 0) >= 3.0 ? 'text-teal-400 bg-teal-500/5' : 'text-red-400 bg-red-500/5'
                                    : 'text-white/20'
                                }`}>
                                  {sub.grades.find(g => g.periodo === 2)?.nota.toFixed(1) || '-.-'}
                                </span>
                              </td>

                              {/* Period 3 */}
                              <td className="py-4 px-6 text-center">
                                <span className={`text-sm font-bold px-2 py-1 rounded ${
                                  sub.grades.find(g => g.periodo === 3)
                                    ? (sub.grades.find(g => g.periodo === 3)?.nota || 0) >= 3.0 ? 'text-teal-400 bg-teal-500/5' : 'text-red-400 bg-red-500/5'
                                    : 'text-white/20'
                                }`}>
                                  {sub.grades.find(g => g.periodo === 3)?.nota.toFixed(1) || '-.-'}
                                </span>
                              </td>

                              {/* Period 4 */}
                              <td className="py-4 px-6 text-center">
                                <span className={`text-sm font-bold px-2 py-1 rounded ${
                                  sub.grades.find(g => g.periodo === 4)
                                    ? (sub.grades.find(g => g.periodo === 4)?.nota || 0) >= 3.0 ? 'text-teal-400 bg-teal-500/5' : 'text-red-400 bg-red-500/5'
                                    : 'text-white/20'
                                }`}>
                                  {sub.grades.find(g => g.periodo === 4)?.nota.toFixed(1) || '-.-'}
                                </span>
                              </td>

                              {/* Absences count */}
                              <td className="py-4 px-6 text-center">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  sub.absencesCount > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-white/30'
                                }`}>
                                  {sub.absencesCount}
                                </span>
                              </td>

                              {/* Expand IA comment */}
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => setExpandedSubject(isExpanded ? null : sub.id_asignacion)}
                                  className="flex items-center gap-1 ml-auto px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/20 transition-all"
                                >
                                  <IconSparkles className="w-3.5 h-3.5" />
                                  {isExpanded ? 'Ocultar IA' : 'Ver IA'}
                                </button>
                              </td>
                            </tr>
                            
                            {/* Expanded sub-row containing comments */}
                            {isExpanded && (
                              <tr className="bg-indigo-600/[0.02]">
                                <td colSpan={7} className="p-6 border-b border-white/10">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Docente observations */}
                                    <div className="space-y-2">
                                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-white/40">Observaciones del Profe</h5>
                                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70 italic">
                                        {sub.grades.map(g => {
                                          if (!g.comentario_docente) return null;
                                          return (
                                            <p key={g.id_calificacion} className="mb-1.5 last:mb-0">
                                              <strong>Periodo {g.periodo}:</strong> &ldquo;{g.comentario_docente}&rdquo;
                                            </p>
                                          );
                                        }).filter(Boolean).length > 0 
                                          ? sub.grades.map(g => g.comentario_docente && (
                                              <p key={g.id_calificacion} className="mb-1.5 last:mb-0">
                                                <strong>P{g.periodo}:</strong> &ldquo;{g.comentario_docente}&rdquo;
                                              </p>
                                            ))
                                          : 'No hay comentarios del profesor registrados.'
                                        }
                                      </div>
                                    </div>

                                    {/* AI comment */}
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-1.5">
                                        <IconSparkles className="w-3.5 h-3.5 text-indigo-400" />
                                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Análisis Predictivo (IA)</h5>
                                      </div>
                                      <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-200/90 leading-relaxed italic">
                                        {sub.grades.map(g => {
                                          if (!g.comentario_ia) return null;
                                          return (
                                            <p key={g.id_calificacion} className="mb-2 last:mb-0">
                                              <strong>Periodo {g.periodo}:</strong> {g.comentario_ia}
                                            </p>
                                          );
                                        }).filter(Boolean).length > 0 
                                          ? sub.grades.map(g => g.comentario_ia && (
                                              <p key={g.id_calificacion} className="mb-2 last:mb-0">
                                                <strong>P{g.periodo}:</strong> {g.comentario_ia}
                                              </p>
                                            ))
                                          : 'Aún no se ha generado análisis de IA. Solicita a tu profesor que registre o actualice tus notas.'
                                        }
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
            </div>
          )}

          {/* TAB 2: ABSENCES DETAIL */}
          {activeTab === 'absences' && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-wider bg-white/[0.01]">
                        <th className="py-4 px-6">Fecha</th>
                        <th className="py-4 px-6">Materia</th>
                        <th className="py-4 px-6">Tipo de Falta</th>
                        <th className="py-4 px-6">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {absences.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-white/35">
                            ¡Excelente! No tienes inasistencias registradas.
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
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {abs.estado === 'FALTA_JUSTIFICADA' ? 'Justificada' : 'Injustificada'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-white/45">
                              {abs.estado === 'FALTA_JUSTIFICADA' 
                                ? 'Excusado formalmente' 
                                : 'Requiere justificación del acudiente'}
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

        </div>
      </main>
    </div>
  );
}
