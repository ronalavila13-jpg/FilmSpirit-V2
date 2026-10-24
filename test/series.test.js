/* series de TV: episodios dentro de un proyecto, numeración 101-12, bloques. node test/series.test.js */
const C = require('../src/core.js'), assert = require('assert');
const h = (n, x, ep) => { const o = { t: 'h', x }; if (n) o.n = n; if (ep) o.ep = ep; return o; }, a = x => ({ t: 'a', x });
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.stack); } };
const keys = P => C.computeScenes(P.paras).scenes.map(s => s.key);

test('una película sigue igual (sin episodios)', () => {
  const sc = C.computeScenes([h(null, 'INT. A - DIA'), a('x'), h(null, 'EXT. B - NOCHE')]);
  assert.deepStrictEqual(sc.scenes.map(s => s.key), ['1', '2']);
  assert.deepStrictEqual(sc.eps, []);
  assert.strictEqual(sc.scenes[0].ep, '');
});
test('sin números fijados, cada episodio numera desde 1 con su número delante', () => {
  const sc = C.computeScenes([h(null, 'INT. A - DIA', '101'), h(null, 'INT. B - DIA'), h(null, 'INT. C - DIA', '102'), h(null, 'INT. A - DIA')]);
  assert.deepStrictEqual(sc.scenes.map(s => s.key), ['101-1', '101-2', '102-1', '102-2']);
  assert.deepStrictEqual(sc.scenes.map(s => s.ep), ['101', '101', '102', '102']);
  assert.deepStrictEqual(sc.eps.map(e => [e.n, e.s0, e.s1]), [['101', 0, 2], ['102', 2, 4]]);
});
test('convertir en serie: las escenas toman el número del episodio y lo de cada una la sigue', () => {
  const P = C.newProject('t', [h('1', 'INT. A - DIA'), a('a'), h('2', 'INT. B - DIA'), a('b'), h('2A', 'EXT. C - NOCHE')]);
  P.scenes = { 2: { synopsis: 'B' } };
  P.schedule.items = [{ k: '2A' }, { d: 'd1' }, { k: '1' }];
  P.shots = { s1: { id: 's1', sc: '2', p0: 3, p1: 3 } };
  P.notes = { n1: { id: 'n1', on: { t: 'scene', id: '1' } } };
  C.epConvert(P, '101');
  assert.deepStrictEqual(keys(P), ['101-1', '101-2', '101-2A']);
  assert.strictEqual(P.scenes['101-2'].synopsis, 'B');
  assert.deepStrictEqual(P.schedule.items.map(x => x.k || x.d), ['101-2A', 'd1', '101-1']);
  assert.strictEqual(P.shots.s1.sc, '101-2');
  assert.strictEqual(P.notes.n1.on.id, '101-1');
  assert.ok(C.isSeries(P));
});
test('agregar un episodio desde un archivo: sus números van con el episodio delante; el primero se vuelve episodio', () => {
  const P = C.newProject('t', [h(null, 'INT. A - DIA'), a('a'), h(null, 'INT. B - DIA')]);
  P.scenes = { 2: { synopsis: 'B' } };
  const at = C.epAppend(P, [{ t: 'tr', x: 'FADE IN:' }, h('1', 'INT. CASA - DIA'), a('c'), h('2', 'EXT. CALLE - NOCHE')], '102', 'El regreso', '101');
  assert.strictEqual(at, 3);
  assert.deepStrictEqual(keys(P), ['101-1', '101-2', '102-1', '102-2']);
  assert.strictEqual(P.scenes['101-2'].synopsis, 'B');
  assert.strictEqual(C.epTitle(P, '102'), 'El regreso');
  assert.strictEqual(C.epLabel(P, '102'), 'Episodio 102 · El regreso');
  // un archivo sin números: se numeran 1, 2…
  C.epAppend(P, [h(null, 'INT. X - DIA'), h(null, 'INT. Y - DIA')], '103');
  assert.deepStrictEqual(keys(P).slice(4), ['103-1', '103-2']);
});
test('cambiar el número de un episodio lleva sus escenas, su título y su plan', () => {
  const P = C.newProject('t', [h(null, 'INT. A - DIA', '1'), h(null, 'INT. B - DIA', '2'), h(null, 'INT. C - DIA')]);
  C.epApply(P);
  C.epSetTitle(P, '2', 'Dos');
  P.schedule.items = [{ k: '2-2', t: '08:00' }];
  assert.ok(C.epRenum(P, '2', '202'));
  assert.deepStrictEqual(keys(P), ['1-1', '202-1', '202-2']);
  assert.strictEqual(P.schedule.items[0].k, '202-2');
  assert.strictEqual(C.epTitle(P, '202'), 'Dos');
  assert.strictEqual(C.epTitle(P, '2'), '');
  assert.strictEqual(C.epRenum(P, '202', '1'), null, 'no se repite un número de episodio');
});
test('renumerar un episodio 1, 2, 3 sin tocar los otros (intercambia sin perder datos)', () => {
  const P = C.newProject('t', [h('101-3', 'INT. A - DIA', '101'), h('101-1', 'INT. B - DIA'), h('102-7', 'INT. C - DIA', '102')]);
  P.scenes = { '101-3': { synopsis: 'A' }, '101-1': { synopsis: 'B' } };
  C.epApply(P, null, ['101']);
  assert.deepStrictEqual(keys(P), ['101-1', '101-2', '102-7']);
  assert.strictEqual(P.scenes['101-1'].synopsis, 'A');
  assert.strictEqual(P.scenes['101-2'].synopsis, 'B');
});
test('unir un episodio con el anterior: sus escenas siguen la numeración del anterior si chocan', () => {
  const P = C.newProject('t', [h(null, 'INT. A - DIA', '1'), h(null, 'INT. B - DIA'), h(null, 'INT. C - DIA', '2')]);
  C.epApply(P);
  P.scenes = { '2-1': { synopsis: 'C' } };
  C.epApply(P, () => { delete P.paras[2].ep; });
  assert.deepStrictEqual(keys(P), ['1-1', '1-2', '1-3']);
  assert.strictEqual(P.scenes['1-3'].synopsis, 'C');
});
test('cada episodio empieza en página nueva', () => {
  const paras = [h(null, 'INT. A - DIA', '1'), a('a'), h(null, 'INT. B - DIA', '2'), a('b')];
  const pages = C.layoutScript(paras);
  assert.strictEqual(pages.length, 2);
  assert.strictEqual(pages[1].find(l => !l.blank).p, 2);
});
test('episodios de cada elemento (fijo o invitado)', () => {
  const sc = C.computeScenes([h(null, 'INT. A - DIA', '1'), h(null, 'INT. B - DIA', '2'), h(null, 'INT. C - DIA')]);
  const sem = [new Set(['ana', 'casa']), new Set(['ana']), new Set(['luis'])];
  assert.deepStrictEqual(C.elEpisodes(sc, sem), { ana: ['1', '2'], casa: ['1'], luis: ['2'] });
});
test('Fountain: «# Episodio 101: Piloto» marca el episodio y su título (ida y vuelta)', () => {
  const r = C.parseFountain('Title: Serie\n\n# Episodio 101: Piloto\n\nINT. CASA - DIA #101-1#\n\nAlgo pasa.\n\nEXT. CALLE - NOCHE\n\n# Episodio 102\n\nINT. BAR - NOCHE\n\nOtro.\n');
  const sc = C.computeScenes(r.paras);
  assert.deepStrictEqual(sc.scenes.map(s => s.key), ['101-1', '101-2', '102-1']);
  assert.deepStrictEqual(r.epTitles, { 101: 'Piloto' });
});
if (fail) { console.log(`\n${fail} pruebas fallaron`); process.exit(1); }
console.log('\nTodas las pruebas de series pasaron');
