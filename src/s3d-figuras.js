/* ============================================================
   FIGURAS 3D ARTICULADAS (MakeHuman/MPFB2, activos CC0)
   Los datos vienen de s3d-figuras-datos.js (generado por fig3d/maniqui.py).
   Cada cuerpo se descomprime la primera vez que se usa; mientras tanto
   se dibuja el maniquí simple de siempre.
   ============================================================ */
const FIG3D = { tpl: {}, loading: {}, failed: false, gradient: null };
/* cuerpos sin maniquí propio que usan el de otro (el extra es un hombre sin cara) */
FIG3D.alias = { extra: 'hombre' };
const fig3dBody = body => FIG3D.alias[body] || body;
/* la figura articulada solo se rearma si cambia el cuerpo; proporciones, tono y pelo se aplican en vivo */
const fig3dKey = look => 'fig|' + look.body;

/* ---------- carga ---------- */
FIG3D.has = body => !!FIG3D.tpl[fig3dBody(body)];
FIG3D.want = body => {
  body = fig3dBody(body);
  if (FIG3D.tpl[body] || FIG3D.loading[body] || FIG3D.failed) return;
  if (typeof FIG3D_DATA === 'undefined' || typeof DecompressionStream === 'undefined') { FIG3D.failed = true; return; }
  if (!FIG3D_DATA[body]) return;   // un cuerpo sin datos se queda con el maniquí simple, sin bloquear a los demás
  FIG3D.loading[body] = fig3dDecode(FIG3D_DATA[body]).then(buf => {
    FIG3D.tpl[body] = fig3dTemplate(buf);
    FIG3D.tpl[body].body = body;   // el pelo lo usa (patillas más cortas en mujeres y niñas)
    peloTexWarm();   // las hebras del pelo, en los ratos libres
    // las figuras simples ya dibujadas se reemplazan en el próximo dibujo (las miniaturas que las tenían cambian de clave)
    if (typeof UI !== 'undefined' && (UI.tab === 'board' || UI.tab === 'animatic') && typeof render === 'function') lateRender();
    if (typeof EDT !== 'undefined' && EDT && EDT.redraw) EDT.redraw();
  }).catch(e => { console.warn('figuras 3D:', e); FIG3D.failed = true; });
};
/* antes de exportar (PDF, video) o de mostrar una figura: carga los cuerpos que se van a dibujar, para no mezclar
   figuras simples y articuladas. Sin lista, todos (cada cuerpo son ~390 KB: mejor pedir solo los que se usan) */
FIG3D.ready = (ms = 10000, bodies) => {
  const L = bodies ? [...new Set([...bodies].map(fig3dBody))] : typeof FIG3D_DATA !== 'undefined' ? Object.keys(FIG3D_DATA) : [];
  for (const b of L) FIG3D.want(b);
  const ps = L.filter(b => !FIG3D.tpl[b] && FIG3D.loading[b]).map(b => FIG3D.loading[b]);
  return ps.length ? Promise.race([Promise.allSettled(ps), new Promise(r => setTimeout(r, ms))]) : Promise.resolve();
};
/* cuerpos que usan las figuras de esos planos (de todo el proyecto, si no se dice cuáles) */
function fig3dBodiesOf(shots) {
  const out = new Set();
  for (const sh of shots || Object.values((typeof P !== 'undefined' && P && P.shots) || {})) {
    if (!sh || !shot3D(sh)) continue;   // un dibujo 2D sobre papel no lleva figuras 3D
    for (const o of s3Of(sh).objs) if (o.kind === 'actor') out.add(fig3dBody(lookOf(o).body));
  }
  return [...out];
}
async function fig3dDecode(b64) {
  // en la web app del servidor los cuerpos viajan aparte («@fig/…gz») y se descargan solo si se usan
  const bin = b64[0] === '@' ? new Uint8Array(await (await fetch(b64.slice(1))).arrayBuffer()) : Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const ds = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(ds).arrayBuffer();
}
function fig3dTemplate(buf) {
  const T = THREE;
  const n = new DataView(buf).getUint32(0, true);
  const H = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, n)));
  const base = 4 + n;
  const view = (Ctor, off, count) => new Ctor(buf.slice(base + off, base + off + count * Ctor.BYTES_PER_ELEMENT));
  const parts = {};
  for (const p of H.parts) {
    const g = new T.BufferGeometry();
    const q = view(Int16Array, p.pos, p.nv * 3), pos = new Float32Array(p.nv * 3);
    for (let i = 0; i < p.nv * 3; i++) { const k = i % 3; pos[i] = p.lo[k] + (q[i] + 32768) / 65535 * (p.hi[k] - p.lo[k]); }
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.BufferAttribute(view(Int8Array, p.nrm, p.nv * 3), 3, true));
    g.setAttribute('skinIndex', new T.BufferAttribute(view(Uint8Array, p.ji, p.nv * 4), 4));
    g.setAttribute('skinWeight', new T.BufferAttribute(view(Uint8Array, p.jw, p.nv * 4), 4, true));
    g.setIndex(new T.BufferAttribute(view(p.idx32 ? Uint32Array : Uint16Array, p.idx, p.ni), 1));
    if (p.uv !== undefined) {
      const qu = view(Uint16Array, p.uv, p.nv * 2), uv = new Float32Array(p.nv * 2);
      for (let i = 0; i < p.nv * 2; i++) uv[i] = (qu[i] - 16384) / 16383;
      g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    }
    const mats = [];
    let start = 0;
    p.groups.forEach(([m, cnt], i) => { g.addGroup(start, cnt, i); start += cnt; mats.push(m); });
    if (p.morphs.length) {
      g.morphAttributes.position = p.morphs.map(m => {
        const ids = view(p.nv >= 65536 ? Uint32Array : Uint16Array, m.ids, m.n), d = view(Int16Array, m.d, m.n * 3);
        const a = new Float32Array(p.nv * 3);
        for (let i = 0; i < m.n; i++) for (let k = 0; k < 3; k++) a[ids[i] * 3 + k] = d[i * 3 + k] * m.sc;
        const at = new T.BufferAttribute(a, 3); at.name = m.name; return at;
      });
      g.morphTargetsRelative = true;
    }
    g.computeBoundingSphere();
    parts[p.name] = { geo: g, mats, morphs: p.morphs.map(m => m.name) };
  }
  const bones = H.bones;
  const idx = {}; bones.forEach((b, i) => { idx[b.n] = i; });
  const head = name => new T.Vector3().fromArray(bones[idx[name]].h);
  // compensación de la pose de reposo (brazos en A) hacia la convención del maniquí: extremidades hacia abajo
  const down = new T.Vector3(0, -1, 0);
  const comp = {};
  const dirTo = (a, b) => head(b).sub(head(a)).normalize();
  for (const s of ['l', 'r']) {
    const sx = s === 'l' ? 1 : -1;
    comp['upperarm_' + s] = new T.Quaternion().setFromUnitVectors(dirTo('upperarm_' + s, 'lowerarm_' + s), new T.Vector3(.06 * sx, -1, 0).normalize());
    comp['lowerarm_' + s] = new T.Quaternion().setFromUnitVectors(dirTo('lowerarm_' + s, 'hand_' + s), new T.Vector3(.06 * sx, -1, 0).normalize());
    comp['thigh_' + s] = new T.Quaternion().setFromUnitVectors(dirTo('thigh_' + s, 'calf_' + s), new T.Vector3(.02 * sx, -1, 0).normalize());
    comp['calf_' + s] = new T.Quaternion().setFromUnitVectors(dirTo('calf_' + s, 'foot_' + s), new T.Vector3(.02 * sx, -1, 0).normalize());
  }
  fig3dInflation(parts, bones, idx);
  return { H, parts, bones, idx, comp, meta: H.meta, colors: H.colors, down };
}
/* cuánto se engrosa cada vértice con las barras Extremidades (x, en metros por +100 %)
   y Abdomen (y): el radio de la extremidad en ese punto y un bulto al frente de la cintura */
