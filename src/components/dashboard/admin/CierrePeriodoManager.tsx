'use client';

import { useState, useEffect } from 'react';
import { getPeriodosStatus, closePeriod, getDashboardStats, PeriodoStatus } from '@/app/actions/cierre-actions';

interface CierrePeriodoManagerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  students?: any[];
}

export function CierrePeriodoManager({ students = [] }: CierrePeriodoManagerProps) {
  const [periodos, setPeriodos] = useState<PeriodoStatus[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriodForBulletins, setSelectedPeriodForBulletins] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{ periodId: string; numero: number } | null>(null);

  // Cargar datos
  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resP = await getPeriodosStatus();
      if (resP.success && resP.data) {
        setPeriodos(resP.data);
        const closedPeriod = resP.data.find(p => p.cerrado);
        const activePeriod = resP.data.find(p => p.activo);
        setSelectedPeriodForBulletins(closedPeriod?.id_periodo || activePeriod?.id_periodo || '');
      } else {
        setErrorMsg(resP.error || 'No se pudieron cargar los períodos.');
      }

      const resS = await getDashboardStats();
      if (resS.success && resS.data) {
        setStats(resS.data);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Manejar el cierre de un período (abrir modal)
  const handleClosePeriod = (periodId: string, numero: number) => {
    setConfirmModal({ periodId, numero });
  };

  // Ejecutar el cierre real tras la confirmación
  const executeClosePeriod = async () => {
    if (!confirmModal) return;
    const { periodId, numero } = confirmModal;
    setConfirmModal(null);

    setClosingId(periodId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await closePeriod(periodId);
      if (res.success) {
        setSuccessMsg(`¡Período ${numero} cerrado exitosamente! Boletines consolidados creados.`);
        await loadData();
      } else {
        setErrorMsg(res.error || `Ocurrió un error al cerrar el período ${numero}.`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Error al procesar el cierre.');
    } finally {
      setClosingId(null);
    }
  };

  // Filtrar estudiantes por búsqueda
  const filteredStudents = students.filter(student =>
    student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenBulletin = (matriculaId: string) => {
    if (!selectedPeriodForBulletins) {
      alert('Por favor selecciona un período válido.');
      return;
    }
    window.open(`/dashboard/admin/boletin/${matriculaId}/${selectedPeriodForBulletins}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground">Cargando datos de periodos e indicadores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-350">
      
      {/* Mensajes de Alerta */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-200 text-sm">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-200 text-sm font-semibold">
          {successMsg}
        </div>
      )}

      {/* SECCIÓN 1: CONTROL DE PERÍODOS */}
      <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-md relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/5 blur-[50px] pointer-events-none" />
        
        <div className="mb-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cronograma y Cierre de Período Académico
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Supervisión del avance académico institucional y cierre de períodos lectivos.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {periodos.map((p) => {
            const isClosing = closingId === p.id_periodo;
            
            return (
              <div 
                key={p.id_periodo}
                className={`relative p-5 rounded-xl border transition-all duration-300 ${
                  p.activo 
                    ? 'bg-primary/10 border-primary/40 shadow-md' 
                    : p.cerrado
                      ? 'bg-teal-500/5 border-teal-500/25'
                      : 'bg-background border-border opacity-70'
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  {p.activo && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground animate-pulse">
                      Activo
                    </span>
                  )}
                  {p.cerrado && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-600 dark:text-teal-400">
                      Cerrado
                    </span>
                  )}
                  {!p.activo && !p.cerrado && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-secondary text-muted-foreground">
                      Pendiente
                    </span>
                  )}
                </div>

                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Período {p.numero_periodo}</div>
                <div className="text-xl font-bold text-foreground mt-1">Fase {p.numero_periodo}</div>
                
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <p>Inicio: {new Date(p.fecha_inicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</p>
                  <p>Fin: {new Date(p.fecha_fin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</p>
                </div>

                {/* Progress for Active Period */}
                {p.activo && (
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                      <span>Planilla Notas</span>
                      <span>{p.avanceNotas}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                        style={{ width: `${p.avanceNotas}%` }}
                      />
                    </div>
                    
                    <button
                      onClick={() => handleClosePeriod(p.id_periodo, p.numero_periodo)}
                      disabled={isClosing}
                      className="w-full mt-4 flex items-center justify-center py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs font-bold text-primary-foreground transition-all shadow-md cursor-pointer"
                    >
                      {isClosing ? (
                        <>
                          <div className="animate-spin w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                          Cerrando...
                        </>
                      ) : (
                        'Cerrar Período'
                      )}
                    </button>
                  </div>
                )}

                {/* Info for Closed Period */}
                {p.cerrado && (
                  <div className="mt-5 pt-3 border-t border-teal-500/10 text-center">
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">Calificaciones consolidadas e inmutables</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 2: INDICADORES E HISTORIAL */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CUADRO DE HONOR (TOP ALUMNOS) */}
          <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-md relative flex flex-col justify-between shadow-xs">
            <div>
              <div className="mb-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Cuadro de Honor (Mejores Promedios)
                </h3>
                <p className="text-[10px] text-muted-foreground">Estudiantes destacados de la institución.</p>
              </div>

              {stats.cuadroHonor && stats.cuadroHonor.length > 0 ? (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {stats.cuadroHonor.map((est: any, index: number) => {
                    const placeBg = index === 0 
                      ? 'from-amber-500/15 to-amber-500/5 border-amber-500/30' 
                      : index === 1 
                        ? 'from-slate-500/15 to-slate-500/5 border-slate-400/30' 
                        : 'from-amber-700/15 to-amber-800/5 border-amber-700/30';
                    
                    const trophyColor = index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-amber-700';

                    return (
                      <div 
                        key={est.id_matricula}
                        className={`flex items-center justify-between p-3 rounded-xl bg-gradient-to-r border transition-all duration-300 hover:translate-x-1 ${placeBg}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-extrabold ${trophyColor}`}>#{index + 1}</span>
                          <div>
                            <p className="text-xs font-bold text-foreground">{est.nombre}</p>
                            <p className="text-[10px] text-muted-foreground">IE Jose María Carbonell</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-foreground">{est.promedio}</span>
                          <span className="text-[9px] text-muted-foreground block">/ 5.0</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">No hay datos académicos disponibles.</div>
              )}
            </div>
            
            <div className="pt-4 border-t border-border text-[9px] text-muted-foreground flex items-center gap-1.5 mt-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Actualizado dinámicamente según calificaciones registradas.
            </div>
          </div>

          {/* RENDIMIENTO Y REPROBACIÓN POR ASIGNATURA */}
          <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-md lg:col-span-2 shadow-xs">
            <div className="mb-6">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
                Índice de Reprobación por Asignatura (Definitivas &lt; 3.0)
              </h3>
              <p className="text-[10px] text-muted-foreground">Porcentaje de estudiantes con notas deficientes por materia.</p>
            </div>

            {stats.reprobacionMaterias && stats.reprobacionMaterias.length > 0 ? (
              <div className="space-y-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {stats.reprobacionMaterias.map((rep: any) => (
                  <div key={rep.materia} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-foreground">{rep.materia}</span>
                      <span className={`font-bold ${rep.porcentajeReprobacion > 20 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                        {rep.porcentajeReprobacion}% reprobados
                      </span>
                    </div>
                    <svg className="w-full h-2.5 rounded-full overflow-hidden bg-secondary" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <rect 
                        x="0" 
                        y="0" 
                        width={rep.porcentajeReprobacion} 
                        height="10" 
                        fill={rep.porcentajeReprobacion > 20 ? 'url(#rose-grad)' : 'url(#purple-grad)'} 
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="rose-grad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#f43f5e" />
                          <stop offset="100%" stopColor="#fda4af" />
                        </linearGradient>
                        <linearGradient id="purple-grad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
                No hay suficientes calificaciones ingresadas para evaluar reprobaciones.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN 3: ACCESO Y DESCARGA DE BOLETINES */}
      <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-md shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <svg className="w-4.5 h-4.5 text-teal-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Consolidación e Impresión de Boletines
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Selecciona el período cerrado para ver la lista de alumnos e imprimir boletines oficiales.</p>
          </div>
          
          {/* Selector de periodo */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-semibold">Período:</span>
            <select
              value={selectedPeriodForBulletins}
              onChange={(e) => setSelectedPeriodForBulletins(e.target.value)}
              className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer"
            >
              <option value="" disabled className="bg-card text-foreground">Selecciona período</option>
              {periodos.map(p => (
                <option 
                  key={p.id_periodo} 
                  value={p.id_periodo} 
                  className="bg-card text-foreground"
                >
                  Período {p.numero_periodo} {p.cerrado ? '(Cerrado)' : p.activo ? '(Activo)' : '(Pendiente)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buscador de Estudiantes */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar estudiante por nombre o correo electrónico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-xl py-2 px-4 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>

        {/* Lista de Alumnos */}
        {filteredStudents.length > 0 ? (
          <div className="overflow-hidden border border-border rounded-xl bg-card custom-scrollbar overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-5">Nombre Completo</th>
                  <th className="py-3 px-5">Email</th>
                  <th className="py-3 px-5">Estado</th>
                  <th className="py-3 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filteredStudents.map((stud) => {
                  const isPeriodClosed = periodos.find(p => p.id_periodo === selectedPeriodForBulletins)?.cerrado;
                  
                  return (
                    <tr key={stud.id} className="hover:bg-secondary/40 transition-all">
                      <td className="py-3.5 px-5 font-semibold text-foreground">{stud.name}</td>
                      <td className="py-3.5 px-5 text-muted-foreground">{stud.email || 'Sin correo'}</td>
                      <td className="py-3.5 px-5">
                        {isPeriodClosed ? (
                          <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-300 font-bold text-[10px] uppercase">
                            Boletín Listo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold text-[10px] uppercase">
                            Periodo Abierto
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => handleOpenBulletin(stud.id_matricula || stud.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all cursor-pointer text-[11px] shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver / Imprimir Boletín
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-muted-foreground">
            {searchQuery ? 'Ningún estudiante coincide con la búsqueda.' : 'No hay estudiantes registrados en la sede.'}
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN DE CIERRE */}
      {confirmModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setConfirmModal(null)}
        >
          <div 
            className="bg-card border border-border rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95 duration-200 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera / Warning Icon */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">¿Cerrar Período Académico {confirmModal.numero}?</h3>
                <p className="text-[11px] text-muted-foreground">Esta es una acción inmutable y administrativa.</p>
              </div>
            </div>

            {/* Detalles / Advertencias */}
            <div className="space-y-3 my-4 bg-background border border-border rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground">Al confirmar el cierre de este período se realizarán los siguientes procesos:</p>
              <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
                <li>Se calcularán los <strong>promedios ponderados</strong> por asignatura.</li>
                <li>Se guardarán copias históricas inmutables de los boletines.</li>
                <li><strong>Se congelarán las planillas</strong>; los docentes no podrán modificar calificaciones.</li>
                <li>Se activará de forma automática el siguiente período académico.</li>
              </ul>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-border bg-secondary text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executeClosePeriod}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Confirmar y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
