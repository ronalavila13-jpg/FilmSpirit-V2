/* ============================================================
   RÉPLICA DE UN ESCENARIO IMPORTADO · lote W
   Arma un escenario del constructor (escenarios-construidos.js) a partir de los triángulos de un modelo importado:
   corta el modelo con planos horizontales (como la planta a 1,5 m) y lee lo cortado en una cuadrícula de 2 a 10 cm.
     · muros: lo cortado a 1,5 m que corre largo en una dirección (de punta a punta, con su grosor)
     · huecos: los espacios entre tramos de un mismo muro; si a 0,5 m ahí hay muro, es una ventana (tiene antepecho)
     · piso: el contorno de las caras horizontales del nivel del piso
     · volúmenes: lo que queda cortado más abajo (mostradores, tarimas) o lo alto y compacto (columnas), como cajas
   El corte no depende de hacia dónde miran las caras (en SketchUp suelen venir al revés): entre dos cruces seguidos
   de una fila de la cuadrícula a menos de 50 cm hay un muro. Sirve para interiores de muros rectos.
   Todo aquí es cálculo (sin dibujar): T = { p: Float32Array [x, y, z, …] en metros de la escena (el piso en y = 0 y el
   punto de la acción en x = z = 0), i: índices de los triángulos }
   ============================================================ */
