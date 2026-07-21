'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { IconNotebook, IconChecklist, IconLogout, IconSparkles } from '@/components/icons';
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
import { ThemeToggle } from '@/components/ThemeToggle';

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
  const [localAbsences, setLocalAbsences] = useState<Record<string, 'PRESENTE' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Observador Digital state
  const [observations, setObservations] = useState<ObservadorRecord[]>([]);
  const [loadingObs, setLoadingObs] = useState(false);
  const [newObsType, setNewObsType] = useState<'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO'>('PEDAGOGICA');
  const [newObsText, setNewObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);

  // Modal de confirmación / alerta personalizado
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'confirm';
    onConfirm?: () => void;
  } | null>(null);

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
      setModalConfig({
        show: true,
        title: 'Error de Carga',
        message: `Error al cargar alumnos: ${res.error}`,
        type: 'error'
      });
    } else if (res.data) {
      setStudents(res.data);
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
    setSelectedStudent(null);
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
      setModalConfig({
        show: true,
        title: 'Calificación Inválida',
        message: 'Por favor ingresa una nota válida entre 0.0 y 5.0',
        type: 'warning'
      });
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
      setModalConfig({
        show: true,
        title: 'Error al Guardar',
        message: `Error al guardar la calificación: ${res.error}`,
        type: 'error'
      });
      setSavingGrade(false);
    } else if (res.data) {
      const savedGradeId = res.data.id_calificacion;
      
      await loadStudents(selectedAssignment);
      
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
          await loadStudents(selectedAssignment);
        }
      } catch (err) {
        console.error("Failed to generate AI comment:", err);
      } finally {
        setGeneratingAI(false);
      }

      setSavingGrade(false);
      setSelectedStudent(null);
    }
  };

  const handleAttendanceChange = (studentId: string, status: 'PRESENTE' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA') => {
    setLocalAbsences(prev => {
      const next = { ...prev };
      if (status === 'PRESENTE') {
        delete next[studentId];
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
      .filter(([, status]) => status !== 'PRESENTE')
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
      setModalConfig({
        show: true,
        title: 'Error de Asistencia',
        message: `Error al registrar asistencia: ${res.error}`,
        type: 'error'
      });
    } else {
      setModalConfig({
        show: true,
        title: 'Reporte Guardado',
        message: '¡Asistencia guardada correctamente!',
        type: 'success'
      });
      await loadStudents(selectedAssignment);
    }
    setSavingAttendance(false);
  };

  const handleSelectStudentForObservador = async (student: CourseStudent) => {
    setSelectedStudent(student);
    setLoadingObs(true);
    const res = await getStudentObservations(student.id_estudiante);
    if (res.error) {
      setModalConfig({
        show: true,
        title: 'Error de Carga',
        message: `Error al cargar observador: ${res.error}`,
        type: 'error'
      });
    } else if (res.data) {
      setObservations(res.data);
    }
    setLoadingObs(false);
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
      setModalConfig({
        show: true,
        title: 'Error al Registrar',
        message: `Error al registrar novedad: ${res.error}`,
        type: 'error'
      });
    } else {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-primary mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-muted-foreground text-sm font-medium">Cargando Portal Docente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground font-sans flex overflow-hidden relative">
      {/* Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Docente Sidebar */}
      <aside className="w-64 border-r border-border flex flex-col justify-between shrink-0 bg-card backdrop-blur-md relative z-10 h-full shadow-xs">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="p-6 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.png" alt="Sophos Core Logo" className="w-8 h-8 object-contain rounded-lg shadow-sm" />
              <span className="text-lg font-bold tracking-tight text-foreground">
                Portal<span className="text-primary"> Docente</span>
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
            <button
              onClick={() => {
                setActiveTab('courses');
                setSelectedAssignment(null);
                setSelectedStudent(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === 'courses' && !selectedAssignment
                  ? 'bg-primary/15 border-l-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <IconNotebook /> Mis Asignaturas
            </button>
            
            {/* Contextual navigation */}
            {selectedAssignment && (
              <div className="pl-4 pt-2 mt-2 border-l border-border space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-3 mb-2">
                  Curso: {selectedAssignment.cursos?.nombre}
                </p>
                <button
                  onClick={() => {
                    setActiveTab('courses');
                    setSelectedStudent(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'courses'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <IconNotebook className="w-3.5 h-3.5" /> Calificar Alumnos
                </button>
                <button
                  onClick={() => {
                    setActiveTab('attendance_tab');
                    setSelectedStudent(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'attendance_tab'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <IconChecklist className="w-3.5 h-3.5" /> Control de Faltas
                </button>
                <button
                  onClick={() => {
                    setActiveTab('observador_tab');
                    setSelectedStudent(null);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeTab === 'observador_tab'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
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

        {/* Profile Card, Theme Toggle & Logout */}
        <div className="p-4 border-t border-border space-y-3 bg-secondary/30 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold uppercase shrink-0">
                {user?.email?.charAt(0) ?? 'D'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.user_metadata?.nombre_completo 
                    ? `Profe ${user.user_metadata.nombre_completo.trim().split(/\s+/)[0]}` 
                    : 'Profe'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">Docente</p>
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
      <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        
        {/* Header */}
        <header className="px-8 py-6 border-b border-border flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-20">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {!selectedAssignment 
                ? 'Mis Asignaturas Asignadas' 
                : `${selectedAssignment.materias?.nombre} - Curso ${selectedAssignment.cursos?.nombre}`}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
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
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary border border-border hover:bg-secondary/80 text-foreground text-xs font-semibold transition-all cursor-pointer"
            >
              ← Volver al listado
            </button>
          )}
        </header>

        {/* View content */}
        <div className="p-8">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* VIEW 1: Grid of courses (No course selected) */}
          {!selectedAssignment && (
            <div className="space-y-6">
              {/* Filter controls */}
              {assignments.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl bg-card border border-border backdrop-blur-md items-center justify-between shadow-xs">
                  <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                    {/* Grado Selector */}
                    <div className="flex flex-col gap-1.5 min-w-[150px] w-full sm:w-auto">
                      <label htmlFor="filter-grade" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Grado
                      </label>
                      <select
                        id="filter-grade"
                        value={filterGrade}
                        onChange={(e) => setFilterGrade(e.target.value)}
                        className="px-3.5 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
                      >
                        <option value="" className="bg-card text-foreground">Todos los grados</option>
                        {availableGrades.map(grade => (
                          <option key={grade} value={grade} className="bg-card text-foreground">
                            {grade}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Materia Selector */}
                    <div className="flex flex-col gap-1.5 min-w-[180px] w-full sm:w-auto">
                      <label htmlFor="filter-subject" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Materia
                      </label>
                      <select
                        id="filter-subject"
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="px-3.5 py-2 rounded-xl bg-background border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
                      >
                        <option value="" className="bg-card text-foreground">Todas las materias</option>
                        {availableSubjects.map(subject => (
                          <option key={subject} value={subject} className="bg-card text-foreground">
                            {subject}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Summary / Reset */}
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-xs text-muted-foreground font-medium">
                      Mostrando <strong className="text-foreground">{filteredAssignments.length}</strong> de <strong className="text-foreground">{assignments.length}</strong> materias
                    </span>
                    {(filterGrade || filterSubject) && (
                      <button
                        onClick={() => {
                          setFilterGrade('');
                          setFilterSubject('');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-secondary border border-border hover:bg-secondary/80 text-foreground text-xs font-semibold transition-all cursor-pointer"
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
                  <p className="text-muted-foreground text-sm col-span-full">Cargando materias...</p>
                ) : assignments.length === 0 ? (
                  <div className="col-span-full py-16 text-center border border-border border-dashed rounded-2xl bg-card">
                    <p className="text-muted-foreground mb-2">No tienes asignaciones académicas configuradas para este año.</p>
                  </div>
                ) : filteredAssignments.length === 0 ? (
                  <div className="col-span-full py-16 text-center border border-border border-dashed rounded-2xl bg-card">
                    <p className="text-muted-foreground mb-3">No se encontraron materias que coincidan con los filtros seleccionados.</p>
                    <button
                      onClick={() => {
                        setFilterGrade('');
                        setFilterSubject('');
                      }}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all cursor-pointer"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                ) : (
                  filteredAssignments.map(ass => (
                    <div 
                      key={ass.id_asignacion} 
                      className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all duration-300 relative overflow-hidden shadow-xs"
                    >
                      <div className="absolute top-0 right-0 p-4 text-primary/10 group-hover:text-primary/20 transition-colors">
                        <IconNotebook className="w-10 h-10" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded">
                        {ass.materias?.area || 'Asignatura'}
                      </span>
                      <h3 className="text-xl font-bold text-foreground mt-3 mb-1">{ass.materias?.nombre}</h3>
                      <p className="text-sm text-muted-foreground mb-6">Curso: <strong className="text-foreground">{ass.cursos?.nombre}</strong></p>
                      
                      <div className="flex gap-3 pt-3 border-t border-border">
                        <button 
                          onClick={() => handleSelectAssignment(ass, 'grade')}
                          className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all shadow-xs cursor-pointer"
                        >
                          Calificar
                        </button>
                        <button 
                          onClick={() => handleSelectAssignment(ass, 'attendance')}
                          className="flex-1 py-2 rounded-xl bg-secondary border border-border text-foreground hover:bg-secondary/80 text-xs font-semibold transition-all cursor-pointer"
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

          {/* VIEW 2: Grading view */}
          {selectedAssignment && activeTab === 'courses' && (
            <TeacherGradebook 
              idAsignacion={selectedAssignment.id_asignacion} 
              idCurso={selectedAssignment.id_curso} 
            />
          )}

          {/* VIEW 3: Attendance view */}
          {selectedAssignment && activeTab === 'attendance_tab' && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex justify-between items-center bg-card border border-border rounded-2xl p-4 flex-wrap gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <label htmlFor="attendance-date-selector" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Fecha del Reporte:
                  </label>
                  <input
                    id="attendance-date-selector"
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-background border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="text-[10px] text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1.5 rounded-lg max-w-md font-medium">
                  <strong>Regla de negocio:</strong> Todos los estudiantes se asumen como presentes. Registra únicamente los casos que tengan falta justificada o injustificada para la fecha.
                </div>
              </div>

              {/* Students attendance list */}
              {studentsLoading ? (
                <p className="text-muted-foreground text-sm font-medium">Cargando listado de estudiantes...</p>
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs custom-scrollbar overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider bg-secondary/50">
                        <th className="py-4 px-6">Estudiante</th>
                        <th className="py-4 px-6 text-center">Asistencia Normal</th>
                        <th className="py-4 px-6 text-center">Falta Justificada</th>
                        <th className="py-4 px-6 text-center">Falta Injustificada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {students.map((student) => {
                        const currentStatus = localAbsences[student.id_estudiante] || 'PRESENTE';

                        return (
                          <tr key={student.id_estudiante} className="hover:bg-secondary/40 transition-colors">
                            <td className="py-4 px-6 font-semibold text-foreground">
                              {student.nombre_completo}
                              <span className="block text-[11px] text-muted-foreground font-normal mt-0.5">{student.email}</span>
                            </td>
                            
                            {/* 1. Presente */}
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

                  {/* Save button */}
                  <div className="p-6 border-t border-border flex justify-end">
                    <button
                      onClick={handleSaveAttendance}
                      disabled={savingAttendance}
                      className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-sm font-semibold text-primary-foreground transition-all shadow-md disabled:opacity-60 cursor-pointer"
                    >
                      {savingAttendance ? 'Guardando...' : 'Guardar Reporte de Asistencia'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: Observador Digital view */}
          {selectedAssignment && activeTab === 'observador_tab' && (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex justify-between items-center bg-card border border-border rounded-2xl p-4 flex-wrap gap-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Observador Digital de Convivencia</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Administra la hoja de vida, observaciones y reconocimientos de los estudiantes.</p>
                </div>
              </div>

              {/* Students list */}
              {studentsLoading ? (
                <p className="text-muted-foreground text-sm font-medium">Cargando listado de estudiantes...</p>
              ) : (
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs custom-scrollbar overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider bg-secondary/50">
                        <th className="py-4 px-6">Estudiante</th>
                        <th className="py-4 px-6">Email</th>
                        <th className="py-4 px-6 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {students.map((student) => (
                        <tr key={student.id_estudiante} className="hover:bg-secondary/40 transition-colors">
                          <td className="py-4 px-6 font-semibold text-foreground">
                            {student.nombre_completo}
                          </td>
                          <td className="py-4 px-6 text-muted-foreground">
                            {student.email}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => handleSelectStudentForObservador(student)}
                              className="px-4 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-semibold transition-all cursor-pointer"
                            >
                              Ver / Registrar Novedad
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── SLIDE-OVER PANEL: EDIT GRADE & SHOW AI REMARK ───────────────── */}
        {selectedStudent && selectedAssignment && activeTab === 'courses' && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md h-full bg-card border-l border-border p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 text-foreground custom-scrollbar">
              
              <div className="space-y-6">
                {/* Panel Header */}
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Calificar Alumno</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedStudent.nombre_completo}</p>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSaveGrade} className="space-y-4">
                  {/* Period selector */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                      Periodo Lectivo
                    </label>
                    <select
                      value={gradingPeriod}
                      onChange={(e) => handlePeriodChange(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value={1} className="bg-card text-foreground">Periodo 1</option>
                      <option value={2} className="bg-card text-foreground">Periodo 2</option>
                      <option value={3} className="bg-card text-foreground">Periodo 3</option>
                      <option value={4} className="bg-card text-foreground">Periodo 4</option>
                    </select>
                  </div>

                  {/* Grade value input */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
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
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>

                  {/* Teacher comment */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                      Observación / Logros (Docente)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ej: Excelente razonamiento lógico. Presentó dificultades en ecuaciones cuadráticas pero mejoró."
                      value={gradeComment}
                      onChange={(e) => setGradeComment(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                    />
                  </div>

                  {/* Action button */}
                  <button
                    type="submit"
                    disabled={savingGrade || generatingAI}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-sm font-semibold text-primary-foreground transition-all shadow-md disabled:opacity-60 cursor-pointer"
                  >
                    {savingGrade ? 'Guardando Calificación...' : 'Guardar Calificación'}
                  </button>
                </form>

                {/* AI Predictive remark section */}
                <div className="pt-6 border-t border-border space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <IconSparkles className="w-4 h-4 animate-pulse" />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Retroalimentación IA Académica</h3>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs leading-relaxed text-foreground relative min-h-[80px] flex items-center justify-center">
                    {generatingAI ? (
                      <div className="text-center space-y-2">
                        <svg className="animate-spin w-5 h-5 text-primary mx-auto" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-primary text-[10px] animate-pulse">Gemini analizando rendimiento académico...</p>
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

              <div className="pt-6 border-t border-border text-center text-[10px] text-muted-foreground leading-relaxed">
                El análisis predictivo de IA considera el historial completo de calificaciones y las faltas reportadas para sugerir alertas tempranas de bajo rendimiento.
              </div>

            </div>
          </div>
        )}

        {/* ─── SLIDE-OVER PANEL: OBSERVADOR DIGITAL ─────────────────────────── */}
        {selectedStudent && selectedAssignment && activeTab === 'observador_tab' && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-lg h-full bg-card border-l border-border p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 text-foreground custom-scrollbar">
              
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                {/* Panel Header */}
                <div className="flex justify-between items-center pb-4 border-b border-border shrink-0">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Observador Digital</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedStudent.nombre_completo}</p>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Form to Create New Observation */}
                <form onSubmit={handleSaveObservacion} className="space-y-4 shrink-0 bg-background border border-border rounded-2xl p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Registrar Nueva Novedad</h3>
                  
                  {/* Tipo de Nota */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                      Tipo de Anotación
                    </label>
                    <select
                      value={newObsType}
                      onChange={(e) => setNewObsType(e.target.value as 'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO')}
                      className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <option value="PEDAGOGICA" className="bg-card text-foreground">Pedagógica (Seguimiento Académico/Convivencia)</option>
                      <option value="DISCIPLINARIA" className="bg-card text-foreground">Disciplinaria (Llamado de atención / Falta)</option>
                      <option value="LOGRO_DESTACADO" className="bg-card text-foreground">Reconocimiento / Logro Destacado</option>
                    </select>
                  </div>

                  {/* Observacion Informal */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                      Detalle de la Observación (Nota en bruto)
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Ej: El alumno interrumpió la clase varias veces hablando con sus compañeros. Se le llamó la atención."
                      value={newObsText}
                      onChange={(e) => setNewObsText(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                    />
                  </div>

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={savingObs || !newObsText.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {savingObs ? 'Procesando con IA Gemini...' : 'Registrar y Formalizar con IA'}
                  </button>
                </form>

                {/* History of Observations */}
                <div className="flex-1 flex flex-col min-h-0 pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 shrink-0">Historial del Estudiante</h3>
                  
                  {loadingObs ? (
                    <p className="text-muted-foreground text-xs text-center py-8 font-medium">Cargando bitácora...</p>
                  ) : observations.length === 0 ? (
                    <p className="text-muted-foreground/60 text-xs italic text-center py-8">Sin anotaciones en este periodo.</p>
                  ) : (
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                      {observations.map((obs) => (
                        <div key={obs.id_observador} className="p-4 rounded-xl bg-background border border-border space-y-3 text-xs">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              obs.tipo_nota === 'DISCIPLINARIA' 
                                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20' 
                                : obs.tipo_nota === 'LOGRO_DESTACADO' 
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                            }`}>
                              {obs.tipo_nota === 'DISCIPLINARIA' ? 'Disciplinaria' :
                               obs.tipo_nota === 'LOGRO_DESTACADO' ? 'Logro' : 'Pedagógica'}
                            </span>
                            
                            {/* Sign status */}
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              obs.firmado 
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            }`}>
                              {obs.firmado ? `Firmado por ${obs.firmadorNombre || 'Acudiente'}` : 'Pendiente de firma'}
                            </span>
                          </div>

                          <div className="space-y-2 text-[11px] leading-relaxed">
                            <div>
                              <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Nota original:</span>
                              <p className="text-foreground italic">&ldquo;{obs.observacion_informal}&rdquo;</p>
                            </div>
                            {obs.observacion_formal_ia && (
                              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-foreground">
                                <span className="block text-[8px] font-bold uppercase tracking-wider text-primary">Transcripción IA:</span>
                                <p>&ldquo;{obs.observacion_formal_ia}&rdquo;</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-[9px] text-muted-foreground text-right">
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

      {/* MODAL DIALOG OVERRIDE FOR ALERTS & CONFIRMS */}
      {modalConfig?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-black/60 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-card border border-border p-6 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 space-y-4 text-foreground">
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
              {modalConfig.type === 'confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModalConfig(null)}
                    className="px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                      setModalConfig(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-all shadow-md cursor-pointer"
                  >
                    Confirmar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalConfig(null)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-all shadow-md cursor-pointer"
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
