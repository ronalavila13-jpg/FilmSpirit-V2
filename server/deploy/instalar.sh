#!/usr/bin/env bash
# ============================================================
# FilmSpirit · instalación en una VPS con Ubuntu 24.04 (Hostinger KVM 1 o similar)
#
# Uso (como root, desde la carpeta «server» que subiste a la VPS):
#     sudo bash deploy/instalar.sh tudominio.pe tu@correo.com
#
# Hace todo esto, y se puede volver a ejecutar sin romper nada:
#   · instala Node 22, nginx, certbot y el cortafuegos (ufw)
#   · copia la app a /opt/filmspirit y guarda los datos en /var/lib/filmspirit
#   · crea /etc/filmspirit/filmspirit.env (la primera vez) para tus claves
#   · deja la app como servicio (systemd) que arranca solo y se reinicia si falla
#   · configura nginx con HTTPS gratis de Let's Encrypt (se renueva solo) y límites por IP (deploy/nginx-limites.sh)
#   · programa un respaldo diario de la base de datos (14 días)
# Antes: el dominio (y www) debe apuntar a la IP de la VPS (registro A en el DNS).
# ============================================================
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Uso: sudo bash deploy/instalar.sh tudominio.pe tu@correo.com"; exit 1
fi
if [[ $EUID -ne 0 ]]; then echo "Ejecútalo como root (sudo)."; exit 1; fi
SRC="$(cd "$(dirname "$0")/.." && pwd)"
if [[ ! -f "$SRC/server.js" || ! -f "$SRC/public/app/index.html" ]]; then
  echo "No encuentro la app en $SRC (falta server.js o public/app). Sube la carpeta «server» completa."; exit 1
fi
APP=/opt/filmspirit DATA=/var/lib/filmspirit ETC=/etc/filmspirit
say() { printf '\n\033[1;33m▸ %s\033[0m\n' "$*"; }

say "1/8 Paquetes del sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg nginx certbot python3-certbot-nginx ufw rsync sqlite3

say "2/8 Node.js 22"
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if (a<22||(a===22&&b<13)) { console.error("Se necesita Node 22.13 o más nuevo"); process.exit(1) }'
echo "Node $(node -v)"

say "3/8 Usuario y carpetas"
id filmspirit >/dev/null 2>&1 || useradd --system --home "$DATA" --shell /usr/sbin/nologin filmspirit
mkdir -p "$APP" "$DATA" "$ETC"
rsync -a --delete --exclude data --exclude test --exclude tools/token-prueba.js --exclude 'deploy/*.local' "$SRC"/ "$APP"/
chown -R root:root "$APP"; chmod -R a+rX "$APP"
chown -R filmspirit:filmspirit "$DATA"; chmod 750 "$DATA"

say "4/8 Configuración"
if [[ ! -f "$ETC/filmspirit.env" ]]; then
  sed "s/__DOMINIO__/$DOMAIN/g" "$APP/deploy/filmspirit.env.ejemplo" > "$ETC/filmspirit.env"
  echo "Creado $ETC/filmspirit.env: complétalo con tus claves."
else
  echo "$ETC/filmspirit.env ya existe: se conserva."
fi
chown root:filmspirit "$ETC/filmspirit.env"; chmod 640 "$ETC/filmspirit.env"

say "5/8 Servicio"
cat > /etc/systemd/system/filmspirit.service <<UNIT
[Unit]
Description=FilmSpirit (web app)
After=network-online.target
Wants=network-online.target

[Service]
User=filmspirit
Group=filmspirit
EnvironmentFile=$ETC/filmspirit.env
WorkingDirectory=$APP
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning --max-old-space-size=1536 $APP/server.js
Restart=always
RestartSec=3
# protección: solo puede escribir en su carpeta de datos
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true
ReadWritePaths=$DATA
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/systemd/system/filmspirit-respaldo.service <<UNIT
[Unit]
Description=Respaldo diario de FilmSpirit

[Service]
Type=oneshot
User=filmspirit
Environment=DATA_DIR=$DATA
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning $APP/tools/respaldo.js
UNIT
cat > /etc/systemd/system/filmspirit-respaldo.timer <<UNIT
[Unit]
Description=Respaldo diario de FilmSpirit (3:30 a. m.)

[Timer]
OnCalendar=*-*-* 08:30:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now filmspirit filmspirit-respaldo.timer
systemctl restart filmspirit

say "6/8 nginx"
cat > /etc/nginx/sites-available/filmspirit <<NGINX
# FilmSpirit: nginx recibe HTTPS y pasa todo a la app (puerto 8080, solo local)
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN www.$DOMAIN;
  client_max_body_size 50m;
  server_tokens off;

  # cambios en vivo (Server-Sent Events): sin búfer y conexión larga
  location ~ ^/api/p/[^/]+/events$ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 1h;
  }
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 120s;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/filmspirit /etc/nginx/sites-enabled/filmspirit
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
# límites por IP antes de llegar a la app (/etc/nginx/conf.d/filmspirit-limites.conf)
bash "$APP/deploy/nginx-limites.sh"

say "7/8 Cortafuegos"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null
ufw status | sed -n '1,8p'

say "8/8 HTTPS (Let's Encrypt)"
DOMS=(-d "$DOMAIN")
if getent hosts "www.$DOMAIN" >/dev/null; then DOMS+=(-d "www.$DOMAIN"); fi
if certbot --nginx "${DOMS[@]}" --non-interactive --agree-tos -m "$EMAIL" --redirect; then
  echo "HTTPS listo (se renueva solo)."
else
  echo "No se pudo obtener el certificado. Revisa que $DOMAIN apunte a esta VPS y vuelve a ejecutar el instalador."
fi

sleep 1
if curl -fsS http://127.0.0.1:8080/healthz >/dev/null; then echo; echo "✔ FilmSpirit está funcionando."; else echo "✖ La app no responde: revisa  journalctl -u filmspirit -n 50"; fi
cat <<FIN

Siguientes pasos
  1. Completa tus claves:      sudo nano $ETC/filmspirit.env
     (GOOGLE_CLIENT_ID, ADMIN_EMAILS, datos de la empresa; Mercado Pago cuando lo tengas)
  2. Aplica los cambios:       sudo systemctl restart filmspirit
  3. Abre https://$DOMAIN
  Registros de la app:         journalctl -u filmspirit -f
  Respaldos:                   $DATA/respaldos   (manual: sudo systemctl start filmspirit-respaldo)
  Actualizar la app:           sube la carpeta «server» nueva y ejecuta  sudo bash deploy/actualizar.sh
FIN
