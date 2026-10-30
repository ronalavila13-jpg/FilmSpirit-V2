/* Lote AI · estilo: el botón «Excel | Apple» de la hoja de llamado y del plan de rodaje. Cada documento guarda su estilo
   en el proyecto (P.call.style, P.schedule.style: 'excel' o 'apple'; sin el dato, Apple). La estructura del lote AH es
   la misma en los dos; cambia la forma: en la pantalla (las clases .cl-ap / .cl-xl de la hoja y .xl del stripboard) y en
   los PDF (la hoja, el plan de rodaje y el DOOD; la cabecera sin cuadro de docHeader). Con el programa entero en un
   contexto aislado (como llamado-ah.test.js) y el proyecto de ejemplo.  node test/estilo-ai.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/../';
let fail = 0;
const tests = [];
const test = (n, f) => tests.push([n, f]);
const has = (s, re, msg) => assert.ok(re.test(s), msg || String(re));
const SRC = f => fs.readFileSync(R + f, 'utf8').replace(/\r\n/g, '\n');
const LIB = ['desktop/app/lib/', 'server/public/app/lib/', 'node_modules/'].map(d => R + d).find(d => fs.existsSync(d + 'jspdf.umd.min.js') && fs.existsSync(d + 'jspdf.plugin.autotable.min.js'))
  || (fs.existsSync(R + 'node_modules/jspdf/dist/jspdf.umd.min.js') ? 'nm' : null);
const LIBF = LIB === 'nm' ? [R + 'node_modules/jspdf/dist/jspdf.umd.min.js', R + 'node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js'] : LIB ? [LIB + 'jspdf.umd.min.js', LIB + 'jspdf.plugin.autotable.min.js'] : [];
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

/* ---------- el programa, sin navegador (lo mismo que llamado-ah.test.js) ---------- */
function app() {
  const files = /FILES="([^"]+)"/.exec(SRC('build.sh'))[1].split(/\s+/).concat(['share', 'share-web']);
  const js = `'use strict'; const TARGET = 'web'; const THV = 'x'; const I18N_EN = { x: {}, p: [], f: {} };\n`
    + files.map(f => fs.existsSync(R + 'src/' + f + '.js') ? SRC('src/' + f + '.js') : f === 's3d-figuras-datos' ? 'const FIG3D_DATA = {};' : '').join('\n');
  const shell = SRC('src/shell.html');
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
  for (const f of LIBF) vm.runInContext(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'), c, { filename: f });
  const run = s => vm.runInContext(s, c);
  if (LIBF.length) run(`if (!window.jspdf.jsPDF.API.autoTable && typeof applyPlugin === 'function') applyPlugin(window.jspdf.jsPDF);`);
  run(`globalThis.__pops = []; popover = (anchor, html, onMount) => { __pops.push(html); }; confirmBox = (t, x, ok, fn) => fn();`);
  run(`setProject(buildSample()); UI.callDay = 0; UI.callFree = null; callCrew();`);
  const show = tab => { run(`UI.tab = '${tab}'; render();`); return String(view.innerHTML); };
  return { run, show, c };
}
const A = app(), run = A.run, J = s => JSON.parse(run(`JSON.stringify(${s})`));
// los PDF: lo que se escribe (texto), las tablas (sus opciones) y los rectángulos de cada documento
run(`globalThis.__T = []; globalThis.__AT = []; globalThis.__RECT = []; globalThis.__IMG = 0; (() => { if (typeof newDoc !== 'function' || !window.jspdf) return; const nd0 = newDoc;
  newDoc = (...a) => { const doc = nd0(...a), tx = doc.text.bind(doc), at = doc.autoTable.bind(doc), rc = doc.rect.bind(doc), ai = doc.addImage.bind(doc);
    doc.text = (t, ...b) => { __T.push((Array.isArray(t) ? t.join(' ') : String(t)).trim()); return tx(t, ...b); };
    doc.autoTable = o => { if (o && o.startY !== 10) __AT.push(o); return at(o); };
    doc.rect = (...r) => { __RECT.push(r); return rc(...r); };
    doc.addImage = (...r) => { __IMG++; return ai(...r); };
    return doc; }; })();`);
