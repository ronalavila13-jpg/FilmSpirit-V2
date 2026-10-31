/* ============================================================
   HOJA DE SCRIPT · los PDF: la hoja para imprimir, la hoja llena, el parte diario y los reportes de cámara y sonido
   Salen de lo que se anota en la hoja de script (horarios, planos rodados, tomas con su tarjeta y su rollo de sonido,
   continuidad, sonido wild), del plan (escenas de la jornada) y de la hoja de llamado (actores y llamados).
   · Hoja para imprimir (lote AD): A4, en negro y gris (legible en una impresora en blanco y negro). Una hoja por
     escena (si tiene más de 7 planos, sigue en otra hoja de la misma escena): la cabecera de la jornada en cada hoja,
     la de la escena (su número sobre el color de su tira), los títulos de columna, los planos del programa en una
     franja gris con 3 filas de tomas altas para escribir con lapicero, planos extra en blanco hasta completar 7 y,
     abajo, el recuadro de continuidad. La última hoja es el parte diario en blanco.
   · Hoja de script (llena): la misma hoja con lo anotado (la toma buena con su número en un círculo).
   · Parte diario: una jornada, con la misma forma. Horarios, material, avance, escenas, reparto, avance del rodaje,
     incidencias, notas y firmas.
   · Reporte de cámara: las tomas agrupadas por tarjeta. Reporte de sonido: por rollo de sonido, con el sonido wild,
     y aparte las grabadas sin sonido (MOS).
   En todos, las tomas grabadas (supRolled, lote AI): la que quedó lista con «+ Toma» y nunca se grabó no sale.
   ============================================================ */
const supDayLabel = (n, dates) => `Jornada ${n + 1}${dates[n] ? ' · ' + fmtDate(dates[n]) : ''}`;
const scenePages = k => { const s = sceneOfKey(k); return s ? D.metrics.eighths[s.idx] : 0; };
const sceneDone = k => (D.shotsBy[k] || []).length && D.shotsBy[k].every(s => s.done);

/* ---------- el papel: medidas y trazos (pt; la muestra está en px a 96 ppp: × 0,75) ---------- */
const HS_K = [26, 26, 26], HS_G = [68, 68, 68], HS_L = [154, 154, 154], HS_F = [239, 239, 239], HS_W = [255, 255, 255];
const HS_M = 30, HS_TAKE = 20.25, HS_STRIP = 15, HS_PER = 7, HS_FOOT = 27;
// Toma 44, Estado 98, Hora 48, Dur. 42, Cám. 46, Son. 46 px; Notas, lo que queda (la más ancha)
const HS_COLW = [33, 73.5, 36, 31.5, 34.5, 34.5];
const hsCols = x0 => HS_COLW.reduce((a, w) => (a.push(a[a.length - 1] + w), a), [x0]);
/* el texto del programa ya en su idioma (en inglés se traduce aquí, una sola vez); lo que escribe cada persona, tal cual */
const hsL = s => pdfSafe(EN ? tr(String(s)) : String(s));
const hsU = s => hsL(s).toUpperCase();
const hsW = (doc, s) => doc._rawW ? doc._rawW(s) : doc.getTextWidth(s);
const hsTx = (doc, s, x, y, o) => (doc._raw ? doc._raw.text : doc.text.bind(doc))(s, x, y, o);
/* recorta con «...» para que entre en w */
function hsFit(doc, s, w) {
  s = String(s || ''); if (hsW(doc, s) <= w) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (hsW(doc, s.slice(0, m).trimEnd() + '...') <= w) lo = m; else hi = m - 1; }
  return s.slice(0, lo).trimEnd() + '...';
}
/* las líneas de un texto en un ancho (sin traducir: lo escrito por la persona) */
const hsLines = (doc, s, w) => { const t = pdfSafe(s || ''); if (!t) return []; return doc._raw && doc._raw.splitTextToSize ? doc._raw.splitTextToSize(t, w) : doc.splitTextToSize(t, w); };
const hsLine = (doc, x1, y1, x2, y2, c = HS_K, w = .75) => { doc.setDrawColor(...c); doc.setLineWidth(w); doc.line(x1, y1, x2, y2); };
const hsFont = (doc, st, fs, c = HS_K, f = 'helvetica') => { doc.setFont(f, st); doc.setFontSize(fs); doc.setTextColor(...c); };
/* «○ B  ○ OK  ○ NG» (el elegido, lleno) desde x; devuelve dónde termina */
function hsOpts(doc, x, y, opts, on) {
  hsFont(doc, 'normal', 9);
  for (const [k, lab] of opts) {
    doc.setDrawColor(...HS_K); doc.setLineWidth(.75); doc.setFillColor(...HS_K);
    doc.circle(x + 2.7, y - 3.1, 2.7, k === on ? 'FD' : 'S');
    const t = hsL(lab); hsTx(doc, t, x + 7.6, y); x += 7.6 + hsW(doc, t) + 5.4;
  }
  return x;
}
/* el contexto de la jornada elegida para los PDF */
function hsCtx() {
  const { days } = scheduleDays(P, D.sc), dates = shootDates(P, days.length), n = UI.supDay;
  const keys = pdfKeys(supScenes()), day = n >= 0 ? days[n] : null, dm = day ? (P.sup.day[day.id] || {}) : {};
  const dt = n >= 0 ? dates[n] : null;
  const d0 = dt ? dt.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }) : '', date = d0 ? capFirst(EN ? d0 : d0.replace(',', '')) : '';
  const title = n === -1 ? hsL('Todas las escenas') : n === -2 ? hsL('Sin programar') : [hsL(`Jornada ${n + 1} de ${days.length}`), pdfSafe(date)].filter(Boolean).join(' · ');
  const shots = keys.flatMap(k => D.shotsBy[k] || []);
  return { days, dates, n, keys, day, dm, title, shots, call: dm.call || P.schedule.call || '' };
}
/* la cabecera de la jornada (se repite en cada hoja): título, jornada, fecha, llamado; a la derecha, Script y
   Cámara / Sonido con su línea para escribir (en la hoja llena, lo anotado) */
