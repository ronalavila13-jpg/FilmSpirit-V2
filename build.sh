#!/bin/sh
# Uso: ./build.sh            → dist/filmspirit.html (web, librerías por CDN; es la que se publica
#                              como página interactiva en Claude. «./build.sh artefacto» hace lo mismo)
#      ./build.sh desktop    → desktop/app/index.html (escritorio, todo local)
#      ./build.sh server     → server/public/app/index.html (web app con cuentas en la VPS;
#                              librerías locales; node server/make.js copia librerías y fuentes)
# El logotipo va dentro del código (src/marca.js, generado por desktop/marca/generar.py).
set -e
cd "$(dirname "$0")"
TARGET=${1:-web}
# los maniquíes 3D (src/s3d-figuras-datos.js, unos 3 MB) no van en git: sin ellos la app solo dibuja el maniquí simple,
# sin cuerpo, pelo ni ropa. Se arman con fig3d/maniqui.py o se sacan de una versión del servidor con tools/maniquies.py
if [ -z "$FS_SIN_MANIQUIES" ] && [ "$(wc -c < src/s3d-figuras-datos.js 2>/dev/null || echo 0)" -lt 1000000 ]; then
  echo "Faltan los maniquíes 3D (src/s3d-figuras-datos.js). Ver tools/maniquies.py. Para compilar igual: FS_SIN_MANIQUIES=1 sh build.sh $TARGET" >&2
  exit 1
fi
if [ "$TARGET" = desktop ]; then
  OUT=desktop/app/index.html
  mkdir -p desktop/app
elif [ "$TARGET" = server ]; then
  OUT=server/public/app/index.html
  mkdir -p server/public/app
else
  TARGET=web
  OUT=dist/filmspirit.html
  mkdir -p dist
fi
{
  if [ "$TARGET" = desktop ]; then
    echo '<!doctype html>'
    echo '<html lang="es">'
    echo '<meta charset="utf-8">'
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">'
    echo "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; object-src 'none'; base-uri 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data: blob:; worker-src 'self' blob:; form-action 'none'; frame-src 'none'\">"
    echo '<link rel="stylesheet" href="fonts/fonts.css">'
    sed -e '/fonts.googleapis.com/d' -e '/fonts.gstatic.com/d' src/shell.html
    echo '<script src="lib/three.min.js"></script>'
  elif [ "$TARGET" = server ]; then
    # la política de seguridad (CSP) la envía el servidor en cada respuesta
    echo '<!doctype html>'
    echo '<html lang="es">'
    echo '<meta charset="utf-8">'
    echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
    echo '<meta name="theme-color" content="#F2F3F5">'
    echo '<link rel="icon" href="/favicon.ico" sizes="32x32">'
    echo '<link rel="icon" href="/favicon.svg" type="image/svg+xml">'
    echo '<link rel="apple-touch-icon" href="/apple-touch-icon.png">'
    echo '<link rel="stylesheet" href="fonts/fonts.css">'
    sed -e '/fonts.googleapis.com/d' -e '/fonts.gstatic.com/d' src/shell.html
    echo '<script src="lib/three.min.js"></script>'
  else
    cat src/shell.html
    echo '<script src="https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.min.js"></script>'
  fi
  echo '<script>'
  echo "'use strict';"
  # para qué versión es: web (la página publicada en Claude), server (la web con cuentas) o desktop (share.js · API)
  echo "const TARGET = '$TARGET';"
  # versión del dibujo de viñetas: si cambia el código que dibuja la escena, las viñetas guardadas en el navegador se rehacen
  echo "const THV = '$(cat src/s3d-*.js src/expresiones.js src/floorplan.js src/s2d-editor.js src/charphoto.js | sha1sum | cut -c1-10)';"
  # el diccionario del inglés (i18n/en.json y el glosario): lo usa i18n.js, que va primero
  if [ -f i18n/en.json ]; then node i18n/hacer.js; else echo 'const I18N_EN = { x: {}, p: [], f: {} };'; fi
  FILES="i18n core areas marca recorte-fuente iconos sample ui imagenes ventanas cabecera pestanas proyectos importar arranque historial barra leyenda arrastre tab-script fecha guion-editor guion-revision guion-formato guion-cierre guion-margen guion-anotar guion-racha tab-project tab-breakdown tab-board s3d-model s3d-figs expresiones s3d-figuras-datos s3d-figuras s3d-render s3d-luz s3d-entornos s3d-accesorios s3d-vehiculos s3d-cabinas s3d-animales s3d-objetos s3d-interiores s3d-vestuario s3d-pelo s3d-gente s3d-plan glb-lib modelos personajes-3d escenarios-3d planta-general floorplan charphoto shot-editor s2d-editor ficha tab-animatic tab-plan plan-dood tab-cal cal-meses tab-call tab-budget tab-gastos tab-sup sup-partes xlsx pdf-fuente pdf-fuente-x pdf pdf-rango laminas tab-build tab-scout tab-casting archivo notas inicio series"
  # equipo: en escritorio viaja por la carpeta compartida; en la web, por la base de datos de la página
  if [ "$TARGET" = desktop ]; then FILES="$FILES desktop share"; elif [ "$TARGET" = server ]; then FILES="$FILES share share-api cuenta planes"; else FILES="$FILES share share-web"; fi
  for f in $FILES; do
    # en el servidor los maniquíes 3D van en archivos aparte (se descargan solo cuando se usan)
    if [ "$TARGET" = server ] && [ "$f" = s3d-figuras-datos ]; then node server/tools/figuras.js src/s3d-figuras-datos.js server/public/app/fig; else cat src/$f.js; fi
    echo
  done
  echo 'boot();'
  echo '</script>'
} > $OUT.tmp
mv $OUT.tmp $OUT
if [ "$TARGET" = desktop ] || [ "$TARGET" = server ]; then
  # en escritorio y en el servidor el código va en app.js (archivo aparte, no en línea)
  python3 - "$OUT" <<'PY'
