'use client';

import { ObservadorRecord } from '../types';

interface AcudienteObservadorTabProps {
  observadorLogs: ObservadorRecord[];
  signingObsId: string | null;
  onSignObservacion: (idObservador: string) => void;
}

export function AcudienteObservadorTab({
  observadorLogs,
  signingObsId,
  onSignObservacion,
}: AcudienteObservadorTabProps) {
  if (observadorLogs.length === 0) {
    return (
      <div className="py-12 text-center border border-border border-dashed rounded-2xl bg-card text-muted-foreground text-xs font-medium">
        No hay anotaciones registradas en el Observador de este año escolar.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {observadorLogs.map((obs) => (
          <div
            key={obs.id_observador}
            className="bg-card border border-border rounded-2xl p-6 backdrop-blur-sm shadow-xs space-y-4"
          >
            <div className="flex flex-wrap justify-between items-start gap-3 w-full">
              <div className="space-y-1">
                <span
                  className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    obs.tipo_nota === 'DISCIPLINARIA'
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                      : obs.tipo_nota === 'LOGRO_DESTACADO'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                  }`}
                >
                  {obs.tipo_nota === 'DISCIPLINARIA'
                    ? 'Anotación Disciplinaria'
                    : obs.tipo_nota === 'LOGRO_DESTACADO'
                    ? 'Reconocimiento / Logro Destacado'
                    : 'Anotación Pedagógica'}
                </span>
                <h4 className="text-sm font-bold text-foreground mt-2">Registrado por: {obs.docenteNombre}</h4>
                <p className="text-[10px] text-muted-foreground">
                  Fecha de anotación:{' '}
                  {new Date(obs.fecha_registro).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              {/* Digital Sign Section */}
              <div className="flex items-center">
                {obs.firmado ? (
                  <div className="flex flex-col items-end text-right">
                    <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>{' '}
                      Firmado de Enterado
                    </span>
                    <span className="text-[9px] text-muted-foreground mt-1">
                      Por: {obs.firmadorNombre || 'Acudiente'}
                    </span>
                    {obs.fecha_firma && (
                      <span className="text-[8px] text-muted-foreground/60">
                        El{' '}
                        {new Date(obs.fecha_firma).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => onSignObservacion(obs.id_observador)}
                    disabled={signingObsId === obs.id_observador}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {signingObsId === obs.id_observador ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-slate-950" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>{' '}
                        Firmando...
                      </>
                    ) : (
                      <>✍️ Firmar Enterado</>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-border text-xs">
              <div className="space-y-1.5">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Observación Original del Docente
                </span>
                <p className="text-foreground italic leading-relaxed">&ldquo;{obs.observacion_informal}&rdquo;</p>
              </div>

              {obs.observacion_formal_ia && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-1.5 text-foreground leading-relaxed italic">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-primary">
                    Transcripción Formal / Pedagógica (IA)
                  </span>
                  <p>&ldquo;{obs.observacion_formal_ia}&rdquo;</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
