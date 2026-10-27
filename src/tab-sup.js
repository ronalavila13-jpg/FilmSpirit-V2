/* ============================================================
   Pestaña 10 · HOJA DE SCRIPT — el registro de tomas de la jornada, la continuidad y el plano en cámara
   (lote AD, octubre de 2026: diseño propio, como lo usa la industria y cómodo en rodaje)
   · Computadora: la cabecera de la jornada (fecha, dirección, script y la tarjeta de cámara y el rollo de sonido en
     uso), el avance (planos, escenas, páginas, tomas, tiempo en pantalla) con los horarios, y por escena su registro
     de tomas en tabla, con el color de su tira (Plano | Toma | Estado | Hora | Dur. | Cám. | Son. | Notas), su
     continuidad y su tiempo. A la derecha, «En cámara»: el plano que se rueda, la toma con su cronómetro, Buena / OK /
     NG, la nota (escrita o dictada), «+ Toma» y «Siguiente plano»; debajo, las incidencias y las notas de la jornada.
     Las escenas completas se pliegan en una línea.
   · Celular: el plano en cámara, grande, y una barra fija abajo con «+ Toma» y «Siguiente plano» (para una mano).
   · Fotos de continuidad por escena y fotos de la hoja de papel llena (solo respaldo), en WebP de unos 200 kB.
   · Carga rápida: pasar al programa una hoja llenada a mano, una toma por fila, con el teclado.
   Los PDF (la hoja para imprimir, la hoja llena, el parte diario y los reportes), en sup-partes.js.

   Los datos (P.sup; todo lo del lote AD es opcional: los proyectos de antes se abren igual):
   · takes: { <plano>: [{ n, st: 'ng' | 'ok' | 'bn', t: hora, d: duración, r: tarjeta, s: sonido ('MOS': sin
     sonido), note, run }] }. run: cuándo empezó (ms) mientras corre el cronómetro; al marcarla queda su duración.
   · obs: { <plano>: observaciones }; mos: { <plano>: 1 }: plano MOS (todas sus tomas, sin sonido).
   · sc: { <escena>: { start, end, screen (tiempo rodado), plan (previsto), ward, props, mk, pos, txt, notes (las
     otras notas de continuidad), ph: [{ id, w, h }] (fotos), wild: [{ id, n, t, d, s, note }] (sonido wild o de
     ambiente: con su rollo de sonido, sin cámara) } }.
   · day: { <jornada>: { call, first, lu0, lu1 (almuerzo), last, wrap, extra, inc (incidencias, una por línea:
     «HH:MM texto»), notes, ph: [{ id, w, h }] (fotos de la hoja de papel) } }.
   · roll (tarjeta en cámara), sroll (rollo de sonido), supervisor (quien hace script).
   Las fotos van en FRAMES['sp~<foto>'] y viajan con la hoja de script (areas.js · frameSec).
   ============================================================ */
// (en inglés, «Buena» del diccionario es «Print (circled)»: en los botones y la tabla, «Print»)
const TAKE_ST = { ng: 'NG', ok: 'OK', bn: EN ? trDone('Print') : 'Buena' };
const SUP_TOP = 200 * 1024;     // las fotos de la hoja de script: WebP de unos 200 kB (en Safari, JPEG con el mismo tope)
const supEd = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('hoja'));
const supTakes = id => (P.sup.takes || {})[id] || [];
const supMos = id => !!(P.sup.mos && P.sup.mos[id]);
const isMos = v => /^\s*mos\s*$/i.test(String(v || ''));
/* el sonido de una toma: MOS si su plano es MOS (lo hereda); si no, el suyo */
const takeSnd = (id, t) => supMos(id) ? 'MOS' : t.s || '';
const spKey = pid => 'sp~' + pid;
// (en inglés, «Utilería» es el cargo en el glosario: aquí son los objetos)
const SUP_CONT = [['ward', 'Vestuario'], ['props', EN ? trDone('Props') : 'Utilería'], ['mk', 'Maquillaje y peinado'], ['pos', 'Posiciones'], ['txt', 'Cambios de texto'], ['notes', 'Notas']];
/* lo guardado, limpio (proyectos.js · sanitizeProject): la forma de lo nuevo del lote AD */
function supClean(Su) {
  if (!Su || typeof Su !== 'object') return;
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  for (const k of ['takes', 'sc', 'day']) if (!obj(Su[k])) Su[k] = {};
  for (const k of ['obs', 'mos']) if (Su[k] != null && !obj(Su[k])) delete Su[k];
  const okId = x => typeof x === 'string' && /^[\w-]{1,40}$/.test(x);
  const phs = (m, f) => { if (!(f in m)) return; const a = Array.isArray(m[f]) ? m[f].filter(p => obj(p) && okId(p.id)) : []; if (a.length) m[f] = a; else delete m[f]; };
  for (const L of Object.values(Su.takes)) if (Array.isArray(L)) for (const t of L) if (t && 'run' in t && !(+t.run > 0)) delete t.run;
  for (const [k, m] of Object.entries(Su.sc)) {
    if (!obj(m)) { delete Su.sc[k]; continue; }
    phs(m, 'ph');
    if ('wild' in m) { const a = Array.isArray(m.wild) ? m.wild.filter(w => obj(w) && okId(w.id)) : []; if (a.length) m.wild = a; else delete m.wild; }
  }
  for (const [k, m] of Object.entries(Su.day)) { if (!obj(m)) { delete Su.day[k]; continue; } phs(m, 'ph'); }
}
/* ---------- tiempos ---------- */
/* segundos de lo que se escribe: «1:20», «1'20"», «80», «45 s», «2 min» (null si no se entiende) */
function supSecs(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase().replace(/[″"]/g, '').replace(/[′']/g, ':').replace(/\s+/g, '').replace(/:$/, '');
  if (!s) return null;
  let m = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s);
  if (m) return m[3] != null ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2];
  m = /^(\d+(?:[.,]\d+)?)(?:s|seg|segs|sec)?$/.exec(s); if (m) return Math.round(parseFloat(m[1].replace(',', '.')));
  m = /^(\d+(?:[.,]\d+)?)(?:m|min|mins)$/.exec(s); if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 60);
  return null;
}
/* «1:49» (o «1:02:30» con horas) */
const supFmt = s => { if (s == null || !isFinite(s)) return ''; s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
/* el cronómetro: «00:18» */
const supClock = ms => { const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m).padStart(2, '0')) + ':' + String(x).padStart(2, '0'); };
/* el tiempo en pantalla previsto de una escena: el anotado o, si no, una página de guion = un minuto */
const supPlanSecs = k => { const v = supSecs((P.sup.sc[k] || {}).plan); return v != null ? v : Math.round(scenePages(k) * 7.5); };
const supRealSecs = k => supSecs((P.sup.sc[k] || {}).screen);
const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
/* la toma que se marca: la que está rodando o la última del plano */
const supCurTake = id => { const L = supTakes(id); return L.find(t => t.run) || L[L.length - 1] || null; };
/* parar el cronómetro: la duración queda anotada (si pasó más de una hora, se olvidó: no se anota) */
function supStop(t) {
  if (!t || !t.run) return false;
  const s = Math.floor((Date.now() - t.run) / 1000);   // lo que mostraba el cronómetro
  if (s >= 0 && s < 3600) t.d = supFmt(s);
  delete t.run;
  return true;
}
const supStopAll = () => { let n = 0; for (const L of Object.values(P.sup.takes || {})) if (Array.isArray(L)) for (const t of L) if (supStop(t)) n++; return n; };
/* la primera y la última toma con hora de estos planos */
function supFirstLast(shots) {
  let a = null, b = null;
  for (const sh of shots) for (const t of supTakes(sh.id)) { const m = hmToMin(normHM(t.t || '')); if (m == null) continue; if (!a || m < a.m) a = { m, t: normHM(t.t) }; if (!b || m > b.m) b = { m, t: normHM(t.t) }; }
  return [a ? a.t : '', b ? b.t : ''];
}
/* ---------- la jornada elegida ---------- */
function supScenes() {
  const { days, bank } = scheduleDays(P, D.sc);
  if (UI.supDay === -1) return D.sc.scenes.map(s => s.key);
  if (UI.supDay === -2) return bank;
  const d = days[UI.supDay];
  return d ? d.keys : [];
}
/* el plano en cámara: el que se eligió (aunque ya esté rodado) o el primero sin rodar */
function supCur(shots) { const c = shots.find(x => x.id === UI.supCur); return c || shots.find(x => !x.done) || null; }
/* el que sigue: el próximo sin rodar después del que está en cámara (si no hay, uno anterior sin rodar) */
function supNextOf(shots, cur) { const i = shots.indexOf(cur); return shots.slice(i + 1).find(x => !x.done) || shots.slice(0, Math.max(0, i)).find(x => !x.done) || null; }
function supCtx() {
  const { days, bank } = scheduleDays(P, D.sc);
  if (UI.supDay >= days.length) UI.supDay = days.length ? 0 : -1;
  if (!days.length && UI.supDay >= 0) UI.supDay = -1;
  const dates = shootDates(P, days.length), n = UI.supDay;
  const keys = supScenes(), shots = keys.flatMap(k => D.shotsBy[k] || []);
  const day = n >= 0 ? days[n] : null, dayKey = day ? day.id : null;
  return { days, bank, dates, n, keys, shots, day, dayKey, dm: dayKey ? (P.sup.day[dayKey] || {}) : null, cur: supCur(shots), ed: supEd() };
}
function supStats(X) {
  const { keys, shots } = X;
  const scDone = keys.filter(sceneDone), takes = shots.flatMap(s => supTakes(s.id));
  const reals = keys.map(supRealSecs).filter(v => v != null);
  return { done: shots.filter(s => s.done).length, scDone, ePl: keys.reduce((a, k) => a + scenePages(k), 0), eDn: scDone.reduce((a, k) => a + scenePages(k), 0),
    takes: takes.length, good: takes.filter(t => t.st === 'bn').length, plan: keys.reduce((a, k) => a + supPlanSecs(k), 0), real: reals.reduce((a, b) => a + b, 0), hasReal: reals.length > 0 };
}
/* tarjetas de cámara (r) o rollos de sonido (s) anotados en las tomas de estos planos, en orden de aparición
   (los rollos de sonido, también los del sonido wild de sus escenas) */
