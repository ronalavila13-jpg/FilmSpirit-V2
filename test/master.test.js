/* Lote U · storyboard: los planos de una escena toman la puesta en escena del máster (s3d-model.js) y el 2D y el 3D de
   un plano se ven juntos (s2d-editor.js, el modelo de capas).  node test/master.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const J = x => JSON.parse(JSON.stringify(x));

/* ---------- el máster ---------- */
const c = { console, Math, JSON, WeakMap, Map, Set, Number, String, Object, Array, isFinite };
vm.createContext(c);
vm.runInContext(`var clamp = (v, a, b) => Math.max(a, Math.min(b, v)); var num = v => +v || 0; var toast = () => {};
  var deaccent = s => String(s).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  var normCue = x => String(x || '').toUpperCase().trim();
  var envFromScene = s => ({ set: 'vacio', atm: s && s.dn === 'N' ? 'noche' : 'dia' });
  var P = { meta: {}, paras: [], tags: [], elements: {
    ana: { id: 'ana', cat: 'cast', name: 'ANA' }, tito: { id: 'tito', cat: 'cast', name: 'TITO' }, don: { id: 'don', cat: 'cast', name: 'DON ALFREDO' },
    cel: { id: 'cel', cat: 'props', name: 'Celular' } } };
  var SC = { key: '1', idx: 0, p0: 0, p1: 6, dn: 'D' };
  var D = { shotsBy: {}, code: {}, sc: { scenes: [SC], byKey: { 1: SC } } };
  var sceneOfKey = k => D.sc.byKey[k];`, c);
vm.runInContext(fs.readFileSync(R + '/src/s3d-model.js', 'utf8'), c);
vm.runInContext('Object.assign(globalThis, { shotMaster, isMaster, masterOf, setMaster, s3Of, s3Follow, s3FrameFollow, s3At, camKeys })', c);
// el guion de la escena: Ana y Tito hablan (Don Alfredo no)
c.P.paras = [{ t: 'h', x: 'INT. CABINA - DIA' }, { t: 'a', x: 'Ana mira el celular.' }, { t: 'c', x: 'ANA' }, { t: 'd', x: 'Hola.' }, { t: 'c', x: 'TITO' }, { t: 'd', x: 'Hola, Ana.' }, { t: 'h', x: 'INT. OTRA - DIA' }];
c.P.tags = [{ el: 'cel', p: 1 }];
const shot = (id, f) => ({ id, sc: '1', ord: 1, p0: 1, p1: 5, size: 'PM', angle: 'Normal', move: 'Fijo', lens: '', dur: '', desc: '', chars: [], ...f });
const setShots = list => { c.D.shotsBy['1'] = list; c.S3REV++; };
const actorAt = (s3, el) => { const o = s3.objs.find(x => x.kind === 'actor' && x.el === el); return o && s3.keys[0].o[o.id]; };
// de qué lado de la línea a→b está el punto p (signo del producto cruz)
const side = (a, b, p) => Math.sign((b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x));

test('el máster: el marcado, si no el que dice «máster»; master = false lo descarta; uno por escena', () => {
  const a = shot('a', { desc: 'Plano máster de la escena' }), b = shot('b', { desc: 'Ana' }), d = shot('d', { desc: 'MASTER general' });
  setShots([b, a, d]);
  assert.strictEqual(c.shotMaster('1').id, 'a', 'el primero cuya descripción dice máster (con o sin tilde)');
  b.master = true; c.S3REV++;
  assert.strictEqual(c.shotMaster('1').id, 'b', 'el marcado manda');
  c.setMaster(d, true);
  assert.strictEqual(c.shotMaster('1').id, 'd');
  assert.strictEqual(b.master, false, 'marcar otro desmarca el anterior');
  assert.strictEqual(a.master, false, 'y el que lo decía en su descripción deja de serlo');
  c.setMaster(d, false);
  assert.strictEqual(c.shotMaster('1'), null, 'sin máster');
  assert.ok(c.isMaster(d) === false && c.masterOf(b) === null);
});

