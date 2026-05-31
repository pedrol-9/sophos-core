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
    <div className="w-full lg:w-96 bg-[#0c1220] border border-white/10 rounded-2xl p-6 backdrop-blur-sm shrink-0 min-h-[450px] relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {selectedStudent ? (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-indigo-900 border border-white/10 flex items-center justify-center text-white/60 mx-auto relative mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
            </div>
            <h3 className="font-bold text-base text-white">{selectedStudent.name}</h3>
            <p className="text-xs text-white/40 mt-1">{selectedStudent.institution}</p>
          </div>

          <hr className="border-white/10" />

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/2 border border-white/5 rounded-xl p-3 text-center">
              <span className="text-[10px] text-white/40 uppercase block mb-1">Materia</span>
              <span className="text-xs font-semibold text-white/90 block truncate">{selectedStudent.subject}</span>
            </div>
            <div className="bg-white/2 border border-white/5 rounded-xl p-3 text-center">
              <span className="text-[10px] text-white/40 uppercase block mb-1">Ausentismo</span>
              <span className="text-xs font-semibold text-white/90 block">{100 - selectedStudent.attendance}% ({Math.round((100 - selectedStudent.attendance) * 0.3)} días)</span>
            </div>
          </div>

          <div className="relative bg-indigo-600/5 border border-indigo-500/25 rounded-2xl p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                <IconSparkles /> Comentario IA Académica
              </span>
              <span className="text-[9px] bg-indigo-500/25 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">Optimizado</span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed italic">
              &ldquo;{selectedStudent.aiComment}&rdquo;
            </p>

            {isGenerating && (
              <div className="absolute inset-0 bg-[#0c1220]/95 flex flex-col items-center justify-center rounded-2xl">
                <svg className="animate-spin w-8 h-8 text-indigo-500 mb-2" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-xs text-indigo-400 font-semibold">Generando análisis académico...</p>
                <div className="w-32 bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-150" style={{ width: `${generatingProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => onGenerateAIComment(selectedStudent.id)}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 disabled:opacity-60"
          >
            <IconSparkles /> Regenerar Comentario con IA
          </button>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center py-20 text-white/40">
          <div className="w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center mb-4">
            <IconUser />
          </div>
          <p className="text-sm">Selecciona un estudiante para visualizar su reporte completo y el análisis automático de IA.</p>
        </div>
      )}
    </div>
  );
}
