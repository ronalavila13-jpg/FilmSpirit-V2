/* ============================================================
   ESCENARIOS 3D IMPORTADOS · el modelo de una locación (un .glb de SketchUp, Blender…) como escenario de los planos
   P.sets3d[id] = { id, n, loc, v, u, sc, zup, rot, flr, mx, mz, fl, ax, az, b, h, int, tris, kb, cut, from }
     u, sc: las medidas del archivo y su escala a metros; zup: el archivo viene con Z hacia arriba (acostado)
     rot: el giro (grados) alrededor del eje vertical
     flr: la altura del piso en el archivo (fl = flr × sc, en metros); mx, mz: el punto de la acción en el archivo
     ax, az: ese punto ya girado y a escala: es el centro de la escena (0, 0), donde se paran las figuras
     b: [x0, z0, x1, z1] lo que ocupa en la escena (para la planta); h: su alto sobre el piso; int: es un interior
   El modelo va en FRAMES['m3~s~<id>'] (modelos.js) y su planta, la vista desde arriba cortada a 1,5 m del piso como
   un plano de arquitectura, en FRAMES['m3p~<id>']. Un plano lo usa con s3.set = 'modelo' y s3.set3d = id;
   P.locSet3d[locación] = id hace que los planos nuevos de esa locación lo traigan.
   ============================================================ */
const S3D_UNITS = [['m', 1, 'Metros'], ['cm', .01, 'Centímetros'], ['mm', .001, 'Milímetros'], ['in', .0254, 'Pulgadas'], ['ft', .3048, 'Pies']];
const S3D_CUT = 1.5;      // la planta: corte a 1,5 m del piso
const S3D_ROOF = 2.2;     // la vista 3D del importador, «sin techo»: corte a 2,2 m
const set3dOf = s3 => (s3 && s3.set === 'modelo' && typeof P !== 'undefined' && P.sets3d && P.sets3d[s3.set3d]) || null;
const set3dKey = s3 => { const d = set3dOf(s3); return d ? m3Key('s', d.id) : null; };
const set3dPicKey = id => 'm3p~' + id;
const set3dSig = s3 => { const d = set3dOf(s3); return d ? d.id + ':' + d.v : ''; };
const set3dList = () => Object.values((typeof P !== 'undefined' && P.sets3d) || {}).sort((a, b) => String(a.n).localeCompare(String(b.n), 'es'));
const set3dForLoc = loc => { const id = loc && P.locSet3d && P.locSet3d[loc]; return id && P.sets3d && P.sets3d[id] ? id : null; };
const set3dUnit = u => S3D_UNITS.find(x => x[0] === u) || S3D_UNITS[0];
const set3dM = v => (Math.round(v * 100) / 100).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// la niebla según el tamaño del escenario (que no tape el fondo de un modelo grande)
function set3dFog(d) { const D = d && d.b ? Math.hypot(d.b[2] - d.b[0], d.b[3] - d.b[1]) : 30; return [Math.max(30, D * 1.1), Math.max(90, D * 3)]; }
// la parte del escenario que entra al encuadrar la planta: alrededor de la acción, aunque el modelo sea una ciudad
const set3dFitBox = d => d && d.b ? [Math.max(d.b[0], -14), Math.max(d.b[1], -14), Math.min(d.b[2], 14), Math.min(d.b[3], 14)] : null;

/* ---------- en la vista 3D ---------- */
const set3dInk = () => STY.e3ink || (STY.e3ink = new THREE.LineBasicMaterial({ color: STY.ink, transparent: true, opacity: .42 }));
/* las aristas marcadas (un dibujo de línea como el resto de la app); en modelos muy pesados, no */
function set3dEdges(t) {
  if (t.edgeGeo !== undefined) return t.edgeGeo;
  t.edgeGeo = null;
  if (t.H.tris > 120000) return null;
  const T = THREE, list = []; let n = 0;
  for (const p of t.parts) {
    const d = t.H.mats[p.m]; if (d && (d.tr || d.op < .99)) continue;
    const e = new T.EdgesGeometry(p.geo, 32), a = e.attributes.position.array;
    list.push(a.slice()); n += a.length; e.dispose();
  }
  if (!n) return null;
  const all = new Float32Array(n); let o = 0; for (const a of list) { all.set(a, o); o += a.length; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(all, 3)); g.computeBoundingSphere();
  return (t.edgeGeo = g);
}
/* el modelo con su giro, su escala y su punto de la acción en el centro. o: { mats, cast, recv, edges, lineMat } */
function set3dHold(t, d, o = {}) {
  const T = THREE, hold = new T.Group(), tilt = new T.Group(), mats = o.mats || m3Mats(t);
  hold.rotation.y = rad(d.rot || 0); hold.scale.setScalar(d.sc || 1);
  hold.position.set(-(d.ax || 0), -(d.fl || 0), -(d.az || 0));
  tilt.rotation.x = d.zup ? -Math.PI / 2 : 0; hold.add(tilt); hold.userData.tilt = tilt;
  for (const p of t.parts) { const m = new T.Mesh(p.geo, mats[p.m]); m.castShadow = !!o.cast; m.receiveShadow = !!o.recv; tilt.add(m); }
  const eg = o.edges !== false ? set3dEdges(t) : null;
  if (eg) { const L = new T.LineSegments(eg, o.lineMat || set3dInk()); L.userData.noOutline = true; L.userData.e3edge = true; tilt.add(L); }
  return hold;
}
function set3dLate() {
  if (typeof EDT !== 'undefined' && EDT && EDT.redraw) EDT.redraw();
  if (typeof UI !== 'undefined' && ['board', 'animatic', 'plan'].includes(UI.tab)) lateRender();
}
/* el escenario en la escena (lo llama r3Sync): el piso de siempre, por si el modelo no lo trae, y el modelo cuando está
   listo (mientras se baja o se abre, solo el piso). false: el plano no tiene un escenario 3D que exista */
