/* ============================================================
   INICIO · los proyectos, del último que abriste al primero
   Al entrar a la app se ve Inicio (salvo que llegues con el enlace de un proyecto o abras un
   archivo). Cada proyecto se abre donde lo dejaste: la misma pestaña y la misma escena; un guion
   (web con cuentas, plan Guion) siempre en el guion. El logo de la barra vuelve a Inicio.
   También aquí: el botón «Nuevo» (Guion / Proyecto) y «Mis guiones» de la pestaña Guion.
   ============================================================ */
/* dónde quedó cada proyecto en este navegador: { pid: { t (abierto), tab, scene, sb, call, sup } } */
const RECENT_MAX = 300;
const recentAll = () => ls.get('recent', {}) || {};
function recentPut(pid, o) {
  const R = recentAll();
  R[pid] = { ...(R[pid] || {}), ...o };
  const ids = Object.keys(R);
  if (ids.length > RECENT_MAX) ids.sort((a, b) => (R[a].t || 0) - (R[b].t || 0)).slice(0, ids.length - RECENT_MAX).forEach(k => delete R[k]);
  ls.set('recent', R);
}
const posKeep = () => !!(P && P.id && P._saved && !P._sample);
/* recargar sin perder el lugar: esta pestaña del navegador recuerda qué proyecto tenía abierto y cuánto había bajado
   en la vista (sessionStorage dura mientras la pestaña esté abierta, también al recargar con F5 o Ctrl + Mayús + R y
   al llegar una versión nueva). Al recargar se vuelve ahí, no a Inicio; desde Inicio, se recarga en Inicio. */
const HERE_K = 'filmspirit:here';
const hereGet = () => { try { const o = JSON.parse(sessionStorage.getItem(HERE_K) || 'null'); return o && typeof o.pid === 'string' ? o : null; } catch (e) { return null; } };
const hereSet = o => { try { if (o) sessionStorage.setItem(HERE_K, JSON.stringify(o)); else sessionStorage.removeItem(HERE_K); } catch (e) { } };
/* después de cada pintada: la pestaña y la escena (sin escribir a cada rato) */
const posNow = () => {
  if (!posKeep() || document.body.classList.contains('home')) return;
  recentPut(P.id, { t: Date.now(), tab: UI.tab, scene: UI.scene, sk: D.sc.scenes[UI.scene] ? D.sc.scenes[UI.scene].key : '', sb: UI.sbScene || '', call: UI.callDay || 0, sup: UI.supDay });
  hereSet({ pid: P.id, tab: UI.tab, sc: scrollSnapshot().slice(0, 6)});
};
/* al arrancar después de recargar: el proyecto que estaba abierto en esta pestaña (si sigue en la lista) */
function hereResume(list, listErr) {
  const h = hereGet();
  if (!h || !h.pid) return null;
  return (list || []).some(x => x.id === h.pid) || (listErr && ls.get('last', null) === h.pid) ? h : null;
}
/* …y lo que había bajado en la vista, cuando ya está pintada (el guion se acomoda un momento después) */
function hereScroll(h) {
  if (!h || !Array.isArray(h.sc) || !h.sc.length || UI.tab !== h.tab || typeof restoreScroll !== 'function') return;
  const go = () => { if (UI.tab === h.tab && !document.body.classList.contains('home')) restoreScroll(h.sc); };
  requestAnimationFrame(go); setTimeout(go, 350); setTimeout(go, 1200);
}
const posSoon = debounce(posNow, 500);
const SCRIPT_ONLY_TABS = new Set(['script', 'project', 'build']);
/* al abrir: vuelve a donde estaba; un guion, siempre en el guion */
function posRestore() {
  if (!posKeep()) return;
  const r = recentAll()[P.id] || {};
  recentPut(P.id, { t: Date.now() });
  const script = typeof isScriptKind === 'function' && isScriptKind();
  let t = r.tab && RENDER[r.tab] ? r.tab : UI.tab;
  if (script && !SCRIPT_ONLY_TABS.has(t)) t = 'script';
  if (typeof canSeeTab === 'function' && !canSeeTab(t)) t = 'script';
  UI.tab = t; ls.set('tab', t);
  const si = r.sk ? D.sc.scenes.findIndex(s => s.key === r.sk) : -1;
  if (si >= 0) UI.scene = si; else if (r.scene != null) UI.scene = clamp(+r.scene || 0, 0, Math.max(0, D.sc.scenes.length - 1));
  if (r.sb && D.sc.scenes.some(s => s.key === r.sb)) UI.sbScene = r.sb;
  if (r.call != null) UI.callDay = +r.call || 0;
  if (r.sup != null) UI.supDay = +r.sup;
  paintTabSel();
  if (typeof TIO === 'function' && TIO() && TIO().here) TIO().here(t);   // presencia: la pestaña donde quedó
}

