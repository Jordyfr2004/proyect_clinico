<#
  Ejecuta UNA instancia del backend (backend1 o backend2) con el servidor de PHP.
  Si el proceso termina por un error, se reinicia solo a los 3 segundos.
  Uso: .\instancia.ps1 -Numero 1
#>
param([Parameter(Mandatory)][ValidateSet(1, 2)][int] $Numero)

. "$PSScriptRoot\..\..\infraestructura\comun.ps1"
$red = Import-Red
$puerto = $red["BACKEND${Numero}_PORT"]
$backend = (Resolve-Path "$PSScriptRoot\..").Path
$publico = Join-Path $backend 'public'
$router = Join-Path $backend 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'
$control = Join-Path $backend 'storage/framework'
$detener = Join-Path $control "backend$Numero.detener"
$log = Join-Path $backend "storage/logs/backend$Numero-servidor.log"

# Nombre que Laravel devuelve en X-Backend-Instance y escribe en los logs.
$env:BACKEND_INSTANCE = "backend$Numero"
Remove-Item $detener -ErrorAction SilentlyContinue
$Host.UI.RawUI.WindowTitle = "Backend $Numero - puerto $puerto"

while ($true) {
    Write-Host "[$(Get-Date -Format s)] backend$Numero escuchando en 0.0.0.0:$puerto" -ForegroundColor Green
    Push-Location $publico
    # php -S escribe su log en stderr; con 'Stop' (de comun.ps1) Windows PowerShell
    # trata cada línea como NativeCommandError y aborta el script.
    $preferenciaAnterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        # Límites de subida iguales a NGINX (20 MB).
        & php -d upload_max_filesize=20M -d post_max_size=22M -d max_execution_time=60 `
            -S "0.0.0.0:$puerto" $router 2>&1 |
            ForEach-Object { "$_" } |
            Tee-Object -FilePath $log -Append
    } finally {
        $ErrorActionPreference = $preferenciaAnterior
        Pop-Location
    }

    if (Test-Path $detener) {
        Remove-Item $detener
        Write-Host "backend$Numero detenido a pedido." -ForegroundColor Yellow
        break
    }
    Write-Host "backend$Numero terminó inesperadamente; reiniciando en 3 s..." -ForegroundColor Red
    Start-Sleep -Seconds 3
}
