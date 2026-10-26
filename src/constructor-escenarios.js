/* ============================================================
   CONSTRUCTOR DE ESCENARIOS · lote W
   Un editor con la planta sobre una cuadrícula en metros y una vista 3D de prueba. Se dibujan muros (arrastrando: de
   punta a punta, con su grosor y su alto), el piso (su contorno, punto por punto), puertas y ventanas que abren hueco en
   el muro, volúmenes (mostradores, tarimas, columnas) y los muebles, objetos y luces del catálogo del editor 3D. Lo
   elegido se mueve arrastrando, se ajusta en el panel y se borra. Deshacer y rehacer dentro del editor.
   Guarda en P.sets3d[id] (kind 'c', escenarios-construidos.js) con su nombre y, si se pide, para toda una locación
   (P.locSet3d). En el teléfono se ve (solo mirar) y se asigna; se construye en la computadora.
   openSetBuilder({ id, loc, name, int, from: datos ya armados (la réplica de un importado) }, done(id, applyLoc))
   ============================================================ */
const SB_TOOLS = [['sel', 'Elegir', '<path d="M5 3l14 8-6 1.6L10 19z"/>'], ['wall', 'Muro', '<path d="M3 17h18M3 12h18M3 7h18M8 7v5M16 7v5M12 12v5"/>'],
  ['door', 'Puerta', '<path d="M4 20h16M6 20V5h9v15"/><path d="M6 5a9 9 0 0 1 9 9" stroke-dasharray="2 2"/>'], ['win', 'Ventana', '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M12 5v14M4 12h16"/>'],
  ['floor', 'Piso', '<path d="M4 18 8 6h12l-4 12z"/>'], ['vol', 'Volumen', '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>'], ['add', 'Mueble u objeto', '<path d="M12 5v14M5 12h14"/>']];
const SB_COLORS = ['#E9E5DD', '#F3EEE3', '#DCE4E7', '#E2D5C3', '#C9B79C', '#B9C4B1', '#9AA5B1', '#7C6F64', '#D7C9B8', '#EFE3D0'];
const SB_FLOORS = ['#DAD5CC', '#C49B72', '#A87E58', '#E6E0D2', '#CBC9C2', '#9E9A92', '#6F6A63', '#B8C2AC'];
const SB_SNAP = .05;   // la cuadrícula de 5 cm (con Mayús, libre)
/* ¿se puede construir aquí? (una pantalla angosta o solo dedo, no: se mira y se asigna) */
const sbCanBuild = () => !(matchMedia('(max-width: 760px)').matches || (matchMedia('(pointer:coarse)').matches && !matchMedia('(any-pointer:fine)').matches));

