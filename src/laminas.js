/* ============================================================
   LÁMINAS DEL DESGLOSE — fotos de los elementos etiquetados
   Cada caja de la hoja de desglose (reparto, vestuario, atrezzo…) abre una
   hoja A4 donde su área sube fotos JPG, PNG o WebP de cada elemento, con una nota.
   Las fotos se guardan en WebP de unos 170 kB (imagenes.js: lado mayor de hasta 1600 px y la mejor calidad que
   entra). Se imprimen con o sin fotos.
   Datos: elemento.ref = { ph: [{ id, w, h }], note }; imagen en FRAMES['bd~<elemento>~<foto>'].
   ============================================================ */
const phKey = (elId, pid) => `bd~${elId}~${pid}`;
const refOf = e => (e && e.ref) || {};
const photosOf = e => (refOf(e).ph || []).filter(x => frameHas(phKey(e.id, x.id)));
const kb = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' kB';
const lamEditable = box => !UI.readOnly && (typeof canEditArea !== 'function' || canEditArea(box));
const CAM_SVG = '<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 5.2h2.6l1.2-1.8h4.4l1.2 1.8H14v7.6H2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><circle cx="8" cy="8.9" r="2.3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
/* una foto subida (desglose, scouting, casting, hoja de llamado, gastos) → WebP de unos 170 kB (imagenes.js);
   un PNG transparente queda sobre blanco, como en el papel */
async function compressPhoto(file) {
  const r = imgEncode(await imgCanvas(file, { max: IMG_MAX }));
  return { ...r, before: file.size, after: imgBytes(r.url) };
}
/* ---------- fotos que se ven al instante ----------
   Antes cada foto se subía y recién entonces aparecía (una por una: con diez fotos y poca señal, un buen rato sin ver
   nada). Ahora cada una aparece apenas se comprime y se sube detrás, de a dos. Si el servidor no la acepta (plan,
   espacio, permisos) se quita y se avisa una vez. Cambiar de proyecto espera a que terminen (settleSave) y cerrar la
   pestaña avisa si falta alguna (unsavedWork). Los demás del equipo la ven cuando termina de subir (frameHas).
   Con el servidor, cada foto queda también en la cola sin conexión de este equipo (OFFLINE.putFrame) hasta que el
   servidor la confirma: si la pestaña se cierra o el teléfono la mata a mitad de la subida, se sube al volver a abrir
   la app (share-api.js · OFFLINE.flushFrames). Borrar una foto que todavía sube la saca de la cola o la borra al
   terminar de subir (photoCancel). */
const PHOTO_UP = new Set();
const PHOTO_PEND = new Map();   // clave en FRAMES → la subida pendiente ({ cancel })
const photoErrText = err => err && err.code === 'quota_exceeded' ? 'se llenó el espacio de la página.' : /quota/i.test(String(err && err.name)) ? 'no queda espacio en este navegador.'
  : err && err.message && err.code !== 'offline' ? err.message : 'inténtalo de nuevo.';
/* se borró una foto que todavía no termina de subir: true si estaba pendiente (photosAdd la borra en el servidor) */
function photoCancel(k) { const it = PHOTO_PEND.get(k); if (!it) return false; it.cancel = true; return true; }
/* o: { keyOf(id) → clave en FRAMES, add({ id, w, h }) y drop(id) en los datos, paint() para volver a pintar }.
   Devuelve cuántas se agregaron (las subidas siguen en PHOTO_UP) */
