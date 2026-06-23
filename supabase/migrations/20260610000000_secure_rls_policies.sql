-- =====================================================================
-- MIGRACIÓN: REFACTORIZACIÓN Y FORTALECIMIENTO DE ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- 1. Crear Funciones de Utilidad en el esquema public
-- Estas funciones evitan decodificar el JWT repetidamente en las políticas.
-- Definidas en 'public' para evitar restricciones de permisos en el esquema 'auth'.
-- Configurado con search_path vacío para evitar secuestro de funciones.
CREATE OR REPLACE FUNCTION public.get_id_institucion() 
RETURNS UUID 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid,
    NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.get_rol() 
RETURNS TEXT 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'rol')::text,
    NULL
  );
$$;

-- 2. Limpieza de Políticas Previas (si existen)
DROP POLICY IF EXISTS select_instituciones ON public.instituciones;
DROP POLICY IF EXISTS write_instituciones ON public.instituciones;
DROP POLICY IF EXISTS select_usuarios ON public.usuarios;
DROP POLICY IF EXISTS insert_usuarios ON public.usuarios;
DROP POLICY IF EXISTS delete_usuarios ON public.usuarios;
DROP POLICY IF EXISTS update_usuarios ON public.usuarios;
DROP POLICY IF EXISTS select_cursos ON public.cursos;
DROP POLICY IF EXISTS write_cursos ON public.cursos;
DROP POLICY IF EXISTS select_materias ON public.materias;
DROP POLICY IF EXISTS write_materias ON public.materias;
DROP POLICY IF EXISTS select_periodos ON public.periodos_academicos;
DROP POLICY IF EXISTS write_periodos ON public.periodos_academicos;
DROP POLICY IF EXISTS select_escalas ON public.escala_valoracion;
DROP POLICY IF EXISTS write_escalas ON public.escala_valoracion;
DROP POLICY IF EXISTS select_evidencias ON public.evidencias;
DROP POLICY IF EXISTS write_evidencias ON public.evidencias;
DROP POLICY IF EXISTS select_evidencias_logros ON public.evidencias_logros;
DROP POLICY IF EXISTS write_evidencias_logros ON public.evidencias_logros;
DROP POLICY IF EXISTS select_matriculas ON public.estudiantes_matriculados;
DROP POLICY IF EXISTS write_matriculas ON public.estudiantes_matriculados;
DROP POLICY IF EXISTS select_asignaciones ON public.asignaciones_academicas;
DROP POLICY IF EXISTS write_asignaciones ON public.asignaciones_academicas;
DROP POLICY IF EXISTS select_acudientes ON public.perfiles_acudientes_estudiantes;
DROP POLICY IF EXISTS write_acudientes ON public.perfiles_acudientes_estudiantes;
DROP POLICY IF EXISTS select_config_evidencias ON public.configuracion_evidencias_periodo;
DROP POLICY IF EXISTS write_config_evidencias ON public.configuracion_evidencias_periodo;
DROP POLICY IF EXISTS select_calificaciones ON public.calificaciones;
DROP POLICY IF EXISTS write_calificaciones ON public.calificaciones;
DROP POLICY IF EXISTS select_asistencias ON public.asistencias;
DROP POLICY IF EXISTS write_asistencias ON public.asistencias;
DROP POLICY IF EXISTS select_observador ON public.observador_digital;
DROP POLICY IF EXISTS insert_observador ON public.observador_digital;
DROP POLICY IF EXISTS update_observador ON public.observador_digital;
DROP POLICY IF EXISTS delete_observador ON public.observador_digital;

-- Asegurar que RLS esté activado en todas las tablas relacionales públicas
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
ALTER TABLE public.evidencias_logros ENABLE ROW LEVEL SECURITY;

-- Asegurar RLS en tablas que omitían la seguridad
ALTER TABLE public.planes_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_ia_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Triggers para Garantizar la Inmutabilidad de Columnas Críticas (Bypass de subqueries WITH CHECK)

-- 3.1 Trigger para usuarios
CREATE OR REPLACE FUNCTION public.check_user_update_immutability()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  -- Si es un administrador, permitimos editar perfiles de su institución
  IF (SELECT public.get_rol()) = 'ADMIN' THEN
    -- El administrador no debe cambiar el id_usuario de nadie
    IF OLD.id_usuario <> NEW.id_usuario THEN
      RAISE EXCEPTION 'No se permite modificar el id_usuario.';
    END IF;
    -- El administrador no debe cambiar la institución de un usuario
    IF OLD.id_institucion <> NEW.id_institucion THEN
      RAISE EXCEPTION 'No se permite modificar la institución de un usuario.';
    END IF;
    RETURN NEW;
  END IF;

  -- Para usuarios no administradores (docentes, estudiantes, acudientes),
  -- solo pueden modificar su propio registro de usuario
  IF (SELECT auth.uid()) = OLD.id_usuario THEN
    -- No se les permite cambiar id_usuario, id_institucion, rol ni email
    IF OLD.id_usuario <> NEW.id_usuario OR
       OLD.id_institucion <> NEW.id_institucion OR
       OLD.rol <> NEW.rol OR
       OLD.email <> NEW.email
    THEN
      RAISE EXCEPTION 'No tienes permisos para modificar campos críticos (rol, institución, email, id).';
    END IF;
    RETURN NEW;
  END IF;

  -- Cualquier otro intento de modificación es denegado
  RAISE EXCEPTION 'Acceso denegado.';
