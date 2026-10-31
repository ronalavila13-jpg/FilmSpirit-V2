/* ============================================================
   VESTUARIO · prendas listas (la ropa a medida se dibuja: s3d-accesorios.js)
   Cada prenda es un accesorio de la figura ({ kind:'ropa' | 'pieza', preset }) que se arma solo:
   · ropa: la piel del maniquí que cubre sale de una receta (de la cadera al cuello, mangas hasta el codo,
     piernas hasta el tobillo…), medida sobre los huesos de cada cuerpo; se copia, se separa un poco de la
     piel y conserva los pesos de los huesos (se dobla con la figura). Los faldones (falda, abrigo, bata,
     delantal) son un tubo que cuelga de la cadera y sigue a los muslos.
   · piezas de la cabeza (gorro, gorra, sombrero, cascos, lentes) y la corbata: formas armadas a la medida
     de la cabeza o del pecho de cada cuerpo, pegadas a su hueso.
   Se editan el color, el estampado (cuadros, rayas, camuflaje), el material y lo ajustado u holgado.
   ============================================================ */
const VEST = {
  polo: { name: 'Polo', slot: ['top'], color: '#3F6E9E', vol: -.75, cover: { torso: L => [L.hip - .07, L.neck], arm: .5, leg: [-1, .12] } },
  camisa: { name: 'Camisa', slot: ['top'], color: '#F1EEE6', vol: -.65, cover: { torso: L => [L.hip - .1, L.neck], arm: 1.93, v: .07, leg: [-1, .16] } },
  blusa: { name: 'Blusa', slot: ['top'], color: '#D98E9E', vol: -.7, cover: { torso: L => [L.hip - .05, L.neck - .01], arm: .32, v: .05, leg: [-1, .1] } },
  chaleco: { name: 'Chaleco reflectivo', slot: ['outer'], color: '#E9792B', color2: '#D8DCDF', pattern: 'bandas', vol: -.2, cover: { torso: L => [L.hip - .05, L.neck + .01], v: .17, leg: [-1, .1] } },
  saco: { name: 'Saco', slot: ['outer'], color: '#2C3A55', vol: -.15, cover: { torso: L => [L.hip - .13, L.neck + .02], arm: 1.9, v: .3, leg: [-1, .22] } },
  abrigo: { name: 'Abrigo largo', slot: ['outer'], color: '#B59B6A', vol: .1, cover: { torso: L => [L.hip - .1, L.neck + .025], arm: 1.92, v: .22, leg: [-1, .2] }, skirt: { top: L => L.hip + .02, bot: L => L.knee + .02, gap: 16 } },
  bata: { name: 'Bata de doctor', slot: ['outer'], color: '#F6F6F3', vol: .02, cover: { torso: L => [L.hip - .1, L.neck + .02], arm: 1.88, v: .17, leg: [-1, .2] }, skirt: { top: L => L.hip + .02, bot: L => L.knee + .1, gap: 22 } },
  pantalon: { name: 'Pantalón', slot: ['bottom'], color: '#3E4656', vol: -.45, cover: { torso: L => [-9, L.waist + .03], leg: [-1, 1.93] } },
  jean: { name: 'Jean', slot: ['bottom'], color: '#3E5A7E', vol: -.5, cover: { torso: L => [-9, L.waist + .02], leg: [-1, 1.95] } },
  shorts: { name: 'Shorts', slot: ['bottom'], color: '#6B7F5A', vol: -.35, cover: { torso: L => [-9, L.waist + .03], leg: [-1, .42] } },
  falda: { name: 'Falda', slot: ['bottom'], color: '#4E6A8E', vol: -.45, cover: { torso: L => [-9, L.waist + .03], leg: [-1, .1] }, skirt: { top: L => L.hip + .03, bot: L => L.knee - .03, flare: .1 } },
  delantal: { name: 'Delantal', slot: ['apron'], color: '#F2EFE8', color2: '#D27C7C', pattern: 'cuadros', vol: .05, cover: { torso: L => [L.waist - .03, L.chest + .05], front: true }, skirt: { top: L => L.waist, bot: L => L.knee + .1, arc: 150, flare: .04 } },
  bikini: { name: 'Bikini', slot: ['top', 'bottom', 'outer'], color: '#D9486C', vol: -1, cover: { bands: L => [[L.chest - .06, L.chest + .065], [-9, L.hip - .02]], leg: [-1, .05] } },
  cinturon: { name: 'Cinturón', slot: ['waist'], color: '#2E2B28', mat: 'cuero', vol: -.25, cover: { torso: L => [L.waist - .015, L.waist + .03] } },
  zapatos: { name: 'Zapatos', slot: ['feet'], color: '#3B2A20', mat: 'cuero', vol: -.15, cover: { leg: [1.93, 9] } },
  botas: { name: 'Botas', slot: ['feet'], color: '#5A3C28', mat: 'cuero', vol: 0, cover: { leg: [1.5, 9] } },
  gorro: { name: 'Gorro de lana', slot: ['head'], color: '#B0332B', piece: 'gorro', part: 'cabeza' },
  gorra: { name: 'Gorra', slot: ['head'], color: '#2F5D8C', piece: 'gorra', part: 'cabeza' },
  sombrero: { name: 'Sombrero', slot: ['head'], color: '#4E4237', piece: 'sombrero', part: 'cabeza' },
  casco: { name: 'Casco de obra', slot: ['head'], color: '#E9B932', piece: 'casco', part: 'cabeza' },
  casco_mil: { name: 'Casco militar', slot: ['head'], color: '#55603F', piece: 'casco_mil', part: 'cabeza' },
  lentes: { name: 'Lentes', slot: ['eyes'], color: '#2B2D31', mat: 'metal', piece: 'lentes', part: 'cabeza' },
  lentes_sol: { name: 'Lentes de sol', slot: ['eyes'], color: '#1E1B19', piece: 'lentes_sol', part: 'cabeza' },
  corbata: { name: 'Corbata', slot: ['neck'], color: '#7A2633', piece: 'corbata', part: 'torso' },
};
const VEST_COLORS = ['#F4F2EC', '#1E1B19', '#8E949B', '#3E4656', '#2C3A55', '#3E5A7E', '#6B7350', '#B59B6A', '#7A4E2E', '#B0332B', '#D9486C', '#E9B932', '#E9792B', '#BFD3E6'];
const VEST_PAT = [['', 'Liso'], ['cuadros', 'Cuadros'], ['rayas', 'Rayas'], ['rayas_h', 'Rayas horiz.'], ['camuflaje', 'Camuflaje']];
const VEST_GROUPS = [['Arriba', ['polo', 'camisa', 'blusa', 'saco', 'abrigo', 'bata', 'chaleco']], ['Abajo', ['pantalon', 'jean', 'shorts', 'falda', 'delantal', 'bikini']], ['Pies y cintura', ['zapatos', 'botas', 'cinturon', 'corbata']], ['Cabeza', ['gorro', 'gorra', 'sombrero', 'casco', 'casco_mil', 'lentes', 'lentes_sol']]];
/* una prenda nueva (con los datos que se cambien) */
function vestNew(preset, over = {}) {
  const V = VEST[preset];
  return { id: 'v' + uid(), kind: V.piece ? 'pieza' : 'ropa', preset, part: V.part || 'cuerpo', name: V.name, color: V.color, mat: V.mat || 'tela', vol: V.vol || 0, ...(V.pattern ? { pattern: V.pattern, color2: V.color2 } : {}), ...over };
}
/* agrega a la apariencia: un conjunto reemplaza todas las prendas listas; una prenda, la del mismo lugar */
function vestApply(list, add, whole) {
  const slots = new Set(add.flatMap(a => VEST[a.preset].slot));
  const keep = (list || []).filter(a => !a.preset || (!whole && !VEST[a.preset].slot.some(s => slots.has(s))));
  return [...keep, ...add];
}