function fig3dInflation(parts, bones, idx) {
  const LIMB = { upperarm_l: 'lowerarm_l', lowerarm_l: 'hand_l', upperarm_r: 'lowerarm_r', lowerarm_r: 'hand_r', thigh_l: 'calf_l', calf_l: 'foot_l', thigh_r: 'calf_r', calf_r: 'foot_r' };
  const seg = {};
  for (const [a, b] of Object.entries(LIMB)) if (idx[a] !== undefined && idx[b] !== undefined) seg[idx[a]] = [bones[idx[a]].h, bones[idx[b]].h];
  const torso = new Set(['pelvis', 'spine_01', 'spine_02', 'spine_03'].map(n => idx[n]).filter(i => i !== undefined));
  const y1 = bones[idx.spine_01].h[1], y2 = bones[idx.spine_02].h[1], yc = (y1 + y2) / 2 + .01;
  const sig = Math.max(.06, (bones[idx.spine_03].h[1] - bones[idx.pelvis].h[1]) * .55);
  const distSeg = (p, [a, b]) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1)));
    return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
  };
  for (const [name, P] of Object.entries(parts)) {
    const g = P.geo, nv = g.attributes.position.count, inf = new Float32Array(nv * 2);
    if (name === 'cuerpo') {
      const pos = g.attributes.position.array, nrm = g.attributes.normal.array, ji = g.attributes.skinIndex.array, jw = g.attributes.skinWeight.array;
      for (let v = 0; v < nv; v++) {
        let wl = 0, wt = 0, best = -1, bw = 0;
        for (let k = 0; k < 4; k++) {
          const j = ji[v * 4 + k], w = jw[v * 4 + k] / 255;
          if (seg[j]) { wl += w; if (w > bw) { bw = w; best = j; } }
          else if (torso.has(j)) wt += w;
        }
        const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
        if (best >= 0) inf[v * 2] = wl * Math.min(.12, distSeg(p, seg[best]));
        if (wt > 0) {
          const nz = nrm[v * 3 + 2] / 127, front = Math.max(0, Math.min(1, (nz + .15) / .85));
          inf[v * 2 + 1] = wt * .11 * front * front * Math.exp(-(((p[1] - yc) / sig) ** 2));
        }
      }
    }
    g.setAttribute('aInfl', new THREE.BufferAttribute(inf, 2));
  }
}

/* ---------- materiales ---------- */
function fig3dGradient() {
  if (FIG3D.gradient) return FIG3D.gradient;
  const d = new Uint8Array([120, 120, 120, 255, 185, 185, 185, 255, 235, 235, 235, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return (FIG3D.gradient = t);
}
/* la rampa suave es la misma de objetos y escenarios (toonRamp en s3d-render.js) */
const fig3dGradientSoft = () => toonRamp();
/* engrosado por figura (barras Extremidades y Abdomen), después del esqueleto */
const FIG3D_INFL = 'transformed += normalize( objectNormal ) * ( aInfl.x * ( uLimb - 1.0 ) + aInfl.y * ( uBelly - 1.0 ) );';
/* parte del cuerpo elegida para doblarla: se tiñe de rojo tenue según el peso de sus huesos en cada vértice
   (se desvanece hacia las articulaciones, como un mapa de calor) */
const FIG3D_TINT_V = 'vSel = uSelMask[int(skinIndex.x)] * skinWeight.x + uSelMask[int(skinIndex.y)] * skinWeight.y + uSelMask[int(skinIndex.z)] * skinWeight.z + uSelMask[int(skinIndex.w)] * skinWeight.w;';
const FIG3D_TINT_F = 'gl_FragColor.rgb = mix( gl_FragColor.rgb, vec3( .93, .30, .27 ), smoothstep( .04, .9, vSel ) * .52 );';
function fig3dInflate(m, U, key, outline) {
  m.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute vec2 aInfl;\nuniform float uLimb;\nuniform float uBelly;\n' + sh.vertexShader;
    sh.uniforms.uLimb = U.uLimb; sh.uniforms.uBelly = U.uBelly;
    sh.vertexShader = sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n\t' + FIG3D_INFL);
    if (outline) outlineShader(sh, 'objectNormal');   // el mismo contorno que objetos y escenarios (s3d-render.js)
    else if (U.uSelMask) {
      sh.uniforms.uSelMask = U.uSelMask;
      sh.vertexShader = 'uniform float uSelMask[64];\nvarying float vSel;\n' + sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n\t' + FIG3D_TINT_V);
      sh.fragmentShader = 'varying float vSel;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', FIG3D_TINT_F + '\n\t#include <dithering_fragment>');
    }
  };
  m.customProgramCacheKey = () => key;
  return m;
}
/* contorno negro y fino: la malla por detrás, empujada hacia afuera */
function fig3dOutline(U) {
  return fig3dInflate(new THREE.MeshBasicMaterial({ color: STY.ink, side: THREE.BackSide }), U, 'fig3d-outline', true);
}

