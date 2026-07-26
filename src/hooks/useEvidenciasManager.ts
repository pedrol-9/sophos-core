'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  getEvidenciasAdminFull,
  upsertEvidencia,
  deleteEvidencia,
  aprobarEvidenciaAdmin,
  rechazarEvidenciaAdmin,
  syncEvidencias11A11BData,
  EvidenciaAdminDetail,
} from '@/app/actions/evidenciasActions';

export type MateriaOption = { id_materia: string; nombre: string };
export type CursoOption = { id_curso: string; nombre: string };

export const GRADOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

export function useEvidenciasManager() {
  const supabase = createClient();

  const [materias, setMaterias] = useState<MateriaOption[]>([]);
  const [selectedMateria, setSelectedMateria] = useState('');

  const [selectedGrado, setSelectedGrado] = useState('6');

  const [cursos, setCursos] = useState<CursoOption[]>([]);
  const [selectedCurso, setSelectedCurso] = useState('');

  const [evidencias, setEvidencias] = useState<EvidenciaAdminDetail[]>([]);
  const [activePeriodoNumero, setActivePeriodoNumero] = useState<number | null>(null);
  const [stats, setStats] = useState({
    totalBanco: 0,
    totalActivasPeriodo: 0,
    totalPendientesAprobacion: 0,
    totalUsadasAnteriores: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<EvidenciaAdminDetail | null>(null);
  const [saving, setSaving] = useState(false);

  // Evitar ejecuciones repetidas de sync en render
  const syncDoneRef = useRef(false);

  // 1. Cargar materias al montar e iniciar sync
  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!syncDoneRef.current) {
        syncDoneRef.current = true;
        await syncEvidencias11A11BData();
      }

      const idInst = user.app_metadata?.id_institucion;
      const { data } = await supabase
        .from('materias')
        .select('id_materia, nombre')
        .eq('id_institucion', idInst)
        .order('nombre');

      if (data && data.length > 0) {
        setMaterias(data);
      }
    }
    loadInitialData();
  }, [supabase]);

  // 2. Cargar cursos al cambiar de grado
  useEffect(() => {
    async function loadCursos() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const idInst = user.app_metadata?.id_institucion;

      const { data } = await supabase
        .from('cursos')
        .select('id_curso, nombre')
        .eq('id_institucion', idInst)
        .order('nombre');

      if (data) {
        const matching = data.filter((c) => {
          const digits = c.nombre.replace(/[^0-9]/g, '');
          return digits === selectedGrado || c.nombre.startsWith(selectedGrado);
        });
        setCursos(matching);
        setSelectedCurso('');
      }
    }
    loadCursos();
  }, [selectedGrado, supabase]);

  // 3. Cargar evidencias (función reutilizable y reactiva)
  const fetchEvidencias = useCallback(async (cancelledRef?: { current: boolean }) => {
    if (!selectedMateria) {
      setEvidencias([]);
      return;
    }

    setLoading(true);
    setError('');

    const res = await getEvidenciasAdminFull({
      idMateria: selectedMateria,
      grado: selectedGrado,
      idCurso: selectedCurso || undefined,
    });

    if (cancelledRef?.current) return;

    setLoading(false);
    if (res.success) {
      setEvidencias(res.data || []);
      if (res.activePeriodoNumero !== undefined) setActivePeriodoNumero(res.activePeriodoNumero);
      if (res.stats) setStats(res.stats);
    } else {
      setError(res.error || 'Error al cargar evidencias.');
      setEvidencias([]);
    }
  }, [selectedMateria, selectedGrado, selectedCurso]);

  useEffect(() => {
    const cancelledRef = { current: false };
    fetchEvidencias(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchEvidencias]);

  // Handlers para el formulario modal
  const openCreateForm = () => {
    setEditTarget(null);
    setShowForm(true);
  };

  const openEditForm = (ev: EvidenciaAdminDetail) => {
    setEditTarget(ev);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setError('');
  };

  // Acciones sobre evidencias
  const handleAprobar = async (idEvidencia: string) => {
    const res = await aprobarEvidenciaAdmin(idEvidencia);
    if (res.success) {
      fetchEvidencias();
    } else {
      setError(res.error || 'Error al aprobar la evidencia sugerida.');
    }
  };

  const handleRechazar = async (idEvidencia: string) => {
    if (!confirm('¿Rechazar esta evidencia sugerida por el docente?')) return;
    const res = await rechazarEvidenciaAdmin(idEvidencia);
    if (res.success) {
      fetchEvidencias();
    } else {
      setError(res.error || 'Error al rechazar la evidencia.');
    }
  };

  const handleDelete = async (idEvidencia: string) => {
    if (!confirm('¿Eliminar esta evidencia? Se perderán las configuraciones de docentes asociadas.')) return;
    const res = await deleteEvidencia(idEvidencia);
    if (res.success) {
      fetchEvidencias();
    } else {
      setError(res.error || 'Error al eliminar.');
    }
  };

  const handleSave = async (formData: {
    nombre: string;
    descripcion: string;
    orden: number;
    activo: boolean;
  }) => {
    if (!formData.nombre.trim()) return;
    setSaving(true);
    setError('');

    const res = await upsertEvidencia({
      id_evidencia: editTarget?.id_evidencia,
      id_materia: selectedMateria,
      grado: selectedGrado,
      nombre: formData.nombre,
      descripcion: formData.descripcion || undefined,
      orden: formData.orden,
      activo: formData.activo,
    });

    setSaving(false);
    if (res.success) {
      closeForm();
      fetchEvidencias();
    } else {
      setError(res.error || 'Error al guardar.');
    }
  };

  return {
    materias,
    selectedMateria,
    setSelectedMateria,
    selectedGrado,
    setSelectedGrado,
    cursos,
    selectedCurso,
    setSelectedCurso,
    evidencias,
    activePeriodoNumero,
    stats,
    loading,
    error,
    setError,
    showForm,
    editTarget,
    saving,
    openCreateForm,
    openEditForm,
    closeForm,
    fetchEvidencias,
    handleAprobar,
    handleRechazar,
    handleDelete,
    handleSave,
  };
}
