# Pendientes y Deuda Técnica (Sophos Core)

Este documento es un registro de tareas, optimizaciones y configuraciones de seguridad que deben revisarse antes de un pase a producción (Deploy).

## 🚀 Pre-Producción / Deploy

- [ ] **Políticas RLS en Supabase:** Revisar y asegurar las políticas de *Row Level Security* en todas las tablas. Durante el desarrollo usamos el `service_role_key` para bypasear RLS en operaciones de creación de *tenants*, pero debemos asegurar que las políticas públicas (anon) y autenticadas (authenticated) estén estrictamente limitadas al `id_institucion` del JWT para evitar fugas de datos entre colegios.
- [ ] **Desactivar el Service Role en el Cliente:** Asegurar que la `SUPABASE_SERVICE_ROLE_KEY` **NUNCA** sea expuesta en el prefijo `NEXT_PUBLIC_`, ya que daría control total sobre la base de datos a cualquier usuario del navegador.

## 🛠️ Mejoras Futuras

- [x] **Dashboard Admin:** Implementar el frontend (componente visual) para la carga masiva de usuarios CSV, conectándolo con la Server Action `bulkImportUsers`.
- [ ] **Gestión de Suscripciones:** Crear una tabla de planes para reemplazar el estado estático `'PRUEBA'` en `auth-actions.ts`, definiendo límites (ej. max alumnos, días de prueba).
- [ ] **Super Admin:** Crear un rol o vista especial (`SUPER_ADMIN`) para los administradores del SaaS (Sophos) para gestionar y ver el estado de todos los colegios sin estar limitados por el `id_institucion`.
