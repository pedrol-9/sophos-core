'use client';

import { useState, useEffect } from 'react';

interface ConfirmCloseModalProps {
  confirmModal: { periodId: string; numero: number; avanceNotas?: number } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmCloseModal({ confirmModal, onClose, onConfirm }: ConfirmCloseModalProps) {
  const [bypassChecked, setBypassChecked] = useState(false);

  // Reiniciar estado de bypass cada vez que se abre el modal
  useEffect(() => {
    setBypassChecked(false);
  }, [confirmModal]);

  if (!confirmModal) return null;

  const avance = confirmModal.avanceNotas ?? 0;
  const isComplete = avance >= 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 relative shadow-2xl animate-in zoom-in-95 duration-200 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera / Warning Icon */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            isComplete
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
          }`}>
            {isComplete ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              ¿Cerrar Período Académico {confirmModal.numero}?
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Avance registrado de calificaciones: <strong className={isComplete ? 'text-emerald-500' : 'text-amber-500'}>{avance}%</strong>
            </p>
          </div>
        </div>

        {/* ALERTA DE BYPASS SI ESTÁ INCOMPLETO (< 100%) */}
        {!isComplete && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 font-bold text-xs">⚠️ Planilla Incompleta:</span>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                El período se encuentra al <strong>{avance}%</strong> de calificaciones. Faltan notas por ingresar en el sistema.
              </p>
            </div>
            <label className="flex items-start gap-2 pt-2 border-t border-amber-500/20 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bypassChecked}
                onChange={(e) => setBypassChecked(e.target.checked)}
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 shrink-0"
              />
              <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                Confirmo como Coordinador/Administrador que autorizo el cierre extraordinario con notas pendientes.
              </span>
            </label>
          </div>
        )}

        {/* Detalles / Advertencias */}
        <div className="space-y-3 my-4 bg-background border border-border rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground">
            Al confirmar el cierre de este período se ejecutarán los siguientes procesos:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
            <li>
              Se calcularán los <strong>promedios ponderados</strong> por asignatura.
            </li>
            <li>Se guardarán copias históricas inmutables de los boletines oficiales.</li>
            <li>
              <strong>Se congelarán las planillas</strong>; los docentes no podrán modificar calificaciones.
            </li>
            <li>Se activará de forma automática el siguiente período lectivo.</li>
          </ul>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border bg-secondary text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isComplete && !bypassChecked}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isComplete
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-white'
            }`}
          >
            {isComplete ? 'Confirmar y Cerrar Período' : 'Autorizar Cierre con Excepción'}
          </button>
        </div>
      </div>
    </div>
  );
}
