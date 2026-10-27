/* Lote AA · el zoom de las fotos de las capas del editor 2D (d2ZoomOf, d2PanOf, d2ImgLayer y d2ZoomSig en
   s2d-editor.js): no toca la foto guardada, se aplica al dibujarla.  node test/zoom-aa.test.js */
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const s = fs.readFileSync(R + '/src/s2d-editor.js', 'utf8');
const a = s.indexOf('const d2ZoomOf'), b = s.indexOf('\n', s.indexOf('const d2ZoomSig'));
assert(a > 0 && b > a, 'no se encontró el zoom en s2d-editor.js');

const c = { Math, JSON, clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)) };
vm.createContext(c);
vm.runInContext(s.slice(a, b + 1).replace(/^const /gm, 'var '), c);
// un contexto de dibujo de mentira: anota dónde se dibuja la foto
const ctx = () => { const calls = []; return { calls, save() { }, restore() { }, drawImage(im, x, y, w, h) { calls.push([x, y, w, h]); } }; };

test('sin zoom (o en una capa de dibujo), la foto ocupa el cuadro como antes', () => {
  const g = ctx(); c.d2ImgLayer(g, {}, { kind: 'image' }, 1280, 720); assert.deepStrictEqual(g.calls, [[0, 0, 1280, 720]]);
  const g2 = ctx(); c.d2ImgLayer(g2, {}, { kind: 'draw', zoom: 3 }, 1280, 720); assert.deepStrictEqual(g2.calls, [[0, 0, 1280, 720]]);
});
test('al 200 %, el doble de grande alrededor del centro del cuadro', () => {
  const g = ctx(); c.d2ImgLayer(g, {}, { kind: 'image', zoom: 2 }, 1280, 720);
  assert.deepStrictEqual(g.calls, [[-640, -360, 2560, 1440]]);
});
test('el encuadre se corre, pero la foto siempre cubre el cuadro', () => {
  const g = ctx(); c.d2ImgLayer(g, {}, { kind: 'image', zoom: 2, zx: .25, zy: -.25 }, 1280, 720);
  assert.deepStrictEqual(g.calls, [[-320, -540, 2560, 1440]]);
  const g2 = ctx(); c.d2ImgLayer(g2, {}, { kind: 'image', zoom: 2, zx: 9, zy: -9 }, 1280, 720);
  const [x, y, w, h] = g2.calls[0];
  assert(x <= 0 && y <= 0 && x + w >= 1280 && y + h >= 720, 'la foto deja ver el papel');
});
test('el zoom va de 100 % a 400 %', () => {
  assert.strictEqual(c.d2ZoomOf({ kind: 'image', zoom: 9 }), 4);
  assert.strictEqual(c.d2ZoomOf({ kind: 'image', zoom: .3 }), 1);
  assert.strictEqual(c.d2ZoomOf({ kind: 'image' }), 1);
});
test('la viñeta guardada en el navegador cambia con el zoom, y las capas sin zoom no cambian su firma', () => {
  assert.deepStrictEqual(Array.from(c.d2ZoomSig({ kind: 'image' })), []);
  assert.deepStrictEqual(Array.from(c.d2ZoomSig({ kind: 'image', zoom: 1.5, zx: .1 })), [1.5, .1, 0]);
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
