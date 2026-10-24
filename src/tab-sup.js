/* ============================================================
   Pestaña 6 · HOJA DE SCRIPT — tomas, planos rodados y continuidad
   ============================================================ */
const TAKE_ST = { ng: 'NG', ok: 'OK', bn: 'Buena' };
function supScenes() {
  const { days, bank } = scheduleDays(P, D.sc);
  if (UI.supDay === -1) return D.sc.scenes.map(s => s.key);
  if (UI.supDay === -2) return bank;
  const d = days[UI.supDay];
  return d ? d.keys : [];
}
RENDER.sup = function () {
  const v = $('#view');
  if (!D.sc.scenes.length) { v.innerHTML = emptyScript(); bindView(); return; }
  const { days, bank } = scheduleDays(P, D.sc);
  if (UI.supDay >= days.length) UI.supDay = days.length ? 0 : -1;
  if (!days.length && UI.supDay >= 0) UI.supDay = -1;
  const dates = shootDates(P, days.length);
  const keys = supScenes();
  const shots = keys.flatMap(k => D.shotsBy[k] || []);
  const done = shots.filter(s => s.done).length;
  const scDone = keys.filter(k => (D.shotsBy[k] || []).length && D.shotsBy[k].every(s => s.done));
  const eDone = scDone.reduce((a, k) => a + D.metrics.eighths[sceneOfKey(k).idx], 0);
  const eAll = keys.reduce((a, k) => a + D.metrics.eighths[sceneOfKey(k).idx], 0);
  const dayKey = UI.supDay >= 0 && days[UI.supDay] ? days[UI.supDay].id : null;
  const dayMeta = dayKey ? (P.sup.day[dayKey] || {}) : null;
  v.innerHTML = `<div class="ws ws-1"><section class="center">
    <div class="bar">
      <select data-bind="sup-day" style="max-width:320px" aria-label="Jornada">
        ${days.map((d, i) => `<option value="${i}" ${UI.supDay === i ? 'selected' : ''}>Jornada ${i + 1}${dates[i] ? ' · ' + esc(fmtDate(dates[i])) : ''} · ${d.keys.length} esc.</option>`).join('')}
        ${bank.length ? `<option value="-2" ${UI.supDay === -2 ? 'selected' : ''}>Sin programar · ${bank.length} esc.</option>` : ''}
        <option value="-1" ${UI.supDay === -1 ? 'selected' : ''}>Todas las escenas</option>
      </select>
      <span class="grow"></span>
      ${toolsHTML()}
    </div>
    ${legendHTML('sup')}
    <div class="scroller pad" data-keep="sup"><div class="sup">
      ${supHeadHTML({ days, dates, keys, shots, done, scDone, eDone, eAll, dayKey, dayMeta })}
      ${keys.map(k => supSceneHTML(sceneOfKey(k))).join('') || '<p class="hint">No hay escenas en esta jornada.</p>'}
    </div></div>${supDockHTML(shots)}</section></div>`;
  bindView();
};
/* la cabecera de la hoja de script (lote I), como la de la hoja de llamado: el día como título con ‹ ›, el avance en
   una tarjeta y los datos de la jornada en listas (los vacíos dicen qué va; «del plan» en lo que sale del plan). En el
   teléfono, las listas se pliegan en una línea (tarjeta · sonido · llamado) */
