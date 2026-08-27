export type EvidenciaRow = {
  id_evidencia: string;
  id_materia: string;
  grado: string;
  nombre: string;
  descripcion: string | null;
  ano_lectivo: number;
  orden: number;
  activo: boolean;
  estado_aprobacion?: 'APROBADA' | 'PENDIENTE' | 'RECHAZADA';
  id_docente_sugerido?: string | null;
};

export type EvidenciaAdminDetail = EvidenciaRow & {
  periodo_asignado?: string | null;
  peso_periodo?: number | null;
  docente_nombre?: string | null;
  usadaEnPeriodoAnterior?: boolean;
  periodoAnteriorNombre?: string | null;
  periodosUsadosNombres?: string[];
  esActivaEnPeriodoVigente?: boolean;
  pesosPorPeriodo?: Record<string, number>;
};

export type ConfigEvidenciaPeriodo = {
  id_evidencia: string;
  activo: boolean;
  /** Peso como fracción decimal, ej: 0.40 = 40% */
  peso: number;
};

export type EvidenciaConConfig = EvidenciaRow & {
  /** true si el docente la activó para este periodo */
  activaEnPeriodo: boolean;
  /** 0.0–1.0 */
  peso: number;
  /** true si ya fue activada en un periodo previo del mismo año lectivo */
  usadaEnPeriodoAnterior?: boolean;
  periodoAnteriorNombre?: string;
};

export type GradesheetEvidenciaRow = {
  id_calificacion: string | null;
  id_evidencia: string;
  nota: number | null;
  comentario_docente: string | null;
};

export type GradesheetStudentEvidencias = {
  id_matricula: string;
  id_estudiante: string;
  nombre_completo: string;
  email: string;
  /** Mapa id_evidencia → nota/comentario */
  grades: Record<string, GradesheetEvidenciaRow>;
};

export type CalificacionBatchItem = {
  idMatricula: string;
  idEvidencia: string;
  nota: number | null;
};
