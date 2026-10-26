/* Lote V · lo que se ve al instante: fotos que aparecen mientras se suben (src/laminas.js · photosAdd) y abrir un
   proyecto sin volver a bajar lo que ya está en este equipo (src/share-api.js · APITEAM.open), con el código real en
   un contexto aislado.  node test/rendimiento-v.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/../src/';
const noop = () => { };
const tests = [];
const test = (n, f) => tests.push([n, f]);
const tick = () => new Promise(r => setImmediate(r));

/* ---------- fotos ---------- */
function fotos() {
  const ups = [], toasts = [];
  const c = {
    console, JSON, Math, Date, Object, Array, String, Number, Set, Map, Promise, setTimeout, clearTimeout, RegExp, Error, isFinite,
    FRAMES: {}, IMGS: new Map(), UI: {}, IMG_MAX: 1600, __n: 0, __changed: 0, ups, toasts, PDFX: {}, ACT: {},
    proGate: () => true, frameHas: () => true, toast: m => toasts.push(m), histNote: noop,
    imgCanvas: async f => f, imgEncode: f => ({ url: 'data:image/webp;base64,' + f.name, w: 4, h: 3 }), imgBytes: () => 100,
    uid: p => p + (++c.__n), changed: () => { c.__changed++; },
    // cada subida queda pendiente hasta que la prueba la resuelva
    Store: { kind: 'api', saveFrame: (pid, k, url) => new Promise((res, rej) => ups.push({ pid, k, url, res, rej })) },
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(R + 'laminas.js', 'utf8') + '\nObject.assign(globalThis, { PHOTO_UP, PHOTO_PEND, addPhotos, photosAdd, delPhoto });', c, { filename: 'laminas.js' });
  vm.runInContext("var P = { id: 'p1', elements: { e1: { id: 'e1', name: 'Sombrero', cat: 'wardrobe' } } };", c);
  return c;
}
const file = name => ({ name, type: 'image/jpeg', size: 1000 });
const phs = c => ((c.P.elements.e1.ref || {}).ph || []).map(x => x.id);

test('fotos: aparecen antes de terminar de subir, y se suben de a dos', async () => {
  const c = fotos();
  let painted = 0;
  const n = await c.addPhotos(c.P.elements.e1, [file('a'), file('b'), file('c')], () => painted++);
  assert.strictEqual(n, 3);
  assert.strictEqual(phs(c).length, 3, 'las tres ya están en el elemento');
  assert.strictEqual(Object.keys(c.FRAMES).length, 3, 'y se ven (FRAMES)');
  assert.strictEqual(painted, 3);
  assert.strictEqual(c.ups.length, 2, 'dos subidas a la vez');
  assert.strictEqual(c.PHOTO_UP.size, 1, 'cambiar de proyecto o cerrar espera a que terminen');
  c.ups[0].res(); await tick();
  assert.strictEqual(c.ups.length, 3, 'termina una y empieza la siguiente');
  c.ups[1].res(); c.ups[2].res(); await tick(); await tick();
  assert.strictEqual(c.PHOTO_UP.size, 0);
  assert.ok(c.toasts.every(t => !/No se pud/.test(t)), c.toasts.join(' | '));
  assert.deepStrictEqual(c.ups.map(u => u.k), Object.keys(c.FRAMES));
});

test('fotos: si el servidor no acepta una (sin espacio), se quitan las que no subieron y se avisa una vez', async () => {
  const c = fotos();
  await c.addPhotos(c.P.elements.e1, [file('a'), file('b'), file('c')], noop);
  assert.strictEqual(phs(c).length, 3);
  const e = new Error('Se llenó el espacio de la cuenta.'); e.code = 'quota';
  c.ups[0].rej(e); await tick(); await tick();
  assert.strictEqual(c.ups.length, 2, 'después de «sin espacio» no se intenta la tercera');
  c.ups[1].res(); await tick(); await tick();
  assert.strictEqual(phs(c).length, 1, 'queda solo la que sí se subió');
  assert.deepStrictEqual(Object.keys(c.FRAMES), [c.ups[1].k]);
  assert.strictEqual(c.PHOTO_UP.size, 0);
  const err = c.toasts.filter(t => /no se pudieron guardar/.test(t));
  assert.strictEqual(err.length, 1, c.toasts.join(' | '));
  assert.match(err[0], /2 de 3 fotos.*espacio/);
});

