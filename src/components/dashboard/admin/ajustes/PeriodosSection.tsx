'use client';

import { PeriodoParam } from '@/app/actions/config-actions';
import { SectionCard } from './SectionCard';
import { SaveBar } from './SaveBar';

interface PeriodosSectionProps {
  periodos: PeriodoParam[];
  periodosDirty: boolean;
  savingPeriodos: boolean;
  periodoSuccess: boolean;
  periodoError: string;
  onSetCantPeriodos: (n: 3 | 4) => void;
  onUpdatePeriodo: (idx: number, field: keyof PeriodoParam, value: string | boolean) => void;
  onSavePeriodos: () => void;
  onCancelPeriodos: () => void;
}

export function PeriodosSection({
  periodos,
  periodosDirty,
  savingPeriodos,
  periodoSuccess,
  periodoError,
  onSetCantPeriodos,
  onUpdatePeriodo,
  onSavePeriodos,
  onCancelPeriodos,
}: PeriodosSectionProps) {
  return (
    <SectionCard
      title="Periodos Académicos"
      description="Define la estructura temporal del año lectivo. Cada periodo tiene su rango de fechas y uno debe estar activo."
    >
      {/* Selector de cantidad */}
      <div className="flex items-center gap-3 mb-5">
        <p className="text-xs text-muted-foreground shrink-0 font-medium">Número de periodos:</p>
        {([3, 4] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onSetCantPeriodos(n)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              periodos.length === n
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {n} periodos
          </button>
        ))}
      </div>

      {/* Filas de periodos */}
      <div className="space-y-3">
        {periodos.map((p, idx) => (
          <div
            key={p.numero_periodo}
            onClick={() => {
              if (!p.activo) onUpdatePeriodo(idx, 'activo', true);
            }}
            className={`relative grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] items-center gap-4 border rounded-xl px-4 py-3 transition-all ${
              p.activo
                ? 'bg-primary/5 border-primary/40 shadow-xs'
                : 'bg-background border-border hover:border-muted-foreground/30 cursor-pointer'
            }`}
          >
            {/* Badge "Activo" */}
            {p.activo && (
              <span className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs tracking-wide">
                Activo
              </span>
            )}

            <div className="flex items-center gap-2.5 w-20">
              <span
                className={`w-3 h-3 rounded-full shrink-0 transition-all ${
                  p.activo
                    ? 'bg-primary ring-4 ring-primary/20'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                }`}
              />
              <span className={`text-xs font-extrabold ${p.activo ? 'text-primary' : 'text-foreground'}`}>
                P{p.numero_periodo}
              </span>
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">
                Inicio
              </label>
              <input
                type="date"
                value={p.fecha_inicio}
                onChange={(e) => onUpdatePeriodo(idx, 'fecha_inicio', e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">
                Fin
              </label>
              <input
                type="date"
                value={p.fecha_fin}
                onChange={(e) => onUpdatePeriodo(idx, 'fecha_fin', e.target.value)}
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
              />
            </div>
          </div>
        ))}
      </div>

      <SaveBar
        isDirty={periodosDirty}
        saving={savingPeriodos}
        success={periodoSuccess}
        error={periodoError}
        onSave={onSavePeriodos}
        onCancel={onCancelPeriodos}
      />
    </SectionCard>
  );
}
