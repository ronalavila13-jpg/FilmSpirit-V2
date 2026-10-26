/* ============================================================
   GUION · cerrar el guion final
   Producción cierra el guion con su código de 4 dígitos. Desde ahí:
   · queda de solo lectura para todos, con los números de escena y de página fijos: una escena nueva va con
     letra (12A) y lo que no cabe en su página va en una página con letra (30A); lo que se quita deja la
     página más corta (core.js · layoutScript, con las marcas p.lpg que se ponen al cerrar);
   · se guarda una copia de la versión cerrada (se puede bajar en PDF);
   · para cambiarlo se abre una revisión con su color (azul, rosa, amarillo…): solo las personas
     autorizadas, cada una con su código. Cada párrafo cambiado queda con asterisco del color de la
     revisión y el registro dice quién hizo qué (el equipo recibe el aviso);
   · reabrirlo: solo producción, con su código o con el código de recuperación;
   · el PDF del guion cerrado lleva, si se quiere, el nombre de la persona en cada página (copia numerada).
   Con equipo, quién puede guardar lo decide el servidor (web) o el equipo (escritorio) por la cuenta de cada
   persona (areas.js · scriptLockCheck); el código evita que otra persona use una sesión abierta. Sin equipo
   es una protección dentro del programa.
   Datos: P.meta.lock = { on, at, by, people: [{ id, name, role, mid, s, h, at, adm }], rec: { s, h },
   rev: { c, at, by, date } | null, revs: [{ c, at, end, by, n, sc }], log: [{ t, who, txt }], base: { at, pages, scenes, paras } }
   ============================================================ */
const LOCKS = { pid: null, who: null, fails: 0, until: 0 };
const LOCK_LOG_MAX = 1500;
const LOCK_ROLES = ['Producción', 'Guion', 'Dirección', 'Producción ejecutiva', 'Jefatura de producción', 'Asistencia de dirección', 'Script / continuidad'];
const scriptLock = () => P && P.meta && P.meta.lock && P.meta.lock.on ? P.meta.lock : null;
const lockTeam = () => !!(P && typeof SHARE !== 'undefined' && SHARE && SHARE.pid === P.id && SHARE.me);
const lockSess = () => { if (LOCKS.pid !== (P && P.id)) Object.assign(LOCKS, { pid: P && P.id, who: null, fails: 0, until: 0 }); return LOCKS; };
// la persona de este equipo o cuenta en la lista (con equipo)
const lockMine = () => { const L = scriptLock(); return L && lockTeam() ? (L.people || []).find(p => p && p.mid === SHARE.me.id) || null : null; };
// quién abrió el cierre con su código en esta sesión
const lockWho = () => {
  const L = scriptLock(), S = lockSess(); if (!L || !S.who) return null;
  const p = (L.people || []).find(x => x && x.id === S.who) || null;
  return p && (!lockTeam() || p.mid === SHARE.me.id) ? p : null;
};
const lockAdm = () => { const w = lockWho(); return !!(w && w.adm); };
const lockRevColor = () => { const L = scriptLock(); return L && L.rev ? L.rev.c : null; };
const lockWritable = () => { const L = scriptLock(); return !L || (!!L.rev && !!lockWho()); };
const lockCanClose = () => {
  if (!P || scriptLock() || !P.paras.length || UI.readOnly || P._sample) return false;
  if (lockTeam()) return !SHARE.ro && (SHARE.admin || isProducer(SHARE.me.role)) && canEditSec('guion');
  return edEditableBase();
};
const lkWhen = t => new Date(t).toLocaleString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const lkDay = t => new Date(t).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
const lkCanEnter = () => { const L = scriptLock(); return !!L && (lockTeam() ? !!lockMine() : (L.people || []).some(p => p && p.h)); };
function lkLog(txt) {
  const L = P.meta.lock; if (!L) return;
  const w = lockWho();
  const log = L.log = Array.isArray(L.log) ? L.log : [];
  log.push({ t: Date.now(), who: w ? w.name : lockTeam() ? SHARE.me.name : '', txt });
  if (log.length > LOCK_LOG_MAX) log.splice(0, log.length - LOCK_LOG_MAX);
}
/* después de cerrar, abrir o cerrar una revisión y reabrir: se guarda y no se deshace con Ctrl+Z */
function lkSettle() {
  if (typeof ED !== 'undefined') { ED.undo = []; ED.redo = []; }
  changed('script'); changed('data');
  derive();
  histReset();
  render();
}
const lkBasePara = p => { const o = { t: p.t, x: p.x }; if (p.n) o.n = p.n; if (p.ep) o.ep = p.ep; if (p.r) o.r = p.r; if (p.dur) o.dur = p.dur; return o; };
// el color que sigue al último usado (azul, rosa, amarillo, verde…), como en un rodaje
const lkNextColor = L => { const r = L.rev || (L.revs || [])[(L.revs || []).length - 1]; const i = r ? REV_COLORS.findIndex(c => c[0] === r.c) + 1 : 0; return REV_COLORS[i % REV_COLORS.length][0]; };
/* el color que lleva una página revisada: el de la revisión más nueva de sus párrafos */
function lkRevOrder() { const L = scriptLock(); if (!L) return null; const o = (L.revs || []).map(r => r.c); if (L.rev) o.push(L.rev.c); return o; }
function lkRevInfo(c) {
  const L = scriptLock(); if (!L) return null;
  if (L.rev && L.rev.c === c) return L.rev;
  return (L.revs || []).slice().reverse().find(r => r.c === c) || null;
}

