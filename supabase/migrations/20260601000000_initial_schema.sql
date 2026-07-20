-- =====================================================================
-- MIGRACIÓN CONSOLIDADA: CONFIGURACIÓN COMPLETA DEL ESQUEMA DE BASE DE DATOS
-- =====================================================================

-- 1. Crear Enums de Dominio
CREATE TYPE public.tipo_rol_usuario AS ENUM ('ADMIN', 'DOCENTE', 'ESTUDIANTE', 'ACUDIENTE', 'SUPER_ADMIN');
CREATE TYPE public.tipo_desempeno_escala AS ENUM ('SUPERIOR', 'ALTO', 'BASICO', 'BAJO');
CREATE TYPE public.tipo_estado_asistencia AS ENUM ('PRESENTE', 'FALTA_JUSTIFICADA', 'FALTA_INJUSTIFICADA', 'RETRASO');
CREATE TYPE public.tipo_estado_suscripcion AS ENUM ('ACTIVO', 'INACTIVE', 'PRUEBA');
CREATE TYPE public.tipo_nota_observador AS ENUM ('PEDAGOGICA', 'DISCIPLINARIA', 'LOGRO_DESTACADO');

-- 2. Tabla: planes_suscripcion
CREATE TABLE IF NOT EXISTS public.planes_suscripcion (
  id_suscripcion BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  precio NUMERIC NOT NULL,
  limite_usuarios INTEGER NOT NULL
);

-- 3. Tabla: instituciones
CREATE TABLE IF NOT EXISTS public.instituciones (
  id_institucion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nit TEXT NOT NULL UNIQUE,
  nombre_legal TEXT NOT NULL,
  dominio_personalizado TEXT,
  estado_suscripcion public.tipo_estado_suscripcion NOT NULL DEFAULT 'PRUEBA',
  id_suscripcion BIGINT REFERENCES public.planes_suscripcion(id_suscripcion) ON DELETE SET NULL,
  nomenclatura_cursos TEXT,
  fecha_expiracion TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla: usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
  id_usuario UUID PRIMARY KEY, -- Se vincula directamente a auth.users(id)
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  rol public.tipo_rol_usuario NOT NULL,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla: cursos
CREATE TABLE IF NOT EXISTS public.cursos (
  id_curso UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  jornada TEXT NOT NULL
);

-- 6. Tabla: materias
CREATE TABLE IF NOT EXISTS public.materias (
  id_materia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  area TEXT NOT NULL
);

-- 7. Tabla: estudiantes_matriculados
CREATE TABLE IF NOT EXISTS public.estudiantes_matriculados (
  id_matricula UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_estudiante UUID NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  id_curso UUID NOT NULL REFERENCES public.cursos(id_curso) ON DELETE CASCADE,
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  ano_lectivo INTEGER NOT NULL
);

-- 8. Tabla: asignaciones_academicas
CREATE TABLE IF NOT EXISTS public.asignaciones_academicas (
  id_asignacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_docente UUID NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  id_curso UUID NOT NULL REFERENCES public.cursos(id_curso) ON DELETE CASCADE,
  id_materia UUID NOT NULL REFERENCES public.materias(id_materia) ON DELETE CASCADE,
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  ano_lectivo INTEGER NOT NULL
);

-- 9. Tabla: periodos_academicos
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

-- 10. Tabla: escala_valoracion
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

-- 11. Tabla: evidencias
CREATE TABLE IF NOT EXISTS public.evidencias (
  id_evidencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  id_materia UUID NOT NULL REFERENCES public.materias(id_materia) ON DELETE CASCADE,
  grado TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  ano_lectivo INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  orden INTEGER NOT NULL DEFAULT 1,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_evidencia_grado_materia UNIQUE (id_institucion, id_materia, grado, nombre, ano_lectivo)
);

-- 12. Tabla: configuracion_evidencias_periodo
CREATE TABLE IF NOT EXISTS public.configuracion_evidencias_periodo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_asignacion UUID NOT NULL REFERENCES public.asignaciones_academicas(id_asignacion) ON DELETE CASCADE,
  id_periodo UUID NOT NULL REFERENCES public.periodos_academicos(id_periodo) ON DELETE CASCADE,
  id_evidencia UUID NOT NULL REFERENCES public.evidencias(id_evidencia) ON DELETE CASCADE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  peso NUMERIC(5,4) NOT NULL DEFAULT 1.0 CHECK (peso >= 0.0 AND peso <= 1.0),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_config_evidencia UNIQUE (id_asignacion, id_periodo, id_evidencia)
);

