/* ============================================================
   ACCESORIOS DIBUJADOS (sombrero, lentes, mochila, cinturón…)
   Se dibuja la silueta del accesorio sobre la figura vista de frente, de lado, desde arriba y,
   si hace falta, desde atrás. El volumen es lo que cabe en todas las siluetas a la vez (casco
   visual): cada vista recorta un bloque de cubitos a lo largo de su dirección. Si en una
   dirección no se dibujó nada, el volumen se infla como una almohada. La pieza queda pegada a
   un hueso (cabeza, torso o cadera) y lo sigue cuando la figura se mueve.
   Se guardan los trazos de cada vista (no la malla): la malla se vuelve a armar al cargar.
   Tres tipos: pieza (casco visual), ropa (se pega a la piel y se dobla) y cabello (una capa sobre el
   cráneo, más gruesa al centro y pegada a la piel en el borde; la cara queda libre).
   Dos capas de trazos: la forma (qué se cubre) y los detalles (colores y materiales pintados encima:
   parches, costuras, hebillas, mechones). Los detalles van a la malla como texturas, una por vista; cada
   punto toma color y material de la vista que más lo mira. El material cambia el brillo punto a punto
   (tela mate, cuero con brillo suave, metal con reflejo fuerte, pelo con brillo de hebra).
   ============================================================ */
const ACC_PARTS = {
  cabeza: { name: 'Cabeza', bone: 'head', c: [0, .1, .01], s: .46 },
  torso: { name: 'Torso', bone: 'spine_03', c: [0, .02, 0], s: .72 },
  cadera: { name: 'Cadera', bone: 'pelvis', c: [0, -.04, 0], s: .62 },
  cuerpo: { name: 'Cuerpo entero', bone: 'pelvis', c: [0, -.02, .02], s: 1.9 },
  melena: { name: 'Cabeza y espalda', bone: 'head', c: [0, -.2, -.02], s: .9 },   // pelo largo
};
/* materiales: cómo toma la luz cada parte. Tela mate (el dibujo de siempre), cuero con brillo suave,
   metal con reflejo fuerte, pelo con brillo de hebra */
const ACC_MATS = [['tela', 'Tela'], ['cuero', 'Cuero'], ['metal', 'Metal']];
const ACC_MAT_ID = { tela: 0, cuero: 1, metal: 2, pelo: 3 };
const ACC_HAIR = ['#1E1B19', '#3B2A20', '#5A3C28', '#7A4E2E', '#A8783F', '#D4B06A', '#8E3B22', '#9A9692', '#E6E1D8'];
const accBaseMat = acc => acc.kind === 'pelo' ? 'pelo' : ACC_MAT_ID[acc.mat] ? acc.mat : 'tela';
const accShade = (hex, k) => { const c = new THREE.Color(hex); return '#' + (k < 0 ? c.multiplyScalar(1 + k) : c.lerp(new THREE.Color('#FFFFFF'), k)).getHexString(); };
/* volumen: −1 más fino o ajustado … 0 … +1 más grueso o holgado */
const accVolK = acc => Math.pow(2, clamp(num(acc && acc.vol) || 0, -1, 1) * 1.3);
const ACC_VIEWS = [['front', 'Frente'], ['side', 'Lado'], ['top', 'Arriba'], ['back', 'Atrás']];
const ACC_COLORS = ['#2E2B28', '#6B4F3A', '#B0413E', '#2F5D8C', '#3F7D4E', '#D9A441', '#E8E2D6', '#7A6FA8'];
const ACC_N = 44;   // cubitos por lado
const ACC_R = 96;   // resolución de cada silueta

