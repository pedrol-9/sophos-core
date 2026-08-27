'use client';

import { type CourseStudent } from '@/app/actions/academic/teacher-actions';
import { IconSparkles } from '@/components/icons';

interface TeacherGradeModalProps {
  selectedStudent: CourseStudent;
  onClose: () => void;
  gradingPeriod: number;
  onPeriodChange: (period: number) => void;
  gradeValue: string;
  setGradeValue: (val: string) => void;
  gradeComment: string;
  setGradeComment: (comment: string) => void;
  onSaveGrade: (e: React.FormEvent) => void;
  savingGrade: boolean;
  generatingAI: boolean;
}

export function TeacherGradeModal({
  selectedStudent,
  onClose,
  gradingPeriod,
  onPeriodChange,
  gradeValue,
  setGradeValue,
  gradeComment,
  setGradeComment,
  onSaveGrade,
  savingGrade,
  generatingAI,
}: TeacherGradeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md h-full bg-card border-l border-border p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 text-foreground custom-scrollbar">
        <div className="space-y-6">
          {/* Panel Header */}
          <div className="flex justify-between items-center pb-4 border-b border-border">
            <div>
              <h2 className="text-lg font-bold text-foreground">Calificar Alumno</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedStudent.nombre_completo}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={onSaveGrade} className="space-y-4">
            {/* Period selector */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Periodo Lectivo
              </label>
              <select
                value={gradingPeriod}
                onChange={(e) => onPeriodChange(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value={1} className="bg-card text-foreground">Periodo 1</option>
                <option value={2} className="bg-card text-foreground">Periodo 2</option>
                <option value={3} className="bg-card text-foreground">Periodo 3</option>
                <option value={4} className="bg-card text-foreground">Periodo 4</option>
              </select>
            </div>

            {/* Grade value input */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Calificación (Escala 0.0 - 5.0)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                required
                placeholder="Ej: 4.5"
                value={gradeValue}
                onChange={(e) => setGradeValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>

            {/* Teacher comment */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Observación / Logros (Docente)
              </label>
              <textarea
                rows={3}
                placeholder="Ej: Excelente razonamiento lógico. Presentó dificultades en ecuaciones cuadráticas pero mejoró."
                value={gradeComment}
                onChange={(e) => setGradeComment(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
              />
            </div>

            {/* Action button */}
            <button
              type="submit"
              disabled={savingGrade || generatingAI}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-sm font-semibold text-primary-foreground transition-all shadow-md disabled:opacity-60 cursor-pointer"
            >
              {savingGrade ? 'Guardando Calificación...' : 'Guardar Calificación'}
            </button>
          </form>

          {/* AI Predictive remark section */}
          <div className="pt-6 border-t border-border space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <IconSparkles className="w-4 h-4 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Retroalimentación IA Académica</h3>
            </div>

            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs leading-relaxed text-foreground relative min-h-[80px] flex items-center justify-center">
              {generatingAI ? (
                <div className="text-center space-y-2">
                  <svg className="animate-spin w-5 h-5 text-primary mx-auto" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-primary text-[10px] animate-pulse">Gemini analizando rendimiento académico...</p>
                </div>
              ) : (
                <p className="italic">
                  {selectedStudent.grades.find((g) => g.periodo === gradingPeriod)?.comentario_ia ||
                    'Guarda la calificación para generar automáticamente la predicción de rendimiento y alertas de la IA.'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border text-center text-[10px] text-muted-foreground leading-relaxed">
          El análisis predictivo de IA considera el historial completo de calificaciones y las faltas reportadas para sugerir alertas tempranas de bajo rendimiento.
        </div>
      </div>
    </div>
  );
}