/* ---------- código: entrar, crear el propio, recuperar ---------- */
async function lkCheckPin(pin) {
  const L = scriptLock(); if (!L) return null;
  const S = lockSess();
  if (Date.now() < S.until) return 'wait';
  let who = null;
  if (lockTeam()) { const me = lockMine(); if (me && me.h && await pinHash(pin, me.s) === me.h) who = me; }
  else for (const p of L.people || []) if (p && p.h && await pinHash(pin, p.s) === p.h) { who = p; break; }
  if (!who) { S.fails++; if (S.fails >= 5) { S.until = Date.now() + 30000; S.fails = 0; } await new Promise(r => setTimeout(r, 700)); return null; }
  S.fails = 0; S.who = who.id;
  return who;
}
function lkEnter(then) {
  const L = scriptLock(); if (!L) return;
  const me = lockMine();
  if (lockTeam() && !me) { toast('Producción no te autorizó a revisar el guion cerrado.'); return; }
  const create = lockTeam() && !me.h;
  const m = modal({
    title: create ? 'Crea tu código' : 'Tu código',
    body: `<p style="margin:0">${create ? `Producción te autorizó a revisar el guion cerrado. Crea tu código de 4 dígitos: lo pedirá cada vez que abras una revisión y tus cambios quedarán a nombre de <b>${esc(SHARE.me.name)}</b>.` : lockTeam() ? `Escribe tu código de 4 dígitos, ${esc(SHARE.me.name)}.` : 'Escribe tu código de 4 dígitos: los cambios quedan en el registro con tu nombre.'}</p>
      <form id="lkF" class="bl-form" autocomplete="off" style="justify-content:flex-start"><input id="lkP" class="pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" aria-label="Código de 4 dígitos">
      ${create ? '<input id="lkP2" class="pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••" aria-label="Repite el código">' : ''}<button class="btn primary" type="submit">${create ? 'Crear y entrar' : 'Entrar'}</button></form>
      <p class="bl-err" id="lkE" role="alert" hidden></p>
      ${create ? '' : '<button class="linkbtn" type="button" id="lkForgot">¿Olvidaste tu código?</button>'}`,
    onMount: m => {
      const err = t => { const e = $('#lkE', m); e.textContent = t; e.hidden = !t; };
      $('#lkF', m).onsubmit = async e => {
        e.preventDefault();
        const pin = $('#lkP', m).value.trim();
        if (!pinOk(pin)) { err('El código tiene 4 dígitos.'); return; }
        const b = $('button[type=submit]', m); b.disabled = true;
        try {
          if (create) {
            if ($('#lkP2', m).value.trim() !== pin) { err('Los dos códigos no coinciden.'); return; }
            me.s = newSalt(); me.h = await pinHash(pin, me.s); me.at = Date.now();
            lockSess().who = me.id;
            changed('script'); changed('data');
          } else {
            const w = await lkCheckPin(pin);
            if (w === 'wait') { err('Demasiados intentos. Espera unos segundos.'); return; }
            if (!w) { err('Código incorrecto.'); $('#lkP', m).select(); return; }
          }
          closeModal(); render();
          if (then) then(); else lkPanel();
        } finally { b.disabled = false; }
      };
      const fg = $('#lkForgot', m); if (fg) fg.onclick = () => lkForgot();
      setTimeout(() => { const i = $('#lkP', m); if (i) i.focus(); }, 30);
    },
  });
  return m;
}
function lkForgot() {
  const L = scriptLock(); if (!L) return;
  const me = lockMine();
  if (lockTeam() && me && !me.adm) {
    modal({ title: 'Código olvidado', body: '<p style="margin:0">Pídele a producción que restablezca tu código desde «Guion cerrado». La próxima vez que entres crearás uno nuevo.</p>', foot: '<button class="btn primary" data-close>Entendido</button>' });
    return;
  }
  const list = lockTeam() ? [me] : (L.people || []).filter(p => p && p.h);
  const m = modal({
    title: 'Poner un código nuevo',
    body: `<label class="fld"><span>Código de recuperación</span><input type="text" id="lrC" placeholder="XXXXX-XXXXX" autocomplete="off" style="text-transform:uppercase"></label>
      ${list.length > 1 ? `<label class="fld"><span>Persona</span><select id="lrW">${list.map(p => `<option value="${ea(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>` : ''}
      <div class="grid2"><label class="fld"><span>Código nuevo</span><input type="password" inputmode="numeric" maxlength="4" id="lrP" class="pin"></label>
      <label class="fld"><span>Repite el código</span><input type="password" inputmode="numeric" maxlength="4" id="lrP2" class="pin"></label></div><p class="bl-err" id="lrE" hidden></p>
      <p class="hint" style="margin:0">El código de recuperación se mostró una sola vez, al cerrar el guion.</p>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="lrOk">Cambiar código</button>',
  });
  $('#lrOk', m).onclick = async () => {
    const c = $('#lrC', m).value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), a = $('#lrP', m).value.trim(), b = $('#lrP2', m).value.trim();
    const fail = t => { const e = $('#lrE', m); e.textContent = t; e.hidden = false; };
    if (!pinOk(a) || a !== b) return fail('Escribe dos veces el mismo código de 4 dígitos.');
    const S = lockSess();
    if (Date.now() < S.until) return fail('Demasiados intentos. Espera unos segundos.');
    if (!L.rec || await pinHash(c, L.rec.s) !== L.rec.h) { S.fails++; if (S.fails >= 5) { S.until = Date.now() + 30000; S.fails = 0; } await new Promise(r => setTimeout(r, 700)); return fail('El código de recuperación no es correcto.'); }
    const sel = $('#lrW', m), p = sel ? list.find(x => x.id === sel.value) : list[0];
    if (!p) return;
    p.s = newSalt(); p.h = await pinHash(a, p.s); p.at = Date.now();
    S.who = p.id; S.fails = 0;
    lkLog('Puso un código nuevo con el código de recuperación');
    closeModal(); changed('script'); changed('data'); render(); toast('Código nuevo listo.'); lkPanel();
  };
}
function lkShowRecovery(code) {
  modal({
    title: 'Guion cerrado · código de recuperación',
    body: `<p style="margin:0">Guárdalo en un lugar seguro. Sirve para poner un código nuevo si alguien de producción olvida el suyo y para reabrir el guion. No se vuelve a mostrar.</p>
      <div class="rec-code" style="font-size:22px;text-align:center;padding:10px">${esc(code)}</div>`,
    foot: '<button class="btn primary" data-close>Ya lo guardé</button>',
    keep: true,
  });
}

