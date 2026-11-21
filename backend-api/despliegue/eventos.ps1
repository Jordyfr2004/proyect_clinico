<#
  Laptop 3: abre los dos procesos de la arquitectura orientada a eventos, cada uno en su ventana.
    - Laravel Reverb: servidor de WebSockets al que publican backend1 y backend2 (puerto REVERB_PORT).
    - Worker de la cola "eventos": consumidor asíncrono que escribe storage\logs\eventos.log.
  Requisitos: en backend-api\.env BROADCAST_CONNECTION=reverb y las variables REVERB_* (ver .env.example).
  Uso: .\eventos.ps1
#>
. "$PSScriptRoot\..\..\infraestructura\comun.ps1"
$red = Import-Red
$backend = (Resolve-Path "$PSScriptRoot\..").Path
$shell = (Get-Process -Id $PID).Path
$puerto = if ($red.REVERB_PORT) { $red.REVERB_PORT } else { '8085' }

$reverb = "Set-Location '$backend'; `$Host.UI.RawUI.WindowTitle = 'Eventos - Reverb :$puerto'; php artisan reverb:start --host=0.0.0.0 --port=$puerto --debug"
$worker = "Set-Location '$backend'; `$Host.UI.RawUI.WindowTitle = 'Eventos - worker de la cola'; php artisan queue:work --queue=eventos,default --sleep=1"

foreach ($comando in $reverb, $worker) {
    Start-Process $shell -ArgumentList '-NoExit', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $comando
}
Write-Host "Reverb (puerto $puerto) y el worker de eventos se abrieron en dos ventanas."
Write-Host 'Para la prueba de resiliencia, cierra la ventana de Reverb: las citas se siguen guardando.'
