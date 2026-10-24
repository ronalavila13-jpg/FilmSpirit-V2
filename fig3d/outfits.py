"""Ropa, pelo y detalles construidos sobre la superficie del cuerpo MakeHuman."""
import numpy as np
from build import Fig, Part, smooth, laplace_disp

LEG_BONES = ('thigh_', 'calf_', 'foot_', 'ball_')
HAND_BONES = ('hand_', 'thumb_', 'index_', 'middle_', 'ring_', 'pinky_')

# materiales: nombre -> color por defecto (el programa recolorea piel, camisa, pantalón y pelo)
MATS = ['piel', 'ojo', 'pupila', 'cejas', 'pelo', 'camisa', 'camisa_borde', 'interior', 'pantalon',
        'pantalon_borde', 'zapato', 'suela', 'boton', 'boca']


class Regions:
    def __init__(self, F: Fig):
        self.F = F
        V, J, dom = F.V, F.J, F.dom.astype(str)
        self.x, self.y, self.z = V[:, 0], V[:, 1], V[:, 2]
        self.ye = (J['joint-l-eye'][1] + J['joint-r-eye'][1]) / 2
        self.eyez = J['joint-l-eye'][2]
        self.hcz = J['joint-head'][2]
        self.neck = J['joint-neck']
        self.pelvis = J['joint-pelvis']
        self.ankle = (J['joint-l-ankle'] + J['joint-r-ankle']) / 2
        self.knee = (J['joint-l-knee'] + J['joint-r-knee']) / 2
        self.dy = self.y - self.ye
        self.phi = np.degrees(np.arctan2(np.abs(self.x), self.z - self.hcz))  # 0 frente, 180 nuca
        self.headish = np.isin(dom, ['head', 'neck_01'])
        sw = lambda pre: np.array([d.startswith(pre) for d in dom])
        self.leg = sw(LEG_BONES)
        self.hand = sw(HAND_BONES)
        self.arm_t = F.side_arm_t()
        self.is_arm = ~np.isnan(self.arm_t) & ~self.hand
        self.dom = dom
        # escala de la cabeza (niños: cabeza proporcionalmente más grande)
        self.hs = (F.V[F.o['faces'][0]][0][1] * 0 + 1)
        top = V[self.headish, 1].max()
        self.hs = (top - self.ye) / .119
        sh = F.J['joint-l-shoulder'][0] - F.J['joint-r-shoulder'][0]
        self.ws = sh / .374


def face_label(F, vlab, prio):
    def lab(fi):
        ls = [vlab[v] for v in F.o['faces'][fi]]
        ls = [l for l in ls]
        if any(l is None for l in ls):
            return None
        best = max(set(ls), key=lambda l: (ls.count(l), prio.index(l) if l in prio else -1))
        return best
    return lab


