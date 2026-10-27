/* ============================================================
   UN ESCENARIO IMPORTADO SOBRE UN ENTORNO · lote AD (obs. 2)
   Un escenario 3D importado (escenarios-3d.js: una casa, un muelle, un puesto de mercado) puesto encima de un entorno
   hecho por código: la playa, el bosque, la calle, el exterior abierto… La ubicación es de la locación del guion, como
   la escala del escenario (escenarios-escala.js) y P.locSet3d:
     P.sobre3d = { '<locación>': { id, x, z, r } }
       id: el escenario de P.sets3d; x, z: dónde queda el centro de su planta (m, en la escena); r: su giro (grados)
   Todos los planos de esa locación que usan uno de estos entornos lo ven en el mismo lugar, apoyado en el suelo. Lo del
   entorno que cae donde está el modelo (árboles, rocas, palmeras, bancas, edificios, postes) se esconde: nada lo
   atraviesa. Las figuras pueden estar dentro o fuera. Un plano con el modelo solo (s3.set = 'modelo') sigue como antes.
   Importar un escenario y ponerlo sobre un entorno es de Studio (studioFeat('set3d'), planes.js); lo ya puesto se sigue
   viendo en todos los planos, la planta y los PDF.
   ============================================================ */
const SOBRE_SETS = ['ext', 'calle', 'parque', 'bosque', 'montana', 'playa', 'desierto', 'canaveral', 'jardin_d', 'jardin_t'];
const sobreCan = s3 => !!s3 && SOBRE_SETS.includes(s3.set);
/* ---------- Studio (planes.js; sin esa parte de la app, todo se puede) ---------- */
const set3dStudio = () => typeof studioFeat !== 'function' || !!studioFeat('set3d');
const set3dLock = () => set3dStudio() || typeof studioLockHTML !== 'function' ? '' : studioLockHTML('set3d');
const set3dAsk = () => { if (typeof studioAsk === 'function') studioAsk('set3d'); };

/* ---------- los datos ---------- */
/* lo puesto sobre el entorno de una escena: { d, x, z, r, loc } (null si no hay o el modelo ya no existe) */
function sobreOf(s3) {
  if (!sobreCan(s3) || s3.noSobre || typeof P === 'undefined' || !P || !P.sobre3d) return null;
  const loc = escLocOf(s3), o = Object.hasOwn(P.sobre3d, loc) ? P.sobre3d[loc] : null;
  const d = o && P.sets3d && Object.hasOwn(P.sets3d, o.id) ? P.sets3d[o.id] : null;
  if (!d || !Array.isArray(d.b)) return null;
  return { d, x: +o.x || 0, z: +o.z || 0, r: +o.r || 0, loc };
}
/* poner (v: { id, x, z, r }) o quitar (null) el modelo de una locación */
function sobreSet(loc, v) {
  if (typeof loc !== 'string' || loc === '__proto__') return;
  const R = q => Math.round((+q || 0) * 100) / 100;
  if (v && v.id) { P.sobre3d = P.sobre3d || {}; P.sobre3d[loc] = { id: v.id, x: R(v.x), z: R(v.z), r: sobreDeg(v.r) }; }
  else if (P.sobre3d) { delete P.sobre3d[loc]; if (!Object.keys(P.sobre3d).length) delete P.sobre3d; }
}
const sobreDeg = r => { r = Math.round(+r || 0); return ((r % 360) + 540) % 360 - 180 || 0; };
/* quitar del proyecto un escenario: deja de estar sobre los entornos */
function sobreDrop(id) {
  if (!P.sobre3d) return;
  for (const [l, v] of Object.entries(P.sobre3d)) if (v && v.id === id) delete P.sobre3d[l];
  if (!Object.keys(P.sobre3d).length) delete P.sobre3d;
}
/* la clave del modelo (para esperar que esté abierto antes de una viñeta o un PDF) y su huella para la viñeta */
const sobreKey = s3 => { const o = sobreOf(s3); return o ? m3Key('s', o.d.id) : null; };
const sobreSig = s3 => { const o = sobreOf(s3); return o ? `|s${o.d.id}:${o.d.v}:${o.x},${o.z},${o.r}:${escOf(o.d)}` : ''; };
/* lo que ocupa en la escena: el centro (x, z), las medias medidas de su planta (hw, hd), el giro (a, radianes), la escala
   del escenario (e) y, en c, el centro de su planta medido desde su punto de la acción */