function set3dSync(s3) {
  const d = set3dOf(s3); if (!d) return false;
  const T = THREE;
  let G = R3.sets.modelo;
  if (!G) {
    G = R3.sets.modelo = new T.Group(); G.visible = false; R3.scene.add(G);
    const fl = new T.Mesh(new T.PlaneGeometry(600, 600), toon(C3.floorExt)); fl.rotation.x = -Math.PI / 2; fl.position.y = -.03; fl.receiveShadow = true; G.add(fl);
    G.userData.ground = fl;
  }
  const U = G.userData, k = m3Key('s', d.id);
  const t = m3Tpl(k, U.wait === k ? null : () => { U.wait = null; set3dLate(); });
  if (!t) U.wait = k;
  const key = t ? d.id + ':' + d.v + ':' + ((M3.tpl.get(k) || {}).sig || '') : 'x' + d.id;
  if (U.key !== key) {
    U.key = key;
    if (U.hold) { G.remove(U.hold); U.hold = null; }
    U.ground.material.color.set(d.int ? C3.floorInt : C3.floorExt);
    if (t) {
      // las caras un poco más atrás que sus aristas (que no titilen)
      for (const m of m3Mats(t)) if (!m.polygonOffset) { m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1; }
      U.hold = set3dHold(t, d, { cast: !d.int, recv: true }); G.add(U.hold);
    }
    R3.shSig = null;
  }
  return true;
}

/* ---------- en la planta ---------- */
const S3D_PIC = new Map();
function set3dPic(d, cb) {
  const k = set3dPicKey(d.id), url = FRAMES[k];
  if (!url) { if (frameHas(k)) framesNeed([k]).then(() => { if (FRAMES[k] && cb) cb(); }); return null; }
  let im = S3D_PIC.get(d.id);
  if (!im || im._src !== url) {
    im = new Image(); im._src = url; im._cbs = [];
    im.onload = () => { im._cbs.forEach(f => f()); im._cbs = []; if (typeof UI !== 'undefined' && (UI.tab === 'board' || UI.tab === 'animatic')) lateRender(); };
    im.src = url; S3D_PIC.set(d.id, im);
  }
  if (im.complete && im.naturalWidth) return im;
  if (cb) im._cbs.push(cb);
  return null;
}
/* antes de un PDF: las plantas de todos los escenarios, ya abiertas */
async function set3dPreload() {
  const L = Object.values((typeof P !== 'undefined' && P.sets3d) || {});
  const ks = L.map(d => set3dPicKey(d.id)).filter(k => !FRAMES[k] && frameHas(k));
  if (ks.length) await framesNeed(ks).catch(() => { });
  await Promise.all(L.map(d => new Promise(res => { const im = set3dPic(d, res); if (im) res(); setTimeout(res, 3000); })));
}
/* la planta del escenario bajo lo demás (s3d-plan.js); sin la imagen todavía, el contorno */
function set3dDrawPlan(ctx, s3, toS, redraw) {
  const d = set3dOf(s3); if (!d || !d.b) return;
  const [a, b] = toS(d.b[0], d.b[1]), [c, e] = toS(d.b[2], d.b[3]);
  const im = set3dPic(d, redraw);
  if (im) { ctx.save(); ctx.globalAlpha = .72; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, a, b, c - a, e - b); ctx.restore(); }
  else { ctx.save(); ctx.strokeStyle = PLAN_C.muted; ctx.lineWidth = 1; ctx.setLineDash([5, 4]); ctx.strokeRect(a, b, c - a, e - b); ctx.restore(); }
}

/* ---------- leer el modelo ---------- */
/* el piso: las superficies que miran hacia arriba, por altura; el piso es la más baja con buena parte de la superficie.
   Devuelve también los otros niveles con mucha superficie (los pisos de un edificio) */
