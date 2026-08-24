'use client';

import { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { checkSubdomainAvailability, assignInstitutionSubdomain } from '@/app/actions/admin-actions';

interface SubdomainSectionProps {
  currentSubdomain: string | null;
  isLocked: boolean;
  onSubdomainAssigned?: () => void;
}

export function SubdomainSection({ currentSubdomain, isLocked, onSubdomainAssigned }: SubdomainSectionProps) {
  const [mounted, setMounted] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'>('idle');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounce para validar disponibilidad
  useEffect(() => {
    if (isLocked || !inputVal.trim()) {
      setStatus('idle');
      setFeedbackMsg('');
      return;
    }

    const clean = inputVal.trim().toLowerCase();

    if (clean.length < 3) {
      setStatus('invalid');
      setFeedbackMsg('Mínimo 3 caracteres');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(clean)) {
      setStatus('invalid');
      setFeedbackMsg('Solo minúsculas, números y guiones');
      return;
    }

    if (clean.startsWith('-') || clean.endsWith('-')) {
      setStatus('invalid');
      setFeedbackMsg('No puede iniciar ni terminar con guión');
      return;
    }

    setStatus('checking');
    setFeedbackMsg('Comprobando disponibilidad...');

    const timer = setTimeout(async () => {
      const res = await checkSubdomainAvailability(clean);
      if (res.available) {
        setStatus('available');
        setFeedbackMsg('¡Subdominio disponible!');
      } else {
        setStatus('unavailable');
        setFeedbackMsg(res.error || 'Subdominio no disponible');
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [inputVal, isLocked]);

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const targetUrl = currentSubdomain 
    ? (isLocal ? `http://localhost:3000/${currentSubdomain}/dashboard` : `https://${currentSubdomain}.sophoscore.com`)
    : '';

  const handleCopyUrl = () => {
    if (!targetUrl) return;
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmAssignment = () => {
    setActionError(null);
    startTransition(async () => {
      const res = await assignInstitutionSubdomain(inputVal);
      if (res.success) {
        setIsModalOpen(false);
        if (onSubdomainAssigned) {
          onSubdomainAssigned();
        }
      } else {
        setActionError(res.error || 'Error al asignar subdominio.');
      }
    });
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Subdominio Institucional</h3>
            {isLocked && currentSubdomain && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Verificado & Activo
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            URL personalizada y exclusiva para el acceso de tu comunidad educativa.
          </p>
        </div>
      </div>

      {/* CASO 1: YA CONFIGURADO Y BLOQUEADO (ONE-TIME LOCKED) */}
      {isLocked && currentSubdomain ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/30 border border-border rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-mono font-bold text-foreground truncate">
                  {isLocal ? (
                    <>http://localhost:3000/<span className="text-emerald-500">{currentSubdomain}</span>/dashboard</>
                  ) : (
                    <>https://<span className="text-emerald-500">{currentSubdomain}</span>.sophoscore.com</>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">Portal oficial fijado y protegido</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-background hover:bg-muted border border-border transition-colors text-foreground cursor-pointer"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-emerald-500 font-bold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    <span>Copiar Enlace</span>
                  </>
                )}
              </button>

              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                title="Abrir en nueva pestaña"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/15 rounded-xl text-[11px] text-muted-foreground leading-relaxed">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <span>
              Este subdominio es definitivo para evitar que los enlaces de tus docentes y boletines se rompan. Si requieres un cambio extraordinario por motivos legales de la institución, contacta a Soporte Técnico.
            </span>
          </div>
        </div>
      ) : (
        /* CASO 2: SIN CONFIGURAR (PERMITIR ONE-TIME SETUP) */
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              Elige el subdominio para tu colegio:
            </label>

            <div className="flex items-center">
              <div className="relative flex-1 flex items-center">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="ej: carbonell"
                  maxLength={30}
                  className="w-full bg-background border border-border rounded-l-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary font-mono transition-colors"
                />
                {status === 'checking' && (
                  <div className="absolute right-3 w-4 h-4 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
                )}
                {status === 'available' && (
                  <div className="absolute right-3 text-emerald-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="px-3.5 py-2.5 bg-muted/60 border border-l-0 border-border rounded-r-xl text-xs font-mono font-bold text-muted-foreground shrink-0 select-none">
                .sophoscore.com
              </div>
            </div>

            {/* Feedback Message */}
            {feedbackMsg && (
              <p
                className={`text-[11px] font-medium transition-all ${
                  status === 'available'
                    ? 'text-emerald-500'
                    : status === 'unavailable' || status === 'invalid'
                    ? 'text-rose-500'
                    : 'text-muted-foreground'
                }`}
              >
                {feedbackMsg}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-500 font-medium">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>Esta configuración se permite una sola vez.</span>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={status !== 'available'}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <span>Asignar Subdominio</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DE CONFIRMACIÓN CRÍTICA (ONE-TIME WARNING) ── */}
      {mounted && isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-foreground animate-in zoom-in-95 duration-150">
            
            {/* Header con icono de alerta */}
            <div className="p-5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">¿Confirmar Asignación Definitiva?</h3>
                <p className="text-[11px] text-amber-500 font-medium">Esta operación no se puede deshacer</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs leading-relaxed text-muted-foreground">
              <p>
                Estás a punto de registrar el subdominio oficial para tu institución educativa:
              </p>

              <div className="p-3 rounded-xl bg-muted/40 border border-border text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold">URL Oficial de tu Colegio</p>
                <p className="text-base font-mono font-bold text-primary mt-0.5">
                  https://<span className="text-emerald-500">{inputVal}</span>.sophoscore.com
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>Tus docentes, directivos y estudiantes accederán a través de este enlace directo.</span>
                </div>
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <span className="font-semibold text-foreground">
                    Una vez confirmado, el subdominio quedará bloqueado permanentemente para evitar enlaces rotos.
                  </span>
                </div>
              </div>

              {actionError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                  {actionError}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-border flex items-center justify-end gap-2.5 bg-muted/15">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmAssignment}
                disabled={isPending}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{isPending ? 'Asignando...' : 'Sí, Confirmar y Bloquear'}</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