const pdfOf = (kind, opts = {}) => { run(`__T = []; __AT = []; __RECT = []; __IMG = 0;`); return run(`(() => { pdfTheme(); const r = PDFX.${kind}(${JSON.stringify(opts)}); return r.doc; })()`); };
const XL = (k, v) => run(v == null ? `delete ${k}.style` : `${k}.style = ${JSON.stringify(v)}`);

/* ---------- el dato: en el proyecto, Apple de entrada ---------- */
test('sin estilo guardado, Apple: el ejemplo, un proyecto nuevo y las hojas libres; la pantalla lo dice con su clase', () => {
  assert.strictEqual(J(`[P.call.style === undefined, P.schedule.style === undefined, callXL(), planXL()]`).join(), 'true,true,false,false');
  const np = J(`(() => { const x = newProject('Nuevo'); return [x.call.style === undefined, x.schedule.style === undefined]; })()`);
  assert.deepStrictEqual(np, [true, true], 'un proyecto nuevo, sin el dato');
  let h = A.show('call');
  has(h, /<div class="cs cl cl-ap">/); assert.doesNotMatch(h, /cl-xl/);
  // una hoja libre: es la misma hoja de llamado del proyecto (el mismo estilo)
  run(`callFreeNew();`);
  assert.ok(J(`!!UI.callFree`));
  h = A.show('call'); has(h, /<div class="cs cl cl-ap">/); has(h, /data-bind="cl-fname"/);
  run(`P.call.free = []; delete P.call.days[UI.callFree]; UI.callFree = null; delete P.call.free;`);
  h = A.show('plan'); has(h, /class="pl pl-ed[^"]*" id="board"/); assert.doesNotMatch(h, /class="pl [^"]* xl" id="board"/);
});
test('se normaliza al cargar: solo «excel» o «apple» (lo demás se borra: Apple); normalizeProject los limpia', () => {
  for (const [v, keep] of [['excel', true], ['apple', true], ['Excel', false], ['xls', false], [1, false], [true, false], [{}, false], [null, false]]) {
    const r = J(`(() => { const x = { call: { crew: [], days: {}, style: ${JSON.stringify(v)} } }; callNormalize(x); const s = { style: ${JSON.stringify(v)} }; planDocNorm(s); return ['style' in x.call, 'style' in s]; })()`);
    assert.deepStrictEqual(r, [keep, keep], JSON.stringify(v));
  }
  const nz = /function normalizeProject[^]*?\n}\n/.exec(SRC('src/proyectos.js'))[0];
  has(nz, /planDocNorm\(S\)/); has(nz, /callNormalize\(Px\)/);
  // y lo que se guarda sigue en su lugar
  XL('P.call', 'excel'); run('callNormalize(P); planDocNorm(P.schedule)'); assert.ok(J('callXL()')); XL('P.call');
});

