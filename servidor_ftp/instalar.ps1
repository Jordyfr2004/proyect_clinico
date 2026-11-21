<#
  Laptop 5 (Windows): instala el servidor de archivos FTP.
  Requisito: Python 3.10+ (python.org, marcar "Add python.exe to PATH").
  Uso (PowerShell como administrador, desde la carpeta servidor_ftp):
      .\instalar.ps1                 # instala y abre el firewall
      .\instalar.ps1 -Automatico     # además lo inicia solo al encender el equipo
#>
param([switch] $Automatico)

. "$PSScriptRoot\..\infraestructura\comun.ps1"
Assert-Administrador
$red = Import-Red
Set-Location $PSScriptRoot

$python = Get-Command python, python3 -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $python) { throw 'No se encontró Python. Instálalo desde python.org marcando "Add python.exe to PATH".' }

if (-not (Test-Path .venv)) { & $python.Source -m venv .venv }
$venvPython = if (Test-Path .venv\Scripts\python.exe) { '.venv\Scripts\python.exe' } else { '.venv/bin/python' }
& $venvPython -m pip install --quiet --upgrade pip
& $venvPython -m pip install --quiet -r requirements.txt
if ($LASTEXITCODE) { throw 'No se pudieron instalar las dependencias.' }

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Warning 'Se creó servidor_ftp\.env: escribe FTP_PASSWORD (la misma que FTP_PASSWORD del backend) y vuelve a ejecutar.'
    return
}
$envTexto = Get-Content .env -Raw
if ($envTexto -notmatch '(?m)^FTP_PASSWORD=.{8,}') { throw 'Completa FTP_PASSWORD en servidor_ftp\.env (mínimo 8 caracteres).' }
if ($envTexto -notmatch "(?m)^FTP_ALLOWED_IPS=.*$([regex]::Escape($red.BACKEND_IP))") {
    Write-Warning "FTP_ALLOWED_IPS en .env debería incluir la IP del backend ($($red.BACKEND_IP))."
}

# Solo el backend puede conectarse: puerto de control y puertos pasivos.
Add-ReglaFirewall 'Clinica FTP' $red.FTP_PORT @($red.BACKEND_IP)
Add-ReglaFirewall 'Clinica FTP pasivo' $red.FTP_PASSIVE_PORTS @($red.BACKEND_IP)

if ($Automatico -and ($IsWindows -or $PSVersionTable.PSEdition -ne 'Core')) {
    $shell = (Get-Process -Id $PID).Path
    $accion = New-ScheduledTaskAction -Execute $shell -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\iniciar.ps1`"" -WorkingDirectory $PSScriptRoot
    $inicio = New-ScheduledTaskTrigger -AtStartup
    $ajustes = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit 0
    Register-ScheduledTask -TaskName 'Clinica FTP' -Action $accion -Trigger $inicio -Settings $ajustes -User 'SYSTEM' -RunLevel Highest -Force | Out-Null
    Write-Host 'Tarea programada "Clinica FTP" creada: se inicia al encender el equipo.'
}

Write-Host "`nServidor de archivos listo. Inícialo con: .\iniciar.ps1" -ForegroundColor Green
