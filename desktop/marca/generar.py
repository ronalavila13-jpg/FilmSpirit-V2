"""Genera todos los gráficos de la marca a partir del manual de marca 2026 (marca/manual-2026):
     python3 marca/generar.py        (desde la carpeta desktop)
   Necesita: pip install pillow fonttools brotli uharfbuzz cairosvg

   Manual de marca 2026: logotipo «FILMSPIRIT» en letras recortadas (FILM y SPIRIT) y la letra FilmSpirit Recorte
   para titulares (marca/recorte.py). Colores: rojo #CE0C1C, naranja #F49B1E, negro #212121, crema #FFFEF6.
   El ícono del manual («Frente al monolito») no se usa: donde va un ícono (programa, archivos de proyecto, pestaña del
   navegador, la barra en el celular) va el logotipo apilado en su placa roja cuadrada.

   Dentro del programa el logotipo va sin placa, que es el que entra en la barra superior al tamaño mínimo
   (120 px de ancho): FILM en negro (en blanco en el modo oscuro) y SPIRIT en naranja. La edición (Free, Indie,
   Pro, Studio) va aparte, chica y en gris, a 2x del logotipo (x = el grosor del asta de la i), como pide el manual.
   La placa roja horizontal (la versión principal) queda para Acerca de… y los usos externos.

   Salen:
     · ../src/marca.js                 el logotipo, el apilado y la placa dentro del programa y de la web
     · marca/svg/*.svg                 el logotipo sin placa, solo y con cada edición, y las placas roja y cuadrada
     · marca/icono.svg                 el ícono: el logotipo apilado en su placa roja cuadrada
     · marca/lamina.png                lámina con las versiones
     · marca/logo.png, logo-oscuro.png, logo-naranja.png   (emisor de licencias y usos externos)
     · marca/web/                      favicon.svg, favicon.ico, apple-touch-icon.png
     · build/icon.*, build/doc.*       íconos del programa y de los archivos de proyecto
     · build/bienvenida.bmp, build/encabezado.bmp          imágenes del instalador"""
import os, io, re, json
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from PIL import Image
import cairosvg

H = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(H, '..')
SRC = os.path.join(D, '..', 'src')
M = os.path.join(H, 'manual-2026')
ROJO, NARANJA, NEGRO, CREMA, BLANCO = '#CE0C1C', '#F49B1E', '#212121', '#FFFEF6', '#FFFFFF'
GRIS = '#62656B'          # la edición, sobre fondo claro
rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

def f2(v): return ('%.2f' % v).rstrip('0').rstrip('.')

# ---- los vectores del manual ----
def leer(rel):
    """(ancho, alto, contenido) de un SVG del manual, sin <svg> ni <title> y con los espacios justos"""
    t = open(os.path.join(M, rel), encoding='utf-8').read()
    vb = re.search(r'viewBox="([\d.\s-]+)"', t).group(1).split()
    body = t[t.index('>', t.index('<svg')) + 1:t.rindex('</svg>')]
    body = re.sub(r'<title>.*?</title>', '', body)
    body = re.sub(r'>\s+<', '><', body).strip()
    body = re.sub(r'\s*/>', '/>', body)
    return float(vb[2]), float(vb[3]), body

LW, LH, PALABRA = leer('1-logotipo/svg/filmspirit-horizontal-color.svg')      # FILM negro, SPIRIT naranja
X = 12.5                  # el grosor del asta de la i (184.31 a 196.88 en el dibujo): la unidad del aire
GAP = 2 * X               # el aire mínimo alrededor del logotipo sin placa
# FILM y SPIRIT con su clase, para que el modo oscuro pinte FILM en blanco
PALABRA_APP = PALABRA.replace('fill="#212121"', 'class="lg-f" fill="#212121"').replace('fill="#F49B1E"', 'class="lg-s" fill="#F49B1E"')
PW, PH, PLACA = leer('1-logotipo/svg/filmspirit-horizontal-roja.svg')          # la principal: placa roja
AW, AH, APILADA = leer('1-logotipo/svg/filmspirit-apilada-roja.svg')          # el cuadrado: hace de ícono

