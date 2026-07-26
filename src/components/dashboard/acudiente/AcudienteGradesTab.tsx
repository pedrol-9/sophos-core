'use client';

import React, { useState } from 'react';
import { StudentSubject } from './types';
import { IconSparkles } from '@/components/icons';

interface AcudienteGradesTabProps {
  subjects: StudentSubject[];
}

export function AcudienteGradesTab({ subjects }: AcudienteGradesTabProps) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  if (subjects.length === 0) {
    return (
      <div className="py-12 text-center border border-border border-dashed rounded-2xl bg-card text-muted-foreground text-xs font-medium">
        No hay materias ni calificaciones registradas para este año.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-[9px] font-bold uppercase tracking-wider bg-secondary/50">
                <th className="py-4 px-6">Asignatura</th>
                <th className="py-4 px-6 text-center">P1</th>
                <th className="py-4 px-6 text-center">P2</th>
                <th className="py-4 px-6 text-center">P3</th>
                <th className="py-4 px-6 text-center">P4</th>
                <th className="py-4 px-6 text-center">Faltas</th>
                <th className="py-4 px-6 text-right">Análisis Predictivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {subjects.map((sub) => {
                const isExpanded = expandedSubject === sub.id_asignacion;

                return (
                  <React.Fragment key={sub.id_asignacion}>
                    <tr className="hover:bg-secondary/40 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-[9px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded uppercase">
                          {sub.materiaArea}
                        </span>
                        <h4 className="text-sm font-bold text-foreground mt-1.5">{sub.materiaNombre}</h4>
                        <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                          Docente: {sub.docenteNombre}
                        </p>
                      </td>

                      {/* Period 1 */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            sub.grades.find((g) => g.periodo === 1)
                              ? (sub.grades.find((g) => g.periodo === 1)?.nota || 0) >= 3.0
                                ? 'text-teal-600 dark:text-teal-400 bg-teal-500/10'
                                : 'text-rose-500 bg-rose-500/10'
                              : 'text-muted-foreground/30'
                          }`}
                        >
                          {sub.grades.find((g) => g.periodo === 1)?.nota.toFixed(1) || '-.-'}
                        </span>
                      </td>

                      {/* Period 2 */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            sub.grades.find((g) => g.periodo === 2)
                              ? (sub.grades.find((g) => g.periodo === 2)?.nota || 0) >= 3.0
                                ? 'text-teal-600 dark:text-teal-400 bg-teal-500/10'
                                : 'text-rose-500 bg-rose-500/10'
                              : 'text-muted-foreground/30'
                          }`}
                        >
                          {sub.grades.find((g) => g.periodo === 2)?.nota.toFixed(1) || '-.-'}
                        </span>
                      </td>

                      {/* Period 3 */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            sub.grades.find((g) => g.periodo === 3)
                              ? (sub.grades.find((g) => g.periodo === 3)?.nota || 0) >= 3.0
                                ? 'text-teal-600 dark:text-teal-400 bg-teal-500/10'
                                : 'text-rose-500 bg-rose-500/10'
                              : 'text-muted-foreground/30'
                          }`}
                        >
                          {sub.grades.find((g) => g.periodo === 3)?.nota.toFixed(1) || '-.-'}
                        </span>
                      </td>

                      {/* Period 4 */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded ${
                            sub.grades.find((g) => g.periodo === 4)
                              ? (sub.grades.find((g) => g.periodo === 4)?.nota || 0) >= 3.0
                                ? 'text-teal-600 dark:text-teal-400 bg-teal-500/10'
                                : 'text-rose-500 bg-rose-500/10'
                              : 'text-muted-foreground/30'
                          }`}
                        >
                          {sub.grades.find((g) => g.periodo === 4)?.nota.toFixed(1) || '-.-'}
                        </span>
                      </td>

                      {/* Absences count */}
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            sub.absencesCount > 0
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {sub.absencesCount}
                        </span>
                      </td>

                      {/* AI comments trigger */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setExpandedSubject(isExpanded ? null : sub.id_asignacion)}
                          className="flex items-center gap-1 ml-auto px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold border border-primary/20 transition-all cursor-pointer"
                        >
                          <IconSparkles className="w-3 h-3" />
                          {isExpanded ? 'Ocultar IA' : 'Detalles / IA'}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded content */}
                    {isExpanded && (
                      <tr className="bg-primary/5">
                        <td colSpan={7} className="p-6 border-b border-border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Teacher feedback */}
                            <div className="space-y-2">
                              <h5 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                Observaciones del Docente
                              </h5>
                              <div className="p-4 rounded-xl bg-background border border-border text-xs text-foreground italic leading-relaxed">
                                {sub.grades.filter((g) => g.comentario_docente).length > 0 ? (
                                  sub.grades.map(
                                    (g) =>
                                      g.comentario_docente && (
                                        <p key={g.id_calificacion} className="mb-2 last:mb-0">
                                          <strong>Periodo {g.periodo}:</strong> &ldquo;{g.comentario_docente}&rdquo;
                                        </p>
                                      )
                                  )
                                ) : (
                                  'No se han registrado observaciones del profesor.'
                                )}
                              </div>
                            </div>

                            {/* IA report */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <IconSparkles className="w-3.5 h-3.5 text-primary" />
                                <h5 className="text-[9px] font-bold uppercase tracking-wider text-primary">
                                  Análisis Predictivo (IA)
                                </h5>
                              </div>
                              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground leading-relaxed italic">
                                {sub.grades.filter((g) => g.comentario_ia).length > 0 ? (
                                  sub.grades.map(
                                    (g) =>
                                      g.comentario_ia && (
                                        <p key={g.id_calificacion} className="mb-2.5 last:mb-0">
                                          <strong>Periodo {g.periodo}:</strong> {g.comentario_ia}
                                        </p>
                                      )
                                  )
                                ) : (
                                  'Aún no hay retroalimentación automática generada por el motor de IA.'
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
