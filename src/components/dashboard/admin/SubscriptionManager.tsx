'use client';

import { useState, useEffect } from 'react';
import { getSubscriptionInfo, updateSubscriptionPlan, SubscriptionInfo } from '@/app/actions/config-actions';

export function SubscriptionManager() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updatingPlanId, setUpdatingPlanId] = useState<number | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    const res = await getSubscriptionInfo();
    if (res.success && res.data) {
      setInfo(res.data);
    } else {
      setError(res.error || 'No se pudo cargar la información de suscripción.');
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const handlePlanChange = async (planId: number) => {
    setUpdatingPlanId(planId);
    setError(null);
    setSuccess(null);

    const res = await updateSubscriptionPlan(planId);
    if (res.success) {
      setSuccess('¡Plan de suscripción actualizado con éxito! El límite se ha ajustado.');
      await loadData();
    } else {
      setError(res.error || 'Ocurrió un error al intentar cambiar el plan.');
    }
    setUpdatingPlanId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/50 space-y-3">
        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
        <p className="text-xs">Cargando detalles de facturación...</p>
      </div>
    );
  }

  const plans = [
    { id: 1, name: 'Plan Prueba', limit: 50, price: 0, desc: 'Ideal para iniciar la configuración de la institución y realizar pruebas académicas iniciales.' },
    { id: 2, name: 'Plan Básico', limit: 200, price: 49, desc: 'Soporte completo para colegios pequeños y sedes individuales con límites de alumnos extendidos.' },
    { id: 3, name: 'Plan Premium', limit: 1000, price: 149, desc: 'Control sin límites de sedes, estudiantes y asignaciones académicas con IA predictiva total.' }
  ];

  const usagePercent = info ? Math.round((info.totalUsersUsed / info.planLimit) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Alert states */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-300 text-xs flex gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl text-emerald-300 text-xs flex gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      {info && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Institution billing summary card */}
          <div className="lg:col-span-1 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                  {info.estadoSuscripcion}
                </span>
                <h3 className="text-lg font-bold mt-2.5 text-white">{info.nombreLegal}</h3>
                <p className="text-xs text-white/40">NIT: {info.nit}</p>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-white/55">Plan actual:</span>
                  <strong className="text-sm text-white">{info.planNombre}</strong>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-white/55">Costo del plan:</span>
                  <strong className="text-sm text-indigo-300">
                    {info.planPrecio === 0 ? 'Gratuito' : `$${info.planPrecio} USD / mes`}
                  </strong>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/5 space-y-2.5">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-white/80">Uso de Usuarios</span>
                <span className="text-xs font-bold text-white">
                  {info.totalUsersUsed} <span className="text-white/40 font-normal">/ {info.planLimit}</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${
                    usagePercent > 85 ? 'from-rose-500 to-red-400' : 'from-indigo-500 to-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                />
              </div>
              <p className="text-[10px] text-white/30 italic">
                El conteo incluye administradores, docentes, acudientes y estudiantes activos en la base de datos.
              </p>
            </div>
          </div>

          {/* Pricing cards grid */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Planes Disponibles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((p) => {
                const isActive = info.planId === p.id;
                const isUnderLimit = info.totalUsersUsed <= p.limit;
                
                return (
                  <div 
                    key={p.id} 
                    className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                      isActive 
                        ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-600/10' 
                        : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-white">{p.name}</h4>
                        {isActive && (
                          <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500 text-white px-2 py-0.5 rounded">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 mt-1">Límite: {p.limit} usuarios</p>
                      
                      <div className="mt-3.5 flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold text-white">
                          {p.price === 0 ? '$0' : `$${p.price}`}
                        </span>
                        {p.price > 0 && <span className="text-[10px] text-white/40 font-medium">USD/mes</span>}
                      </div>

                      <p className="text-[11px] text-white/60 leading-relaxed mt-4">
                        {p.desc}
                      </p>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => handlePlanChange(p.id)}
                        disabled={updatingPlanId !== null || !isUnderLimit}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                          !isUnderLimit
                            ? 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed'
                            : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white cursor-pointer'
                        }`}
                      >
                        {updatingPlanId === p.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : !isUnderLimit ? (
                          'Excede límite'
                        ) : (
                          'Cambiar Plan'
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