END;
$$;

DROP TRIGGER IF EXISTS tr_check_user_update_immutability ON public.usuarios;
CREATE TRIGGER tr_check_user_update_immutability
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_update_immutability();

-- 3.2 Trigger para observador_digital
CREATE OR REPLACE FUNCTION public.check_observador_signature_immutability()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  -- Los administradores pueden editar cualquier campo
  IF (SELECT public.get_rol()) = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  -- Los docentes pueden editar sus propias observaciones
  IF (SELECT public.get_rol()) = 'DOCENTE' AND OLD.id_docente = (SELECT auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Los estudiantes y acudientes solo pueden editar para firmar de enterado.
  -- Esto significa que no pueden alterar ninguna columna excepto firmado, fecha_firma y firmado_por.
  IF (SELECT public.get_rol()) IN ('ACUDIENTE', 'ESTUDIANTE') THEN
    IF OLD.id_observador <> NEW.id_observador OR
       OLD.id_estudiante <> NEW.id_estudiante OR
       OLD.id_docente <> NEW.id_docente OR
       OLD.id_institucion <> NEW.id_institucion OR
       OLD.tipo_nota <> NEW.tipo_nota OR
       OLD.observacion_informal <> NEW.observacion_informal OR
       OLD.observacion_formal_ia <> NEW.observacion_formal_ia OR
       OLD.fecha_registro <> NEW.fecha_registro
    THEN
      RAISE EXCEPTION 'No tienes permisos para modificar el contenido de esta observación. Solo puedes firmarla.';
    END IF;

    -- Asegurar que solo puedan pasar de firmado = false a firmado = true
    IF OLD.firmado = TRUE AND NEW.firmado = FALSE THEN
      RAISE EXCEPTION 'No se permite remover una firma ya registrada.';
    END IF;

    RETURN NEW;
  END IF;

  -- Denegar por defecto
  RAISE EXCEPTION 'Acceso denegado.';
END;
$$;

DROP TRIGGER IF EXISTS tr_check_observador_signature_immutability ON public.observador_digital;
CREATE TRIGGER tr_check_observador_signature_immutability
  BEFORE UPDATE ON public.observador_digital
  FOR EACH ROW
  EXECUTE FUNCTION public.check_observador_signature_immutability();


-- =====================================================================
-- 4. NUEVAS POLÍTICAS DE AISLAMIENTO POR INSTITUCIÓN Y ROL (CON ENVOLTURA SELECT)
-- =====================================================================

-- ── 4.1 TABLA: instituciones ─────────────────────────────────────────
CREATE POLICY select_instituciones ON public.instituciones
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_instituciones ON public.instituciones
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- ── 4.2 TABLA: usuarios ──────────────────────────────────────────────
CREATE POLICY select_usuarios ON public.usuarios
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY insert_usuarios ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

CREATE POLICY delete_usuarios ON public.usuarios
  FOR DELETE TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

CREATE POLICY update_usuarios ON public.usuarios
  FOR UPDATE TO authenticated
  USING (
    id_institucion = (SELECT public.get_id_institucion())
    AND (
      (SELECT public.get_rol()) = 'ADMIN'
      OR id_usuario = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    id_institucion = (SELECT public.get_id_institucion())
  );

-- ── 4.3 TABLAS: cursos, materias, periodos_academicos, escala_valoracion, evidencias ──
-- Cursos:
CREATE POLICY select_cursos ON public.cursos
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_cursos ON public.cursos
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- Materias:
CREATE POLICY select_materias ON public.materias
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_materias ON public.materias
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- Periodos Académicos:
CREATE POLICY select_periodos ON public.periodos_academicos
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_periodos ON public.periodos_academicos
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- Escalas de Valoración:
CREATE POLICY select_escalas ON public.escala_valoracion
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_escalas ON public.escala_valoracion
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- Evidencias:
CREATE POLICY select_evidencias ON public.evidencias
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_evidencias ON public.evidencias
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- Evidencias Logros:
CREATE POLICY select_evidencias_logros ON public.evidencias_logros
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a 
      WHERE a.id_asignacion = public.evidencias_logros.id_asignacion
      AND a.id_institucion = (SELECT public.get_id_institucion())
    )
  );