# ---- la edición: Archivo en negrita, en mayúsculas espaciadas, sobre la misma línea base ----
_af = os.path.join(D, 'node_modules', '@fontsource-variable', 'archivo', 'files', 'archivo-latin-wdth-normal.woff2')
_vf = TTFont(_af if os.path.exists(_af) else os.path.join(D, 'app', 'fonts', 'archivo-latin-wdth-normal.woff2'))
FONT = instancer.instantiateVariableFont(_vf, {'wght': 700, 'wdth': 100}, overlap=instancer.OverlapMode.REMOVE)
FONT.flavor = None
_b = io.BytesIO(); FONT.save(_b); FONT_BYTES = _b.getvalue()
UPM = FONT['head'].unitsPerEm
CAP = FONT['OS/2'].sCapHeight / UPM
GS = FONT.getGlyphSet()
HB_FONT = hb.Font(hb.Face(FONT_BYTES))
ED_CAP = .25 * LH         # alto de las mayúsculas de la edición: un cuarto del logotipo
ED_SIZE = ED_CAP / CAP
ED_TRACK = .08
ED_BASE = LH - .6         # la línea base de las letras recortadas

def shape(txt, size, track=0.0):
    buf = hb.Buffer(); buf.add_str(txt); buf.guess_segment_properties()
    hb.shape(HB_FONT, buf, {'kern': True, 'liga': False})
    k, x, out = size / UPM, 0.0, []
    n = len(buf.glyph_infos)
    for i, (gi, gp) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        out.append((FONT.getGlyphName(gi.codepoint), x + gp.x_offset * k, -gp.y_offset * k))
        x += gp.x_advance * k + (track * size if i < n - 1 else 0)
    return out, x

def text_path(txt, size, x0, base, track=0.0):
    glyphs, w = shape(txt, size, track)
    pen = SVGPathPen(GS, ntos=f2)
    k = size / UPM
    for name, gx, gy in glyphs:
        GS[name].draw(TransformPen(pen, (k, 0, 0, -k, x0 + gx, base + gy)))
    return pen.getCommands(), w

EDS = ['free', 'indie', 'pro', 'studio']
ED = {}
for e in EDS:
    d, w = text_path(e.upper(), ED_SIZE, LW + GAP, ED_BASE, ED_TRACK)
    ED[e] = {'w': round(LW + GAP + w, 2), 'd': d}

def svg(ed='', fondo=None, pad=0, film=NEGRO, edc=GRIS):
    """el logotipo sin placa (con su edición) como archivo SVG"""
    w = ED[ed]['w'] if ed else LW
    title = 'FilmSpirit' + (' ' + ed.capitalize() if ed else '')
    body = PALABRA.replace('fill="#212121"', f'fill="{film}"')
    extra = f'<path fill="{edc}" d="{ED[ed]["d"]}"/>' if ed else ''
    back = f'<rect x="{-pad}" y="{-pad}" width="{f2(w + 2 * pad)}" height="{f2(LH + 2 * pad)}" fill="{fondo}"/>' if fondo else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {f2(w + 2 * pad)} {f2(LH + 2 * pad)}" width="{f2(w + 2 * pad)}" '
            f'height="{f2(LH + 2 * pad)}" role="img" aria-label="{title}"><title>{title}</title>{back}{body}{extra}</svg>')

def svg_placa():
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f2(PW)} {f2(PH)}" width="{f2(PW)}" height="{f2(PH)}"><title>FilmSpirit</title>{PLACA}</svg>'

def svg_icono(size=512):
    """el ícono: el logotipo apilado en su placa roja cuadrada"""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f2(AW)} {f2(AH)}" width="{size}" height="{size}"><title>FilmSpirit</title>{APILADA}</svg>'

def png(svg_text, height=None, width=None):
    kw = {'output_height': height} if height else {'output_width': width}
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg_text.encode(), **kw))).convert('RGBA')

