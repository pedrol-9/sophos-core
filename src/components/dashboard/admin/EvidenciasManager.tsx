'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getEvidenciasAdmin,
  upsertEvidencia,
  deleteEvidencia,
  EvidenciaRow,
} from '@/app/actions/evidenciasActions';
import { createClient } from '@/utils/supabase/client';

type MateriaOption = { id_materia: string; nombre: string };

export function EvidenciasManager() {
  const supabase = createClient();
  const [materias, setMaterias] = useState<MateriaOption[]>([]);
  const [selectedMateria, setSelectedMateria] = useState('');
  const [selectedGrado, setSelectedGrado] = useState('6');
  const [evidencias, setEvidencias] = useState<EvidenciaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePeriod, setActivePeriod] = useState<{ numero_periodo: number; fecha_inicio: string; fecha_fin: string } | null>(null);

  // Form de creación/edición
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<EvidenciaRow | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formOrden, setFormOrden] = useState(1);
  const [formActivo, setFormActivo] = useState(true);
  const [saving, setSaving] = useState(false);

  const GRADOS = ['1','2','3','4','5','6','7','8','9','10','11'];

  // Cargar materias y periodo activo al montar
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

      const { data: periodData } = await supabase
        .from('periodos_academicos')
        .select('numero_periodo, fecha_inicio, fecha_fin')
        .eq('id_institucion', idInst)
        .eq('activo', true)
        .maybeSingle();
      if (periodData) {
        setActivePeriod(periodData);
      }
    }
    loadInitialData();
  }, [supabase]);

  const loadEvidencias = useCallback(() => {
    if (!selectedMateria) return;
    setLoading(true);
    setError('');
    getEvidenciasAdmin({ idMateria: selectedMateria, grado: selectedGrado }).then((res) => {
      setLoading(false);
      if (res.success) setEvidencias(res.data || []);
      else setError(res.error || 'Error al cargar evidencias.');
    });
  }, [selectedMateria, selectedGrado]);

  useEffect(() => {
    let active = true;
    if (!selectedMateria) return;
    getEvidenciasAdmin({ idMateria: selectedMateria, grado: selectedGrado }).then((res) => {
      if (!active) return;
      setLoading(false);
      setError(res.success ? '' : (res.error || 'Error al cargar evidencias.'));
      setEvidencias(res.success ? (res.data || []) : []);
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

  function openEditForm(ev: EvidenciaRow) {
    setEditTarget(ev);
    setFormNombre(ev.nombre);
    setFormDescripcion(ev.descripcion || '');
    setFormOrden(ev.orden);
    setFormActivo(ev.activo);
    setShowForm(true);
  }

  async function handleToggleActivo(ev: EvidenciaRow) {
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
      {/* INDICADOR DE PERIODO ACTIVO */}
      {activePeriod ? (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 px-4 py-3 rounded-2xl animate-in fade-in duration-300">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <p className="text-xs text-primary font-medium">
            Registrando evidencias para el <strong className="text-foreground text-sm font-bold">Periodo {activePeriod.numero_periodo}</strong> ({activePeriod.fecha_inicio} al {activePeriod.fecha_fin})
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <p className="text-xs text-amber-600 dark:text-amber-300 font-medium">
            No se encontró un periodo académico activo para esta institución.
          </p>
        </div>
      )}

      {/* FILTROS */}
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

        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all shadow-md cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Evidencia
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 dark:text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* LISTA DE EVIDENCIAS */}
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
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="py-3 px-4 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-10">#</th>
                <th className="py-3 px-4 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Nombre de la Evidencia</th>
                <th className="py-3 px-4 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Descripción</th>
                <th className="py-3 px-4 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-24">Estado</th>
                <th className="py-3 px-4 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {evidencias.map((ev) => (
                <tr key={ev.id_evidencia} className="hover:bg-secondary/40 transition-colors">
                  <td className="py-3 px-4 text-muted-foreground text-xs font-mono">{ev.orden}</td>
                  <td className="py-3 px-4 font-semibold text-foreground">{ev.nombre}</td>
                  <td className="py-3 px-4 text-muted-foreground text-xs hidden md:table-cell">
                    {ev.descripcion || <span className="italic text-muted-foreground/50">Sin descripción</span>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActivo(ev)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all hover:scale-105 ${
                        ev.activo
                          ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/25'
                          : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'
                      }`}
                      title="Clic para cambiar estado de la evidencia"
                    >
                      {ev.activo ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditForm(ev)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(ev.id_evidencia)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
              {editTarget ? 'Editar Evidencia' : 'Nueva Evidencia'}
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
                    Estado
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      checked={formActivo}
                      onChange={(e) => setFormActivo(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-xs font-semibold text-foreground">
                      {formActivo ? 'Evidencia Activa' : 'Inactiva'}
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
                className="px-4 py-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground text-sm font-semibold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold transition-all"
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
