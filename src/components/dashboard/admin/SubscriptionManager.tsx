'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSubscriptionStatus, generateMercadoPagoPreference } from '@/app/actions/mercadopago-actions';

// Tipos del estado de suscripción
type SubscriptionStatus = {
  estado: string;
  planNombre: string;
  planId: number | null;
  fechaExpiracion: string | null;
  diasRestantes: number | null;
  estaVencida: boolean;
  limiteUsuarios: number;
  totalUsuarios: number;
};

// Planes disponibles con precios en COP
const PLANES = [
  {
    id: 2,
    name: 'Plan Básico',
    limit: 200,
    precioCOP: 199000,
    desc: 'Para colegios pequeños y medianos. Gestión completa con IA incluida.',
    color: 'indigo',
  },
  {
    id: 3,
    name: 'Plan Premium',
    limit: 1000,
    precioCOP: 599000,
    desc: 'Sin límites. Sedes múltiples, análisis avanzado y soporte prioritario.',
    color: 'amber',
  },
];

const MESES_OPCIONES = [1, 3, 6, 12];

function formatCOP(centavos: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(centavos / 100);
}

function getDescuento(meses: number) {
  if (meses >= 12) return 20;
  if (meses >= 6) return 10;
  if (meses >= 3) return 5;
  return 0;
}

