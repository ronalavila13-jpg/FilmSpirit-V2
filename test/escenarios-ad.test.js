/* Lote AD · escenarios: sin constructor de escenarios (los construidos de un proyecto se descartan al abrirlo y sus planos
   vuelven al escenario de su locación), un escenario importado sobre un entorno (escenarios-sobre.js: datos, limpieza,
   lo que ocupa y qué del entorno queda debajo) y la pestaña Plano primero en el editor. Sin navegador.
   node test/escenarios-ad.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const { R, leer, pieza } = require('./utiles/fuente.js');
let fail = 0;
const J = a => JSON.parse(JSON.stringify(a));
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.stack.split('\n').slice(0, 3).join('\n   ')); } };

const c = { Math, console, JSON, Map, Set, WeakMap, Object, Array, Number, String, isFinite, Infinity };
vm.createContext(c);
// lo que necesitan de la app: las escenas del guion (su locación y si es interior) y el escenario que propone cada una
vm.runInContext(`var P = { meta: {}, shots: {}, sets3d: {}, plans: {} };
  var m3Key = (k, id) => 'm3~' + k + '~' + id;
  var computeScenes = paras => ({ byKey: Object.fromEntries(paras.map((p, i) => [String(i + 1), { key: String(i + 1), ie: p.ie, loc: p.loc }])) });
  var envFromScene = s => ({ set: s.ie === 'EXT' ? (/CALLE/.test(s.loc) ? 'calle' : 'ext') : 'int' });`, c);
for (const f of ['escenarios-escala', 'escenarios-sobre']) vm.runInContext(fs.readFileSync(R + '/src/' + f + '.js', 'utf8'), c, { filename: f + '.js' });
const X = vm.runInContext('({ set3dNormalize, sobreNormalize, sobreOf, sobreSet, sobreFoot, sobreIn, sobreBoxHit, sobreDeg, sobreSig, sobreKey, escLocSet, SOBRE_SETS })', c);

/* ---------- observación 1 · sin constructor ---------- */
test('al abrir: los escenarios construidos se descartan y sus planos vuelven al escenario de su locación', () => {
  const s3 = (set, set3d, objs = []) => ({ set, set3d, objs, keys: [{ t: 0, cam: { x: 1, z: 4 }, o: { a0: { x: .5, z: -1 } } }] });
  const Px = {
    paras: [{ ie: 'INT', loc: 'CASA DE ANA' }, { ie: 'EXT', loc: 'CALLE LOS PINOS' }, { ie: 'EXT', loc: 'PAMPA' }],
    sets3d: { c1: { id: 'c1', n: 'Cuarto', kind: 'c', walls: [] }, c2: { id: 'c2', n: 'Patio', kind: 'c' }, e1: { id: 'e1', n: 'Bar', b: [-3, -3, 3, 3] } },
    locSet3d: { 'CASA DE ANA': 'c1', 'BAR': 'e1', 'PAMPA': 'c2' },
    shots: {
      s1: { sc: '1', s3: s3('modelo', 'c1', [{ id: 'a0', kind: 'actor' }, { id: 'l1', kind: 'luz', bs: 'c1' }]) },
      s2: { sc: '2', s3: s3('modelo', 'c2') },
      s3: { sc: '3', s3: s3('modelo', 'e1') },
      s4: { sc: '1' },
    },
  };
  X.set3dNormalize(Px);
  assert.deepStrictEqual(Object.keys(Px.sets3d), ['e1'], 'el importado se queda');
  assert.deepStrictEqual(J(Px.locSet3d), { BAR: 'e1' });
  const a = Px.shots.s1.s3, b = Px.shots.s2.s3;
  assert.strictEqual(a.set, 'int'); assert.ok(!('set3d' in a));
  assert.strictEqual(b.set, 'calle', 'exterior: lo que propone su locación');
  assert.strictEqual(Px.shots.s3.s3.set, 'modelo', 'el importado sigue igual');
  // las figuras, la cámara y las luces, donde estaban (la luz del construido queda como luz del plano)
  assert.deepStrictEqual(J(a.keys[0]), { t: 0, cam: { x: 1, z: 4 }, o: { a0: { x: .5, z: -1 } } });
  assert.deepStrictEqual(J(a.objs), [{ id: 'a0', kind: 'actor' }, { id: 'l1', kind: 'luz' }]);
});
test('un proyecto sin construidos no cambia', () => {
  const Px = { sets3d: { e1: { id: 'e1', n: 'Bar', b: [0, 0, 1, 1] } }, locSet3d: { X: 'e1' }, shots: { s: { sc: '1', s3: { set: 'modelo', set3d: 'e1', objs: [], keys: [] } } } };
  const antes = JSON.stringify(Px);
  X.set3dNormalize(Px);
  assert.strictEqual(JSON.stringify(Px), antes);
});
test('el constructor ya no está: ni sus archivos, ni en build.sh, ni en el editor, Scouting o el importador', () => {
  for (const f of ['constructor-escenarios.js', 'escenarios-replica.js', 'escenarios-construidos.js']) assert.ok(!fs.existsSync(path.join(R, 'src', f)), f);
  const b = fs.readFileSync(path.join(R, 'build.sh'), 'utf8');
  assert.ok(/escenarios-3d escenarios-escala escenarios-sobre planta-general/.test(b));
  assert.ok(!/construidos|constructor|replica/.test(b));
  for (const f of ['shot-editor.js', 'tab-scout.js', 'escenarios-3d.js', 's3d-model.js', 'proyectos.js']) {
    const s = leer(f);
    assert.ok(!/\bbs(Is|Lights|Sync|DrawPlan|Normalize)\b|openSetBuilder|sbScoutBtn|rpReplicate|modelo:\+c/.test(s), f);
  }
  assert.ok(!/Replicar como escenario editable/.test(leer('escenarios-3d.js')));
  assert.ok(/Versión liviana/.test(leer('escenarios-3d.js')), 'la versión liviana se queda');
});

