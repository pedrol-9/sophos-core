'use client';

import { User } from '@supabase/supabase-js';
import { type AcademicAssignment } from '@/app/actions/teacher-actions';

function extractGrado(nombreCurso: string): string {
  if (!nombreCurso) return '';
  const match = nombreCurso.match(/(\d+)/);
  return match ? match[1] : nombreCurso;
}

interface DocenteHeaderProps {
  user: User | null;
  selectedAssignment: AcademicAssignment | null;
  assignments: AcademicAssignment[];
  selectedMateriaName: string;
  selectedGradoNum: string;
  selectedCursoId: string;
  activeTab: string;
  onSelectMateria: (materia: string) => void;
  onSelectGrado: (grado: string) => void;
  onSelectCurso: (idAsignacion: string) => void;
  onOpenMobileMenu: () => void;
}

export function DocenteHeader({
  user,
  selectedAssignment,
  assignments,
  selectedMateriaName,
  selectedGradoNum,
  selectedCursoId,
  onSelectMateria,
  onSelectGrado,
  onSelectCurso,
  onOpenMobileMenu,
}: DocenteHeaderProps) {
  const materias = Array.from(
    new Set(assignments.map((a) => a.materias?.nombre).filter((s): s is string => Boolean(s)))
  );

  const grados = Array.from(
    new Set(
      assignments
        .filter((a) => !selectedMateriaName || a.materias?.nombre === selectedMateriaName)
        .map((a) => extractGrado(a.cursos?.nombre || ''))
        .filter((g): g is string => Boolean(g))
    )
  ).sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));

  const cursosDisponibles = assignments
    .filter((a) => {
      const matchSub = !selectedMateriaName || a.materias?.nombre === selectedMateriaName;
      const matchGr = !selectedGradoNum || extractGrado(a.cursos?.nombre || '') === selectedGradoNum;
      return matchSub && matchGr;
    })
    .sort((a, b) => (a.cursos?.nombre || '').localeCompare(b.cursos?.nombre || '', undefined, { numeric: true }));

  return (
    <header className="px-4 py-3 border-b border-border sticky top-0 bg-background/85 backdrop-blur-md z-20 shadow-2xs">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 text-center lg:text-left relative">
        {/* Botón Menú Hamburguesa en Móvil */}
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground md:hidden shrink-0 cursor-pointer absolute left-0 top-0"
          title="Abrir menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Título & Badges */}
        <div className="flex flex-col items-center lg:items-start justify-center lg:justify-start gap-1 min-w-0 w-full lg:w-auto">
          <div className="flex items-center justify-center lg:justify-start gap-2">
            <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
              Portal Docente
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">|</span>
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              {user?.user_metadata?.nombre_completo || 'Docente'}
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight truncate mt-0.5 text-center lg:text-left">
            {selectedAssignment
              ? `Gestionar: ${selectedAssignment.cursos?.nombre} (${selectedAssignment.materias?.nombre})`
              : 'Gestión Académica Docente'}
          </h1>
        </div>

        {/* Selector Bar Estilo Admin */}
        <div className="flex flex-wrap gap-2.5 sm:gap-4 items-center lg:items-end justify-center lg:justify-start w-full lg:w-auto">
          {/* Materia */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Materia</label>
            <select
              value={selectedMateriaName}
              onChange={(e) => onSelectMateria(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-[140px] sm:min-w-[170px] cursor-pointer text-center lg:text-left"
            >
              {materias.length > 1 && (
                <option value="" className="bg-card text-foreground">
                  -
                </option>
              )}
              {materias.map((subject) => (
                <option key={subject} value={subject} className="bg-card text-foreground">
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Grado */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Grado</label>
            <select
              value={selectedGradoNum}
              onChange={(e) => onSelectGrado(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-[80px] cursor-pointer text-center lg:text-left"
            >
              <option value="" className="bg-card text-foreground">
                -
              </option>
              {grados.map((grade) => (
                <option key={grade} value={grade} className="bg-card text-foreground">
                  {grade}°
                </option>
              ))}
            </select>
          </div>

          {/* Curso */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Curso</label>
            <select
              value={selectedCursoId}
              onChange={(e) => onSelectCurso(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-[120px] cursor-pointer text-center lg:text-left"
            >
              <option value="" className="bg-card text-foreground">
                -
              </option>
              {cursosDisponibles.map((a) => (
                <option key={a.id_asignacion} value={a.id_asignacion} className="bg-card text-foreground">
                  {a.cursos?.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