function hsHead(doc, X, kick, fill) {
  const W = doc.internal.pageSize.getWidth(), x0 = HS_M, x1 = W - HS_M, y = HS_M, tx = x0 + 7;
  hsFont(doc, 'bold', 9); hsTx(doc, hsU(kick), tx, y + 7, { charSpace: .9 });
  hsFont(doc, 'bold', 13.5, HS_K, 'title'); hsTx(doc, hsFit(doc, X.title, x1 - tx - 190), tx, y + 23);
  hsFont(doc, 'normal', 9, HS_G);
  hsTx(doc, hsFit(doc, [pdfSafe(P.meta.title), X.call ? hsL('Llamado') + ' ' + X.call : '', X.loc ? hsL('Locación') + ': ' + pdfSafe(X.loc) : ''].filter(Boolean).join(' · '), x1 - tx - 190), tx, y + 35);
  if (X.lines !== false) {
    const rows = [['Script', fill ? P.sup.supervisor || '' : ''], ['Cámara / Sonido', fill ? [supRolls(X.shots).join(', '), supRolls(X.shots, 's').join(', ')].filter(Boolean).join(' / ') : '']];
    rows.forEach(([lab, v], i) => {
      const ly = y + 21 + i * 14.5, lx = x1 - 88;
      hsFont(doc, 'normal', 9, HS_G); hsTx(doc, hsL(lab), lx - 6, ly - 1.5, { align: 'right' });
      hsLine(doc, lx, ly, x1 - 7, ly, HS_K, .75);
      if (v) { hsFont(doc, 'bold', 8.5); hsTx(doc, hsFit(doc, pdfSafe(v), 78), lx + 1, ly - 2.5); }
    });
    hsLine(doc, x1 - 170, y - 6, x1 - 170, y + 42, HS_K, 1.1);
  }
  // (lote AH) la cabecera en un cuadro cerrado con líneas negras (antes, solo una raya debajo: «a medias»)
  doc.setDrawColor(...HS_K); doc.setLineWidth(1.1); doc.rect(x0, y - 6, x1 - x0, 48);
  return y + 51;
}
/* la cabecera de la escena: su número sobre el color de su tira, el encabezado, INT/EXT · DÍA/NOCHE · páginas ·
   personajes y la sinopsis en una línea */