# ------------------------------------------------------------------ prenda superior + cuerpo
def body_part(F, R, spec):
    """Malla 'cuerpo': piel visible (cabeza, cuello, manos), prenda superior, zapatos, ojos, cejas."""
    x, y, z, dy, phi = R.x, R.y, R.z, R.dy, R.phi
    hs = R.hs
    top = spec['top']
    n = len(F.V)
    lab = np.array([None] * n, object)

    # cuello de la prenda: piel del cuello dentro de un radio alrededor de su eje, por encima de un corte
    nphi = np.degrees(np.arctan2(np.abs(x), z - R.neck[2]))
    dn = np.hypot(x, z - R.neck[2])
    cut = R.neck[1] - top.get('neck_back', .03) - top.get('neck_front_dip', .03) * smooth(110, 20, nphi)
    rn = top.get('neck_r', .078) * R.ws
    neckskin = (y > cut) & (dn < rn)
    hem = R.pelvis[1] + top.get('hem', -.10)
    sleeve = top.get('sleeve', .93)

    torso = ~R.leg & ~R.hand & ~R.headish
    neckskin |= R.headish & (y > cut - .005)
    torso |= (R.dom == 'neck_01') & ~neckskin
    crotch = (F.N[:, 1] < -.35) & (np.abs(x) < .08 * R.ws) & (y < R.pelvis[1] - .02)
    in_top = torso & ~neckskin & (y > hem) & ~crotch
    arm_ok = np.where(R.is_arm, np.nan_to_num(R.arm_t, nan=0) < sleeve, True)
    in_top &= arm_ok
    # piel superior: cabeza, cuello, manos y antebrazo sin manga
    skin = ~R.leg & ~in_top & (neckskin | R.hand | (R.is_arm & ~arm_ok) | R.headish)
    lab[skin] = 'piel'
    lab[in_top] = 'camisa'
    # puños, bajo, cuello acanalado
    band = top.get('trim', 0)
    if band:
        cuff = in_top & R.is_arm & (np.nan_to_num(R.arm_t) > sleeve - .075)
        hemb = in_top & ~R.is_arm & (y < hem + .045 * hs)
        lab[cuff | hemb] = 'camisa_borde'
    if top.get('collar'):
        col = in_top & (dn < rn + .025 * R.ws) & (y > cut - .05) & ~R.is_arm & ~((z > R.neck[2]) & (np.abs(x) < top.get('open', (0,))[0] + .005))
        lab[col] = 'camisa_borde'
    # abertura frontal (chaqueta / cárdigan) que deja ver la prenda interior
    op = top.get('open')
    if op:
        w_top, w_bot = op[:2]
        t = np.clip((y - hem) / (R.neck[1] - .03 - hem), 0, 1)
        w = w_bot + (w_top - w_bot) * t ** op[2] if len(op) > 2 else w_bot + (w_top - w_bot) * t
        front = (z > R.neck[2] - .02) & (np.abs(x) < w) & in_top & ~R.is_arm
        lab[front] = 'interior'
        # cuello del interior (camisa con cuello o camiseta): franja en la base del cuello
    # capucha (sudadera): bulto detrás del cuello
    if top.get('hood'):
        hood = in_top & (z < R.neck[2] - .01) & (y > R.neck[1] - .17 * hs) & ~R.is_arm & (np.abs(x) < .11 * R.ws)
        lab[hood] = 'capucha'
    # zapatos
    shoe_top = R.ankle[1] + spec['shoe_top']
    shoe = R.leg & (y < shoe_top)
    lab[shoe] = 'zapato'
    lab[shoe & (y < spec.get('sole', .022))] = 'suela'
    # piernas no van aquí
    lab[R.leg & ~shoe] = None
    lab[(R.dom == 'pelvis') & ~in_top] = None
    # cejas
    brow = R.headish & (z > R.eyez - .02) & (dy > .013 * hs) & (dy < .021 * hs) & \
        (np.abs(np.abs(x) - abs(F.J['joint-l-eye'][0]) - .002) < .021 * hs)
    lab[brow & (lab == 'piel')] = 'cejas'
    # labios: un poco más oscuros
    lips = R.headish & (z > R.eyez - .015) & (dy < -.064 * hs) & (dy > -.086 * hs) & (np.abs(x) < .026 * hs)

    o = top.get('off', .012)
    off = {'piel': 0, 'cejas': .0012, 'labios': 0, 'camisa': o, 'camisa_borde': o + top.get('trim_extra', .004),
           'interior': top.get('inner_off', .004), 'capucha': .03 * hs, 'zapato': spec.get('shoe_off', .012),
           'suela': spec.get('shoe_off', .012) + .002}
    # volumen del pecho hacia el bajo para que la chaqueta caiga recta
    if top.get('boxy'):
        arr = np.full(n, o)
        arr += top['boxy'] * smooth(R.pelvis[1] + .25, hem, y) * (~R.is_arm)
        off['camisa'] = arr
        off['camisa_borde'] = arr + top.get('trim_extra', .004)
        off['interior'] = np.full(n, top.get('inner_off', .004)) + top['boxy'] * .4 * smooth(R.pelvis[1] + .25, hem, y)
    mat = {'capucha': 'camisa'}
    P = Part(F, 'cuerpo')
    prio = ['piel', 'labios', 'cejas', 'interior', 'camisa', 'capucha', 'camisa_borde', 'suela', 'zapato']
    flab0 = face_label(F, lab, prio)
    if op:
        # la abertura se decide por cara (centroide), así el borde no queda en escalera
        yt = R.neck[1] - .03

        def wfun(yy):
            t = np.clip((yy - hem) / (yt - hem), 0, 1)
            return w_bot + (w_top - w_bot) * (t ** op[2] if len(op) > 2 else t)
        cache = {}

        def flab(fi):
            if fi in cache:
                return cache[fi]
            l = flab0(fi)
            if l in ('camisa', 'interior'):
                f = F.o['faces'][fi]
                c = F.V[f].mean(0)
                arm = R.is_arm[f].any()
                inside = (not arm) and c[2] > R.neck[2] - .02 and abs(c[0]) < wfun(c[1]) and c[1] > hem + .025
                l = 'interior' if inside else 'camisa'
            cache[fi] = l
            return l
    else:
        flab = flab0
    if op:
        _snap_opening(F, R, flab, hem, w_top, w_bot, op)
    _snap_neck(F, R, flab, cut, dn, rn)
    relax_borders(F, flab, F.body_faces, iters=10, skip=('cejas', None))
    # la prenda cae: se alisa el torso (rellena el escote y suaviza el pecho)
    tor = in_top & ~R.is_arm
    td = laplace_disp(F, tor, iters=top.get('drape', 25), lam=.5)
    shx = F.J['joint-l-shoulder'][0]
    fade = smooth(cut - .03, cut - .11 * R.hs, y) * smooth(hem, hem + .06, y) * smooth(1.05 * shx, .75 * shx, np.abs(x))
    td *= fade[:, None]
    disp = {k: td for k in ('camisa', 'camisa_borde', 'interior', 'capucha')}
    sm = laplace_disp(F, R.leg & (y < shoe_top - .018), iters=12)
    disp.update({'zapato': sm, 'suela': sm})
    P.surface(F.body_faces, flab, off, lambda l: mat.get(l, l), disp=disp)
    # boca: dientes y lengua de MakeHuman (se ven al abrir la boca)
    for grp, m in (('helper-upper-teeth', 'ojo'), ('helper-lower-teeth', 'ojo'), ('helper-tongue', 'boca')):
        P.surface(F.faces_of(grp), lambda fi, m=m: m, {m: 0}, lambda l: l, rim=False)
    # ojos: esfera auxiliar de MakeHuman, pupila oscura al frente
    for side in 'lr':
        fids = F.faces_of(f'helper-{side}-eye')
        ec = F.V[sorted({v for i in fids for v in F.o['faces'][i]})].mean(0)

        def elab(fi, ec=ec):
            c = F.V[F.o['faces'][fi]].mean(0) - ec
            c /= np.linalg.norm(c)
            return 'pupila' if c[2] > .9 else 'ojo'
        P.surface(fids, elab, {'ojo': 0, 'pupila': 0}, lambda l: l, rim=False)
    return P


