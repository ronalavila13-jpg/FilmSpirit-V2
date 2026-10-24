"""FilmSpirit Recorte: corrige la G (y la g, que es el mismo dibujo), suma los acentos del francés, el italiano y el
   portugués, y escribe la versión 2.002.
     python3 marca/recorte.py        (desde la carpeta desktop)
   Lee marca/manual-2026/3-tipografia/*-Regular.{ttf,otf} (la 2.000 del manual de marca) y escribe la 2.002 en
   marca/recorte/ (TTF, OTF y WOFF2) y src/recorte-fuente.js (la WOFF2 en base64, para la app).

   La falla: el travesaño de la G se metía 42 unidades en el hueco y su punta bajaba en curva, así que el hueco quedaba
   en una ranura de 32 unidades y la punta se veía como un gancho suelto (un «1» dentro de la G). Ahora el travesaño
   asoma lo justo, con el borde de abajo recto y las esquinas chicas como las del resto de las letras.

   Los acentos (2.002): la 2.000 traía Á É Í Ó Ú Ü Ñ y la í minúscula. Para que los titulares de la portada salgan
   enteros en los cinco idiomas se suman À È Ì Ò Ù, Â Ê Î Ô Û, Ã Õ, Ä Ë Ï Ö, Ç y sus minúsculas (en esta letra, las
   minúsculas son las mismas mayúsculas, salvo la i). Se arman con los trazos de la propia letra: el grave es el agudo
   de esa vocal al revés; el circunflejo, el agudo y el grave juntos; la tilde de la ñ angostada para la ã y la õ; los
   puntos de la Ü; y la cedilla, la coma de la letra más chica, pegada al pie de la C."""
import os, io, base64
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.cu2quPen import Cu2QuPen
import pathops

H = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(H, 'manual-2026', '3-tipografia')
OUT = os.path.join(H, 'recorte')
APP = os.path.join(H, '..', '..', 'src', 'recorte-fuente.js')
VERSION = 2.002
SPUR = 30      # cuánto asoma el travesaño a la izquierda del asta (antes, 42 y con la punta curva)

def g_nueva(rec, spur=SPUR):
    """el contorno de la G con el travesaño corregido: se reemplaza el tramo entre el asta interior derecha (197,95)
       y el borde de arriba del travesaño (274,338)"""
    v = list(rec.value)
    i0 = next(i for i, (op, pts) in enumerate(v) if op == 'qCurveTo' and tuple(map(round, pts[-1])) == (197, 95))
    i1 = next(i for i, (op, pts) in enumerate(v) if op == 'lineTo' and tuple(map(round, pts[-1])) == (274, 338))
    x = 196 - spur        # la punta del travesaño
    nuevo = [
        ('lineTo', ((196, 244),)),                 # el asta sube derecho hasta debajo del travesaño
        ('qCurveTo', ((196, 251), (189, 251))),    # rincón chico
        ('lineTo', ((x + 7, 251),)),               # el borde de abajo, recto
        ('qCurveTo', ((x, 251), (x, 258))),
        ('lineTo', ((x - 1, 334),)),               # la punta (con la leve inclinación de las demás astas)
        ('qCurveTo', ((x - 1, 341), (x + 6, 341))),
    ]
    return v[:i0 + 1] + nuevo + v[i1:]

# ---------- acentos ----------
def contornos(gs, name):
    """los contornos de un glifo, cada uno como su lista de trazos"""
    rp = RecordingPen(); gs[name].draw(rp)
    out, cur = [], []
    for op, pts in rp.value:
        cur.append((op, pts))
        if op in ('closePath', 'endPath'): out.append(cur); cur = []
    return out

def caja(ops):
    bp = BoundsPen(None); draw(ops, bp); return bp.bounds

def mover(ops, m, invertir=False):
    """transforma un contorno (m = a, b, c, d, dx, dy); al reflejarlo se invierte su sentido para que siga lleno"""
    rp = RecordingPen()
    tp = TransformPen(ReverseContourPen(rp) if invertir else rp, m)
    draw(ops, tp)
    return rp.value

def unir(*partes):
    """une contornos que se tocan en uno solo (skia-pathops) y lo devuelve en cuadráticas"""
    path = pathops.Path()
    for ops in partes: draw(ops, path.getPen())
    path.simplify(fix_winding=True)
    rp = RecordingPen(); path.draw(Cu2QuPen(rp, 1.0, reverse_direction=False))
    return rp.value

def grave(agudo):
    x0, _, x1, _ = caja(agudo)
    return mover(agudo, (-1, 0, 0, 1, x0 + x1, 0), True)

def circunflejo(agudo, esc=.74):
    """el agudo (sube a la derecha) y el grave (baja a la derecha), más chicos, unidos en la punta"""
    x0, y0, x1, y1 = caja(agudo); cx = (x0 + x1) / 2; w = (x1 - x0) * esc
    a = mover(agudo, (esc, 0, 0, esc, cx - x0 * esc - w + w * .12, y0 - y0 * esc))
    g = grave(mover(agudo, (esc, 0, 0, esc, cx - x0 * esc - w * .12, y0 - y0 * esc)))
    return unir(a, g)