/* una escena: el máster con Ana y Tito armado a mano (otra ubicación que la de siempre) y los demás sin puesta propia */
const masterS3 = () => {
  const m = shot('m', { size: 'PE', chars: ['ana', 'tito'], master: true });
  setShots([m]);
  const s3 = J(c.s3Of(m));
  // Ana y Tito frente a frente sobre el eje x, la cámara del máster del lado +z
  const A = s3.objs.find(o => o.el === 'ana'), T = s3.objs.find(o => o.el === 'tito');
  s3.keys[0].o[A.id] = { x: -1, z: -2, rot: 90, pose: 'sentado', expr: 'feliz' }; s3.keys[0].o[T.id] = { x: 1, z: -2, rot: -90, pose: 'pie', expr: 'neutral' };
  s3.keys[0].cam = { x: 0, z: 3, h: 1.6, yaw: 0, pitch: 0, roll: 0, lens: 35 };
  s3.rain = true; s3.atm = 'noche';
  m.s3 = s3;
  return m;
};
test('los planos de la escena toman del máster la ubicación, el giro y la postura de cada personaje, el escenario, la hora y la lluvia', () => {
  const m = masterS3(), pa = shot('pa', { size: 'PMC', chars: ['ana'] }), pt = shot('pt', { size: 'PMC', chars: ['tito'] });
  setShots([m, pa, pt]);
  for (const sh of [pa, pt]) {
    const s3 = c.s3Of(sh);
    assert.ok(c.masterOf(sh) === m, sh.id + ' sigue al máster');
    assert.deepStrictEqual(J(actorAt(s3, 'ana')), J(actorAt(m.s3, 'ana')), sh.id + ': Ana donde está en el máster (con su postura)');
    assert.deepStrictEqual(J(actorAt(s3, 'tito')), J(actorAt(m.s3, 'tito')));
    assert.strictEqual(s3.set, m.s3.set); assert.strictEqual(s3.rain, true); assert.strictEqual(s3.atm, 'noche');
    assert.ok(!s3.camB && !s3.meas, 'lo de la cámara del máster no viene');
  }
  assert.notDeepStrictEqual(J(c.s3Of(pa).keys[0].cam), J(m.s3.keys[0].cam), 'cada plano pone su cámara');
});
test('regla de los 180°: plano y contraplano del mismo lado de la línea de acción que el máster, por encima del hombro del otro', () => {
  const m = masterS3(), pa = shot('pa', { size: 'PMC', chars: ['ana'] }), pt = shot('pt', { size: 'PMC', chars: ['tito'] });
  setShots([m, pa, pt]);
  const A = actorAt(m.s3, 'ana'), T = actorAt(m.s3, 'tito'), ladoM = side(A, T, m.s3.keys[0].cam);
  for (const sh of [pa, pt]) {
    const s3 = c.s3Of(sh), cam = s3.keys[0].cam;
    assert.strictEqual(side(A, T, cam), ladoM, sh.id + ': del lado de la cámara del máster');
    // la cámara está detrás del otro (más lejos de lo encuadrado que el otro) y lo encuadrado queda al medio
    const me = sh.id === 'pa' ? A : T, other = sh.id === 'pa' ? T : A;
    assert.ok(Math.hypot(cam.x - me.x, cam.z - me.z) > Math.hypot(other.x - me.x, other.z - me.z), sh.id + ': detrás del hombro del otro');
    const yawTo = Math.atan2(-(me.x - cam.x), -(me.z - cam.z)) * 180 / Math.PI;
    assert.ok(Math.abs(((cam.yaw - yawTo + 540) % 360) - 180) < 2, sh.id + ': mira a su personaje');
    // el hombro del otro entra por el borde del cuadro (a menos del medio cuadro del centro, un poco más con su ancho)
    const hf = Math.atan(18 / cam.lens) * 180 / Math.PI, yawO = Math.atan2(-(other.x - cam.x), -(other.z - cam.z)) * 180 / Math.PI;
    const off = Math.abs(((cam.yaw - yawO + 540) % 360) - 180);
    assert.ok(off > hf * .4 && off < hf * 1.1, `${sh.id}: el otro a un costado del cuadro (${off.toFixed(1)}° de ${hf.toFixed(1)}°)`);
  }
});
test('el diálogo es con quien habla: Don Alfredo (sin diálogo) más cerca no cuenta como el otro', () => {
  const m = masterS3();
  const s3 = m.s3; s3.objs.push({ id: 'a9', kind: 'actor', el: 'don', name: 'DON ALFREDO' }); s3.keys[0].o.a9 = { x: -.4, z: -1.4, rot: 0, pose: 'pie' };
  const pa = shot('pa', { size: 'PMC', chars: ['ana'] });
  setShots([m, pa]);
  const cam = c.s3Of(pa).keys[0].cam, T = actorAt(m.s3, 'tito');
  assert.ok(cam.x > T.x, 'la cámara va detrás de Tito (el que habla con Ana)');
});
test('un personaje del plano que no está en el máster: junto al grupo, sin pisar a nadie', () => {
  const m = masterS3(), pd = shot('pd', { size: 'PM', chars: ['don'] });
  setShots([m, pd]);
  const s3 = c.s3Of(pd), p = actorAt(s3, 'don'), A = actorAt(m.s3, 'ana'), T = actorAt(m.s3, 'tito');
  assert.ok(p, 'Don Alfredo está');
  assert.ok(Math.hypot(p.x, p.z + 2) < 3, 'cerca del grupo');
  assert.ok(Math.hypot(p.x - A.x, p.z - A.z) > .5 && Math.hypot(p.x - T.x, p.z - T.z) > .5, 'sin pisar a nadie');
  assert.strictEqual(s3.objs[0].el, 'don', 'el del plano va primero (a él apuntan la cámara y sus movimientos)');
});
test('un inserto: su objeto dentro del mismo escenario, lejos de las figuras, y la cámara mirándolo', () => {
  const m = masterS3(), pi = shot('pi', { size: 'PD', chars: [], p0: 1, p1: 1, desc: 'Detalle: celular' });
  setShots([m, pi]);
  const s3 = c.s3Of(pi), d = s3.objs.find(o => o.kind === 'detalle'), p = s3.keys[0].o[d.id], cam = s3.keys[0].cam;
  assert.strictEqual(d.name, 'Celular');
  for (const el of ['ana', 'tito']) { const a = actorAt(s3, el); assert.ok(Math.hypot(p.x - a.x, p.z - a.z) >= .8, 'lejos de ' + el); }
  const yawTo = Math.atan2(-(p.x - cam.x), -(p.z - cam.z)) * 180 / Math.PI;
  assert.ok(Math.abs(((cam.yaw - yawTo + 540) % 360) - 180) < 2, 'la cámara mira el objeto');
  assert.ok(cam.z > p.z, 'desde el lado de la cámara del máster');
});
test('siguen al máster mientras no se ajusten a mano: si alguien se mueve en el máster, los demás se acomodan; el ajustado conserva lo suyo', () => {
  const m = masterS3(), pa = shot('pa', { size: 'PMC', chars: ['ana'] }), own = shot('own', { size: 'PM', chars: ['ana'] });
  setShots([m, pa, own]);
  own.s3 = J(c.s3Of(own));
  const before = J(c.s3Of(pa));
  const A = m.s3.objs.find(o => o.el === 'ana'); m.s3.keys[0].o[A.id].x = -2.5; c.S3REV++;   // (cada cambio sube S3REV)
  assert.strictEqual(actorAt(c.s3Of(pa), 'ana').x, -2.5, 'el que sigue al máster se acomoda');
  assert.notDeepStrictEqual(J(c.s3Of(pa).keys[0].cam), before.keys[0].cam, 'y su cámara la vuelve a encuadrar');
  assert.strictEqual(actorAt(c.s3Of(own), 'ana').x, -1, 'el ajustado a mano no cambia');
  assert.strictEqual(c.masterOf(own), null);
});
test('sin 3D guardado, el máster parte de su armado de siempre; y el máster no sigue a nadie', () => {
  const m = shot('m', { size: 'PE', chars: ['ana', 'tito'], master: true }), pa = shot('pa', { size: 'PMC', chars: ['ana'] });
  setShots([m, pa]);
  const ms = c.s3Of(m);
  assert.strictEqual(c.masterOf(m), null);
  assert.deepStrictEqual(J(actorAt(c.s3Of(pa), 'ana')), J(actorAt(ms, 'ana')));
});
test('s3Default y s3Follow terminan igual: los elementos de la escena (luces, objetos y animales de la planta general)', () => {
  const src = fs.readFileSync(R + '/src/s3d-model.js', 'utf8');
  assert.strictEqual((src.match(/for \(const x of scEls\(sh\.sc\)\) scElPut\(s3, x\.ob, x\.pos\);/g) || []).length, 2);
  assert.ok(/master: true/.test(fs.readFileSync(R + '/src/tab-script.js', 'utf8')), 'el máster sugerido queda marcado');
});

