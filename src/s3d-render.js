/* ============================================================
   ESCENA 3D DEL PLANO · render minimalista con Three.js (global THREE)
   ============================================================ */
const R3 = { ok: null, r: null, scene: null, cam: null, sets: {}, objs: new Map(), lights: new Map(), faces: {}, geo: null, mats: null, w: 0, h: 0, room: null, roomKey: '' };
const C3 = { body: '#E8E4DC', skin: '#EFE7DB', pants: '#5E626B', prop: '#D8D2C6', prop2: '#C5BEB1', dark: '#55585F', floorInt: '#DAD5CC', floorExt: '#D3D0C6', ground: '#C3C7B8', wall: '#E9E5DD', sky: '#E6E7E8', skyInt: '#DCE4EC', road: '#B9B6B0', walk: '#CFCBC2', bldg: '#DCD8D0', tree: '#B8C2AC', sel: '#2C47CF' };

function r3Init() {
  if (R3.ok !== null) return R3.ok;
  try {
    if (!window.THREE) throw new Error('sin THREE');
    const T = THREE;
    const canvas = document.createElement('canvas');
    // con canal alfa: la escena normal es opaca (tiene fondo); con la foto detrás (opts.plate) solo se ven figuras y objetos
    R3.r = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    R3.r.setPixelRatio(1);
    R3.r.shadowMap.enabled = true;
    R3.r.shadowMap.type = T.PCFSoftShadowMap;
    R3.r.shadowMap.autoUpdate = false;     // las sombras se recalculan solo cuando cambia lo que las proyecta (r3Draw)
    R3.scene = new T.Scene();
    R3.cam = new T.PerspectiveCamera(40, 16 / 9, .05, 500);
    R3.cam.rotation.order = 'YXZ';
    R3.cam.filmGauge = 36;
    R3.hemi = new T.HemisphereLight(0xffffff, 0xb3ada0, 2.1);
    R3.scene.add(R3.hemi);
    R3.sun = new T.DirectionalLight(0xffffff, 1.6);
    R3.sun.position.set(-4, 9, 6);
    R3.scene.add(R3.sun);
    // objetos y escenarios con el sombreado de los maniquíes
    const mat = c => toon(c);
    R3.mats = { body: mat(C3.body), skin: mat(C3.skin), pants: mat(C3.pants), prop: mat(C3.prop), prop2: mat(C3.prop2), dark: mat(C3.dark), tree: mat(C3.tree), wall: mat(C3.wall), wood: mat('#B48A64'), bag: mat('#8C765F') };
    R3.mats.detail = mat('#C99A6B'); R3.mats.soft = mat('#E4DED4'); R3.mats.metal = mat('#9A9DA3'); R3.mats.tire = mat('#3E4046');
    Object.assign(R3.mats, { win: mat('#93A6B6'), lamp: mat('#F3EEDF'), tail: mat('#C7685D'), bark: mat('#A48C74'), screen: mat('#323946') });
    R3.mats.glass = new T.MeshBasicMaterial({ color: '#BFD6E6', transparent: true, opacity: .22, depthWrite: false });
    R3.mats.shade = new T.MeshBasicMaterial({ color: '#FFE2B0', side: T.DoubleSide });
    // estilo low poly: pocas caras y normales por cara (facetas planas)
    const lp = lowPoly;
    const HS = Math.PI / 6, VS = Math.PI / 8; // facetas de la cabeza: 12 × 8
    R3.geo = {
      head: lp(new T.SphereGeometry(.115, 12, 8, HS / 2)),
      // la cara cubre 3 × 4 facetas de la cabeza, apenas separada para que no parpadee
      face: lp(new T.SphereGeometry(.115 * 1.012, 3, 4, Math.PI / 2 - 1.5 * HS, 3 * HS, 2 * VS, 4 * VS)),
      torso: lp(new T.CapsuleGeometry(.17, .3, 2, 8)), pelvis: lp(new T.CapsuleGeometry(.15, .1, 2, 8)),
      upper: lp(new T.CapsuleGeometry(.048, .24, 2, 6)), fore: lp(new T.CapsuleGeometry(.043, .22, 2, 6)), hand: lp(new T.IcosahedronGeometry(.048, 0)),
      thigh: lp(new T.CapsuleGeometry(.07, .33, 2, 6)), shin: lp(new T.CapsuleGeometry(.055, .35, 2, 6)), foot: new T.BoxGeometry(.1, .07, .24),
      neck: lp(new T.CylinderGeometry(.045, .05, .1, 6)), box: new T.BoxGeometry(1, 1, 1), cyl: lp(new T.CylinderGeometry(1, 1, 1, 8)), sph: lp(new T.IcosahedronGeometry(1, 1)),
      blob: new T.CircleGeometry(1, 28), ring: new T.RingGeometry(.42, .5, 40),
      skirt: lp(new T.CylinderGeometry(.17, .3, .5, 8, 1, true)), shade: lp(new T.CylinderGeometry(.14, .22, .26, 8, 1, true)),
      head3: new T.BoxGeometry(.26, .24, .3), panel: new T.BoxGeometry(.6, .6, .08), cone: lp(new T.CylinderGeometry(.5, 1, 1, 6)),
    };
    const sc = document.createElement('canvas'); sc.width = sc.height = 64;
    const g = sc.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(40,36,30,.32)'); gr.addColorStop(1, 'rgba(40,36,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    R3.mats.blob = new T.MeshBasicMaterial({ map: new T.CanvasTexture(sc), transparent: true, depthWrite: false });
    R3.mats.sel = new T.MeshBasicMaterial({ color: C3.sel, side: T.DoubleSide, transparent: true, opacity: .85, depthWrite: false });
    buildSets();
    R3.ok = true;
  } catch (e) { console.warn('3D:', e); R3.ok = false; }
  return R3.ok;
}
function m3(geo, mat, sx = 1, sy = 1, sz = 1, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  return m;
}
/* geometría facetada: cada triángulo con su propia normal */
function lowPoly(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); if (n !== g) g.dispose(); return n; }

/* ---------- estilo de los maniquíes, también para objetos y escenarios ----------
   sombreado toon suave (la misma rampa), formas redondeadas y contorno negro fino.
   El contorno mide STY.w metros, pero nunca menos de ~1 px de una viñeta de 540 px de alto. */