/* ---------- medidas del cuerpo ---------- */
const VEST_L = new WeakMap();
function vestLand(tp) {
  let L = VEST_L.get(tp); if (L) return L;
  const B = n => tp.bones[tp.idx[n]].h;
  const cl = B('clavicle_l'), s3 = B('spine_03'), s1 = B('spine_01'), pv = B('pelvis');
  L = { neck: cl[1] + .04, chest: s3[1] + (cl[1] - s3[1]) * .45, waist: s1[1] + .01, hip: pv[1], knee: B('calf_l')[1], ankle: B('foot_l')[1] };
  for (const s of ['l', 'r']) {
    const ua = B('upperarm_' + s), la = B('lowerarm_' + s), ha = B('hand_' + s);
    L['arm_' + s] = [ua, la, ha, ha.map((v, i) => v + (ha[i] - la[i]) * .55)];
    const ba = B('ball_' + s);
    L['leg_' + s] = [B('thigh_' + s), B('calf_' + s), B('foot_' + s), [ba[0], ba[1], ba[2] + .07]];
  }
  // clase de cada hueso: 0 torso, 1 brazo, 2 pierna, 3 cuello y cabeza
  L.cls = tp.bones.map(b => /upperarm|lowerarm|hand|thumb|index|middle|ring|pinky/.test(b.n) ? 1 : /thigh|calf|foot|ball/.test(b.n) ? 2 : /neck|head/.test(b.n) ? 3 : 0);
  // cortes horizontales del cuerpo (sin brazos ni cabeza) cada 1 cm: ancho y fondo; y el frente del pecho al centro
  const g = tp.parts.cuerpo && tp.parts.cuerpo.geo, NB = 220;
  L.sx = new Float32Array(NB); L.z0 = new Float32Array(NB).fill(9); L.z1 = new Float32Array(NB).fill(-9); L.zf = new Float32Array(NB).fill(-9);
  const hd = { x0: 9, x1: -9, y0: 9, y1: -9, z0: 9, z1: -9, hx: new Float32Array(NB), hz0: new Float32Array(NB).fill(9), hz1: new Float32Array(NB).fill(-9) }, hb = tp.idx.head;
  if (g) {
    const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      let cmax = 0, wc = [0, 0, 0, 0], wh = 0;
      for (let k = 0; k < 4; k++) { const bi = SI.getComponent(i, k), w = SW.getComponent(i, k); wc[L.cls[bi]] += w; if (bi === hb) wh += w; }
      for (let c = 1; c < 4; c++) if (wc[c] > wc[cmax]) cmax = c;
      if (wh > .6) { hd.x0 = Math.min(hd.x0, x); hd.x1 = Math.max(hd.x1, x); hd.y0 = Math.min(hd.y0, y); hd.y1 = Math.max(hd.y1, y); hd.z0 = Math.min(hd.z0, z); hd.z1 = Math.max(hd.z1, z); const b = Math.round(y * 100); if (b >= 0 && b < NB) { hd.hx[b] = Math.max(hd.hx[b], Math.abs(x)); hd.hz0[b] = Math.min(hd.hz0[b], z); hd.hz1[b] = Math.max(hd.hz1[b], z); } }
      if (cmax === 1 || cmax === 3) continue;
      const b = Math.round(y * 100); if (b < 0 || b >= NB) continue;
      L.sx[b] = Math.max(L.sx[b], Math.abs(x)); L.z0[b] = Math.min(L.z0[b], z); L.z1[b] = Math.max(L.z1[b], z);
      if (Math.abs(x) < .025 && cmax === 0) L.zf[b] = Math.max(L.zf[b], z);
    }
    // frente de la frente (sin la nariz): lo más adelantado por encima de los ojos
    const ye = (tp.meta.eye || [0, hd.y1 - .08, 0])[1];
    let zf = -9; for (let i = 0; i < P.count; i++) { const y = P.getY(i); if (y > ye + .03 && y < hd.y1 && Math.abs(P.getX(i)) < .05) zf = Math.max(zf, P.getZ(i)); }
    hd.zf = zf > -9 ? zf : hd.z1;
    // el frente de la cara a la altura de los ojos (para los lentes)
    let ze = -9; for (let i = 0; i < P.count; i++) { const y = P.getY(i), ax = Math.abs(P.getX(i)); if (Math.abs(y - ye) < .012 && ax > .015 && ax < .05) ze = Math.max(ze, P.getZ(i)); }
    hd.ze = ze > -9 ? ze : hd.zf;
  }
  L.head = hd;
  VEST_L.set(tp, L);
  return L;
}
/* corte del cuerpo a la altura y (promedio de ±2 cm) */
function vestSlice(L, y) {
  const b0 = Math.round(y * 100); let sx = 0, z0 = 9, z1 = -9;
  for (let b = b0 - 2; b <= b0 + 2; b++) { if (b < 0 || b >= L.sx.length || L.z1[b] < -8) continue; sx = Math.max(sx, L.sx[b]); z0 = Math.min(z0, L.z0[b]); z1 = Math.max(z1, L.z1[b]); }
  return z1 < -8 ? null : { sx, z0, z1 };
}
const vestFront = (L, y) => { const b0 = Math.round(y * 100); let z = -9; for (let b = b0 - 1; b <= b0 + 1; b++) if (b >= 0 && b < L.zf.length) z = Math.max(z, L.zf[b]); return z > -8 ? z : .1; };
/* de un punto a lo largo de una cadena (hombro → codo → muñeca → dedos): 0 en la articulación de arriba, 1, 2… */
function vestChainT(x, y, z, C) {
  let best = 1e9, t = 0;
  for (let i = 0; i < C.length - 1; i++) {
    const a = C[i], b = C[i + 1], ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
    let u = ((x - a[0]) * ab[0] + (y - a[1]) * ab[1] + (z - a[2]) * ab[2]) / l2; const uc = clamp(u, 0, 1);
    const dx = x - a[0] - ab[0] * uc, dy = y - a[1] - ab[1] * uc, dz = z - a[2] - ab[2] * uc, d = dx * dx + dy * dy + dz * dz;
    if (d < best) { best = d; t = i + (i === 0 ? Math.min(u, 1) : i === C.length - 2 ? Math.max(u, 0) : uc); }
  }
  return t;
}
/* qué tanto cubre la prenda cada punto de la piel (0 … 1; el borde de la prenda pasa por 0,5) */
const VEST_COV = new WeakMap();
function vestCoverage(acc, tp) {
  const V = VEST[acc.preset]; if (!V || !V.cover) return null;
  let box = VEST_COV.get(tp); if (!box) VEST_COV.set(tp, box = new Map());
  if (box.has(acc.preset)) return box.get(acc.preset);
  const L = vestLand(tp), C = V.cover, g = tp.parts.cuerpo && tp.parts.cuerpo.geo; if (!g) return null;
  const P = g.attributes.position, N = g.attributes.normal, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, n = P.count;
  const sm = (d, w) => clamp(d / w + .5, 0, 1), inY = (y, lo, hi) => sm(y - lo, .025) * sm(hi - y, .025);
  const T0 = C.torso ? C.torso(L) : null, BD = C.bands ? C.bands(L) : null;
  const fv = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), nz = N.getZ(i), side = x >= 0 ? 'l' : 'r';
    const w = [0, 0, 0, 0]; for (let k = 0; k < 4; k++) w[L.cls[SI.getComponent(i, k)]] += SW.getComponent(i, k);
    let cT = 0, cA = 0, cL = 0;
    if (T0) {
      const front = sm(nz - .1, .3), hi = T0[1] - (C.v || 0) * Math.max(0, 1 - Math.abs(x) / .085) * front;
      cT = inY(y, T0[0], hi);
      if (C.front) cT *= sm(nz - .15, .25);
    } else if (BD) for (const b of BD) cT = Math.max(cT, inY(y, b[0], b[1]));
    if (C.arm && w[1] > .01) cA = sm(C.arm - vestChainT(x, y, z, L['arm_' + side]), .12);
    if (C.leg && w[2] > .01) { const t = vestChainT(x, y, z, L['leg_' + side]); cL = sm(t - C.leg[0], .1) * sm(C.leg[1] - t, .1); }
    fv[i] = w[0] * cT + w[1] * cA + w[2] * cL;
  }
  const out = { cuerpo: fv };
  box.set(acc.preset, out);
  return out;
}