function sobreFoot(o) {
  const e = escOf(o.d), b = o.d.b;
  return { x: o.x, z: o.z, a: o.r * Math.PI / 180, e, hw: (b[2] - b[0]) * e / 2, hd: (b[3] - b[1]) * e / 2, c: [(b[0] + b[2]) / 2 * e, (b[1] + b[3]) / 2 * e] };
}
/* ¿el punto (x, z) de la escena cae dentro de lo que ocupa (con un margen m)? El giro es el de three.js (rotation.y) */
function sobreIn(F, x, z, m = 0) {
  const dx = x - F.x, dz = z - F.z, c = Math.cos(F.a), s = Math.sin(F.a);
  return Math.abs(dx * c - dz * s) <= F.hw + m && Math.abs(dx * s + dz * c) <= F.hd + m;
}
/* ¿la caja [x0, z0, x1, z1] (alineada con la escena) toca lo que ocupa? Ejes separadores: los de la escena y los del modelo */
function sobreBoxHit(F, x0, z0, x1, z1, m = 0) {
  const c = Math.cos(F.a), s = Math.sin(F.a), ux = [c, -s], uz = [s, c];   // los ejes del modelo, en la escena
  const ex = Math.abs(c) * F.hw + Math.abs(s) * F.hd + m, ez = Math.abs(s) * F.hw + Math.abs(c) * F.hd + m;
  if (x1 < F.x - ex || x0 > F.x + ex || z1 < F.z - ez || z0 > F.z + ez) return false;
  const bx = (x0 + x1) / 2 - F.x, bz = (z0 + z1) / 2 - F.z, hx = (x1 - x0) / 2, hz = (z1 - z0) / 2;
  for (const [u, h] of [[ux, F.hw], [uz, F.hd]]) if (Math.abs(bx * u[0] + bz * u[1]) > h + m + hx * Math.abs(u[0]) + hz * Math.abs(u[1])) return false;
  return true;
}
/* al abrir el proyecto y lo que llega del equipo: solo modelos que existen y números en orden */
function sobreNormalize(Px) {
  if (!Px || Px.sobre3d == null) return Px;
  const o = {}, n = (q, a) => { q = +q; return isFinite(q) ? Math.min(a, Math.max(-a, Math.round(q * 100) / 100)) : 0; };
  if (typeof Px.sobre3d === 'object' && !Array.isArray(Px.sobre3d)) for (const [l, v] of Object.entries(Px.sobre3d)) {
    if (!v || typeof v !== 'object' || typeof v.id !== 'string' || l === '__proto__' || l.length > 160) continue;
    if (!Px.sets3d || typeof Px.sets3d !== 'object' || !Object.hasOwn(Px.sets3d, v.id)) continue;
    o[l] = { id: v.id, x: n(v.x, 500), z: n(v.z, 500), r: sobreDeg(n(v.r, 720)) };
  }
  if (Object.keys(o).length) Px.sobre3d = o; else delete Px.sobre3d;
  return Px;
}

/* ---------- en la vista 3D ----------
   Un solo grupo (R3.sobre) que cuelga del entorno visible: así se esconde con él (y con la foto de referencia detrás).
   El entorno puede estar escalado (la escala de la calle o el paisaje de la locación): el grupo lo compensa, el modelo
   lleva la escala de su escenario */
