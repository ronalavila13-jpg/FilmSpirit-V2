"""Escritor GLB mínimo: malla con piel, varias piezas, materiales y morph targets dispersos."""
import json, struct
import numpy as np


class GLB:
    def __init__(self):
        self.bin = bytearray()
        self.views, self.accs = [], []
        self.g = dict(asset=dict(version='2.0', generator='FilmSpirit fig3d (MakeHuman CC0)'), scene=0,
                      scenes=[dict(nodes=[])], nodes=[], meshes=[], materials=[], skins=[], bufferViews=self.views,
                      accessors=self.accs, buffers=[])

    def _view(self, data: bytes, target=None):
        while len(self.bin) % 4:
            self.bin.append(0)
        v = dict(buffer=0, byteOffset=len(self.bin), byteLength=len(data))
        if target:
            v['target'] = target
        self.bin += data
        self.views.append(v)
        return len(self.views) - 1

    def acc(self, arr, ctype, typ, target=None, normalized=False, minmax=False):
        arr = np.ascontiguousarray(arr)
        v = self._view(arr.tobytes(), target)
        a = dict(bufferView=v, componentType=ctype, count=int(arr.shape[0]), type=typ)
        if normalized:
            a['normalized'] = True
        if minmax:
            a['min'] = arr.min(0).tolist() if arr.ndim > 1 else [float(arr.min())]
            a['max'] = arr.max(0).tolist() if arr.ndim > 1 else [float(arr.max())]
        self.accs.append(a)
        return len(self.accs) - 1

    def sparse_vec3(self, count, idx, vals):
        """Accesor VEC3 disperso (sólo los vértices que se mueven)."""
        idx = np.ascontiguousarray(idx.astype(np.uint32 if count > 65535 else np.uint16))
        vi = self._view(idx.tobytes())
        vv = self._view(np.ascontiguousarray(vals.astype(np.float32)).tobytes())
        a = dict(componentType=5126, count=int(count), type='VEC3',
                 min=(vals.min(0).tolist() if len(vals) else [0, 0, 0]), max=(vals.max(0).tolist() if len(vals) else [0, 0, 0]),
                 sparse=dict(count=int(len(idx)), indices=dict(bufferView=vi, componentType=5125 if count > 65535 else 5123),
                             values=dict(bufferView=vv)))
        if not len(idx):
            a.pop('sparse')
            a['bufferView'] = self._view(np.zeros((count, 3), np.float32).tobytes())
        self.accs.append(a)
        return len(self.accs) - 1

    def save(self, path):
        while len(self.bin) % 4:
            self.bin.append(0)
        self.g['buffers'] = [dict(byteLength=len(self.bin))]
        js = json.dumps(self.g, separators=(',', ':')).encode()
        while len(js) % 4:
            js += b' '
        out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(self.bin))
        out += struct.pack('<II', len(js), 0x4E4F534A) + js
        out += struct.pack('<II', len(self.bin), 0x004E4942) + bytes(self.bin)
        open(path, 'wb').write(out)
        return len(out)


def quant_weights(J, W):
    """Pesos a uint8 normalizados que suman exactamente 255."""
    q = np.floor(W * 255).astype(np.int32)
    rest = 255 - q.sum(1)
    q[np.arange(len(q)), 0] += rest
    return q.astype(np.uint8)


def write_figure(path, F, parts, colors, morphs=None, extras=None):
    g = GLB()
    G = g.g
    nb = len(F.names)
    # huesos
    for i, (n, p) in enumerate(zip(F.names, F.parents)):
        t = F.heads[i] - (F.heads[p] if p >= 0 else 0)
        G['nodes'].append(dict(name=n, translation=[float(x) for x in t]))
    for i, p in enumerate(F.parents):
        if p >= 0:
            G['nodes'][p].setdefault('children', []).append(i)
    roots = [i for i, p in enumerate(F.parents) if p < 0]
    ibm = np.zeros((nb, 4, 4), np.float32)
    for i in range(nb):
        m = np.eye(4); m[:3, 3] = -F.heads[i]
        ibm[i] = m.T  # column-major
    G['skins'].append(dict(name='esqueleto', joints=list(range(nb)), skeleton=roots[0],
                           inverseBindMatrices=g.acc(ibm.reshape(nb, 16), 5126, 'MAT4')))
    # materiales
    matnames = []
    for o in parts:
        for m in o.out['M']:
            if m not in matnames:
                matnames.append(m)
    for m in matnames:
        h = colors.get(m, '#FF00FF').lstrip('#')
        rgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        lin = [((c + .055) / 1.055) ** 2.4 if c > .04045 else c / 12.92 for c in rgb]
        G['materials'].append(dict(name=m, pbrMetallicRoughness=dict(baseColorFactor=lin + [1], metallicFactor=0,
                                                                     roughnessFactor=.9)))
    mesh_nodes = []
    for P in parts:
        o = P.out
        n = len(o['P'])
        J4, W4 = __import__('rig').top4(o['W'])
        attrs = dict(POSITION=g.acc(o['P'].astype(np.float32), 5126, 'VEC3', 34962, minmax=True),
                     NORMAL=g.acc(o['N'].astype(np.float32), 5126, 'VEC3', 34962),
                     JOINTS_0=g.acc(J4.astype(np.uint8), 5121, 'VEC4', 34962),
                     WEIGHTS_0=g.acc(quant_weights(J4, W4), 5121, 'VEC4', 34962, normalized=True))
        targets, tnames = [], []
        if morphs:
            src = o['src']
            for name, D in morphs.items():
                d = np.zeros((n, 3), np.float32)
                ok = src >= 0
                d[ok] = D[src[ok]]
                idx = np.nonzero(np.abs(d).max(1) > 1e-5)[0]
                if len(idx) == 0:
                    continue
                targets.append(dict(POSITION=g.sparse_vec3(n, idx, d[idx])))
                tnames.append(name)
        prims = []
        for mi, m in enumerate(matnames):
            sel = o['M'] == m
            if not sel.any():
                continue
            T = o['T'][sel].astype(np.uint16 if n < 65536 else np.uint32)
            pr = dict(attributes=attrs, indices=g.acc(T.reshape(-1), 5123 if n < 65536 else 5125, 'SCALAR', 34963),
                      material=mi)
            if targets:
                # todos los primitivos deben tener los mismos targets
                pr['targets'] = targets
            prims.append(pr)
        mesh = dict(name=P.name, primitives=prims)
        if targets:
            mesh['extras'] = dict(targetNames=tnames)
            mesh['weights'] = [0] * len(tnames)
        G['meshes'].append(mesh)
        G['nodes'].append(dict(name=P.name, mesh=len(G['meshes']) - 1, skin=0))
        mesh_nodes.append(len(G['nodes']) - 1)
    G['nodes'].append(dict(name='figura', children=roots + mesh_nodes, extras=extras or {}))
    G['scenes'][0]['nodes'] = [len(G['nodes']) - 1]
    return g.save(path)
