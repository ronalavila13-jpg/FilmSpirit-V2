/* ============================================================
   FOTOS DEL PERSONAJE · recorte de fondo, colores y rostro
   ============================================================ */
const PH_SLOTS = [['front', 'Frente', 'Obligatoria'], ['right', 'Perfil derecho', 'Mira hacia la derecha de la foto'], ['back', 'Espalda', 'Opcional'], ['left', 'Perfil izquierdo', 'Si falta, se refleja el derecho']];
// el recorte con su transparencia, en WebP de hasta unos 170 kB (imagenes.js)
const encImg = c => imgUrl(c, { alpha: true });

/* quita el fondo: relleno desde los bordes con tolerancia de color, más los huecos del mismo color.
   El fondo puede tener varios tonos (pared y piso): se toman los colores dominantes del borde. */
function phPalette(d, w, h, border, tol) {
  const col = i => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
  const dd = (i, c) => Math.hypot(d[i * 4] - c[0], d[i * 4 + 1] - c[1], d[i * 4 + 2] - c[2]);
  const bins = new Map();
  for (const i of border) { const k = (d[i * 4] >> 3) << 10 | (d[i * 4 + 1] >> 3) << 5 | (d[i * 4 + 2] >> 3); bins.set(k, (bins.get(k) || 0) + 1); }
  const cs = [];
  for (const [k, n] of [...bins].sort((p, q) => q[1] - p[1])) {
    if (n < border.length * .01 || cs.length >= 6) break;
    const c = [(k >> 10 & 31) * 8 + 4, (k >> 5 & 31) * 8 + 4, (k & 31) * 8 + 4];
    if (cs.every(o => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) > tol * 1.2)) cs.push(c);
  }
  if (!cs.length) cs.push([0, 1, 2].map(ch => border.map(i => d[i * 4 + ch]).sort((p, q) => p - q)[border.length >> 1]));
  // promedio por grupo de tono
  const acc = cs.map(() => [0, 0, 0, 0]);
  for (const i of border) {
    let bi = 0, bd = 1e9;
    cs.forEach((c, j) => { const v = dd(i, c); if (v < bd) { bd = v; bi = j; } });
    const A = acc[bi], c = col(i); A[0] += c[0]; A[1] += c[1]; A[2] += c[2]; A[3]++;
  }
  const gs = acc.filter(A => A[3]).map(A => ({ c: [A[0] / A[3], A[1] / A[3], A[2] / A[3]], n: A[3] / border.length })).sort((p, q) => q.n - p.n);
  // el tono dominante del borde siempre es fondo; los demás solo si casi no aparecen en el centro
  // (la persona que toca el borde del recorte no debe borrarse a sí misma)
  const ctr = [];
  for (let y = Math.floor(h * .15); y < h * .85; y += 3) for (let x = Math.floor(w * .35); x < w * .65; x += 3) ctr.push(y * w + x);
  return gs.filter((g, j) => j === 0 || (g.n >= .08 && ctr.filter(i => dd(i, g.c) < tol * 1.2).length < ctr.length * .25)).map(g => g.c);
}
/* tonos de la persona: los dominantes del centro de la imagen que no se parecen al fondo */
function phFgPalette(d, w, h, bgPal, tol) {
  const bins = new Map(); let tot = 0;
  for (let y = Math.floor(h * .02); y < h * .95; y += 2) for (let x = Math.floor(w * .3); x < w * .7; x += 2) {
    const i = (y * w + x) * 4, k = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3);
    bins.set(k, (bins.get(k) || 0) + 1); tot++;
  }
  const cs = [];
  for (const [k, n] of [...bins].sort((p, q) => q[1] - p[1])) {
    if (n < tot * .006 || cs.length >= 12) break;
    const c = [(k >> 10 & 31) * 8 + 4, (k >> 5 & 31) * 8 + 4, (k & 31) * 8 + 4];
    if (bgPal.some(o => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) < tol * .6)) continue;
    if (cs.every(o => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) > tol * .5)) cs.push(c);
  }
  return cs;
}
function phRemoveBg(src, tol) {
  const w = src.width, h = src.height, g = src.getContext('2d'), id = g.getImageData(0, 0, w, h), d = id.data;
  const N = w * h, bg = new Uint8Array(N);
  const border = [];
  for (let x = 0; x < w; x += 2) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y += 2) border.push(y * w, y * w + w - 1);
  const pal = phPalette(d, w, h, border, tol), fgp = phFgPalette(d, w, h, pal, tol);
  // distancia de cada píxel al fondo; solo puede ser fondo si se parece más al fondo que a la persona
  const dref = new Float32Array(N), elig = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2];
    let m = 1e9, f = 1e9;
    for (const c of pal) { const v = Math.hypot(r - c[0], gg - c[1], b - c[2]); if (v < m) m = v; }
    for (const c of fgp) { const v = Math.hypot(r - c[0], gg - c[1], b - c[2]); if (v < f) f = v; }
    dref[i] = m; elig[i] = m < tol * 1.6 && m < f ? 1 : 0;
  }
  const st = [];
  for (const i of border) if (!bg[i] && elig[i]) { bg[i] = 1; st.push(i); }
  while (st.length) {
    const i = st.pop(), x = i % w;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
    for (const j of nb) {
      if (j < 0 || j >= N || bg[j] || !elig[j]) continue;
      const dj = Math.hypot(d[j * 4] - d[i * 4], d[j * 4 + 1] - d[i * 4 + 1], d[j * 4 + 2] - d[i * 4 + 2]);
      if (dj < tol * .7) { bg[j] = 1; st.push(j); }
    }
  }
  // huecos encerrados (entre brazos y piernas) del color del fondo
  const seen = new Uint8Array(N);
  const hole = i => elig[i] && dref[i] < tol * .8;
  for (let i = 0; i < N; i++) {
    if (bg[i] || seen[i] || !hole(i)) continue;
    const comp = [i]; seen[i] = 1;
    for (let k = 0; k < comp.length; k++) {
      const q = comp[k], x = q % w;
      for (const j of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, q - w, q + w]) if (j >= 0 && j < N && !seen[j] && !bg[j] && hole(j)) { seen[j] = 1; comp.push(j); }
    }
    if (comp.length > N * .0015) for (const q of comp) bg[q] = 1;
  }
  // figura principal (la más grande) y las piezas grandes pegadas a ella (cabeza, manos, pies sueltos)
  const lab = new Int32Array(N), comps = [];
  for (let i = 0; i < N; i++) {
    if (bg[i] || lab[i]) continue;
    const n = comps.length + 1, comp = [i]; lab[i] = n;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let k = 0; k < comp.length; k++) {
      const q = comp[k], x = q % w, y = (q / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const j of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, q - w, q + w]) if (j >= 0 && j < N && !bg[j] && !lab[j]) { lab[j] = n; comp.push(j); }
    }
    comps.push({ n: comp.length, b: [x0, y0, x1, y1] });
  }
  const keep = new Uint8Array(comps.length + 1);
  if (comps.length) {
    const best = comps.reduce((p, c) => c.n > p.n ? c : p), bb = best.b, m = (bb[3] - bb[1]) * .12;
    comps.forEach((c, j) => {
      if (c === best) { keep[j + 1] = 1; return; }
      const near = c.b[2] >= bb[0] - m && c.b[0] <= bb[2] + m && c.b[3] >= bb[1] - m && c.b[1] <= bb[3] + m;
      if (near && c.n >= Math.max(best.n * .02, N * .0008)) keep[j + 1] = 1;
    });
  }
  const isK = i => keep[lab[i]] === 1;
  for (let i = 0; i < N; i++) {
    let a = isK(i) ? 255 : 0;
    if (a) { const x = i % w; const edge = (x > 0 && !isK(i - 1)) || (x < w - 1 && !isK(i + 1)) || (i >= w && !isK(i - w)) || (i < N - w && !isK(i + w)); if (edge) a = 140; }
    d[i * 4 + 3] = a;
  }
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  out.getContext('2d').putImageData(id, 0, 0);
  return out;
}
function phTrim(c) {
  const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 100) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return c;
  const p = 4; x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p); x1 = Math.min(w - 1, x1 + p); y1 = Math.min(h - 1, y1 + p);
  const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
  o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}
