/* Imágenes con IA (src/ia.js + src/s3d-render.js): el pedido a Google, la proporción, el tope de referencias y que la
   imagen de IA se vea solo con sh.ia y sin P.meta.iaOff sin tocar la escena 3D del plano.  node test/ia-cliente.test.js */
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const R = __dirname + '/..';
const ia = fs.readFileSync(R + '/src/ia.js', 'utf8'), rend = fs.readFileSync(R + '/src/s3d-render.js', 'utf8');
let fail = 0;
let q = Promise.resolve();   // en fila: las pruebas con await no se mezclan
const test = (n, f) => { q = q.then(async () => { try { await f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } }); };

// de s3d-render.js: drawShotFrame, lookNoAi, looksKey y shotIaKey (hasta «cuerpos articulados»)
const piece = rend.slice(rend.indexOf('function drawShotFrame'), rend.indexOf('/* cuerpos articulados'));
function make(over = {}) {
  const calls = [], log = [];
  const c = {
    console, JSON, Math, Object, Set, Map, String, Number, Promise, Error,
    TARGET: 'server',
    ASPECTS: { '16:9': 16 / 9, '1.85:1': 1.85, '2.39:1': 2.39, '4:3': 4 / 3, '9:16': 9 / 16 },
    SIZE_NAME: { PM: 'Plano medio' }, titleCase: s => s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()),
    esc: s => s, ea: s => s,
    P: { meta: { aspect: '16:9' }, build: { bios: {} }, elements: {}, shots: {} }, D: { code: {} },
    FRAMES: {}, IMGS: new Map(), FRIDX: null,
    frameHas: k => !!c.FRAMES[k], framesNeed: () => Promise.resolve(), cachedImg: k => (c.FRAMES[k] ? { k } : null),
    sceneOfKey: () => ({ key: '3', heading: 'INT. COCINA - NOCHE' }),
    shot3D: () => true, s3Of: sh => sh.s3 || { keys: [{ cam: { lens: 35 } }] }, shotTextExcerpt: () => 'Juan corta cebolla.',
    d2On: () => false, shotBlank: () => false, envFromScene: () => ({ atm: null }),
    r3Draw: () => { log.push('3d'); return true; }, drawAutoFrame: () => log.push('auto'),
    histNote() { }, changed() { }, render() { }, toast() { }, toastUndo() { }, UI: { readOnly: false }, ACT: {},
    ...over,
  };
  c.globalThis = c;
  vm.createContext(c);
  // las const de un script no cuelgan del contexto: se exponen las que prueba este archivo
  vm.runInContext(ia + '\n' + piece + '\nObject.assign(globalThis, { iaMissing, iaCharRefKeys, iaMenuHTML, iaPillHTML, iaSwitchHTML, looksKey });', c);
  const ctx = { fillStyle: '', fillRect() { }, drawImage(im) { calls.push(im.k || 'img'); }, set globalAlpha(v) { } };
  return { c, calls, log, ctx };
}
const sh0 = (o = {}) => ({ id: 's1', sc: '3', size: 'PM', angle: 'Picado', move: 'Fijo', chars: ['juan', 'ana'], ...o });

test('la proporción de Google más cercana a la del proyecto', () => {
  const { c } = make();
  const a = r => c.iaAspect(r);
  assert.strictEqual(a(16 / 9), '16:9'); assert.strictEqual(a(2.39), '21:9'); assert.strictEqual(a(1.85), '16:9');
  assert.strictEqual(a(4 / 3), '4:3'); assert.strictEqual(a(9 / 16), '9:16'); assert.strictEqual(a(1), '1:1');
  c.P.meta.aspect = '2.39:1'; assert.strictEqual(c.iaAspect(), '21:9');
});

test('el pedido lleva el encabezado de la escena, el tamaño, el lente, los personajes y sus descripciones', () => {
  const { c } = make();
  c.P.elements = { juan: { id: 'juan', name: 'JUAN', look: { ai: { desc: 'Hombre de 40, barba gris' } } }, ana: { id: 'ana', name: 'ANA' } };
  c.P.build.bios = { b1: { el: 'ana', look: 'Mujer joven, pelo rojo' } };
  const q = c.iaShotPrompt(sh0(), { style: 'lapiz', notes: 'luz de neón' });
  const t = q.text;
  assert.ok(t.includes('INT. COCINA - NOCHE'), 'encabezado'); assert.ok(t.includes('Plano medio (PM)'), 'tamaño'); assert.ok(t.includes('picado'), 'ángulo');
  assert.ok(t.includes('35 mm'), 'lente'); assert.ok(t.includes('Juan corta cebolla.'), 'acción');
  assert.ok(t.includes('Juan: Hombre de 40, barba gris'), 'su descripción'); assert.ok(t.includes('Ana: Mujer joven, pelo rojo'), 'la apariencia de su biografía');
  assert.ok(t.includes('a lápiz') && t.includes('luz de neón'), 'estilo e indicaciones');
  assert.strictEqual(q.aspect, '16:9'); assert.ok(t.length <= 4000);
  assert.deepStrictEqual(c.iaMissing(sh0()), [], 'los dos tienen con qué');
});