def _snap_opening(F, R, flab, hem, w_top, w_bot, op):
    """Endereza el borde de la abertura: mueve los vértices frontera a |x| = w(y)."""
    lab_of = {}
    for fi in F.body_faces:
        l = flab(fi)
        for v in F.o['faces'][fi]:
            lab_of.setdefault(v, set()).add(l)
    yt = R.neck[1] - .03
    for v, ls in lab_of.items():
        if 'interior' in ls and ('camisa' in ls or 'camisa_borde' in ls):
            yv = F.V[v, 1]
            t = np.clip((yv - hem) / (yt - hem), 0, 1)
            w = w_bot + (w_top - w_bot) * (t ** op[2] if len(op) > 2 else t)
            x = F.V[v, 0]
            nx = np.sign(x) * w if x != 0 else w
            dx = nx - x
            if abs(dx) > .035:
                continue
            nrm = F.N[v]
            dz = -nrm[0] / nrm[2] * dx if abs(nrm[2]) > .3 else 0
            F.V[v, 0] = nx
            F.V[v, 2] += dz


def relax_borders(F, flab, faces, iters=8, skip=()):
    """Suaviza los bordes entre etiquetas (quita el zigzag de la malla): cada vértice del borde
    se acerca al promedio de sus vecinos en el mismo borde."""
    ef = {}
    for fi in faces:
        l = flab(fi)
        f = F.o['faces'][fi]
        for k in range(len(f)):
            a, b = f[k], f[(k + 1) % len(f)]
            ef.setdefault((min(a, b), max(a, b)), []).append(l)
    nb = {}
    for (a, b), ls in ef.items():
        if len(ls) == 2 and ls[0] != ls[1] and not (set(ls) & set(skip)):
            nb.setdefault(a, set()).add(b); nb.setdefault(b, set()).add(a)
    ids = [v for v, s in nb.items() if len(s) == 2]
    for _ in range(iters):
        P = F.V.copy()
        for v in ids:
            a, b = nb[v]
            F.V[v] = .5 * P[v] + .25 * (P[a] + P[b])


