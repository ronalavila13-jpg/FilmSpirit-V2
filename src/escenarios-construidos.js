/* ============================================================
   ESCENARIOS CONSTRUIDOS Y ESCALA DEL ESCENARIO · lote W
   Un escenario construido es un escenario 3D más de P.sets3d, con kind: 'c'. No lleva modelo ni imagen: se dibuja
   con su lista de piezas (unos KB en el proyecto):
     P.sets3d[id] = { id, n, kind: 'c', v, loc, int, wh, wc, fc, walls, floor, items, b, h, esc }
       wh: alto de los muros (m); wc, fc: color de muros y piso
       walls: [{ x0, z0, x1, z1, t, h?, o: [{ k: 'p' | 'v', u, a, y0, y1 }] }]   un muro de punta a punta, su grosor y,
         en o, sus huecos: puerta (p) o ventana (v), con su centro a u metros de la punta (x0, z0), su ancho y de qué
         altura a qué altura van
       floor: [[x, z], …] el contorno del piso (sin él, la caja de los muros)
       items: [{ k, x, z, r, h?, w?, d?, hh? }]   k: un objeto del catálogo (S3_PROPS), 'vol' (una caja de w × d y hh de
         alto: mostrador, tarima, columna) o 'luz:<tipo>' (una luz de S3_LIGHTS, que entra al plano como una luz más)
       b: [x0, z0, x1, z1] lo que ocupa; h: el muro más alto
   Un plano lo usa igual que un importado: s3.set = 'modelo', s3.set3d = id; P.locSet3d[locación] = id.
   Escala (observación 11): P.sets3d[id].esc (importados y construidos) y P.plans[id].esc (planos de planta) agrandan o
   achican el escenario alrededor del centro de la escena; los escenarios hechos por código que se pueden escalar (los
   exteriores y la calle) guardan la suya en P.envEsc['<locación>|<escenario>']. Sin esc: tamaño original (1).
   ============================================================ */
const BS_MAX = 300;                  // piezas por escenario: muros, puertas y ventanas, muebles, objetos y luces
const BS_WH = 2.6, BS_T = .15;       // alto y grosor de un muro nuevo
const BS_WC = '#E9E5DD', BS_FC = '#DAD5CC';
const BS_OPEN = { p: { a: .9, y0: 0, y1: 2.1, n: 'Puerta' }, v: { a: 1.2, y0: .9, y1: 2.1, n: 'Ventana' } };
const BS_CUT = 1.5;                  // la planta: lo que corta un plano a 1,5 m del piso
const BS_HEX = /^#[0-9a-f]{6}$/i;
const bsIs = d => !!d && d.kind === 'c';
const bsR = v => Math.round(v * 100) / 100;
const bsNum = (v, a, b, def) => { v = +v; return isFinite(v) ? Math.min(b, Math.max(a, v)) : def; };
const bsLen = w => Math.hypot(w.x1 - w.x0, w.z1 - w.z0);
const bsWallH = (d, w) => w.h || d.wh || BS_WH;
/* un escenario vacío */
const bsNew = (n, loc) => ({ id: '', n: n || 'Escenario', kind: 'c', v: Date.now(), loc: loc || '', int: true, wh: BS_WH, wc: BS_WC, fc: BS_FC, walls: [], floor: [], items: [] });
/* cuántas piezas tiene (el tope es BS_MAX) */
const bsCount = d => (d.walls || []).reduce((a, w) => a + 1 + (w.o || []).length, 0) + (d.items || []).length;

/* ---------- escala ---------- */
const ESC_MIN = .25, ESC_MAX = 4;
const escClamp = v => { v = +v; return isFinite(v) && v > 0 ? Math.min(ESC_MAX, Math.max(ESC_MIN, Math.round(v * 100) / 100)) : 1; };
/* la escala de un escenario de P.sets3d o de un plano de planta de P.plans (1: tamaño original) */
const escOf = x => x && x.esc != null ? escClamp(x.esc) : 1;
/* los hechos por código que se escalan: la calle, los jardines y los paisajes. La habitación ya tiene su ancho, fondo y
   alto (sus muebles van contra los muros): esa es su escala. El interior de vehículo y el mar abierto (el bote) tienen su
   tamaño real (las figuras van en sus asientos), el exterior abierto es un piso con su cuadrícula de 1 m y el estudio,
   vacío: esos no */
