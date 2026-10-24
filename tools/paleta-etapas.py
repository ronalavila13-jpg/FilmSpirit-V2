"""Paleta de las etapas (la que usa la app es B; A y BA fueron propuestas). Uso: python3 -c "import sys; sys.path.insert(0, 'tools'); import importlib; g = importlib.import_module('paleta-etapas'); print(g.css(g.B))". Propuestas de paleta para las etapas: genera el CSS de las secciones (Vivos, Suaves, claro y oscuro) y los tonos de los
íconos a partir de un color por pestaña. Uso como módulo: css(opcion) -> str"""
import colorsys

def hx(h): return tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
def to(c): return '#%02X%02X%02X' % tuple(max(0, min(255, round(v * 255))) for v in c)
def mix(a, b, t):  # t de a
    A, B = hx(a), hx(b); return to(tuple(A[i] * t + B[i] * (1 - t) for i in range(3)))
def lum(h):
    v = [c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4 for c in hx(h)]
    return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]
def con(a, b):
    A, B = sorted([lum(a), lum(b)], reverse=True); return (A + .05) / (B + .05)
CREMA, TINTA = '#FFFEF6', '#222222'
def ink(h): return CREMA if con(CREMA, h) >= con(TINTA, h) else TINTA
def darken_to(c, bg, target):
    x = c
    for i in range(60):
        if con(x, bg) >= target: return x
        x = mix(x, '#000000', .95)
    return x
def lighten_to(c, bg, target):
    x = c
    for i in range(60):
        if con(x, bg) >= target: return x
        x = mix(x, '#FFFFFF', .93)
    return x

STG = [('Guion', ['build', 'script']), ('Desarrollo', ['lined', 'breakdown', 'scout', 'casting']), ('Imagen', ['board', 'animatic']),
       ('Producción', ['plan', 'cal', 'budget']), ('Rodaje', ['call', 'sup'])]

def css(op):
    """op = {'g': [5 sólidos], tabs: {k: color}, 'ico': [(d, m, l) x5], 'ico_dk': [...]}"""
    L = []
    def block(sel, kv): L.append(sel + '{' + ';'.join(f'{k}:{v}' for k, v in kv.items()) + '}')
    for dark in (False, True):
        bg = '#161616' if dark else '#FFFFFF'
        pre = ':root[data-tone="dark"]' if dark else ':root'
        for i, (name, tabs) in enumerate(STG):
            g = op['g'][i]
            if dark and i == 0: g = '#3A3835'
            tint = mix(g, bg, .14 if dark else .09) if i else ('#262523' if dark else '#F2F0ED')
            strong = (lighten_to(g, mix(g, bg, .14), 4.5) if dark else darken_to(g, mix(g, bg, .09), 4.5)) if i else ('#B7B1A8' if dark else '#5C5852')
            deep = (lighten_to(g, bg, 7) if dark else darken_to(g, bg, 9)) if i else ('#D8D3CB' if dark else '#2B2926')
            block(f'{pre} #tabs .stg[data-g="{i}"]', {'--sg-sol': g, '--sg-sol-ink': ink(g), '--sg-pt': tint, '--sg-pt-c': strong})
            for k in tabs:
                c = op['tabs'][k]
                if dark and i == 0: c = {'build': '#55514C', 'script': '#3A3835'}[k]
                mid = mix(c, bg, .3 if dark else .22) if i else ('#3A3835' if dark else '#E3DFD9')
                tc = (lighten_to(c, mid, 4.5) if dark else darken_to(c, mid, 4.5)) if i else ('#B7B1A8' if dark else '#5C5852')
                bar = mix(c, bg, .12 if dark else .08) if i else ('#262523' if dark else '#F4F2EF')
                sel = f':root[data-tone="dark"][data-tab="{k}"]' if dark else f':root[data-tab="{k}"]'
                block(sel, {'--sx-sol': g, '--sx-sol-ink': ink(g), '--sx-tab': c, '--sx-tab-ink': ink(c), '--sx-pt': tint, '--sx-pt-deep': deep,
                            '--sx-pt-mid': mid, '--sx-pt-c': tc, '--sx-pt-bar': bar})
                block(f'{pre} :is([data-tabgo="{k}"],.stg-m .tab[data-tab="{k}"])', {'--ti-sol': c, '--ti-sol-ink': ink(c), '--ti-pt': mid, '--ti-pt-c': tc})
    for i, (d, m, l) in enumerate(op['ico']):
        L.append(f'.icg{i}{{--d:{d};--m:{m};--l:{l};--x:{l}}}')
    for i, (d, m, l) in enumerate(op['ico_dk']):
        L.append(f':root[data-theme="dark"] .icg{i}{{--d:{d};--m:{m};--l:{l};--x:{l};--ld:{m}}}')
    return '\n'.join(L)

