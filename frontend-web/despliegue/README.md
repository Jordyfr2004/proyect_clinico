# Laptop 2 · Frontend web

Responsable: **jerenyvera09** (Windows), IP Tailscale `100.70.229.10`.

Compila la aplicación React y la publica con NGINX para Windows en el puerto 8080. Solo el balanceador puede acceder a ese puerto. Los usuarios entran por `http://100.102.99.114/`.

## Requisitos
- Node.js 20 o superior.
- NGINX para Windows (https://nginx.org/en/download.html), descomprimido en `C:\nginx`.

## Instalación

```powershell
Copy-Item infraestructura\red.tailscale.env.example infraestructura\red.env
cd frontend-web\despliegue
Set-ExecutionPolicy -Scope Process Bypass
.\instalar.ps1                       # como administrador (o .\instalar.ps1 -Nginx D:\nginx)
```

El instalador hace lo siguiente:
- Compila la web apuntando al API del balanceador (`http://100.102.99.114/api`).
- La copia a `C:\nginx\html\clinica`.
- Genera `C:\nginx\conf\nginx.conf` (guarda el original como `nginx.conf.original`).
- Valida la configuración e inicia o recarga NGINX.
- Abre el puerto 8080 solo para el balanceador.

Después de cada `git pull` con cambios en la web, vuelve a ejecutar `.\instalar.ps1`.

## Operación

```powershell
C:\nginx\nginx.exe -p C:\nginx\ -s stop      # detener
C:\nginx\nginx.exe -p C:\nginx\              # iniciar
Get-Content C:\nginx\logs\clinica_web_access.log -Wait
```

En Linux está `instalar.sh`, que hace lo mismo.

Publicar además una copia de la web en Vercel (opcional): [`../VERCEL.md`](../VERCEL.md).