/* ---------- Inicio ---------- */
const HOME = { list: [], q: '', arch: false, err: false };
const homeOn = () => document.body.classList.contains('home');
async function homeShow() {
  posNow();
  if (dirty.size) await flushSave();
  closePop(); if ($('#modal')) closeModal();
  tgClose();
  if (typeof AN !== 'undefined' && AN.playing && typeof anPause === 'function') anPause();
  document.body.classList.add('home');
  document.body.classList.remove('writing');
  if (typeof coachClose === 'function') coachClose();   // un aviso de la pestaña no queda flotando sobre Inicio
  hereSet(null);   // en Inicio, recargar deja en Inicio
  if (typeof TIO === 'function' && TIO() && TIO().here) TIO().here('home');   // presencia: los demás te ven «en Inicio»
  if (Store.kind === 'api' && typeof apiUrl === 'function') apiUrl(null);
  HOME.err = false;
  homePaint(true);
  try { HOME.list = await Store.list(); } catch (e) { HOME.err = true; }
  if (typeof PROJ_LIST !== 'undefined') { PROJ_LIST = HOME.list; paintProjCount(); }
  homePaint();
}
function homeHide() {
  if (!homeOn()) return;
  document.body.classList.remove('home');
  if (P && P._shared && Store.kind === 'api' && typeof apiUrl === 'function') apiUrl(P.id);
}
const TAB_LABEL = t => (typeof TAB_NAMES !== 'undefined' && TAB_NAMES[t]) || '';
function homeWhere(o) {
  const r = recentAll()[o.id];
  if (!r || !r.tab) return o.kind === 'guion' ? 'Se abre en el guion' : '';
  const tab = o.kind === 'guion' && !SCRIPT_ONLY_TABS.has(r.tab) ? 'script' : r.tab;
  const sc = tab === 'board' ? r.sb : ['breakdown', 'script', 'lined', 'casting'].includes(tab) && r.sk && r.sk !== (r.first || '1') ? r.sk : '';
  return 'Se abre en ' + TAB_LABEL(tab) + (sc ? ' · escena ' + sc : '');
}
function homePaint(loading) {
  let h = $('#home');
  if (!h) { h = document.createElement('main'); h.id = 'home'; h.setAttribute('aria-label', 'Inicio'); h.dataset.trk = 'home'; $('#app').appendChild(h); h.addEventListener('click', homeClick); h.addEventListener('input', e => { if (e.target.id === 'homeQ') { HOME.q = e.target.value; homeList(); } }); }
  const api = Store.kind === 'api', me = api ? APITEAM.me : null;
  const L = me && me.limits;
  const use = !L ? '' : L.projects ? `${me.own || 0} de ${L.projects} proyectos de producción · ${me.scripts || 0} ${me.scripts === 1 ? 'guion' : 'guiones'}` : `${me.scripts || 0} de ${L.scripts} guiones activos`;
  h.innerHTML = `<div class="home-in">
    <header class="home-h"><div><h1 class="brand-h" data-trk="home">Inicio</h1><p class="hint">${loading ? 'Cargando proyectos…' : HOME.list.some(o => !o.invited) ? 'Tus proyectos, del último que abriste al primero.' : 'Todavía no tienes proyectos.'}${use ? ` <span class="home-use">${esc(use)}</span>` : ''}</p></div>
      <label class="pj-q home-q" ${HOME.list.length > 8 ? '' : 'hidden'}>${ICO.search}<input type="search" id="homeQ" placeholder="Buscar" value="${esc(HOME.q)}" autocomplete="off" aria-label="Buscar proyecto"></label></header>
    <div id="homeBody"></div>
  </div>`;
  if (!loading) homeList();
}
function homeSort(list) {
  const R = recentAll();
  return [...list].sort((a, b) => ((R[b.id] || {}).t || b.updated || 0) - ((R[a.id] || {}).t || a.updated || 0));
}
function homeCard(o) {
  const R = recentAll()[o.id] || {}, api = Store.kind === 'api';
  const opened = R.t ? 'abierto ' + agoText(R.t) : o.updated ? 'editado ' + agoText(o.updated) : '';
  const who = o.shared ? (o.mine ? 'equipo' : 'de ' + esc(o.owner || 'otra persona')) : '';   // el nombre del dueño viene de afuera: escapado
  const kind = api ? `<span class="home-k${ea(o.kind === 'guion' ? ' g' : '')}">${o.kind === 'guion' ? 'Guion' : 'Producción'}</span>` : '';
  const cur = P && P.id === o.id && !P._sample;
  if (o.invited) return `<div class="home-card inv"><button class="home-open" data-open="${esc(o.id)}"><span class="home-t">${esc(o.title || 'Sin título')}</span><span class="home-m"><b>Invitación</b> de ${esc(o.owner || 'otra persona')}${o.role ? ' · ' + esc(String(o.role).toLowerCase()) : ''}</span><span class="home-w">Ábrelo para entrar al equipo</span></button><button class="btn sm ghost" data-decline="${esc(o.id)}" aria-label="Rechazar la invitación a ${ea(o.title || 'Sin título')}">Rechazar</button></div>`;
  return `<div class="home-card${ea(cur ? ' on' : '')}"><button class="home-open" data-open="${esc(o.id)}">
    <span class="home-t">${esc(o.title || 'Sin título')}</span>
    <span class="home-m">${kind}${[opened, who, o.role && !o.mine ? esc(String(o.role).toLowerCase()) : '', api && o.archived ? 'solo lectura' : ''].filter(Boolean).map(x => `<span>${x}</span>`).join('')}</span>
    <span class="home-w">${esc(cur ? 'Vuelve donde lo dejaste' : homeWhere(o))}</span></button></div>`;
}
function homeList() {
  const b = $('#homeBody'); if (!b) return;
  if (HOME.err) { b.innerHTML = '<p class="pj-empty bad">No se pudo cargar la lista de proyectos. <button class="btn sm" data-h="retry">Reintentar</button></p>'; return; }
  const q = deaccent(HOME.q || '').toLowerCase();
  const match = o => !q || deaccent(String(o.title || '')).toLowerCase().includes(q);
  const arch = o => typeof projArchived === 'function' ? projArchived(o) : !!o.archived;
  const inv = HOME.list.filter(o => o.invited && match(o));
  const act = homeSort(HOME.list.filter(o => !o.invited && !arch(o) && match(o)));
  const old = homeSort(HOME.list.filter(o => !o.invited && arch(o) && match(o)));
  const empty = !HOME.list.length;
  b.innerHTML = `${inv.length ? `<h2 class="home-sec">Invitaciones</h2><div class="home-grid">${inv.map(homeCard).join('')}</div>` : ''}
    ${empty ? `<div class="home-empty"><h2>Empieza por tu guion</h2><p class="hint">Escríbelo aquí o importa Final Draft, Fountain o PDF. Las escenas, el reparto y los elementos probables se marcan solos.</p>
        <div class="empty-acts"><button class="btn primary" data-h="guion">Nuevo guion</button><button class="btn" data-h="prod">Nuevo proyecto</button><button class="btn ghost" data-h="sample">Ver el proyecto de ejemplo</button></div></div>`
      : act.length ? `<div class="home-grid">${act.map(homeCard).join('')}</div>` : q ? `<p class="pj-empty">Ningún proyecto con «${esc(HOME.q)}».</p>` : '<p class="pj-empty">No hay proyectos activos: los tuyos están archivados.</p>'}
    ${old.length ? `<details class="home-arch"${HOME.arch || q ? ' open' : ''}><summary>Archivados <i>${old.length}</i></summary><div class="home-grid">${old.map(homeCard).join('')}</div></details>` : ''}
    ${empty ? '' : `<div class="home-ft"><button class="btn sm ghost" data-h="file">Abrir archivo .${PROJ_EXT}</button><button class="btn sm ghost" data-h="sample">Ver el proyecto de ejemplo</button></div>`}`;
  const d = $('.home-arch', b); if (d) d.addEventListener('toggle', () => { HOME.arch = d.open; });
}
async function homeClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.decline) {
    try { await apiFetch('POST', `/api/p/${encodeURIComponent(b.dataset.decline)}/decline`, {}); } catch (er) { toast(er.message || 'No se pudo rechazar.', 4000); return; }
    HOME.list = HOME.list.filter(x => x.id !== b.dataset.decline); homeList(); toast('Invitación rechazada.'); return;
  }
  if (b.dataset.open) {
    const id = b.dataset.open;
    if (P && P.id === id && !P._sample) { homeHide(); posRestore(); render(); return; }
    b.disabled = true;
    const ok = await openProject(id);
    if (!ok) { b.disabled = false; return; }
    homeHide();
    return;
  }
  const h = b.dataset.h;
  if (h === 'retry') return homeShow();
  if (h === 'guion' || h === 'prod') return newOf(h);
  if (h === 'sample') { setProject(buildSample()); homeHide(); return; }
  if (h === 'file') return Store.kind === 'desk' ? deskMenu('open') : pickFile(PROJ_ACCEPT, 'restore');
}

