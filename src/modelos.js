/* ============================================================
   MODELOS 3D IMPORTADOS · escenarios (uno por locación) y personajes con esqueleto (en su ficha)
   Se leen .glb, .gltf (con todo adentro), .vrm y .fbx (el de Mixamo) con los lectores de three.js (glb-lib.js).
   No se guarda el archivo original: se guarda una versión liviana en un formato propio («FSM»): gzip de
   [«FSM1»][u32 largo del encabezado][encabezado JSON][datos], con las mallas, los materiales, las texturas en WebP de
   hasta unos 170 kB (imagenes.js) y, en un personaje, su esqueleto. Viaja como una imagen más
   (FRAMES['m3~…'] = 'data:model/x-fsm;base64,…'): se guarda, va al equipo y se descarga igual que las fotos.
   Escenarios: P.sets3d[id] (escenarios-3d.js). Personajes: look.model del personaje (personajes-3d.js).
   ============================================================ */
const M3_MIME = 'model/x-fsm';
const M3_MAX = 8 * 1024 * 1024;                        // lo que acepta el servidor por archivo
const M3_TRIS = { set: 300000, char: 100000 };         // triángulos: más que esto se reduce
const M3_FILES = '.glb,.gltf,.vrm,.fbx';
const M3_BIG = 'El modelo sigue pesando más de 8 MB aun aligerado. Quita lo que no sale en cámara y vuelve a exportarlo.';
const m3Key = (kind, id) => `m3~${kind}~${id}`;        // kind: 's' escenario, 'c' personaje

/* ---------- leer el archivo ---------- */
function m3Msg(e) {
  const s = String((e && e.message) || e || '');
  if (/draco/i.test(s)) return 'El modelo viene comprimido con Draco. Expórtalo de nuevo sin esa compresión (en Blender, sin «Compression»).';
  if (/basisu|ktx2/i.test(s)) return 'El modelo trae texturas KTX2 que no se pueden leer aquí. Expórtalo con texturas PNG o JPG.';
  if (/Failed to load|\.bin|fetch|404/i.test(s)) return 'Ese .gltf usa archivos aparte (.bin y texturas). Expórtalo como .glb, que lleva todo en un solo archivo.';
  if (/FBX version not supported|Unknown format|THREE\.FBXLoader/i.test(s)) return 'Ese .fbx no se puede leer (versión antigua o en texto). Descárgalo de nuevo como FBX binario o pásalo a .glb.';
  if (/grande/.test(s)) return 'El archivo pesa demasiado (más de 400 MB). Limpia el modelo antes de exportarlo.';
  return 'No se pudo leer el modelo. Prueba exportarlo de nuevo como .glb.';
}
async function m3Read(file) {
  if (!r3Init()) throw new Error('Este equipo no puede mostrar 3D.');
  const L = glbLib(), name = file.name || '', buf = await file.arrayBuffer();
  if (buf.byteLength > 400 * 1024 * 1024) throw new Error(m3Msg('grande'));
  try {
    let root, fmt = 'gltf', vrm = 0;
    if (/\.fbx$/i.test(name)) { root = new L.FBXLoader().parse(buf, ''); fmt = 'fbx'; }
    else {
      const ldr = new L.GLTFLoader();
      try { await L.MeshoptDecoder.ready; ldr.setMeshoptDecoder(L.MeshoptDecoder); } catch (e) { }
      const g = await new Promise((res, rej) => ldr.parse(buf, '', res, rej));
      const ex = (g.parser && g.parser.json && g.parser.json.extensions) || {};
      vrm = ex.VRMC_vrm ? 1 : ex.VRM ? 0.5 : 0;      // VRM 0.x mira hacia atrás (-Z)
      if (vrm) fmt = 'vrm';
      root = g.scene;
    }
    root.updateMatrixWorld(true);
    await m3TexReady(root);
    return { root, fmt, vrm, name: name.replace(/\.[^.]+$/, ''), bytes: buf.byteLength };
  } catch (e) { console.warn('modelo 3D:', e); throw new Error(m3Msg(e)); }
}
// las texturas que el lector todavía está abriendo (las del FBX llegan después)
async function m3TexReady(root) {
  const ims = new Set();
  root.traverse(o => { if (o.isMesh) for (const m of [].concat(o.material || [])) if (m && m.map && m.map.image) ims.add(m.map.image); });
  await Promise.all([...ims].map(im => im && im.tagName === 'IMG' && !(im.complete && im.naturalWidth)
    ? new Promise(r => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); setTimeout(r, 8000); }) : null));
}
/* lo que trae: triángulos, mallas, si tiene esqueleto (y cuántos huesos) */
function m3Stats(root) {
  let tris = 0, meshes = 0, skinned = 0; const bones = new Set();
  root.traverse(o => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    meshes++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    if (o.isSkinnedMesh && o.skeleton) { skinned++; o.skeleton.bones.forEach(b => bones.add(b)); }
  });
  return { tris: Math.round(tris), meshes, skinned, bones: bones.size };
}

