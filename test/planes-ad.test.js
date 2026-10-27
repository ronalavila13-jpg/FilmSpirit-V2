/* Lote AD · planes: ningún plan tiene prueba gratis (para probar, el proyecto de ejemplo) y Studio está a la venta, con
   los mapas del scouting y los escenarios 3D importados como lo exclusivo. Según el plan de quien es dueño del proyecto
   (studioFeat), con el candado (studioLockHTML) y la ventana que lo explica (studioAsk).  node test/planes-ad.test.js */
const vm = require('vm'), assert = require('assert');
const { pieza, leer } = require('./utiles/fuente.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

/* ---------- studioFeat: quién puede usar lo de Studio en el proyecto abierto ---------- */
const c = { String, Object, Array, JSON };
vm.createContext(c);
vm.runInContext('var P = null, TARGET = "server", DESK = null, LIC = { mode: "pro" }, Store = { kind: "api" }, SHARE = null;'
  + 'var ICO = { lock: "<svg class=\\"ic\\"></svg>" };' + pieza('core.js', 'const ea = ') + pieza('proyectos.js', 'function studioFeat(') + pieza('proyectos.js', 'function studioLockHTML('), c);
const feat = (o, k = 'mapas') => { vm.runInContext('P = null; TARGET = "server"; DESK = null; LIC = { mode: "pro" }; Store = { kind: "api" }; SHARE = null;', c); Object.assign(c, o); return c.studioFeat(k); };

test('sin proyecto abierto, no', () => { assert.strictEqual(feat({}), false); });
test('el proyecto de ejemplo: sí, para explorarlo entero (aunque la cuenta sea gratis)', () => {
  assert.strictEqual(feat({ P: { id: 'x', _sample: true, _saved: false }, LIC: { mode: 'free', plan: 'free' } }), true);
  assert.strictEqual(feat({ P: { id: 'x', _sample: true, _saved: false }, LIC: { mode: 'free', plan: 'free' } }, 'set3d'), true);
  // ya guardado como proyecto propio: manda el plan
  assert.strictEqual(feat({ P: { id: 'x', _sample: false, _saved: true }, LIC: { mode: 'free', plan: 'free' } }), false);
});
test('la web publicada en Claude: todo abierto', () => { assert.strictEqual(feat({ TARGET: 'web', Store: { kind: 'mem' }, P: { id: 'x' } }), true); });
test('el escritorio: según la licencia', () => {
  const P = { id: 'x' }, D = {};
  assert.strictEqual(feat({ TARGET: 'desktop', DESK: D, Store: { kind: 'desk' }, P, LIC: { mode: 'pro', plan: 'studio' } }), true);
  assert.strictEqual(feat({ TARGET: 'desktop', DESK: D, Store: { kind: 'desk' }, P, LIC: { mode: 'pro', plan: 'pro' } }), false);
  assert.strictEqual(feat({ TARGET: 'desktop', DESK: D, Store: { kind: 'desk' }, P, LIC: { mode: 'trial', daysLeft: 5 } }), false, 'la prueba del escritorio es de Pro');
  assert.strictEqual(feat({ TARGET: 'desktop', DESK: D, Store: { kind: 'desk' }, P, LIC: { mode: 'free' } }), false);
});
test('la web con cuentas: según el plan de quien es dueño (todo su equipo lo usa)', () => {
  const P = { id: 'p1', _shared: true };
  assert.strictEqual(feat({ P, SHARE: { pid: 'p1', ownerPlan: 'studio' }, LIC: { mode: 'pro', plan: 'pro' } }), true, 'alguien de Pro en un proyecto de Studio');
  assert.strictEqual(feat({ P, SHARE: { pid: 'p1', ownerPlan: 'pro' }, LIC: { mode: 'pro', plan: 'studio' } }), false, 'alguien de Studio en un proyecto de Pro');
  assert.strictEqual(feat({ P, SHARE: { pid: 'p1', ownerPlan: 'indie' } }, 'set3d'), false);
  assert.strictEqual(feat({ P, SHARE: { pid: 'otro', ownerPlan: 'studio' }, LIC: { mode: 'pro', plan: 'studio' } }), false, 'mientras carga el equipo de este proyecto');
  // todavía no está en el servidor: será de esta cuenta
  assert.strictEqual(feat({ P: { id: 'n1', _shared: false }, LIC: { mode: 'pro', plan: 'studio' } }), true);
  assert.strictEqual(feat({ P: { id: 'n1', _shared: false }, LIC: { mode: 'pro', plan: 'pro' } }), false);
});
test('studioLockHTML: el candado chico con «Studio»', () => {
  const h = c.studioLockHTML('mapas');
  assert(/class="st-lock"/.test(h) && /<svg/.test(h) && />Studio</.test(h) && /data-k="mapas"/.test(h), h);
  assert(/\.st-lock\{/.test(leer('shell.html')), 'con su CSS');
});
test('studioAsk: la ventana con «Ver planes de suscripción» (y en el equipo, el plan de quien administra)', () => {
  const s = pieza('proyectos.js', 'function studioAsk(');
  assert(/title: 'Función de Studio'/.test(s) && /Ver planes de suscripción/.test(s) && /licenseDialog\('', 'studio'\)/.test(s));
  assert(/!SHARE\.admin/.test(s) && /plan de quien lo administra/.test(s));
  const F = leer('proyectos.js');
  assert(/Los mapas en Scouting son parte de FilmSpirit Studio\./.test(F) && /Los escenarios 3D importados son parte de FilmSpirit Studio\./.test(F));
});

/* ---------- Scouting: el campo «Mapa» y el «Mapa general» ---------- */
const s2 = { String, Object, Array, JSON, RegExp };
vm.createContext(s2);
vm.runInContext('var LOCK = true; function studioFeat() { return !LOCK; } function studioLockHTML(k) { return "<span class=\\"st-lock\\">Studio</span>"; }'
  + pieza('core.js', 'const esc = ') + pieza('core.js', 'const ea = ') + pieza('tab-scout.js', 'const safeUrl = ') + pieza('tab-scout.js', 'function scMapFld('), s2);
test('con Studio, el enlace de siempre (editable)', () => {
  s2.LOCK = false;
  const h = s2.scMapFld({ id: 'l1', map: 'https://maps.app.goo.gl/abc' }, true);
  assert(/<input type="url"[^>]*data-f="map"/.test(h) && !/st-lock/.test(h) && /Abrir/.test(h));
});
test('sin Studio: el enlace que ya tenía se ve y se abre, con candado; tocarlo ofrece Studio', () => {
  s2.LOCK = true;
  let h = s2.scMapFld({ id: 'l1', map: 'https://www.google.com/maps/@-8.07,-79.12,17z' }, true);
  assert(!/<input/.test(h), 'no se escribe');
  assert(/data-act="st-ask" data-k="mapas"/.test(h) && /st-lock/.test(h) && /Abrir/.test(h) && /google\.com\/maps/.test(h));
  h = s2.scMapFld({ id: 'l1', map: '' }, true);
  assert(/st-field ph/.test(h) && /Enlace de Google Maps/.test(h) && !/Abrir/.test(h));
  h = s2.scMapFld({ id: 'l1', map: 'https://x.pe' }, false);
  assert(/st-ro/.test(h) && !/data-act=/.test(h), 'en solo lectura, sin botón');
});
test('el enlace no se cambia sin Studio; la copia de una candidata no lo lleva; el mapa general pide Studio', () => {
  const T = leer('tab-scout.js'), M = leer('scout-mapa.js');
  assert(/if \(f === 'map' && !studioFeat\('mapas'\)\) return;/.test(T));
  assert(/if \(!studioFeat\('mapas'\)\) \{ c\.map = ''; delete c\.lat;/.test(T));
  assert(/UI\.scView === 'map' && studioFeat\('mapas'\)/.test(T), 'sin Studio, la vista por lugar');
  assert(/'st-ask': b => studioAsk\(b\.dataset\.k\)/.test(T));
  assert(/data-act="st-ask" data-k="mapas" class="st-seg"/.test(M) && /if \(b\.dataset\.v === 'map' && !studioFeat\('mapas'\)\) \{ studioAsk\('mapas'\); return; \}/.test(M));
  assert(/const smEditable = \(\) => scoutEditable\(\) && studioFeat\('mapas'\)/.test(M), 'ubicar y mover pines: de Studio');
  assert(/'\/api\/maps\/resolve', \{ url: u, \.\.\.\(P\._shared \? \{ pid: P\.id \} : \{\}\) \}/.test(M), 'el servidor decide con el proyecto');
});

/* ---------- sin prueba gratis: los planes y el proyecto de ejemplo ---------- */
test('ningún texto ofrece la prueba gratis ni la lista de espera', () => {
  for (const f of ['planes.js', 'cuenta.js', 'pestanas.js', 'inicio.js']) {
    const s = leer(f);
    assert(!/30 días gratis|Pro 30 días|Prueba Pro|Probar Pro|usedTrial|freeDays|studioOpen|\/api\/waitlist|lista de espera/i.test(s), f);
  }
});
const pay = { String, Object };
vm.createContext(pay);
vm.runInContext(pieza('cuenta.js', 'const PAY_TX'), pay);
test('la ventana de planes, en los cinco idiomas: sin prueba ni lista de espera, con el ejemplo y lo exclusivo de Studio', () => {
  for (const [l, t] of Object.entries(pay.PAY_TX)) {
    for (const k of ['trial', 'freeDays', 'usedTrial', 'wait', 'waitTxt', 'waitGo', 'waitOk', 'soonTag']) assert(!(k in t), `${l}: ${k}`);
    assert(t.sample && t.explore && t.today, l);
    assert.strictEqual(t.more.length, 8, `${l}: ocho filas`);
    assert(/3D/.test(t.more[6]) && !/casting/i.test(t.more[6]), `${l}: ${t.more[6]}`);
  }
  const C = leer('cuenta.js');
  assert(/const more = \[\[y, y, y, y\], \[y, y, y, y\], \[n, y, y, y\], \[n, y, y, y\], \[n, y, y, y\], \[n, n, y, y\], \[n, n, n, y\], KEYS/.test(C), 'ocho filas en la tabla');
  assert(/const parts = \[T\$\('today'\)\]/.test(C), 'se cobra al suscribirse');
});
test('el par de botones donde antes se ofrecía la prueba', () => {
  const C = leer('cuenta.js'), PL = leer('planes.js'), I = leer('inicio.js');
  assert(/data-b="pro">Ver planes de suscripción<\/button> <button class="btn sm" data-b="sample">Explorar con un proyecto de ejemplo<\/button>/.test(C), 'aviso de solo lectura');
  assert(/if \(x\.dataset\.b === 'sample'\) return sampleExplore\(\);/.test(C));
  assert(/me\.plan === 'free' \? 'Ver planes de suscripción'/.test(C) && /data-a="sample">Explorar con un proyecto de ejemplo/.test(C), 'botón de la cuenta');
  assert(/me\.plan === 'pro' \? 'Pasar a Studio'/.test(C), 'Pasar a Studio, siempre');
  assert.strictEqual((PL.match(/samplePairHTML\('kind-produce'\)/g) || []).length, 2, 'las pestañas de producción de un guion y la tarjeta del guion');
  assert(/data-n="sample"><b>Proyecto de ejemplo<\/b>/.test(I), 'proyecto nuevo');
  assert(/Explorar con un proyecto de ejemplo/.test(I) && /'sample-explore': \(\) => sampleExplore\(\)/.test(I));
  assert(/'Ver planes de suscripción'/.test(leer('pestanas.js')), 'guardar el ejemplo');
});
test('explorar el ejemplo: con todas sus pestañas, en la que estaba', () => {
  const s = pieza('inicio.js', 'async function sampleExplore(', '\n}\n');
  assert(/setProject\(buildSample\(\)\)/.test(s) && /setTab\(tab\)/.test(s));
});
test('inglés de los textos nuevos', () => {
  const M = JSON.parse(leer('i18n/en-manual.json'));
  assert('// lote AD · planes' in M);
  for (const k of ['Ver planes de suscripción', 'Explorar con un proyecto de ejemplo', 'Función de Studio', 'Los mapas en Scouting son parte de FilmSpirit Studio.',
    'Los escenarios 3D importados son parte de FilmSpirit Studio.', 'Lo que este proyecto ya tiene se sigue viendo.', 'Mapa: función de Studio']) assert(M[k], k);
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