const RP_CUT = { wall: 1.5, low: .5, mid: 1, top: 2, plat: .12 };
const RP_MAXT = .5;      // un muro es más delgado que esto (más grueso, una columna o un volumen)
/* la cuadrícula que cubre lo que hay alrededor del piso (con medio metro de aire) */
function rpGrid(T, opt = {}) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  const p = T.p;
  for (let i = 0; i < p.length; i += 3) { if (p[i + 1] > 3.2 || p[i + 1] < -.3) continue; const x = p[i], z = p[i + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  if (!isFinite(x0)) return null;
  const pad = .5, W = x1 - x0 + 2 * pad, H = z1 - z0 + 2 * pad;
  const k = Math.min(.1, Math.max(opt.k || .02, Math.max(W, H) / (opt.px || 900)));
  if (W / k * (H / k) > 4e6) return { big: true };   // más de unos 200 × 200 m: no es un interior
  return { x0: x0 - pad, z0: z0 - pad, k, w: Math.max(4, Math.ceil(W / k)), h: Math.max(4, Math.ceil(H / k)) };
}
/* el corte a la altura c: una máscara (1 = cortado). fill: lo más grueso que se rellena (los muros, RP_MAXT; para los
   volúmenes bajos, más: un mostrador tiene 60 cm de fondo) */
function rpSection(T, G, c, fill = RP_MAXT) {
  const { x0, z0, k, w, h } = G, p = T.p, I = T.i, M = new Uint8Array(w * h);
  const rows = Array.from({ length: h }, () => []), cols = Array.from({ length: w }, () => []);
  const maxT = fill / k;
  const seg = (ax, az, bx, bz) => {
    const u1 = (ax - x0) / k, v1 = (az - z0) / k, u2 = (bx - x0) / k, v2 = (bz - z0) / k;
    // la línea del corte (las caras sueltas, sin grosor, también cuentan)
    const n = Math.ceil(Math.max(Math.abs(u2 - u1), Math.abs(v2 - v1))) + 1;
    for (let s = 0; s <= n; s++) { const u = Math.floor(u1 + (u2 - u1) * s / n), v = Math.floor(v1 + (v2 - v1) * s / n); if (u >= 0 && v >= 0 && u < w && v < h) M[v * w + u] = 1; }
    // dónde cruza cada fila y cada columna (por el centro de la celda; medio abierto: un vértice compartido cuenta una vez)
    if (v1 !== v2) { const a = Math.min(v1, v2), b = Math.max(v1, v2); for (let r = Math.max(0, Math.ceil(a - .5)); r < h && r + .5 < b; r++) { const t = (r + .5 - v1) / (v2 - v1); rows[r].push(u1 + (u2 - u1) * t); } }
    if (u1 !== u2) { const a = Math.min(u1, u2), b = Math.max(u1, u2); for (let q = Math.max(0, Math.ceil(a - .5)); q < w && q + .5 < b; q++) { const t = (q + .5 - u1) / (u2 - u1); cols[q].push(v1 + (v2 - v1) * t); } }
  };
  for (let t = 0; t < I.length; t += 3) {
    const A = I[t] * 3, B = I[t + 1] * 3, C = I[t + 2] * 3;
    const ya = p[A + 1] - c, yb = p[B + 1] - c, yc = p[C + 1] - c;
    const sa = ya >= 0, sb = yb >= 0, sc = yc >= 0;
    if (sa === sb && sb === sc) continue;
    const pts = [];
    const cut = (P, Q, yp, yq) => { const f = yp / (yp - yq); pts.push(p[P] + (p[Q] - p[P]) * f, p[P + 2] + (p[Q + 2] - p[P + 2]) * f); };
    if (sa !== sb) cut(A, B, ya, yb);
    if (sb !== sc) cut(B, C, yb, yc);
    if (sc !== sa) cut(C, A, yc, ya);
    if (pts.length === 4) seg(pts[0], pts[1], pts[2], pts[3]);
  }
  // por fila y por columna, de a pares (entra y sale de un sólido): si está a menos de RP_MAXT, es el grosor de un muro
  rows.forEach((L, r) => { L.sort((a, b) => a - b); for (let j = 0; j + 1 < L.length; j += 2) if (L[j + 1] - L[j] <= maxT) for (let u = Math.max(0, Math.floor(L[j])); u <= Math.min(w - 1, Math.floor(L[j + 1])); u++) M[r * w + u] = 1; });
  cols.forEach((L, q) => { L.sort((a, b) => a - b); for (let j = 0; j + 1 < L.length; j += 2) if (L[j + 1] - L[j] <= maxT) for (let v = Math.max(0, Math.floor(L[j])); v <= Math.min(h - 1, Math.floor(L[j + 1])); v++) M[v * w + q] = 1; });
  rpFillHoles(M, w, h, Math.round(1 / (k * k)));   // el interior de una columna gruesa (hasta 1 m²)
  return M;
}
/* componentes conexos (4 vecinos): { lab, list: [{ n, x0, y0, x1, y1, px }] } */
function rpLabel(M, w, h, keepPx) {
  const lab = new Int32Array(w * h), list = [], st = [];
  for (let i = 0; i < M.length; i++) {
    if (!M[i] || lab[i]) continue;
    const C = { n: 0, x0: w, y0: h, x1: 0, y1: 0, px: keepPx ? [] : null }; list.push(C);
    lab[i] = list.length; st.push(i);
    while (st.length) {
      const q = st.pop(), x = q % w, y = (q - x) / w;
      C.n++; if (C.px) C.px.push(q);
      if (x < C.x0) C.x0 = x; if (x > C.x1) C.x1 = x; if (y < C.y0) C.y0 = y; if (y > C.y1) C.y1 = y;
      if (x > 0 && M[q - 1] && !lab[q - 1]) { lab[q - 1] = list.length; st.push(q - 1); }
      if (x < w - 1 && M[q + 1] && !lab[q + 1]) { lab[q + 1] = list.length; st.push(q + 1); }
      if (y > 0 && M[q - w] && !lab[q - w]) { lab[q - w] = list.length; st.push(q - w); }
      if (y < h - 1 && M[q + w] && !lab[q + w]) { lab[q + w] = list.length; st.push(q + w); }
    }
  }
  return { lab, list };
}
/* rellena los huecos encerrados de hasta max celdas */
function rpFillHoles(M, w, h, max) {
  const inv = new Uint8Array(w * h); for (let i = 0; i < M.length; i++) inv[i] = M[i] ? 0 : 1;
  const { list } = rpLabel(inv, w, h, true);
  for (const C of list) if (C.n <= max && C.x0 > 0 && C.y0 > 0 && C.x1 < w - 1 && C.y1 < h - 1) for (const q of C.px) M[q] = 1;
}
/* el piso: las caras horizontales cerca de y = 0, pintadas en la cuadrícula */
function rpFloorMask(T, G, tol = .12) {
  const { x0, z0, k, w, h } = G, p = T.p, I = T.i, M = new Uint8Array(w * h);
  for (let t = 0; t < I.length; t += 3) {
    const A = I[t] * 3, B = I[t + 1] * 3, C = I[t + 2] * 3;
    if (Math.abs(p[A + 1]) > tol || Math.abs(p[B + 1]) > tol || Math.abs(p[C + 1]) > tol) continue;
    const ax = (p[A] - x0) / k, az = (p[A + 2] - z0) / k, bx = (p[B] - x0) / k, bz = (p[B + 2] - z0) / k, cx = (p[C] - x0) / k, cz = (p[C + 2] - z0) / k;
    const den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(den) < 1e-9) continue;
    const u0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), u1 = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx))), v0 = Math.max(0, Math.floor(Math.min(az, bz, cz))), v1 = Math.min(h - 1, Math.ceil(Math.max(az, bz, cz)));
    for (let v = v0; v <= v1; v++) for (let u = u0; u <= u1; u++) {
      const X = u + .5, Z = v + .5, l1 = ((bz - cz) * (X - cx) + (cx - bx) * (Z - cz)) / den, l2 = ((cz - az) * (X - cx) + (ax - cx) * (Z - cz)) / den;
      if (l1 >= -1e-6 && l2 >= -1e-6 && l1 + l2 <= 1 + 1e-6) M[v * w + u] = 1;
    }
  }
  return M;
}
const rpMedian = L => { if (!L.length) return 0; const s = [...L].sort((a, b) => a - b); return s[s.length >> 1]; };
/* el grosor típico de lo cortado (celdas): la menor de las corridas horizontal y vertical de cada celda */
function rpThick(M, w, h) {
  const L = [];
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (!M[y * w + x]) continue;
    let a = x, b = x; while (a > 0 && M[y * w + a - 1]) a--; while (b < w - 1 && M[y * w + b + 1]) b++;
    let c = y, d = y; while (c > 0 && M[(c - 1) * w + x]) c--; while (d < h - 1 && M[(d + 1) * w + x]) d++;
    L.push(Math.min(b - a + 1, d - c + 1));
  }
  return Math.max(1, rpMedian(L));
}
/* los muros de una dirección: de las corridas largas, cada tramo con su eje y su grosor; los tramos de un mismo muro
   se juntan y el espacio entre ellos es un hueco. tr: la máscara transpuesta (muros verticales) */
