/* Lote AH · la hoja de llamado (frente «llamado»): con el programa entero en un contexto aislado (como cabeceras.test.js
   y pdf-diseno.test.js) y el proyecto de ejemplo. Los datos: lo cambiado sobre el stripboard queda solo en la hoja y se
   vuelve a la guía; quitar un plano lo marca en el storyboard; filas libres; hojas libres; el avance de cualquier
   jornada; correr las fechas en el plan (o cambiarla solo en la hoja); jefes de área; el saneado al cargar. El texto:
   lo que Ronald pidió quitar ya no sale (en pantalla, en el PDF y en el Excel).  node test/llamado-ah.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/../';
let fail = 0;
const tests = [];
const test = (n, f) => tests.push([n, f]);
const has = (s, re, msg) => assert.ok(re.test(s), msg || String(re));
const LIB = ['desktop/app/lib/', 'server/public/app/lib/'].map(d => R + d).find(d => fs.existsSync(d + 'jspdf.umd.min.js') && fs.existsSync(d + 'jspdf.plugin.autotable.min.js'));

/* ---------- el programa, sin navegador (lo mismo que pdf-diseno.test.js) ---------- */
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
  if (LIB) for (const f of ['jspdf.umd.min.js', 'jspdf.plugin.autotable.min.js']) vm.runInContext(fs.readFileSync(LIB + f, 'utf8'), c, { filename: f });
  const run = s => vm.runInContext(s, c);
  if (LIB) run(`if (!window.jspdf.jsPDF.API.autoTable && typeof applyPlugin === 'function') applyPlugin(window.jspdf.jsPDF);`);
  // los menús y las confirmaciones: se guarda lo que mostrarían y se acepta
  run(`globalThis.__pops = []; popover = (anchor, html, onMount) => { __pops.push(html); }; confirmBox = (t, x, ok, fn) => fn();`);
  run(`setProject(buildSample()); UI.callDay = 0; UI.callFree = null; callCrew();`);
  const show = () => { run(`UI.tab = 'call'; render();`); return String(view.innerHTML); };
  return { run, show };
}
const A = app(), run = A.run, J = s => JSON.parse(run(`JSON.stringify(${s})`));
// un campo de la pantalla, de mentira (lo que mira cada BIND)
const field = (o, tag = 'INPUT') => `({ tagName: '${tag}', value: ${JSON.stringify(o.value)}, dataset: ${JSON.stringify(o.dataset)}, classList: { contains: c => ${JSON.stringify(o.cls || [])}.includes(c) } })`;
const D0 = `peekDay(callDays().days[0].id)`;

