/* ============================================================
   HOJA DE SCRIPT · parte diario y reportes de cámara y sonido (PDF)
   Salen de lo que ya se anota en la hoja de script (horarios de la jornada, planos rodados, tomas con su
   tarjeta y su rollo de sonido), del plan (escenas de la jornada) y de la hoja de llamado (actores y llamados).
   · Parte diario: una jornada. Horarios, escenas y páginas rodadas, planos, tomas, reparto, avance del
     rodaje hasta esa jornada, incidencias, notas y firmas.
   · Reporte de cámara: las tomas agrupadas por tarjeta. Reporte de sonido: por rollo de sonido, y aparte
     las grabadas sin sonido (MOS).
   ============================================================ */
const supDayLabel = (n, dates) => `Jornada ${n + 1}${dates[n] ? ' · ' + fmtDate(dates[n]) : ''}`;
const scenePages = k => { const s = sceneOfKey(k); return s ? D.metrics.eighths[s.idx] : 0; };
const sceneDone = k => (D.shotsBy[k] || []).length && D.shotsBy[k].every(s => s.done);
/* una tabla de dos columnas «dato: valor» (cajas del parte) */
function pdfKV(doc, y, title, pairs, x = 36, w = 270) {
  doc.autoTable({ ...TBL, startY: y, margin: { left: x, right: doc.internal.pageSize.getWidth() - x - w }, tableWidth: w,
    head: [[{ content: pdfSafe(title), colSpan: 2, styles: { fillColor: PDF_WHITE, textColor: INK, font: 'title', fontStyle: 'bold', fontSize: PF.sec - 1, cellPadding: { top: 0, bottom: 6, left: 0, right: 0 }, lineWidth: { bottom: .6 }, lineColor: mixc(INK, PDF_WHITE, .7) } }]],
    body: pairs.map(([a, b]) => [{ content: pdfSafe(a), styles: { cellPadding: { ...PAD, left: 0 } } }, { content: pdfSafe(b), styles: { fontStyle: 'bold' } }]),
    columnStyles: { 0: { cellWidth: w * .52, textColor: MUTED } } });
  return doc.lastAutoTable.finalY;
}

