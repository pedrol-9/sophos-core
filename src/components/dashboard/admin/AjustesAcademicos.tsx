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

import { EvidenciasManager } from '@/components/dashboard/admin/EvidenciasManager';

interface AjustesAcademicosProps {
  idInstitucion?: string;
  onConfigSaved?: () => void;
  onOpenBulkImport?: () => void;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const DESEMPENO_COLORS: Record<string, string> = {
  SUPERIOR: 'bg-emerald-500',
  ALTO: 'bg-indigo-500',
  BASICO: 'bg-cyan-500',
  BAJO: 'bg-red-500',
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
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
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
    <div className="mt-4 flex items-center justify-between gap-3 pt-4 border-t border-border animate-in fade-in duration-200">
      <div className="text-xs">
        {error   && <span className="text-rose-500 font-medium">{error}</span>}
        {success && !error && <span className="text-teal-500 font-medium font-semibold">✓ Guardado correctamente</span>}
        {isDirty && !error && !success && <span className="text-muted-foreground">Hay cambios sin guardar</span>}
      </div>
      {isDirty && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 disabled:opacity-50 text-foreground font-semibold text-xs rounded-xl transition-all cursor-pointer shrink-0"
          >
            Descartar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function AjustesAcademicos({ onConfigSaved, onOpenBulkImport }: AjustesAcademicosProps) {
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
          <div key={i} className="h-40 bg-card rounded-2xl border border-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">

      {/* Video tutorial button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowVideo(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-medium transition-all"
        >
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ver videotutorial
        </button>
      </div>

      {/* ── FILA 1: Periodos Académicos & Escala de Valoración (2 Columnas en PC) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* SECCIÓN 1: Periodos */}
        <SectionCard
          title="Periodos Académicos"
          description="Define la estructura temporal del año lectivo. Cada periodo tiene su rango de fechas y uno debe estar activo."
        >
          {/* Selector de cantidad */}
          <div className="flex items-center gap-3 mb-5">
            <p className="text-xs text-muted-foreground shrink-0 font-medium">Número de periodos:</p>
            {([3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCantPeriodos(n)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  periodos.length === n
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {n} periodos
              </button>
            ))}
          </div>

          {/* Filas de periodos */}
          <div className="space-y-3">
            {periodos.map((p, idx) => (
              <div
                key={p.numero_periodo}
                onClick={() => {
                  if (!p.activo) updatePeriodo(idx, 'activo', true);
                }}
                className={`relative grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] items-center gap-4 border rounded-xl px-4 py-3 transition-all ${
                  p.activo
                    ? 'bg-primary/5 border-primary/40 shadow-xs'
                    : 'bg-background border-border hover:border-muted-foreground/30 cursor-pointer'
                }`}
              >
                {/* Badge "Activo" en la esquina superior derecha */}
                {p.activo && (
                  <span className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs tracking-wide">
                    Activo
                  </span>
                )}

                <div className="flex items-center gap-2.5 w-20">
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 transition-all ${
                      p.activo
                        ? 'bg-primary ring-4 ring-primary/20'
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/60'
                    }`}
                  />
                  <span className={`text-xs font-extrabold ${p.activo ? 'text-primary' : 'text-foreground'}`}>
                    P{p.numero_periodo}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Inicio</label>
                  <input
                    type="date"
                    value={p.fecha_inicio}
                    onChange={(e) => updatePeriodo(idx, 'fecha_inicio', e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Fin</label>
                  <input
                    type="date"
                    value={p.fecha_fin}
                    onChange={(e) => updatePeriodo(idx, 'fecha_fin', e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                  />
                </div>
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

        {/* SECCIÓN 2: Escala de Valoración */}
        <SectionCard
          title="Escala de Valoración"
          description="Homologa las notas numéricas (0.0 – 5.0) con los niveles de desempeño del Decreto 1290."
        >
          <div className="space-y-2.5">
            {escalas.map((e, idx) => (
              <div key={e.nombre_desempeno} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr] items-center gap-4 bg-background border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 w-24">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${DESEMPENO_COLORS[e.nombre_desempeno]}`} />
                  <span className="text-xs font-bold text-foreground">{e.nombre_desempeno}</span>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Nota mínima</label>
                  <input
                    type="number"
                    step="0.1" min="0" max="5"
                    value={e.nota_minima}
                    onChange={(ev) => updateEscala(idx, 'nota_minima', parseFloat(ev.target.value) || 0)}
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Nota máxima</label>
                  <input
                    type="number"
                    step="0.1" min="0" max="5"
                    value={e.nota_maxima}
                    onChange={(ev) => updateEscala(idx, 'nota_maxima', parseFloat(ev.target.value) || 0)}
                    className="w-full bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
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
      </div>

      {/* ── FILA 2: BANCO DE EVIDENCIAS (Ancho completo) ─────────────────────── */}
      <SectionCard
        title="Gestión Evidencias de Aprendizaje"
        description="Catálogo máster de evidencias por grado y materia. Revisa solicitudes de docentes y consulta la selección por periodo."
      >
        <EvidenciasManager />
      </SectionCard>

      {/* ── FILA 3: Nomenclatura de Cursos & Carga Masiva (2 Columnas en PC) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* SECCIÓN 3: Nomenclatura de Cursos */}
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
                    ? 'bg-primary/15 border-primary text-foreground font-semibold'
                    : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <div>
                  <span className="block text-sm font-semibold">
                    {opt === '6A' ? 'Alfanumérica (Ej: 6A, 6B)' : 'Numérica Completa (Ej: 601, 602)'}
                  </span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    {opt === '6A' ? 'Grado número + sección letra' : 'Grado número + sección numérica'}
                  </span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${nomenclaturaOption === opt ? 'border-primary bg-primary' : 'border-border'}`} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleNomOption('custom')}
              className={`flex items-center justify-between w-full p-3.5 rounded-xl border text-left transition-all ${
                nomenclaturaOption === 'custom'
                  ? 'bg-primary/15 border-primary text-foreground font-semibold'
                  : 'bg-background border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <div>
                <span className="block text-sm font-semibold">Personalizada</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">Escribe tu propia nomenclatura base</span>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${nomenclaturaOption === 'custom' ? 'border-primary bg-primary' : 'border-border'}`} />
            </button>

            {nomenclaturaOption === 'custom' && (
              <input
                type="text"
                value={customNom}
                onChange={(e) => { setCustomNom(e.target.value); setNomenclatura(e.target.value); setNomSuccess(false); setNomError(''); }}
                placeholder="Ej: 6-1, Sexto A, Grado 6 Sec 1..."
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors animate-in fade-in"
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

        {/* SECCIÓN 4: CARGA MASIVA DE USUARIOS Y DATOS */}
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
      </div>

      {/* ── MODAL: Video Tutorial ──────────────────────────────────────────── */}
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
                <span className="text-xs font-bold text-amber-600 dark:text-amber-300 uppercase tracking-wider">En construcción</span>
              </div>
              <p className="text-xs text-muted-foreground">El tutorial estará disponible próximamente</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
