/* ============================================================
   PERSONAJES 3D IMPORTADOS · un modelo con esqueleto en la ficha (Mixamo, VRM/VRoid, Character Creator, Blender…)
   Sus huesos se reconocen por los nombres de siempre (o se eligen a mano) y se conectan a las articulaciones del
   maniquí. En cada dibujo un maniquí invisible toma la postura (poseActor y fig3dApply, con todo lo de siempre:
   posturas, caminar, doblar a mano, la mano) y el modelo la copia hueso por hueso: cada hueso gira lo mismo que el del
   maniquí desde su pose de referencia (brazos abajo), después de alinear su dirección de reposo con la del maniquí.
   Así un modelo en T o en A queda igual de pie.
   look.model = { v, map: { articulación del maniquí: índice del hueso }, rot: 0 | 180, h0, tris, kb, n (nombre del
   archivo), by (créditos) }; el modelo empacado, en FRAMES['m3~c~<personaje>'] (modelos.js)
   ============================================================ */
const CH3_SIDES = ['l', 'r'];
const CH3_FING = ['thumb', 'index', 'middle', 'ring', 'pinky'];
// las articulaciones del maniquí que se conectan (las de la lista corta bastan para posar el cuerpo)
const CH3_MAIN = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'head', ...CH3_SIDES.flatMap(s => ['clavicle', 'upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball'].map(n => n + '_' + s))];
const CH3_NEED = ['pelvis', 'head', ...CH3_SIDES.flatMap(s => ['upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot'].map(n => n + '_' + s))];
const CH3_JOINTS = [...CH3_MAIN, ...CH3_SIDES.flatMap(s => CH3_FING.flatMap(f => [1, 2, 3].map(i => `${f}_0${i}_${s}`)))];
// hacia qué articulación apunta cada una (su dirección de reposo); las del final toman la de su padre
const CH3_NEXT = { pelvis: 'spine_01', spine_01: 'spine_02', spine_02: 'spine_03', spine_03: 'neck_01', neck_01: 'head' };
for (const s of CH3_SIDES) {
  Object.assign(CH3_NEXT, { ['clavicle_' + s]: 'upperarm_' + s, ['upperarm_' + s]: 'lowerarm_' + s, ['lowerarm_' + s]: 'hand_' + s, ['hand_' + s]: 'middle_01_' + s, ['thigh_' + s]: 'calf_' + s, ['calf_' + s]: 'foot_' + s, ['foot_' + s]: 'ball_' + s });
  for (const f of CH3_FING) { CH3_NEXT[`${f}_01_${s}`] = `${f}_02_${s}`; CH3_NEXT[`${f}_02_${s}`] = `${f}_03_${s}`; }
}
const CH3_NAME = {
  pelvis: 'Cadera', spine_01: 'Columna (abajo)', spine_02: 'Columna (medio)', spine_03: 'Pecho', neck_01: 'Cuello', head: 'Cabeza',
  clavicle: 'Hombro', upperarm: 'Brazo', lowerarm: 'Antebrazo', hand: 'Mano', thigh: 'Muslo', calf: 'Pierna', foot: 'Pie', ball: 'Dedos del pie',
};
const ch3Label = j => { const m = /^(\w+?)_(l|r)$/.exec(j); return m && CH3_NAME[m[1]] ? `${CH3_NAME[m[1]]} ${m[2] === 'l' ? 'izquierdo' : 'derecho'}`.replace(/(Mano|Pierna|Columna)\b(.*) izquierdo/, '$1$2 izquierda').replace(/(Mano|Pierna)\b(.*) derecho/, '$1$2 derecha') : CH3_NAME[j] || j; };

