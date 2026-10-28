/* Lote W · editor 3D: la firma del escenario y «Actualizar escenario» desde el máster (obs. 9): s3StageSig, s3TakeSet,
   stageStale y stageSeen en s3d-model.js.  node test/escenario-master.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const J = x => JSON.parse(JSON.stringify(x));

const c = { console, Math, JSON, WeakMap, Map, Set, Number, String, Object, Array, isFinite };
vm.createContext(c);
vm.runInContext(`var clamp = (v, a, b) => Math.max(a, Math.min(b, v)); var num = v => +v || 0; var toast = () => {};
  var deaccent = s => String(s).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  var P = { meta: {}, elements: { ana: { id: 'ana', cat: 'cast', name: 'ANA' } }, paras: [], tags: [] };
  var D = { shotsBy: {}, code: {}, sc: { scenes: [], byKey: {} } };
  var lookOf = ob => ({ color: '#C04A3A', s: 1, height: 1.7 });`, c);
vm.runInContext(fs.readFileSync(R + '/src/s3d-model.js', 'utf8') + '\nvar s3Of = sh => sh.s3;', c);

const cam = (x, z) => ({ x, z, h: 1.6, yaw: 0, pitch: 0, roll: 0, lens: 35 });
// el máster: la cocina con Ana, una mesa, una luz que la apunta y la tarde
const master = () => ({ id: 'm', sc: '1', master: true, s3: { v: 2, set: 'int', room: { w: 6, d: 5, h: 2.7, kind: 'cocina' }, atm: 'atardecer', aim: 'a0',
  objs: [{ id: 'a0', kind: 'actor', el: 'ana', name: 'ANA' }, { id: 'o0', kind: 'mesa' }, { id: 'l1', kind: 'luz', type: 'fresnel', name: 'Principal', aim: 'a0' }],
  light: { mode: 'sim', amb: .3, exp: { f: 4 } },
  keys: [{ t: 0, ease: 'suave', cam: cam(0, 4), o: { a0: { x: 0, z: 0, rot: 0, pose: 'pie' }, o0: { x: 1, z: -1, rot: 0 }, l1: { x: 2, z: 2, rot: 0, h: 2.3, int: 60, k: 3200, ang: 30, tilt: 25 } } }] } });
// un plano ajustado a mano: la calle de antes, Ana sentada en otro lugar, su cámara y un celular en su mano
const plano = () => ({ id: 'p', sc: '1', s3: { v: 2, set: 'calle', atm: 'dia', aim: 'a0', shake: .3, dof: true,
  objs: [{ id: 'a0', kind: 'actor', el: 'ana', name: 'ANA' }, { id: 'o9', kind: 'auto' }, { id: 'c1', kind: 'celular', hold: { a: 'a0', at: 'R' } }],
  keys: [{ t: 0, ease: 'suave', cam: cam(3, 5), o: { a0: { x: 4, z: 1, rot: 30, pose: 'sentado' }, o9: { x: -3, z: -6, rot: 90 }, c1: { x: 0, z: 0, rot: 0 } } },
    { t: 3, ease: 'suave', cam: cam(3.5, 4), o: { a0: { x: 4.5, z: 1, rot: 40, pose: 'sentado' }, o9: { x: -3, z: -6, rot: 90 }, c1: { x: 0, z: 0, rot: 0 } } }] } });
const scene = list => { c.D.shotsBy['1'] = list; c.S3REV++; };

test('la firma: cambia con el decorado, la hora, la lluvia, los muebles y las luces; no con la cámara ni las figuras', () => {
  const m = master(), s0 = c.s3StageSig(m.s3);
  const cp = J(m.s3); cp.keys[0].cam = cam(9, 9); cp.keys[0].o.a0 = { x: 5, z: 5, rot: 90, pose: 'sentado' }; cp.shake = 1; cp.aim = null;
  assert.strictEqual(c.s3StageSig(cp), s0, 'la cámara y las figuras no cuentan');
  for (const ch of [s => { s.set = 'calle'; }, s => { s.atm = 'noche'; }, s => { s.rain = true; }, s => { s.room.kind = 'sala'; },
    s => { s.keys[0].o.o0.x = 2; }, s => { s.keys[0].o.l1.int = 20; }, s => { s.objs.push({ id: 'o5', kind: 'silla' }); s.keys[0].o.o5 = { x: 0, z: 1, rot: 0 }; },
    s => { s.objs[1].sc = 1.5; }]) { const q = J(m.s3); ch(q); assert.notStrictEqual(c.s3StageSig(q), s0, ch.toString()); }
});
test('la hora del guion cuenta como la del plano si el plano no eligió una', () => {
  const a = J(master().s3); delete a.atm; const b = J(a); b.atm = 'noche';
  assert.strictEqual(c.s3StageSig(a, 'noche'), c.s3StageSig(b));
});
test('«Actualizar escenario»: trae decorado, muebles, luces, hora y luz ambiente; la cámara y las figuras no cambian', () => {
  const m = master(), p = plano(), cam0 = J(p.s3.keys.map(k => k.cam)), ana0 = J(p.s3.keys.map(k => k.o.a0));
  const out = c.s3TakeSet(p.s3, m.s3);
  assert.strictEqual(c.s3StageSig(out), c.s3StageSig(m.s3), 'el escenario queda como el del máster');
  assert.deepStrictEqual(J(out.keys.map(k => k.cam)), cam0, 'la cámara (y su recorrido) no cambia');
  assert.deepStrictEqual(J(out.keys.map(k => k.o.a0)), ana0, 'Ana sigue sentada donde estaba, con su animación');
  assert.strictEqual(out.shake, .3); assert.strictEqual(out.dof, true); assert.strictEqual(out.aim, 'a0');
  assert.ok(!out.objs.some(o => o.kind === 'auto'), 'el auto de la calle se va');
  assert.ok(out.objs.some(o => o.kind === 'celular' && o.hold), 'lo que Ana sostiene se queda');
  const L = out.objs.find(o => o.kind === 'luz'); assert.strictEqual(L.aim, 'a0', 'la luz apunta a Ana (la de este plano)');
  assert.strictEqual(out.light.mode, 'sim'); assert.strictEqual(out.light.amb, .3);
  assert.strictEqual(out.light.exp, undefined, 'la exposición es de la cámara: no viene');
  assert.ok(out.keys.every(k => k.o.o0 && k.o.o0.x === 1), 'la mesa en todas las claves');
});
test('el aviso: solo después de que el máster cambió de escenario, solo si no coincide, y «Mantener así» lo quita hasta el próximo cambio', () => {
  const m = master(), p = plano(); scene([m, p]);
  assert.strictEqual(c.stageStale(p), null, 'el máster nunca cambió de escenario (stgN): sin aviso');
  m.stgN = 1; c.S3REV++;
  assert.strictEqual(c.stageStale(p).id, 'm', 'cambió y no coincide: aviso');
  c.stageSeen(p, m); assert.strictEqual(c.stageStale(p), null, 'mantener así');
  m.stgN = 2; assert.strictEqual(c.stageStale(p).id, 'm', 'el máster vuelve a cambiar: el aviso vuelve');
  p.s3 = c.s3TakeSet(p.s3, m.s3); assert.strictEqual(c.stageStale(p), null, 'actualizado: coincide');
  const q = plano(); delete q.s3; scene([m, q]); assert.strictEqual(c.stageStale(q), null, 'un plano que sigue al máster no avisa (se arma solo)');
  assert.strictEqual(c.stageStale(m), null, 'el máster no se avisa a sí mismo');
});

if (fail) { console.log(`\n${fail} prueba(s) fallaron`); process.exit(1); }
console.log('\ntodo bien');
