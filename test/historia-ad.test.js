/* Lote AD · Historia: las vistas «Premisa y mundo» y «Estructura» (src/historia-previa.js). Con el programa entero en
   un contexto aislado (como cabeceras.test.js): los datos se ordenan al abrir, se dibujan (también en solo lectura),
   viajan con la sección «guion» del equipo y se unen con los cambios de otra persona, siguen a su escena cuando cambia
   de número o pasa al guion, salen en el menú Exportar y en el ZIP, y tienen su inglés.
   node test/historia-ad.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/../';
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const has = (s, re, msg) => assert.ok(re.test(s), msg || String(re));

/* ---------- el programa, sin navegador (lo mismo que cabeceras.test.js, con un localStorage que guarda) ---------- */
function app() {
  const files = /FILES="([^"]+)"/.exec(fs.readFileSync(R + 'build.sh', 'utf8'))[1].split(/\s+/).concat(['share', 'share-web']);
  const js = `'use strict'; const TARGET = 'web'; const THV = 'x'; const I18N_EN = { x: {}, p: [], f: {} };\n`
    + files.map(f => fs.existsSync(R + 'src/' + f + '.js') ? fs.readFileSync(R + 'src/' + f + '.js', 'utf8') : f === 's3d-figuras-datos' ? 'const FIG3D_DATA = {};' : '').join('\n');
  const shell = fs.readFileSync(R + 'src/shell.html', 'utf8');
  const ids = new Set([...shell.matchAll(/\bid="([\w-]+)"/g)].map(m => m[1]));
  const stub = (name = 'x') => {
    const f = function () { return stub(name + '()'); };
    return new Proxy(f, {
      get(t, k) {
        if (k === Symbol.toPrimitive) return () => ''; if (k === Symbol.iterator) return function* () { };
        if (k === 'then') return undefined; if (k === 'length') return 0;
        if (k in t && k !== 'name') return t[k]; return t[k] = stub(name + '.' + String(k));
      },
      set(t, k, v) { t[k] = v; return true; }, apply() { return stub(name + '()'); }, construct() { return stub('new ' + name); },
    });
  };
  const view = stub('view'), made = new Map();
  view.innerHTML = '';
  const there = s => /^#[\w-]+$/.test(s) && (ids.has(s.slice(1)) || String(view.innerHTML).includes(`id="${s.slice(1)}"`));
  const el = s => { if (!made.has(s)) made.set(s, stub(s)); return made.get(s); };
  view.querySelector = s => there(s) ? el(s) : null; view.querySelectorAll = () => [];
  const doc = stub('document');
  doc.querySelector = s => s === '#view' ? view : there(s) ? el(s) : null;
  doc.getElementById = id => id === 'view' ? view : there('#' + id) ? el('#' + id) : null;
  doc.querySelectorAll = () => []; doc.fonts = { ready: new Promise(() => { }) };
  const noop = () => { }, never = () => new Promise(noop), mem = new Map();
  const store = { getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  const c = {
    console: { log: noop, warn: noop, error: noop, info: noop }, document: doc, navigator: { userAgent: 'node', language: 'es' },
    location: { search: '', hash: '', href: 'file:///x', protocol: 'file:' }, localStorage: store, sessionStorage: store,
    matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }), addEventListener: noop, removeEventListener: noop,
    setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop, requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
    CSS: { escape: s => String(s), supports: () => true }, getComputedStyle: () => stub('cs'), Image: function () { }, Blob: function () { },
    URL: { createObjectURL: () => '' }, fetch: never, indexedDB: stub('idb'), crypto: { getRandomValues: a => a, randomUUID: () => 'u' + Math.random() },
    performance: { now: () => 0 }, ResizeObserver: function () { this.observe = noop; }, IntersectionObserver: function () { this.observe = noop; },
    MutationObserver: function () { this.observe = noop; }, DOMParser: function () { }, HTMLElement: function () { }, Element: function () { },
    Node: function () { }, Event: function () { }, CustomEvent: function () { }, BroadcastChannel: function () { this.postMessage = noop; },
    screen: { width: 1280 }, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 900, history: { replaceState: noop, pushState: noop }, alert: noop, confirm: () => true,
  };
  const El = function () { }; El.prototype = { get value() { return ''; }, set value(v) { } };
  for (const k of ['HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLCanvasElement', 'HTMLImageElement', 'SVGElement', 'HTMLDivElement', 'HTMLButtonElement'])
    c[k] = function () { }, c[k].prototype = Object.create(El.prototype, { value: Object.getOwnPropertyDescriptor(El.prototype, 'value') });
  c.window = c; c.globalThis = c; c.self = c;
  vm.createContext(c);
  vm.runInContext(js, c, { filename: 'src' });
  const run = s => vm.runInContext(s, c);
  run(`setProject(buildSample());`);
  const show = v => { run(`ls.set('bView', ${JSON.stringify(v)}); UI.tab = 'build'; render();`); return String(view.innerHTML); };
  return { run, show };
}
const A = app(), run = A.run, J = s => JSON.parse(run(`JSON.stringify(${s})`));

