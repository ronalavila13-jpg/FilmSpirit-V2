/* ============================================================
   PLANOS DE PLANTA · detección de muros en una imagen
   Los muros son los trazos oscuros y gruesos: se separan del texto,
   las cotas y el mobiliario (trazos finos o claros) con una apertura
   morfológica, y se convierten en rectángulos.
   ============================================================ */
function fpGray(id) {
  const { data, width: w, height: h } = id, g = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) {
    const a = data[j + 3] / 255;
    g[i] = Math.round((data[j] * .299 + data[j + 1] * .587 + data[j + 2] * .114) * a + 255 * (1 - a));
  }
  return g;
}
function fpOtsu(g) {
  const hist = new Array(256).fill(0);
  for (const v of g) hist[v]++;
  const total = g.length;
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue;
    const wF = total - wB; if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) { best = v; thr = t; }
  }
  return thr;
}
/* grosor típico de trazo: para cada píxel oscuro, la menor de sus corridas horizontal y vertical;
   se cuenta por longitud de trazo (peso 1/t²) para que los bloques macizos no dominen */
function fpThickness(m, w, h) {
  const lh = new Uint16Array(w * h), lv = new Uint16Array(w * h);
  for (let y = 0; y < h; y++) { let x = 0; while (x < w) { if (!m[y * w + x]) { x++; continue; } let e = x; while (e < w && m[y * w + e]) e++; for (let k = x; k < e; k++) lh[y * w + k] = e - x; x = e; } }
  for (let x = 0; x < w; x++) { let y = 0; while (y < h) { if (!m[y * w + x]) { y++; continue; } let e = y; while (e < h && m[e * w + x]) e++; for (let k = y; k < e; k++) lv[k * w + x] = e - y; y = e; } }
  const hist = new Float64Array(61);
  for (let i = 0; i < m.length; i++) if (m[i]) { const t = Math.min(lh[i], lv[i]); if (t >= 4 && t <= 60) hist[t] += 1 / (t * t); }
  let best = 0, T = 6;
  for (let t = 4; t <= 60; t++) { const v = hist[t] + .5 * (hist[t - 1] + (hist[t + 1] || 0)); if (v > best) { best = v; T = t; } }
  return T;
}
function fpMorph(m, w, h, r, dil) {
  // mínimo (erosión) o máximo (dilatación) en una ventana cuadrada, separable
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let c = 0; const row = y * w;
    for (let x = -r; x < w; x++) {
      const a = x + r, b = x - r - 1;
      if (a < w) c += m[row + a];
      if (b >= 0) c -= m[row + b];
      if (x >= 0) { const lo = Math.max(0, x - r), hi = Math.min(w - 1, x + r); tmp[row + x] = dil ? (c > 0 ? 1 : 0) : (c === hi - lo + 1 ? 1 : 0); }
    }
  }
  for (let x = 0; x < w; x++) {
    let c = 0;
    for (let y = -r; y < h; y++) {
      const a = y + r, b = y - r - 1;
      if (a < h) c += tmp[a * w + x];
      if (b >= 0) c -= tmp[b * w + x];
      if (y >= 0) { const lo = Math.max(0, y - r), hi = Math.min(h - 1, y + r); out[y * w + x] = dil ? (c > 0 ? 1 : 0) : (c === hi - lo + 1 ? 1 : 0); }
    }
  }
  return out;
}
/* limpia componentes: manchas pequeñas y bloques macizos (barras de interfaz, botones) */
function fpClean(m, w, h, T) {
  const lab = new Int32Array(w * h), out = new Uint8Array(w * h), stack = [];
  let n = 0;
  for (let i = 0; i < m.length; i++) {
    if (!m[i] || lab[i]) continue;
    n++; let area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0; const px = [];
    stack.push(i); lab[i] = n;
    while (stack.length) {
      const k = stack.pop(); px.push(k); area++;
      const x = k % w, y = (k - x) / w;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && m[k - 1] && !lab[k - 1]) { lab[k - 1] = n; stack.push(k - 1); }
      if (x < w - 1 && m[k + 1] && !lab[k + 1]) { lab[k + 1] = n; stack.push(k + 1); }
      if (y > 0 && m[k - w] && !lab[k - w]) { lab[k - w] = n; stack.push(k - w); }
      if (y < h - 1 && m[k + w] && !lab[k + w]) { lab[k + w] = n; stack.push(k + w); }
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, fill = area / (bw * bh);
    const small = area < 3 * T * T || Math.max(bw, bh) < 2.5 * T;
    const blob = Math.min(bw, bh) > 3.2 * T && fill > .6;
    if (!small && !blob) for (const k of px) out[k] = 1;
  }
  return out;
}
/* máscara de muros → rectángulos (celdas de T/3, corridas por fila fusionadas en vertical) */
function fpRects(m, w, h, T) {
  const cs = Math.max(1, Math.round(T / 3)), gw = Math.ceil(w / cs), gh = Math.ceil(h / cs);
  const cell = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let c = 0, t = 0;
    for (let y = gy * cs; y < Math.min(h, gy * cs + cs); y++) for (let x = gx * cs; x < Math.min(w, gx * cs + cs); x++) { t++; c += m[y * w + x]; }
    cell[gy * gw + gx] = c * 2 >= t ? 1 : 0;
  }
  const open = new Map(), rects = [];
  for (let gy = 0; gy <= gh; gy++) {
    const runs = [];
    if (gy < gh) { let s = -1; for (let gx = 0; gx <= gw; gx++) { const v = gx < gw && cell[gy * gw + gx]; if (v && s < 0) s = gx; if (!v && s >= 0) { runs.push(s + ':' + gx); s = -1; } } }
    const keep = new Set(runs);
    for (const [k, r] of open) if (!keep.has(k)) { rects.push(r); open.delete(k); }
    for (const k of runs) {
      if (open.has(k)) open.get(k)[3] += cs;
      else { const [a, b] = k.split(':').map(Number); open.set(k, [a * cs, gy * cs, (b - a) * cs, cs]); }
    }
  }
  return rects.map(([x, y, rw, rh]) => [x, y, Math.min(rw, w - x), Math.min(rh, h - y)]).filter(r => r[2] > 0 && r[3] > 0);
}
function fpDetect(gray, w, h, o) {
  const thr = o.thr;
  let dark = new Uint8Array(w * h);
  const roi = o.roi || [0, 0, w, h];
  for (let y = roi[1]; y < roi[1] + roi[3]; y++) for (let x = roi[0]; x < roi[0] + roi[2]; x++) { const i = y * w + x; dark[i] = gray[i] < thr ? 1 : 0; }
  const T = o.T || fpThickness(dark, w, h);
  const r = Math.max(1, Math.round(T * .36));
  const opened = fpMorph(fpMorph(dark, w, h, r, false), w, h, r, true);
  const mask = fpClean(opened, w, h, T);
  return { mask, T };
}
function fpBBox(rects) {
  if (!rects.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y, w, h] of rects) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
