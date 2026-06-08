'use client';

import { useState, useRef, useEffect } from 'react';
import { IconArrow } from '@/components/icons';

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    errorCount: number;
    errors: { row: number; error: string }[];
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isGenerating]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isGenerating) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isGenerating) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        setDroppedFile(file);
        setImportError(null);
        // Reset original input
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setImportError("Por favor, sube un archivo con formato .csv o .txt");
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) {
          onClose();
        }
      }}
    >
      <div 
        className={`w-full max-w-md h-full border-l p-8 flex flex-col overflow-y-auto relative animate-in slide-in-from-right duration-200 transition-colors ${
          isDragging 
            ? 'bg-indigo-900/40 border-indigo-500 ring-2 ring-inset ring-indigo-500/50' 
            : 'bg-[#0c1220] border-white/10'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && !isGenerating && (
          <div className="absolute inset-0 z-10 bg-indigo-600/10 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-indigo-500 m-4 rounded-2xl pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <IconArrow />
              </div>
              <p className="text-xl font-bold text-white">Suelta el archivo aquí</p>
            </div>
          </div>
        )}

        {/* Loading Overlay with Warnings */}
        {isGenerating && (
          <div className="absolute inset-0 z-20 bg-[#0c1220]/95 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
            <div className="w-14 h-14 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
            <h3 className="text-lg font-bold text-white mb-2">Procesando Importación Masiva</h3>
            <p className="text-xs text-white/60 max-w-xs mb-6 leading-relaxed">
              Estamos registrando los usuarios en Supabase Auth y vinculando sus matrículas/asignaciones en la base de datos.
            </p>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left max-w-xs flex gap-3 text-amber-300">
              <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-semibold mb-1">¡No cierres esta ventana!</p>
                <p className="text-[10px] text-amber-400/80 leading-normal">
                  Por favor, no salgas de esta pantalla ni cierres el navegador hasta que la carga termine.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Close and Header */}
        <div className="flex justify-between items-center mb-6 relative z-0">
          <div>
            <h2 className="text-lg font-bold text-white">Carga Masiva (CSV)</h2>
            <p className="text-xs text-white/40 mt-1">Registra docentes, estudiantes y acudientes en lote.</p>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Alert Banner */}
        {importError && (
          <div className="mb-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-200">
            <svg className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <span className="font-semibold">Fallo en la importación:</span> {importError}
            </div>
            <button 
              type="button" 
              onClick={() => setImportError(null)}
              className="text-rose-400/50 hover:text-rose-300 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        )}

        {/* Success Details Panel */}
        {importResult ? (
          <div className="flex flex-col flex-1 justify-between relative z-0 animate-in fade-in duration-200">
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">¡Importación Finalizada!</h3>
              <p className="text-xs text-white/40 mb-6">El archivo se ha procesado con los siguientes resultados:</p>
              
              <div className="grid grid-cols-2 gap-4 w-full mb-6">
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="text-2xl font-bold text-emerald-400">{importResult.successCount}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Registrados</div>
                </div>
                <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                  <div className="text-2xl font-bold text-rose-400">{importResult.errorCount}</div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Errores</div>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="w-full text-left bg-black/30 rounded-xl p-4 border border-white/5 max-h-48 overflow-y-auto mb-2">
                  <p className="text-xs font-semibold text-rose-400 mb-2">Detalles de errores ({importResult.errors.length}):</p>
                  <ul className="space-y-1.5 text-[10px] text-white/60 list-disc pl-4 font-mono">
                    {importResult.errors.slice(0, 20).map((err, idx: number) => (
                      <li key={idx}>
                        Fila {err.row}: {err.error}
                      </li>
                    ))}
                    {importResult.errors.length > 20 && (
                      <li className="list-none text-white/30 text-center pt-1 italic">... y {importResult.errors.length - 20} errores más.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                onSuccess?.();
                onClose();
              }}
              className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold text-white transition-all text-center"
            >
              Entendido
            </button>
          </div>
        ) : (
          /* Normal Upload Form */
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (isGenerating || processingRef.current) return;

            setImportError(null);
            setImportResult(null);

            const formData = new FormData(e.currentTarget);
            if (droppedFile) {
              formData.set('file', droppedFile);
            } else {
              const file = fileInputRef.current?.files?.[0];
              if (!file || file.size === 0) {
                setImportError('Por favor selecciona un archivo CSV o de texto.');
                return;
              }
            }

            processingRef.current = true;
            setIsGenerating(true);
            try {
              const { bulkImportUsers } = await import('@/app/actions/admin-actions');
              const result = await bulkImportUsers(formData);
              
              if (result.error) {
                setImportError(result.error);
              } else {
                setImportResult({
                  successCount: result.successCount || 0,
                  errorCount: result.errorCount || 0,
                  errors: result.errors || [],
                });
              }
            } catch (err) {
              setImportError('Ocurrió un error inesperado al procesar la importación.');
              console.error(err);
            } finally {
              setIsGenerating(false);
              processingRef.current = false;
            }
          }} className="space-y-5 flex-1 flex flex-col justify-between relative z-0">
            
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
                <p className="font-semibold mb-2">Formato requerido del CSV:</p>
                <code className="block bg-black/30 p-2 rounded text-[10px] font-mono mb-2 border border-white/5">
                  nombre_completo,email,rol,curso<br/>
                  &quot;Ana Gómez&quot;,ana@edu.co,DOCENTE,<br/>
                  &quot;Luis Paz&quot;,luis@edu.co,ESTUDIANTE,11A
                </code>
                <ul className="list-disc pl-4 space-y-1 text-indigo-300/80">
                  <li>El archivo debe incluir los encabezados exactos.</li>
                  <li>Roles válidos: DOCENTE, ESTUDIANTE, ACUDIENTE.</li>
                  <li>El curso es opcional y solo aplica para estudiantes.</li>
                </ul>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
                  Archivo de usuarios
                </label>
                <div className={`relative border-2 border-dashed rounded-xl transition-all ${droppedFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-white/5 hover:border-indigo-500/50'}`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    name="file"
                    accept=".csv,.txt"
                    disabled={isGenerating}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setDroppedFile(null); // Clear drop file if they use standard browser picker
                        setImportError(null);
                      }
                    }}
                    className={`block w-full text-sm text-white/50 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${droppedFile ? 'opacity-50' : ''}`}
                  />
                  {droppedFile && (
                    <div className="absolute inset-0 flex items-center justify-between px-4 bg-[#0c1220]/90 backdrop-blur-md rounded-xl border border-emerald-500/30">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </div>
                        <span className="text-sm font-medium text-emerald-300 truncate">{droppedFile.name}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setDroppedFile(null)}
                        className="text-white/40 hover:text-white/80 shrink-0 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    </div>
                  )}
                </div>
                {!droppedFile && <p className="text-[10px] text-white/30 mt-2 text-center">Puedes arrastrar y soltar el archivo en cualquier parte de este panel.</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-violet-500 text-sm font-semibold text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Subir e Importar <IconArrow />
              </button>
              <p className="text-[10px] text-white/30 text-center mt-3 leading-relaxed">
                Las contraseñas iniciales se generarán automáticamente y se forzará su cambio al primer inicio de sesión.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}




