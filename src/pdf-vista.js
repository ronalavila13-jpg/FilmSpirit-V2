/* ============================================================
   VISTA PREVIA DE LOS PDF (lote AH) · antes de descargar
   Todo PDF (exportPDF en pdf.js, y los de Gastos) se mira antes de que salga: las páginas una debajo de otra (con
   pdf.js, el mismo lector que importa guiones en PDF), cuántas son, el papel (A4 o carta: cambiarlo vuelve a armar el
   documento), Imprimir (directo, sin descargar), Descargar y, en la hoja de llamado, Enviar.
   · Imprimir: las páginas se dibujan en alta resolución en un contenedor que solo se ve al imprimir, una hoja por página
     y sin márgenes (@page del tamaño del papel). Un marco con el PDF no sirve: la política de seguridad de la web y la
     del escritorio no dejan abrir PDF en marcos (frame-src, object-src) y en el celular no hay visor de PDF en marcos.
   · Lo que pasa después de que el archivo sale (la versión de la hoja de llamado) pasa al descargar, enviar o imprimir
     (onOut); si se cierra sin nada de eso, no cuenta como enviada.
   · El papel elegido se recuerda por documento, en las preferencias de este navegador (ls 'pdfPaper').
   ============================================================ */
const PV_ICO = {
  print: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8.5V3.5h10v5"/><rect x="3.5" y="8.5" width="17" height="8" rx="1.5"/><path d="M7 14h10v6.5H7z"/></svg>',
  dl: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/></svg>',
};
/* el papel que la persona eligió la última vez para este documento (null: el de siempre del documento) */
function pdfPaperMem(kind) { const m = ls.get('pdfPaper', null) || {}, v = m[kind]; return v === 'a4' || v === 'letter' ? v : null; }
function pdfPaperSet(kind, p) { const m = ls.get('pdfPaper', null) || {}; m[kind] = p; ls.set('pdfPaper', m); }
/* el nombre de cada documento que no lleva la cabecera en cuadro (las demás dicen el suyo: docHeader · doc._label) */
const PV_NAMES = { screenplay: 'Guion', script: 'Guion rayado', sup: 'Hoja de script', parte: 'Parte diario', call: 'Hoja de llamado', tarjetas: 'Tarjetas para recortar' };
const pvPaperOf = doc => doc._paper === 'a4' ? 'a4' : 'letter';
let PV = null;   // la vista previa abierta: { m, kind, r (el armado a la vista), pdf (pdf.js), … }
/* pdfPreview({ kind, make, first, share, onOut }) → promesa que se cumple al cerrar, con cómo salió el archivo
   ('download' | 'share' | 'print' | null si se cerró sin sacarlo).
   · kind: el documento (para recordar su papel); make(paper): arma el documento con ese papel ('a4' | 'letter') y
     devuelve { doc, name, miss } (miss: imágenes que no entraron) o { err }; puede ser asíncrona
   · first: el primer armado, si ya se hizo (si no, se arma con el papel recordado)
   · share: el botón principal es «Enviar» (el menú de compartir del sistema; si no hay, se descarga)
   · onOut(r, how): lo que pasa cuando el archivo salió, con el armado que salió */
