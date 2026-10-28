/* ============================================================
   EXPORTACIÓN A PDF (jsPDF + autoTable)
   ============================================================ */
let PDF_MISS = 0;     // imágenes que no entraron al PDF (se avisa al terminar)
/* el generador de PDF (jsPDF + autoTable, ~115 kB) no frena el arranque: se carga en segundo plano unos
   segundos después de abrir, o al exportar si todavía no llegó */
let PDFLIB_P = null;
function loadPdfLib() {
  // en la web con servidor, las letras de los PDF (pdf-fuente*.js) van aparte en lib/pdf-fuentes-<huella>.js (build.sh): se bajan
  // con jsPDF y no en app.js (eran ~640 kB que todos descargaban al abrir la app). En escritorio y en Claude, van dentro
  const fonts = () => typeof pdfFonts === 'function' && typeof pdfFontX === 'function';
  const ok = () => !!(window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable) && fonts();
  if (ok()) return Promise.resolve(true);
  if (PDFLIB_P) return PDFLIB_P;
  const local = DESK || typeof LOCAL_LIBS !== 'undefined';
  const urls = local ? ['lib/jspdf.umd.min.js', 'lib/jspdf.plugin.autotable.min.js']
    : ['https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js', 'https://cdn.jsdelivr.net/npm/jspdf-autotable@5.0.9/dist/jspdf.plugin.autotable.min.js'];
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { s.remove(); rej(new Error(src)); }; document.head.appendChild(s); });
  return (PDFLIB_P = (async () => {
    if (!(window.jspdf && window.jspdf.jsPDF)) await load(urls[0]);
    if (!(window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable)) await load(urls[1]);
    if (!fonts() && local) await load('lib/pdf-fuentes-' + PDFF_V + '.js');
    return ok();
  })().catch(e => { console.warn('PDF:', e); PDFLIB_P = null; return false; }));
}
setTimeout(() => { const go = () => loadPdfLib(); if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 8000 }); else go(); }, 4000);
const PDF_MAP = { '—': '-', '–': '-', '‒': '-', '‐': '-', '“': '"', '”': '"', '„': '"', '«': '«', '»': '»', '‘': "'", '’': "'", '′': "'", '″': '"', '•': '-', ' ': ' ' };
function pdfSafe(s, mono) {
  let out = '';
  for (const ch of String(s ?? '')) {
    if (PDF_MAP[ch] != null) { out += PDF_MAP[ch]; continue; }
    const c = ch.codePointAt(0);
    if (c <= 255) { out += ch; continue; }
    if (!mono && ch === '€') { out += 'EUR'; continue; }
    if (!mono && ch === '…') { out += '...'; continue; }
    if (!mono && (ch === '→' || ch === '⟶')) { out += '->'; continue; }
    out += mono ? '?' : '';
  }
  return out;
}
const rgb = hex => { const h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const tint = (hex, a) => rgb(hex).map(v => Math.round(255 - (255 - v) * a));
// los colores de la app: tinta grafito, gris, líneas, el naranja de acento y el verde de «Rodado»
const INK = [34, 34, 34], MUTED = [100, 100, 100], ACC = rgb('#D4370F'), OKC = rgb('#1F6B3E');
const PDF_LINE = [221, 219, 215], PDF_BLACK = [34, 34, 34], PDF_WHITE = [255, 255, 255];
// las tiras de día y de noche, como en el plan, la hoja de llamado y la hoja de script de la app
// (los colores de la leyenda del plan: leyenda.js)
const stripRGB = s => rgb(s && s.dn === 'N' ? lgCol('plan', 'n') : lgCol('plan', 'd'));
const pdfHl = x => { const c = hlc(x); return c ? rgb(c) : null; };   // lo resaltado con un color de la leyenda
const mixc = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));
const SUP_DONE = [233, 244, 236];   // lo rodado, en un verde muy suave (como la fila marcada en la app)
/* ---------- la letra y el aire de los PDF (lote K) ----------
   Un solo sistema para todos los documentos: el cuerpo en 8,8 pt con interlineado 1,3; lo secundario en 7,9 pt y en
   gris legible; las cabeceras de tabla en 7,4 pt; celdas con 5 pt arriba y abajo y 6 a los lados; solo líneas
   horizontales finas (la rejilla queda donde es el formato: hoja de desglose, días por actor, calendario); 16 pt
   entre bloques. Antes: 7,5 a 8,5 pt, 3 a 4 pt de relleno y la rejilla entera: se leía amontonado */
const PF = { body: 8.8, small: 7.9, head: 8, sec: 11.5, lh: 1.3, gap: 16 };
const PAD = { top: 5, bottom: 5, left: 6, right: 6 };
const HAIR = { top: 0, right: 0, bottom: .5, left: 0 };   // la línea fina de abajo de cada fila
/* (lote AH) los documentos de producción en cuadro, tipo Excel (lo pidió Ronald): la cabecera en un cuadro cerrado,
   los títulos de sección en su cuadro y las tablas con la rejilla entera, todo con líneas negras bien visibles (columnas
   claras); la cabecera de las tablas en gris claro con letra negra en negrita. Se imprime igual en blanco y negro.
   GRID: el grosor de las líneas de las celdas y de los marcos (el ajuste de líneas de la persona las afina o engruesa) */
const PDF_RULE = [0, 0, 0], PDF_HEADF = [230, 230, 230], PDF_LABF = [244, 244, 244];
const GRID = { cell: .6, frame: 1 };
/* un cuadro con líneas negras: marco entero (fill: su fondo) */
function pdfBox(doc, x, y, w, h, fill, lw = GRID.frame) {
  doc.setDrawColor(...PDF_RULE); doc.setLineWidth(lw);
  if (fill) doc.setFillColor(...fill);
  doc.rect(x, y, w, h, fill ? 'FD' : 'S');
}
const pdfVLine = (doc, x, y1, y2, lw = GRID.frame) => { doc.setDrawColor(...PDF_RULE); doc.setLineWidth(lw); doc.line(x, y1, x, y2); };
/* lo secundario sobre un color (una tira de día o de noche, una barra): la tinta que se lee encima, aclarada hacia el
   fondo, siempre legible */
const mutedOn = f => mixc(inkOn(f), f, .66);
/* el número de la escena en un cuadro negro al comienzo de su franja (como en la app): la celda lleva _badge */
function pdfBadgeParse(d) {
  const r = d.cell.raw; if (d.section !== 'body' || !r || r._badge == null || d.cell._bp) return;
  d.cell._bp = 1;
  const k = String(r._badge); d.cell.text = d.cell.text.map((t, i) => i ? t : t.replace(k, '').replace(/^\s+/, ''));
  const pd = d.cell.styles.cellPadding, top = typeof pd === 'object' && pd.top != null ? pd.top : 5.5;
  d.cell.styles.cellPadding = { top, bottom: typeof pd === 'object' && pd.bottom != null ? pd.bottom : 5.5, right: 6, left: 12 + Math.max(14, k.length * 5.4 + 7) };
}
function pdfBadgeDraw(doc, d) {
  const r = d.cell.raw; if (d.section !== 'body' || !r || r._badge == null || d.cell._bd) return;
  d.cell._bd = 1;
  const k = String(r._badge), c = d.cell, fs = Math.min(9, c.styles.fontSize || 8.5);
  doc.setFont('title', 'bold'); doc.setFontSize(fs + .5);
  const w = Math.max(14, doc.getTextWidth(k) + 7), h = fs + 6;
  const by = c.y + Math.max(3, c.padding('top') - 2.5);
  doc.setFillColor(...PDF_BLACK); doc.rect(c.x + 6, by, w, h, 'F');
  doc.setTextColor(255, 255, 255); doc.text(k, c.x + 6 + w / 2, by + h / 2, { align: 'center', baseline: 'middle' });
  doc.setTextColor(...INK);
}
/* ---------- el diseño de la app en los PDF: cada documento con el color de su pestaña ----------
   La barra de arriba (de borde a borde) en el color de la barra de la pestaña, con el título en la letra de los
   títulos; las cabeceras de las tablas en el mismo color; las filas de grupo con el velo de la pestaña; las tiras
   de día y de noche y los colores de las categorías, enteros, como en pantalla. */
/* la letra sobre un color: grafito en los claros, blanca en los oscuros */
const inkOn = c => { const L = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); const Y = .2126 * L[0] + .7152 * L[1] + .0722 * L[2]; return (Y + .05) / (.0134 + .05) >= 1.05 / (Y + .05) ? INK : PDF_WHITE; };
let PT, PDF_THEAD, PDF_GROUP, TBL;
/* los PDF salen como la pantalla de quien exporta: el tema del proyecto (pestañas y leyendas) y sus ajustes de
   pantalla: las letras, el tono y el grosor de las líneas y las barras (de color, suaves o blancas con su filete) */
function pdfTheme() {
  const hex = tabHex(), T = tabTone(), S = screenGet();
  const c = rgb(hex), BG = rgb('#EEEDEA'), SURF = rgb('#FCFCFB');
  // las letras de la persona (y sus secundarias); los cuadros negros (números de escena) van en la misma tinta
  const ink = rgb(inkNow()), IT = inkTones(inkNow());
  INK.splice(0, 3, ...ink); MUTED.splice(0, 3, ...rgb(IT.muted)); PDF_BLACK.splice(0, 3, ...ink);
  const bar = S.bars === 'blanca' ? PDF_WHITE.slice() : S.bars === 'suave' ? mixc(c, PDF_WHITE, .4) : rgb(T.bar);
  const line = S.ln === 'suave' ? mixc(c, PDF_WHITE, .16) : S.ln === 'marcada' ? mixc(ink, PDF_WHITE, .42) : mixc(c, PDF_WHITE, .32);
  PT = { c, deep: rgb(T.deep), bar, barInk: inkOn(bar), sel: rgb(T.sel), soft: rgb(T.soft), fill: mixc(c, SURF, .22), fill2: mixc(c, SURF, .45), line,
    lw1: { fina: .6, normal: 1, gruesa: 2 }[S.lt] || 1, lw2: { fina: .6, normal: 1, gruesa: 1.6 }[S.lk] || 1 };
  PDF_LINE.splice(0, 3, ...line);
  PDF_THEAD = PT.bar; PDF_GROUP = PT.fill;
  // (lote K) más letra y más aire. (lote AH) La rejilla entera, tipo Excel: todos los bordes de cada celda en negro
  // (antes, solo una línea fina de color debajo de cada fila) y la cabecera en gris claro con letra negra en negrita
  // (antes, en el color de la barra de la pestaña)
  TBL = { theme: 'plain', styles: { font: 'helvetica', fontSize: PF.body, cellPadding: PAD, textColor: INK, lineColor: PDF_RULE, lineWidth: GRID.cell, overflow: 'linebreak', valign: 'top' },
    headStyles: { fillColor: PDF_HEADF, textColor: INK, fontStyle: 'bold', fontSize: PF.head, cellPadding: { top: 5, bottom: 5, left: 6, right: 6 }, valign: 'middle', lineWidth: GRID.cell, lineColor: PDF_RULE },
    footStyles: { fillColor: PDF_HEADF, textColor: INK, fontStyle: 'bold', lineWidth: GRID.cell, lineColor: PDF_RULE },
    // (lote AH) sin pie de página, el margen de abajo es como los de los lados (antes, 44: dejaba lugar para el pie)
    alternateRowStyles: { fillColor: PDF_WHITE }, showFoot: 'lastPage', margin: { left: 36, right: 36, top: 36, bottom: 36 } };
  return PT;
}
pdfTheme();
/* (lote AH) el papel: A4 o carta, elegido en la vista previa (pdf-vista.js) mientras se arma el documento; sin elegir
   (null), el de siempre de cada documento (carta, o A4 la lámina y la hoja de script). Todas las páginas van en el
   mismo papel: un addPage('a4') o ('letter') toma el del documento (antes la hoja de desglose con fotos mezclaba los dos) */
let PDF_PAPER = null;
const pdfPaperName = p => p === 'a4' ? 'A4' : 'Carta';
function newDoc(orientation = 'portrait', format = 'letter') {
  const { jsPDF } = window.jspdf;
  if (typeof format === 'string') format = PDF_PAPER || format;
  const doc = new jsPDF({ unit: 'pt', format, orientation });
  if (typeof format === 'string') {
    doc._paper = format;
    const ap = doc.addPage.bind(doc);
    doc.addPage = (f, o) => ap(typeof f === 'string' ? doc._paper : f, o);
  }
  doc.setProperties({ title: pdfSafe(P.meta.title), creator: 'FilmSpirit' });
  doc.setLineHeightFactor(PF.lh);   // (lote K) el interlineado de todo el documento, tablas incluidas
  pdfTableHooks(doc);
  // el grosor de las líneas de la persona: las finas (tablas, recuadros) y las gruesas (rayado, reglas) por separado
  const slw = doc.setLineWidth.bind(doc);
  doc.setLineWidth = w => slw(w > 0 ? w * (w >= 1.4 ? PT.lw2 : PT.lw1) : w);
  // las letras de la app (pdf-fuente.js): «helvetica» pasa a ser Archivo en todo el documento (tablas incluidas),
  // «courier» la Courier Prime del guion y «title» la de los títulos (Familjen Grotesk)
  const sf = doc.setFont.bind(doc);
  // la letra elegida en «Apariencia › Tu pantalla» (pdf-fuente-x.js): regular y negrita, para todo lo que no es guion
  const fx = typeof fontOf === 'function' && typeof pdfFontX === 'function' ? pdfFontX(doc, fontOf(screenGet())[4]) : '';
  const fxSt = st => st === 'bold' || st === 'bolditalic' ? 'bold' : 'normal';
  if (typeof pdfFonts === 'function' && pdfFonts(doc)) doc.setFont = (n, st, w) => {
    if (fx && (n === 'helvetica' || n === 'title')) return sf(fx, fxSt(st), w);
    if (n === 'helvetica') return sf(PDF_UI, st, w);
    if (n === 'courier') return sf(pdfFontOn(doc, PDF_MONO) ? PDF_MONO : 'courier', st, w);
    if (n === 'title') return sf(pdfFontOn(doc, PDF_TITLE) ? PDF_TITLE : PDF_UI, st === 'italic' ? 'normal' : st === 'bolditalic' ? 'bold' : st, w);
    return sf(n, st, w);
  };
  else doc.setFont = (n, st, w) => sf(n === 'title' ? 'helvetica' : n, st, w);
  // (lote U) el ancho de un texto tal cual: en inglés, getTextWidth pasa por getStringUnitWidth, que trPdf traduce, y los
  // tramos ya traducidos de las celdas con varios estilos se medían como otra palabra («fotos» como «photos»)
  const suw = doc.getStringUnitWidth.bind(doc);
  doc._rawW = t => suw(t) * doc.getFontSize() / doc.internal.scaleFactor;
  return trPdf(doc);   // en inglés (i18n.js)
}
/* logos de la pestaña Proyecto: imagen ajustada a un cuadro; devuelve el ancho usado */
const imgFmt = url => /^data:image\/png/i.test(url) ? 'PNG' : 'JPEG';
function pdfImg(doc, url, x, y, maxW, maxH, right) {
  url = pdfImgSrc(url);
  try {
    const p = doc.getImageProperties(url);
    const r = p.width / p.height;
    let w = maxW, h = w / r;
    if (h > maxH) { h = maxH; w = h * r; }
    doc.addImage(url, imgFmt(url), right ? x - w : x, y + (maxH - h) / 2, w, h);
    return w;
  } catch (e) { return 0; }
}
const brandOn = k => !P.meta.brand || P.meta.brand[k] !== false;
/* logos del proyecto en los documentos: personalizar es de Pro y Studio */
const brandLogo = k => planAllows('brand') ? P.meta[k] : '';
/* una imagen ajustada a un cuadro, sin dibujarla todavía: { url, w, h } (o null si no se puede leer) */
function pdfImgFit(doc, url, maxW, maxH) {
  try {
    url = pdfImgSrc(url);
    const p = doc.getImageProperties(url), r = p.width / p.height;
    let w = maxW, h = w / r;
    if (h > maxH) { h = maxH; w = h * r; }
    return { url, w, h };
  } catch (e) { return null; }
}
/* corta un texto con «...» para que entre en w, en la letra que está puesta */
function pdfCut(doc, t, w) {
  t = String(t || ''); if (doc.getTextWidth(t) <= w) return t;
  let lo = 0, hi = t.length;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (doc.getTextWidth(t.slice(0, m).trimEnd() + '...') <= w) lo = m; else hi = m - 1; }
  return t.slice(0, lo).trimEnd() + '...';
}
/* un texto en hasta n líneas de ancho w, achicando la letra (de fs hasta min) antes de cortar con «...».
   Devuelve { L: las líneas, fs: la letra, w: el ancho de la más larga, cut: si se cortó } y deja puesta esa letra */
