/* ============================================================
   PDF · la hoja de llamado (sale de pdf.js en el lote AC: es un módulo propio). Usa lo común de pdf.js (newDoc,
   pdfRich, pdfBlocks, INK, MUTED…) y los datos de tab-call.js (callSheetData)
   ============================================================ */
/* ---------- hoja de llamado (lote U: la estructura de la referencia; lote AH: en cuadros) ----------
   Toda la hoja va dentro de cuadros con líneas negras completas, como una planilla, sin encabezado ni pie de página:
   la cabecera entera encerrada (tres columnas: la productora y su equipo clave con teléfono · el proyecto, la hoja y su
   versión, la fecha, el llamado general en grande con listos motor, almuerzo, cierre de set y wrap · el clima y la
   locación con su mapa); los jefes de área; la nota del 1.er asistente; el cronograma por escena con sus planos debajo
   (sin título: la cabecera de sus columnas basta); el avance; los talentos y el equipo técnico, cada uno en su cuadro;
   y al final la utilería especial, el punto de encuentro, la movilidad, el centro de salud y los canales de radio.
   Las tablas llevan líneas entre las columnas y las escenas el color de su tira. No depende del estilo de las tablas
   de los demás PDF (TBL): lleva el suyo.
   (lote AI) Dos estilos con la misma estructura (P.call.style, el botón «Excel | Apple» de la barra; callXL, tab-call.js):
   Excel, lo de arriba; Apple (el de entrada), la forma de los lotes Y a AG: la escala de letras (CL_SCALE) y los grises
   (CL_TONE) de la pantalla, sin rejilla ni marcos negros: la cabecera en tres columnas separadas por una línea fina, cada
   sección con su título y una regla fina de tinta (pdfSec), las filas con aire y una línea fina debajo, la nota en su
   recuadro amarillo redondeado y, al final, el centro de salud y los canales de radio bajo una regla, como el pie de
   antes (pero una sola vez, al final de la hoja: sin pie de página) */
let PDF_CALL_DONE = null;   // las hojas y versiones del último PDF de llamado (se guardan si el archivo salió)
const CL_CEL = [221, 239, 252];   // la banda celeste de los traslados
const CL_M = 30;                  // (lote AH) el margen de la página (sin encabezado ni pie)
// el borde de cada cuadro y las líneas de adentro, las líneas negras, el título de cada cuadro y sus columnas: los mismos
// de los demás documentos de producción (GRID, PDF_RULE, PDF_HEADF y PDF_LABF de pdf.js)
const CL_LW = { out: GRID.frame * 1.2, in: GRID.cell };
const CL_LINE = PDF_RULE, CL_BAND = PDF_HEADF, CL_HEADF = PDF_LABF;
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
/* (lote AH) el alto que ocupará un logo (sin dibujarlo), para medir la cabecera antes de dibujarla */
function pdfImgH(doc, url, maxW, maxH) {
  try { const p = doc.getImageProperties(pdfImgSrc(url)), r = p.width / p.height; return Math.min(maxH, maxW / r); } catch (e) { return 0; }
}
/* (lote Y) la hoja en el PDF con la escala, los tonos y las líneas de la pantalla («estilo Apple», shell.html): cada
   tamaño de la pantalla por 8,6/13,5 (el texto de 13,5 px sale en 8,6 pt), así etiqueta, nota, texto, sección, fecha,
   título y llamado guardan entre sí lo mismo que en la pantalla; los tres grises salen de la tinta (texto, secundario y
   etiqueta) y las etiquetas van en minúsculas. Todo en la letra de la app (Archivo o la elegida) */
const CLK = 8.6 / CL_SCALE.bd, CLF = Object.fromEntries(Object.entries(CL_SCALE).map(([k, v]) => [k, v * CLK]));   // (lote AC) de la tabla de tab-call.js
const clTones = () => ({ c2: mixc(INK, PDF_WHITE, CL_TONE[2]), c3: mixc(INK, PDF_WHITE, CL_TONE[3]), sep: mixc(INK, PDF_WHITE, CL_TONE.sep), sep2: mixc(INK, PDF_WHITE, CL_TONE.sep2), acc: [184, 10, 25] });
/* (lote AC) lo que usan la cabecera y el pie: el ancho de un texto tal cual (lote AB: en inglés, getTextWidth lo
   traduciría otra vez: «Craft Services / Craft Services…»), la etiqueta chica y los pares etiqueta y valor */
const clRawW = doc => t => doc._rawW ? doc._rawW(t) : (doc._raw || doc).getTextWidth(t);
function clLab(doc, t, x, y, al) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.cap); doc.setTextColor(...clTones().c3); doc.text(trDone(pdfSafe(trDone(tr(t)))), x, y, al ? { align: al } : undefined); }
/* pares etiqueta y valor («Máx. 30°», «Listos motor 07:00»), como en la pantalla: la etiqueta en gris y el valor en
   negrita, uno al lado del otro en líneas que no pasan de w (si no entran, el siguiente baja), desde x o centradas en
   x. Lo escrito por cada uno no se traduce. Devuelve cuántas líneas usó (draw: false, solo las cuenta) */
function clPairs(doc, pairs, { x, y, w, fs = CLF.ft, gap = 14, lh = 11, center = false, draw = true }) {
  const K = clTones(), raw = doc._raw || doc, rw = clRawW(doc);
  const Q = pairs.filter(([, v]) => v).map(([l, v]) => { const L = trDone(pdfSafe(trDone(tr(l)))) + ' ', V = pdfSafe(v); doc.setFontSize(fs); doc.setFont('helvetica', 'normal'); const wl = rw(L); doc.setFont('helvetica', 'bold'); return { L, V, wl, w: wl + rw(V) }; });
  const lines = [];
  for (const q of Q) { const ln = lines[lines.length - 1]; if (ln && ln.w + gap + q.w <= w) { ln.q.push(q); ln.w += gap + q.w; } else lines.push({ q: [q], w: q.w }); }
  if (draw) lines.forEach((ln, j) => {
    let xx = center ? x - ln.w / 2 : x;
    for (const q of ln.q) { doc.setFont('helvetica', 'normal'); doc.setTextColor(...K.c2); raw.text(q.L, xx, y + j * lh); doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK); raw.text(q.V, xx + q.wl, y + j * lh); xx += q.w + gap; }
  });
  return lines.length;
}
/* (lote AH) la cabecera, encerrada entera: tres columnas de celdas con líneas negras (cada dato en su celda; la última
   de cada columna llega hasta abajo). Cada celda es fn(draw, x, y, w) → su alto: primero se mide todo y después se
   dibuja. Devuelve dónde sigue la página. (lote AI) ap: en estilo Apple, las mismas celdas sin líneas ni marco, con más
   aire entre ellas, y una línea fina entre las columnas */
