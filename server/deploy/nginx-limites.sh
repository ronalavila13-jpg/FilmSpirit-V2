#!/usr/bin/env bash
# ============================================================
# FilmSpirit · límites de nginx (cuántas solicitudes y conexiones por IP antes de llegar a la app)
# Uso (como root):   sudo bash deploy/nginx-limites.sh
# Lo llaman instalar.sh y actualizar.sh; se puede volver a ejecutar sin romper nada. Si nginx no acepta la
# configuración, se deja como estaba y nginx sigue funcionando.
# ============================================================
set -uo pipefail
if [[ $EUID -ne 0 ]]; then echo "Ejecútalo como root (sudo)."; exit 1; fi
SRC="$(cd "$(dirname "$0")" && pwd)/nginx-limites.conf"
CONF=/etc/nginx/conf.d/filmspirit-limites.conf
if [[ ! -d /etc/nginx/conf.d ]] || ! command -v nginx >/dev/null; then echo "  nginx no está instalado: se omiten los límites."; exit 0; fi
OLD="$(mktemp)"; HAD=0
if [[ -f "$CONF" ]]; then cp "$CONF" "$OLD"; HAD=1; fi
install -m 644 "$SRC" "$CONF"
if nginx -t >/dev/null 2>&1; then
  systemctl reload nginx 2>/dev/null || true
  echo "  ✔ Límites de nginx al día ($CONF)."
else
  if [[ $HAD == 1 ]]; then cp "$OLD" "$CONF"; else rm -f "$CONF"; fi
  nginx -t >/dev/null 2>&1 && { systemctl reload nginx 2>/dev/null || true; }
  echo "  ⚠ nginx no aceptó los límites: se dejaron como estaban. Para ver por qué: sudo nginx -t"
fi
rm -f "$OLD"
