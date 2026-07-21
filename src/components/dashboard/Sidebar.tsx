'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import {
  IconHome, IconBuilding, IconNotebook, IconSparkles, 
  IconSettings, IconLogout, IconUser, IconCreditCard,
  IconRocket, IconUsers, IconArrowLeft
} from '@/components/icons';

interface SidebarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export function Sidebar({ user, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const [subInfo, setSubInfo] = useState<{ planNombre: string; totalUsersUsed: number; planLimit: number } | null>(null);

  useEffect(() => {
    if (user?.app_metadata?.rol !== 'ADMIN') return;
    async function fetchSub() {
      const { getSubscriptionInfo } = await import('@/app/actions/config-actions');
      const res = await getSubscriptionInfo();
      if (res.success && res.data) {
        setSubInfo({
          planNombre: res.data.planNombre,
          totalUsersUsed: res.data.totalUsersUsed,
          planLimit: res.data.planLimit
        });
      }
    }
    fetchSub();
  }, [user]);

  return (
    <aside className="w-64 border-r border-white/10 flex flex-col justify-between shrink-0 bg-[#0c1220]/90 backdrop-blur-md h-full">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo */}
        <div className="p-6 border-b border-white/10 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img 
              src={user?.app_metadata?.id_institucion ? `https://gxtuarqsfqrdvksmuioe.supabase.co/storage/v1/object/public/logos/${user.app_metadata.id_institucion}/logo.png` : "/favicon.png"} 
              onError={(e) => {
                e.currentTarget.src = "/favicon.png";
              }}
              alt="Sophos Core Logo" 
              className="w-8 h-8 object-contain rounded-lg shadow-lg shadow-indigo-500/20" 
            />
            <span className="text-lg font-bold tracking-tight text-white">
              Sophos<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"> Core</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          {activeTab.startsWith('settings') ? (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                Configuración
              </div>
              <button
                onClick={() => setActiveTab('settings_profile')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'settings_profile'
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <IconUser /> Perfil Institucional
              </button>
              <button
                onClick={() => setActiveTab('settings_plans')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'settings_plans'
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <IconCreditCard /> Planes y Facturación
              </button>
              <button
                onClick={() => setActiveTab('settings_academic')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'settings_academic'
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <IconRocket /> Ajustes Académicos
              </button>
              <button
                onClick={() => setActiveTab('settings_admins')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'settings_admins'
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <IconUsers /> Administradores
              </button>
              <div className="pt-4 mt-4 border-t border-white/5">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all"
                >
                  <IconArrowLeft /> Volver al Panel
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <IconHome /> Panel General
              </button>
              <button
                onClick={() => setActiveTab('institutions')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'institutions'
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconBuilding /> Sedes e Institutos
                </div>
              </button>
              <button
                onClick={() => setActiveTab('courses')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'courses'
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <IconNotebook /> Cursos y Materias
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'ai'
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconSparkles /> IA Académica
                </div>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-bold px-2 py-0.5 rounded-full">Activo</span>
              </button>
              <button
                onClick={() => setActiveTab('cierre')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'cierre'
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <IconNotebook /> Boletines y Cierre
              </button>
              <button
                onClick={() => setActiveTab('settings_profile')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab.startsWith('settings')
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <IconSettings /> Configuración
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Subscription Limit Visualizer */}
      {user?.app_metadata?.rol === 'ADMIN' && (() => {
        // Local state query inside the render loop using a small helper hook or local render component would be ideal,
        // but here we just render the subInfo state that we fetch in the Sidebar component.
        return null; // will be handled by the subInfo render below
      })()}

      {/* Profile Card / Logout */}
      <div className="p-4 border-t border-white/10 space-y-3 bg-[#0a0f1b] shrink-0">
        {/* Subscription Info Card */}
        {user?.app_metadata?.rol === 'ADMIN' && subInfo && (
          <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-2">
            <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-white/40">
              <span>Plan Actual</span>
              <span className="text-indigo-400">{subInfo.planNombre}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-semibold text-white/80">Usuarios</span>
              <span className="text-xs font-bold text-white">
                {subInfo.totalUsersUsed} <span className="text-white/40 font-normal">/ {subInfo.planLimit}</span>
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div 
                className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${
                  subInfo.totalUsersUsed / subInfo.planLimit > 0.85 
                    ? 'from-red-500 to-rose-400' 
                    : 'from-indigo-500 to-cyan-500'
                }`}
                style={{ width: `${Math.min(100, (subInfo.totalUsersUsed / subInfo.planLimit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-300 font-bold uppercase">
            {user?.email?.charAt(0) ?? 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white/95 truncate">
              {user?.user_metadata?.nombre_completo ?? 'Administrador'}
            </p>
            <p className="text-xs text-white/40 truncate">{user?.email ?? 'conectando...'}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-white/70 text-xs font-semibold transition-all duration-200"
        >
          <IconLogout /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
