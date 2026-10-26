/* ============================================================
   Pestaña · CALENDARIO — cronograma de toda la producción
   Filas por fase (preproducción, rodaje, posproducción) que se contraen o
   expanden; vistas Mes y Semana (barras por día) y Día (detalle).
   Las jornadas de rodaje vienen del plan; todo lo demás se agrega libre,
   antes, durante o después del rodaje.
   ============================================================ */
const CAL_PH = [['pre', 'Preproducción'], ['rod', 'Rodaje'], ['post', 'Posproducción'], ['otro', 'Otras fechas']];
const CAL_COLORS = ['#5B7BD5', '#3E8F94', '#4E8F5A', '#C99A2E', '#D9822B', '#C8563F', '#B5577D', '#8B5BA6', '#6B6F7A'];
const CAL_AREAS = ['Producción', 'Dirección', 'Guion', 'Casting', 'Locaciones', 'Arte', 'Vestuario', 'Maquillaje', 'Fotografía', 'Sonido', 'Montaje', 'Color', 'VFX', 'Música', 'Distribución'];
const CAL_W = { mes: 26, semana: 118 };
const CW_MIN = 3, CW_MAX = 160, RH_MIN = 22, RH_MAX = 80, RH_STD = 44, RH_FIT = 72;
/* (antes: Tab sostenido para acercar con la rueda; ahora Ctrl o Alt + rueda) */
const CALTAB = { held: false, seen: 0 };
const DAY = 86400000;
const calEditable = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('calendario'));
const isoOf = d => isoDay(d);
const dOf = s => { const d = new Date(s + 'T12:00:00'); return isNaN(d) ? null : d; };
const addD = (s, n) => { const d = dOf(s); d.setDate(d.getDate() + n); return isoOf(d); };
const diffD = (a, b) => Math.round((dOf(b) - dOf(a)) / DAY);
const todayIso = () => isoOf(new Date());
// vista: 'tl' (meses, línea de tiempo o tablero, según calMode) o 'dia' (el detalle de una fecha)
const calView = () => UI.calView || (UI.calView = 'tl');
const calMode = () => UI.calMode || (UI.calMode = ls.get('calMode2', 'mes'));      // 'mes' hojas de mes (la de entrada) · 'tl' línea de tiempo · 'kb' tablero
const CAL_MODES = [['mes', 'Meses'], ['tl', 'Línea de tiempo'], ['kb', 'Tablero']];
const calKb = () => UI.calKb || (UI.calKb = ls.get('calKb', 'ph'));             // columnas del tablero: 'ph' por fase · 'st' por estado
const calClosed = () => new Set(ls.get('calClosed:' + P.id, []));
/* zoom: ancho de un día (de un año entero a pocos días) y alto de las filas; preferencia de cada computadora */
const calCw = () => UI.calCw || (UI.calCw = ls.get('calCw', 0) || CAL_W.mes);
const calRh = () => UI.calRh || (UI.calRh = ls.get('calRh', RH_STD));
/* las filas crecen hasta llenar el alto de la pantalla; el alto que elige la persona (la línea de la base) es el mínimo */
function calFit() {
  const sc = $('#calSc'), cal = $('#cal'), body = cal && $('.cal-body', cal); if (!sc || !body) return;
  const rows = [...body.children].filter(r => r.classList.contains('cal-row')); if (!rows.length) return;
  const head = [...cal.children].filter(r => r.classList.contains('cal-row')).reduce((a, r) => a + r.offsetHeight, 0);
  // crecen las filas de tareas y de jornadas; las cabeceras de fase y «+ Nueva tarea» quedan de su alto
  const grow = rows.filter(r => r.classList.contains('cal-task') || r.classList.contains('cal-auto'));
  const fixed = rows.filter(r => !grow.includes(r)).reduce((a, r) => a + r.offsetHeight, 0);
  const room = sc.clientHeight - head - 4;
  const fit = grow.length ? Math.floor((room - fixed) / grow.length) : 0;
  const rh = Math.round(clamp(Math.max(calRh(), Math.min(fit, RH_FIT)), RH_MIN, RH_FIT));
  cal.style.setProperty('--rh', rh + 'px'); cal.classList.toggle('rs', rh < 28);
  body.style.minHeight = Math.max(0, room) + 'px';   // los días (fines de semana, hoy) siguen hasta abajo
}
addEventListener('resize', debounce(() => { if (UI.tab === 'cal') calFit(); }, 120));
const cpx = n => `calc(var(--cw) * ${n})`;
/* Esc durante un arrastre: se suelta sin cambiar nada (devuelve cómo quitar el aviso) */
const escCancel = fn => { const k = ev => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fn(); } }; addEventListener('keydown', k, true); return () => removeEventListener('keydown', k, true); };
/* tramos: una tarea puede repetirse en varias fechas sobre la misma línea (casting en dos rondas) */
const segsOf = t => t.segs && t.segs.length ? t.segs : [{ start: t.start, end: t.end }];
function syncSpan(t) {
  let S = segsOf(t).filter(x => x.start).map(x => (x.end && x.end < x.start) ? { ...x, start: x.end, end: x.start } : { ...x, end: x.end || x.start });
  S.sort((x, y) => x.start.localeCompare(y.start));
  if (!S.length) return;
  t.start = S[0].start; t.end = S.reduce((m, x) => x.end > m ? x.end : m, S[0].end);
  if (S.length > 1) t.segs = S.map(x => ({ start: x.start, end: x.end })); else delete t.segs;
}
const onDay = (t, d) => segsOf(t).some(x => x.start <= d && x.end >= d);
const taskDays = t => segsOf(t).reduce((n, x) => n + diffD(x.start, x.end) + 1, 0);
/* jornadas de rodaje con su fecha (del plan) */
function calShoot() {
  if (!D.sc.scenes.length) return [];
  const { days } = scheduleDays(P, D.sc);
  const dates = shootDates(P, days.length);
  return days.map((d, n) => ({ n, d, date: dates[n] ? isoOf(dates[n]) : null, stage: d.stage })).filter(x => x.date);
}
/* una fecha que el calendario puede dibujar: AAAA-MM-DD entre 1900 y 2099 */
const calIso = s => typeof s === 'string' && /^(19|20)\d\d-\d\d-\d\d$/.test(s) && !!dOf(s);
const CAL_SPAN = 3 * 366;   // días a cada lado de la mitad de las fechas
/* tramo visible: de una semana antes de lo primero a tres semanas después de lo último, de lunes a domingo.
   Cuenta lo que está a menos de tres años de la mitad de las fechas: un año mal escrito (2206 en vez de 2026) no
   estira el calendario a decenas de miles de días; esa tarea sigue en su fila y se abre para corregirla */
function calRange() {
  const sh = calShoot(), T = P.calendar.tasks;
  const ds = [...sh.map(x => x.date), ...T.flatMap(t => [t.start, t.end])].filter(calIso).sort();
  const mid = ds.length ? ds[ds.length >> 1] : todayIso(), lo = addD(mid, -CAL_SPAN), hi = addD(mid, CAL_SPAN);
  const all = [todayIso(), ...ds].filter(d => d >= lo && d <= hi).sort();
  let a = addD(all[0], -7), b = addD(all[all.length - 1], 21);
  const da = dOf(a); a = addD(a, -((da.getDay() + 6) % 7));
  const db = dOf(b); b = addD(b, (7 - db.getDay()) % 7);
  const n = diffD(a, b) + 1;
  return { a, b, n, list: Array.from({ length: n }, (_, i) => addD(a, i)) };
}
/* el color de una tarea: el de su etiqueta de la leyenda o, si no tiene, el de su fase */
const taskColor = t => hlc(t, 'cal') || (lgHexOk(t.color) ? t.color : '') || lgCol('cal', LG.cal[t.ph] ? t.ph : 'pre');
const tasksOf = ph => P.calendar.tasks.filter(t => (t.ph || 'pre') === ph).sort((x, y) => x.start.localeCompare(y.start) || x.end.localeCompare(y.end));
const fmtD = s => dOf(s).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtSeg = x => x.start === x.end ? fmtD(x.start) : `${fmtD(x.start)} → ${fmtD(x.end)}`;
const fmtRange = t => segsOf(t).map(fmtSeg).join(' · ');
/* etiqueta del mes según el espacio que tiene */
function monthLabel(m, w) {
  const d = dOf(m + '-15');
  if (w >= 150) return capFirst(d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }));
  if (w >= 64) return capFirst(d.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }).replace('.', ''));
  if (w >= 26) return capFirst(d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''));
  return '';
}

/* íconos de las tarjetas */
// ícono de despliegue: abre el detalle (de un día, de una jornada o de una tarea) solo con doble toque
const CAL_OPEN = '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 6l4 4 4-4"/></svg>';
const KB_I = {
  cal: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.8v2.6M10.5 1.8v2.6"/></svg>',
  list: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="2.5"/><path d="M5 8.2l2 2 4-4.4"/></svg>',
  note: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4h10M3 8h10M3 12h6"/></svg>',
  pen: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13l.7-2.8L11 2.9a1.4 1.4 0 012 2L5.8 12.3z"/><path d="M9.8 4.1l2 2"/></svg>',
  ok: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l3 3 6-6.8"/></svg>',
};
/* iniciales del responsable, con un color fijo por nombre */
function avatarHTML(name) {
  const ini = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  let h = 0; for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `<span class="kb-av" style="--c:${ea(lgG(CAL_COLORS[h % (CAL_COLORS.length - 1)]))}" title="${esc(name)}">${esc(ini)}</span>`;
}
const shortD = s => dOf(s).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace('.', '');
const kbDates = t => { const S = segsOf(t); return S.length > 1 ? `${shortD(S[0].start)} · ${S.length} fechas` : S[0].start === S[0].end ? shortD(S[0].start) : `${shortD(S[0].start)} – ${shortD(S[0].end)}`; };
const checkOf = t => { const c = t.check || []; return { n: c.length, ok: c.filter(x => x.ok).length }; };

/* la cabecera del calendario (lote I): en Meses, los meses que se ven como título (con su menú) y ‹ Hoy › al lado; en
   Línea de tiempo, Hoy y Ver todo; debajo, en gris, cuándo es el rodaje */
