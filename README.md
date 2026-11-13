# Sistema de gestión para consultorio odontológico

Proyecto integrador IS-803 (ULEAM 2026-2). Es un sistema distribuido en cinco laptops que el usuario percibe como un solo sistema. Desde casa las laptops se conectan por **Tailscale**; en el aula, por el switch.

```
 Navegador (web)          App móvil (Expo)
        └──────────┬──────────┘
                   ▼  http://100.102.99.114/
       ┌───────────────────────────┐
       │ Laptop 1 · Balanceador    │ NGINX
       └─────┬───────────────┬─────┘
       /api  │               │  /
             ▼               ▼
 ┌────────────────────┐  ┌────────────────────┐
 │ Laptop 3 · Backend │  │ Laptop 2 · Web     │
 │ backend1 :8001     │  │ NGINX :8080        │
 │ backend2 :8002     │  └────────────────────┘
 └──────┬─────────┬───┘
        ▼         ▼
 ┌────────────┐ ┌────────────────┐
 │ Laptop 4   │ │ Laptop 5       │
 │ PostgreSQL │ │ FTP :2121      │
 └────────────┘ └────────────────┘
```

## Una carpeta por nodo

| Carpeta | Nodo | Responsable | IP Tailscale | Sistema |
|---|---|---|---|---|
| [`balanceador/`](balanceador/README.md) | Laptop 1 · NGINX | 4ndr3s-principal | 100.102.99.114 | Linux |
| [`frontend-web/`](frontend-web/despliegue/README.md) | Laptop 2 · Web | jerenyvera09 | 100.70.229.10 | Windows |
| [`backend-api/`](backend-api/despliegue/README.md) | Laptop 3 · Backend ×2 | jordyalex32 | 100.92.238.94 | Windows |
| [`base-datos/`](base-datos/README.md) | Laptop 4 · PostgreSQL | Luis-M25 | 100.104.9.95 | Windows |
| [`servidor_ftp/`](servidor_ftp/README.md) | Laptop 5 · Archivos | andriwgamesyt | 100.127.65.82 | Windows |
| [`frontend/`](frontend/README.md) | App móvil (cliente) | Jeremy | — | Expo |
| [`infraestructura/`](infraestructura/README.md) | Compartido | todos | — | — |

`infraestructura/` contiene lo que comparten todos los nodos:

- `red.env`: las IPs y puertos de los cinco nodos, un solo archivo para todos.
- Funciones comunes de los instaladores (`comun.ps1` para Windows, `comun.sh` para Linux).
- Pruebas de balanceo y de fallos para la defensa.

## Primeros pasos para cada integrante

**Guía completa paso a paso, persona por persona: [`infraestructura/README.md`](infraestructura/README.md).** Resumen:

1. Actualiza tu copia: `git switch master` y `git pull`.
2. Conecta Tailscale y comprueba tu IP con `tailscale ip -4`; debe coincidir con la tabla.
3. Copia el archivo de red. Debe ser idéntico en las cinco laptops.
   - Windows: `Copy-Item infraestructura\red.tailscale.env.example infraestructura\red.env`
   - Linux: `cp infraestructura/red.tailscale.env.example infraestructura/red.env`
4. Sigue el README de tu carpeta (enlaces en la tabla).
5. El orden de arranque es: base de datos → archivos → backend → web → balanceador.
6. Comprueba que todo responde: `curl http://100.102.99.114/api/health`, o abre esa dirección en el navegador.

En Windows, si PowerShell no deja ejecutar scripts, ejecuta antes: `Set-ExecutionPolicy -Scope Process Bypass`.

## Desarrollo local de cada parte

```bash
cd backend-api  && composer install && php artisan test
cd frontend-web && npm ci && npm test
cd frontend     && npm ci && npm test
```

Para desarrollar la web o el móvil contra el sistema compartido, usa `http://100.102.99.114/api` como URL del API.
