/* ============================================================
   FilmSpirit · conservar al actualizar las librerías que el paquete nuevo no trae
   Uso (lo llama deploy/actualizar.sh):  node tools/librerias.js <carpeta nueva> <carpeta instalada>
   El lector de PDF para importar guiones (public/app/lib/pdf.min.js y pdf.worker.min.js, PDF.js 3.11.174) lo copia
   server/make.js desde npm. Si el paquete se armó sin él (sin conexión a npm) y la versión instalada lo tiene, se pasa
   el de la instalada a la nueva, con sus copias comprimidas, y se rehace la lista de trabajo sin conexión (sw.js),
   como hace tools/maniquies.js con los maniquíes. Si la nueva ya lo trae, no se toca nada.
   ============================================================ */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const [nueva, instalada] = process.argv.slice(2);
if (!nueva || !instalada) { console.error('Uso: node tools/librerias.js <carpeta nueva> <carpeta instalada>'); process.exit(2); }
const LIBS = ['pdf.min.js', 'pdf.worker.min.js'];
const ZCOPY = /\.(js|css|json|svg|txt|xml|webmanifest)\.(br|gz)$/;   // las copias comprimidas de make.js (los maniquíes fig/*.gz sí cuentan)
const libN = path.join(nueva, 'public', 'app', 'lib'), libI = path.join(instalada, 'public', 'app', 'lib');
const falta = LIBS.filter(f => !fs.existsSync(path.join(libN, f)));
if (!falta.length) { console.log('  la versión nueva trae el lector de PDF'); process.exit(0); }
const hay = falta.filter(f => fs.existsSync(path.join(libI, f)));
if (hay.length < falta.length) {
  console.log(`  ⚠ Ni la versión nueva ni la instalada tienen ${falta.filter(f => !hay.includes(f)).join(' y ')}: importar guiones en PDF no funcionará hasta agregarlos (node server/make.js con npm).`);
  if (!hay.length) process.exit(0);
}
fs.mkdirSync(libN, { recursive: true });
for (const f of hay) for (const x of [f, f + '.br', f + '.gz']) if (fs.existsSync(path.join(libI, x))) fs.copyFileSync(path.join(libI, x), path.join(libN, x));

// la lista de trabajo sin conexión, como la arma server/make.js (ahora con el lector de PDF)
const plantilla = path.join(nueva, 'sw-plantilla.js'), appN = path.join(nueva, 'public', 'app');
if (fs.existsSync(plantilla)) {
  const pub = path.join(nueva, 'public'), files = [];
  const walk = (d, rel) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const r = rel + '/' + e.name; if (e.isDirectory()) walk(path.join(d, e.name), r); else if (e.name !== 'sw.js' && !ZCOPY.test(e.name)) files.push(r); } };
  walk(appN, '/app');
  const h = crypto.createHash('sha256');
  for (const f of files) h.update(f).update(fs.readFileSync(path.join(pub, f)));
  const core = ['/app/', ...files.filter(f => f !== '/app/index.html'), '/favicon.svg'];
  const sw = fs.readFileSync(plantilla, 'utf8').replace('__VERSION__', h.digest('hex').slice(0, 12)).replace('__CORE__', JSON.stringify(core));
  fs.writeFileSync(path.join(appN, 'sw.js'), sw);
  for (const z of ['sw.js.br', 'sw.js.gz']) fs.rmSync(path.join(appN, z), { force: true });   // las copias viejas ya no sirven
}
console.log(`  se conserva el lector de PDF de la versión instalada (${hay.join(', ')})`);