const STY = { w: { value: .00225 }, px: { value: 1 / 540 }, ink: '#26262B' };
function toonRamp() {
  if (STY.ramp) return STY.ramp;
  const v = [118, 150, 182, 208, 228, 242, 252, 255], d = new Uint8Array(v.length * 4);
  v.forEach((x, i) => d.set([x, x, x, 255], i * 4));
  const t = new THREE.DataTexture(d, v.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return (STY.ramp = t);
}
const toon = (c, o) => new THREE.MeshToonMaterial({ color: c, gradientMap: toonRamp(), ...o });
/* en la simulación de luz las rampas del sombreado siguen al coseno (lo que no mira a la luz queda oscuro);
   fuera de ella vuelven a la luz envolvente del estilo de dibujo */
function luzRamps(on) {
  if (STY.rampSim === on) return;
  STY.rampSim = on;
  for (const t of [toonRamp(), fig3dGradient()]) {
    if (!t) continue;
    const d = t.image.data, n = t.image.width;
    if (!t.userData.orig) t.userData.orig = d.slice();
    for (let i = 0; i < n; i++) { const v = on ? (i === n - 1 ? 255 : Math.round(Math.max(0, 2 * (i + .5) / n - 1) * 255)) : t.userData.orig[i * 4]; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; }
    t.needsUpdate = true;
  }
}
/* contorno: la malla por detrás, empujada hacia afuera en el espacio de la cámara */
function outlineShader(sh, nrm) {
  sh.vertexShader = 'uniform float uOW;\nuniform float uOPx;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
	float oPx = 2.0 * max( - mvPosition.z, 0.05 ) * uOPx / projectionMatrix[ 1 ][ 1 ];
	mvPosition.xyz += normalize( normalMatrix * ${nrm} ) * max( uOW, oPx );
	gl_Position = projectionMatrix * mvPosition;`);
  sh.uniforms.uOW = STY.w; sh.uniforms.uOPx = STY.px;
}
function outlineMat() {
  if (STY.outline) return STY.outline;
  const m = new THREE.MeshBasicMaterial({ color: STY.ink, side: THREE.BackSide });
  m.onBeforeCompile = sh => outlineShader(sh, 'normal');
  m.customProgramCacheKey = () => 'r3-outline';
  return (STY.outline = m);
}
/* agrega el contorno a cada malla cerrada del grupo (no a planos, vidrios ni sombras) */
const OPEN_GEO = new Set(['PlaneGeometry', 'ShapeGeometry', 'CircleGeometry', 'RingGeometry']);
function outlineAll(root) {
  const list = [];
  root.traverse(o => { if (o.isMesh && !o.userData.ol && !o.userData.noOutline && !OPEN_GEO.has(o.geometry.type) && !(o.material.transparent || o.material.side === THREE.BackSide)) list.push(o); });
  for (const o of list) {
    const m = new THREE.Mesh(o.geometry, outlineMat());
    m.position.copy(o.position); m.quaternion.copy(o.quaternion); m.scale.copy(o.scale);
    m.userData.ol = true; m.castShadow = m.receiveShadow = false;
    o.parent.add(m);
  }
  return root;
}
/* une las mallas fijas de un objeto que comparten material en una sola: un estante con sus libros, un auto con sus
   rayos y sus luces o un perro con sus patas pasan de decenas de llamadas de dibujo a unas pocas (y su contorno igual).
   Lo que se mueve (hojas de puertas, lo que se sostiene, la pantalla de la lámpara) queda aparte. La malla unida se
   guarda por tipo de objeto: todos los taxis comparten la misma. */
const PROPM = new Map();
function propMerge(inner, parts, key) {
  const T = THREE, keep = new Set();
  for (const v of Object.values(parts || {})) if (v && v.isObject3D) v.traverse(o => keep.add(o));
  inner.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(inner.matrixWorld).invert(), groups = new Map();
  inner.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || keep.has(o) || o.userData.ol || Array.isArray(o.material) || o.material.map || !o.geometry.attributes.position) return;
    const ol = !o.userData.noOutline && !OPEN_GEO.has(o.geometry.type) && !(o.material.transparent || o.material.side === T.BackSide);
    const k = o.material.uuid + '|' + ol + '|' + o.castShadow + o.receiveShadow + '|' + o.renderOrder;
    let L = groups.get(k); if (!L) groups.set(k, L = { ol, list: [] }); L.list.push(o);
  });
  const cache = key ? PROPM.get(key) || [] : null;
  let gi = 0;
  const m = new T.Matrix4(), nm = new T.Matrix3(), v = new T.Vector3(), merged = [];
  for (const { ol, list } of groups.values()) {
    if (list.length < 2) continue;
    let nv = 0, ni = 0;
    for (const o of list) { const g = o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    let geo = cache && cache[gi] && cache[gi].userData.nv === nv && cache[gi].userData.ni === ni ? cache[gi] : null;
    if (!geo) {
      const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let vo = 0, io = 0;
      for (const o of list) {
        const g = o.geometry, pa = g.attributes.position, na = g.attributes.normal || (() => { const c = g.clone(); c.computeVertexNormals(); return c.attributes.normal; })();
        m.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m);
        for (let i = 0; i < pa.count; i++) {
          v.fromBufferAttribute(pa, i).applyMatrix4(m); P[(vo + i) * 3] = v.x; P[(vo + i) * 3 + 1] = v.y; P[(vo + i) * 3 + 2] = v.z;
          v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); N[(vo + i) * 3] = v.x; N[(vo + i) * 3 + 1] = v.y; N[(vo + i) * 3 + 2] = v.z;
        }
        const flip = m.determinant() < 0, cnt = g.index ? g.index.count : pa.count, at = j => g.index ? g.index.getX(j) : j;
        for (let j = 0; j < cnt; j += 3) { const a = at(j), b = at(j + 1), c = at(j + 2); I[io++] = a + vo; I[io++] = (flip ? c : b) + vo; I[io++] = (flip ? b : c) + vo; }
        vo += pa.count;
      }
      geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(N, 3)); geo.setIndex(new T.BufferAttribute(I, 1));
      geo.computeBoundingSphere(); geo.userData.nv = nv; geo.userData.ni = ni;
      if (cache) { geo.userData.shared = true; cache[gi] = geo; }
    }
    gi++;
    const mm = new T.Mesh(geo, list[0].material);
    mm.castShadow = list[0].castShadow; mm.receiveShadow = list[0].receiveShadow; mm.renderOrder = list[0].renderOrder;
    if (!ol) mm.userData.noOutline = true;
    merged.push([mm, list]);
  }
  if (cache) PROPM.set(key, cache);
  const old = new Set();
  for (const [mm, list] of merged) { for (const o of list) { o.parent.remove(o); old.add(o.geometry); } inner.add(mm); }
  // las geometrías propias que ya nadie usa se sueltan (las compartidas quedan en su caché)
  inner.traverse(o => { if (o.geometry) old.delete(o.geometry); });
  for (const g of old) if (!g.userData.shared) g.dispose();
}
/* geometrías suaves (se guardan por medida: no se escalan, así el contorno queda parejo) */
const GEO3 = new Map();
const geoOnce = (key, make) => { let g = GEO3.get(key); if (!g) { g = make(); g.userData.shared = true; GEO3.set(key, g); } return g; };
const disposable = geo => geo && !geo.userData.shared && geo !== R3.geo.box;
/* caja con aristas redondeadas de radio r */
function rbox(w, h, d, r = .012) {
  r = Math.max(.001, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  return geoOnce(['b', w, h, d, r].map(v => typeof v === 'number' ? v.toFixed(4) : v).join(), () => {
    // segmentos por esquina según el radio: una esquina de pocos milímetros no necesita más (menos triángulos)
    const s = r > .03 ? 4 : r > .01 ? 3 : r > .004 ? 2 : 1, n = 2 * s + 1, g = new THREE.BoxGeometry(1, 1, 1, n, n, n);
    const p = g.attributes.position, nm = g.attributes.normal, half = [w / 2, h / 2, d / 2];
    const c = new Array(3), dl = new Array(3);
    for (let i = 0; i < p.count; i++) {
      let L = 0;
      for (let k = 0; k < 3; k++) {
        const j = Math.round((p.getComponent(i, k) + .5) * n), H = half[k];
        c[k] = j <= s ? -H + r * j / s : j >= n - s ? H - r * (n - j) / s : 0;
        const inner = Math.max(-(H - r), Math.min(H - r, c[k]));
        dl[k] = c[k] - inner; L += dl[k] * dl[k];
      }
      L = Math.sqrt(L) || 1;
      for (let k = 0; k < 3; k++) {
        const inner = c[k] - dl[k];
        p.setComponent(i, k, inner + dl[k] / L * r);
        nm.setComponent(i, k, dl[k] / L);
      }
    }
    return g;
  });
}
/* cilindro con bordes redondeados (b = radio del bisel); r2 = radio de arriba si es cónico */
function rcyl(r, h, b = .006, seg = 24, r2 = r) {
  b = Math.min(b, Math.min(r, r2) * .45, h * .45);
  return geoOnce('c' + [r, h, b, seg, r2].map(v => v.toFixed(4)).join(), () => {
    const pts = [new THREE.Vector2(0, -h / 2)];
    const arc = (cx, cy, a0, a1) => { for (let i = 0; i <= 4; i++) { const a = a0 + (a1 - a0) * i / 4; pts.push(new THREE.Vector2(cx + Math.cos(a) * b, cy + Math.sin(a) * b)); } };
    if (b > 1e-4) { arc(r - b, -h / 2 + b, -Math.PI / 2, 0); arc(r2 - b, h / 2 - b, 0, Math.PI / 2); }
    else pts.push(new THREE.Vector2(r, -h / 2), new THREE.Vector2(r2, h / 2));
    pts.push(new THREE.Vector2(0, h / 2));
    return new THREE.LatheGeometry(pts, seg);
  });
}
const rsph = (r, seg = 24) => geoOnce('s' + r.toFixed(4) + ',' + seg, () => new THREE.SphereGeometry(r, seg, Math.max(8, seg * 2 / 3 | 0)));
/* ---------- sets ---------- */
function buildSets() {
  const T = THREE;
  const floor = (c, size) => { const m = new T.Mesh(new T.PlaneGeometry(size, size), toon(c)); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; return m; };
  const grid = (n, c, op) => { const gh = new T.GridHelper(n, n, c, c); gh.material.transparent = true; gh.material.opacity = op; gh.position.y = .003; return gh; };
  const put = (geo, m, x, y, z, par) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bm = toon(C3.bldg), cap = toon('#CFCAC1'), winM = toon('#BFC5C9');
  // edificio de fondo: volumen redondeado, cornisa y filas de ventanas en la fachada (+z local)
  const wins = [];
  const building = (w, h, d, x, z, ry, par, front = true) => {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry; par.add(g);
    put(rbox(w, h, d, .08), bm, 0, h / 2, 0, g); put(rbox(w + .16, .28, d + .16, .06), cap, 0, h - .1, 0, g);
    if (front) {
      const cols = Math.max(1, Math.floor((w - .8) / 1.6)), rows = Math.max(1, Math.floor((h - 1) / 2.9));
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const wx = (c - (cols - 1) / 2) * 1.6, wy = 1.6 + r * 2.9;
        if (wy + .7 > h - .4) continue;
        g.updateMatrixWorld(true); wins.push(new T.Vector3(wx, wy, d / 2 + .012).applyMatrix4(g.matrixWorld), ry, par);
      }
    }
    return g;
  };
  // árbol de fondo con la misma copa que el objeto Árbol
  const tree = (x, z, k, par) => {
    const g = new T.Group(); g.position.set(x, 0, z); g.scale.setScalar(k); par.add(g);
    put(rcyl(.1, 2.2, .01, 16, .065), R3.mats.bark, 0, 1.1, 0, g);
    for (const [r, tx, ty, tz] of [[.72, 0, 2.75, 0], [.52, .48, 2.45, .18], [.5, -.46, 2.5, -.16], [.46, .08, 3.28, -.08]]) put(rsph(r, 20), R3.mats.tree, tx, ty, tz, g);
    return g;
  };
  // interior: terreno exterior; la habitación se arma según sus medidas
  const int = new T.Group();
  const gr0 = floor(C3.ground, 300); gr0.position.y = -.004; int.add(gr0);
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2 + rnd() * .1, r = 17 + rnd() * 10;
    if (i % 3 === 0) tree(Math.cos(a) * r, Math.sin(a) * r, 1.6, int);
    else { const h = 3 + rnd() * 8, w = 4 + rnd() * 5; building(w, h, w * .8, Math.cos(a) * (r + 4), Math.sin(a) * (r + 4), -a, int, false); }
  }
  // exterior abierto
  const ext = new T.Group();
  ext.add(floor(C3.floorExt, 400), grid(40, 0x8f887c, .18));
  // calle: pista, veredas y bloques de edificios
  const calle = new T.Group();
  calle.add(floor(C3.floorExt, 400));
  const road = new T.Mesh(new T.PlaneGeometry(200, 7), toon(C3.road)); road.rotation.x = -Math.PI / 2; road.position.set(0, .004, -5.5); road.receiveShadow = true; calle.add(road);
  const lineM = toon('#F2EFE8');
  for (let x = -96; x < 100; x += 6) { const l = new T.Mesh(new T.PlaneGeometry(2.4, .14), lineM); l.rotation.x = -Math.PI / 2; l.position.set(x, .006, -5.5); calle.add(l); }
  const walkM = toon(C3.walk);
  for (const z of CALLE_WALK.z) put(rbox(200, CALLE_WALK.h, CALLE_WALK.d, .04), walkM, 0, CALLE_WALK.h / 2, z, calle);
  for (let x = -60; x < 60;) {
    const w = 4 + rnd() * 6, h = 3 + rnd() * 9, h2 = 3 + rnd() * 8;
    building(w - .3, h, 6, x + w / 2, -14.5, 0, calle);
    building(w - .3, h2, 6, x + w / 2, 11.5, Math.PI, calle);
    x += w;
  }
  // ventanas de todos los edificios en una sola malla (planos, sin contorno)
  const byPar = new Map();
  for (let i = 0; i < wins.length; i += 3) { const k = wins[i + 2]; if (!byPar.has(k)) byPar.set(k, []); byPar.get(k).push([wins[i], wins[i + 1]]); }
  for (const [par, list] of byPar) {
    const pos = [], idx = [];
    for (const [c, ry] of list) {
      const ux = Math.cos(ry), uz = -Math.sin(ry), n = pos.length / 3;
      for (const [sx, sy] of [[-.45, -.65], [.45, -.65], [.45, .65], [-.45, .65]]) pos.push(c.x + ux * sx, c.y + sy, c.z + uz * sx);
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const wm = new T.Mesh(geo, winM); wm.userData.noOutline = true; wm.receiveShadow = true; par.add(wm);
  }
  outlineAll(int); outlineAll(calle);
  const vacio = new T.Group();
  vacio.add(grid(24, 0x9a9488, .35));
  R3.sets = { int, ext, calle, vacio };
  for (const k in R3.sets) { R3.sets[k].visible = false; R3.scene.add(R3.sets[k]); }
}
/* habitación con muros que se ven desde dentro y vanos donde hay puertas o ventanas */
function wallOpenings(s3, st) {
  const R = roomOf(s3), hw = R.w / 2, hd = R.d / 2, out = { N: [], S: [], O: [], E: [] };
  for (const ob of s3.objs) {
    if (ob.kind !== 'puerta' && ob.kind !== 'ventana') continue;
    const p = st.o[ob.id]; if (!p) continue;
    const hole = ob.kind === 'puerta' ? [.52, 0, 2.18] : [.7, .86, 2.18];
    if (Math.abs(p.z + hd) < .3) out.N.push([p.x, ...hole]);
    else if (Math.abs(p.z - hd) < .3) out.S.push([-p.x, ...hole]);
    else if (Math.abs(p.x + hw) < .3) out.O.push([-p.z, ...hole]);
    else if (Math.abs(p.x - hw) < .3) out.E.push([p.z, ...hole]);
  }
  return out;
}
function syncRoom(s3, st) {
  const R = roomOf(s3), ops = wallOpenings(s3, st);
  const key = JSON.stringify([R, ops]);
  if (R3.room && R3.roomKey === key) return;
  const T = THREE;
  if (R3.room) { R3.sets.int.remove(R3.room); R3.room.traverse(o => { if (disposable(o.geometry)) o.geometry.dispose(); if (o.material && o.material.map) { o.material.map.dispose(); o.material.dispose(); } }); }
  const g = new T.Group();
  // cocina, sala, dormitorio…: su piso y el color de sus muros; si no, la sala neutra con su cuadrícula de 1 m
  const dressed = roomDress(g, R);
  if (!dressed) {
    const fl = new T.Mesh(new T.PlaneGeometry(R.w, R.d), R3.mats.floorInt || (R3.mats.floorInt = toon(C3.floorInt))); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; g.add(fl);
    const pts = [];
    for (let x = -Math.floor(R.w / 2); x <= R.w / 2; x++) pts.push(x, .003, -R.d / 2, x, .003, R.d / 2);
    for (let z = -Math.floor(R.d / 2); z <= R.d / 2; z++) pts.push(-R.w / 2, .003, z, R.w / 2, .003, z);
    const lg = new T.BufferGeometry(); lg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    g.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: 0x8f887c, transparent: true, opacity: .28 })));
  }
  const wm = dressed || R3.mats.wall;
  const wall = (L, holes, x, z, ry) => {
    const gw = new T.Group(); gw.position.set(x, 0, z); gw.rotation.y = ry; g.add(gw);
    const cuts = [];
    const sh = new T.Shape();
    sh.moveTo(-L / 2, 0); sh.lineTo(L / 2, 0); sh.lineTo(L / 2, R.h); sh.lineTo(-L / 2, R.h); sh.closePath();
    for (const [u, hw2, y0, y1] of holes) {
      const a = clamp(u - hw2, -L / 2 + .02, L / 2 - .02), b = clamp(u + hw2, -L / 2 + .02, L / 2 - .02), top = Math.min(y1, R.h - .02);
      if (b - a < .1) continue;
      if (y0 < .05) cuts.push([a, b]);
      const hp = new T.Path(); hp.moveTo(a, Math.max(y0, .001)); hp.lineTo(a, top); hp.lineTo(b, top); hp.lineTo(b, Math.max(y0, .001)); hp.closePath();
      sh.holes.push(hp);
    }
    const m = new T.Mesh(new T.ShapeGeometry(sh), wm);
    m.receiveShadow = true; m.castShadow = true;
    gw.add(m);
    // zócalo por dentro, cortado en las puertas
    cuts.sort((p, q) => p[0] - q[0]);
    let u0 = -L / 2;
    for (const [a, b] of [...cuts, [L / 2, L / 2]]) {
      if (a - u0 > .06) { const z = new T.Mesh(rbox(a - u0, .09, .018, .006), R3.mats.prop2); z.position.set((a + u0) / 2, .045, .009); z.receiveShadow = true; gw.add(z); }
      u0 = Math.max(u0, b);
    }
  };
  wall(R.w, ops.N, 0, -R.d / 2, 0); wall(R.w, ops.S, 0, R.d / 2, Math.PI);
  wall(R.d, ops.O, -R.w / 2, 0, Math.PI / 2); wall(R.d, ops.E, R.w / 2, 0, -Math.PI / 2);
  outlineAll(g);
  R3.room = g; R3.roomKey = key;
  R3.sets.int.add(g);
}

/* ---------- luces ---------- */
function makeLight(type) {
  const T = THREE, G = R3.geo, M = R3.mats;
  const rig = new T.Group(), headG = new T.Group();
  let light;
  if (type === 'sol') { light = new T.DirectionalLight(0xffffff, 1); light.shadow.camera.left = light.shadow.camera.bottom = -14; light.shadow.camera.right = light.shadow.camera.top = 14; light.shadow.camera.far = 80; }
  else if (type === 'practica') { light = new T.PointLight(0xffffff, 1, 0, 2); light.shadow.mapSize.set(512, 512); }
  else if (type === 'bandera') light = new T.Object3D();   // no da luz: solo tapa
  else { light = new T.SpotLight(0xffffff, 1, 0, .5, type === 'panel' || type === 'rebote' ? 1 : .35, 2); }
  light.castShadow = !!light.isLight;
  if (light.shadow) { if (type !== 'practica') light.shadow.mapSize.set(1024, 1024); light.shadow.bias = -.0004; light.shadow.normalBias = .02; light.shadow.radius = type === 'panel' ? 6 : 2; }
  if (light.target) R3.scene.add(light.target);
  let board = null;
  if (type === 'rebote' || type === 'bandera') {
    // tablero en un pie de estudio: tapa la luz (bandera) o la devuelve (rebote)
    const P = (geo, m, x, y, z, par) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
    const pole = new T.Group(); rig.add(pole);
    P(rcyl(.012, 1, .003, 10), M.metal, 0, 0, 0, pole);
    for (let i = 0; i < 3; i++) { const a = i * 2.094; const l = P(rbox(.02, .02, .42, .006), M.metal, Math.sin(a) * .19, .02, Math.cos(a) * .19, rig); l.rotation.y = a; }
    rig.add(headG);
    outlineAll(rig);
    board = new T.Mesh(new T.BoxGeometry(1, 1, .012), new T.MeshLambertMaterial({ color: type === 'bandera' ? '#1D1E21' : '#F3F1EA' }));
    headG.add(board);
  }
  if (type === 'fresnel' || type === 'panel') {
    // mismo estilo que los objetos: piezas redondeadas y contorno fino
    const P = (geo, m, x, y, z, par) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); par.add(o); return o; };
    const pole = new T.Group(); rig.add(pole);   // children[0]: se estira con la altura de la luz
    P(rcyl(.016, 1, .004, 12), M.dark, 0, 0, 0, pole);
    for (let i = 0; i < 3; i++) { const a = i * 2.094; const l = P(rbox(.022, .022, .45, .008), M.dark, Math.sin(a) * .2, .02, Math.cos(a) * .2, rig); l.rotation.y = a; }
    P(rcyl(.03, .08, .008, 16), M.dark, 0, .06, 0, rig);
    rig.add(headG);
    P(type === 'panel' ? rbox(.6, .6, .08, .02) : rbox(.26, .24, .3, .04), M.dark, 0, 0, 0, headG);
    const lens = type === 'panel' ? P(rbox(.54, .54, .01, .004), new T.MeshBasicMaterial({ color: '#FFF4DE' }), 0, 0, .045, headG) : P(rcyl(.09, .02, .005), new T.MeshBasicMaterial({ color: '#FFF1D2' }), 0, 0, .16, headG);
    if (type !== 'panel') lens.rotation.x = Math.PI / 2;
    lens.userData.noOutline = true;
    // horquilla que sostiene el foco
    const yw = type === 'panel' ? .34 : .16, yh = type === 'panel' ? .36 : .2;
    for (const s of [-1, 1]) P(rbox(.025, yh, .04, .008), M.dark, s * yw, -yh / 2 + .04, 0, headG);
    P(rbox(yw * 2 + .025, .025, .04, .008), M.dark, 0, -yh + .04, 0, headG);
    if (type === 'fresnel') {
      // viseras (barn doors) abiertas hacia afuera
      const a = .45, L = .12, ca = Math.cos(a) * L / 2, sa = Math.sin(a) * L / 2;
      for (const s of [-1, 1]) {
        const v = P(rbox(.26, .008, L, .003), M.dark, 0, s * (.12 + sa), .15 + ca, headG); v.rotation.x = -s * a;
        const h = P(rbox(.008, .24, L, .003), M.dark, s * (.13 + sa), 0, .15 + ca, headG); h.rotation.y = s * a;
      }
    }
    outlineAll(rig);
  }
  rig.traverse(o => { if (o.isMesh) o.castShadow = false; });
  if (board) board.castShadow = true;
  return { light, rig, headG, board, type, kind: 'luz' };
}
function syncLights(s3, st, sim, rigVisible, S) {
  const seen = new Set();
  for (const ob of s3.objs) {
    if (ob.kind !== 'luz') continue;
    const p = st.o[ob.id]; if (!p) continue;
    let L = R3.lights.get(ob.id);
    if (L && L.type !== ob.type) { removeLight(L); L = null; }
    if (!L) { L = makeLight(ob.type); R3.lights.set(ob.id, L); }
    seen.add(ob.id);
    if (!L.light.parent) { R3.scene.add(L.light); R3.scene.add(L.rig); }
    const T = THREE;
    const B = S && S.bounce[ob.id], on = sim && (ob.type === 'rebote' ? !!B && B.I > 0 : (p.int ?? 0) > 0) && !!L.light.isLight;
    L.light.visible = on;
    if (L.light.isLight) {
      L.light.color.set(lightColor(ob.type === 'rebote' ? (B ? B.k : 5600) : p.k || 3200, (s3.light || {}).wb));
      // luz física: candelas del equipo (o lux del sol) × la ganancia de la exposición de la cámara
      if (S) L.light.intensity = (ob.type === 'sol' ? fxOf(ob).lux * clamp((p.int ?? 60) / 100, 0, 1) : ob.type === 'rebote' ? (B ? B.I : 0) : luzCd(ob, p)) * S.gain;
      else { const f = (p.int || 0) / 100; L.light.intensity = ob.type === 'sol' ? f * 4.5 : ob.type === 'practica' ? f * 14 : ob.type === 'panel' ? f * 70 : f * 120; }
      if (L.light.isSpotLight) L.light.penumbra = luzPen(ob);
      // sombra más suave cuanto más grande la fuente (mapa de sombra más chico, más difuso)
      if (L.light.shadow && ob.type !== 'sol' && ob.type !== 'practica') {
        const ms = [2048, 1024, 512, 384, 256][luzSoft(ob)] || 1024;
        if (L.light.shadow.mapSize.x !== ms) { L.light.shadow.mapSize.set(ms, ms); if (L.light.shadow.map) { L.light.shadow.map.dispose(); L.light.shadow.map = null; } }
      }
    }
    // h: altura de la luz sobre el suelo que pisa (gl); todo lo demás, en altura absoluta
    const gl = liftOf(s3, p, false), hl = p.h ?? 2, h = hl + gl;
    let tx, ty, tz;
    const aimO = ob.aim && st.o[ob.aim];
    if (aimO) { tx = aimO.x; tz = aimO.z; ty = eyeOf(s3, ob.aim, aimO.pose) - .2 + liftOf(s3, aimO); }
    else { const r = rad(p.rot || 0), tl = rad(p.tilt || 0); tx = p.x + Math.sin(r) * Math.cos(tl) * 4; tz = p.z + Math.cos(r) * Math.cos(tl) * 4; ty = h - Math.sin(tl) * 4; }
    if (ob.type === 'sol') {
      const r = rad(p.rot || 0), el = rad(clamp(p.tilt || 40, 3, 89));
      const cx = aimO ? tx : 0, cz = aimO ? tz : 0;
      L.light.position.set(cx - Math.sin(r) * Math.cos(el) * 30, Math.sin(el) * 30, cz - Math.cos(r) * Math.cos(el) * 30);
      L.light.target.position.set(cx, 0, cz);
    } else {
      L.light.position.set(p.x, h, p.z);
      if (L.light.target) L.light.target.position.set(tx, ty, tz);
      if (ob.type === 'rebote') { const d = Math.hypot(tx - p.x, ty - h, tz - p.z) || 1; L.light.position.set(p.x + (tx - p.x) / d * .06, h + (ty - h) / d * .06, p.z + (tz - p.z) / d * .06); }
      if (L.light.isSpotLight) L.light.angle = rad(clamp(S ? luzBeam(ob, p) : p.ang || 30, 5, 170) / 2);
    }
    if (L.light.target) L.light.target.updateMatrixWorld();
    L.rig.visible = ob.type !== 'sol' && (rigVisible || (!!L.board && sim));
    if (L.board) {
      // rebotes y banderas: aunque se oculten los equipos, en la simulación siguen tapando la luz (invisibles)
      const F = fxOf(ob); L.board.scale.set(F.size[0], F.size[1], 1);
      for (const c of L.rig.children) if (c !== L.headG) c.visible = rigVisible;
      L.board.material.colorWrite = L.board.material.depthWrite = rigVisible;
    }
    L.rig.position.set(p.x, gl, p.z);
    if (L.headG.children.length) {
      L.rig.children[0].scale.y = hl; L.rig.children[0].position.y = hl / 2;
      L.headG.position.set(0, hl, 0);
      const dx = tx - p.x, dz = tz - p.z, dy = ty - h;
      L.headG.rotation.order = 'YXZ';
      L.headG.rotation.y = Math.atan2(dx, dz);
      L.headG.rotation.x = -Math.atan2(dy, Math.hypot(dx, dz));
    }
  }
  for (const [k, L] of R3.lights) if (!seen.has(k)) removeLight(L, k);
}
function removeLight(L, k) {
  R3.scene.remove(L.light); R3.scene.remove(L.rig); if (L.light.target) R3.scene.remove(L.light.target);
  if (L.light.shadow && L.light.shadow.map) L.light.shadow.map.dispose();
  if (k) R3.lights.delete(k);
}

/* ---------- sincronía de la escena ---------- */
const _m4 = () => new THREE.Matrix4();
function syncPlan(s3) {
  const pl = planOf(s3), T = THREE;
  const key = pl ? pl.id + ':' + pl.v + ':' + (s3.planFloor !== false) + ':' + !!planPic(pl) : '';
  if (R3.planKey === key) { if (R3.planG) R3.planG.visible = !!pl; return; }
  if (R3.planG) { R3.sets.int.remove(R3.planG); R3.planG.traverse(o => { if (disposable(o.geometry)) o.geometry.dispose(); if (o.material && o.material.map) o.material.map.dispose(); }); R3.planG = null; }
  R3.planKey = key;
  if (!pl) return;
  const g = new T.Group(), W = planWorld(pl), k = W.k;
  const im = s3.planFloor !== false ? planPic(pl, () => { R3.planKey = ''; }) : null;
  const fw = pl.w * k, fd = pl.h * k;
  const fm = toon(im ? '#FFFFFF' : C3.floorInt);
  if (im) { const tx = new T.CanvasTexture(im); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 4; fm.map = tx; }
  const fl = new T.Mesh(new T.PlaneGeometry(fw, fd), fm); fl.rotation.x = -Math.PI / 2; fl.position.set(W.x(pl.w / 2), .001, W.z(pl.h / 2)); fl.receiveShadow = true; g.add(fl);
  const wm = R3.mats.planWall || (R3.mats.planWall = toon(C3.wall));
  const H = pl.wallH || 2.6;
  g.userData.walls = [];
  const RW = planRectsWorld(pl);
  pl.rects.forEach(([x, y, w, h], i) => {
    // cada tramo en su grupo (malla + contorno) para que los muros móviles oculten ambos
    const wg = new T.Group(); wg.position.set(W.x(x + w / 2), H / 2, W.z(y + h / 2)); g.add(wg);
    const m = new T.Mesh(rbox(Math.max(.02, w * k), H, Math.max(.02, h * k), .012), wm);
    m.castShadow = true; m.receiveShadow = true; wg.add(m); outlineAll(wg); g.userData.walls.push([wg, RW[i]]);
  });
  R3.planG = g; R3.sets.int.add(g);
}
function r3Sync(s3, st, opts) {
  // un escenario 3D importado (escenarios-3d.js); si ya no existe, el exterior abierto
  let vis = s3.set === 'plano' ? 'int' : s3.set === 'modelo' ? (typeof set3dSync === 'function' && set3dSync(s3) ? 'modelo' : 'ext') : s3.set;
  if (!R3.sets[vis] && !(envGroup(vis))) vis = 'ext';   // entornos: se arman la primera vez
  for (const k in R3.sets) R3.sets[k].visible = k === vis;
  if (R3.room) R3.room.visible = s3.set === 'int';
  syncPlan(s3);
  const T = THREE;
  const LS = s3.light || {};
  const sim = LS.mode === 'sim' && s3.objs.some(o => o.kind === 'luz');
  const S = R3.luz = sim ? luzSolve(s3, st) : null;
  luzRamps(sim);
  const d3 = vis === 'modelo' ? set3dOf(s3) : null;
  const bg = s3.set === 'int' || s3.set === 'plano' || (d3 && d3.int) ? C3.skyInt : s3.set === 'vacio' ? '#ECEBE7' : C3.sky;
  R3.scene.background = new T.Color(sim ? new T.Color(bg).multiplyScalar(clamp(.06 + S.amb * .7 / S.mid, .02, 1)) : bg);
  R3.scene.fog = d3 ? new T.Fog(R3.scene.background, ...set3dFog(d3)) : s3.set === 'ext' || s3.set === 'calle' ? new T.Fog(R3.scene.background, 25, 140) : s3.set === 'vacio' ? new T.Fog(R3.scene.background, 10, 30) : s3.set === 'int' || s3.set === 'plano' ? new T.Fog(R3.scene.background, 30, 70) : null;
  R3.hemi.intensity = sim ? S.amb * S.gain : 2.1;
  R3.sun.intensity = sim ? 0 : 1.6;
  if (s3.set === 'int') syncRoom(s3, st);
  syncLights(s3, st, sim, LS.rig !== false && opts.rig !== false, S);
  const seen = new Set();
  const held = [];
  // la mano que sostiene un cuchillo, una pistola, una taza… se cierra
  const fist = {};
  for (const o of s3.objs) if (o.hold && GRIP[o.kind] && OBJ_FIST[o.kind] && o.hold.at !== 'pecho') (fist[o.hold.a] ||= {})[o.hold.at || 'R'] = OBJ_FIST[o.kind];
  for (const ob of s3.objs) {
    if (ob.kind === 'luz') continue;
    const p = st.o[ob.id];
    if (!p) continue;
    let E = R3.objs.get(ob.id);
    const look = ob.kind === 'actor' ? lookOf(ob) : null;
    const cutMode = look && look.key && look.photo && look.photo.mode === 'recorte' && FRAMES['ph~' + look.key + '~front'];
    // un personaje con su modelo 3D importado (personajes-3d.js), en cuanto el modelo está listo
    const ext = look && !cutMode && look.model && typeof ch3Has === 'function' && ch3Has(look);
    const k2 = look ? (cutMode ? 'recorte' : ext ? ch3Key(look) : E && E.fig ? fig3dKey(look) : actorKey(look)) : ob.kind;
    // el maniquí simple se cambia por el articulado en cuanto este termina de cargar (y este, por el modelo)
    const upgrade = E && look && !cutMode && ((ext && !E.ext) || (!ext && !E.fig && !E.ext && typeof FIG3D !== 'undefined' && FIG3D.has(look.body)));
    if (E && (E.kind !== ob.kind || (look && E.key !== k2) || (ob.kind === 'detalle' && E.model !== detailModel(ob)) || (ob.kind === 'gente' && E.key !== genteKey(genteNorm({ ...ob }))) || upgrade)) {
      R3.scene.remove(E.root);
      if (E.ext) ch3Dispose(E); else if (E.fig) fig3dDispose(E); else if (E.crowd) genteDispose(E); else if (E.shirt) for (const m of [E.shirt, E.skin, E.hairM, E.pants]) m.dispose();
      E = null;
    }
    if (!E) { E = ob.kind === 'actor' ? (cutMode ? makeCutout(look) : makeActor(look)) : ob.kind === 'gente' ? makeCrowd(ob) : makeProp(ob.kind, ob.kind === 'detalle' ? detailModel(ob) : null); R3.objs.set(ob.id, E); }
    if (!E.root.parent) R3.scene.add(E.root);
    seen.add(ob.id);
    // sobre el suelo que tiene debajo (la vereda) más lo que se subió a mano (figuras y objetos pequeños)
    E.root.position.set(p.x, liftOf(s3, p, !!(S3_PROPS[ob.kind] || {}).small || ob.kind === 'actor'), p.z);
    E.root.rotation.set(0, rad(p.rot || 0), 0);
    E.root.scale.setScalar(1);
    E.blob.visible = !sim;
    if (E.kind === 'actor' && E.cut) { E.look = look; }
    else if (E.kind === 'actor') {
      if (E.ext) ch3Scale(E, look);
      else if (E.fig) { fig3dColors(E, look); fig3dScale(E, look); fig3dAcc(E, look); }
      else {
        E.shirt.color.set(look.tono); E.skin.color.set(look.tono); E.hairM.color.set(look.tono).multiplyScalar(.86); E.pants.color.set(look.tono).multiplyScalar(.94);
        E.body.scale.set(look.s * look.w, look.s, look.s * (.5 + .5 * look.w)); E.s = look.s;
      }
      E.photoFace = !E.B.faceless && look.key && look.photo && look.photo.mode !== 'recorte' ? photoFaceMat(look.key) : null;
      if (!E.photoFace && E.expr === '__foto') E.expr = '';
      const fz = fist[ob.id], j0 = p.j || {};
      // la cara: la versión del personaje (o el dibujo en curso, con sus guías, solo en el visor del editor)
      const pp = { ...p, expr: opts.faceLive && opts.faceLive === ob.id ? '__live' : faceKeyFor(look, p.expr) };
      if (fz) pp.j = { ...j0, fR: Math.max(j0.fR || 0, (fz.R || 0) * 100), fL: Math.max(j0.fL || 0, (fz.L || 0) * 100) };
      if (E.ext) { poseActor(E.drv, pp); ch3Apply(E, pp.expr); } else poseActor(E, pp);
      // la parte del cuerpo elegida (solo en el visor del editor) se tiñe; en miniaturas y PDF, nunca
      if (E.fig) fig3dTint(E, opts.part && opts.part.id === ob.id ? opts.part.key : null);
    } else {
      if (E.parts.leaf || E.parts.sashL) openProp(E, p);
      if (E.paint) E.paint.color.set(ob.paint || VEH_PAINT[ob.kind] || '#7D8C9C');   // color del vehículo (o del animal)
      if (E.parts.hg) objLay(E.parts, false);   // cuchillo, pistola…: acostados salvo en una mano
      if (ob.hold && GRIP[ob.kind]) held.push([ob, E]);
    }
    E.sel.visible = !!(opts.sel && opts.sel === ob.id);
  }
  for (const [k, E] of R3.objs) if (!seen.has(k) && E.root.parent) R3.scene.remove(E.root);
  // objetos sostenidos: siguen la mano o el pecho de la figura
  for (const [ob, E] of held) {
    const A = R3.objs.get(ob.hold.a);
    if (!A || A.kind !== 'actor' || !A.root.parent) continue;
    A.root.updateMatrixWorld(true);
    const at = ob.hold.at || 'R';
    const anchor = at === 'pecho' ? A.chest : at === 'L' ? A.armL.hand : A.armR.hand;
    const g = GRIP[ob.kind][at === 'pecho' ? 'pecho' : 'mano'];
    const off = _m4().compose(new T.Vector3(g[0], g[1], g[2]), new T.Quaternion().setFromEuler(new T.Euler(g[3], g[4], g[5])), new T.Vector3(1, 1, 1));
    const m = _m4().multiplyMatrices(anchor.matrixWorld, off);
    const pos = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3();
    m.decompose(pos, q, sc);
    E.root.position.copy(pos); E.root.quaternion.copy(q); E.root.scale.setScalar(1);
    E.blob.visible = false; E.sel.visible = false;
    if (E.parts.hg) objLay(E.parts, true);
  }
}
/* dibuja el plano en t dentro de un contexto 2D; devuelve el estado */
/* el lienzo del motor solo crece: cada dibujo usa una zona W×H abajo a la izquierda (antes se reasignaba el lienzo
   cada vez que se alternaban miniaturas y editor) */
function r3Viewport(W, H) {
  const cw = Math.max(R3.w, W), ch = Math.max(R3.h, H);
  if (cw !== R3.w || ch !== R3.h) { R3.r.setSize(cw, ch, false); R3.w = cw; R3.h = ch; }
  R3.r.setViewport(0, 0, W, H);
}
/* lo que cambia las sombras: objetos, posturas, luces, escenario y figuras (no la cámara) */
function r3ShadowSig(s3, st) {
  const { keys, objs, aim, shake, ...scene } = s3;     // todo lo del escenario (set, atmósfera, sol, habitación, plano, luz) menos la cámara
  let k = JSON.stringify(scene) + '|' + (typeof ENVB !== 'undefined' ? ENVB.fb : '') + '|' + (typeof FIG3D !== 'undefined' ? Object.keys(FIG3D.tpl).length : 0) + JSON.stringify(st.o);
  for (const o of s3.objs) k += '|' + o.id + o.kind + (o.type || '') + (o.model || '') + (o.kind === 'gente' ? genteKey(o) : '') + (o.el && typeof P !== 'undefined' && P.elements[o.el] ? JSON.stringify(P.elements[o.el].look || 0) : JSON.stringify(o.look || 0));
  return k;
}
function r3Draw(ctx, s3, t, W, H, opts = {}) {
  if (!r3Init()) return null;
  const st = s3At(s3, t);
  if (typeof ENVB !== 'undefined') ENVB.fb = opts.atm || null;   // atmósfera que propone el guion si el plano no eligió una
  r3Sync(s3, st, opts);
  r3Viewport(W, H);
  STY.px.value = Math.max(1, H / 540) / H;   // contorno de al menos ~1 px, proporcional al tamaño de la viñeta
  // opts.view: otra cámara solo para mirar (la vista libre del editor); la del plano no cambia
  const V = opts.view, c = R3.cam, cam = V ? { ...st.cam, x: V.pos[0], h: V.pos[1], z: V.pos[2] } : st.cam;
  for (const ob of s3.objs) { const E = R3.objs.get(ob.id); if (E && E.cut && st.o[ob.id]) updateCutout(E, E.look || lookOf(ob), st.o[ob.id], cam); }
  if (R3.planG && R3.planG.userData.walls) {
    const wild = s3.set === 'plano' && s3.wildWalls;
    const acts = wild ? s3.objs.filter(o => o.kind === 'actor').map(o => st.o[o.id]).filter(Boolean) : [];
    for (const [m, r] of R3.planG.userData.walls) m.visible = !wild || !acts.some(a => segRect(cam.x, cam.z, a.x, a.z, r) != null);
  }
  c.aspect = W / H;
  if (V) { c.setFocalLength(clamp(V.lens || 30, 8, 600)); c.position.fromArray(V.pos); c.up.set(0, 1, 0); c.lookAt(V.target[0], V.target[1], V.target[2]); }
  else {
    c.setFocalLength(camFF(cam));   // el lente, llevado a full frame según el sensor del plano
    c.position.set(cam.x, Math.max(cam.h, groundAt(s3, cam.x, cam.z) + CAM_FLOOR), cam.z);   // nunca dentro del piso
    c.rotation.set(rad(clamp(cam.pitch, -89.9, 89.9)), rad(cam.yaw), rad(cam.roll));
  }
  c.updateProjectionMatrix(); c.updateMatrixWorld();
  // lo pegado a un muro de la habitación (las puertas del ascensor) se esconde si la cámara está del otro lado
  const sides = s3.set === 'int' && typeof roomSideHide === 'function' ? roomSideHide(c) : '';
  envSync(s3, st, !!R3.luz, R3.luz, t);
  // solo dejar la escena lista (para medir o tocar figuras antes de dibujar)
  if (opts.syncOnly) return st;
  // la foto de referencia detrás: sin escenario, cielo ni niebla; las sombras caen sobre un piso invisible
  const plate = !!opts.plate;
  if (plate) {
    for (const k in R3.sets) R3.sets[k].visible = false;
    if (R3.room) R3.room.visible = false;
    if (typeof ENVB !== 'undefined') for (const m of [ENVB.sky, ENVB.sun, ENVB.stars]) if (m) m.visible = false;
    R3.scene.background = null; R3.scene.fog = null;
  }
  r3Catcher(plate);
  // sombras: solo si cambió lo que las proyecta; reproduciendo, a lo sumo unas 8 veces por segundo
  // muros que se esconden según la cámara y recortes fotográficos que la miran: también cambian las sombras
  let sg = r3ShadowSig(s3, st);
  if (R3.planG && R3.planG.userData.walls) sg += '|w' + R3.planG.userData.walls.map(([m]) => m.visible ? 1 : 0).join('');
  if (s3.objs.some(ob => { const E = R3.objs.get(ob.id); return E && E.cut; })) sg += '|c' + [cam.x, cam.z, cam.yaw].map(v => Math.round(v * 20)).join(',');
  if (plate) sg += '|p';
  if (sides) sg += '|r' + sides;
  // viñetas chicas: sombra del sol a 1024 (en pantalla no se nota y cuesta la cuarta parte); visor y video, a 2048
  if (R3.sun && R3.sun.shadow) {
    const ms = Math.max(W, H) > 640 ? 2048 : 1024, S = R3.sun.shadow;
    if (S.mapSize.x !== ms) { S.mapSize.set(ms, ms); if (S.map) { S.map.dispose(); S.map = null; } R3.shSig = null; }
  }
  const now = performance.now();
  if (sg !== R3.shSig && (!(opts.playing || R3.live) || now - (R3.shT || 0) > 120)) { R3.r.shadowMap.needsUpdate = true; R3.shSig = sg; R3.shT = now; }
  // con desenfoque (s3.dof): la escena a una textura con su profundidad y, encima, el desenfoque de lente
  if (!V && !plate && s3.dof && !opts.noDof && r3Dof(s3, st, c, W, H)) { }
  else R3.r.render(R3.scene, c);
  ctx.drawImage(R3.r.domElement, 0, R3.h - H, W, H, 0, 0, W, H);
  if (opts.falseColor && R3.luz) luzFalseColor(ctx, W, H);
  if (opts.labels !== false || opts.poseMenu || (opts.meter && R3.luz)) drawLabels(ctx, s3, st, W, H, opts);
  return st;
}
/* piso invisible que solo recibe sombras (para la foto de referencia detrás de las figuras) */
function r3Catcher(on) {
  if (!R3.catcher) {
    if (!on) return;
    const T = THREE, m = new T.Mesh(new T.PlaneGeometry(160, 160), new T.ShadowMaterial({ opacity: .28, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = .003; m.receiveShadow = true; m.userData.noOutline = true; m.renderOrder = -1;
    R3.scene.add(m); R3.catcher = m;
  }
  R3.catcher.visible = on;
}
const LABEL_UP = .3;   // del hueso de la cabeza a la altura del nombre (m, figura de escala 1)
/* nombres sobre las figuras. En el editor (poseMenu) cada figura que se puede posar lleva además un
   triangulito ▾ junto al nombre (o solo, si los nombres están ocultos): ahí se abre la lista de posturas.
   R3.poseHits guarda dónde quedó cada uno, en píxeles del lienzo. */
function drawLabels(ctx, s3, st, W, H, opts = {}) {
  const v = new THREE.Vector3();
  const fs = Math.max(10, Math.round(W / 50)), names = opts.labels !== false, menu = !!opts.poseMenu, k = opts.k || 1;
  if (menu) R3.poseHits = { W, H, list: [] };
  ctx.save();
  ctx.font = `700 ${fs}px Archivo, Arial, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (const ob of s3.objs) {
    if (ob.kind !== 'actor' && ob.kind !== 'detalle') continue;
    const p = st.o[ob.id];
    if (!p) continue;
    const hh = ob.kind === 'actor' ? lookOf(ob).height : 1.72;
    const top = ob.kind === 'detalle' ? (detailModel(ob) === 'flores' ? 1.42 : 1.06) : p.pose === 'suelo' ? .45 : p.pose === 'sentado' ? hh * .78 + .06 : hh * poseDef(p.pose).h + .1;
    // sobre la cabeza real (sigue la postura y lo que se doble a mano)
    const A = ob.kind === 'actor' && R3.objs.get(ob.id), hb = A && (A.fig ? A.bone('head') : A.head), posable = !!hb && !(A.card && A.card.visible);
    if (posable) { hb.getWorldPosition(v); v.y += LABEL_UP * (lookOf(ob).s || 1); }
    else v.set(p.x, top + liftOf(s3, p), p.z);
    // alto de la figura en pantalla: si se ve pequeña (lejos), el nombre se achica y se vuelve más tenue
    const fy = (1 - new THREE.Vector3(p.x, liftOf(s3, p), p.z).project(R3.cam).y) / 2 * H;
    v.project(R3.cam);
    const hpx = Math.abs(fy - (1 - v.y) / 2 * H), sm = ob.kind === 'actor' ? clamp(hpx / (fs * 9), .62, 1) : 1, fz = Math.max(9, Math.round(fs * sm));
    if (v.z > 1 || v.z < -1) continue;
    let x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue;
    x = clamp(x, fs * 3, W - fs * 3); y = clamp(y, fs, H - fs);
    const name = names ? (ob.name || 'Figura').toUpperCase() : '', tri = menu && posable;
    const R = opts.meter && R3.luz && R3.luz.read[ob.id];
    if (R) {
      // lectura del fotómetro bajo el nombre: diafragma que la expone bien y luz que recibe; el color dice si está bien
      const t = `${fTxt(fRound(R.f))} · ${R.E >= 1000 ? (R.E / 1000).toFixed(1) + ' k' : Math.round(R.E)} lx · ${stopTxt(R.d)}`, my = name || tri ? y + fs * 1.72 : y;
      ctx.font = `700 ${Math.round(fs * .84)}px Archivo, Arial, sans-serif`;
      const mw = ctx.measureText(t).width + fs * .9, c = Math.abs(R.d) <= 1 / 6 ? '#2E9B4F' : R.d > 2 ? '#D93A2B' : R.d > 0 ? '#D9831E' : R.d < -2 ? '#4B3FA8' : '#3477D0';
      ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - mw / 2, my - fs * .66, mw, fs * 1.32, fs * .66) : ctx.rect(x - mw / 2, my - fs * .66, mw, fs * 1.32); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.fillText(t, x - mw / 2 + fs * .45, my + 1);
      ctx.font = `700 ${fs}px Archivo, Arial, sans-serif`;
    }
    if (!name && !tri) continue;
    // nombre en una etiqueta sólida con el color de la figura (el mismo de la planta), letra clara u oscura según
    // el color, sin sombras; el ▾ de posturas va dentro de la etiqueta
    const fn = Math.max(10, Math.round(fz * (W < 700 ? 1.05 : .78)));   // en las miniaturas, un poco más grande para que se lea
    ctx.font = `700 ${fn}px Archivo, Arial, sans-serif`;
    const ls = 'letterSpacing' in ctx;
    if (ls) ctx.letterSpacing = (fn * .05).toFixed(1) + 'px';
    const col = ob.color || '#5A4A3A', ts = fn * .58, gap = name && tri ? fn * .4 : 0, nw = name ? ctx.measureText(name).width : 0;
    const px = fn * .5, ph = Math.round(fn * 1.55), tw = nw + gap + (tri ? ts : 0), bw = tw + px * 2, x0 = x - tw / 2;
    const hx = col.replace('#', ''), rgb = hx.length >= 6 ? [0, 2, 4].map(i => parseInt(hx.slice(i, i + 2), 16) / 255) : [.4, .3, .2];
    const ink = (.2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]) > .6 ? '#1C1F24' : '#FFFFFF';
    ctx.save();
    ctx.globalAlpha = .78 + .22 * sm;
    ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x0 - px, y - ph / 2, bw, ph, Math.max(1.5, 2 * k)) : ctx.rect(x0 - px, y - ph / 2, bw, ph); ctx.fill();
    ctx.fillStyle = ink;
    if (name) ctx.fillText(name, x0, y + 1);
    if (tri) {
      const cx = x0 + tw - ts / 2;
      ctx.beginPath(); ctx.moveTo(cx - ts / 2, y - ts * .2); ctx.lineTo(cx, y + ts * .28); ctx.lineTo(cx + ts / 2, y - ts * .2);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.3, fn * .14); ctx.stroke();
    }
    ctx.restore();
    if (ls) ctx.letterSpacing = '0px';
    if (tri) {
      // zona para tocar: al menos 34 px de pantalla de alto y de ancho
      const mh = Math.max(ph, 34 * k) / 2, mw = Math.max(bw, 34 * k) / 2, mx = x0 + tw / 2;
      R3.poseHits.list.push({ id: ob.id, x0: mx - mw, x1: mx + mw, y0: y - mh, y1: y + mh, ax: x0 + tw + px, ay: y + ph / 2 + 2, bx: x0 - px });
    }
    ctx.font = `700 ${fs}px Archivo, Arial, sans-serif`;
  }
  ctx.restore();
}
/* el triangulito de posturas bajo un punto del lienzo del editor */
function r3PoseHit(px, py, W, H) {
  const P = R3.poseHits; if (!P || P.W !== W || P.H !== H) return null;
  for (let i = P.list.length - 1; i >= 0; i--) { const h = P.list[i]; if (px >= h.x0 && px <= h.x1 && py >= h.y0 && py <= h.y1) return h; }
  return null;
}
/* la cámara de un plano como pirámide: su posición y las cuatro esquinas del cuadro a d metros (para dibujarla) */
function r3ShotFrustum(cam, ar, d = 1) {
  if (!R3.cam) return null;
  const k = new THREE.PerspectiveCamera(30, ar, .05, 100);
  k.filmGauge = 36;   // como la cámara de las viñetas: three trae 35 mm y el cuadro salía un 3 % más abierto
  k.setFocalLength(camFF(cam));
  k.position.set(cam.x, cam.h, cam.z);
  k.rotation.set(rad(clamp(cam.pitch, -89.9, 89.9)), rad(cam.yaw), rad(cam.roll || 0));
  k.updateProjectionMatrix(); k.updateMatrixWorld();
  const out = [[cam.x, cam.h, cam.z]], v = new THREE.Vector3(), o = k.position;
  for (const [x, y] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) { v.set(x, y, .5).unproject(k).sub(o).normalize(); const f = k.getWorldDirection(new THREE.Vector3()); const t = d / Math.max(.05, v.dot(f)); out.push([o.x + v.x * t, o.y + v.y * t, o.z + v.z * t]); }
  return out;
}
/* proyección de un punto del mundo a píxeles con la última cámara */
function r3Project(x, y, z, W, H) { const v = new THREE.Vector3(x, y, z).project(R3.cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, front: v.z < 1 }; }
/* rayo desde un píxel al suelo (y = 0) */
function r3FloorAt(px, py, W, H) {
  const v = new THREE.Vector3(px / W * 2 - 1, -(py / H) * 2 + 1, .5).unproject(R3.cam);
  const o = R3.cam.position, d = v.sub(o).normalize();
  if (d.y > -1e-4) return null;
  const k = -o.y / d.y;
  return { x: o.x + d.x * k, z: o.z + d.z * k };
}
/* rayo desde un píxel a un plano horizontal a la altura y */
function r3PlaneAt(px, py, W, H, y = 0) {
  const v = new THREE.Vector3(px / W * 2 - 1, -(py / H) * 2 + 1, .5).unproject(R3.cam);
  const o = R3.cam.position, d = v.sub(o).normalize();
  if (Math.abs(d.y) < 1e-4) return null;
  const k = (y - o.y) / d.y;
  if (k <= 0) return null;
  return { x: o.x + d.x * k, z: o.z + d.z * k };
}
/* objeto bajo el puntero (raycast) */
function r3Pick(px, py, W, H, s3) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(px / W * 2 - 1, -(py / H) * 2 + 1), R3.cam);
  const roots = s3.objs.map(o => R3.objs.get(o.id) || R3.lights.get(o.id)).filter(E => E && (E.root || E.rig)).map(E => E.root ? E : { root: E.rig });
  for (const E of roots) if (!E.root.parent || !E.root.visible) E.skip = true;
  const hits = ray.intersectObjects(roots.filter(E => !E.skip).map(E => E.root), true).filter(h => h.object.material !== R3.mats.blob && h.object.material !== R3.mats.sel);
  if (!hits.length) return null;
  let o = hits[0].object;
  while (o && !roots.some(E => E.root === o)) o = o.parent;
  for (const ob of s3.objs) { const E = R3.objs.get(ob.id) || R3.lights.get(ob.id); if (E && (E.root || E.rig) === o) return ob.id; }
  return null;
}

