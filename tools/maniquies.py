#!/usr/bin/env python3
"""Rehace src/s3d-figuras-datos.js (los maniquíes 3D, que no van en git) desde una versión ya publicada del servidor.

  python3 tools/maniquies.py <carpeta server/public/app/fig>

Toma hombre.gz, mujer.gz, anciano.gz, anciana.gz, nino.gz y nina.gz (los escribe build.sh server con
server/tools/figuras.js) y vuelve a armar el archivo con los mismos bytes que generó fig3d/maniqui.py.
"""
import base64, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CUERPOS = ['hombre', 'mujer', 'anciano', 'anciana', 'nino', 'nina']


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    fig = pathlib.Path(sys.argv[1])
    out = []
    for k in CUERPOS:
        gz = (fig / f'{k}.gz').read_bytes()
        if gz[:2] != b'\x1f\x8b':
            sys.exit(f'{k}.gz no es un archivo gzip')
        out.append(f'{json.dumps(k)}:"{base64.b64encode(gz).decode()}"')
    js = ('/* Maniquíes 3D generados con MakeHuman/MPFB2 (activos CC0). Ver fig3d/LEEME.md. Archivo generado: no editar. */\n'
          'const FIG3D_DATA = {' + ',\n'.join(out) + '};\n')
    dst = ROOT / 'src' / 's3d-figuras-datos.js'
    dst.write_text(js)
    print(f'{dst}: {len(js) // 1024} KB, {len(CUERPOS)} cuerpos')


if __name__ == '__main__':
    main()