function set3dFloors(t, zup) {
  const B = set3dBox(t, zup), y0 = B[1], y1 = B[4], N = 240, step = (y1 - y0) / N || 1, area = new Float64Array(N + 1);
  const up = zup ? 2 : 1;
  for (const p of t.parts) {
    const A = p.geo.attributes.position.array, I = p.geo.index.array;
    for (let i = 0; i < I.length; i += 3) {
      const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
      const ux = A[b] - A[a], uy = A[b + 1] - A[a + 1], uz = A[b + 2] - A[a + 2], vx = A[c] - A[a], vy = A[c + 1] - A[a + 1], vz = A[c + 2] - A[a + 2];
      const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], L = Math.hypot(n[0], n[1], n[2]);
      if (!L || n[up] / L < .92) continue;
      const y = (A[a + up] + A[b + up] + A[c + up]) / 3;
      area[clamp(Math.round((y - y0) / step), 0, N)] += L / 2;
    }
  }
  const max = Math.max(...area);
  if (!(max > 0)) return { floor: y0, levels: [y0], y0, y1 };
  const levels = [];
  for (let i = 0; i <= N; i++) if (area[i] >= max * .25 && (area[i] >= (area[i - 1] || 0)) && (area[i] >= (area[i + 1] || 0))) {
    const y = y0 + i * step;
    if (!levels.length || y - levels[levels.length - 1] > (y1 - y0) * .04) levels.push(y);
  }
  return { floor: levels[0] ?? y0, levels: levels.slice(0, 6), y0, y1 };
}
// la caja del modelo [x0, y0, z0, x1, y1, z1], ya parado (con Z arriba se acuesta: y ← z, z ← -y)
function set3dBox(t, zup) {
  const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of t.parts) { const g = p.geo.boundingBox; for (let i = 0; i < 3; i++) { b[i] = Math.min(b[i], g.min.getComponent(i)); b[i + 3] = Math.max(b[i + 3], g.max.getComponent(i)); } }
  return zup ? [b[0], b[2], -b[4], b[3], b[5], -b[1]] : b;
}
/* las medidas del archivo, por su tamaño: un escenario tiene entre 1.8 y 60 m de alto y entre 1.5 m y 2 km de lado. De las
   medidas que dan eso, la que deja el alto más cerca de unos 4 m (una casa), con ventaja para lo de siempre en ese formato
   (glTF: metros; FBX: centímetros). Si es plano (un terreno), por su lado */
function set3dGuessUnit(t, zup, fmt) {
  const B = set3dBox(t, zup), H = B[4] - B[1], D = Math.max(B[3] - B[0], B[5] - B[2]), usual = fmt === 'fbx' ? 'cm' : 'm';
  let best = null, bs = Infinity;
  for (const [u, k] of S3D_UNITS) {
    if (u === 'ft' || H * k < 1.8 || H * k > 60 || D * k < 1.5 || D * k > 2000) continue;
    const sc = Math.abs(Math.log(H * k / 4)) - (u === usual ? 1.2 : 0);
    if (sc < bs) { bs = sc; best = u; }
  }
  return best || (D > 40000 ? 'mm' : D > 300 ? 'cm' : 'm');
}

