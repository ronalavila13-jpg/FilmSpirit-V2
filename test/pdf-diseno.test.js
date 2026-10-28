/* El diseño de los PDF (lote K): con el programa entero en un contexto aislado (como cabeceras.test.js) y la jsPDF de
   verdad, se exportan los PDF del proyecto de ejemplo y se mira lo que se escribe: ninguna celda ni texto es un «-»
   o «—» de relleno, la hoja de llamado de ejemplo cabe en 2 páginas y lo que falta dice «Por confirmar».
   Necesita las bibliotecas de PDF que copia build.sh (desktop/app/lib o server/public/app/lib): sin ellas, se omite.
   node test/pdf-diseno.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/../';
let fail = 0;
const tests = [];
const test = (n, f) => tests.push([n, f]);

const LIB = ['desktop/app/lib/', 'server/public/app/lib/'].map(d => R + d).find(d => fs.existsSync(d + 'jspdf.umd.min.js') && fs.existsSync(d + 'jspdf.plugin.autotable.min.js'));
if (!LIB) { console.log('omitida: faltan las bibliotecas de PDF (corre build.sh antes)'); process.exit(0); }

/* ---------- el programa, sin navegador (lo mismo que cabeceras.test.js) ---------- */
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
    atob, btoa, TextEncoder, TextDecoder,
  };
  const El = function () { }; El.prototype = { get value() { return ''; }, set value(v) { } };
  for (const k of ['HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLCanvasElement', 'HTMLImageElement', 'SVGElement', 'HTMLDivElement', 'HTMLButtonElement'])
    c[k] = function () { }, c[k].prototype = Object.create(El.prototype, { value: Object.getOwnPropertyDescriptor(El.prototype, 'value') });
  c.window = c; c.globalThis = c; c.self = c;
  vm.createContext(c);
  vm.runInContext(js, c, { filename: 'src' });
  // las bibliotecas de PDF, como las carga loadPdfLib en el navegador
  for (const f of ['jspdf.umd.min.js', 'jspdf.plugin.autotable.min.js']) vm.runInContext(fs.readFileSync(LIB + f, 'utf8'), c, { filename: f });
  const run = s => vm.runInContext(s, c);
  // sin window de verdad, la autoTable no se engancha sola en jsPDF
  run(`if (!window.jspdf.jsPDF.API.autoTable && typeof applyPlugin === 'function') applyPlugin(window.jspdf.jsPDF);`);
  run(`setProject(buildSample());`);
  return { run, c };
}

const A = app(), run = A.run;
/* lo que se escribe en cada PDF: el texto de cada celda (el de las celdas con varios estilos, entero) y cada doc.text
   suelto (no los tramos de esas celdas, que se escriben palabra por palabra con baseline 'top') */
run(`globalThis.__seen = [];
  (() => { const API = window.jspdf.jsPDF.API, at = API.autoTable;
    API.autoTable = function (o) { const d0 = o && o.didDrawCell; return at.call(this, { ...o, didDrawCell: d => {
      const r = d.cell.raw, t = r && r._rich ? String(r.content || '') : (d.cell.text || []).join(' ');
      __seen.push({ k: 'cell', s: d.section, t: t.trim() }); if (d0) d0(d); } }); };
    const nd0 = newDoc;
    newDoc = (...a) => { const doc = nd0(...a), tx = doc.text.bind(doc);
      doc.text = (t, ...b) => { const o = b.find(x => x && typeof x === 'object' && !Array.isArray(x)); if (!(o && o.baseline === 'top')) __seen.push({ k: 'text', t: (Array.isArray(t) ? t.join(' ') : String(t)).trim() }); return tx(t, ...b); };
      return doc; };
  })();`);
const out = {};
const exportAll = run(`(async () => { const r = {}; UI.supDay = 0;
  for (const k of Object.keys(PDFX)) { if (k === 'lamina') continue; __seen = []; try { pdfTheme(); const d = await PDFX[k]({}); const doc = d && (d.output ? d : d.doc);
    r[k] = { pages: doc.getNumberOfPages(), seen: __seen.slice() }; } catch (e) { r[k] = { err: e.message + ' @ ' + String(e.stack || '').split('\\n').slice(1, 3).join(' | ') }; } }
  return r; })()`);

