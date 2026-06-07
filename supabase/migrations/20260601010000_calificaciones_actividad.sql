-- =====================================================================
-- ADICIÓN DE COLUMNA ACTIVIDAD PARA SOPORTAR MÚLTIPLES NOTAS POR DIMENSIÓN
-- =====================================================================

ALTER TABLE public.calificaciones 
  ADD COLUMN IF NOT EXISTS actividad TEXT NOT NULL DEFAULT 'General';