CREATE POLICY write_evidencias_logros ON public.evidencias_logros
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a 
      WHERE a.id_asignacion = public.evidencias_logros.id_asignacion
      AND a.id_institucion = (SELECT public.get_id_institucion())
      AND ((SELECT public.get_rol()) = 'ADMIN' OR a.id_docente = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a 
      WHERE a.id_asignacion = public.evidencias_logros.id_asignacion
      AND a.id_institucion = (SELECT public.get_id_institucion())
      AND ((SELECT public.get_rol()) = 'ADMIN' OR a.id_docente = (SELECT auth.uid()))
    )
  );

-- ── 4.4 TABLA: estudiantes_matriculados ────────────────────────────────
CREATE POLICY select_matriculas ON public.estudiantes_matriculados
  FOR SELECT TO authenticated
  USING (
    id_institucion = (SELECT public.get_id_institucion())
    AND (
      (SELECT public.get_rol()) IN ('ADMIN', 'DOCENTE')
      OR ((SELECT public.get_rol()) = 'ESTUDIANTE' AND id_estudiante = (SELECT auth.uid()))
      OR (
        (SELECT public.get_rol()) = 'ACUDIENTE'
        AND EXISTS (
          SELECT 1 FROM public.perfiles_acudientes_estudiantes p
          WHERE p.id_estudiante = estudiantes_matriculados.id_estudiante
          AND p.id_acudiente = (SELECT auth.uid())
        )
      )
    )
  );

CREATE POLICY write_matriculas ON public.estudiantes_matriculados
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- ── 4.5 TABLA: asignaciones_academicas ─────────────────────────────────
CREATE POLICY select_asignaciones ON public.asignaciones_academicas
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_asignaciones ON public.asignaciones_academicas
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- ── 4.6 TABLA: perfiles_acudientes_estudiantes ─────────────────────────
CREATE POLICY select_acudientes ON public.perfiles_acudientes_estudiantes
  FOR SELECT TO authenticated
  USING (
    id_institucion = (SELECT public.get_id_institucion())
    AND (
      (SELECT public.get_rol()) IN ('ADMIN', 'DOCENTE')
      OR id_acudiente = (SELECT auth.uid())
      OR id_estudiante = (SELECT auth.uid())
    )
  );

CREATE POLICY write_acudientes ON public.perfiles_acudientes_estudiantes
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- ── 4.7 TABLA: configuracion_evidencias_periodo ────────────────────────
CREATE POLICY select_config_evidencias ON public.configuracion_evidencias_periodo
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a
      WHERE a.id_asignacion = configuracion_evidencias_periodo.id_asignacion
      AND a.id_institucion = (SELECT public.get_id_institucion())
    )
  );

CREATE POLICY write_config_evidencias ON public.configuracion_evidencias_periodo
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a
      WHERE a.id_asignacion = configuracion_evidencias_periodo.id_asignacion
      AND a.id_institucion = (SELECT public.get_id_institucion())
      AND ((SELECT public.get_rol()) = 'ADMIN' OR a.id_docente = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.asignaciones_academicas a
      WHERE a.id_asignacion = configuracion_evidencias_periodo.id_asignacion
      AND a.id_institucion = (SELECT public.get_id_institucion())
      AND ((SELECT public.get_rol()) = 'ADMIN' OR a.id_docente = (SELECT auth.uid()))
    )
  );

-- ── 4.8 TABLA: calificaciones ──────────────────────────────────────────
CREATE POLICY select_calificaciones ON public.calificaciones
  FOR SELECT TO authenticated
  USING (
    id_institucion = (SELECT public.get_id_institucion())
    AND (
      (SELECT public.get_rol()) = 'ADMIN'
      OR (
        (SELECT public.get_rol()) = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = calificaciones.id_asignacion 
          AND a.id_docente = (SELECT auth.uid())
        )
      )
      OR (
        (SELECT public.get_rol()) = 'ESTUDIANTE'
        AND EXISTS (
          SELECT 1 FROM public.estudiantes_matriculados m
          WHERE m.id_matricula = calificaciones.id_matricula
          AND m.id_estudiante = (SELECT auth.uid())
        )
      )
      OR (
        (SELECT public.get_rol()) = 'ACUDIENTE'
        AND EXISTS (
          SELECT 1 FROM public.perfiles_acudientes_estudiantes p
          JOIN public.estudiantes_matriculados m ON m.id_estudiante = p.id_estudiante
          WHERE m.id_matricula = calificaciones.id_matricula
          AND p.id_acudiente = (SELECT auth.uid())
        )
      )
    )
  );

