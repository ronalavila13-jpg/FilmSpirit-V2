/* Guion técnico (Lista del storyboard): los colores de los grupos que se graban de una vez y «Un plano» por grupo
   (src/tab-board.js · shotTableHTML, src/v2-storyboard.js · v2SbColBtn).  node test/guion-tecnico-grupos.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const tb = fs.readFileSync(__dirname + '/../src/tab-board.js', 'utf8'), v2 = fs.readFileSync(__dirname + '/../src/v2-storyboard.js', 'utf8');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('cada plano de un grupo lleva su color (franja) y su etiqueta en la tabla', () => {
  assert.ok(/box-shadow:inset 4px 0 0 '\s*\+ g\.color/.test(tb), 'franja de color');
  assert.ok(/\$\{sbGrpChip\(sh, G\)\}<\/td>/.test(tb), 'etiqueta «+N» / «con 1.2»');
});
test('«Un plano» deja de cada grupo solo el plano más bajo; un clic en «+N» abre ese grupo', () => {
  const c = vm.createContext({ UI: { sbCol: '1', sbOpen: new Set() }, ls: { get: () => '' }, Set });
  vm.runInContext(/const sbColOn[^\n]*\n/.exec(tb)[0] + /const sbOpenSet[^\n]*\n/.exec(tb)[0] + /const sbColHidden[^\n]*\n/.exec(tb)[0] + '\nthis.h = sbColHidden;', c);
  const a = { id: 'a' }, b = { id: 'b' }, solo = { id: 's' }, g = { lead: a, members: [a, b] }, G = new Map([[a.id, g], [b.id, g]]);
  assert.strictEqual(c.h(a, G), false, 'el más bajo se ve');
  assert.strictEqual(c.h(b, G), true, 'el otro se esconde');
  assert.strictEqual(c.h(solo, G), false, 'un plano suelto se ve');
  c.UI.sbOpen.add('a');
  assert.strictEqual(c.h(b, G), false, 'abierto, se ve');
  c.UI.sbCol = '';
  c.UI.sbOpen.clear();
  assert.strictEqual(c.h(b, G), false, 'con «Todos», se ven todos');
});
test('el conteo de la barra cuenta un plano por grupo y el botón «Grupos» está en la Lista', () => {
  assert.ok(/UI\.sbView === 'table' \? every\.filter\(x => !sbColHidden\(x, G\)\) : every/.test(v2));
  assert.ok(/UI\.sbView === 'table' \? v2SbColBtn\(\) : v2SbOrdBtn\(\)/.test(v2));
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