/* ---------- cerrar el guion ---------- */
// una persona del equipo en la lista (adm solo si es true: así queda igual a como la deja sanitizeLock)
const lkMember = (x, t) => { const o = { id: uid('lk'), name: x.name || '', role: x.role || '', mid: x.id, at: t }; if (x.owner || isProducer(x.role)) o.adm = true; return o; };
// en el equipo de escritorio no hay servidor que compare con la versión anterior: para revisar hace falta poder editar el guion
const lkNeedsEdit = x => lockTeam() && !API() && !x.owner && !(x.perms && x.perms.guion === 'editar');
const lkDefaultOn = x => !!(x.owner || isProducer(x.role) || x.role === 'Dirección' || x.role === 'Guion' || (x.perms && x.perms.guion === 'editar'));
function lkCloseDialog() {
  if (!lockCanClose()) return;
  const team = lockTeam();
  const st = scriptStats();
  const members = team ? (SHARE.members || []).filter(x => x && x.id && !x.pending && !String(x.id).startsWith('inv:')) : [];
  const names = (P.meta.producers || []).map(x => typeof x === 'string' ? x : x && x.name).filter(Boolean);
  const m = modal({
    title: 'Cerrar el guion final',
    wide: team,
    body: `<ul class="lk-list">
        <li><b>Queda de solo lectura</b> para todos. Para cambiarlo se abre una revisión con color (azul, rosa, amarillo…), como en un rodaje.</li>
        <li><b>Los números no se mueven:</b> las ${st.scenes} escenas y las ${st.pages} páginas quedan fijas. Una escena nueva va con letra (12A) y lo que no cabe, en una página con letra (30A).</li>
        <li><b>Se guarda una copia</b> de esta versión y cada cambio queda en el registro con el nombre de quien lo hizo.</li>
        <li>Solo producción puede reabrirlo, con su código o con el código de recuperación.</li></ul>
      ${team ? '' : `<div class="grid2"><label class="fld"><span>Tu nombre</span><input type="text" id="lcN" value="${esc(names[0] || '')}" list="lcNames" placeholder="Productor/a"></label><datalist id="lcNames">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        <label class="fld"><span>Cargo</span><select id="lcR">${LOCK_ROLES.map(r => `<option ${r === 'Producción' ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label></div>`}
      <div class="lk-pins"><label class="fld"><span>${team ? 'Tu código' : 'Código'} de 4 dígitos</span><input type="password" inputmode="numeric" maxlength="4" id="lcP" class="pin"></label>
      <label class="fld"><span>Repite el código</span><input type="password" inputmode="numeric" maxlength="4" id="lcP2" class="pin"></label></div>
      ${team ? `<div class="fld"><span>Pueden abrir revisiones</span><div class="lk-mem">${members.map(x => `<label class="opt-in"><input type="checkbox" data-mid="${ea(x.id)}" ${x.id === SHARE.me.id || x.owner ? 'checked disabled' : lkNeedsEdit(x) ? 'disabled' : lkDefaultOn(x) ? 'checked' : ''}> ${esc(x.name)} <span class="hint">${esc(x.role || '')}${x.owner ? ' · administra' : lkNeedsEdit(x) ? ' · necesita permiso para editar el guion' : ''}</span></label>`).join('')}</div>
        <span class="hint">Cada persona crea su propio código la primera vez que abre una revisión. Puedes cambiar la lista después.${!API() ? ' En el equipo de escritorio, quien revisa necesita permiso para editar el guion (en <i>Equipo y permisos</i>).' : ''}</span></div>`
      : '<p class="hint" style="margin:0">Después agregas a Guion y Dirección, cada persona con su código.</p>'}
      <p class="bl-err" id="lcE" hidden></p>
      <p class="hint" style="margin:0">${team ? 'Quién puede guardar cambios lo controla ' + (API() ? 'el servidor' : 'el equipo') + ' por la cuenta de cada persona; el código evita que otra persona use una sesión abierta.' : 'Es una protección dentro del programa: con una copia del archivo y conocimientos técnicos se podría saltar. Para que solo cambien el guion quienes deben, compártelo con el equipo.'}</p>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="lcOk">' + ICO.lock + ' Cerrar guion</button>',
  });
  $('#lcOk', m).onclick = async () => {
    const pin = $('#lcP', m).value.trim(), pin2 = $('#lcP2', m).value.trim();
    const name = team ? SHARE.me.name : $('#lcN', m).value.trim(), role = team ? SHARE.me.role || 'Producción' : $('#lcR', m).value;
    const bad = !name ? 'Escribe tu nombre.' : !pinOk(pin) ? 'El código tiene 4 dígitos.' : pin !== pin2 ? 'Los dos códigos no coinciden.' : '';
    if (bad) { const e = $('#lcE', m); e.textContent = bad; e.hidden = false; return; }
    const chosen = team ? members.filter(x => { const c = $(`input[data-mid="${CSS.escape(x.id)}"]`, m); return c && c.checked; }) : [];
    $('#lcOk', m).disabled = true;
    closeModal();
    await lkDoClose({ name, role, pin, members: chosen });
  };
}
async function lkDoClose({ name, role, pin, members }) {
  if (UI.scriptEdit && typeof edDerive === 'function') edDerive();
  edLockKeys(); edFixKeys();
  for (const p of P.paras) { delete p.rv; delete p.lpg; }
  if (P.rev) P.rev.on = false;
  // cada página guarda dónde empieza (en el guion AV no hay páginas fijas)
  const pages = layoutScript(P.paras);
  if (edFormat() !== 'av') pages.forEach((pg, pi) => { const l = pg.find(x => !x.blank); if (!l) return; const p = P.paras[l.p]; (p.lpg = p.lpg || []).push([l.o, String(pi + 1)]); });
  const t = Date.now(), s = newSalt(), rc = recCode(), rs = newSalt();
  const me = { id: uid('lk'), name, role, s, h: await pinHash(pin, s), at: t, adm: true };
  const people = [me];
  if (lockTeam()) {
    me.mid = SHARE.me.id;
    for (const x of members) if (x.id !== SHARE.me.id) people.push(lkMember(x, t));
  }
  const sc = computeScenes(P.paras), prev = P.meta.lock || {};
  P.meta.lock = {
    on: true, at: t, by: name, people, rec: { s: rs, h: await pinHash(rc.replace('-', ''), rs) }, rev: null, revs: [],
    log: Array.isArray(prev.log) ? prev.log.slice(-(LOCK_LOG_MAX - 1)) : [],
    base: { at: t, pages: pages.length, scenes: sc.scenes.length, paras: P.paras.map(lkBasePara) },
  };
  Object.assign(lockSess(), { who: me.id });
  lkLog(`Cerró el guion final: ${pages.length} ${pages.length === 1 ? 'página' : 'páginas'}, ${sc.scenes.length} ${sc.scenes.length === 1 ? 'escena' : 'escenas'}`);
  lkSettle();
  lkShowRecovery(rc);
}

/* ---------- revisiones ---------- */
function lkRevOpen(c) {
  const L = scriptLock(), w = lockWho(); if (!L || !w || L.rev) return;
  c = REV_COLORS.some(x => x[0] === c) ? c : lkNextColor(L);
  L.rev = { c, at: Date.now(), by: w.name, date: localISO() };
  lkLog(`Abrió la revisión ${revName(c).toLowerCase()}`);
  lkSettle();
  if (UI.tab !== 'script') setTab('script');   // se escribe en la pestaña Guion
  toast(`Revisión ${revName(c).toLowerCase()} abierta: cada párrafo que cambies queda con un asterisco.`, 4500);
}
function lkRevClose() {
  const L = scriptLock(), w = lockWho(); if (!L || !w || !L.rev) return;
  edDerive();
  edFixKeys();
  const c = L.rev.c, sc = computeScenes(P.paras);
  const n = P.paras.filter(p => p.rv === c).length;
  const keys = [...new Set(P.paras.map((p, i) => p.rv === c ? sc.sceneOf[i] : -1).filter(x => x >= 0))].map(i => sc.scenes[i].key);
  L.revs = Array.isArray(L.revs) ? L.revs : [];
  const nm = revName(c).toLowerCase();
  // una revisión sin cambios no gasta su color
  if (n) L.revs.push({ c, at: L.rev.at, end: Date.now(), by: L.rev.by, n, sc: keys.slice(0, 60) });
  lkLog(n ? `Cerró la revisión ${nm}: ${n} ${n === 1 ? 'párrafo cambiado' : 'párrafos cambiados'}${keys.length ? ` (${keys.length === 1 ? 'escena' : 'escenas'} ${keys.slice(0, 12).join(', ')}${keys.length > 12 ? '…' : ''})` : ''}` : `Cerró la revisión ${nm} sin cambios`);
  L.rev = null;
  lkSettle();
  toast(`Revisión ${nm} cerrada. El guion vuelve a estar cerrado.`, 4000);
}

/* ---------- personas autorizadas (producción) ---------- */
function lkAddDialog() {
  const L = scriptLock(); if (!L || !lockAdm()) return;
  if (lockTeam()) {
    const inList = new Set((L.people || []).map(p => p.mid));
    const rest = (SHARE.members || []).filter(x => x && x.id && !x.pending && !String(x.id).startsWith('inv:') && !inList.has(x.id));
    if (!rest.length) { toast('Todas las personas del equipo ya están autorizadas.'); return; }
    const m = modal({
      title: 'Autorizar a revisar',
      body: `<div class="lk-mem">${rest.map(x => `<label class="opt-in"><input type="checkbox" data-mid="${ea(x.id)}" ${lkNeedsEdit(x) ? 'disabled' : ''}> ${esc(x.name)} <span class="hint">${esc(x.role || '')}${lkNeedsEdit(x) ? ' · necesita permiso para editar el guion' : ''}</span></label>`).join('')}</div>
        <p class="hint" style="margin:0">Cada persona crea su código la primera vez que abre una revisión.</p>`,
      foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="laOk">Autorizar</button>',
    });
    $('#laOk', m).onclick = () => {
      const add = rest.filter(x => { const c = $(`input[data-mid="${CSS.escape(x.id)}"]`, m); return c && c.checked; });
      if (!add.length) { closeModal(); return; }
      for (const x of add) L.people.push(lkMember(x, Date.now()));
      lkLog('Autorizó a revisar a ' + add.map(x => x.name).join(', '));
      closeModal(); changed('script'); changed('data'); render(); lkPanel();
    };
    return;
  }
  const m = modal({
    title: 'Autorizar a revisar',
    body: `<p style="margin:0">La persona escribe su propio código. Con él abrirá revisiones y sus cambios quedarán a su nombre.</p>
      <div class="grid2"><label class="fld"><span>Nombre</span><input type="text" id="laN" placeholder="Guionista, director/a…"></label>
      <label class="fld"><span>Cargo</span><select id="laR">${LOCK_ROLES.map(r => `<option ${r === 'Guion' ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label></div>
      <div class="grid2"><label class="fld"><span>Su código de 4 dígitos</span><input type="password" inputmode="numeric" maxlength="4" id="laP" class="pin"></label>
      <label class="fld"><span>Repite el código</span><input type="password" inputmode="numeric" maxlength="4" id="laP2" class="pin"></label></div><p class="bl-err" id="laE" hidden></p>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="laOk">Autorizar</button>',
  });
  $('#laOk', m).onclick = async () => {
    const n = $('#laN', m).value.trim(), r = $('#laR', m).value, a = $('#laP', m).value.trim(), b = $('#laP2', m).value.trim();
    let bad = !n ? 'Escribe el nombre.' : !pinOk(a) ? 'El código tiene 4 dígitos.' : a !== b ? 'Los dos códigos no coinciden.' : '';
    if (!bad) for (const p of L.people) if (p.h && await pinHash(a, p.s) === p.h) { bad = 'Ese código ya lo usa otra persona: elige otro.'; break; }
    if (bad) { const e = $('#laE', m); e.textContent = bad; e.hidden = false; return; }
    const s = newSalt();
    const np = { id: uid('lk'), name: n, role: r, s, h: await pinHash(a, s), at: Date.now() };
    if (isProducer(r)) np.adm = true;
    L.people.push(np);
    lkLog(`Autorizó a revisar a ${n} (${r})`);
    closeModal(); changed('script'); changed('data'); render(); lkPanel();
  };
}
function lkRemove(id) {
  const L = scriptLock(); if (!L || !lockAdm()) return;
  const p = L.people.find(x => x.id === id); if (!p) return;
  if (p.adm && L.people.filter(x => x.adm).length < 2) { toast('Tiene que quedar al menos una persona de producción.'); return; }
  confirmBox('Quitar la autorización', `${esc(p.name)} ya no podrá abrir revisiones del guion cerrado.`, 'Quitar', () => {
    L.people = L.people.filter(x => x !== p);
    if (lockSess().who === p.id) LOCKS.who = null;
    lkLog('Quitó la autorización a ' + p.name);
    changed('script'); changed('data'); render(); lkPanel();
  });
}
function lkResetCode(id) {
  const L = scriptLock(); if (!L || !lockAdm()) return;
  const p = L.people.find(x => x.id === id); if (!p) return;
  if (lockTeam()) {
    confirmBox('Restablecer el código', `${esc(p.name)} creará un código nuevo la próxima vez que entre.`, 'Restablecer', () => {
      delete p.s; delete p.h; p.at = Date.now();
      lkLog('Restableció el código de ' + p.name);
      changed('script'); changed('data'); render(); lkPanel();
    }, false);
    return;
  }
  const m = modal({
    title: 'Código nuevo para ' + p.name,
    body: `<div class="grid2"><label class="fld"><span>Código nuevo</span><input type="password" inputmode="numeric" maxlength="4" id="lnP" class="pin"></label>
      <label class="fld"><span>Repite el código</span><input type="password" inputmode="numeric" maxlength="4" id="lnP2" class="pin"></label></div><p class="bl-err" id="lnE" hidden></p>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="lnOk">Cambiar código</button>',
  });
  $('#lnOk', m).onclick = async () => {
    const a = $('#lnP', m).value.trim(), b = $('#lnP2', m).value.trim();
    let bad = !pinOk(a) || a !== b ? 'Escribe dos veces el mismo código de 4 dígitos.' : '';
    if (!bad) for (const q of L.people) if (q !== p && q.h && await pinHash(a, q.s) === q.h) { bad = 'Ese código ya lo usa otra persona: elige otro.'; break; }
    if (bad) { const e = $('#lnE', m); e.textContent = bad; e.hidden = false; return; }
    p.s = newSalt(); p.h = await pinHash(a, p.s); p.at = Date.now();
    lkLog('Cambió el código de ' + p.name);
    closeModal(); changed('script'); changed('data'); render(); lkPanel();
  };
}
/* reabrir: con el código de nuevo (o el de recuperación) */
function lkReopenDialog() {
  const L = scriptLock(); if (!L || !lockAdm()) return;
  const m = modal({
    title: 'Reabrir el guion',
    body: `<p style="margin:0">El guion vuelve a editarse libremente y las páginas se acomodan otra vez solas (desaparecen las páginas con letra). Los números de escena y los asteriscos se conservan; el registro también.</p>
      <label class="fld"><span>Tu código o el código de recuperación</span><input type="password" id="loP" autocomplete="off" placeholder="•••• o XXXXX-XXXXX"></label><p class="bl-err" id="loE" hidden></p>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn danger" id="loOk">Reabrir el guion</button>',
  });
  $('#loOk', m).onclick = async () => {
    const v = $('#loP', m).value.trim(), w = lockWho();
    const fail = t => { const e = $('#loE', m); e.textContent = t; e.hidden = false; };
    const S = lockSess();
    if (Date.now() < S.until) return fail('Demasiados intentos. Espera unos segundos.');
    const ok = (pinOk(v) && w && w.h && await pinHash(v, w.s) === w.h) || (L.rec && await pinHash(v.toUpperCase().replace(/[^A-Z0-9]/g, ''), L.rec.s) === L.rec.h);
    if (!ok) { S.fails++; if (S.fails >= 5) { S.until = Date.now() + 30000; S.fails = 0; } await new Promise(r => setTimeout(r, 700)); return fail('El código no es correcto.'); }
    closeModal();
    if (L.rev) lkRevClose();
    for (const p of P.paras) delete p.lpg;
    lkLog('Reabrió el guion');
    L.on = false; L.rev = null; L.reopened = { at: Date.now(), by: w ? w.name : '' };
    LOCKS.who = null;
    lkSettle();
    toast('Guion reabierto: se edita libremente.');
  };
}

/* ---------- panel «Guion cerrado» ---------- */
function lkPanel() {
  const L = scriptLock(); if (!L) return;
  const w = lockWho(), adm = lockAdm(), team = lockTeam();
  const revs = (L.revs || []).slice().reverse();
  const chip = (c, txt) => `<span class="lk-rv" style="--c:${ea(revColor(c))}">${esc(txt)}</span>`;
  const person = p => `<span class="chip">${esc(p.name)}<span class="hint">${esc(p.role || '')}${p.adm ? ' · reabre' : ''}${w && w.id === p.id ? ' · tú' : ''}${team && !p.h ? ' · sin código aún' : ''}</span>${adm && w.id !== p.id ? ` <button class="linkbtn" data-lk="reset" data-id="${ea(p.id)}">código</button> <button class="linkbtn" data-lk="rm" data-id="${ea(p.id)}" aria-label="Quitar a ${esc(p.name)}">quitar</button>` : ''}</span>`;
  const log = (L.log || []).slice().reverse();
  const act = !w
    ? (lkCanEnter() ? '<button class="btn primary" data-lk="enter">Abrir revisión con mi código</button>' : `<p class="hint" style="margin:0">${team ? 'Producción no te autorizó a revisar el guion.' : 'Solo las personas autorizadas pueden abrir revisiones.'}</p>`)
    : L.rev
      ? `<button class="btn" data-lk="edit">Seguir revisando</button><button class="btn primary" data-lk="revclose">Cerrar la revisión ${esc(revName(L.rev.c).toLowerCase())}</button>`
      : `<label class="lk-col"><span class="hint">Color</span><select id="lkC" aria-label="Color de la revisión">${REV_COLORS.map(([k, n]) => `<option value="${k}" ${k === lkNextColor(L) ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button class="btn primary" data-lk="revopen">Abrir revisión</button>`;
  const m = modal({
    title: 'Guion cerrado',
    wide: true,
    body: `<div class="lk-head"><span class="lk-ico" aria-hidden="true">${ICO.lock}</span><div><b>Guion final cerrado el ${esc(lkDay(L.at))}</b><span class="hint">por ${esc(L.by || '—')} · ${L.base ? `${L.base.pages} págs. · ${L.base.scenes} escenas al cerrar` : ''}</span></div></div>
      ${L.rev ? `<p class="lk-now" style="--c:${ea(revColor(L.rev.c))}"><b>Revisión ${esc(revName(L.rev.c).toLowerCase())} abierta</b> desde el ${esc(revDate(L.rev.date))} por ${esc(L.rev.by || '')}. Cada párrafo que cambie queda con un asterisco de este color.</p>` : '<p class="hint" style="margin:0">Nadie puede cambiar el texto sin abrir una revisión.</p>'}
      <div class="lk-acts">${act}${w ? `<span class="grow"></span><span class="bud-who">${esc(w.name)}</span><button class="btn ghost sm" data-lk="lock" title="Olvida tu código en esta sesión">Salir</button>` : ''}</div>
      ${revs.length ? `<div class="fld"><span>Revisiones</span><div class="lk-revs">${revs.map(r => `<div>${chip(r.c, revName(r.c))}<span class="tnum">${esc(lkDay(r.end || r.at))}</span><span>${esc(r.by || '')}</span><span class="hint">${r.n} ${r.n === 1 ? 'párrafo' : 'párrafos'}${r.sc && r.sc.length ? ' · esc. ' + esc(r.sc.slice(0, 8).join(', ')) + (r.sc.length > 8 ? '…' : '') : ''}</span></div>`).join('')}</div></div>` : ''}
      <div class="fld"><span>Pueden abrir revisiones</span><div class="bud-people">${(L.people || []).map(person).join('')}${adm ? '<button class="btn sm" data-lk="add">+ Autorizar</button>' : ''}</div></div>
      <div class="lk-acts"><button class="btn sm" data-lk="pdf">Bajar la versión cerrada (PDF)</button>${adm ? '<span class="grow"></span><button class="btn sm ghost" data-lk="reopen">Reabrir el guion…</button>' : ''}</div>
      <details class="sec"><summary>Registro<span class="count">${log.length}</span></summary>
        ${log.length ? `<div class="bud-log">${log.slice(0, 300).map(x => `<div><span class="t">${esc(lkWhen(x.t))}</span><b>${esc(x.who || '—')}</b><span>${esc(x.txt)}</span></div>`).join('')}</div>` : '<p class="hint">Sin cambios todavía.</p>'}</details>
      <p class="hint" style="margin:0">${team ? 'Quién puede guardar cambios lo controla ' + (API() ? 'el servidor' : 'el equipo') + ' por la cuenta de cada persona; el código evita que otra persona use una sesión abierta.' : 'Es una protección dentro del programa: con una copia del archivo y conocimientos técnicos se podría saltar.'}</p>`,
    foot: '<button class="btn primary" data-close>Listo</button>',
    onMount: m => m.addEventListener('click', e => {
      const b = e.target.closest('[data-lk]'); if (!b) return;
      const k = b.dataset.lk;
      if (k === 'enter') { closeModal(); lkEnter(); }
      if (k === 'revopen') { const c = $('#lkC', m).value; closeModal(); lkRevOpen(c); }
      if (k === 'revclose') { closeModal(); confirmBox('Cerrar la revisión', 'El guion vuelve a quedar cerrado. Los asteriscos de esta revisión se quedan en el guion y en el PDF.', 'Cerrar la revisión', () => lkRevClose(), false); }
      if (k === 'edit') { closeModal(); setTab('script'); }
      if (k === 'lock') { LOCKS.who = null; closeModal(); render(); toast('Saliste: para revisar hará falta tu código.'); }
      if (k === 'add') { closeModal(); lkAddDialog(); }
      if (k === 'rm') lkRemove(b.dataset.id);
      if (k === 'reset') { closeModal(); lkResetCode(b.dataset.id); }
      if (k === 'reopen') { closeModal(); lkReopenDialog(); }
      if (k === 'pdf') { closeModal(); exportPDF('screenplay', null, { base: true }); }
    }),
  });
  return m;
}
/* en la barra del guion: el candado (y el color de la revisión abierta) */
function lockChipHTML() {
  const L = scriptLock(); if (!L) return '';
  return `<button class="btn lk-chip${ea(L.rev ? ' on' : '')}" data-act="lk-panel" style="--c:${ea(L.rev ? revColor(L.rev.c) : 'transparent')}" title="Guion cerrado: revisiones, quién puede cambiarlo y registro">${ICO.lock}<span>${L.rev ? 'Revisión ' + esc(revName(L.rev.c).toLowerCase()) : 'Guion cerrado'}</span></button>`;
}
/* en el panel de revisión (modo Escribir): el guion final */
function revLockHTML() {
  const L = scriptLock();
  if (L) return `<p class="hint" style="margin:0">Guion cerrado el ${esc(lkDay(L.at))}${L.rev ? `. Revisión ${esc(revName(L.rev.c).toLowerCase())} abierta por ${esc(L.rev.by || '')}.` : '.'}</p>
    <div class="rv-row">${L.rev && lockWho() ? `<button class="btn sm primary" data-act="lk-revclose">Cerrar la revisión</button>` : ''}<button class="btn sm" data-act="lk-panel">Guion cerrado…</button></div>`;
  return `<p class="hint" style="margin:0">Al terminar el guion, ciérralo: queda de solo lectura con los números de escena y de página fijos, y los cambios se hacen en revisiones de color.</p>
    ${lockCanClose() ? '<button class="btn sm" data-act="lk-close">' + ICO.lock + ' Cerrar el guion final…</button>' : ''}`;
}

/* ---------- PDF del guion cerrado: copia con nombre y versión cerrada ---------- */
function lkCopyDialog(kind, btn, opts) {
  const L = scriptLock(); if (!L) return;
  const team = lockTeam(), fixed = team && !SHARE.admin && !lockAdm() && !isProducer(SHARE.me.role);
  const who = team ? SHARE.me.name : (lockWho() || {}).name || '';
  const base = !!(opts && opts.base);
  const m = modal({
    title: base ? 'Versión cerrada del guion' : 'Copia del guion cerrado',
    body: `<p style="margin:0">${base ? `El guion tal como se cerró el ${esc(lkDay(L.at))}, sin las revisiones.` : 'Cada copia puede llevar el nombre de quien la recibe en todas las páginas: así se sabe de quién es una copia que circula.'}</p>
      <label class="fld"><span>Copia para</span><input type="text" id="lpN" value="${esc(who)}" placeholder="Nombre de quien la recibe" ${fixed ? 'readonly' : ''}></label>
      <label class="opt-in"><input type="checkbox" id="lpM" ${ls.get('lkMark', true) || fixed ? 'checked' : ''} ${fixed ? 'disabled' : ''}> Su nombre en cada página (marca de agua)</label>
      ${fixed ? '<p class="hint" style="margin:0">Las copias del guion cerrado llevan tu nombre.</p>' : ''}`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="lpOk">Exportar PDF</button>',
  });
  $('#lpOk', m).onclick = () => {
    const name = $('#lpN', m).value.trim(), mark = fixed || $('#lpM', m).checked;
    if (mark && !name) { $('#lpN', m).focus(); toast('Escribe el nombre de quien recibe la copia.'); return; }
    if (!fixed) ls.set('lkMark', $('#lpM', m).checked);
    closeModal();
    if (name) { L.log = Array.isArray(L.log) ? L.log : []; lkLog(`Exportó ${base ? 'la versión cerrada' : 'una copia'} en PDF${name ? ' para ' + name : ''}${mark ? ' (con su nombre)' : ''}`); changed('script'); changed('data'); }
    exportPDF(kind, btn, { ...(opts || {}), copy: { name, mark } });
  };
}
/* arma el PDF con la versión cerrada (sin tocar el guion de ahora) */
function lkWithBase(fn) {
  const L = scriptLock(); if (!L || !L.base || !Array.isArray(L.base.paras)) return fn();
  const paras = L.base.paras.map(p => ({ ...p }));
  const sc = computeScenes(paras), pages = layoutScript(paras), pos = new Array(paras.length);
  pages.forEach((pg, pi) => pg.forEach((ln, li) => {
    if (ln.blank) return;
    for (const pp of ln.p2 != null ? [ln.p, ln.p2] : [ln.p]) { const q = pos[pp]; if (!q) pos[pp] = { pg0: pi, li0: li, pg1: pi, li1: li }; else { q.pg1 = pi; q.li1 = li; } }
  }));
  const keep = P.paras, D0 = D;
  P.paras = paras; D = { ...D0, sc, pages, pos, metrics: sceneMetrics(paras, pages, sc) };
  LOCKS.base = true;
  try { return fn(); } finally { P.paras = keep; D = D0; LOCKS.base = false; }
}
function pdfCopyMark(doc, name) {
  const n = doc.getNumberOfPages(), when = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: .09 })); } catch (e) { }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.min(44, 900 / Math.max(10, name.length + 9))); doc.setTextColor(30, 32, 36);
    doc.text(pdfSafe('COPIA DE ' + name.toUpperCase()), W / 2, H / 2 + 40, { align: 'center', angle: 32 });
    try { doc.restoreGraphicsState(); } catch (e) { }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 124, 130);
    doc.text(pdfSafe(`Copia de ${name} · ${when} · No distribuir`), W / 2, H - 22, { align: 'center' });
  }
  doc.setTextColor(0, 0, 0);
}

ACT['lk-panel'] = () => lkPanel();
ACT['lk-close'] = () => lkCloseDialog();
ACT['lk-revclose'] = () => confirmBox('Cerrar la revisión', 'El guion vuelve a quedar cerrado. Los asteriscos de esta revisión se quedan en el guion y en el PDF.', 'Cerrar la revisión', () => lkRevClose(), false);