function pdfFitLines(doc, t, w, fs, min, n, font = 'helvetica', st = 'normal') {
  t = pdfSafe(t);
  let f = fs, L;
  for (;;) {
    doc.setFont(font, st); doc.setFontSize(f);
    L = t ? doc.splitTextToSize(t, w) : [];
    if (L.length <= n || f <= min) break;
    f = Math.max(min, f - .5);
  }
  const cut = L.length > n;
  if (cut) L = [...L.slice(0, n - 1), pdfCut(doc, L.slice(n - 1).join(' '), w)];
  return { L, fs: f, cut, w: L.length ? Math.max(...L.map(x => doc.getTextWidth(x))) : 0 };
}
/* (lote AH) la cabecera de los documentos: un cuadro cerrado con líneas negras (el marco y sus divisiones), sin la barra
   de color de borde a borde ni la fecha de creación (lo pidió Ronald: «que toda la información esté en cuadro»).
   Izquierda: el logo o el nombre del proyecto; al medio: el documento y su subtítulo; derecha: el logo o el nombre de la
   empresa y, debajo, «Página 1 de 3» (lo escribe pageNumbers al final, cuando ya se sabe cuántas son).
   o.badge: un número en un cuadro negro junto al nombre (la escena de la hoja de desglose); o.x0: el margen.
   Devuelve dónde sigue la página (debajo del cuadro) */
const HDR = { top: 22, h: 50, pad: 7, pg: 15 };
function docHeader(doc, label, sub, o = {}) {
  const W = doc.internal.pageSize.getWidth(), x0 = o.x0 || 36, x1 = W - x0, { top: y0, h, pad } = HDR, y1 = y0 + h;
  const page = doc.getCurrentPageInfo().pageNumber;
  (doc._hdr || (doc._hdr = new Set())).add(page);
  if (!doc._label) doc._label = label;   // el nombre del documento (la vista previa lo muestra arriba)
  let xl = x0;
  // izquierda: el proyecto (logo, o su nombre en hasta dos líneas)
  if (brandOn('project')) {
    const lg = brandLogo('projLogo') ? pdfImgFit(doc, P.meta.projLogo, 140, h - pad * 2) : null;
    if (lg) { const cw = Math.max(70, lg.w + pad * 2); try { doc.addImage(lg.url, imgFmt(lg.url), x0 + (cw - lg.w) / 2, y0 + (h - lg.h) / 2, lg.w, lg.h); } catch (e) { } xl = x0 + cw; }
    else {
      const F = pdfFitLines(doc, P.meta.title || '', 150, 12, 9, 2, 'title', 'bold'), lh = F.fs * 1.15;
      const cw = Math.max(80, F.w + pad * 2);
      doc.setTextColor(...INK); doc.text(F.L, x0 + pad, y0 + h / 2 - (F.L.length - 1) * lh / 2, { baseline: 'middle', lineHeightFactor: 1.15 });
      xl = x0 + cw;
    }
  }
  // derecha: la empresa (logo o nombre) y el número de página
  const pgW = (doc.setFont('helvetica', 'normal'), doc.setFontSize(PF.small), doc.getTextWidth('Página 88 de 88'));
  let comp = null;
  if (brandOn('company')) {
    const lg = brandLogo('logo') ? pdfImgFit(doc, P.meta.logo, 130, h - HDR.pg - pad * 1.6) : null;
    if (lg) comp = { lg, w: lg.w };
    else if (P.meta.company) { const F = pdfFitLines(doc, P.meta.company.toUpperCase(), 130, 9, 7, 2, 'title', 'bold'); comp = { F, w: F.w }; }
  }
  const rw = Math.max(92, (comp ? comp.w : 0) + pad * 2, pgW + pad * 2), xr = x1 - rw;
  // al medio: el documento (con su número en un cuadro negro, si lleva) y el subtítulo
  const mx = xl + pad + 2, mw = xr - pad - mx;
  doc.setFont('title', 'bold');
  const bw = o.badge != null ? (doc.setFontSize(13), Math.max(20, doc.getTextWidth(String(o.badge)) + 10)) : 0;
  // el nombre en una línea (más chico si hace falta; si aun así no entra, en dos) y el subtítulo en lo que queda
  let T = pdfFitLines(doc, label, mw - (bw ? bw + 8 : 0), 13, 10.5, 1, 'title', 'bold');
  if (T.cut) T = pdfFitLines(doc, label, mw - (bw ? bw + 8 : 0), 10.5, 9.5, 2, 'title', 'bold');
  const tlh = T.fs * 1.12;
  const S = sub ? pdfFitLines(doc, sub, mw, 8.3, 7, T.L.length > 1 ? 1 : 2) : null, slh = S ? S.fs * 1.2 : 0;
  const th = T.L.length * tlh + (S ? 3 + S.L.length * slh : 0), ty = y0 + (h - th) / 2;
  doc.setFont('title', 'bold'); doc.setFontSize(T.fs); doc.setTextColor(...INK);
  doc.text(T.L, mx, ty + tlh / 2, { baseline: 'middle', lineHeightFactor: 1.12 });
  if (bw) {
    const ly = ty + tlh * (T.L.length - .5), bx = mx + doc.getTextWidth(T.L[T.L.length - 1] || '') + 8, bh = T.fs + 7;
    doc.setFillColor(...PDF_BLACK); doc.rect(bx, ly - bh / 2, bw, bh, 'F');
    doc.setFontSize(13); doc.setTextColor(255, 255, 255); doc.text(String(o.badge), bx + bw / 2, ly, { align: 'center', baseline: 'middle' });
  }
  if (S) { doc.setFont('helvetica', 'normal'); doc.setFontSize(S.fs); doc.setTextColor(...MUTED); doc.text(S.L, mx, ty + T.L.length * tlh + 3 + slh / 2, { baseline: 'middle', lineHeightFactor: 1.2 }); }
  // la empresa, arriba a la derecha (con el número de página debajo)
  const cy = y1 - HDR.pg;
  if (comp && comp.lg) { try { doc.addImage(comp.lg.url, imgFmt(comp.lg.url), xr + (rw - comp.lg.w) / 2, y0 + (cy - y0 - comp.lg.h) / 2, comp.lg.w, comp.lg.h); } catch (e) { } }
  else if (comp) { const lh = comp.F.fs * 1.15; doc.setFont('title', 'bold'); doc.setFontSize(comp.F.fs); doc.setTextColor(...INK); doc.text(comp.F.L, xr + rw / 2, y0 + (cy - y0) / 2 - (comp.F.L.length - 1) * lh / 2, { align: 'center', baseline: 'middle', lineHeightFactor: 1.15 }); }
  // el marco y las divisiones
  pdfBox(doc, x0, y0, x1 - x0, h);
  if (xl > x0) pdfVLine(doc, xl, y0, y1);
  pdfVLine(doc, xr, y0, y1);
  if (comp) { doc.setLineWidth(GRID.cell); doc.line(xr, cy, x1, cy); }
  (doc._pg || (doc._pg = {}))[page] = comp ? { x: xr, y: cy, w: rw, h: HDR.pg } : { x: xr, y: y0, w: rw, h };
  doc.setTextColor(...INK);
  return y1 + 12;
}
/* el título de una sección (lote K): en la letra de los títulos, negrita y en minúscula normal. Si no queda lugar para
   el título y unas filas, pasa a la página siguiente. right: un dato chico a la derecha. Devuelve dónde sigue */
/* (lote AC) st: el estilo del título (letra, tamaños, línea); sin st, el de todos los PDF. La hoja de llamado pasa el
   suyo (CL_SEC, pdf-llamado.js) */
/* (lote AH) dentro de un cuadro con líneas negras, a todo el ancho (antes, una regla fina debajo). st.box: false deja la
   regla de antes (line, lw, gap, after); st.fill: el fondo del cuadro (sin fondo, blanco) */
function pdfSec(doc, y, title, { x0 = 36, x1, right, need = 96, st = {} } = {}) {
  const { font = 'title', fs = PF.sec, rfs = PF.small, rcol = MUTED, box = true, fill = null, pad = 5.5 } = st;
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(); x1 = x1 || W - x0;
  if (y + need > H - 44) { doc.addPage(); y = 44; }
  if (!box) {
    const { line = mixc(INK, PDF_WHITE, .7), lw = .6, gap = 5, after = 11 } = st;
    doc.setFont(font, 'bold'); doc.setFontSize(fs); doc.setTextColor(...INK);
    doc.text(pdfSafe(title), x0, y + fs);
    if (right) { doc.setFont('helvetica', 'normal'); doc.setFontSize(rfs); doc.setTextColor(...rcol); doc.text(pdfSafe(right), x1, y + fs, { align: 'right' }); }
    doc.setDrawColor(...line); doc.setLineWidth(lw); doc.line(x0, y + fs + gap, x1, y + fs + gap);
    doc.setTextColor(...INK);
    return y + fs + after;
  }
  const { line = PDF_RULE, lw = GRID.frame, after = 6 } = st, bh = fs + pad * 2;
  if (fill) doc.setFillColor(...fill);
  doc.setDrawColor(...line); doc.setLineWidth(lw); doc.rect(x0, y, x1 - x0, bh, fill ? 'FD' : 'S');
  let rw = 0;
  if (right) { doc.setFont('helvetica', 'normal'); doc.setFontSize(rfs); doc.setTextColor(...rcol); const r = pdfSafe(right); rw = doc.getTextWidth(r) + 12; doc.text(r, x1 - 7, y + bh / 2, { align: 'right', baseline: 'middle' }); }
  doc.setFont(font, 'bold'); doc.setFontSize(fs); doc.setTextColor(...INK);
  doc.text(pdfCut(doc, pdfSafe(title), x1 - x0 - 14 - rw), x0 + 7, y + bh / 2, { baseline: 'middle' });
  return y + bh + after;
}
/* celdas con más de un estilo (lote K): el encabezado de una escena en negrita y sus páginas en gris, o «Utilería y
   arte:» como etiqueta gris y la lista en normal. cell.raw._rich = [párrafo…]; cada párrafo es { fs, segs: [{ t, st,
   col, tr }] } o un tramo solo { t, st, fs, col, tr }. autoTable mide la celda con el texto plano (content, en el
   estilo más pesado, para no quedar corta) y aquí se dibuja cada tramo con su letra, tamaño y color, cortando las
   líneas por palabras. En inglés se traduce cada tramo por su lado (como antes cada celda entera), salvo los
   marcados tr: false */
const pdfRichPara = p => ({ fs: p.fs || PF.body, segs: p.segs || [{ t: p.t, st: p.st, col: p.col, tr: p.tr, font: p.font }] });
function pdfRichText(R) { return R.map(p => pdfRichPara(p).segs.map(s => s.t).join('')).join('\n'); }
/* una celda de autoTable con varios estilos: content plano para medir y _rich para dibujar */
function pdfRich(R, styles) {
  const P2 = R.filter(Boolean).map(pdfRichPara), fs = Math.max(...P2.map(p => p.fs)), bold = P2.some(p => p.segs.some(s => s.st === 'bold'));
  const { colSpan, rowSpan, ...st } = styles || {};   // colSpan y rowSpan son de la celda, no de su estilo
  return { content: pdfSafe(pdfRichText(P2)), _rich: P2, ...(colSpan ? { colSpan } : {}), ...(rowSpan ? { rowSpan } : {}), styles: { fontSize: fs, fontStyle: bold ? 'bold' : 'normal', ...st } };
}
function pdfRichLines(doc, paras, w) {
  const raw = doc._raw || doc, out = [];
  for (const p of paras) {
    let line = [], lw = 0;
    const push = () => { out.push({ fs: p.fs, toks: line }); line = []; lw = 0; };
    doc.setFontSize(p.fs);
    for (const s of p.segs) {
      doc.setFont(s.font || 'helvetica', s.st || 'normal');
      const t = pdfSafe(s.tr !== false && EN && typeof tr === 'function' ? tr(s.t) : s.t);
      for (const part of String(t).split(/(\s+)/)) {
        if (!part) continue;
        const sp = /^\s+$/.test(part);
        if (sp && !line.length) continue;
        const pw = (doc._rawW || raw.getTextWidth)(sp ? ' ' : part);
        if (!sp && line.length && lw + pw > w + .5) { while (line.length && /^\s+$/.test(line[line.length - 1].t)) line.pop(); push(); }
        line.push({ t: sp ? ' ' : part, st: s.st, col: s.col, font: s.font, w: pw }); lw += pw;
      }
    }
    push();
  }
  return out;
}
/* los ganchos de todas las tablas del documento: el número de escena en su cuadro y las celdas con varios estilos
   (se suman a los que trae cada tabla) */
function pdfTableHooks(doc) {
  if (typeof doc.autoTable !== 'function' || doc._hooks) return;
  doc._hooks = true;
  const at = doc.autoTable.bind(doc);
  doc.autoTable = o => {
    if (!o || typeof o !== 'object') return at(o);
    const p0 = o.didParseCell, w0 = o.willDrawCell, d0 = o.didDrawCell;
    return at({ ...o,
      didParseCell: d => { pdfBadgeParse(d); if (p0) p0(d); pdfRichParse(doc, d); },
      willDrawCell: d => { if (w0) w0(d); const r = d.cell.raw; if (d.section === 'body' && r && r._rich && !d.cell._rich) { d.cell._rich = r._rich; d.cell.text = []; } },
      didDrawCell: d => { pdfBadgeDraw(doc, d); pdfRichDraw(doc, d); if (d0) d0(d); },
    });
  };
}
/* el ancho de una celda antes de dibujar: se sabe si las columnas son fijas salvo una (la que se estira) */
function pdfCellW(doc, d) {
  const t = d.table, cs = (t.styles && t.styles.columnStyles) || {}, Wt = t.getWidth(doc.internal.pageSize.getWidth());
  const cw = t.columns.map(c => { const st = cs[c.dataKey] || cs[c.index] || {}; return typeof st.cellWidth === 'number' ? st.cellWidth : null; });
  if (cw.filter(v => v == null).length > 1) return 0;
  const fill = Wt - cw.reduce((a, v) => a + (v || 0), 0);
  let w = 0;
  for (let i = d.column.index; i < d.column.index + (d.cell.colSpan || 1); i++) w += cw[i] == null ? fill : cw[i];
  return w;
}
/* con el ancho sabido, la altura exacta de una celda con varios estilos (si no, autoTable la mide con el texto plano) */
function pdfRichParse(doc, d) {
  const r = d.cell.raw; if (d.section !== 'body' || !r || !r._rich) return;
  const w = pdfCellW(doc, d); if (!w) return;
  const c = d.cell, lhf = doc.getLineHeightFactor();
  const H = pdfRichLines(doc, r._rich, w - c.padding('left') - c.padding('right')).reduce((a, L) => a + L.fs * lhf, 0);
  c.text = []; c.styles.minCellHeight = Math.max(c.styles.minCellHeight || 0, H + c.padding('top') + c.padding('bottom'));
}
function pdfRichDraw(doc, d) {
  const c = d.cell, R = c._rich; if (!R) return;
  c._rich = null;
  const raw = doc._raw || doc, lhf = doc.getLineHeightFactor(), w = c.width - c.padding('left') - c.padding('right');
  const lines = pdfRichLines(doc, R, w), H = lines.reduce((a, L) => a + L.fs * lhf, 0);
  let y = c.styles.valign === 'middle' ? c.y + (c.height - H) / 2 : c.styles.valign === 'bottom' ? c.y + c.height - c.padding('bottom') - H : c.y + c.padding('top');
  const x0 = c.x + c.padding('left'), col0 = Array.isArray(c.styles.textColor) ? c.styles.textColor : INK;
  for (const L of lines) {
    const lw = L.toks.reduce((a, k) => a + k.w, 0);
    let x = c.styles.halign === 'center' ? x0 + (w - lw) / 2 : c.styles.halign === 'right' ? x0 + w - lw : x0;   // centrada (la nota para el equipo) o a la derecha (lote U: las páginas)
    doc.setFontSize(L.fs);
    // como autoTable: la primera línea con su altura de letra, sin el aire extra arriba
    for (const k of L.toks) { doc.setFont(k.font || 'helvetica', k.st || 'normal'); doc.setTextColor(...(k.col || col0)); raw.text(k.t, x, y + L.fs * .02, { baseline: 'top' }); x += k.w; }
    y += L.fs * lhf;
  }
  doc.setTextColor(...INK);
}
/* una tabla en bloques (lote K): cada escena, jornada o grupo es un bloque que empieza con su fila de título. Si el
   bloque no entra en lo que queda de la página (y sí en una página entera), pasa completo a la siguiente: así el
   título de una escena nunca queda solo al pie, sin sus planos (autoTable no sabe «mantener con la siguiente»). La
   cabecera de columnas sale arriba y al comienzo de cada página. Para que todos los bloques queden alineados, las
   columnas son fijas salvo una (la que se estira). Devuelve dónde sigue la página */
function pdfBlocks(doc, y, base, blocks) {
  const Wp = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const mg = { left: 36, right: 36, top: 36, bottom: 36, ...(base.margin || {}) };
  const probe = doc._probe || (doc._probe = pdfProbe(Wp));
  let first = true;
  for (const body of blocks) {
    if (!body || !body.length) continue;
    // al medir no se dibuja nada de la tabla en el documento de verdad: los ganchos de dibujo de la tabla quedan fuera
    probe.autoTable({ ...base, willDrawCell: undefined, didDrawCell: undefined, willDrawPage: undefined, didDrawPage: undefined, margin: { ...mg, top: 0, bottom: 0 }, startY: 10, body, showHead: 'never' });
    const h = probe.lastAutoTable.finalY - 10;
    let fresh = first;
    if (!first && y + h > H - mg.bottom && h < H - mg.top - mg.bottom - 30) { doc.addPage(); y = mg.top + 4; fresh = true; }
    doc.autoTable({ ...base, margin: mg, startY: y, body, showHead: fresh ? 'everyPage' : 'never' });
    y = doc.lastAutoTable.finalY; first = false;
  }
  return y;
}
/* un documento de prueba, del mismo ancho y muy alto, para medir lo que ocupa un bloque sin dibujarlo */
function pdfProbe(w) {
  const d = newDoc('portrait', [w, 6000]);
  return d;
}
/* la leyenda de colores del documento, como arriba de la tabla en la app: «LEYENDA ■ Día ■ Noche ■ …».
   items: [nombre, #color o [r,g,b]]; devuelve dónde sigue la página */
