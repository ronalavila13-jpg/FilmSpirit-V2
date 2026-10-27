/* Lote AD · dibujo (editor 2D, s2d-editor.js): el bote de pintura (d2Fill, con d2Grow y d2Flood), el contorno de la
   selección del lazo de varias partes (d2Outline, d2Simplify), la herramienta en la barra, las flechas nuevas sin
   contorno y «Agregar imagen» a la vista.  node test/dibujo-ad.test.js */
const vm = require('vm'), assert = require('assert');
const { pieza, leer } = require('./utiles/fuente.js');
let fail = 0;
const test = (n, f) => { try { f(); console.log('ok  ', n); } catch (e) { fail++; console.log('FALLA', n, '\n  ', e.message); } };
const src = leer('s2d-editor.js');

const c = { Math, JSON, Uint8Array, Uint8ClampedArray, Map, Array };
vm.createContext(c);
vm.runInContext(['function d2Grow(', 'function d2Flood(', 'function d2Fill(', 'function d2Outline(', 'function d2Simplify('].map(f => pieza('s2d-editor.js', f)).join('') + pieza('s2d-editor.js', 'const D2_TOOLS = ', '];\n') + pieza('s2d-editor.js', 'const D2_DEF = ', '};\n'), c);

/* una hoja de W×H: líneas negras (RGBA) donde f(x, y) */
const W = 60, H = 40;
const hoja = f => { const px = new Uint8ClampedArray(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (f(x, y)) { const j = (y * W + x) * 4; px[j] = px[j + 1] = px[j + 2] = 20; px[j + 3] = 255; } return px; };
const marco = (x0, y0, x1, y1, gap) => (x, y) => ((x === x0 || x === x1) && y >= y0 && y <= y1) || ((y === y0 || y === y1) && x >= x0 && x <= x1 && !(gap && y === y0 && x >= gap[0] && x <= gap[1]));
const capa = () => new Uint8ClampedArray(W * H * 4);
const a = (px, x, y) => px[(y * W + x) * 4 + 3];
const rgb = (px, x, y) => Array.from(px.slice((y * W + x) * 4, (y * W + x) * 4 + 3));
const fill = o => c.d2Fill({ W, H, below: null, allow: null, tol: .2, gap: 0, rgb: [200, 56, 44], ...o });

test('d2Grow crece en cuadrado r píxeles; con r = 0 es una copia', () => {
  const m = new Uint8Array(W * H); m[20 * W + 30] = 1;
  const g = c.d2Grow(m, W, H, 2);
  assert.strictEqual(g.reduce((s, v) => s + v, 0), 25);
  assert(g[18 * W + 28] && g[22 * W + 32] && !g[17 * W + 30] && !g[20 * W + 33]);
  const g0 = c.d2Grow(m, W, H, 0); assert(g0 !== m && g0[20 * W + 30] === 1);
});
test('d2Flood no pasa por una línea en diagonal de un píxel', () => {
  const blk = new Uint8Array(W * H); for (let i = 0; i < H; i++) blk[i * W + i] = 1;
  const r = c.d2Flood(blk, W, H, 5 * W + 30);
  assert(r[5 * W + 30] && r[0 * W + 59] && !r[30 * W + 5] && !r[39 * W + 0]);
});
test('el bote rellena la zona cerrada y no lo de afuera', () => {
  const line = hoja(marco(10, 10, 40, 30)), dst = capa();
  const bb = fill({ line, dst, x: 20, y: 20 });
  assert(bb, 'algo se pinta');
  assert.strictEqual(a(dst, 20, 20), 255); assert.deepStrictEqual(rgb(dst, 20, 20), [200, 56, 44]);
  assert.strictEqual(a(dst, 5, 5), 0, 'afuera no'); assert.strictEqual(a(dst, 45, 20), 0);
  assert.strictEqual(a(dst, 11, 20), 255, 'hasta la línea'); assert.strictEqual(a(dst, 9, 20), 0, 'del otro lado no');
  assert.deepStrictEqual(Array.from(bb), [11, 11, 40, 30]);
});
test('entra 2 px bajo una línea gruesa (sin filo blanco), y no asoma del otro lado de una fina', () => {
  // gruesa: 4 px (x 8 a 11) con su borde suave adentro (x 12, a medias)
  const grueso = hoja((x, y) => (x >= 8 && x <= 11) || x >= 50 || y <= 2 || y >= 37);
  for (let y = 3; y < 37; y++) grueso[(y * W + 12) * 4 + 3] = 128;
  const d1 = capa(); fill({ line: grueso, dst: d1, x: 30, y: 20 });
  assert.strictEqual(a(d1, 12, 20), 255, 'bajo el borde suave'); assert.strictEqual(a(d1, 11, 20), 255, 'bajo la línea'); assert.strictEqual(a(d1, 10, 20), 0, 'no más de 2 px');
  // fina: 2 px a medias (x 10 y 11): el de afuera queda sin pintar
  const fino = hoja((x, y) => x >= 50 || y <= 2 || y >= 37);
  for (let y = 0; y < H; y++) for (const x of [10, 11]) fino[(y * W + x) * 4 + 3] = 128;
  const d2 = capa(); fill({ line: fino, dst: d2, x: 30, y: 20 });
  assert.strictEqual(a(d2, 11, 20), 255, 'bajo la línea'); assert.strictEqual(a(d2, 10, 20), 0, 'no asoma del otro lado');
});
test('con una abertura, sin «Cerrar huecos» se escapa; con él, no', () => {
  const line = hoja(marco(10, 10, 40, 30, [24, 26]));
  const d1 = capa(); fill({ line, dst: d1, x: 20, y: 20 }); assert.strictEqual(a(d1, 2, 2), 255, 'se escapó');
  const d2 = capa(); fill({ line, dst: d2, x: 20, y: 20, gap: 4 });
  assert.strictEqual(a(d2, 2, 2), 0, 'no se escapó'); assert.strictEqual(a(d2, 20, 20), 255);
  assert.strictEqual(a(d2, 11, 11), 255, 'llega hasta la línea, también en las esquinas');
  // una zona más angosta que lo que se cierra: igual se rellena (sin cerrar huecos)
  const d3 = capa(), l3 = hoja(marco(10, 10, 13, 30)); fill({ line: l3, dst: d3, x: 11, y: 20, gap: 10 }); assert.strictEqual(a(d3, 12, 20), 255);
});
test('con una selección, solo dentro de ella; un toque fuera no pinta', () => {
  const line = hoja(marco(10, 10, 40, 30)), allow = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < 25; x++) allow[y * W + x] = 1;
  const dst = capa(); fill({ line, dst, x: 20, y: 20, allow });
  assert.strictEqual(a(dst, 20, 20), 255); assert.strictEqual(a(dst, 30, 20), 0);
  assert.strictEqual(fill({ line, dst: capa(), x: 30, y: 20, allow }), null);
});
test('en la misma capa de la línea, el relleno va detrás de ella', () => {
  const line = hoja(marco(10, 10, 40, 30)), dst = line.slice();
  fill({ line, dst, x: 20, y: 20 });
  assert.deepStrictEqual(rgb(dst, 10, 20), [20, 20, 20], 'la línea sigue encima'); assert.deepStrictEqual(rgb(dst, 20, 20), [200, 56, 44]);
});
test('si la línea es de una capa de debajo, el relleno no la tapa', () => {
  const line = hoja(marco(10, 10, 40, 30)), dst = capa();
  const l2 = line.slice(); for (let y = 11; y < 30; y++) l2[(y * W + 11) * 4 + 3] = 100;   // con su borde suave
  fill({ line: l2, dst, below: l2, x: 20, y: 20 });
  assert.strictEqual(a(dst, 10, 20), 0, 'la línea de debajo se sigue viendo'); assert.strictEqual(a(dst, 11, 20), 155, 'su borde suave, a medias'); assert.strictEqual(a(dst, 12, 20), 255);
});
test('cambiar el color de un relleno: toma también su borde bajo la línea', () => {
  const line = hoja(marco(10, 10, 40, 30)), dst = capa();
  fill({ line, dst, x: 20, y: 20 });
  const l2 = line.slice(); for (let i = 0; i < W * H * 4; i += 4) if (dst[i + 3] && !l2[i + 3]) { l2[i] = 200; l2[i + 1] = 56; l2[i + 2] = 44; l2[i + 3] = 255; }
  fill({ line: l2, dst, x: 20, y: 20, rgb: [46, 143, 191] });
  assert.deepStrictEqual(rgb(dst, 20, 20), [46, 143, 191]); assert.deepStrictEqual(rgb(dst, 11, 20), [46, 143, 191], 'sin rastro del color de antes');
  assert.strictEqual(a(dst, 9, 20), 0, 'no crece hacia afuera');
});
test('al cambiar el color, tampoco asoma del otro lado de una línea fina', () => {
  const fino = hoja((x, y) => x >= 50 || y <= 2 || y >= 37);
  for (let y = 0; y < H; y++) for (const x of [10, 11]) fino[(y * W + x) * 4 + 3] = 128;
  const dst = capa(); fill({ line: fino, dst, x: 30, y: 20 });
  const l2 = fino.slice(); for (let i = 0; i < W * H * 4; i += 4) if (dst[i + 3] && !l2[i + 3]) { l2[i] = 200; l2[i + 1] = 56; l2[i + 2] = 44; l2[i + 3] = 255; }
  fill({ line: l2, dst, x: 30, y: 20, rgb: [46, 143, 191] });
  assert.deepStrictEqual(rgb(dst, 30, 20), [46, 143, 191]); assert.strictEqual(a(dst, 10, 20), 0, 'no asoma'); assert.strictEqual(a(dst, 5, 20), 0);
});
test('la tolerancia toma los colores parecidos', () => {
  const line = capa(); for (let i = 0; i < W * H * 4; i += 4) { const x = (i / 4) % W; line[i] = x < 30 ? 100 : 130; line[i + 1] = line[i + 2] = 100; line[i + 3] = 255; }
  const d1 = capa(); fill({ line, dst: d1, x: 5, y: 5, tol: .05 }); assert.strictEqual(a(d1, 40, 5), 0);
  const d2 = capa(); fill({ line, dst: d2, x: 5, y: 5, tol: .2 }); assert.strictEqual(a(d2, 40, 5), 255);
});
test('el contorno de una selección de varias partes y con un hueco', () => {
  const m = new Uint8Array(W * H);
  for (let y = 5; y < 25; y++) for (let x = 5; x < 25; x++) if (!(x >= 10 && x < 15 && y >= 10 && y < 15)) m[y * W + x] = 1;
  for (let y = 30; y < 35; y++) for (let x = 40; x < 55; x++) m[y * W + x] = 1;
  const loops = c.d2Outline(m, W, H);
  assert.strictEqual(loops.length, 3, 'dos partes y un hueco');
  assert(loops.every(l => l.length >= 4 && l.length <= 8), 'sin los puntos que sobran: ' + loops.map(l => l.length));
  const xs = loops.flat().map(p => p[0]); assert(Math.min(...xs) >= 5 && Math.max(...xs) <= 55);
});
test('el contorno de una diagonal queda recto (pocos puntos)', () => {
  const m = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x <= y; x++) m[y * W + x] = 1;
  const [l] = c.d2Outline(m, W, H); assert(l.length <= 6, l.length);
});
test('el bote en la barra: entre el borrador y el lazo, con la tecla F; teclas sin repetir', () => {
  const ks = c.D2_TOOLS.map(t => t[0]);
  assert.strictEqual(ks.indexOf('fill'), ks.indexOf('eraser') + 1); assert.strictEqual(ks.indexOf('lasso'), ks.indexOf('fill') + 1);
  assert.strictEqual(c.D2_TOOLS.find(t => t[0] === 'fill')[2], 'F');
  const keys = c.D2_TOOLS.map(t => t[2]); assert.strictEqual(new Set(keys).size, keys.length);
  assert(c.D2_DEF.fill && c.D2_DEF.fill.own === false && c.D2_DEF.fill.gap > 0);
  assert(/fill: '<path/.test(src), 'su ícono');
});
test('cada flecha nueva sale sin contorno (aunque la anterior lo tuviera)', () => {
  assert(/type: 'arrow', p0: p, p1: \{ \.\.\.p \}, h1: \{ \.\.\.p \}, h2: \{ \.\.\.p \}, w: A\.w, head: A\.head, tail: A\.tail, outline: 'none'/.test(src));
  assert(/\(one \? `<div class="fld"><span>Contorno<\/span>/.test(src), 'el contorno se elige en cada flecha');
  assert(/arrowCtl\(o, true\)/.test(src));
});
test('«Agregar imagen» a la vista, con la línea de cómo más se agrega', () => {
  assert(/<button class="btn s2-addimg" data-a="ly-img"[^>]*>.*Agregar imagen<\/button>/.test(src));
  assert(/También puedes arrastrarla a la hoja o pegarla con Ctrl\+V/.test(src));
  assert(!/class="icbtn" data-a="ly-img"/.test(src), 'el ícono chico ya no está');
});
test('el lazo: Ctrl resta, Ctrl + clic muestra la caja, un clic fuera quita, Esc termina la caja', () => {
  assert(/sub: ctrl \|\| E\.lmode === 'sub'/.test(src));
  assert(/else if \(dr\.ctrl\) \{ if \(selHas\(path\[0\]\)\) floatFromSel\(\);/.test(src));
  assert(/else if \(!selHas\(path\[0\]\)\) clearSel\(\);/.test(src));
  assert(/else if \(k === 'Escape'\) \{ closePop\(\); if \(E\.float\) applyFloat\(\);/.test(src));
  assert(/segH\('l-mode', \[\['add', 'Sumar'\], \['sub', 'Restar'\]\], E\.lmode\)/.test(src) && /data-a="sel-exp"/.test(src));
});

console.log(fail ? `\n${fail} prueba(s) fallaron` : '\nTodo bien');
process.exit(fail ? 1 : 0);