/* (lote AD) «Explorar con un proyecto de ejemplo»: ningún plan tiene prueba gratis; para ver la producción está el
   ejemplo, con todas sus pestañas. Se abre en la misma pestaña en que estaba la persona (el desglose, el plan…) */
async function sampleExplore() {
  const tab = UI.tab;
  closeModal(); closePop();
  if (P && dirty.size && !saving) await flushSave();
  setProject(buildSample());
  if (tab && tab !== UI.tab && RENDER[tab] && (typeof canSeeTab !== 'function' || canSeeTab(tab))) setTab(tab);
  toast('Este es el proyecto de ejemplo, con todas sus pestañas. Explóralo: lo que cambies aquí no se guarda.', 6000);
}
/* el par de botones donde antes se ofrecía la prueba gratis: los planes y el ejemplo. planAct: la acción del de los
   planes (en un guion, «kind-produce»: después de pagar se lleva a producción solo); cls: clases extra de los botones */
const samplePairHTML = (planAct = 'plans-see', cls = '') => `<button class="btn primary${cls}" data-act="${ea(planAct)}">Ver planes de suscripción</button><button class="btn${cls}" data-act="sample-explore">Explorar con un proyecto de ejemplo</button>`;
Object.assign(ACT, {
  'sample-explore': () => sampleExplore(),
  'plans-see': () => {
    if (typeof licenseDialog !== 'function') return;
    const me = typeof APITEAM !== 'undefined' && APITEAM.me;
    licenseDialog('', me && typeof nextPlan === 'function' ? nextPlan(me.plan) : 'pro');
  },
});

