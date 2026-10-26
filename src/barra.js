/* ============================================================
   Barra de cada pestaña: ⚙ Ajustes, ayuda (?) y Exportar ▾
   + consejos que se cierran y no vuelven, y pestañas a elección.
   Cada pestaña registra lo suyo en SETTINGS, HELP y EXPORTS.
   ============================================================ */
const SETTINGS = {};   // pestaña → () => html (los controles usan data-act y data-bind, como en la vista)
const HELP = {};       // pestaña → [[título, texto], …]
const EXPORTS = {};    // pestaña → () => [{ label, hint, run(btn) }]
const EXPORTS_NOTE = {};   // pestaña → () => html: un aviso arriba del menú Exportar (lo que falta antes de enviar)
const TAB_NAMES = { build: 'Historia', script: 'Guion', project: 'Proyecto', lined: 'Guion rayado', breakdown: 'Desglose', scout: 'Scouting', casting: 'Casting', board: 'Storyboard', animatic: 'Animatic', plan: 'Plan de rodaje', cal: 'Calendario', call: 'Hoja de llamado', budget: 'Presupuesto', sup: 'Hoja de script' };
/* íconos dibujados (en vez de emojis, que cambian según el sistema): heredan el color y el tamaño del texto */
const ICO = {
  palette: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.9-.8 1.9-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.6 1.6-1.6h2.1a3.9 3.9 0 0 0 3.9-3.9C20.5 6.9 16.7 3.5 12 3.5z"/><circle cx="7.6" cy="11.4" r="1.2" fill="currentColor" stroke="none"/><circle cx="10.3" cy="7.6" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.6" cy="7.8" r="1.2" fill="currentColor" stroke="none"/></svg>',
  gear: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M18 7h2M4 17h2M11 17h9"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="8.5" cy="17" r="2.3"/></svg>',
  help: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6M12 17h.01"/></svg>',
  chev: '<svg class="ic ic-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>',
  check: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="1.5"/><path d="M9 4V2.8h6V4"/><path d="m9 13 2.2 2.2L15.5 11"/></svg>',
  more: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor" stroke="none"/></svg>',
  list: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="17.5" r="1" fill="currentColor" stroke="none"/></svg>',
  undo: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  redo: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></svg>',
  lock: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  cut: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
  edit: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>',
  warn: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  start: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 6l-9 6 9 6z"/></svg>',
  end: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 6l9 6-9 6z"/></svg>',
  plus: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  scripts: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3.5h8.5L20 7v10.5a1.5 1.5 0 0 1-1.5 1.5H8A1.5 1.5 0 0 1 6.5 17.5V5A1.5 1.5 0 0 1 8 3.5z"/><path d="M16.5 3.5V7H20M9.5 10h7M9.5 13h7M9.5 16h4"/><path d="M6.5 6.5H5A1.5 1.5 0 0 0 3.5 8v12A1.5 1.5 0 0 0 5 21.5h10"/></svg>',
  pin: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
  share: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/></svg>',
  // los que faltaban (antes cada pestaña dibujaba el suyo o usaba un carácter: ✕ ✓ ‹ › ⋯ 🔒)
  close: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  ok: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  prev: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg>',
  next: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>',
  search: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.5 4.5"/></svg>',
  camera: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5A1.5 1.5 0 0 1 5 7h2.6l1.6-2.2h5.6L16.4 7H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/><circle cx="12" cy="12.8" r="3.4"/></svg>',
  trash: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12M10 11v5.5M14 11v5.5"/></svg>',
  eye: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
  image: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17.5 4.6-4.6 3.4 3.4 2.6-2.6 5.4 5.3"/></svg>',
  team: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.6-3.4 3-5.2 6-5.2s5.4 1.8 6 5.2"/><circle cx="16.8" cy="8.6" r="2.5"/><path d="M16.8 13.4c2.1 0 3.7 1.4 4.2 4"/></svg>',
};
/* acciones de más para el «⋯» del teléfono: TOOLS_EXTRA[pestaña] = () => [[ícono, nombre, fn], …] */
const TOOLS_EXTRA = {};
/* al final de cada barra: ayuda (?), Exportar y «⋯» (solo ícono) con los ajustes de la pestaña */
/* (la ayuda de la pestaña está en el «?» de la barra de arriba: «Cómo se usa…»; en el teléfono, en este «⋯») */
const toolsHTML = () => (EXPORTS[UI.tab] ? `<button class="btn hide-sm" data-act="export" aria-haspopup="menu" aria-label="Exportar" title="Exportar"><span>Exportar</span>${ICO.chev}</button>` : '')
  + (SETTINGS[UI.tab] ? `<button class="btn ghost qbtn hide-sm set-more" data-act="settings" aria-haspopup="dialog" title="Ajustes de esta pestaña" aria-label="Ajustes de esta pestaña">${ICO.more}</button>` : '')
  // en el teléfono las tres van juntas en «⋯»
  + (SETTINGS[UI.tab] || HELP[UI.tab] || EXPORTS[UI.tab] || TOOLS_EXTRA[UI.tab] ? `<button class="btn ghost icon only-sm tools-more" data-act="tools-more" aria-haspopup="menu" aria-label="Ajustes, ayuda y exportar" title="Más">${ICO.more}</button>` : '');

/* ---------- desplegables de las barras: un menú como los de la app en vez de la lista del navegador ----------
   (con el ratón y con el teclado; en el teléfono queda la lista del sistema, que es más cómoda con el dedo) */