/* ---------- el importador ---------- */
/* opts: { loc, name, int, edit: id de un escenario para ajustarlo }. done(id, applyLoc) */
function openSet3dImporter(opts, done) {
  if (!r3Init()) { toast('Este equipo no puede mostrar 3D.'); return; }
  if (!opts.edit && !proGate('modelo3d')) return;
  const T = THREE, ed = opts.edit && P.sets3d && P.sets3d[opts.edit] || null;
  const S = {
    t: null, url: null, own: false, pk: null, name: ed ? ed.n : (opts.name || 'Escenario'), u: ed ? ed.u : 'm', zup: !!(ed && ed.zup), rot: ed ? ed.rot || 0 : 0,
    flr: ed ? ed.flr || 0 : 0, mx: ed ? ed.mx || 0 : 0, mz: ed ? ed.mz || 0 : 0, int: ed ? !!ed.int : opts.int !== false,
    loc: !!opts.loc && (!ed || (P.locSet3d || {})[opts.loc] === ed.id), view: 'top', yaw: 35, pitch: 32, dist: 0, roof: true,
    fl: null, W: 0, H: 0, changed: false, busy: '',
  };
  const ov = document.createElement('div');
  ov.className = 'modal fp-modal e3-modal'; ov.id = 'e3Modal';
  const title = ed ? 'Ajustar escenario 3D' : 'Importar escenario 3D';
  ov.innerHTML = `<div class="dlg wide" role="dialog" aria-modal="true" aria-label="${ea(title)}">
    <header><h2>${esc(title)}</h2><button class="btn ghost sm" data-x aria-label="Cerrar">${ICO.close}</button></header>
    <div class="body"><div class="fpi">
      <div class="fpi-l">
        <div class="e3-bar"><div class="seg" role="group" aria-label="Vista"><button data-v="top" aria-pressed="true">Planta</button><button data-v="3d" aria-pressed="false">3D</button></div>
          <label class="opt e3-roof" hidden><input type="checkbox" id="e3Roof" checked><span>Sin techo</span></label></div>
        <div class="fpi-cv e3-cv" id="e3Wrap"><canvas id="e3C"></canvas><canvas id="e3O" class="e3-o"></canvas>
          <div class="fpi-drop" id="e3Drop" ${ed ? 'hidden' : ''}><b>Elige o arrastra el modelo del escenario</b><span>.glb, .gltf (con todo adentro), .fbx o .vrm. Desde SketchUp: Archivo › Exportar › Modelo 3D › GLTF Binary File (.glb).</span><button class="btn primary" id="e3Pick">Elegir archivo</button></div>
          <div class="e3-busy" id="e3Busy" hidden><span class="spin" aria-hidden="true"></span><b id="e3BusyT" role="status"></b></div>
        </div>
        <p class="hint" id="e3Hint" style="margin:0"></p>
      </div>
      <div class="fpi-r" id="e3R">
        <label class="fld"><span>Nombre</span><input type="text" id="e3Name" value="${ea(S.name)}" maxlength="80"></label>
        <div class="fld"><span>Medidas del archivo</span><select id="e3Unit">${S3D_UNITS.map(([k, , n]) => `<option value="${k}">${n}</option>`).join('')}</select><span class="hint" id="e3Dims"></span></div>
        <div class="fld"><span>Eje vertical</span><div class="seg" role="group" id="e3Up"><button data-up="0" aria-pressed="true">Y (normal)</button><button data-up="1" aria-pressed="false">Z</button></div><span class="hint">Si el modelo aparece acostado, cambia a Z.</span></div>
        <label class="rr"><span>Giro</span><input type="range" id="e3Rot" min="-180" max="180" step="1" value="${ea(S.rot)}"><output id="e3RotO"></output></label>
        <div class="e3-fl"><label class="rr"><span>Piso</span><input type="range" id="e3Fl" min="0" max="1" step="any" value="0"><output id="e3FlO"></output></label><div class="e3-lv" id="e3Lv"></div></div>
        <div class="fld"><span>Lugar</span><div class="seg" role="group" id="e3In"><button data-in="1">Interior</button><button data-in="0">Exterior</button></div><span class="hint">En un interior no llueve y el modelo no hace sombra con el sol.</span></div>
        ${opts.loc ? `<label class="opt" style="padding:8px 10px"><input type="checkbox" id="e3Loc" ${S.loc ? 'checked' : ''}><span><b>Usarlo en toda la locación</b><span class="hint">${esc(titleCase(opts.loc))}: los demás planos de esta locación también lo usan.</span></span></label>` : ''}
        <p class="hint" id="e3Stats" style="margin:0"></p>
        <button class="btn sm ghost" id="e3Swap" ${ed ? '' : 'hidden'}>Cambiar el archivo…</button>
      </div></div></div>
    <footer><button class="btn" data-x>Cancelar</button><button class="btn primary" id="e3Ok" disabled>${ed ? 'Guardar' : 'Importar escenario'}</button></footer></div>`;
  document.body.appendChild(ov);
  const $o = s => ov.querySelector(s);
  const cv = $o('#e3C'), oc = $o('#e3O'), wrap = $o('#e3Wrap');
  let R = null, scene = null, hold = null, tilt = null, fig = null, grid = null, camTop = null, cam3 = null, cutTop = null, cut3 = null;
  let mats3 = [], matsTop = [], lineMat = null, meshes3 = [], meshesTop = [], box = null, ro = null;
  const own = [];   // lo que creó la ventana (se libera al cerrar)

  // ---------- armar la vista ----------
  function setup() {
    if (R) return;
    R = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); R.localClippingEnabled = true;
    scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xffffff, 0x8a8478, 2.3));
    const sun = new T.DirectionalLight(0xffffff, 1.3); sun.position.set(6, 12, 8); scene.add(sun);
    cutTop = new T.Plane(new T.Vector3(0, -1, 0), S3D_CUT); cut3 = new T.Plane(new T.Vector3(0, -1, 0), 1e6);
    camTop = new T.OrthographicCamera(-1, 1, 1, -1, .1, 1000); camTop.up.set(0, 0, -1);
    cam3 = new T.PerspectiveCamera(45, 1, .1, 4000);
    // una figura de 1,75 m en el punto de la acción: para ver si la escala está bien
    fig = new T.Group();
    const fm = new T.MeshLambertMaterial({ color: '#E0703A' }); own.push(fm);
    const body = new T.Mesh(new T.CapsuleGeometry(.2, .95, 4, 12), fm); body.position.y = .2 + .475 + .02; fig.add(body);
    const head = new T.Mesh(new T.SphereGeometry(.13, 16, 12), fm); head.position.y = 1.62; fig.add(head);
    own.push(body.geometry, head.geometry);
    scene.add(fig);
    grid = new T.GridHelper(40, 40, 0x8f887c, 0xb9b3a8); grid.material.transparent = true; grid.material.opacity = .35; own.push(grid.geometry, grid.material); scene.add(grid);
    ro = new ResizeObserver(() => draw()); ro.observe(wrap);
  }
  /* las mallas del modelo en la ventana: con el sombreado de la app (3D) y para la planta (las caras de atrás, oscuras:
     así un muro cortado se ve relleno, como en un plano) */
  function build() {
    setup();
    if (hold) { scene.remove(hold); for (const m of [...mats3, ...matsTop.flat()]) if (m) m.dispose(); if (lineMat) lineMat.dispose(); }
    const t = S.t;
    mats3 = m3MatsNew(t, { clippingPlanes: [cut3] });
    matsTop = t.H.mats.map(d => {
      const c = new T.Color(d.c).lerp(new T.Color('#FFFFFF'), .35);
      const f = new T.MeshLambertMaterial({ color: c, map: d.t >= 0 ? t.texs[d.t] : null, vertexColors: !!d.vc, transparent: !!d.tr, opacity: d.op ?? 1, alphaTest: d.at || 0, clippingPlanes: [cutTop] });
      const b = d.tr ? null : new T.MeshBasicMaterial({ color: '#4F5563', side: T.BackSide, clippingPlanes: [cutTop] });
      return [f, b];
    });
    lineMat = new T.LineBasicMaterial({ color: STY.ink, transparent: true, opacity: .42, clippingPlanes: [cut3] });
    hold = set3dHold(t, { sc: 1 }, { mats: mats3, lineMat });
    tilt = hold.userData.tilt;
    meshes3 = tilt.children.slice();
    meshesTop = [];
    for (const p of t.parts) for (const m of matsTop[p.m]) if (m) { const x = new T.Mesh(p.geo, m); tilt.add(x); meshesTop.push(x); }
    scene.add(hold);
  }
  const sc = () => set3dUnit(S.u)[1];
  // el modelo en la ventana: girado y a escala, con el piso en 0 (la acción se marca, el modelo no se mueve)
  function place() {
    hold.rotation.y = rad(S.rot); hold.scale.setScalar(sc()); hold.position.set(0, -S.flr * sc(), 0);
    tilt.rotation.x = S.zup ? -Math.PI / 2 : 0;
    hold.updateMatrixWorld(true);
    box = new T.Box3(); for (const m of meshes3) if (m.isMesh) box.expandByObject(m);
    const p = hold.localToWorld(new T.Vector3(S.mx, S.flr, S.mz)); S.ax = p.x; S.az = p.z;
  }
  function fitTop(W, H, exact) {
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    let hw = (box.max.x - box.min.x) / 2, hh = (box.max.z - box.min.z) / 2;
    if (!exact) { hw = hw * 1.06 + .2; hh = hh * 1.06 + .2; if (hw / hh < W / H) hw = hh * W / H; else hh = hw * H / W; }
    camTop.left = -hw; camTop.right = hw; camTop.top = hh; camTop.bottom = -hh;
    camTop.position.set(cx, Math.max(box.max.y, S3D_CUT) + 10, cz); camTop.lookAt(cx, 0, cz);
    camTop.near = .1; camTop.far = Math.max(box.max.y, S3D_CUT) - Math.min(box.min.y, 0) + 30; camTop.updateProjectionMatrix();
    return { cx, cz, hw, hh };
  }
  // ---------- dibujar ----------
  function draw() {
    if (!R || !S.t) return;
    const r = wrap.getBoundingClientRect(), W = Math.max(50, Math.round(r.width)), H = Math.max(50, Math.round(r.height));
    if (W !== S.W || H !== S.H) { S.W = W; S.H = H; R.setSize(W, H, false); }
    place();
    const top = S.view === 'top';
    meshes3.forEach(m => { m.visible = !top; }); meshesTop.forEach(m => { m.visible = top; });
    fig.visible = grid.visible = !top;
    scene.background = new T.Color(top ? '#FFFFFF' : '#E4E9EE');
    if (top) { S.vw = fitTop(W, H); R.render(scene, camTop); }
    else {
      cut3.constant = S.roof && S.int ? S3D_ROOF : 1e6;
      const D = Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z);
      if (!S.dist) S.dist = clamp(D * .55, 5, 250);
      fig.position.set(S.ax, 0, S.az); grid.position.set(S.ax, .002, S.az);
      const y = rad(S.yaw), pt = rad(S.pitch);
      cam3.aspect = W / H; cam3.near = Math.max(.05, S.dist / 400); cam3.far = S.dist * 20 + D * 4;
      cam3.position.set(S.ax + Math.sin(y) * Math.cos(pt) * S.dist, 1 + Math.sin(pt) * S.dist, S.az + Math.cos(y) * Math.cos(pt) * S.dist);
      cam3.lookAt(S.ax, 1, S.az); cam3.updateProjectionMatrix();
      R.render(scene, cam3);
    }
    overlay(W, H);
  }
  // en la planta: el punto de la acción y una escala
  function overlay(W, H) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (oc.width !== Math.round(W * dpr) || oc.height !== Math.round(H * dpr)) { oc.width = Math.round(W * dpr); oc.height = Math.round(H * dpr); }
    const g = oc.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    if (S.view !== 'top' || !S.vw) return;
    const V = S.vw, k = W / (2 * V.hw), sx = (S.ax - (V.cx - V.hw)) * k, sy = (S.az - (V.cz - V.hh)) * k;
    const r = Math.max(7, .3 * k);
    g.strokeStyle = '#E0703A'; g.fillStyle = 'rgba(224,112,58,.18)'; g.lineWidth = 2;
    g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(sx - r - 6, sy); g.lineTo(sx + r + 6, sy); g.moveTo(sx, sy - r - 6); g.lineTo(sx, sy + r + 6); g.stroke();
    g.font = '700 11px Archivo, Arial, sans-serif'; g.fillStyle = '#B5501F'; g.textAlign = 'left'; g.fillText('Acción', sx + r + 8, sy - 6);
    // escala: el largo redondo que ocupa unos 90 px
    const want = 90 / k, nice = [.5, 1, 2, 5, 10, 20, 50, 100, 200, 500].find(x => x >= want * .6) || 1000, px = nice * k;
    g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(10, H - 30, px + 12, 22);
    g.strokeStyle = '#26262B'; g.lineWidth = 2; g.beginPath(); g.moveTo(16, H - 14); g.lineTo(16 + px, H - 14); g.moveTo(16, H - 19); g.lineTo(16, H - 9); g.moveTo(16 + px, H - 19); g.lineTo(16 + px, H - 9); g.stroke();
    g.fillStyle = '#26262B'; g.font = '600 10px Archivo, Arial, sans-serif'; g.textAlign = 'center'; g.fillText(`${nice} m`, 16 + px / 2, H - 18);
  }
  // ---------- los controles ----------
  function paint() {
    const has = !!S.t;
    $o('#e3Drop').hidden = has || !!S.busy;
    const bz = $o('#e3Busy'); bz.hidden = !S.busy; $o('#e3BusyT').textContent = S.busy;
    $o('#e3R').classList.toggle('off', !has);
    for (const x of ov.querySelectorAll('#e3R input, #e3R select, #e3R button:not(#e3Swap)')) x.disabled = !has;
    $o('#e3Ok').disabled = !has || !!S.busy;
    $o('#e3Swap').hidden = !has;
    $$('[data-v]', ov).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === S.view));
    $o('.e3-roof').hidden = S.view === 'top' || !S.int;
    $o('#e3Hint').textContent = !has ? '' : S.view === 'top' ? 'Toca la planta donde ocurre la acción: ese punto queda en el centro de la escena.' : 'Arrastra para girar la vista y usa la rueda para acercarte. La figura mide 1.75 m: sirve para ver si la escala está bien.';
    if (!has) return;
    $o('#e3Unit').value = S.u;
    $$('[data-up]', ov).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.up === +S.zup)));
    $$('[data-in]', ov).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.in === +S.int)));
    $o('#e3Rot').value = S.rot; $o('#e3RotO').textContent = `${S.rot}°`;
    const F = S.fl, f = $o('#e3Fl');
    f.min = F.y0; f.max = F.y1; f.step = (F.y1 - F.y0) / 400 || .01; f.value = S.flr;
    $o('#e3FlO').textContent = `${set3dM((S.flr - F.y0) * sc())} m`;
    $o('#e3Lv').innerHTML = F.levels.length > 1 ? F.levels.map((y, i) => `<button class="chip" data-lv="${i}" aria-pressed="${ea(Math.abs(y - S.flr) < (F.y1 - F.y0) / 300)}">${i ? `Nivel ${i + 1}` : 'Suelo'} · ${set3dM((y - F.y0) * sc())} m</button>`).join('') : '';
    const B = set3dBox(S.t, S.zup), k = sc();
    $o('#e3Dims').textContent = `Mide ${set3dM((B[3] - B[0]) * k)} × ${set3dM((B[5] - B[2]) * k)} m y ${set3dM((B[4] - B[1]) * k)} m de alto.`;
    const H = S.t.H, kb = S.pk ? S.pk.kb : (ed && ed.kb) || Math.round(S.url.length * .75 / 1024);
    const nt = H.texs.length, cut = S.pk ? S.pk.cut && S.pk.from : ed && ed.cut && ed.from;
    $o('#e3Stats').innerHTML = esc(`${(H.tris || 0).toLocaleString('es-PE')} triángulos · ${kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' kB'}${nt ? ` · ${nt} ${nt === 1 ? 'textura' : 'texturas'}` : ''}.`)
      + (cut ? `<br>${esc(`Se redujo de ${Math.round(cut).toLocaleString('es-PE')} triángulos para que cargue rápido.`)}` : '');
  }
  function afterLoad(reset) {
    S.fl = set3dFloors(S.t, S.zup);
    if (reset) {
      S.u = set3dGuessUnit(S.t, S.zup, S.fmt); S.flr = S.fl.floor;
      const B = set3dBox(S.t, S.zup); S.mx = (B[0] + B[3]) / 2; S.mz = (B[2] + B[5]) / 2;
    }
    build(); S.dist = 0;
    if (reset) floorAt(.6);   // al abrir: solo un ajuste fino del piso detectado (no la mesa del centro)
    paint(); draw();
  }
  async function load(file) {
    if (!file) return;
    S.busy = 'Leyendo el modelo…'; paint();
    let R0 = null;
    try {
      R0 = await m3Read(file);
      const st = m3Stats(R0.root);
      S.busy = st.tris > M3_TRIS.set ? `Aligerando ${st.tris.toLocaleString('es-PE')} triángulos…` : 'Preparando el modelo…'; paint();
      await new Promise(r => setTimeout(r, 30));
      const pk = await m3Pack(R0.root, { kind: 'set', extra: { n: R0.name } });
      if (pk.gz.length > M3_MAX) throw new Error(M3_BIG);
      const t = await m3Parse(pk.url);
      if (S.own && S.t) m3Dispose(S.t);
      S.t = t; S.own = true; S.url = pk.url; S.pk = pk; S.changed = true; S.fmt = R0.fmt;
      if (!ed || !$o('#e3Name').value.trim()) $o('#e3Name').value = S.name = opts.name || R0.name || 'Escenario';
      S.busy = ''; afterLoad(true);
    } catch (e) { S.busy = ''; paint(); toast(String((e && e.message) || e), 7000); }
    finally { if (R0) R0.root.traverse(o => { if (o.geometry) o.geometry.dispose(); for (const m of [].concat(o.material || [])) if (m) { if (m.map) m.map.dispose(); m.dispose(); } }); }
  }
  const pick = () => { const fi = document.createElement('input'); fi.type = 'file'; fi.accept = M3_FILES; fi.onchange = () => load(fi.files[0]); fi.click(); };
  // ---------- guardar ----------
  /* la planta guardada: la vista desde arriba que cubre justo el modelo (hasta 1600 px por lado y 1 cm por píxel) */
  function renderPic() {
    place();
    meshes3.forEach(m => { m.visible = false; }); meshesTop.forEach(m => { m.visible = true; }); fig.visible = grid.visible = false;
    scene.background = new T.Color('#FFFFFF');
    const bw = Math.max(.01, box.max.x - box.min.x), bd = Math.max(.01, box.max.z - box.min.z), k = Math.min(100, 1600 / Math.max(bw, bd));
    const W = clamp(Math.round(bw * k), 16, 1600), H = clamp(Math.round(bd * k), 16, 1600);
    fitTop(W, H, true);
    R.setPixelRatio(1); R.setSize(W, H, false); R.render(scene, camTop);
    const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(cv, 0, 0);
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); S.W = 0; draw();
    return { url: imgUrl(c, { fixed: true }), b: [box.min.x - S.ax, box.min.z - S.az, box.max.x - S.ax, box.max.z - S.az].map(v => Math.round(v * 1000) / 1000), h: Math.round(box.max.y * 100) / 100 };
  }
  async function save() {
    if (!S.t || S.busy) return;
    const id = ed ? ed.id : uid('e'), k = m3Key('s', id), pic = renderPic();
    const d = {
      id, n: ($o('#e3Name').value || '').trim().slice(0, 80) || 'Escenario', loc: opts.loc || (ed && ed.loc) || '', v: Date.now(),
      u: S.u, sc: sc(), zup: S.zup || undefined, rot: S.rot, flr: +S.flr.toFixed(5), mx: +S.mx.toFixed(5), mz: +S.mz.toFixed(5),
      fl: +(S.flr * sc()).toFixed(4), ax: +S.ax.toFixed(4), az: +S.az.toFixed(4), b: pic.b, h: pic.h, int: S.int || undefined,
      tris: S.t.H.tris, kb: S.pk ? S.pk.kb : (ed && ed.kb) || 0, cut: (S.pk ? S.pk.cut : ed && ed.cut) || undefined, from: (S.pk ? S.pk.cut && Math.round(S.pk.from) : ed && ed.from) || undefined,
    };
    for (const f in d) if (d[f] === undefined) delete d[f];
    const ok = $o('#e3Ok'); ok.disabled = true; S.busy = 'Guardando…'; paint();
    try {
      if (S.own) {
        await m3Save(k, S.url);
        // la ventana ya lo abrió: queda como la plantilla de esa clave (no se vuelve a abrir)
        const old = M3.tpl.get(k); if (old && old.t && old.t !== S.t) m3Dispose(old.t);
        M3.tpl.set(k, { sig: m3Sig(S.url), t: S.t, p: Promise.resolve(S.t) }); S.own = false;
      }
      const pk = set3dPicKey(id); FRAMES[pk] = pic.url; IMGS.delete(pk);
      await Store.saveFrame(P.id, pk, pic.url);
    } catch (e) { S.busy = ''; paint(); problem('No se pudo guardar el escenario 3D: ' + ((e && e.message) || 'inténtalo de nuevo') + '.'); return; }
    P.sets3d = P.sets3d || {}; P.sets3d[id] = d;
    const applyLoc = !!(opts.loc && $o('#e3Loc') && $o('#e3Loc').checked);
    if (opts.loc) { P.locSet3d = P.locSet3d || {}; if (applyLoc) P.locSet3d[opts.loc] = id; else if (P.locSet3d[opts.loc] === id) delete P.locSet3d[opts.loc]; }
    S.saved = true; close();
    if (done) done(id, applyLoc);
  }
  // ---------- cerrar ----------
  function close() {
    removeEventListener('keydown', onEsc, true);
    if (ro) ro.disconnect();
    for (const m of [...mats3, ...matsTop.flat()]) if (m) m.dispose();
    if (lineMat) lineMat.dispose();
    for (const x of own) x.dispose();
    if (S.own && S.t) m3Dispose(S.t);
    if (R) { R.dispose(); R.forceContextLoss(); }
    ov.remove();
  }
  const req = guardOverlay(ov, { dirty: () => !S.saved && (S.changed || !!(S.own && S.t)), close, save: () => save() });
  const onEsc = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); req('esc'); } };
  addEventListener('keydown', onEsc, true);
  // ---------- eventos ----------
  ov.addEventListener('click', e => {
    if (e.target === ov) { req('fuera'); return; }
    if (e.target.closest('[data-x]')) { req('x'); return; }
    if (e.target.closest('#e3Pick') || e.target.closest('#e3Swap')) { pick(); return; }
    if (e.target.closest('#e3Ok')) { save(); return; }
    const v = e.target.closest('[data-v]'); if (v) { S.view = v.dataset.v; paint(); draw(); return; }
    if (!S.t) return;
    const up = e.target.closest('[data-up]');
    if (up && +up.dataset.up !== +S.zup) { S.zup = up.dataset.up === '1'; S.changed = true; afterLoad(true); return; }
    const i = e.target.closest('[data-in]'); if (i) { S.int = i.dataset.in === '1'; S.changed = true; paint(); draw(); return; }
    const lv = e.target.closest('[data-lv]'); if (lv) { S.flr = S.fl.levels[+lv.dataset.lv]; S.changed = true; paint(); draw(); return; }
  });
  ov.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'e3Rot') { S.rot = +t.value; S.changed = true; $o('#e3RotO').textContent = `${S.rot}°`; draw(); }
    else if (t.id === 'e3Fl') { S.flr = +t.value; S.changed = true; paint(); draw(); }
    else if (t.id === 'e3Name') { S.name = t.value; S.changed = true; }
    else if (t.id === 'e3Roof') { S.roof = t.checked; draw(); }
  });
  ov.addEventListener('change', e => { if (e.target.id === 'e3Unit') { S.u = e.target.value; S.changed = true; S.dist = 0; paint(); draw(); } });
  // planta: tocar o arrastrar marca la acción; 3D: arrastrar gira, la rueda acerca
  let drag = null;
  oc.addEventListener('pointerdown', e => {
    if (!S.t || e.button > 0) return;
    oc.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, yaw: S.yaw, pitch: S.pitch };
    if (S.view === 'top') mark(e);
  });
  oc.addEventListener('pointermove', e => {
    if (!drag) return;
    if (S.view === 'top') { mark(e); return; }
    S.yaw = drag.yaw - (e.clientX - drag.x) * .4; S.pitch = clamp(drag.pitch + (e.clientY - drag.y) * .3, 4, 88); draw();
  });
  const end = () => { if (drag && S.view === 'top') { floorAt(); draw(); } drag = null; };
  oc.addEventListener('pointerup', end); oc.addEventListener('pointercancel', end);
  oc.addEventListener('wheel', e => { if (!S.t || S.view === 'top') return; e.preventDefault(); S.dist = clamp(S.dist * Math.exp(e.deltaY * .0012), .8, 2000); draw(); }, { passive: false });
  // con el teclado: las flechas mueven el punto (10 cm; con Mayús, 1 m)
  oc.tabIndex = 0; oc.setAttribute('role', 'application'); oc.setAttribute('aria-label', 'Planta del escenario. Las flechas mueven el punto de la acción.');
  oc.addEventListener('keydown', e => {
    const dx = { ArrowLeft: -1, ArrowRight: 1 }[e.key] || 0, dz = { ArrowUp: -1, ArrowDown: 1 }[e.key] || 0;
    if (!S.t || S.view !== 'top' || (!dx && !dz)) return;
    e.preventDefault(); const st = e.shiftKey ? 1 : .1;
    const p = hold.worldToLocal(new T.Vector3(S.ax + dx * st, 0, S.az + dz * st)); S.mx = p.x; S.mz = p.z; S.changed = true; floorAt(); draw();
  });
  /* el piso bajo el punto de la acción: de las superficies horizontales que hay ahí (piso, mesa, techo), la más cercana
     al piso de ahora. Así, en un terreno con desniveles, la figura queda parada donde se marcó */
  function floorAt(max = Infinity) {
    place();
    const ray = new T.Raycaster(new T.Vector3(S.ax, box.max.y + 1, S.az), new T.Vector3(0, -1, 0));
    const hits = ray.intersectObjects(meshes3.filter(m => m.isMesh), false).filter(h => h.face && Math.abs(h.face.normal.clone().transformDirection(h.object.matrixWorld).y) > .7);
    if (!hits.length) return;
    const ys = hits.map(h => hold.worldToLocal(h.point.clone()).y);
    const y = ys.reduce((a, b) => Math.abs(b - S.flr) < Math.abs(a - S.flr) ? b : a);
    if (Math.abs(y - S.flr) > 1e-4 && Math.abs(y - S.flr) * sc() <= max) { S.flr = y; paint(); }
  }
  function mark(e) {
    const r = oc.getBoundingClientRect(), V = S.vw; if (!V) return;
    const x = V.cx - V.hw + (e.clientX - r.left) / r.width * 2 * V.hw, z = V.cz - V.hh + (e.clientY - r.top) / r.height * 2 * V.hh;
    const p = hold.worldToLocal(new T.Vector3(x, 0, z));
    S.mx = p.x; S.mz = p.z; S.changed = true; draw();
  }
  // soltar un archivo encima
  wrap.addEventListener('dragover', e => { e.preventDefault(); wrap.classList.add('drop'); });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('drop'));
  wrap.addEventListener('drop', e => { e.preventDefault(); wrap.classList.remove('drop'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) load(f); });
  // ---------- abrir ----------
  paint();
  if (ed) {
    S.busy = 'Abriendo el modelo…'; paint();
    m3TplWait(m3Key('s', ed.id)).then(t => {
      S.busy = '';
      if (!t) { paint(); toast('No se pudo abrir el modelo de este escenario. Vuelve a subir el archivo.', 6000); $o('#e3Drop').hidden = false; return; }
      S.t = t; S.url = FRAMES[m3Key('s', ed.id)] || ''; afterLoad(false);
    });
  }
  return ov;
}