function supRolls(shots, f = 'r') {
  const out = [], add = v => { if (v && !out.includes(v) && !(f === 's' && isMos(v))) out.push(v); };
  for (const sh of shots) for (const t of supTakes(sh.id)) add(f === 's' ? takeSnd(sh.id, t) : t[f]);
  if (f === 's') for (const k of [...new Set(shots.map(sh => sh.sc))]) for (const w of (P.sup.sc[k] || {}).wild || []) add(w.s);
  return out;
}
/* duración de la jornada (h:mm) del llamado al fin; pasada la medianoche, cuenta el día siguiente */
function supLen(a, b) {
  const x = hmToMin(a), y = hmToMin(b);
  if (x == null || y == null) return '';
  const m = (y - x + 1440) % 1440 || 0;
  return m ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : '';
}
const supTech = sh => [sh.size, sh.angle && sh.angle !== 'Normal' ? sh.angle : '', sh.move && sh.move !== 'Fijo' ? sh.move : '', sh.lens ? sh.lens + 'mm' : ''].filter(Boolean).join(' · ');
const supDesc = sh => sh.desc || shotTextExcerpt(sh, 110) || '';
const supKind = sh => sh.of && P.shots[sh.of] ? (sh.pu ? 'pick-up' : 'no previsto') : '';
/* la tira de la escena (las cuatro de la industria, del plan de rodaje): el número va sobre su color */
const supStripC = s => stripColor(s);
function supNo(s, cls = '') {
  const c = supStripC(s), L = (h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return 1; const n = parseInt(m[1], 16); return ((n >> 16) * .299 + (n >> 8 & 255) * .587 + (n & 255) * .114) / 255; })(c);
  return `<span class="hs-no${ea(lgDark(c))}${L > .95 ? ' wh' : ''}${cls ? ' ' + cls : ''}" style="--strip:${ea(c)}">${esc(s.key)}</span>`;
}
const supDayTitle = X => {
  const { n, dates, days } = X, dt = n >= 0 ? dates[n] : null;
  if (n === -1) return 'Todas las escenas';
  if (n === -2) return 'Sin programar';
  const d = dt ? dt.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  return dt ? capFirst(EN ? d : d.replace(',', '')) : `Jornada ${n + 1}`;
};
/* ---------- la vista ---------- */
const SUPV = { phone: false };
RENDER.sup = function () {
  const v = $('#view');
  if (!D.sc.scenes.length) { v.innerHTML = emptyScript(); bindView(); return; }
  const X = supCtx(), phone = SUPV.phone = PHONE();
  if (!UI.supFold) UI.supFold = {};
  v.innerHTML = `<div class="ws ws-1"><section class="center">${supBarHTML(X)}${legendHTML('sup')}
    <div class="scroller pad" data-keep="sup">${phone ? supPhoneHTML(X) : supDeskHTML(X)}</div>${phone ? supDockHTML(X) : ''}</section></div>`;
  bindView();
  supAfter(v);
};
addEventListener('resize', debounce(() => { if (typeof P === 'undefined' || !P || UI.tab !== 'sup') return; if (SUPV.phone !== PHONE()) render(); else supVH(); }, 200));
function supBarHTML(X) {
  const { days, bank, dates } = X;
  return `<div class="bar">
      <select data-bind="sup-day" style="max-width:320px" aria-label="Jornada">
        ${days.map((d, i) => `<option value="${i}" ${UI.supDay === i ? 'selected' : ''}>Jornada ${i + 1}${dates[i] ? ' · ' + esc(fmtDate(dates[i])) : ''} · ${d.keys.length} esc.</option>`).join('')}
        ${bank.length ? `<option value="-2" ${UI.supDay === -2 ? 'selected' : ''}>Sin programar · ${bank.length} esc.</option>` : ''}
        <option value="-1" ${UI.supDay === -1 ? 'selected' : ''}>Todas las escenas</option>
      </select>
      <span class="grow"></span>
      ${X.ed && X.dayKey ? `<button type="button" class="btn ghost hide-sm" data-act="sup-quick" title="Pasar al programa una hoja llenada a mano, una toma por fila">Carga rápida</button>` : ''}
      ${toolsHTML()}
      ${X.dayKey ? `<button type="button" class="btn primary hs-parte hide-sm" data-act="sup-parte" title="Resumen de la jornada para producción (PDF)">${HD_ICO.doc}<span>Parte diario</span></button>` : ''}
    </div>`;
}
/* después de pintar: el cronómetro, los campos que crecen con su texto, las secciones del celular y las fotos que faltan */
function supAfter(v) {
  supTick();
  supVH(v);
  $$('textarea.hs-grow', v).forEach(supGrow);
  $$('details[data-md]', v).forEach(d => d.addEventListener('toggle', () => { (UI.supMd || (UI.supMd = {}))[d.dataset.md] = d.open; }));
  const keys = $$('[data-sp]', v).map(x => x.dataset.sp);
  if (keys.length) candFramesNeed(keys, 'sup');
}
/* «En cámara» queda a la vista al bajar por el registro: a lo sumo, el alto visible de la vista */
const supVH = (v = $('#view')) => { const sc = v && $('.scroller', v), hs = sc && $('.hs', sc); if (hs) hs.style.setProperty('--hs-vh', Math.max(320, sc.clientHeight - 40) + 'px'); };
const supGrow = el => { el.style.height = 'auto'; el.style.height = Math.max(el.scrollHeight, 20) + 'px'; };