async function pdfPreview({ kind, make, first, share, onOut }) {
  let r = first || await make(pdfPaperMem(kind));
  if (!r || r.err) { if (r && r.err) toast(r.err, r.ms || 4000); return null; }
  let out = null, done;
  const finished = new Promise(res => { done = res; });
  const label = r.doc._label || PV_NAMES[kind] || String(r.name || '').replace(/\.pdf$/, '');
  const seg = p => `<button type="button" data-paper="${p}" aria-pressed="false">${pdfPaperName(p)}</button>`;
  const m = modal({
    title: label, wide: true, keep: true,
    body: `<div class="pv-note" hidden role="status"></div><div class="pv-pages" tabindex="0" aria-label="Páginas del PDF"></div>`,
    foot: `<div class="left"><div class="seg pv-paper" role="group" aria-label="Papel">${seg('a4')}${seg('letter')}</div></div>
      <button class="btn" data-pv="print" title="Imprimir sin descargar">${PV_ICO.print}<span>Imprimir</span></button>
      ${share ? `<button class="btn" data-pv="dl">${PV_ICO.dl}<span>Descargar</span></button><button class="btn primary" data-pv="share">${ICO.share}<span>Enviar</span></button>`
        : `<button class="btn primary" data-pv="dl">${PV_ICO.dl}<span>Descargar</span></button>`}`,
    onClose: () => { pvClose(); done(out); },
  });
  m.classList.add('pv-modal');
  const h = $('header', m);
  h.querySelector('h2').insertAdjacentHTML('afterend', '<span class="pv-n hint" aria-live="polite"></span>');
  const st = PV = { m, kind, make, r, pdf: null, gen: 0, pages: [], io: null, busy: false };
  const box = $('.pv-pages', m);
  // los botones
  m.addEventListener('click', async e => {
    const p = e.target.closest('[data-paper]');
    if (p && p.getAttribute('aria-pressed') !== 'true' && !st.busy) { pdfPaperSet(kind, p.dataset.paper); await pvRemake(st, p.dataset.paper); return; }
    const b = e.target.closest('[data-pv]'); if (!b || st.busy) return;
    const how = b.dataset.pv;
    if (how === 'print') { if (await pvPrint(st)) { out = out || 'print'; if (onOut) onOut(st.r, 'print'); } return; }
    const blob = st.r.doc.output('blob');
    let sent = null;
    if (how === 'share' && typeof navigator !== 'undefined' && navigator.canShare && typeof File === 'function') {
      try {
        const f = new File([blob], trFile(st.r.name), { type: 'application/pdf' });
        if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: pdfSafe(P.meta.title) }); sent = true; }
      } catch (er) { if (er && er.name === 'AbortError') sent = false; }
    }
    if (sent == null) sent = await offerFile(st.r.name, blob);
    if (sent === true) { out = how === 'share' ? 'share' : 'download'; if (onOut) onOut(st.r, out); if (m.isConnected) closeModal(); }
  });
  // Ctrl/Cmd + P: imprime el PDF (no la pantalla)
  m.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); e.stopPropagation(); $('[data-pv="print"]', m).click(); } });
  // al cambiar el ancho (girar el celular, agrandar la ventana) se vuelven a dibujar las páginas a la vista
  let rt = 0;
  st.onResize = () => { clearTimeout(rt); rt = setTimeout(() => { st.pages.forEach(pg => { pg.w = 0; }); pvVisible(st); }, 250); };
  addEventListener('resize', st.onResize);
  await pvShow(st);
  return finished;
}
/* vuelve a armar el documento con otro papel y lo muestra */
async function pvRemake(st, paper) {
  st.busy = true; st.m.classList.add('pv-busy');
  await new Promise(res => setTimeout(res, 40));   // que se vea que está trabajando antes de armar
  try {
    const r = await st.make(paper);
    if (r && r.err) toast(r.err, r.ms || 4000);
    else if (r) { st.r = r; await pvShow(st); }
  } catch (e) { console.error(e); problem('No se pudo armar el PDF en ese papel. Vuelve a intentarlo.'); }
  finally { st.busy = false; st.m.classList.remove('pv-busy'); }
}
/* abre el documento armado con pdf.js y pone sus páginas (vacías: se dibujan al acercarse a la vista) */
async function pvShow(st) {
  const { m, r } = st, gen = ++st.gen, box = $('.pv-pages', m);
  pvPrintClean();   // lo preparado para imprimir era del papel anterior
  $$('[data-paper]', m).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.paper === pvPaperOf(r.doc))));
  const note = $('.pv-note', m);
  note.hidden = !r.miss; note.textContent = r.miss ? pdfMissText(r.miss) : '';
  let lib, pdf;
  try {
    lib = await loadPdfJs();
    pdf = await lib.getDocument({ data: new Uint8Array(r.doc.output('arraybuffer')), isEvalSupported: false, verbosity: 0 }).promise;
  } catch (e) {
    console.warn('vista previa:', e);
    if (gen !== st.gen) return;
    // sin el lector (sin conexión en la web): igual se puede descargar
    box.innerHTML = `<p class="pv-fail">No se pudo mostrar la vista previa. Puedes descargar el PDF igual.</p>`;
    $('.pv-n', m).textContent = '';
    return;
  }
  if (gen !== st.gen || !m.isConnected) { pdf.destroy(); return; }
  pvRelease(st);
  st.pdf = pdf;
  const n = pdf.numPages;
  $('.pv-n', m).textContent = `${n} ${n === 1 ? 'página' : 'páginas'} · ${pdfPaperName(pvPaperOf(r.doc))}`;
  const sizes = [];
  for (let i = 1; i <= n; i++) { const pg = await pdf.getPage(i), vp = pg.getViewport({ scale: 1 }); sizes.push([vp.width, vp.height]); }
  if (gen !== st.gen) return;
  box.innerHTML = sizes.map(([w, h], i) => `<div class="pv-pg${w > h ? ' land' : ''}" data-i="${i + 1}" style="aspect-ratio:${w.toFixed(1)} / ${h.toFixed(1)}"><canvas aria-label="Página ${i + 1} de ${n}" role="img"></canvas></div>`).join('');
  box.scrollTop = 0;
  st.pages = $$('.pv-pg', box).map(el => ({ el, i: +el.dataset.i, w: 0, on: false }));
  // se dibujan las páginas que están a la vista (y la de antes y la de después); las que se alejan sueltan su dibujo
  st.io = new IntersectionObserver(es => { for (const e of es) { const pg = st.pages.find(x => x.el === e.target); if (pg) pg.on = e.isIntersecting; } pvVisible(st); }, { root: box, rootMargin: '700px 0px' });
  st.pages.forEach(pg => st.io.observe(pg.el));
}
/* dibuja las páginas cercanas a la vista que faltan (de a una) y suelta las lejanas (la memoria del celular) */
async function pvVisible(st) {
  if (st.drawing) { st.again = true; return; }
  st.drawing = true;
  try {
    do {
      st.again = false;
      const gen = st.gen;
      for (const pg of st.pages) {
        const c = pg.el.querySelector('canvas');
        if (!pg.on) { if (pg.w) { c.width = c.height = 0; pg.w = 0; } continue; }
        const cw = pg.el.clientWidth; if (!cw || pg.w === cw) continue;
        try {
          const page = await st.pdf.getPage(pg.i);
          if (gen !== st.gen) break;
          const vp1 = page.getViewport({ scale: 1 }), px = Math.min(2200, cw * Math.min(3, Math.max(1.5, devicePixelRatio || 1)));
          const vp = page.getViewport({ scale: px / vp1.width });
          const tmp = document.createElement('canvas'); tmp.width = Math.round(vp.width); tmp.height = Math.round(vp.height);
          await page.render({ canvasContext: tmp.getContext('2d'), viewport: vp }).promise;
          if (gen !== st.gen) break;
          c.width = tmp.width; c.height = tmp.height; c.getContext('2d').drawImage(tmp, 0, 0);
          tmp.width = tmp.height = 0;
          pg.w = cw; pg.el.classList.add('ok');
        } catch (e) { if (gen === st.gen) console.warn('vista previa, página ' + pg.i, e); }
      }
    } while (st.again);
  } finally { st.drawing = false; }
}
function pvRelease(st) {
  if (st.io) { st.io.disconnect(); st.io = null; }
  if (st.pdf) { try { st.pdf.destroy(); } catch (e) { } st.pdf = null; }
  st.pages = [];
}
function pvClose() {
  const st = PV; if (!st) return;
  PV = null; st.gen++;
  removeEventListener('resize', st.onResize);
  pvRelease(st); pvPrintClean();
}
/* ---------- imprimir ----------
   Las páginas en alta resolución (unos 216 ppp: la letra chica se lee) en #pvPrint, que solo se ve al imprimir; el resto
   de la app se esconde. @page con el tamaño exacto del papel y sin márgenes: una hoja por página. Devuelve true si se
   abrió el diálogo de impresión */