function hsSceneHead(doc, s, x0, x1, y, cont) {
  const h = 36, key = pdfSafe(s.key);
  hsFont(doc, 'bold', 16.5);
  const bw = Math.max(28.5, hsW(doc, key) + 12);
  doc.setFillColor(...rgb(stripColor(s))); doc.setDrawColor(...HS_K); doc.setLineWidth(.75);
  doc.roundedRect(x0 + 7.5, y + 5.25, bw, 25.5, 3, 3, 'FD');
  hsTx(doc, key, x0 + 7.5 + bw / 2, y + 23.5, { align: 'center' });
  const hx = x0 + 7.5 + bw + 9, cast = sceneCast(s.idx).map(e => e.name);
  const meta = pdfSafe([ieLab(s), hsU(DN_LAB[stripDN(s)] || ''), `${fmtEighths(D.metrics.eighths[s.idx])} ${hsL('pág.')}`, cast.join(', ')].filter(Boolean).join(' · '));
  // el encabezado entero si se puede; lo que no entra se recorta de los personajes
  const avail = x1 - 7.5 - hx, head = pdfSafe(s.heading);
  hsFont(doc, 'bold', 10.5); const hw = hsW(doc, head);
  hsFont(doc, 'normal', 9);
  const mw = Math.min(hsW(doc, meta), Math.max(avail - hw - 12, avail * .3)), metaT = hsFit(doc, meta, mw), mtw = hsW(doc, metaT);
  hsTx(doc, metaT, x1 - 7.5, y + 16.5, { align: 'right' });
  hsFont(doc, 'bold', 10.5); hsTx(doc, hsFit(doc, head, avail - mtw - 12), hx, y + 16.5);
  hsFont(doc, 'normal', 9, HS_G);
  hsTx(doc, hsFit(doc, cont ? hsL('(continúa de la hoja anterior)') : pdfSafe(synopsisOf(s, 400)), x1 - 7.5 - hx), hx, y + 28.5);
  hsLine(doc, x0, y + h, x1, y + h, HS_K, 1.1);
  return y + h;
}
/* los títulos de las columnas */
function hsColHead(doc, x0, x1, y) {
  const B = hsCols(x0), h = 16.5;
  hsFont(doc, 'bold', 9);
  ['Toma', 'Estado', 'Hora', 'Dur.', 'Cám.', 'Son.', 'Notas'].forEach((t, i) => hsTx(doc, hsL(t), B[i] + 4.5, y + 11.5));
  for (const x of B.slice(1)) hsLine(doc, x, y, x, y + h, HS_K, .75);
  hsLine(doc, x0, y + h, x1, y + h, HS_K, .75);
  return y + h;
}
/* la franja de un plano: número · tamaño · ángulo · movimiento · lente — descripción (y MOS a la derecha) */
function hsStrip(doc, x0, x1, y, num, text, o = {}) {
  doc.setFillColor(...(o.extra ? HS_W : HS_F)); doc.rect(x0, y, x1 - x0, HS_STRIP, 'F');
  hsLine(doc, x0, y + HS_STRIP, x1, y + HS_STRIP, HS_K, .75);
  hsFont(doc, 'bold', 9); hsTx(doc, num, x0 + 4.5, y + 10.5);
  const nx = x0 + 4.5 + hsW(doc, num) + 4.5;
  let mosW = 0;
  if (o.mos) { hsFont(doc, 'bold', 9); mosW = hsW(doc, 'MOS') + 9; hsTx(doc, 'MOS', x1 - 4.5, y + 10.5, { align: 'right' }); }
  hsFont(doc, 'normal', 9, o.extra ? HS_G : HS_K); hsTx(doc, hsFit(doc, text, x1 - 4.5 - mosW - nx), nx, y + 10.5);
  return y + HS_STRIP;
}
/* una fila de toma: en blanco (para el lapicero) o con lo anotado. t: la toma ({ n, st, t, d, r, s, note }) */
function hsTakeRow(doc, x0, x1, y, h, t, o = {}) {
  const B = hsCols(x0);
  hsLine(doc, x0, y + h, x1, y + h, HS_L, .75);
  for (const x of B.slice(1)) hsLine(doc, x, y, x, y + h, HS_L, .75);
  const by = y + Math.min(h, HS_TAKE) / 2 + 3.2;
  if (o.wild) { hsFont(doc, 'bold', 9); hsTx(doc, 'W' + o.wild, (B[0] + B[1]) / 2, by, { align: 'center' }); hsFont(doc, 'normal', 9, HS_G); hsTx(doc, 'Wild', B[1] + 4.5, by); }
  else hsOpts(doc, B[1] + 3.6, by, [['bn', 'B'], ['ok', 'OK'], ['ng', 'NG']], t && t.st);
  if (!t) return y + h;
  if (!o.wild) {
    hsFont(doc, 'bold', 9.5); const n = pdfSafe(t.n), cx = (B[0] + B[1]) / 2;
    hsTx(doc, n, cx, by, { align: 'center' });
    if (t.st === 'bn') { doc.setDrawColor(...HS_K); doc.setLineWidth(.9); doc.circle(cx, by - 3.3, Math.max(7, hsW(doc, n) / 2 + 4)); }
  }
  hsFont(doc, 'normal', 8.5);
  [[2, t.t], [3, t.d], [4, o.wild ? '-' : t.r], [5, o.snd != null ? o.snd : t.s]].forEach(([i, v]) => { if (v) hsTx(doc, hsFit(doc, pdfSafe(v), B[i + 1] - B[i] - 6), B[i] + 3, by); });
  const L = hsLines(doc, t.note, x1 - B[6] - 9);
  if (L.length) hsTx(doc, L, B[6] + 4.5, by, { lineHeightFactor: 1.2 });
  return y + h;
}
/* el recuadro de continuidad: con líneas para escribir o con lo anotado. Devuelve su alto (dibuja si draw) */
function hsCont(doc, s, x0, x1, y, fill, draw = true) {
  const m = P.sup.sc[s.key] || {}, gap = 13.5, cw = (x1 - x0 - 15 - gap) / 2, rh = 16.5;
  const F = [['Vestuario', 'ward'], [EN ? trDone('Props') : 'Utilería', 'props'],   // «Utilería» en el glosario es el cargo
    ['Maquillaje y peinado', 'mk'], ['Posiciones', 'pos'], ['Cambios de texto', 'txt'], ['Fotos n.º', 'ph']];
  if (fill && m.notes) F.push(['Notas', 'notes']);
  hsFont(doc, 'normal', 9);
  const val = f => f === 'ph' ? ((m.ph || []).length ? `${(m.ph || []).length}` : '') : pdfSafe(m[f] || '');
  // en la hoja llena, cada dato con sus líneas (a lo ancho, si es largo)
  const items = F.map(([lab, f]) => { const L = hsL(f === 'props' && EN ? 'Props' : lab), v = fill ? val(f) : '', lw = hsW(doc, L) + 6; const lines = v ? hsLines(doc, v, cw - lw) : []; return { L, lw, lines, wide: lines.length > 1 }; });
  let rows = [], cur = [];
  for (const it of items) { if (it.wide) { if (cur.length) { rows.push(cur); cur = []; } const lines = hsLines(doc, fill ? val(F[items.indexOf(it)][1]) : '', x1 - x0 - 15 - it.lw); rows.push([{ ...it, lines, full: true }]); continue; } cur.push(it); if (cur.length === 2) { rows.push(cur); cur = []; } }
  if (cur.length) rows.push(cur);
  const rH = r => Math.max(rh, ...r.map(it => it.lines.length > 1 ? it.lines.length * 10.5 + 6 : rh));
  const h = 4.5 + 12 + rows.reduce((a, r) => a + rH(r), 0) + rh + 7;
  if (!draw) return h;
  hsLine(doc, x0, y, x1, y, HS_K, 1.1);
  hsFont(doc, 'bold', 9); hsTx(doc, hsU('Continuidad'), x0 + 7.5, y + 13, { charSpace: .6 });
  let yy = y + 4.5 + 12;
  for (const r of rows) {
    const hh = rH(r);
    r.forEach((it, i) => {
      const cx = x0 + 7.5 + i * (cw + gap), cend = it.full ? x1 - 7.5 : cx + cw;
      hsFont(doc, 'normal', 9); hsTx(doc, it.L, cx, yy + 12);
      if (it.lines.length) { hsFont(doc, 'normal', 8.5); hsTx(doc, it.lines, cx + it.lw, yy + 12, { lineHeightFactor: 1.24 }); }
      for (let j = 0; j < Math.max(1, it.lines.length); j++) hsLine(doc, cx + it.lw - 2, yy + 13.5 + j * 10.5, cend, yy + 13.5 + j * 10.5, HS_L, .75);
    });
    yy += hh;
  }
  // tiempo en pantalla y escena completa
  hsFont(doc, 'normal', 9);
  const plan = supFmt(supPlanSecs(s.key)), real = fill ? supFmt(supRealSecs(s.key)) : '';
  const t = hsL('Tiempo en pantalla') + ' · ' + hsL('previsto') + ' ' + plan + ' · ' + (EN ? 'actual' : 'real');
  hsTx(doc, t, x0 + 7.5, yy + 12);
  const lx = x0 + 7.5 + hsW(doc, t) + 4.5;
  hsLine(doc, lx, yy + 13.5, lx + 90, yy + 13.5, HS_L, .75);
  if (real) { hsFont(doc, 'bold', 8.5); hsTx(doc, real, lx + 3, yy + 12); }
  // (en inglés, «Escena completa» del diccionario es «la escena entera»: aquí, que quedó rodada)
  hsOpts(doc, lx + 102, yy + 12, [['si', EN ? 'Scene complete' : 'Escena completa']], fill && sceneDone(s.key) ? 'si' : '');
  return h;
}
/* el pie de cada hoja (se pone al final, cuando ya se sabe cuántas son) */
function hsFeet(doc, feet) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    const f = feet[i - 1]; if (!f) continue;
    doc.setPage(i);
    // (lote AH) lo de abajo también en cuadro, pegado al recuadro de la escena (antes, una raya gris encima)
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), y = H - HS_FOOT - 22, fh = 17;
    doc.setDrawColor(...HS_K); doc.setLineWidth(1.1); doc.rect(HS_M, y, W - 2 * HS_M, fh);
    hsFont(doc, 'normal', 9, HS_G);
    const right = (f.k != null ? hsL(`Escena ${f.k}`) + ' · ' : '') + hsL(`Página ${i} de ${n}`);
    hsTx(doc, hsFit(doc, hsL(f.left), W - 2 * HS_M - hsW(doc, right) - 28), HS_M + 7, y + 11.5);
    hsTx(doc, right, W - HS_M - 7, y + 11.5, { align: 'right' });
  }
}
/* ---------- la hoja de script: para imprimir (en blanco) o llena ---------- */
function pdfSupSheet(blank) {
  const doc = newDoc('portrait', 'a4'), X = hsCtx(), feet = [];
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), x0 = HS_M, x1 = W - HS_M;
  const boxB = H - HS_FOOT - 22;   // el fondo del recuadro de la escena (debajo va el pie)
  const kick = 'Hoja de script · Registro de tomas';
  const footL = blank ? 'Toma buena: encierra su número en un círculo · Estado: marca B (buena), OK o NG' : 'Toma buena: su número en un círculo · Estado: el círculo lleno';
  let first = true;
  const page = () => { if (!first) doc.addPage('a4', 'portrait'); first = false; };
  // el recuadro de la escena, de arriba abajo de la hoja
  const box = (y0) => { doc.setDrawColor(...HS_K); doc.setLineWidth(1.1); doc.rect(x0, y0, x1 - x0, boxB - y0); };
  for (const k of X.keys) {
    const s = sceneOfKey(k); if (!s) continue;
    const shots = D.shotsBy[k] || [];
    if (blank) {
      // una hoja cada 7 planos; la última se completa con planos extra y lleva la continuidad
      const chunks = []; for (let i = 0; i < Math.max(1, shots.length); i += HS_PER) chunks.push(shots.slice(i, i + HS_PER));
      chunks.forEach((ch, ci) => {
        page();
        const y0 = hsHead(doc, X, kick, false);
        let y = hsSceneHead(doc, s, x0, x1, y0, ci > 0);
        y = hsColHead(doc, x0, x1, y);
        const last = ci === chunks.length - 1, extras = last ? HS_PER - ch.length : 0;
        for (const sh of ch) {
          const d = supDesc(sh);
          y = hsStrip(doc, x0, x1, y, pdfSafe(D.code[sh.id]), pdfSafe('· ' + [supTech(sh), d].filter(Boolean).join(' — ')), { mos: supMos(sh.id) });
          for (let i = 0; i < 3; i++) y = hsTakeRow(doc, x0, x1, y, HS_TAKE, null);
        }
        for (let e = 0; e < extras; e++) {
          y = hsStrip(doc, x0, x1, y, hsL('Plano') + ' ____', '· ' + [hsL('extra'), hsL('Tamaño') + ' ______', hsL('Ángulo') + ' ______', hsL('Lente') + ' ______', hsL('Descripción') + ' ______________________'].join(' · '), { extra: true });
          for (let i = 0; i < 3; i++) y = hsTakeRow(doc, x0, x1, y, HS_TAKE, null);
        }
        if (last) { const ch2 = hsCont(doc, s, x0, x1, 0, false, false); hsCont(doc, s, x0, x1, boxB - ch2, false); }
        box(y0);
        feet.push({ k, left: footL });
      });
      continue;
    }
    // llena: las tomas anotadas (una fila por toma), con salto de hoja donde haga falta
    page();
    let y0 = hsHead(doc, X, kick, true), y = hsColHead(doc, x0, x1, hsSceneHead(doc, s, x0, x1, y0, false));
    feet.push({ k, left: footL });
    const contH = hsCont(doc, s, x0, x1, 0, true, false);
    const next = () => { box(y0); page(); y0 = hsHead(doc, X, kick, true); y = hsColHead(doc, x0, x1, hsSceneHead(doc, s, x0, x1, y0, true)); feet.push({ k, left: footL }); };
    const rowH = t => { hsFont(doc, 'normal', 8.5); const L = hsLines(doc, t && t.note, x1 - hsCols(x0)[6] - 9); return Math.max(HS_TAKE, L.length * 10.2 + 9); };
    const group = (num, text, o, rows) => {
      if (y + HS_STRIP + (rows.length ? rowH(rows[0].t) : HS_TAKE) > boxB) next();
      y = hsStrip(doc, x0, x1, y, num, text, o);
      if (o.obs) { hsFont(doc, 'normal', 8.5, HS_G); const L = hsLines(doc, hsL('Observaciones') + ': ' + o.obs, x1 - x0 - 9); doc.setFillColor(...HS_W); hsTx(doc, L, x0 + 4.5, y + 9.5, { lineHeightFactor: 1.2 }); y += L.length * 10.2 + 4; hsLine(doc, x0, y, x1, y, HS_L, .75); }
      if (!rows.length) { hsFont(doc, 'normal', 8.5, HS_G); hsTx(doc, hsL('Sin tomas'), hsCols(x0)[6] + 4.5, y + 13.5); y = hsTakeRow(doc, x0, x1, y, HS_TAKE, null); return; }
      for (const r of rows) {
        const h = rowH(r.t);
        if (y + h > boxB) { next(); y = hsStrip(doc, x0, x1, y, num, text + ' ' + hsL('(sigue)'), o); }
        y = hsTakeRow(doc, x0, x1, y, h, r.t, r.o);
      }
    };
    for (const sh of shots) {
      const takes = supRolled(sh.id);   // (lote AI) la toma lista que nunca se grabó no sale
      group(pdfSafe(D.code[sh.id]), pdfSafe('· ' + [supTech(sh), supDesc(sh)].filter(Boolean).join(' — ') + (supKind(sh) ? ' · ' + hsL(supKind(sh)) : '')), { mos: supMos(sh.id), obs: (P.sup.obs || {})[sh.id] || '' },
        takes.map(t => ({ t, o: { snd: isMos(takeSnd(sh.id, t)) ? 'MOS' : takeSnd(sh.id, t) } })));
    }
    const W2 = (P.sup.sc[k] || {}).wild || [];
    if (W2.length) group('Wild', '· ' + hsL('Sonido sin cámara · ambiente'), {}, W2.map((w, i) => ({ t: { n: '', st: '', t: w.t, d: w.d, s: w.s, note: w.note }, o: { wild: i + 1 } })));
    if (y + contH > boxB) next();
    hsCont(doc, s, x0, x1, boxB - contH, true);
    box(y0);
  }
  if (!X.keys.length) { page(); const y0 = hsHead(doc, X, kick, !blank); hsFont(doc, 'normal', 10, HS_G); hsTx(doc, hsL('No hay escenas en esta jornada.'), x0, y0 + 20); feet.push({ left: footL }); }
  // la última hoja: el parte diario (en blanco en la hoja para imprimir; lleno en la hoja llena, si hay jornada)
  if (blank || X.day) { doc.addPage('a4', 'portrait'); const p0 = doc.getNumberOfPages(); hsParte(doc, X, !blank); for (let i = p0; i <= doc.getNumberOfPages(); i++) feet[i - 1] = { left: 'Las tomas de cada escena van en las páginas anteriores' }; }
  hsFeet(doc, feet);
  const tag = UI.supDay >= 0 ? '_jornada_' + (UI.supDay + 1) : '';
  return { doc, name: fileSafe(P.meta.title) + '_hoja_de_script' + (blank ? (EN ? '_printable' : '_para_imprimir') : '') + tag + '.pdf' };
}