/* ---------- computadora ---------- */
function supDeskHTML(X) {
  const S = supStats(X);
  return `<div class="hs"><section class="hd hs-hd" aria-label="Cabecera de la hoja de script">${supTopHTML(X)}${supProgHTML(X, S)}</section>
    <div class="hs-body"><div class="hs-log">${supLogHTML(X)}</div>
      <aside class="hs-side" aria-label="En cámara y jornada">${supCamHTML(X)}${supDaySideHTML(X)}</aside></div></div>`;
}
/* la cabecera: el día (con ‹ › de jornada), el proyecto, dirección y script; los chips del material en uso */
function supTopHTML(X) {
  const { n, days } = X;
  const stepA = i => i >= 0 && i < days.length ? `data-act="sup-go" data-d="${i}"` : null;
  const dirs = (P.meta.directors || []).map(personName).filter(Boolean);
  const who = P.sup.supervisor ? `<b>${esc(P.sup.supervisor)}</b>` : X.ed ? `<button type="button" class="hs-link" data-act="sup-who">Agregar</button>` : '<span class="hs-ph">Sin anotar</span>';
  return `<header class="hs-top"><div class="hs-tt">
      <div class="hs-kick">Hoja de script · Parte diario de continuidad</div>
      <h2 class="hs-title">${n >= 0 ? `<span>Jornada ${n + 1} de ${days.length}</span><span class="hs-dot" aria-hidden="true">·</span>` : ''}<span>${esc(supDayTitle(X))}</span>${n >= 0 && days.length > 1 ? hdStep(stepA(n - 1), stepA(n + 1)) : ''}</h2>
      <p class="hs-sub"><span>${esc(P.meta.title)}</span>${dirs.length ? ` · <span>Dirección:</span> <b>${esc(dirs.join(', '))}</b>` : ''} · <span>Script:</span> ${who}</p>
    </div>${supChipsHTML(X)}</header>`;
}
function supChipsHTML(X) {
  const chip = (lab, v, f) => X.ed ? `<button type="button" class="hs-chip${v ? '' : ' empty'}" data-act="sup-rolls" data-k="${f}" aria-haspopup="dialog" title="Cambia la tarjeta o el rollo cuando cambien: las tomas nuevas los anotan solos">${v ? `<span>${lab}</span> <b>${esc(v)}</b>` : `<span>+ ${lab}</span>`}</button>`
    : v ? `<span class="hs-chip"><span>${lab}</span> <b>${esc(v)}</b></span>` : '';
  return `<div class="hs-chips">${chip('Cámara', P.sup.roll, 'roll')}${chip('Sonido', P.sup.sroll, 'sroll')}</div>`;
}
/* el avance de la jornada y, debajo, sus horarios */
function supProgHTML(X, S) {
  const { shots, keys, dm, dayKey, ed } = X;
  const pct = shots.length ? (S.done / shots.length * 100).toFixed(1) : 0;
  const cell = (lab, big, small, more = '') => `<div class="hs-pc"><div class="hs-lab">${lab}</div><div class="hs-big tnum">${big}${small ? ` <small>${small}</small>` : ''}</div>${more}</div>`;
  const prog = cell('Planos rodados', S.done, `de ${shots.length}`, `<div class="hs-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${ea(shots.length)}" aria-valuenow="${ea(S.done)}" aria-label="Planos rodados"><i style="width:${ea(pct)}%"></i></div>`)
    + cell('Escenas completas', S.scDone.length, `de ${keys.length}`)
    + cell('Páginas', esc(fmtEighths(S.eDn)), `de ${esc(fmtEighths(S.ePl))}`)
    + cell('Tomas', S.takes, S.takes ? `${S.good} ${S.good === 1 ? 'buena' : 'buenas'}` : '')
    + cell('Tiempo en pantalla', S.hasReal ? supFmt(S.real) : '0:00', `de ${supFmt(S.plan)}`);
  let hours = '';
  if (dm) {
    const [f0, l0] = supFirstLast(shots), callPlan = !dm.call && P.schedule.call ? P.schedule.call : '';
    // auto: lo que vale si no se escribe nada (el llamado del plan, la primera y la última toma anotadas); ph: qué va ahí
    const tm = (f, lab, auto, ph = 'Hora') => ed ? `<input type="text" inputmode="numeric" class="tm hs-hv" maxlength="8" value="${esc(dm[f] || '')}" placeholder="${esc(auto || ph)}" data-bind="sup-dayf" data-f="${f}" data-id="${ea(dayKey)}" aria-label="${ea(lab)}">`
      : `<b class="hs-hv${dm[f] ? '' : ' ph'}">${esc(dm[f] || auto || '—')}</b>`;
    const L = supLen(dm.call || P.schedule.call, dm.wrap);
    const h = (lab, val, cls = '', sub = '') => `<div class="hs-hc${cls}"><span class="hs-hl">${lab}${sub}</span>${val}</div>`;
    hours = `<div class="hs-hours">${h('Llamado', tm('call', 'Llamado', callPlan), callPlan ? ' plan' : '', callPlan ? ' <small>del plan</small>' : '')}${h('Primera toma', tm('first', 'Primera toma', f0))}
      ${h('Almuerzo', `<span class="hs-lu">${tm('lu0', 'Almuerzo: desde', '', 'Inicio')}<span aria-hidden="true">–</span>${tm('lu1', 'Almuerzo: hasta', '', 'Fin')}</span>`)}${h('Última toma', tm('last', 'Última toma', l0))}
      ${h('Fin de jornada', tm('wrap', 'Fin de jornada'), '', L ? ` <small class="tnum">${esc(L)} h</small>` : '')}
      ${h('Horas extra', ed ? `<input type="text" class="hs-hv" value="${esc(dm.extra || '')}" placeholder="Agregar" data-bind="sup-dayf" data-f="extra" data-id="${ea(dayKey)}" aria-label="Horas extra" title="Para el parte diario">` : `<b class="hs-hv${dm.extra ? '' : ' ph'}">${esc(dm.extra || '—')}</b>`)}</div>`;
  }
  return `<section class="hs-card hs-prog" aria-label="Avance de la jornada"><div class="hs-pcs">${prog}</div>${hours}</section>`;
}
/* las escenas, en el orden de la jornada: la que se rueda, abierta; las completas, en una línea; las que siguen, juntas */
function supLogHTML(X) {
  const { keys, cur } = X;
  if (!keys.length) return '<p class="hint hs-empty">No hay escenas en esta jornada.</p>';
  const curK = cur ? cur.sc : null, out = [];
  let pend = [];
  const flush = () => { if (pend.length) out.push(`<section class="hs-card hs-pend" aria-label="Escenas que siguen">${pend.join('')}</section>`); pend = []; };
  for (const k of keys) {
    const s = sceneOfKey(k); if (!s) continue;
    const open = k in UI.supFold ? UI.supFold[k] : k === curK;
    if (open) { flush(); out.push(supSceneHTML(X, s)); }
    else if (sceneDone(k)) { flush(); out.push(supDoneHTML(s)); }
    else pend.push(supPendHTML(s));
  }
  flush();
  return out.join('');
}
const supFoldBtn = (k, open) => `<button type="button" class="hs-fold" data-act="sup-fold" data-k="${ea(k)}" aria-expanded="${open}" aria-label="${ea(`${open ? 'Contraer' : 'Desplegar'} la escena ${k}`)}" title="${open ? 'Contraer' : 'Desplegar'}">${ICO.chev}</button>`;
function supDoneHTML(s) {
  const shots = D.shotsBy[s.key] || [], takes = shots.flatMap(sh => supTakes(sh.id)), good = takes.filter(t => t.st === 'bn').length, r = supRealSecs(s.key);
  return `<section class="hs-card hs-sc hs-closed" id="sup-${ea(s.idx)}"><div class="hs-sch">${supNo(s)}<div class="hs-scm"><h3>${esc(s.heading)}</h3>
    <p class="hs-sum"><span class="hs-okt">✓ Completa</span> · <span>${shots.length} ${shots.length === 1 ? 'plano' : 'planos'}</span> · <span>${takes.length} ${takes.length === 1 ? 'toma' : 'tomas'}</span> · <span>${good} ${good === 1 ? 'buena' : 'buenas'}</span>${r != null ? ` · <span class="tnum">${esc(supFmt(r))}</span> <span>en pantalla</span>` : ''}</p></div>${supFoldBtn(s.key, false)}</div></section>`;
}
function supPendHTML(s) {
  const shots = D.shotsBy[s.key] || [];
  return `<button type="button" class="hs-pr" data-act="sup-fold" data-k="${ea(s.key)}" aria-expanded="false" id="sup-${ea(s.idx)}">${supNo(s, 'sm')}<span class="hs-prh">${esc(s.heading)}</span>
    <span class="hs-prm"><span class="tnum">${esc(fmtEighths(D.metrics.eighths[s.idx]))}</span> <span>pág.</span> · <span class="tnum">${shots.filter(x => x.done).length} de ${shots.length}</span> <span>planos</span></span><span class="hs-prc" aria-hidden="true">${ICO.chev}</span></button>`;
}
/* una escena abierta: su registro de tomas, su continuidad y su tiempo */
function supSceneHTML(X, s) {
  const k = s.key, shots = D.shotsBy[k] || [], m = P.sup.sc[k] || {}, ed = X.ed;
  const cast = sceneCast(s.idx).map(e => e.name), done = shots.filter(x => x.done).length;
  const syn = synopsisOf(s);
  const rows = shots.map(sh => supShotRows(X, sh)).join('') + supWildRows(X, s);
  const own = shots.filter(x => !x.of || !P.shots[x.of] || P.shots[x.of].sc !== k).length;
  return `<section class="hs-card hs-sc" id="sup-${ea(s.idx)}" data-k="${ea(k)}">
    <header class="hs-sch">${supNo(s)}<div class="hs-scm"><h3>${esc(s.heading)}</h3>${syn ? `<p>${esc(syn)}</p>` : ''}</div>
      <div class="hs-scr"><b><span class="tnum">${esc(fmtEighths(D.metrics.eighths[s.idx]))}</span> <span>pág.</span>${cast.length ? ` · ${esc(cast.join(', '))}` : ''}</b><span><span class="tnum">${done} de ${shots.length}</span> <span>planos</span>${sceneDone(k) ? ' · <span class="hs-okt">✓ Completa</span>' : ''}</span></div>${supFoldBtn(k, true)}</header>
    ${shots.length || (m.wild || []).length ? `<div class="hs-tw"><table class="hs-t"><colgroup><col class="c-pl"><col class="c-tk"><col class="c-st"><col class="c-h"><col class="c-d"><col class="c-c"><col class="c-s"><col class="c-n"></colgroup>
      <thead><tr><th scope="col">Plano</th><th scope="col">Toma</th><th scope="col">Estado</th><th scope="col">Hora</th><th scope="col">Dur.</th><th scope="col">Cám.</th><th scope="col">Son.</th><th scope="col">Notas</th></tr></thead>
      <tbody>${rows}</tbody></table></div>` : `<p class="hint hs-noshot">Esta escena no tiene planos. Créalos en el guion o el storyboard, o agrega uno aquí.</p>`}
    ${ed ? `<div class="hs-tfoot"><button type="button" class="hs-pill" data-act="sup-add" data-i="${ea(s.idx)}" title="Agrega un plano al final de la escena con la numeración normal">+ Plano ${esc(k)}.${own + 1}</button><button type="button" class="hs-pill" data-act="sup-wild" data-k="${ea(k)}" title="Sonido grabado sin cámara: con su rollo de sonido y una nota">+ Wild / ambiente</button></div>` : ''}
    ${supContHTML(X, s)}</section>`;
}
/* las filas de un plano: su celda (rowspan) y una fila por toma */
function supShotRows(X, sh) {
  const id = sh.id, takes = supTakes(id), cur = X.cur === sh, ed = X.ed, kind = supKind(sh), code = D.code[id];
  const obs = (P.sup.obs || {})[id];
  const cell = `<td class="hs-pl" rowspan="${Math.max(1, takes.length)}" data-note="shot:${ea(id)}">
      <div class="hs-plh">${ed ? `<input type="checkbox" class="hs-chk" data-bind="sup-done" data-id="${ea(id)}" ${sh.done ? 'checked' : ''} aria-label="${ea(`Plano ${code} rodado`)}" title="Rodado">` : sh.done ? '<span class="hs-chk on" aria-label="Rodado">✓</span>' : ''}
        ${ed && !cur ? `<button type="button" class="hs-code" data-act="sup-cam" data-id="${ea(id)}" title="Poner en cámara">${esc(code)}</button>` : `<b class="hs-code">${esc(code)}</b>`}
        ${cur ? '<span class="hs-live">● En cámara</span>' : ''}${kind ? `<small class="hs-kind">${esc(kind)}</small>` : ''}${supMos(id) ? '<span class="hs-mosb">MOS</span>' : ''}</div>
      ${supTech(sh) ? `<div class="hs-plt">${esc(supTech(sh))}</div>` : ''}<div class="hs-pld">${esc(supDesc(sh) || 'Sin descripción')}</div>
      ${obs || SUPNOTE.has(id) ? (ed ? `<textarea class="hs-obs hs-grow" rows="1" data-bind="sup-obs" data-id="${ea(id)}" placeholder="Observaciones del plano: rácord, foco, sonido, cambios de texto…" aria-label="${ea(`Observaciones del plano ${code}`)}">${esc(obs || '')}</textarea>` : `<div class="hs-obs">${esc(obs)}</div>`) : ''}
      ${ed && takes.length ? `<div class="hs-pla"><button type="button" class="hs-mini" data-act="take-add" data-id="${ea(id)}">+ Toma</button><button type="button" class="hs-mini icon" data-act="sup-more" data-id="${ea(id)}" aria-label="${ea(`Más acciones del plano ${code}`)}" title="Plano MOS, no previsto, pick-up, nota…">${ICO.more}</button></div>` : ''}</td>`;
  const cls = `hs-r${cur ? ' cur' : ''}${sh.done ? ' done' : ''}`;
  if (!takes.length) return `<tr class="${cls}">${cell}<td colspan="7" class="hs-none"><div><span>Sin tomas</span>${ed ? `<button type="button" class="hs-pill" data-act="take-add" data-id="${ea(id)}">+ Toma</button><button type="button" class="hs-mini icon" data-act="sup-more" data-id="${ea(id)}" aria-label="${ea(`Más acciones del plano ${code}`)}" title="Plano MOS, no previsto, pick-up, nota…">${ICO.more}</button>` : ''}</div></td></tr>`;
  return takes.map((t, i) => {
    const A = `data-act="take" data-id="${ea(id)}" data-n="${i}"`, snd = takeSnd(id, t);
    return `<tr class="${cls}${i === takes.length - 1 ? ' last' : ''}">${i ? '' : cell}
      <td class="hs-c-tk" ${ed ? A : ''}>${ed ? `<button type="button" class="hs-tn${t.st === 'bn' ? ' bn' : ''}" ${A} aria-label="${ea(`Toma ${t.n}: ${t.run ? 'rodando' : TAKE_ST[t.st]}. Cambiar estado, hora, tarjeta, sonido o nota`)}">${esc(t.n)}</button>` : `<span class="hs-tn${t.st === 'bn' ? ' bn' : ''}">${esc(t.n)}</span>`}</td>
      <td ${ed ? A : ''}>${t.run ? '<span class="hs-run">● Rodando</span>' : `<span class="hs-st ${ea(t.st)}">${esc(TAKE_ST[t.st])}</span>`}</td>
      <td class="tnum" ${ed ? A : ''}>${esc(t.t || '')}</td>
      <td class="tnum" ${ed ? A : ''}>${t.run ? `<span data-sup-run="${ea(t.run)}">${supClock(Date.now() - t.run)}</span>` : esc(t.d || '')}</td>
      <td ${ed ? A : ''}>${esc(t.r || '')}</td>
      <td ${ed ? A : ''}>${isMos(snd) ? '<span class="hs-mosb">MOS</span>' : esc(snd)}</td>
      <td class="hs-c-n" ${ed ? A : ''}>${esc(t.note || '')}</td></tr>`;
  }).join('');
}
/* el sonido wild o de ambiente de la escena: con su rollo de sonido, sin cámara */
function supWildRows(X, s) {
  const W = (P.sup.sc[s.key] || {}).wild || []; if (!W.length) return '';
  return W.map((w, i) => {
    const A = X.ed ? `data-act="sup-wild-ed" data-k="${ea(s.key)}" data-n="${i}"` : '';
    return `<tr class="hs-r hs-wr${i === W.length - 1 ? ' last' : ''}">${i ? '' : `<td class="hs-pl" rowspan="${W.length}"><div class="hs-plh"><b class="hs-code">Wild</b></div><div class="hs-plt">Sonido sin cámara · ambiente</div></td>`}
      <td class="hs-c-tk" ${A}>${X.ed ? `<button type="button" class="hs-tn" ${A} aria-label="${ea(`Sonido wild ${i + 1}: cambiar rollo, hora o nota`)}">W${i + 1}</button>` : `<span class="hs-tn">W${i + 1}</span>`}</td>
      <td ${A}><span class="hs-st wd">Wild</span></td><td class="tnum" ${A}>${esc(w.t || '')}</td><td class="tnum" ${A}>${esc(w.d || '')}</td><td ${A}>—</td><td ${A}>${esc(w.s || '')}</td><td class="hs-c-n" ${A}>${esc(w.note || '')}</td></tr>`;
  }).join('');
}
/* la continuidad (con sus fotos) y el tiempo en pantalla de la escena */
function supContHTML(X, s) {
  const k = s.key, m = P.sup.sc[k] || {}, ed = X.ed;
  const fld = (f, lab, ph = 'Agregar') => `<span class="hs-kl">${lab}</span>${ed ? `<textarea class="hs-in hs-grow" rows="1" data-bind="sup-sc" data-f="${f}" data-k="${ea(k)}" placeholder="${ea(ph)}" aria-label="${ea(lab)}">${esc(m[f] || '')}</textarea>` : `<span class="hs-kv${m[f] ? '' : ' ph'}">${esc(m[f] || '—')}</span>`}`;
  // auto: lo que vale si no se escribe nada (el previsto, por las páginas); ph: qué va ahí
  const tfld = (f, lab, auto, ph, tm) => `<span class="hs-kl">${lab}</span>${ed ? `<input type="text" class="hs-in${tm ? ' tm' : ''}" ${tm ? 'inputmode="numeric" maxlength="8"' : ''} value="${esc(m[f] || '')}" placeholder="${ea(auto || ph)}" data-bind="sup-sc" data-f="${f}" data-k="${ea(k)}" aria-label="${ea(lab)}">` : `<span class="hs-kv${m[f] ? '' : ' ph'}">${esc(m[f] || auto || '—')}</span>`}`;
  return `<div class="hs-cont">
    <div class="hs-cb"><h4>Continuidad</h4><div class="hs-kvs">${SUP_CONT.map(([f, lab]) => fld(f, lab)).join('')}
      <span class="hs-kl">Fotos</span>${supPhotosHTML((m.ph || []), ed, { k }, 'Continuidad de la escena ' + k)}</div></div>
    <div class="hs-cb hs-tb"><h4>Tiempo en pantalla</h4><div class="hs-kvs">${tfld('plan', 'Previsto', supFmt(supPlanSecs(k)))}${tfld('screen', EN ? trDone('Actual') : 'Rodado', '', '0:00')}${tfld('start', 'Inicio', '', 'Hora', 1)}${tfld('end', 'Fin', '', 'Hora', 1)}</div></div></div>`;
}
/* fotos (continuidad de una escena o de la hoja de papel de la jornada): miniaturas, abrir en grande, quitar y agregar.
   where: { k } escena o { day } jornada. cap: la cámara del celular (capture) */
