#!/usr/bin/env python3
"""Versión 2: «bordes de 3 px en todo». Escribe src/shell.html con las esquinas de su CSS a 3 px.

Las píldoras (999px) y las esquinas de 4 a 18 px de la v1 pasan a 3 px; los círculos (50 %) y las esquinas de 1-2 px
se quedan. Solo toca el CSS (entre <style> y </style>), no el HTML ni los scripts. Lo usa build.sh, así el CSS de la v1
sigue igual en el código y los lotes de la v1 se pueden traer sin chocar.
Uso: python3 tools/v2-forma.py src/shell.html > salida
"""
import re, sys

src = open(sys.argv[1], encoding='utf-8').read()
a = src.index('<style>')
b = src.index('</style>', a)
css = src[a:b]

def px(m):
    v = float(m.group(1))
    return 'border-radius:3px' if v >= 4 else m.group(0)

css = re.sub(r'border-radius:\s*(\d+(?:\.\d+)?)px(?![\d\s]*[/0-9])', px, css)
sys.stdout.write(src[:a] + css + src[b:])
