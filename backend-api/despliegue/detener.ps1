<#
  Detiene una instancia (prueba de fallo) o ambas.
  Uso: .\detener.ps1 -Numero 2     |     .\detener.ps1
#>
param([ValidateSet(1, 2)][int[]] $Numero = @(1, 2))

. "$PSScriptRoot\..\..\infraestructura\comun.ps1"
$red = Import-Red
$control = (Resolve-Path "$PSScriptRoot\..\storage\framework").Path

foreach ($n in $Numero) {
    $puerto = [int] $red["BACKEND${n}_PORT"]
    # Marca la detención como voluntaria para que instancia.ps1 no la reinicie.
    New-Item -ItemType File -Force (Join-Path $control "backend$n.detener") | Out-Null
    $procesos = if ($IsWindows -or $PSVersionTable.PSEdition -ne 'Core') {
        (Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue).OwningProcess
    } else {
        (& ss -ltnpH "sport = :$puerto" | Select-String -AllMatches 'pid=(\d+)').Matches | ForEach-Object { $_.Groups[1].Value }
    }
    if (-not $procesos) { Write-Host "backend$n no estaba en ejecución (puerto $puerto)."; continue }
    $procesos | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
    Write-Host "backend$n detenido (puerto $puerto)."
}
