'use client';

import { useState } from 'react';
import { IconArrow } from '@/components/icons';

interface BulkImportModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md h-full bg-[#0c1220] border-l border-white/10 p-8 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Carga Masiva (CSV)</h2>
            <p className="text-xs text-white/40 mt-1">Registra docentes y estudiantes en lote.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
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

        <form action={async (formData) => {
          setIsGenerating(true);
          const { bulkImportUsers } = await import('@/app/actions/admin-actions');
          const result = await bulkImportUsers(formData);
          setIsGenerating(false);
          
          if (result.error) {
            alert(`Error: ${result.error}`);
          } else {
            alert(`¡Importación finalizada!\nÉxitos: ${result.successCount}\nErrores: ${result.errorCount}`);
            if (result.errors && result.errors.length > 0) {
                console.error("Errores de importación:", result.errors);
            }
            if (result.successCount && result.successCount > 0) {
              onSuccess?.();
              onClose();
            }
          }
        }} className="space-y-5 flex-1 flex flex-col justify-between">
          
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">
              Archivo de usuarios
            </label>
            <div className="relative">
              <input
                type="file"
                name="file"
                accept=".csv,.txt"
                required
                className="block w-full text-sm text-white/50 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 bg-white/5 border border-white/10 rounded-xl transition-all cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-violet-500 text-sm font-semibold text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Procesando usuarios...' : <>Subir e Importar <IconArrow /></>}
            </button>
            <p className="text-[10px] text-white/30 text-center mt-3 leading-relaxed">
              Las contraseñas iniciales se generarán automáticamente y se forzará su cambio al primer inicio de sesión.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