function supPhotosHTML(list, ed, where, label, o = {}) {
  const ph = list.filter(p => frameHas(spKey(p.id)) || FRAMES[spKey(p.id)]);
  const W = where.k != null ? `data-k="${ea(where.k)}"` : `data-day="${ea(where.day)}"`;
  const th = ph.map((p, i) => { const u = FRAMES[spKey(p.id)]; return `<figure class="hs-th" data-sp="${ea(spKey(p.id))}">${u ? `<button type="button" class="hs-thb" data-act="sup-phview" ${W} data-v="${ea(p.id)}" aria-label="${ea(`Ver la foto ${i + 1}`)}"><img src="${ea(u)}" alt="${ea(`Foto ${i + 1}`)}"></button>` : '<span class="hs-wait" aria-hidden="true"></span>'}<figcaption class="tnum">${i + 1}</figcaption>${ed ? `<button type="button" class="hs-thx" data-act="sup-phdel" ${W} data-v="${ea(p.id)}" aria-label="Quitar la foto" title="Quitar">${ICO.close}</button>` : ''}</figure>`; }).join('');
  const add = !ed ? '' : planAllows('photos') ? `<label class="hs-phadd" title="${ea(o.title || 'Agregar fotos (se guardan en WebP de unos 200 kB)')}">${ICO.camera}<span>${esc(o.add || '+ Foto')}</span><input type="file" class="file-in" accept="image/jpeg,image/png,image/webp" ${o.cap ? 'capture="environment"' : 'multiple'} data-bind="sup-ph" ${W}></label>`
    : `<button type="button" class="hs-phadd" data-act="sup-pro">${ICO.camera}<span>${esc(o.add || '+ Foto')} <i class="pro-chip">PRO</i></span></button>`;
  return `<div class="hs-phs">${th}${add}${!th && !add ? '<span class="hs-kv ph">Sin fotos</span>' : ''}</div>`;
}
/* ---------- «En cámara» ---------- */
function supCamHTML(X) {
  const { cur, shots, ed } = X;
  if (!cur) return `<section class="hs-card hs-cam" aria-label="En cámara"><div class="hs-camh"><span class="hs-kick">En cámara</span></div>
    <p class="hs-camdone">${shots.length ? '✓ Todos los planos de la jornada están rodados.' : 'Esta jornada no tiene planos todavía.'}</p>${shots.length && ed ? '<p class="hint" style="margin:0">Toca el número de un plano en la tabla para volver a ponerlo en cámara.</p>' : ''}</section>`;
  const s = sceneOfKey(cur.sc), takes = supTakes(cur.id), t = supCurTake(cur.id), next = supNextOf(shots, cur), ti = t ? takes.indexOf(t) : -1;
  const ie = s ? `${ieLab(s)} · ${DN_LAB[stripDN(s)] || ''}` : '';
  const snd = t ? takeSnd(cur.id, t) : '';
  const st = t && !t.run ? `<span class="hs-st ${ea(t.st)}">${esc(TAKE_ST[t.st])}</span>` : '';
  return `<section class="hs-card hs-cam" aria-label="En cámara">
    <div class="hs-camh"><span class="hs-kick">En cámara</span><span class="hs-cams">${s ? `<span>Esc. ${esc(s.key)}</span> · <span>${esc(ie)}</span>` : ''}</span></div>
    <div><div class="hs-camt"><span>Plano ${esc(D.code[cur.id])}</span>${supTech(cur) ? ` <small>${esc(supTech(cur))}</small>` : ''}</div>${supDesc(cur) ? `<p class="hs-camd">${esc(supDesc(cur))}</p>` : ''}</div>
    ${supClockHTML(cur, t, snd, st)}
    ${ed ? supMarkHTML(cur, t) : ''}
    ${ed && t ? supNoteHTML(cur, t, ti) : t && t.note ? `<p class="hs-camd"><span class="hs-hl">Nota:</span> ${esc(t.note)}</p>` : ''}
    ${ed ? `<div class="hs-go"><button type="button" class="hs-btn pri" data-act="take-add" data-id="${ea(cur.id)}">+ Toma ${takes.length ? takes[takes.length - 1].n + 1 : 1}</button><button type="button" class="hs-btn" data-act="sup-next" data-id="${ea(cur.id)}" title="Marca este plano como rodado y pone en cámara el siguiente"><span>Siguiente plano</span> <span aria-hidden="true">›</span></button></div>` : ''}
    <div class="hs-next">${next ? `<span>Sigue:</span> <b>${esc(D.code[next.id])}</b>${supTech(next) ? ` · ${esc(supTech(next))}` : ''}` : '<span>Es el último plano sin rodar de la jornada.</span>'}</div></section>`;
}
function supClockHTML(cur, t, snd, st) {
  const mat = t ? [t.run ? '' : t.t, t.r, isMos(snd) ? 'MOS' : snd].filter(Boolean).join(' · ') : [P.sup.roll, supMos(cur.id) ? 'MOS' : P.sup.sroll].filter(Boolean).join(' · ');
  return `<div class="hs-clock"><div><div class="hs-cl">Toma</div><div class="hs-tkn tnum">${t ? esc(t.n) : '—'}</div></div>
    <div class="hs-clr">${t && t.run ? `<div class="hs-run">● Rodando</div><div class="hs-tim tnum" data-sup-run="${ea(t.run)}">${supClock(Date.now() - t.run)}</div>`
      : t ? `<div class="hs-cl">${st}</div><div class="hs-tim tnum">${esc(t.d || '—')}</div>` : '<div class="hs-cl">Sin tomas</div><div class="hs-tim tnum">00:00</div>'}${mat ? `<div class="hs-mat">${esc(mat)}</div>` : ''}</div></div>`;
}
function supMarkHTML(cur, t) {
  const on = k => t && !t.run && t.st === k;
  const b = (k, lab, ico = '') => `<button type="button" class="hs-mk ${k}" data-act="sup-mark" data-v="${k}" data-id="${ea(cur.id)}" aria-pressed="${on(k)}" ${t ? '' : 'disabled'}>${ico}<span>${lab}</span></button>`;
  const mos = t && isMos(takeSnd(cur.id, t));
  return `<div class="hs-mks" role="group" aria-label="Estado de la toma">${b('bn', TAKE_ST.bn, '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>')}${b('ok', 'OK')}${b('ng', 'NG')}</div>
    <div class="hs-mosr"><button type="button" class="hs-tog" data-act="sup-mos-take" data-id="${ea(cur.id)}" aria-pressed="${!!mos}" ${t && !supMos(cur.id) ? '' : 'disabled'} title="Esta toma, sin sonido">MOS</button>
      <label class="hs-sw" title="Todas las tomas del plano, sin sonido"><input type="checkbox" data-bind="sup-mos-shot" data-id="${ea(cur.id)}" ${supMos(cur.id) ? 'checked' : ''}><span>Plano MOS</span></label></div>`;
}
function supNoteHTML(cur, t, ti) {
  return `<div class="hs-note"><label for="supNote">Nota de la toma</label><div class="hs-nr"><input type="text" id="supNote" value="${esc(t.note || '')}" data-bind="sup-tnote" data-id="${ea(cur.id)}" data-n="${ti}" placeholder="Escribe o dicta: foco, ruido, cambio de texto…" autocomplete="off">
    ${SUP_SR ? `<button type="button" class="hs-mic${SUP_REC ? ' on' : ''}" data-act="sup-mic" aria-pressed="${!!SUP_REC}" aria-label="Dictar la nota" title="Dictar la nota (se agrega a lo escrito)">${SUP_MIC}</button>` : ''}</div></div>`;
}
/* debajo de «En cámara»: incidencias, notas de la jornada y la hoja de papel */
function supDaySideHTML(X) {
  const { dm, dayKey, ed } = X;
  if (!dm) return '';
  // la incidencia recién agregada vive en pantalla (con su hora) hasta que se le escribe algo
  const inc = supIncs(dm.inc).concat(SUPINC.has(dayKey) ? [{ t: SUPINC.get(dayKey), x: '' }] : []);
  const incHTML = inc.length ? `<div class="hs-incs">${inc.map((x, i) => ed ? `<div class="hs-inc"><input type="text" inputmode="numeric" class="tm hs-inct" maxlength="8" value="${esc(x.t)}" placeholder="Hora" data-bind="sup-inc" data-f="t" data-n="${i}" data-id="${ea(dayKey)}" aria-label="Hora de la incidencia"><textarea class="hs-incx hs-grow" rows="1" data-bind="sup-inc" data-f="x" data-n="${i}" data-id="${ea(dayKey)}" placeholder="Demora y su causa, accidente, falla de equipo…" aria-label="Incidencia">${esc(x.x)}</textarea></div>`
    : `<div class="hs-inc"><span class="hs-inct tnum">${esc(x.t)}</span><span>${esc(x.x)}</span></div>`).join('')}</div>` : '<p class="hs-hint">Demoras y su causa, accidentes, fallas de equipo.</p>';
  const notes = ed ? `<textarea class="hs-notes hs-grow" rows="2" data-bind="sup-dayf" data-f="notes" data-id="${ea(dayKey)}" placeholder="Cambios de plan, material grabado, pendientes para mañana" aria-label="Notas de la jornada">${esc(dm.notes || '')}</textarea>`
    : dm.notes ? `<p class="hs-ntx">${esc(dm.notes)}</p>` : '<p class="hs-hint">Cambios de plan, material grabado, pendientes para mañana.</p>';
  return `<section class="hs-card hs-sbox"><div class="hs-sbh"><h3>Incidencias</h3>${ed ? '<button type="button" class="hs-link" data-act="sup-inc-add">+ Agregar</button>' : ''}</div>${incHTML}</section>
    <section class="hs-card hs-sbox"><div class="hs-sbh"><h3>Notas de la jornada</h3></div>${notes}</section>
    <section class="hs-card hs-sbox"><div class="hs-sbh"><h3>Hoja en papel</h3>${ed ? '<button type="button" class="hs-link" data-act="sup-quick">Carga rápida</button>' : ''}</div>
      <p class="hs-hint">Fotos de las hojas llenadas a mano, como respaldo. «Carga rápida» pasa sus tomas al programa.</p>${supPhotosHTML(dm.ph || [], ed, { day: dayKey }, 'Hoja de script en papel', { add: '+ Foto de la hoja', title: 'Fotos de las hojas llenas, como respaldo (no se lee la letra)' })}</section>`;
}
/* las incidencias: una por línea, «HH:MM texto» (las de antes, sin hora, quedan como texto) */
const SUPINC = new Map();   // jornada → la hora de la incidencia recién agregada (sin texto todavía)
const supIncs = s => String(s || '').split('\n').filter(l => l.trim()).map(l => { const m = /^\s*(\d{1,2}:\d{2})(?:\s+([\s\S]*))?$/.exec(l); return m ? { t: m[1], x: (m[2] || '').trim() } : { t: '', x: l.trim() }; });
const supIncJoin = L => L.map(x => [x.t, x.x].filter(Boolean).join(' ')).filter(Boolean).join('\n');