/* ---------- lo cambiado sobre el stripboard ---------- */
test('cambiar la sinopsis y el número de una escena queda solo en la hoja (el guion, el desglose y el plan no cambian)', () => {
  const before = run(`JSON.stringify([P.scenes, P.schedule.items, P.elements, P.shots])`);
  run(`BIND['cl-ov'](${field({ value: 'Ana llega tarde', dataset: { k: 'r', id: 'k:2|', f: 'syn' } }, 'TEXTAREA')}, 'change')`);
  run(`BIND['cl-ov'](${field({ value: '2B', dataset: { k: 'r', id: 'k:2|', f: 'code' } })}, 'change')`);
  assert.deepStrictEqual(J(`${D0}.rov`), { 'k:2|': { syn: 'Ana llega tarde', code: '2B' } });
  assert.strictEqual(run(`JSON.stringify([P.scenes, P.schedule.items, P.elements, P.shots])`), before, 'el proyecto fuera de la hoja no cambió');
  const r = J(`callSched(callDays().days[0]).rows.find(r => r.key === 'k:2|')`);
  assert.strictEqual(r.v.syn, 'Ana llega tarde'); assert.strictEqual(r.v.code, '2B'); assert.ok(r.ov.syn && r.ov.code);
  assert.notStrictEqual(r.b.syn, 'Ana llega tarde', 'lo del stripboard sigue a mano');
  // escribir lo mismo que el stripboard (o borrar) vuelve a lo del stripboard
  run(`BIND['cl-ov'](${field({ value: '2', dataset: { k: 'r', id: 'k:2|', f: 'code' } })}, 'change')`);
  run(`BIND['cl-ov'](${field({ value: '', dataset: { k: 'r', id: 'k:2|', f: 'syn' } }, 'TEXTAREA')}, 'change')`);
  assert.strictEqual(J(`${D0}.rov || null`), null);
});
test('los planos también: descripción, acción, lente, sonido y personajes; el sonido ya no se escribe en el storyboard', () => {
  const sid = run(`D.shotsBy['1'][0].id`), snd0 = run(`P.shots['${sid}'].snd || ''`);
  run(`BIND['cl-ov'](${field({ value: 'si', dataset: { k: 's', id: sid, f: 'snd' } }, 'SELECT')}, 'change')`);
  run(`BIND['cl-ov'](${field({ value: '35 mm', dataset: { k: 's', id: sid, f: 'lens' } })}, 'change')`);
  assert.deepStrictEqual(J(`${D0}.sov['${sid}']`), { snd: 'si', lens: '35 mm' });
  assert.strictEqual(run(`P.shots['${sid}'].snd || ''`), snd0, 'el storyboard no cambió');
  const x = J(`callSched(callDays().days[0]).rows[0].shots[0]`);
  assert.strictEqual(x.v.lens, '35 mm'); assert.strictEqual(x.v.snd, 'si');
  // «Volver a lo del stripboard» de la fila del plano
  run(`clGuideRow('s:${sid}')`);
  assert.strictEqual(J(`${D0}.sov || null`), null);
});
test('la huella de la hoja cuenta lo cambiado y vuelve a ser la misma al volver a la guía', () => {
  const s0 = run(`callSig(0)`);
  run(`BIND['cl-ov'](${field({ value: 'Otra', dataset: { k: 'r', id: 'k:1|', f: 'set' } }, 'TEXTAREA')}, 'change')`);
  run(`clAddRow('r:k:1|', false)`);
  run(`clDelRow('s:' + D.shotsBy['2'][0].id)`);
  const s1 = run(`callSig(0)`);
  assert.notStrictEqual(s1, s0, 'la hoja cambió: la que salió queda vieja');
  assert.ok(run(`callChanges(${D0})`) >= 3, 'cuenta los cambios');
  // «Volver a la guía del stripboard»: la hoja entera
  run(`ACT['cl-revert']()`);
  assert.strictEqual(run(`callSig(0)`), s0);
  assert.strictEqual(run(`callChanges(${D0})`), 0);
});

/* ---------- quitar un plano: la etiqueta en el storyboard y el guion técnico ---------- */
test('un plano quitado en la hoja lleva «Eliminado en la hoja de llamado · Jornada 1»; ↺ lo devuelve y quita la etiqueta', () => {
  const sid = run(`D.shotsBy['2'][2].id`);
  run(`clDelRow('s:${sid}')`);
  assert.deepStrictEqual(J(`callShotCuts()`), { [sid]: [1] });
  assert.ok(!J(`callSched(callDays().days[0]).rows.find(r => r.key === 'k:2|').shots.map(x => x.k)`).includes('s:' + sid), 'ya no sale en la hoja');
  assert.strictEqual(run(`callCutLabel([1])`), 'Eliminado en la hoja de llamado · Jornada 1');
  run(`UI.tab = 'board'; UI.sbView = 'panels'; UI.sbScene = '2'; render();`);
  const board = String(run(`$('#view').innerHTML`));
  has(board, /class="pcell[^"]* cut"/); has(board, /class="pcut"[^>]*>Eliminado en la hoja de llamado · Jornada 1</);
  run(`UI.sbView = 'table'; render();`);
  has(String(run(`$('#view').innerHTML`)), /class="badge cut"[^>]*>Eliminado en la hoja de llamado · Jornada 1</, 'en el guion técnico');
  run(`UI.sbView = 'panels'; UI.sbScene = null;`);
  // también el PDF del guion técnico
  has(fs.readFileSync(R + 'src/pdf.js', 'utf8'), /sh\.done \? 'Rodado' : cuts\[sh\.id\] \? callCutLabel\(cuts\[sh\.id\]\)/);
  // ↺: vuelve a la hoja y la etiqueta se va
  run(`clBack('s:${sid}')`);
  assert.deepStrictEqual(J(`callShotCuts()`), {});
  // quitar la escena entera de la hoja marca sus planos
  run(`clDelRow('r:k:5|')`);
  assert.deepStrictEqual(Object.values(J(`callShotCuts()`)).map(x => x[0]), J(`D.shotsBy['5'].map(() => 1)`));
  assert.ok(!J(`callSheet(0).de.keys`).includes('5'), 'la escena sale de la hoja (sus horas y su reparto también)');
  run(`clBack('r:k:5|')`);
  assert.deepStrictEqual(J(`callShotCuts()`), {});
});

