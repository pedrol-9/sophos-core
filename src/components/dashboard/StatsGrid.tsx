export function StatsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total Estudiantes</p>
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className="text-2xl font-bold">1,248</span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/15 font-semibold px-2 py-0.5 rounded-full">+4.2%</span>
        </div>
        <p className="text-[11px] text-white/35 mt-1.5">Sedes activas: 3</p>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Promedio Académico</p>
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className="text-2xl font-bold">4.15 <span className="text-sm text-white/40 font-normal">/5.0</span></span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/15 font-semibold px-2 py-0.5 rounded-full">+0.12</span>
        </div>
        <p className="text-[11px] text-white/35 mt-1.5">Meta institucional: 4.00</p>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Asistencia Promedio</p>
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className="text-2xl font-bold">94.6%</span>
          <span className="text-[10px] text-rose-400 bg-rose-500/15 font-semibold px-2 py-0.5 rounded-full">-0.2%</span>
        </div>
        <p className="text-[11px] text-white/35 mt-1.5">Objetivo mínimo: 90.0%</p>
      </div>

      <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Análisis de IA Generados</p>
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className="text-2xl font-bold">348</span>
          <span className="text-[10px] text-cyan-400 bg-cyan-500/20 font-bold px-2.5 py-0.5 rounded-full">Sincro</span>
        </div>
        <p className="text-[11px] text-white/35 mt-1.5">Precisión estimada: 98%</p>
      </div>
    </div>
  );
}
