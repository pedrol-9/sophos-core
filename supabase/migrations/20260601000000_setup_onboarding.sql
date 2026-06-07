-- =====================================================================
-- MIGRACIÓN FASE 1.5 - PARAMETRIZACIÓN Y ONBOARDING WIZARD
-- =====================================================================

-- 1. Crear Enums Necesarios
CREATE TYPE public.tipo_desempeno_escala AS ENUM ('SUPERIOR', 'ALTO', 'BASICO', 'BAJO');
CREATE TYPE public.tipo_dimension_nota AS ENUM ('SABER', 'HACER', 'SER');

-- 2. Tabla: periodos_academicos
CREATE TABLE IF NOT EXISTS public.periodos_academicos (
  id_periodo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  numero_periodo INTEGER NOT NULL CHECK (numero_periodo BETWEEN 1 AND 4),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_periodo_institucion UNIQUE (id_institucion, numero_periodo)
);

-- 3. Tabla: escala_valoracion
CREATE TABLE IF NOT EXISTS public.escala_valoracion (
  id_escala UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  nombre_desempeno public.tipo_desempeno_escala NOT NULL,
  nota_minima NUMERIC NOT NULL CHECK (nota_minima >= 0.0 AND nota_minima <= 5.0),
  nota_maxima NUMERIC NOT NULL CHECK (nota_maxima >= 0.0 AND nota_maxima <= 5.0),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_rango_escala CHECK (nota_minima <= nota_maxima),
  CONSTRAINT unique_desempeno_institucion UNIQUE (id_institucion, nombre_desempeno)
);

-- 4. Tabla: configuracion_ponderaciones
CREATE TABLE IF NOT EXISTS public.configuracion_ponderaciones (
  id_ponderacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  peso_saber NUMERIC NOT NULL DEFAULT 0.40 CHECK (peso_saber >= 0.0 AND peso_saber <= 1.0),
  peso_hacer NUMERIC NOT NULL DEFAULT 0.40 CHECK (peso_hacer >= 0.0 AND peso_hacer <= 1.0),
  peso_ser NUMERIC NOT NULL DEFAULT 0.20 CHECK (peso_ser >= 0.0 AND peso_ser <= 1.0),
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_suma_ponderaciones_1 CHECK (peso_saber + peso_hacer + peso_ser = 1.0),
  CONSTRAINT unique_ponderacion_institucion UNIQUE (id_institucion)
);

-- 5. Tabla: evidencias_logros
CREATE TABLE IF NOT EXISTS public.evidencias_logros (
  id_logro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_asignacion UUID NOT NULL REFERENCES public.asignaciones_academicas(id_asignacion) ON DELETE CASCADE,
  id_periodo UUID NOT NULL REFERENCES public.periodos_academicos(id_periodo) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Conectar tabla calificaciones con Fase 1.5
-- Agregamos la referencia a periodos_academicos y la dimensión correspondiente de la nota
ALTER TABLE public.calificaciones 
  ADD COLUMN IF NOT EXISTS id_periodo UUID REFERENCES public.periodos_academicos(id_periodo) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dimension public.tipo_dimension_nota NOT NULL DEFAULT 'SABER';

-- 7. Habilitar RLS en todas las nuevas tablas
ALTER TABLE public.periodos_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_valoracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_ponderaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias_logros ENABLE ROW LEVEL SECURITY;

-- 8. Crear políticas de aislamiento por Institución (Tenant Isolation)
CREATE POLICY tenant_isolation_periodos_academicos ON public.periodos_academicos
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

CREATE POLICY tenant_isolation_escala_valoracion ON public.escala_valoracion
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

CREATE POLICY tenant_isolation_configuracion_ponderaciones ON public.configuracion_ponderaciones
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

-- RLS para evidencias_logros (aislamiento cruzado vía la asignación académica)
CREATE POLICY tenant_isolation_evidencias_logros ON public.evidencias_logros
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a 
      WHERE a.id_asignacion = public.evidencias_logros.id_asignacion
      AND a.id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a 
      WHERE a.id_asignacion = public.evidencias_logros.id_asignacion
      AND a.id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid
    )
  );

-- 9. Garantizar acceso a API REST para que el cliente Supabase pueda operar
GRANT ALL ON TABLE public.periodos_academicos TO authenticated, anon;
GRANT ALL ON TABLE public.escala_valoracion TO authenticated, anon;
GRANT ALL ON TABLE public.configuracion_ponderaciones TO authenticated, anon;
GRANT ALL ON TABLE public.evidencias_logros TO authenticated, anon;
