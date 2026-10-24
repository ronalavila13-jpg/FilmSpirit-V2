/* ============================================================
   FilmSpirit · conservar los maniquíes 3D al actualizar
   Uso (lo llama deploy/actualizar.sh):  node tools/maniquies.js <carpeta nueva> <carpeta instalada>
   Los maniquíes 3D (public/app/fig/*.gz y su tabla FIG3D_DATA dentro de app.js) se generan con
   src/s3d-figuras-datos.js, un archivo grande que no siempre viaja con el paquete. Si la versión nueva
   llega sin maniquíes y la instalada los tiene, se pasan los de la instalada a la nueva: los archivos,
   su tabla y la lista de trabajo sin conexión (sw.js). Si la nueva ya trae los suyos, no se toca nada.
   ============================================================ */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const [nueva, instalada] = process.argv.slice(2);
if (!nueva || !instalada) { console.error('Uso: node tools/maniquies.js <carpeta nueva> <carpeta instalada>'); process.exit(2); }
const gz = d => { try { return fs.readdirSync(d).filter(f => f.endsWith('.gz')); } catch { return []; } };
const TABLA = /FIG3D_DATA\s*=\s*(\{[^{}]*\})/;
// el código compacto puede dejar las claves sin comillas ({hombre:"@fig/…"}): se lee como objeto de JavaScript
const tabla = file => { try { const m = fs.readFileSync(file, 'utf8').match(TABLA); return m ? vm.runInNewContext('(' + m[1] + ')', {}, { timeout: 1000 }) : null; } catch { return null; } };

const appN = path.join(nueva, 'public', 'app'), appI = path.join(instalada, 'public', 'app');
const figN = path.join(appN, 'fig'), figI = path.join(appI, 'fig');
const tN = tabla(path.join(appN, 'app.js')), tI = tabla(path.join(appI, 'app.js'));
if (!tN) { console.error('  ✖ No encuentro la tabla de maniquíes en el app.js nuevo: no se toca nada.'); process.exit(1); }
if (Object.keys(tN).length && gz(figN).length) { console.log(`  la versión nueva trae sus ${gz(figN).length} maniquíes`); process.exit(0); }
if (!tI || !Object.keys(tI).length) { console.log('  ninguna de las dos versiones trae maniquíes detallados: se usa el maniquí simple'); process.exit(0); }
// cada maniquí de la tabla instalada debe tener su archivo
const falta = Object.values(tI).map(u => String(u).replace(/^@fig\//, '').replace(/\?.*$/, '')).filter(f => !fs.existsSync(path.join(figI, f)));
if (falta.length) { console.log(`  ⚠ A la versión instalada le faltan ${falta.length} archivos de maniquíes (${falta.slice(0, 3).join(', ')}…): la nueva usa el maniquí simple.`); process.exit(0); }

fs.mkdirSync(figN, { recursive: true });
for (const f of gz(figI)) fs.copyFileSync(path.join(figI, f), path.join(figN, f));
const appJs = path.join(appN, 'app.js');
fs.writeFileSync(appJs, fs.readFileSync(appJs, 'utf8').replace(TABLA, () => 'FIG3D_DATA=' + JSON.stringify(tI)));

// la lista de trabajo sin conexión, como la arma server/make.js (ahora con los maniquíes)
const plantilla = path.join(nueva, 'sw-plantilla.js');
if (fs.existsSync(plantilla)) {
  const pub = path.join(nueva, 'public'), files = [];
  const walk = (d, rel) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const r = rel + '/' + e.name; if (e.isDirectory()) walk(path.join(d, e.name), r); else if (e.name !== 'sw.js') files.push(r); } };
  walk(appN, '/app');
  const h = crypto.createHash('sha256');
  for (const f of files) h.update(f).update(fs.readFileSync(path.join(pub, f)));
  const core = ['/app/', ...files.filter(f => f !== '/app/index.html'), '/favicon.svg'];
  fs.writeFileSync(path.join(appN, 'sw.js'), fs.readFileSync(plantilla, 'utf8').replace('__VERSION__', h.digest('hex').slice(0, 12)).replace('__CORE__', JSON.stringify(core)));
}
console.log(`  se conservan los ${Object.keys(tI).length} maniquíes de la versión instalada`);