/* ---------- filas libres (clic derecho) ---------- */
test('agregar filas con el clic derecho: en el cronograma (arriba y abajo), un plano, un talento y alguien del equipo; nada pasa al stripboard', () => {
  const items0 = run(`JSON.stringify(P.schedule.items)`), crew0 = run(`P.call.crew.length`);
  run(`clAddRow('r:k:2|', false)`); run(`clAddRow('r:k:2|', true)`);
  const xr = J(`${D0}.xrows`);
  assert.strictEqual(xr.length, 2);
  const order = J(`(S => [...S.rows, ...S.close].map(r => r.k))(callSched(callDays().days[0]))`);
  const i2 = order.indexOf('r:k:2|');
  assert.strictEqual(order[i2 - 1], 'x:' + xr[1].id, 'arriba de la escena 2');
  assert.strictEqual(order[i2 + 1], 'x:' + xr[0].id, 'abajo de la escena 2 (después de sus planos)');
  // un plano libre en la escena 1, después del último
  run(`clAddShot('r:k:1|')`);
  const shots = J(`callSched(callDays().days[0]).rows[0].shots.map(x => x.k)`);
  assert.ok(/^xs:/.test(shots[shots.length - 1]), 'el plano libre va al final de su escena');
  // un talento y alguien del equipo (en el área de la fila)
  const dp = run(`P.call.crew.find(c => c.role === 'Dirección de fotografía').id`);
  run(`P.call.crew.find(c => c.id === '${dp}').name = 'Lucía'`);
  run(`clAddRow('a:' + callCast(callDays().days[0])[0].el.id, false)`); run(`clAddRow('c:${dp}', false)`);
  assert.strictEqual(J(`${D0}.xcast`).length, 1);
  assert.strictEqual(J(`${D0}.xcrew[0].dept`), 'cam');
  assert.strictEqual(run(`JSON.stringify(P.schedule.items)`), items0, 'el stripboard no cambia');
  assert.strictEqual(run(`P.call.crew.length`), crew0, 'el directorio del proyecto no cambia');
  // sus campos se escriben (las horas, como horas)
  const xid = J(`${D0}.xrows[0].id`);
  run(`BIND['cl-xf'](${field({ value: 'Ensayo', dataset: { k: 'x', id: xid, f: 'set' } }, 'TEXTAREA')}, 'input')`);
  run(`BIND['cl-xf'](${field({ value: '930', dataset: { k: 'x', id: xid, f: 't' }, cls: ['tm'] })}, 'change')`);
  assert.deepStrictEqual(J(`(x => [x.set, x.t])(${D0}.xrows[0])`), ['Ensayo', '09:30']);
  // quitar una fila libre la borra y las que iban junto a ella pasan a su lugar
  const xr1 = xr[1].id; run(`clAddRow('x:${xr1}', false)`);
  const nid = J(`${D0}.xrows`).find(x => x.at === 'x:' + xr1).id;
  run(`clDelRow('x:${xr1}')`);
  assert.deepStrictEqual(J(`(x => [x.at, !!x.up])(${D0}.xrows.find(x => x.id === '${nid}'))`), ['r:k:2|', true]);
  // el menú del clic derecho
  run(`__pops.length = 0; clRowMenu({ left: 0, right: 0, top: 0, bottom: 0 }, { dataset: { cr: 'r:k:1|' }, classList: { contains: c => c === 'cl-lsc' } })`);
  const pop = run(`__pops[0]`);
  for (const t of ['Agregar fila arriba', 'Agregar fila abajo', 'Quitar fila', 'Agregar un plano']) assert.ok(pop.includes(t), t);
  run(`__pops.length = 0; clRowMenu({ left: 0, right: 0, top: 0, bottom: 0 }, { dataset: { cr: 'c:${dp}' }, classList: { contains: () => false } })`);
  assert.ok(run(`__pops[0]`).includes('Ya no es jefe de área'), 'la directora de fotografía ya es jefa de área');
  run(`for (const k of ['xrows', 'xsh', 'xcast', 'xcrew']) delete ${D0}[k]; P.call.crew.find(c => c.id === '${dp}').name = '';`);
});

