<#
  Laptop 4 (Windows): copia de seguridad y restauración de la base de datos.
  Uso:  .\respaldo.ps1                                  -> crea C:\RespaldosClinica\<base>_AAAAMMDD_HHMM.dump
        .\respaldo.ps1 -Restaurar C:\RespaldosClinica\archivo.dump
  Se conservan los últimos 14 respaldos.
#>
param(
    [string] $Restaurar,
    [string] $Destino = $(if ($IsWindows -or $PSVersionTable.PSEdition -ne 'Core') { 'C:\RespaldosClinica' } else { Join-Path $HOME 'respaldos-clinica' }),
    [string] $PgBin,
    [string] $Usuario = 'postgres',
    [string] $Servidor = '127.0.0.1'
)

. "$PSScriptRoot\..\infraestructura\comun.ps1"
$red = Import-Red
$base = $red.BD_NOMBRE
$ext = if ($IsWindows -or $PSVersionTable.PSEdition -ne 'Core') { '.exe' } else { '' }

if (-not $PgBin) {
    $PgBin = Get-PgBin -Ejecutable 'pg_dump'
    if (-not $PgBin) { throw 'No se encontró PostgreSQL. Indica la carpeta bin con -PgBin.' }
}
if (-not $env:PGPASSWORD) {
    $env:PGPASSWORD = [Net.NetworkCredential]::new('', (Read-Host "Contraseña de $Usuario" -AsSecureString)).Password
}
$conexion = @('-h', $Servidor, '-p', $red.BD_PORT, '-U', $Usuario)

if ($Restaurar) {
    if (-not (Test-Path $Restaurar)) { throw "No existe $Restaurar" }
    & (Join-Path $PgBin "pg_restore$ext") @conexion -d $base --clean --if-exists --no-owner --role clinica_app $Restaurar
    if ($LASTEXITCODE) { throw 'pg_restore falló.' }
    Write-Host "Base $base restaurada desde $Restaurar" -ForegroundColor Green
    return
}

New-Item -ItemType Directory -Force $Destino | Out-Null
$archivo = Join-Path $Destino "${base}_$(Get-Date -Format yyyyMMdd_HHmm).dump"
& (Join-Path $PgBin "pg_dump$ext") @conexion -Fc -d $base -f $archivo
if ($LASTEXITCODE) { throw 'pg_dump falló.' }

Get-ChildItem $Destino -Filter "${base}_*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 14 | Remove-Item
Write-Host "Respaldo creado: $archivo ($([math]::Round((Get-Item $archivo).Length / 1KB)) KB)" -ForegroundColor Green
