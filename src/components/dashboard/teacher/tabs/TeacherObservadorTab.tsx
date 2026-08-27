'use client';

import { type CourseStudent } from '@/app/actions/academic/teacher-actions';

interface TeacherObservadorTabProps {
  students: CourseStudent[];
  studentsLoading: boolean;
  onSelectStudentForObservador: (student: CourseStudent) => void;
}

export function TeacherObservadorTab({
  students,
  studentsLoading,
  onSelectStudentForObservador,
}: TeacherObservadorTabProps) {
  return (
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
                      onClick={() => onSelectStudentForObservador(student)}
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
  );
}