def _snap_neck(F, R, flab, cut, dn, rn):
    """Endereza el escote: los vértices entre piel y prenda van a la altura del corte."""
    lab_of = {}
    for fi in F.body_faces:
        l = flab(fi)
        for v in F.o['faces'][fi]:
            lab_of.setdefault(v, set()).add(l)
    cloth = {'camisa', 'interior', 'camisa_borde', 'capucha'}
    for v, ls in lab_of.items():
        if 'piel' in ls and ls & cloth and dn[v] < rn + .03 and not R.headish[v] or ('piel' in ls and ls & cloth and R.dom[v] == 'neck_01'):
            d = cut[v] - F.V[v, 1]
            if abs(d) < .025:
                F.V[v, 1] = cut[v]


def legs_parts(F, R, spec):
    """'pantalon' y 'piernas' (piel, para falda o vestido)."""
    x, y = R.x, R.y
    top = spec['top']
    hem = R.pelvis[1] + top.get('hem', -.10)
    waist = R.pelvis[1] + .06
    shoe_top = R.ankle[1] + spec['shoe_top']
    pb = R.ankle[1] + spec.get('pants_bottom', .03)
    region = (R.leg | (R.dom == 'pelvis') | (R.dom == 'spine_01')) & ~R.hand
    n = len(F.V)
    lab = np.array([None] * n, object)
    inp = region & (y > pb) & (y < waist)
    lab[inp] = 'pantalon'
    cuff = spec.get('pants_cuff')
    if cuff:
        lab[inp & (y < pb + cuff)] = 'pantalon_borde'
    po = spec.get('pants_off', .007)
    # piernas un poco más rectas abajo (bota del pantalón)
    arr = np.full(n, po) + spec.get('flare', .006) * smooth(R.knee[1], pb, y)
    off = {'pantalon': arr, 'pantalon_borde': arr + .006}
    P1 = Part(F, 'pantalon')
    P1.surface(F.body_faces, face_label(F, lab, ['pantalon', 'pantalon_borde']), off, lambda l: l)
    lab2 = np.array([None] * n, object)
    lab2[region & (y > shoe_top - .02) & (y < hem + .04)] = 'piel'
    P2 = Part(F, 'piernas')
    P2.surface(F.body_faces, face_label(F, lab2, ['piel']), {'piel': 0}, lambda l: l, rim=False)
    return P1, P2