/* trazos simétricos (sy): se agrega su reflejo en el eje del cuerpo (x = 64). Polígonos: ln (bordes rectos) */
function accExpand(strokes) {
  const out = [];
  for (const st of strokes || []) {
    if (!st.sy) { out.push(st); continue; }
    const { sy, ...a } = st; out.push(a);
    out.push({ ...a, p: a.p.map((v, i) => i % 2 ? v : 128 - v) });
  }
  return out;
}
/* silueta de una vista: 1 donde se pintó (los trazos usan el mismo formato que las caras dibujadas) */
function accMask(strokes) {
  strokes = accExpand((strokes || []).filter(st => !st.d));   // los detalles no cambian la forma
  if (!strokes.length) return null;
  const c = document.createElement('canvas'); c.width = c.height = ACC_R;
  const g = c.getContext('2d', { willReadFrequently: true });
  faceStrokes(g, ACC_R, strokes);
  const a = g.getImageData(0, 0, ACC_R, ACC_R).data, m = new Uint8Array(ACC_R * ACC_R);
  let any = 0;
  for (let i = 0; i < m.length; i++) { m[i] = a[i * 4 + 3] > 90 ? 1 : 0; any |= m[i]; }
  return any ? m : null;
}
/* trazos con su propio estilo (los detalles van en colores): hebras = varias líneas finas paralelas */
function accStrokes(g, S, strokes, styleOf) {
  const k = S / 128;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  const path = (p, ox, oy, ln) => {
    g.beginPath(); g.moveTo((p[0] + ox) * k, (p[1] + oy) * k);
    if (ln) for (let i = 2; i < p.length; i += 2) g.lineTo((p[i] + ox) * k, (p[i + 1] + oy) * k);
    else for (let i = 2; i < p.length - 2; i += 2) g.quadraticCurveTo((p[i] + ox) * k, (p[i + 1] + oy) * k, ((p[i] + p[i + 2]) / 2 + ox) * k, ((p[i + 1] + p[i + 3]) / 2 + oy) * k);
    if (!ln) g.lineTo((p[p.length - 2] + ox) * k, (p[p.length - 1] + oy) * k);
  };
  for (const st of accExpand(strokes)) {
    const p = st.p; if (!p || p.length < 2) continue;
    g.globalCompositeOperation = st.e ? 'destination-out' : 'source-over';
    g.strokeStyle = g.fillStyle = styleOf(st); g.lineWidth = st.w * k;
    if (p.length < 4) { g.beginPath(); g.arc(p[0] * k, p[1] * k, st.w * k / 2, 0, Math.PI * 2); g.fill(); continue; }
    if (st.h) {
      // a lo ancho del trazo (perpendicular a su dirección general)
      const dx = p[p.length - 2] - p[0], dy = p[p.length - 1] - p[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      g.lineWidth = Math.max(.7, st.w * k * .2);
      for (const o of [-.4, -.14, .14, .4]) { path(p, nx * o * st.w, ny * o * st.w); g.stroke(); }
      continue;
    }
    path(p, 0, 0, st.ln);
    if (st.f) { g.closePath(); g.fill(); }
    g.stroke();
  }
  g.restore();
}
/* los detalles de una vista: un lienzo con el color y otro con el material de cada píxel (o nada) */
const ACC_DR = 256;
function accDetailMap(strokes) {
  const D = (strokes || []).filter(st => st.d);
  if (!D.some(st => !st.e)) return null;
  const R = ACC_DR, mk = () => { const c = document.createElement('canvas'); c.width = c.height = R; return c; };
  const cv = mk(), mv = mk();
  accStrokes(cv.getContext('2d'), R, D, st => st.c || '#2E2B28');
  accStrokes(mv.getContext('2d'), R, D, st => `rgb(${(ACC_MAT_ID[st.m] || 0) * 60},0,0)`);
  return { cv, mv };
}
function accDetailMaps(acc) {
  const out = {}; let any = false;
  for (const [k] of ACC_VIEWS) { const m = accDetailMap(acc.views && acc.views[k]); if (m) { out[k] = m; any = true; } }
  return any ? out : null;
}
const ACC_FACING = { front: (x, y, z) => z, back: (x, y, z) => -z, side: (x, y, z) => Math.abs(x), top: (x, y, z) => y };
/* las texturas de los detalles (color y material de cada vista dibujada) */
let ACC_NOTEX = null;
function accDetTex(DM) {
  if (!DM) return null;
  const out = {};
  for (const k in DM) {
    const c = new THREE.CanvasTexture(DM[k].cv); c.colorSpace = THREE.SRGBColorSpace; c.generateMipmaps = false; c.minFilter = THREE.LinearFilter;
    const m = new THREE.CanvasTexture(DM[k].mv); m.generateMipmaps = false; m.minFilter = m.magFilter = THREE.NearestFilter;
    out[k] = { c, m };
  }
  return out;
}
/* el retoque del sombreador: cada punto mira su posición y su normal en reposo (aBox, aBN), elige la vista con
   detalles que más lo mira y toma de ahí color y material; de frente se ve de frente y a los lados, y por detrás
   solo lo que se dibujó en «Atrás». Después, el brillo del material: un reflejo dibujado (en escalón, como el
   resto del sombreado) desde una luz que acompaña a la cámara. */
const ACC_DET_MIN = -.35;
const ACC_SH_V = `vAB = aBox; vAN = aBN;`;
const ACC_SH_F0 = 'uniform sampler2D uDF;\nuniform sampler2D uDS;\nuniform sampler2D uDT;\nuniform sampler2D uDB;\nuniform sampler2D uMF;\nuniform sampler2D uMS;\nuniform sampler2D uMT;\nuniform sampler2D uMB;\nuniform vec4 uDH;\nuniform float uBM;\nuniform float uPat;\nuniform vec3 uPC;\nuniform float uPS;\nvarying vec3 vAB;\nvarying vec3 vAN;\nfloat accM;\n' +
  'float accH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }\n' +
  'float accNz(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(mix(accH(i), accH(i + vec3(1., 0., 0.)), f.x), mix(accH(i + vec3(0., 1., 0.)), accH(i + vec3(1., 1., 0.)), f.x), f.y), mix(mix(accH(i + vec3(0., 0., 1.)), accH(i + vec3(1., 0., 1.)), f.x), mix(accH(i + vec3(0., 1., 1.)), accH(i + vec3(1., 1., 1.)), f.x), f.y), f.z); }\n';
/* estampados de las prendas listas (en metros, sobre la posición en reposo): cuadros, camuflaje, rayas y bandas */
const ACC_PATS = { cuadros: 1, camuflaje: 2, rayas: 3, rayas_h: 4, bandas: 5 };
const ACC_SH_F1 = `accM = uBM;
  if (uPat > .5) {
    vec3 pp = vAB * uPS;
    if (uPat < 1.5) {
      float ba = step(.55, fract(pp.y * 6.)), bb = step(.55, fract((pp.x + pp.z * .7) * 6.));
      float th = max(step(.9, fract(pp.y * 24. + .3)), step(.9, fract((pp.x + pp.z * .7) * 24. + .3)));
      diffuseColor.rgb = mix(diffuseColor.rgb, uPC, .55 * (ba + bb));
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * .55, .35 * th);
    } else if (uPat < 2.5) {
      vec3 cc = diffuseColor.rgb;
      cc = mix(cc, uPC, step(.52, accNz(pp * 6. + 3.1)));
      cc = mix(cc, vec3(.33, .27, .19), step(.6, accNz(pp * 7.5 + 17.3)));
      cc = mix(cc, vec3(.09, .1, .08), step(.66, accNz(pp * 9. + 41.7)));
      diffuseColor.rgb = cc;
    } else if (uPat < 3.5) { vec3 n1 = normalize(vAN); diffuseColor.rgb = mix(diffuseColor.rgb, uPC, step(.6, fract((abs(n1.x) > abs(n1.z) ? pp.z : pp.x) * 14.))); }
    else if (uPat < 4.5) diffuseColor.rgb = mix(diffuseColor.rgb, uPC, step(.55, fract(pp.y * 13.)));
    else diffuseColor.rgb = mix(diffuseColor.rgb, uPC, max(step(abs(pp.y - .12), .022), step(abs(pp.y - .26), .022)));
  }
  {
    vec3 n0 = normalize(vAN);
    float fF = uDH.x > .5 ? n0.z : -9.0, fS = uDH.y > .5 ? abs(n0.x) : -9.0, fT = uDH.z > .5 ? n0.y : -9.0, fB = uDH.w > .5 ? -n0.z : -9.0;
    float best = max(max(fF, fS), max(fT, fB));
    if (best > ${ACC_DET_MIN.toFixed(2)}) {
      vec4 d; vec4 mm;
      if (best == fF) { vec2 q = vec2(vAB.x + .5, .5 + vAB.y); d = texture2D(uDF, q); mm = texture2D(uMF, q); }
      else if (best == fS) { vec2 q = vec2(vAB.z + .5, .5 + vAB.y); d = texture2D(uDS, q); mm = texture2D(uMS, q); }
      else if (best == fT) { vec2 q = vec2(vAB.x + .5, .5 - vAB.z); d = texture2D(uDT, q); mm = texture2D(uMT, q); }
      else { vec2 q = vec2(.5 - vAB.x, .5 + vAB.y); d = texture2D(uDB, q); mm = texture2D(uMB, q); }
      diffuseColor.rgb = mix(diffuseColor.rgb, d.rgb, smoothstep(.3, .6, d.a));
      if (mm.a > .5) accM = floor(mm.r * 4.25 + .5);
    }
  }
  if (accM > 1.5 && accM < 2.5) diffuseColor.rgb *= .8;`;
const ACC_SH_F2 = `{
    vec3 accV = normalize(vViewPosition), accL = normalize(vec3(-.35, .6, .72)), accH = normalize(accL + accV);
    float nh = max(dot(normal, accH), 0.);
    float sh = accM < .5 ? 0. : accM < 1.5 ? .2 * smoothstep(.5, .6, pow(nh, 16.)) + .05 * pow(nh, 5.) : accM < 2.5 ? .9 * smoothstep(.45, .55, pow(nh, 36.)) + .22 * pow(nh, 6.) : .16 * smoothstep(.5, .62, pow(nh, 9.));
    outgoingLight += accM > 2.5 ? sh * (diffuseColor.rgb * 2.4 + .05) : vec3(sh);   // el brillo del pelo es de su color
    if (accM > 1.5 && accM < 2.5) outgoingLight = outgoingLight * (.8 + .4 * clamp(normal.y * .5 + .5, 0., 1.)) + .22 * pow(1. - max(dot(normal, accV), 0.), 3.);
  }`;
function accShader(m, DT, bm, pat) {
  if (!ACC_NOTEX) { ACC_NOTEX = new THREE.DataTexture(new Uint8Array(4), 1, 1); ACC_NOTEX.needsUpdate = true; }
  const prev = m.onBeforeCompile, key0 = m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey ? m.customProgramCacheKey() : m.type;
  const D = DT || {}, tx = (k, f) => ({ value: D[k] ? D[k][f] : ACC_NOTEX });
  const U = { uDF: tx('front', 'c'), uDS: tx('side', 'c'), uDT: tx('top', 'c'), uDB: tx('back', 'c'), uMF: tx('front', 'm'), uMS: tx('side', 'm'), uMT: tx('top', 'm'), uMB: tx('back', 'm'),
    uDH: { value: new THREE.Vector4(+!!D.front, +!!D.side, +!!D.top, +!!D.back) }, uBM: { value: bm || 0 },
    uPat: { value: (pat && ACC_PATS[pat.k]) || 0 }, uPC: { value: new THREE.Color((pat && pat.c) || '#222222') }, uPS: { value: (pat && pat.s) || 1 } };
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(m, sh, r);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'attribute vec3 aBox;\nattribute vec3 aBN;\nvarying vec3 vAB;\nvarying vec3 vAN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\t' + ACC_SH_V);
    const out = sh.fragmentShader.includes('#include <opaque_fragment>') ? '#include <opaque_fragment>' : '#include <output_fragment>';
    sh.fragmentShader = ACC_SH_F0 + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n\t' + ACC_SH_F1).replace(out, ACC_SH_F2 + '\n\t' + out);
  };
  m.customProgramCacheKey = () => key0 + '-acc';
  return m;
}
/* el material de un accesorio: el dibujo de siempre (sombreado en escalones), con color y brillo por punto */
function accMaterial(A, skinned, geo, color, bm, pat) {
  const T = THREE, soft = skinned && A && A.fig && A.fig.meta.maniqui;
  const m = new T.MeshToonMaterial({ color, gradientMap: skinned ? (soft ? fig3dGradientSoft() : fig3dGradient()) : toonRamp() });
  if (geo && geo.attributes.color) m.vertexColors = true;   // piezas de dos tonos (cinta del sombrero, lunas de los lentes)
  if (skinned) { m.side = T.DoubleSide; fig3dInflate(m, { uLimb: A.infl.uLimb, uBelly: A.infl.uBelly }, 'fig3d-acc' + (soft ? '-m' : '')); }
  return accShader(m, geo && geo.userData.det, bm, pat);
}
/* el estampado de un accesorio (prendas listas) */
const accPat = acc => acc.pattern && ACC_PATS[acc.pattern] ? { k: acc.pattern, c: acc.color2 || '#222222', s: (ACC_PARTS[acc.part] || ACC_PARTS.cuerpo).s } : null;
const accDisposeMat = m => { for (const x of [].concat(m || [])) if (x && x.dispose) x.dispose(); };
const accDisposeGeo = g => { if (!g) return; const T = g.userData && g.userData.det; if (T) for (const k in T) { T[k].c.dispose(); T[k].m.dispose(); } g.dispose(); };
/* distancia (en píxeles) de cada punto pintado al borde de la silueta */
function accDist(m) {
  const R = ACC_R, d = new Float32Array(R * R);
  for (let i = 0; i < d.length; i++) d[i] = m[i] ? 1e9 : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= R || y >= R) ? 0 : d[y * R + x];
  for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) { const i = y * R + x; if (d[i]) d[i] = Math.min(d[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.414, at(x + 1, y - 1) + 1.414); }
  for (let y = R - 1; y >= 0; y--) for (let x = R - 1; x >= 0; x--) { const i = y * R + x; if (d[i]) d[i] = Math.min(d[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.414, at(x - 1, y + 1) + 1.414); }
  return d;
}
/* de un punto de la caja (−0,5 … 0,5 en cada eje) a la silueta de cada vista */
const ACC_PROJ = {
  front: (x, y, z) => [x + .5, .5 - y],
  back: (x, y, z) => [.5 - x, .5 - y],
  side: (x, y, z) => [z + .5, .5 - y],   // de perfil, mirando hacia la derecha
  top: (x, y, z) => [x + .5, z + .5],    // desde arriba, la cara hacia abajo
};
const accPix = (uv) => { const u = Math.floor(uv[0] * ACC_R), v = Math.floor(uv[1] * ACC_R); return u < 0 || v < 0 || u >= ACC_R || v >= ACC_R ? -1 : v * ACC_R + u; };

/* la superficie del cuerpo vista desde cada lado: para cada píxel de la silueta, qué tan cerca de la
   cámara está la piel (en unidades de la caja). Se saca de los vértices del maniquí en reposo, así no
   hace falta dibujar nada; los huecos entre vértices se rellenan con sus vecinos. */
const ACC_AXIS = { front: 'z', back: 'z', side: 'x', top: 'y' };
const ACC_DEPTH = { front: (x, y, z) => z, back: (x, y, z) => -z, side: (x, y, z) => -x, top: (x, y, z) => y };
const ACC_SURF = new WeakMap();
function accBodySurface(tp, partKey, view) {
  if (!tp) return null;
  let byTp = ACC_SURF.get(tp); if (!byTp) ACC_SURF.set(tp, byTp = {});
  const key = partKey + '|' + view;
  if (byTp[key]) return byTp[key];
  const part = ACC_PARTS[partKey], bi = tp.idx[part.bone]; if (bi === undefined) return null;
  const h = tp.bones[bi].h, c = [h[0] + part.c[0], h[1] + part.c[1], h[2] + part.c[2]], S = part.s, G = 48;
  const m = new Float32Array(G * G).fill(-Infinity), pj = ACC_PROJ[view], dp = ACC_DEPTH[view];
  for (const [name, P] of Object.entries(tp.parts)) {
    if (name.startsWith('pelo') || name === 'cara') continue;
    const a = P.geo.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = (a.getX(i) - c[0]) / S, y = (a.getY(i) - c[1]) / S, z = (a.getZ(i) - c[2]) / S;
      if (Math.abs(x) > .6 || Math.abs(y) > .6 || Math.abs(z) > .6) continue;
      const uv = pj(x, y, z), u = Math.floor(uv[0] * G), v = Math.floor(uv[1] * G);
      if (u < 0 || v < 0 || u >= G || v >= G) continue;
      const d = dp(x, y, z), k = v * G + u; if (d > m[k]) m[k] = d;
    }
  }
  for (let pass = 0; pass < 3; pass++) {
    const src = m.slice();
    for (let v = 0; v < G; v++) for (let u = 0; u < G; u++) {
      const k = v * G + u; if (src[k] > -Infinity) continue;
      let n = 0, mx = -Infinity;
      for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) { const uu = u + du, vv = v + dv; if (uu < 0 || vv < 0 || uu >= G || vv >= G) continue; const w = src[vv * G + uu]; if (w > -Infinity) { n++; if (w > mx) mx = w; } }
      if (n >= 3) m[k] = mx;
    }
  }
  return (byTp[key] = { m, G });
}
/* el volumen: cubitos (con un borde vacío) y luego suavizado.
   Las vistas cuya dirección queda libre (p. ej. solo se dibujó de frente) no se infla en el centro de la
   caja sino sobre la piel del lado que se dibujó: lo dibujado de frente va delante del cuerpo. */
