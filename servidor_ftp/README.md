# Laptop 5 · Servidor de archivos (FTP)

Responsable: **andriwgamesyt** (Windows), IP Tailscale `100.127.65.82`.

Es un servidor FTP con `pyftpdlib`. El backend guarda aquí las fotos de perfil, las radiografías y los documentos clínicos. Solo acepta conexiones del backend (`100.92.238.94`).

## Instalación (Windows)

1. Instala Python 3.10 o superior (https://www.python.org/downloads/) marcando **Add python.exe to PATH**.
2. Copia la red: `Copy-Item infraestructura\red.tailscale.env.example infraestructura\red.env`
3. En PowerShell **como administrador**, desde la carpeta `servidor_ftp`:
   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\instalar.ps1
   ```
   La primera vez crea `servidor_ftp\.env`. Escribe ahí `FTP_PASSWORD`, que debe ser la misma que `FTP_PASSWORD` en `backend-api\.env`, y vuelve a ejecutar `.\instalar.ps1`.
   - Con `.\instalar.ps1 -Automatico` el servidor arranca solo al encender el equipo (tarea programada "Clinica FTP").

El instalador crea el entorno de Python con las dependencias y abre en el firewall el puerto 2121 y los pasivos 60000-60100, solo para el backend.

## Operación

```powershell
.\iniciar.ps1      # inicia el servidor; si se cae solo, se reinicia
.\detener.ps1      # prueba de fallo: lo detiene (el backend queda "degradado")
Get-Content logs\ftp.log -Wait
```

Los archivos se guardan en `servidor_ftp\archivos\clinica\...`. Para usar otra carpeta, define `FTP_DIR` en `.env`.

## Variables (`.env`)

| Variable | Descripción |
|---|---|
| `FTP_HOST` / `FTP_PORT` | Interfaz y puerto (por defecto `0.0.0.0:2121`) |
| `FTP_USER` / `FTP_PASSWORD` | Deben coincidir con `FTP_USERNAME` / `FTP_PASSWORD` del backend |
| `FTP_ALLOWED_IPS` | IPs o redes autorizadas, separadas por coma (el backend) |
| `FTP_PASSIVE_PORTS` | Rango de puertos pasivos, por defecto `60000-60100` |
| `FTP_MASQUERADE_ADDRESS` | IP que se anuncia en modo pasivo si hay NAT (no hace falta con Tailscale) |
| `FTP_DIR` / `FTP_LOG` | Carpeta de archivos y ruta del log |

Si el servidor de archivos se detiene, el sistema sigue funcionando: `/api/health` responde `"degradado"` y solo subir o ver archivos devuelve 503 con un mensaje claro.

En Linux se usa `clinica-ftp.service` (systemd) en lugar de los scripts `.ps1`.
