'use client';

interface GradebookSkeletonProps {
  isExpandedWindow: boolean;
  isFullscreen: boolean;
  selectedPeriodoNumero?: number;
}

export function GradebookSkeleton({
  isExpandedWindow,
  isFullscreen,
  selectedPeriodoNumero,
}: GradebookSkeletonProps) {
  return (
    <div
      className={`bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs overflow-hidden ${
        isExpandedWindow || isFullscreen ? 'flex-1 flex flex-col min-h-0' : ''
      }`}
    >
      {/* Top Bar Skeleton */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
            <svg className="w-4 h-4 animate-spin text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                Cargando Periodo {selectedPeriodoNumero ? `P${selectedPeriodoNumero}` : ''}...
              </span>
              <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full animate-pulse">
                Actualizando planilla
              </span>
            </div>
            <p className="text-xs text-muted-foreground/70">Obteniendo registro continuo de evidencias y calificaciones</p>
          </div>
        </div>
      </div>

      {/* Skeleton Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[700px] space-y-2.5">
          {/* Header Shimmer */}
          <div className="grid grid-cols-12 gap-3 py-3 px-4 bg-secondary/50 rounded-xl border border-border/60">
            <div className="col-span-4 h-4 bg-muted/60 rounded-md animate-pulse" />
            <div className="col-span-2 h-4 bg-muted/60 rounded-md animate-pulse" />
            <div className="col-span-2 h-4 bg-muted/60 rounded-md animate-pulse" />
            <div className="col-span-2 h-4 bg-muted/60 rounded-md animate-pulse" />
            <div className="col-span-2 h-4 bg-muted/60 rounded-md animate-pulse" />
          </div>

          {/* Rows Shimmer */}
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="grid grid-cols-12 gap-3 items-center py-3 px-4 bg-card border border-border/50 rounded-xl">
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary/80 shrink-0 animate-pulse" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-secondary/80 rounded-md w-3/4 animate-pulse" />
                  <div className="h-2.5 bg-secondary/50 rounded-md w-1/2 animate-pulse" />
                </div>
              </div>
              <div className="col-span-2 flex justify-center">
                <div className="h-7 w-14 bg-secondary/70 rounded-xl border border-border/40 animate-pulse" />
              </div>
              <div className="col-span-2 flex justify-center">
                <div className="h-7 w-14 bg-secondary/70 rounded-xl border border-border/40 animate-pulse" />
              </div>
              <div className="col-span-2 flex justify-center">
                <div className="h-7 w-14 bg-secondary/70 rounded-xl border border-border/40 animate-pulse" />
              </div>
              <div className="col-span-2 flex justify-center">
                <div className="h-6 w-16 bg-secondary/60 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