/* ---------- aligerar y empacar ---------- */
const m3Bytes = u => { const b = atob(u.slice(u.indexOf(',') + 1)), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
async function m3Gzip(u8) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); }
async function m3Gunzip(u8) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); }
function m3B64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
// ¿la imagen tiene partes transparentes? (se mira una versión chica)
function m3HasAlpha(img) {
  try {
    const c = document.createElement('canvas'), w = Math.min(64, img.width || img.naturalWidth || 1), h = Math.min(64, img.height || img.naturalHeight || 1);
    c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data; for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
  } catch (e) { }
  return false;
}
/* una textura → WebP de hasta unos 170 kB (menos si son muchas: el modelo entero no pasa de lo que acepta el servidor) */
function m3Tex(img, max, top) {
  const w0 = img.naturalWidth || img.videoWidth || img.width, h0 = img.naturalHeight || img.videoHeight || img.height;
  if (!w0 || !h0) return null;
  const r = Math.min(1, max / Math.max(w0, h0)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w0 * r)); c.height = Math.max(1, Math.round(h0 * r));
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
  const alpha = m3HasAlpha(img);
  return { bytes: m3Bytes(imgUrl(c, { alpha, top })), alpha, type: IMG_WEBP ? 'image/webp' : alpha ? 'image/png' : 'image/jpeg' };
}
// gestos de la cara que se usan (por nombre): alegre, triste, enojado, sorpresa, ojos cerrados, guiño
const M3_MORPH = /joy|happy|smile|fun|sorrow|sad|frown|angry|anger|mad|surpri|shock|fear|blink|eyesclose|eyeclose|wink|^a$|^o$|mouth_?open|jaw_?open/i;
// solo los vértices que usa el índice (después de reducir triángulos)
function m3Compact(P) {
  const map = new Int32Array(P.pos.length / 3).fill(-1); let n = 0;
  for (let i = 0; i < P.idx.length; i++) { const v = P.idx[i]; if (map[v] < 0) map[v] = n++; P.idx[i] = map[v]; }
  const cp = (a, k) => { if (!a) return a; const o = new a.constructor(n * k); for (let v = 0; v < map.length; v++) if (map[v] >= 0) for (let j = 0; j < k; j++) o[map[v] * k + j] = a[v * k + j]; return o; };
  P.pos = cp(P.pos, 3); P.nrm = cp(P.nrm, 3); P.uv = cp(P.uv, 2); P.col = cp(P.col, 3); P.si = cp(P.si, 4); P.sw = cp(P.sw, 4);
  if (P.mo) P.mo = P.mo.map(x => ({ n: x.n, a: cp(x.a, 3) }));
}
/* las partes del modelo (malla × material), con los datos en arreglos planos. set: se hornea la posición en el mundo;
   char: las mallas con esqueleto quedan en su pose de enlace y las demás, pegadas a su hueso */