const SELM = { skip: null };
function selMenu(s) {
  const vals = [...s.options].map(o => o.value);
  const row = o => `<button type="button" role="option" data-i="${o.index}" aria-selected="${ea(o.selected)}" ${o.disabled ? 'disabled' : ''}>${esc(o.textContent)}</button>`;
  const body = [...s.children].map(c => c.tagName === 'OPTGROUP' ? `<h6>${esc(c.label)}</h6>${[...c.children].map(row).join('')}` : c.tagName === 'OPTION' ? row(c) : '').join('');
  const p = popover(s, `<div class="menu selmenu" role="listbox" aria-label="${ea(s.getAttribute('aria-label') || '')}">${body}</div>`, pp => {
    pp.classList.add('pop-sel'); pp._sel = s;
    pp.style.minWidth = Math.max(180, s.getBoundingClientRect().width) + 'px';
    repos(pp, s);
    pp.addEventListener('click', e => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      const val = vals[+b.dataset.i];
      closePop();
      // si la vista se repintó mientras el menú estaba abierto (llegó una imagen), el desplegable es otro: el mismo dato
      const t = s.isConnected ? s : (s.dataset.bind && $(`select[data-bind="${CSS.escape(s.dataset.bind)}"]${s.dataset.id ? `[data-id="${CSS.escape(s.dataset.id)}"]` : ''}`)) || s;
      t.focus();
      if (t.value === val) return;
      t.value = val;
      t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  const cur = $('[aria-selected="true"]', p) || $('[data-i]', p);
  if (cur) { cur.scrollIntoView({ block: 'nearest' }); cur.focus({ preventScroll: true }); }
}
const selMenuOk = e => { const s = e.target.closest && e.target.closest('.bar select:not([multiple])'); return s && !s.disabled && !matchMedia('(pointer:coarse)').matches ? s : null; };
document.addEventListener('pointerdown', e => { const s = selMenuOk(e), p = $('#pop'); SELM.skip = s && p && p._sel === s ? s : null; }, true);
document.addEventListener('mousedown', e => {
  const s = selMenuOk(e); if (!s || e.button !== 0) return;
  e.preventDefault();
  if (SELM.skip === s) { SELM.skip = null; return; }   // un segundo clic lo cierra
  s.focus(); selMenu(s);
}, true);
document.addEventListener('keydown', e => {
  const s = selMenuOk(e); if (!s) return;
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'F4' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp'))) { e.preventDefault(); selMenu(s); }
}, true);

/* ---------- consejos: se muestran hasta que se cierran ---------- */
const tipsSeen = () => ls.get('tips', {});
const TIP_LOG = {};   // pestaña → los consejos que tiene (también los ya cerrados): se leen en su ayuda
function tipHTML(id, html) {
  if (typeof UI !== 'undefined' && UI.tab) (TIP_LOG[UI.tab] || (TIP_LOG[UI.tab] = new Map())).set(id, html);
  if (tipsSeen()[id]) return '';
  return `<div class="tip" data-tip="${ea(id)}">${HD_ICO.info.replace('class="ic"', 'class="ic tip-i"')}<span class="tip-t">${html}</span><button class="tip-x" data-act="tip-x" data-tip="${ea(id)}" aria-label="Cerrar consejo" title="No volver a mostrar">${ICO.close}</button></div>`;
}
/* aviso breve la primera vez que aparece una función que no se ve a simple vista (doblar el cuerpo, el cubo,
   arrastrar viñetas): una burbuja junto a donde se usa, que se cierra con «Entendido» o sola, y no vuelve */
let COACH_LAST = 0;
// tapado por algo a pantalla completa (la planta del editor de plano): el aviso no se ve sobre ella
const coachHidden = anchor => { const f = document.querySelector('.sx-plan.full, .sx-view.full'); return !!f && !f.contains(anchor); };
function coach(id, text, anchor, { below = false, ms = 11000 } = {}) {
  if (!anchor || !anchor.isConnected || !anchor.getClientRects().length || document.body.classList.contains('home') || tipsSeen()[id] || document.querySelector('.coach') || $('#ask') || $('#pop') || $('.nf') || $('#notesPanel.open') || $('.acc-ed') || coachHidden(anchor)) return;
  // de a uno: después de un aviso, el siguiente espera unos minutos (no uno nuevo en cada pestaña que se abre)
  if (Date.now() - COACH_LAST < 180000) return;
  COACH_LAST = Date.now();
  const s0 = tipsSeen(); s0[id] = 1; ls.set('tips', s0);
  const c = document.createElement('div');
  c.className = 'coach'; c.setAttribute('role', 'status');
  c.innerHTML = `<span>${esc(text)}</span><button type="button">Entendido</button>`;
  document.body.appendChild(c);
  const r = anchor.getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight;
  const x = clamp(r.left + r.width / 2 - w / 2, 10, innerWidth - w - 10);
  const y = below || r.top - h - 10 < 8 ? Math.min(innerHeight - h - 10, r.bottom + 10) : r.top - h - 10;
  c.style.left = x + 'px'; c.style.top = y + 'px';
  const off = () => { clearTimeout(tm); c.remove(); removeEventListener('keydown', esc1, true); };
  const esc1 = e => { if (e.key === 'Escape') { e.stopImmediatePropagation(); off(); } };
  const tm = setTimeout(off, ms);
  // se va solo si lo que señala desaparece o queda tapado por una ventana
  const watch = setInterval(() => { const m = $('#modal'); if (!c.isConnected) clearInterval(watch); else if (!anchor.isConnected || !anchor.getClientRects().length || document.body.classList.contains('home') || (m && !m.contains(anchor)) || (!m && anchor.closest('.modal[hidden]')) || $('#pop') || $('.nf') || $('#notesPanel.open') || $('.acc-ed') || coachHidden(anchor)) { clearInterval(watch); off(); } }, 400);
  c.querySelector('button').onclick = off;
  c._off = off;                    // coachClose() (al volver a Inicio) lo cierra con su propia limpieza
  addEventListener('keydown', esc1, true);
  return c;
}
const coachClose = () => $$('.coach').forEach(c => c._off ? c._off() : c.remove());

/* código de color escrito a mano: «c8382c», «#C83», «#c8382c» → «#c8382c» (o null si no es un color) */
const normHex = v => {
  let h = String(v || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = [...h].map(c => c + c).join('');
  return /^[0-9a-f]{6}$/i.test(h) ? '#' + h.toLowerCase() : null;
};
/* el popover se mide antes de su clase; al cambiar de ancho se vuelve a encajar en la pantalla */
function repos(p, anchor) { popPlace(p, anchor.getBoundingClientRect()); }
/* ---------- popover con controles vivos: data-act y data-bind funcionan igual que en la vista ---------- */
function livePop(anchor, title, build) {
  return popover(anchor, `<h5>${esc(title)}</h5><div class="lp">${build()}</div>`, p => {
    p.classList.add('pop-set'); repos(p, anchor);
    const refresh = () => { if ($('#pop') === p) $('.lp', p).innerHTML = build(); };
    p.addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (!b || !ACT[b.dataset.act]) return;
      e.preventDefault();
      const keep = !b.hasAttribute('data-pclose');
      if (!keep) closePop();
      ACT[b.dataset.act](b, e);
      if (keep) refresh();
    });
    p.addEventListener('input', e => { const el = e.target.closest('[data-bind]'); if (el && BIND[el.dataset.bind]) BIND[el.dataset.bind](el, 'input'); });
    p.addEventListener('change', e => { const el = e.target.closest('[data-bind]'); if (el && BIND[el.dataset.bind]) { BIND[el.dataset.bind](el, 'change'); refresh(); } });
  });
}
function helpHTML(t) {
  const tips = TIP_LOG[t] ? [...TIP_LOG[t].values()] : [];
  return `<div class="help">${HELP[t].map(([h, x]) => `<div><b>${h}</b><span>${x}</span></div>`).join('')}${tips.length ? `<div><b>Consejos</b>${tips.map(x => `<span>${x}</span>`).join('')}</div>` : ''}</div>
    ${Object.keys(tipsSeen()).length ? '<div class="menu"><hr><button data-tips>Mostrar otra vez los consejos</button></div>' : ''}`;
}
/* ---------- el teléfono: la pantalla de trabajo lo más limpia posible ----------
   · la barra de cada pestaña en una sola línea: las vistas (Meses / Línea de tiempo / Tablero…) en un selector y lo
     marcado con .m-more (botones y campos de menos uso) en el «⋯» de la barra;
   · la leyenda, plegada en un botón con sus colores (se abre al tocarlo). */
const PHONE = () => matchMedia('(max-width: 760px)').matches;
const PB = { lgd: ls.get('lgdOpen', {}) || {} };   // por pestaña: la leyenda abierta (se recuerda en esta computadora)
/* la leyenda de colores, plegada en un botón «Leyenda» con sus primeros colores (en la computadora y en el teléfono):
   la fila completa aparece al tocarlo y queda abierta en esa pestaña hasta cerrarla */
function legendFold() {
  const bar = $('#view .bar'); if (!bar || bar.classList.contains('hide-sm')) return;
  const lg = $('#view .lgd');
  if (!lg || $('.lgd-btn', bar)) return;
  const cs = $$('.lgc i', lg).slice(0, 4).map(i => i.getAttribute('style') || '');
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn ghost lgd-btn'; b.title = 'Qué significa cada color (se cambia tocándolo)';
  b.innerHTML = `<span class="lgd-sw" aria-hidden="true">${cs.map(st => `<i style="${ea(st)}"></i>`).join('') || '<i></i>'}</span><span class="lgd-l">Leyenda</span>`;
  const open = !!PB.lgd[UI.tab];
  lg.classList.toggle('m-open', open); b.setAttribute('aria-expanded', String(open));
  if (!lg.id) lg.id = 'lgd-' + UI.tab; b.setAttribute('aria-controls', lg.id);
  b.onclick = () => { const o = !lg.classList.contains('m-open'); PB.lgd[UI.tab] = o; ls.set('lgdOpen', PB.lgd); lg.classList.toggle('m-open', o); b.setAttribute('aria-expanded', String(o)); };
  bar.insertBefore(b, $('[data-act="export"]', bar) || $('.tools-more', bar) || $('.set-more', bar) || null);
}
function phoneBars() {
  legendFold();
  if (!PHONE()) return;
  const bar = $('#view .bar'); if (!bar || bar.classList.contains('hide-sm')) return;
  // las vistas: con tres o más (o si la barra no cabe), un selector con la elegida
  const segs = $$(':scope > :is(.seg,.hd-seg):not(.seg-sep):not(.m-pick):not(.hide-sm)', bar).filter(sg => $$(':scope > button', sg).length >= 2);
  const pick = sg => {
    const bs = $$(':scope > button', sg), cur = bs.find(x => x.getAttribute('aria-pressed') === 'true') || bs[0];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn seg-pick'; b.setAttribute('aria-haspopup', 'menu');
    b.innerHTML = `<span>${esc(cur ? cur.textContent.trim() : '')}</span>${ICO.chev}`;
    b.onclick = () => popover(b, `<div class="menu">${bs.map((x, i) => `<button data-i="${i}"${x === cur ? ' aria-current="true"' : ''}>${esc(x.textContent.trim())}</button>`).join('')}</div>`,
      p => p.addEventListener('click', e => { const y = e.target.closest('[data-i]'); if (!y) return; closePop(); bs[+y.dataset.i].click(); }));
    sg.classList.add('m-pick'); sg.before(b);
  };
  segs.filter(sg => $$(':scope > button', sg).length >= 3).forEach(pick);
  for (const sg of segs.filter(x => !x.classList.contains('m-pick')).sort((a, b) => b.offsetWidth - a.offsetWidth)) { if (bar.scrollWidth <= bar.clientWidth + 1) break; pick(sg); }
}
/* las pestañas hermanas (las de la misma etapa, en el orden de la franja) y el nombre de la etapa */
const tabStage = t => { const b = document.getElementById('tab-' + t); return b ? b.closest('.stg') : null; };
const tabSiblings = t => { const w = tabStage(t); return w ? $$('.tab', w).filter(x => !x.hidden || x.dataset.tab === t).map(x => x.dataset.tab) : [t]; };
const stageName = t => { const w = tabStage(t); return w ? ($('.stg-n', w) || {}).textContent || '' : ''; };
/* en el teléfono, nombres cortos para la barra */
const TAB_SHORT = { lined: EN ? trDone('Lined') : 'Rayado', plan: 'Plan', call: 'Llamado', sup: 'Script', budget: 'Presupuesto', breakdown: 'Desglose' };
/* dónde se está y a un clic de las hermanas: en la computadora, una franja fija arriba de cada pestaña con las pestañas
   de su etapa (siempre igual, en todas); en el teléfono, el nombre de la abierta al inicio de su barra, con un menú de
   sus hermanas */
function tabStripPaint() {
  const host = $('#banners'); if (!host) return;
  let st = $('#tabStrip');
  if (PHONE() || typeof P === 'undefined' || !P) { if (st) st.remove(); return; }
  const t = UI.tab, sib = t === 'project' ? ['project'] : tabSiblings(t), sn = t === 'project' ? '' : stageName(t);
  if (!st) { st = document.createElement('nav'); st.id = 'tabStrip'; st.className = 'tabstrip'; host.appendChild(st); }
  st.setAttribute('aria-label', sn ? 'Pestañas de ' + sn : 'Proyecto');
  // cada pestaña con su ícono de color (la familia de su etapa: .icg0 … .icg4)
  const grp = k => { const b = document.getElementById('tab-' + k); return b && b.dataset.g != null ? b.dataset.g : ''; };
  const ico = k => typeof tabIco === 'function' && TAB_ICO[k] ? `<span class="ts-ic icg${ea(grp(k))}">${tabIco(k)}</span>` : '';
  // sin el nombre de la etapa (parecía una pestaña): la etapa se reconoce por su color y por la barra de la izquierda
  st.innerHTML = `${sib.map(k => `<button type="button" data-tabgo="${ea(k)}"${k === t ? ' aria-current="page"' : ''}>${ico(k)}<span>${esc(TAB_NAMES[k] || k)}</span></button>`).join('')}`;
}
function barTabName() {
  legendFold();   // antes de medir: el botón de la leyenda también ocupa la barra
  tabStripPaint();
  if (!PHONE()) return;
  const bar = $$('#view .bar').find(b => !b.closest('.side, .insp')); if (!bar || $(':scope > .bar-nav', bar)) return;
  const t = UI.tab, sib = tabSiblings(t);
  const nm = k => TAB_SHORT[k] || TAB_NAMES[k] || k;
  const mk = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
  const el = sib.length < 2 ? mk(`<b class="bar-nav bar-tn">${esc(nm(t))}</b>`)
    : mk(`<button type="button" class="btn bar-nav bar-pick" aria-haspopup="menu" aria-label="${ea(TAB_NAMES[t] + ': cambiar a otra pestaña de ' + stageName(t))}">${esc(nm(t))}${ICO.chev}</button>`);
  bar.prepend(el);
  if (el.classList.contains('bar-pick')) el.onclick = () => popover(el, `<div class="menu bar-pm" role="menu" aria-label="${ea('Pestañas de ' + stageName(t))}">${sib.map(k => `<button type="button" role="menuitem" data-tabgo="${ea(k)}"${k === t ? ' aria-current="page"' : ''}>${typeof tabIco === 'function' ? `<span class="qk-ico icg${ea((document.getElementById('tab-' + k) || { dataset: {} }).dataset.g || '')}">${tabIco(k)}</span>` : ''}<span>${esc(TAB_NAMES[k])}</span></button>`).join('')}</div>`,
    p => p.addEventListener('click', e => { const b = e.target.closest('[data-tabgo]'); if (!b) return; closePop(); if (b.dataset.tabgo !== UI.tab) setTab(b.dataset.tabgo); }));
}
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.tabstrip [data-tabgo]'); if (b && b.dataset.tabgo !== UI.tab) setTab(b.dataset.tabgo); });

/* ---------- ir rápido: Ctrl + K y Alt + 1…5 ----------
   Ctrl + K abre «Ir a…»: se escribe y aparecen las pestañas, los temas de la ayuda de cada una y los atajos.
   Alt + número: la etapa de ese número (a su última pestaña); otra vez, la pestaña siguiente de la misma etapa. */
/* «Alt + n» de la etapa de una pestaña (para mostrarlo en «Ir a…») */
const stageKey = t => { const w = tabStage(t), L = $$('#tabs .stg:not(.off)'), i = w ? L.indexOf(w) : -1; return i >= 0 && i < 9 ? 'Alt + ' + (i + 1) : ''; };
const railTabs = () => $$('#tabs .stg .tab').filter(b => !b.hidden && (typeof canSeeTab !== 'function' || canSeeTab(b.dataset.tab))).map(b => b.dataset.tab);
const fold = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const plain = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent || ''; };
const KEYS = [
  ['En todo el programa', [['Ctrl + K', 'Ir a una pestaña, a un tema de la ayuda o a estos atajos'], ['Alt + 1…5', 'La etapa de ese número; otra vez, su pestaña siguiente'], ['Ctrl + Z · Ctrl + Mayús + Z', 'Deshacer y rehacer'], ['Esc', 'Cierra el menú o la ventana de arriba'], ['Flechas', 'Recorren los menús y las etapas de la franja']]],
  ['Guion', [['Intro', 'Pasa al párrafo siguiente'], ['Tab · Mayús + Tab', 'Cambia el tipo de párrafo'], ['Ctrl + 1…7', 'Escena, acción, personaje, acotación, diálogo, transición y plano'], ['Ctrl + B · I · U', 'Negrita, itálica y subrayado'], ['Ctrl + F', 'Buscar en el guion'], ['Ctrl + Intro', 'En AV: agrega una fila']]],
  ['Plan de rodaje y Calendario', [['Mayús + clic · Ctrl + clic', 'Elige varias escenas o tareas'], ['Arrastrar desde un espacio vacío', 'Elige varias de un trazo']]],
  ['Animatic', [['Espacio', 'Reproduce o pausa'], ['J · K · L', 'Atrás, pausa y adelante'], ['← →', 'Un cuadro (con Mayús, un segundo)'], ['↑ ↓', 'Al corte anterior o siguiente'], ['S · Ctrl + B', 'Divide el clip en el cabezal'], ['Q · W', 'Quita el comienzo o el final'], ['C', 'Cuchilla'], ['Ctrl + D', 'Duplica']]],
];
function keysHTML() { return `<div class="keys">${KEYS.map(([g, list]) => `<section><h5>${esc(g)}</h5><dl>${list.map(([k, d]) => `<dt>${k.split(' · ').map(x => `<span>${x.split(' + ').map(y => `<kbd>${esc(y)}</kbd>`).join(' + ')}</span>`).join(`<i>${EN ? 'or' : 'o'}</i>`)}</dt><dd>${esc(d)}</dd>`).join('')}</dl></section>`).join('')}</div>`; }
function keysDialog() { modal({ title: 'Atajos de teclado', body: keysHTML(), wide: true }); }
function quickItems() {
  const out = [], rail = railTabs(), can = t => typeof canSeeTab !== 'function' || canSeeTab(t);
  for (const t of Object.keys(TAB_NAMES)) if (can(t) && RENDER[t]) out.push({ k: 'tab', t, label: TAB_NAMES[t], sub: t === 'project' ? 'Datos, logos y equipo' : stageName(t), key: stageKey(t) });
  out.push({ k: 'keys', label: 'Atajos de teclado', sub: 'Todos, por pestaña' });
  if (EXPORTS[UI.tab]) out.push({ k: 'export', label: EN ? trDone('Export: ' + tr(TAB_NAMES[UI.tab])) : 'Exportar: ' + TAB_NAMES[UI.tab], sub: 'PDF y Excel de esta pestaña' });
  for (const [t, list] of Object.entries(HELP)) if (can(t) && TAB_NAMES[t]) list.forEach(([h, x], i) => out.push({ k: 'help', t, i, label: h, sub: 'Ayuda · ' + TAB_NAMES[t], text: plain(x) }));
  return out;
}
function quickOpen() {
  if (typeof P === 'undefined' || !P || document.body.classList.contains('home')) return;
  closePop();
  const all = quickItems();
  const m = modal({ title: 'Ir a…', body: `<div class="qk"><input type="text" class="qk-in" placeholder="Una pestaña, un tema de la ayuda o «atajos»" aria-label="Buscar pestañas, ayuda y atajos" role="combobox" aria-expanded="true" aria-controls="qkL" aria-autocomplete="list" autocomplete="off" spellcheck="false"><div class="qk-l" id="qkL" role="listbox" aria-label="Resultados"></div><p class="qk-f"><kbd>↑</kbd> <kbd>↓</kbd> para elegir · <kbd>Intro</kbd> para ir · <kbd>Esc</kbd> para cerrar</p></div>` });
  m.classList.add('qk-modal');
  const inp = $('.qk-in', m), L = $('.qk-l', m);
  let cur = 0, list = [];
  const paint = () => {
    const q = fold(inp.value).split(/\s+/).filter(Boolean);
    list = !q.length ? all.filter(x => x.k !== 'help') : all.filter(x => { if (x.hay == null) x.hay = fold(x.label + ' ' + x.sub + ' ' + (x.text || '') + (EN && typeof tr === 'function' ? ' ' + tr(x.label) + ' ' + tr(x.sub) + ' ' + tr(x.text || '') : '')); return q.every(w => x.hay.includes(w)); })
      .sort((a, b) => (fold(b.label).startsWith(q[0]) - fold(a.label).startsWith(q[0])) || (['tab', 'keys', 'export', 'help'].indexOf(a.k) - ['tab', 'keys', 'export', 'help'].indexOf(b.k)));
    list = list.slice(0, 14); cur = Math.min(cur, Math.max(0, list.length - 1));
    L.innerHTML = list.length ? list.map((x, i) => `<div class="qk-it${i === cur ? ' on' : ''}" role="option" id="qk${i}" aria-selected="${i === cur}" data-i="${i}">${x.k === 'tab' && typeof tabIco === 'function' && TAB_ICO[x.t] ? `<span class="qk-ico icg${ea((document.getElementById('tab-' + x.t) || { dataset: {} }).dataset.g || '')}">${tabIco(x.t)}</span>` : x.k === 'tab' ? ICO.gear : x.k === 'help' ? ICO.help : x.k === 'keys' ? ICO.list : ICO.share}<span class="qk-t"><b>${esc(x.label)}</b><small>${esc(x.sub)}</small></span>${x.key ? `<kbd>${esc(x.key)}</kbd>` : x.k === 'tab' && x.t === UI.tab ? '<small class="qk-here">Aquí</small>' : ''}</div>`).join('')
      : `<p class="qk-none"><b>Sin resultados.</b> <span>Prueba con el nombre de una pestaña o una palabra de la ayuda.</span></p>`;
    inp.setAttribute('aria-activedescendant', list.length ? 'qk' + cur : '');
  };
  const go = i => {
    const x = list[i]; if (!x) return;
    closeModal();
    if (x.k === 'tab') { if (x.t !== UI.tab) setTab(x.t); return; }
    if (x.k === 'keys') { keysDialog(); return; }
    if (x.k === 'export') { const b = $('#view .bar [data-act="export"]') || $('#view .bar .tools-more'); if (b) ACT.export(b); return; }
    if (x.k === 'help') {
      if (x.t !== UI.tab) setTab(x.t);
      requestAnimationFrame(() => { const b = $('#view .bar [data-act="help"]') || $('#helpBtn'); ACT.help(b); const p = $('#pop .help'); const it = p && p.children[x.i]; if (it) { it.classList.add('on'); it.scrollIntoView({ block: 'nearest' }); } });
    }
  };
  inp.addEventListener('input', () => { cur = 0; paint(); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!list.length) return; cur = (cur + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length; paint(); const a = $('#qk' + cur, m); if (a) a.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); go(cur); }
  });
  L.addEventListener('click', e => { const it = e.target.closest('[data-i]'); if (it) go(+it.dataset.i); });
  L.addEventListener('pointermove', e => { const it = e.target.closest('[data-i]'); if (it && +it.dataset.i !== cur) { cur = +it.dataset.i; $$('.qk-it', L).forEach((x, i) => { x.classList.toggle('on', i === cur); x.setAttribute('aria-selected', i === cur); }); inp.setAttribute('aria-activedescendant', 'qk' + cur); } });
  paint();
  setTimeout(() => inp.focus(), 30);
}
/* una ventana o un editor a pantalla completa encima: los atajos de navegación no la saltan */
const overlayOpen = () => !!($('.modal:not([hidden])') || $('#ask') || $('.s2') || $('.acc-ed') || $('.ph-view') || $('#fichaModal') || $('#phModal') || $('#fpModal'));
addEventListener('keydown', e => {
  if (e.defaultPrevented || e.isComposing) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && !e.altKey && (e.key === 'k' || e.key === 'K')) {
    if ($('#modal.qk-modal')) { e.preventDefault(); closeModal(); return; }
    if (overlayOpen()) return;
    e.preventDefault(); quickOpen(); return;
  }
  if (e.altKey && !mod && !e.shiftKey && /^Digit[1-9]$/.test(e.code)) {
    // escribiendo no: en el Mac, Opción + 2 es la arroba (y otras teclas, otros signos)
    const a = document.activeElement;
    if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
    if (typeof P === 'undefined' || !P || overlayOpen() || document.body.classList.contains('home')) return;
    const w = $$('#tabs .stg:not(.off)')[+e.code.slice(5) - 1]; if (!w) return;
    e.preventDefault(); stageGo(w, true);
  }
});

