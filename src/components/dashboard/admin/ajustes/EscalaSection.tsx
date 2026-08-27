'use client';

import { EscalaParam } from '@/app/actions/admin/config-actions';
import { SectionCard } from './SectionCard';
import { SaveBar } from './SaveBar';

const DESEMPENO_COLORS: Record<string, string> = {
  SUPERIOR: 'bg-emerald-500',
  ALTO: 'bg-indigo-500',
  BASICO: 'bg-cyan-500',
  BAJO: 'bg-red-500',
};

interface EscalaSectionProps {
  escalas: EscalaParam[];
  escalaDirty: boolean;
  savingEscala: boolean;
  escalaSuccess: boolean;
  escalaError: string;
  onUpdateEscala: (idx: number, field: 'nota_minima' | 'nota_maxima', val: number) => void;
  onSaveEscala: () => void;
  onCancelEscala: () => void;
}

export function EscalaSection({
  escalas,
  escalaDirty,
  savingEscala,
  escalaSuccess,
  escalaError,
  onUpdateEscala,
  onSaveEscala,
  onCancelEscala,
}: EscalaSectionProps) {
  return (
    <SectionCard
      title="Escala de Valoración"
      description="Homologa las notas numéricas (0.0 – 5.0) con los niveles de desempeño del Decreto 1290."
    >
      <div className="space-y-2.5">
        {escalas.map((e, idx) => (
          <div
            key={e.nombre_desempeno}
            className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] items-center gap-4 bg-background border border-border rounded-xl px-4 py-3"
          >
            <div className="flex items-center gap-2 w-24">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  DESEMPENO_COLORS[e.nombre_desempeno] || 'bg-slate-500'
                }`}
              />
              <span className="text-xs font-bold text-foreground">{e.nombre_desempeno}</span>
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">
                Nota mínima
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={e.nota_minima}
                onChange={(ev) =>
                  onUpdateEscala(idx, 'nota_minima', parseFloat(ev.target.value) || 0)
                }
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">
                Nota máxima
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={e.nota_maxima}
                onChange={(ev) =>
                  onUpdateEscala(idx, 'nota_maxima', parseFloat(ev.target.value) || 0)
                }
                className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
              />
            </div>
          </div>
        ))}
      </div>

      <SaveBar
        isDirty={escalaDirty}
        saving={savingEscala}
        success={escalaSuccess}
        error={escalaError}
        onSave={onSaveEscala}
        onCancel={onCancelEscala}
      />
    </SectionCard>
  );
}
