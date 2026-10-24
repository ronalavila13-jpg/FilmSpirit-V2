"""Maniquíes MakeHuman para el storyboard de FilmSpirit (activos CC0).

Sin ropa ni pelo masculino: el presupuesto de triángulos se usa en el cuerpo.
  - rostro liso, sin relieve de cejas, ojos ni boca, con una nariz simple (las expresiones se dibujan encima);
  - rasgos suavizados (pezones, ombligo, dedos de los pies) para un acabado de maniquí;
  - refinamiento adaptativo: se subdividen los triángulos grandes y curvos (hombros, brazos, piernas,
    cráneo) con puntos medios curvos, hasta llegar al presupuesto;
  - calcomanía de cara (UV plana) donde el programa dibuja la expresión;
  - pelo básico, sin color propio, para los cuerpos femeninos.

Uso: python3 maniqui.py [cuerpos] [salida.js]
"""
import base64, gzip, json, os, sys, collections
import numpy as np
from build import Fig, smooth
from outfits import Regions, hair_parts, scalp_part, HAIR, blob
import outfits
from specs import SPECS
import rig, glb

AQUI = os.path.dirname(os.path.abspath(__file__))
PRESUPUESTO = 30000          # triángulos del cuerpo (antes: ~30 000 del cuerpo vestido + pelo + pantalón)
FEM = {'mujer': 'melena', 'anciana': 'recogido', 'nina': 'melena'}
TONO = '#D9D3C9'             # tono base del maniquí (el programa lo matiza por personaje)


# ------------------------------------------------------------------ utilidades de malla
def edges_of(T):
    e = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    return np.unique(np.sort(e, 1), axis=0)


def vnormals(P, T):
    fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
    N = np.zeros_like(P)
    for k in range(3):
        np.add.at(N, T[:, k], fn)
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)


def relax(P, E, w, iters, lam=.5, taubin=False):
    """Suavizado laplaciano con máscara w (0..1) por vértice."""
    deg = np.bincount(E.ravel(), minlength=len(P)).astype(float)
    def L(X):
        acc = np.zeros_like(X)
        np.add.at(acc, E[:, 0], X[E[:, 1]]); np.add.at(acc, E[:, 1], X[E[:, 0]])
        return acc / np.maximum(deg, 1)[:, None] - X
    for _ in range(iters):
        P = P + lam * w[:, None] * L(P)
        if taubin:
            P = P - (lam + .03) * w[:, None] * L(P)
    return P


# ------------------------------------------------------------------ cara lisa
def fill_holes(P, W, T):
    E = collections.Counter()
    for a, b, cc in T:
        for u, v in ((a, b), (b, cc), (cc, a)):
            E[(u, v)] += 1
    bnd = [(u, v) for (u, v) in E if (v, u) not in E]
    out = collections.defaultdict(list)
    for u, v in bnd: out[u].append(v)
    used = set(); newP, newW, newT = [], [], []
    for (u0, v0) in bnd:
        if (u0, v0) in used: continue
        loop = [u0]; used.add((u0, v0)); cur = v0; ok = True
        while cur != u0:
            loop.append(cur)
            nx = [w for w in out[cur] if (cur, w) not in used]
            if not nx or len(loop) > 500: ok = False; break
            used.add((cur, nx[0])); cur = nx[0]
        if not ok or len(loop) < 3: continue
        ci = len(P) + len(newP)
        newP.append(P[loop].mean(0)); newW.append(W[loop].mean(0))
        for k in range(len(loop)):
            newT.append([loop[(k + 1) % len(loop)], loop[k], ci])
    if newP:
        P = np.concatenate([P, np.array(newP)]); W = np.concatenate([W, np.array(newW)])
        T = np.concatenate([T, np.array(newT)])
    return P, W, T, len(newP)


