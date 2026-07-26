'use client';

import { useCierrePeriodo } from '@/hooks/useCierrePeriodo';
import { PeriodosGrid } from './PeriodosGrid';
import { CuadroHonor } from './CuadroHonor';
import { ReprobacionMaterias } from './ReprobacionMaterias';
import { BoletinesTable } from './BoletinesTable';
import { ConfirmCloseModal } from './ConfirmCloseModal';

interface CierrePeriodoManagerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  students?: any[];
}

export function CierrePeriodoManager({ students = [] }: CierrePeriodoManagerProps) {
  const {
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
  } = useCierrePeriodo({ students });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <p className="text-sm text-muted-foreground">Cargando datos de periodos e indicadores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-350">
      {/* Mensajes de Alerta */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-200 text-sm">
          <strong>Error:</strong> {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-200 text-sm font-semibold">
          {successMsg}
        </div>
      )}

      {/* SECCIÓN 1: CONTROL DE PERÍODOS */}
      <PeriodosGrid
        periodos={periodos}
        closingId={closingId}
        onClosePeriod={handleClosePeriod}
      />

      {/* SECCIÓN 2: INDICADORES E HISTORIAL */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <CuadroHonor cuadroHonor={stats.cuadroHonor} />
          <ReprobacionMaterias reprobacionMaterias={stats.reprobacionMaterias} />
        </div>
      )}

      {/* SECCIÓN 3: ACCESO Y DESCARGA DE BOLETINES */}
      <BoletinesTable
        periodos={periodos}
        selectedPeriodForBulletins={selectedPeriodForBulletins}
        onSelectPeriod={setSelectedPeriodForBulletins}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredStudents={filteredStudents}
        onOpenBulletin={handleOpenBulletin}
      />

      {/* MODAL DE CONFIRMACIÓN DE CIERRE */}
      <ConfirmCloseModal
        confirmModal={confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={executeClosePeriod}
      />
    </div>
  );
}