def icono(size):
    """el ícono a un tamaño (dibujado al cuádruple y reducido, para que las letras chicas queden nítidas). El manual pide
       48 px de ancho como mínimo para el apilado: en 16 y 32 px (la pestaña del navegador) se lee como la placa roja"""
    return png(svg_icono(), height=size * 4).resize((size, size), Image.LANCZOS)

def doc_svg():
    """ícono de los archivos de proyecto: una hoja con el logotipo apilado"""
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">'
            '<path d="M11 3H40L53 16V61H11Z" fill="#FFFFFF" stroke="#969CA6" stroke-width="1.6" stroke-linejoin="round"/>'
            '<path d="M40 3V16H53Z" fill="#E6E8EC" stroke="#969CA6" stroke-width="1.6" stroke-linejoin="round"/>'
            f'<svg x="16" y="24" width="32" height="32" viewBox="0 0 {f2(AW)} {f2(AH)}">{APILADA}</svg></svg>')

def favicons():
    """pestaña del navegador (web): el logotipo apilado en su placa cuadrada"""
    out = os.path.join(H, 'web'); os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'favicon.svg'), 'w', encoding='utf-8').write(svg_icono(64))
    ico = {s: icono(s) for s in (16, 32, 48)}
    ico[48].save(os.path.join(out, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)], append_images=[ico[16], ico[32]])
    icono(180).convert('RGB').save(os.path.join(out, 'apple-touch-icon.png'))   # iOS redondea solo