/* ---------- una figura ---------- */
function makeFigActor(look) {
  const T = THREE, G = R3.geo, M = R3.mats;
  const tp = FIG3D.tpl[fig3dBody(look.body)];
  const root = new T.Group();
  const body = new T.Group(); root.add(body);
  // esqueleto propio de esta figura
  const bones = tp.bones.map(b => { const o = new T.Bone(); o.name = b.n; return o; });
  tp.bones.forEach((b, i) => {
    const p = b.p >= 0 ? tp.bones[b.p].h : [0, 0, 0];
    bones[i].position.set(b.h[0] - p[0], b.h[1] - p[1], b.h[2] - p[2]);
    (b.p >= 0 ? bones[b.p] : body).add(bones[i]);
  });
  const inv = tp.bones.map(b => new T.Matrix4().makeTranslation(-b.h[0], -b.h[1], -b.h[2]));
  const skeleton = new T.Skeleton(bones, inv);
  const infl = { uLimb: { value: 1 }, uBelly: { value: 1 }, uSelMask: { value: new Float32Array(64) } };
  const mats = {};
  const mat = name => mats[name] || (mats[name] = name === 'cara'
    ? new T.MeshBasicMaterial({ map: fig3dFaceTex('neutral'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
    : fig3dInflate(new T.MeshToonMaterial({ color: tp.colors[name] || '#FF00FF', gradientMap: tp.meta.maniqui ? fig3dGradientSoft() : fig3dGradient() }), infl, 'fig3d-toon' + (tp.meta.maniqui ? '-m' : '')));
  const outline = fig3dOutline(infl);
  const meshes = {};
  const ident = new T.Matrix4();
  for (const [name, P] of Object.entries(tp.parts)) {
    const g = new T.Group(); g.name = name; body.add(g);
    const m = new T.SkinnedMesh(P.geo, P.mats.map(mat));
    m.bind(skeleton, ident); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
    // esfera amplia fija: three.js la calcula una sola vez en reposo y un brazo levantado quedaba fuera al tocarlo
    m.boundingSphere = new T.Sphere(new T.Vector3(0, .9, 0), 2.4);
    let o = null;
    if (name !== 'cara') {
      o = new T.SkinnedMesh(P.geo, outline);
      o.bind(skeleton, ident); o.frustumCulled = false; o.boundingSphere = m.boundingSphere;
      o.morphTargetInfluences = m.morphTargetInfluences;
      g.add(o);
    } else m.castShadow = m.receiveShadow = false;
    g.add(m);
    meshes[name] = { g, m, o, morphs: P.morphs };
  }
  const B = S3_BODY[look.body] || S3_BODY.hombre;
  const bone = n => bones[tp.idx[n]];
  // anclas para objetos sostenidos (mismo marco que el maniquí simple)
  const handAnchor = s => { const a = new T.Object3D(); a.position.set(0, -.05, 0); bone('hand_' + s).add(a); return a; };
  const chest = new T.Object3D();
  const sp3 = tp.bones[tp.idx.spine_03].h, ch = tp.meta.chest || [0, sp3[1], .12];
  chest.position.set(0, ch[1] - sp3[1], ch[2] - sp3[2]); bone('spine_03').add(chest);
  // cara con foto (opcional): tarjeta delante de la cara
  const hd = tp.bones[tp.idx.head].h, eye = tp.meta.eye || [0, hd[1] + .04, hd[2] + .08];
  if (!R3.geo.figFace) R3.geo.figFace = new T.PlaneGeometry(.17, .22);
  const face = new T.Mesh(R3.geo.figFace, new T.MeshBasicMaterial({ transparent: true, visible: false }));
  face.position.set(0, eye[1] - hd[1] - .02, eye[2] - hd[2] + .035); face.visible = false; bone('head').add(face);
  // proxies con la misma estructura que el maniquí simple: poseActor los mueve y fig3dApply los traslada a los huesos
  const O = () => new T.Object3D();
  const hips = O(), spine = O(), neck = O(), head = O();
  const arm = s => ({ sh: O(), el: O(), hand: handAnchor(s) });
  const leg = () => ({ hp: O(), kn: O(), an: O() });
  const blob = new T.Mesh(G.blob, M.blob); blob.rotation.x = -Math.PI / 2; blob.position.y = .004; blob.scale.setScalar(.38 * Math.max(.7, look.s) * look.w); root.add(blob);
  const sel = new T.Mesh(G.ring, M.sel); sel.rotation.x = -Math.PI / 2; sel.position.y = .006; sel.visible = false; root.add(sel);
  const A = {
    fig: tp, root, body, bones, bone, skeleton, meshes, mats, outline, infl, hips, spine, neck, head, face, chest, skirt: null,
    armL: arm('l'), armR: arm('r'), legL: leg(), legR: leg(), blob, sel, kind: 'actor', expr: 'neutral', B, s: look.s,
    key: fig3dKey(look), faceMat: face.material,
    // posiciones de reposo de los huesos que mueven las barras de proporciones
    rest: Object.fromEntries(['upperarm_l', 'upperarm_r', 'thigh_l', 'thigh_r'].map(n => [n, bone(n).position.clone()])),
  };
  // el extra no lleva rostro dibujado
  if (B.faceless && meshes.cara) meshes.cara.g.visible = false;
  fig3dWear(A, look);
  return A;
}
/* libera los materiales propios de la figura (la geometría es compartida) */
function fig3dDispose(A) {
  if (A.skeleton) A.skeleton.dispose();   // la textura de los huesos de cada figura (si no, queda en la GPU)
  for (const m of Object.values(A.mats)) m.dispose();
  for (const o of A.accObjs || []) o.traverse(m => { if (m.isMesh && !m.userData.ol && m.material) [].concat(m.material).forEach(x => x.dispose()); });
  if (A.skirtMat) A.skirtMat.dispose();
  A.outline.dispose(); A.faceMat.dispose();   // la cara con foto es compartida: no se libera aquí
}
/* qué piezas se ven: pelo, pantalón o falda, barba */
function fig3dWear(A, look) {
  const M = A.meshes;
  const hs = 'pelo_' + (look.hairStyle || A.fig.meta.hair);
  for (const k in M) if (k.startsWith('pelo_')) M[k].g.visible = k === (M[hs] ? hs : 'pelo_' + A.fig.meta.hair);
  const pants = (look.ropa || 'pantalon') === 'pantalon';
  if (M.pantalon) M.pantalon.g.visible = pants;
  if (M.piernas) M.piernas.g.visible = !pants;
  if (M.falda) M.falda.g.visible = !pants;
}
/* colores de la figura según la apariencia del personaje */
const FIG3D_TONOS = { neutro: '#D9D3C9', azul: '#C8D2DD', verde: '#CAD6CA', rosa: '#E0CCCB', ambar: '#E3D2B5', lila: '#D2CBDD', gris: '#BDBCBA', arena: '#D6C6AE' };
function fig3dColors(A, look) {
  const C = A.mats, T = THREE;
  if (A.fig.meta.maniqui) {
    const base = new T.Color(FIG3D_TONOS[look.tono] || look.tono || FIG3D_TONOS.neutro);
    if (C.piel) C.piel.color.copy(base);
    // peinados estilo anime (s3d-pelo.js); el color del pelo es el tono del maniquí, salvo que se elija otro
    if (typeof peloWear === 'function') peloWear(A, look.pelo || 'ninguno', typeof vestHatOf === 'function' ? vestHatOf(look) : null);
    else { const M = A.meshes, hs = 'pelo_' + (look.pelo || 'ninguno'); for (const k in M) if (k.startsWith('pelo_')) M[k].g.visible = k === hs; }
    const hc = look.peloColor ? new THREE.Color(look.peloColor) : base.clone().multiplyScalar(.62);   // sin color elegido: el tono, más oscuro (se lee el peinado)
    if (C.pelo) C.pelo.color.copy(hc);
    // tarjetas de cabello: la textura oscurece un poco (sombra entre hebras); el casquete, más oscuro (es la capa de abajo)
    if (C.peloCard) { C.peloCard.color.copy(hc).multiplyScalar(1.18); C.peloCap.color.copy(hc).multiplyScalar(1.06); }
    return;
  }
  const set = (k, c) => { if (C[k] && c) C[k].color.set(c); };
  set('piel', look.skin || C3.skin);
  set('camisa', look.color);
  if (C.camisa_borde) C.camisa_borde.color.set(look.color).multiplyScalar(.8);
  const hair = look.hair || A.B.hc;
  set('pelo', hair); set('cejas', hair);
  set('pantalon', look.pants);
  if (C.pantalon_borde) C.pantalon_borde.color.set(look.pants).lerp(new T.Color('#FFFFFF'), .12);
  // la falda usa el material 'pantalon' de su propia malla: en vestido toma el color de la prenda superior
  const f = A.meshes.falda;
  if (f) {
    if (!A.skirtMat) { A.skirtMat = C.pantalon ? C.pantalon.clone() : new T.MeshToonMaterial({ gradientMap: fig3dGradient() }); f.m.material = f.m.material.map(() => A.skirtMat); }
    A.skirtMat.color.set(look.ropa === 'vestido' ? look.color : look.pants);
  }
  fig3dWear(A, look);
}
/* escala: altura del personaje y contextura */
function fig3dScale(A, look) {
  const tp = A.fig, hb = tp.bones[tp.idx.head].h, pc = f => (look[f] || 100) / 100;
  // proporciones (100 % = la del cuerpo): la cabeza crece desde el cuello; hombros y caderas separan las articulaciones
  const hk = pc('headk'), sh = pc('shw'), hp = pc('hipw');
  A.bone('head').scale.setScalar(hk);
  for (const s of ['l', 'r']) {
    const ua = A.bone('upperarm_' + s), r0 = A.rest['upperarm_' + s], hw = tp.bones[tp.idx['upperarm_' + s]].h[0];
    ua.position.set(r0.x + hw * (sh - 1), r0.y, r0.z);
    const th = A.bone('thigh_' + s), t0 = A.rest['thigh_' + s];
    th.position.set(t0.x * hp, t0.y, t0.z);
  }
  // extremidades y abdomen: la malla se engrosa en el sombreador
  A.infl.uLimb.value = pc('limb'); A.infl.uBelly.value = pc('belly');
  // la estatura del personaje se respeta aunque la cabeza sea más grande
  const H = (tp.meta.height || 1.7) + (hk - 1) * Math.max(0, (tp.meta.height || 1.7) - hb[1]);
  const k = look.height / H;
  A.body.scale.set(k * look.w, k, k * (.5 + .5 * look.w));
  A.s = look.s;
}
/* expresión: combinación de morphs de MakeHuman */
/* el dibujo original es para una esfera; en la cabeza real se achica un poco hacia el centro */
function fig3dFaceSpace(g, S) { g.translate(S / 2, S * 60 / 128); g.scale(.78, .82); g.translate(-S / 2, -S * 60 / 128); }
/* cara dibujada (maniquí): mismo dibujo que el maniquí simple, con trazo más fino */
FIG3D.faceTex = {};
function fig3dFaceTex(expr) {
  if (expr === '__live') return (faceLiveTex()) || fig3dFaceTex('neutral');
  if (FIG3D.faceTex[expr]) return FIG3D.faceTex[expr];
  // versiones anteriores de la misma expresión de un personaje: se liberan
  if (expr.slice(0, 2) === 'k:') { const pre = expr.split(':').slice(0, -2).join(':') + ':'; for (const k of Object.keys(FIG3D.faceTex)) if (k.startsWith(pre)) { FIG3D.faceTex[k].dispose(); delete FIG3D.faceTex[k]; } }
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  fig3dFaceSpace(g, S);
  drawFace(g, S, expr);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (FIG3D.faceTex[expr] = t);
}
function fig3dExpr(A, expr) {
  if (A.expr === expr) return;
  A.expr = expr;
  if (A.mats.cara) { A.mats.cara.map = fig3dFaceTex(expr); A.mats.cara.needsUpdate = true; return; }
  for (const M of Object.values(A.meshes)) {
    const inf = M.m.morphTargetInfluences;
    if (!inf) continue;
    M.morphs.forEach((n, i) => { inf[i] = n === expr ? 1 : 0; });
    M.o.morphTargetInfluences = inf;  // el contorno sigue la misma expresión
  }
}
/* traslada la pose del maniquí (proxies) a los huesos */
const _fq = [];
let _fv = null, _fz = null;
function fig3dApply(A) {
  const T = THREE, tp = A.fig, b = A.bone, c = tp.comp;
  const q = i => _fq[i] || (_fq[i] = new T.Quaternion());
  if (!_fv) { _fv = new T.Vector3(); _fz = new T.Vector3(0, 0, 1); }
  const restY = tp.bones[tp.idx.pelvis].h[1] - tp.bones[tp.idx.Root].h[1];
  const pel = b('pelvis');
  pel.position.set(A.hips.position.x, A.hips.position.y, A.hips.position.z).multiplyScalar(restY / .95);
  pel.quaternion.copy(A.hips.quaternion);
  const sp = q(0).identity().slerp(A.spine.quaternion, 1 / 3);
  b('spine_01').quaternion.copy(sp); b('spine_02').quaternion.copy(sp); b('spine_03').quaternion.copy(sp);
  b('neck_01').quaternion.copy(A.neck.quaternion);
  b('head').quaternion.copy(A.head.quaternion);
  for (const [s, arm, leg] of [['l', A.armL, A.legL], ['r', A.armR, A.legR]]) {
    const cu = c['upperarm_' + s], cl = c['lowerarm_' + s], ct = c['thigh_' + s], cc = c['calf_' + s];
    // el hombro acompaña al brazo que sube por encima del pecho: la clavícula se eleva (hasta unos 22°) y el brazo
    // gira lo que falta; si todo el giro va al brazo, la piel entre el cuello y el hombro se hunde
    const cv = _fv.set(0, -1, 0).applyQuaternion(arm.sh.quaternion);
    const el = Math.acos(Math.max(-1, Math.min(1, -cv.y))), lt = Math.max(0, Math.min(1, (el - .9) / 1.6));
    const cq = q(4).setFromAxisAngle(_fz, (s === 'l' ? 1 : -1) * .38 * lt * lt * (3 - 2 * lt));
    b('clavicle_' + s).quaternion.copy(cq);
    b('upperarm_' + s).quaternion.copy(cq.invert()).multiply(arm.sh.quaternion).multiply(cu);
    b('lowerarm_' + s).quaternion.copy(q(1).copy(cu).invert()).multiply(arm.el.quaternion).multiply(cl);
    b('hand_' + s).quaternion.copy(cl).invert();
    b('thigh_' + s).quaternion.copy(leg.hp.quaternion).multiply(ct);
    b('calf_' + s).quaternion.copy(q(2).copy(ct).invert()).multiply(leg.kn.quaternion).multiply(cc);
    b('foot_' + s).quaternion.copy(cc).invert().multiply(leg.an.quaternion);   // el tobillo (al caminar, el pie plano)
    fig3dHand(A, s, q(3));
  }
}
/* ---------- la mano ----------
   Giro: la mitad en el antebrazo y la otra mitad en la mano, sobre el eje codo→muñeca (así la piel de
   la muñeca no se retuerce). Dedos: cada falange se dobla hacia la palma (la palma está del lado del
   pulgar); el pulgar se cierra hacia el meñique. En reposo los huesos de los dedos no tienen giro, así
   que sus ejes se sacan de las posiciones de los huesos una vez por figura. */
const FIG3D_FING = ['index', 'middle', 'ring', 'pinky'];
const FIG3D_CURL = { index: [1.2, 1.6, 1.0], middle: [1.25, 1.65, 1.05], ring: [1.3, 1.65, 1.05], pinky: [1.35, 1.6, 1.0] };
/* pulgar en el puño: la base gira (oposición) y se dobla hacia el meñique; las dos falanges se cierran sobre
   el índice y el medio (valores ajustados para que la punta quede delante de las falanges medias) */
const FIG3D_THUMB = { opp: -.6, t1: .44, t2: 1.36, t3: .6, toward: [-1, .28, .1] };
function fig3dHandKit(A, s) {
  const T = THREE, v = n => A.bone(n + '_' + s).position.clone();
  const dH = v('middle_01').normalize(), c = v('index_01').sub(v('pinky_01')).normalize();
  const n = new T.Vector3().crossVectors(dH, c).normalize();
  const th = v('thumb_01').add(v('thumb_02').multiplyScalar(.5));
  th.addScaledVector(dH, -th.dot(dH)).addScaledVector(c, -th.dot(c));
  if (th.dot(n) < 0) n.negate();
  const ax = {};
  for (const f of FIG3D_FING) ax[f] = new T.Vector3().crossVectors(v(f + '_02').normalize(), n).normalize();
  // pulgar: eje de oposición (gira de la línea de los nudillos hacia la palma) y hacia dónde se dobla
  const TB = FIG3D_THUMB, th0 = v('thumb_02').normalize();
  const opp = new T.Vector3().crossVectors(c, n).normalize();
  const toward = c.clone().multiplyScalar(TB.toward[0]).addScaledVector(n, TB.toward[1]).addScaledVector(dH, TB.toward[2]).normalize();
  return { ax, n, opp, th0, toward, tw: v('hand').normalize(), fl: new T.Vector3().crossVectors(dH, n).normalize(), q0: new T.Quaternion(), q1: new T.Quaternion(), v0: new T.Vector3(), v1: new T.Vector3() };
}
function fig3dHand(A, s, qa) {
  const H = A.handPose, tw = H ? H.w[s] * Math.PI / 180 : 0, cu = H ? H.f[s] : 0, fl = H && H.m ? H.m[s] * Math.PI / 180 : 0;
  const K = (tw || cu || fl || A['curl' + s]) && ((A.hk || (A.hk = {}))[s] || (A.hk[s] = fig3dHandKit(A, s)));
  if (tw) { qa.setFromAxisAngle(K.tw, tw * .5); A.bone('lowerarm_' + s).quaternion.multiply(qa); A.bone('hand_' + s).quaternion.premultiply(qa); }
  // muñeca: se dobla sobre el eje que cruza la mano (del índice al meñique); + hacia la palma
  if (fl) { qa.setFromAxisAngle(K.fl, fl); A.bone('hand_' + s).quaternion.multiply(qa); }
  if (!cu && !A['curl' + s]) return;
  A['curl' + s] = cu;
  for (const f of FIG3D_FING) for (let i = 1; i <= 3; i++) A.bone(`${f}_0${i}_${s}`).quaternion.setFromAxisAngle(K.ax[f], cu * FIG3D_CURL[f][i - 1]);
  // pulgar: oposición en la base, luego se dobla hacia el meñique; las falanges siguen sobre el mismo eje
  const TB = FIG3D_THUMB, qO = K.q0.setFromAxisAngle(K.opp, cu * TB.opp);
  const to = K.v0.copy(K.th0).applyQuaternion(qO), f = K.v1.crossVectors(to, K.toward).normalize();
  A.bone('thumb_01_' + s).quaternion.setFromAxisAngle(f, cu * TB.t1).multiply(qO);
  f.applyQuaternion(K.q1.copy(qO).invert());
  A.bone('thumb_02_' + s).quaternion.setFromAxisAngle(f, cu * TB.t2);
  A.bone('thumb_03_' + s).quaternion.setFromAxisAngle(f, cu * TB.t3);
}

/* ---------- doblar el cuerpo ----------
   Cada parte: los huesos que la forman (se tiñen), la articulación que gira (el aro), el punto que se
   arrastra y los ángulos que mueve (los mismos de las barras «Brazos, piernas y cabeza»). La mano y el
   pie mueven la extremidad entera (el codo y la rodilla se doblan solos). */
const FIG3D_FINGERS = s => ['thumb', 'index', 'middle', 'ring', 'pinky'].flatMap(f => [1, 2, 3].map(i => `${f}_0${i}_${s}`));
const POSE_PARTS = {
  cabeza: { name: 'Cabeza', act: 'girar o inclinar la cabeza', bones: ['head', 'neck_01'], pivot: 'neck_01', eff: ['head', [0, .05, .3]], dof: ['hy', 'hx'] },
  torso: { name: 'Torso', act: 'doblar el cuerpo', bones: ['spine_01', 'spine_02', 'spine_03', 'pelvis'], pivot: 'spine_01', eff: ['neck_01'], dof: ['tx', 'tz'] },
};
for (const [s, S, o, a] of [['r', 'R', 'derecho', 'derecha'], ['l', 'L', 'izquierdo', 'izquierda']]) {
  POSE_PARTS['brazo' + S] = { name: 'Brazo ' + o, act: 'levantar o abrir el brazo', bones: ['upperarm_' + s, 'clavicle_' + s], pivot: 'upperarm_' + s, eff: ['lowerarm_' + s], dof: ['s' + S + 'x', 's' + S + 'z'] };
  // antebrazo: el punto dobla el codo y el aro de la muñeca gira la mano; mano: el punto dobla la muñeca (sin mover el
  // resto del brazo; con Mayús, el brazo entero sigue a la mano) y su aro abre o cierra los dedos
  POSE_PARTS['antebrazo' + S] = { name: 'Antebrazo ' + o, act: 'doblar el codo', hint: 'Punto: doblar el codo · aro o flechas: girar la mano', bones: ['lowerarm_' + s], pivot: 'lowerarm_' + s, eff: ['hand_' + s], dof: ['e' + S], extra: ['w' + S], side: S, twist: s };
  POSE_PARTS['mano' + S] = { name: 'Mano ' + a, act: 'doblar la muñeca', hint: 'Punto: doblar la muñeca (Mayús: mover el brazo) · aro: dedos', bones: ['hand_' + s, ...FIG3D_FINGERS(s)], pivot: 'hand_' + s, eff: ['middle_01_' + s], dof: ['m' + S], ikDof: ['s' + S + 'x', 's' + S + 'z', 'e' + S], extra: ['f' + S], side: S, fingers: s };
  POSE_PARTS['muslo' + S] = { name: 'Muslo ' + o, act: 'levantar o abrir la pierna', bones: ['thigh_' + s], pivot: 'thigh_' + s, eff: ['calf_' + s], dof: ['l' + S, 'o' + S] };
  POSE_PARTS['pantorrilla' + S] = { name: 'Pantorrilla ' + a, act: 'doblar la rodilla', bones: ['calf_' + s], pivot: 'calf_' + s, eff: ['foot_' + s], dof: ['k' + S] };
  POSE_PARTS['pie' + S] = { name: 'Pie ' + o, act: 'mover la pierna desde el pie', bones: ['foot_' + s, 'ball_' + s], pivot: 'foot_' + s, eff: ['foot_' + s, [0, -.05, .09]], dof: ['l' + S, 'o' + S, 'k' + S], ik: true };
}
const POSE_OF_BONE = {};
for (const [k, p] of Object.entries(POSE_PARTS)) for (const b of p.bones) POSE_OF_BONE[b] = k;
/* aro de la muñeca: un círculo alrededor del antebrazo, cerca de la mano, con su base hacia el hombro
   (no gira con la mano, así el punto que marca el giro se mueve sobre él) */
function poseTwistRing(A, s, proj, minR) {
  const T = THREE, e = A.bone('lowerarm_' + s).getWorldPosition(new T.Vector3()), w = A.bone('hand_' + s).getWorldPosition(new T.Vector3());
  const sh = A.bone('upperarm_' + s).getWorldPosition(new T.Vector3()), ax = w.clone().sub(e), L = ax.length() || .25; ax.normalize();
  const u = sh.sub(e); u.addScaledVector(ax, -u.dot(ax)); if (u.lengthSq() < 1e-8) u.set(0, 1, 0).addScaledVector(ax, -ax.y);
  u.normalize(); const v = new T.Vector3().crossVectors(ax, u);
  const c = e.clone().lerp(w, .8), R = L * .36, pc = proj(c), p3 = new T.Vector3(), pts = [];
  for (let i = 0; i < 36; i++) { const th = i / 36 * Math.PI * 2; p3.copy(c).addScaledVector(u, R * Math.cos(th)).addScaledVector(v, R * Math.sin(th)); pts.push({ th, p: proj(p3) }); }
  const m = Math.max(...pts.map(q => Math.hypot(q.p[0] - pc[0], q.p[1] - pc[1])));
  if (m < minR) { const f = minR / Math.max(m, 1e-3); for (const q of pts) q.p = [pc[0] + (q.p[0] - pc[0]) * f, pc[1] + (q.p[1] - pc[1]) * f]; }
  return { pts, c: pc };
}
/* el ángulo del aro más cercano a q, y lo lejos que quedó */
function ringPick(pts, q) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], vx = b.p[0] - a.p[0], vy = b.p[1] - a.p[1], L2 = vx * vx + vy * vy || 1;
    const u = clamp(((q[0] - a.p[0]) * vx + (q[1] - a.p[1]) * vy) / L2, 0, 1), d = Math.hypot(q[0] - a.p[0] - vx * u, q[1] - a.p[1] - vy * u);
    const tb = i + 1 === pts.length ? Math.PI * 2 : b.th;
    if (d < bd) { bd = d; best = a.th + (tb - a.th) * u; }
  }
  return { th: best, d: bd };
}
/* tiñe una parte (o ninguna) de una figura */
function fig3dTint(A, key) {
  if (!A.fig || !A.infl.uSelMask || A.tintKey === key) return;
  A.tintKey = key;
  const m = A.infl.uSelMask.value; m.fill(0);
  const p = key && POSE_PARTS[key];
  if (p) for (const b of p.bones) { const i = A.fig.idx[b]; if (i !== undefined && i < 64) m[i] = 1; }
}
/* la parte bajo un rayo que toca la figura: el hueso que más pesa en el vértice más cercano */
function fig3dPartAt(A, hit) {
  const g = hit.object.geometry, f = hit.face; if (!g || !f) return null;
  const P = g.attributes.position, ji = g.attributes.skinIndex, jw = g.attributes.skinWeight; if (!ji || !jw) return null;
  const loc = hit.object.worldToLocal(hit.point.clone()), v = new THREE.Vector3();
  let best = f.a, bd = Infinity;
  for (const i of [f.a, f.b, f.c]) { hit.object.getVertexPosition(i, v); const d = v.distanceToSquared(loc); if (d < bd) { bd = d; best = i; } }
  const w = {};
  for (const i of [f.a, f.b, f.c]) {
    const bs = [ji.getX(i), ji.getY(i), ji.getZ(i), ji.getW(i)], ws = [jw.getX(i), jw.getY(i), jw.getZ(i), jw.getW(i)];
    for (let k = 0; k < 4; k++) { const n = A.fig.bones[bs[k]], key = n && POSE_OF_BONE[n.n]; if (key) w[key] = (w[key] || 0) + ws[k] * (i === best ? 2 : 1); }
  }
  let k = null, kw = 0;
  for (const [key, ww] of Object.entries(w)) if (ww > kw) { kw = ww; k = key; }
  return k;
}
/* articulación (aro) y punto que se arrastra, en coordenadas del mundo */
function posePivot(A, part, out) { return A.bone(part.pivot).getWorldPosition(out); }
function poseEff(A, part, out) {
  const [b, off] = part.eff, bn = A.bone(b);
  return off ? bn.localToWorld(out.set(off[0], off[1], off[2])) : bn.getWorldPosition(out);
}
/* ---- arrastrar una parte ----
   Articulaciones (cabeza, torso, brazo, antebrazo, muslo, pantorrilla): al empezar se mide hacia dónde
   se mueve en pantalla el punto de la parte cuando cada ángulo crece (con pasos de 15°, para que un
   codo estirado también responda) y el arrastre se reparte entre esos ángulos. Si un ángulo casi no se
   ve desde la cámara (doblar hacia ella), responde al arrastre vertical u horizontal.
   Pie (y mano con Mayús): la extremidad entera sigue al punto (cinemática inversa en el plano de la pantalla).
   Mano: el punto dobla la muñeca, como el codo. */
