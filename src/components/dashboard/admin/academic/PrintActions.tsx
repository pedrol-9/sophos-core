'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H9a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a1 1 0 011-1h6a1 1 0 011 1v9M9 4h6" />
      </svg>
      Imprimir / Guardar PDF
    </button>
  );
}

export function CloseButton() {
  return (
    <button
      onClick={() => window.close()}
      className="mt-6 px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-semibold transition-all cursor-pointer"
    >
      Cerrar Pestaña
    </button>
  );
}
