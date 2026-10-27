/* Lote AD · acceso: quién ve la etapa Guion (Historia y Guion), la Historia que no viaja a quien no la ve, el ejemplo
   que guarda sus cambios en la memoria y va primero en el plan gratis, y el modo ejemplo sin cuenta.
   node test/acceso-ad.test.js   (el servidor tiene lo suyo en server/test/acceso.test.js) */
const vm = require('vm'), assert = require('assert');
const { pieza, leer } = require('./utiles/fuente.js');
const A = require('../src/areas.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

test('la etapa Guion: el cargo «Guion», los de producción y quien administra', () => {
  for (const role of ['Guion', 'Producción', 'Producción ejecutiva', 'Jefatura de producción']) assert.ok(A.seesScriptStage({ role }), role);
  assert.ok(A.seesScriptStage({ admin: true, role: '' }), 'quien administra');
  for (const role of ['Dirección', 'Asistencia de dirección', 'Dirección de arte', 'Montaje', 'Personalizado', '', undefined]) assert.ok(!A.seesScriptStage({ role }), String(role));
  assert.ok(!A.seesScriptStage(null));
});

// las pestañas: canSeeTab y lo que no viaja (share.js), con un proyecto compartido de mentira
const c = { console, JSON, Object, Array, String, Set };
vm.createContext(c);
vm.runInContext(leer('areas.js').replace(/^const /gm, 'var ') + '\n' + leer('share.js').split('\nlet SHARE')[0].replace(/^const /gm, 'var ')
  + '\nvar SHARE = null, TARGET = "server", lockMine = () => null, gsTabOk = () => false, omitK = (o, ks) => { const r = { ...o }; for (const k of ks) delete r[k]; return r; };\n'
  + pieza('share.js', 'const canSeeTab = ') + pieza('share.js', 'const scriptStageOk = ') + pieza('share.js', 'const baseTab = ') + pieza('share.js', 'const histOff = ') + pieza('share.js', 'function secGet('), c);
const sh = (role, more) => ({ pid: 'p1', kind: 'prod', admin: false, me: { id: 'u1', role }, perms: { guion: 'editar', desglose: 'ver', presupuesto: 'ver' }, ...(more || {}) });
const see = t => vm.runInContext(`canSeeTab(${JSON.stringify(t)})`, c);

test('Historia y Guion: sin el cargo, ocultas; el Guion rayado y el Proyecto, para todos', () => {
  c.SHARE = null;
  assert.ok(see('build') && see('script'), 'sin equipo, todo');
  c.SHARE = sh('Dirección');
  assert.ok(!see('build') && !see('script'), 'dirección no ve Historia ni Guion');
  assert.ok(see('lined') && see('project'), 'pero sí el Guion rayado y el Proyecto');
  assert.strictEqual(vm.runInContext('baseTab()', c), 'lined', 'vuelve al Guion rayado');
  for (const role of ['Guion', 'Producción', 'Jefatura de producción']) { c.SHARE = sh(role); assert.ok(see('build') && see('script'), role); assert.strictEqual(vm.runInContext('baseTab()', c), 'script'); }
  c.SHARE = sh('Dirección', { admin: true }); assert.ok(see('build') && see('script'), 'quien administra');
  c.SHARE = sh('Dirección', { kind: 'guion' }); assert.ok(see('build') && see('script'), 'en un guion (coescritura) todos escriben');
});
test('guion cerrado: quien producción autorizó a revisarlo ve la pestaña Guion (no la Historia)', () => {
  c.SHARE = sh('Dirección');
  c.lockMine = () => ({ id: 'pb', mid: 'u1' });
  assert.ok(see('script') && !see('build'));
  c.lockMine = () => null;
  assert.ok(!see('script'), 'al quitarle la autorización deja de verla');
});
test('el presupuesto sigue siendo solo de producción', () => {
  c.SHARE = sh('Dirección'); assert.ok(!see('budget'), 'con permiso, pero sin cargo de producción');
  c.SHARE = sh('Jefatura de producción'); assert.ok(see('budget'));
  c.SHARE = sh('Dirección', { admin: true }); assert.ok(see('budget'));
});
test('la Historia no viaja en lo que guarda quien no la ve (web con cuentas); en el escritorio, sí', () => {
  const Px = { id: 'p1', meta: { title: 'X', aspect: '16:9' }, paras: [], build: { arg: { logline: 'vacía' } } };
  c.Px = Px;
  c.SHARE = sh('Dirección'); c.TARGET = 'server';
  assert.ok(!('build' in vm.runInContext('secGet(Px, "guion")', c)), 'sin Historia');
  c.SHARE = sh('Guion');
  assert.ok('build' in vm.runInContext('secGet(Px, "guion")', c), 'el cargo Guion la guarda');
  c.SHARE = sh('Dirección', { pid: 'otro' });
  assert.ok('build' in vm.runInContext('secGet(Px, "guion")', c), 'un guardado de otro proyecto no se recorta aquí (el servidor conserva la Historia igual)');
  c.SHARE = sh('Dirección'); c.TARGET = 'desktop';
  assert.ok('build' in vm.runInContext('secGet(Px, "guion")', c), 'escritorio: los datos están en la carpeta; solo se ocultan las pestañas');
});
test('enlaces y notificaciones a Historia o Guion van al Guion rayado', () => {
  assert.ok(/!canSeeTab\(t\) && \(t === 'build' \|\| t === 'script'\) && canSeeTab\('lined'\)\) t = 'lined';/.test(leer('pestanas.js')), 'setTab');
  assert.ok(/\(tab === 'build' \|\| tab === 'script'\) && canSeeTab\('lined'\)\) tab = 'lined';/.test(leer('notas.js')), 'noteGoto');
  assert.ok(/if \(!canSeeTab\(UI\.tab\)\) \{\n    UI\.tab = baseTab\(\);/.test(leer('share.js')), 'sharePaintTabs');
  assert.ok(/!canSeeTab\(t\)\) t = typeof baseTab === 'function' \? baseTab\(\) : 'script';/.test(leer('inicio.js')), 'al abrir donde quedó');
  assert.ok(/screenplay: 'lined', script: 'lined'/.test(leer('archivo.js')), 'el ZIP lleva el guion y el rayado a quien ve el Guion rayado');
});

