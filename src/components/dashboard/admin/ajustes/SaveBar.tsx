'use client';

interface SaveBarProps {
  isDirty: boolean;
  saving: boolean;
  success: boolean;
  error: string;
  onSave: () => void;
  onCancel: () => void;
}

export function SaveBar({
  isDirty,
  saving,
  success,
  error,
  onSave,
  onCancel,
}: SaveBarProps) {
  if (!isDirty && !success && !error) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 pt-4 border-t border-border animate-in fade-in duration-200">
      <div className="text-xs">
        {error && <span className="text-rose-500 font-medium">{error}</span>}
        {success && !error && (
          <span className="text-teal-500 font-semibold">✓ Guardado correctamente</span>
        )}
        {isDirty && !error && !success && (
          <span className="text-muted-foreground">Hay cambios sin guardar</span>
        )}
      </div>
      {isDirty && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 disabled:opacity-50 text-foreground font-semibold text-xs rounded-xl transition-all cursor-pointer shrink-0"
          >
            Descartar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}