function sobreSync(s3, vis) {
  const o = vis === (s3 && s3.set) ? sobreOf(s3) : null, G = R3.sets[vis];
  let H = R3.sobre;
  if (!o || !G) {
    if (H && H.parent) { H.parent.remove(H); R3.shSig = null; }
    if (G && G.userData.cutSig) { sobreCut(G, null); R3.shSig = null; }
    return;
  }
  const T = THREE, d = o.d, k = m3Key('s', d.id);
  if (!H) { H = R3.sobre = new T.Group(); H.userData.inner = new T.Group(); H.add(H.userData.inner); }
  const U = H.userData;
  const t = m3Tpl(k, U.wait === k ? null : () => { U.wait = null; set3dLate(); });
  if (!t) U.wait = k;
  const key = t ? d.id + ':' + d.v + ':' + ((M3.tpl.get(k) || {}).sig || '') : '';
  if (U.key !== key) {
    U.key = key; U.inner.clear();
    if (t) {
      for (const m of m3Mats(t)) if (!m.polygonOffset) { m.polygonOffset = true; m.polygonOffsetFactor = 1; m.polygonOffsetUnits = 1; }
      U.inner.add(set3dHold(t, d, { cast: true, recv: true }));
    }
    R3.shSig = null;
  }
  const F = sobreFoot(o), ke = G.scale.x || 1;
  if (H.parent !== G) { if (H.parent) H.parent.remove(H); G.add(H); }
  H.position.set(o.x / ke, 0, o.z / ke); H.rotation.set(0, F.a, 0); H.scale.setScalar(1 / ke);
  U.inner.position.set(-F.c[0], 0, -F.c[1]); U.inner.scale.setScalar(F.e);
  const sg = key + '|' + vis + '|' + [o.x, o.z, o.r, F.e, ke].join(',');
  if (U.sg !== sg) { U.sg = sg; R3.shSig = null; }
  if (sobreCut(G, F)) R3.shSig = null;
}
/* esconder lo del entorno G que cae donde está el modelo (F; null: todo de vuelta). Lo grande (el suelo, el mar, la pista,
   las veredas) se queda; lo chico que lo toca se esconde entero (una palmera, una banca, un edificio, un poste); en lo
   repetido (árboles, piedras, cañas: una malla por tipo) se esconden solo los que caen ahí, y lo que está pegado a lo
   escondido (la copa de un árbol cuyo tronco se fue) también; en una malla unida de piezas chicas (las ventanas de los
   edificios), las piezas que caen ahí o en lo escondido. Devuelve true si algo cambió */
