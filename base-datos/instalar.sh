#!/usr/bin/env bash
# Laptop 4: instala PostgreSQL, crea la base del sistema y solo permite conexiones del backend.
# Uso: sudo DB_PASSWORD='contraseña-segura' ./instalar.sh
#
# Las tablas NO se crean aquí: las crean las migraciones de Laravel
# (php artisan migrate en la Laptop 3), que son la única fuente del esquema.
source "$(dirname "$0")/../infraestructura/comun.sh"
requiere_root
cargar_red

DB_DATABASE="${DB_DATABASE:-$BD_NOMBRE}"
DB_USERNAME="${DB_USERNAME:-clinica_app}"

if [[ -z "${DB_PASSWORD:-}" ]]; then
    read -rsp "Contraseña para el usuario $DB_USERNAME: " DB_PASSWORD
    echo
fi

apt-get install -y postgresql

PG_VERSION="$(ls /etc/postgresql | sort -V | tail -n1)"
PG_CONF="/etc/postgresql/$PG_VERSION/main"

# Usuario y base de datos (idempotente: se puede ejecutar de nuevo).
sudo -u postgres psql -v ON_ERROR_STOP=1 \
    -v usuario="$DB_USERNAME" -v clave="$DB_PASSWORD" -v base="$DB_DATABASE" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'usuario', :'clave')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'usuario') \gexec
SELECT format('ALTER ROLE %I PASSWORD %L', :'usuario', :'clave') \gexec
SELECT format('CREATE DATABASE %I OWNER %I', :'base', :'usuario')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'base') \gexec
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', :'base') \gexec
SQL

# En PostgreSQL 15+ el esquema public no es de libre escritura: pasa a ser de la aplicación.
# Los demás esquemas (seguridad, clinica, citas...) los crean las migraciones de Laravel.
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_DATABASE" -v usuario="$DB_USERNAME" <<'SQL'
SELECT format('ALTER SCHEMA public OWNER TO %I', :'usuario') \gexec
SQL

# Escuchar en la IP de este nodo y aceptar solo al backend (Laptop 3).
cat > "$PG_CONF/conf.d/clinica.conf" <<CONF
listen_addresses = 'localhost,${BD_IP}'
port = ${BD_PORT}
password_encryption = scram-sha-256
log_connections = on
log_disconnections = on
log_min_duration_statement = 1000
CONF

HBA="$PG_CONF/pg_hba.conf"
REGLA="host    ${DB_DATABASE}    ${DB_USERNAME}    ${BACKEND_IP}/32    scram-sha-256"
sed -i '/# clinica-backend$/d' "$HBA"
echo "$REGLA    # clinica-backend" >> "$HBA"

systemctl enable postgresql
systemctl restart postgresql

permitir_puerto "$BACKEND_IP" "$BD_PORT"

echo
echo "PostgreSQL listo en ${BD_IP}:${BD_PORT}, base ${DB_DATABASE}, solo accesible desde ${BACKEND_IP}."
echo "En backend-api/.env: DB_HOST=${BD_IP} DB_DATABASE=${DB_DATABASE} DB_USERNAME=${DB_USERNAME}"
