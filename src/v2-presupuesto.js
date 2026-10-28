/* ============================================================
   VERSIÓN 2 · PRESUPUESTO (PDF «FilmSpirit · versión 2», página Presupuesto)
   Cuatro tarjetas (total, gastado, por gastar, por jornada), las 14 partidas con su barra y, a la derecha, la
   partida elegida con sus líneas: las «veces» que salen del plan de rodaje van en amarillo. Los totales, el enlace
   con el plan y el desglose, el registro de cambios y la protección con código son los de la v1 (tab-budget.js).
   ============================================================ */
/* «23 060» (miles con espacio, como el PDF) */
const v2Num = v => { const r = Math.round((+v || 0) * 100) / 100, neg = r < 0, a = Math.abs(r); const [i, d] = (a % 1 ? a.toFixed(2) : String(Math.round(a))).split('.'); return (neg ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (d ? ',' + d : ''); };
const v2Money = v => (P.budget.currency || 'S/') + ' ' + v2Num(v);
const V2_CUR_NAME = { 'S/': 'Soles', 'US$': 'Dólares', '€': 'Euros', '$': 'Pesos', 'COP$': 'Pesos', 'MX$': 'Pesos', 'CLP$': 'Pesos', 'ARS$': 'Pesos', 'Bs': 'Bolivianos' };
/* lo que cuesta cada jornada de rodaje: equipo, cámara, elenco, figuración, sonido, locaciones, transporte y comida */
const V2_SHOOT_SECS = ['cast', 'extras', 'crew', 'camera', 'sound', 'loc', 'trans', 'food'];

V2_ACTS.budget = () => (UI.budNote ? `<button type="button" class="v2-btn v2-pill" data-v2a="budnote"><i class="v2-dot" style="--v2-dc:var(--v2-red)"></i>Tarifas de ejemplo</button>` : '')
  + `<button type="button" class="v2-btn" data-v2a="budcur" aria-haspopup="menu">${esc(P.budget.currency || 'S/')} · ${esc(V2_CUR_NAME[P.budget.currency] || 'Moneda')}</button>`
  + v2Hist() + v2Export();
V2_DO.budnote = b => { if (ACT['bu-note-pop']) ACT['bu-note-pop'](b); };
V2_DO.budcur = b => {
  const CURS = ['S/', 'US$', '€', '$', 'COP$', 'MX$', 'CLP$', 'ARS$', 'Bs'];
  popover(b, `<div class="menu">${CURS.map(c => `<button type="button" data-cur="${ea(c)}"${c === P.budget.currency ? ' aria-current="true"' : ''}>${esc(c)} · ${esc(V2_CUR_NAME[c] || '')}</button>`).join('')}<hr><button type="button" data-cur="">Imprevistos, impuesto y dólares…</button></div>`,
    p => p.addEventListener('click', e => {
      const x = e.target.closest('[data-cur]'); if (!x) return; closePop();
      if (!x.dataset.cur) { const s = $('#view [data-act="settings"]'); if (s) s.click(); else if (ACT.settings) ACT.settings(b); return; }
      if (!budEditable()) return;
      const o = P.budget.currency; P.budget.currency = x.dataset.cur; budLog(`Moneda: ${o} → ${x.dataset.cur}`); changed('data'); render();
    }));
};

function v2BudCards(T, st, GT) {
  const spent = GT ? Object.values(GT.bySec).reduce((a, x) => a + (x.spent || 0) + (x.comp || 0), 0) : 0;
  const pct = T.total > 0 ? Math.round(spent / T.total * 100) : 0;
  const nSec = BUD_SECTIONS.filter(s => P.budget.lines.some(l => l.sec === s.id)).length;
  const perDay = st.shoot ? V2_SHOOT_SECS.reduce((a, k) => a + (T.bySec[k] || 0), 0) / st.shoot : 0;
  return `<div class="v2-kpis v2-bkpis">
    <div class="v2-kpi k"><span>Total del proyecto</span><b class="tnum">${esc(v2Money(T.total))}</b><small>${nSec} ${nSec === 1 ? 'partida' : 'partidas'} · ${st.shoot} ${st.shoot === 1 ? 'jornada' : 'jornadas'}</small></div>
    <div class="v2-kpi"><span>Gastado</span><b class="tnum">${esc(v2Money(spent))}</b><div class="v2-bar"><i style="width:${Math.min(100, pct)}%"></i></div><small>${pct} % del total</small></div>
    <div class="v2-kpi"><span>Por gastar</span><b class="tnum">${esc(v2Money(Math.max(0, T.total - spent)))}</b><small>se actualiza al cambiar cualquier línea</small></div>
    <div class="v2-kpi"><span>Por jornada de rodaje</span><b class="tnum">${st.shoot ? esc(v2Money(perDay)) : '—'}</b><small>${st.shoot ? 'equipo, cámara, elenco y comida' : 'sin jornadas en el plan'}</small></div>
  </div>`;
}
function v2BudSecs(T, cur) {
  const max = Math.max(1, ...BUD_SECTIONS.map(s => T.bySec[s.id] || 0));
  return `<section class="v2-card v2-bsecs"><h2>Por partida</h2>${BUD_SECTIONS.map(s => {
    const t = T.bySec[s.id] || 0, has = P.budget.lines.some(l => l.sec === s.id);
    return `<button type="button" class="v2-bsec${s.id === cur ? ' on' : ''}" data-v2sec="${ea(s.id)}"><span class="c">${esc(s.code)}</span><span class="n">${esc(s.name)}</span><b class="tnum">${t ? esc(v2Num(t)) : has ? 'en especie' : '—'}</b><span class="v2-bar"><i style="width:${(t / max * 100).toFixed(1)}%"></i></span></button>`;
  }).join('')}</section>`;
}
function v2BudLines(T, cur, ed) {
  const s = BUD_SECTIONS.find(x => x.id === cur) || BUD_SECTIONS[0];
  const lines = P.budget.lines.filter(l => l.sec === s.id);
  const dis = ed ? '' : 'disabled';
  const linked = lines.some(l => l.link);
  return `<section class="v2-card v2-bdet" data-sec="${ea(s.id)}">
    <header><span class="c">${esc(s.code)}</span><h2>${esc(s.name)}</h2><b class="tnum" data-v2sectot>${esc(v2Money(T.bySec[s.id] || 0))}</b>${ed ? `<button type="button" class="v2-btn sm" data-act="bu-add" data-sec="${ea(s.id)}">${v2I('plus')}<span>Línea</span></button>` : ''}</header>
    <table class="v2-btbl"><thead><tr><th>Concepto</th><th class="r">Cant.</th><th>Unidad</th><th class="r">Veces</th><th class="r">Tarifa</th><th class="r">Subtotal</th><th></th></tr></thead><tbody>
    ${lines.map(l => `<tr data-id="${ea(l.id)}" data-note="line:${ea(l.id)}">
      <td class="nm"><input type="text" value="${esc(l.name)}" data-bind="bu" data-f="name" data-id="${ea(l.id)}" aria-label="Concepto" ${dis}><small class="v2-edit">Editando la tarifa</small></td>
      <td class="r"><input type="number" min="0" step="any" class="pl" value="${ea(l.qty)}" data-bind="bu" data-f="qty" data-id="${ea(l.id)}" aria-label="Cantidad" ${dis}></td>
      <td><select data-bind="bu" data-f="unit" data-id="${ea(l.id)}" class="pl" aria-label="Unidad" ${dis}>${UNITS.map(un => `<option ${un === l.unit ? 'selected' : ''}>${un}</option>`).join('')}</select></td>
      <td class="r"><input type="number" min="0" step="any" class="box${l.link ? ' lk' : ''}" value="${ea(l.mult)}" data-bind="bu" data-f="mult" data-id="${ea(l.id)}" aria-label="Veces" title="${ea(l.link ? 'Sale del plan de rodaje: si agregas una jornada, se recalcula' : '')}" ${dis}></td>
      <td class="r"><input type="number" min="0" step="any" class="box" value="${ea(l.rate)}" data-bind="bu" data-f="rate" data-id="${ea(l.id)}" aria-label="Tarifa" ${dis}></td>
      <td class="r st tnum" data-v2lt="${ea(l.id)}">${esc(v2Num(lineTotal(l)))}</td>
      <td class="x">${ed ? `<button type="button" class="v2-x" data-act="bu-del" data-id="${ea(l.id)}" aria-label="Eliminar la línea ${esc(l.name)}" title="Eliminar línea">${v2I('x')}</button>` : ''}</td></tr>`).join('')}
    ${lines.length ? '' : `<tr><td colspan="7" class="v2-mut" style="padding:18px">Sin líneas en esta partida.</td></tr>`}
    </tbody><tfoot><tr><td colspan="5">Total de la partida</td><td class="r tnum" data-v2sectot2>${esc(v2Num(T.bySec[s.id] || 0))}</td><td></td></tr></tfoot></table>
    ${linked ? '<p class="v2-bnote"><i></i>Las «veces» en amarillo salen del plan de rodaje: si agregas una jornada, se recalculan solas.</p>' : ''}
  </section>`;
}
V2_ICO.x = '<path d="M7 7l10 10M17 7 7 17"/>';

RENDER.budget = (orig => function () {
  if (!V2.on) return orig.apply(this, arguments);
  const v = $('#view');
  if (BUDS.pid !== P.id) { BUDS.pid = P.id; BUDS.who = null; }
  if (!budOpen()) return orig.apply(this, arguments);   // bloqueado con código: la pantalla de la v1
  const ed = budEditable();
  const before = JSON.stringify(P.budget.lines);
  const sy = syncBudget(P, D.sc, D.sem);
  if (JSON.stringify(P.budget.lines) !== before && ed) changed('data');
  if (sy.gone.length) setTimeout(() => toast(sy.gone.length === 1 ? `«${sy.gone[0]}» ya no está en el desglose: su línea quedó en el presupuesto, sin enlace.` : `${sy.gone.length} líneas quedaron sin enlace: sus elementos ya no están en el desglose.`, 6000), 60);
  const T = budgetTotals(P), st = budgetStats(P, D.sc, D.sem);
  const GT = typeof gaBudget === 'function' ? gaBudget() : null;
  let cur = ls.get('v2BudSec', '');
  if (!BUD_SECTIONS.some(s => s.id === cur)) cur = BUD_SECTIONS.find(s => s.id === 'crew') ? 'crew' : BUD_SECTIONS[0].id;
  v.innerHTML = `<div class="v2-pg v2-bud" data-keep="bud">
    ${v2BudCards(T, st, GT)}
    <div class="v2-bgrid">${v2BudSecs(T, cur)}${v2BudLines(T, cur, ed)}</div>
    ${budProtected() ? `<div style="margin-top:20px">${budAccessHTML(ed)}</div>` : ''}
    <button type="button" class="v2-hide" data-act="settings" tabindex="-1" aria-hidden="true"></button>
  </div>`;
  bindView();
  v2BudBind();
})(RENDER.budget);

function v2BudBind() {
  const v = $('#view');
  if (v._v2bu) return; v._v2bu = true;
  v.addEventListener('click', e => { const b = e.target.closest('[data-v2sec]'); if (b && UI.tab === 'budget') { ls.set('v2BudSec', b.dataset.v2sec); render(); } });
  // «Editando la tarifa»: debajo del concepto mientras se escribe la tarifa
  v.addEventListener('focusin', e => { const i = e.target.closest('.v2-btbl input[data-f="rate"]'); $$('.v2-btbl tr.ed', v).forEach(r => r.classList.remove('ed')); if (i) i.closest('tr').classList.add('ed'); });
  v.addEventListener('focusout', e => { const i = e.target.closest('.v2-btbl input[data-f="rate"]'); if (i) i.closest('tr').classList.remove('ed'); });
}
/* al escribir en una línea, la v1 rehace sus totales (refreshBudgetTotals): aquí, también los de la forma v2 */
{
  const _rbt = refreshBudgetTotals;
  refreshBudgetTotals = function () {
    if (!(V2.on && $('#view .v2-bud'))) return _rbt.apply(this, arguments);
    const T = budgetTotals(P), st = budgetStats(P, D.sc, D.sem), GT = typeof gaBudget === 'function' ? gaBudget() : null;
    $$('[data-v2lt]').forEach(td => { const l = P.budget.lines.find(x => x.id === td.dataset.v2lt); if (l) td.textContent = v2Num(lineTotal(l)); });
    const det = $('#view .v2-bdet'), sec = det && det.dataset.sec;
    if (sec) { const a = $('[data-v2sectot]', det), b = $('[data-v2sectot2]', det); if (a) a.textContent = v2Money(T.bySec[sec] || 0); if (b) b.textContent = v2Num(T.bySec[sec] || 0); }
    const k = $('#view .v2-bkpis'); if (k) k.outerHTML = v2BudCards(T, st, GT);
    const s = $('#view .v2-bsecs'); if (s) s.outerHTML = v2BudSecs(T, sec || '');
  };
}
