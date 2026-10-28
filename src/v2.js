/* ============================================================
   FILMSPIRIT · VERSIÓN 2 · la barra lateral y la cabecera de cada pestaña (v2.css)
   Va al final del armado (build.sh), antes de boot(): envuelve funciones de la v1 sin cambiarlas,
   para que los lotes de la v1 se puedan traer a la v2 sin chocar.
   - La barra de las etapas (#tabs) pasa a ser la lateral del diseño: «Tu página», el proyecto, cada etapa
     con su punto y sus pestañas siempre a la vista, y el equipo abajo.
   - La barra de arriba (.topbar) pasa a ser la cabecera de la pestaña: la etapa con su punto, el título
     grande y las acciones (historial, notas, compartir…) a la derecha.
   ============================================================ */
const V2 = { on: true };
const V2_STAGE = { '0': 'Guion', '1': 'Preparación', '2': 'Imagen', '3': 'Producción', '4': 'Rodaje', p: 'Proyecto' };
const v2Svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;

/* ---------- la lateral: cabeza (Tu página y el proyecto) y pie (el equipo) ---------- */
function v2Sidebar() {
  const nav = $('#tabs'); if (!nav || nav.querySelector('.v2-sb-head')) return;
  document.documentElement.dataset.v2 = '1';
  const head = document.createElement('div'); head.className = 'v2-sb-head';
  head.innerHTML = `<button type="button" class="v2-back" id="v2Back">${v2Svg('<path d="m15 18-6-6 6-6"/>')}<span>Tu página</span></button>`;
  nav.prepend(head);
  // «Tu página» vuelve a Inicio, como el logo de la v1
  $('#v2Back', head).onclick = () => { const b = $('#brand'); if (b) b.click(); };
  // el botón del proyecto de la v1 (abre «Proyecto»: datos, logos y equipo) pasa a la lateral, con su ícono y sus datos
  const pb = $('#projBtn');
  if (pb) {
    if (!pb.querySelector('.v2-tile')) {
      const tile = document.createElement('span'); tile.className = 'v2-tile'; tile.setAttribute('aria-hidden', 'true');
      tile.innerHTML = typeof markSVG === 'function' ? markSVG() : '';
      pb.prepend(tile);
      const t = pb.querySelector('.t'), box = document.createElement('span'); box.className = 'v2-pt';
      t.before(box); box.append(t);
      const s = document.createElement('span'); s.className = 'v2-ps'; s.id = 'v2ProjSub'; box.append(s);
    }
    head.append(pb);
  }
  // las etapas son rótulos: no se enfocan ni abren menús (las pestañas están a la vista)
  $$('#tabs .stg-h').forEach(h => { h.tabIndex = -1; h.setAttribute('aria-hidden', 'true'); });
  const gap = document.createElement('div'); gap.className = 'v2-sb-gap';
  const foot = document.createElement('div'); foot.className = 'v2-sb-foot'; foot.id = 'v2Foot';
  nav.append(gap, foot);
}
/* en la computadora las pestañas de cada etapa se ven siempre: la tarjeta flotante de la v1 no se abre */
const v2Rail = () => !matchMedia('(max-width: 760px)').matches;
{
  const _tgOpen = tgOpen;
  tgOpen = function (w, focus) { if (V2.on && v2Rail()) return; return _tgOpen(w, focus); };
  const _tgb = tabGroupsBuild;
  tabGroupsBuild = function () { const r = _tgb.apply(this, arguments); if (V2.on) v2Sidebar(); return r; };
}

