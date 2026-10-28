/* ============================================================
   Pestaña · PRESUPUESTO — enlazado al desglose y al plan
   Solo producción: se abre con un código de 4 dígitos por persona y cada
   cambio queda en el registro con su nombre. Monto en dólares con tipo de
   cambio manual e impuesto con nombre y porcentaje editables.
   ============================================================ */
const money = (v, cur) => (cur || P.budget.currency || 'S/') + ' ' + moneyNum(v);
const usd = v => 'US$ ' + moneyNum(v);
const linkLabel = l => {
  if (l.gone) return 'ya no está en el desglose';
  if (!l.link && !l.qlink) return '';
  if (l.link === 'shoot') return 'días de rodaje';
  if (l.link === 'extras') return 'días con figuración';
  if (l.link && l.link.startsWith('cast:')) return 'días en el plan';
  if (l.link && l.link.startsWith('loc:')) return 'días en el plan';
  if (l.link && l.link.startsWith('veh:')) return 'días en el plan';
  if (l.link && l.link.startsWith('luz:')) return 'días de rodaje';
  if (l.qlink) return 'cantidad del desglose';
  return '';
};
const BUD_FIELDS = { name: 'concepto', qty: 'cantidad', unit: 'unidad', mult: 'días/sem.', rate: 'tarifa' };
const budEditable = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('presupuesto'));

/* ---------- acceso con código ----------
   Proyecto propio: los códigos van en el proyecto (budget.lock.people), así viajan con el archivo.
   Proyecto de equipo: la persona ya está identificada por el equipo; su código abre el presupuesto
   en su equipo y se guarda solo ahí. */
