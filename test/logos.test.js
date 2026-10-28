/* Logos y planos de planta (lote T): solo imágenes incrustadas. Una dirección cualquiera haría que la app la pida
   (en el escritorio, file://servidor/… abre una conexión de red de Windows).  node test/logos.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
const c = { Math, Promise, Map, document: {} };
vm.createContext(c);
vm.runInContext(fs.readFileSync(R + '/src/imagenes.js', 'utf8') + '\nObject.assign(globalThis, { imgDataOk, pdfImgSrc });', c);
const ok = ['data:image/png;base64,iVBORw0KGgo=', 'data:image/webp;base64,UklGRg==', 'data:image/jpeg;base64,/9j/4AAQ'];
const bad = ['file://servidor/recurso/x.png', '\\\\servidor\\recurso\\x.png', '/api/p/123', 'https://evil.example/x.png', 'javascript:alert(1)',
  'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PGI+', 'data:image/png;base64,AAAA" onerror="x', '', null, 42, { toString: () => 'file://x/y' }];
for (const u of ok) { assert.strictEqual(c.imgDataOk(u), u, u); assert.strictEqual(c.pdfImgSrc(u), u); }
for (const u of bad) { assert.strictEqual(c.imgDataOk(u), '', String(u)); assert.strictEqual(c.pdfImgSrc(u) || '', '', String(u)); }
// los sitios que muestran logos y planos pasan por imgDataOk
const src = f => fs.readFileSync(R + '/src/' + f, 'utf8');
assert.ok(!/<img src="\$\{esc\((M\.projLogo|M\.logo|M\[k\]|P\.meta\.logo)\)\}"/.test(src('tab-project.js') + src('tab-breakdown.js')), 'logo sin imgDataOk');
assert.ok(/im\.src = imgDataOk\(pl\.img\)/.test(src('floorplan.js')), 'plano sin imgDataOk');
assert.ok(/imgDataOk\(Px\.meta\[k\]\)/.test(src('proyectos.js')) && /imgDataOk\(pl\.img\)/.test(src('proyectos.js')), 'sanitizeProject no limpia logos y planos');
console.log('ok   logos y planos: solo imágenes incrustadas');