/* ---------- la cabecera: la etapa con su punto y el título de la pestaña ---------- */
function v2Head() {
  const tb = $('.topbar'); if (!tb) return null;
  let h = $('.v2-ttl', tb);
  if (!h) {
    h = document.createElement('div'); h.className = 'v2-ttl'; h.setAttribute('aria-hidden', 'true');   // el h1 para lectores es #viewH1
    h.innerHTML = '<span class="v2-crumb"><i class="v2-dot"></i><span class="v2-cn"></span></span><div class="v2-h1"></div><div class="v2-msub"></div>';
    tb.prepend(h);
    // en el teléfono: «‹» vuelve a Tu página y el título abre la lista de pestañas
    const bk = document.createElement('button'); bk.type = 'button'; bk.className = 'v2-mback'; bk.setAttribute('aria-label', 'Tu página');
    bk.innerHTML = v2Svg('<path d="m15 18-6-6 6-6"/>'); bk.onclick = () => { const b = $('#brand'); if (b) b.click(); };
    tb.prepend(bk);
    h.addEventListener('click', () => { if (!v2Rail()) v2TabMenu(h); });
  }
  return h;
}
/* el teléfono: las etapas y sus pestañas en una lista (el título de la cabecera la abre) */
function v2TabMenu(anchor) {
  const groups = $$('#tabs .stg').filter(w => !w.classList.contains('off')).map(w => {
    const g = w.dataset.g, tabs = $$('.tab', w).filter(t => !t.hidden);
    return `<h6><i class="v2-dot" style="--v2-dc:var(--v2-g${g})"></i>${esc(V2_STAGE[g] || '')}</h6>${tabs.map(t => `<button type="button" data-tab="${ea(t.dataset.tab)}"${t.dataset.tab === UI.tab ? ' aria-current="page"' : ''}>${esc((typeof TAB_NAMES !== 'undefined' && TAB_NAMES[t.dataset.tab]) || t.textContent.trim())}</button>`).join('')}`;
  }).join('');
  const p = popover(anchor, `<div class="menu v2-tabmenu"><button type="button" data-tab="project"${UI.tab === 'project' ? ' aria-current="page"' : ''}>Proyecto</button>${groups}</div>`,
    pp => pp.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; closePop(); setTab(b.dataset.tab); }));
  return p;
}
/* debajo del título, en el teléfono: el proyecto y, en el llamado y la hoja de script, la jornada */
const V2_MSUB = {
  call: () => { try { const S = callSheet(callRef()); return S ? (S.free ? callSheetName(S) : 'jornada ' + (S.n + 1)) : ''; } catch (e) { return ''; } },
  sup: () => { try { return typeof UI.supDay === 'number' ? 'jornada ' + (UI.supDay + 1) : ''; } catch (e) { return ''; } },
};
function v2Paint() {
  if (!V2.on) return;
  const tab = typeof UI !== 'undefined' ? UI.tab : '';
  const b = tab && $(`#tabs .tab[data-tab="${tab}"]`);
  const g = b ? (b.dataset.g || 'p') : 'p';
  document.documentElement.dataset.v2g = g;
  const h = v2Head(); if (!h) return;
  const name = (typeof TAB_NAMES !== 'undefined' && TAB_NAMES[tab]) || (b ? b.textContent.trim() : '');
  $('.v2-cn', h).textContent = V2_STAGE[g] || '';
  $('.v2-h1', h).textContent = name;
  const ms = $('.v2-msub', h); if (ms && typeof P !== 'undefined' && P) { const x = V2_MSUB[tab] ? V2_MSUB[tab]() : ''; ms.textContent = (P.meta.title || '') + (x ? ' · ' + x : ''); }
  v2Acts();
  if (typeof tr === 'function' && typeof EN !== 'undefined' && EN) { $('.v2-cn', h).textContent = tr(V2_STAGE[g] || ''); $('.v2-h1', h).textContent = tr(name); }
  v2ProjSub();
}
/* ---------- las acciones de la cabecera, por pestaña (como en el PDF) ----------
   V2_ACTS[pestaña] = () => html. Sin entrada: historial y Compartir. Los botones llaman a las funciones de la v1. */
