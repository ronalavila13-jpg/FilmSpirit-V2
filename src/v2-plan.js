/* ============================================================
   VERSIÓN 2 · PLAN DE RODAJE (PDF «FilmSpirit · versión 2», página Plan de rodaje)
   Arriba, cuatro tarjetas (jornadas, páginas, tiempo, reparto); las tiras con su leyenda y «Miniaturas del
   storyboard»; cada jornada con su título y sus tiras de color (exterior de día, interior de día, atardecer, interior
   de noche, exterior de noche) y su cierre negro. El tablero es el de la v1 (tab-plan.js): las tiras se arrastran,
   el clic derecho abre sus opciones y la DOOD sigue igual; aquí cambia la forma.
   ============================================================ */
const V2_STRIP = { d: ['Exterior día', '#FFF6D5'], di: ['Interior día', '#FFFFFF'], dd: ['Atardecer', '#FDEDDD'], n: ['Interior noche', '#EFF0EB'], ne: ['Exterior noche', '#E4E5E0'] };
const v2PlanOn = () => V2.on && UI.tab === 'plan';
const v2Dood = () => ls.get('plView', 'days') === 'cast';
const V2_WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

V2_ACTS.plan = () => `<div class="v2-seg" role="group" aria-label="Vista del plan">
    <button type="button" data-v2a="plv" data-v="days" aria-pressed="${ea(!v2Dood())}">Tiras</button><button type="button" data-v2a="plv" data-v="cast" aria-pressed="${ea(v2Dood())}">DOOD</button></div>`
  + v2Hist() + `<button type="button" class="v2-btn y" data-v2a="plpdf">${v2I('print')}<span>Ver y exportar PDF</span></button>`;
V2_DO.plv = b => { ls.set('plView', b.dataset.v === 'cast' ? 'cast' : 'days'); if (typeof plSel === 'function') plSel().clear(); render(); };
V2_DO.pladdday = b => ACT['pl-addday'](b);
V2_DO.plpdf = b => { if (typeof exportPDF === 'function') exportPDF(v2Dood() ? 'dood' : 'plan', b); };