const SOBRE_BIG = 30;     // m: lo que mide más que esto de lado es suelo, mar, pista o vereda
function sobreCut(G, F) {
  const U = G.userData, sig = F ? [F.x, F.z, F.a, F.hw, F.hd, G.scale.x].map(v => Math.round(v * 1000)).join(',') : '';
  if ((U.cutSig || '') === sig) return false;
  const C = U.cut;
  if (C) {
    for (const o of C.hid) o.visible = true;
    for (const [im, m0] of C.inst) { im.instanceMatrix.array.set(m0); im.instanceMatrix.needsUpdate = true; }
    for (const [g, i0] of C.idx) g.setIndex(i0);
  }
  U.cut = null; U.cutSig = sig;
  if (!F) return true;
  const T = THREE, cut = U.cut = { hid: [], inst: [], idx: [] }, box = new T.Box3(), v = new T.Vector3(), hidBox = [], merged = [], seen = new Set();
  G.updateMatrixWorld(true);
  const inst = [];   // [malla, posiciones en la escena, radio de cada una]
  const walk = par => {
    for (const o of par.children) {
      // (la cuadrícula del exterior abierto es una guía: se queda)
      if (o === R3.sobre || !o.visible || o.isLine || o.isSprite) continue;
      if (o.isInstancedMesh) {
        const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
        const gb = g.boundingBox, gr = Math.max(Math.abs(gb.min.x), Math.abs(gb.max.x), Math.abs(gb.min.z), Math.abs(gb.max.z)), A = o.instanceMatrix.array, n = o.count, pos = new Float32Array(n * 2), rad = new Float32Array(n);
        const W = o.matrixWorld.elements, ws = Math.hypot(W[0], W[1], W[2]);
        for (let i = 0; i < n; i++) {
          const j = i * 16; v.set(A[j + 12], A[j + 13], A[j + 14]).applyMatrix4(o.matrixWorld);
          pos[i * 2] = v.x; pos[i * 2 + 1] = v.z;
          rad[i] = gr * Math.max(Math.hypot(A[j], A[j + 1], A[j + 2]), Math.hypot(A[j + 8], A[j + 9], A[j + 10])) * ws;
        }
        inst.push([o, pos, rad]); continue;
      }
      box.setFromObject(o);
      if (box.isEmpty()) continue;
      const big = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) > SOBRE_BIG;
      if (!big) {
        if (sobreBoxHit(F, box.min.x, box.min.z, box.max.x, box.max.z)) { o.visible = false; cut.hid.push(o); hidBox.push([box.min.x, box.min.z, box.max.x, box.max.z]); }
        continue;
      }
      if (o.isMesh) { if (!seen.has(o.geometry)) { seen.add(o.geometry); merged.push(o); } continue; }
      walk(o);
    }
  };
  walk(G);
  // lo repetido: primero lo que cae dentro; después lo pegado a eso (a menos de 0,8 m), en una cuadrícula de 1 m
  const out = new Map(), cell = (x, z) => Math.floor(x) + ',' + Math.floor(z), near = [];
  for (const [o, pos, rad] of inst) {
    const off = [];
    for (let i = 0; i < o.count; i++) if (sobreIn(F, pos[i * 2], pos[i * 2 + 1], rad[i])) { off.push(i); near.push([pos[i * 2], pos[i * 2 + 1]]); }
    out.set(o, new Set(off));
  }
  const grid = new Map(); for (const [x, z] of near) { const k = cell(x, z); (grid.get(k) || grid.set(k, []).get(k)).push([x, z]); }
  const touch = (x, z) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const [px, pz] of grid.get(cell(x + a, z + b)) || []) if (Math.hypot(px - x, pz - z) < .8) return true; return false; };
  const Z = new T.Matrix4().makeScale(0, 0, 0).elements;
  for (const [o, pos] of inst) {
    const off = out.get(o);
    if (near.length) for (let i = 0; i < o.count; i++) if (!off.has(i) && touch(pos[i * 2], pos[i * 2 + 1])) off.add(i);
    if (!off.size) continue;
    const A = o.instanceMatrix.array; cut.inst.push([o, A.slice()]);
    for (const i of off) A.set(Z, i * 16);
    o.instanceMatrix.needsUpdate = true;
  }
  // mallas unidas de piezas chicas: las piezas que caen dentro o en lo escondido
  for (const o of merged) {
    const g = o.geometry, I = g.index; if (!I || I.count < 24) continue;
    const P3 = g.attributes.position, M = o.matrixWorld, a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), keep = [];
    let small = true, drop = 0;
    for (let i = 0; i < I.count && small; i += 3) {
      a.fromBufferAttribute(P3, I.getX(i)).applyMatrix4(M); b.fromBufferAttribute(P3, I.getX(i + 1)).applyMatrix4(M); c.fromBufferAttribute(P3, I.getX(i + 2)).applyMatrix4(M);
      if (Math.max(a.x, b.x, c.x) - Math.min(a.x, b.x, c.x) > 3 || Math.max(a.z, b.z, c.z) - Math.min(a.z, b.z, c.z) > 3) { small = false; break; }
      const x = (a.x + b.x + c.x) / 3, z = (a.z + b.z + c.z) / 3;
      if (sobreIn(F, x, z, .05) || hidBox.some(q => x >= q[0] - .1 && x <= q[2] + .1 && z >= q[1] - .1 && z <= q[3] + .1)) drop++;
      else keep.push(I.getX(i), I.getX(i + 1), I.getX(i + 2));
    }
    if (!small || !drop) continue;
    cut.idx.push([g, I]); g.setIndex(new T.BufferAttribute(new (I.array.constructor)(keep), 1));
  }
  return true;
}