function supHeadHTML(o) {
  const { days, dates, keys, shots, done, scDone, eDone, eAll, dayKey, dayMeta } = o;
  const n = UI.supDay, dt = n >= 0 ? dates[n] : null;
  const title = n === -1 ? 'Todas las escenas' : n === -2 ? 'Sin programar' : dt ? capFirst(dt.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')) : `Jornada ${n + 1}`;
  const stepA = i => i >= 0 && i < days.length ? `data-act="sup-go" data-d="${i}"` : null;
  const head = hdHead({ title: esc(title), step: n >= 0 && days.length > 1 ? hdStep(stepA(n - 1), stepA(n + 1)) : '',
    sub: `${n >= 0 ? `<b>Jornada ${n + 1} de ${days.length}</b> · ` : ''}${keys.length} ${keys.length === 1 ? 'escena' : 'escenas'} · Hoja de script`,
    act: dayKey ? hdBtn('sec', 'Parte diario', { icon: 'doc', attrs: 'data-act="sup-parte" title="Resumen de la jornada para producción (PDF)"' }) : '' });
  const pass = hdPass([
    { lab: 'Planos rodados', html: `<div class="hd-big tnum">${done}<small>de ${shots.length}</small></div><div class="hd-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${ea(shots.length)}" aria-valuenow="${ea(done)}" aria-label="Planos rodados"><i style="width:${ea(shots.length ? (done / shots.length * 100).toFixed(1) : 0)}%"></i></div>` },
    { lab: 'Escenas completas', val: `${scDone.length} <small>de ${keys.length}</small>`, cap: 'Se completan solas al rodar sus planos' },
    { lab: 'Páginas completas', val: `${esc(fmtEighths(eDone))} <small>de ${esc(fmtEighths(eAll))}</small>`, wide: true },
  ]);
  const rolls = [...supRolls(shots), ...supRolls(shots, 's')];
  const gMat = hdGroup('Material', hdRow('Tarjeta en cámara', `<input type="text" value="${esc(P.sup.roll || '')}" data-bind="sup-g" data-f="roll" placeholder="Agregar" aria-label="Tarjeta en cámara" title="Las tomas nuevas la anotan solas">`)
    + hdRow('Rollo de sonido', `<input type="text" value="${esc(P.sup.sroll || '')}" data-bind="sup-g" data-f="sroll" placeholder="Agregar" aria-label="Rollo de sonido" title="Las tomas nuevas lo anotan solas (para el reporte de sonido)">`)
    + hdRow('Usados', rolls.length ? `<span class="sup-rolls">${rolls.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</span>` : 'Con cada toma', { st: rolls.length ? '' : 'ph' }));
  let gHours = '', gInc = '', len = '';
  if (dayMeta) {
    const callPlan = !dayMeta.call && !!P.schedule.call;
    const tf = (f, lab) => tmIn(dayMeta[f], 'Hora', `data-bind="sup-dayf" data-f="${f}" data-id="${ea(dayKey)}" aria-label="${ea(lab)}"`, '');
    gHours = hdGroup('Horas', hdRow('Llamado', tmIn(dayMeta.call || P.schedule.call || '', 'Hora', `data-bind="sup-dayf" data-f="call" data-id="${ea(dayKey)}" aria-label="Llamado"`, ''), { tag: callPlan ? 'del plan' : '' })
      + hdRow('Primera toma', tf('first', 'Primera toma')) + hdRow('Fin de jornada', tf('wrap', 'Fin de jornada'))
      + hdRow('Horas extra', `<input type="text" value="${esc(dayMeta.extra || '')}" data-bind="sup-dayf" data-f="extra" data-id="${ea(dayKey)}" placeholder="Agregar" aria-label="Horas extra" title="Para el parte diario">`));
    const open = UI.supOpen || (UI.supOpen = new Set());
    const inc = (dayMeta.inc || '').trim() || open.has('inc'), notes = (dayMeta.notes || '').trim() || open.has('notes');
    gInc = hdGroup('Incidencias y notas', (inc ? `<label class="hd-tx"><span>Incidencias</span><input type="text" value="${esc(dayMeta.inc || '')}" data-bind="sup-dayf" data-f="inc" data-id="${ea(dayKey)}" placeholder="Demoras y su causa, accidentes, fallas de equipo"></label>`
        : hdAdd('Incidencias', 'Demoras y su causa, accidentes, fallas de equipo', 'data-act="sup-open" data-k="inc"'))
      + (notes ? `<label class="hd-tx"><span>Notas de la jornada</span><textarea rows="2" data-bind="sup-dayf" data-f="notes" data-id="${ea(dayKey)}" placeholder="Cambios de plan, material grabado, pendientes para mañana">${esc(dayMeta.notes || '')}</textarea></label>`
        : hdAdd('Notas de la jornada', 'Cambios de plan, material grabado, pendientes para mañana', 'data-act="sup-open" data-k="notes"')));
    const L = supLen(dayMeta.call || P.schedule.call, dayMeta.wrap);
    if (L) len = `<p class="hint sup-len">Jornada de ${esc(L)} h, del llamado al fin. «Parte diario» la resume para producción.</p>`;
  }
  // en el teléfono: una línea con lo que más se mira, que abre las listas
  const fold = `<button type="button" class="mf-h sup-hs" aria-expanded="${ea(!!MFOLD['sup-hd'])}" aria-label="Datos de la jornada: tarjeta, sonido, horarios y notas">${[['Tarjeta', P.sup.roll], ['Sonido', P.sup.sroll], ['Llamado', dayMeta ? dayMeta.call || P.schedule.call : '']].filter(x => x[1]).map(([k, x]) => `<span>${esc(k)} <b>${esc(x)}</b></span>`).join('') || '<span>Tarjeta, sonido y horarios de la jornada</span>'}</button>`;
  return `<section class="hd sup-hd0" aria-label="Cabecera de la hoja de script">${head}${pass}<div ${mfold('sup-hd', 'sup-hd')}>${fold}${hdGroups([gMat, gHours, gInc], 3)}${len}</div></section>`;
}
/* el plano que se está rodando: el último que se tocó (si sigue en la lista) o el primero sin rodar */
function supCur(shots) {
  const c = shots.find(x => x.id === UI.supCur);
  return c && !c.done ? c : shots.find(x => !x.done) || null;
}
/* en el teléfono: una barra fija abajo con «+ Toma» de ese plano y la última toma (con la mano libre, sin buscar) */
function supDockHTML(shots) {
  if (UI.readOnly) return '';
  const sh = supCur(shots); if (!sh) return '';
  const takes = P.sup.takes[sh.id] || [], last = takes[takes.length - 1];
  return `<div class="sup-dock" role="group" aria-label="Plano en rodaje"><button type="button" class="sup-dk-go" data-act="sup-go" data-id="${ea(sh.id)}" title="Ir al plano"><small>Rodando</small><b>Plano ${esc(D.code[sh.id])}</b>${last ? '' : '<span>Sin tomas</span>'}</button>
    ${last ? `<button type="button" class="sup-dk-tk take ${ea(last.st)}" data-act="take" data-id="${ea(sh.id)}" data-n="${takes.length - 1}" aria-label="${ea(EN ? trDone(`Take ${last.n}: ${tr(TAKE_ST[last.st])}. Change to NG, OK or Print`) : `Toma ${last.n}: ${TAKE_ST[last.st]}. Cambiar a NG, OK o Buena`)}" title="NG, OK o Buena, tarjeta y nota"><span data-no-tr>T${last.n}</span> · <span>${esc(TAKE_ST[last.st])}</span></button>` : ''}
    <button type="button" class="btn primary sup-dk-add" data-act="take-add" data-id="${ea(sh.id)}">${ICO.plus}Toma ${takes.length + 1}</button></div>`;
}
function supSceneHTML(s) {
  const shots = D.shotsBy[s.key] || [];
  const meta = P.sup.sc[s.key] || {};
  const complete = shots.length && shots.every(x => x.done);
  return `<article class="supsc${ea(lgDark(lgCol('plan', s.dn === 'N' ? 'n' : 'd')))}" id="sup-${ea(s.idx)}" data-dn="${s.dn === 'N' ? 'n' : 'd'}"><header><span class="no">${esc(s.key)}</span><div><h2 class="sch">${esc(s.heading)}</h2>${(d => d ? `<p class="scd">${esc(d)}</p>` : '')(synopsisOf(s))}<div class="badges" style="margin-top:4px">${ieBadge(s)}<span class="badge tnum">${fmtEighths(D.metrics.eighths[s.idx])} págs.</span>${complete ? '<span class="badge ok">Escena completa</span>' : ''}</div></div>
    <button class="btn sm" data-act="sup-add" data-i="${ea(s.idx)}" title="Agrega un plano al final de la escena con la numeración normal">+ Plano ${esc(s.key)}.${(shots.filter(x => !x.of || !P.shots[x.of] || P.shots[x.of].sc !== s.key).length) + 1}</button></header>
    ${shots.map(sh => {
    const takes = P.sup.takes[sh.id] || [];
    const good = takes.filter(t => t.st === 'bn').map(t => 'T' + t.n);
    const kind = sh.of && P.shots[sh.of] ? (sh.pu ? 'pu' : 'np') : '';
    return `<div class="suprow${ea(sh.done ? ' done' : '')}${ea(kind ? ' ' + kind : '')}" data-note="shot:${ea(sh.id)}">
      <input type="checkbox" data-bind="sup-done" data-id="${ea(sh.id)}" ${sh.done ? 'checked' : ''} aria-label="Plano ${esc(D.code[sh.id])} rodado">
      <span class="code">${esc(D.code[sh.id])}${kind ? `<small>${kind === 'pu' ? 'pick-up' : 'no previsto'}</small>` : ''}</span>
      <div class="what"><div class="desc">${esc(sh.desc || shotTextExcerpt(sh, 110) || 'Sin descripción')}</div>
        <div class="meta">${esc(shotLabel(sh))}${sh.lens ? ' · ' + esc(sh.lens) + 'mm' : ''}${good.length ? ' · Buenas: ' + good.join(', ') : ''}</div>
        <div class="takes">${takes.map((t, i) => `<button class="take ${ea(t.st)}" data-act="take" data-id="${ea(sh.id)}" data-n="${i}" title="${esc(TAKE_ST[t.st] + (t.r ? ' · ' + t.r : '') + (t.s ? ' · sonido ' + t.s : '') + (t.t ? ' · ' + t.t : '') + (t.note ? ' · ' + t.note : ''))}">T${t.n}${t.st === 'ng' ? ' ✕' : t.st === 'bn' ? ' ●' : ''}${t.r && (i === 0 || takes[i - 1].r !== t.r) ? ` <small>${esc(t.r)}</small>` : ''}${t.note ? ' <small>nota</small>' : ''}</button>`).join('')}
          <button class="btn ghost sm" data-act="take-add" data-id="${ea(sh.id)}">+ Toma</button><button class="btn ghost sm pmore" data-act="sup-more" data-id="${ea(sh.id)}" aria-label="Más acciones del plano ${esc(D.code[sh.id])}" title="Plano no previsto, pick-up, nota…">${ICO.more}</button></div>
        ${(P.sup.obs || {})[sh.id] || SUPNOTE.has(sh.id) ? `<textarea class="obs" rows="1" data-bind="sup-obs" data-id="${ea(sh.id)}" placeholder="Observaciones del plano: rácord, foco, sonido, cambios de texto…" aria-label="Observaciones del plano ${esc(D.code[sh.id])}">${esc((P.sup.obs || {})[sh.id] || '')}</textarea>` : ''}</div></div>`;
  }).join('') || `<div class="suprow"><span></span><span></span><div class="hint">Esta escena no tiene planos. Créalos en el guion o el storyboard, o añade uno no previsto.</div></div>`}
    <details class="supfoot-d" ${meta.start || meta.end || meta.screen || meta.notes ? 'open' : ''}><summary>Tiempos y continuidad de la escena</summary><div class="supfoot">
      <label class="fld"><span>Inicio</span>${tmIn(meta.start, '--:--', `data-bind="sup-sc" data-f="start" data-k="${esc(s.key)}"`, '')}</label>
      <label class="fld"><span>Fin</span>${tmIn(meta.end, '--:--', `data-bind="sup-sc" data-f="end" data-k="${esc(s.key)}"`, '')}</label>
      <label class="fld"><span>Duración en pantalla</span><input type="text" value="${esc(meta.screen || '')}" placeholder="1'20&quot;" data-bind="sup-sc" data-f="screen" data-k="${esc(s.key)}"></label>
      <label class="fld" style="grid-column:1/-1"><span>Continuidad</span><textarea rows="2" data-bind="sup-sc" data-f="notes" data-k="${esc(s.key)}" placeholder="Vestuario, utilería en mano, posiciones, cambios de diálogo…">${esc(meta.notes || '')}</textarea></label>
    </div></details></article>`;
}
/* tarjetas de cámara (r) o rollos de sonido (s) anotados en las tomas de estos planos, en orden de aparición */
function supRolls(shots, f = 'r') {
  const out = [];
  for (const sh of shots) for (const t of P.sup.takes[sh.id] || []) if (t[f] && !out.includes(t[f]) && !(f === 's' && /^mos$/i.test(t[f].trim()))) out.push(t[f]);
  return out;
}
/* duración de la jornada (h:mm) del llamado al fin; pasada la medianoche, cuenta el día siguiente */
function supLen(a, b) {
  const x = hmToMin(a), y = hmToMin(b);
  if (x == null || y == null) return '';
  const m = (y - x + 1440) % 1440 || 0;
  return m ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : '';
}
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
const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
Object.assign(ACT, {
  // cabecera: ‹ › de jornada (la misma en la hoja de llamado), el parte diario y las filas «+» de incidencias y notas
  'sup-go': b => { UI.supDay = +b.dataset.d; UI.callDay = UI.supDay; render(); },
  'sup-parte': b => exportPDF('parte', b),
  'sup-open': b => { (UI.supOpen || (UI.supOpen = new Set())).add(b.dataset.k); render(); requestAnimationFrame(() => { const i = $(`.sup-hd0 [data-f="${CSS.escape(b.dataset.k)}"]`); if (i) i.focus(); }); },
  'sup-go': b => { const r = $(`#view .suprow[data-note="shot:${CSS.escape(b.dataset.id)}"]`); if (r) { r.scrollIntoView({ block: 'center', behavior: 'smooth' }); r.classList.add('cl-flash'); setTimeout(() => r.classList.remove('cl-flash'), 1600); } },
  'take-add': b => {
    const id = b.dataset.id; UI.supCur = id;
    const list = P.sup.takes[id] = P.sup.takes[id] || [];
    list.push({ n: (list.length ? list[list.length - 1].n : 0) + 1, st: 'ok', t: nowHM(), note: '', ...(P.sup.roll ? { r: P.sup.roll } : {}), ...(P.sup.sroll ? { s: P.sup.sroll } : {}) });
    changed('data'); render();
  },
  take: b => {
    const id = b.dataset.id, i = +b.dataset.n; UI.supCur = id;
    const t = P.sup.takes[id][i];
    popover(b, `<h5>Toma ${t.n} · ${esc(D.code[id])}</h5>
      <div class="seg" role="group">${Object.entries(TAKE_ST).map(([k, n]) => `<button data-st="${k}" aria-pressed="${ea(t.st === k)}">${n}</button>`).join('')}</div>
      <div class="grid2"><label class="fld"><span>Hora</span><input type="text" inputmode="numeric" class="tm" maxlength="8" id="tkT" placeholder="--:--" value="${esc(t.t || '')}"></label><label class="fld"><span>Duración</span><input type="text" id="tkD" value="${esc(t.d || '')}" placeholder="0:42"></label>
        <label class="fld"><span>Tarjeta de cámara</span><input type="text" id="tkR" value="${esc(t.r || '')}" placeholder="ej.: A001"></label><label class="fld"><span>Sonido</span><input type="text" id="tkS" value="${esc(t.s || '')}" placeholder="ej.: S001, archivo o MOS" title="Rollo, archivo o pista de sonido; MOS si se grabó sin sonido"></label></div>
      <label class="fld"><span>Nota</span><input type="text" id="tkN" value="${esc(t.note || '')}" placeholder="Foco, ruido, falla de actor…"></label>
      <div style="display:flex;gap:6px;justify-content:space-between"><button class="btn sm danger" data-del>Eliminar toma</button><button class="btn sm primary" data-ok>Listo</button></div>`, p => {
      const save = () => { t.t = normHM($('#tkT', p).value); t.d = $('#tkD', p).value; t.note = $('#tkN', p).value; const r = $('#tkR', p).value.trim(); if (r) t.r = r; else delete t.r; const so = $('#tkS', p).value.trim(); if (so) t.s = so; else delete t.s; };
      // lo escrito queda guardado aunque se toque fuera (antes se perdía): se guarda al escribir y la tabla se repinta al cerrar
      let typed = false;
      p.addEventListener('input', () => { typed = true; save(); changed('data'); });
      p._onClose = () => { if (typed) render(); };
      p.addEventListener('click', e => {
        const x = e.target.closest('button'); if (!x) return;
        if (x.dataset.st) { t.st = x.dataset.st; save(); closePop(); changed('data'); render(); return; }
        if (x.dataset.del != null) { histNote('Eliminar una toma'); P.sup.takes[id].splice(i, 1); closePop(); changed('data'); render(); toastUndo('Toma eliminada.'); return; }
        if (x.dataset.ok != null) { save(); closePop(); changed('data'); render(); }
      });
    });
  },
  'sup-add': b => { const s = D.sc.scenes[+b.dataset.i]; const sh = newShot(s, null, null, { desc: '', size: 'PM' }, false); toast(`Plano ${D.code[sh.id]} agregado.`); },
  'sup-more': b => {
    const id = b.dataset.id, sh = P.shots[id]; if (!sh) return;
    const hasNote = (P.sup.obs || {})[id] || SUPNOTE.has(id);
    popover(b, `<h5>Plano ${esc(D.code[id])}</h5><div class="menu">
      ${hasNote ? '' : '<button data-m="note">+ Nota del plano</button>'}
      <button data-m="np">+ Plano no previsto debajo <small class="hint">(${esc(D.code[id])}A…)</small></button>
      <button data-m="pu">+ Pick-up de este plano</button><hr>
      <button data-m="open">Abrir el plano</button></div>`, p => p.addEventListener('click', e => {
      const x = e.target.closest('[data-m]'); if (!x) return;
      closePop();
      if (x.dataset.m === 'note') { SUPNOTE.add(id); render(); requestAnimationFrame(() => { const t = $(`textarea[data-bind="sup-obs"][data-id="${id}"]`); if (t) t.focus(); }); }
      if (x.dataset.m === 'np') addShotBelow(id, false);
      if (x.dataset.m === 'pu') addShotBelow(id, true);
      if (x.dataset.m === 'open') openShot(id);
    }));
  },
  'sup-np': b => addShotBelow(b.dataset.id, false),
  'sup-pu': b => addShotBelow(b.dataset.id, true),
});
Object.assign(BIND, {
  'sup-day': el => { UI.supDay = +el.value; if (UI.supDay >= 0) UI.callDay = UI.supDay; render(); },   // la misma jornada en la hoja de llamado
  'sup-g': (el, ev) => { P.sup[el.dataset.f] = el.value.trim(); changed('data'); if (ev === 'change') render(); },
  'sup-obs': el => { P.sup.obs = P.sup.obs || {}; if (el.value.trim()) P.sup.obs[el.dataset.id] = el.value; else delete P.sup.obs[el.dataset.id]; changed('data'); },
  'sup-done': el => { const sh = P.shots[el.dataset.id]; if (!sh) return; sh.done = el.checked; if (!el.checked) UI.supCur = sh.id; changed('data'); render(); },
  'sup-sc': (el, ev) => { if (el.classList.contains('tm')) { if (ev !== 'change') return; el.value = normHM(el.value); } const k = el.dataset.k; P.sup.sc[k] = P.sup.sc[k] || {}; P.sup.sc[k][el.dataset.f] = el.value; changed('data'); },
  'sup-dayf': (el, ev) => { if (el.classList.contains('tm')) { if (ev !== 'change') return; el.value = normHM(el.value); } const k = el.dataset.id; P.sup.day[k] = P.sup.day[k] || {}; P.sup.day[k][el.dataset.f] = el.value; changed('data'); },
});

/* ---------- ajustes, ayuda y exportar ---------- */
SETTINGS.sup = () => `<label class="fld"><span>Script / continuidad</span><input type="text" value="${esc(P.sup.supervisor || '')}" data-bind="sup-g" data-f="supervisor" placeholder="Nombre de quien hace script"></label>
  <p class="hint" style="margin:0">Sale en el PDF de la hoja de script.</p>`;
HELP.sup = [
  ['Tomas', '«+ Toma» anota una toma nueva con la hora y el rollo en cámara. Toca una toma para marcarla NG, OK o Buena y agregarle una nota.'],
  ['Planos rodados', 'Marca la casilla del plano cuando quede rodado. La escena y la jornada se completan solas.'],
  ['Más acciones', '⋯ junto a «+ Toma»: plano no previsto debajo (1.1A), pick-up (1.1PU), nota del plano o abrir el plano.'],
  ['Tarjeta y sonido', 'Cambia la tarjeta en cámara o el rollo de sonido cuando cambien: las tomas nuevas los anotan solas. En cada toma se pueden corregir (y escribir MOS si se grabó sin sonido).'],
  ['Parte diario', 'Con una jornada elegida, anota el llamado, la primera toma, el fin, las horas extra y las incidencias. Exportar › Parte diario arma el resumen para producción: horarios, escenas y páginas rodadas, planos, tomas, reparto, avance del rodaje y firmas.'],
  ['Reportes de cámara y sonido', 'Exportar › Reporte de cámara agrupa las tomas por tarjeta; Reporte de sonido, por rollo de sonido. Cada toma con su escena, plano, hora, duración, estado y nota.'],
];
EXPORTS.sup = () => [pdfItem('Hoja de script (PDF)', 'sup', 'Las escenas de la jornada elegida, con tomas y notas'), pdfItem('Parte diario (PDF)', 'parte', 'Resumen de la jornada para producción: horarios, avance, reparto e incidencias'), pdfItem('Reporte de cámara (PDF)', 'camrep', 'Las tomas por tarjeta: escena, plano, lente, hora y estado'), pdfItem('Reporte de sonido (PDF)', 'sndrep', 'Las tomas por rollo de sonido, con las grabadas sin sonido (MOS)')];
