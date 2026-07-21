'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getEvidenciasForAsignacion,
  saveConfigEvidenciasPeriodo,
  EvidenciaConConfig,
  ConfigEvidenciaPeriodo,
} from '@/app/actions/evidenciasActions';

interface EvidenciasPeriodoModalProps {
  idAsignacion: string;
  idPeriodo: string;
  onClose: () => void;
  /** Se llama tras guardar para que la planilla recargue columnas */
  onSaved: () => void;
}

export function EvidenciasPeriodoModal({
  idAsignacion,
  idPeriodo,
  onClose,
  onSaved,
}: EvidenciasPeriodoModalProps) {
  const [evidencias, setEvidencias] = useState<EvidenciaConConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getEvidenciasForAsignacion(idAsignacion, idPeriodo);
    if (res.success) setEvidencias(res.data || []);
    else setError(res.error || 'Error al cargar evidencias.');
    setLoading(false);
  }, [idAsignacion, idPeriodo]);

  useEffect(() => {
    let active = true;
    getEvidenciasForAsignacion(idAsignacion, idPeriodo).then((res) => {
      if (!active) return;
      setLoading(false);
      if (res.success) setEvidencias(res.data || []);
      else setError(res.error || 'Error al cargar evidencias.');
    });
    return () => { active = false; };
  }, [idAsignacion, idPeriodo, load]);

  // Cierre con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // ─── TOGGLE On/Off ───────────────────────────────────────────────────────────
  function toggleEvidencia(idEvidencia: string) {
    setEvidencias((prev) => {
      const updated = prev.map((ev) =>
        ev.id_evidencia === idEvidencia ? { ...ev, activaEnPeriodo: !ev.activaEnPeriodo } : ev
      );
      return recalcularPesos(updated);
    });
  }

  // ─── CAMBIO MANUAL DE PESO ────────────────────────────────────────────────────
  function handlePesoChange(idEvidencia: string, rawValue: string) {
    if (rawValue === '') {
      setEvidencias((prev) => {
        const activas = prev.filter((e) => e.activaEnPeriodo);
        const restantes = activas.filter((e) => e.id_evidencia !== idEvidencia);
        const pesoRestante = 1.0;
        const pesoEquitativoResto = restantes.length > 0 ? pesoRestante / restantes.length : 0;

        return prev.map((ev) => {
          if (ev.id_evidencia === idEvidencia) return { ...ev, peso: 0 };
          if (ev.activaEnPeriodo) return { ...ev, peso: pesoEquitativoResto };
          return ev;
        });
      });
      return;
    }

    const newPct = parseFloat(rawValue);
    if (isNaN(newPct) || newPct < 0 || newPct > 100) return;

    setEvidencias((prev) => {
      const activas = prev.filter((e) => e.activaEnPeriodo);
      if (activas.length <= 1) return prev;

      const newPeso = newPct / 100;
      const restantes = activas.filter((e) => e.id_evidencia !== idEvidencia);
      const pesoRestante = Math.max(0, 1.0 - newPeso);
      const pesoEquitativoResto = restantes.length > 0 ? pesoRestante / restantes.length : 0;

      return prev.map((ev) => {
        if (ev.id_evidencia === idEvidencia) return { ...ev, peso: newPeso };
        if (ev.activaEnPeriodo) return { ...ev, peso: pesoEquitativoResto };
        return ev;
      });
    });
  }

  // ─── RECALCULAR PESOS EQUITATIVOS AL TOGGLE ───────────────────────────────────
  function recalcularPesos(evs: EvidenciaConConfig[]): EvidenciaConConfig[] {
    const activas = evs.filter((e) => e.activaEnPeriodo);
    if (activas.length === 0) return evs;
    const pesoEquitativo = 1 / activas.length;
    return evs.map((ev) => ({
      ...ev,
      peso: ev.activaEnPeriodo ? pesoEquitativo : 0,
    }));
  }

  // ─── GUARDAR ─────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setError('');

    const configs: ConfigEvidenciaPeriodo[] = evidencias.map((ev) => ({
      id_evidencia: ev.id_evidencia,
      activo: ev.activaEnPeriodo,
      peso: ev.activaEnPeriodo ? ev.peso : 0,
    }));

    const res = await saveConfigEvidenciasPeriodo(idAsignacion, idPeriodo, configs);
    setSaving(false);

    if (res.success) {
      onSaved();
      onClose();
    } else {
      setError(res.error || 'Error al guardar la configuración.');
    }
  }

  // ─── TOTALES ─────────────────────────────────────────────────────────────────
  const activas = evidencias.filter((e) => e.activaEnPeriodo);
  const totalPct = activas.reduce((acc, e) => acc + e.peso * 100, 0);
  const totalOk = Math.abs(totalPct - 100) < 0.5;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 text-foreground">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-bold text-foreground">Evidencias del Periodo</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Activa las evidencias a evaluar y define su peso en la definitiva.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* CONTENT */}
        <div className="px-6 py-5 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : evidencias.length === 0 ? (
            <div className="py-10 text-center">
              <svg className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-muted-foreground font-medium">No hay evidencias configuradas para este grado y materia.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">El coordinador debe crearlas desde el panel de administración.</p>
            </div>
          ) : (
            evidencias.map((ev) => (
              <div
                key={ev.id_evidencia}
                className={`rounded-xl border transition-all duration-200 ${
                  ev.activaEnPeriodo
                    ? 'border-primary/30 bg-primary/10'
                    : 'border-border bg-background opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => toggleEvidencia(ev.id_evidencia)}
                    className={`relative w-10 h-5 rounded-full transition-all duration-300 focus:outline-none shrink-0 cursor-pointer ${
                      ev.activaEnPeriodo ? 'bg-primary' : 'bg-secondary'
                    }`}
                    aria-label={ev.activaEnPeriodo ? 'Desactivar' : 'Activar'}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-300 ${
                        ev.activaEnPeriodo ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{ev.nombre}</p>
                    {ev.descripcion && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{ev.descripcion}</p>
                    )}
                  </div>

                  {/* Peso (solo si activa) */}
                  {ev.activaEnPeriodo && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        step={1}
                        value={ev.peso === 0 ? '' : Math.round(ev.peso * 100)}
                        onChange={(e) => handlePesoChange(ev.id_evidencia, e.target.value)}
                        className="w-14 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                      />
                      <span className="text-xs text-muted-foreground font-semibold">%</span>
                    </div>
                  )}
                </div>

                {/* Barra de progreso del peso */}
                {ev.activaEnPeriodo && (
                  <div className="px-4 pb-3">
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(ev.peso * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        {evidencias.length > 0 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4">
            
            {/* Total de pesos */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${totalOk ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className={`text-xs font-semibold ${totalOk ? 'text-emerald-500' : 'text-amber-500'}`}>
                Total: {totalPct.toFixed(0)}%
              </span>
              {!totalOk && (
                <span className="text-[10px] text-amber-500/80 font-medium">
                  (debe sumar 100%)
                </span>
              )}
            </div>

            {error && <p className="text-xs text-rose-500 flex-1 font-medium">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || activas.length === 0}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold transition-all shadow-md cursor-pointer"
              >
                {saving ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
