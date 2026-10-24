"""Genera las figuras de FilmSpirit a partir de MakeHuman (CC0): cuerpo, ropa, pelo, expresiones."""
import numpy as np
import mh, rig

RACE = {'caucasian': .6, 'african': .2, 'asian': .2}
S = .1  # decímetros -> metros


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


class Fig:
    def __init__(self, info, extra=()):
        o = mh.load_obj()
        self.o = o
        V = mh.build_body(dict(proportions=.5, height=.5, race=RACE, **info), extra) * S
        J = mh.joints(V)
        g = J['joint-ground'].copy()
        V -= g
        J = {k: v - g for k, v in J.items()}
        self.V, self.J = V, J
        self.names, self.heads, self.tails, self.parents = rig.skeleton(V, J)
        self.bi = {n: i for i, n in enumerate(self.names)}
        self.W = rig.weights(self.names, len(V))
        self.dom = np.array([self.names[i] for i in self.W.argmax(1)])
        inv = {v: k for k, v in o['groups'].items()}
        self.fg = [inv[g] for g in o['fgroup']]
        self.body_faces = [i for i, g in enumerate(self.fg) if g == 'body']
        self.N = self._normals(self.body_faces)

    def faces_of(self, group):
        return [i for i, g in enumerate(self.fg) if g == group]

    def _normals(self, fids):
        V = self.V
        N = np.zeros_like(V)
        for i in fids:
            f = self.o['faces'][i]
            for k in range(len(f)):
                a, b, c = f[k - 1], f[k], f[(k + 1) % len(f)]
                N[b] += np.cross(V[c] - V[b], V[a] - V[b])
        n = np.linalg.norm(N, axis=1)
        N[n > 0] /= n[n > 0, None]
        return N

    # ---- marcos de referencia útiles
    def side_arm_t(self):
        """Parámetro 0 (hombro) .. 1 (muñeca) a lo largo del brazo, por vértice."""
        t = np.full(len(self.V), np.nan)
        for s in 'lr':
            sh, hd = self.J[f'joint-{s}-shoulder'], self.J[f'joint-{s}-hand']
            ax = hd - sh
            L2 = ax @ ax
            arm = np.array([d in (f'upperarm_{s}', f'lowerarm_{s}', f'hand_{s}') or
                            (d.endswith(f'_{s}') and d.startswith(('thumb', 'index', 'middle', 'ring', 'pinky')))
                            for d in self.dom])
            tt = ((self.V - sh) @ ax) / L2
            t[arm] = tt[arm]
        return t


