/* Separa los maniquíes 3D (src/s3d-figuras-datos.js) en archivos .gz para la web app del servidor
   y escribe en la salida estándar la tabla FIG3D_DATA con sus direcciones. Lo usa build.sh server. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const [src, outDir] = process.argv.slice(2);
const ctx = {};
vm.runInNewContext(fs.readFileSync(src, 'utf8') + '\nthis.FIG3D_DATA = FIG3D_DATA;', ctx);
fs.mkdirSync(outDir, { recursive: true });
const out = {};
for (const [name, b64] of Object.entries(ctx.FIG3D_DATA)) {
  const bin = Buffer.from(b64, 'base64');
  fs.writeFileSync(path.join(outDir, name + '.gz'), bin);
  out[name] = `@fig/${name}.gz?v=${crypto.createHash('sha1').update(bin).digest('hex').slice(0, 10)}`;
}
process.stdout.write(`/* Maniquíes 3D (MakeHuman/MPFB2, CC0): en la web app viajan en app/fig/*.gz */\nconst FIG3D_DATA = ${JSON.stringify(out)};\n`);
