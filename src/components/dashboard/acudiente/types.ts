export interface SubjectGrade {
  id_calificacion: string;
  nota: number;
  periodo: number;
  comentario_docente: string | null;
  comentario_ia: string | null;
}

export interface StudentSubject {
  id_asignacion: string;
  materiaNombre: string;
  materiaArea: string;
  docenteNombre: string;
  grades: SubjectGrade[];
  absencesCount: number;
}

export interface AbsenceRecord {
  id_asistencia: string;
  fecha: string;
  estado: 'FALTA_JUSTIFICADA' | 'FALTA_INJUSTIFICADA';
  materiaNombre: string;
}

export interface ObservadorRecord {
  id_observador: string;
  tipo_nota: 'PEDAGOGICA' | 'DISCIPLINARIA' | 'LOGRO_DESTACADO';
  observacion_informal: string;
  observacion_formal_ia: string | null;
  fecha_registro: string;
  docenteNombre: string;
  firmado: boolean;
  fecha_firma: string | null;
  firmado_por: string | null;
  firmadorNombre?: string;
}

export interface KidProfile {
  id_estudiante: string;
  parentesco: string;
  nombre_completo: string;
  email: string;
}