async function photosAdd(files, o) {
  if (!proGate('photos')) return { n: 0 };
  const list = [...files].filter(f => /^image\/(jpeg|png|webp)$/.test(f.type));
  if (!list.length) { toast('Elige fotos JPG, PNG o WebP.'); return { n: 0 }; }
  const Px = P, queue = [];
  let before = 0, after = 0, n = 0, stop = false, bad = 0, why = '', running = 0, feeding = true, wake = null;
  // con el servidor: la foto espera en la cola sin conexión hasta que el servidor la confirma
  const keep = () => Store.kind === 'api' && Px._shared && typeof OFFLINE !== 'undefined';
  const put = (k, url) => P === Px ? Store.saveFrame(Px.id, k, url) : Store.kind === 'api' ? APITEAM.saveFrame(Px.id, k, url) : Store.saveFrame(Px.id, k, url);
  const fail = (k, id) => {
    bad++; delete FRAMES[k]; if (typeof IMGS !== 'undefined') IMGS.delete(k);
    try { o.drop(id); } catch (e) { }
    if (P === Px) { changed('data'); if (o.paint) o.paint(); }
  };
  const send = async it => {
    const kept = keep(), qid = Px.id + '|' + it.k;
    try {
      if (kept) await OFFLINE.putFrame(Px.id, it.k, it.url);
      // el proyecto ya no es el abierto (se recargó o se abrió otro sin pasar por settleSave): se sube a su proyecto
      await put(it.k, it.url);
      if (kept && !OFFLINE.on) await OFFLINE.dropFrame(qid);     // sin conexión, la cola la sube después
    } catch (err) {
      if (kept) OFFLINE.dropFrame(qid);
      if (it.cancel) return;
      if (!why) why = photoErrText(err);
      // sin plan, sin espacio o sin permiso: las que faltan tampoco van a entrar
      if (err && (/quota/i.test(String(err.code || err.name)) || /^(plan_photos|no_area|no_edit|read_only|no_access)$/.test(String(err.code || '')))) stop = true;
      fail(it.k, it.id);
    } finally {
      PHOTO_PEND.delete(it.k);
      // la borraron mientras subía: ahora sí se borra en el servidor
      if (it.cancel) put(it.k, null).catch(() => { });
    }
  };
  const done = () => { if (!feeding && !running && !queue.length) wake(); };
  const pump = () => {
    while (running < 2 && queue.length) {
      const it = queue.shift();
      if (it.cancel) { PHOTO_PEND.delete(it.k); continue; }     // la borraron antes de empezar a subir
      if (stop) { PHOTO_PEND.delete(it.k); fail(it.k, it.id); continue; }
      running++;
      send(it).catch(e => console.warn('fotos:', e)).finally(() => { running--; pump(); done(); });
    }
  };
  const all = new Promise(res => { wake = res; });
  PHOTO_UP.add(all);
  all.then(() => {
    PHOTO_UP.delete(all);
    if (bad) toast(`${bad === n ? (n === 1 ? 'No se pudo guardar la foto' : 'No se pudieron guardar las fotos') : `${bad} de ${n} fotos no se pudieron guardar`}: ${why}`, 5200);
  });
  try {
    for (const f of list) {
      let r;
      try { r = await compressPhoto(f); } catch (err) { toast('No se pudo leer ' + f.name + '.'); continue; }
      if (P !== Px || stop) break;
      const id = uid('f'), k = o.keyOf(id);
      if (o.add({ id, w: r.w, h: r.h }) === false) continue;     // el elemento ya no está
      FRAMES[k] = r.url;
      before += r.before; after += r.after; n++;
      const it = { k, id, url: r.url, cancel: false };
      PHOTO_PEND.set(k, it); queue.push(it); pump();
      changed('data'); if (o.paint) o.paint();
    }
  } finally {
    feeding = false; done();
  }
  return { n, before, after };
}
async function addPhotos(e, files, paint) {
  const eid = e.id, Px = P;
  // el proyecto abierto (si se recargó con los cambios del equipo, P es otro objeto con el mismo id)
  const live = () => P && P.id === Px.id ? P : Px;
  const r = await photosAdd(files, {
    keyOf: id => phKey(eid, id), paint,
    add: x => { const el = live().elements[eid]; if (!el) return false; el.ref = { ...refOf(el), ph: [...(refOf(el).ph || []), x] }; },
    drop: id => { const el = live().elements[eid]; if (el) el.ref = { ...refOf(el), ph: (refOf(el).ph || []).filter(p => p.id !== id) }; },
  });
  if (r.n) toast(`${r.n} ${r.n === 1 ? 'foto agregada' : 'fotos agregadas'} · ${kb(r.before)} → ${kb(r.after)}`, 3600);
  return r.n;
}
function delPhoto(e, pid) {
  const k = phKey(e.id, pid);
  histNote('Quitar una foto', FRAMES[k] ? { [k]: FRAMES[k] } : null, 'breakdown');
  delete FRAMES[k];
  // si todavía se está subiendo, photosAdd la borra en el servidor al terminar (photoCancel)
  if (!photoCancel(k)) Store.saveFrame(P.id, k, null).catch(() => { });
  e.ref = { ...refOf(e), ph: (refOf(e).ph || []).filter(x => x.id !== pid) };
  changed('data');
}
/* el PDF no acepta WebP: antes de exportar se hace una copia JPEG de cada foto (se guarda mientras dure la sesión) */
const PH_JPG = new Map();
const photoForPdf = k => { const u = FRAMES[k] || ''; const c = PH_JPG.get(k); return c && c.src === u ? c.jpg : u; };
async function preparePhotosForPdf() {
  const keys = Object.keys(FRAMES).filter(k => /^(bd|lc|ca|cl)~/.test(k) && /^data:image\/webp/.test(FRAMES[k]) && !(PH_JPG.get(k) && PH_JPG.get(k).src === FRAMES[k]));
  for (const k of keys) {
    const src = FRAMES[k];
    const jpg = await new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0); res(c.toDataURL('image/jpeg', .9)); }; im.onerror = () => res(src); im.src = src; });
    PH_JPG.set(k, { src, jpg });
  }
}
/* ---------- la lámina: una hoja A4 por caja y escena ---------- */
async function openLamina(box, si) {
  await ensureFrames('index');
  const s = D.sc.scenes[si], B = SHEET.find(b => b.id === box);
  if (!s || !B) return;
  // solo las fotos de esta caja en esta escena
  await framesNeed(sheetData(s).box[box].flatMap(e => (refOf(e).ph || []).map(p => phKey(e.id, p.id))));
  const ed = lamEditable(box);
  const m = modal({
    title: `Lámina · ${B.name}`, wide: true,
    body: `<div class="lam-wrap"><div class="a4 lam" id="lamPage"></div></div>`,
    foot: `<span class="hint lam-foot">${ed ? 'JPG, PNG o WebP. Se guardan en WebP de 1200 px, unos 175 kB cada una.' : 'Solo lectura.'}</span>
      <button class="btn" id="lamNo">PDF sin fotos</button><button class="btn" id="lamYes">PDF con fotos</button><button class="btn primary" data-close>Listo</button>`,
  });
  m.querySelector('.dlg').classList.add('lam-dlg');
  const paint = () => {
    const els = sheetData(s).box[box];
    $('#lamPage', m).innerHTML = `<header class="lam-h" style="--bg:${ea(B.color)}"><div><b>${esc(B.name)}</b><span>${esc(P.meta.title)}</span></div><div class="lam-sc">Escena ${esc(s.key)}<span>${esc(s.heading)}</span></div></header>
      ${els.length ? `<div class="lam-grid">${els.map((e, i) => {
        const ph = photosOf(e);
        return `<article class="lam-el" data-el="${ea(e.id)}"><div class="lam-n"><b>${box === 'cast' && D.castNum[e.id] ? D.castNum[e.id] : i + 1}. ${esc(itemLabel(e))}</b>${ed ? (planAllows('photos') ? `<label class="btn sm lam-add">${CAM_SVG} Fotos<input type="file" class="file-in" accept="image/jpeg,image/png,image/webp" multiple data-up="${ea(e.id)}" aria-label="Agregar fotos de ${ea(itemLabel(e))}"></label>` : `<button type="button" class="btn sm lam-add" data-pro="photos">${CAM_SVG} Fotos <i class="pro-chip">PRO</i></button>`) : ''}</div>
          <div class="lam-ph${ea(ph.length ? '' : ' empty')}">${ph.map(p => `<figure><img src="${ea(FRAMES[phKey(e.id, p.id)])}" alt="${esc(e.name)}" data-big="${ea(e.id)}|${ea(p.id)}">${ed ? `<button class="lam-x" data-del="${ea(e.id)}|${ea(p.id)}" aria-label="Quitar foto">${ICO.close}</button>` : ''}</figure>`).join('') || `<span class="hint">${ed ? 'Sin fotos: usa «Fotos» o arrastra imágenes aquí.' : 'Sin fotos.'}</span>`}</div>
          <textarea rows="2" data-note="${ea(e.id)}" placeholder="${ea(ed ? 'Talla, color, marca, dónde se consigue…' : '')}" ${ed ? '' : 'readonly'} aria-label="Nota de ${esc(e.name)}">${esc(refOf(e).note || '')}</textarea></article>`;
      }).join('')}</div>` : '<p class="hint">Esta caja no tiene elementos en la escena.</p>'}`;
  };
  paint();
  // cada foto aparece apenas se comprime (se sube detrás: laminas.js · photosAdd)
  const up = async (id, files) => { const e = P.elements[id]; if (!e) return; const n = await addPhotos(e, files, () => { if (m.isConnected) paint(); render(); }); if (n && m.isConnected) paint(); };
  m.addEventListener('change', ev => { const f = ev.target.closest('[data-up]'); if (f && f.files.length) up(f.dataset.up, f.files); });
  m.addEventListener('input', ev => {
    const t = ev.target.closest('[data-note]'); if (!t || !ed) return;
    const e = P.elements[t.dataset.note]; if (!e) return;
    e.ref = { ...refOf(e) }; if (t.value.trim()) e.ref.note = t.value; else delete e.ref.note;
    changed('data');
  });
  m.addEventListener('click', ev => {
    const pr = ev.target.closest('[data-pro]'); if (pr) { proGate(pr.dataset.pro); return; }
    const d = ev.target.closest('[data-del]');
    if (d) { const [id, pid] = d.dataset.del.split('|'); const e = P.elements[id]; if (e) { delPhoto(e, pid); paint(); render(); toastUndo('Foto quitada.'); } return; }
    const big = ev.target.closest('[data-big]');
    if (big) { const [id, pid] = big.dataset.big.split('|'), e = P.elements[id], ks = e ? photosOf(e).map(x => phKey(id, x.id)) : [phKey(id, pid)]; photoViewer(ks, e ? e.name : '', { at: ks.indexOf(phKey(id, pid)) }); }
  });
  // arrastrar fotos sobre un elemento
  m.addEventListener('dragover', ev => { const a = ev.target.closest('.lam-el'); if (a && ed) { ev.preventDefault(); a.classList.add('drop'); } });
  m.addEventListener('dragleave', ev => { const a = ev.target.closest('.lam-el'); if (a) a.classList.remove('drop'); });
  m.addEventListener('drop', ev => { const a = ev.target.closest('.lam-el'); if (!a || !ed) return; ev.preventDefault(); a.classList.remove('drop'); if (ev.dataTransfer.files.length) up(a.dataset.el, ev.dataTransfer.files); });
  $('#lamNo', m).onclick = e => exportPDF('lamina', e.currentTarget, { box, si, photos: false });
  $('#lamYes', m).onclick = e => exportPDF('lamina', e.currentTarget, { box, si, photos: true });
}
/* una foto en grande. Con varias (las de la misma tarjeta: src es la lista de sus claves en FRAMES y at, la que se
   tocó), ‹ › a los costados, las flechas del teclado y deslizar con el dedo pasan a la anterior o la siguiente (de la
   última se vuelve a la primera). Las que todavía no llegaron se piden. Esc, ✕ o un toque fuera de los botones cierra */
