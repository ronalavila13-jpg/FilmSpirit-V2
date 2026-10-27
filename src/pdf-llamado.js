/* ============================================================
   PDF · la hoja de llamado (sale de pdf.js en el lote AC: es un módulo propio de unas 330 líneas). Usa lo común de
   pdf.js (newDoc, pdfTheme, TBL, pdfSec, pdfRich, pdfBlocks, INK, MUTED…) y los datos de tab-call.js (callSheetData)
   ============================================================ */
/* ---------- hoja de llamado (lote U: la estructura de la referencia) ----------
   Arriba la versión; tres columnas (la productora y su equipo clave con teléfono, la producción y el cliente · el
   proyecto, la jornada, la fecha y el llamado general en grande · el clima, el punto de encuentro con su referencia,
   enlaces y fotos, y la locación con su mapa); la nota del 1.er asistente y la utilería especial al centro; el
   cronograma por escena con sus planos debajo; el avance de la jornada siguiente; una sola tabla de personas con los
   horarios del reparto; la movilidad y los proveedores. Al pie de cada página: el centro de salud, los canales de radio
   y «1 de N». (lote W) Ya no hay una segunda parte con «lo que la referencia no tiene»: esos datos van dentro */
let PDF_CALL_DONE = null;   // las jornadas y versiones del último PDF de llamado (se guardan si el archivo salió)
const CL_FOOT = 70;          // lo que ocupa el pie (centro de salud, radio y número de página)
const CL_CEL = [221, 239, 252];   // la banda celeste de los traslados
/* íconos de línea (como los de la pantalla), con trazos simples; s: el lado */
function pdfCallIco(doc, k, x, y, s = 9, col = MUTED) {
  doc.setDrawColor(...col); doc.setLineWidth(.7);
  const c = (cx, cy, r, st = 'S') => doc.circle(x + cx * s, y + cy * s, r * s, st);
  const l = (x1, y1, x2, y2) => doc.line(x + x1 * s, y + y1 * s, x + x2 * s, y + y2 * s);
  const box = () => doc.roundedRect(x + .04 * s, y + .04 * s, .92 * s, .92 * s, .2 * s, .2 * s, 'S');
  if (k === 'wx') { c(.36, .36, .15); l(.36, .06, .36, .13); l(.06, .36, .13, .36); l(.15, .15, .2, .2); l(.57, .15, .52, .2); doc.roundedRect(x + .32 * s, y + .56 * s, .64 * s, .32 * s, .16 * s, .16 * s, 'S'); }
  else if (k === 'sun') { c(.5, .72, .24); doc.setFillColor(...PDF_WHITE); doc.rect(x, y + .74 * s, s, .3 * s, 'F'); l(.04, .74, .96, .74); l(.5, .18, .5, .34); l(.16, .4, .26, .5); l(.84, .4, .74, .5); l(.3, .92, .7, .92); }
  else if (k === 'park' || k === 'hosp') { box(); if (k === 'hosp') { l(.5, .27, .5, .73); l(.27, .5, .73, .5); } else { doc.setFont('helvetica', 'bold'); doc.setFontSize(s * .7); doc.setTextColor(...col); doc.text('P', x + s * .52, y + s * .54, { align: 'center', baseline: 'middle' }); } }
  else if (k === 'pin') { c(.5, .38, .28); c(.5, .38, .09); l(.27, .55, .5, .96); l(.73, .55, .5, .96); }
  else if (k === 'radio') { doc.roundedRect(x + .24 * s, y + .3 * s, .52 * s, .68 * s, .08 * s, .08 * s, 'S'); l(.38, .3, .3, .02); l(.38, .5, .62, .5); l(.38, .64, .62, .64); l(.38, .78, .52, .78); }
  else if (k === 'move') { doc.rect(x + .02 * s, y + .3 * s, .56 * s, .42 * s, 'S'); l(.58, .42, .8, .42); l(.8, .42, .98, .58); l(.98, .58, .98, .72); l(.58, .72, .98, .72); c(.24, .8, .1); c(.78, .8, .1); }
  doc.setTextColor(...INK);
}
/* el logo del proyecto, centrado en x (devuelve el alto usado) */
function pdfImgC(doc, url, xc, y, maxW, maxH) {
  url = pdfImgSrc(url);
  try { const p = doc.getImageProperties(url), r = p.width / p.height; let w = maxW, h = w / r; if (h > maxH) { h = maxH; w = h * r; } doc.addImage(url, imgFmt(url), xc - w / 2, y, w, h); return h; } catch (e) { return 0; }
}
/* (lote Y) la hoja en el PDF con la escala, los tonos y las líneas de la pantalla («estilo Apple», shell.html): cada
   tamaño de la pantalla por 8,6/13,5 (el texto de 13,5 px sale en 8,6 pt), así etiqueta, nota, texto, sección, fecha,
   título y llamado guardan entre sí lo mismo que en la pantalla; los tres grises salen de la tinta (texto, secundario y
   etiqueta), las líneas son finas y las etiquetas van en minúsculas. Todo en la letra de la app (Archivo o la elegida) */
const CLK = 8.6 / 13.5, CLF = { cap: 11.5 * CLK, ft: 12.5 * CLK, bd: 8.6, h3: 17 * CLK, h2: 19 * CLK, h1: 26 * CLK, hero: 56 * CLK };
const clTones = () => ({ c2: mixc(INK, PDF_WHITE, .66), c3: mixc(INK, PDF_WHITE, .52), sep: mixc(INK, PDF_WHITE, .13), sep2: mixc(INK, PDF_WHITE, .07), acc: [184, 10, 25] });
/* (lote AC) lo que usan la cabecera y el pie: el ancho de un texto tal cual (lote AB: en inglés, getTextWidth lo
   traduciría otra vez: «Craft Services / Craft Services…»), la etiqueta chica y los pares etiqueta y valor */