/* lo que la barra manda al «⋯» en el teléfono (.m-more): botones y campos */
function phoneMoreItems() {
  if (!PHONE()) return [];
  return $$('#view .bar .m-more').map(el => {
    if (el.matches('label, .fld')) {
      const lab = ($('span', el) || el).textContent.trim(), inp = $('input, select', el);
      const val = inp ? (inp.type === 'date' && inp.value ? fmtDate(new Date(inp.value + 'T12:00')) : inp.value) : '';
      const bind = inp && inp.dataset.bind;
      // el campo tal cual (el de la barra, que se repinta: se busca de nuevo cada vez), sin su rótulo, que va de título
      const html = () => { const cur = (bind && $(`#view .bar [data-bind="${CSS.escape(bind)}"]`)) || inp, f = (cur && cur.closest('.m-more')) || el, c = f.cloneNode(true);
        c.classList.remove('m-more'); const sp = $(':scope > span', c); if (sp) sp.remove(); return c.outerHTML; };
      return [ICO.gear, esc(lab) + (val ? ` <small>${esc(val)}</small>` : ''), a => livePop(a, lab, html)];
    }
    return [ICO.plus, esc((el.textContent.trim() || el.getAttribute('aria-label') || '').replace(/^\+\s*/, '')), () => el.click()];
  });
}
/* el menú de la barra de arriba en el teléfono (⋯ o la cuenta): proyectos, guardado, ayuda e idioma */
function phoneMenu(anchor) {
  const me = API() && APITEAM.me, why = unsavedWhy();
  const st = $('#saveState'), stTxt = st ? (st.title || st.textContent || '').trim() : '';
  const I = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const it = [];
  if (me) it.push(['acct', `<span class="pm-av">${me.picture ? `<img src="${ea(me.picture)}" alt="" referrerpolicy="no-referrer">` : esc((me.name || me.email || '?').trim()[0].toUpperCase())}</span>`, esc(me.name || 'Tu cuenta'), esc(me.email || '')]);
  if (why) it.push(['save', I('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'), 'No se guarda', 'Ver por qué y cómo guardarlo']);
  else if (stTxt && typeof P !== 'undefined' && P && !document.body.classList.contains('home')) it.push(['', I('<path d="m5 12 4.5 4.5L19 7"/>'), esc(stTxt), '']);
  if (st && $('.bk', st)) it.push(['bk', I('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'), esc($('.bk', st).textContent.trim()), 'Una copia en tu equipo']);
  if (typeof P !== 'undefined' && P && !document.body.classList.contains('home')) it.push(['proj', I('<path d="M4 7h9M18 7h2M4 17h2M11 17h9"/><circle cx="15.5" cy="7" r="2.3"/><circle cx="8.5" cy="17" r="2.3"/>'), esc(P.meta.title || 'Proyecto'), 'Datos del proyecto, logos y equipo']);
  it.push(['open', I('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H7.5a2 2 0 0 0-1.9 1.4L3 19z"/>'), 'Proyectos', 'Abrir, compartir y archivar']);
  it.push(['view', I('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'), 'Personalización', 'Modo, pestañas, colores y letra']);   // en el teléfono, el «⋯» de las pestañas no cabe en la barra
  it.push(['help', I('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6M12 17h.01"/>'), 'Ayuda y soporte', '']);
  popover(anchor, `<div class="menu help-m pm-menu">${it.map(([k, i, n, h]) => k
    ? `<button data-pm="${k}">${i}<b>${n}</b>${h ? `<small>${h}</small>` : ''}</button>`
    : `<div class="pm-st">${i}<span>${n}</span></div>`).join('')}
    <button data-pm="lang" data-no-tr>${I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>')}<b>${EN ? 'Language' : 'Idioma'}</b><small>${EN ? 'English · cambiar a Español' : 'Español · switch to English'}</small></button></div>`,
    p => {
      p.classList.add('pop-helpm');
      p.addEventListener('click', e => {
        const b = e.target.closest('[data-pm]'); if (!b) return; closePop();
        const k = b.dataset.pm, a = anchor.isConnected ? anchor : $('#moreBtn');
        setTimeout(() => {
          if (k === 'acct' && typeof accountMenu === 'function') accountMenu(a);
          else if (k === 'save') unsavedPop(a);
          else if (k === 'bk') backupProject();
          else if (k === 'proj') setTab('project');
          else if (k === 'open') openMenu(a);
          else if (k === 'help') helpMenu(a);
          else if (k === 'view') lookPanel('me');   // Personalización › Tu pantalla (leyenda.js)
          else if (k === 'lang') langSet(EN ? 'es' : 'en');
        }, 0);
      });
    });
}
/* un bloque que en el teléfono se pliega a su primera línea (data-mfold) y se abre al tocarla */
const MFOLD = {};
document.addEventListener('click', e => {
  const h = e.target.closest('[data-mfold] > .mf-h'); if (!h || !PHONE()) return;
  const w = h.parentElement, o = !w.classList.contains('m-open');
  w.classList.toggle('m-open', o); MFOLD[w.dataset.mfold] = o; h.setAttribute('aria-expanded', String(o));
});
const mfold = (k, cls = '') => `data-mfold="${ea(k)}" class="${ea(cls + (MFOLD[k] ? ' m-open' : ''))}"`;