const PHV_IC = { prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5.5-6.5 6.5 6.5 6.5"/></svg>', next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5.5 6.5 6.5-6.5 6.5"/></svg>' };
function photoViewer(src, name, opt = {}) {
  const keys = Array.isArray(src) ? src.filter(k => k && (FRAMES[k] || frameHas(k))) : null;
  if (keys ? !keys.length : !src) return;
  const n = keys ? keys.length : 1;
  let i = keys ? Math.max(0, Math.min(n - 1, opt.at || 0)) : 0;
  const ov = document.createElement('div');
  ov.className = 'ph-view' + (n > 1 ? ' many' : '');
  ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', name || 'Foto'); ov.tabIndex = -1;
  ov.innerHTML = `<img alt=""><span class="ph-wait" hidden aria-hidden="true"></span><button class="btn ghost ph-x" aria-label="Cerrar">${ICO.close}</button>`
    + (n > 1 ? `<button class="ph-nav prev" data-d="-1" aria-label="Foto anterior" title="Anterior (←)">${PHV_IC.prev}</button><button class="ph-nav next" data-d="1" aria-label="Foto siguiente" title="Siguiente (→)">${PHV_IC.next}</button><span class="ph-n" aria-live="polite"></span>` : '');
  const img = ov.querySelector('img'), wait = ov.querySelector('.ph-wait'), cnt = ov.querySelector('.ph-n');
  const need = k => { if (k && !FRAMES[k] && frameHas(k)) return framesNeed([k]); return null; };
  function show() {
    const k = keys && keys[i], url = keys ? FRAMES[k] : src;
    img.hidden = !url; wait.hidden = !!url;
    if (url) img.src = url;
    else { const p = need(k); if (p) p.then(() => { if (ov.isConnected && keys[i] === k) show(); }); }
    img.alt = (name || 'Foto') + (n > 1 ? ` · ${i + 1} de ${n}` : '');
    if (cnt) cnt.textContent = `${i + 1} de ${n}`;
    // las de al lado, ya pedidas (pasar no espera)
    if (n > 1) for (const d of [-1, 1]) need(keys[(i + d + n) % n]);
  }
  const go = d => { if (n < 2) return; i = (i + d + n) % n; show(); };
  const back = document.activeElement;
  const close = () => { ov.remove(); removeEventListener('keydown', onK, true); if (back && back.isConnected && back.focus) try { back.focus({ preventScroll: true }); } catch (e) { } };
  const onK = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if (n > 1 && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); e.stopImmediatePropagation(); go(e.key === 'ArrowLeft' ? -1 : 1); }
  };
  addEventListener('keydown', onK, true);
  // con el dedo: deslizar a un lado pasa de foto (y no cierra)
  let sw = null, swiped = false;
  ov.addEventListener('pointerdown', e => { sw = e.pointerType === 'mouse' ? null : [e.clientX, e.clientY]; swiped = false; });
  ov.addEventListener('pointerup', e => {
    if (!sw) return; const dx = e.clientX - sw[0], dy = e.clientY - sw[1]; sw = null;
    if (n > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { swiped = true; go(dx < 0 ? 1 : -1); }
  });
  ov.addEventListener('click', e => {
    const b = e.target.closest('.ph-nav'); if (b) { e.stopPropagation(); go(+b.dataset.d); return; }
    if (swiped) { swiped = false; return; }
    close();
  });
  document.body.appendChild(ov);
  show();
  ov.focus({ preventScroll: true });
}
/* ---------- PDF: lámina A4 con o sin fotos ---------- */
/* entries: [{ e, label, scenes }]; dibuja desde «y» y agrega páginas A4 cuando hace falta */
function drawLamina(doc, title, sub, entries, photos) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;
  let y = docHeader(doc, title, sub);
  if (!entries.length) { doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text('Sin elementos.', M, y + 10); return; }
  if (!photos) {
    doc.autoTable({ ...TBL, startY: y, margin: { left: M, right: M, bottom: 40 }, head: [['#', 'Elemento', 'Nota', 'Escenas']],
      body: entries.map((x, i) => [String(x.num || i + 1), { content: pdfSafe(x.label), styles: { fontStyle: 'bold' } }, pdfSafe(refOf(x.e).note || ''), pdfSafe(x.scenes || '')]),
      columnStyles: { 0: { cellWidth: 24 }, 1: { cellWidth: 150 }, 3: { cellWidth: 90 } } });
    return;
  }
  const cols = 3, gap = 10, bw = (W - M * 2 - gap * (cols - 1)) / cols, bh = bw * .75;
  entries.forEach((x, i) => {
    const ph = photosOf(x.e), note = refOf(x.e).note || '';
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    const noteL = note ? doc.splitTextToSize(pdfSafe(note), W - M * 2) : [];
    const rows = Math.ceil(ph.length / cols);
    const need = 18 + noteL.length * 10 + (rows ? rows * (bh + gap) : 14) + 10;
    if (y + Math.min(need, 18 + bh + gap + 24) > H - 40) { doc.addPage('a4', 'portrait'); y = docHeader(doc, title, sub); }
    doc.setFont('title', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK);
    doc.text(pdfSafe(`${x.num || i + 1}. ${x.label}`), M, y + 10);
    if (x.scenes) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(pdfSafe('Escenas ' + x.scenes), W - M, y + 10, { align: 'right' }); }
    y += 16;
    if (noteL.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK); doc.text(noteL, M, y + 6); y += noteL.length * 8.5 * doc.getLineHeightFactor() + 2; }
    if (!ph.length) { doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text('Sin fotos.', M, y + 8); y += 14; }
    ph.forEach((p, j) => {
      const c = j % cols;
      if (c === 0 && j) y += bh + gap;
      if (c === 0 && y + bh > H - 40) { doc.addPage('a4', 'portrait'); y = docHeader(doc, title, sub); }
      const url = photoForPdf(phKey(x.e.id, p.id));
      let w = p.w || 4, h = p.h || 3;
      try { if (!p.w) { const pr = doc.getImageProperties(url); w = pr.width; h = pr.height; } } catch (e) { }
      const k = Math.min(bw / w, bh / h), iw = w * k, ih = h * k, x0 = M + c * (bw + gap);
      doc.setFillColor(...PT.soft); doc.rect(x0, y, bw, bh, 'F');
      try { doc.addImage(url, 'JPEG', x0 + (bw - iw) / 2, y + (bh - ih) / 2, iw, ih, undefined, 'FAST'); } catch (e) { if (typeof PDF_MISS !== 'undefined') PDF_MISS++; }
      doc.setDrawColor(...PT.line); doc.setLineWidth(.5); doc.rect(x0, y, bw, bh);
    });
    if (ph.length) y += bh + gap;
    y += 6;
    doc.setDrawColor(...PT.line); doc.setLineWidth(.5); doc.line(M, y - 4, W - M, y - 4);
  });
}
function sceneEntries(s, boxes) {
  const d = sheetData(s);
  return boxes.flatMap(b => d.box[b].map((e, i) => ({ e, num: b === 'cast' && D.castNum[e.id] ? D.castNum[e.id] : i + 1, label: itemLabel(e), box: b })));
}
function pdfLamina(opts = {}) {
  const doc = newDoc('portrait', 'a4');
  const B = SHEET.find(b => b.id === opts.box);
  if (opts.si != null) {
    const s = D.sc.scenes[opts.si];
    drawLamina(doc, `Lámina · ${B.name}`, `Escena ${s.key} · ${s.heading}`, sceneEntries(s, [opts.box]), opts.photos);
    pageNumbers(doc, 'Lámina');
    return { doc, name: fileSafe(P.meta.title) + `_lamina_${fileSafe(B.name)}_esc${s.key}${opts.photos ? '' : '_sin_fotos'}.pdf` };
  }
  // toda un área: cada elemento una vez, con sus escenas
  const scenesOf = {};
  D.sem.forEach((set, si) => set.forEach(id => { (scenesOf[id] = scenesOf[id] || []).push(D.sc.scenes[si].key); }));
  const list = Object.values(P.elements).filter(e => B.cats.includes(e.cat) && (scenesOf[e.id] || []).length)
    .sort((a, b) => opts.box === 'cast' ? (D.castNum[a.id] || 99) - (D.castNum[b.id] || 99) : a.name.localeCompare(b.name));
  drawLamina(doc, `Lámina · ${B.name}`, `${list.length} elementos`, list.map((e, i) => ({ e, num: opts.box === 'cast' && D.castNum[e.id] ? D.castNum[e.id] : i + 1, label: itemLabel(e), scenes: scenesOf[e.id].join(', ') })), opts.photos);
  pageNumbers(doc, 'Lámina');
  return { doc, name: fileSafe(P.meta.title) + `_lamina_${fileSafe(B.name)}${opts.photos ? '' : '_sin_fotos'}.pdf` };
}
PDFX.lamina = pdfLamina;
/* elegir el área para una lámina completa */
function laminaAreaMenu(btn) {
  const boxes = SHEET.filter(b => b.id !== 'notes');
  const m = modal({
    title: 'Lámina por área',
    body: `<p class="hint" style="margin:0">Todos los elementos del área en el proyecto, con sus notas y las escenas donde aparecen.</p>
      <label class="fld"><span>Área</span><select id="laA">${boxes.map(b => `<option value="${ea(b.id)}">${esc(b.name)}</option>`).join('')}</select></label>
      <label class="opt-in"><input type="checkbox" id="laP" checked> Con fotos</label>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="laOk">Exportar PDF</button>',
  });
  $('#laOk', m).onclick = () => { const box = $('#laA', m).value, photos = $('#laP', m).checked; closeModal(); exportPDF('lamina', btn, { box, photos }); };
}
Object.assign(ACT, {
  'bd-lam': b => openLamina(b.dataset.box, UI.scene),
});
