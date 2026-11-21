#!/usr/bin/env bash
# Guion de la demostración: arquitectura reactiva y orientada a eventos de la cita médica.
# Dispara los cambios de una cita como lo haría la app móvil (paciente) y el panel (doctora).
# Mientras corre, mira el panel web de la doctora y/o el oyente de terminal:
#   cd frontend-web && node scripts/escuchar-eventos.mjs http://<balanceador>/api
#
# Uso: ./demo-eventos.sh [URL_API]
#   Credenciales: PACIENTE_USUARIO, PACIENTE_PASSWORD, DOCTORA_USUARIO, DOCTORA_PASSWORD
#   (si faltan, se preguntan). La paciente no debe tener ya una solicitud pendiente.
set -uo pipefail

API="${1:-http://100.102.99.114/api}"

leer() { local var="$1" texto="$2" oculto="${3:-}"; if [[ -z "${!var:-}" ]]; then
    if [[ -n "$oculto" ]]; then read -rsp "$texto" "$var"; echo; else read -rp "$texto" "$var"; fi; fi; }
leer PACIENTE_USUARIO "Usuario de la paciente: "
leer PACIENTE_PASSWORD "Contraseña de la paciente: " oculto
leer DOCTORA_USUARIO "Usuario de la doctora: "
leer DOCTORA_PASSWORD "Contraseña de la doctora: " oculto

json() { python3 -c "import json,sys; d=json.load(sys.stdin); print(eval(sys.argv[1], {}, {'d': d}))" "$1"; }

token() {
    curl -s -X POST "$API/auth/login" -H 'Accept: application/json' -H 'Content-Type: application/json' \
        -d "{\"username\":\"$1\",\"password\":\"$2\"}" | json "d.get('access_token','')"
}

# Llama al API e imprime el código HTTP, la instancia que atendió y el tiempo de respuesta.
llamar() {
    local metodo="$1" ruta="$2" tok="$3" datos="${4:-}"
    local cab; cab=$(mktemp)
    curl -s -o /tmp/demo-eventos-respuesta.json -D "$cab" -w '%{http_code} %{time_total}\n' -X "$metodo" "$API$ruta" \
        -H 'Accept: application/json' -H 'Content-Type: application/json' -H "Authorization: Bearer $tok" \
        ${datos:+-d "$datos"} | { read -r codigo tiempo
        echo "    $metodo $ruta -> HTTP $codigo en ${tiempo}s, atendido por $(grep -i '^x-backend-instance' "$cab" | cut -d' ' -f2 | tr -d '\r')"; }
    rm -f "$cab"
}

paso() {
    echo
    echo "=============================================================="
    echo "$1"
    echo "=============================================================="
    [[ -n "${2:-}" ]] && echo "$2"
    read -rp "Enter para ejecutar..."
}

TP=$(token "$PACIENTE_USUARIO" "$PACIENTE_PASSWORD"); TD=$(token "$DOCTORA_USUARIO" "$DOCTORA_PASSWORD")
[[ -n "$TP" && -n "$TD" ]] || { echo "No se pudo iniciar sesión con alguna de las cuentas."; exit 1; }
echo "Sesiones iniciadas (paciente y doctora)."

FECHA=$(date -d '+3 days' +%F)

paso "1. La paciente solicita una cita (productor: app móvil)" \
     "Esperado: aviso 'solicitó una cita' en el panel de la doctora, sin recargar la página."
llamar POST /agenda/solicitar-cita "$TP"
CITA=$(json "d['data']['id']" < /tmp/demo-eventos-respuesta.json)
echo "    cita: $CITA"

paso "2. La doctora programa la solicitud para el $FECHA 09:00" \
     "Esperado: evento cita.programada; la paciente también lo recibe en su canal privado."
llamar PUT "/agenda/solicitud/$CITA/programar" "$TD" "{\"fecha\":\"$FECHA\",\"hora_inicio\":\"09:00\",\"hora_fin\":\"09:30\"}"

paso "3. La paciente pide reprogramar" "Esperado: evento cita.reprogramacion_solicitada (la cita vuelve a pendiente)."
llamar PUT "/agenda/mis-citas/$CITA/reprogramar" "$TP"

paso "4. La paciente cancela" "Esperado: evento cita.cancelada; el panel quita la solicitud de pendientes."
llamar PUT "/agenda/mis-citas/$CITA/cancelar" "$TP"

paso "5. Bitácora asíncrona (consumidor por cola)" \
     "En la laptop del backend: tail -n 4 backend-api/storage/logs/eventos.log"
echo
echo "Fin. Para la prueba de resiliencia: detén Reverb (Ctrl+C en 'php artisan reverb:start')"
echo "y repite el paso 1: la cita se guarda igual (HTTP 201) y el panel muestra 'Sin conexión en vivo'."
rm -f /tmp/demo-eventos-respuesta.json
