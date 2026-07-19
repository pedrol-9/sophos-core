'use client';

import { useState, useActionState } from 'react';
import Link from 'next/link';
import { registerInstitution, type RegisterState } from '@/app/actions/auth-actions';

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/12 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-600/8 blur-[80px] rounded-full" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <img src="/favicon.png" alt="Sophos Core Logo" className="w-10 h-10 object-contain rounded-xl shadow-lg shadow-indigo-500/25" />
            <span className="text-xl font-bold tracking-tight text-white">
              Sophos<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"> Core</span>
            </span>
          </Link>
          <p className="text-white/40 text-sm mt-3">Registra tu institución educativa y comienza hoy</p>
        </div>

        {/* Estado PRUEBA badge */}
        <div className="mb-5 px-4 py-3 rounded-xl bg-indigo-500/8 border border-indigo-500/20 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 animate-pulse" />
          <p className="text-indigo-300 text-xs leading-relaxed">
            Al registrarte, tu institución quedará activa en modo <strong className="text-indigo-200">Prueba</strong> de forma inmediata, sin necesidad de verificación previa.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white/3 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
          <h1 className="text-xl font-semibold text-white mb-6">Datos de la Institución</h1>

          <form action={formAction} className="space-y-4">

            {/* Nombre Legal */}
            <div>
              <label htmlFor="nombre_legal" className="block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wide">
                Nombre Legal de la Institución <span className="text-red-400">*</span>
              </label>
              <input
                id="nombre_legal"
                name="nombre_legal"
                type="text"
                required
                autoComplete="organization"
                placeholder="Ej: Colegio Técnico Metropolitano S.A.S."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
              />
            </div>

            {/* NIT */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="nit" className="block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wide">
                  NIT / RUT <span className="text-red-400">*</span>
                </label>
                <input
                  id="nit"
                  name="nit"
                  type="text"
                  required
                  placeholder="900.123.456-7"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                />
              </div>
              <div>
                <label htmlFor="dominio" className="block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wide">
                  Dominio Personalizado
                </label>
                <input
                  id="dominio"
                  name="dominio"
                  type="text"
                  placeholder="mi-colegio.edu.co"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="pt-2 pb-1">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] text-white/35 uppercase tracking-widest font-medium">Administrador</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>

            {/* Nombre del admin */}
            <div>
              <label htmlFor="nombre_admin" className="block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wide">
                Nombre completo del Rector / Director <span className="text-red-400">*</span>
              </label>
              <input
                id="nombre_admin"
                name="nombre_admin"
                type="text"
                required
                autoComplete="name"
                placeholder="Ej: Carlos Alberto Mora Gómez"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email_admin" className="block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wide">
                Correo electrónico de acceso <span className="text-red-400">*</span>
              </label>
              <input
                id="email_admin"
                name="email_admin"
                type="email"
                required
                autoComplete="email"
                placeholder="director@colegio.edu.co"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="contrasena" className="block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wide">
                Contraseña de acceso <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="contrasena"
                  name="contrasena"
                  type={showPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPwd ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-white/30 mt-1.5">Mínimo 8 caracteres. Combina letras, números y símbolos.</p>
            </div>

            {/* Error */}
            {state?.error && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-300 text-sm">{state.error}</p>
              </div>
            )}

            {/* Legal notice */}
            <p className="text-xs text-white/30 leading-relaxed">
              Al crear la cuenta confirmas que tienes autorización legal para representar a la institución y aceptas los Términos de Servicio de Sophos Core. Los datos se almacenan con cifrado de extremo a extremo y están sujetos a políticas de aislamiento multi-inquilino.
            </p>

            {/* Submit */}
            <button
              id="btn-register"
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-sm font-semibold text-white transition-all duration-200 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 mt-2"
            >
              {isPending ? (
                <><Spinner /> Registrando institución...</>
              ) : (
                <>Registrar Institución <IconArrow /></>
              )}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-white/35 mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" id="link-login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
}