function pdfLegend(doc, y, items, x0 = 36) {
  if (!items || !items.length) return y;
  const W = doc.internal.pageSize.getWidth(), xr = W - x0, cs = typeof doc.setCharSpace === 'function';
  let yy = y + 9;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(...MUTED);
  if (cs) doc.setCharSpace(.55);
  doc.text('LEYENDA', x0, yy);
  const lw = doc.getTextWidth('LEYENDA') + (cs ? 7 * .55 : 0) + 12;
  if (cs) doc.setCharSpace(0);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8);
  let x = x0 + lw;
  for (const [name, c] of items) {
    const col = Array.isArray(c) ? c : rgb(c), t = pdfSafe(name), w = 12 + doc.getTextWidth(t) + 14;
    if (x + w > xr && x > x0 + lw) { x = x0 + lw; yy += 13; }
    doc.setFillColor(...col); doc.rect(x, yy - 6.8, 8.4, 8.4, 'F');
    if (col[0] + col[1] + col[2] > 700) { doc.setDrawColor(190, 190, 190); doc.setLineWidth(.4); doc.rect(x, yy - 6.8, 8.4, 8.4, 'S'); }
    doc.setTextColor(...INK); doc.text(t, x + 12, yy);
    x += w;
  }
  doc.setTextColor(...INK);
  return yy + 9;
}
/* qué colores del plan usa una lista de filas (y sus jornadas): para la leyenda del documento */
function pdfPlanUsed(rows, brks) {
  const u = { hl: new Set() };
  for (const b of brks || []) if (b && b.hl && hlc(b)) u.hl.add(b.hl);
  for (const it of rows) {
    if (!it) continue;
    if (it.hl && hlc(it)) { u.hl.add(it.hl); continue; }
    if (it.e) { u.ev = 1; continue; }
    const s = it.k && sceneOfKey(it.k); if (s) { u[s.dn === 'N' ? 'n' : 'd'] = 1; (u.strips || (u.strips = new Set())).add(stripKey(s)); }
  }
  return u;
}
/* (lote AH) el número de página, dentro del cuadro de la cabecera («Página 1 de 3»), en cada página que lleva el cuadro
   (docHeader). Sin pie de página y sin la barra angosta arriba de las páginas que siguen (lo pidió Ronald): las páginas
   en que sigue una tabla o un texto quedan limpias, y el cuadro de la primera ya dice cuántas son en total.
   label: ya no se usa (era el pie); queda para los que la llaman */
function pageNumbers(doc, label) {
  const n = doc.getNumberOfPages(), S = doc._pg || {};
  for (let i = 1; i <= n; i++) {
    const s = S[i]; if (!s) continue;
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(PF.small); doc.setTextColor(...INK);
    doc.text(`Página ${i} de ${n}`, s.x + s.w / 2, s.y + s.h / 2, { align: 'center', baseline: 'middle' });
  }
  if (n) doc.setPage(n);
  doc.setTextColor(...INK);
}

/* celda «encabezado + sinopsis»: el encabezado en letra normal y la sinopsis en cursiva (autoTable dibuja todo en un
   estilo; aquí la celda se dibuja a mano con las mismas líneas que ya calculó) */
function pdfSynHooks(doc, col) {
  return {
    willDrawCell: d => {
      if (d.section !== 'body' || d.column.index !== col || !d.cell.raw || !d.cell.raw._hd) return;
      const c = d.cell;
      doc.setFont('helvetica', c.styles.fontStyle || 'normal'); doc.setFontSize(c.styles.fontSize);
      const n = doc.splitTextToSize(c.raw._hd, c.width - c.padding('horizontal')).length;
      c._lines = c.text; c._nh = n; c.text = [];
    },
    didDrawCell: d => {
      const c = d.cell; if (!c._lines) return;
      const fs = c.styles.fontSize, lh = fs * doc.getLineHeightFactor(), H = c._lines.length * lh;
      let y = c.styles.valign === 'middle' ? c.y + (c.height - H) / 2 : c.styles.valign === 'bottom' ? c.y + c.height - c.padding('bottom') - H : c.y + c.padding('top');
      const x = c.x + c.padding('left'), col0 = c.styles.textColor;
      doc.setFontSize(fs);
      c._lines.forEach((ln, k) => {
        const syn = k >= c._nh;
        doc.setFont('helvetica', syn ? 'italic' : c.styles.fontStyle || 'normal');
        if (Array.isArray(col0)) doc.setTextColor(...(syn ? col0.map(v => Math.round(v + (255 - v) * .2)) : col0));
        doc.text(ln, x, y + k * lh, { baseline: 'top' });
      });
      c._lines = null;
    },
  };
}
/* ---------- guion (limpio) y guion rayado ---------- */
function pdfScreenplay() { return edFormat() === 'av' ? pdfAV(false) : pdfScript({ clean: true }); }
function pdfScript(opts = {}) {
  // capas: el rayado de los planos y las etiquetas del desglose, juntas o por separado; las etiquetas, de todas
  // las categorías o solo de algunas (un área: lo de sonido, lo de vestuario…)
  const allow = opts.cats ? new Set(opts.cats) : null, area = opts.area ? SHEET.find(b => b.id === opts.area) : null;
  if (edFormat() === 'av') return pdfAV(opts.tags !== false, allow, area);
  const clean = !!opts.clean, nums = typeof edNumsOn === 'function' ? edNumsOn() : true;
  const tagsOn = !clean && opts.tags !== false, covOn = !clean && opts.cov !== false;
  const kindName = tagsOn && covOn ? 'GUION RAYADO Y ETIQUETADO' : tagsOn ? 'GUION ETIQUETADO' : 'GUION RAYADO';
  const doc = newDoc();
  doc.setLineHeightFactor(1.15);   // el guion tiene su formato de la industria: no toma el aire nuevo de los documentos (lote K)
  const W = 612;
  const CV = P.meta.cover || {}, part = pdfPart(), noCover = (clean && CV.on === false) || part;   // el guion limpio puede ir sin carátula; una parte, tampoco
  // (lote AH) en A4: la página del guion conserva su formato (medido para carta: márgenes, 55 líneas, la misma
  // paginación que en la app) y va centrada a lo ancho (la A4 es 17 pt más angosta y 50 más alta). Se corre todo lo
  // que se dibuja en cada página con una traslación del PDF (cm), cerrada al terminar la página
  const dx = (doc.internal.pageSize.getWidth() - W) / 2;
  let shifted = false;
  const pgOpen = () => { if (Math.abs(dx) > .5) { doc.internal.write(`q 1 0 0 1 ${dx.toFixed(2)} 0 cm`); shifted = true; } };
  const pgClose = () => { if (shifted) { doc.internal.write('Q'); shifted = false; } };
  // portada con leyenda
  if (!noCover) {
  pgOpen();
  if (brandOn('project') && brandLogo('projLogo')) { try { const lg = pdfImgSrc(P.meta.projLogo), ip = doc.getImageProperties(lg); const r = ip.width / ip.height; let w = 220, h = w / r; if (h > 110) { h = 110; w = h * r; } doc.addImage(lg, imgFmt(lg), (W - w) / 2, 210 - h, w, h); } catch (e) { } }
  if (brandOn('company')) { if (brandLogo('logo')) pdfImg(doc, P.meta.logo, W - 72, 60, 130, 40, true); else if (P.meta.company) { doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0); doc.text(pdfSafe(P.meta.company.toUpperCase()), W - 72, 76, { align: 'right' }); } }
  doc.setFont('courier', 'bold'); doc.setFontSize(20); doc.setTextColor(0, 0, 0);
  doc.text(pdfSafe(P.meta.title.toUpperCase(), true), W / 2, 250, { align: 'center' });
  doc.setFont('courier', 'normal'); doc.setFontSize(12);
  let y = 280;
  if (P.meta.author) { doc.text(EN ? 'written by' : 'escrito por', W / 2, y, { align: 'center' }); y += 18; doc.text(pdfSafe(P.meta.author, true), W / 2, y, { align: 'center' }); y += 18; }
  if (CV.based) { y += 18; doc.text(pdfSafe(CV.based, true), W / 2, y, { align: 'center' }); y += 18; }
  if (clean) {
    // abajo: contacto a la izquierda; versión y fecha a la derecha
    doc.setFontSize(10);
    const cl = String(CV.contact || '').split('\n').filter(Boolean);
    cl.forEach((l, i) => doc.text(pdfSafe(l, true), 108, 700 - (cl.length - 1 - i) * 13));
    const LK = typeof scriptLock === 'function' && !LOCKS.base ? scriptLock() : null;
    // guion cerrado: en la carátula, las revisiones con su color y fecha (la última abajo)
    const rvl = LK ? [...(LK.revs || []).map(r => `Rev. ${revName(r.c).toLowerCase()} · ${revDate(isoDay(new Date(r.end || r.at)))}`), ...(LK.rev ? [`Rev. ${revName(LK.rev.c).toLowerCase()} · ${revDate(LK.rev.date)}`] : [])].slice(-6) : [];
    const rl = [P.meta.draft, CV.date ? revDate(CV.date) : '', ...rvl].filter(Boolean);
    rl.forEach((l, i) => doc.text(pdfSafe(l, true), 540, 700 - (rl.length - 1 - i) * 13, { align: 'right' }));
    doc.setFontSize(12);
  } else if (P.meta.draft) { doc.text(pdfSafe(P.meta.draft, true), W / 2, y, { align: 'center' }); y += 18; }
  if (!clean) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(kindName, W / 2, y + 16, { align: 'center' });
    if (tagsOn && area) { doc.setFont('helvetica', 'normal'); doc.text(pdfSafe('Área: ' + area.name), W / 2, y + 30, { align: 'center' }); }
  }
  const used = new Set(tagsOn ? Object.values(P.elements).map(e => e.cat).filter(c => !allow || allow.has(c)) : []);
  const legend = CATS.filter(c => used.has(c.id));
  let ly = 470;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED); if (legend.length) doc.text('CÓDIGO DE COLORES', 108, ly - 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
  legend.forEach((c, i) => {
    const x = 108 + (i % 3) * 140, yy = ly + Math.floor(i / 3) * 18;
    doc.setFillColor(...tint(c.color, .35)); doc.rect(x, yy - 8, 26, 11, 'F');
    doc.setDrawColor(...rgb(c.color)); doc.setLineWidth(1.2); doc.line(x, yy + 3, x + 26, yy + 3);
    doc.text(pdfSafe(c.name), x + 32, yy);
  });
  let ly2 = ly + Math.ceil(legend.length / 3) * 18 + (legend.length ? 16 : 0);
  if (!clean) {
    if (covOn) {
      doc.setDrawColor(...ACC); doc.setLineWidth(1.4); doc.line(112, ly2 - 9, 112, ly2 + 3);
      doc.setDrawColor(...OKC); doc.line(122, ly2 - 9, 122, ly2 + 3);
      doc.text('Cobertura sobre el texto, con el número del plano arriba: naranja pendiente, verde rodado.', 132, ly2);
    } else ly2 -= 15;
    if (typeof mnNotes === 'function' && mnNotes().length && !(typeof notesHidden === 'function' && notesHidden())) {
      doc.setFillColor(255, 246, 214); doc.setDrawColor(176, 132, 0); doc.setLineWidth(.5); doc.roundedRect(104, ly2 + 7, 22, 10, 1.5, 1.5, 'FD');
      doc.setTextColor(0, 0, 0); doc.text('Notas al margen con su fecha; la flecha señala el lugar del texto.', 132, ly2 + 15);
      ly2 += 15;
    }
    if (opts.ink !== false && typeof anoAll === 'function' && anoAll().length) {
      doc.setDrawColor(214, 48, 38); doc.setLineWidth(1.2); doc.setLineCap('round'); doc.lines([[5, -4], [5, 5], [6, -6]], 106, ly2 + 14, [1, 1], 'S', false); doc.setLineCap('butt');
      doc.setTextColor(0, 0, 0); doc.text('Anotaciones a mano del equipo.', 132, ly2 + 15);
      ly2 += 15;
    }
    if (legend.length && Object.values(P.elements).some(e => e.auto && used.has(e.cat))) {
      doc.setTextColor(...MUTED); doc.text('Subrayado punteado: elemento sugerido sin confirmar.', 132, ly2 + 15);
    }
  }
  }
  // páginas
  const tbp = new Map();
  if (tagsOn) for (const t of P.tags) { if (t.p < 0 || !P.elements[t.el] || (allow && !allow.has(P.elements[t.el].cat))) continue; if (!tbp.has(t.p)) tbp.set(t.p, []); tbp.get(t.p).push(t); }
  const firstOf = new Map(D.sc.scenes.map(s => [s.p0, s]));
  const CW = 7.2, LEFT = 108, TOP = 72;
  const base = li => TOP + li * 12 + 9.5;
  const ORD = lkRevOrder(), RV = ORD ? {} : P.rev || {};
  const MNI = !clean && typeof mnItems === 'function' ? mnItems() : null;   // notas al margen (guion-margen.js)
  const INKI = !clean && opts.ink !== false && typeof anoPdfItems === 'function' ? anoPdfItems() : null;   // anotaciones a mano (guion-anotar.js)
  let first = true;
  D.pages.forEach((pg, pi) => {
    if (part && !pdfScriptPageOk(pg, pi)) return;
    pgClose();
    if (!(noCover && first)) doc.addPage();
    first = false;
    pgOpen();
    doc.setFont('courier', 'normal'); doc.setFontSize(12); doc.setTextColor(0, 0, 0);
    const lab = pageLabel(D.pages, pi);
    if (pi > 0 || lab !== '1') doc.text(pdfSafe(lab, true) + '.', 540, 42, { align: 'right' });
    // series: la página donde empieza un episodio lleva su número y título arriba, al centro
    const fl = pg.find(ln => !ln.blank), fp = fl && P.paras[fl.p];
    if (fp && fp.t === 'h' && epOk(fp.ep) && fl.o === 0) { doc.setFont('courier', 'bold'); doc.text(pdfSafe(epLabel(P, String(fp.ep)).toUpperCase(), true), 306, 56, { align: 'center' }); doc.setFont('courier', 'normal'); }
    // revisión: las páginas con cambios llevan su color y fecha arriba; cada línea cambiada, un asterisco en el margen
    if (pg.some(ln => !ln.blank && P.paras[ln.p] && P.paras[ln.p].rv)) {
      const ks = pg.map(ln => !ln.blank && P.paras[ln.p] && P.paras[ln.p].rv).filter(Boolean);
      let k = RV.c || ks[0] || 'azul', date = RV.date;
      // guion cerrado: el color de la revisión más nueva de la página, con su fecha
      if (ORD) { k = ks.reduce((best, c) => ORD.lastIndexOf(c) > ORD.lastIndexOf(best) ? c : best, ks[0]); const ri = lkRevInfo(k); date = ri ? ri.date || (ri.end ? isoDay(new Date(ri.end)) : '') : ''; }
      doc.setFont('courier', 'normal'); doc.setFontSize(9);
      doc.text(pdfSafe(`Rev. ${revName(k).toLowerCase()}${date ? ' · ' + revDate(date) : ''}`, true), 108, 42);
      doc.setFontSize(12);
    }
    const mnl = MNI && mnPdfList(pi, MNI), rev = pg.some(ln => !ln.blank && P.paras[ln.p] && P.paras[ln.p].rv);
    mnPdfMark(doc, mnl, { LEFT, CW, base });
    pg.forEach((ln, li) => {
      if (ln.blank) return;
      const par = P.paras[ln.p];
      let txt = pdfSafe(par.x.slice(ln.o, ln.o + ln.len), true);
      if (['h', 'c', 'tr', 'sh'].includes(ln.t)) txt = txt.toUpperCase();
      const x0 = LEFT + ln.ind * CW, by = base(li);
      for (const t of (tbp.get(ln.p) || [])) {
        const a = Math.max(t.s, ln.o), b = Math.min(t.e, ln.o + ln.len);
        if (b <= a) continue;
        const c = CAT[P.elements[t.el].cat].color;
        const xa = x0 + (a - ln.o) * CW, w = (b - a) * CW;
        doc.setFillColor(...tint(c, t.auto ? .18 : .32)); doc.rect(xa, by - 9.2, w, 12, 'F');
        doc.setDrawColor(...rgb(c)); doc.setLineWidth(1);
        if (t.auto) doc.setLineDashPattern([2, 1.5], 0);
        doc.line(xa, by + 2.4, xa + w, by + 2.4);
        doc.setLineDashPattern([], 0);
      }
      doc.setFont('courier', ln.t === 'h' ? 'bold' : 'normal');
      // negrita, itálica y subrayado (guion-formato.js); el resaltado no se imprime
      if (typeof fmtOn === 'function' && fmtOn(par)) {
        const up = ['h', 'c', 'tr', 'sh'].includes(ln.t);
        for (const r of fmtRuns(par, ln.o, ln.o + ln.len)) {
          let t = pdfSafe(par.x.slice(r.a, r.b), true); if (up) t = t.toUpperCase();
          const bo = r.f.includes('b') || ln.t === 'h', it = r.f.includes('i');
          doc.setFont('courier', bo && it ? 'bolditalic' : bo ? 'bold' : it ? 'italic' : 'normal');
          const xr = x0 + (r.a - ln.o) * CW;
          doc.text(t, xr, by);
          if (r.f.includes('u')) { doc.setDrawColor(0, 0, 0); doc.setLineWidth(.6); doc.line(xr, by + 1.6, xr + t.length * CW, by + 1.6); }
        }
        doc.setFont('courier', ln.t === 'h' ? 'bold' : 'normal');
      } else
      doc.text(txt, x0, by);
      if (par.rv) { doc.setFont('courier', 'bold'); doc.text('*', clean ? 584 : 590, by); doc.setFont('courier', ln.t === 'h' ? 'bold' : 'normal'); }
      const s = firstOf.get(ln.p);
      if (nums && s && D.pos[ln.p].pg0 === pi && D.pos[ln.p].li0 === li) {
        doc.setFont('courier', 'bold'); doc.text(pdfSafe(s.key, true), LEFT - 14, by, { align: 'right' });
        if (clean) doc.text(pdfSafe(s.key, true), LEFT + 60 * CW + 14, by);
      }
    });
    // cobertura
    if (covOn) for (const sh of Object.values(P.shots)) {
      if (sh.p0 == null || !D.code[sh.id]) continue;
      const a = D.pos[sh.p0], b = D.pos[sh.p1];
      if (!a || !b || pi < a.pg0 || pi > b.pg1) continue;
      const from = pi === a.pg0 ? a.li0 : 0, to = pi === b.pg1 ? b.li1 : pg.length - 1;
      // como en pantalla: una línea por plano, repartidas sobre la columna del texto, con el número arriba
      const x = LEFT + 60 * CW * ((D.lanes[sh.id] || 0) + 1) / ((D.laneN[sh.id] || 1) + 1);
      const y1 = base(from) - 9.5, y2 = base(to) + 3;
      const col = sh.done ? OKC : ACC;
      doc.setDrawColor(...col); doc.setLineWidth(1.2);
      doc.line(x, y1, x, y2);
      if (pi === a.pg0) doc.line(x - 3.5, y1, x + 3.5, y1);
      if (pi === b.pg1) doc.line(x - 3.5, y2, x + 3.5, y2);
      const lab = pdfSafe(D.code[sh.id]);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
      const lw = doc.getTextWidth(lab) + 3;
      doc.setFillColor(255, 255, 255); doc.rect(x - lw / 2, y1 - 8.2, lw, 7.4, 'F');
      doc.setTextColor(...(pi === a.pg0 ? col : col.map(v => Math.round(v + (255 - v) * .35))));   // en la página que sigue, más claro
      doc.text(lab, x, y1 - 2.4, { align: 'center' });
      doc.setTextColor(0, 0, 0); doc.setFontSize(12);
    }
    if (INKI && INKI.get(pi)) anoPdfPage(doc, INKI.get(pi));
    if (mnl) mnPdfPage(doc, mnl, { LEFT, CW, base, rev });
  });
  pgClose();
  const tail = clean ? '_guion' : tagsOn && covOn ? '_guion_rayado_y_etiquetado' : tagsOn ? '_guion_etiquetado' : '_guion_rayado';
  return { doc, name: fileSafe(P.meta.title) + tail + (tagsOn && area ? '_' + fileSafe(area.name) : '') + '.pdf' };
}
/* guion AV: tabla de dos columnas (video y audio) con la duración de cada fila; rayado = con el desglose de cada fila */
function pdfAV(rayado, allow, area) {
  const doc = newDoc();
  doc.setLineHeightFactor(1.15);   // formato de guion: queda como estaba (lote K)
  const total = P.paras.filter(p => p.t === 'v').reduce((a, p) => a + avSecs(p.dur), 0);
  const y = docHeader(doc, rayado ? 'Guion AV rayado' + (area ? ' · ' + area.name : '') : 'Guion AV', [P.meta.author ? 'Guion: ' + P.meta.author : '', P.meta.draft || '', total ? 'Duración ' + avFmt(total) : ''].filter(Boolean).join('  ·  '));
  const nums = typeof edNumsOn === 'function' ? edNumsOn() : true, keys = edAutoKeys(P.paras);
  const tagsOf = i => P.tags.filter(t => t.p === i && P.elements[t.el] && (!allow || allow.has(P.elements[t.el].cat)));
  const body = [];
  let n = 0;
  for (let i = 0; i < P.paras.length; i++) {
    const p = P.paras[i];
    if (p.t === 'h') { body.push([{ content: pdfSafe((nums ? keys.get(i) + '.  ' : '') + p.x.toUpperCase()), colSpan: rayado ? 5 : 4, styles: { fillColor: PDF_GROUP, fontStyle: 'bold' } }]); continue; }
    const u = p.t === 'v' && P.paras[i + 1] && P.paras[i + 1].t === 'u' ? i + 1 : -1;
    const row = [String(++n), pdfSafe(p.x), u >= 0 ? pdfSafe(P.paras[u].x) : '', pdfSafe(p.dur || '')];
    if (rayado) row.push(pdfSafe([...tagsOf(i), ...(u >= 0 ? tagsOf(u) : [])].map(t => CAT[P.elements[t.el].cat].short + ': ' + P.elements[t.el].name).filter((x, k, a) => a.indexOf(x) === k).join('\n')));
    body.push(row);
    if (u >= 0) i = u;
  }
  doc.autoTable({ ...TBL, startY: y, head: [rayado ? ['#', 'VIDEO', 'AUDIO', 'DUR.', 'DESGLOSE'] : ['#', 'VIDEO', 'AUDIO', 'DUR.']], body,
    // (lote AH) el guion AV conserva su formato de guion: sus líneas finas de color (sin la rejilla negra de producción)
    theme: 'striped', styles: { ...TBL.styles, fontSize: 9.5, cellPadding: 6, valign: 'top', lineWidth: .4, lineColor: PT.line }, headStyles: { fillColor: PT.bar, textColor: PT.barInk, fontStyle: 'bold' },
    columnStyles: rayado ? { 0: { cellWidth: 22 }, 3: { cellWidth: 38, halign: 'right' }, 4: { cellWidth: 110, fontSize: 7.5 } } : { 0: { cellWidth: 22 }, 3: { cellWidth: 40, halign: 'right' } } });
  pageNumbers(doc, rayado ? 'Guion AV rayado' : 'Guion AV');
  return { doc, name: fileSafe(P.meta.title) + (rayado ? '_guion_AV_rayado' + (area ? '_' + fileSafe(area.name) : '') + '.pdf' : '_guion_AV.pdf') };
}

