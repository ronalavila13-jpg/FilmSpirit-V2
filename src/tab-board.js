/* ============================================================
   Pestaña 3 · STORYBOARD y guion técnico
   ============================================================ */
const ASPECTS = { '16:9': 16 / 9, '1.85:1': 1.85, '2.39:1': 2.39, '4:3': 4 / 3, '9:16': 9 / 16 };
const frameDims = (base = 960) => { const r = ASPECTS[P.meta.aspect] || 16 / 9; return r >= 1 ? [base, Math.round(base / r)] : [Math.round(base * r), base]; };

/* ---------- boceto automático a partir de los datos del plano ---------- */
const SZ = {
  GPG: { hf: .16, top: .58 }, PG: { hf: .42, top: .40 }, PC: { hf: .62, top: .27 }, PE: { hf: .86, top: .08 },
  PA: { hf: 1.25, top: .08 }, PM: { hf: 1.85, top: .10 }, PMC: { hf: 2.6, top: .10 }, PP: { hf: 4.2, top: .12 }, PPP: { hf: 7.5, top: -.18 },
};
function shotSketchInfo(sh) {
  const s = sceneOfKey(sh.sc);
  const names = (sh.chars || []).map(id => P.elements[id]).filter(Boolean).map(e => e.name);
  let prop = '';
  if (sh.p0 != null) {
    const t = P.tags.find(t => t.p >= sh.p0 && t.p <= sh.p1 && P.elements[t.el] && ['props', 'vfx', 'setdress', 'weapons', 'vehicles'].includes(P.elements[t.el].cat));
    if (t) prop = P.elements[t.el].name;
  }
  return { size: sh.size || 'PM', angle: sh.angle || 'Normal', move: sh.move || 'Fijo', names, ie: s ? s.ie : 'INT', dn: s ? s.dn : 'D', prop };
}
function drawAutoFrame(ctx, W, H, info) {
  const ink = '#3A3A38', soft = '#B9B6AE', fillFig = '#E2DFD8', red = '#C8382C';
  const lw = Math.max(1.4, W / 420);
  ctx.save();
  ctx.fillStyle = info.dn === 'N' ? '#E7E9EF' : '#FAFAF7';
  ctx.fillRect(0, 0, W, H);
  const size = SZ[info.size] ? info.size : (info.size === 'PD' || info.size === 'INS' ? info.size : 'PM');
  const ang = info.angle || 'Normal';
  if (ang === 'Holandés') { ctx.translate(W / 2, H / 2); ctx.rotate(-0.17); ctx.translate(-W / 2, -H / 2); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  let horizon = .44;
  if (ang === 'Picado') horizon = .12; else if (ang === 'Contrapicado' || ang === 'Nadir') horizon = .86;
  const wide = ['GPG', 'PG', 'PC', 'PE'].includes(size);
  // fondo
  ctx.strokeStyle = soft; ctx.lineWidth = lw;
  if (ang === 'Cenital') {
    ctx.setLineDash([lw * 3, lw * 4]);
    for (let x = W * .1; x < W; x += W * .14) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.setLineDash([]);
  } else if (info.ie === 'EXT') {
    const hy = H * horizon;
    ctx.beginPath(); ctx.moveTo(-W * .1, hy); ctx.lineTo(W * 1.1, hy); ctx.stroke();
    if (wide) {
      const blocks = [[.02, .2, .22], [.2, .12, .3], [.66, .16, .26], [.83, .14, .18]];
      for (const [x, w, h] of blocks) { ctx.strokeRect(W * x, hy - H * h * (horizon < .3 ? .4 : 1), W * w, H * h * (horizon < .3 ? .4 : 1)); }
      ctx.beginPath(); ctx.moveTo(W * .5, hy); ctx.lineTo(-W * .1, H); ctx.moveTo(W * .5, hy); ctx.lineTo(W * 1.1, H); ctx.stroke();
    }
    if (info.dn === 'N') { ctx.beginPath(); ctx.arc(W * .86, H * .14, H * .05, 0, Math.PI * 2); ctx.stroke(); }
  } else {
    const hy = H * horizon;
    if (wide) {
      const bw = W * .56, bh = H * .46, bx = (W - bw) / 2, by = hy - bh * .55;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(0, 0); ctx.moveTo(bx + bw, by); ctx.lineTo(W, 0);
      ctx.moveTo(bx, by + bh); ctx.lineTo(0, H); ctx.moveTo(bx + bw, by + bh); ctx.lineTo(W, H);
      ctx.stroke();
      ctx.strokeRect(bx + bw * .62, by + bh * .18, bw * .2, bh * .5);
    } else {
      ctx.beginPath(); ctx.moveTo(W * .7, 0); ctx.lineTo(W * .7, H * .62); ctx.lineTo(W, H * .62); ctx.stroke();
    }
  }
  // figuras
  const n = clamp(info.names.length || (size === 'PD' || size === 'INS' ? 0 : 1), 0, 4);
  if (size === 'PD' || size === 'INS') {
    ctx.strokeStyle = soft; ctx.beginPath(); ctx.moveTo(0, H * .72); ctx.lineTo(W, H * .64); ctx.stroke();
    ctx.fillStyle = fillFig; ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.4;
    const ow = W * .34, oh = H * .34, ox = W * .33, oy = H * .34;
    roundRect(ctx, ox, oy, ow, oh, H * .03); ctx.fill(); ctx.stroke();
    ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(ox + ow * .15, oy + oh * .3); ctx.lineTo(ox + ow * .85, oy + oh * .3); ctx.stroke();
    // mano
    ctx.fillStyle = fillFig; ctx.lineWidth = lw * 1.2;
    ctx.beginPath(); ctx.ellipse(ox + ow * 1.08, oy + oh * .72, W * .07, H * .055, -.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox + ow * 1.12, oy + oh * .75); ctx.lineTo(W * .98, H * .98); ctx.stroke();
    label(ctx, (info.prop || 'DETALLE').toUpperCase(), ox + ow / 2, oy + oh + H * .07, W, ink);
  } else if (ang === 'Cenital') {
    const xs = spread(n);
    xs.forEach((x, i) => {
      const r = H * ({ GPG: .03, PG: .06, PC: .08, PE: .1 }[size] || .16);
      ctx.fillStyle = fillFig; ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.2;
      ctx.beginPath(); ctx.ellipse(W * x, H * .52, r * 1.9, r * 1.05, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(W * x, H * .52, r * .82, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (info.names[i]) label(ctx, info.names[i], W * x, H * .52 + r * 1.6 + H * .05, W, ink);
    });
  } else {
    const spec = SZ[size];
    let list = info.names.length ? info.names.slice(0, 4) : [''];
    if (['PP', 'PPP', 'PMC'].includes(size) && list.length > 1 && ang !== 'Sobre el hombro') list = list.slice(0, size === 'PMC' ? 2 : 1);
    let xs = spread(list.length);
    if (ang === 'Sobre el hombro') {
      // hombro en primer término
      ctx.fillStyle = '#A8A59D'; ctx.strokeStyle = ink; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.ellipse(W * .12, H * .42, W * .13, H * .2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-W * .1, H); ctx.quadraticCurveTo(W * .02, H * .6, W * .3, H * .66); ctx.lineTo(W * .38, H); ctx.closePath(); ctx.fill();
      xs = [.62];
      list = list.slice(-1);
    }
    let hfMul = 1, topAdd = 0;
    if (ang === 'Picado') { hfMul = .9; topAdd = .05; }
    if (ang === 'Contrapicado' || ang === 'Nadir') { hfMul = 1.06; topAdd = .02; }
    list.forEach((name, i) => {
      const depth = list.length > 2 && i % 2 ? .88 : 1;
      drawFigure(ctx, W * xs[i], H * (spec.top + topAdd + (1 - depth) * .1), H * spec.hf * hfMul * depth, name, { ink, fill: fillFig, lw, W, H });
    });
  }
  if (ang === 'Subjetivo (POV)') {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    tagText(ctx, 'POV', W * .05, H * .1, W, red);
  }
  ctx.restore();
  drawMove(ctx, W, H, info.move, red, lw);
}
function spread(n) { return n <= 1 ? [.5] : n === 2 ? [.34, .66] : n === 3 ? [.24, .5, .76] : [.16, .39, .61, .84]; }
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawFigure(ctx, cx, top, Hf, name, o) {
  const h = Hf / 7.5, w = h * .78;
  const neckY = top + h, shY = top + h * 1.28, shW = h * 2.1, hipY = top + h * 3.7, hipW = h * 1.45, footY = top + Hf;
  ctx.fillStyle = o.fill; ctx.strokeStyle = o.ink; ctx.lineWidth = Math.max(o.lw, h * .045);
  // piernas
  ctx.beginPath();
  ctx.moveTo(cx - hipW * .5, hipY); ctx.lineTo(cx - hipW * .42, footY); ctx.lineTo(cx - hipW * .06, footY); ctx.lineTo(cx, hipY + h * .5);
  ctx.lineTo(cx + hipW * .06, footY); ctx.lineTo(cx + hipW * .42, footY); ctx.lineTo(cx + hipW * .5, hipY); ctx.closePath(); ctx.fill(); ctx.stroke();
  // brazos
  ctx.beginPath();
  ctx.moveTo(cx - shW * .48, shY + h * .1); ctx.lineTo(cx - shW * .62, hipY + h * .55); ctx.lineTo(cx - shW * .44, hipY + h * .6); ctx.lineTo(cx - shW * .3, shY + h * .6);
  ctx.moveTo(cx + shW * .48, shY + h * .1); ctx.lineTo(cx + shW * .62, hipY + h * .55); ctx.lineTo(cx + shW * .44, hipY + h * .6); ctx.lineTo(cx + shW * .3, shY + h * .6);
  ctx.fill(); ctx.stroke();
  // torso
  ctx.beginPath();
  ctx.moveTo(cx - shW / 2, shY + h * .15); ctx.quadraticCurveTo(cx - shW / 2, shY, cx - shW * .35, shY);
  ctx.lineTo(cx + shW * .35, shY); ctx.quadraticCurveTo(cx + shW / 2, shY, cx + shW / 2, shY + h * .15);
  ctx.lineTo(cx + hipW / 2, hipY + h * .1); ctx.lineTo(cx - hipW / 2, hipY + h * .1); ctx.closePath(); ctx.fill(); ctx.stroke();
  // cuello y cabeza
  ctx.beginPath(); ctx.rect(cx - w * .2, neckY - h * .05, w * .4, shY - neckY + h * .08); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, top + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (h > o.H * .12) { // rasgos mínimos en planos cerrados
    ctx.lineWidth = Math.max(o.lw, h * .03);
    ctx.beginPath(); ctx.moveTo(cx - w * .2, top + h * .48); ctx.lineTo(cx - w * .08, top + h * .48); ctx.moveTo(cx + w * .08, top + h * .48); ctx.lineTo(cx + w * .2, top + h * .48);
    ctx.moveTo(cx - w * .1, top + h * .74); ctx.lineTo(cx + w * .1, top + h * .74); ctx.stroke();
  }
  if (name) {
    let ly = top + h + h * .9;
    if (ly > o.H * .92 || ly < o.H * .08) ly = clamp(top - o.H * .04, o.H * .08, o.H * .92);
    if (top < 0 || h > o.H * .4) ly = o.H * .9;
    label(ctx, name, cx, ly, o.W, o.ink);
  }
}
function label(ctx, text, x, y, W, color) {
  ctx.save();
  const fs = Math.round(W / 30);
  ctx.font = `700 ${fs}px Archivo, Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width + fs;
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  roundRect(ctx, x - tw / 2, y - fs * .8, tw, fs * 1.6, fs * .4); ctx.fill();
  ctx.fillStyle = color; ctx.fillText(text, x, y + 1);
  ctx.restore();
}
function tagText(ctx, text, x, y, W, color) {
  ctx.save(); const fs = Math.round(W / 30);
  ctx.font = `800 ${fs}px Archivo, Arial, sans-serif`; ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); ctx.restore();
}
function arrow(ctx, x1, y1, x2, y2, lw, color) {
  const a = Math.atan2(y2 - y1, x2 - x1), hl = lw * 5;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hl * .6, y2 - Math.sin(a) * hl * .6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hl * Math.cos(a - .45), y2 - hl * Math.sin(a - .45)); ctx.lineTo(x2 - hl * Math.cos(a + .45), y2 - hl * Math.sin(a + .45)); ctx.closePath(); ctx.fill();
}
function drawMove(ctx, W, H, move, red, lw) {
  if (!move || move === 'Fijo') return;
  const L = lw * 2.4;
  ctx.save();
  ctx.lineCap = 'round';
  const m = move.toLowerCase();
  if (m.startsWith('paneo')) arrow(ctx, W * .2, H * .1, W * .8, H * .1, L, red);
  else if (m.startsWith('tilt')) arrow(ctx, W * .94, H * .78, W * .94, H * .2, L, red);
  else if (m.includes('in')) {
    const c = [[.06, .1, .2, .28], [.94, .1, .8, .28], [.06, .9, .2, .72], [.94, .9, .8, .72]];
    c.forEach(([a, b, x, y]) => arrow(ctx, W * a, H * b, W * x, H * y, L, red));
    if (m.startsWith('zoom')) { ctx.setLineDash([L * 2, L * 2]); ctx.strokeStyle = red; ctx.lineWidth = lw; ctx.strokeRect(W * .22, H * .3, W * .56, H * .4); }
  } else if (m.includes('out')) {
    const c = [[.2, .28, .06, .1], [.8, .28, .94, .1], [.2, .72, .06, .9], [.8, .72, .94, .9]];
    c.forEach(([a, b, x, y]) => arrow(ctx, W * a, H * b, W * x, H * y, L, red));
  } else if (m.startsWith('travelling') || m.startsWith('seguimiento')) {
    arrow(ctx, W * .15, H * .92, W * .85, H * .92, L * 1.3, red);
    if (m.startsWith('seguimiento')) tagText(ctx, 'SIGUE', W * .05, H * .82, W, red);
  } else if (m.includes('mano')) {
    ctx.strokeStyle = red; ctx.lineWidth = L; ctx.beginPath();
    for (let i = 0; i <= 8; i++) { const x = W * (.05 + i * .02), y = H * .1 + (i % 2 ? -1 : 1) * H * .025; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); tagText(ctx, 'MANO', W * .05, H * .2, W, red);
  } else if (m.startsWith('steadicam') || m.startsWith('arco') || m.startsWith('plano secuencia')) {
    ctx.strokeStyle = red; ctx.lineWidth = L;
    ctx.beginPath(); ctx.ellipse(W / 2, H * .86, W * .32, H * .08, 0, Math.PI * .1, Math.PI * .9, false); ctx.stroke();
    const a = Math.PI * .9, x = W / 2 + Math.cos(a) * W * .32, y = H * .86 + Math.sin(a) * H * .08;
    arrow(ctx, x + W * .02, y - H * .005, x, y - H * .01, L, red);
    if (m.startsWith('plano secuencia')) tagText(ctx, 'PLANO SECUENCIA', W * .05, H * .08, W, red);
  } else if (m.startsWith('grúa')) {
    ctx.strokeStyle = red; ctx.lineWidth = L;
    ctx.beginPath(); ctx.moveTo(W * .08, H * .85); ctx.quadraticCurveTo(W * .08, H * .25, W * .2, H * .15); ctx.stroke();
    arrow(ctx, W * .18, H * .17, W * .22, H * .13, L, red); tagText(ctx, 'GRÚA', W * .1, H * .92, W, red);
  } else if (m.startsWith('drone')) {
    arrow(ctx, W * .08, H * .8, W * .08, H * .2, L, red); tagText(ctx, 'DRONE', W * .12, H * .22, W, red);
  } else if (m.startsWith('barrido')) {
    ctx.strokeStyle = red; ctx.lineWidth = lw;
    for (let i = 0; i < 6; i++) { const y = H * (.2 + i * .12); ctx.beginPath(); ctx.moveTo(W * .03, y); ctx.lineTo(W * (.12 + (i % 3) * .04), y); ctx.moveTo(W * .97, y); ctx.lineTo(W * (.88 - (i % 3) * .04), y); ctx.stroke(); }
  } else tagText(ctx, move.toUpperCase(), W * .05, H * .08, W, red);
  ctx.restore();
}
const frameOf = (sh, t = 0) => shotThumb(sh, t);
// (un dibujo 2D con varios cuadros, o la escena 3D que se ve y se mueve)
const isAnimated = sh => { if (d2On(sh) && sh.d2.frames.length > 1) return true; if (!shot3D(sh)) return false; const s3 = s3Of(sh); return s3.keys.length > 1 || !!s3.shake; };

/* ---------- vista ---------- */
/* el título (lote I): la escena elegida (o todas) con su menú, y en gris cuántos planos hay y cuántos se rodaron */
function boardHeadHTML(scenes, total) {
  const n = scenes.reduce((a, s) => a + (D.shotsBy[s.key] || []).length, 0), done = scenes.reduce((a, s) => a + (D.shotsBy[s.key] || []).filter(x => x.done).length, 0);
  const sub = UI.sbScene ? `${n} ${n === 1 ? 'plano' : 'planos'}${done ? ` · ${done} ${done === 1 ? 'rodado' : 'rodados'}` : ''} · de ${total} en todo el storyboard`
    : `${total} ${total === 1 ? 'plano' : 'planos'} en ${D.sc.scenes.length} ${D.sc.scenes.length === 1 ? 'escena' : 'escenas'}${done ? ` · ${done} ${done === 1 ? 'rodado' : 'rodados'}` : ''}`;
  return `<section class="hd sb-hd">${hdHead({ title: UI.sbScene ? `Escena ${esc(UI.sbScene)}` : 'Todas las escenas', menu: 'data-act="sb-scene-menu" aria-haspopup="menu" title="Elegir la escena"', sub })}</section>`;
}
RENDER.board = function () {
  const v = $('#view');
  if (!D.sc.scenes.length) { v.innerHTML = emptyScript(); bindView(); return; }
  ensureFrames('index');
  const scenes = UI.sbScene ? [sceneOfKey(UI.sbScene)].filter(Boolean) : D.sc.scenes;
  const total = Object.keys(P.shots).length;
  const ar = (ASPECTS[P.meta.aspect] || 16 / 9);
  v.innerHTML = `<div class="ws ws-1"><section class="center">
    <div class="bar">
      ${hdSeg([{ label: 'Viñetas', attrs: 'data-act="sb-view" data-v="panels"', on: UI.sbView === 'panels' }, { label: 'Guion técnico', attrs: 'data-act="sb-view" data-v="table"', on: UI.sbView === 'table' }], 'Vista')}
      <span class="grow"></span>
      <button class="btn ghost m-more" data-act="fichas" title="Cuerpo, estatura, tallas y fotos de cada personaje">Personajes</button>
      ${toolsHTML()}
    </div>
    <div class="scroller pad" data-keep="sb" style="--ar:${ea(ar)}">${boardHeadHTML(scenes, total)}${UI.sbView === 'panels' ? boardPanelsHTML(scenes) : shotTableHTML(scenes)}${UI.sbView === 'panels' && !UI.readOnly ? '<div class="sb-selbar" id="sbSelBar" role="status" hidden></div>' : ''}</div>
  </section></div>`;
  bindView();
  hydrateThumbs();
  if (UI.sbView === 'panels' && !UI.readOnly) {
    bindBoardDrag();
    bindBoardSel();
    sbSelPaint();
    if (Object.keys(P.shots).length > 1) setTimeout(() => { if (UI.tab === 'board' && !$('#modal') && !document.body.classList.contains('home')) coach('sb-drag', 'Arrastra una viñeta para cambiar su orden en la escena. Con ⋯ la duplicas, la mueves o la eliminas.', $('.pcell')); }, 1200);
  }
};
/* ---------- viñetas: arrastrar para cambiar el orden dentro de la escena ----------
   Con el ratón se agarra al primer movimiento; en el teléfono, manteniendo el dedo un instante. */
function bindBoardDrag() {
  const v = $('#view .scroller'); if (!v) return;
  // imágenes soltadas sobre «Nuevo plano»: un plano por imagen
  const imgDrag = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  // y sobre una viñeta (que no sea un dibujo 2D): esa imagen pasa a ser la del plano
  const cellOf = e => { const c = e.target.closest('.pcell'), sh = c && P.shots[c.dataset.sid]; return sh && sh.ws !== '2d' ? c : null; };
  v.addEventListener('dragover', e => { if (!imgDrag(e)) return; const a = e.target.closest('.sb-addc') || cellOf(e); if (!a) return; e.preventDefault(); a.classList.add('drop'); });
  v.addEventListener('dragleave', e => { const a = e.target.closest('.sb-addc, .pcell'); if (a && !a.contains(e.relatedTarget)) a.classList.remove('drop'); });
  v.addEventListener('drop', e => {
    if (!imgDrag(e)) return;
    const a = e.target.closest('.sb-addc');
    if (a) { e.preventDefault(); a.classList.remove('drop'); sbAddImgs(D.sc.scenes[+a.dataset.i], e.dataTransfer.files); return; }
    const c = cellOf(e); if (!c) return;
    e.preventDefault(); c.classList.remove('drop'); sbSetImg(P.shots[c.dataset.sid], e.dataTransfer.files[0]);
  });
  v.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const cell = e.target.closest('.pcell'); if (!cell || e.target.closest('.sbmore')) return;
    pressGesture(e, { target: cell, onLift: ev => boardDrag(cell, ev) });
  });
}
function boardDrag(cell, e) {
  const grid = cell.parentElement, sc = grid.dataset.sc, sid = cell.dataset.sid, sh = P.shots[sid];
  if (!sh) return;
  const cells = [...grid.querySelectorAll('.pcell')];
  const r0 = cell.getBoundingClientRect(), dx = e.clientX - r0.left, dy = e.clientY - r0.top;
  const ghost = cell.cloneNode(true);
  ghost.classList.add('pghost'); Object.assign(ghost.style, { width: r0.width + 'px', left: r0.left + 'px', top: r0.top + 'px' });
  document.body.appendChild(ghost);
  cell.classList.add('plift');
  const mark = document.createElement('i'); mark.className = 'pins'; grid.appendChild(mark);
  const scroller = $('#view .scroller');
  let at = cells.indexOf(cell), raf = 0, cx = e.clientX, cy = e.clientY;
  // lugar de inserción: la viñeta más cercana al puntero; antes o después según la mitad
  const place = () => {
    edgeScroll(scroller, cx, cy, 'y');
    Object.assign(ghost.style, { left: (cx - dx) + 'px', top: (cy - dy) + 'px' });
    let best = null, bd = 1e9;
    for (const c of cells) { const q = c.getBoundingClientRect(), d = Math.hypot(cx - (q.left + q.width / 2), cy - (q.top + q.height / 2)); if (d < bd) { bd = d; best = c; } }
    if (!best) return;
    const q = best.getBoundingClientRect(), after = cx > q.left + q.width / 2, gr = grid.getBoundingClientRect();
    at = cells.indexOf(best) + (after ? 1 : 0);
    Object.assign(mark.style, { left: ((after ? q.right : q.left) - gr.left - (after ? -7 : 7) - 1.5) + 'px', top: (q.top - gr.top) + 'px', height: q.height + 'px' });
    raf = requestAnimationFrame(place);
  };
  raf = requestAnimationFrame(place);
  const mv = ev => { cx = ev.clientX; cy = ev.clientY; };
  const up = ev => {
    cancelAnimationFrame(raf);
    removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
    ghost.remove(); mark.remove(); cell.classList.remove('plift');
    if (ev.type === 'pointercancel') return;
    const list = (D.shotsBy[sc] || []).slice(), i = list.indexOf(sh);
    let j = at > i ? at - 1 : at;
    if (i < 0 || j === i) return;
    histNote(`Mover el plano ${D.code[sid] || ''}`.trim(), null, 'board');
    list.splice(i, 1); list.splice(j, 0, sh);
    list.forEach((x, k) => { x.ord = k + 1; });
    changed('data'); derive(); render();
    toastUndo(`Plano movido: ahora es el ${D.code[sid]}.`);
  };
  addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
}
/* la viñeta del plano (cámara A) y, si tiene cámara B, la de la B más chica al lado, con su lente */
function sbFrames(sh) {
  const img = (x, cls, alt) => (u => `<img class="${ea(cls)}${ea(u ? '' : ' wait')}" draggable="false" src="${ea(u || BLANK)}" ${u ? '' : `data-thumb="${ea(x.id)}"`} alt="${ea(alt)}">`)(thumbCached(x));
  const B = shotB(sh);
  if (!B) return img(sh, 'fr', `Plano ${D.code[sh.id]}`);
  return `<span class="fr-ab">${img(sh, 'fr', `Plano ${D.code[sh.id]}, cámara A`)}<span class="fr-b">${img(B, 'fr', `Plano ${D.code[sh.id]}, cámara B`)}<span class="fr-bl"><b>B</b> ${esc(String(lensB(sh)))} mm</span></span></span>`;
}
/* la planta general de la escena: si tiene planos con planta (los dibujados a mano no tienen) */
const sbPlantaBtn = (s, shots) => shots.some(sh => shot3D(sh)) ? `<button class="btn sm ghost sb-pg" data-act="sb-planta" data-sc="${ea(s.key)}" title="Las cámaras de todos los planos de la escena en una sola planta"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 7.5l9 4.5 9-4.5z"/><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/></svg>Planta general</button>` : '';
/* «Nuevo plano» desde imágenes: para quien dibuja el storyboard en otro programa. Un plano por imagen, al final de la
   escena y en el orden de los nombres de los archivos; la imagen es la viñeta (la foto del plano, delante de la escena
   3D), entera y sobre blanco si su formato es otro. También se pueden soltar las imágenes sobre «Nuevo plano» */
const SB_IMG_IC = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 12.5V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2H12"/><circle cx="8.5" cy="10" r="1.5"/><path d="m4 17.5 4.5-4.5 3.5 3.5 2.5-2.5 5.5 5"/><path d="M18 9.5V3M15.2 5.8 18 3l2.8 2.8"/></svg>';
const sbImgBtn = s => `<button class="sb-img" data-act="shot-imgs" data-i="${ea(s.idx)}" title="Subir imágenes: un plano por imagen (storyboard hecho en otro programa). También puedes soltarlas aquí" aria-label="Nuevo plano desde imágenes">${SB_IMG_IC}</button>`;
function sbImgFrame(file, W, H) {
  return new Promise((ok, no) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(u);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'), iw = im.naturalWidth, ih = im.naturalHeight;
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
      // casi del mismo formato que el proyecto: llena el cuadro; si no, entera (no se corta nada del dibujo)
      const near = Math.abs(iw / ih - W / H) / (W / H) < .04, k = near ? Math.max(W / iw, H / ih) : Math.min(W / iw, H / ih);
      g.imageSmoothingQuality = 'high'; g.drawImage(im, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
      ok(imgUrl(c));   // WebP de unos 170 kB (imagenes.js)
    };
    im.onerror = () => { URL.revokeObjectURL(u); no(new Error('imagen')); };
    im.src = u;
  });
}
async function sbAddImgs(s, files) {
  if (UI.readOnly || !s) return;
  const list = [...files].filter(f => /^image\//.test(f.type)).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
  if (!list.length) { toast('Elige imágenes (JPG, PNG o WebP).'); return; }
  const [W, H] = frameDims(1280), writes = [];
  let bad = 0;
  for (const f of list) {
    let url;
    try { url = await sbImgFrame(f, W, H); } catch (e) { bad++; continue; }
    const sh = newShot(s, s.p0 + 1 < s.p1 ? s.p0 + 1 : s.p0, s.p1 - 1, { size: '' }, false);
    FRAMES[sh.id] = url; IMGS.delete(sh.id); writes.push([sh.id, url]);
  }
  if (!writes.length) { toast('No se pudo leer esa imagen. Prueba con un JPG o un PNG.'); return; }
  changed('data'); derive(); render();
  const n = writes.length;
  toast(bad ? `${n} de ${n + bad} imágenes quedaron como planos nuevos al final de la escena ${s.key}; las demás no se pudieron leer (prueba con JPG o PNG).`
    : n === 1 ? `Plano nuevo con su imagen al final de la escena ${s.key}. Tócalo para poner el tamaño, el lente o la descripción.`
    : `${n} planos nuevos con sus imágenes al final de la escena ${s.key}. Toca uno para poner el tamaño, el lente o la descripción.`, 6000);
  if (P._sample && !P._saved) await flushSave();
  const res = await Promise.allSettled(writes.map(([k, v]) => Store.saveFrame(P.id, k, v)));
  const fail = writes.filter((w, i) => res[i].status === 'rejected');
  if (fail.length) problem('No se pudieron guardar todas las imágenes.', async () => { const r2 = await Promise.allSettled(fail.map(([k, v]) => Store.saveFrame(P.id, k, v))); if (r2.some(x => x.status === 'rejected')) problem('Siguen sin guardarse algunas imágenes. Revisa la conexión o el espacio.'); });
}
/* ---------- la viñeta de un plano: en blanco o con una imagen subida ----------
   «Dejar en blanco» quita la escena 3D de la viñeta (se guarda: «Volver a la escena 3D» la trae de nuevo). En blanco
   se sube una imagen con el botón del centro, con «⋯ › Subir imagen…» o soltándola encima; también se puede dibujar
   encima en el editor. La imagen subida es la foto del plano (la misma de su editor) */
const sbHasImg = sh => frameHas(sh.id);
function sbImgMenu(sh) {
  if (UI.readOnly || sh.ws === '2d') return '';
  const img = sbHasImg(sh), bl = shotBlank(sh);
  return `<button data-m="img">${img ? 'Cambiar la imagen…' : 'Subir imagen…'}</button>${img ? '<button data-m="noimg">Quitar la imagen</button>' : ''}`
    + (bl ? '<button data-m="unblank">Volver a la escena 3D</button>' : img ? '' : '<button data-m="blank">Dejar en blanco</button>');
}
const sbBlankBtn = sh => UI.readOnly || sh.ws === '2d' || !shotBlank(sh) || sbHasImg(sh) ? ''
  : `<span class="sb-blank"><button type="button" data-act="sb-img1" data-id="${ea(sh.id)}" title="Subir una imagen para este plano (también puedes soltarla aquí)">${SB_IMG_IC}<span>Subir imagen</span></button></span>`;
function sbBlank(sh, on) {
  if (UI.readOnly || !sh) return;
  histNote(`${on ? 'Dejar en blanco' : 'Volver a la escena 3D en'} el plano ${D.code[sh.id] || ''}`.trim(), null, 'board');
  // lo que dice el storyboard para las automáticas no se anota en cada plano
  const def = !!(P.meta.sbBlank && !sh.s3);
  if (on === def) delete sh.blank; else sh.blank = on;
  changed('data'); render();
  toastUndo(on ? `Plano ${D.code[sh.id]} en blanco: sube una imagen o dibuja encima.` : `El plano ${D.code[sh.id]} vuelve a mostrar su escena 3D.`);
}
function sbPickImg(sh) {
  if (UI.readOnly || !sh) return;
  const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*';
  fi.onchange = () => { if (fi.files[0]) sbSetImg(sh, fi.files[0]); };
  fi.click();
}
async function sbSetImg(sh, file) {
  if (UI.readOnly || !sh) return;
  if (!file || !/^image\//.test(file.type)) { toast('Elige una imagen (JPG, PNG o WebP).'); return; }
  const [W, H] = frameDims(1280);
  let url;
  try { url = await sbImgFrame(file, W, H); } catch (e) { toast('No se pudo leer esa imagen. Prueba con un JPG o un PNG.'); return; }
  FRAMES[sh.id] = url; IMGS.delete(sh.id); delete sh.refBack;
  d2Unimp(sh, 'ref');   // si el dibujo 2D había traído la de antes, desde ahora se ve esta
  changed('data'); render();
  toast(`Imagen puesta en el plano ${D.code[sh.id]}. Para quitarla: «⋯» › Quitar la imagen.`, 4500);
  if (P._sample && !P._saved) await flushSave();
  try { await Store.saveFrame(P.id, sh.id, url); }
  catch (e) { problem('No se pudo guardar la imagen del plano.', () => Store.saveFrame(P.id, sh.id, url).catch(() => problem('Sigue sin guardarse la imagen del plano.'))); }
}
async function sbClearImg(sh) {
  if (UI.readOnly || !sh) return;
  if (!FRAMES[sh.id] && frameHas(sh.id)) await framesNeed([sh.id]).catch(() => { });
  const u = FRAMES[sh.id];
  histNote(`Quitar la imagen del plano ${D.code[sh.id] || ''}`.trim(), u ? { [sh.id]: u } : null, 'board');
  delete FRAMES[sh.id]; IMGS.delete(sh.id); delete sh.refBack;
  if (FRIDX) delete FRIDX[sh.id];
  d2Unimp(sh, 'ref');
  changed('data'); render();
  toastUndo(`Imagen quitada del plano ${D.code[sh.id]}.`);
  try { await Store.saveFrame(P.id, sh.id, null); } catch (e) { problem('No se pudo quitar la imagen del plano.'); }
}
function sbImgShots(s) {
  if (UI.readOnly || !s) return;
  const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.multiple = true;
  fi.onchange = () => sbAddImgs(s, fi.files);
  fi.click();
}
function boardPanelsHTML(scenes) {
  // (lote AH) los planos quitados en una hoja de llamado llevan su etiqueta (tab-call.js)
  const cuts = typeof callShotCuts === 'function' ? callShotCuts() : {}, cut = sh => cuts[sh.id] ? `<span class="pcut" title="El plano sigue en el storyboard: se quitó en esa hoja de llamado">${esc(callCutLabel(cuts[sh.id]))}</span>` : '';
  return scenes.map(s => {
    const shots = D.shotsBy[s.key] || [];
    if (!shots.length) return `<section class="sb-scene"><header data-note="scene:${esc(s.key)}"><h2><span class="sb-no tnum">${esc(s.key)}</span><span class="sch">${esc(s.heading)}</span>${(d => d ? `<span class="scd">${esc(d)}</span>` : '')(synopsisOf(s))}</h2><span class="count">${fmtEighths(D.metrics.eighths[s.idx])} págs. · sin planos</span></header>
      ${hdEmpty({ icon: 'camera', title: 'Sin planos todavía', text: UI.readOnly ? '' : 'Sugiere los planos a partir del guion o agrega el primero.', btn: UI.readOnly ? '' : `<span class="sb-nb">${hdBtn('pri', 'Sugerir planos', { attrs: `data-act="suggest" data-i="${ea(s.idx)}"` })}${hdBtn('sec', 'Nuevo plano', { icon: 'plus', attrs: `data-act="shot-scene" data-i="${ea(s.idx)}"` })}${hdBtn('sec', 'Desde imágenes', { icon: 'photo', attrs: `data-act="shot-imgs" data-i="${ea(s.idx)}" title="Un plano por imagen (storyboard hecho en otro programa)"` })}</span>` })}</section>`;
    return `<section class="sb-scene"><header data-note="scene:${esc(s.key)}"><h2><span class="sb-no tnum">${esc(s.key)}</span><span class="sch">${esc(s.heading)}</span>${(d => d ? `<span class="scd">${esc(d)}</span>` : '')(synopsisOf(s))}</h2><span class="sb-hr"><span class="count">${fmtEighths(D.metrics.eighths[s.idx])} págs. · ${shots.length} ${shots.length === 1 ? 'plano' : 'planos'}</span>${sbPlantaBtn(s, shots)}</span></header>
      <div class="sb-grid" data-sc="${esc(s.key)}">${shots.map(sh => `<div class="pcell${ea(sbSel().has(sh.id) ? ' sel' : '')}${cuts[sh.id] ? ' cut' : ''}" data-sid="${ea(sh.id)}" data-note="shot:${ea(sh.id)}"><button class="panel${ea(sh.done ? ' done' : '')}${ea(shotB(sh) ? ' has-b' : '')}" data-act="shot" data-id="${ea(sh.id)}">
        ${sbFrames(sh)}
        <span class="pb"><span class="ptop"><span class="pcode">${esc(D.code[sh.id])}</span><span class="badge" title="${esc(SIZE_NAME[sh.size] || '')}">${esc(sh.size || '—')}</span>${sh.angle && sh.angle !== 'Normal' ? `<span class="badge">${esc(sh.angle)}</span>` : ''}${sh.move && sh.move !== 'Fijo' ? `<span class="badge">${esc(sh.move)}</span>` : ''}${isMaster(sh) ? '<span class="badge mst" title="Máster de la escena: los demás planos toman de aquí la ubicación de los personajes y el escenario">Máster</span>' : ''}${sbStgMark(sh)}${d2On(sh) ? `<span class="badge s2b" title="${ea(shot3D(sh) ? 'Con dibujo 2D sobre la escena 3D' : 'Dibujado a mano en el espacio 2D')}">2D</span>` : ''}<span class="count">${!shot3D(sh) ? '' : esc(String(Math.round(s3Of(sh).keys[0].cam.lens))) + 'mm' + (lensEqText(s3Of(sh)) ? ' ' + esc(lensEqText(s3Of(sh))) : '') + ' · '}${shotDur(sh)}s${isAnimated(sh) ? (d2On(sh) && sh.d2.frames.length > 1 ? ` · ${sh.d2.frames.length} cuadros` : ' · animado') : ''}</span></span>
        ${cut(sh)}${sh.desc ? `<span class="pd">${esc(sh.desc)}</span>` : ''}<span class="px">${esc(shotTextExcerpt(sh, 140))}</span></span></button>${sbBlankBtn(sh)}${UI.readOnly ? '' : `<button class="sbmore" data-act="sb-more" data-id="${ea(sh.id)}" aria-haspopup="menu" aria-label="Acciones del plano ${esc(D.code[sh.id])}" title="Duplicar, mover o eliminar · arrastra la viñeta para cambiarla de lugar">${ICO.more}</button>`}</div>`).join('')}
        ${UI.readOnly ? '' : `<div class="sb-addc" data-i="${ea(s.idx)}"><button class="panel add" data-act="shot-scene" data-i="${ea(s.idx)}"><span class="hd-pl">${ICO.plus}</span>Nuevo plano</button>${sbImgBtn(s)}</div>`}</div></section>`;
  }).join('');
}
/* (lote AK) guion técnico con los grupos de color (los planos que se graban de una vez, como en las viñetas). «Un plano» deja de
   cada grupo solo su plano más bajo, con «+N» (un clic lo abre), para contar menos planos. UI.sbCol: '1' = un plano */
const sbColOn = () => (UI.sbCol === undefined ? (UI.sbCol = ls.get('sbCol', '')) : UI.sbCol) === '1';
const sbOpenSet = () => UI.sbOpen || (UI.sbOpen = new Set());
const sbColHidden = (sh, G) => { const g = G.get(sh.id); return !!g && sbColOn() && g.lead !== sh && !sbOpenSet().has(g.lead.id); };
function sbGrpChip(sh, G) {
  const g = G.get(sh.id); if (!g) return '';
  const lead = g.lead === sh, n = g.members.length - 1, t = 'Se graba de una vez con ' + g.members.filter(x => x !== sh).map(x => D.code[x.id]).join(', ');
  if (lead && sbColOn()) { const o = sbOpenSet().has(sh.id); return ` <button type="button" class="v2-gt" style="--gc:${g.color};border:0;cursor:pointer" data-act="sb-grp" data-id="${ea(sh.id)}" title="${ea(t + (o ? ' · Un clic los esconde' : ' · Un clic los muestra'))}">+${n} ${o ? '▾' : '▸'}</button>`; }
  return ` <span class="v2-gt" style="--gc:${g.color}" title="${ea(t)}">${lead ? '+' + n : 'con ' + esc(D.code[g.lead.id])}</span>`;
}
function shotTableHTML(scenes) {
  const G = shotGroups();
  const opt = (list, v) => list.map(x => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const cuts = typeof callShotCuts === 'function' ? callShotCuts() : {};   // (lote AH) quitados en una hoja de llamado
  return `<div class="tbl-wrap" style="max-width:1400px;margin:0 auto"><table class="tbl"><thead><tr><th>Plano</th><th>Tamaño</th><th>Ángulo</th><th>Movimiento</th><th>Lente</th><th>Soporte</th><th>Sonido</th><th>Dur. (s)</th><th style="min-width:240px">Descripción</th><th></th></tr></thead><tbody>
    ${scenes.map(s => {
    const all = D.shotsBy[s.key] || [], shots = all.filter(sh => !sbColHidden(sh, G));
    return `<tr class="grp"><td colspan="10">Esc. ${esc(s.key)} · <span class="sch">${esc(s.heading)}</span> <span class="count">· ${fmtEighths(D.metrics.eighths[s.idx])} págs.</span> <button class="btn sm" style="float:right" data-act="shot-scene" data-i="${ea(s.idx)}">+ Plano</button></td></tr>` +
      shots.map(sh => { const i = all.indexOf(sh), g = G.get(sh.id); return `<tr data-id="${ea(sh.id)}"><td style="white-space:nowrap${g ? ';box-shadow:inset 4px 0 0 ' + g.color : ''}"><b>${esc(D.code[sh.id])}</b>${sh.done ? ' <span class="badge ok">Rodado</span>' : ''}${cuts[sh.id] ? ` <span class="badge cut" title="El plano sigue en el storyboard: se quitó en esa hoja de llamado">${esc(callCutLabel(cuts[sh.id]))}</span>` : ''}${sbGrpChip(sh, G)}</td>
        <td><select class="w-sm" data-bind="sh" data-f="size" data-id="${ea(sh.id)}">${SIZES.map(([k, n]) => `<option value="${k}" ${k === sh.size ? 'selected' : ''} title="${n}">${k}</option>`).join('')}</select></td>
        <td><select class="w-md" data-bind="sh" data-f="angle" data-id="${ea(sh.id)}">${opt(ANGLES, sh.angle)}</select></td>
        <td><select class="w-md" data-bind="sh" data-f="move" data-id="${ea(sh.id)}">${opt(MOVES, sh.move)}${MOVES.includes(sh.move) ? '' : `<option selected>${esc(sh.move)}</option>`}</select></td>
        <td><input class="w-sm" type="text" inputmode="numeric" value="${esc(sh.lens)}" data-bind="sh" data-f="lens" data-id="${ea(sh.id)}" placeholder="mm"${lensB(sh) ? ' aria-label="Lente de la cámara A"' : ''}>${lensB(sh) ? `<small class="lens-b" title="Cámara B">B ${esc(String(lensB(sh)))} mm</small>` : ''}</td>
        <td><select class="w-md" data-bind="sh" data-f="support" data-id="${ea(sh.id)}"><option value=""></option>${opt(SUPPORTS, sh.support)}</select></td>
        <td><select class="w-sm" data-bind="sh" data-f="snd" data-id="${ea(sh.id)}" title="Sonido: directo, ambiente o MOS">${SND_OPTS.map(([k, t]) => `<option value="${k}" ${(sh.snd || '') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
        <td><input class="w-sm" type="number" min="0" value="${esc(sh.dur)}" data-bind="sh" data-f="dur" data-id="${ea(sh.id)}"></td>
        <td><input type="text" value="${esc(sh.desc)}" data-bind="sh" data-f="desc" data-id="${ea(sh.id)}" placeholder="${esc(shotTextExcerpt(sh, 60))}"></td>
        <td style="white-space:nowrap"><button class="btn ghost sm" data-act="sh-move" data-id="${ea(sh.id)}" data-d="-1" ${i ? '' : 'disabled'} aria-label="Subir">↑</button><button class="btn ghost sm" data-act="sh-move" data-id="${ea(sh.id)}" data-d="1" ${i < all.length - 1 ? '' : 'disabled'} aria-label="Bajar">↓</button><button class="btn ghost sm" data-act="shot" data-id="${ea(sh.id)}">Abrir</button></td></tr>`; }).join('');
  }).join('')}</tbody></table></div>`;
}
/* el menú del título: todas las escenas o una */
function sbSceneMenu(b) {
  const total = Object.keys(P.shots).length;
  popover(b, `<div class="menu">${[['', `Todas las escenas (${total} ${total === 1 ? 'plano' : 'planos'})`], ...D.sc.scenes.map(s => [s.key, `Esc. ${s.key} · ${s.loc}`])].map(([k, t]) => `<button data-k="${ea(k)}"${(UI.sbScene || '') === k ? ' aria-current="true"' : ''}>${esc(t)}</button>`).join('')}</div>`,
    p => p.addEventListener('click', e => { const x = e.target.closest('[data-k]'); if (!x) return; closePop(); UI.sbScene = x.dataset.k; render(); }));
}
Object.assign(ACT, {
  'sb-scene-menu': b => sbSceneMenu(b),
  'sb-grp': b => { const S = sbOpenSet(), id = b.dataset.id; if (S.has(id)) S.delete(id); else S.add(id); render(); },
  'sb-view': b => { UI.sbView = b.dataset.v; render(); },
  'sb-ws': b => { ls.set('boardWs', b.dataset.v); },
  // las viñetas automáticas (las que nadie armó en 3D): la escena 3D sola o en blanco
  'sb-blank': b => {
    if (UI.readOnly) return;
    const on = b.dataset.v === 'blank';
    if (!!P.meta.sbBlank === on) return;
    histNote(on ? 'Viñetas automáticas en blanco' : 'Viñetas automáticas con la escena 3D', null, 'board');
    if (on) P.meta.sbBlank = true; else delete P.meta.sbBlank;
    changed('data'); render();
    $$('[data-act="sb-blank"]').forEach(x => x.setAttribute('aria-pressed', String((x.dataset.v === 'blank') === on)));
    toastUndo(on ? 'Las viñetas automáticas quedan en blanco: sube una imagen o dibuja encima. Las que armaste en 3D siguen igual.' : 'Las viñetas automáticas vuelven a mostrar la escena 3D.');
  },
  'sb-img1': b => { const sh = P.shots[b.dataset.id]; if (sh) sbPickImg(sh); },
  'sb-hair': b => {
    if (UI.readOnly) return;
    const v = b.dataset.v === 'real' ? 'real' : '';
    if ((P.meta.hair || '') === v) return;
    if (v) P.meta.hair = v; else delete P.meta.hair;
    changed('data'); render();
  },
  'sh-move': b => moveShot(b.dataset.id, +b.dataset.d),
  'sb-planta': b => plantaGeneral(b.dataset.sc),
  'shot-imgs': b => sbImgShots(D.sc.scenes[+b.dataset.i]),
  // menú ⋯ de una viñeta (también con clic derecho sobre ella)
  'sb-more': b => sbMoreMenu(b, P.shots[b.dataset.id]),
  'sb-sel-clear': () => sbSelClear(),
  'sb-sel-del': () => deleteShots(sbSelList().map(x => x.id)),
  'sb-sel-join': () => sbJoinSelected(),
  'sb-sel-unjoin': () => sbUnjoinSelected(),
  'sb-sel-copy': () => { const src = P.shots[sbSelLast()], to = sbSelList().filter(x => src && x.id !== src.id); if (src && to.length) sbCloneDialog(src, to); },
});
/* (lote AJ) planos que se graban de una vez, con un solo tiro de cámara: sh.tog apunta a otro plano de la misma escena.
   Los planos unidos forman un grupo; su número de claqueta es el del más bajo (el primero en el guion) y cada grupo
   tiene su color en el storyboard. Los vínculos se leen sin dirección: da igual cuál apunte a cuál. */
const SHOT_GRP_COLORS = ['#2F80ED', '#E5484D', '#2F9E64', '#9B59D0', '#E8730C', '#0EA5A5'];
function shotGroups() {
  const all = shotOrder(), par = {};
  const find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  for (const s of all) par[s.id] = s.id;
  for (const s of all) if (s.tog && par[s.tog] && s.tog !== s.id) par[find(s.id)] = find(s.tog);
  const by = {}; for (const s of all) (by[find(s.id)] = by[find(s.id)] || []).push(s);
  const out = new Map(); let n = 0;
  for (const s of all) {
    const m = by[find(s.id)];
    if (m.length < 2 || out.has(s.id)) continue;
    const g = { lead: m[0], members: m, color: SHOT_GRP_COLORS[n++ % SHOT_GRP_COLORS.length] };
    for (const x of m) out.set(x.id, g);
  }
  return out;
}
/* une «sh» al grupo de «targetId» (o la saca del grupo con ''); quien dependía de «sh» pasa a depender de otro del grupo */
function setTogether(sh, targetId) {
  const others = Object.values(P.shots).filter(o => o.tog === sh.id && o.id !== sh.id);
  if (!targetId) {
    delete sh.tog;
    if (others.length) { const r = others[0]; delete r.tog; for (const o of others.slice(1)) o.tog = r.id; }
  } else if (targetId !== sh.id && P.shots[targetId]) sh.tog = targetId;
}
/* los elegidos, por escena: solo cuentan las escenas con dos o más (los que se pueden grabar juntos) */
function sbJoinGroups() {
  const by = {};
  for (const x of sbSelList()) (by[x.sc] = by[x.sc] || []).push(x);
  return Object.values(by).filter(a => a.length > 1);
}
function sbJoinSelected() {
  const gs = sbJoinGroups(); if (!gs.length) return;
  histNote(`Grabar juntos ${gs.map(a => sbCodes(a)).join(' · ')}`);
  for (const a of gs) for (const x of a.slice(1)) setTogether(x, a[0].id);   // el más bajo es el de la claqueta
  sbSelClear(); changed('data'); derive(); render();
  toastUndo(`Se graban juntos: ${gs.map(a => sbCodes(a)).join(' · ')}. Claqueta ${gs.map(a => D.code[a[0].id]).join(' · ')}.`);
}
function sbUnjoinSelected() {
  const G = shotGroups(), list = sbSelList().filter(x => G.has(x.id)); if (!list.length) return;
  histNote(`Dejar de grabar juntos ${sbCodes(list)}`);
  for (const x of list) setTogether(x, '');
  sbSelClear(); changed('data'); derive(); render();
}
function sbTogMenu(anchor, sh) {
  const list = (D.shotsBy[sh.sc] || []).filter(x => x.id !== sh.id), G = shotGroups(), mine = G.get(sh.id);
  popover(anchor, `<div class="menu"><h5>Se graba junto con…</h5>${list.map(x => `<button data-t="${ea(x.id)}"${mine && G.get(x.id) === mine ? ' aria-current="true"' : ''}><b>${esc(D.code[x.id] || '')}</b> <span>${esc(String(x.desc || x.size || '').slice(0, 40))}</span>${mine && G.get(x.id) === mine ? ' ✓' : ''}</button>`).join('')}${mine ? '<hr><button data-t="">Dejar de grabarlo junto con otros</button>' : ''}${list.length ? '' : '<p class="hint">No hay otros planos en esta escena.</p>'}</div>`, p => p.addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (!b) return; closePop();
    histNote(`Grabar el plano ${D.code[sh.id] || ''} junto con otro`.trim());
    setTogether(sh, b.dataset.t); changed('data'); derive(); render();
  }));
}
function sbMoreMenu(anchor, sh) {
  if (!sh || UI.readOnly) return;
  const list = D.shotsBy[sh.sc] || [], i = list.indexOf(sh), picked = sbSel().has(sh.id);
  // con otras viñetas elegidas, lo primero es darles los atributos de esta
  const to = sbSelList().filter(x => x.id !== sh.id);
  const clone = to.length ? `<button data-m="clone" class="sb-cl-m" title="Elige qué pasa del ${ea(D.code[sh.id] || '')} a ${ea(sbCodes(to))}: tamaño, ángulo, lente, la cámara 3D…">${esc(to.length <= 3 ? `Clonar sus atributos en ${sbCodes(to)}…` : `Clonar sus atributos en los ${to.length} elegidos…`)}</button><hr>` : '';
  const pick = `<button data-m="pick" title="${ea(`También con ${MOD_KEY === 'Meta' ? '⌘' : 'Ctrl'}+clic en la viñeta. Luego, en el plano que quieres copiar: «Clonar sus atributos…»`)}">${picked ? 'Quitar de los elegidos' : 'Elegir para clonar'}</button>`;
  // lo esencial arriba; lo que se usa poco, plegado en «Más opciones»; Eliminar, al final
  const many = picked && sbSelList().length > 1;
  const join = sbJoinGroups().length && picked ? `<button data-m="join" title="Comparten color y la claqueta del plano más bajo">Grabar juntos los elegidos de la escena</button>` : '';
  popover(anchor, `<div class="menu sb-menu">${clone}${join}<button data-m="open">Abrir</button><button data-m="done">${sh.done ? 'Quitar «Rodado»' : 'Marcar como rodado'}</button><button data-m="tog" title="Varios planos con un solo tiro de cámara: comparten color y la claqueta del más bajo">Se graba junto con…</button><button data-m="dup">Duplicar</button><button data-m="more" aria-expanded="false" class="sb-more">Más opciones</button><div class="sb-more-b" hidden>${i > 0 ? '<button data-m="prev">Mover antes</button>' : ''}${i < list.length - 1 ? '<button data-m="next">Mover después</button>' : ''}${pick}<button data-m="master" title="Los demás planos de la escena toman de este la ubicación de los personajes y el escenario">${isMaster(sh) ? 'Dejar de usar como máster' : 'Usar como máster'}</button>${stageStale(sh) ? '<button data-m="stgupd" title="Trae del máster el decorado, los objetos, las luces del set, la hora y la lluvia; la cámara y las figuras no cambian">Actualizar escenario</button><button data-m="stgkeep">Mantener su escenario</button>' : ''}${sbImgMenu(sh)}</div><hr><button data-m="del" style="color:var(--bad)">${many ? `Eliminar los ${sbSelList().length} elegidos` : 'Eliminar'}</button></div>`, p => p.addEventListener('click', e => {
    const x = e.target.closest('[data-m]'); if (!x) return;
    if (x.dataset.m === 'more') {   // despliega o pliega lo menos usado sin cerrar el menú
      const b = $('.sb-more-b', p); b.hidden = !b.hidden; x.setAttribute('aria-expanded', String(!b.hidden)); x.textContent = b.hidden ? 'Más opciones' : 'Menos opciones';
      if (typeof popPlace === 'function') popPlace(p, anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor);
      return;
    }
    closePop();
    const m = x.dataset.m;
    if (m === 'tog') setTimeout(() => sbTogMenu(anchor, sh), 0);
    if (m === 'clone') sbCloneDialog(sh, to);
    if (m === 'pick') sbSelToggle(sh.id);
    if (m === 'open') openShotEditor(sh.id);
    if (m === 'prev' || m === 'next') { histNote(`Mover el plano ${D.code[sh.id] || ''}`.trim()); moveShot(sh.id, m === 'prev' ? -1 : 1); toastUndo(`Plano movido: ahora es el ${D.code[sh.id]}.`); }
    if (m === 'done') { histNote(sh.done ? 'Quitar «Rodado»' : 'Marcar como rodado'); setShotDone(sh, !sh.done); changed('data'); render(); }
    if (m === 'del') { if (many) deleteShots(sbSelList().map(y => y.id)); else deleteShot(sh.id); }
    if (m === 'join') sbJoinSelected();
    if (m === 'dup') duplicateShot(sh.id);
    if (m === 'img') sbPickImg(sh);
    if (m === 'noimg') sbClearImg(sh);
    if (m === 'blank' || m === 'unblank') sbBlank(sh, m === 'blank');
    if (m === 'master') sbMaster(sh);
    if (m === 'stgupd') stageUpdate([sh]);
    if (m === 'stgkeep') stageKeep(sh);
  }));
}

/* ---------- lote W · el máster cambió de escenario (obs. 9) ----------
   Un plano ajustado a mano (con escena 3D propia) se queda con su escenario cuando el máster cambia el suyo: su viñeta
   lleva una marca chica y su editor, un aviso. «Actualizar escenario» trae del máster el decorado, sus muebles y objetos,
   las luces del set, la hora y la lluvia (s3TakeSet): la cámara y las figuras del plano no cambian. Al guardar el máster
   con otro escenario, un aviso ofrece «Actualizar los N planos». Todo se deshace */
const sbStgMark = sh => stageStale(sh) ? `<span class="badge stg" title="El máster cambió de escenario: este plano sigue con el de antes. ⋯ › Actualizar escenario" aria-label="El máster cambió de escenario"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.2v4.6h-4.6"/></svg></span>` : '';
function stageUpdate(list, quiet) {
  list = list.filter(sh => sh && sh.s3 && stageStale(sh)); if (!list.length) return 0;
  const ms = shotMaster(list[0].sc); if (!ms) return 0;
  histNote(list.length === 1 ? `Actualizar el escenario del plano ${D.code[list[0].id] || ''}` : `Actualizar el escenario de ${list.length} planos`, null, 'board');
  const src = s3Of(ms);
  for (const sh of list) { sh.s3 = s3TakeSet(sh.s3, src); stageSeen(sh, ms); }
  changed('data'); derive(); render();
  if (!quiet) toastUndo(list.length === 1 ? `El plano ${D.code[list[0].id] || ''} tiene el escenario del máster; su cámara y sus figuras siguen igual.` : `${list.length} planos tienen el escenario del máster; sus cámaras y sus figuras siguen igual.`);
  return list.length;
}
function stageKeep(sh) {
  const ms = shotMaster(sh.sc); if (!ms) return;
  histNote(`Mantener el escenario del plano ${D.code[sh.id] || ''}`, null, 'board');
  stageSeen(sh, ms); changed('data'); render();
  toastUndo(`El plano ${D.code[sh.id] || ''} se queda con su escenario. Si el máster vuelve a cambiar, se avisa otra vez.`);
}
/* después de guardar el máster con otro escenario: una sola vez, para no ir plano por plano */
function stageOffer(m, list) {
  const codes = typeof sbCodes === 'function' ? sbCodes(list) : list.map(x => D.code[x.id]).join(', ');
  setTimeout(() => toast(list.length === 1 ? `El máster cambió de escenario. El plano ${codes} sigue con el de antes.` : `El máster cambió de escenario. ${list.length} planos ajustados a mano siguen con el de antes (${codes}).`, 9000,
    { label: list.length === 1 ? 'Actualizar el plano' : `Actualizar los ${list.length} planos`, fn: () => stageUpdate(list.map(x => P.shots[x.id]).filter(Boolean)) }), 60);
}

/* ---------- elegir viñetas y clonar en ellas los atributos de otro plano (lote V) ----------
   Ctrl+clic (⌘ en Mac) o «⋯ › Elegir para clonar» elige una o varias viñetas, de cualquier escena; una barra abajo
   dice cuántas. Luego, clic derecho (o «⋯») en el plano que se quiere copiar › «Clonar sus atributos…»: una ventana
   con casillas elige qué pasa (shotCloneFrom, en s3d-model.js). Se deshace con un paso. Esc o un clic en un espacio
   vacío sueltan la selección */
const SBSEL = { pid: null, ids: new Set() };
function sbSel() {
  if (SBSEL.pid !== (P && P.id)) { SBSEL.pid = P && P.id; SBSEL.ids = new Set(); }
  if (P) for (const id of [...SBSEL.ids]) if (!P.shots[id]) SBSEL.ids.delete(id);   // planos que ya no están
  return SBSEL.ids;
}
/* los elegidos en el orden del storyboard (escena y plano) */
const sbSelList = () => { const S = sbSel(); return S.size ? D.sc.scenes.flatMap(s => (D.shotsBy[s.key] || []).filter(sh => S.has(sh.id))) : []; };
/* «1.4», «1.4 y 1.5», «1.4, 1.5 y 2.1»; con muchos, «1.4, 1.5, 2.1 y 3 más» */
function sbCodes(list) {
  const c = list.map(sh => D.code[sh.id] || '?');
  if (c.length > 4) return `${c.slice(0, 3).join(', ')} y ${c.length - 3} más`;
  return c.length < 2 ? c.join('') : `${c.slice(0, -1).join(', ')} y ${c[c.length - 1]}`;
}
/* el último plano elegido (el orden en que se eligieron): de ese se copian los atributos a los demás */
const sbSelLast = () => { let l = ''; for (const id of sbSel()) l = id; return l; };
/* (lote AJ) «Rodado» de un plano: si se graba de una vez con otros (shotGroups), todos quedan igual */
function setShotDone(sh, val) {
  const g = typeof shotGroups === 'function' ? shotGroups().get(sh.id) : null;
  for (const x of g ? g.members : [sh]) { if (val) x.done = true; else delete x.done; }
}
function sbSelToggle(id) {
  if (UI.readOnly || !P.shots[id]) return;
  const S = sbSel();
  if (S.has(id)) S.delete(id); else S.add(id);
  sbSelPaint();
}
function sbSelClear() { const S = sbSel(); if (!S.size) return; S.clear(); sbSelPaint(); }
function sbSelPaint() {
  const S = sbSel();
  $$('#view .pcell[data-sid]').forEach(c => c.classList.toggle('sel', S.has(c.dataset.sid)));
  const g = $('#view .scroller'); if (g) g.classList.toggle('sb-picking', S.size > 0);
  const bar = $('#sbSelBar'); if (!bar) return;
  const list = sbSelList();
  bar.hidden = !list.length;
  if (!list.length) { bar.innerHTML = ''; return; }
  const how = TOUCHY ? 'Toca «⋯» en el plano que quieres copiar' : 'Clic derecho en el plano que quieres copiar';
  bar.innerHTML = `<span class="sb-sel-n"><b>${esc(list.length === 1 ? '1 plano elegido' : `${list.length} planos elegidos`)}</b> <span class="tnum">${esc(sbCodes(list))}</span></span>${list.length > 1 ? `<button class="btn primary sm" data-act="sb-sel-copy" title="Elige qué pasa: tamaño, ángulo, lente, la cámara 3D…">Copiar atributos de ${esc(D.code[sbSelLast()] || '')} a ${esc(sbCodes(list.filter(x => x.id !== sbSelLast())))}</button><span class="hint">El último que elegiste es el de origen</span>` : `<span class="hint">${esc(how)} › Clonar sus atributos</span>`}${(() => { const gs = sbJoinGroups(), G = shotGroups(); return (gs.length ? `<button class="btn sm" data-act="sb-sel-join" title="Comparten color y la claqueta del plano más bajo">Grabar juntos${gs.length === 1 ? ' ' + esc(sbCodes(gs[0])) : ' (por escena)'}</button>` : '') + (list.some(x => G.has(x.id)) ? '<button class="btn ghost sm" data-act="sb-sel-unjoin" title="Los saca del grupo en que se graban juntos">Separar</button>' : ''); })()}<button class="btn ghost sm sb-sel-del" data-act="sb-sel-del" title="Eliminar los planos elegidos (se pueden recuperar con Deshacer)">${esc(list.length === 1 ? 'Eliminar' : `Eliminar ${list.length}`)}</button><button class="btn ghost sm" data-act="sb-sel-clear" title="Quitar la selección (Esc)">Quitar</button>`;
}
function bindBoardSel() {
  const v = $('#view .scroller'); if (!v) return;
  // Ctrl+clic (⌘ en Mac) o Mayús+clic en una viñeta: la elige o la suelta, sin abrir su editor
  v.addEventListener('click', e => {
    if (!(e.ctrlKey || e.metaKey || e.shiftKey) || e.altKey) return;
    const cell = e.target.closest('.pcell'); if (!cell || e.target.closest('.sbmore, .sb-blank')) return;
    e.preventDefault(); e.stopPropagation();
    sbSelToggle(cell.dataset.sid);
  }, true);
  // Mayús+clic no selecciona el texto de la viñeta
  v.addEventListener('mousedown', e => { if (e.shiftKey && e.target.closest('.pcell')) e.preventDefault(); });
  // clic derecho en una viñeta: su menú (el mismo de «⋯»), con «Clonar sus atributos…» si hay otras elegidas
  v.addEventListener('contextmenu', e => {
    const cell = e.target.closest('.pcell'); const sh = cell && P.shots[cell.dataset.sid]; if (!sh) return;
    e.preventDefault();
    sbMoreMenu({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }, sh);
  });
}
deselectOn('board', sbSelClear, '.pcell, #sbSelBar');
// Supr o Retroceso con planos elegidos: los elimina (con «Deshacer»), salvo al escribir o con una ventana abierta
addEventListener('keydown', e => {
  if ((e.key !== 'Delete' && e.key !== 'Backspace') || e.defaultPrevented || UI.tab !== 'board' || !P || UI.readOnly || !sbSel().size) return;
  if ($('#modal') || $('#pop') || $('#ask') || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') || (document.activeElement || {}).isContentEditable) return;
  e.preventDefault(); deleteShots(sbSelList().map(x => x.id));
}, true);
// Esc suelta la selección solo si no hay un menú o una ventana que cerrar primero (se mira antes de que Esc los cierre)
addEventListener('keydown', e => { if (e.key === 'Escape' && !e.defaultPrevented && UI.tab === 'board' && !$('#modal') && !$('#pop') && !$('#ask') && P && sbSel().size) sbSelClear(); }, true);

/* la ventana: qué pasa del plano de origen a los elegidos. Todo marcado la primera vez; luego, lo de la última vez */
function sbCloneDialog(src, targets) {
  if (UI.readOnly || !src || !targets.length) return;
  const code = D.code[src.id] || '', is3d = shotHas3D(src), lens = shotLens(src);
  const other = targets.filter(t => t.sc !== src.sc), masters = targets.filter(isMaster);
  const snd = (SND_OPTS.find(([k]) => k === (src.snd || '')) || ['', '—'])[1];
  const rows = [
    ['Datos del plano', [
      ['size', 'Tamaño', src.size || '—', SIZE_NAME[src.size]],
      ['angle', 'Ángulo', src.angle || 'Normal'],
      ['move', 'Movimiento', src.move || 'Fijo'],
      ['support', 'Soporte', src.support || '—'],
      lens > 0 ? ['lens', 'Lente', `${lens} mm`] : null,
      ['snd', 'Sonido', snd],
      ['dur', 'Duración', `${String(shotDur(src)).replace('.', ',')} s`],
    ]],
    is3d ? ['Espacio 3D', [
      ['cam', 'Cámara 3D', 'Posición, altura, giro y recorrido'],
      ['stage', 'Puesta en escena 3D', other.length ? `Decorado, figuras, objetos y luces de la escena ${src.sc}` : 'Decorado, figuras, objetos y luces'],
    ]] : null,
  ].filter(Boolean);
  const last = ls.get('sbClone', null) || {};
  const on = f => last[f] !== false;
  const m = modal({
    title: `Clonar los atributos del plano ${code}`,
    body: `<p class="sb-cl-to"><span>Planos que cambian:</span> <b class="tnum">${esc(sbCodes(targets))}</b>${other.length ? ` <span class="hint">· <span>${other.length === targets.length ? (targets.length === 1 ? 'de otra escena' : 'de otras escenas') : `${other.length} de otra escena`}</span></span>` : ''}</p>
      ${rows.map(([h, list]) => `<fieldset class="sb-cl-g"><legend>${esc(h)}</legend>${list.filter(Boolean).map(([f, n, v, v2]) => `<label class="sb-cl-r"><input type="checkbox" data-f="${ea(f)}" ${on(f) ? 'checked' : ''}><span class="sb-cl-n">${esc(n)}</span><span class="sb-cl-v"><span>${esc(v)}</span>${v2 ? ` · <span>${esc(v2)}</span>` : ''}</span></label>`).join('')}</fieldset>`).join('')}
      ${is3d && masters.length ? `<p class="hint sb-cl-ms">${esc(masters.length === 1 ? `El ${D.code[masters[0].id] || ''} es el máster de su escena: con la puesta en escena, los planos que lo siguen también la toman.` : `${sbCodes(masters)} son másters de su escena: con la puesta en escena, los planos que los siguen también la toman.`)}</p>` : ''}
      <p class="hint" style="margin:0">${is3d ? '' : `El ${esc(code)} está dibujado a mano: su dibujo no se clona (para eso, «⋯ › Duplicar»). `}La descripción, el diálogo, el tramo del guion, las imágenes subidas y los dibujos de cada plano no cambian. Se puede deshacer.</p>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="sbClOk">${esc(targets.length === 1 ? `Clonar en el ${D.code[targets[0].id] || ''}` : `Clonar en ${targets.length} planos`)}</button>`,
  });
  const picks = () => Object.fromEntries($$('input[data-f]', m).map(x => [x.dataset.f, x.checked]));
  const ok = $('#sbClOk', m);
  const sync = () => { ok.disabled = !Object.values(picks()).some(Boolean); };
  m.addEventListener('change', sync); sync();
  ok.onclick = () => {
    const pick = picks();
    if (!Object.values(pick).some(Boolean)) return;
    ls.set('sbClone', { ...last, ...pick });
    closeModal();
    sbCloneApply(src, targets, pick);
  };
}
function sbCloneApply(src, targets, pick) {
  const live = targets.filter(t => P.shots[t.id] && t.id !== src.id);
  if (!live.length || !P.shots[src.id]) return;
  const code = D.code[src.id] || '', codes = sbCodes(live);
  histNote(`Clonar los atributos del plano ${code}`.trim(), null, 'board');
  const show3d = [];
  for (const sh of live) { const r = shotCloneFrom(sh, src, pick); if (r.show3d) show3d.push(sh); }
  sbSel().clear();
  changed('data'); derive(); render();
  // si lo que cambió no se ve en la viñeta (una imagen subida la tapa), se dice
  const covered = (pick.cam || pick.stage) && shotHas3D(src) ? live.filter(sh => frameHas(sh.id) && !sh.refBack) : [];
  let msg = `Atributos del ${code} clonados en ${codes}.`;
  if (show3d.length) msg += ` En ${sbCodes(show3d)} la escena 3D queda debajo del dibujo (capa «Viñeta 3D»).`;
  if (covered.length) msg += ` En ${sbCodes(covered)} la imagen subida tapa la escena 3D.`;
  toastUndo(msg, show3d.length || covered.length ? 9000 : 6500);
}
/* usar el plano como máster de su escena (o dejar de usarlo). Su puesta en escena queda como la de la escena: si no
   tenía una propia, se guarda la que se ve (la que tomaba del máster anterior), así nada cambia de lugar */
function sbMaster(sh) {
  if (UI.readOnly || !sh) return;
  const on = !isMaster(sh), code = D.code[sh.id] || '';
  histNote(on ? `Usar el plano ${code} como máster` : `Dejar de usar el plano ${code} como máster`, null, 'board');
  if (on && !sh.s3) { sh.s3 = JSON.parse(JSON.stringify(s3Of(sh))); s3SyncShot(sh); }
  setMaster(sh, on);
  changed('data'); derive(); render();
  toastUndo(on ? `El plano ${code} es el máster de la escena ${sh.sc}: los planos que no ajustaste a mano toman de aquí la ubicación de los personajes y el escenario.` : `El plano ${code} ya no es el máster de la escena.`);
}
/* copia del plano justo después del original (con sus dibujos); se puede deshacer */
async function duplicateShot(id) {
  const sh = P.shots[id]; if (!sh) return;
  histNote(`Duplicar el plano ${D.code[id] || ''}`.trim(), null, 'board');
  const next = (D.shotsBy[sh.sc] || [])[(D.shotsBy[sh.sc] || []).indexOf(sh) + 1];
  const copy = { ...JSON.parse(JSON.stringify(sh)), id: uid('s'), ord: next ? (sh.ord + next.ord) / 2 : sh.ord + 1, done: false };
  delete copy.done;
  if (isMaster(sh) || copy.master) copy.master = false;   // un máster por escena: la copia no lo es
  P.shots[copy.id] = copy;
  changed('data'); derive(); render();
  toastUndo(`Plano ${D.code[id]} duplicado: la copia es el ${D.code[copy.id]}.`);
  await copyShotFrames(id, copy.id);
  if (UI.tab === 'board') lateRender();
}
Object.assign(BIND, {
  'sb-sensor': (el, ev) => {
    if (ev !== 'change' || UI.readOnly) return;
    const v = el.value && el.value !== 'ff' && SENSORS.some(x => x[0] === el.value) ? el.value : '';
    if ((P.meta.sensor || '') === v) return;
    if (v) P.meta.sensor = v; else delete P.meta.sensor;
    changed('data'); render();
    toast(`Cámara del proyecto: ${sensorOf({ sensor: v })[1]}. Vale para los planos nuevos y los automáticos.`, 4200);
  },
  'sb-scene': el => { UI.sbScene = el.value; render(); },
  aspect: el => { P.meta.aspect = el.value; THUMB3.clear(); changed('data'); render(); },
  sh: (el, ev) => {
    const sh = P.shots[el.dataset.id];
    if (!sh) return;
    if (el.dataset.f === 'lens' && sh.s3 && ev === 'change') { const r = num(el.value) / (sh.s3.keys[0].cam.lens || 1); if (r > 0) sh.s3.keys.forEach(k => { k.cam.lens = Math.round(k.cam.lens * r * 10) / 10; }); }
    if (el.tagName === 'INPUT' && ev === 'input') { sh[el.dataset.f] = el.value; changed('data'); return; }
    if (ev !== 'change') return;
    sh[el.dataset.f] = el.value;
    changed('data');
  },
});
function moveShot(id, d) {
  const sh = P.shots[id];
  const list = D.shotsBy[sh.sc];
  const i = list.indexOf(sh), j = i + d;
  if (j < 0 || j >= list.length) return;
  const o = list[j].ord; list[j].ord = sh.ord; sh.ord = o;
  changed('data'); derive(); render();
}


/* ---------- ayuda y exportar ---------- */
HELP.board = [
  ['Planos', 'Toca una viñeta para abrir el editor del plano: cámara, figuras, luces y dibujo. «+ Nuevo plano» agrega uno al final de la escena.'],
  ['3D o 2D', 'Arriba del editor, «3D | 2D» elige el espacio de trabajo del plano. En 2D se dibuja a mano con lápiz, tinta, pincel, marcador y borrador, por capas; hay lazo para mover o escalar zonas, flechas anchas que se curvan, texto, guías de perspectiva y papel cebolla para animar gestos cuadro a cuadro. Lo hecho en 2D se ve también sobre la escena 3D y en la viñeta: la escena es una capa más, la «Viñeta 3D».'],
  ['Fotos de fondo y para calcar', 'En 2D, «Capas › Imagen…» (o arrastrar o pegar una imagen) la pone en una capa propia al 50 %, detrás de las figuras: la escena 3D se ve encima, sin su entorno. Desmarca «Detrás de las figuras» para ponerla delante, bájale la opacidad y dibuja encima.'],
  ['Máster', 'El máster de cada escena (el que sugiere FilmSpirit o el que eliges con «⋯ › Usar como máster») decide dónde está cada personaje, el escenario y la hora. Los demás planos de la escena lo siguen y solo cambian su cámara, del mismo lado de la línea de acción; en un diálogo, por encima del hombro del otro. Si ajustas uno a mano, ese queda con lo suyo.'],
  ['Sugerir planos', 'En una escena sin planos, «Sugerir planos» propone una cobertura básica a partir del guion.'],
  ['Clonar atributos', 'Ctrl+clic (⌘ en Mac) en una o varias viñetas, de cualquier escena, para elegirlas. Luego, clic derecho (o «⋯») en el plano que quieres copiar › «Clonar sus atributos…» y marca qué pasa: tamaño, ángulo, movimiento, soporte, lente, sonido, duración, la cámara 3D o la puesta en escena 3D. La descripción y el diálogo de cada plano no cambian. Se puede deshacer.'],
  ['Doblar el cuerpo', 'En la viñeta 3D, toca una figura para elegirla y tócala otra vez sobre una parte del cuerpo: se tiñe de rojo tenue y aparece su aro. Arrástrala para doblarla: el codo y la rodilla siguen el aro; la cabeza gira o se inclina; el torso se dobla hacia adelante o a un lado. La mano y el pie llevan el brazo o la pierna entera. ↺ vuelve esa parte a la postura base; Esc o ✕ la suelta. También con las barras de «Brazos, piernas y cabeza».'],
  ['Personajes', 'El cuerpo, la estatura, las tallas y las fotos de cada personaje se definen una vez en «Personajes» y valen para todos los planos.'],
  ['Formato de cuadro', 'Se cambia en la pestaña Proyecto.'],
  ['Extras', 'En el editor del plano, «+ Figura» › «Extras (sin rostro)…»: elige cuántos y la situación (concierto, protesta, público, maratón, feria, fila, fiesta…). Hasta 6 entran como figuras sueltas, cada una editable; más, como un grupo que se mueve y gira entero, con menos detalle mientras más sean (figuras simples hasta 40, luego siluetas). Con el grupo elegido cambias la cantidad, la situación, qué tan juntos están, la ropa o «Mezclar».'],
  ['Pelo de las figuras', 'En Ajustes («⋯» al final de la barra): en masas (como un dibujo, por defecto) o realista con hebras, para primeros planos. Vale para todo el proyecto.'],
];
SETTINGS.board = () => `<div class="fld"><span>Viñetas automáticas</span><div class="seg">${[['3d', 'Escena 3D'], ['blank', 'En blanco']].map(([k, n]) => `<button data-act="sb-blank" data-v="${k}" aria-pressed="${ea((P.meta.sbBlank ? 'blank' : '3d') === k)}"${UI.readOnly ? ' disabled' : ''}>${n}</button>`).join('')}</div></div>
  <p class="hint" style="margin:0">Las que salen del guion o de «Sugerir planos» y nadie armó en 3D. En blanco quedan como una hoja vacía, para subir una imagen o dibujar encima. Cada plano también se puede dejar en blanco desde su «⋯».</p>
  <div class="fld"><span>Los planos nuevos se abren en</span><div class="seg">${[['3d', '3D · figuras y cámara'], ['2d', '2D · dibujo a mano']].map(([k, n]) => `<button data-act="sb-ws" data-v="${k}" aria-pressed="${ea(ls.get('boardWs', '3d') === k)}">${n}</button>`).join('')}</div></div>
  <p class="hint" style="margin:0">Cada plano puede cambiar de espacio con «3D | 2D», arriba en su editor.</p>
  <div class="fld"><span>Cámara del proyecto</span><select data-bind="sb-sensor" ${UI.readOnly ? 'disabled' : ''} aria-label="Tamaño del sensor de la cámara del proyecto">${SENSORS.map(([k, n, , w]) => `<option value="${ea(k)}" ${(P.meta.sensor || 'ff') === k ? 'selected' : ''}>${esc(n)}${k === 'ff' ? ' · 36 mm' : ` · ${String(w).replace('.', ',')} mm`}</option>`).join('')}</select></div>
  <p class="hint" style="margin:0">El sensor con que se encuadran los planos nuevos y los que siguen la cámara automática. Los que ya ajustaste quedan como están; cada plano puede cambiarlo en su panel Cámara.</p>
  <div class="fld"><span>Pelo de las figuras</span><div class="seg">${[['masas', 'Masas · dibujo'], ['real', 'Realista · hebras']].map(([k, n]) => `<button data-act="sb-hair" data-v="${k}" aria-pressed="${ea((P.meta.hair === 'real' ? 'real' : 'masas') === k)}"${UI.readOnly ? ' disabled' : ''}>${n}</button>`).join('')}</div></div>
  <p class="hint" style="margin:0">Masas: volúmenes limpios con contorno, como el maniquí (más liviano). Realista: mechones con hebras y brillo, para primeros planos. Vale para todo el proyecto.</p>`;
EXPORTS.board = () => [
  pdfItem('Storyboard (PDF)', 'storyboard', UI.sbScene ? 'Solo la escena ' + UI.sbScene : 'Viñetas con sus datos', { plan: false }),
  pdfItem('Storyboard con planta de cámara (PDF)', 'storyboard', 'Cada plano con su planta, figuras y luces', { plan: true }),
  pdfItem('Guion técnico (PDF)', 'shotlist', 'Tabla de planos con su técnica'),
];
