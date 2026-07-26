'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getOnboardingConfig,
  savePeriodosConfig,
  saveEscalaConfig,
  saveNomenclaturaConfig,
  PeriodoParam,
  EscalaParam,
} from '@/app/actions/config-actions';

export const DEFAULT_PERIODOS_4: PeriodoParam[] = [
  { numero_periodo: 1, fecha_inicio: '', fecha_fin: '', activo: true },
  { numero_periodo: 2, fecha_inicio: '', fecha_fin: '', activo: false },
  { numero_periodo: 3, fecha_inicio: '', fecha_fin: '', activo: false },
  { numero_periodo: 4, fecha_inicio: '', fecha_fin: '', activo: false },
];

export const DEFAULT_ESCALAS: EscalaParam[] = [
  { nombre_desempeno: 'BAJO', nota_minima: 0.0, nota_maxima: 2.9 },
  { nombre_desempeno: 'BASICO', nota_minima: 3.0, nota_maxima: 3.9 },
  { nombre_desempeno: 'ALTO', nota_minima: 4.0, nota_maxima: 4.5 },
  { nombre_desempeno: 'SUPERIOR', nota_minima: 4.6, nota_maxima: 5.0 },
];

function deepEqual<T>(a: T, b: T) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useAjustesAcademicos(onConfigSaved?: () => void) {
  const [loading, setLoading] = useState(true);

  // Periodos
  const [periodos, setPeriodos] = useState<PeriodoParam[]>(DEFAULT_PERIODOS_4);
  const [periodosSaved, setPeriodosSaved] = useState<PeriodoParam[]>(DEFAULT_PERIODOS_4);
  const [savingPeriodos, setSavingPeriodos] = useState(false);
  const [periodoSuccess, setPeriodoSuccess] = useState(false);
  const [periodoError, setPeriodoError] = useState('');

  // Escala
  const [escalas, setEscalas] = useState<EscalaParam[]>(DEFAULT_ESCALAS);
  const [escalasSaved, setEscalasSaved] = useState<EscalaParam[]>(DEFAULT_ESCALAS);
  const [savingEscala, setSavingEscala] = useState(false);
  const [escalaSuccess, setEscalaSuccess] = useState(false);
  const [escalaError, setEscalaError] = useState('');

  // Nomenclatura
  const [nomenclatura, setNomenclatura] = useState('6A');
  const [nomenclaturaOption, setNomenclaturaOption] = useState<'6A' | '601' | 'custom'>('6A');
  const [customNom, setCustomNom] = useState('');
  const [nomenclaturaSaved, setNomenclaturaSaved] = useState('6A');
  const [savingNom, setSavingNom] = useState(false);
  const [nomSuccess, setNomSuccess] = useState(false);
  const [nomError, setNomError] = useState('');

  // Cargar datos
  const loadConfig = useCallback(async () => {
    setLoading(true);
    const res = await getOnboardingConfig();
    if (res.success && res.data) {
      const { periodos: p, escalas: e, nomenclaturaCursos: n } = res.data;
      if (p.length) {
        setPeriodos(p);
        setPeriodosSaved(p);
      }
      if (e.length) {
        setEscalas(e);
        setEscalasSaved(e);
      }
      setNomenclaturaSaved(n);
      setNomenclatura(n);
      const opt = n === '6A' ? '6A' : n === '601' ? '601' : 'custom';
      setNomenclaturaOption(opt);
      if (opt === 'custom') setCustomNom(n);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Flags dirty
  const periodosDirty = !deepEqual(periodos, periodosSaved);
  const escalaDirty = !deepEqual(escalas, escalasSaved);
  const nomDirty = nomenclatura !== nomenclaturaSaved;

  // Helpers Periodos
  const setCantPeriodos = (n: 3 | 4) => {
    const nums = n === 3 ? [1, 2, 3] : [1, 2, 3, 4];
    const updated = nums.map((i) => {
      const existing = periodos.find((p) => p.numero_periodo === i);
      return existing ?? { numero_periodo: i, fecha_inicio: '', fecha_fin: '', activo: false };
    });
    if (!updated.some((p) => p.activo)) updated[0].activo = true;
    setPeriodos(updated);
    setPeriodoError('');
    setPeriodoSuccess(false);
  };

  const updatePeriodo = (idx: number, field: keyof PeriodoParam, value: string | boolean) => {
    const updated = periodos.map((p, i) => {
      if (i !== idx) return field === 'activo' ? { ...p, activo: false } : p;
      return { ...p, [field]: value };
    });
    if (field === 'activo') updated[idx].activo = true;
    setPeriodos(updated);
    setPeriodoSuccess(false);
    setPeriodoError('');
  };

  const validatePeriodos = () => {
    for (let i = 0; i < periodos.length; i++) {
      const p = periodos[i];
      if (!p.fecha_inicio || !p.fecha_fin)
        return `Periodo ${p.numero_periodo}: ambas fechas son obligatorias.`;
      if (new Date(p.fecha_inicio) >= new Date(p.fecha_fin))
        return `Periodo ${p.numero_periodo}: la fecha de inicio debe ser anterior a la de fin.`;
      if (i > 0 && new Date(p.fecha_inicio) <= new Date(periodos[i - 1].fecha_fin))
        return `Periodo ${p.numero_periodo}: debe iniciar después del cierre del Periodo ${
          periodos[i - 1].numero_periodo
        }.`;
    }
    if (!periodos.some((p) => p.activo)) return 'Debes seleccionar un periodo activo.';
    return '';
  };

  const handleSavePeriodos = async () => {
    const err = validatePeriodos();
    if (err) {
      setPeriodoError(err);
      return;
    }
    setSavingPeriodos(true);
    const res = await savePeriodosConfig(periodos);
    setSavingPeriodos(false);
    if (res.success) {
      setPeriodosSaved(periodos);
      setPeriodoSuccess(true);
      onConfigSaved?.();
      setTimeout(() => setPeriodoSuccess(false), 3000);
    } else {
      setPeriodoError(res.error || 'Error al guardar.');
    }
  };

  const handleCancelPeriodos = () => {
    setPeriodos(periodosSaved);
    setPeriodoError('');
    setPeriodoSuccess(false);
  };

  // Helpers Escala
  const updateEscala = (idx: number, field: 'nota_minima' | 'nota_maxima', val: number) => {
    const updated = [...escalas];
    updated[idx] = { ...updated[idx], [field]: val };
    setEscalas(updated);
    setEscalaSuccess(false);
    setEscalaError('');
  };

  const validateEscala = () => {
    for (let i = 0; i < escalas.length; i++) {
      const e = escalas[i];
      if (e.nota_minima > e.nota_maxima)
        return `${e.nombre_desempeno}: la nota mínima no puede superar la máxima.`;
      if (i > 0 && e.nota_minima < escalas[i - 1].nota_maxima)
        return `${e.nombre_desempeno}: el rango se solapa con ${escalas[i - 1].nombre_desempeno}.`;
    }
    if (escalas[0].nota_minima !== 0) return 'BAJO debe iniciar en 0.0.';
    if (escalas[escalas.length - 1].nota_maxima !== 5) return 'SUPERIOR debe terminar en 5.0.';
    return '';
  };

  const handleSaveEscala = async () => {
    const err = validateEscala();
    if (err) {
      setEscalaError(err);
      return;
    }
    setSavingEscala(true);
    const res = await saveEscalaConfig(escalas);
    setSavingEscala(false);
    if (res.success) {
      setEscalasSaved(escalas);
      setEscalaSuccess(true);
      onConfigSaved?.();
      setTimeout(() => setEscalaSuccess(false), 3000);
    } else {
      setEscalaError(res.error || 'Error al guardar.');
    }
  };

  const handleCancelEscala = () => {
    setEscalas(escalasSaved);
    setEscalaError('');
    setEscalaSuccess(false);
  };

  // Helpers Nomenclatura
  const handleNomOption = (opt: '6A' | '601' | 'custom') => {
    setNomenclaturaOption(opt);
    if (opt !== 'custom') setNomenclatura(opt);
    else setNomenclatura(customNom);
    setNomSuccess(false);
    setNomError('');
  };

  const handleCustomNomChange = (val: string) => {
    setCustomNom(val);
    setNomenclatura(val);
    setNomSuccess(false);
    setNomError('');
  };

  const handleSaveNom = async () => {
    if (!nomenclatura.trim()) {
      setNomError('La nomenclatura no puede estar vacía.');
      return;
    }
    setSavingNom(true);
    const res = await saveNomenclaturaConfig(nomenclatura.trim());
    setSavingNom(false);
    if (res.success) {
      setNomenclaturaSaved(nomenclatura.trim());
      setNomSuccess(true);
      onConfigSaved?.();
      setTimeout(() => setNomSuccess(false), 3000);
    } else {
      setNomError(res.error || 'Error al guardar.');
    }
  };

  const handleCancelNom = () => {
    const opt =
      nomenclaturaSaved === '6A'
        ? '6A'
        : nomenclaturaSaved === '601'
        ? '601'
        : 'custom';
    setNomenclaturaOption(opt);
    setNomenclatura(nomenclaturaSaved);
    if (opt === 'custom') setCustomNom(nomenclaturaSaved);
    setNomError('');
    setNomSuccess(false);
  };

  return {
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
    // Escalas
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
  };
}