function rpRuns(M, w, h, Lmin, Tt) {
  const H = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) { let x = 0; while (x < w) { if (!M[y * w + x]) { x++; continue; } let e = x; while (e < w && M[y * w + e]) e++; if (e - x >= Lmin) for (let q = x; q < e; q++) H[y * w + q] = 1; x = e; } }
  const { list } = rpLabel(H, w, h, true), out = [];
  for (const C of list) {
    // por columna: el grosor y el centro de lo que hay; el muro, con la mediana (una columna metida no lo engorda)
    const top = new Map(), bot = new Map();
    for (const q of C.px) { const x = q % w, y = (q - x) / w; top.set(x, Math.min(top.has(x) ? top.get(x) : y, y)); bot.set(x, Math.max(bot.has(x) ? bot.get(x) : y, y)); }
    const th = [], ce = [];
    for (const [x, t] of top) { th.push(bot.get(x) - t + 1); ce.push((bot.get(x) + t + 1) / 2); }
    const t = rpMedian(th), c = rpMedian(ce), len = C.x1 - C.x0 + 1;
    out.push({ a: C.x0, b: C.x1 + 1, c, t: Math.max(1, t), len, n: C.n, sq: len < Math.max(2 * t, 2.2 * Tt) });
  }
  return out;
}
/* tramos de un mismo eje → muros con huecos. get(m, x, y): lo que hay en la máscara m en la celda del eje */
function rpJoin(runs, o) {
  const { k, gapMin, gapMax, probe } = o, out = [], used = new Set();
  const L = runs.filter(r => !r.sq).sort((p, q) => p.c - q.c || p.a - q.a);
  for (let i = 0; i < L.length; i++) {
    if (used.has(i)) continue;
    const g = [L[i]]; used.add(i);
    for (let j = i + 1; j < L.length; j++) if (!used.has(j) && Math.abs(L[j].c - L[i].c) <= Math.max(L[i].t, L[j].t) / 2 + 1 && L[j].t <= L[i].t * 1.7 + 1 && L[i].t <= L[j].t * 1.7 + 1) { g.push(L[j]); used.add(j); }
    g.sort((p, q) => p.a - q.a);
    let cur = { a: g[0].a, b: g[0].b, c: g[0].c, t: g[0].t, o: [] };
    const flush = () => out.push(cur);
    for (const r of g.slice(1)) {
      const gap = r.a - cur.b;
      if (gap <= gapMax && gap >= gapMin) { cur.o.push({ u0: cur.b, u1: r.a, kind: probe(cur.b, r.a, Math.round(cur.c - .5)) }); cur.b = Math.max(cur.b, r.b); cur.t = Math.max(cur.t, r.t); }
      else if (gap < gapMin) { cur.b = Math.max(cur.b, r.b); }
      else { flush(); cur = { a: r.a, b: r.b, c: r.c, t: r.t, o: [] }; }
    }
    flush();
  }
  return out;
}
/* el contorno del piso: la mayor mancha; un rectángulo si casi lo llena, si no su borde simplificado */
function rpOutline(M, w, h, G) {
  const { list } = rpLabel(M, w, h, true); if (!list.length) return [];
  const C = list.reduce((a, b) => b.n > a.n ? b : a);
  if (C.n * G.k * G.k < 1) return [];
  const P = (x, y) => [Math.round((G.x0 + x * G.k) * 100) / 100, Math.round((G.z0 + y * G.k) * 100) / 100];
  const fill = C.n / ((C.x1 - C.x0 + 1) * (C.y1 - C.y0 + 1));
  if (fill >= .92) return [P(C.x0, C.y0), P(C.x1 + 1, C.y0), P(C.x1 + 1, C.y1 + 1), P(C.x0, C.y1 + 1)];
  // el borde (vecinos de Moore), en las esquinas de las celdas
  const in_ = new Uint8Array(w * h); for (const q of C.px) in_[q] = 1;
  const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && in_[y * w + x];
  const N8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  let s = C.px.reduce((a, q) => q < a ? q : a, Infinity), sx = s % w, sy = (s - sx) / w;
  const pts = [[sx, sy]];
  let cx = sx, cy = sy, bd = 4, steps = 0;
  for (;;) {
    let found = -1;
    for (let i = 1; i <= 8; i++) { const d = (bd + i) % 8; if (at(cx + N8[d][0], cy + N8[d][1])) { found = d; break; } }
    if (found < 0) break;
    const bx = cx + N8[(found + 7) % 8][0], by = cy + N8[(found + 7) % 8][1];
    cx += N8[found][0]; cy += N8[found][1];
    bd = N8.findIndex(([dx, dy]) => dx === bx - cx && dy === by - cy); if (bd < 0) bd = 4;
    if (cx === sx && cy === sy) break;
    pts.push([cx, cy]);
    if (++steps > 4 * (w + h) * 4) break;
  }
  // simplificar (Douglas-Peucker) y enderezar lo casi recto
  const dp = (L, tol) => {
    if (L.length < 3) return L;
    const [a, b] = [L[0], L[L.length - 1]], dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1;
    let mi = 0, md = 0; for (let i = 1; i < L.length - 1; i++) { const d = Math.abs((L[i][0] - a[0]) * dy - (L[i][1] - a[1]) * dx) / n; if (d > md) { md = d; mi = i; } }
    return md > tol ? [...dp(L.slice(0, mi + 1), tol).slice(0, -1), ...dp(L.slice(mi), tol)] : [a, b];
  };
  const far = pts.reduce((a, p, i) => Math.hypot(p[0] - sx, p[1] - sy) > Math.hypot(pts[a][0] - sx, pts[a][1] - sy) ? i : a, 0);
  let S = [...dp(pts.slice(0, far + 1), 1.6).slice(0, -1), ...dp([...pts.slice(far), pts[0]], 1.6).slice(0, -1)];
  if (S.length > 60 || S.length < 3) return [P(C.x0, C.y0), P(C.x1 + 1, C.y0), P(C.x1 + 1, C.y1 + 1), P(C.x0, C.y1 + 1)];
  for (let i = 1; i < S.length; i++) { const p = S[i - 1], q = S[i]; if (Math.abs(q[1] - p[1]) < Math.abs(q[0] - p[0]) * .14) q[1] = p[1]; else if (Math.abs(q[0] - p[0]) < Math.abs(q[1] - p[1]) * .14) q[0] = p[0]; }
  return S.map(([x, y]) => P(x + .5, y + .5));
}
/* lo que hay en la máscara m, en la fracción de celdas de un tramo de fila (o de columna, tr) */
const rpFrac = (m, w, a, b, y, tr, h) => { let n = 0, s = 0; for (let x = Math.floor(a); x < Math.ceil(b); x++) { const q = tr ? x * w + y : y * w + x; if (tr ? x >= 0 && x < h : x >= 0 && x < w) { n++; s += m[q] ? 1 : 0; } } return n ? s / n : 0; };
const rpT = (M, w, h) => { const o = new Uint8Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[x * h + y] = M[y * w + x]; return o; };
/* hasta dónde suben los muros: el corte más alto (de 20 en 20 cm) que todavía cubre la mitad de lo cortado a 1,5 m */
function rpWallTop(T, G, M15, top) {
  let n15 = 0; for (const v of M15) n15 += v; if (!n15) return 2.6;
  let best = RP_CUT.wall;
  for (let c = 1.7; c <= Math.min(top, 8) + .001; c += .1) {
    const m = rpSection(T, G, c); let s = 0; for (let i = 0; i < m.length; i++) if (M15[i] && m[i]) s++;
    if (s >= n15 * .5) best = c; else break;
  }
  return Math.round(Math.min(Math.max(best, 2.2), 8) * 20) / 20;
}
/* la réplica: { walls, floor, items, wh, n: { muros, huecos, volúmenes } } en el formato del constructor */
function rpReplicate(T, opt = {}) {
  const G = rpGrid(T, opt); if (!G) return null;
  if (G.big) return { big: true };
  const { w, h, k } = G;
  let top = 0; for (let i = 1; i < T.p.length; i += 3) if (T.p[i] > top) top = T.p[i];
  const M = { wall: rpSection(T, G, RP_CUT.wall), low: rpSection(T, G, RP_CUT.low, 3), mid: rpSection(T, G, RP_CUT.mid, 3), top: rpSection(T, G, RP_CUT.top), plat: rpSection(T, G, RP_CUT.plat, 3) };
  const wh = opt.wh || rpWallTop(T, G, M.wall, top);
  const Tt = rpThick(M.wall, w, h), Lmin = Math.max(.6 / k, 3 * Tt);
  const o = { k, gapMin: Math.round(.45 / k), gapMax: Math.round(2.6 / k) };
  const R = Math.round, X = u => R((G.x0 + u * k) * 100) / 100, Z = v => R((G.z0 + v * k) * 100) / 100;
  // tipo de hueco: con muro a 0,5 m es una ventana; su altura según lo que hay a 1 y a 2 m
  const kindOf = (m, tr) => (a, b, y) => {
    const f = q => rpFrac(q, tr ? h : w, a, b, y, false, 0);
    const mm = tr ? { low: rpT(M.low, w, h), mid: rpT(M.mid, w, h), top: rpT(M.top, w, h) } : M;
    const win = f(mm.low) > .6;
    return { k: win ? 'v' : 'p', y0: win ? (f(mm.mid) > .6 ? 1.2 : .9) : 0, y1: f(mm.top) > .6 ? 1.9 : 2.1 };
  };
  // los muros horizontales (a lo largo de x) y los verticales (a lo largo de z, con la máscara transpuesta)
  const Mt = rpT(M.wall, w, h);
  const kH = kindOf(M, false), kV = kindOf(null, true);
  const runsH = rpRuns(M.wall, w, h, Lmin, Tt), runsV = rpRuns(Mt, h, w, Lmin, Tt);
  const MtL = { low: rpT(M.low, w, h), mid: rpT(M.mid, w, h), top: rpT(M.top, w, h) };
  const probeV = (a, b, y) => { const f = q => rpFrac(q, h, a, b, y, false, 0); const win = f(MtL.low) > .6; return { k: win ? 'v' : 'p', y0: win ? (f(MtL.mid) > .6 ? 1.2 : .9) : 0, y1: f(MtL.top) > .6 ? 1.9 : 2.1 }; };
  const WH = rpJoin(runsH, { ...o, probe: kH }), WV = rpJoin(runsV, { ...o, probe: probeV });
  const walls = [], used = new Uint8Array(w * h);
  const mk = (r, vert) => {
    const t = r.t * k, c = vert ? X(r.c) : Z(r.c), a = r.a * k + t / 2, b = r.b * k - t / 2;
    if (b - a < .2) return;
    const s0 = vert ? G.z0 : G.x0;
    const wall = vert ? { x0: c, z0: R((s0 + a) * 100) / 100, x1: c, z1: R((s0 + b) * 100) / 100 } : { x0: R((s0 + a) * 100) / 100, z0: c, x1: R((s0 + b) * 100) / 100, z1: c };
    wall.t = Math.min(1.5, Math.max(.05, R(t * 100) / 100));
    wall.o = r.o.map(q => ({ k: q.kind.k, u: R(((q.u0 + q.u1) / 2 * k - a) * 100) / 100, a: R((q.u1 - q.u0) * k * 100) / 100, y0: q.kind.y0, y1: Math.min(q.kind.y1, wh - .1) }));
    walls.push(wall);
    // lo que ya es muro no se vuelve volumen
    const pad = 2;
    for (let u = r.a - pad; u < r.b + pad; u++) for (let v = Math.floor(r.c - r.t / 2) - pad; v <= Math.ceil(r.c + r.t / 2) + pad; v++) { const x = vert ? v : u, y = vert ? u : v; if (x >= 0 && y >= 0 && x < w && y < h) used[y * w + x] = 1; }
  };
  WH.forEach(r => mk(r, false)); WV.forEach(r => mk(r, true));
  // volúmenes: lo cortado que no es muro. Alto: lo que llega a 1,5 m (columnas, estantes) va hasta el techo; si no, por
  // el corte más alto en que aparece
  const items = [];
  const rest = new Uint8Array(w * h);
  for (let i = 0; i < rest.length; i++) rest[i] = !used[i] && (M.wall[i] || M.mid[i] || M.low[i] || M.plat[i]) ? 1 : 0;
  const { list } = rpLabel(rest, w, h, true);
  for (const C of list.sort((a, b) => b.n - a.n)) {
    const bw = (C.x1 - C.x0 + 1) * k, bd = (C.y1 - C.y0 + 1) * k, area = C.n * k * k;
    const cnt = m => C.px.reduce((s, q) => s + m[q], 0) / C.n;
    const tall = cnt(M.wall) > .25;
    if (tall ? area < .02 || Math.min(bw, bd) < .1 : area < .2 || Math.min(bw, bd) < .2) continue;
    if (items.length >= 60) break;
    const hh = tall ? wh : cnt(M.mid) > .25 ? 1.1 : cnt(M.low) > .25 ? .9 : .3;
    items.push({ k: 'vol', x: X((C.x0 + C.x1 + 1) / 2), z: Z((C.y0 + C.y1 + 1) / 2), r: 0, w: R(bw * 100) / 100, d: R(bd * 100) / 100, hh });
  }
  // los tramos cuadrados (más anchos que largos): columnas
  for (const [L, vert] of [[runsH, false], [runsV, true]]) for (const r of L) if (r.sq && !items.some(it => Math.abs(it.x - (vert ? X(r.c) : X((r.a + r.b) / 2))) < .15 && Math.abs(it.z - (vert ? Z((r.a + r.b) / 2) : Z(r.c))) < .15)) {
    const a = (r.b - r.a) * k, t = r.t * k;
    if (!vert) items.push({ k: 'vol', x: X((r.a + r.b) / 2), z: Z(r.c), r: 0, w: R(a * 100) / 100, d: R(t * 100) / 100, hh: wh });
    else items.push({ k: 'vol', x: X(r.c), z: Z((r.a + r.b) / 2), r: 0, w: R(t * 100) / 100, d: R(a * 100) / 100, hh: wh });
  }
  const floor = rpOutline(rpFloorMask(T, G), w, h, G);
  return { walls, floor, items, wh, n: { walls: walls.length, ops: walls.reduce((a, x) => a + x.o.length, 0), vols: items.length } };
}