/* ---------- armado ---------- */
function vestBuild(acc, tp) {
  const V = VEST[acc.preset]; if (!V) return null;
  if (V.piece) return vestPiece(acc, tp, V);
  const parts = [];
  if (V.cover) { const g = accClothGeo(acc, tp); if (g) parts.push(g); }
  if (V.skirt) { const g = vestSkirt(acc, tp, V.skirt); if (g) parts.push(g); }
  if (!parts.length) return null;
  const geo = parts.length === 1 ? parts[0] : vestMerge(parts);
  geo.userData.cloth = true; geo.userData.det = null;
  return geo;
}
function vestMerge(list) {
  const T = THREE, geo = new T.BufferGeometry(), names = Object.keys(list[0].attributes), idx = [];
  let off = 0;
  for (const g of list) { const ix = g.index.array; for (let i = 0; i < ix.length; i++) idx.push(ix[i] + off); off += g.attributes.position.count; }
  for (const nm of names) {
    const A0 = list[0].attributes[nm], arr = new A0.array.constructor(list.reduce((s, g) => s + g.attributes[nm].array.length, 0));
    let o = 0; for (const g of list) { arr.set(g.attributes[nm].array, o); o += g.attributes[nm].array.length; }
    geo.setAttribute(nm, new T.BufferAttribute(arr, A0.itemSize));
  }
  geo.setIndex(idx);
  for (const g of list) g.dispose();
  return geo;
}
/* faldón: un tubo que cuelga de la cadera; arriba sigue a la pelvis y abajo, a los muslos */
function vestSkirt(acc, tp, K) {
  const T = THREE, L = vestLand(tp), y0 = K.top(L), y1 = K.bot(L), R = 12, SEG = 36;
  const t = .011 * accVolK(acc) * accVolK(acc), off = t + .012;
  const part = ACC_PARTS.cuerpo, pv = tp.bones[tp.idx.pelvis].h, c = [pv[0] + part.c[0], pv[1] + part.c[1], pv[2] + part.c[2]], S = part.s;
  const ip = tp.idx.pelvis, il = tp.idx.thigh_l, ir = tp.idx.thigh_r;
  const a0 = K.arc ? -K.arc / 2 : (K.gap || 0) / 2, a1 = K.arc ? K.arc / 2 : 360 - (K.gap || 0) / 2, closed = !K.arc && !K.gap;
  const cols = closed ? SEG : SEG + 1;
  const P = [], N = [], SI = [], SW = [], IN = [], BX = [], idx = [];
  let rx = 0, rz = 0, czp = 0;
  for (let r = 0; r <= R; r++) {
    const u = r / R, y = y0 + (y1 - y0) * u, sl = vestSlice(L, y) || { sx: rx - off, z0: czp - rz + off, z1: czp + rz - off };
    const fl = (K.flare || .06) * (y0 - y) * 1.2;
    rx = Math.max(rx, sl.sx + off) + (r ? fl * .25 : 0); rz = Math.max(rz, (sl.z1 - sl.z0) / 2 + off) + (r ? fl * .2 : 0);
    const cz = r ? czp * .7 + (sl.z0 + sl.z1) / 2 * .3 : (sl.z0 + sl.z1) / 2; czp = cz;
    const a = Math.min(1, u * 1.6) * .95;   // abajo, el faldón sigue a los muslos (sentada, queda sobre ellos)
    for (let k = 0; k < cols; k++) {
      const th = (a0 + (a1 - a0) * k / SEG) * Math.PI / 180, sx = Math.sin(th), cz2 = Math.cos(th);
      const x = sx * rx, z = cz + cz2 * rz;
      P.push(x, y, z); const nl = Math.hypot(sx / rx, cz2 / rz) || 1; N.push(sx / rx / nl, 0, cz2 / rz / nl);
      const wl = clamp(.5 + x / rx * .7, 0, 1);
      SI.push(ip, il, ir, 0); SW.push(1 - a, a * wl, a * (1 - wl), 0);
      IN.push(0, 0); BX.push((x - c[0]) / S, (y - c[1]) / S, (z - c[2]) / S);
    }
  }
  for (let r = 0; r < R; r++) for (let k = 0; k < SEG; k++) {
    const k2 = closed ? (k + 1) % SEG : k + 1, a = r * cols + k, b = r * cols + k2, d = (r + 1) * cols + k, e = (r + 1) * cols + k2;
    idx.push(a, d, b, b, d, e);
  }
  return clothGeo(P, N, SI, SW, IN, BX, idx);
}
/* ---------- gorra, gorro, sombrero y cascos: por encima del pelo ----------
   La copa sigue la forma del cráneo (la misma medida que usan los peinados, peloHead) separada `gap`: el pelo aplastado
   que queda debajo. Termina en un borde que va sobre la frente y baja un poco hacia la nuca (`drop`), como una gorra
   real. El peinado que se ve con la pieza puesta aplasta lo que queda por encima de ese borde dentro de la copa
   (peloHatSquash en s3d-pelo.js): el pelo asoma solo por debajo (costados, nuca y espalda) y nada atraviesa la copa.
   up y drop, en metros para una cabeza adulta (se escalan con la de cada cuerpo); shell: grosor de la copa; flare:
   cuánto se abre hacia el borde y crown: cuánto más alta queda la coronilla (cascos: no van pegados a la cabeza) */
