# 🚀 Guía Paso a Paso: Despliegue de n8n en Fly.io y Conexión con Sophos Core

Fly.io es ideal para n8n porque ofrece volumen persistente, HTTPS automático (`.fly.dev`) y excelente rendimiento.

---

## 📋 Checklist de Progreso

- [ ] **Paso 1:** Instalar y autenticar `flyctl` (CLI de Fly.io)
- [ ] **Paso 2:** Crear la carpeta de configuración para n8n
- [ ] **Paso 3:** Crear el archivo `fly.toml` optimizado para n8n
- [ ] **Paso 4:** Crear el volumen persistente de almacenamiento (`n8n_data`)
- [ ] **Paso 5:** Desplegar en Fly.io (`fly deploy`)
- [ ] **Paso 6:** Abrir n8n y crear el usuario Administrador
- [ ] **Paso 7:** Publicar el flujo de sincronización (**Active**)
- [ ] **Paso 8:** Configurar `N8N_WEBHOOK_URL` en `.env.local` y Vercel

---

## 🛠️ Paso a Paso Detallado

### Paso 1: Instalar y Autenticar `flyctl`

Si aún no tienes el CLI de Fly.io instalado en tu terminal (PowerShell):

```powershell
# Instalar flyctl en Windows (PowerShell)
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Iniciar sesión
fly auth login
```

---

### Paso 2: Crear el Archivo de Configuración (`fly.toml`)

En una carpeta vacía (por ejemplo `C:\dev\n8n-fly` o una carpeta temporal):

Crea un archivo llamado `fly.toml` con este contenido exacto:

```toml
app = "tu-app-n8n-sophos" # 👈 Cambia esto por un nombre único (ej: sophos-n8n-pedro)
primary_region = "mia"    # Miami (baja latencia hacia Colombia/Latam) o bog

[build]
  image = "docker.n8n.io/n8nio/n8n:latest"

[env]
  N8N_PORT = "5678"
  N8N_PROTOCOL = "https"
  N8N_HOST = "tu-app-n8n-sophos.fly.dev"        # 👈 Mismo nombre que 'app' arriba
  WEBHOOK_URL = "https://tu-app-n8n-sophos.fly.dev/" # 👈 Mismo nombre con https:// y /
  GENERIC_TIMEZONE = "America/Bogota"
  TZ = "America/Bogota"
  N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS = "true"

[http_service]
  internal_port = 5678
  force_https = true
  auto_stop_machines = false   # 👈 Mantener encendido 24/7 para escuchar webhooks
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[mounts]
  source = "n8n_data"
  destination = "/home/node/.n8n"
  initial_size = "2gb"

[[vm]]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 1
```

---

### Paso 3: Crear el Volumen Persistente

En la misma carpeta donde está tu `fly.toml`, ejecuta:

```powershell
# Crear la app en fly (usando el nombre de fly.toml)
fly apps create tu-app-n8n-sophos

# Crear el volumen de 2GB en la misma región (ej: mia o bog)
fly volumes create n8n_data --size 2 --region mia -a tu-app-n8n-sophos
```

---

### Paso 4: Desplegar n8n

Ejecuta:

```powershell
fly deploy
```

Fly.io descargará la imagen oficial de n8n, montará el volumen persistente y le asignará su dominio HTTPS automático.

---

### Paso 5: Abrir n8n y Crear Cuenta Admin

Para abrirlo en tu navegador:

```powershell
fly open
# o entra directamente a https://tu-app-n8n-sophos.fly.dev
```

1. Completa el registro del usuario administrador.
2. Crea / importa el workflow con el nodo Webhook (`POST /sync-sheets`).
3. Activa el toggle **Active / Published** en la esquina superior derecha.

---

### Paso 6: Conectar con Sophos Core

1. En tu archivo `.env.local`:
   ```env
   N8N_WEBHOOK_URL=https://tu-app-n8n-sophos.fly.dev/webhook/sync-sheets
   ```
2. En **Vercel** (Variables de Entorno del proyecto):
   Agrega `N8N_WEBHOOK_URL` con el mismo valor.

---

### 🔍 Comandos Útiles de Fly.io:

* **Ver logs en vivo:** `fly logs`
* **Reiniciar n8n:** `fly apps restart tu-app-n8n-sophos`
* **Ver estado:** `fly status`
