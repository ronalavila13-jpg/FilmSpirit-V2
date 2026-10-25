/* La planta de cámara (lote G): la cámara B de un plano (sus datos, cambiarla por la A, limpiarla al abrir) y la planta
   general de la escena (qué dibuja con varios planos).  node test/planta.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const J = x => JSON.parse(JSON.stringify(x));

// el modelo 3D y la planta general, con lo mínimo de la app alrededor
const c = { console, Math, JSON, WeakMap, Map, Set, Number, String, Object, Array, isFinite };
vm.createContext(c);
vm.runInContext(`var clamp = (v, a, b) => Math.max(a, Math.min(b, v)); var num = v => +v || 0; var P = { meta: {}, elements: {} }; var D = { shotsBy: {}, code: {} };
  var lookOf = ob => ({ color: ob.color || "#C04A3A", s: 1 }); var toast = () => {};`, c);
vm.runInContext(fs.readFileSync(R + '/src/s3d-model.js', 'utf8'), c);
vm.runInContext(fs.readFileSync(R + '/src/planta-general.js', 'utf8') + '\nvar s3Of = sh => sh.s3;', c);
vm.runInContext(fs.readFileSync(R + '/src/areas.js', 'utf8'), c);
// lo declarado con const no queda en el objeto global del contexto: se pasa a mano
vm.runInContext('Object.assign(globalThis, { shotBlank, s3HasB, s3ForB, lensB, frameSec, shotB, s3AddB, s3DelB, s3SwapB, s3CleanB, s3Bake, pgData, scEls, scElPut, scElAdd, scElSet, scElDel })', c);

const cam = (x, z, lens = 35, yaw = 0) => ({ x, z, h: 1.6, yaw, pitch: 0, roll: 0, lens });
const scene = () => ({ v: 2, set: 'vacio', aim: null, shake: 0, objs: [{ id: 'a0', kind: 'actor', el: 'ana', name: 'Ana' }, { id: 'a1', kind: 'actor', el: 'tito', name: 'Tito' }],
  keys: [{ t: 0, ease: 'suave', cam: cam(0, 4), o: { a0: { x: 0, z: 0, rot: 0 }, a1: { x: 1, z: 0, rot: 0 } } }, { t: 3, ease: 'suave', cam: cam(2, 4), o: { a0: { x: 0, z: 0, rot: 0 }, a1: { x: 1, z: -2, rot: 0 } } }] });

test('agregar la cámara B: al lado de la A, con un lente más cerrado, en todas las claves', () => {
  const s3 = scene(); c.s3AddB(s3);
  assert.ok(c.s3HasB(s3));
  assert.strictEqual(s3.keys.length, 2);
  for (const k of s3.keys) { assert.strictEqual(k.camB.x, 1.2); assert.strictEqual(k.camB.lens, 70); }
  assert.deepStrictEqual(J(s3.camB), { aim: null, shake: 0 }, 'sigue a quien sigue la A');
});
test('cambiar la A por la B y volver deja la escena igual (con el mismo orden: el editor compara el texto)', () => {
  const s3 = scene(); s3.aim = 'a0'; c.s3AddB(s3); s3.camB.aim = 'a1'; s3.keys[1].camB.lens = 85;
  const before = JSON.stringify(s3);
  c.s3SwapB(s3);
  assert.strictEqual(s3.keys[1].cam.lens, 85, 'la B pasa a ser la que se edita'); assert.strictEqual(s3.aim, 'a1');
  assert.strictEqual(s3.keys[1].camB.x, 2, 'la A queda guardada en camB');
  c.s3SwapB(s3);
  assert.strictEqual(JSON.stringify(s3), before);
});
test('la escena vista por la B es una copia (dibujar su viñeta no toca el plano)', () => {
  const s3 = scene(); c.s3AddB(s3); const before = JSON.stringify(s3);
  const v = c.s3ForB(s3);
  assert.strictEqual(v.keys[0].cam.x, 1.2); assert.strictEqual(JSON.stringify(s3), before);
  assert.strictEqual(c.s3ForB(scene()), null, 'sin cámara B, nada');
});
test('quitar la B deja el plano como antes de agregarla', () => {
  const s3 = scene(), before = JSON.stringify(s3);
  c.s3AddB(s3); c.s3DelB(s3);
  assert.strictEqual(JSON.stringify(s3), before);
});
test('al abrir: la B solo con lo que se conoce; claves sin B la toman de las vecinas; sin camB no queda nada', () => {
  const s3 = scene(); c.s3AddB(s3);
  s3.camB.raro = 1; s3.camB.aim = 'no-existe'; s3.camB.shake = 'mucho';
  delete s3.keys[1].camB; s3.keys[0].camB.extra = 'x';
  s3.keys.push({ t: 6, ease: 'suave', cam: cam(3, 4), o: {}, camB: { x: 'roto' } });
  c.s3CleanB(s3);
  assert.deepStrictEqual(J(Object.keys(s3.camB).sort()), ['aim']); assert.strictEqual(s3.camB.aim, null);
  assert.ok(!('extra' in s3.keys[0].camB));
  assert.deepStrictEqual(J(s3.keys[1].camB), J(s3.keys[0].camB), 'la clave sin B toma la de la anterior');
  assert.strictEqual(s3.keys[2].camB.x, 1.2, 'una B rota se rehace');
  const old = scene(); old.keys[0].camB = cam(9, 9); old.camB = 'basura';
  c.s3CleanB(old);
  assert.ok(!('camB' in old) && !('camB' in old.keys[0]), 'un proyecto sin cámara B no cambia (lo suelto se quita)');
});
test('juntar claves y correr la acción conservan la cámara B', () => {
  const s3 = scene(); c.s3AddB(s3); s3.keys[1].camB.lens = 85;
  s3.keys.push({ t: 3, ease: 'suave', cam: cam(5, 5), o: {}, oo: true });   // una clave de figuras en el mismo instante
  c.s3Bake(s3);
  assert.strictEqual(s3.keys.length, 2); assert.strictEqual(s3.keys[1].camB.lens, 85);
  const sh = scene(); c.s3AddB(sh); sh.keys[1].camB.lens = 85;
  vm.runInContext('var S3T = ' + JSON.stringify(sh) + '; s3ShiftAction(S3T, 1);', c);
  assert.ok(c.S3T.keys.filter(k => !k.oo).every(k => k.camB), 'las claves de cámara llevan su B');
});
test('copiar la escena del plano anterior: la cámara B de este plano se queda', () => {
  const dst = scene(); c.s3AddB(dst); dst.keys[0].camB.lens = 100;
  vm.runInContext('var S3C = s3CopyAction(' + JSON.stringify(dst) + ', ' + JSON.stringify(scene()) + ', "s9", 0);', c);
  assert.ok(c.s3HasB(c.S3C)); assert.strictEqual(c.S3C.keys[0].camB.lens, 100);
});
test('el plano visto por la B (para su viñeta): «<plano>~b», sin la imagen de referencia; nada si es 2D o sin B', () => {
  const s3 = scene(); c.s3AddB(s3);
  const sh = { id: 's1', s3, refBack: true }, v = c.shotB(sh);
  assert.strictEqual(v.id, 's1~b'); assert.strictEqual(v.s3.keys[0].cam.x, 1.2); assert.ok(!('refBack' in v));
  assert.strictEqual(c.shotB(sh), v, 'la misma mientras la escena no cambie');
  assert.strictEqual(c.lensB(sh), 70);
  assert.strictEqual(c.shotB({ id: 's2', s3: scene() }), null);
  assert.strictEqual(c.shotB({ id: 's3', s3, ws: '2d' }), null);
});
test('la viñeta de la B va con el storyboard (las reglas comunes de las imágenes)', () => {
  assert.strictEqual(c.frameSec('s1~b'), 'storyboard');
});
test('planta general: una cámara por plano (y su B), las figuras una vez, sus otras posiciones y lo que se desplaza', () => {
  const s1 = scene(), s2 = scene(), s3 = scene();
  s2.keys.forEach(k => { k.cam.x = -3; k.o.a0 = { x: -1.5, z: 1, rot: 0 }; }); c.s3AddB(s2);
  s3.keys = [s3.keys[0]];                                    // un plano fijo
  vm.runInContext(`D.shotsBy['1'] = [{ id: 'p1', sc: '1', s3: ${JSON.stringify(s1)} }, { id: 'p2', sc: '1', s3: ${JSON.stringify(s2)} }, { id: 'p3', sc: '1', s3: ${JSON.stringify(s3)} }, { id: 'p4', sc: '1', ws: '2d' }];
    D.code = { p1: '1.1', p2: '1.2', p3: '1.3', p4: '1.4' };`, c);
  const G = c.pgData('1', null);
  assert.deepStrictEqual(J(G.shots.map(S => S.code)), ['1.1', '1.2', '1.3'], 'el dibujado a mano no tiene planta');
  assert.strictEqual(G.skipped, 1);
  assert.deepStrictEqual(J(G.shots.map(S => S.cams.map(C => C.letter).join(''))), ['', 'AB', '']);
  assert.ok(new Set(G.shots.map(S => S.col)).size === 3, 'un color por plano');
  assert.ok(G.shots[0].cams[0].moves, 'la cámara del 1.1 se desplaza (flecha)');
  assert.ok(!G.shots[2].cams[0].moves, 'la del 1.3 no');
  assert.strictEqual(G.figs.length, 2, 'Ana y Tito, una vez cada uno');
  const ana = G.figs.find(F => F.name === 'Ana'), tito = G.figs.find(F => F.name === 'Tito');
  assert.deepStrictEqual(J(ana.also.map(a => a.code)), ['1.2'], 'en el 1.2 Ana está en otro lugar: un punto con el código');
  assert.deepStrictEqual(J(tito.moves.map(m => m.code)), ['1.1', '1.2'], 'Tito se desplaza en el 1.1 y el 1.2');
  // con el editor abierto, la escena es la de sus cambios sin guardar
  const live = scene(); live.keys.forEach(k => { k.cam.x = 7; });
  assert.strictEqual(c.pgData('1', { id: 'p3', s3: live }).shots[2].cams[0].cam.x, 7);
});

test('planta general: una luz, un objeto o un animal de la escena va en todos sus planos y se mueve o quita en todos', () => {
  // p1 y p2 con puesta en escena propia; los demás (y los nuevos) los toman de P.scEls al armar su escena (s3Default)
  vm.runInContext(`P.scEls = undefined; D.shotsBy['7'] = [{ id: 'q1', sc: '7', s3: ${JSON.stringify(scene())} }, { id: 'q2', sc: '7', s3: ${JSON.stringify(scene())} }, { id: 'q3', sc: '7', ws: '2d' }];`, c);
  const sh = id => c.D.shotsBy['7'].find(x => x.id === id);
  const luz = { id: 'lx', kind: 'luz', type: 'fresnel', name: 'Fresnel 1', aim: null }, perro = { id: 'ox', kind: 'perro' };
  c.scElAdd('7', luz, { x: 2, z: -1, rot: 30, h: 2.3, tilt: 25, int: 60, k: 3200, ang: 30 });
  c.scElAdd('7', perro, { x: 0, z: 1, rot: 0 });
  assert.deepStrictEqual(J(c.scEls('7').map(x => x.ob.id)), ['lx', 'ox']);
  for (const id of ['q1', 'q2']) {
    const s3 = sh(id).s3;
    assert.ok(s3.objs.some(o => o.id === 'lx') && s3.objs.some(o => o.id === 'ox'), id + ' tiene los dos');
    assert.ok(s3.keys.every(k => k.o.lx && k.o.lx.x === 2 && k.o.ox.z === 1), id + ': en todas sus claves');
    assert.strictEqual(s3.light.mode, 'sim', id + ': con una luz, la iluminación es la simulada');
  }
  assert.ok(!sh('q3').s3, 'el dibujado a mano no se toca');
  c.scElSet('7', 'ox', { x: 3, z: 4 }); c.scElSet('7', 'lx', { rot: 90 });
  assert.deepStrictEqual(J(c.scEls('7').find(x => x.ob.id === 'ox').pos), { x: 3, z: 4, rot: 0 });
  assert.ok(sh('q2').s3.keys.every(k => k.o.ox.x === 3 && k.o.ox.z === 4 && k.o.lx.rot === 90));
  // la planta general los dibuja desde P.scEls (no dos veces)
  const G = c.pgData('7', null);
  assert.deepStrictEqual(J(G.els.map(x => x.ob.id)), ['lx', 'ox']);
  assert.ok(!G.props.some(o => o.id === 'ox'));
  // una escena por defecto (un plano sin puesta en escena propia) los recibe al armarse
  const fresh = scene(); c.scEls('7').forEach(x => c.scElPut(fresh, x.ob, x.pos));
  assert.ok(fresh.objs.some(o => o.id === 'lx') && fresh.keys[1].o.ox.x === 3);
  c.scElPut(fresh, perro, { x: 9, z: 9, rot: 0 });
  assert.strictEqual(fresh.objs.filter(o => o.id === 'ox').length, 1, 'no se repite');
  c.scElDel('7', 'ox');
  assert.deepStrictEqual(J(c.scEls('7').map(x => x.ob.id)), ['lx']);
  assert.ok(!sh('q1').s3.objs.some(o => o.id === 'ox') && !sh('q1').s3.keys.some(k => k.o.ox));
  c.scElDel('7', 'lx');
  assert.strictEqual(c.P.scEls, undefined, 'sin elementos no queda nada guardado');
});
test('s3Default: los planos sin puesta en escena propia toman los elementos de su escena', () => {
  const src = fs.readFileSync(R + '/src/s3d-model.js', 'utf8');
  assert.ok(/for \(const x of scEls\(sh\.sc\)\) scElPut\(s3, x\.ob, x\.pos\);[^\n]*\n\s*return s3;/.test(src));
  assert.ok(/P\.scEls = mv\(P\.scEls\)/.test(fs.readFileSync(R + '/src/core.js', 'utf8')), 'al renumerar escenas, van con su escena');
  assert.ok(/scEls: Px\.scEls/.test(fs.readFileSync(R + '/src/share.js', 'utf8')), 'el equipo los recibe con el storyboard');
});

test('viñeta en blanco: la decide el plano; si no dice nada, el storyboard (solo para las que nadie armó en 3D)', () => {
  const auto = { id: 's1' }, armado = { id: 's2', s3: scene() };
  c.P.meta = {};
  assert.strictEqual(c.shotBlank(auto), false, 'de entrada, la escena 3D');
  assert.strictEqual(c.shotBlank({ ...auto, blank: true }), true, '«Dejar en blanco»');
  c.P.meta = { sbBlank: true };
  assert.strictEqual(c.shotBlank(auto), true, 'storyboard en blanco: las automáticas');
  assert.strictEqual(c.shotBlank(armado), false, 'lo que alguien armó en 3D sigue igual');
  assert.strictEqual(c.shotBlank({ ...auto, blank: false }), false, '«Volver a la escena 3D» en un plano');
  assert.strictEqual(c.shotBlank({ ...armado, blank: true }), true);
  c.P.meta = {};
  const src = fs.readFileSync(R + '/src/s3d-render.js', 'utf8');
  assert.ok(/shotBlank\(sh\) \? 'bl' : ''/.test(src), 'la miniatura cambia al dejarla en blanco');
  assert.ok(/if \(\(!hasRef && !blank\) \|\| back\)/.test(src), 'en blanco no se dibuja la escena 3D');
});

/* ---------- medir en la planta (s3d-plan.js) ---------- */
{
  const m = { console, Math, JSON, isFinite, Array };
  vm.createContext(m);
  vm.runInContext(fs.readFileSync(R + '/src/s3d-plan.js', 'utf8') + '\nObject.assign(globalThis, { measPt, measFmt, measClean, dofOf, dofFmt });', m);
  const st = { cam: { x: 0, z: 4 }, o: { a0: { x: 0, z: 0 }, a1: { x: 1.5, z: 0 } } };
  const other = { letter: 'B', cam: { x: 3, z: 4 } };
  test('medir: las puntas en la cámara, en una figura o en el piso; la que ya no existe no se dibuja', () => {
    assert.deepStrictEqual(J(m.measPt(st, '', null, { c: 'A' })), [0, 4], 'sin cámara B, la A es la de siempre');
    assert.deepStrictEqual(J(m.measPt(st, 'A', other, { c: 'B' })), [3, 4], 'la otra cámara');
    assert.deepStrictEqual(J(m.measPt(st, 'B', other, { c: 'B' })), [0, 4], 'editando la B, la B es la del plano');
    assert.deepStrictEqual(J(m.measPt(st, '', null, { o: 'a1' })), [1.5, 0]);
    assert.deepStrictEqual(J(m.measPt(st, '', null, { x: 2, z: -1 })), [2, -1]);
    assert.strictEqual(m.measPt(st, '', null, { o: 'borrado' }), null);
    assert.strictEqual(m.measPt(st, '', null, { c: 'B' }), null, 'una cámara B que ya no está');
  });
  test('medir: la distancia en metros (dos decimales hasta 10 m)', () => {
    assert.strictEqual(m.measFmt(Math.hypot(0 - 0, 0 - 4)), '4.00 m');
    assert.strictEqual(m.measFmt(1.5), '1.50 m');
    assert.strictEqual(m.measFmt(23.456), '23.5 m');
  });
  test('medir desde la cámara: profundidad de campo como dofsimulator (lente delgada, CoC = diagonal / 1500)', () => {
    const a = m.dofOf(50, 2.8, 36, 3);   // full frame, 50 mm, f/2.8, foco a 3 m
    assert.ok(Math.abs(a.near - 2.74) < .01 && Math.abs(a.far - 3.32) < .01, `${a.near} – ${a.far}`);
    assert.ok(Math.abs(a.H - 31.0) < .1, 'hiperfocal ' + a.H);
    const b = m.dofOf(24, 2.8, 24.9, 7);   // Super 35, 24 mm, a 7 m (el caso del reclamo)
    assert.ok(Math.abs(b.near - 4.18) < .01 && Math.abs(b.far - 21.6) < .1, `${b.near} – ${b.far}`);
    assert.strictEqual(m.dofOf(24, 8, 36, 10).far, Infinity, 'pasada la hiperfocal, nítido hasta el infinito');
    assert.strictEqual(m.dofFmt(Infinity), '∞'); assert.strictEqual(m.dofFmt(4.183), '4.18'); assert.strictEqual(m.dofFmt(21.64), '21.6');
  });
  test('medir: al abrir, solo quedan las medidas con dos puntas válidas (y sin datos de más)', () => {
    const L = m.measClean([{ a: { c: 'A' }, b: { o: 'a0' } }, { a: { x: '1', z: 2 }, b: { c: 'A' } }, { a: { c: 'C' }, b: { x: 1, z: 2 } }, { a: { x: 1, z: 2, y: 9 }, b: { c: 'B', mal: 1 } }, null, 'x']);
    assert.deepStrictEqual(J(L), [{ a: { c: 'A' }, b: { o: 'a0' } }, { a: { x: 1, z: 2 }, b: { c: 'B' } }]);
    assert.deepStrictEqual(J(m.measClean('no')), []);
    assert.strictEqual(m.measClean(Array.from({ length: 90 }, () => ({ a: { x: 0, z: 0 }, b: { x: 1, z: 0 } }))).length, 40, 'hasta 40 por plano');
    assert.ok(/measClean\(sh\.s3\.meas\)/.test(fs.readFileSync(R + '/src/proyectos.js', 'utf8')), 'se limpian al abrir el proyecto');
  });
}

console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