/* ---------- las vistas ---------- */
test('las seis vistas van en su orden: Argumento, Premisa y mundo, Biografías, Estructura, Escaleta, Tarjetas', () => {
  assert.deepStrictEqual(J('B_VIEWS.map(x => x[1])'), ['Argumento', 'Premisa y mundo', 'Biografías', 'Estructura', 'Escaleta', 'Tarjetas']);
  const h = A.show('prem');
  const order = [...h.matchAll(/data-act="b-view" data-v="(\w+)"/g)].map(m => m[1]);
  assert.deepStrictEqual(order, ['arg', 'prem', 'bio', 'est', 'esc', 'cards']);
  has(h, /data-act="b-view" data-v="prem">Premisa y mundo/);
});
test('premisa y mundo: tema, premisa, tono, referencias, época, lugares, reglas e investigación, con sus cuentas', () => {
  const h = A.show('prem');
  for (const k of ['tema', 'premisa', 'tono', 'epoca', 'lugares', 'reglas', 'invest']) has(h, new RegExp(`data-bind="b-prem" data-k="${k}"`), 'falta ' + k);
  has(h, /data-wc="tema">\d+ palabras · lo usual: 1–12</, 'el tema cuenta sus palabras y dice lo usual');
  has(h, /data-wc="lugares">\d+ palabras</);
  has(h, /data-act="b-prem-go" data-k="refs"[^]*?3 títulos/, 'la lista de partes cuenta las referencias');
  assert.strictEqual((h.match(/class="b-ref"/g) || []).length, 3, 'las tres referencias del ejemplo');
  has(h, /data-act="b-ref-add"/); has(h, /data-act="b-ref-rm"/);
  has(h, /7 de 7 partes escritas/);
});
test('estructura: los seis puntos clave en la línea de tiempo, cada uno en su acto y con su escena', () => {
  const h = A.show('est');
  for (const k of ['det', 'g1', 'mid', 'crisis', 'clim', 'des']) has(h, new RegExp(`data-beat="${k}"`), 'falta ' + k);
  const actOf = k => { const i = h.indexOf(`data-beat="${k}"`); const m = [...h.slice(0, i).matchAll(/class="b-tl-act" data-act-i="(\d)"/g)]; return +m[m.length - 1][1]; };
  assert.deepStrictEqual(['det', 'g1', 'mid', 'crisis', 'clim', 'des'].map(actOf), [0, 0, 1, 1, 2, 2]);
  has(h, /data-beat="det"[^]*?<option value="sc:2" data-no-tr selected>2 · /, 'el detonante, unido a la escena 2');
  has(h, /data-beat="det"[^]*?class="b-beat-at tnum"[^>]*>al \d+ %</, 'dice dónde cae en el guion');
  has(h, /data-beat="g1"[^]*?<option value="" selected>Sin escena/, 'el giro, sin escena');
  has(h, /<optgroup label="Acto II">[^]*?value="cd:kej1"[^>]*>· EXT\. CASA DE TITO - NOCHE — por escribir</, 'las tarjetas por escribir también se pueden elegir');
  has(h, /6 de 6 puntos clave/);
});
test('solo lectura: todo se ve y nada se edita (sin agregar ni quitar)', () => {
  run(`UI.readOnly = true;`);
  try {
    for (const v of ['prem', 'est']) {
      const h = A.show(v);
      const tags = [...h.matchAll(/<(textarea|input)\b[^>]*>/g)].map(m => m[0]);
      assert.ok(tags.length, v + ': sin campos');
      for (const t of tags) assert.ok(/\breadonly\b/.test(t), v + ': campo editable ' + t.slice(0, 90));
      for (const t of [...h.matchAll(/<select\b[^>]*>/g)].map(m => m[0])) assert.ok(/\bdisabled\b/.test(t), v + ': lista editable ' + t.slice(0, 90));
      assert.doesNotMatch(h, /data-act="b-ref-(add|rm)"/, v + ': botones de editar');
    }
    has(A.show('prem'), /<span class="b-ref-k">Película<\/span>/, 'el tipo de la referencia, como texto');
  } finally { run(`UI.readOnly = false;`); }
});

