-- =====================================================================
-- MIGRACIÓN FASE 4 - FIRMA DIGITAL Y SEGUIMIENTO EN OBSERVADOR DIGITAL
-- =====================================================================

-- 1. Añadir columnas a la tabla observador_digital
ALTER TABLE public.observador_digital 
  ADD COLUMN IF NOT EXISTS firmado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_firma TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS firmado_por UUID REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL DEFAULT NULL;

-- 2. Garantizar accesos del API REST para estas columnas
GRANT ALL ON TABLE public.observador_digital TO authenticated, anon;

-- Nota: La política RLS existente (tenant_isolation_observador_digital) ya aísla por id_institucion
-- para operaciones SELECT, INSERT y UPDATE para usuarios autenticados.