// el ejemplo: uno por sesión, con sus cambios
const e = { console };
vm.createContext(e);
vm.runInContext(`var P = null, set = 0, EN = false, Store = { kind: 'api' }, APITEAM = { anon: false, me: { plan: 'free' } };
  var SAMPLE_TX = { es: { title: 'La última función (ejemplo)' }, en: { title: 'The Last Show (sample)' } };
  function buildSample() { return { _sample: true, _saved: false, meta: { title: 'La última función (ejemplo)' } }; }
  function setProject(Pn) { P = Pn; set++; } function homeHide() { } function render() { }
` + pieza('proyectos.js', 'const SAMPLE_MEM') + pieza('proyectos.js', 'function openSample(') + pieza('proyectos.js', 'const sampleFirst') + pieza('proyectos.js', 'const sampleName') + pieza('proyectos.js', 'const sampleTouched'), e);
test('el ejemplo guarda sus cambios en la memoria mientras el programa siga abierto', () => {
  const a = vm.runInContext('openSample()', e);
  a.meta.title = 'Mi versión'; a._touched = true;
  assert.ok(vm.runInContext('sampleTouched()', e), 'hay cambios que se perderían al cerrar');
  vm.runInContext('P = { meta: { title: "otro" } }', e);   // se abre otro proyecto
  const b = vm.runInContext('openSample()', e);
  assert.strictEqual(a, b, 'el mismo ejemplo, no uno nuevo');
  assert.strictEqual(b.meta.title, 'Mi versión');
  const n = e.set; vm.runInContext('openSample()', e); assert.strictEqual(e.set, n, 'abierto: no se vuelve a armar');
  b._sample = false; b._saved = true;   // se guardó como proyecto propio (adoptSample)
  const c2 = vm.runInContext('openSample()', e);
  assert.notStrictEqual(c2, b, 'después de guardarlo, el ejemplo vuelve a empezar');
  assert.ok(!vm.runInContext('sampleTouched()', e));
});
test('primero y destacado: el plan gratis y sin cuenta; en los planes de pago, como siempre', () => {
  assert.ok(vm.runInContext('sampleFirst()', e), 'plan gratis');
  vm.runInContext('APITEAM.me = { plan: "pro" }', e); assert.ok(!vm.runInContext('sampleFirst()', e), 'Pro');
  vm.runInContext('APITEAM.me = null; APITEAM.anon = true', e); assert.ok(vm.runInContext('sampleFirst()', e), 'sin cuenta');
  vm.runInContext('Store.kind = "desk"', e); assert.ok(!vm.runInContext('sampleFirst()', e), 'escritorio: como siempre');
  assert.ok(/class="pj-row pj-sample/.test(leer('proyectos.js')) && /home-card home-sample/.test(leer('inicio.js')), 'la fila y la tarjeta');
  // (lote AE) en el rojo de la marca, liso: sin degradado
  const samp = leer('shell.html').split('.home-sample,.pj-sample{')[1].split('\n')[0];
  assert.ok(/--samp:#CE0C1C/.test(samp) && !/gradient/.test(samp), 'en el rojo de la marca, sin degradado');
  assert.ok(!/home-sample[^{]*\{[^}]*rgba\(206,12,28/.test(leer('shell.html')), 'sin resplandor');
});
test('al salir con cambios en el ejemplo, el navegador avisa (aunque esté abierto otro proyecto)', () => {
  const s = leer('arranque.js'), f = s.slice(s.indexOf('function unsavedWork('));
  assert.ok(f.indexOf('sampleTouched()') > 0 && f.indexOf('sampleTouched()') < f.indexOf('if (!P || UI.readOnly) return false;'), 'antes de mirar el proyecto abierto');
  assert.ok(/if \(P && P !== Pn && P === SAMPLE_MEM\.P && P\._sample && !P\._saved\) SAMPLE_MEM\.frames = FRAMES;/.test(leer('proyectos.js')), 'los dibujos del ejemplo quedan en la memoria');
});
test('sin cuenta: nada llega al servidor y lo que necesita cuenta la pide', () => {
  const s = leer('share-api.js');
  assert.ok(/async function apiFetch\(method, path, body\) \{\n  if \(APITEAM\.anon\) \{/.test(s), 'toda llamada se corta');
  assert.ok(/if \(r\.status === 401 && SAMPLE_ASK\) \{ this\.anon = true; LIC = \{ mode: 'free', plan: 'free' \};/.test(s), 'con lo del plan gratis');
  assert.ok(/if \(this\.anon\) return \[\];/.test(s), 'sin lista de proyectos');
  assert.ok(/if \(!SAMPLE_ASK\) this\.listP = fetch/.test(s), 'ni se pide');
  for (const [f, re] of [['pestanas.js', /APITEAM\.anon\) return anonAsk\('save', adoptSample\)/], ['importar.js', /APITEAM\.anon\) \{ if \(!quiet\) anonAsk\('new'\); return false; \}/], ['importar.js', /APITEAM\.anon\) return anonAsk\('import'\)/], ['inicio.js', /APITEAM\.anon\) return anonAsk\('new'\)/], ['cuenta.js', /if \(APITEAM\.anon\) return anonAsk\('share'\)/], ['cuenta.js', /if \(APITEAM\.anon\) return anonAsk\('plan'/]])
    assert.ok(re.test(leer(f)), f + ' ' + re);
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
