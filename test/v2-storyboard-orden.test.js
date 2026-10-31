/* Storyboard v2, orden «Color» (src/v2-storyboard.js · v2SbOrd): cada grupo que se graba de una vez va junto, en el lugar de
   su plano más bajo; un plano suelto de número menor sigue delante.  node test/v2-storyboard-orden.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../src/v2-storyboard.js', 'utf8');
const body = /function v2SbOrd\(shots\) \{[\s\S]*?\n\}\n/.exec(src)[0];
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

// shots: ids en orden; groups: listas de ids que se graban juntos
function order(ids, groups, mode = 'grupo') {
  const sh = Object.fromEntries(ids.map(id => [id, { id }])), G = new Map();
  for (const g of groups) { const o = { members: g.map(id => sh[id]) }; for (const id of g) G.set(id, o); }
  const c = vm.createContext({ shotGroups: () => G, v2SbSort: () => mode, Set, Map });
  vm.runInContext(body + '\nthis.f = v2SbOrd;', c);
  return Array.from(c.f(ids.map(id => sh[id])), x => x.id);   // (Array.from: el arreglo viene de otro contexto de vm)
}

test('un plano suelto de número menor va delante del grupo (la captura: 1.1, 1.2+1.3)', () => {
  assert.deepStrictEqual(order(['1.1', '1.2', '1.3'], [['1.2', '1.3']]), ['1.1', '1.2', '1.3']);
});
test('un grupo con el plano más bajo va en su lugar, con los suyos juntos, y los sueltos después por número', () => {
  assert.deepStrictEqual(order(['1.1', '1.2', '1.3', '1.4'], [['1.1', '1.3']]), ['1.1', '1.3', '1.2', '1.4']);
});
test('varios grupos y sueltos: cada uno en el lugar de su número más bajo', () => {
  assert.deepStrictEqual(order(['1.1', '1.2', '1.3', '1.4', '1.5', '1.6'], [['1.2', '1.5'], ['1.4', '1.6']]), ['1.1', '1.2', '1.5', '1.3', '1.4', '1.6']);
});
test('el orden «Número» y sin grupos no cambian nada', () => {
  assert.deepStrictEqual(order(['1.1', '1.2', '1.3'], [['1.1', '1.3']], 'num'), ['1.1', '1.2', '1.3']);
  assert.deepStrictEqual(order(['1.1', '1.2', '1.3'], []), ['1.1', '1.2', '1.3']);
});

if (fail) { console.log(fail + ' fallas'); process.exit(1); }
console.log('todo bien');
