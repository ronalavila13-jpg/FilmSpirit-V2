/* ============================================================
   PLAN DE RODAJE · días por actor (DOOD, «day out of days»)
   Vista del plan «Por actor»: cada personaje del reparto en una fila y cada jornada en una columna.
   I inicio (su primera jornada) · T trabaja · E en espera (entre su primera y su última jornada, sin
   escenas: suele pagarse igual) · F fin (su última jornada) · IF trabaja un solo día.
   Totales por actor: jornadas de trabajo, de espera y el total de su contrato (de la primera a la última).
   Sale del plan y del desglose (quién está en cada escena): no se escribe nada aparte. PDF y Excel.
   ============================================================ */
const DOOD_CODES = typeof EN !== 'undefined' && EN   // (en inglés, los códigos de Hollywood: SW, W, H, WF, SWF; ver ddc)
  ? [['I', 'Start work', 'first shoot day'], ['T', 'Work', ''], ['E', 'Hold', 'between first and last shoot day, no scenes'], ['F', 'Work finish', 'last shoot day'], ['IF', 'Start-work-finish', 'works a single day']]
  : [['I', 'Inicio', 'su primera jornada'], ['T', 'Trabaja', ''], ['E', 'En espera', 'entre su primera y su última jornada, sin escenas'], ['F', 'Fin', 'su última jornada'], ['IF', 'Inicio y fin', 'trabaja un solo día']];
