/* Guardado y fusión de los proyectos compartidos (src/share.js), con el código real en un contexto aislado.
   node test/compartir.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/../src/';
const noop = () => { };
function ctx() {
  const c = {
    console, JSON, Math, Date, Object, Array, String, Number, Set, Map, Promise, setTimeout, clearTimeout, RegExp, Error, isFinite, parseFloat,
    Int32Array, Uint16Array, addEventListener: noop, document: { addEventListener: noop }, window: {}, matchMedia: () => ({ matches: false }),
    $: () => null, $$: () => [], toast: noop, derive: noop, render: noop, UI: { tab: 'script' }, CLIENT: 'c1', DESK: null, TARGET: 'server',
    debounce: f => f, ls: { get: (k, d) => d, set: noop }, __saves: [],
  };
  vm.createContext(c);
  for (const f of ['core.js', 'areas.js', 'share.js']) vm.runInContext(fs.readFileSync(R + f, 'utf8'), c, { filename: f });
  vm.runInContext(`var APITEAM = { on(){}, async save(pid, s, json) { __saves.push([pid, s, json]); await new Promise(r => setTimeout(r, 5)); return { ver: 1 }; } };`, c);
  return c;
}
const tests = [];
const test = (n, f) => tests.push([n, f]);

/* ---------- la fusión del guion, párrafo por párrafo ---------- */
const c0 = ctx();
const merge3 = (b, l, r) => JSON.parse(JSON.stringify(vm.runInContext('merge3', c0)(b, l, r)));
const g = xs => ({ meta: { title: 'X' }, paras: xs.map(x => ({ t: 'a', x })) });
const xs = o => o.paras.map(p => p.x);
test('guion: cada persona cambió un párrafo distinto → quedan los dos cambios', () => {
  assert.deepStrictEqual(xs(merge3(g(['uno', 'dos', 'tres']), g(['UNO', 'dos', 'tres']), g(['uno', 'dos', 'TRES']))), ['UNO', 'dos', 'TRES']);
});
test('guion: una persona agrega, la otra borra en otro lugar', () => {
  assert.deepStrictEqual(xs(merge3(g(['a', 'b', 'c', 'd']), g(['a', 'a2', 'b', 'c', 'd']), g(['a', 'b', 'c']))), ['a', 'a2', 'b', 'c']);
});
test('guion: las dos cambiaron el mismo párrafo → gana lo local, y lo demás se fusiona', () => {
  assert.deepStrictEqual(xs(merge3(g(['a', 'b', 'x', 'c']), g(['a', 'B local', 'x', 'c']), g(['a', 'B remoto', 'x', 'C']))), ['a', 'B local', 'x', 'C']);
});
test('guion: el mismo cambio en los dos lados no se duplica', () => {
  assert.deepStrictEqual(xs(merge3(g(['a', 'b']), g(['a', 'b', 'nuevo']), g(['a', 'b', 'nuevo']))), ['a', 'b', 'nuevo']);
});
test('guion: los dos agregan en el mismo lugar → quedan ambos (primero lo local)', () => {
  assert.deepStrictEqual(xs(merge3(g(['a', 'z']), g(['a', 'mío', 'z']), g(['a', 'suyo', 'z']))), ['a', 'mío', 'suyo', 'z']);
  assert.deepStrictEqual(xs(merge3(g(['a']), g(['a', 'mío']), g(['a', 'suyo']))), ['a', 'mío', 'suyo']);
});
test('listas con id: sigue la fusión por id', () => {
  const b = [{ id: 'x', v: 1 }, { id: 'y', v: 1 }], l = [{ id: 'x', v: 2 }, { id: 'y', v: 1 }], r = [{ id: 'x', v: 1 }, { id: 'y', v: 3 }];
  assert.deepStrictEqual(merge3(b, l, r), [{ id: 'x', v: 2 }, { id: 'y', v: 3 }]);
});