function accVolume(views, partKey = 'cabeza', tp = null, vk = 1) {
  const M = {};
  for (const [k] of ACC_VIEWS) { const m = accMask(views && views[k]); if (m) M[k] = m; }
  if (!Object.keys(M).length) return null;
  const free = { x: !(M.front || M.back || M.top), y: !(M.front || M.back || M.side), z: !(M.side || M.top) };
  const hull = Object.keys(M).filter(k => !free[ACC_AXIS[k]]);
  // capas: cada vista libre arma una almohada apoyada en la piel de su lado (o en el centro si no hay figura)
  const shells = Object.keys(M).filter(k => free[ACC_AXIS[k]]).map(k => {
    const d = accDist(M[k]); let mx = 1; for (const v of d) if (v > mx) mx = v;
    const sf = accBodySurface(tp, partKey, k);
    // donde se dibujó fuera del cuerpo, la capa se apoya a la altura media de la piel bajo el dibujo
    let fb = 0, nb = 0;
    if (sf) for (let i = 0; i < M[k].length; i++) { if (!M[k][i]) continue; const u = i % ACC_R, v = (i / ACC_R) | 0, w = sf.m[((v * sf.G / ACC_R) | 0) * sf.G + ((u * sf.G / ACC_R) | 0)]; if (w > -Infinity) { fb += w; nb++; } }
    fb = nb ? fb / nb : 0;
    return { k, m: M[k], d, mx, sf, fb, pj: ACC_PROJ[k], dp: ACC_DEPTH[k] };
  });
  const N = ACC_N, n = N + 2, f = new Float32Array(n * n * n);
  const inN = .04, minT = 2.5 / N;   // la capa entra un poco en la piel (sin rendijas) y tiene un grosor mínimo que el suavizado no borra
  for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i + .5) / N - .5, y = .5 - (j + .5) / N, z = (k + .5) / N - .5;
    let ok = true;
    for (const key of hull) { const p = accPix(ACC_PROJ[key](x, y, z)); if (p < 0 || !M[key][p]) { ok = false; break; } }
    if (ok && shells.length) {
      let any = false;
      for (const S of shells) {
        const p = accPix(S.pj(x, y, z)); if (p < 0 || !S.m[p]) continue;
        const t = Math.sqrt(Math.max(0, S.d[p] * (2 * S.mx - S.d[p]))) / ACC_R * .8;
        const dd = S.dp(x, y, z);
        if (S.sf) {
          const u = p % ACC_R, v = (p / ACC_R) | 0, w = S.sf.m[((v * S.sf.G / ACC_R) | 0) * S.sf.G + ((u * S.sf.G / ACC_R) | 0)];
          const base = w > -Infinity ? w : S.fb;
          if (dd >= base - inN && dd <= base + Math.max(minT, t * .55 * vk)) { any = true; break; }
        } else if (Math.abs(dd) <= t * vk) { any = true; break; }
      }
      ok = any;
    }
    if (ok) f[(i + 1) + n * ((j + 1) + n * (k + 1))] = 1;
  }
  // suavizado: dos pasadas de promedio 3×3×3 separable (los bordes de cubitos se vuelven curvas)
  const tmp = new Float32Array(f.length);
  const pass = (src, dst, s) => { for (let k = 1; k < n - 1; k++) for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) { const c = i + n * (j + n * k); dst[c] = (src[c - s] + src[c] + src[c + s]) / 3; } };
  for (let r = 0; r < 2; r++) { pass(f, tmp, 1); pass(tmp, f, n); pass(f, tmp, n * n); f.set(tmp); }
  return { f, n };
}
/* superficie (surface nets): un vértice por cubito que la atraviesa y un cuadrado por cada arista cruzada */
function accSurface(f, n, iso = .5) {
  const pos = [], idx = [], vid = new Int32Array(n * n * n).fill(-1);
  const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const EDG = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float32Array(8);
  for (let z = 0; z < n - 1; z++) for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) { const v = f[(x + C[c][0]) + n * ((y + C[c][1]) + n * (z + C[c][2]))]; val[c] = v; if (v > iso) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (const [a, b] of EDG) {
      if (((mask >> a) & 1) === ((mask >> b) & 1)) continue;
      const t = (iso - val[a]) / (val[b] - val[a]);
      sx += C[a][0] + (C[b][0] - C[a][0]) * t; sy += C[a][1] + (C[b][1] - C[a][1]) * t; sz += C[a][2] + (C[b][2] - C[a][2]) * t; cnt++;
    }
    vid[x + n * (y + n * z)] = pos.length / 3;
    pos.push(x + sx / cnt, y + sy / cnt, z + sz / cnt);
  }
  const st = [1, n, n * n];
  for (let z = 1; z < n - 1; z++) for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
    const p = x + n * (y + n * z), inP = f[p] > iso;
    for (let d = 0; d < 3; d++) {
      const q = p + st[d]; if (inP === (f[q] > iso)) continue;
      const u = st[(d + 1) % 3], v = st[(d + 2) % 3];
      const a = vid[p - u - v], b = vid[p - v], c = vid[p], e = vid[p - u];
      if (a < 0 || b < 0 || c < 0 || e < 0) continue;
      if (inP) idx.push(a, b, c, a, c, e); else idx.push(a, c, b, a, e, c);
    }
  }
  return { pos, idx };
}
/* ---------- la ropa dibujada se acomoda al cuerpo ----------
   Cada prenda dibujada recuerda sobre qué tipo de cuerpo se dibujó (acc.fit.b; las de antes, el que tenía la figura al
   cambiarlo). En otro cuerpo (de hombre a niño, por ejemplo), cada punto de la piel nueva busca su punto equivalente en el
   cuerpo del dibujo por referencias del cuerpo: a lo alto entre cadera, cintura, pecho, cuello, mandíbula, ojos y
   coronilla, y a lo ancho y a lo hondo según el ancho y el fondo del cuerpo a esa altura; en brazos y piernas, a lo largo
   de sus huesos (hombro, codo, muñeca y dedos; cadera, rodilla, tobillo y punta del pie) y según su grosor. El dibujo se
   mira en ese punto: un polo dibujado en el adulto sigue siendo un polo en el niño. Las proporciones (hombros, caderas,
   cabeza, extremidades, abdomen) ya las sigue la piel: la prenda se arma sobre el cuerpo en reposo y se dobla con él. */
const ACC_LAND = new WeakMap();
function accLand(tp) {
  let A = ACC_LAND.get(tp); if (A) return A;
  const L = vestLand(tp), H = L.head, g = tp.parts.cuerpo.geo, P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const eye = (tp.meta.eye || [0, H.y1 - .1, 0])[1];
  // a lo alto (de abajo arriba): tobillo, rodilla, cadera, cintura, pecho, cuello, mandíbula, ojos, coronilla
  const V = [L.ankle, L.knee, L.hip, L.waist, L.chest, L.neck, Math.max(L.neck + .02, H.y0), Math.max(L.neck + .04, eye), H.y1];
  for (let i = 1; i < V.length; i++) V[i] = Math.max(V[i], V[i - 1] + .01);
  // ancho y fondo del tronco con el cuello y la cabeza (sin brazos ni piernas), cada 1 cm
  const NB = 240, WX = new Float32Array(NB), Z0 = new Float32Array(NB).fill(9), Z1 = new Float32Array(NB).fill(-9);
  // grosor medio de cada tramo de brazos y piernas (distancia de la piel al hueso)
  const CH = { arm_l: L.arm_l, arm_r: L.arm_r, leg_l: L.leg_l, leg_r: L.leg_r }, RS = {}, RN = {};
  for (const k in CH) { RS[k] = [0, 0, 0]; RN[k] = [0, 0, 0]; }
  for (let i = 0; i < P.count; i++) {
    const w = [0, 0, 0, 0]; for (let k = 0; k < 4; k++) w[L.cls[SI.getComponent(i, k)]] += SW.getComponent(i, k);
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    if (w[0] + w[3] > .6) { const b = Math.round(y * 100); if (b >= 0 && b < NB) { WX[b] = Math.max(WX[b], Math.abs(x)); Z0[b] = Math.min(Z0[b], z); Z1[b] = Math.max(Z1[b], z); } }
    for (const [c, nm] of [[1, 'arm_'], [2, 'leg_']]) if (w[c] > .8) {
      const k = nm + (x >= 0 ? 'l' : 'r'), C = CH[k], sg = Math.max(0, Math.min(2, Math.floor(vestChainT(x, y, z, C))));
      RS[k][sg] += accSegDist([x, y, z], C[sg], C[sg + 1]); RN[k][sg]++;
    }
  }
  for (const k in CH) RS[k] = RS[k].map((v, sg) => RN[k][sg] ? v / RN[k][sg] : .04);
  // huecos (sin puntos a esa altura): el vecino más cercano; después, un suavizado de ±2 cm
  const has = b => Z1[b] > -8;
  for (let b = 0; b < NB; b++) if (!has(b)) for (let d = 1; d < NB; d++) { const q = has(b - d) ? b - d : has(b + d) ? b + d : -1; if (q >= 0 && q < NB) { WX[b] = WX[q]; Z0[b] = Z0[q]; Z1[b] = Z1[q]; break; } }
  const sm = A0 => { const O = new Float32Array(NB); for (let b = 0; b < NB; b++) { let s2 = 0, n = 0; for (let d = -2; d <= 2; d++) if (b + d >= 0 && b + d < NB) { s2 += A0[b + d]; n++; } O[b] = s2 / n; } return O; };
  A = { L, V, WX: sm(WX), Z0: sm(Z0), Z1: sm(Z1), CH, RS, H };
  ACC_LAND.set(tp, A);
  return A;
}
function accSegDist(p, a, b) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const t = clamp((ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2] || 1), 0, 1);
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
}
/* interpolación por tramos (la tabla X, de menor a mayor, a la tabla Y); fuera de la tabla sigue el tramo de la punta */
function accPiece1(X, Y, x) {
  let i = 1; while (i < X.length - 1 && x > X[i]) i++;
  return Y[i - 1] + (x - X[i - 1]) * (Y[i] - Y[i - 1]) / Math.max(1e-4, X[i] - X[i - 1]);
}
/* el cuerpo del dibujo de una prenda (su plantilla), si es otro que el de la figura y ya cargó (si no, se pide) */
function accFitSrc(acc, tp) {
  const b = acc && acc.fit && acc.fit.b; if (!b || !tp || typeof FIG3D === 'undefined') return null;
  const k = fig3dBody(b), S = FIG3D.tpl[k];
  if (!S) { FIG3D.want(k); return null; }
  return S === tp ? null : S;
}
/* para las cachés: con qué cuerpo se acomodó (vacío si es el mismo; con «?» mientras ese cuerpo carga) */
function accFitKey(acc, tp) {
  const b = acc && acc.fit && acc.fit.b; if (!b || !tp || typeof FIG3D === 'undefined') return '';
  const k = fig3dBody(b), S = FIG3D.tpl[k];
  return S === tp ? '' : k + (S ? '' : '?');
}
/* del cuerpo de la figura (T) al del dibujo (S): (x, y, z, pesos por clase de hueso [tronco, brazo, pierna, cabeza]) → punto */
const ACC_FITM = new WeakMap();
function accFitMap(S0, T0) {
  let box = ACC_FITM.get(T0); if (!box) ACC_FITM.set(T0, box = new Map());
  if (box.has(S0)) return box.get(S0);
  const S = accLand(S0), T = accLand(T0);
  const at = (A, y) => { const f = clamp(y * 100, 0, A.WX.length - 1.001), b = Math.floor(f), u = f - b, L = (X) => X[b] * (1 - u) + X[b + 1] * u; const z0 = L(A.Z0), z1 = L(A.Z1); return [L(A.WX), (z0 + z1) / 2, (z1 - z0) / 2]; };
  const trunk = (x, y, z) => { const y2 = accPiece1(T.V, S.V, y), a = at(T, y), b = at(S, y2); return [x * b[0] / Math.max(.01, a[0]), y2, b[1] + (z - a[1]) * b[2] / Math.max(.01, a[2])]; };
  const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  // tramo por tramo: el giro que lleva la dirección del hueso de la figura a la del dibujo (Rodrigues)
  const rot = {};
  for (const k in T.CH) rot[k] = [0, 1, 2].map(sg => {
    const d = (C, i) => { const v = [C[i + 1][0] - C[i][0], C[i + 1][1] - C[i][1], C[i + 1][2] - C[i][2]], l = Math.hypot(...v) || 1; return v.map(q => q / l); };
    const a = d(T.CH[k], sg), b = d(S.CH[k], sg), c = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), ax = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], sn = Math.hypot(...ax);
    return { ax: sn > 1e-6 ? ax.map(q => q / sn) : null, c, s: sn, k: S.RS[k][sg] / Math.max(.005, T.RS[k][sg]) };
  });
  const limb = (k, x, y, z) => {
    const CT = T.CH[k], CS = S.CH[k], t = vestChainT(x, y, z, CT), sg = Math.max(0, Math.min(2, Math.floor(t))), u = t - sg;
    const pT = lerp3(CT[sg], CT[sg + 1], u), pS = lerp3(CS[sg], CS[sg + 1], u), R = rot[k][sg];
    let o = [x - pT[0], y - pT[1], z - pT[2]];
    if (R.ax) { const K = R.ax, kv = K[0] * o[0] + K[1] * o[1] + K[2] * o[2], cx = [K[1] * o[2] - K[2] * o[1], K[2] * o[0] - K[0] * o[2], K[0] * o[1] - K[1] * o[0]]; o = [0, 1, 2].map(j => o[j] * R.c + cx[j] * R.s + K[j] * kv * (1 - R.c)); }
    return [pS[0] + o[0] * R.k, pS[1] + o[1] * R.k, pS[2] + o[2] * R.k];
  };
  const f = (x, y, z, w) => {
    const wt = w[0] + w[3], sd = x >= 0 ? 'l' : 'r'; let X = 0, Y = 0, Z = 0, n = 0;
    const add = (p, k) => { X += p[0] * k; Y += p[1] * k; Z += p[2] * k; n += k; };
    if (wt > 1e-3) add(trunk(x, y, z), wt);
    if (w[1] > 1e-3) add(limb('arm_' + sd, x, y, z), w[1]);
    if (w[2] > 1e-3) add(limb('leg_' + sd, x, y, z), w[2]);
    return n ? [X / n, Y / n, Z / n] : [x, y, z];
  };
  box.set(S0, f);
  return f;
}
/* piezas (casco visual) de un cuerpo a otro: la pieza se corre y se escala con la parte donde va (la cabeza, el pecho,
   la cadera): P en el marco del hueso, del cuerpo del dibujo (S) al de la figura (T) */
