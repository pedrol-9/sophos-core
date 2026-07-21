'use client';

import { useState, useActionState } from 'react';
import Link from 'next/link';
import { registerInstitution, type RegisterState } from '@/app/actions/auth-actions';
import { ThemeToggle } from '@/components/ThemeToggle';

// ─── ICONS ───────────────────────────────────────────────────────────────────
function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────
const initialState: RegisterState = {};

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(registerInstitution, initialState);
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Back button & Theme toggle */}
      <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-10">
        <Link
          href="/"
          id="btn-back"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform group-hover:-translate-x-0.5">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Volver
        </Link>
        <ThemeToggle />
      </div>

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-600/8 blur-[80px] rounded-full" />
      </div>

      <div className="relative w-full max-w-lg my-12">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img src="/favicon.png" alt="Sophos Core Logo" className="w-10 h-10 object-contain rounded-xl shadow-md" />
            <span className="text-xl font-bold tracking-tight text-foreground">
              Sophos<span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent"> Core</span>
            </span>
          </Link>
          <p className="text-muted-foreground text-sm mt-3">Registra tu institución educativa y comienza hoy</p>
        </div>

        {/* Estado PRUEBA badge */}
        <div className="mb-5 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
          <p className="text-indigo-600 dark:text-indigo-300 text-xs leading-relaxed font-medium">
            Al registrarte, tu institución quedará activa en modo <strong>Prueba</strong> de forma inmediata, sin necesidad de verificación previa.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
          <h1 className="text-xl font-semibold text-foreground mb-6">Datos de la Institución</h1>

          <form action={formAction} className="space-y-4">

            {/* Nombre Legal */}
            <div>
              <label htmlFor="nombre_legal" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Nombre Legal de la Institución <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre_legal"
                name="nombre_legal"
                type="text"
                required
                autoComplete="organization"
                placeholder="Ej: Colegio Técnico Metropolitano S.A.S."
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>

            {/* NIT / Dirección */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nit" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  NIT / RUT <span className="text-red-500">*</span>
                </label>
                <input
                  id="nit"
                  name="nit"
                  type="text"
                  required
                  placeholder="900.123.456-7"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>

              <div>
                <label htmlFor="telefono" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Teléfono institucional
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  placeholder="+57 300 123 4567"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label htmlFor="direccion" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                Dirección física
              </label>
              <input
                id="direccion"
                name="direccion"
                type="text"
                placeholder="Calle 10 # 4-20, Bogotá"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>

            <div className="pt-2 border-t border-border mt-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Datos del Administrador Principal</h2>

              {/* Nombre Admin */}
              <div className="mb-4">
                <label htmlFor="nombre_admin" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  id="nombre_admin"
                  name="nombre_admin"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Carlos Alberto Pérez"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>

              {/* Email Admin */}
              <div className="mb-4">
                <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Correo electrónico institucional <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="rectoria@colegio.edu.co"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>

              {/* Password Admin */}
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Contraseña de acceso <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-all z-10 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {state?.error && (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-500 dark:text-red-300 text-sm">{state.error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-signup"
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-4"
            >
              {isPending ? <><Spinner /> Creando institución...</> : <>Crear Institución <IconArrow /></>}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          ¿Ya tienes cuenta institucional?{' '}
          <Link href="/login" id="link-login" className="text-primary hover:underline font-medium transition-colors">
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
