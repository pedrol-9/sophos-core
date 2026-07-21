/**
 * @file src/components/index.ts
 * @description Barrel de exportaciones para componentes de UI atómicos de Sophos-Core.
 *
 * Convención de estructura:
 * - src/components/ui/        → Componentes primitivos (Button, Input, Badge, etc.)
 * - src/components/layout/    → Componentes estructurales (Sidebar, Navbar, Footer)
 * - src/components/auth/      → Componentes del flujo de autenticación
 * - src/components/dashboard/ → Componentes específicos del panel de control
 *
 * Exportar todos los componentes públicos desde este archivo para facilitar
 * los imports en el resto de la aplicación:
 * @example
 * import { Button, Badge } from '@/components';
 */

// Los componentes se exportarán aquí a medida que se implementen.
// export { Button } from './ui/Button';
// export { Navbar } from './layout/Navbar';

export { InactivityProvider } from './auth/InactivityProvider';
export { ThemeProvider, useTheme } from './ThemeProvider';
export { ThemeToggle } from './ThemeToggle';

