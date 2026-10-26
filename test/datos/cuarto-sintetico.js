/* lote W · para test/escenarios-w.test.js: un cuarto armado con cajas, como lo exporta SketchUp (sin el archivo) */
// un cuarto sintético de 6 × 4 m (triángulos de cajas): muros de 15 cm y 2,7 m; puerta de 0,9 m en el muro sur; ventana
// de 1,2 m (antepecho 0,9 m, dintel 2,1 m) en el muro norte; columna de 30 × 30 cm; mostrador de 2 × 0,6 × 1 m; piso
function box(P, I, x0, y0, z0, x1, y1, z1, flip) {
  const n = P.length / 3, v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  for (const p of v) P.push(...p);
  const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]];
  for (const [a, b, c] of f) flip ? I.push(n + a, n + c, n + b) : I.push(n + a, n + b, n + c);
}
function room(opt = {}) {
  const P = [], I = [], H = 2.7, t = .15, W = 3, D = 2;   // de -3 a 3 en x, de -2 a 2 en z
  // muro norte (z = -2) con ventana de x = -.6 a .6
  box(P, I, -W - t / 2, 0, -D - t / 2, -.6, H, -D + t / 2); box(P, I, .6, 0, -D - t / 2, W + t / 2, H, -D + t / 2);
  box(P, I, -.6, 0, -D - t / 2, .6, .9, -D + t / 2); box(P, I, -.6, 2.1, -D - t / 2, .6, H, -D + t / 2);
  // muro sur (z = 2) con puerta de x = 1 a 1.9
  box(P, I, -W - t / 2, 0, D - t / 2, 1, H, D + t / 2); box(P, I, 1.9, 0, D - t / 2, W + t / 2, H, D + t / 2);
  box(P, I, 1, 2.1, D - t / 2, 1.9, H, D + t / 2);
  // muros oeste y este
  box(P, I, -W - t / 2, 0, -D + t / 2, -W + t / 2, H, D - t / 2, opt.flip); box(P, I, W - t / 2, 0, -D + t / 2, W + t / 2, H, D - t / 2);
  // columna y mostrador
  box(P, I, 1.5, 0, -.65, 1.8, H, -.35); box(P, I, -2.6, 0, .6, -.6, 1, 1.2);
  // piso (una caja delgada debajo de 0)
  box(P, I, -W, -.02, -D, W, 0, D);
  return { p: new Float32Array(P), i: new Uint32Array(I) };
}
module.exports = { box, room };