function accPieceFit(P, S0, T0, partKey) {
  const S = accLand(S0), T = accLand(T0), part = ACC_PARTS[partKey] || ACC_PARTS.cabeza;
  const bS = S0.bones[S0.idx[part.bone]].h, bT = T0.bones[T0.idx[part.bone]].h;
  // centro y medida de la parte en cada cuerpo
  const frame = (A) => {
    const L = A.L, H = A.H, at = y => { const b = clamp(Math.round(y * 100), 0, A.WX.length - 1); return [A.WX[b], (A.Z0[b] + A.Z1[b]) / 2, Math.max(.02, (A.Z1[b] - A.Z0[b]) / 2)]; };
    if (part.bone === 'head') return { c: [(H.x0 + H.x1) / 2, (H.y0 + H.y1) / 2, (H.z0 + H.z1) / 2], s: [(H.x1 - H.x0) / 2, (H.y1 - H.y0) / 2, (H.z1 - H.z0) / 2] };
    if (part.bone === 'spine_03') { const q = at(L.chest); return { c: [0, L.chest, q[1]], s: [q[0], L.neck - L.waist, q[2]] }; }
    if (partKey === 'cadera') { const q = at(L.hip); return { c: [0, L.hip, q[1]], s: [q[0], L.waist - L.knee, q[2]] }; }
    const q = at(L.chest); return { c: [0, L.hip, q[1]], s: [q[0], H.y1, q[2]] };
  };
  const fS = frame(S), fT = frame(T);
  for (let i = 0; i < P.length; i += 3) for (let j = 0; j < 3; j++) P[i + j] = fT.c[j] - bT[j] + (P[i + j] + bS[j] - fS.c[j]) * fT.s[j] / Math.max(1e-3, fS.s[j]);
}

/* ---------- ropa ----------
   Lo dibujado elige la piel del maniquí que cubre: cada punto lo decide la vista que más lo mira de frente
   (si solo se dibujó de frente, la prenda rodea el cuerpo). Esa piel se copia, se empuja hacia afuera
   según el volumen (ajustada … holgada) y conserva los pesos de los huesos: se dobla con la figura. */