/* ---------- parte diario (lleno o en blanco), con la forma de la hoja para imprimir ---------- */
// lleno, un poco más apretado (que entre en una hoja); en blanco, filas altas para escribir
const HS_TBL = fill => ({ theme: 'grid', styles: { font: 'helvetica', fontSize: fill ? 9 : 9.75, textColor: HS_K, lineColor: HS_K, lineWidth: .75, cellPadding: fill ? { top: 3.5, bottom: 3.5, left: 5, right: 5 } : { top: 5, bottom: 5, left: 6, right: 6 }, minCellHeight: fill ? 17 : 21, valign: 'middle', fillColor: false, overflow: 'linebreak' },
  headStyles: { fontStyle: 'bold', fontSize: 9, fillColor: false, textColor: HS_K, lineWidth: .75, lineColor: HS_K, valign: 'middle', minCellHeight: 18 }, bodyStyles: { fillColor: false }, alternateRowStyles: { fillColor: false } });
/* el título de una sección del parte: en mayúsculas y negrita (sub: una aclaración en gris) */
function hsSec(doc, x, y, t, sub) {
  hsFont(doc, 'bold', 9); const T = hsU(t); hsTx(doc, T, x, y, { charSpace: .5 });
  if (sub) { hsFont(doc, 'normal', 9, HS_G); hsTx(doc, ' · ' + hsL(sub), x + hsW(doc, T) + T.length * .5 + 2, y); }
  return y + 5;
}
function hsParte(doc, X, fill) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), x0 = HS_M, x1 = W - HS_M, cw = (x1 - x0 - 18) / 2;
  const { keys, shots, dm, n, days } = X, bottom = H - HS_FOOT - 30;
  const locs = [...new Set(keys.map(k => { const s = sceneOfKey(k); return s ? s.locBase || s.loc || '' : ''; }).filter(Boolean))];
  let y = hsHead(doc, { ...X, call: '', loc: locs.join(', '), lines: false }, 'Hoja de script · Parte diario', fill) + 6;
  const T = HS_TBL(fill), stats = supStats({ keys, shots }), [f0, l0] = supFirstLast(shots);
  // la primera toma de la tarde: la primera después del almuerzo
  const pm = (() => { const a = hmToMin(dm.lu1); if (a == null) return ''; let b = null; for (const sh of shots) for (const t of supTakes(sh.id)) { const m = hmToMin(normHM(t.t || '')); if (m != null && m >= a && (b == null || m < b.m)) b = { m, t: normHM(t.t) }; } return b ? b.t : ''; })();
  const V = v => fill ? pdfSafe(v || '') : '';
  const L = supLen(X.call, dm.wrap);
  const hours = [['Llamado', X.call], ['Primera toma', fill ? dm.first || f0 : ''], ['Almuerzo (de · a)', fill && (dm.lu0 || dm.lu1) ? `${dm.lu0 || '--'} · ${dm.lu1 || '--'}` : ''], ['Primera toma de la tarde', fill ? pm : ''], ['Última toma', fill ? dm.last || l0 : ''], ['Fin de jornada', fill ? dm.wrap : '']];
  if (fill && L) hours.push(['Duración de la jornada', L + ' h']);
  hours.push(['Horas extra', V(dm.extra)]);
  const nPh = keys.reduce((a, k) => a + ((P.sup.sc[k] || {}).ph || []).length, 0);
  const mat = [['Tarjetas de cámara', fill ? supRolls(shots).join(', ') : ''], ['Rollos de sonido', fill ? supRolls(shots, 's').join(', ') : ''], ['Fotos de continuidad', fill && nPh ? String(nPh) : '']];
  const prog = [['Planos', fill ? `${stats.done} de ${shots.length}` : `de ${shots.length}`], ['Páginas', fill ? `${fmtEighths(stats.eDn)} de ${fmtEighths(stats.ePl)}` : `de ${fmtEighths(stats.ePl)}`], ['Tiempo en pantalla', fill ? `${stats.hasReal ? supFmt(stats.real) : '0:00'} de ${supFmt(stats.plan)}` : `de ${supFmt(stats.plan)}`]];
  if (fill) { const tk = shots.flatMap(sh => supRolled(sh.id)); prog.push(['Tomas', `${tk.length}${tk.length ? ` (${tk.filter(t => t.st === 'bn').length} ${hsL('buenas')} · ${tk.filter(t => t.st === 'ng').length} NG)` : ''}`]); }
  const kv = (rows, x, w, yy, right) => {
    doc.autoTable({ ...T, startY: yy, margin: { left: x, right: W - x - w, top: HS_M + 10, bottom: HS_FOOT + 30 }, tableWidth: w,
      body: rows.map(([a, b]) => [hsL(a), { content: pdfSafe(b || ''), styles: { fontStyle: fill || /^\d/.test(b || '') ? 'bold' : 'normal', textColor: fill ? HS_K : HS_G, halign: right && !fill ? 'right' : 'left' } }]),
      columnStyles: { 0: { cellWidth: w * .55 } } });
    return doc.lastAutoTable.finalY;
  };
  y += 8;
  const yL = kv(hours, x0, cw, hsSec(doc, x0, y, 'Horarios'));
  const yM = kv(mat, x0 + cw + 18, cw, hsSec(doc, x0 + cw + 18, y, EN ? trDone('Media') : 'Material'));
  // («Avance» y «Tiempo», en inglés, son otra cosa en el diccionario: aquí, el avance de la jornada y su tiempo)
  const yA = kv(prog, x0 + cw + 18, cw, hsSec(doc, x0 + cw + 18, yM + 16, EN ? trDone('Progress') : 'Avance'), true);
  y = Math.max(yL, yA) + (fill ? 16 : 22);
  // las escenas de la jornada
  y = hsSec(doc, x0, y, 'Escenas de la jornada');
  const tt = EN ? trDone('Time') : 'Tiempo';
  const head = fill ? ['Esc.', 'Encabezado', 'Planos', 'Tomas', 'Buenas', tt, 'Inicio', 'Fin', 'Completa'] : ['Esc.', 'Encabezado', 'Planos', 'Tomas', 'Buenas', tt, 'Completa'];
  const body = keys.map(k => {
    const s = sceneOfKey(k), sh = D.shotsBy[k] || [], tk = sh.flatMap(x => supRolled(x.id)), m = P.sup.sc[k] || {}, r = supRealSecs(k);
    const st = sceneDone(k) ? 'si' : sh.some(x => x.done) ? 'med' : 'no';
    const base = [{ content: pdfSafe(k), styles: { fontStyle: 'bold' } }, pdfSafe(s ? s.heading : ''), { content: fill ? `${sh.filter(x => x.done).length} / ${sh.length}` : `/ ${sh.length}`, styles: { halign: 'right', textColor: fill ? HS_K : HS_G } },
      fill ? String(tk.length) : '', fill ? String(tk.filter(t => t.st === 'bn').length) : '', fill && r != null ? supFmt(r) : ''];
    if (fill) base.push(m.start || '', m.end || '');
    base.push({ content: '', _opt: fill ? st : '' });
    return base;
  });
  const cs = fill ? { 0: { cellWidth: 32 }, 2: { cellWidth: 46 }, 3: { cellWidth: 42 }, 4: { cellWidth: 48 }, 5: { cellWidth: 46 }, 6: { cellWidth: 40 }, 7: { cellWidth: 36 }, 8: { cellWidth: 74 } }
    : { 0: { cellWidth: 33 }, 2: { cellWidth: 49.5 }, 3: { cellWidth: 49.5 }, 4: { cellWidth: 49.5 }, 5: { cellWidth: 55.5 }, 6: { cellWidth: 74 } };
  doc.autoTable({ ...T, startY: y, margin: { left: x0, right: x0, top: HS_M + 10, bottom: HS_FOOT + 30 }, head: [head.map(hsL)], body: body.length ? body : [[{ content: hsL('No hay escenas en esta jornada.'), colSpan: head.length, styles: { textColor: HS_G } }]], columnStyles: cs,
    didParseCell: d => { if (d.section === 'body' && d.column.index === 1) { d.cell.styles.overflow = 'ellipsize'; } },
    didDrawCell: d => {
      const r = d.cell.raw; if (d.section !== 'body' || !r || r._opt == null) return;
      const by = d.cell.y + d.cell.height / 2 + 3.2;
      if (r._opt === 'med') { hsFont(doc, 'normal', 9); hsTx(doc, hsL('A medias'), d.cell.x + 6, by); return; }
      hsOpts(doc, d.cell.x + 6, by, [['si', 'Sí'], ['no', 'No']], r._opt);
    } });
  y = doc.lastAutoTable.finalY + (fill ? 16 : 20);
  const room = need => { if (y + need > bottom) { doc.addPage('a4', 'portrait'); y = HS_M + 10; } };
  if (fill) {
    // el reparto de la jornada: actor, llamado (de la hoja de llamado) y su día en el plan (días por actor)
    const cast = [...dayInfo(keys).cast].filter(id => P.elements[id]).sort((a, b) => (D.castNum[a] || 99) - (D.castNum[b] || 99));
    if (cast.length && X.day) {
      room(70); y = hsSec(doc, x0, y, 'Reparto');
      const C = P.call || {}, dd = (C.days || {})[X.day.id] || {};
      const dood = doodData(), code = id => { const r = dood && dood.rows.find(x => x.id === id); return r ? r.codes[n] || '' : ''; };
      const CODE = { I: 'Inicio', T: 'Trabaja', F: 'Fin', IF: 'Inicio y fin' };
      doc.autoTable({ ...T, startY: y, margin: { left: x0, right: x0, top: HS_M + 10, bottom: HS_FOOT + 30 }, head: [['#', 'Personaje', 'Actor / actriz', 'Llamado', 'Escenas', 'Plan'].map(hsL)],
        body: cast.map(id => [String(D.castNum[id] || ''), pdfSafe(titleCase(P.elements[id].name)), pdfSafe(((C.talent || {})[id] || {}).actor || ''), ((dd.cast || {})[id] || {}).call || '', keys.filter(k => { const s = sceneOfKey(k); return s && D.sem[s.idx].has(id); }).join(', '), hsL(CODE[code(id)] || '')]),
        columnStyles: { 0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' }, 3: { cellWidth: 52 }, 5: { cellWidth: 88 } } });
      y = doc.lastAutoTable.finalY + 16;
    }
    // el avance del rodaje hasta esta jornada
    if (X.day) {
      const upTo = days.slice(0, n + 1), allKeys = D.sc.scenes.map(s => s.key), totE = allKeys.reduce((a, k) => a + scenePages(k), 0);
      const doneAll = allKeys.filter(sceneDone), eAll = doneAll.reduce((a, k) => a + scenePages(k), 0), ePlanned = upTo.flatMap(x => x.keys).reduce((a, k) => a + scenePages(k), 0);
      const pct = v => totE ? Math.round(v / totE * 100) + ' %' : '';
      room(110); y = hsSec(doc, x0, y, 'Avance del rodaje');
      doc.autoTable({ ...T, startY: y, margin: { left: x0, right: x0, top: HS_M + 10, bottom: HS_FOOT + 30 },
        body: [['Jornadas', `${n + 1} de ${days.length}`], ['Escenas completas', `${doneAll.length} de ${allKeys.length}`], ['Páginas completas', `${fmtEighths(eAll)} de ${fmtEighths(totE)} (${pct(eAll)})`],
          ['Según el plan, a esta altura', `${fmtEighths(ePlanned)} ${hsL('págs.')} (${pct(ePlanned)})${eAll < ePlanned ? ' · ' + hsL('atraso de') + ' ' + fmtEighths(ePlanned - eAll) : eAll > ePlanned ? ' · ' + hsL('adelanto de') + ' ' + fmtEighths(eAll - ePlanned) : ''}`]].map(([a, b]) => [hsL(a), { content: pdfSafe(b), styles: { fontStyle: 'bold' } }]),
        columnStyles: { 0: { cellWidth: (x1 - x0) * .4 } } });
      y = doc.lastAutoTable.finalY + 16;
    }
  }
  // incidencias y notas: lo anotado, y líneas para escribir
  const lined = (title, sub, text) => {
    const lines = fill ? (title === 'Incidencias' ? supIncs(text).map(x => [x.t, x.x].filter(Boolean).join('  ')) : String(text || '').split('\n')).flatMap(l => hsLines(doc, l, x1 - x0 - 8)) : [];
    const nl = fill ? Math.max(1, lines.length) : 4, lh = fill ? 18 : 21;
    room(14 + Math.min(nl, 6) * lh);
    y = hsSec(doc, x0, y + 9, title, sub);
    for (let i = 0; i < nl; i++) {
      if (y + lh > bottom) { doc.addPage('a4', 'portrait'); y = HS_M + 10; }
      if (lines[i]) { hsFont(doc, 'normal', 9.5); hsTx(doc, lines[i], x0 + 2, y + lh - 5); }
      hsLine(doc, x0, y + lh, x1, y + lh, HS_L, .75); y += lh;
    }
    y += fill ? 8 : 14;
  };
  lined('Incidencias', 'demoras y su causa, accidentes, fallas de equipo', dm.inc);
  lined('Notas de la jornada', 'cambios de plan, pendientes para mañana', dm.notes);
  // firmas
  room(56); y += 26;
  const sw = (x1 - x0 - 2 * 21) / 3;
  [['Script', fill ? P.sup.supervisor : ''], ['Asistencia de dirección', ''], ['Producción', '']].forEach(([r, name], i) => {
    const x = x0 + i * (sw + 21);
    hsLine(doc, x, y, x + sw, y, HS_K, .75);
    hsFont(doc, 'normal', 9); hsTx(doc, hsL(r), x + sw / 2, y + 12, { align: 'center' });
    if (name) { hsFont(doc, 'bold', 9); hsTx(doc, hsFit(doc, pdfSafe(name), sw), x + sw / 2, y - 4, { align: 'center' }); }
  });
}
/* el parte diario lleno de una jornada (Exportar › Parte diario) */
function pdfParte() {
  const doc = newDoc('portrait', 'a4'), X = hsCtx();
  hsParte(doc, X, true);
  const feet = []; for (let i = 0; i < doc.getNumberOfPages(); i++) feet.push({ left: 'Parte diario · ' + X.title });
  hsFeet(doc, feet);
  return { doc, name: fileSafe(P.meta.title) + `_parte_diario_jornada_${X.n + 1}.pdf` };
}

/* ---------- reportes de cámara y de sonido ---------- */
function supTakeRows(f) {
  const keys = supScenes(), out = [];
  for (const k of keys) {
    for (const sh of D.shotsBy[k] || []) supRolled(sh.id).forEach(t => out.push({ k, sh, t, g: f === 's' ? takeSnd(sh.id, t) : t[f] || '' }));
    // el sonido wild o de ambiente de la escena: solo en el de sonido (no tiene cámara)
    if (f === 's') ((P.sup.sc[k] || {}).wild || []).forEach((w, i) => out.push({ k, sh: null, t: { n: 'W' + (i + 1), st: 'wd', t: w.t, d: w.d, s: w.s, note: w.note }, g: w.s || '' }));
  }
  return out;
}
function pdfTakeReport(f) {
  const cam = f === 'r';
  const doc = newDoc();
  const { days } = scheduleDays(P, D.sc);
  const dates = shootDates(P, days.length);
  const scope = UI.supDay === -1 ? 'Todas las escenas' : UI.supDay === -2 ? 'Sin programar' : supDayLabel(UI.supDay, dates);
  let y = docHeader(doc, cam ? 'Reporte de cámara' : 'Reporte de sonido', scope, { box: true });
  const rows = supTakeRows(f);
  const groups = new Map();
  for (const r of rows) {
    const g = !cam && isMos(r.g) ? '\u0000MOS' : r.g || '\u0001';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  const ST = { ng: 'NG', ok: 'OK', bn: 'BUENA', wd: 'WILD' };
  const names = g => g === '\u0000MOS' ? 'Sin sonido (MOS)' : g === '\u0001' ? (cam ? 'Sin tarjeta anotada' : 'Sin rollo de sonido anotado') : (cam ? 'Tarjeta ' : 'Rollo ') + g;
  const order = [...groups.keys()].sort((a, b) => (a[0] < ' ') - (b[0] < ' ') || 0);
  // dentro de cada tarjeta o rollo, en el orden en que se grabaron (por hora; sin hora, en el orden del guion)
  const hm = t => { const m = hmToMin(normHM(t.t || '')); return m == null ? 1e9 : m; };
  for (const L of groups.values()) L.sort((a, b) => hm(a.t) - hm(b.t));
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK);
  const takes = rows.filter(r => r.sh);
  const sumTxt = `${takes.length} ${takes.length === 1 ? 'toma' : 'tomas'} · ${takes.filter(r => r.t.st === 'bn').length} buenas · ${takes.filter(r => r.t.st === 'ng').length} NG${rows.length > takes.length ? ` · ${rows.length - takes.length} wild` : ''} · ${((c) => `${c} ${cam ? (c === 1 ? 'tarjeta' : 'tarjetas') : (c === 1 ? 'rollo' : 'rollos')}`)(order.filter(g => g[0] >= ' ').length)}${P.sup.supervisor ? ' · Script: ' + P.sup.supervisor : ''}`;
  doc.text(pdfSafe(sumTxt), 36, y + 4); y += 14;
  if (!rows.length) { doc.setTextColor(...MUTED); doc.text('Todavía no hay tomas anotadas en la hoja de script.', 36, y + 10); }
  const body = [];
  for (const g of order) {
    const L = groups.get(g), n = L.filter(r => r.sh).length;
    body.push([pdfRich([{ segs: [{ t: names(g), st: 'bold' }, { t: `   ${n} ${n === 1 ? 'toma' : 'tomas'}  ·  ${L.filter(r => r.t.st === 'bn').length} buenas${L.length > n ? `  ·  ${L.length - n} wild` : ''}`, col: MUTED }] }], { colSpan: 8, fillColor: PT.fill })]);
    for (const { k, sh, t } of L) body.push([k, sh ? D.code[sh.id] || '' : 'Wild', sh ? 'T' + t.n : t.n, t.t || '', t.d || '', cam ? (sh && sh.lens ? sh.lens + 'mm' : '') : (t.r || ''), ST[t.st] || '', pdfSafe([t.note, sh && (P.sup.obs || {})[sh.id] && t.st === 'bn' ? (P.sup.obs || {})[sh.id] : ''].filter(Boolean).join(' · '))]);
  }
  if (body.length) doc.autoTable({ ...TBLX, startY: y + 4, head: [['Esc.', 'Plano', 'Toma', 'Hora', 'Dur.', cam ? 'Lente' : 'Tarjeta', 'Estado', 'Nota']], body,
    columnStyles: { 0: { cellWidth: 34, fontStyle: 'bold' }, 1: { cellWidth: 42 }, 2: { cellWidth: 34 }, 3: { cellWidth: 40 }, 4: { cellWidth: 36 }, 5: { cellWidth: 50 }, 6: { cellWidth: 44 } },
    didParseCell: c => { if (c.section === 'body' && c.column.index === 6) { if (c.cell.raw === 'BUENA') { c.cell.styles.textColor = OKC; c.cell.styles.fontStyle = 'bold'; } else if (c.cell.raw === 'NG') c.cell.styles.textColor = [176, 52, 64]; } } });
  pageNumbers(doc, (cam ? 'Reporte de cámara · ' : 'Reporte de sonido · ') + scope);
  const tag = UI.supDay >= 0 ? `_jornada_${UI.supDay + 1}` : '';
  return { doc, name: fileSafe(P.meta.title) + (cam ? '_reporte_de_camara' : '_reporte_de_sonido') + tag + '.pdf' };
}
function pdfCamRep() { return pdfTakeReport('r'); }
function pdfSndRep() { return pdfTakeReport('s'); }