/* parte del cuerpo de una figura bajo el puntero (para doblarla) */
function r3PickPart(px, py, W, H, id) {
  const E = R3.objs.get(id);
  if (E && E.ext && E.root.parent) {
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(px / W * 2 - 1, -(py / H) * 2 + 1), R3.cam);
    E.root.updateMatrixWorld(true);
    const hit = ray.intersectObjects(E.meshes.filter(m => m.isSkinnedMesh), false)[0];
    return hit ? ch3PartAt(E, hit) : null;
  }
  if (!E || !E.fig || !E.root.parent) return null;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(px / W * 2 - 1, -(py / H) * 2 + 1), R3.cam);
  E.root.updateMatrixWorld(true);
  const meshes = Object.values(E.meshes).filter(M => M.g.visible && M.m.isSkinnedMesh && M.m.geometry.attributes.skinIndex).map(M => M.m);
  const hit = ray.intersectObjects(meshes, false)[0];
  return hit ? fig3dPartAt(E, hit) : null;
}
/* punto bajo el puntero en el plano que mira a la cámara y pasa por `through` */
function r3DragPoint(px, py, W, H, through, cam = R3.cam) {
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(px / W * 2 - 1, -(py / H) * 2 + 1), cam);
  const n = cam.getWorldDirection(new THREE.Vector3());
  return ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(n, through), new THREE.Vector3());
}