/* se suman a ACT en tab-script.js, donde se define */
const BARRA_ACT = {
  'tools-more': b => {
    const t = UI.tab, it = [], ex = [...((TOOLS_EXTRA[t] && TOOLS_EXTRA[t]()) || []), ...phoneMoreItems()];
    ex.forEach((x, j) => it.push(['x' + j, x[0], x[1]]));
    if (SETTINGS[t]) it.push(['settings', ICO.gear, 'Ajustes']);
    if (HELP[t]) it.push(['help', ICO.help, 'Ayuda']);
    if (EXPORTS[t]) it.push(['export', ICO.share, 'Exportar…']);
    popover(b, `<div class="menu">${it.map(([a, i, n]) => `<button data-m="${ea(a)}">${i} ${n}</button>`).join('')}</div>`, p => p.addEventListener('click', e => {
      const x = e.target.closest('[data-m]'); if (!x) return; closePop();
      const m = x.dataset.m, a = b.isConnected ? b : $('.bar .tools-more') || b;
      setTimeout(() => /^x\d+$/.test(m) ? ex[+m.slice(1)][2](a) : ACT[m](a), 0);
    }));
  },
  settings: b => { const t = UI.tab; if (SETTINGS[t]) livePop(b, 'Ajustes · ' + TAB_NAMES[t], SETTINGS[t]); },
  help: b => {
    const t = UI.tab; if (!HELP[t]) return;
    const p = popover(b, `<h5>${esc(TAB_NAMES[t])}: cómo se usa</h5>${helpHTML(t)}`);
    p.classList.add('pop-help'); repos(p, b);
    const r = $('[data-tips]', p); if (r) r.onclick = () => { ls.set('tips', {}); closePop(); render(); };
  },
  export: b => {
    const list = EXPORTS[UI.tab] ? EXPORTS[UI.tab]() : [];
    const pro = x => x.pro && !planAllows(x.pro) ? ' <i class="pro-chip">PRO</i>' : '';
    // los PDF llevan «Elegir…»: algunas escenas, jornadas o páginas (pdf-rango.js)
    const part = x => x.pdf && !(x.pro && !planAllows(x.pro));
    const note = EXPORTS_NOTE[UI.tab] ? EXPORTS_NOTE[UI.tab]() : '';
    popover(b, `<div class="menu xmenu">${note}${list.map((x, i) => {
      const main = `<button data-x="${i}"><b>${esc(x.label)}${pro(x)}</b>${x.hint ? `<small>${esc(x.hint)}</small>` : ''}</button>`;
      return part(x) ? `<div class="xrow">${main}<button class="xpart" data-xp="${i}" title="Exportar solo algunas escenas, jornadas o páginas" aria-label="Elegir qué parte de «${ea(x.label)}» exportar">Elegir…</button></div>` : main;
    }).join('')}</div>`, p => {
      p.addEventListener('click', e => {
        const pp = e.target.closest('[data-xp]'); if (pp) { closePop(); pdfRangeDialog(list[+pp.dataset.xp], b); return; }
        const it = e.target.closest('[data-x]'); if (!it) return; closePop(); list[+it.dataset.x].run(b);
      });
    });
  },
  'tip-x': b => { const s = tipsSeen(); s[b.dataset.tip] = 1; ls.set('tips', s); const t = b.closest('.tip'); if (t) t.remove(); },
};
const pdfItem = (label, kind, hint, opts) => ({ label, hint, run: btn => exportPDF(kind, btn, opts), pdf: { kind, opts }, pro: typeof pdfGate === 'function' ? pdfGate(kind, opts) : '' });