test('fotos: un archivo que no es imagen no cuenta y no se sube', async () => {
  const c = fotos();
  const n = await c.addPhotos(c.P.elements.e1, [{ name: 'x.pdf', type: 'application/pdf' }], noop);
  assert.strictEqual(n, 0); assert.strictEqual(c.ups.length, 0); assert.strictEqual(c.PHOTO_UP.size, 0);
});

test('fotos: con el servidor, cada una espera en la cola de este equipo hasta que el servidor la confirma', async () => {
  const c = fotos(), q = new Map();
  c.P._shared = true;
  c.OFFLINE = { on: false, putFrame: async (pid, k, url) => { q.set(pid + '|' + k, url); }, dropFrame: async id => { q.delete(id); } };
  await c.addPhotos(c.P.elements.e1, [file('a'), file('b')], noop);
  await tick();
  assert.strictEqual(q.size, 2, 'si la pestaña se cierra ahora, se suben al volver a abrir');
  c.ups[0].res(); await tick(); await tick();
  assert.strictEqual(q.size, 1);
  const e = new Error('Sin permiso'); e.code = 'no_edit';
  c.ups[1].rej(e); await tick(); await tick();
  assert.strictEqual(q.size, 0, 'la rechazada tampoco queda en la cola');
  assert.strictEqual(phs(c).length, 1);
});

test('fotos: borrar una que todavía sube la saca de la cola o la borra en el servidor al terminar', async () => {
  const c = fotos();
  await c.addPhotos(c.P.elements.e1, [file('a'), file('b'), file('c')], noop);
  const [k1, , k3] = Object.keys(c.FRAMES);
  const pid1 = k1.split('~')[2], pid3 = k3.split('~')[2];
  c.delPhoto(c.P.elements.e1, pid3);     // en la cola, sin empezar
  c.delPhoto(c.P.elements.e1, pid1);     // subiendo
  assert.strictEqual(c.ups.length, 2, 'borrar no manda nada mientras sube');
  c.ups[0].res(); await tick(); await tick();
  assert.deepStrictEqual(c.ups.slice(2).map(u => [u.k, u.url]), [[k1, null]], 'terminó de subir y se borra; la tercera no se sube');
  c.ups[2].res(); c.ups[1].res(); await tick(); await tick();
  assert.strictEqual(c.PHOTO_UP.size, 0); assert.strictEqual(c.PHOTO_PEND.size, 0);
  assert.strictEqual(phs(c).length, 1);
  assert.ok(!c.toasts.some(t => /No se pud/.test(t)), c.toasts.join(' | '));
});

test('fotos: un error al pintar no deja la subida colgada (cambiar de proyecto no espera de más)', async () => {
  const c = fotos();
  await c.addPhotos(c.P.elements.e1, [file('a'), file('b')], () => { throw new Error('pintar'); }).catch(() => { });
  c.ups.forEach(u => u.res()); await tick(); await tick();
  assert.strictEqual(c.PHOTO_UP.size, 0);
});

/* ---------- abrir un proyecto ---------- */
function api() {
  const calls = [];
  const c = {
    console, JSON, Math, Date, Object, Array, String, Number, Set, Map, Promise, setTimeout, clearTimeout, setInterval, clearInterval, RegExp, Error, isFinite,
    TextEncoder, encodeURIComponent, decodeURIComponent, URL,
    addEventListener: noop, document: { addEventListener: noop, body: { classList: { toggle: noop } } }, navigator: {}, location: { protocol: 'https:', hostname: 'x', pathname: '/app/', search: '' },
    history: { replaceState: noop }, toast: noop, ls: { get: (k, d) => d, set: noop }, UI: { tab: 'script' }, CLIENT: 'c1', calls,
    paintBrand: noop, accountButton: noop, shareInit: noop,
  };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(R + 'share-api.js', 'utf8') + '\nObject.assign(globalThis, { APITEAM, OFFLINE });', c, { filename: 'share-api.js' });
  return c;
}
const local = { guion: { v: 3, json: '{"paras":[{"x":"Ñandú ☕ 😀"}]}' }, desglose: { v: 1, json: '{"elements":{}}' }, notas: { v: 2, json: '{"n":[]}' } };
function serve(c, wrongLen) {
  c.OFFLINE.get = async () => ({ pid: 'p1', srv: JSON.parse(JSON.stringify(local)), loc: {} });
  c.OFFLINE.mirror = async (pid, st) => { c.mirrored = st; };
  c.apiFetch = async (method, url) => {
    c.calls.push(url);
    const have = /[?&]have=([^&]*)/.exec(url);
    const sections = have
      ? { guion: { v: 3, same: 1, n: Buffer.byteLength(local.guion.json) + (wrongLen ? 1 : 0) }, desglose: { v: 2, json: '{"elements":{"e1":{}}}' }, notas: { v: 2, json: '{"n":[1]}' } }
      : { guion: { v: 3, json: '{"paras":[{"x":"del servidor"}]}' }, desglose: { v: 2, json: '{"elements":{"e1":{}}}' }, notas: { v: 2, json: '{"n":[1]}' } };
    return { status: 200, json: { pid: 'p1', title: 'X', read: ['guion', 'desglose'], vers: { guion: 3, desglose: 2, notas: 2 }, sections } };
  };
}