function pdfCallHead(doc, X, V, y0, ap) {
  const W = doc.internal.pageSize.getWidth(), M = CL_M, TBC = 'Por confirmar', K = clTones(), raw = doc._raw || doc;
  const rw = clRawW(doc), lab = (t, x, y, al) => clLab(doc, t, x, y, al), P6 = ap ? 7 : 6;
  const wL = 166, wR = 166, wC = W - 2 * M - wL - wR, xs = [M, M + wL, M + wL + wC], ws = [wL, wC, wR];
  const cols = [[], [], []];
  // una línea de texto (o hasta max) que no pasa de w; devuelve cuántas usó
  const lines = (t, w, max) => doc.splitTextToSize(t, w).slice(0, max || 2);
  // izquierda: la productora (su logo y su nombre) y el equipo clave con su teléfono
  const clogo = brandOn('company') && brandLogo('logo') ? P.meta.logo : '', co = P.meta.company && brandOn('company') ? P.meta.company : '';
  if (clogo || co) cols[0].push((draw, x, y, w) => {
    let h = P6;
    const ih = clogo ? pdfImgH(doc, clogo, w - 2 * P6, 26) : 0;
    if (ih) { if (draw) pdfImg(doc, clogo, x + P6, y + h, w - 2 * P6, 26); h += ih + 4; }
    if (co) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.h3); const t = lines(trDone(pdfSafe(co)), w - 2 * P6); if (draw) { doc.setTextColor(...INK); raw.text(t, x + P6, y + h + CLF.h3 * .8); } h += t.length * CLF.h3 * 1.2; }
    return h + P6 - 2;
  });
  const keyCell = k => (draw, x, y, w) => {
    let yy = y + P6 + CLF.cap * .78;
    if (draw) lab(k.lab, x + P6, yy);
    yy += CLF.bd * 1.25;
    if (draw) {
      doc.setFont('helvetica', k.name ? 'bold' : 'normal'); doc.setFontSize(CLF.bd); doc.setTextColor(...(k.name ? INK : K.c2));
      k.name ? raw.text(lines(pdfSafe(k.name), w - 2 * P6, 1), x + P6, yy) : doc.text(TBC, x + P6, yy);
    }
    // el teléfono, debajo del nombre (se toca para llamar)
    if (k.phone) {
      yy += CLF.ft * 1.3;
      if (draw) { doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.ft); doc.setTextColor(...K.c2); const t = pdfSafe(k.phone); raw.text(t, x + P6, yy); doc.link(x + P6, yy - 7, rw(t), 9, { url: 'tel:' + String(k.phone).replace(/[^\d+]/g, '') }); }
    }
    return yy - y + P6 - 1;
  };
  for (const k of [...X.keyCrew.slice(0, 2), ...(X.keyMore || [])]) cols[0].push(keyCell(k));
  // (lote AJ) los contactos de rodaje, en su cuadro con su título: los asistentes de dirección y el productor de campo
  cols[0].push((draw, x, y, w) => {
    let h = P6;
    if (draw) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.bd); doc.setTextColor(...INK); doc.text(trDone(pdfSafe(trDone(tr('Contactos')))), x + P6, y + h + CLF.bd * .8); }
    h += CLF.bd * 1.2;
    for (const k of X.contacts) h += keyCell(k)(draw, x, y + h, w) - 1;
    return h;
  });
  // centro: el proyecto (su logo o su nombre), la hoja y su versión (solo el número; sin la fecha ni la hora en que
  // salió); la fecha; el llamado general, la cifra más grande de la hoja; listos motor, almuerzo, cierre de set y wrap
  const plogo = brandOn('project') && brandLogo('projLogo') ? P.meta.projLogo : '';
  cols[1].push((draw, x, y, w) => {
    const xc = x + w / 2; let h = P6;
    const lh = plogo ? pdfImgH(doc, plogo, w - 24, 40) : 0;
    if (lh) { if (draw) pdfImgC(doc, plogo, xc, y + h, w - 24, 40); h += lh + 5; }
    else {
      // el nombre del proyecto en grande; si no entra, más chico (hasta el de la fecha) y en dos líneas
      doc.setFont('helvetica', 'bold'); const ttl = pdfSafe(P.meta.title); doc.setFontSize(CLF.h1);
      const fs = Math.max(CLF.h2, Math.min(CLF.h1, CLF.h1 * (w - 16) / Math.max(1, rw(ttl)))); doc.setFontSize(fs);
      const t = lines(ttl, w - 16); if (draw) { doc.setTextColor(...INK); raw.text(t, xc, y + h + fs * .82, { align: 'center' }); } h += t.length * fs * 1.12 + 2;
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.ft);
    const sub = trDone(pdfSafe([trDone(tr('Hoja de llamado')), X.free ? X.title : trDone(tr(X.title)), callVerNum(V)].filter(Boolean).join(' · ') + (X.eps ? ' · ' + X.eps : '')));
    const t = lines(sub, w - 12);
    if (draw) { doc.setTextColor(...K.c2); doc.text(t, xc, y + h + CLF.ft * .85, { align: 'center' }); }
    return h + t.length * CLF.ft * 1.25 + P6 - 1;
  });
  cols[1].push((draw, x, y, w) => {
    const date = X.date ? capFirst(X.date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })).replace(',', '') : 'Sin fecha';
    if (draw) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.h2); doc.setTextColor(...INK); doc.text(pdfSafe(date), x + w / 2, y + P6 + CLF.h2 * .78, { align: 'center' }); }
    return P6 * 2 + CLF.h2 * .95;
  });
  cols[1].push((draw, x, y, w) => {
    if (draw) {
      if (ap) { doc.setFillColor(...V2K.yellow); doc.rect(x, y, w, P6 + CLF.cap + 3 + CLF.hero * .74 + P6 + 2, 'F'); }   // (versión 2) el cuadro amarillo
      if (ap) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.cap); doc.setTextColor(...INK); doc.text(trDone(pdfSafe(trDone(tr('Llamado general')))), x + w / 2, y + P6 + CLF.cap * .78, { align: 'center' }); }
      else lab('Llamado general', x + w / 2, y + P6 + CLF.cap * .78, 'center');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.hero); doc.setTextColor(...INK); doc.text(pdfSafe(X.call || '--:--'), x + w / 2, y + P6 + CLF.cap + 3 + CLF.hero * .74, { align: 'center' });
    }
    return P6 + CLF.cap + 3 + CLF.hero * .74 + P6 + 2;
  });
  // (lote AH) cuatro horas en cuatro celdas: listos motor, almuerzo, cierre de set y wrap
  const four = [['Listos motor', X.motor], ['Almuerzo', X.lunch], ['Cierre de set', X.cierre], ['Wrap', X.end]];
  cols[1].push((draw, x, y, w) => {
    const cw = w / 4, h = P6 + CLF.cap + CLF.h3 + P6;
    if (draw) four.forEach(([l, v], i) => {
      const cx = x + cw * i + cw / 2;
      if (i) { doc.setDrawColor(...(ap ? V2K.line : CL_LINE)); doc.setLineWidth(ap ? .8 : CL_LW.in); doc.line(x + cw * i, y, x + cw * i, y + h); }
      lab(l, cx, y + P6 + CLF.cap * .78, 'center');
      if (v) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.h3); doc.setTextColor(...INK); doc.text(pdfSafe(v), cx, y + P6 + CLF.cap + CLF.h3 * .82, { align: 'center' }); }
    });
    return h;
  });
  // el catering (tal cual lo escribieron) y el resumen de la jornada
  const inf = dayInfo(X.de.keys, X.de.rows), nShots = X.sched.rows.reduce((a, r) => a + (r.shots ? r.shots.length : 0), 0), nSc = X.de.keys.length;
  // (en una hoja libre sin catering, nada: las horas son la última celda)
  if (!X.free || (X.dd.craft || '').trim()) cols[1].push((draw, x, y, w) => {
    let h = P6;
    const craft = (X.dd.craft || '').trim();
    if (craft) { const nl = clPairs(doc, [['Catering', craft]], { x: x + w / 2, y: y + h + CLF.ft * .8, w: w - 12, center: true, draw }); h += nl * 11; }
    const sum = X.free ? '' : [inf.e ? tr(`${fmtEighths(inf.e)} págs.`) : '', tr(`${nSc} ${nSc === 1 ? 'escena' : 'escenas'}`), X.sched.byShot ? tr(`${nShots} planos`) : ''].filter(Boolean).join(' · ');
    if (draw) { doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.ft); doc.setTextColor(...K.c2); doc.text(trDone(pdfSafe(sum)), x + w / 2, y + h + CLF.ft * .8, { align: 'center' }); }
    return h + CLF.ft * 1.1 + P6 - 1;
  });
  // (lote AJ) el clima y los datos del día, en el mismo recuadro, bajo las páginas: el clima y, debajo, máxima, mínima, humedad y
  // lluvia; viento, amanecer y anochecer
  cols[1].push((draw, x, y, w) => {
    const Wd = X.dd, F = Object.fromEntries(WX_FIELDS.map(f => [f.f, f]));
    const rows = [[['Máx.', wxShow('hi', Wd.hi)], ['Mín.', wxShow('lo', Wd.lo)], ['Hum.', wxShow('hum', Wd.hum)], ['Lluvia', wxShow('rain', Wd.rain)]], [['Viento', wxShow('wind', Wd.wind)], ['Amanece', Wd.sunrise], ['Anochece', Wd.sunset]]];
    const rh = 6 + CLF.bd * 1.1 + CLF.cap * 1.2 + 4, ch = 8 + CLF.bd + 2;
    if (draw) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.bd); doc.setTextColor(...(Wd.wx ? INK : K.c2));
      doc.text(trDone(pdfSafe(Wd.wx ? wxShow('wx', Wd.wx) : tr('Clima'))), x + w / 2, y + 8 + CLF.bd * .8, { align: 'center' });
      rows.forEach((r, ri) => {
        const cw = w / r.length, yy = y + ch + ri * rh;
        doc.setDrawColor(...(ap ? V2K.line : CL_LINE)); doc.setLineWidth(ap ? .8 : CL_LW.in); doc.line(x, yy, x + w, yy);
        r.forEach(([l, v], i) => {
          const cx = x + cw * i + cw / 2;
          if (i) { doc.setDrawColor(...(ap ? V2K.line : CL_LINE)); doc.setLineWidth(ap ? .8 : CL_LW.in); doc.line(x + cw * i, yy, x + cw * i, yy + rh); }
          doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.bd); doc.setTextColor(...(v ? INK : K.c2)); doc.text(pdfSafe(v || ''), cx, yy + 6 + CLF.bd * .8, { align: 'center' });
          lab(l, cx, yy + 6 + CLF.bd * 1.1 + CLF.cap * .9, 'center');
        });
      });
    }
    return ch + rh * rows.length;
  });
  // derecha: la locación (más grande; si hay varias, cada una en su fila) y el centro de salud
  const Lc = X.loc, own = ((X.dd.loc || {}).name || '').trim(), more = !own && Lc.locs.length > 1 ? Lc.locs : [];
  cols[2].push((draw, x, y, w) => {
    const tx = x + P6 + 15, tw = w - P6 * 2 - 15, addr = Lc.addr || (X.meet.addr || '').trim();
    let yy = y + P6 + CLF.cap * .78;
    if (draw) { pdfCallIco(doc, 'pin', x + P6, y + P6, 9, K.c3); lab('Locación', tx, yy); }
    yy += CLF.h3 * 1.25;
    if (more.length) for (const [n, ad] of more) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.bd); const t1 = lines(pdfSafe(n), tw, 2); if (draw) { doc.setTextColor(...INK); raw.text(t1, tx, yy); } yy += t1.length * CLF.bd * 1.25;
      if (ad) { doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.ft); const t2 = lines(pdfSafe(ad), tw, 2); if (draw) { doc.setTextColor(...K.c2); raw.text(t2, tx, yy); } yy += t2.length * CLF.ft * 1.3; }
      yy += 4;
    }
    else {
      if (Lc.name) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.h3); const t = lines(pdfSafe(Lc.name), tw, 2); if (draw) { doc.setTextColor(...INK); raw.text(t, tx, yy); } yy += t.length * CLF.h3 * 1.2 + 2; }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.bd);
      const t = lines(pdfSafe(addr || TBC), tw, 3);
      if (draw) { doc.setTextColor(...(addr ? INK : K.c2)); addr ? raw.text(t, tx, yy) : doc.text(t, tx, yy); }
      yy += t.length * CLF.bd * 1.3;
    }
    if (Lc.url) { if (draw) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.ft); doc.setTextColor(...K.acc); doc.text('Ver mapa', tx, yy + 1); doc.link(tx, yy - 6, doc.getTextWidth(trDone(tr('Ver mapa'))), 9, { url: Lc.url }); } yy += CLF.ft * 1.3; }
    return yy - y - CLF.ft + P6 + 4;
  });
  cols[2].push((draw, x, y, w) => {
    const tx = x + P6 + 15, tw = w - P6 * 2 - 15, hs = X.hosp;
    let yy = y + P6 + CLF.cap * .78;
    if (draw) { pdfCallIco(doc, 'hosp', x + P6, y + P6, 9, K.c3); lab('Centro de salud', tx, yy); }
    yy += CLF.bd * 1.3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.bd);
    const t = lines(pdfSafe(hs.name || TBC), tw, 2); if (draw) { doc.setTextColor(...(hs.name ? INK : K.c2)); hs.name ? raw.text(t, tx, yy) : doc.text(t, tx, yy); } yy += t.length * CLF.bd * 1.25;
    for (const v of [hs.addr, hs.phone].filter(Boolean)) { doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.ft); const t2 = lines(pdfSafe(v), tw, 2); if (draw) { doc.setTextColor(...K.c2); raw.text(t2, tx, yy); } yy += t2.length * CLF.ft * 1.3; }
    return yy - y - CLF.ft + P6 + 4;
  });
  // medir, luego dibujar: la caja entera, las líneas entre columnas y entre celdas
  const hs = cols.map((c, i) => c.map(f => f(false, xs[i], 0, ws[i])));
  const H = Math.max(...hs.map(a => a.reduce((s, v) => s + v, 0)));
  cols.forEach((c, i) => {
    let y = y0;
    c.forEach((f, j) => {
      const h = j === c.length - 1 ? y0 + H - y : hs[i][j];
      if (j && !ap) { doc.setDrawColor(...CL_LINE); doc.setLineWidth(CL_LW.in); doc.line(xs[i], y, xs[i] + ws[i], y); }
      f(true, xs[i], y, ws[i], h); y += h;
    });
  });
  // (lote AI) Apple: solo una línea fina (el gris de los separadores) entre las columnas, sin el marco
  if (ap) { doc.setDrawColor(...V2K.line); doc.setLineWidth(.8); doc.line(xs[1], y0, xs[1], y0 + H); doc.line(xs[2], y0, xs[2], y0 + H); doc.roundedRect(M, y0, W - 2 * M, H, 3, 3, 'S'); doc.setTextColor(...INK); return y0 + H + 6; }   // (versión 2) el marco de la app
  doc.setDrawColor(...CL_LINE); doc.setLineWidth(CL_LW.in); doc.line(xs[1], y0, xs[1], y0 + H); doc.line(xs[2], y0, xs[2], y0 + H);
  doc.setLineWidth(CL_LW.out); doc.rect(M, y0, W - 2 * M, H, 'S');
  doc.setTextColor(...INK);
  return y0 + H;
}
/* (lote AI) Apple: el centro de salud y los canales de radio al final de la hoja, como el pie de antes (lotes Y a AG):
   bajo una regla fina de tinta, cada uno con su ícono, su etiqueta y su dato. draw: false, solo lo mide. Devuelve dónde
   sigue */
