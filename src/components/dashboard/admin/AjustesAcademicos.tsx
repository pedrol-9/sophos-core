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

interface AjustesAcademicosProps {
  idInstitucion: string;
  onConfigSaved?: () => void;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const DESEMPENOS = ['BAJO', 'BASICO', 'ALTO', 'SUPERIOR'] as const;
const DESEMPENO_COLORS: Record<string, string> = {
  SUPERIOR: 'bg-emerald-400',
  ALTO: 'bg-indigo-400',
  BASICO: 'bg-cyan-400',
  BAJO: 'bg-red-400',
};
const DEFAULT_PERIODOS_4: PeriodoParam[] = [
  { numero_periodo: 1, fecha_inicio: '', fecha_fin: '', activo: true },
  { numero_periodo: 2, fecha_inicio: '', fecha_fin: '', activo: false },
  { numero_periodo: 3, fecha_inicio: '', fecha_fin: '', activo: false },
  { numero_periodo: 4, fecha_inicio: '', fecha_fin: '', activo: false },
];
const DEFAULT_ESCALAS: EscalaParam[] = [
  { nombre_desempeno: 'BAJO',     nota_minima: 0.0, nota_maxima: 2.9 },
  { nombre_desempeno: 'BASICO',   nota_minima: 3.0, nota_maxima: 3.9 },
  { nombre_desempeno: 'ALTO',     nota_minima: 4.0, nota_maxima: 4.5 },
  { nombre_desempeno: 'SUPERIOR', nota_minima: 4.6, nota_maxima: 5.0 },
];

function deepEqual<T>(a: T, b: T) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0c1220]/75 border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/8">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-xs text-white/45 mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function SaveBar({
  isDirty,
  saving,
  success,
  error,
  onSave,
  onCancel,
}: {
  isDirty: boolean;
  saving: boolean;
  success: boolean;
  error: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!isDirty && !success && !error) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 pt-4 border-t border-white/8 animate-in fade-in duration-200">
      <div className="text-xs">
        {error   && <span className="text-red-400 font-medium">{error}</span>}
        {success && !error && <span className="text-teal-400 font-medium">✓ Guardado correctamente</span>}
        {isDirty && !error && !success && <span className="text-white/40">Hay cambios sin guardar</span>}
      </div>
      {isDirty && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 text-white/60 hover:text-white font-semibold text-xs rounded-xl transition-all cursor-pointer shrink-0"
          >
            Descartar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function AjustesAcademicos({ idInstitucion, onConfigSaved }: AjustesAcademicosProps) {
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);

  // ── Periodos ──────────────────────────────────────────────────────────────
  const [periodos, setPeriodos]       = useState<PeriodoParam[]>(DEFAULT_PERIODOS_4);
  const [periodosSaved, setPeriodosSaved] = useState<PeriodoParam[]>(DEFAULT_PERIODOS_4);
  const [savingPeriodos, setSavingPeriodos] = useState(false);
  const [periodoSuccess, setPeriodoSuccess] = useState(false);
  const [periodoError, setPeriodoError]     = useState('');

  // ── Escala ────────────────────────────────────────────────────────────────
  const [escalas, setEscalas]         = useState<EscalaParam[]>(DEFAULT_ESCALAS);
  const [escalasSaved, setEscalasSaved] = useState<EscalaParam[]>(DEFAULT_ESCALAS);
  const [savingEscala, setSavingEscala] = useState(false);
  const [escalaSuccess, setEscalaSuccess] = useState(false);
  const [escalaError, setEscalaError]     = useState('');

  // ── Nomenclatura ──────────────────────────────────────────────────────────
  const [nomenclatura, setNomenclatura]           = useState('6A');
  const [nomenclaturaOption, setNomenclaturaOption] = useState<'6A' | '601' | 'custom'>('6A');
  const [customNom, setCustomNom]                   = useState('');
  const [nomenclaturaSaved, setNomenclaturaSaved]   = useState('6A');
  const [savingNom, setSavingNom]   = useState(false);
  const [nomSuccess, setNomSuccess] = useState(false);
  const [nomError, setNomError]     = useState('');

  // ── Load from DB ──────────────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    setLoading(true);
    const res = await getOnboardingConfig();
    if (res.success && res.data) {
      const { periodos: p, escalas: e, nomenclaturaCursos: n } = res.data;
      if (p.length) { setPeriodos(p); setPeriodosSaved(p); }
      if (e.length) { setEscalas(e); setEscalasSaved(e); }
      setNomenclaturaSaved(n);
      setNomenclatura(n);
      const opt = n === '6A' ? '6A' : n === '601' ? '601' : 'custom';
      setNomenclaturaOption(opt);
      if (opt === 'custom') setCustomNom(n);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // ── Derived dirty flags ────────────────────────────────────────────────────
  const periodosDirty    = !deepEqual(periodos, periodosSaved);
  const escalaDirty      = !deepEqual(escalas, escalasSaved);
  const nomDirty         = nomenclatura !== nomenclaturaSaved;

  // ── Periodo helpers ────────────────────────────────────────────────────────
  const setCantPeriodos = (n: 3 | 4) => {
    const nums = n === 3 ? [1, 2, 3] : [1, 2, 3, 4];
    // Preservar datos existentes; solo crear nueva entrada si el periodo no existía
    const updated = nums.map((i) => {
      const existing = periodos.find((p) => p.numero_periodo === i);
      return existing ?? { numero_periodo: i, fecha_inicio: '', fecha_fin: '', activo: false };
    });
    // Garantizar que sigue habiendo un periodo activo
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
      if (!p.fecha_inicio || !p.fecha_fin) return `Periodo ${p.numero_periodo}: ambas fechas son obligatorias.`;
      if (new Date(p.fecha_inicio) >= new Date(p.fecha_fin))
        return `Periodo ${p.numero_periodo}: la fecha de inicio debe ser anterior a la de fin.`;
      if (i > 0 && new Date(p.fecha_inicio) <= new Date(periodos[i - 1].fecha_fin))
        return `Periodo ${p.numero_periodo}: debe iniciar después del cierre del Periodo ${p.numero_periodo - 1}.`;
    }
    if (!periodos.some((p) => p.activo)) return 'Debes seleccionar un periodo activo.';
    return '';
  };

  const handleSavePeriodos = async () => {
    const err = validatePeriodos();
    if (err) { setPeriodoError(err); return; }
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

  // ── Escala helpers ─────────────────────────────────────────────────────────
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
      if (e.nota_minima > e.nota_maxima) return `${e.nombre_desempeno}: la nota mínima no puede superar la máxima.`;
      if (i > 0 && e.nota_minima < escalas[i - 1].nota_maxima)
        return `${e.nombre_desempeno}: el rango se solapa con ${escalas[i - 1].nombre_desempeno}.`;
    }
    if (escalas[0].nota_minima !== 0) return 'BAJO debe iniciar en 0.0.';
    if (escalas[escalas.length - 1].nota_maxima !== 5) return 'SUPERIOR debe terminar en 5.0.';
    return '';
  };

  const handleSaveEscala = async () => {
    const err = validateEscala();
    if (err) { setEscalaError(err); return; }
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

  // ── Nomenclatura helpers ───────────────────────────────────────────────────
  const handleNomOption = (opt: '6A' | '601' | 'custom') => {
    setNomenclaturaOption(opt);
    if (opt !== 'custom') setNomenclatura(opt);
    else setNomenclatura(customNom);
    setNomSuccess(false);
    setNomError('');
  };

  const handleSaveNom = async () => {
    if (!nomenclatura.trim()) { setNomError('La nomenclatura no puede estar vacía.'); return; }
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

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1,2,3].map((i) => (
          <div key={i} className="h-40 bg-white/5 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl animate-in fade-in duration-300">

      {/* Video tutorial button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowVideo(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 text-white/60 hover:text-white text-xs font-medium transition-all"
        >
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ver videotutorial
        </button>
      </div>

      {/* ── SECCIÓN 1: Periodos ────────────────────────────────────────────── */}
      <SectionCard
        title="Periodos Académicos"
        description="Define la estructura temporal del año lectivo. Cada periodo tiene su rango de fechas y uno debe estar activo."
      >
        {/* Selector de cantidad */}
        <div className="flex items-center gap-3 mb-5">
          <p className="text-xs text-white/50 shrink-0">Número de periodos:</p>
          {([3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCantPeriodos(n)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodos.length === n
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              {n} periodos
            </button>
          ))}
        </div>

        {/* Filas de periodos */}
        <div className="space-y-3">
          {periodos.map((p, idx) => (
            <div key={p.numero_periodo} className="grid grid-cols-[auto_1fr_1fr_auto] items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 w-20">
                <span className={`w-2 h-2 rounded-full shrink-0 ${p.activo ? 'bg-indigo-400' : 'bg-white/20'}`} />
                <span className="text-xs font-bold text-white/70">P{p.numero_periodo}</span>
              </div>
              <div>
                <label className="block text-[10px] text-white/35 uppercase tracking-wider mb-1">Inicio</label>
                <input
                  type="date"
                  value={p.fecha_inicio}
                  onChange={(e) => updatePeriodo(idx, 'fecha_inicio', e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/35 uppercase tracking-wider mb-1">Fin</label>
                <input
                  type="date"
                  value={p.fecha_fin}
                  onChange={(e) => updatePeriodo(idx, 'fecha_fin', e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => updatePeriodo(idx, 'activo', true)}
                title="Marcar como activo"
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                  p.activo
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-white/5 text-white/30 border border-white/10 hover:text-white/60'
                }`}
              >
                {p.activo ? 'Activo' : 'Activar'}
              </button>
            </div>
          ))}
        </div>

        <SaveBar
          isDirty={periodosDirty}
          saving={savingPeriodos}
          success={periodoSuccess}
          error={periodoError}
          onSave={handleSavePeriodos}
          onCancel={() => {
            setPeriodos(periodosSaved);
            setPeriodoError('');
            setPeriodoSuccess(false);
          }}
        />
      </SectionCard>

      {/* ── SECCIÓN 2: Escala de Valoración ───────────────────────────────── */}
      <SectionCard
        title="Escala de Valoración"
        description="Homologa las notas numéricas (0.0 – 5.0) con los niveles de desempeño del Decreto 1290."
      >
        <div className="space-y-2.5">
          {escalas.map((e, idx) => (
            <div key={e.nombre_desempeno} className="grid grid-cols-[auto_1fr_1fr] items-center gap-4 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 w-24">
                <span className={`w-2 h-2 rounded-full shrink-0 ${DESEMPENO_COLORS[e.nombre_desempeno]}`} />
                <span className="text-xs font-bold text-white/70">{e.nombre_desempeno}</span>
              </div>
              <div>
                <label className="block text-[10px] text-white/35 uppercase tracking-wider mb-1">Nota mínima</label>
                <input
                  type="number"
                  step="0.1" min="0" max="5"
                  value={e.nota_minima}
                  onChange={(ev) => updateEscala(idx, 'nota_minima', parseFloat(ev.target.value) || 0)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white text-center focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/35 uppercase tracking-wider mb-1">Nota máxima</label>
                <input
                  type="number"
                  step="0.1" min="0" max="5"
                  value={e.nota_maxima}
                  onChange={(ev) => updateEscala(idx, 'nota_maxima', parseFloat(ev.target.value) || 0)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white text-center focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          ))}
        </div>

        <SaveBar
          isDirty={escalaDirty}
          saving={savingEscala}
          success={escalaSuccess}
          error={escalaError}
          onSave={handleSaveEscala}
          onCancel={() => {
            setEscalas(escalasSaved);
            setEscalaError('');
            setEscalaSuccess(false);
          }}
        />
      </SectionCard>

      {/* ── SECCIÓN 3: Nomenclatura de Cursos ─────────────────────────────── */}
      <SectionCard
        title="Nomenclatura de Cursos"
        description="Define cómo se identificarán las secciones de cada grado (ej: 6A, 6B o 601, 602)."
      >
        <div className="space-y-2.5">
          {(['6A', '601'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => handleNomOption(opt)}
              className={`flex items-center justify-between w-full p-3.5 rounded-xl border text-left transition-all ${
                nomenclaturaOption === opt
                  ? 'bg-indigo-600/15 border-indigo-500 text-white'
                  : 'bg-white/3 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div>
                <span className="block text-sm font-semibold">
                  {opt === '6A' ? 'Alfanumérica (Ej: 6A, 6B)' : 'Numérica Completa (Ej: 601, 602)'}
                </span>
                <span className="block text-[10px] text-white/40 mt-0.5">
                  {opt === '6A' ? 'Grado número + sección letra' : 'Grado número + sección numérica'}
                </span>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${nomenclaturaOption === opt ? 'border-indigo-400 bg-indigo-400' : 'border-white/20'}`} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleNomOption('custom')}
            className={`flex items-center justify-between w-full p-3.5 rounded-xl border text-left transition-all ${
              nomenclaturaOption === 'custom'
                ? 'bg-indigo-600/15 border-indigo-500 text-white'
                : 'bg-white/3 border-white/10 text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div>
              <span className="block text-sm font-semibold">Personalizada</span>
              <span className="block text-[10px] text-white/40 mt-0.5">Escribe tu propia nomenclatura base</span>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${nomenclaturaOption === 'custom' ? 'border-indigo-400 bg-indigo-400' : 'border-white/20'}`} />
          </button>

          {nomenclaturaOption === 'custom' && (
            <input
              type="text"
              value={customNom}
              onChange={(e) => { setCustomNom(e.target.value); setNomenclatura(e.target.value); setNomSuccess(false); setNomError(''); }}
              placeholder="Ej: 6-1, Sexto A, Grado 6 Sec 1..."
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 transition-colors animate-in fade-in"
            />
          )}
        </div>

        <SaveBar
          isDirty={nomDirty}
          saving={savingNom}
          success={nomSuccess}
          error={nomError}
          onSave={handleSaveNom}
          onCancel={() => {
            const opt = nomenclaturaSaved === '6A' ? '6A' : nomenclaturaSaved === '601' ? '601' : 'custom';
            setNomenclaturaOption(opt);
            setNomenclatura(nomenclaturaSaved);
            if (opt === 'custom') setCustomNom(nomenclaturaSaved);
            setNomError('');
            setNomSuccess(false);
          }}
        />
      </SectionCard>

      {/* ── MODAL: Video Tutorial ──────────────────────────────────────────── */}
      {showVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative w-full max-w-lg bg-[#0c1220] border border-white/10 rounded-2xl p-8 text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowVideo(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Videotutorial</h3>
              <p className="text-xs text-white/40 mt-1">Guía paso a paso para configurar tu año lectivo</p>
            </div>
            <div className="w-full aspect-video bg-white/3 border border-white/10 rounded-xl flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">En construcción</span>
              </div>
              <p className="text-xs text-white/30">El tutorial estará disponible próximamente</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
