'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { IconUser } from '@/components/icons';
import { signObservacion } from '@/app/actions/academic/observador-actions';
import {
  SubjectGrade,
  StudentSubject,
  AbsenceRecord,
  ObservadorRecord,
  KidProfile,
  AcudienteSidebar,
  AcudienteHeader,
  AcudienteStatsHeader,
  AcudienteGradesTab,
  AcudienteAbsencesTab,
  AcudienteObservadorTab,
} from '@/components/dashboard/acudiente';
import { DemoFloatingBadge } from '@/components/demo';

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

  // Firma digital
  const [signingObsId, setSigningObsId] = useState<string | null>(null);

  // Custom Modal dialog config
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
        console.error('Error loading acudidos:', relError);
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
        setSelectedKid(mappedKids[0]);
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          const studentGrades: SubjectGrade[] = (grades || [])
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
          firmadorNombre: o.firmador?.nombre_completo || 'Acudiente',
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
        type: 'error',
      });
    } else {
      setModalConfig({
        show: true,
        title: 'Firma Registrada',
        message: '¡Anotación firmada correctamente como enterado!',
        type: 'success',
      });
      setObservadorLogs((prev) =>
        prev.map((item) => {
          if (item.id_observador === idObservador) {
            return {
              ...item,
              firmado: true,
              fecha_firma: new Date().toISOString(),
              firmadorNombre: user?.user_metadata?.nombre_completo || 'Acudiente',
            };
          }
          return item;
        })
      );
    }
    setSigningObsId(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getAllGrades = () => {
    return subjects.flatMap((s) => s.grades.map((g) => g.nota));
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
      <AcudienteSidebar user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10 flex flex-col custom-scrollbar">
        {/* Header containing Kid Selector */}
        <AcudienteHeader kids={kids} selectedKid={selectedKid} onSelectKid={setSelectedKid} />

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
            <AcudienteStatsHeader
              courseName={courseName}
              cumulativeAverage={getCumulativeAverage()}
              academicStatus={getAcademicStatus()}
            />

            {/* Tab Details */}
            <div className="p-8 flex-1">
              {/* TAB 1: GRADES */}
              {activeTab === 'grades' && <AcudienteGradesTab subjects={subjects} />}

              {/* TAB 2: ABSENCES */}
              {activeTab === 'absences' && (
                <AcudienteAbsencesTab absences={absences} kidName={selectedKid.nombre_completo} />
              )}

              {/* TAB 3: OBSERVADOR DIGITAL */}
              {activeTab === 'observador' && (
                <AcudienteObservadorTab
                  observadorLogs={observadorLogs}
                  signingObsId={signingObsId}
                  onSignObservacion={handleSignObservacion}
                />
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

      {/* Badge Flotante para alternar roles en Modo Demo */}
      <DemoFloatingBadge user={user} roleName="Acudiente" />
    </div>
  );
}
