'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
      className={`relative inline-flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Sol Icon (Visible en modo oscuro para cambiar a claro) */}
        <svg
          className={`w-5 h-5 transition-all duration-300 transform ${
            theme === 'dark' ? 'rotate-0 scale-100 opacity-100 text-amber-400' : '-rotate-90 scale-0 opacity-0 text-amber-500'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>

        {/* Luna Icon (Visible en modo claro para cambiar a oscuro) */}
        <svg
          className={`w-5 h-5 absolute transition-all duration-300 transform ${
            theme === 'light' ? 'rotate-0 scale-100 opacity-100 text-indigo-600' : 'rotate-90 scale-0 opacity-0 text-indigo-400'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </div>

      {showLabel && (
        <span className="ml-2.5 text-xs font-medium">
          {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
        </span>
      )}
    </button>
  );
}
