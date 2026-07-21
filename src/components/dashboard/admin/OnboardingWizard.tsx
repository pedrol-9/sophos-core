'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { saveOnboardingParametrizacion, OnboardingData, PeriodoParam, EscalaParam, LogroParam, ExistingOnboardingConfig } from '@/app/actions/config-actions';

interface OnboardingWizardProps {
  idInstitucion: string;
  onComplete: () => void;
  onDismiss?: () => void;
  /** Datos pre-cargados desde la DB para modo edición */
  initialData?: ExistingOnboardingConfig;
  /** Si true: el wizard está editando una config existente (oculta el botón Omitir) */
  isEditing?: boolean;
}

type AssignmentItem = {
  id_asignacion: string;
  materia: string;
  curso: string;
  docente: string;
};

export function OnboardingWizard({ idInstitucion, onComplete, onDismiss, initialData, isEditing }: OnboardingWizardProps) {
  const supabase = createClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmSkip, setShowConfirmSkip] = useState(false);

  // ─── PASO DE NOMENCLATURA ──────────────────────────────────────────────────
  const resolveNomenclaturaOption = (nom: string): '6A' | '601' | 'custom' => {
    if (nom === '6A') return '6A';
    if (nom === '601') return '601';
    return 'custom';
  };
  const initNom = initialData?.nomenclaturaCursos ?? '6A';
  const [nomenclaturaOption, setNomenclaturaOption] = useState<'6A' | '601' | 'custom'>(resolveNomenclaturaOption(initNom));
  const [nomenclaturaCursos, setNomenclaturaCursos] = useState(initNom);
  const [customNomenclaturaInput, setCustomNomenclaturaInput] = useState(
    resolveNomenclaturaOption(initNom) === 'custom' ? initNom : ''
  );

  // ─── PASO 1: ESTRUCTURA TEMPORAL ───────────────────────────────────────────
  const initPeriodos: PeriodoParam[] = initialData?.periodos?.length
    ? initialData.periodos
    : [
        { numero_periodo: 1, fecha_inicio: '2026-02-01', fecha_fin: '2026-04-15', activo: true },
        { numero_periodo: 2, fecha_inicio: '2026-04-16', fecha_fin: '2026-06-30', activo: false },
        { numero_periodo: 3, fecha_inicio: '2026-07-01', fecha_fin: '2026-09-15', activo: false },
        { numero_periodo: 4, fecha_inicio: '2026-09-16', fecha_fin: '2026-11-30', activo: false },
      ];
  const initCantPeriodos = (initialData?.periodos?.length === 3 ? 3 : 4) as 3 | 4;
  const [cantPeriodos, setCantPeriodos] = useState<3 | 4>(initCantPeriodos);
  const [periodos, setPeriodos] = useState<PeriodoParam[]>(initPeriodos);

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

  // ─── PASO 3: ESCALA DE VALORACIÓN ──────────────────────────────────────────
  const initEscalas: EscalaParam[] = initialData?.escalas?.length
    ? initialData.escalas
    : [
        { nombre_desempeno: 'BAJO', nota_minima: 0.0, nota_maxima: 2.9 },
        { nombre_desempeno: 'BASICO', nota_minima: 3.0, nota_maxima: 3.9 },
        { nombre_desempeno: 'ALTO', nota_minima: 4.0, nota_maxima: 4.5 },
        { nombre_desempeno: 'SUPERIOR', nota_minima: 4.6, nota_maxima: 5.0 },
      ];
  const [escalas, setEscalas] = useState<EscalaParam[]>(initEscalas);

  const handleEscalaChange = (index: number, field: 'nota_minima' | 'nota_maxima', value: number) => {
    const updated = [...escalas];
    updated[index][field] = value;
    setEscalas(updated);
  };

  const validateStepScale = (): string | null => {
    for (let i = 0; i < escalas.length; i++) {
      const current = escalas[i];
      if (current.nota_minima > current.nota_maxima) {
        return `Escala ${current.nombre_desempeno}: La nota mínima no puede ser mayor que la máxima.`;
      }
      if (i > 0) {
        const prev = escalas[i - 1];
        if (current.nota_minima < prev.nota_maxima) {
          return `Escala ${current.nombre_desempeno}: La nota mínima (${current.nota_minima}) debe ser mayor o igual a la máxima anterior (${prev.nota_maxima}).`;
        }
      }
    }
    return null;
  };

  // ─── PASO 4: BANCO DE LOGROS (OPCIONAL) ──────────────────────────────────
  const [logros, setLogros] = useState<LogroParam[]>(initialData?.logros ?? []);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [selectedAsignacion, setSelectedAsignacion] = useState<string>('');
  const [selectedPeriodoLogro, setSelectedPeriodoLogro] = useState<number>(1);
  const [logroText, setLogroText] = useState<string>('');

  useEffect(() => {
    async function loadAssignments() {
      if (!idInstitucion) return;
      const { data } = await supabase
        .from('asignaciones_academicas')
        .select(`
          id_asignacion,
          materias ( nombre ),
          cursos ( nombre, jornada ),
          docentes:id_docente ( nombre_completo )
        `)
        .eq('id_institucion', idInstitucion);

      if (data && data.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: AssignmentItem[] = data.map((item: any) => ({
          id_asignacion: item.id_asignacion,
          materia: item.materias?.nombre || 'Sin materia',
          curso: item.cursos ? `${item.cursos.nombre} (${item.cursos.jornada})` : 'Sin curso',
          docente: item.docentes?.nombre_completo || 'Sin docente',
        }));
        setAssignments(mapped);
        setSelectedAsignacion(mapped[0].id_asignacion);
      }
    }
    loadAssignments();
  }, [idInstitucion, supabase]);

  const handleAddLogro = () => {
    if (!logroText.trim()) {
      setErrorMsg('Escribe la descripción del logro.');
      return;
    }
    if (!selectedAsignacion) {
      setErrorMsg('No hay asignación seleccionada.');
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

  // ─── PERSISTENCIA AUTOMÁTICA EN LOCALSTORAGE ─────────────────────────────
  useEffect(() => {
    if (!idInstitucion || initialData) return;
    const saved = localStorage.getItem(`sophos_onboarding_draft_${idInstitucion}`);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.cantPeriodos) setCantPeriodos(draft.cantPeriodos);
        if (draft.periodos) setPeriodos(draft.periodos);
        if (draft.escalas) setEscalas(draft.escalas);
        if (draft.logros) setLogros(draft.logros);
        if (draft.nomenclaturaCursos) {
          setNomenclaturaCursos(draft.nomenclaturaCursos);
          const opt = resolveNomenclaturaOption(draft.nomenclaturaCursos);
          setNomenclaturaOption(opt);
          if (opt === 'custom') setCustomNomenclaturaInput(draft.nomenclaturaCursos);
        }
      } catch (e) {
        console.error('Error restaurando borrador de onboarding:', e);
      }
    }
  }, [idInstitucion, initialData]);

  useEffect(() => {
    if (!idInstitucion || initialData) return;
    const draft = { cantPeriodos, periodos, escalas, logros, nomenclaturaCursos };
    localStorage.setItem(`sophos_onboarding_draft_${idInstitucion}`, JSON.stringify(draft));
  }, [cantPeriodos, periodos, escalas, logros, nomenclaturaCursos, idInstitucion, initialData]);

  // ─── TOTAL DE PASOS ────────────────────────────────────────────────────────
  const cantPeriodosInt = periodos.length;
  const totalSteps = 2 + cantPeriodosInt + 3;

  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  const handlePeriodCountSelect = (count: 3 | 4) => {
    handlePeriodCountChange(count);
    setErrorMsg('');
    setCurrentStep(2);
  };

  const handleActivePeriodSelect = (index: number) => {
    handlePeriodActiveChange(index);
    setErrorMsg('');
    setCurrentStep(currentStep + 1);
  };

  const handleNext = () => {
    setErrorMsg('');

    if (currentStep === 2) {
      if (nomenclaturaOption === 'custom' && !customNomenclaturaInput.trim()) {
        setErrorMsg('Por favor escribe la nomenclatura base.');
        return;
      }
    }

    if (currentStep >= 3 && currentStep <= cantPeriodosInt + 2) {
      const idx = currentStep - 3;
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

    if (currentStep === cantPeriodosInt + 3) {
      const hasActive = periodos.some((p) => p.activo);
      if (!hasActive) {
        setErrorMsg('Debe seleccionar un periodo activo.');
        return;
      }
    }

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

    const finalNomenclatura = nomenclaturaOption === 'custom' 
      ? customNomenclaturaInput.trim() 
      : nomenclaturaOption;

    const formattedData: OnboardingData = {
      periodos,
      escalas,
      logros,
      nomenclaturaCursos: finalNomenclatura,
    };

    const res = await saveOnboardingParametrizacion(formattedData);

    setLoading(false);
    if (res.success) {
      localStorage.removeItem(`sophos_onboarding_draft_${idInstitucion}`);
      onComplete();
    } else {
      setErrorMsg(res.error || 'Ocurrió un error al guardar la configuración.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-black/60 overflow-y-auto">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/3 w-[350px] h-[350px] bg-cyan-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 text-foreground">
        
        {/* CONFIRM SKIP SUB-OVERLAY */}
        {showConfirmSkip && (
          <div className="absolute inset-0 bg-background/95 z-20 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="max-w-sm text-center space-y-5 bg-card border border-border p-6 rounded-2xl shadow-xl">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">¿Pausar la configuración?</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Guardamos tu progreso en este navegador como borrador. Podrás continuar completando los pasos más tarde desde el panel general.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSkip(false)}
                  className="flex-1 py-2 px-4 rounded-xl bg-secondary border border-border hover:bg-secondary/80 text-xs font-semibold text-foreground transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmSkip(false);
                    if (onDismiss) onDismiss();
                  }}
                  className="flex-1 py-2 px-4 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-all shadow-md cursor-pointer"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div 
          className="absolute top-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500" 
          style={{ width: `${progressPercent}%` }}
        />

        <div className="p-6 sm:p-8">
          
          {/* Header Step Counter */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Paso {currentStep} de {totalSteps}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {progressPercent}% completado
            </span>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2.5 animate-in fade-in duration-200">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-500 dark:text-red-300 text-xs font-medium">{errorMsg}</p>
            </div>
          )}

          {/* Conversational Screen Selector */}
          <div key={currentStep} className="animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-[220px] flex flex-col justify-center">
            
            {/* STEP 1: Period Count */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Estructura del año escolar</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Comencemos por definir el número de periodos académicos en los que se dividirá el año lectivo.
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handlePeriodCountSelect(3)}
                    className={`flex items-center justify-between w-full p-4 rounded-xl border text-left font-semibold transition-all ${
                      cantPeriodos === 3
                        ? 'bg-primary/15 border-primary text-foreground shadow-xs'
                        : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <div>
                      <span className="block text-sm">3 Periodos</span>
                      <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">Esquema Trimestral</span>
                    </div>
                    <span className="text-[10px] font-bold bg-primary/20 text-primary px-2.5 py-1 rounded">Seleccionar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePeriodCountSelect(4)}
                    className={`flex items-center justify-between w-full p-4 rounded-xl border text-left font-semibold transition-all ${
                      cantPeriodos === 4
                        ? 'bg-primary/15 border-primary text-foreground shadow-xs'
                        : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <div>
                      <span className="block text-sm">4 Periodos</span>
                      <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">Esquema Bimestral (Más común en Latam)</span>
                    </div>
                    <span className="text-[10px] font-bold bg-primary/20 text-primary px-2.5 py-1 rounded">Seleccionar</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Nomenclatura de Cursos */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="text-center sm:text-left">
                  <span className="text-[10px] font-bold bg-primary/20 text-primary px-2.5 py-1 rounded">Configuración de Cursos</span>
                  <h2 className="text-xl font-bold text-foreground tracking-tight mt-3">Nomenclatura de Cursos</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Selecciona cómo se identificarán las secciones o grupos de los cursos en tu institución.
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNomenclaturaOption('6A');
                      setNomenclaturaCursos('6A');
                      setErrorMsg('');
                    }}
                    className={`flex items-center justify-between w-full p-4 rounded-xl border text-left font-semibold transition-all ${
                      nomenclaturaOption === '6A'
                        ? 'bg-primary/15 border-primary text-foreground shadow-xs'
                        : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <div>
                      <span className="block text-sm">Alfanumérica (Ej: 6A, 6B)</span>
                      <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">Grado número y sección letra consecutiva</span>
                    </div>
                    <span className="text-[10px] font-bold bg-primary/20 text-primary px-2.5 py-1 rounded">Seleccionar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNomenclaturaOption('601');
                      setNomenclaturaCursos('601');
                      setErrorMsg('');
                    }}
                    className={`flex items-center justify-between w-full p-4 rounded-xl border text-left font-semibold transition-all ${
                      nomenclaturaOption === '601'
                        ? 'bg-primary/15 border-primary text-foreground shadow-xs'
                        : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <div>
                      <span className="block text-sm">Numérica Completa (Ej: 601, 602)</span>
                      <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">Grado número seguido de sección numérica</span>
                    </div>
                    <span className="text-[10px] font-bold bg-primary/20 text-primary px-2.5 py-1 rounded">Seleccionar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNomenclaturaOption('custom');
                      setNomenclaturaCursos(customNomenclaturaInput || '');
                      setErrorMsg('');
                    }}
                    className={`flex items-center justify-between w-full p-4 rounded-xl border text-left font-semibold transition-all ${
                      nomenclaturaOption === 'custom'
                        ? 'bg-primary/15 border-primary text-foreground shadow-xs'
                        : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <div>
                      <span className="block text-sm">Personalizada</span>
                      <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">Escribe la nomenclatura base para tus secciones</span>
                    </div>
                    <span className="text-[10px] font-bold bg-primary/20 text-primary px-2.5 py-1 rounded">Seleccionar</span>
                  </button>

                  {nomenclaturaOption === 'custom' && (
                    <div className="space-y-1.5 pt-2 animate-in fade-in duration-200">
                      <label htmlFor="custom-nomenclatura" className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Escribe la Nomenclatura Base</label>
                      <input
                        id="custom-nomenclatura"
                        type="text"
                        value={customNomenclaturaInput}
                        onChange={(e) => {
                          setCustomNomenclaturaInput(e.target.value);
                          setNomenclaturaCursos(e.target.value);
                          setErrorMsg('');
                        }}
                        placeholder="Ej: 6-1, Sexto A, Grado 6 Sec 1..."
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3 to cantPeriodosInt + 2: Specific Period dates */}
            {currentStep >= 3 && currentStep <= cantPeriodosInt + 2 && (() => {
              const idx = currentStep - 3;
              const p = periodos[idx];
              return (
                <div className="space-y-5">
                  <div>
                    <span className="text-[10px] font-bold bg-primary/20 text-primary px-2.5 py-1 rounded">Calendario Escolar</span>
                    <h2 className="text-xl font-bold text-foreground tracking-tight mt-3">Fecha del Periodo {p.numero_periodo}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Define los límites de fecha para el inicio y fin de las clases del Periodo {p.numero_periodo}.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label htmlFor={`start-date-p${p.numero_periodo}`} className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fecha de Inicio</label>
                      <input
                        id={`start-date-p${p.numero_periodo}`}
                        type="date"
                        value={p.fecha_inicio}
                        onChange={(e) => handlePeriodDateChange(idx, 'fecha_inicio', e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`end-date-p${p.numero_periodo}`} className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fecha de Cierre</label>
                      <input
                        id={`end-date-p${p.numero_periodo}`}
                        type="date"
                        value={p.fecha_fin}
                        onChange={(e) => handlePeriodDateChange(idx, 'fecha_fin', e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* STEP cantPeriodosInt + 3: Active Period choice */}
            {currentStep === cantPeriodosInt + 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">¿Cuál es el periodo activo actual?</h2>
                  <p className="text-xs text-muted-foreground mt-1">
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
                          ? 'bg-primary/15 border-primary text-primary shadow-xs'
                          : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      Periodo {p.numero_periodo}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP cantPeriodosInt + 4: Escala de valoración */}
            {currentStep === cantPeriodosInt + 4 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Escala de Valoración</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Homologa las notas numéricas (0.0 a 5.0) con los desempeños nacionales obligatorios del Decreto 1290.
                  </p>
                </div>
                <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {escalas.map((e, idx) => (
                    <div key={e.nombre_desempeno} className="bg-background border border-border rounded-xl p-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          e.nombre_desempeno === 'SUPERIOR' ? 'bg-emerald-500' :
                          e.nombre_desempeno === 'ALTO' ? 'bg-indigo-500' :
                          e.nombre_desempeno === 'BASICO' ? 'bg-cyan-500' : 'bg-red-500'
                        }`} />
                        <span className="text-xs font-bold text-foreground">{e.nombre_desempeno}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase font-medium">Min</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={e.nota_minima}
                            onChange={(e) => handleEscalaChange(idx, 'nota_minima', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-card border border-border rounded-lg py-1 text-center text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground uppercase font-medium">Max</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            value={e.nota_maxima}
                            onChange={(e) => handleEscalaChange(idx, 'nota_maxima', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-card border border-border rounded-lg py-1 text-center text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Banco de Logros (Opcional)</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Redacta un logro académico inicial para tu banco de evidencias. Puedes omitir o saltar este paso si lo deseas.
                  </p>
                </div>

                <div className="bg-background border border-border rounded-xl p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="assignment-select" className="block text-[9px] text-muted-foreground uppercase mb-1 font-medium">Materia & Curso</label>
                      <select
                        id="assignment-select"
                        value={selectedAsignacion}
                        onChange={(e) => setSelectedAsignacion(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                      <label htmlFor="period-logro-select" className="block text-[9px] text-muted-foreground uppercase mb-1 font-medium">Periodo</label>
                      <select
                        id="period-logro-select"
                        value={selectedPeriodoLogro}
                        onChange={(e) => setSelectedPeriodoLogro(parseInt(e.target.value, 10))}
                        className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                    <label htmlFor="logro-desc" className="block text-[9px] text-muted-foreground uppercase mb-1 font-medium">Descripción del Logro</label>
                    <textarea
                      id="logro-desc"
                      rows={2}
                      value={logroText}
                      onChange={(e) => setLogroText(e.target.value)}
                      placeholder="Ej: Formula y resuelve problemas usando la lógica de conjuntos."
                      className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLogro}
                    className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold transition-colors"
                  >
                    + Agregar Logro
                  </button>
                </div>

                {logros.length > 0 && (
                  <div className="space-y-1.5 max-h-[90px] overflow-y-auto pr-1 custom-scrollbar">
                    {logros.map((l, idx) => {
                      const assign = assignments.find(a => a.id_asignacion === l.id_asignacion);
                      return (
                        <div key={idx} className="bg-background border border-border rounded-lg px-3 py-1.5 flex items-center justify-between gap-3 text-[11px]">
                          <span className="text-foreground truncate">
                            <strong className="text-primary mr-1.5">P{l.numero_periodo} · {assign?.materia}:</strong>
                            {l.descripcion}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLogro(idx)}
                            className="text-red-500 hover:text-red-600 font-semibold px-1"
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
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
            
            {/* Left Back Button */}
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1 || loading}
              className="px-4 py-2 rounded-xl bg-secondary border border-border hover:bg-secondary/80 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              Atrás
            </button>

            {/* Middle Cancel/Skip Button */}
            {isEditing ? (
              <button
                type="button"
                onClick={() => { if (onDismiss) onDismiss(); }}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
              >
                Cancelar
              </button>
            ) : onDismiss ? (
              <button
                type="button"
                onClick={() => setShowConfirmSkip(true)}
                disabled={loading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
              >
                Omitir configuración
              </button>
            ) : null}

            {/* Right Next/Finish Button */}
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-all shadow-md cursor-pointer"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
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
