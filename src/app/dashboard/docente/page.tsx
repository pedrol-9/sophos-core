'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import {
  getTeacherAssignments,
  getCourseStudents,
  saveGrade,
  saveAttendance,
  type AcademicAssignment,
  type CourseStudent,
} from '@/app/actions/teacher-actions';
import { TeacherGradebook } from '@/components/dashboard/teacher/TeacherGradebook';
import {
  createObservacion,
  getStudentObservations,
  type ObservadorRecord,
} from '@/app/actions/observador-actions';
import { DocenteHeader } from '@/components/dashboard/teacher/DocenteHeader';
import { DocenteSidebar } from '@/components/dashboard/teacher/DocenteSidebar';
import { TeacherAttendanceTab } from '@/components/dashboard/teacher/TeacherAttendanceTab';
import { TeacherObservadorTab } from '@/components/dashboard/teacher/TeacherObservadorTab';
import { TeacherGradeModal } from '@/components/dashboard/teacher/TeacherGradeModal';
import { TeacherObservadorModal } from '@/components/dashboard/teacher/TeacherObservadorModal';

export default function DocenteDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState<'courses' | 'attendance_tab' | 'observador_tab'>('courses');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [assignments, setAssignments] = useState<AcademicAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Header Filter State
  const [selectedMateriaName, setSelectedMateriaName] = useState<string>('');
  const [selectedGradoNum, setSelectedGradoNum] = useState<string>('');
  const [selectedCursoId, setSelectedCursoId] = useState<string>('');

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
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [localAbsences, setLocalAbsences] = useState<Record<string, 'PRESENTE' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA'>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Observador Digital state
  const [observations, setObservations] = useState<ObservadorRecord[]>([]);
  const [loadingObs, setLoadingObs] = useState(false);
  const [newObsType, setNewObsType] = useState<'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO'>('PEDAGOGICA');
  const [newObsText, setNewObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);

  // Custom Modal dialog config
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
      } else if (res.data && res.data.length > 0) {
        setAssignments(res.data);
        const uSubs = Array.from(new Set(res.data.map((a) => a.materias?.nombre).filter((s): s is string => Boolean(s))));
        if (uSubs.length === 1) {
          setSelectedMateriaName(uSubs[0]);
        } else {
          setSelectedMateriaName('');
        }
        setSelectedGradoNum('');
        setSelectedCursoId('');
        setSelectedAssignment(null);
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
        type: 'error',
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

  const handlePeriodChange = (period: number) => {
    setGradingPeriod(period);
    if (selectedStudent) {
      const existingGrade = selectedStudent.grades.find((g) => g.periodo === period);
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
        type: 'warning',
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
        type: 'error',
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
          body: JSON.stringify({ calificacionId: savedGradeId }),
        });
        const aiData = await aiRes.json();
        if (aiData.error) {
          console.error('AI error:', aiData.error);
        } else {
          await loadStudents(selectedAssignment);
        }
      } catch (err) {
        console.error('Failed to generate AI comment:', err);
      } finally {
        setGeneratingAI(false);
      }

      setSavingGrade(false);
      setSelectedStudent(null);
    }
  };

  const handleAttendanceChange = (studentId: string, status: 'PRESENTE' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA') => {
    setLocalAbsences((prev) => {
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
        const student = students.find((s) => s.id_estudiante === studentId);
        return {
          idMatricula: student?.id_matricula || '',
          estado: status as 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA',
          observacion: status === 'FALTA_JUSTIFICADA' ? 'Justificada por el acudiente/colegio' : undefined,
        };
      })
      .filter((a) => a.idMatricula !== '');

    const res = await saveAttendance(selectedAssignment.id_asignacion, attendanceDate, absencesPayload);

    if (res.error) {
      setModalConfig({
        show: true,
        title: 'Error de Asistencia',
        message: `Error al registrar asistencia: ${res.error}`,
        type: 'error',
      });
    } else {
      setModalConfig({
        show: true,
        title: 'Reporte Guardado',
        message: '¡Asistencia guardada correctamente!',
        type: 'success',
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
        type: 'error',
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
    const res = await createObservacion(selectedStudent.id_estudiante, newObsType, newObsText);

    if (res.error) {
      setModalConfig({
        show: true,
        title: 'Error al Registrar',
        message: `Error al registrar novedad: ${res.error}`,
        type: 'error',
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

      {/* Docente Sidebar Navigation (Desktop & Mobile Drawer) */}
      <DocenteSidebar
        user={user}
        selectedAssignment={selectedAssignment}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClearSelectedStudent={() => setSelectedStudent(null)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
        {/* Header Superior con Control Bar Integrada */}
        <DocenteHeader
          user={user}
          selectedAssignment={selectedAssignment}
          assignments={assignments}
          selectedMateriaName={selectedMateriaName}
          selectedGradoNum={selectedGradoNum}
          selectedCursoId={selectedCursoId}
          activeTab={activeTab}
          onSelectMateria={(newSub) => {
            setSelectedMateriaName(newSub);
            setSelectedGradoNum('');
            setSelectedCursoId('');
            setSelectedAssignment(null);
          }}
          onSelectGrado={(newGrad) => {
            setSelectedGradoNum(newGrad);
            setSelectedCursoId('');
            setSelectedAssignment(null);
          }}
          onSelectCurso={(id) => {
            setSelectedCursoId(id);
            const match = assignments.find((a) => a.id_asignacion === id);
            if (match) {
              handleSelectAssignment(match, activeTab === 'attendance_tab' ? 'attendance' : 'grade');
            } else {
              setSelectedAssignment(null);
            }
          }}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* View content */}
        <div className="p-4 sm:p-6 md:p-8">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Estado Inicial cuando no se ha seleccionado Grado y Curso */}
          {!selectedAssignment && (
            <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/40 backdrop-blur-md shadow-2xs max-w-2xl mx-auto my-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mx-auto mb-4 text-2xl">
                🏫
              </div>
              <h2 className="text-lg font-bold text-foreground">Selecciona un Grado y Curso</h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Selecciona la materia, grado y curso en la barra superior para habilitar la planilla de calificaciones, control de faltas y seguimiento del observador.
              </p>
            </div>
          )}

          {/* VIEW 1: Grading view */}
          {selectedAssignment && activeTab === 'courses' && (
            <TeacherGradebook idAsignacion={selectedAssignment.id_asignacion} idCurso={selectedAssignment.id_curso} />
          )}

          {/* VIEW 2: Attendance view */}
          {selectedAssignment && activeTab === 'attendance_tab' && (
            <TeacherAttendanceTab
              attendanceDate={attendanceDate}
              setAttendanceDate={setAttendanceDate}
              students={students}
              studentsLoading={studentsLoading}
              localAbsences={localAbsences}
              onAttendanceChange={handleAttendanceChange}
              onSaveAttendance={handleSaveAttendance}
              savingAttendance={savingAttendance}
            />
          )}

          {/* VIEW 3: Observador Digital view */}
          {selectedAssignment && activeTab === 'observador_tab' && (
            <TeacherObservadorTab
              students={students}
              studentsLoading={studentsLoading}
              onSelectStudentForObservador={handleSelectStudentForObservador}
            />
          )}
        </div>

        {/* SLIDE-OVER PANEL: EDIT GRADE & SHOW AI REMARK */}
        {selectedStudent && selectedAssignment && activeTab === 'courses' && (
          <TeacherGradeModal
            selectedStudent={selectedStudent}
            onClose={() => setSelectedStudent(null)}
            gradingPeriod={gradingPeriod}
            onPeriodChange={handlePeriodChange}
            gradeValue={gradeValue}
            setGradeValue={setGradeValue}
            gradeComment={gradeComment}
            setGradeComment={setGradeComment}
            onSaveGrade={handleSaveGrade}
            savingGrade={savingGrade}
            generatingAI={generatingAI}
          />
        )}

        {/* SLIDE-OVER PANEL: OBSERVADOR DIGITAL */}
        {selectedStudent && selectedAssignment && activeTab === 'observador_tab' && (
          <TeacherObservadorModal
            selectedStudent={selectedStudent}
            onClose={() => setSelectedStudent(null)}
            newObsType={newObsType}
            setNewObsType={setNewObsType}
            newObsText={newObsText}
            setNewObsText={setNewObsText}
            onSaveObservacion={handleSaveObservacion}
            savingObs={savingObs}
            observations={observations}
            loadingObs={loadingObs}
          />
        )}
      </main>

      {/* MODAL DIALOG OVERRIDE FOR ALERTS & CONFIRMS */}
      {modalConfig?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-black/60 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-card border border-border p-6 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 space-y-4 text-foreground">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  modalConfig.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
                    : modalConfig.type === 'error'
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
                }`}
              >
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

            <p className="text-xs text-muted-foreground leading-relaxed">{modalConfig.message}</p>

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
