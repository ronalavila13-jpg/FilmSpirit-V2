/* Arreglos menores de la revisión: Fountain, número de una escena nueva, fechas del calendario y el DOOD en inglés.
   node test/menores.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/../src/';
const noop = () => { };
function ctx(files) {
  const c = {
    console, addEventListener: noop, document: { addEventListener: noop }, window: {}, matchMedia: () => ({ matches: false }),
    debounce: f => f, ls: { get: (k, d) => d, set: noop }, UI: {}, ACT: {}, BIND: {}, RENDER: {}, SETTINGS: {}, HELP: {}, EXPORTS: {}, EN: false, $: () => null, $$: () => [],
  };
  vm.createContext(c);
  for (const f of files) vm.runInContext(fs.readFileSync(R + f, 'utf8'), c, { filename: f });
  return c;
}
const C = require('../src/core.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const J = o => JSON.parse(JSON.stringify(o));

/* ---------- Fountain ---------- */
test('Fountain: un archivo con muchas notas sin cerrar se lee al instante', () => {
  const t = 'INT. CASA - DIA\n\nAna corre.' + ' [[ x'.repeat(200000) + ' /* y'.repeat(50000);
  const t0 = Date.now(); C.parseFountain(t);
  assert.ok(Date.now() - t0 < 1500, (Date.now() - t0) + ' ms');
});
test('Fountain: comentarios y notas cerrados se quitan; uno sin cerrar deja el texto', () => {
  const xs = C.parseFountain('INT. CASA - DIA\n\nAna /* nota */corre [[otra]]rápido.\n\nJuan [[sin cierre llega.').paras.map(p => p.x);
  assert.deepStrictEqual(xs, ['INT. CASA - DIA', 'Ana corre rápido.', 'Juan [[sin cierre llega.']);
});
test('Fountain: los guiones bajos dentro de una palabra no se comen', () => {
  const xs = C.parseFountain('INT. CASA - DIA\n\nAbre MI_ARCHIVO_FINAL.').paras.map(p => p.x);
  assert.strictEqual(xs[1], 'Abre MI_ARCHIVO_FINAL.');
});
test('Fountain: negrita, cursiva y subrayado se conservan al importar', () => {
  const c = ctx(['core.js', 'guion-formato.js']);
  const p = vm.runInContext('parseFountain', c)('INT. CASA - DIA\n\nJuan **corre** y _grita_ en MI_ARCHIVO, *rápido* \\*.', { keepEmph: true }).paras[1];
  const q = J(vm.runInContext('fmtFromFountain', c)(p));
  assert.strictEqual(q.x, 'Juan corre y grita en MI_ARCHIVO, rápido *.');
  const at = (k, w) => (q.fm[k] || []).some(([a, b]) => q.x.slice(a, b) === w);
  assert.ok(at('b', 'corre') && at('u', 'grita') && at('i', 'rápido'), JSON.stringify(q.fm));
});

/* ---------- escena nueva al final ---------- */
test('escena nueva al final: no toma el número de una escena borrada que dejó datos', () => {
  const c = ctx(['core.js', 'guion-editor.js']);
  c.P = { paras: [{ t: 'h', x: 'INT. A - DIA', n: '1' }, { t: 'h', x: 'INT. B - DIA', n: '2' }, { t: 'h', x: '', n: '' }],
    scenes: { 1: {}, 3: { synopsis: 'de la escena 3, ya borrada' } }, schedule: { items: [], gone: { 4: { k: '4' } } }, shots: {} };
  assert.strictEqual(vm.runInContext('edNewKey(2)', c), '5');
  c.P.scenes = {}; c.P.schedule.gone = {};
  assert.strictEqual(vm.runInContext('edNewKey(2)', c), '3', 'sin datos sueltos, sigue el siguiente');
});
test('escena nueva entre dos con el guion bloqueado: la letra tampoco se reusa', () => {
  const c = ctx(['core.js', 'guion-editor.js']);
  c.scriptLock = () => ({});
  c.P = { paras: [{ t: 'h', x: 'A', n: '1' }, { t: 'h', x: '', n: '' }, { t: 'h', x: 'B', n: '2' }], scenes: {}, schedule: { items: [] }, shots: { s1: { sc: '1A' } } };
  assert.strictEqual(vm.runInContext('edNewKey(1)', c), '1B');
});

/* ---------- calendario ---------- */
test('calendario: un año mal escrito no estira el tramo a miles de días', () => {
  const c = ctx(['core.js', 'tab-cal.js']);
  c.calShoot = () => [];
  c.P = { calendar: { tasks: [{ id: 't1', start: '2026-10-01', end: '2026-10-20' }, { id: 't2', start: '2026-11-03', end: '2206-11-05' }, { id: 't3', start: '0002-01-01', end: '0002-01-02' }] } };
  const r = vm.runInContext('calRange()', c);
  assert.ok(r.n < 2400, r.n + ' días');
  assert.ok(r.a <= '2026-10-01' && r.b >= '2026-11-03', r.a + ' → ' + r.b);
});
test('calendario: un proyecto viejo se sigue viendo en sus fechas', () => {
  const c = ctx(['core.js', 'tab-cal.js']);
  c.calShoot = () => [];
  c.P = { calendar: { tasks: [{ id: 't1', start: '2015-03-02', end: '2015-04-10' }] } };
  const r = vm.runInContext('calRange()', c);
  assert.ok(r.a <= '2015-03-02' && r.b >= '2015-04-10' && r.n < 200, r.a + ' → ' + r.b + ' (' + r.n + ')');
});

/* ---------- DOOD en inglés ---------- */
test('DOOD en inglés: la columna del último día dice «D»', () => {
  const s = fs.readFileSync(R + 'plan-dood.js', 'utf8');
  assert.ok(!/:\s*'J'\s*\+\s*\(r\.(first|last)\.n/.test(s), 'queda una «J» fija');
});

console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