/* ---------- pestañas a elección (preferencia de esta computadora) ---------- */
const tabsHidden = () => new Set(ls.get('tabsHidden', []));
/* después de los permisos del equipo: oculta las que la persona eligió no ver (salvo la abierta) y renumera */
function applyTabPrefs() {
  const h = tabsHidden(); let n = 0, g = null;
  $$('#tabs .tab').forEach(b => {
    if (!b.hidden && h.has(b.dataset.tab) && b.dataset.tab !== UI.tab) b.hidden = true;
    const s = $('.n', b); if (s && !b.hidden) s.textContent = ++n;
    // línea fina entre grupos, en la primera pestaña visible de cada grupo
    b.classList.toggle('gs', !b.hidden && g != null && b.dataset.g !== g);
    if (!b.hidden) g = b.dataset.g;
  });
}
/* (lote W) «Pestañas visibles» va en el panel «Personalización › Tu pantalla» (leyenda.js), que se abre con el botón de
   la barra de pestañas: antes era un menú chico con el modo y el botón «Apariencia…». Por etapa, en el orden de la
   franja; el guion siempre se ve */
function tabsPickHTML() {
  const can = t => typeof canSeeTab !== 'function' || canSeeTab(t), h = tabsHidden();
  return `<div class="tabs-pick">${$$('#tabs .stg').map(w => {
    const ts = $$('.tab', w).map(b => b.dataset.tab).filter(can), n = ($('.stg-n', w) || {}).textContent || '';
    return ts.length ? `<div class="tp-g" role="group" aria-label="${ea(n)}"><span class="tp-n">${esc(n)}</span>${ts.map(t => `<label class="opt"${t === 'script' ? ' title="El guion siempre se ve"' : ''}><input type="checkbox" data-tabv="${ea(t)}" ${!h.has(t) ? 'checked' : ''} ${t === 'script' ? 'disabled' : ''}><span>${esc(TAB_NAMES[t])}</span></label>`).join('')}</div>` : '';
  }).join('')}</div>`;
}
/* mostrar u ocultar una pestaña (solo en esta pantalla); si se oculta la abierta, se pasa al guion */
function tabsPickSet(t, on) {
  if (t === 'script') return;
  const h = tabsHidden(); on ? h.delete(t) : h.add(t);
  ls.set('tabsHidden', [...h]);
  if (typeof P === 'undefined' || !P) return;
  if (h.has(UI.tab) && !document.body.classList.contains('home')) setTab('script'); else sharePaintTabs();
}

