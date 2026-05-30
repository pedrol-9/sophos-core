'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Student {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  grade: number;
  attendance: number;
  aiComment: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  institution: string;
}

// ─── MOCK DATA ───────────────────────────────────────────────────────────────
const INITIAL_STUDENTS: Student[] = [
  {
    id: '1',
    name: 'Sofía Valentina Ortega',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    subject: 'Matemáticas Avanzadas',
    grade: 4.8,
    attendance: 98,
    aiComment: 'Muestra un dominio excepcional en álgebra y trigonometría. Su participación es activa y propone soluciones creativas a problemas complejos. Se recomienda incentivarla con olimpiadas matemáticas.',
    status: 'excellent',
    institution: 'Colegio Metropolitano Central'
  },
  {
    id: '2',
    name: 'Mateo Alejandro Ríos',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    subject: 'Ciencias Naturales',
    grade: 3.2,
    attendance: 84,
    aiComment: 'Comprensión básica de conceptos químicos, pero con bajo rendimiento en reportes de laboratorio. Se observa distracción frecuente. Recomiendo reforzar actividades prácticas y guías estructuradas.',
    status: 'warning',
    institution: 'Colegio Metropolitano Central'
  },
  {
    id: '3',
    name: 'Camila Isabella Duarte',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    subject: 'Comprensión Lectora',
    grade: 4.2,
    attendance: 95,
    aiComment: 'Excelente capacidad de síntesis y redacción. Identifica con facilidad ideas principales y subtextos. Para mantener el ritmo, se sugiere lecturas complementarias de nivel universitario.',
    status: 'good',
    institution: 'Colegio Metropolitano Central'
  },
  {
    id: '4',
    name: 'Santiago Andrés Castro',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    subject: 'Física Clásica',
    grade: 2.7,
    attendance: 72,
    aiComment: 'Alerta crítica. El estudiante presenta dificultades severas con las leyes de Newton. La baja asistencia del 72% impacta directamente en su rendimiento. Requiere tutorías urgentes y comunicación con acudientes.',
    status: 'critical',
    institution: 'Colegio Metropolitano Central'
  },
  {
    id: '5',
    name: 'Valeria Sofía Mendoza',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    subject: 'Historia Universal',
    grade: 4.5,
    attendance: 100,
    aiComment: 'Pensamiento crítico sobresaliente. Vincula eventos del pasado con contextos modernos de manera muy fluida. Asistencia perfecta de 100%. Continúa así.',
    status: 'excellent',
    institution: 'Sede Norte Académica'
  }
];

