import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

export interface Student {
  id: string;
  name: string;
  email?: string;
  id_matricula?: string;
  avatar: string;
  subject: string;
  grade: number;
  attendance: number;
  aiComment: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  institution: string;
}

export interface DashboardStats {
  promedioAcademico: string;
  asistenciaPromedio: string;
  aiAnalysisCount: number;
}

export function useAdminDashboard() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<DashboardStats>({
    promedioAcademico: '-',
    asistenciaPromedio: '-',
    aiAnalysisCount: 0
  });

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user?.app_metadata?.id_institucion) {
        const instId = user.app_metadata.id_institucion;

        // 1. Fetch Students
        const { data: dbStudents } = await supabase
          .from('usuarios')
          .select('*, estudiantes_matriculados(id_matricula, cursos(nombre))')
          .eq('id_institucion', instId)
          .eq('rol', 'ESTUDIANTE');

        if (dbStudents && dbStudents.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mappedStudents: Student[] = dbStudents.map((s: any) => {
            const matriculaId = s.estudiantes_matriculados?.[0]?.id_matricula || '';
            const cursoNombre = s.estudiantes_matriculados?.[0]?.cursos?.nombre || 'Sin curso asignado';
            
            return {
              id: s.id_usuario,
              name: s.nombre_completo,
              email: s.email,
              id_matricula: matriculaId,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.nombre_completo)}&background=1e293b&color=cbd5e1`,
              subject: cursoNombre,
              grade: 0.0,
              attendance: 100,
              aiComment: 'Aún no hay suficientes calificaciones para generar un análisis.',
              status: 'good',
              institution: 'Mi Institución'
            };
          });
          setStudents(mappedStudents);
        } else {
          setStudents([]);
        }

        // 2. Fetch Grades for Promedio Académico
        const { data: dbGrades } = await supabase
          .from('calificaciones')
          .select('nota, comentario_ia')
          .eq('id_institucion', instId);

        let calculatedPromedio = '-';
        let aiCount = 0;

        if (dbGrades && dbGrades.length > 0) {
          const sum = dbGrades.reduce((acc, g) => acc + (Number(g.nota) || 0), 0);
          calculatedPromedio = (sum / dbGrades.length).toFixed(2);
          aiCount = dbGrades.filter(g => Boolean(g.comentario_ia)).length;
        }

        // 3. Fetch Attendance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: dbAbsences } = await (supabase as any)
          .from('asistencias')
          .select('estado')
          .eq('id_institucion', instId);

        let calculatedAsistencia = '100%';
        if (dbAbsences && dbAbsences.length > 0) {
          const total = dbAbsences.length;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const faltas = dbAbsences.filter((a: any) => a.estado === 'FALTA_INJUSTIFICADA' || a.estado === 'FALTA_JUSTIFICADA').length;
          const pct = Math.max(0, Math.round(((total - faltas) / total) * 100));
          calculatedAsistencia = `${pct}.0%`;
        }

        // 4. Fetch AI Token logs
        const { data: dbAiLogs } = await supabase
          .from('logs_ia_tokens')
          .select('id_ia_token')
          .eq('id_institucion', instId);

        if (dbAiLogs && dbAiLogs.length > 0) {
          aiCount += dbAiLogs.length;
        }

        setStats({
          promedioAcademico: calculatedPromedio,
          asistenciaPromedio: calculatedAsistencia,
          aiAnalysisCount: aiCount
        });
      }
    }
    loadData();
  }, [supabase, refreshTrigger]);

  const handleGenerateAIComment = (studentId: string) => {
    setIsGenerating(true);
    setGeneratingProgress(10);
    const interval = setInterval(() => {
      setGeneratingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsGenerating(false);
            setStudents((prevStudents) =>
              prevStudents.map((s) => {
                if (s.id === studentId) {
                  const comments = [
                    'Muestra avances significativos en sus razonamientos. Se aconseja continuar con el acompañamiento pedagógico para estabilizar sus notas.',
                    'Participación de alta calidad. Consolida conceptos con agilidad. Se sugiere guiarlo hacia proyectos interdisciplinarios.',
                    'Presenta lagunas conceptuales básicas. Sería ideal proveerle talleres de nivelación autónomos en horas libres.',
                    'Actitud muy receptiva, aunque la entrega tardía de trabajos afecta su evaluación. Se sugiere un cronograma de estudio guiado.'
                  ];
                  const randomComment = comments[Math.floor(Math.random() * comments.length)];
                  const updated = { ...s, aiComment: `[Actualizado por IA]: ${randomComment}` };
                  if (selectedStudent?.id === studentId) {
                    setSelectedStudent(updated);
                  }
                  return updated;
                }
                return s;
              })
            );
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  return {
    user,
    students,
    selectedStudent,
    setSelectedStudent,
    search,
    setSearch,
    isGenerating,
    generatingProgress,
    handleGenerateAIComment,
    setStudents,
    stats,
    refresh: () => setRefreshTrigger((prev) => prev + 1)
  };
}