/* ---------- miniaturas ----------
   Cada viñeta se dibuja una sola vez, a 480 px (las vistas más chicas la muestran achicada), y la versión final
   (con las figuras articuladas, la referencia, la anotación y la planta ya cargadas) queda guardada en este
   navegador (TCACHE, IndexedDB) con una clave que reúne todo lo que se ve en ella: al volver a abrir el proyecto
   las viñetas aparecen al instante, sin dibujarlas otra vez. Las versiones intermedias quedan solo en la memoria. */
const THUMB3 = new Map();
const TH_BASE = 480;
const thBase = b => Math.max(TH_BASE, b || TH_BASE);
/* viñeta del plano en el tiempo t: referencia o escena 3D, con la capa de dibujo encima */
function drawShotFrame(ctx, sh, t, W, H, opts = {}) {
  if (sh.ws === '2d' && d2Draw(ctx, sh, t, W, H)) return;
  // la referencia o la anotación que existen pero aún no llegan: se piden y, mientras, un fondo neutro (no la escena 3D)
  const hasRef = frameHas(sh.id), ref = hasRef ? cachedImg(sh.id) : null, blank = shotBlank(sh);
  if (hasRef && !FRAMES[sh.id]) framesNeed([sh.id]);
  if (ref) ctx.drawImage(ref, 0, 0, W, H);
  else if (hasRef) { ctx.fillStyle = '#E4E2DD'; ctx.fillRect(0, 0, W, H); }
  else if (blank) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H); }   // en blanco: la hoja vacía (la anotación va encima)
  // la foto puede ir delante (tapa la escena) o detrás de las figuras y objetos (sh.refBack)
  const back = !!(ref && sh.refBack) && !blank;
  if ((!hasRef && !blank) || back) {
    const o2 = { ...opts, plate: back, atm: typeof sceneOfKey === 'function' ? envFromScene(sceneOfKey(sh.sc)).atm : null };
    if (sh.noNames) o2.labels = false;
    if (!r3Draw(ctx, s3Of(sh), t, W, H, o2) && !back) drawAutoFrame(ctx, W, H, shotSketchInfo(sh));
  }
  if (frameHas(sh.id + '~a') && !FRAMES[sh.id + '~a']) framesNeed([sh.id + '~a']);
  const an = FRAMES[sh.id + '~a'] ? cachedImg(sh.id + '~a') : null;
  if (an) ctx.drawImage(an, 0, 0, W, H);
}
const looksKey = sh => JSON.stringify((sh.s3 ? sh.s3.objs : sh.chars || []).map(o => { const id = typeof o === 'string' ? o : o.el; return id && P.elements[id] ? P.elements[id].look || 0 : 0; }));
/* cuerpos articulados ya cargados para las figuras del plano: si cambia, la miniatura se rehace (solo esa) */
// (y los modelos 3D importados: el del personaje y el del escenario, modelos.js)
const figSig = sh => {
  if (typeof FIG3D === 'undefined' || sh.ws === '2d') return '';
  const s3 = s3Of(sh); let k = '';
  for (const o of s3.objs) if (o.kind === 'actor') { const lk = lookOf(o); k += FIG3D.tpl[fig3dBody(lk.body)] ? 1 : 0; if (lk.model && lk.key) k += m3Ready(m3Key('c', lk.key)) ? 1 : 0; }
  if (s3.set === 'modelo' && typeof set3dKey === 'function') k += m3Ready(set3dKey(s3)) ? 1 : 0;
  return k;
};
/* atmósfera que propone el guion (día, noche…): cambia la viñeta aunque el plano no cambie */
const atmKey = sh => { const sc = typeof sceneOfKey === 'function' && typeof D !== 'undefined' && D.sc ? sceneOfKey(sh.sc) : null; return sc && typeof envFromScene === 'function' ? String(envFromScene(sc).atm || '') : ''; };
/* dibujos de cara del proyecto (figuras genéricas): su huella, recalculada solo cuando cambian */
let FACES_H = [null, null, -1, ''];
function facesSig() {
  const f = (typeof P !== 'undefined' && P && P.faces) || null, rev = typeof FACE_REV !== 'undefined' ? FACE_REV : 0;
  if (FACES_H[0] === P && FACES_H[1] === f && FACES_H[2] === rev) return FACES_H[3];
  FACES_H = [P, f, rev, f && Object.keys(f).length ? hash53(JSON.stringify(f)) : ''];
  return FACES_H[3];
}
/* huella estable de una imagen del plano (la misma en otra sesión): la versión del servidor o, si las imágenes
   están en el equipo, una huella del contenido. null: no se sabe todavía (o cambió aquí y el servidor no la confirmó) */
