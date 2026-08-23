'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getParametrizacionDocente,
  PeriodoInfo,
  EscalaInfo,
} from '@/app/actions/gradeActions';
import {
  getEvidenciasForAsignacion,
  getGradesheetByEvidencias,
  upsertCalificacionesBatch,
  CalificacionBatchItem,
  EvidenciaConConfig,
  GradesheetStudentEvidencias,
} from '@/app/actions/evidenciasActions';
import { EvidenciasPeriodoModal } from '../modals/EvidenciasPeriodoModal';
import { UploadGradebookModal } from '../modals/UploadGradebookModal';
import { GradebookToolbar } from './GradebookToolbar';
import { GradebookSkeleton } from './GradebookSkeleton';
import { GradebookTable } from './GradebookTable';

interface TeacherGradebookProps {
  idAsignacion: string;
  idCurso: string;
}

export function TeacherGradebook({ idAsignacion, idCurso }: TeacherGradebookProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Parametrización institucional
  const [periodos, setPeriodos] = useState<PeriodoInfo[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<PeriodoInfo | null>(null);
  const [escalas, setEscalas] = useState<EscalaInfo[]>([]);

  // Evidencias del periodo y estudiantes
  const [evidencias, setEvidencias] = useState<EvidenciaConConfig[]>([]);
  const [students, setStudents] = useState<GradesheetStudentEvidencias[]>([]);

  // Modales y expansión
  const [showEvidenciasModal, setShowEvidenciasModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);
  const [isExpandedWindow, setIsExpandedWindow] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsExpandedWindow(false);
        setIsFullscreen(false);
      }
    };

    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        setIsExpandedWindow(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFsChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, []);

  // Cambios pendientes por guardar
  const [pendingChanges, setPendingChanges] = useState<Record<string, CalificacionBatchItem>>({});
  const [savingBatch, setSavingBatch] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  // Modal de confirmación / alerta personalizado
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'confirm';
    onConfirm?: () => void;
  } | null>(null);

  // 1. Cargar parametrización de la institución al montar
  useEffect(() => {
    async function loadParametrizacion() {
      setLoading(true);
      setErrorMsg('');

      const res = await getParametrizacionDocente(idAsignacion);
      if (!res.success || !res.periodos) {
        setErrorMsg(res.error || 'Error al cargar la parametrización académica.');
        setLoading(false);
        return;
      }

      const activePer = res.periodos.find((p: PeriodoInfo) => p.activo) || res.periodos[0] || null;

      setPeriodos(res.periodos);
      setSelectedPeriodo(activePer);
      setEscalas(res.escalas || []);
      setLoading(false);
    }

    loadParametrizacion();
  }, [idAsignacion]);

  // 2. Cargar evidencias y calificaciones cuando cambia el periodo seleccionado
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!selectedPeriodo) return;

      setDataLoading(true);
      setErrorMsg('');

      const [evRes, sheetRes] = await Promise.all([
        getEvidenciasForAsignacion(idAsignacion, selectedPeriodo.id_periodo),
        getGradesheetByEvidencias(idCurso, idAsignacion, selectedPeriodo.id_periodo),
      ]);

      if (!isMounted) return;

      if (!evRes.success) {
        setErrorMsg(evRes.error || 'Error al cargar las evidencias del periodo.');
      } else {
        setEvidencias(evRes.data || []);
      }

      if (!sheetRes.success) {
        setErrorMsg(sheetRes.error || 'Error al cargar las calificaciones del curso.');
      } else {
        setStudents(sheetRes.data || []);
      }

      setDataLoading(false);
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [idAsignacion, idCurso, selectedPeriodo, refreshTrigger]);

  const activePeriodo = periodos.find((p) => p.activo);
  const isPeriodoClosed = Boolean(
    activePeriodo && selectedPeriodo && selectedPeriodo.numero_periodo < activePeriodo.numero_periodo
  );

  const handleSelectPeriodo = (p: PeriodoInfo) => {
    if (selectedPeriodo?.id_periodo === p.id_periodo || dataLoading) return;
    if (Object.keys(pendingChanges).length > 0) {
      setModalConfig({
        show: true,
        title: 'Cambios sin Guardar',
        message:
          'Tienes calificaciones modificadas que no se han guardado. ¿Seguro que deseas cambiar de periodo y perder estos cambios?',
        type: 'confirm',
        onConfirm: () => {
          setPendingChanges({});
          setLocalValues({});
          setSelectedPeriodo(p);
        },
      });
      return;
    }
    setLocalValues({});
    setSelectedPeriodo(p);
  };

  // Manejar cambio en un input de nota
  const handleGradeChange = (
    studentIdx: number,
    idEstudiante: string,
    idMatricula: string,
    idEvidencia: string,
    rawVal: string
  ) => {
    if (isPeriodoClosed) return;

    let notaNum: number | null = null;

    if (rawVal.trim() !== '') {
      const parsed = parseFloat(rawVal);
      if (isNaN(parsed) || parsed < 0.0 || parsed > 5.0) {
        return;
      }
      notaNum = parsed;
    }

    const cellKey = `${idMatricula}-${idEvidencia}`;

    setStudents((prevStudents) => {
      const copy = [...prevStudents];
      const studentObj = { ...copy[studentIdx] };
      const currentGrades = { ...studentObj.grades };

      if (notaNum === null) {
        delete currentGrades[idEvidencia];
      } else {
        currentGrades[idEvidencia] = {
          id_calificacion: currentGrades[idEvidencia]?.id_calificacion || null,
          id_evidencia: idEvidencia,
          nota: notaNum,
          comentario_docente: currentGrades[idEvidencia]?.comentario_docente || null,
        };
      }

      studentObj.grades = currentGrades;
      copy[studentIdx] = studentObj;
      return copy;
    });

    setPendingChanges((prev) => ({
      ...prev,
      [cellKey]: {
        idMatricula,
        idEvidencia,
        nota: notaNum,
      },
    }));
  };

  // Guardar cambios en lote
  const handleSaveChanges = async () => {
    if (!selectedPeriodo) return;
    const items = Object.values(pendingChanges);
    if (items.length === 0) return;

    setSavingBatch(true);
    setErrorMsg('');

    const res = await upsertCalificacionesBatch(idAsignacion, selectedPeriodo.id_periodo, items);

    if (!res.success) {
      setErrorMsg(res.error || 'Error al guardar los cambios.');
      setModalConfig({
        show: true,
        title: 'Error al Guardar',
        message: `Error al guardar los cambios: ${res.error || 'Ocurrió un error inesperado'}`,
        type: 'error',
      });
    } else {
      setPendingChanges({});
      setModalConfig({
        show: true,
        title: 'Calificaciones Guardadas',
        message: '¡Todas las calificaciones se han guardado exitosamente!',
        type: 'success',
      });
      setRefreshTrigger((prev) => prev + 1);
    }

    setSavingBatch(false);
  };

  // Manejar navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, studentIdx: number, evIdx: number) => {
    const activasEvidencias = evidencias.filter((e) => e.activaEnPeriodo);
    const totalStudents = students.length;
    const totalEvidencias = activasEvidencias.length;

    let targetStudent = studentIdx;
    let targetEv = evIdx;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      targetStudent = Math.min(totalStudents - 1, studentIdx + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetStudent = Math.max(0, studentIdx - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (evIdx < totalEvidencias - 1) {
        targetEv = evIdx + 1;
      } else if (studentIdx < totalStudents - 1) {
        targetStudent = studentIdx + 1;
        targetEv = 0;
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (evIdx > 0) {
        targetEv = evIdx - 1;
      } else if (studentIdx > 0) {
        targetStudent = studentIdx - 1;
        targetEv = totalEvidencias - 1;
      }
    } else {
      return;
    }

    const nextInputId = `grade-${targetStudent}-${targetEv}`;
    const nextEl = document.getElementById(nextInputId) as HTMLInputElement | null;
    if (nextEl) {
      nextEl.focus();
      nextEl.select();
    }
  };

  // Cálculos de Definitiva y Desempeño
  const calculateDefinitiva = (student: GradesheetStudentEvidencias): number => {
    const activas = evidencias.filter((e) => e.activaEnPeriodo && e.estado_aprobacion !== 'PENDIENTE');
    if (activas.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    activas.forEach((ev) => {
      const gradeRow = student.grades[ev.id_evidencia];
      if (gradeRow && gradeRow.nota !== null) {
        weightedSum += gradeRow.nota * ev.peso;
        totalWeight += ev.peso;
      }
    });

    if (totalWeight === 0) return 0;
    const rawAvg = weightedSum / totalWeight;
    return Math.round(rawAvg * 10) / 10;
  };

  const getDesempenoLabel = (definitiva: number): string => {
    if (definitiva === 0 || isNaN(definitiva)) return 'SIN NOTA';

    const roundedDef = Math.round(definitiva * 10) / 10;

    if (escalas.length > 0) {
      const match = escalas.find(
        (es) => roundedDef >= es.nota_minima && roundedDef <= es.nota_maxima
      );
      if (match) return match.nombre_desempeno.toUpperCase();
    }

    if (roundedDef >= 4.6) return 'SUPERIOR';
    if (roundedDef >= 4.0) return 'ALTO';
    if (roundedDef >= 3.0) return 'BASICO';
    return 'BAJO';
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground py-10 justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Cargando parametrización de la planilla...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`transition-all ${
        isExpandedWindow || isFullscreen
          ? 'fixed inset-0 z-50 bg-background border-none shadow-2xl p-2 sm:p-5 overflow-hidden flex flex-col gap-3'
          : 'space-y-6'
      }`}
    >
      {/* TOOLBAR */}
      <GradebookToolbar
        isExpandedWindow={isExpandedWindow}
        isFullscreen={isFullscreen}
        periodos={periodos}
        selectedPeriodo={selectedPeriodo}
        activePeriodo={activePeriodo}
        dataLoading={dataLoading}
        pendingChangesCount={Object.keys(pendingChanges).length}
        savingBatch={savingBatch}
        isPeriodoClosed={isPeriodoClosed}
        onSelectPeriodo={handleSelectPeriodo}
        onSaveChanges={handleSaveChanges}
        onOpenEvidenciasModal={() => setShowEvidenciasModal(true)}
        onOpenBulkModal={() => setShowBulkModal(true)}
        onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
        onExpandWindow={setIsExpandedWindow}
      />

      {/* ERRORES */}
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 dark:text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* ESTADO 1: Cargando datos del periodo (Skeleton Shimmer Premium) */}
      {dataLoading ? (
        <GradebookSkeleton
          isExpandedWindow={isExpandedWindow}
          isFullscreen={isFullscreen}
          selectedPeriodoNumero={selectedPeriodo?.numero_periodo}
        />
      ) : !loading && evidencias.length === 0 ? (
        <div className="py-16 text-center border border-border border-dashed rounded-2xl bg-card">
          <svg className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-muted-foreground text-sm font-semibold">Sin evidencias configuradas para este periodo.</p>
          <p className="text-muted-foreground/60 text-xs mt-1 max-w-xs mx-auto">
            El coordinador debe crear las evidencias para este grado y materia desde el panel de administración.
          </p>
        </div>
      ) : (
        /* PLANILLA TABLE */
        <GradebookTable
          students={students}
          evidencias={evidencias}
          localValues={localValues}
          pendingChanges={pendingChanges}
          isPeriodoClosed={isPeriodoClosed}
          isExpandedWindow={isExpandedWindow}
          isFullscreen={isFullscreen}
          onGradeChange={handleGradeChange}
          onLocalValueUpdate={(cellKey, val) => setLocalValues((prev) => ({ ...prev, [cellKey]: val }))}
          onKeyDown={handleKeyDown}
          calculateDefinitiva={calculateDefinitiva}
          getDesempenoLabel={getDesempenoLabel}
        />
      )}

      {/* MODALES */}
      {showEvidenciasModal && selectedPeriodo && (
        <EvidenciasPeriodoModal
          idAsignacion={idAsignacion}
          idPeriodo={selectedPeriodo.id_periodo}
          onClose={() => setShowEvidenciasModal(false)}
          onSaved={() => {
            setShowEvidenciasModal(false);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}

      {showBulkModal && selectedPeriodo && (
        <UploadGradebookModal
          idAsignacion={idAsignacion}
          idPeriodo={selectedPeriodo.id_periodo}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}

      {/* MODAL DIALOG OVERRIDE FOR ALERTS & CONFIRMS */}
      {modalConfig?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-black/60 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-card border border-border p-6 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 space-y-4 text-left text-foreground">
            {/* Header / Icon */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  modalConfig.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
                    : modalConfig.type === 'error'
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
                }`}
              >
                {modalConfig.type === 'success' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : modalConfig.type === 'error' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <h3 className="text-base font-bold text-foreground leading-none">{modalConfig.title}</h3>
            </div>

            {/* Body Message */}
            <p className="text-xs text-muted-foreground leading-relaxed">{modalConfig.message}</p>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              {modalConfig.type === 'confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModalConfig(null)}
                    className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-semibold text-foreground transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      modalConfig.onConfirm?.();
                      setModalConfig(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-all shadow-md cursor-pointer"
                  >
                    Descartar Cambios
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalConfig(null)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-all shadow-md cursor-pointer"
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