/* ---------- el 2D y el 3D juntos ---------- */
const d = { console, Math, JSON, Map, Set, Number, String, Object, Array, isFinite };
vm.createContext(d);
vm.runInContext(`var clamp = (v, a, b) => Math.max(a, Math.min(b, v)); var FRAMES = {}; var FRIDX = null;
  var frameHas = k => !!FRAMES[k]; var cachedImg = k => FRAMES[k] ? { k } : null; var framesNeed = () => Promise.resolve();
  var frameViewKeys = id => Object.keys(FRAMES).filter(k => (k === id || k.startsWith(id + '~')) && !k.includes('~d~'));
  var frameDims = () => [1280, 720];`, d);
vm.runInContext(fs.readFileSync(R + '/src/s2d-editor.js', 'utf8'), d);
vm.runInContext('Object.assign(globalThis, { d2On, d2Back, d2Layers, shot3D, d2Op3D, d2Imp, d2Norm, d2Unimp, d2LayerKeys, d2ViewKeys, d2Under, d2Key })', d);
const L = (id, o = {}) => ({ id, name: id, kind: 'draw', vis: true, op: 1, shared: true, ...o });
const doc = (o = {}) => ({ v: 2, rev: 1, base: '3d', baseOp: 1, frames: [{ id: 'f1', hold: 2 }, { id: 'f2', hold: 2 }], fps: 12, layers: [], objs: {}, ...o });