const FR_FP = new Map();
function framePSig(k) {
  if (!frameHas(k)) return '0';
  if (FRIDX && k in FRIDX) return FR_PEND.has(k) || !FRIDX[k] ? null : 'v' + FRIDX[k];
  const u = FRAMES[k];
  if (!u) return null;
  let e = FR_FP.get(k);
  if (!e || e[0] !== u) { e = [u, u.length.toString(36) + '.' + hash53(u)]; FR_FP.set(k, e); }
  return 'h' + e[1];
}
/* las dos claves de una viñeta: fk (memoria; incluye qué está cargado) y pk (la versión final; null si aún no se
   sabe qué imágenes tiene el proyecto) */
function thumbKeys(sh, t = 0, base = TH_BASE) {
  const s3 = s3Of(sh);
  const common = [sh.id, P.meta.aspect, t, thBase(base), looksKey(sh), JSON.stringify(s3), sh.noNames ? 'nn' : '', sh.refBack ? 'rb' : '', atmKey(sh), P.meta.hair || '', typeof set3dSig === 'function' ? set3dSig(s3) : '', shotBlank(sh) ? 'bl' : ''].join('|');
  const d2 = typeof d2Sig === 'function' ? d2Sig(sh, t) : '';
  const fk = common + '|' + [planSig(sh), figSig(sh), frameSig(sh.id), frameSig(sh.id + '~a'), !!cachedImg(sh.id), !!cachedImg(sh.id + '~a'), d2].join('|');
  let pk = null;
  if (P && FR_KNOWN === P.id) {
    const ks = [sh.id, sh.id + '~a'];
    const two = sh.ws === '2d' && sh.d2 && sh.d2.frames && sh.d2.frames.length;
    if (two) ks.push(d2CKey(sh.id, d2FrameAt(sh.d2, t).id));
    const fs = ks.map(framePSig);
    if (!fs.includes(null)) {
      const pl = typeof planOf === 'function' ? planOf(s3) : null;
      pk = [typeof THV !== 'undefined' ? THV : '', common, fs.join(','), pl ? pl.id + ':' + pl.v + ':' + (s3.planFloor !== false) : '', facesSig(), two ? 'd' + (sh.d2.rev || 0) : ''].join('|');
    }
  }
  return { fk, pk };
}
const thumbCached = (sh, t = 0, base = TH_BASE) => { const K = thumbKeys(sh, t, base); return (K.pk && THUMB3.get(K.pk)) || THUMB3.get(K.fk) || null; };
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
/* figuras articuladas que necesita la miniatura: se pide su carga y se espera (si no, se dibujaría primero el
   maniquí simple y después otra vez) */
