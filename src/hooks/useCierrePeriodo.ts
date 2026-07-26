'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getPeriodosStatus,
  closePeriod,
  getDashboardStats,
  PeriodoStatus,
} from '@/app/actions/cierre-actions';

interface UseCierrePeriodoProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  students?: any[];
}

export function useCierrePeriodo({ students = [] }: UseCierrePeriodoProps = {}) {
  const [periodos, setPeriodos] = useState<PeriodoStatus[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriodForBulletins, setSelectedPeriodForBulletins] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{ periodId: string; numero: number } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resP = await getPeriodosStatus();
      if (resP.success && resP.data) {
        setPeriodos(resP.data);
        const closedPeriod = resP.data.find((p) => p.cerrado);
        const activePeriod = resP.data.find((p) => p.activo);
        setSelectedPeriodForBulletins(
          closedPeriod?.id_periodo || activePeriod?.id_periodo || ''
        );
      } else {
        setErrorMsg(resP.error || 'No se pudieron cargar los períodos.');
      }

      const resS = await getDashboardStats();
      if (resS.success && resS.data) {
        setStats(resS.data);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClosePeriod = (periodId: string, numero: number) => {
    setConfirmModal({ periodId, numero });
  };

  const executeClosePeriod = async () => {
    if (!confirmModal) return;
    const { periodId, numero } = confirmModal;
    setConfirmModal(null);

    setClosingId(periodId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await closePeriod(periodId);
      if (res.success) {
        setSuccessMsg(
          `¡Período ${numero} cerrado exitosamente! Boletines consolidados creados.`
        );
        await loadData();
      } else {
        setErrorMsg(res.error || `Ocurrió un error al cerrar el período ${numero}.`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Error al procesar el cierre.');
    } finally {
      setClosingId(null);
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenBulletin = (matriculaId: string) => {
    if (!selectedPeriodForBulletins) {
      alert('Por favor selecciona un período válido.');
      return;
    }
    window.open(`/dashboard/admin/boletin/${matriculaId}/${selectedPeriodForBulletins}`, '_blank');
  };

  return {
    periodos,
    stats,
    loading,
    closingId,
    errorMsg,
    successMsg,
    searchQuery,
    setSearchQuery,
    selectedPeriodForBulletins,
    setSelectedPeriodForBulletins,
    confirmModal,
    setConfirmModal,
    filteredStudents,
    handleClosePeriod,
    executeClosePeriod,
    handleOpenBulletin,
    loadData,
  };
}