/* plano guardado: imagen + rectángulos en píxeles + metros por píxel; el centro de los muros es el origen */
const planOf = s3 => s3 && s3.set === 'plano' && P.plans && P.plans[s3.planId] || null;
function planWorld(pl) {
  const b = fpBBox(pl.rects) || { cx: pl.w / 2, cy: pl.h / 2, w: pl.w, h: pl.h, x0: 0, y0: 0, x1: pl.w, y1: pl.h };
  // lote W · la escala del escenario (pl.esc) agranda o achica el plano alrededor del centro de sus muros
  const k = pl.sc * (typeof escOf === 'function' ? escOf(pl) : 1);
  return { b, k, x: px => (px - b.cx) * k, z: py => (py - b.cy) * k };
}
const planSig = sh => { const s3 = s3Of(sh), pl = planOf(s3); if (!pl) return ''; const im = PLAN_IMG.get(pl.id); return pl.id + ':' + pl.v + ':' + (pl.esc || 1) + ':' + (s3.planFloor !== false) + ':' + !!(im && im._v === pl.v && im.complete && im.naturalWidth); };

/* ---------- importador ---------- */
function openPlanImporter(opts, done) {
  const S = { img: null, w: 0, h: 0, gray: null, roi: null, thr: 128, T: 0, Tauto: true, mask: null, rects: [], mode: 'none', brush: 0, strokes: [], meas: null, sc: 0, wallH: 2.6, name: opts.name || 'Plano', applyLoc: !!opts.loc };
  const ov = document.createElement('div');
  ov.className = 'modal fp-modal'; ov.id = 'fpModal';
  ov.innerHTML = `<div class="dlg wide" role="dialog" aria-modal="true" aria-label="Importar plano de planta">
    <header><h2>Importar plano de planta</h2><button class="btn ghost sm" data-x aria-label="Cerrar">${ICO.close}</button></header>
    <div class="body"><div class="fpi">
      <div class="fpi-l">
        <div class="seg fpi-tools" role="group">${[['none', 'Ver'], ['crop', 'Recortar'], ['measure', 'Medir cota'], ['paint', 'Pintar muro'], ['erase', 'Borrar muro']].map(([k, n]) => `<button data-mode="${k}" aria-pressed="${ea(k === 'none')}">${n}</button>`).join('')}</div>
        <div class="fpi-cv" id="fpWrap"><canvas id="fpC"></canvas>
          <div class="fpi-drop" id="fpDrop"><b>Elige, arrastra o pega una imagen del plano</b><span>PNG o JPG. Sirve una captura de pantalla: las barras y botones del teléfono se descartan solos.</span><button class="btn primary" id="fpPick">Elegir imagen</button></div></div>
        <p class="hint" id="fpHint" style="margin:0"></p>
      </div>
      <div class="fpi-r">
        <label class="fld"><span>Nombre</span><input type="text" id="fpName" value="${esc(S.name)}"></label>
        <label class="rr"><span>Sensibilidad</span><input type="range" id="fpThr" min="30" max="230" step="1" value="128"><output id="fpThrO">128</output></label>
        <label class="rr"><span>Grosor de muro</span><input type="range" id="fpT" min="2" max="40" step="1" value="6"><output id="fpTO">auto</output></label>
        <label class="rr"><span>Pincel</span><input type="range" id="fpB" min="2" max="40" step="1" value="8"><output id="fpBO">8 px</output></label>
        <div class="fld"><span>Escala</span>
          <div class="durrow"><input type="number" id="fpWm" step="0.01" min="0.5" class="tnum"><span class="hint">m de ancho total de muros</span></div>
          <div class="durrow" id="fpMeasRow" hidden><input type="number" id="fpMm" step="0.01" min="0.1" class="tnum"><span class="hint">m mide la línea marcada</span></div>
          <span class="hint" id="fpDims"></span></div>
        <label class="rr"><span>Alto de muros</span><input type="range" id="fpH" min="2" max="6" step="0.05" value="2.6"><output id="fpHO">2.60 m</output></label>
        ${opts.loc ? `<label class="opt" style="padding:8px 10px"><input type="checkbox" id="fpLoc" checked><span><b>Usarlo en toda la locación</b><span class="hint">${esc(titleCase(opts.loc))}: los demás planos de esta locación también lo usan.</span></span></label>` : ''}
        <p class="hint" style="margin:0">Consejo: usa «Medir cota» sobre una medida escrita del plano (por ejemplo 4,50 m) para que la escala sea exacta.</p>
      </div></div></div>
    <footer><button class="btn" data-x>Cancelar</button><button class="btn primary" id="fpOk" disabled>Importar plano</button></footer></div>`;
  document.body.appendChild(ov);
  const $o = s => ov.querySelector(s);
  const cv = $o('#fpC'), ctx = cv.getContext('2d');
  const close = () => { removeEventListener('keydown', onEsc, true); removeEventListener('paste', onPaste); ov.remove(); };
  // con una imagen cargada, cerrar sin importar pregunta antes
  const req = guardOverlay(ov, { dirty: () => !!S.img, close });
  const onEsc = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); req('esc'); } };
  addEventListener('keydown', onEsc, true);
  ov.addEventListener('click', e => { if (e.target === ov) req('fuera'); else if (e.target.closest('[data-x]')) req('x'); });
  const hint = () => {
    const t = { none: S.img ? 'En rojo, los muros detectados. Ajusta la sensibilidad o el grosor si falta o sobra algo.' : '', crop: 'Arrastra un rectángulo alrededor del plano para ignorar el resto de la imagen.', measure: 'Arrastra de un extremo al otro de una medida conocida y escribe cuántos metros mide.', paint: 'Pinta donde falte un muro.', erase: 'Borra lo que no sea muro.' }[S.mode];
    $o('#fpHint').textContent = t;
  };
  function load(file) {
    if (!file || !/^image\//.test(file.type)) { toast('Elige una imagen PNG o JPG del plano.'); return; }
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1000 / Math.max(im.width, im.height));
      S.w = Math.max(1, Math.round(im.width * k)); S.h = Math.max(1, Math.round(im.height * k));
      const c = document.createElement('canvas'); c.width = S.w; c.height = S.h;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, S.w, S.h); g.drawImage(im, 0, 0, S.w, S.h);
      S.img = c; S.gray = fpGray(g.getImageData(0, 0, S.w, S.h));
      S.thr = clamp(fpOtsu(S.gray), 60, 170); S.roi = null; S.strokes = []; S.meas = null; S.Tauto = true; S.sc = 0;
      $o('#fpThr').value = S.thr; $o('#fpThrO').textContent = S.thr;
      $o('#fpDrop').hidden = true; $o('#fpOk').disabled = false;
      URL.revokeObjectURL(im.src);
      detect(); sizeCanvas(); draw(); hint();
    };
    im.onerror = () => toast('No se pudo leer esa imagen. Prueba con un JPG o un PNG.');
    im.src = URL.createObjectURL(file);
  }
  function detect() {
    if (!S.gray) return;
    const r = fpDetect(S.gray, S.w, S.h, { thr: S.thr, T: S.Tauto ? 0 : S.T, roi: S.roi });
    S.mask = r.mask; S.T = r.T;
    if (S.Tauto) { $o('#fpT').value = S.T; $o('#fpTO').textContent = S.T + ' px · auto'; }
    for (const st of S.strokes) applyStroke(st);
    if (!S.sc) S.sc = .12 / Math.max(2, S.T);
    rebuild();
  }
  function applyStroke(st) {
    const v = st.mode === 'paint' ? 1 : 0, r = st.r;
    for (const [px, py] of st.pts) for (let y = Math.max(0, py - r); y <= Math.min(S.h - 1, py + r); y++) for (let x = Math.max(0, px - r); x <= Math.min(S.w - 1, px + r); x++) if ((x - px) ** 2 + (y - py) ** 2 <= r * r) S.mask[y * S.w + x] = v;
  }
  function rebuild() {
    S.rects = fpRects(S.mask, S.w, S.h, S.T);
    const b = fpBBox(S.rects);
    $o('#fpOk').disabled = !S.rects.length;
    if (b && S.sc) { $o('#fpWm').value = (b.w * S.sc).toFixed(2); $o('#fpDims').textContent = `Muros detectados: ${(b.w * S.sc).toFixed(2)} × ${(b.h * S.sc).toFixed(2)} m · ${S.rects.length} tramos`; }
    else $o('#fpDims').textContent = S.img ? 'No se detectaron muros: baja o sube la sensibilidad, o recorta el plano.' : '';
  }
  let DS = 1;
  function sizeCanvas() {
    const wrap = $o('#fpWrap'), maxW = wrap.clientWidth || 600, maxH = Math.max(260, innerHeight * .62);
    DS = Math.min(maxW / S.w, maxH / S.h);
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.style.width = Math.round(S.w * DS) + 'px'; cv.style.height = Math.round(S.h * DS) + 'px';
    cv.width = Math.round(S.w * DS * dpr); cv.height = Math.round(S.h * DS * dpr);
  }
  function draw() {
    if (!S.img) return;
    const k = cv.width / S.w;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, S.w, S.h);
    ctx.globalAlpha = .55; ctx.drawImage(S.img, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(214,52,58,.72)';
    for (const [x, y, w, h] of S.rects) ctx.fillRect(x, y, w, h);
    const b = fpBBox(S.rects);
    if (b) { ctx.strokeStyle = 'rgba(44,71,207,.8)'; ctx.lineWidth = 1.5 / k * 1.4; ctx.setLineDash([6 / k, 4 / k]); ctx.strokeRect(b.x0, b.y0, b.w, b.h); ctx.setLineDash([]); }
    if (S.roi) { ctx.strokeStyle = '#111'; ctx.lineWidth = 2 / k; ctx.setLineDash([8 / k, 5 / k]); ctx.strokeRect(...S.roi); ctx.setLineDash([]); }
    if (S.meas) {
      const [a, c2] = [S.meas.a, S.meas.b];
      ctx.strokeStyle = '#2C47CF'; ctx.lineWidth = 3 / k; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...c2); ctx.stroke();
      ctx.fillStyle = '#2C47CF'; for (const p of [a, c2]) { ctx.beginPath(); ctx.arc(p[0], p[1], 5 / k, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  const pos = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * S.w), Math.round((e.clientY - r.top) / r.height * S.h)]; };
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    if (!S.img || S.mode === 'none') return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const p = pos(e);
    if (S.mode === 'crop') drag = { a: p };
    if (S.mode === 'measure') { S.meas = { a: p, b: p }; drag = { m: true }; }
    if (S.mode === 'paint' || S.mode === 'erase') { const st = { mode: S.mode, r: Math.round(+$o('#fpB').value / 2), pts: [p] }; S.strokes.push(st); applyStroke(st); drag = { st }; rebuild(); draw(); }
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const p = pos(e);
    if (drag.a) { const x = Math.min(drag.a[0], p[0]), y = Math.min(drag.a[1], p[1]); S.roi = [clamp(x, 0, S.w), clamp(y, 0, S.h), Math.abs(p[0] - drag.a[0]), Math.abs(p[1] - drag.a[1])]; draw(); }
    if (drag.m) { S.meas.b = p; draw(); }
    if (drag.st) { const last = drag.st.pts[drag.st.pts.length - 1]; const n = Math.ceil(Math.hypot(p[0] - last[0], p[1] - last[1]) / Math.max(1, drag.st.r / 2)); for (let i = 1; i <= n; i++) drag.st.pts.push([Math.round(last[0] + (p[0] - last[0]) * i / n), Math.round(last[1] + (p[1] - last[1]) * i / n)]); applyStroke({ ...drag.st, pts: drag.st.pts.slice(-n) }); rebuild(); draw(); }
  });
  const up = () => {
    if (!drag) return;
    if (drag.a) { if (S.roi && (S.roi[2] < 20 || S.roi[3] < 20)) S.roi = null; S.strokes = []; detect(); draw(); }
    if (drag.m) { const d = Math.hypot(S.meas.b[0] - S.meas.a[0], S.meas.b[1] - S.meas.a[1]); if (d < 8) S.meas = null; else { $o('#fpMeasRow').hidden = false; $o('#fpMm').focus(); } draw(); }
    drag = null;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  ov.querySelector('.fpi-tools').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (!b) return; S.mode = b.dataset.mode; ov.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', x === b)); cv.style.cursor = S.mode === 'none' ? 'default' : 'crosshair'; hint(); });
  $o('#fpThr').addEventListener('input', e => { S.thr = +e.target.value; $o('#fpThrO').textContent = S.thr; });
  $o('#fpThr').addEventListener('change', () => { detect(); draw(); });
  $o('#fpT').addEventListener('input', e => { S.T = +e.target.value; S.Tauto = false; $o('#fpTO').textContent = S.T + ' px'; });
  $o('#fpT').addEventListener('change', () => { detect(); draw(); });
  $o('#fpB').addEventListener('input', e => { $o('#fpBO').textContent = e.target.value + ' px'; });
  $o('#fpH').addEventListener('input', e => { S.wallH = +e.target.value; $o('#fpHO').textContent = S.wallH.toFixed(2) + ' m'; });
  $o('#fpWm').addEventListener('change', e => { const b = fpBBox(S.rects), m = num(e.target.value); if (b && m > 0) { S.sc = m / b.w; rebuild(); } });
  $o('#fpMm').addEventListener('change', e => { const m = num(e.target.value); if (S.meas && m > 0) { S.sc = m / Math.hypot(S.meas.b[0] - S.meas.a[0], S.meas.b[1] - S.meas.a[1]); rebuild(); toast('Escala calibrada con la cota.'); } });
  const pickFile = () => { const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*'; fi.onchange = () => load(fi.files[0]); fi.click(); };
  $o('#fpPick').onclick = pickFile;
  const wrap = $o('#fpWrap');
  wrap.addEventListener('dragover', e => { e.preventDefault(); });
  wrap.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) load(f); });
  const onPaste = e => { const it = [...(e.clipboardData || {}).items || []].find(i => /^image\//.test(i.type)); if (it) load(it.getAsFile()); };
  addEventListener('paste', onPaste);
  $o('#fpOk').onclick = () => {
    if (!S.rects.length) return;
    const b = fpBBox(S.rects), pad = Math.round(S.T * 4);
    let x0 = Math.max(0, b.x0 - pad), y0 = Math.max(0, b.y0 - pad), x1 = Math.min(S.w, b.x1 + pad), y1 = Math.min(S.h, b.y1 + pad);
    if (S.roi) { x0 = Math.max(x0, S.roi[0]); y0 = Math.max(y0, S.roi[1]); x1 = Math.min(x1, S.roi[0] + S.roi[2]); y1 = Math.min(y1, S.roi[1] + S.roi[3]); }
    const c = document.createElement('canvas'); c.width = x1 - x0; c.height = y1 - y0;
    c.getContext('2d').drawImage(S.img, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    const id = 'pl' + uid();
    const pl = { id, name: $o('#fpName').value.trim() || 'Plano', v: Date.now(), img: imgUrl(c, { fixed: true }), w: c.width, h: c.height, sc: round2(S.sc * 1e4) / 1e4, wallH: S.wallH, rects: S.rects.map(([x, y, w, h]) => [x - x0, y - y0, w, h]) };
    P.plans = P.plans || {};
    P.plans[id] = pl;
    const applyLoc = !!($o('#fpLoc') && $o('#fpLoc').checked);
    if (applyLoc && opts.loc) { P.locPlans = P.locPlans || {}; P.locPlans[opts.loc] = id; }
    close();
    done(id, applyLoc);
  };
  addEventListener('resize', () => { if (ov.isConnected && S.img) { sizeCanvas(); draw(); } });
  if (opts.file) load(opts.file);
}
/* imagen del plano cargada (para el piso 3D y la planta) */
const PLAN_IMG = new Map();
function planPic(pl, cb) {
  let im = PLAN_IMG.get(pl.id);
  if (!im || im._v !== pl.v) {
    im = new Image(); im._v = pl.v; im._cbs = [];
    im.onload = () => { (im._cbs || []).forEach(f => f()); im._cbs = []; if (UI.tab === 'board' || UI.tab === 'animatic') lateRender(); };
    im.src = imgDataOk(pl.img); PLAN_IMG.set(pl.id, im);
  }
  if (im.complete && im.naturalWidth) return im;
  if (cb) im._cbs.push(cb);
  return null;
}
function preloadPlans() {
  return Promise.all([...Object.values(P.plans || {}).map(pl => new Promise(res => { const im = planPic(pl, res); if (im) res(); setTimeout(res, 3000); })), typeof set3dPreload === 'function' ? set3dPreload() : null]);
}

/* muros del plano en metros: [x0, z0, x1, z1] */
const PLAN_RW = new Map();
function planRectsWorld(pl) {
  const c = PLAN_RW.get(pl.id);
  if (c && c.v === pl.v && c.e === (pl.esc || 1)) return c.r;
  const W = planWorld(pl);
  const r = pl.rects.map(([x, y, w, h]) => [W.x(x), W.z(y), W.x(x + w), W.z(y + h)]);
  PLAN_RW.set(pl.id, { v: pl.v, e: pl.esc || 1, r });
  return r;
}
/* primer cruce (0..1) del segmento a→b con un rectángulo, o null */
function segRect(ax, az, bx, bz, r) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  for (const [p, q] of [[-dx, ax - r[0]], [dx, r[2] - ax], [-dz, az - r[1]], [dz, r[3] - az]]) {
    if (Math.abs(p) < 1e-9) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  return t0;
}
/* las dos hileras de edificios de la calle (las mismas que dibuja s3d-render) */
const CALLE_BLOCKS = [[-200, 8.5, 200, 14.5], [-200, -17.5, 200, -11.5]];
/* si un muro (o un edificio de la calle) queda entre la cámara y su figura, la cámara pasa al lado de la
   figura y el lente compensa. En un movimiento, todas las claves se acercan en la misma proporción, así
   un dolly sigue siendo un dolly, y la cámara conserva lo que el movimiento gira (tilt, paneo). */
function s3CamInside(s3) {
  const pl = planOf(s3);
  // lote W · la calle a la escala de su locación (escenarios-escala.js)
  const R = pl ? planRectsWorld(pl) : s3 && s3.set === 'calle' ? (k => k === 1 ? CALLE_BLOCKS : CALLE_BLOCKS.map(r => r.map(v => v * k)))(typeof envEscOf === 'function' ? envEscOf(s3) : 1) : null;
  if (!R) return 0;
  const inR = (x, z, r) => x > r[0] && x < r[2] && z > r[1] && z < r[3];
  const look = [];
  let k0 = 1;
  for (const k of s3.keys) {
    const tg = s3Target(s3, k), c = k.cam;
    const dx = c.x - tg.x, dz = c.z - tg.z, d = Math.hypot(dx, dz) || 1;
    let tmin = 1;
    // un muro que encierra a la figura no se puede esquivar: no cuenta
    for (const r of R) { if (inR(tg.x, tg.z, r)) continue; const t = segRect(tg.x, tg.z, c.x, c.z, r); if (t != null && t < tmin) tmin = t; }
    look.push({ k, tg, dx, dz, d });
    if (tmin < 1) k0 = Math.min(k0, Math.max(.6, tmin * d - .35) / d);
  }
  if (k0 >= 1) return 0;
  // la cámara avanza por la línea que la une con su figura: el rumbo no cambia; la inclinación se corrige
  // para seguir mirando a la misma altura de la figura, más lo que el movimiento ya inclinaba
  for (const { k, tg, dx, dz, d } of look) {
    const c = k.cam, nd = Math.max(d * k0, Math.min(d, .6)), ty = (tg.y || 1.5) * (s3.aimF || 1) + (tg.lift || 0);
    const pitch0 = deg(Math.atan2(ty - c.h, d));
    c.x = round2(tg.x + dx / d * nd); c.z = round2(tg.z + dz / d * nd);
    c.lens = Math.round(clamp(c.lens * nd / d, 12, 400));
    c.pitch = round2(deg(Math.atan2(ty - c.h, nd)) + (c.pitch - pitch0));
  }
  return s3.keys.length;
}
