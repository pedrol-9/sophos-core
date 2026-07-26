'use client';

interface ReprobacionMateriasProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reprobacionMaterias?: any[];
}

export function ReprobacionMaterias({ reprobacionMaterias = [] }: ReprobacionMateriasProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-md lg:col-span-2 shadow-xs">
      <div className="mb-6">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
          Índice de Reprobación por Asignatura (Definitivas &lt; 3.0)
        </h3>
        <p className="text-[10px] text-muted-foreground">
          Porcentaje de estudiantes con notas deficientes por materia.
        </p>
      </div>

      {reprobacionMaterias && reprobacionMaterias.length > 0 ? (
        <div className="space-y-4">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {reprobacionMaterias.map((rep: any) => (
            <div key={rep.materia} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-foreground">{rep.materia}</span>
                <span
                  className={`font-bold ${
                    rep.porcentajeReprobacion > 20 ? 'text-rose-500' : 'text-muted-foreground'
                  }`}
                >
                  {rep.porcentajeReprobacion}% reprobados
                </span>
              </div>
              <svg
                className="w-full h-2.5 rounded-full overflow-hidden bg-secondary"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <rect
                  x="0"
                  y="0"
                  width={rep.porcentajeReprobacion}
                  height="10"
                  fill={rep.porcentajeReprobacion > 20 ? 'url(#rose-grad)' : 'url(#purple-grad)'}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="rose-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#fda4af" />
                  </linearGradient>
                  <linearGradient id="purple-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
          No hay suficientes calificaciones ingresadas para evaluar reprobaciones.
        </div>
      )}
    </div>
  );
}