/* ---------- «Nuevo»: Guion o Proyecto ---------- */
function newMenu(anchor) {
  const api = Store.kind === 'api', me = api ? APITEAM.me : null;
  const paid = !api || !!(me && me.limits && me.limits.projects);
  popover(anchor, `<div class="menu xmenu new-menu">
      <button data-n="guion"><b>Guion</b><small>En blanco, para escribir. Se guarda solo.</small></button>
      <button data-n="prod"><b>Proyecto${paid ? '' : ' <i class="pro-chip">PRO</i>'}</b><small>${paid ? 'Guion, desglose, storyboard, plan de rodaje, calendario, hoja de llamado y presupuesto' : 'Con desglose, storyboard y plan de rodaje: Indie, Pro y Studio.'}</small></button>
      ${paid ? '' : '<button data-n="sample"><b>Proyecto de ejemplo</b><small>Todas las pestañas de producción, para explorarlas sin pagar.</small></button>'}
    </div>`, p => p.addEventListener('click', e => { const x = e.target.closest('[data-n]'); if (!x) return; closePop(); if (x.dataset.n === 'sample') sampleExplore(); else newOf(x.dataset.n); }));
}
async function newOf(kind) {
  if (kind === 'prod' && Store.kind === 'api') {
    const me = APITEAM.me;
    // plan Guion: los planes y el proyecto de ejemplo (lote AD: sin prueba gratis)
    if (!(me && me.limits && me.limits.projects)) return freeLimitNotice('prod');
  }
  return newBlankProject(kind);
}

