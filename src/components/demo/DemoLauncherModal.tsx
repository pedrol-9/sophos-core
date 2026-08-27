'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO_ACCOUNTS, DemoAccount } from '@/config/demo-accounts';
import { loginAsDemo } from '@/app/actions/auth/demo-actions';

interface DemoLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoLauncherModal({ isOpen, onClose }: DemoLauncherModalProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<DemoAccount['id']>('admin');
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickLogin = async (account: DemoAccount) => {
    setLoadingRole(account.id);
    setErrorMessage(null);

    try {
      const res = await loginAsDemo(account.id);

      if (!res.success) {
        setErrorMessage(res.error || 'No se pudo iniciar sesión con la cuenta de prueba.');
        setLoadingRole(null);
        return;
      }

      router.push(res.redirectPath || '/dashboard/admin');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error inesperado al conectar con el servidor.');
      setLoadingRole(null);
    }
  };

  const currentAccount = DEMO_ACCOUNTS.find((a) => a.id === selectedRole) || DEMO_ACCOUNTS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 sm:p-8 border-b border-border/80 flex items-center justify-between shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Entorno Sandbox Interactivo
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Explora Sophos Core <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">en Vivo</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Selecciona el rol con el que deseas ingresar para probar la plataforma con 1 solo clic.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={loadingRole !== null}
            className="p-2.5 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-3 animate-in fade-in">
              <svg className="w-5 h-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Role selector pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {DEMO_ACCOUNTS.map((acc) => {
              const isSelected = selectedRole === acc.id;
              return (
                <button
                  key={acc.id}
                  onClick={() => setSelectedRole(acc.id)}
                  className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/15 border-primary shadow-sm text-foreground scale-[1.02]'
                      : 'bg-secondary/40 border-border/70 hover:bg-secondary/70 text-muted-foreground'
                  }`}
                >
                  <span className="text-2xl mb-1.5">{acc.avatarIcon}</span>
                  <span className="text-xs font-bold leading-tight line-clamp-1">{acc.title.split(' ')[0]}</span>
                  <span className="text-[10px] text-muted-foreground truncate w-full mt-0.5">{acc.role}</span>
                </button>
              );
            })}
          </div>

          {/* Selected Role Card Details */}
          <div className="p-6 rounded-3xl bg-secondary/30 border border-border/80 relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center text-3xl shadow-sm">
                  {currentAccount.avatarIcon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">{currentAccount.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${currentAccount.badgeColor}`}>
                      {currentAccount.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{currentAccount.subtitle}</p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[11px] text-muted-foreground font-mono bg-card/60 px-3 py-1.5 rounded-xl border border-border inline-block">
                  {currentAccount.email}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              {currentAccount.description}
            </p>

            <div className="pt-2 border-t border-border/60">
              <p className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider mb-2.5">
                Funcionalidades destacadas en este rol:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentAccount.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <svg className="w-4 h-4 text-cyan-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 sm:p-8 border-t border-border/80 bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-[11px] text-muted-foreground text-center sm:text-left flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span>Datos de demostración pre-cargados (IE Jose María Carbonell)</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={loadingRole !== null}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full sm:w-auto cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleQuickLogin(currentAccount)}
              disabled={loadingRole !== null}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer disabled:opacity-50"
            >
              {loadingRole === currentAccount.id ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Ingresando al Demo...</span>
                </>
              ) : (
                <>
                  <span>Ingresar como {currentAccount.title.split(' ')[0]}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
