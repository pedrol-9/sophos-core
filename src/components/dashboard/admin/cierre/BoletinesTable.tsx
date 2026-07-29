'use client';

import { PeriodoStatus } from '@/app/actions/cierre-actions';

interface BoletinesTableProps {
  periodos: PeriodoStatus[];
  selectedPeriodForBulletins: string;
  onSelectPeriod: (id: string) => void;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filteredStudents: any[];
  onOpenBulletin: (matriculaId: string) => void;
}

export function BoletinesTable({
  periodos,
  selectedPeriodForBulletins,
  onSelectPeriod,
  searchQuery,
  onSearchChange,
  filteredStudents,
  onOpenBulletin,
}: BoletinesTableProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-md shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <svg className="w-4.5 h-4.5 text-teal-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Consolidación e Impresión de Boletines
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecciona el período cerrado para ver la lista de alumnos e imprimir boletines oficiales.
          </p>
        </div>

        {/* Selector de periodo */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-semibold">Período:</span>
          <select
            value={selectedPeriodForBulletins}
            onChange={(e) => onSelectPeriod(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
          >
            <option value="" disabled className="bg-card text-foreground">
              Selecciona período
            </option>
            {periodos.map((p) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const fechaFin = new Date(p.fecha_fin);
              const isPastUnclosed = !p.activo && !p.cerrado && fechaFin < today;
              const label = p.cerrado
                ? '(Cerrado)'
                : p.activo
                ? '(Activo)'
                : isPastUnclosed
                ? '(Sin Cerrar)'
                : '(Pendiente)';
              return (
                <option key={p.id_periodo} value={p.id_periodo} className="bg-card text-foreground">
                  Período {p.numero_periodo} {label}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Buscador de Estudiantes */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar estudiante por nombre o correo electrónico..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-background border border-border rounded-xl py-2 px-4 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
      </div>

      {/* Lista de Alumnos */}
      {filteredStudents.length > 0 ? (
        <div className="overflow-hidden border border-border rounded-xl bg-card custom-scrollbar overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-border bg-secondary/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-5">Nombre Completo</th>
                <th className="py-3 px-5">Email</th>
                <th className="py-3 px-5">Estado</th>
                <th className="py-3 px-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {filteredStudents.map((stud) => {
                const isPeriodClosed = periodos.find(
                  (p) => p.id_periodo === selectedPeriodForBulletins
                )?.cerrado;

                return (
                  <tr key={stud.id} className="hover:bg-secondary/40 transition-all">
                    <td className="py-3.5 px-5 font-semibold text-foreground">{stud.name}</td>
                    <td className="py-3.5 px-5 text-muted-foreground">{stud.email || 'Sin correo'}</td>
                    <td className="py-3.5 px-5">
                      {isPeriodClosed ? (
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-300 font-bold text-[10px] uppercase">
                          Boletín Listo
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold text-[10px] uppercase">
                          Periodo Abierto
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => onOpenBulletin(stud.id_matricula || stud.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all cursor-pointer text-[11px] shadow-xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver / Imprimir Boletín
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 text-xs text-muted-foreground">
          {searchQuery
            ? 'Ningún estudiante coincide con la búsqueda.'
            : 'No hay estudiantes registrados en la sede.'}
        </div>
      )}
    </div>
  );
}
