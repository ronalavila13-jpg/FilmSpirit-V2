/* números de escena: al actualizar el guion o renumerar, todo sigue a su escena. node test/escenas.test.js */
const C = require('../src/core.js'), assert = require('assert');
const h = (n, x) => ({ t: 'h', x, n }), a = x => ({ t: 'a', x });
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('una escena nueva antes de B (el archivo renumera 2→3, 3→4): el desglose y la nota de B siguen a B', () => {
  const P = C.newProject('t', [h('1', 'INT. A - DIA'), a('aaa'), h('2', 'INT. B - DIA'), a('bbb'), h('3', 'INT. C - DIA'), a('ccc')]);
  P.scenes = { 2: { synopsis: 'syn B' }, 3: { synopsis: 'syn C' } };
  P.elements = { e1: { id: 'e1', cat: 'equip', name: 'Grúa (de B)', auto: false } };
  P.tags = [{ id: 't1', el: 'e1', p: -1, sc: '2', s: 0, e: 0 }];
  P.notes = { n1: { id: 'n1', on: { t: 'scene', id: '2' }, x: 'nota sobre B' } };
  C.remapProject(P, [h('1', 'INT. A - DIA'), a('aaa'), h('2', 'INT. NUEVA - NOCHE'), a('nnn'), h('3', 'INT. B - DIA'), a('bbb'), h('4', 'INT. C - DIA'), a('ccc')]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(P.scenes)), { 3: { synopsis: 'syn B' }, 4: { synopsis: 'syn C' } });
  assert.strictEqual(P.tags[0].sc, '3');
  assert.strictEqual(P.notes.n1.on.id, '3');
});
test('se agrega una escena y se borra otra: C no toma la sinopsis ni la fila del plan de la escena borrada', () => {
  const P = C.newProject('t', [h('1', 'INT. A - DIA'), a('a'), h('2', 'INT. B - DIA'), a('b'), h('3', 'INT. C - DIA'), a('c'), h('4', 'INT. D - DIA'), a('d')]);
  P.scenes = { 3: { synopsis: 'syn C' }, 4: { synopsis: 'syn D' } };
  P.schedule.items = [{ k: '3', t: '15:00', loc: 'Casa de C' }, { k: '4', t: '08:00', loc: 'Casa de D' }];
  P.notes = { n4: { id: 'n4', on: { t: 'scene', id: '4' }, x: 'nota de D' } };
  C.remapProject(P, [h('1', 'INT. A - DIA'), a('a'), h('2', 'INT. B - DIA'), a('b'), h('3', 'INT. NUEVA - DIA'), a('n'), h('4', 'INT. C - DIA'), a('c')]);
  assert.strictEqual(P.scenes['4'].synopsis, 'syn C');
  const rows = P.schedule.items.filter(it => it.k === '4');
  assert.strictEqual(rows.length, 1); assert.strictEqual(rows[0].loc, 'Casa de C');
  assert.notStrictEqual(P.notes.n4.on.id, '4', 'la nota de la escena borrada no pasa a C');
});
test('renumerar con datos viejos de una escena borrada: no se mezclan', () => {
  const P = { scenes: { 1: { synopsis: 'uno' }, 3: { synopsis: 'vieja, de una escena borrada' }, 5: { synopsis: 'cinco' } }, schedule: { items: [{ k: '5' }, { k: '3', t: '07:00' }] }, shots: { s: { sc: '5' }, z: { sc: '3' } }, tags: [{ p: -1, sc: '5' }], notes: {} };
  C.sceneRename(P, { 1: '1', 5: '3' });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(P.scenes)), { 1: { synopsis: 'uno' }, 3: { synopsis: 'cinco' } });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(P.schedule.items)), [{ k: '3' }]);
  assert.strictEqual(P.shots.s.sc, '3'); assert.strictEqual(P.shots.z.sc, '~3');
  assert.strictEqual(P.tags[0].sc, '3');
});
console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