CREATE POLICY write_calificaciones ON public.calificaciones
  FOR ALL TO authenticated
  USING (
    id_institucion = (SELECT public.get_id_institucion())
    AND (
      (SELECT public.get_rol()) = 'ADMIN'
      OR (
        (SELECT public.get_rol()) = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = calificaciones.id_asignacion 
          AND a.id_docente = (SELECT auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    id_institucion = (SELECT public.get_id_institucion())
    AND (
      (SELECT public.get_rol()) = 'ADMIN'
      OR (
        (SELECT public.get_rol()) = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = calificaciones.id_asignacion 
          AND a.id_docente = (SELECT auth.uid())
        )
      )
    )
  );

-- ── 4.9 TABLA: asistencias ─────────────────────────────────────────────
CREATE POLICY select_asistencias ON public.asistencias
  FOR SELECT TO authenticated
  USING (
    id_institucion = (SELECT public.get_id_institucion())
    AND (
      (SELECT public.get_rol()) = 'ADMIN'
      OR (
        (SELECT public.get_rol()) = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = asistencias.id_asignacion 
          AND a.id_docente = (SELECT auth.uid())
        )
      )
      OR (
        (SELECT public.get_rol()) = 'ESTUDIANTE'
        AND EXISTS (
          SELECT 1 FROM public.estudiantes_matriculados m
          WHERE m.id_matricula = asistencias.id_matricula
          AND m.id_estudiante = (SELECT auth.uid())
        )
      )
      OR (
        (SELECT public.get_rol()) = 'ACUDIENTE'
        AND EXISTS (
          SELECT 1 FROM public.perfiles_acudientes_estudiantes p
          JOIN public.estudiantes_matriculados m ON m.id_estudiante = p.id_estudiante
          WHERE m.id_matricula = asistencias.id_matricula
          AND p.id_acudiente = (SELECT auth.uid())
        )
      )
    )
  );

CREATE POLICY write_asistencias ON public.asistencias
  FOR ALL TO authenticated
  USING (
    id_institucion = (SELECT public.get_id_institucion())
    AND (
      (SELECT public.get_rol()) = 'ADMIN'
      OR (
        (SELECT public.get_rol()) = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = asistencias.id_asignacion 
          AND a.id_docente = (SELECT auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    id_institucion = (SELECT public.get_id_institucion())
    AND (
      (SELECT public.get_rol()) = 'ADMIN'
      OR (
        (SELECT public.get_rol()) = 'DOCENTE'
        AND EXISTS (
          SELECT 1 FROM public.asignaciones_academicas a 
          WHERE a.id_asignacion = asistencias.id_asignacion 
          AND a.id_docente = (SELECT auth.uid())
        )
      )
    )
  );

-- ── 4.10 TABLA: observador_digital ─────────────────────────────────────
CREATE POLICY select_observador ON public.observador_digital
  FOR SELECT TO authenticated
  USING (
    id_institucion = (SELECT public.get_id_institucion())
    AND (
      (SELECT public.get_rol()) IN ('ADMIN', 'DOCENTE')
      OR id_estudiante = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.perfiles_acudientes_estudiantes p
        WHERE p.id_estudiante = observador_digital.id_estudiante
        AND p.id_acudiente = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY insert_observador ON public.observador_digital
  FOR INSERT TO authenticated
  WITH CHECK (
    id_institucion = (SELECT public.get_id_institucion())
    AND (SELECT public.get_rol()) IN ('ADMIN', 'DOCENTE')
  );

-- UPDATE se audita por el trigger y se habilita para edición de firmas o registro docente/admin
CREATE POLICY update_observador ON public.observador_digital
  FOR UPDATE TO authenticated
  USING (
    id_institucion = (SELECT public.get_id_institucion())
    AND (
      (SELECT public.get_rol()) IN ('ADMIN', 'DOCENTE')
      OR (
        (SELECT public.get_rol()) = 'ESTUDIANTE'
        AND id_estudiante = (SELECT auth.uid())
      )
      OR (
        (SELECT public.get_rol()) = 'ACUDIENTE'
        AND EXISTS (
          SELECT 1 FROM public.perfiles_acudientes_estudiantes p
          WHERE p.id_estudiante = observador_digital.id_estudiante
          AND p.id_acudiente = (SELECT auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    id_institucion = (SELECT public.get_id_institucion())
  );

CREATE POLICY delete_observador ON public.observador_digital
  FOR DELETE TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- ── 4.11 TABLA: planes_suscripcion ─────────────────────────────────────
CREATE POLICY select_planes ON public.planes_suscripcion
  FOR SELECT TO anon, authenticated
  USING (true);

-- ── 4.12 TABLA: logs_ia_tokens ─────────────────────────────────────────
CREATE POLICY insert_logs_ia ON public.logs_ia_tokens
  FOR INSERT TO authenticated
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY select_logs_ia ON public.logs_ia_tokens
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');
