'use client';

import { useState, useEffect } from 'react';
import { EvidenciaAdminDetail } from '@/app/actions/academic/evidencias';

interface EvidenciaFormModalProps {
  showForm: boolean;
  editTarget: EvidenciaAdminDetail | null;
  defaultOrden: number;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (data: { nombre: string; descripcion: string; orden: number; activo: boolean }) => void;
}

export function EvidenciaFormModal({
  showForm,
  editTarget,
  defaultOrden,
  saving,
  error,
  onClose,
  onSave,
}: EvidenciaFormModalProps) {
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formOrden, setFormOrden] = useState(1);
  const [formActivo, setFormActivo] = useState(true);

  useEffect(() => {
    if (editTarget) {
      setFormNombre(editTarget.nombre);
      setFormDescripcion(editTarget.descripcion || '');
      setFormOrden(editTarget.orden);
      setFormActivo(editTarget.activo);
    } else {
      setFormNombre('');
      setFormDescripcion('');
      setFormOrden(defaultOrden);
      setFormActivo(true);
    }
  }, [editTarget, defaultOrden, showForm]);

  if (!showForm) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) return;
    onSave({
      nombre: formNombre,
      descripcion: formDescripcion,
      orden: formOrden,
      activo: formActivo,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 text-foreground"
      >
        <h3 className="text-sm font-bold text-foreground">
          {editTarget ? 'Editar Evidencia' : 'Nueva Evidencia Máster'}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold tracking-wider">
              Nombre de la Evidencia *
            </label>
            <input
              type="text"
              required
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              placeholder="Ej: Evaluación escrita, Proyecto de aula"
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold tracking-wider">
              Descripción (opcional)
            </label>
            <textarea
              value={formDescripcion}
              onChange={(e) => setFormDescripcion(e.target.value)}
              placeholder="Describe qué se evalúa en esta evidencia..."
              rows={2}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold tracking-wider">
                Orden en planilla
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={formOrden}
                onChange={(e) => setFormOrden(Number(e.target.value))}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold tracking-wider">
                Estado en Banco
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={formActivo}
                  onChange={(e) => setFormActivo(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs font-semibold text-foreground">
                  {formActivo ? 'Disponible' : 'Inactiva'}
                </span>
              </label>
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground text-sm font-semibold transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold transition-all cursor-pointer"
          >
            {saving ? 'Guardando...' : editTarget ? 'Actualizar' : 'Crear Evidencia'}
          </button>
        </div>
      </form>
    </div>
  );
}
