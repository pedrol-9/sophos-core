'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  getParametrizacionDocente, 
  getGradesheetStudents, 
  upsertCalificacionDiaria, 
  GradesheetStudent, 
  PeriodoInfo, 
  PonderacionInfo, 
  EscalaInfo,
  DimensionType
} from '@/app/actions/gradeActions';
import { CargaPlanillaModal } from '@/components/dashboard/docente/CargaPlanillaModal';

interface PlanillaDocenteProps {
  idAsignacion: string;
  idCurso: string;
}

type ActivityItem = {
  nombre: string;
  dimension: DimensionType;
};

// Control de estados de guardado local: "estudianteId-actividad" -> status
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function PlanillaDocente({ idAsignacion, idCurso }: PlanillaDocenteProps) {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Parámetros cargados del backend
  const [periodos, setPeriodos] = useState<PeriodoInfo[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<PeriodoInfo | null>(null);
  const [ponderaciones, setPonderaciones] = useState<PonderacionInfo>({ peso_saber: 0.4, peso_hacer: 0.4, peso_ser: 0.2 });
  const [escalas, setEscalas] = useState<EscalaInfo[]>([]);

  // Estudiantes y sus calificaciones
  const [students, setStudents] = useState<GradesheetStudent[]>([]);
  
  // Actividades (columnas de la planilla)
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  
  // Formulario para nueva actividad
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityDim, setNewActivityDim] = useState<DimensionType>('SABER');

  // Carga masiva offline (CSV)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Guardado asincrónico y debouncing
  const [cellStatus, setCellStatus] = useState<Record<string, SaveStatus>>({});
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Cargar configuración de la institución (periodos, ponderaciones, escalas)
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      const res = await getParametrizacionDocente(idAsignacion);
      if (res.success) {
        setPeriodos(res.periodos || []);
        setPonderaciones(res.ponderaciones || { peso_saber: 0.4, peso_hacer: 0.4, peso_ser: 0.2 });
        setEscalas(res.escalas || []);
        
        // Seleccionar periodo activo o el primero
        const active = res.periodos?.find((p) => p.activo) || res.periodos?.[0] || null;
        setSelectedPeriodo(active);
      } else {
        setErrorMsg(res.error || 'No se pudo obtener la configuración de la institución.');
      }
      setLoading(false);
    }
    loadConfig();
  }, [idAsignacion]);

  // Cargar planilla de estudiantes y calificaciones al cambiar de periodo
  useEffect(() => {
    if (!selectedPeriodo) return;

    async function loadStudentsAndGrades() {
      setStudents([]);
      const res = await getGradesheetStudents(idCurso, idAsignacion, selectedPeriodo!.id_periodo);
      if (res.success && res.data) {
        setStudents(res.data);
        
        // Extraer las actividades únicas ya existentes en las calificaciones de los estudiantes
        const uniqueActs = new Map<string, DimensionType>();
        res.data.forEach((s) => {
          s.grades.forEach((g) => {
            if (g.actividad) {
              uniqueActs.set(g.actividad, g.dimension);
            }
          });
        });

        const list: ActivityItem[] = [];
        uniqueActs.forEach((dim, name) => {
          list.push({ nombre: name, dimension: dim });
        });

        // Si la base de datos no tiene actividades, precargamos una por defecto por dimensión para guiar al docente
        if (list.length === 0) {
          list.push({ nombre: 'Evaluación 1', dimension: 'SABER' });
          list.push({ nombre: 'Taller 1', dimension: 'HACER' });
          list.push({ nombre: 'Actitud 1', dimension: 'SER' });
        }

        setActivities(list);
      } else {
        setErrorMsg(res.error || 'Error al cargar planilla de alumnos.');
      }
    }

    loadStudentsAndGrades();
  }, [idCurso, idAsignacion, selectedPeriodo, refreshTrigger]);

  // ─── MANEJO DE NUEVA COLUMNA (ACTIVIDAD) ───────────────────────────────────
  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newActivityName.trim();
    if (!name) return;

    // Evitar actividades duplicadas en la misma planilla
    const exists = activities.some((a) => a.nombre.toLowerCase() === name.toLowerCase());
    if (exists) {
      alert('Ya existe una actividad con este nombre.');
      return;
    }

    setActivities([...activities, { nombre: name, dimension: newActivityDim }]);
    setNewActivityName('');
    setShowAddActivity(false);
  };

  // ─── AUTOGUARDADO CON DEBOUNCE (500MS) Y PROMEDIO DINÁMICO ─────────────────
  const handleGradeChange = (
    studentIdx: number,
    studentId: string,
    matriculaId: string,
    actName: string,
    dim: DimensionType,
    valStr: string
  ) => {
    const val = valStr === '' ? NaN : parseFloat(valStr);

    // 1. Actualizar el estado local para cálculo del promedio ponderado inmediato
    setStudents((prev) => {
      const updated = [...prev];
      const student = { ...updated[studentIdx] };
      const gradeIdx = student.grades.findIndex((g) => g.actividad === actName && g.dimension === dim);

      if (gradeIdx > -1) {
        student.grades = [...student.grades];
        student.grades[gradeIdx] = {
          ...student.grades[gradeIdx],
          nota: isNaN(val) ? 0 : val,
        };
      } else {
        student.grades = [
          ...student.grades,
          {
            id_calificacion: 'temp-' + Date.now(),
            nota: isNaN(val) ? 0 : val,
            actividad: actName,
            dimension: dim,
            comentario_docente: null,
            comentario_ia: null,
            id_periodo: selectedPeriodo!.id_periodo,
            periodo: selectedPeriodo!.numero_periodo,
          },
        ];
      }
      updated[studentIdx] = student;
      return updated;
    });

    if (isNaN(val) || val < 0.0 || val > 5.0) {
      // Nota vacía o fuera de rango: no autoguarda
      return;
    }

    // 2. Programar guardado asincrónico (Autosave Debounce 500ms)
    const cellKey = `${studentId}-${actName}`;
    setCellStatus((prev) => ({ ...prev, [cellKey]: 'saving' }));

    if (timeoutsRef.current[cellKey]) {
      clearTimeout(timeoutsRef.current[cellKey]);
    }

    timeoutsRef.current[cellKey] = setTimeout(async () => {
      const res = await upsertCalificacionDiaria(
        idAsignacion,
        matriculaId,
        selectedPeriodo!.id_periodo,
        dim,
        actName,
        val
      );

      if (res.success && res.data) {
        setCellStatus((prev) => ({ ...prev, [cellKey]: 'saved' }));
        
        // Opcional: limpiar bandera de guardado tras 2.5s para no recargar la UI
        setTimeout(() => {
          setCellStatus((prev) => {
            if (prev[cellKey] === 'saved') {
              const updated = { ...prev };
              delete updated[cellKey];
              return updated;
            }
            return prev;
          });
        }, 2500);

        // Generar análisis de IA en segundo plano
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calificacionId: res.data.id_calificacion }),
        }).catch(console.error);

      } else {
        setCellStatus((prev) => ({ ...prev, [cellKey]: 'error' }));
      }
    }, 500);
  };

  // Limpiar timers al desmontar
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  // ─── CONTROLADORES DE EVENTOS DE TECLADO (NAVEGACIÓN TIPO EXCEL) ───────────
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIdx: number,
    actIdx: number
  ) => {
    let nextStudentIdx = studentIdx;
    let nextActIdx = actIdx;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextStudentIdx = Math.max(0, studentIdx - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextStudentIdx = Math.min(students.length - 1, studentIdx + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nextActIdx = Math.max(0, actIdx - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextActIdx = Math.min(activities.length - 1, actIdx + 1);
    } else {
      return;
    }

    const nextInputId = `grade-${nextStudentIdx}-${nextActIdx}`;
    const nextInput = document.getElementById(nextInputId) as HTMLInputElement | null;
    if (nextInput) {
      nextInput.focus();
      nextInput.select(); // auto-seleccionar texto para fácil reemplazo
    }
  };

  // ─── CÁLCULO DE PROMEDIOS PONDERADOS ───────────────────────────────────────
  const calculateWeightedAverage = (student: GradesheetStudent) => {
    // Clasificar calificaciones del estudiante por dimensión
    const gradesSaber = student.grades.filter((g) => g.dimension === 'SABER' && g.nota > 0);
    const gradesHacer = student.grades.filter((g) => g.dimension === 'HACER' && g.nota > 0);
    const gradesSer = student.grades.filter((g) => g.dimension === 'SER' && g.nota > 0);

    const avgSaber = gradesSaber.length > 0 ? gradesSaber.reduce((acc, c) => acc + c.nota, 0) / gradesSaber.length : 0;
    const avgHacer = gradesHacer.length > 0 ? gradesHacer.reduce((acc, c) => acc + c.nota, 0) / gradesHacer.length : 0;
    const avgSer = gradesSer.length > 0 ? gradesSer.reduce((acc, c) => acc + c.nota, 0) / gradesSer.length : 0;

    // Calcular promedio ponderado
    const totalWeight = ponderaciones.peso_saber + ponderaciones.peso_hacer + ponderaciones.peso_ser;
    if (totalWeight === 0) return 0;

    const weightedScore = 
      (avgSaber * ponderaciones.peso_saber) +
      (avgHacer * ponderaciones.peso_hacer) +
      (avgSer * ponderaciones.peso_ser);

    return parseFloat(weightedScore.toFixed(2));
  };

  // Homologa la nota definitiva a su escala de desempeño nacional
  const getDesempenoLabel = (nota: number) => {
    if (nota === 0) return '-';
    const found = escalas.find((e) => nota >= Number(e.nota_minima) && nota <= Number(e.nota_maxima));
    return found ? found.nombre_desempeno : 'BAJO';
  };

  if (loading) {
    return <div className="text-sm text-white/50">Cargando parámetros de la planilla...</div>;
  }

  // Agrupar actividades por dimensión
  const saberActivities = activities.filter((a) => a.dimension === 'SABER');
  const hacerActivities = activities.filter((a) => a.dimension === 'HACER');
  const serActivities = activities.filter((a) => a.dimension === 'SER');

  // Mapear un índice global a la actividad correspondiente para navegación por teclado
  const orderedActivities = [...saberActivities, ...hacerActivities, ...serActivities];

  return (
    <div className="space-y-6">
      {/* HEADER TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0d1220]/70 border border-white/10 rounded-2xl p-6 gap-4">
        
        {/* Selector de Periodo */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Periodo Lectivo:</label>
          <div className="flex gap-2">
            {periodos.map((p) => (
              <button
                key={p.id_periodo}
                type="button"
                onClick={() => setSelectedPeriodo(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedPeriodo?.id_periodo === p.id_periodo
                    ? 'bg-teal-600 border-teal-500 text-white shadow-md shadow-teal-600/10'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                Periodo {p.numero_periodo} {p.activo && '•'}
              </button>
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 text-xs font-semibold transition-all"
          >
            <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Carga Masiva (CSV)
          </button>
          <button
            onClick={() => setShowAddActivity(!showAddActivity)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-all shadow-md shadow-teal-600/10"
          >
            <span className="text-sm font-bold">+</span> Nueva Actividad
          </button>
        </div>
      </div>

      {/* DETAILED ERRORS */}
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* POPUP DE CREACIÓN DE COLUMNAS */}
      {showAddActivity && (
        <form onSubmit={handleCreateActivity} className="p-4 bg-[#0d1220] border border-white/10 rounded-2xl max-w-md animate-in fade-in duration-200">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Agregar Nueva Columna / Actividad</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-white/40 uppercase mb-1">Título de la Actividad</label>
              <input
                type="text"
                required
                value={newActivityName}
                onChange={(e) => setNewActivityName(e.target.value)}
                placeholder="Ej: Quiz 1, Exposición"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 uppercase mb-1">Dimensión Evaluativa (MEN)</label>
              <select
                value={newActivityDim}
                onChange={(e) => setNewActivityDim(e.target.value as DimensionType)}
                className="w-full bg-[#0a0f1d] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="SABER">Saber (Cognitivo — {ponderaciones.peso_saber * 100}%)</option>
                <option value="HACER">Hacer (Procedimental — {ponderaciones.peso_hacer * 100}%)</option>
                <option value="SER">Ser (Actitudinal — {ponderaciones.peso_ser * 100}%)</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAddActivity(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
              >
                Crear Columna
              </button>
            </div>
          </div>
        </form>
      )}

      {/* PLANILLA INTERACTIVA TABLE */}
      {students.length === 0 ? (
        <div className="py-16 text-center border border-white/5 border-dashed rounded-2xl bg-white/[0.01]">
          <p className="text-white/40 text-sm">Cargando listado de estudiantes o no hay registrados en este curso.</p>
        </div>
      ) : (
        <div className="bg-[#0c1220]/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              
              {/* TABLE HEADERS */}
              <thead>
                
                {/* Categoría principal (MEN Dimension) */}
                <tr className="border-b border-white/10 bg-white/[0.01]">
                  <th className="py-3 px-4 text-xs font-bold text-white/40 uppercase tracking-wider border-r border-white/5 w-64" rowSpan={2}>
                    Estudiante
                  </th>
                  
                  {/* Saber Header */}
                  {saberActivities.length > 0 && (
                    <th className="py-2 px-3 text-center text-[10px] font-bold text-indigo-400 bg-indigo-500/5 uppercase tracking-widest border-r border-white/5" colSpan={saberActivities.length}>
                      SABER ({ponderaciones.peso_saber * 100}%)
                    </th>
                  )}

                  {/* Hacer Header */}
                  {hacerActivities.length > 0 && (
                    <th className="py-2 px-3 text-center text-[10px] font-bold text-cyan-400 bg-cyan-500/5 uppercase tracking-widest border-r border-white/5" colSpan={hacerActivities.length}>
                      HACER ({ponderaciones.peso_hacer * 100}%)
                    </th>
                  )}

                  {/* Ser Header */}
                  {serActivities.length > 0 && (
                    <th className="py-2 px-3 text-center text-[10px] font-bold text-emerald-400 bg-emerald-500/5 uppercase tracking-widest border-r border-white/5" colSpan={serActivities.length}>
                      SER ({ponderaciones.peso_ser * 100}%)
                    </th>
                  )}

                  <th className="py-3 px-4 text-center text-xs font-bold text-white/40 uppercase tracking-wider" colSpan={2} rowSpan={1}>
                    Consolidado
                  </th>
                </tr>

                {/* Actividades específicas */}
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-bold text-white/60 tracking-wider">
                  {/* Saber Columns */}
                  {saberActivities.map((act) => (
                    <th key={`h-${act.nombre}`} className="py-2 px-2 text-center border-r border-white/5 font-semibold w-24">
                      <span className="block truncate max-w-[90px]" title={act.nombre}>{act.nombre}</span>
                    </th>
                  ))}

                  {/* Hacer Columns */}
                  {hacerActivities.map((act) => (
                    <th key={`h-${act.nombre}`} className="py-2 px-2 text-center border-r border-white/5 font-semibold w-24">
                      <span className="block truncate max-w-[90px]" title={act.nombre}>{act.nombre}</span>
                    </th>
                  ))}

                  {/* Ser Columns */}
                  {serActivities.map((act) => (
                    <th key={`h-${act.nombre}`} className="py-2 px-2 text-center border-r border-white/5 font-semibold w-24">
                      <span className="block truncate max-w-[90px]" title={act.nombre}>{act.nombre}</span>
                    </th>
                  ))}

                  {/* Promedios */}
                  <th className="py-2 px-4 text-center border-r border-white/5 w-24">Definitiva</th>
                  <th className="py-2 px-4 text-center w-24">Desempeño</th>
                </tr>

              </thead>

              {/* TABLE BODY */}
              <tbody className="divide-y divide-white/5 text-xs">
                {students.map((student, studentIdx) => {
                  const scoreDefinitiva = calculateWeightedAverage(student);
                  const labelDesempeno = getDesempenoLabel(scoreDefinitiva);

                  return (
                    <tr key={student.id_estudiante} className="hover:bg-white/[0.01] transition-colors">
                      {/* Información Estudiante */}
                      <td className="py-3 px-4 border-r border-white/5 font-semibold text-white/90">
                        <div className="truncate max-w-[240px]">{student.nombre_completo}</div>
                        <span className="block text-[10px] text-white/40 font-normal truncate max-w-[240px]">{student.email}</span>
                      </td>

                      {/* Inputs de Calificaciones en Orden */}
                      {orderedActivities.map((act, actIdx) => {
                        const grade = student.grades.find(
                          (g) => g.actividad === act.nombre && g.dimension === act.dimension
                        );
                        const cellKey = `${student.id_estudiante}-${act.nombre}`;
                        const status = cellStatus[cellKey] || 'idle';

                        return (
                          <td key={cellKey} className="py-2 px-1 text-center border-r border-white/5 relative group">
                            <div className="inline-flex flex-col items-center">
                              <input
                                id={`grade-${studentIdx}-${actIdx}`}
                                type="number"
                                step="0.1"
                                min="0.0"
                                max="5.0"
                                value={grade ? (grade.nota === 0 && isNaN(grade.nota) ? '' : grade.nota) : ''}
                                onChange={(e) => 
                                  handleGradeChange(
                                    studentIdx,
                                    student.id_estudiante,
                                    student.id_matricula,
                                    act.nombre,
                                    act.dimension,
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => handleKeyDown(e, studentIdx, actIdx)}
                                className={`w-14 px-1.5 py-1 text-center font-bold text-xs bg-white/5 border rounded-lg focus:outline-none focus:bg-white/10 transition-all ${
                                  status === 'saving' ? 'border-amber-500/50 text-amber-300' :
                                  status === 'saved' ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/[0.02]' :
                                  status === 'error' ? 'border-red-500/50 text-red-400 bg-red-500/[0.02]' :
                                  grade && grade.nota >= 3.0 ? 'border-white/10 text-teal-400' :
                                  grade ? 'border-white/10 text-red-400' : 'border-white/5 text-white/30'
                                }`}
                              />

                              {/* Indicador de Autoguardado Sutil */}
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

                      {/* Nota Definitiva del Periodo (Ponderado) */}
                      <td className="py-3 px-4 text-center border-r border-white/5">
                        <span className={`text-sm font-extrabold px-2.5 py-1 rounded-lg border ${
                          scoreDefinitiva >= 3.0
                            ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
                            : scoreDefinitiva > 0
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-white/5 text-white/20 border-white/5'
                        }`}>
                          {scoreDefinitiva > 0 ? scoreDefinitiva.toFixed(1) : '-.-'}
                        </span>
                      </td>

                      {/* Desempeño Escala Nacional */}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          labelDesempeno === 'SUPERIOR' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                          labelDesempeno === 'ALTO' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' :
                          labelDesempeno === 'BASICO' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20' :
                          scoreDefinitiva > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                          'text-white/30 bg-white/5'
                        }`}>
                          {labelDesempeno}
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>

          {/* TABLE FOOTER / INFO */}
          <div className="p-4 bg-white/[0.01] border-t border-white/5 text-left text-[10px] text-white/30">
            * Usa las flechas de dirección (▲ ▼ ◀ ▶) de tu teclado para moverte rápidamente entre las celdas como en Excel. Las notas se guardan automáticamente al dejar de escribir.
          </div>

        </div>
      )}

      {showBulkModal && selectedPeriodo && (
        <CargaPlanillaModal
          idAsignacion={idAsignacion}
          idPeriodo={selectedPeriodo.id_periodo}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}
    </div>
  );
}
