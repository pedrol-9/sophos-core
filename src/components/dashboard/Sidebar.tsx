'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const navContent = (
    <nav className="p-4 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
      {activeTab.startsWith('settings') ? (
        <>
          <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-70">
            Configuración
          </div>
          <button
            onClick={() => handleTabClick('settings_profile')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings_profile'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            <IconUser /> Perfil Institucional
          </button>
          <button
            onClick={() => handleTabClick('settings_plans')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings_plans'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            <IconCreditCard /> Planes y Facturación
          </button>
          <button
            onClick={() => handleTabClick('settings_academic')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings_academic'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            <IconRocket /> Ajustes Académicos
          </button>
          <button
            onClick={() => handleTabClick('settings_admins')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings_admins'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            <IconUsers /> Administradores
          </button>
          <div className="pt-4 mt-4 border-t border-border">
            <button
              onClick={() => handleTabClick('dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all"
            >
              <IconArrowLeft /> Volver al Panel
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            onClick={() => handleTabClick('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            <IconHome /> Panel General
          </button>
          <button
            onClick={() => handleTabClick('institutions')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'institutions'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <IconBuilding /> Sedes e Institutos
            </div>
          </button>
          <button
            onClick={() => handleTabClick('courses')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'courses'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            <IconNotebook /> Cursos y Materias
          </button>
          <button
            onClick={() => handleTabClick('ai')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'ai'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <IconSparkles /> IA Académica
            </div>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-400 dark:text-cyan-300 font-bold px-2 py-0.5 rounded-full">Activo</span>
          </button>
          <button
            onClick={() => handleTabClick('cierre')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'cierre'
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            <IconNotebook /> Boletines y Cierre
          </button>
          <button
            onClick={() => handleTabClick('settings_profile')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab.startsWith('settings')
                ? 'bg-primary/15 border-l-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
            }`}
          >
            <IconSettings /> Configuración
          </button>
        </>
      )}
    </nav>
  );

  const profileFooter = (
    <div className="p-4 border-t border-border space-y-3 bg-secondary/30 shrink-0">
      {/* Subscription Info Card */}
      {user?.app_metadata?.rol === 'ADMIN' && subInfo && (
        <div className="p-3 rounded-xl bg-card border border-border space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Plan Actual</span>
            <span className="text-primary font-bold">{subInfo.planNombre}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[11px] font-semibold text-foreground/80">Usuarios</span>
            <span className="text-xs font-bold text-foreground">
              {subInfo.totalUsersUsed} <span className="text-muted-foreground font-normal">/ {subInfo.planLimit}</span>
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
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

      {/* User info & theme toggle row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold uppercase shrink-0">
            {user?.email?.charAt(0) ?? 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-foreground truncate">
              {user?.user_metadata?.nombre_completo ?? 'Administrador'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email ?? 'conectando...'}</p>
          </div>
        </div>

        {/* Botón de Modo Oscuro / Claro */}
        <ThemeToggle className="shrink-0" />
      </div>

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-card border border-border hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground text-xs font-semibold transition-all duration-200"
      >
        <IconLogout /> Cerrar sesión
      </button>
    </div>
  );

  return (
    <>
      {/* ── BARRA MÓVIL SUPERIOR (< md) ────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border w-full shrink-0 z-30">
        <Link href="/" className="flex items-center gap-2">
          <img 
            src={user?.app_metadata?.id_institucion ? `https://gxtuarqsfqrdvksmuioe.supabase.co/storage/v1/object/public/logos/${user.app_metadata.id_institucion}/logo.png` : "/favicon.png"} 
            onError={(e) => {
              e.currentTarget.src = "/favicon.png";
            }}
            alt="Sophos Core Logo" 
            className="w-7 h-7 object-contain rounded-lg" 
          />
          <span className="text-base font-bold tracking-tight text-foreground">
            Sophos<span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent"> Core</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary focus:outline-none"
            aria-label="Abrir menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ── DRAWER MÓVIL DESPLEGABLE (< md) ────────────────────────────── */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs" 
            onClick={() => setIsMobileOpen(false)}
          />
          
          {/* Drawer content */}
          <div className="relative flex flex-col w-72 max-w-[80vw] bg-card h-full border-r border-border shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <span className="text-sm font-bold text-foreground">Menú de Navegación</span>
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {navContent}
            {profileFooter}
          </div>
        </div>
      )}

      {/* ── SIDEBAR DESKTOP FIJO (>= md) ───────────────────────────────── */}
      <aside className="w-64 border-r border-border hidden md:flex flex-col justify-between shrink-0 bg-card/90 backdrop-blur-md h-full">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="p-6 border-b border-border shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img 
                src={user?.app_metadata?.id_institucion ? `https://gxtuarqsfqrdvksmuioe.supabase.co/storage/v1/object/public/logos/${user.app_metadata.id_institucion}/logo.png` : "/favicon.png"} 
                onError={(e) => {
                  e.currentTarget.src = "/favicon.png";
                }}
                alt="Sophos Core Logo" 
                className="w-8 h-8 object-contain rounded-lg shadow-sm" 
              />
              <span className="text-lg font-bold tracking-tight text-foreground">
                Sophos<span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent"> Core</span>
              </span>
            </Link>
          </div>

          {navContent}
        </div>

        {profileFooter}
      </aside>
    </>
  );
}
