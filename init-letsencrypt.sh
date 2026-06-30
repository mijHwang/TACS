#!/bin/bash
###############################################################################
# init-letsencrypt.sh
#
# Emite por primera vez el certificado TLS de Let's Encrypt para el deploy con
# HTTPS. Ejecutar UNA sola vez en la instancia EC2 (Linux), desde la raíz del repo.
#
# Antes de correrlo, verificá:
#   - El dominio $DOMAIN resuelve a la IP pública de esta máquina.
#   - Los puertos 80 y 443 están abiertos en el Security Group de la EC2.
#   - docker + docker compose v2 están instalados.
#
# Basado en el script de referencia de https://github.com/wmnnd/nginx-certbot
###############################################################################
set -e

DOMAIN="tacs-g3-figuritas.duckdns.org"
EMAIL="sicher2001@gmail.com"   # avisos de expiración (vacío = registrar sin email)
STAGING=0                       # 1 = entorno de PRUEBA de Let's Encrypt (sin rate limit)

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
DATA_PATH="./certbot"
RSA_KEY_SIZE=4096

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker no está instalado." >&2
  exit 1
fi

if [ -d "$DATA_PATH/conf/live/$DOMAIN" ]; then
  read -p "Ya existe un certificado para $DOMAIN. ¿Reemplazarlo? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

# 1) Parámetros TLS recomendados (options-ssl-nginx.conf + ssl-dhparams.pem)
if [ ! -e "$DATA_PATH/conf/options-ssl-nginx.conf" ] || [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
  echo "### Descargando parámetros TLS recomendados ..."
  mkdir -p "$DATA_PATH/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$DATA_PATH/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$DATA_PATH/conf/ssl-dhparams.pem"
fi

# 2) Certificado dummy temporal para que Nginx pueda arrancar escuchando en 443
echo "### Creando certificado temporal para $DOMAIN ..."
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
$COMPOSE run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout '$CERT_PATH/privkey.pem' \
    -out '$CERT_PATH/fullchain.pem' \
    -subj '/CN=localhost'" certbot

# 3) Levantar la app (Nginx arranca con el cert dummy)
echo "### Levantando contenedores (frontend + backend) ..."
$COMPOSE up --force-recreate -d frontend backend

# 4) Borrar el cert dummy
echo "### Borrando certificado temporal ..."
$COMPOSE run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

# 5) Pedir el certificado real vía webroot
echo "### Solicitando certificado de Let's Encrypt para $DOMAIN ..."
case "$EMAIL" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $EMAIL" ;;
esac
staging_arg=""
if [ "$STAGING" != "0" ]; then staging_arg="--staging"; fi

$COMPOSE run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    -d $DOMAIN \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

# 6) Recargar Nginx con el certificado real
echo "### Recargando Nginx ..."
$COMPOSE exec frontend nginx -s reload

echo ""
echo "### Listo. La app debería estar disponible en https://$DOMAIN/"