const POSE_FB = { hy: 'x', tz: 'x', ty: 'x', sRz: 'x', sLz: 'x', oR: 'x', oL: 'x', mR: 'x', mL: 'x' };
const jlim = k => { const r = S3_JOINTS.find(x => x[0] === k); return r ? [r[2], r[3]] : [-180, 180]; };
function poseAt(A, st, part, j0, keys, xv, out) {
  const j = { ...j0 }; keys.forEach((k, i) => { j[k] = xv[i]; });
  poseActor(A, { ...st, j }); A.root.updateMatrixWorld(true);
  return poseEff(A, part, out);
}
function poseLinStart(A, st, part, j0, proj) {
  const keys = part.dof, x0 = keys.map(k => j0[k] || 0), v = new THREE.Vector3();
  const depth = [];
  const raw = keys.map((k, i) => {
    const [lo, hi] = jlim(k), a = Math.max(lo, x0[i] - 15), b = Math.min(hi, x0[i] + 15);
    const va = poseAt(A, st, part, j0, keys, x0.map((q, n) => n === i ? a : q), v).clone(), pa = proj(va);
    const vb = poseAt(A, st, part, j0, keys, x0.map((q, n) => n === i ? b : q), v).clone(), pb = proj(vb);
    // ¿el punto se mueve sobre todo hacia la cámara o alejándose? (lo que se ve en pantalla es poco para lo que se mueve)
    const d3 = va.distanceTo(vb), m3 = va.clone().lerp(vb, .5), pm = proj(m3), pu = proj(m3.clone().add(new THREE.Vector3(0, .1, 0)));
    const scale = Math.hypot(pu[0] - pm[0], pu[1] - pm[1]) / .1;
    depth[i] = d3 > 1e-4 && scale > 0 && Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) < .45 * d3 * scale;
    return [(pb[0] - pa[0]) / Math.max(1, b - a), (pb[1] - pa[1]) / Math.max(1, b - a)];
  });
  poseActor(A, { ...st, j: j0 }); A.root.updateMatrixWorld(true);
  return { keys, x0, U: poseDirs(raw, keys, depth) };
}
/* hacia dónde se mueve en pantalla el punto cuando crece cada ángulo. Un ángulo que casi no se ve desde la
   cámara (se dobla hacia ella), o que va por la misma línea que el primero, responde al arrastre perpendicular
   al otro: así arrastrar hacia donde mira la figura la inclina hacia adelante y no hacia el costado (antes,
   de perfil o de tres cuartos, los dos ángulos se repartían el mismo arrastre y el cuerpo se iba de lado) */
