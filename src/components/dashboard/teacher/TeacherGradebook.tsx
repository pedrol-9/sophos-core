'use client';

import { useState, useEffect } from 'react';
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
import { EvidenciasPeriodoModal } from '@/components/dashboard/teacher/EvidenciasPeriodoModal';
import { UploadGradebookModal } from '@/components/dashboard/teacher/UploadGradebookModal';

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

  // Modales
  const [showEvidenciasModal, setShowEvidenciasModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [, setRefreshTrigger] = useState(0);

  // Cambios pendientes por guardar
  const [pendingChanges, setPendingChanges] = useState<Record<string, CalificacionBatchItem>>({});
  const [savingBatch, setSavingBatch] = useState(false);

  // Almacena los valores temporales en string
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  // Modal de confirmación / alerta personalizado
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'confirm';
    onConfirm?: () => void;
  } | null>(null);

  const activePeriodo = periodos.find((p) => p.activo);
  const isPeriodoClosed = !!(selectedPeriodo && activePeriodo && selectedPeriodo.numero_periodo < activePeriodo.numero_periodo);

  // ─── CARGA DE PARAMETRIZACIÓN ─────────────────────────────────────────────
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      const res = await getParametrizacionDocente(idAsignacion);
      if (res.success) {
        setPeriodos(res.periodos || []);
        setEscalas(res.escalas || []);
        const active = res.periodos?.find((p) => p.activo) || res.periodos?.[0] || null;
        setSelectedPeriodo(active);
      } else {
        setErrorMsg(res.error || 'No se pudo obtener la configuración institucional.');
      }
      setLoading(false);
    }
    loadConfig();
  }, [idAsignacion]);

  // ─── CARGA DE EVIDENCIAS Y ESTUDIANTES AL CAMBIAR PERIODO ────────────────
  useEffect(() => {
    if (!selectedPeriodo) return;

    async function loadData() {
      setStudents([]);
      setEvidencias([]);
      setErrorMsg('');

      const [evRes, studRes] = await Promise.all([
        getEvidenciasForAsignacion(idAsignacion, selectedPeriodo!.id_periodo),
        getGradesheetByEvidencias(idCurso, idAsignacion, selectedPeriodo!.id_periodo),
      ]);

      if (evRes.success) {
        setEvidencias(evRes.data || []);
      } else {
        setErrorMsg(evRes.error || 'Error al cargar evidencias.');
      }

      if (studRes.success) {
        setStudents(studRes.data || []);
      } else {
        setErrorMsg((prev) => (prev ? `${prev} ${studRes.error}` : studRes.error || 'Error al cargar estudiantes.'));
      }
    }

    loadData();
  }, [idAsignacion, idCurso, selectedPeriodo]);

  // ─── MANEJO DE CAMBIO DE NOTA LOCAL ────────────────────────────────────────
  const handleGradeChange = (
    studentIndex: number,
    idEstudiante: string,
    idMatricula: string,
    idEvidencia: string,
    rawVal: string
  ) => {
    if (isPeriodoClosed) return;

    const cellKey = `${idMatricula}-${idEvidencia}`;

    if (rawVal.trim() === '') {
      setPendingChanges((prev) => ({
        ...prev,
        [cellKey]: {
          idMatricula,
          idEvidencia,
          nota: null,
        },
      }));
      setStudents((prev) => {
        const updated = [...prev];
        const student = { ...updated[studentIndex] };
        student.grades = {
          ...student.grades,
          [idEvidencia]: {
            ...student.grades[idEvidencia],
            nota: null,
          },
        };
        updated[studentIndex] = student;
        return updated;
      });
      return;
    }

    const parsed = parseFloat(rawVal);
    if (isNaN(parsed) || parsed < 0.0 || parsed > 5.0) return;

    setPendingChanges((prev) => ({
      ...prev,
      [cellKey]: {
        idMatricula,
        idEvidencia,
        nota: parsed,
      },
    }));

    setStudents((prev) => {
      const updated = [...prev];
      const student = { ...updated[studentIndex] };
      student.grades = {
        ...student.grades,
        [idEvidencia]: {
          ...student.grades[idEvidencia],
          nota: parsed,
        },
      };
      updated[studentIndex] = student;
      return updated;
    });
  };

  // ─── NAVEGACIÓN TECLADO ───────────────────────────────────────────────────
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    evidenciaIndex: number
  ) => {
    const totalStudents = students.length;
    const totalEvidencias = evidencias.filter((ev) => ev.activaEnPeriodo).length;

    let targetStudent = studentIndex;
    let targetEvidencia = evidenciaIndex;

    switch (e.key) {
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        targetStudent = Math.min(studentIndex + 1, totalStudents - 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        targetStudent = Math.max(studentIndex - 1, 0);
        break;
      case 'ArrowRight':
        if (e.currentTarget.selectionStart === e.currentTarget.value.length) {
          targetEvidencia = Math.min(evidenciaIndex + 1, totalEvidencias - 1);
        }
        break;
      case 'ArrowLeft':
        if (e.currentTarget.selectionStart === 0) {
          targetEvidencia = Math.max(evidenciaIndex - 1, 0);
        }
        break;
      default:
        return;
    }

    const targetInput = document.getElementById(`grade-${targetStudent}-${targetEvidencia}`);
    if (targetInput) {
      (targetInput as HTMLInputElement).focus();
      (targetInput as HTMLInputElement).select();
    }
  };

  // ─── GUARDADO EN BATCH ────────────────────────────────────────────────────
  const handleSaveChanges = async () => {
    const items = Object.values(pendingChanges);
    if (items.length === 0 || !selectedPeriodo) return;

    setSavingBatch(true);
    const res = await upsertCalificacionesBatch(idAsignacion, selectedPeriodo.id_periodo, items);
    setSavingBatch(false);

    if (res.success) {
      setPendingChanges({});
      setLocalValues({});
      setModalConfig({
        show: true,
        title: '¡Guardado Exitoso!',
        message: `Se actualizaron correctamente ${items.length} calificaciones en la base de datos.`,
        type: 'success',
      });
    } else {
      setModalConfig({
        show: true,
        title: 'Error al Guardar',
        message: res.error || 'No se pudieron guardar algunos registros. Revisa tu conexión.',
        type: 'error',
      });
    }
  };

  // ─── CÁLCULO DE DEFINITIVA ────────────────────────────────────────────────
  const calculateDefinitiva = (student: GradesheetStudentEvidencias): number => {
    const activas = evidencias.filter((ev) => ev.activaEnPeriodo);
    if (activas.length === 0) return 0;

    let sumaPonderada = 0;
    let pesoTotal = 0;

    activas.forEach((ev) => {
      const g = student.grades[ev.id_evidencia];
      if (g && g.nota !== null && g.nota !== undefined) {
        sumaPonderada += g.nota * ev.peso;
        pesoTotal += ev.peso;
      }
    });

    if (pesoTotal === 0) return 0;
    return parseFloat((sumaPonderada / (pesoTotal || 1)).toFixed(2));
  };

  // ─── ETIQUETA DE DESEMPEÑO DECRETO 1290 ────────────────────────────────────
  const getDesempenoLabel = (nota: number): string => {
    if (nota === 0) return '-';
    for (const esc of escalas) {
      if (nota >= esc.nota_minima && nota <= esc.nota_maxima) {
        return esc.nombre_desempeno;
      }
    }
    return '-';
  };

  const activasEvidencias = evidencias.filter((e) => e.activaEnPeriodo);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground py-10 justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Cargando parametrización de la planilla...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card border border-border rounded-2xl p-6 gap-4 shadow-xs">

        {/* Selector de Periodo */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Periodo:</label>
          <div className="flex gap-2">
            {(() => {
              const maxPeriodoNum = activePeriodo ? activePeriodo.numero_periodo : 1;
              const visiblePeriodos = periodos.filter((p) => p.numero_periodo <= maxPeriodoNum);

              return visiblePeriodos.map((p) => {
                const isSelected = selectedPeriodo?.id_periodo === p.id_periodo;
                const isConcluido = activePeriodo && p.numero_periodo < activePeriodo.numero_periodo;

                return (
                  <button
                    key={p.id_periodo}
                    type="button"
                    onClick={() => {
                      if (Object.keys(pendingChanges).length > 0) {
                        setModalConfig({
                          show: true,
                          title: 'Cambios sin Guardar',
                          message: 'Tienes calificaciones modificadas que no se han guardado. ¿Seguro que deseas cambiar de periodo y perder estos cambios?',
                          type: 'confirm',
                          onConfirm: () => {
                            setPendingChanges({});
                            setLocalValues({});
                            setSelectedPeriodo(p);
                          }
                        });
                        return;
                      }
                      setLocalValues({});
                      setSelectedPeriodo(p);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                        : isConcluido
                        ? 'bg-secondary border-border text-muted-foreground/50 hover:text-foreground'
                        : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    P{p.numero_periodo} {p.activo && '•'} {isConcluido && '(Cerrado)'}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Botón Guardar Cambios */}
          {Object.keys(pendingChanges).length > 0 && (
            <button
              type="button"
              disabled={savingBatch}
              onClick={handleSaveChanges}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold transition-all shadow-md animate-pulse duration-1000 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
              {savingBatch ? 'Guardando...' : `Guardar Cambios (${Object.keys(pendingChanges).length})`}
            </button>
          )}

          {/* Botón Evidencias del Periodo */}
          <button
            type="button"
            disabled={isPeriodoClosed}
            onClick={() => setShowEvidenciasModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Evidencias del Periodo
          </button>

          {/* Botón Carga Masiva CSV */}
          <button
            type="button"
            disabled={isPeriodoClosed}
            onClick={() => setShowBulkModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-secondary border border-border hover:bg-secondary/80 text-foreground text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar CSV
          </button>
        </div>
      </div>

      {/* ERRORES */}
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 dark:text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* ESTADO: Sin evidencias configuradas */}
      {!loading && evidencias.length === 0 && (
        <div className="py-16 text-center border border-border border-dashed rounded-2xl bg-card">
          <svg className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-muted-foreground text-sm font-semibold">Sin evidencias configuradas para este periodo.</p>
          <p className="text-muted-foreground/60 text-xs mt-1 max-w-xs mx-auto">
            El coordinador debe crear las evidencias para este grado y materia desde el panel de administración.
          </p>
        </div>
      )}

      {/* PLANILLA */}
      {students.length > 0 && evidencias.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                {/* Fila 1: Evidencias activas y Consolidado */}
                <tr className="border-b border-border bg-secondary/30">
                  <th
                    className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-r border-border w-64"
                    rowSpan={2}
                  >
                    Estudiante
                  </th>

                  {activasEvidencias.length > 0 && (
                    <th
                      className="py-2 px-3 text-center text-[10px] font-bold text-primary bg-primary/5 uppercase tracking-widest border-r border-border"
                      colSpan={activasEvidencias.length}
                    >
                      Evidencias del Periodo
                    </th>
                  )}

                  <th
                    className="py-3 px-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider"
                    colSpan={2}
                    rowSpan={1}
                  >
                    Consolidado
                  </th>
                </tr>

                {/* Fila 2: Nombres y pesos de cada evidencia */}
                <tr className="border-b border-border bg-secondary/50 text-[10px] font-bold text-muted-foreground tracking-wider">
                  {activasEvidencias.map((ev) => (
                    <th
                      key={`h-${ev.id_evidencia}`}
                      className="py-2 px-2 text-center border-r border-border font-semibold w-28"
                    >
                      <span className="block truncate max-w-[100px]" title={ev.nombre}>
                        {ev.nombre}
                      </span>
                      <span className="block text-[9px] text-primary/80 font-normal mt-0.5">
                        {Math.round(ev.peso * 100)}%
                      </span>
                    </th>
                  ))}
                  <th className="py-2 px-4 text-center border-r border-border w-24">Definitiva</th>
                  <th className="py-2 px-4 text-center w-24">Desempeño</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border text-xs">
                {students.map((student, studentIdx) => {
                  const definitiva = calculateDefinitiva(student);
                  const desempeno = getDesempenoLabel(definitiva);

                  return (
                    <tr key={student.id_estudiante} className="hover:bg-secondary/40 transition-colors">
                      {/* Info Estudiante */}
                      <td className="py-3 px-4 border-r border-border font-semibold text-foreground">
                        <div className="truncate max-w-[240px]">{student.nombre_completo}</div>
                        <span className="block text-[10px] text-muted-foreground font-normal truncate max-w-[240px]">
                          {student.email}
                        </span>
                      </td>

                      {activasEvidencias.map((ev, evIdx) => {
                        const grade = student.grades[ev.id_evidencia];
                        const notaVal = grade?.nota ?? null;
                        const cellKey = `${student.id_matricula}-${ev.id_evidencia}`;
                        const displayVal = localValues[cellKey] !== undefined ? localValues[cellKey] : (notaVal !== null ? notaVal.toString() : '');

                        return (
                          <td
                            key={`cell-${student.id_estudiante}-${ev.id_evidencia}`}
                            className="py-2 px-1 text-center border-r border-border relative group"
                          >
                            <div className="inline-flex flex-col items-center">
                              {(() => {
                                const hasPending = pendingChanges[cellKey] !== undefined;
                                return (
                                  <>
                                    <input
                                      id={`grade-${studentIdx}-${evIdx}`}
                                      type="text"
                                      disabled={isPeriodoClosed}
                                      value={displayVal}
                                      onChange={(e) => {
                                        const rawStr = e.target.value;
                                        if (rawStr !== '' && !/^[0-5]([.,]\d?)?$/.test(rawStr)) {
                                          return;
                                        }

                                        const valStr = rawStr.replace(',', '.');
                                        setLocalValues((prev) => ({ ...prev, [cellKey]: rawStr }));

                                        handleGradeChange(
                                          studentIdx,
                                          student.id_estudiante,
                                          student.id_matricula,
                                          ev.id_evidencia,
                                          valStr
                                        );
                                      }}
                                      onKeyDown={(e) => handleKeyDown(e, studentIdx, evIdx)}
                                      className={`w-14 px-1.5 py-1 text-center font-bold text-xs bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                        hasPending
                                          ? 'border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                                          : notaVal !== null && notaVal >= 3.0
                                          ? 'border-border text-teal-600 dark:text-teal-400 font-bold'
                                          : notaVal !== null
                                          ? 'border-border text-rose-500 font-bold'
                                          : 'border-border text-muted-foreground'
                                      }`}
                                    />
                                    {hasPending && (
                                      <span className="absolute bottom-0 text-[8px] text-amber-500 font-extrabold scale-75 animate-pulse">*</span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                        );
                      })}

                      {/* Definitiva */}
                      <td className="py-3 px-4 text-center border-r border-border">
                        <span
                          className={`text-sm font-extrabold px-2.5 py-1 rounded-lg border ${
                            definitiva >= 3.0
                              ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
                              : definitiva > 0
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : 'bg-secondary text-muted-foreground border-border'
                          }`}
                        >
                          {definitiva > 0 ? definitiva.toFixed(1) : '-.-'}
                        </span>
                      </td>

                      {/* Desempeño */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            desempeno === 'SUPERIOR'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : desempeno === 'ALTO'
                              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                              : desempeno === 'BASICO'
                              ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                              : definitiva > 0
                              ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                              : 'text-muted-foreground bg-secondary'
                          }`}
                        >
                          {desempeno}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="p-4 bg-secondary/30 border-t border-border text-left text-[10px] text-muted-foreground font-medium">
            Usa las flechas del teclado (▲ ▼ ◀ ▶) para moverte entre celdas.
          </div>
        </div>
      )}

      {/* MODALES */}
      {showEvidenciasModal && selectedPeriodo && (
        <EvidenciasPeriodoModal
          idAsignacion={idAsignacion}
          idPeriodo={selectedPeriodo.id_periodo}
          onClose={() => setShowEvidenciasModal(false)}
          onSaved={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {showBulkModal && selectedPeriodo && (
        <UploadGradebookModal
          idAsignacion={idAsignacion}
          idPeriodo={selectedPeriodo.id_periodo}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {/* MODAL DIALOG OVERRIDE FOR ALERTS & CONFIRMS */}
      {modalConfig?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-black/60 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-card border border-border p-6 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 space-y-4 text-foreground">
            {/* Header / Icon */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                modalConfig.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500' :
                modalConfig.type === 'error' ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500' :
                'bg-amber-500/10 border border-amber-500/30 text-amber-500'
              }`}>
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
                    className="px-4 py-2 rounded-xl bg-secondary border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                      setModalConfig(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-all shadow-md cursor-pointer"
                  >
                    Confirmar
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