-- 13. Tabla: calificaciones
CREATE TABLE IF NOT EXISTS public.calificaciones (
  id_calificacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_matricula UUID NOT NULL REFERENCES public.estudiantes_matriculados(id_matricula) ON DELETE CASCADE,
  id_asignacion UUID NOT NULL REFERENCES public.asignaciones_academicas(id_asignacion) ON DELETE CASCADE,
  id_periodo UUID REFERENCES public.periodos_academicos(id_periodo) ON DELETE SET NULL,
  id_evidencia UUID REFERENCES public.evidencias(id_evidencia) ON DELETE SET NULL,
  nota NUMERIC NOT NULL CHECK (nota >= 0.0 AND nota <= 5.0),
  periodo INTEGER NOT NULL,
  actividad TEXT NOT NULL DEFAULT 'General',
  comentario_docente TEXT,
  comentario_ia TEXT,
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Tabla: asistencias
CREATE TABLE IF NOT EXISTS public.asistencias (
  id_asistencia UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_matricula UUID NOT NULL REFERENCES public.estudiantes_matriculados(id_matricula) ON DELETE CASCADE,
  id_asignacion UUID NOT NULL REFERENCES public.asignaciones_academicas(id_asignacion) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  estado public.tipo_estado_asistencia NOT NULL,
  observacion TEXT,
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE
);

-- 15. Tabla: observador_digital
CREATE TABLE IF NOT EXISTS public.observador_digital (
  id_observador UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_estudiante UUID NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  id_docente UUID NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  tipo_nota public.tipo_nota_observador NOT NULL,
  observacion_informal TEXT NOT NULL,
  observacion_formal_ia TEXT,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  firmado BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_firma TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  firmado_por UUID REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL DEFAULT NULL
);

-- 16. Tabla: perfiles_acudientes_estudiantes
CREATE TABLE IF NOT EXISTS public.perfiles_acudientes_estudiantes (
  id_acudiente_estudiante UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_acudiente UUID NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  id_estudiante UUID NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  parentesco TEXT NOT NULL
);

-- 17. Tabla: logs_ia_tokens
CREATE TABLE IF NOT EXISTS public.logs_ia_tokens (
  id_ia_token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  servicio_ia TEXT NOT NULL,
  tokens_usados INTEGER NOT NULL,
  costo_estimado NUMERIC NOT NULL,
  fecha_peticion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. Tabla: boletines_historicos
CREATE TABLE IF NOT EXISTS public.boletines_historicos (
  id_boletin UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_matricula UUID NOT NULL REFERENCES public.estudiantes_matriculados(id_matricula) ON DELETE CASCADE,
  id_periodo UUID NOT NULL REFERENCES public.periodos_academicos(id_periodo) ON DELETE CASCADE,
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  promedio_general NUMERIC(3,2) NOT NULL,
  datos_materias JSONB NOT NULL,
  fecha_cierre TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_boletin_matricula_periodo UNIQUE (id_matricula, id_periodo)
);

-- 19. Tabla: transacciones_mercadopago
CREATE TABLE IF NOT EXISTS public.transacciones_mercadopago (
  id_transaccion      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_institucion      UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  referencia_mercadopago TEXT NOT NULL UNIQUE,
  id_suscripcion      INTEGER REFERENCES public.planes_suscripcion(id_suscripcion),
  meses_adquiridos    INTEGER NOT NULL DEFAULT 1,
  valor_cop           BIGINT NOT NULL,         -- Valor en centavos de COP
  estado              TEXT NOT NULL DEFAULT 'PENDIENTE',  -- PENDIENTE | APROBADA | RECHAZADA
  mercadopago_payment_id TEXT,
  fecha_creacion      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. Tabla: evidencias_logros
CREATE TABLE IF NOT EXISTS public.evidencias_logros (
  id_logro UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_asignacion UUID NOT NULL REFERENCES public.asignaciones_academicas(id_asignacion) ON DELETE CASCADE,
  id_periodo UUID NOT NULL REFERENCES public.periodos_academicos(id_periodo) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =====================================================================
-- 21. FUNCIONES DE UTILIDAD (JWT)
-- =====================================================================
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


-- =====================================================================
-- 22. TRIGGERS Y FUNCIONES DE INMUTABILIDAD
-- =====================================================================

CREATE OR REPLACE FUNCTION public.check_user_update_immutability()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  -- Si es SUPER_ADMIN, permitir cualquier modificación
  IF (SELECT public.get_rol()) = 'SUPER_ADMIN' THEN
    RETURN NEW;
  END IF;

  -- Si es un administrador, permitimos editar perfiles de su institución
  IF (SELECT public.get_rol()) = 'ADMIN' THEN
    IF OLD.id_usuario <> NEW.id_usuario THEN
      RAISE EXCEPTION 'No se permite modificar el id_usuario.';
    END IF;
    IF OLD.id_institucion <> NEW.id_institucion THEN
      RAISE EXCEPTION 'No se permite modificar la institución de un usuario.';
    END IF;
    RETURN NEW;
  END IF;

  -- Para usuarios no administradores (docentes, estudiantes, acudientes),
  -- solo pueden modificar su propio registro de usuario
  IF (SELECT auth.uid()) = OLD.id_usuario THEN
    IF OLD.id_usuario <> NEW.id_usuario OR
       OLD.id_institucion <> NEW.id_institucion OR
       OLD.rol <> NEW.rol OR
       OLD.email <> NEW.email
    THEN
      RAISE EXCEPTION 'No tienes permisos para modificar campos críticos (rol, institución, email, id).';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Acceso denegado.';
END;
$$;

DROP TRIGGER IF EXISTS tr_check_user_update_immutability ON public.usuarios;
CREATE TRIGGER tr_check_user_update_immutability
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_update_immutability();


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
-- 23. HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================================
ALTER TABLE public.planes_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instituciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes_matriculados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_academicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_valoracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_evidencias_periodo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observador_digital ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles_acudientes_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_ia_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boletines_historicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones_mercadopago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidencias_logros ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- 24. NUEVAS POLÍTICAS RLS DE AISLAMIENTO POR INSTITUCIÓN Y ROL
-- =====================================================================

-- ── 24.1 TABLA: instituciones ─────────────────────────────────────────
CREATE POLICY select_instituciones ON public.instituciones
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_instituciones ON public.instituciones
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

CREATE POLICY super_admin_all_instituciones ON public.instituciones
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');

-- ── 24.2 TABLA: usuarios ──────────────────────────────────────────────
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

CREATE POLICY super_admin_all_usuarios ON public.usuarios
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');

-- ── 24.3 TABLA: cursos ────────────────────────────────────────────────
CREATE POLICY select_cursos ON public.cursos
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_cursos ON public.cursos
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- ── 24.4 TABLA: materias ──────────────────────────────────────────────
CREATE POLICY select_materias ON public.materias
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_materias ON public.materias
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- ── 24.5 TABLA: periodos_academicos ───────────────────────────────────
CREATE POLICY select_periodos ON public.periodos_academicos
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_periodos ON public.periodos_academicos
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- ── 24.6 TABLA: escala_valoracion ─────────────────────────────────────
CREATE POLICY select_escalas ON public.escala_valoracion
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_escalas ON public.escala_valoracion
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- ── 24.7 TABLA: evidencias ────────────────────────────────────────────
CREATE POLICY select_evidencias ON public.evidencias
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_evidencias ON public.evidencias
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- ── 24.8 TABLA: evidencias_logros ─────────────────────────────────────
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

-- ── 24.9 TABLA: estudiantes_matriculados ──────────────────────────────
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

-- ── 24.10 TABLA: asignaciones_academicas ───────────────────────────────
CREATE POLICY select_asignaciones ON public.asignaciones_academicas
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY write_asignaciones ON public.asignaciones_academicas
  FOR ALL TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN')
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

-- ── 24.11 TABLA: perfiles_acudientes_estudiantes ───────────────────────
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

-- ── 24.12 TABLA: configuracion_evidencias_periodo ──────────────────────
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

-- ── 24.13 TABLA: calificaciones ────────────────────────────────────────
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

-- ── 24.14 TABLA: asistencias ───────────────────────────────────────────
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

-- ── 24.15 TABLA: observador_digital ───────────────────────────────────
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

-- ── 24.16 TABLA: planes_suscripcion ───────────────────────────────────
CREATE POLICY select_planes ON public.planes_suscripcion
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY super_admin_all_planes ON public.planes_suscripcion
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');

-- ── 24.17 TABLA: logs_ia_tokens ───────────────────────────────────────
CREATE POLICY insert_logs_ia ON public.logs_ia_tokens
  FOR INSERT TO authenticated
  WITH CHECK (id_institucion = (SELECT public.get_id_institucion()));

CREATE POLICY select_logs_ia ON public.logs_ia_tokens
  FOR SELECT TO authenticated
  USING (id_institucion = (SELECT public.get_id_institucion()) AND (SELECT public.get_rol()) = 'ADMIN');

CREATE POLICY super_admin_all_logs ON public.logs_ia_tokens
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');

-- ── 24.18 TABLA: boletines_historicos ─────────────────────────────────
CREATE POLICY select_estudiante_boletin ON public.boletines_historicos
  FOR SELECT TO authenticated
  USING (
    id_matricula IN (
      SELECT id_matricula FROM public.estudiantes_matriculados WHERE id_estudiante = auth.uid()
    )
  );

CREATE POLICY select_acudiente_boletin ON public.boletines_historicos
  FOR SELECT TO authenticated
  USING (
    id_matricula IN (
      SELECT em.id_matricula FROM public.estudiantes_matriculados em
      JOIN public.perfiles_acudientes_estudiantes pae ON em.id_estudiante = pae.id_estudiante
      WHERE pae.id_acudiente = auth.uid()
    )
  );

CREATE POLICY select_admin_boletin ON public.boletines_historicos
  FOR ALL TO authenticated
  USING (id_institucion = public.get_id_institucion())
  WITH CHECK (id_institucion = public.get_id_institucion());

CREATE POLICY super_admin_all_boletines ON public.boletines_historicos
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');

-- ── 24.19 TABLA: transacciones_mercadopago ────────────────────────────
CREATE POLICY admin_select_transacciones ON public.transacciones_mercadopago
  FOR SELECT TO authenticated
  USING (id_institucion = public.get_id_institucion());

CREATE POLICY super_admin_all_transacciones ON public.transacciones_mercadopago
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');


-- =====================================================================
-- 25. CONCESIÓN DE PRIVILEGIOS
-- =====================================================================
GRANT ALL ON TABLE public.planes_suscripcion TO authenticated, anon;
GRANT ALL ON TABLE public.instituciones TO authenticated, anon;
GRANT ALL ON TABLE public.usuarios TO authenticated, anon;
GRANT ALL ON TABLE public.cursos TO authenticated, anon;
GRANT ALL ON TABLE public.materias TO authenticated, anon;
GRANT ALL ON TABLE public.estudiantes_matriculados TO authenticated, anon;
GRANT ALL ON TABLE public.asignaciones_academicas TO authenticated, anon;
GRANT ALL ON TABLE public.periodos_academicos TO authenticated, anon;
GRANT ALL ON TABLE public.escala_valoracion TO authenticated, anon;
GRANT ALL ON TABLE public.evidencias TO authenticated, anon;
GRANT ALL ON TABLE public.configuracion_evidencias_periodo TO authenticated, anon;
GRANT ALL ON TABLE public.calificaciones TO authenticated, anon;
GRANT ALL ON TABLE public.asistencias TO authenticated, anon;
GRANT ALL ON TABLE public.observador_digital TO authenticated, anon;
GRANT ALL ON TABLE public.perfiles_acudientes_estudiantes TO authenticated, anon;
GRANT ALL ON TABLE public.logs_ia_tokens TO authenticated, anon;
GRANT ALL ON TABLE public.boletines_historicos TO authenticated, anon;
GRANT ALL ON TABLE public.transacciones_mercadopago TO authenticated, anon;
GRANT ALL ON TABLE public.evidencias_logros TO authenticated, anon;
