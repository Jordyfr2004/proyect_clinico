<#
  Demuestra el reparto de peticiones entre backend1 y backend2 a través del balanceador.
  Uso: .\balanceo.ps1                                   (usa SERVER_NAME de red.env)
       .\balanceo.ps1 -Url http://100.102.99.114 -Peticiones 20
#>
param([string] $Url, [int] $Peticiones = 20)

if (-not $Url) {
    . "$PSScriptRoot\..\comun.ps1"
    $Url = "http://$((Import-Red).SERVER_NAME)"
}

$conteo = @{}
$fallidas = 0
Write-Host "Enviando $Peticiones peticiones a $Url/api/health"
for ($i = 1; $i -le $Peticiones; $i++) {
    try {
        $r = Invoke-WebRequest "$Url/api/health" -TimeoutSec 5 -SkipHttpErrorCheck -UseBasicParsing
        $instancia = "$($r.Headers['X-Backend-Instance'])"
    } catch {
        $r = $null; $instancia = ''
    }
    if (-not $instancia) {
        $fallidas++
        '{0,3}  HTTP {1,-3}  sin respuesta del backend' -f $i, ($r ? $r.StatusCode : '000')
        continue
    }
    $conteo[$instancia] = 1 + ($conteo[$instancia] ?? 0)
    '{0,3}  HTTP {1}  atendida por {2}' -f $i, $r.StatusCode, $instancia
}

Write-Host "`nResumen:"
$conteo.GetEnumerator() | Sort-Object Name | ForEach-Object { "  $($_.Name): $($_.Value) peticiones" }
"  fallidas: $fallidas"