function m3Parts(root, kind) {
  const T = THREE, parts = [], mats = [], matKey = new Map(), texs = [], texKey = new Map();
  const boneSet = new Set(); root.traverse(o => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.bones.forEach(b => boneSet.add(b)); });
  // los huesos, cada padre antes que sus hijos (el FBX los puede traer en cualquier orden)
  const depth = b => { let d = 0; for (let p = b.parent; p; p = p.parent) if (boneSet.has(p)) d++; return d; };
  const bones = kind === 'char' ? [...boneSet].map((b, i) => [b, depth(b), i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]) : [];
  const bIdx = new Map(bones.map((b, i) => [b, i]));
  const skins = [];
  const matOf = m => {
    const map = m.map && m.map.image ? m.map : null;
    let ti = -1;
    if (map) {
      if (!texKey.has(map.image)) { texKey.set(map.image, texs.length); texs.push({ img: map.image, fy: map.flipY, ws: map.wrapS, wt: map.wrapT, rp: [map.repeat.x, map.repeat.y], of: [map.offset.x, map.offset.y], rot: map.rotation || 0 }); }
      ti = texKey.get(map.image);
    }
    const d = { c: m.color ? '#' + m.color.getHexString() : '#CCCCCC', t: ti, op: m.opacity == null ? 1 : +m.opacity.toFixed(3), tr: !!m.transparent && m.opacity < .999, at: m.alphaTest || 0, ds: m.side === T.DoubleSide, vc: !!m.vertexColors };
    if (map && d.c === '#000000') d.c = '#FFFFFF';   // FBX: color negro con textura (la textura manda)
    const k = JSON.stringify(d);
    if (!matKey.has(k)) { matKey.set(k, mats.length); mats.push(d); }
    return matKey.get(k);
  };
  const v3 = new T.Vector3(), nm = new T.Matrix3();
  root.traverse(o => {
    if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes.position) return;
    const g = o.geometry, A = g.attributes, nV = A.position.count;
    const idx = g.index ? Uint32Array.from(g.index.array) : Uint32Array.from({ length: nV }, (_, i) => i);
    const ml = [].concat(o.material || []);
    const groups = g.groups && g.groups.length && Array.isArray(o.material) ? g.groups : [{ start: 0, count: idx.length, materialIndex: 0 }];
    const skinned = kind === 'char' && o.isSkinnedMesh && o.skeleton;
    // la matriz a hornear: en el mundo (escenario y piezas sueltas) o la de enlace (malla con esqueleto)
    let M = o.matrixWorld, boneOf = -1;
    if (kind === 'char' && !skinned) {
      // una pieza pegada a un hueso (sombrero, lentes): queda en el espacio de ese hueso
      for (let p = o.parent; p; p = p.parent) if (bIdx.has(p)) { boneOf = bIdx.get(p); M = new T.Matrix4().copy(p.matrixWorld).invert().multiply(o.matrixWorld); break; }
    }
    if (skinned) M = o.bindMatrix;
    nm.getNormalMatrix(M);
    const pos = new Float32Array(nV * 3), nrm = new Float32Array(nV * 3);
    const bakeSkin = kind === 'set' && o.isSkinnedMesh && o.applyBoneTransform;
    if (!A.normal) g.computeVertexNormals();
    for (let i = 0; i < nV; i++) {
      v3.fromBufferAttribute(A.position, i);
      if (bakeSkin) { o.applyBoneTransform(i, v3); v3.applyMatrix4(o.matrixWorld); } else v3.applyMatrix4(M);
      pos[i * 3] = v3.x; pos[i * 3 + 1] = v3.y; pos[i * 3 + 2] = v3.z;
      v3.fromBufferAttribute(g.attributes.normal, i).applyMatrix3(nm).normalize();
      nrm[i * 3] = v3.x; nrm[i * 3 + 1] = v3.y; nrm[i * 3 + 2] = v3.z;
    }
    const uv = A.uv ? new Float32Array(nV * 2) : null, col = A.color ? new Float32Array(nV * 3) : null;
    for (let i = 0; i < nV; i++) {
      if (uv) { uv[i * 2] = A.uv.getX(i); uv[i * 2 + 1] = A.uv.getY(i); }
      if (col) { col[i * 3] = A.color.getX(i); col[i * 3 + 1] = A.color.getY(i); col[i * 3 + 2] = A.color.getZ(i); }
    }
    // gestos (morphs) de la cara: los que sirven para las expresiones, ya en el espacio horneado
    let mo = null;
    if (kind === 'char' && g.morphAttributes && g.morphAttributes.position && o.morphTargetDictionary) {
      const names = Object.entries(o.morphTargetDictionary).sort((a, b) => a[1] - b[1]).map(x => x[0]);
      const rel = g.morphTargetsRelative, nm3 = new T.Matrix3().setFromMatrix4(M);
      mo = names.map((n, j) => [n, j]).filter(([n]) => M3_MORPH.test(n)).slice(0, 12).map(([n, j]) => {
        const at = g.morphAttributes.position[j], a = new Float32Array(nV * 3);
        for (let i = 0; i < nV; i++) {
          v3.fromBufferAttribute(at, i); if (!rel) v3.sub(new T.Vector3().fromBufferAttribute(A.position, i));
          v3.applyMatrix3(nm3); a[i * 3] = v3.x; a[i * 3 + 1] = v3.y; a[i * 3 + 2] = v3.z;
        }
        return { n, a };
      });
      if (!mo.length) mo = null;
    }
    let si = null, sw = null, sk = -1;
    if (skinned) {
      const sb = o.skeleton.bones;
      si = new Uint16Array(nV * 4); sw = new Float32Array(nV * 4);
      const gi = ['getX', 'getY', 'getZ', 'getW'];
      for (let i = 0; i < nV; i++) for (let j = 0; j < 4; j++) { si[i * 4 + j] = bIdx.get(sb[A.skinIndex[gi[j]](i)]) || 0; sw[i * 4 + j] = A.skinWeight[gi[j]](i); }
      // la pose de enlace de cada hueso (con la matriz de enlace ya horneada en los vértices)
      const inv = new Float32Array(bones.length * 16);
      for (let b = 0; b < bones.length; b++) new T.Matrix4().copy(bones[b].matrixWorld).invert().toArray(inv, b * 16);
      sb.forEach((b, j) => o.skeleton.boneInverses[j].toArray(inv, bIdx.get(b) * 16));
      sk = skins.length; skins.push(inv);
    }
    // una parte por grupo de material
    for (const G of groups) {
      const m = ml[G.materialIndex || 0] || ml[0]; if (!m) continue;
      const sub = idx.slice(G.start, G.start + Math.min(G.count, idx.length - G.start));
      if (!sub.length) continue;
      parts.push({ m: matOf(m), idx: sub, pos, nrm, uv, col, si, sw, sk, b: boneOf, mo });
    }
  });
  // las partes que comparten vértices se separan (cada una con lo suyo) para poder reducirlas y compactarlas
  const seen = new Set();
  for (const P of parts) { if (seen.has(P.pos)) { P.pos = P.pos.slice(); P.nrm = P.nrm.slice(); P.uv = P.uv && P.uv.slice(); P.col = P.col && P.col.slice(); P.si = P.si && P.si.slice(); P.sw = P.sw && P.sw.slice(); P.mo = P.mo && P.mo.map(x => ({ n: x.n, a: x.a.slice() })); } seen.add(P.pos); m3Compact(P); }
  return { parts, mats, texs, bones, skins };
}
// un escenario: las partes con el mismo material se juntan (menos dibujos por cuadro)
function m3Merge(parts) {
  const by = new Map();
  for (const P of parts) { const k = P.m + '|' + !!P.uv + '|' + !!P.col; if (!by.has(k)) by.set(k, []); by.get(k).push(P); }
  const out = [];
  for (const L of by.values()) {
    if (L.length === 1) { out.push(L[0]); continue; }
    const nv = L.reduce((a, P) => a + P.pos.length / 3, 0), ni = L.reduce((a, P) => a + P.idx.length, 0);
    const Q = { m: L[0].m, pos: new Float32Array(nv * 3), nrm: new Float32Array(nv * 3), uv: L[0].uv ? new Float32Array(nv * 2) : null, col: L[0].col ? new Float32Array(nv * 3) : null, idx: new Uint32Array(ni), si: null, sw: null, sk: -1, b: -1 };
    let v = 0, i = 0;
    for (const P of L) { Q.pos.set(P.pos, v * 3); Q.nrm.set(P.nrm, v * 3); if (Q.uv) Q.uv.set(P.uv, v * 2); if (Q.col) Q.col.set(P.col, v * 3); for (let j = 0; j < P.idx.length; j++) Q.idx[i + j] = P.idx[j] + v; v += P.pos.length / 3; i += P.idx.length; }
    out.push(Q);
  }
  return out;
}
/* menos triángulos si pasa del tope (meshoptimizer); sin él, se avisa */
async function m3Simplify(parts, budget) {
  const tris = parts.reduce((a, P) => a + P.idx.length / 3, 0);
  if (tris <= budget) return { tris, cut: false };
  const S = glbLib().MeshoptSimplifier;
  try { await S.ready; } catch (e) { throw new Error(`El modelo tiene ${Math.round(tris).toLocaleString('es-PE')} triángulos y aquí se acepta hasta ${budget.toLocaleString('es-PE')}. Simplifícalo antes de exportarlo (quita lo que no sale en cámara).`); }
  const r = budget / tris;
  for (const P of parts) {
    const target = Math.max(3, Math.floor(P.idx.length * r / 3) * 3);
    if (target >= P.idx.length) continue;
    const [ni] = S.simplify(P.idx, P.pos, 3, target, .02, ['LockBorder']);
    P.idx = Uint32Array.from(ni); m3Compact(P);
  }
  return { tris: parts.reduce((a, P) => a + P.idx.length / 3, 0), cut: true, from: tris };
}
/* el modelo completo → bytes del formato propio (gzip). o: { kind: 'set'|'char', extra: datos del encabezado } */
async function m3Pack(root, o) {
  const T = THREE, kind = o.kind;
  root.updateMatrixWorld(true);
  const R = m3Parts(root, kind);
  let parts = kind === 'set' ? m3Merge(R.parts) : R.parts;
  if (!parts.length) throw new Error('El archivo no trae mallas que se puedan mostrar.');
  const sim = await m3Simplify(parts, o.budget || M3_TRIS[kind]);
  // texturas: lado mayor 1024 px y hasta unos 170 kB cada una (con muchas, menos: el total no pasa de unos 4 MB)
  const nT = R.texs.length, top = Math.min(o.texTop || IMG_TOP, Math.floor((o.texAll || 4 * 1024 * 1024) / Math.max(1, nT))), side = nT > 24 || o.texTop ? 512 : 1024;
  const texB = R.texs.map(t => m3Tex(t.img, side, top));
  // binario: cada arreglo alineado a 4 bytes
  const chunks = []; let off = 0;
  const put = a => { if (!a) return null; const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); const at = off; chunks.push(u); off += u.length; const pad = (4 - off % 4) % 4; if (pad) { chunks.push(new Uint8Array(pad)); off += pad; } return [at, a.length]; };
  const H = { v: 1, kind, mats: R.mats, texs: [], parts: [], tris: Math.round(sim.tris), ...(o.extra || {}) };
  R.texs.forEach((t, i) => { const b = texB[i]; H.texs.push(b ? { d: put(b.bytes), ty: b.type, a: b.alpha, fy: t.fy, ws: t.ws, wt: t.wt, rp: t.rp, of: t.of, rot: t.rot } : null); });
  for (const P of parts) {
    const nV = P.pos.length / 3, i16 = nV < 65536;
    H.parts.push({ m: P.m, p: put(P.pos), n: put(P.nrm), u: put(P.uv), c: put(P.col), i: put(i16 ? Uint16Array.from(P.idx) : P.idx), i16, si: put(P.si), sw: put(P.sw), sk: P.sk, b: P.b, mo: P.mo ? P.mo.map(x => ({ n: x.n, d: put(x.a) })) : undefined });
  }
  if (kind === 'char') {
    // el esqueleto: nombre, padre, posición, giro y escala de cada hueso en reposo; y la matriz de lo que está arriba
    const B = R.bones, bi = new Map(B.map((b, i) => [b, i]));
    H.bones = B.map(b => ({ n: b.name || '', p: bi.has(b.parent) ? bi.get(b.parent) : -1, t: b.position.toArray().map(x => +x.toFixed(6)), q: b.quaternion.toArray().map(x => +x.toFixed(6)), s: b.scale.toArray().map(x => +x.toFixed(6)) }));
    const top = B.find(b => !bi.has(b.parent));
    H.arm = top && top.parent ? top.parent.matrixWorld.toArray() : new T.Matrix4().toArray();
    H.skins = R.skins.map(inv => put(inv));
  }
  const hj = new TextEncoder().encode(JSON.stringify(H)), head = new Uint8Array(8);
  head.set([70, 83, 77, 49]); new DataView(head.buffer).setUint32(4, hj.length, true);
  const pad = (4 - (8 + hj.length) % 4) % 4, all = new Uint8Array(8 + hj.length + pad + off);
  all.set(head, 0); all.set(hj, 8); let at = 8 + hj.length + pad; for (const c of chunks) { all.set(c, at); at += c.length; }
  const gz = await m3Gzip(all);
  // si pasa de lo que acepta el servidor: menos triángulos (y, si no alcanza, texturas más chicas) y otra vez
  if (gz.length > M3_MAX * .96 && (o.try || 0) < 3) {
    const tex = texB.reduce((a, b) => a + (b ? b.bytes.length : 0), 0), mesh = Math.max(1, gz.length - tex), room = M3_MAX * .9 - tex;
    const r = room > mesh * .15 ? room / mesh : .5;
    const more = room > mesh * .15 ? {} : { texTop: Math.max(24 * 1024, Math.floor((o.texTop || IMG_TOP) / 2)), texAll: Math.floor((o.texAll || 4 * 1024 * 1024) / 2) };
    return m3Pack(root, { ...o, ...more, try: (o.try || 0) + 1, budget: Math.max(2000, Math.floor(H.tris * r * .95)), from0: o.from0 || sim.from || H.tris });
  }
  return { gz, url: `data:${M3_MIME};base64,` + m3B64(gz), tris: H.tris, cut: sim.cut || !!o.from0, from: o.from0 || sim.from, kb: Math.round(gz.length / 1024), texs: nT };
}