test('máximo 6 imágenes de referencia: la guía primero y 2 por personaje', () => {
  const { c } = make();
  const ids = ['a', 'b', 'c', 'd'];
  for (const id of ids) {
    c.P.elements[id] = { id, name: id, look: { ai: { desc: 'x', refs: [`ai~${id}~0`, `ai~${id}~1`, `ai~${id}~2`] } } };
    for (let n = 0; n < 3; n++) c.FRAMES[`ai~${id}~${n}`] = `data:image/webp;base64,${id}${n}`;
  }
  const q = c.iaShotPrompt(sh0({ chars: ids }), { guide: 'data:image/jpeg;base64,GUIA' });
  assert.strictEqual(q.refs.length, 6); assert.strictEqual(q.refs[0], 'data:image/jpeg;base64,GUIA');
  assert.ok(q.text.includes('guía de composición'));
  const sin = c.iaShotPrompt(sh0({ chars: ['a'] }));
  assert.strictEqual(sin.refs.length, 2, 'sin guía: 2 del personaje'); assert.ok(!sin.text.includes('guía de composición'));
});

test('las fotos de Cuerpo entran solo si la ficha lo pide; un personaje sin nada se avisa', () => {
  const { c } = make();
  c.P.elements = { juan: { id: 'juan', name: 'JUAN', look: { ai: { usePh: true } } }, ana: { id: 'ana', name: 'ANA' } };
  c.FRAMES['ph~juan~front'] = 'data:image/webp;base64,F';
  assert.deepStrictEqual(Array.from(c.iaCharRefKeys(c.P.elements.juan)), ['ph~juan~front']);
  c.P.elements.juan.look.ai.usePh = false;
  assert.deepStrictEqual(Array.from(c.iaCharRefKeys(c.P.elements.juan)), []);
  assert.deepStrictEqual(c.iaMissing(sh0()).map(e => e.id), ['juan', 'ana']);
});

test('drawShotFrame usa la imagen de IA solo con sh.ia y sin P.meta.iaOff; si no, la escena 3D de siempre', () => {
  const { c, calls, log, ctx } = make();
  c.FRAMES['s1~ia'] = 'data:image/webp;base64,IA';
  const sh = sh0({ ia: true });
  c.drawShotFrame(ctx, sh, 0, 480, 270);
  assert.deepStrictEqual(calls, ['s1~ia']); assert.deepStrictEqual(log, [], 'sin dibujar la escena 3D');
  c.P.meta.iaOff = true; calls.length = 0;
  c.drawShotFrame(ctx, sh, 0, 480, 270);
  assert.deepStrictEqual(log, ['3d'], 'con «3D» para todo el proyecto, los muñecos'); assert.deepStrictEqual(calls, []);
  delete c.P.meta.iaOff; log.length = 0;
  c.drawShotFrame(ctx, sh0(), 0, 480, 270);   // sin sh.ia
  assert.deepStrictEqual(log, ['3d']);
  log.length = 0; delete c.FRAMES['s1~ia'];
  c.drawShotFrame(ctx, sh, 0, 480, 270);      // con sh.ia pero sin imagen
  assert.deepStrictEqual(log, ['3d']);
});

test('alternar y generar no tocan la escena 3D del plano ni la imagen subida', () => {
  const { c } = make();
  const sh = sh0({ s3: { keys: [{ cam: { lens: 50 } }], objs: [{ id: 'a0' }] } });
  c.P.shots.s1 = sh; c.D.code.s1 = '3A'; c.FRAMES['s1'] = 'subida'; c.FRAMES['s1~ia'] = 'ia';
  const antes = JSON.stringify(sh.s3);
  c.iaShotToggle(sh); assert.strictEqual(sh.ia, true);
  c.iaShotToggle(sh); assert.strictEqual(sh.ia, undefined);
  c.iaAllSet(false); assert.strictEqual(c.P.meta.iaOff, true);
  c.iaShotToggle(sh); assert.strictEqual(sh.ia, undefined, 'con «3D» general, el plano no cambia');
  c.iaAllSet(true); assert.strictEqual(c.P.meta.iaOff, undefined);
  assert.strictEqual(JSON.stringify(sh.s3), antes); assert.strictEqual(c.FRAMES['s1'], 'subida');
  const use = ia.slice(ia.indexOf('async function iaShotUse'), ia.indexOf('/* alternar la imagen de IA'));
  assert.ok(!/sh\.s3|FRAMES\[sh\.id\]/.test(use), 'guardar la imagen de IA solo escribe <plano>~ia');
  assert.ok(/const k = sh\.id \+ '~ia'/.test(use));
});