def skirt_part(F, R, spec):
    """Falda a partir de la malla auxiliar de MakeHuman (helper-skirt)."""
    fids = F.faces_of('helper-skirt')
    vids = sorted({v for i in fids for v in F.o['faces'][i]})
    N2 = F._normals(fids)
    Nb = F.N.copy()
    F.N[vids] = N2[vids]
    P = Part(F, 'falda')
    P.surface(fids, lambda fi: 'falda', {'falda': .006}, lambda l: 'pantalon', inner=-.004)
    F.N[:] = Nb
    return P


# ------------------------------------------------------------------ pelo
def hairline(R, style):
    """Umbral de altura (respecto a los ojos) a partir del cual hay pelo, según el ángulo."""
    hs = R.hs
    p = R.phi
    front, side, back = style['front'], style['side'], style['back']
    a = np.interp(p, [0, 35, 75, 110, 150, 180], [front, front * .9, side, side, back, back])
    return a * hs


def hair_offsets(R, style, n):
    hs = R.hs
    o = np.full(n, style['base'] * hs)
    o += style['top'] * hs * smooth(.02 * hs, .11 * hs, R.dy)
    o += style.get('backvol', 0) * hs * smooth(60, 160, R.phi) * smooth(-.06 * hs, .03 * hs, R.dy)
    o += style.get('sidevol', 0) * hs * smooth(40, 90, R.phi) * smooth(110, 90, R.phi) * smooth(-.02 * hs, .05 * hs, R.dy)
    return o


def scalp_part(F, R, name, style):
    n = len(F.V)
    thr = hairline(R, style)
    m = R.headish & (R.dy > thr)
    # no cubrir orejas
    ear = (np.abs(R.x) > .062 * R.hs) & (R.dy < .012 * R.hs) & (R.phi > 70) & (R.phi < 125)
    if not style.get('cover_ears'):
        m &= ~ear
    lab = np.array([None] * n, object)
    lab[m] = 'pelo'
    P = Part(F, name)
    flab = face_label(F, lab, ['pelo'])
    # vértices del borde: se llevan a la línea del nacimiento (sólo para esta pieza)
    V0 = F.V.copy()
    cnt = {}
    for fi in F.body_faces:
        if flab(fi):
            f = F.o['faces'][fi]
            for k in range(len(f)):
                e = (min(f[k], f[(k + 1) % len(f)]), max(f[k], f[(k + 1) % len(f)]))
                cnt[e] = cnt.get(e, 0) + 1
    border = {v for e, c in cnt.items() if c == 1 for v in e}
    for v in border:
        t = R.ye + thr[v]
        if abs(t - F.V[v, 1]) < .015 * R.hs and abs(F.N[v, 1]) < .85:
            F.V[v, 1] = t
    relax_borders(F, lambda fi: flab(fi) or 'x', F.body_faces, iters=8)
    P.surface(F.body_faces, flab, {'pelo': hair_offsets(R, style, n)}, lambda l: 'pelo', inner=-.003)
    F.V[:] = V0
    return P


