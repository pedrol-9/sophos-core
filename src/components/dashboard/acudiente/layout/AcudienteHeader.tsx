'use client';

import { KidProfile } from '../types';

interface AcudienteHeaderProps {
  kids: KidProfile[];
  selectedKid: KidProfile | null;
  onSelectKid: (kid: KidProfile) => void;
}

export function AcudienteHeader({ kids, selectedKid, onSelectKid }: AcudienteHeaderProps) {
  return (
    <header className="px-8 py-6 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-20 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Seguimiento de Acudidos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Consulta las notas y reportes institucionales de tus hijos matriculados.
          </p>
        </div>
      </div>

      {/* Kid Selector Cards */}
      {kids.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1 max-w-full custom-scrollbar">
          {kids.map((kid) => (
            <button
              key={kid.id_estudiante}
              onClick={() => onSelectKid(kid)}
              className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl border text-left transition-all shrink-0 cursor-pointer ${
                selectedKid?.id_estudiante === kid.id_estudiante
                  ? 'bg-primary/15 border-primary text-foreground shadow-xs'
                  : 'bg-card border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm uppercase shrink-0">
                {kid.nombre_completo.charAt(0)}
              </div>
              <div>
                <span className="block text-xs font-bold">{kid.nombre_completo}</span>
                <span className="block text-[9px] text-muted-foreground font-normal capitalize mt-0.5">
                  {kid.parentesco}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-600 dark:text-amber-300">
          No tienes ningún estudiante asociado a tu cuenta de acudiente. Contacta al administrador del colegio para vincular a tus hijos.
        </div>
      )}
    </header>
  );
}