def poner(ops, cx, y0, sx=1, sy=1):
    """un acento con su centro en cx y su pie en y0"""
    x0, b0, x1, _ = caja(ops)
    return mover(ops, (sx, 0, 0, sy, cx - (x0 + x1) / 2 * sx, y0 - b0 * sy))

def acentos(gs):
    """los glifos nuevos: nombre -> (trazos, glifo del que toma el ancho)"""
    sobre = lambda c: caja(c)[1] > 560     # un acento: todo arriba del cuerpo de la letra
    tilde = [c for c in contornos(gs, 'Ntilde') if sobre(c)][0]
    puntos = [c for c in contornos(gs, 'Udieresis') if sobre(c)]
    coma = max(contornos(gs, 'comma'), key=lambda c: caja(c)[3] - caja(c)[1])
    nuevos = {}
    for V, agudo_de in (('A', 'Aacute'), ('E', 'Eacute'), ('I', 'Iacute'), ('O', 'Oacute'), ('U', 'Uacute')):
        cs = contornos(gs, agudo_de)
        cuerpo = [c for c in cs if not sobre(c)]; agudo = [c for c in cs if sobre(c)][0]
        x0, y0, x1, _ = caja(agudo); cx = (x0 + x1) / 2
        nuevos[V + 'grave'] = (sum(cuerpo, []) + grave(agudo), agudo_de)
        nuevos[V + 'circumflex'] = (sum(cuerpo, []) + circunflejo(agudo, .7 if V == 'I' else .86), agudo_de)
        nuevos[V + 'dieresis'] = (sum(cuerpo, []) + poner(sum(puntos, []), cx, y0 + 8), agudo_de)
        if V in 'AO':
            nuevos[V + 'tilde'] = (sum(cuerpo, []) + poner(tilde, cx, y0 + 4, .62, .74), agudo_de)
    nuevos.pop('Udieresis')        # ya existe
    # la i minúscula: el asta de la í con el acento nuevo
    cs = contornos(gs, 'iacute'); asta = [c for c in cs if caja(c)[3] < 560]; agudo = [c for c in cs if caja(c)[3] >= 560][0]
    x0, y0, x1, _ = caja(agudo); cx = (x0 + x1) / 2
    nuevos['igrave'] = (sum(asta, []) + grave(agudo), 'iacute')
    nuevos['icircumflex'] = (sum(asta, []) + circunflejo(agudo, .7), 'iacute')
    nuevos['idieresis'] = (sum(asta, []) + poner(sum(puntos, []), cx, y0 + 4, .86, .86), 'iacute')
    # la cedilla: la coma, más chica, pegada al pie de la C
    c = contornos(gs, 'C'); cx = sum(caja(sum(c, []))[0::2]) / 2
    nuevos['Ccedilla'] = (unir(sum(c, []), poner(coma, cx - 6, -150, .72, .72)), 'C')
    return nuevos

# letras: mayúscula y minúscula de cada glifo nuevo (la i minúscula tiene los suyos)
LETRAS = {'Agrave': 'Àà', 'Acircumflex': 'Ââ', 'Atilde': 'Ãã', 'Adieresis': 'Ää', 'Egrave': 'Èè', 'Ecircumflex': 'Êê',
          'Edieresis': 'Ëë', 'Igrave': 'Ì', 'Icircumflex': 'Î', 'Idieresis': 'Ï', 'igrave': 'ì', 'icircumflex': 'î',
          'idieresis': 'ï', 'Ograve': 'Òò', 'Ocircumflex': 'Ôô', 'Otilde': 'Õõ', 'Odieresis': 'Öö', 'Ugrave': 'Ùù',
          'Ucircumflex': 'Ûû', 'Ccedilla': 'Çç'}

def mapear(f, nombres):
    for t in f['cmap'].tables:
        if t.isUnicode():
            for n in nombres:
                for ch in LETRAS[n]: t.cmap[ord(ch)] = n

def sumar_ttf(f, nuevos):
    gs = f.getGlyphSet(); order = list(f.getGlyphOrder()); glyf = f['glyf']
    f.setGlyphOrder(order + [n for n in nuevos if n not in order])
    for n, (ops, ancho_de) in nuevos.items():
        p = TTGlyphPen(gs); draw(ops, p); glyf[n] = p.glyph(); glyf[n].recalcBounds(glyf)
        f['hmtx'][n] = (f['hmtx'][ancho_de][0], glyf[n].xMin)
    mapear(f, nuevos)