/* «sáb 31 y dom 1» · «sáb 31 oct – dom 8 nov» */
function v2DaysLabel(dates) {
  const ds = dates.filter(Boolean);
  if (!ds.length) return 'sin fechas';
  const one = d => `${V2_WD[d.getDay()]} ${d.getDate()}`;
  if (ds.length <= 3) return ds.length === 1 ? one(ds[0]) : ds.slice(0, -1).map(one).join(', ') + ' y ' + one(ds[ds.length - 1]);
  const m = d => d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '');
  return `${one(ds[0])} ${m(ds[0])} – ${one(ds[ds.length - 1])} ${m(ds[ds.length - 1])}`;
}
/* «10 h» · «3 h 30 min» */
const v2Hours = m => { m = Math.round(m || 0); if (!m) return '0 h'; const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ' ' + r + ' min' : ''}` : `${r} min`; };

/* ---------- las tarjetas de arriba ---------- */
function v2PlanCards(o) {
  const { days, dates, shootDays, totalE } = o;
  let mins = 0; if (PL_TIMES.totals) for (const v of PL_TIMES.totals.values()) mins += v || 0;
  const per = shootDays ? Math.round(totalE / shootDays) : 0;
  const cast = Object.entries(D.castNum).sort((a, b) => a[1] - b[1]).map(([id, n]) => `${n} ${titleCase(P.elements[id].name)}`);
  return `<div class="v2-kpis">
    <div class="v2-kpi k"><span>Jornadas</span><b>${shootDays}</b><small>${esc(v2DaysLabel(dates.slice(0, days.length)))}</small></div>
    <div class="v2-kpi"><span>Páginas</span><b>${esc(fmtEighths(totalE))}</b><small>${esc(fmtEighths(per))} por jornada</small></div>
    <div class="v2-kpi"><span>Tiempo aprox.</span><b>${esc(v2Hours(mins).replace(/ 0 min$/, ''))}</b><small>de cámara</small></div>
    <div class="v2-kpi cast"><span>Reparto</span><p>${cast.length ? esc(cast.join(' · ')) : 'Marca personajes en el guion para numerarlos.'}</p></div>
  </div>`;
}
/* ---------- la fila de las tiras: leyenda, miniaturas y el ícono de las columnas ---------- */
function v2PlanTiras() {
  return `<div class="v2-tiras"><h2>Tiras</h2>
    ${Object.values(V2_STRIP).map(([n, c]) => `<span class="v2-sw"><i style="background:${ea(c)}"></i>${esc(n)}</span>`).join('')}
    <span class="v2-grow"></span>
    <span class="v2-hint">Arrastra las tiras para cambiar el orden</span>
    ${typeof planEditable === 'function' && planEditable() && !v2Dood() ? `<button type="button" class="v2-agr" data-act="v2-pladd" aria-haspopup="menu" title="Agregar una jornada o una etapa">${v2I('plus')}<span>Agregar</span></button>` : ''}
    <button type="button" class="v2-xl${planXL() ? ' on' : ''}" data-act="pl-style" data-v="${planXL() ? 'apple' : 'excel'}" aria-pressed="${ea(planXL())}" title="${ea(planXL() ? 'Estilo Cuadrícula (en la pantalla y en el PDF): toca para volver al estilo Limpio' : 'Estilo Limpio (en la pantalla y en el PDF): toca para pasar al estilo Cuadrícula')}" aria-label="Estilo Cuadrícula">${v2I('grid')}</button>
  </div>`;
}
V2_ICO.grid = '<rect x="4" y="5" width="16" height="14" rx="1"/><path d="M4 9.7h16M4 14.3h16M9.3 5v14M14.7 5v14"/>';

/* el primer plano de la escena: «1.1» (o «—» si no tiene) */
const v2Mom = s => { const t = String(s.tod || '').trim(); return t ? t.toUpperCase() : (DN_LAB[stripDN(s)] || '').toUpperCase(); };

/* ---------- las piezas del tablero, en la forma v2 (envuelven las de la v1) ---------- */
{
  const _ph = planHeadHTML, _plh = plHeadHTML, _ps = planStartHTML, _pr = planRowHTML, _pb = planBreakHTML, _lg = legendHTML;
  planHeadHTML = function (o) { return v2PlanOn() ? v2PlanCards(o) : _ph.apply(this, arguments); };
  plHeadHTML = function () {
    if (!v2PlanOn()) return _plh.apply(this, arguments);
    return `<div class="pl-head v2-plh"><span>Esc.</span><span>I/E</span><span>Momento</span><span>Locación y sinopsis</span><span>Págs.</span><span>Reparto</span><span>Tiempo aprox.</span><span>Notas</span>${planEditable() ? plRzHTML() : ''}</div>`;
  };
  planStartHTML = function (d, n, dates, ed) {
    if (!v2PlanOn()) return _ps.apply(this, arguments);
    const dt = dates[n];
    const date = dt ? cap1(dt.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')) : 'Sin fecha';
    const inf = dayInfo(d.keys, d.rows), loc = [...inf.locs][0] || '';
    const call = callOf(d.id, d);
    return `<div class="pstart v2-pst" data-n="${n}" ${ed ? `title="Arrastra para mover la jornada · ${ea(TOUCHY ? 'mantén el dedo' : 'clic derecho')}: opciones"` : ''}>
      <b>Jornada ${n + 1}</b><span>${esc(date)}${call ? ' · llamado ' + esc(call) : ''}${loc ? ' · ' + esc(loc) : ''}</span>
      ${ed ? `<button class="pdate v2-hide" data-act="pl-date" data-n="${n}" tabindex="-1" aria-hidden="true"></button>` : ''}</div>`;
  };
  planRowHTML = function (i, ed) {
    if (!v2PlanOn()) return _pr.apply(this, arguments);
    const it = P.schedule.items[i];
    if (it.e) return _pr.apply(this, arguments).replace('class="prow ev', 'class="prow v2-pev ev');
    const key = itemKey(it), sel = plSel().has(key), dis = ed ? '' : 'disabled';
    const s = sceneOfKey(it.k);
    const sk = stripKey(s), hc = hlc(it), col = hc || V2_STRIP[sk][1];
    const syn = synopsisOf(s);
    const est = v2Hours(rowEstDur(it));   // «1 h 30 min», como el PDF (parseDur lo entiende igual)
    return `<div class="prow sc v2-prow${ea(it.sp ? ' part' : '')}${ea(sel ? ' sel' : '')}" data-i="${i}" data-key="${esc(key)}" data-note="scene:${esc(s.key)}" data-strip="${ea(hc ? 'hl' : sk)}" style="--v2rc:${ea(col)}">
      <span class="v2-pe tnum">${esc(rowCode(it))}</span>
      <span class="v2-pi">${esc(ieLab(s))}</span>
      <span class="v2-pm">${esc(v2Mom(s))}</span>
      <span class="v2-ps"><b>${esc(setOf(s))}${it.sp ? '<em> (parte ' + esc(it.sp) + ')</em>' : ''}</b>${syn ? `<small>${esc(syn)}</small>` : ''}</span>
      <span class="v2-ppg tnum">${esc(fmtEighths(partEighths(it)))}</span>
      <span class="v2-pr">${esc(castText(s))}</span>
      <span class="v2-pt"><input type="text" class="dur" maxlength="10" value="${esc(it.dur ? v2Hours(num(it.dur)) : '')}" placeholder="${esc(est)}" data-bind="pl-f" data-f="dur" data-i="${i}" aria-label="Tiempo aproximado" ${dis}></span>
      <span class="v2-pn"><textarea rows="1" data-bind="pl-f" data-f="obs" data-i="${i}" aria-label="Notas" placeholder="${ea(ed ? 'Notas' : '')}" ${dis}>${esc(it.obs || '')}</textarea></span>
    </div>`;
  };
  planBreakHTML = function (d, n, dates, ed) {
    if (!v2PlanOn()) return _pb.apply(this, arguments);
    const inf = dayInfo(d.keys, d.rows), mins = (PL_TIMES.totals && PL_TIMES.totals.get(n)) || 0;
    return `<div class="prow brk v2-pbrk" data-i="${ea(d.i)}" data-n="${n}" data-key="${esc(itemKey(d.brk))}" ${ed ? `title="${ea(TOUCHY ? 'Mantén el dedo' : 'Clic derecho')}: opciones del cierre"` : ''}>
      <b>Fin de la jornada ${n + 1}</b><span>${esc(fmtEighths(inf.e))} págs. · ${esc(v2Hours(mins))} aprox.</span>
      ${ed ? `<button class="pdots v2-hide" data-act="pl-brkm" data-i="${ea(d.i)}" tabindex="-1" aria-hidden="true"></button>` : ''}</div>`;
  };
  legendHTML = function (tab) { if (tab === 'plan' && v2PlanOn()) return v2Dood() ? '' : v2PlanTiras(); return _lg.apply(this, arguments); };
}

/* (lote AJ) «Agregar» (en la fila de las tiras): una jornada vacía al final o una etapa nueva */
ACT['v2-pladd'] = b => popover(b, `<div class="menu v2-addm"><button type="button" data-k="day"><b>Jornada</b><small>Una jornada vacía al final: arrastra a ella las escenas</small></button><button type="button" data-k="stage"><b>Etapa</b><small>Su nombre y desde qué jornada empieza</small></button></div>`, p => p.addEventListener('click', e => {
  const x = e.target.closest('[data-k]'); if (!x) return;
  closePop(); setTimeout(() => ACT[x.dataset.k === 'day' ? 'pl-addday' : 'pl-addstage'](b.isConnected ? b : $('.v2-tiras .v2-agr') || b), 0);
}));
