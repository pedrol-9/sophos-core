'use client';

import { User } from '@supabase/supabase-js';
import { type AcademicAssignment } from '@/app/actions/academic/teacher-actions';
import { IconNotebook, IconChecklist, IconLogout } from '@/components/icons';
import { ThemeToggle } from '@/components/theme';
import { getInstitutionLogoUrl } from '@/utils/institution-logo';

interface DocenteSidebarProps {
  user: User | null;
  selectedAssignment: AcademicAssignment | null;
  activeTab: 'courses' | 'attendance_tab' | 'observador_tab';
  setActiveTab: (tab: 'courses' | 'attendance_tab' | 'observador_tab') => void;
  onClearSelectedStudent: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function DocenteSidebar({
  user,
  selectedAssignment,
  activeTab,
  setActiveTab,
  onClearSelectedStudent,
  mobileMenuOpen,
  setMobileMenuOpen,
  onLogout,
}: DocenteSidebarProps) {
  const institutionLogo = getInstitutionLogoUrl(user?.app_metadata?.id_institucion);

  const renderSidebarNav = (isMobile = false) => (
    <nav className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-1 mb-2">
          {selectedAssignment ? `Gestionar: ${selectedAssignment.cursos?.nombre}` : 'Menú Principal'}
        </p>

        <button
          disabled={!selectedAssignment}
          onClick={() => {
            setActiveTab('courses');
            onClearSelectedStudent();
            if (isMobile) setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            activeTab === 'courses' && selectedAssignment
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <IconNotebook className="w-4 h-4" /> Calificar Alumnos
        </button>

        <button
          disabled={!selectedAssignment}
          onClick={() => {
            setActiveTab('attendance_tab');
            onClearSelectedStudent();
            if (isMobile) setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            activeTab === 'attendance_tab'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <IconChecklist className="w-4 h-4" /> Control de Faltas
        </button>

        <button
          disabled={!selectedAssignment}
          onClick={() => {
            setActiveTab('observador_tab');
            onClearSelectedStudent();
            if (isMobile) setMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            activeTab === 'observador_tab'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Observador del Estudiante
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Docente Sidebar (Desktop) */}
      <aside className="w-64 border-r border-border hidden md:flex flex-col justify-between shrink-0 bg-card backdrop-blur-md relative z-10 h-full shadow-xs">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="p-6 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={institutionLogo} 
                onError={(e) => { e.currentTarget.src = "/favicon.png"; }}
                alt="Escudo Institucional" 
                className="w-8 h-8 object-contain rounded-lg shadow-sm" 
              />
              <span className="text-lg font-bold tracking-tight text-foreground">
                Portal<span className="text-primary"> Docente</span>
              </span>
            </div>
          </div>
          {renderSidebarNav(false)}
        </div>

        {/* Profile Card, Theme Toggle & Logout */}
        <div className="p-4 border-t border-border space-y-3 bg-secondary/30 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold uppercase shrink-0">
                {user?.email?.charAt(0) ?? 'D'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.user_metadata?.nombre_completo
                    ? `Profe ${user.user_metadata.nombre_completo.trim().split(/\s+/)[0]}`
                    : 'Profe'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">Docente</p>
              </div>
            </div>

            <ThemeToggle />
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
          >
            <IconLogout /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Docente Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-72 max-w-[80vw] bg-card border-r border-border h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col flex-1 min-h-0">
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={institutionLogo} 
                    onError={(e) => { e.currentTarget.src = "/favicon.png"; }}
                    alt="Escudo Institucional" 
                    className="w-7 h-7 object-contain rounded-lg" 
                  />
                  <span className="text-base font-bold tracking-tight text-foreground">
                    Portal<span className="text-primary"> Docente</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  aria-label="Cerrar menú"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {renderSidebarNav(true)}
            </div>

            <div className="p-4 border-t border-border space-y-3 bg-secondary/30 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold uppercase shrink-0">
                    {user?.email?.charAt(0) ?? 'D'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {user?.user_metadata?.nombre_completo
                        ? `Profe ${user.user_metadata.nombre_completo.trim().split(/\s+/)[0]}`
                        : 'Profe'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">Docente</p>
                  </div>
                </div>
                <ThemeToggle />
              </div>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-background border border-border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 text-muted-foreground text-xs font-semibold transition-all duration-200 cursor-pointer"
              >
                <IconLogout /> Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