/* ---------- parte diario ---------- */
function pdfParte() {
  const doc = newDoc();
  const { days } = scheduleDays(P, D.sc);
  const dates = shootDates(P, days.length);
  const n = UI.supDay, d = days[n];
  const W = doc.internal.pageSize.getWidth();
  let y = docHeader(doc, 'Parte diario de producción', `Jornada ${n + 1} de ${days.length}${dates[n] ? ' · ' + fmtDate(dates[n]) : ''}`);
  const dm = P.sup.day[d.id] || {};
  const call = dm.call || P.schedule.call || '';
  const keys = d.keys, shots = keys.flatMap(k => D.shotsBy[k] || []), takes = shots.flatMap(sh => P.sup.takes[sh.id] || []);
  const doneKeys = keys.filter(sceneDone), partKeys = keys.filter(k => !sceneDone(k) && (D.shotsBy[k] || []).some(s => s.done));
  const ePlan = keys.reduce((a, k) => a + scenePages(k), 0), eDone = doneKeys.reduce((a, k) => a + scenePages(k), 0);
  // izquierda: horarios; derecha: avance de la jornada
  const yL = pdfKV(doc, y, 'Horarios', [['Llamado', call], ['Primera toma', dm.first || ''], ['Fin de jornada', dm.wrap || ''], ['Duración de la jornada', supLen(call, dm.wrap) ? supLen(call, dm.wrap) + ' h' : ''], ['Horas extra', dm.extra || '']]);
  const yR = pdfKV(doc, y, 'Avance de la jornada', [
    ['Escenas completas', `${doneKeys.length} de ${keys.length}${partKeys.length ? ` (${partKeys.length} a medias)` : ''}`],
    ['Páginas completas', `${fmtEighths(eDone)} de ${fmtEighths(ePlan)}`],
    ['Planos rodados', `${shots.filter(s => s.done).length} de ${shots.length}`],
    ['Tomas', `${takes.length}${takes.length ? ` (${takes.filter(t => t.st === 'bn').length} buenas · ${takes.filter(t => t.st === 'ng').length} NG)` : ''}`],
    ['Tarjetas / sonido', [supRolls(shots).join(', '), supRolls(shots, 's').join(', ')].filter(Boolean).join(' · ')],
  ], 306, 270);
  y = Math.max(yL, yR) + PF.gap;
  // escenas de la jornada
  const st = k => sceneDone(k) ? 'Completa' : (D.shotsBy[k] || []).some(s => s.done) ? 'A medias' : (D.shotsBy[k] || []).length ? 'No rodada' : 'Sin planos';
  doc.autoTable({ ...TBL, startY: y, head: [['Esc.', 'Escena', 'Págs.', 'Planos', 'Inicio', 'Fin', 'Estado']],
    body: keys.map(k => { const s = sceneOfKey(k), m = P.sup.sc[k] || {}, sh = D.shotsBy[k] || []; return [k, pdfSafe(s.heading), fmtEighths(scenePages(k)), `${sh.filter(x => x.done).length}/${sh.length}`, m.start || '', m.end || '', st(k)]; }),
    columnStyles: { 0: { cellWidth: 34, fontStyle: 'bold' }, 2: { cellWidth: 38, halign: 'right' }, 3: { cellWidth: 44, halign: 'center' }, 4: { cellWidth: 40, halign: 'center' }, 5: { cellWidth: 40, halign: 'center' }, 6: { cellWidth: 58 } },
    didParseCell: c => { if (c.section === 'body' && c.column.index === 6) c.cell.styles.textColor = c.cell.raw === 'Completa' ? OKC : c.cell.raw === 'A medias' ? [176, 120, 0] : MUTED; } });
  y = doc.lastAutoTable.finalY + PF.gap;
  // reparto de la jornada: actor, llamado (de la hoja de llamado) y su día en el plan (días por actor)
  const cast = [...dayInfo(keys).cast].filter(id => P.elements[id]).sort((a, b) => (D.castNum[a] || 99) - (D.castNum[b] || 99));
  if (cast.length) {
    const C = P.call || {}, dd = (C.days || {})[d.id] || {};
    const dood = doodData(), code = id => { const r = dood && dood.rows.find(x => x.id === id); return r ? r.codes[n] || '' : ''; };
    const CODE = { I: 'Inicio', T: 'Trabaja', F: 'Fin', IF: 'Inicio y fin' };   // (en inglés: Start work, Work, Finish, Start-work-finish)
    doc.autoTable({ ...TBL, startY: y, head: [['#', 'Personaje', 'Actor / actriz', 'Llamado', 'Escenas', 'Plan']],
      body: cast.map(id => [String(D.castNum[id] || ''), pdfSafe(titleCase(P.elements[id].name)), pdfSafe(((C.talent || {})[id] || {}).actor || ''), ((dd.cast || {})[id] || {}).call || '', keys.filter(k => { const s = sceneOfKey(k); return s && D.sem[s.idx].has(id); }).join(', '), CODE[code(id)] || '']),
      columnStyles: { 0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' }, 3: { cellWidth: 50, halign: 'center' }, 5: { cellWidth: 92 } } });   // (lote K) «Start-work-finish» en una línea
    y = doc.lastAutoTable.finalY + PF.gap;
  }
  // avance del rodaje hasta esta jornada
  const upTo = days.slice(0, n + 1), allKeys = D.sc.scenes.map(s => s.key);
  const totE = allKeys.reduce((a, k) => a + scenePages(k), 0);
  const doneAll = allKeys.filter(sceneDone), eAll = doneAll.reduce((a, k) => a + scenePages(k), 0);
  const planned = upTo.flatMap(x => x.keys), ePlanned = planned.reduce((a, k) => a + scenePages(k), 0);
  const pct = v => totE ? Math.round(v / totE * 100) + ' %' : '';
  y = pdfKV(doc, y, 'Avance del rodaje', [
    ['Jornadas', `${n + 1} de ${days.length}`],
    ['Escenas completas', `${doneAll.length} de ${allKeys.length}`],
    ['Páginas completas', `${fmtEighths(eAll)} de ${fmtEighths(totE)} (${pct(eAll)})`],
    ['Según el plan, a esta altura', `${fmtEighths(ePlanned)} págs. (${pct(ePlanned)})${eAll < ePlanned ? ' · atraso de ' + fmtEighths(ePlanned - eAll) : eAll > ePlanned ? ' · adelanto de ' + fmtEighths(eAll - ePlanned) : ''}`],
  ], 36, W - 72) + 12;
  // incidencias y notas
  for (const [t, v] of [['Incidencias', dm.inc], ['Notas de la jornada', dm.notes]]) {
    if (!v) continue;
    if (y > doc.internal.pageSize.getHeight() - 90) { doc.addPage(); y = 50; }
    y = pdfSec(doc, y, t, { need: 50 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(PF.body); doc.setTextColor(...INK);
    const lt = doc.splitTextToSize(pdfSafe(v), W - 72); doc.text(lt, 36, y + 9); y += lt.length * PF.body * doc.getLineHeightFactor() + PF.gap;
  }
  // firmas
  if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = 60; }
  y += 34;
  const sig = [['Script / continuidad', P.sup.supervisor || ''], ['Asistencia de dirección', ''], ['Jefatura de producción', '']];
  sig.forEach(([r, name], i) => {
    const x = 36 + i * ((W - 72) / 3), w = (W - 72) / 3 - 24;
    doc.setDrawColor(...PT.deep); doc.setLineWidth(.6); doc.line(x, y, x + w, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(r, x, y + 11);
    if (name) { doc.setTextColor(...INK); doc.text(pdfSafe(name), x, y - 4); }
  });
  pageNumbers(doc, 'Parte diario · ' + supDayLabel(n, dates));
  return { doc, name: fileSafe(P.meta.title) + `_parte_diario_jornada_${n + 1}.pdf` };
}

/* ---------- reportes de cámara y de sonido ---------- */
function supTakeRows(f) {
  const keys = supScenes(), out = [];
  for (const k of keys) for (const sh of D.shotsBy[k] || []) (P.sup.takes[sh.id] || []).forEach(t => out.push({ k, sh, t, g: t[f] || '' }));
  return out;
}
function pdfTakeReport(f) {
  const cam = f === 'r';
  const doc = newDoc();
  const { days } = scheduleDays(P, D.sc);
  const dates = shootDates(P, days.length);
  const scope = UI.supDay === -1 ? 'Todas las escenas' : UI.supDay === -2 ? 'Sin programar' : supDayLabel(UI.supDay, dates);
  let y = docHeader(doc, cam ? 'Reporte de cámara' : 'Reporte de sonido', scope);
  const rows = supTakeRows(f);
  const mos = t => /^mos$/i.test(String(t.s || '').trim());
  const groups = new Map();
  for (const r of rows) {
    const g = !cam && mos(r.t) ? '\u0000MOS' : r.g || '\u0001';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  const ST = { ng: 'NG', ok: 'OK', bn: 'BUENA' };
  const names = g => g === '\u0000MOS' ? 'Sin sonido (MOS)' : g === '\u0001' ? (cam ? 'Sin tarjeta anotada' : 'Sin rollo de sonido anotado') : (cam ? 'Tarjeta ' : 'Rollo ') + g;
  const order = [...groups.keys()].sort((a, b) => (a[0] < ' ') - (b[0] < ' ') || 0);
  // dentro de cada tarjeta o rollo, en el orden en que se grabaron (por hora; sin hora, en el orden del guion)
  const hm = t => { const m = hmToMin(normHM(t.t || '')); return m == null ? 1e9 : m; };
  for (const L of groups.values()) L.sort((a, b) => hm(a.t) - hm(b.t));
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK);
  const sumTxt = `${rows.length} ${rows.length === 1 ? 'toma' : 'tomas'} · ${rows.filter(r => r.t.st === 'bn').length} buenas · ${rows.filter(r => r.t.st === 'ng').length} NG · ${((c) => `${c} ${cam ? (c === 1 ? 'tarjeta' : 'tarjetas') : (c === 1 ? 'rollo' : 'rollos')}`)(order.filter(g => g[0] >= ' ').length)}${P.sup.supervisor ? ' · Script: ' + P.sup.supervisor : ''}`;
  doc.text(pdfSafe(sumTxt), 36, y + 4); y += 14;
  if (!rows.length) { doc.setTextColor(...MUTED); doc.text('Todavía no hay tomas anotadas en la hoja de script.', 36, y + 10); }
  const body = [];
  for (const g of order) {
    const L = groups.get(g);
    body.push([pdfRich([{ segs: [{ t: names(g), st: 'bold' }, { t: `   ${L.length} ${L.length === 1 ? 'toma' : 'tomas'}  ·  ${L.filter(r => r.t.st === 'bn').length} buenas`, col: MUTED }] }], { colSpan: 8, fillColor: PDF_GROUP })]);
    for (const { k, sh, t } of L) body.push([k, D.code[sh.id] || '', 'T' + t.n, t.t || '', t.d || '', cam ? (sh.lens ? sh.lens + 'mm' : '') : (t.r || ''), ST[t.st] || '', pdfSafe([t.note, (P.sup.obs || {})[sh.id] && t.st === 'bn' ? (P.sup.obs || {})[sh.id] : ''].filter(Boolean).join(' · '))]);
  }
  if (body.length) doc.autoTable({ ...TBL, startY: y + 4, head: [['Esc.', 'Plano', 'Toma', 'Hora', 'Dur.', cam ? 'Lente' : 'Tarjeta', 'Estado', 'Nota']], body,
    columnStyles: { 0: { cellWidth: 34, fontStyle: 'bold' }, 1: { cellWidth: 42 }, 2: { cellWidth: 34 }, 3: { cellWidth: 40 }, 4: { cellWidth: 36 }, 5: { cellWidth: 50 }, 6: { cellWidth: 44 } },
    didParseCell: c => { if (c.section === 'body' && c.column.index === 6) { if (c.cell.raw === 'BUENA') { c.cell.styles.textColor = OKC; c.cell.styles.fontStyle = 'bold'; } else if (c.cell.raw === 'NG') c.cell.styles.textColor = [176, 52, 64]; } } });
  pageNumbers(doc, (cam ? 'Reporte de cámara · ' : 'Reporte de sonido · ') + scope);
  const tag = UI.supDay >= 0 ? `_jornada_${UI.supDay + 1}` : '';
  return { doc, name: fileSafe(P.meta.title) + (cam ? '_reporte_de_camara' : '_reporte_de_sonido') + tag + '.pdf' };
}
function pdfCamRep() { return pdfTakeReport('r'); }
function pdfSndRep() { return pdfTakeReport('s'); }
