/* Las cabeceras de las pestañas (lote I) y el color del desglose, con el programa entero en un contexto aislado: se
   cargan los archivos de src/ en el orden de build.sh, con un DOM de mentira (los elementos de shell.html existen y
   no hacen nada), se abre el proyecto de ejemplo y se dibuja cada pestaña. node test/cabeceras.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/../';
let fail = 0;
// assert.match, sin copiar páginas enteras en el mensaje
const has = (s, re, msg) => assert.ok(re.test(s), msg || String(re));
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

/* ---------- el programa, sin navegador ---------- */
function app() {
  const files = /FILES="([^"]+)"/.exec(fs.readFileSync(R + 'build.sh', 'utf8'))[1].split(/\s+/).concat(['share', 'share-web']);
  const js = `'use strict'; const TARGET = 'web'; const THV = 'x'; const I18N_EN = { x: {}, p: [], f: {} };\n`
    // los maniquíes 3D (s3d-figuras-datos.js) no están en el repositorio: sin ellos, nada cambia aquí
    + files.map(f => fs.existsSync(R + 'src/' + f + '.js') ? fs.readFileSync(R + 'src/' + f + '.js', 'utf8') : f === 's3d-figuras-datos' ? 'const FIG3D_DATA = {};' : '').join('\n');
  const shell = fs.readFileSync(R + 'src/shell.html', 'utf8');
  const ids = new Set([...shell.matchAll(/\bid="([\w-]+)"/g)].map(m => m[1]));
  // cualquier cosa existe y no hace nada
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
  // un elemento existe si está en shell.html o en lo que se acaba de dibujar
  const there = s => /^#[\w-]+$/.test(s) && (ids.has(s.slice(1)) || String(view.innerHTML).includes(`id="${s.slice(1)}"`));
  const el = s => { if (!made.has(s)) made.set(s, stub(s)); return made.get(s); };
  view.querySelector = s => there(s) ? el(s) : null; view.querySelectorAll = () => [];
  const doc = stub('document');
  doc.querySelector = s => s === '#view' ? view : there(s) ? el(s) : null;
  doc.getElementById = id => id === 'view' ? view : there('#' + id) ? el('#' + id) : null;
  doc.querySelectorAll = () => []; doc.fonts = { ready: new Promise(() => { }) };
  const noop = () => { }, never = () => new Promise(noop), store = { getItem: () => null, setItem: noop, removeItem: noop };
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
  // los menús que se abren (popover): se guarda lo que mostrarían
  run(`globalThis.__pops = []; popover = (anchor, html, onMount) => { __pops.push(html); };`);
  run(`setProject(buildSample());`);
  const show = tab => { run(`UI.tab = ${JSON.stringify(tab)}; render();`); return String(view.innerHTML); };
  return { run, show, c };
}
/* la cabecera (de <section class="hd …"> o <div class="hd …"> a su cierre) */
function head(html, cls) {
  const m = new RegExp(`<(section|div) class="hd ${cls}[ "]`).exec(html); if (!m) return '';
  const i = m.index, T = new RegExp(`<${m[1]}\\b|</${m[1]}>`, 'g'); T.lastIndex = i; let d = 0, x;
  while ((x = T.exec(html))) { d += x[0][1] === '/' ? -1 : 1; if (!d) return html.slice(i, T.lastIndex); }
  return html.slice(i);
}
const A = app(), run = A.run;

/* ---------- las piezas (src/cabecera.js) ---------- */
test('piezas: una fila con un campo es su etiqueta; con data-act, un botón; si falta el dato, lleva el punto', () => {
  has(run(`hdRow('Almuerzo', '<input value="">')`), /^<label class="hd-row"/);
  has(run(`hdRow('Clima', 'Agregar', { attrs: 'data-act="cs-open"' })`), /^<button type="button" class="hd-row" data-act="cs-open"/);
  has(run(`hdRow('Fecha', 'Falta', { st: 'miss' })`), /class="v miss"><span class="hd-dot"/);
  assert.doesNotMatch(run(`hdRow('Fecha', '<input>', { st: 'miss' })`), /hd-dot/, 'en un campo, el punto no va');
});
test('piezas: «del plan» marca la hora calculada; ‹ › sin a dónde ir quedan desactivados', () => {
  has(run(`hdAuto(tmIn('07:00', 'Hora', 'data-f="x"', ''), true)`), /class="tm hd-auto"/);
  assert.doesNotMatch(run(`hdAuto(tmIn('07:00', 'Hora', 'data-f="x"', ''), false)`), /hd-auto/);
  const st = run(`hdStep(null, 'data-act="x" data-d="1"', 'escena')`);
  has(st, /class="hd-stepb" disabled aria-label="Escena anterior"/);
  has(st, /class="hd-stepb" data-act="x" data-d="1" aria-label="Escena siguiente"/);
  has(run(`hdSeg([{ label: 'A', on: true }, { label: 'B' }])`), /aria-pressed="true"[^>]*>A<\/button><button type="button" aria-pressed="false"/);
});