/* ---------- celular ---------- */
function supPhoneHTML(X) {
  const S = supStats(X), { cur, shots, keys, dm, n, ed } = X;
  const [f0] = supFirstLast(shots), call = dm ? dm.call || P.schedule.call || '' : '', first = dm ? dm.first || f0 : '';
  const pct = shots.length ? (S.done / shots.length * 100).toFixed(1) : 0;
  const head = `<header class="hs-card hs-mh"><div class="hs-mhr"><div><div class="hs-kick">Hoja de script</div><div class="hs-mtt">${n >= 0 ? `<span>Jornada ${n + 1}</span>${X.dates[n] ? ` · <span>${esc(X.dates[n].toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/[,.]/g, ''))}</span>` : ''}` : `<span>${esc(supDayTitle(X))}</span>`}</div></div>
      <div class="hs-mst"><div><b class="tnum">${S.done}</b> <span class="tnum">de ${shots.length}</span> <span>planos</span></div><div><span class="tnum">${S.scDone.length} de ${keys.length}</span> <span>esc.</span></div></div></div>
    ${call || first ? `<div class="hs-mtimes">${call ? `<span>Llamado</span> <span class="tnum">${esc(call)}</span>` : ''}${call && first ? ' · ' : ''}${first ? `<span>1.ª toma</span> <span class="tnum">${esc(first)}</span>` : ''}</div>` : ''}
    <div class="hs-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${ea(shots.length)}" aria-valuenow="${ea(S.done)}" aria-label="Planos rodados"><i style="width:${ea(pct)}%"></i></div></header>`;
  let main = '';
  if (cur) {
    const s = sceneOfKey(cur.sc), takes = supTakes(cur.id), t = supCurTake(cur.id), ti = t ? takes.indexOf(t) : -1, next = supNextOf(shots, cur);
    const snd = t ? takeSnd(cur.id, t) : '', st = t && !t.run ? `<span class="hs-st ${ea(t.st)}">${esc(TAKE_ST[t.st])}</span>` : '';
    const nph = ((P.sup.sc[cur.sc] || {}).ph || []).length;
    main = `<section class="hs-card hs-msc" aria-label="En cámara">${s ? `<div class="hs-msch">${supNo(s, 'sm')}<span>${esc(s.heading)}</span></div>` : ''}
      <div class="hs-mscb"><div class="hs-mpl"><b>Plano ${esc(D.code[cur.id])}</b>${supTech(cur) ? `<span>${esc(supTech(cur))}</span>` : ''}</div>${supDesc(cur) ? `<p class="hs-camd">${esc(supDesc(cur))}</p>` : ''}
        ${supClockHTML(cur, t, snd, st)}${ed ? supMarkHTML(cur, t) : ''}${ed && t ? supNoteHTML(cur, t, ti) : ''}
        ${ed ? (planAllows('photos') ? `<label class="hs-btn soft hs-mph">${ICO.camera}<span>Foto de continuidad</span>${nph ? ` <small>· ${nph} en la escena</small>` : ''}<input type="file" class="file-in" accept="image/jpeg,image/png,image/webp" capture="environment" data-bind="sup-ph" data-k="${ea(cur.sc)}"></label>`
          : `<button type="button" class="hs-btn soft hs-mph" data-act="sup-pro">${ICO.camera}<span>Foto de continuidad <i class="pro-chip">PRO</i></span></button>`) : ''}</div></section>
      ${takes.length ? `<section class="hs-card hs-mtk" aria-label="Tomas de este plano">${takes.map((x, i) => supMTakeHTML(cur.id, x, i, ed)).join('')}</section>` : ''}
      <p class="hs-next">${next ? `<span>Sigue:</span> <b>${esc(D.code[next.id])}</b>${supTech(next) ? ` · ${esc(supTech(next))}` : ''}` : '<span>Es el último plano sin rodar de la jornada.</span>'}</p>`;
  } else main = `<section class="hs-card hs-msc"><div class="hs-mscb"><p class="hs-camdone">${shots.length ? '✓ Todos los planos de la jornada están rodados.' : 'Esta jornada no tiene planos todavía.'}</p></div></section>`;
  const md = (id, title, body, open) => `<details class="hs-card hs-md" data-md="${ea(id)}" ${(UI.supMd || {})[id] ?? open ? 'open' : ''}><summary>${title}</summary><div class="hs-mdb">${body}</div></details>`;
  const cs = cur && sceneOfKey(cur.sc);
  const day = dm ? `${supChipsHTML(X)}${supProgHTML(X, S).replace('hs-card hs-prog', 'hs-prog m')}${supDaySideHTML(X)}` : supChipsHTML(X);
  return `<div class="hs hs-m">${head}${main}
    ${cs ? md('cont', `<span>Continuidad y tiempo · esc.</span> <span>${esc(cs.key)}</span>`, supContHTML(X, cs) + (ed ? `<div class="hs-tfoot"><button type="button" class="hs-pill" data-act="sup-wild" data-k="${ea(cs.key)}">+ Wild / ambiente</button></div>` : ''), false) : ''}
    ${md('day', `<span>La jornada</span>`, day, !cur)}
    ${md('all', `<span>Todas las escenas</span> <small class="tnum">${keys.length}</small>`, supMAllHTML(X), false)}</div>`;
}
function supMTakeHTML(id, t, i, ed) {
  const snd = takeSnd(id, t), A = ed ? `data-act="take" data-id="${ea(id)}" data-n="${i}"` : '';
  const tag = ed ? 'button' : 'div';
  return `<${tag} ${tag === 'button' ? 'type="button"' : ''} class="hs-mtr" ${A}><span class="hs-tn${t.st === 'bn' ? ' bn' : ''}">${esc(t.n)}</span>${t.run ? `<span class="hs-run">● Rodando</span> <span class="tnum hs-mtt2" data-sup-run="${ea(t.run)}">${supClock(Date.now() - t.run)}</span>` : `<span class="hs-st ${ea(t.st)}">${esc(TAKE_ST[t.st])}</span><span class="hs-mtm tnum">${esc([t.t, t.d].filter(Boolean).join(' · '))}</span>`}${isMos(snd) ? '<span class="hs-mosb">MOS</span>' : ''}<span class="hs-mtn">${esc(t.note || '')}</span></${tag}>`;
}
/* en el celular, todas las escenas de la jornada: cada plano con sus tomas; un toque lo pone en cámara */
function supMAllHTML(X) {
  const { keys, cur, ed } = X;
  return keys.map(k => {
    const s = sceneOfKey(k); if (!s) return '';
    const shots = D.shotsBy[k] || [];
    return `<div class="hs-mall"><div class="hs-msch">${supNo(s, 'sm')}<span>${esc(s.heading)}</span>${sceneDone(k) ? '<span class="hs-okt">✓</span>' : ''}</div>
      ${shots.map(sh => { const takes = supTakes(sh.id), good = takes.filter(t => t.st === 'bn').map(t => t.n);
        return `<div class="hs-mshot${sh === cur ? ' cur' : ''}${sh.done ? ' done' : ''}"><${ed && sh !== cur ? `button type="button" data-act="sup-cam" data-id="${ea(sh.id)}"` : 'div'} class="hs-msh"><b>${esc(D.code[sh.id])}</b><span>${esc(supTech(sh))}</span><small><span class="tnum">${takes.length}</span> <span>${takes.length === 1 ? 'toma' : 'tomas'}</span></small>${good.length ? ` <small class="hs-okt">B ${esc(good.join(', '))}</small>` : ''}${sh === cur ? ' <small class="hs-live">● En cámara</small>' : sh.done ? ' <small class="hs-okt">✓</small>' : ''}</${ed && sh !== cur ? 'button' : 'div'}></div>`;
      }).join('') || '<p class="hs-hint">Sin planos.</p>'}</div>`;
  }).join('') || '<p class="hs-hint">No hay escenas en esta jornada.</p>';
}
/* la barra fija de abajo: «+ Toma» y «Siguiente plano», para una mano */
function supDockHTML(X) {
  const { cur, ed } = X;
  if (!ed || !cur) return '';
  const takes = supTakes(cur.id);
  return `<div class="hs-dock" role="group" aria-label="Plano en rodaje"><button type="button" class="hs-btn pri" data-act="take-add" data-id="${ea(cur.id)}">+ Toma ${takes.length ? takes[takes.length - 1].n + 1 : 1}</button><button type="button" class="hs-btn" data-act="sup-next" data-id="${ea(cur.id)}"><span>Siguiente plano</span> <span aria-hidden="true">›</span></button></div>`;
}

/* ---------- el cronómetro ---------- */
let SUP_TICK = 0;
function supTick() {
  clearInterval(SUP_TICK); SUP_TICK = 0;
  if (!$('#view [data-sup-run]')) return;
  SUP_TICK = setInterval(() => {
    const els = UI.tab === 'sup' ? $$('#view [data-sup-run]') : [];
    if (!els.length) { clearInterval(SUP_TICK); SUP_TICK = 0; return; }
    const now = Date.now(); for (const el of els) el.textContent = supClock(now - +el.dataset.supRun);
  }, 1000);
}
/* ---------- dictado por voz (Web Speech): lo dictado se agrega a la nota de la toma; sin soporte, no hay botón ---------- */
const SUP_SR = (() => { try { return typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition) || null; } catch (e) { return null; } })();
const SUP_MIC = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
let SUP_REC = null;
const supMicPaint = () => $$('#view .hs-mic').forEach(b => { b.classList.toggle('on', !!SUP_REC); b.setAttribute('aria-pressed', String(!!SUP_REC)); });
function supDictate() {
  if (!SUP_SR) return;
  if (SUP_REC) { try { SUP_REC.stop(); } catch (e) { } return; }
  const X = supCtx(), sh = X.cur, t = sh && supCurTake(sh.id);
  if (!t) { toast('Primero agrega una toma.'); return; }
  let r;
  try { r = new SUP_SR(); } catch (e) { toast('Este navegador no permite dictar.'); return; }
  r.lang = EN ? 'en-US' : 'es-PE'; r.interimResults = false; r.continuous = false; r.maxAlternatives = 1;
  r.onresult = e => {
    const txt = Array.from(e.results || []).map(x => (x[0] && x[0].transcript) || '').join(' ').replace(/\s+/g, ' ').trim();
    if (!txt || !P) return;
    histNote('Dictar la nota de una toma');
    t.note = (t.note ? t.note.replace(/\s+$/, '') + ' ' : '') + txt;
    changed('data');
    $$('#view [data-bind="sup-tnote"]').forEach(x => { x.value = t.note; });
    const c = $('#view .hs-c-n'); if (c) render();
  };
  r.onerror = e => {
    if (e && (e.error === 'not-allowed' || e.error === 'service-not-allowed')) toast('El navegador no dejó usar el micrófono: revisa su permiso.', 4200);
    else if (e && e.error !== 'no-speech' && e.error !== 'aborted') toast('No se pudo dictar. Inténtalo otra vez.');
  };
  r.onend = () => { SUP_REC = null; supMicPaint(); };
  try { r.start(); SUP_REC = r; supMicPaint(); } catch (e) { SUP_REC = null; toast('No se pudo dictar. Inténtalo otra vez.'); }
}