function calHeadHTML(mode, sh) {
  const d = x => dOf(x), dm = x => d(x).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
  const a = sh.length ? sh[0].date : '', z = sh.length ? sh[sh.length - 1].date : '';
  const rod = !a ? '' : a === z ? `<b>Rodaje</b> ${dm(a)}` : a.slice(0, 7) === z.slice(0, 7) ? `<b>Rodaje</b> ${d(a).getDate()} – ${dm(z)}` : `<b>Rodaje</b> ${dm(a)} – ${dm(z)}`;
  const sub = [rod, `<span data-no-tr>${esc(P.meta.title || '')}</span>`].filter(Boolean).join(' · ');
  if (mode === 'mes') return `<section class="hd cal-hd">${hdHead({ title: esc(cmLab()), menu: 'data-act="cm-pick" aria-haspopup="dialog" title="Ir a un mes y un año"', sub, act: cmNavHTML() })}</section>`;
  const act = mode === 'tl' ? `<span class="hd-navg" role="group"><button type="button" class="t" data-act="cal-go" data-to="hoy">Hoy</button></span>${hdBtn('sec', 'Ver todo', { sm: true, attrs: 'data-act="cal-all" title="Ajusta el ancho de los días para ver toda la producción"' })}` : '';
  return `<section class="hd cal-hd">${hdHead({ title: mode === 'kb' ? 'Tablero' : 'Línea de tiempo', sub, act })}</section>`;
}
RENDER.cal = function () {
  const v = $('#view');
  const ed = calEditable(), mode = calMode(), day = calView() === 'dia';
  const R = calRange(), sh = calShoot();
  if (!UI.calDay) UI.calDay = sh.length ? sh[0].date : todayIso();
  const closed = calClosed();
  const cw = calCw(), rh = calRh();
  v.innerHTML = `<div class="ws ws-1"><section class="center">
    <div class="bar">
      ${day ? `<button class="btn ghost" data-act="cal-back">‹ ${CAL_MODES.find(x => x[0] === mode)[1]}</button>`
    : `${hdSeg(CAL_MODES.map(([k, n]) => ({ label: n, attrs: `data-act="cal-mode" data-v="${k}"`, on: mode === k })), 'Vista')}${mode === 'mes' ? cmNsHTML() : ''}`}
      <span class="grow"></span>
      ${ed && !day ? hdBtn('tint', 'Tarea', { icon: 'plus', sm: true, cls: 'm-more', attrs: 'data-act="cal-add"' }) : ''}
      ${toolsHTML()}
    </div>
    ${legendHTML('cal')}
    ${day ? calDayHTML(UI.calDay, sh, ed) : mode === 'kb' ? calHeadHTML(mode, sh) + calBoardHTML(sh, ed) : mode === 'mes' ? `<div class="cal-wrap cm-wrap">${calHeadHTML(mode, sh)}${ed ? tipHTML('cal-mes1', TOUCHY ? 'Mantén el dedo en una barra para moverla (suéltala sin mover: su color). Toca dos veces una barra para abrir la tarea, o un número para ver el día. Mantén el dedo en un día y arrastra para crear una tarea.' : 'Arrastra una barra para moverla; sus bordes cambian el inicio y el fin. Arrastra sobre los días para crear una tarea (doble clic: un día). Doble clic en una barra la abre; el número de un día abre lo de ese día. Clic derecho en una barra: su color.') : ''}${calMonthsHTML(sh, ed)}</div>` : `<div class="cal-wrap">${calHeadHTML(mode, sh)}${ed ? tipHTML('cal-uso7', TOUCHY ? 'Mantén el dedo en una barra para moverla. Toca dos veces una barra o la flecha ⌄ para abrir una tarea o un día. Pellizca con dos dedos: a los lados cambia el ancho de los días; arriba y abajo, el alto de las filas.' : 'Arrastra una barra para moverla; arrastra desde un espacio vacío para elegir varias. Doble clic en una barra o un clic en la flecha ⌄ abre la tarea o el día. Ctrl + rueda del mouse: ancho de los días. La línea de abajo: alto mínimo de las filas (llenan la pantalla). Arrastra sobre los días en la fila de una fase para crear una tarea.') : ''}
      <div class="scroller cal-sc" data-keep="cal" id="calSc"><div class="cal ${ea(cw >= 70 ? 'semana' : 'mes')}${ea(rh < 28 ? ' rs' : '')}" id="cal" style="--cw:${ea(cw)}px;--rh:${ea(rh)}px">${calGanttHTML(R, sh, closed, ed, cw)}
        <div class="cal-rz" id="calRz" role="separator" aria-orientation="horizontal" aria-label="Alto de las filas" aria-valuemin="${ea(RH_MIN)}" aria-valuemax="${ea(RH_MAX)}" aria-valuenow="${ea(rh)}" tabindex="0" title="Arrastra para agrandar o achicar las filas · doble clic: alto normal"><i></i></div></div></div></div>`}
  </section></div>`;
  bindView();
  if (!day && mode === 'tl') bindGantt(R, sh);
  if (!day && mode === 'mes') bindMonths();
  if (!day && mode === 'kb') bindKanban();
};
function calGanttHTML(R, sh, closed, ed, cw) {
  const W = cpx(R.n), today = todayIso();
  const shootSet = new Set(sh.map(x => x.date));
  const wide = cw >= 70;
  // encabezado: meses y días (la etiqueta del mes se recorta dentro de su mes: no se monta sobre el siguiente)
  const months = [];
  R.list.forEach((d, i) => { const m = d.slice(0, 7); if (!months.length || months[months.length - 1].m !== m) months.push({ m, i, n: 1 }); else months[months.length - 1].n++; });
  const dayMode = cw >= 22 ? 'full' : cw >= 13 ? 'num' : 'wk';
  const dayHead = (d, i) => {
    const dd = dOf(d), wd = dd.getDay();
    if (dayMode === 'wk') return wd === 1 ? `<div class="cal-dh wk" style="left:${cpx(i)};width:${cpx(7)}" title="Semana del ${esc(fmtD(d))}"><b>${dd.getDate()}</b></div>` : '';
    return `<div class="cal-dh${ea(wd === 0 || wd === 6 ? ' we' : '')}${ea(shootSet.has(d) ? ' sh' : '')}${ea(d === today ? ' td' : '')}" style="left:${cpx(i)}" title="${esc(fmtD(d))}">${dayMode === 'num' ? '' : wide ? `<small>${esc(dd.toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', ''))}</small>` : `<small>${(EN ? 'SMTWTFS' : 'DLMMJVS')[wd]}</small>`}<b>${dd.getDate()}</b>${dayMode === 'full' ? `<button class="cal-dx" data-act="cal-day" data-d="${ea(d)}" aria-label="Ver el ${esc(fmtD(d))}" title="Ver lo de este día">${CAL_OPEN}</button>` : ''}</div>`;
  };
  const head = `<div class="cal-row cal-h1"><div class="cal-lab"></div><div class="cal-tl" style="width:${ea(W)}">${months.map(x => `<span class="cal-mon" style="left:${cpx(x.i)};width:${cpx(x.n)}"><b>${esc(monthLabel(x.m, x.n * cw))}</b></span>`).join('')}</div></div>
    <div class="cal-row cal-h2"><div class="cal-lab"><button class="linkbtn cal-fold" data-act="cal-fold">${CAL_PH.every(([k]) => closed.has(k)) ? 'Expandir todo' : 'Contraer todo'}</button><span class="hint">${matchMedia('(pointer:coarse)').matches ? 'doble toque' : 'clic'} en ${CAL_OPEN.replace('width="11" height="11"', 'width="10" height="10"')} abre${matchMedia('(pointer:coarse)').matches ? '' : ' el detalle'}</span></div><div class="cal-tl" style="width:${ea(W)}">${R.list.map(dayHead).join('')}</div></div>`;
  // fondo: fines de semana, días de rodaje y hoy
  const bg = R.list.map((d, i) => { const wd = dOf(d).getDay(); const cls = shootSet.has(d) ? 'sh' : (wd === 0 || wd === 6) && cw >= 6 ? 'we' : ''; return cls ? `<i class="cal-bg ${ea(cls)}" style="left:${cpx(i)}"></i>` : ''; }).join('')
    + (R.list.includes(today) ? `<i class="cal-today" style="left:${cpx(diffD(R.a, today) + .5)}" title="Hoy"></i>` : '');
  const bar = (t, x, si) => { const ck = checkOf(t); return `<div class="cal-bar${ea(t.done ? ' done' : '')}" data-id="${ea(t.id)}" data-s="${ea(si)}" data-note="task:${ea(t.id)}" data-cal-col="cal|${ea(t.hl && lgHl('cal').some(h => h.id === t.hl) ? 'h:' + t.hl : (LG.cal[t.ph] ? t.ph : 'pre'))}" style="left:${cpx(diffD(R.a, x.start))};width:${cpx(diffD(x.start, x.end) + 1)};--c:${ea(taskColor(t))}" title="${esc(t.title + ' · ' + fmtSeg(x) + (t.who ? ' · ' + t.who : ''))}"><span class="bt">${t.done ? KB_I.ok : ''}${esc(t.title)}</span>${wide && ck.n ? `<span class="bk">${KB_I.list}${ck.ok}/${ck.n}</span>` : ''}${wide && t.who ? avatarHTML(t.who) : ''}<button class="cal-bx" data-act="cal-edit" data-id="${ea(t.id)}" aria-label="Abrir «${esc(t.title)}»" title="Abrir la tarea">${CAL_OPEN}</button>${ed ? '<i class="h l"></i><i class="h r"></i>' : ''}</div>`; };
  const rows = [];
  for (const [ph, name] of CAL_PH) {
    const list = tasksOf(ph);
    const isRod = ph === 'rod';
    if (!list.length && !(isRod && sh.length) && ph === 'otro') continue;
    const open = !closed.has(ph);
    const span = isRod && sh.length ? { start: sh[0].date, end: sh[sh.length - 1].date } : null;
    const all = list.concat(span ? [span] : []);
    const a = all.length ? all.map(t => t.start).sort()[0] : null, z = all.length ? all.map(t => t.end).sort().reverse()[0] : null;
    rows.push(`<div class="cal-row cal-ph" data-ph="${ea(ph)}"><div class="cal-lab"><button class="cal-tog" data-act="cal-tog" data-ph="${ea(ph)}" aria-expanded="${ea(open)}"><span class="car">▸</span><b>${name}</b><span class="hint">${list.length + (isRod ? sh.length : 0)}</span></button>${ed ? `<button class="cal-plus" data-act="cal-add" data-ph="${ea(ph)}" title="Agregar una tarea en ${esc(name.toLowerCase())}" aria-label="Agregar tarea en ${esc(name)}">+</button>` : ''}</div>
      <div class="cal-tl" data-frame="${ea(a ? a + '|' + z : '')}"${ed ? ` data-new="1" data-ph="${ea(ph)}" title="Arrastra sobre los días para crear una tarea en ${esc(name.toLowerCase())}"` : ''} style="width:${ea(W)}">${!open && a ? `<i class="cal-sum" data-cal-col="cal|${ea(ph)}" style="left:${cpx(diffD(R.a, a))};width:${cpx(diffD(a, z) + 1)}"></i>${list.flatMap(t => segsOf(t).map(x => `<i class="cal-tick" style="left:${cpx(diffD(R.a, x.start))};width:${cpx(diffD(x.start, x.end) + 1)};--c:${ea(taskColor(t))}"></i>`)).join('')}` : ''}</div></div>`);
    if (!open) continue;
    if (isRod && sh.length) {
      rows.push(`<div class="cal-row cal-auto"><div class="cal-lab"><button class="cal-an" data-act="cal-frame" data-a="${ea(span.start)}" data-z="${ea(span.end)}" title="Encuadrar el rodaje">Jornadas de rodaje</button><button class="linkbtn" data-act="cal-plan">plan</button></div><div class="cal-tl" data-frame="${ea(span.start)}|${ea(span.end)}" style="width:${ea(W)}">${sh.map(x => `<div class="cal-sd" data-cal-col="cal|rod" style="left:${cpx(diffD(R.a, x.date))};width:${cpx(1)};--c:${ea(stageTone(P, x.stage))}" title="Jornada ${ea(x.n + 1)} · ${esc(fmtD(x.date))} · ${ea(x.d.keys.length)} esc."><span>${wide ? `J${x.n + 1} · ${x.d.keys.length} esc.` : cw >= 14 ? x.n + 1 : ''}</span>${cw >= 22 ? `<button class="cal-dx" data-act="cal-day" data-d="${ea(x.date)}" aria-label="Ver la jornada ${ea(x.n + 1)}">${CAL_OPEN}</button>` : ''}</div>`).join('')}</div></div>`);
      for (const st of P.schedule.stages || []) {
        const ds = sh.filter(x => x.stage === st.id); if (!ds.length) continue;
        const s0 = ds[0].date, s1 = ds[ds.length - 1].date;
        rows.push(`<div class="cal-row cal-auto"><div class="cal-lab"><button class="cal-an" data-act="cal-frame" data-a="${ea(s0)}" data-z="${ea(s1)}" title="Encuadrar la etapa">Etapa ${(P.schedule.stages.indexOf(st)) + 1}${st.name ? ' · ' + esc(st.name) : ''}</button></div><div class="cal-tl" data-frame="${ea(s0)}|${ea(s1)}" style="width:${ea(W)}"><i class="cal-stg" style="left:${cpx(diffD(R.a, s0))};width:${cpx(diffD(s0, s1) + 1)};--c:${ea(stageTone(P, st.id))}">${esc(st.place || st.name || '')}</i></div></div>`);
      }
    }
    for (const t of list) {
      const S = segsOf(t);
      rows.push(`<div class="cal-row cal-task" data-ph="${ea(ph)}" data-id="${ea(t.id)}"><div class="cal-lab"><div class="cal-tn" data-id="${ea(t.id)}"><span class="dot" style="--c:${ea(taskColor(t))}"></span><span class="t">${esc(t.title)}${S.length > 1 ? ` <span class="cal-nseg" title="${ea(S.length)} fechas">×${S.length}</span>` : ''}</span><small>${esc([t.area, t.who].filter(Boolean).join(' · '))}${checkOf(t).n ? ` · ${checkOf(t).ok}/${checkOf(t).n}` : ''}</small></div><button class="cal-te" data-act="cal-frame" data-id="${ea(t.id)}" title="Encuadrar en la línea de tiempo" aria-label="Encuadrar «${esc(t.title)}»"><svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/></svg></button><button class="cal-te" data-act="cal-edit" data-id="${ea(t.id)}" title="Abrir la tarea" aria-label="Abrir «${esc(t.title)}»">${CAL_OPEN}</button></div><div class="cal-tl" data-ph="${ea(ph)}" data-task="${ea(t.id)}" style="width:${ea(W)}">${S.map((x, si) => bar(t, x, si)).join('')}</div></div>`);
    }
    // la fila «+ Nueva tarea» solo en una fase vacía: con tareas, se dibuja una nueva en la cabecera de la fase
    if (ed && !list.length) rows.push(`<div class="cal-row cal-new cal-empty" data-ph="${ea(ph)}"><div class="cal-lab"><span class="hint">+ Nueva tarea: arrastra en los días</span></div><div class="cal-tl" data-ph="${ea(ph)}" data-new="1" style="width:${ea(W)}">${!P.calendar.tasks.length && ph === 'pre' ? `<button class="btn sm cal-tplb" data-act="cal-tpl" style="left:max(0px, ${cpx(sh.length ? diffD(R.a, sh[0].date) : diffD(R.a, today))} - 300px)">Agregar tareas típicas de pre y posproducción</button>` : ''}</div></div>`);
    else if (!list.length && !isRod) rows.push(`<div class="cal-row cal-empty"><div class="cal-lab"><span class="hint">Sin tareas</span></div><div class="cal-tl" style="width:${ea(W)}"></div></div>`);
  }
  return `${head}<div class="cal-body"><div class="cal-bgs" style="width:${ea(W)}">${bg}</div>${rows.join('')}</div>`;
}
function calDayHTML(day, sh, ed) {
  const j = sh.find(x => x.date === day);
  const list = P.calendar.tasks.filter(t => onDay(t, day));
  const byPh = CAL_PH.map(([k, n]) => [k, n, list.filter(t => (t.ph || 'pre') === k)]).filter(x => x[2].length);
  let jHTML = '';
  if (j) {
    const d = j.d, items = d.rows.map(i => P.schedule.items[i]);
    const call = callOf(d.id, d);
    jHTML = `<div class="card cal-jd" style="--c:${ea(stageTone(P, j.stage))}"><div class="eyebrow">Jornada ${j.n + 1} de rodaje${call ? ' · llamado ' + esc(call) : ''}</div>
      <div class="cal-jl">${items.map(it => { if (it.e) return `<div class="ev"><span class="tnum">${esc(it.t || '')}</span><b>${esc(it.name || 'Evento')}</b><span>${esc(it.det || '')}</span></div>`; const s = sceneOfKey(it.k); return `<div><span class="tnum">${esc(it.t || '')}</span><b>Esc. ${esc(rowCode(it))}</b><span>${esc(s.heading)}${planLoc(it, s) ? ' · ' + esc(planLoc(it, s)) : ''}</span></div>`; }).join('') || '<p class="hint" style="margin:0">Jornada sin escenas.</p>'}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" data-act="cal-call" data-n="${ea(j.n)}">Hoja de llamado</button><button class="btn sm ghost" data-act="cal-plan">Ver en el plan</button></div></div>`;
  }
  return `<div class="scroller pad" data-keep="calday"><div class="cal-day">
    <div class="cal-dnav"><button class="btn ghost" data-act="cal-step" data-d="-1" aria-label="Día anterior">‹</button>
      <h2>${esc(capFirst(dOf(day).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })))}</h2>
      <button class="btn ghost" data-act="cal-step" data-d="1" aria-label="Día siguiente">›</button>
      <input type="date" value="${ea(day)}" data-bind="cal-date" aria-label="Ir a una fecha" style="width:auto"></div>
    ${jHTML}
    ${byPh.map(([k, n, ts]) => `<section class="cal-dsec"><div class="eyebrow">${n}</div>${ts.map(t => `<div class="card cal-dt${ea(t.done ? ' done' : '')}" style="--c:${ea(taskColor(t))}">
      <label class="cal-chk"><input type="checkbox" data-bind="cal-done" data-id="${ea(t.id)}" ${t.done ? 'checked' : ''} ${ed ? '' : 'disabled'} aria-label="Hecha"></label>
      <div><b>${esc(t.title)}</b><div class="hint">${esc(fmtRange(t))}${t.area ? ' · ' + esc(t.area) : ''}${t.who ? ' · ' + esc(t.who) : ''}</div>${t.notes ? `<p>${esc(t.notes)}</p>` : ''}</div>
      ${ed ? `<button class="btn sm ghost" data-act="cal-edit" data-id="${ea(t.id)}">Editar</button>` : ''}</div>`).join('')}</section>`).join('')}
    ${!j && !byPh.length ? '<p class="hint">Nada programado este día.</p>' : ''}
    ${ed ? `<button class="btn" data-act="cal-add" data-d="${ea(day)}" style="justify-self:start">+ Tarea este día</button>` : ''}
  </div></div>`;
}
/* llamado general de una jornada: el de la hoja de llamado, el evento «Llamado» del plan o el de por defecto */
function callOf(id, d) {
  const cd = ((P.call || {}).days || {})[id] || {};
  if (cd.crewCall) return cd.crewCall;
  const ev = d.rows.map(i => P.schedule.items[i]).find(it => it.e && /llamado/i.test(it.name || '') && it.t);
  return ev ? ev.t : (P.schedule.call || '');
}
/* ancho de la columna de nombres (fija a la izquierda) */
const calLabW = () => { const l = $('#cal .cal-lab'); return l ? l.offsetWidth : 236; };
/* acercar o alejar sin volver a dibujar: solo cambia --cw y se conserva el día que está bajo el puntero (o al centro) */
function calZoomLive(cw, ax) {
  const sc = $('#calSc'), cal = $('#cal'); if (!sc || !cal) return;
  const old = calCw(); cw = clamp(+cw, CW_MIN, CW_MAX);
  if (ax == null) ax = (sc.clientWidth - calLabW()) / 2;
  const day = (sc.scrollLeft + ax) / old;
  UI.calCw = +cw.toFixed(2);
  cal.style.setProperty('--cw', UI.calCw + 'px');
  cal.classList.toggle('semana', UI.calCw >= 70); cal.classList.toggle('mes', UI.calCw < 70);
  sc.scrollLeft = Math.max(0, day * UI.calCw - ax);
}
function calZoomDone() {
  ls.set('calCw', UI.calCw);
  const sc = $('#calSc'); UI.calScrollPx = sc ? sc.scrollLeft : null;
  render();
}
/* encuadrar un tramo de fechas: ajusta el ancho de los días para que quepa con un pequeño margen */
function calFrame(a, z, padF = .12) {
  const sc = $('#calSc'); if (!sc || !a) return;
  const R = calRange();
  const vis = sc.clientWidth - calLabW() - 8;
  const days = diffD(a, z) + 1, pad = padF ? Math.max(1, Math.round(days * padF)) : 0;
  UI.calCw = +clamp(vis / (days + pad * 2), CW_MIN, CW_MAX).toFixed(2);
  ls.set('calCw', UI.calCw);
  const cwV = UI.calCw, free = vis - (days + pad * 2) * cwV;
  UI.calScrollPx = Math.max(0, (diffD(R.a, a) - pad) * cwV - Math.max(0, free / 2));
  render();
}
/* mover barras, crear tareas y fechas arrastrando en el espacio vacío, encuadrar con un toque */
/* en el calendario nada se abre ni se despliega con un toque suelto: hace falta tocar dos veces */
const CAL_DBL = '[data-act="cal-tog"],[data-act="cal-fold"],[data-act="cal-day"],[data-act="cal-edit"],[data-act="cal-frame"],[data-act="cal-plan"],[data-act="cal-call"],[data-open]';
const CAL_DBL_HINT = 'Toca dos veces para abrir o desplegar.';
function bindGantt(R, sh) {
  const cal = $('#cal'), sc = $('#calSc'); if (!cal) return;
  doubleTap(cal, CAL_DBL, CAL_DBL_HINT);
  const cwNow = () => calCw();
  // la primera vez se ubica cerca del rodaje; al cambiar de vista, en el día elegido
  if (!UI.calSeen) { UI.calSeen = true; UI.calScrollTo = UI.calScrollTo || addD(UI.calDay, cwNow() < 70 ? -21 : -1); }
  if (UI.calScrollPx != null) { const x = UI.calScrollPx; UI.calScrollPx = null; requestAnimationFrame(() => { if (sc) sc.scrollLeft = x; }); }
  else if (UI.calScrollTo) {
    const to = UI.calScrollTo; UI.calScrollTo = null;
    // después de que render() restaure el desplazamiento anterior
    requestAnimationFrame(() => { const i = diffD(R.a, to); if (sc && i >= 0) sc.scrollLeft = Math.max(0, i * cwNow() - 60); });
  }
  // ancho de los días: Ctrl (o Alt) + rueda; alto de las filas: la línea de la base; en el teléfono, pellizco
  const setRh = v => { UI.calRh = Math.round(clamp(v, RH_MIN, RH_MAX)); calFit(); const z = $('#calRz'); if (z) z.setAttribute('aria-valuenow', UI.calRh); };
  requestAnimationFrame(calFit);
  if (sc) {
    // la línea de la base queda fija abajo y centrada en lo visible
    const scw = () => cal.style.setProperty('--scw', sc.clientWidth + 'px');
    scw();
    if (bindGantt.ro) bindGantt.ro.disconnect();
    bindGantt.ro = new ResizeObserver(scw); bindGantt.ro.observe(sc);
    sc.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') CALTAB.seen = Date.now(); });
    sc.addEventListener('pointerleave', () => { CALTAB.seen = 0; });
  }
  const rz = $('#calRz');
  if (rz) {
    let tap0 = 0;
    rz.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      const now = Date.now();
      if (now - tap0 < 380) { tap0 = 0; setRh(RH_STD); ls.set('calRh', UI.calRh); toast('Alto normal de las filas.', 1400); return; }
      tap0 = now;
      rz.setPointerCapture(e.pointerId);
      // el borde de abajo sigue al puntero: todas las filas crecen o se achican a la vez
      const body = $('.cal-body', cal), units = Math.max(1, (body ? body.offsetHeight : 300) / calRh()), y0 = e.clientY, r0 = calRh();
      rz.classList.add('on'); document.body.classList.add('rz-ns');
      const mv = ev => setRh(r0 + (ev.clientY - y0) / units);
      const up = () => { rz.classList.remove('on'); document.body.classList.remove('rz-ns'); rz.removeEventListener('pointermove', mv); rz.removeEventListener('pointerup', up); rz.removeEventListener('pointercancel', up); ls.set('calRh', UI.calRh); };
      rz.addEventListener('pointermove', mv); rz.addEventListener('pointerup', up); rz.addEventListener('pointercancel', up);
    });
    rz.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setRh(calRh() + (e.key === 'ArrowDown' ? 2 : -2)); ls.set('calRh', UI.calRh); } });
  }
  if (!bindGantt.tabKeys) {
    bindGantt.tabKeys = true;
    // Tab ya no se usa para el zoom (servía para moverse entre botones): Ctrl + rueda, o Alt + rueda
  }
  let wheelT = 0;
  sc && sc.addEventListener('wheel', e => {
    if (!(e.ctrlKey || e.metaKey || e.altKey)) return;
    e.preventDefault();
    const r = sc.getBoundingClientRect(), ax = e.clientX - r.left - calLabW();
    const dy = e.deltaY || e.deltaX;
    calZoomLive(cwNow() * Math.exp(-dy * .0025), Math.max(0, ax));
    clearTimeout(wheelT); wheelT = setTimeout(calZoomDone, 350);
  }, { passive: false });
  // pellizco con dos dedos: separados a los lados, el ancho de los días; arriba y abajo, el alto de las filas
  if (sc) {
    let G = null, raf = 0;
    sc.addEventListener('touchstart', e => {
      if (e.touches.length !== 2) { G = null; return; }
      const [a, b] = e.touches, dx = Math.abs(a.clientX - b.clientX), dy = Math.abs(a.clientY - b.clientY);
      G = { h: dx >= dy, d0: Math.max(24, dx >= dy ? dx : dy), cw0: cwNow(), rh0: calRh() };
    }, { passive: true });
    sc.addEventListener('touchmove', e => {
      if (!G || e.touches.length !== 2) return;
      e.preventDefault();
      const [a, b] = e.touches, k = Math.max(24, G.h ? Math.abs(a.clientX - b.clientX) : Math.abs(a.clientY - b.clientY)) / G.d0;
      const mx = (a.clientX + b.clientX) / 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!G) return;
        if (G.h) { const r = sc.getBoundingClientRect(); calZoomLive(G.cw0 * k, Math.max(0, mx - r.left - calLabW())); G.moved = 'w'; }
        else { setRh(G.rh0 * k); G.moved = 'h'; }
      });
    }, { passive: false });
    const end = e => {
      if (!G || e.touches.length >= 2) return;
      const m = G.moved; G = null;
      if (m) suppressClick();   // los dedos al soltarse no abren barras ni tareas
      if (m === 'w') calZoomDone(); else if (m === 'h') ls.set('calRh', UI.calRh);
    };
    sc.addEventListener('touchend', end); sc.addEventListener('touchcancel', end);
    for (const ev of ['gesturestart', 'gesturechange']) sc.addEventListener(ev, e => e.preventDefault());
  }
  const dayAt = (tl, x) => { const i = Math.floor((x - tl.getBoundingClientRect().left) / cwNow()); return R.list[clamp(i, 0, R.n - 1)]; };
  cal.addEventListener('dblclick', e => {
    if (!calEditable() || e.target.closest('.cal-bar,button')) return;
    const tl = e.target.closest('.cal-tl'); if (!tl) return;
    const d = dayAt(tl, e.clientX);
    if (tl.dataset.task) {   // otra fecha de la misma tarea, ese día
      const t = P.calendar.tasks.find(x => x.id === tl.dataset.task); if (!t) return;
      t.segs = segsOf(t).concat([{ start: d, end: d }]); syncSpan(t); changed('data'); render();
      toast(`«${t.title}» tiene ahora ${segsOf(t).length} fechas.`);
      return;
    }
    if (tl.dataset.ph) calNewTask(tl.dataset.ph, d, d);
  });
  // mover la línea de tiempo: arrastrando la fila de los días, con el botón del medio o con la barra espaciadora
  function pan(e) {
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY, l0 = sc.scrollLeft, t0 = sc.scrollTop;
    cal.classList.add('panning');
    const mv = ev => { sc.scrollLeft = l0 - (ev.clientX - x0); sc.scrollTop = t0 - (ev.clientY - y0); };
    const up = () => { cal.classList.remove('panning'); removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  let space = false;
  const kd = e => { if (e.code === 'Space' && UI.tab === 'cal' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { space = true; cal.classList.add('can-pan'); e.preventDefault(); } };
  const ku = e => { if (e.code === 'Space') { space = false; cal.classList.remove('can-pan'); } };
  if (!bindGantt.keys) { bindGantt.keys = true; addEventListener('keydown', e => bindGantt.kd && bindGantt.kd(e)); addEventListener('keyup', e => bindGantt.ku && bindGantt.ku(e)); }
  bindGantt.kd = kd; bindGantt.ku = ku;
  // selección de barras (para moverlas juntas)
  const SELB = UI.calSel || (UI.calSel = new Set());
  const paintBarSel = () => $$('.cal-bar[data-id]', cal).forEach(b => b.classList.toggle('sel', SELB.has(b.dataset.id + '|' + b.dataset.s)));
  paintBarSel();
  const sweepBars = (start, additive) => {
    const base = additive ? new Set(SELB) : new Set();
    sweepSelect(start, {
      scroller: sc, items: () => $$('.cal-body .cal-bar[data-id]', cal),
      onPick: (hit, fin) => { SELB.clear(); for (const k of base) SELB.add(k); for (const b of hit) SELB.add(b.dataset.id + '|' + b.dataset.s); paintBarSel(); if (fin && hit.length > 1) toast(`${SELB.size} barras elegidas: arrastra una para moverlas juntas. Clic en un espacio vacío para soltarlas.`, 2600); },
    });
  };
  cal.addEventListener('pointerdown', e => {
    if (e.button === 1 || (e.button === 0 && space)) { if (e.target.closest('.cal-body, .cal-h1, .cal-h2')) pan(e); return; }
    if (e.button !== 0) return;
    if (e.target.closest('.cal-dx, .cal-bx')) return;
    if (e.target.closest('.cal-h1 .cal-tl, .cal-h2 .cal-tl')) { if (e.pointerType !== 'touch') pan(e); return; }
    const b = e.target.closest('.cal-bar[data-id]');
    const ed = calEditable(), additive = e.shiftKey || e.ctrlKey || e.metaKey;
    if (b) {
      if (!ed) return;
      // los bordes cambian el inicio o el fin al instante
      if (e.target.classList.contains('h')) { e.preventDefault(); suppressClick(); return dragBar(e, b); }
      return pressGesture(e, { target: b, onLift: () => dragBar(e, b, true) });
    }
    if (e.target.closest('button,input,a')) return;
    const tl = e.target.closest('.cal-body .cal-tl');
    const canDraw = !!tl && ed && (tl.dataset.new || (tl.dataset.task && e.altKey));
    if (!canDraw) { if (e.pointerType !== 'touch' && e.target.closest('.cal-body')) pressGesture(e, { onSweep: () => sweepBars(e, additive) }); return; }
    // en el teléfono hay que mantener el dedo antes de dibujar (deslizar desplaza y dos dedos acercan)
    if (e.pointerType === 'touch') { pressGesture(e, { onLift: () => drawTask(e, tl) }); return; }
    drawTask(e, tl);
  });
  // dibujar una tarea nueva (o otra fecha de una tarea) arrastrando sobre los días; un segundo dedo o Esc lo cancelan
  function drawTask(e, tl) {
    const x0 = e.clientX, d0 = dayAt(tl, x0);
    let ghost = null, d1 = d0, moved = false;
    const mv = ev => {
      if (!moved && Math.abs(ev.clientX - x0) < 5) return;
      moved = true;
      d1 = dayAt(tl, ev.clientX);
      const a = d0 < d1 ? d0 : d1, z = d0 < d1 ? d1 : d0;
      if (!ghost) { ghost = document.createElement('div'); ghost.className = 'cal-bar ghost'; tl.appendChild(ghost); }
      ghost.style.left = cpx(diffD(R.a, a)); ghost.style.width = cpx(diffD(a, z) + 1);
      ghost.textContent = diffD(a, z) + 1 + (diffD(a, z) ? ' días' : ' día');
    };
    const other = ev => { if (ev.pointerId !== e.pointerId) { moved = false; up(); } };
    const up = () => {
      offEsc();
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); removeEventListener('pointerdown', other, true);
      if (ghost) ghost.remove();
      const a = d0 < d1 ? d0 : d1, z = d0 < d1 ? d1 : d0;
      if (!moved) return;
      if (tl.dataset.task) {
        const t = P.calendar.tasks.find(x => x.id === tl.dataset.task); if (!t) return;
        t.segs = segsOf(t).concat([{ start: a, end: z }]); syncSpan(t); changed('data'); render();
        toast(`Otra fecha para «${t.title}»: ${fmtSeg({ start: a, end: z })}.`);
      } else calNewTask(tl.dataset.ph, a, z);
    };
    const offEsc = escCancel(() => { moved = false; up(); });
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up); addEventListener('pointerdown', other, true);
  }
  // un toque en una barra la selecciona (Mayús o Ctrl: suma a la selección); el detalle se abre con ⌄ o doble clic
  cal.addEventListener('click', e => {
    const b = e.target.closest('.cal-bar[data-id]'); if (!b || e.target.closest('.cal-bx')) return;
    const k = b.dataset.id + '|' + b.dataset.s;
    if (e.shiftKey || e.ctrlKey || e.metaKey) { SELB.has(k) ? SELB.delete(k) : SELB.add(k); }
    else if (secondClick(k)) return;   // segundo clic de un doble clic: abre la tarea, no la suelta
    else { const only = SELB.size === 1 && SELB.has(k); SELB.clear(); if (!only) SELB.add(k); }
    paintBarSel();
  });
  deselectOn('cal', () => { if (SELB.size) { SELB.clear(); paintBarSel(); } }, '.cal-bar, .cal-rz');
  // doble toque (o doble clic) en una barra: abre la tarea
  onDoubleTap(cal, '.cal-bar[data-id]', (b, e) => { if (e.target.closest('.cal-bx')) return; const t = P.calendar.tasks.find(x => x.id === b.dataset.id); if (t) calEdit(b, t); });
  // arrastrar barras: mover el tramo (y las demás seleccionadas) o cambiar su inicio y fin; las fechas cambian al soltar
  // (Esc las deja donde estaban)
  function dragBar(e, b, lifted) {
    const t = P.calendar.tasks.find(x => x.id === b.dataset.id); if (!t) return;
    const cw = cwNow(), si = +b.dataset.s || 0;
    const mode = e.target.classList && e.target.classList.contains('l') ? 'l' : e.target.classList && e.target.classList.contains('r') ? 'r' : 'm';
    const key = t.id + '|' + si;
    // con varias seleccionadas (y esta entre ellas) se mueven todas
    const group = mode === 'm' && SELB.has(key) && SELB.size > 1 ? [...SELB] : [key];
    const bars = group.map(k => { const [id, s2] = k.split('|'); const el = $(`.cal-bar[data-id="${id}"][data-s="${s2}"]`, cal); return el && { el, id, s: +s2, L: el.offsetLeft, W: el.offsetWidth }; }).filter(Boolean);
    const x0 = e.clientX, me = bars.find(x => x.el === b) || { el: b, L: b.offsetLeft, W: b.offsetWidth };
    const seg = segsOf(t)[si], s0 = seg.start, e0 = seg.end;
    let dd = 0, moved = !!lifted, real = false, lastX = e.clientX, raf = 0;
    bars.forEach(x => x.el.classList.add('drag'));
    document.body.classList.add('lifting');
    // el día de destino se ve en una etiqueta sobre la barra
    const tag = document.createElement('span'); tag.className = 'cal-dtag'; b.appendChild(tag);
    const paint = () => {
      const px = lastX - x0 + (sc.scrollLeft - sl0);
      if (Math.abs(px) > 4) moved = real = true;
      dd = Math.round(px / cw);
      if (mode === 'm') bars.forEach(x => { x.el.style.left = (x.L + dd * cw) + 'px'; });
      if (mode === 'r') b.style.width = Math.max(cw, me.W + dd * cw) + 'px';
      if (mode === 'l') { const d2 = Math.min(dd, diffD(s0, e0)); b.style.left = (me.L + d2 * cw) + 'px'; b.style.width = (me.W - d2 * cw) + 'px'; }
      tag.textContent = mode === 'r' ? fmtD(addD(e0, Math.max(dd, -diffD(s0, e0)))) : fmtD(addD(s0, mode === 'l' ? Math.min(dd, diffD(s0, e0)) : dd)) + (dd ? `  (${dd > 0 ? '+' : ''}${dd} d)` : '');
    };
    const sl0 = sc.scrollLeft;
    const tick = () => { edgeScroll(sc, lastX, 0, 'x'); paint(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    const mv = ev => { lastX = ev.clientX; };
    const up = ev => {
      cancelAnimationFrame(raf); offEsc();
      removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
      document.body.classList.remove('lifting'); tag.remove();
      bars.forEach(x => x.el.classList.remove('drag'));
      // el dedo sostenido y soltado sin mover: el color de la barra
      if (lifted && !real && e.pointerType === 'touch' && ev && ev.type === 'pointerup') { const x = lgCtxOf(b); render(); if (x) lgCtxOpen(x, { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }); return; }
      if (!moved || !dd || (ev && ev.type !== 'pointerup')) { render(); return; }
      if (mode === 'm') {
        for (const x of bars) {
          const tk = P.calendar.tasks.find(y => y.id === x.id); if (!tk) continue;
          const S = segsOf(tk).map(z => ({ ...z })), g = S[x.s]; if (!g) continue;
          g.start = addD(g.start, dd); g.end = addD(g.end, dd);
          tk.segs = S; syncSpan(tk);
        }
        if (bars.length > 1) toast(`${bars.length} barras movidas ${Math.abs(dd)} ${Math.abs(dd) === 1 ? 'día' : 'días'} ${dd > 0 ? 'después' : 'antes'}.`, 2400);
      } else {
        const S = segsOf(t).map(z => ({ ...z })), g = S[si];
        if (mode === 'r') g.end = addD(e0, Math.max(dd, -diffD(s0, e0)));
        if (mode === 'l') g.start = addD(s0, Math.min(dd, diffD(s0, e0)));
        t.segs = S; syncSpan(t);
      }
      changed('data'); render();
    };
    const offEsc = escCancel(() => up({ type: 'esc' }));
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  }
}
function calNewTask(ph, start, end) {
  const sh = calShoot();
  const first = sh.length ? sh[0].date : todayIso(), last = sh.length ? sh[sh.length - 1].date : todayIso();
  if (!start) {
    start = ph === 'pre' ? addD(first, -7) : ph === 'post' ? addD(last, 1) : ph === 'rod' ? first : todayIso();
    end = ph === 'rod' ? start : addD(start, 2);
  }
  const t = { id: uid('t'), ph: ph || 'pre', title: '', area: '', who: '', start, end: end || start, color: '', notes: '' };
  P.calendar.tasks.push(t);
  calEdit(null, t, true);
}
/* la tarea abierta como una tarjeta: etiqueta de color, responsable, fechas, lista de pendientes y notas */
function calEdit(anchor, t, isNew, defaults = {}) {
  const ed = calEditable();
  const dis = ed ? '' : 'disabled';
  let S = segsOf(t).map(x => ({ ...x }));
  let C = (t.check || []).map(x => ({ ...x }));
  let hl = t.hl || '', saved = false;
  const segsHTML = () => S.map((x, i) => `<div class="cal-seg" data-i="${i}"><input type="date" ${i ? '' : 'id="ctS"'} data-k="start" value="${ea(x.start)}" min="1900-01-01" max="2099-12-31" aria-label="Desde" ${dis}><span>→</span><input type="date" ${i ? '' : 'id="ctE"'} data-k="end" value="${ea(x.end)}" min="1900-01-01" max="2099-12-31" aria-label="Hasta" ${dis}>${ed && S.length > 1 ? `<button class="cal-segx" data-segdel="${i}" aria-label="Quitar esta fecha" title="Quitar esta fecha">${ICO.close}</button>` : ''}</div>`).join('');
  const ckHTML = () => C.map((x, i) => `<div class="kc-ck${ea(x.ok ? ' ok' : '')}" data-i="${i}"><input type="checkbox" data-ck="${i}" ${x.ok ? 'checked' : ''} ${dis} aria-label="Hecho"><input type="text" data-ckx="${i}" value="${esc(x.x)}" ${dis} aria-label="Pendiente">${ed ? `<button class="cal-segx" data-ckdel="${i}" aria-label="Quitar" title="Quitar">${ICO.close}</button>` : ''}</div>`).join('');
  const prog = () => { const ok = C.filter(x => x.ok).length; return C.length ? `<span class="kc-pn">${ok}/${C.length}</span><span class="kc-prog"><i style="width:${Math.round(ok / C.length * 100)}%"></i></span>` : ''; };
  const m = modal({
    title: isNew ? 'Tarea nueva' : 'Tarea',
    body: `<div class="kc" style="--c:${ea(taskColor(t))}">
      <input type="text" class="kc-title" id="ctT" value="${esc(t.title)}" placeholder="Casting, scouting, montaje…" aria-label="Nombre de la tarea" ${dis}>
      <div class="grid3"><label class="fld"><span>Fase</span><select id="ctP" ${dis}>${CAL_PH.map(([k, n]) => `<option value="${k}" ${(t.ph || 'pre') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="fld"><span>Área</span><input type="text" id="ctA" list="calAreas" value="${esc(t.area || '')}" placeholder="Arte, casting…" ${dis}></label>
        <label class="fld"><span>Responsable</span><input type="text" id="ctW" value="${esc(t.who || '')}" placeholder="Nombre" ${dis}></label></div>
      <div class="fld"><span>Etiqueta</span><div id="ctHl">${ed ? hlChooserHTML('cal', hl, 'Según la fase') : `<span class="hint">${esc(hlName(t, 'cal') || 'Según la fase')}</span>`}</div></div>
      <div class="fld"><span>${S.length > 1 ? 'Fechas' : 'Desde · hasta'}</span><div class="cal-segs" id="ctSegs">${segsHTML()}</div>${ed ? '<button class="linkbtn cal-segadd" data-segadd>+ Otra fecha en la misma línea</button>' : ''}</div>
      <div class="fld"><span class="kc-ckh">Lista de pendientes <span id="ctPg">${prog()}</span></span><div class="kc-cks" id="ctCk">${ckHTML()}</div>
        ${ed ? '<div class="kc-add"><input type="text" id="ctCn" placeholder="Agregar un pendiente y pulsar Intro" aria-label="Nuevo pendiente"><button class="btn sm" data-ckadd>Agregar</button></div>' : ''}</div>
      <label class="fld"><span>Notas</span><textarea id="ctN" rows="3" ${dis}>${esc(t.notes || '')}</textarea></label>
      <label class="opt-in"><input type="checkbox" id="ctD" ${t.done || defaults.done ? 'checked' : ''} ${dis}> Hecha</label>
      <datalist id="calAreas">${CAL_AREAS.map(a => `<option value="${ea(a)}">`).join('')}</datalist></div>`,
    foot: ed ? `<div class="left">${isNew ? '' : '<button class="btn danger" data-del>Eliminar</button>'}</div><button class="btn" data-close>Cancelar</button><button class="btn primary" data-ok>Listo</button>` : '<button class="btn primary" data-close>Cerrar</button>',
    onClose: () => { if (isNew && !saved) { P.calendar.tasks = P.calendar.tasks.filter(x => x !== t); changed('data'); render(); } },
  });
  m.classList.add('kc-modal');
  const p = m;
  // una fecha fuera de 1900-2099 (un año a medio escribir) no se toma; si el fin queda antes del inicio, se dan vuelta
  const readSegs = () => { $$('.cal-seg', p).forEach(r => { const i = +r.dataset.i, a = $('[data-k=start]', r).value, z = $('[data-k=end]', r).value; S[i].start = calIso(a) ? a : S[i].start; S[i].end = calIso(z) ? z : S[i].start; if (S[i].end < S[i].start) [S[i].start, S[i].end] = [S[i].end, S[i].start]; }); };
  const readCk = () => { $$('[data-ckx]', p).forEach(el => { const x = C[+el.dataset.ckx]; if (x) x.x = el.value; }); };
  const paintSegs = () => { $('#ctSegs', p).innerHTML = segsHTML(); };
  const paintCk = () => { $('#ctCk', p).innerHTML = ckHTML(); $('#ctPg', p).innerHTML = prog(); };
  const addCk = () => { const i = $('#ctCn', p), v = i.value.trim(); if (!v) return; readCk(); C.push({ id: uid('k'), x: v, ok: false }); i.value = ''; paintCk(); i.focus(); };
  p.addEventListener('click', e => {
    const c = e.target.closest('#ctHl [data-hl]');
    if (c) {
      const tint = () => { const ph = $('#ctP', p).value; $('.kc', p).style.setProperty('--c', taskColor({ hl, ph })); $('#ctHl', p).innerHTML = hlChooserHTML('cal', hl, 'Según la fase'); };
      if (c.dataset.hl === '+') { lgNew(c, 'cal', id => { hl = id; tint(); }); return; }
      hl = c.dataset.hl; tint(); return;
    }
    if (e.target.closest('[data-segadd]')) {
      readSegs();
      const l = S[S.length - 1], len = diffD(l.start, l.end);
      const st = addD(l.end, 7); S.push({ start: st, end: addD(st, len) }); paintSegs();
      const r = $$('.cal-seg', p).pop(); if (r) $('input', r).focus();
      return;
    }
    const del = e.target.closest('[data-segdel]'); if (del) { readSegs(); S.splice(+del.dataset.segdel, 1); paintSegs(); return; }
    const cd = e.target.closest('[data-ckdel]'); if (cd) { readCk(); C.splice(+cd.dataset.ckdel, 1); paintCk(); return; }
    if (e.target.closest('[data-ckadd]')) { addCk(); return; }
    if (e.target.closest('[data-del]')) { saved = true; histNote(`Eliminar «${t.title || 'Tarea'}»`); P.calendar.tasks = P.calendar.tasks.filter(x => x !== t); closeModal(); changed('data'); render(); toastUndo(`«${t.title || 'Tarea'}» eliminada.`); return; }
    if (e.target.closest('[data-ok]')) save();
  });
  p.addEventListener('change', e => { const ck = e.target.closest('[data-ck]'); if (ck) { readCk(); C[+ck.dataset.ck].ok = ck.checked; paintCk(); } if (e.target.id === 'ctP') $('.kc', p).style.setProperty('--c', taskColor({ hl, ph: e.target.value })); });
  p.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    e.preventDefault();
    if (e.target.id === 'ctCn') addCk(); else if (!e.target.dataset.ckx) save();
  });
  const save = () => {
    readSegs(); readCk();
    t.segs = S; syncSpan(t);
    Object.assign(t, { title: $('#ctT', p).value.trim() || 'Tarea', ph: $('#ctP', p).value, area: $('#ctA', p).value.trim(), who: $('#ctW', p).value.trim(), notes: $('#ctN', p).value, hl, done: $('#ctD', p).checked });
    const ck = C.filter(x => x.x.trim()); if (ck.length) t.check = ck; else delete t.check;
    if (!t.hl) delete t.hl; delete t.color; if (!t.done) delete t.done;
    saved = true; closeModal(); changed('data'); render();
  };
  // en el teléfono no se abre el teclado solo: tapa la ficha (se escribe al tocar el campo)
  if (ed && !matchMedia('(pointer:coarse)').matches) setTimeout(() => { const i = $('#ctT', p); if (i) { i.focus(); if (!isNew) i.select(); } }, 30);
}
/* ---------- tablero: columnas por fase o por estado, con tarjetas que se arrastran ---------- */
const KB_ST = [['todo', 'Por hacer'], ['doing', 'En curso'], ['done', 'Hechas']];
const taskState = t => t.done ? 'done' : t.start <= todayIso() ? 'doing' : 'todo';
/* la casilla redonda de cada tarjeta: marca la tarea como hecha (o la reabre) con un toque, sin abrir la ficha */
const KB_CK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.5 3.5 7.5-8"/></svg>';
const kbCheck = t => { const lab = t.title || 'Tarea', ed = calEditable();
  return `<button type="button" class="kb-ck" role="checkbox" aria-checked="${ea(!!t.done)}" data-done="${ea(t.id)}"${ed ? '' : ' disabled'} aria-label="${ea(t.done ? `Reabrir «${lab}»` : `Marcar «${lab}» como hecha`)}" title="${ea(t.done ? 'Hecha · tocar para reabrirla' : 'Marcar como hecha')}">${KB_CK}</button>`; };
function kbToggleDone(id) {
  const t = P.calendar.tasks.find(x => x.id === id); if (!t || !calEditable()) return;
  histNote(t.done ? `Reabrir «${t.title || 'Tarea'}»` : `Marcar «${t.title || 'Tarea'}» como hecha`);
  if (t.done) delete t.done; else t.done = true;
  changed('data'); render();
  toast(t.done ? `«${t.title || 'Tarea'}» hecha.` : `«${t.title || 'Tarea'}» vuelve a estar pendiente.`, 2400);
  const b = $(`.kb-ck[data-done="${CSS.escape(id)}"]`); if (b) b.focus({ preventScroll: true });   // para seguir con el teclado
}
function kbCardHTML(t) {
  const ck = checkOf(t), late = !t.done && t.end < todayIso();
  return `<article class="kb-card${ea(t.done ? ' done' : '')}" data-id="${ea(t.id)}" data-note="task:${ea(t.id)}" tabindex="0" style="--c:${ea(taskColor(t))}" aria-label="${esc(t.title || 'Tarea')}">
    <span class="kb-lab"></span>
    ${t.area ? `<span class="kb-area">${esc(t.area)}</span>` : ''}
    <span class="kb-tr">${kbCheck(t)}<b class="kb-t">${esc(t.title || 'Tarea')}</b></span>
    <span class="kb-meta"><span class="kb-chip${ea(t.done ? ' ok' : late ? ' late' : '')}" title="${esc(fmtRange(t))}">${t.done ? KB_I.ok : KB_I.cal}${esc(kbDates(t))}</span>
      ${ck.n ? `<span class="kb-chip${ea(ck.ok === ck.n ? ' ok' : '')}" title="Lista de pendientes">${KB_I.list}${ck.ok}/${ck.n}</span>` : ''}
      ${t.notes ? `<span class="kb-chip" title="Tiene notas">${KB_I.note}</span>` : ''}
      <span class="grow"></span>${t.who ? avatarHTML(t.who) : ''}<button class="kb-open" data-open="${ea(t.id)}" aria-label="Abrir «${esc(t.title || 'Tarea')}»" title="Abrir la tarea">${CAL_OPEN}</button></span></article>`;
}
function calBoardHTML(sh, ed) {
  const by = calKb(), cols = by === 'st' ? KB_ST : CAL_PH;
  const all = P.calendar.tasks.slice().sort((x, y) => x.start.localeCompare(y.start) || x.end.localeCompare(y.end));
  const shoot = sh.length ? `<button class="kb-card kb-shoot" data-act="cal-plan" style="--c:${ea(lgCol('cal', 'rod'))}" title="Las jornadas salen del stripboard"><span class="kb-lab"></span><b class="kb-t">Rodaje · ${sh.length} ${sh.length === 1 ? 'jornada' : 'jornadas'}</b>
    <span class="kb-meta"><span class="kb-chip">${KB_I.cal}${esc(shortD(sh[0].date))}${sh.length > 1 ? ' – ' + esc(shortD(sh[sh.length - 1].date)) : ''}</span><span class="grow"></span><span class="hint">Stripboard ›</span></span></button>` : '';
  return `<div class="scroller kb-sc" data-keep="calkb"><div class="kb-top"><span class="hint">Columnas</span><div class="seg" role="group" aria-label="Columnas del tablero">${[['ph', 'Por fase'], ['st', 'Por estado']].map(([k, n]) => `<button data-act="cal-kb" data-v="${k}" aria-pressed="${ea(by === k)}">${n}</button>`).join('')}</div></div>${ed ? tipHTML('cal-kb2', 'Mantén presionada una tarjeta y llévala a otra columna para cambiarla de fase (o, por estado, para marcarla hecha). Toca dos veces una tarjeta (o su flecha ⌄) para abrirla: etiqueta, responsable, fechas, lista de pendientes y notas.') : ''}
    <div class="kb" data-by="${ea(by)}">${cols.map(([k, n]) => {
    const list = all.filter(t => by === 'st' ? taskState(t) === k : (t.ph || 'pre') === k);
    const head = by === 'ph' && k === 'rod' ? shoot : '';
    return `<section class="kb-col" data-col="${k}"><header class="kb-h"><b>${n}</b><span class="kb-n">${list.length}</span></header>
      <div class="kb-list">${head}${list.map(kbCardHTML).join('')}${!list.length && !head ? '<p class="kb-empty">Sin tareas</p>' : ''}</div>
      ${ed && (by === 'ph' || k === 'todo') ? `<button class="kb-add" data-act="cal-add" data-ph="${ea(by === 'ph' ? k : 'pre')}">+ Agregar tarea</button>` : ''}</section>`;
  }).join('')}</div></div>`;
}
/* tablero como muro: las fases van en carriles de ancho fijo; cada una se pone debajo de la anterior mientras
   no pase el alto de la fase más larga, así las de pocas tareas se apilan y no queda una pared vacía */
function kbLayout() {
  const kb = $('.kb'); if (!kb) return;
  // mover las columnas de carril le quita el foco a lo que lo tenía (la casilla recién marcada): se lo devuelve
  const fa = kb.contains(document.activeElement) ? document.activeElement : null;
  if (fa) requestAnimationFrame(() => { if (fa.isConnected && document.activeElement !== fa) try { fa.focus({ preventScroll: true }); } catch (e) { } });
  const cols = [...kb.querySelectorAll('.kb-col')];
  kb.querySelectorAll('.kb-lane').forEach(l => { while (l.firstChild) kb.appendChild(l.firstChild); l.remove(); });
  cols.forEach(c => kb.appendChild(c));
  const W = kb.clientWidth, GAP = 0, LW = 300, max = Math.max(1, Math.floor((W + GAP) / (LW + GAP)));
  kb.classList.toggle('one', max <= 1);
  if (max <= 1) return;
  kb.style.setProperty('--lw', Math.min(380, Math.floor((W - GAP * (Math.min(max, cols.length) - 1)) / Math.min(max, cols.length))) + 'px');
  kb.classList.add('measure');
  const hs = cols.map(c => c.getBoundingClientRect().height);
  kb.classList.remove('measure');
  const H = Math.max(...hs) + 24, lanes = [];
  cols.forEach((c, i) => {
    const cur = lanes[lanes.length - 1];
    if (cur && cur.h + GAP + hs[i] <= H) { cur.els.push(c); cur.h += GAP + hs[i]; }
    else if (lanes.length < max) lanes.push({ els: [c], h: hs[i] });
    else { const lo = lanes.reduce((a, b) => b.h < a.h ? b : a); lo.els.push(c); lo.h += GAP + hs[i]; }
  });
  for (const L of lanes) { const d = document.createElement('div'); d.className = 'kb-lane'; L.els.forEach(c => d.appendChild(c)); kb.appendChild(d); }
}
function bindKanban() {
  const kb = $('.kb'); if (!kb) return;
  kbLayout();
  if (!kb._ro) { let w = kb.clientWidth; kb._ro = new ResizeObserver(() => { if (Math.abs(kb.clientWidth - w) > 20) { w = kb.clientWidth; kbLayout(); } }); kb._ro.observe(kb); }
  const open = el => { const t = P.calendar.tasks.find(x => x.id === el.dataset.id); if (t) calEdit(el, t); };
  kb.addEventListener('keydown', e => { if (e.target.closest('[data-done]')) return; const c = e.target.closest('.kb-card[data-id]'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(c); } });
  // abrir una tarjeta: doble toque sobre ella o sobre su flecha (un toque suelto no abre nada)
  doubleTap(kb, CAL_DBL, CAL_DBL_HINT);
  kb.addEventListener('click', e => {
    const d = e.target.closest('[data-done]'); if (d) { e.stopPropagation(); kbToggleDone(d.dataset.done); return; }
    const o = e.target.closest('[data-open]'); if (o) { e.stopPropagation(); open(o.closest('.kb-card')); }
  });
  onDoubleTap(kb, '.kb-card[data-id]', (c, e) => { if (!e.target.closest('[data-open],[data-done]')) open(c); });
  // mantener presionada una tarjeta la levanta para llevarla a otra columna; un toque solo la enfoca
  kb.addEventListener('pointerdown', e => {
    const card = e.target.closest('.kb-card[data-id]');
    if (!card || e.button !== 0 || e.target.closest('[data-open],[data-done]')) return;
    if (!calEditable() || e.pointerType === 'touch') return;
    pressGesture(e, { target: card, onLift: ev => kbDrag(ev, card) });
  });
  function kbDrag(e, card) {
    const r = card.getBoundingClientRect();
    const ghost = card.cloneNode(true); ghost.classList.add('kb-ghost');
    Object.assign(ghost.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' });
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    document.body.appendChild(ghost); card.classList.add('kb-ph'); kb.classList.add('dragging'); document.body.classList.add('lifting');
    let over = null;
    const mv = ev => {
      ghost.style.left = (ev.clientX - dx) + 'px'; ghost.style.top = (ev.clientY - dy) + 'px';
      ghost.hidden = true; const col = document.elementFromPoint(ev.clientX, ev.clientY); ghost.hidden = false;
      const c = col && col.closest('.kb-col');
      if (c !== over) {
        if (over) over.classList.remove('over'); over = c;
        if (over) {
          over.classList.add('over');
          // la columna de destino le hace espacio
          const list = $('.kb-list', over), cards = $$('.kb-card', list);
          if (card.parentNode !== list) { const snap = flipSnap(cards); list.appendChild(card); flipPlay(snap); }
        }
      }
    };
    const up = ev => {
      offEsc();
      removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
      ghost.remove(); card.classList.remove('kb-ph'); kb.classList.remove('dragging'); document.body.classList.remove('lifting'); if (over) over.classList.remove('over');
      const t = P.calendar.tasks.find(x => x.id === card.dataset.id);
      if (!t || !over || ev.type !== 'pointerup') { render(); return; }
      const k = over.dataset.col, by = calKb();
      if (by === 'ph') { if ((t.ph || 'pre') === k) return render(); t.ph = k; toast(`«${t.title}» pasó a ${CAL_PH.find(x => x[0] === k)[1]}.`); }
      else {
        if (taskState(t) === k) return render();
        if (k === 'done') t.done = true; else delete t.done;
        if (k === 'doing' && t.start > todayIso()) toast(`«${t.title}» empieza el ${fmtD(t.start)}: queda «Por hacer» hasta entonces.`, 3600);
        else toast(k === 'done' ? `«${t.title}» hecha.` : `«${t.title}» vuelve a estar pendiente.`);
      }
      changed('data'); render();
    };
    const offEsc = escCancel(() => up({ type: 'esc' }));   // Esc: la tarjeta vuelve a su columna
    addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
  }
}
function calTemplate() {
  const sh = calShoot();
  const F = sh.length ? sh[0].date : addD(todayIso(), 42), L = sh.length ? sh[sh.length - 1].date : addD(F, 4);
  const T = [
    ['pre', 'Desglose y stripboard', 'Producción', -42, -36], ['pre', 'Casting', 'Casting', -35, -21], ['pre', 'Scouting de locaciones', 'Locaciones', -35, -22],
    ['pre', 'Permisos de locación', 'Producción', -21, -10], ['pre', 'Diseño de arte y compras', 'Arte', -21, -5], ['pre', 'Pruebas de vestuario y maquillaje', 'Vestuario', -10, -6],
    ['pre', 'Lectura y ensayos', 'Dirección', -7, -3], ['pre', 'Prueba de cámara', 'Fotografía', -5, -5], ['pre', 'Reunión técnica', 'Producción', -3, -3], ['pre', 'Recojo de equipos', 'Producción', -1, -1],
    ['post', 'Respaldo y sincronización', 'Montaje', 1, 3], ['post', 'Montaje', 'Montaje', 3, 24], ['post', 'Música', 'Música', 14, 30], ['post', 'VFX y títulos', 'VFX', 20, 30],
    ['post', 'Diseño sonoro y mezcla', 'Sonido', 22, 34], ['post', 'Corrección de color', 'Color', 25, 32], ['post', 'Entrega final', 'Producción', 35, 38], ['post', 'Festivales y distribución', 'Distribución', 40, 70],
  ];
  const have = new Set(P.calendar.tasks.map(t => t.title.toLowerCase()));
  let n = 0;
  for (const [ph, title, area, a, b] of T) {
    if (have.has(title.toLowerCase()) || have.has(trData(title).toLowerCase())) continue;
    P.calendar.tasks.push({ id: uid('t'), ph, title: trData(title), area: trData(area), who: '', start: addD(ph === 'pre' ? F : L, a), end: addD(ph === 'pre' ? F : L, b), notes: '' });
    n++;
  }
  changed('data'); render();
  toast(n ? `${n} tareas agregadas alrededor del rodaje. Muévelas o bórralas a tu gusto.` : 'Ya tienes estas tareas.');
}
Object.assign(ACT, {
  'cal-mode': b => { UI.calMode = b.dataset.v; ls.set('calMode2', UI.calMode); UI.calView = 'tl'; render(); },
  'cal-kb': b => { UI.calKb = b.dataset.v; ls.set('calKb', UI.calKb); render(); },
  'cal-back': () => { UI.calView = 'tl'; UI.calScrollTo = UI.calDay; render(); },
  'cal-frame': b => { if (b.dataset.a) return calFrame(b.dataset.a, b.dataset.z); const t = P.calendar.tasks.find(x => x.id === b.dataset.id); if (t) calFrame(t.start, t.end); },
  'cal-all': () => { const R = calRange(); calFrame(R.a, R.b, 0); },
  'cal-go': b => {
    const sh = calShoot();
    UI.calDay = b.dataset.to === 'rodaje' && sh.length ? sh[0].date : todayIso();
    UI.calScrollTo = UI.calDay; render();
  },
  'cal-day': b => { UI.calDay = b.dataset.d; UI.calView = 'dia'; render(); },
  'cal-step': b => { UI.calDay = addD(UI.calDay, +b.dataset.d); render(); },
  'cal-tog': b => { const c = calClosed(), ph = b.dataset.ph; c.has(ph) ? c.delete(ph) : c.add(ph); ls.set('calClosed:' + P.id, [...c]); render(); },
  'cal-fold': () => { const all = CAL_PH.every(([k]) => calClosed().has(k)); ls.set('calClosed:' + P.id, all ? [] : CAL_PH.map(([k]) => k)); render(); },
  'cal-add': b => { const d = b.dataset.d; calNewTask(b.dataset.ph || (d ? (calShoot().some(x => x.date === d) ? 'rod' : 'pre') : 'pre'), d, d); },
  'cal-edit': b => { const t = P.calendar.tasks.find(x => x.id === b.dataset.id); if (t) calEdit(b, t); },
  'cal-plan': () => setTab('plan'),
  'cal-call': b => { UI.callDay = +b.dataset.n; setTab('call'); },
  'cal-tpl': () => calTemplate(),
});
Object.assign(BIND, {
  'cal-date': el => { if (el.value) { UI.calDay = el.value; render(); } },
  'cal-done': el => { const t = P.calendar.tasks.find(x => x.id === el.dataset.id); if (!t) return; if (el.checked) t.done = true; else delete t.done; changed('data'); render(); },
});
/* ---------- ajustes, ayuda y exportar ---------- */
SETTINGS.cal = () => calEditable()
  ? `<p class="hint" style="margin:0">Agrega un cronograma de partida con las tareas típicas de preproducción y posproducción, ubicadas según las fechas de rodaje del plan. Después muévelas, cámbialas o bórralas.</p><div class="menu"><button data-act="cal-tpl" data-pclose>Agregar tareas típicas</button></div>`
  : '<p class="hint" style="margin:0">Calendario de solo lectura.</p>';
HELP.cal = [
  ['Tres vistas', '«Meses» muestra hojas de mes, como un calendario de pared, con las tareas y el rodaje como barras de color; «Línea de tiempo», cada tarea como una barra sobre los días, por fase; «Tablero», tarjetas en columnas, por fase o por estado (por hacer, en curso, hechas). Las tres usan las mismas tareas y la app recuerda la última que usaste.'],
  ['Meses', 'Elige cuántos meses ver a la vez (1 a 4) y muévete con ‹ ›, o toca el nombre del mes para ir a cualquier mes y año. Al elegir una tarea que dura varios meses, la vista se abre hasta verla entera (hasta 4 meses; si dura más, desde su comienzo). Abajo de cada mes, una fila de notas para todo el equipo. Clic derecho en una barra (en el teléfono, mantén el dedo y suéltalo sin mover): su color.'],
  ['Moverse', 'Arrastra la fila de los días (arriba) para mover la línea de tiempo, o usa la rueda del mouse (Mayús + rueda: a los lados). También con el botón del medio o manteniendo la barra espaciadora.'],
  ['Acercar y alejar', 'Ctrl + rueda del mouse (o Alt + rueda) ensancha o estrecha los días. Arrastra la línea de la base de la tabla hacia abajo para agrandar las filas y hacia arriba para achicarlas; doble clic en ella vuelve al alto normal. En el teléfono, pellizca con dos dedos: a los lados, los días; arriba y abajo, las filas. «Ver todo» muestra toda la producción.'],
  ['Encuadrar', 'El ícono de cuatro esquinas junto al nombre de una tarea ajusta la línea de tiempo a lo que dura (con todas sus fechas). También «Jornadas de rodaje» y cada etapa.'],
  ['Tareas', 'En la fila de una fase (Preproducción, Rodaje, Posproducción), arrastra sobre los días para crear una tarea; en una fase vacía, en «+ Nueva tarea» (doble clic: un día). Arrastra una barra para moverla (en el teléfono, mantén el dedo un instante): la fecha cambia al soltar. Sus bordes cambian el inicio y el fin. Arrastra desde un espacio vacío para elegir varias barras con un recuadro y moverlas juntas. Un clic elige una barra y otro la suelta; un clic en un espacio vacío quita la selección. Doble clic (o dos toques) en una barra o su flecha ⌄ abre la tarea.'],
  ['La leyenda', 'Arriba de la tabla: el color de cada fase y las etiquetas con nombre. Toca un color para cambiarlo en todo el proyecto y en los PDF; «+ Color» suma una etiqueta. En la tarjeta de una tarea, «Etiqueta» elige una de la leyenda.'],
  ['La tarjeta de una tarea', 'Tiene etiqueta de color, área, responsable, fechas, lista de pendientes con su avance, notas y «Hecha». El avance de la lista se ve en la barra y en la tarjeta del tablero.'],
  ['Varias fechas en una línea', 'Si una tarea se repite (casting en dos rondas), Alt + arrastrar en su fila le agrega otra fecha, y doble clic agrega un día. En la tarjeta, «+ Otra fecha». Cada tramo se mueve y se estira por separado.'],
  ['Tablero', 'Mantén presionada una tarjeta y llévala a otra columna para cambiarla de fase o, por estado, para marcarla hecha. Con el mouse, un clic en la tarjeta (o en su flecha ⌄) la abre; en el teléfono, dos toques. En el celular, cambia la fase desde la tarjeta.'],
  ['Contraer y expandir', 'Toca el nombre de una fase para plegarla en una fila de resumen. «Contraer todo», arriba a la izquierda, pliega las fases.'],
  ['Rodaje', 'Las jornadas salen del stripboard y se actualizan solas. La flecha ⌄ de un día (en el encabezado) o de una jornada abre su detalle y su hoja de llamado (un clic; en el teléfono, dos toques).'],
];
EXPORTS.cal = () => [
  { label: 'Calendario por meses (PDF)', hint: 'Una hoja por mes, como en la vista Meses, con sus notas', run: btn => exportPDF('calmes', btn), pdf: { kind: 'calmes', opts: null } },
  { label: 'Calendario (PDF)', hint: 'La línea de tiempo y la lista de tareas, por fase', run: btn => exportPDF('calendar', btn), pdf: { kind: 'calendar', opts: null } },
  { label: 'Cronograma (Excel)', hint: 'Barras por día, como un diagrama de Gantt', run: () => exportCalXLSX(), pro: 'excel' },
];
/* ---------- Excel: una fila por tarea y una columna por día ---------- */
function exportCalXLSX() {
  if (!proGate('excel')) return;
  const R = calRange(), sh = calShoot(), shootSet = new Set(sh.map(x => x.date));
  const T = xlTab(), H = { bold: true, fill: T.bar, color: T.ink, line: T.line };   // los colores de la pestaña, como en la app
  const fixed = ['Fase', 'Tarea', 'Área', 'Responsable', 'Inicio', 'Fin'];
  const COLS = [16, 30, 14, 16, 13, 13, ...R.list.map(() => 3.6)];
  const rodC = lgCol('cal', 'rod'), SH = lgMix(rodC, '#FFFFFF', .2), SH2 = lgMix(rodC, '#FFFFFF', .1), SHI = lgMix(rodC, '#000000', .8);   // los días de rodaje, del color de «Rodaje»
  const cu = { hl: new Set() };
  for (const t of P.calendar.tasks) { if (t.hl && hlc(t, 'cal')) cu.hl.add(t.hl); else cu[LG.cal[t.ph] ? t.ph : 'pre'] = 1; }
  if (sh.length) cu.rod = 1;
  const lg = xlLegend(lgDocItems('calendar', cu), COLS);
  const rows = [
    { cells: [{ v: `${P.meta.title} · Calendario de producción`, cs: 6 + R.n, s: { bold: true, size: 16, font: 'title', fill: T.bar, color: T.ink, border: false, wrap: false } }], h: 30 },
    { cells: [{ v: '', cs: 6 + R.n, s: { fill: T.c, border: false } }], h: 4 },
    ...(lg.length ? [{ cells: [], h: 6 }, ...lg, { cells: [], h: 6 }] : []),
    { cells: [...fixed.map(() => ({ v: '', s: { border: false } })), ...(() => { const out = []; let i = 0; while (i < R.n) { const m = R.list[i].slice(0, 7); let j = i; while (j < R.n && R.list[j].slice(0, 7) === m) j++; out.push({ v: dOf(m + '-15').toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }), cs: j - i, s: { bold: true, h: 'left', fill: '#E4E7EB' } }); i = j; } return out; })()], h: 18 },
    { cells: [...fixed.map(v => ({ v, s: H })), ...R.list.map(d => ({ v: dOf(d).getDate(), s: { ...H, h: 'center', size: 8, ...(shootSet.has(d) ? { fill: SH, color: SHI } : {}) } }))], h: 20 },
  ];
  const line = (ph, title, area, who, a, z, color, segs) => ({ cells: [{ v: ph, s: { line: T.line } }, { v: title, s: { bold: true, line: T.line } }, { v: area, s: { line: T.line } }, { v: who, s: { line: T.line } }, { v: a ? fmtD(a) : '', s: { line: T.line } }, { v: z ? fmtD(z) : '', s: { line: T.line } },
    ...R.list.map(d => ({ v: '', s: a && (segs || [{ start: a, end: z }]).some(x => d >= x.start && d <= x.end) ? { fill: color } : { fill: shootSet.has(d) ? SH2 : [0, 6].includes(dOf(d).getDay()) ? '#F3F4F6' : undefined } }))] });
  for (const [ph, name] of CAL_PH) {
    if (ph === 'rod') for (const x of sh) rows.push(line(name, `Jornada ${x.n + 1}`, 'Rodaje', '', x.date, x.date, stageTone(P, x.stage).replace('#', '#')));
    for (const t of tasksOf(ph)) rows.push(line(name, t.title + (t.done ? ' ✓' : '') + (segsOf(t).length > 1 ? ` (${segsOf(t).length} fechas)` : ''), t.area || '', t.who || '', t.start, t.end, taskColor(t), segsOf(t)));
  }
  const hd = 4 + (lg.length ? lg.length + 2 : 0);
  const bytes = xlsxBook([{ name: 'Calendario', cols: COLS, rows, freeze: hd, landscape: true, printRows: `${hd}:${hd}` }], { title: P.meta.title + ' · Calendario' });
  offerFile(fileSafe(P.meta.title) + '_calendario.xlsx', new Blob([bytes], { type: XLSX_MIME }));
}