/* ---------- desglose ---------- */
/* hoja de desglose en el formato de la productora */
function drawSheetPage(doc, s) {
  const d = sheetData(s);
  const W = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), M = 36, R = W - M;
  // (lote AH) arriba, la cabecera en cuadro de todos los documentos: «Hoja de desglose» con su número en un cuadro negro
  // (como en la app), el proyecto y la productora (antes, en la barra de color de la pestaña)
  let y = docHeader(doc, 'Hoja de desglose', '', { badge: d.no }) - 2;
  // (lote AH) los datos de la escena en una rejilla, como un formulario (antes, rótulos con una línea para escribir)
  const lab = t => ({ content: t, styles: { textColor: MUTED, fontSize: PF.small, fillColor: PDF_LABF } });
  const val = (v, cs, fs) => ({ content: pdfSafe(v || ''), colSpan: cs || 1, styles: { fontStyle: 'bold', ...(fs ? { fontSize: fs } : {}) } });
  const L = (t, cs) => ({ ...lab(t), colSpan: cs || 1 });
  // ocho columnas (los rótulos del renglón de la secuencia caben en una sola línea); los otros renglones las juntan
  const cw = [60, 34, 54, 0, 46, 38, 66, 44], fixed = cw.reduce((a, v) => a + v, 0);
  cw[3] = R - M - fixed;
  doc.autoTable({ ...TBL, startY: y, margin: { left: M, right: M }, tableWidth: R - M,
    styles: { ...TBL.styles, fontSize: 8.5, cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 }, valign: 'middle', overflow: 'ellipsize' },
    columnStyles: Object.fromEntries(cw.map((w, i) => [i, { cellWidth: w }])),
    body: [
      [L('Páginas de guion', 2), val(d.pages, 2), L('Fecha', 2), val(d.fecha, 2)],
      [L('Productora', 2), val(d.productora, 6)],
      [L('Título de la obra', 2), val(d.titulo, 6)],
      [L('Secuencia'), val(d.secuencia), L('Decorado'), val(d.decorado, 1, 8), L('INT/EXT'), val(d.ie), L('DÍA/NOCHE'), val(d.dn)],
      [L('Descripción', 2), { ...val(d.desc, 6), styles: { fontStyle: 'normal', fontSize: 8, overflow: 'linebreak' } }],
    ] });
  y = doc.lastAutoTable.finalY;
  // cajas
  const top = y + 10, Wd = R - M, H = PH - 36 - top;
  const h1 = H * .4, h2 = H * .25, h3 = H - h1 - h2;
  const B = Object.fromEntries(SHEET.map(b => [b.id, b]));
  const box = (id, x, yy, w, h) => {
    const b = B[id], list = d.box[id];
    // como en la app: la cabecera de la caja en el color entero de su categoría y el área de sus elementos en un tono
    // suave del mismo (se puede escribir encima), sin bordes negros
    // (lote I, mejora 7) la cabecera en el color entero, con la letra que se lee encima (negra o blanca), y el cuerpo
    // con una veladura del mismo color, como en la pantalla
    const bc = rgb(b.color), bar = bdBar(b.color), ink = bar.ink === '#FFFFFF' ? PDF_WHITE : INK;
    doc.setFillColor(...rgb(bar.bg)); doc.rect(x, yy, w, 20, 'F');
    doc.setFillColor(...mixc(bc, rgb('#FCFCFB'), .14)); doc.rect(x, yy + 20, w, h - 20, 'F');
    // (lote AH) cada caja en su cuadro con líneas negras (antes, separadas por un filete blanco), con la cabecera
    // cerrada por una línea: la hoja se lee como una rejilla, también en blanco y negro
    pdfBox(doc, x, yy, w, h); doc.setLineWidth(GRID.cell); doc.line(x, yy + 20, x + w, yy + 20);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...ink);
    doc.text(b.name, x + 8, yy + 13.6);
    if (list.length) { const nm = doc.getTextWidth(b.name); doc.setFont('helvetica', 'normal'); doc.text(String(list.length), x + 14 + nm, yy + 13.6); }
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'normal');
    // (lote K) los elementos un poco más grandes y con aire («1. Ana», no «1.ANA»); una caja vacía queda en blanco,
    // para escribir encima (antes llevaba «-»)
    doc.setFontSize(8.8);
    const lines = list.map((e, i) => `${i + 1}.  ${pdfSafe(itemLabel(e))}`);
    if (id === 'notes' && d.notes) lines.push(...doc.splitTextToSize(pdfSafe(d.notes), w - 20));
    if (!lines.length) return;
    const lh = 12.4, rows = Math.floor((h - 32) / lh);
    const cols = lines.length > rows || (id === 'props' && lines.length > 7) ? 2 : 1;
    const cw = (w - 16) / cols;
    let k = 0;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows && k < lines.length; r++, k++) {
      const t = doc.splitTextToSize(lines[k], cw - 6)[0];
      doc.text(t, x + 10 + c * cw, yy + 33 + r * lh);
    }
    if (k < lines.length) doc.text(`(+${lines.length - k} más)`, x + w - 8, yy + h - 5, { align: 'right' });
  };
  const c1 = Wd * .37, c2 = Wd * .32;
  box('cast', M, top, c1, h1);
  box('equip', M + c1, top, c2, h1 / 2); box('sfx', M + c1, top + h1 / 2, c2, h1 / 2);
  box('extras', M + c1 + c2, top, Wd - c1 - c2, h1);
  box('props', M, top + h1, Wd / 2, h2); box('ward', M + Wd / 2, top + h1, Wd / 2, h2);
  const d1 = Wd * .32, d2 = Wd * .31;
  box('veh', M, top + h1 + h2, d1, h3); box('sound', M + d1, top + h1 + h2, d2, h3); box('notes', M + d1 + d2, top + h1 + h2, Wd - d1 - d2, h3);
}
function pdfBreakdown(opts = {}) {
  const doc = newDoc();
  const SC = pdfScenes();
  SC.forEach((s, i) => {
    if (i) doc.addPage();
    drawSheetPage(doc, s);
    // con fotos: la lámina de la escena, solo con los elementos que tienen fotos o notas (lote AH: en el mismo papel
    // que las hojas; antes iba siempre en A4)
    if (opts.photos) {
      const ent = sceneEntries(s, SHEET.filter(b => b.id !== 'notes').map(b => b.id)).filter(x => photosOf(x.e).length || refOf(x.e).note);
      if (ent.length) { doc.addPage(); drawLamina(doc, 'Lámina de la escena ' + s.key, s.heading, ent.map(x => ({ ...x, label: SHEET.find(b => b.id === x.box).name + ' · ' + x.label })), true); }
    }
  });
  // reporte de elementos (solo con todas las escenas)
  if (pdfPart()) { pageNumbers(doc, 'Desglose'); return { doc, name: fileSafe(P.meta.title) + (opts.photos ? '_desglose_con_fotos.pdf' : '_desglose.pdf') }; }
  doc.addPage();
  let y = docHeader(doc, 'Reporte de elementos', Object.keys(P.elements).length + ' elementos');
  const scenesOf = {};
  D.sem.forEach((set, si) => set.forEach(id => { (scenesOf[id] = scenesOf[id] || []).push(D.sc.scenes[si].key); }));
  const blocks = [];
  for (const c of CATS) {
    const list = Object.values(P.elements).filter(e => e.cat === c.id && (scenesOf[e.id] || []).length)
      .sort((a, b) => c.id === 'cast' ? (D.castNum[a.id] || 99) - (D.castNum[b.id] || 99) : a.name.localeCompare(b.name));
    if (!list.length) continue;
    const body = [[pdfRich([{ segs: [{ t: c.name, st: 'bold' }, { t: `   ${list.length}`, col: MUTED }] }], { colSpan: 3, fillColor: tint(c.color, .3) })]];
    for (const e of list) body.push([pdfSafe((c.id === 'cast' && D.castNum[e.id] ? D.castNum[e.id] + '. ' : '') + e.name), { content: String(scenesOf[e.id].length), styles: { halign: 'right' } }, pdfSafe(scenesOf[e.id].join(', '))]);
    blocks.push(body);
  }
  pdfBlocks(doc, y, { ...TBL, head: [['Elemento', 'Esc.', 'Escenas']], columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: 40 } } }, blocks);
  pageNumbers(doc, 'Desglose');
  return { doc, name: fileSafe(P.meta.title) + (opts.photos ? '_desglose_con_fotos.pdf' : '_desglose.pdf') };
}

/* ---------- storyboard ---------- */
/* la viñeta del plano en un recuadro de w×h: con cámara B, la A más angosta y la B más chica a su lado, con su lente */
function pdfFrames(doc, sh, x, y, w, h) {
  const put = (img, ix, iy, iw, ih) => { try { doc.addImage(img, img.startsWith('data:image/png') ? 'PNG' : 'JPEG', ix, iy, iw, ih); } catch (e) { PDF_MISS++; } doc.setDrawColor(...PDF_RULE); doc.setLineWidth(GRID.cell); doc.rect(ix, iy, iw, ih); };   // (lote AH) el borde de la viñeta, negro
  const B = shotB(sh);
  if (!B) { put(frameOf(sh), x, y, w, h); return w; }
  const gap = 6, ar = w / h, wa = (w - gap) * .68, wb = w - gap - wa, ha = wa / ar, hb = wb / ar;
  put(frameOf(sh), x, y, wa, ha);
  put(frameOf(B), x + wa + gap, y, wb, hb);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...INK);
  doc.text(pdfSafe('A · ' + Math.round(camKeys(s3Of(sh))[0].cam.lens) + ' mm'), x + wa, y + ha + 8, { align: 'right' });
  doc.text(pdfSafe('B · ' + lensB(sh) + ' mm'), x + wa + gap, y + hb + 8);
  doc.setFont('helvetica', 'normal');
  return wa;   // el ancho de la viñeta de la A (el sello «Rodado» va sobre ella)
}
/* planta de cámara del plano como imagen */
function planImage(sh, px = 340) {
  const s3 = s3Of(sh);
  const c = document.createElement('canvas');
  const pl = makePlan(c, { s3, sel: null, state: () => s3At(s3, 0), camLetter: () => s3HasB(s3) ? 'A' : '', other: () => s3HasB(s3) ? planOther(s3, 0, 'B') : null }, { w: px, h: px, static: true, dpr: 1.8 });
  pl.fit();
  return c.toDataURL('image/jpeg', .86);
}
function shotRigText(sh) {
  const s3 = s3Of(sh), st = s3At(s3, 0), c = st.cam;
  const aim = s3.aim && s3.objs.find(o => o.id === s3.aim);
  let t = `Cámara${s3HasB(s3) ? ' A' : ''}: ${Math.round(c.lens)} mm${lensEqText(s3) ? ` (${sensorOf(s3)[1]}, como ${Math.round(camFF(c))} mm en full frame)` : ''} · altura ${c.h.toFixed(2)} m` + (aim ? ` · sigue a ${aim.name}` : '') + (s3.keys.length > 1 ? ` · ${s3.keys.length} claves` : '');
  if (s3HasB(s3)) { const v = s3ForB(s3), cb = s3At(v, 0).cam, ab = v.aim && v.objs.find(o => o.id === v.aim); t += `\nCámara B: ${Math.round(cb.lens)} mm · altura ${cb.h.toFixed(2)} m` + (ab ? ` · sigue a ${ab.name}` : ''); }
  const L = s3.objs.filter(o => o.kind === 'luz');
  if (L.length) t += '\nLuces: ' + L.map(o => { const p = st.o[o.id] || {}; return `${o.name} (${(S3_LIGHTS[o.type] || {}).name || o.type}, ${Math.round(p.k || 0)} K, ${Math.round(p.int || 0)} %)`; }).join('; ');
  if (s3.set === 'int') { const R = roomOf(s3); t += `\nInterior de ${R.w} x ${R.d} m, alto ${R.h} m`; }
  return t;
}
/* (lote AH) el storyboard en cuadro: cada plano (o cada fila, con la planta) en su cuadro de líneas negras; las medidas
   salen del papel (carta o A4: la A4 apaisada es más ancha y más baja) */