/* ---------- fotos de continuidad y de la hoja de papel ---------- */
const supPhHolder = (b, make) => { const d = b.dataset; return d.k != null ? (make ? (P.sup.sc[d.k] = P.sup.sc[d.k] || {}) : P.sup.sc[d.k]) : d.day != null ? (make ? (P.sup.day[d.day] = P.sup.day[d.day] || {}) : P.sup.day[d.day]) : null; };
async function supAddPhotos(el, files) {
  const where = { ...el.dataset }, Px = P;
  const hold = () => supPhHolder({ dataset: where }, true);
  const r = await photosAdd(files, { keyOf: spKey, top: SUP_TOP, paint: () => { if (P === Px) render(); },
    add: x => { if (P !== Px) return false; const h = hold(); h.ph = [...(h.ph || []), x]; },
    drop: id => { const h = hold(); h.ph = (h.ph || []).filter(p => p.id !== id); } });
  if (r.n) toast(`${r.n} ${r.n === 1 ? 'foto agregada' : 'fotos agregadas'}.`);
}

/* ---------- acciones ---------- */
/* plano no previsto (1.1A) o pick-up (1.1PU) debajo de otro: se ubica tras el plano y lo que ya cuelga de él */
function addShotBelow(refId, pu) {
  const ref = P.shots[refId]; if (!ref) return;
  const s = sceneOfKey(ref.sc); if (!s) return;
  const list = (D.shotsBy[ref.sc] || []).slice();
  const base = !pu && ref.of && !ref.pu && P.shots[ref.of] ? P.shots[ref.of] : ref;
  const under = x => { for (let y = x, g = 0; y && y.of && g < 6; y = P.shots[y.of], g++) if (y.of === base.id) return true; return false; };
  let j = list.indexOf(base); while (j + 1 < list.length && under(list[j + 1])) j++;
  const a = list[j].ord, b = list[j + 1] ? list[j + 1].ord : a + 2;
  const fields = pu
    ? { of: ref.id, pu: true, size: ref.size, angle: ref.angle, move: ref.move, lens: ref.lens, support: ref.support, chars: (ref.chars || []).slice(), desc: 'Pick-up de ' + D.code[ref.id] + (ref.desc ? ': ' + ref.desc : ''), ord: (a + b) / 2 }
    : { of: base.id, desc: 'No previsto', size: 'PM', ord: (a + b) / 2 };
  const sh = newShot(s, pu ? ref.p0 : null, pu ? ref.p1 : null, fields, false);
  (D.shotsBy[ref.sc] || []).forEach((x, i) => { x.ord = i + 1; });
  derive(); render();
  toast(`Plano ${D.code[sh.id]} agregado.`);
}
const SUPNOTE = new Set();   // planos con la caja de observaciones abierta aunque esté vacía
/* una toma nueva del plano: con la hora, la tarjeta y el sonido en uso, y el cronómetro corriendo */
function supTakeAdd(id) {
  if (!P.shots[id]) return;
  supStopAll();
  UI.supCur = id;
  const list = P.sup.takes[id] = P.sup.takes[id] || [];
  const snd = supMos(id) ? 'MOS' : P.sup.sroll;
  list.push({ n: (list.length ? list[list.length - 1].n : 0) + 1, st: 'ok', t: nowHM(), note: '', ...(P.sup.roll ? { r: P.sup.roll } : {}), ...(snd ? { s: snd } : {}), run: Date.now() });
  changed('data'); render();
}
/* la ventana de una toma: estado, hora, duración, tarjeta, sonido (o MOS) y nota */
function supTakePop(b) {
  const id = b.dataset.id, i = +b.dataset.n, t = supTakes(id)[i]; if (!t) return;
  const mosShot = supMos(id);
  popover(b, `<h5>Toma ${esc(t.n)} · ${esc(D.code[id])}</h5>
    <div class="seg" role="group">${Object.entries(TAKE_ST).map(([k, n]) => `<button data-st="${k}" aria-pressed="${ea(!t.run && t.st === k)}">${n}</button>`).join('')}</div>
    <div class="grid2"><label class="fld"><span>Hora</span><input type="text" inputmode="numeric" class="tm" maxlength="8" id="tkT" placeholder="--:--" value="${esc(t.t || '')}"></label><label class="fld"><span>Duración</span><input type="text" id="tkD" value="${esc(t.d || '')}" placeholder="${t.run ? 'Rodando…' : '0:42'}" ${t.run ? 'disabled' : ''}></label>
      <label class="fld"><span>Tarjeta de cámara</span><input type="text" id="tkR" value="${esc(t.r || '')}" placeholder="ej.: A001"></label><label class="fld"><span>Sonido</span><span class="hs-sndf"><input type="text" id="tkS" value="${esc(mosShot ? 'MOS' : t.s || '')}" placeholder="ej.: S001 o MOS" title="Rollo, archivo o pista de sonido; MOS si se grabó sin sonido" ${mosShot ? 'disabled' : ''}><button type="button" class="btn sm" data-mos ${mosShot ? 'disabled' : ''} title="Toma sin sonido">MOS</button></span></label></div>
    ${mosShot ? '<p class="hint" style="margin:0">El plano es MOS: sus tomas van sin sonido.</p>' : ''}
    <label class="fld"><span>Nota</span><input type="text" id="tkN" value="${esc(t.note || '')}" placeholder="Foco, ruido, falla de actor…"></label>
    <div style="display:flex;gap:6px;justify-content:space-between"><button class="btn sm danger" data-del>Eliminar toma</button><button class="btn sm primary" data-ok>Listo</button></div>`, p => {
    const save = () => { t.t = normHM($('#tkT', p).value); if (!t.run) t.d = $('#tkD', p).value; t.note = $('#tkN', p).value; const r = $('#tkR', p).value.trim(); if (r) t.r = r; else delete t.r; if (!mosShot) { const so = $('#tkS', p).value.trim(); if (so) t.s = isMos(so) ? 'MOS' : so; else delete t.s; } };
    // lo escrito queda guardado aunque se toque fuera: se guarda al escribir y la tabla se repinta al cerrar
    let typed = false;
    p.addEventListener('input', () => { typed = true; save(); changed('data'); });
    p._onClose = () => { if (typed) render(); };
    p.addEventListener('click', e => {
      const x = e.target.closest('button'); if (!x) return;
      if (x.dataset.mos != null) { const s = $('#tkS', p); s.value = isMos(s.value) ? (P.sup.sroll || '') : 'MOS'; typed = true; save(); changed('data'); return; }
      if (x.dataset.st) { save(); supStop(t); t.st = x.dataset.st; closePop(); changed('data'); render(); return; }
      if (x.dataset.del != null) { histNote('Eliminar una toma'); supTakes(id).splice(i, 1); closePop(); changed('data'); render(); toastUndo('Toma eliminada.'); return; }
      if (x.dataset.ok != null) { save(); closePop(); changed('data'); render(); }
    });
  });
}
/* la ventana de un sonido wild: rollo, hora, duración y nota */
function supWildPop(b, isNew) {
  const k = b.dataset.k, m = P.sup.sc[k] = P.sup.sc[k] || {}, W = m.wild = m.wild || [];
  let i = isNew ? -1 : +b.dataset.n;
  const w = i >= 0 ? W[i] : { id: uid('w'), t: nowHM(), s: P.sup.sroll || '', d: '', note: '' };
  if (!w) return;
  if (i < 0) { histNote('Agregar sonido wild'); W.push(w); i = W.length - 1; changed('data'); render(); b = $(`#view [data-act="sup-wild"][data-k="${CSS.escape(k)}"]`) || b; }
  popover(b, `<h5>Sonido wild · escena ${esc(k)}</h5><p class="hint" style="margin:0 0 6px">Sonido grabado sin cámara: ambiente, frases, efectos.</p>
    <div class="grid2"><label class="fld"><span>Rollo de sonido</span><input type="text" id="wdS" value="${esc(w.s || '')}" placeholder="ej.: S001"></label><label class="fld"><span>Hora</span><input type="text" inputmode="numeric" class="tm" maxlength="8" id="wdT" value="${esc(w.t || '')}" placeholder="--:--"></label>
      <label class="fld"><span>Duración</span><input type="text" id="wdD" value="${esc(w.d || '')}" placeholder="1:00"></label></div>
    <label class="fld"><span>Nota</span><input type="text" id="wdN" value="${esc(w.note || '')}" placeholder="Ambiente de la cabina, sin diálogos…"></label>
    <div style="display:flex;gap:6px;justify-content:space-between"><button class="btn sm danger" data-del>Quitar</button><button class="btn sm primary" data-ok>Listo</button></div>`, p => {
    const save = () => { w.s = $('#wdS', p).value.trim(); w.t = normHM($('#wdT', p).value); w.d = $('#wdD', p).value.trim(); w.note = $('#wdN', p).value; };
    let typed = false;
    p.addEventListener('input', () => { typed = true; save(); changed('data'); });
    p._onClose = () => { if (typed) render(); };
    p.addEventListener('click', e => {
      const x = e.target.closest('button'); if (!x) return;
      if (x.dataset.del != null) { histNote('Quitar sonido wild'); const j = W.indexOf(w); if (j >= 0) W.splice(j, 1); if (!W.length) delete m.wild; closePop(); changed('data'); render(); toastUndo('Sonido wild quitado.'); return; }
      if (x.dataset.ok != null) { save(); closePop(); changed('data'); render(); }
    });
    if (isNew) setTimeout(() => { const f = $('#wdN', p); if (f) f.focus(); }, 0);
  });
}
Object.assign(ACT, {
  // ‹ › de jornada (la misma en la hoja de llamado), el parte diario y la carga rápida
  'sup-go': b => { if (b.dataset.d != null) { UI.supDay = +b.dataset.d; UI.callDay = UI.supDay; render(); } },
  'sup-parte': b => exportPDF('parte', b),
  'sup-quick': () => supQuick(),
  'sup-pro': () => proGate('photos'),
  'sup-fold': b => { const k = b.dataset.k; const open = b.getAttribute('aria-expanded') === 'true'; UI.supFold[k] = !open; render(); if (!open) requestAnimationFrame(() => { const s = $(`#view .hs-sc[data-k="${CSS.escape(k)}"]`); if (s && s.getBoundingClientRect().top > innerHeight - 120) s.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }); },
  'sup-cam': b => { const sh = P.shots[b.dataset.id]; if (!sh) return; UI.supCur = sh.id; UI.supFold[sh.sc] = true; render(); },
  'take-add': b => supTakeAdd(b.dataset.id),
  take: b => supTakePop(b),
  'sup-mark': b => {
    const id = b.dataset.id, t = supCurTake(id); if (!t) return;
    supStop(t); t.st = b.dataset.v; UI.supCur = id;
    changed('data'); render();
  },
  'sup-next': b => {
    const X = supCtx(), sh = P.shots[b.dataset.id]; if (!sh) return;
    supStopAll();
    sh.done = true;
    const nx = supNextOf(X.shots, sh);
    UI.supCur = nx ? nx.id : null;
    if (nx && nx.sc !== sh.sc) { delete UI.supFold[sh.sc]; UI.supFold[nx.sc] = true; }
    changed('data'); render();
    toast(nx ? `Plano ${D.code[sh.id]} rodado. En cámara: ${D.code[nx.id]}.` : `Plano ${D.code[sh.id]} rodado. No quedan planos sin rodar en la jornada.`, 3200);
  },
  'sup-mos-take': b => { const id = b.dataset.id, t = supCurTake(id); if (!t || supMos(id)) return; if (isMos(t.s)) { if (P.sup.sroll) t.s = P.sup.sroll; else delete t.s; } else t.s = 'MOS'; changed('data'); render(); },
  'sup-mic': () => supDictate(),
  'sup-rolls': b => {
    const used = (f) => supRolls(supCtx().shots, f);
    const chips = L => L.map(x => `<span class="chip">${esc(x)}</span>`).join('');
    popover(b, `<h5>Material en uso</h5>
      <label class="fld"><span>Tarjeta en cámara</span><input type="text" id="srR" value="${esc(P.sup.roll || '')}" placeholder="ej.: A001" autocomplete="off"></label>
      <label class="fld"><span>Rollo de sonido</span><input type="text" id="srS" value="${esc(P.sup.sroll || '')}" placeholder="ej.: S001" autocomplete="off"></label>
      <p class="hint" style="margin:0">Cámbialos cuando cambien: las tomas nuevas los anotan solas.</p>
      ${used('r').length || used('s').length ? `<div class="hs-used">${used('r').length ? `<div><span class="hs-hl">Tarjetas usadas</span> ${chips(used('r'))}</div>` : ''}${used('s').length ? `<div><span class="hs-hl">Rollos usados</span> ${chips(used('s'))}</div>` : ''}</div>` : ''}`, p => {
      p.addEventListener('input', () => { P.sup.roll = $('#srR', p).value.trim(); P.sup.sroll = $('#srS', p).value.trim(); changed('data'); });
      p._onClose = () => render();
      setTimeout(() => { const f = $(b.dataset.k === 'sroll' ? '#srS' : '#srR', p); if (f) { f.focus(); f.select(); } }, 0);
    });
  },
  'sup-who': b => popover(b, `<h5>Script / continuidad</h5><label class="fld"><span>Nombre</span><input type="text" id="swN" value="${esc(P.sup.supervisor || '')}" placeholder="Nombre de quien hace script" autocomplete="off"></label><p class="hint" style="margin:0">Sale en la hoja de script y en el parte diario.</p>`, p => {
    p.addEventListener('input', () => { P.sup.supervisor = $('#swN', p).value.trim(); changed('data'); });
    p._onClose = () => render();
    setTimeout(() => { const f = $('#swN', p); if (f) f.focus(); }, 0);
  }),
  'sup-inc-add': () => {
    const X = supCtx(); if (!X.dayKey) return;
    const dm = P.sup.day[X.dayKey] = P.sup.day[X.dayKey] || {};
    SUPINC.set(X.dayKey, nowHM());   // no se guarda hasta que tenga texto
    render();
    requestAnimationFrame(() => { const f = $$('#view .hs-incx').pop(); if (f) f.focus(); });
  },
  'sup-phview': b => { const h = supPhHolder(b); if (!h) return; const ks = (h.ph || []).map(p => spKey(p.id)); photoViewer(ks, b.dataset.k != null ? `Continuidad · escena ${b.dataset.k}` : 'Hoja de script en papel', { at: ks.indexOf(spKey(b.dataset.v)) }); },
  'sup-phdel': b => {
    const h = supPhHolder(b); if (!h) return;
    const k = spKey(b.dataset.v);
    histNote('Quitar una foto', FRAMES[k] ? { [k]: FRAMES[k] } : null, 'sup');
    delete FRAMES[k];
    // si todavía se está subiendo, photosAdd la borra en el servidor al terminar (laminas.js · photoCancel)
    if (!photoCancel(k)) Store.saveFrame(P.id, k, null).catch(() => { });
    h.ph = (h.ph || []).filter(x => x.id !== b.dataset.v); if (!h.ph.length) delete h.ph;
    changed('data'); render(); toastUndo('Foto quitada.');
  },
  'sup-add': b => { const s = D.sc.scenes[+b.dataset.i]; if (!s) return; UI.supFold[s.key] = true; const sh = newShot(s, null, null, { desc: '', size: 'PM' }, false); toast(`Plano ${D.code[sh.id]} agregado.`); },
  'sup-wild': b => supWildPop(b, true),
  'sup-wild-ed': b => supWildPop(b, false),
  'sup-more': b => {
    const id = b.dataset.id, sh = P.shots[id]; if (!sh) return;
    const hasNote = (P.sup.obs || {})[id] || SUPNOTE.has(id);
    popover(b, `<h5>Plano ${esc(D.code[id])}</h5><div class="menu">
      <button data-m="cam">Poner en cámara</button>
      <button data-m="mos">${supMos(id) ? 'Quitar «Plano MOS»' : 'Plano MOS <small class="hint">(todas sus tomas, sin sonido)</small>'}</button>
      ${hasNote ? '' : '<button data-m="note">+ Nota del plano</button>'}
      <button data-m="np">+ Plano no previsto debajo <small class="hint">(${esc(D.code[id])}A…)</small></button>
      <button data-m="pu">+ Pick-up de este plano</button><hr>
      <button data-m="open">Abrir el plano</button></div>`, p => p.addEventListener('click', e => {
      const x = e.target.closest('[data-m]'); if (!x) return;
      closePop();
      const m = x.dataset.m;
      if (m === 'cam') { UI.supCur = id; render(); }
      if (m === 'mos') supMosShot(id, !supMos(id));
      if (m === 'note') { SUPNOTE.add(id); render(); requestAnimationFrame(() => { const t = $(`textarea[data-bind="sup-obs"][data-id="${CSS.escape(id)}"]`); if (t) t.focus(); }); }
      if (m === 'np') addShotBelow(id, false);
      if (m === 'pu') addShotBelow(id, true);
      if (m === 'open') openShot(id);
    }));
  },
  'sup-np': b => addShotBelow(b.dataset.id, false),
  'sup-pu': b => addShotBelow(b.dataset.id, true),
});
/* plano MOS: todas sus tomas, sin sonido (lo heredan al mostrarse; lo anotado en cada toma no se pierde) */
function supMosShot(id, on) {
  const M = P.sup.mos = P.sup.mos || {};
  if (on) M[id] = 1; else delete M[id];
  if (!Object.keys(M).length) delete P.sup.mos;
  changed('data'); render();
}
Object.assign(BIND, {
  'sup-day': el => { UI.supDay = +el.value; if (UI.supDay >= 0) UI.callDay = UI.supDay; render(); },   // la misma jornada en la hoja de llamado
  'sup-g': (el, ev) => { P.sup[el.dataset.f] = el.value.trim(); changed('data'); if (ev === 'change') render(); },
  'sup-obs': el => { P.sup.obs = P.sup.obs || {}; if (el.value.trim()) P.sup.obs[el.dataset.id] = el.value; else delete P.sup.obs[el.dataset.id]; changed('data'); if (el.classList.contains('hs-grow')) supGrow(el); },
  'sup-done': el => { const sh = P.shots[el.dataset.id]; if (!sh) return; sh.done = el.checked; if (!el.checked) UI.supCur = sh.id; changed('data'); render(); },
  'sup-sc': (el, ev) => {
    if (el.classList.contains('tm')) { if (ev !== 'change') return; el.value = normHM(el.value); }
    const k = el.dataset.k, m = P.sup.sc[k] = P.sup.sc[k] || {};
    if (el.value.trim()) m[el.dataset.f] = el.value; else delete m[el.dataset.f];
    changed('data');
    if (el.classList.contains('hs-grow')) supGrow(el);
    if (ev === 'change' && /^(plan|screen)$/.test(el.dataset.f)) render();   // el tiempo en pantalla de la jornada
  },
  'sup-dayf': (el, ev) => {
    if (el.classList.contains('tm')) { if (ev !== 'change') return; el.value = normHM(el.value); }
    const k = el.dataset.id; P.sup.day[k] = P.sup.day[k] || {}; P.sup.day[k][el.dataset.f] = el.value; changed('data');
    if (el.classList.contains('hs-grow')) supGrow(el);
    if (ev === 'change' && el.dataset.f === 'wrap') render();   // la duración de la jornada
  },
  'sup-inc': (el, ev) => {
    if (el.classList.contains('tm')) { if (ev !== 'change') return; el.value = normHM(el.value); }
    const k = el.dataset.id, dm = P.sup.day[k] = P.sup.day[k] || {}, L = supIncs(dm.inc), i = +el.dataset.n;
    if (i >= L.length) {
      // la recién agregada: su hora queda en pantalla hasta que tenga texto
      if (el.dataset.f === 't') { SUPINC.set(k, el.value); return; }
      if (!el.value.trim()) return;
      L.push({ t: SUPINC.get(k) || '', x: '' }); SUPINC.delete(k);
    }
    L[i][el.dataset.f] = el.dataset.f === 'x' ? el.value.replace(/\n+/g, ' ') : el.value;
    // una incidencia que quedó sin texto se quita al salir del campo
    const gone = ev === 'change' && el.dataset.f === 'x' && !L[i].x.trim();
    if (gone) L.splice(i, 1);
    dm.inc = supIncJoin(L);
    changed('data');
    if (gone) { render(); return; }
    if (el.classList.contains('hs-grow')) supGrow(el);
  },
  'sup-tnote': el => { const t = supTakes(el.dataset.id)[+el.dataset.n]; if (!t) return; t.note = el.value; changed('data'); },
  'sup-mos-shot': el => supMosShot(el.dataset.id, el.checked),
  'sup-ph': (el, ev) => { if (ev !== 'change' || !el.files || !el.files.length) return; const f = [...el.files]; el.value = ''; supAddPhotos(el, f); },
});

