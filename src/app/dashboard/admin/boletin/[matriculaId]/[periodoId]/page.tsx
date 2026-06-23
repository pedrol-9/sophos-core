import { getStudentBulletin } from '@/app/actions/cierre-actions';
import { PrintButton, CloseButton } from '@/components/dashboard/admin/PrintActions';

interface BoletinPageProps {
  params: Promise<{
    matriculaId: string;
    periodoId: string;
  }>;
}

export default async function BoletinPage({ params }: BoletinPageProps) {
  const { matriculaId, periodoId } = await params;
  const res = await getStudentBulletin(matriculaId, periodoId);

  if (!res.success || !res.data) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <svg className="w-16 h-16 text-rose-500 mb-4 animate-bounce" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h1 className="text-xl font-bold text-rose-200">Error al Generar Boletín</h1>
        <p className="text-sm text-white/40 mt-1 max-w-md">{res.error || 'El boletín seleccionado no está disponible o el período no ha sido cerrado.'}</p>
        <CloseButton />
      </div>
    );
  }

  const b = res.data;
  const fechaCierre = new Date(b.fecha_cierre).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#070b13] text-white print:bg-white print:text-black font-sans py-10 px-4 sm:px-6">
      
      {/* Botón flotante para impresión (Oculto en impresión) */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden bg-white/3 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Vista Previa del Boletín</h3>
            <p className="text-[10px] text-white/40">Listo para descarga o impresión directa.</p>
          </div>
        </div>
        <PrintButton />
      </div>

      {/* BOLETÍN OFICIAL DE IMPRESIÓN */}
      <article className="max-w-4xl mx-auto bg-[#0d1220] border border-white/10 rounded-3xl p-8 sm:p-12 print:border-0 print:p-0 print:bg-white print:text-black print:rounded-none shadow-2xl relative">
        <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-indigo-500/[0.02] blur-[100px] pointer-events-none print:hidden" />
        
        {/* Cabecera Membrete */}
        <header className="border-b border-dashed border-white/10 print:border-black/20 pb-6 flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <div className="flex items-center gap-2.5 print:text-black">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white print:hidden">
                <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="currentColor">
                  <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                </svg>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-white print:text-black uppercase">
                {b.instituciones?.nombre_legal}
              </h1>
            </div>
            <p className="text-xs text-white/40 print:text-black/50 mt-1">NIT: {b.instituciones?.nit} • Sistema de Gestión Académica Sophos Core</p>
          </div>
          <div className="text-left md:text-right">
            <h2 className="text-sm font-black text-indigo-400 print:text-black tracking-widest uppercase">Boletín de Calificaciones</h2>
            <p className="text-xs text-white/50 print:text-black/50 mt-0.5">Período {b.periodos_academicos?.numero_periodo} • Año Lectivo {b.estudiantes_matriculados?.ano_lectivo}</p>
          </div>
        </header>

        {/* Datos del Estudiante */}
        <section className="my-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/[0.02] print:bg-black/[0.02] border border-white/8 print:border-black/10 rounded-2xl p-5 text-xs">
          <div>
            <span className="text-[10px] font-bold text-white/30 print:text-black/40 uppercase tracking-widest block">Estudiante</span>
            <strong className="text-sm font-bold text-white print:text-black mt-0.5 block">{b.estudiantes_matriculados?.usuarios?.nombre_completo}</strong>
            <span className="text-white/40 print:text-black/50 block mt-0.5">{b.estudiantes_matriculados?.usuarios?.email}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-white/30 print:text-black/40 uppercase tracking-widest block">Curso</span>
            <strong className="text-sm font-bold text-white print:text-black mt-0.5 block">{b.estudiantes_matriculados?.cursos?.nombre}</strong>
            <span className="text-white/40 print:text-black/50 block mt-0.5">Jornada Mañana</span>
          </div>
          <div className="text-left md:text-right border-t md:border-t-0 border-white/5 print:border-black/5 pt-3 md:pt-0">
            <span className="text-[10px] font-bold text-white/30 print:text-black/40 uppercase tracking-widest block">Promedio General</span>
            <strong className="text-2xl font-black text-indigo-400 print:text-black mt-0.5 block">
              {Number(b.promedio_general).toFixed(2)}
              <span className="text-[10px] font-semibold text-white/30 print:text-black/40 ml-1">/ 5.0</span>
            </strong>
          </div>
        </section>

        {/* Planilla de Notas Detallada */}
        <section className="my-8">
          <div className="overflow-hidden border border-white/10 print:border-black/20 rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 print:border-black/20 bg-white/3 print:bg-black/[0.03] text-[9px] font-black text-white/40 print:text-black/50 uppercase tracking-wider">
                  <th className="py-3 px-4 w-1/3">Asignatura</th>
                  <th className="py-3 px-4 text-center">Fallas</th>
                  <th className="py-3 px-4 text-center">Nota</th>
                  <th className="py-3 px-4 text-center">Desempeño</th>
                  <th className="py-3 px-4">Comentarios y Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-black/10">
                {(b.datos_materias || []).map((m: any) => {
                  const scoreColor = m.notaDefinitiva >= 4.0 
                    ? 'text-teal-400 print:text-black' 
                    : m.notaDefinitiva >= 3.0 
                      ? 'text-indigo-400 print:text-black' 
                      : 'text-red-400 print:text-black font-extrabold';

                  const badgeColor = m.nivelDesempeno === 'SUPERIOR'
                    ? 'bg-teal-500/10 text-teal-400 print:bg-black/5 print:text-black'
                    : m.nivelDesempeno === 'ALTO'
                      ? 'bg-indigo-500/10 text-indigo-400 print:bg-black/5 print:text-black'
                      : m.nivelDesempeno === 'BASICO'
                        ? 'bg-slate-500/10 text-slate-300 print:bg-black/5 print:text-black'
                        : 'bg-red-500/10 text-red-400 print:bg-black/5 print:text-black font-bold';

                  return (
                    <tr key={m.id_asignacion} className="print:break-inside-avoid">
                      <td className="py-4 px-4 align-top">
                        <span className="text-[9px] bg-white/5 print:bg-black/5 text-white/50 print:text-black/60 px-1.5 py-0.5 rounded font-mono uppercase">
                          {m.materiaArea}
                        </span>
                        <h4 className="font-bold text-white print:text-black text-sm mt-1">{m.materiaNombre}</h4>
                        <p className="text-[10px] text-white/30 print:text-black/50 mt-0.5">Docente: {m.docenteNombre}</p>
                      </td>
                      <td className="py-4 px-4 text-center align-top font-mono font-bold text-white/60 print:text-black/70">
                        {m.fallas || 0}
                      </td>
                      <td className="py-4 px-4 text-center align-top font-bold text-sm">
                        <span className={scoreColor}>
                          {Number(m.notaDefinitiva).toFixed(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center align-top">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ${badgeColor}`}>
                          {m.nivelDesempeno}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top text-[11px] text-white/50 print:text-black/70 space-y-1">
                        {m.comentarios && m.comentarios.length > 0 ? (
                          m.comentarios.map((c: string, idx: number) => (
                            <p key={idx} className="leading-relaxed border-l-2 border-indigo-500/30 print:border-black/20 pl-2">
                              {c}
                            </p>
                          ))
                        ) : (
                          <p className="italic text-white/30 print:text-black/40">Sin observaciones registradas.</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sección de Firmas */}
        <footer className="mt-16 pt-12 border-t border-dashed border-white/10 print:border-black/20 grid grid-cols-2 gap-8 text-center text-xs print:break-inside-avoid">
          <div>
            <div className="w-48 h-0.5 bg-white/20 print:bg-black/30 mx-auto mb-2" />
            <p className="font-bold text-white print:text-black">Rector(a)</p>
            <p className="text-[10px] text-white/40 print:text-black/50 mt-0.5">IE Jose María Carbonell</p>
          </div>
          <div>
            <div className="w-48 h-0.5 bg-white/20 print:bg-black/30 mx-auto mb-2" />
            <p className="font-bold text-white print:text-black">Coordinador(a) Académico</p>
            <p className="text-[10px] text-white/40 print:text-black/50 mt-0.5">Firma de Registro y Control</p>
          </div>
        </footer>

        {/* Pie de boletín institucional */}
        <div className="mt-12 text-center text-[9px] text-white/20 print:text-black/30 print:break-inside-avoid">
          Documento académico oficial emitido por Sophos Core el {fechaCierre}. Código de verificación hash: {matriculaId.slice(0, 8)}-{periodoId.slice(0, 8)}.
        </div>
      </article>
    </div>
  );
}
