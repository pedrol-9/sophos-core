# Sophos Core

**Sophos Core** es una Plataforma SaaS de gestión académica multi-institución potenciada con Inteligencia Artificial. Permite a las instituciones educativas gestionar calificaciones, asistencia, observaciones disciplinarias/pedagógicas y generación de boletines en un solo lugar.

## 🚀 Características Principales

- **Arquitectura Multi-Institución (SaaS):** Soporta múltiples colegios o instituciones bajo una misma plataforma.
- **Sistema Basado en Roles:** Accesos y paneles dedicados para:
  - **Super Admin:** Gestión global de instituciones y suscripciones.
  - **Admin:** Configuración de la institución, gestión de estudiantes/docentes/cursos, y generación de boletines.
  - **Docente:** Libreta de calificaciones, control de asistencia, y Observador Digital (faltas y logros).
  - **Estudiante y Acudiente:** Visualización de notas, asistencia, observaciones y descarga de boletines oficiales.
- **Asistencia con Inteligencia Artificial:** Herramientas IA integradas para ayudar a los docentes a redactar feedback y comentarios automáticos basados en el rendimiento de los estudiantes.

## 🛠️ Stack Tecnológico

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Base de Datos & Autenticación:** [Supabase](https://supabase.com)
- **Estilos:** Tailwind CSS v4 (con esquema de diseño UI 60-30-10 para modo claro y oscuro)
- **Lenguaje:** TypeScript

## 📦 Estructura del Proyecto

El proyecto sigue una arquitectura modular en la carpeta `src/app`:
- `/` - Landing Page pública.
- `/login`, `/signup`, `/change-password` - Flujos de autenticación.
- `/dashboard/` - Directorio base para los paneles privados enrutados dinámicamente según el rol del usuario (`/super-admin`, `/admin`, `/docente`, `/estudiante`, `/acudiente`).

## 💻 Entorno de Desarrollo Local

Primero, instala las dependencias:

```bash
npm install
```

Luego, corre el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) (o el puerto configurado) en tu navegador para ver la aplicación.

## ⚙️ Variables de Entorno

Asegúrate de configurar tus variables de entorno para la conexión con Supabase en el archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

## 🚀 Despliegue (Deploy)

La manera más fácil de desplegar esta aplicación es a través de la [Plataforma de Vercel](https://vercel.com/new). Adicionalmente, el proyecto cuenta con un Cron Job de "Keep-Alive" (`/api/cron/keep-alive`) configurado en `vercel.json` para mantener despierta la base de datos en instancias gratuitas de Supabase.