/* ---------- carga rápida: una hoja llenada a mano, una toma por fila ----------
   Plano (su número: 2.1), toma (sola: la que sigue), estado (B, OK o NG), hora, duración, tarjeta, sonido y nota.
   Intro guarda la fila y abre la siguiente con el mismo plano, la toma que sigue, la misma tarjeta y el mismo sonido
   (el cursor queda en Estado). Cada fila se guarda al pasar a la siguiente: nada se pierde si se cierra a la mitad.
   Un plano con toma buena queda rodado. Las fotos de la hoja de la jornada se ven arriba, para leerla mientras tanto. */
const SQ_ST = s => { const v = String(s || '').trim().toLowerCase().replace(/\./g, ''); if (!v || /^(ok|o|0)$/.test(v)) return 'ok'; if (/^(b|bn|buena|bueno|g|good|p|print|pr|●|○|v|✓)$/.test(v)) return 'bn'; if (/^(ng|n|x|mala|no|nogood|no good)$/.test(v)) return 'ng'; return null; };
function supQuick() {
  if (!supEd()) return;
  const X = supCtx();
  if (!X.dayKey) { toast('Elige una jornada arriba para pasar su hoja.'); return; }
  if (!X.shots.length) { toast('Esta jornada no tiene planos: créalos primero.'); return; }
  // los planos por su número: primero los de la jornada; también los de otras escenas (una toma de otra jornada)
  const byCode = new Map(), norm = c => String(c || '').trim().toUpperCase().replace(/\s+/g, '');
  for (const sh of X.shots) byCode.set(norm(D.code[sh.id]), sh);
  for (const [id, c] of Object.entries(D.code)) if (P.shots[id] && !byCode.has(norm(c))) byCode.set(norm(c), P.shots[id]);
  const cur = X.cur || X.shots[0], saved = [];
  let noted = false;
  const lastN = sh => { const L = supTakes(sh.id); return L.length ? Math.max(...L.map(t => +t.n || 0)) : 0; };
  const sheet = (X.dm.ph || []).filter(p => frameHas(spKey(p.id)) || FRAMES[spKey(p.id)]);
  const F = [['P', 'Plano', '2.1'], ['T', 'Toma', '1'], ['E', 'Estado', 'B, OK o NG'], ['H', 'Hora', '--:--'], ['D', 'Dur.', '0:42'], ['C', 'Cám.', 'A001'], ['S', 'Son.', 'S001 o MOS'], ['N', 'Notas', 'Nota']];
  const m = modal({
    title: 'Carga rápida', wide: true,
    body: `<p class="hint sq-hint">Pasa al programa una hoja llenada a mano, una toma por fila: Intro guarda la fila y abre la siguiente con el mismo plano, la toma que sigue y el mismo material. Estado: B (buena), OK o NG. Un plano con toma buena queda rodado.</p>
      ${sheet.length ? `<div class="sq-ph">${sheet.map((p, i) => `<button type="button" class="hs-thb" data-sqv="${i}" aria-label="${ea(`Ver la foto de la hoja ${i + 1}`)}">${FRAMES[spKey(p.id)] ? `<img src="${ea(FRAMES[spKey(p.id)])}" alt="">` : '<span class="hs-wait"></span>'}</button>`).join('')}<span class="hint">Fotos de la hoja de esta jornada</span></div>` : ''}
      <div class="sq" role="table" aria-label="Tomas"><div class="sq-r sq-h" role="row">${F.map(f => `<span role="columnheader">${f[1]}</span>`).join('')}<span></span></div>
        <div id="sqDone"></div>
        <div class="sq-r sq-in" role="row">${F.map(([k, lab, ph]) => `<input type="text" id="sq${k}" ${k === 'P' ? 'list="sqCodes"' : ''} ${'THD'.includes(k) ? 'inputmode="numeric"' : ''} ${k === 'H' ? 'class="tm" maxlength="8"' : ''} placeholder="${ea(ph)}" aria-label="${ea(lab)}" autocomplete="off" spellcheck="false">`).join('')}<button type="button" class="btn sm primary" id="sqGo" title="Guardar la fila (Intro)" aria-label="Guardar la fila">↵</button></div></div>
      <datalist id="sqCodes">${X.shots.map(sh => `<option value="${ea(D.code[sh.id])}">${esc(supTech(sh))}</option>`).join('')}</datalist>
      <p class="sq-err" id="sqErr" role="alert"></p>`,
    foot: `<span class="hint" id="sqCount" aria-live="polite"></span><button class="btn primary" data-close>Listo</button>`,
    dirty: () => ['E', 'H', 'D', 'N'].some(k => $('#sq' + k, m) && $('#sq' + k, m).value.trim()),
    onClose: () => { if (saved.length) render(); },
  });
  m.querySelector('.dlg').classList.add('sq-dlg');
  const f = k => $('#sq' + k, m), err = (msg, k) => { $('#sqErr', m).textContent = msg; if (k) { f(k).focus(); f(k).select(); } };
  let autoT = true;
  const setPlano = sh => { f('P').value = D.code[sh.id]; if (autoT) f('T').value = lastN(sh) + 1; };
  setPlano(cur); f('C').value = P.sup.roll || ''; f('S').value = supMos(cur.id) ? 'MOS' : P.sup.sroll || '';
  f('P').addEventListener('change', () => { const sh = byCode.get(norm(f('P').value)); if (sh) { autoT = true; f('T').value = lastN(sh) + 1; } });
  f('T').addEventListener('input', () => { autoT = false; });
  f('H').addEventListener('change', () => { f('H').value = normHM(f('H').value); });
  const paint = () => {
    $('#sqDone', m).innerHTML = saved.slice(-8).map(x => `<div class="sq-r sq-ok" role="row"><span>${esc(x.code)}</span><span class="tnum">${esc(x.n)}</span><span><span class="hs-st ${ea(x.st)}">${esc(TAKE_ST[x.st])}</span></span><span class="tnum">${esc(x.t || '')}</span><span class="tnum">${esc(x.d || '')}</span><span>${esc(x.r || '')}</span><span>${esc(x.s || '')}</span><span>${esc(x.note || '')}</span><span aria-label="Guardada">✓</span></div>`).join('');
    $('#sqCount', m).textContent = saved.length ? `${saved.length} ${saved.length === 1 ? 'toma guardada' : 'tomas guardadas'}` : '';
  };
  const go = () => {
    const sh = byCode.get(norm(f('P').value));
    if (!sh) return err(f('P').value.trim() ? `No hay un plano ${f('P').value.trim()}. Créalo primero con «+ Plano».` : 'Escribe el número del plano (por ejemplo 2.1).', 'P');
    const n = Math.round(+f('T').value);
    if (!(n > 0)) return err('Escribe el número de la toma.', 'T');
    if (supTakes(sh.id).some(t => +t.n === n)) return err(`La toma ${n} del plano ${D.code[sh.id]} ya está anotada.`, 'T');
    const st = SQ_ST(f('E').value);
    if (!st) return err('Estado: B (buena), OK o NG.', 'E');
    const t = { n, st, t: normHM(f('H').value), note: f('N').value.trim() };
    const d = f('D').value.trim(), r = f('C').value.trim(), s = f('S').value.trim();
    if (d) t.d = d; if (r) t.r = r; if (s && !supMos(sh.id)) t.s = isMos(s) ? 'MOS' : s;
    if (!noted) { histNote('Carga rápida de tomas'); noted = true; }
    const L = P.sup.takes[sh.id] = P.sup.takes[sh.id] || [];
    let j = L.findIndex(x => +x.n > n); if (j < 0) j = L.length;
    L.splice(j, 0, t);
    if (st === 'bn') sh.done = true;
    changed('data');
    saved.push({ sh, code: D.code[sh.id], n, st, t: t.t, d, r, s: t.s || (supMos(sh.id) ? 'MOS' : ''), note: t.note });
    $('#sqErr', m).textContent = '';
    paint();
    // la fila siguiente: el mismo plano, la toma que sigue, el mismo material; el cursor en Estado
    autoT = true; f('T').value = n + 1;
    for (const k of ['E', 'H', 'D', 'N']) f(k).value = '';
    f('E').focus();
  };
  m.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && e.target.closest('.sq-in')) { e.preventDefault(); go(); } });
  $('#sqGo', m).onclick = go;
  m.addEventListener('click', e => { const b = e.target.closest('[data-sqv]'); if (b) { const ks = sheet.map(p => spKey(p.id)); photoViewer(ks, 'Hoja de script en papel', { at: +b.dataset.sqv }); } });
  setTimeout(() => f('E').focus(), 30);
}

