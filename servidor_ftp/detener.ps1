<#
  Detiene el servidor de archivos (por ejemplo, para la prueba de fallo de la defensa).
  Uso: .\detener.ps1
#>
. "$PSScriptRoot\..\infraestructura\comun.ps1"
$red = Import-Red
$puerto = [int] $red.FTP_PORT
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'logs') | Out-Null
New-Item -ItemType File -Force (Join-Path $PSScriptRoot 'logs\ftp.detener') | Out-Null

$procesos = if ($IsWindows -or $PSVersionTable.PSEdition -ne 'Core') {
    (Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue).OwningProcess
} else {
    (& ss -ltnpH "sport = :$puerto" | Select-String -AllMatches 'pid=(\d+)').Matches | ForEach-Object { $_.Groups[1].Value }
}
if (-not $procesos) { Write-Host "El servidor de archivos no estaba en ejecución (puerto $puerto)."; return }
$procesos | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
Write-Host "Servidor de archivos detenido (puerto $puerto)."