const VEST_HAT = {
  gorra: { up: .05, drop: .03, gap: .01, shell: .004 },
  gorro: { up: .036, drop: .03, gap: .011, shell: .005 },
  sombrero: { up: .054, drop: .008, gap: .011, shell: .004 },
  casco: { up: .05, drop: .02, gap: .016, shell: .005, flare: .007, crown: .016 },
  casco_mil: { up: .034, drop: .03, gap: .016, shell: .006, flare: .012, crown: .008 },
};
const VEST_HATF = new WeakMap();
/* el borde de la pieza en ese cuerpo: line(a) = elevación del borde (grados, como en peloHead) en cada azimut */
function vestHatFit(tp, piece) {
  const K = VEST_HAT[piece]; if (!K || !tp || typeof peloHead !== 'function') return null;
  let box = VEST_HATF.get(tp); if (!box) VEST_HATF.set(tp, box = {});
  if (box[piece]) return box[piece];
  const H = peloHead(tp), sc = H.hs / .11, N = 72, E = new Float32Array(N + 1);
  const yB = a => H.ye + (K.up - K.drop * (1 - Math.cos(peloDeg(a))) / 2) * sc;
  for (let i = 0; i <= N; i++) { const a = -180 + 360 * i / N; E[i] = peloEAtY(H, a, yB(a), K.gap, false); }
  const line = a => { let f = (a + 180) / 360 * N; f = ((f % N) + N) % N; const i = Math.floor(f), t = f - i; return E[i] * (1 - t) + E[i + 1] * t; };
  return (box[piece] = { piece, H, K, gap: K.gap, sc, line });
}
/* la pieza de la cabeza que lleva puesta (la que va por encima del pelo), o null */
const vestHatOf = look => { for (const a of (look && look.acc) || []) if (a && !a.hide && a.preset && VEST_HAT[a.preset] && ACC_PARTS[a.part]) return a.preset; return null; };
/* piezas a la medida de la cabeza (o del pecho, la corbata), en el marco de su hueso */
function vestPiece(acc, tp, V) {
  const T = THREE, L = vestLand(tp), H = L.head, part = ACC_PARTS[V.part], bh = tp.bones[tp.idx[part.bone]].h;
  const top = H.y1, eye = tp.meta.eye || [0, top - .08, H.zf];
  // la línea donde se apoya un sombrero (sobre las cejas) y el ancho y fondo de la cabeza a esa altura (sin la nariz)
  const brow = eye[1] + .052, hb0 = Math.round(brow * 100);
  let rh = 0, z0 = 9, z1 = -9; for (let b = hb0 - 1; b <= hb0 + 1; b++) if (b >= 0 && b < H.hx.length && H.hz1[b] > -8) { rh = Math.max(rh, H.hx[b]); z0 = Math.min(z0, H.hz0[b]); z1 = Math.max(z1, H.hz1[b]); }
  if (!rh) { rh = (H.x1 - H.x0) / 2; z0 = H.z0; z1 = H.zf; }
  const rd = (z1 - z0) / 2, cz = (z1 + z0) / 2;
  const G = [];
  const add = (geo, col = 1, f) => { if (f) f(geo); G.push([geo, col]); return geo; };
  // piezas sobre el pelo: copa, borde y alas siguen el borde de la pieza en este cuerpo
  const F = vestHatFit(tp, V.piece), K = F && F.K, sc = F ? F.sc : 1;
  const hp = (a, e, off) => peloP(F.H, a, e, off, false);
  const mesh = (P, I) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return g; };
  // la copa: del borde a la coronilla, a `off` del cráneo (más fl junto al borde: los cascos se abren)
  const domeOff = (off, s) => off + (K.flare || 0) * (1 - s) * (1 - s) + (K.crown || 0) * s * s;
  const dome = (off, NA = 44, NR = 14) => {
    const P = [], I = [];
    for (let j = 0; j < NR; j++) { const s = j / NR; for (let i = 0; i < NA; i++) { const a = -180 + 360 * i / NA, e0 = F.line(a); P.push(...hp(a, e0 + (90 - e0) * s, domeOff(off, s))); } }
    P.push(...hp(0, 90, domeOff(off, 1)));
    for (let j = 0; j < NR - 1; j++) for (let i = 0; i < NA; i++) { const i2 = (i + 1) % NA, a = j * NA + i, b = j * NA + i2; I.push(a, b, b + NA, a, b + NA, a + NA); }
    for (let i = 0; i < NA; i++) I.push((NR - 1) * NA + i, (NR - 1) * NA + (i + 1) % NA, NR * NA);
    return mesh(P, I);
  };
  // un aro a lo largo del borde: el corte (puntos en función del azimut) se une con el del azimut siguiente
  const loft = (sec, NA = 48) => {
    const P = [], I = []; let n = 0;
    for (let i = 0; i < NA; i++) { const S = sec(-180 + 360 * i / NA); n = S.length; for (const p of S) P.push(...p); }
    for (let i = 0; i < NA; i++) { const i2 = (i + 1) % NA; for (let k = 0; k < n - 1; k++) { const a = i * n + k, b = i2 * n + k; I.push(a, b, b + 1, a, b + 1, a + 1); } }
    return mesh(P, I);
  };
  // hacia afuera, horizontal, desde el eje de la cabeza
  const outH = p => { const x = p[0] - F.H.C[0], z = p[2] - F.H.C[2], l = Math.hypot(x, z) || 1; return [x / l, 0, z / l]; };
  const shift = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];
  switch (V.piece) {
    case 'gorro': {
      const o = K.gap + K.shell;
      add(dome(o));
      // el doblez de abajo: más grueso, sobre el borde
      add(loft(a => { const e = F.line(a); return [hp(a, e - .6, K.gap + .002), hp(a, e - .3, o + .007), hp(a, e + 6, o + .009), hp(a, e + 13, o + .007), hp(a, e + 15, o)]; }), .9);
      const tp0 = hp(0, 90, o);
      add(new T.SphereGeometry(.024 * sc, 12, 9), 1, g => g.translate(tp0[0], tp0[1] + .018 * sc, tp0[2] - .004));
      break;
    }
    case 'gorra': {
      const o = K.gap + K.shell;
      add(dome(o));
      const tp0 = hp(0, 90, o);
      add(new T.SphereGeometry(.008 * sc, 8, 6), 1, g => g.translate(tp0[0], tp0[1] + .002, tp0[2]));
      // la visera sale del borde sobre la frente: su raíz es el borde de la copa (de un costado al otro) y se alarga
      // hacia adelante, más al centro; un poco inclinada hacia abajo y curvada a los lados
      const NU = 20, NV = 6, L0 = .08 * sc, th = .006, P = [], I = [];
      const pt = (u, v) => { const a = u * 66, b = hp(a, F.line(a), o - .001), d = L0 * Math.pow(Math.max(0, 1 - u * u), .62) * v; return [b[0] + Math.sin(peloDeg(a)) * d * .26, b[1] - d * (.18 + .5 * u * u), b[2] + d]; };
      for (const side of [0, 1]) for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const p = pt(-1 + 2 * i / NU, j / NV); P.push(p[0], p[1] - side * th, p[2]); }
      const row = NU + 1, bot = row * (NV + 1);
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
        const a = j * row + i, b = a + 1, c = a + row + 1, d = a + row;
        I.push(a, c, b, a, d, c);                         // arriba
        I.push(bot + a, bot + b, bot + c, bot + a, bot + c, bot + d);   // abajo
      }
      // canto de adelante y raíz (dentro de la copa)
      for (let i = 0; i < NU; i++) { const t = NV * row + i; I.push(t, bot + t, bot + t + 1, t, bot + t + 1, t + 1); I.push(i, i + 1, bot + i + 1, i, bot + i + 1, bot + i); }
      add(mesh(P, I), .96);
      break;
    }
    case 'sombrero': {
      // la copa encierra la cabeza con el pelo aplastado: su base es el contorno a la altura del borde
      const o = K.gap + K.shell, yb = F.H.ye + K.up * sc;
      let rx = 0, rz = 0, z0b = 9, z1b = -9;
      for (let a = -180; a < 180; a += 6) { const p = hp(a, F.line(a), o); rx = Math.max(rx, Math.abs(p[0])); z0b = Math.min(z0b, p[2]); z1b = Math.max(z1b, p[2]); }
      const czb = (z0b + z1b) / 2; rz = (z1b - z0b) / 2;
      const r0 = rx + .004, k = rz / rx, ht = Math.max(.118 * sc, hp(0, 90, o)[1] - yb + .014), hk = ht / .118;
      add(new T.LatheGeometry([[0, .118], [r0 * .7, .125], [r0 * .88, .118], [r0 * .93, .095], [r0 * .98, .03], [r0, 0]].map(([x, y]) => new T.Vector2(x, y * hk)).reverse(), 30), 1, g => { g.scale(1, 1, k); g.translate(0, yb - .004, czb); });
      add(new T.CylinderGeometry(r0 + .07 * sc, r0 + .075 * sc, .012, 40), 1, g => { g.scale(1, 1, k * 1.04); g.translate(0, yb - .002, czb); });
      add(new T.CylinderGeometry(r0 * .985 + .003, r0 + .003, .03 * hk, 30), .32, g => { g.scale(1, 1, k); g.translate(0, yb + .02 * hk, czb); });
      break;
    }
    case 'casco': {
      const o = K.gap + K.shell;
      add(dome(o));
      // el ala: sale del borde, más ancha adelante
      add(loft(a => { const e = F.line(a), b = hp(a, e, domeOff(o, 0) - .002), d = outH(b), w = (.022 + .034 * Math.max(0, Math.cos(peloDeg(a)))) * sc; return [shift(b, [0, -1, 0], .01), shift(shift(b, d, w), [0, -1, 0], .008), shift(shift(b, d, w), [0, 1, 0], .002), shift(b, [0, 1, 0], .004)]; }), 1);
      // la cresta: de la frente a la nuca por encima de la copa
      const NS = 24, rP = [], rI = [], ra = q => { const ph = 40 + 100 * q / NS, a = ph <= 90 ? 0 : 180, e = ph <= 90 ? ph : 180 - ph, s = (e - F.line(a)) / (90 - F.line(a)); return [a, e, s]; };
      for (let q = 0; q <= NS; q++) {
        const [a, e, s2] = ra(q), b = hp(a, e, domeOff(o, s2) - .003), n = peloNorm(peloAdd(b, F.H.C, -1)), h = .012 * Math.min(1, Math.sin(Math.PI * q / NS) * 3);
        for (const [x, u] of [[-1, 0], [-1, 1], [1, 1], [1, 0]]) rP.push(b[0] + x * .016 + n[0] * h * u, b[1] + n[1] * h * u, b[2] + n[2] * h * u);
      }
      for (let q = 0; q < NS; q++) for (let k = 0; k < 3; k++) { const a = q * 4 + k, b = a + 4; rI.push(a, a + 1, b + 1, a, b + 1, b); }
      add(mesh(rP, rI));
      break;
    }
    case 'casco_mil': {
      const o = K.gap + K.shell;
      add(dome(o));
      // el canto redondeado del borde
      add(loft(a => { const e = F.line(a), b = hp(a, e, domeOff(o, 0)), d = peloNorm(peloAdd(b, F.H.C, -1)); const r = .008; return [0, 1, 2, 3, 4, 5, 6].map(q => { const t = q / 6 * Math.PI * 2; return shift(shift(b, d, r * .4 + Math.cos(t) * r * .7), [0, 1, 0], Math.sin(t) * r); }); }), 1);
      break;
    }
    case 'lentes': case 'lentes_sol': {
      const ex = rh * .44, ez = H.ze + .014, ey = eye[1], rr = .019;
      for (const sx of [-1, 1]) {
        add(new T.TorusGeometry(rr, .0028, 6, 22), 1, g => g.translate(sx * ex, ey, ez));
        if (V.piece === 'lentes_sol') add(new T.CylinderGeometry(rr, rr, .003, 22), .35, g => { g.rotateX(Math.PI / 2); g.translate(sx * ex, ey, ez); });
        const hx = rh + .005, x0 = ex + rr;
        add(new T.BoxGeometry(hx - x0 + .004, .005, .005), 1, g => g.translate(sx * (x0 + hx) / 2, ey + .006, ez));
        const zb = cz - rd * .15, len = ez - zb;
        add(new T.BoxGeometry(.004, .005, len), 1, g => g.translate(sx * hx, ey + .006, ez - len / 2));
      }
      add(new T.CylinderGeometry(.0022, .0022, ex * 2 - rr * 2 + .004, 6), 1, g => { g.rotateZ(Math.PI / 2); g.translate(0, ey + .006, ez); });
      break;
    }
    case 'corbata': {
      const yT = L.neck - .02, yB = L.waist - .01, sh = new T.Shape();
      sh.moveTo(-.017, yT); sh.lineTo(.017, yT); sh.lineTo(.024, yT - .04); sh.lineTo(.043, yB + .045); sh.lineTo(0, yB); sh.lineTo(-.043, yB + .045); sh.lineTo(-.024, yT - .04); sh.closePath();
      add(new T.ExtrudeGeometry(sh, { depth: .004, bevelEnabled: false }), 1, g => {
        const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + vestFront(L, p.getY(i)) + .004);
        g.computeVertexNormals();
      });
      add(rbox(.034, .03, .02, .008).clone(), 1, g => g.translate(0, yT - .004, vestFront(L, yT) + .01));
      break;
    }
  }
  if (!G.length) return null;
  // todo en una malla con color por vértice (1 = el color de la prenda; menos, más oscuro)
  const nonIdx = G.map(([g, col]) => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); if (!n.attributes.normal) n.computeVertexNormals(); for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); const cnt = n.attributes.position.count, ca = new Float32Array(cnt * 3).fill(col); n.setAttribute('color', new T.BufferAttribute(ca, 3)); return n; });
  const tot = nonIdx.reduce((s, g) => s + g.attributes.position.count, 0), Pp = new Float32Array(tot * 3), Np = new Float32Array(tot * 3), Cp = new Float32Array(tot * 3);
  let o = 0; for (const g of nonIdx) { Pp.set(g.attributes.position.array, o); Np.set(g.attributes.normal.array, o); Cp.set(g.attributes.color.array, o); o += g.attributes.position.array.length; g.dispose(); }
  // del mundo en reposo al marco del hueso
  for (let i = 0; i < Pp.length; i += 3) { Pp[i] -= bh[0]; Pp[i + 1] -= bh[1]; Pp[i + 2] -= bh[2]; }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(Pp, 3)); geo.setAttribute('normal', new T.BufferAttribute(Np, 3)); geo.setAttribute('color', new T.BufferAttribute(Cp, 3));
  const BX = new Float32Array(Pp.length); for (let i = 0; i < Pp.length; i++) BX[i] = (Pp[i] - part.c[i % 3]) / part.s;
  geo.setAttribute('aBox', new T.BufferAttribute(BX, 3)); geo.setAttribute('aBN', geo.attributes.normal);
  geo.userData.det = null; geo.computeBoundingSphere();
  return geo;
}