// ─── ICONS ───────────────────────────────────────────────────────────────────
function IconHome() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function IconBuilding() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="9" y1="22" x2="9" y2="16" /><line x1="9" y1="16" x2="15" y2="16" /><line x1="15" y1="16" x2="15" y2="22" /><line x1="8" y1="6" x2="8" y2="6.01" /><line x1="16" y1="6" x2="16" y2="6.01" /><line x1="8" y1="10" x2="8" y2="10.01" /><line x1="16" y1="10" x2="16" y2="10.01" /></svg>;
}
function IconNotebook() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" /><path d="M6 6h10M6 10h10" /></svg>;
}
function IconSparkles() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z" /><path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5z" /><path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" /></svg>;
}
function IconChecklist() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
}
function IconSettings() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}
function IconLogout() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}
function IconUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconPlus() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function IconSearch() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function IconArrow() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Student Form State
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('Matemáticas Avanzadas');
  const [newGrade, setNewGrade] = useState(4.0);
  const [newAttendance, setNewAttendance] = useState(90);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleGenerateAIComment = (studentId: string) => {
    setIsGenerating(true);
    setGeneratingProgress(10);
    const interval = setInterval(() => {
      setGeneratingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsGenerating(false);
            setStudents((prevStudents) =>
              prevStudents.map((s) => {
                if (s.id === studentId) {
                  const comments = [
                    'Muestra avances significativos en sus razonamientos. Se aconseja continuar con el acompañamiento pedagógico para estabilizar sus notas.',
                    'Participación de alta calidad. Consolida conceptos con agilidad. Se sugiere guiarlo hacia proyectos interdisciplinarios.',
                    'Presenta lagunas conceptuales básicas. Sería ideal proveerle talleres de nivelación autónomos en horas libres.',
                    'Actitud muy receptiva, aunque la entrega tardía de trabajos afecta su evaluación. Se sugiere un cronograma de estudio guiado.'
                  ];
                  const randomComment = comments[Math.floor(Math.random() * comments.length)];
                  const updated = { ...s, aiComment: `[Actualizado por IA]: ${randomComment}` };
                  if (selectedStudent?.id === studentId) {
                    setSelectedStudent(updated);
                  }
                  return updated;
                }
                return s;
              })
            );
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    // Determine status based on grade
    let status: Student['status'] = 'good';
    if (newGrade >= 4.5) status = 'excellent';
    else if (newGrade >= 3.0) status = 'good';
    else if (newGrade >= 2.8) status = 'warning';
    else status = 'critical';

    const newStudent: Student = {
      id: Date.now().toString(),
      name: newName,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 999999)}?w=150`,
      subject: newSubject,
      grade: Number(newGrade),
      attendance: Number(newAttendance),
      aiComment: 'Esperando análisis académico de la IA para generar observaciones automáticas...',
      status,
      institution: 'Colegio Metropolitano Central'
    };

    setStudents([newStudent, ...students]);
    setNewName('');
    setNewGrade(4.0);
    setNewAttendance(95);
    setShowAddForm(false);

    // Auto trigger AI commentary simulation for the newly added student
    setTimeout(() => {
      handleGenerateAIComment(newStudent.id);
    }, 800);
  };

  // Filter students based on search
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#090d16] text-white">
      {/* ─── SIDEBAR ────────────────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-white/10 flex flex-col justify-between shrink-0 bg-[#0c1220]/90 backdrop-blur-md">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                  <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                Sophos<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"> Core</span>
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
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
              <span className="text-[10px] bg-indigo-500/25 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">3</span>
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
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'attendance'
                  ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <IconChecklist /> Asistencia
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600/15 border-l-2 border-indigo-500 text-indigo-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <IconSettings /> Configuración
            </button>
          </nav>
        </div>

        {/* Profile Card / Logout */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-[#0a0f1b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-300 font-bold uppercase">
              {user?.email?.charAt(0) ?? 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white/95 truncate">
                {user?.email?.split('@')[0] ?? 'Administrador'}
              </p>
              <p className="text-xs text-white/40 truncate">{user?.email ?? 'conectando...'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-white/70 text-xs font-semibold transition-all duration-200"
          >
            <IconLogout /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* Glow behind main */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-indigo-500/5 blur-[120px] pointer-events-none" />

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Panel Académico</h1>
            <p className="text-sm text-white/50 mt-1">Supervisión integrada e inteligencia predictiva académica</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-all shadow-md shadow-indigo-600/20 hover:-translate-y-0.5"
            >
              <IconPlus /> Registrar Nota / Alumno
            </button>
          </div>
        </div>

        {/* ─── STATS GRID ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Total Estudiantes</p>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-2xl font-bold">1,248</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/15 font-semibold px-2 py-0.5 rounded-full">+4.2%</span>
            </div>
            <p className="text-[11px] text-white/35 mt-1.5">Sedes activas: 3</p>
          </div>

          <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Promedio Académico</p>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-2xl font-bold">4.15 <span className="text-sm text-white/40 font-normal">/5.0</span></span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/15 font-semibold px-2 py-0.5 rounded-full">+0.12</span>
            </div>
            <p className="text-[11px] text-white/35 mt-1.5">Meta institucional: 4.00</p>
          </div>

          <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Asistencia Promedio</p>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-2xl font-bold">94.6%</span>
              <span className="text-[10px] text-rose-400 bg-rose-500/15 font-semibold px-2 py-0.5 rounded-full">-0.2%</span>
            </div>
            <p className="text-[11px] text-white/35 mt-1.5">Objetivo mínimo: 90.0%</p>
          </div>

          <div className="bg-white/3 border border-white/10 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Análisis de IA Generados</p>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-2xl font-bold">348</span>
              <span className="text-[10px] text-cyan-400 bg-cyan-500/20 font-bold px-2.5 py-0.5 rounded-full">Sincro</span>
            </div>
            <p className="text-[11px] text-white/35 mt-1.5">Precisión estimada: 98%</p>
          </div>
        </div>

        {/* ─── WORK AREA (FLEX LAYOUT) ────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT: STUDENT TABLE / CARDS */}
          <div className="flex-1 w-full bg-white/3 border border-white/10 rounded-2xl backdrop-blur-sm overflow-hidden">
            
            {/* Search Filter */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center gap-4 flex-wrap">
              <h2 className="text-lg font-semibold text-white">Calificaciones y Monitoreo de IA</h2>
              
              <div className="relative w-64">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                  <IconSearch />
                </span>
                <input
                  type="text"
                  placeholder="Buscar alumno o materia..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-white/10">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-white/40 text-sm">
                  No se encontraron estudiantes que coincidan con la búsqueda.
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`p-5 flex items-center justify-between gap-4 cursor-pointer transition-all hover:bg-white/5 ${
                      selectedStudent?.id === student.id ? 'bg-indigo-600/5 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative">
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-indigo-900 border border-white/10 flex items-center justify-center text-white/60 font-medium">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }} />
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#090d16] ${
                          student.status === 'excellent' ? 'bg-emerald-500' :
                          student.status === 'good' ? 'bg-indigo-400' :
                          student.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-white truncate">{student.name}</p>
                        <p className="text-xs text-white/50 truncate">{student.subject} • {student.institution}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0">
                      {/* Attendance */}
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-white/40 uppercase font-medium">Asistencia</p>
                        <p className="text-xs font-semibold text-white">{student.attendance}%</p>
                      </div>
                      
                      {/* Grade Badge */}
                      <div className="text-center min-w-[50px]">
                        <p className="text-[10px] text-white/40 uppercase font-medium">Nota</p>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          student.grade >= 4.5 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          student.grade >= 3.0 ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          student.grade >= 2.8 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {student.grade.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: DETAIL PANEL */}
          <div className="w-full lg:w-96 bg-[#0c1220] border border-white/10 rounded-2xl p-6 backdrop-blur-sm shrink-0 min-h-[450px] relative overflow-hidden">
            {/* Ambient Purple glow in detail card */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            {selectedStudent ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-indigo-900 border border-white/10 flex items-center justify-center text-white/60 mx-auto relative mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-bold text-base text-white">{selectedStudent.name}</h3>
                  <p className="text-xs text-white/40 mt-1">{selectedStudent.institution}</p>
                </div>

                <hr className="border-white/10" />

                {/* Academic Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/2 border border-white/5 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-white/40 uppercase block mb-1">Materia</span>
                    <span className="text-xs font-semibold text-white/90 block truncate">{selectedStudent.subject}</span>
                  </div>
                  <div className="bg-white/2 border border-white/5 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-white/40 uppercase block mb-1">Ausentismo</span>
                    <span className="text-xs font-semibold text-white/90 block">{100 - selectedStudent.attendance}% ({Math.round((100 - selectedStudent.attendance) * 0.3)} días)</span>
                  </div>
                </div>

                {/* AI Commentary Card */}
                <div className="relative bg-indigo-600/5 border border-indigo-500/25 rounded-2xl p-5 shadow-inner">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      <IconSparkles /> Comentario IA Académica
                    </span>
                    <span className="text-[9px] bg-indigo-500/25 text-indigo-300 font-semibold px-2 py-0.5 rounded-full">Optimizado</span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed italic">
                    &ldquo;{selectedStudent.aiComment}&rdquo;
                  </p>

                  {/* Typing Simulator Loader */}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-[#0c1220]/95 flex flex-col items-center justify-center rounded-2xl">
                      <svg className="animate-spin w-8 h-8 text-indigo-500 mb-2" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-xs text-indigo-400 font-semibold">Generando análisis académico...</p>
                      <div className="w-32 bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="bg-indigo-500 h-full rounded-full transition-all duration-150" style={{ width: `${generatingProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Action button */}
                <button
                  onClick={() => handleGenerateAIComment(selectedStudent.id)}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 disabled:opacity-60"
                >
                  <IconSparkles /> Regenerar Comentario con IA
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-white/40">
                <div className="w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center mb-4">
                  <IconUser />
                </div>
                <p className="text-sm">Selecciona un estudiante para visualizar su reporte completo y el análisis automático de IA.</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── SLIDE-OVER MODAL: ADD STUDENT / GRADE ────────────────────────── */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-md h-full bg-[#0c1220] border-l border-white/10 p-8 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-white">Registrar Calificación</h2>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="p-1 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAddStudent} className="space-y-5">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">Nombre Completo Alumno</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Daniel Antonio Torres"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">Materia / Asignatura</label>
                    <select
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                    >
                      <option className="bg-[#0c1220]" value="Matemáticas Avanzadas">Matemáticas Avanzadas</option>
                      <option className="bg-[#0c1220]" value="Ciencias Naturales">Ciencias Naturales</option>
                      <option className="bg-[#0c1220]" value="Comprensión Lectora">Comprensión Lectora</option>
                      <option className="bg-[#0c1220]" value="Física Clásica">Física Clásica</option>
                      <option className="bg-[#0c1220]" value="Historia Universal">Historia Universal</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">Calificación (0.0 - 5.0)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        required
                        value={newGrade}
                        onChange={(e) => setNewGrade(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wide">Asistencia %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={newAttendance}
                        onChange={(e) => setNewAttendance(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-violet-500 text-sm font-semibold text-white transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Registrar Nota <IconArrow />
                    </button>
                    <p className="text-[10px] text-white/30 text-center mt-3 leading-relaxed">
                      Al presionar registrar, la nota se guardará de forma segura en la base de datos y la IA Académica iniciará automáticamente el análisis predictivo.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
