#!/usr/bin/env bash
# Demuestra el reparto de peticiones entre backend1 y backend2 a través del balanceador.
# Uso: ./balanceo.sh [URL_BALANCEADOR] [PETICIONES]
#      ./balanceo.sh http://100.102.99.114 20
set -uo pipefail

URL="${1:-http://100.102.99.114}"
TOTAL="${2:-20}"

declare -A conteo
fallidas=0

echo "Enviando $TOTAL peticiones a $URL/api/health"
for ((i = 1; i <= TOTAL; i++)); do
    respuesta="$(curl -s -o /dev/null -D - --max-time 5 "$URL/api/health")"
    codigo="$(awk 'NR==1 {print $2}' <<<"$respuesta")"
    instancia="$(grep -i '^X-Backend-Instance:' <<<"$respuesta" | awk '{print $2}' | tr -d '\r')"

    if [[ -z "$instancia" ]]; then
        fallidas=$((fallidas + 1))
        printf '%3d  HTTP %-3s  sin respuesta del backend\n' "$i" "${codigo:-000}"
        continue
    fi

    conteo[$instancia]=$(( ${conteo[$instancia]:-0} + 1 ))
    printf '%3d  HTTP %s  atendida por %s\n' "$i" "$codigo" "$instancia"
done

echo
echo "Resumen:"
for instancia in "${!conteo[@]}"; do
    echo "  $instancia: ${conteo[$instancia]} peticiones"
done
echo "  fallidas: $fallidas"
