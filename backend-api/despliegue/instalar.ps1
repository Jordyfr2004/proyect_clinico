<#
  Laptop 3 (Windows): prepara el backend Laravel para ejecutarse como 2 instancias.
  Requisitos: PHP 8.2+ y Composer en el PATH, backend-api\.env completado.
  Uso (PowerShell como administrador, desde backend-api\despliegue):  .\instalar.ps1
#>
. "$PSScriptRoot\..\..\infraestructura\comun.ps1"
Assert-Administrador
$red = Import-Red
$backend = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $backend

# 1. PHP y extensiones que usa el sistema.
if (-not (Get-Command php -ErrorAction SilentlyContinue)) { throw 'No se encontró php en el PATH.' }
$modulos = (& php -m) | ForEach-Object { $_.Trim().ToLower() }
$requeridas = 'pdo_pgsql', 'pgsql', 'ftp', 'mbstring', 'openssl', 'fileinfo', 'curl', 'zip'
$faltan = $requeridas | Where-Object { $modulos -notcontains $_ }
if ($faltan) {
    throw "Activa en php.ini (quita el ';' de 'extension=...'): $($faltan -join ', '). php.ini: $((& php --ini | Select-String 'Loaded Configuration').ToString())"
}
Write-Host "PHP $(& php -r 'echo PHP_VERSION;') con todas las extensiones necesarias."

# 2. Configuración: debe apuntar a la base de datos y al FTP de red.env.
if (-not (Test-Path .env)) { throw 'Falta backend-api\.env: copia .env.example y completa DB_PASSWORD, FTP_PASSWORD y DOCTORA_PASSWORD.' }
$envTexto = Get-Content .env -Raw
$esperado = @{ DB_HOST = $red.BD_IP; DB_PORT = $red.BD_PORT; FTP_HOST = $red.ARCHIVOS_IP; FTP_PORT = $red.FTP_PORT; TRUSTED_PROXIES = $red.BALANCEADOR_IP }
foreach ($clave in $esperado.Keys) {
    if ($envTexto -notmatch "(?m)^$clave=$([regex]::Escape($esperado[$clave]))\s*$") {
        Write-Warning "En .env $clave debería ser $($esperado[$clave]) según red.env."
    }
}

# 3. Dependencias, clave de la aplicación, esquema y cuenta inicial.
& composer install --no-dev --optimize-autoloader --no-interaction
if ($LASTEXITCODE) { throw 'composer install falló.' }
if ($envTexto -notmatch '(?m)^APP_KEY=base64') { & php artisan key:generate --force }
& php artisan config:clear
& php artisan migrate --force
if ($LASTEXITCODE) { throw 'Las migraciones fallaron: revisa la conexión con la base de datos (php artisan db:show).' }
if ($envTexto -match '(?m)^DOCTORA_PASSWORD=.{8,}') { & php artisan db:seed --force }

# 4. Las instancias solo aceptan conexiones del balanceador.
Add-ReglaFirewall 'Clinica backend1' $red.BACKEND1_PORT @($red.BALANCEADOR_IP)
Add-ReglaFirewall 'Clinica backend2' $red.BACKEND2_PORT @($red.BALANCEADOR_IP)

Write-Host "`nBackend listo. Inicia las instancias con: .\iniciar.ps1" -ForegroundColor Green