function accClothGeo(acc, tp) {
  const part = ACC_PARTS[acc.part] || ACC_PARTS.torso, bi = tp.idx[part.bone]; if (bi === undefined) return null;
  // prenda lista (polo, pantalón, zapatos…): la piel que cubre la decide su receta, no un dibujo
  const PV = acc.preset && typeof vestCoverage === 'function' ? vestCoverage(acc, tp) : null;
  // dibujada sobre otro tipo de cuerpo: cada punto se mira en el cuerpo del dibujo (y la caja es la de ese cuerpo)
  const src = PV ? null : accFitSrc(acc, tp), fm = src ? accFitMap(src, tp) : null, Lc = fm ? vestLand(tp).cls : null;
  const h = (src || tp).bones[(src || tp).idx[part.bone]].h, c = [h[0] + part.c[0], h[1] + part.c[1], h[2] + part.c[2]], S = part.s;
  const M = {}; if (!PV) for (const [k] of ACC_VIEWS) { const m = accMask(acc.views && acc.views[k]); if (m) M[k] = m; }
  const keys = Object.keys(M); if (!keys.length && !PV) return null;
  const facing = ACC_FACING, hair = acc.kind === 'pelo';
  // ropa: de ~4 mm (ajustada) a ~3,5 cm (holgada); cabello: de ~1 cm a ~5 cm, y se afina hacia el borde
  const t = hair ? .022 * accVolK(acc) : .011 * accVolK(acc) * accVolK(acc);
  // cada vista, suavizada: el borde de la prenda corta los triángulos por donde pasa (dobladillo parejo)
  const B = {};
  for (const k of keys) {
    let m = Float32Array.from(M[k]); const R = ACC_R, tmp = new Float32Array(m.length);
    for (let r = 0; r < 2; r++) {
      for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) { let s2 = 0, n2 = 0; for (let d = -1; d <= 1; d++) { const xx = x + d; if (xx >= 0 && xx < R) { s2 += m[y * R + xx]; n2++; } } tmp[y * R + x] = s2 / n2; }
      for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) { let s2 = 0, n2 = 0; for (let d = -1; d <= 1; d++) { const yy = y + d; if (yy >= 0 && yy < R) { s2 += tmp[yy * R + x]; n2++; } } m[y * R + x] = s2 / n2; }
    }
    B[k] = m;
  }
  // cabello: el grosor crece desde el borde (pegado a la piel) hacia el centro, redondeado
  const HD = {}; if (hair) for (const k of keys) HD[k] = accDist(M[k]);
  const sample = (m, uv) => {   // bilineal
    const R = ACC_R, x = uv[0] * R - .5, y = uv[1] * R - .5, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const at = (xx, yy) => xx < 0 || yy < 0 || xx >= R || yy >= R ? 0 : m[yy * R + xx];
    return at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy;
  };
  const P = [], N = [], SI = [], SW = [], IN = [], BX = [], idx = [];
  for (const [name, Pt] of Object.entries(tp.parts)) {
    if (name.startsWith('pelo') || name === 'cara') continue;
    const g = Pt.geo, A = g.attributes, pos = A.position, nr = A.normal, n = pos.count, inf = A.aInfl;
    if (!g.index || !A.skinIndex) continue;
    const fv = PV ? PV[name] : new Float32Array(n), fd = hair ? new Float32Array(n) : null;
    if (!fv) continue;
    // el punto equivalente en el cuerpo del dibujo (o el mismo)
    const Q = fm ? new Float32Array(n * 3) : null;
    if (Q) for (let i = 0; i < n; i++) {
      const w = [0, 0, 0, 0]; for (let k = 0; k < 4; k++) w[Lc[A.skinIndex.getComponent(i, k)]] += A.skinWeight.getComponent(i, k);
      const q = fm(pos.getX(i), pos.getY(i), pos.getZ(i), w); Q[i * 3] = q[0]; Q[i * 3 + 1] = q[1]; Q[i * 3 + 2] = q[2];
    }
    const qx = i => Q ? Q[i * 3] : pos.getX(i), qy = i => Q ? Q[i * 3 + 1] : pos.getY(i), qz = i => Q ? Q[i * 3 + 2] : pos.getZ(i);
    if (!PV) for (let i = 0; i < n; i++) {
      const nx = nr.getX(i), ny = nr.getY(i), nz = nr.getZ(i);
      let best = keys[0], bf = -9; for (const k of keys) { const fa = facing[k](nx, ny, nz); if (fa > bf) { bf = fa; best = k; } }
      const uv = ACC_PROJ[best]((qx(i) - c[0]) / S, (qy(i) - c[1]) / S, (qz(i) - c[2]) / S);
      fv[i] = sample(B[best], uv);
      if (hair) fd[i] = sample(HD[best], uv);
    }
    // un punto nuevo: sobre la arista de i (adentro) a o (afuera), donde el borde la cruza
    const map = new Int32Array(n).fill(-1), cut = new Map(), ix = g.index.array;
    const put = (px, py, pz, nx, ny, nz, si, inf0, inf1, f, bx, by, bz) => {
      const l = Math.hypot(nx, ny, nz) || 1, tt = hair ? Math.max(.003, t * Math.sqrt(Math.min(1, f / 7))) : t;
      P.push(px + nx / l * tt, py + ny / l * tt, pz + nz / l * tt); N.push(nx / l, ny / l, nz / l);
      BX.push((bx - c[0]) / S, (by - c[1]) / S, (bz - c[2]) / S);   // donde mira los detalles: en el cuerpo del dibujo
      SI.push(A.skinIndex.getX(si), A.skinIndex.getY(si), A.skinIndex.getZ(si), A.skinIndex.getW(si));
      SW.push(A.skinWeight.getX(si), A.skinWeight.getY(si), A.skinWeight.getZ(si), A.skinWeight.getW(si));
      IN.push(inf0, inf1);
      return P.length / 3 - 1;
    };
    const vtx = v => map[v] >= 0 ? map[v] : (map[v] = put(pos.getX(v), pos.getY(v), pos.getZ(v), nr.getX(v), nr.getY(v), nr.getZ(v), v, inf ? inf.getX(v) : 0, inf ? inf.getY(v) : 0, hair ? fd[v] : 0, qx(v), qy(v), qz(v)));
    const edge = (i, o) => {
      const key = i < o ? i * n + o : o * n + i;
      if (cut.has(key)) return cut.get(key);
      const u = clamp((fv[i] - .5) / ((fv[i] - fv[o]) || 1), 0, 1), L = (p, q) => p + (q - p) * u;
      const r = put(L(pos.getX(i), pos.getX(o)), L(pos.getY(i), pos.getY(o)), L(pos.getZ(i), pos.getZ(o)), L(nr.getX(i), nr.getX(o)), L(nr.getY(i), nr.getY(o)), L(nr.getZ(i), nr.getZ(o)), i,
        inf ? L(inf.getX(i), inf.getX(o)) : 0, inf ? L(inf.getY(i), inf.getY(o)) : 0, 0, L(qx(i), qx(o)), L(qy(i), qy(o)), L(qz(i), qz(o)));
      cut.set(key, r); return r;
    };
    for (let f = 0; f < ix.length; f += 3) {
      const tri = [ix[f], ix[f + 1], ix[f + 2]], inn = tri.map(v => fv[v] > .5), k = inn.filter(Boolean).length;
      if (!k) continue;
      if (k === 3) { idx.push(vtx(tri[0]), vtx(tri[1]), vtx(tri[2])); continue; }
      // se gira el triángulo (sin cambiar su orientación) para que el caso quede en una forma fija
      let r = 0; while (!(k === 1 ? inn[r] : !inn[(r + 2) % 3])) r++;
      const [a, b, d] = [tri[r], tri[(r + 1) % 3], tri[(r + 2) % 3]];
      if (k === 1) idx.push(vtx(a), edge(a, b), edge(a, d));                 // solo a adentro
      else { const ab = vtx(a), bb = vtx(b), bd = edge(b, d), ad = edge(a, d); idx.push(ab, bb, bd, ab, bd, ad); }   // a y b adentro, d afuera
    }
  }
  if (!idx.length) return null;
  const T = THREE, geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
  geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(SI, 4));
  geo.setAttribute('skinWeight', new T.Float32BufferAttribute(SW, 4));
  geo.setAttribute('aInfl', new T.Float32BufferAttribute(IN, 2));
  geo.setAttribute('aBox', new T.Float32BufferAttribute(BX, 3));
  geo.setAttribute('aBN', new T.Float32BufferAttribute(N, 3));
  geo.setIndex(idx);
  geo.userData.cloth = true;
  geo.userData.det = accDetTex(accDetailMaps(acc));
  return geo;
}
/* la prenda en una figura: malla con piel (los mismos huesos), su color y el contorno de la figura */
function accClothMesh(A, geo, acc) {
  const T = THREE, g = new T.Group();
  const m = new T.SkinnedMesh(geo, accMaterial(A, true, geo, acc.color || ACC_COLORS[0], ACC_MAT_ID[accBaseMat(acc)], accPat(acc))), o = new T.SkinnedMesh(geo, A.outline);
  for (const x of [m, o]) { x.bind(A.skeleton, new T.Matrix4()); x.frustumCulled = false; x.boundingSphere = new T.Sphere(new T.Vector3(0, .9, 0), 2.4); }
  m.castShadow = m.receiveShadow = true; o.userData.ol = true;
  g.add(o); g.add(m);
  return g;
}
/* la geometría del accesorio en el marco del hueso donde va (metros) */
const ACC_GEO = new Map();
function accBuild(acc, tp) {
  const part = ACC_PARTS[acc.part] || ACC_PARTS.cabeza;
  if (acc.preset && typeof vestBuild === 'function') return tp ? vestBuild(acc, tp) : null;
  if (acc.kind === 'ropa' || acc.kind === 'pelo') return tp ? accClothGeo(acc, tp) : null;
  const vk = accVolK(acc), src = accFitSrc(acc, tp);
  const V = accVolume(acc.views, ACC_PARTS[acc.part] ? acc.part : 'cabeza', src || tp, vk);
  if (!V) return null;
  // el volumen también engorda o adelgaza lo que sale del casco visual (umbral más bajo = más grande)
  const { pos, idx } = accSurface(V.f, V.n, clamp(.5 - Math.log2(vk) * .09, .38, .62));
  if (!idx.length) return null;
  // del cubito (con borde) a la caja del hueso
  const N = ACC_N, S = part.s, c = part.c, P = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    P[i] = c[0] + ((pos[i] - 1 + .5) / N - .5) * S;
    P[i + 1] = c[1] + (.5 - (pos[i + 1] - 1 + .5) / N) * S;
    P[i + 2] = c[2] + ((pos[i + 2] - 1 + .5) / N - .5) * S;
  }
  // dibujada sobre otro tipo de cuerpo: se corre y se escala con su parte del cuerpo
  if (src) accPieceFit(P, src, tp, ACC_PARTS[acc.part] ? acc.part : 'cabeza');
  // el eje y se invirtió: se da vuelta el sentido de los triángulos para que miren hacia afuera
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  // dos pasadas de suavizado (cada vértice se acerca al promedio de sus vecinos)
  const nb = Array.from({ length: P.length / 3 }, () => new Set());
  for (let i = 0; i < idx.length; i += 3) { const [a, b, d] = [idx[i], idx[i + 1], idx[i + 2]]; nb[a].add(b).add(d); nb[b].add(a).add(d); nb[d].add(a).add(b); }
  const Q = new Float32Array(P.length);
  for (let it = 0; it < 2; it++) {
    for (let v = 0; v < nb.length; v++) {
      let sx = 0, sy = 0, sz = 0, k = 0;
      for (const w of nb[v]) { sx += P[w * 3]; sy += P[w * 3 + 1]; sz += P[w * 3 + 2]; k++; }
      if (!k) { Q.set(P.subarray(v * 3, v * 3 + 3), v * 3); continue; }
      Q[v * 3] = P[v * 3] * .5 + sx / k * .5; Q[v * 3 + 1] = P[v * 3 + 1] * .5 + sy / k * .5; Q[v * 3 + 2] = P[v * 3 + 2] * .5 + sz / k * .5;
    }
    P.set(Q);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // posición en la caja y normal de cada punto: con eso el sombreador pinta los detalles
  const nv = P.length / 3, BX = new Float32Array(nv * 3);
  for (let v = 0; v < nv * 3; v++) BX[v] = (P[v] - c[v % 3]) / S;
  g.setAttribute('aBox', new THREE.BufferAttribute(BX, 3));
  g.setAttribute('aBN', g.attributes.normal);
  g.userData.det = accDetTex(accDetailMaps(acc));
  g.computeBoundingSphere();
  return g;
}
const ACC_GEOT = new WeakMap();   // una caché por cuerpo (la piel cambia de un cuerpo a otro)
function accGeo(acc, tp) {
  const key = acc.id + '|' + (acc.v || 0) + '|' + acc.part + '|' + (acc.kind || '') + '|' + (acc.vol || 0) + '|' + (acc.color || '') + '|' + (acc.mat || '') + '|' + (acc.preset || '') + '|' + accFitKey(acc, tp);
  const box = tp ? (ACC_GEOT.get(tp) || (ACC_GEOT.set(tp, new Map()), ACC_GEOT.get(tp))) : ACC_GEO;
  if (box.has(key)) return box.get(key);
  const g = accBuild(acc, tp);
  if (g) g.userData.shared = true;
  box.set(key, g);
  return g;
}
/* pone en la figura articulada los accesorios de su apariencia (solo se rehace si cambiaron) */
function fig3dAcc(A, look) {
  const list = ((look && look.acc) || []).filter(a => a && ACC_PARTS[a.part] && !a.hide);
  // con cabello dibujado, el peinado de la figura no se muestra (se repite en cada cuadro: el vestuario lo vuelve a poner)
  if (A.meshes && list.some(a => a.kind === 'pelo')) for (const k in A.meshes) if (k.startsWith('pelo_')) A.meshes[k].g.visible = false;
  const sig = list.map(a => a.id + ':' + (a.v || 0) + ':' + a.color + ':' + a.part + ':' + (a.kind || '') + ':' + (a.vol || 0) + ':' + (a.mat || '') + ':' + (a.preset || '') + ':' + (a.pattern || '') + ':' + (a.color2 || '') + ':' + accFitKey(a, A.fig)).join('|');
  if (A.accSig === sig) return;
  A.accSig = sig;
  for (const o of A.accObjs || []) { o.parent && o.parent.remove(o); o.traverse(m => { if (m.isMesh && m.material && !m.userData.ol) accDisposeMat(m.material); }); }
  A.accObjs = [];
  for (const a of list) {
    const geo = accGeo(a, A.fig); if (!geo) continue;
    if (a.kind === 'ropa' || a.kind === 'pelo') { const g = accClothMesh(A, geo, a); A.body.add(g); A.accObjs.push(g); continue; }
    const g = new THREE.Group(), m = new THREE.Mesh(geo, accMaterial(A, false, geo, a.color || ACC_COLORS[0], ACC_MAT_ID[accBaseMat(a)], accPat(a)));
    m.castShadow = m.receiveShadow = true; g.add(m); outlineAll(g);
    const b = A.bone(ACC_PARTS[a.part].bone); if (!b) continue;
    b.add(g); A.accObjs.push(g);
  }
}

/* al cambiar el tipo de cuerpo de una figura: las prendas dibujadas que todavía no sabían sobre qué cuerpo se dibujaron
   (las de antes) quedan con el que tenía la figura, así se siguen viendo igual y se acomodan al nuevo */
const accFitStamp = (list, body) => (list || []).map(a => a && !a.preset && !a.fit && body ? { ...a, fit: { b: body } } : a);

/* ---------- el editor ----------
   Una ventana sobre el editor del plano: a la izquierda la vista para dibujar (con la figura detrás,
   tenue), a la derecha el resultado en 3D, que gira solo o con el dedo. */