/* ---------- el guardado no cambia de proyecto a la mitad ---------- */
const st = (pid, title, el, more) => ({
  pid, title, admin: true, me: { id: 'u1', name: 'Yo', role: 'Producción' }, perms: {}, read: ['guion', 'desglose', 'storyboard', 'animatic', 'plan', 'calendario', 'presupuesto', 'llamado', 'hoja'],
  sections: { guion: { json: JSON.stringify({ meta: { title }, paras: [{ t: 'a', x: title + ' texto' }] }) }, desglose: { json: JSON.stringify({ elements: { [el]: { id: el, cat: 'props', name: title + ' prop' } }, tags: [], scenes: {} }) } }, ...more,
});
test('un guardado en curso de A termina en A aunque se abra B', async () => {
  const c = ctx();
  c.stA = st('A', 'Proyecto A', 'ea'); c.stB = st('B', 'Proyecto B', 'eb');
  vm.runInContext(`var P = shareBuild(stA); shareSnapshot(); P.paras[0].x = 'EDITADO en A'; P.elements.ea.name = 'prop cambiado';
    globalThis.A = P; globalThis.pend = shareSave(A);
    const Pn = shareBuild(stB); P = Pn; shareSnapshot();`, c);
  await vm.runInContext('pend', c);
  assert.deepStrictEqual(c.__saves.map(x => x[0] + ':' + x[1]), ['A:guion', 'A:desglose']);
  assert.ok(c.__saves[1][2].includes('prop cambiado'));
});
test('al recibir permiso nuevo, el presupuesto vacío de relleno no se sube encima del real', async () => {
  const c = ctx();
  const real = JSON.stringify({ budget: { currency: 'S/', lines: [{ id: 'b1', name: 'Cámara', qty: 1, mult: 1, rate: 5000 }] } });
  c.stOld = st('p1', 'Peli', 'e0', { admin: false, perms: { guion: 'ver', desglose: 'editar' }, read: ['guion', 'desglose'], me: { id: 'u2', name: 'Ana', role: 'Dirección de arte' } });
  c.stNew = { ...c.stOld, me: { id: 'u2', name: 'Ana', role: 'Producción' }, perms: { guion: 'ver', desglose: 'editar', presupuesto: 'editar' }, read: ['guion', 'desglose', 'plan', 'presupuesto'], sections: { ...c.stOld.sections, presupuesto: { json: real } } };
  vm.runInContext(`var P = shareBuild(stOld); shareSnapshot(); P.elements.e1 = { id: 'e1', cat: 'props', name: 'Lámpara' };
    globalThis.oldP = P; const Pn = shareBuild(stNew); globalThis.pend = shareSave(oldP); P = Pn; shareSnapshot();`, c);
  await vm.runInContext('pend', c);
  assert.ok(!c.__saves.some(x => x[1] === 'presupuesto'), 'no se envía el presupuesto');
  assert.ok(c.__saves.some(x => x[1] === 'desglose' && x[2].includes('Lámpara')), 'lo editado sí se guarda');
});

/* ---------- la página publicada en Claude: dos guardados casi a la vez ---------- */
function fakeDb() {
  const docs = new Map();
  const doc = path => ({
    async get() { const v = docs.get(path); return { exists: v !== undefined, id: path.split('/').pop(), data: () => JSON.parse(JSON.stringify(v)) }; },
    async set(v) { docs.set(path, JSON.parse(JSON.stringify(v))); },
    async update(v) { docs.set(path, { ...(docs.get(path) || {}), ...v }); },
    async delete() { docs.delete(path); },
  });
  return { docs, doc, collection: () => ({ onSnapshot: () => () => { }, get: async () => ({ docs: [] }) }) };
}
function webTeam(db, me, client) {
  const c = ctx();
  c.CLIENT = client; c.CH = 60000; c.Store = { call: f => f() };
  vm.runInContext(fs.readFileSync(R + 'share-web.js', 'utf8'), c, { filename: 'share-web.js' });
  const W = vm.runInContext('WEBTEAM', c);
  W.db = db; W.me = me; W.pid = 'p1'; W.read = new Set(['plan']);
  W.team = { owner: 'prod', members: { ad: { role: 'Asistencia de dirección', perms: { plan: 'editar' } } } };
  return W;
}
test('página en Claude: quien guarda sin haber visto el cambio de otra persona recibe ese cambio para fusionar', async () => {
  const db = fakeDb();
  const A = webTeam(db, 'prod', 'cA'), B = webTeam(db, 'ad', 'cB');
  const got = [];
  A.on('update', (pid, u) => got.push(u));
  assert.ok((await B.save('p1', 'plan', '{"k":"de B"}')).ver);
  const r = await A.save('p1', 'plan', '{"k":"de A"}');
  assert.strictEqual(r.conflict, true, 'A no escribe encima');
  assert.ok(got.some(u => u.sec === 'plan' && u.json.includes('de B')), 'A recibe lo de B');
  const head = db.docs.get('projects/p1/secs/plan');
  assert.strictEqual(db.docs.get(`projects/p1/blobs/plan-${head.tag}-0`).s, '{"k":"de B"}');
  // ya con lo de B a la vista, el siguiente guardado de A sí entra
  assert.ok((await A.save('p1', 'plan', '{"k":"de A y B"}')).ver);
});

(async () => {
  let fail = 0;
  for (const [n, f] of tests) {
    try { await f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); }
  }
  console.log(fail ? `${fail} fallan` : `todas pasan (${tests.length})`);
  process.exit(fail ? 1 : 0);
})();
