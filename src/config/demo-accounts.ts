export interface DemoAccount {
  id: string;
  role: 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE' | 'ACUDIENTE' | 'SUPER_ADMIN';
  title: string;
  subtitle: string;
  email: string;
  password: string;
  institutionName: string;
  avatarIcon: string;
  badge: string;
  badgeColor: string;
  description: string;
  features: string[];
}

export const DEMO_PASSWORD_DEFAULT = 'Sophos2026!';

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'admin',
    role: 'ADMIN',
    title: 'Rector / Administrador',
    subtitle: 'IE Jose María Carbonell',
    email: 'contacto@jm-carbonell.edu.co',
    password: DEMO_PASSWORD_DEFAULT,
    institutionName: 'IE Jose María Carbonell',
    avatarIcon: '🏛️',
    badge: 'Gestión Total',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    description: 'Control de sede principal, matrículas, asignaciones académicas, escalas y configuración.',
    features: ['Carga Masiva CSV', 'Configuración de Periodos', 'Tokens de IA', 'Métricas Institucionales'],
  },
  {
    id: 'docente',
    role: 'DOCENTE',
    title: 'Docente de Matemáticas',
    subtitle: 'Lic. Mariana Fuentes',
    email: 'mariana.fuentes@edu.co',
    password: DEMO_PASSWORD_DEFAULT,
    institutionName: 'IE Jose María Carbonell',
    avatarIcon: '👩‍🏫',
    badge: 'Cursos y Planillas',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    description: 'Gestión de materias, registro de notas por evidencias, toma de asistencias y observador.',
    features: ['Calificación por Evidencias', 'Asistencia Rápida', 'Observador Digital', 'Generación de Reportes'],
  },
  {
    id: 'estudiante',
    role: 'ESTUDIANTE',
    title: 'Estudiante (Grado 10-A)',
    subtitle: 'Mateo Silva',
    email: 'mateo.silva@edu.co',
    password: DEMO_PASSWORD_DEFAULT,
    institutionName: 'IE Jose María Carbonell',
    avatarIcon: '🎓',
    badge: 'Portal Alumno',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    description: 'Boletín de calificaciones en tiempo real con retroalimentación cualitativa y reporte de faltas.',
    features: ['Boletín con IA', 'Historial de Periodos', 'Control de Faltas', 'Resumen por Materia'],
  },
  {
    id: 'acudiente',
    role: 'ACUDIENTE',
    title: 'Acudiente / Padre de Familia',
    subtitle: 'Rodrigo Silva (2 Hijos)',
    email: 'rodrigo.silva@parent.co',
    password: DEMO_PASSWORD_DEFAULT,
    institutionName: 'IE Jose María Carbonell',
    avatarIcon: '👨‍👩‍👦',
    badge: 'Seguimiento Familiar',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    description: 'Seguimiento integral del rendimiento y comportamiento escolar con selector multi-hijo.',
    features: ['Selector Familiar Multi-Hijo', 'Alertas de Asistencia', 'Anotaciones de Observador', 'Boletín de Notas'],
  },
  {
    id: 'superadmin',
    role: 'SUPER_ADMIN',
    title: 'Super Administrador SaaS',
    subtitle: 'Sophos Platform Global',
    email: 'superadmin@sophos.com',
    password: DEMO_PASSWORD_DEFAULT,
    institutionName: 'Sophos Core Global',
    avatarIcon: '🌐',
    badge: 'Multitenant',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    description: 'Visión panorámica de todas las instituciones registradas, planes y salud del sistema.',
    features: ['Gestión de Instituciones', 'Planes y Subdominios', 'Logs Globales', 'Métricas de Red'],
  },
];

export const DEMO_EMAILS = DEMO_ACCOUNTS.map((acc) => acc.email);

export function isDemoEmail(email?: string | null): boolean {
  if (!email) return false;
  return DEMO_EMAILS.includes(email.toLowerCase().trim());
}
