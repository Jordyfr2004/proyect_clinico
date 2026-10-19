<#
  Laptop 4 (Windows): prepara PostgreSQL para el sistema.
  - Crea el usuario de la aplicación (clinica_app) y la base BD_NOMBRE de red.env.
  - Solo acepta conexiones del backend (y opcionalmente de un equipo de administración).
  Las tablas NO se crean aquí: las crean las migraciones de Laravel en la Laptop 3.

  Requisito: PostgreSQL instalado con el instalador oficial.
  Uso (PowerShell como administrador, desde la carpeta base-datos):
      .\instalar.ps1
      .\instalar.ps1 -AdminIP 100.102.99.114     # permite además mantenimiento desde ese equipo
#>
param(
    [string] $PgBin,
    [string] $SuperUsuario = 'postgres',
    [string] $AppUsuario = 'clinica_app',
    [string] $AdminIP,
    [string] $Servidor = '127.0.0.1'
)

. "$PSScriptRoot\..\infraestructura\comun.ps1"
Assert-Administrador
$red = Import-Red
$base = $red.BD_NOMBRE

# 1. Ubicar psql.exe (la versión más reciente instalada).
if (-not $PgBin) {
    $PgBin = Get-PgBin
    if (-not $PgBin) { throw 'No se encontró PostgreSQL. Indica la carpeta bin con -PgBin.' }
}
$ext = if ($IsWindows -or $PSVersionTable.PSEdition -ne 'Core') { '.exe' } else { '' }
$psqlExe = Join-Path $PgBin "psql$ext"

# 2. Contraseñas (no se guardan en ningún archivo).
if ($env:PGPASSWORD) {
    Write-Host "Se usará la contraseña de $SuperUsuario definida antes en esta ventana (variable PGPASSWORD)."
    Write-Host 'Si no es la correcta, bórrala con: Remove-Item Env:\PGPASSWORD   y vuelve a ejecutar el script.'
} else {
    $env:PGPASSWORD = [Net.NetworkCredential]::new('', (Read-Host "Contraseña del superusuario $SuperUsuario" -AsSecureString)).Password
}
$clave = if ($env:CLINICA_APP_PASSWORD) { $env:CLINICA_APP_PASSWORD } else {
    [Net.NetworkCredential]::new('', (Read-Host "Contraseña nueva para $AppUsuario (DB_PASSWORD del backend)" -AsSecureString)).Password
}
if ($clave.Length -lt 10) { throw 'Usa una contraseña de al menos 10 caracteres para la aplicación.' }

function Invoke-Psql([string] $Sql, [string] $Conectar = 'postgres') {
    # psql informa los errores por stderr; con ErrorActionPreference 'Stop' (comun.ps1) eso
    # abortaría el script sin mensaje claro. Se deja continuar y se revisa el código de salida.
    $ErrorActionPreference = 'Continue'
    $salida = $Sql | & $psqlExe -X -q -t -A -v ON_ERROR_STOP=1 -h $Servidor -p $red.BD_PORT -U $SuperUsuario -d $Conectar `
        -v "usuario=$AppUsuario" -v "clave=$clave" -v "base=$base" 2>&1
    if ($LASTEXITCODE) {
        $texto = ($salida | ForEach-Object { if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.Exception.Message } else { "$_" } }) -join [Environment]::NewLine
        if ($texto -match 'autentificaci|authentication failed') {
            throw "PostgreSQL rechazó la contraseña de $SuperUsuario.`n$texto"
        }
        throw "psql falló:`n$texto"
    }
    return $salida
}

