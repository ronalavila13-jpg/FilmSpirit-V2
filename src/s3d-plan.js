/* ============================================================
   PLANTA DE CÁMARA · vista cenital editable del plano
   ============================================================ */
/* la cámara B, en otro color (naranja tostado: se distingue del azul de la A también con daltonismo) */
const PLAN_CB = '#B4421E';
const planRGBA = (hex, a) => { const h = hex.replace('#', ''); return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`; };
/* la otra cámara del plano, vista desde la que se está mirando (s3 con cámara B: la que no es la de k.cam) */
function planOther(s3, t, letter) {
  const v = typeof s3ForB === 'function' ? s3ForB(s3) : null; if (!v) return null;
  const st = s3At(v, t);
  return { cam: st.cam, path: camKeys(v).map(k => [k.cam.x, k.cam.z]), letter, col: letter === 'B' ? PLAN_CB : PLAN_C.cam };
}
/* ---------- medidas en la planta ----------
   s3.meas = [{ a, b }]: cada punta es un punto del piso { x, z } o algo de la escena: { o: id } (figura, objeto o luz) o
   { c: 'A' | 'B' } (la cámara). Las puntas puestas en algo lo siguen cuando se mueve, también en el tiempo del plano.
   La distancia es la del piso (en planta), en metros; de la cámara a algo de la escena, la de foco (measFocus) */
const PLAN_MEAS = '#0E7C66';
function measPt(st, letter, oc, q) {
  if (!q || typeof q !== 'object') return null;
  if (q.o) { const p = st.o[q.o]; return p ? [p.x, p.z] : null; }
  if (q.c) { if (q.c === (letter || 'A')) return [st.cam.x, st.cam.z]; return oc && oc.letter === q.c ? [oc.cam.x, oc.cam.z] : null; }
  return typeof q.x === 'number' && typeof q.z === 'number' && isFinite(q.x) && isFinite(q.z) ? [q.x, q.z] : null;
}
const measFmt = d => (d < 10 ? d.toFixed(2) : d.toFixed(1)) + ' m';
/* la distancia de foco, como en un simulador de profundidad de campo (dofsimulator.net): de la cámara a los ojos de la
   figura (o a la altura del objeto o la luz) en línea recta, no solo por el piso: con la cámara alta o baja es más larga */
function measFocus(s3, st, cam, q) {
  const p = q && q.o && st.o[q.o], ob = p && s3.objs.find(o => o.id === q.o); if (!ob) return null;
  const y = ob.kind === 'actor' ? eyeOf(s3, ob.id, p.pose) + liftOf(s3, p) : liftOf(s3, p);
  return Math.hypot(p.x - cam.x, p.z - cam.z, y - cam.h);
}
/* profundidad de campo (lente delgada, como dofsimulator): f en mm, diafragma N, ancho del sensor en mm, foco a s metros.
   Círculo de confusión: la diagonal del sensor (3:2) / 1500 (0,029 mm en full frame). Devuelve metros; far = Infinity
   desde la hiperfocal */
function dofOf(f, N, sw, s) {
  const c = sw * Math.hypot(1, 2 / 3) / 1500, H = f * f / (N * c) + f, S = s * 1000;
  return { near: S * (H - f) / (H + S - 2 * f) / 1000, far: S >= H ? Infinity : S * (H - f) / (H - S) / 1000, H: H / 1000 };
}
const dofFmt = v => !isFinite(v) ? '∞' : (v < 10 ? v.toFixed(2) : v.toFixed(1));
/* sanea lo guardado: solo medidas con dos puntas válidas (para abrir proyectos y lo que llega del equipo) */
function measClean(list) {
  const ok = q => q && typeof q === 'object' && (typeof q.o === 'string' || q.c === 'A' || q.c === 'B' || (typeof q.x === 'number' && typeof q.z === 'number' && isFinite(q.x) && isFinite(q.z)));
  const pick = q => q.o ? { o: q.o } : q.c ? { c: q.c } : { x: q.x, z: q.z };
  return Array.isArray(list) ? list.filter(m => m && ok(m.a) && ok(m.b)).slice(0, 40).map(m => ({ a: pick(m.a), b: pick(m.b) })) : [];
}
const PLAN_C = { bg: '#F7F6F2', grid: '#E7E4DD', grid5: '#D5D0C6', wall: '#AFA798', road: '#E3E0D9', prop: '#E4DED2', propLine: '#968E80', ink: '#2A2D33', muted: '#7B8089', cam: '#2C47CF', camFill: 'rgba(44,71,207,.10)' };
/* el lugar en la planta: interior con sus muros, calle, playa o mar, auto y el plano de planta importado (lo mismo
   en la planta del plano y en la planta general de la escena) */
function planDrawSet(ctx, s3, V, toS0, redraw) {
  // lote W · la calle, los jardines y los paisajes, a la escala de su locación (el escenario 3D y el plano de planta
  // llevan la suya: usan toS0)
  const ke = typeof envEscOf === 'function' ? envEscOf(s3) : 1, toS = ke === 1 ? toS0 : (x, z) => toS0(x * ke, z * ke);
  // set
  if (s3.set === 'int') {
    const R = roomOf(s3);
    const [a, b] = toS(-R.w / 2, -R.d / 2), [c, d] = toS(R.w / 2, R.d / 2);
    ctx.strokeStyle = PLAN_C.wall; ctx.lineWidth = Math.max(3, .15 * V.sc); ctx.strokeRect(a, b, c - a, d - b);
    ctx.fillStyle = PLAN_C.muted; ctx.font = '600 10px Archivo, Arial, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${R.w} m`, (a + c) / 2, b - 6); ctx.save(); ctx.translate(a - 6, (b + d) / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(`${R.d} m`, 0, 0); ctx.restore();
    if (R.kind === 'ascensor') {
      // la cabina: las puertas en el muro del fondo (el hueco y sus dos hojas) y los pasamanos de los costados
      const dw = Math.min(.9, R.w - .5), [p0, q0] = toS(-dw / 2, -R.d / 2), [p1] = toS(dw / 2, -R.d / 2), lw = Math.max(3, .15 * V.sc);
      ctx.fillStyle = PLAN_C.bg; ctx.fillRect(p0, q0 - lw, p1 - p0, lw * 2);
      ctx.fillStyle = PLAN_C.wall; const [, qd] = toS(0, -R.d / 2 + .04);
      ctx.fillRect(p0, q0 - 1, (p1 - p0) / 2 - 1, Math.max(2, qd - q0)); ctx.fillRect((p0 + p1) / 2 + 1, q0 - 1, (p1 - p0) / 2 - 1, Math.max(2, qd - q0));
      ctx.strokeStyle = PLAN_C.muted; ctx.lineWidth = 1.5;
      for (const sx of [-1, 1]) { const [rx, r0] = toS(sx * (R.w / 2 - .055), -R.d / 2 + .25), [, r1] = toS(0, R.d / 2 - .25); ctx.beginPath(); ctx.moveTo(rx, r0); ctx.lineTo(rx, r1); ctx.stroke(); }
      ctx.fillStyle = PLAN_C.muted; ctx.fillText('Puertas', (p0 + p1) / 2, q0 + 16);
    }
  } else if (s3.set === 'playa' || s3.set === 'mar') {
    // agua y orilla: la planta queda siempre en blanco o gris muy claro; el agua, un gris apenas más frío, y la
    // orilla, una raya punteada
    const [, sy] = toS(0, -6);
    ctx.fillStyle = '#EDF0F2';
    if (s3.set === 'playa') {
      ctx.fillRect(0, 0, V.W, Math.max(0, sy));
      ctx.save(); ctx.strokeStyle = '#B9C3CB'; ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(0, Math.round(sy) + .5); ctx.lineTo(V.W, Math.round(sy) + .5); ctx.stroke(); ctx.restore();
      if (sy > 16) { ctx.fillStyle = PLAN_C.muted; ctx.font = '600 10px Archivo, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Mar', 10, sy - 6); }
    }
    else {
      ctx.fillRect(0, 0, V.W, V.H);
      const [a, b] = toS(-1.15, -2.4), [c, d] = toS(1.15, 3.2);
      ctx.fillStyle = '#E2D2BC'; ctx.strokeStyle = '#8B6F4E'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(a, b, c - a, d - b, 8) : ctx.rect(a, b, c - a, d - b); ctx.fill(); ctx.stroke();
    }
  } else if (s3.set === 'auto' && typeof carPlan === 'function') planCar(ctx, carPlan(s3), V, toS);
  else if (s3.set === 'calle') {
    const [, r0] = toS(0, -9), [, r1] = toS(0, -2);
    ctx.fillStyle = PLAN_C.road; ctx.fillRect(0, r0, V.W, r1 - r0);
    ctx.strokeStyle = '#C9C4BA'; ctx.setLineDash([12, 10]); const [, rm] = toS(0, -5.5); ctx.beginPath(); ctx.moveTo(0, rm); ctx.lineTo(V.W, rm); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#E9E5DD'; const [, b0] = toS(0, -17.5), [, b1] = toS(0, -11.5); ctx.fillRect(0, b0, V.W, b1 - b0);
    const [, c0] = toS(0, 8.5), [, c1] = toS(0, 14.5); ctx.fillRect(0, c0, V.W, c1 - c0);
  }
  if (typeof set3dDrawPlan === 'function') set3dDrawPlan(ctx, s3, toS0, redraw);   // la planta de un escenario 3D
  const pl = planOf(s3);
  if (pl) {
    const W = planWorld(pl), im = planPic(pl, redraw);
    const [ix, iy] = toS(W.x(0), W.z(0));
    if (im) { ctx.globalAlpha = .5; ctx.drawImage(im, ix, iy, pl.w * W.k * V.sc, pl.h * W.k * V.sc); ctx.globalAlpha = 1; }
    ctx.fillStyle = '#5B6070';
    for (const [x, y, w, h] of pl.rects) { const [a, b] = toS(W.x(x), W.z(y)); ctx.fillRect(a, b, Math.max(1, w * W.k * V.sc), Math.max(1, h * W.k * V.sc)); }
  }
}
/* el vehículo del interior visto desde arriba (carPlan, s3d-entornos.js): ruedas, contorno de la carrocería, cabina
   (y la tolva de la pick-up), tablero, asientos, volante, espejos; en el bus, la puerta a la derecha y el chofer */