/* ---------- ayuda y soporte (el ícono junto a Compartir) ----------
   La ayuda de la pestaña abierta, las preguntas frecuentes de la web, escribir a soporte (el correo del servidor o el
   del programa de escritorio, con la versión y la pestaña) y, en la web, el libro de reclamaciones */
const HELPX = { email: null };
const helpSite = () => API() ? location.origin : 'https://filmspiritpro.com';
async function helpEmail() {
  if (HELPX.email != null) return HELPX.email;
  let e = typeof APPINFO !== 'undefined' && APPINFO.supportEmail || '';
  if (!e && API()) { try { const r = await fetch('/api/config', { headers: { 'X-FS': '1' } }); const j = await r.json(); e = j.supportEmail || ''; } catch (er) { } }
  return (HELPX.email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : '');
}
async function helpMenu(anchor) {
  const email = await helpEmail();
  const t = typeof P !== 'undefined' && P && UI.tab, hasTab = t && HELP[t];
  const ver = typeof APPINFO !== 'undefined' && APPINFO.version ? APPINFO.version : (document.querySelector('meta[name="fs-version"]') || {}).content || '';
  const body = encodeURIComponent(`\n\n—\nFilmSpirit${ver ? ' ' + ver : ''}${t ? ' · pestaña ' + (TAB_NAMES[t] || t) : ''} · ${navigator.userAgent}`);
  const I = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const site = helpSite(), web = API();
  const p = popover(anchor, `<h5>Ayuda y soporte</h5><div class="menu help-m">
    ${hasTab ? `<button data-h="tab">${I('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6M12 17h.01"/>')}<b>${esc(EN ? trDone('How to use ' + tr(TAB_NAMES[t] || 'esta pestaña')) : 'Cómo se usa ' + (TAB_NAMES[t] || 'esta pestaña'))}</b><small>Los gestos y las opciones de esta pestaña</small></button>` : ''}
    <a href="${ea(site)}/#preguntas" target="_blank" rel="noopener noreferrer">${I('<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>')}<b>Preguntas frecuentes</b><small>Planes, equipo, exportar, cuentas</small></a>
    ${email ? `<a href="mailto:${ea(email)}?subject=${encodeURIComponent('FilmSpirit · ayuda')}&body=${body}">${I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>')}<b>Escribir a soporte</b><small>${esc(email)}</small></a>` : `<a href="${ea(site)}/#preguntas" target="_blank" rel="noopener noreferrer">${I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>')}<b>Escribir a soporte</b><small>Desde la web de FilmSpirit</small></a>`}
${t ? `<button data-h="go">${I('<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.5 4.5"/>')}<b>Ir a… <kbd>Ctrl + K</kbd></b><small>Una pestaña o un tema de la ayuda, escribiendo</small></button>` : ''}
        <button data-h="keys">${I('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7.5 14h9"/>')}<b>Atajos de teclado</b><small>Todos, por pestaña</small></button>
        <button data-h="tips">${I('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>')}<b>Ver de nuevo los consejos</b><small>Los avisos con pistas de cada pestaña</small></button>
    ${PHONE() ? `<button data-h="lang" data-no-tr>${I('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>')}<b>${EN ? 'Language' : 'Idioma'}</b><small>${EN ? 'English · cambiar a Español' : 'Español · switch to English'}</small></button>` : ''}
    ${web ? `<a href="${ea(site)}/reclamaciones" target="_blank" rel="noopener noreferrer">${I('<path d="M6 3h9l3 3v15H6z"/><path d="M9 9h6M9 13h6M9 17h4"/>')}<b>Libro de reclamaciones</b><small>Para un reclamo o una queja formal</small></a>` : ''}
  </div>`, pp => pp.addEventListener('click', e => {
    const b = e.target.closest('[data-h]'); if (!b) { if (e.target.closest('a')) closePop(); return; }
    closePop();
    if (b.dataset.h === 'go') { quickOpen(); return; }
    if (b.dataset.h === 'keys') { keysDialog(); return; }
    if (b.dataset.h === 'tab') { const tb = $('#view [data-act="help"]'); if (tb) ACT.help(tb); else ACT.help(anchor); }
    if (b.dataset.h === 'lang') { langSet(EN ? 'es' : 'en'); return; }
    if (b.dataset.h === 'tips') { ls.set('tips', {}); if (typeof P !== 'undefined' && P) render(); toast('Los consejos vuelven a aparecer en cada pestaña.', 3000); }
  }));
  p.classList.add('pop-helpm');
}

