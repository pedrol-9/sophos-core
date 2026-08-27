'use client';

import React from 'react';
import { GradesheetStudentEvidencias, EvidenciaConConfig } from '@/app/actions/academic/evidencias';

interface GradebookTableProps {
  students: GradesheetStudentEvidencias[];
  evidencias: EvidenciaConConfig[];
  localValues: Record<string, string>;
  pendingChanges: Record<string, { idMatricula: string; idEvidencia: string; nota: number | null }>;
  isPeriodoClosed: boolean;
  isExpandedWindow: boolean;
  isFullscreen: boolean;
  onGradeChange: (
    studentIdx: number,
    idEstudiante: string,
    idMatricula: string,
    idEvidencia: string,
    rawVal: string
  ) => void;
  onLocalValueUpdate: (cellKey: string, val: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, studentIdx: number, evIdx: number) => void;
  calculateDefinitiva: (student: GradesheetStudentEvidencias) => number;
  getDesempenoLabel: (definitiva: number) => string;
}

export function GradebookTable({
  students,
  evidencias,
  localValues,
  pendingChanges,
  isPeriodoClosed,
  isExpandedWindow,
  isFullscreen,
  onGradeChange,
  onLocalValueUpdate,
  onKeyDown,
  calculateDefinitiva,
  getDesempenoLabel,
}: GradebookTableProps) {
  const activasEvidencias = evidencias.filter((e) => e.activaEnPeriodo);

  if (students.length === 0 || evidencias.length === 0) {
    return null;
  }

  return (
    <div
      className={`bg-card border border-border rounded-2xl overflow-hidden shadow-xs ${
        isExpandedWindow || isFullscreen ? 'flex-1 flex flex-col min-h-0' : ''
      }`}
    >
      <div
        className={`custom-scrollbar ${
          isExpandedWindow || isFullscreen ? 'flex-1 overflow-auto' : 'overflow-x-auto'
        }`}
      >
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            {/* Fila 1: Evidencias activas y Consolidado */}
            <tr className="border-b border-border bg-secondary/30">
              <th
                className="py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider border-r border-border w-64"
                rowSpan={2}
              >
                Estudiante
              </th>

              {activasEvidencias.length > 0 && (
                <th
                  className="py-2 px-3 text-center text-[10px] font-bold text-primary bg-primary/5 uppercase tracking-widest border-r border-border"
                  colSpan={activasEvidencias.length}
                >
                  Evidencias del Periodo
                </th>
              )}

              <th
                className="py-3 px-4 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider"
                colSpan={2}
                rowSpan={1}
              >
                Consolidado
              </th>
            </tr>

            {/* Fila 2: Nombres y pesos de cada evidencia */}
            <tr className="border-b border-border bg-secondary/50 text-[10px] font-bold text-muted-foreground tracking-wider">
              {activasEvidencias.map((ev) => {
                const isPendiente = ev.estado_aprobacion === 'PENDIENTE';
                const isFew = activasEvidencias.length <= 2;
                return (
                  <th
                    key={`h-${ev.id_evidencia}`}
                    className={`py-2 px-3 text-center border-r border-border font-semibold ${
                      isFew ? 'min-w-[180px] sm:min-w-[260px]' : 'min-w-[110px] max-w-[180px]'
                    }`}
                  >
                    <span
                      className={`block text-xs font-bold text-foreground ${
                        isFew ? 'whitespace-normal leading-snug px-1' : 'truncate max-w-full'
                      }`}
                      title={ev.nombre}
                    >
                      {ev.nombre}
                    </span>
                    {isPendiente ? (
                      <span
                        className="block text-[9px] text-amber-500 font-bold mt-0.5"
                        title="Pendiente de aprobación por coordinación"
                      >
                        [Pendiente]
                      </span>
                    ) : (
                      <span className="block text-[9px] text-primary/80 font-normal mt-0.5">
                        {Math.round(ev.peso * 100)}%
                      </span>
                    )}
                  </th>
                );
              })}
              <th className="py-2 px-4 text-center border-r border-border w-24">Definitiva</th>
              <th className="py-2 px-4 text-center w-24">Desempeño</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border text-xs">
            {students.map((student, studentIdx) => {
              const definitiva = calculateDefinitiva(student);
              const desempeno = getDesempenoLabel(definitiva);

              return (
                <tr key={student.id_estudiante} className="hover:bg-secondary/40 transition-colors">
                  {/* Info Estudiante */}
                  <td className="py-3 px-4 border-r border-border font-semibold text-foreground">
                    <div className="truncate max-w-[240px]">{student.nombre_completo}</div>
                    <span className="block text-[10px] text-muted-foreground font-normal truncate max-w-[240px]">
                      {student.email}
                    </span>
                  </td>

                  {activasEvidencias.map((ev, evIdx) => {
                    const isPendiente = ev.estado_aprobacion === 'PENDIENTE';
                    const grade = student.grades[ev.id_evidencia];
                    const notaVal = grade?.nota ?? null;
                    const cellKey = `${student.id_matricula}-${ev.id_evidencia}`;
                    const displayVal =
                      localValues[cellKey] !== undefined
                        ? localValues[cellKey]
                        : notaVal !== null
                        ? notaVal.toString()
                        : '';
                    const hasPending = pendingChanges[cellKey] !== undefined;

                    return (
                      <td
                        key={`cell-${student.id_estudiante}-${ev.id_evidencia}`}
                        className="py-2 px-1 text-center border-r border-border relative group"
                      >
                        {isPendiente ? (
                          <div
                            className="inline-flex items-center justify-center w-14 py-1 border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300 rounded-lg text-[10px] font-semibold cursor-not-allowed mx-auto"
                            title="Pendiente de aprobación por coordinación"
                          >
                            Pendiente
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <input
                              id={`grade-${studentIdx}-${evIdx}`}
                              type="text"
                              disabled={isPeriodoClosed}
                              value={displayVal}
                              onChange={(e) => {
                                const rawStr = e.target.value;
                                if (rawStr !== '' && !/^[0-5]([.,]\d?)?$/.test(rawStr)) {
                                  return;
                                }

                                const valStr = rawStr.replace(',', '.');
                                onLocalValueUpdate(cellKey, rawStr);

                                onGradeChange(
                                  studentIdx,
                                  student.id_estudiante,
                                  student.id_matricula,
                                  ev.id_evidencia,
                                  valStr
                                );
                              }}
                              onKeyDown={(e) => onKeyDown(e, studentIdx, evIdx)}
                              className={`w-14 px-1.5 py-1 text-center font-bold text-xs bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                hasPending
                                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                                  : notaVal !== null && notaVal >= 3.0
                                  ? 'border-border text-teal-600 dark:text-teal-400 font-bold'
                                  : notaVal !== null
                                  ? 'border-border text-rose-500 font-bold'
                                  : 'border-border text-muted-foreground'
                              }`}
                            />
                            {hasPending && (
                              <span className="absolute bottom-0 text-[8px] text-amber-500 font-extrabold scale-75 animate-pulse">
                                *
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Definitiva */}
                  <td className="py-3 px-4 text-center border-r border-border">
                    <span
                      className={`text-sm font-extrabold px-2.5 py-1 rounded-lg border ${
                        definitiva >= 3.0
                          ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
                          : definitiva > 0
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : 'bg-secondary text-muted-foreground border-border'
                      }`}
                    >
                      {definitiva > 0 ? definitiva.toFixed(1) : '-.-'}
                    </span>
                  </td>

                  {/* Desempeño */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        desempeno === 'SUPERIOR'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : desempeno === 'ALTO'
                          ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                          : desempeno === 'BASICO'
                          ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                          : definitiva > 0
                          ? 'bg-rose-500/15 text-rose-500 border border-rose-500/20'
                          : 'text-muted-foreground bg-secondary'
                      }`}
                    >
                      {desempeno}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-secondary/30 border-t border-border text-left text-[10px] text-muted-foreground font-medium">
        Usa las flechas del teclado (▲ ▼ ◀ ▶) para moverte entre celdas.
      </div>
    </div>
  );
}
