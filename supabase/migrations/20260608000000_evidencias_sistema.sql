-- =====================================================================
-- MIGRACIÓN: SISTEMA DE EVIDENCIAS POR PERIODO
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =====================================================================

-- 1. TABLA PRINCIPAL: evidencias
-- Define las evidencias de aprendizaje del año, por grado + materia.
-- Las configura el coordinador académico al inicio del año lectivo.
CREATE TABLE IF NOT EXISTS public.evidencias (
  id_evidencia  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_institucion UUID       NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  id_materia    UUID        NOT NULL REFERENCES public.materias(id_materia) ON DELETE CASCADE,
  grado         TEXT        NOT NULL,    -- Ej: '6', '7', '10', '11'
  nombre        TEXT        NOT NULL,    -- Ej: 'Evaluación escrita', 'Proyecto de aula'
  descripcion   TEXT,
  ano_lectivo   INTEGER     NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  orden         INTEGER     NOT NULL DEFAULT 1,
  activo        BOOLEAN     NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_evidencia_grado_materia
    UNIQUE (id_institucion, id_materia, grado, nombre, ano_lectivo)
);

-- 2. TABLA: configuracion_evidencias_periodo
-- Almacena qué evidencias activa el docente para un periodo dado
-- y con qué peso de ponderación. Persiste la selección del modal.
CREATE TABLE IF NOT EXISTS public.configuracion_evidencias_periodo (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_asignacion UUID        NOT NULL REFERENCES public.asignaciones_academicas(id_asignacion) ON DELETE CASCADE,
  id_periodo    UUID        NOT NULL REFERENCES public.periodos_academicos(id_periodo) ON DELETE CASCADE,
  id_evidencia  UUID        NOT NULL REFERENCES public.evidencias(id_evidencia) ON DELETE CASCADE,
  activo        BOOLEAN     NOT NULL DEFAULT TRUE,
  peso          NUMERIC(5,4) NOT NULL DEFAULT 1.0
                  CHECK (peso >= 0.0 AND peso <= 1.0),
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_config_evidencia
    UNIQUE (id_asignacion, id_periodo, id_evidencia)
);

-- 3. AÑADIR FK id_evidencia EN calificaciones
-- Opcional en el registro (NULL = calificación sin evidencia específica)
ALTER TABLE public.calificaciones
  ADD COLUMN IF NOT EXISTS id_evidencia UUID
    REFERENCES public.evidencias(id_evidencia) ON DELETE SET NULL;

-- 4. RLS + POLÍTICAS DE AISLAMIENTO TENANT

ALTER TABLE public.evidencias ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'evidencias' AND policyname = 'tenant_isolation_evidencias'
  ) THEN
    CREATE POLICY tenant_isolation_evidencias ON public.evidencias
      FOR ALL TO authenticated
      USING (
        id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid
      )
      WITH CHECK (
        id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid
      );
  END IF;
END $$;

ALTER TABLE public.configuracion_evidencias_periodo ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'configuracion_evidencias_periodo'
      AND policyname = 'tenant_isolation_config_evidencias'
  ) THEN
    CREATE POLICY tenant_isolation_config_evidencias
      ON public.configuracion_evidencias_periodo
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a
          WHERE a.id_asignacion = public.configuracion_evidencias_periodo.id_asignacion
            AND a.id_institucion =
                (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a
          WHERE a.id_asignacion = public.configuracion_evidencias_periodo.id_asignacion
            AND a.id_institucion =
                (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid
        )
      );
  END IF;
END $$;

-- 5. GRANTS — exponer tablas al Data API
GRANT ALL ON TABLE public.evidencias TO authenticated, anon;
GRANT ALL ON TABLE public.configuracion_evidencias_periodo TO authenticated, anon;