/* ---------- abrir lo guardado ---------- */
const M3 = { tpl: new Map() };   // clave → { url, p: promesa, t: plantilla }
async function m3Parse(url) {
  const raw = await m3Gunzip(m3Bytes(url)), dv = new DataView(raw.buffer);
  if (String.fromCharCode(raw[0], raw[1], raw[2], raw[3]) !== 'FSM1') throw new Error('modelo dañado');
  const n = dv.getUint32(4, true), H = JSON.parse(new TextDecoder().decode(raw.subarray(8, 8 + n)));
  const base = 8 + n + (4 - (8 + n) % 4) % 4;
  const arr = (C, r) => r ? new C(raw.buffer, base + r[0], r[1]) : null;
  const T = THREE;
  // texturas: imágenes decodificadas (con su volteo, repetición y desplazamiento)
  const texs = await Promise.all(H.texs.map(async t => {
    if (!t) return null;
    const u = URL.createObjectURL(new Blob([arr(Uint8Array, t.d)], { type: t.ty || 'image/webp' }));
    try {
      const im = await imgLoad(u);
      const tx = new T.Texture(im); tx.flipY = t.fy !== false; tx.wrapS = t.ws || T.RepeatWrapping; tx.wrapT = t.wt || T.RepeatWrapping;
      tx.repeat.set(t.rp[0], t.rp[1]); tx.offset.set(t.of[0], t.of[1]); tx.rotation = t.rot || 0; tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 4; tx.needsUpdate = true;
      return tx;
    } catch (e) { return null; } finally { URL.revokeObjectURL(u); }
  }));
  const parts = H.parts.map(p => {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(arr(Float32Array, p.p), 3));
    g.setAttribute('normal', new T.BufferAttribute(arr(Float32Array, p.n), 3));
    if (p.u) g.setAttribute('uv', new T.BufferAttribute(arr(Float32Array, p.u), 2));
    if (p.c) g.setAttribute('color', new T.BufferAttribute(arr(Float32Array, p.c), 3));
    if (p.si) { g.setAttribute('skinIndex', new T.BufferAttribute(arr(Uint16Array, p.si), 4)); g.setAttribute('skinWeight', new T.BufferAttribute(arr(Float32Array, p.sw), 4)); }
    g.setIndex(new T.BufferAttribute(arr(p.i16 ? Uint16Array : Uint32Array, p.i), 1));
    if (p.mo && p.mo.length) { g.morphAttributes.position = p.mo.map(x => new T.BufferAttribute(arr(Float32Array, x.d), 3)); g.morphTargetsRelative = true; }
    g.computeBoundingBox(); g.computeBoundingSphere();
    return { geo: g, m: p.m, sk: p.sk, b: p.b, morphs: p.mo ? p.mo.map(x => x.n) : null };
  });
  const skins = (H.skins || []).map(r => arr(Float32Array, r));
  return { H, texs, parts, skins };
}
/* la plantilla de una clave de FRAMES: se abre una vez por versión (la firma: largo y final del texto, que en un gzip
   lleva su suma de control). Si la memoria suelta el texto (frameTrim), la plantilla abierta sigue sirviendo */
