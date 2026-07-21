'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { ThemeToggle } from '@/components/ThemeToggle';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'metrics' | 'instituciones' | 'planes' | 'ia'>('metrics');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SaaSMetrics | null>(null);
  const [institutions, setInstitutions] = useState<InstitutionSaaSInfo[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [plans, setPlans] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const loadAllData = useCallback(async () => {
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
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Error al cargar datos del SaaS. Verifica tus privilegios.');
      if (error.message?.includes('denegado')) {
        setTimeout(() => {
          router.push('/dashboard/admin');
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

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
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Error de red.');
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
        setSuccessMsg('Plan de suscripción actualizado correctamente.');
        setEditingPlanId(null);
        await loadAllData();
      } else {
        setErrorMsg(res.error || 'Error al actualizar plan.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Error de red.');
    } finally {
      setUpdatingPlan(false);
    }
  };

  // Filtros de instituciones
  const filteredInstitutions = institutions.filter(inst => {
    const matchSearch = inst.nombre_legal.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        inst.nit.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPlan = !selectedPlanFilter || inst.planNombre === selectedPlanFilter;
    return matchSearch && matchPlan;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3 text-foreground">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-muted-foreground">Cargando Consola Global de Super-Admin...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground font-sans flex overflow-hidden relative">
      
      {/* Ambient Decorative Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Sidebar Super-Admin */}
      <aside className="w-64 border-r border-border flex flex-col justify-between shrink-0 bg-card backdrop-blur-md relative z-10 h-full shadow-xs">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo Brand */}
          <div className="p-6 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                SA
              </div>
              <div>
                <h2 className="text-base font-black tracking-tight text-foreground leading-none">Sophos Core</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Super-Admin</span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1.5 overflow-y-auto flex-1 custom-scrollbar">
            <button
              onClick={() => setActiveTab('metrics')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'metrics'
                  ? 'bg-primary/15 border-l-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1.5-3m1.5 3l1.5-3m0 0l1.5 3m-1.5-3l-1.5-3" />
              </svg>
              Métricas Globales SaaS
            </button>

            <button
              onClick={() => setActiveTab('instituciones')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'instituciones'
                  ? 'bg-primary/15 border-l-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
              Colegios Instituciones
            </button>

            <button
              onClick={() => setActiveTab('planes')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'planes'
                  ? 'bg-primary/15 border-l-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-6h6m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Planes y Precios SaaS
            </button>

            <button
              onClick={() => setActiveTab('ia')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ia'
                  ? 'bg-primary/15 border-l-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Consumo Tokens IA
            </button>
          </nav>
        </div>

        {/* Profile Footer & Theme Toggle */}
        <div className="p-4 border-t border-border space-y-3 bg-secondary/30 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold uppercase shrink-0">
                SA
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-foreground truncate">Super-Admin</p>
                <p className="text-[10px] text-muted-foreground truncate">Master SaaS</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-background border border-border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-muted-foreground text-xs font-semibold transition-all duration-200 cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
        
        {/* Banner Alert Messages */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-200 text-xs font-medium">
            <strong>Error:</strong> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-200 text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {/* TAB 1: METRICS */}
        {activeTab === 'metrics' && metrics && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl font-black text-foreground">Consola de Métricas Master SaaS</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Visión global de tenants activos, facturación recurrente y consumo de recursos.</p>
            </div>

            {/* Grid 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card 1: MRR */}
              <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-xs">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-xl rounded-full" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ingreso Mensual (MRR)</span>
                <div className="text-3xl font-extrabold text-amber-500 mt-2">${metrics.mrrTotal.toLocaleString()} USD</div>
                <p className="text-[10px] text-muted-foreground mt-1">Facturación proyectada de colegios activos</p>
              </div>

              {/* Card 2: Total Users */}
              <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-xs">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-xl rounded-full" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Usuarios Totales SaaS</span>
                <div className="text-3xl font-extrabold text-foreground mt-2">{metrics.totalUsuarios}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Estudiantes, docentes y acudientes</p>
              </div>

              {/* Card 3: AI Consumption Cost */}
              <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-xs">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-xl rounded-full" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Costo de IA (Gemini)</span>
                <div className="text-3xl font-extrabold text-rose-500 mt-2">${metrics.costoEstimadoIA} USD</div>
                <p className="text-[10px] text-muted-foreground mt-1">Por {metrics.totalTokensIA.toLocaleString()} tokens consumidos</p>
              </div>

              {/* Card 4: Subscriptions state */}
              <div className="bg-card border border-border rounded-2xl p-5 backdrop-blur-md relative overflow-hidden shadow-xs">
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 blur-xl rounded-full" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Salud de Suscripciones</span>
                <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400 mt-2">
                  {Math.round((institutions.filter(i => i.estado_suscripcion === 'ACTIVO').length / (institutions.length || 1)) * 100)}%
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Tasa de retención sobre colegios de pago</p>
              </div>
            </div>

            {/* Detailed charts flex row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Plan distribution */}
              <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-md shadow-xs">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-4">Suscripciones por Categoría</h3>
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
                          <span className="text-muted-foreground">{dp.count} colegios ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                          <div className={`h-full rounded-full ${barBg}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Users by role */}
              <div className="bg-card border border-border rounded-2xl p-6 backdrop-blur-md shadow-xs">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-4">Usuarios por Rol en SaaS</h3>
                <div className="space-y-4">
                  {metrics.usuariosPorRol.map(ur => {
                    const pct = Math.round((ur.count / metrics.totalUsuarios) * 100) || 0;
                    return (
                      <div key={ur.rol} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{ur.rol}</span>
                          <span className="text-muted-foreground">{ur.count} usuarios ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${pct}%` }} />
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
              <h1 className="text-2xl font-black text-foreground">Instituciones Educativas</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Control de suscripción, límites de usuarios y facturación por tenant.</p>
            </div>

            {/* Filter and search bars */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card border border-border rounded-2xl p-4 shadow-xs">
              <input
                type="text"
                placeholder="Buscar colegio por nombre o NIT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full md:w-96 bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-end">
                <span className="text-xs text-muted-foreground font-semibold">Filtrar Plan:</span>
                <select
                  value={selectedPlanFilter}
                  onChange={(e) => setSelectedPlanFilter(e.target.value)}
                  className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="" className="bg-card text-foreground">Todos los planes</option>
                  <option value="Plan Prueba" className="bg-card text-foreground">Plan Prueba</option>
                  <option value="Plan Básico" className="bg-card text-foreground">Plan Básico</option>
                  <option value="Plan Premium" className="bg-card text-foreground">Plan Premium</option>
                </select>
              </div>
            </div>

            {/* Table of institutions */}
            {filteredInstitutions.length > 0 ? (
              <div className="overflow-hidden border border-border rounded-2xl bg-card custom-scrollbar overflow-x-auto shadow-xs">
                <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-5">Nombre Legal</th>
                      <th className="py-3 px-5">NIT / ID</th>
                      <th className="py-3 px-5">Plan Suscripción</th>
                      <th className="py-3 px-5">Consumo Usuarios</th>
                      <th className="py-3 px-5">Estado</th>
                      <th className="py-3 px-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {filteredInstitutions.map((inst) => {
                      const usageRatio = inst.totalUsuarios / (inst.planLimit || 1);
                      
                      return (
                        <tr key={inst.id_institucion} className="hover:bg-secondary/40 transition-all">
                          <td className="py-3.5 px-5 font-bold text-foreground">{inst.nombre_legal}</td>
                          <td className="py-3.5 px-5 text-muted-foreground">{inst.nit}</td>
                          <td className="py-3.5 px-5">
                            <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider ${
                              inst.planNombre.includes('Premium') 
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' 
                                : inst.planNombre.includes('Básico') 
                                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400' 
                                  : 'bg-secondary text-muted-foreground'
                            }`}>
                              {inst.planNombre}
                            </span>
                          </td>
                          <td className="py-3.5 px-5">
                            <div className="flex justify-between items-baseline mb-1 text-[10px] text-muted-foreground">
                              <span>{inst.totalUsuarios} / {inst.planLimit}</span>
                              <span>{Math.round(usageRatio * 100)}%</span>
                            </div>
                            <div className="w-24 h-1 rounded-full bg-secondary overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${usageRatio > 0.85 ? 'bg-rose-500' : 'bg-primary'}`} 
                                style={{ width: `${Math.min(100, usageRatio * 100)}%` }} 
                              />
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <span className={`px-2 py-0.5 rounded-md font-black text-[9px] uppercase ${
                              inst.estado_suscripcion === 'ACTIVO' 
                                ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400' 
                                : inst.estado_suscripcion === 'PRUEBA' 
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' 
                                  : 'bg-rose-500/15 text-rose-500 animate-pulse'
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
                              className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-primary text-foreground hover:text-primary-foreground font-bold transition-all cursor-pointer text-[10px] uppercase tracking-wider border border-border"
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
            ) : (
              <div className="text-center py-12 text-xs text-muted-foreground">
                Ninguna institución coincide con la búsqueda.
              </div>
            )}

            {/* MODAL PARA GESTIONAR INSTITUCIÓN */}
            {editingInst && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95 duration-200 text-foreground">
                  
                  <div className="mb-5">
                    <h3 className="text-base font-extrabold text-foreground">Gestionar Suscripción</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{editingInst.nombre_legal} • NIT {editingInst.nit}</p>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Plan selection */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-foreground">Plan de Suscripción</label>
                      <select
                        value={editPlanId}
                        onChange={(e) => setEditPlanId(Number(e.target.value))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                      >
                        {plans.map(p => (
                          <option key={p.id_suscripcion} value={p.id_suscripcion} className="bg-card text-foreground">
                            {p.nombre} (Límite: {p.limite_usuarios} usuarios - ${p.precio}/mes)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subscription state */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-foreground">Estado de Acceso</label>
                      <select
                        value={editEstado}
                        onChange={(e) => setEditEstado(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                      >
                        <option value="PRUEBA" className="bg-card text-foreground">PRUEBA (Demo)</option>
                        <option value="ACTIVO" className="bg-card text-foreground">ACTIVO (De pago)</option>
                        <option value="INACTIVE" className="bg-card text-foreground">INACTIVE (Congelado/Suspendido)</option>
                      </select>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setEditingInst(null)}
                      className="px-4 py-2 border border-border bg-secondary text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveInstitution}
                      disabled={updatingInst}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
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
              <h1 className="text-2xl font-black text-foreground">Planes de Suscripción Globales</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Parámetros, precios mensuales y límites máximos de usuarios del SaaS.</p>
            </div>

            {/* Plans card display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map(p => {
                const isEditing = editingPlanId === p.id_suscripcion;
                
                return (
                  <div 
                    key={p.id_suscripcion}
                    className="bg-card border border-border rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Nivel {p.id_suscripcion}</span>
                      <h3 className="text-xl font-bold text-foreground mt-1">{p.nombre}</h3>
                      
                      <div className="my-6 space-y-4">
                        {isEditing ? (
                          <div className="space-y-3 text-xs">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Precio ($ USD / mes)</label>
                              <input 
                                type="number" 
                                value={editPlanPrice} 
                                onChange={(e) => setEditPlanPrice(Number(e.target.value))}
                                className="w-full bg-background border border-border rounded-xl py-1.5 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase">Límite Usuarios</label>
                              <input 
                                type="number" 
                                value={editPlanLimit} 
                                onChange={(e) => setEditPlanLimit(Number(e.target.value))}
                                className="w-full bg-background border border-border rounded-xl py-1.5 px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs text-muted-foreground">Tarifa Mensual</span>
                              <p className="text-2xl font-black text-foreground mt-0.5">${p.precio} <span className="text-xs text-muted-foreground font-normal">USD</span></p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Límite de Cuentas</span>
                              <p className="text-lg font-bold text-primary mt-0.5">{p.limite_usuarios.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">usuarios</span></p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingPlanId(null)}
                            className="flex-1 py-2 border border-border bg-secondary text-muted-foreground hover:text-foreground rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSavePlan(p.id_suscripcion)}
                            disabled={updatingPlan}
                            className="flex-1 py-2 bg-primary hover:bg-primary/90 rounded-xl text-xs font-bold text-primary-foreground transition-all shadow-md cursor-pointer disabled:opacity-50"
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
                          className="w-full py-2 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-xs font-bold text-foreground transition-all cursor-pointer"
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
              <h1 className="text-2xl font-black text-foreground">Monitoreo de Consumo de IA</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Logs de peticiones de tokens consumidos de Gemini API por cada colegio.</p>
            </div>

            {aiLogs.length > 0 ? (
              <div className="overflow-hidden border border-border rounded-2xl bg-card shadow-xs custom-scrollbar overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-5">ID Petición</th>
                      <th className="py-3 px-5">Institución</th>
                      <th className="py-3 px-5">Servicio IA</th>
                      <th className="py-3 px-5 text-center">Tokens Usados</th>
                      <th className="py-3 px-5 text-center">Costo Estimado</th>
                      <th className="py-3 px-5 text-right">Fecha / Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs font-mono">
                    {aiLogs.map((log) => (
                      <tr key={log.id_ia_token} className="hover:bg-secondary/40 transition-all">
                        <td className="py-3 px-5 text-muted-foreground text-[10px]">{log.id_ia_token.slice(0, 8)}...</td>
                        <td className="py-3 px-5 font-bold font-sans text-foreground">{log.instituciones?.nombre_legal || 'Master SaaS'}</td>
                        <td className="py-3 px-5 text-primary font-semibold text-[10px]">{log.servicio_ia}</td>
                        <td className="py-3 px-5 text-center text-foreground">{log.tokens_usados.toLocaleString()}</td>
                        <td className="py-3 px-5 text-center text-rose-500 font-bold">${Number(log.costo_estimado).toFixed(5)}</td>
                        <td className="py-3 px-5 text-right text-muted-foreground text-[10px]">
                          {new Date(log.fecha_peticion).toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-xs text-muted-foreground">
                No hay llamadas de IA registradas en el SaaS.
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