def clean_face(P, T, W, F, R):
    """Quita ojos, párpados, labios y boca de la malla base: borra la geometría que se mete hacia dentro
    de la cabeza (cuencas y cavidad bucal), tapa los huecos y lleva la zona a una superficie lisa."""
    hs = R.hs
    hb = [F.bi['head']]
    headv = W[:, hb].ravel() > .5
    dy = P[:, 1] - R.ye
    phi = np.degrees(np.arctan2(np.abs(P[:, 0]), P[:, 2] - R.hcz))
    Nv = vnormals(P, T)
    reg = headv & (phi < 80) & (dy > -.13 * hs) & (dy < .06 * hs) & (Nv[:, 2] > .35)
    # superficie exterior de la cara como relieve z(x, y): máximo por celda + desenfoque
    c = .0025
    gx = np.round(P[reg, 0] / c).astype(int); gy = np.round(P[reg, 1] / c).astype(int)
    x0, y0 = gx.min() - 6, gy.min() - 6
    G = np.full((gx.max() - x0 + 7, gy.max() - y0 + 7), -np.inf)
    np.maximum.at(G, (gx - x0, gy - y0), P[reg, 2])
    def zat(px, py):
        i = np.clip(np.round(px / c).astype(int) - x0, 0, G.shape[0] - 1)
        j = np.clip(np.round(py / c).astype(int) - y0, 0, G.shape[1] - 1)
        return Zs[i, j]
    # rellenar celdas vacías y alisar (cierra el surco de la boca y las cuencas)
    Z = G.copy(); ok = np.isfinite(Z)
    for _ in range(40):
        pad = np.pad(np.where(np.isfinite(Z), Z, np.nan), 1, constant_values=np.nan)
        nb = np.stack([pad[2:, 1:-1], pad[:-2, 1:-1], pad[1:-1, 2:], pad[1:-1, :-2]])
        m = np.nanmax(np.where(np.isnan(nb), -np.inf, nb), 0)
        Z = np.where(np.isfinite(Z), Z, np.where(np.isfinite(m), m, -np.inf))
    Z[~np.isfinite(Z)] = np.nanmin(np.where(np.isfinite(Z), Z, np.nan))
    Zs = Z.copy()
    for _ in range(3):
        pad = np.pad(Zs, 1, mode='edge')
        Zs = (pad[:-2, 1:-1] + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:] + 2 * Zs) / 6
    # zonas de rasgos: ojos y boca
    X = np.abs(P[:, 0])
    eyes = (Nv[:, 2] > .45) & (phi < 62) & (np.abs(dy) < .03 * hs) & (X < .064 * hs)
    nose = (Nv[:, 2] > .45) & (np.abs(dy + .046 * hs) < .014 * hs) & (X < .03 * hs)
    # boca: los vértices que mueve la unidad de expresión 'mouth-pursing' de MakeHuman (misma topología en todos los cuerpos)
    import mh
    ti, td = mh.load_target('expression/units/caucasian/mouth-pursing')
    mag = np.linalg.norm(td, axis=1)
    lipv = ti[(mag > mag.max() * .08) & (ti < len(P))]
    mouth = np.zeros(len(P), bool); mouth[lipv] = True
    Et = edges_of(T)
    for _ in range(2):
        g = mouth.copy(); g[Et[:, 0]] |= mouth[Et[:, 1]]; g[Et[:, 1]] |= mouth[Et[:, 0]]; mouth = g
    mouth &= (X < .045 * hs)
    feat = headv & (eyes | nose | mouth)
    # borrar caras ocultas detrás de la superficie (interior de boca y cuencas)
    cen = P[T].mean(1)
    tf = feat[T].all(1)
    hidden = tf & (cen[:, 2] < zat(cen[:, 0], cen[:, 1]) - .004)
    T = T[~hidden]
    # quitar piezas sueltas que quedaron dentro (componentes pequeñas)
    import collections
    parent = np.arange(len(P))
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for a, b, cc in T:
        for u, v in ((a, b), (b, cc)):
            ru, rv = find(u), find(v)
            if ru != rv: parent[ru] = rv
    roots = np.array([find(a) for a in T[:, 0]])
    big = collections.Counter(roots).most_common(1)[0][0]
    T = T[roots == big]
    # tapar huecos: un vértice central por borde; si queda alguna arista mal cosida, se abre un poco y se vuelve a tapar
    nfill = 0
    for _ in range(6):
        P, W, T, n_new = fill_holes(P, W, T)
        nfill += n_new
        cnt = collections.Counter()
        for a_, b_, c_ in T:
            for u, v in ((a_, b_), (b_, c_), (c_, a_)): cnt[(min(u, v), max(u, v))] += 1
        bad = {v for e, n in cnt.items() if n != 2 for v in e}
        if not bad: break
        T = T[~np.isin(T, list(bad)).any(1)]
    newP = [None] * nfill
    feat = np.concatenate([feat, np.ones(len(newP), bool)])
    used = np.unique(T); remap = -np.ones(len(P), int); remap[used] = np.arange(len(used))
    P, W, T, feat = P[used], W[used], remap[T], feat[used]
    # llevar rasgos y tapas a la superficie lisa, con transición suave
    E2 = edges_of(T)
    w = feat.astype(float)
    for _ in range(4):
        acc = np.zeros(len(P)); deg = np.zeros(len(P))
        np.add.at(acc, E2[:, 0], w[E2[:, 1]]); np.add.at(acc, E2[:, 1], w[E2[:, 0]])
        np.add.at(deg, E2.ravel(), 1)
        w = np.maximum(w, .7 * acc / np.maximum(deg, 1))
    zt = zat(P[:, 0], P[:, 1])
    P[:, 2] = np.where(w > 0, P[:, 2] * (1 - w) + zt * w, P[:, 2])
    P = relax(P, E2, w, 20)
    for _ in range(3):   # repetir: proyectar a la superficie lisa y relajar, hasta borrar los pliegues
        zt = zat(P[:, 0], P[:, 1])
        P[:, 2] = np.where(feat, np.maximum(P[:, 2], zt), P[:, 2])
        P = relax(P, E2, w, 15)
    P = relax(P, E2, w, 6, taubin=True)
    return P, T, W


