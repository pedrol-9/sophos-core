'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { saveOnboardingParametrizacion, OnboardingData, PeriodoParam, EscalaParam, LogroParam } from '@/app/actions/config-actions';

interface OnboardingWizardProps {
  idInstitucion: string;
  onComplete: () => void;
  onDismiss?: () => void;
}

type AssignmentItem = {
  id_asignacion: string;
  materia: string;
  curso: string;
  docente: string;
};

export function OnboardingWizard({ idInstitucion, onComplete, onDismiss }: OnboardingWizardProps) {
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showConfirmSkip, setShowConfirmSkip] = useState(false);

  // ─── PASO 1: ESTRUCTURA TEMPORAL ───────────────────────────────────────────
  const [cantPeriodos, setCantPeriodos] = useState<3 | 4>(4);
  const [periodos, setPeriodos] = useState<PeriodoParam[]>([
    { numero_periodo: 1, fecha_inicio: '2026-02-01', fecha_fin: '2026-04-15', activo: true },
    { numero_periodo: 2, fecha_inicio: '2026-04-16', fecha_fin: '2026-06-30', activo: false },
    { numero_periodo: 3, fecha_inicio: '2026-07-01', fecha_fin: '2026-09-15', activo: false },
    { numero_periodo: 4, fecha_inicio: '2026-09-16', fecha_fin: '2026-11-30', activo: false },
  ]);

  const handlePeriodCountChange = (count: 3 | 4) => {
    setCantPeriodos(count);
    if (count === 3) {
      setPeriodos([
        { numero_periodo: 1, fecha_inicio: '2026-02-01', fecha_fin: '2026-05-15', activo: true },
        { numero_periodo: 2, fecha_inicio: '2026-05-16', fecha_fin: '2026-08-31', activo: false },
        { numero_periodo: 3, fecha_inicio: '2026-09-01', fecha_fin: '2026-11-30', activo: false },
      ]);
    } else {
      setPeriodos([
        { numero_periodo: 1, fecha_inicio: '2026-02-01', fecha_fin: '2026-04-15', activo: true },
        { numero_periodo: 2, fecha_inicio: '2026-04-16', fecha_fin: '2026-06-30', activo: false },
        { numero_periodo: 3, fecha_inicio: '2026-07-01', fecha_fin: '2026-09-15', activo: false },
        { numero_periodo: 4, fecha_inicio: '2026-09-16', fecha_fin: '2026-11-30', activo: false },
      ]);
    }
  };

  const handlePeriodDateChange = (index: number, field: 'fecha_inicio' | 'fecha_fin', value: string) => {
    const updated = [...periodos];
    updated[index][field] = value;
    setPeriodos(updated);
  };

  const handlePeriodActiveChange = (index: number) => {
    const updated = periodos.map((p, i) => ({
      ...p,
      activo: i === index,
    }));
    setPeriodos(updated);
  };

  // ─── PASO 2: PONDERACIONES DE LEY ──────────────────────────────────────────
  const [saber, setSaber] = useState(40);
  const [hacer, setHacer] = useState(40);
  const [ser, setSer] = useState(20);

  const totalPonderaciones = saber + hacer + ser;

  // ─── PASO 3: ESCALA DE VALORACIÓN ──────────────────────────────────────────
  const [escalas, setEscalas] = useState<EscalaParam[]>([
    { nombre_desempeno: 'BAJO', nota_minima: 0.0, nota_maxima: 2.9 },
    { nombre_desempeno: 'BASICO', nota_minima: 3.0, nota_maxima: 3.9 },
    { nombre_desempeno: 'ALTO', nota_minima: 4.0, nota_maxima: 4.5 },
    { nombre_desempeno: 'SUPERIOR', nota_minima: 4.6, nota_maxima: 5.0 },
  ]);

  const handleEscalaChange = (index: number, field: 'nota_minima' | 'nota_maxima', value: number) => {
    const updated = [...escalas];
    updated[index][field] = value;
    setEscalas(updated);
  };

  const validateStepScale = () => {
    for (let i = 0; i < escalas.length; i++) {
      const e = escalas[i];
      if (e.nota_minima < 0 || e.nota_minima > 5 || e.nota_maxima < 0 || e.nota_maxima > 5) {
        return 'Las notas deben estar en el rango de 0.0 a 5.0.';
      }
      if (e.nota_minima > e.nota_maxima) {
        return `Rango no válido para ${e.nombre_desempeno}. La nota mínima no puede exceder la máxima.`;
      }
      if (i > 0) {
        const prevMax = escalas[i - 1].nota_maxima;
        if (e.nota_minima < prevMax) {
          return `El rango de ${e.nombre_desempeno} se solapa con el desempeño anterior (${escalas[i - 1].nombre_desempeno}).`;
        }
      }
    }
    if (escalas[0].nota_minima !== 0) {
      return 'La nota mínima del desempeño BAJO debe ser 0.0.';
    }
    if (escalas[escalas.length - 1].nota_maxima !== 5) {
      return 'La nota máxima del desempeño SUPERIOR debe ser 5.0.';
    }
    return '';
  };

  // ─── PASO 4: BANCO DE LOGROS ───────────────────────────────────────────────
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [selectedAsignacion, setSelectedAsignacion] = useState('');
  const [selectedPeriodoLogro, setSelectedPeriodoLogro] = useState(1);
  const [logroText, setLogroText] = useState('');
  const [logros, setLogros] = useState<LogroParam[]>([]);

  // ─── DRAFT PERSISTENCE (localStorage) ──────────────────────────────────────
  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('sophos_onboarding_draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.cantPeriodos) setCantPeriodos(draft.cantPeriodos);
        if (draft.periodos) setPeriodos(draft.periodos);
        if (draft.saber) setSaber(draft.saber);
        if (draft.hacer) setHacer(draft.hacer);
        if (draft.ser) setSer(draft.ser);
        if (draft.escalas) setEscalas(draft.escalas);
        if (draft.logros) setLogros(draft.logros);
        if (draft.currentStep) setCurrentStep(draft.currentStep);
      } catch (err) {
        console.error('Error loading onboarding draft:', err);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save draft on changes (only after mounting and loading completes)
  useEffect(() => {
    if (!isLoaded) return;

    const draft = {
      cantPeriodos,
      periodos,
      saber,
      hacer,
      ser,
      escalas,
      logros,
      currentStep,
    };
    localStorage.setItem('sophos_onboarding_draft', JSON.stringify(draft));
  }, [cantPeriodos, periodos, saber, hacer, ser, escalas, logros, currentStep, isLoaded]);

  useEffect(() => {
    async function fetchAssignments() {
      const { data, error } = await supabase
        .from('asignaciones_academicas')
        .select(`
          id_asignacion,
          materias(nombre),
          cursos(nombre),
          usuarios(nombre_completo)
        `)
        .eq('id_institucion', idInstitucion);

      if (data && !error) {
        const list: AssignmentItem[] = data.map((item: any) => ({
          id_asignacion: item.id_asignacion,
          materia: item.materias?.nombre || 'General',
          curso: item.cursos?.nombre || 'Sin curso',
          docente: item.usuarios?.nombre_completo || 'Sin docente',
        }));
        setAssignments(list);
        if (list.length > 0) setSelectedAsignacion(list[0].id_asignacion);
      }
    }
    fetchAssignments();
  }, [supabase, idInstitucion]);

  const handleAddLogro = () => {
    if (!selectedAsignacion) {
      setErrorMsg('Debes seleccionar una asignación académica.');
      return;
    }
    if (!logroText.trim()) {
      setErrorMsg('La descripción del logro no puede estar vacía.');
      return;
    }
    const newLogro: LogroParam = {
      id_asignacion: selectedAsignacion,
      numero_periodo: selectedPeriodoLogro,
      descripcion: logroText.trim(),
    };
    setLogros([...logros, newLogro]);
    setLogroText('');
    setErrorMsg('');
  };

  const handleRemoveLogro = (index: number) => {
    setLogros(logros.filter((_, i) => i !== index));
  };

  // ─── DYNAMIC STEPS & NAVIGATION ────────────────────────────────────────────
  const cantPeriodosInt = Number(cantPeriodos);
  const totalSteps = cantPeriodosInt === 3 ? 8 : 9;
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  const handlePeriodCountSelect = (count: 3 | 4) => {
    handlePeriodCountChange(count);
    setErrorMsg('');
    setTimeout(() => {
      setCurrentStep(2);
    }, 200);
  };

  const handleActivePeriodSelect = (index: number) => {
    handlePeriodActiveChange(index);
    setErrorMsg('');
    setTimeout(() => {
      setCurrentStep(cantPeriodosInt + 3); // Avanza a ponderaciones
    }, 200);
  };

  const handleNext = () => {
    setErrorMsg('');

    // Validations for step dates
    if (currentStep >= 2 && currentStep <= cantPeriodosInt + 1) {
      const idx = currentStep - 2;
      const p = periodos[idx];
      if (!p.fecha_inicio || !p.fecha_fin) {
        setErrorMsg('Ambas fechas son obligatorias.');
        return;
      }
      const start = new Date(p.fecha_inicio);
      const end = new Date(p.fecha_fin);
      if (start >= end) {
        setErrorMsg(`Periodo ${p.numero_periodo}: La fecha de inicio debe ser anterior a la de fin.`);
        return;
      }
      if (idx > 0) {
        const prevEnd = new Date(periodos[idx - 1].fecha_fin);
        if (start <= prevEnd) {
          setErrorMsg(`Periodo ${p.numero_periodo}: Debe iniciar después del cierre del Periodo ${p.numero_periodo - 1} (${periodos[idx - 1].fecha_fin}).`);
          return;
        }
      }
    }

    // Validation for Active Period selection
    if (currentStep === cantPeriodosInt + 2) {
      const hasActive = periodos.some((p) => p.activo);
      if (!hasActive) {
        setErrorMsg('Debe seleccionar un periodo activo.');
        return;
      }
    }

    // Validation for Ponderaciones
    if (currentStep === cantPeriodosInt + 3) {
      if (totalPonderaciones !== 100) {
        setErrorMsg('La suma de las ponderaciones debe ser exactamente 100%.');
        return;
      }
    }

    // Validation for Scale
    if (currentStep === cantPeriodosInt + 4) {
      const err = validateStepScale();
      if (err) {
        setErrorMsg(err);
        return;
      }
    }

    setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    setErrorMsg('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg('');

    const formattedData: OnboardingData = {
      periodos,
      escalas,
      ponderaciones: {
        peso_saber: parseFloat((saber / 100).toFixed(2)),
        peso_hacer: parseFloat((hacer / 100).toFixed(2)),
        peso_ser: parseFloat((ser / 100).toFixed(2)),
      },
      logros,
    };

    const res = await saveOnboardingParametrizacion(formattedData);

    setLoading(false);
    if (res.success) {
      localStorage.removeItem('sophos_onboarding_draft'); // Clean up draft on success
      onComplete();
    } else {
      setErrorMsg(res.error || 'Ocurrió un error al guardar la configuración.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg bg-black/60 overflow-y-auto">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-500/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/3 w-[350px] h-[350px] bg-cyan-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-[#0c1220]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300">
        
        {/* CONFIRM SKIP SUB-OVERLAY */}
        {showConfirmSkip && (
          <div className="absolute inset-0 bg-[#060911]/90 z-20 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="max-w-sm text-center space-y-5 bg-[#0f172a] border border-white/10 p-6 rounded-2xl shadow-xl">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Pausar la configuración?</h3>
                <p className="text-xs text-white/50 mt-1.5 leading-relaxed">
                  Guardamos tu progreso en este navegador como borrador. Podrás continuar completando los pasos más tarde desde el panel general.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmSkip(false);
                    if (onDismiss) onDismiss();
                  }}
                  className="flex-1 py-2 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-white/80 transition-all cursor-pointer"
                >
                  Salir
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmSkip(false)}
                  className="flex-1 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sleek Progress Bar */}
        <div 
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500" 
          style={{ width: `${progressPercent}%` }}
        />

        <div className="p-8">
          
          {/* Header Step Counter */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Paso {currentStep} de {totalSteps}
            </span>
            <span className="text-[10px] text-white/30 font-medium">
              {progressPercent}% completado
            </span>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2.5 animate-in fade-in duration-200">
              <svg className="w-4 h-4 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-300 text-xs font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Conversational Screen Selector */}
          <div key={currentStep} className="animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-[220px] flex flex-col justify-center">
            
            {/* STEP 1: Period Count */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-bold text-white tracking-tight">Estructura del año escolar</h2>
                  <p className="text-xs text-white/50 mt-1">
                    Comencemos por definir el número de periodos académicos en los que se dividirá el año lectivo.
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handlePeriodCountSelect(3)}
                    className={`flex items-center justify-between w-full p-4 rounded-xl border text-left font-semibold transition-all ${
                      cantPeriodos === 3
                        ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                        : 'bg-white/3 border-white/10 text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="block text-sm">3 Periodos</span>
                      <span className="block text-[10px] text-white/40 font-normal mt-0.5">Esquema Trimestral</span>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded">Seleccionar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePeriodCountSelect(4)}
                    className={`flex items-center justify-between w-full p-4 rounded-xl border text-left font-semibold transition-all ${
                      cantPeriodos === 4
                        ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                        : 'bg-white/3 border-white/10 text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div>
                      <span className="block text-sm">4 Periodos</span>
                      <span className="block text-[10px] text-white/40 font-normal mt-0.5">Esquema Bimestral (Más común en Latam)</span>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded">Seleccionar</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2 to cantPeriodosInt + 1: Specific Period dates */}
            {currentStep >= 2 && currentStep <= cantPeriodosInt + 1 && (() => {
              const idx = currentStep - 2;
              const p = periodos[idx];
              return (
                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-400 px-2.5 py-1 rounded">Calendario Escolar</span>
                    <h2 className="text-xl font-bold text-white tracking-tight mt-3">Fecha del Periodo {p.numero_periodo}</h2>
                    <p className="text-xs text-white/50 mt-1">
                      Define los límites de fecha para el inicio y fin de las clases del Periodo {p.numero_periodo}.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label htmlFor={`start-date-p${p.numero_periodo}`} className="block text-[10px] font-bold uppercase tracking-wider text-white/40">Fecha de Inicio</label>
                      <input
                        id={`start-date-p${p.numero_periodo}`}
                        type="date"
                        value={p.fecha_inicio}
                        onChange={(e) => handlePeriodDateChange(idx, 'fecha_inicio', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`end-date-p${p.numero_periodo}`} className="block text-[10px] font-bold uppercase tracking-wider text-white/40">Fecha de Cierre</label>
                      <input
                        id={`end-date-p${p.numero_periodo}`}
                        type="date"
                        value={p.fecha_fin}
                        onChange={(e) => handlePeriodDateChange(idx, 'fecha_fin', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* STEP cantPeriodosInt + 2: Active Period choice */}
            {currentStep === cantPeriodosInt + 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">¿Cuál es el periodo activo actual?</h2>
                  <p className="text-xs text-white/50 mt-1">
                    Selecciona en cuál periodo se iniciará la toma de asistencia y registro de calificaciones en la app.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {periodos.map((p, idx) => (
                    <button
                      key={p.numero_periodo}
                      type="button"
                      onClick={() => handleActivePeriodSelect(idx)}
                      className={`p-4 rounded-xl border text-center font-bold text-sm transition-all ${
                        p.activo
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-md'
                          : 'bg-white/3 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      Periodo {p.numero_periodo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP cantPeriodosInt + 3: Ponderaciones (Saber/Hacer/Ser) */}
            {currentStep === cantPeriodosInt + 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Ponderaciones de Evaluación</h2>
                  <p className="text-xs text-white/50 mt-1">
                    Distribuye los pesos porcentuales de las tres dimensiones fundamentales del aprendizaje. La suma debe dar 100%.
                  </p>
                </div>

                <div className="space-y-4 pt-1">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-white/70">Cognitivo (Saber / Exámenes)</span>
                      <span className="text-indigo-400">{saber}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={saber}
                      onChange={(e) => setSaber(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-white/70">Procedimental (Hacer / Proyectos y Tareas)</span>
                      <span className="text-indigo-400">{hacer}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={hacer}
                      onChange={(e) => setHacer(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-white/70">Actitudinal (Ser / Convivencia y Asistencia)</span>
                      <span className="text-indigo-400">{ser}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={ser}
                      onChange={(e) => setSer(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                  <span className="text-xs text-white/40 font-medium">Suma Total de Pesos:</span>
                  <span className={`text-sm font-extrabold px-3 py-1 rounded-lg ${
                    totalPonderaciones === 100
                      ? 'text-teal-400 bg-teal-500/10 border border-teal-500/20'
                      : 'text-red-400 bg-red-500/10 border border-red-500/20'
                  }`}>
                    {totalPonderaciones}% / 100%
                  </span>
                </div>
              </div>
            )}

            {/* STEP cantPeriodosInt + 4: Escala de valoración */}
            {currentStep === cantPeriodosInt + 4 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Escala de Valoración</h2>
                  <p className="text-xs text-white/50 mt-1">
                    Homologa las notas numéricas (0.0 a 5.0) con los desempeños nacionales obligatorios del Decreto 1290.
                  </p>
                </div>
                <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                  {escalas.map((e, idx) => (
                    <div key={e.nombre_desempeno} className="bg-white/3 border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          e.nombre_desempeno === 'SUPERIOR' ? 'bg-emerald-400' :
                          e.nombre_desempeno === 'ALTO' ? 'bg-indigo-400' :
                          e.nombre_desempeno === 'BASICO' ? 'bg-cyan-400' : 'bg-red-400'
                        }`} />
                        <span className="text-xs font-bold text-white">{e.nombre_desempeno}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-white/40 uppercase">Min</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={e.nota_minima}
                            onChange={(e) => handleEscalaChange(idx, 'nota_minima', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-white/5 border border-white/10 rounded-lg py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-white/40 uppercase">Max</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={e.nota_maxima}
                            onChange={(e) => handleEscalaChange(idx, 'nota_maxima', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-white/5 border border-white/10 rounded-lg py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP cantPeriodosInt + 5: Banco de Logros (Opcional) */}
            {currentStep === cantPeriodosInt + 5 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Banco de Logros (Opcional)</h2>
                  <p className="text-xs text-white/50 mt-1">
                    Redacta un logro académico inicial para tu banco de evidencias. Puedes omitir o saltar este paso si lo deseas.
                  </p>
                </div>

                <div className="bg-white/3 border border-white/5 rounded-xl p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="assignment-select" className="block text-[9px] text-white/40 uppercase mb-1">Materia & Curso</label>
                      <select
                        id="assignment-select"
                        value={selectedAsignacion}
                        onChange={(e) => setSelectedAsignacion(e.target.value)}
                        className="w-full bg-[#0c1220] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        {assignments.length === 0 ? (
                          <option value="">Sin asignaciones</option>
                        ) : (
                          assignments.map((a) => (
                            <option key={a.id_asignacion} value={a.id_asignacion}>
                              {a.materia} — {a.curso}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="period-logro-select" className="block text-[9px] text-white/40 uppercase mb-1">Periodo</label>
                      <select
                        id="period-logro-select"
                        value={selectedPeriodoLogro}
                        onChange={(e) => setSelectedPeriodoLogro(parseInt(e.target.value, 10))}
                        className="w-full bg-[#0c1220] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        {periodos.map((p) => (
                          <option key={p.numero_periodo} value={p.numero_periodo}>
                            Periodo {p.numero_periodo}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="logro-desc" className="block text-[9px] text-white/40 uppercase mb-1">Descripción del Logro</label>
                    <textarea
                      id="logro-desc"
                      rows={2}
                      value={logroText}
                      onChange={(e) => setLogroText(e.target.value)}
                      placeholder="Ej: Formula y resuelve problemas usando la lógica de conjuntos."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLogro}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold transition-colors"
                  >
                    + Agregar Logro
                  </button>
                </div>

                {logros.length > 0 && (
                  <div className="space-y-1.5 max-h-[90px] overflow-y-auto pr-1">
                    {logros.map((l, idx) => {
                      const assign = assignments.find(a => a.id_asignacion === l.id_asignacion);
                      return (
                        <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5 flex items-center justify-between gap-3 text-[11px]">
                          <span className="text-white/80 truncate">
                            <strong className="text-indigo-400 mr-1.5">P{l.numero_periodo} · {assign?.materia}:</strong>
                            {l.descripcion}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLogro(idx)}
                            className="text-red-400 hover:text-red-300 font-semibold px-1"
                          >
                            Eliminar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer Controls & Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
            
            {/* Left Back Button */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1 || loading}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-white/75 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              Atrás
            </button>

            {/* Middle Omit/Skip Button */}
            {onDismiss && (
              <button
                type="button"
                onClick={() => setShowConfirmSkip(true)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                Omitir configuración
              </button>
            )}

            {/* Right Next/Finish Button */}
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/15 cursor-pointer"
              >
                {loading ? 'Guardando...' : 'Finalizar configuración'}
              </button>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