const ENV_ESC_SETS = ['calle', 'parque', 'bosque', 'montana', 'playa', 'desierto', 'canaveral', 'jardin_d', 'jardin_t'];
/* la locación (del guion) de una escena 3D: la de su plano. Las escenas que no son de un plano guardado (la del editor,
   las de la planta general) se anotan con escLocSet */
const ESC_LOC = new WeakMap();
const escLocSet = (s3, loc) => { if (s3 && typeof s3 === 'object') ESC_LOC.set(s3, loc || ''); return s3; };
function escLocOf(s3) {
  if (!s3 || typeof P === 'undefined' || !P) return '';
  if (typeof EDT !== 'undefined' && EDT && EDT.s3 === s3 && EDT.s) return EDT.s.loc || '';
  const c = ESC_LOC.get(s3), rev = typeof S3REV !== 'undefined' ? S3REV : 0;
  if (c != null && (typeof c === 'string' || c.rev === rev)) return typeof c === 'string' ? c : '';
  // la de un plano guardado, la de su escena armada sola o la vista por su cámara B
  for (const sh of Object.values(P.shots || {})) {
    if (!sh || !(sh.s3 === s3 || (typeof S3D_C !== 'undefined' && (S3D_C.get(sh) || {}).s3 === s3) || (typeof SHB !== 'undefined' && ((SHB.get(sh) || {}).v || {}).s3 === s3))) continue;
    const s = typeof sceneOfKey === 'function' ? sceneOfKey(sh.sc) : null, l = s ? s.loc || '' : '';
    ESC_LOC.set(s3, l); return l;
  }
  ESC_LOC.set(s3, { rev });   // no es de un plano (todavía): se vuelve a buscar con el próximo cambio
  return '';
}
const envEscKey = (loc, set) => String(loc || '') + '|' + set;
/* la escala del escenario hecho por código de una escena (1 si no se escala) */
function envEscOf(s3) {
  if (!s3 || !ENV_ESC_SETS.includes(s3.set) || typeof P === 'undefined' || !P || !P.envEsc) return 1;
  const v = P.envEsc[envEscKey(escLocOf(s3), s3.set)];
  return v ? escClamp(v) : 1;
}
/* la escala del escenario de una escena, sea cual sea (para la planta, la vista 3D y las viñetas) */
function sceneEsc(s3) {
  if (!s3) return 1;
  if (s3.set === 'modelo') return escOf(typeof set3dOf === 'function' ? set3dOf(s3) : null);
  if (s3.set === 'plano') return escOf(typeof planOf === 'function' ? planOf(s3) : null);
  return envEscOf(s3);
}

/* ---------- muros, huecos y lo que ocupa ---------- */
/* los huecos de un muro, dentro de él, sin pisarse y en orden (los que no caben se dejan de lado); j: su lugar en w.o */
function bsOps(w, H = 99) {
  const L = bsLen(w), out = [];
  const L0 = (w.o || []).map((o, j) => {
    const a = Math.min(+o.a || .9, Math.max(0, L - .04)), y1 = Math.min(+o.y1 || 2.1, H - .02);
    return { ...o, j, a, y1, y0: Math.max(0, Math.min(+o.y0 || 0, y1 - .2)), u: Math.min(Math.max(+o.u || 0, a / 2 + .02), L - a / 2 - .02) };
  }).sort((p, q) => p.u - q.u);
  for (const o of L0) {
    const prev = out[out.length - 1];
    if (o.a < .2 || o.y1 - o.y0 < .2) continue;
    if (prev && o.u - o.a / 2 < prev.u + prev.a / 2 + .02) continue;
    out.push(o);
  }
  return out;
}
/* un muro en tramos macizos [u0, u1, y0, y1] (u: metros desde la punta x0, z0): entre los huecos, del piso al alto;
   sobre cada hueco, el dintel; debajo de una ventana, el antepecho */
