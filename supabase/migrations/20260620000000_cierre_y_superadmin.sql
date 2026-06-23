-- =====================================================================
-- MIGRACIÓN: CIERRE DE PERÍODO Y SOPORTE SÚPER ADMINISTRADOR SAAS
-- =====================================================================

-- 1. Añadir valor 'SUPER_ADMIN' al enum tipo_rol_usuario
ALTER TYPE public.tipo_rol_usuario ADD VALUE 'SUPER_ADMIN';

-- 2. Crear tabla de Boletines Históricos
CREATE TABLE IF NOT EXISTS public.boletines_historicos (
  id_boletin UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_matricula UUID NOT NULL REFERENCES public.estudiantes_matriculados(id_matricula) ON DELETE CASCADE,
  id_periodo UUID NOT NULL REFERENCES public.periodos_academicos(id_periodo) ON DELETE CASCADE,
  id_institucion UUID NOT NULL REFERENCES public.instituciones(id_institucion) ON DELETE CASCADE,
  promedio_general NUMERIC(3,2) NOT NULL,
  datos_materias JSONB NOT NULL, -- Contiene arreglo de {materia: string, promedio: number, nivel: string, fallas: number, comentarios: string[]}
  fecha_cierre TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_boletin_matricula_periodo UNIQUE (id_matricula, id_periodo)
);

-- Habilitar RLS
ALTER TABLE public.boletines_historicos ENABLE ROW LEVEL SECURITY;

-- 3. Modificar la función trigger de inmutabilidad de usuarios para permitir bypass de SUPER_ADMIN
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

-- 4. Políticas RLS para Boletines Históricos
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

-- 5. Nuevas políticas de bypass global para SUPER_ADMIN en tablas existentes
CREATE POLICY super_admin_all_instituciones ON public.instituciones
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');

CREATE POLICY super_admin_all_usuarios ON public.usuarios
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');

CREATE POLICY super_admin_all_planes ON public.planes_suscripcion
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');

CREATE POLICY super_admin_all_logs ON public.logs_ia_tokens
  FOR ALL TO authenticated
  USING (public.get_rol() = 'SUPER_ADMIN')
  WITH CHECK (public.get_rol() = 'SUPER_ADMIN');

-- 6. Concesión de privilegios
GRANT ALL ON TABLE public.boletines_historicos TO authenticated, anon;