import sys
p=sys.argv[1]; h=open(p).read()
head,rest=h.split("<script>\n",1)
js,tail=rest.rsplit("</script>",1)
open(p.replace('index.html','app.js'),'w').write(js)
open(p,'w').write(head+'<script src="app.js"></script>'+tail)
PY
fi
# código compacto: sin espacios ni comentarios (los nombres se conservan). FS_NOMIN=1 lo deja legible para depurar.
# El generador de PDF (jsPDF) ya no va aquí: se carga al exportar (pdf.js · loadPdfLib).
if [ -z "$FS_NOMIN" ] && [ -d node_modules/esbuild ]; then
  python3 - "$OUT" <<'PY'
import sys, subprocess
p = sys.argv[1]
esb = ['node', 'tools/compactar.js']
def mini(js):
    try:
        return subprocess.run(esb, input=js, capture_output=True, text=True, encoding='utf-8', check=True).stdout
    except Exception as e:
        print('aviso: no se compactó el código (' + str(e)[:120] + ')')
        return js
if p.endswith('index.html'):
    a = p.replace('index.html', 'app.js')
    js = open(a, encoding='utf-8').read()
    open(a, 'w', encoding='utf-8').write(mini(js))
else:
    h = open(p, encoding='utf-8').read()
    head, rest = h.split("<script>\n", 1)
    js, tail = rest.rsplit("</script>", 1)
    open(p, 'w', encoding='utf-8').write(head + "<script>\n" + mini(js) + "</script>" + tail)
PY
fi
# comprobar sintaxis del script embebido
CHK="${TMPDIR:-/tmp}/filmspirit-chk-$$.js"
python3 - "$OUT" "$CHK" <<'PY'
import re,sys,os
p=sys.argv[1]; h=open(p).read()
js=open(p.replace('index.html','app.js')).read() if p.endswith('index.html') else h.split("<script>\n",1)[1].rsplit("</script>",1)[0]
open(sys.argv[2],'w').write(js)
PY
node --check "$CHK" && echo "sintaxis ok" && wc -c $OUT; rm -f "$CHK"