const m3Sig = u => u ? u.length + ':' + u.slice(-32) : '';
function m3Tpl(k, onReady) {
  const url = FRAMES[k];
  let e = M3.tpl.get(k);
  if (!url) {
    if (frameHas(k)) { if (e && e.t) return e.t; framesNeed([k]).then(() => { if (FRAMES[k] && onReady) onReady(); }); return null; }
    if (e) { if (e.t) m3Dispose(e.t); M3.tpl.delete(k); }   // se quitó
    return null;
  }
  const sig = m3Sig(url);
  if (e && e.sig === sig) { if (!e.t && !e.bad && onReady) e.p.then(() => onReady()); return e.t || null; }
  const old = e && e.t;
  e = { sig, t: null, p: null };
  e.p = m3Parse(url).then(t => { if (M3.tpl.get(k) === e) { e.t = t; if (old) m3Dispose(old); } if (onReady) onReady(); return t; }).catch(err => { console.warn('modelo 3D:', err); e.bad = true; });
  M3.tpl.set(k, e);
  return null;
}
const m3Ready = k => { const e = M3.tpl.get(k); return !!(e && e.t && (!FRAMES[k] || e.sig === m3Sig(FRAMES[k]))); };
function m3Dispose(t) { for (const p of t.parts) p.geo.dispose(); for (const x of t.texs) if (x) x.dispose(); for (const m of t.matsCache || []) m.dispose(); if (t.edgeGeo) t.edgeGeo.dispose(); }
/* los materiales de una plantilla (con el sombreado de la app; se comparten entre las copias) */
function m3MatsNew(t, extra) {
  const T = THREE;
  return t.H.mats.map(d => {
    const m = toon(d.c, { map: d.t >= 0 ? t.texs[d.t] : null, transparent: d.tr, opacity: d.op, alphaTest: d.at || 0, side: d.ds ? T.DoubleSide : T.FrontSide, vertexColors: d.vc, ...(extra || {}) });
    if (d.tr) m.depthWrite = false;
    return m;
  });
}
const m3Mats = t => t.matsCache || (t.matsCache = m3MatsNew(t));
/* la plantilla, esperando lo que falte: bajar el modelo y abrirlo (null si no se puede) */
async function m3TplWait(k) {
  let t = m3Tpl(k); if (t) return t;
  if (!FRAMES[k] && frameHas(k)) await framesNeed([k]).catch(() => { });
  t = m3Tpl(k); if (t) return t;
  const e = M3.tpl.get(k); if (e && e.p) await e.p;
  return m3Tpl(k);
}
/* guardar el modelo empacado (como una imagen más) */
async function m3Save(k, url) {
  FRAMES[k] = url; IMGS.delete(k);
  if (P._sample && !P._saved) await flushSave();
  await Store.saveFrame(P.id, k, url);
}