/* ---------- el botón ---------- */
test('el botón «Excel | Apple» en la barra de la hoja y en la del plan: chico (un segmentado), con el elegido marcado; sin permiso no está', () => {
  let h = A.show('call');
  const seg = act => { const m = new RegExp(`<span class="hd-seg hide-sm" role="group" aria-label="Estilo del documento">(.*?)</span>`).exec(h); assert.ok(m, 'el segmentado de ' + act); return m[1]; };
  let s = seg('cl-style');
  has(s, /aria-pressed="false" data-act="cl-style" data-v="excel"[^>]*>Excel<\/button>/);
  has(s, /aria-pressed="true" data-act="cl-style" data-v="apple"[^>]*>Apple<\/button>/);
  XL('P.call', 'excel'); h = A.show('call'); s = seg('cl-style');
  has(s, /aria-pressed="true" data-act="cl-style" data-v="excel"/); has(h, /<div class="cs cl cl-xl">/);
  XL('P.call');
  h = A.show('plan'); s = seg('pl-style');
  has(s, /aria-pressed="true" data-act="pl-style" data-v="apple"/);
  // el teléfono: en el «⋯» de la barra (no le quita lugar al selector de la jornada)
  for (const [t, act] of [['call', 'cl-style'], ['plan', 'pl-style']]) {
    const it = J(`TOOLS_EXTRA.${t}().filter(x => /Estilo del documento/.test(x[1])).map(x => x[1])`);
    assert.deepStrictEqual(it, ['Estilo del documento <small>Apple</small>'], t);
    run(`__pops = []; TOOLS_EXTRA.${t}().find(x => /Estilo/.test(x[1]))[2]({});`);
    const pop = J('__pops[0]'); has(pop, /data-v="excel"/); has(pop, /data-v="apple" aria-current="true"/); has(pop, /class="menu hd-stm"/);
  }
  // solo lectura: ni en la barra ni en el «⋯»
  run(`UI.readOnly = true`);
  try {
    assert.doesNotMatch(A.show('call'), /data-act="cl-style"/); assert.doesNotMatch(A.show('plan'), /data-act="pl-style"/);
    assert.strictEqual(J(`TOOLS_EXTRA.call().length`), 0);
    assert.strictEqual(J(`TOOLS_EXTRA.plan().length`), 0);
  } finally { run(`UI.readOnly = false`); }
});
test('cambiarlo guarda el estilo en el proyecto con su paso del historial (se deshace); el mismo, o sin permiso, nada', () => {
  run(`histReset(); UI.tab = 'call';`);
  const btn = v => `({ dataset: { v: '${v}' } })`;
  run(`ACT['cl-style'](${btn('excel')}); histCapture();`);
  assert.strictEqual(J('P.call.style'), 'excel');
  assert.strictEqual(J('HIST.undo[HIST.undo.length - 1].label'), 'Hoja de llamado en estilo Excel');
  const n0 = J('HIST.undo.length');
  run(`ACT['cl-style'](${btn('excel')}); histCapture();`); assert.strictEqual(J('HIST.undo.length'), n0, 'el mismo: ningún paso');
  assert.strictEqual(J('histUndo()'), true); assert.strictEqual(J('P.call.style === undefined'), true, 'deshacer vuelve a Apple');
  run(`ACT['cl-style'](${btn('apple')}); histCapture();`); assert.strictEqual(J('P.call.style === undefined'), true, 'ya está en Apple');
  // el plan
  run(`UI.tab = 'plan'; ACT['pl-style'](${btn('excel')}); histCapture();`);
  assert.strictEqual(J('P.schedule.style'), 'excel'); assert.strictEqual(J('HIST.undo[HIST.undo.length - 1].label'), 'Plan de rodaje en estilo Excel');
  run(`ACT['pl-style'](${btn('apple')}); histCapture();`);
  assert.strictEqual(J('P.schedule.style'), 'apple'); assert.strictEqual(J('HIST.undo[HIST.undo.length - 1].label'), 'Plan de rodaje en estilo Apple');
  // sin permiso
  run(`UI.readOnly = true`);
  try { run(`ACT['pl-style'](${btn('excel')}); ACT['cl-style'](${btn('excel')});`); assert.strictEqual(J('P.schedule.style'), 'apple'); assert.strictEqual(J('P.call.style === undefined'), true); }
  finally { run(`UI.readOnly = false; delete P.schedule.style; delete P.call.style;`); }
});
test('el estilo no es contenido: cambiarlo no hace vieja una hoja ya enviada (la huella es la misma)', () => {
  const s0 = J('callSig(0)');
  XL('P.call', 'excel'); assert.strictEqual(J('callSig(0)'), s0);
  XL('P.call', 'apple'); assert.strictEqual(J('callSig(0)'), s0);
  XL('P.call');
});