const V2_ICO = {
  hist: '<path d="M3.6 12a8.4 8.4 0 1 0 2.5-6"/><path d="M3.3 4.2v4.2h4.2"/><path d="M12 7.6V12l2.9 1.9"/>',
  down: '<path d="M12 4v11"/><path d="m7 10.5 5 5 5-5"/><path d="M5 20h14"/>',
  print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M7 14h10v6H7z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  cal: '<rect x="4" y="5.5" width="16" height="14" rx="1.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  prev: '<path d="m14.5 6-6 6 6 6"/>', next: '<path d="m9.5 6 6 6-6 6"/>',
  dots: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
};
const v2I = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${V2_ICO[k]}</svg>`;
const V2_ACTS = {};
const v2Hist = () => `<button type="button" class="v2-btn ic" data-v2a="hist" title="Historial de cambios" aria-label="Historial de cambios">${v2I('hist')}</button>`;
const v2Share = () => `<button type="button" class="v2-btn" data-v2a="share">Compartir</button>`;
const v2Export = (label = 'Exportar', ic = 'down') => `<button type="button" class="v2-btn y" data-v2a="export" aria-haspopup="menu">${v2I(ic)}<span>${esc(label)}</span></button>`;
/* las herramientas que la v1 tenía al final de la barra de cada pestaña (las propias, Ajustes y Ayuda): en la v2, «⋯» en la
   cabecera (y en el teléfono, en el «⋯» de arriba). Así no se pierde nada de lo que los proyectos ya usan. */
function v2ToolItems(tab = UI.tab) {
  const it = [];
  try { for (const x of (TOOLS_EXTRA[tab] && TOOLS_EXTRA[tab]()) || []) it.push([x[0], x[1], a => x[2](a)]); } catch (e) { }
  if (typeof SETTINGS !== 'undefined' && SETTINGS[tab]) it.push([ICO.gear, 'Ajustes', a => ACT.settings(a)]);
  if (typeof HELP !== 'undefined' && HELP[tab]) it.push([ICO.help, 'Ayuda', a => ACT.help(a)]);
  return it;
}
const v2More = () => typeof UI !== 'undefined' && v2ToolItems().length ? `<button type="button" class="v2-btn ic" data-v2a="more" aria-haspopup="menu" title="Ajustes y herramientas de esta pestaña" aria-label="Ajustes y herramientas de esta pestaña">${v2I('dots')}</button>` : '';
function v2MoreMenu(b) {
  const it = v2ToolItems();
  popover(b, `<div class="menu">${it.map((x, j) => `<button type="button" data-j="${j}">${x[0]} ${x[1]}</button>`).join('')}</div>`, p => p.addEventListener('click', e => {
    const x = e.target.closest('[data-j]'); if (!x) return; closePop();
    setTimeout(() => it[+x.dataset.j][2](b.isConnected ? b : $('.v2-acts [data-v2a="more"]') || $('#moreBtn') || b), 0);
  }));
}
const V2_DO = {
  more: b => v2MoreMenu(b),
  hist: () => { if (typeof histPanelToggle === 'function') histPanelToggle(); },
  share: b => { if (typeof shareProject === 'function') shareProject(b); },
  export: b => { if (typeof ACT !== 'undefined' && ACT.export && EXPORTS[UI.tab]) ACT.export(b); },
};
function v2Acts() {
  const tb = $('.topbar'); if (!tb) return;
  let a = $('.v2-acts', tb);
  if (!a) {
    a = document.createElement('div'); a.className = 'v2-acts'; tb.append(a);
    a.addEventListener('click', e => { const b = e.target.closest('[data-v2a]'); if (!b || b.disabled) return; const f = V2_DO[b.dataset.v2a]; if (f) f(b, e); });
  }
  const tab = UI.tab, f = V2_ACTS[tab];
  const html = v2More() + (f ? f() : v2Hist() + v2Share() + (typeof EXPORTS !== 'undefined' && EXPORTS[tab] ? v2Export() : ''));
  if (a._html !== html) { a.innerHTML = html; a._html = html; }
}
/* debajo del nombre del proyecto: cuántas escenas y páginas tiene */
function v2ProjSub() {
  const s = $('#v2ProjSub'); if (!s || typeof P === 'undefined' || !P) return;
  let n = 0, pg = '';
  try {
    const sc = typeof D !== 'undefined' && D && D.sc ? D.sc : computeScenes(P.paras);
    n = (sc.scenes || []).length;
    if (D && D.pages) pg = D.pages.length;
  } catch (e) { }
  s.textContent = v2Kind(P, pg) + ' · ' + (n === 1 ? '1 escena' : n + ' escenas');
  v2Foot();
}
/* el tipo de proyecto (Cortometraje, Largometraje, Serie…): P.meta.kind si se eligió; si no, por el largo del guion */
const V2_KINDS = ['Cortometraje', 'Largometraje', 'Serie', 'Documental', 'Videoclip', 'Publicidad', 'Otro'];
function v2Kind(p, pages) {
  if (p.meta && p.meta.kind && V2_KINDS.includes(p.meta.kind)) return p.meta.kind;
  if (typeof isSeries === 'function' && isSeries(p)) return 'Serie';
  if (p.meta && p.meta.format === 'av') return 'Publicidad';
  return (pages || 0) >= 60 ? 'Largometraje' : 'Cortometraje';
}
/* las iniciales de una persona («Ronald Ávila» → RA) */
const v2Ini = n => { const w = (typeof deaccent === 'function' ? deaccent(String(n || '')) : String(n || '')).trim().split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] || '?').slice(0, 2)).toUpperCase(); };
/* «hace 5 min», «hace 3 h», «ayer», «lunes», «12 oct» */
function v2Ago(ts) {
  if (!ts) return '';
  const d = Date.now() - ts, m = Math.round(d / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const t = new Date(ts), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
  if (t.toDateString() === y.toDateString()) return 'ayer';
  if (d < 6 * 864e5) return t.toLocaleDateString('es-PE', { weekday: 'long' });
  return t.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace('.', '');
}
/* el pie de la lateral: las personas del proyecto (el equipo de la hoja de llamado y quienes lo comparten) */
function v2People(p) {
  const seen = new Set(), out = [];
  const add = n => { n = String(n || '').trim(); if (!n || seen.has(n.toLowerCase())) return; seen.add(n.toLowerCase()); out.push(n); };
  try { (p.team || []).forEach(m => add(m.name || m.email)); } catch (e) { }
  try { (p.call && p.call.crew || []).forEach(c => add(c.name)); } catch (e) { }
  return out;
}
function v2Foot() {
  const f = $('#v2Foot'); if (!f || typeof P === 'undefined' || !P) return;
  const ppl = v2People(P);
  if (!ppl.length) { f.innerHTML = ''; return; }
  const cls = ['y', 'k'];
  const avs = ppl.slice(0, 2).map((n, i) => `<span class="v2-av ${cls[i]}" title="${ea(n)}">${esc(v2Ini(n))}</span>`).join('')
    + (ppl.length > 2 ? `<span class="v2-av">+${ppl.length - 2}</span>` : '');
  f.innerHTML = `<span class="v2-avs">${avs}</span><span class="v2-pp">${ppl.length === 1 ? '1 persona' : ppl.length + ' personas'}</span>`;
}
/* ---------- el teléfono: el «⋯» de cada pestaña y las hojas que suben desde abajo ----------
   V2_MMORE[pestaña] = () => [[clave, ícono, título, detalle]]: van arriba del menú «⋯» de la v1 (phoneMenu);
   V2_MDO[clave](botón) hace lo suyo. V2_SHEET[clave] = { tab, title, html(), cls, after(caja), closeOn: [acciones] }:
   una ventana con piezas de la v1 (sus data-act y data-bind funcionan) que se repinta con la vista. */
const V2_MMORE = {}, V2_MDO = {}, V2_SHEET = {};
{
  const _pm = phoneMenu;
  phoneMenu = function (anchor) {
    const r = _pm.apply(this, arguments);
    const on = V2.on && !document.body.classList.contains('home') && typeof P !== 'undefined' && P;
    const m = on && $('#pop .pm-menu');
    if (m) {
      const T = v2ToolItems(), own = V2_MMORE[UI.tab] ? V2_MMORE[UI.tab]() : [];
      // los botones de la cabecera (en el teléfono no se ven): Exportar, Compartir, la vista elegida…
      const seen = new Set(own.map(x => deaccent(String(x[2])).toLowerCase()));
      const A = $$('.topbar .v2-acts [data-v2a]').filter(b => !['more', 'hist'].includes(b.dataset.v2a) && !b.disabled && b.getAttribute('aria-pressed') !== 'true').map(b => {
        const g = b.closest('.v2-seg'), t = (b.textContent || '').trim() || b.getAttribute('aria-label') || b.title || '';
        return { b, n: g ? `${g.getAttribute('aria-label') || 'Vista'}: ${t}` : t, i: b.querySelector('svg') ? b.querySelector('svg').outerHTML : v2I('next') };
      }).filter(x => x.n && !seen.has(deaccent(x.n).toLowerCase()));
      const L = [...own, ...A.map((x, j) => ['act' + j, x.i, esc(x.n), '']), ...T.map((x, j) => ['tool' + j, x[0], x[1], ''])];
      if (!L.length) return r;
      T.forEach((x, j) => { V2_MDO['tool' + j] = x[2]; });
      A.forEach((x, j) => { V2_MDO['act' + j] = a => v2RunAct(x.b, a); });
      m.insertAdjacentHTML('afterbegin', L.map(([k, i, n, h]) => `<button type="button" data-v2m="${ea(k)}">${/^</.test(i) ? i : v2I(i)}<b>${/^(tool|act)\d/.test(k) ? n : esc(n)}</b>${h ? `<small>${esc(h)}</small>` : ''}</button>`).join('') + '<hr class="v2-pmhr">');
      m.addEventListener('click', e => {
        const b = e.target.closest('[data-v2m]'); if (!b) return;
        e.stopPropagation(); closePop();
        const a = anchor && anchor.isConnected ? anchor : $('#moreBtn');
        setTimeout(() => V2_MDO[b.dataset.v2m] && V2_MDO[b.dataset.v2m](a), 0);
      });
      const p = $('#pop'); if (p && anchor && anchor.getBoundingClientRect) popPlace(p, anchor.getBoundingClientRect());   // creció: cabe de nuevo en la pantalla
    }
    return r;
  };
}
/* un botón de la cabecera, desde el «⋯» del teléfono: lo que abra cuelga del «⋯» (que lleva sus datos un momento) */
function v2RunAct(b, a) {
  const f = V2_DO[b.dataset.v2a]; if (!f) return;
  const keep = {};
  for (const [k, v] of Object.entries(b.dataset)) { keep[k] = a.dataset[k]; a.dataset[k] = v; }
  try { f(a); } finally { setTimeout(() => { for (const [k, v] of Object.entries(keep)) { if (v === undefined) delete a.dataset[k]; else a.dataset[k] = v; } }, 0); }
}
/* una lista para elegir (jornada, escena…): [[valor, nombre, detalle, elegido]] */
function v2PickMenu(anchor, items, pick) {
  popover(anchor, `<div class="menu v2-tabmenu">${items.map(([v, n, m, on]) => `<button type="button" data-v="${ea(v)}"${on ? ' aria-current="page"' : ''}>${esc(n)}${m ? ` <small>${esc(m)}</small>` : ''}</button>`).join('')}</div>`,
    p => p.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; closePop(); pick(b.dataset.v); }));
}
function v2Sheet(k) {
  const d = V2_SHEET[k]; if (!d) return;
  const m = modal({ title: typeof d.title === 'function' ? d.title() : d.title, body: `<div class="v2-sh ${ea(d.cls || '')}" data-v2sheet="${ea(k)}"></div>` });
  m.classList.add('v2-sheet');
  const box = $('.v2-sh', m);
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || !box.contains(b)) return;
    const f = ACT[b.dataset.act]; if (!f) return;
    e.preventDefault(); const act = b.dataset.act; f(b, e);
    if ((d.closeOn || []).includes(act)) closeModal();
  });
  box.addEventListener('input', e => { const el = e.target.closest('[data-bind]'); if (el && BIND[el.dataset.bind]) BIND[el.dataset.bind](el, 'input'); });
  box.addEventListener('change', e => { const el = e.target.closest('[data-bind]'); if (el && BIND[el.dataset.bind]) BIND[el.dataset.bind](el, 'change'); });
  v2SheetPaint(box);
  return m;
}
function v2SheetPaint(box) {
  const d = V2_SHEET[box.dataset.v2sheet]; if (!d || UI.tab !== d.tab) return;
  box.innerHTML = d.html();
  if (d.after) d.after(box);
}
/* después de pintar la vista: la hoja abierta muestra lo nuevo (si no se está escribiendo en ella) */
function v2SheetRepaint() {
  const box = $('#modal .v2-sh'); if (!box) return;
  const d = V2_SHEET[box.dataset.v2sheet];
  if (!d || UI.tab !== d.tab) { closeModal(); return; }
  if (box.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
  v2SheetPaint(box);
}
{
  const _pts = paintTabSel;
  paintTabSel = function () { const r = _pts.apply(this, arguments); v2Paint(); return r; };
  const _render = render;
  render = function () { const r = _render.apply(this, arguments); v2Paint(); v2SheetRepaint(); return r; };
}
