'use client';

import { useState, useRef, useEffect } from 'react';
import { exportPlantillaDocente, importPlanillaDocente, BulkImportError } from '@/app/actions/gradeActions';

interface UploadGradebookModalProps {
  idAsignacion: string;
  idPeriodo: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadGradebookModal({ idAsignacion, idPeriodo, onClose, onSuccess }: UploadGradebookModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'confirm';
  } | null>(null);
  
  // Resultado de importación
  const [importResult, setImportResult] = useState<{
    processed: boolean;
    successCount: number;
    errorCount: number;
    errors: BulkImportError[];
    error?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading && !downloading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, uploading, downloading]);

  // Descargar plantilla de notas
  const handleDownloadTemplate = async () => {
    setDownloading(true);
    setImportResult(null);
    try {
      const res = await exportPlantillaDocente(idAsignacion, idPeriodo);
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `plantilla_notas_${idAsignacion}_p${idPeriodo.slice(0,4)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setModalConfig({
          show: true,
          title: 'Error de Plantilla',
          message: res.error || 'Error al exportar la plantilla.',
          type: 'error'
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setModalConfig({
        show: true,
        title: 'Error de Exportación',
        message: `Error: ${errMsg}`,
        type: 'error'
      });
    } finally {
      setDownloading(false);
    }
  };

  // Helper to run with timeout
  const runWithTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
      )
    ]);
  };

  // Procesar archivo de carga
  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setModalConfig({
        show: true,
        title: 'Archivo Inválido',
        message: 'Por favor, selecciona únicamente archivos con extensión .csv',
        type: 'warning'
      });
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        try {
          // Timeout de 15 segundos
          const res = await runWithTimeout(
            importPlanillaDocente(idAsignacion, idPeriodo, text),
            15000
          );

          if (res.success) {
            setImportResult({
              processed: true,
              successCount: res.successCount,
              errorCount: res.errorCount,
              errors: res.errors
            });
            if (res.successCount > 0) {
              onSuccess(); // Recargar la planilla detrás del modal
            }
          } else {
            setImportResult({
              processed: true,
              successCount: 0,
              errorCount: 0,
              errors: [],
              error: res.error || 'Ocurrió un error inesperado al procesar el archivo.'
            });
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error && err.message === 'TIMEOUT'
            ? 'La carga masiva superó el tiempo límite de espera (15 segundos). Verifica tu conexión o intenta con un archivo más pequeño.'
            : (err instanceof Error ? err.message : 'Error desconocido');
          
          setImportResult({
            processed: true,
            successCount: 0,
            errorCount: 0,
            errors: [],
            error: errMsg
          });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsText(file, 'utf-8');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setImportResult({
        processed: true,
        successCount: 0,
        errorCount: 0,
        errors: [],
        error: 'Error de lectura: ' + errMsg
      });
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading && !downloading) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl bg-[#0c1220] border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-white/5 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Carga Masiva de Calificaciones (CSV)</h2>
            <p className="text-xs text-white/40 mt-0.5">Sube tus calificaciones sin conexión descargando la plantilla del periodo actual.</p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading || downloading}
            className="p-1 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Carga e Instructivo */}
        <div className="space-y-6">
          
          {/* Sección 1: Descargar Plantilla */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">1. Descargar Plantilla Oficial</h3>
              <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                Obtén la lista de alumnos precargada con los UUIDs relacionales de control obligatorios.
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              disabled={downloading}
              className="shrink-0 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-xs font-semibold text-white/80 transition-all flex items-center gap-2"
            >
              {downloading ? 'Generando...' : 'Descargar (.CSV)'}
            </button>
          </div>

          {/* Sección 2: Zona Dropzone */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">2. Cargar Archivo Diligenciado</h3>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px] ${
                dragActive
                  ? 'border-teal-500 bg-teal-500/5'
                  : 'border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.02]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {uploading ? (
                <div className="space-y-2">
                  <svg className="animate-spin w-8 h-8 text-teal-500 mx-auto" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-xs text-teal-400 font-medium">Validando y procesando registros académicos...</p>
                </div>
              ) : (
                <div className="space-y-2 text-white/40">
                  <div className="text-white/60 font-semibold text-sm">Arrastra tu plantilla CSV aquí o haz clic para buscar</div>
                  <div className="text-[10px]">Solo se aceptan archivos .csv formateados con las llaves de control</div>
                </div>
              )}
            </div>
          </div>

          {/* Sección 3: Reporte de Auditoría (Resultados de Importación) */}
          {importResult && (
            <div className="p-5 rounded-xl border bg-white/[0.01] border-white/5 space-y-4 animate-in fade-in duration-200">
              
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Reporte de Auditoría Académica</h4>
                {importResult.error ? (
                  <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-bold">FALLIDO</span>
                ) : (
                  <span className="text-[10px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded font-bold">PROCESADO</span>
                )}
              </div>

              {/* Errores Críticos Globales */}
              {importResult.error && (
                <p className="text-xs text-red-400">{importResult.error}</p>
              )}

              {/* Estadísticas */}
              {!importResult.error && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-teal-500/[0.02] border border-teal-500/10 rounded-lg">
                    <div className="text-[10px] text-white/40 uppercase font-semibold">Filas Exitosas</div>
                    <div className="text-2xl font-bold text-teal-400 mt-1">{importResult.successCount}</div>
                  </div>
                  <div className="p-3 bg-red-500/[0.02] border border-red-500/10 rounded-lg">
                    <div className="text-[10px] text-white/40 uppercase font-semibold">Filas con Error</div>
                    <div className="text-2xl font-bold text-red-400 mt-1">{importResult.errorCount}</div>
                  </div>
                </div>
              )}

              {/* Detalle de Errores por Fila */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  <div className="text-[10px] text-white/40 uppercase font-semibold mb-1">Detalle de Errores Detectados:</div>
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} className="p-2 rounded bg-red-500/5 border border-red-500/10 text-[11px] text-red-300 flex items-start gap-1.5">
                      <span className="font-bold shrink-0">Fila {err.row}:</span>
                      <span>{err.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end pt-6 border-t border-white/5 mt-6">
          <button
            onClick={onClose}
            disabled={uploading || downloading}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-xs font-semibold text-white/70 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>

      {/* MODAL DIALOG OVERRIDE FOR ALERTS & CONFIRMS */}
      {modalConfig?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-[#0c1220]/95 border border-white/10 p-6 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 space-y-4 text-left">
            {/* Header / Icon */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                modalConfig.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' :
                modalConfig.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' :
                'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              }`}>
                {modalConfig.type === 'success' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : modalConfig.type === 'error' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <h3 className="text-base font-bold text-white leading-none">{modalConfig.title}</h3>
            </div>
            
            {/* Body Message */}
            <p className="text-xs text-white/60 leading-relaxed">{modalConfig.message}</p>
            
            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalConfig(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
