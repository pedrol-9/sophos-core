'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  getSuperAdminMetrics, 
  getInstitutionsList, 
  updateInstitutionSaaS, 
  getPlansList, 
  updatePlanDetails, 
  getAILogs,
  SaaSMetrics,
  InstitutionSaaSInfo
} from '@/app/actions/superadmin-actions';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'metrics' | 'instituciones' | 'planes' | 'ia'>('metrics');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SaaSMetrics | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionSaaSInfo[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('');
  
  // Modificar institución modal
  const [editingInst, setEditingInst] = useState<InstitutionSaaSInfo | null>(null);
  const [editPlanId, setEditPlanId] = useState<number>(1);
  const [editEstado, setEditEstado] = useState<string>('PRUEBA');
  const [updatingInst, setUpdatingInst] = useState(false);

  // Modificar plan state
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editPlanPrice, setEditPlanPrice] = useState<number>(0);
  const [editPlanLimit, setEditPlanLimit] = useState<number>(0);
  const [updatingPlan, setUpdatingPlan] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resM = await getSuperAdminMetrics();
      if (resM.success && resM.data) setMetrics(resM.data);
      else if (resM.error) throw new Error(resM.error);

      const resI = await getInstitutionsList();
      if (resI.success && resI.data) setInstitutions(resI.data);

      const resP = await getPlansList();
      if (resP.success && resP.data) setPlans(resP.data);

      const resA = await getAILogs(50);
      if (resA.success && resA.data) setAiLogs(resA.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar datos del SaaS. Verifica tus privilegios.');
      // Si el rol no es válido, redirigir después de 2s
      if (err.message?.includes('denegado')) {
        setTimeout(() => {
          router.push('/dashboard/admin');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // Guardar cambios de institución
  const handleSaveInstitution = async () => {
    if (!editingInst) return;
    setUpdatingInst(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await updateInstitutionSaaS(editingInst.id_institucion, editPlanId, editEstado);
      if (res.success) {
        setSuccessMsg(`Institución "${editingInst.nombre_legal}" actualizada exitosamente.`);
        setEditingInst(null);
        await loadAllData();
      } else {
        setErrorMsg(res.error || 'Error al actualizar institución.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de red.');
    } finally {
      setUpdatingInst(false);
    }
  };

  // Guardar cambios de plan
  const handleSavePlan = async (planId: number) => {
    setUpdatingPlan(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await updatePlanDetails(planId, editPlanPrice, editPlanLimit);
      if (res.success) {
        setSuccessMsg('Plan de suscripción modificado exitosamente.');
        setEditingPlanId(null);
        await loadAllData();
      } else {
        setErrorMsg(res.error || 'Error al actualizar plan.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de red.');
    } finally {
      setUpdatingPlan(false);
    }
  };

  // Filtrado de colegios
  const filteredInstitutions = institutions.filter(inst => {
    const matchesSearch = inst.nombre_legal.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inst.nit.includes(searchQuery);
    const matchesPlan = selectedPlanFilter === '' || inst.planNombre === selectedPlanFilter;
    return matchesSearch && matchesPlan;
  });

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        <p className="text-sm text-white/50">Verificando sesión e inicializando panel SaaS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-white flex flex-col">
      {/* Glow background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full" />
      </div>

      {/* NAVBAR */}
      <header className="relative z-10 border-b border-white/5 bg-[#0c1220]/80 backdrop-blur-xl shrink-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
          <div>
            <span className="text-sm font-black tracking-wider uppercase text-white">
              Sophos<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"> SaaS</span>
            </span>
            <span className="ml-2 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[9px] uppercase tracking-wider">Super Admin</span>
          </div>
        </div>

        {/* Tabs navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-white/5 border border-white/8 rounded-xl p-1 text-xs">
          <button 
            onClick={() => setActiveTab('metrics')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'metrics' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Métricas SaaS
          </button>
          <button 
            onClick={() => setActiveTab('instituciones')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'instituciones' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Instituciones ({institutions.length})
          </button>
          <button 
            onClick={() => setActiveTab('planes')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'planes' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Suscripciones y Planes
          </button>
          <button 
            onClick={() => setActiveTab('ia')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'ia' ? 'bg-indigo-600 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Logs de IA
          </button>
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-xs font-semibold text-white/70 transition-all cursor-pointer"
        >
          Cerrar Sesión
        </button>
      </header>

      {/* MOBILE NAV */}
      <div className="md:hidden relative z-10 p-2 bg-[#0c1220] border-b border-white/5 flex gap-1 justify-around text-[10px] font-bold">
        <button onClick={() => setActiveTab('metrics')} className={`py-1.5 px-2.5 rounded ${activeTab === 'metrics' ? 'bg-indigo-600' : 'text-white/55'}`}>Resumen</button>
        <button onClick={() => setActiveTab('instituciones')} className={`py-1.5 px-2.5 rounded ${activeTab === 'instituciones' ? 'bg-indigo-600' : 'text-white/55'}`}>Colegios</button>
        <button onClick={() => setActiveTab('planes')} className={`py-1.5 px-2.5 rounded ${activeTab === 'planes' ? 'bg-indigo-600' : 'text-white/55'}`}>Planes</button>
        <button onClick={() => setActiveTab('ia')} className={`py-1.5 px-2.5 rounded ${activeTab === 'ia' ? 'bg-indigo-600' : 'text-white/55'}`}>IA Logs</button>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 max-w-7xl mx-auto w-full">
        
        {/* Messages */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
            <strong>Error:</strong> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-200 text-sm">
            {successMsg}
          </div>
        )}

        {/* TAB 1: METRICS */}
        {activeTab === 'metrics' && metrics && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* SaaS Overview Title */}
            <div>
              <h1 className="text-2xl font-black text-white">SaaS Analytics & Métricas</h1>
              <p className="text-xs text-white/40 mt-0.5">Visión consolidada e ingresos agregados del negocio Sophos Core.</p>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: Institutions */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-xl rounded-full" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Instituciones</span>
                <div className="text-3xl font-extrabold text-white mt-2">{metrics.totalInstituciones}</div>
                <p className="text-[10px] text-white/30 mt-1">Colegios y sedes activas registradas</p>
              </div>

              {/* Card 2: Total Users */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-xl rounded-full" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Usuarios</span>
                <div className="text-3xl font-extrabold text-white mt-2">{metrics.totalUsuarios}</div>
                <p className="text-[10px] text-white/30 mt-1">Estudiantes, docentes y acudientes</p>
              </div>

              {/* Card 3: AI Consumption Cost */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-xl rounded-full" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Costo de IA (Gemini)</span>
                <div className="text-3xl font-extrabold text-rose-400 mt-2">${metrics.costoEstimadoIA} USD</div>
                <p className="text-[10px] text-white/30 mt-1">Por {metrics.totalTokensIA.toLocaleString()} tokens consumidos</p>
              </div>

              {/* Card 4: Subscriptions state */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 blur-xl rounded-full" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Salud de Suscripciones</span>
                <div className="text-3xl font-extrabold text-teal-400 mt-2">
                  {Math.round((institutions.filter(i => i.estado_suscripcion === 'ACTIVO').length / (institutions.length || 1)) * 100)}%
                </div>
                <p className="text-[10px] text-white/30 mt-1">Tasa de retención sobre colegios de pago</p>
              </div>
            </div>

            {/* Detailed charts flex row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Plan distribution */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6 backdrop-blur-md">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Suscripciones por Categoría</h3>
                <div className="space-y-4">
                  {metrics.distribucionPlanes.map(dp => {
                    const pct = Math.round((dp.count / metrics.totalInstituciones) * 100) || 0;
                    const barBg = dp.plan.includes('Premium') 
                      ? 'bg-amber-500' 
                      : dp.plan.includes('Básico') 
                        ? 'bg-indigo-500' 
                        : 'bg-slate-500';
                    return (
                      <div key={dp.plan} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{dp.plan}</span>
                          <span className="text-white/40">{dp.count} colegios ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full ${barBg}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Users by role */}
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6 backdrop-blur-md">
                <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Usuarios por Rol en SaaS</h3>
                <div className="space-y-4">
                  {metrics.usuariosPorRol.map(ur => {
                    const pct = Math.round((ur.count / metrics.totalUsuarios) * 100) || 0;
                    return (
                      <div key={ur.rol} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{ur.rol}</span>
                          <span className="text-white/40">{ur.count} usuarios ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INSTITUTIONS */}
        {activeTab === 'instituciones' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl font-black text-white">Instituciones Educativas</h1>
              <p className="text-xs text-white/40 mt-0.5">Control de suscripción, límites de usuarios y facturación por tenant.</p>
            </div>

            {/* Filter and search bars */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/3 border border-white/8 rounded-2xl p-4">
              <input
                type="text"
                placeholder="Buscar colegio por nombre o NIT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-96 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
              />
              
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
                <span className="text-xs text-white/40 font-semibold">Filtrar Plan:</span>
                <select
                  value={selectedPlanFilter}
                  onChange={(e) => setSelectedPlanFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="" className="bg-[#121829] text-white">Todos los planes</option>
                  <option value="Plan Prueba" className="bg-[#121829] text-white">Plan Prueba</option>
                  <option value="Plan Básico" className="bg-[#121829] text-white">Plan Básico</option>
                  <option value="Plan Premium" className="bg-[#121829] text-white">Plan Premium</option>
                </select>
              </div>
            </div>

            {/* Table of institutions */}
            {filteredInstitutions.length > 0 ? (
              <div className="overflow-hidden border border-white/8 rounded-2xl bg-white/[0.01]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/8 bg-white/3 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                        <th className="py-3 px-5">Nombre Legal</th>
                        <th className="py-3 px-5">NIT / ID</th>
                        <th className="py-3 px-5">Plan Suscripción</th>
                        <th className="py-3 px-5">Consumo Usuarios</th>
                        <th className="py-3 px-5">Estado</th>
                        <th className="py-3 px-5 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredInstitutions.map((inst) => {
                        const usageRatio = inst.totalUsuarios / (inst.planLimit || 1);
                        
                        return (
                          <tr key={inst.id_institucion} className="hover:bg-white/[0.01] transition-all">
                            <td className="py-3.5 px-5 font-bold text-white/90">{inst.nombre_legal}</td>
                            <td className="py-3.5 px-5 text-white/40">{inst.nit}</td>
                            <td className="py-3.5 px-5">
                              <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider ${
                                inst.planNombre.includes('Premium') 
                                  ? 'bg-amber-500/10 text-amber-400' 
                                  : inst.planNombre.includes('Básico') 
                                    ? 'bg-indigo-500/10 text-indigo-400' 
                                    : 'bg-slate-500/10 text-slate-300'
                              }`}>
                                {inst.planNombre}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <div className="flex justify-between items-baseline mb-1 text-[10px] text-white/45">
                                <span>{inst.totalUsuarios} / {inst.planLimit}</span>
                                <span>{Math.round(usageRatio * 100)}%</span>
                              </div>
                              <div className="w-24 h-1 rounded-full bg-white/10 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${usageRatio > 0.85 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                                  style={{ width: `${Math.min(100, usageRatio * 100)}%` }} 
                                />
                              </div>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase ${
                                inst.estado_suscripcion === 'ACTIVO' 
                                  ? 'bg-teal-500/10 text-teal-400' 
                                  : inst.estado_suscripcion === 'PRUEBA' 
                                    ? 'bg-amber-500/10 text-amber-400' 
                                    : 'bg-red-500/10 text-red-400 animate-pulse'
                              }`}>
                                {inst.estado_suscripcion}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                onClick={() => {
                                  setEditingInst(inst);
                                  setEditPlanId(inst.id_suscripcion || 1);
                                  setEditEstado(inst.estado_suscripcion);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-indigo-600 border border-white/10 hover:border-indigo-500 text-white font-bold transition-all cursor-pointer text-[10px] uppercase tracking-wider"
                              >
                                Gestionar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-white/30">
                Ninguna institución coincide con la búsqueda.
              </div>
            )}

            {/* MODAL PARA GESTIONAR INSTITUCIÓN */}
            {editingInst && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                <div className="bg-[#0f1524] border border-white/10 rounded-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
                  
                  <div className="mb-5">
                    <h3 className="text-base font-extrabold text-white">Gestionar Suscripción</h3>
                    <p className="text-xs text-white/40 mt-0.5">{editingInst.nombre_legal} • NIT {editingInst.nit}</p>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Plan selection */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-white/70">Plan de Suscripción</label>
                      <select
                        value={editPlanId}
                        onChange={(e) => setEditPlanId(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {plans.map(p => (
                          <option key={p.id_suscripcion} value={p.id_suscripcion} className="bg-[#121829]">
                            {p.nombre} (Límite: {p.limite_usuarios} usuarios - ${p.precio}/mes)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subscription state */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-white/70">Estado de Acceso</label>
                      <select
                        value={editEstado}
                        onChange={(e) => setEditEstado(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="PRUEBA" className="bg-[#121829]">PRUEBA (Demo)</option>
                        <option value="ACTIVO" className="bg-[#121829]">ACTIVO (De pago)</option>
                        <option value="INACTIVE" className="bg-[#121829]">INACTIVE (Congelado/Suspendido)</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setEditingInst(null)}
                      className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveInstitution}
                      disabled={updatingInst}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                    >
                      {updatingInst ? 'Guardando...' : 'Aplicar Cambios'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUBSCRIPTION PLANS EDITING */}
        {activeTab === 'planes' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl font-black text-white">Planes de Suscripción Globales</h1>
              <p className="text-xs text-white/40 mt-0.5">Parámetros, precios mensuales y límites máximos de usuarios del SaaS.</p>
            </div>

            {/* Plans card display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map(p => {
                const isEditing = editingPlanId === p.id_suscripcion;
                
                return (
                  <div 
                    key={p.id_suscripcion}
                    className="bg-white/3 border border-white/8 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Nivel {p.id_suscripcion}</span>
                      <h3 className="text-xl font-bold text-white mt-1">{p.nombre}</h3>
                      
                      <div className="my-6 space-y-4">
                        {isEditing ? (
                          <div className="space-y-3 text-xs">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-white/40 uppercase">Precio ($ USD / mes)</label>
                              <input 
                                type="number" 
                                value={editPlanPrice} 
                                onChange={(e) => setEditPlanPrice(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-white/40 uppercase">Límite Usuarios</label>
                              <input 
                                type="number" 
                                value={editPlanLimit} 
                                onChange={(e) => setEditPlanLimit(Number(e.target.value))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-1.5 px-3 text-white focus:outline-none focus:border-indigo-500 font-mono"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs text-white/40">Tarifa Mensual</span>
                              <p className="text-2xl font-black text-white mt-0.5">${p.precio} <span className="text-xs text-white/40 font-normal">USD</span></p>
                            </div>
                            <div>
                              <span className="text-xs text-white/40">Límite de Cuentas</span>
                              <p className="text-lg font-bold text-indigo-400 mt-0.5">{p.limite_usuarios.toLocaleString()} <span className="text-xs text-white/40 font-normal">usuarios</span></p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingPlanId(null)}
                            className="flex-1 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSavePlan(p.id_suscripcion)}
                            disabled={updatingPlan}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold text-white transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                          >
                            {updatingPlan ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPlanId(p.id_suscripcion);
                            setEditPlanPrice(p.precio);
                            setEditPlanLimit(p.limite_usuarios);
                          }}
                          className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                        >
                          Editar Parámetros
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: AI LOGS */}
        {activeTab === 'ia' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl font-black text-white">Monitoreo de Consumo de IA</h1>
              <p className="text-xs text-white/40 mt-0.5">Logs de peticiones de tokens consumidos de Gemini API por cada colegio.</p>
            </div>

            {aiLogs.length > 0 ? (
              <div className="overflow-hidden border border-white/8 rounded-2xl bg-white/[0.01]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/8 bg-white/3 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                        <th className="py-3 px-5">ID Petición</th>
                        <th className="py-3 px-5">Institución</th>
                        <th className="py-3 px-5">Servicio IA</th>
                        <th className="py-3 px-5 text-center">Tokens Usados</th>
                        <th className="py-3 px-5 text-center">Costo Estimado</th>
                        <th className="py-3 px-5 text-right">Fecha / Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs font-mono">
                      {aiLogs.map((log) => (
                        <tr key={log.id_ia_token} className="hover:bg-white/[0.01] transition-all">
                          <td className="py-3 px-5 text-white/40 text-[10px]">{log.id_ia_token.slice(0, 8)}...</td>
                          <td className="py-3 px-5 font-bold font-sans text-white/80">{log.instituciones?.nombre_legal || 'Master SaaS'}</td>
                          <td className="py-3 px-5 text-indigo-400 font-semibold text-[10px]">{log.servicio_ia}</td>
                          <td className="py-3 px-5 text-center text-white/90">{log.tokens_usados.toLocaleString()}</td>
                          <td className="py-3 px-5 text-center text-rose-400 font-bold">${Number(log.costo_estimado).toFixed(5)}</td>
                          <td className="py-3 px-5 text-right text-white/30 text-[10px]">
                            {new Date(log.fecha_peticion).toLocaleString('es-CO')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-xs text-white/30">
                No hay llamadas de IA registradas en el SaaS.
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
