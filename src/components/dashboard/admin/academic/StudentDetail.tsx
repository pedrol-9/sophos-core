import { IconUser, IconSparkles } from '@/components/icons';
import { Student } from '@/hooks/useAdminDashboard';

interface StudentDetailProps {
  selectedStudent: Student | null;
  isGenerating: boolean;
  generatingProgress: number;
  onGenerateAIComment: (studentId: string) => void;
}

export function StudentDetail({ selectedStudent, isGenerating, generatingProgress, onGenerateAIComment }: StudentDetailProps) {
  return (
    <div className="w-full lg:w-96 lg:sticky lg:top-8 bg-card border border-border rounded-2xl p-6 backdrop-blur-sm shrink-0 min-h-[450px] relative overflow-hidden shadow-xs">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      {selectedStudent ? (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-secondary border border-border flex items-center justify-center text-muted-foreground mx-auto relative mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
            </div>
            <h3 className="font-bold text-base text-foreground">{selectedStudent.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{selectedStudent.institution}</p>
          </div>

          <hr className="border-border" />

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background border border-border rounded-xl p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase block mb-1 font-semibold">Materia</span>
              <span className="text-xs font-semibold text-foreground block truncate">{selectedStudent.subject}</span>
            </div>
            <div className="bg-background border border-border rounded-xl p-3 text-center">
              <span className="text-[10px] text-muted-foreground uppercase block mb-1 font-semibold">Ausentismo</span>
              <span className="text-xs font-semibold text-foreground block">{100 - selectedStudent.attendance}% ({Math.round((100 - selectedStudent.attendance) * 0.3)} días)</span>
            </div>
          </div>

          <div className="relative bg-primary/10 border border-primary/20 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                <IconSparkles /> Comentario IA Académica
              </span>
              <span className="text-[9px] bg-primary/20 text-primary font-semibold px-2 py-0.5 rounded-full">Optimizado</span>
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed italic">
              &ldquo;{selectedStudent.aiComment}&rdquo;
            </p>

            {isGenerating && (
              <div className="absolute inset-0 bg-card/95 flex flex-col items-center justify-center rounded-2xl">
                <svg className="animate-spin w-8 h-8 text-primary mb-2" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-xs text-primary font-semibold">Generando análisis académico...</p>
                <div className="w-32 bg-secondary h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all duration-150" style={{ width: `${generatingProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onGenerateAIComment(selectedStudent.id)}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-all shadow-md disabled:opacity-60"
          >
            <IconSparkles /> Regenerar Comentario con IA
          </button>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center py-20 text-muted-foreground">
          <div className="w-12 h-12 rounded-full border border-dashed border-border flex items-center justify-center mb-4">
            <IconUser />
          </div>
          <p className="text-sm">Selecciona un estudiante para visualizar su reporte completo y el análisis automático de IA.</p>
        </div>
      )}
    </div>
  );
}
