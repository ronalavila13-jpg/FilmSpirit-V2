/* Lote W · editor 3D: lo que muestra la viñeta 3D (tamaño, ángulo y movimiento) para avisar cuando no coincide con el
   guion técnico (s3Read, s3ReadDiff en s3d-model.js).  node test/encuadre.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const J = x => JSON.parse(JSON.stringify(x));
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };

const c = { console, Math, JSON, WeakMap, Map, Set, Number, String, Object, Array, isFinite };
vm.createContext(c);
vm.runInContext(`var clamp = (v, a, b) => Math.max(a, Math.min(b, v)); var num = v => +v || 0; var toast = () => {};
  var deaccent = s => String(s).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  var P = { meta: { aspect: '16:9' }, elements: {}, paras: [], tags: [] }; var D = { shotsBy: {}, code: {} };
  var ASPECTS = { '16:9': 16 / 9 };`, c);
vm.runInContext(fs.readFileSync(R + '/src/s3d-model.js', 'utf8'), c);

// una figura de pie en el origen, mirando a la cámara (+z); una escena armada con «Reencuadrar» para cada tamaño
const scene = (extra = {}) => ({ v: 2, set: 'vacio', aim: null, shake: 0, objs: [{ id: 'a0', kind: 'actor', el: null, name: 'Figura' }],
  keys: [{ t: 0, ease: 'suave', cam: { x: 0, z: 4, h: 1.6, yaw: 0, pitch: 0, roll: 0, lens: 35 }, o: { a0: { x: 0, z: 0, rot: 0, pose: 'pie', expr: 'neutral' } } }], ...extra });
const framed = (size, angle = 'Normal', move = 'Fijo') => { const s3 = c.s3Frame(scene(), size, angle, 0); c.s3ApplyMove(s3, move, 4, ''); return s3; };

test('cada tamaño que arma «Reencuadrar» se lee como ese tamaño', () => {
  for (const k of ['GPG', 'PG', 'PC', 'PE', 'PA', 'PM', 'PMC', 'PP', 'PPP']) assert.strictEqual(c.s3Read(framed(k)).size, k, k);
});
test('también con picado y contrapicado, y con otro lente', () => {
  for (const k of ['PG', 'PE', 'PM', 'PMC', 'PP']) for (const a of ['Picado', 'Contrapicado']) {
    const R = c.s3Read(framed(k, a));
    assert.strictEqual(R.size, k, `${k} ${a}: ${R.size}`); assert.strictEqual(R.angle, a, `${k} ${a}: ${R.angle}`);
  }
  const s3 = c.s3Frame(scene(), 'PM', 'Normal', 85); assert.strictEqual(c.s3Read(s3).size, 'PM', 'PM con 85 mm');
});
test('el caso de Ronald: anotado PMC · Contrapicado · Cámara en mano, la cámara muestra la figura entera', () => {
  const s3 = scene();   // a 4 m con 35 mm y a 1,6 m de alto: la figura de pies a cabeza
  const R = c.s3Read(s3);
  assert.ok(['PE', 'PC'].includes(R.size), 'plano entero o conjunto: ' + R.size);
  assert.strictEqual(R.angle, 'Normal'); assert.strictEqual(R.move, 'Fijo');
  const d = c.s3ReadDiff(R, { size: 'PMC', angle: 'Contrapicado', move: 'Cámara en mano' });
  assert.deepStrictEqual(J(d.map(x => x.k)), ['size', 'angle', 'move']);
  assert.strictEqual(d[0].was, 'PMC');
});
test('lo que coincide no avisa (y el soporte, el sonido y el lente no se comparan)', () => {
  const s3 = framed('PMC', 'Contrapicado', 'Cámara en mano');
  assert.deepStrictEqual(J(c.s3ReadDiff(c.s3Read(s3), { size: 'PMC', angle: 'Contrapicado', move: 'Cámara en mano', support: 'Trípode', snd: 'no' })), []);
});
test('ángulos: cenital, nadir y holandés', () => {
  assert.strictEqual(c.s3Read(framed('PM', 'Cenital')).angle, 'Cenital');
  assert.strictEqual(c.s3Read(framed('PM', 'Nadir')).angle, 'Nadir');
  const h = c.s3Read(framed('PM', 'Holandés'));
  assert.strictEqual(h.angle, 'Holandés'); assert.strictEqual(h.size, 'PM');
  assert.deepStrictEqual(J(c.s3ReadDiff(h, { size: 'PM', angle: 'Holandés', move: 'Fijo' })), []);
});
test('movimientos claros: dolly, travelling, paneo, tilt, zoom, grúa y arco; sin claves, fijo', () => {
  for (const m of ['Dolly in', 'Dolly out', 'Travelling lateral', 'Paneo', 'Tilt', 'Zoom in', 'Zoom out', 'Grúa', 'Arco', 'Drone']) {
    const R = c.s3Read(framed('PM', 'Normal', m));
    assert.ok(R.moves.includes(m), `${m}: ${R.move} (${R.moves})`);
    assert.deepStrictEqual(J(c.s3ReadDiff(R, { size: R.size, angle: R.angle, move: m })), [], m);
  }
  assert.strictEqual(c.s3Read(framed('PM')).move, 'Fijo');
});
test('con temblor es cámara en mano; un seguimiento o un steadicam no se discuten si la cámara se mueve', () => {
  const s3 = framed('PM', 'Normal', 'Cámara en mano');
  assert.strictEqual(c.s3Read(s3).move, 'Cámara en mano');
  const sg = framed('PM', 'Normal', 'Seguimiento');
  assert.deepStrictEqual(J(c.s3ReadDiff(c.s3Read(sg), { size: 'PM', angle: 'Normal', move: 'Seguimiento' }).filter(x => x.k === 'move')), []);
  const sc = framed('PM', 'Normal', 'Steadicam / gimbal');
  assert.deepStrictEqual(J(c.s3ReadDiff(c.s3Read(sc), { size: 'PM', angle: 'Normal', move: 'Steadicam / gimbal' }).filter(x => x.k === 'move')), []);
});
test('sin figuras pero con un objeto de detalle: PD o INS (y no se discute uno por el otro)', () => {
  const s3 = { v: 2, set: 'vacio', aim: null, shake: 0, objs: [{ id: 'd0', kind: 'detalle', name: 'Celular' }], keys: [{ t: 0, ease: 'suave', cam: { x: 0, z: 2, h: 1, yaw: 0, pitch: 0, roll: 0, lens: 35 }, o: { d0: { x: 0, z: 0, rot: 0 } } }] };
  c.s3Frame(s3, 'INS', 'Normal', 0);
  const R = c.s3Read(s3);
  assert.ok(R.size === 'INS' || R.size === 'PD', R.size);
  assert.deepStrictEqual(J(c.s3ReadDiff(R, { size: 'PD', angle: 'Normal', move: 'Fijo' })), []);
});
test('POV y sobre el hombro: ni el tamaño ni el ángulo se discuten', () => {
  const R = c.s3Read(scene());
  assert.deepStrictEqual(J(c.s3ReadDiff(R, { size: 'PP', angle: 'Subjetivo (POV)', move: 'Fijo' })), []);
});
test('la figura que sigue la cámara manda (no la primera)', () => {
  const s3 = scene({ objs: [{ id: 'a0', kind: 'actor', name: 'Lejos' }, { id: 'a1', kind: 'actor', name: 'Cerca' }] });
  s3.keys[0].o.a0 = { x: 0, z: -20, rot: 0, pose: 'pie' }; s3.keys[0].o.a1 = { x: 0, z: 0, rot: 0, pose: 'pie' };
  s3.aim = 'a1';
  const R = c.s3Read(s3); assert.strictEqual(R.fig, 'a1');
});
test('una figura fuera del cuadro no cuenta: la que se ve', () => {
  const s3 = scene({ objs: [{ id: 'a0', kind: 'actor', name: 'Detrás' }, { id: 'a1', kind: 'actor', name: 'Delante' }] });
  s3.keys[0].o.a0 = { x: 0, z: 9, rot: 0, pose: 'pie' }; s3.keys[0].o.a1 = { x: 0, z: 0, rot: 0, pose: 'pie' };
  assert.strictEqual(c.s3Read(s3).fig, 'a1');
});

if (fail) { console.log(`\n${fail} prueba(s) fallaron`); process.exit(1); }
console.log('\ntodo bien');