function pdfStoryboardPlan(shots) {
  const doc = newDoc('landscape');
  const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), M = 36, gap = 8, per = 3, pad = 6, top = HDR.top + HDR.h + 12;
  const rowH = Math.min(150, (PH - top - 30 - gap * (per - 1)) / per - pad * 2);
  const ar = ASPECTS[P.meta.aspect] || 16 / 9;
  const fw = Math.min(300, rowH * ar), fh = fw / ar, ps = rowH;
  const x0 = M + pad, tx = x0 + fw + 12 + ps + 16, tw = PW - M - pad - tx;
  if (!shots.length) { docHeader(doc, 'Storyboard con planta'); doc.setFontSize(11); doc.text('Todavía no hay planos.', M, 110); }
  shots.forEach((sh, i) => {
    if (i % per === 0) { if (i) doc.addPage(); docHeader(doc, 'Storyboard con planta de cámara', P.meta.aspect); }
    const by = top + (i % per) * (rowH + pad * 2 + gap), y = by + pad;
    pdfBox(doc, M, by, PW - 2 * M, rowH + pad * 2);
    const fwA = pdfFrames(doc, sh, x0, y, fw, fh);
    try { doc.addImage(planImage(sh), 'JPEG', x0 + fw + 12, y, ps, ps); } catch (e) { PDF_MISS++; }
    doc.setDrawColor(...PDF_RULE); doc.setLineWidth(GRID.cell); doc.rect(x0 + fw + 12, y, ps, ps);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...MUTED); doc.text('PLANTA', x0 + fw + 16, y + 8);
    if (sh.done) { doc.setTextColor(...OKC); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('RODADO', x0 + fwA - 4, y + 11, { align: 'right' }); }
    pdfVLine(doc, tx - 9, by, by + rowH + pad * 2, GRID.cell);
    let ty = y + 10;
    doc.setFont('title', 'bold'); doc.setFontSize(12.5); doc.setTextColor(...INK);
    doc.text(pdfSafe(`${D.code[sh.id]}  ·  Esc. ${sh.sc}`), tx, ty); ty += 14;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    const tech = [sh.size, sh.angle !== 'Normal' ? sh.angle : '', sh.move !== 'Fijo' ? sh.move : '', sh.support || '', shotDur(sh) + ' s'].filter(Boolean).join(' · ');
    doc.text(doc.splitTextToSize(pdfSafe(tech), tw), tx, ty); ty += 12;
    const desc = doc.splitTextToSize(pdfSafe(sh.desc || ''), tw).slice(0, 3);
    if (desc.length) { doc.setTextColor(...INK); doc.text(desc, tx, ty); ty += desc.length * 10.5 + 2; }
    doc.setFontSize(7.8); doc.setTextColor(...MUTED);
    const rig = doc.splitTextToSize(pdfSafe(shotRigText(sh)), tw).slice(0, 5);
    doc.text(rig, tx, ty); ty += rig.length * 9.5 + 3;
    doc.setFont('courier', 'normal'); doc.setFontSize(7.5);
    const left = Math.max(0, Math.floor((y + rowH - ty) / 9));
    if (left) doc.text(doc.splitTextToSize(pdfSafe(shotTextExcerpt(sh, 300)), tw).slice(0, left), tx, ty);
  });
  pageNumbers(doc, 'Storyboard');
  return { doc, name: fileSafe(P.meta.title) + '_storyboard_planta.pdf' };
}
function pdfStoryboard(opts = {}) {
  const allK = D.sc.scenes.map(s => s.key), keys = PDF_SEL && PDF_SEL.sc ? pdfKeys(allK) : UI.sbScene ? [UI.sbScene] : allK;
  if (opts.plan) return pdfStoryboardPlan(keys.flatMap(k => D.shotsBy[k] || []));
  const doc = newDoc('landscape');
  const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), M = 36, gap = 10, cols = 3, pad = 6, TXT = 80, top = HDR.top + HDR.h + 12;
  const shots = keys.flatMap(k => D.shotsBy[k] || []);
  const ar = ASPECTS[P.meta.aspect] || 16 / 9;
  const cw = (PW - M * 2 - gap * (cols - 1)) / cols;
  // dos filas por hoja si las viñetas quedan de un buen tamaño (en A4 apaisada, un poco más bajas); si no, una
  const fit = r => Math.min((cw - pad * 2) / ar, 160, (PH - top - 30 - gap * (r - 1)) / r - TXT - pad * 2);
  const rows = fit(2) >= 70 ? 2 : 1, ih = fit(rows), iw = ih * ar;
  const cellH = ih + TXT + pad * 2;
  const per = cols * rows;
  if (!shots.length) { docHeader(doc, 'Storyboard'); doc.setFontSize(11); doc.text('Todavía no hay planos.', M, 110); }
  shots.forEach((sh, i) => {
    if (i % per === 0) { if (i) doc.addPage(); docHeader(doc, 'Storyboard', P.meta.aspect); }
    const k = i % per, c = k % cols, r = Math.floor(k / cols);
    const bx = M + c * (cw + gap), by = top + r * (cellH + gap), x = bx + pad, y = by + pad, w = cw - pad * 2;
    pdfBox(doc, bx, by, cw, cellH);
    const iwA = pdfFrames(doc, sh, x + (w - iw) / 2, y, iw, ih);
    if (sh.done) { doc.setTextColor(...OKC); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text('RODADO', x + (w - iw) / 2 + iwA - 4, y + 11, { align: 'right' }); }
    let ty = y + ih + 14;
    doc.setFont('title', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK);
    doc.text(pdfSafe(D.code[sh.id]), x, ty);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    const tech = [sh.size, sh.angle !== 'Normal' ? sh.angle : '', sh.move !== 'Fijo' ? sh.move : '', sh.lens ? sh.lens + 'mm' : '', sh.dur ? sh.dur + 's' : ''].filter(Boolean).join(' · ');
    doc.text(pdfCut(doc, pdfSafe(tech), w - 30), x + 30, ty);
    ty += 12;
    doc.setFontSize(8.5); doc.setTextColor(...INK);
    const desc = doc.splitTextToSize(pdfSafe(sh.desc || ''), w).slice(0, 2);
    if (desc.length) { doc.text(desc, x, ty); ty += desc.length * 8.5 * doc.getLineHeightFactor() + 1; }
    doc.setFont('courier', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
    const ex = doc.splitTextToSize(pdfSafe(shotTextExcerpt(sh, 260)), w).slice(0, Math.max(0, Math.floor((by + cellH - pad - ty + 4) / 9)));
    doc.text(ex, x, ty);
  });
  pageNumbers(doc, 'Storyboard');
  return { doc, name: fileSafe(P.meta.title) + '_storyboard.pdf' };
}

/* ---------- guion técnico ---------- */
function pdfShotlist() {
  const doc = newDoc('landscape');
  let y = docHeader(doc, 'Guion técnico', Object.keys(P.shots).length + ' planos');
  const allK = D.sc.scenes.map(s => s.key), keys = PDF_SEL && PDF_SEL.sc ? pdfKeys(allK) : UI.sbScene ? [UI.sbScene] : allK;
  y = pdfLegend(doc, y, lgDocItems('shotlist', pdfPlanUsed(keys.map(k => ({ k }))))) + 4;
  const blocks = [], cuts = typeof callShotCuts === 'function' ? callShotCuts() : {};   // (lote AH) quitados en una hoja de llamado
  for (const k of keys) {
    const s = sceneOfKey(k), shots = D.shotsBy[k] || [], f = stripRGB(s);
    // (lote K) la escena: el número en su cuadro, el encabezado en negrita y las páginas en gris
    const rows = [[{ ...pdfRich([{ segs: [{ t: s.heading, st: 'bold' }, { t: `   ${fmtEighths(D.metrics.eighths[s.idx])} págs.`, col: mutedOn(f) }] }], { colSpan: 10, fillColor: f, textColor: inkOn(f) }), _badge: k }]];
    for (const sh of shots) rows.push([D.code[sh.id], sh.size || '', pdfSafe(sh.angle || ''), pdfSafe(sh.move || ''), (sh.lens ? (lensB(sh) ? 'A ' : '') + sh.lens + ' mm' : '') + (lensB(sh) ? '\nB ' + lensB(sh) + ' mm' : ''), pdfSafe(sh.support || ''), sh.dur ? sh.dur + ' s' : '',
      pdfSafe((sh.chars || []).map(id => P.elements[id] && P.elements[id].name).filter(Boolean).join(', ')), pdfSafe(sh.desc || shotTextExcerpt(sh, 120)), sh.done ? 'Rodado' : cuts[sh.id] ? callCutLabel(cuts[sh.id]) : '']);
    if (!shots.length) rows.push([{ content: 'Sin planos', colSpan: 10, styles: { textColor: MUTED, fontSize: PF.small } }]);
    blocks.push(rows);
  }
  pdfBlocks(doc, y, { ...TBL, styles: { ...TBL.styles, fontSize: 8.5, cellPadding: { top: 4.5, bottom: 4.5, left: 6, right: 6 } }, head: [['Plano', 'Tam.', 'Ángulo', 'Movimiento', 'Lente', 'Soporte', 'Dur.', 'En cuadro', 'Descripción', 'Estado']],
    columnStyles: { 0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: 40 }, 2: { cellWidth: 78 }, 3: { cellWidth: 82 }, 4: { cellWidth: 50 }, 5: { cellWidth: 60 }, 6: { cellWidth: 36 }, 7: { cellWidth: 98 }, 9: { cellWidth: 52 } },
    didParseCell: d => { if (d.section === 'body' && d.column.index === 9 && d.cell.raw === 'Rodado') d.cell.styles.textColor = OKC; } }, blocks);
  pageNumbers(doc, 'Guion técnico');
  return { doc, name: fileSafe(P.meta.title) + '_guion_tecnico.pdf' };
}

/* ---------- stripboard ---------- */
/* una línea de texto que no entra se corta con «...» (la sinopsis bajo la locación, como en la pantalla) */
function pdfOneLine(doc, t, w, fs, st) {
  t = pdfSafe(t); if (!t) return '';
  doc.setFont('helvetica', st || 'normal'); doc.setFontSize(fs);
  if (doc.getTextWidth(t) <= w) return t;
  let lo = 0, hi = t.length;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (doc.getTextWidth(t.slice(0, m).trimEnd() + '...') <= w) lo = m; else hi = m - 1; }
  return t.slice(0, lo).trimEnd() + '...';
}
/* el plan de rodaje (lote U: el stripboard): las columnas y los colores de la pantalla, cada escena una tira a todo el
   ancho. (lote AH) El documento se llama «Plan de rodaje» (Shooting Schedule); va en cuadro, tipo Excel: líneas negras
   completas en todas las celdas (las tiras y las barras de jornada y de cierre conservan sus colores) y la leyenda y el
   reparto de abajo, cada uno en su cuadro. Con «Miniaturas del storyboard» (Exportar, P.schedule.noThumbs), debajo de
   cada escena sus planos con su viñeta, como la hoja de llamado */
