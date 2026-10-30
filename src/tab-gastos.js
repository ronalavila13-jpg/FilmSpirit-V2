/* ============================================================
   Pestaña · GASTOS — lo gastado contra lo presupuestado
   Solo en la web con cuentas, con Pro y Studio. Vistas: Resumen (por partida: presupuestado, comprometido, gastado y
   saldo), Órdenes de compra, Caja chica (con los reembolsos) y Pagos.
   Datos: P.gastos = { ocs, cajas, reemb, motivos }; a quien no ve el presupuesto el servidor le suma «partidas» (las
   líneas del presupuesto sin montos) y «moneda». Quién hace qué: areas.js (gaRole, gaCan); el servidor guarda solo lo
   que le toca a cada quien (gaFilter) y anota quién aprobó, pagó, revisó o anuló.
   ============================================================ */
TAB_NAMES.gastos = 'Gastos';
// el ícono: un recibo con su borde dentado y una moneda (mismo estilo que los de iconos.js)
TAB_ICO.gastos = icoFix('<path class="a" d="M8.2 5.2h16.4c.9 0 1.6.7 1.6 1.6v20.6l-2.7-1.8-2.7 1.8-2.7-1.8-2.7 1.8-2.7-1.8-2.7 1.8-2.6-1.8V6.8c0-.9.7-1.6 1.6-1.6Z"/><path class="b" d="M6.6 3.6H23c.9 0 1.6.7 1.6 1.6v20.6l-2.7-1.8-2.7 1.8-2.7-1.8-2.7 1.8-2.7-1.8-2.7 1.8L5 25.8V5.2c0-.9.7-1.6 1.6-1.6Z"/><rect class="k" x="8.4" y="8" width="12.6" height="1.9" rx=".95"/><rect class="k" x="8.4" y="12.2" width="8.6" height="1.9" rx=".95"/><circle class="c" cx="21.6" cy="20" r="5.2"/><path class="k" d="M21.6 17.2v5.6M19.9 18.6h2.6c.7 0 1.2.4 1.2 1s-.5 1-1.2 1h-1.8c-.7 0-1.2.4-1.2 1s.5 1 1.2 1h2.6"/>');

const GS = { view: '', st: 'all', who: '', sec: '', week: '' };
const gsData = () => P.gastos || (P.gastos = secEmpty('gastos'));
const gsMe = () => gaCan(gaWhoOf(SHARE));
// el plan del dueño del proyecto (lo manda el servidor): Indie no tiene Gastos aunque planAllows lo dé por pagado
const gsPlanOk = () => !!(SHARE && SHARE.limits && SHARE.limits.gastos);
// la pestaña existe en la web con cuentas, en proyectos de producción con Pro o Studio
const gsOn = () => typeof API === 'function' && API() && !!SHARE && !!P && SHARE.pid === P.id && SHARE.kind !== 'guion' && gsPlanOk();
// se ve si la persona tiene algo que hacer ahí: producción, un jefe de área, o quien tiene una caja chica o un reembolso
function gsTabOk() {
  if (!gsOn()) return false;
  const c = gsMe();
  if (c.seesAll || c.role === 'area') return true;
  const g = gsData();
  return g.cajas.length > 0 || g.reemb.length > 0;
}
const gsCur = () => (canReadData('presupuesto') && P.budget && P.budget.currency) || gsData().moneda || (P.budget && P.budget.currency) || 'S/';
const gsM = v => gsCur() + ' ' + moneyNum(v);
const gsToday = () => isoDay(new Date());
const gsDay = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
/* las líneas del presupuesto para elegir la partida: las del presupuesto si se ve; si no, las que manda el servidor */
function gsLines() {
  if (canReadData('presupuesto') && P.budget && Array.isArray(P.budget.lines) && P.budget.lines.length) return P.budget.lines.map(l => ({ id: l.id, sec: l.sec, name: l.name }));
  return Array.isArray(gsData().partidas) ? gsData().partidas : [];
}
const gsSecName = id => (BUD_SECTIONS.find(s => s.id === id) || { name: id || '—' }).name;
const gsLineOf = id => gsLines().find(l => l.id === id) || null;
const gsPartida = x => { const l = x.line && gsLineOf(x.line); return l ? `${gsSecName(l.sec)} · ${l.name}` : gsSecName(x.sec); };
// lo mismo para los documentos en inglés: la partida se traduce, el nombre de la línea no
const gsPartidaTr = x => { const l = x.line && gsLineOf(x.line); return l ? `${tr(gsSecName(l.sec))} · ${l.name}` : tr(gsSecName(x.sec)); };
// el presupuesto protegido con código: el resumen y los pagos también (tab-budget.js)
const gsBudLocked = () => typeof budOpen === 'function' && canReadData('presupuesto') && !budOpen();
// el impuesto de las órdenes (nombre y %): el del presupuesto; a quien no lo ve se lo manda el servidor
const gsTax = () => (canReadData('presupuesto') && P.budget) ? { name: taxName(P), rate: num(P.budget.igvRate) || 18 } : gsData().impuesto || { name: 'IGV', rate: 18 };
const gsOcTotal = o => gastosOc(o, gsTax().rate).total;
const OC_ST = { draft: ['En borrador', ''], ok: ['Aprobada', 'info'], paid: ['Pagada', 'ok'], void: ['Anulada', 'void'] };
const RB_ST = { pend: ['Por aprobar', ''], ok: ['Aprobado', 'info'], paid: ['Pagado', 'ok'], void: ['Anulado', 'void'] };
const PAY_N = { transf: 'Transferencia', efectivo: 'Efectivo', cheque: 'Cheque', yape: 'Yape o Plin', tarjeta: 'Tarjeta' };
const gsChip = ([t, k]) => `<span class="ga-st${k ? ' ' + k : ''}">${esc(t)}</span>`;
// una cifra grande con su rótulo y una nota (sub ya viene en HTML)
const gsCard = (lab, val, sub, cls) => `<div class="ga-k${cls ? ' ' + cls : ''}"><span class="lab">${esc(lab)}</span><b class="tnum">${esc(val)}</b><span class="hint">${sub}</span></div>`;

/* ---------- la pestaña ---------- */
RENDER.gastos = function () {
  const v = $('#view');
  if (!gsOn()) {
    v.innerHTML = `<div class="ws ws-1"><section class="center"><div class="scroller pad"><div class="ga-empty card"><h2>Gastos</h2><p class="hint">Órdenes de compra, caja chica, reembolsos y pagos, contra el presupuesto. Está en ${esc(appName())} en la web con cuentas, con Pro y Studio.</p></div></div></section></div>`;
    bindView(); return;
  }
  const me = gsMe();
  const views = me.seesAll ? [['sum', 'Resumen'], ['oc', 'Órdenes de compra'], ['caja', 'Caja chica'], ['pay', 'Pagos']]
    : me.role === 'area' ? [['oc', 'Órdenes de compra'], ['caja', 'Caja chica']] : [['caja', 'Caja chica']];
  if (!views.some(x => x[0] === GS.view)) GS.view = matchMedia('(max-width: 700px)').matches && !me.seesAll ? 'caja' : views[0][0];
  const locked = (GS.view === 'sum' || GS.view === 'pay') && gsBudLocked();
  if (locked) { v.innerHTML = budLockHTML(); bindView(); bindBudLock(); return; }
  const act = GS.view === 'caja' ? gsCajaActs(me) : (GS.view === 'oc' || GS.view === 'sum') && me.ocNew ? `<button class="btn primary" data-act="ga-oc-new" aria-label="${ea(me.seesAll ? 'Nueva orden de compra' : 'Pedir una orden de compra')}">${ICO.plus}<span class="hide-sm">Orden de compra</span></button>` : '';
  v.innerHTML = `<div class="ws ws-1"><section class="center">
    <div class="bar">
      ${views.length > 1 ? `<div class="seg ga-views" role="group" aria-label="Vistas de Gastos">${views.map(([k, n]) => `<button data-act="ga-view" data-v="${k}" aria-pressed="${ea(GS.view === k)}">${esc(n)}</button>`).join('')}</div>` : '<b class="ga-only">Caja chica</b>'}
      <span class="grow"></span>
      ${act}
      ${toolsHTML()}
    </div>
    <div class="scroller pad" data-keep="ga-${ea(GS.view)}"><div class="ga">${GS.view === 'sum' ? gsSumHTML(me) : GS.view === 'oc' ? gsOcHTML(me) : GS.view === 'caja' ? gsCajaHTML(me) : gsPayHTML(me)}</div></div>
  </section></div>`;
  bindView();
  gsThumbs();
};

/* ---------- Resumen ---------- */
// las jornadas de rodaje: cuántas van (para «jornada 2 de 5» en el resumen y en el reporte)
const gsDays = () => { try { const { days } = scheduleDays(P, D.sc), dates = shootDates(P, days.length), t = gsToday(); const done = dates.filter(d => d && isoDay(d) <= t).length; return days.length ? { done, n: days.length } : null; } catch (e) { return null; } };
const gsDaysTxt = d => d ? (d.done <= 0 ? (d.n === 1 ? 'falta la jornada' : `faltan las ${d.n} jornadas`) : d.done >= d.n ? 'rodaje terminado' : `jornada ${d.done} de ${d.n}`) : '';
// en dólares: con el tipo de cambio del presupuesto (si se ve y el plan lo tiene)
const gsFx = () => canReadData('presupuesto') && P.budget && planAllows('usd') ? budgetFx(P) : 0;
// las mismas cifras de la pantalla y del reporte de sobrecostos (core.js · gastosResumen)
const gsSumRows = () => gastosResumen(P, canReadData('presupuesto'));
function gsSumHTML(me) {
  const { T, G, rows, over, left } = gsSumRows(), g = gsData();
  const days = gsDays();
  const card = gsCard;
  const bar = r => { const p = Math.min(100, r.pct), cls = r.pct > 100.0001 ? 'bad' : r.pct >= 90 ? 'warn' : ''; return `<span class="ga-bar${cls ? ' ' + cls : ''}" role="img" aria-label="${ea(Number.isFinite(r.pct) ? Math.round(r.pct) + ' %' : 'sin presupuesto')}"><i style="width:${ea(Number.isFinite(p) ? p.toFixed(1) : 100)}%"></i></span>`; };
  const canMot = me.motivos;
  return `<div class="ga-kpis">
      ${card('Presupuestado', gsM(T.sub), canReadData('presupuesto') ? 'sin imprevistos ni impuesto' : 'no tienes acceso al presupuesto')}
      ${card('Comprometido', gsM(G.comp), G.nComp === 1 ? '1 orden o reembolso aprobado sin pagar' : `${G.nComp} órdenes o reembolsos aprobados sin pagar`)}
      ${card('Gastado', gsM(G.spent), `<span>${T.sub ? Math.round(G.spent / T.sub * 100) : 0} % del presupuesto</span>${days ? ` · <span>${gsDaysTxt(days)}</span>` : ''}`)}
      ${card('Disponible', gsM(left), T.cont ? `+ imprevistos ${esc(gsM(T.cont))} sin usar` : 'sin imprevistos', left < 0 ? 'bad' : '')}
    </div>
    ${over.length ? `<div class="ga-alert" role="status">${ICO.warn}<p><b>${over.length === 1 ? '1 partida pasó su monto' : `${over.length} partidas pasaron su monto`}:</b> ${over.map(r => `<span>${esc(r.name)}</span> <span class="tnum" data-no-tr>(+${esc(gsM(r.comp + r.spent - r.budget))})</span>`).join(', ')}. <span>${canMot ? 'Escribe el motivo de cada una: va al reporte de sobrecostos.' : 'El motivo queda escrito para el reporte de sobrecostos.'}</span></p></div>` : ''}
    ${rows.length ? `<div class="ga-tbl-wrap"><table class="tbl ga-sum"><thead><tr><th>Partida</th><th class="num">Presupuestado</th><th class="num">Comprometido</th><th class="num">Gastado</th><th class="num">Saldo</th><th class="num ga-av">Avance</th></tr></thead><tbody>
      ${rows.map(r => {
        const o = r.comp + r.spent > r.budget + 0.005, cls = o ? 'bad' : r.pct >= 90 ? 'warn' : '';
        return `<tr class="${o ? 'over' : ''}" data-sec="${ea(r.id)}"><td><span class="code">${esc(r.code)}</span><b>${esc(r.name)}</b>
          ${o ? (canMot ? `<label class="ga-mot"><span>Motivo</span><input type="text" value="${esc(g.motivos[r.id] || '')}" data-bind="ga-mot" data-sec="${ea(r.id)}" placeholder="${ea('Por qué se pasó (va al reporte de sobrecostos)')}" maxlength="500"></label>` : g.motivos[r.id] ? `<span class="hint ga-motv">Motivo: ${esc(g.motivos[r.id])}</span>` : '<span class="hint ga-motv">Sin motivo todavía.</span>') : ''}</td>
          <td class="num tnum" data-l="${ea(tr('Presupuestado'))}">${esc(gsM(r.budget))}</td><td class="num tnum" data-l="${ea(tr('Comprometido'))}">${r.comp ? esc(gsM(r.comp)) : '<span class="hint">—</span>'}</td><td class="num tnum" data-l="${ea(tr('Gastado'))}">${r.spent ? esc(gsM(r.spent)) : '<span class="hint">—</span>'}</td>
          <td class="num tnum${cls ? ' ' + cls : ''}" data-l="${ea(tr('Saldo'))}">${r.left < -0.005 ? '− ' + esc(gsM(-r.left)) : esc(gsM(r.left))}</td>
          <td class="num ga-av" data-l="${ea(tr('Avance'))}"><span class="tnum">${Number.isFinite(r.pct) ? Math.round(r.pct) + ' %' : '—'}</span>${bar(r)}</td></tr>`;
      }).join('')}</tbody></table></div>`
      : `<div class="ga-empty card"><h3>Todavía no hay montos</h3><p class="hint">${canReadData('presupuesto') ? 'Arma el presupuesto y registra órdenes de compra, caja chica y reembolsos: aquí verás cada partida contra lo gastado.' : 'Aquí verás cada partida contra lo gastado.'}</p></div>`}`;
}