function thumbFigsReady(sh) {
  if (typeof FIG3D === 'undefined' || FIG3D.failed || sh.ws === '2d' || (frameHas(sh.id) && !sh.refBack)) return null;
  const pend = [];
  for (const o of s3Of(sh).objs) if (o.kind === 'actor') {
    const b = fig3dBody(lookOf(o).body);
    if (FIG3D.tpl[b]) continue;
    FIG3D.want(b);
    if (FIG3D.loading[b] && !FIG3D.tpl[b]) pend.push(FIG3D.loading[b]);
  }
  // los modelos 3D importados (personajes y escenario): se bajan y se abren antes de dibujar
  const m3w = k => { if (!k || m3Ready(k)) return; m3Tpl(k); const e = M3.tpl.get(k); if (e && e.p) pend.push(e.p); else if (frameHas(k)) pend.push(framesNeed([k]).then(() => { m3Tpl(k); const e2 = M3.tpl.get(k); return e2 && e2.p; })); };
  const s3x = s3Of(sh);
  for (const o of s3x.objs) if (o.kind === 'actor') { const lk = lookOf(o); if (lk.model && lk.key) m3w(m3Key('c', lk.key)); }
  if (s3x.set === 'modelo' && typeof set3dKey === 'function') m3w(set3dKey(s3x));
  // las hebras del pelo (se preparan en los ratos libres): así la viñeta no traba la pantalla al dibujarlas
  if (peloInShot(sh)) { const w = peloTexReady(); if (w) pend.push(w); }
  return pend.length ? Promise.all(pend).catch(() => { }) : null;
}
/* viñetas guardadas en este navegador (IndexedDB). Clave: huella de pk. Se guardan hasta ~1200 (las más viejas se
   borran) y se borran todas al cerrar sesión. Si el navegador no deja (vista previa, modo privado), solo memoria. */