def report(op):
    out = []
    for i, g in enumerate(op['g']): out.append((STG[i][0], g, round(con(ink(g), g), 2)))
    for k, c in op['tabs'].items(): out.append((k, c, round(con(ink(c), c), 2)))
    return out

A = {  # Tintas de cartel: el negro, el rojo y el naranja del logo, más un azul y un verde de cartel
    'g': ['#222222', '#CE0C1C', '#1F4FA3', '#F49B1E', '#17654D'],
    'tabs': {'build': '#4A4640', 'script': '#222222', 'lined': '#B80A19', 'breakdown': '#CE0C1C', 'scout': '#D63A16', 'casting': '#9C0F2E',
             'board': '#2A60BE', 'animatic': '#173D80', 'plan': '#FFBE0B', 'cal': '#F49B1E', 'budget': '#E07A12', 'call': '#1C7A5C', 'sup': '#0F4F3C'},
    'ico': [('#222222', '#5C5852', '#BDB7AD'), ('#9E0A16', '#E0262B', '#F49B1E'), ('#173D80', '#2F63C8', '#9CBBEF'), ('#C46A00', '#F49B1E', '#FFCB4D'), ('#0F4A38', '#1F8A66', '#93D3B5')],
    'ico_dk': [('#55514C', '#B7B1A8', '#E2DDD5'), ('#A3121C', '#F0544B', '#F7B25A'), ('#2A4F9E', '#7FA6EE', '#BCD2F7'), ('#A85C00', '#F7AE45', '#FFD98A'), ('#16634A', '#4DBB92', '#A9E2C9')],
}
B = {  # Solo cálidos: los colores del logo y del cartel de referencia (negro, rojo, piedra, amarillo y naranja)
    'g': ['#222222', '#CE0C1C', '#6B6259', '#FFBE0B', '#E8730C'],
    'tabs': {'build': '#4A4640', 'script': '#222222', 'lined': '#B80A19', 'breakdown': '#CE0C1C', 'scout': '#D63A16', 'casting': '#9C0F2E',
             'board': '#7A7066', 'animatic': '#544C44', 'plan': '#FFBE0B', 'cal': '#F5AA00', 'budget': '#E0A500', 'call': '#F07F14', 'sup': '#A94F08'},
    'ico': [('#222222', '#5C5852', '#BDB7AD'), ('#9E0A16', '#E0262B', '#F49B1E'), ('#4A433C', '#857A6F', '#CFC7BD'), ('#C48A00', '#FFBE0B', '#FFE08A'), ('#B3570A', '#F08A24', '#FBC48A')],
    'ico_dk': [('#55514C', '#B7B1A8', '#E2DDD5'), ('#A3121C', '#F0544B', '#F7B25A'), ('#5E554C', '#B3A89C', '#DCD4CA'), ('#A87A00', '#FFC93D', '#FFE3A0'), ('#9A4A08', '#F7A050', '#FBD0A6')],
}
if __name__ == '__main__':
    for n, op in (('A', A), ('B', B)):
        r = report(op); print(n, 'mín. contraste letra sobre sólido', min(x[2] for x in r), [x for x in r if x[2] < 4.5])

# B ajustada: los mismos cinco colores cálidos, más hondos y menos saturados, como tintas de cartel impresas sobre papel.
# El logo (FILM negro, SPIRIT naranja #F49B1E) queda como lo más vivo de la pantalla: ninguna etapa usa su naranja ni el
# rojo puro de la placa.
BA = {
    'g': ['#2B2826', '#A3271F', '#6F665C', '#D4A02A', '#A8552A'],
    'tabs': {'build': '#4D4843', 'script': '#2B2826', 'lined': '#B23128', 'breakdown': '#A3271F', 'scout': '#963725', 'casting': '#86202E',
             'board': '#7A7065', 'animatic': '#5B534B', 'plan': '#DDAA30', 'cal': '#CC9420', 'budget': '#B98A26', 'call': '#A8552A', 'sup': '#8C4422'},
    'ico': [('#2B2826', '#5E5852', '#BEB8AF'), ('#861F19', '#BF392D', '#E9A07C'), ('#4E4740', '#857B70', '#CFC7BC'), ('#A6760F', '#D6A22C', '#F1D48A'), ('#86421F', '#C66A35', '#EDB28B')],
    'ico_dk': [('#55514C', '#B7B1A8', '#E2DDD5'), ('#8E2A22', '#E0675A', '#F2B898'), ('#5E554C', '#B3A89C', '#DCD4CA'), ('#9A6E10', '#E9B94E', '#F7DFA2'), ('#8A4622', '#E28A57', '#F4C3A2')],
}
