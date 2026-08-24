-- =====================================================================
-- MIGRACIÓN: SUBDOMINIOS PERSONALIZADOS PARA INSTITUCIONES (ONE-TIME SETUP)
-- =====================================================================

-- 1. Agregar columnas a la tabla de instituciones
ALTER TABLE public.instituciones 
ADD COLUMN IF NOT EXISTS subdominio TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subdominio_bloqueado BOOLEAN DEFAULT FALSE;

-- 2. Restricción de formato: solo minúsculas, números y guiones, entre 3 y 30 caracteres
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'instituciones_subdominio_format_check'
  ) THEN
    ALTER TABLE public.instituciones 
    ADD CONSTRAINT instituciones_subdominio_format_check 
    CHECK (subdominio IS NULL OR (subdominio ~ '^[a-z0-9-]+$' AND LENGTH(subdominio) >= 3 AND LENGTH(subdominio) <= 30));
  END IF;
END $$;

-- 3. Índice único para búsquedas rápidas por subdominio
CREATE UNIQUE INDEX IF NOT EXISTS instituciones_subdominio_idx 
ON public.instituciones (subdominio) 
WHERE subdominio IS NOT NULL;