# ------------------------------------------------------------------ ensamblado de piezas
class Part:
    """Una malla con piel (skinned). Superficies del cuerpo desplazadas + geometría adicional."""

    def __init__(self, fig, name, morph=True):
        self.fig, self.name, self.morph = fig, name, morph
        self.keys = {}          # (orig, label, tipo) -> índice
        self.P, self.src, self.Wx, self.tris, self.mat = [], [], [], [], []
        self.nsrc = []          # para normales suaves: id de grupo de normal

    def _vert(self, key, pos, src=-1, w=None, ng=None):
        if key in self.keys:
            return self.keys[key]
        i = len(self.P)
        self.keys[key] = i
        self.P.append(pos); self.src.append(src); self.Wx.append(w); self.nsrc.append(ng if ng is not None else ('u', i))
        return i

    def surface(self, faces, label_of, offset, mat_of, rim=True, inner=-.002, closed_labels=(), disp=None):
        """faces: ids de caras de la malla base; label_of(face)->etiqueta; offset[label] -> array por vértice."""
        F = self.fig
        V, N = F.V, F.N
        disp = disp or {}
        Z = np.zeros(3)

        def dsp(l, v):
            return disp[l][v] if l in disp else Z
        lab_faces = [(fi, label_of(fi)) for fi in faces]
        lab_faces = [(fi, l) for fi, l in lab_faces if l is not None]
        edges = {}
        for fi, l in lab_faces:
            f = F.o['faces'][fi]
            idx = []
            for v in f:
                o = offset[l][v] if hasattr(offset[l], '__len__') else offset[l]
                idx.append(self._vert((v, l, 's'), V[v] + N[v] * o + dsp(l, v), v, ng=('n', v, round(float(o), 4))))
            m = mat_of(l)
            self.tris.append([idx[0], idx[1], idx[2]]); self.mat.append(m)
            if len(f) == 4:
                self.tris.append([idx[0], idx[2], idx[3]]); self.mat.append(m)
            for k in range(len(f)):
                a, b = f[k], f[(k + 1) % len(f)]
                edges.setdefault((min(a, b), max(a, b)), []).append((fi, l, a, b))
        if not rim:
            return
        cent = {fi: V[F.o['faces'][fi]].mean(0) for fi, _ in lab_faces}

        def off(l, v):
            return offset[l][v] if hasattr(offset[l], '__len__') else offset[l]

        for (a, b), lst in edges.items():
            if len(lst) == 1:
                fi, l, _, _ = lst[0]
                if l in closed_labels or off(l, a) <= 0.0005:
                    continue
                pa_o, pb_o = V[a] + N[a] * off(l, a) + dsp(l, a), V[b] + N[b] * off(l, b) + dsp(l, b)
                pa_i, pb_i = V[a] + N[a] * inner + dsp(l, a), V[b] + N[b] * inner + dsp(l, b)
                self._rim(pa_o, pb_o, pb_i, pa_i, a, b, cent[fi], mat_of(l), l)
            elif len(lst) == 2:
                (f1, l1, _, _), (f2, l2, _, _) = lst
                if l1 == l2:
                    continue
                o1, o2 = (off(l1, a) + off(l1, b)), (off(l2, a) + off(l2, b))
                if abs(o1 - o2) < 0.0008:
                    continue
                if o1 < o2:
                    f1, l1, f2, l2 = f2, l2, f1, l1
                self._rim(V[a] + N[a] * off(l1, a) + dsp(l1, a), V[b] + N[b] * off(l1, b) + dsp(l1, b),
                          V[b] + N[b] * off(l2, b) + dsp(l2, b), V[a] + N[a] * off(l2, a) + dsp(l2, a),
                          a, b, cent[f1], mat_of(l1), l1)

    def _rim(self, ao, bo, bi, ai, a, b, c_out, m, l):
        i0 = self._vert(('rim', a, b, 0, l), ao, a)
        i1 = self._vert(('rim', a, b, 1, l), bo, b)
        i2 = self._vert(('rim', a, b, 2, l), bi, b)
        i3 = self._vert(('rim', a, b, 3, l), ai, a)
        n = np.cross(bo - ao, ai - ao)
        mid = (ao + bo) / 2
        q = [i0, i1, i2, i3]
        if n @ (mid - c_out) < 0:
            q = q[::-1]
        self.tris += [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]
        self.mat += [m, m]

    def raw(self, P, tris, mat, W, src=None):
        """Geometría adicional con pesos propios (W: n x nbones)."""
        base = len(self.P)
        for i, p in enumerate(P):
            self.P.append(p); self.src.append(-1 if src is None else src[i]); self.Wx.append(W[i]); self.nsrc.append(('u', base + i))
        for t in tris:
            self.tris.append([base + t[0], base + t[1], base + t[2]]); self.mat.append(mat)

    def finish(self):
        F = self.fig
        P = np.array(self.P, np.float64)
        T = np.array(self.tris, np.int64)
        # normales suaves por grupo
        gid = {}
        g = np.array([gid.setdefault(k, len(gid)) for k in self.nsrc])
        fn = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
        acc = np.zeros((len(gid), 3))
        for k in range(3):
            np.add.at(acc, g[T[:, k]], fn)
        Nn = acc[g]
        n = np.linalg.norm(Nn, axis=1)
        Nn[n > 0] /= n[n > 0, None]
        Wd = np.zeros((len(P), len(F.names)), np.float32)
        for i, (s, w) in enumerate(zip(self.src, self.Wx)):
            Wd[i] = w if w is not None else F.W[s]
        self.out = dict(P=P.astype(np.float32), N=Nn.astype(np.float32), T=T, M=np.array(self.mat),
                        W=Wd, src=np.array(self.src))
        return self.out


def laplace_disp(F, mask, iters=10, lam=.5):
    """Desplazamiento que suaviza la superficie dentro de mask (p. ej. dedos dentro del zapato)."""
    V = F.V
    nb = {}
    for fi in F.body_faces:
        f = F.o['faces'][fi]
        for k in range(len(f)):
            a, b = f[k], f[(k + 1) % len(f)]
            if mask[a] and mask[b]:
                nb.setdefault(a, set()).add(b); nb.setdefault(b, set()).add(a)
    ids = np.array(sorted(nb))
    P = V.copy()
    lists = [np.array(sorted(nb[i])) for i in ids]
    for _ in range(iters):
        avg = np.array([P[l].mean(0) for l in lists])
        P[ids] = P[ids] * (1 - lam) + avg * lam
    return P - V