/* ---------- la hoja de llamado en la pantalla ---------- */
test('la pantalla: la misma hoja en los dos estilos (solo cambia la clase y el botón); el CSS de Apple, sin marcos ni rejilla', () => {
  run(`dayData(callDays().days[0].id).notes = 'Ropa oscura'; P.call.crew.find(c => c.role === 'Dirección de fotografía').name = 'Mara Quispe';`);
  const ap = A.show('call'); XL('P.call', 'excel'); const xl = A.show('call'); XL('P.call');
  const norm = h => h.replace(/ cl-(ap|xl)">/, '">').replace(/<span class="hd-seg hide-sm"[^]*?<\/span>/, '');
  assert.strictEqual(norm(ap), norm(xl));
  for (const s of ['aria-label="Jefes de área"', 'Nota para el equipo', 'aria-label="Talentos"', 'aria-label="Equipo técnico"', 'class="cl-box cl-hr"']) assert.ok(ap.includes(s), s);
  const css = SRC('src/shell.html'), blk = css.slice(css.indexOf('(lote AI) la hoja de llamado en estilo Apple'), css.indexOf('(lote AI) el plan de rodaje en estilo Excel'));
  assert.ok(blk.length > 500, 'el bloque CSS');
  has(blk, /\.cs\.cl\.cl-ap \.cl-box\{border:0;background:none/); has(blk, /\.cs\.cl\.cl-ap \.cl-g :is\(th,td\)\{border:0\}/);
  has(blk, /\.cs\.cl\.cl-ap \.cl-bh\{background:none;border-bottom:1px solid var\(--ink\)/, 'el título con su regla de tinta');
  has(blk, /\.cs\.cl\.cl-ap \.cl-c2\{[^}]*border-inline:1px solid var\(--cl-sep\)/, 'la línea fina entre las columnas de la cabecera');
  has(blk, /\.cs\.cl\.cl-ap \.cl-box\.cl-note\{justify-self:center[^}]*border-radius:12px/, 'la nota al centro, redondeada');
  has(blk, /@media \(max-width:760px\)/, 'el teléfono');
  // el estilo del lote AH queda como estaba, para .cl-xl (sus reglas son las de «.cs.cl», sin tocar)
  has(css, /\.cs\.cl \.cl-box\{border:var\(--cl-bw\) solid var\(--cl-ln\)/);
  run(`P.call.crew.find(c => c.role === 'Dirección de fotografía').name = ''; delete dayData(callDays().days[0].id).notes;`);
});

/* ---------- la hoja de llamado en PDF ---------- */
test('el PDF de la hoja en Apple: sin rejilla ni marcos negros; secciones con su título y su regla; la misma estructura del lote AH', () => {
  if (!LIBF.length) { console.log('  (omitida: faltan las bibliotecas de PDF)'); return; }
  run(`P.call.crew.find(c => c.role === 'Sonidista').name = 'Pía Torres'; P.call.hospital.name = 'Hospital Belén'; P.call.radio = '1 Producción'; dayData(callDays().days[0].id).notes = 'Ropa oscura';`);
  const n = run(`(() => { __T = []; __AT = []; __RECT = []; pdfTheme(); return PDFX.call({}).doc.getNumberOfPages(); })()`);
  const t = J('__T'), at = J(`__AT.map(o => ({ theme: o.theme, tl: o.tableLineWidth || 0, lw: o.styles && o.styles.lineWidth, hl: o.headStyles && o.headStyles.lineWidth, head: (o.head || []).map(r => r.map(x => x && x.content !== undefined ? x.content : x)) }))`);
  assert.ok(n <= 3, n + ' páginas');
  // sin rejilla: ninguna tabla «grid» ni con marco; las líneas, solo la fina de abajo (o ninguna)
  assert.ok(at.length > 5);
  for (const o of at) {
    assert.notStrictEqual(o.theme, 'grid'); assert.strictEqual(o.tl, 0);
    const ok = w => w === 0 || (w && typeof w === 'object' && w.top === 0 && w.left === 0 && w.right === 0 && w.bottom <= .6);
    assert.ok(ok(o.lw), 'la línea de las celdas: ' + JSON.stringify(o.lw)); assert.ok(o.hl === undefined || ok(o.hl), 'la de los títulos: ' + JSON.stringify(o.hl));
  }
  // los títulos de sección (con su regla), no en una banda de la tabla
  for (const s of ['Jefes de área', 'Talentos', 'Equipo técnico', 'Utilería especial']) assert.ok(t.includes(s), s);
  assert.ok(!at.some(o => o.head.some(r => r.some(x => /^Talentos|^Equipo técnico|^Jefes de área/.test(String(x))))), 'sin bandas de título');
  // la estructura del lote AH: sin «Cronograma», sin pie ni número de página ni fecha de creación; el orden de los bloques
  assert.ok(!t.includes('Cronograma') && !t.some(x => /^\d+ de \d+$|^Página \d/.test(x)));
  assert.ok(t.some(x => /Hoja de llamado · Jornada 1 de \d+/.test(x)));
  // (las celdas con varios estilos se escriben palabra por palabra: se busca en todo el texto junto)
  const all = t.join(' ').replace(/\s+/g, ' ');
  for (const s of ['Cierre de set', 'Wrap', 'Hora · Esc.', 'Nota para el equipo', 'Ropa oscura', 'Centro de salud', 'Canales de radio', 'Hospital Belén', '1 Producción']) assert.ok(all.includes(s), s);
  const ix = s => t.findIndex(x => x === s);
  assert.ok(ix('Jefes de área') < ix('Hora · Esc.') && ix('Hora · Esc.') < ix('Talentos') && ix('Talentos') < ix('Equipo técnico') && ix('Equipo técnico') < ix('Utilería especial') && ix('Utilería especial'), 'el orden');
  // (lote AJ) el centro de salud va en la cabecera, antes de los bloques del cuerpo
  assert.ok(ix('Centro de salud') >= 0 && ix('Centro de salud') < ix('Jefes de área'), 'el centro de salud, en la cabecera');
  // la cabecera sin marco: ningún rectángulo de contorno (solo los rellenos: la tira, la nota)
  assert.ok(!J(`__RECT.filter(r => r[4] === 'S').length`), 'sin marcos');
  // A4 también
  run(`PDF_PAPER = 'a4'`);
  try { const d = run(`(() => { pdfTheme(); return PDFX.call({}).doc; })()`); assert.ok(Math.abs(d.internal.pageSize.getWidth() - 595.28) < 1); }
  finally { run(`PDF_PAPER = null`); }
});
test('el PDF de la hoja en Excel: como en el lote AH (la rejilla negra, los cuadros y la cabecera encerrada), con el mismo contenido', () => {
  if (!LIBF.length) return;
  run(`__T = []; __AT = []; __RECT = []; pdfTheme(); PDFX.call({});`);
  const tAp = J('__T');
  XL('P.call', 'excel');
  try {
    run(`__T = []; __AT = []; __RECT = []; pdfTheme(); PDFX.call({});`);
    const t = J('__T'), at = J(`__AT.map(o => [o.theme, o.tableLineWidth || 0])`);
    assert.ok(at.length && at.every(([th, tl]) => th === 'grid' && tl > 0), 'todas las tablas en rejilla, con marco');
    assert.ok(J(`__RECT.filter(r => r[4] === 'S').length`) >= 1, 'la cabecera encerrada');
    // lo que dice la hoja es lo mismo: cada dato de la cabecera y de las filas sale en los dos
    const jn = a => a.join(' ').replace(/\s+/g, ' ');
    for (const s of ['Hospital Belén', '1 Producción', 'Pía Torres', 'Ropa oscura', 'Cierre de set', 'Wrap', 'Llamado general', 'Wrap · fin de jornada']) { assert.ok(jn(t).includes(s), 'Excel: ' + s); assert.ok(jn(tAp).includes(s), 'Apple: ' + s); }
  } finally { XL('P.call'); run(`P.call.crew.find(c => c.role === 'Sonidista').name = ''; P.call.hospital.name = ''; delete P.call.radio; delete dayData(callDays().days[0].id).notes;`); }
  // en el código: las dos formas, lado a lado
  const src = SRC('src/pdf-llamado.js');
  has(src, /const AP = !\(typeof callXL === 'function' && callXL\(\)\)/); has(src, /function pdfCallHR\(doc, X, y, draw = true\)/);
  has(src, /CL_SEC = \{ font: 'helvetica', fs: CLF\.h3, rfs: CLF\.ft, rcol: K\.c2, line: INK, lw: \.6, gap: 6, after: 10, box: false \}/);
});

/* ---------- el plan de rodaje y el DOOD ---------- */
test('el PDF del plan en Apple: la línea fina abajo de cada fila, sin rejilla; la cabecera sin cuadro con «Página 1 de N»; leyenda y reparto sin cuadros', () => {
  if (!LIBF.length) return;
  const d = pdfOf('plan');
  const main = J(`__AT.filter(o => o.head && o.head[0] && o.head[0].length === 12).map(o => [o.styles.lineWidth, o.headStyles.lineWidth])`);
  assert.ok(main.length >= 1);
  for (const [lw, hl] of main) { assert.deepStrictEqual(lw, { top: 0, right: 0, bottom: .6, left: 0 }); assert.strictEqual(hl, 0); }
  assert.strictEqual(J(`__AT[__AT.length - 1].styles.lineWidth`), 0, 'el reparto sin cuadro');
  const t = J('__T');
  assert.ok(t.includes('Plan de rodaje') && t.includes('Tiempo aprox.'));
  assert.ok(t.some(x => /^Página 1 de \d+$/.test(x)), 'el número de página, en la cabecera');
  assert.ok(!t.some(x => /de octubre|de noviembre de 20/.test(x) && !/Jornada/.test(x)), 'sin la fecha de creación');
  assert.strictEqual(d._pg[1].al, 'right', 'la cabecera sin cuadro (docHeader flat)');
  assert.ok(!J(`__RECT.filter(r => r[4] === 'S' && r[2] > 40).length`), 'sin el cuadro de la cabecera ni el de la leyenda (solo el borde de la muestra blanca)');
  // con miniaturas: los planos debajo de cada escena, con su viñeta; sin ellas, el plan de siempre
  run(`globalThis.__tg = THUMB3.get; THUMB3.get = () => '${PNG}';`);   // (las viñetas, como si ya estuvieran listas)
  try {
    pdfOf('plan'); assert.ok(J('__IMG') > 0, 'las viñetas'); assert.ok(J('__T').includes('1.1'), 'los planos');
    run(`P.schedule.noThumbs = true`); pdfOf('plan'); assert.strictEqual(J('__IMG'), 0); assert.ok(!J('__T').includes('1.1'));
  } finally { run(`THUMB3.get = __tg; delete P.schedule.noThumbs;`); }
});
test('el PDF del plan en Excel: la rejilla negra y los cuadros del lote AH (la cabecera en su cuadro)', () => {
  if (!LIBF.length) return;
  XL('P.schedule', 'excel');
  try {
    const d = pdfOf('plan'), ink = J('PDF_BLACK');
    for (const [lc, lw, hlw] of J(`__AT.filter(o => o.head && o.head[0] && o.head[0].length === 12).map(o => [o.styles.lineColor, o.styles.lineWidth, o.headStyles.lineWidth])`)) { assert.deepStrictEqual(lc, ink); assert.strictEqual(lw, .7); assert.strictEqual(hlw, .7); }
    assert.notStrictEqual(d._pg[1].al, 'right', 'la cabecera de siempre (el cuadro)');
    assert.ok(J(`__RECT.filter(r => r[4] === 'S').length`) >= 2, 'el cuadro de la cabecera y el de la leyenda');
  } finally { XL('P.schedule'); }
});
test('el DOOD va con el estilo del plan: Apple, la rejilla fina y los códigos en una línea; Excel, la rejilla negra y los códigos en su cuadro', () => {
  if (!LIBF.length) return;
  let d = pdfOf('dood');
  let at = J(`__AT.map(o => [o.styles.lineColor, o.styles.lineWidth, o.headStyles && o.headStyles.lineColor])`);
  assert.strictEqual(at.length, 1, 'una tabla: los códigos van en una línea'); assert.strictEqual(at[0][1], .4); assert.deepStrictEqual(at[0][0], J('PDF_LINE'));
  assert.deepStrictEqual(at[0][2], [255, 255, 255]);
  assert.ok(J('__T').some(x => /^I inicio/.test(x))); assert.strictEqual(d._pg[1].al, 'right');
  XL('P.schedule', 'excel');
  try {
    d = pdfOf('dood'); at = J(`__AT.map(o => [o.styles.lineColor, o.styles.lineWidth])`);
    assert.strictEqual(at.length, 2, 'la tabla y el cuadro de los códigos'); for (const [lc, lw] of at) { assert.deepStrictEqual(lc, J('PDF_BLACK')); assert.strictEqual(lw, .7); }
    assert.notStrictEqual(d._pg[1].al, 'right');
  } finally { XL('P.schedule'); }
});
test('docHeader: la opción flat (sin cuadro) da lo mismo que sigue; sin ella, el cuadro de siempre para los demás documentos', () => {
  if (!LIBF.length) return;
  const r = J(`(() => { pdfTheme(); const a = newDoc(), b = newDoc(); __RECT = [];
    const ya = docHeader(a, 'Presupuesto', 'Resumen'), ra = __RECT.length; __RECT = [];
    const yb = docHeader(b, 'Plan de rodaje', '2 jornadas', { flat: true }), rb = __RECT.length;
    pageNumbers(a); pageNumbers(b);
    return { ya, yb, ra, rb, pa: a._pg[1], pb: b._pg[1], la: a._label, lb: b._label, ha: [...a._hdr], hb: [...b._hdr] }; })()`);
  assert.strictEqual(r.ya, r.yb, 'lo que sigue empieza en el mismo lugar');
  assert.ok(r.ra >= 1, 'el cuadro'); assert.strictEqual(r.rb, 0, 'sin cuadro');
  assert.strictEqual(r.pa.al, undefined); assert.strictEqual(r.pb.al, 'right');
  assert.strictEqual(r.lb, 'Plan de rodaje'); assert.deepStrictEqual(r.hb, [1]);
  const pdf = SRC('src/pdf.js');
  has(pdf, /function docHeader\(doc, label, sub, o = \{\}\) \{\n  if \(o\.flat\) return docHeaderFlat\(doc, label, sub, o\);/);
  // solo el plan y el DOOD la usan (y solo en Apple)
  const uses = [...(pdf + SRC('src/plan-dood.js')).matchAll(/flat: true/g)].length;
  assert.strictEqual(uses, 2);
});

/* ---------- el stripboard y el DOOD en la pantalla ---------- */
test('el stripboard en la pantalla: Excel con líneas negras entre filas y columnas (.pl.xl); Apple, como estaba; el DOOD lo acompaña', () => {
  XL('P.schedule', 'excel');
  try {
    has(A.show('plan'), /class="pl pl-ed[^"]* xl" id="board"/);
    has(J('doodHTML()'), /<div class="card dd-card xl">/);
  } finally { XL('P.schedule'); }
  has(J('doodHTML()'), /<div class="card dd-card">/);
  const css = SRC('src/shell.html'), blk = css.slice(css.indexOf('(lote AI) el plan de rodaje en estilo Excel'), css.indexOf('</style>', css.indexOf('(lote AI) el plan de rodaje en estilo Excel')));
  has(blk, /\.pl\.xl \.pday\{border:1\.5px solid var\(--xl-ln\);border-radius:0/);
  has(blk, /\.pl\.xl \.pday-rows>\.prow:is\(\.sc,\.ev,\.empty\)\{border-top:1px solid var\(--xl-ln\)\}/);
  has(blk, /top:0;bottom:0;width:1px;background:var\(--xl-ln\)/, 'la línea entre columnas, de arriba abajo');
  has(blk, /\.pl\.xl \.pl-head\{background:/, 'los títulos de las columnas en su fila');
  // los títulos no muestran las columnas escondidas (no pisan su display)
  assert.doesNotMatch(blk, /\.pl\.xl \.pl-head>[^{]*\{[^}]*display:/);
  has(blk, /\.dd-card\.xl table\.dood :is\(th,td\)\{border:1px solid var\(--ink\)\}/);
});

/* ---------- la ayuda y el inglés ---------- */
test('la ayuda cuenta el botón; los textos nuevos tienen su inglés (i18n/en-manual.json)', () => {
  for (const t of ['call', 'plan']) assert.ok(J(`HELP.${t}.some(([h, x]) => h === 'Excel | Apple' && /Apple/.test(x) && /Excel/.test(x) && /proyecto/.test(x))`), t);
  assert.ok(!J(`HELP.call.some(([h, x]) => /va toda en cuadros/.test(x))`), 'la ayuda ya no dice que la hoja va siempre en cuadros');
  const E = JSON.parse(SRC('i18n/en-manual.json'));
  assert.ok(E['// lote AI · estilo']);
  const news = ['Estilo del documento', 'Estilo Excel: en cuadros, con líneas negras bien visibles (en la pantalla y en el PDF)', 'Estilo Apple: líneas finas y aire, sin cuadros (en la pantalla y en el PDF)',
    'en cuadros, con líneas negras bien visibles (en la pantalla y en el PDF)', 'líneas finas y aire, sin cuadros (en la pantalla y en el PDF)',
    'Hoja de llamado en estilo Excel', 'Hoja de llamado en estilo Apple', 'Plan de rodaje en estilo Excel', 'Plan de rodaje en estilo Apple',
    ...J(`[...HELP.call, ...HELP.plan].filter(([h]) => h === 'Excel | Apple' || h === 'La hoja' || h === 'Exportar').map(([, x]) => x)`)];
  for (const k of news) assert.ok(E[k], 'falta: ' + k.slice(0, 70));
  for (const k of ['Talentos', 'Equipo técnico', 'Jefes de área', 'Utilería especial', 'Punto de encuentro', 'Movilidad', 'Avance de la jornada siguiente']) assert.ok(E[k] || /\| *k *\|/.test(k) || SRC('i18n/en.json').includes(JSON.stringify(k)), 'el título de sección: ' + k);
});

for (const [n, f] of tests) { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message, (e.stack.split('\n').find(l => l.includes('estilo-ai')) || '').trim()); } }
console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
