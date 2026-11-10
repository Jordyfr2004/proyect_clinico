#!/usr/bin/env bash
# Laptop 4: copia de seguridad de la base de datos (requisito "recuperar información en caso de fallo").
# Uso: sudo ./respaldo.sh            -> crea /var/backups/clinica/clinica_AAAAMMDD_HHMM.dump
#      sudo ./respaldo.sh restaurar archivo.dump
set -euo pipefail

DB_DATABASE="${DB_DATABASE:-proyect_clinico}"
DESTINO="${DESTINO:-/var/backups/clinica}"

if [[ "${1:-}" == "restaurar" ]]; then
    ARCHIVO="${2:?Indica el archivo .dump a restaurar}"
    sudo -u postgres pg_restore --clean --if-exists --no-owner --role="${DB_USERNAME:-clinica_app}" -d "$DB_DATABASE" "$ARCHIVO"
    echo "Base restaurada desde $ARCHIVO"
    exit 0
fi

mkdir -p "$DESTINO"
chown postgres:postgres "$DESTINO"
ARCHIVO="$DESTINO/clinica_$(date +%Y%m%d_%H%M).dump"
sudo -u postgres pg_dump -Fc "$DB_DATABASE" -f "$ARCHIVO"

# Conserva los últimos 14 respaldos.
ls -1t "$DESTINO"/clinica_*.dump | tail -n +15 | xargs -r rm --

echo "Respaldo creado: $ARCHIVO"