const TCACHE = {
  db: null, q: new Map(), qt: 0, n: 0,
  open() {
    if (this.db) return this.db;
    return (this.db = new Promise(res => {
      try {
        const rq = indexedDB.open('filmspirit-thumb', 1);
        rq.onupgradeneeded = () => { const s = rq.result.createObjectStore('t', { keyPath: 'id' }); s.createIndex('at', 'at'); };
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => res(null);
        rq.onblocked = () => res(null);
      } catch (e) { res(null); }
    }));
  },
  id: pk => pk.length.toString(36) + '.' + hash53(pk) + '.' + hash53(pk, 7),
  async get(ids) {
    const out = new Map(), db = await this.open();
    if (!db || !ids.length) return out;
    await new Promise(res => {
      try {
        const t = db.transaction('t', 'readonly'), st = t.objectStore('t');
        for (const id of ids) { const rq = st.get(id); rq.onsuccess = () => { if (rq.result) out.set(id, rq.result); }; }
        t.oncomplete = t.onerror = t.onabort = () => res();
      } catch (e) { res(); }
    });
    // las que se siguen usando se marcan de nuevo (para no borrarlas por viejas)
    const old = Date.now() - 3 * 864e5;
    for (const r of out.values()) if (r.at < old) this.put(r.id, r.u);
    return out;
  },
  /* se escriben juntas, un momento después (una sola transacción) */
  put(id, u) {
    this.q.set(id, u);
    clearTimeout(this.qt);
    this.qt = setTimeout(() => this.flush(), 600);
  },
  async flush() {
    const L = [...this.q]; this.q.clear();
    const db = L.length && await this.open();
    if (!db) return;
    try {
      const t = db.transaction('t', 'readwrite'), st = t.objectStore('t'), at = Date.now();
      for (const [id, u] of L) st.put({ id, u, at });
      t.oncomplete = () => { this.n += L.length; if (this.n > 60) { this.n = 0; this.trim(); } };
    } catch (e) { }
  },
  /* deja las 1000 más recientes cuando pasan de 1200 */
  async trim() {
    const db = await this.open(); if (!db) return;
    try {
      const t = db.transaction('t', 'readwrite'), st = t.objectStore('t'), c = st.count();
      c.onsuccess = () => {
        let extra = c.result - 1000;
        if (c.result <= 1200) return;
        const cur = st.index('at').openCursor();
        cur.onsuccess = () => { const k = cur.result; if (!k || extra-- <= 0) return; k.delete(); k.continue(); };
      };
    } catch (e) { }
  },
  async clear() {
    const db = await this.open(); if (!db) return;
    await new Promise(res => { try { const t = db.transaction('t', 'readwrite'); t.objectStore('t').clear(); t.oncomplete = t.onerror = t.onabort = () => res(); } catch (e) { res(); } });
  },
};
setTimeout(() => { idle(5000).then(() => TCACHE.trim()); }, 15000);
/* trae a la memoria las viñetas guardadas de esos planos (PDF: no se dibuja ni se descarga lo que ya está) */
async function thumbLoad(shots, t = 0) {
  const want = [];
  for (const sh of shots) { const K = thumbKeys(sh, t); if (K.pk && !THUMB3.has(K.pk) && !THUMB3.has(K.fk)) want.push([K.pk, TCACHE.id(K.pk)]); }
  if (!want.length) return;
  const got = await TCACHE.get([...new Set(want.map(w => w[1]))]);
  for (const [pk, id] of want) { const r = got.get(id); if (r) THUMB3.set(pk, r.u); }
}
/* imágenes de la viñeta (referencia, anotación, cuadro 2D, fotos de los personajes): descargadas y listas para
   dibujar. null si ya lo están (así no se dibuja primero sin la foto y después otra vez con ella) */
function thumbImgKeys(sh) {
  const ks = frameViewKeys(sh.id);
  if (sh.ws !== '2d') for (const o of s3Of(sh).objs) if (o.kind === 'actor' && o.el && P.elements[o.el] && P.elements[o.el].look && P.elements[o.el].look.photo) ks.push(...frameKeysOf('ph~' + o.el));
  return ks;
}
function thumbImgsReady(sh) {
  const dec = () => {
    const ps = [];
    for (const k of thumbImgKeys(sh)) {
      if (!FRAMES[k]) continue;
      cachedImg(k);
      const im = IMGS.get(k);
      if (im && !(im.complete && im.naturalWidth)) ps.push((im.decode ? im.decode() : new Promise(r => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); })).catch(() => { }));
    }
    return ps.length ? Promise.all(ps).then(() => { }) : null;
  };
  const w = framesReady(sh);
  return w ? w.then(dec) : dec();
}
/* versión chica de una viñeta (PDF del animatic): se achica la de 480, sin volver a dibujar la escena */
const THUMB_SM = new Map();
async function thumbSmall(sh, base) {
  const big = shotThumb(sh, 0), k = sh.id + '|' + base, e = THUMB_SM.get(k);
  if (e && e[0] === big) return e[1];
  const im = new Image(); im.src = big;
  try { await im.decode(); } catch (er) { return big; }
  const [W, H] = frameDims(base), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, W, H);
  const u = c.toDataURL('image/jpeg', .84);
  if (THUMB_SM.size > 600) THUMB_SM.clear();
  THUMB_SM.set(k, [big, u]);
  return u;
}
const thumbSmallCached = (sh, base) => { const e = THUMB_SM.get(sh.id + '|' + base); return e && e[0] === thumbCached(sh) ? e[1] : null; };
/* pone la imagen en su elemento (img o fondo) */
function thumbPut(el, url) {
  if (el.tagName === 'IMG') el.src = url; else el.style.backgroundImage = `url(${url})`;
  el.removeAttribute('data-thumb'); el.classList.remove('wait');
}
/* miniaturas pendientes: primero se buscan entre las guardadas en el navegador (todas de una vez); las demás se
   dibujan solo si están a la vista o por aparecer (al desplazar se generan las otras), de a una y en los ratos
   libres, para que la pantalla no se trabe */
