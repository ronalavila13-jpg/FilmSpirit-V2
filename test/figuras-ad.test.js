/* Lote AD · figuras: los peinados por tipo de cuerpo (S3_PELO, peloFits), el pelo aplastado bajo la gorra
   (peloHatSquash), la pieza de la cabeza que lleva (vestHatOf) y la ropa dibujada que se acomoda a otro cuerpo
   (accFitStamp, accPiece1, accFitMap).  node test/figuras-ad.test.js */
const vm = require('vm'), assert = require('assert');
const { pieza, leer } = require('./utiles/fuente.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const c = { Math, JSON, WeakMap, Map, Float32Array, clamp };
vm.createContext(c);
vm.runInContext(pieza('s3d-model.js', 'const S3_PELO', '];\n') + pieza('s3d-model.js', 'const S3_PELO_FOR') + pieza('s3d-model.js', 'const peloFits'), c);

test('33 peinados: los 14 de antes y los 19 nuevos, cada uno armado en el catálogo', () => {
  const keys = c.S3_PELO.map(r => r[0]);
  assert.strictEqual(keys.length, 33);
  assert.strictEqual(new Set(keys).size, 33, 'una clave repetida («afro» o «moño alto» van una sola vez)');
  for (const k of ['ninguno', 'rapado', 'corto', 'despeinado', 'raya', 'flequillo', 'entradas', 'calvicie', 'melena', 'ondas', 'larga', 'cola', 'coletas', 'recogido']) assert(keys.includes(k), 'falta ' + k);
  const src = leer('s3d-pelo.js');
  for (const k of keys) if (k !== 'ninguno') assert(src.includes(`case '${k}'`), `«${k}» no se arma en peloBuild0`);
  for (const [k, , t] of c.S3_PELO) assert(t && /^[hmoani]+$/.test(t), `«${k}»: marcas raras «${t}»`);
});
test('cada peinado le va a los cuerpos pedidos', () => {
  const fits = (k, b) => c.peloFits(k, b);
  for (const k of ['tupe', 'atras', 'cresta', 'rizado', 'afro', 'rastas', 'mono_alto']) assert(fits(k, 'hombre'), k + ' / hombre');
  for (const k of ['bob', 'pixie', 'trenza', 'media_cola', 'rizos', 'mono_alto', 'afro']) assert(fits(k, 'mujer'), k + ' / mujer');
  for (const b of ['nino', 'nina']) for (const k of ['tazon', 'puntas', 'chongitos', 'trenzas']) assert(fits(k, b), k + ' / ' + b);
  for (const b of ['anciano', 'anciana']) for (const k of ['canas', 'rulos', 'mono_bajo']) assert(fits(k, b), k + ' / ' + b);
  // a la mujer no le salen «Entradas» ni «Calvicie»; al niño, ni «Entradas» ni «Moño»
  for (const k of ['entradas', 'calvicie']) assert(!fits(k, 'mujer'), k + ' / mujer');
  for (const k of ['entradas', 'recogido']) assert(!fits(k, 'nino'), k + ' / niño');
  // el extra: los de hombre y los de mujer; y todos los cuerpos tienen de dónde elegir
  assert(fits('larga', 'extra') && fits('entradas', 'extra') && !fits('tazon', 'extra'));
  for (const b of ['hombre', 'mujer', 'anciano', 'anciana', 'nino', 'nina', 'extra']) assert(c.S3_PELO.filter(r => fits(r[0], b)).length >= 8, b);
  assert(!fits('nada', 'hombre'));
});

// pelo bajo la gorra: una cabeza de mentira, esfera de 10 cm; el borde a 10° de elevación
vm.runInContext(pieza('s3d-pelo.js', 'const peloDeg') + pieza('s3d-pelo.js', 'function peloHatSquash('), Object.assign(c, { peloR: () => .1 }));
test('bajo la gorra el pelo de arriba se aplasta dentro de la copa y el de abajo asoma', () => {
  const H = { C: [0, 0, 0] }, F = { gap: .01, line: () => 10 };
  const P = [0, .14, 0,  .14, .03, 0,  0, -.3, -.1,  0, .105, 0];   // coronilla con volumen, sien sobre el borde, pelo largo, pelo pegado
  c.peloHatSquash(H, { P }, F);
  const r = i => Math.hypot(P[i], P[i + 1], P[i + 2]);
  assert(Math.abs(r(0) - (.1 + .01 - .0035)) < 1e-6, 'la coronilla queda dentro de la copa');
  assert(Math.abs(r(3) - (.1 + .01 - .0035)) < 1e-6, 'sobre el borde también');
  assert.deepStrictEqual(P.slice(6, 9), [0, -.3, -.1], 'el pelo largo no cambia');
  assert.deepStrictEqual(P.slice(9, 12), [0, .105, 0], 'lo que ya estaba adentro no cambia');
  const e = 8 * Math.PI / 180, Q = [.15 * Math.cos(e), .15 * Math.sin(e), 0]; c.peloHatSquash(H, { P: Q }, F);   // apenas debajo del borde: se abre de a poco
  assert(Math.hypot(...Q) > .1066 && Math.hypot(...Q) < .12, String(Math.hypot(...Q)));
});

vm.runInContext('var VEST_HAT = { gorra: 1, gorro: 1, sombrero: 1, casco: 1, casco_mil: 1 }; var ACC_PARTS = { cabeza: 1, cuerpo: 1 };' + pieza('s3d-vestuario.js', 'const vestHatOf'), c);
test('la pieza de la cabeza que lleva puesta (ni los lentes ni lo oculto)', () => {
  assert.strictEqual(c.vestHatOf({ acc: [{ preset: 'polo', part: 'cuerpo' }, { preset: 'gorra', part: 'cabeza' }] }), 'gorra');
  assert.strictEqual(c.vestHatOf({ acc: [{ preset: 'lentes', part: 'cabeza' }] }), null);
  assert.strictEqual(c.vestHatOf({ acc: [{ preset: 'casco', part: 'cabeza', hide: true }] }), null);
  assert.strictEqual(c.vestHatOf({}), null);
});

vm.runInContext(pieza('s3d-accesorios.js', 'const accFitStamp') + pieza('s3d-accesorios.js', 'function accPiece1(') + pieza('s3d-accesorios.js', 'function accSegDist(') + pieza('s3d-vestuario.js', 'function vestChainT(') + pieza('s3d-accesorios.js', 'const ACC_FITM') + pieza('s3d-accesorios.js', 'function accFitMap('), c);
test('al cambiar el cuerpo, la ropa dibujada «de antes» queda con el cuerpo de antes', () => {
  const L = [{ id: 'a', kind: 'ropa' }, { id: 'b', preset: 'polo' }, { id: 'c', kind: 'ropa', fit: { b: 'mujer' } }, null];
  const out = c.accFitStamp(L, 'hombre');
  assert.strictEqual(JSON.stringify(out[0]), JSON.stringify({ id: 'a', kind: 'ropa', fit: { b: 'hombre' } }));
  assert.strictEqual(out[1], L[1], 'las prendas listas no se tocan');
  assert.strictEqual(out[2], L[2], 'la que ya sabía su cuerpo no cambia');
  assert.strictEqual(out[3], null);
  assert.strictEqual(L[0].fit, undefined, 'no cambia la lista de antes (deshacer)');
  assert.strictEqual(c.accFitStamp(undefined, 'hombre').length, 0);
});
test('interpolación por tramos (y fuera de la tabla, el tramo de la punta)', () => {
  const X = [0, 1, 3], Y = [0, 2, 3];
  assert.strictEqual(c.accPiece1(X, Y, .5), 1); assert.strictEqual(c.accPiece1(X, Y, 2), 2.5);
  assert.strictEqual(c.accPiece1(X, Y, -1), -2); assert.strictEqual(c.accPiece1(X, Y, 5), 4);
});
// dos cuerpos de mentira: el niño es el adulto a 0,7 (más bajo y más angosto): cada punto del niño cae en el mismo
// lugar del adulto, en el tronco, la cabeza, los brazos y las piernas
test('el punto equivalente en el cuerpo del dibujo, por referencias del cuerpo', () => {
  const NB = 240, mk = k => {
    const WX = new Float32Array(NB), Z0 = new Float32Array(NB), Z1 = new Float32Array(NB);
    for (let b = 0; b < NB; b++) { const y = b / 100 / k; WX[b] = (.12 + .05 * Math.sin(y * 3)) * k; Z0[b] = (-.1 + .01 * y) * k; Z1[b] = (.12 + .02 * y) * k; }
    const s = v => v.map(q => q * k), ch = (a, b, d) => [s(a), s(b), s(d), s([d[0] + .05, d[1] - .05, d[2]])];
    const CH = { arm_l: ch([.2, 1.4, 0], [.35, 1.15, 0], [.45, .9, .02]), arm_r: ch([-.2, 1.4, 0], [-.35, 1.15, 0], [-.45, .9, .02]), leg_l: ch([.1, .95, 0], [.11, .5, .01], [.12, .08, -.02]), leg_r: ch([-.1, .95, 0], [-.11, .5, .01], [-.12, .08, -.02]) };
    const RS = {}; for (const q in CH) RS[q] = [.05 * k, .04 * k, .03 * k];
    return { __land: { V: s([.08, .5, .95, 1.05, 1.3, 1.45, 1.52, 1.62, 1.72]), WX, Z0, Z1, CH, RS } };
  };
  c.accLand = tp => tp.__land;
  const A = mk(1), N = mk(.7), f = c.accFitMap(A, N);
  for (const [p, w] of [[[.05, 1.2, .08], [1, 0, 0, 0]], [[.03, 1.6, .1], [0, 0, 0, 1]], [[.4, 1.0, .03], [0, 1, 0, 0]], [[-.13, .3, .04], [0, 0, 1, 0]], [[.27, 1.33, .02], [.5, .5, 0, 0]]]) {
    const q = f(p[0] * .7, p[1] * .7, p[2] * .7, w);
    for (let j = 0; j < 3; j++) assert(Math.abs(q[j] - p[j]) < 2e-3, `${JSON.stringify(p)} → ${JSON.stringify(q)}`);
  }
  assert.strictEqual(c.accFitMap(A, N), f, 'se guarda (no se recalcula en cada prenda)');
});

vm.runInContext(pieza('s3d-pelo.js', 'const PELO_CANAS') + pieza('s3d-pelo.js', 'const peloColorOf'), c);
test('«Canas hacia atrás» es canoso salvo que se elija otro color', () => {
  assert.strictEqual(c.peloColorOf({ pelo: 'canas' }), c.PELO_CANAS);
  assert.strictEqual(c.peloColorOf({ pelo: 'canas', peloColor: '#2A2523' }), '#2A2523');
  assert.strictEqual(c.peloColorOf({ pelo: 'corto' }), '');
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
