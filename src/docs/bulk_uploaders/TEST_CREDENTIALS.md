# Credenciales de Prueba (Demo)

Este archivo contiene los accesos rápidos para probar todos los roles del sistema tras haber cargado el CSV expandido.

**Contraseña para todos:** `Sophos2026!`

| Rol | Email | Notas |
|---|---|---|
| **ADMIN** | `santiago.garcia@gmail.com` | Tiene acceso al panel de carga masiva y métricas globales. |
| **DOCENTE** | `mariana.fuentes@edu.co` | Tiene la mayor cantidad de asignaciones (todas las matemáticas). |
| **DOCENTE** | `jorge.ruiz@edu.co` | Tiene asignaciones de Ciencias Naturales y Biología. |
| **ESTUDIANTE** | `mateo.silva@edu.co` | Estudiante de 10-A. |
| **ESTUDIANTE** | `camila.mendoza@edu.co` | Estudiante de 11-B. |
| **ACUDIENTE** | `rodrigo.silva@parent.co` | Tiene **MÚLTIPLES** estudiantes a cargo (Mateo Silva y Juan Diego Rojas) para probar el selector familiar. |
| **ACUDIENTE** | `beatriz.ortiz@parent.co` | Tiene **MÚLTIPLES** estudiantes a cargo (Valentina Ortiz y Carolina Marín). |

## Pasos de la Prueba

1. Inicia sesión como **ADMIN** y ve a "Cargar Usuarios".
2. Sube el archivo `SOPHOS_DB_UPLOADER_carbonell.csv`.
3. Desde la terminal, ejecuta `node src/docs/bulk_uploaders/seed-full-demo.js`
4. Inicia sesión con los demás roles y verifica que ninguna vista muestre estados vacíos.
