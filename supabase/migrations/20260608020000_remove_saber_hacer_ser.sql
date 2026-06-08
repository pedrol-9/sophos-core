-- =====================================================================
-- MIGRACIÓN: ELIMINACIÓN DE DIMENSIONES COGNITIVA, PROCEDIMENTAL Y ACTITUDINAL (SABER, HACER, SER)
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================================

-- 1. Eliminar columna dimension de calificaciones
ALTER TABLE public.calificaciones DROP COLUMN IF EXISTS dimension;

-- 2. Eliminar tabla configuracion_ponderaciones
DROP TABLE IF EXISTS public.configuracion_ponderaciones CASCADE;

-- 3. Eliminar enum tipo_dimension_nota
DROP TYPE IF EXISTS public.tipo_dimension_nota CASCADE;
