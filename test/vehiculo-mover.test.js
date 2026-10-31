/* El vehículo del interior se mueve y gira en la planta como un objeto (s3.car.at): lo que va dentro (figuras, cámara)
   se lleva con él en todas las claves, lo de afuera se queda, se guarda al reabrir y sin mover nada todo sigue igual.
   node test/vehiculo-mover.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const J = x => JSON.parse(JSON.stringify(x));

const c = { console, Math, JSON, Map, Set, Number, String, Object, Array, isFinite };
vm.createContext(c);
vm.runInContext(`var clamp = (v, a, b) => Math.max(a, Math.min(b, v)); var num = v => +v || 0; var deaccent = s => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');`, c);
for (const f of ['s3d-model', 's3d-entornos', 's3d-vehiculos', 's3d-cabinas']) vm.runInContext(fs.readFileSync(R + '/src/' + f + '.js', 'utf8'), c, { filename: f + '.js' });
const X = vm.runInContext('({ carAt, carSet, carClean, carGrab, carMove, envSeatCar, envCarCam, carDoors, carOpen })', c);

const scene = car => {
  const objs = [{ id: 'a0', kind: 'actor' }, { id: 'a1', kind: 'actor' }, { id: 'perro', kind: 'perro' }];
  const k = t => ({ t, cam: { x: 0, z: 4, h: 1.6, yaw: 0, pitch: 0, roll: 0, lens: 35 }, o: { a0: { x: 0, z: 0, rot: 0, pose: 'pie' }, a1: { x: 0, z: 0, rot: 0, pose: 'pie' }, perro: { x: 3, z: 0, rot: 0 } } });
  return { set: 'auto', ...(car ? { car } : {}), objs, keys: [k(0), k(2)] };
};

test('sin mover el auto, los asientos y la cámara de inicio quedan como siempre', () => {
  const a = scene(), b = scene({ at: { x: 0, z: 0, r: 0 } });
  X.carClean(b); assert.ok(!('car' in b), 'un at en el origen no se anota');
  X.envSeatCar(a); X.envCarCam(a); X.envSeatCar(b); X.envCarCam(b);
  assert.deepStrictEqual(J(a), J(b));
  assert.strictEqual(a.keys[0].o.a0.rot, 180); assert.strictEqual(a.keys[0].cam.yaw, 180);
});
test('mover y girar el auto: las figuras de adentro y la cámara del capó van con él en cada clave; el perro se queda', () => {
  const s3 = scene(); X.envSeatCar(s3); X.envCarCam(s3);
  const before = J(s3.keys), g = X.carGrab(s3);
  assert.deepStrictEqual(Object.keys(g.keys[0].o).sort(), ['a0', 'a1']);
  assert.ok(g.keys[0].cam, 'la cámara de inicio está sobre el capó: va con el auto');
  X.carMove(s3, { x: 2, z: -1, r: 90 }, g);
  assert.deepStrictEqual(J(s3.car.at), { x: 2, z: -1, r: 90 });
  for (const [i, k] of s3.keys.entries()) {
    const b = before[i].o.a0, p = k.o.a0;
    // girar 90°: (x, z) → (z, −x), y luego correr
    assert.deepStrictEqual([p.x, p.z], [Math.round((2 + b.z) * 100) / 100, Math.round((-1 - b.x) * 100) / 100]);
    assert.strictEqual(p.rot, -90, '180 + 90');
    if (i) assert.deepStrictEqual(J(k.cam), before[i].cam, 'la cámara de la otra clave estaba afuera: se queda'); else assert.strictEqual(k.cam.yaw, -90);
    assert.deepStrictEqual(J(k.o.perro), before[i].o.perro);
  }
  // seguir arrastrando desde lo tomado al empezar: no se acumula error, y volver al origen deja todo como estaba
  X.carMove(s3, { x: 0, z: 0, r: 0 }, g);
  assert.ok(!s3.car || !s3.car.at);
  for (const [i, k] of s3.keys.entries()) { for (const id of ['a0', 'a1']) { assert.strictEqual(k.o[id].x, before[i].o[id].x); assert.strictEqual(k.o[id].z, before[i].o[id].z); } assert.strictEqual(k.cam.z, before[i].cam.z); assert.strictEqual(k.cam.x, before[i].cam.x); }
});
test('cambiar de modelo con el auto movido: las figuras se sientan en el auto, donde está', () => {
  const s3 = scene({ m: 'suv', at: { x: 5, z: 0, r: 0 } }); X.envSeatCar(s3);
  const ref = scene({ m: 'suv' }); X.envSeatCar(ref);
  assert.strictEqual(s3.keys[0].o.a0.x, Math.round((ref.keys[0].o.a0.x + 5) * 100) / 100);
  assert.strictEqual(s3.keys[0].o.a0.z, ref.keys[0].o.a0.z);
});
test('al reabrir: la posición se guarda; lo inválido se descarta', () => {
  const ok = { car: { m: 'van', at: { x: 1.234, z: -2, r: 270 } } }; X.carClean(ok);
  assert.deepStrictEqual(J(ok.car), { m: 'van', at: { x: 1.23, z: -2, r: -90 } });
  const bad = { car: { at: { x: 'a', z: Infinity, r: NaN } } }; X.carClean(bad); assert.ok(!('car' in bad));
  const far = { car: { at: { x: 1e9, z: 0, r: 0 } } }; X.carClean(far); assert.strictEqual(far.car.at.x, 500);
});

test('puertas y lunas: cuatro en los autos, la de subida en el bus; cerradas (y el bus abierto) no se anotan', () => {
  assert.strictEqual(X.carDoors('sedan').length, 4); assert.strictEqual(X.carDoors('van').length, 4); assert.deepStrictEqual(J(X.carDoors('bus')), ['Puerta']);
  assert.deepStrictEqual(J(X.carOpen(scene())), { dr: [0, 0, 0, 0], wn: [0, 0, 0, 0] });
  assert.deepStrictEqual(J(X.carOpen(scene({ m: 'bus' }))), { dr: [75], wn: [] }, 'el bus sigue con la puerta abierta');
  const s3 = scene(); X.carSet(s3, 'dr', [60, 0, 0, 0]); X.carSet(s3, 'wn', [0, 1, 0, 0]);
  assert.deepStrictEqual(J(s3.car), { dr: [60, 0, 0, 0], wn: [0, 1, 0, 0] });
  X.carSet(s3, 'dr', [0, 0, 0, 0]); assert.ok(!('dr' in s3.car), 'todo cerrado no se anota');
  X.carSet(s3, 'm', 'bus'); assert.ok(!s3.car.wn, 'otro modelo: puertas y lunas de fábrica');
});
test('al reabrir: puertas y lunas válidas se quedan; lo raro se recorta o se descarta', () => {
  const ok = { car: { m: 'suv', dr: [999, 'a', -5, 30, 7], wn: [.5, 2] } }; X.carClean(ok);
  assert.deepStrictEqual(J(ok.car), { m: 'suv', dr: [75, 0, 0, 30], wn: [.5, 1, 0, 0] });
  const bus = { car: { m: 'bus', dr: [0], wn: [1] } }; X.carClean(bus);
  assert.deepStrictEqual(J(bus.car), { m: 'bus', dr: [0] }, 'el bus cerrado; lunas, no tiene');
});

console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
