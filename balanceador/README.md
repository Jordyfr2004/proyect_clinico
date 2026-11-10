# Laptop 1 · Balanceador (NGINX)

Es el punto de entrada del sistema:

- `/api/*` se reparte entre backend1 y backend2 (Laptop 3).
- `/` se envía a la web (Laptop 2).

Responsable: **4ndr3s-principal** (Linux), IP Tailscale `100.102.99.114`.

## Instalación

```bash
cp infraestructura/red.tailscale.env.example infraestructura/red.env
sudo balanceador/instalar.sh
```

El instalador hace lo siguiente:
- Instala NGINX.
- Genera `/etc/nginx/sites-available/clinica.conf` y `/etc/nginx/snippets/clinica-backend.conf` a partir de las plantillas y `red.env`.
- Valida la configuración (`nginx -t`) y recarga NGINX.

| Archivo | Contenido |
|---|---|
| `clinica.conf.template` | Upstreams, log con instancia y `req_id`, límite de intentos en `/api/auth/`, 503 JSON si caen las dos instancias |
| `clinica-backend.conf.template` | Proxy hacia el backend: timeouts, reintento solo si no se pudo conectar, cabeceras `X-Forwarded-*` |

## Acceso público para la web en Vercel (opcional)

`sudo balanceador/instalar.sh --publico` y luego `sudo tailscale funnel --bg 8090`. Solo se expone `/api/`. Guía completa: [`frontend-web/VERCEL.md`](../frontend-web/VERCEL.md).

## Operación

```bash
sudo tail -f /var/log/nginx/clinica_access.log    # upstream=... muestra qué instancia atendió
sudo tail -f /var/log/nginx/clinica_error.log     # instancias caídas
curl http://127.0.0.1/nginx_status                 # conexiones activas
infraestructura/pruebas/balanceo.sh                # reparto entre backend1 y backend2
```

Para que Tailscale no se desconecte, desactiva la caducidad del equipo: https://login.tailscale.com/admin/machines → `4ndr3s-principal` → **Disable key expiry**.
