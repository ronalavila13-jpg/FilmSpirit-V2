/* ============================================================
   EXTRAS EN GRUPO · un objeto «gente» con su cantidad y su situación
   ob = { kind: 'gente', name, n, sit, dens, ropa, seed }; su estado en cada clave es el de un objeto
   (x, z, rot): se mueve y se gira entero. El frente del grupo es su +z, como el de una figura.
   Mientras más extras, menos detalle: hasta 6 se agregan como figuras sueltas (completas, cada una con su
   postura); hasta 40, figuras simples con la postura de la situación; más, siluetas. Todas sin rostro.
   ============================================================ */
const GENTE_MAX = 500, GENTE_SUELTOS = 6, GENTE_SIMPLE = 40;
/* dens: personas por m²; ratio: ancho/fondo del área; lay: cómo se acomodan; face: hacia dónde miran */
const GENTE_SIT = {
  concierto: { name: 'Concierto', dens: 2.2, ratio: 1.5, lay: 'grid', jit: .42, face: 'front', poses: [['pie', 5], ['brazos', 3], ['salta', 2]] },
  protesta: { name: 'Protesta', dens: 1.6, ratio: .9, lay: 'grid', jit: .36, face: 'front', poses: [['camina', 6], ['brazos', 2], ['senala', 2]] },
  uniforme: { name: 'Público uniforme', dens: 1.6, ratio: 1.6, lay: 'rows', jit: 0, face: 'front', poses: [['pie', 1]] },
  sentado: { name: 'Público sentado', dens: 1.25, ratio: 1.8, lay: 'rows', jit: 0, face: 'front', poses: [['sentado', 1]] },
  maraton: { name: 'Maratón', dens: .8, ratio: .35, lay: 'grid', jit: .75, face: 'front', poses: [['corre', 1]] },
  feria: { name: 'Feria', dens: .45, ratio: 1.2, lay: 'groups', face: 'groups', poses: [['pie', 4], ['camina', 3], ['cruzados', 2], ['senala', 1]] },
  calle: { name: 'Transeúntes', dens: .22, ratio: .7, lay: 'scatter', face: 'twoway', poses: [['camina', 1]] },
  fila: { name: 'Fila', lay: 'line', face: 'front', poses: [['pie', 4], ['cruzados', 1]] },
  fiesta: { name: 'Fiesta', dens: 1.7, ratio: 1.1, lay: 'grid', jit: .5, face: 'random', poses: [['baila', 5], ['salta', 2], ['pie', 3]] },
};
const GENTE_SITS = Object.entries(GENTE_SIT).map(([k, v]) => [k, v.name]);
const GENTE_DENS = { apretados: [1.5, 'Apretados'], normal: [1, 'Normal'], sueltos: [.55, 'Sueltos'] };
const GENTE_ROPA = ['#5E6B7D', '#8A5A4A', '#3F5F4E', '#7A6A8C', '#9C8456', '#4E5A63', '#A2675E', '#5A6E8A', '#6E7A55', '#857266', '#B39B7A', '#3E4A5C'];
const genteNorm = ob => {
  ob.n = clamp(Math.round(num(ob.n) || 20), 1, GENTE_MAX);
  if (!GENTE_SIT[ob.sit]) ob.sit = 'concierto';
  if (!GENTE_DENS[ob.dens]) ob.dens = 'normal';
  if (ob.ropa !== 'gris') delete ob.ropa;
  ob.seed = Math.abs(Math.round(num(ob.seed))) % 100000;
  return ob;
};
const genteKey = ob => [ob.n, ob.sit, ob.dens, ob.seed || 0, ob.ropa || ''].join('|');
const genteLod = n => n <= GENTE_SIMPLE ? 'simple' : 'silueta';
/* un número entre 0 y 1 fijo para cada persona: agregar gente no cambia de lugar a los que ya estaban */
function genteRnd(seed, i, salt) {
  let h = (seed * 374761393 + i * 668265263 + salt * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const GENTE_LAY = new Map();
/* dónde va cada uno (en el marco del grupo, centrado en 0,0), hacia dónde mira, con qué postura, alto y color */
function genteLayout(ob0) {
  const ob = genteNorm({ ...ob0 }), k = genteKey(ob);
  if (GENTE_LAY.has(k)) return GENTE_LAY.get(k);
  const S = GENTE_SIT[ob.sit], n = ob.n, f = GENTE_DENS[ob.dens][0], seed = ob.seed || 0;
  const R = (i, s) => genteRnd(seed, i, s);
  const pts = [];
  const tot = S.poses.reduce((a, p) => a + p[1], 0);
  const poseOf = i => { let r = R(i, 7) * tot; for (const [p, w] of S.poses) { if ((r -= w) < 0) return p; } return S.poses[0][0]; };
  const faceJit = i => (R(i, 5) - .5) * (S.jit || .3) * 50;
  if (S.lay === 'line') {
    const per = Math.min(n, 30), files = Math.ceil(n / per), gap = .75 / Math.sqrt(f);
    for (let i = 0; i < n; i++) {
      const fi = Math.floor(i / per), j = i % per, cnt = Math.min(per, n - fi * per);
      pts.push({ x: (fi - (files - 1) / 2) * 1.1 + (R(i, 1) - .5) * .12, z: ((cnt - 1) / 2 - j) * gap + (R(i, 2) - .5) * .1, rot: faceJit(i) * .4 });
    }
  } else if (S.lay === 'groups') {
    const area = n / (S.dens * f), w = Math.sqrt(area * S.ratio), d = area / w;
    let i = 0, g = 0;
    while (i < n) {
      const size = Math.min(n - i, 2 + Math.floor(R(g, 11) * 4)), cx = (R(g, 12) - .5) * w, cz = (R(g, 13) - .5) * d, r0 = .42 + size * .07, a0 = R(g, 14) * Math.PI * 2;
      for (let k2 = 0; k2 < size; k2++, i++) {
        const a = a0 + k2 / size * Math.PI * 2;
        const x = cx + Math.cos(a) * r0, z = cz + Math.sin(a) * r0;
        pts.push({ x, z, rot: Math.atan2(cx - x, cz - z) * 180 / Math.PI + (R(i, 5) - .5) * 30 });
      }
      g++;
    }
  } else if (S.lay === 'scatter') {
    const area = n / (S.dens * f), w = Math.sqrt(area * S.ratio), d = area / w;
    for (let i = 0; i < n; i++) {
      const x = (R(i, 1) - .5) * w, z = (R(i, 2) - .5) * d;
      pts.push({ x, z, rot: (x < 0 ? 0 : 180) + (R(i, 5) - .5) * 24 });
    }
  } else {
    // en cuadrícula (con un desorden propio de cada situación) o en filas parejas
    const s = Math.sqrt(1 / (S.dens * f)), rows = S.lay === 'rows';
    const dx = rows ? s * .85 : s, dz = rows ? s * 1.25 : s;
    const cols = Math.max(1, Math.round(Math.sqrt(n * S.ratio * dz / dx))), nr = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c = i % cols, cnt = Math.min(cols, n - r * cols);
      const jx = (R(i, 1) - .5) * (S.jit || 0) * dx, jz = (R(i, 2) - .5) * (S.jit || 0) * dz;
      const rot = S.face === 'random' ? R(i, 6) * 360 : faceJit(i);
      pts.push({ x: (c - (cnt - 1) / 2) * dx + jx, z: ((nr - 1) / 2 - r) * dz + jz, rot });
    }
  }
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  pts.forEach((m, i) => {
    m.pose = poseOf(i); m.sc = .93 + R(i, 8) * .13;
    m.col = ob.ropa === 'gris' ? '#9AA1AA' : GENTE_ROPA[Math.floor(R(i, 9) * GENTE_ROPA.length)];
    x0 = Math.min(x0, m.x); x1 = Math.max(x1, m.x); z0 = Math.min(z0, m.z); z1 = Math.max(z1, m.z);
  });
  // el grupo queda centrado en su punto
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  for (const m of pts) { m.x = round2(m.x - mx); m.z = round2(m.z - mz); m.rot = Math.round(m.rot); }
  const L = { pts, w: round2(x1 - x0 + .7), d: round2(z1 - z0 + .7), lod: genteLod(n), sit: S };
  if (GENTE_LAY.size > 60) GENTE_LAY.clear();
  GENTE_LAY.set(k, L);
  return L;
}
/* la huella en la planta (para elegirlo, girarlo y su asa) */
function objFoot(ob) {
  if (ob.kind === 'actor') return { w: .52, d: .52, name: ob.name || 'Figura' };
  if (ob.kind === 'gente') { const L = genteLayout(ob); return { w: L.w, d: L.d, name: ob.name || 'Extras' }; }
  return S3_PROPS[ob.kind] || { w: .5, d: .5, name: ob.kind };
}
const genteLabel = ob => `${ob.name || 'Extras'} · ${ob.n} · ${(GENTE_SIT[ob.sit] || GENTE_SIT.concierto).name.toLowerCase()}`;

/* ---------- en 3D: una malla por postura, repetida para cada persona (InstancedMesh) ---------- */
const GENTE_GEO = new Map();
let GENTE_MAT = null, GENTE_SELM = null;
/* las piezas de un objeto (en su propio espacio) en una sola geometría: posición y normal */
function genteMerge(root, skip) {
  const T = THREE, list = [];
  root.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(root.matrixWorld).invert();
  root.traverse(o => { if (o.isMesh && o.visible && !skip.has(o) && o.geometry && o.geometry.attributes.position) { let vis = true; for (let q = o; q && q !== root; q = q.parent) if (!q.visible) vis = false; if (vis) list.push(o); } });
  let nv = 0, ni = 0;
  for (const o of list) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const P3 = new Float32Array(nv * 3), N3 = new Float32Array(nv * 3), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const m = new T.Matrix4(), nm = new T.Matrix3(), v = new T.Vector3();
  let vo = 0, io = 0;
  for (const o of list) {
    const g = o.geometry, pa = g.attributes.position, na = g.attributes.normal || (() => { const c = g.clone(); c.computeVertexNormals(); return c.attributes.normal; })();
    m.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m);
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(m); P3[(vo + i) * 3] = v.x; P3[(vo + i) * 3 + 1] = v.y; P3[(vo + i) * 3 + 2] = v.z;
      v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); N3[(vo + i) * 3] = v.x; N3[(vo + i) * 3 + 1] = v.y; N3[(vo + i) * 3 + 2] = v.z;
    }
    const flip = m.determinant() < 0, cnt = g.index ? g.index.count : pa.count, at = j => g.index ? g.index.getX(j) : j;
    for (let j = 0; j < cnt; j += 3) { const a = at(j), b = at(j + 1), c = at(j + 2); I[io++] = a + vo; I[io++] = (flip ? c : b) + vo; I[io++] = (flip ? b : c) + vo; }
    vo += pa.count;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(P3, 3)); geo.setAttribute('normal', new T.BufferAttribute(N3, 3)); geo.setIndex(new T.BufferAttribute(I, 1));
  geo.computeBoundingSphere(); geo.computeBoundingBox();
  return geo;
}
/* siluetas (más de 40): de pie, con los brazos arriba, sentada o dando un paso; pocas caras */
const GENTE_SIL = { brazos: 'brazos', salta: 'brazos', baila: 'brazos', sentado: 'sentado', camina: 'paso', corre: 'paso' };
function genteSilGeo(kind) {
  const T = THREE, root = new T.Group(), m = new T.MeshBasicMaterial();
  const cap = (r, len, x, y, z, rx = 0, rz = 0) => { const o = new T.Mesh(new T.CapsuleGeometry(r, len, 2, 7), m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); root.add(o); return o; };
  const sph = (r, x, y, z) => { const o = new T.Mesh(new T.SphereGeometry(r, 8, 6), m); o.position.set(x, y, z); root.add(o); };
  if (kind === 'sentado') {
    cap(.17, .34, 0, .86, -.04); cap(.08, .34, -.09, .5, .14, Math.PI / 2); cap(.08, .34, .09, .5, .14, Math.PI / 2);
    cap(.07, .3, -.09, .24, .3); cap(.07, .3, .09, .24, .3); sph(.115, 0, 1.3, -.02);
  } else {
    cap(.17, .44, 0, 1.12, 0);
    if (kind === 'paso') { cap(.075, .58, -.08, .44, 0, .32); cap(.075, .58, .08, .44, 0, -.32); }
    else { cap(.075, .58, -.08, .44, 0); cap(.075, .58, .08, .44, 0); }
    if (kind === 'brazos') { cap(.05, .5, -.22, 1.62, 0, 0, .32); cap(.05, .5, .22, 1.62, 0, 0, -.32); }
    sph(.12, 0, 1.6, 0);
  }
  const geo = genteMerge(root, new Set());
  root.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
  return geo;
}
/* figuras simples (hasta 40): el maniquí simple del programa, sin rostro, con la postura de la situación */
function genteSimpleGeo(pose) {
  const look = lookOf({ kind: 'actor', name: 'Extra', look: { body: 'extra', ropa: 'pantalon' } });
  const A = makeSimpleActor(look);
  const D = poseDef(pose);
  poseActor(A, { pose, walk: D.walk && (pose === 'camina' || pose === 'corre') ? 1.1 : 0, expr: 'neutral' });
  const geo = genteMerge(A.root, new Set([A.blob, A.sel, A.face]));
  for (const mat of [A.shirt, A.skin, A.hairM, A.pants]) if (mat && mat.dispose) mat.dispose();
  return geo;
}
function genteGeo(pose, lod) {
  const k = lod + ':' + (lod === 'silueta' ? GENTE_SIL[pose] || 'pie' : pose);
  if (!GENTE_GEO.has(k)) GENTE_GEO.set(k, lod === 'silueta' ? genteSilGeo(GENTE_SIL[pose] || 'pie') : genteSimpleGeo(pose));
  return GENTE_GEO.get(k);
}
function makeCrowd(ob) {
  const T = THREE, g = new T.Group(), inner = new T.Group(); g.add(inner);
  const L = genteLayout(ob);
  if (!GENTE_MAT) GENTE_MAT = new T.MeshLambertMaterial({ color: '#FFFFFF' });
  const groups = new Map();
  for (const m of L.pts) { const gk = L.lod === 'silueta' ? GENTE_SIL[m.pose] || 'pie' : m.pose; if (!groups.has(gk)) groups.set(gk, []); groups.get(gk).push(m); }
  const dummy = new T.Object3D(), col = new T.Color();
  for (const [pose, list] of groups) {
    const im = new T.InstancedMesh(genteGeo(pose, L.lod), GENTE_MAT, list.length);
    list.forEach((m, i) => {
      dummy.position.set(m.x, 0, m.z); dummy.rotation.set(0, rad(m.rot), 0); dummy.scale.setScalar(m.sc); dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, col.set(m.col));
    });
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true;
    if (im.computeBoundingSphere) im.computeBoundingSphere();
    inner.add(im);
  }
  // sombra suave bajo cada uno
  const blob = new T.InstancedMesh(R3.geo.blob, R3.mats.blob, L.pts.length);
  L.pts.forEach((m, i) => { dummy.position.set(m.x, .004, m.z); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(.36 * m.sc, .36 * m.sc, 1); dummy.updateMatrix(); blob.setMatrixAt(i, dummy.matrix); });
  blob.instanceMatrix.needsUpdate = true; g.add(blob);
  // elegido: el contorno del área
  const sh = new T.Shape(), hw = L.w / 2, hd = L.d / 2, b = .06;
  sh.moveTo(-hw, -hd); sh.lineTo(hw, -hd); sh.lineTo(hw, hd); sh.lineTo(-hw, hd); sh.lineTo(-hw, -hd);
  const hole = new T.Path(); hole.moveTo(-hw + b, -hd + b); hole.lineTo(-hw + b, hd - b); hole.lineTo(hw - b, hd - b); hole.lineTo(hw - b, -hd + b); hole.lineTo(-hw + b, -hd + b); sh.holes.push(hole);
  const sel = new T.Mesh(new T.ShapeGeometry(sh), R3.mats.sel); sel.rotation.x = -Math.PI / 2; sel.position.y = .012; sel.visible = false; g.add(sel);
  return { root: g, inner, kind: 'gente', key: genteKey(genteNorm({ ...ob })), sel, blob, parts: {}, crowd: true };
}
function genteDispose(E) {
  E.root.traverse(o => { if (o.isInstancedMesh && o.dispose) o.dispose(); });
  if (E.sel && E.sel.geometry) E.sel.geometry.dispose();
}
