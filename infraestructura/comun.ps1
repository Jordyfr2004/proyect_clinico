# Funciones compartidas por los scripts de instalación de los nodos Windows.
# Uso: . "$PSScriptRoot\..\infraestructura\comun.ps1"

$ErrorActionPreference = 'Stop'
$InfraDir = $PSScriptRoot

function Import-Red {
    <# Lee infraestructura\red.env y devuelve un diccionario con las IPs y puertos. #>
    $archivo = if ($env:RED_ENV) { $env:RED_ENV } else { Join-Path $InfraDir 'red.env' }

    if (-not (Test-Path $archivo)) {
        throw "No existe $archivo. Copia red.tailscale.env.example (casa) o red.env.example (aula) a red.env."
    }

    $red = @{}
    foreach ($linea in Get-Content $archivo -Encoding UTF8) {
        $linea = $linea.Trim()
        if (-not $linea -or $linea.StartsWith('#') -or -not $linea.Contains('=')) { continue }
        $clave, $valor = $linea.Split('=', 2)
        $red[$clave.Trim()] = $valor.Trim().Trim('"', "'")
    }
    return $red
}

function Write-Plantilla {
    <# Copia una plantilla reemplazando solo ${VARIABLE} por los valores indicados. #>
    param([string] $Plantilla, [string] $Destino, [hashtable] $Valores)

    $texto = Get-Content $Plantilla -Raw -Encoding UTF8
    foreach ($clave in $Valores.Keys) {
        $texto = $texto.Replace('${' + $clave + '}', [string] $Valores[$clave])
    }
    if ($texto -match '\$\{[A-Z0-9_]+\}') {
        throw "Faltan valores en $Plantilla : $($Matches[0])"
    }
    # UTF-8 sin BOM: NGINX y PHP no aceptan el BOM.
    [System.IO.File]::WriteAllText($Destino, $texto, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Generado $Destino"
}

function Test-Administrador {
    if (-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core') { return $true }
    $identidad = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    return $identidad.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Assert-Administrador {
    if (-not (Test-Administrador)) {
        throw 'Abre PowerShell como administrador (clic derecho > Ejecutar como administrador).'
    }
}

function Get-PgBin {
    <#
      Carpeta bin de PostgreSQL que contiene $Ejecutable. Con varias versiones instaladas
      (p. ej. 14 y 18) prefiere la que atiende BD_PORT de red.env, para que pg_dump y
      pg_restore coincidan con el servidor; si no la reconoce, usa la más reciente.
    #>
    param([string] $Ejecutable = 'psql')

    $candidatos = @(Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\$Ejecutable.exe" -ErrorAction SilentlyContinue |
        Sort-Object { [version](($_.Directory.Parent.Name -replace '[^\d.]', '') + '.0') } -Descending)
    if (-not $candidatos) { return $null }

    $puerto = (Import-Red).BD_PORT
    foreach ($exe in $candidatos) {
        $conf = Join-Path $exe.Directory.Parent.FullName 'data\postgresql.conf'
        if (-not (Test-Path $conf)) { continue }
        # La última línea "port = ..." no comentada es la que vale.
        $linea = Select-String -Path $conf -Pattern '^\s*port\s*=\s*(\d+)' | Select-Object -Last 1
        if ($linea -and $linea.Matches[0].Groups[1].Value -eq $puerto) { return $exe.DirectoryName }
    }
    return $candidatos[0].DirectoryName
}

function Add-ReglaFirewall {
    <# Permite un puerto TCP de entrada solo desde las IPs indicadas. Se puede ejecutar varias veces. #>
    param([string] $Nombre, [string] $Puerto, [string[]] $Desde)

    if (-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core') {
        Write-Host "(No es Windows: se omite la regla de firewall $Nombre)"
        return
    }
    Get-NetFirewallRule -DisplayName $Nombre -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule -DisplayName $Nombre -Direction Inbound -Protocol TCP -LocalPort $Puerto `
        -RemoteAddress $Desde -Action Allow -Profile Any | Out-Null
    Write-Host "Firewall: puerto $Puerto abierto solo para $($Desde -join ', ')"
}