/* ---------- Órdenes de compra ---------- */
function gsOcHTML(me) {
  const g = gsData(), all = g.ocs.slice().sort((a, b) => (b.at || 0) - (a.at || 0) || String(b.num).localeCompare(String(a.num)));
  const cnt = st => all.filter(o => st === 'all' || o.state === st).length;
  const F = [['all', 'Todas'], ['draft', 'Borradores'], ['ok', 'Aprobadas'], ['paid', 'Pagadas'], ['void', 'Anuladas']];
  if (!F.some(f => f[0] === GS.st)) GS.st = 'all';
  const list = all.filter(o => GS.st === 'all' || o.state === GS.st);
  const acts = o => {
    const out = [];
    if (o.state === 'draft' && me.ocApprove) out.push(`<button class="btn sm" data-act="ga-oc-ok" data-id="${ea(o.id)}">Aprobar</button>`);
    if (o.state === 'ok' && me.ocPay) out.push(`<button class="btn sm" data-act="ga-oc-pay" data-id="${ea(o.id)}">Marcar pagada</button>`);
    if (me.seesAll && o.state !== 'draft' && typeof gsOcPdf === 'function') out.push(`<button class="btn ghost sm" data-act="ga-oc-pdf" data-id="${ea(o.id)}" title="${ea('PDF para enviar al proveedor')}">PDF</button>`);
    if (o.state !== 'void' && me.void) out.push(`<button class="btn ghost sm danger" data-act="ga-oc-void" data-id="${ea(o.id)}">Anular</button>`);
    return out.join('');
  };
  // quién y cuándo (los nombres y los motivos los escribe cada persona: no se traducen)
  const nm = n => `<span data-no-tr>${esc(n || '')}</span>`;
  const who = o => o.state === 'void' && o.void ? `<span>Anulada por</span> ${nm(o.void.name)}: ${nm(o.void.why)}` : o.state === 'paid' && o.paid ? `<span>Pagada el</span> <span>${esc(gsDay(o.paid.date))}</span>${o.paid.name ? ' · ' + nm(o.paid.name) : ''}` : o.state === 'ok' && o.ok ? `<span>Aprobada por</span> ${nm(o.ok.name)}` : o.name ? `<span>Pedida por</span> ${nm(o.name)}` : '';
  return `<div class="ga-filt seg" role="group" aria-label="Estado">${F.map(([k, n]) => `<button data-act="ga-st" data-v="${k}" aria-pressed="${ea(GS.st === k)}">${esc(n)} <span class="tnum">${cnt(k)}</span></button>`).join('')}</div>
    ${list.length ? `<div class="ga-ocs">${list.map(o => `<article class="ga-oc card${o.state === 'void' ? ' void' : ''}" data-id="${ea(o.id)}">
        <button class="ga-oc-main" data-act="ga-oc-open" data-id="${ea(o.id)}" aria-label="${ea(`Abrir la orden ${o.num || 'nueva'} de ${o.vendor || 'sin proveedor'}`)}">
          <span class="ga-oc-n tnum">${esc(o.num || 'Nueva')}</span>
          <span class="ga-oc-t"><b${o.vendor ? ' data-no-tr' : ''}>${esc(o.vendor || 'Sin proveedor')}</b>${o.desc ? ` · <span data-no-tr>${esc(o.desc)}</span>` : ''}<small>${esc(gsPartida(o))}${o.date ? ' · ' + esc(gsDay(o.date)) : ''}${o.ph ? ` · ${ICO.image}` : ''}</small></span>
          <span class="ga-oc-m tnum">${esc(gsM(gsOcTotal(o)))}${o.igv ? `<small>${esc(gsM(o.amount))} + ${esc(gsTax().name)}</small>` : ''}</span>
        </button>
        <footer>${gsChip(OC_ST[o.state])}<span class="hint ga-who">${who(o)}</span><span class="grow"></span>${acts(o)}</footer>
      </article>`).join('')}</div>`
      : `<div class="ga-empty card"><h3>${GS.st === 'all' ? 'Todavía no hay órdenes de compra' : 'No hay órdenes en este estado'}</h3><p class="hint">${me.ocNew ? (me.seesAll ? 'Cada orden se numera sola (OC-001, OC-002…), va a una partida del presupuesto y se exporta en PDF para el proveedor. Las que crea producción nacen aprobadas.' : 'Pide aquí lo que necesita tu área: producción la revisa, la aprueba y la paga.') : ''}</p>${me.ocNew && GS.st === 'all' ? `<button class="btn primary" data-act="ga-oc-new">${ICO.plus}<span>Orden de compra</span></button>` : ''}</div>`}`;
}
/* la partida: las líneas del presupuesto por partida (para un jefe de área, solo las de sus partidas) */
function gsLineSelect(sel, onlySecs, id) {
  const L = gsLines(), secs = BUD_SECTIONS.filter(s => (!onlySecs || onlySecs.includes(s.id)));
  const groups = secs.map(s => [s, L.filter(l => l.sec === s.id)]).filter(([s, ls]) => ls.length || !L.length);
  return `<select id="${ea(id)}" aria-label="Partida">${!L.length ? secs.map(s => `<option value="sec:${ea(s.id)}" ${sel && sel.sec === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')
    : groups.map(([s, ls]) => `<optgroup label="${ea(s.name)}">${ls.map(l => `<option value="${ea(l.id)}" ${sel && sel.line === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}<option value="sec:${ea(s.id)}" ${sel && !sel.line && sel.sec === s.id ? 'selected' : ''}>${esc(s.name)} (otra)</option></optgroup>`).join('')}</select>`;
}
const gsLinePick = v => v.startsWith('sec:') ? { line: '', sec: v.slice(4) } : { line: v, sec: (gsLineOf(v) || {}).sec || '' };
const gsVendors = () => [...new Set([...((P.call && P.call.vendors) || []).map(x => x && (x.name || x.company)).filter(Boolean), ...gsData().ocs.map(o => o.vendor).filter(Boolean)])].slice(0, 300);
function gsOcDialog(o) {
  const me = gsMe(), isNew = !o, x = o || { id: uid('oc'), vendor: '', ruc: '', line: '', sec: '', desc: '', amount: '', igv: false, date: gsToday(), pay: 'transf', note: '', state: me.seesAll ? 'ok' : 'draft' };
  const edit = isNew || (x.state === 'draft' && (me.ocApprove || x.uid === SHARE.me.id)) || (x.state === 'ok' && me.ocApprove);
  const dis = edit ? '' : 'disabled', tax = gsTax();
  const secs = me.seesAll ? null : gaAreaSecs(gaWhoOf(SHARE));
  const m = modal({
    title: isNew ? (me.seesAll ? 'Orden de compra' : 'Pedir una orden de compra') : `${x.num || 'Orden nueva'} · ${OC_ST[x.state][0]}`,
    body: `<div class="ga-form">
      <label class="fld"><span>Proveedor</span><input type="text" id="goV" value="${esc(x.vendor)}" list="goVL" maxlength="120" autocomplete="off" ${dis}></label><datalist id="goVL">${gsVendors().map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <label class="fld"><span>RUC</span><input type="text" id="goR" value="${esc(x.ruc)}" inputmode="numeric" maxlength="20" placeholder="${ea('Opcional')}" ${dis}></label>
      <label class="fld ga-w"><span>Partida</span>${gsLineSelect(x, secs, 'goL')}</label>
      <label class="fld ga-w"><span>Qué se compra o alquila</span><input type="text" id="goD" value="${esc(x.desc)}" maxlength="300" ${dis}></label>
      <label class="fld"><span>Monto (${esc(gsCur())})</span><input type="number" id="goA" min="0" step="0.01" inputmode="decimal" value="${ea(x.amount)}" ${dis}></label>
      <label class="fld"><span>Fecha</span><input type="date" id="goT" value="${ea(x.date)}" ${dis}></label>
      <label class="opt-in ga-w"><input type="checkbox" id="goI" ${x.igv ? 'checked' : ''} ${dis}> Sumar ${esc(tax.name)} (${tax.rate} %) al monto <span class="hint" id="goTot"></span></label>
      <label class="fld"><span>Forma de pago</span><select id="goP" ${dis}>${Object.entries(PAY_N).map(([k, n]) => `<option value="${k}" ${x.pay === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <label class="fld ga-w"><span>Nota</span><input type="text" id="goN" value="${esc(x.note)}" maxlength="300" placeholder="${ea('Condiciones, entrega, contacto…')}" ${dis}></label>
      ${gsPhotoField('ga~oc~' + x.id, edit, '', 'Cotización o comprobante')}
      ${!me.seesAll && isNew ? '<p class="hint ga-w" style="margin:0">Queda en borrador hasta que producción la apruebe.</p>' : ''}
    </div>`,
    foot: `<button class="btn" data-close>${edit ? 'Cancelar' : 'Cerrar'}</button>${edit ? `<button class="btn primary" id="goOk">${isNew ? (me.seesAll ? 'Crear orden' : 'Enviar a producción') : 'Guardar'}</button>` : ''}`,
  });
  if (!edit) $$('select', m).forEach(s => { s.disabled = true; });
  const tot = () => { const a = num($('#goA', m).value); $('#goTot', m).textContent = $('#goI', m).checked && a ? '= ' + gsM(a * (1 + tax.rate / 100)) : ''; };
  $('#goA', m).addEventListener('input', tot); $('#goI', m).addEventListener('change', tot); tot();
  gsPhotoBind(m, 'ga~oc~' + x.id);
  const ok = $('#goOk', m);
  if (ok) ok.onclick = async () => {
    const vendor = $('#goV', m).value.trim(), amount = num($('#goA', m).value);
    if (!vendor) { toast('Escribe el proveedor.'); $('#goV', m).focus(); return; }
    if (!(amount > 0)) { toast('Escribe el monto.'); $('#goA', m).focus(); return; }
    const y = { ...x, vendor, ruc: $('#goR', m).value.trim(), ...gsLinePick($('#goL', m).value), desc: $('#goD', m).value.trim(), amount: Math.round(amount * 100) / 100, igv: $('#goI', m).checked, date: $('#goT', m).value || gsToday(), pay: $('#goP', m).value, note: $('#goN', m).value.trim() };
    // la foto primero: si no se pudo subir, la orden no se guarda (se puede volver a intentar)
    ok.disabled = true;
    const sent = await gsPhotoSave('ga~oc~' + x.id);
    ok.disabled = false;
    if (!sent) return;
    if (gsPhotoHas('ga~oc~' + x.id)) y.ph = 1; else delete y.ph;
    if (isNew) { if (!me.seesAll) { y.uid = SHARE.me.id; y.name = SHARE.me.name; } gsData().ocs.push(y); }
    else Object.assign(gsData().ocs.find(z => z.id === x.id) || {}, y);
    closeModal(); changed('data'); render();
    toast(isNew ? (me.seesAll ? 'Orden creada: el número se asigna al guardar.' : 'Orden enviada a producción.') : 'Orden guardada.');
  };
}
/* pagar: con la fecha del pago. Anular: con el motivo (lo pagado o revisado no se borra; se anula) */
function gsPayDialog(x, what, cb) {
  const m = modal({
    title: what,
    body: `<label class="fld"><span>Fecha del pago</span><input type="date" id="gpD" value="${ea(gsToday())}"></label>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="gpOk">Marcar pagado</button>`,
  });
  $('#gpOk', m).onclick = () => { const d = $('#gpD', m).value || gsToday(); closeModal(); cb(d); };
}
function gsVoidDialog(title, text, cb) {
  const m = modal({
    title,
    body: `<p style="margin:0">${text}</p><label class="fld"><span>Motivo</span><input type="text" id="gvW" maxlength="300" placeholder="${ea('Por ejemplo: el proveedor no tenía stock')}"></label>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn danger" id="gvOk">Anular</button>`,
  });
  setTimeout(() => $('#gvW', m).focus(), 40);
  $('#gvOk', m).onclick = () => { const w = $('#gvW', m).value.trim(); if (!w) { toast('Escribe el motivo: queda en el registro.'); $('#gvW', m).focus(); return; } closeModal(); cb(w); };
}

/* ---------- la foto de un gasto (recibo, orden o reembolso) ----------
   Se toma con la cámara o se elige, se comprime como las del desglose (lado mayor de 1200 px, unos 250 kB) y se sube
   al guardar, antes que el gasto: si no se pudo subir, el gasto no se guarda. Cuenta en el espacio del plan. Claves:
   ga~<caja>~<recibo>, ga~oc~<orden> y ga~rb~<reembolso>. Lo elegido en el diálogo abierto espera en GS_PH. */
const GS_PH = { k: '', url: '', del: false };
const gsPhImg = (u, has) => u ? `<img src="${ea(u)}" alt="${ea(tr('Foto del comprobante'))}">` : has ? '<span class="ga-ph-wait" aria-hidden="true"></span>' : '<span class="hint">Sin foto.</span>';
function gsPhotoField(k, edit, url, label) {
  GS_PH.k = k; GS_PH.url = url || ''; GS_PH.del = false;
  const has = !!url || frameHas(k);
  return `<div class="fld ga-w"><span>${esc(label || 'Foto del comprobante')}</span><div class="ga-phf">
      <div class="ga-ph-box" id="gsPhBox">${gsPhImg(url || FRAMES[k], has)}</div>
      ${edit ? `<div class="ga-ph-acts"><label class="btn sm">${ICO.camera}<span>${has ? 'Cambiar la foto' : 'Tomar o elegir una foto'}</span><input type="file" class="file-in" id="gsPhIn" accept="image/*"></label>
        <button type="button" class="btn ghost sm" id="gsPhDel" ${has ? '' : 'hidden'}>Quitar la foto</button></div>` : ''}
    </div></div>`;
}
function gsPhotoBind(m, k) {
  const box = $('#gsPhBox', m), inp = $('#gsPhIn', m), del = $('#gsPhDel', m);
  if (!box) return;
  if (!FRAMES[k] && frameHas(k) && !GS_PH.url) framesNeed([k]).then(() => { if (box.isConnected && GS_PH.k === k && !GS_PH.url && !GS_PH.del) box.innerHTML = gsPhImg(FRAMES[k], true); });
  if (inp) inp.onchange = async () => {
    const f = inp.files && inp.files[0]; inp.value = '';
    const r = f && await gsCompress(f);
    if (!r || GS_PH.k !== k) return;
    GS_PH.url = r.url; GS_PH.del = false; box.innerHTML = gsPhImg(r.url, true); if (del) del.hidden = false;
  };
  if (del) del.onclick = () => { GS_PH.url = ''; GS_PH.del = true; box.innerHTML = gsPhImg('', false); del.hidden = true; };
}
async function gsCompress(f) {
  if (f.type && !/^image\//.test(f.type)) { toast('Elige una foto.'); return null; }
  try { return await compressPhoto(f); } catch (e) { toast('No se pudo leer la foto. Prueba con otra (JPG, PNG o WebP).'); return null; }
}
const gsPhotoHas = k => GS_PH.k === k ? !!GS_PH.url || (!GS_PH.del && frameHas(k)) : frameHas(k);
async function gsPhotoSave(k) {
  if (GS_PH.k !== k) return true;
  try {
    if (GS_PH.url) { await Store.saveFrame(P.id, k, GS_PH.url); FRAMES[k] = GS_PH.url; }
    else if (GS_PH.del && frameHas(k)) { await Store.saveFrame(P.id, k, null); delete FRAMES[k]; }
    return true;
  } catch (e) {
    toast(e && e.message && e.code !== 'offline' ? e.message : 'No se pudo guardar la foto. Inténtalo de nuevo.', 4200);
    return false;
  }
}
// las miniaturas que faltan bajar (se piden una vez; la pestaña se vuelve a pintar al llegar)
function gsThumbs() {
  const keys = $$('#view .ga-th[data-k]').map(e => e.dataset.k).filter(k => !FRAMES[k]);
  if (keys.length && typeof candFramesNeed === 'function') candFramesNeed(keys, 'gastos');
}
const gsThumb = (k, ph) => `<span class="ga-th"${ph ? ` data-k="${ea(k)}"` : ''}>${ph && FRAMES[k] ? `<img src="${ea(FRAMES[k])}" alt="">` : ph ? '<span class="ga-ph-wait"></span>' : '<i aria-hidden="true"></i>'}</span>`;

/* ---------- Caja chica ----------
   Una tarjeta por persona: lo entregado, lo rendido y el saldo en mano, con sus recibos. Producción y la jefatura
   entregan dinero y revisan; producción anula y cierra (lo que sobró se devuelve; lo gastado de más se le reembolsa).
   Cada persona rinde su caja: en el teléfono, «+ Recibo» abre la cámara. */
const KIND_N = { boleta: 'Boleta', factura: 'Factura', rh: 'Recibo por honorarios', sc: 'Sin comprobante' };
const gsCajaOf = id => gsData().cajas.find(c => c.id === id);
const gsMyId = () => (SHARE && SHARE.me && SHARE.me.id) || '';
const gsMine = x => !!gsMyId() && x.uid === gsMyId();
const gsRecAdd = (me, c) => !c.closed && me.receipt && (me.give || gsMine(c));
const gsRecEdit = (me, c, r) => !c.closed && !r.ok && !r.void && me.receipt && (me.give || r.by === gsMyId());
const gsSecOf = x => { const l = x.line && gsLineOf(x.line); return (l && l.sec) || x.sec || 'gen'; };
// la partida en corto, para las filas: el nombre de la línea del presupuesto (o la partida si no tiene línea)
const gsShort = x => { const l = x.line && gsLineOf(x.line); return l ? l.name : gsSecName(gsSecOf(x)); };
// el equipo, para elegir a quién se le entrega dinero o a quién se le reembolsa (sin invitaciones pendientes)
const gsPeople = () => (SHARE.members || []).filter(x => x && x.id && !x.pending && !String(x.id).startsWith('inv:'));
const gsN = (n, one, many) => n === 1 ? one : many.replace('{0}', n);

function gsCajaActs(me) {
  return me.give ? `<button class="btn primary" data-act="ga-give" aria-label="${ea('Entregar dinero de caja chica')}">${ICO.plus}<span class="hide-sm">Entregar dinero</span></button>` : '';
}
function gsCajaHTML(me) {
  const g = gsData(), T = gastosTotals(P).caja;
  const sorted = g.cajas.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
  const open = sorted.filter(c => !c.closed), shut = sorted.filter(c => c.closed);
  const kpis = me.seesAll ? `<div class="ga-kpis">
      ${gsCard('Entregado', gsM(T.given), `<span>${esc(gsN(T.people, 'a 1 persona', 'a {0} personas'))}</span>`)}
      ${gsCard('Rendido', gsM(T.rendered), `<span>${esc(gsN(T.n, '1 recibo', '{0} recibos'))}</span>${T.toReview ? ` · <span>${esc(gsN(T.toReview, '1 por revisar', '{0} por revisar'))}</span>` : ''}`)}
      ${gsCard('Saldo en mano', gsM(T.inHand), 'se devuelve o se reembolsa al cerrar', T.inHand < -0.005 ? 'bad' : '')}
      ${gsCard('Sin comprobante', gsM(T.noReceipt), T.rendered ? `<span>${Math.round(T.noReceipt / T.rendered * 100)} % de lo rendido</span>` : '—')}
    </div>` : '';
  const empty = !g.cajas.length ? `<div class="ga-empty card"><h3>${me.seesAll ? 'Todavía no hay caja chica' : 'Todavía no tienes caja chica'}</h3><p class="hint">${me.give ? 'Entrega dinero a alguien del equipo: tendrá su tarjeta para rendir con fotos de sus recibos. Al cerrar, lo que sobró se devuelve o lo gastado de más se le reembolsa.' : 'Cuando producción te entregue dinero, aquí rindes tus gastos con una foto de cada recibo.'}</p>${me.give ? `<button class="btn primary" data-act="ga-give">${ICO.plus}<span>Entregar dinero</span></button>` : ''}</div>` : '';
  return `${kpis}${empty}
    ${open.length ? `<div class="ga-cajas">${open.map(c => gsCajaCard(me, c)).join('')}</div>` : g.cajas.length ? '<p class="hint ga-none">No hay cajas abiertas.</p>' : ''}
    ${shut.length ? `<details class="ga-shut"><summary><span>${esc(gsN(shut.length, '1 caja cerrada', '{0} cajas cerradas'))}</span></summary><div class="ga-cajas">${shut.map(c => gsCajaCard(me, c)).join('')}</div></details>` : ''}
    ${gsRbHTML(me)}`;
}
function gsCajaCard(me, c) {
  const S = gastosCaja(c), last = (c.given || []).slice(-1)[0];
  const recs = c.recibos.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.at || 0) - (a.at || 0));
  const addOk = gsRecAdd(me, c);
  const row = (lab, v, cls) => `<div${cls ? ` class="${cls}"` : ''}><dt>${lab}</dt><dd class="tnum">${esc(v)}</dd></div>`;
  const close = c.closed ? row(c.closed.how === 'reembolsado' ? 'Se le reembolsó' : 'Devolvió', gsM(num(c.closed.amount))) : '';
  const saldo = S.saldo < -0.005 ? row('Producción le debe', gsM(-S.saldo), 'tot bad') : row('Saldo en mano', gsM(S.saldo), 'tot');
  const acts = [];
  if (me.give && !c.closed) acts.push(`<button class="btn ghost sm" data-act="ga-give" data-c="${ea(c.id)}">Entregar más</button>`);
  if (me.close && !c.closed && !c.recibos.length) acts.push(`<button class="btn ghost sm" data-act="ga-cj-del" data-c="${ea(c.id)}">Quitar</button>`);
  if (me.seesAll && typeof gsCajaPdf === 'function') acts.push(`<button class="btn ghost sm" data-act="ga-cj-pdf" data-c="${ea(c.id)}" title="${ea('Sobre de caja chica (PDF)')}">PDF</button>`);
  if (me.close && !c.closed) acts.push(`<button class="btn sm" data-act="ga-cj-close" data-c="${ea(c.id)}">Cerrar caja</button>`);
  return `<article class="ga-cj card${c.closed ? ' shut' : ''}" data-id="${ea(c.id)}">
    <header class="ga-cj-h"><div><h3 data-no-tr>${esc(c.name || '—')}</h3><p class="hint">${c.role ? `<span>${esc(c.role)}</span> · ` : ''}${last ? `<span>${esc((c.given || []).length === 1 ? 'entregado el' : 'última entrega el')}</span> <span>${esc(gsDay(last.date))}</span>` : ''}</p></div>
      ${c.closed ? gsChip(['Cerrada', 'void']) : ''}</header>
    <dl class="ga-cj-s">${row('Entregado', gsM(S.given))}${row(`<span>Rendido</span> <span>${esc(gsN(S.n, '(1 recibo)', '({0} recibos)'))}</span>`, gsM(S.rendered))}${close}${saldo}</dl>
    ${recs.length ? `<ul class="ga-recs">${recs.map(r => gsRecRow(me, c, r)).join('')}</ul>` : `<p class="hint ga-norec">${c.closed ? 'Sin recibos.' : 'Todavía no hay recibos.'}</p>`}
    ${addOk ? `<div class="ga-add"><button class="btn ga-rec-add" data-act="ga-rec-new" data-c="${ea(c.id)}">${ICO.plus}<span>Recibo</span></button>
      <label class="btn primary ga-rec-cam">${ICO.camera}<span>Recibo (abre la cámara)</span><input type="file" class="file-in" accept="image/*" capture="environment" data-bind="ga-cam" data-c="${ea(c.id)}"></label>
      <button class="btn ghost sm ga-rec-nof" data-act="ga-rec-new" data-c="${ea(c.id)}">Recibo sin foto</button></div>` : ''}
    ${acts.length ? `<footer>${acts.join('')}</footer>` : ''}
  </article>`;
}
function gsRecRow(me, c, r) {
  const st = r.void ? ['Anulado', 'void'] : r.ok ? ['Revisado', 'ok'] : ['Por revisar', 'warn'];
  return `<li class="ga-rec${r.void ? ' void' : ''}">
    <button class="ga-rec-main" data-act="ga-rec-open" data-c="${ea(c.id)}" data-id="${ea(r.id)}" aria-label="${ea(`Abrir el recibo de ${r.shop || 'sin comercio'}`)}">
      ${gsThumb(`ga~${c.id}~${r.id}`, r.ph)}
      <span class="ga-rec-t"><span><b data-no-tr>${esc(r.shop || '—')}</b>${r.desc ? ` · <span data-no-tr>${esc(r.desc)}</span>` : ''}</span>
        <small><span${r.line && gsLineOf(r.line) ? ' data-no-tr' : ''}>${esc(gsShort(r))}</span> · <span>${esc(KIND_N[r.kind] || '')}</span>${r.date ? ` · <span>${esc(gsDay(r.date))}</span>` : ''} ${gsChip(st)}</small></span>
      <span class="ga-rec-m tnum">${esc(gsM(r.amount))}</span>
    </button>
    ${me.review && !r.ok && !r.void && !c.closed ? `<button class="btn sm icon ga-rev" data-act="ga-rec-ok" data-c="${ea(c.id)}" data-id="${ea(r.id)}" title="${ea('Marcar revisado')}" aria-label="${ea('Marcar revisado')}">${ICO.check}</button>` : ''}
  </li>`;
}
/* entregar dinero: a alguien del equipo (o a otra persona, por su nombre). Si ya tiene una caja abierta, se suma ahí */
function gsGiveDialog(c) {
  const ppl = gsPeople();
  const m = modal({
    title: c ? `Entregar más a ${c.name}` : 'Entregar dinero',
    body: `<div class="ga-form">
      ${c ? '' : `<label class="fld ga-w"><span>A quién</span><select id="ggW">${ppl.map(x => `<option value="${ea(x.id)}">${esc((x.name || x.email) + (x.role ? ' · ' + x.role : ''))}</option>`).join('')}<option value="">Otra persona…</option></select></label>
      <label class="fld ga-w" id="ggNf" hidden><span>Nombre</span><input type="text" id="ggN" maxlength="80" autocomplete="off"></label>`}
      <label class="fld"><span>Monto (${esc(gsCur())})</span><input type="number" id="ggA" min="0" step="0.01" inputmode="decimal"></label>
      <label class="fld"><span>Fecha</span><input type="date" id="ggD" value="${ea(gsToday())}"></label>
    </div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="ggOk">Entregar</button>`,
  });
  const w = $('#ggW', m), nf = $('#ggNf', m);
  if (w) { const f = () => { nf.hidden = !!w.value; }; w.onchange = f; f(); }
  setTimeout(() => ($('#ggA', m) || {}).focus && $('#ggA', m).focus(), 40);
  $('#ggOk', m).onclick = () => {
    const amount = Math.round(num($('#ggA', m).value) * 100) / 100, date = $('#ggD', m).value || gsToday();
    if (!(amount > 0)) { toast('Escribe el monto.'); $('#ggA', m).focus(); return; }
    let box = c;
    if (!box) {
      const p = w.value ? ppl.find(x => x.id === w.value) : null, name = p ? (p.name || p.email || '') : $('#ggN', m).value.trim();
      if (!name) { toast('Escribe el nombre.'); $('#ggN', m).focus(); return; }
      box = gsData().cajas.find(x => !x.closed && (p ? x.uid === p.id : !x.uid && x.name.toLowerCase() === name.toLowerCase()));
      if (!box) { box = { id: uid('cj'), uid: p ? p.id : '', name, role: (p && p.role) || '', given: [], recibos: [] }; gsData().cajas.push(box); }
    }
    box.given.push({ id: uid('g'), amount, date });
    closeModal(); changed('data'); render();
    toast(`Entregaste ${gsM(amount)} a ${box.name}.`);
  };
}
/* un recibo: foto, fecha, comercio, qué se compró, partida, monto y tipo de comprobante */
function gsRecDialog(c, r, photo) {
  const me = gsMe(), isNew = !r;
  const prev = c.recibos.slice(-1)[0];
  const x = r || { id: uid('rc'), date: gsToday(), shop: '', desc: '', line: prev ? prev.line : '', sec: prev ? prev.sec : (gaAreaSecs(gaWhoOf(SHARE))[0] || ''), amount: '', kind: 'boleta' };
  const edit = isNew ? gsRecAdd(me, c) : gsRecEdit(me, c, x);
  const dis = edit ? '' : 'disabled', k = `ga~${c.id}~${x.id}`;
  const st = x.void ? ['Anulado', 'void'] : x.ok ? ['Revisado', 'ok'] : ['Por revisar', 'warn'];
  const stamp = x.void ? `<span>Anulado por</span> <span data-no-tr>${esc(x.void.name || '')}: ${esc(x.void.why || '')}</span>` : x.ok ? `<span>Revisado por</span> <span data-no-tr>${esc(x.ok.name || '')}</span>` : '';
  const m = modal({
    title: isNew ? `Recibo · ${c.name}` : `${x.shop || 'Recibo'} · ${st[0]}`,
    body: `<div class="ga-form">
      ${gsPhotoField(k, edit, photo)}
      <label class="fld"><span>Monto (${esc(gsCur())})</span><input type="number" id="grA" min="0" step="0.01" inputmode="decimal" value="${ea(x.amount)}" ${dis}></label>
      <label class="fld"><span>Fecha</span><input type="date" id="grT" value="${ea(x.date)}" ${dis}></label>
      <label class="fld"><span>Comercio</span><input type="text" id="grS" value="${esc(x.shop)}" maxlength="120" autocomplete="off" ${dis}></label>
      <label class="fld"><span>Comprobante</span><select id="grK" ${dis}>${Object.entries(KIND_N).map(([kk, n]) => `<option value="${kk}" ${x.kind === kk ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
      <label class="fld ga-w"><span>Qué se compró</span><input type="text" id="grD" value="${esc(x.desc)}" maxlength="300" ${dis}></label>
      <label class="fld ga-w"><span>Partida</span>${gsLineSelect(x, null, 'grL')}</label>
      ${stamp ? `<p class="hint ga-w" style="margin:0">${stamp}</p>` : ''}
    </div>`,
    foot: `${!isNew && edit ? '<button class="btn ghost danger" id="grDel">Quitar</button>' : ''}${!isNew && me.void && !x.void && !c.closed ? '<button class="btn ghost danger" id="grVoid">Anular</button>' : ''}<span class="grow"></span>
      <button class="btn" data-close>${edit ? 'Cancelar' : 'Cerrar'}</button>${!isNew && me.review && !x.ok && !x.void && !c.closed ? '<button class="btn" id="grOkR">Marcar revisado</button>' : ''}${edit ? `<button class="btn primary" id="grOk">${isNew ? 'Guardar recibo' : 'Guardar'}</button>` : ''}`,
  });
  if (!edit) $$('select', m).forEach(s => { s.disabled = true; });
  gsPhotoBind(m, k);
  if (isNew) setTimeout(() => $('#grA', m) && $('#grA', m).focus(), 40);
  const ok = $('#grOk', m);
  if (ok) ok.onclick = async () => {
    const amount = Math.round(num($('#grA', m).value) * 100) / 100;
    if (!(amount > 0)) { toast('Escribe el monto.'); $('#grA', m).focus(); return; }
    const y = { ...x, amount, date: $('#grT', m).value || gsToday(), shop: $('#grS', m).value.trim(), kind: $('#grK', m).value, desc: $('#grD', m).value.trim(), ...gsLinePick($('#grL', m).value) };
    ok.disabled = true;
    const sent = await gsPhotoSave(k);
    ok.disabled = false;
    if (!sent) return;
    if (gsPhotoHas(k)) y.ph = 1; else delete y.ph;
    const box = gsCajaOf(c.id); if (!box) return;
    if (isNew) box.recibos.push({ ...y, by: gsMyId() }); else Object.assign(box.recibos.find(z => z.id === x.id) || {}, y);
    closeModal(); changed('data'); render();
    toast(isNew ? 'Recibo guardado: producción lo revisa.' : 'Recibo guardado.');
  };
  const del = $('#grDel', m);
  if (del) del.onclick = () => confirmBox('Quitar el recibo', 'Se quita el recibo y su foto.', 'Quitar', () => {
    const box = gsCajaOf(c.id); if (!box) return;
    box.recibos = box.recibos.filter(z => z.id !== x.id);
    if (frameHas(k)) { delete FRAMES[k]; Store.saveFrame(P.id, k, null).catch(() => { }); }
    changed('data'); render();
  });
  const vo = $('#grVoid', m);
  if (vo) vo.onclick = () => gsVoidDialog('Anular el recibo', 'El recibo queda en el registro como anulado y deja de contar en lo rendido.', w => {
    const z = (gsCajaOf(c.id) || { recibos: [] }).recibos.find(q => q.id === x.id); if (!z) return;
    z.void = { why: w }; changed('data'); render();
  });
  const rv = $('#grOkR', m);
  if (rv) rv.onclick = () => { closeModal(); gsRecReview(c.id, x.id); };
}
function gsRecReview(cid, id) {
  const z = ((gsCajaOf(cid) || {}).recibos || []).find(q => q.id === id); if (!z || z.ok) return;
  z.ok = { name: (SHARE.me && SHARE.me.name) || '' }; changed('data'); render(); toast('Recibo revisado.');
}
/* cerrar: con todo revisado. Lo que sobró se devuelve; lo que se gastó de más se le reembolsa. Después no cambia */
function gsCloseDialog(c) {
  const S = gastosCaja(c), diff = Math.round((S.given - S.rendered) * 100) / 100;
  if (S.toReview) { toast(gsN(S.toReview, 'Falta revisar 1 recibo: revísalo o anúlalo antes de cerrar.', 'Faltan revisar {0} recibos: revísalos o anúlalos antes de cerrar.'), 4200); return; }
  const text = diff >= 0 ? `${c.name} devuelve ${gsM(diff)}.` : `Producción le reembolsa ${gsM(-diff)} a ${c.name}.`;
  confirmBox(`Cerrar la caja de ${c.name}`, `<span>${esc(text)}</span> <span>La caja queda cerrada: ya no se agregan recibos.</span>`, 'Cerrar caja', () => {
    const z = gsCajaOf(c.id); if (!z) return;
    z.closed = { how: diff >= 0 ? 'devuelto' : 'reembolsado', amount: Math.abs(diff) };
    changed('data'); render(); toast('Caja cerrada.');
  }, false);
}

/* ---------- Reembolsos ----------
   Lo que alguien pagó de su bolsillo (o su kilometraje). Un jefe de área lo pide y producción lo aprueba y lo paga; los
   que registra producción nacen aprobados. */
function gsRbHTML(me) {
  const list = gsData().reemb.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.at || 0) - (a.at || 0));
  if (!list.length && !me.rbNew) return '';
  const acts = r => {
    const out = [];
    if (r.state === 'pend' && me.ocApprove) out.push(`<button class="btn sm" data-act="ga-rb-ok" data-id="${ea(r.id)}">Aprobar</button>`);
    if (r.state === 'ok' && me.ocPay) out.push(`<button class="btn sm" data-act="ga-rb-pay" data-id="${ea(r.id)}">Marcar pagado</button>`);
    if (r.state !== 'void' && me.void) out.push(`<button class="btn ghost sm danger" data-act="ga-rb-void" data-id="${ea(r.id)}">Anular</button>`);
    return out.join('');
  };
  const nm = n => `<span data-no-tr>${esc(n || '')}</span>`;
  const who = r => r.state === 'void' && r.void ? `<span>Anulado por</span> ${nm(r.void.name)}: ${nm(r.void.why)}` : r.state === 'paid' && r.paid ? `<span>Pagado el</span> <span>${esc(gsDay(r.paid.date))}</span>` : r.state === 'ok' && r.ok ? `<span>Aprobado por</span> ${nm(r.ok.name)}` : '';
  return `<section class="ga-rbs">
    <div class="ga-sec-h"><h3>Reembolsos</h3><span class="grow"></span>${me.rbNew ? `<button class="btn sm" data-act="ga-rb-new">${ICO.plus}<span>${me.seesAll ? 'Reembolso' : 'Pedir un reembolso'}</span></button>` : ''}</div>
    ${list.length ? `<ul class="ga-recs ga-rbl card">${list.map(r => `<li class="ga-rec${r.state === 'void' ? ' void' : ''}">
      <button class="ga-rec-main" data-act="ga-rb-open" data-id="${ea(r.id)}" aria-label="${ea(`Abrir el reembolso de ${r.name || 'sin nombre'}`)}">
        ${gsThumb('ga~rb~' + r.id, r.ph)}
        <span class="ga-rec-t"><span><b data-no-tr>${esc(r.name || '—')}</b>${r.desc ? ` · <span data-no-tr>${esc(r.desc)}</span>` : ''}</span>
          <small><span${r.line && gsLineOf(r.line) ? ' data-no-tr' : ''}>${esc(gsShort(r))}</span>${r.km ? ` · <span class="tnum" data-no-tr>${esc(String(r.km))} km × ${esc(gsM(r.kmRate))}</span>` : ''}${r.date ? ` · <span>${esc(gsDay(r.date))}</span>` : ''} ${gsChip(RB_ST[r.state])}</small></span>
        <span class="ga-rec-m tnum">${esc(gsM(r.amount))}</span>
      </button>
      ${who(r) || acts(r) ? `<footer><span class="hint ga-who">${who(r)}</span><span class="grow"></span>${acts(r)}</footer>` : ''}
    </li>`).join('')}</ul>`
      : `<p class="hint ga-none">${me.seesAll ? 'Lo que alguien del equipo pagó de su bolsillo, o su kilometraje: producción lo aprueba y lo paga.' : 'Si pagaste algo de tu bolsillo para tu área (o usaste tu auto), pide aquí que te lo devuelvan.'}</p>`}
  </section>`;
}
const gsRb = id => gsData().reemb.find(r => r.id === id);
function gsRbDialog(r) {
  const me = gsMe(), isNew = !r, ppl = gsPeople();
  const lastRate = (gsData().reemb.filter(z => z.kmRate).slice(-1)[0] || {}).kmRate || '';
  const x = r || { id: uid('rb'), uid: me.seesAll ? '' : gsMyId(), name: me.seesAll ? '' : (SHARE.me && SHARE.me.name) || '', desc: '', line: '', sec: gaAreaSecs(gaWhoOf(SHARE))[0] || '', amount: '', km: 0, kmRate: lastRate, date: gsToday(), state: me.seesAll ? 'ok' : 'pend' };
  const edit = isNew || (x.state === 'pend' && (me.ocApprove || gsMine(x))) || (x.state === 'ok' && me.ocApprove);
  const dis = edit ? '' : 'disabled', k = 'ga~rb~' + x.id, km = num(x.km) > 0;
  const pick = me.seesAll && edit && x.state !== 'paid';
  const m = modal({
    title: isNew ? (me.seesAll ? 'Reembolso' : 'Pedir un reembolso') : `${x.name || 'Reembolso'} · ${RB_ST[x.state][0]}`,
    body: `<div class="ga-form">
      ${pick ? `<label class="fld ga-w"><span>A quién</span><select id="gbW">${ppl.map(p => `<option value="${ea(p.id)}" ${x.uid === p.id ? 'selected' : ''}>${esc((p.name || p.email) + (p.role ? ' · ' + p.role : ''))}</option>`).join('')}<option value="" ${x.uid ? '' : 'selected'}>Otra persona…</option></select></label>
        <label class="fld ga-w" id="gbNf"><span>Nombre</span><input type="text" id="gbN" value="${esc(x.uid ? '' : x.name)}" maxlength="80" autocomplete="off"></label>` : `<p class="ga-w" style="margin:0"><b data-no-tr>${esc(x.name)}</b></p>`}
      <div class="seg ga-w ga-kind" role="group" aria-label="${ea('Tipo de reembolso')}"><button type="button" data-k="gasto" aria-pressed="${ea(!km)}" ${dis}>Un gasto</button><button type="button" data-k="km" aria-pressed="${ea(km)}" ${dis}>Kilometraje</button></div>
      <label class="fld ga-w"><span>Qué se pagó</span><input type="text" id="gbD" value="${esc(x.desc)}" maxlength="300" ${dis}></label>
      <label class="fld ga-w"><span>Partida</span>${gsLineSelect(x, null, 'gbL')}</label>
      <label class="fld gb-g"><span>Monto (${esc(gsCur())})</span><input type="number" id="gbA" min="0" step="0.01" inputmode="decimal" value="${ea(km ? '' : x.amount)}" ${dis}></label>
      <label class="fld gb-k"><span>Kilómetros</span><input type="number" id="gbK" min="0" step="0.1" inputmode="decimal" value="${ea(km ? x.km : '')}" ${dis}></label>
      <label class="fld gb-k"><span>Tarifa por km (${esc(gsCur())})</span><input type="number" id="gbR" min="0" step="0.01" inputmode="decimal" value="${ea(x.kmRate)}" ${dis}></label>
      <p class="hint gb-k ga-w" id="gbT" style="margin:0"></p>
      <label class="fld"><span>Fecha</span><input type="date" id="gbF" value="${ea(x.date)}" ${dis}></label>
      ${gsPhotoField(k, edit)}
      ${!me.seesAll && isNew ? '<p class="hint ga-w" style="margin:0">Producción lo revisa, lo aprueba y te lo paga.</p>' : ''}
    </div>`,
    foot: `<button class="btn" data-close>${edit ? 'Cancelar' : 'Cerrar'}</button>${edit ? `<button class="btn primary" id="gbOk">${isNew ? (me.seesAll ? 'Guardar' : 'Pedir') : 'Guardar'}</button>` : ''}`,
  });
  if (!edit) $$('select', m).forEach(s => { s.disabled = true; });
  let mode = km ? 'km' : 'gasto';
  const tot = () => num($('#gbK', m).value) * num($('#gbR', m).value);
  const paint = () => {
    $$('.ga-kind button', m).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === mode)));
    $$('.gb-k', m).forEach(e => { e.hidden = mode !== 'km'; }); $$('.gb-g', m).forEach(e => { e.hidden = mode === 'km'; });
    $('#gbT', m).textContent = mode === 'km' && tot() ? '= ' + gsM(Math.round(tot() * 100) / 100) : '';
  };
  $$('.ga-kind button', m).forEach(b => { b.onclick = () => { mode = b.dataset.k; paint(); }; });
  $('#gbK', m).addEventListener('input', paint); $('#gbR', m).addEventListener('input', paint);
  const w = $('#gbW', m); if (w) { const f = () => { $('#gbNf', m).hidden = !!w.value; }; w.onchange = f; f(); }
  paint(); gsPhotoBind(m, k);
  const ok = $('#gbOk', m);
  if (ok) ok.onclick = async () => {
    const kmv = mode === 'km' ? Math.round(num($('#gbK', m).value) * 10) / 10 : 0, rate = mode === 'km' ? Math.round(num($('#gbR', m).value) * 100) / 100 : 0;
    const amount = Math.round((mode === 'km' ? kmv * rate : num($('#gbA', m).value)) * 100) / 100;
    if (!(amount > 0)) { toast(mode === 'km' ? 'Escribe los kilómetros y la tarifa.' : 'Escribe el monto.'); ($(mode === 'km' ? '#gbK' : '#gbA', m)).focus(); return; }
    let who = { uid: x.uid, name: x.name };
    if (pick) { const p = w.value ? ppl.find(z => z.id === w.value) : null; who = p ? { uid: p.id, name: p.name || p.email || '' } : { uid: '', name: $('#gbN', m).value.trim() }; }
    if (!who.name) { toast('Escribe el nombre.'); $('#gbN', m) && $('#gbN', m).focus(); return; }
    const y = { ...x, ...who, desc: $('#gbD', m).value.trim(), ...gsLinePick($('#gbL', m).value), amount, km: kmv, kmRate: rate, date: $('#gbF', m).value || gsToday() };
    ok.disabled = true;
    const sent = await gsPhotoSave(k);
    ok.disabled = false;
    if (!sent) return;
    if (gsPhotoHas(k)) y.ph = 1; else delete y.ph;
    if (isNew) gsData().reemb.push(y); else Object.assign(gsRb(x.id) || {}, y);
    closeModal(); changed('data'); render();
    toast(isNew ? (me.seesAll ? 'Reembolso guardado.' : 'Reembolso enviado a producción.') : 'Reembolso guardado.');
  };
}

/* ---------- Pagos ----------
   Todo lo que salió de producción, por fecha: órdenes pagadas (con su impuesto), reembolsos pagados y la caja chica
   (entregas, y al cerrar, lo devuelto o lo reembolsado). Se filtra por partida, por persona o proveedor y por semana. */
const PAY_K = { oc: 'Orden de compra', rb: 'Reembolso', give: 'Caja chica: entrega', back: 'Caja chica: devolución', settle: 'Caja chica: reembolso' };
const gsWeek = d => { if (!d) return ''; const t = new Date(d + 'T12:00:00'); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return isoDay(t); };
// las filas que se ven, con los filtros puestos (la misma lista va al Excel)
function gsPayRows() {
  const all = gastosPagos(P, gsTax().rate);
  const ok = x => (!GS.sec || x.sec === GS.sec) && (!GS.who || x.who === GS.who) && (!GS.week || gsWeek(x.date) === GS.week);
  return { all, rows: all.filter(ok) };
}
function gsPayHTML(me) {
  const { all, rows } = gsPayRows();
  if (!all.length) return `<div class="ga-empty card"><h3>Todavía no hay pagos</h3><p class="hint">Aquí se juntan las órdenes de compra pagadas, los reembolsos pagados y el dinero de caja chica, por fecha. Se exporta a Excel para el contador.</p></div>`;
  const fx = gsFx();
  const sum = f => Math.round(rows.filter(f).reduce((a, x) => a + x.amount, 0) * 100) / 100;
  const total = sum(() => true);
  const secs = BUD_SECTIONS.filter(s => all.some(x => x.sec === s.id)), whos = [...new Set(all.map(x => x.who).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')), weeks = [...new Set(all.map(x => gsWeek(x.date)).filter(Boolean))].sort().reverse();
  const sel = (f, lab, opts) => `<label class="ga-pf"><span>${esc(lab)}</span><select data-bind="ga-pf" data-f="${f}"><option value="">Todas</option>${opts.map(([v, n, raw]) => `<option value="${ea(v)}" ${GS[f] === v ? 'selected' : ''}${raw ? ' data-no-tr' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
  return `<div class="ga-kpis">
      ${gsCard('Órdenes de compra', gsM(sum(x => x.kind === 'oc')), 'con su impuesto')}
      ${gsCard('Reembolsos', gsM(sum(x => x.kind === 'rb')), 'pagados')}
      ${gsCard('Caja chica', gsM(sum(x => x.kind === 'give' || x.kind === 'back' || x.kind === 'settle')), 'entregado, menos lo devuelto')}
      ${gsCard('Total pagado', gsM(total), fx ? `US$ ${esc(moneyNum(total / fx))}` : `<span>${esc(gsN(rows.length, '1 pago', '{0} pagos'))}</span>`)}
    </div>
    <div class="ga-pfs">${sel('sec', 'Partida', secs.map(s => [s.id, s.name]))}${sel('who', 'Persona o proveedor', whos.map(w => [w, w, 1]))}${sel('week', 'Semana', weeks.map(w => [w, `Semana del ${gsDay(w)}`]))}
      ${GS.sec || GS.who || GS.week ? '<button class="btn ghost sm" data-act="ga-pf-clear">Quitar filtros</button>' : ''}</div>
    ${rows.length ? `<div class="ga-tbl-wrap"><table class="tbl ga-sum ga-pay"><thead><tr><th>Fecha</th><th>Tipo</th><th>A quién</th><th>Concepto</th><th>Partida</th><th>Forma de pago</th><th class="num">Monto</th>${fx ? '<th class="num">US$</th>' : ''}</tr></thead><tbody>
      ${rows.map(x => `<tr class="${x.amount < 0 ? 'neg' : ''}"><td class="tnum">${esc(gsDay(x.date))}</td><td><span>${esc(PAY_K[x.kind])}</span>${x.ref ? ` <span class="code" data-no-tr>${esc(x.ref)}</span>` : ''}</td>
        <td data-no-tr><b>${esc(x.who || '—')}</b></td><td data-no-tr>${esc(x.desc || '')}</td><td data-l="${ea(tr('Partida'))}">${x.sec && x.kind !== 'give' && x.kind !== 'back' && x.kind !== 'settle' ? esc(gsSecName(x.sec)) : '<span class="hint">—</span>'}</td>
        <td data-l="${ea(tr('Forma de pago'))}">${x.pay ? esc(PAY_N[x.pay] || '') : '<span class="hint">—</span>'}</td>
        <td class="num tnum" data-l="${ea(tr('Monto'))}">${x.amount < 0 ? '− ' + esc(gsM(-x.amount)) : esc(gsM(x.amount))}${x.tax ? `<small class="hint">${esc(gsTax().name)} ${esc(gsM(x.tax))}</small>` : ''}</td>${fx ? `<td class="num tnum" data-l="US$">${esc(moneyNum(x.amount / fx))}</td>` : ''}</tr>`).join('')}
      </tbody><tfoot><tr><td colspan="6"><b>Total</b> <span class="hint">${esc(gsN(rows.length, '1 pago', '{0} pagos'))}</span></td><td class="num tnum"><b>${esc(gsM(total))}</b></td>${fx ? `<td class="num tnum"><b>${esc(moneyNum(total / fx))}</b></td>` : ''}</tr></tfoot></table></div>`
      : '<p class="hint ga-none">No hay pagos con estos filtros.</p>'}`;
}

/* ---------- documentos ----------
   La orden de compra (para el proveedor), el sobre de caja chica, los pagos en Excel (para el contador) y el reporte de
   sobrecostos. Con las piezas de pdf.js y xlsx.js (newDoc, docHeader, pageNumbers, TBL, xlsxBook); se arman aquí para
   no tocar el registro de los PDF de las otras pestañas. Las cifras salen de las mismas cuentas que la pantalla
   (core.js: gastosOc, gastosCaja, gastosPagos, gastosResumen). */
async function gsPdf(make, btn) {
  if (!(await loadPdfLib())) { problem('No se pudo cargar el generador de PDF. Revisa tu conexión.', () => gsPdf(make, btn)); return; }
  await imgPrepPdf([P.meta.logo, P.meta.projLogo]);   // los logos en WebP van como PNG (imagenes.js)
  const lab = btn && btn.innerHTML, wordy = !!(btn && btn.textContent.trim());
  const busy = on => { if (!btn) return; btn.disabled = on; if (wordy) btn.innerHTML = on ? 'Generando…' : lab; };
  busy(true);
  FR_HOLD++;
  try {
    // (lote AH) como todos los PDF, pasa por la vista previa (pdf-vista.js): el papel (A4 o carta), Imprimir y Descargar
    const build = async paper => { PDF_PAPER = paper || null; PDF_KIND = 'gastos'; try { pdfTheme(); return await make(); } finally { PDF_PAPER = null; PDF_KIND = ''; } };   // (versión 2) la etapa en la cabecera
    const first = await build(pdfPaperMem('gastos'));
    busy(false);
    await pdfPreview({ kind: 'gastos', first, make: build });
  } catch (e) { console.error(e); problem('No se pudo generar el PDF. Vuelve a intentarlo; si se repite, escribe a soporte desde Ayuda.', () => gsPdf(make, btn)); }
  finally { FR_HOLD--; busy(false); }
}
const gsPm = v => pdfSafe(gsCur()) + ' ' + moneyNum(v);
const gsPd = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
// un bloque de datos en dos columnas (rótulo en gris, valor en tinta). (lote AH) En rejilla, como un formulario
// (antes, sin líneas)
function gsPdfFacts(doc, y, rows) {
  // (lote K) lo que falta queda en blanco (antes «-»); el aire de los demás documentos
  doc.autoTable({ ...TBL, startY: y, theme: 'plain', body: rows.map(r => r.flatMap(([k, v]) => [{ content: pdfSafe(k), styles: { textColor: MUTED, fontSize: PF.small, fillColor: PDF_LABF } }, { content: pdfSafe(v || ''), styles: { fontStyle: 'bold' } }])),
    columnStyles: { 0: { cellWidth: 78 }, 1: { cellWidth: 192 }, 2: { cellWidth: 78 } }, styles: { ...TBL.styles, valign: 'middle', cellPadding: { top: 4.5, bottom: 4.5, left: 6, right: 6 } } });
  return doc.lastAutoTable.finalY;
}
// las firmas al pie: una raya por persona, con su rótulo debajo
function gsPdfSign(doc, y, labels) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), w = (W - 72 - 40 * (labels.length - 1)) / labels.length;
  if (y + 70 > H - 50) { doc.addPage(); y = 60; }
  y = Math.max(y + 56, H - 120);
  doc.setDrawColor(...MUTED); doc.setLineWidth(.6); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
  labels.forEach((l, i) => { const x = 36 + i * (w + 40); doc.line(x, y, x + w, y); doc.text(pdfSafe(l), x, y + 12); });
  doc.setTextColor(...INK);
}
// «ANULADA» de lado a lado, en rojo suave
function gsPdfVoid(doc, txt) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: .14 })); } catch (e) { }
  doc.setFont('title', 'bold'); doc.setFontSize(84); doc.setTextColor(200, 30, 30);
  doc.text(pdfSafe(txt), W / 2, H / 2, { align: 'center', angle: 28 });
  try { doc.restoreGraphicsState(); } catch (e) { }
  doc.setTextColor(...INK);
}

/* la orden de compra: proveedor, RUC, partida, forma de pago, el monto con su impuesto y las firmas */
function gsOcPdf(o, btn) { gsPdf(() => gsOcDoc(o), btn); }
function gsOcDoc(o) {
  const doc = newDoc(), t = gastosOc(o, gsTax().rate), tax = gsTax(), fx = gsFx();
  const title = `Orden de compra ${o.num || ''}`.trim();
  let y = docHeader(doc, title, OC_ST[o.state][0]);
  y = gsPdfFacts(doc, y + 6, [
    [['Proveedor', o.vendor], ['Fecha', gsPd(o.date)]],
    [['RUC', o.ruc], ['Forma de pago', PAY_N[o.pay] || '']],
    [['Partida', gsPartidaTr(o)], ['Pedida por', o.name || (o.ok && o.ok.name) || '']],
    ...(o.ok && o.ok.name ? [[['Aprobada por', o.ok.name], ['Estado', o.state === 'paid' && o.paid ? `${tr(OC_ST.paid[0])} · ${gsPd(o.paid.date)}` : OC_ST[o.state][0]]]] : []),
  ]);
  const R = { halign: 'right' };
  doc.autoTable({ ...TBL, startY: y + 12, head: [['Cant.', 'Descripción', { content: 'Monto', styles: R }]], body: [['1', pdfSafe(o.desc || ''), { content: gsPm(t.net), styles: R }]],
    columnStyles: { 0: { cellWidth: 40 }, 2: { cellWidth: 110 } } });
  const sumRow = (lab, v, bold) => { const st = bold ? { font: 'title', fontStyle: 'bold', fontSize: 13, textColor: INK } : {}; return [{ content: pdfSafe(lab), styles: st }, { content: gsPm(v), styles: { ...R, ...st } }, ...(fx ? [{ content: 'US$ ' + moneyNum(v / fx), styles: { ...R, ...st, textColor: bold ? INK : MUTED } }] : [])]; };
  const W = doc.internal.pageSize.getWidth(), tw = fx ? 330 : 240;
  doc.autoTable({ ...TBL, startY: doc.lastAutoTable.finalY + 8, theme: 'plain', margin: { ...TBL.margin, left: W - 36 - tw }, tableWidth: tw,
    body: [sumRow('Subtotal', t.net), ...(o.igv ? [sumRow(`${tax.name} (${tax.rate} %)`, t.tax)] : []), sumRow('Total', t.total, true)] });
  y = doc.lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
  if (!o.igv) { doc.text(pdfSafe(`El monto no incluye ${tax.name}.`), 36, y); y += 12; }
  if (fx) { doc.text(pdfSafe(`Tipo de cambio: ${gsCur()} ${fx} por US$`), 36, y); y += 12; }
  doc.setTextColor(...INK);
  if (o.note) { doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text('Condiciones', 36, y + 10); doc.setFont('helvetica', 'normal'); const tl = doc.splitTextToSize(pdfSafe(o.note), W - 72); doc.text(tl, 36, y + 23); y += 23 + tl.length * 11; }
  if (o.state === 'void') { gsPdfVoid(doc, 'ANULADA'); if (o.void) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(200, 30, 30); doc.text(pdfSafe(`Anulada por ${o.void.name || ''}: ${o.void.why || ''}`), 36, y + 14); doc.setTextColor(...INK); y += 14; } }
  gsPdfSign(doc, y, ['Producción · autoriza', 'Proveedor · recibí conforme']);
  pageNumbers(doc, title);
  return { doc, name: `${fileSafe(P.meta.title)}_orden_de_compra_${fileSafe(o.num || 'nueva')}.pdf` };
}

/* el sobre de caja chica: lo entregado, los recibos (con sus fotos al final), las sumas por partida y las firmas */
function gsCajaPdf(c, btn) { gsPdf(() => gsCajaDoc(c), btn); }
async function gsCajaDoc(c) {
  const doc = newDoc(), S = gastosCaja(c), R = { halign: 'right' };
  const recs = c.recibos.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.at || 0) - (b.at || 0));
  let y = docHeader(doc, 'Sobre de caja chica', [c.name, c.role && tr(c.role), c.closed && tr('Cerrada')].filter(Boolean).join(' · '));
  const st = r => r.void ? 'Anulado' : r.ok ? 'Revisado' : 'Por revisar';
  const sum = [['Entregado', S.given], [`Rendido (${S.n === 1 ? '1 recibo' : S.n + ' recibos'})`, S.rendered]];
  if (c.closed) sum.push([c.closed.how === 'reembolsado' ? 'Se le reembolsó' : 'Devolvió', num(c.closed.amount)]);
  sum.push([S.saldo < -0.005 ? 'Producción le debe' : 'Saldo en mano', Math.abs(S.saldo)]);
  doc.autoTable({ ...TBL, startY: y + 4, theme: 'plain', tableWidth: 280, body: sum.map(([k, v], i) => { const b = i === sum.length - 1 ? { font: 'title', fontStyle: 'bold', fontSize: 13, textColor: INK } : {}; return [{ content: pdfSafe(k), styles: b }, { content: gsPm(v), styles: { ...R, ...b } }]; }) });
  // las entregas
  doc.autoTable({ ...TBL, startY: doc.lastAutoTable.finalY + 12, head: [['Entregas', 'Entregó', { content: 'Monto', styles: R }]],
    body: (c.given || []).map(g => [gsPd(g.date), pdfSafe(g.name || ''), { content: gsPm(g.amount), styles: R }]), columnStyles: { 0: { cellWidth: 110 }, 2: { cellWidth: 100 } } });
  // los recibos
  doc.autoTable({ ...TBL, startY: doc.lastAutoTable.finalY + 12, head: [['N°', 'Fecha', 'Comercio', 'Qué se compró', 'Partida', 'Comprobante', 'Estado', { content: 'Monto', styles: R }]],
    body: recs.length ? recs.map((r, i) => [String(i + 1), gsPd(r.date), pdfSafe(r.shop || ''), pdfSafe(r.desc || ''), pdfSafe(gsShort(r)), pdfSafe(KIND_N[r.kind] || ''), st(r), { content: (r.void ? '(' : '') + gsPm(r.amount) + (r.void ? ')' : ''), styles: R }])
      : [[{ content: 'Sin recibos.', colSpan: 8, styles: { textColor: MUTED } }]],
    foot: [[{ content: 'Total rendido', colSpan: 7 }, { content: gsPm(S.rendered), styles: R }]], footStyles: { fillColor: V2K.bg, textColor: INK, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 62 }, 5: { cellWidth: 70 }, 6: { cellWidth: 56 }, 7: { cellWidth: 64 } },
    didParseCell: d => { if (d.section === 'body' && recs[d.row.index] && recs[d.row.index].void) d.cell.styles.textColor = MUTED; } });
  // por partida (lo que va a cada cuenta del presupuesto)
  const by = new Map();
  for (const r of recs) if (!r.void) { const s = gsSecOf(r); by.set(s, (by.get(s) || 0) + num(r.amount)); }
  if (by.size) doc.autoTable({ ...TBL, startY: doc.lastAutoTable.finalY + 12, tableWidth: 300, head: [['Por partida', { content: 'Monto', styles: R }]],
    body: BUD_SECTIONS.filter(s => by.has(s.id)).map(s => [`${s.code}  ${pdfSafe(s.name)}`, { content: gsPm(by.get(s.id)), styles: R }]) });
  gsPdfSign(doc, doc.lastAutoTable.finalY, ['Entregó · producción', `Rindió · ${c.name}`]);
  await gsPdfPhotos(doc, recs.map((r, i) => r.ph ? { k: `ga~${c.id}~${r.id}`, cap: [`#${i + 1}`, r.shop, gsPm(r.amount)].filter(Boolean).join(' · ') + `${r.void ? ' · ' + tr('Anulado') : ''}` } : null).filter(Boolean));
  pageNumbers(doc, 'Sobre de caja chica');
  return { doc, name: `${fileSafe(P.meta.title)}_sobre_de_caja_chica_${fileSafe(c.name)}.pdf` };
}
/* las fotos de los comprobantes, cuatro por página (el PDF no acepta WebP: se pasan a JPEG) */
async function gsPdfPhotos(doc, list) {
  if (!list.length) return;
  await ensureFrames('index'); await framesNeed(list.map(x => x.k));
  const jpg = u => new Promise(res => { if (!u) return res(''); if (/^data:image\/jpe?g/i.test(u)) return res(u); const im = new Image(); im.onload = () => { const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0); res(cv.toDataURL('image/jpeg', .88)); }; im.onerror = () => res(''); im.src = u; });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), cw = (W - 72 - 20) / 2, ch = (H - 130 - 40) / 2;
  for (let i = 0; i < list.length; i++) {
    if (i % 4 === 0) { doc.addPage(); pdfSec(doc, 36, 'Comprobantes', { need: 0 }); }   // (lote AH) el título en su cuadro
    const x = 36 + (i % 2) * (cw + 20), y = 66 + Math.floor((i % 4) / 2) * (ch + 20);
    const u = await jpg(FRAMES[list[i].k]);
    doc.setDrawColor(...V2K.line); doc.setLineWidth(.8); doc.roundedRect(x, y, cw, ch - 16, 3, 3, 'S');   // (versión 2) línea fina, esquinas de 3 pt
    if (u) pdfImg(doc, u, x + 4, y + 4, cw - 8, ch - 24); else { doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text('Sin foto', x + cw / 2, y + ch / 2, { align: 'center' }); }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...INK); doc.text(pdfSafe(list[i].cap), x, y + ch - 4);
  }
}

/* los pagos en Excel: lo mismo que la vista Pagos (con sus filtros), por fecha y por partida */
function gsPayXlsx() {
  const { rows } = gsPayRows(), fx = gsFx(), tax = gsTax(), cur = gsCur(), T = xlTab();
  const H = { bold: true, fill: T.bar, color: T.ink, line: T.line }, L = { line: T.line }, N = { line: T.line, h: 'right' };
  const filt = [GS.sec && tr('Partida: ' + tr(gsSecName(GS.sec))), GS.who && tr('Persona o proveedor: ' + GS.who), GS.week && tr(`Semana del ${gsDay(GS.week)}`)].filter(Boolean).join(' · ');
  const r2 = v => Math.round(v * 100) / 100;
  const total = r2(rows.reduce((a, x) => a + x.amount, 0));
  const head = ['Fecha', 'Tipo', 'Referencia', 'A quién', 'Concepto', 'Código', 'Partida', 'Forma de pago', `Monto sin ${tax.name} (${cur})`, `${tax.name} (${cur})`, `Monto (${cur})`, ...(fx ? ['Monto (US$)'] : [])];
  const isCaja = x => x.kind === 'give' || x.kind === 'back' || x.kind === 'settle';
  const sec = x => BUD_SECTIONS.find(s => s.id === x.sec) || null;
  const cols = [12, 22, 11, 26, 34, 8, 26, 16, 16, 12, 14, ...(fx ? [13] : [])], nc = cols.length;
  const sheet1 = { name: 'Pagos', cols, freeze: 4, landscape: true, printRows: '4:4', rows: [
    { cells: [{ v: `${P.meta.title} · Pagos`, cs: nc, s: { bold: true, size: 16, font: 'title', fill: T.bar, color: T.ink, border: false, wrap: false } }], h: 30 },
    { cells: [{ v: [tr(`Moneda: ${cur}`), fx ? tr(`tipo de cambio ${cur} ${fx} por US$`) : '', filt].filter(Boolean).join(' · '), cs: nc, s: { size: 9, color: '#646464', border: false, wrap: false } }], h: 18 },
    { cells: [], h: 6 },
    { cells: head.map((v, i) => ({ v, s: { ...H, h: i >= 8 ? 'right' : 'left' } })), h: 30 },
    ...rows.map(x => ({ cells: [{ v: x.date, s: L }, { v: PAY_K[x.kind], s: L }, { v: x.ref, s: L }, { v: x.who, s: L }, { v: x.desc, s: L },
      { v: isCaja(x) || !sec(x) ? '' : sec(x).code, s: L }, { v: isCaja(x) || !sec(x) ? '' : sec(x).name, s: L }, { v: x.pay ? PAY_N[x.pay] || '' : '', s: L },
      { v: x.net, s: N }, { v: x.tax, s: N }, { v: x.amount, s: { ...N, bold: true } }, ...(fx ? [{ v: r2(x.amount / fx), s: N }] : [])] })),
    { cells: [{ v: `Total · ${rows.length === 1 ? '1 pago' : rows.length + ' pagos'}`, cs: 8, s: { bold: true, fill: T.fill, line: T.line } }, { v: r2(rows.reduce((a, x) => a + x.net, 0)), s: { ...N, bold: true, fill: T.fill } }, { v: r2(rows.reduce((a, x) => a + x.tax, 0)), s: { ...N, bold: true, fill: T.fill } }, { v: total, s: { ...N, bold: true, fill: T.fill } }, ...(fx ? [{ v: r2(total / fx), s: { ...N, bold: true, fill: T.fill } }] : [])] },
  ] };
  // por partida: las órdenes y los reembolsos pagados (la caja chica va por sus recibos, en el resumen de Gastos)
  const by = new Map(); for (const x of rows) if (!isCaja(x)) by.set(x.sec, r2((by.get(x.sec) || 0) + x.amount));
  const sheet2 = { name: 'Por partida', cols: [8, 34, 16], freeze: 1, rows: [
    { cells: [{ v: 'Código', s: H }, { v: 'Partida', s: H }, { v: `Pagado (${cur})`, s: { ...H, h: 'right' } }], h: 22 },
    ...BUD_SECTIONS.filter(s => by.has(s.id)).map(s => ({ cells: [{ v: s.code, s: L }, { v: s.name, s: L }, { v: by.get(s.id), s: N }] })),
    { cells: [{ v: 'Caja chica (entregas menos devoluciones)', cs: 2, s: L }, { v: r2(rows.filter(isCaja).reduce((a, x) => a + x.amount, 0)), s: N }] },
    { cells: [{ v: 'Total', cs: 2, s: { bold: true, fill: T.fill, line: T.line } }, { v: total, s: { ...N, bold: true, fill: T.fill } }] },
  ] };
  const bytes = xlsxBook([sheet1, sheet2], { title: P.meta.title + ' · Pagos' });
  return offerFile(fileSafe(P.meta.title) + '_pagos.xlsx', new Blob([bytes], { type: XLSX_MIME }));
}

/* el reporte de sobrecostos: cada partida que se pasó, cuánto y el motivo; y todas las partidas debajo */
function gsOverPdf(btn) { gsPdf(() => gsOverDoc(), btn); }
function gsOverDoc() {
  const doc = newDoc('landscape'), { T, G, rows, over, left, overSum } = gastosResumen(P, true), g = gsData(), fx = gsFx(), R = { halign: 'right' };
  const days = gsDays();
  let y = docHeader(doc, 'Reporte de sobrecostos', [tr(gsDaysTxt(days)), fx ? tr(`tipo de cambio ${gsCur()} ${fx} por US$`) : ''].filter(Boolean).join(' · '));
  const m = gsPm, d = v => 'US$ ' + moneyNum(v / fx);
  // (lote K) el resumen en una franja de seis cifras (rótulo gris arriba, cifra en negrita); antes, seis filas
  const red = [190, 30, 30];
  const kpi = [['Presupuestado (sin imprevistos ni impuesto)', T.sub], ['Comprometido', G.comp], ['Gastado', G.spent], ['Disponible', left], ['Imprevistos', T.cont], ['Sobrecosto de las partidas', overSum]];
  // (lote AH) cada cifra en su cuadro (rótulo arriba, cifra debajo), con líneas negras; antes, sin líneas
  const pad = () => ({ left: 8, right: 8 }), gw = .5, lw = (t, b) => ({ top: t ? gw : 0, bottom: b ? gw : 0, left: gw, right: gw });
  doc.autoTable({ ...TBL, startY: y + 2, theme: 'plain',
    body: [kpi.map(([k], i) => ({ content: pdfSafe(k), styles: { fontSize: PF.small, textColor: MUTED, valign: 'bottom', lineWidth: lw(1, 0), cellPadding: { top: 6, bottom: 1, ...pad(i) } } })),
      kpi.map(([, v], i) => ({ content: (v < 0 ? '- ' : '') + m(Math.abs(v)), styles: { font: 'title', fontStyle: 'bold', fontSize: 12, textColor: i === 5 ? (overSum > 0 ? red : INK) : INK, lineWidth: lw(0, !fx), cellPadding: { top: 1, bottom: fx ? 1 : 8, ...pad(i) } } })),
      ...(fx ? [kpi.map(([, v], i) => ({ content: d(v), styles: { fontSize: PF.small, textColor: MUTED, lineWidth: lw(0, 1), cellPadding: { top: 0, bottom: 8, ...pad(i) } } }))] : [])],
    columnStyles: Object.fromEntries(kpi.map((_, i) => [i, { cellWidth: (doc.internal.pageSize.getWidth() - 72) / 6 }])) });
  y = doc.lastAutoTable.finalY + 10;
  y = pdfSec(doc, y, over.length ? (over.length === 1 ? '1 partida pasó su monto' : `${over.length} partidas pasaron su monto`) : 'Ninguna partida pasó su monto', { need: 60 });
  if (over.length) doc.autoTable({ ...TBL, startY: y + 2, head: [['Partida', { content: 'Presupuestado', styles: R }, { content: 'Comprometido', styles: R }, { content: 'Gastado', styles: R }, { content: 'Sobrecosto', styles: R }, ...(fx ? [{ content: 'Sobrecosto US$', styles: R }] : []), { content: '%', styles: R }, 'Motivo']],
    body: over.map(r => [`${r.code}  ${pdfSafe(r.name)}`, { content: m(r.budget), styles: R }, { content: m(r.comp), styles: R }, { content: m(r.spent), styles: R }, { content: m(r.over), styles: { ...R, fontStyle: 'bold', textColor: red } }, ...(fx ? [{ content: d(r.over), styles: R }] : []),
      { content: r.budget > 0 ? '+' + Math.round(r.over / r.budget * 100) + ' %' : '', styles: R }, { content: pdfSafe(g.motivos[r.id] || 'Sin motivo todavía.'), styles: g.motivos[r.id] ? {} : { textColor: MUTED } }]),
    foot: [[{ content: 'Total', styles: { fontStyle: 'bold' } }, '', '', '', { content: m(overSum), styles: { ...R, fontStyle: 'bold' } }, ...(fx ? [{ content: d(overSum), styles: R }] : []), '', '']], footStyles: { fillColor: V2K.bg, textColor: INK },
    columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 74 }, 2: { cellWidth: 74 }, 3: { cellWidth: 74 }, 4: { cellWidth: 74 }, ...(fx ? { 5: { cellWidth: 70 } } : {}), [fx ? 6 : 5]: { cellWidth: 46 } } });
  doc.autoTable({ ...TBL, startY: (over.length ? doc.lastAutoTable.finalY : y) + 14, styles: { ...TBL.styles, cellPadding: { ...PAD, top: 4, bottom: 4 } }, head: [['Todas las partidas', { content: 'Presupuestado', styles: R }, { content: 'Comprometido', styles: R }, { content: 'Gastado', styles: R }, { content: 'Saldo', styles: R }, ...(fx ? [{ content: 'Saldo US$', styles: R }] : []), { content: 'Avance', styles: R }]],
    body: rows.map(r => [`${r.code}  ${pdfSafe(r.name)}`, { content: m(r.budget), styles: R }, { content: m(r.comp), styles: R }, { content: m(r.spent), styles: R }, { content: (r.left < -0.005 ? '- ' : '') + m(Math.abs(r.left)), styles: { ...R, ...(r.left < -0.005 ? { textColor: [190, 30, 30], fontStyle: 'bold' } : {}) } }, ...(fx ? [{ content: d(r.left), styles: R }] : []), { content: Number.isFinite(r.pct) ? Math.round(r.pct) + ' %' : '', styles: R }]),
    foot: [[{ content: 'Total', styles: { fontStyle: 'bold' } }, { content: m(T.sub), styles: R }, { content: m(G.comp), styles: R }, { content: m(G.spent), styles: R }, { content: (left < 0 ? '- ' : '') + m(Math.abs(left)), styles: R }, ...(fx ? [{ content: d(left), styles: R }] : []), { content: T.sub ? Math.round((G.comp + G.spent) / T.sub * 100) + ' %' : '', styles: R }]], footStyles: { fillColor: V2K.bg, textColor: INK, fontStyle: 'bold' } });
  y = doc.lastAutoTable.finalY + 14;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text(doc.splitTextToSize('Comprometido: órdenes de compra y reembolsos aprobados sin pagar. Gastado: lo pagado y los recibos de caja chica. Las órdenes de compra cuentan sin su impuesto, como el presupuesto.', doc.internal.pageSize.getWidth() - 72), 36, y);
  doc.setTextColor(...INK);
  pageNumbers(doc, 'Reporte de sobrecostos');
  return { doc, name: fileSafe(P.meta.title) + '_reporte_de_sobrecostos.pdf' };
}
// exportar: producción (con el presupuesto abierto) ve todo; quien tiene caja chica, el sobre de la suya
const gsOverOk = () => gsOn() && gsMe().seesAll && canReadData('presupuesto') && !gsBudLocked();
EXPORTS.gastos = () => {
  if (!gsOn()) return [];
  const me = gsMe(), out = [];
  if (me.seesAll && !gsBudLocked()) {
    if (canReadData('presupuesto')) out.push({ label: 'Reporte de sobrecostos (PDF)', hint: 'Cada partida que se pasó, cuánto y el motivo', run: btn => gsOverPdf(btn) });
    out.push({ label: 'Pagos (Excel)', hint: 'Lo pagado por fecha y por partida, con los filtros de la vista Pagos, para el contador', run: () => gsPayXlsx() });
  }
  for (const c of gsData().cajas.filter(c => me.seesAll ? !c.closed && GS.view === 'caja' : gsMine(c))) out.push({ label: `Sobre de caja chica · ${c.name}`, hint: 'PDF: entregas, recibos con sus fotos y firmas', run: btn => gsCajaPdf(c, btn) });
  return out;
};
EXPORTS_NOTE.gastos = () => EXPORTS.gastos().length ? '' : `<p class="xnote">${ICO.warn}<span>Los documentos de Gastos (órdenes, pagos y sobrecostos) los exporta producción.</span></p>`;
// en Presupuesto, junto a su PDF: el reporte de sobrecostos
EXPORTS.budget = (prev => () => [...prev(), ...(gsOverOk() ? [{ label: 'Reporte de sobrecostos (PDF)', hint: 'Lo gastado contra el presupuesto: cada partida que se pasó, cuánto y el motivo', run: btn => gsOverPdf(btn) }] : [])])(EXPORTS.budget);

/* ---------- acciones ---------- */
const gsOc = id => gsData().ocs.find(o => o.id === id);
Object.assign(ACT, {
  'ga-view': b => { GS.view = b.dataset.v; render(); },
  'ga-st': b => { GS.st = b.dataset.v; render(); },
  'ga-oc-new': () => gsOcDialog(null),
  'ga-oc-open': b => { const o = gsOc(b.dataset.id); if (o) gsOcDialog(o); },
  'ga-oc-ok': b => { const o = gsOc(b.dataset.id); if (!o) return; o.state = 'ok'; changed('data'); render(); toast(`${o.num || 'Orden'} aprobada.`); },
  'ga-oc-pay': b => { const o = gsOc(b.dataset.id); if (!o) return; gsPayDialog(o, `Pagar ${o.num} · ${o.vendor}`, d => { o.state = 'paid'; o.paid = { date: d }; changed('data'); render(); toast(`${o.num} pagada.`); }); },
  'ga-oc-void': b => { const o = gsOc(b.dataset.id); if (!o) return; gsVoidDialog(`Anular ${o.num}`, `La orden queda en el registro como anulada y deja de contar en el resumen.`, w => { o.state = 'void'; o.void = { why: w }; changed('data'); render(); }); },
  'ga-oc-pdf': (b) => { const o = gsOc(b.dataset.id); if (o && typeof gsOcPdf === 'function') gsOcPdf(o, b); },
  // caja chica
  'ga-give': b => gsGiveDialog(b.dataset.c ? gsCajaOf(b.dataset.c) : null),
  'ga-cj-close': b => { const c = gsCajaOf(b.dataset.c); if (c) gsCloseDialog(c); },
  'ga-cj-del': b => { const c = gsCajaOf(b.dataset.c); if (c && !c.recibos.length) confirmBox(`Quitar la caja de ${c.name}`, 'No tiene recibos. Si ya se entregó el dinero, mejor ciérrala para que quede registrada la devolución.', 'Quitar', () => { gsData().cajas = gsData().cajas.filter(z => z.id !== c.id); changed('data'); render(); }); },
  'ga-cj-pdf': b => { const c = gsCajaOf(b.dataset.c); if (c && typeof gsCajaPdf === 'function') gsCajaPdf(c, b); },
  'ga-rec-new': b => { const c = gsCajaOf(b.dataset.c); if (c) gsRecDialog(c, null); },
  'ga-rec-open': b => { const c = gsCajaOf(b.dataset.c), r = c && c.recibos.find(z => z.id === b.dataset.id); if (r) gsRecDialog(c, r); },
  'ga-rec-ok': b => gsRecReview(b.dataset.c, b.dataset.id),
  // reembolsos
  'ga-rb-new': () => gsRbDialog(null),
  'ga-rb-open': b => { const r = gsRb(b.dataset.id); if (r) gsRbDialog(r); },
  'ga-rb-ok': b => { const r = gsRb(b.dataset.id); if (!r) return; r.state = 'ok'; changed('data'); render(); toast('Reembolso aprobado.'); },
  'ga-rb-pay': b => { const r = gsRb(b.dataset.id); if (!r) return; gsPayDialog(r, `Pagar el reembolso de ${r.name}`, d => { r.state = 'paid'; r.paid = { date: d }; changed('data'); render(); toast('Reembolso pagado.'); }); },
  'ga-rb-void': b => { const r = gsRb(b.dataset.id); if (!r) return; gsVoidDialog(`Anular el reembolso de ${r.name}`, 'El reembolso queda en el registro como anulado y deja de contar en el resumen.', w => { r.state = 'void'; r.void = { why: w }; changed('data'); render(); }); },
  // pagos
  'ga-pf-clear': () => { GS.sec = GS.who = GS.week = ''; render(); },
});
Object.assign(BIND, {
  'ga-mot': (el, ev) => { if (!gsMe().motivos) return; const g = gsData(), s = el.dataset.sec, t = el.value.slice(0, 500); if (t.trim()) g.motivos[s] = t; else delete g.motivos[s]; if (ev === 'change') changed('data'); },
  // «+ Recibo» en el teléfono: la foto recién tomada abre el recibo para completar el monto y la partida
  'ga-cam': async (el, ev) => {
    if (ev !== 'change') return;
    const f = el.files && el.files[0], c = gsCajaOf(el.dataset.c); el.value = '';
    if (!f || !c) return;
    const r = await gsCompress(f);
    if (r) gsRecDialog(c, null, r.url);
  },
  'ga-pf': (el, ev) => { if (ev !== 'change') return; GS[el.dataset.f] = el.value; render(); },
});

/* ---------- la columna «Gastado» del presupuesto ----------
   En la pestaña Presupuesto, junto a cada partida y a cada línea: lo comprometido y gastado (solo producción) */
function gaBudget() {
  if (!gsOn() || !gsMe().seesAll) return null;
  const G = gastosTotals(P);
  return G.comp || G.spent ? G : null;
}
function gaBudSecHTML(G, sec, total) {
  const x = G.bySec[sec]; if (!x || !(x.comp + x.spent)) return '';
  const used = x.comp + x.spent, pct = total > 0 ? used / total * 100 : Infinity, cls = pct > 100.0001 ? 'bad' : pct >= 90 ? 'warn' : '';
  return `<span class="ga-bsp${cls ? ' ' + cls : ''}" title="${ea(`Gastado ${gsM(x.spent)} · comprometido ${gsM(x.comp)}`)}">${esc(gsM(used))} · ${Number.isFinite(pct) ? Math.round(pct) + ' %' : '—'}</span>`;
}
function gaBudLineHTML(G, id) {
  const x = G.byLine[id];
  return x && x.comp + x.spent ? `<span title="${ea(`Gastado ${gsM(x.spent)} · comprometido ${gsM(x.comp)}`)}">${esc(gsM(x.comp + x.spent))}</span>` : '<span class="hint">—</span>';
}

/* ---------- qué cambió (la actividad del equipo) ----------
   (CHDESC está en notas.js, que se carga después: se agrega al terminar de cargar) */
setTimeout(() => { if (typeof CHDESC !== 'undefined') CHDESC.gastos = gsDescribe; }, 0);
function gsDescribe(b, a) {
  const B = new Map((b.ocs || []).map(o => [o.id, o])), name = o => `${o.num || 'la orden'}${o.vendor ? ' de ' + o.vendor : ''}`;
  for (const o of a.ocs || []) {
    const p = B.get(o.id);
    if (!p) return { what: `pidió una orden de compra a ${o.vendor || 'un proveedor'}` };
    if (p.state !== o.state) return { what: o.state === 'ok' ? `aprobó ${name(o)}` : o.state === 'paid' ? `pagó ${name(o)}` : o.state === 'void' ? `anuló ${name(o)}` : `cambió ${name(o)}` };
    if (canon(p) !== canon(o)) return { what: `cambió ${name(o)}` };
  }
  // caja chica: entregas, recibos y cierre
  const CB = new Map((b.cajas || []).map(c => [c.id, c]));
  for (const c of a.cajas || []) {
    const p = CB.get(c.id), who = c.name || '';
    if (!p || (c.given || []).length > (p.given || []).length) { const g = (c.given || []).slice(-1)[0]; return { what: `entregó ${gsM(g ? g.amount : 0)} de caja chica a ${who}` }; }
    if (c.closed && !p.closed) return { what: `cerró la caja chica de ${who}` };
    const PR = new Map((p.recibos || []).map(r => [r.id, r]));
    for (const r of c.recibos || []) {
      const q = PR.get(r.id);
      if (!q) return { what: `rindió un recibo de ${gsM(r.amount)} (${who})` };
      if (r.void && !q.void) return { what: `anuló un recibo de ${who}` };
      if (r.ok && !q.ok) return { what: `revisó un recibo de ${who}` };
      if (canon(q) !== canon(r)) return { what: `cambió un recibo de ${who}` };
    }
    if ((p.recibos || []).length > (c.recibos || []).length) return { what: `quitó un recibo de ${who}` };
  }
  // reembolsos
  const RB = new Map((b.reemb || []).map(r => [r.id, r]));
  for (const r of a.reemb || []) {
    const p = RB.get(r.id), who = r.name || '';
    if (!p) return { what: r.state === 'pend' ? `pidió un reembolso de ${gsM(r.amount)}` : `registró un reembolso para ${who}` };
    if (p.state !== r.state) return { what: r.state === 'ok' ? `aprobó el reembolso de ${who}` : r.state === 'paid' ? `pagó el reembolso de ${who}` : r.state === 'void' ? `anuló el reembolso de ${who}` : `cambió el reembolso de ${who}` };
    if (canon(p) !== canon(r)) return { what: `cambió el reembolso de ${who}` };
  }
  if (canon(b.motivos || {}) !== canon(a.motivos || {})) return { what: 'escribió el motivo de un sobrecosto' };
  return { what: 'actualizó Gastos' };
}

/* ---------- ayuda y exportar ---------- */
HELP.gastos = [
  ['Resumen', 'Cada partida del presupuesto con lo comprometido (órdenes y reembolsos aprobados sin pagar), lo gastado y el saldo. La barra se pone ámbar al 90 % y roja al pasarse; el motivo de cada sobrecosto va al reporte.'],
  ['Órdenes de compra', 'Se numeran solas. Las que crea producción nacen aprobadas; las que pide un jefe de área esperan su aprobación. Lo pagado no se edita: se anula con un motivo.'],
  ['Caja chica', 'Una tarjeta por persona con lo entregado, lo rendido y el saldo en mano. Cada recibo lleva su foto, su partida y su tipo (boleta, factura, recibo por honorarios o sin comprobante). En el teléfono, «Recibo» abre la cámara. Producción revisa cada recibo y, al cerrar la caja, lo que sobró se devuelve o lo gastado de más se le reembolsa a la persona.'],
  ['Reembolsos', 'Lo que alguien pagó de su bolsillo, o su kilometraje (km por tarifa). Un jefe de área lo pide; producción lo aprueba y lo paga.'],
  ['Pagos', 'Todo lo que salió de producción, por fecha: órdenes pagadas con su impuesto, reembolsos pagados y la caja chica (entregas, menos lo devuelto al cerrar). Se filtra por partida, persona o semana.'],
  ['Quién ve qué', 'Producción ve todo. Un jefe de área ve solo sus órdenes, su caja chica y sus reembolsos; quien tiene una caja chica, solo la suya. Lo da el permiso «Gastos» en Equipo y permisos.'],
];
