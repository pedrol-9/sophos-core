'use client';

import { PeriodoInfo } from '@/app/actions/gradeActions';

interface GradebookToolbarProps {
  isExpandedWindow: boolean;
  isFullscreen: boolean;
  periodos: PeriodoInfo[];
  selectedPeriodo: PeriodoInfo | null;
  activePeriodo: PeriodoInfo | undefined;
  dataLoading: boolean;
  pendingChangesCount: number;
  savingBatch: boolean;
  isPeriodoClosed: boolean;
  onSelectPeriodo: (p: PeriodoInfo) => void;
  onSaveChanges: () => void;
  onOpenEvidenciasModal: () => void;
  onOpenBulkModal: () => void;
  onRefresh: () => void;
  onExpandWindow: (expand: boolean) => void;
}

export function GradebookToolbar({
  isExpandedWindow,
  isFullscreen,
  periodos,
  selectedPeriodo,
  activePeriodo,
  dataLoading,
  pendingChangesCount,
  savingBatch,
  isPeriodoClosed,
  onSelectPeriodo,
  onSaveChanges,
  onOpenEvidenciasModal,
  onOpenBulkModal,
  onRefresh,
  onExpandWindow,
}: GradebookToolbarProps) {
  const maxPeriodoNum = activePeriodo ? activePeriodo.numero_periodo : 1;
  const visiblePeriodos = periodos.filter((p) => p.numero_periodo <= maxPeriodoNum);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-5 bg-card border border-border rounded-2xl shadow-xs">
      {/* Info Asignación */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">Planilla de Notas</h2>
            {(isExpandedWindow || isFullscreen) && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30">
                ↔️ Modo Completo
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">Registro continuo de calificaciones por evidencia.</p>
        </div>
      </div>

      {/* Selector de Periodo */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Periodo:</label>
        <div className="flex gap-1.5 flex-wrap">
          {visiblePeriodos.map((p) => {
            const isSelected = selectedPeriodo?.id_periodo === p.id_periodo;
            const isConcluido = activePeriodo && p.numero_periodo < activePeriodo.numero_periodo;

            return (
              <button
                key={p.id_periodo}
                type="button"
                disabled={dataLoading}
                onClick={() => onSelectPeriodo(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                    : isConcluido
                    ? 'bg-secondary border-border text-muted-foreground/50 hover:text-foreground'
                    : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span>P{p.numero_periodo}</span>
                {isSelected && dataLoading ? (
                  <span className="w-2.5 h-2.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin shrink-0" />
                ) : (
                  p.activo && '•'
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
        {/* Botón Guardar Cambios */}
        {pendingChangesCount > 0 && (
          <button
            type="button"
            disabled={savingBatch}
            onClick={onSaveChanges}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold transition-all shadow-md animate-pulse cursor-pointer flex-1 sm:flex-initial"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            {savingBatch ? 'Guardando...' : `Guardar (${pendingChangesCount})`}
          </button>
        )}

        {/* Botón Evidencias del Periodo */}
        <button
          type="button"
          disabled={isPeriodoClosed}
          onClick={onOpenEvidenciasModal}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-1 sm:flex-initial"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Evidencias
        </button>

        {/* Botón Carga Masiva CSV */}
        <button
          type="button"
          disabled={isPeriodoClosed}
          onClick={onOpenBulkModal}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary border border-border hover:bg-secondary/80 text-foreground text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-1 sm:flex-initial"
        >
          <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Importar
        </button>

        {/* Botón Refrescar Planilla */}
        <button
          type="button"
          onClick={onRefresh}
          title="Refrescar planilla"
          className="p-2 rounded-xl bg-secondary border border-border hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        {/* BOTÓN MAXIMIZAR TABLA (MODO HORIZONTAL / PANTALLA COMPLETA) */}
        {!isExpandedWindow && !isFullscreen ? (
          <button
            type="button"
            onClick={() => onExpandWindow(true)}
            title="Agrandar tabla a pantalla completa (Modo Horizontal)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
            <span>Agrandar Tabla 📱</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              onExpandWindow(false);
            }}
            title="Restaurar tamaño normal"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary border border-border text-foreground hover:bg-secondary/80 text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
            <span>Restaurar ✕</span>
          </button>
        )}
      </div>
    </div>
  );
}