def sumar_otf(f, nuevos):
    cff = f['CFF '].cff; top = cff.topDictIndex[0]; cs = top.CharStrings; pv = top.Private
    order = list(f.getGlyphOrder())
    for n, (ops, ancho_de) in nuevos.items():
        adv = f['hmtx'][ancho_de][0]
        wd = None if adv == getattr(pv, 'defaultWidthX', 0) else adv - getattr(pv, 'nominalWidthX', 0)
        pen = T2CharStringPen(wd, None); draw(ops, pen)
        c = pen.getCharString(private=pv, globalSubrs=cff.GlobalSubrs)
        cs.charStringsIndex.append(c); cs.charStrings[n] = len(cs.charStringsIndex) - 1
        top.charset.append(n)
        x0 = caja(ops)[0]
        f['hmtx'][n] = (adv, int(round(x0)))
    f.setGlyphOrder(order + [n for n in nuevos if n not in order])
    mapear(f, nuevos)

def draw(ops, pen):
    for op, pts in ops:
        getattr(pen, op)(*pts)

def version(f):
    f['head'].fontRevision = VERSION
    for r in f['name'].names:
        if r.nameID == 5: r.string = 'Version %.3f' % VERSION
        if r.nameID == 3: r.string = str(r.toUnicode()).replace('2.000', '%.3f' % VERSION)

def main():
    os.makedirs(OUT, exist_ok=True)
    ttf = TTFont(os.path.join(SRC, 'FilmSpiritRecorte-Regular.ttf'))
    gs = ttf.getGlyphSet(); rec = RecordingPen(); gs['G'].draw(rec)
    ops = g_nueva(rec)
    # TrueType (curvas cuadráticas): el mismo contorno
    p = TTGlyphPen(gs); draw(ops, p); ttf['glyf']['G'] = p.glyph()
    ttf['glyf']['G'].recalcBounds(ttf['glyf'])
    nuevos = acentos(ttf.getGlyphSet())
    sumar_ttf(ttf, nuevos)
    version(ttf)
    ttf.save(os.path.join(OUT, 'FilmSpiritRecorte-Regular.ttf'))
    w = TTFont(os.path.join(OUT, 'FilmSpiritRecorte-Regular.ttf')); w.flavor = 'woff2'
    w.save(os.path.join(OUT, 'FilmSpiritRecorte-Regular.woff2'))
    # OpenType CFF (cúbicas): las cuadráticas pasan exactas a cúbicas
    otf = TTFont(os.path.join(SRC, 'FilmSpiritRecorte-Regular.otf'))
    cff = otf['CFF '].cff; top = cff.topDictIndex[0]; cs = top.CharStrings
    old = cs['G']
    adv = otf['hmtx']['G'][0]
    pv = old.private   # el ancho va en la cadena solo si no es el de omisión, y relativo al nominal
    wd = None if adv == getattr(pv, 'defaultWidthX', 0) else adv - getattr(pv, 'nominalWidthX', 0)
    pen = T2CharStringPen(wd, None); draw(ops, pen)
    cs['G'] = pen.getCharString(private=pv, globalSubrs=old.globalSubrs)
    sumar_otf(otf, nuevos)
    version(otf)
    if hasattr(top, 'version'): top.version = '%.3f' % VERSION
    otf.save(os.path.join(OUT, 'FilmSpiritRecorte-Regular.otf'))
    b = open(os.path.join(OUT, 'FilmSpiritRecorte-Regular.woff2'), 'rb').read()
    js = ('/* FilmSpirit Recorte %.3f (WOFF2): la letra de los titulares de la marca. Generado por desktop/marca/recorte.py:\n'
          '   no editar a mano. Solo para titulares en mayúsculas desde 32 px (manual de marca 2026); se escribe en\n'
          '   minúsculas (text-transform: lowercase), que en esta letra son mayúsculas con la i con el punto del logo. */\n'
          'const RECORTE_WOFF2 = \'%s\';\n'
          '/* se registra al abrir la app, sin pedir nada a internet: la letra va aquí mismo */\n'
          '(function () {\n'
          '  try {\n'
          '    if (typeof FontFace === \'undefined\' || typeof document === \'undefined\' || !document.fonts) return;\n'
          '    const b = Uint8Array.from(atob(RECORTE_WOFF2), c => c.charCodeAt(0));\n'
          '    const f = new FontFace(\'FilmSpirit Recorte\', b.buffer);\n'
          '    document.fonts.add(f);\n'
          '    f.loaded.then(() => document.documentElement.classList.add(\'fs-recorte\'), () => {});\n'
          '  } catch (e) { /* sin la letra, los titulares salen con la de títulos */ }\n'
          '})();\n') % (VERSION, base64.b64encode(b).decode())
    open(APP, 'w', encoding='utf-8').write(js)
    print('recorte %.3f: G corregida y acentos · TTF, OTF y WOFF2 en marca/recorte · src/recorte-fuente.js' % VERSION, len(b), 'bytes')

if __name__ == '__main__':
    main()
