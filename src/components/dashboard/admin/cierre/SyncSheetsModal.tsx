'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { triggerSyncSheets, SyncSheetsResult } from '@/app/actions/sync-sheets-actions';
import { resetPeriodoGrades } from '@/app/actions/cierre-actions';

interface SyncSheetsModalProps {
  onSyncCompleted?: () => void;
}

export function SyncSheetsModal({ onSyncCompleted }: SyncSheetsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [result, setResult] = useState<SyncSheetsResult | null>(null);
  const [showPendingList, setShowPendingList] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStartSync = async () => {
    setLoading(true);
    setResult(null);
    setShowPendingList(false);

    try {
      const res = await triggerSyncSheets();
      setResult(res);
      if (res.success && onSyncCompleted) {
        onSyncCompleted();
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err?.message || 'Error durante la sincronización.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetGrades = async () => {
    if (!confirm('¿Vaciar todas las calificaciones del Periodo 3?')) return;
    setResetStatus('loading');
    try {
      const res = await resetPeriodoGrades(3);
      if (res.success) {
        setResetStatus('success');
        if (onSyncCompleted) onSyncCompleted();
        setTimeout(() => setResetStatus('idle'), 3000);
      } else {
        setResetStatus('idle');
        alert(`Error al vaciar notas: ${res.error}`);
      }
    } catch (err: any) {
      setResetStatus('idle');
      alert(`Error al vaciar notas: ${err?.message}`);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setResult(null);
    setResetStatus('idle');
  };

  const handleClose = () => {
    if (loading || resetStatus === 'loading') return;
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
      >
        <svg className="w-4 h-4 text-emerald-100" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span>Sincronizar Google Sheets</span>
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[82vh] overflow-hidden text-foreground">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Sincronización de Calificaciones</h3>
                  <p className="text-[11px] text-muted-foreground">Google Sheets Cloud Sync</p>
                </div>
              </div>

              {!loading && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Body con Scroll Controlado */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              {!result && !loading && (
                <div className="text-center py-5 space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">¿Iniciar recolección de notas?</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      Se leerán las hojas válidas de Google Sheets y se actualizarán las calificaciones en el sistema.
                    </p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-muted-foreground">Procesando y guardando calificaciones...</p>
                </div>
              )}

              {result && (
                <div className="space-y-3.5">
                  {/* Banner de Estado */}
                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
                    result.success
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400'
                  }`}>
                    {result.success ? (
                      <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    )}
                    <span>
                      {result.success
                        ? `Sincronización completada — Período ${result.periodo_procesado ?? 3}`
                        : result.error}
                    </span>
                  </div>

                  {/* Métricas */}
                  {result.success && result.resumen && (
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="p-2.5 rounded-xl bg-card border border-border/80 shadow-2xs">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Alumnos</p>
                        <p className="text-lg font-bold text-foreground mt-0.5">{result.resumen.total_alumnos_procesados}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-card border border-border/80 shadow-2xs">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Notas Guardadas</p>
                        <p className="text-lg font-bold text-emerald-500 mt-0.5">{result.resumen.total_calificaciones_guardadas}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-card border border-border/80 shadow-2xs">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Cursos Subidos</p>
                        <p className="text-lg font-bold text-primary mt-0.5">{result.resumen.cursos_actualizados_en_este_cargue?.length || 0}</p>
                      </div>
                    </div>
                  )}

                  {/* Cursos Subidos */}
                  {result.resumen?.cursos_actualizados_en_este_cargue && result.resumen.cursos_actualizados_en_este_cargue.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Cursos actualizados:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.resumen.cursos_actualizados_en_este_cargue.map((c, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Advertencias */}
                  {result.advertencias && result.advertencias.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span>Advertencias de auditoría ({result.advertencias.length})</span>
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                        {result.advertencias.map((adv, idx) => (
                          <div key={idx} className="p-1.5 rounded-lg bg-background/60 border border-border/50 text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70 mt-1.5 shrink-0" />
                            <span>{adv.mensaje}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cursos Pendientes */}
                  {result.cursos_pendientes && result.cursos_pendientes.length > 0 && (
                    <div className="border border-border rounded-xl p-3 bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Cursos pendientes ({result.cursos_pendientes.length})</span>
                        <button
                          type="button"
                          onClick={() => setShowPendingList(!showPendingList)}
                          className="text-primary hover:underline text-[11px] cursor-pointer"
                        >
                          {showPendingList ? 'Ocultar listado' : 'Ver listado'}
                        </button>
                      </div>

                      {showPendingList && (
                        <div className="max-h-32 overflow-y-auto grid grid-cols-2 gap-1.5 pt-2 border-t border-border text-[11px] custom-scrollbar pr-1">
                          {result.cursos_pendientes.map((cp, idx) => (
                            <div key={idx} className="p-1.5 rounded bg-background border border-border">
                              <span className="font-bold text-foreground">{cp.curso}:</span> <span className="text-muted-foreground">{cp.materia}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/15 shrink-0">
              <div>
                <button
                  type="button"
                  onClick={handleResetGrades}
                  disabled={loading || resetStatus === 'loading'}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                    resetStatus === 'loading'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400'
                      : resetStatus === 'success'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10 animate-in zoom-in-95'
                      : 'text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  {resetStatus === 'loading' && (
                    <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {resetStatus === 'success' && (
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                  <span>
                    {resetStatus === 'loading'
                      ? 'Procesando...'
                      : resetStatus === 'success'
                      ? 'Notas Borradas'
                      : 'Vaciar Notas (Periodo 3)'}
                  </span>
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer"
                >
                  {result ? 'Cerrar' : 'Cancelar'}
                </button>

                <button
                  type="button"
                  onClick={handleStartSync}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{loading ? 'Sincronizando...' : result ? 'Volver a Sincronizar' : 'Iniciar Sincronización'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