function pdfPlan() {
  const doc = newDoc('landscape');
  const S = P.schedule, LAB = 'Plan de rodaje';
  const { days, bank, bankRows } = scheduleDays(P, D.sc);
  const dates = shootDates(P, days.length);
  let y = docHeader(doc, LAB, `${days.filter(d => d.keys.length).length} jornadas${dates[0] ? ' · ' + fmtDate(dates[0]) + ' a ' + fmtDate(dates[dates.length - 1]) : ''}`);
  // (lote AH) la rejilla negra, bien visible, en todas las celdas, y los cuadros de la leyenda y del reparto
  const W = doc.internal.pageSize.getWidth(), M = 30, GRID = PDF_BLACK, GW = .7, LINE = { lineColor: GRID, lineWidth: GW };
  const box = (y0, y1) => { doc.setDrawColor(...GRID); doc.setLineWidth(GW); doc.rect(M, y0, W - 2 * M, y1 - y0, 'S'); };
  const lg = lgDocItems('plan', pdfPlanUsed([...days.flatMap(d => d.rows), ...bankRows].map(i => S.items[i]), days.map(d => d.brk)));
  if (lg.length) { const y0 = y; y = pdfLegend(doc, y + 2, lg, M + 8); box(y0, y - 1); y += 6; } else y += 4;
  const NC = 12, INKP = INK;   // sin columna de fecha: la jornada va en su barra, como en la app
  const shade = (hex, k) => rgb(hex).map(v => Math.round(v * k));
  // (lote K) 8,4 pt (el plan es la tabla más larga)
  const FS = 8.4, bar = (txt, fill, color, extra) => [{ content: pdfSafe(txt), colSpan: NC, styles: { fillColor: fill, textColor: color || INKP, fontStyle: 'bold', ...(extra || {}) } }];
  // los anchos: todas fijas salvo la locación del guion (se estira). (lote AH) «Tiempo aprox.» entra entero en su título
  // (con la letra de la persona y en inglés, «Approx. time»); las notas ceden un poco
  doc.setFont('helvetica', 'bold'); doc.setFontSize(TBL.headStyles.fontSize || PF.head);
  const tW = Math.max(42, Math.ceil(doc.getTextWidth('Tiempo aprox.')) + 13);
  const CW = { 0: 30, 1: 26, 3: 50, 4: 62, 5: 30, 6: 88, 7: 36, 8: 30, 9: tW, 10: 80, 11: 76 };
  const setW = W - 2 * M - Object.values(CW).reduce((a, v) => a + v, 0) - 10;
  // (lote AH) los planos del storyboard de cada escena (tab-plan.js): el plano, su viñeta con la descripción técnica y la
  // acción (bajo I/E, Locación y D/N), los personajes (bajo Reparto), el lente y el sonido (bajo Notas técnicas) y sus
  // notas (bajo Observaciones). Las filas en blanco, con una franja del color de la tira a la izquierda
  const shotsOn = typeof planDocThumbs === 'function' && planDocThumbs();
  const ar = ASPECTS[P.meta.aspect] || 16 / 9, TH = Math.min(46 / ar, 34), TW = TH * ar;
  const SP = { top: 3.5, bottom: 3.5, left: 5, right: 5 }, SS = { fontSize: PF.small, textColor: INK, fillColor: PDF_WHITE, cellPadding: SP };
  const shotRows = it => {
    const s = sceneOfKey(it.k), sb = mixc(pdfHl(it) || rgb(stripColor(s)), INK, .85);
    return planDocShotsOf(it).map(sh => {
      const x = shotCallInfo(sh), u = thumbCached(sh), det = x.det.map(v => tr(v)).join(' · '), e = { content: '', styles: SS };
      return [{ content: pdfSafe(x.code), styles: { ...SS, fontStyle: 'bold', halign: 'center', cellPadding: { ...SP, left: 7 } }, _bar: sb },
        { ...pdfRich([{ fs: PF.small, segs: [{ t: x.size || '', st: 'bold' }, ...(det ? [{ t: (x.size ? ' · ' : '') + det, col: MUTED, tr: false }] : [])] }, x.act ? { t: x.act, fs: PF.small, tr: false } : null],
          { ...SS, colSpan: 3, cellPadding: { ...SP, left: u ? TW + 10 : SP.left }, ...(u ? { minCellHeight: TH + 7 } : {}) }), _img: u },
        { content: pdfSafe(x.cast.join(', ')), styles: { ...SS, fontStyle: 'bold' } }, e, e, e, e, e,
        x.lens || x.snd ? pdfRich([x.lens ? { t: x.lens, fs: PF.small, tr: false } : null, x.snd ? { t: x.snd, fs: PF.small, col: MUTED } : null], SS) : e,
        { content: pdfSafe(sh.notes || ''), styles: SS }];
    });
  };
  const rowCells = i => {
    const it = S.items[i];
    if (it.e) {
      const f = pdfHl(it) || rgb(lgCol('plan', 'ev'));
      const st = { fillColor: f, textColor: inkOn(f) };
      return [{ content: pdfSafe(it.name || 'Evento'), colSpan: 3, styles: { ...st, fontStyle: 'bold' } }, { content: pdfSafe(it.det || ''), colSpan: 6, styles: st }, { content: fmtDur(num(it.dur) || rowEstDur(it)), styles: { ...st, fontStyle: 'bold' } }, { content: pdfSafe(it.tech || ''), styles: st }, { content: pdfSafe(it.obs || ''), styles: st }];
    }
    const s = sceneOfKey(it.k);
    const sf = pdfHl(it) || rgb(stripColor(s)), st = { fillColor: sf, textColor: inkOn(sf) };   // resaltada, o su tira, entera, como en la app
    const syn = synopsisOf(s);
    // la locación del guion en negrita y la sinopsis debajo, en una línea, más chica y en gris
    const hd = pdfRich([{ t: setOf(s) + (it.sp ? ` (parte ${it.sp})` : ''), fs: FS, st: 'bold' }, syn ? { t: pdfOneLine(doc, trDone(tr(syn)), setW, PF.small - .4), fs: PF.small - .4, col: mutedOn(sf) } : null], st);
    const nums = S.castMode === 'name' ? null : sceneCast(s.idx).map(e => D.castNum[e.id]).filter(Boolean);
    // (lote X) el reparto en números simples, separados por comas (sin círculos)
    const cast = nums ? { content: nums.join(', '), styles: { ...st, fontStyle: 'bold' } }
      : { content: pdfSafe(sceneCast(s.idx).map(e => titleCase(e.name)).join(', ')), styles: st };
    const e8 = partEighths(it), w8 = Math.floor(e8 / 8), f8 = e8 % 8;
    const pgs = pdfRich([{ segs: [...(w8 || !f8 ? [{ t: String(w8), st: 'bold', fs: FS + 1 }] : []), ...(f8 ? [{ t: (w8 ? ' ' : '') + f8 + '/8', st: 'bold', fs: FS - 1 }] : [])] }], { ...st, halign: 'right', valign: 'top' });
    return [{ content: rowCode(it), styles: { ...st, fontStyle: 'bold', halign: 'center' } }, { content: ieLab(s), styles: { ...st, fontSize: PF.small } }, hd,
      { content: DN_LAB[stripDN(s)], styles: { ...st, fontSize: PF.small } }, cast,
      { content: it.fig != null ? String(it.fig) : '', styles: { ...st, halign: 'right' } }, { content: pdfSafe(planLoc(it, s)), styles: { ...st, fontStyle: 'bold' } },
      pgs, { content: String(D.metrics.page[s.idx]), styles: { ...st, halign: 'right' } }, { content: fmtDur(num(it.dur) || rowEstDur(it)), styles: st },
      { content: pdfSafe(it.tech || ''), styles: st }, { content: pdfSafe(it.obs || ''), styles: st }];
  };
  // (lote AH) cada escena con sus planos; con los planos, cada escena es un bloque (pdfBlocks): si no cabe al pie de la
  // página, pasa entera a la siguiente (la barra de la jornada va con la primera y el cierre con la última). Sin los
  // planos, como siempre: la jornada entera es un bloque
  const chunk = i => [rowCells(i), ...(shotsOn && S.items[i] && S.items[i].k ? shotRows(S.items[i]) : [])];
  const put = (head, chunks, tail) => {
    if (!chunks.length) chunks = [[]];
    if (shotsOn) { chunks[0] = [...head, ...chunks[0]]; chunks[chunks.length - 1] = [...chunks[chunks.length - 1], ...tail]; blocks.push(...chunks); }
    else blocks.push([...head, ...chunks.flat(), ...tail]);
  };
  const stages = S.stages || [];
  let lastStage;
  const lastN = days.reduce((a, d, n) => pdfDayOk(n) ? n : a, -1), bankOn = !(PDF_SEL && PDF_SEL.days);
  const blocks = [];
  days.forEach((d, n) => {
    if (!pdfDayOk(n)) return;
    const head = [];
    const tone = stageTone(P, d.stage);
    if (stages.length && d.stage !== lastStage) {
      const st = stages.find(x => x.id === d.stage);
      if (st) head.push(bar(`Etapa ${stages.indexOf(st) + 1}${st.name ? ' · ' + st.name : ''}${st.place ? '   ' + st.place : ''}`, shade(tone, .86), INKP));
    }
    lastStage = d.stage;
    const done = dayDone(d), dt = dates[n];
    // la jornada en una barra de ancho completo, igual que en la app: «Jornada 1 · Lun. 29 sept. · Llamado 07:00»
    // (o en el color elegido para su cierre); debajo, las escenas
    const jc = pdfHl(d.brk) || rgb(lgCol('plan', 'brk')), jdark = inkOn(jc) !== INK;
    const tot = planDayTimes(d).total;
    const nsc = d.rows.filter(i => S.items[i] && S.items[i].k).length;
    const jtxt = [`Jornada ${n + 1}`, dt ? cap1(fmtDate(dt)) : 'Sin fecha', nsc ? `${nsc} ${nsc === 1 ? 'escena' : 'escenas'}` : '', tot ? fmtDur(tot) : '', done ? 'Completada' : ''].filter(Boolean).join('   ·   ');
    head.push(bar(jtxt, jc, jdark ? (done ? [150, 222, 176] : [242, 242, 242]) : (done ? OKC : INKP), { font: 'title', fontSize: 9.2, cellPadding: { top: 6, bottom: 6, left: 8, right: 8 } }));
    const chunks = d.rows.map(chunk);
    if (!d.rows.length) chunks.push([[{ content: 'Jornada sin escenas', colSpan: NC, styles: { textColor: MUTED } }]]);
    const inf = dayInfo(d.keys, d.rows), tail = [];
    const cast = [...inf.cast].map(id => S.castMode === 'name' ? titleCase(P.elements[id].name) : D.castNum[id]).sort((a, c) => typeof a === 'number' ? a - c : String(a).localeCompare(c));
    tail.push(bar(`Cierre de jornada ${n + 1} de ${days.length}  ·  ${fmtEighths(inf.e)} págs.  ·  ${d.keys.length} ${d.keys.length === 1 ? 'escena' : 'escenas'}${inf.locs.size ? '  ·  ' + [...inf.locs].join(', ') : ''}${cast.length ? '  ·  Rep. ' + cast.join(', ') : ''}${inf.fig ? '  ·  Fig. ' + inf.fig : ''}${done ? '  ·  Completada' : ''}`,
      jc, jdark ? [242, 242, 242] : INKP, { fontSize: PF.small }));
    // un poco de aire entre jornada y jornada (sin rejilla: cada jornada queda en su cuadro)
    if (n < lastN || (bankOn && bankRows.length)) tail.push([{ content: '', colSpan: NC, styles: { fillColor: PDF_WHITE, minCellHeight: 10, cellPadding: 0, lineWidth: 0 } }]);
    put(head, chunks, tail);
  });
  if (bankOn && bankRows.length) put([bar(`Sin programar (${bank.length})`, PT.fill2, INKP)], bankRows.map(chunk), []);
  y = pdfBlocks(doc, y, { ...TBL, head: [['Esc.', 'I/E', 'Locación', 'D/N', 'Reparto', 'Fig.', 'Locación de rodaje', 'Págs.', 'Pág.', 'Tiempo aprox.', 'Notas técnicas', 'Observaciones']],
    margin: { left: M, right: M, bottom: 44, top: 38 }, rowPageBreak: 'avoid',
    styles: { ...TBL.styles, fontSize: FS, cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 }, ...LINE },
    headStyles: { ...TBL.headStyles, ...LINE },
    columnStyles: Object.fromEntries(Object.entries(CW).map(([k, w]) => [k, { cellWidth: w }])),
    // la franja de la tira y la viñeta de cada plano
    didDrawCell: d => {
      const r = d.cell.raw; if (d.section !== 'body' || !r) return;
      if (r._bar) { doc.setFillColor(...r._bar); doc.rect(d.cell.x + GW / 2, d.cell.y + GW / 2, 2.4, d.cell.height - GW, 'F'); }
      if (r._img) { try { doc.addImage(r._img, r._img.startsWith('data:image/png') ? 'PNG' : 'JPEG', d.cell.x + 5, d.cell.y + 3.5, TW, TH); } catch (e) { PDF_MISS++; } }
    } }, blocks);
  if (S.castMode !== 'name') {
    const legend = Object.entries(D.castNum).sort((a, b) => a[1] - b[1]).map(([id, n]) => [String(n), pdfSafe(titleCase(P.elements[id].name))]);
    // los números del reparto en una línea (antes, una tabla que sola pasaba a otra página); (lote AH) en su cuadro
    if (legend.length) doc.autoTable({ ...TBL, startY: y + 8, margin: { left: M, right: M, bottom: 44, top: 38 }, rowPageBreak: 'avoid', styles: { ...TBL.styles, ...LINE },
      body: [[pdfRich([{ segs: [{ t: 'Reparto   ', st: 'bold', tr: 1 }, ...legend.flatMap(([n, nm], i) => [{ t: n + ' ', st: 'bold' }, { t: nm + (i < legend.length - 1 ? '   ·   ' : ''), col: MUTED }])] }], { cellPadding: { top: 5, bottom: 5, left: 8, right: 8 } })]] });
  }
  pageNumbers(doc, LAB);
  return { doc, name: fileSafe(P.meta.title) + '_plan_de_rodaje.pdf' };
}

/* ---------- presupuesto ---------- */
function pdfBudget() {
  const doc = newDoc();
  const T = budgetTotals(P);
  const st = budgetStats(P, D.sc, D.sem);
  const fx = planAllows('usd') ? budgetFx(P) : 0, tn = taxName(P);
  let y = docHeader(doc, 'Presupuesto', `${st.shoot} jornadas de rodaje${fx ? ` · tipo de cambio ${P.budget.currency} ${fx} por US$` : ''}`);
  const cur = pdfSafe(P.budget.currency);
  const m = v => cur + ' ' + moneyNum(v);
  const d = v => 'US$ ' + moneyNum(v / fx);
  const R = { halign: 'right' };
  const sumRow = (lab, v, bold) => { const st2 = bold ? { font: 'title', fontStyle: 'bold', fontSize: 15, textColor: PT.deep } : {}; return [{ content: pdfSafe(lab), styles: st2 }, { content: m(v), styles: { ...R, ...st2 } }, ...(fx ? [{ content: d(v), styles: { ...R, ...st2, textColor: bold ? INK : MUTED } }] : [])]; };
  doc.autoTable({ ...TBL, startY: y, theme: 'plain', body: [
    sumRow('Subtotal', T.sub), sumRow(`Imprevistos (${P.budget.contingency}%)`, T.cont), ...(P.budget.igv ? [sumRow(`${tn} (${P.budget.igvRate}%)`, T.igv)] : []), sumRow('Total', T.total, true)],
    tableWidth: fx ? 380 : 280, margin: { left: 36, right: 36, bottom: 36 } });
  const NC = fx ? 7 : 6;
  const blocks = [];
  for (const s of BUD_SECTIONS) {
    const lines = P.budget.lines.filter(l => l.sec === s.id);
    if (!lines.length) continue;
    const fill = { fillColor: PDF_GROUP, fontStyle: 'bold' }, body = [];
    blocks.push(body);
    body.push([{ content: `${s.code}  ${pdfSafe(s.name)}`, colSpan: 5, styles: fill }, { content: m(T.bySec[s.id] || 0), styles: { ...fill, ...R } }, ...(fx ? [{ content: d(T.bySec[s.id] || 0), styles: { ...fill, ...R } }] : [])]);
    for (const l of lines) body.push([pdfSafe(l.name), { content: String(l.qty), styles: R }, pdfSafe(l.unit), { content: String(l.mult), styles: R }, { content: m(l.rate), styles: R }, { content: m(lineTotal(l)), styles: R }, ...(fx ? [{ content: d(lineTotal(l)), styles: { ...R, textColor: MUTED } }] : [])]);
  }
  const yEnd = pdfBlocks(doc, doc.lastAutoTable.finalY + PF.gap, { ...TBL, head: [['Concepto', 'Cant.', 'Unidad', 'Días/sem.', 'Tarifa', 'Total', ...(fx ? ['Total US$'] : [])]],
    columnStyles: fx ? { 1: { cellWidth: 36 }, 2: { cellWidth: 50 }, 3: { cellWidth: 54 }, 4: { cellWidth: 66 }, 5: { cellWidth: 76 }, 6: { cellWidth: 72 } } : { 1: { cellWidth: 40 }, 2: { cellWidth: 56 }, 3: { cellWidth: 60 }, 4: { cellWidth: 72 }, 5: { cellWidth: 84 } },
    headStyles: { ...TBL.headStyles, halign: 'left' } }, blocks);
  if (NC && budProtected() && BUDS.who) { doc.setFont('helvetica', 'normal'); doc.setFontSize(PF.small); doc.setTextColor(...MUTED); doc.text(pdfSafe(`Exportado por ${BUDS.who.name}`), 36, yEnd + 16); }
  pageNumbers(doc, 'Presupuesto');
  return { doc, name: fileSafe(P.meta.title) + '_presupuesto.pdf' };
}

/* ---------- hoja de script (lote AD): la hoja para imprimir (en blanco) y la llena, en sup-partes.js ---------- */
function pdfSup(opts = {}) { return pdfSupSheet(!!(opts && opts.blank)); }

function pdfAnimatic() {
  const doc = newDoc('landscape');
  const L = anClips();
  const n = L.clips.length, asl = n ? L.total / n : 0;
  const y = docHeader(doc, 'Animatic · lista de montaje', `${n} planos · ${tc(L.total)} · ${fpsOf()} cuadros/s${L.locked.size ? ' · sin las escenas bloqueadas ' + [...L.locked].join(', ') : ''}`);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK);
  doc.text(pdfSafe(`Duración media de plano ${asl.toFixed(1)} s  ·  ${L.total ? (Math.max(0, n - 1) / (L.total / 60)).toFixed(1) : 0} cortes por minuto  ·  plano más largo ${n ? Math.max(...L.clips.map(c => c.dur)).toFixed(1) : 0} s  ·  más corto ${n ? Math.min(...L.clips.map(c => c.dur)).toFixed(1) : 0} s`), 36, y + 2);
  const ar = ASPECTS[P.meta.aspect] || 16 / 9, th = 36, tw = Math.min(th * ar, 80);
  const thumbs = L.clips.map(c => clipThumb(c, 240));
  const TRN = { cut: 'Corte', dis: 'Encadenado', fade: 'Fundido' };
  const what = c => c.sh ? trDone([tr(c.sh.size), c.sh.move !== 'Fijo' ? tr(c.sh.move) : ''].filter(Boolean).join(' · ') + (c.sh.desc ? '  -  ' + c.sh.desc : ''))
    : c.card.kind === 'black' ? 'Negro' : 'Título: ' + [c.card.text, c.card.sub].filter(Boolean).join(' / ');
  const body = L.clips.map((c, i) => [String(i + 1), '', clipCode(c), c.sc ? 'Esc. ' + c.sc : '', tc(c.start), tc(c.end), c.dur.toFixed(2) + ' s', TRN[c.tr.type] + (c.tr.type !== 'cut' ? ' ' + c.tr.f + 'c' : ''), pdfSafe(what(c))]);
  doc.autoTable({ ...TBL, startY: y + 12, head: [['#', 'Viñeta', 'Plano', 'Escena', 'Entrada', 'Salida', 'Duración', 'Transición', 'Plano y descripción']], body, rowPageBreak: 'avoid',
    bodyStyles: { minCellHeight: th + 6, valign: 'middle' },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: tw + 8 }, 2: { cellWidth: 36, fontStyle: 'bold' }, 3: { cellWidth: 44 }, 4: { cellWidth: 56 }, 5: { cellWidth: 56 }, 6: { cellWidth: 50, halign: 'right' }, 7: { cellWidth: 70 } },
    didDrawCell: d => { if (d.section === 'body' && d.column.index === 1) { try { doc.addImage(thumbs[d.row.index], 'JPEG', d.cell.x + 4, d.cell.y + 3, tw, tw / ar); } catch (e) { PDF_MISS++; } } } });
  pageNumbers(doc, 'Animatic');
  return { doc, name: fileSafe(P.meta.title) + '_animatic.pdf' };
}
/* plan gratuito: marca de agua en cada página, con un código QR que lleva a la web */
const WM_URL = 'https://filmspiritpro.com';
const WM_TEXT = 'Este documento se hizo en FilmSpiritpro.com · Versión gratuita';
// QR de https://filmspiritpro.com (versión 2, corrección M), una fila por línea
const WM_QR = '1111111001011010101111111|1000001001011011101000001|1011101011001001001011101|1011101011100110001011101|1011101011001010101011101|1000001010101001001000001|1111111010101010101111111|0000000010111000000000000|1011111000110111101111100|0000100000111010100100010|0101111010110101100011011|1100110111001001011100001|1001001001001110011010111|1101010100100100100101010|1000001011111111010111011|1010110011010011001110001|1011001000111101111110100|0000000011101100100011000|1111111000000110101010111|1000001011000000100011011|1011101010011111111110100|1011101010110000111011111|1011101010100101000001101|1000001001110010110111001|1111111010011110011111111'.split('|');
function pdfQR(doc, x, y, size) {
  const n = WM_QR.length, m = size / (n + 2);
  doc.setFillColor(255, 255, 255); doc.rect(x, y, size, size, 'F');
  doc.setFillColor(24, 25, 27);
  for (let r = 0; r < n; r++) {
    // tramos seguidos de una fila en un solo rectángulo: el PDF queda liviano
    let c = 0;
    while (c < n) {
      if (WM_QR[r][c] !== '1') { c++; continue; }
      let e = c; while (e < n && WM_QR[r][e] === '1') e++;
      doc.rect(x + (c + 1) * m, y + (r + 1) * m, (e - c) * m + .05, m + .05, 'F');
      c = e;
    }
  }
  try { doc.link(x, y, size, size, { url: WM_URL }); } catch (e) { }
}
function pdfWatermark(doc) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: .07 })); } catch (e) { }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.min(W, H) / 13); doc.setTextColor(30, 32, 36);
    doc.text('FilmSpiritpro.com · Versión gratuita', W / 2, H / 2, { align: 'center', angle: 28 });
    try { doc.restoreGraphicsState(); } catch (e) { }
    // pie: QR + texto, al centro (las esquinas quedan para el título y el número de página)
    const qs = 26, tw = (doc.setFont('helvetica', 'normal'), doc.setFontSize(7.2), doc.getTextWidth(WM_TEXT));
    const bx = (W - (qs + 6 + tw)) / 2, by = H - qs - 6;
    pdfQR(doc, bx, by, qs);
    doc.setTextColor(96, 100, 108);
    doc.text(WM_TEXT, bx + qs + 6, by + qs / 2 - 1);
    doc.setFontSize(6.2); doc.setTextColor(140, 144, 150);
    doc.text('Escanea el código para conocer FilmSpirit', bx + qs + 6, by + qs / 2 + 7);
    try { doc.link(bx + qs + 6, by + 4, tw, qs - 8, { url: WM_URL }); } catch (e) { }
  }
}
/* ---------- calendario ---------- */
/* la línea de tiempo, como en la app: cada tarea una barra de su color (con su nombre si cabe) sobre los días,
   los fines de semana más grises y los días de rodaje marcados; las tareas por fase */
