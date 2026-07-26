'use client';

import { AbsenceRecord } from './types';

interface AcudienteAbsencesTabProps {
  absences: AbsenceRecord[];
  kidName: string;
}

export function AcudienteAbsencesTab({ absences, kidName }: AcudienteAbsencesTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-[9px] font-bold uppercase tracking-wider bg-secondary/50">
                <th className="py-4 px-6">Fecha</th>
                <th className="py-4 px-6">Asignatura</th>
                <th className="py-4 px-6">Estado</th>
                <th className="py-4 px-6">Detalles de excusa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {absences.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground font-medium">
                    ¡Excelente! {kidName} no tiene fallas de asistencia reportadas.
                  </td>
                </tr>
              ) : (
                absences.map((abs) => (
                  <tr key={abs.id_asistencia} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground">
                      {new Date(abs.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6 text-foreground/80">{abs.materiaNombre}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          abs.estado === 'FALTA_JUSTIFICADA'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                        }`}
                      >
                        {abs.estado === 'FALTA_JUSTIFICADA' ? 'Justificada' : 'Injustificada'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
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
  );
}