/* ---------- los datos ---------- */
test('un proyecto de antes (sin premisa ni estructura) se abre con todo vacío, y lo que llega roto se limpia', () => {
  const B = J(`(() => { const Px = { build: { arg: { logline: 'x' } } }; buildNormalize(Px); return Px.build; })()`);
  assert.deepStrictEqual(B.prem, { tema: '', premisa: '', tono: '', epoca: '', lugares: '', reglas: '', invest: '' });
  assert.deepStrictEqual(B.refs, []); assert.deepStrictEqual(B.beats, {});
  const X = J(`(() => { const Px = { build: { prem: { tema: 5, premisa: null }, refs: [{ id: 'a', t: 'Uno', kind: 'nada' }, { id: 'a', t: 'repetida' }, { id: '<b>', t: 'mala' }, 'x', { t: 'sin id' }],
    beats: { det: { d: 'D', act: 1, on: 'sc:3' }, mid: { act: 'x', on: 'javascript:1 2' }, otro: { d: 'no' }, crisis: 'x' } } }; buildNormalize(Px); return Px.build; })()`);
  assert.strictEqual(X.prem.tema, '5'); assert.strictEqual(X.prem.premisa, '');
  assert.deepStrictEqual(X.refs, [{ id: 'a', t: 'Uno', kind: 'otro', n: '', u: '' }]);
  assert.deepStrictEqual(X.beats, { det: { d: 'D', act: 1, on: 'sc:3' }, mid: { d: '' } });
});
test('sin acto elegido, cada punto va donde suele ir según cuántos actos haya', () => {
  assert.deepStrictEqual(J(`[0,1,2,3,4,5].map(i => bBeatDefAct(i, 3))`), [0, 0, 1, 1, 2, 2]);
  assert.deepStrictEqual(J(`[0,1,2,3,4,5].map(i => bBeatDefAct(i, 1))`), [0, 0, 0, 0, 0, 0]);
  assert.ok(J(`[0,1,2,3,4,5].every(i => bBeatDefAct(i, 8) < 8)`));
});
test('viajan con la sección «guion» del equipo: secGet las lleva y secPut las devuelve', () => {
  const g = J(`secGet(P, 'guion')`);
  assert.ok(g.build && g.build.prem && g.build.prem.tema, 'la premisa va en la sección');
  assert.strictEqual(g.build.refs.length, 3); assert.ok(g.build.beats.det.d);
  const back = J(`(() => { const Px = JSON.parse(JSON.stringify(P)); secPut(Px, 'guion', ${JSON.stringify(JSON.stringify(g))} && JSON.parse(${JSON.stringify(JSON.stringify(g))})); return Px.build; })()`);
  assert.deepStrictEqual(back.prem, g.build.prem); assert.deepStrictEqual(back.refs, g.build.refs); assert.deepStrictEqual(back.beats, g.build.beats);
});
test('dos personas a la vez: cada una agrega su referencia y cambia un punto distinto → quedan las dos cosas', () => {
  const base = J(`secGet(P, 'guion')`);
  const mine = JSON.parse(JSON.stringify(base)), theirs = JSON.parse(JSON.stringify(base));
  mine.build.refs.push({ id: 'rmia', kind: 'libro', t: 'Mía', n: '', u: '' }); mine.build.beats.det.d = 'Detonante nuevo'; mine.build.prem.tema = 'Tema mío';
  theirs.build.refs.push({ id: 'rsuya', kind: 'serie', t: 'Suya', n: '', u: '' }); theirs.build.beats.mid.on = 'sc:4'; theirs.build.prem.reglas = 'Reglas suyas';
  theirs.build.refs = theirs.build.refs.filter(r => r.id !== 'rej2');   // la otra persona quitó una
  const m = JSON.parse(run(`JSON.stringify(merge3(${JSON.stringify(base)}, ${JSON.stringify(mine)}, ${JSON.stringify(theirs)}))`));
  assert.deepStrictEqual(m.build.refs.map(r => r.id).sort(), ['rej1', 'rej3', 'rmia', 'rsuya']);
  assert.strictEqual(m.build.beats.det.d, 'Detonante nuevo'); assert.strictEqual(m.build.beats.mid.on, 'sc:4');
  assert.strictEqual(m.build.beats.mid.d, base.build.beats.mid.d, 'la descripción del punto medio sigue');
  assert.strictEqual(m.build.prem.tema, 'Tema mío'); assert.strictEqual(m.build.prem.reglas, 'Reglas suyas');
});
test('el aviso del equipo dice qué cambió de la historia (antes: «editó la escena N»)', () => {
  const b = J(`secGet(P, 'guion')`), a = JSON.parse(JSON.stringify(b));
  a.build.beats.det.d = 'otro';
  assert.strictEqual(J(`describeChange('guion', ${JSON.stringify(b)}, ${JSON.stringify(a)}).what`), 'cambió la estructura de la historia');
  const a2 = JSON.parse(JSON.stringify(b)); a2.build.refs.push({ id: 'r9', kind: 'peli', t: 'X', n: '', u: '' });
  assert.strictEqual(J(`describeChange('guion', ${JSON.stringify(b)}, ${JSON.stringify(a2)}).what`), 'cambió la premisa y el mundo de la historia');
  const a3 = JSON.parse(JSON.stringify(b)); a3.build.arg.logline = 'otra';
  assert.strictEqual(J(`describeChange('guion', ${JSON.stringify(b)}, ${JSON.stringify(a3)}).what`), 'cambió el argumento');
});
test('cuando las escenas cambian de número, el punto clave sigue a su escena (y suelta la que se borró)', () => {
  run(`P.build.beats.clim.on = 'sc:6'; P.build.beats.des.on = 'sc:7'; sceneRename(P, { '6': '7', '7': '8' });`);
  assert.strictEqual(J(`P.build.beats.clim.on`), 'sc:7'); assert.strictEqual(J(`P.build.beats.des.on`), 'sc:8');
  run(`sceneRename(P, { '7': '6', '8': '7' });`);
  run(`P.build.beats.crisis.on = 'sc:5'; sceneRename(P, { '4': '5' });`);   // la 5 se borró y la 4 toma su número
  assert.strictEqual(J(`P.build.beats.crisis.on || null`), null);
  run(`setProject(buildSample());`);
});
test('el número de una escena unida a un punto clave no lo toma una escena nueva', () => {
  run(`P.build.beats.g1.on = 'sc:99';`);
  assert.ok(J(`edRetiredKeys().includes('99')`));
  run(`setProject(buildSample());`);
});
test('quitar el último acto pasa sus puntos clave al anterior', () => {
  run(`P.build.beats.des.act = 2; ACT['b-act-rm']();`);
  assert.strictEqual(J(`P.build.beats.des.act`), 1);
  run(`setProject(buildSample());`);
});