function planCar(ctx, Q, V, toS) {
  const box = (r, rad = 0) => { const [a, b] = toS(r[0], r[1]), [c, d] = toS(r[2], r[3]); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(a, b, c - a, d - b, Math.min(rad, (c - a) / 2, (d - b) / 2)) : ctx.rect(a, b, c - a, d - b); return [a, b, c, d]; };
  ctx.save();
  ctx.fillStyle = '#5B6070'; for (const w of Q.wheels) { box(w, 2); ctx.fill(); }
  const [a, b, c] = box(Q.body, Q.rad * V.sc);
  ctx.fillStyle = 'rgba(80,84,92,.06)'; ctx.fill(); ctx.strokeStyle = PLAN_C.wall; ctx.lineWidth = 2; ctx.stroke();
  for (const m of Q.mirrors) { box(m, 2); ctx.fillStyle = PLAN_C.wall; ctx.fill(); }
  if (Q.cabin) { box(Q.cabin, .12 * V.sc); ctx.strokeStyle = PLAN_C.propLine; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]); }
  if (Q.bed) { box(Q.bed, 3); ctx.strokeStyle = PLAN_C.wall; ctx.lineWidth = 1.2; ctx.stroke(); }
  ctx.fillStyle = 'rgba(80,84,92,.18)';
  box(Q.dash, 3); ctx.fill();
  for (const s of Q.seats) { box(s, 3); ctx.fill(); }
  if (Q.wheel) { const [x, y] = toS(Q.wheel[0], Q.wheel[1]); ctx.beginPath(); ctx.arc(x, y, Math.max(3, Q.wr * V.sc), 0, Math.PI * 2); ctx.strokeStyle = PLAN_C.muted; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.font = '600 10px Archivo, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = PLAN_C.muted;
  if (Q.door) { const [p, q, r, s] = box(Q.door); ctx.fillStyle = PLAN_C.bg; ctx.fillRect(p - 2, q, r - p + 4, s - q); ctx.fillStyle = PLAN_C.muted; ctx.save(); ctx.translate(r + 8, (q + s) / 2); ctx.rotate(Math.PI / 2); ctx.fillText('Puerta', 0, 0); ctx.restore(); }
  if (Q.driver) { const [x, y] = toS(Q.driver[0], Q.driver[1]); ctx.beginPath(); ctx.arc(x, y, Math.max(4, .2 * V.sc), 0, Math.PI * 2); ctx.fillStyle = '#B4B9C1'; ctx.fill(); ctx.fillStyle = PLAN_C.muted; ctx.fillText('Chofer', x, y + Math.max(4, .2 * V.sc) + 11); }
  ctx.fillStyle = PLAN_C.muted; ctx.fillText('Frente', (a + c) / 2, b - 6);
  ctx.restore();
}
function makePlan(canvas, ed, opt = {}) {
  const ctx = canvas.getContext('2d');
  const V = { x: 0, z: 1, sc: 40, W: 0, H: 0, dpr: 1 };
  let drag = null;
  const toS = (x, z) => [V.W / 2 + (x - V.x) * V.sc, V.H / 2 + (z - V.z) * V.sc];
  const toW = (sx, sy) => [V.x + (sx - V.W / 2) / V.sc, V.z + (sy - V.H / 2) / V.sc];
  function resize() {
    const r = opt.w ? { width: opt.w, height: opt.h } : canvas.getBoundingClientRect();
    V.dpr = opt.w ? (opt.dpr || 2) : Math.min(2, window.devicePixelRatio || 1);
    V.W = Math.max(50, r.width); V.H = Math.max(50, r.height);
    canvas.width = Math.round(V.W * V.dpr); canvas.height = Math.round(V.H * V.dpr);
  }
  function fit() {
    resize();
    const s3 = ed.s3, pts = [];
    for (const k of s3.keys) { pts.push([k.cam.x, k.cam.z]); for (const id in k.o) { const ob = s3.objs.find(o => o.id === id); if (ob && ob.kind === 'luz' && ob.type === 'sol') continue; if (ob && ob.hold) continue; pts.push([k.o[id].x, k.o[id].z]); } }
    const plf = planOf(s3);
    if (plf) { const W = planWorld(plf); pts.push([W.x(W.b.x0), W.z(W.b.y0)], [W.x(W.b.x1), W.z(W.b.y1)]); }
    for (const m of s3.meas || []) for (const q of [m.a, m.b]) if (q && typeof q.x === 'number') pts.push([q.x, q.z]);
    const fb = typeof set3dOf === 'function' && set3dFitBox(set3dOf(s3));
    if (fb) pts.push([fb[0], fb[1]], [fb[2], fb[3]]);
    if (s3.set === 'auto' && typeof carPlan === 'function') { const cb = carPlan(s3).body; pts.push([cb[0], cb[1]], [cb[2], cb[3]]); }   // el vehículo entero
    if (!pts.length) pts.push([0, 0]);
    let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0])), z0 = Math.min(...pts.map(p => p[1])), z1 = Math.max(...pts.map(p => p[1]));
    // un metro de aire alrededor y, además, un margen en pantalla: la cámara y su lente no quedan cortadas por el
    // borde ni tapadas por los controles de abajo a la derecha
    const pad = 1, mx = 24, mt = 24, mb = opt.w ? 24 : 56;
    x0 -= pad; x1 += pad; z0 -= pad; z1 += pad;
    V.sc = clamp(Math.min((V.W - 2 * mx) / (x1 - x0), (V.H - mt - mb) / (z1 - z0)), 4, 160);
    V.x = (x0 + x1) / 2; V.z = (z0 + z1) / 2 + (mb - mt) / 2 / V.sc;
    draw();
  }
  function arrowHead(x1, y1, x2, y2, s, col) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - s * Math.cos(a - .5), y2 - s * Math.sin(a - .5)); ctx.lineTo(x2 - s * Math.cos(a + .5), y2 - s * Math.sin(a + .5)); ctx.closePath(); ctx.fill();
  }
  /* el cono de una cámara (contorno, y un relleno suave); short: hasta unos metros, para que varias no tapen todo */
  function camCone(cam, col, fillA, lineA, short) {
    const hf = 2 * Math.atan((cam.sw || 36) / 2 / clamp(cam.lens, 8, 600)), [cx, cy] = toS(cam.x, cam.z);
    if (Math.abs(cam.pitch) >= 80) return;
    const L = short ? Math.max(40, 3.2 * V.sc) : Math.max(V.W, V.H) * 1.5;
    const dA = [-Math.sin(rad(cam.yaw) - hf / 2), -Math.cos(rad(cam.yaw) - hf / 2)], dB = [-Math.sin(rad(cam.yaw) + hf / 2), -Math.cos(rad(cam.yaw) + hf / 2)];
    ctx.save(); ctx.fillStyle = planRGBA(col, fillA); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dA[0] * L, cy + dA[1] * L); ctx.lineTo(cx + dB[0] * L, cy + dB[1] * L); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = planRGBA(col, lineA); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx + dA[0] * L, cy + dA[1] * L); ctx.lineTo(cx, cy); ctx.lineTo(cx + dB[0] * L, cy + dB[1] * L); ctx.stroke(); ctx.restore();
  }
  /* la cámara dibujada (el cuerpo y el parasol), con su rótulo; faint: la otra cámara del plano */
  function camBody(cam, col, label, faint, dy = 0) {
    const [cx, cy] = toS(cam.x, cam.z);
    ctx.save(); ctx.globalAlpha = faint ? .75 : 1; ctx.translate(cx, cy); ctx.rotate(-rad(cam.yaw));
    ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(-8, -2, 16, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5.5, -2); ctx.lineTo(-8, -9); ctx.lineTo(8, -9); ctx.lineTo(5.5, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    if (label) { ctx.save(); ctx.fillStyle = col; ctx.font = '700 10.5px Archivo, Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, cx + 13, cy + 13 + dy); ctx.restore(); }
  }
  function path(pts, col) {
    const uniq = pts.filter((p, i) => !i || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > .01);
    if (uniq.length < 2) return;
    const sp = uniq.map(p => toS(p[0], p[1]));
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
    ctx.beginPath(); sp.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.setLineDash([]);
    sp.forEach(([x, y]) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); });
    const a = sp[sp.length - 2], b = sp[sp.length - 1];
    arrowHead(a[0], a[1], b[0], b[1], 8, col);
    ctx.restore();
  }
  function draw() {
    if (!V.W) resize();
    const s3 = ed.s3, st = ed.state();
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    ctx.fillStyle = PLAN_C.bg; ctx.fillRect(0, 0, V.W, V.H);
    // sin cuadrícula: el fondo liso; la escala de abajo da las medidas
    planDrawSet(ctx, s3, V, toS, () => draw());
    // trayectorias
    for (const ob of s3.objs) if (!ob.hold) path(s3.keys.map(k => k.o[ob.id]).filter(Boolean).map(p => [p.x, p.z]), ob.kind === 'actor' ? lookOf(ob).color : ob.kind === 'luz' ? '#C98A1E' : PLAN_C.propLine);
    // con cámara B: cada una con su letra y su color; la otra, tenue (tocarla la elige)
    const letter = ed.camLetter ? ed.camLetter() : '', CC = letter === 'B' ? PLAN_CB : PLAN_C.cam, oc = ed.other ? ed.other() : null;
    if (oc) path(oc.path, planRGBA(oc.col, .7));
    path(s3.keys.map(k => [k.cam.x, k.cam.z]), CC);
    // cono de visión
    if (oc) camCone(oc.cam, oc.col, .045, .4, true);
    const cam = st.cam;
    const hf = 2 * Math.atan((cam.sw || 36) / 2 / clamp(cam.lens, 8, 600));   // con el ancho del sensor del plano
    const [cx, cy] = toS(cam.x, cam.z);
    const L = Math.max(V.W, V.H) * 1.5;
    const dA = [-Math.sin(rad(cam.yaw) - hf / 2), -Math.cos(rad(cam.yaw) - hf / 2)], dB = [-Math.sin(rad(cam.yaw) + hf / 2), -Math.cos(rad(cam.yaw) + hf / 2)];
    if (Math.abs(cam.pitch) < 80) {
      ctx.fillStyle = planRGBA(CC, .1); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dA[0] * L, cy + dA[1] * L); ctx.lineTo(cx + dB[0] * L, cy + dB[1] * L); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = planRGBA(CC, .55); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx + dA[0] * L, cy + dA[1] * L); ctx.lineTo(cx, cy); ctx.lineTo(cx + dB[0] * L, cy + dB[1] * L); ctx.stroke();
    } else {
      // cenital o nadir: rectángulo de cuadro en el suelo
      const vh = Math.abs(cam.h) * Math.tan(hf / 2);
      ctx.strokeStyle = planRGBA(CC, .55); ctx.fillStyle = planRGBA(CC, .1);
      ctx.fillRect(cx - vh * V.sc, cy - vh * V.sc / aspectOf(), vh * 2 * V.sc, vh * 2 * V.sc / aspectOf());
      ctx.strokeRect(cx - vh * V.sc, cy - vh * V.sc / aspectOf(), vh * 2 * V.sc, vh * 2 * V.sc / aspectOf());
    }
    // objetos
    const sel = ed.sel;
    for (const ob of s3.objs.filter(o => o.kind === 'luz')) drawLight(ob, st.o[ob.id], st);
    for (const ob of s3.objs.filter(o => o.kind !== 'actor' && o.kind !== 'luz' && !o.hold)) {
      const p = st.o[ob.id]; if (!p) continue;
      const fp = objFoot(ob);   // lote W · con su escala
      const [sx, sy] = toS(p.x, p.z);
      // extras en grupo: un punto por persona dentro de su área (punteada) y un solo nombre
      if (ob.kind === 'gente') {
        const L = genteLayout(ob), on = sel === ob.id;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(-rad(p.rot));
        ctx.fillStyle = on ? 'rgba(44,71,207,.06)' : 'rgba(40,44,52,.035)'; ctx.fillRect(-L.w * V.sc / 2, -L.d * V.sc / 2, L.w * V.sc, L.d * V.sc);
        ctx.setLineDash([4, 4]); ctx.strokeStyle = on ? PLAN_C.cam : PLAN_C.propLine; ctx.lineWidth = on ? 2 : 1.1;
        ctx.strokeRect(-L.w * V.sc / 2, -L.d * V.sc / 2, L.w * V.sc, L.d * V.sc); ctx.setLineDash([]);
        const r = clamp(.17 * V.sc, 1.4, 9);
        ctx.fillStyle = '#7E8692';
        for (const m of L.pts) { ctx.beginPath(); ctx.arc(m.x * V.sc, m.z * V.sc, r, 0, Math.PI * 2); ctx.fill(); }
        // hacia dónde mira el grupo (su frente)
        ctx.strokeStyle = on ? PLAN_C.cam : '#7E8692'; ctx.lineWidth = 1.5;
        const fy = L.d * V.sc / 2 + 6; ctx.beginPath(); ctx.moveTo(-6, fy); ctx.lineTo(0, fy + 6); ctx.lineTo(6, fy); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = PLAN_C.ink; ctx.font = '700 10.5px Archivo, Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(genteLabel(ob), sx, sy - Math.max(L.w, L.d) * V.sc / 2 - 8);
        if (on) handle(ob, p);
        continue;
      }
      if (ob.kind === 'puerta' || ob.kind === 'ventana') {
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(-rad(p.rot));
        const w = (ob.kind === 'puerta' ? .9 : 1.3) * objSc(ob) * V.sc;
        ctx.fillStyle = PLAN_C.bg; ctx.fillRect(-w / 2 - 2, -Math.max(3, .15 * V.sc) / 2 - 1, w + 4, Math.max(3, .15 * V.sc) + 2);
        ctx.strokeStyle = sel === ob.id ? PLAN_C.cam : PLAN_C.ink; ctx.lineWidth = sel === ob.id ? 2.2 : 1.3;
        if (ob.kind === 'puerta') {
          const a = rad(p.open || 0);
          ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 + Math.cos(a) * w, Math.sin(a) * w); ctx.stroke();
          ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(-w / 2, 0, w, 0, Math.max(a, .02)); ctx.stroke(); ctx.setLineDash([]);
        } else {
          ctx.strokeRect(-w / 2, -2, w, 4); ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke();
          const a = rad(p.open || 0);
          if (a > .01) { ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 + Math.cos(a) * w / 2, Math.sin(a) * w / 2); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2 - Math.cos(a) * w / 2, Math.sin(a) * w / 2); ctx.stroke(); }
        }
        ctx.restore();
        if (sel === ob.id) handle(ob, p);
        continue;
      }
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(-rad(p.rot));
      ctx.fillStyle = PLAN_C.prop; ctx.strokeStyle = sel === ob.id ? PLAN_C.cam : PLAN_C.propLine; ctx.lineWidth = sel === ob.id ? 2.4 : 1.2;
      ctx.fillRect(-fp.w * V.sc / 2, -fp.d * V.sc / 2, fp.w * V.sc, fp.d * V.sc); ctx.strokeRect(-fp.w * V.sc / 2, -fp.d * V.sc / 2, fp.w * V.sc, fp.d * V.sc);
      ctx.restore();
      if (V.sc > 14) { ctx.fillStyle = PLAN_C.muted; ctx.font = '600 10px Archivo, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(fp.name + (objSc(ob) !== 1 ? ` · ${Math.round(objSc(ob) * 100)} %` : ''), sx, sy + 3); }
      if (sel === ob.id) handle(ob, p);
    }
    for (const ob of s3.objs.filter(o => o.kind === 'actor')) {
      const p = st.o[ob.id]; if (!p) continue;
      const [sx, sy] = toS(p.x, p.z);
      const r = Math.max(8, .26 * V.sc);
      const fx = Math.sin(rad(p.rot)), fz = Math.cos(rad(p.rot));
      ctx.fillStyle = lookOf(ob).color;
      ctx.beginPath(); ctx.moveTo(sx + fx * r * 1.75, sy + fz * r * 1.75); ctx.lineTo(sx + fz * r * .75, sy - fx * r * .75); ctx.lineTo(sx - fz * r * .75, sy + fx * r * .75); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = sel === ob.id ? 3 : 1.5; ctx.strokeStyle = sel === ob.id ? PLAN_C.cam : '#fff'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(r * 1.05)}px Archivo, Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((ob.name || 'F').replace(/^(EL|LA|DON|DOÑA)\s+/i, '').charAt(0).toUpperCase(), sx, sy + 1);
      ctx.fillStyle = PLAN_C.ink; ctx.font = '700 10.5px Archivo, Arial, sans-serif'; ctx.textBaseline = 'top';
      ctx.fillText((ob.name || 'Figura') + (p.pose && p.pose !== 'pie' ? ' · ' + (S3_POSE.find(x => x[0] === p.pose) || ['', ''])[1].toLowerCase() : ''), sx, sy + r + 4);
      ctx.textBaseline = 'alphabetic';
      if (sel === ob.id) handle(ob, p);
    }
    // cámara (la otra del plano, tenue, debajo)
    if (oc) { const [ox, oy] = toS(oc.cam.x, oc.cam.z); camBody(oc.cam, oc.col, `${oc.letter} · ${Math.round(oc.cam.lens)}mm`, true, Math.hypot(ox - cx, oy - cy) < 150 ? (oy >= cy ? 15 : -15) : 0); }
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-rad(cam.yaw));
    ctx.fillStyle = sel === 'cam' ? CC : letter === 'B' ? '#5C2410' : '#1E2A55'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.rect(-9, -2, 18, 13); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-9, -10); ctx.lineTo(9, -10); ctx.lineTo(6, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = CC; ctx.font = '700 10.5px Archivo, Arial, sans-serif'; ctx.textAlign = 'left';
    // la altura dice que es altura: «24 mm · 1.1 m» se leía como la distancia al sujeto
    ctx.fillText(`${letter ? letter + ' · ' : ''}${Math.round(cam.lens)} mm · alt. ${cam.h.toFixed(1)} m`, cx + 14, cy + 14);
    if (!ed.s3.aim && !opt.static) {
      const hx = cx - Math.sin(rad(cam.yaw)) * 46, hy = cy - Math.cos(rad(cam.yaw)) * 46;
      ctx.strokeStyle = CC; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(hx, hy); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      const a = st.o[ed.s3.aim];
      if (a) { const [ax, ay] = toS(a.x, a.z); ctx.strokeStyle = CC; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ax, ay); ctx.stroke(); ctx.setLineDash([]); }
    }
    // con desenfoque: la zona nítida alrededor de quien se enfoca (lote W: o a la distancia a mano; la línea se arrastra)
    foLine = null;
    if (s3.dof && !(s3.meas || []).length) {
      const fp = dofFocus(s3, st), s = fp && Math.hypot(fp.x - cam.x, fp.z - cam.z, fp.y - cam.h);
      if (s) dofBand(cam, [fp.x, fp.z], s, dofOf(clamp(cam.lens, 8, 600), dofF(s3), cam.sw || 36, s), !opt.static && !!ed.focusDrag);
    }
    drawMeas(st);
    // escala
    ctx.fillStyle = PLAN_C.muted; ctx.font = '600 10px Archivo, Arial, sans-serif'; ctx.textAlign = 'left';
    const m = V.sc >= 30 ? 1 : V.sc >= 8 ? 5 : 10;
    ctx.fillRect(10, V.H - 14, m * V.sc, 2); ctx.fillText(m + ' m', 14 + m * V.sc, V.H - 9);
  }
  /* las medidas: una línea con sus topes y la distancia en una etiqueta al medio (la que se está trazando, más marcada) */
  let mLive = null, mBoxes = [];
  function drawMeas(st) {
    mBoxes = [];
    const L = [...(ed.s3.meas || []).map((m, i) => [m, i]), ...(mLive ? [[mLive, -1]] : [])];
    if (!L.length) return;
    const letter = ed.camLetter ? ed.camLetter() : '', oc = ed.other ? ed.other() : null;
    ctx.save();
    const camOf = q => q && q.c ? (q.c === (letter || 'A') ? st.cam : oc && oc.letter === q.c ? oc.cam : null) : null;
    for (const [m, i] of L) {
      const a = measPt(st, letter, oc, m.a), b = measPt(st, letter, oc, m.b); if (!a || !b) continue;
      const [x1, y1] = toS(a[0], a[1]), [x2, y2] = toS(b[0], b[1]), len = Math.hypot(x2 - x1, y2 - y1);
      let d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const ux = len ? (x2 - x1) / len : 1, uy = len ? (y2 - y1) / len : 0;
      // de una cámara a una figura, objeto o luz: la distancia de foco y lo que queda nítido con el diafragma del plano
      const fc = camOf(m.a) && !m.b.c ? [camOf(m.a), m.b, b] : camOf(m.b) && !m.a.c ? [camOf(m.b), m.a, a] : null;
      const s = fc && measFocus(ed.s3, st, fc[0], fc[1]);
      let sub = '';
      if (s) {
        const N = dofF(ed.s3), Z = dofOf(clamp(fc[0].lens, 8, 600), N, fc[0].sw || 36, s);
        sub = `${fTxt(fRound(N))} · nítido ${dofFmt(Z.near)}–${dofFmt(Z.far)} m`;
        if (fc[0] === st.cam) dofBand(fc[0], fc[2], s, Z);
        d = s;
      }
      ctx.strokeStyle = PLAN_MEAS; ctx.fillStyle = PLAN_MEAS; ctx.lineWidth = i < 0 ? 2 : 1.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      for (const [x, y] of [[x1, y1], [x2, y2]]) {
        ctx.beginPath(); ctx.moveTo(x - uy * 6, y + ux * 6); ctx.lineTo(x + uy * 6, y - ux * 6); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      const t = measFmt(d);
      ctx.font = '700 11px Archivo, Arial, sans-serif';
      let w = ctx.measureText(t).width + 12;
      if (sub) { ctx.font = '600 9.5px Archivo, Arial, sans-serif'; w = Math.max(w, ctx.measureText(sub).width + 12); }
      const h = sub ? 30 : 18;
      // en una medida corta, la etiqueta va al costado de la línea (no tapa lo que se midió)
      const off = len < w + 28 ? 15 : 0, nx = uy, ny = -ux, sg = ny > 0 ? -1 : 1;
      const lx = (x1 + x2) / 2 + nx * off * sg, ly = (y1 + y2) / 2 + ny * off * sg;
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(lx - w / 2, ly - h / 2, w, h, 9) : ctx.rect(lx - w / 2, ly - h / 2, w, h); ctx.fill();
      ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = PLAN_MEAS; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (sub) { ctx.font = '700 11px Archivo, Arial, sans-serif'; ctx.fillText(t, lx, ly - 5.5); ctx.font = '600 9.5px Archivo, Arial, sans-serif'; ctx.fillText(sub, lx, ly + 7.5); }
      else ctx.fillText(t, lx, ly + .5);
      ctx.textBaseline = 'alphabetic';
      if (i >= 0) mBoxes.push([lx - w / 2, ly - h / 2, lx + w / 2, ly + h / 2, i]);
    }
    ctx.restore();
  }
  /* la zona nítida en el cono de la cámara: una franja de la distancia cercana a la lejana (llevadas al piso, a lo largo
     del eje de la cámara) y una raya en el plano de foco, a la altura del sujeto */
  let foLine = null;
  function dofBand(cam, p, s, Z, grab) {
    if (Math.abs(cam.pitch) >= 80) return;
    const fx = -Math.sin(rad(cam.yaw)), fz = -Math.cos(rad(cam.yaw)), ax = (p[0] - cam.x) * fx + (p[1] - cam.z) * fz;
    const t = (cam.sw || 36) / 2 / clamp(cam.lens, 8, 600);   // la mitad del ancho del cuadro por metro
    if (ax <= .05 || Math.abs((p[0] - cam.x) * fz - (p[1] - cam.z) * fx) > ax * t * 1.02) return;   // fuera del cuadro
    const k = ax / s, far = Math.min(isFinite(Z.far) ? Z.far * k : Infinity, (V.W + V.H) / V.sc * 2), near = Z.near * k;
    const at = (a, sg) => toS(cam.x + fx * a + fz * a * t * sg, cam.z + fz * a - fx * a * t * sg);
    ctx.save();
    ctx.fillStyle = planRGBA(PLAN_MEAS, .1); ctx.beginPath();
    for (const q of [at(near, -1), at(near, 1), at(far, 1), at(far, -1)]) ctx.lineTo(q[0], q[1]);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = planRGBA(PLAN_MEAS, .6); ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    for (const a of isFinite(Z.far) ? [near, far] : [near]) { const [p0, p1] = [at(a, -1), at(a, 1)]; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }
    ctx.setLineDash([]); ctx.lineWidth = 1.6; ctx.strokeStyle = planRGBA(PLAN_MEAS, .85);
    { const [p0, p1] = [at(ax, -1), at(ax, 1)]; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      // lote W · la línea de foco se arrastra: un tirador chico al medio
      if (grab) {
        const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
        ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = planRGBA(PLAN_MEAS, .9); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(mx, my, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        foLine = { a: p0, b: p1, k: ax / s, fx, fz };
      } }
    ctx.restore();
  }
  // ¿el puntero sobre la línea de foco? (a lo largo de ella, a 9 px)
  function foHit(sx, sy) {
    const F = foLine; if (!F) return false;
    const [ax, ay] = F.a, [bx, by] = F.b, vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1, u = clamp(((sx - ax) * vx + (sy - ay) * vy) / L2, 0, 1);
    return Math.hypot(sx - (ax + vx * u), sy - (ay + vy * u)) < 9;
  }
  // dónde cae una punta: en la cámara, en una figura, un objeto o una luz (los sigue), o en el piso
  function measSnap(sx, sy, e) {
    const st = ed.state(), letter = ed.camLetter ? ed.camLetter() : '', oc = ed.other ? ed.other() : null;
    const [cx, cy] = toS(st.cam.x, st.cam.z);
    if (Math.hypot(sx - cx, sy - cy) < 16) return { c: letter || 'A' };
    if (oc) { const [ox, oy] = toS(oc.cam.x, oc.cam.z); if (Math.hypot(sx - ox, sy - oy) < 16) return { c: oc.letter }; }
    const h = hit(sx, sy);
    if (h && h.id && (h.t === 'obj' || h.t === 'rot')) return { o: h.id };
    if (h && h.t === 'camrot') return { c: letter || 'A' };
    const [wx, wz] = toW(sx, sy);
    return { x: snap(wx, e), z: snap(wz, e) };
  }
  function drawLight(ob, p, st) {
    if (!p) return;
    const [sx, sy] = toS(p.x, p.z);
    const col = kelvinHex(p.k || 3200), on = (p.int || 0) > 0;
    let dx = Math.sin(rad(p.rot || 0)), dz = Math.cos(rad(p.rot || 0));
    const tg = ob.aim && st.o[ob.aim];
    if (tg && ob.type !== 'sol') { const L = Math.hypot(tg.x - p.x, tg.z - p.z) || 1; dx = (tg.x - p.x) / L; dz = (tg.z - p.z) / L; }
    ctx.save();
    if (ob.type === 'sol') {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      for (const o of [-40, 0, 40]) { const ox = -dz * o, oy = dx * o; ctx.beginPath(); ctx.moveTo(sx + ox, sy + oy); ctx.lineTo(sx + ox + dx * 90, sy + oy + dz * 90); ctx.stroke(); }
      ctx.setLineDash([]); arrowHead(sx, sy, sx + dx * 96, sy + dz * 96, 10, col);
    } else if (ob.type === 'rebote' || ob.type === 'bandera') {
      // el tablero visto desde arriba: una línea de su ancho, de frente a donde apunta
      const F = fxOf(ob), hw = F.size[0] / 2 * V.sc;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3A3C42'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(sx + dz * hw, sy - dx * hw); ctx.lineTo(sx - dz * hw, sy + dx * hw); ctx.stroke();
      ctx.strokeStyle = ob.type === 'rebote' ? '#F6F4EE' : '#1D1E21'; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.restore();
      if (tg) { const [tx, ty] = toS(tg.x, tg.z); ctx.save(); ctx.strokeStyle = '#8A8D96'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.restore(); }
      ctx.save(); ctx.fillStyle = '#3A3C42'; ctx.font = '700 10px Archivo, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(ob.name || (ob.type === 'rebote' ? 'Rebote' : 'Bandera'), sx, sy + 10); ctx.restore();
      if (ed.sel === ob.id) { ctx.save(); ctx.strokeStyle = PLAN_C.cam; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); if (!ob.aim) handle(ob, p); }
      return;
    } else if (ob.type === 'practica') {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 1.6 * V.sc);
      g.addColorStop(0, col + (on ? '66' : '22')); g.addColorStop(1, col + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 1.6 * V.sc, 0, Math.PI * 2); ctx.fill();
    } else {
      const half = rad(clamp(p.ang || 30, 5, 170) / 2), Lb = (ob.type === 'panel' ? 2.6 : 3.4) * V.sc, a0 = Math.atan2(dz, dx);
      ctx.fillStyle = col + (on ? '40' : '14'); ctx.strokeStyle = col + 'AA'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, Lb, a0 - half, a0 + half); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (tg && ob.type !== 'sol') { const [tx, ty] = toS(tg.x, tg.z); ctx.strokeStyle = '#B07A16'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = col; ctx.strokeStyle = ed.sel === ob.id ? PLAN_C.cam : '#5A4410'; ctx.lineWidth = ed.sel === ob.id ? 3 : 1.5;
    ctx.beginPath();
    if (ob.type === 'panel') ctx.rect(sx - 9, sy - 9, 18, 18); else ctx.arc(sx, sy, 9, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    if (ob.type === 'sol') for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 11, sy + Math.sin(a) * 11); ctx.lineTo(sx + Math.cos(a) * 15, sy + Math.sin(a) * 15); ctx.stroke(); }
    ctx.fillStyle = '#4A3606'; ctx.font = '700 10px Archivo, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(`${ob.name || 'Luz'} · ${Math.round(p.k || 0)}K`, sx, sy + 13); ctx.textBaseline = 'alphabetic';
    ctx.restore();
    if (ed.sel === ob.id && !ob.aim) handle(ob, p);
  }
  function handle(ob, p) {
    const [sx, sy] = toS(p.x, p.z);
    const fp = objFoot(ob);
    const R = Math.max(26, Math.max(fp.w, fp.d) * V.sc * .62 + 14);
    const hx = sx + Math.sin(rad(p.rot)) * R, hy = sy + Math.cos(rad(p.rot)) * R;
    ctx.strokeStyle = PLAN_C.cam; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  function hit(sx, sy) {
    const s3 = ed.s3, st = ed.state();
    const cam = st.cam;
    const [cx, cy] = toS(cam.x, cam.z);
    if (!s3.aim) { const hx = cx - Math.sin(rad(cam.yaw)) * 46, hy = cy - Math.cos(rad(cam.yaw)) * 46; if (Math.hypot(sx - hx, sy - hy) < 11) return { t: 'camrot' }; }
    if (ed.sel && ed.sel !== 'cam') {
      const ob = s3.objs.find(o => o.id === ed.sel), p = ob && st.o[ob.id];
      if (p) {
        const [px, py] = toS(p.x, p.z);
        const fp = objFoot(ob);
        const R = Math.max(26, Math.max(fp.w, fp.d) * V.sc * .62 + 14);
        if (Math.hypot(sx - (px + Math.sin(rad(p.rot)) * R), sy - (py + Math.cos(rad(p.rot)) * R)) < 11) return { t: 'rot', id: ob.id };
      }
    }
    if (Math.hypot(sx - cx, sy - cy) < 14) return { t: 'cam' };
    const oc = ed.other ? ed.other() : null;
    if (oc) { const [ox, oy] = toS(oc.cam.x, oc.cam.z); if (Math.hypot(sx - ox, sy - oy) < 14) return { t: 'cam2' }; }
    const list = [...s3.objs].filter(o => !o.hold).sort((a, b) => (a.kind === 'actor' || a.kind === 'luz' ? 0 : 1) - (b.kind === 'actor' || b.kind === 'luz' ? 0 : 1));
    for (const ob of list) {
      const p = st.o[ob.id]; if (!p) continue;
      const [px, py] = toS(p.x, p.z);
      if (ob.kind === 'luz') { if (Math.hypot(sx - px, sy - py) < 12) return { t: 'obj', id: ob.id }; continue; }
      if (ob.kind === 'actor') { if (Math.hypot(sx - px, sy - py) < Math.max(11, .3 * V.sc)) return { t: 'obj', id: ob.id }; continue; }
      const fp = objFoot(ob);
      const a = rad(p.rot), dx = sx - px, dy = sy - py;
      const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= fp.w * V.sc / 2 + 4 && Math.abs(ly) <= fp.d * V.sc / 2 + 4) return { t: 'obj', id: ob.id };
    }
    return null;
  }
  const snap = (v, e) => e.shiftKey ? Math.round(v * 4) / 4 : Math.round(v * 100) / 100;
  function zoomAt(sx, sy, f) {
    const [wx, wz] = toW(sx, sy);
    V.sc = clamp(V.sc * f, 3, 240);
    V.x = wx - (sx - V.W / 2) / V.sc; V.z = wz - (sy - V.H / 2) / V.sc;
    draw();
  }
  if (!opt.static) {
  /* dos dedos: pellizcar acerca o aleja la planta alrededor de los dedos, y moverlos la desplaza. Lo que empezó el
     primer dedo se deshace (no se elige ni se mueve nada) */
  const tch = new Map();
  let pz = null, pre = null;
  const two = () => { const r = canvas.getBoundingClientRect(), [a, b] = [...tch.values()]; return { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mx: (a[0] + b[0]) / 2 - r.left, my: (a[1] + b[1]) / 2 - r.top }; };
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    tch.set(e.pointerId, [e.clientX, e.clientY]);
    if (tch.size === 1) { pre = ed.snap ? ed.snap() : null; return; }
    e.stopImmediatePropagation(); e.preventDefault();
    if (tch.size !== 2) return;
    drag = null; if (ed.restore) ed.restore(pre);
    try { canvas.setPointerCapture(e.pointerId); } catch (er) { }
    const g = two();
    pz = { d0: g.d, sc0: V.sc, w: toW(g.mx, g.my) };
  }, true);
  canvas.addEventListener('pointermove', e => {
    if (!tch.has(e.pointerId)) return;
    tch.set(e.pointerId, [e.clientX, e.clientY]);
    if (!pz || tch.size < 2) return;
    e.stopImmediatePropagation();
    const g = two();
    V.sc = clamp(pz.sc0 * g.d / pz.d0, 3, 240);
    V.x = pz.w[0] - (g.mx - V.W / 2) / V.sc; V.z = pz.w[1] - (g.my - V.H / 2) / V.sc;
    draw();
  }, true);
  const untch = e => { if (!tch.delete(e.pointerId)) return; if (tch.size < 2) pz = null; if (!tch.size) pre = null; };
  canvas.addEventListener('pointerup', untch, true); canvas.addEventListener('pointercancel', untch, true);
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    // midiendo: tocar una medida la quita; si no, se traza una nueva desde aquí
    if (ed.measuring && ed.measuring()) {
      canvas.setPointerCapture(e.pointerId); e.preventDefault();
      const mb = mBoxes.find(([x0, y0, x1, y1]) => sx >= x0 - 3 && sx <= x1 + 3 && sy >= y0 - 3 && sy <= y1 + 3);
      if (mb) { drag = null; const L = (ed.s3.meas || []).filter((_, i) => i !== mb[4]); if (ed.measSet) ed.measSet(L); return; }
      const a = measSnap(sx, sy, e);
      mLive = { a, b: a }; drag = { t: 'meas', sx, sy };
      draw(); return;
    }
    const h = hit(sx, sy);
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
    // lote W · la línea de foco (si no se tocó algo encima): acercar o alejar el foco
    if ((!h || h.t === 'cam') && foHit(sx, sy)) { drag = { t: 'focus', k: foLine.k, fx: foLine.fx, fz: foLine.fz }; return; }
    if (!h) { drag = { t: 'pan', sx, sy, vx: V.x, vz: V.z }; return; }
    if (h.t === 'cam2') { drag = null; if (ed.switchCam) ed.switchCam(); return; }
    if (h.t === 'obj' || h.t === 'rot') ed.select(h.id);
    if (h.t === 'cam' || h.t === 'camrot') ed.select('cam');
    const [wx, wz] = toW(sx, sy);
    const st = ed.state();
    const base = h.t === 'cam' || h.t === 'camrot' ? st.cam : st.o[h.id];
    drag = { ...h, ox: wx - base.x, oz: wz - base.z, moved: false };
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) { if (e.pointerType === 'mouse') { const r = canvas.getBoundingClientRect(); canvas.style.cursor = foHit(e.clientX - r.left, e.clientY - r.top) ? 'grab' : ''; } return; }
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    if (drag.t === 'meas') { if (mLive) { mLive.b = measSnap(sx, sy, e); drag.moved = Math.hypot(sx - drag.sx, sy - drag.sy) > 6; draw(); } return; }
    if (drag.t === 'pan') { if (Math.hypot(sx - drag.sx, sy - drag.sy) > 3) drag.moved = true; V.x = drag.vx - (sx - drag.sx) / V.sc; V.z = drag.vz - (sy - drag.sy) / V.sc; draw(); return; }
    if (drag.t === 'focus') {
      // la distancia en el piso, a lo largo del eje de la cámara, llevada a la del eje (con la cámara inclinada es más larga)
      const c = ed.state().cam, [wx, wz] = toW(sx, sy), a = (wx - c.x) * drag.fx + (wz - c.z) * drag.fz;
      drag.moved = true; ed.focusDrag(Math.max(.3, a / (drag.k || 1)));
      return;
    }
    const [wx, wz] = toW(sx, sy);
    const k = ed.editKey();
    if (drag.t === 'obj') {
      const p = k.o[drag.id]; p.x = snap(wx - drag.ox, e); p.z = snap(wz - drag.oz, e);
      const ob = ed.s3.objs.find(o => o.id === drag.id);
      if (ob && (S3_PROPS[ob.kind] || {}).wall && ed.s3.set === 'int') snapToWall(ed.s3, p);
    }
    if (drag.t === 'rot') { const p = k.o[drag.id], st = ed.state().o[drag.id]; let a = deg(Math.atan2(wx - st.x, wz - st.z)); if (e.shiftKey) a = Math.round(a / 15) * 15; p.rot = Math.round(a); }
    if (drag.t === 'cam') { k.cam.x = snap(wx - drag.ox, e); k.cam.z = snap(wz - drag.oz, e); }
    if (drag.t === 'camrot') { const c = ed.state().cam; let a = deg(Math.atan2(-(wx - c.x), -(wz - c.z))); if (e.shiftKey) a = Math.round(a / 15) * 15; k.cam.yaw = Math.round(a * 10) / 10; }
    drag.moved = true;
    ed.changed('plan');
  });
  // un toque en un espacio vacío de la planta suelta la figura u objeto elegido
  const end = () => {
    if (drag && drag.t === 'meas') {
      const m = mLive; mLive = null; drag = null;
      const st = ed.state(), letter = ed.camLetter ? ed.camLetter() : '', oc = ed.other ? ed.other() : null, a = m && measPt(st, letter, oc, m.a), b = m && measPt(st, letter, oc, m.b);
      // una medida de menos de 5 cm (un toque, o las dos puntas en lo mismo) no queda
      if (a && b && Math.hypot(b[0] - a[0], b[1] - a[1]) >= .05 && JSON.stringify(m.a) !== JSON.stringify(m.b) && ed.measSet) ed.measSet([...(ed.s3.meas || []), m]);
      else draw();
      return;
    }
    if (drag && drag.t === 'pan') { if (!drag.moved && ed.tapEmpty) ed.tapEmpty(); drag = null; return; }
    if (drag && drag.t === 'focus') { if (drag.moved) ed.focusDrag(null); drag = null; return; }
    if (drag && drag.moved) ed.commit(); drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .0015));
  }, { passive: false });
  }
  return { draw, fit, resize: () => { resize(); draw(); }, zoom: f => zoomAt(V.W / 2, V.H / 2, f), toScreen: (x, z) => toS(x, z), cancelMeas: () => { if (mLive) { mLive = null; drag = null; draw(); } } };
}