function poseDirs(raw, keys, depth = []) {
  const mag = u => Math.hypot(u[0], u[1]);
  // de frente: el torso y la cabeza se inclinan hacia adelante arrastrando hacia abajo (la cabeza baja); brazos y piernas suben hacia arriba
  const fixed = k => POSE_FB[k] === 'x' ? [1.6, 0] : k === 'tx' || k === 'hx' ? [0, 1.6] : [0, -1.6];
  if (keys.length !== 2) return raw.map((u, i) => mag(u) < .15 ? fixed(keys[i]) : u);
  const bothDepth = depth[0] && depth[1];
  const m = raw.map(mag), cos = m[0] && m[1] ? Math.abs(raw[0][0] * raw[1][0] + raw[0][1] * raw[1][1]) / (m[0] * m[1]) : 0;
  // casi en la misma línea de la pantalla (de tres cuartos, inclinarse adelante y al costado mueven el cuello casi igual):
  // gana el primer ángulo de la parte (el torso, adelante) y el otro pasa al arrastre perpendicular
  const tiny = i => depth[i] || m[i] < .15 || m[i] < .3 * m[1 - i];
  const par = cos > .9 && !tiny(0) && !tiny(1);
  const weak = i => tiny(i) || (par && i === 1);
  const U = raw.slice();
  for (const i of [0, 1]) {
    if (!weak(i)) continue;
    if (weak(1 - i)) { U[i] = m[i] < .15 || (bothDepth && (keys[i] === 'tx' || keys[i] === 'hx')) ? fixed(keys[i]) : raw[i]; continue; }
    const s = raw[1 - i], L = Math.max(1.6, m[1 - i]);
    let p = [-s[1] / m[1 - i] * L, s[0] / m[1 - i] * L];
    // el sentido: hacia la cámara, el de siempre (inclinarse: hacia abajo); si no, el que ya tenía (si se veía algo)
    const ref = depth[i] || m[i] <= .02 ? fixed(keys[i]) : raw[i];
    if (p[0] * ref[0] + p[1] * ref[1] < 0) p = [-p[0], -p[1]];
    U[i] = p;
  }
  return U;
}
function poseLinApply(L, j0, d) {
  const { keys, x0, U } = L, lam = .04;
  let dx;
  if (keys.length === 1) { const u = U[0]; dx = [(u[0] * d[0] + u[1] * d[1]) / (u[0] * u[0] + u[1] * u[1] + lam)]; }
  else {
    const [u, w] = U, a = u[0] * u[0] + u[1] * u[1] + lam, b = u[0] * w[0] + u[1] * w[1], c = w[0] * w[0] + w[1] * w[1] + lam;
    const r0 = u[0] * d[0] + u[1] * d[1], r1 = w[0] * d[0] + w[1] * d[1], det = a * c - b * b || 1;
    dx = [(c * r0 - b * r1) / det, (a * r1 - b * r0) / det];
  }
  const out = { ...j0 };
  keys.forEach((k, i) => { const [lo, hi] = jlim(k); out[k] = Math.round(clamp(x0[i] + dx[i], lo, hi) * 10) / 10; });
  return out;
}
/* codo y rodilla (un solo ángulo): el camino que recorre el punto en pantalla al doblarse, de un límite
   al otro; es el aro que se dibuja y el arrastre se pega a él. null si casi no se ve (de frente a la cámara) */
