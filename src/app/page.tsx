'use client';

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme";
import { DemoLauncherModal } from "@/components/demo";

// ─── ICONS ────────────────────────────────────────────────────────────────────
function IconBrain() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M16 10h.01M8 10h.01M12 14h.01M16 14h.01M8 14h.01" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconSheets() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-emerald-500">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconCross() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-muted-foreground/60">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

// ─── DASHBOARD MOCKUP ─────────────────────────────────────────────────────────
function DashboardMockup() {
  const grades = [
    { subject: "Matemáticas", grade: 9.2, ai: "Rendimiento sobresaliente. Se recomienda profundizar en álgebra lineal.", trend: "up" },
    { subject: "Historia",    grade: 7.8, ai: "Progreso constante. Reforzar fechas del período colonial.",            trend: "up" },
    { subject: "Ciencias",    grade: 8.5, ai: "Excelente participación en laboratorios. Mantener ritmo.",             trend: "up" },
    { subject: "Lengua",      grade: 6.4, ai: "Dificultades en comprensión lectora. Se sugiere tutoría adicional.",   trend: "down" },
  ];

  return (
    <div className="relative w-full max-w-lg">
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-transparent to-cyan-500/20 rounded-2xl blur-3xl" />

      {/* Main card */}
      <div className="relative bg-card border border-border rounded-2xl backdrop-blur-sm overflow-hidden shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-muted-foreground ml-2 font-mono">Sophos Core — Boletín Académico</span>
        </div>

        {/* Student info */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Estudiante</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">Valentina Rodríguez M.</p>
              <p className="text-xs text-muted-foreground">10° Grado · Período 2 · 2025</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-widest">Promedio</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">8.0</p>
            </div>
          </div>
        </div>

        {/* Grades table */}
        <div className="divide-y divide-border">
          {grades.map((row) => (
            <div key={row.subject} className="px-5 py-3 hover:bg-secondary/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{row.subject}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      row.grade >= 8.0 ? 'bg-emerald-500/15 text-emerald-500' :
                      row.grade >= 7.0 ? 'bg-indigo-500/15 text-indigo-500' :
                      'bg-amber-500/15 text-amber-500'
                    }`}>
                      {row.grade >= 8.0 ? 'Alto' : row.grade >= 7.0 ? 'Básico' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1 flex items-center gap-1">
                    <span className="text-cyan-500 font-bold text-[10px]">IA</span> {row.ai}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-foreground font-mono">{row.grade.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FEATURE CARD ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="group relative bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${accent} transition-transform group-hover:scale-110 duration-200`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Ambient glow ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-cyan-500/8 blur-[100px] rounded-full" />
        <div className="absolute bottom-1/4 left-0 w-[350px] h-[350px] bg-violet-600/8 blur-[100px] rounded-full" />
      </div>

      {/* ── NAVBAR ── */}
      <header className="relative z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/favicon.png" alt="Sophos Core Logo" className="w-8 h-8 object-contain rounded-lg shadow-sm" />
            <span className="text-base font-bold tracking-tight text-foreground">
              Sophos<span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent"> Core</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground font-medium">
            <a href="#features" className="hover:text-foreground transition-colors">Características</a>
            <a href="#automatizacion" className="hover:text-foreground transition-colors">Automatización Sheets</a>
            <a href="#comparativa" className="hover:text-foreground transition-colors">Comparativa</a>
            <a href="#ai" className="hover:text-foreground transition-colors">IA Académica</a>
          </div>

          {/* Actions: Theme Toggle & CTA */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setDemoModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-bold transition-all duration-200 cursor-pointer"
            >
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              Probar Demo
            </button>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Acceso Portal
              <IconArrow />
            </Link>
          </div>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-16 md:pt-28 md:pb-24">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left: Copy */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              Plataforma educativa con IA integrada
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6 text-foreground">
              La gestión académica{" "}
              <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
                del futuro
              </span>
              {", hoy."}
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Centraliza cursos, materias, calificaciones y asistencias de tus instituciones en una sola plataforma moderna potenciada con análisis de{" "}
              <span className="text-cyan-500 dark:text-cyan-400 font-semibold">Inteligencia Artificial</span>.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <button
                onClick={() => setDemoModalOpen(true)}
                id="cta-demo"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 w-full sm:w-auto justify-center cursor-pointer"
              >
                <span className="text-base">✨</span>
                Probar Demo en Vivo
                <IconArrow />
              </button>
              <Link
                href="/signup"
                id="cta-register"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-card hover:bg-secondary border border-border text-foreground text-sm font-semibold transition-all duration-200 w-full sm:w-auto justify-center"
              >
                Registrar Institución
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex flex-wrap items-center gap-4 sm:gap-6 justify-center lg:justify-start text-xs sm:text-sm text-muted-foreground font-medium">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Multi-institución
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                RLS & Seguridad total
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                IA integrada
              </div>
            </div>
          </div>

          {/* Right: Mockup */}
          <div className="flex-1 flex justify-center lg:justify-end w-full">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">Características</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
            Todo lo que una institución necesita
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
            Diseñado para directivos, docentes y coordinadores que exigen precisión, velocidad y datos inteligentes.
          </p>
        </div>

        <div id="ai" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <FeatureCard
            icon={<IconBrain />}
            title="IA Académica"
            description="Comentarios automáticos y predictivos sobre el rendimiento de cada estudiante, generados por inteligencia artificial en tiempo real."
            accent="bg-violet-500/15 text-violet-500"
          />
          <FeatureCard
            icon={<IconBook />}
            title="Asignaciones y Cursos"
            description="Gestiona grupos, docentes y materias por año lectivo. Asigna docentes a cursos con un flujo simple y centralizado."
            accent="bg-indigo-500/15 text-indigo-500"
          />
          <FeatureCard
            icon={<IconCalendar />}
            title="Control de Asistencia"
            description="Registra y visualiza asistencias por asignación académica. Identifica patrones de ausentismo al instante."
            accent="bg-cyan-500/15 text-cyan-500"
          />
          <FeatureCard
            icon={<IconBuilding />}
            title="Multi-institución"
            description="Cada institución tiene su propio espacio aislado y seguro. Gestiona múltiples sedes desde un solo panel."
            accent="bg-emerald-500/15 text-emerald-500"
          />
        </div>
      </section>

      {/* ── AUTOMATION WITH SERVERLESS & SHEETS ── */}
      <section id="automatizacion" className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 border-t border-border/60">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-semibold mb-4">
            <IconZap />
            <span>Motor de Automatización Integrado</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-foreground">
            Dile adiós a la digitación{" "}
            <span className="bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
              manual de notas
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            Tus docentes continúan trabajando en sus hojas de cálculo habituales. Nuestro motor en la nube normaliza, audita y consolida miles de calificaciones en segundos.
          </p>
        </div>

        {/* Pipeline / Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative mb-16">
          {/* Step 1 */}
          <div className="relative bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-cyan-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 font-bold">
                1
              </div>
              <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                <IconSheets />
                Google Sheets / Excel
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tus profesores registran actividades y evidencias en su planilla compartida o formato habitual.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-emerald-500 font-medium">
              ✓ Cero curva de aprendizaje
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-cyan-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-4 font-bold">
                2
              </div>
              <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                <IconRefresh />
                Motor Cloud Inteligente
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Reconoce variaciones de nombres de pestañas, limpia espacios y mapea evidencias automáticamente.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-cyan-500 font-medium">
              ✓ Flexibilidad en formatos
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-cyan-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4 font-bold">
                3
              </div>
              <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                <IconBrain />
                Auditoría en Base de Datos
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Valida matrículas, detecta alumnos no registrados y procesa calificaciones de forma atómica y segura.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-indigo-500 font-medium">
              ✓ Seguridad RLS por Colegio
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative bg-card border border-border rounded-2xl p-6 shadow-sm hover:border-cyan-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-4 font-bold">
                4
              </div>
              <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                <IconBook />
                Boletines & Cuadros de Honor
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generación automática de boletines oficiales PDF, cálculo de puestos y estadísticas de reprobación.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-violet-500 font-medium">
              ✓ Cierre de período al instante
            </div>
          </div>
        </div>

        {/* ── CONCIERGE ONBOARDING CARD ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900/30 via-card to-cyan-900/20 border border-primary/20 rounded-3xl p-8 sm:p-10 shadow-xl mb-20">
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-primary/20 text-primary text-xs font-semibold mb-3">
                🤝 Onboarding Asistido Cero Fricción
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                ¿Tu colegio ya tiene planillas propias o necesita una plantilla a la medida?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Te entregamos la <strong>Plantilla Oficial Sophos Core</strong> lista para usar o, si tu institución ya cuenta con un formato estructurado en Excel, <strong>nuestro equipo técnico lo audita y calibra el motor de sincronización</strong> sin traumatismos para tus docentes.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
              >
                Comenzar Onboarding
                <IconArrow />
              </Link>
            </div>
          </div>
        </div>

        {/* ── COMPARISON TABLE ── */}
        <div id="comparativa" className="pt-6">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Comparativa de Servicio</p>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              ¿Por qué elegir Sophos Core frente al software tradicional?
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="py-4 px-6 text-sm font-bold text-foreground w-1/3">Aspecto</th>
                  <th className="py-4 px-6 text-sm font-semibold text-muted-foreground w-1/3">Software Escolar Tradicional</th>
                  <th className="py-4 px-6 text-sm font-bold bg-primary/10 text-primary w-1/3">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                      Sophos Core + Automatización Cloud
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="py-4 px-6 font-medium text-foreground">Ingreso de Calificaciones</td>
                  <td className="py-4 px-6 text-muted-foreground flex items-center gap-2">
                    <IconCross />
                    Digitación lenta nota por nota en formularios web.
                  </td>
                  <td className="py-4 px-6 bg-primary/5 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <IconCheck />
                      <span>Sincronización masiva instantánea desde Google Sheets / Excel.</span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="py-4 px-6 font-medium text-foreground">Flexibilidad y Nombres de Hojas</td>
                  <td className="py-4 px-6 text-muted-foreground flex items-center gap-2">
                    <IconCross />
                    Estructuras rígidas que fallan ante cualquier variación mínima.
                  </td>
                  <td className="py-4 px-6 bg-primary/5 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <IconCheck />
                      <span>Parser inteligente tolerante a variaciones de cursos y materias.</span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="py-4 px-6 font-medium text-foreground">Acompañamiento & Plantillas</td>
                  <td className="py-4 px-6 text-muted-foreground flex items-center gap-2">
                    <IconCross />
                    Manuales en PDF y tú debes adaptarte solo al software.
                  </td>
                  <td className="py-4 px-6 bg-primary/5 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <IconCheck />
                      <span>Onboarding asistido: te entregamos o adaptamos tu plantilla.</span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="py-4 px-6 font-medium text-foreground">Auditoría Previa al Cierre</td>
                  <td className="py-4 px-6 text-muted-foreground flex items-center gap-2">
                    <IconCross />
                    Errores detectados tarde al imprimir los boletines.
                  </td>
                  <td className="py-4 px-6 bg-primary/5 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <IconCheck />
                      <span>Reporte en tiempo real de alumnos o asignaturas pendientes.</span>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-secondary/20 transition-colors">
                  <td className="py-4 px-6 font-medium text-foreground">Retroalimentación al Estudiante</td>
                  <td className="py-4 px-6 text-muted-foreground flex items-center gap-2">
                    <IconCross />
                    Frases genéricas repetitivas e impersonales.
                  </td>
                  <td className="py-4 px-6 bg-primary/5 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <IconCheck />
                      <span>Comentarios cualitativos asistidos por Inteligencia Artificial.</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="border-y border-border bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "100%", label: "Datos bajo RLS" },
            { value: "30 min", label: "Cierre automático inactivo" },
            { value: "IA", label: "Comentarios inteligentes" },
            { value: "SSR", label: "Renderizado seguro" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/15 to-cyan-600/10 rounded-3xl blur-3xl" />
          <div className="relative bg-card border border-border rounded-3xl p-8 sm:p-12 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-500 mb-4">Para directivos e instituciones</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-foreground">
              Empieza a transformar tu institución
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Crea tu cuenta institucional y comienza a centralizar la gestión académica con el respaldo de datos seguros e inteligencia artificial.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setDemoModalOpen(true)}
                id="cta-demo-footer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 justify-center cursor-pointer"
              >
                <span>✨</span>
                Probar Demo en Vivo
                <IconArrow />
              </button>
              <Link
                href="/signup"
                id="cta-register-footer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-card hover:bg-secondary border border-border text-foreground text-sm font-semibold transition-all duration-200 justify-center"
              >
                Crear cuenta institucional
              </Link>
              <Link
                href="/login"
                id="cta-login-footer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-secondary/60 hover:bg-secondary border border-border text-foreground text-sm font-semibold transition-all duration-200 justify-center"
              >
                Acceso Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
              </svg>
            </div>
            <span className="font-semibold text-foreground">Sophos Core</span>
          </div>
          <p>© 2025 Sophos Core · Plataforma de gestión académica inteligente</p>
        </div>
      </footer>

      {/* ── MODAL DEMO LAUNCHER ── */}
      <DemoLauncherModal isOpen={demoModalOpen} onClose={() => setDemoModalOpen(false)} />
    </div>
  );
}
