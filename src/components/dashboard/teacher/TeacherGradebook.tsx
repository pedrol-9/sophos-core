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
  upsertCalificacionEvidencia,
  EvidenciaConConfig,
  GradesheetStudentEvidencias,
} from '@/app/actions/evidenciasActions';
import { EvidenciasPeriodoModal } from '@/components/dashboard/teacher/EvidenciasPeriodoModal';
import { UploadGradebookModal } from '@/components/dashboard/teacher/UploadGradebookModal';

interface TeacherGradebookProps {
  idAsignacion: string;
  idCurso: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Guardado asíncrono con debounce
  const [cellStatus, setCellStatus] = useState<Record<string, SaveStatus>>({});
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

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
        setErrorMsg(studRes.error || 'Error al cargar planilla de alumnos.');
      }
    }

    loadData();
  }, [idCurso, idAsignacion, selectedPeriodo, refreshTrigger]);

  // ─── LIMPIEZA DE TIMERS ────────────────────────────────────────────────────
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => { Object.values(timeouts).forEach(clearTimeout); };
  }, []);

  // ─── AUTOGUARDADO CON DEBOUNCE ────────────────────────────────────────────
  const handleGradeChange = (
    studentIdx: number,
    studentId: string,
    matriculaId: string,
    idEvidencia: string,
    valStr: string
  ) => {
    // Permitir campo vacío para limpiar nota localmente
    if (valStr === '') {
      setStudents((prev) => {
        const updated = [...prev];
        const student = { ...updated[studentIdx] };
        student.grades = {
          ...student.grades,
          [idEvidencia]: {
            ...(student.grades[idEvidencia] || { id_calificacion: null, id_evidencia: idEvidencia, comentario_docente: null }),
            nota: null,
          },
        };
        updated[studentIdx] = student;
        return updated;
      });
      return;
    }

    const val = parseFloat(valStr);

    // Bloquear si el valor está fuera del rango legal de 0.0 a 5.0
    if (isNaN(val) || val < 0.0 || val > 5.0) {
      return;
    }

    // 1. Actualizar estado local inmediatamente para la UI
    setStudents((prev) => {
      const updated = [...prev];
      const student = { ...updated[studentIdx] };
      student.grades = {
        ...student.grades,
        [idEvidencia]: {
          ...(student.grades[idEvidencia] || { id_calificacion: null, id_evidencia: idEvidencia, comentario_docente: null }),
          nota: val,
        },
      };
      updated[studentIdx] = student;
      return updated;
    });

    // 2. Debounce autosave 500ms
    const cellKey = `${studentId}-${idEvidencia}`;
    setCellStatus((prev) => ({ ...prev, [cellKey]: 'saving' }));

    if (timeoutsRef.current[cellKey]) clearTimeout(timeoutsRef.current[cellKey]);

    timeoutsRef.current[cellKey] = setTimeout(async () => {
      const res = await upsertCalificacionEvidencia(
        idAsignacion,
        matriculaId,
        selectedPeriodo!.id_periodo,
        idEvidencia,
        val
      );

      if (res.success) {
        setCellStatus((prev) => ({ ...prev, [cellKey]: 'saved' }));
        setTimeout(() => {
          setCellStatus((prev) => {
            if (prev[cellKey] === 'saved') {
              const next = { ...prev };
              delete next[cellKey];
              return next;
            }
            return prev;
          });
        }, 2500);
      } else {
        setCellStatus((prev) => ({ ...prev, [cellKey]: 'error' }));
      }
    }, 500);
  };

  // ─── NAVEGACIÓN TIPO EXCEL ────────────────────────────────────────────────
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIdx: number,
    evIdx: number
  ) => {
    let ns = studentIdx, ne = evIdx;
    if (e.key === 'ArrowUp') { e.preventDefault(); ns = Math.max(0, studentIdx - 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); ns = Math.min(students.length - 1, studentIdx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); ne = Math.max(0, evIdx - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); ne = Math.min(evidencias.length - 1, evIdx + 1); }
    else return;

    const next = document.getElementById(`grade-${ns}-${ne}`) as HTMLInputElement | null;
    if (next) { next.focus(); next.select(); }
  };

  // ─── CÁLCULO DE DEFINITIVA ────────────────────────────────────────────────
  const calculateDefinitiva = (student: GradesheetStudentEvidencias): number => {
    const activas = evidencias.filter((e) => e.activaEnPeriodo);
    if (activas.length === 0) return 0;

    let total = 0;
    let totalPeso = 0;

    activas.forEach((ev) => {
      const grade = student.grades[ev.id_evidencia];
      if (grade && grade.nota !== null && grade.nota > 0) {
        total += grade.nota * ev.peso;
        totalPeso += ev.peso;
      }
    });

    if (totalPeso === 0) return 0;
    const rawAverage = total / totalPeso;
    
    // Redondeo personalizado:
    // de .00 a .49 = bottom round (truncar hacia abajo)
    // de .50 a .99 = top round (redondear hacia arriba)
    const intPart = Math.floor(rawAverage);
    const decimalPart = rawAverage - intPart;
    if (decimalPart < 0.50) {
      return intPart;
    } else {
      return Math.ceil(rawAverage);
    }
  };

  const getDesempenoLabel = (nota: number): string => {
    if (nota === 0) return '-';
    const found = escalas.find((e) => nota >= Number(e.nota_minima) && nota <= Number(e.nota_maxima));
    return found ? found.nombre_desempeno : 'BAJO';
  };

  // ─── EVIDENCIAS ACTIVAS (COLUMNAS) ────────────────────────────────────────
  const activasEvidencias = evidencias.filter((e) => e.activaEnPeriodo);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-white/40 py-10 justify-center">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        Cargando parametrización de la planilla...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0d1220]/70 border border-white/10 rounded-2xl p-6 gap-4">

        {/* Selector de Periodo */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Periodo:</label>
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
                    onClick={() => setSelectedPeriodo(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                        : isConcluido
                        ? 'bg-zinc-800/40 border-zinc-700/30 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-400'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
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
          {/* Botón Evidencias del Periodo */}
          <button
            type="button"
            disabled={isPeriodoClosed}
            onClick={() => setShowEvidenciasModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar CSV
          </button>
        </div>
      </div>

      {/* ERRORES */}
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* ESTADO: Sin evidencias configuradas */}
      {!loading && evidencias.length === 0 && (
        <div className="py-16 text-center border border-white/5 border-dashed rounded-2xl bg-white/[0.01]">
          <svg className="w-12 h-12 text-white/10 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-white/40 text-sm font-semibold">Sin evidencias configuradas para este periodo.</p>
          <p className="text-white/25 text-xs mt-1 max-w-xs mx-auto">
            El coordinador debe crear las evidencias para este grado y materia desde el panel de administración.
          </p>
        </div>
      )}

      {/* PLANILLA */}
      {students.length > 0 && evidencias.length > 0 && (
        <div className="bg-[#0c1220]/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                {/* Fila 1: Evidencias activas y Consolidado */}
                <tr className="border-b border-white/10 bg-white/[0.01]">
                  <th
                    className="py-3 px-4 text-xs font-bold text-white/40 uppercase tracking-wider border-r border-white/5 w-64"
                    rowSpan={2}
                  >
                    Estudiante
                  </th>

                  {activasEvidencias.length > 0 && (
                    <th
                      className="py-2 px-3 text-center text-[10px] font-bold text-indigo-400 bg-indigo-500/5 uppercase tracking-widest border-r border-white/5"
                      colSpan={activasEvidencias.length}
                    >
                      Evidencias del Periodo
                    </th>
                  )}

                  <th
                    className="py-3 px-4 text-center text-xs font-bold text-white/40 uppercase tracking-wider"
                    colSpan={2}
                    rowSpan={1}
                  >
                    Consolidado
                  </th>
                </tr>

                {/* Fila 2: Nombres y pesos de cada evidencia */}
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-bold text-white/60 tracking-wider">
                  {activasEvidencias.map((ev) => (
                    <th
                      key={`h-${ev.id_evidencia}`}
                      className="py-2 px-2 text-center border-r border-white/5 font-semibold w-28"
                    >
                      <span className="block truncate max-w-[100px]" title={ev.nombre}>
                        {ev.nombre}
                      </span>
                      <span className="block text-[9px] text-indigo-400/70 font-normal mt-0.5">
                        {Math.round(ev.peso * 100)}%
                      </span>
                    </th>
                  ))}
                  <th className="py-2 px-4 text-center border-r border-white/5 w-24">Definitiva</th>
                  <th className="py-2 px-4 text-center w-24">Desempeño</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5 text-xs">
                {students.map((student, studentIdx) => {
                  const definitiva = calculateDefinitiva(student);
                  const desempeno = getDesempenoLabel(definitiva);

                  return (
                    <tr key={student.id_estudiante} className="hover:bg-white/[0.01] transition-colors">
                      {/* Info Estudiante */}
                      <td className="py-3 px-4 border-r border-white/5 font-semibold text-white/90">
                        <div className="truncate max-w-[240px]">{student.nombre_completo}</div>
                        <span className="block text-[10px] text-white/40 font-normal truncate max-w-[240px]">
                          {student.email}
                        </span>
                      </td>

                      {/* Celdas por evidencia */}
                      {activasEvidencias.map((ev, evIdx) => {
                        const grade = student.grades[ev.id_evidencia];
                        const notaVal = grade?.nota ?? null;
                        const cellKey = `${student.id_estudiante}-${ev.id_evidencia}`;
                        const status = cellStatus[cellKey] || 'idle';

                        return (
                          <td
                            key={`cell-${student.id_estudiante}-${ev.id_evidencia}`}
                            className="py-2 px-1 text-center border-r border-white/5 relative group"
                          >
                            <div className="inline-flex flex-col items-center">
                              <input
                                id={`grade-${studentIdx}-${evIdx}`}
                                type="number"
                                step="0.1"
                                min="0.0"
                                max="5.0"
                                disabled={isPeriodoClosed}
                                value={notaVal !== null ? notaVal : ''}
                                onChange={(e) =>
                                  handleGradeChange(
                                    studentIdx,
                                    student.id_estudiante,
                                    student.id_matricula,
                                    ev.id_evidencia,
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => handleKeyDown(e, studentIdx, evIdx)}
                                className={`w-14 px-1.5 py-1 text-center font-bold text-xs bg-white/5 border rounded-lg focus:outline-none focus:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                  status === 'saving'
                                    ? 'border-amber-500/50 text-amber-300'
                                    : status === 'saved'
                                    ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/[0.02]'
                                    : status === 'error'
                                    ? 'border-red-500/50 text-red-400 bg-red-500/[0.02]'
                                    : notaVal !== null && notaVal >= 3.0
                                    ? 'border-white/10 text-teal-400'
                                    : notaVal !== null
                                    ? 'border-white/10 text-red-400'
                                    : 'border-white/5 text-white/30'
                                }`}
                              />
                              {status === 'saving' && (
                                <span className="absolute bottom-0 text-[7px] text-amber-500 scale-75">...</span>
                              )}
                              {status === 'saved' && (
                                <span className="absolute bottom-0 text-[7px] text-emerald-500 scale-75">✓</span>
                              )}
                              {status === 'error' && (
                                <span className="absolute bottom-0 text-[7px] text-red-500 scale-75">✗</span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Definitiva */}
                      <td className="py-3 px-4 text-center border-r border-white/5">
                        <span
                          className={`text-sm font-extrabold px-2.5 py-1 rounded-lg border ${
                            definitiva >= 3.0
                              ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                              : definitiva > 0
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-white/5 text-white/20 border-white/5'
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
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                              : desempeno === 'ALTO'
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                              : desempeno === 'BASICO'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20'
                              : definitiva > 0
                              ? 'bg-red-500/20 text-red-400 border border-red-500/20'
                              : 'text-white/30 bg-white/5'
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
          <div className="p-4 bg-white/[0.01] border-t border-white/5 text-left text-[10px] text-white/30">
            Usa las flechas del teclado (▲ ▼ ◀ ▶) para moverte entre celdas. Las notas se guardan automáticamente.
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
    </div>
  );
}
