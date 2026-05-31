# Sophos Core - Database Schema Documentation

Generated dynamically from the live database schema on 31/5/2026, 16:00:20.

## Table: `asignaciones_academicas`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_asignacion` | `string` | Yes | Format: `uuid`. Note:
This is a Primary Key.<pk/> |
| `id_institucion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `instituciones.id_institucion`.<fk table='instituciones' column='id_institucion'/> |
| `id_docente` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `usuarios.id_usuario`.<fk table='usuarios' column='id_usuario'/> |
| `id_materia` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `materias.id_materia`.<fk table='materias' column='id_materia'/> |
| `id_curso` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `cursos.id_curso`.<fk table='cursos' column='id_curso'/> |
| `ano_lectivo` | `integer` | Yes | Format: `integer`.  |

## Table: `asistencias`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_asistencia` | `string` | Yes | Format: `uuid`. Note:
This is a Primary Key.<pk/> |
| `id_institucion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `instituciones.id_institucion`.<fk table='instituciones' column='id_institucion'/> |
| `id_matricula` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `estudiantes_matriculados.id_matricula`.<fk table='estudiantes_matriculados' column='id_matricula'/> |
| `id_asignacion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `asignaciones_academicas.id_asignacion`.<fk table='asignaciones_academicas' column='id_asignacion'/> |
| `fecha` | `string` | Yes | Format: `date`.  |
| `estado` | `string` | Yes | Format: `public.tipo_estado_asistencia`.  |
| `observacion` | `string` | No | Format: `character varying`.  |

## Table: `calificaciones`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_calificacion` | `string` | Yes | Format: `uuid`. Note:
This is a Primary Key.<pk/> |
| `id_institucion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `instituciones.id_institucion`.<fk table='instituciones' column='id_institucion'/> |
| `id_matricula` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `estudiantes_matriculados.id_matricula`.<fk table='estudiantes_matriculados' column='id_matricula'/> |
| `id_asignacion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `asignaciones_academicas.id_asignacion`.<fk table='asignaciones_academicas' column='id_asignacion'/> |
| `nota` | `number` | Yes | Format: `numeric`.  |
| `comentario_docente` | `string` | No | Format: `text`.  |
| `comentario_ia` | `string` | No | Format: `text`.  |
| `periodo` | `integer` | Yes | Format: `integer`.  |
| `fecha_registro` | `string` | No | Format: `timestamp with time zone`.  |

## Table: `cursos`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_curso` | `string` | Yes | Format: `uuid`. Note:
This is a Primary Key.<pk/> |
| `id_institucion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `instituciones.id_institucion`.<fk table='instituciones' column='id_institucion'/> |
| `nombre` | `string` | Yes | Format: `character varying`.  |
| `jornada` | `string` | Yes | Format: `character varying`.  |

## Table: `estudiantes_matriculados`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_matricula` | `string` | Yes | Format: `uuid`. Note:
This is a Primary Key.<pk/> |
| `id_institucion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `instituciones.id_institucion`.<fk table='instituciones' column='id_institucion'/> |
| `id_estudiante` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `usuarios.id_usuario`.<fk table='usuarios' column='id_usuario'/> |
| `id_curso` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `cursos.id_curso`.<fk table='cursos' column='id_curso'/> |
| `ano_lectivo` | `integer` | Yes | Format: `integer`.  |

## Table: `instituciones`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_institucion` | `string` | Yes | Format: `uuid`. Note:
This is a Primary Key.<pk/> |
| `id_suscripcion` | `integer` | No | Format: `integer`. Note:
This is a Foreign Key to `planes_suscripcion.id_suscripcion`.<fk table='planes_suscripcion' column='id_suscripcion'/> |
| `nombre_legal` | `string` | Yes | Format: `character varying`.  |
| `nit` | `string` | Yes | Format: `character varying`.  |
| `dominio_personalizado` | `string` | No | Format: `character varying`.  |
| `fecha_registro` | `string` | No | Format: `timestamp with time zone`.  |
| `estado_suscripcion` | `string` | Yes | Format: `public.tipo_estado_suscripcion`.  |

## Table: `logs_ia_tokens`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_ia_token` | `string` | Yes | Format: `uuid`. Note:
This is a Primary Key.<pk/> |
| `id_institucion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `instituciones.id_institucion`.<fk table='instituciones' column='id_institucion'/> |
| `servicio_ia` | `string` | Yes | Format: `character varying`.  |
| `tokens_usados` | `integer` | Yes | Format: `integer`.  |
| `costo_estimado` | `number` | Yes | Format: `numeric`.  |
| `fecha_peticion` | `string` | No | Format: `timestamp with time zone`.  |

## Table: `materias`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_materia` | `string` | Yes | Format: `uuid`. Note:
This is a Primary Key.<pk/> |
| `id_institucion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `instituciones.id_institucion`.<fk table='instituciones' column='id_institucion'/> |
| `nombre` | `string` | Yes | Format: `character varying`.  |
| `area` | `string` | Yes | Format: `character varying`.  |

## Table: `observador_digital`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_observador` | `string` | Yes | Format: `uuid`. Note:
This is a Primary Key.<pk/> |
| `id_institucion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `instituciones.id_institucion`.<fk table='instituciones' column='id_institucion'/> |
| `id_estudiante` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `usuarios.id_usuario`.<fk table='usuarios' column='id_usuario'/> |
| `id_docente` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `usuarios.id_usuario`.<fk table='usuarios' column='id_usuario'/> |
| `tipo_nota` | `string` | Yes | Format: `public.tipo_nota_observador`.  |
| `observacion_informal` | `string` | Yes | Format: `text`.  |
| `observacion_formal_ia` | `string` | No | Format: `text`.  |
| `fecha_registro` | `string` | No | Format: `timestamp with time zone`.  |

## Table: `perfiles_acudientes_estudiantes`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_acudiente_estudiante` | `string` | Yes | Format: `uuid`. Note:
This is a Primary Key.<pk/> |
| `id_institucion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `instituciones.id_institucion`.<fk table='instituciones' column='id_institucion'/> |
| `id_acudiente` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `usuarios.id_usuario`.<fk table='usuarios' column='id_usuario'/> |
| `id_estudiante` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `usuarios.id_usuario`.<fk table='usuarios' column='id_usuario'/> |
| `parentesco` | `string` | Yes | Format: `character varying`.  |

## Table: `planes_suscripcion`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_suscripcion` | `integer` | Yes | Format: `integer`. Note:
This is a Primary Key.<pk/> |
| `nombre` | `string` | Yes | Format: `character varying`.  |
| `limite_usuarios` | `integer` | Yes | Format: `integer`.  |
| `precio` | `number` | Yes | Format: `numeric`.  |

## Table: `usuarios`

| Column | Type | Required | Format / Details |
| --- | --- | --- | --- |
| `id_usuario` | `string` | Yes | Format: `uuid`. Note:
This is a Primary Key.<pk/> |
| `id_institucion` | `string` | Yes | Format: `uuid`. Note:
This is a Foreign Key to `instituciones.id_institucion`.<fk table='instituciones' column='id_institucion'/> |
| `nombre_completo` | `string` | Yes | Format: `character varying`.  |
| `email` | `string` | Yes | Format: `character varying`.  |
| `rol` | `string` | Yes | Format: `public.tipo_rol_usuario`.  |
| `fecha_registro` | `string` | No | Format: `timestamp with time zone`.  |

