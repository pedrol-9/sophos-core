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

  // Validaciones del paso 1
  const validateStep1 = () => {
    for (let i = 0; i < periodos.length; i++) {
      const p = periodos[i];
      if (!p.fecha_inicio || !p.fecha_fin) {
        return 'Todas las fechas de inicio y fin son obligatorias.';
      }
      const start = new Date(p.fecha_inicio);
      const end = new Date(p.fecha_fin);
      if (start >= end) {
        return `Periodo ${p.numero_periodo}: La fecha de inicio debe ser anterior a la de fin.`;
      }
      if (i > 0) {
        const prevEnd = new Date(periodos[i - 1].fecha_fin);
        if (start <= prevEnd) {
          return `Periodo ${p.numero_periodo}: La fecha de inicio debe ser posterior al fin del Periodo ${p.numero_periodo - 1}.`;
        }
      }
    }
    const hasActive = periodos.some((p) => p.activo);
    if (!hasActive) {
      return 'Debe seleccionar un periodo como activo.';
    }
    return '';
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

  // Validaciones del paso 3
  const validateStep3 = () => {
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
        if (e.nota_minima !== prevMax && e.nota_minima !== parseFloat((prevMax + 0.1).toFixed(1))) {
          // Validar continuidad
          if (e.nota_minima < prevMax) {
            return `El rango de ${e.nombre_desempeno} se solapa con el anterior.`;
          }
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

  useEffect(() => {
    async function fetchAssignments() {
      // Cargamos materias, cursos y docentes asociados de la institución
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

  // ─── NAVEGACIÓN ────────────────────────────────────────────────────────────
  const handleNext = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      const err = validateStep1();
      if (err) {
        setErrorMsg(err);
        return;
      }
    } else if (currentStep === 2) {
      if (totalPonderaciones !== 100) {
        setErrorMsg('La suma de las ponderaciones debe ser exactamente 100% (1.0).');
        return;
      }
    } else if (currentStep === 3) {
      const err = validateStep3();
      if (err) {
        setErrorMsg(err);
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    setErrorMsg('');
    setCurrentStep(currentStep - 1);
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
      onComplete();
    } else {
      setErrorMsg(res.error || 'Ocurrió un error al guardar la configuración.');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#060911]/98 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-indigo-500/10 blur-[130px] rounded-full" />
      </div>

      <div className="relative w-full max-w-3xl bg-[#0c1220]/90 border border-white/10 rounded-2xl shadow-2xl p-8 backdrop-blur-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl mb-4 text-white shadow-lg">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Configuración del Año Lectivo</h1>
          <p className="text-sm text-white/50 mt-1">Completa los parámetros iniciales de tu institución</p>
        </div>

        {/* Stepper */}
        <div className="flex justify-between items-center mb-8 max-w-md mx-auto relative px-2">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/10 -translate-y-1/2 z-0" />
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all border ${
                step === currentStep
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                  : step < currentStep
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-[#0f172a] border-white/10 text-white/40'
              }`}
            >
              {step < currentStep ? '✓' : step}
            </div>
          ))}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2.5">
            <svg className="w-5 h-5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-300 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Step Contents */}
        <div className="min-h-[280px]">
          
          {/* PASO 1: ESTRUCTURA TEMPORAL */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide mb-2.5">
                  Número de Periodos Académicos
                </label>
                <div className="flex gap-4">
                  {[3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => handlePeriodCountChange(count as 3 | 4)}
                      className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                        cantPeriodos === count
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-600/5'
                          : 'bg-white/3 border-white/10 text-white/60 hover:bg-white/5'
                      }`}
                    >
                      {count} Periodos ({count === 3 ? 'Trimestral' : 'Bimestral'})
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wide">
                  Configuración de Fechas y Periodo Activo
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {periodos.map((p, idx) => (
                    <div key={p.numero_periodo} className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-white">Periodo {p.numero_periodo}</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="activePeriod"
                            checked={p.activo}
                            onChange={() => handlePeriodActiveChange(idx)}
                            className="w-3.5 h-3.5 accent-indigo-500"
                          />
                          <span className="text-xs text-white/40">Activo</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-white/40 uppercase">Inicio</span>
                          <input
                            type="date"
                            value={p.fecha_inicio}
                            onChange={(e) => handlePeriodDateChange(idx, 'fecha_inicio', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-white/40 uppercase">Cierre</span>
                          <input
                            type="date"
                            value={p.fecha_fin}
                            onChange={(e) => handlePeriodDateChange(idx, 'fecha_fin', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: PONDERACIONES DE LEY */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                <p className="text-xs text-indigo-300 leading-relaxed">
                  <strong>Normativa MEN (Colombia):</strong> Define la distribución de pesos de las tres dimensiones académicas fundamentales. La suma total de los porcentajes debe ser exactamente <strong>100%</strong> (1.0).
                </p>
              </div>

              <div className="space-y-4">
                {/* Saber */}
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1.5">
                    <span className="text-white">Cognitivo (Saber / Exámenes)</span>
                    <span className="text-indigo-400 font-bold">{saber}%</span>
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

                {/* Hacer */}
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1.5">
                    <span className="text-white">Procedimental (Hacer / Talleres)</span>
                    <span className="text-indigo-400 font-bold">{hacer}%</span>
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

                {/* Ser */}
                <div>
                  <div className="flex justify-between text-sm font-medium mb-1.5">
                    <span className="text-white">Actitudinal (Ser / Convivencia y Asistencia)</span>
                    <span className="text-indigo-400 font-bold">{ser}%</span>
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

              {/* Total Indicator */}
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-sm text-white/50">Suma total de ponderaciones:</span>
                <span className={`text-lg font-bold px-3 py-1 rounded-lg ${
                  totalPonderaciones === 100
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-red-400 bg-red-500/10'
                }`}>
                  {totalPonderaciones}% / 100%
                </span>
              </div>
            </div>
          )}

          {/* PASO 3: ESCALA DE VALORACIÓN */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                <p className="text-xs text-indigo-300 leading-relaxed">
                  Homologa la escala numérica de tu institución con los desempeños nacionales obligatorios del Decreto 1290. El rango completo debe iniciar en <strong>0.0</strong> y finalizar en <strong>5.0</strong>.
                </p>
              </div>

              <div className="space-y-3">
                {escalas.map((e, idx) => (
                  <div key={e.nombre_desempeno} className="bg-white/3 border border-white/5 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        e.nombre_desempeno === 'SUPERIOR' ? 'bg-emerald-400' :
                        e.nombre_desempeno === 'ALTO' ? 'bg-indigo-400' :
                        e.nombre_desempeno === 'BASICO' ? 'bg-cyan-400' : 'bg-red-400'
                      }`} />
                      <span className="text-sm font-semibold text-white w-24">{e.nombre_desempeno}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/40">MÍNIMA</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          value={e.nota_minima}
                          onChange={(e) => handleEscalaChange(idx, 'nota_minima', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-white/40">MÁXIMA</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          value={e.nota_maxima}
                          onChange={(e) => handleEscalaChange(idx, 'nota_maxima', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PASO 4: BANCO DE EVIDENCIAS / LOGROS */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white">Redacción de Logros Iniciales</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-white/40 uppercase mb-1">Grupo y Materia</label>
                    <select
                      value={selectedAsignacion}
                      onChange={(e) => setSelectedAsignacion(e.target.value)}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      {assignments.map((a) => (
                        <option key={a.id_asignacion} value={a.id_asignacion}>
                          {a.materia} — {a.curso} ({a.docente})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/40 uppercase mb-1">Periodo Destino</label>
                    <select
                      value={selectedPeriodoLogro}
                      onChange={(e) => setSelectedPeriodoLogro(parseInt(e.target.value, 10))}
                      className="w-full bg-[#0f172a] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
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
                  <label className="block text-[10px] text-white/40 uppercase mb-1">Meta / Logro Académico</label>
                  <textarea
                    rows={2}
                    value={logroText}
                    onChange={(e) => setLogroText(e.target.value)}
                    placeholder="Ej. Reconoce e identifica figuras geométricas tridimensionales en problemas aplicados."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddLogro}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold transition-colors"
                >
                  + Agregar al Banco
                </button>
              </div>

              {/* Logros List */}
              {logros.length > 0 && (
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                  {logros.map((l, idx) => {
                    const assign = assignments.find(a => a.id_asignacion === l.id_asignacion);
                    return (
                      <div key={idx} className="bg-white/3 border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between gap-3">
                        <div className="text-xs">
                          <span className="font-semibold text-indigo-400 mr-2">P{l.numero_periodo} · {assign?.materia} ({assign?.curso}):</span>
                          <span className="text-white/70 italic">{l.descripcion}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLogro(idx)}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-1"
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

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1 || loading}
              className="px-4 py-2 rounded-xl bg-white/3 border border-white/10 text-sm text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Atrás
            </button>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="px-4 py-2 rounded-xl bg-white/3 border border-transparent hover:bg-red-500/10 hover:text-red-400 text-sm text-white/40 font-semibold transition-all"
              >
                Configurar más tarde
              </button>
            )}
          </div>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/15"
            >
              {loading ? 'Guardando...' : 'Finalizar Parametrización'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