def curtain(F, R, P, style):
    """Melena / pelo largo: superficie que cae desde la cabeza, apoyada por fuera del cuerpo."""
    V = F.V
    hs = R.hs
    y0 = R.ye + style['curtain_top'] * hs
    y1 = R.ye + style['curtain_bottom'] * hs
    a0 = style.get('curtain_phi', 70)
    cx, cz = 0.0, R.hcz - .01 * hs
    ys = np.linspace(y0, y1, 26)
    chin = R.ye - .105 * hs
    a_row = a0 + (style.get('curtain_back', 128) - a0) * smooth(chin + .02 * hs, chin - .06 * hs, ys)
    t01 = np.linspace(0, 1, 34)
    pts = V[F.body_faces and sorted({v for i in F.body_faces for v in F.o['faces'][i]})]
    ang_p = np.arctan2(pts[:, 0] - cx, pts[:, 2] - cz) % (2 * np.pi)
    rad_p = np.hypot(pts[:, 0] - cx, pts[:, 2] - cz)
    nj = len(t01)
    grid = np.zeros((len(ys), nj, 3))
    rprev = np.zeros(nj)
    for i, yy in enumerate(ys):
        sl = np.abs(pts[:, 1] - yy) < .012
        angs = np.radians(a_row[i] + (360 - 2 * a_row[i]) * t01)
        for j, a in enumerate(angs):
            da = np.abs((ang_p - a + np.pi) % (2 * np.pi) - np.pi)
            mk = sl & (da < .14)
            r = rad_p[mk].max() if mk.any() else rprev[j]
            r = max(r + style['curtain_off'] * hs, rprev[j] * (1 if i < 4 else .995))
            rprev[j] = r
            grid[i, j] = [cx + r * np.sin(a), yy, cz + r * np.cos(a)]
    # suavizar a lo largo del ángulo
    for _ in range(3):
        grid[:, 1:-1] = (grid[:, :-2] + 2 * grid[:, 1:-1] + grid[:, 2:]) / 4
    # puntas un poco hacia afuera
    t = np.linspace(0, 1, len(ys))[:, None, None]
    c = np.array([cx, 0, cz])
    d = grid - c; d[..., 1] = 0
    grid += d / np.maximum(np.linalg.norm(d, axis=-1, keepdims=True), 1e-6) * (style.get('flare', .01) * hs * t ** 2)
    Pf = grid.reshape(-1, 3)
    tris = []
    for i in range(len(ys) - 1):
        for j in range(nj - 1):
            a, b, c2, d2 = i * nj + j, i * nj + j + 1, (i + 1) * nj + j + 1, (i + 1) * nj + j
            tris += [[a, c2, b], [a, d2, c2]]
    # cara interior (la cortina se ve desde dentro al girar la cabeza)
    base = len(Pf)
    inner = Pf + (np.array([cx, 0, cz]) - Pf) * np.array([1, 0, 1]) * .03
    P2 = np.concatenate([Pf, inner])
    tris2 = tris + [[base + t[0], base + t[2], base + t[1]] for t in tris]
    # pesos: cabeza arriba, columna abajo
    W = np.zeros((len(P2), len(F.names)), np.float32)
    hb, nb, sb = F.bi['head'], F.bi['neck_01'], F.bi['spine_03']
    yy = P2[:, 1]
    wh = smooth(R.neck[1] - .02, R.ye - .02 * hs, yy)
    ws = smooth(R.neck[1] - .01, R.neck[1] - .12, yy) * (1 - wh)
    W[:, hb] = wh
    W[:, sb] = ws
    W[:, nb] = 1 - wh - ws
    P.raw(P2, tris2, 'pelo', W)


def blob(F, P, center, radii, bone, mat='pelo', seg=(14, 10), rot=None):
    u, v = np.meshgrid(np.linspace(0, 2 * np.pi, seg[0] + 1)[:-1], np.linspace(.0, np.pi, seg[1] + 1))
    pts = np.stack([np.sin(v) * np.cos(u), np.cos(v), np.sin(v) * np.sin(u)], -1).reshape(-1, 3) * radii
    if rot is not None:
        pts = pts @ rot.T
    pts += center
    nu = seg[0]
    tris = []
    for i in range(seg[1]):
        for j in range(nu):
            a, b = i * nu + j, i * nu + (j + 1) % nu
            c, d = (i + 1) * nu + (j + 1) % nu, (i + 1) * nu + j
            tris += [[a, b, c], [a, c, d]]
    W = np.zeros((len(pts), len(F.names)), np.float32)
    W[:, F.bi[bone]] = 1
    P.raw(pts, tris, mat, W)