test('abrir: dice qué versiones tiene y toma de su copia lo que no cambió', async () => {
  const c = api(); serve(c);
  const st = await c.APITEAM.open('p1');
  assert.strictEqual(c.calls.length, 1);
  const have = decodeURIComponent(/have=([^&]*)/.exec(c.calls[0])[1]).split(',').sort();
  assert.deepStrictEqual(have, ['desglose.1', 'guion.3'], 'las notas no: cada quien recibe su vista');
  assert.strictEqual(st.sections.guion.json, local.guion.json, 'el guion sale de la copia de este equipo');
  assert.strictEqual(st.sections.desglose.json, '{"elements":{"e1":{}}}', 'lo que cambió llega del servidor');
  assert.strictEqual(c.APITEAM.vers.guion, 3);
  assert.strictEqual(c.mirrored.sections.guion.json, local.guion.json, 'la copia queda completa');
});

test('abrir: si la copia no coincide (largo distinto), se pide todo como antes', async () => {
  const c = api(); serve(c, true);
  const st = await c.APITEAM.open('p1');
  assert.strictEqual(c.calls.length, 2);
  assert.ok(!/have=/.test(c.calls[1]));
  assert.strictEqual(st.sections.guion.json, '{"paras":[{"x":"del servidor"}]}');
});

test('abrir: sin copia en este equipo, se pide todo de una vez', async () => {
  const c = api(); serve(c);
  c.OFFLINE.get = async () => null;
  const st = await c.APITEAM.open('p1');
  assert.strictEqual(c.calls.length, 1); assert.ok(!/have=/.test(c.calls[0]));
  assert.strictEqual(st.sections.guion.json, '{"paras":[{"x":"del servidor"}]}');
});

test('arranque: la lista de proyectos se pide a la vez que la cuenta', async () => {
  const c = api(), order = [];
  let meDone = false;
  c.fetch = async url => {
    order.push(url + (meDone ? ' (después)' : ''));
    if (url === '/api/me') { await new Promise(r => setTimeout(r, 20)); meDone = true; return { status: 200, ok: true, json: async () => ({ plan: 'pro', limits: { projects: 5 }, name: 'Ana', email: 'a@b.pe' }) }; }
    if (url === '/api/projects') return { status: 200, ok: true, json: async () => [{ id: 'p1', title: 'X', mine: true, shared: false }] };
    throw new Error('inesperado ' + url);
  };
  c.apiFetch = async () => { throw new Error('no debería pedir la lista otra vez'); };
  await c.APITEAM.init();
  assert.deepStrictEqual(order, ['/api/projects', '/api/me']);
  const list = await c.APITEAM.list();
  assert.deepStrictEqual(list.map(x => x.id), ['p1']);
  // la siguiente vez sí se pide (la lista puede haber cambiado)
  c.apiFetch = async () => ({ status: 200, json: [] });
  assert.deepStrictEqual(await c.APITEAM.list(), []);
});

(async () => {
  let fail = 0;
  for (const [n, f] of tests) {
    try { await f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e && e.stack || e); }
  }
  console.log(fail ? `${fail} fallas` : 'todo bien');
  process.exitCode = fail ? 1 : 0;
})();