test('«Usar en la viñeta» guarda <plano>~ia sin pasar la imagen anterior al historial (rehacer no la borra)', async () => {
  const notes = [], saved = [];
  const { c } = make({
    histNote: (...a) => notes.push(a), Store: { saveFrame: async (...a) => saved.push(a) }, frameDims: () => [64, 36],
    imgLoad: async () => ({ naturalWidth: 128, naturalHeight: 72 }), imgEncode: () => ({ url: 'data:image/webp;base64,NUEVA' }),
    document: { createElement: () => ({ getContext: () => ({ drawImage() { } }) }) }, problem() { }, flushSave: async () => { },
  });
  c.P.id = 'p1'; c.P.shots.s1 = sh0(); c.D.code.s1 = '1A'; c.FRAMES['s1~ia'] = 'data:image/webp;base64,VIEJA'; c.FRAMES.s1 = 'subida';
  await c.iaShotUse(c.P.shots.s1, 'data:image/png;base64,X');
  assert.strictEqual(notes.length, 1); assert.strictEqual(notes[0][1], null, 'sin imágenes «borradas» en el historial');
  assert.strictEqual(c.FRAMES['s1~ia'], 'data:image/webp;base64,NUEVA'); assert.strictEqual(c.P.shots.s1.ia, true);
  assert.deepStrictEqual(saved, [['p1', 's1~ia', 'data:image/webp;base64,NUEVA']]); assert.strictEqual(c.FRAMES.s1, 'subida');
});

test('escribir la descripción de la IA no rehace las miniaturas del personaje', () => {
  const { c } = make();
  c.P.elements = { juan: { look: { body: 'hombre' } } };
  const sh = sh0({ chars: ['juan'] });
  const k0 = c.looksKey(sh);
  c.P.elements.juan.look = { body: 'hombre', ai: { desc: 'otra', refs: ['ai~juan~0'] } };
  assert.strictEqual(c.looksKey(sh), k0);
  c.P.elements.juan.look.body = 'mujer';
  assert.notStrictEqual(c.looksKey(sh), k0, 'pero un cambio de cuerpo sí');
  assert.ok(/lookNoAi\(P\.elements\[o\.el\]\.look\)/.test(rend), 'la clave de sombras también');
});

test('un 409 del servidor (sin key guardada) llega a iaFail con su código', async () => {
  const { c } = make({ apiFetch: async () => ({ status: 409, json: { code: 'ia_nokey', error: 'Primero guarda tu key.' } }), imgEncode: () => ({ url: 'x' }), imgCanvas: async () => ({}) });
  await assert.rejects(() => c.iaRequest({ text: 'x', refs: [], aspect: '16:9' }), e => e.code === 'ia_nokey' && /key/.test(e.message));
});

test('solo en la versión con servidor: ia.js entra al armar el servidor y nada de IA se muestra en las otras', () => {
  const b = fs.readFileSync(R + '/build.sh', 'utf8');
  assert.ok(/elif \[ "\$TARGET" = server \]; then FILES="\$FILES share share-api cuenta planes ia"/.test(b));
  assert.ok(!/\bia\b/.test(b.split('if [ "$TARGET" = desktop ]; then FILES=')[1].split('elif')[0]), 'no en escritorio');
  const { c } = make({ TARGET: 'web' });
  assert.strictEqual(c.iaMenuHTML(sh0()), ''); assert.strictEqual(c.iaPillHTML(sh0()), ''); assert.strictEqual(c.iaSwitchHTML(), '');
});

test('la pastilla y el interruptor solo aparecen si hay imagen de IA; «3D» general los deja en 3D', () => {
  const { c } = make();
  const sh = sh0(); c.P.shots.s1 = sh;
  assert.ok(/data-v2iagen="s1"/.test(c.iaPillHTML(sh)), 'sin imagen: el botón para generarla'); assert.strictEqual(c.iaSwitchHTML(), '');
  c.FRAMES['s1~ia'] = 'ia'; sh.ia = true;
  assert.ok(/class="v2-ia on"[^>]*>Ver 3D</.test(c.iaPillHTML(sh))); assert.ok(/data-v2iaall="1" aria-pressed="true"/.test(c.iaSwitchHTML()));
  c.P.meta.iaOff = true;
  assert.ok(/class="v2-ia"[^>]*>Ver IA</.test(c.iaPillHTML(sh))); assert.ok(/data-v2iaall="0" aria-pressed="true"/.test(c.iaSwitchHTML()));
  assert.ok(/data-m="iagen"/.test(c.iaMenuHTML(sh)) && /data-m="iatog"/.test(c.iaMenuHTML(sh)) && /data-m="iadel"/.test(c.iaMenuHTML(sh)));
});

q.then(() => process.exit(fail ? 1 : 0));