function doodData() {
  const { days } = scheduleDays(P, D.sc);
  const dates = shootDates(P, days.length);
  const cols = days.map((d, n) => ({ n, id: d.id, date: dates[n] || null, keys: d.keys, cast: dayInfo(d.keys).cast, done: !!dayDone(d) }));
  const ids = Object.entries(D.castNum).sort((a, b) => a[1] - b[1]).map(([id]) => id).filter(id => P.elements[id]);
  const rows = ids.map(id => {
    const work = cols.map(c => c.cast.has(id));
    const first = work.indexOf(true), last = work.lastIndexOf(true);
    const codes = work.map((w, j) => first < 0 || j < first || j > last ? '' : w ? (first === last ? 'IF' : j === first ? 'I' : j === last ? 'F' : 'T') : 'E');
    const scenes = cols.map((c, j) => work[j] ? c.keys.filter(k => { const s = sceneOfKey(k); return s && D.sem[s.idx].has(id); }) : []);
    const nScenes = D.sc.scenes.filter(s => D.sem[s.idx].has(id)).length;
    return {
      id, n: D.castNum[id], name: titleCase(P.elements[id].name), codes, scenes, nScenes,
      work: work.filter(Boolean).length, hold: codes.filter(c => c === 'E').length, total: first < 0 ? 0 : last - first + 1,
      first: first < 0 ? null : cols[first], last: last < 0 ? null : cols[last],
      unplanned: nScenes > scenes.reduce((a, l) => a + l.length, 0),
    };
  });
  return { cols, rows };
}
/* los códigos de los días por actor, en inglés los de Hollywood: SW, W, H, WF, SWF */
const ddc = c => typeof EN !== 'undefined' && EN ? ({ I: 'SW', T: 'W', E: 'H', F: 'WF', IF: 'SWF' }[c] || c) : c;
const doodDay = d => d ? d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace('.', '') : '';
function doodHTML() {
  const { cols, rows } = doodData();
  if (!rows.length) return '<div class="card"><p class="hint" style="margin:0">Marca a los personajes en el guion (o en el desglose) para ver qué jornadas trabaja cada uno.</p></div>';
  if (!cols.length) return '<div class="card"><p class="hint" style="margin:0">Arma las jornadas del plan para ver qué días trabaja cada actor.</p></div>';
  const head = cols.map(c => `<th class="dd-d${ea(c.keys.length ? '' : ' off')}${ea(c.done ? ' done' : '')}" scope="col"><button data-act="pl-goday" data-n="${ea(c.n)}" title="${ea(`Jornada ${c.n + 1}${c.date ? ' · ' + fmtDate(c.date) : ''}${c.keys.length ? '' : ' · sin escenas'} · ver en el plan`)}"><b class="tnum">${c.n + 1}</b><span>${esc(c.date ? c.date.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '').slice(0, 2) : '')}</span><span class="tnum">${esc(c.date ? String(c.date.getDate()) : '')}</span></button></th>`).join('');
  const body = rows.map(r => `<tr><th scope="row" class="dd-n"><button class="elname" data-act="ficha" data-id="${ea(r.id)}" title="Ficha del personaje"><b class="tnum">${r.n}</b> ${esc(r.name)}</button>${r.unplanned ? '<span class="dd-warn" title="Tiene escenas sin programar">●</span>' : ''}</th>
    ${r.codes.map((c, j) => `<td class="dd-c${ea(c ? ' c-' + c.toLowerCase() : '')}"${c && c !== 'E' ? ` title="${ea(`Jornada ${j + 1} · ${r.scenes[j].length === 1 ? 'escena' : 'escenas'} ${r.scenes[j].join(', ')}`)}"` : c === 'E' ? ` title="${ea(`Jornada ${j + 1} · en espera`)}"` : ''}>${ddc(c)}</td>`).join('')}
    <td class="dd-gap"></td><td class="dd-t tnum">${r.work}</td><td class="dd-t tnum">${r.hold || ''}</td><td class="dd-t tnum"><b>${r.total || ''}</b></td><td class="dd-t">${esc(r.first ? (r.first.date ? doodDay(r.first.date) : (EN ? 'D' : 'J') + (r.first.n + 1)) : '—')}</td><td class="dd-t">${esc(r.last ? (r.last.date ? doodDay(r.last.date) : (EN ? 'D' : 'J') + (r.last.n + 1)) : '—')}</td></tr>`).join('');
  const per = cols.map(c => `<td class="dd-c tnum">${c.cast.size || ''}</td>`).join('');
  const tw = rows.reduce((a, r) => a + r.work, 0), th = rows.reduce((a, r) => a + r.hold, 0);
  // a todo el ancho: las jornadas se reparten el espacio (hasta un máximo) y los totales quedan al final, a la derecha
  const colg = `<colgroup><col class="cg-n">${cols.map(() => '<col class="cg-d">').join('')}<col class="cg-gap">${'<col class="cg-t">'.repeat(3)}<col class="cg-t2"><col class="cg-t2"></colgroup>`;
  return `<div class="card dd-card"><div class="dd-scroll"><table class="dood" style="--dd-n:${ea(cols.length)}">${colg}
      <thead><tr><th class="dd-n" scope="col">Reparto</th>${head}<th class="dd-gap" aria-hidden="true"></th><th class="dd-t" scope="col" title="Jornadas de trabajo">Trab.</th><th class="dd-t" scope="col" title="Jornadas en espera">Esp.</th><th class="dd-t" scope="col" title="De su primera a su última jornada">Total</th><th class="dd-t" scope="col">Inicio</th><th class="dd-t" scope="col">Fin</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><th scope="row" class="dd-n">Actores por jornada</th>${per}<td class="dd-gap"></td><td class="dd-t tnum">${tw}</td><td class="dd-t tnum">${th || ''}</td><td colspan="3"></td></tr></tfoot></table></div>
    <div class="dd-key">${DOOD_CODES.map(([c, n, h]) => `<span title="${ea(h)}"><i class="dd-c c-${c.toLowerCase()}">${ddc(c)}</i>${n}</span>`).join('')}${rows.some(r => r.unplanned) ? '<span><i class="dd-warn">●</i>Con escenas sin programar</span>' : ''}</div></div>`;
}

