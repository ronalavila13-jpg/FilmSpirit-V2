#!/usr/bin/env python3
"""Las otras letras de la app (Apariencia › Tu pantalla › Letra): arma sus archivos desde Google Fonts (OFL).

  python3 tools/fuentes.py [carpeta-de-descargas]

Necesita fontTools y brotli (pip install fonttools brotli). Baja los TTF variables de github.com/google/fonts (una vez:
quedan en la carpeta de descargas) y escribe:
  - desktop/fuentes/<letra>-latin-wght-normal.woff2 y -latin-ext-… (escritorio y web con cuentas: los copia
    desktop/make.js), con el peso variable de 400 a 700 y su licencia <letra>-OFL.txt;
  - src/pdf-fuente-x.js: cada letra en regular y negrita, solo con los caracteres que dejan pasar los PDF (pdfSafe:
    hasta U+00FF), sin «hinting», en base64 para jsPDF.
En la página publicada las letras vienen de Google Fonts (FONT_URL en src/leyenda.js).
"""
import base64, io, pathlib, sys, urllib.request
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / '.fuentes-descargas')
GF = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'
# clave del PDF, carpeta en google/fonts, archivo, nombre de archivo nuestro, ejes fijos, opsz del PDF
LETRAS = [
    ('newsreader', 'newsreader', 'Newsreader[opsz,wght].ttf', 'newsreader', {}, 12),
    ('instrument', 'instrumentsans', 'InstrumentSans[wdth,wght].ttf', 'instrument-sans', {'wdth': 100}, None),
    ('narrow', 'archivonarrow', 'ArchivoNarrow[wght].ttf', 'archivo-narrow', {}, None),
    ('bricolage', 'bricolagegrotesque', 'BricolageGrotesque[opsz,wdth,wght].ttf', 'bricolage-grotesque', {'wdth': 100}, 14),
    ('rubik', 'rubik', 'Rubik[wght].ttf', 'rubik', {}, None),
    ('shantell', 'shantellsans', 'ShantellSans[BNCE,INFM,SPAC,wght].ttf', 'shantell-sans', {'BNCE': 0, 'INFM': 0, 'SPAC': 0}, None),
]
# los mismos rangos que desktop/make.js (latin y latin-ext)
LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'


def codes(r):
    out = []
    for p in r.split(','):
        p = p.strip()[2:]
        a, _, b = p.partition('-')
        out += list(range(int(a, 16), int(b or a, 16) + 1))
    return out


def bajar(carpeta, archivo):
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / archivo
    if not f.exists():
        url = GF + carpeta + '/' + urllib.parse.quote(archivo)
        print('bajando', url)
        f.write_bytes(urllib.request.urlopen(url).read())
    return f


def recortar(font, unicodes, woff2):
    # (guardar y volver a abrir: después de fijar los ejes, las tablas perezosas de fontTools no se dejan recortar)
    b0 = io.BytesIO(); font.save(b0); b0.seek(0); font = TTFont(b0)
    o = subset.Options()
    o.layout_features = ['*'] if woff2 else []; o.name_IDs = ['*'] if woff2 else [1, 2, 3, 4, 6]; o.notdef_outline = True; o.hinting = False
    if not woff2: o.drop_tables += ['GSUB', 'GPOS', 'GDEF', 'STAT', 'HVAR', 'MVAR', 'meta']   # jsPDF no usa sustituciones ni posiciones
    o.flavor = 'woff2' if woff2 else None
    s = subset.Subsetter(o); s.populate(unicodes=unicodes); s.subset(font)
    b = io.BytesIO(); font.flavor = o.flavor; font.save(b); return b.getvalue()


def main():
    import urllib.parse  # noqa: F401  (para bajar)
    fx = []
    for clave, carpeta, archivo, nombre, fijos, opsz in LETRAS:
        src = bajar(carpeta, archivo)
        lic = CACHE / f'{carpeta}-OFL.txt'
        if not lic.exists():
            lic.write_bytes(urllib.request.urlopen(GF + carpeta + '/OFL.txt').read())
        (ROOT / 'desktop' / 'fuentes' / f'{nombre}-OFL.txt').write_bytes(lic.read_bytes())
        # pantalla: variable de 400 a 700 (lo demás fijo), en dos partes como las de fontsource
        for sub, rango in (('latin', LAT), ('latin-ext', EXT)):
            f = TTFont(src)
            lim = {**fijos, 'wght': (400, 700)}
            f = instancer.instantiateVariableFont(f, lim)
            data = recortar(f, codes(rango), True)
            (ROOT / 'desktop' / 'fuentes' / f'{nombre}-{sub}-wght-normal.woff2').write_bytes(data)
            print(f'{nombre}-{sub}: {len(data) // 1024} KB')
        # PDF: regular y negrita estáticas
        pesos = {}
        for st, w in (('normal', 400), ('bold', 700)):
            f = TTFont(src)
            lim = {**fijos, 'wght': w}
            if opsz: lim['opsz'] = opsz
            for a in f['fvar'].axes:
                if a.axisTag not in lim: lim[a.axisTag] = a.defaultValue
            f = instancer.instantiateVariableFont(f, lim)
            pesos[st] = base64.b64encode(recortar(f, list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)), False)).decode()
        fx.append(f"  {clave}: {{ normal: '{pesos['normal']}', bold: '{pesos['bold']}' }},")
        print(f'PDF {clave}: {len(pesos["normal"]) * 3 // 4 // 1024} + {len(pesos["bold"]) * 3 // 4 // 1024} KB')
    js = ROOT / 'src' / 'pdf-fuente-x.js'
    viejo = js.read_text()
    funcion = viejo[viejo.index('/* la letra elegida en este documento'):]
    js.write_text('''/* ============================================================
   PDF · las otras letras de la app (Apariencia › Tu pantalla › Letra): Newsreader, Instrument Sans, Archivo Narrow,
   Bricolage Grotesque, Rubik y Shantell Sans (SIL Open Font License 1.1), regular y negrita, solo con los caracteres
   latinos que dejan pasar los PDF (pdfSafe) y sin «hinting». Se incrustan solo si se eligió esa letra.
   Lo arma tools/fuentes.py (no editar a mano).
   ============================================================ */
const PDF_FONTS_X = {
''' + '\n'.join(fx) + '\n};\n' + funcion)
    print('listo')


if __name__ == '__main__':
    main()