/* ---------- jefes de área ---------- */
test('jefes de área: el cargo de jefe de cada área, con su teléfono; se marca o se quita a mano; los de la cabecera no se repiten', () => {
  run(`for (const [r, n, t] of [['Dirección de fotografía', 'Lucía Ramos', '987'], ['Sonidista', 'Pedro Díaz', ''], ['Microfonista', 'Iván', ''], ['Jefatura de producción', 'Grace', '944'], ['Jefe de eléctricos (gaffer)', 'Juan', '']]) { const c = P.call.crew.find(x => x.role === r); c.name = n; c.phone = t; }`);
  const H = () => J(`(dd => callHeads(callCrewRows(dd, ''), callKeyCrew(dd)).map(h => h.role + ':' + h.name + ':' + (h.phone || '')))(${D0})`);
  assert.deepStrictEqual(H(), ['Dirección de fotografía:Lucía Ramos:987', 'Jefe de eléctricos (gaffer):Juan:', 'Sonidista:Pedro Díaz:']);
  // el microfonista marcado como jefe: manda la marca en su área; el sonidista sin marca, no
  run(`P.call.crew.find(x => x.role === 'Microfonista').head = true`);
  assert.ok(H().includes('Microfonista:Iván:') && !H().some(x => x.startsWith('Sonidista')));
  run(`P.call.crew.find(x => x.role === 'Dirección de fotografía').head = false`);
  assert.ok(!H().some(x => x.startsWith('Dirección de fotografía')), 'quitada a mano');
  has(A.show(), /<section class="cl-box cl-heads"[^]*Jefes de área[^]*Microfonista/);
  run(`for (const c of P.call.crew) { c.name = ''; c.phone = ''; delete c.head; }`);
});