let HYD = 0, HYD_IO = null, HYD_Q = [], HYD_RUN = 0;
function hydrateThumbs() {
  const gen = ++HYD;
  if (HYD_IO) { HYD_IO.disconnect(); HYD_IO = null; }
  HYD_Q = [];
  const els = $$('[data-thumb]');
  if (!els.length) return;
  // si aún no se sabe qué imágenes tiene el proyecto, se espera (si no, se dibujarían viñetas sin su referencia)
  const known = P && FR_KNOWN !== P.id && typeof FRAMES_P !== 'undefined' && FRAMES_P ? Promise.race([FRAMES_P, new Promise(r => setTimeout(r, 4000))]) : null;
  (known || Promise.resolve()).then(() => thumbRestore(els)).then(rest => {
    if (gen !== HYD || !rest.length) return;
    if (typeof IntersectionObserver === 'undefined') { HYD_Q = rest; hydPump(gen); return; }
    HYD_IO = new IntersectionObserver(list => {
      if (gen !== HYD) return;
      const vis = list.filter(e => e.isIntersecting).map(e => e.target);
      for (const el of vis) HYD_IO.unobserve(el);
      // las imágenes de esas viñetas se piden juntas (un solo viaje al servidor)
      if (FRIDX) framesNeed(vis.flatMap(el => P.shots[el.dataset.thumb] ? frameViewKeys(el.dataset.thumb) : []));
      // las que están dentro de la pantalla, antes que las que están por aparecer
      vis.sort((a, b) => { const r = x => { const q = x.getBoundingClientRect(); return q.bottom > 0 && q.top < innerHeight && q.right > 0 && q.left < innerWidth ? 0 : 1; }; return r(a) - r(b); });
      HYD_Q.push(...vis);
      hydPump(gen);
    }, { rootMargin: '300px 400px' });
    rest.forEach(el => HYD_IO.observe(el));
  });
}
/* las que ya están (en la memoria o guardadas en el navegador) se ponen enseguida; devuelve las que faltan */
async function thumbRestore(els) {
  const want = [], rest = [];
  for (const el of els) {
    const sh = el.isConnected && thumbShot(el.dataset.thumb);
    if (!sh) continue;
    const K = thumbKeys(sh, 0, +el.dataset.base || TH_BASE), u = (K.pk && THUMB3.get(K.pk)) || THUMB3.get(K.fk);
    if (u) { thumbPut(el, u); continue; }
    if (K.pk) want.push([el, K.pk, TCACHE.id(K.pk)]); else rest.push(el);
  }
  if (want.length) {
    const got = await TCACHE.get([...new Set(want.map(w => w[2]))]);
    for (const [el, pk, id] of want) {
      const r = got.get(id);
      if (r && el.isConnected) { THUMB3.set(pk, r.u); thumbPut(el, r.u); } else if (!r) rest.push(el);
    }
  }
  return rest;
}
function hydPump(gen) {
  if (HYD_RUN === gen) return;
  HYD_RUN = gen;
  const next = () => {
    if (gen !== HYD) { if (HYD_RUN === gen) HYD_RUN = 0; return; }
    // mientras se arrastra o se toca algo, o el animatic reproduce o graba, se espera (dibujar una viñeta lo trabaría);
    // con el editor del plano abierto también: la escena 3D es una sola y el editor usa lo que dejó su último dibujo
    if ((typeof UI !== 'undefined' && UI.pdown) || (typeof AN !== 'undefined' && (AN.playing || AN.recording)) || (typeof EDT !== 'undefined' && EDT)) { setTimeout(next, 250); return; }
    const el = HYD_Q.shift();
    if (!el) { HYD_RUN = 0; return; }
    const sh = thumbShot(el.dataset.thumb);
    if (!sh || !el.isConnected) { next(); return; }
    let wait = null;
    if (!el._fw) { el._fw = 1; wait = thumbImgsReady(sh); }   // una sola espera por viñeta (si falla, se dibuja igual)
    if (!wait) wait = thumbFigsReady(sh);
    if (wait) { HYD_Q.unshift(el); wait.then(() => idle().then(next)); return; }
    thumbPut(el, shotThumb(sh, 0, +el.dataset.base || TH_BASE));
    idle().then(next);
  };
  idle().then(next);
}
/* el plano de una viñeta por dibujar: «<plano>~b» es su cámara B (shotB) */
const thumbShot = k => P.shots[k] || (/~b$/.test(String(k)) ? shotB(P.shots[String(k).slice(0, -2)]) : null);
/* dibuja la viñeta (o la da si ya estaba). La versión final se guarda también en el navegador */
function shotThumb(sh, t = 0, base = TH_BASE) {
  const b = thBase(base), [W, H] = frameDims(b);
  const K = thumbKeys(sh, t, b);
  const have = (K.pk && THUMB3.get(K.pk)) || THUMB3.get(K.fk);
  if (have) return have;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const watch = { miss: 0 }, prev = typeof IMG_WATCH !== 'undefined' ? IMG_WATCH : null;
  if (typeof IMG_WATCH !== 'undefined') IMG_WATCH = watch;
  try { drawShotFrame(c.getContext('2d'), sh, t, W, H); }
  finally { if (typeof IMG_WATCH !== 'undefined') IMG_WATCH = prev; }
  const url = c.toDataURL('image/jpeg', .84);
  if (THUMB3.size > 800) THUMB3.clear();
  const fin = K.pk && !watch.miss && thumbFinal(sh);
  THUMB3.set(fin ? K.pk : K.fk, url);
  if (fin) TCACHE.put(TCACHE.id(K.pk), url);
  return url;
}
/* ¿lo dibujado es la versión final? (figuras articuladas y planta cargadas, 3D disponible) */
function thumbFinal(sh) {
  if (sh.ws === '2d' && sh.d2 && sh.d2.frames && sh.d2.frames.length) return true;
  if (frameHas(sh.id) && !sh.refBack) return true;          // la foto tapa la escena
  if (!R3.r) return false;                                  // sin 3D: el boceto de respaldo no se guarda
  if (typeof FIG3D !== 'undefined' && (FIG3D.failed || figSig(sh).includes('0'))) return false;
  const ps = planSig(sh);
  return !ps || !ps.endsWith(':true:false');                // planta con su imagen de piso aún sin cargar
}

/* ---------- desenfoque de lente (profundidad de campo), como dofsimulator ----------
   Cada píxel se desenfoca con su círculo de confusión: c = f² / (N (s − f)) · |z − s| / z en el sensor (f lente real,
   N diafragma, s foco y z distancia sobre el eje de la cámara), llevado a píxeles con el ancho del sensor. Lo de atrás
   no se derrama sobre lo nítido de adelante; lo de adelante fuera de foco sí cubre lo de atrás. */
const DOF_NS = 96;
function r3Dof(s3, st, c, W, H) {
  const T = THREE, D = R3.dof || (R3.dof = {});
  if (D.bad) return false;
  try {
    if (!D.rt) {
      D.rt = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType, samples: 4, depthTexture: new T.DepthTexture(4, 4) });
      D.rt.depthTexture.type = T.UnsignedIntType;
      D.mat = new T.ShaderMaterial({
        uniforms: { tCol: { value: null }, tDep: { value: null }, res: { value: new T.Vector2() }, cn: { value: .05 }, cf: { value: 500 }, fmm: { value: 35 }, N: { value: 2.8 }, S: { value: 3000 }, pxmm: { value: 10 }, maxR: { value: 20 }, fgR: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
        fragmentShader: `#include <packing>
          uniform sampler2D tCol, tDep; uniform vec2 res; uniform float cn, cf, fmm, N, S, pxmm, maxR, fgR; varying vec2 vUv;
          float zAt(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDep, uv).x, cn, cf) * 1000.; }
          float coc(float z) { return min(fmm * fmm / (N * (S - fmm)) * abs(z - S) / z * pxmm * .5, maxR); }
          void main() {
            float zc = zAt(vUv), cc = coc(zc), R = max(cc, fgR);
            vec4 sum = texture2D(tCol, vUv); float ws = 1.;
            if (R > .6) {
              float rot = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831853;
              for (int i = 0; i < ${DOF_NS}; i++) {
                float fi = float(i), r = sqrt((fi + .5) / ${DOF_NS}.) * R, a = fi * 2.3999632 + rot;
                vec2 uv = vUv + vec2(cos(a), sin(a)) * r / res;
                float zs = zAt(uv), cs = coc(zs);
                if (zs > zc) cs = min(cs, cc * 2.);
                float w = clamp(cs - r + 1., 0., 1.);
                sum += texture2D(tCol, uv) * w; ws += w;
              }
            }
            gl_FragColor = sum / ws;
            #include <colorspace_fragment>
          }`,
        depthTest: false, depthWrite: false,
      });
      D.q = new T.Mesh(new T.PlaneGeometry(2, 2), D.mat); D.q.frustumCulled = false;
      D.qs = new T.Scene(); D.qs.add(D.q); D.qc = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }
    if (D.rt.width !== W || D.rt.height !== H) D.rt.setSize(W, H);
    const cam = st.cam, f = clamp(cam.lens, 8, 600), sw = cam.sw || 36, N = dofF(s3);
    // el foco: a lo largo del eje de la cámara, hasta los ojos de quien se enfoca (sin nadie, a 3 m)
    const fp = dofFocus(s3, st), v = new T.Vector3();
    let sf = 3;
    if (fp) { v.set(fp.x, fp.y, fp.z).applyMatrix4(c.matrixWorldInverse); sf = clamp(-v.z, .1, 400); }
    const S = Math.max(sf * 1000, f * 1.05), pxmm = W / sw, coc = z => f * f / (N * (S - f)) * Math.abs(z - S) / z * pxmm * .5;
    const maxR = Math.max(1, W * .045);   // hasta un 9 % del ancho de diámetro (85 mm f/1.8 a 2 m: el fondo, como en dofsimulator)
    // lo que está delante del foco (figuras y objetos): hasta dónde puede cubrir su desenfoque
    let fgR = 0;
    for (const id in st.o) { const p = st.o[id]; v.set(p.x, 1, p.z).applyMatrix4(c.matrixWorldInverse); const z = -v.z * 1000; if (z > 50 && z < S) fgR = Math.max(fgR, coc(z)); }
    const U = D.mat.uniforms;
    U.cn.value = c.near; U.cf.value = c.far; U.fmm.value = f; U.N.value = N; U.S.value = S; U.pxmm.value = pxmm; U.maxR.value = maxR; U.fgR.value = Math.min(fgR, maxR);
    U.res.value.set(W, H); U.tCol.value = D.rt.texture; U.tDep.value = D.rt.depthTexture;
    R3.r.setRenderTarget(D.rt); R3.r.setViewport(0, 0, W, H); R3.r.clear(); R3.r.render(R3.scene, c);
    R3.r.setRenderTarget(null); R3.r.setViewport(0, 0, W, H); R3.r.render(D.qs, D.qc);
    return true;
  } catch (e) { console.warn('desenfoque:', e); D.bad = true; R3.r.setRenderTarget(null); return false; }
}
