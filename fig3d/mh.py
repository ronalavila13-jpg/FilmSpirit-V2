"""Carga la malla base de MakeHuman (MPFB2, CC0), aplica targets macro y calcula articulaciones."""
import gzip, json, os
import numpy as np

# carpeta data de MPFB2 (git clone https://github.com/makehumancommunity/mpfb2)
DATA = os.environ.get('MPFB_DATA', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mpfb2', 'src', 'mpfb', 'data'))
_CACHE = {}


def load_obj():
    if 'obj' in _CACHE:
        return _CACHE['obj']
    V, VT, faces, fuv, fgroup = [], [], [], [], []
    group = None
    groups = {}
    for line in open(os.path.join(DATA, '3dobjs/base.obj')):
        if line.startswith('v '):
            V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('vt '):
            VT.append([float(x) for x in line.split()[1:3]])
        elif line.startswith('g '):
            group = line.split()[1]
            groups.setdefault(group, len(groups))
        elif line.startswith('f '):
            ids = [p.split('/') for p in line.split()[1:]]
            faces.append([int(p[0]) - 1 for p in ids])
            fuv.append([int(p[1]) - 1 if len(p) > 1 and p[1] else -1 for p in ids])
            fgroup.append(groups[group])
    res = dict(V=np.array(V, np.float64), VT=np.array(VT, np.float64), faces=faces, fuv=fuv,
               fgroup=np.array(fgroup), groups=groups)
    _CACHE['obj'] = res
    return res


def load_target(rel):
    p = os.path.join(DATA, 'targets', rel + '.target.gz')
    if not os.path.exists(p):
        return None
    idx, d = [], []
    for line in gzip.open(p, 'rt'):
        if not line.strip() or line.startswith('#'):
            continue
        a = line.split()
        idx.append(int(a[0])); d.append([float(x) for x in a[1:4]])
    return (np.array(idx, int), np.array(d)) if idx else None


def _interp(macro, value, cfg):
    out = []
    for p in cfg['macrotargets'][macro]['parts']:
        if p['lowest'] < value < p['highest']:
            t = (value - p['lowest']) / (p['highest'] - p['lowest'])
            if p['low']:
                out.append((p['low'], round(1 - t, 4)))
            if p['high']:
                out.append((p['high'], round(t, 4)))
    return out


def macro_stack(info, cutoff=0.01):
    """Réplica de TargetService.calculate_target_stack_from_macro_info_dict (sin pecho)."""
    cfg = json.load(open(os.path.join(DATA, 'targets/macrodetails/macro.json')))
    C = {k: _interp(k, info[k], cfg) for k in ['gender', 'age', 'muscle', 'weight', 'proportions', 'height']}
    T = []
    for race, rv in info['race'].items():
        for a, aw in C['age']:
            for g, gw in C['gender']:
                w = rv * gw * aw
                if w > cutoff:
                    T.append((f'macrodetails/{race}-{g}-{a}', w))
    for g, gw in C['gender']:
        for a, aw in C['age']:
            for m, mw in C['muscle']:
                for wt, ww in C['weight']:
                    base = gw * aw * mw * ww
                    if base > cutoff:
                        T.append((f'macrodetails/universal-{g}-{a}-{m}-{wt}', base))
                    for h, hw in C['height']:
                        if base * hw > cutoff:
                            T.append((f'macrodetails/height/{g}-{a}-{m}-{wt}-{h}', base * hw))
                    for p, pw in C['proportions']:
                        if base * pw > cutoff and a != 'baby':
                            T.append((f'macrodetails/proportions/{g}-{a}-{m}-{wt}-{p}', base * pw))
    return T


def build_body(info, extra=()):
    """Devuelve vértices deformados (unidades MakeHuman: decímetros, Y arriba)."""
    o = load_obj()
    V = o['V'].copy()
    for name, w in list(macro_stack(info)) + list(extra):
        t = load_target(name)
        if t is not None:
            V[t[0]] += w * t[1]
    return V


def joints(V):
    o = load_obj()
    inv = {v: k for k, v in o['groups'].items()}
    J = {}
    fg = o['fgroup']
    for gi, name in inv.items():
        if name.startswith('joint-'):
            vid = sorted({i for f, g in zip(o['faces'], fg) if g == gi for i in f})
            J[name] = V[vid].mean(0)
    return J