function openAccEditor({ look, acc, onSave, kind }) {
  const T = THREE, body = fig3dBody(look.body);
  // una prenda dibujada sobre otro tipo de cuerpo se sigue dibujando sobre ese (la figura la lleva acomodada)
  const srcB = (acc && acc.fit && acc.fit.b) || look.body, other = fig3dBody(srcB) !== body;
  if (!r3Init() || !FIG3D.has(body) || !FIG3D.has(srcB)) { FIG3D.want(body); FIG3D.want(srcB); toast('Espera a que cargue la figura 3D y vuelve a intentarlo.'); return; }
  const a = acc ? JSON.parse(JSON.stringify(acc)) : { id: uid('a'), name: '', part: kind === 'ropa' ? 'cuerpo' : 'cabeza', color: kind === 'ropa' ? ACC_COLORS[3] : ACC_COLORS[0], views: {}, v: 0, ...(kind === 'ropa' ? { kind: 'ropa' } : {}) };
  a.views = a.views || {};
  // herramientas de precisión: simetría y guías del cuerpo (de entrada en la ropa), zoom con desplazamiento, polígono
  const tool = { t: 'fill', w: 6, sym: a.kind === 'ropa', guides: a.kind === 'ropa' };
  const Z = { z: 1, cx: 64, cy: 64 };
  let poly = null, hover = null, panning = null, space = false;
  const redo = [];
  let view = 'front', layer = 'forma';
  // detalle: color y material de lo que se pinta encima (parte más oscuro que la base, en tela; en el cabello, mechones)
  const det = { c: accShade(a.color || ACC_COLORS[0], -.35), m: a.kind === 'pelo' ? 'pelo' : 'tela' };
  // figura de referencia: quieta, en la postura de reposo, con sus otros accesorios
  const lookRef = { ...look, acc: (look.acc || []).filter(x => x.id !== a.id) };
  const A = makeFigActor(lookRef);
  // la figura de referencia para dibujar: la del cuerpo del dibujo (si es otro, el resultado se ve en la figura)
  const lookSrc = other ? { ...lookRef, body: srcB } : lookRef, R = other ? makeFigActor(lookSrc) : A;
  // para dibujar cabello, la cabeza se ve sin el peinado de la figura
  const syncRef = () => {
    for (const [F, lk] of other ? [[A, lookRef], [R, lookSrc]] : [[A, lookRef]]) {
      fig3dColors(F, lk); fig3dScale(F, lk); fig3dAcc(F, lk);
      if (a.kind === 'pelo') for (const k in F.meshes) if (k.startsWith('pelo_')) F.meshes[k].g.visible = false;
    }
  };
  syncRef();
  const scene = new T.Scene(); scene.background = new T.Color('#F4F1EC');
  scene.add(new T.HemisphereLight(0xffffff, 0xb3ada0, 2.2));
  const sun = new T.DirectionalLight(0xffffff, 1.4); sun.position.set(-2, 5, 4); scene.add(sun);
  scene.add(A.root); A.blob.visible = false; A.root.updateMatrixWorld(true);
  if (other) { scene.add(R.root); R.blob.visible = false; R.root.visible = false; R.root.updateMatrixWorld(true); }
  let prevMesh = null;
  const boxOf = (F = R) => {
    const part = ACC_PARTS[a.part], b = F.bone(part.bone);
    const c = b.localToWorld(new T.Vector3(...part.c)), s = part.s * b.getWorldScale(new T.Vector3()).x;
    return { c, s, b };
  };
  const ocam = new T.OrthographicCamera(-1, 1, 1, -1, .01, 20);
  const refs = {};
  const render = (cam, W, H) => {
    if (R3.w !== W || R3.h !== H) { R3.r.setSize(W, H, false); R3.w = W; R3.h = H; }
    R3.r.setViewport(0, 0, W, H);
    if (typeof STY !== 'undefined' && STY.px) STY.px.value = Math.max(1, H / 540) / H;
    R3.r.shadowMap.needsUpdate = true; R3.shSig = null;
    R3.r.render(scene, cam);
    return R3.r.domElement;
  };
  const refImg = k => {
    if (refs[k]) return refs[k];
    const { c, s } = boxOf(), h = s / 2, D = { front: [0, 0, 3], back: [0, 0, -3], side: [-3, 0, 0], top: [0, 3, 0] }[k];
    ocam.left = -h; ocam.right = h; ocam.top = h; ocam.bottom = -h; ocam.updateProjectionMatrix();
    ocam.up.set(0, k === 'top' ? 0 : 1, k === 'top' ? -1 : 0);
    ocam.position.set(c.x + D[0], c.y + D[1], c.z + D[2]); ocam.lookAt(c);
    if (prevMesh) prevMesh.visible = false;   // la referencia es la figura sola
    if (other) { A.root.visible = false; R.root.visible = true; }
    const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
    cv.getContext('2d').drawImage(render(ocam, 1024, 1024), 0, 0, 1024, 1024);
    if (other) { A.root.visible = true; R.root.visible = false; }
    if (prevMesh) prevMesh.visible = true;
    return (refs[k] = cv);
  };
  const ov = document.createElement('div');
  ov.className = 'acc-ed'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Dibujar un accesorio');
  ov.innerHTML = `<div class="acc-card">
    <div class="acc-hd"><b>${acc ? 'Editar' : 'Dibujar'} ${a.kind === 'ropa' ? 'ropa' : 'accesorio'}</b><input class="acc-name" maxlength="28" placeholder="Nombre (p. ej. Sombrero)" value="${esc(a.name)}"><button class="acc-x" data-a="cancel" aria-label="Cerrar">${ICO.close}</button></div>
    <div class="acc-body">
      <div class="acc-draw">
        <div class="acc-top"><div class="acc-tabs" role="tablist">${ACC_VIEWS.map(([k, n]) => `<button role="tab" data-v="${k}" aria-selected="${ea(k === view)}">${n}<i></i></button>`).join('')}</div>
          <div class="seg acc-layer" role="group" aria-label="Capa"><button data-l="forma" aria-pressed="true" title="Forma: lo que cubre la pieza">Forma</button><button data-l="detalle" aria-pressed="false" title="Detalle: colores y materiales encima (costuras, parches, hebillas, mechones)">Detalle</button></div></div>
        <canvas class="acc-c" width="512" height="512" aria-label="Vista para dibujar"></canvas>
        <div class="acc-tools" role="toolbar" aria-label="Herramientas">
          <button data-t="fill" aria-pressed="true" title="Contorno: dibuja el borde y se rellena" aria-label="Contorno"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 17c-2.5-3-1.5-9 4-11s10 1 9 6-6 7-10 7c-1.3 0-2.2-.6-3-2z" fill="currentColor" fill-opacity=".25"/></svg></button>
          <button data-t="pen" data-w="2" title="Pincel muy fino (costuras, líneas)" class="acc-dt"><i style="--d:3px"></i></button><button data-t="pen" data-w="4" title="Pincel fino"><i style="--d:5px"></i></button><button data-t="pen" data-w="8" title="Pincel medio"><i style="--d:9px"></i></button><button data-t="pen" data-w="14" title="Pincel grueso"><i style="--d:14px"></i></button>
          <button data-t="line" title="Línea recta (correas, costuras, bordes). Mayús: horizontal, vertical o a 45°" aria-label="Línea recta"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5"/></svg></button>
          <button data-t="poly" title="Polígono: un clic por esquina; se cierra tocando el primer punto, con doble clic o Intro (bordes rectos y precisos: cuellos, bastas, bolsillos). Retroceso quita el último punto; Esc lo cancela. Mayús: ángulos rectos o a 45°" aria-label="Polígono"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18 8 6l9 3 2 9z" fill="currentColor" fill-opacity=".18"/><circle cx="5" cy="18" r="1.6" fill="currentColor"/><circle cx="8" cy="6" r="1.6" fill="currentColor"/><circle cx="17" cy="9" r="1.6" fill="currentColor"/><circle cx="19" cy="18" r="1.6" fill="currentColor"/></svg></button>
          <button data-t="hair" class="acc-dt" title="Hebras: varias líneas finas a la vez (mechones, textura de tela)" aria-label="Hebras"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20c2-6 3-11 7-16M9 20c1.5-5 2.5-9 6-14M13 20c1-4 2-7 5-11"/></svg></button>
          <button data-t="erase" title="Borrador (solo en la capa elegida)" aria-label="Borrador"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 20h12M5.5 14.5 14 6l5 5-8.5 8.5H8z"/></svg></button>
          <i class="sep"></i>
          <button data-x="sym" aria-pressed="${ea(tool.sym)}" title="Simetría: lo que dibujas en un lado aparece reflejado en el otro (de frente, atrás y desde arriba)" aria-label="Simetría"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18" stroke-dasharray="2 2.4"/><path d="M9 7 4 12l5 5M15 7l5 5-5 5"/></svg></button>
          <button data-x="guides" aria-pressed="${ea(tool.guides)}" title="Guías del cuerpo: cuello, hombros, pecho, cintura, cadera, codos, muñecas, rodillas y tobillos" aria-label="Guías del cuerpo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 10h16M4 15h16M4 19h16" stroke-dasharray="2.2 2"/></svg></button>
          <i class="sep"></i>
          <button data-x="zout" title="Alejar (rueda del ratón)" aria-label="Alejar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4M8 11h6"/></svg></button><button data-x="zfit" class="acc-zl" title="Ver todo (para desplazarte con zoom: arrastra con la barra espaciadora o el botón derecho)">100 %</button><button data-x="zin" title="Acercar (rueda del ratón)" aria-label="Acercar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4M8 11h6M11 8v6"/></svg></button>
          <i class="sep"></i>
          <button data-x="undo" title="Deshacer el último trazo de esta capa" aria-label="Deshacer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></button><button data-x="redo" title="Rehacer" aria-label="Rehacer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg></button>
          <button data-x="clear" title="Borrar esta capa en esta vista" aria-label="Limpiar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9.5 7V4.5h5V7"/></svg></button>
        </div>
        <p class="hint acc-hint"></p>
        ${other ? `<p class="hint acc-fit">Dibujada sobre el cuerpo de ${esc((S3_BODY[srcB] || {}).name || srcB)}: en esta figura (${esc((S3_BODY[look.body] || {}).name || look.body)}) se acomoda sola.</p>` : ''}
      </div>
      <div class="acc-side">
        <canvas class="acc-p" width="440" height="440" aria-label="Resultado en 3D: arrástralo para girarlo"></canvas>
        <div class="fld"><span>Tipo</span><div class="seg acc-kind" role="group" aria-label="Tipo"><button data-k="pieza" title="Sombrero, lentes, mochila: una pieza firme pegada a la cabeza, el torso o la cadera">Pieza</button><button data-k="ropa" title="Camisa, falda, chaqueta: se pega a la piel y se dobla con el cuerpo">Ropa</button><button data-k="pelo" title="Cabello: una capa sobre la cabeza, gruesa al centro y fina en el borde">Cabello</button></div></div>
        <label class="fld"><span>Va en</span><select class="acc-part">${Object.entries(ACC_PARTS).map(([k, p]) => `<option value="${k}" ${k === a.part ? 'selected' : ''}>${p.name}</option>`).join('')}</select></label>
        <label class="fld acc-vol"><span class="acc-vl"></span><input type="range" min="-100" max="100" step="5" value="${Math.round((num(a.vol) || 0) * 100)}" aria-label="Volumen"></label>
        <div class="fld acc-matf"><span class="acc-ml">Material</span><div class="seg acc-mat" role="group" aria-label="Material"></div></div>
        <div class="fld"><span class="acc-cl">Color</span><div class="sws"></div></div>

      </div>
    </div>
    <div class="acc-ft"><button class="btn" data-a="cancel">Cancelar</button><button class="btn primary" data-a="save">${acc ? 'Guardar' : 'Agregar a la figura'}</button></div>
  </div>`;
  document.body.appendChild(ov);
  const a0 = JSON.stringify(a);
  const cv = ov.querySelector('.acc-c'), g = cv.getContext('2d'), pv = ov.querySelector('.acc-p'), pg = pv.getContext('2d');
  const HINT = { front: 'De frente: dibuja la silueta tal como se ve mirando a la figura.', side: 'De lado: la figura mira hacia la derecha.', top: 'Desde arriba: la cara de la figura queda abajo.', back: 'Desde atrás (opcional): solo si por detrás es distinto.' };
  // vista con zoom: unidades de 0 a 128 → píxeles del lienzo (faceStrokes y accStrokes ya escalan por S/128)
  const zK = () => cv.width / 128 * Z.z;
  const zSet = c => { const S = cv.width, k = zK(); c.setTransform(Z.z, 0, 0, Z.z, S / 2 - Z.cx * k, S / 2 - Z.cy * k); };
  const zClamp = () => { const h = 64 / Z.z; Z.cx = clamp(Z.cx, h, 128 - h); Z.cy = clamp(Z.cy, h, 128 - h); };
  // guías del cuerpo: alturas de cuello, hombros, pecho… en la figura de referencia (en esta vista)
  // [nombre, hueso, al lado derecho] (codos y muñecas a la derecha: con los brazos abajo quedan cerca del pecho y la cadera)
  const GUIDES = [['Cuello', 'neck_01'], ['Hombros', 'upperarm_r'], ['Pecho', 'spine_03'], ['Codos', 'lowerarm_r', 1], ['Cintura', 'spine_01'], ['Cadera', 'thigh_r'], ['Muñecas', 'hand_r', 1], ['Rodillas', 'calf_r'], ['Tobillos', 'foot_r']];
  const guidesFor = k => {
    if (refs['g:' + k]) return refs['g:' + k];
    const { c, s: sz } = boxOf(), h = sz / 2, out = [];
    if (k !== 'top') for (const [n, bn, rt] of GUIDES) { const B = R.bone(bn); if (!B) continue; const w = B.getWorldPosition(new T.Vector3()), v = 64 - (w.y - c.y) / h * 64; if (v > 1 && v < 127) out.push([n, v, rt]); }
    return (refs['g:' + k] = out);
  };
  const paint = () => {
    const S = cv.width;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, S, S);
    g.fillStyle = '#F4F1EC'; g.fillRect(0, 0, S, S);
    zSet(g); g.globalAlpha = .6; g.drawImage(refImg(view), 0, 0, S, S); g.globalAlpha = 1;
    const all = a.views[view] || [], st = accExpand(all.filter(x => !x.d)), dt = all.filter(x => x.d);
    const m = document.createElement('canvas'); m.width = m.height = S;
    const mg = m.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (st.length) {
      zSet(mg); faceStrokes(mg, S, st); mg.setTransform(1, 0, 0, 1, 0, 0);
      mg.globalCompositeOperation = 'source-in'; mg.fillStyle = a.color; mg.fillRect(0, 0, S, S);
      g.globalAlpha = layer === 'detalle' ? .9 : .78; g.drawImage(m, 0, 0); g.globalAlpha = 1;
    }
    if (dt.length) {
      const d = document.createElement('canvas'); d.width = d.height = S;
      const dg = d.getContext('2d'); zSet(dg);
      accStrokes(dg, S, dt, x => x.c || '#2E2B28'); dg.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = .28; g.drawImage(d, 0, 0); g.globalAlpha = 1;   // fuera de la forma no se ve en 3D
      if (st.length) { dg.globalCompositeOperation = 'destination-in'; dg.drawImage(m, 0, 0); g.drawImage(d, 0, 0); }
    }
    // encima: guías, eje de simetría y el polígono en curso
    const k = zK(), ox = S / 2 - Z.cx * k, oy = S / 2 - Z.cy * k, X = u => u * k + ox, Y = v => v * k + oy;
    g.save(); g.lineCap = 'round';
    if (tool.guides) {
      g.strokeStyle = 'rgba(37,118,226,.5)'; g.fillStyle = 'rgba(37,118,226,.85)'; g.lineWidth = 1; g.setLineDash([5, 5]);
      g.font = '600 12px system-ui, sans-serif'; g.textBaseline = 'bottom';
      for (const [n, v, rt] of guidesFor(view)) { const y = Y(v); if (y < -2 || y > S + 2) continue; g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); g.textAlign = rt ? 'right' : 'left'; g.fillText(n, rt ? S - 6 : 6, y - 2); }
      g.textAlign = 'left';
      if (view !== 'side') { g.strokeStyle = 'rgba(37,118,226,.32)'; g.beginPath(); g.moveTo(X(64), 0); g.lineTo(X(64), S); g.stroke(); }
      g.setLineDash([]);
    }
    if (tool.sym && view !== 'side') { g.strokeStyle = 'rgba(214,92,40,.75)'; g.lineWidth = 1.4; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(X(64), 0); g.lineTo(X(64), S); g.stroke(); g.setLineDash([]); }
    if (poly) {
      const pts = poly.concat(hover || []);
      g.strokeStyle = '#D65C28'; g.lineWidth = 2; g.fillStyle = 'rgba(214,92,40,.12)';
      g.beginPath(); for (let i = 0; i < pts.length; i += 2) i ? g.lineTo(X(pts[i]), Y(pts[i + 1])) : g.moveTo(X(pts[i]), Y(pts[i + 1]));
      if (pts.length >= 6) g.fill(); g.stroke();
      if (tool.sym && view !== 'side') { g.setLineDash([4, 4]); g.beginPath(); for (let i = 0; i < pts.length; i += 2) i ? g.lineTo(X(128 - pts[i]), Y(pts[i + 1])) : g.moveTo(X(128 - pts[i]), Y(pts[i + 1])); g.stroke(); g.setLineDash([]); }
      g.fillStyle = '#FFFFFF';
      for (let i = 0; i < poly.length; i += 2) { g.beginPath(); g.arc(X(poly[i]), Y(poly[i + 1]), i ? 3.5 : 6, 0, Math.PI * 2); g.fill(); g.stroke(); }
    }
    g.restore();
    const zl = ov.querySelector('.acc-zl'); if (zl) zl.textContent = Math.round(Z.z * 100) + ' %';
    ov.querySelectorAll('.acc-tabs [data-v]').forEach(b => { b.setAttribute('aria-selected', b.dataset.v === view); b.classList.toggle('has', !!(a.views[b.dataset.v] || []).length); });
    ov.querySelector('.acc-hint').textContent = layer === 'detalle'
      ? (a.kind === 'pelo' ? 'Detalle: pinta mechones con «Hebras» o reflejos en un tono más claro. Solo se ve sobre el cabello.' : 'Detalle: pinta costuras, parches, botones o hebillas con su material. Solo se ve sobre la forma.')
      : a.kind === 'ropa' ? { front: 'Ropa de frente: dibuja el contorno de la prenda sobre el cuerpo. Con Simetría basta un lado; con Polígono los bordes quedan rectos.', side: 'Ropa de lado: la figura mira a la derecha; marca lo que sobresale (cuello, faldón, bolsillos).', top: 'Desde arriba: opcional, para cuellos o capuchas (la cara queda abajo).', back: 'Atrás: solo si por detrás es distinta (escote, capucha, largo).' }[view]
      : a.kind === 'pelo' ? { front: 'De frente: pinta el cabello alrededor de la cara (deja la cara libre).', side: 'De lado: el cabello sobre la oreja y la nuca.', top: 'Desde arriba: la coronilla (la cara queda abajo).', back: 'Desde atrás: la nuca; para pelo largo elige «Cabeza y espalda».' }[view] : HINT[view];
  };
  // el resultado en 3D: se rearma al terminar cada trazo
  let rebuildT = 0;
  const rebuild = () => {
    clearTimeout(rebuildT);
    rebuildT = setTimeout(() => {
      if (prevMesh) { prevMesh.parent && prevMesh.parent.remove(prevMesh); prevMesh.traverse(o => { if (o.isMesh) { accDisposeGeo(o.geometry); if (!o.userData.ol) accDisposeMat(o.material); } }); prevMesh = null; }
      const geo = accBuild(a, A.fig);
      if (geo && (a.kind === 'ropa' || a.kind === 'pelo')) { prevMesh = accClothMesh(A, geo, a); A.body.add(prevMesh); }
      else if (geo) {
        prevMesh = new T.Group(); const m = new T.Mesh(geo, accMaterial(A, false, geo, a.color || ACC_COLORS[0], ACC_MAT_ID[accBaseMat(a)])); prevMesh.add(m); outlineAll(prevMesh);
        A.bone(ACC_PARTS[a.part].bone).add(prevMesh);
      }
      drawPrev();
    }, 120);
  };
  const pcam = new T.PerspectiveCamera(30, 1, .05, 30);
  const orb = { yaw: 35, pitch: 12, auto: true };
  let raf = 0, last = performance.now();
  const drawPrev = () => {
    const { c, s } = boxOf(A), d = s * 3.4;
    pcam.position.set(c.x + d * Math.cos(rad(orb.pitch)) * Math.sin(rad(orb.yaw)), c.y + d * Math.sin(rad(orb.pitch)), c.z + d * Math.cos(rad(orb.pitch)) * Math.cos(rad(orb.yaw)));
    pcam.lookAt(c);
    pg.drawImage(render(pcam, pv.width, pv.height), 0, 0);
  };
  const spin = now => {
    if (!ov.isConnected) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (orb.auto) { orb.yaw += dt * 28; drawPrev(); }
    raf = requestAnimationFrame(spin);
  };
  raf = requestAnimationFrame(spin);
  // girar el resultado con el dedo (deja de girar solo)
  let pd = null;
  pv.addEventListener('pointerdown', e => { e.preventDefault(); pv.setPointerCapture(e.pointerId); pd = { x: e.clientX, y: e.clientY }; orb.auto = false; });
  pv.addEventListener('pointermove', e => { if (!pd) return; orb.yaw -= (e.clientX - pd.x) * .6; orb.pitch = clamp(orb.pitch + (e.clientY - pd.y) * .4, -60, 85); pd = { x: e.clientX, y: e.clientY }; drawPrev(); });
  pv.addEventListener('pointerup', () => { pd = null; });
  // dibujar (las coordenadas siguen al zoom)
  const at = e => {
    const r = cv.getBoundingClientRect(), S = cv.width, X = (e.clientX - r.left) * S / r.width, Y = (e.clientY - r.top) * S / r.height, k = zK();
    return [Math.round((Z.cx + (X - S / 2) / k) * 4) / 4, Math.round((Z.cy + (Y - S / 2) / k) * 4) / 4];
  };
  // Mayús: horizontal, vertical o a 45°
  const snap = (x0, y0, x, y) => { const L = Math.hypot(x - x0, y - y0), an = Math.round(Math.atan2(y - y0, x - x0) / (Math.PI / 4)) * Math.PI / 4; return [Math.round((x0 + Math.cos(an) * L) * 4) / 4, Math.round((y0 + Math.sin(an) * L) * 4) / 4]; };
  const symOn = () => tool.sym && view !== 'side';
  const addStroke = s2 => { (a.views[view] = a.views[view] || []).push(s2); redo.length = 0; };
  // polígono: se cierra en una forma rellena de bordes rectos (en la capa elegida, con su color y material)
  const polyClose = () => {
    const p0 = poly || []; poly = null; hover = null;
    const q = []; for (let i = 0; i < p0.length; i += 2) if (!q.length || Math.hypot(p0[i] - q[q.length - 2], p0[i + 1] - q[q.length - 1]) > .2) q.push(p0[i], p0[i + 1]);
    if (q.length >= 6) {
      const s2 = { w: 1.2, p: q, f: 1, ln: 1 };
      if (layer === 'detalle') { s2.d = 1; s2.c = det.c; if (det.m !== 'tela') s2.m = det.m; }
      if (symOn()) s2.sy = 1;
      addStroke(s2); rebuild();
    }
    paint();
  };
  let st = null;
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    // desplazar la vista con zoom: botón derecho o del medio, o con la barra espaciadora
    if (e.button === 1 || e.button === 2 || space) { panning = { x: e.clientX, y: e.clientY, cx: Z.cx, cy: Z.cy }; cv.style.cursor = 'grabbing'; return; }
    let [x, y] = at(e); const t = tool.t;
    if (t === 'poly') {
      if (!poly) { poly = [x, y]; hover = null; paint(); return; }
      if (e.shiftKey) [x, y] = snap(poly[poly.length - 2], poly[poly.length - 1], x, y);
      if (poly.length >= 6 && (e.detail >= 2 || Math.hypot(x - poly[0], y - poly[1]) < 3.5 / Z.z)) { polyClose(); return; }
      poly.push(x, y); paint(); return;
    }
    st = { w: t === 'erase' ? 12 : t === 'fill' ? 2 : t === 'hair' ? Math.max(8, tool.w * 1.6) : tool.w, p: t === 'line' ? [x, y, x, y] : [x, y] };
    if (t === 'erase') st.e = 1; if (t === 'fill') st.f = 1;
    if (layer === 'detalle') {
      st.d = 1;
      if (!st.e) { st.c = det.c; if (det.m !== 'tela') st.m = det.m; if (t === 'hair') st.h = 1; }
    }
    if (symOn()) st.sy = 1;
    addStroke(st); paint();
  });
  cv.addEventListener('pointermove', e => {
    if (panning) { const r = cv.getBoundingClientRect(), k = r.width / 128 * Z.z; Z.cx = panning.cx - (e.clientX - panning.x) / k; Z.cy = panning.cy - (e.clientY - panning.y) / k; zClamp(); paint(); return; }
    if (poly) { let [x, y] = at(e); if (e.shiftKey) [x, y] = snap(poly[poly.length - 2], poly[poly.length - 1], x, y); hover = [x, y]; paint(); return; }
    if (!st) return;
    let [x, y] = at(e); const n = st.p.length;
    if (tool.t === 'line') { if (e.shiftKey) [x, y] = snap(st.p[0], st.p[1], x, y); st.p[2] = x; st.p[3] = y; paint(); return; }
    if (Math.hypot(x - st.p[n - 2], y - st.p[n - 1]) < 1 / Z.z) return;   // con zoom, trazos más finos
    st.p.push(x, y); paint();
  });
  const end = () => { if (panning) { panning = null; cv.style.cursor = space ? 'grab' : ''; return; } if (st) { st = null; rebuild(); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', () => { if (poly && hover) { hover = null; paint(); } });
  // rueda: acerca o aleja donde está el puntero
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const [u, v] = at(e), z0 = Z.z;
    Z.z = clamp(Z.z * (e.deltaY < 0 ? 1.25 : .8), 1, 6);
    Z.cx = u - (u - Z.cx) * z0 / Z.z; Z.cy = v - (v - Z.cy) * z0 / Z.z; zClamp(); paint();
  }, { passive: false });
  ov.querySelector('.acc-tabs').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { view = b.dataset.v; poly = null; paint(); } });
  ov.querySelector('.acc-tools').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.t) { tool.t = b.dataset.t; if (b.dataset.w) tool.w = +b.dataset.w; if (tool.t !== 'poly') { poly = null; hover = null; paint(); } ov.querySelectorAll('.acc-tools [data-t]').forEach(x => x.setAttribute('aria-pressed', x === b)); return; }
    const L = a.views[view] || [], mine = x => !!x.d === (layer === 'detalle'), x2 = b.dataset.x;
    if (x2 === 'sym' || x2 === 'guides') { tool[x2] = !tool[x2]; b.setAttribute('aria-pressed', tool[x2]); paint(); return; }
    if (x2 === 'zin' || x2 === 'zout') { Z.z = clamp(Z.z * (x2 === 'zin' ? 1.5 : 1 / 1.5), 1, 6); zClamp(); paint(); return; }
    if (x2 === 'zfit') { Z.z = 1; Z.cx = Z.cy = 64; paint(); return; }
    if (x2 === 'undo') { if (poly) { poly.splice(-2); if (!poly.length) poly = null; paint(); return; } for (let i = L.length - 1; i >= 0; i--) if (mine(L[i])) { redo.push([view, L.splice(i, 1)[0]]); break; } paint(); rebuild(); }
    if (x2 === 'redo') { const r = redo.pop(); if (r) { (a.views[r[0]] = a.views[r[0]] || []).push(r[1]); view = r[0]; paint(); rebuild(); } }
    if (x2 === 'clear') { a.views[view] = L.filter(x => !mine(x)); redo.length = 0; paint(); rebuild(); }
  });
  // capa: forma o detalle (el color y el material del panel son los de la capa elegida)
  ov.querySelector('.acc-layer').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b) { layer = b.dataset.l; paintLayer(); paint(); } });
  const paintLayer = () => {
    const D = layer === 'detalle';
    ov.querySelectorAll('.acc-layer [data-l]').forEach(x => x.setAttribute('aria-pressed', x.dataset.l === layer));
    ov.querySelector('.acc-card').classList.toggle('det', D);
    // las herramientas solo de detalle; si estaba elegida una, vuelve al pincel
    if (!D && ov.querySelector('.acc-tools .acc-dt[aria-pressed="true"]')) ov.querySelector('.acc-tools [data-t="pen"][data-w="4"]').click();
    paintMat();
  };
  const METALS = ['#C3C7CC', '#C9A545', '#A8683A'];
  const paintMat = () => {
    const D = layer === 'detalle', hair = a.kind === 'pelo';
    const mats = D ? (hair ? [['pelo', 'Pelo'], ...ACC_MATS] : ACC_MATS) : hair ? [] : ACC_MATS;
    const cur = D ? det.m : accBaseMat(a);
    const mf = ov.querySelector('.acc-matf'); mf.hidden = !mats.length;
    ov.querySelector('.acc-ml').textContent = D ? 'Material del detalle' : 'Material';
    ov.querySelector('.acc-mat').innerHTML = mats.map(([k, n]) => `<button data-m="${k}" aria-pressed="${ea(k === cur)}">${n}</button>`).join('');
    const base = a.color || ACC_COLORS[0];
    const pal = D ? [...new Set([accShade(base, -.35), accShade(base, .3), ...(hair ? ACC_HAIR : ACC_COLORS), ...METALS].map(c => c.toUpperCase()))] : hair ? ACC_HAIR : ACC_COLORS;
    const sel = (D ? det.c : base).toUpperCase();
    ov.querySelector('.acc-cl').textContent = D ? 'Color del detalle' : 'Color';
    ov.querySelector('.sws').innerHTML = pal.map(c => `<button class="sw${ea(METALS.includes(c) ? ' met' : '')}" style="--sw:${ea(c)}" data-c="${ea(c)}" aria-pressed="${ea(c.toUpperCase() === sel)}" aria-label="Color ${ea(colorName(c))}"></button>`).join('');
  };
  ov.querySelector('.acc-mat').addEventListener('click', e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    if (layer === 'detalle') {
      det.m = b.dataset.m;
      // el metal recién elegido arranca plateado (luego se puede cambiar)
      if (det.m === 'metal' && !METALS.includes(det.c.toUpperCase())) det.c = METALS[0];
    } else { a.mat = b.dataset.m; if (a.mat === 'tela') delete a.mat; rebuild(); }
    paintMat();
  });
  ov.querySelector('.acc-part').addEventListener('change', e => { a.part = e.target.value; for (const k in refs) delete refs[k]; paint(); rebuild(); });
  // tipo y volumen
  const paintKind = () => {
    const k = a.kind || 'pieza', v = Math.round((num(a.vol) || 0) * 100);
    ov.querySelectorAll('.acc-kind [data-k]').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
    const w = k === 'ropa' ? ['ajustada', 'holgada'] : k === 'pelo' ? ['pegado', 'con volumen'] : ['más fino', 'más grueso'];
    ov.querySelector('.acc-vl').textContent = 'Volumen: ' + (v < -40 ? w[0] : v > 40 ? w[1] : 'normal') + (v ? ` (${v > 0 ? '+' : ''}${v} %)` : '');
  };
  const drawn = () => Object.keys(a.views).some(k => (a.views[k] || []).some(x => !x.d));
  const setPart = p => { a.part = p; ov.querySelector('.acc-part').value = p; for (const k in refs) delete refs[k]; };
  ov.querySelector('.acc-kind').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const was = a.kind;
    a.kind = b.dataset.k === 'pieza' ? undefined : b.dataset.k;
    if (a.kind === was) return;
    if (a.kind === 'ropa' && a.part === 'cabeza' && !drawn()) setPart('torso');
    if (a.kind === 'pelo') {
      if (!drawn() && a.part !== 'melena') setPart('cabeza');
      if (!ACC_HAIR.includes((a.color || '').toUpperCase())) a.color = ACC_HAIR[2];
      det.m = 'pelo'; det.c = accShade(a.color, -.4);
    } else if (was === 'pelo') { if (det.m === 'pelo') det.m = 'tela'; if (!ACC_COLORS.includes(a.color)) a.color = ACC_COLORS[1]; }
    for (const k in refs) delete refs[k];
    syncRef(); paintKind(); paintMat(); paint(); rebuild();
  });
  ov.querySelector('.acc-vol input').addEventListener('input', e => { a.vol = (+e.target.value) / 100; if (!a.vol) delete a.vol; paintKind(); rebuild(); });
  paintKind();
  ov.querySelector('.sws').addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    if (layer === 'detalle') { det.c = b.dataset.c; ov.querySelectorAll('.sws [data-c]').forEach(x => x.setAttribute('aria-pressed', x === b)); return; }
    // el color de base: el del detalle lo sigue mientras no se haya elegido otro
    const auto = det.c.toUpperCase() === accShade(a.color, a.kind === 'pelo' ? -.4 : -.35).toUpperCase();
    a.color = b.dataset.c; if (auto) det.c = accShade(a.color, a.kind === 'pelo' ? -.4 : -.35);
    paintMat(); paint(); rebuild();
  });
  paintLayer();
  ov.querySelector('.acc-name').addEventListener('input', e => { a.name = e.target.value; });
  const close = () => {
    cancelAnimationFrame(raf); clearTimeout(rebuildT);
    removeEventListener('keydown', esc1, true); removeEventListener('keyup', keyUp, true);
    if (prevMesh) prevMesh.traverse(o => { if (o.isMesh) { accDisposeGeo(o.geometry); if (!o.userData.ol) accDisposeMat(o.material); } });
    fig3dDispose(A); if (other) fig3dDispose(R); ov.remove();
    if (typeof EDT !== 'undefined' && EDT && EDT.redraw) EDT.redraw();   // el visor vuelve a su tamaño
  };
  // con trazos o ajustes nuevos, salir sin guardar pregunta antes
  const leave = () => { if (JSON.stringify(a) !== a0) askDiscard(close, { save: () => ov.querySelector('[data-a="save"]').click() }); else close(); };
  const esc1 = e => {
    const typing = e.target && e.target.closest && e.target.closest('input, textarea, select');
    if (poly && !typing && (e.key === 'Escape' || e.key === 'Enter' || e.key === 'Backspace')) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.key === 'Enter') polyClose(); else if (e.key === 'Backspace') { poly.splice(-2); if (!poly.length) poly = null; paint(); } else { poly = null; hover = null; paint(); }
      return;
    }
    if (e.key === ' ' && !typing) { e.preventDefault(); if (!space) { space = true; cv.style.cursor = 'grab'; } return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); leave(); }
  };
  const keyUp = e => { if (e.key === ' ') { space = false; if (!panning) cv.style.cursor = ''; } };
  addEventListener('keydown', esc1, true); addEventListener('keyup', keyUp, true);
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'cancel') { leave(); return; }
    for (const k of Object.keys(a.views)) if (!a.views[k].length) delete a.views[k];
    if (!drawn()) { toast(a.kind === 'pelo' ? 'Pinta el cabello al menos en una vista (en la capa Forma).' : 'Dibuja la silueta del accesorio al menos en una vista (en la capa Forma).'); return; }
    a.name = (a.name || '').trim() || (a.kind === 'pelo' ? 'Cabello' : 'Accesorio');
    a.v = (a.v || 0) + 1;
    a.fit = { b: srcB };   // sobre qué cuerpo se dibujó: en otros se acomoda
    close();
    onSave(a);
  });
  paint(); rebuild();
}
