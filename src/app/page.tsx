import Link from "next/link";

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
      <div className="relative bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm overflow-hidden shadow-2xl">
        {/* Header bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-white/40 ml-2 font-mono">Sophos Core — Boletín Académico</span>
        </div>

        {/* Student info */}
        <div className="px-5 py-4 border-b border-white/8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest">Estudiante</p>
              <p className="text-sm font-semibold text-white mt-0.5">Valentina Rodríguez M.</p>
              <p className="text-xs text-white/50">10° Grado · Período 2 · 2025</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40 uppercase tracking-widest">Promedio</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">8.0</p>
            </div>
          </div>
        </div>

        {/* Grades table */}
        <div className="divide-y divide-white/5">
          {grades.map((row) => (
            <div key={row.subject} className="px-5 py-3 hover:bg-white/3 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/90">{row.subject}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                      row.grade >= 9 ? "bg-emerald-500/20 text-emerald-400" :
                      row.grade >= 7 ? "bg-indigo-500/20 text-indigo-400" :
                      "bg-amber-500/20 text-amber-400"
                    }`}>
                      {row.grade}
                    </span>
                  </div>
                  {/* AI Comment */}
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <span className="mt-0.5 shrink-0">
                      <svg viewBox="0 0 24 24" className="w-3 h-3 text-cyan-400" fill="currentColor">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 0-2 0v-.07A8 8 0 0 1 4.07 11H5a1 1 0 0 0 0-2h-.93A8 8 0 0 1 11 4.07V5a1 1 0 0 0 2 0v-.93A8 8 0 0 1 19.93 11H19a1 1 0 0 0 0 2h.93A8 8 0 0 1 13 16.93z"/>
                      </svg>
                    </span>
                    <p className="text-xs text-white/40 leading-relaxed">{row.ai}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white/3 border-t border-white/8">
          <p className="text-xs text-white/30 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Comentarios generados por Sophos AI · Actualizado hace 2 min
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── FEATURE CARD ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description, accent }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <div className={`group relative p-6 rounded-2xl bg-white/3 border border-white/8 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-950/50`}>
      <div className={`inline-flex p-3 rounded-xl mb-4 ${accent}`}>
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{description}</p>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-white overflow-x-hidden">

      {/* ── Ambient glow ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/15 blur-[120px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-cyan-500/8 blur-[100px] rounded-full" />
        <div className="absolute bottom-1/4 left-0 w-[350px] h-[350px] bg-violet-600/8 blur-[100px] rounded-full" />
      </div>

      {/* ── NAVBAR ── */}
      <header className="relative z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/favicon.png" alt="Sophos Core Logo" className="w-8 h-8 object-contain rounded-lg shadow-lg shadow-indigo-500/20" />
            <span className="text-base font-bold tracking-tight">
              Sophos<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"> Core</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <a href="#features" className="hover:text-white transition-colors">Características</a>
            <a href="#ai" className="hover:text-white transition-colors">IA Académica</a>
            <a href="#institutions" className="hover:text-white transition-colors">Instituciones</a>
          </div>

          {/* CTA */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-all duration-200 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
          >
            Acceso Portal
            <IconArrow />
          </Link>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">

          {/* Left: Copy */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Plataforma educativa con IA integrada
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
              La gestión académica{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                del futuro
              </span>
              {", hoy."}
            </h1>

            <p className="text-lg text-white/55 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
              Centraliza cursos, materias, calificaciones y asistencias de tus instituciones en una sola plataforma moderna potenciada con análisis de{" "}
              <span className="text-cyan-400 font-medium">Inteligencia Artificial</span>.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <Link
                href="/signup"
                id="cta-register"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-violet-500 text-sm font-semibold transition-all duration-200 shadow-xl shadow-indigo-600/40 hover:shadow-indigo-500/50 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
              >
                Registrar Institución
                <IconArrow />
              </Link>
              <a
                href="#features"
                id="cta-explore"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm font-semibold transition-all duration-200 w-full sm:w-auto justify-center"
              >
                Ver Características
              </a>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex items-center gap-6 justify-center lg:justify-start text-sm text-white/40">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Multi-institución
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                RLS & Seguridad total
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
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
      <section id="features" className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">Características</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Todo lo que una institución necesita
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-base leading-relaxed">
            Diseñado para directivos, docentes y coordinadores que exigen precisión, velocidad y datos inteligentes.
          </p>
        </div>

        <div id="ai" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <FeatureCard
            icon={<IconBrain />}
            title="IA Académica"
            description="Comentarios automáticos y predictivos sobre el rendimiento de cada estudiante, generados por inteligencia artificial en tiempo real."
            accent="bg-violet-500/15 text-violet-400"
          />
          <FeatureCard
            icon={<IconBook />}
            title="Asignaciones y Cursos"
            description="Gestiona grupos, docentes y materias por año lectivo. Asigna docentes a cursos con un flujo simple y centralizado."
            accent="bg-indigo-500/15 text-indigo-400"
          />
          <FeatureCard
            icon={<IconCalendar />}
            title="Control de Asistencia"
            description="Registra y visualiza asistencias por asignación académica. Identifica patrones de ausentismo al instante."
            accent="bg-cyan-500/15 text-cyan-400"
          />
          <FeatureCard
            icon={<IconBuilding />}
            title="Multi-institución"
            description="Cada institución tiene su propio espacio aislado y seguro. Gestiona múltiples sedes desde un solo panel."
            accent="bg-emerald-500/15 text-emerald-400"
          />
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className="border-y border-white/5 bg-white/2">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "100%", label: "Datos bajo RLS" },
            { value: "30 min", label: "Cierre automático inactivo" },
            { value: "IA", label: "Comentarios inteligentes" },
            { value: "SSR", label: "Renderizado seguro" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">{stat.value}</p>
              <p className="text-sm text-white/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 text-center">
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-cyan-600/10 rounded-3xl blur-3xl" />
          <div className="relative bg-white/3 border border-white/10 rounded-3xl p-10 md:p-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-4">Para directivos e instituciones</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Empieza a transformar tu institución
            </h2>
            <p className="text-white/50 mb-8 leading-relaxed">
              Crea tu cuenta institucional y comienza a centralizar la gestión académica con el respaldo de datos seguros e inteligencia artificial.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                id="cta-register-footer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-sm font-semibold transition-all duration-200 shadow-xl shadow-indigo-600/40 hover:-translate-y-0.5 justify-center"
              >
                Crear cuenta institucional
                <IconArrow />
              </Link>
              <Link
                href="/login"
                id="cta-login-footer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm font-semibold transition-all duration-200 justify-center"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
              </svg>
            </div>
            <span className="font-medium text-white/50">Sophos Core</span>
          </div>
          <p>© 2025 Sophos Core · Plataforma de gestión académica inteligente</p>
        </div>
      </footer>
    </div>
  );
}
