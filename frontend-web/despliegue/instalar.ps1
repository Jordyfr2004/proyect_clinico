<#
  Laptop 2 (Windows): compila el frontend web y lo publica con NGINX para Windows.
  Requisitos: Node.js 20+ y NGINX para Windows descomprimido (por defecto en C:\nginx,
  descarga en https://nginx.org/en/download.html).
  Uso (PowerShell como administrador, desde frontend-web\despliegue):
      .\instalar.ps1
      .\instalar.ps1 -Nginx D:\herramientas\nginx
#>
param([string] $Nginx = 'C:\nginx')

. "$PSScriptRoot\..\..\infraestructura\comun.ps1"
Assert-Administrador
$red = Import-Red
$frontend = (Resolve-Path "$PSScriptRoot\..").Path
$nginxExe = @('nginx.exe', 'nginx') | ForEach-Object { Join-Path $Nginx $_ } | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $nginxExe) { throw "No se encontró NGINX en $Nginx. Descomprime NGINX para Windows ahí o usa -Nginx <carpeta>." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Instala Node.js 20 o superior.' }

# 1. Compilar: el navegador llama al API a través del balanceador (mismo origen que la web).
Push-Location $frontend
try {
    & npm ci --no-audit --no-fund
    if ($LASTEXITCODE) { throw 'npm ci falló.' }
    $env:VITE_API_BASE_URL = "http://$($red.SERVER_NAME)/api"
    Write-Host "Compilando con VITE_API_BASE_URL=$env:VITE_API_BASE_URL"
    & npm run build
    if ($LASTEXITCODE) { throw 'La compilación falló.' }
} finally {
    Remove-Item Env:VITE_API_BASE_URL -ErrorAction SilentlyContinue
    Pop-Location
}

# 2. Publicar en la carpeta de NGINX.
$webRoot = Join-Path $Nginx 'html\clinica'
New-Item -ItemType Directory -Force $webRoot, (Join-Path $Nginx 'temp'), (Join-Path $Nginx 'logs') | Out-Null
Get-ChildItem $webRoot | Remove-Item -Recurse -Force
Copy-Item (Join-Path $frontend 'dist\*') $webRoot -Recurse

$conf = Join-Path $Nginx 'conf\nginx.conf'
if ((Test-Path $conf) -and -not (Test-Path "$conf.original")) { Copy-Item $conf "$conf.original" }
Write-Plantilla (Join-Path $PSScriptRoot 'nginx-windows.conf.template') $conf @{
    WEB_PORT = $red.WEB_PORT
    BALANCEADOR_IP = $red.BALANCEADOR_IP
    # NGINX acepta barras normales también en Windows.
    WEB_ROOT = $webRoot.Replace('\', '/')
}

# 3. Validar y (re)iniciar NGINX.
Push-Location $Nginx
try {
    & $nginxExe -t -q -p "$Nginx/" -c conf/nginx.conf
    if ($LASTEXITCODE) { throw 'La configuración de NGINX no es válida.' }
    # Se usa el PID de este NGINX, no cualquier proceso nginx del equipo.
    $pidArchivo = Join-Path $Nginx 'logs\nginx.pid'
    $pidTexto = "$(Get-Content $pidArchivo -Raw -ErrorAction SilentlyContinue)".Trim()
    $enMarcha = ($pidTexto -match '^\d+$') -and [int]$pidTexto -gt 0 -and
        (Get-Process -Id ([int]$pidTexto) -ErrorAction SilentlyContinue | Where-Object ProcessName -like 'nginx*')
    $argumentos = @('-p', "$Nginx/", '-c', 'conf/nginx.conf')
    if ($enMarcha) {
        & $nginxExe @argumentos -s reload
        Write-Host 'NGINX recargado con la nueva configuración.'
    } elseif ($IsWindows -or $PSVersionTable.PSEdition -ne 'Core') {
        Start-Process $nginxExe -ArgumentList $argumentos -WorkingDirectory $Nginx -WindowStyle Hidden
    } else {
        Start-Process $nginxExe -ArgumentList $argumentos -WorkingDirectory $Nginx
    }
} finally {
    Pop-Location
}

Add-ReglaFirewall 'Clinica web' $red.WEB_PORT @($red.BALANCEADOR_IP)
Write-Host "`nFrontend publicado en el puerto $($red.WEB_PORT). Los usuarios entran por http://$($red.SERVER_NAME)/" -ForegroundColor Green