function phProcess(src, rm, tol) { return rm ? phTrim(phRemoveBg(src, tol)) : src; }
/* recorte manual: r = [x, y, w, h] normalizado a la foto completa */
function phCrop(c, r) {
  if (!r) return c;
  const x = Math.round(r[0] * c.width), y = Math.round(r[1] * c.height);
  const w = Math.max(8, Math.round(r[2] * c.width)), h = Math.max(8, Math.round(r[3] * c.height));
  const o = document.createElement('canvas'); o.width = Math.min(w, c.width - x); o.height = Math.min(h, c.height - y);
  o.getContext('2d').drawImage(c, x, y, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}
function phFit(c, maxH = 700, maxW = 1200) {
  const k = Math.min(1, maxH / c.height, maxW / c.width);
  if (k >= 1) return c;
  const o = document.createElement('canvas'); o.width = Math.max(1, Math.round(c.width * k)); o.height = Math.max(1, Math.round(c.height * k));
  const g = o.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, o.width, o.height);
  return o;
}
/* colores medianos de zonas del cuerpo en la foto de frente */
function phColors(c) {
  const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
  const med = (fx0, fy0, fx1, fy1) => {
    const r = [], g = [], b = [];
    for (let y = Math.floor(h * fy0); y < Math.ceil(h * fy1); y++) for (let x = Math.floor(w * fx0); x < Math.ceil(w * fx1); x++) { const i = (y * w + x) * 4; if (d[i + 3] > 200) { r.push(d[i]); g.push(d[i + 1]); b.push(d[i + 2]); } }
    if (r.length < 8) return null;
    const m = a => a.sort((p, q) => p - q)[a.length >> 1];
    return '#' + [m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join('');
  };
  const full = h / w > 1.6;
  return full
    ? { hair: med(.4, .0, .6, .03), skin: med(.44, .06, .56, .1), color: med(.35, .25, .65, .42), pants: med(.38, .6, .62, .8) }
    : { hair: med(.35, .02, .65, .1), skin: med(.4, .35, .6, .55), color: med(.3, .88, .7, .99), pants: null };
}
function phFaceGuess(c) {
  const w = c.width, h = c.height;
  if (h / w > 1.6) { const s = h * .12; return [.5 - s / w / 2, .005, s / w, s * 1.18 / h]; }
  return [.18, .06, .64, .74];
}
function phFaceTexture(c, f) {
  const o = document.createElement('canvas'); o.width = o.height = 256;
  const g = o.getContext('2d');
  const [fx, fy, fw, fh] = [f[0] * c.width, f[1] * c.height, f[2] * c.width, f[3] * c.height];
  g.drawImage(c, fx, fy, fw, fh, 0, 0, 256, 256);
  g.globalCompositeOperation = 'destination-in';
  g.save(); g.translate(128, 128); g.scale(1, 1.12);
  const gr = g.createRadialGradient(0, 0, 70, 0, 0, 116);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(-140, -140, 280, 280); g.restore();
  return o;
}
function loadCanvas(file, maxH = 700, maxW = 1200) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { const k = Math.min(1, maxH / im.height, maxW / im.width); const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); if (im.src.startsWith('blob:')) URL.revokeObjectURL(im.src); res(c); };
    im.onerror = rej;
    im.src = typeof file === 'string' ? file : URL.createObjectURL(file);
  });
}

