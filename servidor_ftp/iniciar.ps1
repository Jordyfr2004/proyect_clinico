<#
  Ejecuta el servidor de archivos. Si se cae por un error, se reinicia a los 3 segundos.
  Uso: .\iniciar.ps1          (para detenerlo: .\detener.ps1)
#>
Set-Location $PSScriptRoot
$venvPython = if (Test-Path .venv\Scripts\python.exe) { '.venv\Scripts\python.exe' } else { '.venv/bin/python' }
$detener = Join-Path $PSScriptRoot 'logs\ftp.detener'
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'logs') | Out-Null
Remove-Item $detener -ErrorAction SilentlyContinue
$Host.UI.RawUI.WindowTitle = 'Servidor de archivos FTP'

while ($true) {
    & $venvPython server.py
    if (Test-Path $detener) {
        Remove-Item $detener
        Write-Host 'Servidor de archivos detenido a pedido.' -ForegroundColor Yellow
        break
    }
    Write-Host 'El servidor de archivos terminó inesperadamente; reiniciando en 3 s...' -ForegroundColor Red
    Start-Sleep -Seconds 3
}