function poseArc(A, st, part, j0, proj) {
  const k = part.dof[0], [lo, hi] = jlim(k), v = new THREE.Vector3(), out = [];
  for (let t = lo; t <= hi + 1e-6; t += 5) out.push({ t, p: proj(poseAt(A, st, part, j0, [k], [t], v)) });
  poseActor(A, { ...st, j: j0 }); A.root.updateMatrixWorld(true);
  let L = 0; for (let i = 1; i < out.length; i++) L += Math.hypot(out[i].p[0] - out[i - 1].p[0], out[i].p[1] - out[i - 1].p[1]);
  return L > 24 ? out : null;
}
/* ángulo del punto del camino más cercano a q */
function arcPick(arc, q) {
  let best = arc[0].t, bd = Infinity;
  for (let i = 1; i < arc.length; i++) {
    const a = arc[i - 1], b = arc[i], vx = b.p[0] - a.p[0], vy = b.p[1] - a.p[1], L2 = vx * vx + vy * vy || 1;
    const u = clamp(((q[0] - a.p[0]) * vx + (q[1] - a.p[1]) * vy) / L2, 0, 1), d = Math.hypot(q[0] - a.p[0] - vx * u, q[1] - a.p[1] - vy * u);
    if (d < bd) { bd = d; best = a.t + (b.t - a.t) * u; }
  }
  return best;
}
/* mano o pie: el punto va al objetivo (en el plano que mira a la cámara) moviendo toda la extremidad;
   el codo o la rodilla parten un poco doblados para poder plegarse */
