-- =====================================================================
-- MIGRACIÓN: REFACTORIZACIÓN Y FORTALECIMIENTO DE ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- 1. Crear Funciones de Utilidad en el esquema auth (si no existen)
-- Estas funciones evitan decodificar el JWT repetidamente en las políticas.
CREATE OR REPLACE FUNCTION auth.get_id_institucion() 
RETURNS UUID AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid,
    NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.get_rol() 
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'rol')::text,
    NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Limpieza de Políticas Previas (si existen)
DROP POLICY IF EXISTS tenant_isolation_instituciones ON public.instituciones;
DROP POLICY IF EXISTS tenant_isolation_usuarios ON public.usuarios;
DROP POLICY IF EXISTS tenant_isolation_cursos ON public.cursos;
DROP POLICY IF EXISTS tenant_isolation_materias ON public.materias;
DROP POLICY IF EXISTS tenant_isolation_estudiantes_matriculados ON public.estudiantes_matriculados;
DROP POLICY IF EXISTS tenant_isolation_asignaciones_academicas ON public.asignaciones_academicas;
DROP POLICY IF EXISTS tenant_isolation_perfiles_acudientes_estudiantes ON public.perfiles_acudientes_estudiantes;
DROP POLICY IF EXISTS tenant_isolation_calificaciones ON public.calificaciones;
DROP POLICY IF EXISTS tenant_isolation_asistencias ON public.asistencias;
DROP POLICY IF EXISTS tenant_isolation_observador_digital ON public.observador_digital;
DROP POLICY IF EXISTS tenant_isolation_periodos_academicos ON public.periodos_academicos;
DROP POLICY IF EXISTS tenant_isolation_escala_valoracion ON public.escala_valoracion;
DROP POLICY IF EXISTS tenant_isolation_configuracion_ponderaciones ON public.configuracion_ponderaciones;
DROP POLICY IF EXISTS tenant_isolation_evidencias_logros ON public.evidencias_logros;
DROP POLICY IF EXISTS tenant_isolation_evidencias ON public.evidencias;
DROP POLICY IF EXISTS tenant_isolation_config_evidencias ON public.configuracion_evidencias_periodo;

-- Asegurar que RLS esté activado en todas las tablas
ALTER TABLE public.instituciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes_matriculados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_academicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_acudientes_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observador_digital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_valoracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_evidencias_periodo ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 3. NUEVAS POLÍTICAS DE AISLAMIENTO POR INSTITUCIÓN Y ROL
-- =====================================================================

-- ── 3.1 TABLA: instituciones ─────────────────────────────────────────
CREATE POLICY select_instituciones ON public.instituciones
  FOR SELECT TO authenticated
  USING (id_institucion = auth.get_id_institucion());