const clRawW = doc => t => doc._rawW ? doc._rawW(t) : (doc._raw || doc).getTextWidth(t);
function clLab(doc, t, x, y, al) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.cap); doc.setTextColor(...clTones().c3); doc.text(trDone(pdfSafe(trDone(tr(t)))), x, y, al ? { align: al } : undefined); }
/* pares etiqueta y valor («Máx. 30°», «Listos motor 07:00»), como en la pantalla: la etiqueta en gris y el valor en
   negrita, uno al lado del otro en líneas que no pasan de w (si no entran, el siguiente baja), desde x o centradas en
   x. Lo escrito por cada uno no se traduce. Devuelve cuántas líneas usó */
function clPairs(doc, pairs, { x, y, w, fs = CLF.ft, gap = 14, lh = 11, center = false }) {
  const K = clTones(), raw = doc._raw || doc, rw = clRawW(doc);
  const Q = pairs.filter(([, v]) => v).map(([l, v]) => { const L = trDone(pdfSafe(trDone(tr(l)))) + ' ', V = pdfSafe(v); doc.setFontSize(fs); doc.setFont('helvetica', 'normal'); const wl = rw(L); doc.setFont('helvetica', 'bold'); return { L, V, wl, w: wl + rw(V) }; });
  const lines = [];
  for (const q of Q) { const ln = lines[lines.length - 1]; if (ln && ln.w + gap + q.w <= w) { ln.q.push(q); ln.w += gap + q.w; } else lines.push({ q: [q], w: q.w }); }
  lines.forEach((ln, j) => {
    let xx = center ? x - ln.w / 2 : x;
    for (const q of ln.q) { doc.setFont('helvetica', 'normal'); doc.setTextColor(...K.c2); raw.text(q.L, xx, y + j * lh); doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK); raw.text(q.V, xx + q.wl, y + j * lh); xx += q.w + gap; }
  });
  return lines.length;
}
/* la cabecera en tres columnas; devuelve dónde sigue */
function pdfCallHead(doc, X, V) {
  const W = doc.internal.pageSize.getWidth(), M = 36, TBC = 'Por confirmar', K = clTones(), raw = doc._raw || doc;
  const rw = clRawW(doc), lab = (t, x, y, al) => clLab(doc, t, x, y, al);
  // arriba, a la derecha, la versión de la hoja (lote W: sin «Hecha con FilmSpirit» a la izquierda), sobre una línea fina
  doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.cap); doc.setTextColor(...K.c2);
  doc.text(pdfSafe([trDone(tr('Hoja de llamado')), V ? callVerTxt(V) : ''].filter(Boolean).join(' · ')), W - M, 22, { align: 'right' });
  doc.setDrawColor(...K.sep); doc.setLineWidth(.5); doc.line(M, 28, W - M, 28);
  const y0 = 48, w1 = 158, xc = W / 2, wc = 200, x3 = W - M - 158, w3 = 158;
  // izquierda: la productora y el equipo clave con su teléfono
  let yl = y0;
  const clogo = brandOn('company') && brandLogo('logo') ? P.meta.logo : '';
  if (clogo) { const h = pdfImg(doc, clogo, M, yl - 8, 120, 26) ? 26 : 0; yl += h ? h + 4 : 0; }
  if (P.meta.company && brandOn('company')) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.h3); doc.setTextColor(...INK); const t = doc.splitTextToSize(trDone(pdfSafe(P.meta.company)), w1).slice(0, 2); raw.text(t, M, yl + 3); yl += t.length * CLF.h3 * 1.25 + 9; }
  // (lote W) con la producción y el cliente (lo que pedía «Equipo clave» antes), si tienen nombre
  for (const k of [...X.keyCrew, ...(X.keyMore || [])]) {
    lab(k.lab, M, yl + 4);
    doc.setFont('helvetica', k.name ? 'bold' : 'normal'); doc.setFontSize(CLF.bd); doc.setTextColor(...(k.name ? INK : K.c2));
    k.name ? raw.text(pdfSafe(k.name), M, yl + 15) : doc.text(TBC, M, yl + 15);
    // el teléfono, debajo del nombre (se toca para llamar)
    if (k.phone) { doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.ft); doc.setTextColor(...K.c2); const t = pdfSafe(k.phone); raw.text(t, M, yl + 25); doc.link(M, yl + 18, rw(t), 9, { url: 'tel:' + String(k.phone).replace(/[^\d+]/g, '') }); yl += 10; }
    yl += 26;
  }
  // centro: el proyecto (su logo o su nombre), la jornada, la fecha y el llamado general, la cifra más grande de la hoja
  let yc = y0 - 6;
  const plogo = brandOn('project') && brandLogo('projLogo') ? P.meta.projLogo : '';
  const lh = plogo ? pdfImgC(doc, plogo, xc, yc, 190, 42) : 0;
  if (lh) yc += lh + 8;
  else {
    // el nombre del proyecto en grande; si no entra entre las dos líneas, más chico (hasta el de la fecha) y en dos líneas
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK);
    const ttl = pdfSafe(P.meta.title); doc.setFontSize(CLF.h1);
    const fs = Math.max(CLF.h2, Math.min(CLF.h1, CLF.h1 * (wc - 4) / Math.max(1, rw(ttl)))); doc.setFontSize(fs);
    const t = doc.splitTextToSize(ttl, wc - 4).slice(0, 2); raw.text(t, xc, yc + fs * .82, { align: 'center' }); yc += t.length * fs * 1.15 + 3;
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.ft); doc.setTextColor(...K.c2);
  doc.text(trDone(pdfSafe(trDone(tr(`Jornada ${X.n + 1} de ${X.total}${X.eps ? ' · ' + X.eps : ''}`)))), xc, yc + 8, { align: 'center' });
  const date = X.date ? capFirst(X.date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })).replace(',', '') : 'Sin fecha';
  doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.h2); doc.setTextColor(...INK); doc.text(pdfSafe(date), xc, yc + 25, { align: 'center' });
  lab('Llamado general', xc, yc + 46, 'center');
  const yh = yc + 51 + CLF.hero * .74;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.hero); doc.setTextColor(...INK); doc.text(pdfSafe(X.call || '--:--'), xc, yh, { align: 'center' });
  // (lote W) el catering va tal cual lo escribieron (antes, en inglés, «Catering: …» se traducía entero y salía repetido).
  // (lote Y) Como en la pantalla, centrados; (lote AB) en dos líneas si no entran entre las líneas de la columna
  const nl = clPairs(doc, [['Listos motor', X.motor], ['Almuerzo', X.lunch], ['Catering', (X.dd.craft || '').trim()]], { x: xc, y: yh + 16, w: wc + 16, center: true });
  yc = yh + (nl ? 24 + (nl - 1) * 11 : 10);
  // derecha: el clima, el punto de encuentro (o estacionamiento) y la locación con su mapa, cada uno con su ícono
  let yr = y0 - 5;
  const row = (ico, parts, url) => {
    pdfCallIco(doc, ico, x3, yr, 9, K.c3);
    let yy = yr + 7.5;
    for (const p of parts) {
      const fs = p.fs || CLF.bd;
      doc.setFont('helvetica', p.st || 'normal'); doc.setFontSize(fs); doc.setTextColor(...(p.col || INK));
      // (lote Y) pares etiqueta y valor («Máx. 30°», «Amanecer 05:48»)
      if (p.pairs) { yy += clPairs(doc, p.pairs, { x: x3 + 16, y: yy, w: w3 - 16, fs, gap: 9, lh: fs * 1.34 }) * fs * 1.34; continue; }
      // lo escrito por cada uno (p.raw) no se traduce
      const t = doc.splitTextToSize(trDone(p.raw ? pdfSafe(p.t) : pdfSafe(trDone(tr(p.t)))), w3 - 16).slice(0, p.max || 3); raw.text(t, x3 + 16, yy); yy += t.length * fs * 1.34;
      // los enlaces del punto de encuentro, por su nombre («Google Maps · Waze»), cada uno se toca
      if (p.links) { let xx = x3 + 16; doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.ft); doc.setTextColor(...K.acc);
        p.links.forEach((u, i) => { const t2 = (i ? '   ' : '') + linkName(u), w = rw(t2); if (xx + w > x3 + w3 && i) { xx = x3 + 16; yy += 9; } raw.text(t2, xx, yy - 2); doc.link(xx, yy - 9, w, 9, { url: u }); xx += w; }); yy += 8; }
      // y sus fotos, chicas, una al lado de la otra (hasta dos), con las esquinas apenas redondeadas
      if (p.ph && p.ph.length) { const pw = (w3 - 16 - 4) / 2, phH = pw * .75;
        p.ph.slice(0, 2).forEach((q, i) => { const k = Math.min(pw / (q.w || 4), phH / (q.h || 3)), iw = (q.w || 4) * k, ih = (q.h || 3) * k, xx = x3 + 16 + i * (pw + 4);
          doc.setFillColor(246, 246, 247); doc.roundedRect(xx, yy - 4, pw, phH, 2, 2, 'F');
          try { doc.addImage(photoForPdf(clPhKey(X.d.id, q.id)), 'JPEG', xx + (pw - iw) / 2, yy - 4 + (phH - ih) / 2, iw, ih, undefined, 'FAST'); } catch (e) { if (typeof PDF_MISS !== 'undefined') PDF_MISS++; } });
        yy += phH + 2; }
    }
    if (url) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.ft); doc.setTextColor(...K.acc); doc.text('Ver mapa', x3 + 16, yy + 1); doc.link(x3 + 16, yy - 6, doc.getTextWidth(trDone(tr('Ver mapa'))), 9, { url }); yy += 10; }
    doc.setTextColor(...INK); yr = yy + 8;
  };
  // (lote Y) el clima como en la pantalla: lo que se escribió en «Clima» (con «°» si es un número) y, debajo, en gris, la
  // máxima, la mínima y la humedad con su unidad pegada al número
  const Dd = X.dd, wx0 = wxShow('wx', Dd.wx), wxP = [['Máx.', wxShow('hi', Dd.hi)], ['Mín.', wxShow('lo', Dd.lo)], ['Hum.', wxShow('hum', Dd.hum)]].filter(([, v]) => v);
  if (wx0 || wxP.length) row('wx', [wx0 ? { t: wx0, raw: true } : null, wxP.length ? { pairs: wxP, fs: CLF.ft } : null].filter(Boolean));
  if (Dd.sunrise || Dd.sunset) row('sun', [{ pairs: [['Amanecer', Dd.sunrise], ['Anochece', Dd.sunset]].filter(([, v]) => v), fs: CLF.ft }]);
  // (lote W) el punto de encuentro entero, como en la pantalla: la dirección de citación, su referencia, los enlaces y las fotos
  const mt = X.meet, mAddr = (mt.addr || '').trim(), mNote = (mt.note || '').trim(), mLinks = (mt.links || []).map(safeUrl).filter(Boolean);
  const mPh = (mt.ph || []).filter(q => FRAMES[clPhKey(X.d.id, q.id)]);
  if (mAddr || mNote || mLinks.length || mPh.length) row('park', [{ t: 'Punto de encuentro', fs: CLF.cap, st: 'bold', col: K.c3 }, mAddr ? { t: mAddr, st: 'bold', raw: true } : null, mNote ? { t: mNote, fs: CLF.ft, col: K.c2, raw: true, max: 4 } : null,
    mLinks.length || mPh.length ? { t: '', fs: 1, links: mLinks.length ? mLinks : null, ph: mPh } : null].filter(Boolean));
  const url = mapsUrl(X.meet, X.locs);
  if (X.locs.length) for (const [nm, ad] of X.locs.slice(0, 3)) row('pin', [{ t: nm, st: 'bold' }, ad ? { t: ad, fs: CLF.ft, col: K.c2, raw: true } : null].filter(Boolean), nm === X.locs[Math.min(2, X.locs.length - 1)][0] ? url : '');
  else row('pin', [{ t: mAddr || TBC, col: mAddr ? INK : K.c2, raw: !!mAddr }], url);
  const yb = Math.max(yl, yc, yr) + 6;
  doc.setDrawColor(...K.sep); doc.setLineWidth(.5);
  doc.line(xc - wc / 2 - 10, y0 - 6, xc - wc / 2 - 10, yb - 10); doc.line(xc + wc / 2 + 10, y0 - 6, xc + wc / 2 + 10, yb - 10);
  doc.setTextColor(...INK);
  return yb + 4;
}
/* el pie de cada página de una hoja: el centro de salud, los canales de radio y «1 de N», bajo una regla fina de tinta */
function pdfCallFoot(doc, X, i, N) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 36, y = H - CL_FOOT + 8, K = clTones(), raw = doc._raw || doc;
  const lab = (t, x, yy) => clLab(doc, t, x, yy);
  doc.setDrawColor(...INK); doc.setLineWidth(.6); doc.line(M, y - 6, W - M, y - 6);
  // el centro de salud
  pdfCallIco(doc, 'hosp', M, y + 1, 9, K.c3);
  lab('Centro de salud', M + 16, y + 7);
  const h = X.hosp;
  doc.setFont('helvetica', h.name ? 'bold' : 'normal'); doc.setFontSize(CLF.bd); doc.setTextColor(...(h.name ? INK : K.c2));
  h.name ? raw.text(pdfSafe(h.name).slice(0, 60), M + 16, y + 18) : doc.text('Por confirmar', M + 16, y + 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.ft); doc.setTextColor(...K.c2);
  const sub = [h.phone, h.addr].filter(Boolean).map(pdfSafe).join('     ');
  if (sub) raw.text(doc.splitTextToSize(trDone(sub), 230).slice(0, 2), M + 16, y + 28);
  // los canales de radio
  const xr = M + 270;
  pdfCallIco(doc, 'radio', xr, y + 1, 9, K.c3);
  lab('Canales de radio', xr + 16, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.bd); doc.setTextColor(...(X.radio ? INK : K.c2));
  X.radio ? raw.text(doc.splitTextToSize(trDone(pdfSafe(X.radio)), 150).slice(0, 3), xr + 16, y + 18) : doc.text('Por confirmar', xr + 16, y + 18);
  // el número de página de esta hoja
  doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.cap); doc.setTextColor(...K.c2);
  doc.text(pdfSafe(trDone(tr('Hoja de llamado') + ' · ' + tr(`Jornada ${X.n + 1} de ${X.total}`))), W - M, y + 7, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.h3); doc.setTextColor(...INK);
  doc.text(pdfSafe(trDone(tr(`${i} de ${N}`))), W - M, y + 21, { align: 'right' });
  doc.setTextColor(...INK);
}
function pdfCall(opts = {}) {
  const doc = newDoc();
  const cd = callDays(), { days } = cd;
  const list = PDF_SEL && PDF_SEL.days ? days.map((_, i) => i).filter(pdfDayOk) : opts.all ? days.map((_, i) => i) : [UI.callDay || 0];
  const YEL = mixc(rgb(lgCol('call', 'note')), PDF_WHITE, .4), LIGHT = rgb(lgCol('plan', 'ev'));
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 36;
  // cada hoja con su versión: la misma si nada cambió desde la última que salió; si cambió, la siguiente (tab-call.js).
  // Solo algunas páginas, o dentro del ZIP del proyecto: no es un envío, así que no estrena número
  const rec = !(PDF_SEL && PDF_SEL.pages) && !(typeof OFFER_CAPTURE !== 'undefined' && OFFER_CAPTURE);
  const vers = Object.fromEntries(list.map(n => [n, callVer(n, cd, rec)]));
  PDF_CALL_DONE = { list, vers };
  const sheets = [], K = clTones();
  // (lote Y) los títulos de sección como en la pantalla: en la letra de la app, con su dato en gris y una regla fina de tinta
  const CL_SEC = { font: 'helvetica', fs: CLF.h3, rfs: CLF.ft, rcol: K.c2, line: INK, lw: .6, gap: 6, after: 10 };   // pdfSec(…, { st: CL_SEC })
  // las celdas con otra línea debajo (entre una escena y sus planos, y entre los planos, una más clara)
  const withLine = (c, col) => c && typeof c === 'object' ? { ...c, styles: { ...(c.styles || {}), lineColor: col } } : { content: c || '', styles: { lineColor: col } };
  list.forEach((n, pi) => {
    if (pi) doc.addPage();
    const X = callSheetData(n), m = X.meet, p0 = doc.getCurrentPageInfo().pageNumber;
    const MG = { left: M, right: M, bottom: CL_FOOT + 6, top: 40 };
    let y = pdfCallHead(doc, X, vers[n]);
    // (lote Y) las tablas como en la pantalla: sin fondo en los títulos (chicos, en minúsculas y en el gris más claro) y
    // filas con aire separadas por una línea fina
    const GAP = 14, HL = { lineWidth: { top: 0, right: 0, bottom: .5, left: 0 }, lineColor: K.sep };
    const TB = { ...TBL, styles: { ...TBL.styles, fontSize: CLF.bd, lineColor: K.sep, cellPadding: { top: 4.6, bottom: 4.6, left: 6, right: 6 } },
      headStyles: { ...TBL.headStyles, fillColor: false, textColor: K.c3, fontStyle: 'bold', fontSize: CLF.cap, cellPadding: { top: 5, bottom: 4, left: 6, right: 6 }, ...HL } };
    const T = (o, mg) => { doc.autoTable({ ...TB, startY: y, margin: { ...MG, ...(mg || {}) }, ...o }); y = doc.lastAutoTable.finalY + GAP; };
    const sub = (t, col, tr0, st) => ({ t, fs: CLF.ft, col: col || K.c2, ...(st ? { st } : {}), ...(tr0 === false ? { tr: false } : {}) });
    const TBC = 'Por confirmar';
    // la franja de la tira a lo alto de cada fila de la escena y sus planos, y el enlace del mapa en los traslados
    const hooks = {
      didDrawCell: d => {
        const r = d.cell.raw; if (d.section !== 'body' || !r) return;
        if (r._bar) { doc.setFillColor(...r._bar); doc.rect(d.cell.x, d.cell.y, 2.2, d.cell.height, 'F'); }
        if (r._url) doc.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { url: r._url });
      },
    };
    const barOfRGB = c => mixc(c, INK, .85);
    // 1. la nota del 1.er asistente, al centro, en su recuadro amarillo de esquinas redondeadas, y la utilería especial
    const notes = (X.dd.notes || '').trim();
    if (notes) T({ body: [[pdfRich([{ t: 'Nota para el equipo', st: 'bold', fs: CLF.bd, tr: 1 }, ...notes.split('\n').filter(t => t.trim()).map(t => ({ t, fs: 14 * CLK, tr: false }))], { halign: 'center', lineWidth: 0, cellPadding: { top: 9, bottom: 10, left: 14, right: 14 } })]],
      willDrawCell: d => { if (d.section !== 'body') return; d.cell.styles.fillColor = false; doc.setFillColor(...YEL); doc.setDrawColor(...mixc(YEL, INK, .9)); doc.setLineWidth(.5); doc.roundedRect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, 7, 7, 'FD'); } }, { left: M + 64, right: M + 64 });
    if (X.props.length) { y -= notes ? GAP - 6 : 0; T({ body: [[pdfRich([{ segs: [{ t: 'Utilería especial: ', st: 'bold' }, { t: X.props.join(', '), col: K.c2 }] }], { halign: 'center', lineWidth: 0, cellPadding: { top: 2, bottom: 2, left: 6, right: 6 } })]] }); }
    y += 6;
    // 2. el cronograma en lista: la hora (eventos) o el número de escena con su hora; el encabezado, la sinopsis y el
    // reparto con su número; D/N y las páginas. Los traslados, una banda celeste con su dirección y el mapa.
    // (lote W) Debajo de cada escena, sus planos: el plano con su hora, la miniatura, la descripción técnica y la acción,
    // el lente y el sonido, y los personajes. Cada escena con sus planos es un bloque: si no cabe al pie de la página,
    // pasa entera a la siguiente
    const inf = dayInfo(X.d.keys, X.d.rows);
    y = pdfSec(doc, y, 'Cronograma', { st: CL_SEC, right: `${X.d.keys.length} ${X.d.keys.length === 1 ? 'escena' : 'escenas'} · ${fmtEighths(inf.e)} págs.`, need: 110 });
    const all = [...X.sched.rows, ...X.sched.close], blocks = [];
    const th = callThumbs() && typeof thumbCached === 'function', TW = 48, TH = TW * 9 / 16;
    const PS = { top: 6, bottom: 6, left: 6, right: 6 }, PSH = { top: 4, bottom: 4, left: 6, right: 6 };
    all.forEach((r, j) => {
      if (isMove(r)) {
        const to = callMoveTo(all, j, m), st = { fillColor: CL_CEL, textColor: INK };
        blocks.push([[{ content: pdfSafe(r.t0 || r.t || ''), styles: { ...st, fontStyle: 'bold' } }, { ...pdfRich([{ segs: [{ t: r.name || 'Traslado', st: 'bold' }, ...(r.det ? [{ t: '   ' + r.det, tr: false }] : []), ...(to ? [{ t: '   → ', tr: false }, { t: to.name, st: 'bold' }, ...(to.addr ? [{ t: '  ·  ' + to.addr, tr: false }] : []), ...(to.url ? [{ t: '   Ver mapa', st: 'bold', col: K.acc }] : [])] : [])] }], { ...st, colSpan: 4 }), _url: to && to.url }]]);
        return;
      }
      if (r.ev) { const ef = mixc(pdfHl(r.it) || LIGHT, PDF_WHITE, .7), st = { fillColor: ef, textColor: inkOn(ef) }; blocks.push([[{ content: pdfSafe(r.t0 || r.t || ''), styles: { ...st, fontStyle: 'bold' } }, pdfRich([{ segs: [{ t: r.name, st: 'bold' }, ...(r.det ? [{ t: '   ' + r.det, col: mutedOn(ef), tr: false }] : [])] }], { ...st, colSpan: 4 })]]); return; }
      const col = rgb(r.col), syn = synopsisOf(r.s, CALL_SYN), cl = castLine(r.s), bar = barOfRGB(col);
      // (lote Z) la fila de la escena a todo color, como su tira en el plan de rodaje (los planos de debajo, en blanco)
      const SC = { fillColor: col, textColor: inkOn(col), cellPadding: PS }, ink = inkOn(col), mut = mutedOn(col);
      const rows = [[{ ...pdfRich([{ t: r.code, st: 'bold', fs: CLF.h3, tr: false, col: ink }, (r.t0 || r.t) ? sub(r.t0 || r.t, ink, false, 'bold') : null], { ...SC, cellPadding: { ...PS, left: 10, right: 4 } }), _bar: bar },
        { content: ieLab(r.s), styles: { ...SC, fontSize: CLF.ft, fontStyle: 'bold' } },
        pdfRich([{ t: setOf(r.s) + (r.it.sp ? ` (parte ${r.it.sp})` : ''), st: 'bold', fs: CLF.bd, col: ink }, syn ? sub(syn, mut) : null, cl ? { t: cl + (r.fig ? ` · Fig. ${r.fig}` : ''), fs: CLF.ft, st: 'bold', col: ink } : null], SC),
        { content: DN_LAB[stripDN(r.s)], styles: { ...SC, fontSize: CLF.ft, fontStyle: 'bold' } }, { content: r.pages, styles: { ...SC, fontStyle: 'bold', halign: 'right' } }]];
      for (const x of r.shots || []) {
        const u = th ? thumbCached(x.sh) : null;
        // el set del plano solo si no es ya la locación que dice la escena
        const setX = r.set && !setOf(r.s).toLowerCase().includes(r.set.toLowerCase()) ? r.set : '';
        rows.push([{ ...pdfRich([{ t: x.code, st: 'bold', fs: CLF.ft, tr: false }, X.shotT && x.t0 ? { t: x.t0, fs: CLF.cap, col: K.c2, tr: false } : null], { cellPadding: { ...PSH, left: 10, right: 4 } }), _bar: bar },
          { ...pdfRich([{ fs: CLF.ft, segs: [{ t: x.size || '', st: 'bold' }, ...(x.det.length ? [{ t: (x.size ? ' · ' : '') + x.det.join(' · '), col: K.c2, tr: false }] : [])] }, x.act ? { t: x.act, fs: CLF.ft, tr: false } : null, setX ? { fs: CLF.cap, segs: [{ t: 'Set: ', col: K.c3 }, { t: setX, col: K.c2, tr: false }] } : null],
            { colSpan: 2, cellPadding: { ...PSH, left: u ? TW + 12 : 6 }, ...(u ? { minCellHeight: TH + 8 } : {}) }), _img: u },
          x.lens || x.snd ? pdfRich([x.lens ? { t: x.lens, fs: CLF.ft, tr: false } : null, x.snd ? { t: x.snd, fs: CLF.cap, col: K.c2 } : null], { cellPadding: PSH }) : { content: '', styles: { cellPadding: PSH } },
          { content: pdfSafe(x.cast.join(', ')), styles: { fontSize: CLF.ft, halign: 'right', cellPadding: PSH } }]);
      }
      // entre la escena y sus planos, y entre los planos, la línea más clara; la de abajo del último, la de siempre
      blocks.push(rows.map((rw, i) => i < rows.length - 1 ? rw.map(c => withLine(c, K.sep2)) : rw));
    });
    if (!all.some(r => !r.ev)) blocks.push([[{ content: 'Jornada sin escenas.', colSpan: 5, styles: { textColor: K.c2 } }]]);
    const lnTop = { top: .6, right: 0, bottom: 0, left: 0 };
    blocks.push([[{ content: pdfSafe(X.end || ''), styles: { fontStyle: 'bold', lineWidth: lnTop, lineColor: INK, cellPadding: PS } }, { content: 'Fin de jornada', colSpan: 3, styles: { fontStyle: 'bold', lineWidth: lnTop, lineColor: INK, cellPadding: PS } },
      pdfRich([{ segs: [{ t: 'Total ', fs: CLF.cap, col: K.c3 }, { t: fmtEighths(inf.e), st: 'bold', tr: false }] }], { halign: 'right', lineWidth: lnTop, lineColor: INK, cellPadding: PS })]]);
    // con planos, una segunda fila de títulos: lo que dice cada columna en las filas de los planos (la línea, debajo de
    // la última fila de títulos)
    const two = X.sched.byShot, h1 = two ? { lineWidth: 0, cellPadding: { top: 5, bottom: 1.5, left: 6, right: 6 } } : {}, h2 = { fontStyle: 'normal', cellPadding: { top: 0, bottom: 4, left: 6, right: 6 } };
    const head = [[{ content: 'Hora · Esc.', styles: h1 }, { content: 'I/E', styles: h1 }, { content: 'Escena', styles: h1 }, { content: 'D/N', styles: h1 }, { content: 'Págs.', styles: { ...h1, halign: 'right' } }],
      ...(two ? [[{ content: 'Plano', styles: h2 }, { content: 'Descripción y acción', colSpan: 2, styles: h2 }, { content: 'Lente · Sonido', styles: h2 }, { content: 'Personajes', styles: { ...h2, halign: 'right' } }]] : [])];
    y = pdfBlocks(doc, y, { ...TB, margin: MG, head, rowPageBreak: 'avoid', ...hooks,
      didDrawCell: d => { hooks.didDrawCell(d); const r = d.cell.raw; if (d.section === 'body' && r && r._img) { try { doc.addImage(r._img, r._img.startsWith('data:image/png') ? 'PNG' : 'JPEG', d.cell.x + 6, d.cell.y + 4, TW, TH); } catch (e) { PDF_MISS++; } } },
      columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 30 }, 3: { cellWidth: 66 }, 4: { cellWidth: 56, halign: 'right' } } }, blocks) + GAP + 6;
    // 3. el avance: solo la jornada siguiente (o «Fin de rodaje»)
    const A = X.adv;
    if (A) {
      y = pdfSec(doc, y - 4, trDone(tr(`Avance · Jornada ${A.n}`) + (A.date ? ' · ' + advDate(A) : '')), { st: CL_SEC, right: [A.call ? `Llamado general ${A.call}` : 'Llamado por confirmar', A.locs.join(', ')].filter(Boolean).join('  ·  '), need: 70 });
      // (lote Z) cada escena del avance a todo color, como en el cronograma
      const ab = A.rows.map(r => { const col = rgb(r.col), SC = { fillColor: col, textColor: inkOn(col), cellPadding: PS };
        return [{ content: r.code, styles: { ...SC, fontStyle: 'bold', fontSize: CLF.h3, cellPadding: { ...PS, left: 10, right: 4 } }, _bar: barOfRGB(col) }, { content: r.ie, styles: { ...SC, fontSize: CLF.ft, fontStyle: 'bold' } },
          pdfRich([{ t: r.set, st: 'bold', fs: CLF.bd, col: inkOn(col) }, r.syn ? sub(r.syn, mutedOn(col)) : null], SC), { content: r.dn, styles: { ...SC, fontSize: CLF.ft, fontStyle: 'bold' } }, { content: pdfSafe(r.cast.join(', ')), styles: { ...SC, fontStyle: 'bold' } }, { content: fmtEighths(r.e8), styles: { ...SC, halign: 'right', fontStyle: 'bold' } }]; });
      if (!ab.length) ab.push([{ content: 'Jornada sin escenas.', colSpan: 6, styles: { textColor: K.c2 } }]);
      ab.push([pdfRich([{ segs: [{ t: 'Total: ', col: K.c2 }, { t: `${fmtEighths(A.e8)} págs.`, st: 'bold' }, ...(A.cast.length ? [{ t: '     Reparto: ', col: K.c2 }, { t: A.cast.map(c => (c.n ? c.n + ' ' : '') + c.name).join(', '), col: K.c2 }] : [])] }], { colSpan: 6, halign: 'right', lineWidth: 0, fontSize: CLF.ft })]);
      T({ head: [['Esc.', 'I/E', 'Escena', 'D/N', 'Reparto', { content: 'Págs.', styles: { halign: 'right' } }]], body: ab, rowPageBreak: 'avoid', ...hooks,
        columnStyles: { 0: { cellWidth: 38, cellPadding: { top: 4.6, bottom: 4.6, left: 10, right: 4 } }, 1: { cellWidth: 30 }, 3: { cellWidth: 54 }, 4: { cellWidth: 62 }, 5: { cellWidth: 58 } } });
    } else {
      y = pdfSec(doc, y - 4, 'Avance de la jornada siguiente', { st: CL_SEC, need: 40 });
      T({ body: [[{ content: 'Fin de rodaje', styles: { fontStyle: 'bold', fontSize: CLF.h3, halign: 'center', lineWidth: 0 } }]] });
    }
    // 4. una sola tabla de personas: el reparto y el equipo por área (el área, un separador fino con su citación).
    // (lote W) Con las columnas de antes: recojo, llamado, vestuario, maquillaje, listos, teléfono (con el correo debajo,
    // más chico) y observaciones
    y = pdfSec(doc, y + 2, 'Personas', { st: CL_SEC, right: `${X.cast.length} ${X.cast.length === 1 ? 'personaje' : 'personajes'}${X.fig ? ' · figuración ' + X.fig : ''}`, need: 70 });
    const NP = 9, CC = { halign: 'center' }, tmc = (v, b) => ({ content: v || '', styles: { ...CC, ...(b ? { fontStyle: 'bold' } : {}) } });
    // el nombre del área, chico, en minúsculas y en el gris más claro, con su citación
    const sep = (name, dc) => [{ content: pdfSafe(name), colSpan: 3, styles: { fontSize: CLF.cap, fontStyle: 'bold', textColor: K.c3, cellPadding: { top: 9, bottom: 2, left: 6, right: 6 } } }, { content: dc || '', styles: { fontSize: CLF.ft, fontStyle: 'bold', textColor: K.c2, halign: 'center', cellPadding: { top: 9, bottom: 2, left: 2, right: 2 } } }, { content: '', colSpan: NP - 4 }];
    // el teléfono y, debajo, el correo (partido en la @ si es largo, para que no se salga de la columna)
    const telMail = (t, e) => { t = (t || '').trim(); e = (e || '').trim(); if (!t && !e) return ''; const at = e.indexOf('@'), long = e.length > 22 && at > 0;
      return pdfRich([t ? { t, fs: CLF.bd, tr: false } : null, ...(e ? (long ? [{ t: e.slice(0, at), fs: CLF.cap, col: K.c2, tr: false }, { t: e.slice(at), fs: CLF.cap, col: K.c2, tr: false }] : [{ t: e, fs: CLF.cap, col: K.c2, tr: false }]) : [])]); };
    const pb = [];
    if (X.cast.length) {
      pb.push(sep('Reparto', ''));
      for (const { el, sc } of X.cast) {
        const Tl = callTalent(el.id), Z = (X.dd.cast || {})[el.id] || {};
        pb.push([Tl.actor ? { content: pdfSafe(Tl.actor), styles: { fontStyle: 'bold' } } : pdfRich([{ t: TBC, col: K.c2 }]), pdfRich([{ segs: [...(D.castNum[el.id] ? [{ t: D.castNum[el.id] + '  ', st: 'bold', col: K.c2, tr: false }] : []), { t: titleCase(el.name), st: 'bold' }] }, sc && sc.length ? { t: `Esc. ${sc.join(', ')}`, fs: CLF.cap, col: K.c2 } : null]),
          tmc(Z.pu), tmc(Z.call || X.call, true), tmc(Z.ves), tmc(Z.mq), tmc(Z.ready), telMail(Tl.phone, Tl.email), { content: pdfSafe(Z.obs || ''), styles: { fontSize: CLF.ft } }]);
      }
      if (X.fig) pb.push([{ content: pdfSafe(`Figuración: ${X.fig}`), colSpan: NP, styles: { textColor: K.c2, fontSize: CLF.ft } }]);
    }
    for (const [name, l, dc] of X.crew) {
      pb.push(sep(name, dc));
      for (const c of l) pb.push([{ content: pdfSafe(c.name), styles: { fontStyle: 'bold' } }, { content: pdfSafe(c.role), styles: { textColor: K.c2 } }, '', tmc(c.call, true), '', '', '', telMail(c.phone, c.email), '']);
    }
    if (!pb.length) pb.push([{ content: 'Sin reparto ni equipo en esta jornada.', colSpan: NP, styles: { textColor: K.c2 } }]);
    const TC = { cellPadding: { top: 4.6, bottom: 4.6, left: 2, right: 2 }, halign: 'center' };
    T({ head: [['Nombre', 'Rol / Personaje', ...['Recojo', 'Llamado', 'Vest.', 'Maq.', 'Listos'].map(t => ({ content: t, styles: { halign: 'center', cellPadding: { top: 5, bottom: 4, left: 1, right: 1 } } })), 'Teléfono', 'Observaciones']], body: pb, rowPageBreak: 'avoid',
      columnStyles: { 0: { cellWidth: 96 }, 1: { cellWidth: 90 }, 2: { cellWidth: 34, ...TC }, 3: { cellWidth: 38, ...TC }, 4: { cellWidth: 32, ...TC }, 5: { cellWidth: 32, ...TC }, 6: { cellWidth: 34, ...TC }, 7: { cellWidth: 88 } } });
    // 5. (lote W) la movilidad y los proveedores, después de las personas y con el mismo estilo
    if (X.mov.length) {
      y = pdfSec(doc, y + 2, 'Movilidad', { st: CL_SEC, right: `${X.mov.length} ${X.mov.length === 1 ? 'vehículo' : 'vehículos'}`, need: 60 });
      T({ head: [['Vehículo', 'Conductor', 'Pasajeros']], body: X.mov.map((x, i) => [pdfRich([{ segs: [{ t: `${i + 1}  `, st: 'bold', col: K.c2, tr: false }, { t: x.name || 'Vehículo', st: 'bold', tr: !x.name }] }]), pdfSafe(x.driver || ''), pdfSafe(x.pax.join(', '))]),
        rowPageBreak: 'avoid', columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 130 } } });
    }
    if (X.vend.length) {
      y = pdfSec(doc, y + 2, 'Proveedores', { st: CL_SEC, need: 60 });
      T({ head: [['Proveedor', 'Equipo o servicio', 'Contacto', 'Teléfono', { content: 'Llamado', styles: { halign: 'center' } }]], rowPageBreak: 'avoid',
        body: X.vend.map(v => [{ content: pdfSafe(v.name), styles: { fontStyle: 'bold' } }, pdfSafe(v.gear || ''), pdfSafe(v.contact || ''), pdfSafe(v.phone || ''), { content: v.call || '', styles: { halign: 'center', fontStyle: 'bold' } }]), columnStyles: { 3: { cellWidth: 88 }, 4: { cellWidth: 56 } } });
    }
    sheets.push({ X, p0, p1: doc.getNumberOfPages() });
  });
  // el pie de cada página y, en las que siguen, arriba, el proyecto y la hoja en gris sobre una línea fina (como la
  // versión de la primera); «1 de N» cuenta las páginas de cada hoja
  for (const { X, p0, p1 } of sheets) for (let i = p0; i <= p1; i++) {
    doc.setPage(i);
    if (i > p0) { doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.cap); doc.setTextColor(...K.c2); doc.text(pdfSafe(`${P.meta.title}  ·  ${trDone(tr('Hoja de llamado') + ' · ' + tr(`Jornada ${X.n + 1} de ${X.total}`))}`), M, 22); doc.setDrawColor(...K.sep); doc.setLineWidth(.5); doc.line(M, 28, W - M, 28); }
    pdfCallFoot(doc, X, i - p0 + 1, p1 - p0 + 1);
  }
  return { doc, name: fileSafe(P.meta.title) + (opts.all ? '_hojas_de_llamado.pdf' : `_hoja_de_llamado_J${list[0] + 1}.pdf`) };
}
