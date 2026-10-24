/* ============================================================
   ANIMALES · en el mismo estilo de los maniquíes
   Un armado de cuadrúpedo (torso, patas con rodilla y corvejón, cuello, cabeza con hocico, orejas,
   cola) que cada animal ajusta con sus medidas reales; la gallina, el dragón y el dinosaurio tienen
   el suyo. Miran hacia +z y pisan en y = 0. El color del pelaje se elige como el de un vehículo.
   ============================================================ */
const ANI = {
  // L: entre hombro y cadera · R: radio del torso · legH: largo de pata · neck: [largo, ángulo, radio] · head: [radio, hocico, radio del hocico, inclinación]
  perro: { name: 'Perro', L: .5, R: .15, legH: .36, legR: .035, neck: [.2, 52, .075], head: [.088, .15, .045, 14], ears: 'droop', tail: 'dog', tailL: .32, paw: true, col: '#B5824F', col2: '#EFE6D6', fp: [.32, .95] },
  gato: { name: 'Gato', L: .28, R: .085, legH: .2, legR: .02, neck: [.08, 50, .045], head: [.07, .035, .03, 0], ears: 'cat', tail: 'cat', tailL: .3, paw: true, col: '#D9914A', col2: '#F3EBDD', fp: [.2, .62] },
  caballo: { name: 'Caballo', L: 1.05, R: .33, legH: .95, legR: .055, neck: [.75, 52, .17], head: [.15, .42, .1, 58], ears: 'up', tail: 'horse', tailL: .8, hoof: true, mane: true, col: '#7A4E2E', col2: '#2A1F18', fp: [.65, 2.4] },
  toro: { name: 'Toro', L: 1.15, R: .45, legH: .7, legR: .075, neck: [.35, 22, .3], head: [.2, .3, .15, 50], ears: 'side', tail: 'cow', tailL: .8, hoof: true, horns: 'bull', hump: true, col: '#2B2522', col2: '#D9CFC0', fp: [.95, 2.6] },
  vaca: { name: 'Vaca', L: 1.1, R: .42, legH: .72, legR: .065, neck: [.35, 25, .25], head: [.18, .3, .13, 55], ears: 'side', tail: 'cow', tailL: .8, hoof: true, horns: 'cow', spots: true, udder: true, col: '#F1EEE7', col2: '#2B2826', fp: [.9, 2.45] },
  burro: { name: 'Burro', L: .78, R: .25, legH: .72, legR: .045, neck: [.5, 50, .13], head: [.13, .32, .085, 55], ears: 'long', tail: 'cow', tailL: .55, hoof: true, mane: true, muzzle: true, col: '#8E8A84', col2: '#3D3935', fp: [.5, 1.8] },
  llama: { name: 'Llama', L: .72, R: .24, legH: .8, legR: .04, neck: [.8, 78, .1], head: [.1, .17, .065, 25], ears: 'banana', tail: 'short', tailL: .18, hoof: true, wool: true, col: '#E8DCC8', col2: '#6B4F3A', fp: [.5, 1.5] },
  oveja: { name: 'Oveja', L: .55, R: .26, legH: .4, legR: .03, neck: [.18, 35, .09], head: [.1, .13, .06, 40], ears: 'side', tail: 'short', tailL: .12, hoof: true, wool: true, darkHead: true, col: '#F1ECE1', col2: '#2E2B29', fp: [.55, 1.15] },
  cerdo: { name: 'Cerdo', L: .62, R: .27, legH: .26, legR: .045, neck: [.08, 10, .2], head: [.16, .12, .09, 0], ears: 'flop', tail: 'pig', tailL: .1, hoof: true, snoutDisk: true, col: '#E8B4A8', col2: '#C98A80', fp: [.55, 1.25] },
};
const ANI_SPECIAL = { gallina: { name: 'Gallina', col: '#B85A2E', fp: [.25, .42] }, dragon: { name: 'Dragón', col: '#4E7D3E', fp: [7.2, 9] }, dinosaurio: { name: 'Dinosaurio (T-rex)', col: '#6F7A4C', fp: [1.8, 8.4] } };
const ANI_COLORS = ['#F1EEE7', '#E8DCC8', '#D9914A', '#B5824F', '#7A4E2E', '#3B2A20', '#1F1D1C', '#8E8A84', '#4E7D3E', '#8E2C2C'];
const isAnimal = k => !!(ANI[k] || ANI_SPECIAL[k]);
Object.assign(S3_PROPS, Object.fromEntries([...Object.entries(ANI), ...Object.entries(ANI_SPECIAL)].map(([k, a]) => [k, { name: a.name, w: a.fp[0], d: a.fp[1], cat: 'animal', paint: true }])));
Object.assign(VEH_PAINT, Object.fromEntries([...Object.entries(ANI), ...Object.entries(ANI_SPECIAL)].map(([k, a]) => [k, a.col])));
function aniMats() {
  if (R3.mats.aEye) return R3.mats;
  Object.assign(R3.mats, { aEye: toon('#121212'), aNose: toon('#2A2522'), aPink: toon('#E7A9A0'), aHoof: toon('#3A332E'), aHorn: toon('#E9E1CF'), aRed: toon('#C83A2E'), aYellow: toon('#E8B23A'), aTooth: toon('#F4F0E4'), aClaw: toon('#2C2723') });
  return R3.mats;
}
/* piezas: elipsoide y tubo cónico de a hasta b */
function aniKit(inner) {
  const T = THREE;
  const ell = (x, y, z, rx, ry, rz, m, par = inner) => { const mx = Math.max(rx, ry, rz), o = new T.Mesh(rsph(1, mx < .05 ? 12 : mx < .14 ? 16 : 22), m); o.position.set(x, y, z); o.scale.set(rx, ry, rz); par.add(o); return o; };
  const seg = (a, b, r1, r2, m, par = inner) => {
    const A = new T.Vector3(...a), Bv = new T.Vector3(...b), d = Bv.clone().sub(A), L = d.length();
    const o = new T.Mesh(rcyl(r1, L, Math.min(r1, r2) * .45, 14, r2), m); o.position.copy(A).add(Bv).multiplyScalar(.5);
    o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); par.add(o);
    const j = new T.Mesh(rsph(r2, 14), m); j.position.copy(Bv); par.add(j);   // articulación redondeada
    return o;
  };
  const cone = (x, y, z, r, h, m, rx = 0, rz = 0, ry = 0, par = inner) => { const o = new T.Mesh(rcyl(r, h, r * .2, 12, r * .08), m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); par.add(o); return o; };
  return { ell, seg, cone };
}
/* cuadrúpedo */
function aniQuad(k, inner, paint) {
  const A = ANI[k], M = aniMats(), { ell, seg, cone } = aniKit(inner);
  const c2 = toon(A.col2);
  const { L, R, legH, legR } = A, yc = legH + R * .55, zs = L / 2, zh = -L / 2;
  // torso: pecho, cadera y el medio
  ell(0, yc + R * .06, zs * .72, R * .98, R * 1.05, R * 1.1, paint);
  ell(0, yc, zh * .78, R * .95, R * .98, R * 1.05, paint);
  ell(0, yc + R * .02, 0, R * .92, R * .96, L * .55, paint);
  if (A.hump) ell(0, yc + R * .62, zs * .62, R * .55, R * .42, R * .7, paint);
  if (A.wool) for (let i = 0; i < 26; i++) { const a = i * 2.4, t = (i % 7) / 6 - .5; ell(Math.cos(a) * R * .72, yc + Math.sin(a) * R * .72 + R * .08, t * L * 1.15, R * .42, R * .42, R * .45, paint); }
  if (A.spots) for (const [x, y, z, s] of [[R * .7, yc + R * .2, .1, .22], [-R * .68, yc + .05, -.25, .26], [R * .55, yc + .2, -.4, .18], [-R * .5, yc + R * .5, .3, .2], [0, yc + R * .9, -.05, .12]]) ell(x, y, z, Math.abs(x) > .1 ? .06 : s, s * .8, s, c2);
  if (A.udder) { ell(0, yc - R * .78, zh * .55, R * .32, R * .22, R * .3, M.aPink); for (const [x, z] of [[-.05, -.03], [.05, -.03], [-.05, .05], [.05, .05]]) cone(x, yc - R * .95, zh * .55 + z, .018, .06, M.aPink, Math.PI); }
  // patas: delanteras rectas, traseras con corvejón
  const hoofM = A.hoof ? M.aHoof : paint, xL = R * .52;
  for (const sx of [-1, 1]) {
    const x = sx * xL;
    const f0 = [x, yc - R * .35, zs * .82], f1 = [x, legH * .5, zs * .88], f2 = [x, legH * .07, zs * .9];
    seg(f0, f1, legR * 1.55, legR * 1.05, paint); seg(f1, f2, legR * 1.05, legR * .9, A.darkHead ? c2 : paint);
    const b0 = [x, yc - R * .3, zh * .82], b1 = [x, legH * .58, zh * .82 - R * .35], b2 = [x, legH * .3, zh * .8 - R * .32], b3 = [x, legH * .07, zh * .78];
    seg(b0, b1, legR * 1.9, legR * 1.15, paint); seg(b1, b2, legR * 1.15, legR, A.darkHead ? c2 : paint); seg(b2, b3, legR, legR * .9, A.darkHead ? c2 : paint);
    for (const [px, pz] of [[x, zs * .9], [x, zh * .78]]) {
      if (A.paw) ell(px, legR * .55, pz + legR * .5, legR * 1.15, legR * .6, legR * 1.5, paint);
      else { const h = inner.add(new THREE.Mesh(rcyl(legR * 1.08, legH * .08, legR * .25, 12, legR * .95), hoofM)); inner.children[inner.children.length - 1].position.set(px, legH * .04, pz); }
    }
  }
  // cuello y cabeza
  const na = A.neck[1] * Math.PI / 180, n0 = [0, yc + R * .45, zs * .82 + R * .35], n1 = [0, n0[1] + Math.sin(na) * A.neck[0], n0[2] + Math.cos(na) * A.neck[0]];
  seg(n0, n1, A.neck[2], A.neck[2] * .82, paint);
  if (A.mane) for (let i = 0; i <= 6; i++) { const t = i / 6; ell(0, n0[1] + (n1[1] - n0[1]) * t + A.neck[2] * .7, n0[2] + (n1[2] - n0[2]) * t - A.neck[2] * .35, .035, A.neck[2] * .45, A.neck[0] * .1 + .04, c2); }
  const [hr, sl, sr, sa0] = A.head, hc = [0, n1[1] + hr * .35, n1[2] + hr * .25], headM = A.darkHead ? c2 : paint;
  ell(hc[0], hc[1], hc[2], hr * .95, hr, hr * 1.05, headM);
  const sa = sa0 * Math.PI / 180, s1 = [0, hc[1] - Math.sin(sa) * sl, hc[2] + Math.cos(sa) * sl];
  if (sl > .04) seg([0, hc[1] - hr * .1, hc[2] + hr * .3], s1, hr * .78, sr, headM);
  const tip = sl > .04 ? s1 : [0, hc[1] - hr * .1, hc[2] + hr * .9];
  if (A.muzzle) ell(tip[0], tip[1], tip[2], sr * 1.05, sr * 1.05, sr * 1.05, c2);
  if (A.snoutDisk) { const d = inner.add(new THREE.Mesh(rcyl(sr * .95, sr * .5, sr * .15, 16), M.aPink)); const o = inner.children[inner.children.length - 1]; o.position.set(tip[0], tip[1], tip[2] + sr * .2); o.rotation.x = Math.PI / 2; for (const sx of [-1, 1]) ell(sx * sr * .35, tip[1], tip[2] + sr * .47, sr * .14, sr * .2, sr * .05, M.aNose); }
  else ell(tip[0], tip[1] + sr * .25, tip[2] + sr * .55, sr * .5, sr * .32, sr * .3, k === 'gato' || k === 'cerdo' ? M.aPink : M.aNose);
  for (const sx of [-1, 1]) ell(sx * hr * .55, hc[1] + hr * .28, hc[2] + hr * .62, hr * .14, hr * .16, hr * .1, M.aEye);
  // orejas
  for (const sx of [-1, 1]) {
    const ex = sx * hr * .6, ey = hc[1] + hr * .75, ez = hc[2] - hr * .1;
    if (A.ears === 'up') cone(ex, ey + hr * .25, ez, hr * .22, hr * .7, paint, -.2, -sx * .15);
    else if (A.ears === 'cat') cone(ex * 1.1, ey + hr * .12, ez + hr * .1, hr * .32, hr * .62, paint, 0, -sx * .25);
    else if (A.ears === 'long') cone(ex, ey + hr * .9, ez - hr * .2, hr * .26, hr * 1.9, paint, -.35, -sx * .25);
    else if (A.ears === 'banana') { const e = cone(ex * .9, ey + hr * .5, ez, hr * .2, hr * 1.2, paint, -.1, -sx * .1); }
    else if (A.ears === 'droop') ell(sx * hr * .95, hc[1] + hr * .1, ez, hr * .14, hr * .55, hr * .35, A.col2 && k === 'perro' ? paint : paint);
    else if (A.ears === 'flop') { const e = ell(sx * hr * .7, ey, hc[2] + hr * .35, hr * .4, hr * .1, hr * .38, paint); e.rotation.x = .5; }
    else ell(sx * hr * 1.15, hc[1] + hr * .45, ez, hr * .42, hr * .14, hr * .24, paint);   // a los lados (vaca, toro, oveja)
  }
  if (A.horns === 'bull') for (const sx of [-1, 1]) { seg([sx * hr * .7, hc[1] + hr * .7, hc[2]], [sx * hr * 1.5, hc[1] + hr * .95, hc[2] + hr * .25], hr * .16, hr * .1, M.aHorn); seg([sx * hr * 1.5, hc[1] + hr * .95, hc[2] + hr * .25], [sx * hr * 1.7, hc[1] + hr * 1.4, hc[2] + hr * .55], hr * .1, hr * .03, M.aHorn); }
  if (A.horns === 'cow') for (const sx of [-1, 1]) seg([sx * hr * .6, hc[1] + hr * .75, hc[2] - hr * .1], [sx * hr * 1.05, hc[1] + hr * 1.25, hc[2] + hr * .05], hr * .11, hr * .04, M.aHorn);
  // cola
  const t0 = [0, yc + R * .35, zh - R * .82];
  if (A.tail === 'dog') { const t1 = [0, t0[1] + A.tailL * .6, t0[2] - A.tailL * .55]; seg(t0, t1, legR * .9, legR * .45, paint); }
  else if (A.tail === 'cat') { const t1 = [0, t0[1] + A.tailL * .25, t0[2] - A.tailL * .55], t2 = [0, t1[1] + A.tailL * .6, t1[2] - A.tailL * .1]; seg(t0, t1, legR * .75, legR * .6, paint); seg(t1, t2, legR * .6, legR * .5, paint); }
  else if (A.tail === 'horse') { seg(t0, [0, t0[1] + .05, t0[2] - .15], .06, .05, c2); const h = cone(0, t0[1] - A.tailL * .45, t0[2] - .32, .1, A.tailL, c2, Math.PI + .3); }
  else if (A.tail === 'cow') { const t1 = [0, t0[1] - A.tailL * .85, t0[2] - .1]; seg(t0, t1, .025, .018, paint); ell(t1[0], t1[1] - .06, t1[2], .045, .1, .045, c2); }
  else if (A.tail === 'pig') { const tg = new THREE.Mesh(new THREE.TorusGeometry(.035, .012, 6, 14, Math.PI * 1.6), paint); tg.position.set(0, t0[1], t0[2] - .02); tg.rotation.y = Math.PI / 2; inner.add(tg); }
  else ell(0, t0[1], t0[2] - A.tailL * .3, A.tailL * .45, A.tailL * .5, A.tailL * .6, paint);
}
function aniHen(inner, paint) {
  const M = aniMats(), { ell, seg, cone } = aniKit(inner);
  ell(0, .25, 0, .09, .1, .14, paint);
  for (let i = 0; i < 5; i++) { const f = ell(0, .32 + i * .012, -.13 - i * .005, .02, .07, .05, M.aNose); f.rotation.x = .9 - i * .12; f.position.x = (i - 2) * .015; }
  ell(0, .36, .12, .055, .065, .06, paint);
  for (let i = 0; i < 3; i++) ell(0, .42 + i * .008, .1 + i * .025, .01, .025, .015, M.aRed);
  cone(0, .36, .19, .016, .045, M.aYellow, Math.PI / 2);
  ell(0, .33, .17, .012, .025, .01, M.aRed);
  for (const sx of [-1, 1]) { ell(sx * .04, .375, .145, .01, .012, .008, M.aEye); seg([sx * .035, .17, 0], [sx * .035, .02, .01], .008, .007, M.aYellow); ell(sx * .035, .01, .03, .012, .006, .035, M.aYellow); ell(sx * .085, .26, -.01, .02, .07, .1, paint); }
}
function aniDragon(inner, paint) {
  const M = aniMats(), { ell, seg, cone } = aniKit(inner), belly = toon('#D9C77A'), wingM = toon('#3E6232');
  const L = 2.4, R = .62, legH = 1.0, yc = legH + R * .5;
  ell(0, yc, .2, R, R * .95, L * .62, paint); ell(0, yc - R * .25, .3, R * .78, R * .62, L * .5, belly);
  ell(0, yc + .05, L * .45, R * 1.02, R, R * 1.1, paint); ell(0, yc, -L * .4, R * .95, R * .9, R, paint);
  // patas con garras
  for (const sx of [-1, 1]) for (const [z, back] of [[L * .45, 0], [-L * .38, 1]]) {
    const x = sx * R * .65, a = [x, yc - R * .3, z], b = [x + sx * .1, legH * .5, z + (back ? -.3 : .15)], c = [x + sx * .1, .12, z + .05];
    seg(a, b, .22, .15, paint); seg(b, c, .15, .12, paint); ell(c[0], .08, c[2] + .12, .16, .08, .24, paint);
    for (const dx of [-.07, 0, .07]) cone(c[0] + dx, .05, c[2] + .36, .03, .12, M.aClaw, Math.PI / 2);
  }
  // cuello en S y cabeza con cuernos y mandíbula
  const ns = [[0, yc + .35, L * .62], [0, yc + .95, L * .85], [0, yc + 1.55, L * .78], [0, yc + 1.9, L * .95]];
  for (let i = 0; i < 3; i++) seg(ns[i], ns[i + 1], .34 - i * .06, .28 - i * .06, paint);
  const h = ns[3];
  ell(0, h[1] + .1, h[2] + .2, .24, .22, .32, paint); ell(0, h[1] - .02, h[2] + .55, .17, .13, .3, paint); ell(0, h[1] - .14, h[2] + .45, .15, .07, .28, belly);
  for (const sx of [-1, 1]) { ell(sx * .14, h[1] + .2, h[2] + .38, .045, .04, .035, M.aYellow); seg([sx * .12, h[1] + .25, h[2] + .05], [sx * .2, h[1] + .55, h[2] - .35], .07, .015, M.aHorn); for (let i = 0; i < 4; i++) cone(sx * .1, h[1] - .08, h[2] + .5 + i * .07, .015, .05, M.aTooth, Math.PI); }
  // cola larga con púas y alas
  const ts = [[0, yc + .1, -L * .55], [0, yc - .1, -L * .95], [0, yc - .35, -L * 1.35], [0, yc - .45, -L * 1.75], [0, yc - .4, -L * 2.05]];
  for (let i = 0; i < 4; i++) seg(ts[i], ts[i + 1], .36 - i * .08, .28 - i * .08, paint);
  const tipZ = ts[4][2]; cone(0, ts[4][1], tipZ - .15, .12, .35, M.aHorn, -Math.PI / 2);
  for (let i = 0; i < 12; i++) { const t = i / 11, z = L * .8 - t * L * 2.6; const y = yc + R * .95 - Math.max(0, -z - L * .5) * .25; cone(0, y, z, .07 - t * .03, .22 - t * .08, M.aHorn); }
  for (const sx of [-1, 1]) {
    const sh = [sx * R * .55, yc + R * .65, L * .35], el = [sx * 1.4, yc + 1.5, L * .1], wt = [sx * 3.4, yc + 1.1, -L * .2];
    seg(sh, el, .1, .08, paint); seg(el, wt, .08, .04, paint);
    const fingers = [[sx * 3.1, yc - .2, -L * .65], [sx * 2.4, yc - .45, -L * .85], [sx * 1.5, yc - .3, -L * .7]];
    for (const f of fingers) seg(el, f, .05, .02, paint);
    const pts = [el, wt, ...fingers, [sx * .7, yc + .2, -L * .3], sh];
    const shp = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[2])));
    const geo = new THREE.ExtrudeGeometry(shp, { depth: .03, bevelEnabled: false }); geo.rotateX(Math.PI / 2);
    // la membrana sigue la altura de cada punta: se dobla repartiendo la y según la distancia al hombro
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); let best = pts[0], bd = 1e9; let wy = 0, ws = 0; for (const p of pts) { const d = Math.hypot(p[0] - x, p[2] - z) + .05; wy += p[1] / (d * d); ws += 1 / (d * d); } pos.setY(i, pos.getY(i) + wy / ws); }
    geo.computeVertexNormals();
    const w = new THREE.Mesh(geo, wingM); inner.add(w);
  }
  wingM.side = THREE.DoubleSide;
}
function aniRex(inner, paint) {
  const M = aniMats(), { ell, seg, cone } = aniKit(inner), belly = toon('#C9C29A');
  const hipY = 2.7;
  ell(0, hipY + .2, .5, .85, .95, 1.9, paint); ell(0, hipY - .15, .8, .65, .55, 1.4, belly);
  // patas fuertes
  for (const sx of [-1, 1]) {
    const x = sx * .62, a = [x, hipY, 0], b = [x, 1.55, .55], c = [x, .55, -.25], d = [x, .14, .15];
    seg(a, b, .5, .32, paint); seg(b, c, .3, .2, paint); seg(c, d, .18, .14, paint);
    ell(x, .1, .45, .2, .1, .45, paint); for (const dx of [-.1, 0, .1]) cone(x + dx, .08, .92, .05, .18, M.aClaw, Math.PI / 2);
    // bracitos
    seg([sx * .55, hipY + .3, 1.7], [sx * .62, hipY - .05, 1.95], .1, .07, paint); seg([sx * .62, hipY - .05, 1.95], [sx * .6, hipY - .15, 2.2], .07, .05, paint);
  }
  // cuello, cabeza grande con mandíbula y dientes
  seg([0, hipY + .55, 1.9], [0, hipY + 1.05, 2.5], .55, .45, paint);
  const H = [0, hipY + 1.25, 3.05];
  ell(H[0], H[1], H[2], .45, .48, .75, paint); ell(0, H[1] - .32, H[2] + .3, .36, .18, .65, belly);
  ell(0, H[1] - .45, H[2] + .25, .32, .12, .58, paint);
  for (const sx of [-1, 1]) { ell(sx * .3, H[1] + .2, H[2] + .25, .07, .07, .06, M.aEye); for (let i = 0; i < 6; i++) cone(sx * (.27 - i * .01), H[1] - .3, H[2] + .05 + i * .12, .025, .1, M.aTooth, Math.PI); }
  // cola larga
  const ts = [[0, hipY + .25, -1.2], [0, hipY + .15, -2.4], [0, hipY - .05, -3.6], [0, hipY - .3, -4.7]];
  for (let i = 0; i < 3; i++) seg(ts[i], ts[i + 1], .6 - i * .17, .43 - i * .17, paint);
  cone(0, ts[3][1] - .05, ts[3][2] - .3, .1, .6, paint, -Math.PI / 2 - .1);
}
function aniBuild(kind, inner) {
  const paint = toon(VEH_PAINT[kind] || '#B5824F');
  if (ANI[kind]) aniQuad(kind, inner, paint);
  else if (kind === 'gallina') aniHen(inner, paint);
  else if (kind === 'dragon') aniDragon(inner, paint);
  else aniRex(inner, paint);
  return paint;
}
