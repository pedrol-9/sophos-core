'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { IconHome, IconNotebook, IconChecklist, IconLogout, IconPlus, IconSparkles } from '@/components/icons';
import { 
  getTeacherAssignments, 
  getCourseStudents, 
  saveGrade, 
  saveAttendance,
  type AcademicAssignment,
  type CourseStudent 
} from '@/app/actions/teacher-actions';
import { TeacherGradebook } from '@/components/dashboard/teacher/TeacherGradebook';
import { 
  createObservacion, 
  getStudentObservations, 
  type ObservadorRecord 
} from '@/app/actions/observador-actions';

export default function DocenteDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  
  // Tabs & Views
  const [activeTab, setActiveTab] = useState<'courses' | 'attendance_tab' | 'observador_tab'>('courses');
  const [assignments, setAssignments] = useState<AcademicAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterGrade, setFilterGrade] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('');

  // Compute unique grades and subjects from academic assignments
  const uniqueGrades = Array.from(
    new Set(assignments.map(ass => ass.cursos?.nombre).filter(Boolean))
  ).sort() as string[];

  const uniqueSubjects = Array.from(
    new Set(assignments.map(ass => ass.materias?.nombre).filter(Boolean))
  ).sort() as string[];

  // Dynamic available options for cross-filtering
  const availableGrades = filterSubject
    ? Array.from(
        new Set(
          assignments
            .filter(ass => ass.materias?.nombre === filterSubject)
            .map(ass => ass.cursos?.nombre)
            .filter(Boolean)
        )
      ).sort() as string[]
    : uniqueGrades;

  const availableSubjects = filterGrade
    ? Array.from(
        new Set(
          assignments
            .filter(ass => ass.cursos?.nombre === filterGrade)
            .map(ass => ass.materias?.nombre)
            .filter(Boolean)
        )
      ).sort() as string[]
    : uniqueSubjects;

  // Filtered assignments
  const filteredAssignments = assignments.filter(ass => {
    const matchGrade = !filterGrade || ass.cursos?.nombre === filterGrade;
    const matchSubject = !filterSubject || ass.materias?.nombre === filterSubject;
    return matchGrade && matchSubject;
  });

  // Selected state for grading/attendance
  const [selectedAssignment, setSelectedAssignment] = useState<AcademicAssignment | null>(null);
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Grading form state
  const [selectedStudent, setSelectedStudent] = useState<CourseStudent | null>(null);
  const [gradingPeriod, setGradingPeriod] = useState<number>(1);
  const [gradeValue, setGradeValue] = useState<string>('');
  const [gradeComment, setGradeComment] = useState<string>('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Attendance form state
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  // Track absences locally: studentId -> 'PRESENTE' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA'
  const [localAbsences, setLocalAbsences] = useState<Record<string, 'PRESENTE' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Observador Digital state
  const [observations, setObservations] = useState<ObservadorRecord[]>([]);
  const [loadingObs, setLoadingObs] = useState(false);
  const [newObsType, setNewObsType] = useState<'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO'>('PEDAGOGICA');
  const [newObsText, setNewObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);

  // Load teacher profile & assignments
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (!currentUser || currentUser.app_metadata?.rol !== 'DOCENTE') {
        router.push('/login');
        return;
      }

      const res = await getTeacherAssignments();
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setAssignments(res.data);
      }
      setLoading(false);
    }
    loadData();
  }, [supabase, router]);

  // Load students when an assignment is selected
  const loadStudents = async (assignment: AcademicAssignment) => {
    setStudentsLoading(true);
    const res = await getCourseStudents(assignment.id_curso, assignment.id_asignacion);
    if (res.error) {
      alert(`Error al cargar alumnos: ${res.error}`);
    } else if (res.data) {
      setStudents(res.data);
      
      // Initialize local absences from DB for this assignment
      // Note: we can map currently stored absences if we query them for today, but for a fresh day it defaults to empty.
      setLocalAbsences({});
    }
    setStudentsLoading(false);
  };

  const handleSelectAssignment = (assignment: AcademicAssignment, mode: 'grade' | 'attendance') => {
    setSelectedAssignment(assignment);
    loadStudents(assignment);
    if (mode === 'attendance') {
      setActiveTab('attendance_tab');
    } else {
      setActiveTab('courses');
    }
    // Reset forms
    setSelectedStudent(null);
  };

  const handleSelectStudentForGrading = (student: CourseStudent) => {
    setSelectedStudent(student);
    // Try to find if student already has a grade for the selected period
    const existingGrade = student.grades.find(g => g.periodo === gradingPeriod);
    if (existingGrade) {
      setGradeValue(existingGrade.nota.toString());
      setGradeComment(existingGrade.comentario_docente || '');
    } else {
      setGradeValue('');
      setGradeComment('');
    }
  };

  // Update form inputs when grading period changes
  const handlePeriodChange = (period: number) => {
    setGradingPeriod(period);
    if (selectedStudent) {
      const existingGrade = selectedStudent.grades.find(g => g.periodo === period);
      if (existingGrade) {
        setGradeValue(existingGrade.nota.toString());
        setGradeComment(existingGrade.comentario_docente || '');
      } else {
        setGradeValue('');
        setGradeComment('');
      }
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment || !selectedStudent) return;

    const nota = parseFloat(gradeValue);
    if (isNaN(nota) || nota < 0 || nota > 5) {
      alert('Por favor ingresa una nota válida entre 0.0 y 5.0');
      return;
    }

    setSavingGrade(true);
    const res = await saveGrade(
      selectedAssignment.id_asignacion,
      selectedStudent.id_matricula,
      nota,
      gradingPeriod,
      gradeComment
    );

    if (res.error) {
      alert(`Error al guardar la calificación: ${res.error}`);
      setSavingGrade(false);
    } else if (res.data) {
      const savedGradeId = res.data.id_calificacion;
      
      // Refresh local students data
      await loadStudents(selectedAssignment);
      
      // Trigger AI Academic Comment Generation in Background
      setGeneratingAI(true);
      try {
        const aiRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calificacionId: savedGradeId })
        });
        const aiData = await aiRes.json();
        
        if (aiData.error) {
          console.error("AI error:", aiData.error);
        } else {
          // Re-load to see the new AI comment
          await loadStudents(selectedAssignment);
        }
      } catch (err) {
        console.error("Failed to generate AI comment:", err);
      } finally {
        setGeneratingAI(false);
      }

      setSavingGrade(false);
      // Close side panel
      setSelectedStudent(null);
    }
  };

  const handleAttendanceChange = (studentId: string, status: 'PRESENTE' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA') => {
    setLocalAbsences(prev => {
      const next = { ...prev };
      if (status === 'PRESENTE') {
        delete next[studentId]; // Assumed present
      } else {
        next[studentId] = status;
      }
      return next;
    });
  };

  const handleSaveAttendance = async () => {
    if (!selectedAssignment) return;

    setSavingAttendance(true);

    const absencesPayload = Object.entries(localAbsences)
      .filter(([_, status]) => status !== 'PRESENTE')
      .map(([studentId, status]) => {
        const student = students.find(s => s.id_estudiante === studentId);
        return {
          idMatricula: student?.id_matricula || '',
          estado: status as 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA',
          observacion: status === 'FALTA_JUSTIFICADA' ? 'Justificada por el acudiente/colegio' : undefined
        };
      }).filter(a => a.idMatricula !== '');

    const res = await saveAttendance(
      selectedAssignment.id_asignacion,
      attendanceDate,
      absencesPayload
    );

    if (res.error) {
      alert(`Error al registrar asistencia: ${res.error}`);
    } else {
      alert('¡Asistencia guardada correctamente!');
      // Refresh students details (re-fetch absences counts)
      await loadStudents(selectedAssignment);
    }
    setSavingAttendance(false);
  };

  const handleSelectStudentForObservador = async (student: CourseStudent) => {
    setSelectedStudent(student);
    setLoadingObs(true);
    const res = await getStudentObservations(student.id_estudiante);
    if (res.error) {
      alert(`Error al cargar observador: ${res.error}`);
    } else if (res.data) {
      setObservations(res.data);
    }
    setLoadingObs(false);
    // Reset form
    setNewObsText('');
    setNewObsType('PEDAGOGICA');
  };

  const handleSaveObservacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newObsText.trim()) return;

    setSavingObs(true);
    const res = await createObservacion(
      selectedStudent.id_estudiante,
      newObsType,
      newObsText
    );

    if (res.error) {
      alert(`Error al registrar novedad: ${res.error}`);
    } else {
      // Re-load observations for list
      const updated = await getStudentObservations(selectedStudent.id_estudiante);
      if (updated.data) {
        setObservations(updated.data);
      }
      setNewObsText('');
    }
    setSavingObs(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Helper to compute student's cumulative average grade
  const getAverageGrade = (student: CourseStudent) => {
    if (student.grades.length === 0) return '-';
    const sum = student.grades.reduce((acc, curr) => acc + curr.nota, 0);
    return (sum / student.grades.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-teal-400 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-white/60 text-sm">Cargando Portal Docente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#090d16] text-white/90 font-sans flex overflow-hidden relative">
      {/* Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Docente Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col justify-between shrink-0 bg-[#0c1220]/90 backdrop-blur-md relative z-10 h-full">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="p-6 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                  <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Portal<span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent"> Docente</span>
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1 overflow-y-auto flex-1">
            <button
              onClick={() => {
                setActiveTab('courses');
                setSelectedAssignment(null);
                setSelectedStudent(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'courses' && !selectedAssignment
                  ? 'bg-teal-600/15 border-l-2 border-teal-500 text-teal-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <IconNotebook /> Mis Asignaturas
            </button>
            
            {/* If an assignment is selected, show contextual navigation links */}
            {selectedAssignment && (
              <div className="pl-4 pt-2 mt-2 border-l border-white/5 space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-white/30 px-3 mb-2">
                  Curso: {selectedAssignment.cursos?.nombre}
                </p>
                <button
                  onClick={() => {
                    setActiveTab('courses');
                    setSelectedStudent(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'courses'
                      ? 'bg-teal-600/10 text-teal-300'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <IconNotebook className="w-3.5 h-3.5" /> Calificar Alumnos
                </button>
                <button
                  onClick={() => {
                    setActiveTab('attendance_tab');
                    setSelectedStudent(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'attendance_tab'
                      ? 'bg-teal-600/10 text-teal-300'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <IconChecklist className="w-3.5 h-3.5" /> Control de Faltas
                </button>
                <button
                  onClick={() => {
                    setActiveTab('observador_tab');
                    setSelectedStudent(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'observador_tab'
                      ? 'bg-teal-600/10 text-teal-300'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg> Observador Digital
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-[#0a0f1b] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/15 border border-teal-500/35 flex items-center justify-center text-teal-300 font-bold uppercase shrink-0">
              {user?.email?.charAt(0) ?? 'D'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white/95 truncate">
                {user?.user_metadata?.nombre_completo 
                  ? `Profe ${user.user_metadata.nombre_completo.trim().split(/\s+/)[0]}` 
                  : 'Profe'}
              </p>
              <p className="text-xs text-white/40 truncate">Docente</p>
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
        <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#090d16]/80 backdrop-blur-md z-20">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {!selectedAssignment 
                ? 'Mis Asignaturas Asignadas' 
                : `${selectedAssignment.materias?.nombre} - Curso ${selectedAssignment.cursos?.nombre}`}
            </h1>
            <p className="text-sm text-white/50 mt-1">
              {!selectedAssignment 
                ? 'Selecciona una asignatura para registrar calificaciones o inasistencias' 
                : `Gestionando periodo lectivo ${selectedAssignment.ano_lectivo}`}
            </p>
          </div>
          
          {selectedAssignment && (
            <button
              onClick={() => {
                setSelectedAssignment(null);
                setSelectedStudent(null);
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all"
            >
              ← Volver al listado
            </button>
          )}
        </header>

        {/* View content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* VIEW 1: Grid of courses (No course selected) */}
          {!selectedAssignment && (
            <div className="space-y-6">
              {/* Filter controls */}
              {assignments.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md items-center justify-between">
                  <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                    {/* Grado Selector */}
                    <div className="flex flex-col gap-1.5 min-w-[150px] w-full sm:w-auto">
                      <label htmlFor="filter-grade" className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                        Grado
                      </label>
                      <select
                        id="filter-grade"
                        value={filterGrade}
                        onChange={(e) => setFilterGrade(e.target.value)}
                        className="px-3.5 py-2 rounded-xl bg-[#090d16]/80 border border-white/10 hover:border-white/20 text-white text-xs font-semibold focus:outline-none focus:border-teal-500/60 focus:bg-[#0c1220] transition-all cursor-pointer"
                      >
                        <option value="" className="bg-[#090d16] text-white">Todos los grados</option>
                        {availableGrades.map(grade => (
                          <option key={grade} value={grade} className="bg-[#090d16] text-white">
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Materia Selector */}
                    <div className="flex flex-col gap-1.5 min-w-[180px] w-full sm:w-auto">
                      <label htmlFor="filter-subject" className="text-[10px] uppercase font-bold tracking-wider text-white/40">
                        Materia
                      </label>
                      <select
                        id="filter-subject"
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="px-3.5 py-2 rounded-xl bg-[#090d16]/80 border border-white/10 hover:border-white/20 text-white text-xs font-semibold focus:outline-none focus:border-teal-500/60 focus:bg-[#0c1220] transition-all cursor-pointer"
                      >
                        <option value="" className="bg-[#090d16] text-white">Todas las materias</option>
                        {availableSubjects.map(subject => (
                          <option key={subject} value={subject} className="bg-[#090d16] text-white">
                            {subject}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary / Reset */}
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-xs text-white/40 font-medium">
                      Mostrando <strong className="text-white/80">{filteredAssignments.length}</strong> de <strong className="text-white/80">{assignments.length}</strong> materias
                    </span>
                    {(filterGrade || filterSubject) && (
                      <button
                        onClick={() => {
                          setFilterGrade('');
                          setFilterSubject('');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Grid of cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  <p className="text-white/40 text-sm col-span-full">Cargando materias...</p>
                ) : assignments.length === 0 ? (
                  <div className="col-span-full py-16 text-center border border-white/5 border-dashed rounded-2xl bg-white/[0.01]">
                    <p className="text-white/40 mb-2">No tienes asignaciones académicas configuradas para este año.</p>
                  </div>
                ) : filteredAssignments.length === 0 ? (
                  <div className="col-span-full py-16 text-center border border-white/5 border-dashed rounded-2xl bg-white/[0.01]">
                    <p className="text-white/40 mb-3">No se encontraron materias que coincidan con los filtros seleccionados.</p>
                    <button
                      onClick={() => {
                        setFilterGrade('');
                        setFilterSubject('');
                      }}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                ) : (
                  filteredAssignments.map(ass => (
                    <div 
                      key={ass.id_asignacion} 
                      className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-teal-500/30 hover:bg-white/[0.04] transition-all duration-300 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 text-teal-500/10 group-hover:text-teal-500/20 transition-colors">
                        <IconNotebook className="w-10 h-10" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded">
                        {ass.materias?.area || 'Asignatura'}
                      </span>
                      <h3 className="text-xl font-bold text-white/95 mt-3 mb-1">{ass.materias?.nombre}</h3>
                      <p className="text-sm text-white/50 mb-6">Curso: <strong className="text-white/80">{ass.cursos?.nombre}</strong></p>
                      
                      <div className="flex gap-3 pt-3 border-t border-white/5">
                        <button 
                          onClick={() => handleSelectAssignment(ass, 'grade')}
                          className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-all shadow-md shadow-teal-600/10 hover:-translate-y-0.5"
                        >
                          Calificar
                        </button>
                        <button 
                          onClick={() => handleSelectAssignment(ass, 'attendance')}
                          className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all"
                        >
                          Control Faltas
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: Grading view (Assignment selected + Courses tab) */}
          {selectedAssignment && activeTab === 'courses' && (
            <TeacherGradebook 
              idAsignacion={selectedAssignment.id_asignacion} 
              idCurso={selectedAssignment.id_curso} 
            />
          )}

          {/* VIEW 3: Attendance view (Assignment selected + Attendance tab) */}
          {selectedAssignment && activeTab === 'attendance_tab' && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <label htmlFor="attendance-date-selector" className="text-xs font-medium text-white/40 uppercase tracking-wide">
                    Fecha del Reporte:
                  </label>
                  <input
                    id="attendance-date-selector"
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-teal-500/60"
                  />
                </div>
                <div className="text-[10px] text-teal-400 bg-teal-500/5 border border-teal-500/20 px-3 py-1.5 rounded-lg max-w-md">
                  <strong>Regla de negocio:</strong> Todos los estudiantes se asumen como presentes. Registra únicamente los casos que tengan falta justificada o injustificada para la fecha.
                </div>
              </div>

              {/* Students attendance list */}
              {studentsLoading ? (
                <p className="text-white/40 text-sm">Cargando listado de estudiantes...</p>
              ) : (
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-wider bg-white/[0.01]">
                          <th className="py-4 px-6">Estudiante</th>
                          <th className="py-4 px-6 text-center">Asistencia Normal</th>
                          <th className="py-4 px-6 text-center">Falta Justificada</th>
                          <th className="py-4 px-6 text-center">Falta Injustificada</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {students.map((student) => {
                          const currentStatus = localAbsences[student.id_estudiante] || 'PRESENTE';

                          return (
                            <tr key={student.id_estudiante} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-4 px-6 font-semibold text-white/90">
                                {student.nombre_completo}
                                <span className="block text-[11px] text-white/40 font-normal mt-0.5">{student.email}</span>
                              </td>
                              
                              {/* 1. Presente (Default) */}
                              <td className="py-4 px-6 text-center">
                                <input
                                  type="radio"
                                  name={`att-${student.id_estudiante}`}
                                  checked={currentStatus === 'PRESENTE'}
                                  onChange={() => handleAttendanceChange(student.id_estudiante, 'PRESENTE')}
                                  className="w-4 h-4 accent-teal-500 cursor-pointer"
                                />
                              </td>

                              {/* 2. Falta Justificada */}
                              <td className="py-4 px-6 text-center">
                                <input
                                  type="radio"
                                  name={`att-${student.id_estudiante}`}
                                  checked={currentStatus === 'FALTA_JUSTIFICADA'}
                                  onChange={() => handleAttendanceChange(student.id_estudiante, 'FALTA_JUSTIFICADA')}
                                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                                />
                              </td>

                              {/* 3. Falta Injustificada */}
                              <td className="py-4 px-6 text-center">
                                <input
                                  type="radio"
                                  name={`att-${student.id_estudiante}`}
                                  checked={currentStatus === 'FALTA_INJUSTIFICADA'}
                                  onChange={() => handleAttendanceChange(student.id_estudiante, 'FALTA_INJUSTIFICADA')}
                                  className="w-4 h-4 accent-red-500 cursor-pointer"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Save button */}
                  <div className="p-6 border-t border-white/5 flex justify-end">
                    <button
                      onClick={handleSaveAttendance}
                      disabled={savingAttendance}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-emerald-500 text-sm font-semibold text-white transition-all shadow-lg shadow-teal-600/25 disabled:opacity-60"
                    >
                      {savingAttendance ? 'Guardando...' : 'Guardar Reporte de Asistencia'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: Observador Digital view (Assignment selected + Observador tab) */}
          {selectedAssignment && activeTab === 'observador_tab' && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex justify-between items-center bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex-wrap gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Observador Digital de Convivencia</h3>
                  <p className="text-xs text-white/50 mt-0.5">Administra la hoja de vida, observaciones y reconocimientos de los estudiantes.</p>
                </div>
              </div>

              {/* Students list */}
              {studentsLoading ? (
                <p className="text-white/40 text-sm">Cargando listado de estudiantes...</p>
              ) : (
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 text-[10px] font-bold uppercase tracking-wider bg-white/[0.01]">
                          <th className="py-4 px-6">Estudiante</th>
                          <th className="py-4 px-6">Email</th>
                          <th className="py-4 px-6 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {students.map((student) => (
                          <tr key={student.id_estudiante} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 px-6 font-semibold text-white/90">
                              {student.nombre_completo}
                            </td>
                            <td className="py-4 px-6 text-white/60">
                              {student.email}
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => handleSelectStudentForObservador(student)}
                                className="px-4 py-1.5 rounded-xl bg-teal-600/10 hover:bg-teal-600/20 text-teal-400 border border-teal-500/20 hover:border-teal-500/40 text-xs font-semibold transition-all"
                              >
                                Ver / Registrar Novedad
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── SLIDE-OVER PANEL: EDIT GRADE & SHOW AI REMARK ───────────────── */}
        {selectedStudent && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md h-full bg-[#0c1220] border-l border-white/10 p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              
              <div className="space-y-6">
                {/* Panel Header */}
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <div>
                    <h2 className="text-lg font-bold text-white">Calificar Alumno</h2>
                    <p className="text-xs text-white/50 mt-0.5">{selectedStudent.nombre_completo}</p>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSaveGrade} className="space-y-4">
                  {/* Period selector (replicated in panel for context) */}
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                      Periodo Lectivo
                    </label>
                    <select
                      value={gradingPeriod}
                      onChange={(e) => handlePeriodChange(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/60"
                    >
                      <option value={1} className="bg-[#0c1220]">Periodo 1</option>
                      <option value={2} className="bg-[#0c1220]">Periodo 2</option>
                      <option value={3} className="bg-[#0c1220]">Periodo 3</option>
                      <option value={4} className="bg-[#0c1220]">Periodo 4</option>
                    </select>
                  </div>

                  {/* Grade value input */}
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                      Calificación (Escala 0.0 - 5.0)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      required
                      placeholder="Ej: 4.5"
                      value={gradeValue}
                      onChange={(e) => setGradeValue(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-teal-500/60 focus:bg-white/8 transition-all"
                    />
                  </div>

                  {/* Teacher comment */}
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                      Observación / Logros (Docente)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ej: Excelente razonamiento lógico. Presentó dificultades en ecuaciones cuadráticas pero mejoró."
                      value={gradeComment}
                      onChange={(e) => setGradeComment(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-teal-500/60 focus:bg-white/8 transition-all resize-none"
                    />
                  </div>

                  {/* Action button */}
                  <button
                    type="submit"
                    disabled={savingGrade || generatingAI}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-emerald-500 text-sm font-semibold text-white transition-all shadow-lg shadow-teal-600/20 disabled:opacity-60"
                  >
                    {savingGrade ? 'Guardando Calificación...' : 'Guardar Calificación'}
                  </button>
                </form>

                {/* AI Predictive remark section */}
                <div className="pt-6 border-t border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-teal-400">
                    <IconSparkles className="w-4 h-4 animate-pulse" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Retroalimentación IA Académica</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/10 text-xs leading-relaxed text-teal-100/90 relative min-h-[80px] flex items-center justify-center">
                    {generatingAI ? (
                      <div className="text-center space-y-2">
                        <svg className="animate-spin w-5 h-5 text-teal-400 mx-auto" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-teal-400/70 text-[10px] animate-pulse">Gemini analizando rendimiento académico...</p>
                      </div>
                    ) : (
                      <p className="italic">
                        {selectedStudent.grades.find(g => g.periodo === gradingPeriod)?.comentario_ia || 
                          'Guarda la calificación para generar automáticamente la predicción de rendimiento y alertas de la IA.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 text-center text-[10px] text-white/30 leading-relaxed">
                El análisis predictivo de IA considera el historial completo de calificaciones y las faltas reportadas para sugerir alertas tempranas de bajo rendimiento.
              </div>

            </div>
          </div>
        )}

        {/* ─── SLIDE-OVER PANEL: OBSERVADOR DIGITAL ─────────────────────────── */}
        {selectedStudent && selectedAssignment && activeTab === 'observador_tab' && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-lg h-full bg-[#0c1220] border-l border-white/10 p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                {/* Panel Header */}
                <div className="flex justify-between items-center pb-4 border-b border-white/5 shrink-0">
                  <div>
                    <h2 className="text-lg font-bold text-white">Observador Digital</h2>
                    <p className="text-xs text-white/50 mt-0.5">{selectedStudent.nombre_completo}</p>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Form to Create New Observation */}
                <form onSubmit={handleSaveObservacion} className="space-y-4 shrink-0 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">Registrar Nueva Novedad</h3>
                  
                  {/* Tipo de Nota */}
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                      Tipo de Anotación
                    </label>
                    <select
                      value={newObsType}
                      onChange={(e) => setNewObsType(e.target.value as 'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO')}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-500/60"
                    >
                      <option value="PEDAGOGICA" className="bg-[#0c1220]">Pedagógica (Seguimiento Académico/Convivencia)</option>
                      <option value="DISCIPLINARIA" className="bg-[#0c1220]">Disciplinaria (Llamado de atención / Falta)</option>
                      <option value="LOGRO_DESTACADO" className="bg-[#0c1220]">Reconocimiento / Logro Destacado</option>
                    </select>
                  </div>

                  {/* Observacion Informal */}
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                      Detalle de la Observación (Nota en bruto)
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Ej: El alumno interrumpió la clase varias veces hablando con sus compañeros. Se le llamó la atención."
                      value={newObsText}
                      onChange={(e) => setNewObsText(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs placeholder-white/20 focus:outline-none focus:border-teal-500/60 focus:bg-white/8 transition-all resize-none"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={savingObs || !newObsText.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-emerald-500 text-xs font-semibold text-white transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50"
                  >
                    {savingObs ? 'Procesando con IA Gemini...' : 'Registrar y Formalizar con IA'}
                  </button>
                </form>

                {/* History of Observations */}
                <div className="flex-1 flex flex-col min-h-0 pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3 shrink-0">Historial del Estudiante</h3>
                  
                  {loadingObs ? (
                    <p className="text-white/40 text-xs text-center py-8">Cargando bitácora...</p>
                  ) : observations.length === 0 ? (
                    <p className="text-white/30 text-xs italic text-center py-8">Sin anotaciones en este periodo.</p>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      {observations.map((obs) => (
                        <div key={obs.id_observador} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 text-xs">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              obs.tipo_nota === 'DISCIPLINARIA' 
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                                : obs.tipo_nota === 'LOGRO_DESTACADO' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            }`}>
                              {obs.tipo_nota === 'DISCIPLINARIA' ? 'Disciplinaria' :
                               obs.tipo_nota === 'LOGRO_DESTACADO' ? 'Logro' : 'Pedagógica'}
                            </span>
                            
                            {/* Sign status */}
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              obs.firmado 
                                ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-amber-600/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {obs.firmado ? `Firmado por ${obs.firmadorNombre || 'Acudiente'}` : 'Pendiente de firma'}
                            </span>
                          </div>

                          <div className="space-y-2 text-[11px] leading-relaxed">
                            <div>
                              <span className="block text-[8px] font-bold uppercase tracking-wider text-white/30">Nota original:</span>
                              <p className="text-white/60 italic">&ldquo;{obs.observacion_informal}&rdquo;</p>
                            </div>
                            {obs.observacion_formal_ia && (
                              <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-indigo-200/90">
                                <span className="block text-[8px] font-bold uppercase tracking-wider text-indigo-400">Transcripción IA:</span>
                                <p>&ldquo;{obs.observacion_formal_ia}&rdquo;</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-[9px] text-white/30 text-right">
                            {new Date(obs.fecha_registro || '').toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
