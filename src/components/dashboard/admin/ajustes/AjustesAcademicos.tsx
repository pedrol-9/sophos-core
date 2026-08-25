'use client';

import { useState } from 'react';
import { useAjustesAcademicos } from '@/hooks/useAjustesAcademicos';
import { PeriodosSection } from './PeriodosSection';
import { EscalaSection } from './EscalaSection';
import { NomenclaturaSection } from './NomenclaturaSection';
import { CursosMateriasSection } from './CursosMateriasSection';
import { SectionCard } from './SectionCard';
import { EvidenciasManager } from '@/components/dashboard/admin';

interface AjustesAcademicosProps {
  idInstitucion?: string;
  onConfigSaved?: () => void;
  onOpenBulkImport?: () => void;
}

export function AjustesAcademicos({ idInstitucion, onConfigSaved, onOpenBulkImport }: AjustesAcademicosProps) {
  const [showVideo, setShowVideo] = useState(false);

  const {
    loading,
    // Periodos
    periodos,
    periodosDirty,
    savingPeriodos,
    periodoSuccess,
    periodoError,
    setCantPeriodos,
    updatePeriodo,
    handleSavePeriodos,
    handleCancelPeriodos,
    // Escala
    escalas,
    escalaDirty,
    savingEscala,
    escalaSuccess,
    escalaError,
    updateEscala,
    handleSaveEscala,
    handleCancelEscala,
    // Nomenclatura
    nomenclaturaOption,
    customNom,
    nomDirty,
    savingNom,
    nomSuccess,
    nomError,
    handleNomOption,
    handleCustomNomChange,
    handleSaveNom,
    handleCancelNom,
  } = useAjustesAcademicos(onConfigSaved);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-card rounded-2xl border border-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      {/* Botón Videotutorial */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowVideo(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium transition-all cursor-pointer"
        >
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ver videotutorial
        </button>
      </div>

      {/* ── FILA 1: Periodos Académicos & Escala de Valoración (2 Columnas) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <PeriodosSection
          periodos={periodos}
          periodosDirty={periodosDirty}
          savingPeriodos={savingPeriodos}
          periodoSuccess={periodoSuccess}
          periodoError={periodoError}
          onSetCantPeriodos={setCantPeriodos}
          onUpdatePeriodo={updatePeriodo}
          onSavePeriodos={handleSavePeriodos}
          onCancelPeriodos={handleCancelPeriodos}
        />

        <EscalaSection
          escalas={escalas}
          escalaDirty={escalaDirty}
          savingEscala={savingEscala}
          escalaSuccess={escalaSuccess}
          escalaError={escalaError}
          onUpdateEscala={updateEscala}
          onSaveEscala={handleSaveEscala}
          onCancelEscala={handleCancelEscala}
        />
      </div>

      {/* ── FILA 2: Nomenclatura de Cursos + Gestión de Cursos y Materias (2 Columnas) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <NomenclaturaSection
          nomenclaturaOption={nomenclaturaOption}
          customNom={customNom}
          nomDirty={nomDirty}
          savingNom={savingNom}
          nomSuccess={nomSuccess}
          nomError={nomError}
          onNomOption={handleNomOption}
          onCustomNomChange={handleCustomNomChange}
          onSaveNom={handleSaveNom}
          onCancelNom={handleCancelNom}
        />

        <CursosMateriasSection
          idInstitucion={idInstitucion}
          nomenclaturaOption={nomenclaturaOption}
          customNom={customNom}
        />
      </div>

      {/* ── FILA 3: GESTIÓN DE EVIDENCIAS DE APRENDIZAJE (Ancho completo) ───────── */}
      <SectionCard
        title="Gestión Evidencias de Aprendizaje"
        description="Catálogo máster de evidencias por grado y materia. Revisa solicitudes de docentes y consulta la selección por periodo."
      >
        <EvidenciasManager />
      </SectionCard>

      {/* ── FILA 4: Carga Masiva (CSV) (Ancho completo) ────────────────────────── */}
      <SectionCard
        title="Carga Masiva (CSV)"
        description="Importación y migración masiva de listas de estudiantes, docentes y usuarios del sistema desde archivos CSV o TXT."
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-foreground">Asistente de Importación de Datos</h4>
            <p className="text-xs text-muted-foreground">
              Sube tus listados masivos en formato CSV para matricular o registrar usuarios en lote.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenBulkImport}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Abrir Carga Masiva (CSV)
          </button>
        </div>
      </SectionCard>

      {/* ── MODAL: Videotutorial ──────────────────────────────────────────── */}
      {showVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowVideo(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Videotutorial</h3>
              <p className="text-xs text-muted-foreground mt-1">Guía paso a paso para configurar tu año lectivo</p>
            </div>
            <div className="w-full aspect-video bg-background border border-border rounded-xl flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-300 uppercase tracking-wider">
                  En construcción
                </span>
              </div>
              <p className="text-xs text-muted-foreground">El tutorial estará disponible próximamente</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