(async () => {
  Object.assign(out, await exportAll);
  test('todos los PDF del ejemplo se exportan sin error', () => {
    const bad = Object.entries(out).filter(([, v]) => v.err).map(([k, v]) => `${k}: ${v.err}`);
    assert.deepStrictEqual(bad, []);
    assert.ok(Object.keys(out).length >= 20, 'pocos PDF: ' + Object.keys(out).join(', '));
  });
  test('ninguna celda ni texto es un «-» o «—» de relleno (el guion y el guion rayado no cuentan)', () => {
    const bad = [];
    for (const [k, v] of Object.entries(out)) {
      if (v.err || k === 'screenplay' || k === 'script') continue;
      for (const x of v.seen) if (/^[-—–]$/.test(x.t)) bad.push(`${k} (${x.k}${x.s ? ' ' + x.s : ''})`);
    }
    assert.deepStrictEqual([...new Set(bad)], []);
  });
  test('la hoja de llamado del ejemplo cabe en 2 páginas', () => {
    assert.ok(out.call && !out.call.err, 'no se exportó');
    assert.ok(out.call.pages <= 2, `${out.call.pages} páginas`);
  });
  // (lote W) la cabecera es la del lote U: la jornada («Jornada 1 de 2») y la fecha al centro, con el llamado general
  // en grande debajo de su etiqueta chica; ya no hay «Día de rodaje». (lote Y) Las etiquetas van en minúsculas, como en
  // la pantalla (antes, en MAYÚSCULAS espaciadas). (lote AH) La jornada va con «Hoja de llamado» y la versión
  // («Hoja de llamado · Jornada 1 de 2 · v1») y ya no hay título «Cronograma» (lo pidió Ronald): la cabecera va antes
  // de la tabla
  test('hoja de llamado: lo que falta para el equipo dice «Por confirmar» y la jornada, la fecha y el llamado van arriba', () => {
    const t = out.call.seen.map(x => x.t), txt = out.call.seen.filter(x => x.k === 'text').map(x => x.t);
    assert.ok(t.includes('Por confirmar'), 'sin «Por confirmar»');
    const j = txt.findIndex(x => /Jornada \d+ de \d+/.test(x)), l = txt.indexOf('Llamado general');
    assert.ok(j >= 0 && l > j, 'sin la cabecera (jornada, llamado general)');
    assert.ok(/^\d{2}:\d{2}$/.test(txt[l + 1] || ''), 'el llamado general no va debajo de su etiqueta');
    assert.ok(!t.includes('Cronograma'), 'queda el título «Cronograma»');
  });
  // (lote W) desde el lote U el reparto y el equipo van en una sola tabla, «Personas»; «REPARTO» y los nombres de las
  // áreas son separadores chicos dentro de la tabla (en versalitas, como en pantalla), no títulos de sección.
  // (lote AH) Cada bloque en su cuadro, con su título en la banda de arriba: «Talentos» y «Equipo técnico» por separado
  // (primero los talentos); ya no hay «Personas» ni «Proveedores»
  test('los títulos de sección van en minúscula normal (no en MAYÚSCULAS)', () => {
    const t = out.call.seen.map(x => x.t);
    const ti = t.findIndex(x => /^Talentos\b/.test(x)), eq = t.findIndex(x => /^Equipo técnico\b/.test(x));
    assert.ok(ti >= 0 && eq > ti, 'Talentos y, después, Equipo técnico');
    assert.ok(t.some(x => /^Avance/.test(x)), 'Avance');
    assert.ok(!t.some(x => /^(Personas|Proveedores)$/.test(x)), 'quedan «Personas» o «Proveedores»');
    assert.ok(!t.some(x => /^(CRONOGRAMA|PERSONAS|AVANCE|MOVILIDAD|PROVEEDORES|TALENTOS)\b/.test(x)), 'quedan títulos en mayúsculas');
  });
  // (lote W) la hoja nueva con los datos de antes, sin repetir: los planos van dentro del cronograma (ya no hay un
  // «Cronograma por plano» al final) y los horarios del reparto, en la tabla de personas
  test('hoja de llamado: los planos van en el cronograma y los horarios en «Talentos», sin una segunda parte', () => {
    const txt = out.call.seen.filter(x => x.k === 'text').map(x => x.t), cells = out.call.seen.filter(x => x.k === 'cell').map(x => x.t);
    assert.ok(!txt.includes('Cronograma por plano') && !txt.includes('Reparto · horarios'), 'queda la segunda parte');
    assert.ok(!txt.includes('Hecha con'), 'queda «Hecha con FilmSpirit»');
    for (const h of ['Plano', 'Recojo', 'Vest.', 'Maq.', 'Listos', 'Observaciones']) assert.ok(cells.includes(h), 'sin la columna ' + h);
  });
  for (const [n, f] of tests) { try { await f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } }
  console.log(fail ? `${fail} fallaron` : 'todo bien');
  process.exit(fail ? 1 : 0);
})();