/* ---------- reconocer los huesos por su nombre ---------- */
// el lado y lo que queda del nombre: «mixamorig:LeftForeArm», «J_Bip_L_UpperArm», «upper_arm.L», «CC_Base_R_Hand», «Bip01 L Thigh»
function ch3Parse(name) {
  let n = String(name || '').replace(/^.*[:|]/, '').replace(/^mixamorig\d*_?/i, '').replace(/^(cc_base_|j_bip_|def[-_]|bip0?1[ _]?|rig[-_]|org[-_]|b_)/i, '').replace(/^(c_)/i, '');
  let side = '';
  const low = n.replace(/([a-z])([A-Z])/g, '$1 $2');
  if (/^left|[ ._-]left\b|\bleft[ ._-]?/i.test(low) || /(^|[ ._-])l([ ._-]|$)/i.test(low)) side = 'l';
  else if (/^right|[ ._-]right\b|\bright[ ._-]?/i.test(low) || /(^|[ ._-])r([ ._-]|$)/i.test(low)) side = 'r';
  const core = low.toLowerCase().replace(/\bleft\b|\bright\b/g, ' ').replace(/(^|[ ._-])(l|r)(?=[ ._-]|$)/g, ' ').replace(/[^a-z0-9]+/g, '');
  return { side, core };
}
const CH3_CORE = [
  [/^(hips|pelvis|hip)$/, 'pelvis'], [/^(neck)\d*$/, 'neck'], [/^head$/, 'head'],
  [/^(shoulder|clavicle|collar|collarbone)$/, 'clavicle'], [/^(upperarm|uparm|arm)$/, 'upperarm'], [/^(forearm|lowerarm|elbow)$/, 'lowerarm'], [/^(hand|wrist)$/, 'hand'],
  [/^(upleg|thigh|upperleg)$/, 'thigh'], [/^(leg|calf|shin|lowerleg|knee)$/, 'calf'], [/^(foot|ankle)$/, 'foot'], [/^(toebase|toe|toes|ball)\d*$/, 'ball'],
  [/^(spine|chest|upperchest|torso|spine\d+)$/, 'spine'],
];
const CH3_FCORE = [[/^thumb/, 'thumb'], [/^(index|pointer)/, 'index'], [/^middle/, 'middle'], [/^ring/, 'ring'], [/^(pinky|little|small)/, 'pinky']];
/* el mapa automático: articulación del maniquí → índice del hueso del modelo (bones: [{ n, p }]) */
function ch3AutoMap(bones) {
  const info = bones.map(b => ch3Parse(b.n)), map = {};
  const kids = bones.map(() => []); bones.forEach((b, i) => { if (b.p >= 0) kids[b.p].push(i); });
  const depth = i => { let d = 0; for (let p = bones[i].p; p >= 0; p = bones[p].p) d++; return d; };
  const find = (core, side) => {
    const L = info.map((x, i) => [x, i]).filter(([x]) => x.side === side && core.test(x.core));
    L.sort((a, b) => depth(a[1]) - depth(b[1]));
    return L.length ? L[0][1] : -1;
  };
  for (const [re, j] of CH3_CORE) {
    if (j === 'spine') continue;
    if (['pelvis', 'neck', 'head'].includes(j)) { let i = find(re, ''); if (i < 0) i = info.findIndex(x => re.test(x.core)); if (i >= 0) map[j === 'neck' ? 'neck_01' : j] = i; continue; }
    for (const s of CH3_SIDES) { const i = find(re, s); if (i >= 0) map[`${j}_${s}`] = i; }
  }
  // «leg» y «arm» solos también calzan con el muslo y el brazo: el de más arriba es el muslo (o el brazo)
  for (const s of CH3_SIDES) {
    if (map['thigh_' + s] === map['calf_' + s] && map['thigh_' + s] != null) delete map['calf_' + s];
    if (map['calf_' + s] == null && map['thigh_' + s] != null) { const k = kids[map['thigh_' + s]][0]; if (k != null) map['calf_' + s] = k; }
    if (map['foot_' + s] == null && map['calf_' + s] != null) { const k = kids[map['calf_' + s]][0]; if (k != null) map['foot_' + s] = k; }
    if (map['lowerarm_' + s] == null && map['upperarm_' + s] != null) { const k = kids[map['upperarm_' + s]][0]; if (k != null) map['lowerarm_' + s] = k; }
    if (map['hand_' + s] == null && map['lowerarm_' + s] != null) { const k = kids[map['lowerarm_' + s]][0]; if (k != null) map['hand_' + s] = k; }
  }
  // sin cuello con nombre: el padre de la cabeza es el cuello, salvo que de él salgan las clavículas (Tripo: Spine02 › Head),
  // que entonces es el pecho y el modelo no tiene cuello
  if (map.neck_01 == null && map.head != null && bones[map.head].p >= 0) {
    const hp = bones[map.head].p;
    if (!CH3_SIDES.some(s => map['clavicle_' + s] != null && bones[map['clavicle_' + s]].p === hp)) map.neck_01 = hp;
  }
  // la columna: los huesos entre la cadera y el cuello (o la cabeza), el primero, el del medio y el último. La columna
  // puede no colgar de la cadera sino de lo de encima (Tripo: BoneRoot › Pelvis y BoneRoot › Waist): eso no es columna
  const top = map.neck_01 != null ? map.neck_01 : map.head;
  if (map.pelvis != null && top != null) {
    const below = new Set(); for (let p = map.pelvis; p >= 0; p = bones[p].p) below.add(p);
    const chain = []; for (let p = bones[top].p; p >= 0 && !below.has(p); p = bones[p].p) chain.unshift(p);
    if (chain.length) { map.spine_03 = chain[chain.length - 1]; if (chain.length >= 2) map.spine_01 = chain[0]; if (chain.length >= 3) map.spine_02 = chain[Math.floor(chain.length / 2)]; }
  }
  // los dedos: bajo cada mano, por su nombre y en orden de profundidad
  for (const s of CH3_SIDES) {
    const h = map['hand_' + s]; if (h == null) continue;
    const under = []; const walk = i => { for (const k of kids[i]) { under.push(k); walk(k); } }; walk(h);
    for (const [re, f] of CH3_FCORE) {
      const L = under.filter(i => re.test(info[i].core.replace(/^hand/, '').replace(/finger/, ''))).sort((a, b) => depth(a) - depth(b));
      L.slice(0, 3).forEach((i, k) => { map[`${f}_0${k + 1}_${s}`] = i; });
    }
  }
  // un mismo hueso no puede ser dos articulaciones
  const used = new Map();
  for (const j of CH3_JOINTS) { const i = map[j]; if (i == null) continue; if (used.has(i)) delete map[j]; else used.set(i, j); }
  return map;
}
const ch3Missing = map => CH3_NEED.filter(j => map[j] == null);

