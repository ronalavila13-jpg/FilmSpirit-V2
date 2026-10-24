/* ============================================================
   ENTORNOS Y ATMÓSFERAS
   Cada entorno es un escenario de fondo en el mismo estilo de los
   maniquíes (se arma la primera vez que se usa). La atmósfera da el
   cielo, el sol o la luna, la niebla, la lluvia y el color de la
   luz; con «Simular la luz» también la luz natural en lux.
   El guion los propone: «EXT. PLAYA – ATARDECER» arma la playa con
   el sol bajo y cálido.
   ============================================================ */
/* atmósferas: cielo (cenit, horizonte), sol (elevación, acimut, kelvin, lux reales, intensidad en
   previsualización), cielo en lux, luz del cielo en previsualización (intensidad, color, suelo), niebla */
const S3_ATMS = {
  dia: { name: 'Día', sky: ['#7FB0E0', '#DCE9F3'], sun: { el: 52, az: -34, k: 5600, lux: 90000, pv: 1.6, col: '#FFF6E8', size: 22 }, skyLux: 15000, hemi: [2.1, '#FFFFFF', '#B3ADA0'] },
  amanecer: { name: 'Amanecer', sky: ['#6D7CB4', '#F3B98F'], sun: { el: 6, az: 120, k: 3000, lux: 2500, pv: 1.25, col: '#FFC6A0', size: 46 }, skyLux: 700, hemi: [1.5, '#C9CFF0', '#B39A90'] },
  dorada: { name: 'Hora dorada', sky: ['#7FA2D6', '#F7C987'], sun: { el: 13, az: -62, k: 3500, lux: 12000, pv: 1.55, col: '#FFD39A', size: 36 }, skyLux: 2500, hemi: [1.7, '#FFE7C8', '#B9A68C'] },
  atardecer: { name: 'Atardecer', sky: ['#4B4F8C', '#F28A4F'], sun: { el: 4, az: 165, k: 2400, lux: 1800, pv: 1.35, col: '#FFA36E', size: 58 }, skyLux: 500, hemi: [1.25, '#D7B4D0', '#9E8478'] },
  noche: { name: 'Noche', sky: ['#060A18', '#1B2645'], sun: { el: 40, az: -40, k: 4100, lux: .3, pv: .55, col: '#AFC3FF', size: 16, moon: true }, skyLux: 1, hemi: [.75, '#5C70A8', '#2C3240'], stars: true, ext: { set: 'noche' } },
  nublado: { name: 'Nublado', sky: ['#9AA3AD', '#CDD2D7'], sun: null, skyLux: 12000, hemi: [2.5, '#F2F4F6', '#A6A39C'], pvSun: .3 },
  lluvia: { name: 'Día lluvioso', sky: ['#6E7781', '#A4ABB2'], sun: null, skyLux: 5000, hemi: [2, '#D5DCE3', '#8E908F'], pvSun: .15, rain: true, fog: [8, 75] },
  niebla: { name: 'Niebla', sky: ['#B7BDC2', '#D8DBDD'], sun: null, skyLux: 6000, hemi: [2.3, '#EEF0F1', '#B5B3AE'], pvSun: .35, fog: [2, 28] },
};
const S3_ATM = Object.entries(S3_ATMS).map(([k, a]) => [k, a.name]);
/* entornos: interior o no, color del suelo y niebla (cerca, lejos) */
const S3_ENVS = {
  int: { int: true }, plano: { int: true }, auto: { cab: true, fog: [30, 160] },   // el auto se ilumina con la luz de afuera
  ext: { fog: [25, 140] }, calle: { fog: [25, 140] }, parque: { fog: [25, 150] }, bosque: { fog: [10, 85] },
  montana: { fog: [70, 520] }, playa: { fog: [40, 420] }, mar: { fog: [40, 420] }, desierto: { fog: [40, 380] },
  canaveral: { fog: [18, 120] }, jardin_t: { fog: [25, 150] }, jardin_d: { fog: [25, 150] }, vacio: { studio: true },
};
const atmOf = (s3, fb) => S3_ATMS[s3.atm] ? s3.atm : S3_ATMS[fb] ? fb : 'dia';
// un escenario 3D importado es interior o exterior según se marcó al importarlo (escenarios-3d.js)
const envOf = s3 => s3.set === 'modelo' ? ((typeof set3dOf === 'function' && set3dOf(s3) || {}).int ? S3_ENVS.int : S3_ENVS.ext) : S3_ENVS[s3.set] || S3_ENVS.ext;
/* lo que dice el encabezado de la escena: entorno, atmósfera y lluvia */
function envFromScene(s) {
  if (!s) return { set: 'int', atm: 'dia' };
  const L = deaccent(String(s.loc || '').toUpperCase()), H = deaccent(String(s.heading || '').toUpperCase()), T = deaccent(String(s.tod || '').toUpperCase()), ext = s.ie === 'EXT';
  let set = ext ? 'ext' : 'int', room = '';
  if (/\b(AUTO|CARRO|TAXI|COCHE|CAMIONETA|VEHICULO|COMBI|CUSTER)\b/.test(L)) set = ext ? 'calle' : 'auto';
  else if (ext) {
    if (/PLAYA|ORILLA|MALECON|BALNEARIO/.test(L)) set = 'playa';
    else if (/\b(MAR|ALTAMAR|BOTE|LANCHA|BARCO|YATE|CABALLITO DE TOTORA)\b/.test(L)) set = 'mar';
    else if (/BOSQUE|SELVA|MONTE\b|ARBOLEDA/.test(L)) set = 'bosque';
    else if (/MONTANA|CERRO|SIERRA|NEVADO|QUEBRADA|CORDILLERA|PUNA/.test(L)) set = 'montana';
    else if (/DESIERTO|ARENAL|DUNA|PAMPA/.test(L)) set = 'desierto';
    else if (/CANAVERAL|CANA\b|CHACRA|SEMBRIO|HACIENDA|CAMPO|CULTIVO|MAIZAL/.test(L)) set = 'canaveral';
    else if (/PATIO|JARDIN TRASERO|HUERTO|TENDEDERO|AZOTEA/.test(L)) set = 'jardin_t';
    else if (/JARDIN DELANTERO|ANTEJARDIN|(FRENTE|PUERTA|ENTRADA|FACHADA|PORTON|EXTERIOR) DE (LA )?CASA/.test(L)) set = 'jardin_d';
    else if (/PARQUE|PLAZA|JARDIN|ALAMEDA/.test(L)) set = 'parque';
    else if (/CALLE|AV\.|AVENIDA|JR\.|JIRON|ESQUINA|MERCADO|VEREDA|PISTA|CARRETERA|FACHADA|EDIFICIO|TIENDA|BODEGA|CINE|BARRIO|CUADRA/.test(L)) set = 'calle';
    else if (/\bCASA\b|VIVIENDA|CHALET/.test(L)) set = 'jardin_d';
  }
  let atm = 'dia';
  if (/NOCHE|MADRUGADA|NIGHT/.test(T)) atm = 'noche';
  else if (/ATARDECER|ANOCHECER|OCASO|DUSK/.test(T)) atm = 'atardecer';
  else if (/AMANECER|ALBA|DAWN/.test(T)) atm = 'amanecer';
  else if (/TARDE/.test(T)) atm = 'dorada';
  const rain = /LLUVIA|LLUVIOS|TORMENTA|AGUACERO/.test(H);
  if (/NIEBLA|NEBLINA/.test(H)) atm = 'niebla';
  else if (rain && atm === 'dia') atm = 'lluvia';
  if (set === 'int' && typeof roomFromLoc === 'function') room = roomFromLoc(L);
  return { set, atm, rain: rain && atm !== 'lluvia', room };
}
/* en el auto, las figuras van sentadas: la primera maneja */
function envSeatCar(s3) {
  const seats = [[-.37, .18, 'maneja'], [.37, .18, 'sentado'], [-.4, 1.12, 'sentado'], [.4, 1.12, 'sentado'], [0, 1.12, 'sentado']];
  let n = 0;
  for (const ob of s3.objs) {
    if (ob.kind !== 'actor') continue;
    const sp = seats[n++]; if (!sp) break;
    for (const k of s3.keys) { const p = k.o[ob.id]; if (!p) continue; p.x = sp[0]; p.z = sp[1]; p.rot = 180; p.pose = sp[2]; delete p.j; }
  }
}
/* cámara por el parabrisas, mirando hacia las figuras sentadas */
function envCarCam(s3) {
  const k = s3.keys[0]; if (!k) return;
  Object.assign(k.cam, { x: -.18, z: -1.5, h: 1.2, yaw: 180, pitch: -7, roll: 0, lens: 24 });
  s3.aim = null;
}
/* ---------- piezas ---------- */
const ENVB = { built: {} };
function envMats() {
  if (ENVB.m) return ENVB.m;
  const t = toon;
  return (ENVB.m = {
    grass: t('#AEBF8C'), grassD: t('#94A877'), leaf: t('#86A266'), leafD: t('#5F7D57'), pine: t('#52704F'), bark: R3.mats.bark,
    rock: t('#A9A397'), rockD: t('#8E897F'), sand: t('#E6D6AD'), sandW: t('#CDBB90'), soil: t('#A58F70'), cane: t('#A7BC6E'), caneTop: t('#8FAE5B'),
    mount: t('#9C9483'), mountD: t('#857E70'), snow: t('#F4F5F7'), dune: t('#DCC48F'), cerro: t('#B79A77'),
    water: new THREE.MeshPhongMaterial({ color: '#5F95B8', shininess: 80, specular: '#DDEBF5' }), foam: new THREE.MeshBasicMaterial({ color: '#F3F6F7', transparent: true, opacity: .85 }),
    path: t('#D7CBB0'), wood: R3.mats.wood, paint: t('#9C3E36'), seat: t('#3E4046'), dash: t('#2F3237'), trim: t('#5A5D63'), asph: t(C3.road), metal: R3.mats.metal, deck: t('#A9825C'), hull: t('#E9E4DA'),
  });
}
/* árboles, cañas y piedras en una sola malla por tipo (rápido aunque sean cientos) */
function envInst(geo, mat, list, par, shadow = true) {
  const im = new THREE.InstancedMesh(geo, mat, list.length), d = new THREE.Object3D();
  list.forEach((q, i) => { d.position.set(q[0], q[1], q[2]); d.rotation.set(q[6] || 0, q[4] || 0, 0); const s = q[3] || 1; d.scale.set(s * (q[7] || 1), s * (q[5] || 1), s * (q[7] || 1)); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
  im.instanceMatrix.needsUpdate = true; im.castShadow = shadow; im.receiveShadow = true; im.userData.noOutline = true;
  par.add(im); return im;
}
function envForest(par, items, kind) {
  const M = envMats(), T = THREE;
  const trunk = [], crown = [], crown2 = [];
  for (const [x, z, s, r] of items) {
    trunk.push([x, 1.1 * s, z, s, r]);
    if (kind === 'pino') { crown.push([x, 2.4 * s, z, s, r]); crown2.push([x, 3.5 * s, z, s * .72, r]); }
    else { crown.push([x, 2.8 * s, z, s, r, .9]); crown2.push([x + .4 * s, 2.5 * s, z + .2 * s, s * .7, r]); }
  }
  envInst(rcyl(.12, 2.2, .01, 8, .07), M.bark, trunk, par);
  if (kind === 'pino') { const cone = lowPoly(new T.ConeGeometry(1.1, 2.2, 8)); envInst(cone, M.pine, crown, par); envInst(cone, M.pine, crown2, par); }
  else { const ball = lowPoly(new T.IcosahedronGeometry(.95, 1)); envInst(ball, M.leaf, crown, par); envInst(ball, M.leafD, crown2, par); }
}
function envGround(c, size, y = -.004) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), c); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; return m; }
const envRng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
/* ---------- entornos ---------- */
function envBuild(k) {
  const T = THREE, M = envMats(), g = new T.Group(), rnd = envRng(k.length * 977 + 13);
  const put = (geo, m, x, y, z, par = g) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; par.add(o); return o; };
  // fuera del pasillo de la cámara (delante, hacia +z) y del claro donde actúan
  const free = (x, z, r0 = 4.5) => Math.hypot(x, z) > r0 && !(Math.abs(x) < 3.5 && z > 0 && z < 16);
  const scatter = (n, r0, r1, ok = free) => { const out = []; let tries = 0; while (out.length < n && tries++ < n * 20) { const a = rnd() * Math.PI * 2, r = r0 + Math.sqrt(rnd()) * (r1 - r0), x = Math.cos(a) * r, z = Math.sin(a) * r; if (ok(x, z)) out.push([x, z, .8 + rnd() * .7, rnd() * 6.28]); } return out; };
  const rocks = (n, r0, r1, s0 = .3, s1 = 1.2, mat = M.rock) => envInst(lowPoly(new T.DodecahedronGeometry(.5, 0)), mat, scatter(n, r0, r1).map(([x, z, , r]) => { const s = s0 + rnd() * (s1 - s0); return [x, s * .18, z, s, r, .55 + rnd() * .3]; }), g);
  if (k === 'parque') {
    g.add(envGround(M.grass, 400));
    for (const [w, d, x, z, ry] of [[2.6, 60, 0, -10, 0], [2.6, 60, 0, -10, Math.PI / 2], [2.2, 40, -9, 4, .7]]) { const p = new T.Mesh(new T.PlaneGeometry(w, d), M.path); p.rotation.set(-Math.PI / 2, 0, ry); p.position.set(x, .003, z); p.receiveShadow = true; g.add(p); }
    envForest(g, scatter(70, 7, 60), 'hoja');
    envInst(lowPoly(new T.IcosahedronGeometry(.6, 1)), M.grassD, scatter(60, 5, 40).map(([x, z, s]) => [x, .35 * s, z, s * .9, 0, .7]), g);
    // bancas y faroles cerca, con contorno
    const bench = (x, z, ry) => { const b = new T.Group(); b.position.set(x, 0, z); b.rotation.y = ry; g.add(b); put(rbox(1.6, .06, .42, .02), M.wood, 0, .45, 0, b); put(rbox(1.6, .32, .05, .02), M.wood, 0, .7, -.2, b); for (const sx of [-.7, .7]) put(rbox(.06, .45, .42, .01), M.metal, sx, .22, 0, b); };
    bench(-3.2, -3.4, .4); bench(3.4, -3.8, -.5); bench(-6, 2, 1.4);
    put(rcyl(2.2, .5, .05, 32), M.rock, 0, .25, -16); put(rcyl(1.9, .1, .02, 32), M.water, 0, .46, -16); put(rcyl(.25, 1.6, .03, 16), M.rock, 0, .9, -16);
  } else if (k === 'bosque') {
    g.add(envGround(new THREE.MeshToonMaterial({ color: '#8E9A72', gradientMap: toonRamp() }), 400));
    const pts = scatter(260, 5, 85);
    envForest(g, pts.filter((_, i) => i % 3), 'pino'); envForest(g, pts.filter((_, i) => !(i % 3)), 'hoja');
    rocks(40, 4, 40);
    envInst(lowPoly(new T.IcosahedronGeometry(.5, 1)), M.grassD, scatter(120, 3.5, 30).map(([x, z, s]) => [x, .25 * s, z, s * .8, 0, .6]), g);
  } else if (k === 'montana') {
    g.add(envGround(new THREE.MeshToonMaterial({ color: '#B4AA94', gradientMap: toonRamp() }), 900));
    const peak = lowPoly(new T.ConeGeometry(1, 1, 7)), cap = lowPoly(new T.ConeGeometry(1, 1, 7));
    const far = [], caps = [], mid = [];
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + rnd() * .2, r = 170 + rnd() * 140, h = 40 + rnd() * 70, w = 50 + rnd() * 50; far.push([Math.cos(a) * r, h / 2, Math.sin(a) * r, 1, rnd() * 6, h, 0, w]); if (h > 70) caps.push([Math.cos(a) * r, h - h * .14 + .5, Math.sin(a) * r, 1, 0, h * .3, 0, w * .3]); }
    for (let i = 0; i < 18; i++) { const a = rnd() * Math.PI * 2, r = 50 + rnd() * 60, h = 10 + rnd() * 18, w = 20 + rnd() * 18; if (Math.abs(Math.cos(a) * r) < 20 && Math.sin(a) * r > 0) continue; mid.push([Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r, 1, rnd() * 6, h, 0, w]); }
    envInst(peak, M.mount, far, g, false); envInst(cap, M.snow, caps, g, false); envInst(peak, M.mountD, mid, g, false);
    rocks(70, 4, 45, .4, 2.4, M.rockD);
    envInst(lowPoly(new T.IcosahedronGeometry(.4, 1)), M.grassD, scatter(80, 4, 30).map(([x, z, s]) => [x, .18 * s, z, s * .7, 0, .5]), g);
  } else if (k === 'playa' || k === 'mar') {
    const sea = new T.Mesh(new T.PlaneGeometry(1600, 1600, 1, 1), M.water); sea.rotation.x = -Math.PI / 2; sea.position.y = k === 'mar' ? -.65 : -.03; sea.receiveShadow = true; g.add(sea);
    if (k === 'playa') {
      // arena hacia la cámara; el mar empieza a 6 m, de frente
      const sand = new T.Mesh(new T.PlaneGeometry(1600, 600), M.sand); sand.rotation.x = -Math.PI / 2; sand.position.set(0, -.004, -6 + 300); sand.receiveShadow = true; g.add(sand);
      const wet = new T.Mesh(new T.PlaneGeometry(1600, 1.8), M.sandW); wet.rotation.x = -Math.PI / 2; wet.position.set(0, -.002, -5.1); wet.receiveShadow = true; g.add(wet);
      ENVB.foam = [];
      for (let i = 0; i < 4; i++) { const f = new T.Mesh(new T.PlaneGeometry(1600, .16 + i * .05), M.foam); f.rotation.x = -Math.PI / 2; f.position.set(0, -.015, -6.2 - i * 1.1); f.userData.noOutline = true; g.add(f); ENVB.foam.push(f); }
      // palmeras a los lados
      for (const [x, z, s] of [[-11, 4, 1.1], [-15, 9, 1.3], [13, 6, 1.2], [18, 12, 1], [-24, 2, 1.25]]) {
        const p = new T.Group(); p.position.set(x, 0, z); p.scale.setScalar(s); g.add(p);
        for (let i = 0; i < 6; i++) { const o = put(rcyl(.16 - i * .012, 1.05, .01, 10, .14 - i * .012), M.bark, Math.sin(i * .3) * .35 * i / 3, .5 + i * .98, 0, p); o.rotation.z = -.06 * i; }
        for (let i = 0; i < 7; i++) { const pv = new T.Group(); pv.position.set(Math.sin(1.5) * .35 * 2, 5.85, 0); pv.rotation.y = i / 7 * Math.PI * 2; p.add(pv); const leaf = put(rbox(2.4, .05, .46, .02), M.leafD, 1.1, -.25, 0, pv); leaf.rotation.z = -.38; }
      }
      rocks(14, 8, 40, .4, 1.6, M.rockD);
    } else {
      // mar abierto: las figuras van en la cubierta de un bote
      put(rbox(2.6, .5, 6, .12), M.hull, 0, -.3, .4); put(rbox(2.3, .08, 5.6, .03), M.deck, 0, -.02, .4);
      for (const sx of [-1.2, 1.2]) { put(rcyl(.025, 5.2, .005, 8), M.metal, sx, .62, .4).rotation.x = Math.PI / 2; for (let z = -2; z <= 2.8; z += 1.2) put(rcyl(.02, .62, .005, 8), M.metal, sx, .31, z); }
      put(rbox(1.4, 1.3, 1.2, .08), M.hull, 0, .65, -1.75); put(rbox(1.2, .5, .04, .02), R3.mats.glass, 0, 1, -1.14);   // cabina en la proa, de fondo
    }
    // cerros lejanos en el horizonte (costa peruana)
    const peak = lowPoly(new T.ConeGeometry(1, 1, 7)), list = [];
    for (let i = 0; i < 14; i++) { const a = Math.PI * (.15 + i / 14 * .7), r = 300 + rnd() * 120, h = 25 + rnd() * 40, w = 60 + rnd() * 60; list.push([Math.cos(a) * r * (rnd() < .5 ? -1 : 1), h / 2 - 2, Math.sin(a) * r, 1, rnd() * 6, h, 0, w]); }
    envInst(peak, M.cerro, list, g, false);
  } else if (k === 'desierto') {
    g.add(envGround(M.sand, 900));
    const hill = lowPoly(new T.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), dunes = [];
    for (let i = 0; i < 24; i++) { const a = rnd() * Math.PI * 2, r = 35 + rnd() * 150; const x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) < 12 && z > 0 && z < 60) continue; dunes.push([x, -.2, z, 1, rnd() * 6, 2 + rnd() * 6, 0, 12 + rnd() * 26]); }
    envInst(hill, M.dune, dunes, g);
    const peak = lowPoly(new T.ConeGeometry(1, 1, 7)), far = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = 230 + rnd() * 120, h = 30 + rnd() * 45, w = 70 + rnd() * 50; far.push([Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r, 1, rnd() * 6, h, 0, w]); }
    envInst(peak, M.cerro, far, g, false);
    rocks(20, 6, 60, .3, 1.4, M.rockD);
    envInst(lowPoly(new T.IcosahedronGeometry(.35, 0)), M.grassD, scatter(30, 6, 40).map(([x, z, s]) => [x, .15, z, s * .7, 0, .5]), g);
  } else if (k === 'canaveral') {
    g.add(envGround(M.soil, 600));
    const path = new T.Mesh(new T.PlaneGeometry(3.2, 300), M.path); path.rotation.x = -Math.PI / 2; path.position.y = .002; path.receiveShadow = true; g.add(path);
    // surcos de caña a los dos lados del camino (a lo largo de z)
    const st = [], tops = [];
    for (const side of [-1, 1]) for (let row = 0; row < 22; row++) {
      const x = side * (2.3 + row * 1.15);
      for (let z = -45; z < 45; z += .42) { const jx = (rnd() - .5) * .25, h = 2.4 + rnd() * 1.2, lean = (rnd() - .5) * .12; st.push([x + jx, h / 2, z + (rnd() - .5) * .2, 1, rnd() * 6, h, lean]); tops.push([x + jx, h - .1, z, .9 + rnd() * .4, rnd() * 6]); }
    }
    envInst(rcyl(.022, 1, .002, 6), M.cane, st, g);
    envInst(lowPoly(new T.ConeGeometry(.42, 1.1, 5)), M.caneTop, tops, g);
    for (const side of [-1, 1]) { const wall = put(rbox(140, 3.2, 1, .1), M.caneTop, side * 80, 1.6, 0); wall.rotation.y = Math.PI / 2; wall.scale.set(1, 1, 60); }
    const peak = lowPoly(new T.ConeGeometry(1, 1, 7)), far = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 260 + rnd() * 80, h = 30 + rnd() * 30, w = 80 + rnd() * 40; far.push([Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r, 1, rnd() * 6, h, 0, w]); }
    envInst(peak, M.cerro, far, g, false);
  } else if (k === 'jardin_t' || k === 'jardin_d') {
    envGarden(k, g, put, M, rnd);
  } else if (k === 'auto') {
    // interior de un auto que mira hacia −z, sobre una pista
    const road = new T.Mesh(new T.PlaneGeometry(8, 800), M.asph); road.rotation.x = -Math.PI / 2; road.position.y = -.003; road.receiveShadow = true; g.add(road);
    g.add(envGround(M.grass, 900, -.01));
    for (let z = -390; z < 400; z += 7) { const l = new T.Mesh(new T.PlaneGeometry(.14, 2.6), toon('#F2EFE8')); l.rotation.x = -Math.PI / 2; l.position.set(-1.9, .002, z); g.add(l); }
    envForest(g, scatter(90, 12, 120, (x, z) => Math.abs(x) > 8), 'hoja');
    const car = new T.Group(); g.add(car);
    const P = (geo, m, x, y, z, rx = 0) => { const o = put(geo, m, x, y, z, car); o.rotation.x = rx; return o; };
    P(rbox(1.62, .3, 3.6, .06), M.paint, 0, .2, .2);                     // piso y bajos
    P(rbox(1.5, .04, 3.1, .02), M.dash, 0, .36, .2);
    for (const sx of [-.37, .37]) { P(rbox(.52, .12, .5, .05), M.seat, sx, .44, .2); P(rbox(.52, .64, .13, .05), M.seat, sx, .82, .5, -.18); P(rbox(.26, .17, .09, .04), M.seat, sx, 1.22, .56); }
    P(rbox(1.34, .12, .52, .05), M.seat, 0, .44, 1.15); P(rbox(1.34, .6, .13, .05), M.seat, 0, .8, 1.45, -.15);
    P(rbox(1.56, .34, .5, .06), M.dash, 0, .76, -.8); P(rbox(1.56, .08, .36, .03), M.trim, 0, .95, -.74);
    const wheel = new T.Mesh(new T.TorusGeometry(.19, .022, 8, 28), M.dash); wheel.position.set(-.37, .97, -.44); wheel.rotation.x = -1.15; wheel.castShadow = true; car.add(wheel);
    P(rcyl(.025, .36, .005, 8), M.dash, -.37, .92, -.58, -1.15);
    for (const sx of [-.79, .79]) { P(rbox(.06, .56, 3.3, .02), M.paint, sx, .62, .2); P(rbox(.05, .05, 3.2, .015), M.trim, sx, .93, .2); }
    for (const sx of [-.72, .72]) { const a = P(rbox(.06, .05, .62, .015), M.paint, sx, 1.18, -.66, .95); a.rotation.z = sx > 0 ? -.12 : .12; P(rbox(.07, .5, .09, .015), M.paint, sx, 1.18, .74); P(rbox(.08, .5, .16, .02), M.paint, sx * .97, 1.16, 1.66); }
    P(rbox(1.42, .06, 2.35, .03), M.paint, 0, 1.44, .5);
    P(rbox(1.6, .1, 1.2, .05), M.paint, 0, .82, -1.62); P(rbox(1.6, .1, .8, .05), M.paint, 0, .82, 2.25);
    const glass = R3.mats.glass;
    const ws = new T.Mesh(new T.PlaneGeometry(1.36, .66), glass); ws.position.set(0, 1.17, -.78); ws.rotation.x = -.95; car.add(ws);
    const rw = new T.Mesh(new T.PlaneGeometry(1.3, .5), glass); rw.position.set(0, 1.2, 1.75); rw.rotation.x = .9; car.add(rw);
    for (const sx of [-.8, .8]) { const sw = new T.Mesh(new T.PlaneGeometry(2.3, .46), glass); sw.position.set(sx, 1.18, .5); sw.rotation.y = Math.PI / 2; car.add(sw); }
    put(rbox(.18, .05, .07, .02), M.trim, 0, 1.38, -.42, car);   // retrovisor
  }
  outlineAll(g);
  g.visible = false;
  R3.scene.add(g);
  return g;
}
function envGroup(k) {
  if (R3.sets[k]) return R3.sets[k];
  if (!['parque', 'bosque', 'montana', 'playa', 'mar', 'desierto', 'canaveral', 'auto', 'jardin_t', 'jardin_d'].includes(k)) return null;
  return (R3.sets[k] = envBuild(k));
}
/* ---------- alumbrado público ----------
   Postes con su lámpara a lo largo de las veredas de la calle (y faroles en el parque). Se encienden de noche,
   al atardecer y al amanecer: la lámpara brilla con su halo, cada una deja su charco de luz en el piso y las
   cuatro más cercanas a las figuras iluminan de verdad (la más cercana con sombra). En la simulación de luz
   cuentan en lux: unas 1 100 cd la de la calle (≈ 30 lux en el piso, a 6 m) y 320 cd el farol del parque. */