def smooth_face(P, T, E, R, head):
    """Rostro liso: la parte central de la cara (cejas, ojos, nariz, boca) se rellena con la superficie más suave
    que empalma con la frente, las mejillas y el mentón: un relleno de Poisson sobre el relieve z(x, y), con la
    curvatura justa para que el perfil quede como un huevo (sin hocico ni hundimientos)."""
    hs = R.hs
    yc, a, b = R.ye - .024 * hs, .06 * hs, .08 * hs     # óvalo de la cara: de las cejas al inicio del mentón
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    phi = np.degrees(np.arctan2(np.abs(x), z - R.hcz))
    reg = head & (phi < 80) & (np.abs(x) < a * 1.6) & (np.abs(y - yc) < b * 1.6) & (z > R.hcz)
    # relieve z(x, y): máximo por celda, huecos rellenados, desenfoque leve
    c = .0025 * hs
    gx = np.round(x[reg] / c).astype(int); gy = np.round(y[reg] / c).astype(int)
    x0, y0 = gx.min() - 3, gy.min() - 3
    G = np.full((gx.max() - x0 + 4, gy.max() - y0 + 4), -np.inf)
    np.maximum.at(G, (gx - x0, gy - y0), z[reg])
    for _ in range(30):
        pad = np.pad(G, 1, constant_values=-np.inf)
        m = np.max(np.stack([pad[2:, 1:-1], pad[:-2, 1:-1], pad[1:-1, 2:], pad[1:-1, :-2]]), 0)
        G = np.where(np.isfinite(G), G, m)
    G[~np.isfinite(G)] = z[reg].min()
    for _ in range(2):
        pad = np.pad(G, 1, mode='edge')
        G = (pad[:-2, 1:-1] + pad[2:, 1:-1] + pad[1:-1, :-2] + pad[1:-1, 2:] + 2 * G) / 6
    GX = (np.arange(G.shape[0]) + x0)[:, None] * c
    GY = (np.arange(G.shape[1]) + y0)[None, :] * c
    hole = (GX / a) ** 2 + ((GY - yc) / b) ** 2 < 1.0
    # relleno de Poisson (gradiente conjugado): membrana que empalma con el borde + cúpula de curvatura constante
    def lap(Z):
        p = np.pad(Z, 1, mode='edge')
        return p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:] - 4 * Z
    def A(v):
        Z = np.zeros_like(G); Z[hole] = v
        return -lap(Z)[hole]
    def solve(rhs):
        xv = np.zeros(int(hole.sum())); r = rhs - A(xv); p = r.copy(); rr = r @ r
        for _ in range(4000):
            Ap = A(p); al = rr / (p @ Ap)
            xv += al * p; r -= al * Ap
            rn = r @ r
            if rn < 1e-26: break
            p = r + (rn / rr) * p; rr = rn
        return xv
    Z0 = np.where(hole, 0, G)
    harm = solve(lap(Z0)[hole])            # membrana que empalma con el borde
    unit = solve(-np.ones(int(hole.sum())))  # cúpula de curvatura constante (borde en 0)
    # la cúpula se escala para que el centro de la cara quede apenas por delante del entrecejo original
    ic = np.unravel_index(np.argmin(np.where(hole, (GX / a) ** 2 + ((GY - yc) / b) ** 2, 9)), G.shape)
    ie = (int(round(-x0)), int(round(R.ye / c - y0)))
    zc_target = G[ie] + .006 * hs
    H = np.zeros_like(G); H[hole] = harm; U = np.zeros_like(G); U[hole] = unit
    k = (zc_target - H[ic]) / U[ic]
    xv = harm + k * unit
    S = G.copy(); S[hole] = xv
    # nariz de maniquí: un relieve simple y corto entre los ojos y la boca que se dibuja (sin fosas ni detalle).
    # Alturas respecto de la línea de los ojos (× hs): entrecejo, punta y base
    NB, NT, NU, NH = -.006, -.029, -.037, .0075 * hs
    def nose(px, py):
        ny = (py - R.ye) / hs
        t = np.clip((NB - ny) / (NB - NT), 0, 1)
        u = np.clip((NT - ny) / (NT - NU), 0, 1)
        h = NH * t ** 1.5 * (1 - u * u * (3 - 2 * u))
        wx = (.0042 + .0058 * t) * hs
        return h * np.exp(-(px / wx) ** 2)
    def zat(px, py):
        i = np.clip((px / c - x0), 0, G.shape[0] - 1.001); j = np.clip((py / c - y0), 0, G.shape[1] - 1.001)
        i0, j0 = i.astype(int), j.astype(int); fi, fj = i - i0, j - j0
        return (S[i0, j0] * (1 - fi) * (1 - fj) + S[i0 + 1, j0] * fi * (1 - fj) +
                S[i0, j0 + 1] * (1 - fi) * fj + S[i0 + 1, j0 + 1] * fi * fj) + nose(px, py)
    rr_ = np.sqrt((x / a) ** 2 + ((y - yc) / b) ** 2)
    w = head * (z > R.hcz) * smooth(1.0, .55, rr_) * (phi < 80)
    P = P.copy()
    P[:, 2] = z + w * (zat(x, y) - z)
    for it in range(8):   # repartir los vértices (deshace los pliegues de los párpados) sin perder la forma
        P = relax(P, E, w, 15, taubin=it >= 5)
        P[:, 2] = P[:, 2] + w * (zat(P[:, 0], P[:, 1]) - P[:, 2])
    return P


