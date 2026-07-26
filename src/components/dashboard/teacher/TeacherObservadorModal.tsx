'use client';

import { type CourseStudent } from '@/app/actions/teacher-actions';
import { type ObservadorRecord } from '@/app/actions/observador-actions';

interface TeacherObservadorModalProps {
  selectedStudent: CourseStudent;
  onClose: () => void;
  newObsType: 'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO';
  setNewObsType: (type: 'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO') => void;
  newObsText: string;
  setNewObsText: (text: string) => void;
  onSaveObservacion: (e: React.FormEvent) => void;
  savingObs: boolean;
  observations: ObservadorRecord[];
  loadingObs: boolean;
}

export function TeacherObservadorModal({
  selectedStudent,
  onClose,
  newObsType,
  setNewObsType,
  newObsText,
  setNewObsText,
  onSaveObservacion,
  savingObs,
  observations,
  loadingObs,
}: TeacherObservadorModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-lg h-full bg-card border-l border-border p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200 text-foreground custom-scrollbar">
        <div className="space-y-6 flex-1 flex flex-col min-h-0">
          {/* Panel Header */}
          <div className="flex justify-between items-center pb-4 border-b border-border shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground">Observador Digital</h2>
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

          {/* Form to Create New Observation */}
          <form onSubmit={onSaveObservacion} className="space-y-4 shrink-0 bg-background border border-border rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Registrar Nueva Novedad</h3>

            {/* Tipo de Nota */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Tipo de Anotación
              </label>
              <select
                value={newObsType}
                onChange={(e) => setNewObsType(e.target.value as 'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO')}
                className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="PEDAGOGICA" className="bg-card text-foreground">Pedagógica (Seguimiento Académico/Convivencia)</option>
                <option value="DISCIPLINARIA" className="bg-card text-foreground">Disciplinaria (Llamado de atención / Falta)</option>
                <option value="LOGRO_DESTACADO" className="bg-card text-foreground">Reconocimiento / Logro Destacado</option>
              </select>
            </div>

            {/* Observacion Informal */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Detalle de la Observación (Nota en bruto)
              </label>
              <textarea
                rows={3}
                required
                placeholder="Ej: El alumno interrumpió la clase varias veces hablando con sus compañeros. Se le llamó la atención."
                value={newObsText}
                onChange={(e) => setNewObsText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={savingObs || !newObsText.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-all shadow-md disabled:opacity-50 cursor-pointer"
            >
              {savingObs ? 'Procesando con IA Gemini...' : 'Registrar y Formalizar con IA'}
            </button>
          </form>

          {/* History of Observations */}
          <div className="flex-1 flex flex-col min-h-0 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 shrink-0">Historial del Estudiante</h3>

            {loadingObs ? (
              <p className="text-muted-foreground text-xs text-center py-8 font-medium">Cargando bitácora...</p>
            ) : observations.length === 0 ? (
              <p className="text-muted-foreground/60 text-xs italic text-center py-8">Sin anotaciones en este periodo.</p>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {observations.map((obs) => (
                  <div key={obs.id_observador} className="p-4 rounded-xl bg-background border border-border space-y-3 text-xs">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        obs.tipo_nota === 'DISCIPLINARIA'
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                          : obs.tipo_nota === 'LOGRO_DESTACADO'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {obs.tipo_nota === 'DISCIPLINARIA' ? 'Disciplinaria' :
                         obs.tipo_nota === 'LOGRO_DESTACADO' ? 'Logro' : 'Pedagógica'}
                      </span>

                      {/* Sign status */}
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        obs.firmado
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {obs.firmado ? `Firmado por ${obs.firmadorNombre || 'Acudiente'}` : 'Pendiente de firma'}
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px] leading-relaxed">
                      <div>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Nota original:</span>
                        <p className="text-foreground italic">&ldquo;{obs.observacion_informal}&rdquo;</p>
                      </div>
                      {obs.observacion_formal_ia && (
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-foreground">
                          <span className="block text-[8px] font-bold uppercase tracking-wider text-primary">Transcripción IA:</span>
                          <p>&ldquo;{obs.observacion_formal_ia}&rdquo;</p>
                        </div>
                      )}
                    </div>

                    <div className="text-[9px] text-muted-foreground text-right">
                      {new Date(obs.fecha_registro || '').toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
