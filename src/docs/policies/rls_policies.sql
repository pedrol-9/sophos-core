-- =====================================================================
-- SCRIPT DE HABILITACIÓN DE ROW LEVEL SECURITY (RLS) - SOPHOS CORE
-- =====================================================================
-- Este script habilita RLS y define políticas de aislamiento multi-tenant
-- para todas las tablas públicas basadas en la institución del usuario.
--
-- Ejecuta este script en el SQL Editor de tu panel de Supabase:
-- https://supabase.com/dashboard/project/gxtuarqsfqrdvksmuioe/sql/new
-- =====================================================================

-- 1. HABILITAR RLS EN TODAS LAS TABLES
ALTER TABLE instituciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudiantes_matriculados ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones_academicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles_acudientes_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE observador_digital ENABLE ROW LEVEL SECURITY;

-- 2. CREAR POLÍTICAS DE AISLAMIENTO POR INSTITUCIÓN (TENANT ISOLATION)
-- Valida que el id_institucion de la fila coincida con el del JWT del usuario.

-- Tabla: instituciones
CREATE POLICY tenant_isolation_instituciones ON instituciones
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

-- Tabla: usuarios
CREATE POLICY tenant_isolation_usuarios ON usuarios
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

-- Tabla: cursos
CREATE POLICY tenant_isolation_cursos ON cursos
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

-- Tabla: materias
CREATE POLICY tenant_isolation_materias ON materias
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

-- Tabla: estudiantes_matriculados
CREATE POLICY tenant_isolation_estudiantes_matriculados ON estudiantes_matriculados
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

-- Tabla: asignaciones_academicas
CREATE POLICY tenant_isolation_asignaciones_academicas ON asignaciones_academicas
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

-- Tabla: perfiles_acudientes_estudiantes
CREATE POLICY tenant_isolation_perfiles_acudientes_estudiantes ON perfiles_acudientes_estudiantes
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

-- Tabla: calificaciones
CREATE POLICY tenant_isolation_calificaciones ON calificaciones
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

-- Tabla: asistencias
CREATE POLICY tenant_isolation_asistencias ON asistencias
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);

-- Tabla: observador_digital
CREATE POLICY tenant_isolation_observador_digital ON observador_digital
  FOR ALL TO authenticated
  USING (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid)
  WITH CHECK (id_institucion = (auth.jwt() -> 'app_metadata' ->> 'id_institucion')::uuid);