function pdfCalTimeline(doc, y0, sub) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 36, NW = 170, RH = 15;
  const ROD = mixc(rgb(lgCol('cal', 'rod')), PDF_WHITE, .17);   // los días de rodaje, del color de «Rodaje» de la leyenda
  const sh = calShoot(), all = [...sh.map(x => x.date), ...P.calendar.tasks.flatMap(t => segsOf(t).flatMap(x => [x.start, x.end]))].filter(Boolean).sort();
  if (!all.length) return false;
  let a = addD(all[0], -1), b = addD(all[all.length - 1], 1);
  a = addD(a, -((dOf(a).getDay() + 6) % 7)); b = addD(b, (7 - dOf(b).getDay()) % 7);
  const n = diffD(a, b) + 1, list = Array.from({ length: n }, (_, i) => addD(a, i)), shoot = new Set(sh.map(x => x.date));
  const x0 = M + NW, dw = (W - M - x0) / n, xs = d => x0 + diffD(a, d) * dw;
  const rows = [];
  for (const [ph, name] of CAL_PH) {
    const L = tasksOf(ph), jd = ph === 'rod' ? sh : [];
    if (!L.length && !jd.length) continue;
    rows.push({ g: name });
    for (const x of jd) rows.push({ name: `Jornada ${x.n + 1}`, sub: 'Rodaje', segs: [{ start: x.date, end: x.date }], col: taskColor({ ph: 'rod' }) });
    for (const t of L) rows.push({ name: t.title, sub: t.area || '', segs: segsOf(t), col: taskColor(t), done: t.done });
  }
  const head = y => {
    // meses y días; los fines de semana y los días de rodaje, sombreados de arriba abajo
    // (lote AH) en gris claro con letra negra, en cuadro (antes, en el color de la barra de la pestaña)
    doc.setFillColor(...PDF_HEADF); doc.rect(x0, y, W - M - x0, 26, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...INK);
    let i = 0;
    while (i < n) { const m = list[i].slice(0, 7); let j = i; while (j < n && list[j].slice(0, 7) === m) j++; const ml = pdfSafe(capFirst(dOf(list[i]).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }))), ms = pdfSafe(capFirst(dOf(list[i]).toLocaleDateString('es-PE', { month: 'short' })).replace('.', ''));
      const room = (j - i) * dw - 5; if (doc.getTextWidth(ml) < room) doc.text(ml, x0 + i * dw + 3, y + 10); else if (doc.getTextWidth(ms) < room) doc.text(ms, x0 + i * dw + 3, y + 10); if (i) { doc.setDrawColor(...PDF_RULE); doc.setLineWidth(GRID.cell); doc.line(x0 + i * dw, y, x0 + i * dw, y + 26); } i = j; }
    if (dw >= 6.5) { doc.setFont('helvetica', 'normal'); doc.setFontSize(Math.min(6.5, dw * .8)); list.forEach((d, k) => doc.text(String(dOf(d).getDate()), x0 + k * dw + dw / 2, y + 22, { align: 'center' })); }
    doc.setFillColor(...PDF_HEADF); doc.rect(M, y, NW, 26, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...INK); doc.text('Tarea', M + 4, y + 17);
    doc.setDrawColor(...PDF_RULE); doc.setLineWidth(GRID.cell); doc.line(M, y + 26, W - M, y + 26);
    return y + 26;
  };
  const shade = (y1, y2) => list.forEach((d, k) => {
    const wd = dOf(d).getDay();
    if (shoot.has(d)) { doc.setFillColor(...ROD); doc.rect(x0 + k * dw, y1, dw, y2 - y1, 'F'); }
    else if (wd === 0 || wd === 6) { doc.setFillColor(243, 242, 239); doc.rect(x0 + k * dw, y1, dw, y2 - y1, 'F'); }
  });
  // primero se reparten las filas por página; en cada una: el sombreado de los días, las filas y encima las barras
  const pages = [];
  let y = head(y0), first = true, cur = [];
  for (const r of rows) { const lim = H - 44; if ((first ? y0 + 28 : 58) + (cur.length + 1) * RH > lim) { pages.push(cur); cur = []; first = false; } cur.push(r); }
  if (cur.length) pages.push(cur);
  pages.forEach((L, pi) => {
    if (pi) { doc.addPage(); y = head(30); }
    const top = y, y0 = top - 26;
    shade(top, top + L.length * RH);
    for (const r of L) {
      if (r.g) {
        doc.setFillColor(...PT.fill); doc.rect(M, y, NW, RH, 'F');
        doc.setFillColor(...PT.fill.map(v => Math.round(v * .5 + 127.5))); doc.rect(x0, y, W - M - x0, RH, 'F');
        doc.setFont('title', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...INK); doc.text(pdfSafe(r.g), M + 4, y + RH / 2 + 3);
      } else {
        doc.setFont('helvetica', r.done ? 'normal' : 'bold'); doc.setFontSize(7.4); doc.setTextColor(...(r.done ? MUTED : INK));
        doc.text(doc.splitTextToSize(pdfSafe(r.name + (r.done ? ' (hecha)' : '')), NW - 60)[0], M + 4, y + RH / 2 + 2.6);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.6); doc.setTextColor(...MUTED); doc.text(pdfSafe(doc.splitTextToSize(r.sub, 54)[0] || ''), M + NW - 4, y + RH / 2 + 2.4, { align: 'right' });
        for (const sg of r.segs) {
          if (!sg.start) continue;
          const bx = xs(sg.start), bw = Math.max(dw, xs(sg.end || sg.start) + dw - bx), bc = mixc(rgb(r.col), PDF_WHITE, .75);
          doc.setFillColor(...bc); doc.roundedRect(bx + .4, y + 2, bw - .8, RH - 4, 1.5, 1.5, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(6.4); doc.setTextColor(...inkOn(bc));
          const t = pdfSafe(r.name); if (doc.getTextWidth(t) + 6 < bw) doc.text(t, bx + 3, y + RH / 2 + 2.2);
        }
      }
      // (lote AH) cada fila con su línea negra fina (antes, del color de la pestaña)
      doc.setDrawColor(...PDF_RULE); doc.setLineWidth(.3); doc.line(M, y + RH, W - M, y + RH);
      y += RH;
    }
    // el cuadro de la tabla y la columna de las tareas
    pdfBox(doc, M, y0, W - 2 * M, y - y0); pdfVLine(doc, x0, y0, y, GRID.cell);
  });
  // leyenda
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED);
  doc.setFillColor(...ROD); doc.rect(M, y + 8, 8, 8, 'F'); doc.text('Día de rodaje', M + 12, y + 14.5);
  doc.setFillColor(243, 242, 239); doc.rect(M + 80, y + 8, 8, 8, 'F'); doc.text('Fin de semana', M + 92, y + 14.5);
  return true;
}
function pdfCalendar() {
  const doc = newDoc('landscape');
  const sh = calShoot();
  const all = [...P.calendar.tasks.flatMap(t => [t.start, t.end]), ...sh.map(x => x.date)].sort();
  const sub = all.length ? `${fmtD(all[0])} a ${fmtD(all[all.length - 1])}` : '';
  let y = docHeader(doc, 'Calendario de producción', sub);
  const cu = { hl: new Set() };
  for (const t of P.calendar.tasks) { if (t.hl && hlc(t, 'cal')) cu.hl.add(t.hl); else cu[LG.cal[t.ph] ? t.ph : 'pre'] = 1; }
  if (sh.length) cu.rod = 1;
  y = pdfLegend(doc, y, lgDocItems('calendar', cu).map(([nm, c]) => [nm, mixc(rgb(c), PDF_WHITE, .75)]));   // como se pintan las barras
  // primero la línea de tiempo (como se ve en la app); después, la lista con sus datos
  if (pdfCalTimeline(doc, y, sub)) { doc.addPage(); y = docHeader(doc, 'Calendario de producción', 'Lista de tareas'); }
  const body = [];
  for (const [ph, name] of CAL_PH) {
    const list = tasksOf(ph);
    const jd = ph === 'rod' ? sh : [];
    if (!list.length && !jd.length) continue;
    body.push([{ content: pdfSafe(name), colSpan: 8, styles: { fillColor: PDF_GROUP, fontStyle: 'bold' } }]);
    for (const x of jd) body.push([pdfSafe(`Jornada ${x.n + 1}`), 'Rodaje', '', pdfSafe(fmtD(x.date)), pdfSafe(fmtD(x.date)), '1', '', pdfSafe(x.d.keys.length + ' escenas')]);
    for (const t of list) body.push([{ content: pdfSafe(t.title), styles: { fontStyle: 'bold', textColor: rgb(taskColor(t)).map(v => Math.round(v * .7)) } }, pdfSafe(t.area || ''), pdfSafe(t.who || ''), pdfSafe(segsOf(t).map(x => fmtD(x.start)).join('\n')), pdfSafe(segsOf(t).map(x => fmtD(x.end)).join('\n')), String(taskDays(t)), t.done ? 'Hecha' : '', pdfSafe(t.notes || '')]);
  }
  if (!body.length) body.push([{ content: 'Todavía no hay tareas.', colSpan: 8 }]);
  doc.autoTable({ ...TBL, startY: y, head: [['Tarea', 'Área', 'Responsable', 'Desde', 'Hasta', 'Días', 'Estado', 'Notas']], body,
    columnStyles: { 0: { cellWidth: 170 }, 1: { cellWidth: 74 }, 2: { cellWidth: 84 }, 3: { cellWidth: 72 }, 4: { cellWidth: 72 }, 5: { cellWidth: 32, halign: 'right' }, 6: { cellWidth: 44 } },
    didParseCell: d => { if (d.section === 'body' && d.column.index === 6 && d.cell.raw === 'Hecha') d.cell.styles.textColor = OKC; } });
  pageNumbers(doc, 'Calendario');
  return { doc, name: fileSafe(P.meta.title) + '_calendario.pdf' };
}

const PDFX = { dood: pdfDood, parte: pdfParte, camrep: pdfCamRep, sndrep: pdfSndRep, call: pdfCall, calendar: pdfCalendar, calmes: pdfCalMonths, animatic: pdfAnimatic, script: pdfScript, screenplay: pdfScreenplay, breakdown: pdfBreakdown, area: pdfArea, storyboard: pdfStoryboard, shotlist: pdfShotlist, plan: pdfPlan, budget: pdfBudget, sup: pdfSup, planta: pdfPlanta, plantagen: pdfPlantaGen };
/* qué documentos son de Pro y Studio: el guion rayado y los PDF de las pestañas de producción */
const PDF_PRO = { script: 'rayado', plan: 'prodpdf', dood: 'prodpdf', parte: 'prodpdf', camrep: 'prodpdf', sndrep: 'prodpdf', calendar: 'prodpdf', calmes: 'prodpdf', call: 'prodpdf', budget: 'prodpdf', sup: 'prodpdf' };
const pdfGate = (kind, opts) => (kind === 'storyboard' && opts && opts.plan) || kind === 'planta' || kind === 'plantagen' ? 'planta' : PDF_PRO[kind] || '';
/* viñetas que el PDF necesita: primero se toman las ya hechas (en la memoria o guardadas en este navegador); solo
   para las que faltan se traen sus imágenes y maniquíes y se dibujan, de a una, con su avance y «Cancelar» (antes
   el PDF congelaba la app sin decir cuánto faltaba); después el PDF se arma rápido con las viñetas en memoria */
