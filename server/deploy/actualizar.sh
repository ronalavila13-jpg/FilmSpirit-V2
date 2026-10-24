#!/usr/bin/env bash
# ============================================================
# FilmSpirit · actualizar la app en la VPS sin tocar los datos ni la configuración
# Uso (como root, desde la carpeta «server» nueva):   sudo bash deploy/actualizar.sh
# Antes de copiar hace un respaldo de la base de datos.
# ============================================================
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Ejecútalo como root (sudo)."; exit 1; fi
SRC="$(cd "$(dirname "$0")/.." && pwd)"
APP=/opt/filmspirit
[[ -f "$SRC/server.js" && -f "$SRC/public/app/index.html" ]] || { echo "No encuentro la app en $SRC."; exit 1; }
[[ -f "$SRC/tools/respaldo.js" ]] || { echo "Al paquete le falta tools/respaldo.js (el respaldo diario): no se actualiza."; exit 1; }
[[ -d "$APP" ]] || { echo "FilmSpirit no está instalado: usa deploy/instalar.sh"; exit 1; }
echo "▸ Respaldo previo"
if [[ -f "$APP/tools/respaldo.js" ]] && systemctl start filmspirit-respaldo 2>/dev/null; then echo "  hecho"; else echo "  ⚠ No se pudo respaldar antes (se sigue: la versión nueva trae el programa de respaldo)"; fi
echo "▸ Maniquíes 3D"
node "$SRC/tools/maniquies.js" "$SRC" "$APP" || { echo "✖ No se pudo revisar los maniquíes 3D: no se actualiza (la versión instalada sigue igual)."; exit 1; }
echo "▸ Copiando la versión nueva"
rsync -a --delete --exclude data --exclude test --exclude tools/token-prueba.js --exclude 'deploy/*.local' "$SRC"/ "$APP"/
chown -R root:root "$APP"; chmod -R a+rX "$APP"
echo "▸ Límites de nginx"
bash "$APP/deploy/nginx-limites.sh"
echo "▸ Reiniciando"
systemctl restart filmspirit
sleep 1
if curl -fsS http://127.0.0.1:8080/healthz >/dev/null; then echo "✔ Actualizado y funcionando."; else echo "✖ No responde: journalctl -u filmspirit -n 50"; exit 1; fi
echo "▸ Respaldo con la versión nueva"
if systemctl start filmspirit-respaldo 2>/dev/null; then echo "✔ Respaldo diario funcionando ($(ls -1t /var/lib/filmspirit/respaldos 2>/dev/null | head -1))"; else echo "⚠ El respaldo falló: journalctl -u filmspirit-respaldo -n 30"; fi
