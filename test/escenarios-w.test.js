/* Lote W · escenarios: la escala del escenario (importados, planos de planta y, por locación, la calle y los paisajes).
   (lote AD) El constructor de escenarios y la réplica se quitaron: sus pruebas también. Sin navegador.
   node test/escenarios-w.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const J = a => JSON.parse(JSON.stringify(a));
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.stack.split('\n').slice(0, 3).join('\n   ')); } };

const c = { Math, console, JSON, Map, Set, WeakMap, Object, Array, Number, String, isFinite, Infinity };
vm.createContext(c);
vm.runInContext(`var P = { meta: {}, shots: {}, sets3d: {}, plans: {} };`, c);
for (const f of ['escenarios-escala']) vm.runInContext(fs.readFileSync(R + '/src/' + f + '.js', 'utf8'), c, { filename: f + '.js' });
const X = vm.runInContext('({ set3dNormalize, escClamp, escOf, envEscOf, sceneEsc, escLocSet, ENV_ESC_SETS })', c);

test('escala: entre 25 % y 400 %; 100 % no se guarda', () => {
  assert.strictEqual(X.escClamp(1.234), 1.23); assert.strictEqual(X.escClamp(9), 4); assert.strictEqual(X.escClamp(.01), .25); assert.strictEqual(X.escClamp('x'), 1);
  assert.strictEqual(X.escOf({}), 1); assert.strictEqual(X.escOf({ esc: 1.5 }), 1.5); assert.strictEqual(X.escOf(null), 1);
  const Px = { sets3d: { a: { id: 'a', n: 'Bar', esc: 1 }, b: { id: 'b', n: 'Casa', esc: 7 }, c: { id: 'c', n: 'Patio', esc: .5 } }, plans: { p: { id: 'p', esc: '2' } }, envEsc: { 'CALLE|calle': 1.5, 'X|int': 2, 'Y|calle': 1, malo: 3 } };
  X.set3dNormalize(Px);
  assert.ok(!('esc' in Px.sets3d.a)); assert.strictEqual(Px.sets3d.b.esc, 4); assert.strictEqual(Px.sets3d.c.esc, .5);
  assert.strictEqual(Px.plans.p.esc, 2);
  assert.deepStrictEqual(J(Px.envEsc), { 'CALLE|calle': 1.5 }, 'la habitación no se escala; 100 % y claves raras se van');
});
test('escala de la calle: por locación; la habitación y el vehículo no', () => {
  c.P.envEsc = { 'AV. ESPAÑA|calle': 1.5 };
  const s3 = { set: 'calle', objs: [], keys: [] };
  X.escLocSet(s3, 'AV. ESPAÑA');
  assert.strictEqual(X.envEscOf(s3), 1.5); assert.strictEqual(X.sceneEsc(s3), 1.5);
  const otra = X.escLocSet({ set: 'calle', objs: [], keys: [] }, 'JR. PIZARRO');
  assert.strictEqual(X.envEscOf(otra), 1, 'otra locación, su propia calle');
  assert.strictEqual(X.envEscOf(X.escLocSet({ set: 'int' }, 'AV. ESPAÑA')), 1);
  assert.ok(!X.ENV_ESC_SETS.includes('auto') && !X.ENV_ESC_SETS.includes('int'));
  c.P.envEsc = undefined;
});
test('escala de un escenario 3D importado y de un plano de planta', () => {
  c.P.sets3d = { e1: { id: 'e1', n: 'Bar', esc: 2 } }; c.P.plans = { p1: { id: 'p1', esc: .5 } };
  vm.runInContext('var set3dOf = s3 => s3 && s3.set === "modelo" && P.sets3d[s3.set3d] || null; var planOf = s3 => s3 && s3.set === "plano" && P.plans[s3.planId] || null;', c);
  assert.strictEqual(X.sceneEsc({ set: 'modelo', set3d: 'e1' }), 2);
  assert.strictEqual(X.sceneEsc({ set: 'plano', planId: 'p1' }), .5);
  assert.strictEqual(X.sceneEsc({ set: 'modelo', set3d: 'no' }), 1);
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien.');
process.exitCode = fail ? 1 : 0;
