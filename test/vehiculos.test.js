/* Interior de vehículo (lote U): el modelo que dice el guion, los puestos de cada modelo (y que los planos de antes
   siguen igual), la cámara de inicio, el color guardado en el plano y la planta del vehículo. Sin navegador.
   node test/vehiculos.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const J = x => JSON.parse(JSON.stringify(x));

const c = { console, Math, JSON, Map, Set, Number, String, Object, Array, isFinite };
vm.createContext(c);
vm.runInContext(`var clamp = (v, a, b) => Math.max(a, Math.min(b, v)); var num = v => +v || 0; var deaccent = s => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');`, c);
for (const f of ['s3d-model', 's3d-entornos', 's3d-vehiculos', 's3d-cabinas']) vm.runInContext(fs.readFileSync(R + '/src/' + f + '.js', 'utf8'), c, { filename: f + '.js' });
const X = vm.runInContext('({ envFromScene, carOf, carSet, carClean, carSeats, envSeatCar, envCarCam, carPlan, CAB_MODELS, S3_SETS, S3_PROPS, VEH_PAINT, VEH_MICRO, microSeats })', c);

const esc = (loc, ie = 'INT', tod = 'DÍA') => ({ loc, ie, tod, heading: `${ie}. ${loc} - ${tod}` });
const actors = n => Array.from({ length: n }, (_, i) => ({ id: 'a' + i, kind: 'actor' }));
const scene = (n, car) => ({ set: 'auto', ...(car ? { car } : {}), objs: actors(n), keys: [{ t: 0, cam: { x: 0, z: 4, h: 1.6, yaw: 0, pitch: 0, roll: 0, lens: 35 }, o: Object.fromEntries(actors(n).map(a => [a.id, { x: 0, z: 0, rot: 0, pose: 'pie' }])) }] });

test('desde el guion: auto, taxi y coche son el sedán; camioneta, la SUV; pick-up, combi y bus, los suyos', () => {
  const m = loc => X.envFromScene(esc(loc)).car;
  for (const l of ['AUTO DE ROSA', 'TAXI', 'COCHE', 'CARRO', 'VEHÍCULO']) assert.strictEqual(m(l), 'sedan', l);
  for (const l of ['CAMIONETA', 'SUV DE LA FAMILIA']) assert.strictEqual(m(l), 'suv', l);
  for (const l of ['PICK-UP', 'PICKUP', 'CAMIONETA PICK-UP', 'PICK UP DEL TÍO']) assert.strictEqual(m(l), 'pickup', l);
  for (const l of ['COMBI', 'VAN']) assert.strictEqual(m(l), 'van', l);
  for (const l of ['BUS', 'CUSTER', 'MICRO', 'ÓMNIBUS', 'MICROBÚS']) assert.strictEqual(m(l), 'bus', l);
  assert.strictEqual(X.envFromScene(esc('COMBI')).set, 'auto');
  assert.strictEqual(X.envFromScene(esc('COMBI', 'EXT')).set, 'calle', 'afuera de la combi: la calle');
  assert.strictEqual(X.envFromScene(esc('COMBI', 'EXT')).car, '');
  assert.strictEqual(X.envFromScene(esc('SALA')).car, '');
  assert.strictEqual(m('MICROONDAS'), '', 'no es un micro');
});
test('la lista de escenarios: «Interior de vehículo» con sus modelos, como las habitaciones', () => {
  const L = J(X.S3_SETS).filter(([k]) => /^auto/.test(k));
  assert.deepStrictEqual(L.map(x => x[0]), ['auto', 'auto:suv', 'auto:van', 'auto:pickup', 'auto:bus']);
  assert.ok(L.every(([, n]) => /^Interior de vehículo: /.test(n)));
  for (const [k] of L.slice(1)) assert.ok(X.CAB_MODELS[k.split(':')[1]], k);
});
test('puestos: sedán, SUV y pick-up 5; van 8 (2 + 3 + 3); en los autos la primera figura maneja, a la izquierda', () => {
  for (const [m, n, rows] of [['sedan', 5, [2, 3]], ['suv', 5, [2, 3]], ['pickup', 5, [2, 3]], ['van', 8, [2, 3, 3]]]) {
    const L = X.carSeats(m);
    assert.strictEqual(L.length, n, m);
    assert.strictEqual(L[0].pose, 'maneja', m);
    assert.ok(L.slice(1).every(p => p.pose === 'sentado'), m);
    assert.ok(L[0].x < 0, m + ': el volante a la izquierda (la escena mira hacia −z)');
    const zs = [...new Set(L.map(p => p.z))]; assert.deepStrictEqual(zs.map(z => L.filter(p => p.z === z).length), rows, m);
  }
});
test('el sedán de los planos de antes: los mismos puestos, sin levantar a nadie, y la misma cámara por el parabrisas', () => {
  const L = X.carSeats('sedan').map(p => [p.x, p.z, p.pose, p.h || 0]);
  assert.deepStrictEqual(J(L), [[-.37, .18, 'maneja', 0], [.37, .18, 'sentado', 0], [-.4, 1.12, 'sentado', 0], [.4, 1.12, 'sentado', 0], [0, 1.12, 'sentado', 0]]);
  const s3 = scene(2); X.envSeatCar(s3); X.envCarCam(s3);
  assert.ok(!('h' in s3.keys[0].o.a0), 'sin altura de más');
  assert.deepStrictEqual(J(s3.keys[0].cam).z, -1.5);
  assert.strictEqual(s3.keys[0].cam.yaw, 180);
});
test('bus urbano: todas las figuras de pasajeras (el chofer es de relleno), filas de 2 + 2 y la de atrás', () => {
  const L = X.carSeats('bus'), sent = L.filter(p => p.pose === 'sentado');
  assert.strictEqual(sent.length, X.VEH_MICRO.rows * 4 + 5);
  assert.ok(!L.some(p => p.pose === 'maneja'));
  assert.ok(L.slice(sent.length).every(p => p.pose === 'pie' && Math.abs(p.x) < .01), 'si no alcanzan los asientos, de pie en el pasillo');
  const s3 = scene(12, { m: 'bus' }); X.envSeatCar(s3);
  const o = s3.keys[0].o;
  assert.ok(Object.values(o).every(p => p.pose === 'sentado' && p.h > .5 && p.rot === 180));
  // la cámara: al frente del pasillo, de pie, mirando hacia atrás (a los pasajeros)
  X.envCarCam(s3); const cam = s3.keys[0].cam;
  assert.strictEqual(cam.x, 0); assert.strictEqual(cam.yaw, 180); assert.ok(cam.h > 2 && cam.z < Math.min(...Object.values(o).map(p => p.z)));
});
test('cada modelo con más altura levanta a las figuras hasta su cojín; la cámara de inicio queda delante del parabrisas', () => {
  for (const m of ['suv', 'van', 'pickup']) {
    const s3 = scene(1, { m }); X.envSeatCar(s3); X.envCarCam(s3);
    const p = s3.keys[0].o.a0, cam = s3.keys[0].cam, body = X.carPlan(s3).body;
    assert.ok(p.h > .15 && p.h < .4, m + ' h ' + p.h);
    assert.ok(cam.z < body[1] + 1.2 && cam.z < p.z, m + ': delante, mirando hacia atrás');
    assert.ok(cam.h > p.h + 1, m);
  }
});
test('el color va en el plano (s3.car) y solo si cambia algo; al abrir se limpia', () => {
  const s3 = { set: 'auto' };
  assert.deepStrictEqual(J(X.carOf(s3)), { m: 'sedan', c: '#9C3E36', own: false, def: J(X.CAB_MODELS.sedan) }, 'sin nada: el sedán rojo de siempre');
  X.carSet(s3, 'm', 'bus'); assert.deepStrictEqual(J(s3.car), { m: 'bus' });
  X.carSet(s3, 'c', '#2f5d8c'); assert.deepStrictEqual(J(s3.car), { m: 'bus', c: '#2F5D8C' });
  assert.strictEqual(X.carOf(s3).c, '#2F5D8C');
  X.carSet(s3, 'm', 'sedan'); assert.deepStrictEqual(J(s3.car), { c: '#2F5D8C' }, 'el color se queda al cambiar de modelo');
  X.carSet(s3, 'c', null); assert.ok(!('car' in s3));
  const bad = { car: { m: 'tanque', c: 'red; x', extra: 1 } }; X.carClean(bad); assert.ok(!('car' in bad));
  const ok = { car: { m: 'van', c: '#ABCDEF', x: 2 } }; X.carClean(ok); assert.deepStrictEqual(J(ok.car), { m: 'van', c: '#ABCDEF' });
  const arr = { car: [1] }; X.carClean(arr); assert.ok(!('car' in arr));
  assert.ok(/carClean\(sh\.s3\)/.test(fs.readFileSync(R + '/src/proyectos.js', 'utf8')), 'se limpia al abrir el proyecto');
});
test('la planta: el contorno de cada modelo con el frente arriba (−z) y sus asientos adentro', () => {
  for (const m of Object.keys(X.CAB_MODELS)) {
    const Q = X.carPlan({ set: 'auto', car: { m } });
    const [x0, z0, x1, z1] = Q.body;
    assert.ok(x0 < 0 && x1 > 0 && z1 - z0 > 4, m);
    for (const s of Q.seats) assert.ok(s[0] >= x0 && s[2] <= x1 && s[1] >= z0 && s[3] <= z1, m + ': asiento adentro');
    assert.ok(Q.dash[1] < Math.min(...Q.seats.map(s => s[1])), m + ': el tablero adelante');
  }
  assert.ok(X.carPlan({ car: { m: 'pickup' } }).bed, 'la tolva');
  const B = X.carPlan({ car: { m: 'bus' } }); assert.ok(B.door && B.door[0] > 0, 'la puerta a la derecha'); assert.ok(B.driver[0] < 0, 'el chofer a la izquierda');
});
test('la pick-up también en Objetos › Vehículos, con su color', () => {
  assert.strictEqual(X.S3_PROPS.pickup.cat, 'vehiculo');
  assert.ok(X.VEH_PAINT.pickup);
  assert.ok(/s3d-vehiculos s3d-cabinas/.test(fs.readFileSync(R + '/build.sh', 'utf8')), 'el módulo nuevo va en la compilación');
});

console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
