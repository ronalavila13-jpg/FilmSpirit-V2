/* Clonar los atributos de un plano en otros (lote T, storyboard: Ctrl+clic y «Clonar sus atributos…»): qué pasa de un
   plano a otro según lo elegido y qué no se toca nunca.  node test/clonar.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const J = x => JSON.parse(JSON.stringify(x));

const c = { console, Math, JSON, WeakMap, Map, Set, Number, String, Object, Array, isFinite };
vm.createContext(c);
vm.runInContext(`var clamp = (v, a, b) => Math.max(a, Math.min(b, v)); var num = v => +v || 0; var P = { meta: {}, elements: {}, paras: [] }; var D = { shotsBy: {}, code: {} };
  var lookOf = ob => ({ color: ob.color || "#C04A3A", s: 1 }); var toast = () => {};`, c);
vm.runInContext(fs.readFileSync(R + '/src/s3d-model.js', 'utf8') + '\nvar s3Of = sh => sh.s3;', c);
vm.runInContext('Object.assign(globalThis, { shotLens, shotBlank, CLONE_F, camKeys, objKeys })', c);

const cam = (x, z, lens = 35, yaw = 0) => ({ x, z, h: 1.6, yaw, pitch: 0, roll: 0, lens });
const ALL = () => Object.fromEntries(c.CLONE_F.map(f => [f, true]));
const NONE = () => Object.fromEntries(c.CLONE_F.map(f => [f, false]));
// el plano de origen: la cocina con Rosa, PMC 50 mm, contrapicado, cámara en mano, 24 s
const cocina = () => ({ id: 's22', sc: '2', ord: 2, p0: null, p1: null, size: 'PMC', angle: 'Contrapicado', move: 'Cámara en mano', support: 'Mano', lens: '50', snd: 'si', dur: '24', desc: 'ROSA — reaction & dialogue', chars: ['rosa'], notes: 'n2', ws: '3d',
  s3: { v: 2, set: 'int', room: 'cocina', aim: 'a0', shake: .25, sensor: 's35', objs: [{ id: 'a0', kind: 'actor', el: 'rosa', name: 'Rosa' }, { id: 'o0', kind: 'mesa' }],
    keys: [{ t: 0, ease: 'suave', cam: cam(.5, 2.2, 50, 10), o: { a0: { x: 0, z: 0, rot: 0 }, o0: { x: 1, z: -1, rot: 0 } } }, { t: 4, ease: 'suave', cam: cam(1, 2, 50, 15), o: { a0: { x: .3, z: 0, rot: 20 }, o0: { x: 1, z: -1, rot: 0 } } }] } });
// el de destino: la playa con Teófilo, PM 35 mm, 10 s, otra escena
const playa = () => ({ id: 's14', sc: '1', ord: 4, p0: 3, p1: 5, size: 'PM', angle: 'Normal', move: 'Fijo', support: '', lens: '35', dur: '10', desc: 'cocina roja', chars: ['teo'], notes: 'n1', done: true,
  s3: { v: 2, set: 'ext', atm: 'niebla', aim: 'a0', shake: 0, objs: [{ id: 'a0', kind: 'actor', el: 'teo', name: 'Teófilo' }],
    keys: [{ t: 0, ease: 'suave', cam: cam(0, 4, 35), o: { a0: { x: 2, z: -3, rot: 90 } } }] } });
const fixed = sh => ({ id: sh.id, sc: sh.sc, ord: sh.ord, p0: sh.p0, p1: sh.p1, desc: sh.desc, notes: sh.notes, done: sh.done });

test('todo: el destino queda como el origen, pero sigue en su escena, con su texto y su lugar', () => {
  const a = cocina(), b = playa(), keep = fixed(b);
  c.shotCloneFrom(b, a, ALL());
  assert.deepStrictEqual(fixed(b), keep, 'id, escena, orden, tramo del guion, descripción, notas y «rodado» no cambian');
  for (const f of ['size', 'angle', 'move', 'support', 'snd']) assert.strictEqual(b[f], a[f], f);
  assert.strictEqual(b.dur, '24'); assert.strictEqual(b.lens, '50');
  assert.strictEqual(b.s3.set, 'int', 'trae el decorado'); assert.strictEqual(b.s3.objs[0].el, 'rosa');
  assert.strictEqual(J(b.s3.keys).length, 2); assert.strictEqual(b.s3.keys[1].cam.yaw, 15, 'con su recorrido');
  assert.deepStrictEqual(J(b.chars), ['rosa'], 'los personajes del plano son los de su escena 3D (como al guardar el editor)');
  assert.notStrictEqual(b.s3, a.s3, 'es una copia, no la misma escena'); b.s3.keys[0].cam.x = 99; assert.strictEqual(a.s3.keys[0].cam.x, .5);
});
test('solo los datos: tamaño y ángulo, nada más (ni lente, ni 3D, ni duración)', () => {
  const a = cocina(), b = playa(), s3 = J(b.s3);
  c.shotCloneFrom(b, a, { ...NONE(), size: true, angle: true });
  assert.strictEqual(b.size, 'PMC'); assert.strictEqual(b.angle, 'Contrapicado');
  assert.strictEqual(b.move, 'Fijo'); assert.strictEqual(b.lens, '35'); assert.strictEqual(b.dur, '10'); assert.strictEqual(b.snd, undefined);
  assert.deepStrictEqual(J(b.s3), s3, 'la escena 3D no se toca');
});
test('el lente solo: va también en las claves de su escena 3D, proporcional', () => {
  const a = cocina(), b = playa();
  b.s3.keys.push({ t: 3, ease: 'suave', cam: cam(0, 3, 70), o: { a0: { x: 2, z: -3, rot: 90 } } });
  c.shotCloneFrom(b, a, { ...NONE(), lens: true });
  assert.strictEqual(b.lens, '50'); assert.strictEqual(b.s3.keys[0].cam.lens, 50); assert.strictEqual(b.s3.keys[1].cam.lens, 100);
  assert.strictEqual(b.s3.set, 'ext');
});
test('la cámara 3D: la del origen sobre la escena del destino (su playa, su figura), siguiendo a su personaje', () => {
  const a = cocina(), b = playa();
  c.shotCloneFrom(b, a, { ...NONE(), cam: true, lens: true });
  assert.strictEqual(b.s3.set, 'ext'); assert.strictEqual(b.s3.atm, 'niebla', 'el decorado y la atmósfera son los suyos');
  assert.deepStrictEqual(J(b.s3.objs), J(playa().s3.objs), 'sus figuras');
  const ck = c.camKeys(b.s3);
  assert.strictEqual(ck[0].cam.x, .5); assert.strictEqual(ck[0].cam.yaw, 10); assert.ok(ck.some(k => k.t === 4 && k.cam.yaw === 15), 'con el recorrido del origen');
  assert.strictEqual(b.s3.aim, 'a0', 'Rosa no está: sigue a la figura que ocupa su lugar (Teófilo)');
  assert.strictEqual(b.s3.shake, .25); assert.strictEqual(b.s3.sensor, 's35');
  const ok = c.objKeys(b.s3); assert.ok(ok.every(k => k.o.a0 && k.o.a0.x === 2 && k.o.a0.z === -3), 'Teófilo sigue donde estaba');
  assert.strictEqual(b.lens, '50'); assert.deepStrictEqual(J(b.chars), ['teo'], 'sus personajes no cambian');
});
test('la cámara 3D sin el lente: se queda con su 35 mm (y su recorrido, proporcional)', () => {
  const a = cocina(), b = playa();
  c.shotCloneFrom(b, a, { ...NONE(), cam: true });
  assert.strictEqual(b.lens, '35');
  assert.ok(c.camKeys(b.s3).every(k => k.cam.lens === 35));
  assert.strictEqual(c.camKeys(b.s3)[0].cam.x, .5, 'la posición sí es la del origen');
});
test('la puesta en escena 3D: la cocina del origen con la cámara del destino; no queda ligada al origen', () => {
  const a = cocina(), b = playa();
  c.shotCloneFrom(b, a, { ...NONE(), stage: true });
  assert.strictEqual(b.s3.set, 'int'); assert.ok(b.s3.objs.some(o => o.kind === 'mesa'));
  assert.strictEqual(c.camKeys(b.s3)[0].cam.z, 4, 'su cámara'); assert.strictEqual(b.lens, '35');
  assert.strictEqual(b.s3.from, undefined, 'en el animatic no pasa a ser un inserto encima del origen');
  assert.strictEqual(b.s3.sensor, undefined, 'el sensor es de la cámara: sigue el suyo');
  assert.strictEqual(b.s3.aim, 'a0');
  assert.deepStrictEqual(J(b.chars), ['rosa']);
});
test('la puesta en escena con el lente del origen: la cámara del destino, cerrada a 50 mm', () => {
  const a = cocina(), b = playa();
  c.shotCloneFrom(b, a, { ...NONE(), stage: true, lens: true });
  assert.strictEqual(b.lens, '50'); assert.strictEqual(c.camKeys(b.s3)[0].cam.lens, 50); assert.strictEqual(c.camKeys(b.s3)[0].cam.z, 4);
});
test('todo, con el origen ligado a otro plano: la copia no hereda ese vínculo', () => {
  const a = cocina(), b = playa();
  a.s3.from = { id: 's21', off: 1 };
  c.shotCloneFrom(b, a, ALL());
  assert.strictEqual(b.s3.from, undefined); assert.deepStrictEqual(J(a.s3.from), { id: 's21', off: 1 }, 'el origen no cambia');
});
test('un dibujo 2D que recibe el 3D pasa a mostrarlo; su dibujo sigue guardado', () => {
  const a = cocina(), b = playa(); b.ws = '2d'; b.d2 = { frames: [{ id: 'f1' }], layers: [] };
  const r = c.shotCloneFrom(b, a, ALL());
  assert.strictEqual(b.ws, '3d'); assert.ok(r.to3d); assert.deepStrictEqual(J(b.d2), { frames: [{ id: 'f1' }], layers: [] });
});
test('un origen dibujado a mano: pasan los datos, no el 3D (no tiene) ni un lente vacío', () => {
  const a = cocina(), b = playa(); a.ws = '2d'; a.lens = '';
  const s3 = J(b.s3);
  c.shotCloneFrom(b, a, ALL());
  assert.strictEqual(b.size, 'PMC'); assert.strictEqual(b.lens, '35'); assert.deepStrictEqual(J(b.s3), s3);
});
test('la duración estimada del origen pasa como número (la que muestra su viñeta)', () => {
  const a = cocina(), b = playa(); a.dur = '';
  c.shotCloneFrom(b, a, { ...NONE(), dur: true });
  assert.strictEqual(b.dur, '3');
});
test('sonido vacío en el origen: el destino queda sin sonido anotado', () => {
  const a = cocina(), b = playa(); delete a.snd; b.snd = 'amb';
  c.shotCloneFrom(b, a, { ...NONE(), snd: true });
  assert.strictEqual(b.snd, undefined);
});
test('un plano en blanco que recibe el 3D vuelve a mostrarlo; «sin nombres» viaja con la puesta en escena', () => {
  const a = cocina(), b = playa(); b.blank = true; a.noNames = true;
  c.shotCloneFrom(b, a, { ...NONE(), stage: true });
  assert.strictEqual(c.shotBlank(b), false); assert.strictEqual(b.noNames, true);
});
test('a quién sigue la cámara: por personaje si está; si no, la figura en el mismo lugar; si no hay figuras, nadie', () => {
  const src = { objs: [{ id: 'a0', kind: 'actor', el: 'x' }, { id: 'a1', kind: 'actor', el: 'rosa' }] };
  assert.strictEqual(c.s3MapObj('a1', src, { objs: [{ id: 'z', kind: 'actor', el: 'rosa' }] }), 'z');
  assert.strictEqual(c.s3MapObj('a1', src, { objs: [{ id: 'p', kind: 'actor', el: 'q' }, { id: 'r', kind: 'actor', el: 's' }] }), 'r');
  assert.strictEqual(c.s3MapObj('a1', src, { objs: [{ id: 'p', kind: 'actor', el: 'q' }] }), 'p');
  assert.strictEqual(c.s3MapObj('a1', src, { objs: [{ id: 'o0', kind: 'mesa' }] }), null);
  assert.strictEqual(c.s3MapObj(null, src, { objs: [] }), null);
});
test('el mismo plano como origen y destino: no pasa nada', () => {
  const a = cocina(), s = J(a);
  c.shotCloneFrom(a, a, ALL());
  assert.deepStrictEqual(J(a), s);
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