/* ---------- con el modelo abierto (en el navegador) ---------- */
/* los triángulos de las mallas de un grupo, en la escena: menos el punto de la acción (ax, az) */
function rpTris(meshes, ax, az) {
  let nv = 0, ni = 0;
  for (const m of meshes) { if (!m.isMesh) continue; const g = m.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const p = new Float32Array(nv * 3), I = new Uint32Array(ni), v = new THREE.Vector3();
  let vo = 0, io = 0;
  for (const m of meshes) {
    if (!m.isMesh) continue;
    const g = m.geometry, A = g.attributes.position;
    m.updateMatrixWorld(true);
    for (let i = 0; i < A.count; i++) { v.fromBufferAttribute(A, i).applyMatrix4(m.matrixWorld); p[(vo + i) * 3] = v.x - ax; p[(vo + i) * 3 + 1] = v.y; p[(vo + i) * 3 + 2] = v.z - az; }
    if (g.index) for (let j = 0; j < g.index.count; j++) I[io++] = g.index.getX(j) + vo; else for (let j = 0; j < A.count; j++) I[io++] = j + vo;
    vo += A.count;
  }
  return { p, i: I };
}
/* la versión liviana de un escenario abierto (la plantilla de modelos.js): unos 60 000 triángulos y texturas de hasta
   512 px y unos 48 kB, con el mismo empaque de siempre (m3Pack). Devuelve lo mismo que m3Pack */
const RP_LIGHT = { tris: 60000, texTop: 48 * 1024, texAll: 1200 * 1024 };
async function rpLightPack(t, name) {
  const T = THREE, root = new T.Group(), mats = [];
  for (const p of t.parts) {
    const d = t.H.mats[p.m] || { c: '#CCCCCC' };
    const m = new T.MeshBasicMaterial({ color: d.c, map: d.t >= 0 ? t.texs[d.t] : null, transparent: !!d.tr, opacity: d.op ?? 1, alphaTest: d.at || 0, side: d.ds ? T.DoubleSide : T.FrontSide, vertexColors: !!d.vc });
    mats.push(m); root.add(new T.Mesh(p.geo, m));
  }
  try { return await m3Pack(root, { kind: 'set', budget: RP_LIGHT.tris, keep: 3000, texTop: RP_LIGHT.texTop, texAll: RP_LIGHT.texAll, extra: { n: name || '' } }); }
  finally { for (const m of mats) m.dispose(); }
}
const rpKB = kb => kb >= 1024 ? (kb / 1024).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(kb)) + ' kB';
/* quitar el escenario importado id (después de replicarlo en rid): sus planos y su locación pasan a la réplica. Se
   puede deshacer: el modelo y su planta vuelven con el paso del historial */