function openPhotoDialog(el, done) {
  const look = { ...(el.look || {}) }, L0 = lookOf({ kind: 'actor', el: el.id });
  const S = { slots: {}, face: look.photo && look.photo.face || null, colors: { skin: L0.skin, hair: L0.hair, color: L0.color, pants: L0.pants }, edited: new Set(), mode: (look.photo && look.photo.mode) || 'maniqui', height: L0.height, removed: new Set(), crop: null };
  const ov = document.createElement('div');
  ov.className = 'modal fp-modal'; ov.id = 'phModal';
  ov.innerHTML = `<div class="dlg wide" role="dialog" aria-modal="true" aria-label="Fotos del personaje">
    <header><h2>Fotos de ${esc(el.name)}</h2><button class="btn ghost sm" data-x aria-label="Cerrar">${ICO.close}</button></header>
    <div class="body"><div class="phx">
      <div class="ph-slots">${PH_SLOTS.map(([k, n, hnt]) => `<div class="phs" data-slot="${k}">
        <div class="phs-h"><b>${n}</b><span class="hint">${hnt}</span></div>
        <div class="phs-cv"><canvas width="10" height="10"></canvas><button class="btn sm phs-pick" data-pick>Elegir foto</button></div>
        <div class="phs-ctl" hidden><div class="phs-norm"><label class="chip"><input type="checkbox" data-rm checked> Quitar fondo</label>
          <label class="rr"><span>Tolerancia</span><input type="range" data-tol min="5" max="120" value="38"><output>38</output></label>
          <div class="phs-btns"><button class="btn ghost sm" data-crop title="Encierra solo a la persona antes de quitar el fondo">${ICO.cut} <span>Recortar</span></button><button class="btn ghost sm" data-pick>Cambiar</button><button class="btn ghost sm danger" data-del>Quitar</button></div></div>
          <div class="phs-crop" hidden><p class="hint">Arrastra un recuadro alrededor de la persona, dejando fuera a otras personas y objetos. Muévelo desde dentro o ajústalo por sus esquinas.</p>
          <div class="phs-btns"><button class="btn primary sm" data-capply>Aplicar recorte</button><button class="btn ghost sm" data-cfull>Usar toda la foto</button><button class="btn ghost sm" data-ccancel>Cancelar</button></div></div></div>
      </div>`).join('')}</div>
      <div class="ph-side">
        <div class="fld"><span>En la escena</span>
          <label class="opt"><input type="radio" name="phm" value="maniqui" ${S.mode !== 'recorte' ? 'checked' : ''}><span><b>Maniquí con su rostro y colores</b><span class="hint">Mantiene posturas, articulaciones y animación.</span></span></label>
          <label class="opt"><input type="radio" name="phm" value="recorte" ${S.mode === 'recorte' ? 'checked' : ''}><span><b>Recorte fotográfico</b><span class="hint">La figura es la foto recortada y cambia de frente, perfil o espalda según dónde esté la cámara. No usa posturas.</span></span></label></div>
        <div class="fld"><span>Colores tomados de la foto</span><div class="phcols">${[['skin', 'Piel'], ['hair', 'Cabello'], ['color', 'Vestuario'], ['pants', 'Pantalón']].map(([k, n]) => `<label><input type="color" data-col="${k}" value="${ea(S.colors[k])}"><span>${n}</span></label>`).join('')}</div></div>
        <label class="fld"><span>Estatura (m)</span><input type="number" id="phH" step="0.01" min="0.5" max="2.4" value="${ea(S.height.toFixed(2))}"></label>
        <p class="hint" style="margin:0">En la foto de frente, arrastra un recuadro sobre la cara: ese será el rostro del maniquí. Las fotos con fondo liso se recortan mejor; si hay otras personas u objetos, usa <b>Recortar</b> para encerrar solo al personaje.</p>
      </div></div></div>
    <footer><button class="btn" data-x>Cancelar</button><button class="btn primary" id="phOk">Guardar</button></footer></div>`;
  document.body.appendChild(ov);
  const $o = s => ov.querySelector(s);
  const close = () => { removeEventListener('keydown', onEsc, true); ov.remove(); };
  // con fotos nuevas o quitadas, cerrar sin guardar pregunta antes
  const req = guardOverlay(ov, { dirty: () => S.touched || S.removed.size > 0, close, save: () => { const b = $o('#phOk'); if (b) b.click(); } });
  const onEsc = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); if (S.crop) endCrop(); else req('esc'); } };
  addEventListener('keydown', onEsc, true);
  ov.addEventListener('click', e => { if (e.target === ov) req('fuera'); else if (e.target.closest('[data-x]')) req('x'); });
  ov.addEventListener('input', () => { S.touched = true; });
  const card = k => ov.querySelector(`.phs[data-slot="${k}"]`);
  function paint(k) {
    const sl = S.slots[k], c = card(k), cv = c.querySelector('canvas'), cropping = !!(S.crop && S.crop.k === k);
    c.querySelector('.phs-pick').hidden = !!sl; c.querySelector('.phs-ctl').hidden = !sl;
    c.querySelector('.phs-norm').hidden = cropping; c.querySelector('.phs-crop').hidden = !cropping;
    if (!sl) { cv.width = cv.height = 10; cv.getContext('2d').clearRect(0, 0, 10, 10); return; }
    c.querySelector('[data-crop]').innerHTML = ICO.cut + (sl.crop ? ' <span>Ajustar recorte</span>' : ' <span>Recortar</span>');
    const o = cropping ? sl.full : sl.out, box = cv.parentElement.getBoundingClientRect();
    const k2 = Math.min((box.width - 8) / o.width, (box.height - 8) / o.height);
    cv.width = Math.max(1, Math.round(o.width * k2)); cv.height = Math.max(1, Math.round(o.height * k2));
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H); g.drawImage(o, 0, 0, W, H);
    if (cropping) {
      const r = S.crop.r, x = r[0] * W, y = r[1] * H, w = r[2] * W, h = r[3] * H;
      g.fillStyle = 'rgba(14,17,23,.6)'; g.beginPath(); g.rect(0, 0, W, H); g.rect(x, y, w, h); g.fill('evenodd');
      g.lineWidth = 2; g.strokeStyle = '#fff'; g.strokeRect(x, y, w, h);
      g.strokeStyle = '#2C47CF'; g.setLineDash([6, 4]); g.strokeRect(x, y, w, h); g.setLineDash([]);
      g.lineWidth = 1; g.strokeStyle = 'rgba(255,255,255,.45)';
      for (const f of [1 / 3, 2 / 3]) { g.beginPath(); g.moveTo(x + w * f, y); g.lineTo(x + w * f, y + h); g.moveTo(x, y + h * f); g.lineTo(x + w, y + h * f); g.stroke(); }
      g.fillStyle = '#fff'; g.strokeStyle = '#2C47CF'; g.lineWidth = 2;
      for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) { g.fillRect(cx - 5, cy - 5, 10, 10); g.strokeRect(cx - 5, cy - 5, 10, 10); }
    } else if (k === 'front' && S.face) { g.strokeStyle = '#2C47CF'; g.lineWidth = 2; g.setLineDash([5, 3]); g.strokeRect(S.face[0] * W, S.face[1] * H, S.face[2] * W, S.face[3] * H); g.setLineDash([]); }
  }
  function process(k, rebase) {
    const sl = S.slots[k]; if (!sl) return;
    if (rebase || !sl.src) sl.src = phFit(phCrop(sl.full, sl.crop));
    sl.out = phProcess(sl.src, sl.rm, sl.tol);
    if (k === 'front') {
      if (!sl.faceSet) S.face = phFaceGuess(sl.out);
      const c = phColors(sl.out);
      for (const f of ['skin', 'hair', 'color', 'pants']) if (c[f] && !S.edited.has(f)) { S.colors[f] = c[f]; $o(`[data-col="${f}"]`).value = c[f]; }
    }
    paint(k);
  }
  // modo recorte: una sola foto a tamaño grande
  function startCrop(k) {
    const sl = S.slots[k]; if (!sl) return;
    if (S.crop) endCrop();
    S.crop = { k, r: sl.crop ? sl.crop.slice() : [0, 0, 1, 1] };
    $o('.ph-slots').classList.add('cropping'); card(k).classList.add('cropping');
    paint(k);
  }
  function endCrop() {
    if (!S.crop) return;
    const k = S.crop.k; S.crop = null;
    $o('.ph-slots').classList.remove('cropping'); card(k).classList.remove('cropping');
    for (const [s] of PH_SLOTS) paint(s);
  }
  function applyCrop(r) {
    const k = S.crop.k, sl = S.slots[k];
    const full = !r || (r[0] < .01 && r[1] < .01 && r[2] > .98 && r[3] > .98);
    const nr = full ? null : r.map(v => +v.toFixed(4));
    const same = JSON.stringify(nr) === JSON.stringify(sl.crop || null);
    sl.crop = nr; endCrop();
    if (same) return;
    S.touched = true;
    if (k === 'front') sl.faceSet = false;
    process(k, true);
    toast(nr ? 'Recorte aplicado.' : 'Se usa la foto completa.');
  }
  async function setFile(k, file, pre) {
    try {
      const full = await loadCanvas(file, 2000, 2400);
      if (S.crop && S.crop.k === k) endCrop();
      S.slots[k] = { full, crop: null, src: null, rm: !pre, tol: 38, out: full, faceSet: pre && k === 'front' && !!S.face };
      S.removed.delete(k);
      if (!pre) S.touched = true;
      const c = card(k); c.querySelector('[data-rm]').checked = !pre;
      process(k);
    } catch (e) { toast('No se pudo leer esa imagen. Prueba con un JPG o un PNG.'); }
  }
  ov.querySelector('.ph-slots').addEventListener('click', e => {
    const c = e.target.closest('.phs'); if (!c) return;
    const k = c.dataset.slot;
    if (e.target.closest('[data-pick]')) { const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.onchange = () => fi.files[0] && setFile(k, fi.files[0]); fi.click(); }
    if (e.target.closest('[data-del]')) { delete S.slots[k]; S.removed.add(k); paint(k); }
    if (e.target.closest('[data-crop]')) startCrop(k);
    if (S.crop && S.crop.k === k) {
      if (e.target.closest('[data-capply]')) { const r = S.crop.r; if (r[2] < .03 || r[3] < .03) { toast('El recuadro es muy pequeño.'); return; } applyCrop(r); }
      else if (e.target.closest('[data-cfull]')) applyCrop(null);
      else if (e.target.closest('[data-ccancel]')) endCrop();
    }
  });
  ov.querySelector('.ph-slots').addEventListener('change', e => {
    const c = e.target.closest('.phs'), sl = c && S.slots[c.dataset.slot]; if (!sl) return;
    if (e.target.matches('[data-rm]')) { sl.rm = e.target.checked; process(c.dataset.slot); }
    if (e.target.matches('[data-tol]')) { sl.tol = +e.target.value; process(c.dataset.slot); }
  });
  ov.querySelector('.ph-slots').addEventListener('input', e => { if (e.target.matches('[data-tol]')) e.target.nextElementSibling.textContent = e.target.value; });
  ov.querySelectorAll('.phs-cv').forEach(z => {
    z.addEventListener('dragover', e => e.preventDefault());
    z.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(z.closest('.phs').dataset.slot, f); });
  });
  // arrastre sobre la foto: recuadro de recorte (en modo recorte) o del rostro (foto de frente)
  let drag = null;
  ov.querySelectorAll('.phs-cv canvas').forEach(cv => {
    const k = cv.closest('.phs').dataset.slot;
    const pos = e => { const r = cv.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1), r]; };
    const hit = (x, y, r) => {
      const c = S.crop.r, tx = 12 / r.width, ty = 12 / r.height;
      const cs = [[c[0], c[1]], [c[0] + c[2], c[1]], [c[0], c[1] + c[3]], [c[0] + c[2], c[1] + c[3]]];
      const hi = cs.findIndex(([cx, cy]) => Math.abs(x - cx) < tx && Math.abs(y - cy) < ty);
      if (hi >= 0) return { t: 'corner', hi, a: cs[3 - hi] };
      // con el recuadro en toda la foto, arrastrar dibuja uno nuevo
      if (!(c[2] > .96 && c[3] > .96) && x > c[0] && x < c[0] + c[2] && y > c[1] && y < c[1] + c[3]) return { t: 'move' };
      return { t: 'new' };
    };
    cv.addEventListener('pointerdown', e => {
      const sl = S.slots[k]; if (!sl) return;
      const cropping = S.crop && S.crop.k === k;
      if (!cropping && k !== 'front') return;
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      const [x, y, r] = pos(e);
      if (cropping) { const h = hit(x, y, r); drag = { t: h.t === 'move' ? 'move' : 'crop', a: h.a || [x, y], p: [x, y], r0: S.crop.r.slice() }; }
      else drag = { t: 'face', a: [x, y], f0: S.face && S.face.slice() };
    });
    cv.addEventListener('pointermove', e => {
      const [x, y, r] = pos(e);
      if (!drag) {
        if (S.crop && S.crop.k === k) { const h = hit(x, y, r); cv.style.cursor = h.t === 'corner' ? (h.hi === 0 || h.hi === 3 ? 'nwse-resize' : 'nesw-resize') : h.t === 'move' ? 'move' : 'crosshair'; }
        else cv.style.cursor = '';
        return;
      }
      if (drag.t === 'move') { const r0 = drag.r0; S.crop.r = [clamp(r0[0] + x - drag.p[0], 0, 1 - r0[2]), clamp(r0[1] + y - drag.p[1], 0, 1 - r0[3]), r0[2], r0[3]]; }
      else {
        const a = drag.a, rr = [Math.min(a[0], x), Math.min(a[1], y), Math.abs(x - a[0]), Math.abs(y - a[1])];
        if (drag.t === 'crop') S.crop.r = rr; else { S.face = rr; S.slots.front.faceSet = true; }
      }
      paint(k);
    });
    const up = () => {
      if (!drag) return;
      const d = drag; drag = null;
      if (d.t === 'crop' && S.crop && (S.crop.r[2] < .02 || S.crop.r[3] < .02)) { S.crop.r = d.r0; paint(k); }
      if (d.t === 'face' && S.face && (S.face[2] < .03 || S.face[3] < .03)) { S.face = d.f0 || phFaceGuess(S.slots.front.out); paint('front'); }
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('dblclick', () => { if (S.crop && S.crop.k === k) applyCrop(S.crop.r); });
  });
  ov.querySelector('.phcols').addEventListener('input', e => { const f = e.target.dataset.col; if (f) { S.colors[f] = e.target.value; S.edited.add(f); } });
  ov.querySelectorAll('[name="phm"]').forEach(r => r.addEventListener('change', () => { S.mode = r.value; }));
  // fotos ya guardadas
  (async () => { for (const [k] of PH_SLOTS) { const u = FRAMES['ph~' + el.id + '~' + k]; if (u) await setFile(k, u, true); } })();
  $o('#phOk').onclick = async () => {
    const writes = [];
    for (const [k] of PH_SLOTS) {
      const key = 'ph~' + el.id + '~' + k, sl = S.slots[k];
      if (sl) {
        const sc = Math.min(1, 420 / sl.out.height), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(sl.out.width * sc)); c.height = Math.max(1, Math.round(sl.out.height * sc));
        c.getContext('2d').drawImage(sl.out, 0, 0, c.width, c.height);
        writes.push([key, encImg(c)]);
      } else if (FRAMES[key]) writes.push([key, null]);
    }
    const fkey = 'ph~' + el.id + '~face';
    if (S.slots.front && S.face) writes.push([fkey, encImg(phFaceTexture(S.slots.front.out, S.face))]);
    else if (FRAMES[fkey]) writes.push([fkey, null]);
    for (const [k, v] of writes) { if (v) FRAMES[k] = v; else delete FRAMES[k]; }
    const nl = { ...(el.look || {}), height: clamp(num($o('#phH').value) || S.height, .5, 2.4) };
    if (S.slots.front) {
      Object.assign(nl, { skin: S.colors.skin, hair: S.colors.hair, color: S.colors.color, pants: S.colors.pants, hairSet: true });
      nl.photo = { mode: S.mode, face: S.face, v: Date.now() };
    } else delete nl.photo;
    el.look = nl;
    close();
    changed('data'); THUMB3.clear();
    if (!UI.readOnly) {
      if (P._sample && !P._saved) await flushSave();
      for (const [k, v] of writes) { try { await Store.saveFrame(P.id, k, v); } catch (e) { toast('No se pudo guardar una de las fotos. Vuelve a subirla.'); } }
    }
    done && done();
  };
}