function pdfCallHR(doc, X, y, draw = true) {
  const W = doc.internal.pageSize.getWidth(), M = CL_M, K = clTones(), raw = doc._raw || doc, h = X.hosp;
  const lab = (t, x, yy) => clLab(doc, t, x, yy), xr = M + Math.round((W - 2 * M) * .55), w1 = xr - M - 30, w2 = W - M - xr - 16;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.bd);
  const nm = h.name ? doc.splitTextToSize(pdfSafe(h.name), w1).slice(0, 2) : [];
  doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.ft);
  const sub = [h.phone, h.addr].filter(Boolean).map(pdfSafe).join('     '), sl = sub ? doc.splitTextToSize(sub, w1).slice(0, 2) : [];
  doc.setFontSize(CLF.bd);
  const rl = X.radio ? doc.splitTextToSize(pdfSafe(X.radio), w2).slice(0, 4) : [];
  const y0 = y + 12, nl = Math.max(1, nm.length), hL = 18 + nl * CLF.bd * 1.2 + sl.length * CLF.ft * 1.3, hR = 18 + Math.max(1, rl.length) * CLF.bd * 1.25;
  if (draw) {
    doc.setDrawColor(...INK); doc.setLineWidth(.6); doc.line(M, y, W - M, y);
    pdfCallIco(doc, 'hosp', M, y0 + 1, 9, K.c3); lab('Centro de salud', M + 16, y0 + 7);
    doc.setFont('helvetica', nm.length ? 'bold' : 'normal'); doc.setFontSize(CLF.bd); doc.setTextColor(...(nm.length ? INK : K.c2));
    nm.length ? raw.text(nm, M + 16, y0 + 18) : doc.text('Por confirmar', M + 16, y0 + 18);
    if (sl.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.ft); doc.setTextColor(...K.c2); raw.text(sl, M + 16, y0 + 18 + nl * CLF.bd * 1.2 + 1); }
    pdfCallIco(doc, 'radio', xr, y0 + 1, 9, K.c3); lab('Canales de radio', xr + 16, y0 + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(CLF.bd); doc.setTextColor(...(rl.length ? INK : K.c2));
    rl.length ? raw.text(rl, xr + 16, y0 + 18) : doc.text('Por confirmar', xr + 16, y0 + 18);
    doc.setTextColor(...INK);
  }
  return y0 + Math.max(hL, hR) + 4;
}
function pdfCall(opts = {}) {
  const doc = newDoc();
  const cd = callDays(), { days } = cd;
  const list = PDF_SEL && PDF_SEL.days ? days.map((_, i) => i).filter(pdfDayOk) : opts.all ? days.map((_, i) => i) : [callRef()];
  const YEL = mixc(rgb(lgCol('call', 'note')), PDF_WHITE, .4), YEL2 = mixc(YEL, PDF_WHITE, .45), LIGHT = rgb(lgCol('plan', 'ev'));
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = CL_M;
  // cada hoja con su versión: la misma si nada cambió desde la última que salió; si cambió, la siguiente (tab-call.js).
  // Solo algunas páginas, o dentro del ZIP del proyecto: no es un envío, así que no estrena número
  const rec = !(PDF_SEL && PDF_SEL.pages) && !(typeof OFFER_CAPTURE !== 'undefined' && OFFER_CAPTURE);
  const vers = Object.fromEntries(list.map(n => [n, callVer(n, cd, rec)]));
  PDF_CALL_DONE = { list, vers };
  // (lote AI) el estilo de la hoja: Apple (el de entrada) o Excel
  const AP = !(typeof callXL === 'function' && callXL());
  const K = clTones(), GAP = AP ? 12 : 8, MG = { left: M, right: M, top: M, bottom: M };
  // (lote AH) las tablas de la hoja, como una planilla: líneas negras entre filas y columnas, cada tabla encerrada con
  // una línea más gruesa; el título de cada cuadro en una banda gris y la cabecera de sus columnas en gris muy claro
  const PAD = AP ? { top: 4.6, bottom: 4.6, left: 6, right: 6 } : { top: 3.8, bottom: 3.8, left: 5, right: 5 };
  // (lote AI) Apple, como en los lotes Y a AG: sin fondo en los títulos de las columnas (chicos y en el gris más claro) y
  // filas con aire separadas por una línea fina; sin rejilla ni marco
  const HL = { top: 0, right: 0, bottom: .5, left: 0 };
  const TB = AP ? { theme: 'plain', styles: { font: 'helvetica', fontSize: CLF.bd, textColor: INK, lineColor: K.sep, lineWidth: HL, cellPadding: PAD, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: false, textColor: K.c3, fontStyle: 'bold', fontSize: CLF.cap, lineColor: K.sep, lineWidth: HL, cellPadding: { top: 5, bottom: 4, left: 6, right: 6 }, valign: 'bottom' },
    bodyStyles: {}, alternateRowStyles: { fillColor: PDF_WHITE }, margin: MG, showHead: 'everyPage' }
    : { theme: 'grid', styles: { font: 'helvetica', fontSize: CLF.bd, textColor: INK, lineColor: CL_LINE, lineWidth: CL_LW.in, cellPadding: PAD, overflow: 'linebreak', valign: 'top', fillColor: PDF_WHITE },
    headStyles: { fillColor: CL_HEADF, textColor: INK, fontStyle: 'bold', fontSize: CLF.cap, lineColor: CL_LINE, lineWidth: CL_LW.in, cellPadding: { top: 3.4, bottom: 3, left: 5, right: 5 }, valign: 'bottom' },
    bodyStyles: {}, alternateRowStyles: { fillColor: PDF_WHITE }, tableLineColor: CL_LINE, tableLineWidth: CL_LW.out, margin: MG, showHead: 'everyPage' };
  const bandC = (t, cs, st) => ({ content: t, colSpan: cs, styles: { fillColor: CL_BAND, fontSize: CLF.bd, fontStyle: 'bold', halign: 'left', valign: 'middle', cellPadding: { top: 4, bottom: 4, left: 6, right: 6 }, ...(st || {}) } });
  const withLine = (c, col) => c && typeof c === 'object' ? { ...c, styles: { ...(c.styles || {}), lineColor: col } } : { content: c || '', styles: { lineColor: col } };
  // (lote AI) Apple: los títulos de sección como en la pantalla, en la letra de la app, con su dato en gris a la derecha y
  // una regla fina de tinta (pdfSec sin cuadro)
  const CL_SEC = { font: 'helvetica', fs: CLF.h3, rfs: CLF.ft, rcol: K.c2, line: AP ? V2K.line : INK, lw: AP ? .8 : .6, gap: 6, after: 10, box: false };
  list.forEach((n, pi) => {
    if (pi) doc.addPage();
    const X = callSheetData(n), m = X.meet;
    let y = pdfCallHead(doc, X, vers[n], M, AP) + GAP;
    // una tabla (o un cuadro): si su comienzo no entra en lo que queda de la página, empieza en la siguiente
    const need = h => { if (y + h > H - M) { doc.addPage(); y = M; } };
    const T = (o, min = 50) => { need(min); doc.autoTable({ ...TB, startY: y, ...o, styles: { ...TB.styles, ...(o.styles || {}) }, headStyles: { ...TB.headStyles, ...(o.headStyles || {}) } }); y = doc.lastAutoTable.finalY + GAP; };
    // (lote AI) Apple: una sección con su título y su regla (lo que sigue, debajo); min: lo que necesita para empezar
    const sec = (title, right, min = 70) => { need(min); y = pdfSec(doc, y, title, { x0: M, x1: W - M, right, need: 0, st: CL_SEC }); };
    const sub = (t, col, tr0, st) => ({ t, fs: CLF.ft, col: col || K.c2, ...(st ? { st } : {}), ...(tr0 === false ? { tr: false } : {}) });
    const TBC = 'Por confirmar';
    // la franja de la tira a lo alto de cada fila de la escena y sus planos, y los enlaces (mapa, punto de encuentro)
    const hooks = {
      didDrawCell: d => {
        const r = d.cell.raw; if (d.section !== 'body' || !r) return;
        if (r._bar) { doc.setFillColor(...r._bar); if (AP) doc.rect(d.cell.x, d.cell.y, 2.2, d.cell.height, 'F'); else doc.rect(d.cell.x + .3, d.cell.y + .3, 2.4, d.cell.height - .6, 'F'); }
        if (r._url) doc.link(d.cell.x, d.cell.y, d.cell.width, d.cell.height, { url: r._url });
      },
    };
    const barOfRGB = c => mixc(c, INK, .85);
    // una celda de varios estilos con lo que haya (vacía, un espacio)
    const richOr = (R, st) => { R = R.filter(Boolean); return pdfRich(R.length ? R : [{ t: ' ', tr: false }], st); };
    // 1. (lote AH) los jefes de área, con su teléfono, de a cuatro por fila
    if (X.heads.length) {
      const cells = X.heads.map(h => pdfRich([{ t: h.role, fs: CLF.cap, st: 'bold', col: K.c3 }, { t: h.name, st: 'bold', fs: CLF.bd, tr: false }, h.phone ? { t: h.phone, fs: CLF.ft, col: K.c2, tr: false } : null]));
      const body = []; for (let i = 0; i < cells.length; i += 4) body.push([0, 1, 2, 3].map(j => cells[i + j] || ''));
      const cw = (W - 2 * M) / 4;
      if (AP) { sec('Jefes de área', '', 60); T({ body, styles: { lineWidth: 0, cellPadding: { top: 3, bottom: 6, left: 6, right: 6 } }, columnStyles: { 0: { cellWidth: cw }, 1: { cellWidth: cw }, 2: { cellWidth: cw }, 3: { cellWidth: cw } } }, 0); }
      else T({ head: [[bandC('Jefes de área', 4)]], body, columnStyles: { 0: { cellWidth: cw }, 1: { cellWidth: cw }, 2: { cellWidth: cw }, 3: { cellWidth: cw } } });
    }
    // 2. la nota del 1.er asistente, en su cuadro amarillo. (lote AI) Apple: al centro, en su recuadro amarillo de esquinas
    // redondeadas, con el título adentro (como en los lotes Y a AG)
    const notes = (X.dd.notes || '').trim();
    if (notes && AP) T({ body: [[pdfRich([{ t: 'Nota para el equipo', st: 'bold', fs: CLF.bd, tr: 1 }, ...notes.split('\n').filter(t => t.trim()).map(t => ({ t, fs: 14 * CLK, tr: false }))], { halign: 'center', lineWidth: 0, cellPadding: { top: 9, bottom: 10, left: 14, right: 14 } })]],
      margin: { ...MG, left: M + 64, right: M + 64 },
      willDrawCell: d => { if (d.section !== 'body') return; d.cell.styles.fillColor = false; doc.setFillColor(...YEL); doc.setDrawColor(...mixc(YEL, INK, .9)); doc.setLineWidth(.5); doc.roundedRect(d.cell.x, d.cell.y, d.cell.width, d.cell.height, 7, 7, 'FD'); } });
    else if (notes) T({ head: [[bandC('Nota para el equipo', 1, { fillColor: YEL, halign: 'center' })]], body: [[pdfRich(notes.split('\n').filter(t => t.trim()).map(t => ({ t, fs: CLF.bd, tr: false })), { fillColor: YEL2, halign: 'center' })]] });
    // 3. el cronograma: la hora (eventos) o el número de escena con su hora; el encabezado, la sinopsis y el reparto con
    // su número; D/N y las páginas. Los traslados, una banda celeste con su dirección y el mapa. Debajo de cada escena,
    // sus planos: el plano con su hora, la miniatura, la descripción técnica y la acción, el lente y el sonido, y los
    // personajes. Cada escena con sus planos es un bloque: si no cabe al pie de la página, pasa entera a la siguiente.
    // (lote AH) Sin el título «Cronograma» y con lo cambiado en la hoja (lo escrito a mano no se traduce)
    const all = [...X.sched.rows, ...X.sched.close], blocks = [];
    const th = callThumbs() && typeof thumbCached === 'function', TW = 48, TH = TW * 9 / 16;
    const PS = AP ? { top: 6, bottom: 6, left: 6, right: 6 } : { top: 5, bottom: 5, left: 5, right: 5 }, PSH = AP ? { top: 4, bottom: 4, left: 6, right: 6 } : { top: 3.5, bottom: 3.5, left: 5, right: 5 };
    const CL0 = AP ? 10 : 8;   // el aire a la izquierda del número (la franja de la tira va ahí)
    const ovT = (o, f, x) => ({ ...x, t: o.v[f], ...(o.ov[f] ? { tr: false } : {}) });
    all.forEach((r, j) => {
      if (r.free) {
        // (lote AH) una fila libre: lo que se escribió, sin el color de una tira
        blocks.push([[richOr([r.v.code ? { t: r.v.code, st: 'bold', fs: CLF.h3, tr: false } : null, r.x.t ? sub(r.x.t, INK, false, 'bold') : null], { cellPadding: { ...PS, left: CL0, right: 4 } }),
          { content: pdfSafe(r.v.ie || ''), styles: { fontSize: CLF.ft, fontStyle: 'bold', cellPadding: PS } },
          richOr([r.v.set ? { t: r.v.set, st: 'bold', fs: CLF.bd, tr: false } : null, r.v.syn ? sub(r.v.syn, K.c2, false) : null, r.v.cast ? { t: r.v.cast, fs: CLF.ft, st: 'bold', tr: false } : null], { cellPadding: PS }),
          { content: pdfSafe(r.v.dn || ''), styles: { fontSize: CLF.ft, fontStyle: 'bold', cellPadding: PS } }, { content: pdfSafe(r.v.pages || ''), styles: { fontStyle: 'bold', halign: 'right', cellPadding: PS } }]]);
        return;
      }
      if (isMove(r)) {
        const to = callMoveTo(all, j, m), st = { fillColor: CL_CEL, textColor: INK };
        blocks.push([[{ content: pdfSafe(r.t0 || r.t || ''), styles: { ...st, fontStyle: 'bold' } }, { ...pdfRich([{ segs: [{ ...ovT(r, 'name'), st: 'bold' }, ...(r.v.det ? [{ t: '   ' + r.v.det, tr: false }] : []), ...(to ? [{ t: '   → ', tr: false }, { t: to.name, st: 'bold' }, ...(to.addr ? [{ t: '  ·  ' + to.addr, tr: false }] : []), ...(to.url ? [{ t: '   Ver mapa', st: 'bold', col: K.acc }] : [])] : [])] }], { ...st, colSpan: 4 }), _url: to && to.url }]]);
        return;
      }
      if (r.ev) { const ef = mixc(pdfHl(r.it) || LIGHT, PDF_WHITE, .7), st = { fillColor: ef, textColor: inkOn(ef) }; blocks.push([[{ content: pdfSafe(r.t0 || r.t || ''), styles: { ...st, fontStyle: 'bold' } }, pdfRich([{ segs: [{ ...ovT(r, 'name'), st: 'bold' }, ...(r.v.det ? [{ t: '   ' + r.v.det, col: mutedOn(ef), tr: false }] : [])] }], { ...st, colSpan: 4 })]]); return; }
      const col = rgb(r.col), V = r.v, bar = barOfRGB(col);
      // (lote Z) la fila de la escena a todo color, como su tira en el plan de rodaje (los planos de debajo, en blanco)
      const SC = { fillColor: col, textColor: inkOn(col), cellPadding: PS }, ink = inkOn(col), mut = mutedOn(col);
      const rows = [[{ ...pdfRich([{ t: V.code, st: 'bold', fs: CLF.h3, tr: false, col: ink }, (r.t0 || r.t) ? sub(r.t0 || r.t, ink, false, 'bold') : null], { ...SC, cellPadding: { ...PS, left: CL0, right: 4 } }), _bar: bar },
        { content: V.ie, styles: { ...SC, fontSize: CLF.ft, fontStyle: 'bold' } },
        pdfRich([{ ...ovT(r, 'set'), t: V.set + (r.it.sp && !r.ov.set ? ` (parte ${r.it.sp})` : ''), st: 'bold', fs: CLF.bd, col: ink }, V.syn ? sub(V.syn, mut, r.ov.syn ? false : undefined) : null, V.cast ? { t: V.cast, fs: CLF.ft, st: 'bold', col: ink, tr: false } : null], SC),
        { content: V.dn, styles: { ...SC, fontSize: CLF.ft, fontStyle: 'bold' } }, { content: pdfSafe(V.pages), styles: { ...SC, fontStyle: 'bold', halign: 'right' } }]];
      for (const x of r.shots || []) {
        const u = th && x.sh ? thumbCached(x.sh) : null, xv = x.v;
        // el set del plano solo si no es ya la locación que dice la escena
        const setX = !x.free && r.set && !setOf(r.s).toLowerCase().includes(r.set.toLowerCase()) ? r.set : '';
        const desc = x.free || x.ov.desc ? [{ t: xv.desc, st: 'bold', tr: false }] : [{ t: x.size || '', st: 'bold' }, ...(x.det.length ? [{ t: (x.size ? ' · ' : '') + x.det.join(' · '), col: K.c2 }] : [])];
        rows.push([{ ...pdfRich([{ t: x.code || '', st: 'bold', fs: CLF.ft, tr: false }, X.shotT && x.t0 ? { t: x.t0, fs: CLF.cap, col: K.c2, tr: false } : null], { cellPadding: { ...PSH, left: CL0, right: 4 } }), _bar: bar },
          { ...pdfRich([{ fs: CLF.ft, segs: desc.filter(s => s.t) }, xv.act ? { t: xv.act, fs: CLF.ft, tr: false } : null, setX ? { fs: CLF.cap, segs: [{ t: 'Set: ', col: K.c3 }, { t: setX, col: K.c2, tr: false }] } : null].filter(p => p && (p.t || (p.segs && p.segs.length))),
            { colSpan: 2, cellPadding: { ...PSH, left: u ? TW + 12 : PSH.left }, ...(u ? { minCellHeight: TH + 8 } : {}) }), _img: u },
          xv.lens || xv.snd ? pdfRich([xv.lens ? { t: xv.lens, fs: CLF.ft, tr: false } : null, xv.snd ? { t: SND_NAME[xv.snd] || xv.snd, fs: CLF.cap, col: K.c2 } : null], { cellPadding: PSH }) : { content: '', styles: { cellPadding: PSH } },
          { content: pdfSafe(xv.cast || ''), styles: { fontSize: CLF.ft, halign: 'right', cellPadding: PSH } }]);
      }
      // (lote AI) Apple: entre la escena y sus planos, y entre los planos, la línea más clara; la de abajo del último, la
      // de siempre
      blocks.push(AP ? rows.map((rw, i) => i < rows.length - 1 ? rw.map(c => withLine(c, K.sep2)) : rw) : rows);
    });
    if (!all.length) blocks.push([[{ content: X.free ? 'Sin filas.' : 'Jornada sin escenas.', colSpan: 5, styles: { textColor: K.c2 } }]]);
    const inf = dayInfo(X.de.keys, X.de.rows), nSc = X.free ? (X.dd.xrows || []).length : X.de.keys.length;
    // el wrap; (lote AI) en Apple, sobre una línea de tinta (como «Fin de jornada» antes)
    const LE = AP ? { lineWidth: { top: .6, right: 0, bottom: 0, left: 0 }, lineColor: INK } : {};
    blocks.push([[{ content: pdfSafe(X.end || ''), styles: { fontStyle: 'bold', cellPadding: PS, ...LE } }, pdfRich([{ segs: [{ t: 'Wrap · fin de jornada', st: 'bold' }, { t: '  ·  ' + tr(X.free ? `${nSc} ${nSc === 1 ? 'fila' : 'filas'}` : `${nSc} ${nSc === 1 ? 'escena' : 'escenas'}`), col: K.c2 }] }], { colSpan: 3, cellPadding: PS, ...LE }),
      X.free ? { content: '', styles: { cellPadding: PS, ...LE } } : pdfRich([{ segs: [{ t: 'Total ', fs: CLF.cap, col: K.c3 }, { t: fmtEighths(inf.e), st: 'bold', tr: false }] }], { halign: 'right', cellPadding: PS, ...LE })]]);
    // con planos, una segunda fila de títulos: lo que dice cada columna en las filas de los planos. (lote AI) En Apple, la
    // línea va debajo de la última fila de títulos
    const two = X.sched.byShot, h1 = AP && two ? { lineWidth: 0, cellPadding: { top: 5, bottom: 1.5, left: 6, right: 6 } } : {};
    const h2 = AP ? { fontStyle: 'normal', cellPadding: { top: 0, bottom: 4, left: 6, right: 6 } } : { fontStyle: 'normal', fillColor: PDF_WHITE };
    const head = [[{ content: 'Hora · Esc.', styles: h1 }, { content: 'I/E', styles: h1 }, { content: 'Escena', styles: h1 }, { content: 'D/N', styles: h1 }, { content: 'Págs.', styles: { ...h1, halign: 'right' } }],
      ...(two ? [[{ content: 'Plano', styles: h2 }, { content: 'Descripción y acción', colSpan: 2, styles: h2 }, { content: 'Lente · Sonido', styles: h2 }, { content: 'Personajes', styles: { ...h2, halign: 'right' } }]] : [])];
    need(90);
    y = pdfBlocks(doc, y, { ...TB, margin: MG, head, rowPageBreak: 'avoid', ...hooks,
      didDrawCell: d => { hooks.didDrawCell(d); const r = d.cell.raw; if (d.section === 'body' && r && r._img) { try { doc.addImage(r._img, r._img.startsWith('data:image/png') ? 'PNG' : 'JPEG', d.cell.x + PSH.left, d.cell.y + 4, TW, TH); } catch (e) { PDF_MISS++; } } },
      columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 30 }, 3: { cellWidth: AP ? 66 : 62 }, 4: { cellWidth: AP ? 56 : 52, halign: 'right' } } }, blocks) + GAP;
    // 5. (lote AH) la citación en dos cuadros: primero los talentos (el reparto), con sus horarios; después el equipo
    // técnico por área (el área, una fila gris con su citación). El teléfono con el correo debajo, más chico.
    // (lote AI) Apple: dos secciones con su título y su regla; el área, chica y en el gris más claro, con su citación
    const CC = { halign: 'center' }, tmc = (v, b) => ({ content: v || '', styles: { ...CC, ...(b ? { fontStyle: 'bold' } : {}) } });
    const telMail = (t, e) => { t = (t || '').trim(); e = (e || '').trim(); if (!t && !e) return ''; const at = e.indexOf('@'), long = e.length > 22 && at > 0;
      return pdfRich([t ? { t, fs: CLF.bd, tr: false } : null, ...(e ? (long ? [{ t: e.slice(0, at), fs: CLF.cap, col: K.c2, tr: false }, { t: e.slice(at), fs: CLF.cap, col: K.c2, tr: false }] : [{ t: e, fs: CLF.cap, col: K.c2, tr: false }]) : [])]); };
    const tb = X.talent.map(r => [r.actor ? { content: pdfSafe(r.actor), styles: { fontStyle: 'bold' } } : pdfRich([{ t: TBC, col: K.c2 }]),
      pdfRich([{ segs: [...(r.num ? [{ t: r.num + '  ', st: 'bold', col: K.c2, tr: false }] : []), { t: r.role || '', st: 'bold', tr: false }] }, r.sc && r.sc.length ? { t: `Esc. ${r.sc.join(', ')}`, fs: CLF.cap, col: K.c2 } : null]),
      tmc(r.pu), tmc(r.call || X.call, true), tmc(r.ves), tmc(r.mq), tmc(r.ready), telMail(r.phone, r.email), { content: pdfSafe(r.obs || ''), styles: { fontSize: CLF.ft } }]);
    if (!tb.length) tb.push([{ content: 'Sin reparto.', colSpan: 9, styles: { textColor: K.c2 } }]);
    if (X.fig) tb.push([{ content: pdfSafe(`Figuración: ${X.fig}`), colSpan: 9, styles: { textColor: K.c2, fontSize: CLF.ft } }]);
    const TC = { cellPadding: AP ? { top: 4.6, bottom: 4.6, left: 2, right: 2 } : { top: 3.8, bottom: 3.8, left: 1, right: 1 }, halign: 'center' }, HC = { halign: 'center', cellPadding: AP ? { top: 5, bottom: 4, left: 1, right: 1 } : { top: 3.4, bottom: 3, left: 1, right: 1 } };
    const talH = ['Nombre', 'Personaje', ...['Recojo', 'Llamado', 'Vest.', 'Maq.', 'Listos'].map(t => ({ content: t, styles: HC })), 'Teléfono', 'Observaciones'];
    const talCS = { 0: { cellWidth: 94 }, 1: { cellWidth: 94 }, 2: { cellWidth: 34, ...TC }, 3: { cellWidth: 38, ...TC }, 4: { cellWidth: 32, ...TC }, 5: { cellWidth: 32, ...TC }, 6: { cellWidth: 34, ...TC }, 7: { cellWidth: 90 } };
    const nTal = X.talent.length ? tr(`${X.talent.length} ${X.talent.length === 1 ? 'persona' : 'personas'}`) : '';
    if (AP) { sec('Talentos', trDone(nTal), 70); T({ head: [talH], body: tb, rowPageBreak: 'avoid', columnStyles: talCS }, 0); }
    else T({ head: [[bandC(trDone(tr('Talentos')) + (nTal ? '  ·  ' + nTal : ''), 9)], talH], body: tb, rowPageBreak: 'avoid', columnStyles: talCS }, 60);
    const eb = [];
    for (const [name, l, dc] of X.crew) {
      if (AP) eb.push([{ content: pdfSafe(name), colSpan: 2, styles: { fontSize: CLF.cap, fontStyle: 'bold', textColor: K.c3, cellPadding: { top: 9, bottom: 2, left: 6, right: 6 } } }, { content: dc || '', styles: { fontSize: CLF.ft, fontStyle: 'bold', textColor: K.c2, halign: 'center', cellPadding: { top: 9, bottom: 2, left: 2, right: 2 } } }, { content: '', colSpan: 3 }]);
      else eb.push([{ content: pdfSafe(name), colSpan: 2, styles: { fontSize: CLF.ft, fontStyle: 'bold', fillColor: CL_BAND } }, { content: dc || '', styles: { fontSize: CLF.ft, fontStyle: 'bold', halign: 'center', fillColor: CL_BAND } }, { content: '', colSpan: 3, styles: { fillColor: CL_BAND } }]);
      for (const c of l) eb.push([{ content: pdfSafe(c.name || ''), styles: { fontStyle: 'bold' } }, { content: pdfSafe(c.role || ''), styles: { textColor: K.c2 } }, tmc(c.call, true), { content: pdfSafe(c.phone || '') }, { content: pdfSafe(c.email || ''), styles: { fontSize: CLF.ft } }, { content: pdfSafe(c.obs || ''), styles: { fontSize: CLF.ft } }]);
    }
    if (!eb.length) eb.push([{ content: TBC, colSpan: 6, styles: { textColor: K.c2 } }]);
    const nCrew = X.crew.reduce((a, [, l]) => a + l.length, 0), nCr = nCrew ? tr(`${nCrew} ${nCrew === 1 ? 'persona' : 'personas'}`) : '';
    const crH = ['Nombre', 'Cargo', { content: 'Llamado', styles: HC }, 'Teléfono', 'Correo', 'Observaciones'], crCS = { 0: { cellWidth: 112 }, 1: { cellWidth: 112 }, 2: { cellWidth: 44, halign: 'center' }, 3: { cellWidth: 84 }, 4: { cellWidth: 110 } };
    if (AP) { sec('Equipo técnico', trDone(nCr), 70); T({ head: [crH], body: eb, rowPageBreak: 'avoid', columnStyles: crCS }, 0); }
    else T({ head: [[bandC(trDone(tr('Equipo técnico')) + (nCr ? '  ·  ' + nCr : ''), 6)], crH], body: eb, rowPageBreak: 'avoid', columnStyles: crCS }, 60);
    // 6. (lote AH) al final, lo demás, cada cosa en su cuadro (lote AI: en Apple, en su sección): la utilería especial
    // (antes, bajo la cabecera)…
    if (X.propsTxt) { if (AP) { sec('Utilería especial', '', 50); T({ body: [[{ content: pdfSafe(X.propsTxt), styles: { lineWidth: 0, cellPadding: { top: 2, bottom: 2, left: 6, right: 6 } } }]] }, 0); } else T({ head: [[bandC('Utilería especial', 1)]], body: [[{ content: pdfSafe(X.propsTxt) }]] }); }
    // …el punto de encuentro (antes, en la cabecera): su dirección, su referencia, los enlaces (por su nombre, se tocan) y
    // hasta dos fotos chicas
    const mAddr = (m.addr || '').trim(), mNote = (m.note || '').trim(), mLinks = (m.links || []).map(safeUrl).filter(Boolean);
    const mPh = (m.ph || []).filter(q => FRAMES[clPhKey(X.d.id, q.id)]).slice(0, 2);
    if (mAddr || mNote || mLinks.length || mPh.length) {
      const PW = 84, PH = PW * .75, NL = AP ? { lineWidth: 0 } : {}, txt = richOr([mAddr ? { t: mAddr, st: 'bold', tr: false } : null, mNote ? { t: mNote, fs: CLF.ft, col: K.c2, tr: false } : null, mLinks.length ? { t: mLinks.map(linkName).join('   '), fs: CLF.ft, st: 'bold', col: K.acc, tr: false } : null], NL);
      const row = mPh.length ? [{ ...txt, _links: mLinks }, { content: '', styles: { minCellHeight: PH + 8, ...NL }, _ph: mPh }] : [{ ...txt, _links: mLinks }];
      const mo = { body: [row], ...(mPh.length ? { columnStyles: { 1: { cellWidth: mPh.length * (PW + 4) + 8 } } } : {}),
        didDrawCell: d => {
          const r = d.cell.raw; if (d.section !== 'body' || !r) return;
          // los enlaces por su nombre («Google Maps   Waze»): cada uno se toca (en la última línea de la celda)
          if (r._links && r._links.length) { doc.setFont('helvetica', 'bold'); doc.setFontSize(CLF.ft); const rw = clRawW(doc); let xx = d.cell.x + PAD.left; const yy = d.cell.y + d.cell.height - PAD.bottom - CLF.ft * 1.1;
            r._links.forEach(u => { const t = linkName(u), w = rw(t); doc.link(xx, yy, w, CLF.ft * 1.2, { url: u }); xx += w + rw('   '); }); }
          if (r._ph) r._ph.forEach((q, i) => { const k2 = Math.min(PW / (q.w || 4), PH / (q.h || 3)), iw = (q.w || 4) * k2, ih = (q.h || 3) * k2, xx = d.cell.x + 4 + i * (PW + 4);
            try { doc.addImage(photoForPdf(clPhKey(X.d.id, q.id)), 'JPEG', xx + (PW - iw) / 2, d.cell.y + 4 + (PH - ih) / 2, iw, ih, undefined, 'FAST'); } catch (e) { if (typeof PDF_MISS !== 'undefined') PDF_MISS++; } });
        } };
      if (AP) { sec('Punto de encuentro', '', 60); T(mo, 0); } else T({ head: [[bandC('Punto de encuentro', row.length)]], ...mo });
    }
    // …la movilidad (lote W)…
    if (X.mov.length) {
      const nV = tr(`${X.mov.length} ${X.mov.length === 1 ? 'vehículo' : 'vehículos'}`), mvH = ['Vehículo', 'Conductor', 'Pasajeros'];
      const mv = { body: X.mov.map((x, i) => [pdfRich([{ segs: [{ t: `${i + 1}  `, st: 'bold', col: K.c2, tr: false }, { t: x.name || 'Vehículo', st: 'bold', tr: !x.name }] }]), pdfSafe(x.driver || ''), pdfSafe(x.pax.join(', '))]),
        rowPageBreak: 'avoid', columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 130 } } };
      if (AP) { sec('Movilidad', trDone(nV), 60); T({ head: [mvH], ...mv }, 0); } else T({ head: [[bandC(trDone(tr('Movilidad')) + '  ·  ' + nV, 3)], mvH], ...mv });
    }
    // …y el centro de salud y los canales de radio (lote AH: antes, al pie de cada página). (lote AI) En Apple, bajo una
    // regla de tinta, como el pie de antes
    const h = X.hosp;
    // (como el pie que era, puede bajar hasta casi el borde de la hoja: así no pasa sola a una página nueva por unos puntos)
    if (AP) { if (y + pdfCallHR(doc, X, 0, false) > H - 14) { doc.addPage(); y = M; } y = pdfCallHR(doc, X, y); }
    else T({ head: [['Centro de salud', 'Canales de radio']], body: [[pdfRich([h.name ? { t: h.name, st: 'bold', tr: false } : { t: TBC, col: K.c2 }, ...[h.phone, h.addr].filter(Boolean).map(t => ({ t, fs: CLF.ft, col: K.c2, tr: false }))]),
      X.radio ? { content: pdfSafe(X.radio) } : pdfRich([{ t: TBC, col: K.c2 }])]], columnStyles: { 0: { cellWidth: (W - 2 * M) * .55 } } }, 44);
    // (lote AJ) la frase del día, en su recuadro, y al final de todo el avance de la jornada siguiente
    {
      const q = pdfSafe('«' + X.quote + '»'), qs = { halign: 'center', fontStyle: 'italic', fontSize: CLF.h3 };
      if (AP) { sec('Frase del día', '', 60); T({ body: [[{ content: q, styles: { ...qs, lineWidth: 0, cellPadding: { top: 4, bottom: 8, left: 24, right: 24 } } }]] }, 0); }
      else T({ head: [[bandC('Frase del día', 1, { halign: 'center' })]], body: [[{ content: q, styles: { ...qs, cellPadding: { top: 7, bottom: 8, left: 20, right: 20 } } }]] }, 60);
    }
    // 4. el avance: las jornadas elegidas (de entrada, la siguiente) o «Fin de rodaje»
    for (const A of X.advs) {
      const tl = trDone(tr(`Avance · Jornada ${A.n}`) + (A.date ? ' · ' + advDate(A) : '')), tx = trDone([A.call ? tr(`Llamado general ${A.call}`) : tr('Llamado por confirmar'), ...A.locs].join('  ·  '));
      // (lote Z) cada escena del avance a todo color, como en el cronograma
      const ab = A.rows.map(r => { const col = rgb(r.col), SC = { fillColor: col, textColor: inkOn(col), cellPadding: PS };
        return [{ content: r.code, styles: { ...SC, fontStyle: 'bold', fontSize: CLF.h3, cellPadding: { ...PS, left: CL0, right: 4 } }, _bar: barOfRGB(col) }, { content: r.ie, styles: { ...SC, fontSize: CLF.ft, fontStyle: 'bold' } },
          pdfRich([{ t: r.set, st: 'bold', fs: CLF.bd, col: inkOn(col) }, r.syn ? sub(r.syn, mutedOn(col)) : null], SC), { content: r.dn, styles: { ...SC, fontSize: CLF.ft, fontStyle: 'bold' } }, { content: pdfSafe(r.cast.join(', ')), styles: { ...SC, fontStyle: 'bold' } }, { content: fmtEighths(r.e8), styles: { ...SC, halign: 'right', fontStyle: 'bold' } }]; });
      if (!ab.length) ab.push([{ content: 'Jornada sin escenas.', colSpan: 6, styles: { textColor: K.c2 } }]);
      ab.push([pdfRich([{ segs: [{ t: 'Total: ', col: K.c2 }, { t: `${fmtEighths(A.e8)} págs.`, st: 'bold' }, ...(A.cast.length ? [{ t: '     Reparto: ', col: K.c2 }, { t: A.cast.map(c => (c.n ? c.n + ' ' : '') + c.name).join(', '), col: K.c2 }] : [])] }], { colSpan: 6, halign: 'right', fontSize: CLF.ft, ...(AP ? { lineWidth: 0 } : {}) })]);
      const cols = ['Esc.', 'I/E', 'Escena', 'D/N', 'Reparto', { content: 'Págs.', styles: { halign: 'right' } }], cs = { 0: { cellWidth: 38 }, 1: { cellWidth: 30 }, 3: { cellWidth: 54 }, 4: { cellWidth: 62 }, 5: { cellWidth: 52 } };
      // (lote AI) Apple: el título de la jornada en su sección, con el llamado y las locaciones a la derecha
      if (AP) { sec(tl, tx, 80); T({ head: [cols], body: ab, rowPageBreak: 'avoid', ...hooks, columnStyles: cs }, 0); }
      else T({ head: [[bandC(pdfSafe(tl + '   ' + tx), 6)], cols], body: ab, rowPageBreak: 'avoid', ...hooks, columnStyles: cs }, 80);
    }
    if (!X.advs.length && X.lastDay) {
      const fin = [[{ content: 'Fin de rodaje', styles: { fontStyle: 'bold', fontSize: CLF.h3, halign: 'center', ...(AP ? { lineWidth: 0 } : {}) } }]];
      if (AP) { sec('Avance de la jornada siguiente', '', 50); T({ body: fin }, 0); } else T({ head: [[bandC('Avance de la jornada siguiente', 1)]], body: fin });
    }
  });
  const one = callSheet(list[0], cd);
  return { doc, name: fileSafe(P.meta.title) + (opts.all ? '_hojas_de_llamado.pdf' : one && one.free ? `_hoja_de_llamado_${fileSafe(callSheetName(one))}.pdf` : `_hoja_de_llamado_J${(list[0] || 0) + 1}.pdf`) };
}
