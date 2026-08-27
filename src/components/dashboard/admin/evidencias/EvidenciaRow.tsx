'use client';

import { EvidenciaAdminDetail } from '@/app/actions/academic/evidencias';

interface EvidenciaRowProps {
  ev: EvidenciaAdminDetail;
  activePeriodoNumero: number | null;
  onAprobar: (id: string) => void;
  onRechazar: (id: string) => void;
  onEdit: (ev: EvidenciaAdminDetail) => void;
  onDelete: (id: string) => void;
}

export function EvidenciaRow({
  ev,
  activePeriodoNumero,
  onAprobar,
  onRechazar,
  onEdit,
  onDelete,
}: EvidenciaRowProps) {
  const isPendiente = ev.estado_aprobacion === 'PENDIENTE';
  const isActiva = Boolean(ev.esActivaEnPeriodoVigente);
  const isUsadaAnterior = Boolean(ev.usadaEnPeriodoAnterior && !isActiva);

  return (
    <tr
      className={`hover:bg-secondary/40 transition-colors ${
        isPendiente ? 'bg-amber-500/5' : ''
      }`}
    >
      <td className="py-3 px-4 text-muted-foreground text-xs font-mono">{ev.orden}</td>
      <td className="py-3 px-4 font-semibold text-foreground">{ev.nombre}</td>
      <td className="py-3 px-4 text-muted-foreground text-xs hidden md:table-cell max-w-xs truncate">
        {ev.descripcion || <span className="italic text-muted-foreground/50">Sin descripción</span>}
      </td>
      <td className="py-3 px-4 text-center">
        {isPendiente ? (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25">
            SUGERIDA
          </span>
        ) : isActiva ? (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/25">
            ACTIVO
          </span>
        ) : isUsadaAnterior ? (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/25">
            INACTIVA
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            DISPONIBLE
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-center">
        {ev.periodosUsadosNombres && ev.periodosUsadosNombres.length > 0 ? (
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {ev.periodosUsadosNombres.map((p) => {
              const isP1 = p === 'P1';
              const isP2 = p === 'P2';
              const isP3 = p === 'P3';
              const isP4 = p === 'P4';
              const isActivaEnEsteP =
                isActiva && activePeriodoNumero !== null && p === `P${activePeriodoNumero}`;

              return (
                <span
                  key={p}
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                    isActivaEnEsteP
                      ? isP1
                        ? 'bg-blue-500/15 text-blue-500 border-blue-500/25'
                        : isP2
                        ? 'bg-amber-500/15 text-amber-500 border-amber-500/25'
                        : isP3
                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25'
                        : isP4
                        ? 'bg-purple-500/15 text-purple-500 border-purple-500/25'
                        : 'bg-sky-500/15 text-sky-400 border-sky-500/25'
                      : 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                  }`}
                  title={
                    isActivaEnEsteP
                      ? `Activa en el periodo vigente (${p})`
                      : `Usada en periodo ${p}`
                  }
                >
                  {p}
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-muted-foreground/40 text-xs font-mono">-</span>
        )}
      </td>
      <td className="py-3 px-4 text-center text-xs font-mono font-bold text-foreground">
        {ev.periodosUsadosNombres && ev.periodosUsadosNombres.length > 0 ? (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {ev.periodosUsadosNombres.map((p) => {
              const peso = ev.pesosPorPeriodo?.[p] ?? ev.peso_periodo;
              if (peso === null || peso === undefined) {
                return (
                  <span key={p} className="text-muted-foreground/40 font-mono">
                    -
                  </span>
                );
              }
              const isMultiple = ev.periodosUsadosNombres!.length > 1;
              const pct = `${Math.round(peso * 100)}%`;
              const isActivaEnEsteP =
                isActiva && activePeriodoNumero !== null && p === `P${activePeriodoNumero}`;

              return (
                <span
                  key={p}
                  className={`font-bold ${
                    isActivaEnEsteP
                      ? 'text-emerald-500 dark:text-emerald-400 font-extrabold'
                      : 'text-muted-foreground/70 dark:text-muted-foreground/50 font-normal'
                  }`}
                  title={`Peso en ${p}: ${pct}`}
                >
                  {isMultiple ? `${p}: ${pct}` : pct}
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-muted-foreground/40 font-mono">-</span>
        )}
      </td>
      <td className="py-3 px-4">
        <div className="flex justify-end items-center gap-1.5">
          {isPendiente ? (
            <>
              <button
                onClick={() => onAprobar(ev.id_evidencia)}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-background font-bold text-[10px] transition-all shadow-xs cursor-pointer"
                title="Aprobar e integrar al banco"
              >
                Aprobar
              </button>
              <button
                onClick={() => onEdit(ev)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                title="Editar antes de aprobar"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onRechazar(ev.id_evidencia)}
                className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-semibold transition-all cursor-pointer"
                title="Rechazar solicitud"
              >
                Rechazar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onEdit(ev)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                title="Editar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(ev.id_evidencia)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                title="Eliminar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