HAIR = {
    # front/side/back: altura del nacimiento del pelo (m sobre la línea de los ojos) al frente, a los lados y en la nuca
    'corto': dict(front=.058, side=.028, back=-.105, base=.004, top=.016, backvol=.006),
    'calvo': dict(front=.06, side=.0, back=-.10, base=.003, top=0),
    'melena': dict(front=.052, side=-.02, back=-.11, base=.006, top=.014, sidevol=.008, backvol=.01, cover_ears=True,
                   curtain_top=.0, curtain_bottom=-.115, curtain_off=.012, curtain_phi=62, flare=.012),
    'largo': dict(front=.052, side=-.02, back=-.11, base=.006, top=.014, sidevol=.006, backvol=.008, cover_ears=True,
                  curtain_top=.0, curtain_bottom=-.30, curtain_off=.012, curtain_phi=70, flare=.03),
    'recogido': dict(front=.052, side=.01, back=-.10, base=.004, top=.008, cover_ears=False),
    'colitas': dict(front=.052, side=.01, back=-.10, base=.004, top=.01),
}


def hair_parts(F, R, overrides=None):
    out = []
    hs = R.hs
    for k, st in HAIR.items():
        st = dict(st, **(overrides or {}).get(k, {}))
        if k == 'calvo':
            # corona calva: sólo pelo en los costados y la nuca
            st2 = dict(st)
            n = len(F.V)
            thr = hairline(R, st2)
            m = R.headish & (R.dy > thr) & (R.dy < .055 * hs) & (R.phi > 55)
            ear = (np.abs(R.x) > .062 * hs) & (R.dy < .012 * hs) & (R.phi > 70) & (R.phi < 125)
            m &= ~ear
            lab = np.array([None] * n, object); lab[m] = 'pelo'
            P = Part(F, 'pelo_calvo')
            P.surface(F.body_faces, face_label(F, lab, ['pelo']), {'pelo': np.full(n, .006 * hs)}, lambda l: 'pelo', inner=-.003)
            out.append(P); continue
        P = scalp_part(F, R, 'pelo_' + k, st)
        if 'curtain_top' in st:
            curtain(F, R, P, st)
        head_top = F.V[R.headish, 1].max()
        if k == 'recogido':
            blob(F, P, np.array([0, R.ye + .05 * hs, R.hcz - .105 * hs]), np.array([.05, .045, .045]) * hs, 'head')
        if k == 'colitas':
            for s in (1, -1):
                a = np.radians(28 * s)
                rot = np.array([[np.cos(a), -np.sin(a), 0], [np.sin(a), np.cos(a), 0], [0, 0, 1]])
                blob(F, P, np.array([s * .10 * hs, R.ye - .015 * hs, R.hcz - .045 * hs]), np.array([.032, .085, .032]) * hs,
                     'head', rot=rot)
                blob(F, P, np.array([s * .072 * hs, R.ye + .025 * hs, R.hcz - .04 * hs]), np.array([.016, .016, .016]) * hs,
                     'head', mat='camisa_borde', seg=(8, 6))
        out.append(P)
    return out


def beard_part(F, R):
    hs = R.hs
    n = len(F.V)
    m = R.headish & (R.z > R.hcz - .02 * hs) & (R.dy < -.035 * hs) & (R.dy > -.125 * hs) & (R.phi < 98)
    m &= (R.phi > 55) | (R.dy < -.048 * hs)
    lips = (np.abs(R.x) < .03 * hs) & (R.dy < -.066 * hs) & (R.dy > -.084 * hs) & (R.phi < 30)
    m &= ~lips
    m &= ~((R.dy < -.11 * hs) & (R.z < R.eyez - .06))   # no bajo la mandíbula hacia el cuello
    lab = np.array([None] * n, object); lab[m] = 'barba'
    off = np.full(n, .005 * hs) + .007 * hs * smooth(-.075 * hs, -.11 * hs, R.dy) * smooth(40, 0, R.phi)
    P = Part(F, 'barba')
    P.surface(F.body_faces, face_label(F, lab, ['barba']), {'barba': off}, lambda l: 'pelo', inner=-.002)
    return P