if __name__ == '__main__':
    open(os.path.join(H, 'icono.svg'), 'w', encoding='utf-8').write(svg_icono())
    B = os.path.join(D, 'build')
    SIZES = [16, 20, 24, 32, 40, 48, 64, 128, 256]
    icons = {s: icono(s) for s in SIZES}
    icons[256].save(os.path.join(B, 'icon-256.png'))
    icono(512).save(os.path.join(B, 'icon.png'))
    icons[256].save(os.path.join(B, 'icon.ico'), sizes=[(s, s) for s in SIZES], append_images=[icons[s] for s in SIZES if s != 256])
    favicons()
    docs = {s: png(doc_svg(), height=s) for s in SIZES}
    docs[256].save(os.path.join(B, 'doc.png'))
    docs[256].save(os.path.join(B, 'doc.ico'), sizes=[(s, s) for s in SIZES], append_images=[docs[s] for s in SIZES if s != 256])

    # ---- logotipo en SVG: sin edición y las cuatro ediciones ----
    sd = os.path.join(H, 'svg'); os.makedirs(sd, exist_ok=True)
    for f in os.listdir(sd):
        if f.endswith('.svg'): os.remove(os.path.join(sd, f))
    for e in [''] + EDS:
        open(os.path.join(sd, 'filmspirit' + ('-' + e if e else '') + '.svg'), 'w', encoding='utf-8').write(svg(e))
    open(os.path.join(sd, 'filmspirit-placa-roja.svg'), 'w', encoding='utf-8').write(svg_placa())
    open(os.path.join(sd, 'filmspirit-apilada-roja.svg'), 'w', encoding='utf-8').write(svg_icono(256))
    # PNG sin fondo (emisor de licencias y usos externos), con el aire de 2x alrededor
    png(svg('', pad=GAP), 200).save(os.path.join(H, 'logo.png'))
    png(svg('', pad=GAP, film=BLANCO), 200).save(os.path.join(H, 'logo-oscuro.png'))
    png(svg_placa(), 200).save(os.path.join(H, 'logo-naranja.png'))      # sobre fondos de color: la placa roja
    # lámina: el logotipo con cada edición sobre blanco y sobre negro, la placa y el ícono
    rows = [[png(svg(e, fondo=f, pad=GAP, film=BLANCO if f == NEGRO else NEGRO, edc='#A8A8A8' if f == NEGRO else GRIS), 120).convert('RGB')
             for e in [''] + EDS] for f in (BLANCO, NEGRO)]
    rows.append([png(svg_placa(), 160).convert('RGB'), icono(160).convert('RGB'), icono(48).convert('RGB'), icono(32).convert('RGB'), icono(16).convert('RGB')])
    lw = max(sum(i.width for i in r) + 20 * (len(r) - 1) for r in rows) + 80
    lh = sum(max(i.height for i in r) for r in rows) + 20 * (len(rows) - 1) + 80
    lam = Image.new('RGB', (lw, lh), (247, 247, 247))
    y = 40
    for r in rows:
        x = 40
        for i in r: lam.paste(i, (x, y)); x += i.width + 20
        y += max(i.height for i in r) + 20
    lam.save(os.path.join(H, 'lamina.png'))

    # ---- imágenes del instalador (NSIS): bienvenida 164×314 y encabezado 150×57, al doble ----
    w, h = 328, 628
    im = Image.new('RGBA', (w, h), rgb(NEGRO) + (255,))
    t = icono(200); im.alpha_composite(t, ((w - t.width) // 2, (h - t.height) // 2 - 40))
    im.convert('RGB').save(os.path.join(B, 'bienvenida.bmp'))
    w, h = 300, 114
    im = Image.new('RGBA', (w, h), (255, 255, 255, 255))
    lo = png(svg(''), width=w - 100); im.alpha_composite(lo, ((w - lo.width) // 2, (h - lo.height) // 2))
    im.convert('RGB').save(os.path.join(B, 'encabezado.bmp'))

    # ---- el logotipo dentro del programa y de la web ----
    data = {'w': LW, 'h': LH, 'svg': PALABRA_APP, 'ed': ED,
            'placa': {'w': PW, 'h': PH, 'svg': PLACA}, 'mark': {'w': AW, 'h': AH, 'svg': APILADA}}
    js = f'''/* ============================================================
   MARCA · logotipo FilmSpirit en vector (manual de marca 2026)
   Generado por desktop/marca/generar.py a partir de desktop/marca/manual-2026: no editar a mano.
   Sin placa: FILM negro (clase lg-f, blanca en el modo oscuro) y SPIRIT naranja (lg-s). La edición (Free, Indie,
   Pro, Studio) va aparte, chica y gris (lg-e), a 2x del logotipo. La placa roja es la versión principal; el apilado
   en su placa cuadrada hace de ícono.
   ============================================================ */
const MARCA = {json.dumps(data, ensure_ascii=False)};
/* logotipo sin placa, con la edición (free | indie | pro | studio | nada); cls = clases extra del <svg> */
function logoSVG(edition, cls = '') {{
  const k = edition && MARCA.ed[edition] ? edition : '', e = k && MARCA.ed[k];
  const label = 'FilmSpirit' + (k ? ' ' + k[0].toUpperCase() + k.slice(1) : '');
  return `<svg class="logo ${{cls}}${{k ? ' lg-' + k : ''}}" viewBox="0 0 ${{e ? e.w : MARCA.w}} ${{MARCA.h}}" role="img" aria-label="${{label}}"><title>${{label}}</title>${{MARCA.svg}}${{e ? `<path class="lg-e" fill="{GRIS}" d="${{e.d}}"/>` : ''}}</svg>`;
}}
/* la placa roja, la versión principal del logotipo */
function plateSVG(cls = '') {{
  return `<svg class="logo-plate ${{cls}}" viewBox="0 0 ${{MARCA.placa.w}} ${{MARCA.placa.h}}" role="img" aria-label="FilmSpirit"><title>FilmSpirit</title>${{MARCA.placa.svg}}</svg>`;
}}
/* el logotipo apilado en su placa roja cuadrada (hace de ícono), para la barra en pantallas angostas */
function markSVG(cls = '') {{
  return `<svg class="logo-mark ${{cls}}" viewBox="0 0 ${{MARCA.mark.w}} ${{MARCA.mark.h}}" aria-hidden="true">${{MARCA.mark.svg}}</svg>`;
}}
'''
    open(os.path.join(SRC, 'marca.js'), 'w', encoding='utf-8').write(js)
    print('marca: logotipo', LW, '×', LH, '· ediciones', {e: ED[e]['w'] for e in ED}, '· íconos', SIZES, '· src/marca.js', len(js), 'bytes')