/* ---------- hojas libres ---------- */
test('una hoja libre: se crea desde el selector, se nombra, se llena a mano y sale en PDF y Excel', () => {
  run(`BIND['cs-sel']({ value: '+' })`);
  const f = J(`P.call.free`);
  assert.strictEqual(f.length, 1); assert.strictEqual(run(`UI.callFree`), f[0].id);
  assert.ok(/^f/.test(f[0].id));
  run(`BIND['cl-fname']({ value: 'Ensayo general' }, 'change')`);
  run(`clRowEnd('x'); clRowEnd('xa');`);
  run(`(dd => { dd.xrows[0].set = 'Ensayo de la escena 6'; dd.xrows[0].t = '10:00'; dd.xcast[0].actor = 'Rosa'; dd.crewCall = '08:00'; dd.date = '2026-11-20'; })(dayData(UI.callFree))`);
  const X = J(`(X => ({ title: X.title, n: X.n, call: X.call, rows: X.sched.rows.map(r => r.v.set), tal: X.talent.map(r => r.actor), date: X.date && feIso(X.date) }))(callSheetData(UI.callFree))`);
  assert.deepStrictEqual(X, { title: 'Ensayo general', n: -1, call: '08:00', rows: ['Ensayo de la escena 6'], tal: ['Rosa'], date: '2026-11-20' });
  assert.deepStrictEqual(J(`callAdvIds(UI.callFree)`), [], 'sin avance de entrada');
  assert.deepStrictEqual(J(`callMissing(UI.callFree).map(x => x.k)`).filter(k => k === 'date' || k === 'call'), [], 'con su fecha y su llamado, no faltan');
  const h = A.show();
  has(h, /data-bind="cl-fname"[^>]*value="Ensayo general"|value="Ensayo general"[^>]*data-bind="cl-fname"/);
  has(h, /<optgroup label="Hojas libres"><option value="f:/);
  // el Excel
  const xl = J(`callSheetXLSX(callSheetData(UI.callFree)).rows.flatMap(r => (r.cells || []).map(c => c && c.v)).filter(Boolean)`);
  assert.ok(xl.some(v => /Ensayo general/.test(v)) && xl.some(v => /Ensayo de la escena 6/.test(v)));
  if (LIB) {
    const n = run(`(() => { pdfTheme(); const { doc, name } = PDFX.call({}); globalThis.__fname = name; return doc.getNumberOfPages(); })()`);
    assert.ok(n >= 1); assert.ok(/_hoja_de_llamado_Ensayo/.test(run(`__fname`)), run(`__fname`));
  }
  // borrar
  run(`ACT['cl-free-del']()`);
  assert.deepStrictEqual(J(`callFrees()`), []); assert.strictEqual(run(`UI.callFree`), null);
});

/* ---------- el avance de cualquier jornada ---------- */
test('el avance: de entrada la jornada siguiente; se agrega cualquier otra (en orden) y se quita; «Avance automático» vuelve', () => {
  // tres jornadas: se corta la primera después de la escena 2
  run(`P.schedule.items.splice(2, 0, { d: 'dAH1' }); derive();`);
  const ids = J(`callDays().days.map(d => d.id)`);
  assert.strictEqual(ids.length, 3);
  assert.deepStrictEqual(J(`callAdvIds(0)`), [ids[1]]);
  run(`clAdvSet(l => [...l, '${ids[2]}'])`);
  assert.deepStrictEqual(J(`callAdvances(0).map(A => A.n)`), [2, 3]);
  run(`clAdvSet(l => l.filter(id => id !== '${ids[1]}'))`);
  assert.deepStrictEqual(J(`callAdvances(0).map(A => A.n)`), [3]);
  assert.notStrictEqual(run(`callSig(0)`), run(`(() => { const a = ${D0}.adv; delete ${D0}.adv; const s = callSig(0); ${D0}.adv = a; return s; })()`), 'el avance elegido entra en la huella');
  run(`ACT['cl-adv-auto']()`);
  assert.deepStrictEqual(J(`callAdvIds(0)`), [ids[1]]);
  assert.deepStrictEqual(J(`callAdvIds(2)`), [], 'la última: «Fin de rodaje»');
});

/* ---------- la fecha ---------- */
test('la fecha «solo en esta hoja»: la hoja (y el avance de la anterior) la muestran; el plan y el calendario no cambian', () => {
  const plan0 = J(`shootDates(P, 3).map(feIso)`);
  run(`clSetDate(callSheet(1), '2026-11-06', 'one')`);
  assert.strictEqual(J(`feIso(callSheet(1).date)`), '2026-11-06');
  assert.deepStrictEqual(J(`shootDates(P, 3).map(feIso)`), plan0);
  assert.strictEqual(J(`feIso(callAdvances(0)[0].date)`), '2026-11-06');
  has(A.show().slice(0), /class="hd cl-hd"/);
  run(`UI.callDay = 1;`); has(A.show(), /solo en esta hoja[^]*data-act="cl-date-back"/);
  run(`ACT['cl-date-back']()`); assert.strictEqual(J(`${`peekDay(callDays().days[1].id)`}.date || null`), null);
  run(`UI.callDay = 0;`);
});
test('«Correr esta jornada y las siguientes»: cambia el plan (y así el calendario); las de fecha propia se corren los mismos días', () => {
  // (el sábado y el domingo son libres; la jornada 3 tiene fecha propia: el lunes 9)
  run(`P.schedule.start = '2026-11-02'; P.schedule.off = [0, 6]; P.schedule.items.filter(i => i.d)[2].date = '2026-11-09';`);
  assert.deepStrictEqual(J(`shootDates(P, 3).map(feIso)`), ['2026-11-02', '2026-11-03', '2026-11-09']);
  // la jornada 2 pasa al jueves 5: dos días después
  assert.strictEqual(run(`callShiftDates(1, '2026-11-05')`), 2);
  assert.deepStrictEqual(J(`shootDates(P, 3).map(feIso)`), ['2026-11-02', '2026-11-05', '2026-11-11']);
  // la primera: es el comienzo del rodaje
  run(`callShiftDates(0, '2026-11-04')`);
  assert.strictEqual(run(`P.schedule.start`), '2026-11-04');
  const d = J(`shootDates(P, 3).map(feIso)`);
  assert.strictEqual(d[0], '2026-11-04'); assert.ok(d[1] > d[0] && d[2] > d[1], 'en orden');
  assert.ok(!['0', '6'].includes(String(new Date(d[1] + 'T12:00').getDay())), 'en un día de rodaje (no sábado ni domingo)');
  // con el menú: deja el paso de deshacer y la hoja sin fecha propia
  run(`dayData(callDays().days[1].id).date = '2026-11-20'; clSetDate(callSheet(1), '2026-11-16', 'all')`);
  assert.strictEqual(J(`feIso(callSheet(1).date)`), '2026-11-16');
  assert.strictEqual(J(`peekDay(callDays().days[1].id).date || null`), null);
  // los días marcados en el calendario son los del plan
  assert.ok(J(`[...planShootMarks()]`).includes('2026-11-16'));
});

/* ---------- lo que se quitó ya no sale ---------- */
test('la pantalla: sin proveedores, sin título «Cronograma», sin pie; utilería y punto de encuentro debajo; talentos antes del equipo; cierre de set y wrap en la cabecera', () => {
  run(`P.call.vendors = [{ id: 'v1', name: 'Luces SAC', gear: 'Luces', phone: '1', contact: '' }]; UI.callDay = 0;`);
  const h = A.show(), hd = h.slice(h.indexOf('class="hd cl-hd"'), h.indexOf('</section>', h.indexOf('class="cl-box cl-top"')));
  assert.doesNotMatch(h, /Proveedores|Luces SAC/, 'proveedores');
  assert.doesNotMatch(h, /<h3>Cronograma<\/h3>/, 'el título «Cronograma»');
  assert.doesNotMatch(h, /class="cl-foot"/, 'el pie');
  assert.doesNotMatch(hd, /Utilería especial|Punto de encuentro|cl-link-in|cl-mph/, 'la cabecera solo con la locación y su mapa');
  has(hd, /Cierre de set[^]*Wrap/); has(hd, /data-f="cierre"/); has(hd, /data-f="end"/);
  const ti = h.indexOf('aria-label="Talentos"'), eq = h.indexOf('aria-label="Equipo técnico"'), ut = h.indexOf('<h3>Utilería especial</h3>'), mp = h.indexOf('<h3>Punto de encuentro</h3>'), hr = h.indexOf('class="cl-box cl-hr"');
  assert.ok(ti > 0 && eq > ti, 'talentos y después el equipo técnico');
  assert.ok(ut > eq && mp > ut && hr > mp, 'lo demás, debajo');
  assert.strictEqual(J(`P.call.vendors.length`), 1, 'los proveedores siguen guardados');
});
test('el PDF: sin encabezado ni pie de página (ni «1 de 2», ni la fecha y la hora en que salió), sin «Cronograma» ni proveedores; en cuadros', () => {
  if (!LIB) { console.log('  (omitida: faltan las bibliotecas de PDF)'); return; }
  run(`UI.callDay = 0; UI.callFree = null; P.call.crew.find(c => c.role === 'Dirección de fotografía').name = 'Lucía Ramos'; dayData(callDays().days[0].id).cierre = '10:30';`);
  run(`globalThis.__seen = []; (() => { const API = window.jspdf.jsPDF.API; if (!API.__ah) { API.__ah = 1; const at = API.autoTable;
    API.autoTable = function (o) { const d0 = o && o.didDrawCell; return at.call(this, { ...o, didDrawCell: d => { const r = d.cell.raw; __seen.push((r && r._rich ? String(r.content || '') : (d.cell.text || []).join(' ')).trim()); if (d0) d0(d); } }); };
    const nd0 = newDoc; newDoc = (...a) => { const doc = nd0(...a), tx = doc.text.bind(doc);
      doc.text = (t, ...b) => { const o = b.find(x => x && typeof x === 'object' && !Array.isArray(x)); if (!(o && o.baseline === 'top')) __seen.push((Array.isArray(t) ? t.join(' ') : String(t)).trim()); return tx(t, ...b); };
      return doc; }; } })();`);
  const n = run(`(() => { __seen = []; pdfTheme(); const { doc } = PDFX.call({ all: false }); return doc.getNumberOfPages(); })()`);
  const t = J(`__seen`);
  assert.ok(n <= 3, n + ' páginas');
  assert.ok(!t.some(x => /^\d+ de \d+$/.test(x)), 'el número de página');
  assert.ok(!t.some(x => /v\d+ · \d+ \w+\.? \d{2}:\d{2}/.test(x)), 'la fecha y la hora de la versión');
  assert.ok(!t.includes('Cronograma') && !t.includes('Proveedores') && !t.includes('Luces SAC'), 'cronograma o proveedores');
  assert.ok(t.some(x => /Hoja de llamado · Jornada 1 de \d+/.test(x)), 'la hoja y la jornada en la cabecera');
  for (const s of ['Cierre de set', '10:30', 'Wrap', 'Jefes de área', 'Hora · Esc.']) assert.ok(t.includes(s), s);
  const ti = t.findIndex(x => /^Talentos/.test(x)), eq = t.findIndex(x => /^Equipo técnico/.test(x)), ut = t.indexOf('Utilería especial'), hs = t.indexOf('Centro de salud');
  assert.ok(ti > 0 && eq > ti && ut > eq && hs > ut, 'talentos, equipo técnico, utilería y centro de salud, en ese orden');
  assert.ok(t.indexOf('Jefes de área') < t.indexOf('Hora · Esc.'), 'los jefes de área, bajo la cabecera');
  // las líneas negras de la planilla y sin la cabecera de página de los demás documentos
  const src = fs.readFileSync(R + 'src/pdf-llamado.js', 'utf8');
  has(src, /theme: 'grid'/); has(src, /tableLineColor: CL_LINE/);
  assert.doesNotMatch(src, /pdfCallFoot|pageNumbers\(|docHeader\(/);
  run(`P.call.crew.find(c => c.role === 'Dirección de fotografía').name = ''; delete dayData(callDays().days[0].id).cierre;`);
});
test('el Excel sigue la estructura nueva: cabecera con cierre de set y wrap, jefes, talentos y equipo por separado, sin proveedores', () => {
  run(`P.call.crew.find(c => c.role === 'Sonidista').name = 'Pedro';`);
  const v = J(`callSheetXLSX({ ...callSheetData(0), ver: { v: 2, t: Date.now() } }).rows.flatMap(r => (r.cells || []).map(c => c && c.v)).filter(x => typeof x === 'string' && x)`);
  assert.ok(v.includes('Cierre de set') && v.includes('Wrap'));
  assert.ok(v.some(x => /· v2$/.test(x)) && !v.some(x => /v2 · \d/.test(x)), 'la versión sin la fecha ni la hora');
  const ti = v.indexOf('Talentos'), eq = v.indexOf('Equipo técnico');
  assert.ok(v.indexOf('Jefes de área') > 0 && ti > v.indexOf('Jefes de área') && eq > ti);
  assert.ok(!v.some(x => /PROVEEDORES|Proveedor|CRONOGRAMA/.test(x)));
  run(`P.call.crew.find(c => c.role === 'Sonidista').name = '';`);
});

/* ---------- al cargar un proyecto ---------- */
test('callNormalize deja lo nuevo en su forma (y borra lo que no sirve)', () => {
  const Px = { call: { crew: [{ id: 'c1', head: 'sí' }, { id: 'c2', head: true }], free: [{ id: 'f1', name: 'Ensayo\nlargo' }, { id: 'malo' }, null], days: { d1: {
    date: '2026-13', cierre: 5, props: 'Lápiz', rov: { 'k:1|': { syn: 'x', code: 3 }, z: 'no' }, sov: 'mal', rx: { 'k:2|': true, 'k:3|': 0 }, shx: [], castx: { a: 1 },
    xrows: [{ id: 'x1', at: 'r:k:1|', up: 'si', set: 'Ensayo', raro: 1, t: '' }, { at: 'sin id' }], xcrew: [{ id: 'x2', dept: 'cam', head: true, name: 7 }], adv: 'd2', loc: { name: ' ', addr: 'Jr. Pizarro' }, cobs: { c1: '', c2: 'Llega tarde' } } } } };
  run(`globalThis.__px = ${JSON.stringify(Px)}; callNormalize(__px);`);
  const C = J(`__px.call`), dd = C.days.d1;
  assert.deepStrictEqual(C.free, [{ id: 'f1', name: 'Ensayo largo' }]);
  assert.strictEqual(C.crew[0].head, undefined); assert.strictEqual(C.crew[1].head, true);
  assert.strictEqual(dd.date, undefined); assert.strictEqual(dd.cierre, undefined); assert.strictEqual(dd.props, 'Lápiz');
  assert.deepStrictEqual(dd.rov, { 'k:1|': { syn: 'x' } }); assert.strictEqual(dd.sov, undefined); assert.strictEqual(dd.shx, undefined);
  assert.deepStrictEqual(dd.rx, { 'k:2|': 1 }); assert.deepStrictEqual(dd.castx, { a: 1 });
  assert.deepStrictEqual(dd.xrows, [{ id: 'x1', at: 'r:k:1|', set: 'Ensayo' }]);
  assert.deepStrictEqual(dd.xcrew, [{ id: 'x2', at: '', head: true, dept: 'cam' }]);
  assert.strictEqual(dd.adv, undefined); assert.deepStrictEqual(dd.loc, { addr: 'Jr. Pizarro' }); assert.deepStrictEqual(dd.cobs, { c2: 'Llega tarde' });
});
test('los textos nuevos de la hoja tienen su inglés (i18n/en-manual.json)', () => {
  const M = JSON.parse(fs.readFileSync(R + 'i18n/en-manual.json', 'utf8'));
  for (const s of ['Cierre de set', 'Jefes de área', 'Talentos', 'Hoja libre', '+ Hoja libre', 'Solo esta hoja', 'Correr esta jornada y las siguientes', 'Volver a la fecha del plan',
    'Volver a la guía del stripboard', 'Agregar fila arriba', 'Agregar fila abajo', 'Quitar fila', 'Eliminado en la hoja de llamado · Jornada {0}', '+ Jornada al avance', 'Wrap · fin de jornada'])
    assert.ok(M[s], 'sin inglés: ' + s);
});

for (const [n, f] of tests) { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } }
console.log(fail ? `${fail} fallaron` : 'todo bien');
process.exit(fail ? 1 : 0);
