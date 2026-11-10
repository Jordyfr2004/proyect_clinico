<#
  Abre las dos instancias del backend, cada una en su propia ventana.
  Uso: .\iniciar.ps1
#>
$shell = (Get-Process -Id $PID).Path
foreach ($n in 1, 2) {
    Start-Process $shell -ArgumentList '-NoExit', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "$PSScriptRoot\instancia.ps1", '-Numero', $n
}
Write-Host 'Instancias iniciadas en dos ventanas. Para simular una caida: .\detener.ps1 -Numero 2'
