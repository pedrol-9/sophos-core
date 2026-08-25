'use client';

import { useState, useEffect, useTransition } from 'react';
import { createClient } from '@/utils/supabase/client';
import { createCourse, createSubject } from '@/app/actions/admin-actions';
import { SectionCard } from './SectionCard';

interface CursosMateriasSectionProps {
  idInstitucion?: string;
  nomenclaturaOption?: '6A' | '601' | 'custom';
  customNom?: string;
  onUpdated?: () => void;
}

export function CursosMateriasSection({
  idInstitucion,
  nomenclaturaOption = '6A',
  customNom = '',
  onUpdated,
}: CursosMateriasSectionProps) {
  const supabase = createClient();
  const [activeSubTab, setActiveSubTab] = useState<'cursos' | 'materias'>('cursos');
  
  // Cursos State
  const [courses, setCourses] = useState<any[]>([]);
  const [courseName, setCourseName] = useState('');
  const [courseJornada, setCourseJornada] = useState('MAÑANA');
  const [isCoursePending, startCourseTransition] = useTransition();
  const [courseMsg, setCourseMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Materias State
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectName, setSubjectName] = useState('');
  const [subjectArea, setSubjectArea] = useState('');
  const [isSubjectPending, startSubjectTransition] = useTransition();
  const [subjectMsg, setSubjectMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const instId = idInstitucion || user?.app_metadata?.id_institucion;
      if (!instId) return;

      const [{ data: cData }, { data: sData }] = await Promise.all([
        supabase.from('cursos').select('*').eq('id_institucion', instId).order('nombre'),
        supabase.from('materias').select('*').eq('id_institucion', instId).order('nombre'),
      ]);

      setCourses(cData || []);
      setSubjects(sData || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [idInstitucion]);

  // Placeholder dinámico según nomenclatura
  const getCoursePlaceholder = () => {
    if (nomenclaturaOption === '601') return 'Ej: 601, 602, 1001...';
    if (nomenclaturaOption === 'custom') return customNom ? `Ej: ${customNom}...` : 'Ej: 6-1, 10-A...';
    return 'Ej: 6A, 7B, 10A, 11B...';
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;

    setCourseMsg(null);
    startCourseTransition(async () => {
      const res = await createCourse(courseName.trim(), courseJornada);
      if (res.success) {
        setCourseMsg({ type: 'success', text: `Curso "${courseName}" registrado correctamente.` });
        setCourseName('');
        await loadData();
        if (onUpdated) onUpdated();
        setTimeout(() => setCourseMsg(null), 3000);
      } else {
        setCourseMsg({ type: 'error', text: res.error || 'Error al crear el curso.' });
      }
    });
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim() || !subjectArea.trim()) return;

    setSubjectMsg(null);
    startSubjectTransition(async () => {
      const res = await createSubject(subjectName.trim(), subjectArea.trim());
      if (res.success) {
        setSubjectMsg({ type: 'success', text: `Materia "${subjectName}" registrada correctamente.` });
        setSubjectName('');
        setSubjectArea('');
        await loadData();
        if (onUpdated) onUpdated();
        setTimeout(() => setSubjectMsg(null), 3000);
      } else {
        setSubjectMsg({ type: 'error', text: res.error || 'Error al crear la materia.' });
      }
    });
  };

  return (
    <SectionCard
      title="Gestión de Cursos y Materias"
      description="Registra y administra los grupos académicos y asignaturas oficiales de tu institución según la nomenclatura configurada."
    >
      <div className="space-y-5">
        {/* Toggle de Sub-Pestañas */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('cursos')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'cursos'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              <span>Cursos ({courses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('materias')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'materias'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
              </svg>
              <span>Materias ({subjects.length})</span>
            </button>
          </div>

          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {activeSubTab === 'cursos'
              ? 'Nomenclatura activa: ' + (nomenclaturaOption === '6A' ? 'Alfanumérica (6A)' : nomenclaturaOption === '601' ? 'Numérica (601)' : 'Personalizada')
              : 'Asignaturas curriculares'}
          </span>
        </div>

        {/* ── SUB-PESTAÑA 1: CURSOS ── */}
        {activeSubTab === 'cursos' && (
          <div className="space-y-4">
            <form onSubmit={handleCreateCourse} className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 w-full space-y-1">
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Nombre del Curso / Sección
                  </label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder={getCoursePlaceholder()}
                    required
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono transition-colors"
                  />
                </div>

                <div className="w-full sm:w-44 space-y-1">
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Jornada
                  </label>
                  <select
                    value={courseJornada}
                    onChange={(e) => setCourseJornada(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="MAÑANA">Mañana</option>
                    <option value="TARDE">Tarde</option>
                    <option value="ÚNICA">Única</option>
                    <option value="COMPLETA">Completa</option>
                    <option value="NOCTURNA">Nocturna</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isCoursePending || !courseName.trim()}
                  className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                >
                  {isCoursePending && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Registrar Curso</span>
                </button>
              </div>

              {courseMsg && (
                <div
                  className={`p-2 rounded-lg text-xs font-semibold ${
                    courseMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  {courseMsg.text}
                </div>
              )}
            </form>

            {/* Listado de Cursos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Cursos registrados ({courses.length})</span>
              </div>

              {loading ? (
                <div className="h-16 bg-muted/20 rounded-xl animate-pulse" />
              ) : courses.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {courses.map((c) => (
                    <div
                      key={c.id_curso}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border hover:border-primary/40 text-xs font-semibold text-foreground shadow-2xs transition-all"
                    >
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      <span className="font-mono">{c.nombre}</span>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md font-normal">
                        {c.jornada || 'Mañana'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center rounded-xl bg-muted/10 border border-dashed border-border text-xs text-muted-foreground">
                  No hay cursos registrados. Escribe el nombre del primer curso arriba para agregarlo.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SUB-PESTAÑA 2: MATERIAS ── */}
        {activeSubTab === 'materias' && (
          <div className="space-y-4">
            <form onSubmit={handleCreateSubject} className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Nombre de la Materia
                  </label>
                  <input
                    type="text"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Ej: Matemáticas, Física, Lengua Castellana..."
                    required
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Área Académica
                  </label>
                  <input
                    type="text"
                    value={subjectArea}
                    onChange={(e) => setSubjectArea(e.target.value)}
                    placeholder="Ej: Ciencias Exactas, Humanidades, Artes..."
                    required
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubjectPending || !subjectName.trim() || !subjectArea.trim()}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubjectPending && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Registrar Materia</span>
                </button>
              </div>

              {subjectMsg && (
                <div
                  className={`p-2 rounded-lg text-xs font-semibold ${
                    subjectMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  }`}
                >
                  {subjectMsg.text}
                </div>
              )}
            </form>

            {/* Listado de Materias */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Materias registradas ({subjects.length})</span>
              </div>

              {loading ? (
                <div className="h-16 bg-muted/20 rounded-xl animate-pulse" />
              ) : subjects.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {subjects.map((s) => (
                    <div
                      key={s.id_materia}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border hover:border-primary/40 text-xs font-semibold text-foreground shadow-2xs transition-all"
                    >
                      <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                      <span>{s.nombre}</span>
                      <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md font-semibold">
                        {s.area}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center rounded-xl bg-muted/10 border border-dashed border-border text-xs text-muted-foreground">
                  No hay materias registradas. Escribe el nombre de la materia y área arriba para agregarla.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