/* ---------- las 14 pestañas: cabecera nueva y sin relleno ---------- */
const HEADS = { call: 'cl-hd', sup: 'sup-hd0', breakdown: 'bd-hd', lined: 'ins-hd', build: 'b-hd', project: 'pj-top', scout: 'cand-hd', casting: 'cand-hd', board: 'sb-hd', plan: 'pl-hd', cal: 'cal-hd', budget: 'bud-hd' };
const html = {};
for (const t of Object.keys(HEADS).concat(['script', 'animatic'])) html[t] = A.show(t);
test('las 14 pestañas tienen su cabecera nueva', () => {
  for (const [t, cls] of Object.entries(HEADS)) assert.ok(head(html[t], cls), `${t}: falta <section class="hd ${cls}">`);
  has(html.script, /class="side-head hd-side"><h2 class="hd-sidet">Escenas/, 'guion: la lista de escenas');
  has(html.animatic, /class="an-tn"><b>Animatic<\/b> · \d+ planos/, 'animatic: el título con los planos y la duración');
});
test('en las cabeceras, nada de relleno: sin «—», «--:--», «ej.:» ni cursiva', () => {
  for (const [t, cls] of Object.entries(HEADS)) {
    const h = head(html[t], cls);
    const bad = [...h.matchAll(/placeholder="([^"]*)"/g)].map(m => m[1]).filter(p => /^(—|-|--:--|–)$|ej\.:|^ej\./i.test(p.trim()));
    assert.deepStrictEqual(bad, [], `${t}: ${bad.join(', ')}`);
    assert.doesNotMatch(h, /<(em|i)>[^<]|font-style:\s*italic/, `${t}: cursiva`);
  }
});

/* ---------- hoja de llamado ---------- */
test('hoja de llamado: la hora del plan lleva «del plan» y, si se escribe otra, deja de llevarlo', () => {
  run(`UI.callDay = 0; P.callsheet = P.callsheet || {};`);
  const h0 = head(A.show('call'), 'cl-hd');
  const def = run(`callDefaults(callDays().days[0]).crewCall`);
  assert.ok(def, 'el ejemplo tiene el llamado en el plan');
  has(h0, /data-f="crewCall"[^>]*>[^]*?<span class="hd-tag">del plan<\/span>/, 'el llamado general viene del plan');
  run(`BIND['cs-day']({ tagName: 'INPUT', value: '05:15', dataset: { f: 'crewCall' }, classList: { contains: c => c === 'tm' } }, 'change')`);
  const h1 = head(A.show('call'), 'cl-hd');
  has(h1, /value="05:15"[^>]*data-bind="cs-day" data-f="crewCall"|data-f="crewCall"[^>]*value="05:15"|value="05:15"/);
  const card = h1.slice(h1.indexOf('Llamado general'), h1.indexOf('Listos motor'));
  assert.doesNotMatch(card, /del plan/, 'escrito a mano: ya no es «del plan»');
  // igual al del plan: se vuelve a seguir el plan
  run(`BIND['cs-day']({ tagName: 'INPUT', value: ${JSON.stringify(def)}, dataset: { f: 'crewCall' }, classList: { contains: c => c === 'tm' } }, 'change')`);
  const h2 = head(A.show('call'), 'cl-hd');
  has(h2.slice(h2.indexOf('Llamado general'), h2.indexOf('Listos motor')), /del plan/);
});
test('hoja de llamado: el aviso cuenta lo que falta y su lista dice dónde se completa cada cosa', () => {
  run(`UI.callDay = 0;`);
  const miss = JSON.parse(run(`JSON.stringify(callMissing(0))`));
  const h = head(A.show('call'), 'cl-hd');
  if (miss.length) {
    has(h, new RegExp(`class="hd-pill warn" data-act="cl-miss"[^>]*><span class="n tnum">${miss.length}</span>`));
    run(`__pops.length = 0; ACT['cl-miss']({ dataset: {} });`);
    const pop = run(`__pops[0]`);
    for (const x of miss) {
      assert.ok(pop.includes(`data-k="${x.k}"`), 'falta en la lista: ' + x.k);
      has(pop, new RegExp(`data-k="${x.k}"[^]*?<small>[^<]+</small>`), 'sin dónde completarlo: ' + x.k);
    }
    has(pop, /Exportar igual/);
  } else has(h, /class="hd-pill ok"/);
  // cada falta posible tiene dónde completarse
  const src = fs.readFileSync(R + 'src/tab-call.js', 'utf8');
  const ks = [...src.slice(src.indexOf('function callMissing'), src.indexOf('function callSig')).matchAll(/k: '(\w+)'/g)].map(m => m[1]);
  const where = /const WHERE = \{([^}]+)\}/.exec(src)[1];
  for (const k of ks) assert.ok(new RegExp(`\\b${k}:`).test(where), 'sin «dónde» para ' + k);
});
test('hoja de llamado: sin centro de salud, el aviso lo pide y su fila queda marcada', () => {
  run(`P.callsheet.hospital = { name: '', addr: '', phone: '' }; for (const d of Object.values(P.callsheet.days || {})) if (d && d.hosp) d.hosp = {};`);
  const miss = JSON.parse(run(`JSON.stringify(callMissing(0).map(x => x.k))`));
  assert.ok(miss.includes('hosp'), 'callMissing no pide el centro de salud: ' + miss);
  const h = head(A.show('call'), 'cl-hd');
  has(h, /data-bind="cs-hosp" data-f="name"[^>]*data-miss="1"/);
});

