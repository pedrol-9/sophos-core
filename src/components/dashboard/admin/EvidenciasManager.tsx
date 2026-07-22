'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getEvidenciasAdminFull,
  upsertEvidencia,
  deleteEvidencia,
  aprobarEvidenciaAdmin,
  rechazarEvidenciaAdmin,
  EvidenciaAdminDetail,
} from '@/app/actions/evidenciasActions';
import { createClient } from '@/utils/supabase/client';

type MateriaOption = { id_materia: string; nombre: string };

export function EvidenciasManager() {
  const supabase = createClient();
  const [materias, setMaterias] = useState<MateriaOption[]>([]);
  const [selectedMateria, setSelectedMateria] = useState('');
  const [selectedGrado, setSelectedGrado] = useState('6');
  const [evidencias, setEvidencias] = useState<EvidenciaAdminDetail[]>([]);
  const [stats, setStats] = useState({
    totalBanco: 0,
    totalActivasPeriodo: 0,
    totalPendientesAprobacion: 0,
    totalUsadasAnteriores: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form de creación/edición
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<EvidenciaAdminDetail | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formOrden, setFormOrden] = useState(1);
  const [formActivo, setFormActivo] = useState(true);
  const [saving, setSaving] = useState(false);

  const GRADOS = ['1','2','3','4','5','6','7','8','9','10','11'];

  // Cargar materias al montar
  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const idInst = user.app_metadata?.id_institucion;

      const { data } = await supabase
        .from('materias')
        .select('id_materia, nombre')
        .eq('id_institucion', idInst)
        .order('nombre');

      if (data && data.length > 0) {
        setMaterias(data);
        setSelectedMateria(data[0].id_materia);
      }
    }
    loadInitialData();
  }, [supabase]);

  const loadEvidencias = useCallback(() => {
    if (!selectedMateria) return;
    setLoading(true);
    setError('');
    getEvidenciasAdminFull({ idMateria: selectedMateria, grado: selectedGrado }).then((res) => {
      setLoading(false);
      if (res.success) {
        setEvidencias(res.data || []);
        if (res.stats) setStats(res.stats);
      } else {
        setError(res.error || 'Error al cargar evidencias.');
      }
    });
  }, [selectedMateria, selectedGrado]);

  useEffect(() => {
    let active = true;
    if (!selectedMateria) return;
    setLoading(true);
    getEvidenciasAdminFull({ idMateria: selectedMateria, grado: selectedGrado }).then((res) => {
      if (!active) return;
      setLoading(false);
      if (res.success) {
        setError('');
        setEvidencias(res.data || []);
        if (res.stats) setStats(res.stats);
      } else {
        setError(res.error || 'Error al cargar evidencias.');
        setEvidencias([]);
      }
    });
    return () => { active = false; };
  }, [selectedMateria, selectedGrado]);

  function openCreateForm() {
    setEditTarget(null);
    setFormNombre('');
    setFormDescripcion('');
    setFormOrden(evidencias.length + 1);
    setFormActivo(true);
    setShowForm(true);
  }

  function openEditForm(ev: EvidenciaAdminDetail) {
    setEditTarget(ev);
    setFormNombre(ev.nombre);
    setFormDescripcion(ev.descripcion || '');
    setFormOrden(ev.orden);
    setFormActivo(ev.activo);
    setShowForm(true);
  }

  async function handleToggleActivo(ev: EvidenciaAdminDetail) {
    const res = await upsertEvidencia({
      id_evidencia: ev.id_evidencia,
      id_materia: ev.id_materia,
      grado: ev.grado,
      nombre: ev.nombre,
      descripcion: ev.descripcion || undefined,
      orden: ev.orden,
      activo: !ev.activo,
    });
    if (res.success) {
      loadEvidencias();
    } else {
      setError(res.error || 'Error al cambiar estado de la evidencia.');
    }
  }

  async function handleAprobar(idEvidencia: string) {
    const res = await aprobarEvidenciaAdmin(idEvidencia);
    if (res.success) {
      loadEvidencias();
    } else {
      setError(res.error || 'Error al aprobar la evidencia sugerida.');
    }
  }

  async function handleRechazar(idEvidencia: string) {
    if (!confirm('¿Rechazar esta evidencia sugerida por el docente?')) return;
    const res = await rechazarEvidenciaAdmin(idEvidencia);
    if (res.success) {
      loadEvidencias();
    } else {
      setError(res.error || 'Error al rechazar la evidencia.');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formNombre.trim()) return;
    setSaving(true);
    const res = await upsertEvidencia({
      id_evidencia: editTarget?.id_evidencia,
      id_materia: selectedMateria,
      grado: selectedGrado,
      nombre: formNombre,
      descripcion: formDescripcion,
      orden: formOrden,
      activo: formActivo,
    });
    setSaving(false);
    if (res.success) {
      setShowForm(false);
      loadEvidencias();
    } else {
      setError(res.error || 'Error al guardar.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta evidencia? Se perderán las configuraciones de docentes asociadas.')) return;
    const res = await deleteEvidencia(id);
    if (res.success) loadEvidencias();
    else setError(res.error || 'Error al eliminar.');
  }

  return (
    <div className="space-y-6">
      {/* FILTROS Y ACCIÓN */}
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Materia</label>
            <select
              value={selectedMateria}
              onChange={(e) => setSelectedMateria(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-[200px]"
            >
              {materias.map((m) => (
                <option key={m.id_materia} value={m.id_materia} className="bg-card text-foreground">
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Grado</label>
            <select
              value={selectedGrado}
              onChange={(e) => setSelectedGrado(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {GRADOS.map((g) => (
                <option key={g} value={g} className="bg-card text-foreground">{g}°</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all shadow-md cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Evidencia Máster
        </button>
      </div>

      {/* RESUMEN EN UNA SOLA LÍNEA DE ALTO MÍNIMO */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-6 py-2.5 px-4 bg-secondary/30 border border-border rounded-xl text-xs font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-muted-foreground">Banco:</span>
          <strong className="text-foreground font-bold">{stats.totalBanco}</strong>
        </div>
        <span className="text-border hidden sm:inline">•</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
          <span className="text-muted-foreground">Activas Periodo:</span>
          <strong className="text-foreground font-bold">{stats.totalActivasPeriodo}</strong>
        </div>
        <span className="text-border hidden sm:inline">•</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <span className="text-muted-foreground">Sugeridas:</span>
          <strong className={`font-bold ${stats.totalPendientesAprobacion > 0 ? 'text-amber-500 font-black animate-pulse' : 'text-foreground'}`}>
            {stats.totalPendientesAprobacion}
          </strong>
        </div>
        <span className="text-border hidden sm:inline">•</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
          <span className="text-muted-foreground">Usadas Anteriores:</span>
          <strong className="text-foreground font-bold">{stats.totalUsadasAnteriores}</strong>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 dark:text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* TABLA UNIFICADA DE EVIDENCIAS */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center font-medium">Cargando evidencias...</div>
      ) : evidencias.length === 0 ? (
        <div className="py-16 text-center border border-border border-dashed rounded-2xl bg-card/40">
          <svg className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-muted-foreground text-sm font-medium">
            No hay evidencias para {selectedGrado}° en esta materia.
          </p>
          <p className="text-muted-foreground/60 text-xs mt-1">
            Crea la primera evidencia para habilitar la planilla de docentes.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xs custom-scrollbar overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="py-3 px-4 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-10">#</th>
                <th className="py-3 px-4 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nombre de la Evidencia</th>
                <th className="py-3 px-4 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Descripción</th>
                <th className="py-3 px-4 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Estado Evidencia</th>
                <th className="py-3 px-4 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Usado en</th>
                <th className="py-3 px-4 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-20">Peso</th>
                <th className="py-3 px-4 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-36">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {evidencias.map((ev) => {
                const isPendiente = ev.estado_aprobacion === 'PENDIENTE';
                const isActiva = ev.peso_periodo !== null && ev.peso_periodo !== undefined && ev.peso_periodo > 0;
                const isUsadaAnterior = Boolean(ev.usadaEnPeriodoAnterior && !isActiva);
                const isInactivaCat = !ev.activo;

                return (
                  <tr key={ev.id_evidencia} className={`hover:bg-secondary/40 transition-colors ${
                    isPendiente ? 'bg-amber-500/5' : ''
                  }`}>
                    <td className="py-3 px-4 text-muted-foreground text-xs font-mono">{ev.orden}</td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {ev.nombre}
                    </td>
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
                          ACTIVA
                        </span>
                      ) : isUsadaAnterior || isInactivaCat ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/25">
                          INACTIVA
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
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
                            const isActivaEnEstePeriodo = isActiva && (ev.periodo_asignado?.includes(p) || false);

                            return (
                              <span
                                key={p}
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                                  !isActivaEnEstePeriodo
                                    ? 'bg-slate-500/15 text-slate-400 border-slate-500/25'
                                    : isP1 ? 'bg-blue-500/15 text-blue-500 border-blue-500/25' :
                                      isP2 ? 'bg-amber-500/15 text-amber-500 border-amber-500/25' :
                                      isP3 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25' :
                                      isP4 ? 'bg-purple-500/15 text-purple-500 border-purple-500/25' :
                                      'bg-secondary text-muted-foreground border-border'
                                }`}
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
                      {ev.peso_periodo !== null && ev.peso_periodo !== undefined ? (
                        <span className="text-emerald-500 font-bold">{(ev.peso_periodo * 100).toFixed(0)}%</span>
                      ) : (
                        <span className="text-muted-foreground/40">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end items-center gap-1.5">
                        {isPendiente ? (
                          <>
                            <button
                              onClick={() => handleAprobar(ev.id_evidencia)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-background font-bold text-[10px] transition-all shadow-xs cursor-pointer"
                              title="Aprobar e integrar al banco"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => openEditForm(ev)}
                              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                              title="Editar antes de aprobar"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRechazar(ev.id_evidencia)}
                              className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-semibold transition-all cursor-pointer"
                              title="Rechazar solicitud"
                            >
                              Rechazar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditForm(ev)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
                              title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(ev.id_evidencia)}
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
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <form
            onSubmit={handleSave}
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

            {error && (
              <p className="text-xs text-rose-500 font-medium">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
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
      )}
    </div>
  );
}