test('las capas en el orden en que se ven: las fotos «Detrás de las figuras» primero; el dibujo nunca va detrás', () => {
  const D2 = doc({ layers: [L('dib'), L('foto', { kind: 'image', back: true }), L('raya', { back: true }), L('ref', { kind: 'image' })] });
  assert.deepStrictEqual(J(d.d2Layers(D2).map(l => l.id)), ['foto', 'dib', 'raya', 'ref']);
});
test('¿se ve la escena 3D? sin dibujo, si no es 2D; un dibujo de antes que se dejó en el 3D, sí (y opaca); uno nuevo, lo que diga su capa', () => {
  assert.strictEqual(d.shot3D({ ws: '3d' }), true); assert.strictEqual(d.shot3D({ ws: '2d' }), false);
  const old = sh => ({ id: 's', ...sh, d2: doc({ v: 1, base: 'paper', baseOp: .45, layers: [L('x')] }) });
  assert.strictEqual(d.shot3D(old({ ws: '3d' })), true); assert.strictEqual(d.d2Op3D(old({ ws: '3d' })), 1);
  assert.strictEqual(d.shot3D(old({ ws: '2d' })), false, 'un dibujo sobre papel sigue siendo papel');
  assert.strictEqual(d.shot3D({ ws: '2d', d2: doc({ base: '3d', baseOp: .45, layers: [L('x')] }) }), true);
  assert.strictEqual(d.d2Op3D({ ws: '2d', d2: doc({ base: '3d', baseOp: .45, layers: [L('x')] }) }), .45);
  assert.strictEqual(d.shot3D({ ws: '3d', d2: doc({ base: 'paper', layers: [L('x')] }) }), false);
});
test('un dibujo de antes se pone al día al abrirlo: la Viñeta 3D como se veía y las capas que trajeron la referencia y la anotación', () => {
  const sh = { id: 's', ws: '3d', d2: doc({ v: 1, base: 'paper', baseOp: .45, layers: [L('Referencia', { kind: 'image' }), L('Fondo'), L('Anotaciones')] }) };
  assert.ok(d.d2Imp(sh.d2, 'ref') && d.d2Imp(sh.d2, 'anno'), 'las de antes se reconocen por su nombre');
  d.d2Norm(sh, sh.d2);
  assert.strictEqual(sh.d2.v, 2); assert.strictEqual(sh.d2.base, '3d'); assert.strictEqual(sh.d2.baseOp, 1);
  assert.deepStrictEqual(J(sh.d2.layers.map(l => l.imp || '')), ['ref', '', 'anno']);
  d.d2Unimp(sh, 'ref');
  assert.ok(!d.d2Imp(sh.d2, 'ref') && d.d2Imp(sh.d2, 'anno'), 'el editor 3D cambió su referencia: desde ahora se ve la nueva');
  const nuevo = { id: 's', ws: '2d', d2: doc({ layers: [L('Referencia', { kind: 'image' })] }) };
  assert.ok(!d.d2Imp(nuevo.d2, 'ref'), 'en uno nuevo solo cuenta la marca');
});
test('las imágenes de la viñeta combinada: las capas que se ven, del cuadro de ese momento (las compartidas, una vez)', () => {
  const sh = { id: 's1', ws: '3d', d2: doc({ layers: [L('a'), L('b', { shared: false }), L('c', { vis: false }), L('foto', { kind: 'image', back: true })] }) };
  for (const k of ['s1~d~a~all', 's1~d~b~f1', 's1~d~b~f2', 's1~d~c~all', 's1~d~foto~all']) d.FRAMES[k] = 'data:';
  assert.deepStrictEqual(J(d.d2ViewKeys(sh, 0)), ['s1~d~foto~all', 's1~d~a~all', 's1~d~b~f1']);
  assert.deepStrictEqual(J(d.d2ViewKeys(sh, .2)), ['s1~d~foto~all', 's1~d~a~all', 's1~d~b~f2'], 'a los 0,2 s, el segundo cuadro');
  assert.strictEqual(d.d2ViewKeys(sh, null).length, 4, 'para el animatic, todos los cuadros');
  assert.ok(d.d2Under(sh, sh.d2.frames[0]), 'hay una foto detrás de las figuras: la escena va sin su entorno');
  sh.d2.layers[3].vis = false;
  assert.ok(!d.d2Under(sh, sh.d2.frames[0]), 'oculta, no');
  assert.deepStrictEqual(J(d.d2ViewKeys({ ...sh, d2: { ...sh.d2, base: 'paper' } }, 0)), [], 'sin la Viñeta 3D la viñeta es el cuadro ya compuesto');
});
test('la viñeta del storyboard, el PDF y el animatic dibujan lo mismo (drawShotFrame): fondo, escena con su opacidad, encima el dibujo', () => {
  const src = fs.readFileSync(R + '/src/s3d-render.js', 'utf8'), f = src.slice(src.indexOf('function drawShotFrame'), src.indexOf('const looksKey'));
  const i1 = f.indexOf('d2Paint(ctx, sh, F, W, H, true)'), i2 = f.indexOf('r3Draw(ctx, s3Of(sh)'), i3 = f.indexOf('d2Paint(ctx, sh, F, W, H, false)');
  assert.ok(i1 > 0 && i2 > i1 && i3 > i2, 'el orden de las capas');
  assert.ok(/plate: back \|\| under/.test(f), 'con una foto detrás, la escena sin su entorno');
  assert.ok(/ctx\.globalAlpha = op/.test(f), 'la Viñeta 3D con su opacidad');
});

console.log(fail ? `${fail} fallan` : 'todas pasan');
process.exit(fail ? 1 : 0);
