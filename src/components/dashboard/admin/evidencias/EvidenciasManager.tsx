'use client';

import { useEvidenciasManager, GRADOS } from '@/hooks/useEvidenciasManager';
import { EvidenciaFormModal } from './EvidenciaFormModal';
import { EvidenciaRow } from './EvidenciaRow';

export function EvidenciasManager() {
  const {
    materias,
    selectedMateria,
    setSelectedMateria,
    selectedGrado,
    setSelectedGrado,
    cursos,
    selectedCurso,
    setSelectedCurso,
    evidencias,
    activePeriodoNumero,
    stats,
    loading,
    error,
    showForm,
    editTarget,
    saving,
    openCreateForm,
    openEditForm,
    closeForm,
    fetchEvidencias,
    handleAprobar,
    handleRechazar,
    handleDelete,
    handleSave,
  } = useEvidenciasManager();

  return (
    <div className="space-y-6">
      {/* FILTROS Y ACCIÓN */}
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Materia
            </label>
            <select
              value={selectedMateria}
              onChange={(e) => setSelectedMateria(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-[200px]"
            >
              <option value="" className="bg-card text-foreground">
                -
              </option>
              {materias.map((m) => (
                <option key={m.id_materia} value={m.id_materia} className="bg-card text-foreground">
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Grado
            </label>
            <select
              value={selectedGrado}
              onChange={(e) => setSelectedGrado(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {GRADOS.map((g) => (
                <option key={g} value={g} className="bg-card text-foreground">
                  {g}°
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Curso
            </label>
            <select
              value={selectedCurso}
              onChange={(e) => setSelectedCurso(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="" className="bg-card text-foreground">
                -
              </option>
              {cursos.map((c) => (
                <option key={c.id_curso} value={c.id_curso} className="bg-card text-foreground">
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Botón Refrescar Estado de la Tabla */}
          <button
            type="button"
            onClick={() => fetchEvidencias()}
            title="Refrescar estado de evidencias"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Actualizar estado</span>
          </button>
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
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xs overflow-hidden animate-pulse">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <svg className="w-4 h-4 animate-spin text-primary" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="h-4 w-44 bg-secondary rounded-md" />
                <div className="h-3 w-60 bg-secondary/60 rounded-md" />
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3.5 bg-secondary/30 border border-border/40 rounded-xl">
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-secondary/80 rounded-md w-1/3" />
                  <div className="h-2.5 bg-secondary/50 rounded-md w-2/3" />
                </div>
                <div className="h-7 w-20 bg-secondary/60 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : !selectedMateria ? (
        <div className="py-16 text-center border border-border border-dashed rounded-2xl bg-card/40">
          <svg className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
          </svg>
          <p className="text-muted-foreground text-sm font-semibold">Selecciona una Materia</p>
          <p className="text-muted-foreground/60 text-xs mt-1 max-w-sm mx-auto">
            Elige una materia del filtro superior para consultar sus evidencias de aprendizaje.
          </p>
        </div>
      ) : !selectedCurso ? (
        <div className="py-16 text-center border border-border border-dashed rounded-2xl bg-card/40">
          <svg className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-muted-foreground text-sm font-semibold">Selecciona un Curso específico (ej. 11-A, 11-B)</p>
          <p className="text-muted-foreground/60 text-xs mt-1 max-w-sm mx-auto">
            Elige el curso arriba para visualizar las evidencias activas e históricas de ese grupo.
          </p>
        </div>
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
                <th className="py-3 px-4 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-10">
                  #
                </th>
                <th className="py-3 px-4 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Nombre de la Evidencia
                </th>
                <th className="py-3 px-4 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                  Descripción
                </th>
                <th className="py-3 px-4 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado Evidencia
                </th>
                <th className="py-3 px-4 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Usado en
                </th>
                <th className="py-3 px-4 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-20">
                  Peso
                </th>
                <th className="py-3 px-4 text-right text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-36">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {evidencias.map((ev) => (
                <EvidenciaRow
                  key={ev.id_evidencia}
                  ev={ev}
                  activePeriodoNumero={activePeriodoNumero}
                  onAprobar={handleAprobar}
                  onRechazar={handleRechazar}
                  onEdit={openEditForm}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FORM MODAL */}
      <EvidenciaFormModal
        showForm={showForm}
        editTarget={editTarget}
        defaultOrden={evidencias.length + 1}
        saving={saving}
        error={error}
        onClose={closeForm}
        onSave={handleSave}
      />
    </div>
  );
}