/* ---------- comportamiento común de la interfaz ---------- */
/* deslizadores: el tramo lleno (--p) sigue al valor, también cuando el código lo cambia; el círculo aparece al tocar */
function rangeP(el) {
  const a = +el.min || 0, b = el.max === '' ? 100 : +el.max, v = +el.value;
  el.style.setProperty('--p', (b > a ? Math.min(100, Math.max(0, (v - a) / (b - a) * 100)) : 0) + '%');
}
(() => {
  const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  if (d && d.set) Object.defineProperty(HTMLInputElement.prototype, 'value', { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { d.set.call(this, v); if (this.type === 'range') rangeP(this); } });
  document.addEventListener('input', e => { if (e.target.type === 'range') rangeP(e.target); }, true);
  const off = () => $$('input[type=range].rg-on').forEach(x => x.classList.remove('rg-on'));
  document.addEventListener('pointerdown', e => { if (e.target.type === 'range') e.target.classList.add('rg-on'); }, true);
  addEventListener('pointerup', off, true); addEventListener('pointercancel', off, true);
  /* barras de desplazamiento: visibles mientras se desplaza la lista */
  const scr = new Map();
  document.addEventListener('scroll', e => {
    const t = e.target === document ? document.scrollingElement : e.target;
    if (!t || !t.classList) return;
    t.classList.add('scrolling'); clearTimeout(scr.get(t));
    scr.set(t, setTimeout(() => { t.classList.remove('scrolling'); scr.delete(t); }, 900));
  }, true);
  /* cajas en damero: el tono de cada una según su fila y columna reales (sirve con cualquier número de columnas) */
  const tone = g => {
    const k = [...g.children].filter(x => x.offsetParent !== null || getComputedStyle(x).display !== 'none');
    const ys = [...new Set(k.map(x => x.offsetTop))].sort((a, b) => a - b);
    const xs = [...new Set(k.map(x => x.offsetLeft))].sort((a, b) => a - b);
    for (const x of k) x.classList.toggle('tz', (ys.indexOf(x.offsetTop) + xs.indexOf(x.offsetLeft)) % 2 === 1);
  };
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(es => es.forEach(e => tone(e.target))) : null;
  const seen = new WeakSet();
  /* cajas en columnas (.masonry, con --cols en el CSS): en el medio no quedan huecos —cada caja va, en orden, a la
     columna más corta— y abajo todas terminan parejas: la última de cada columna se estira. Tonos alternados. */
  const masonry = g => {
    const W = g.clientWidth; if (!W) return;
    const all = g.querySelectorAll(':scope > .mcol > *, :scope > :not(.mcol)').length;
    const n = Math.max(1, Math.min(all, parseInt(getComputedStyle(g).getPropertyValue('--cols')) || 1));   // nunca columnas vacías
    if (g._mw === W && g._mn === n && g.querySelector(':scope > *')) return;
    g._mw = W; g._mn = n;
    let items = [...g.querySelectorAll(':scope > .mcol > *, :scope > :not(.mcol)')];
    items.forEach((x, i) => { if (x.dataset.mi == null) x.dataset.mi = i; x.classList.add('m-it'); });
    items.sort((a, b) => a.dataset.mi - b.dataset.mi);
    g.querySelectorAll(':scope > .mcol').forEach(c => c.remove());
    items.forEach(x => g.appendChild(x));
    g.classList.remove('m-on');
    if (n <= 1) { items.forEach((x, i) => x.classList.toggle('tz', i % 2 === 1)); return; }
    g.style.setProperty('--mw', (W / n) + 'px'); g.classList.add('m-measure');
    const hs = items.map(x => x.offsetHeight);
    g.classList.remove('m-measure');
    const cols = Array.from({ length: n }, () => { const c = document.createElement('div'); c.className = 'mcol'; c._h = 0; c._k = 0; return c; });
    items.forEach((x, i) => {
      const c = cols.reduce((a, b) => b._h < a._h - 1 ? b : a);
      x.classList.toggle('tz', (cols.indexOf(c) + c._k) % 2 === 1);
      c.appendChild(x); c._h += hs[i]; c._k++;
    });
    cols.forEach(c => g.appendChild(c));
    g.classList.add('m-on');
  };
  const mro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(es => es.forEach(e => masonry(e.target))) : null;
  /* junto a cada selector de color, su código a la vista (#C8382C): se lee, se copia y se escribe sin abrir el selector */
  const hexify = inp => {
    if (inp._hx || inp.hasAttribute('data-nohex')) return;
    const host = inp.closest('.sw-pick') || inp.closest('label') || inp;
    const t = document.createElement('input');
    t.type = 'text'; t.className = 'hexin'; t.maxLength = 7; t.spellcheck = false; t.autocomplete = 'off';
    t.value = (inp.value || '').toUpperCase(); t.disabled = inp.disabled;
    t.setAttribute('aria-label', 'Código del color (hexadecimal)'); t.title = 'Escribe un código como #C8382C y pulsa Intro';
    host.after(t); inp._hx = t;
    inp.addEventListener('input', () => { t.value = inp.value.toUpperCase(); });
    const apply = () => {
      const h = normHex(t.value);
      if (!h) { t.value = inp.value.toUpperCase(); return; }
      t.value = h.toUpperCase();
      if (h === inp.value.toLowerCase()) return;
      inp.value = h; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
    };
    t.addEventListener('change', apply);
    t.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); apply(); } });
  };
  const scan = n => {
    if (n.nodeType !== 1) return;
    if (n.matches('input[type=range]')) rangeP(n);
    else n.querySelectorAll('input[type=range]').forEach(rangeP);
    const gs = n.matches('.tgrid') ? [n] : [];
    gs.push(...n.querySelectorAll('.tgrid'));
    for (const g of gs) { tone(g); if (ro && !seen.has(g)) { seen.add(g); ro.observe(g); } }
    if (n.matches('input[type=color]')) hexify(n); else n.querySelectorAll('input[type=color]').forEach(hexify);
    const ms = n.matches('.masonry') ? [n] : [];
    ms.push(...n.querySelectorAll('.masonry'));
    for (const g of ms) { masonry(g); if (mro && !seen.has(g)) { seen.add(g); mro.observe(g); } }
    if (n.parentElement && n.parentElement.matches('.tgrid')) tone(n.parentElement);
  };
  /* el valor a la derecha de un deslizador (.rr output) se escribe al tocarlo */
  document.addEventListener('click', e => {
    const o = e.target.closest && e.target.closest('.rr output'); if (!o || o.querySelector('input')) return;
    const r = o.parentElement && o.parentElement.querySelector('input[type=range]'); if (!r || r.disabled) return;
    e.preventDefault();
    const txt = o.textContent, inp = document.createElement('input');
    inp.type = 'text'; inp.inputMode = 'decimal'; inp.className = 'rr-in'; inp.value = r.value; inp.setAttribute('aria-label', 'Valor');
    o.textContent = ''; o.appendChild(inp); inp.focus(); inp.select();
    let done = false;
    const end = ok => {
      if (done) return; done = true;
      const v = parseFloat(inp.value.replace(',', '.').replace('−', '-'));
      if (o.contains(inp)) inp.remove();
      if (!o.textContent) o.textContent = txt;
      if (ok && isFinite(v)) { r.value = Math.min(+r.max, Math.max(+r.min, v)); r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); }
    };
    inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') { ev.preventDefault(); end(true); } else if (ev.key === 'Escape') { ev.preventDefault(); end(false); } });
    inp.addEventListener('blur', () => end(true));
  }, true);
  const mo = new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(scan); });
  const start = () => { scan(document.body); mo.observe(document.body, { childList: true, subtree: true }); };
  document.body ? start() : addEventListener('DOMContentLoaded', start);
})();
