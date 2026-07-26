'use client';

interface ConfirmCloseModalProps {
  confirmModal: { periodId: string; numero: number } | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmCloseModal({ confirmModal, onClose, onConfirm }: ConfirmCloseModalProps) {
  if (!confirmModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95 duration-200 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera / Warning Icon */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              ¿Cerrar Período Académico {confirmModal.numero}?
            </h3>
            <p className="text-[11px] text-muted-foreground">Esta es una acción inmutable y administrativa.</p>
          </div>
        </div>

        {/* Detalles / Advertencias */}
        <div className="space-y-3 my-4 bg-background border border-border rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground">
            Al confirmar el cierre de este período se realizarán los siguientes procesos:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
            <li>
              Se calcularán los <strong>promedios ponderados</strong> por asignatura.
            </li>
            <li>Se guardarán copias históricas inmutables de los boletines.</li>
            <li>
              <strong>Se congelarán las planillas</strong>; los docentes no podrán modificar calificaciones.
            </li>
            <li>Se activará de forma automática el siguiente período académico.</li>
          </ul>
        </div>

        {/* Acciones */}
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border bg-secondary text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Confirmar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
