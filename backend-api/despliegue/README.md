# Laptop 3 · Backend (2 instancias)

Responsable: **jordyalex32** (Windows), IP Tailscale `100.92.238.94`.

Son dos procesos PHP independientes con el mismo código:
- `backend1`, en el puerto 8001.
- `backend2`, en el puerto 8002.

El balanceador reparte las peticiones entre ellos. Cada uno tiene su ventana y su log, y se reinicia solo si se cae.

## Requisitos
- **PHP 8.2+** para Windows (https://windows.php.net/download, versión NTS x64), descomprimido y agregado al `PATH`.
- En `php.ini` activa estas extensiones (quita el `;` de `extension=...`): `pdo_pgsql`, `pgsql`, `ftp`, `mbstring`, `openssl`, `fileinfo`, `curl`, `zip`, y define `extension_dir = "C:\php\ext"` con la ruta completa.
- **Composer** (https://getcomposer.org/download/).

## Instalación

```powershell
Copy-Item infraestructura\red.tailscale.env.example infraestructura\red.env
Copy-Item backend-api\.env.example backend-api\.env
notepad backend-api\.env      # completa DB_PASSWORD, FTP_PASSWORD y DOCTORA_PASSWORD
cd backend-api\despliegue
Set-ExecutionPolicy -Scope Process Bypass
.\instalar.ps1                # como administrador
```

El instalador hace lo siguiente:
- Comprueba PHP y sus extensiones.
- Instala las dependencias.
- Genera `APP_KEY`.
- **Ejecuta las migraciones en la base de datos de Luis**.
- Crea la cuenta de la doctora.
- Abre los puertos 8001 y 8002 en el firewall solo para el balanceador.

## Operación

```powershell
.\iniciar.ps1                 # abre las dos instancias, cada una en su ventana
.\detener.ps1 -Numero 2       # prueba de fallo: detiene solo backend2
.\instancia.ps1 -Numero 2     # vuelve a levantar backend2
.\detener.ps1                 # detiene las dos
```

Cada ventana muestra en vivo las peticiones que atiende esa instancia. Los logs están en:
- `storage\logs\laravel-<fecha>.log`: cada línea incluye `instancia` y `request_id`.
- `storage\logs\backendN-servidor.log`.

## Variables principales (`backend-api\.env`)

| Variable | Valor en Tailscale |
|---|---|
| `DB_HOST` / `DB_DATABASE` / `DB_USERNAME` | `100.104.9.95` / `proyect_clinico` / `clinica_app` |
| `FTP_HOST` / `FTP_PORT` | `100.127.65.82` / `2121` |
| `TRUSTED_PROXIES` | `100.102.99.114` (el balanceador; así se registra la IP real del cliente) |
| `DB_CONNECT_TIMEOUT` / `FTP_TIMEOUT` | 3 / 5 segundos |
