/* ============================================================
   CALENDARIO · vista «Meses» (la de entrada): hojas de mes como las de un calendario de pared
   · Cada mes: su nombre en una franja de color con el año al lado, los días de la semana cada uno en
     un color (del tema), los días con su número en la esquina (los del mes de al lado, más claros) y
     una fila de notas abajo (P.calendar.notes, por mes).
   · Las tareas y las jornadas de rodaje son barras de color que cruzan los días y siguen en la
     semana de abajo. Se ven 1, 2, 3 o 4 meses a la vez (en pantalla ancha 2×2 o en fila; en el
     teléfono, uno debajo del otro) y se va a cualquier fecha con ‹ › o eligiendo mes y año.
   · Elegir una tarea que dura varios meses abre la vista hasta verla entera (hasta 4 meses; si dura
     más, desde su comienzo).
   · Con el mouse: arrastrar una barra la mueve; sus bordes cambian el inicio y el fin; arrastrar
     sobre los días crea una tarea; doble clic en una barra la abre y en un día vacío crea una de un
     día. En el teléfono, mantener el dedo levanta la barra (y soltarla sin mover abre su color).
   ============================================================ */
const CM_WD = EN ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
/* los colores del tema para los días de la semana y la franja de cada mes */
const ymOf = s => String(s).slice(0, 7);
const ymAdd = (ym, n) => { const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const ymDiff = (a, b) => { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
const ymName = (ym, opt = { month: 'long' }) => capFirst(dOf(ym + '-15').toLocaleDateString('es-PE', opt));
/* cuántos meses a la vez (preferencia de cada computadora; en el teléfono, 1 de entrada) */
const cmN = () => UI.cmN || (UI.cmN = clamp(+ls.get('cmN', 0) || (innerWidth >= 1100 ? 2 : 1), 1, 4));
/* el primer mes que se ve: el de hoy o, si la producción está lejos de hoy, el del rodaje (o de la primera tarea) */
function cmStart() {
  if (UI.cmStart) return UI.cmStart;
  const sh = calShoot(), T = P.calendar.tasks, today = todayIso();
  const all = [...sh.map(x => x.date), ...T.flatMap(t => [t.start, t.end])].filter(Boolean).sort();
  let s = ymOf(today);
  if (all.length && (today < addD(all[0], -45) || today > addD(all[all.length - 1], 45))) s = ymOf(sh.length ? sh[0].date : all[0]);
  return (UI.cmStart = s);
}
/* lo que va en las hojas: las jornadas de rodaje seguidas (de la misma etapa) en una barra, y cada tramo de cada tarea */
function cmItems(sh) {
  const out = [];
  let run = null;
  for (const x of sh) {
    if (run && diffD(run.end, x.date) === 1 && run.stage === x.stage) { run.end = x.date; run.n1 = x.n; run.k += x.d.keys.length; }
    else { run = { sh: true, start: x.date, end: x.date, n0: x.n, n1: x.n, stage: x.stage, k: x.d.keys.length }; out.push(run); }
  }
  for (const t of P.calendar.tasks) segsOf(t).forEach((x, si) => { if (x.start) out.push({ t, si, start: x.start, end: x.end || x.start }); });
  // el rodaje arriba; después por inicio y, a igual inicio, las más largas primero
  return out.sort((a, b) => (b.sh ? 1 : 0) - (a.sh ? 1 : 0) || a.start.localeCompare(b.start) || b.end.localeCompare(a.end));
}
const cmLabel = it => { const j = EN ? 'D' : 'J'; return it.sh ? trDone(`${EN ? 'Shoot' : 'Rodaje'} · ${it.n0 === it.n1 ? j + (it.n0 + 1) : `${j}${it.n0 + 1}–${j}${it.n1 + 1}`}`) : (it.t.title || tr('Tarea')); };
const cmColor = it => it.sh ? lgCol('cal', 'rod') : taskColor(it.t);
const cmColKey = it => it.sh ? 'cal|rod' : `cal|${it.t.hl && lgHl('cal').some(h => h.id === it.t.hl) ? 'h:' + it.t.hl : (LG.cal[it.t.ph] ? it.t.ph : 'pre')}`;
/* una hoja de mes */
function cmMonthHTML(ym, items, sh, ed, cap) {
  const first = dOf(ym + '-01'), wd0 = (first.getDay() + 6) % 7, today = todayIso();
  const a = addD(ym + '-01', -wd0), days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((wd0 + days) / 7), shoot = new Set(sh.map(x => x.date));
  const mi = +ym.slice(5) - 1, band = tabTone();
  const note = ((P.calendar.notes || {})[ym]) || '';
  let rows = '';
  for (let w = 0; w < weeks; w++) {
    const w0 = addD(a, w * 7), w6 = addD(w0, 6);
    // barras de esta semana, cada una en el primer carril libre
    const lanes = [], bars = [], hidden = new Array(7).fill(0);
    for (const it of items) {
      if (it.end < w0 || it.start > w6) continue;
      const cs = it.start < w0 ? w0 : it.start, ce = it.end > w6 ? w6 : it.end;
      const c0 = diffD(w0, cs), c1 = diffD(w0, ce);
      let L = lanes.findIndex(z => z < c0);
      if (L < 0) { L = lanes.length; lanes.push(-1); }
      lanes[L] = c1;
      if (L >= cap) { for (let c = c0; c <= c1; c++) hidden[c]++; continue; }
      bars.push({ it, c0, c1, L, cl: it.start < w0, cr: it.end > w6 });
    }
    const nL = Math.min(cap, lanes.length);
    const cells = Array.from({ length: 7 }, (_, i) => {
      const d = addD(w0, i), out = ymOf(d) !== ym, we = i >= 5;
      return `<div class="cm-d${ea(out ? ' out' : '')}${ea(we ? ' we' : '')}${ea(shoot.has(d) ? ' sh' : '')}${ea(d === today ? ' td' : '')}" data-d="${ea(d)}" style="grid-column:${i + 1}">
        <button class="cm-n" data-act="cal-day" data-d="${ea(d)}" title="${esc(fmtD(d))} · ver el día" aria-label="${esc(fmtD(d))}: ver lo de este día">${dOf(d).getDate()}</button>${hidden[i] ? `<button class="cm-more" data-act="cal-day" data-d="${ea(d)}" title="Ver todo lo de este día">+${hidden[i]}</button>` : ''}</div>`;
    }).join('');
    const barsH = bars.map(({ it, c0, c1, L, cl, cr }) => {
      const id = it.sh ? '' : it.t.id, done = !it.sh && it.t.done, ck = !it.sh ? checkOf(it.t) : { n: 0 };
      const tip = it.sh ? `${cmLabel(it)} · ${fmtSeg(it)} · ${it.k} esc.` : `${it.t.title || 'Tarea'} · ${fmtSeg(it)}${it.t.who ? ' · ' + it.t.who : ''}`;
      return `<div class="cm-bar${ea(it.sh ? ' sh' : '')}${ea(done ? ' done' : '')}${ea(cl ? ' cl' : '')}${ea(cr ? ' cr' : '')}${ea(lgDark(cmColor(it)))}" ${id ? `data-id="${ea(id)}" data-s="${ea(it.si)}" data-note="task:${ea(id)}"` : 'data-act="cal-plan"'} data-cal-col="${ea(cmColKey(it))}" data-ph="${ea(it.sh ? 'rod' : it.t.ph || 'pre')}"
        style="grid-column:${c0 + 1}/${c1 + 2};grid-row:${L + 2};--c:${ea(cmColor(it))}" title="${esc(tip)}"><span class="bt">${done ? KB_I.ok : ''}${cl ? '‹ ' : ''}${esc(cmLabel(it))}</span>${ck.n && c1 - c0 >= 1 ? `<span class="bk">${ck.ok}/${ck.n}</span>` : ''}${id ? `<button class="cal-bx" data-act="cal-edit" data-id="${ea(id)}" aria-label="Abrir «${esc(it.t.title || 'Tarea')}»" title="Abrir la tarea">${CAL_OPEN}</button>` : ''}${ed && id ? `${cl ? '' : '<i class="h l"></i>'}${cr ? '' : '<i class="h r"></i>'}` : ''}</div>`;
    }).join('');
    rows += `<div class="cm-wk" data-w0="${ea(w0)}" style="--ln:${ea(Math.max(nL, 1))}">${cells}${barsH}</div>`;
  }
  return `<section class="cm" data-m="${ea(ym)}">
    <header class="cm-h" style="--c:${ea(band.sel)};--ci:${ea(band.selInk)}"><b>${esc(ymName(ym))}</b><span>${esc(ym.slice(0, 4))}</span></header>
    <div class="cm-wds">${CM_WD.map(n => { const T = tabTone(); return `<span style="--c:${ea(T.tint2)};--d:${ea(T.deep)}">${n}</span>`; }).join('')}</div>
    <div class="cm-g">${rows}</div>
    <label class="cm-notes${note ? ' has' : ''}">${ed && !note ? `<span class="hd-pl" aria-hidden="true">${ICO.plus}</span>` : ''}<span>Nota del mes</span>${ed ? `<textarea data-bind="cm-note" data-m="${ea(ym)}" rows="2" maxlength="2000" placeholder="Lo que hay que recordar este mes">${esc(note)}</textarea>` : `<span class="cm-nt">${esc(note) || '<span class="hint">Sin notas.</span>'}</span>`}</label>
  </section>`;
}
/* las hojas que se ven (de cmStart, cmN meses) */
function calMonthsHTML(sh, ed) {
  const n = cmN(), s = cmStart(), items = cmItems(sh), cap = n === 1 ? 7 : n === 2 ? 5 : 4;
  return `<div class="scroller cm-sc" data-keep="calmes" id="cmSc"><div class="cms" data-n="${ea(n)}">${Array.from({ length: n }, (_, i) => cmMonthHTML(ymAdd(s, i), items, sh, ed, cap)).join('')}</div></div>`;
}
/* la barra de la vista: ‹ mes y año › · Hoy · cuántos meses */
/* (lote I) el título de la vista Meses: los meses que se ven, con su menú (ir a un mes y un año); ‹ Hoy › junto al
   título, como en el Calendario de Apple; y en la barra, cuántos meses a la vez */
function cmLab() {
  const n = cmN(), s = cmStart(), e = ymAdd(s, n - 1);
  return n === 1 ? `${ymName(s)} ${s.slice(0, 4)}` : s.slice(0, 4) === e.slice(0, 4) ? `${ymName(s)} – ${ymName(e)} ${e.slice(0, 4)}` : `${ymName(s, { month: 'short' }).replace('.', '')} ${s.slice(0, 4)} – ${ymName(e, { month: 'short' }).replace('.', '')} ${e.slice(0, 4)}`;
}
const cmNavHTML = () => `<span class="hd-navg" role="group" aria-label="Meses"><button type="button" data-act="cm-step" data-d="-1" aria-label="Mes anterior" title="Mes anterior">${ICO.prev}</button><button type="button" class="t" data-act="cm-today">Hoy</button><button type="button" data-act="cm-step" data-d="1" aria-label="Mes siguiente" title="Mes siguiente">${ICO.next}</button></span>`;
function cmNsHTML() {
  const n = cmN();
  return `<span class="cm-nsw hide-sm">${hdSeg([1, 2, 3, 4].map(k => ({ label: String(k), attrs: `data-act="cm-n" data-v="${k}" title="${k === 1 ? 'Un mes' : k + ' meses a la vez'}"`, on: n === k })), 'Meses a la vez')}<span class="hint">${n === 1 ? 'mes' : 'meses'}</span></span>`;
}
/* ir a un mes y un año (sin límite): el año con ‹ › o escrito, y los doce meses */
function cmPicker(anchor) {
  let y = +cmStart().slice(0, 4);
  const html = () => `<div class="cm-pk"><div class="cm-pky"><button type="button" class="btn ghost" data-y="-1" aria-label="Año anterior">‹</button><input type="number" class="cm-yin" value="${y}" aria-label="Año" min="1900" max="2999"><button type="button" class="btn ghost" data-y="1" aria-label="Año siguiente">›</button></div>
    <div class="cm-pkm">${Array.from({ length: 12 }, (_, i) => { const ym = y + '-' + String(i + 1).padStart(2, '0'); return `<button type="button" data-ym="${ym}" aria-pressed="${ea(ym === cmStart())}">${esc(ymName(ym, { month: 'short' }).replace('.', ''))}</button>`; }).join('')}</div></div>`;
  popover(anchor, html(), p => {
    p.addEventListener('click', e => {
      const b = e.target.closest('[data-y]'); if (b) { y += +b.dataset.y; p.innerHTML = html(); return; }
      const m = e.target.closest('[data-ym]'); if (m) { closePop(); UI.cmStart = m.dataset.ym; render(); }
    });
    p.addEventListener('change', e => { const i = e.target.closest('.cm-yin'); if (i && +i.value >= 1900 && +i.value <= 2999) { y = +i.value; p.innerHTML = html(); } });
    p.addEventListener('keydown', e => { const i = e.target.closest('.cm-yin'); if (i && e.key === 'Enter') { e.preventDefault(); i.dispatchEvent(new Event('change', { bubbles: true })); } });
  });
}
/* elegir una tarea: si dura varios meses, la vista se abre hasta verla entera (hasta 4; si dura más, desde su comienzo) */
function cmFit(t) {
  const a = ymOf(t.start), z = ymOf(t.end), need = ymDiff(a, z) + 1, s = cmStart(), n = cmN();
  if (ymDiff(s, a) >= 0 && ymDiff(z, ymAdd(s, n - 1)) >= 0) return false;   // ya se ve entera
  if (need > 4) { UI.cmN = 4; UI.cmStart = a; toast(`«${t.title || 'Tarea'}» dura ${need} meses: se ven los 4 primeros.`, 3200); return true; }
  UI.cmN = Math.max(n, need);
  if (ymDiff(s, a) < 0 || ymDiff(z, ymAdd(s, UI.cmN - 1)) < 0) UI.cmStart = ymDiff(z, ymAdd(a, UI.cmN - 1)) >= 0 ? a : ymAdd(z, -(UI.cmN - 1));
  return true;
}
/* la fase de un día nuevo: rodaje en un día de rodaje; antes, preproducción; después, posproducción */
function cmPhaseOf(d) {
  const sh = calShoot();
  if (sh.some(x => x.date === d)) return 'rod';
  if (sh.length && d > sh[sh.length - 1].date) return 'post';
  return 'pre';
}
function bindMonths() {
  const sc = $('#cmSc'), root = sc && $('.cms', sc); if (!root) return;
  doubleTap(root, CAL_DBL, CAL_DBL_HINT);
  const SELB = UI.calSel || (UI.calSel = new Set());
  const paintSel = () => $$('.cm-bar[data-id]', root).forEach(b => b.classList.toggle('sel', [...SELB].some(k => k.split('|')[0] === b.dataset.id)));
  paintSel();
  const dayAt = (x, y) => { const el = document.elementFromPoint(x, y), c = el && el.closest('.cm-d[data-d]'); return c && root.contains(c) ? c.dataset.d : null; };
  const hit = (a, z) => { const lo = a < z ? a : z, hi = a < z ? z : a; $$('.cm-d[data-d]', root).forEach(c => c.classList.toggle('hit', !!a && c.dataset.d >= lo && c.dataset.d <= hi)); };
  // un clic en una barra la elige (y abre la vista si dura varios meses); doble clic la abre
  root.addEventListener('click', e => {
    const b = e.target.closest('.cm-bar[data-id]'); if (!b || e.target.closest('.cal-bx')) return;
    const k = b.dataset.id + '|' + b.dataset.s;
    if (e.shiftKey || e.ctrlKey || e.metaKey) { SELB.has(k) ? SELB.delete(k) : SELB.add(k); paintSel(); return; }
    if (secondClick(k)) return;
    const only = SELB.size === 1 && SELB.has(k); SELB.clear(); if (!only) SELB.add(k);
    const t = P.calendar.tasks.find(x => x.id === b.dataset.id);
    if (!only && t && cmFit(t)) { render(); return; }
    paintSel();
  });
  onDoubleTap(root, '.cm-bar[data-id]', (b, e) => { if (e.target.closest('.cal-bx')) return; const t = P.calendar.tasks.find(x => x.id === b.dataset.id); if (t) calEdit(b, t); });
  deselectOn('cal', () => { if (SELB.size) { SELB.clear(); paintSel(); } }, '.cm-bar, .cm-notes');
  // doble clic en un día vacío: una tarea de ese día
  root.addEventListener('dblclick', e => {
    if (!calEditable() || e.target.closest('.cm-bar,button,textarea')) return;
    const c = e.target.closest('.cm-d[data-d]'); if (c) calNewTask(cmPhaseOf(c.dataset.d), c.dataset.d, c.dataset.d);
  });
  root.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !calEditable()) return;
    if (e.target.closest('.cal-bx, .cm-n, .cm-more, textarea, .cm-notes')) return;
    const b = e.target.closest('.cm-bar[data-id]');
    if (b) {
      if (e.target.classList.contains('h')) { e.preventDefault(); suppressClick(); return drag(e, b, false, e.target.classList.contains('l') ? 'l' : 'r'); }
      return pressGesture(e, { target: b, onLift: ev => drag(e, b, true, 'm', ev) });
    }
    const c = e.target.closest('.cm-d[data-d]'); if (!c) return;
    if (e.pointerType === 'touch') { pressGesture(e, { onLift: () => draw(e, c.dataset.d) }); return; }
    draw(e, c.dataset.d);
  });
  // arrastrar sobre los días: una tarea nueva de ese tramo
  function draw(e, d0) {
    let d1 = d0, moved = false;
    const mv = ev => { const d = dayAt(ev.clientX, ev.clientY); if (d && d !== d1) { d1 = d; moved = true; hit(d0, d1); } };
    const up = ev => {
      removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
      hit(null);
      if (!moved || ev.type !== 'pointerup') return;
      suppressClick();
      calNewTask(cmPhaseOf(d0), d0 < d1 ? d0 : d1, d0 < d1 ? d1 : d0);
    };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  }
  // mover una barra (y las elegidas con ella) o cambiar su inicio o su fin: el día bajo el dedo o el puntero manda
  function drag(e, b, lifted, mode, ev0) {
    const t = P.calendar.tasks.find(x => x.id === b.dataset.id); if (!t) return;
    const si = +b.dataset.s || 0, seg = segsOf(t)[si]; if (!seg) return;
    const g0 = dayAt(e.clientX, e.clientY) || seg.start, key = t.id + '|' + si;
    const group = mode === 'm' && SELB.has(key) && SELB.size > 1 ? [...SELB] : [key];
    let dd = 0, over = g0, touchHold = lifted && e.pointerType === 'touch', moved = false;
    document.body.classList.add('lifting', 'cm-dragging');
    $$(`.cm-bar[data-id="${CSS.escape(t.id)}"][data-s="${si}"]`, root).forEach(x => x.classList.add('drag'));
    const span = () => mode === 'm' ? [addD(seg.start, dd), addD(seg.end, dd)] : mode === 'l' ? [over < seg.end ? over : seg.end, seg.end] : [seg.start, over > seg.start ? over : seg.start];
    const paint = () => { const [a, z] = span(); hit(a, z); };
    paint();
    const mv = ev => {
      if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 6) moved = true;
      edgeScroll(sc, 0, ev.clientY, 'y');
      const d = dayAt(ev.clientX, ev.clientY); if (!d) return;
      over = d; dd = diffD(g0, d); paint();
    };
    const up = ev => {
      removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
      document.body.classList.remove('lifting', 'cm-dragging'); hit(null);
      $$('.cm-bar.drag', root).forEach(x => x.classList.remove('drag'));
      // el dedo sostenido y soltado sin mover: el color de la barra
      if (touchHold && !moved) { const x = lgCtxOf(b); if (x) lgCtxOpen(x, b); return; }
      if (ev.type !== 'pointerup') return;
      const [a, z] = span();
      if (mode === 'm' && !dd) return;
      if (mode !== 'm' && a === seg.start && z === seg.end) return;
      histNote(mode === 'm' ? 'Mover tarea' : 'Cambiar las fechas de la tarea');
      if (mode === 'm') {
        for (const k of group) {
          const [id, s2] = k.split('|'), tk = P.calendar.tasks.find(y => y.id === id); if (!tk) continue;
          const S = segsOf(tk).map(z2 => ({ ...z2 })), gg = S[+s2]; if (!gg) continue;
          gg.start = addD(gg.start, dd); gg.end = addD(gg.end, dd); tk.segs = S; syncSpan(tk);
        }
        toast(group.length > 1 ? `${group.length} barras movidas ${Math.abs(dd)} ${Math.abs(dd) === 1 ? 'día' : 'días'} ${dd > 0 ? 'después' : 'antes'}.` : `«${t.title || 'Tarea'}»: ${fmtSeg({ start: a, end: z })}.`, 2400);
      } else { const S = segsOf(t).map(z2 => ({ ...z2 })); S[si].start = a; S[si].end = z; t.segs = S; syncSpan(t); }
      changed('data'); render();
    };
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
    if (ev0) mv(ev0);
  }
}
Object.assign(ACT, {
  'cm-step': b => { UI.cmStart = ymAdd(cmStart(), +b.dataset.d); render(); },
  'cm-today': () => { UI.cmStart = ymOf(todayIso()); render(); },
  'cm-n': b => { UI.cmN = clamp(+b.dataset.v, 1, 4); ls.set('cmN', UI.cmN); render(); },
  'cm-pick': b => cmPicker(b),
});
Object.assign(BIND, {
  'cm-note': el => {
    const m = el.dataset.m, v = el.value.trim().slice(0, 2000), N = { ...(P.calendar.notes || {}) };
    if ((N[m] || '') === v) return;
    if (v) N[m] = v; else delete N[m];
    if (Object.keys(N).length) P.calendar.notes = N; else delete P.calendar.notes;
    changed('data');
  },
});
/* lo que viene de afuera: notas de mes válidas */
function cmNotesClean(K) {
  if (!K || K.notes === undefined) return;
  const o = K.notes && typeof K.notes === 'object' && !Array.isArray(K.notes) ? K.notes : {}, r = {};
  for (const [k, v] of Object.entries(o)) if (/^\d{4}-\d{2}$/.test(k) && typeof v === 'string' && v.trim()) r[k] = v.slice(0, 2000);
  if (Object.keys(r).length) K.notes = r; else delete K.notes;
}

