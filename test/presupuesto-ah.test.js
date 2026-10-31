/* Lote AH · presupuesto: al cambiar una línea, el total general de la cabecera, el resumen y «Por partida» se recalculan
   en el momento (antes refreshBudgetTotals buscaba «.bud .total», que la cabecera nueva ya no tiene, y esos montos no
   cambiaban hasta salir y volver a la pestaña).  node test/presupuesto-ah.test.js */
const assert = require('assert'), fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(R, 'src/tab-budget.js'), 'utf8').replace(/\r\n/g, '\n');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const fn = name => { const m = new RegExp(`function ${name}\\([\\s\\S]*?\\n}\\n`).exec(src); assert.ok(m, name + ' está'); return m[0]; };

test('refreshBudgetTotals rehace la cabecera (el total general) y el resumen con «Por partida»', () => {
  const f = fn('refreshBudgetTotals');
  assert.ok(!/\$\(['"]\.bud \.total/.test(f), 'ya no busca «.bud .total»');
  assert.ok(/\.bud-hd[\s\S]*budHeadHTML\(/.test(f), 'la cabecera con el total');
  assert.ok(/\.bud-top[\s\S]*budTopHTML\(/.test(f), 'el resumen y las barras');
});
test('la pestaña y el refresco arman el resumen con la misma función', () => {
  const r = /RENDER\.budget = function[\s\S]*?\n};/.exec(src)[0];
  assert.ok(/<div class="bud-top">\$\{budTopHTML\(T, st, fx\)\}<\/div>/.test(r));
  assert.ok(/<section class="hd bud-hd"/.test(fn('budHeadHTML')), 'la cabecera se encuentra por su clase');
});
test('cada campo de una línea (al escribir y al salir) llama al refresco', () => {
  const b = /\n  bu: \(el, ev\) => \{[\s\S]*?\n  \},/.exec(src)[0];
  assert.ok(/refreshBudgetTotals\(\);\s*\n  \},$/.test(b));
});
if (fail) { console.log(fail + ' fallan'); process.exit(1); } else console.log('todas bien');
