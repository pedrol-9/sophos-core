'use client';

interface AcudienteStatsHeaderProps {
  courseName: string;
  cumulativeAverage: string;
  academicStatus: string;
}

export function AcudienteStatsHeader({
  courseName,
  cumulativeAverage,
  academicStatus,
}: AcudienteStatsHeaderProps) {
  return (
    <div className="p-8 pb-0 shrink-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Course Name */}
        <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-sm shadow-xs">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Curso de Matrícula
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2 truncate">
            {courseName}
          </div>
          <div className="text-[10px] text-primary mt-1 font-semibold">
            Año Lectivo {new Date().getFullYear()}
          </div>
        </div>

        {/* Cumulative Average */}
        <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-sm shadow-xs">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Promedio Acumulado
          </div>
          <div className="text-2xl font-extrabold text-foreground mt-2 flex items-baseline gap-1.5">
            {cumulativeAverage}
            <span className="text-[11px] text-muted-foreground font-bold">/ 5.0</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Cálculo de todas las asignaturas</div>
        </div>

        {/* Semáforo */}
        <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-sm shadow-xs">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Semáforo de Desempeño
          </div>
          <div className="text-2xl font-extrabold mt-2">
            <span
              className={`${
                academicStatus === 'Excelente'
                  ? 'text-teal-600 dark:text-teal-400'
                  : academicStatus === 'Aprobando'
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-rose-500 animate-pulse'
              }`}
            >
              {academicStatus}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Estimación automática de IA</div>
        </div>
      </div>
    </div>
  );
}