const BUDS = { pid: null, who: null };
const hexOf = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const bytesOf = h => new Uint8Array((h.match(/../g) || []).map(x => parseInt(x, 16)));
const newSalt = () => hexOf(crypto.getRandomValues(new Uint8Array(16)));
async function pinHash(pin, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  return hexOf(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: bytesOf(salt), iterations: 120000 }, key, 256));
}
// en la web app con cuentas el presupuesto ya es solo para producción: el código es opcional (Pro), como en un proyecto propio
const budShared = () => !!(P && P._shared && typeof SHARE !== 'undefined' && SHARE && SHARE.pid === P.id) && !API();
const budPinKey = () => `budpin:${P.id}:${SHARE && SHARE.me ? SHARE.me.id : ''}`;
const budProtected = () => budShared() || !!(P.budget.lock && P.budget.lock.people && P.budget.lock.people.length);
const budOpen = () => !budProtected() || (BUDS.pid === P.id && !!BUDS.who);
function budLog(txt) {
  if (!budProtected() || !BUDS.who) return;
  const log = P.budget.log = P.budget.log || [];
  log.push({ t: Date.now(), who: BUDS.who.name, txt });
  if (log.length > 1000) log.splice(0, log.length - 1000);
}
const pinOk = v => /^\d{4}$/.test(v);
function budLockHTML() {
  const shared = budShared();
  const hasPin = shared && !!ls.get(budPinKey(), null);
  const create = shared && !hasPin;
  return `<div class="ws ws-1"><section class="center"><div class="scroller pad"><div class="bud-lock card">
    <div class="bl-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30"><rect x="4.5" y="10.5" width="15" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></div>
    <h2>Presupuesto protegido</h2>
    <p class="hint">${create ? `Solo producción puede abrirlo. Crea tu código de 4 dígitos para abrirlo en este equipo; tus cambios quedarán en el registro a nombre de <b>${esc(SHARE.me.name)}</b>.` : shared ? `Escribe tu código de 4 dígitos, ${esc(SHARE.me.name)}.` : 'Solo producción puede verlo y editarlo. Escribe tu código de 4 dígitos: tus cambios quedan en el registro con tu nombre.'}</p>
    <form id="blF" class="bl-form" autocomplete="off">
      <input id="blP" class="pin" type="password" inputmode="numeric" maxlength="4" pattern="\\d{4}" placeholder="••••" aria-label="Código de 4 dígitos" autofocus>
      ${create ? '<input id="blP2" class="pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" aria-label="Repite el código">' : ''}
      <button class="btn primary" type="submit">${create ? 'Crear código y abrir' : 'Abrir'}</button>
    </form>
    <p class="bl-err" id="blE" role="alert" hidden></p>
    ${create ? '' : `<button class="linkbtn" type="button" id="blF2">¿Olvidaste tu código?</button>`}
  </div></div></div></section></div>`;
}
function bindBudLock() {
  const f = $('#blF'); if (!f) return;
  const err = t => { const e = $('#blE'); e.textContent = t; e.hidden = !t; };
  f.onsubmit = async e => {
    e.preventDefault();
    const pin = $('#blP').value.trim();
    if (!pinOk(pin)) { err('El código tiene 4 dígitos.'); return; }
    const btn = $('button[type=submit]', f); btn.disabled = true;
    try {
      if (budShared()) {
        const saved = ls.get(budPinKey(), null);
        if (!saved) {
          if ($('#blP2').value.trim() !== pin) { err('Los dos códigos no coinciden.'); return; }
          const s = newSalt(); ls.set(budPinKey(), { s, h: await pinHash(pin, s) });
        } else if (await pinHash(pin, saved.s) !== saved.h) { await new Promise(r => setTimeout(r, 700)); err('Código incorrecto.'); $('#blP').select(); return; }
        Object.assign(BUDS, { pid: P.id, who: { id: SHARE.me.id, name: SHARE.me.name } });
      } else {
        let who = null;
        for (const p of P.budget.lock.people) if (await pinHash(pin, p.s) === p.h) { who = p; break; }
        if (!who) { await new Promise(r => setTimeout(r, 700)); err('Código incorrecto.'); $('#blP').select(); return; }
        Object.assign(BUDS, { pid: P.id, who: { id: who.id, name: who.name } });
      }
      render();
    } finally { btn.disabled = false; }
  };
  const fg = $('#blF2');
  if (fg) fg.onclick = () => budShared() ? modal({
    title: 'Código olvidado',
    body: `<p style="margin:0">Tu código vive solo en este equipo. Sal del proyecto desde el menú del equipo y vuelve a entrar${DESK ? ' con tu contraseña del equipo' : ''}: al abrir el presupuesto crearás un código nuevo.</p>`,
    foot: '<button class="btn primary" data-close>Entendido</button>',
  }) : budRecover();
}
/* código de recuperación: se muestra una sola vez al proteger el presupuesto */
const recCode = () => { const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; const r = crypto.getRandomValues(new Uint8Array(10)); return [...r].map(x => A[x % A.length]).join('').replace(/(.{5})/, '$1-'); };
function showRecovery(code) {
  modal({
    title: 'Código de recuperación',
    body: `<p style="margin:0">Guárdalo en un lugar seguro. Sirve para poner un código nuevo si alguien de producción olvida el suyo. No se vuelve a mostrar.</p>
      <div class="rec-code" style="font-size:22px;text-align:center;padding:10px">${esc(code)}</div>`,
    foot: '<button class="btn primary" data-close>Ya lo guardé</button>',
  });
}
async function budNewLock(name, pin) {
  const s = newSalt(), rc = recCode(), rs = newSalt();
  const person = { id: uid('pr'), name, s, h: await pinHash(pin, s), at: Date.now() };
  P.budget.lock = { people: [person], rec: { s: rs, h: await pinHash(rc.replace('-', ''), rs) } };
  Object.assign(BUDS, { pid: P.id, who: { id: person.id, name } });
  budLog('Protegió el presupuesto con código');
  changed('data'); render(); showRecovery(rc);
}
function budProtectDialog() {
  const names = (P.meta.producers || []).map(x => typeof x === 'string' ? x : x.name).filter(Boolean);
  const m = modal({
    title: 'Proteger el presupuesto',
    body: `<p style="margin:0">Desde ahora solo producción podrá ver y editar el presupuesto, cada persona con su código de 4 dígitos. Cada cambio queda en el registro con su nombre.</p>
      <label class="fld"><span>Tu nombre</span><input type="text" id="bpN" value="${esc(names[0] || '')}" list="bpNames" placeholder="Productor/a"></label><datalist id="bpNames">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <div class="grid2"><label class="fld"><span>Código de 4 dígitos</span><input type="password" inputmode="numeric" maxlength="4" id="bpP" class="pin"></label>
      <label class="fld"><span>Repite el código</span><input type="password" inputmode="numeric" maxlength="4" id="bpP2" class="pin"></label></div>
      <p class="bl-err" id="bpE" hidden></p>
      <p class="hint" style="margin:0">Es una protección dentro del programa: oculta el presupuesto a quien abra el proyecto, pero no lo cifra; con una copia del archivo y conocimientos técnicos se podría leer. Para que el resto del equipo no lo reciba en absoluto, comparte el proyecto: solo los cargos de producción reciben el presupuesto.</p>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="bpOk">Proteger</button>',
  });
  $('#bpOk', m).onclick = async () => {
    const n = $('#bpN', m).value.trim(), a = $('#bpP', m).value.trim(), b = $('#bpP2', m).value.trim();
    const e = $('#bpE', m);
    const bad = !n ? 'Escribe tu nombre.' : !pinOk(a) ? 'El código tiene 4 dígitos.' : a !== b ? 'Los dos códigos no coinciden.' : '';
    if (bad) { e.textContent = bad; e.hidden = false; return; }
    closeModal(); await budNewLock(n, a);
  };
}
function budPersonDialog() {
  const m = modal({
    title: 'Agregar a producción',
    body: `<p style="margin:0">La persona escribe su propio código. Con él abrirá el presupuesto y sus cambios quedarán a su nombre.</p>
      <label class="fld"><span>Nombre</span><input type="text" id="apN" placeholder="Productor/a"></label>
      <div class="grid2"><label class="fld"><span>Su código de 4 dígitos</span><input type="password" inputmode="numeric" maxlength="4" id="apP" class="pin"></label>
      <label class="fld"><span>Repite el código</span><input type="password" inputmode="numeric" maxlength="4" id="apP2" class="pin"></label></div><p class="bl-err" id="apE" hidden></p>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="apOk">Agregar</button>',
  });
  $('#apOk', m).onclick = async () => {
    const n = $('#apN', m).value.trim(), a = $('#apP', m).value.trim(), b = $('#apP2', m).value.trim();
    const e = $('#apE', m);
    let bad = !n ? 'Escribe el nombre.' : !pinOk(a) ? 'El código tiene 4 dígitos.' : a !== b ? 'Los dos códigos no coinciden.' : '';
    if (!bad) for (const p of P.budget.lock.people) if (await pinHash(a, p.s) === p.h) { bad = 'Ese código ya lo usa otra persona: elige otro.'; break; }
    if (bad) { e.textContent = bad; e.hidden = false; return; }
    const s = newSalt();
    P.budget.lock.people.push({ id: uid('pr'), name: n, s, h: await pinHash(a, s), at: Date.now() });
    budLog('Dio acceso al presupuesto a ' + n);
    closeModal(); changed('data'); render();
  };
}
function budRecover() {
  const lock = P.budget.lock;
  const m = modal({
    title: 'Poner un código nuevo',
    body: `<label class="fld"><span>Código de recuperación</span><input type="text" id="rcC" placeholder="XXXXX-XXXXX" autocomplete="off" style="text-transform:uppercase"></label>
      <label class="fld"><span>Persona</span><select id="rcW">${lock.people.map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>
      <div class="grid2"><label class="fld"><span>Código nuevo</span><input type="password" inputmode="numeric" maxlength="4" id="rcP" class="pin"></label>
      <label class="fld"><span>Repite el código</span><input type="password" inputmode="numeric" maxlength="4" id="rcP2" class="pin"></label></div><p class="bl-err" id="rcE" hidden></p>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="rcOk">Cambiar código</button>',
  });
  $('#rcOk', m).onclick = async () => {
    const c = $('#rcC', m).value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), a = $('#rcP', m).value.trim(), b = $('#rcP2', m).value.trim();
    const e = $('#rcE', m);
    const fail = t => { e.textContent = t; e.hidden = false; };
    if (!pinOk(a) || a !== b) return fail('Escribe dos veces el mismo código de 4 dígitos.');
    if (!lock.rec || await pinHash(c, lock.rec.s) !== lock.rec.h) { await new Promise(r => setTimeout(r, 700)); return fail('El código de recuperación no es correcto.'); }
    const p = lock.people.find(x => x.id === $('#rcW', m).value);
    p.s = newSalt(); p.h = await pinHash(a, p.s);
    Object.assign(BUDS, { pid: P.id, who: { id: p.id, name: p.name } });
    budLog('Puso un código nuevo con el código de recuperación');
    closeModal(); changed('data'); render(); toast('Código nuevo listo.');
  };
}
function budAccessHTML(ed) {
  const log = (P.budget.log || []).slice().reverse();
  const when = t => new Date(t).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  let who = '';
  if (budShared()) {
    const ms = (SHARE.members || []).filter(x => x.owner || (x.perms && x.perms.presupuesto && isProducer(x.role)));
    who = `<p class="hint" style="margin:0">Pueden abrirlo: ${ms.map(x => `<b>${esc(x.name)}</b>${x.owner ? ' (administra)' : x.perms.presupuesto === 'ver' ? ' (solo ver)' : ''}`).join(', ') || '—'}. Cada uno con su propio código en su equipo. Los cargos de producción se asignan en <i>Equipo y permisos</i>.</p>`;
  } else if (budProtected()) {
    who = `<div class="bud-people">${P.budget.lock.people.map(p => `<span class="chip">${esc(p.name)}${BUDS.who && BUDS.who.id === p.id ? ' · tú' : ''}${ed && P.budget.lock.people.length > 1 ? ` <button class="linkbtn" data-act="bu-rmp" data-id="${esc(p.id)}" aria-label="Quitar a ${esc(p.name)}">quitar</button>` : ''}</span>`).join('')}
      ${ed ? '<button class="btn sm" data-act="bu-addp">+ Agregar a producción</button><button class="btn sm ghost" data-act="bu-unprotect">Quitar la protección</button>' : ''}</div>`;
  }
  return `<details class="sec bud-acc" ${ls.get('budAcc', false) ? 'open' : ''}><summary><span class="code">${ICO.lock}</span>Acceso y registro de cambios<span class="count">${log.length} cambios</span></summary>
    <div style="padding:12px 14px;display:grid;gap:10px">${who}
      ${log.length ? `<div class="bud-log">${log.slice(0, 300).map(x => `<div><span class="t">${esc(when(x.t))}</span><b>${esc(x.who)}</b><span>${esc(x.txt)}</span></div>`).join('')}</div>` : '<p class="hint" style="margin:0">Todavía no hay cambios registrados.</p>'}
    </div></details>`;
}

/* la cabecera del presupuesto (lote I): el total como título; debajo, qué incluye; las tarifas de ejemplo como aviso
   junto al título (se abre con la explicación) y «Actualizar desde plan y desglose» a mano */
function budHeadHTML(T, st, fx, ed) {
  const tn = taxName(P);
  const sub = `<b>Total con ${P.budget.contingency} % de imprevistos${P.budget.igv ? ` y ${esc(tn)}` : ''}</b>${fx ? ` · ${esc(usd(T.total / fx))}` : ''} · <span data-no-tr>${esc(P.meta.title || '')}</span> · ${st.shoot} ${st.shoot === 1 ? 'jornada' : 'jornadas'} de rodaje`;
  const act = (UI.budNote ? hdPill('warn', 'Tarifas de ejemplo', { chev: true, attrs: 'data-act="bu-note-pop" aria-haspopup="dialog"' }) : '')
    + (ed ? hdBtn('sec', 'Actualizar desde plan y desglose', { icon: 'refresh', attrs: 'data-act="bu-sync" title="Recalcula días y cantidades enlazadas"' }) : '');
  return `<section class="hd bud-hd" aria-label="Cabecera del presupuesto">${hdHead({ title: `<span class="tnum">${esc(money(T.total))}</span>`, sub, act })}</section>`;
}
RENDER.budget = function () {
  const v = $('#view');
  if (BUDS.pid !== P.id) { BUDS.pid = P.id; BUDS.who = null; }
  if (!budOpen()) { v.innerHTML = budLockHTML(); bindView(); bindBudLock(); setTimeout(() => { const i = $('#blP'); if (i) i.focus(); }, 30); return; }
  const ed = budEditable();
  const before = JSON.stringify(P.budget.lines);
  const sy = syncBudget(P, D.sc, D.sem);
  if (JSON.stringify(P.budget.lines) !== before && ed) changed('data');
  if (sy.gone.length) setTimeout(() => toast(sy.gone.length === 1 ? `«${sy.gone[0]}» ya no está en el desglose: su línea quedó en el presupuesto, sin enlace.` : `${sy.gone.length} líneas quedaron sin enlace: sus elementos ya no están en el desglose.`, 6000), 60);
  const T = budgetTotals(P);
  const GT = typeof gaBudget === 'function' ? gaBudget() : null;   // lo gastado por partida y línea (Gastos, tab-gastos.js)
  const cur = P.budget.currency;
  const fx = planAllows('usd') ? budgetFx(P) : 0;
  const secs = BUD_SECTIONS.map(s => ({ ...s, lines: P.budget.lines.filter(l => l.sec === s.id), total: T.bySec[s.id] || 0 }));
  const open = ls.get('budOpen', ['cast', 'crew']);
  const st = budgetStats(P, D.sc, D.sem);
  const dis = ed ? '' : 'disabled';
  v.innerHTML = `<div class="ws ws-1"><section class="center">
    <div class="bar">
      <span class="grow"></span>
      ${budProtected() ? `<span class="bud-who" title="Los cambios quedan a tu nombre">${esc(BUDS.who ? BUDS.who.name : '')}</span><button class="btn" data-act="bu-lock" title="Cierra el presupuesto: hará falta el código para volver a abrirlo">${ICO.lock} Bloquear</button>` : ''}
      ${toolsHTML()}
    </div>
    <div class="scroller pad" data-keep="bud"><div class="bud">
      ${budHeadHTML(T, st, fx, ed)}
      <div class="bud-top">${budTopHTML(T, st, fx)}</div>
      ${secs.map(s => `<details class="sec${s.total ? '' : ' z'}" data-sec="${ea(s.id)}" ${open.includes(s.id) ? 'open' : ''}><summary><span class="code">${s.code}</span>${esc(s.name)}<span class="count">${s.lines.length} ${s.lines.length === 1 ? 'línea' : 'líneas'}</span>${GT ? gaBudSecHTML(GT, s.id, s.total) : ''}<span class="st">${esc(money(s.total))}${fx ? ` <small class="usd">${esc(usd(s.total / fx))}</small>` : ''}</span></summary>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th style="min-width:200px">Concepto</th><th class="num">Cant.</th><th>Unidad</th><th class="num">Días / sem.</th><th class="num">Tarifa</th><th class="num">Total</th>${fx ? '<th class="num">Total US$</th>' : ''}${GT ? '<th class="num">Gastado</th>' : ''}<th></th></tr></thead><tbody>
        ${s.lines.map(l => `<tr data-id="${ea(l.id)}" data-note="line:${ea(l.id)}"><td><input type="text" value="${esc(l.name)}" data-bind="bu" data-f="name" data-id="${ea(l.id)}" aria-label="Concepto" ${dis}>${linkLabel(l) ? `<span class="link${ea(l.gone ? ' gone' : '')}" title="${ea(l.gone ? 'Su elemento se quitó del guion o del desglose. La línea se conservó con tu tarifa; bórrala si ya no va.' : 'Se actualiza con «Actualizar desde plan y desglose»')}">${esc(linkLabel(l))}</span>` : ''}</td>
          <td class="num"><input class="w-sm" type="number" min="0" step="any" value="${ea(l.qty)}" data-bind="bu" data-f="qty" data-id="${ea(l.id)}" style="text-align:right" aria-label="Cantidad" ${dis}></td>
          <td><select data-bind="bu" data-f="unit" data-id="${ea(l.id)}" style="width:auto" aria-label="Unidad" ${dis}>${UNITS.map(un => `<option ${un === l.unit ? 'selected' : ''}>${un}</option>`).join('')}</select></td>
          <td class="num"><input class="w-sm" type="number" min="0" step="any" value="${ea(l.mult)}" data-bind="bu" data-f="mult" data-id="${ea(l.id)}" style="text-align:right" aria-label="Días o semanas" ${dis}></td>
          <td class="num"><input class="w-sm" type="number" min="0" step="any" value="${ea(l.rate)}" data-bind="bu" data-f="rate" data-id="${ea(l.id)}" style="text-align:right;width:88px" aria-label="Tarifa" ${dis}></td>
          <td class="num" data-total="${ea(l.id)}">${esc(money(lineTotal(l)))}</td>${fx ? `<td class="num usd" data-usd="${ea(l.id)}">${esc(usd(lineTotal(l) / fx))}</td>` : ''}${GT ? `<td class="num ga-bl">${gaBudLineHTML(GT, l.id)}</td>` : ''}
          <td>${ed ? `<button class="xbtn" data-act="bu-del" data-id="${ea(l.id)}" aria-label="Eliminar la línea ${esc(l.name)}" title="Eliminar línea">${ICO.close}</button>` : ''}</td></tr>`).join('')}
        ${ed ? `<tr><td colspan="${ea((fx ? 8 : 7) + (GT ? 1 : 0))}"><button class="btn ghost sm" data-act="bu-add" data-sec="${ea(s.id)}">+ Añadir línea</button></td></tr>` : ''}</tbody></table></div></details>`).join('')}
      ${budProtected() ? budAccessHTML(ed) : ''}
    </div></div></section></div>`;
  bindView();
  $$('details.sec[data-sec]', v).forEach(d => d.addEventListener('toggle', () => ls.set('budOpen', $$('details.sec[data-sec][open]', v).map(x => x.dataset.sec))));
  const acc = $('details.bud-acc', v); if (acc) acc.addEventListener('toggle', () => ls.set('budAcc', acc.open));
};
/* (lote AH) el resumen y las barras «Por partida»: los arma la pestaña y los vuelve a armar refreshBudgetTotals al escribir */
function budTopHTML(T, st, fx) {
  const tn = taxName(P), u = x => fx ? `<span class="usd">${esc(usd(x / fx))}</span>` : '';
  const secs = BUD_SECTIONS.map(s => ({ name: s.name, total: T.bySec[s.id] || 0 })), max = Math.max(1, ...secs.map(s => s.total));
  return hdGroup('Resumen', hdRow('Subtotal', `${esc(money(T.sub))}${u(T.sub)}`) + hdRow(`Imprevistos (${P.budget.contingency} %)`, `${esc(money(T.cont))}${u(T.cont)}`)
      + (P.budget.igv ? hdRow(`${esc(tn)} (${P.budget.igvRate} %)`, `${esc(money(T.igv))}${u(T.igv)}`) : '') + hdRow('Jornadas de rodaje', String(st.shoot))
      + hdRow('Costo por jornada', st.shoot ? esc(money(['cast', 'extras', 'crew', 'camera', 'sound', 'loc', 'trans', 'food'].reduce((a, k) => a + (T.bySec[k] || 0), 0) / st.shoot)) : 'Sin jornadas', { lab: 'Solo lo del rodaje', st: st.shoot ? '' : 'ph' }), { cls: 'bud-sum' })
    + `<div class="hd-g bud-bars"><h3 class="bud-bh">Por partida</h3><div ${mfold('bud-sec', 'hd-box')}><div class="mf-h"><h3>Por partida</h3></div><div class="bars">${secs.filter(s => s.total > 0).sort((a, b) => b.total - a.total).map(s => `<div class="barrow"><span class="lab">${esc(s.name)}</span><span class="track"><span class="fill" style="width:${ea((s.total / max * 100).toFixed(1))}%;display:block"></span></span><span class="v">${T.sub ? Math.round(s.total / T.sub * 100) : 0}%</span></div>`).join('') || '<span class="hint">Sin montos todavía.</span>'}</div></div></div>`;
}
function refreshBudgetTotals() {
  const T = budgetTotals(P), fx = planAllows('usd') ? budgetFx(P) : 0;
  $$('[data-total]').forEach(td => { const l = P.budget.lines.find(x => x.id === td.dataset.total); if (l) td.textContent = money(lineTotal(l)); });
  $$('[data-usd]').forEach(td => { const l = P.budget.lines.find(x => x.id === td.dataset.usd); if (l && fx) td.textContent = usd(lineTotal(l) / fx); });
  $$('details.sec[data-sec]').forEach(d => { const st = $('.st', d); if (st) st.innerHTML = esc(money(T.bySec[d.dataset.sec] || 0)) + (fx ? ` <small class="usd">${esc(usd((T.bySec[d.dataset.sec] || 0) / fx))}</small>` : ''); d.classList.toggle('z', !(T.bySec[d.dataset.sec] || 0)); });
  // (lote AH) el total general de la cabecera, el resumen y «Por partida» también: antes se buscaba «.bud .total», que la
  // cabecera nueva ya no tiene, y esos montos no cambiaban hasta salir y volver a la pestaña. Solo se rehacen esos bloques:
  // la tabla queda, y con ella el campo que se está escribiendo
  const sts = budgetStats(P, D.sc, D.sem);
  const hd = $('#view .bud .bud-hd'); if (hd) hd.outerHTML = budHeadHTML(T, sts, fx, budEditable());
  const top = $('#view .bud .bud-top'); if (top) top.innerHTML = budTopHTML(T, sts, fx);
}
const fmtV = (f, v) => f === 'rate' ? money(num(v)) : String(v);
Object.assign(ACT, {
  'bu-sync': () => { syncBudget(P, D.sc, D.sem); budLog('Actualizó días y cantidades desde el plan y el desglose'); changed('data'); render(); toast('Días y cantidades actualizados.'); },
  'bu-add': b => { const l = { id: uid('b'), sec: b.dataset.sec, name: 'Nueva línea', qty: 1, unit: 'día', mult: 1, rate: 0, link: null, qlink: null, note: '' }; P.budget.lines.push(l); budLog(`Añadió una línea en «${(BUD_SECTIONS.find(s => s.id === l.sec) || {}).name}»`); const o = ls.get('budOpen', []); if (!o.includes(b.dataset.sec)) ls.set('budOpen', o.concat(b.dataset.sec)); changed('data'); render(); },
  'bu-del': b => { const l = P.budget.lines.find(x => x.id === b.dataset.id); if (l) histNote(`Eliminar «${l.name}»`); P.budget.lines = P.budget.lines.filter(x => x.id !== b.dataset.id); if (l) budLog(`Eliminó «${l.name}» (${money(lineTotal(l))})`); changed('data'); render(); if (l) toastUndo(`«${l.name}» eliminada del presupuesto.`); },
  'bu-note': () => { UI.budNote = false; ls.set('budNote', false); render(); },
  'bu-note-pop': b => popover(b, `<h3 class="hd-poph">Tarifas de ejemplo</h3><p class="hd-popp">Las tarifas de partida son de ejemplo. Reemplázalas por tus cotizaciones; los días se calculan solos desde el plan de rodaje.</p><footer class="hd-popf"><span></span>${hdBtn('pri', 'Entendido', { sm: true, attrs: 'data-x="1"' })}</footer>`,
    p => p.addEventListener('click', e => { if (e.target.closest('[data-x]')) { closePop(); ACT['bu-note'](); } })),
  'bu-lock': () => { BUDS.who = null; render(); toast('Presupuesto bloqueado.'); },
  'bu-protect': () => { if (proGate('budlock')) budProtectDialog(); },
  'bu-addp': () => budPersonDialog(),
  'bu-rmp': b => { const L = P.budget.lock; const p = L.people.find(x => x.id === b.dataset.id); if (!p || L.people.length < 2) return; confirmBox('Quitar acceso', `${esc(p.name)} ya no podrá abrir el presupuesto.`, 'Quitar', () => { L.people = L.people.filter(x => x !== p); budLog('Quitó el acceso a ' + p.name); if (BUDS.who && BUDS.who.id === p.id) BUDS.who = null; changed('data'); render(); }); },
  'bu-unprotect': () => confirmBox('Quitar la protección', 'Cualquier persona que abra este proyecto podrá ver y editar el presupuesto, y los cambios dejarán de registrarse con nombre. El registro hasta hoy se conserva.', 'Quitar la protección', () => { budLog('Quitó la protección del presupuesto'); delete P.budget.lock; BUDS.who = null; changed('data'); render(); }),
});
Object.assign(BIND, {
  bu: (el, ev) => {
    const l = P.budget.lines.find(x => x.id === el.dataset.id);
    if (!l || !budEditable()) return;
    const f = el.dataset.f;
    if (el.dataset.old === undefined) el.dataset.old = String(l[f]);
    if (f === 'name' || f === 'unit') l[f] = el.value;
    else l[f] = num(el.value);
    if (ev === 'change') {
      if (el.dataset.old !== String(l[f])) l.ed = 1;
      if ((f === 'mult' && l.link) || (f === 'qty' && l.qlink)) {
        if (f === 'mult' && /:/.test(l.link)) l.src = l.link;
        l[f === 'mult' ? 'link' : 'qlink'] = null;
        const lab = el.closest('tr') && $('.link', el.closest('tr'));
        if (lab && !linkLabel(l)) lab.remove();
      }
      if (el.dataset.old !== String(l[f])) budLog(`«${f === 'name' ? el.dataset.old : l.name}» · ${BUD_FIELDS[f]}: ${fmtV(f, el.dataset.old)} → ${fmtV(f, l[f])}`);
      delete el.dataset.old;
    }
    changed('data');
    refreshBudgetTotals();
  },
  'bu-cur': el => { const o = P.budget.currency; P.budget.currency = el.value; budLog(`Moneda: ${o} → ${el.value}`); changed('data'); render(); },
  'bu-cont': (el, ev) => { if (el.dataset.old === undefined) el.dataset.old = String(P.budget.contingency); P.budget.contingency = clamp(num(el.value), 0, 100); changed('data'); if (ev === 'change') { if (el.dataset.old !== String(P.budget.contingency)) budLog(`Imprevistos: ${el.dataset.old}% → ${P.budget.contingency}%`); delete el.dataset.old; render(); } else refreshBudgetTotals(); },
  'bu-igv': el => { P.budget.igv = el.checked; budLog(`${el.checked ? 'Activó' : 'Desactivó'} el impuesto (${taxName(P)} ${P.budget.igvRate}%)`); changed('data'); render(); },
  'bu-taxn': (el, ev) => { if (ev !== 'change') return; const o = taxName(P); P.budget.taxName = el.value.trim() || 'IGV'; if (o !== taxName(P)) budLog(`Nombre del impuesto: ${o} → ${taxName(P)}`); changed('data'); render(); },
  'bu-taxr': (el, ev) => { if (ev !== 'change') return; const o = P.budget.igvRate; P.budget.igvRate = clamp(num(el.value), 0, 100); if (o !== P.budget.igvRate) budLog(`${taxName(P)}: ${o}% → ${P.budget.igvRate}%`); changed('data'); render(); },
  'bu-fx': el => { if (el.checked && !proGate('usd')) { el.checked = false; return; } P.budget.fx = { ...(P.budget.fx || { rate: 3.75 }), on: el.checked }; budLog(`${el.checked ? 'Mostró' : 'Ocultó'} los montos en dólares`); changed('data'); render(); },
  'bu-fxr': (el, ev) => { if (ev !== 'change') return; if (!proGate('usd')) { render(); return; } const o = P.budget.fx ? P.budget.fx.rate : 0; P.budget.fx = { ...(P.budget.fx || {}), on: true, rate: Math.max(0, num(el.value)) }; if (o !== P.budget.fx.rate) budLog(`Tipo de cambio: ${o} → ${P.budget.fx.rate} ${P.budget.currency} por dólar`); changed('data'); render(); },
});

/* ---------- ajustes, ayuda y exportar ---------- */
SETTINGS.budget = () => {
  const ed = budEditable(), dis = ed ? '' : 'disabled';
  const cur = P.budget.currency, tn = taxName(P), CURS = ['S/', 'US$', '€', '$', 'COP$', 'MX$', 'CLP$', 'ARS$', 'Bs'];
  return `<div class="grid2"><label class="fld"><span>Moneda</span><select data-bind="bu-cur" ${dis}>${CURS.map(c => `<option ${c === cur ? 'selected' : ''}>${c}</option>`).join('')}${CURS.includes(cur) ? '' : `<option selected>${esc(cur)}</option>`}</select></label>
    <label class="fld"><span>Imprevistos %</span><input type="number" min="0" max="50" value="${ea(P.budget.contingency)}" data-bind="bu-cont" ${dis}></label></div>
    <div class="fld"><label class="opt-in"><input type="checkbox" data-bind="bu-igv" ${P.budget.igv ? 'checked' : ''} ${dis}> Sumar impuesto</label>
      <div class="grid2"><input type="text" value="${esc(tn)}" data-bind="bu-taxn" aria-label="Nombre del impuesto" placeholder="IGV, IVA…" ${dis}><label class="inl"><input type="number" min="0" max="100" step="0.01" value="${ea(P.budget.igvRate)}" data-bind="bu-taxr" aria-label="Porcentaje del impuesto" ${dis}><span>%</span></label></div></div>
    ${cur !== 'US$' ? `<div class="fld"><label class="opt-in"><input type="checkbox" data-bind="bu-fx" ${P.budget.fx && P.budget.fx.on && planAllows('usd') ? 'checked' : ''} ${dis}> Mostrar montos en dólares${planAllows('usd') ? '' : ' <i class="pro-chip">PRO</i>'}</label>
      <label class="inl"><span>1 US$ =</span><input type="number" min="0" step="0.001" value="${ea(P.budget.fx ? P.budget.fx.rate : '')}" data-bind="bu-fxr" aria-label="Tipo de cambio" ${dis}><span>${esc(cur)}</span></label></div>` : ''}
    ${ed && !budProtected() ? `<div class="menu"><hr><button data-act="bu-protect" data-pclose>${ICO.lock} Proteger con código…${planAllows('budlock') ? '' : ' <i class="pro-chip">PRO</i>'}</button></div>` : ''}`;
};
HELP.budget = [
  ['Partidas', 'Abre cada partida para ver sus líneas. Cantidad × días o semanas × tarifa da el total de la línea.'],
  ['Días automáticos', 'Las líneas enlazadas (etiqueta azul) toman sus días del plan de rodaje y del desglose. Pulsa «Actualizar desde plan y desglose» después de cambiar el plan.'],
  ['Moneda, impuesto y dólares', 'En Ajustes («⋯» al final de la barra): moneda, imprevistos, nombre y porcentaje del impuesto, y la columna en dólares con tu tipo de cambio.'],
  ['Protección', 'Ajustes › Proteger con código deja el presupuesto solo para producción. Cada cambio queda registrado con el nombre de quien lo hizo.'],
];
EXPORTS.budget = () => [pdfItem('Presupuesto (PDF)', 'budget', 'Resumen y detalle por partida')];