function poseSolveIK(A, st, part, target, j0, keys = part.dof) {
  const lim = keys.map(jlim), p = new THREE.Vector3(), q = new THREE.Vector3();
  let x = keys.map(k => j0[k] || 0);
  const bend = keys.length - 1; if (x[bend] < 6) x[bend] = 6;
  for (let it = 0; it < 12; it++) {
    poseAt(A, st, part, j0, keys, x, p);
    const e = [target.x - p.x, target.y - p.y, target.z - p.z];
    if (Math.hypot(e[0], e[1], e[2]) < .003) break;
    const J = keys.map((_, i) => { const xi = x.slice(); xi[i] += 1; poseAt(A, st, part, j0, keys, xi, q); return [q.x - p.x, q.y - p.y, q.z - p.z]; });
    const M = [0, 1, 2].map(a => [0, 1, 2].map(b => J.reduce((s2, c) => s2 + c[a] * c[b], 0) + (a === b ? 1e-5 : 0)));
    const D = det3(M); if (!isFinite(D) || Math.abs(D) < 1e-18) break;
    const y = [0, 1, 2].map(c => det3(M.map((row, r) => row.map((v, k) => k === c ? e[r] : v))) / D);
    let dx = J.map(c => c[0] * y[0] + c[1] * y[1] + c[2] * y[2]);
    const mx = Math.max(...dx.map(Math.abs)); if (mx > 10) dx = dx.map(d => d * 10 / mx);
    x = x.map((v, i) => clamp(v + dx[i], lim[i][0], lim[i][1]));
  }
  const out = { ...j0 }; keys.forEach((k, i) => { out[k] = Math.round(x[i] * 10) / 10; });
  poseActor(A, { ...st, j: out }); A.root.updateMatrixWorld(true);
  return out;
}
const det3 = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
