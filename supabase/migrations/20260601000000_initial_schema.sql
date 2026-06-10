-- =====================================================================
-- MIGRACIÓN INICIAL: CONFIGURACIÓN COMPLETA DEL ESQUEMA DE BASE DE DATOS
-- =====================================================================

-- 1. Crear Enums de Dominio
CREATE TYPE public.tipo_rol_usuario AS ENUM ('ADMIN', 'DOCENTE', 'ESTUDIANTE', 'ACUDIENTE');
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

-- 18. Exponer las tablas para la Data API de Supabase REST
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