# ------------------------------------------------------------------ cuerpo
def body_mesh(F, R):
    faces = [F.o['faces'][i] for i in F.body_faces]
    T = np.array([[f[0], f[1], f[2]] for f in faces] + [[f[0], f[2], f[3]] for f in faces if len(f) == 4])
    used = np.unique(T)
    remap = -np.ones(len(F.V), int); remap[used] = np.arange(len(used))
    T = remap[T]
    P = F.V[used].copy(); W = F.W[used].copy()
    P, T, W = clean_face(P, T, W, F, R)
    hs = R.hs
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    dy = y - R.ye
    phi = np.degrees(np.arctan2(np.abs(x), z - R.hcz))
    dom = np.array(F.names)[W.argmax(1)]
    head = np.isin(dom, ['head', 'neck_01'])
    E = edges_of(T)
    sm = lambda a, b, v: smooth(a, b, v)
    # ojos: se cierran y quedan lisos (la expresión se dibuja encima)
    eye = head * sm(.036 * hs, .02 * hs, np.abs(dy - .002 * hs)) * sm(80, 60, phi) * sm(.08 * hs, .062 * hs, np.abs(x))
    P = relax(P, E, eye, 90)
    P = relax(P, E, eye, 10, taubin=True)
    # labios y boca: casi lisos, conservan algo de volumen
    lips = head * sm(.045 * hs, .03 * hs, np.abs(x)) * sm(.03 * hs, .015 * hs, np.abs(dy + .075 * hs)) * sm(50, 30, phi)
    P = relax(P, E, lips, 45)
    chin = head * sm(.05 * hs, .03 * hs, np.abs(x)) * sm(.022 * hs, .01 * hs, np.abs(dy + .1 * hs)) * sm(45, 25, phi)
    P = relax(P, E, chin, 25)
    # fosas nasales y surcos de la cara: nariz simple de maniquí
    nostr = head * sm(.03 * hs, .018 * hs, np.abs(x)) * sm(.02 * hs, .01 * hs, np.abs(dy + .048 * hs)) * sm(45, 25, phi)
    P = relax(P, E, nostr, 40)
    face = head * sm(75, 55, phi) * sm(.07 * hs, .05 * hs, np.abs(dy + .03 * hs))
    P = relax(P, E, face * .6, 6, taubin=True)
    # rostro liso: sin relieve de ojos, nariz, labios ni cejas (las expresiones se dibujan encima)
    P = smooth_face(P, T, E, R, head)
    # pezones y ombligo: detalle fino fuera (Taubin conserva el volumen del pecho)
    torso = np.isin(dom, ['spine_01', 'spine_02', 'spine_03', 'pelvis']).astype(float)
    front = torso * sm(-.02, .06, z - R.pelvis[2])
    P = relax(P, E, front, 8, taubin=True)
    # pezones: el punto más adelantado del pecho a cada lado, alisado en un radio de ~3 cm
    chest = np.isin(dom, ['spine_03', 'spine_02']) & (z > R.pelvis[2])
    for s in (1, -1):
        c = chest & (x * s > .04) & (x * s < .16)
        i = np.nonzero(c)[0][np.argmax(z[c])]
        r = np.linalg.norm(P - P[i], axis=1)
        P = relax(P, E, sm(.035, .015, r) * c, 40)
    navel = torso * sm(.03, .012, np.hypot(x, y - (R.pelvis[1] + .1)))
    P = relax(P, E, navel, 30)
    # pies de maniquí: dedos unidos
    toes = np.array([d.startswith('ball_') for d in dom]).astype(float)
    toes = np.maximum(toes, np.array([d.startswith('foot_') for d in dom]) * .35)
    P = relax(P, E, toes, 60)
    P = relax(P, E, toes, 10, taubin=True)
    # un pulido general muy leve (quita ruido de la malla base sin perder anatomía)
    P = relax(P, E, np.ones(len(P)) * .5, 3, taubin=True)
    return P, T, W, dict(head=head, dom=dom, hs=hs)