/* ---------- el maniquí invisible que toma la postura ---------- */
function ch3Driver(body) {
  const T = THREE, tp = FIG3D.tpl[fig3dBody(body)]; if (!tp) return null;
  const root = new T.Group(), bdy = new T.Group(); root.add(bdy); root.visible = false;
  const bones = tp.bones.map(b => { const o = new T.Bone(); o.name = b.n; return o; });
  tp.bones.forEach((b, i) => { const p = b.p >= 0 ? tp.bones[b.p].h : [0, 0, 0]; bones[i].position.set(b.h[0] - p[0], b.h[1] - p[1], b.h[2] - p[2]); (b.p >= 0 ? bones[b.p] : bdy).add(bones[i]); });
  const bone = n => bones[tp.idx[n]];
  const O = () => new T.Object3D();
  const handAnchor = s => { const a = new T.Object3D(); a.position.set(0, -.05, 0); bone('hand_' + s).add(a); return a; };
  const chest = new T.Object3D(); { const sp3 = tp.bones[tp.idx.spine_03].h, ch = tp.meta.chest || [0, sp3[1], .12]; chest.position.set(0, ch[1] - sp3[1], ch[2] - sp3[2]); bone('spine_03').add(chest); }
  return {
    fig: tp, root, body: bdy, bones, bone, hips: O(), spine: O(), neck: O(), head: O(), chest, meshes: {}, face: { visible: false, material: null }, photoFace: null,
    armL: { sh: O(), el: O(), hand: handAnchor('l') }, armR: { sh: O(), el: O(), hand: handAnchor('r') }, legL: { hp: O(), kn: O(), an: O() }, legR: { hp: O(), kn: O(), an: O() },
    B: S3_BODY[body] || S3_BODY.hombre, kind: 'actor', expr: 'neutral', skirt: null, rest: Object.fromEntries(['upperarm_l', 'upperarm_r', 'thigh_l', 'thigh_r'].map(n => [n, bone(n).position.clone()])),
  };
}
/* la pose de referencia del maniquí (todo en cero: de pie, brazos abajo): giro y posición de cada articulación */
const CH3 = { ref: {} };
function ch3Ref(body) {
  body = fig3dBody(body);
  if (CH3.ref[body]) return CH3.ref[body];
  const D = ch3Driver(body); if (!D) return null;
  D.hips.position.set(0, .95, 0); D.handPose = null;
  fig3dApply(D);
  D.root.updateMatrixWorld(true);
  const T = THREE, q = {}, p = {};
  for (const j of CH3_JOINTS) { const b = D.bone(j); if (!b) continue; q[j] = b.getWorldQuaternion(new T.Quaternion()); p[j] = b.getWorldPosition(new T.Vector3()); }
  const dir = {};
  for (const j of CH3_JOINTS) { const n = CH3_NEXT[j]; if (n && p[n] && p[j]) { const d = p[n].clone().sub(p[j]); if (d.lengthSq() > 1e-8) dir[j] = d.normalize(); } }
  const tp = D.fig, hipY = tp.bones[tp.idx.pelvis].h[1] - tp.bones[tp.idx.Root].h[1];
  return (CH3.ref[body] = { q, p, dir, hipY, H: tp.meta.height || 1.7 });
}
// la cadena de giros del maniquí (en el espacio de su cuerpo) a partir de los giros de cada hueso
function ch3DrvQ(D, out) {
  const tp = D.fig;
  for (let i = 0; i < tp.bones.length; i++) { const p = tp.bones[i].p; (out[i] || (out[i] = new THREE.Quaternion())).copy(D.bones[i].quaternion); if (p >= 0) out[i].premultiply(out[p]); }
  return out;
}

