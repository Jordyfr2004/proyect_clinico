#!/usr/bin/env bash
# Laptop 1: instala y configura NGINX como reverse proxy y balanceador.
# Uso: sudo ./instalar.sh
source "$(dirname "$0")/../infraestructura/comun.sh"
requiere_root
cargar_red

apt-get install -y nginx gettext-base

DIR="$(dirname "$0")"
# --publico: además publica el API en 127.0.0.1:PUBLICO_PORT para Tailscale Funnel (web en Vercel).
PUBLICO=0; [[ "${1:-}" == "--publico" ]] && PUBLICO=1
export PUBLICO_PORT="${PUBLICO_PORT:-8090}"
VARS='${BACKEND_IP} ${BACKEND1_PORT} ${BACKEND2_PORT} ${WEB_IP} ${WEB_PORT} ${BALANCEADOR_IP} ${SERVER_NAME} ${PUBLICO_PORT}'

renderizar "$DIR/clinica.conf.template" /etc/nginx/sites-available/clinica.conf "$VARS"
renderizar "$DIR/clinica-backend.conf.template" /etc/nginx/snippets/clinica-backend.conf "$VARS"

ln -sf /etc/nginx/sites-available/clinica.conf /etc/nginx/sites-enabled/clinica.conf

# El bloque público va al final del mismo archivo: usa el log_format y los upstreams de
# clinica.conf, y NGINX carga los archivos de sites-enabled en orden alfabético.
if (( PUBLICO )); then
    envsubst "$VARS" < "$DIR/clinica-publico.conf.template" >> /etc/nginx/sites-available/clinica.conf
    echo "Agregado el acceso público al API (127.0.0.1:${PUBLICO_PORT})"
fi
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

permitir_puerto any 80

echo
echo "Balanceador listo en http://${SERVER_NAME}/"
echo "Comprueba: curl -i http://${SERVER_NAME}/api/health"
if (( PUBLICO )); then
    echo
    echo "API público en 127.0.0.1:${PUBLICO_PORT}. Publícalo en internet con HTTPS:"
    echo "    sudo tailscale funnel --bg ${PUBLICO_PORT}"
    echo "y usa la dirección https://...ts.net que muestra como VITE_API_BASE_URL (+ /api) en Vercel."
fi