/* ---------- desglose (mejora 7) ---------- */
test('desglose: la barra de cada categoría se lee (contraste de 4,5 o más) con cualquier color', () => {
  const cols = JSON.parse(run(`JSON.stringify([...SHEET.map(b => b.color), ...LG_SW])`));
  for (let i = 0; i < 200; i++) cols.push('#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0').toUpperCase());
  for (const h of cols) {
    const b = JSON.parse(run(`JSON.stringify(bdBar(${JSON.stringify(h)}))`));
    const r = run(`lgContrast(${JSON.stringify(b.bg)}, ${JSON.stringify(b.ink)})`);
    assert.ok(r >= 4.5, `${h} → ${b.bg} con ${b.ink}: ${r.toFixed(2)}`);
  }
  // si ya se lee, el color queda tal cual
  assert.strictEqual(JSON.parse(run(`JSON.stringify(bdBar('#1AAEAD'))`)).bg, run(`lgContrast('#1AAEAD', '#1A1A1A') >= 4.6 ? '#1AAEAD' : bdBar('#1AAEAD').bg`));
  assert.strictEqual(JSON.parse(run(`JSON.stringify(bdBar('#F1E36E'))`)).bg, '#F1E36E');
});
test('desglose: cada caja lleva su color entero en la barra y las vacías salen como «Sin elementos todavía» con su color', () => {
  run(`UI.scene = 0; UI.bdView = 'sheet';`);
  const h = A.show('breakdown');
  const boxes = [...h.matchAll(/<section class="sbx sbx-(\w+)[^"]*" style="--bg:(#\w+);--bgb:(#\w+);--bgi:(#\w+)"/g)];
  assert.ok(boxes.length, 'no hay cajas');
  for (const [, id, bg, bgb, bgi] of boxes) assert.ok(run(`lgContrast('${bgb}', '${bgi}')`) >= 4.5, `${id}: ${bgb} / ${bgi}`);
  const none = /<div class="bd-none">([^]*?)<\/div>/.exec(h);
  if (none) {
    has(none[1], /^<span>Sin elementos todavía:<\/span>/);
    for (const m of none[1].matchAll(/data-box="(\w+)" style="--c:(#\w+)"/g)) assert.strictEqual(m[2], run(`SHEET.find(b => b.id === '${m[1]}').color`));
    // un toque abre la caja con su campo
    const id = /data-box="(\w+)"/.exec(none[1])[1];
    run(`ACT['bd-open']({ dataset: { box: '${id}' } })`);
    has(A.show('breakdown'), new RegExp(`<section class="sbx sbx-${id} vac adding`));
  }
});
test('desglose: el PDF pinta la barra con el mismo color que la pantalla', () => {
  const src = fs.readFileSync(R + 'src/pdf.js', 'utf8');
  has(src, /bdBar\(b\.color\)/);
});

/* ---------- otras pestañas ---------- */
test('storyboard: el título abre el menú de escenas', () => {
  const h = head(html.board, 'sb-hd');
  has(h, /<button type="button" class="hd-menu" data-act="sb-scene-menu"/);
  run(`__pops.length = 0; ACT['sb-scene-menu']({ dataset: {} });`);
  const pop = run(`__pops[0] || ''`);
  assert.ok(pop.includes('Todas las escenas'), 'el menú no ofrece todas las escenas');
});
test('presupuesto: el total es el título', () => {
  const h = head(html.budget, 'bud-hd');
  const total = run(`money(budgetTotals(P, D).total)`);
  assert.ok(h.includes(`<h2 class="hd-title"><span class="tnum">${total}</span>`), 'el título no es el total ' + total);
});
test('calendario: hoy va en un círculo (la celda lleva «td»)', () => {
  const d = run(`(() => { const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); })()`);
  run(`UI.calMode = 'mes'; UI.calView = 'tl';`);
  const h = A.show('cal');
  has(h, /class="hd cal-hd"/);
  if (h.includes('class="cm-d')) has(h, new RegExp(`class="cm-d[^"]* td" data-d="${d}"`));
  has(fs.readFileSync(R + 'src/shell.html', 'utf8'), /\.cm-d\.td \.cm-n\{background:var\(--accent\)/);
});

console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
