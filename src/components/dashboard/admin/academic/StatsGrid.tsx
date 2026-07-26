interface StatsGridProps {
  totalStudents: number;
  promedioAcademico?: string;
  asistenciaPromedio?: string;
  aiAnalysisCount?: number;
}

export function StatsGrid({ 
  totalStudents, 
  promedioAcademico = '-', 
  asistenciaPromedio = '-', 
  aiAnalysisCount = 0 
}: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {/* Total Estudiantes */}
      <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-sm shadow-md">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Estudiantes</p>
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className="text-2xl font-bold text-foreground">{totalStudents}</span>
          <span className="text-[10px] text-emerald-500 bg-emerald-500/15 font-semibold px-2 py-0.5 rounded-full">Activos</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">Sedes activas: 1</p>
      </div>

      {/* Promedio Académico */}
      <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-sm shadow-md">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Promedio Académico</p>
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className={`text-2xl font-bold ${promedioAcademico === '-' ? 'text-muted-foreground/60' : 'text-foreground'}`}>
            {promedioAcademico}
          </span>
          {promedioAcademico !== '-' && (
            <span className="text-[10px] text-indigo-500 bg-indigo-500/15 font-bold px-2 py-0.5 rounded-full">Procesado</span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">Meta institucional: 4.00</p>
      </div>

      {/* Asistencia Promedio */}
      <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-sm shadow-md">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Asistencia Promedio</p>
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className={`text-2xl font-bold ${asistenciaPromedio === '-' ? 'text-muted-foreground/60' : 'text-foreground'}`}>
            {asistenciaPromedio}
          </span>
          {asistenciaPromedio !== '-' && (
            <span className="text-[10px] text-teal-500 bg-teal-500/15 font-bold px-2 py-0.5 rounded-full font-mono">Consolidado</span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">Objetivo mínimo: 90.0%</p>
      </div>

      {/* Análisis de IA Generados */}
      <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-sm shadow-md">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Análisis de IA Generados</p>
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className="text-2xl font-bold text-foreground">{aiAnalysisCount}</span>
          <span className="text-[10px] text-cyan-500 bg-cyan-500/20 font-bold px-2.5 py-0.5 rounded-full">Activo</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">Motor de predicción activo</p>
      </div>
    </div>
  );
}