/* ---------- el modelo: su reposo, alineado con el maniquí ---------- */
// las matrices de cada hueso en reposo, en el espacio del archivo
function ch3RestW(t) {
  const T = THREE, B = t.H.bones, arm = new T.Matrix4().fromArray(t.H.arm), wm = new Array(B.length);
  for (let i = 0; i < B.length; i++) wm[i] = (B[i].p >= 0 ? wm[B[i].p].clone() : arm.clone()).multiply(new T.Matrix4().compose(new T.Vector3().fromArray(B[i].t), new T.Quaternion().fromArray(B[i].q), new T.Vector3().fromArray(B[i].s)));
  return wm;
}
/* hacia dónde mira el modelo: con el lado izquierdo en +X mira hacia +Z (0°); si no, hacia atrás (180°). VRM 0.x, atrás */
function ch3Facing(t, map, vrm) {
  const wm = ch3RestW(t), x = j => map[j] != null ? new THREE.Vector3().setFromMatrixPosition(wm[map[j]]).x : null;
  for (const [a, b] of [['upperarm_l', 'upperarm_r'], ['thigh_l', 'thigh_r'], ['hand_l', 'hand_r']]) { const xa = x(a), xb = x(b); if (xa != null && xb != null && Math.abs(xa - xb) > 1e-4) return xa > xb ? 0 : 180; }
  return vrm === .5 ? 180 : 0;
}
/* rig: lo que sale del modelo y de su mapa (se calcula una vez por versión, mapa y giro) */
function ch3Rig(t, model, body) {
  const key = JSON.stringify([model.v, model.map, model.rot || 0, fig3dBody(body)]);
  if (t.rig && t.rig.key === key) return t.rig;
  const T = THREE, H = t.H, B = H.bones, n = B.length, ref = ch3Ref(body); if (!ref) return null;
  // el espacio del actor: el modelo girado hacia +Z, con los pies en el suelo y el centro en el origen
  const arm = new T.Matrix4().fromArray(H.arm), armQ = new T.Quaternion(), armP = new T.Vector3(), armS = new T.Vector3();
  arm.decompose(armP, armQ, armS);
  const loc = B.map(b => new T.Matrix4().compose(new T.Vector3().fromArray(b.t), new T.Quaternion().fromArray(b.q), new T.Vector3().fromArray(b.s)));
  const wm = new Array(n); for (let i = 0; i < n; i++) wm[i] = (B[i].p >= 0 ? wm[B[i].p].clone() : arm.clone()).multiply(loc[i]);
  const wp = wm.map(m => new T.Vector3().setFromMatrixPosition(m));
  // tamaño: lo que ocupan las mallas en reposo (las que tienen esqueleto, con sus huesos: sus vértices están en el
  // espacio de enlace, que puede venir en centímetros y de costado)
  const box = new T.Box3(), v = new T.Vector3(), acc = new T.Vector3(), skM = t.skins.map(inv => wm.map((m, i) => m.clone().multiply(new T.Matrix4().fromArray(inv, i * 16))));
  for (const Pt of t.parts) {
    const g = Pt.geo, pos = g.attributes.position, nV = pos.count, step = Math.max(1, Math.floor(nV / 6000));
    if (Pt.sk >= 0) {
      const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, M = skM[Pt.sk], gi = ['getX', 'getY', 'getZ', 'getW'];
      for (let i = 0; i < nV; i += step) { v.fromBufferAttribute(pos, i); acc.set(0, 0, 0); for (let k = 0; k < 4; k++) { const w = sw[gi[k]](i); if (w) acc.addScaledVector(v.clone().applyMatrix4(M[si[gi[k]](i)]), w); } box.expandByPoint(acc); }
    } else {
      if (!g.boundingBox) g.computeBoundingBox(); const bb = g.boundingBox.clone(); if (Pt.b >= 0) bb.applyMatrix4(wm[Pt.b]); box.union(bb);
    }
  }
  const h0 = Math.max(.05, box.max.y - box.min.y), c = new T.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
  const rotY = rad(model.rot || 0), F = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), rotY);
  const toA = v => v.clone().sub(c).applyQuaternion(F);        // a espacio del actor (sin la escala)
  const P = wp.map(toA);
  const W0 = wm.map(m => { const q = new T.Quaternion(); m.decompose(new T.Vector3(), q, new T.Vector3()); return q.premultiply(F); });
  const map = model.map || {}, inv = {};
  for (const [j, i] of Object.entries(map)) if (i >= 0 && i < n) inv[i] = j;
  // dirección de reposo de cada hueso conectado (hacia el hueso de su articulación siguiente o su único hijo)
  const kids = B.map(() => []); B.forEach((b, i) => { if (b.p >= 0) kids[b.p].push(i); });
  const al = {};
  const order = CH3_JOINTS.filter(j => map[j] != null);
  for (const j of order) {
    const i = map[j], nx = CH3_NEXT[j];
    let to = nx && map[nx] != null ? map[nx] : -1;
    if (to < 0 && kids[i].length === 1 && !CH3_NEXT[j]) to = kids[i][0];
    const d = to >= 0 ? P[to].clone().sub(P[i]) : null;
    if (d && d.lengthSq() > 1e-10 && ref.dir[j]) al[j] = new T.Quaternion().setFromUnitVectors(d.normalize(), ref.dir[j]);
  }
  // las del final (cabeza, manos sin dedos, dedos del pie, puntas): el alineado de su padre conectado
  const parentJ = j => { const i = map[j]; for (let p = B[i].p; p >= 0; p = B[p].p) if (inv[p] && al[inv[p]]) return inv[p]; return null; };
  for (const j of order) if (!al[j]) { const pj = parentJ(j); al[j] = pj ? al[pj].clone() : new T.Quaternion(); }
  const hipI = map.pelvis, hipH = hipI != null ? P[hipI].y : h0 * .53;
  t.rig = { key, n, h0, c, F, armQ: armQ.clone().premultiply(F), W0, al, map, inv, hipI, hipH, P, loc: B.map(b => ({ t: b.t, q: b.q, s: b.s })) };
  return t.rig;
}

