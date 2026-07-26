'use server';

import * as adminActions from './evidencias/evidenciasAdminActions';
import * as docenteActions from './evidencias/evidenciasDocenteActions';
import * as gradesActions from './evidencias/evidenciasGradesActions';
import { ConfigEvidenciaPeriodo, CalificacionBatchItem } from './evidencias/types';

// Re-exportar tipos
export type {
  EvidenciaRow,
  EvidenciaAdminDetail,
  ConfigEvidenciaPeriodo,
  EvidenciaConConfig,
  GradesheetEvidenciaRow,
  GradesheetStudentEvidencias,
  CalificacionBatchItem,
} from './evidencias/types';

// Server Actions del Administrador
export async function extractGrado(nombreCurso: string) {
  return adminActions.extractGrado(nombreCurso);
}

export async function getEvidenciasAdmin(opts?: Parameters<typeof adminActions.getEvidenciasAdmin>[0]) {
  return adminActions.getEvidenciasAdmin(opts);
}

export async function getEvidenciasAdminFull(opts: Parameters<typeof adminActions.getEvidenciasAdminFull>[0]) {
  return adminActions.getEvidenciasAdminFull(opts);
}

export async function aprobarEvidenciaAdmin(idEvidencia: string) {
  return adminActions.aprobarEvidenciaAdmin(idEvidencia);
}

export async function rechazarEvidenciaAdmin(idEvidencia: string) {
  return adminActions.rechazarEvidenciaAdmin(idEvidencia);
}

export async function upsertEvidencia(evidencia: Parameters<typeof adminActions.upsertEvidencia>[0]) {
  return adminActions.upsertEvidencia(evidencia);
}

export async function deleteEvidencia(idEvidencia: string) {
  return adminActions.deleteEvidencia(idEvidencia);
}

// Server Actions del Docente
export async function sugerirEvidenciaDocente(opts: Parameters<typeof docenteActions.sugerirEvidenciaDocente>[0]) {
  return docenteActions.sugerirEvidenciaDocente(opts);
}

export async function getEvidenciasForAsignacion(idAsignacion: string, idPeriodo: string) {
  return docenteActions.getEvidenciasForAsignacion(idAsignacion, idPeriodo);
}

export async function saveConfigEvidenciasPeriodo(
  idAsignacion: string,
  idPeriodo: string,
  configs: ConfigEvidenciaPeriodo[]
) {
  return docenteActions.saveConfigEvidenciasPeriodo(idAsignacion, idPeriodo, configs);
}

export async function syncEvidencias11A11BData() {
  return docenteActions.syncEvidencias11A11BData();
}

// Server Actions de Calificaciones
export async function upsertCalificacionEvidencia(
  idAsignacion: string,
  idMatricula: string,
  idPeriodo: string,
  idEvidencia: string,
  nota: number
) {
  return gradesActions.upsertCalificacionEvidencia(idAsignacion, idMatricula, idPeriodo, idEvidencia, nota);
}

export async function getGradesheetByEvidencias(idCurso: string, idAsignacion: string, idPeriodo: string) {
  return gradesActions.getGradesheetByEvidencias(idCurso, idAsignacion, idPeriodo);
}

export async function upsertCalificacionesBatch(
  idAsignacion: string,
  idPeriodo: string,
  items: CalificacionBatchItem[]
) {
  return gradesActions.upsertCalificacionesBatch(idAsignacion, idPeriodo, items);
}