/* ---------- en la planta (la del plano, la general y la del PDF) ----------
   La llama set3dDrawPlan: el dibujo de la planta del modelo (la vista desde arriba cortada a 1,5 m), girado y en su
   lugar, sobre el entorno */
function sobreDrawPlan(ctx, s3, toS, redraw) {
  const o = sobreOf(s3); if (!o) return;
  sobrePaint(ctx, o.d, sobreFoot(o), toS, redraw, .72);
}
function sobrePaint(ctx, d, F, toS, redraw, alpha) {
  const [sx, sy] = toS(F.x, F.z), sc = toS(1, 0)[0] - toS(0, 0)[0], w = 2 * F.hw * sc, h = 2 * F.hd * sc;
  const im = set3dPic(d, redraw);
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(-F.a);
  if (im) { ctx.globalAlpha = alpha; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, -w / 2, -h / 2, w, h); }
  else { ctx.fillStyle = 'rgba(91,96,112,.08)'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeStyle = PLAN_C.muted; ctx.lineWidth = 1; ctx.setLineDash([5, 4]); ctx.strokeRect(-w / 2, -h / 2, w, h); }
  ctx.restore();
}

/* ---------- la ventana para ubicarlo ----------
   La vista desde arriba con su cuadrícula (1 m; 5 m más marcada), el entorno, las figuras y la cámara del plano (de
   referencia) y el modelo: se arrastra para moverlo (de 10 en 10 cm; con Mayús, libre) y su asa redonda lo gira (de 15° en
   15°; con Mayús, libre). Arrastrar el fondo mueve la vista y la rueda acerca. Con el teclado: las flechas lo mueven
   (10 cm; con Mayús, 1 m) y Q / E lo giran.
   o: { loc, id, x?, z?, r?, s3: la escena del plano, st: su estado (figuras y cámara) }. done({ x, z, r }) */
