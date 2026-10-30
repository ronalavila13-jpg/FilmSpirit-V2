/* Elegir una escena en la lista del Guion la marca en amarillo al instante (src/v2-guion.js).  node test/v2-escena-marca.test.js */
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../src/v2-guion.js', 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('«ed-goto» marca la escena y muestra sus notas sin esperar al desplazamiento', () => {
  const m = /ACT\['ed-goto'\] = function \(b\) \{([\s\S]*?)\n  \};/.exec(src);
  assert.ok(m, 'no envuelve ed-goto');
  assert.ok(/UI\.scene = \+b\.dataset\.i/.test(m[1]) && /setAttribute\('aria-current'/.test(m[1]) && /v2GuionSide\(\)/.test(m[1]));
});
test('el desplazamiento que provoca el salto no cambia la escena; quien se desplaza o toca la hoja vuelve a mandar', () => {
  assert.ok(/performance\.now\(\) < V2_HOLD\) return;/.test(src), 'v2EdFollow respeta el salto');
  assert.ok(/for \(const ev of \['wheel', 'touchstart', 'pointerdown'\]\) sc\.addEventListener\(ev, \(\) => \{ V2_HOLD = 0; \}/.test(src));
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