const LAMP_ON = { noche: 1, atardecer: .75, amanecer: .5 };
const LAMP = { calle: { I: 1100, k: 2200, ang: 130, pv: 80, pool: 4.6 }, parque: { I: 320, k: 3000, ang: 140, pv: 22, pool: 3.2 } };
function envTexRadial(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function envLamps(k) {
  ENVB.lamps = ENVB.lamps || {};
  if (ENVB.lamps[k]) return ENVB.lamps[k];
  const par = R3.sets[k]; if (!par || !LAMP[k]) return null;
  const T = THREE, D = R3.mats.dark, grp = new T.Group(); par.add(grp);
  if (!ENVB.lampOn) {
    ENVB.lampOn = new T.MeshBasicMaterial({ color: '#FFE4B5' }); ENVB.lampOff = new T.MeshBasicMaterial({ color: '#B9BCC2' });
    ENVB.poolTex = envTexRadial([[0, 'rgba(255,196,120,.9)'], [.45, 'rgba(255,170,90,.38)'], [1, 'rgba(255,160,80,0)']]);
    ENVB.glowTex = envTexRadial([[0, 'rgba(255,240,210,1)'], [.18, 'rgba(255,210,150,.75)'], [1, 'rgba(255,190,120,0)']]);
  }
  const put = (geo, m, x, y, z) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; grp.add(o); return o; };
  const list = [], lens = [];
  if (k === 'calle') {
    // poste en el borde de cada vereda y el brazo sobre la pista; de un lado y otro, alternados
    for (const [zP, zH, x0] of [[-1.75, -3.15, 7], [-9.25, -7.85, 0]]) for (let x = -70 + x0; x <= 70; x += 14) {
      put(rcyl(.075, 6.4, .01, 12, .055), D, x, 3.2, zP);
      put(rbox(.07, .07, Math.abs(zH - zP) + .1, .02), D, x, 6.33, (zP + zH) / 2);
      put(rbox(.44, .12, .24, .03), D, x, 6.26, zH);
      const l = put(rbox(.36, .02, .17, .006), ENVB.lampOff, x, 6.195, zH); l.userData.noOutline = true; l.castShadow = false; lens.push(l);
      list.push({ x, y: 6.15, z: zH });
    }
  } else {
    for (const [x, z] of [[-4.6, -1], [4.8, -1.4], [0, -8.5], [-9, -6]]) {
      put(rcyl(.05, 3.4, .01, 12), D, x, 1.7, z);
      const l = put(rsph(.18, 16), ENVB.lampOff, x, 3.5, z); l.castShadow = false; lens.push(l);
      list.push({ x, y: 3.42, z });
    }
  }
  outlineAll(grp);
  const pools = [], glows = [], P = LAMP[k];
  for (const q of list) {
    const pm = new T.MeshBasicMaterial({ map: ENVB.poolTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: .5 });
    const pool = new T.Mesh(new T.PlaneGeometry(P.pool * 2, P.pool * 2), pm); pool.rotation.x = -Math.PI / 2; pool.position.set(q.x, .012, q.z); pool.renderOrder = 2; pool.userData.noOutline = true; pool.visible = false; grp.add(pool); pools.push(pool);
    const gl = new T.Sprite(new T.SpriteMaterial({ map: ENVB.glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); gl.position.set(q.x, q.y - .05, q.z); gl.scale.setScalar(k === 'calle' ? 1.6 : 1.1); gl.visible = false; grp.add(gl); glows.push(gl);
  }
  return (ENVB.lamps[k] = { list, lens, pools, glows });
}
/* las lámparas encendidas que iluminan de verdad: las cuatro más cercanas a las figuras */
function envLampsOn(s3, st) {
  const k = s3.set, P = LAMP[k], on = P ? LAMP_ON[atmOf(s3, ENVB.fb)] || 0 : 0;
  if (!on) return { k, on: 0, near: [] };
  const L = envLamps(k); if (!L) return { k, on: 0, near: [] };
  let x = 0, z = 0, n = 0; for (const ob of s3.objs) if (ob.kind === 'actor' && st.o[ob.id]) { x += st.o[ob.id].x; z += st.o[ob.id].z; n++; }
  if (n) { x /= n; z /= n; }
  const near = L.list.map(q => [q, Math.hypot(q.x - x, q.z - z)]).sort((a, b) => a[1] - b[1]).slice(0, 4).map(a => a[0]);
  return { k, on, near, P };
}
/* para el fotómetro de la simulación: las mismas cuatro lámparas como fuentes, en candelas */
function envLampSources(s3, st) {
  const A = envLampsOn(s3, st); if (!A.on) return [];
  const half = rad(A.P.ang / 2);
  return A.near.map((q, i) => ({ ob: { id: '__farol' + i, type: 'fresnel', name: 'Alumbrado' }, pos: [q.x, q.y, q.z], axis: [0, -1, 0], I: A.P.I * A.on, k: A.P.k, cA: Math.cos(half), cB: Math.cos(half * .35) }));
}
/* ---------- cielo, sol y luna, estrellas, lluvia ---------- */
function envSkyInit() {
  if (ENVB.sky) return;
  const T = THREE;
  const geo = new T.SphereGeometry(420, 32, 16), col = new Float32Array(geo.attributes.position.count * 3);
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  ENVB.sky = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
  ENVB.sky.renderOrder = -10; ENVB.sky.frustumCulled = false; ENVB.sky.userData.noOutline = true;
  R3.scene.add(ENVB.sky);
  const disc = (inner, outer) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(.32, inner); gr.addColorStop(.42, outer); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
  ENVB.sun = new T.Sprite(new T.SpriteMaterial({ map: disc('rgba(255,255,250,1)', 'rgba(255,220,170,.35)'), fog: false, depthWrite: false, transparent: true }));
  ENVB.sun.renderOrder = -9; R3.scene.add(ENVB.sun);
  const sp = [], rnd = envRng(4242);
  for (let i = 0; i < 1100; i++) { const a = rnd() * Math.PI * 2, y = .08 + rnd() * .92, r = Math.sqrt(1 - y * y); sp.push(Math.cos(a) * r * 400, y * 400, Math.sin(a) * r * 400); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sp, 3));
  ENVB.stars = new T.Points(sg, new T.PointsMaterial({ color: '#DDE6FF', size: 1.6, sizeAttenuation: false, fog: false, depthWrite: false, transparent: true, opacity: .9 }));
  ENVB.stars.renderOrder = -9; ENVB.stars.frustumCulled = false; R3.scene.add(ENVB.stars);
  // lluvia: trazos que caen en una caja alrededor de la cámara (su posición sale del tiempo del plano)
  const N = 2200, rp = new Float32Array(N * 6); ENVB.rainBase = [];
  for (let i = 0; i < N; i++) ENVB.rainBase.push([(rnd() - .5) * 36, rnd() * 14, (rnd() - .5) * 36]);
  const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(rp, 3));
  ENVB.rain = new T.LineSegments(rg, new T.LineBasicMaterial({ color: '#AEBCCB', transparent: true, opacity: .6, fog: true, depthWrite: false }));
  ENVB.rain.frustumCulled = false; R3.scene.add(ENVB.rain);
  R3.scene.add(R3.sun.target);
  const sh = R3.sun.shadow; sh.mapSize.set(2048, 2048); sh.camera.left = sh.camera.bottom = -16; sh.camera.right = sh.camera.top = 16; sh.camera.near = .5; sh.camera.far = 120; sh.bias = -.0005; sh.normalBias = .03; sh.camera.updateProjectionMatrix();
}
const envSunDir = (s3, A) => { const S = A.sun || { el: 50, az: -30 }, el = rad(S.el), az = rad(s3.sunAz ?? S.az); return [Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]; };
/* luz natural (para la simulación física): sol o luna en lux, dirección y kelvin, y el cielo como luz ambiente */
function envNatural(s3) {
  const E = envOf(s3);
  if (E.int || E.studio) return { sun: null, sky: 0 };
  const A = S3_ATMS[atmOf(s3, ENVB.fb)];
  return { sun: A.sun ? { lux: A.sun.lux, dir: envSunDir(s3, A), k: A.sun.k } : null, sky: A.skyLux };
}
/* cada cuadro: cielo, sol, niebla, lluvia y espuma según la atmósfera (y la simulación de luz si está activa) */
function envSync(s3, st, sim, S, t) {
  envSkyInit();
  const T = THREE, E = envOf(s3), A = S3_ATMS[atmOf(s3, ENVB.fb)], cam = R3.cam.position;
  const studio = !!E.studio, inside = !!E.int;
  ENVB.sky.visible = !studio;
  // cielo: degradé del horizonte al cenit (bajo el horizonte, el color del horizonte un poco más oscuro)
  const zen = new T.Color(A.sky[0]), hor = new T.Color(A.sky[1]), c = new T.Color(), pos = ENVB.sky.geometry.attributes.position, col = ENVB.sky.geometry.attributes.color;
  const key = A.sky.join() + (sim ? 'S' : '');
  if (ENVB.skyKey !== key) {
    ENVB.skyKey = key;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 420; if (y >= 0) c.copy(hor).lerp(zen, Math.pow(y, .55)); else c.copy(hor).multiplyScalar(.82); col.setXYZ(i, c.r, c.g, c.b); }
    col.needsUpdate = true;
  }
  ENVB.sky.position.copy(cam);
  // en la simulación el cielo se ve según la exposición (de noche, casi negro)
  const bright = sim && S ? clamp(.05 + S.amb * .7 / S.mid, .02, 1.15) : 1;
  ENVB.sky.material.color.setScalar(bright);
  const dir = envSunDir(s3, A);
  ENVB.sun.visible = !studio && !!A.sun;
  if (A.sun) {
    ENVB.sun.position.set(cam.x + dir[0] * 380, cam.y + dir[1] * 380, cam.z + dir[2] * 380);
    ENVB.sun.scale.setScalar(A.sun.size * (A.sun.moon ? 1.4 : 1.8));
    ENVB.sun.material.color.set(A.sun.moon ? '#E9EEF8' : A.sun.col).multiplyScalar(sim ? Math.min(1, bright * 1.6) : 1);
  }
  ENVB.stars.visible = !studio && !!A.stars; ENVB.stars.position.copy(cam);
  // lluvia
  const rainOn = !studio && !inside && !E.cab && !!(A.rain || s3.rain);
  ENVB.rain.visible = rainOn;
  if (rainOn) {
    const p = ENVB.rain.geometry.attributes.position.array, sp = 11, L = .45;
    ENVB.rainBase.forEach(([x, y0, z], i) => { const y = ((y0 - t * sp) % 14 + 14) % 14 - 1 + Math.max(0, cam.y - 6), X = cam.x + x, Z = cam.z + z; p.set([X, y + L, Z, X + .04, y, Z + .03], i * 6); });
    ENVB.rain.geometry.attributes.position.needsUpdate = true;
  }
  if (ENVB.foam) ENVB.foam.forEach((f, i) => { const u = ((t * .22 + i * .27) % 1); f.position.z = -6.2 - (1 - u) * 3.6; f.material.opacity = .85; f.scale.y = .6 + u; });
  // ¿cambia la imagen con el tiempo aunque nada se mueva? (lluvia, olas): el animatic no puede repetir el cuadro
  const inScene = o => { for (; o; o = o.parent) { if (!o.visible) return false; if (o === R3.scene) return true; } return false; };
  ENVB.tdep = rainOn || !!(ENVB.foam && ENVB.foam.length && inScene(ENVB.foam[0]));
  // alumbrado público
  const LO = envLampsOn(s3, st);
  for (const key in ENVB.lamps || {}) {
    const Lm = ENVB.lamps[key], act = key === LO.k && LO.on > 0;
    Lm.lens.forEach(m => { m.material = act ? ENVB.lampOn : ENVB.lampOff; });
    const pk = sim && S ? clamp(LAMP[key].I / (LAMP[key].pool * LAMP[key].pool * 1.8) / S.mid * .6, 0, .7) : .5 * (LO.on || 0);
    Lm.pools.forEach(p => { p.visible = act; p.material.opacity = pk; });
    Lm.glows.forEach(g => { g.visible = act; g.material.opacity = sim && S ? clamp(bright * 3, .25, 1) : LO.on; });
  }
  if (!ENVB.lampL) {
    ENVB.lampL = [0, 1, 2, 3].map(i => { const L = new T.SpotLight('#FFC27A', 0, 0, .55, .65, 2); L.castShadow = i === 0; if (i === 0) { L.shadow.mapSize.set(1024, 1024); L.shadow.camera.near = .3; L.shadow.camera.far = 20; L.shadow.bias = -.0006; L.shadow.normalBias = .02; } R3.scene.add(L); R3.scene.add(L.target); L.visible = false; return L; });
  }
  ENVB.lampL.forEach((L, i) => {
    const q = LO.near[i];
    L.visible = !!q && !studio;
    if (!q) return;
    L.position.set(q.x, q.y, q.z); L.target.position.set(q.x, 0, q.z + (q.z < -5.5 ? 1.2 : -1.2) * (LO.k === 'calle' ? 1 : 0)); L.target.updateMatrixWorld();
    L.angle = rad(LO.P.ang / 2);
    L.intensity = sim && S ? LO.P.I * LO.on * S.gain : LO.P.pv * LO.on;
    L.color.set(sim && S ? lightColor(LO.P.k, (s3.light || {}).wb) : '#FFC27A');
  });
  // niebla del color del horizonte
  const fog = A.fog || E.fog || [25, 140];
  if (studio) { R3.sun.castShadow = false; R3.hemi.color.set('#FFFFFF'); R3.hemi.groundColor.set('#B3ADA0'); R3.sun.color.set('#FFFFFF'); R3.sun.position.set(-4, 9, 6); R3.sun.target.position.set(0, 0, 0); R3.sun.target.updateMatrixWorld(); return; }
  R3.scene.background = hor.clone().multiplyScalar(bright);
  R3.scene.fog = new T.Fog(R3.scene.background, inside && !A.fog ? 30 : fog[0], inside && !A.fog ? 90 : fog[1]);
  // luz: el sol o la luna (con sombras afuera) y la luz del cielo
  const ctr = (() => { let x = 0, z = 0, n = 0; for (const ob of s3.objs) if (ob.kind === 'actor' && st.o[ob.id]) { x += st.o[ob.id].x; z += st.o[ob.id].z; n++; } return n ? [x / n, z / n] : [0, 0]; })();
  R3.sun.position.set(ctr[0] + dir[0] * 40, dir[1] * 40, ctr[1] + dir[2] * 40);
  R3.sun.target.position.set(ctr[0], 0, ctr[1]); R3.sun.target.updateMatrixWorld();
  R3.sun.castShadow = !inside && !!A.sun && A.sun.el > 2;
  if (sim && S) {
    const N = envNatural(s3);
    R3.sun.intensity = N.sun ? N.sun.lux * S.gain : 0;
    R3.sun.color.set(N.sun ? lightColor(N.sun.k, (s3.light || {}).wb) : '#ffffff');
    R3.hemi.color.set(inside ? '#FFFFFF' : A.hemi[1]); R3.hemi.groundColor.set(inside ? '#B3ADA0' : A.hemi[2]);
  } else {
    // previsualización: se ve claro siempre, con el color de la hora
    const night = !!(A.sun && A.sun.moon);
    R3.sun.intensity = inside ? (night ? .35 : 1.6) : A.sun ? A.sun.pv : A.pvSun || .3;
    R3.sun.color.set(A.sun ? A.sun.col : '#FFFFFF');
    R3.hemi.intensity = inside ? (night ? 1.7 : 2.1) : A.hemi[0];
    R3.hemi.color.set(inside ? (night ? '#FFE6C8' : '#FFFFFF') : A.hemi[1]); R3.hemi.groundColor.set(inside ? '#B3ADA0' : A.hemi[2]);
  }
}