/* ---------- la figura ---------- */
const ch3Key = look => look.model ? 'ext|' + look.model.v + '|' + (look.model.rot || 0) + '|' + hash53(JSON.stringify(look.model.map || {})) : '';
const ch3FrameKey = look => look.key ? m3Key('c', look.key) : null;
/* ¿el modelo de este personaje está listo para dibujar? (si no, se pide y la figura de siempre lo espera) */
function ch3Has(look) {
  if (!look || !look.model || !look.key || typeof FIG3D === 'undefined') return false;
  const k = ch3FrameKey(look);
  if (!FIG3D.has(look.body)) { FIG3D.want(look.body); return false; }
  m3Tpl(k, ch3Late);
  return m3Ready(k);
}
function ch3Late() { if (typeof UI !== 'undefined' && (UI.tab === 'board' || UI.tab === 'animatic') && typeof lateRender === 'function') lateRender(); if (typeof EDT !== 'undefined' && EDT && EDT.redraw) EDT.redraw(); }
function makeExtActor(look) {
  const T = THREE, t = M3.tpl.get(ch3FrameKey(look)).t, rig = ch3Rig(t, look.model, look.body);
  if (!rig) return null;
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const shift = new T.Group(); shift.quaternion.copy(rig.F); body.add(shift);
  const inner = new T.Group(); inner.position.copy(rig.c).negate(); shift.add(inner);
  const armG = new T.Group(); armG.matrixAutoUpdate = false; armG.matrix.fromArray(t.H.arm); inner.add(armG);
  const bones = t.H.bones.map(b => { const o = new T.Bone(); o.name = b.n; o.position.fromArray(b.t); o.quaternion.fromArray(b.q); o.scale.fromArray(b.s); return o; });
  t.H.bones.forEach((b, i) => (b.p >= 0 ? bones[b.p] : armG).add(bones[i]));
  const mats = m3Mats(t), skels = t.skins.map(inv => new T.Skeleton(bones, bones.map((_, i) => new T.Matrix4().fromArray(inv, i * 16))));
  const meshes = [];
  for (const Pt of t.parts) {
    const mt = mats[Pt.m];
    let m;
    if (Pt.sk >= 0) { m = new T.SkinnedMesh(Pt.geo, mt); m.bind(skels[Pt.sk], new T.Matrix4()); m.frustumCulled = false; m.boundingSphere = new T.Sphere(new T.Vector3(0, rig.h0 / 2, 0), rig.h0 * 1.5); inner.add(m); }
    else { m = new T.Mesh(Pt.geo, mt); (Pt.b >= 0 ? bones[Pt.b] : inner).add(m); }
    m.castShadow = true; m.receiveShadow = true;
    if (Pt.morphs) { m.morphTargetInfluences = Pt.morphs.map(() => 0); m.userData.morphs = Pt.morphs; }
    meshes.push(m);
  }
  // el maniquí que toma la postura va adentro (invisible): sus manos y su pecho sostienen los objetos
  const D = ch3Driver(look.body); root.add(D.root);
  const G = R3.geo, M = R3.mats;
  const blob = new T.Mesh(G.blob, M.blob); blob.rotation.x = -Math.PI / 2; blob.position.y = .004; blob.scale.setScalar(.38 * Math.max(.7, look.s) * look.w); root.add(blob);
  const sel = new T.Mesh(G.ring, M.sel); sel.rotation.x = -Math.PI / 2; sel.position.y = .006; sel.visible = false; root.add(sel);
  return {
    ext: true, root, body, bones, skels, meshes, drv: D, drvBody: look.body, rig, t, blob, sel, kind: 'actor', key: ch3Key(look), expr: 'neutral',
    B: { ...(S3_BODY[look.body] || S3_BODY.hombre), faceless: true }, s: look.s, armL: D.armL, armR: D.armR, chest: D.chest, face: { visible: false }, faceMat: null,
    // la cabeza de verdad (para el nombre sobre la figura); la del maniquí si el modelo no la tiene
    head: rig.map.head != null ? bones[rig.map.head] : D.bone('head'), q: [], W: [],
  };
}
function ch3Dispose(E) { for (const s of E.skels) s.dispose(); }
/* la estatura del personaje (la del modelo se escala entera) */
function ch3Scale(E, look) {
  const k = look.height / E.rig.h0;
  E.body.scale.setScalar(k);
  const ref = ch3Ref(look.body), kd = look.height / ref.H;
  E.drv.body.scale.setScalar(kd);
  E.k = k; E.s = look.s;
}
/* la postura: la del maniquí invisible, copiada hueso por hueso */
const _c3q = new Array(8).fill(0).map(() => null);
function ch3Apply(E, expr) {
  const T = THREE, D = E.drv, tp = D.fig, R = E.rig, ref = ch3Ref(E.drvBody || 'hombre') || ch3Ref(Object.keys(CH3.ref)[0]);
  const q = i => _c3q[i] || (_c3q[i] = new T.Quaternion());
  const Qd = ch3DrvQ(D, E.q);
  const B = E.t.H.bones, n = B.length, W = E.W, inv = R.inv;
  for (let i = 0; i < n; i++) {
    const j = inv[i], p = B[i].p;
    const pw = p >= 0 ? W[p] : R.armQ;
    const w = W[i] || (W[i] = new T.Quaternion());
    if (j) {
      // el giro del maniquí desde su referencia, aplicado al hueso alineado
      const di = tp.idx[j];
      w.copy(Qd[di]).multiply(q(0).copy(ref.q[j]).invert()).multiply(R.al[j]).multiply(R.W0[i]);
      E.bones[i].quaternion.copy(q(1).copy(pw).invert()).multiply(w);
    } else {
      E.bones[i].quaternion.fromArray(B[i].q);
      w.copy(pw).multiply(E.bones[i].quaternion);
    }
  }
  // la cadera: se desplaza como la del maniquí, a la escala del modelo (en cuclillas, sentado, de rodillas)
  if (R.hipI != null) {
    const pel = D.bone('pelvis'), r0 = ref.hipY, dy = pel.position.y / (r0 / .95) - .95, dz = pel.position.z, dx = pel.position.x;
    const f = R.hipH / ref.p.pelvis.y, hb = E.bones[R.hipI], b = B[R.hipI];
    // el desplazamiento está en el espacio del actor: se pasa al del padre del hueso
    const off = new T.Vector3(dx, dy * r0 / .95, dz).multiplyScalar(f);
    const parentW = b.p >= 0 ? W[b.p] : R.armQ;
    off.applyQuaternion(q(2).copy(parentW).invert());
    // y a su escala (el armado puede venir en centímetros)
    const sc = new T.Vector3(); new T.Matrix4().fromArray(E.t.H.arm).decompose(new T.Vector3(), new T.Quaternion(), sc);
    hb.position.fromArray(b.t).add(off.divideScalar(sc.y || 1));
  }
  // los gestos de la cara, si el modelo los trae
  const want = ch3Morph(expr || 'neutral');
  for (const m of E.meshes) {
    const L = m.userData.morphs; if (!L) continue;
    L.forEach((nm, i) => { m.morphTargetInfluences[i] = want.some(re => re.test(nm)) ? 1 : 0; });
  }
}
const CH3_EXPR = {
  feliz: [/joy|happy|smile|fun/i], risa: [/joy|happy|smile|fun/i, /^a$|mouth_?open|jaw_?open/i], triste: [/sorrow|sad|frown/i], llanto: [/sorrow|sad/i], preocupado: [/sorrow|sad/i],
  enojado: [/angry|anger|mad/i], decidido: [/angry|anger/i], sorpresa: [/surpri|shock/i], miedo: [/fear|surpri|shock/i], grito: [/surpri|shock|^a$|mouth_?open|jaw_?open/i],
  'ojos cerrados': [/blink(?!_?[lr])|eyesclose|eyeclose/i], cansado: [/blink(?!_?[lr])|eyeclose/i], guino: [/wink|blink_?l|blinkleft|eyeblinkleft/i],
};
const ch3Morph = e => CH3_EXPR[String(e).replace(/^k:.*:/, '')] || [];
/* para doblar a mano: el maniquí invisible es el que se mide (sus articulaciones coinciden con las del modelo) */
const poseFig = A => A && A.ext ? A.drv : A;
/* la parte del cuerpo bajo un rayo que toca el modelo: el hueso que más pesa, llevado a su articulación del maniquí */
function ch3PartAt(E, hit) {
  const g = hit.object.geometry, f = hit.face; if (!g || !f || !g.attributes.skinIndex) return null;
  const ji = g.attributes.skinIndex, jw = g.attributes.skinWeight, B = E.t.H.bones, inv = E.rig.inv, w = {};
  const jointOf = i => { for (let b = i; b >= 0; b = B[b].p) if (inv[b]) return inv[b]; return null; };
  for (const i of [f.a, f.b, f.c]) for (const [gx, k] of [['getX', 0], ['getY', 1], ['getZ', 2], ['getW', 3]]) {
    const j = jointOf(ji[gx](i)), key = j && POSE_OF_BONE[j]; if (key) w[key] = (w[key] || 0) + jw[gx](i); void k;
  }
  let k = null, kw = 0; for (const [key, ww] of Object.entries(w)) if (ww > kw) { kw = ww; k = key; }
  return k;
}
