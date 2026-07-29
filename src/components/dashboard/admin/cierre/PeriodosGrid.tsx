'use client';

import { PeriodoStatus } from '@/app/actions/cierre-actions';

interface PeriodosGridProps {
  periodos: PeriodoStatus[];
  closingId: string | null;
  onClosePeriod: (periodId: string, numero: number) => void;
}

export function PeriodosGrid({ periodos, closingId, onClosePeriod }: PeriodosGridProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-md relative overflow-hidden shadow-xs">
      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/5 blur-[50px] pointer-events-none" />

      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Cronograma y Cierre de Período Académico
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Supervisión del avance académico institucional y cierre de períodos lectivos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {periodos.map((p) => {
          const isClosing = closingId === p.id_periodo;
          const fechaFin = new Date(p.fecha_fin);
          // Periodo pasado que nunca fue cerrado formalmente
          const isPastUnclosed = !p.activo && !p.cerrado && fechaFin < today;

          return (
            <div
              key={p.id_periodo}
              className={`relative p-5 rounded-xl border transition-all duration-300 ${
                p.activo
                  ? 'bg-primary/10 border-primary/40 shadow-md'
                  : p.cerrado
                  ? 'bg-teal-500/5 border-teal-500/25'
                  : isPastUnclosed
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-background border-border opacity-70'
              }`}
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                {p.activo && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground animate-pulse">
                    Activo
                  </span>
                )}
                {p.cerrado && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-600 dark:text-teal-400">
                    Cerrado
                  </span>
                )}
                {isPastUnclosed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    Sin Cerrar
                  </span>
                )}
                {!p.activo && !p.cerrado && !isPastUnclosed && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-secondary text-muted-foreground">
                    Pendiente
                  </span>
                )}
              </div>

              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Período {p.numero_periodo}
              </div>
              <div className="text-xl font-bold text-foreground mt-1">Fase {p.numero_periodo}</div>

              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <p>
                  Inicio: {new Date(p.fecha_inicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                </p>
                <p>
                  Fin: {new Date(p.fecha_fin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                </p>
              </div>

              {/* Progress for Active Period */}
              {p.activo && (
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                    <span>Planilla Notas</span>
                    <span>{p.avanceNotas}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                      style={{ width: `${p.avanceNotas}%` }}
                    />
                  </div>

                  <button
                    onClick={() => onClosePeriod(p.id_periodo, p.numero_periodo)}
                    disabled={isClosing}
                    className="w-full mt-4 flex items-center justify-center py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs font-bold text-primary-foreground transition-all shadow-md cursor-pointer"
                  >
                    {isClosing ? (
                      <>
                        <div className="animate-spin w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                        Cerrando...
                      </>
                    ) : (
                      'Cerrar Período'
                    )}
                  </button>
                </div>
              )}

              {/* Botón de cierre para periodos pasados sin cerrar */}
              {isPastUnclosed && (
                <div className="mt-5 space-y-2">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    Este período finalizó sin cierre formal. Genera los boletines para consolidar las calificaciones.
                  </p>
                  <button
                    onClick={() => onClosePeriod(p.id_periodo, p.numero_periodo)}
                    disabled={isClosing !== false && closingId !== null}
                    className="w-full mt-2 flex items-center justify-center py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
                  >
                    {isClosing ? (
                      <>
                        <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Cerrando...
                      </>
                    ) : (
                      'Cerrar y Generar Boletines'
                    )}
                  </button>
                </div>
              )}

              {/* Info for Closed Period */}
              {p.cerrado && (
                <div className="mt-5 pt-3 border-t border-teal-500/10 text-center">
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                    Calificaciones consolidadas e inmutables
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
