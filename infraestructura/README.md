# Guía paso a paso: levantar el sistema desde casa

Esta guía explica cómo cada integrante levanta su servicio desde su casa y cómo se conecta todo por **Tailscale** como un solo sistema. Cada persona sigue la sección [0](#0-antes-de-empezar-todos) y luego **solo la suya**.

```
 Navegador / App móvil
          │  http://100.102.99.114/
          ▼
 ┌──────────────────────────┐
 │ 1 · Balanceador (Andrés) │  NGINX :80
 └──────┬────────────┬──────┘
   /api │            │ /
        ▼            ▼
 ┌───────────────┐ ┌──────────────┐
 │ 3 · Backend   │ │ 2 · Web      │
 │ (Jordy)       │ │ (Jeremy)     │
 │ :8001  :8002  │ │ :8080        │
 └───┬───────┬───┘ └──────────────┘
     ▼       ▼
 ┌────────┐ ┌──────────┐
 │ 4 · BD │ │ 5 · FTP  │
 │ (Luis) │ │ (Andriw) │
 │ :5432  │ │ :2121    │
 └────────┘ └──────────┘
```

| Nodo | Responsable | Equipo Tailscale | IP | Carpeta |
|---|---|---|---|---|
| 1 · Balanceador | Andrés | `4ndr3s-principal` | 100.102.99.114 | `balanceador/` |
| 2 · Web | Jeremy | `frontend` | 100.70.229.10 | `frontend-web/despliegue/` |
| 3 · Backend | Jordy | `backend` | 100.92.238.94 | `backend-api/despliegue/` |
| 4 · Base de datos | Luis | `database` | 100.104.9.95 | `base-datos/` |
| 5 · Archivos FTP | Andriw | `servidor-ftp` | 100.127.65.82 | `servidor_ftp/` |
| App móvil | Jeremy | (celular) | — | `frontend/` |

---

## 0. Antes de empezar (todos)

1. **Tailscale conectado.** Ejecuta `tailscale ip -4`; la IP debe ser la de la tabla. Para que no se desconecte solo: https://login.tailscale.com/admin/machines → tu equipo → `…` → **Disable key expiry**.
2. **Código actualizado:**
   ```bash
   git switch master
   git pull
   ```
3. **Archivo de red.** Es el mismo para todos y no se sube a Git.
   ```powershell
   Copy-Item infraestructura\red.tailscale.env.example infraestructura\red.env   # Windows
   ```
   ```bash
   cp infraestructura/red.tailscale.env.example infraestructura/red.env           # Linux
   ```
4. **Permitir scripts de PowerShell (Windows).** En cada ventana de PowerShell que uses:
   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   ```
   Los instaladores se ejecutan con **PowerShell como administrador** (clic derecho → *Ejecutar como administrador*).

### Contraseñas que hay que acordar

Se pasan **por mensaje privado, nunca por Git ni por el grupo**:

| Contraseña | La crea | La usa | Dónde se escribe |
|---|---|---|---|
| Base de datos (`clinica_app`) | Luis, al instalar | Jordy | `backend-api\.env` → `DB_PASSWORD` |
| Servidor FTP | Andriw | Jordy | `servidor_ftp\.env` y `backend-api\.env` → `FTP_PASSWORD` (iguales) |
| Cuenta de la doctora | Jordy | Todos, para entrar al sistema | `backend-api\.env` → `DOCTORA_PASSWORD` |

### Orden de arranque

**Luis (BD) → Andriw (FTP) → Jordy (backend) → Jeremy (web) → Andrés (balanceador).** Cada servicio necesita que los anteriores estén arriba. La primera vez sigan este orden; los días siguientes cada uno puede levantar lo suyo cuando quiera.

---

## 1. Luis · Base de datos (Laptop 4)

**Necesitas:** PostgreSQL 16 o superior instalado (https://www.postgresql.org/download/windows/).

1. Abre PowerShell como administrador en la carpeta `base-datos` y ejecuta:
   ```powershell
   cd base-datos
   Set-ExecutionPolicy -Scope Process Bypass
   .\instalar.ps1 -AdminIP 100.102.99.114
   ```
   - Te pide la contraseña del superusuario `postgres`.
   - Te pide una **contraseña nueva para `clinica_app`** (mínimo 10 caracteres). Mándasela a Jordy por privado.
   - `-AdminIP` permite a Andrés hacer mantenimiento y actualizar la base. Cuando esté todo listo, vuelve a ejecutar `.\instalar.ps1` sin ese parámetro para quitarle el acceso.
2. Avisa a Andrés: él revisa la base `proyect_clinico` y la pasa a la nueva organización de esquemas. Antes hace un respaldo.

**Qué hace el instalador:**
- Crea el usuario `clinica_app` y lo hace dueño de `proyect_clinico`.
- Hace que PostgreSQL escuche en la red.
- Permite conexiones **solo del backend**, en `pg_hba.conf` y en el firewall.

**Las tablas no las creas tú:** las crea el backend con sus migraciones.

**Uso diario:** el servicio de PostgreSQL arranca solo con Windows. Respaldo: `.\respaldo.ps1`.

---

## 2. Andriw · Servidor de archivos (Laptop 5)

**Necesitas:** Python 3.10 o superior (https://www.python.org/downloads/), marcando **Add python.exe to PATH**.

1. En PowerShell como administrador:
   ```powershell
   cd servidor_ftp
   Set-ExecutionPolicy -Scope Process Bypass
   .\instalar.ps1
   ```
   La primera vez se crea `servidor_ftp\.env` y se detiene.
2. Abre `servidor_ftp\.env` (`notepad .env`) y escribe una contraseña en `FTP_PASSWORD`. Mándasela a Jordy por privado.
3. Ejecuta otra vez `.\instalar.ps1`. Con `.\instalar.ps1 -Automatico` el FTP arranca solo cada vez que enciendes la laptop.
4. Inicia el servidor:
   ```powershell
   .\iniciar.ps1
   ```
   Deja la ventana abierta. Ahí ves las conexiones; también quedan en `logs\ftp.log`.

**Uso diario:** `.\iniciar.ps1` para iniciar y `.\detener.ps1` para detener. Los archivos se guardan en `servidor_ftp\archivos\`.

---

## 3. Jordy · Backend (Laptop 3)

**Necesitas:**
- **PHP 8.2 o superior** para Windows (https://windows.php.net/download, versión *NTS x64*). Descomprímelo en `C:\php` y agrega esa carpeta al `PATH`.
- En `C:\php\php.ini` (copia de `php.ini-production`), quita el `;` de estas líneas: `extension=pdo_pgsql`, `pgsql`, `ftp`, `mbstring`, `openssl`, `fileinfo`, `curl`, `zip`. Pon también `extension_dir = "C:\php\ext"` (ruta completa).
- **Composer** (https://getcomposer.org/download/).

1. Configura el backend:
   ```powershell
   Copy-Item backend-api\.env.example backend-api\.env
   notepad backend-api\.env
   ```
   Completa estas tres variables. Las IPs ya vienen con los valores de Tailscale.
   ```
   DB_PASSWORD=      (la que te pasó Luis)
   FTP_PASSWORD=     (la que te pasó Andriw)
   DOCTORA_PASSWORD= (elige una; con ella entra la doctora)
   ```
2. Instala, en PowerShell como administrador:
   ```powershell
   cd backend-api\despliegue
   Set-ExecutionPolicy -Scope Process Bypass
   .\instalar.ps1
   ```
   El instalador hace esto:
   - Comprueba PHP y sus extensiones.
   - Instala las dependencias.
   - **Crea todas las tablas en la base de Luis**.
   - Crea la cuenta `doctora`.
   - Abre los puertos 8001 y 8002 solo para el balanceador.

   Si falla en las migraciones, revisa que Luis haya ejecutado su instalador y que `DB_PASSWORD` sea la correcta (puedes probarlo con `php artisan db:show`).
3. Inicia las dos instancias:
   ```powershell
   .\iniciar.ps1
   ```
   Se abren **dos ventanas**: "Backend 1 - puerto 8001" y "Backend 2 - puerto 8002". En cada una ves las peticiones que atiende esa instancia.

**Uso diario:** `.\iniciar.ps1`. Para detener: `.\detener.ps1`, o solo una con `.\detener.ps1 -Numero 2`. Si una instancia se cae sola, se reinicia en 3 segundos. Después de cada `git pull` con cambios del backend, vuelve a ejecutar `.\instalar.ps1`, que aplica las migraciones nuevas.

---

## 4. Jeremy · Frontend web (Laptop 2)

**Necesitas:**
- **Node.js 20** o superior.
- **NGINX para Windows** (https://nginx.org/en/download.html, versión *Stable*), descomprimido en `C:\nginx`. La carpeta debe quedar `C:\nginx\nginx.exe`.

1. En PowerShell como administrador:
   ```powershell
   cd frontend-web\despliegue
   Set-ExecutionPolicy -Scope Process Bypass
   .\instalar.ps1
   ```
   El instalador hace esto:
   - Compila la web para que llame al API por el balanceador.
   - La copia a `C:\nginx\html\clinica`.
   - Configura NGINX en el puerto 8080 y lo inicia.
   - Abre el puerto 8080 solo para el balanceador.

**Uso diario:** NGINX queda corriendo en segundo plano. Para detenerlo: `C:\nginx\nginx.exe -p C:\nginx\ -s stop`; para iniciarlo: `C:\nginx\nginx.exe -p C:\nginx\`. **Después de cada `git pull` con cambios de la web, vuelve a ejecutar `.\instalar.ps1`.**

Para desarrollar con recarga en vivo (`npm run dev`), usa en `frontend-web\.env`: `VITE_API_BASE_URL=http://100.102.99.114/api`.

---

## 5. Andrés · Balanceador (Laptop 1, Linux)

```bash
cp infraestructura/red.tailscale.env.example infraestructura/red.env
sudo balanceador/instalar.sh
```

El instalador instala NGINX, genera la configuración desde las plantillas y la recarga. Desde ese momento, `http://100.102.99.114/` es la dirección del sistema para todos.

**Uso diario:**
- NGINX arranca solo con el equipo.
- Logs: `sudo tail -f /var/log/nginx/clinica_access.log`. La columna `upstream=` muestra qué instancia atendió cada petición.

---

## 6. App móvil

1. Instala **Tailscale** en el celular e inicia sesión en la misma red.
2. En `frontend\.env`: `EXPO_PUBLIC_API_URL=http://100.102.99.114/api`.
3. Ejecuta:
   ```bash
   cd frontend
   npm ci
   npx expo start
   ```
   Abre la app con **Expo Go**. Si el celular no está en el mismo Wi-Fi que el computador: `npx expo start --tunnel`.
4. El paciente crea su cuenta con la misma cédula con la que la doctora lo registró en la web. Así su cuenta queda unida a su expediente.

---

## 7. Comprobar que todo funciona

Desde cualquier equipo con Tailscale:

1. **Navegador:** abre `http://100.102.99.114/` y entra con `doctora` y la contraseña de la doctora.
2. **Estado de los servicios:** `http://100.102.99.114/api/health`
   ```json
   {"estado":"ok","instancia":"backend1","servicios":{"base_datos":{"estado":"ok"},"archivos":{"estado":"ok"}}}
   ```
   | Si dice | Significa |
   |---|---|
   | `"estado":"ok"` | Todo bien |
   | `"degradado"`, archivos `"caido"` | El FTP de Andriw no está levantado o no es accesible |
   | `"error"`, base_datos `"caido"` | La base de Luis no responde o `DB_PASSWORD` está mal |
   | "El servicio no está disponible…" | Ninguna instancia del backend de Jordy responde |
   | La página no carga | El balanceador de Andrés no está levantado, o tu Tailscale está desconectado |
3. **Balanceo:** `infraestructura/pruebas/balanceo.sh` en Linux o `infraestructura\pruebas\balanceo.ps1` en Windows. Deben aparecer backend1 y backend2.
4. **Prueba completa de extremo a extremo** (crea un paciente de prueba):
   ```bash
   DOC_PASS='contraseña de la doctora' python3 infraestructura/pruebas/e2e.py
   ```
   ```powershell
   $env:DOC_PASS='contraseña de la doctora'; python infraestructura\pruebas\e2e.py
   ```
   Debe terminar con `RESULTADO: TODO CORRECTO`.

---

## 8. Problemas frecuentes

| Problema | Solución |
|---|---|
| "No se puede cargar el archivo … porque la ejecución de scripts está deshabilitada" | `Set-ExecutionPolicy -Scope Process Bypass` en esa ventana |
| "Abre PowerShell como administrador" | Clic derecho en PowerShell → *Ejecutar como administrador* |
| "No existe …\red.env" | Paso 0.3 |
| "Activa en php.ini: pdo_pgsql…" (Jordy) | Quita el `;` de esas líneas en `php.ini` y revisa que `extension_dir` tenga la ruta completa (`C:\php\ext`) |
| `no hay una línea en pg_hba.conf para …` | Luis debe ejecutar de nuevo `.\instalar.ps1`. Solo se permite la IP del backend (y la de `-AdminIP`) |
| `password authentication failed for user "clinica_app"` | `DB_PASSWORD` en `backend-api\.env` no coincide con la que puso Luis |
| El FTP rechaza al backend ("421 Acceso no autorizado") | En `servidor_ftp\.env`, `FTP_ALLOWED_IPS` debe ser `100.92.238.94` |
| Un equipo aparece "offline" en Tailscale | Ese equipo debe abrir Tailscale e iniciar sesión |
| Cambios del `git pull` que no aparecen | Jordy: `.\instalar.ps1` y reiniciar instancias · Jeremy: `.\instalar.ps1` · Andriw: reiniciar `.\iniciar.ps1` · Andrés: `sudo balanceador/instalar.sh` |

Cada nodo tiene sus logs:

| Nodo | Logs |
|---|---|
| Backend | `backend-api\storage\logs\` (cada línea lleva `instancia` y `request_id`) |
| FTP | `servidor_ftp\logs\ftp.log` |
| Web | `C:\nginx\logs\` |
| Balanceador | `/var/log/nginx/clinica_*.log` |

---

## 9. Pruebas de fallo para la defensa

Guía interactiva: `infraestructura/pruebas/fallos.sh` (la ejecuta Andrés y va indicando a cada uno qué hacer).

| Prueba | Quién | Comando | Qué debe pasar |
|---|---|---|---|
| Cae una instancia | Jordy | `.\detener.ps1 -Numero 2` | Todo sigue funcionando con backend1 |
| Recuperar instancia | Jordy | `.\instancia.ps1 -Numero 2` | En ~15 s vuelve a repartir entre las dos |
| Cae el FTP | Andriw | `.\detener.ps1` | `/api/health` → "degradado"; todo funciona salvo los archivos (503 con mensaje) |
| Cae la base de datos | Luis | `Get-Service postgresql* \| Stop-Service` | 503 "La base de datos no está disponible" en menos de 1 s |
| Puerto mal configurado | Jordy | `DB_PORT=5433` en `.env` y reiniciar instancias | `/api/health` lo señala; el log dice el puerto que falló |

---

## 10. Presentación en el aula (switch)

1. Copia `infraestructura/red.env.example` a `red.env` en las cinco laptops (IPs `192.168.1.x`).
2. Actualiza también estos archivos:
   - `backend-api\.env`: `DB_HOST`, `FTP_HOST` y `TRUSTED_PROXIES`.
   - `servidor_ftp\.env`: `FTP_ALLOWED_IPS`.
   - `frontend\.env`: la IP del balanceador.
3. Vuelve a ejecutar el instalador de cada nodo.

---

## Referencia

| Archivo de esta carpeta | Para qué |
|---|---|
| `red.tailscale.env.example` / `red.env.example` | IPs y puertos de casa (Tailscale) y del aula (switch) |
| `comun.ps1` / `comun.sh` | Funciones de los instaladores de Windows y Linux |
| `pruebas/balanceo.sh`, `pruebas/balanceo.ps1` | Reparto entre backend1 y backend2 |
| `pruebas/fallos.sh` | Guía de pruebas de fallo |
| `pruebas/e2e.py` | Prueba de integración de extremo a extremo |

| Nodo | Puerto | Acepta conexiones solo de |
|---|---|---|
| Balanceador | 80 | Cualquier cliente de la red |
| Web | 8080 | Balanceador |
| Backend | 8001, 8002 | Balanceador |
| PostgreSQL | 5432 | Backend (y `-AdminIP` durante el mantenimiento) |
| FTP | 2121, 60000-60100 | Backend |

**Ante fallos:** NGINX aparta durante 15 s una instancia que no responde. Las peticiones GET que fallan al conectar se reintentan en la otra; POST, PUT y DELETE no se reintentan, para no duplicar citas ni pagos. Si caen las dos instancias, NGINX responde 503 en JSON.

**Sin contenedores:** las bases (sección 2) piden para la Laptop 3 "dos instancias o contenedores". Son dos procesos PHP independientes, cada uno con su puerto, su ventana y su log, y se reinician solos. La sección 4 menciona la contenerización del backend como obligatoria; esta decisión hay que justificarla ante el docente.