async function pvPrint(st) {
  if (!st.pdf) { toast('La vista previa no está lista para imprimir. Descarga el PDF e imprímelo desde ahí.', 5000); return false; }
  st.busy = true; st.m.classList.add('pv-busy');
  const btn = $('[data-pv="print"]', st.m), lab = btn.innerHTML;
  pvPrintClean();
  const n = st.pdf.numPages, scale = n > 60 ? 2 : 3, gen = st.gen;
  const wrap = document.createElement('div'); wrap.id = 'pvPrint'; wrap.setAttribute('aria-hidden', 'true');
  let size = null;
  try {
    for (let i = 1; i <= n; i++) {
      btn.innerHTML = `${PV_ICO.print}<span>${esc(tr('Preparando') + ' ' + i + '/' + n)}</span>`;
      const page = await st.pdf.getPage(i), vp1 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale });
      if (!size) size = [vp1.width, vp1.height];
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      const blob = await new Promise(res => c.toBlob(res, 'image/png'));
      c.width = c.height = 0;
      if (gen !== st.gen) return false;
      const d = document.createElement('div'), im = new Image();
      d.className = 'pv-pp'; d.style.width = vp1.width + 'pt'; d.style.height = (vp1.height - .75) + 'pt';
      im.alt = ''; im.src = URL.createObjectURL(blob);
      d.appendChild(im); wrap.appendChild(d);
    }
    document.body.appendChild(wrap);
    await Promise.all([...wrap.querySelectorAll('img')].map(im => im.decode ? im.decode().catch(() => { }) : null));
    const css = document.createElement('style'); css.id = 'pvPrintCss';
    css.textContent = `@page{size:${size[0].toFixed(2)}pt ${size[1].toFixed(2)}pt;margin:0}`;
    document.head.appendChild(css);
    // queda puesto mientras la vista previa esté abierta (en el celular el diálogo de imprimir no detiene la página y
    // «afterprint» puede llegar antes de que se imprima): se limpia al cerrar, al cambiar el papel o al volver a imprimir
    document.documentElement.classList.add('pv-printing');
    window.print();
    return true;
  } catch (e) { console.error(e); pvPrintClean(); problem('No se pudo preparar la impresión. Descarga el PDF e imprímelo desde ahí.'); return false; }
  finally { btn.innerHTML = lab; st.busy = false; st.m.classList.remove('pv-busy'); }
}
function pvPrintClean() {
  document.documentElement.classList.remove('pv-printing');
  const w = document.getElementById('pvPrint'); if (w) { w.querySelectorAll('img').forEach(im => URL.revokeObjectURL(im.src)); w.remove(); }
  const c = document.getElementById('pvPrintCss'); if (c) c.remove();
}
