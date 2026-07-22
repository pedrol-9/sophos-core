'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getEvidenciasForAsignacion,
  saveConfigEvidenciasPeriodo,
  sugerirEvidenciaDocente,
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

  // Control de vista deslizable/intercambiable (LIST vs SUGGEST)
  const [activeView, setActiveView] = useState<'LIST' | 'SUGGEST'>('LIST');
  const [sugerirNombre, setSugerirNombre] = useState('');
  const [sugerirDesc, setSugerirDesc] = useState('');
  const [sugerirSaving, setSugerirSaving] = useState(false);
  const [sugerirSuccess, setSugerirSuccess] = useState('');

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
      const updated = prev.map((ev) => {
        if (ev.id_evidencia === idEvidencia) {
          if (ev.usadaEnPeriodoAnterior) return ev;
          return { ...ev, activaEnPeriodo: !ev.activaEnPeriodo };
        }
        return ev;
      });
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

  // ─── ENVIAR SUGERENCIA DE NUEVA EVIDENCIA ─────────────────────────────────────
  async function handleSugerir(e: React.FormEvent) {
    e.preventDefault();
    if (!sugerirNombre.trim()) return;
    setSugerirSaving(true);
    setSugerirSuccess('');

    const res = await sugerirEvidenciaDocente({
      idAsignacion,
      nombre: sugerirNombre,
      descripcion: sugerirDesc,
    });

    setSugerirSaving(false);
    if (res.success) {
      setSugerirSuccess('Sugerencia enviada correctamente a Coordinación. Al ser aprobada se activará en tu planilla.');
      setSugerirNombre('');
      setSugerirDesc('');
      setTimeout(() => {
        setActiveView('LIST');
        setSugerirSuccess('');
        load();
      }, 1600);
    } else {
      setError(res.error || 'Error al enviar la sugerencia.');
    }
  }

  // ─── GUARDAR CONFIGURACIÓN ───────────────────────────────────────────────────
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
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in slide-in-from-bottom-4 duration-300 text-foreground flex flex-col h-[580px]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {activeView === 'LIST' ? 'Configurar Evidencias del Periodo' : 'Proponer Nueva Evidencia'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeView === 'LIST'
                ? 'Selecciona las evidencias disponibles y asigna sus pesos.'
                : 'Envía una sugerencia a Coordinación/Administración.'}
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

        {/* BARRA SUPERIOR DE NAVEGACIÓN VISTA DE SUGERENCIA */}
        <div className="px-6 py-2.5 border-b border-border/50 bg-secondary/20 flex items-center justify-between shrink-0">
          {activeView === 'LIST' ? (
            <>
              <span className="text-xs text-muted-foreground font-medium">
                ¿No encuentras una evidencia requerida?
              </span>
              <button
                type="button"
                onClick={() => { setError(''); setActiveView('SUGGEST'); }}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Sugerir Evidencia
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { setError(''); setActiveView('LIST'); }}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver a la lista de evidencias
            </button>
          )}
        </div>

        {/* CONTENIDO INTERCAMBIABLE / DESLIZABLE (ALTO FIJO) */}
        <div className="flex-1 px-6 py-4 overflow-y-auto custom-scrollbar">
          {activeView === 'LIST' ? (
            loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : evidencias.length === 0 ? (
              <div className="py-12 text-center">
                <svg className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-muted-foreground font-medium">No hay evidencias disponibles para seleccionar.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Usa el botón de arriba para proponer una nueva evidencia a coordinación.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {evidencias.map((ev) => {
                  const isBlocked = ev.usadaEnPeriodoAnterior;
                  const isPendiente = ev.estado_aprobacion === 'PENDIENTE';

                  return (
                    <div
                      key={ev.id_evidencia}
                      className={`rounded-xl border transition-all duration-200 ${
                        isBlocked
                          ? 'border-border bg-secondary/30 opacity-60'
                          : isPendiente
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : ev.activaEnPeriodo
                          ? 'border-primary/30 bg-primary/10'
                          : 'border-border bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        
                        {/* Toggle Switch */}
                        <button
                          type="button"
                          disabled={isBlocked || isPendiente}
                          onClick={() => toggleEvidencia(ev.id_evidencia)}
                          className={`relative w-10 h-5 rounded-full transition-all duration-300 focus:outline-none shrink-0 ${
                            isBlocked || isPendiente
                              ? 'bg-secondary/80 cursor-not-allowed'
                              : ev.activaEnPeriodo
                              ? 'bg-primary cursor-pointer'
                              : 'bg-secondary cursor-pointer'
                          }`}
                          aria-label={ev.activaEnPeriodo ? 'Desactivar' : 'Activar'}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-xs transition-transform duration-300 ${
                              ev.activaEnPeriodo && !isBlocked ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground truncate">{ev.nombre}</p>
                            {isBlocked && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-400 border border-slate-500/25">
                                Usada en {ev.periodoAnteriorNombre}
                              </span>
                            )}
                            {isPendiente && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-500 border border-amber-500/25">
                                Pendiente de aprobación
                              </span>
                            )}
                          </div>
                          {ev.descripcion && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{ev.descripcion}</p>
                          )}
                        </div>

                        {/* Peso (solo si activa) */}
                        {ev.activaEnPeriodo && !isBlocked && (
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
                      {ev.activaEnPeriodo && !isBlocked && (
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
                  );
                })}
              </div>
            )
          ) : (
            /* VISTA B: FORMULARIO DE SUGERENCIA DE EVIDENCIA */
            <form onSubmit={handleSugerir} className="space-y-4 py-2 animate-in fade-in duration-200">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">
                  Al enviar la sugerencia, la evidencia ingresará al banco en revisión. Coordinación podrá aprobarla o modificarla para habilitar la calificación.
                </p>
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold tracking-wider">
                  Nombre de la Evidencia *
                </label>
                <input
                  type="text"
                  required
                  value={sugerirNombre}
                  onChange={(e) => setSugerirNombre(e.target.value)}
                  placeholder="Ej: Proyecto de Investigación Aplicada"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-semibold tracking-wider">
                  Descripción u Objetivo (opcional)
                </label>
                <textarea
                  rows={3}
                  value={sugerirDesc}
                  onChange={(e) => setSugerirDesc(e.target.value)}
                  placeholder="Describe brevemente lo que se evaluará en esta actividad..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors resize-none"
                />
              </div>

              {sugerirSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-semibold">
                  {sugerirSuccess}
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-semibold">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveView('LIST')}
                  className="px-4 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sugerirSaving}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {sugerirSaving ? 'Enviando...' : 'Enviar a Coordinación'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* FOOTER PARA VISTA DE LISTA */}
        {activeView === 'LIST' && evidencias.length > 0 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-4 shrink-0">
            
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