function openSetBuilder(opts = {}, done) {
  if (!r3Init()) { toast('Este equipo no puede mostrar 3D.'); return; }
  const ed0 = opts.id && P.sets3d && P.sets3d[opts.id] && bsIs(P.sets3d[opts.id]) ? P.sets3d[opts.id] : null;
  const view = UI.readOnly || !sbCanBuild();
  const T = THREE;
  const B = { d: bsClean(JSON.parse(JSON.stringify(opts.from || ed0 || bsNew(opts.name || 'Escenario', opts.loc)))), hist: [], fut: [], tool: view ? 'view' : 'sel', sel: null, v3: false, saved: false, changed: !!opts.from, draft: null };
  if (opts.int != null && !ed0 && !opts.from) B.d.int = !!opts.int;
  B.d.loc = B.d.loc || opts.loc || '';
  const locs = sbLocs(), L0 = opts.loc || B.d.loc || '';
  const locNow = L0 && ed0 ? (P.locSet3d || {})[L0] === ed0.id : !!L0;
  const ov = document.createElement('div');
  ov.className = 'modal fp-modal sb-modal'; ov.id = 'sbModal';
  const title = view ? (ed0 ? ed0.n : 'Escenario construido') : ed0 ? 'Editar escenario' : 'Constructor de escenarios';
  ov.innerHTML = `<div class="dlg wide sb-dlg" role="dialog" aria-modal="true" aria-label="${ea(title)}">
    <header><h2>${esc(title)}</h2><button class="btn ghost sm" data-x aria-label="Cerrar">${ICO.close}</button></header>
    <div class="body"><div class="sb">
      <div class="sb-l">
        <div class="sb-bar">
          ${view ? '' : `<div class="seg sb-tools" role="toolbar" aria-label="Herramientas">${SB_TOOLS.map(([k, n, ic]) => `<button data-t="${k}" aria-pressed="${ea(k === B.tool)}" title="${ea(n)}" aria-label="${ea(n)}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ic}</svg><span>${esc(n)}</span></button>`).join('')}</div>
          <span class="sb-sep"></span><button class="icbtn" data-u="-1" title="Deshacer (Ctrl+Z)" aria-label="Deshacer"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg></button><button class="icbtn" data-u="1" title="Rehacer" aria-label="Rehacer"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/></svg></button>`}
          <span class="grow"></span>
          <div class="seg" role="group" aria-label="Vista"><button data-v="0" aria-pressed="true">Planta</button><button data-v="1" aria-pressed="false">3D</button></div>
        </div>
        <div class="sb-cv" id="sbWrap"><canvas id="sbC" tabindex="0" aria-label="Planta del escenario"></canvas><canvas id="sb3" hidden></canvas>
          <div class="sb-zoom"><button class="icbtn" data-z="-1" aria-label="Alejar">−</button><button class="icbtn" data-z="1" aria-label="Acercar">+</button><button class="icbtn" data-z="0" aria-label="Ver todo" title="Ver todo"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div></div>
        <p class="hint sb-hint" id="sbHint"></p>
      </div>
      <div class="sb-r" id="sbR"></div>
    </div></div>
    <footer><span class="left hint" id="sbCount"></span><button class="btn" data-x>${view ? 'Cerrar' : 'Cancelar'}</button>${UI.readOnly ? '' : `<button class="btn primary" id="sbOk">${view ? 'Guardar' : ed0 ? 'Guardar' : 'Guardar escenario'}</button>`}</footer></div>`;
  document.body.appendChild(ov);
  const $o = s => ov.querySelector(s);
  const cv = $o('#sbC'), c3 = $o('#sb3'), wrap = $o('#sbWrap'), g = cv.getContext('2d');
  const V = { x: 0, z: 0, sc: 40, W: 0, H: 0, dpr: 1 };
  const toS = (x, z) => [V.W / 2 + (x - V.x) * V.sc, V.H / 2 + (z - V.z) * V.sc];
  const toW = (sx, sy) => [V.x + (sx - V.W / 2) / V.sc, V.z + (sy - V.H / 2) / V.sc];
  const snap = (v, e) => e && e.shiftKey ? bsR(v) : Math.round(v / SB_SNAP) * SB_SNAP;

  // ---------- deshacer ----------
  const cur = () => JSON.stringify(B.d);
  function step() { B.hist.push(cur()); if (B.hist.length > 80) B.hist.shift(); B.fut = []; B.changed = true; }
  function undo(dir) {
    const from = dir < 0 ? B.hist : B.fut, to = dir < 0 ? B.fut : B.hist;
    if (!from.length) return;
    to.push(cur()); B.d = JSON.parse(from.pop()); B.sel = null; B.draft = null; B.changed = true;
    paint(); draw();
  }
  const sel = () => {
    const s = B.sel; if (!s) return null;
    if (s.t === 'w') return B.d.walls[s.i] ? { ...s, w: B.d.walls[s.i] } : null;
    if (s.t === 'o') { const w = B.d.walls[s.i]; return w && w.o[s.j] ? { ...s, w, o: w.o[s.j] } : null; }
    if (s.t === 'it') return B.d.items[s.i] ? { ...s, it: B.d.items[s.i] } : null;
    if (s.t === 'fl') return B.d.floor.length >= 3 ? s : null;
    return null;
  };
  const full = () => bsCount(B.d) >= BS_MAX;
  const fullMsg = () => toast(`Este escenario llegó al tope de ${BS_MAX} piezas. Quita alguna o arma otro escenario.`, 5000);

  // ---------- la planta ----------
  function resize() {
    const r = wrap.getBoundingClientRect();
    V.dpr = Math.min(2, devicePixelRatio || 1); V.W = Math.max(100, r.width); V.H = Math.max(100, r.height);
    cv.width = Math.round(V.W * V.dpr); cv.height = Math.round(V.H * V.dpr);
  }
  function fit() {
    resize();
    const bb = bsBounds(B.d).b, emp = !(B.d.walls.length || B.d.items.length || B.d.floor.length);
    const [x0, z0, x1, z1] = emp ? [-4, -3, 4, 3] : [bb[0] - 1, bb[1] - 1, bb[2] + 1, bb[3] + 1];
    V.sc = clamp(Math.min(V.W / (x1 - x0), V.H / (z1 - z0)), 8, 200); V.x = (x0 + x1) / 2; V.z = (z0 + z1) / 2;
    draw();
  }
  function grid() {
    const [a, b] = toW(0, 0), [c, e] = toW(V.W, V.H);
    const step1 = V.sc >= 30 ? 1 : V.sc >= 10 ? 5 : 10, fine = V.sc >= 60 ? .5 : 0;
    g.lineWidth = 1;
    for (const [st, col] of [[fine, '#EEEBE4'], [step1, '#DDD8CE']]) {
      if (!st) continue;
      g.strokeStyle = col; g.beginPath();
      for (let x = Math.ceil(a / st) * st; x <= c; x += st) { const [sx] = toS(x, 0); g.moveTo(Math.round(sx) + .5, 0); g.lineTo(Math.round(sx) + .5, V.H); }
      for (let z = Math.ceil(b / st) * st; z <= e; z += st) { const [, sy] = toS(0, z); g.moveTo(0, Math.round(sy) + .5); g.lineTo(V.W, Math.round(sy) + .5); }
      g.stroke();
    }
    // el centro de la escena: donde se paran las figuras al usar el escenario
    const [ox, oy] = toS(0, 0); g.strokeStyle = 'rgba(206,12,28,.55)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(ox - 8, oy); g.lineTo(ox + 8, oy); g.moveTo(ox, oy - 8); g.lineTo(ox, oy + 8); g.stroke();
    // escala
    g.fillStyle = '#7B8089'; g.font = '600 10px Archivo, Arial, sans-serif'; g.textAlign = 'left';
    g.fillRect(10, V.H - 14, step1 * V.sc, 2); g.fillText(step1 + ' m', 14 + step1 * V.sc, V.H - 9);
  }
  function draw() {
    if (B.v3) { draw3(); return; }
    if (!V.W) resize();
    g.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    g.fillStyle = '#F7F6F2'; g.fillRect(0, 0, V.W, V.H);
    grid();
    const s = B.sel;
    bsDrawPlan(g, B.d, toS, V, { sel: s && (s.t === 'w' ? { w: s.i } : s.t === 'o' ? { w: s.i, o: s.j } : s.t === 'it' ? { it: s.i } : null), fronts: true });
    // el contorno del piso elegido o a medio dibujar
    const fp = B.draft && B.draft.t === 'floor' ? B.draft.pts : s && s.t === 'fl' ? B.d.floor : null;
    if (fp && fp.length) {
      g.save(); g.strokeStyle = '#2C47CF'; g.lineWidth = 2; g.setLineDash(B.draft ? [5, 4] : []);
      g.beginPath(); fp.forEach((p, i) => { const [x, y] = toS(p[0], p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      if (B.draft && B.draft.hover) { const [x, y] = toS(...B.draft.hover); g.lineTo(x, y); } else if (!B.draft) g.closePath();
      g.stroke(); g.setLineDash([]);
      for (const p of fp) { const [x, y] = toS(p[0], p[1]); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.restore();
    }
    // el muro que se está dibujando, con su largo
    if (B.draft && B.draft.t === 'wall') {
      const D = B.draft, [x1, y1] = toS(D.x0, D.z0), [x2, y2] = toS(D.x1, D.z1);
      g.save(); g.strokeStyle = 'rgba(44,71,207,.85)'; g.lineWidth = Math.max(3, (B.d.wt || BS_T) * V.sc); g.lineCap = 'butt';
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      const L = Math.hypot(D.x1 - D.x0, D.z1 - D.z0);
      g.font = '700 11px Archivo, Arial, sans-serif'; g.fillStyle = '#2C47CF'; g.textAlign = 'center'; g.fillText(`${L.toFixed(2).replace('.', ',')} m`, (x1 + x2) / 2, (y1 + y2) / 2 - 10);
      g.restore();
    }
    if (B.draft && B.draft.t === 'vol') {
      const D = B.draft, [a, b] = toS(Math.min(D.x0, D.x1), Math.min(D.z0, D.z1)), [c, e] = toS(Math.max(D.x0, D.x1), Math.max(D.z0, D.z1));
      g.save(); g.strokeStyle = '#2C47CF'; g.setLineDash([5, 4]); g.lineWidth = 1.5; g.strokeRect(a, b, c - a, e - b); g.restore();
    }
    // las puntas del muro elegido (se arrastran)
    const S = sel();
    if (S && S.t === 'w') for (const [x, z] of [[S.w.x0, S.w.z0], [S.w.x1, S.w.z1]]) { const [sx, sy] = toS(x, z); g.fillStyle = '#fff'; g.strokeStyle = '#2C47CF'; g.lineWidth = 2; g.beginPath(); g.arc(sx, sy, 6, 0, Math.PI * 2); g.fill(); g.stroke(); }
    if (S && S.t === 'it') { const [sx, sy] = toS(S.it.x, S.it.z), f = bsItemFp(S.it), r = Math.max(f.w, f.d) / 2 * V.sc + 14, a = -rad(S.it.r || 0) - Math.PI / 2; const hx = sx + Math.cos(a) * r, hy = sy + Math.sin(a) * r; g.strokeStyle = '#2C47CF'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx, sy); g.lineTo(hx, hy); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(hx, hy, 6, 0, Math.PI * 2); g.fill(); g.stroke(); }
  }
  // ---------- la vista 3D de prueba ----------
  let R = null, scene = null, cam = null, hold = null, holdKey = '', fig = null, lights = [];
  const O = { yaw: 35, pitch: 38, dist: 0, tx: 0, tz: 0 };
  function setup3() {
    if (R) return;
    R = new T.WebGLRenderer({ canvas: c3, antialias: true }); R.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    R.shadowMap.enabled = true; R.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene(); scene.background = new T.Color('#E4E9EE');
    scene.add(new T.HemisphereLight(0xffffff, 0x8a8478, 2.1));
    const sun = new T.DirectionalLight(0xffffff, 1.4); sun.position.set(8, 14, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, far: 60 }); sun.shadow.camera.updateProjectionMatrix(); scene.add(sun);
    const gr = new T.Mesh(new T.PlaneGeometry(400, 400), toon(C3.ground)); gr.rotation.x = -Math.PI / 2; gr.position.y = -.01; gr.receiveShadow = true; scene.add(gr);
    // una figura de 1,72 m en el centro de la escena, para medir con el ojo
    fig = new T.Group(); const fm = toon('#E0703A');
    const body = new T.Mesh(new T.CapsuleGeometry(.2, .95, 4, 12), fm); body.position.y = .69; fig.add(body);
    const head = new T.Mesh(new T.SphereGeometry(.13, 16, 12), fm); head.position.y = 1.6; fig.add(head);
    scene.add(fig);
    cam = new T.PerspectiveCamera(45, 1, .05, 500);
  }
  function draw3() {
    setup3();
    const r = wrap.getBoundingClientRect(), W = Math.max(100, Math.round(r.width)), H = Math.max(100, Math.round(r.height));
    R.setSize(W, H, false);
    const k = cur();
    if (k !== holdKey) {
      holdKey = k;
      if (hold) { scene.remove(hold); bsDispose(hold); }
      for (const l of lights) scene.remove(l); lights = [];
      hold = bsBuild(B.d); scene.add(hold);
      for (const it of B.d.items) if (/^luz:/.test(it.k)) { const l = new T.PointLight('#FFE2B8', 6, 8, 2); l.position.set(it.x, it.h || 1.6, it.z); scene.add(l); lights.push(l); }
      const bb = bsBounds(B.d).b; O.tx = (bb[0] + bb[2]) / 2; O.tz = (bb[1] + bb[3]) / 2;
      if (!O.dist) O.dist = clamp(Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) * 1.1, 5, 120);
    }
    const y = rad(O.yaw), pt = rad(O.pitch);
    cam.aspect = W / H; cam.position.set(O.tx + Math.sin(y) * Math.cos(pt) * O.dist, Math.sin(pt) * O.dist, O.tz + Math.cos(y) * Math.cos(pt) * O.dist);
    cam.lookAt(O.tx, 1, O.tz); cam.updateProjectionMatrix();
    R.render(scene, cam);
  }
  // ---------- el panel de la derecha ----------
  const colorRow = (label, f, list, val) => `<div class="fld"><span>${esc(label)}</span><div class="sws">${list.map(c => `<button class="sw" style="--sw:${ea(c)}" data-col="${f}" data-v="${ea(c)}" aria-pressed="${ea(c.toLowerCase() === String(val).toLowerCase())}" aria-label="${ea(label)} ${ea(c)}" ${view ? 'disabled' : ''}></button>`).join('')}<label class="sw sw-pick" style="--sw:${ea(val)}" title="Otro color"><input type="color" data-colp="${f}" value="${ea(val)}" aria-label="${ea(label)}: otro color" ${view ? 'disabled' : ''}></label></div></div>`;
  const numIn = (label, f, val, min, max, st = .01, unit = 'm') => `<label class="fld sb-n"><span>${esc(label)}</span><span class="sb-nu"><input type="number" class="tnum" data-n="${f}" value="${ea(bsR(val))}" min="${min}" max="${max}" step="${st}" ${view ? 'disabled' : ''}><i>${unit}</i></span></label>`;
  function selPanel() {
    const S = sel(); if (!S) return '';
    const del = view ? '' : '<button class="btn sm ghost sb-del" data-del="1">Quitar</button>';
    if (S.t === 'w') return `<div class="sb-sel"><h3>Muro</h3><div class="grid3">${numIn('Largo', 'wl', bsLen(S.w), .1, 200)}${numIn('Grosor', 'wt', S.w.t || BS_T, .03, 1.5)}${numIn('Alto', 'wh1', bsWallH(B.d, S.w), .3, 12)}</div>${del}</div>`;
    if (S.t === 'o') return `<div class="sb-sel"><h3>${S.o.k === 'p' ? 'Puerta' : 'Ventana'}</h3><div class="grid3">${numIn('Ancho', 'oa', S.o.a, .3, 10)}${S.o.k === 'v' ? numIn('Desde', 'oy0', S.o.y0, 0, 10) : ''}${numIn('Hasta', 'oy1', S.o.y1, .5, 12)}</div>${del}</div>`;
    if (S.t === 'it') {
      const it = S.it, f = bsItemFp(it), vol = it.k === 'vol';
      return `<div class="sb-sel"><h3>${esc(vol ? 'Volumen' : f.name)}</h3>${vol ? `<div class="grid3">${numIn('Ancho', 'iw', it.w, .05, 40)}${numIn('Fondo', 'id', it.d, .05, 40)}${numIn('Alto', 'ihh', it.hh, .05, 12)}</div>` : ''}
        <div class="grid2">${numIn('Giro', 'ir', it.r || 0, -180, 180, 5, '°')}${numIn(vol ? 'Sobre el piso' : 'Altura', 'ih', it.h || 0, 0, 10)}</div>${del}</div>`;
    }
    if (S.t === 'fl') return `<div class="sb-sel"><h3>Piso</h3><p class="hint">${B.d.floor.length} puntos. Arrastra un punto para moverlo.</p>${view ? '' : '<button class="btn sm ghost sb-del" data-del="1">Quitar el contorno</button>'}</div>`;
    return '';
  }
  function paint() {
    const d = B.d, opts = locs.map(l => `<option value="${ea(l)}" ${l === (B.locSel ?? L0) ? 'selected' : ''}>${esc(titleCase(l))}</option>`).join('');
    $o('#sbR').innerHTML = `
      <label class="fld"><span>Nombre</span><input type="text" id="sbName" value="${ea(d.n)}" maxlength="80" ${UI.readOnly ? 'disabled' : ''}></label>
      ${selPanel()}
      ${view ? '' : `<div class="grid2">${numIn('Alto de muros', 'wh', d.wh, 1, 12)}${numIn('Grosor nuevo', 'wt0', B.wt || BS_T, .03, 1.5)}</div>`}
      ${colorRow('Muros', 'wc', SB_COLORS, d.wc)}
      ${colorRow('Piso', 'fc', SB_FLOORS, d.fc)}
      <div class="fld"><span>Lugar</span><div class="seg" role="group"><button data-in="1" aria-pressed="${ea(d.int !== false)}" ${view ? 'disabled' : ''}>Interior</button><button data-in="0" aria-pressed="${ea(d.int === false)}" ${view ? 'disabled' : ''}>Exterior</button></div></div>
      ${UI.readOnly ? '' : `<label class="fld"><span>Asignar a locación</span><select id="sbLoc"><option value="">Ninguna (solo en la lista)</option>${opts}</select></label>
      <label class="opt sb-all"><input type="checkbox" id="sbAll" ${(B.all ?? locNow) ? 'checked' : ''}><span><b>Usar en toda la locación</b><span class="hint">Los planos nuevos de esa locación lo traen.</span></span></label>`}`;
    $o('#sbCount').textContent = `${bsCount(d)} de ${BS_MAX} piezas`;
    ov.querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-pressed', b.dataset.t === B.tool));
    ov.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === +B.v3)));
    const u = ov.querySelector('[data-u="-1"]'), r = ov.querySelector('[data-u="1"]'); if (u) { u.disabled = !B.hist.length; r.disabled = !B.fut.length; }
    $o('#sbHint').textContent = B.v3 ? 'Arrastra para girar y usa la rueda para acercarte. La figura mide 1,72 m.'
      : view ? (UI.readOnly ? 'Solo lectura: se ve, no se edita.' : 'En el teléfono se mira y se asigna; se construye en la computadora.')
      : { sel: 'Toca algo para elegirlo; arrástralo para moverlo. Supr lo quita.', wall: 'Arrastra de una punta a la otra del muro. Se pega a la cuadrícula de 5 cm (con Mayús, libre).', door: 'Toca un muro donde va la puerta.', win: 'Toca un muro donde va la ventana.', floor: 'Toca cada esquina del piso; toca el primer punto (o doble clic) para cerrarlo.', vol: 'Arrastra un rectángulo: un mostrador, una tarima o una columna. El alto se cambia en el panel.', add: 'Elige un mueble, un objeto o una luz y tócalo en la planta.' }[B.tool] || '';
    cv.style.cursor = B.tool === 'sel' || B.tool === 'view' ? 'default' : 'crosshair';
  }
  // ---------- tocar la planta ----------
  function hit(x, z) {
    const tol = 8 / V.sc;
    const S = sel();
    if (S && S.t === 'w') for (const [e, px, pz] of [[0, S.w.x0, S.w.z0], [1, S.w.x1, S.w.z1]]) if (Math.hypot(x - px, z - pz) < tol * 1.4) return { t: 'wend', i: S.i, e };
    if (S && S.t === 'fl') for (const [j, p] of B.d.floor.entries()) if (Math.hypot(x - p[0], z - p[1]) < tol * 1.4) return { t: 'fpt', j };
    if (S && S.t === 'it') { const f = bsItemFp(S.it), r = Math.max(f.w, f.d) / 2 + 14 / V.sc, a = rad(S.it.r || 0); if (Math.hypot(x - (S.it.x - Math.sin(a) * r), z - (S.it.z - Math.cos(a) * r)) < tol * 1.4) return { t: 'rot', i: S.i }; }
    // huecos de los muros, luego los muros, luego los objetos (de arriba hacia abajo), luego el piso
    for (const [i, w] of B.d.walls.entries()) {
      const L = bsLen(w), ux = (w.x1 - w.x0) / L, uz = (w.z1 - w.z0) / L, u = (x - w.x0) * ux + (z - w.z0) * uz, dd = Math.abs((x - w.x0) * -uz + (z - w.z0) * ux);
      if (dd > (w.t || BS_T) / 2 + tol || u < -tol || u > L + tol) continue;
      for (const q of bsOps(w, bsWallH(B.d, w))) if (Math.abs(u - q.u) <= q.a / 2) return { t: 'o', i, j: q.j, u };
      return { t: 'w', i, u };
    }
    for (let i = B.d.items.length - 1; i >= 0; i--) {
      const it = B.d.items[i], f = bsItemFp(it), a = rad(it.r || 0), dx = x - it.x, dz = z - it.z;
      const lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a);
      if (Math.abs(lx) <= f.w / 2 + tol / 2 && Math.abs(lz) <= f.d / 2 + tol / 2) return { t: 'it', i };
    }
    if (B.d.floor.length >= 3 && sbInPoly(x, z, B.d.floor)) return { t: 'fl' };
    return null;
  }
  let drag = null, pan = null;
  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', e => {
    if (B.v3) return;
    cv.focus({ preventScroll: true });
    const [sx, sy] = pos(e), [wx, wz] = toW(sx, sy), x = snap(wx, e), z = snap(wz, e);
    // botón del medio, o arrastrar en vacío con «Elegir»: mover la vista
    if (e.button === 1 || (B.tool === 'view')) { pan = { sx, sy, x: V.x, z: V.z }; cv.setPointerCapture(e.pointerId); return; }
    if (e.button > 0) return;
    cv.setPointerCapture(e.pointerId);
    const T0 = B.tool;
    if (T0 === 'wall') { if (full()) { fullMsg(); return; } B.draft = { t: 'wall', x0: x, z0: z, x1: x, z1: z }; drag = { t: 'draft' }; draw(); return; }
    if (T0 === 'vol') { if (full()) { fullMsg(); return; } B.draft = { t: 'vol', x0: x, z0: z, x1: x, z1: z }; drag = { t: 'draft' }; draw(); return; }
    if (T0 === 'floor') {
      const D = B.draft && B.draft.t === 'floor' ? B.draft : (B.draft = { t: 'floor', pts: [] });
      const p0 = D.pts[0];
      if (p0 && D.pts.length >= 3 && Math.hypot(wx - p0[0], wz - p0[1]) < 10 / V.sc) { closeFloor(); return; }
      D.pts.push([x, z]); draw(); return;
    }
    if (T0 === 'door' || T0 === 'win') {
      const n = bsNearWall(B.d, wx, wz, Math.max(.4, 14 / V.sc));
      if (!n) { toast('Toca un muro: ahí va el hueco.'); return; }
      if (full()) { fullMsg(); return; }
      step();
      const o = bsOpenAdd(B.d, n.i, n.u, T0 === 'door' ? 'p' : 'v');
      if (!o) { B.hist.pop(); toast('No cabe en ese muro.'); return; }
      B.sel = { t: 'o', i: n.i, j: B.d.walls[n.i].o.length - 1 }; paint(); draw(); return;
    }
    if (T0 === 'add') {
      if (!B.pick) { addMenu(e); return; }
      if (full()) { fullMsg(); return; }
      step();
      const fp = /^luz:/.test(B.pick) ? null : S3_PROPS[B.pick] || {};
      const it = { k: B.pick, x, z, r: 0 }; if (/^luz:/.test(B.pick)) it.h = 2.2; else if (fp.small) it.h = 0;
      B.d.items.push(it); B.sel = { t: 'it', i: B.d.items.length - 1 }; paint(); draw(); return;
    }
    // elegir y mover
    const h = hit(wx, wz);
    if (!h) { B.sel = null; pan = { sx, sy, x: V.x, z: V.z }; paint(); draw(); return; }
    if (h.t === 'wend') { drag = { t: 'wend', i: h.i, e: h.e, moved: false }; return; }
    if (h.t === 'fpt') { drag = { t: 'fpt', j: h.j, moved: false }; return; }
    if (h.t === 'rot') { drag = { t: 'rot', i: h.i, moved: false }; return; }
    B.sel = h.t === 'o' ? { t: 'o', i: h.i, j: h.j } : h.t === 'w' ? { t: 'w', i: h.i } : h.t === 'it' ? { t: 'it', i: h.i } : { t: 'fl' };
    drag = { t: 'move', x0: wx, z0: wz, base: JSON.stringify(B.d), moved: false };
    paint(); draw();
  });
  cv.addEventListener('pointermove', e => {
    const [sx, sy] = pos(e), [wx, wz] = toW(sx, sy), x = snap(wx, e), z = snap(wz, e);
    if (pan) { V.x = pan.x - (sx - pan.sx) / V.sc; V.z = pan.z - (sy - pan.sy) / V.sc; draw(); return; }
    if (B.draft && B.draft.t === 'floor' && !drag) { B.draft.hover = [x, z]; draw(); return; }
    if (!drag) return;
    if (drag.t === 'draft') {
      const D = B.draft;
      if (D.t === 'wall' && !e.shiftKey) {
        // muros rectos: casi horizontal o casi vertical se endereza
        const dx = x - D.x0, dz = z - D.z0, a = Math.abs(deg(Math.atan2(dz, dx))) % 90;
        D.x1 = a < 8 || a > 82 ? (Math.abs(dx) >= Math.abs(dz) ? x : D.x0) : x; D.z1 = a < 8 || a > 82 ? (Math.abs(dx) >= Math.abs(dz) ? D.z0 : z) : z;
      } else { D.x1 = x; D.z1 = z; }
      draw(); return;
    }
    if (!drag.moved) { step(); drag.moved = true; }
    const S = sel();
    if (drag.t === 'wend') { const w = B.d.walls[drag.i]; if (drag.e) { w.x1 = x; w.z1 = z; } else { w.x0 = x; w.z0 = z; } }
    else if (drag.t === 'fpt') { B.d.floor[drag.j] = [x, z]; }
    else if (drag.t === 'rot' && S) { S.it.r = Math.round(deg(Math.atan2(-(wx - S.it.x), -(wz - S.it.z))) / (e.shiftKey ? 1 : 15)) * (e.shiftKey ? 1 : 15); }
    else if (drag.t === 'move' && S) {
      const base = JSON.parse(drag.base), dx = snap(wx - drag.x0, e), dz = snap(wz - drag.z0, e);
      if (S.t === 'w') { const w0 = base.walls[S.i]; Object.assign(S.w, { x0: bsR(w0.x0 + dx), z0: bsR(w0.z0 + dz), x1: bsR(w0.x1 + dx), z1: bsR(w0.z1 + dz) }); }
      else if (S.t === 'it') { const i0 = base.items[S.i]; S.it.x = bsR(i0.x + dx); S.it.z = bsR(i0.z + dz); }
      else if (S.t === 'fl') B.d.floor = base.floor.map(p => [bsR(p[0] + dx), bsR(p[1] + dz)]);
      else if (S.t === 'o') {
        // a lo largo de su muro
        const w = S.w, L = bsLen(w), o0 = base.walls[S.i].o[S.j], u = o0.u + (dx * (w.x1 - w.x0) + dz * (w.z1 - w.z0)) / L;
        S.o.u = bsR(Math.min(Math.max(u, S.o.a / 2 + .02), L - S.o.a / 2 - .02));
      }
    }
    draw();
  });
  const up = e => {
    if (pan) { pan = null; return; }
    if (!drag) return;
    const D = drag; drag = null;
    if (D.t === 'draft') {
      const R0 = B.draft; B.draft = null;
      if (R0.t === 'wall' && Math.hypot(R0.x1 - R0.x0, R0.z1 - R0.z0) >= .2) { step(); B.d.walls.push({ x0: bsR(R0.x0), z0: bsR(R0.z0), x1: bsR(R0.x1), z1: bsR(R0.z1), t: B.wt || BS_T, o: [] }); B.sel = { t: 'w', i: B.d.walls.length - 1 }; }
      if (R0.t === 'vol' && Math.abs(R0.x1 - R0.x0) >= .1 && Math.abs(R0.z1 - R0.z0) >= .1) { step(); B.d.items.push({ k: 'vol', x: bsR((R0.x0 + R0.x1) / 2), z: bsR((R0.z0 + R0.z1) / 2), r: 0, w: bsR(Math.abs(R0.x1 - R0.x0)), d: bsR(Math.abs(R0.z1 - R0.z0)), hh: 1 }); B.sel = { t: 'it', i: B.d.items.length - 1 }; }
      paint(); draw(); return;
    }
    if (D.moved) { if (D.t === 'wend') { const w = B.d.walls[D.i]; if (bsLen(w) < .2) { B.d.walls.splice(D.i, 1); B.sel = null; } } paint(); draw(); }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('dblclick', () => { if (B.draft && B.draft.t === 'floor') closeFloor(); });
  cv.addEventListener('wheel', e => { e.preventDefault(); if (B.v3) return; const [sx, sy] = pos(e), [wx, wz] = toW(sx, sy); V.sc = clamp(V.sc * Math.exp(-e.deltaY * .0015), 6, 300); const [nx, nz] = toW(sx, sy); V.x += wx - nx; V.z += wz - nz; draw(); }, { passive: false });
  function closeFloor() {
    const D = B.draft; B.draft = null;
    if (D && D.pts.length >= 3) { step(); B.d.floor = D.pts.map(p => [bsR(p[0]), bsR(p[1])]); B.sel = { t: 'fl' }; }
    paint(); draw();
  }
  // la vista 3D: arrastrar gira, la rueda acerca
  let orb = null;
  c3.addEventListener('pointerdown', e => { c3.setPointerCapture(e.pointerId); orb = { x: e.clientX, y: e.clientY, yaw: O.yaw, pitch: O.pitch }; });
  c3.addEventListener('pointermove', e => { if (!orb) return; O.yaw = orb.yaw - (e.clientX - orb.x) * .4; O.pitch = clamp(orb.pitch + (e.clientY - orb.y) * .3, 5, 88); draw3(); });
  c3.addEventListener('pointerup', () => { orb = null; }); c3.addEventListener('pointercancel', () => { orb = null; });
  c3.addEventListener('wheel', e => { e.preventDefault(); O.dist = clamp(O.dist * Math.exp(e.deltaY * .0012), 1.5, 300); draw3(); }, { passive: false });
  // ---------- el catálogo (los mismos grupos que «+ Objeto» del editor 3D) y las luces ----------
  function addMenu(ev) {
    const cats = [...S3_PROP_CATS.filter(([c]) => c !== 'vehiculo' && c !== 'animal'), ['luz', 'Luces']];
    const curC = () => ls.get('sbCat', 'mueble');
    const list = (c, q) => {
      const k = q ? deaccent(q.toLowerCase()) : '';
      const L = c === 'luz' && !k ? Object.entries(S3_LIGHTS).filter(([t]) => t !== 'sol' && t !== 'bandera' && t !== 'rebote').map(([t, v]) => ['luz:' + t, v.name])
        : Object.entries(S3_PROPS).filter(([kk, v]) => !['vehiculo', 'animal'].includes(v.cat) && (k ? deaccent(v.name.toLowerCase()).includes(k) : (v.cat || 'objeto') === c)).map(([kk, v]) => [kk, v.name]);
      return L.length ? L.map(([kk, n]) => `<button data-k="${ea(kk)}">${esc(n)}</button>`).join('') : '<p class="po-none">Nada con ese nombre.</p>';
    };
    popover(ev && ev.currentTarget ? ev.currentTarget : ov.querySelector('[data-t="add"]'), `<input class="po-q" type="search" placeholder="Buscar: mesa, cama, lámpara…" aria-label="Buscar">
      <div class="po-cats" role="tablist">${cats.map(([c, n]) => `<button class="chip" role="tab" data-pc="${ea(c)}" aria-pressed="${ea(c === curC())}">${n}</button>`).join('')}</div>
      <div class="menu po-list">${list(curC())}</div>`, p => {
      p.classList.add('pop-add');
      const Lp = p.querySelector('.po-list'), Q = p.querySelector('.po-q');
      Q.addEventListener('input', () => { Lp.innerHTML = list(curC(), Q.value.trim()); });
      p.addEventListener('click', e => {
        const c = e.target.closest('[data-pc]');
        if (c) { ls.set('sbCat', c.dataset.pc); Q.value = ''; Lp.innerHTML = list(c.dataset.pc); p.querySelectorAll('[data-pc]').forEach(b => b.setAttribute('aria-pressed', b === c)); return; }
        const b = e.target.closest('button[data-k]'); if (!b) return;
        closePop(); B.pick = b.dataset.k; B.tool = 'add'; paint();
        toast(`${b.textContent}: tócalo en la planta para ponerlo.`, 3000);
      });
    });
  }
  // ---------- el panel: cambios ----------
  ov.addEventListener('click', e => {
    if (e.target === ov) { req('fuera'); return; }
    if (e.target.closest('[data-x]')) { req('x'); return; }
    if (e.target.closest('#sbOk')) { save(); return; }
    const t = e.target.closest('[data-t]');
    if (t) { if (B.draft && B.draft.t === 'floor') closeFloor(); B.draft = null; B.tool = t.dataset.t; if (B.tool === 'add') { B.pick = null; addMenu({ currentTarget: t }); } paint(); draw(); return; }
    const u = e.target.closest('[data-u]'); if (u) { undo(+u.dataset.u); return; }
    const v = e.target.closest('[data-v]'); if (v) { B.v3 = v.dataset.v === '1'; cv.hidden = B.v3; c3.hidden = !B.v3; $o('.sb-zoom').hidden = B.v3; paint(); draw(); return; }
    const z = e.target.closest('[data-z]'); if (z) { if (+z.dataset.z === 0) fit(); else { V.sc = clamp(V.sc * (+z.dataset.z > 0 ? 1.25 : .8), 6, 300); draw(); } return; }
    if (view) return;
    const col = e.target.closest('[data-col]'); if (col) { step(); B.d[col.dataset.col] = col.dataset.v; paint(); draw(); return; }
    const ii = e.target.closest('[data-in]'); if (ii) { step(); B.d.int = ii.dataset.in === '1'; paint(); return; }
    if (e.target.closest('[data-del]')) { del(); return; }
  });
  ov.addEventListener('change', e => {
    const el = e.target;
    if (el.id === 'sbLoc') { B.locSel = el.value; if (!el.value) B.all = false; else if (B.all == null || !B.all) B.all = true; paint(); return; }
    if (el.id === 'sbAll') { B.all = el.checked; return; }
    if (el.dataset.colp) { step(); B.d[el.dataset.colp] = el.value; paint(); draw(); return; }
    if (!el.dataset.n || view) return;
    const v = num(el.value), f = el.dataset.n, S = sel();
    if (!String(el.value).trim()) { paint(); return; }
    if (f === 'wt0') { B.wt = clamp(v, .03, 1.5); return; }
    step();
    if (f === 'wh') B.d.wh = clamp(v, 1, 12);
    else if (S && S.t === 'w') {
      if (f === 'wl') { const L = bsLen(S.w), k = clamp(v, .1, 200) / L; S.w.x1 = bsR(S.w.x0 + (S.w.x1 - S.w.x0) * k); S.w.z1 = bsR(S.w.z0 + (S.w.z1 - S.w.z0) * k); }
      if (f === 'wt') S.w.t = clamp(v, .03, 1.5);
      if (f === 'wh1') { const h = clamp(v, .3, 12); if (Math.abs(h - B.d.wh) < .005) delete S.w.h; else S.w.h = h; }
    } else if (S && S.t === 'o') {
      if (f === 'oa') S.o.a = clamp(v, .3, 10);
      if (f === 'oy0') S.o.y0 = clamp(v, 0, S.o.y1 - .2);
      if (f === 'oy1') S.o.y1 = clamp(v, S.o.y0 + .2, 12);
    } else if (S && S.t === 'it') {
      const map = { iw: 'w', id: 'd', ihh: 'hh', ir: 'r', ih: 'h' }, k = map[f];
      if (k) S.it[k] = k === 'r' ? Math.round(v) : clamp(v, k === 'h' ? 0 : .05, 40);
      if (k === 'h' && !S.it.h) delete S.it.h;
    }
    paint(); draw();
  });
  ov.addEventListener('input', e => { if (e.target.id === 'sbName') { B.d.n = e.target.value; B.changed = true; } });
  function del() {
    const S = sel(); if (!S) return;
    step();
    if (S.t === 'w') B.d.walls.splice(S.i, 1);
    else if (S.t === 'o') S.w.o.splice(S.j, 1);
    else if (S.t === 'it') B.d.items.splice(S.i, 1);
    else if (S.t === 'fl') B.d.floor = [];
    B.sel = null; paint(); draw();
  }
  const onKey = e => {
    if (!ov.isConnected || $('#ask') || $('#pop') && e.key !== 'Escape') return;
    if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); if ($('#pop')) { closePop(); return; } if (B.draft) { if (B.draft.t === 'floor') closeFloor(); else { B.draft = null; draw(); } return; } req('esc'); return; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (view) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(e.shiftKey ? 1 : -1); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); undo(1); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && B.sel) { e.preventDefault(); del(); return; }
    if (e.key === 'Enter' && B.draft && B.draft.t === 'floor') { closeFloor(); return; }
  };
  addEventListener('keydown', onKey, true);
  // ---------- guardar ----------
  function save() {
    if (UI.readOnly) return;
    const name = (($o('#sbName') || {}).value || B.d.n || '').trim().slice(0, 80) || 'Escenario';
    const loc = ($o('#sbLoc') || {}).value ?? L0, all = !!(loc && $o('#sbAll') && $o('#sbAll').checked);
    if (!view && !B.d.walls.length && !B.d.items.length && B.d.floor.length < 3) { toast('Dibuja al menos un muro, el piso o un objeto.'); return; }
    const id = ed0 ? ed0.id : uid('ec');
    histNote(ed0 ? `Editar el escenario «${name}»` : `Escenario «${name}»`, null, UI.tab);
    const d = bsClean({ ...JSON.parse(JSON.stringify(B.d)), id, n: name, loc: loc || '', v: view && ed0 ? ed0.v : Date.now() });
    if (ed0 && ed0.esc) d.esc = ed0.esc;
    P.sets3d = P.sets3d || {}; P.sets3d[id] = d;
    P.locSet3d = P.locSet3d || {};
    if (loc && all) P.locSet3d[loc] = id;
    for (const [l, v] of Object.entries(P.locSet3d)) if (v === id && !(l === loc && all)) delete P.locSet3d[l];
    // los planos con puesta propia de esa locación pasan al escenario (sus figuras quedan donde estaban)
    if (all) for (const sh of Object.values(P.shots)) { const s0 = sceneOfKey(sh.sc); if (sh.s3 && s0 && s0.loc === loc) sbUse(sh.s3, id); }
    // un escenario que se volvió a editar: sus luces, al día en los planos que lo usan
    if (ed0) for (const sh of Object.values(P.shots)) if (sh.s3 && sh.s3.set === 'modelo' && sh.s3.set3d === id) bsLights(sh.s3, d);
    B.saved = true; close();
    changed('data'); derive();
    if (typeof THUMB3 !== 'undefined') THUMB3.clear();
    if (done) done(id, all); else render();
    toastUndo(ed0 ? `Escenario «${name}» guardado.` : `Escenario «${name}» guardado${loc && all ? `: los planos de ${titleCase(loc)} lo usan` : ''}.`);
  }
  // ---------- cerrar ----------
  function close() {
    removeEventListener('keydown', onKey, true); removeEventListener('resize', onRs);
    if (ro) ro.disconnect();
    if (hold) bsDispose(hold);
    if (R) { R.dispose(); R.forceContextLoss(); }
    ov.remove();
  }
  const req = guardOverlay(ov, { dirty: () => !B.saved && !view && B.changed, close, save });
  const ro = new ResizeObserver(() => { resize(); draw(); }); ro.observe(wrap);
  const onRs = () => { if (ov.isConnected) { resize(); draw(); } };
  addEventListener('resize', onRs);
  paint();
  requestAnimationFrame(() => fit());
  if (view && !UI.readOnly && !opts.quiet) setTimeout(() => toast('En el teléfono se mira y se asigna; para construir o cambiar muros, ábrelo en la computadora.', 5000), 300);
  return ov;
}
/* el plano pasa al escenario construido: sus figuras quedan donde estaban; sus luces entran al plano */
function sbUse(s3, id) {
  const d = P.sets3d && P.sets3d[id]; if (!d || !s3) return;
  const hadRoom = s3.objs.some(o => o.room);
  s3.set = 'modelo'; s3.set3d = id; delete s3.planId;
  if (hadRoom && typeof roomFurnish === 'function') roomFurnish(s3, '');
  bsLights(s3, d);
}
/* las locaciones del guion (como en el encabezado de sus escenas), en orden */
function sbLocs() { const L = []; for (const s of (D.sc && D.sc.scenes) || []) if (s.loc && !L.includes(s.loc)) L.push(s.loc); return L; }
function sbInPoly(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
