'use client';

import { SectionCard } from './SectionCard';
import { SaveBar } from './SaveBar';

interface NomenclaturaSectionProps {
  nomenclaturaOption: '6A' | '601' | 'custom';
  customNom: string;
  nomDirty: boolean;
  savingNom: boolean;
  nomSuccess: boolean;
  nomError: string;
  onNomOption: (opt: '6A' | '601' | 'custom') => void;
  onCustomNomChange: (val: string) => void;
  onSaveNom: () => void;
  onCancelNom: () => void;
}

export function NomenclaturaSection({
  nomenclaturaOption,
  customNom,
  nomDirty,
  savingNom,
  nomSuccess,
  nomError,
  onNomOption,
  onCustomNomChange,
  onSaveNom,
  onCancelNom,
}: NomenclaturaSectionProps) {
  return (
    <SectionCard
      title="Nomenclatura de Cursos"
      description="Define cómo se identificarán las secciones de cada grado (ej: 6A, 6B o 601, 602)."
    >
      <div className="space-y-2.5">
        {(['6A', '601'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onNomOption(opt)}
            className={`flex items-center justify-between w-full p-3.5 rounded-xl border text-left transition-all ${
              nomenclaturaOption === opt
                ? 'bg-primary/15 border-primary text-foreground font-semibold'
                : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <div>
              <span className="block text-sm font-semibold">
                {opt === '6A' ? 'Alfanumérica (Ej: 6A, 6B)' : 'Numérica Completa (Ej: 601, 602)'}
              </span>
              <span className="block text-[10px] text-muted-foreground mt-0.5">
                {opt === '6A'
                  ? 'Grado número + sección letra'
                  : 'Grado número + sección numérica'}
              </span>
            </div>
            <div
              className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                nomenclaturaOption === opt ? 'border-primary bg-primary' : 'border-border'
              }`}
            />
          </button>
        ))}
        <button
          type="button"
          onClick={() => onNomOption('custom')}
          className={`flex items-center justify-between w-full p-3.5 rounded-xl border text-left transition-all ${
            nomenclaturaOption === 'custom'
              ? 'bg-primary/15 border-primary text-foreground font-semibold'
              : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <div>
            <span className="block text-sm font-semibold">Personalizada</span>
            <span className="block text-[10px] text-muted-foreground mt-0.5">
              Escribe tu propia nomenclatura base
            </span>
          </div>
          <div
            className={`w-4 h-4 rounded-full border-2 shrink-0 ${
              nomenclaturaOption === 'custom' ? 'border-primary bg-primary' : 'border-border'
            }`}
          />
        </button>

        {nomenclaturaOption === 'custom' && (
          <input
            type="text"
            value={customNom}
            onChange={(e) => onCustomNomChange(e.target.value)}
            placeholder="Ej: 6-1, Sexto A, Grado 6 Sec 1..."
            className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors animate-in fade-in"
          />
        )}
      </div>

      <SaveBar
        isDirty={nomDirty}
        saving={savingNom}
        success={nomSuccess}
        error={nomError}
        onSave={onSaveNom}
        onCancel={onCancelNom}
      />
    </SectionCard>
  );
}
