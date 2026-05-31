-- Sophos Core Database DDL Schema (Auto-generated from Live PostgREST)

CREATE TABLE asignaciones_academicas (
  id_asignacion UUID NOT NULL,
  id_institucion UUID NOT NULL,
  id_docente UUID NOT NULL,
  id_materia UUID NOT NULL,
  id_curso UUID NOT NULL,
  ano_lectivo INTEGER NOT NULL
);

CREATE TABLE asistencias (
  id_asistencia UUID NOT NULL,
  id_institucion UUID NOT NULL,
  id_matricula UUID NOT NULL,
  id_asignacion UUID NOT NULL,
  fecha TEXT NOT NULL,
  estado TEXT NOT NULL,
  observacion TEXT
);

CREATE TABLE calificaciones (
  id_calificacion UUID NOT NULL,
  id_institucion UUID NOT NULL,
  id_matricula UUID NOT NULL,
  id_asignacion UUID NOT NULL,
  nota NUMERIC NOT NULL,
  comentario_docente TEXT,
  comentario_ia TEXT,
  periodo INTEGER NOT NULL,
  fecha_registro TEXT
);

CREATE TABLE cursos (
  id_curso UUID NOT NULL,
  id_institucion UUID NOT NULL,
  nombre TEXT NOT NULL,
  jornada TEXT NOT NULL
);

CREATE TABLE estudiantes_matriculados (
  id_matricula UUID NOT NULL,
  id_institucion UUID NOT NULL,
  id_estudiante UUID NOT NULL,
  id_curso UUID NOT NULL,
  ano_lectivo INTEGER NOT NULL
);

CREATE TABLE instituciones (
  id_institucion UUID NOT NULL,
  id_suscripcion INTEGER,
  nombre_legal TEXT NOT NULL,
  nit TEXT NOT NULL,
  dominio_personalizado TEXT,
  fecha_registro TEXT,
  estado_suscripcion TEXT NOT NULL
);

CREATE TABLE logs_ia_tokens (
  id_ia_token UUID NOT NULL,
  id_institucion UUID NOT NULL,
  servicio_ia TEXT NOT NULL,
  tokens_usados INTEGER NOT NULL,
  costo_estimado NUMERIC NOT NULL,
  fecha_peticion TEXT
);

CREATE TABLE materias (
  id_materia UUID NOT NULL,
  id_institucion UUID NOT NULL,
  nombre TEXT NOT NULL,
  area TEXT NOT NULL
);

CREATE TABLE observador_digital (
  id_observador UUID NOT NULL,
  id_institucion UUID NOT NULL,
  id_estudiante UUID NOT NULL,
  id_docente UUID NOT NULL,
  tipo_nota TEXT NOT NULL,
  observacion_informal TEXT NOT NULL,
  observacion_formal_ia TEXT,
  fecha_registro TEXT
);

CREATE TABLE perfiles_acudientes_estudiantes (
  id_acudiente_estudiante UUID NOT NULL,
  id_institucion UUID NOT NULL,
  id_acudiente UUID NOT NULL,
  id_estudiante UUID NOT NULL,
  parentesco TEXT NOT NULL
);

CREATE TABLE planes_suscripcion (
  id_suscripcion INTEGER NOT NULL,
  nombre TEXT NOT NULL,
  limite_usuarios INTEGER NOT NULL,
  precio NUMERIC NOT NULL
);

CREATE TABLE usuarios (
  id_usuario UUID NOT NULL,
  id_institucion UUID NOT NULL,
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL,
  fecha_registro TEXT
);