async function rpDropOriginal(id, rid) {
  const d = P.sets3d && P.sets3d[id], r = P.sets3d && P.sets3d[rid]; if (!d || !r) return;
  const ks = [m3Key('s', id), set3dPicKey(id)];
  await framesNeed(ks.filter(k => !FRAMES[k] && frameHas(k))).catch(() => { });
  const keep = Object.fromEntries(ks.filter(k => FRAMES[k]).map(k => [k, FRAMES[k]]));
  histNote(`Borrar el modelo 3D «${d.n}»`, keep, UI.tab);
  for (const sh of Object.values(P.shots)) if (sh.s3 && sh.s3.set === 'modelo' && sh.s3.set3d === id) sbUse(sh.s3, rid);
  for (const [l, v] of Object.entries(P.locSet3d || {})) if (v === id) P.locSet3d[l] = rid;
  delete P.sets3d[id];
  for (const k of ks) { delete FRAMES[k]; if (typeof IMGS !== 'undefined') IMGS.delete(k); Store.saveFrame(P.id, k, null).catch(() => { }); }
  const e = M3.tpl.get(ks[0]); M3.tpl.delete(ks[0]); if (e && e.t) m3Dispose(e.t);
  if (R3.sets && R3.sets.modelo) { const U = R3.sets.modelo.userData; U.key = ''; if (U.hold) { R3.sets.modelo.remove(U.hold); U.hold = null; } }
  if (typeof EDT !== 'undefined' && EDT && EDT.s3 && EDT.s3.set === 'modelo' && EDT.s3.set3d === id) sbUse(EDT.s3, rid);
  if (typeof THUMB3 !== 'undefined') THUMB3.clear();
  changed('data'); derive(); render();
  if (typeof EDT !== 'undefined' && EDT && EDT.redraw) EDT.redraw();
  toastUndo(`Modelo «${d.n}» borrado: se liberaron ${rpKB(d.kb || 0)}.`);
}

if (typeof module !== 'undefined') module.exports = { rpGrid, rpSection, rpFloorMask, rpReplicate, rpOutline, rpLabel };
