# Publicar la web en Vercel (opcional)

La web **oficial** del proyecto es la de la Laptop 2 (lo exigen las bases). Esta es una copia extra en internet, para probar el sistema desde cualquier navegador sin Tailscale.

```
 Cualquier navegador ──https──> Vercel (solo la web, archivos estáticos)
        │
        └──https──> https://4ndr3s-principal.<tu-red>.ts.net/api   (Tailscale Funnel)
                         │
                         ▼
               Laptop 1 · NGINX 127.0.0.1:8090 (solo /api/)
                         │
                         ▼
               backend1 / backend2 → PostgreSQL y FTP (siguen privados)
```

Lo que queda expuesto a internet:
- **Solo el API**, por HTTPS.
- La web oficial, `/nginx_status`, la base de datos y el FTP siguen solo en Tailscale.

---

## 1. Andrés · Publicar el API con Tailscale Funnel

1. En https://login.tailscale.com/admin/dns activa **HTTPS Certificates**.
2. Instala el balanceador con el acceso público:
   ```bash
   sudo balanceador/instalar.sh --publico
   ```
   Agrega a NGINX un servidor en `127.0.0.1:8090` que solo atiende `/api/`.
3. Publícalo en internet:
   ```bash
   sudo tailscale funnel --bg 8090
   ```
   La primera vez, Tailscale muestra un enlace para **habilitar Funnel** en la red: ábrelo y acéptalo. Luego muestra la dirección pública, por ejemplo:
   ```
   https://4ndr3s-principal.tail1234.ts.net/
   ```
4. Comprueba desde el celular **con datos móviles y sin Tailscale**: `https://4ndr3s-principal.tail1234.ts.net/api/health`

Para ver el estado: `tailscale funnel status`. **Para apagarlo** cuando no se use: `sudo tailscale funnel reset`.

## 2. Jordy · Permitir la web de Vercel en el backend

En `backend-api\.env`:
```
CORS_ALLOWED_ORIGINS=https://<proyecto>.vercel.app
# Opcional, para las vistas previas de cada PR:
CORS_ALLOWED_ORIGINS_PATTERNS=#^https://<proyecto>-[a-z0-9-]+\.vercel\.app$#
```
Reinicia las instancias (`.\detener.ps1` y `.\iniciar.ps1`). Sin esto, el navegador bloquea las llamadas desde Vercel (error de CORS).

## 3. Quien administra el proyecto en Vercel

En el proyecto de Vercel conectado al repositorio:

| Ajuste | Valor |
|---|---|
| Settings → General → **Root Directory** | `frontend-web` |
| Framework Preset | Vite (el resto lo toma de `vercel.json`) |
| Settings → Environment Variables → `VITE_API_BASE_URL` | `https://4ndr3s-principal.tail1234.ts.net/api` (Production y Preview) |

Después: **Deployments → Redeploy**. Vite incrusta `VITE_API_BASE_URL` al compilar, así que cualquier cambio de esa variable exige volver a desplegar.

`vercel.json` ya incluye lo necesario:
- que las rutas de React (`/pacientes/123`) carguen `index.html` en lugar de dar 404;
- caché larga para los archivos con hash;
- cabeceras de seguridad.

Los PR que vienen de un fork muestran *"Authorization required to deploy"*: el dueño del proyecto en Vercel debe autorizar ese despliegue. No bloquea la fusión del PR.

## 4. Probar

Abre `https://<proyecto>.vercel.app`, entra como `doctora` y comprueba:
- que cargan los pacientes;
- que se puede subir una radiografía;
- que en las herramientas del navegador (F12 → Red) las llamadas van a `…ts.net/api` con estado 200.

| Síntoma | Causa |
|---|---|
| "No fue posible comunicarse con el servidor" y en la consola *CORS* | Falta o no coincide `CORS_ALLOWED_ORIGINS` (paso 2) |
| Llamadas a `http://100.102.99.114` o a `undefined` | `VITE_API_BASE_URL` no está definida en Vercel o no se redesplegó (paso 3) |
| 404 en `/api/...` del dominio `.ts.net` | El balanceador no tiene `--publico` o Funnel apunta a otro puerto |
| 503 "El servicio no está disponible" | Funnel funciona, pero las instancias del backend están apagadas |
| Nada responde en `.ts.net` | Funnel apagado (`tailscale funnel status`) o la laptop de Andrés apagada |

## Seguridad

- Mientras Funnel está encendido, **cualquiera en internet puede intentar iniciar sesión**. El sistema limita los intentos (NGINX y Laravel), pero usa una contraseña fuerte para la doctora y **apaga Funnel cuando no estén probando** (`sudo tailscale funnel reset`).
- Usa solo datos de prueba mientras esté publicado.
- La base de datos y el FTP nunca quedan expuestos: solo el backend puede llegar a ellos.
