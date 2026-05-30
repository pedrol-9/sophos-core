/**
 * @file src/components/auth/InactivityProvider.tsx
 * @description Proveedor de cliente para cerrar sesión automáticamente por inactividad.
 * 
 * Escucha eventos del DOM (mouse, teclado, scrolls, clicks) y mantiene un temporizador de 30 minutos.
 * Si no hay actividad en ese lapso, cierra la sesión del usuario con Supabase y redirige al login.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface InactivityProviderProps {
  children: React.ReactNode;
  timeoutMs?: number; // Tiempo de inactividad configurable (por defecto 30 minutos)
}

/**
 * Proveedor de control de inactividad.
 * Envolverá la aplicación (generalmente el layout protegido del Dashboard) para
 * monitorear si el usuario está inactivo.
 */
export function InactivityProvider({
  children,
  timeoutMs = 30 * 60 * 1000, // 30 minutos por defecto
}: InactivityProviderProps) {
  const router = useRouter();
  const supabase = createClient();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveRef = useRef<number>(0);

  useEffect(() => {
    // Función para ejecutar el cierre de sesión por inactividad
    const logoutUser = async () => {
      try {
        console.log('Sesión expirada por inactividad (30 minutos).');
        await supabase.auth.signOut();
        // Redirigir al usuario al login con un query param descriptivo
        router.push('/login?message=session_expired');
        router.refresh();
      } catch (error) {
        console.error('Error al cerrar sesión por inactividad:', error);
      }
    };

    // Resetea el temporizador de inactividad
    const resetTimer = () => {
      const now = Date.now();
      // Optimización: Evitar limpiar y re-crear timers en ráfagas de eventos rápidas (ej. mousemove continuo)
      // Solo refrescamos el temporizador si han pasado al menos 1000ms desde el último reset
      if (now - lastActiveRef.current < 1000 && timeoutRef.current) {
        return;
      }
      
      lastActiveRef.current = now;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(logoutUser, timeoutMs);
    };

    // Eventos que consideraremos como actividad del usuario
    const activityEvents = [
      'mousemove',
      'keydown',
      'click',
      'scroll',
      'touchstart',
    ];

    const setupListeners = () => {
      lastActiveRef.current = Date.now();
      activityEvents.forEach((event) => {
        window.addEventListener(event, resetTimer, { passive: true });
      });
      resetTimer();
    };

    const cleanupListeners = () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // Monitorear cambios en el estado de autenticación para activar/desactivar listeners
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Si hay una sesión activa, comenzamos a rastrear la inactividad
        setupListeners();
      } else {
        // Si no hay sesión (usuario deslogueado), limpiamos eventos y timers
        cleanupListeners();
      }
    });

    // Cleanup al desmontar el componente
    return () => {
      subscription.unsubscribe();
      cleanupListeners();
    };
  }, [router, supabase, timeoutMs]);

  return <>{children}</>;
}