export function SubscriptionManager() {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado del modal de compra
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANES)[0] | null>(null);
  const [selectedMeses, setSelectedMeses] = useState(1);
  const [generatingParams, setGeneratingParams] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const res = await getSubscriptionStatus();
    if (res.success && res.data) {
      setStatus(res.data);
    } else {
      setError(res.error || 'No se pudo cargar el estado de suscripción.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Si la URL tiene ?pago=completado, recargar el estado
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('pago') === 'completado') {
        loadStatus();
        // Limpiar el parámetro de la URL sin recargar
        const url = new URL(window.location.href);
        url.searchParams.delete('pago');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [loadStatus]);

  const handleOpenBuyModal = (plan: (typeof PLANES)[0]) => {
    setSelectedPlan(plan);
    setSelectedMeses(1);
    setPaymentError(null);
    setShowBuyModal(true);
  };

  const handleInitiatePayment = async () => {
    if (!selectedPlan) return;
    setGeneratingParams(true);
    setPaymentError(null);

    try {
      const res = await generateMercadoPagoPreference(selectedPlan.id, selectedMeses);

      if (!res.success || !res.initPoint) {
        setPaymentError(res.error || 'Error preparando el pago.');
        setGeneratingParams(false);
        return;
      }

      // Redirigir al Checkout Pro de Mercado Pago
      window.location.href = res.initPoint;
    } catch (err: any) {
      setPaymentError('Error inesperado al iniciar el pago.');
    } finally {
      setGeneratingParams(false);
    }
  };

  const usagePercent = status
    ? Math.min(100, Math.round((status.totalUsuarios / (status.limiteUsuarios || 1)) * 100))
    : 0;

  const descuento = getDescuento(selectedMeses);
  const precioBase = selectedPlan ? selectedPlan.precioCOP * selectedMeses : 0;
  const precioFinal = Math.round(precioBase * (1 - descuento / 100));

  // ─── Badge de expiración ──────────────────────────────────────────────────
  const renderExpirationBadge = () => {
    if (!status?.fechaExpiracion) return null;

    const dias = status.diasRestantes ?? 0;
    const fecha = new Date(status.fechaExpiracion).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (status.estaVencida) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs animate-pulse">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Suscripción <strong>vencida</strong> desde el {fecha}. Renueva para recuperar el acceso.</span>
        </div>
      );
    }

    if (dias <= 7) {
      return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span>Vence en <strong>{dias} días</strong> ({fecha}). ¡Renueva pronto!</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-500/8 border border-teal-500/20 text-teal-400 text-xs">
        <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Activa hasta el <strong>{fecha}</strong> ({dias} días restantes)</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-white/50 space-y-3">
        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full" />
        <p className="text-xs">Cargando detalles de facturación...</p>
      </div>
    );
  }

  return (
    <>

      <div className="space-y-6 animate-in fade-in duration-200">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-300 text-xs">
            {error}
          </div>
        )}

        {status && (
          <>
            {/* Estado de expiración */}
            {renderExpirationBadge()}

            {/* Card de estado actual */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 p-6 rounded-2xl bg-white/[0.02] border border-white/6 backdrop-blur-md flex flex-col justify-between gap-6">
                <div className="space-y-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    status.estaVencida
                      ? 'bg-red-500/15 text-red-300'
                      : status.estado === 'ACTIVO'
                      ? 'bg-teal-500/15 text-teal-300'
                      : 'bg-amber-500/15 text-amber-300'
                  }`}>
                    {status.estado}
                  </span>
                  <h3 className="text-lg font-bold text-white pt-1">{status.planNombre}</h3>
                  <p className="text-xs text-white/40">
                    {Number(status.planId) === 2
                      ? '$199.000 COP / mes'
                      : Number(status.planId) === 3
                      ? '$599.000 COP / mes'
                      : 'Gratuito'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/55">Capacidad usada</span>
                    <span className="font-bold text-white">
                      {status.totalUsuarios}{' '}
                      <span className="text-white/35 font-normal">/ {status.limiteUsuarios}</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ${
                        usagePercent > 85
                          ? 'from-rose-500 to-red-400'
                          : 'from-indigo-500 to-cyan-400'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/25 italic">
                    Incluye todos los roles activos en la plataforma.
                  </p>
                </div>
              </div>

              {/* Planes de pago */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white/40">
                  Planes de Suscripción — Pago con PSE, Nequi o Tarjeta
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PLANES.map((plan) => {
                    const isActive = Number(status.planId) === Number(plan.id) && !status.estaVencida;
                    const isPremium = plan.id === 3;
                    return (
                      <div
                        key={plan.id}
                        className={`relative p-5 rounded-2xl border flex flex-col justify-between gap-5 transition-all ${
                          isActive
                            ? 'bg-indigo-600/8 border-indigo-500/40 shadow-lg shadow-indigo-600/5'
                            : isPremium
                            ? 'bg-amber-500/3 border-amber-500/15 hover:border-amber-500/30'
                            : 'bg-white/[0.01] border-white/6 hover:border-white/12 hover:bg-white/[0.02]'
                        }`}
                      >
                        {isPremium && (
                          <div className="absolute -top-2.5 left-4">
                            <span className="text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-400 text-black px-2.5 py-1 rounded-full shadow-sm">
                              Más Popular
                            </span>
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-bold text-white">{plan.name}</h4>
                            {isActive && (
                              <span className="text-[9px] font-bold bg-indigo-500 text-white px-2 py-0.5 rounded uppercase tracking-wider">
                                Activo
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/35 mt-0.5">
                            Hasta {plan.limit.toLocaleString('es-CO')} usuarios
                          </p>
                          <div className="mt-3 flex items-baseline gap-1.5">
                            <span className={`text-2xl font-extrabold ${isPremium ? 'text-amber-400' : 'text-white'}`}>
                              {formatCOP(plan.precioCOP * 100)}
                            </span>
                            <span className="text-[10px] text-white/35">/ mes</span>
                          </div>
                          <p className="text-[11px] text-white/50 leading-relaxed mt-3">
                            {plan.desc}
                          </p>
                        </div>

                        <button
                          onClick={() => handleOpenBuyModal(plan)}
                          disabled={isActive}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed'
                              : isPremium
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-md shadow-amber-600/20'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                          }`}
                        >
                          {isActive ? 'Plan Actual' : status.estaVencida ? 'Renovar Acceso' : 'Adquirir Plan'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Métodos de pago badge */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.015] border border-white/5">
                  <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider shrink-0">
                    Medios de pago:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {['PSE', 'Nequi', 'Bancolombia', 'Tarjeta Crédito', 'Tarjeta Débito'].map((m) => (
                      <span
                        key={m}
                        className="text-[9px] font-bold uppercase tracking-wider text-white/50 bg-white/5 border border-white/8 px-2 py-0.5 rounded"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ─── MODAL DE COMPRA ──────────────────────────────────────────────────── */}
      {showBuyModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="bg-[#0d1526] border border-white/10 rounded-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowBuyModal(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <h3 className="text-base font-extrabold text-white">Adquirir {selectedPlan.name}</h3>
              <p className="text-xs text-white/40 mt-0.5">
                Pago seguro procesado por Mercado Pago
              </p>
            </div>

            {/* Selector de meses */}
            <div className="space-y-4 mb-6">
              <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Duración de la suscripción
              </label>
              <div className="grid grid-cols-4 gap-3">
                {MESES_OPCIONES.map((m) => {
                  const desc = getDescuento(m);
                  const isSelected = selectedMeses === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMeses(m)}
                      className={`relative py-4 px-2 rounded-xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20 scale-[1.02]'
                          : 'bg-white/3 border-white/8 text-white/60 hover:border-white/20 hover:text-white hover:bg-white/5 hover:scale-[1.01]'
                      }`}
                    >
                      <span className="block text-lg font-black leading-none">{m}</span>
                      <span className="block text-[10px] font-bold uppercase tracking-wider opacity-60">
                        {m === 1 ? 'mes' : 'meses'}
                      </span>
                      {desc > 0 && (
                        <span className="absolute -top-1.5 -right-1 text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full shadow-sm leading-none border border-[#0d1526]">
                          -{desc}%
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resumen de precio */}
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 mb-6 space-y-3">
              <div className="flex justify-between text-xs text-white/50">
                <span>Precio base ({selectedPlan.name})</span>
                <span>{formatCOP(precioBase * 100)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                  <span>Descuento por volumen (-{descuento}%)</span>
                  <span>-{formatCOP((precioBase - precioFinal) * 100)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-white/5 flex justify-between items-baseline">
                <span className="text-sm font-semibold text-white/70">Total a pagar</span>
                <span className="text-xl font-black text-white">{formatCOP(precioFinal * 100)}</span>
              </div>
            </div>

            {paymentError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-300 text-xs">
                {paymentError}
              </div>
            )}

            <button
              onClick={handleInitiatePayment}
              disabled={generatingParams}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 rounded-xl text-sm font-black text-white transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {generatingParams ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Redirigiendo a Mercado Pago...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 12c0 6.627 5.373 12 12 12s12-5.373 12-12c0-2.092-.535-4.06-1.475-5.774M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Pagar {formatCOP(precioFinal * 100)} con Mercado Pago
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-white/20 mt-3">
              Pago procesado de forma segura por Mercado Pago
            </p>
          </div>
        </div>
      )}
    </>
  );
}