/* ---------- ajustes, ayuda y exportar ---------- */
SETTINGS.sup = () => `<label class="fld"><span>Script / continuidad</span><input type="text" value="${esc(P.sup.supervisor || '')}" data-bind="sup-g" data-f="supervisor" placeholder="Nombre de quien hace script"></label>
  <p class="hint" style="margin:0">Sale en la hoja de script y en el parte diario.</p>`;
HELP.sup = [
  ['En cámara', 'El plano que se rueda. «+ Toma» anota una toma nueva con la hora, la tarjeta y el sonido en uso, y pone a correr el cronómetro. Buena, OK o NG la marcan y anotan su duración. «Siguiente plano» deja el plano como rodado y pone en cámara el que sigue.'],
  ['Notas y dictado', 'La nota de la toma se escribe o se dicta con el micrófono (si el navegador lo permite): lo dictado se agrega a lo escrito.'],
  ['Registro de tomas', 'Cada escena tiene su tabla: plano, toma, estado, hora, duración, tarjeta, sonido y notas. La toma buena lleva su número en un círculo. Toca una toma para cambiarla; toca el número de un plano para ponerlo en cámara. Las escenas completas se pliegan en una línea.'],
  ['MOS y sonido wild', 'MOS: toma sin sonido (botón «MOS» o «Plano MOS» para todas las tomas del plano). «+ Wild / ambiente» anota sonido grabado sin cámara, con su rollo de sonido.'],
  ['Continuidad', 'Por escena: vestuario, utilería, maquillaje y peinado, posiciones, cambios de texto, fotos de continuidad (en el celular, «Foto de continuidad» abre la cámara) y el tiempo en pantalla previsto y rodado.'],
  ['Más acciones', '⋯ de cada plano: ponerlo en cámara, plano MOS, nota del plano, plano no previsto debajo (1.1A), pick-up (1.1PU) o abrir el plano.'],
  ['Tarjeta y sonido', 'Los chips de arriba muestran la tarjeta de cámara y el rollo de sonido en uso: cámbialos cuando cambien y las tomas nuevas los anotan solas.'],
  ['Hoja en papel', 'Exportar › Hoja para imprimir arma una hoja A4 por escena para llenar con lapicero y el parte diario en blanco. «Carga rápida» pasa después esas tomas al programa, una fila tras otra; las fotos de la hoja quedan como respaldo.'],
  ['Parte diario', 'Con una jornada elegida, anota el llamado, la primera toma, el almuerzo, la última toma, el fin, las horas extra, las incidencias y las notas. «Parte diario» arma el resumen para producción.'],
  ['Reportes de cámara y sonido', 'Exportar › Reporte de cámara agrupa las tomas por tarjeta; Reporte de sonido, por rollo de sonido (con el sonido wild y las tomas MOS aparte).'],
];
EXPORTS.sup = () => [pdfItem('Hoja para imprimir (PDF)', 'sup', 'Una hoja A4 por escena para llenar a mano en el rodaje, y el parte diario en blanco', { blank: true }), pdfItem('Hoja de script (PDF)', 'sup', 'Las escenas de la jornada elegida, con sus tomas, continuidad y tiempos'), pdfItem('Parte diario (PDF)', 'parte', 'Resumen de la jornada para producción: horarios, avance, reparto e incidencias'), pdfItem('Reporte de cámara (PDF)', 'camrep', 'Las tomas por tarjeta: escena, plano, lente, hora y estado'), pdfItem('Reporte de sonido (PDF)', 'sndrep', 'Las tomas por rollo de sonido, con el sonido wild y las grabadas sin sonido (MOS)')];
TOOLS_EXTRA.sup = () => supEd() && supCtx().dayKey ? [[ICO.edit, 'Carga rápida', () => supQuick()]] : [];