CREATE POLICY write_instituciones ON public.instituciones
  FOR ALL TO authenticated
  USING (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN')
  WITH CHECK (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');

-- ── 3.2 TABLA: usuarios ──────────────────────────────────────────────
CREATE POLICY select_usuarios ON public.usuarios
  FOR SELECT TO authenticated
  USING (id_institucion = auth.get_id_institucion());

CREATE POLICY insert_usuarios ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');

CREATE POLICY delete_usuarios ON public.usuarios
  FOR DELETE TO authenticated
  USING (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');

CREATE POLICY update_usuarios ON public.usuarios
  FOR UPDATE TO authenticated
  USING (id_institucion = auth.get_id_institucion())
  WITH CHECK (
    id_institucion = auth.get_id_institucion()
    AND (
      auth.get_rol() = 'ADMIN'
      OR (
        id_usuario = auth.uid()
        -- Impedir que usuarios cambien su rol mediante UPDATE
        AND rol = (SELECT rol FROM public.usuarios WHERE id_usuario = auth.uid())
      )
    )
  );

-- ── 3.3 TABLAS: cursos, materias, periodos_academicos, escala_valoracion, evidencias ──
-- Cursos:
CREATE POLICY select_cursos ON public.cursos
  FOR SELECT TO authenticated
  USING (id_institucion = auth.get_id_institucion());

CREATE POLICY write_cursos ON public.cursos
  FOR ALL TO authenticated
  USING (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN')
  WITH CHECK (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');

-- Materias:
CREATE POLICY select_materias ON public.materias
  FOR SELECT TO authenticated
  USING (id_institucion = auth.get_id_institucion());

CREATE POLICY write_materias ON public.materias
  FOR ALL TO authenticated
  USING (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN')
  WITH CHECK (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');

-- Periodos Académicos:
CREATE POLICY select_periodos ON public.periodos_academicos
  FOR SELECT TO authenticated
  USING (id_institucion = auth.get_id_institucion());

CREATE POLICY write_periodos ON public.periodos_academicos
  FOR ALL TO authenticated
  USING (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN')
  WITH CHECK (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');

-- Escalas de Valoración:
CREATE POLICY select_escalas ON public.escala_valoracion
  FOR SELECT TO authenticated
  USING (id_institucion = auth.get_id_institucion());

CREATE POLICY write_escalas ON public.escala_valoracion
  FOR ALL TO authenticated
  USING (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN')
  WITH CHECK (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');

-- Evidencias:
CREATE POLICY select_evidencias ON public.evidencias
  FOR SELECT TO authenticated
  USING (id_institucion = auth.get_id_institucion());

CREATE POLICY write_evidencias ON public.evidencias
  FOR ALL TO authenticated
  USING (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN')
  WITH CHECK (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');

-- Evidencias Logros:
CREATE POLICY select_evidencias_logros ON public.evidencias_logros
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a 
      WHERE a.id_asignacion = public.evidencias_logros.id_asignacion
      AND a.id_institucion = auth.get_id_institucion()
    )
  );

CREATE POLICY write_evidencias_logros ON public.evidencias_logros
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a 
      WHERE a.id_asignacion = public.evidencias_logros.id_asignacion
      AND a.id_institucion = auth.get_id_institucion()
      AND (auth.get_rol() = 'ADMIN' OR a.id_docente = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a 
      WHERE a.id_asignacion = public.evidencias_logros.id_asignacion
      AND a.id_institucion = auth.get_id_institucion()
      AND (auth.get_rol() = 'ADMIN' OR a.id_docente = auth.uid())
    )
  );

-- ── 3.4 TABLA: estudiantes_matriculados ────────────────────────────────
CREATE POLICY select_matriculas ON public.estudiantes_matriculados
  FOR SELECT TO authenticated
  USING (
    id_institucion = auth.get_id_institucion()
    AND (
      auth.get_rol() IN ('ADMIN', 'DOCENTE')
      OR (auth.get_rol() = 'ESTUDIANTE' AND id_estudiante = auth.uid())
      OR (
        auth.get_rol() = 'ACUDIENTE'
        AND EXISTS (
          SELECT 1 FROM public.perfiles_acudientes_estudiantes p
          WHERE p.id_estudiante = estudiantes_matriculados.id_estudiante
          AND p.id_acudiente = auth.uid()
        )
      )
    )
  );

CREATE POLICY write_matriculas ON public.estudiantes_matriculados
  FOR ALL TO authenticated
  USING (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN')
  WITH CHECK (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');

-- ── 3.5 TABLA: asignaciones_academicas ─────────────────────────────────
CREATE POLICY select_asignaciones ON public.asignaciones_academicas
  FOR SELECT TO authenticated
  USING (id_institucion = auth.get_id_institucion());

CREATE POLICY write_asignaciones ON public.asignaciones_academicas
  FOR ALL TO authenticated
  USING (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN')
  WITH CHECK (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');

-- ── 3.6 TABLA: perfiles_acudientes_estudiantes ─────────────────────────
CREATE POLICY select_acudientes ON public.perfiles_acudientes_estudiantes
  FOR SELECT TO authenticated
  USING (
    id_institucion = auth.get_id_institucion()
    AND (
      auth.get_rol() IN ('ADMIN', 'DOCENTE')
      OR id_acudiente = auth.uid()
      OR id_estudiante = auth.uid()
    )
  );

CREATE POLICY write_acudientes ON public.perfiles_acudientes_estudiantes
  FOR ALL TO authenticated
  USING (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN')
  WITH CHECK (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');

-- ── 3.7 TABLA: configuracion_evidencias_periodo ────────────────────────
CREATE POLICY select_config_evidencias ON public.configuracion_evidencias_periodo
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a
      WHERE a.id_asignacion = configuracion_evidencias_periodo.id_asignacion
      AND a.id_institucion = auth.get_id_institucion()
    )
  );

CREATE POLICY write_config_evidencias ON public.configuracion_evidencias_periodo
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a
      WHERE a.id_asignacion = configuracion_evidencias_periodo.id_asignacion
      AND a.id_institucion = auth.get_id_institucion()
      AND (auth.get_rol() = 'ADMIN' OR a.id_docente = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a
      WHERE a.id_asignacion = configuracion_evidencias_periodo.id_asignacion
      AND a.id_institucion = auth.get_id_institucion()
      AND (auth.get_rol() = 'ADMIN' OR a.id_docente = auth.uid())
    )
  );

-- ── 3.8 TABLA: calificaciones ──────────────────────────────────────────
-- SELECT:
CREATE POLICY select_calificaciones ON public.calificaciones
  FOR SELECT TO authenticated
  USING (
    id_institucion = auth.get_id_institucion()
    AND (
      auth.get_rol() = 'ADMIN'
      OR (
        auth.get_rol() = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = calificaciones.id_asignacion 
          AND a.id_docente = auth.uid()
        )
      )
      OR (
        auth.get_rol() = 'ESTUDIANTE'
        AND EXISTS (
          SELECT 1 FROM public.estudiantes_matriculados m
          WHERE m.id_matricula = calificaciones.id_matricula
          AND m.id_estudiante = auth.uid()
        )
      )
      OR (
        auth.get_rol() = 'ACUDIENTE'
        AND EXISTS (
          SELECT 1 FROM public.perfiles_acudientes_estudiantes p
          JOIN public.estudiantes_matriculados m ON m.id_estudiante = p.id_estudiante
          WHERE m.id_matricula = calificaciones.id_matricula
          AND p.id_acudiente = auth.uid()
        )
      )
    )
  );

-- WRITE (INSERT, UPDATE, DELETE):
CREATE POLICY write_calificaciones ON public.calificaciones
  FOR ALL TO authenticated
  USING (
    id_institucion = auth.get_id_institucion()
    AND (
      auth.get_rol() = 'ADMIN'
      OR (
        auth.get_rol() = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = calificaciones.id_asignacion 
          AND a.id_docente = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    id_institucion = auth.get_id_institucion()
    AND (
      auth.get_rol() = 'ADMIN'
      OR (
        auth.get_rol() = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = calificaciones.id_asignacion 
          AND a.id_docente = auth.uid()
        )
      )
    )
  );

-- ── 3.9 TABLA: asistencias ─────────────────────────────────────────────
-- SELECT:
CREATE POLICY select_asistencias ON public.asistencias
  FOR SELECT TO authenticated
  USING (
    id_institucion = auth.get_id_institucion()
    AND (
      auth.get_rol() = 'ADMIN'
      OR (
        auth.get_rol() = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = asistencias.id_asignacion 
          AND a.id_docente = auth.uid()
        )
      )
      OR (
        auth.get_rol() = 'ESTUDIANTE'
        AND EXISTS (
          SELECT 1 FROM public.estudiantes_matriculados m
          WHERE m.id_matricula = asistencias.id_matricula
          AND m.id_estudiante = auth.uid()
        )
      )
      OR (
        auth.get_rol() = 'ACUDIENTE'
        AND EXISTS (
          SELECT 1 FROM public.perfiles_acudientes_estudiantes p
          JOIN public.estudiantes_matriculados m ON m.id_estudiante = p.id_estudiante
          WHERE m.id_matricula = asistencias.id_matricula
          AND p.id_acudiente = auth.uid()
        )
      )
    )
  );

-- WRITE (INSERT, UPDATE, DELETE):
CREATE POLICY write_asistencias ON public.asistencias
  FOR ALL TO authenticated
  USING (
    id_institucion = auth.get_id_institucion()
    AND (
      auth.get_rol() = 'ADMIN'
      OR (
        auth.get_rol() = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = asistencias.id_asignacion 
          AND a.id_docente = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    id_institucion = auth.get_id_institucion()
    AND (
      auth.get_rol() = 'ADMIN'
      OR (
        auth.get_rol() = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = asistencias.id_asignacion 
          AND a.id_docente = auth.uid()
        )
      )
    )
  );

-- ── 3.10 TABLA: observador_digital ─────────────────────────────────────
-- SELECT:
CREATE POLICY select_observador ON public.observador_digital
  FOR SELECT TO authenticated
  USING (
    id_institucion = auth.get_id_institucion()
    AND (
      auth.get_rol() IN ('ADMIN', 'DOCENTE')
      OR id_estudiante = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.perfiles_acudientes_estudiantes p
        WHERE p.id_estudiante = observador_digital.id_estudiante
        AND p.id_acudiente = auth.uid()
      )
    )
  );

-- INSERT: Solo directivos y docentes
CREATE POLICY insert_observador ON public.observador_digital
  FOR INSERT TO authenticated
  WITH CHECK (
    id_institucion = auth.get_id_institucion()
    AND auth.get_rol() IN ('ADMIN', 'DOCENTE')
  );

-- UPDATE:
-- 1. Administradores pueden editar todo el registro.
-- 2. El docente autor de la observación puede editar su registro.
-- 3. Estudiantes y Acudientes solo pueden editar para firmar (firmado = true, fecha_firma, firmado_por).
CREATE POLICY update_observador ON public.observador_digital
  FOR UPDATE TO authenticated
  USING (id_institucion = auth.get_id_institucion())
  WITH CHECK (
    id_institucion = auth.get_id_institucion()
    AND (
      auth.get_rol() = 'ADMIN'
      OR (auth.get_rol() = 'DOCENTE' AND id_docente = auth.uid())
      OR (
        -- El estudiante firma de enterado
        auth.get_rol() = 'ESTUDIANTE'
        AND id_estudiante = auth.uid()
        AND firmado = true
        -- Asegurar que los datos de la observación permanezcan sin alterar
        AND id_observador = (SELECT id_observador FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
        AND id_estudiante = (SELECT id_estudiante FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
        AND id_docente = (SELECT id_docente FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
        AND tipo_nota = (SELECT tipo_nota FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
        AND observacion_informal = (SELECT observacion_informal FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
        AND observacion_formal_ia = (SELECT observacion_formal_ia FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
      )
      OR (
        -- El acudiente firma de enterado
        auth.get_rol() = 'ACUDIENTE'
        AND EXISTS (
          SELECT 1 FROM public.perfiles_acudientes_estudiantes p
          WHERE p.id_estudiante = observador_digital.id_estudiante
          AND p.id_acudiente = auth.uid()
        )
        AND firmado = true
        -- Asegurar que los datos de la observación permanezcan sin alterar
        AND id_observador = (SELECT id_observador FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
        AND id_estudiante = (SELECT id_estudiante FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
        AND id_docente = (SELECT id_docente FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
        AND tipo_nota = (SELECT tipo_nota FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
        AND observacion_informal = (SELECT observacion_informal FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
        AND observacion_formal_ia = (SELECT observacion_formal_ia FROM public.observador_digital WHERE id_observador = observador_digital.id_observador)
      )
    )
  );

-- DELETE: Solo administradores pueden purgar el observador digital
CREATE POLICY delete_observador ON public.observador_digital
  FOR DELETE TO authenticated
  USING (id_institucion = auth.get_id_institucion() AND auth.get_rol() = 'ADMIN');
