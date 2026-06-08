-- =====================================================================
-- MIGRACIÓN: NOMENCLATURA DE CURSOS POR INSTITUCIÓN
-- Ejecutar en: Supabase Dashboard > SQL Editor o vía CLI
-- =====================================================================

-- 1. Añadir columna nomenclatura_cursos a instituciones
ALTER TABLE public.instituciones 
  ADD COLUMN IF NOT EXISTS nomenclatura_cursos TEXT;

-- 2. Comentario de la columna para documentar su propósito
COMMENT ON COLUMN public.instituciones.nomenclatura_cursos IS 'Nomenclatura base seleccionada por el administrador para identificar sus cursos (ej: 6A, 601, o personalizado).';
