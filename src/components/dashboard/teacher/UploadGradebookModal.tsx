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
      const text = await file.text();
      
      const res = await runWithTimeout(
        importPlanillaDocente(idAsignacion, idPeriodo, text),
        25000
      );

      if (res.success) {
        setImportResult({
          processed: true,
          successCount: res.successCount,
          errorCount: res.errorCount,
          errors: res.errors
        });
        if (res.successCount > 0) {
          onSuccess();
        }
      } else {
        setImportResult({
          processed: false,
          successCount: 0,
          errorCount: 0,
          errors: [],
          error: res.error || 'Ocurrió un error inesperado al procesar la plantilla CSV.'
        });
      }
    } catch (err: unknown) {
      const isTimeout = err instanceof Error && err.message === 'TIMEOUT';
      setImportResult({
        processed: false,
        successCount: 0,
        errorCount: 0,
        errors: [],
        error: isTimeout
          ? 'El servidor tardó demasiado en responder (Timeout 25s). Es posible que algunos datos se hayan procesado.'
          : 'Error de conexión o lectura del archivo CSV.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-black/60 animate-in fade-in duration-200">
      
      {/* Container Principal */}
      <div 
        className="relative w-full max-w-xl bg-card border border-border p-6 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 space-y-6 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Cabecera / Modal Title */}
        <div className="flex justify-between items-start pb-4 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Carga Masiva de Calificaciones por CSV
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Descarga la estructura oficial en CSV de tus estudiantes y sube las notas masivamente.
            </p>
          </div>
          
          <button
            onClick={onClose}
            disabled={uploading || downloading}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary cursor-pointer disabled:opacity-40"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cuerpo / Pasos */}
        <div className="space-y-6">
          
          {/* Sección 1: Descargar Plantilla Oficial */}
          <div className="p-4 rounded-xl border bg-background border-border flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-foreground">1. Descargar Plantilla Actualizada</div>
              <div className="text-[11px] text-muted-foreground">
                Exporta el archivo CSV con la lista de alumnos y columnas de evidencias configuradas.
              </div>
            </div>
            
            <button
              onClick={handleDownloadTemplate}
              disabled={downloading || uploading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-40"
            >
              {downloading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Descargando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Descargar CSV
                </>
              )}
            </button>
          </div>

          {/* Sección 2: Subir Archivo CSV (Drag and Drop) */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-foreground">2. Importar Archivo de Calificaciones</div>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`p-8 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-teal-500 bg-teal-500/10'
                  : 'border-border bg-background hover:border-primary/40 hover:bg-secondary/40'
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
                  <p className="text-xs text-teal-500 font-medium">Validando y procesando registros académicos...</p>
                </div>
              ) : (
                <div className="space-y-2 text-muted-foreground">
                  <div className="text-foreground font-semibold text-sm">Arrastra tu plantilla CSV aquí o haz clic para buscar</div>
                  <div className="text-[10px]">Solo se aceptan archivos .csv formateados con las llaves de control</div>
                </div>
              )}
            </div>
          </div>

          {/* Sección 3: Reporte de Auditoría */}
          {importResult && (
            <div className="p-5 rounded-xl border bg-background border-border space-y-4 animate-in fade-in duration-200">
              
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Reporte de Auditoría Académica</h4>
                {importResult.error ? (
                  <span className="text-[10px] bg-rose-500/15 text-rose-500 px-2 py-0.5 rounded font-bold">FALLIDO</span>
                ) : (
                  <span className="text-[10px] bg-teal-500/15 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded font-bold">PROCESADO</span>
                )}
              </div>

              {/* Errores Críticos Globales */}
              {importResult.error && (
                <p className="text-xs text-rose-500 font-medium">{importResult.error}</p>
              )}

              {/* Estadísticas */}
              {!importResult.error && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Filas Exitosas</div>
                    <div className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">{importResult.successCount}</div>
                  </div>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Filas con Error</div>
                    <div className="text-2xl font-bold text-rose-500 mt-1">{importResult.errorCount}</div>
                  </div>
                </div>
              )}

              {/* Detalle de Errores por Fila */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold mb-1">Detalle de Errores Detectados:</div>
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-500 flex items-start gap-1.5 font-medium">
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
        <div className="flex justify-end pt-6 border-t border-border mt-6">
          <button
            onClick={onClose}
            disabled={uploading || downloading}
            className="px-4 py-2 rounded-xl bg-secondary border border-border hover:bg-secondary/80 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>

      {/* MODAL DIALOG OVERRIDE FOR ALERTS & CONFIRMS */}
      {modalConfig?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs bg-black/60 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-card border border-border p-6 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md transition-all duration-300 space-y-4 text-left text-foreground">
            {/* Header / Icon */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                modalConfig.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500' :
                modalConfig.type === 'error' ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500' :
                'bg-amber-500/10 border border-amber-500/30 text-amber-500'
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
              <h3 className="text-base font-bold text-foreground leading-none">{modalConfig.title}</h3>
            </div>
            
            {/* Body Message */}
            <p className="text-xs text-muted-foreground leading-relaxed">{modalConfig.message}</p>
            
            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalConfig(null)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-xs font-semibold text-primary-foreground transition-all shadow-md cursor-pointer"
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