def refine(P, T, W, budget):
    """Subdivide los triángulos más grandes y curvos (rojo-verde, sin grietas) con puntos medios curvos."""
    while len(T) < budget * .97:
        N = vnormals(P, T)
        a, b, c = P[T[:, 0]], P[T[:, 1]], P[T[:, 2]]
        area = np.linalg.norm(np.cross(b - a, c - a), axis=1) / 2
        nd = np.minimum.reduce([(N[T[:, 0]] * N[T[:, 1]]).sum(1), (N[T[:, 1]] * N[T[:, 2]]).sum(1), (N[T[:, 2]] * N[T[:, 0]]).sum(1)])
        score = area * (1.15 - nd)
        n_red = max(50, int((budget - len(T)) / 4.5))
        red = np.zeros(len(T), bool); red[np.argsort(-score)[:n_red]] = True
        # aristas marcadas; propagar rojo a triángulos con 2+ aristas marcadas
        def ekey(u, v): return np.minimum(u, v) * len(P) + np.maximum(u, v)
        TE = np.stack([ekey(T[:, 0], T[:, 1]), ekey(T[:, 1], T[:, 2]), ekey(T[:, 2], T[:, 0])], 1)
        while True:
            marked = np.unique(TE[red])
            cnt = np.isin(TE, marked).sum(1)
            new = (cnt >= 2) & ~red
            if not new.any(): break
            red |= new
        marked = np.unique(TE[red])
        # nuevos vértices en el punto medio de cada arista marcada (Hermite con las normales)
        mid = {}
        newP, newW = [], []
        u = (marked // len(P)).astype(int); v = (marked % len(P)).astype(int)
        d = P[v] - P[u]
        tu = d - (d * N[u]).sum(1, keepdims=True) * N[u]
        tv = d - (d * N[v]).sum(1, keepdims=True) * N[v]
        M = (P[u] + P[v]) / 2 + (tu - tv) / 8
        base = len(P)
        idx_of = dict(zip(marked.tolist(), range(base, base + len(marked))))
        P = np.concatenate([P, M]); W = np.concatenate([W, (W[u] + W[v]) / 2])
        out = []
        for t in range(len(T)):
            i0, i1, i2 = T[t]; e = TE[t]
            m = [idx_of.get(int(k)) for k in e]
            if red[t]:
                out += [[i0, m[0], m[2]], [m[0], i1, m[1]], [m[2], m[1], i2], [m[0], m[1], m[2]]]
            elif m[0] is not None:
                out += [[i0, m[0], i2], [m[0], i1, i2]]
            elif m[1] is not None:
                out += [[i0, i1, m[1]], [i0, m[1], i2]]
            elif m[2] is not None:
                out += [[i0, i1, m[2]], [m[2], i1, i2]]
            else:
                out.append([i0, i1, i2])
        T = np.array(out)
    return P, T, W


def face_decal(P, T, W, R, info):
    """Calcomanía de la cara: copia de la superficie frontal de la cabeza, separada 1 mm, con UV plana."""
    hs = R.hs
    hcz = R.hcz
    cen = P[T].mean(1)
    dy = cen[:, 1] - R.ye
    phi = np.degrees(np.arctan2(np.abs(cen[:, 0]), cen[:, 2] - hcz))
    head = W[T].mean(1)[:, [R.F.bi['head']]].ravel() > .5
    sel = head & (phi < 55) & (dy > -.105 * hs) & (dy < .045 * hs)
    Ts = T[sel]
    used = np.unique(Ts)
    remap = -np.ones(len(P), int); remap[used] = np.arange(len(used))
    N = vnormals(P, T)
    Pd = P[used] + N[used] * .0012
    # proyección plana: el lienzo de 128 px tiene los ojos en (48,60) y (80,60) y la boca en y=90
    sep = abs(R.F.J['joint-l-eye'][0] - R.F.J['joint-r-eye'][0])
    s = 32 / sep
    X = 64 + Pd[:, 0] * s * -1       # +x del modelo es la izquierda del personaje (derecha en pantalla)
    Y = 60 - (Pd[:, 1] - R.ye) * s
    UV = np.stack([X / 128, 1 - Y / 128], 1)
    return dict(P=Pd, T=remap[Ts], W=W[used], UV=UV, N=N[used])


# ------------------------------------------------------------------ pelo básico femenino
def bob(F, R, style):
    """Melena corta cerrada: casquete + caída gruesa con bordes redondeados (sin láminas sueltas)."""
    P = scalp_part(F, R, 'pelo_melena', style)
    V = F.V; hs = R.hs
    cx, cz = 0.0, R.hcz - .01 * hs
    y0, y1 = R.ye + .01 * hs, R.ye - .105 * hs
    ys = np.linspace(y0, y1, 22)
    pts = V[sorted({v for i in F.body_faces for v in F.o['faces'][i]})]
    pts = pts[R.headish[sorted({v for i in F.body_faces for v in F.o['faces'][i]})]]
    ang_p = np.arctan2(pts[:, 0] - cx, pts[:, 2] - cz)
    rad_p = np.hypot(pts[:, 0] - cx, pts[:, 2] - cz)
    t = np.linspace(0, 1, len(ys))
    a_front = np.radians(72 + 18 * t ** 1.5)          # el borde delantero se va hacia atrás al bajar
    nj = 40
    out = np.zeros((len(ys), nj, 3)); rmax = 0
    for i, yy in enumerate(ys):
        sl = np.abs(pts[:, 1] - min(yy, R.ye)) < .012
        angs = np.linspace(a_front[i], 2 * np.pi - a_front[i], nj)
        for j, a in enumerate(angs):
            da = np.abs((ang_p - a + np.pi) % (2 * np.pi) - np.pi)
            mk = sl & (da < .16)
            r = rad_p[mk].max() if mk.any() else rmax
            rmax = max(r, rmax * .97)
            r = max(r, rmax * .97) + .011 * hs + .006 * hs * t[i]
            out[i, j] = [cx + r * np.sin(a), yy, cz + r * np.cos(a)]
    for _ in range(4):
        out[1:-1] = (out[:-2] + 2 * out[1:-1] + out[2:]) / 4
        out[:, 1:-1] = (out[:, :-2] + 2 * out[:, 1:-1] + out[:, 2:]) / 4
    th = .012 * hs
    c = np.array([cx, 0, cz])
    d = out - c; d[..., 1] = 0
    dirn = d / np.maximum(np.linalg.norm(d, axis=-1, keepdims=True), 1e-9)
    inner = out - dirn * th
    # bordes redondeados: anillo de puntos a media altura entre fuera y dentro
    ni, nj = out.shape[:2]
    G = np.concatenate([out.reshape(-1, 3), inner.reshape(-1, 3)])
    tris = []
    O = lambda i, j: i * nj + j
    I = lambda i, j: ni * nj + i * nj + j
    for i in range(ni - 1):
        for j in range(nj - 1):
            tris += [[O(i, j), O(i + 1, j + 1), O(i, j + 1)], [O(i, j), O(i + 1, j), O(i + 1, j + 1)]]
            tris += [[I(i, j), I(i, j + 1), I(i + 1, j + 1)], [I(i, j), I(i + 1, j + 1), I(i + 1, j)]]
    for j in range(nj - 1):   # borde inferior
        i = ni - 1
        tris += [[O(i, j), I(i, j), O(i, j + 1)], [O(i, j + 1), I(i, j), I(i, j + 1)]]
    for i in range(ni - 1):   # bordes delanteros
        for j, sg in ((0, 1), (nj - 1, -1)):
            q = [[O(i, j), I(i, j), I(i + 1, j)], [O(i, j), I(i + 1, j), O(i + 1, j)]]
            tris += q if sg > 0 else [[a, c_, b] for a, b, c_ in q]
    # orientar hacia afuera (respecto al eje de la cabeza)
    G2 = G; T2 = np.array(tris)
    fn = np.cross(G2[T2[:, 1]] - G2[T2[:, 0]], G2[T2[:, 2]] - G2[T2[:, 0]])
    cen = G2[T2].mean(1); rad = cen - c; rad[:, 1] = 0
    isin = np.arange(len(T2)) >= 0
    W = np.zeros((len(G), len(F.names)), np.float32)
    hb, nb = F.bi['head'], F.bi['neck_01']
    wh = smooth(R.neck[1] - .03, R.ye - .03 * hs, G[:, 1])
    W[:, hb] = wh; W[:, nb] = 1 - wh
    P.raw(G, T2.tolist(), 'pelo', W)
    return P


def opt_hair(F, R):
    """Peinados opcionales (sin color propio): melena corta y moño. El cuerpo base no lleva pelo."""
    out = [bob(F, R, dict(HAIR['melena'], cover_ears=True))]
    out += [p for p in hair_parts(F, R) if p.name == 'pelo_recogido']
    return out


def fem_hair(F, R, key):
    st = HAIR
    if FEM[key] == 'melena':
        return [bob(F, R, dict(st['melena'], cover_ears=True))]
    parts = hair_parts(F, R)
    return [p for p in parts if p.name == 'pelo_' + FEM[key]]


# ------------------------------------------------------------------ empaquetado (formato de s3d-figuras.js + uv)
def pack(F, parts, colors, meta):
    blob = bytearray()
    def put(arr):
        while len(blob) % 4: blob.append(0)
        off = len(blob); blob.extend(np.ascontiguousarray(arr).tobytes()); return off
    hdr = dict(v=2, bones=[dict(n=n, p=int(p), h=[round(float(x), 5) for x in F.heads[i]])
                           for i, (n, p) in enumerate(zip(F.names, F.parents))],
               colors=colors, meta=meta, parts=[])
    for name, o in parts:
        n = len(o['P'])
        lo, hi = o['P'].min(0), o['P'].max(0)
        q = np.round((o['P'] - lo) / np.maximum(hi - lo, 1e-6) * 65535 - 32768).astype(np.int16)
        nq = np.round(o['N'] * 127).astype(np.int8)
        J4, W4 = rig.top4(o['W'])
        Wq = glb.quant_weights(J4, W4)
        order, groups = [], []
        for m in dict.fromkeys(o['M']):
            sel = np.nonzero(o['M'] == m)[0]
            groups.append([m, int(len(sel) * 3)]); order.append(o['T'][sel])
        Ti = np.concatenate(order).reshape(-1).astype(np.uint16 if n < 65536 else np.uint32)
        part = dict(name=name, nv=n, lo=lo.tolist(), hi=hi.tolist(), groups=groups,
                    pos=put(q), nrm=put(nq), ji=put(J4.astype(np.uint8)), jw=put(Wq),
                    idx=put(Ti), idx32=bool(n >= 65536), ni=int(len(Ti)), morphs=[])
        if 'UV' in o:
            part['uv'] = put(np.round(np.clip(o['UV'], -1, 2) * 16383 + 16384).astype(np.uint16))
        hdr['parts'].append(part)
    js = json.dumps(hdr, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    return len(js).to_bytes(4, 'little') + js + bytes(blob)


def build(key):
    spec = SPECS[key]
    F = Fig(spec['info']); R = Regions(F); R.F = F
    P, T, W, info = body_mesh(F, R)
    P, T, W = refine(P, T, W, PRESUPUESTO)
    N = vnormals(P, T)
    parts = [('cuerpo', dict(P=P, T=T, W=W, N=N, M=np.array(['piel'] * len(T))))]
    d = face_decal(P, T, W, R, info)
    parts.append(('cara', dict(P=d['P'], T=d['T'], W=d['W'], N=d['N'], UV=d['UV'], M=np.array(['cara'] * len(d['T'])))))
    hair = None
    if True:
        for hp in opt_hair(F, R):
            o = hp.finish()
            M = np.where(o['M'] == 'pelo', 'pelo', 'pelo')   # sin colores propios (ni moños de color)
            parts.append((hp.name, dict(P=o['P'], T=o['T'], W=o['W'], N=o['N'], M=M)))
        hair = FEM.get(key)
    meta = dict(key=key, ye=float(R.ye), height=float(P[:, 1].max()), hair='ninguno', hairs=['melena', 'recogido'], hair_sug=FEM.get(key), beard=False,
                maniqui=True, chest=[0.0, float((R.neck[1] + R.pelvis[1]) / 2 + .1 * R.hs), .1],
                eye=[0.0, float(R.ye), float(R.eyez)])
    colors = dict(piel=TONO, pelo='#B9B2A7', cara='#2A2724')
    return F, parts, colors, meta


def main(keys, dst):
    out = []
    for k in keys:
        F, parts, colors, meta = build(k)
        raw = pack(F, parts, colors, meta)
        gz = gzip.compress(raw, 9, mtime=0)
        tri = {n: len(o['T']) for n, o in parts}
        print(f"{k}: cuerpo {tri['cuerpo']} tri · cara {tri['cara']} · {len(gz)/1e6:.2f} MB gzip", flush=True)
        out.append(f'{json.dumps(k)}:"{base64.b64encode(gz).decode()}"')
    js = ('/* Maniquíes 3D generados con MakeHuman/MPFB2 (activos CC0). Ver fig3d/LEEME.md. Archivo generado: no editar. */\n'
          'const FIG3D_DATA = {' + ',\n'.join(out) + '};\n')
    open(dst, 'w').write(js)


if __name__ == '__main__':
    keys = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] else list(SPECS)
    main(keys, sys.argv[2] if len(sys.argv) > 2 else os.path.join(AQUI, 'maniqui-datos.js'))
