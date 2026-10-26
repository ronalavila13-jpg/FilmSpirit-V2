/* Apariencia (src/leyenda.js): las paletas son los colores del proyecto y no tocan la pantalla de nadie; la paleta
   elegida se reconoce aunque se le cambien colores («con N colores cambiados»); los temas guardados de antes sirven
   como paletas; quien no puede editar los colores solo los mira. Con el código real en un contexto aislado.
   node test/apariencia.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/../src/';
const noop = () => { };
function ctx(over = {}) {
  const store = { theme: 'dark', screen: { v: 2, bars: 'blanca', lines: 'gruesa', font: 'sobria', sec: 'pastel' } };
  const el = () => ({ dataset: {}, style: { setProperty: noop, removeProperty: noop }, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, toggleAttribute: noop, setAttribute: noop, appendChild: noop, addEventListener: noop });
  const c = {
    console, JSON, Math, Date, Object, Array, String, Number, Set, Map, Promise, setTimeout, clearTimeout, RegExp, Error, isFinite, parseFloat, parseInt,
    addEventListener: noop, dispatchEvent: noop, Event: function () { }, requestAnimationFrame: noop, cancelAnimationFrame: noop,
    document: { addEventListener: noop, documentElement: el(), querySelector: () => null, createElement: el, head: el(), body: el(), activeElement: null },
    window: {}, matchMedia: () => ({ matches: false }), $: () => null, $$: () => [], esc: s => String(s), ea: s => String(s),
    toast: noop, render: noop, changed: noop, histNote: noop, applyLook: noop, uid: p => p + Math.random().toString(36).slice(2, 8),
    UI: { tab: 'plan' }, TARGET: 'web', EN: false, API: () => false, apiFetch: async () => ({}), ICO: { ok: '', more: '', close: '' },
    __toasts: [], __store: store, ls: { get: (k, d) => (k in store ? store[k] : d), set: (k, v) => { store[k] = v; } }, ...over,
  };
  c.toastUndo = m => c.__toasts.push(m);
  vm.createContext(c);
  for (const f of ['core.js', 'areas.js', 'leyenda.js']) vm.runInContext(fs.readFileSync(R + f, 'utf8'), c, { filename: f });
  vm.runInContext('P = { meta: { title: "Prueba" }, schedule: { items: [] }, calendar: { tasks: [] }, call: {}, elements: {} };', c);
  return c;
}
// lo que vuelve del contexto aislado, como datos de aquí (los arreglos de allá no son los de aquí)
const run = (c, js) => { const v = vm.runInContext(js, c); return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v; };
const tests = [];
const test = (n, f) => tests.push([n, f]);

test('la paleta elegida queda marcada aunque se le cambie un color, con cuántos cambiaron', () => {
  const c = ctx();
  run(c, "themeApply(TH_BUILT.find(t => t.id === 'original'))");
  assert.strictEqual(run(c, 'P.meta.pal'), 'original');
  assert.deepStrictEqual(run(c, '[palNow().th.id, palNow().n]'), ['original', 0]);
  run(c, "lgSet('plan', 'd', '#FFEB99')");
  assert.deepStrictEqual(run(c, '[palNow().th.id, palNow().n, themeMatch(palNow().th)]'), ['original', 1, false]);
  run(c, "lgSet('cat', 'cast', '#123456'); lgSet('cal', 'rod', '#654321')");
  assert.deepStrictEqual(run(c, '[palNow().th.id, palNow().n]'), ['original', 3]);
  // vuelve al color de la paleta: otra vez tal cual
  run(c, "lgSet('plan', 'd', '#F3CD5B'); lgSet('cat', 'cast', ''); lgSet('cal', 'rod', '#C8563F')");
  assert.deepStrictEqual(run(c, '[palNow().th.id, palNow().n]'), ['original', 0]);
});
test('sin paleta guardada en el proyecto: la que coincide tal cual o, si no, la más parecida', () => {
  const c = ctx();
  assert.deepStrictEqual(run(c, '[palNow().th.id, palNow().n]'), ['pastel', 0], 'un proyecto nuevo es Estándar');
  // un proyecto de antes con los colores de Alto contraste (sin P.meta.pal): se reconoce
  run(c, "const T = TH_BUILT.find(t => t.id === 'contraste'); Object.assign(lgStore('plan', true), T.plan); Object.assign(lgStore('cal', true), T.cal); Object.assign(lgStore('call', true), T.call);");
  assert.deepStrictEqual(run(c, '[palNow().th.id, palNow().n]'), ['contraste', 0]);
  run(c, "lgStore('call').note = '#ABCDEF'");
  assert.deepStrictEqual(run(c, '[palNow().th.id, palNow().n]'), ['contraste', 1], 'la más parecida, con su cambio');
});
test('Escala de grises: el gris es parte de la paleta', () => {
  const c = ctx();
  run(c, "themeApply(TH_BUILT.find(t => t.id === 'mono'))");
  assert.strictEqual(run(c, 'P.meta.mono'), true);
  assert.deepStrictEqual(run(c, '[palNow().th.id, palNow().n, palDiff(TH_BUILT[0])]'), ['mono', 0, null]);
  run(c, 'themeApply(TH_BUILT[0])');
  assert.deepStrictEqual(run(c, '[!!P.meta.mono, "pal" in P.meta, palNow().th.id]'), [false, false, 'pastel'], 'Estándar no se guarda: es la de siempre');
});
test('aplicar una paleta no toca la pantalla: ni el modo oscuro, ni la letra, las barras o las líneas', () => {
  const c = ctx();
  const before = JSON.stringify([c.__store.theme, c.__store.screen]);
  for (const id of ['original', 'sobrio', 'contraste', 'mono', 'pastel']) run(c, `themeApply(TH_BUILT.find(t => t.id === '${id}'))`);
  assert.strictEqual(JSON.stringify([c.__store.theme, c.__store.screen]), before);
  assert.ok(!('themeCur' in c.__store));
  assert.match(c.__toasts.pop(), /Paleta «Estándar» en todo el proyecto/);
});
test('un tema guardado de antes (con la pantalla y las pestañas) sirve como paleta y no cambia la pantalla', () => {
  const c = ctx();
  const viejo = { id: 'th_viejo', name: 'Mi productora', ts: 1, tabc: { plan: '#FFD733' }, plan: { d: '#F3CD5B', n: '#93B1EA', hl: [{ name: 'Toma compleja', c: '#FAC5BD' }] },
    cal: { pre: '#5B7BD5' }, call: {}, cat: { cast: '#4FB57A' }, screen: { v: 2, bars: 'gris', lines: 'fina', font: 'formal', sec: 'solido' } };
  c.__store.themes = [viejo];
  run(c, 'TH.list = ls.get("themes", [])');
  const before = JSON.stringify(c.__store.screen);
  run(c, 'themeApply(TH.list[0])');
  assert.strictEqual(JSON.stringify(c.__store.screen), before, 'la pantalla de quien lo aplica no cambia');
  assert.deepStrictEqual(run(c, "[lgCol('plan', 'd'), lgCol('cal', 'pre'), lgHl('plan').map(h => h.name).join()]"), ['#F3CD5B', '#5B7BD5', 'Toma compleja']);
  assert.deepStrictEqual(run(c, '[palNow().th.name, palNow().n]'), ['Mi productora', 0], 'queda marcada en Mis paletas');
  assert.strictEqual(run(c, 'P.meta.tabc'), undefined, 'los colores de pestaña ya no se usan: no se escriben');
  // guardar los colores de ahora: una paleta sin pantalla ni pestañas
  const now = run(c, 'themeNow("Corto nocturno")');
  assert.strictEqual(now.screen, undefined); assert.strictEqual(now.tabc, undefined);
  assert.strictEqual(now.plan.d, '#F3CD5B');
});
test('quien no puede editar los colores del proyecto: solo los mira y sabe quién los cambia', () => {
  const c = ctx({ SHARE: { ro: false, admin: false, perms: { plan: 'ver', calendario: 'ver', llamado: 'ver', desglose: 'ver', guion: 'ver' }, unavailable: new Set(),
    members: [{ id: 'a', name: 'Grace', owner: true, perms: {} }, { id: 'b', name: 'Ana', role: 'Dirección de arte', perms: { plan: 'ver' } }, { id: 'c', name: 'Ronald', role: 'Coordinación de producción', perms: { plan: 'editar' } }] } });
  run(c, "canEditSec = (s, X = SHARE) => !X || (!X.ro && (s === 'notas' || X.admin || X.perms[s] === 'editar'))");
  assert.strictEqual(run(c, 'palCan()'), false);
  const d0 = run(c, "lgCol('plan', 'd')");
  run(c, "themeApply(TH_BUILT.find(t => t.id === 'contraste'))");
  assert.strictEqual(run(c, "lgCol('plan', 'd')"), d0, 'no cambia nada');
  assert.strictEqual(run(c, 'P.meta.pal'), undefined);
  assert.strictEqual(run(c, 'lgWhoCanTxt()'), 'Solo puedes mirarlos: los cambia Grace y Ronald.');
  // con permiso solo en el plan: cambia el plan y avisa que lo demás no
  run(c, "SHARE.perms.plan = 'editar'");
  assert.strictEqual(run(c, 'palCan()'), true);
  run(c, "themeApply(TH_BUILT.find(t => t.id === 'contraste'))");
  assert.strictEqual(run(c, "lgCol('plan', 'd')"), '#F5C400');
  assert.strictEqual(run(c, "lgCol('cal', 'pre')"), '#8FA6E6', 'el calendario no lo edita');
  assert.match(c.__toasts.pop(), /aplicada en lo que puedes editar/);
});
test('la paleta elegida se limpia al abrir un proyecto', () => {
  const c = ctx();
  const Px = { meta: { title: 'x', pal: 'original' }, schedule: {}, call: {} };
  run(c, 'lgMigrate')(Px);
  assert.strictEqual(Px.meta.pal, 'original');
  const Py = { meta: { title: 'x', pal: '<script>' }, schedule: {}, call: {} };
  run(c, 'lgMigrate')(Py);
  assert.strictEqual(Py.meta.pal, undefined);
});

test('«Grafito» (sin color) en las etapas: el dibujo de Suaves con la marca de grises, y se recuerda', () => {
  const c = ctx();
  run(c, "screenSet('sec', 'neutro')");
  assert.strictEqual(run(c, 'screenGet().sec'), 'neutro');
  const marca = "[document.documentElement.dataset.sec || '', document.documentElement.dataset.secn || '']";
  assert.deepStrictEqual(run(c, marca), ['pastel', 'neutro']);
  run(c, "screenSet('sec', 'pastel')");
  assert.deepStrictEqual(run(c, marca), ['pastel', '']);
  run(c, "screenSet('sec', 'solido')");
  assert.deepStrictEqual(run(c, marca), ['', '']);
});

test('(lote W) «Volver a lo de siempre (solo tu pantalla)» también muestra todas las pestañas, y se deshace desde el aviso', () => {
  const acts = [];
  const c = ctx({ toast: (m, ms, act) => { if (act) acts.push(act); }, sharePaintTabs: noop });
  c.__store.tabsHidden = ['casting', 'budget'];
  c.__store.screen = { v: 2, bars: 'blanca', lines: 'gruesa', font: 'sobria', sec: 'neutro' };
  run(c, 'lookResetMe()');
  assert.deepStrictEqual(run(c, "[ls.get('theme'), ls.get('tabsHidden'), screenGet().sec, screenGet().font, screenGet().bars]"), ['auto', [], 'solido', 'archivo', 'gris']);
  assert.strictEqual(acts.length, 1, 'el aviso trae «Deshacer»');
  acts[0].fn();
  assert.deepStrictEqual(run(c, "[ls.get('theme'), ls.get('tabsHidden'), screenGet().sec, screenGet().font, screenGet().bars]"), ['dark', ['casting', 'budget'], 'neutro', 'sobria', 'blanca']);
});

test('las letras de Apariencia: cada una con su archivo para la pantalla, la web y el PDF', () => {
  const c = ctx();
  vm.runInContext(fs.readFileSync(R + 'pdf-fuente-x.js', 'utf8'), c, { filename: 'pdf-fuente-x.js' });
  const fonts = run(c, 'FONTS'), urls = run(c, 'FONT_URL'), pdf = run(c, 'Object.keys(PDF_FONTS_X)');
  assert.deepStrictEqual(fonts.map(f => f[1]), ['Clásica', 'Precisa', 'Neutra', 'Compacta', 'Moderna', 'Redonda', 'Informal']);
  const css = fs.readFileSync(__dirname + '/../desktop/make.js', 'utf8');
  for (const [id, , ui, , key] of fonts) {
    if (id === 'archivo') continue;
    const fam = ui.match(/'([^']+)'/)[1];
    assert.ok(urls[id] && urls[id].startsWith(fam.replace(/ /g, '+') + ':'), 'la web la pide a Google Fonts: ' + id);
    assert.ok(pdf.includes(key), 'el PDF la trae: ' + key);
    assert.ok(css.includes(`'${fam}'`), 'el escritorio la trae: ' + fam);
    const slug = fam.toLowerCase().replace(/ /g, '-');
    for (const sub of ['latin', 'latin-ext']) assert.ok(fs.existsSync(`${__dirname}/../desktop/fuentes/${slug}-${sub}-wght-normal.woff2`), slug + ' ' + sub);
  }
  // quien eligió una letra de antes la sigue teniendo (las claves no cambian)
  for (const id of ['formal', 'sobria', 'redonda', 'informal']) assert.strictEqual(run(c, `fontOf({ font: '${id}' })[0]`), id);
  assert.strictEqual(run(c, "fontOf({ font: 'nada' })[0]"), 'archivo');
});

let fail = 0;
for (const [n, f] of tests) { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } }
console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
