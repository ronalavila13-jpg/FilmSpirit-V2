/* Lote W · escenarios: el escenario construido (muros, huecos de puertas y ventanas, piso, piezas, limpieza), la escala
   del escenario y la réplica de un escenario importado desde su planta. Sin navegador.  node test/escenarios-w.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const J = a => JSON.parse(JSON.stringify(a));
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.stack.split('\n').slice(0, 3).join('\n   ')); } };

const c = { Math, console, JSON, Map, Set, WeakMap, Object, Array, Number, String, isFinite, Infinity };
vm.createContext(c);
vm.runInContext(`var clamp = (v, a, b) => Math.max(a, Math.min(b, v)); var rad = d => d * Math.PI / 180; var round2 = v => Math.round(v * 100) / 100;
  var P = { meta: {}, shots: {}, sets3d: {}, plans: {} }; var S3_PROPS = { mesa: { name: 'Mesa', w: 1.4, d: .8 }, silla: { name: 'Silla', w: .45, d: .45 } };
  var S3_LIGHTS = { practica: { name: 'Práctica (lámpara)', ang: 0, int: 45, k: 2700, h: 1.5, tilt: 0 } };
  var s3AddObj = (s3, obj, pos) => { s3.objs.push(obj); for (const k of s3.keys) k.o[obj.id] = { ...pos }; };
  var s3DelObj = (s3, id) => { s3.objs = s3.objs.filter(o => o.id !== id); for (const k of s3.keys) delete k.o[id]; };`, c);
for (const f of ['escenarios-construidos']) vm.runInContext(fs.readFileSync(R + '/src/' + f + '.js', 'utf8'), c, { filename: f + '.js' });
const X = vm.runInContext('({ bsOps, bsWallBoxes, bsNearWall, bsOpenAdd, bsBounds, bsClean, bsCount, bsFloorPts, bsNew, bsLights, bsNormalize, escClamp, escOf, envEscOf, sceneEsc, escLocSet, BS_MAX, ENV_ESC_SETS })', c);

// un cuarto de 4 × 3 m: cuatro muros de 15 cm, 2,6 m de alto
const room = () => { const d = X.bsNew('Cuarto', 'CASA DE ANA'); d.walls = [[-2, -1.5, 2, -1.5], [2, -1.5, 2, 1.5], [2, 1.5, -2, 1.5], [-2, 1.5, -2, -1.5]].map(([x0, z0, x1, z1]) => ({ x0, z0, x1, z1, t: .15, o: [] })); return d; };

test('un muro sin huecos es una sola caja, del piso al alto', () => {
  const d = room();
  assert.deepStrictEqual(J(X.bsWallBoxes(d.walls[0], 2.6)), [[0, 4, 0, 2.6]]);
});
test('una puerta abre el muro de abajo arriba y deja el dintel; una ventana deja el antepecho', () => {
  const d = room();
  const p = X.bsOpenAdd(d, 0, 1, 'p'), v = X.bsOpenAdd(d, 0, 3, 'v');
  assert.ok(p && v);
  assert.strictEqual(p.a, .9); assert.strictEqual(p.y0, 0); assert.strictEqual(v.y0, .9);
  const B = J(X.bsWallBoxes(d.walls[0], 2.6)).map(r => r.map(x => Math.round(x * 100) / 100));
  // muro hasta la puerta, dintel de la puerta, muro entre las dos, antepecho y dintel de la ventana, muro final
  assert.deepStrictEqual(B, [[0, .55, 0, 2.6], [.55, 1.45, 2.1, 2.6], [1.45, 2.4, 0, 2.6], [2.4, 3.6, 0, .9], [2.4, 3.6, 2.1, 2.6], [3.6, 4, 0, 2.6]]);
});
test('un hueco que choca con otro o con la punta se corre al lugar libre más cercano; si no cabe, no se pone', () => {
  const d = room();
  X.bsOpenAdd(d, 1, 1.5, 'p');           // muro de 3 m: la puerta al medio
  const q = X.bsOpenAdd(d, 1, 1.5, 'p'); // otra en el mismo lugar: se corre
  assert.ok(q && Math.abs(q.u - 1.5) >= .9, 'no se pisan');
  const ops = X.bsOps(d.walls[1], 2.6);
  assert.strictEqual(ops.length, 2);
  assert.ok(ops[0].u + ops[0].a / 2 <= ops[1].u - ops[1].a / 2 + 1e-9);
  const e = X.bsOpenAdd(d, 0, -5, 'v');    // fuera del muro: queda dentro
  assert.ok(e.u - e.a / 2 >= 0);
  const tiny = X.bsNew('x'); tiny.walls = [{ x0: 0, z0: 0, x1: .3, z1: 0, t: .15, o: [] }];
  assert.strictEqual(X.bsOpenAdd(tiny, 0, .15, 'p'), null, 'un muro de 30 cm no tiene lugar para una puerta');
});
test('huecos guardados que se pisan o se salen del muro: se dejan de lado o se acomodan al dibujar', () => {
  const w = { x0: 0, z0: 0, x1: 2, z1: 0, t: .15, o: [{ k: 'p', u: 1, a: .9, y0: 0, y1: 2.1 }, { k: 'v', u: 1.2, a: 1, y0: .9, y1: 2.1 }, { k: 'p', u: 9, a: .9, y0: 0, y1: 2.1 }] };
  const ops = X.bsOps(w, 2.6);
  assert.strictEqual(ops.length, 1, 'la ventana pisaba la puerta; la otra puerta queda en la punta y choca');
  assert.strictEqual(ops[0].k, 'p');
});
test('el muro más cercano a un punto (para poner una puerta tocando la planta)', () => {
  const d = room();
  const h = X.bsNearWall(d, 1, 1.4);
  assert.strictEqual(h.i, 2); assert.ok(Math.abs(h.u - 1) < 1e-9);
  assert.strictEqual(X.bsNearWall(d, 0, 0), null, 'el centro del cuarto está lejos de todos');
});
test('lo que ocupa, el piso por defecto y la cuenta de piezas', () => {
  const d = room(); X.bsOpenAdd(d, 0, 1, 'p'); d.items.push({ k: 'mesa', x: 0, z: 0, r: 0 });
  const B = X.bsBounds(d);
  assert.deepStrictEqual(J(B.b), [-2.08, -1.58, 2.08, 1.58]);
  assert.strictEqual(B.h, 2.6);
  assert.deepStrictEqual(J(X.bsFloorPts(d)).length, 4, 'sin contorno dibujado: la caja de los muros');
  assert.strictEqual(X.bsCount(d), 6, '4 muros, 1 puerta, 1 mesa');
});
test('al abrir o al llegar del equipo: números válidos, colores válidos y hasta 300 piezas', () => {
  const d = room();
  d.wc = 'rojo'; d.fc = '#123456'; d.walls[0].x0 = 'x'; d.walls.push({ x0: 0, z0: 0, x1: 0, z1: 0 });
  d.walls[1].o = [{ k: 'p', u: 1, a: 'ancho' }, { k: 'zz', u: 1 }];
  d.items = [{ k: 'mesa', x: 1, z: 'a' }, { k: '<script>', x: 0, z: 0 }, ...Array.from({ length: 400 }, (_, i) => ({ k: 'silla', x: i % 10, z: 0 }))];
  d.floor = [[0, 0], [1]];
  X.bsClean(d);
  assert.strictEqual(d.wc, '#E9E5DD'); assert.strictEqual(d.fc, '#123456');
  assert.strictEqual(d.walls.length, 4, 'el muro de largo 0 se va');
  assert.strictEqual(d.walls[0].x0, 0);
  assert.deepStrictEqual(J(d.walls[1].o.map(o => o.k)), ['p']); assert.strictEqual(d.walls[1].o[0].a, .9);
  assert.strictEqual(d.items[0].z, 0); assert.ok(!d.items.some(it => it.k === '<script>'));
  assert.strictEqual(X.bsCount(d), X.BS_MAX);
  assert.deepStrictEqual(J(d.floor), [], 'un contorno de menos de tres puntos no sirve');
  assert.ok(Array.isArray(d.b) && d.h > 0);
});
test('escala: entre 25 % y 400 %; 100 % no se guarda', () => {
  assert.strictEqual(X.escClamp(1.234), 1.23); assert.strictEqual(X.escClamp(9), 4); assert.strictEqual(X.escClamp(.01), .25); assert.strictEqual(X.escClamp('x'), 1);
  assert.strictEqual(X.escOf({}), 1); assert.strictEqual(X.escOf({ esc: 1.5 }), 1.5); assert.strictEqual(X.escOf(null), 1);
  const Px = { sets3d: { a: { id: 'a', n: 'Bar', esc: 1 }, b: { id: 'b', n: 'Casa', esc: 7 }, c: { ...room(), esc: .5 } }, plans: { p: { id: 'p', esc: '2' } }, envEsc: { 'CALLE|calle': 1.5, 'X|int': 2, 'Y|calle': 1, malo: 3 } };
  X.bsNormalize(Px);
  assert.ok(!('esc' in Px.sets3d.a)); assert.strictEqual(Px.sets3d.b.esc, 4); assert.strictEqual(Px.sets3d.c.esc, .5); assert.strictEqual(Px.sets3d.c.id, 'c');
  assert.strictEqual(Px.plans.p.esc, 2);
  assert.deepStrictEqual(J(Px.envEsc), { 'CALLE|calle': 1.5 }, 'la habitación no se escala; 100 % y claves raras se van');
});
test('escala de la calle: por locación; la habitación y el vehículo no', () => {
  c.P.envEsc = { 'AV. ESPAÑA|calle': 1.5 };
  const s3 = { set: 'calle', objs: [], keys: [] };
  X.escLocSet(s3, 'AV. ESPAÑA');
  assert.strictEqual(X.envEscOf(s3), 1.5); assert.strictEqual(X.sceneEsc(s3), 1.5);
  const otra = X.escLocSet({ set: 'calle', objs: [], keys: [] }, 'JR. PIZARRO');
  assert.strictEqual(X.envEscOf(otra), 1, 'otra locación, su propia calle');
  assert.strictEqual(X.envEscOf(X.escLocSet({ set: 'int' }, 'AV. ESPAÑA')), 1);
  assert.ok(!X.ENV_ESC_SETS.includes('auto') && !X.ENV_ESC_SETS.includes('int'));
  c.P.envEsc = undefined;
});
test('escala de un escenario de la lista (importado o construido) y de un plano de planta', () => {
  c.P.sets3d = { e1: { id: 'e1', n: 'Bar', esc: 2 } }; c.P.plans = { p1: { id: 'p1', esc: .5 } };
  vm.runInContext('var set3dOf = s3 => s3 && s3.set === "modelo" && P.sets3d[s3.set3d] || null; var planOf = s3 => s3 && s3.set === "plano" && P.plans[s3.planId] || null;', c);
  assert.strictEqual(X.sceneEsc({ set: 'modelo', set3d: 'e1' }), 2);
  assert.strictEqual(X.sceneEsc({ set: 'plano', planId: 'p1' }), .5);
  assert.strictEqual(X.sceneEsc({ set: 'modelo', set3d: 'no' }), 1);
});
test('las luces de un escenario construido entran al plano (a su escala); al cambiar de escenario se van', () => {
  const d = room(); d.id = 'k1'; d.esc = 2; d.items.push({ k: 'luz:practica', x: 1, z: .5, r: 0 }, { k: 'mesa', x: 0, z: 0, r: 0 });
  const s3 = { objs: [{ id: 'a0', kind: 'actor' }], keys: [{ t: 0, cam: {}, o: { a0: { x: 0, z: 0 } } }] };
  X.bsLights(s3, d);
  const L = s3.objs.filter(o => o.kind === 'luz');
  assert.strictEqual(L.length, 1); assert.strictEqual(L[0].type, 'practica'); assert.strictEqual(L[0].bs, 'k1');
  assert.deepStrictEqual([s3.keys[0].o[L[0].id].x, s3.keys[0].o[L[0].id].z], [2, 1]);
  assert.strictEqual(s3.light.mode, 'sim');
  X.bsLights(s3, d);
  assert.strictEqual(s3.objs.filter(o => o.kind === 'luz').length, 1, 'no se repite');
  X.bsLights(s3, null);
  assert.strictEqual(s3.objs.filter(o => o.kind === 'luz').length, 0);
});

/* ---------- réplica de un escenario importado (escenarios-replica.js) ---------- */
const RP = require(R + '/src/escenarios-replica.js'), ROOM = require(__dirname + '/datos/cuarto-sintetico.js');
const near = (a, b, t, m) => assert.ok(Math.abs(a - b) <= t, `${m || ''} ${a} ≠ ${b} (±${t})`);
for (const flip of [false, true]) test(`réplica de un cuarto de 6 × 4 m${flip ? ' (con un muro con las caras al revés, como SketchUp)' : ''}: muros, puerta, ventana, columna y mostrador`, () => {
  const r = RP.rpReplicate(ROOM.room({ flip }));
  assert.strictEqual(r.walls.length, 4);
  near(r.wh, 2.7, .05, 'alto de muros');
  const N = r.walls.find(w => w.z0 === w.z1 && w.z0 < 0), S = r.walls.find(w => w.z0 === w.z1 && w.z0 > 0), O = r.walls.find(w => w.x0 === w.x1 && w.x0 < 0);
  assert.ok(N && S && O);
  near(N.z0, -2, .05); near(Math.abs(N.x1 - N.x0), 6, .1, 'largo'); near(N.t, .15, .03, 'grosor');
  assert.strictEqual(N.o.length, 1); assert.strictEqual(N.o[0].k, 'v'); near(N.o[0].a, 1.2, .06, 'ancho de ventana'); near(N.o[0].y0, .9, .01);
  near(Math.min(N.x0, N.x1) + N.o[0].u, 0, .06, 'la ventana al medio');
  assert.strictEqual(S.o.length, 1); assert.strictEqual(S.o[0].k, 'p'); near(S.o[0].a, .9, .06, 'ancho de puerta'); assert.strictEqual(S.o[0].y0, 0);
  near(Math.min(S.x0, S.x1) + S.o[0].u, 1.45, .06, 'la puerta en su lugar');
  assert.strictEqual(O.o.length, 0);
  const col = r.items.find(it => it.hh >= 2.5), mos = r.items.find(it => it.hh < 2);
  assert.ok(col, 'la columna'); near(col.x, 1.65, .06); near(col.z, -.5, .06); near(col.w, .3, .06);
  assert.ok(mos, 'el mostrador'); near(mos.x, -1.6, .08); near(mos.z, .9, .06); near(mos.w, 2, .1); near(mos.d, .6, .06);
  assert.strictEqual(r.items.length, 2);
  assert.strictEqual(r.floor.length, 4, 'el piso: un rectángulo'); near(r.floor[0][0], -3, .1); near(r.floor[2][1], 2, .1);
});
test('la réplica pasa la limpieza del constructor y entra en el tope de piezas', () => {
  const r = RP.rpReplicate(ROOM.room()), d = X.bsClean({ ...X.bsNew('Réplica'), walls: r.walls, floor: r.floor, items: r.items, wh: r.wh });
  assert.strictEqual(d.walls.length, 4); assert.strictEqual(X.bsCount(d), 8);
  for (const w of d.walls) assert.strictEqual(X.bsOps(w, d.wh).length, w.o.length, 'los huecos caben en sus muros');
});
test('un modelo sin nada cerca del piso no se replica', () => {
  assert.strictEqual(RP.rpReplicate({ p: new Float32Array([0, 10, 0, 1, 10, 0, 0, 10, 1]), i: new Uint32Array([0, 1, 2]) }), null);
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien.');
process.exitCode = fail ? 1 : 0;
