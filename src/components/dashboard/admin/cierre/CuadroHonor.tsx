'use client';

interface CuadroHonorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cuadroHonor?: any[];
}

export function CuadroHonor({ cuadroHonor = [] }: CuadroHonorProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-md relative flex flex-col justify-between shadow-xs">
      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Cuadro de Honor (Mejores Promedios)
          </h3>
          <p className="text-[10px] text-muted-foreground">Estudiantes destacados de la institución.</p>
        </div>

        {cuadroHonor && cuadroHonor.length > 0 ? (
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {cuadroHonor.map((est: any, index: number) => {
              const placeBg =
                index === 0
                  ? 'from-amber-500/15 to-amber-500/5 border-amber-500/30'
                  : index === 1
                  ? 'from-slate-500/15 to-slate-500/5 border-slate-400/30'
                  : 'from-amber-700/15 to-amber-800/5 border-amber-700/30';

              const trophyColor =
                index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-amber-700';

              return (
                <div
                  key={est.id_matricula}
                  className={`flex items-center justify-between p-3 rounded-xl bg-gradient-to-r border transition-all duration-300 hover:translate-x-1 ${placeBg}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-extrabold ${trophyColor}`}>#{index + 1}</span>
                    <div>
                      <p className="text-xs font-bold text-foreground">{est.nombre}</p>
                      <p className="text-[10px] text-muted-foreground">IE Jose María Carbonell</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-foreground">{est.promedio}</span>
                    <span className="text-[9px] text-muted-foreground block">/ 5.0</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No hay datos académicos disponibles.
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border text-[9px] text-muted-foreground flex items-center gap-1.5 mt-4">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Actualizado dinámicamente según calificaciones registradas.
      </div>
    </div>
  );
}