/* ---------- observación 2 · un escenario importado sobre un entorno ---------- */
const casa = { id: 'e9', n: 'Casa', v: 5, b: [-2, -1, 6, 5] };   // 8 × 6 m; su punto de la acción no está al centro
test('limpieza: solo modelos que existen, números en orden, giro entre -180 y 180', () => {
  const Px = { sets3d: { e9: casa }, sobre3d: { 'PLAYA': { id: 'e9', x: '3.456', z: 'x', r: 200 }, 'OTRA': { id: 'no' }, __proto__x: 1, 'LEJOS': { id: 'e9', x: 9999, z: -9999, r: -540 } } };
  X.sobreNormalize(Px);
  assert.deepStrictEqual(J(Px.sobre3d), { PLAYA: { id: 'e9', x: 3.46, z: 0, r: -160 }, LEJOS: { id: 'e9', x: 500, z: -500, r: -180 } });
  const P2 = { sets3d: {}, sobre3d: { A: { id: 'e9' } } }; X.sobreNormalize(P2);
  assert.ok(!('sobre3d' in P2), 'sin nada que quede, no se guarda');
  assert.strictEqual(X.sobreDeg(370), 10); assert.strictEqual(X.sobreDeg(-190), 170); assert.strictEqual(X.sobreDeg(180), -180);
});
test('es de la locación y solo sobre un entorno (no en la habitación, el vehículo, el mar ni con el modelo solo)', () => {
  c.P.sets3d = { e9: casa }; c.P.sobre3d = { 'PLAYA LOS ROSALES': { id: 'e9', x: 2, z: -3, r: 30 } };
  const of = (set, loc) => X.sobreOf(X.escLocSet({ set, objs: [], keys: [] }, loc));
  assert.ok(of('playa', 'PLAYA LOS ROSALES')); assert.ok(of('bosque', 'PLAYA LOS ROSALES'), 'cambiar de entorno no lo quita');
  for (const s of ['int', 'auto', 'mar', 'vacio', 'modelo', 'plano']) assert.strictEqual(of(s, 'PLAYA LOS ROSALES'), null, s);
  assert.strictEqual(of('playa', 'OTRA PLAYA'), null, 'otra locación no lo tiene');
  const o = of('calle', 'PLAYA LOS ROSALES');
  assert.strictEqual(o.d, casa); assert.deepStrictEqual([o.x, o.z, o.r], [2, -3, 30]);
  // la viñeta cambia si se mueve, gira o cambia el modelo
  const s3 = X.escLocSet({ set: 'playa' }, 'PLAYA LOS ROSALES');
  assert.strictEqual(X.sobreSig(s3), '|se9:5:2,-3,30:1'); assert.strictEqual(X.sobreKey(s3), 'm3~s~e9');
  assert.strictEqual(X.sobreSig(X.escLocSet({ set: 'int' }, 'PLAYA LOS ROSALES')), '');
  c.P.sobre3d = undefined;
});
test('poner y quitar (redondeado; vacío, no se guarda)', () => {
  c.P.sets3d = { e9: casa }; c.P.sobre3d = undefined;
  X.sobreSet('CALLE', { id: 'e9', x: 1.234, z: -2.345, r: 375.2 });
  assert.deepStrictEqual(J(c.P.sobre3d), { CALLE: { id: 'e9', x: 1.23, z: -2.35, r: 15 } });
  X.sobreSet('__proto__', { id: 'e9' }); assert.deepStrictEqual(Object.keys(c.P.sobre3d), ['CALLE']);
  X.sobreSet('CALLE', null); assert.strictEqual(c.P.sobre3d, undefined);
});
test('lo que ocupa: centrado en (x, z), con su giro y la escala de su escenario', () => {
  const F = X.sobreFoot({ d: casa, x: 10, z: 0, r: 0 });
  assert.deepStrictEqual([F.hw, F.hd, F.c[0], F.c[1]], [4, 3, 2, 2]);
  assert.ok(X.sobreIn(F, 13.9, 2.9)); assert.ok(!X.sobreIn(F, 14.1, 0)); assert.ok(X.sobreIn(F, 14.1, 0, .2), 'con margen');
  // girada 90°: el lado largo va a lo largo de z
  const G = X.sobreFoot({ d: casa, x: 0, z: 0, r: 90 });
  assert.ok(X.sobreIn(G, 0, 3.9) && X.sobreIn(G, 2.9, 0)); assert.ok(!X.sobreIn(G, 3.5, 0));
  // con la escala del escenario al 50 %
  const H = X.sobreFoot({ d: { ...casa, esc: .5 }, x: 0, z: 0, r: 0 });
  assert.deepStrictEqual([H.hw, H.hd], [2, 1.5]);
});
test('qué del entorno toca el modelo (una caja alineada contra el modelo girado)', () => {
  const F = X.sobreFoot({ d: casa, x: 0, z: 0, r: 45 });
  assert.ok(X.sobreBoxHit(F, -1, -1, 1, 1), 'encima');
  assert.ok(!X.sobreBoxHit(F, 4.5, 4.5, 6, 6), 'en la esquina de la caja que lo envuelve, pero fuera del modelo girado');
  assert.ok(X.sobreBoxHit(F, 3, -1, 4, 1), 'tocando un costado');
  assert.ok(!X.sobreBoxHit(F, 10, 10, 12, 12));
});
test('la ventana del editor 3D lo ofrece debajo de la lista de escenarios; agregar y ubicar es de Studio', () => {
  const s = leer('shot-editor.js');
  assert.ok(/\$\{sobreRow\(\)\}\n {6}\$\{E\.s3\.set === 'vacio'/.test(s), 'debajo de la lista, antes de la atmósfera');
  const f = pieza('shot-editor.js', '  function sobrePlace(id) {', '\n  }\n') + pieza('shot-editor.js', '  function sobreAdd(btn) {', '\n  }\n') + pieza('shot-editor.js', '  function import3d(edit) {', '\n  }\n');
  assert.strictEqual((f.match(/if \(!set3dStudio\(\)\) \{ set3dAsk\(\); return; \}/g) || []).length, 3);
  // sin la parte de planes, todo se puede; con ella, lo que diga studioFeat('set3d')
  const k = { };
  vm.createContext(k); vm.runInContext(pieza('escenarios-sobre.js', 'const set3dStudio') + pieza('escenarios-sobre.js', 'const set3dLock'), k);
  assert.strictEqual(k.set3dStudio(), true); assert.strictEqual(k.set3dLock(), '');
  vm.runInContext("var studioFeat = k => k !== 'set3d'; var studioLockHTML = k => '<i class=\"lk\">Studio</i>';", k);
  assert.strictEqual(k.set3dStudio(), false); assert.ok(/Studio/.test(k.set3dLock()));
});
test('se ve en la viñeta (r3Sync), en la planta (set3dDrawPlan) y espera su modelo antes de una viñeta o un PDF', () => {
  assert.ok(/sobreSync\(s3, vis\)/.test(leer('s3d-render.js')));
  assert.ok(/m3w\(sobreKey\(s3x\)\)/.test(leer('s3d-render.js')));
  assert.ok(/sobreDrawPlan\(ctx, s3, toS, redraw\)/.test(leer('escenarios-3d.js')));
  assert.ok(/sobreSig\(s3\)/.test(leer('escenarios-3d.js')), 'la huella de la viñeta');
  assert.ok(/sobre3d: Px\.sobre3d/.test(leer('share.js')) && /Px\.sobre3d = d\.sobre3d/.test(leer('share.js')), 'viaja con el storyboard del equipo');
});

/* ---------- observación 3 · Plano primero ---------- */
test('las pestañas del panel: Plano, Figura, Cámara, Escena, Luz; la viñeta se abre en Plano', () => {
  const s = leer('shot-editor.js');
  const k = {}; vm.createContext(k); vm.runInContext(pieza('shot-editor.js', 'const SX_TABS = [', '\n];\n'), k);
  assert.deepStrictEqual(J(k.SX_TABS.map(t => t[1])), ['Plano', 'Figura', 'Cámara', 'Escena', 'Luz']);
  assert.ok(/playing: false, tab: 'shot',/.test(s));
  assert.ok(/aria-pressed="\$\{ea\(k === 'shot'\)\}"/.test(s));
  // al terminar de dibujar se vuelve a la pestaña de antes (Plano si no había otra), no a Figura
  assert.ok(!/E\.tab === 'draw'\) \{ E\.tab = 'sel'/.test(s) && !/data-d === 'done'\) \{ E\.tab = 'sel'/.test(s));
  assert.strictEqual((s.match(/E\.tabBack \|\| 'shot'/g) || []).length, 5);
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien.');
process.exitCode = fail ? 1 : 0;
