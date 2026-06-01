# Reporte de Auditoría Técnica: Infraestructura de Carga Masiva B2B

Este reporte analiza el estado actual de la infraestructura del proyecto para dar soporte a la unificación de la Server Action de importación masiva.

---

## 1. Clientes de Supabase y Control de Sesión

### Cliente del Lado del Servidor (Supabase SSR)
* **Estado:** **Construido y funcional.**
* **Ubicación:** [server.ts](file:///c:/dev/sophos-core/src/utils/supabase/server.ts)
* **Mapeo del Inquilino (`id_institucion`):** La función asíncrona [createClient](file:///c:/dev/sophos-core/src/utils/supabase/server.ts#L42) inicializa `createServerClient` manejando de forma transaccional las cookies de sesión (compatible con Next.js 15+). 
* **Extracción de la sesión:** En [admin-actions.ts](file:///c:/dev/sophos-core/src/app/actions/admin-actions.ts#L18-L37), se valida de forma segura la sesión a través de:
  ```typescript
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  ```
  Esto permite obtener tanto el rol del administrador (`user.app_metadata.rol`) como la frontera lógica de su tenant (`user.app_metadata.id_institucion`) de manera criptográfica directamente desde el JWT decodificado en el servidor.

### Cliente de Administración (`service_role`)
* **Estado:** **Construido y funcional.**
* **Ubicación:** [admin.ts](file:///c:/dev/sophos-core/src/utils/supabase/admin.ts)
* **Creación de Credenciales:** La función [createAdminClient](file:///c:/dev/sophos-core/src/utils/supabase/admin.ts#L22) inicializa un cliente con la llave `SUPABASE_SERVICE_ROLE_KEY` del entorno de servidor, configurando `persistSession: false` y `autoRefreshToken: false`.
* Este cliente de administración tiene los privilegios necesarios para evadir las políticas RLS y ya es invocado en la capa de servicios mediante `adminClient.auth.admin.createUser` (verificado en [adminService.ts](file:///c:/dev/sophos-core/src/services/adminService.ts#L103)) para crear usuarios en Auth, asignándoles `id_institucion`, `rol` y la bandera `must_change_password: true`.

---

## 2. Tipado Relacional y Mapeo TypeScript

* **Estado:** **Totalmente cubierto por esquemas auto-generados.**
* **Ubicación:** [supabase.ts](file:///c:/dev/sophos-core/src/types/supabase.ts)
* **Interfaces Disponibles:** En lugar de interfaces manuales duplicadas, se utiliza el tipo estricto global `Database` importado desde `@/types/supabase` para interactuar con los esquemas de base de datos.
* Todas las tablas críticas requeridas para el flujo unificado están mapeadas con sus tipos `Row`, `Insert` y `Update`:
  * `usuarios`: Representado en [supabase.ts:L482-516](file:///c:/dev/sophos-core/src/types/supabase.ts#L482-516)
  * `cursos`: Representado en [supabase.ts:L183-211](file:///c:/dev/sophos-core/src/types/supabase.ts#L183-211)
  * `materias`: Representado en [supabase.ts:L331-359](file:///c:/dev/sophos-core/src/types/supabase.ts#L331-359)
  * `estudiantes_matriculados`: Representado en [supabase.ts:L212-257](file:///c:/dev/sophos-core/src/types/supabase.ts#L212-257)
  * `asignaciones_academicas`: Representado en [supabase.ts:L17-72](file:///c:/dev/sophos-core/src/types/supabase.ts#L17-72)
  * `perfiles_acudientes_estudiantes`: Representado en [supabase.ts:L415-460](file:///c:/dev/sophos-core/src/types/supabase.ts#L415-460)

---

## 3. Utilidades de Parseo y Lógica Existente

### Flujo de Subida del Archivo
1. **Frontend:** El componente de cliente [BulkImportModal.tsx](file:///c:/dev/sophos-core/src/components/dashboard/BulkImportModal.tsx) contiene la zona de arrastre de archivos (*Drag & Drop*) y captura los ficheros `.csv` o `.txt`, encapsulándolos en un objeto `FormData`.
2. **Server Action:** El endpoint de entrada [bulkImportUsers](file:///c:/dev/sophos-core/src/app/actions/admin-actions.ts#L18) recibe el `FormData`, extrae el texto plano del archivo CSV y separa las líneas a través de `text.split(/\r?\n/)`. Finalmente, delega la ejecución al servicio.

### Algoritmo de Parseo y Deduplicación en Memoria
* **Mapeador de Índices:** El método [processBulkImport](file:///c:/dev/sophos-core/src/services/adminService.ts#L14) lee dinámicamente el encabezado del archivo para extraer la posición de las columnas (`nombre_completo`, `email`, `rol`, `curso`).
* **Expresión Regular CSV:** Utiliza un split tolerante a comillas internas para no romper el procesamiento si los nombres contienen comas:
  ```typescript
  line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
  ```
* **Deduplicación en Lote:** Mantiene un registro temporal utilizando `new Map<string, ...>()` con la clave del `email` para evitar procesar filas duplicadas presentes en el mismo archivo CSV.
* **Control de Existencia en DB:** Valida la existencia del usuario contra la tabla pública mediante `.from('usuarios').select('id_usuario').eq('email', email).maybeSingle()` antes de proceder a la creación del usuario en Auth.

### Lógica de Estructuración Académica de Docentes
* **División por Lote de Carga:** Si la columna `curso` para un docente contiene múltiples materias y cursos (ej. `Matematicas-10-A; Ciencias-11-B`), el script divide la cadena utilizando punto y coma:
  ```typescript
  cursoNombre.split(';').map((x) => x.trim()).filter(Boolean)
  ```
* **Regex de Sintaxis Materia-Curso:** Para cada registro del docente, aplica la siguiente expresión regular:
  ```typescript
  /^(.*?)-(\d{1,2}-[A-Za-z])$/
  ```
  Esto separa limpiamente la materia (ej. `Matematicas`) del curso (ej. `10-A`). Si no encaja con la regex, cae en un fallback básico dividiendo por el último guion.
* **Inserción Transaccional Conceptual:** Se busca la materia y el curso; si no existen dentro de la institución (`id_institucion`), los crea de forma dinámica antes de asociar el registro en la tabla `asignaciones_academicas`.

---

## 4. Brechas Detectadas (Deuda Técnica) para la Importación B2B Completa

* **Omisión de Acudientes:** A pesar de que `ACUDIENTE` figura como rol válido en la constante `VALID_BULK_ROLES`, el servicio actual **no implementa ninguna lógica** para manejar perfiles de acudientes ni para asociarlos con estudiantes mediante `perfiles_acudientes_estudiantes`.
* **Falta de Columnas para Parentescos:** El CSV actual solo contempla `nombre_completo,email,rol,curso`. Para un acudiente, se requerirá añadir columnas adicionales que identifiquen al estudiante asociado (ej. `email_estudiante_relacionado`) y el tipo de relación (ej. `parentesco`).
* **Inexistencia de Transaccionalidad:** Si falla la inserción en tablas relacionales públicas (como `estudiantes_matriculados` o `asignaciones_academicas`), el usuario de Auth ya ha sido creado, dejando el sistema en un estado inconsistente (huérfano).
