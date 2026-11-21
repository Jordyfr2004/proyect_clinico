#!/usr/bin/env bash
# Laptop 2: compila el frontend web y lo publica con NGINX.
# Uso: sudo ./instalar.sh   (desde frontend-web/despliegue, con Node.js 20+ instalado)
source "$(dirname "$0")/../../infraestructura/comun.sh"
requiere_root
cargar_red

DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="${FRONTEND_DIR:-$DIR/..}"

apt-get install -y nginx gettext-base

if ! command -v npm >/dev/null; then
    echo "Instala Node.js 20 o superior antes de continuar." >&2
    exit 1
fi

# El navegador llama al API a través del balanceador (mismo origen que la web).
echo "Compilando frontend con VITE_API_BASE_URL=http://${SERVER_NAME}/api"
cd "$FRONTEND_DIR"
sudo -u "${SUDO_USER:-root}" npm ci
sudo -u "${SUDO_USER:-root}" env VITE_API_BASE_URL="http://${SERVER_NAME}/api" npm run build

mkdir -p /var/www/clinica-web
rm -rf /var/www/clinica-web/*
cp -r dist/. /var/www/clinica-web/

renderizar "$DIR/clinica-web.conf.template" /etc/nginx/sites-available/clinica-web.conf '${WEB_PORT} ${BALANCEADOR_IP}'
ln -sf /etc/nginx/sites-available/clinica-web.conf /etc/nginx/sites-enabled/clinica-web.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

permitir_puerto "$BALANCEADOR_IP" "$WEB_PORT"

echo
echo "Frontend publicado en el puerto ${WEB_PORT}. Acceso para usuarios: http://${SERVER_NAME}/"
