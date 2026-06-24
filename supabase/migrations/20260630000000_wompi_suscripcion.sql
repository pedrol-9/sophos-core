-- =====================================================================
-- MIGRACIÓN: INTEGRACIÓN WOMPI - SUSCRIPCIONES POR EXPIRACIÓN
-- =====================================================================

-- 1. Agregar columna fecha_expiracion a instituciones
--    Por defecto, 30 días de prueba gratuita desde el registro.
ALTER TABLE public.instituciones
  ADD COLUMN IF NOT EXISTS fecha_expiracion TIMESTAMP WITH TIME ZONE
  DEFAULT (NOW() + INTERVAL '30 days');

-- Instituciones ya existentes con suscripción activa obtienen 1 año de gracia
UPDATE public.instituciones
  SET fecha_expiracion = NOW() + INTERVAL '1 year'
  WHERE estado_suscripcion = 'ACTIVO' AND fecha_expiracion IS NULL;

-- 2. Tabla de transacciones Wompi para auditoría y trazabilidad
CREATE TABLE IF NOT EXISTS public.transacciones_wompi (
  id_transaccion      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_institucion      UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  referencia_wompi    TEXT NOT NULL UNIQUE,   -- REF-COLEGIO-{id}-{planId}-{meses}-{timestamp}
  id_suscripcion      INTEGER REFERENCES public.planes_suscripcion(id_suscripcion),
  meses_adquiridos    INTEGER NOT NULL DEFAULT 1,
  valor_cop           BIGINT NOT NULL,         -- Valor en centavos de COP
  estado              TEXT NOT NULL DEFAULT 'PENDIENTE',  -- PENDIENTE | APROBADA | RECHAZADA
  wompi_transaction_id TEXT,                  -- ID interno de Wompi
  fecha_creacion      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.transacciones_wompi ENABLE ROW LEVEL SECURITY;

-- RLS: Admins ven sus propias transacciones
CREATE POLICY admin_select_transacciones ON public.transacciones_wompi
  FOR SELECT TO authenticated
  USING (id_institucion = public.get_id_institucion());

-- RLS: SUPER_ADMIN ve todas
CREATE POLICY super_admin_all_transacciones ON public.transacciones_wompi
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');

-- 3. Concesión de permisos
GRANT ALL ON TABLE public.transacciones_wompi TO authenticated, anon;
