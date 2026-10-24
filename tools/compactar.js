/* Compacta el código de la app (sin espacios ni comentarios; conserva los nombres).
   Uso: node tools/compactar.js < entrada.js > salida.js   (lo llama build.sh; FS_NOMIN=1 lo omite) */
'use strict';
const { transformSync } = require('esbuild');
let src = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { src += d; });
process.stdin.on('end', () => {
  const r = transformSync(src, { loader: 'js', minifyWhitespace: true, minifySyntax: true, legalComments: 'none', charset: 'utf8' });
  process.stdout.write(r.code);
});