/* ---------- PDF y Excel ---------- */
function pdfDood() {
  const doc = newDoc('landscape');
  const { cols, rows } = doodData();
  const W = doc.internal.pageSize.getWidth();
  const dates = cols.filter(c => c.date);
  let y = docHeader(doc, 'DOOD · Días por actor', `${rows.length} ${rows.length === 1 ? 'personaje' : 'personajes'} · ${cols.length} ${cols.length === 1 ? 'jornada' : 'jornadas'}${dates.length ? ' · ' + fmtDate(dates[0].date) + ' a ' + fmtDate(dates[dates.length - 1].date) : ''}`);
  const IN = rgb(tabTone().tint), IT = rgb(tabTone().deep);   // inicio y fin, en un tono de la pestaña (del tema)
  const FILL = { I: IN, T: PDF_BLACK, E: PT.fill, F: IN, IF: IN };   // como en la app: trabaja en negro, inicio y fin en azul
  const TXT = { I: IT, T: [255, 255, 255], E: [110, 116, 124], F: IT, IF: IT };
  const nameW = 130, totW = 5 * 34, room = W - 72 - nameW - totW;
  // (lote AH) en cuadro, tipo Excel: la rejilla en negro, bien visible, también en los títulos (antes gris fina y blanca)
  const LINE = { lineColor: PDF_BLACK, lineWidth: .7 };
  // columnas de jornada: anchas si son pocas; con muchas, 17 pt y se parten en varias páginas
  const dayW = Math.max(17, Math.min(30, Math.floor(room / Math.max(1, cols.length))));
  const per = Math.max(8, Math.floor(room / dayW));
  for (let a = 0; a < Math.max(1, cols.length); a += per) {
    const part = cols.slice(a, a + per), last = a + per >= cols.length;
    if (a > 0) { doc.addPage(); y = docHeader(doc, 'DOOD · Días por actor', `Jornadas ${a + 1} a ${a + part.length}`); }
    const head = [[{ content: 'Reparto', styles: { halign: 'left' } }, ...part.map(c => `${c.n + 1}${c.date ? '\n' + (dayW >= 26 ? (EN ? (c.date.getMonth() + 1) + '/' + c.date.getDate() : c.date.getDate() + '/' + (c.date.getMonth() + 1)) : c.date.getDate()) : ''}`), ...(last ? ['Trab.', 'Esp.', 'Total', 'Inicio', 'Fin'] : [])]];
    const body = rows.map(r => [pdfSafe(`${r.n}. ${r.name}`), ...part.map(c => ddc(r.codes[c.n])), ...(last ? [String(r.work), r.hold ? String(r.hold) : '', r.total ? String(r.total) : '', pdfSafe(r.first ? (r.first.date ? doodDay(r.first.date) : (EN ? 'D' : 'J') + (r.first.n + 1)) : ''), pdfSafe(r.last ? (r.last.date ? doodDay(r.last.date) : (EN ? 'D' : 'J') + (r.last.n + 1)) : '')] : [])]);
    body.push([{ content: 'Actores por jornada', styles: { fontStyle: 'bold' } }, ...part.map(c => c.cast.size ? String(c.cast.size) : ''), ...(last ? [String(rows.reduce((s, r) => s + r.work, 0)), '', '', '', ''] : [])]);
    const cs = { 0: { cellWidth: nameW, halign: 'left' } };
    part.forEach((_, j) => { cs[j + 1] = { cellWidth: dayW, halign: 'center' }; });
    if (last) for (let k = 0; k < 5; k++) cs[part.length + 1 + k] = { cellWidth: 34, halign: 'center' };
    doc.autoTable({ ...TBL, startY: y, head, body, columnStyles: cs, styles: { ...TBL.styles, fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 3, right: 3 }, halign: 'center', ...LINE, valign: 'middle' }, headStyles: { ...TBL.headStyles, fontSize: PF.head, halign: 'center', ...LINE, cellPadding: { top: 5, bottom: 5, left: 1.5, right: 1.5 } },   // (lote K) la rejilla es el formato: queda, con más letra y aire
      didParseCell: d => { if (d.section !== 'body' || d.column.index < 1 || d.column.index > part.length) return; const c = d.cell.raw; if (FILL[c]) { d.cell.styles.fillColor = FILL[c]; d.cell.styles.textColor = TXT[c]; d.cell.styles.fontStyle = 'bold'; } } });
    y = doc.lastAutoTable.finalY + 12;
  }
  // (lote AH) los códigos, en su cuadro
  doc.autoTable({ ...TBL, startY: y, margin: { left: 36, right: 36, top: 38, bottom: 44 }, rowPageBreak: 'avoid', styles: { ...TBL.styles, ...LINE, fontSize: PF.small, textColor: MUTED, cellPadding: { top: 5, bottom: 5, left: 8, right: 8 } },
    body: [[trDone(pdfSafe(DOOD_CODES.map(([c, n, h]) => `${ddc(c)} ${n.toLowerCase()}${h ? ' (' + h + ')' : ''}`).join('   ·   ')))]] });
  pageNumbers(doc, 'DOOD');
  return { doc, name: fileSafe(P.meta.title) + '_dias_por_actor.pdf' };
}
function doodSheet() {
  const { cols, rows } = doodData();
  const T = xlTab(), hs = { bold: true, fill: T.bar, color: T.ink, h: 'center', line: T.line };
  const FILL = { I: '#D9E8F7', T: '#222222', E: T.fill, F: '#D9E8F7', IF: '#D9E8F7' }, TXT = { I: '#184A82', T: '#FFFFFF', E: '#646464', F: '#184A82', IF: '#184A82' };
  const NC = cols.length + 6;
  const out = [
    { cells: [{ v: `${P.meta.title} · DOOD`, cs: NC, s: { bold: true, size: 16, font: 'title', fill: T.bar, color: T.ink, border: false, wrap: false } }], h: 30 },
    { cells: [{ v: trDone(DOOD_CODES.map(([c, n]) => `${ddc(c)} ${n.toLowerCase()}`).join('  ·  ')), cs: NC, s: { color: T.ink, fill: T.bar, border: false, wrap: false } }], h: 18 },
    { cells: [{ v: '', cs: NC, s: { fill: T.c, border: false } }], h: 4 },
    { cells: [{ v: 'Reparto', s: { ...hs, h: 'left' } }, ...cols.map(c => ({ v: `${EN ? 'D' : 'J'}${c.n + 1}${c.date ? '\n' + (EN ? (c.date.getMonth() + 1) + '/' + c.date.getDate() : c.date.getDate() + '/' + (c.date.getMonth() + 1))  : ''}`, s: hs })), ...['Trab.', 'Esp.', 'Total', 'Inicio', 'Fin'].map(v => ({ v, s: hs }))], h: 30 },
    ...rows.map(r => ({ cells: [{ v: `${r.n}. ${r.name}`, s: { bold: true } }, ...r.codes.map(c => ({ v: ddc(c), s: { h: 'center', bold: !!c, ...(FILL[c] ? { fill: FILL[c], color: TXT[c] } : {}) } })),
      { v: r.work, s: { h: 'center' } }, { v: r.hold || '', s: { h: 'center' } }, { v: r.total || '', s: { h: 'center', bold: true } },
      { v: r.first ? (r.first.date ? isoDay(r.first.date) : (EN ? 'D' : 'J') + (r.first.n + 1)) : '', s: { h: 'center' } }, { v: r.last ? (r.last.date ? isoDay(r.last.date) : (EN ? 'D' : 'J') + (r.last.n + 1)) : '', s: { h: 'center' } }] })),
    { cells: [{ v: 'Actores por jornada', s: { bold: true, fill: T.fill2 } }, ...cols.map(c => ({ v: c.cast.size || '', s: { h: 'center', fill: T.fill2 } })), { v: rows.reduce((s, r) => s + r.work, 0), s: { h: 'center', fill: T.fill2 } }, ...[0, 1, 2, 3].map(() => ({ v: '', s: { fill: T.fill2 } }))] },
  ];
  return { name: 'DOOD', cols: [26, ...cols.map(() => 5.5), 7, 7, 7, 11, 11], rows: out, freeze: 4, landscape: true, printRows: '4:4' };
}
