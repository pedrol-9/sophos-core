import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

export interface Student {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  grade: number;
  attendance: number;
  aiComment: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  institution: string;
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

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user?.app_metadata?.id_institucion) {
        const { data: dbStudents } = await supabase
          .from('usuarios')
          .select('*, estudiantes_matriculados(cursos(nombre))')
          .eq('id_institucion', user.app_metadata.id_institucion)
          .eq('rol', 'ESTUDIANTE');

        if (dbStudents && dbStudents.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mappedStudents: Student[] = dbStudents.map((s: any) => {
            const cursoNombre = s.estudiantes_matriculados?.[0]?.cursos?.nombre || 'Sin curso asignado';
            
            return {
              id: s.id_usuario,
              name: s.nombre_completo,
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
    refresh: () => setRefreshTrigger((prev) => prev + 1)
  };
}