# 3. Usuario y base de datos (se puede ejecutar varias veces).
Invoke-Psql @'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'usuario', :'clave')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'usuario') \gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'usuario', :'clave') \gexec
SELECT format('CREATE DATABASE %I OWNER %I ENCODING ''UTF8''', :'base', :'usuario')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'base') \gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', :'base', :'usuario') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'base') \gexec
'@ | Out-Null
# En PostgreSQL 15+ el esquema public no es de libre escritura: pasa a ser de la aplicación.
Invoke-Psql "SELECT format('ALTER SCHEMA public OWNER TO %I', :'usuario') \gexec" $base | Out-Null
# Base que ya existía con objetos de otro usuario (p. ej. migraciones corridas como postgres
# o desde pgAdmin): sin esto Laravel falla con "permiso denegado a la tabla migrations" y no
# llega a crear los esquemas por área ni la trazabilidad (auditoria.registro_cambios).
# Se pasan a la aplicación los esquemas, tablas, secuencias y funciones (las de los triggers);
# se omiten los del sistema y los de extensiones. Cambiar el dueño de una tabla arrastra
# sus secuencias; las sueltas se cambian aparte.
Invoke-Psql @'
CREATE TEMP VIEW ajenos AS
SELECT n.oid, n.nspname FROM pg_namespace n
WHERE n.nspname NOT LIKE 'pg\_%' AND n.nspname <> 'information_schema';
SELECT format('ALTER SCHEMA %I OWNER TO %I', a.nspname, :'usuario')
FROM ajenos a JOIN pg_namespace n ON n.oid = a.oid
WHERE n.nspowner <> (SELECT oid FROM pg_roles WHERE rolname = :'usuario') \gexec
SELECT format('ALTER TABLE %I.%I OWNER TO %I', a.nspname, c.relname, :'usuario')
FROM pg_class c JOIN ajenos a ON a.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'v', 'm')
  AND c.relowner <> (SELECT oid FROM pg_roles WHERE rolname = :'usuario')
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e') \gexec
SELECT format('ALTER SEQUENCE %I.%I OWNER TO %I', a.nspname, c.relname, :'usuario')
FROM pg_class c JOIN ajenos a ON a.oid = c.relnamespace
WHERE c.relkind = 'S'
  AND c.relowner <> (SELECT oid FROM pg_roles WHERE rolname = :'usuario')
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype IN ('a', 'i', 'e')) \gexec
SELECT format('ALTER ROUTINE %s OWNER TO %I', p.oid::regprocedure, :'usuario')
FROM pg_proc p JOIN ajenos a ON a.oid = p.pronamespace
WHERE p.proowner <> (SELECT oid FROM pg_roles WHERE rolname = :'usuario')
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e') \gexec
'@ $base | Out-Null
Write-Host "Base '$base' lista, propiedad de $AppUsuario."

# 4. Escuchar en la red y aceptar solo al backend (y al administrador si se indicó).
$configFile = (Invoke-Psql 'SHOW config_file').Trim()
$hbaFile = (Invoke-Psql 'SHOW hba_file').Trim()

function Set-Bloque([string] $Archivo, [string[]] $Lineas) {
    # Bloque entre marcas: al repetir la instalación se reemplaza, no se duplica.
    $texto = (Get-Content $Archivo -Raw -Encoding UTF8) -replace '(?s)\r?\n# clinica-inicio.*?# clinica-fin\r?\n?', ''
    $bloque = @('', '# clinica-inicio (generado por base-datos\instalar.ps1)') + $Lineas + '# clinica-fin'
    [IO.File]::WriteAllText($Archivo, $texto.TrimEnd() + ($bloque -join [Environment]::NewLine) + [Environment]::NewLine, [Text.UTF8Encoding]::new($false))
    Write-Host "Actualizado $Archivo"
}

Set-Bloque $configFile @(
    "listen_addresses = '*'",
    "port = $($red.BD_PORT)",
    "password_encryption = scram-sha-256",
    "log_connections = on",
    "log_disconnections = on",
    "log_min_duration_statement = 1000"
)

$autorizados = @($red.BACKEND_IP) + @($AdminIP | Where-Object { $_ })
$reglas = foreach ($ip in $autorizados) {
    "host    $base    $AppUsuario    $ip/32    scram-sha-256"
}
if ($AdminIP) { $reglas += "host    all    $SuperUsuario    $AdminIP/32    scram-sha-256" }
Set-Bloque $hbaFile $reglas

# 5. Reiniciar PostgreSQL y abrir el puerto solo para esos equipos.
$servicio = if ($IsWindows -or $PSVersionTable.PSEdition -ne 'Core') {
    # Con varias versiones instaladas (p. ej. 14 y 18) hay que reiniciar la que sirve $configFile,
    # que es la misma a la que se conectó psql. Se busca por su carpeta de datos.
    $dataDir = Split-Path $configFile
    $todos = @(Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue)
    $coincide = $todos | Where-Object {
        (Get-CimInstance Win32_Service -Filter "Name='$($_.Name)'" -ErrorAction SilentlyContinue).PathName -like "*$dataDir*"
    } | Select-Object -First 1
    if ($coincide) { $coincide } else { $todos | Select-Object -First 1 }
}
if ($servicio) {
    Restart-Service $servicio.Name -Force
    Write-Host "Servicio $($servicio.Name) reiniciado."
} else {
    Write-Warning 'No se encontró el servicio de PostgreSQL: reinícialo manualmente para aplicar los cambios.'
}
Add-ReglaFirewall 'Clinica PostgreSQL' $red.BD_PORT $autorizados

Write-Host "`nPostgreSQL listo en $($red.BD_IP):$($red.BD_PORT), solo para $($autorizados -join ', ')." -ForegroundColor Green
Write-Host "En backend-api\.env: DB_HOST=$($red.BD_IP)  DB_PORT=$($red.BD_PORT)  DB_DATABASE=$base  DB_USERNAME=$AppUsuario  DB_PASSWORD=(la que escribiste)"
