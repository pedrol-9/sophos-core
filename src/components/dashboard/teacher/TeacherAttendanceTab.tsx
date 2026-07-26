'use client';

import { type CourseStudent } from '@/app/actions/teacher-actions';

interface TeacherAttendanceTabProps {
  attendanceDate: string;
  setAttendanceDate: (date: string) => void;
  students: CourseStudent[];
  studentsLoading: boolean;
  localAbsences: Record<string, 'PRESENTE' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA'>;
  onAttendanceChange: (studentId: string, status: 'PRESENTE' | 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA') => void;
  onSaveAttendance: () => void;
  savingAttendance: boolean;
}

export function TeacherAttendanceTab({
  attendanceDate,
  setAttendanceDate,
  students,
  studentsLoading,
  localAbsences,
  onAttendanceChange,
  onSaveAttendance,
  savingAttendance,
}: TeacherAttendanceTabProps) {
  return (
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
                        onChange={() => onAttendanceChange(student.id_estudiante, 'PRESENTE')}
                        className="w-4 h-4 accent-teal-500 cursor-pointer"
                      />
                    </td>

                    {/* 2. Falta Justificada */}
                    <td className="py-4 px-6 text-center">
                      <input
                        type="radio"
                        name={`att-${student.id_estudiante}`}
                        checked={currentStatus === 'FALTA_JUSTIFICADA'}
                        onChange={() => onAttendanceChange(student.id_estudiante, 'FALTA_JUSTIFICADA')}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                    </td>

                    {/* 3. Falta Injustificada */}
                    <td className="py-4 px-6 text-center">
                      <input
                        type="radio"
                        name={`att-${student.id_estudiante}`}
                        checked={currentStatus === 'FALTA_INJUSTIFICADA'}
                        onChange={() => onAttendanceChange(student.id_estudiante, 'FALTA_INJUSTIFICADA')}
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
              onClick={onSaveAttendance}
              disabled={savingAttendance}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-sm font-semibold text-primary-foreground transition-all shadow-md disabled:opacity-60 cursor-pointer"
            >
              {savingAttendance ? 'Guardando...' : 'Guardar Reporte de Asistencia'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