/* ---------- exportar ---------- */
test('el menú Exportar lleva las vistas nuevas en su orden, y el ZIP también', () => {
  assert.deepStrictEqual(J(`EXPORTS.build().map(x => x.pdf ? x.pdf.kind : x.label)`), ['Argumento', 'premisa', 'bios', 'estructura', 'escaleta', 'tarjetas']);
  const z = J(`zipDocs().slice(0, 5).map(x => x[0] + ' ' + x[1])`);
  assert.deepStrictEqual(z, ['01_Argumento.pdf argumento', '02_Premisa_y_mundo.pdf premisa', '03_Biografias.pdf bios', '04_Estructura.pdf estructura', '05_Escaleta.pdf escaleta']);
  assert.ok(J(`typeof PDFX.premisa === 'function' && typeof PDFX.estructura === 'function'`));
  assert.strictEqual(J(`DOC_TAB.premisa + DOC_TAB.estructura`), 'buildbuild');
  assert.ok(J(`bPremHas() && bBeatsHas()`), 'el ejemplo tiene algo que exportar');
});
test('sin escenas también se exportan (como el argumento)', () => {
  has(fs.readFileSync(R + 'src/pdf.js', 'utf8'), /'argumento', 'premisa', 'bios', 'estructura', 'escaleta'/);
});

/* ---------- inglés ---------- */
test('todo texto nuevo de la pantalla tiene su inglés', () => {
  const M = JSON.parse(fs.readFileSync(R + 'i18n/en-manual.json', 'utf8')), E = JSON.parse(fs.readFileSync(R + 'i18n/en.json', 'utf8'));
  const D = { ...E, ...M };
  const names = J(`[...B_PREM.flatMap(x => [x[1], x[2]]), ...B_PREM_G.map(x => x[1]), ...B_REF_K.map(x => x[1]), ...B_BEATS.flatMap(x => [x[1], x[2]]), ...B_VIEWS.map(x => x[1]), ...HELP.build.flat(), ...EXPORTS.build().flatMap(x => [x.label, x.hint])]`);
  const miss = names.filter(s => !D[s]);
  assert.deepStrictEqual(miss, []);
  const f = fs.readFileSync(R + 'i18n/hacer.js', 'utf8');
  has(f, /'_premisa_y_mundo': '_premise_and_world'/); has(f, /'_estructura': '_structure'/);
});

console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