async function pdfWarm(kind, opts) {
  let all = [];
  if (kind === 'storyboard') all = (UI.sbScene ? [UI.sbScene] : D.sc.scenes.map(s => s.key)).flatMap(k => D.shotsBy[k] || []).flatMap(sh => [sh, shotB(sh)].filter(Boolean));
  else if (kind === 'animatic' && typeof anClips === 'function') all = anClips().clips.filter(c => c.sh).map(c => c.sh);
  // (lote U) las miniaturas de los planos de la hoja de llamado (la de esta jornada o todas)
  else if (kind === 'call' && typeof callThumbs === 'function' && callThumbs()) { const { days } = callDays(); all = (opts && opts.all ? days : [days[UI.callDay || 0]]).filter(Boolean).flatMap(d => d.keys.flatMap(k => D.shotsBy[k] || [])); }
  // (lote AH) las de los planos del plan de rodaje (con «Miniaturas del storyboard»; las jornadas elegidas o todas)
  else if (kind === 'plan' && typeof planDocShots === 'function') all = planDocShots(opts && opts.sel);
  if (!all.length) return true;
  await ensureFrames('index');   // qué imágenes tiene el proyecto (sin bajarlas): para reconocer las viñetas guardadas
  await thumbLoad(all);
  const jobs = [...new Set(all)].filter(sh => !thumbCached(sh));
  let stop = false, m = null;
  const say = (txt, f) => { if (!m) return; const t = $('#pwT', m), pb = $('#pwP', m); if (t) t.textContent = txt; if (pb) pb.style.width = Math.round(f * 100) + '%'; };
  if (jobs.length >= 4 || (kind === 'animatic' && all.length > 40)) {
    m = modal({ title: 'Exportando PDF', body: `<p style="margin:0" id="pwT">Preparando viñetas…</p><div class="prog"><i id="pwP" style="width:0"></i></div><p class="hint" style="margin:0">Puedes seguir mirando; al terminar se abre la vista previa.</p>`, foot: '<button class="btn" id="pwC">Cancelar</button>', keep: true, noEsc: true, onClose: () => { stop = true; } });
    $('#pwC', m).onclick = () => { stop = true; closeModal(); };
  }
  if (jobs.length) {
    // solo lo que usan las viñetas que faltan: sus imágenes y los cuerpos de sus figuras
    say('Preparando imágenes…', 0);
    await framesNeed(jobs.flatMap(sh => shotViewKeys(sh)));   // (con las capas del dibujo 2D que se ven sobre la escena 3D)
    if (stop) return false;
    if (typeof FIG3D !== 'undefined') await FIG3D.ready(10000, fig3dBodiesOf(jobs));   // con los maniquíes articulados, no los simples
    for (let i = 0; i < jobs.length; i++) {
      if (stop) return false;
      const sh = jobs[i];
      say(`Viñeta ${i + 1} de ${jobs.length}`, i / jobs.length);
      await new Promise(r => setTimeout(r, 0));
      const w = thumbImgsReady(sh); if (w) await w;
      const f = thumbFigsReady(sh); if (f) await f;
      if (stop) return false;
      shotThumb(sh, 0);
    }
  }
  // el PDF del animatic lleva viñetas chicas: se achican las de 480 (no se vuelven a dibujar)
  if (kind === 'animatic' && typeof thumbSmall === 'function') {
    const L = [...new Set(all)];
    for (let i = 0; i < L.length; i++) { if (stop) return false; if (i % 8 === 0) say('Ajustando viñetas…', i / L.length); await thumbSmall(L[i], 240); }
  }
  if (m && m.isConnected) { m._onClose = null; closeModal(); }
  return true;
}
/* ---------- guion rayado: qué capas y qué áreas lleva el PDF ---------- */
const linedShown = () => CATS.filter(c => !UI.hidden.has(c.id)).map(c => c.id);
function pdfLinedDialog(btn, opts) {
  const av = edFormat() === 'av', mem = ls.get('pdfLined', null) || {};
  const shown = linedShown(), some = UI.hidden.size > 0 && shown.length > 0;
  // en el guion rayado, lo que está encendido en la barra; si no hay nada encendido, las dos capas
  let cov = UI.tab === 'lined' ? UI.mode.cov : mem.cov !== false, tags = UI.tab === 'lined' ? UI.mode.tags : mem.tags !== false;
  if (!cov && !tags) cov = tags = true;
  const which = some && UI.tab === 'lined' ? 'screen' : mem.which === 'area' || (mem.which === 'screen' && some) ? mem.which : 'all';
  const areaId = SHEET.some(b => b.id === mem.area) ? mem.area : 'sound';
  const radio = (v, title, inner) => `<label class="opt rg-opt"><input type="radio" name="plw" value="${v}" ${which === v ? 'checked' : ''}><span><b>${title}</b>${inner || ''}</span></label>`;
  const m = modal({
    title: 'Exportar guion rayado',
    body: `<div class="rg">
      ${av ? '' : `<label class="opt"><input type="checkbox" id="plCov" ${cov ? 'checked' : ''}><span><b>Rayado de planos</b><span class="hint">Una línea por plano sobre el texto que cubre, con su número arriba: naranja pendiente, verde rodado.</span></span></label>`}
      <label class="opt"><input type="checkbox" id="plTags" ${tags || av ? 'checked' : ''}><span><b>Etiquetas del desglose</b><span class="hint">El texto marcado con el color de su categoría${av ? ', en la columna Desglose' : ''}.</span></span></label>
      ${!av && typeof anoAll === 'function' && anoAll().length ? `<label class="opt"><input type="checkbox" id="plInk" ${(UI.tab === 'lined' ? UI.mode.ink !== false : mem.ink !== false) ? 'checked' : ''}><span><b>Anotaciones a mano</b><span class="hint">${typeof anoMineOnly === 'function' && anoMineOnly() ? 'Lo que dibujaste y escribiste sobre el guion (solo las tuyas, como en pantalla).' : 'Lo que el equipo dibujó y escribió sobre el guion.'}</span></span></label>` : ''}
    </div>
    <fieldset class="rg pl-which"><legend>Etiquetas de</legend>
      ${radio('all', 'Todas las áreas')}
      ${some ? radio('screen', 'Las que se ven en pantalla', `<span class="hint">${(hid => hid.length <= shown.length ? `Todas menos ${hid.map(id => `<span>${esc(CAT[id].name)}</span>`).join(', ')}` : shown.map(id => `<span>${esc(CAT[id].name)}</span>`).join(', '))(CATS.map(c => c.id).filter(id => UI.hidden.has(id)))}</span>`) : ''}
      ${radio('area', 'Un área', `<span class="rg-f"><select id="plArea" aria-label="Área">${SHEET.map(b => `<option value="${ea(b.id)}" ${b.id === areaId ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></span><span class="hint">Cada departamento se lleva solo lo suyo: sonido, vestuario, atrezzo…</span>`)}
    </fieldset>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="plGo">Exportar PDF</button>`,
  });
  const box = $('.pl-which', m), tg = $('#plTags', m);
  const sync = () => { box.disabled = !tg.checked; };
  tg.addEventListener('change', sync); sync();
  $('#plArea', m).addEventListener('change', () => { const r = $('input[name=plw][value=area]', m); if (r) r.checked = true; });
  $('#plGo', m).onclick = () => {
    const c = !av && $('#plCov', m).checked, t = tg.checked, ik = $('#plInk', m), ink = ik ? ik.checked : undefined;
    if (!c && !t && !ink) { toast('Elige el rayado, las etiquetas o las dos. El guion sin marcas es «Guion (PDF)».', 4500); return; }
    const w = ($('input[name=plw]:checked', m) || {}).value || 'all', a = $('#plArea', m).value;
    const cats = !t || w === 'all' ? null : w === 'screen' ? linedShown() : SHEET.find(b => b.id === a).cats;
    ls.set('pdfLined', { cov: c, tags: t, which: w, area: a, ...(ik ? { ink } : {}) });
    closeModal();
    exportPDF('script', btn, { ...opts, ask: false, cov: c, tags: t, cats, area: t && w === 'area' ? a : null, ink: ink !== false });
  };
}
/* ---------- desglose de un área: lo de un departamento, escena por escena ---------- */
function pdfArea(opts = {}) {
  const B = SHEET.find(b => b.id === opts.box) || SHEET[0], many = B.cats.length > 1;
  const doc = newDoc();
  const lab = e => (B.id === 'cast' && D.castNum[e.id] ? D.castNum[e.id] + '. ' : '') + (many ? CAT[e.cat].short + ' · ' : '') + itemLabel(e);
  const rows = [], seen = new Map();
  for (const s of pdfScenes()) {
    const d = sheetData(s), list = d.box[B.id];
    if (!list.length) continue;
    for (const e of list) { if (!seen.has(e.id)) seen.set(e.id, []); seen.get(e.id).push(s.key); }
    rows.push([{ content: pdfSafe(s.key), styles: { fontStyle: 'bold', halign: 'center' } }, pdfSafe(s.heading || ''), d.pages,
      d.jornada ? (dd => pdfRich([{ t: String(d.jornada), st: 'bold' }, dd && dd.date ? { t: cap1(fmtDate(dd.date)), fs: PF.small, col: MUTED } : null]))(dayOfScene(s.key)) : pdfRich([{ t: 'Sin programar', fs: PF.small, col: MUTED, tr: 1 }]),
      pdfSafe(list.map(e => lab(e) + (refOf(e).note ? ' (' + String(refOf(e).note).replace(/\s+/g, ' ').trim() + ')' : '')).join('\n'))]);
  }
  // (lote K) el título traducido por su lado: entero, en inglés salía «Desglose por scenes»
  const ttl = tr('Desglose por escenas') + ' · ' + tr(B.name);
  let y = docHeader(doc, ttl, rows.length ? `${rows.length} ${rows.length === 1 ? 'escena' : 'escenas'} · ${seen.size} ${seen.size === 1 ? 'elemento' : 'elementos'}` : 'Sin elementos');
  if (!rows.length) rows.push([{ content: 'Todavía ninguna escena tiene elementos de esta área. Márcalos en el guion rayado o agrégalos en su caja de la hoja de desglose.', colSpan: 5, styles: { textColor: MUTED } }]);
  const col = rgb(catHex(B.cats[0]));
  doc.autoTable({ ...TBL, startY: y, head: [['Esc.', 'Encabezado de escena', '1/8', 'Jornada', B.name]], body: rows,
    styles: { ...TBL.styles, valign: 'top' },
    columnStyles: { 0: { cellWidth: 34 }, 1: { cellWidth: 180 }, 2: { cellWidth: 34, halign: 'center' }, 3: { cellWidth: 70 } },
    didDrawCell: h => { if (h.section === 'body' && h.column.index === 4 && h.row.raw.length === 5) { doc.setFillColor(...col); doc.rect(h.cell.x, h.cell.y, 2.4, h.cell.height, 'F'); } } });
  // cada elemento una vez, con sus escenas (para pedirlo, alquilarlo o grabarlo una sola vez)
  if (seen.size) {
    const order = Object.fromEntries(CATS.map((c, i) => [c.id, i]));
    const els = [...seen.keys()].map(id => P.elements[id]).sort((a, b) => B.id === 'cast' ? (D.castNum[a.id] || 99) - (D.castNum[b.id] || 99) : (order[a.cat] - order[b.cat]) || a.name.localeCompare(b.name));
    const y2 = pdfSec(doc, doc.lastAutoTable.finalY + PF.gap + 4, 'Elementos del área', { need: 80 });
    doc.autoTable({ ...TBL, startY: y2, head: [['Elemento', 'Esc.', 'Escenas']],
      body: els.map(e => [pdfSafe(lab(e)), { content: String(seen.get(e.id).length), styles: { halign: 'right' } }, pdfSafe(seen.get(e.id).join(', '))]),
      columnStyles: { 0: { cellWidth: 200 }, 1: { cellWidth: 36 } } });
  }
  pageNumbers(doc, ttl);
  return { doc, name: fileSafe(P.meta.title) + '_desglose_' + fileSafe(B.name) + '.pdf' };
}
/* (lote AH) arma el PDF con un papel ('a4', 'letter' o null: el de siempre del documento), con todo lo que va encima:
   la parte elegida (pdf-rango.js), la copia con nombre (guion cerrado) y la marca de agua del plan gratis. Devuelve
   { doc, name, miss: imágenes que no entraron, call: las jornadas y versiones de la hoja de llamado, pages: si es una
   parte por páginas } o { err } */
function pdfMake(kind, opts, paper) {
  PDF_MISS = 0; PDF_CALL_DONE = null; PDF_PAPER = paper === 'a4' || paper === 'letter' ? paper : null;
  // una parte (pdf-rango.js): escenas o jornadas las filtra cada documento; las páginas, al final
  PDF_SEL = opts && opts.sel || null;
  try {
    const run = () => { pdfTheme(); return PDFX[kind](opts || {}); };
    let { doc, name } = opts && opts.base && typeof lkWithBase === 'function' ? lkWithBase(run) : run();
    if (PDF_SEL) {
      if (PDF_SEL.pages && !PDF_SEL.script) { const err = pdfKeepPages(doc, PDF_SEL.pages); if (err) return { err, ms: 5000 }; }
      if (doc.getNumberOfPages() < 1) return { err: 'No hay nada que exportar en esa parte.' };
      name = name.replace(/\.pdf$/, PDF_SEL.tag + '.pdf');
    }
    if (opts && opts.copy && opts.copy.name) {
      if (opts.copy.mark) pdfCopyMark(doc, opts.copy.name);
      name = name.replace(/\.pdf$/, `${opts.base ? '_version_cerrada' : ''}_copia_${fileSafe(opts.copy.name)}.pdf`);
    } else if (opts && opts.base) name = name.replace(/\.pdf$/, '_version_cerrada.pdf');
    // en la web con cuentas, el PDF del guion va sin marca en todos los planes (plan Guion incluido)
    if (LIC.mode === 'free' && !(API() && kind === 'screenplay') && (API() ? !planAllows('nomark') : !P._shared)) pdfWatermark(doc);
    return { doc, name, miss: PDF_MISS, call: PDF_CALL_DONE, pages: !!(PDF_SEL && PDF_SEL.pages) };
  } finally { PDF_PAPER = null; PDF_SEL = null; }   // mientras la vista previa está abierta, no queda nada elegido
}
/* lo que pasa cuando el PDF salió (se descargó, se envió o se imprimió): la hoja de llamado guarda la versión que salió */
function pdfOut(kind, r) {
  if (kind === 'call' && r && r.call && !r.pages && typeof callExported === 'function') callExported(r.call.list, r.call.vers);
}
const pdfMissText = n => `El PDF salió sin ${n === 1 ? 'una imagen' : n + ' imágenes'}: ${n === 1 ? 'no se pudo leer' : 'no se pudieron leer'}. Vuelve a guardar esos dibujos y exporta otra vez.`;
async function exportPDF(kind, btn, opts) {
  const gate = pdfGate(kind, opts);
  if (gate && !proGate(gate)) return;
  if (kind === 'budget' && typeof budOpen === 'function' && !budOpen()) { toast('El presupuesto está bloqueado.'); return; }
  // guion rayado desde el menú: se elige qué lleva (rayado de planos, etiquetas, solo un área); de entrada, lo que se ve
  if (kind === 'script' && opts && opts.ask) { pdfLinedDialog(btn, opts); return; }
  // guion cerrado: cada copia puede llevar el nombre de quien la recibe; también se baja la versión cerrada
  if ((kind === 'screenplay' || kind === 'script') && typeof scriptLock === 'function' && scriptLock() && !(opts && opts.copy)) { lkCopyDialog(kind, btn, opts); return; }
  if (!(await loadPdfLib())) { problem('No se pudo cargar el generador de PDF. Revisa tu conexión.', () => exportPDF(kind, btn, opts)); return; }
  if (!D.sc.scenes.length && !['budget', 'calendar', 'calmes', 'screenplay', 'argumento', 'premisa', 'bios', 'estructura', 'escaleta', 'tarjetas', 'scouting', 'casting'].includes(kind)) { toast('Escribe o importa un guion primero.'); return; }
  if ((kind === 'escaleta' || kind === 'tarjetas') && !bItems().length) { toast('Aún no hay escenas: agrega una con «+ Escena» o escribe el guion.', 4200); return; }
  if (kind === 'parte' && !(UI.supDay >= 0 && scheduleDays(P, D.sc).days[UI.supDay])) { toast('Elige una jornada arriba para su parte diario.', 4000); return; }
  if (kind === 'dood' && (!Object.keys(D.castNum).length || !scheduleDays(P, D.sc).days.length)) { toast('Hacen falta personajes marcados y jornadas en el plan.', 4000); return; }
  if (kind === 'call' && !callDays().days.length) { toast('Aún no hay jornadas: arma el plan de rodaje para generar las hojas de llamado.', 5000); return; }
  // sin opciones (o con una parte elegida en «Elegir…»): se pregunta si va con la planta de cámara
  if (kind === 'storyboard' && (!opts || (opts.sel && opts.plan == null))) {
    const can = planAllows('planta');
    const m = modal({
      title: 'Exportar storyboard',
      body: `<label class="opt"><input type="checkbox" id="pdfPlan" ${can && ls.get('pdfPlan', true) ? 'checked' : ''} ${can ? '' : 'disabled'}><span><b>Incluir la planta de cámara${can ? '' : ' <i class="pro-chip">PRO</i>'}</b><span class="hint">Cada plano en una fila: viñeta, planta con cámara, figuras, recorridos y luces, y los datos técnicos.${can ? '' : ' Disponible en Pro y Studio.'}</span></span></label>
        <p class="hint" style="margin:0">${opts && opts.sel ? (opts.sel.sc ? 'Se exportan las escenas elegidas.' : 'Se exportan las páginas elegidas.') : UI.sbScene ? 'Se exporta solo la escena ' + esc(UI.sbScene) + '.' : 'Se exportan todas las escenas.'}</p>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="pdfGo">Exportar PDF</button>`,
    });
    $('#pdfGo', m).onclick = () => { const plan = can && $('#pdfPlan', m).checked; if (can) ls.set('pdfPlan', plan); closeModal(); exportPDF(kind, btn, { ...(opts || {}), plan }); };
    return;
  }
  // el botón dice que está trabajando sin perder su ícono: los que tienen texto lo cambian; los de solo ícono, no
  const label = btn && btn.innerHTML, wordy = !!(btn && btn.textContent.trim());
  const busy = on => { if (!btn) return; btn.disabled = on; if (on) btn.setAttribute('aria-busy', 'true'); else btn.removeAttribute('aria-busy'); if (wordy) btn.innerHTML = on ? 'Generando…' : label; };
  busy(true);
  await new Promise(r => setTimeout(r, 30));
  // las imágenes que usa este PDF se traen antes y no se sueltan de la memoria mientras se arma
  // (las del storyboard y el animatic las trae pdfWarm, solo para las viñetas que no estén ya hechas)
  const need = { breakdown: opts && opts.photos ? 'bd' : '', lamina: opts && opts.photos !== false ? 'bd' : '', scouting: opts && opts.photos !== false ? 'lc' : '', casting: opts && opts.photos !== false ? 'ca' : '', call: 'cl' }[kind];
  FR_HOLD++;
  try {
    if (need) await ensureFrames(need);
    await preloadPlans();
    await preparePhotosForPdf();
    await imgPrepPdf([P.meta.logo, P.meta.projLogo]);
    if (!(await pdfWarm(kind, opts))) { toast('Exportación cancelada.'); busy(false); return; }
    // (lote AH) el armado va aparte (pdfMake): la vista previa lo repite si se cambia el papel. Arranca con el último
    // papel que la persona eligió para este documento (o el de siempre del documento)
    const r = pdfMake(kind, opts, pdfPaperMem(kind));
    if (r.err) { toast(r.err, r.ms || 4000); return; }
    // dentro del ZIP del proyecto (archivo.js) no hay vista previa: el archivo va directo
    if (OFFER_CAPTURE) {
      const sent = await offerFile(r.name, r.doc.output('blob'));
      if (sent === true) pdfOut(kind, r);
      if (r.miss) problem(pdfMissText(r.miss));
      return;
    }
    // (lote AH) antes de descargar, la vista previa: las páginas, el papel (A4 o carta), Imprimir, Descargar y, en la
    // hoja de llamado, Enviar. Lo de después de descargar (la versión de la hoja de llamado que salió) pasa al descargar,
    // enviar o imprimir desde ahí; si se cierra sin nada de eso, no cuenta como enviada
    busy(false);
    await pdfPreview({ kind, first: r, make: paper => pdfMake(kind, opts, paper), share: !!(opts && opts.share), onOut: x => pdfOut(kind, x) });
  } catch (e) { console.error(e); problem('No se pudo generar el PDF. Vuelve a intentarlo; si se repite, escribe a soporte desde Ayuda.', () => exportPDF(kind, btn, opts)); }
  finally { FR_HOLD--; frameTrim(); PDF_SEL = null; PDF_CALL_DONE = null; busy(false); }
}