function bsWallBoxes(w, H) {
  const L = bsLen(w), out = [];
  let u = 0;
  for (const o of bsOps(w, H)) {
    const a = o.u - o.a / 2, b = o.u + o.a / 2;
    if (a - u > .005) out.push([u, a, 0, H]);
    if (o.y0 > .005) out.push([a, b, 0, o.y0]);
    if (H - o.y1 > .005) out.push([a, b, o.y1, H]);
    u = b;
  }
  if (L - u > .005) out.push([u, L, 0, H]);
  return out;
}
/* el muro más cercano a un punto: { i, u (a lo largo del muro), dist }, si está a menos de max metros de su eje */
function bsNearWall(d, x, z, max = .6) {
  let best = null;
  (d.walls || []).forEach((w, i) => {
    const L = bsLen(w); if (L < .05) return;
    const ux = (w.x1 - w.x0) / L, uz = (w.z1 - w.z0) / L, u = (x - w.x0) * ux + (z - w.z0) * uz;
    if (u < -.05 || u > L + .05) return;
    const dist = Math.abs((x - w.x0) * -uz + (z - w.z0) * ux);
    if (dist <= Math.max(max, (w.t || BS_T) / 2 + .05) && (!best || dist < best.dist)) best = { i, u: Math.min(L, Math.max(0, u)), dist };
  });
  return best;
}
/* poner una puerta o una ventana en el muro i, centrada en u (se corre si choca con otra o con la punta). null: no cabe */
function bsOpenAdd(d, i, u, k) {
  const w = d.walls[i]; if (!w || !BS_OPEN[k]) return null;
  const L = bsLen(w), D = BS_OPEN[k], a = Math.min(D.a, L - .1);
  if (a < .4) return null;
  const busy = bsOps(w, bsWallH(d, w)).map(o => [o.u - o.a / 2 - .03, o.u + o.a / 2 + .03]);
  const free = c => c - a / 2 >= .02 && c + a / 2 <= L - .02 && !busy.some(([p, q]) => c + a / 2 > p && c - a / 2 < q);
  let c = Math.min(Math.max(u, a / 2 + .02), L - a / 2 - .02);
  if (!free(c)) {
    // el lugar libre más cercano
    const cand = [a / 2 + .02, L - a / 2 - .02, ...busy.flatMap(([p, q]) => [p - a / 2, q + a / 2])].filter(free).sort((p, q) => Math.abs(p - u) - Math.abs(q - u));
    if (!cand.length) return null;
    c = cand[0];
  }
  const o = { k, u: bsR(c), a: bsR(a), y0: D.y0, y1: Math.min(D.y1, bsWallH(d, w) - .05) };
  (w.o = w.o || []).push(o);
  return o;
}
/* lo que ocupa un objeto en la planta: { w, d, name } */
function bsItemFp(it) {
  if (it.k === 'vol') return { w: +it.w || 1, d: +it.d || 1, name: 'Volumen' };
  if (/^luz:/.test(it.k)) { const L = typeof S3_LIGHTS !== 'undefined' && S3_LIGHTS[it.k.slice(4)]; return { w: .3, d: .3, name: L ? L.name.split(' (')[0] : 'Luz' }; }
  const fp = typeof S3_PROPS !== 'undefined' && S3_PROPS[it.k];
  return fp ? { w: fp.w || .5, d: fp.d || .5, name: fp.name } : { w: .5, d: .5, name: it.k };
}
/* lo que ocupa el escenario [x0, z0, x1, z1] y su alto */
function bsBounds(d) {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity, h = 0;
  const add = (x, z, r = 0) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); z0 = Math.min(z0, z - r); z1 = Math.max(z1, z + r); };
  for (const w of d.walls || []) { const r = (w.t || BS_T) / 2; add(w.x0, w.z0, r); add(w.x1, w.z1, r); h = Math.max(h, bsWallH(d, w)); }
  for (const p of d.floor || []) add(p[0], p[1]);
  for (const it of d.items || []) { const f = bsItemFp(it); add(it.x, it.z, Math.max(f.w, f.d) / 2); if (it.k === 'vol') h = Math.max(h, +it.hh || 1); }
  if (!isFinite(x0)) return { b: [-3, -3, 3, 3], h: d.wh || BS_WH };
  // hacia afuera (que no corte el borde de un muro)
  const out = (v, s) => (s < 0 ? Math.floor : Math.ceil)(Math.round(v * 1e6) / 1e4) / 100;
  return { b: [out(x0, -1), out(z0, -1), out(x1, 1), out(z1, 1)], h: bsR(h || d.wh || BS_WH) };
}
/* el contorno del piso: el dibujado o, si no hay, la caja de los muros */
function bsFloorPts(d) {
  if ((d.floor || []).length >= 3) return d.floor;
  if (!(d.walls || []).length) return [];
  const W = { ...d, floor: [], items: [] }, b = bsBounds(W).b;
  return [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
}
/* lo guardado o lo que llega del equipo: solo números válidos, colores válidos y hasta BS_MAX piezas */
function bsClean(d) {
  if (!d || typeof d !== 'object') return null;
  const C = v => bsNum(v, -500, 500, 0);
  d.kind = 'c';
  d.n = String(d.n || 'Escenario').slice(0, 80);
  d.wh = bsNum(d.wh, 1, 12, BS_WH);
  d.wc = BS_HEX.test(d.wc || '') ? d.wc : BS_WC; d.fc = BS_HEX.test(d.fc || '') ? d.fc : BS_FC;
  let n = 0;
  d.walls = (Array.isArray(d.walls) ? d.walls : []).filter(w => w && typeof w === 'object').map(w => {
    const o = { x0: C(w.x0), z0: C(w.z0), x1: C(w.x1), z1: C(w.z1), t: bsNum(w.t, .03, 1.5, BS_T) };
    if (w.h != null && +w.h > 0) o.h = bsNum(w.h, .3, 12, d.wh);
    o.o = (Array.isArray(w.o) ? w.o : []).filter(q => q && BS_OPEN[q.k]).slice(0, 20).map(q => ({ k: q.k, u: bsNum(q.u, 0, 1000, 0), a: bsNum(q.a, .2, 20, BS_OPEN[q.k].a), y0: bsNum(q.y0, 0, 11, BS_OPEN[q.k].y0), y1: bsNum(q.y1, .2, 12, BS_OPEN[q.k].y1) }));
    return o;
  }).filter(w => bsLen(w) >= .05).filter(w => (n += 1 + w.o.length) <= BS_MAX);
  d.floor = (Array.isArray(d.floor) ? d.floor : []).filter(p => Array.isArray(p) && p.length >= 2).slice(0, 200).map(p => [C(p[0]), C(p[1])]);
  if (d.floor.length < 3) d.floor = [];
  d.items = (Array.isArray(d.items) ? d.items : []).filter(it => it && typeof it.k === 'string' && /^[\w:]{1,32}$/.test(it.k)).map(it => {
    const o = { k: it.k, x: C(it.x), z: C(it.z), r: Math.round(bsNum(it.r, -360, 360, 0)) };
    if (it.h != null && +it.h) o.h = bsNum(it.h, 0, 10, 0);
    if (it.k === 'vol') { o.w = bsNum(it.w, .05, 40, 1); o.d = bsNum(it.d, .05, 40, 1); o.hh = bsNum(it.hh, .05, 12, 1); }
    return o;
  }).slice(0, Math.max(0, BS_MAX - n));
  if (d.int != null) d.int = !!d.int;
  if (d.esc != null) { d.esc = escClamp(d.esc); if (d.esc === 1) delete d.esc; }
  const B = bsBounds(d); d.b = B.b; d.h = B.h;
  return d;
}

/* ---------- en la vista 3D ---------- */
/* las cajas de los muros en una sola malla (muros y dinteles: una llamada de dibujo para todos) */
function bsWallGeo(d) {
  const T = THREE, P3 = [], N3 = [], I = [];
  const quad = (a, b, c, e, n) => { const k = P3.length / 3; P3.push(...a, ...b, ...c, ...e); for (let i = 0; i < 4; i++) N3.push(...n); I.push(k, k + 1, k + 2, k, k + 2, k + 3); };
  for (const w of d.walls || []) {
    const L = bsLen(w); if (L < .05) continue;
    const ux = (w.x1 - w.x0) / L, uz = (w.z1 - w.z0) / L, nx = -uz, nz = ux, t = (w.t || BS_T) / 2, H = bsWallH(d, w);
    for (let [u0, u1, y0, y1] of bsWallBoxes(w, H)) {
      // las puntas del muro se alargan medio grosor: así dos muros que se juntan cierran la esquina
      if (u0 <= .005) u0 = -t; if (u1 >= L - .005) u1 = L + t;
      const p = (u, s, y) => [w.x0 + ux * u + nx * s, y, w.z0 + uz * u + nz * s];
      const A = p(u0, -t, y0), B = p(u1, -t, y0), Cc = p(u1, t, y0), D = p(u0, t, y0), A2 = p(u0, -t, y1), B2 = p(u1, -t, y1), C2 = p(u1, t, y1), D2 = p(u0, t, y1);
      quad(A2, D2, C2, B2, [0, 1, 0]); quad(A, B, Cc, D, [0, -1, 0]);
      quad(D, Cc, C2, D2, [nx, 0, nz]); quad(B, A, A2, B2, [-nx, 0, -nz]);
      quad(A, D, D2, A2, [-ux, 0, -uz]); quad(Cc, B, B2, C2, [ux, 0, uz]);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(P3, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N3, 3)); g.setIndex(I);
  g.computeBoundingSphere();
  return g;
}
const BS_MATS = {};
function bsMat(key, make) { return BS_MATS[key] || (BS_MATS[key] = make()); }
/* el escenario armado: piso, muros (una malla y sus aristas), vidrios de las ventanas, volúmenes y muebles (unidos por
   material: los repetidos se dibujan juntos). Las luces no: entran al plano como luces (bsLights) */
function bsBuild(d, o = {}) {
  const T = THREE, G = new T.Group(), own = [];
  // piso
  const fp = bsFloorPts(d);
  if (fp.length >= 3) {
    const sh = new T.Shape(fp.map(p => new T.Vector2(p[0], -p[1])));
    const fg = new T.ShapeGeometry(sh); own.push(fg);
    const fm = toon(d.fc || BS_FC); own.push(fm);
    const fl = new T.Mesh(fg, fm); fl.rotation.x = -Math.PI / 2; fl.position.y = .002; fl.receiveShadow = true; fl.userData.noOutline = true; G.add(fl);
  }
  // muros
  if ((d.walls || []).length) {
    const wg = bsWallGeo(d), wm = toon(d.wc || BS_WC); own.push(wg, wm);
    wm.polygonOffset = true; wm.polygonOffsetFactor = 1; wm.polygonOffsetUnits = 1;
    const wall = new T.Mesh(wg, wm); wall.castShadow = !o.noShadow; wall.receiveShadow = true; wall.userData.noOutline = true; G.add(wall);
    const eg = new T.EdgesGeometry(wg, 30); own.push(eg);
    const L = new T.LineSegments(eg, o.lineMat || (typeof set3dInk === 'function' ? set3dInk() : new T.LineBasicMaterial({ color: '#26262B' }))); L.userData.noOutline = true; L.userData.e3edge = true; G.add(L);
    // los vidrios de las ventanas
    const gm = bsMat('glass', () => new T.MeshBasicMaterial({ color: '#BFD6E6', transparent: true, opacity: .25, depthWrite: false, side: T.DoubleSide }));
    for (const w of d.walls) {
      const Lw = bsLen(w), ux = (w.x1 - w.x0) / Lw, uz = (w.z1 - w.z0) / Lw;
      for (const q of bsOps(w, bsWallH(d, w))) {
        if (q.k !== 'v') continue;
        const pg = new T.PlaneGeometry(q.a, q.y1 - q.y0); own.push(pg);
        const m = new T.Mesh(pg, gm); m.position.set(w.x0 + ux * q.u, (q.y0 + q.y1) / 2, w.z0 + uz * q.u); m.rotation.y = -Math.atan2(uz, ux); m.userData.noOutline = true; G.add(m);
      }
    }
  }
  // volúmenes y muebles
  const inner = new T.Group(); G.add(inner);
  for (const it of d.items || []) {
    if (/^luz:/.test(it.k)) continue;
    let g;
    if (it.k === 'vol') {
      const hh = +it.hh || 1;
      g = new T.Group(); const m = new T.Mesh(rbox(+it.w || 1, hh, +it.d || 1, .015), R3.mats.prop); m.position.y = hh / 2; g.add(m);
    } else {
      if (typeof S3_PROPS === 'undefined' || !S3_PROPS[it.k]) continue;
      const E = makeProp(it.k); g = E.inner;
      for (const c of [...g.children]) if (c.userData.ol) g.remove(c);   // el contorno se pone después, a todo junto
    }
    g.position.set(it.x, it.h || 0, it.z); g.rotation.y = rad(it.r || 0);
    inner.add(g);
  }
  inner.traverse(m => { if (m.isMesh && !m.material.transparent) { m.castShadow = !o.noShadow; m.receiveShadow = true; } });
  if (inner.children.length) { propMerge(inner, {}, null); outlineAll(inner); }
  G.userData.own = own;
  return G;
}
/* soltar lo que armó bsBuild (las geometrías unidas de los muebles también: son propias) */
function bsDispose(G) {
  if (!G) return;
  for (const x of G.userData.own || []) x.dispose();
  G.traverse(m => { if (m.isMesh && m.geometry && !m.geometry.userData.shared && typeof disposable === 'function' && disposable(m.geometry) && !(G.userData.own || []).includes(m.geometry)) m.geometry.dispose(); });
}
/* el escenario construido en la escena (lo llama set3dSync): se arma una vez por versión */
function bsSync(s3, d) {
  const T = THREE;
  let G = R3.sets.modelo;
  if (!G) {
    G = R3.sets.modelo = new T.Group(); G.visible = false; R3.scene.add(G);
    const fl = new T.Mesh(new T.PlaneGeometry(600, 600), toon(C3.floorExt)); fl.rotation.x = -Math.PI / 2; fl.position.y = -.03; fl.receiveShadow = true; G.add(fl);
    G.userData.ground = fl;
  }
  const U = G.userData, key = 'c' + d.id + ':' + d.v + ':' + escOf(d);
  if (U.key !== key) {
    U.key = key;
    if (U.hold) { G.remove(U.hold); if (U.bs) bsDispose(U.hold); U.hold = null; }
    U.ground.material.color.set(d.int !== false ? C3.ground : C3.floorExt);
    U.hold = bsBuild(d); U.hold.scale.setScalar(escOf(d)); U.bs = true; G.add(U.hold);
    R3.shSig = null;
  }
  return true;
}
/* las luces del escenario construido, como luces del plano (se mueven y se ajustan como cualquier otra). Las de otro
   escenario construido se van; las que ya están no se tocan (pueden estar ajustadas en el plano) */
function bsLights(s3, d) {
  if (!s3 || !Array.isArray(s3.objs)) return s3;
  const own = bsIs(d) ? (d.items || []).map((it, i) => [it, 'bl' + i + '_' + d.id]).filter(([it]) => /^luz:/.test(it.k)) : [];
  const keep = new Set(own.map(x => x[1]));
  for (const ob of [...s3.objs]) if (ob.bs && !keep.has(ob.id)) s3DelObj(s3, ob.id);
  const k = escOf(d);
  for (const [it, id] of own) {
    if (s3.objs.some(o => o.id === id)) continue;
    const type = S3_LIGHTS[it.k.slice(4)] ? it.k.slice(4) : 'practica', L = S3_LIGHTS[type];
    const n = s3.objs.filter(o => o.kind === 'luz').length + 1;
    s3AddObj(s3, { id, kind: 'luz', type, name: L.name.split(' ')[0] + ' ' + n, aim: null, bs: d.id }, { x: bsR(it.x * k), z: bsR(it.z * k), rot: Math.round(it.r || 0), h: it.h || L.h, tilt: L.tilt, int: L.int, k: L.k, ang: L.ang });
    if (!s3.light) s3.light = { mode: 'sim', amb: .22, rig: true };
    s3.light.mode = 'sim';
  }
  return s3;
}

/* ---------- en la planta ---------- */
const BS_PC = { floor: '#ECE7DE', wall: '#5B6070', open: '#2A2D33', item: '#E4DED2', itemLine: '#968E80', text: '#7B8089', vol: '#D9D2C4' };
/* el escenario visto desde arriba, cortado a 1,5 m: piso, muros (con sus vanos), puertas con su giro, ventanas,
   volúmenes y muebles con su nombre; sel: { w, o, it } lo elegido en el constructor */
function bsDrawPlan(ctx, d, toS, V, o = {}) {
  const k = o.esc || 1, S = (x, z) => toS(x * k, z * k), px = m => m * k * V.sc;
  ctx.save();
  const fp = bsFloorPts(d);
  if (fp.length >= 3) { ctx.beginPath(); fp.forEach((p, i) => { const [x, y] = S(p[0], p[1]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); ctx.fillStyle = o.floorCol || BS_PC.floor; ctx.fill(); }
  // muebles y volúmenes, debajo de los muros
  const lab = [];
  (d.items || []).forEach((it, i) => {
    if (o.lights === false && /^luz:/.test(it.k)) return;   // en la planta del plano, sus luces son las del plano
    const f = bsItemFp(it), [sx, sy] = S(it.x, it.z), on = o.sel && o.sel.it === i;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-rad(it.r || 0));
    if (/^luz:/.test(it.k)) {
      ctx.fillStyle = '#F2C14E'; ctx.strokeStyle = on ? '#2C47CF' : '#9A7A2A'; ctx.lineWidth = on ? 2.2 : 1.2;
      ctx.beginPath(); ctx.arc(0, 0, Math.max(5, px(.15)), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.fillStyle = it.k === 'vol' ? BS_PC.vol : BS_PC.item; ctx.strokeStyle = on ? '#2C47CF' : BS_PC.itemLine; ctx.lineWidth = on ? 2.2 : 1.1;
      ctx.fillRect(-px(f.w) / 2, -px(f.d) / 2, px(f.w), px(f.d)); ctx.strokeRect(-px(f.w) / 2, -px(f.d) / 2, px(f.w), px(f.d));
      if (it.k === 'vol') { ctx.beginPath(); ctx.moveTo(-px(f.w) / 2, -px(f.d) / 2); ctx.lineTo(px(f.w) / 2, px(f.d) / 2); ctx.moveTo(px(f.w) / 2, -px(f.d) / 2); ctx.lineTo(-px(f.w) / 2, px(f.d) / 2); ctx.stroke(); }
      // el frente del mueble (hacia donde mira)
      if (it.k !== 'vol' && o.fronts) { ctx.beginPath(); ctx.moveTo(-4, px(f.d) / 2 + 3); ctx.lineTo(0, px(f.d) / 2 + 7); ctx.lineTo(4, px(f.d) / 2 + 3); ctx.stroke(); }
    }
    ctx.restore();
    if (o.labels !== false && px(Math.max(f.w, f.d)) > 26) lab.push([f.name, sx, sy + 3]);
  });
  // muros: lo que corta el plano a 1,5 m; los vanos, abiertos
  (d.walls || []).forEach((w, i) => {
    const L = bsLen(w); if (L < .05) return;
    const ux = (w.x1 - w.x0) / L, uz = (w.z1 - w.z0) / L, nx = -uz, nz = ux, t = (w.t || BS_T) / 2, H = bsWallH(d, w);
    const quad = (u0, u1) => { const P4 = [[u0, -t], [u1, -t], [u1, t], [u0, t]].map(([u, s]) => S(w.x0 + ux * u + nx * s, w.z0 + uz * u + nz * s)); ctx.beginPath(); P4.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); };
    const on = o.sel && o.sel.w === i;
    ctx.fillStyle = on ? '#2C47CF' : o.wallCol || BS_PC.wall;
    for (let [u0, u1, y0, y1] of bsWallBoxes(w, H)) {
      if (y0 > BS_CUT || y1 < BS_CUT) continue;
      if (u0 <= .005) u0 = -t; if (u1 >= L - .005) u1 = L + t;
      quad(u0, u1); ctx.fill();
    }
    // puertas (la hoja y su giro) y ventanas (dos rayas finas)
    for (const q of bsOps(w, H)) {
      const a = q.u - q.a / 2, b = q.u + q.a / 2, act = o.sel && o.sel.w === i && o.sel.o === q.j;
      ctx.strokeStyle = act ? '#2C47CF' : BS_PC.open; ctx.lineWidth = act ? 2 : 1.1;
      if (q.k === 'v') {
        for (const s of [-t * .4, t * .4]) { const [x1, y1] = S(w.x0 + ux * a + nx * s, w.z0 + uz * a + nz * s), [x2, y2] = S(w.x0 + ux * b + nx * s, w.z0 + uz * b + nz * s); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
        // los marcos
        for (const u of [a, b]) { const [x1, y1] = S(w.x0 + ux * u - nx * t, w.z0 + uz * u - nz * t), [x2, y2] = S(w.x0 + ux * u + nx * t, w.z0 + uz * u + nz * t); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      } else {
        const [hx, hy] = S(w.x0 + ux * a + nx * t, w.z0 + uz * a + nz * t), [ex, ey] = S(w.x0 + ux * a + nx * (t + q.a), w.z0 + uz * a + nz * (t + q.a));
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
        const [bx, by] = S(w.x0 + ux * b + nx * t, w.z0 + uz * b + nz * t), r = Math.hypot(ex - hx, ey - hy), a0 = Math.atan2(by - hy, bx - hx), a1 = Math.atan2(ey - hy, ex - hx);
        ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(hx, hy, r, a0, a1, ((a1 - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI < 0); ctx.stroke(); ctx.setLineDash([]);
      }
    }
  });
  ctx.fillStyle = BS_PC.text; ctx.font = '600 10px Archivo, Arial, sans-serif'; ctx.textAlign = 'center';
  for (const [t, x, y] of lab) ctx.fillText(t, x, y);
  ctx.restore();
}

/* al abrir el proyecto y lo que llega del equipo: los escenarios construidos con sus piezas en orden, la escala de cada
   escenario y la de los hechos por código */
function bsNormalize(Px) {
  if (!Px || typeof Px !== 'object') return Px;
  if (Px.sets3d && typeof Px.sets3d === 'object') for (const [id, d] of Object.entries(Px.sets3d)) {
    if (!d || typeof d !== 'object') { delete Px.sets3d[id]; continue; }
    if (d.kind === 'c') { bsClean(d); d.id = id; }
    else if (d.esc != null) { d.esc = escClamp(d.esc); if (d.esc === 1) delete d.esc; }
  }
  if (Px.plans && typeof Px.plans === 'object') for (const pl of Object.values(Px.plans)) if (pl && typeof pl === 'object' && pl.esc != null) { pl.esc = escClamp(pl.esc); if (pl.esc === 1) delete pl.esc; }
  if (Px.envEsc != null) {
    const o = {};
    if (typeof Px.envEsc === 'object' && !Array.isArray(Px.envEsc)) for (const [k, v] of Object.entries(Px.envEsc)) { const m = /\|(\w+)$/.exec(k); if (m && ENV_ESC_SETS.includes(m[1]) && k.length <= 160 && escClamp(v) !== 1) o[k] = escClamp(v); }
    if (Object.keys(o).length) Px.envEsc = o; else delete Px.envEsc;
  }
  return Px;
}

if (typeof module !== 'undefined') module.exports = { bsNormalize, bsOps, bsWallBoxes, bsNearWall, bsOpenAdd, bsBounds, bsClean, bsCount, bsFloorPts, bsNew, escClamp, escOf, envEscOf, sceneEsc, BS_MAX };