/* ---------- PDF: una hoja por mes, como en la app ---------- */
function pdfCalMonths() {
  const doc = newDoc('landscape'), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 36;
  const sh = calShoot(), items = cmItems(sh);
  const all = items.flatMap(x => [x.start, x.end]).sort();
  // los meses: de lo primero a lo último (o el que se está mirando), hasta 24
  let a = all.length ? ymOf(all[0]) : cmStart(), z = all.length ? ymOf(all[all.length - 1]) : a;
  if (ymDiff(a, z) > 23) z = ymAdd(a, 23);
  const months = Array.from({ length: ymDiff(a, z) + 1 }, (_, i) => ymAdd(a, i));
  const cu = { hl: new Set() };
  for (const t of P.calendar.tasks) { if (t.hl && hlc(t, 'cal')) cu.hl.add(t.hl); else cu[LG.cal[t.ph] ? t.ph : 'pre'] = 1; }
  if (sh.length) cu.rod = 1;
  const shoot = new Set(sh.map(x => x.date));
  months.forEach((ym, pi) => {
    if (pi) doc.addPage();
    let y = docHeader(doc, 'Calendario de producción', `${ymName(ym)} ${ym.slice(0, 4)}`);
    y = pdfLegend(doc, y - 4, lgDocItems('calendar', cu).map(([nm, c]) => [nm, rgb(c)]));
    // la franja del mes con su año
    // (versión 2) la franja del mes en amarillo, esquinas de 3 pt, y la rejilla de los días con la línea fina de la app
    doc.setFillColor(...V2K.yellow); doc.roundedRect(M, y, W - 2 * M, 30, 3, 3, 'F');
    doc.setTextColor(...V2K.black); doc.setFont('title', 'bold'); doc.setFontSize(18); doc.text(pdfSafe(ymName(ym)), M + 12, y + 21);
    const mw = doc.getTextWidth(pdfSafe(ymName(ym))); doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.text(ym.slice(0, 4), M + 20 + mw, y + 21);
    y += 34;
    const cw = (W - 2 * M) / 7;
    CM_WD.forEach((n, i) => { doc.setFillColor(...PDF_WHITE); doc.setDrawColor(...V2K.line); doc.setLineWidth(.6); doc.rect(M + i * cw, y, cw, 16, 'FD'); doc.setTextColor(...V2K.text2); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4); doc.text(n.toUpperCase(), M + i * cw + cw / 2, y + 11, { align: 'center' }); });
    y += 16;
    const first = dOf(ym + '-01'), wd0 = (first.getDay() + 6) % 7, days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((wd0 + days) / 7), noteH = 54, gridH = H - 40 - noteH - 8 - y, wh = gridH / weeks, a0 = addD(ym + '-01', -wd0);
    const LH = 11.5, cap = Math.max(1, Math.floor((wh - 16) / (LH + 1.5)));
    for (let w = 0; w < weeks; w++) {
      const w0 = addD(a0, w * 7), w6 = addD(w0, 6), yy = y + w * wh;
      for (let i = 0; i < 7; i++) {
        const d = addD(w0, i), out = ymOf(d) !== ym, x = M + i * cw;
        const bg = shoot.has(d) ? mixc(rgb(lgCol('cal', 'rod')), PDF_WHITE, .12) : i >= 5 ? V2K.bg : PDF_WHITE;
        doc.setFillColor(...(out ? mixc(bg, PDF_WHITE, .45) : bg)); doc.setDrawColor(...V2K.line); doc.setLineWidth(.6); doc.rect(x, yy, cw, wh, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...(out ? mixc(MUTED, PDF_WHITE, .45) : INK)); doc.text(String(dOf(d).getDate()), x + 5, yy + 11);
      }
      const lanes = [], hidden = new Array(7).fill(0);
      for (const it of items) {
        if (it.end < w0 || it.start > w6) continue;
        const cs = it.start < w0 ? w0 : it.start, ce = it.end > w6 ? w6 : it.end, c0 = diffD(w0, cs), c1 = diffD(w0, ce);
        let L = lanes.findIndex(q => q < c0); if (L < 0) { L = lanes.length; lanes.push(-1); } lanes[L] = c1;
        if (L >= cap) { for (let c = c0; c <= c1; c++) hidden[c]++; continue; }
        const bx = M + c0 * cw + 2, bw = (c1 - c0 + 1) * cw - 4, by = yy + 15 + L * (LH + 1.5), col = rgb(cmColor(it));
        doc.setFillColor(...col); doc.rect(bx, by, bw, LH, 'F');
        const done = !it.sh && it.t.done;
        doc.setTextColor(...inkOn(col)); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
        const lab = pdfSafe((it.start < w0 ? '< ' : '') + cmLabel(it) + (done ? '  (hecha)' : ''));
        doc.text(doc.splitTextToSize(lab, bw - 6)[0] || '', bx + 3, by + 8.2);
      }
      hidden.forEach((h, i) => { if (h) { doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...MUTED); doc.text(`+${h} más`, M + i * cw + cw - 4, yy + wh - 4, { align: 'right' }); } });
    }
    // las notas del mes
    const ny = H - 40 - noteH;
    doc.setDrawColor(...V2K.line); doc.setLineWidth(.8); doc.roundedRect(M, y, W - 2 * M, weeks * wh, 3, 3, 'S');   // el marco del mes
    pdfCardBox(doc, M, ny, W - 2 * M, noteH);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(PF.small); doc.setTextColor(...MUTED); doc.text('Notas', M + 6, ny + 11);   // (lote K) en minúscula normal
    const nt = ((P.calendar.notes || {})[ym]) || '';
    if (nt) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK); doc.text(doc.splitTextToSize(pdfSafe(nt), W - 2 * M - 12).slice(0, 3), M + 6, ny + 24); }
  });
  pageNumbers(doc, 'Calendario por meses');
  return { doc, name: fileSafe(P.meta.title) + '_calendario_meses.pdf' };
}
