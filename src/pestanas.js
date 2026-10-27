/* ============================================================
   PESTAÑAS · cómo se pinta cada una (RENDER), el cambio de pestaña y la franja de etapas
   (antes en ui.js; va después de ventanas.js en el armado)
   ============================================================ */
/* ---------- pestañas ---------- */
const RENDER = {};
function setTab(t) {
  // (lote AD) Historia y Guion sin acceso (un enlace, una notificación): el guion se lee en el Guion rayado
  if (typeof canSeeTab === 'function' && !canSeeTab(t) && (t === 'build' || t === 'script') && canSeeTab('lined')) t = 'lined';
  if (typeof canSeeTab === 'function' && !canSeeTab(t)) { toast('No tienes acceso a esa pestaña en este proyecto.'); return; }
  if (t !== 'animatic' && AN.playing) anPause();
  scriptModeFor(t);
  tgClose();   // el menú de la etapa no queda abierto al cambiar de pestaña desde otro lado
  document.body.classList.remove('mk-on');   // el marcador vale solo en el guion rayado (al volver, se pinta de nuevo)
  barsShow();   // las barras de arriba vuelven al cambiar de pestaña
  UI.tab = t;
  ls.set('tab', t);
  if (typeof TIO === 'function' && TIO() && TIO().here) TIO().here(t);   // presencia: los demás ven en qué pestaña estás
  paintTabSel();
  sharePaintTabs();
  hideSelTool(); closePop();
  render();
  tabInView();
}
/* pestañas accesibles: la elegida es la única que recibe el foco con Tab; las flechas pasan a las demás */
function paintTabSel() {
  $$('#tabs .tab').forEach(b => { const on = b.dataset.tab === UI.tab; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
  const pb = $('#projBtn'); if (pb) { if (UI.tab === 'project') pb.setAttribute('aria-current', 'page'); else pb.removeAttribute('aria-current'); }
  const v = $('#view'); if (v) v.setAttribute('aria-labelledby', 'tab-' + UI.tab);
  document.documentElement.dataset.tab = UI.tab;   // el estilo pastel pinta cada pestaña con su color
  if ($('#tabs .stg')) tabGroupsPaint();
}
/* en el teléfono, al bajar por el trabajo se esconden la barra de arriba y la de las etapas (y vuelven al subir un
   poco o al llegar arriba): la pantalla queda para el trabajo */
let BARS_T = 0;
function barsShow() { document.body.classList.remove('bars-off'); }
function barsAutoHide() {
  const mq = matchMedia('(max-width: 760px)'), last = new WeakMap();
  let acc = 0;
  const set = off => {
    if (off === document.body.classList.contains('bars-off')) return;
    const tb = $('.topbar'), tg = $('#tabs');
    if (off) { document.body.style.setProperty('--tb-h', (tb ? tb.offsetHeight : 0) + 'px'); document.body.style.setProperty('--tg-h', (tg ? tg.offsetHeight : 0) + 'px'); }
    document.body.classList.toggle('bars-off', off); BARS_T = Date.now(); acc = 0;
  };
  document.addEventListener('scroll', e => {
    const t = e.target;
    if (!mq.matches || !(t instanceof Element) || !t.closest('#view') || document.body.classList.contains('home')) return;
    const y = t.scrollTop, p = last.get(t); last.set(t, y);
    if (p == null || y === p) return;   // (desplazarse de lado no cuenta)
    if (Date.now() - BARS_T < 350) return;   // el alto cambió al esconderlas: ese salto no es del dedo
    if ($('#pop') || $('#notesPanel.open') || $('.side.open, .insp.open')) return;
    if (y < 30) { set(false); return; }
    if (t.scrollHeight - t.clientHeight < 240) return;   // poco que desplazar: no vale la pena
    const d = y - p; acc = Math.sign(d) === Math.sign(acc) ? acc + d : d;
    if (acc > 28) set(true); else if (acc < -28) set(false);
  }, true);
}
/* en el teléfono caben pocas pestañas: la activa se trae a la vista y los bordes se difuminan si hay más */
function tabInView(smooth = true) {
  const n = $('#tabs'), a = n && (tgOn() && $('#tabs .stg.on .stg-h') || $('#tabs .tab[aria-selected="true"]'));
  if (!a) return;
  const cfg = $('#tabsCfg'), pad = (cfg ? cfg.offsetWidth : 0) + 12;
  const l = a.offsetLeft - 12, r = a.offsetLeft + a.offsetWidth + pad - n.clientWidth;
  if (n.scrollLeft > l) n.scrollTo({ left: l, behavior: smooth ? 'smooth' : 'auto' });
  else if (n.scrollLeft < r) n.scrollTo({ left: r, behavior: smooth ? 'smooth' : 'auto' });
  tabFade();
}
/* las pestañas se agrupan en las cuatro etapas de la producción y cada etapa es un menú desplegable.
   Las pestañas siguen siendo los mismos botones (permisos, preferencias, atajos y notas no cambian). */
const TAB_GROUPS = [['0', 'Guion'], ['1', 'Preparación'], ['2', 'Imagen'], ['3', 'Producción'], ['4', 'Rodaje']];
const tgOn = () => !!document.querySelector('#tabs .stg');
const TG_LAST = {};
function tabGroupsBuild() {
  const nav = $('#tabs'); if (!nav || nav.querySelector('.stg')) return;
  // la franja es una navegación de etapas: cada etapa abre su lista de pestañas (role="tablist", con su nombre)
  nav.removeAttribute('role'); nav.setAttribute('aria-label', 'Etapas y pestañas del proyecto');
  for (const [g, name] of TAB_GROUPS) {
    const tabs = $$(`#tabs .tab[data-g="${g}"]`); if (!tabs.length) continue;
    // cada etapa con su ícono y su familia de color (iconos.js; los colores en el CSS: .icg0 … .icg4)
    const w = document.createElement('div'); w.className = 'stg icg' + g; w.dataset.g = g; w.setAttribute('role', 'presentation');
    const h = document.createElement('button'); h.type = 'button'; h.className = 'stg-h'; h.id = 'stgh-' + g;
    h.setAttribute('aria-controls', 'stgm-' + g); h.setAttribute('aria-haspopup', 'true'); h.setAttribute('aria-expanded', 'false');   // un clic (o la flecha) abre su lista
    h.innerHTML = `${typeof stgIco === 'function' ? stgIco(g) : ''}<span class="stg-n" data-trk="stage">${esc(name)}</span><span class="stg-cur"></span><svg class="stg-ch" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
    const m = document.createElement('div'); m.className = 'stg-m'; m.id = 'stgm-' + g; m.setAttribute('role', 'tablist'); m.setAttribute('aria-orientation', 'vertical'); m.setAttribute('aria-label', name);
    m.innerHTML = `<div class="stg-mt" data-trk="stage" aria-hidden="true">${esc(name)}</div>`;   // el nombre de la etapa, arriba de sus pestañas
    tabs.forEach(t => { if (typeof tabIco === 'function' && !t.querySelector('svg.lf')) t.insertAdjacentHTML('afterbegin', tabIco(t.dataset.tab)); });
    tabs[0].before(w); w.append(h, m); tabs.forEach(t => m.appendChild(t));
  }
  nav.addEventListener('click', e => {
    const h = e.target.closest('.stg-h');
    if (h) {
      const w = h.parentElement, vis = $$('.tab', w).filter(t => !t.hidden);
      // en la computadora, un clic abre la tarjeta de la etapa con sus pestañas (con el teclado, con el foco adentro);
      // con una sola pestaña visible va directo. En el teléfono va a la última pestaña usada (sus hermanas están en el
      // nombre de la barra)
      // con el mouse la tarjeta ya se abrió al pasar: el clic la deja fija (no la cierra ni navega)
      if (tgRail() && vis.length > 1) {
        const mouse = tgHover() && (e.pointerType || TG_PT) === 'mouse' && e.detail > 0;
        if (mouse) { if (!w.classList.contains('open')) tgOpen(w, false); w._pin = true; return; }
        w.classList.contains('open') ? tgClose() : tgOpen(w, e.detail === 0); return;
      }
      tgClose(); stageGo(w); return;
    }
    if (e.target.closest('.stg-m .tab')) tgClose();
  });
  /* con el mouse (en la computadora), la tarjeta de la etapa se abre al pasar por encima, sin clic: tras una pausa
     corta (para no abrirlas todas al cruzar la barra) o al instante si ya hay otra abierta. Se cierra un rato después
     de salir de la etapa y de su tarjeta, con margen para cruzar el hueco entre las dos */
  let tgT = 0, tgIn = null;   // la etapa (o su tarjeta) que está bajo el puntero
  nav.addEventListener('pointerdown', e => { TG_PT = e.pointerType; }, true);
  nav.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen' || !tgHover()) return;
    const w = e.target.closest('.stg'); if (!w) return;
    tgIn = w; clearTimeout(tgT);
    if (!e.target.closest('.stg-h') || w.classList.contains('open')) return;   // sobre la tarjeta abierta: se queda
    const vis = $$('.tab', w).filter(t => !t.hidden), any = !!$('#tabs .stg.open');
    if (vis.length < 2) { if (any) tgT = setTimeout(() => { const o = $('#tabs .stg.open'); if (o && !o._pin) tgClose(); }, 120); return; }
    tgT = setTimeout(() => { if (tgIn === w) tgOpen(w, false); }, any ? 0 : 120);
  });
  nav.addEventListener('pointerout', e => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen' || !tgHover()) return;
    const to = e.relatedTarget, tw = to && to.closest ? to.closest('#tabs .stg') : null;
    if (tw && tw === e.target.closest('.stg')) return;   // se mueve dentro de la misma etapa o de su tarjeta
    tgIn = tw;
    if (tw) return;   // pasó directo a otra etapa: la decide su «pointerover»
    clearTimeout(tgT);
    tgT = setTimeout(() => { const o = $('#tabs .stg.open'); if (o && !o._pin && tgIn !== o && !o.contains(document.activeElement)) tgClose(); }, 300);
  });
  nav.addEventListener('keydown', e => {
    if (!tgOn()) return;
    const h = e.target.closest('.stg-h');
    if (h) {
      const heads = $$('#tabs .stg:not(.off) .stg-h'), i = heads.indexOf(h);
      // en la franja de la izquierda (vertical) el menú se abre a la derecha y las etapas van de arriba abajo
      const rail = tgRail(), open = rail ? 'ArrowRight' : 'ArrowDown', next = rail ? 'ArrowDown' : 'ArrowRight', prev = rail ? 'ArrowUp' : 'ArrowLeft';
      if (e.key === open) { e.preventDefault(); if (tgRail()) tgOpen(h.parentElement, true); else tgDrop(h.parentElement, h, $$('.tab', h.parentElement).filter(t => !t.hidden)); }
      else if (e.key === next || e.key === prev) { e.preventDefault(); tgClose(); heads[(i + (e.key === next ? 1 : -1) + heads.length) % heads.length].focus(); }
      return;
    }
    const t = e.target.closest('.stg-m .tab'); if (!t) return;
    const w = t.closest('.stg'), list = $$('.tab', w).filter(b => !b.hidden), i = list.indexOf(t);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length].focus(); }
    else if (e.key === 'Escape' || (e.key === 'ArrowLeft' && tgRail())) { e.preventDefault(); e.stopPropagation(); tgClose(true); }
    else if (e.key === 'Tab') tgClose();
    else if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) e.stopPropagation();   // dentro del menú no salta a otra etapa
  });
  document.addEventListener('pointerdown', e => { if (!e.target.closest('#tabs .stg')) tgClose(); }, true);
  // se cierra si la ventana cambia de ancho o la barra se desplaza de verdad (no por el rebote del final ni por la
  // barra del navegador, que en el teléfono aparece y desaparece y cambia solo el alto)
  addEventListener('resize', () => { if (TG_AT && innerWidth !== TG_AT.w) tgClose(); });
  nav.addEventListener('scroll', () => { if (TG_AT && Math.abs(nav.scrollLeft - TG_AT.x) > 12) tgClose(); }, { passive: true });
  // permisos y preferencias ocultan pestañas: las etapas vacías se ocultan solas
  new MutationObserver(ms => { if (ms.some(m => m.target.classList && m.target.classList.contains('tab'))) tabGroupsPaint(); })
    .observe(nav, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  tabGroupsPaint();
}
/* ir a una etapa: a su última pestaña usada (o la primera visible); con cycle y ya en esa etapa, a la siguiente */
function stageGo(w, cycle) {
  const vis = $$('.tab', w).filter(t => !t.hidden).map(t => t.dataset.tab); if (!vis.length) return;
  const g = w.dataset.g, here = vis.indexOf(UI.tab);
  const t = here >= 0 ? (cycle ? vis[(here + 1) % vis.length] : UI.tab) : vis.includes(TG_LAST[g]) ? TG_LAST[g] : vis[0];
  if (t !== UI.tab) setTab(t);
}
let TG_AT = null;   // cómo estaban la ventana y la barra al abrir el menú de una etapa
/* en la computadora las etapas van en una franja vertical a la izquierda (solo sus íconos); en el teléfono, sus
   íconos van en la barra de arriba, en lugar del título del proyecto */
const tgRail = () => !matchMedia('(max-width: 760px)').matches;
/* hay mouse (o lápiz) que pasa por encima: la tarjeta de la etapa se abre sin clic */
const tgHover = () => tgRail() && matchMedia('(hover: hover)').matches;
let TG_PT = '';   // con qué se tocó la barra por última vez (mouse, dedo o lápiz)
function tabsPlace() {
  const n = $('#tabs'), tb = $('.topbar'), br = $('#brand'); if (!n || !tb || !br) return;
  if (!tgRail()) { if (n.parentElement !== tb) br.after(n); }
  else if (n.parentElement === tb) tb.after(n);
}
/* el teléfono: las pestañas de la etapa en un menú que cuelga del botón, como en la computadora, pero fuera de la
   barra que se desplaza (dentro de ella, en el iPhone, no se veía) */
function tgDrop(w, h, vis) {
  tgClose();
  const cur = UI.tab;
  const p = popover(h, `<div class="menu stg-drop icg${ea(w.dataset.g)}${vis.some(t => t.dataset.tab === cur) ? ' on' : ''}">${vis.map(t => { const k = t.dataset.tab;
    return `<button type="button" data-tab="${ea(k)}"${k === cur ? ' aria-current="page"' : ''}>${tabIco(k)}${esc((typeof TAB_NAMES !== 'undefined' && TAB_NAMES[k]) || t.textContent.trim())}</button>`; }).join('')}</div>`,
    pp => pp.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; closePop(); setTab(b.dataset.tab); }));
  popPlace(p, h.getBoundingClientRect());   // justo debajo de la etapa (pop-drop: se mide con su ancho)
}
function tgOpen(w, focus) {
  tgClose();
  if (!tgOn()) return;
  const h = $('.stg-h', w), m = $('.stg-m', w);
  w.classList.add('open'); h.setAttribute('aria-expanded', 'true');
  TG_AT = { w: innerWidth, x: $('#tabs').scrollLeft };
  // la barra desplazada se desvanece con una máscara, y la máscara también tapaba el menú: se quita mientras está abierto
  $('#tabs').classList.add('tg-open');
  // fijo a la ventana: la barra se desplaza en el teléfono y recortaría el menú
  const r = h.getBoundingClientRect();
  if (tgRail()) {   // la franja de la izquierda: el menú sale a su derecha, a la altura de la etapa
    m.style.left = Math.round(r.right + 10) + 'px';
    m.style.top = Math.round(Math.max(8, Math.min(r.top - 6, innerHeight - m.offsetHeight - 8))) + 'px';
  } else {
    m.style.top = Math.round(r.bottom + 6) + 'px';
    m.style.left = Math.round(Math.max(8, Math.min(r.left, innerWidth - m.offsetWidth - 8))) + 'px';
  }
  if (focus) { const t = $$('.tab', m).filter(b => !b.hidden); (t.find(b => b.getAttribute('aria-selected') === 'true') || t[0])?.focus(); }
}
function tgClose(focusHead) {
  const w = $('#tabs .stg.open'); if (!w) return;
  TG_AT = null;
  $('#tabs').classList.remove('tg-open');
  w.classList.remove('open'); w._pin = false; $('.stg-h', w).setAttribute('aria-expanded', 'false');
  if (focusHead) $('.stg-h', w).focus();
}
let TG_PAINTED = false;
function tabGroupsPaint() {
  $$('#tabs .stg').forEach(w => {
    const g = w.dataset.g, tabs = $$('.tab', w), vis = tabs.filter(t => !t.hidden);
    const cur = tabs.find(t => t.dataset.tab === UI.tab);
    if (cur) TG_LAST[g] = UI.tab;
    w.classList.toggle('off', !vis.length);
    // la etapa recién elegida salta una vez (no al abrir el programa)
    if (cur && !w.classList.contains('on') && TG_PAINTED) { w.classList.add('stg-just'); clearTimeout(w._just); w._just = setTimeout(() => w.classList.remove('stg-just'), 600); }
    w.classList.toggle('on', !!cur);
    // «Guion · Guion» no: si la pestaña se llama como su etapa, basta el nombre de la etapa
    const cn = cur && typeof TAB_NAMES !== 'undefined' ? TAB_NAMES[UI.tab] : '';
    $('.stg-cur', w).textContent = cn === $('.stg-n', w).textContent ? '' : cn;
    const sn = $('.stg-n', w).textContent, cc = cur ? $('.stg-cur', w).textContent : '';
    // adónde lleva el clic: en el teléfono, a su última pestaña; en la computadora abre la lista (no hace falta decirlo)
    const go = cur || tgRail() ? '' : (TAB_NAMES[TG_LAST[g]] && vis.some(t => t.dataset.tab === TG_LAST[g]) ? TAB_NAMES[TG_LAST[g]] : vis[0] ? TAB_NAMES[vis[0].dataset.tab] : '');
    $('.stg-h', w).setAttribute('aria-label', EN ? trDone(`${trK('stage', sn)}${cc ? ': ' + tr(cc) : go ? ' › ' + tr(go) : ''}`) : sn + (cc ? ': ' + cc : go ? ' › ' + go : ''));
    if (cur) $('.stg-h', w).setAttribute('aria-current', 'page'); else $('.stg-h', w).removeAttribute('aria-current');
    // en el teléfono solo se ve el ícono: el nombre de la etapa (y de la pestaña abierta) al pasar el puntero. En la
    // barra de la izquierda el nombre ya está escrito y la tarjeta se abre al pasar: el globo la tapaba
    if (tgRail()) $('.stg-h', w).removeAttribute('title');
    else $('.stg-h', w).title = EN ? trDone(`${trK('stage', sn)}${cc ? ' · ' + tr(cc) : ''}`) : sn + (cc ? ' · ' + cc : '');
  });
  TG_PAINTED = true;
}
function tabFade() {
  const n = $('#tabs'); if (!n) return;
  n.classList.toggle('fl', n.scrollLeft > 4);
}
/* al reemplazar la vista, el campo con foco dispara «change» al perderlo; si su respuesta vuelve a
   pintar, se espera a que termine la pintada en curso */
let RENDERING = false, RERENDER = false;
function render() {
  if (!P) return;
  if (RENDERING) { RERENDER = true; return; }
  RENDERING = true;
  try {
    $('#projTitle').textContent = P.meta.title;
    const v = $('#view');
    // el título de la vista para lectores de pantalla: proyecto · pestaña (el único h1 visible era el de Inicio)
    let h1 = $('#viewH1'); if (!h1) { h1 = document.createElement('h1'); h1.id = 'viewH1'; h1.className = 'sr-only'; v.before(h1); }
    h1.textContent = P.meta.title + ' · ' + ((typeof TAB_NAMES !== 'undefined' && TAB_NAMES[UI.tab]) || '');
    const keepScroll = v._tab === UI.tab ? scrollSnapshot() : null;
    // con el teclado, el foco no se pierde al repintar: vuelve al botón equivalente
    const fa = document.activeElement, fsel = v._tab === UI.tab && fa && fa !== v && v.contains(fa) && fa.tagName === 'BUTTON' && fa.dataset.act
      ? `button[data-act="${CSS.escape(fa.dataset.act)}"]` + ['id', 'v', 'i', 'n', 'k', 'tab'].filter(k => fa.dataset[k] != null).map(k => `[data-${k}="${CSS.escape(fa.dataset[k])}"]`).join('') : null;
    document.body.classList.remove('writing');
    lookApply();   // los colores del proyecto (leyenda.js)
    // un guion (web con cuentas): las pestañas de producción muestran cómo llevarlo a producción (planes.js)
    if (!(typeof planGate === 'function' && planGate(UI.tab))) RENDER[UI.tab]();
    barTabName();   // las pestañas de la etapa (o el nombre de la abierta) al inicio de su barra
    phoneBars();   // en el teléfono, la barra en una línea (barra.js)
    v._tab = UI.tab;
    if (keepScroll) restoreScroll(keepScroll);
    if (fsel && !v.contains(document.activeElement)) { const el = $(fsel, v); if (el) try { el.focus({ preventScroll: true }); } catch (e) { } }
    setSaveState();
    histPaint();
    if (typeof NOTES_ON !== 'undefined') notesPaint();
    if (typeof posSoon === 'function') posSoon();
  } finally { RENDERING = false; }
  if (RERENDER) { RERENDER = false; render(); }
}
function scrollSnapshot() { return $$('#view [data-keep]').map(el => [el.dataset.keep, el.scrollTop, el.scrollLeft]); }
function restoreScroll(list) { for (const [k, t, l] of list) { const el = $(`#view [data-keep="${k}"]`); if (el) { el.scrollTop = t; el.scrollLeft = l; } } }
function closeDrawers() { $$('.side.open,.insp.open').forEach(x => x.classList.remove('open')); $$('.scrim').forEach(x => x.remove()); }
function openDrawer(sel) {
  const el = $(sel);
  if (!el) return;
  el.classList.add('open');
  const s = document.createElement('div');
  s.className = 'scrim'; s.onclick = closeDrawers;
  document.body.appendChild(s);
}
/* avisos de arriba: todos en su propia fila (#banners), uno debajo del otro */
function addBanner(cls, html) {
  const b = document.createElement('div');
  b.className = 'banner ' + cls;
  b.innerHTML = html;
  $('#banners').appendChild(b);
  return b;
}
function renderBanner() {
  $$('.banner.ro').forEach(b => b.remove());
  if (UI.readOnly) addBanner('ro', 'Tienes acceso de lectura: puedes revisar y exportar, pero los cambios no se guardan.');
}
function remoteBanner() {
  if ($('.banner.remote')) return;
  const b = addBanner('remote', 'Este proyecto se modificó desde otra sesión. <button class="btn sm" id="reloadBtn">Cargar la versión nueva</button>');
  $('#reloadBtn').onclick = async () => { b.remove(); await openProject(P.id); };
}
/* el ejemplo ya no lleva franja: el aviso es el triángulo junto al nombre del proyecto (setSaveState) */
function sampleBanner() {
  $$('.banner.sample').forEach(b => b.remove());
  setSaveState();
}
/* el ejemplo pasa a ser un proyecto guardado (con los dibujos hechos mientras se probaba) */
async function adoptSample() {
  if (!P || !P._sample || P._saved) return;
  // sin cuenta (el ejemplo desde la portada): primero la cuenta; al entrar, se guarda (cuenta.js · anonAsk)
  if (Store.kind === 'api' && APITEAM.anon) return anonAsk('save', adoptSample);
  if (typeof autoKind === 'function' && autoKind()) P._kind = autoKind();
  if (!(await canCreateProject(false, P._kind))) return;
  // web con cuentas, como guion (plan Guion o sin lugar de producción): se avisa que solo se guarda el guion
  if (Store.kind === 'api' && P._kind === 'guion' && !adoptSample.ok) {
    const paid = !!(APITEAM.me && APITEAM.me.limits && APITEAM.me.limits.projects);
    const m = modal({
      title: 'Guardar el ejemplo',
      body: `<p style="margin:0">${paid ? 'Tus proyectos de producción están en uso, así que el ejemplo se guarda como guion' : 'En el plan Guion el ejemplo se guarda como guion'}: queda el texto y las notas; el desglose, el storyboard, el plan y el presupuesto del ejemplo no se guardan.</p>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn" id="adPlans">${paid ? 'Ver planes' : 'Ver planes de suscripción'}</button><button class="btn primary" id="adGo">Guardar como guion</button>`,
    });
    $('#adPlans', m).onclick = () => { closeModal(); freeLimitNotice('prod'); };
    $('#adGo', m).onclick = () => { closeModal(); adoptSample.ok = true; adoptSample().finally(() => { adoptSample.ok = false; }); };
    return;
  }
  P._sample = false; P._blocked = false; P._adoptFrames = true;
  sampleBanner();
  changed('script'); changed('data');
  toast(Store.kind === 'api' ? 'Guardando el ejemplo en tu cuenta…' : 'Listo: el ejemplo ahora es un proyecto tuyo.');
}
