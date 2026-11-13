#!/usr/bin/env bash
# Funciones compartidas por los scripts de instalación.
set -euo pipefail

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cargar_red() {
    local archivo="${RED_ENV:-$INFRA_DIR/red.env}"

    if [[ ! -f "$archivo" ]]; then
        echo "No existe $archivo. Copia red.env.example (LAN) o red.tailscale.env.example a red.env." >&2
        exit 1
    fi

    set -a
    # shellcheck source=/dev/null
    source "$archivo"
    set +a
}

requiere_root() {
    if [[ $EUID -ne 0 ]]; then
        echo "Ejecuta este script con sudo." >&2
        exit 1
    fi
}

# Sustituye solo las variables indicadas, para no tocar las variables propias de NGINX ($host, $uri...).
renderizar() {
    local plantilla="$1" destino="$2" variables="$3"
    envsubst "$variables" < "$plantilla" > "$destino"
    echo "Generado $destino"
}

permitir_puerto() {
    local origen="$1" puerto="$2"

    if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
        ufw allow from "$origen" to any port "$puerto" proto tcp
    fi
}