/* ---------- versión nueva publicada mientras la pestaña estaba abierta (web con cuentas) ----------
   El servidor manda su versión en cada respuesta (X-FS-App). Si cambia, esta pestaña tiene el código
   anterior: en Inicio y sin nada por guardar se recarga sola; si no, avisa con «Recargar». */
let APP_V0 = null, APP_WARNED = 0;
function appVersionSeen(v) {
  if (!v) return;
  if (APP_V0 == null) { APP_V0 = v; return; }
  if (v === APP_V0) return;
  const idle = !dirty.size && !(typeof saving !== 'undefined' && saving) && !$('#modal');
  if (homeOn() && idle) { location.reload(); return; }
  if (Date.now() - APP_WARNED < 10 * 60e3) return;
  APP_WARNED = Date.now();
  toast('Hay una versión nueva de FilmSpirit. Recarga para usarla: vuelves a esta misma pestaña y lo tuyo ya está guardado (o se guarda antes).', 60000, { label: 'Recargar', fn: async () => { if (dirty.size) await flushSave(); posNow(); location.reload(); } });
}
// al volver a la pestaña después de un rato, se pregunta (así se nota una actualización del servidor)
// (APITEAM se declara más adelante en el mismo código: se mira recién cuando ocurre)
document.addEventListener('visibilitychange', () => {
  if (!API() || document.visibilityState !== 'visible' || !APITEAM.me || navigator.onLine === false) return;
  apiFetch('GET', '/api/me').then(r => { if (r && r.json && r.json.plan) APITEAM.setMe(r.json); }).catch(() => { });
});

/* ---------- «Mis guiones» de la pestaña Guion ---------- */
const myScriptsBtnHTML = () => `<button class="btn ghost my-scripts" data-act="my-scripts" aria-haspopup="menu" title="Tus guiones: cambiar de guion o empezar uno nuevo">${ICO.scripts || ''}<span class="hide-sm">Mis guiones</span>${ICO.chev}</button>`;
async function myScripts(anchor) {
  let list = [];
  try { list = await Store.list(); } catch (e) { toast('No se pudo cargar la lista de guiones. Revisa tu conexión y recarga la página.', 4000); return; }
  const api = Store.kind === 'api';
  const arch = o => typeof projArchived === 'function' ? projArchived(o) : !!o.archived;
  // en la web con cuentas, los guiones; sin cuentas, cada proyecto tiene su guion
  const mine = homeSort(list.filter(o => !o.invited && !arch(o) && (!api || o.kind === 'guion')));
  const prod = api ? list.filter(o => !o.invited && o.kind !== 'guion').length : 0;
  const row = o => `<button data-open="${esc(o.id)}" ${P && P.id === o.id ? 'aria-current="true"' : ''}><b>${esc(o.title || 'Sin título')}</b><small>${P && P.id === o.id ? 'abierto' : esc(o.updated ? 'editado ' + agoText(o.updated) : '')}</small></button>`;
  popover(anchor, `<div class="menu xmenu my-scr"><h5>Mis guiones</h5>
      <button data-new="1" class="ms-new">${ICO.plus} <b>Nuevo guion</b></button>
      ${mine.length ? mine.slice(0, 30).map(row).join('') : '<p class="hint" style="margin:4px 10px">Aún no tienes otros guiones.</p>'}
      <hr><button data-home="1"><b data-trk="home">Inicio</b><small>${prod ? `Todos tus proyectos, también ${prod === 1 ? 'el de producción' : `los ${prod} de producción`}` : 'Todos tus proyectos, del último que abriste'}</small></button>
    </div>`, p => p.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    closePop();
    if (b.dataset.new) return newOf('guion');
    if (b.dataset.home) return homeShow();
    if (b.dataset.open && (!P || b.dataset.open !== P.id)) openProject(b.dataset.open);
  }));
}
Object.assign(ACT, { 'my-scripts': b => myScripts(b) });