function openSobrePlacer(o, done) {
  const d = P.sets3d && P.sets3d[o.id]; if (!d || !Array.isArray(d.b)) return;
  const F0 = sobreFoot({ d, x: 0, z: 0, r: 0 });
  // sin lugar todavía: donde queda su punto de la acción en el centro de la escena (como si fuera el escenario solo)
  const S = { x: o.x != null ? o.x : F0.c[0], z: o.z != null ? o.z : F0.c[1], r: o.r || 0, isNew: o.x == null, changed: false, drag: null };
  const env = escLocSet({ set: o.s3.set, noSobre: true, objs: [], keys: [] }, o.loc);
  const ov = document.createElement('div');
  ov.className = 'modal fp-modal so-modal'; ov.id = 'soModal';
  const title = `Ubicar «${d.n}»`;
  ov.innerHTML = `<div class="dlg wide" role="dialog" aria-modal="true" aria-label="${ea(title)}">
    <header><h2>${esc(title)}</h2><button class="btn ghost sm" data-x aria-label="Cerrar">${ICO.close}</button></header>
    <div class="body"><div class="so">
      <div class="so-l">
        <div class="so-cv" id="soWrap"><canvas id="soC" tabindex="0" role="application" aria-label="${ea('Vista desde arriba. Las flechas mueven el modelo; Q y E lo giran.')}"></canvas>
          <div class="so-zoom"><button class="icbtn" data-z="-1" aria-label="Alejar" title="Alejar">−</button><button class="icbtn" data-z="1" aria-label="Acercar" title="Acercar">+</button><button class="icbtn" data-z="0" aria-label="Ver todo" title="Ver todo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div></div>
        <p class="hint so-hint">Arrastra el modelo para moverlo y el asa redonda para girarlo (de 15° en 15°; con Mayús, libre). Arrastra el fondo para mover la vista.</p>
      </div>
      <div class="so-r">
        <div class="e3-info"><span><b>${esc(d.n)}</b><small>${esc(`${set3dM(2 * F0.hw)} × ${set3dM(2 * F0.hd)} m`)}</small></span></div>
        <label class="rr"><span>Giro</span><input type="range" id="soRot" min="-180" max="180" step="1" value="${ea(S.r)}" aria-label="Giro del modelo"><output id="soRotO" class="tnum"></output></label>
        <button class="btn sm ghost so-c" id="soMid" title="Su punto de la acción en el centro de la escena, sin giro">Al centro de la escena</button>
        <p class="hint" style="margin:0">Lo del entorno que queda debajo del modelo (árboles, rocas, palmeras…) se quita.</p>
        <p class="hint" style="margin:0">${esc(`Todos los planos de ${titleCase(o.loc || '') || 'esta locación'} con un entorno lo ven en este lugar.`)}</p>
      </div></div></div>
    <footer><button class="btn" data-x>Cancelar</button><button class="btn primary" id="soOk">Listo</button></footer></div>`;
  document.body.appendChild(ov);
  const $o = s => ov.querySelector(s), cv = $o('#soC'), wrap = $o('#soWrap'), ctx = cv.getContext('2d');
  const V = { x: 0, z: 0, sc: 20, W: 0, H: 0, dpr: 1 };
  const toS = (x, z) => [V.W / 2 + (x - V.x) * V.sc, V.H / 2 + (z - V.z) * V.sc];
  const toW = (sx, sy) => [V.x + (sx - V.W / 2) / V.sc, V.z + (sy - V.H / 2) / V.sc];
  const foot = () => sobreFoot({ d, x: S.x, z: S.z, r: S.r });
  // las figuras y la cámara del plano, de referencia
  const st = o.st || null, acts = st ? o.s3.objs.filter(b => b.kind === 'actor' && st.o[b.id]).map(b => ({ p: st.o[b.id], n: b.name || '', c: b.color || '#7B8089' })) : [];
  function resize() {
    const r = wrap.getBoundingClientRect();
    V.dpr = Math.min(2, window.devicePixelRatio || 1); V.W = Math.max(50, r.width); V.H = Math.max(50, r.height);
    cv.width = Math.round(V.W * V.dpr); cv.height = Math.round(V.H * V.dpr);
  }
  function fit() {
    resize();
    const F = foot(), c = Math.cos(F.a), s = Math.sin(F.a), pts = [[0, 0]];
    for (const [u, w] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) pts.push([F.x + u * F.hw * c + w * F.hd * s, F.z - u * F.hw * s + w * F.hd * c]);
    for (const a of acts) pts.push([a.p.x, a.p.z]);
    if (st && st.cam) pts.push([st.cam.x, st.cam.z]);
    const x0 = Math.min(...pts.map(p => p[0])) - 2, x1 = Math.max(...pts.map(p => p[0])) + 2, z0 = Math.min(...pts.map(p => p[1])) - 2, z1 = Math.max(...pts.map(p => p[1])) + 2;
    V.sc = clamp(Math.min((V.W - 40) / (x1 - x0), (V.H - 60) / (z1 - z0)), 3, 160);
    V.x = (x0 + x1) / 2; V.z = (z0 + z1) / 2 + 10 / V.sc;
    draw();
  }
  // el asa: arriba del modelo (su lado de atrás), a unos 30 px
  function handle(F) {
    const L = F.hd + Math.max(30, 1 * V.sc) / V.sc, c = Math.cos(F.a), s = Math.sin(F.a);
    return toS(F.x - L * s, F.z - L * c);
  }
  function draw() {
    if (!V.W) resize();
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    ctx.fillStyle = PLAN_C.bg; ctx.fillRect(0, 0, V.W, V.H);
    planDrawSet(ctx, env, V, toS, draw);
    // la cuadrícula: cada metro y, más marcada, cada 5 m (lejos, solo la de 5 m)
    const [wx0, wz0] = toW(0, 0), [wx1, wz1] = toW(V.W, V.H);
    for (const step of V.sc >= 9 ? [1, 5] : [5]) {
      ctx.strokeStyle = step === 5 ? 'rgba(60,56,48,.16)' : 'rgba(60,56,48,.07)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = Math.ceil(wx0 / step) * step; x <= wx1; x += step) { if (step === 1 && x % 5 === 0) continue; const X = Math.round(toS(x, 0)[0]) + .5; ctx.moveTo(X, 0); ctx.lineTo(X, V.H); }
      for (let z = Math.ceil(wz0 / step) * step; z <= wz1; z += step) { if (step === 1 && z % 5 === 0) continue; const Y = Math.round(toS(0, z)[1]) + .5; ctx.moveTo(0, Y); ctx.lineTo(V.W, Y); }
      ctx.stroke();
    }
    // el centro de la escena (donde se paran las figuras al armarse solas)
    const [ox, oy] = toS(0, 0);
    ctx.strokeStyle = '#C8382C'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(ox - 7, oy); ctx.lineTo(ox + 7, oy); ctx.moveTo(ox, oy - 7); ctx.lineTo(ox, oy + 7); ctx.stroke();
    // el modelo, con su contorno y el asa para girarlo
    const F = foot(), [sx, sy] = toS(F.x, F.z), w = 2 * F.hw * V.sc, h = 2 * F.hd * V.sc;
    sobrePaint(ctx, d, F, toS, draw, .85);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-F.a);
    ctx.strokeStyle = '#2C47CF'; ctx.lineWidth = 2; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
    const [hx, hy] = handle(F), [tx, ty] = toS(F.x - F.hd * Math.sin(F.a), F.z - F.hd * Math.cos(F.a));
    ctx.strokeStyle = '#2C47CF'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(hx, hy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy, 4, -Math.PI * .9, Math.PI * .45); ctx.stroke();
    // las figuras y la cámara del plano
    ctx.font = '600 10px Archivo, Arial, sans-serif'; ctx.textAlign = 'center';
    for (const a of acts) {
      const [x, y] = toS(a.p.x, a.p.z), r = Math.max(4, .22 * V.sc);
      ctx.fillStyle = a.c; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (a.n) { ctx.fillStyle = PLAN_C.ink; ctx.fillText(a.n, x, y - r - 4); }
    }
    if (st && st.cam) {
      const [cx, cy] = toS(st.cam.x, st.cam.z);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-st.cam.yaw * Math.PI / 180); ctx.fillStyle = PLAN_C.cam; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.rect(-7, -2, 14, 10); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-7, -8); ctx.lineTo(7, -8); ctx.lineTo(5, -2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    // la escala: el largo redondo que ocupa unos 90 px
    const nice = [.5, 1, 2, 5, 10, 20, 50, 100, 200].find(x => x >= 90 / V.sc * .6) || 500, px = nice * V.sc, H = V.H;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(10, H - 30, px + 12, 22);
    ctx.strokeStyle = '#26262B'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, H - 14); ctx.lineTo(16 + px, H - 14); ctx.moveTo(16, H - 19); ctx.lineTo(16, H - 9); ctx.moveTo(16 + px, H - 19); ctx.lineTo(16 + px, H - 9); ctx.stroke();
    ctx.fillStyle = '#26262B'; ctx.textAlign = 'center'; ctx.fillText(`${String(nice).replace('.', ',')} m`, 16 + px / 2, H - 18);
    $o('#soRot').value = S.r; $o('#soRotO').textContent = `${S.r}°`;
  }
  const snap = (v, e) => e.shiftKey ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10;
  const rotSnap = (deg, e) => sobreDeg(e.shiftKey ? deg : Math.round(deg / 15) * 15);
  const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    cv.setPointerCapture(e.pointerId);
    const [px, py] = pt(e), F = foot(), [hx, hy] = handle(F), [wx, wz] = toW(px, py);
    if (Math.hypot(px - hx, py - hy) <= (e.pointerType === 'touch' ? 22 : 14)) S.drag = { k: 'rot' };
    else if (sobreIn(F, wx, wz)) S.drag = { k: 'move', dx: S.x - wx, dz: S.z - wz };
    else S.drag = { k: 'pan', px, py, x: V.x, z: V.z };
    cv.style.cursor = S.drag.k === 'pan' ? 'grabbing' : S.drag.k === 'move' ? 'move' : 'crosshair';
  });
  cv.addEventListener('pointermove', e => {
    const [px, py] = pt(e), D = S.drag;
    if (!D) { const F = foot(), [hx, hy] = handle(F), [wx, wz] = toW(px, py); cv.style.cursor = Math.hypot(px - hx, py - hy) <= 14 ? 'crosshair' : sobreIn(F, wx, wz) ? 'move' : 'grab'; return; }
    if (D.k === 'pan') { V.x = D.x - (px - D.px) / V.sc; V.z = D.z - (py - D.py) / V.sc; draw(); return; }
    const [wx, wz] = toW(px, py);
    if (D.k === 'move') { S.x = snap(wx + D.dx, e); S.z = snap(wz + D.dz, e); }
    // el asa va «atrás» del modelo (-z del modelo): el giro es el ángulo del puntero visto desde el centro
    else S.r = rotSnap(Math.atan2(-(wx - S.x), -(wz - S.z)) * 180 / Math.PI, e);
    S.changed = true; draw();
  });
  const end = () => { S.drag = null; cv.style.cursor = ''; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    const [px, py] = pt(e), [wx, wz] = toW(px, py);
    V.sc = clamp(V.sc * Math.exp(-e.deltaY * .0015), 3, 200);
    V.x = wx - (px - V.W / 2) / V.sc; V.z = wz - (py - V.H / 2) / V.sc; draw();
  }, { passive: false });
  cv.addEventListener('keydown', e => {
    const dx = { ArrowLeft: -1, ArrowRight: 1 }[e.key] || 0, dz = { ArrowUp: -1, ArrowDown: 1 }[e.key] || 0, k = e.key.toLowerCase(), st0 = e.shiftKey ? 1 : .1;
    if (dx || dz) { e.preventDefault(); S.x = Math.round((S.x + dx * st0) * 100) / 100; S.z = Math.round((S.z + dz * st0) * 100) / 100; S.changed = true; draw(); }
    else if (k === 'q' || k === 'e') { e.preventDefault(); S.r = sobreDeg(S.r + (k === 'q' ? 15 : -15)); S.changed = true; draw(); }
  });
  ov.addEventListener('input', e => { if (e.target.id === 'soRot') { S.r = sobreDeg(e.target.value); S.changed = true; draw(); } });
  const ro = new ResizeObserver(() => { resize(); draw(); }); ro.observe(wrap);
  function close() { removeEventListener('keydown', onEsc, true); ro.disconnect(); ov.remove(); }
  const save = () => { close(); done({ x: Math.round(S.x * 100) / 100, z: Math.round(S.z * 100) / 100, r: sobreDeg(S.r) }); };
  const req = guardOverlay(ov, { dirty: () => S.changed, close, save });
  const onEsc = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); req('esc'); } };
  addEventListener('keydown', onEsc, true);
  ov.addEventListener('click', e => {
    if (e.target === ov) { req('fuera'); return; }
    if (e.target.closest('[data-x]')) { req('x'); return; }
    if (e.target.closest('#soOk')) { save(); return; }
    if (e.target.closest('#soMid')) { S.x = F0.c[0]; S.z = F0.c[1]; S.r = 0; S.changed = true; fit(); return; }
    const z = e.target.closest('[data-z]');
    if (z) { if (z.dataset.z === '0') fit(); else { V.sc = clamp(V.sc * (z.dataset.z === '1' ? 1.4 : 1 / 1.4), 3, 200); draw(); } }
  });
  requestAnimationFrame(() => { fit(); cv.focus({ preventScroll: true }); });
  return ov;
}

if (typeof module !== 'undefined') module.exports = { sobreNormalize, sobreOf, sobreSet, sobreFoot, sobreIn, sobreBoxHit, sobreDeg, SOBRE_SETS };
