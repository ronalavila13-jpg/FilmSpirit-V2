"""Esqueleto 'game_engine' de MPFB2 (CC0) y pesos de piel, calculados sobre la malla deformada."""
import json
import numpy as np
import mh

RIG = json.load(open(mh.DATA + '/rigs/standard/rig.game_engine.json'))
WEI = json.load(open(mh.DATA + '/rigs/standard/weights.game_engine.json'))['weights']


def _pos(spec, V, J):
    s = spec['strategy']
    if s == 'CUBE':
        return J[spec['cube_name']]
    if s == 'MEAN':
        return V[spec['vertex_indices']].mean(0)
    if s == 'VERTEX':
        return V[spec['vertex_index']]
    raise ValueError(s)


def bone_order():
    """Orden padre-antes-que-hijo."""
    order, seen = [], set()

    def visit(b):
        if b in seen:
            return
        p = RIG[b]['parent']
        if p:
            visit(p)
        seen.add(b); order.append(b)
    for b in sorted(RIG):
        visit(b)
    return order


def skeleton(V, J):
    names = bone_order()
    heads = {b: _pos(RIG[b]['head'], V, J) for b in names}
    tails = {b: _pos(RIG[b]['tail'], V, J) for b in names}
    parents = [names.index(RIG[b]['parent']) if RIG[b]['parent'] else -1 for b in names]
    return names, np.array([heads[b] for b in names]), np.array([tails[b] for b in names]), parents


def weights(names, nverts):
    W = np.zeros((nverts, len(names)), np.float32)
    for bi, b in enumerate(names):
        for vid, w in WEI.get(b, []):
            W[vid, bi] += w
    s = W.sum(1)
    W[s > 0] /= s[s > 0, None]
    return W


def top4(W):
    idx = np.argsort(-W, axis=1)[:, :4]
    w = np.take_along_axis(W, idx, 1)
    w /= np.maximum(w.sum(1, keepdims=True), 1e-9)
    return idx.astype(np.uint16), w.astype(np.float32)
