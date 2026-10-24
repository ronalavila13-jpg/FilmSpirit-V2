/* ============================================================
   NOTAS, COMENTARIOS Y ACTIVIDAD DEL EQUIPO
   · «+ Nota» (arriba): se arrastra hasta un plano, una escena, un elemento del desglose, una tarea, una línea del
     presupuesto… o hasta una pestaña, y ahí se escribe. Con un toque (o un clic) sin arrastrar, el siguiente
     toque elige el lugar.
   · La nota queda clavada donde se soltó (un globo de diálogo); tocarlo abre ahí mismo su conversación.
   · Cada nota es una conversación: el equipo responde (comentarios), la resuelve o la reabre. Cada quien edita y
     borra lo suyo: solo quien escribió una nota puede borrarla. Cualquiera puede ocultar las notas mientras mira
     (solo en su pantalla; no se borra nada).
   · Actividad: quién cambió qué y cuántos cambios lleva cada persona. Con el servidor la registra el servidor
     (el navegador que guarda describe el cambio); sin equipo, se lleva en el proyecto (P.act).
   Las notas viajan en su propia sección («notas»): todo el equipo las lee y escribe y cada quien ve solo las
   pegadas a pestañas que puede ver (lo aplica el servidor).
   Dónde se pueden pegar: los elementos con data-note="tipo:id" en cada pestaña (NOTE_KIND).
   ============================================================ */
const NOTE_KIND = {
  shot: { sec: 'storyboard', tab: 'board' },
  scene: { sec: 'guion', tab: 'lined' },
  el: { sec: 'desglose', tab: 'breakdown' },
  task: { sec: 'calendario', tab: 'cal' },
  line: { sec: 'presupuesto', tab: 'budget' },
  txt: { sec: 'guion', tab: 'lined' },    // al margen del guion rayado, con una flecha al punto del texto (tab-script.js)
  tab: { sec: null, tab: null },
};
const SEC2TAB = { guion: 'script', desglose: 'breakdown', storyboard: 'board', animatic: 'animatic', plan: 'plan', calendario: 'cal', llamado: 'call', presupuesto: 'budget', hoja: 'sup' };
const NOTE_ICO = '<svg class="nt-ico" viewBox="0 0 26 24" aria-hidden="true"><path fill-rule="evenodd" d="M7.5 2.5h11A5.5 5.5 0 0 1 24 8v4a5.5 5.5 0 0 1-5.5 5.5H10L3 22.5l1.6-5.9A5.5 5.5 0 0 1 2 12V8a5.5 5.5 0 0 1 5.5-5.5zM8.4 7.2a1 1 0 0 0 0 2h9.2a1 1 0 0 0 0-2zm0 3.8a1 1 0 0 0 0 2h5.6a1 1 0 0 0 0-2z"/></svg>';
const NOTE_BUBBLE = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 12.5h5"/></svg>';
/* el globo que queda clavado: redondeado, con dos líneas; la punta (abajo a la izquierda) marca el lugar exacto */
const NOTE_PIN = '<svg class="nb-ico" viewBox="0 0 26 24" aria-hidden="true"><path class="nbo" d="M7.5 2.5h11A5.5 5.5 0 0 1 24 8v4a5.5 5.5 0 0 1-5.5 5.5H10L3 22.5l1.6-5.9A5.5 5.5 0 0 1 2 12V8a5.5 5.5 0 0 1 5.5-5.5z"/><path class="nbl" d="M8.4 7.2a1 1 0 0 0 0 2h9.2a1 1 0 0 0 0-2zm0 3.8a1 1 0 0 0 0 2h5.6a1 1 0 0 0 0-2z"/></svg>';
/* la marca resalta sobre lo que tenga detrás: amarilla si se distingue del fondo; si no, grafito (fondos claros)
   o blanca (oscuros). Mira el color real del punto donde está, mezclando los fondos translúcidos */
function cssRGBA(c) {
  let m = /^rgba?\(([^)]+)\)/.exec(c || '');
  if (m) { const v = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; }
  m = /^color\(srgb ([^)]+)\)/.exec(c || '');
  if (m) { const v = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [v[0] * 255, v[1] * 255, v[2] * 255, v.length > 3 ? v[3] : 1]; }
  return null;
}
function bgUnder(el) {
  const layers = [];
  for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
    const c = cssRGBA(getComputedStyle(e).backgroundColor);
    if (c && c[3] > .02) { layers.push(c); if (c[3] >= .98) break; }
  }
  let base = cssRGBA(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
  for (let i = layers.length - 1; i >= 0; i--) { const [r, g, b, a] = layers[i]; base = [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a), 1]; }
  return base;
}
function labOf([r, g, b]) {
  const f = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  const R = f(r), G = f(g), B = f(b), h = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const X = h((R * .4124 + G * .3576 + B * .1805) / .95047), Y = h(R * .2126 + G * .7152 + B * .0722), Z = h((R * .0193 + G * .1192 + B * .9505) / 1.08883);
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const NB_YELLOW = labOf([255, 216, 77]);
function nbTone(b) {
  if (!b.isConnected || b.classList.contains('nb-draft')) return;
  const host = b.parentElement; if (!host) return;
  let under = null;
  const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (r.width && x > 0 && y > 0 && x < innerWidth && y < innerHeight) {
    under = document.elementsFromPoint(x, y).find(e => !e.closest('.nb') && (e.contains(host) || host.contains(e))) || null;
  }
  const bg = bgUnder(under || host), L = labOf(bg);
  const far = Math.hypot(L[0] - NB_YELLOW[0], L[1] - NB_YELLOW[1], L[2] - NB_YELLOW[2]) >= 32;
  const t = far ? '' : L[0] > 52 ? 'dk' : 'wh';
  b.classList.toggle('nbv-dk', t === 'dk'); b.classList.toggle('nbv-wh', t === 'wh');
}
const nbToneAll = () => requestAnimationFrame(() => { for (const b of $$('.nb')) nbTone(b); });
const notesHidden = () => !!ls.get('notesHide', false);
const notePos = on => !!on && typeof on.fx === 'number' && (typeof on.fy === 'number' || typeof on.py === 'number');

/* ---------- quién soy y qué puedo ---------- */
const noteMe = () => SHARE && SHARE.me ? { id: SHARE.me.id, name: SHARE.me.name || 'Tú' } : { id: 'yo', name: 'Tú' };
const NOTES = () => (P && P.notes) || {};
// en Gastos no van notas: cada persona ve solo lo suyo y el servidor no las guarda (perm.js · readSet)
const noteSecOk = sec => sec !== 'gastos' && (!SHARE || SHARE.admin || !sec || (SHARE.read && SHARE.read.has(sec)));
const noteCanRead = n => !!(n && n.on) && noteSecOk(n.on.sec);
const canWriteNotes = () => !!P && !UI.readOnly && !(SHARE && SHARE.ro);
const noteMine = n => n.by === noteMe().id;
const noteCanDel = n => noteMine(n) || !SHARE;    // solo quien la escribió (sin equipo, todo es de uno)
const noteKey = on => on.t + ':' + on.id;
const noteRoots = () => Object.values(NOTES()).filter(n => !n.re && noteCanRead(n));
const noteReplies = id => Object.values(NOTES()).filter(n => n.re === id).sort((a, b) => a.ts - b.ts);
/* «tipo:id» son todas las notas de un lugar; «tipo:id#nota» es una sola (la de un globo clavado) */
const notesAt = key => { const h = key.indexOf('#'); if (h > 0) { const n = NOTES()[key.slice(h + 1)]; return n && !n.re && noteCanRead(n) ? [n] : []; } return noteRoots().filter(n => noteKey(n.on) === key).sort((a, b) => a.ts - b.ts); };
const pinKey = n => noteKey(n.on) + (notePos(n.on) ? '#' + n.id : '');
const noteLast = n => Math.max(n.ts || 0, ...noteReplies(n.id).map(r => r.ts || 0));
const tabOn = tab => ({ t: 'tab', id: tab, sec: TAB2SEC[tab] || 'guion', tab, label: TAB_NAME[tab] || tab });

/* nombre de aquello donde está la nota (el de ahora: si el plano cambió de número, se ve el nuevo) */
function noteLabelOf(t, id) {
  try {
    if (t === 'shot') return D.code && D.code[id] ? 'Plano ' + D.code[id] : '';
    if (t === 'scene') { const s = D.sc.scenes.find(x => x.key === id); return s ? 'Escena ' + s.key + (s.heading ? ' · ' + s.heading.slice(0, 48) : '') : ''; }
    if (t === 'el') { const e = P.elements[id]; return e ? e.name : ''; }
    if (t === 'task') { const x = ((P.calendar || {}).tasks || []).find(x => x.id === id); return x ? x.title || 'Tarea' : ''; }
    if (t === 'line') { const l = ((P.budget || {}).lines || []).find(x => x.id === id); return l ? l.name || 'Línea del presupuesto' : ''; }
    if (t === 'tab') return TAB_NAME[id] ? 'Pestaña ' + TAB_NAME[id] : '';
    if (t === 'txt') { const n = Object.values(NOTES()).find(x => x.on && x.on.t === 'txt' && x.on.id === id); return n && typeof mnLabel === 'function' ? mnLabel(n.on) : ''; }
  } catch (e) { }
  return '';
}
const noteLabel = on => noteLabelOf(on.t, on.id) || on.label || '';
const noteTabOf = on => on.t === 'tab' ? on.id : on.tab && canSeeTab(on.tab) ? on.tab : NOTE_KIND[on.t] && NOTE_KIND[on.t].tab || SEC2TAB[on.sec] || 'project';

/* lo propio se dice en segunda persona: «Tú dejaste una nota», «Ana (tú)» */
const youName = n => n && n !== 'Tú' ? n + ' (tú)' : 'Tú';
const YOU_IR = /^(movió|escribió|respondió|resolvió|reabrió)$/;    // los demás verbos de la actividad son -ar
const youVerb = w => String(w || '').replace(/^(\S+)ó(?=\s|$)/, (m, a) => YOU_IR.test(m) ? a.slice(0, -1) + 'iste' : a + 'aste');
/* «hace 5 min», «ayer 16:05», «12 oct» */
function agoText(ts) {
  if (!ts) return '';
  const d = Date.now() - ts, m = Math.round(d / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const t = new Date(ts), now = new Date(), hm = t.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  if (t.toDateString() === now.toDateString()) return 'hoy ' + hm;
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (t.toDateString() === y.toDateString()) return 'ayer ' + hm;
  return t.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace('.', '') + ' ' + hm;
}

/* ---------- cambiar notas (pasan por el deshacer y se guardan como todo lo demás) ---------- */
function noteSet(fn, label) {
  histNote(label);
  P.notes = { ...NOTES() };
  fn(P.notes);
  changed('data');
  render();
}
function noteAdd(on, text, re) {
  const me = noteMe(), id = uid('n');
  noteSet(N => { N[id] = { id, on, by: me.id, name: me.name, ts: Date.now(), text, ...(re ? { re } : {}) }; }, re ? 'Respuesta' : 'Nota');
  return id;
}
function noteEdit(id, text) { noteSet(N => { if (N[id]) N[id] = { ...N[id], text, ed: Date.now() }; }, 'Editar nota'); }
/* mover una nota o cambiarle la fecha (solo la propia; sigue pegada a lo mismo) */
function noteMove(id, patch, label) { noteSet(N => { if (N[id] && N[id].on) N[id] = { ...N[id], on: { ...N[id].on, ...patch } }; }, label || 'Mover nota'); }
function noteDone(id, done) { const me = noteMe(); noteSet(N => { if (!N[id]) return; const n = { ...N[id] }; if (done) { n.done = true; n.doneBy = me.name; } else { delete n.done; delete n.doneBy; } N[id] = n; }, done ? 'Resolver nota' : 'Reabrir nota'); }
function noteDel(id) {
  const n = NOTES()[id]; if (!n) return;
  noteSet(N => { delete N[id]; if (!n.re) for (const r of Object.values(N)) if (r.re === id) delete N[r.id]; }, n.re ? 'Borrar respuesta' : 'Borrar nota');
  toastUndo(n.re ? 'Respuesta borrada.' : 'Nota borrada.');
}

/* ---------- globos clavados (y las marcas de las notas antiguas, sin lugar) ---------- */
/* la vista que se desplaza, donde va un globo pegado a una pestaña (se guarda cuál, por su data-keep) */
function noteScroller(k) { return (k && $(`#view [data-keep="${CSS.escape(k)}"]`)) || $('#view .scroller') || $('#view > *'); }
function notesPaint() {
  $$('.nb').forEach(b => b.remove());
  if (!P) return;
  document.body.classList.toggle('notes-off', notesHidden());
  const by = new Map(), tabs = new Map(), pins = [];
  for (const n of noteRoots()) {
    if (n.done) continue;
    const k = noteKey(n.on), cnt = 1 + noteReplies(n.id).length;
    if (n.on.t === 'tab') tabs.set(n.on.id, (tabs.get(n.on.id) || 0) + cnt);
    if (notePos(n.on)) pins.push([n, cnt]);
    else if (n.on.t !== 'tab' && n.on.t !== 'txt') by.set(k, (by.get(k) || 0) + cnt);   // las del margen del guion las pinta su página
  }
  // en la pestaña: cuántas notas hay pegadas a ella (se ven también desde las otras pestañas)
  for (const [id, cnt] of tabs) {
    const h = $('#tab-' + id); if (!h) continue;
    if (getComputedStyle(h).position === 'static') h.classList.add('nb-host');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'nb nb-tab'; b.dataset.nb = 'tab:' + id;
    b.setAttribute('aria-label', `${cnt === 1 ? '1 nota' : cnt + ' mensajes'} en la pestaña ${TAB_NAME[id] || ''}: abrir`);
    b.title = 'Notas en la pestaña ' + (TAB_NAME[id] || '');
    b.innerHTML = NOTE_ICO + (cnt > 1 ? `<span>${cnt}</span>` : '');
    h.appendChild(b);
  }
  // notas antiguas (sin lugar): una marca en la esquina de lo anotado
  for (const [k, cnt] of by) {
    const i = k.indexOf(':'), t = k.slice(0, i), id = k.slice(i + 1);
    for (const h0 of $$(`#view [data-note="${CSS.escape(k)}"]`)) {
      // dentro de una sección cerrada (una partida del presupuesto): la marca va en su título y la abre
      const det = h0.closest('details:not([open])'), sm = det && $('summary', det);
      if (sm) { sumMark(sm, k, cnt); continue; }
      const h = h0.tagName === 'TR' ? h0.cells[0] : h0;
      if (!h) continue;
      if (getComputedStyle(h).position === 'static') h.classList.add('nb-host');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'nb'; b.dataset.nb = k;
      b.setAttribute('aria-label', `${cnt === 1 ? '1 nota' : cnt + ' mensajes'} en ${noteLabelOf(t, id) || 'este lugar'}: abrir`);
      b.title = 'Notas: ' + (noteLabelOf(t, id) || '');
      b.innerHTML = NOTE_ICO + (cnt > 1 ? `<span>${cnt}</span>` : '');
      h.appendChild(b);
    }
  }
  // globos: en el punto exacto donde se soltó la nota
  for (const [n, cnt] of pins) {
    const on = n.on, k = pinKey(n);
    let host, x, y;
    if (on.t === 'tab') {
      if (on.id !== UI.tab) continue;
      host = noteScroller(on.k); if (!host) continue;
      x = Math.round(on.fx * Math.max(host.scrollWidth, host.clientWidth)) + 'px'; y = Math.round(on.py) + 'px';
    } else {
      const h0 = $(`#view [data-note="${CSS.escape(noteKey(on))}"]`); if (!h0) continue;
      const det = h0.closest('details:not([open])'), sm = det && $('summary', det);
      if (sm) { sumMark(sm, k, cnt); continue; }
      host = h0.tagName === 'TR' ? h0.cells[0] : h0; if (!host) continue;
      x = (on.fx * 100).toFixed(2) + '%'; y = (on.fy * 100).toFixed(2) + '%';
    }
    if (getComputedStyle(host).position === 'static') host.classList.add('nb-host');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'nb nb-pin'; b.dataset.nb = k; b.dataset.nid = n.id;
    b.style.left = x; b.style.top = y;
    const who = noteMine(n) ? 'Tú' : n.name || 'Alguien';
    b.setAttribute('aria-label', `Nota de ${who}${cnt > 1 ? `, ${cnt - 1} ${cnt === 2 ? 'respuesta' : 'respuestas'}` : ''}: abrir`);
    b.title = `${who}: ${String(n.text || '').slice(0, 80)}`;
    b.innerHTML = NOTE_PIN + (cnt > 1 ? `<span>${cnt - 1}</span>` : '');
    host.appendChild(b);
  }
  nbToneAll();
  mnSync();   // las notas al margen del guion rayado
  const open = noteRoots().filter(n => !n.done).length;
  for (const c of $$('#noteAdd .cnt')) { c.textContent = open > 9 ? '9+' : open || ''; c.hidden = !open; }
  const add = $('#noteAdd'); if (add) { add.disabled = !canWriteNotes() && !open; add.classList.toggle('off', notesHidden()); }
  if ($('#notesPanel.open') && NP.view !== 'thread') npPaint();
  // llegaron notas (de otra persona o de un deshacer): la conversación abierta se pone al día
  const sig = chCanon(NOTES()); if (sig !== NOTE_SIG) { NOTE_SIG = sig; if (NF.el && NF.key) thRepaint(NF.el, NF.key); if (NP.view === 'thread' && $('#notesPanel.open')) thRepaint($('#notesPanel'), NP.key); }
  for (const b of $$('.nb')) b.classList.toggle('nb-on', (NF.el && NF.key === b.dataset.nb) || (NP.view === 'thread' && !!$('#notesPanel.open') && b.dataset.nb === NP.key));
}
function sumMark(sm, k, cnt) {
  let sb = $(':scope > .nb-sum', sm);
  if (!sb) { sb = document.createElement('button'); sb.type = 'button'; sb.className = 'nb nb-sum'; sb.dataset.sum = '0'; sm.appendChild(sb); }
  sb.dataset.sum = String(+sb.dataset.sum + cnt); sb.dataset.nb = k;
  sb.innerHTML = NOTE_ICO + `<span>${sb.dataset.sum}</span>`; sb.title = 'Hay notas aquí: abrir';
  sb.setAttribute('aria-label', 'Hay notas en esta sección: abrirla');
}
/* ocultar o mostrar las notas en esta pantalla (no se borra nada; los demás las siguen viendo) */
function notesHide(on) {
  ls.set('notesHide', !!on);
  if (on) nfClose();
  notesPaint();
  toast(on ? 'Notas ocultas en tu pantalla. Se vuelven a ver desde el botón de notas.' : 'Notas visibles.', 2600);
}
let NOTE_SIG = '';
// la marca no deja pasar el toque al elemento de debajo (abrir el plano, arrastrar la tarea…)
document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('.nb')) e.stopPropagation(); }, true);
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.nb'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const k = b.dataset.nb;
  if (b.classList.contains('nb-sum')) { const det = b.closest('details'); if (det) { det.open = true; notesPaint(); flashNote(k); } return; }
  if (b.classList.contains('nb-tab') && UI.tab !== k.slice(4)) { setTab(k.slice(4)); return; }   // la pestaña: ir a ella (ahí están sus globos)
  if (NF.el && NF.key === k) { nfClose(); notesPaint(); return; }    // tocar otra vez el globo: se cierra
  noteThread(k, b);
}, true);

/* ---------- tarjeta flotante: nota nueva o conversación ----------
   Pequeña, translúcida y al lado de lo anotado; en el teléfono, una franja angosta abajo (sobre el teclado).
   No es una ventana: no oscurece nada, no tapa lo anotado y se cierra al tocar fuera (lo escrito se guarda). */
const NI = {
  ok: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  send: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
  x: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>',
  edit: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5h4l10-10-4-4-10 10z"/></svg>',
  del: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>',
  back: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  prev: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5.5 8.5 12l6.5 6.5"/></svg>',
  cal: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>',
  hide: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.6A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
};
const NF = { el: null, onClose: null, at: null, key: null, old: false };
const nfSmall = () => matchMedia('(max-width:700px)').matches;
function nfOpen(html, at, cls, onClose) {
  nfClose(); closePop();
  const el = document.createElement('div');
  el.className = 'nf ' + cls; el.setAttribute('role', 'dialog');
  el.innerHTML = html;
  document.body.appendChild(el);
  Object.assign(NF, { el, onClose, at });
  nfPlace();
  setTimeout(() => document.addEventListener('pointerdown', nfOutside, true), 0);
  el.addEventListener('input', e => { const t = e.target.closest('textarea'); if (t) { t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; nfPlace(); } });
  return el;
}
function nfPlace() {
  const el = NF.el; if (!el) return;
  if (nfSmall()) {
    // franja abajo, sobre el teclado si está abierto
    el.classList.add('dock'); el.style.left = el.style.top = '';
    const vv = window.visualViewport, kb = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0;
    el.style.bottom = `calc(${8 + kb}px + env(safe-area-inset-bottom,0px))`;
    return;
  }
  el.classList.remove('dock'); el.style.bottom = '';
  const at = NF.at, r = at && at.getBoundingClientRect ? at.getBoundingClientRect() : at;
  if (!r) return;
  const w = el.offsetWidth, h = el.offsetHeight;
  // a la derecha de lo anotado; si no cabe, a la izquierda
  let x = r.right + 8;
  if (x + w > innerWidth - 8) x = r.left - w - 8;
  if (x < 8) x = Math.max(8, Math.min(r.left, innerWidth - w - 8));
  const y = Math.max(8, Math.min(r.top - 4, innerHeight - h - 8));
  el.style.left = x + 'px'; el.style.top = y + 'px';
}
addEventListener('resize', nfPlace);
if (window.visualViewport) visualViewport.addEventListener('resize', nfPlace);
document.addEventListener('scroll', () => { if (NF.el && NF.at && NF.at.getBoundingClientRect && !nfSmall()) { if (!NF.at.isConnected) NF.at = (NF.key && $(`.nb[data-nb="${CSS.escape(NF.key)}"]`)) || NF.at; if (NF.at.isConnected) nfPlace(); } }, true);
function nfOutside(e) {
  if (!NF.el || NF.el.contains(e.target) || (e.target.closest && e.target.closest('#ask, #pop, .nb, #noteAdd, .mn, .mn-dot'))) return;
  nfClose();
}
function nfClose() {
  const el = NF.el; if (!el) return;
  const f = NF.onClose;
  NF.el = null; NF.onClose = null; NF.at = null; NF.key = null;
  document.removeEventListener('pointerdown', nfOutside, true);
  el.remove();
  if (f) f(el);
}

/* ---------- nota nueva: se escribe ahí mismo; Enter guarda, tocar fuera también ---------- */
function noteCompose(on, rect) {
  if (!canWriteNotes()) return;
  const lab = noteLabel(on) || 'esta pestaña';
  let done = false;
  // el globo aparece enseguida en el punto; la tarjeta para escribir, a su lado
  const pin = document.createElement('div'); pin.className = 'nb nb-pin nb-draft'; pin.innerHTML = NOTE_PIN;
  pin.style.cssText = `position:fixed;left:${(rect.left + rect.right) / 2}px;top:${(rect.top + rect.bottom) / 2}px`;
  document.body.appendChild(pin);
  const el = nfOpen(`<div class="nf-row"><textarea class="nf-in" rows="1" placeholder="Escribe una nota…" aria-label="Nota en ${esc(lab)}"></textarea><button class="nf-ic nf-go" data-nf="ok" aria-label="Guardar la nota" title="Guardar (Enter)">${NI.ok}</button></div>`,
    rect, 'nf-new', box => { pin.remove(); save(box); });
  const ta = $('textarea', el);
  function save(box) {
    if (done) return; done = true;
    const tx = $('textarea', box || el).value.trim();
    if (tx) { if (notesHidden()) ls.set('notesHide', false); const id = noteAdd(on, tx); setTimeout(() => flashNote(notePos(on) ? noteKey(on) + '#' + id : noteKey(on)), 60); }
  }
  el.addEventListener('click', e => { if (e.target.closest('[data-nf="ok"]')) nfClose(); });
  ta.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); nfClose(); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (!ta.value.trim()) done = true; nfClose(); }
  });
  setTimeout(() => ta.focus(), 20);
}
function flashNote(key) {
  for (const b of $$(`.nb[data-nb="${CSS.escape(key)}"]`)) { b.classList.remove('nb-new'); void b.offsetWidth; b.classList.add('nb-new'); }
}

/* ---------- conversación de un lugar ---------- */
function msgHTML(n, root) {
  const own = noteMine(n), w = canWriteNotes(), del = noteCanDel(n) && w;
  const acts = (root && own && w && n.on && n.on.t === 'txt' && typeof mnDatePop === 'function' ? `<button class="nf-ic" data-nf="date" data-id="${ea(n.id)}" aria-label="Cambiar la fecha de la nota" title="Fecha de la nota">${NI.cal}</button>` : '')
    + (root && w ? (n.done ? `<button class="nf-ic" data-nf="reopen" data-id="${ea(n.id)}" aria-label="Reabrir" title="Reabrir">${NI.back}</button>` : `<button class="nf-ic" data-nf="done" data-id="${ea(n.id)}" aria-label="Marcar como resuelta" title="Resolver">${NI.ok}</button>`) : '')
    + (own && w ? `<button class="nf-ic" data-nf="edit" data-id="${ea(n.id)}" aria-label="Editar" title="Editar">${NI.edit}</button>` : '')
    + (del ? `<button class="nf-ic nf-del" data-nf="del" data-id="${ea(n.id)}" aria-label="Borrar" title="Borrar">${NI.del}</button>` : '');
  return `<div class="nf-msg${ea(root ? ' root' : '')}" data-id="${ea(n.id)}">
    <div class="nf-who"><b>${esc(own ? youName(n.name) : n.name || 'Alguien')}</b><time title="${esc(new Date(n.ts).toLocaleString('es-PE'))}">${agoText(n.ts)}${n.ed ? ' · editada' : ''}${n.done && n.doneBy ? ' · resuelta por ' + esc(n.doneBy) : ''}</time><span class="nf-acts">${acts}</span></div>
    <p class="nf-text">${esc(n.text)}</p></div>`;
}
/* el cuerpo de una conversación (en la franja del teléfono o en la columna de la computadora) */
function threadBody(key) {
  const roots = notesAt(key), open = roots.filter(n => !n.done), done = roots.filter(n => n.done);
  const one = n => `<div class="nf-th${ea(n.done ? ' done' : '')}">${msgHTML(n, true)}${noteReplies(n.id).map(r => msgHTML(r, false)).join('')}</div>`;
  const last = open[open.length - 1];
  return `<div class="nf-list">${open.map(one).join('')}${NF.old || !open.length ? done.map(one).join('') : ''}
      ${done.length && open.length ? `<button class="nf-more" data-nf="old">${NF.old ? 'Ocultar resueltas' : done.length === 1 ? '1 resuelta' : done.length + ' resueltas'}</button>` : ''}</div>
    ${last && canWriteNotes() ? `<div class="nf-row"><textarea class="nf-in" rows="1" data-re="${ea(last.id)}" placeholder="Responder…" aria-label="Responder"></textarea><button class="nf-ic nf-go" data-nf="send" aria-label="Enviar" title="Enviar (Enter)">${NI.send}</button></div>` : ''}`;
}
const keyLabel = key => { const h = key.indexOf('#'), k = h > 0 ? key.slice(0, h) : key, i = k.indexOf(':'), r = notesAt(key)[0]; return noteLabelOf(k.slice(0, i), k.slice(i + 1)) || (r && r.on.label) || 'Notas'; };
/* abrir la conversación de un lugar: en la computadora, en la columna de la derecha (no tapa nada);
   en el teléfono, en una franja translúcida abajo */
function noteThread(key, anchor) {
  NF.old = false;
  if ($('#notesPanel.open') && NP.view === 'thread') { NP.view = 'notes'; npPaint(); }
  const el = nfOpen(`<div class="nf-head"><span class="nf-lab">${esc(keyLabel(key))}</span><button class="nf-ic" data-nf="hide" aria-label="Ocultar las notas en mi pantalla" title="Ocultar las notas en mi pantalla (no se borra nada)">${NI.hide}</button><button class="nf-ic" data-nf="x" aria-label="Cerrar">${NI.x}</button></div><div class="th-box">${threadBody(key)}</div>`, anchor, 'nf-th-card', box => { thPending(box); setTimeout(notesPaint, 0); });
  NF.key = key;
  for (const b of $$('.nb')) b.classList.toggle('nb-on', b.dataset.nb === key);
  el.setAttribute('aria-label', 'Notas: ' + keyLabel(key));
  thBind(el, () => key);
  // lo anotado queda a la vista, por encima de la franja
  const host = anchor && anchor.closest && (anchor.closest('[data-note]') || anchor.parentElement);
  if (host && host.closest('#view')) {
    const top = el.getBoundingClientRect().top, r = host.getBoundingClientRect();
    if (r.bottom > top - 8) { host.style.scrollMarginBottom = (innerHeight - top + 12) + 'px'; host.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
}
/* lo escrito y no enviado no se pierde al cerrar */
function thPending(box) {
  const t = $('.nf-in[data-re]', box), e = $('.nf-in[data-edit]', box);
  if (t && t.value.trim() && NOTES()[t.dataset.re]) noteAdd(NOTES()[t.dataset.re].on, t.value.trim(), t.dataset.re);
  if (e && e.value.trim()) noteEdit(e.dataset.edit, e.value.trim());
}
function thBind(box, keyOf) {
  box.addEventListener('click', e => { const k = keyOf(); if (k) thClick(e, box, k); });
  box.addEventListener('keydown', e => {
    const k = keyOf(); if (!k) return;
    const ta = e.target.closest('.nf-in');
    if (e.key === 'Escape' && ta && ta.dataset.edit) { e.preventDefault(); e.stopPropagation(); thRepaint(box, k, true); return; }
    if (!ta || e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    if (ta.dataset.re) thSend(box, k); else if (ta.dataset.edit) thSaveEdit(box, k, ta.dataset.edit);
  });
  box.addEventListener('input', e => { const t = e.target.closest('textarea'); if (t) { t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; } });
}
function thRepaint(box, key, force) {
  const tb = box && $('.th-box', box); if (!tb) return;
  if (!force && $$('.nf-in', box).some(t => t.value.trim() || t === document.activeElement)) return;    // escribiendo: no se toca
  if (!notesAt(key).length) { if (box === NF.el) nfClose(); else { NP.view = 'notes'; npPaint(); } return; }
  tb.innerHTML = threadBody(key);
  if (box === NF.el) nfPlace();
}
function thSend(box, key) {
  const ta = $('.nf-in[data-re]', box), tx = ta && ta.value.trim(), root = ta && NOTES()[ta.dataset.re];
  if (!tx || !root) return;
  ta.value = '';
  noteAdd(root.on, tx, root.id);
  thRepaint(box, key, true);
  const nt = $('.nf-in[data-re]', box); if (nt && !TOUCHY) nt.focus();
}
function thSaveEdit(box, key, id) {
  const ta = $(`.nf-in[data-edit="${CSS.escape(id)}"]`, box), tx = ta && ta.value.trim();
  if (!tx) return;
  ta.value = '';
  noteEdit(id, tx);
  thRepaint(box, key, true);
}
function thClick(e, box, key) {
  const b = e.target.closest('[data-nf]'); if (!b) return;
  const a = b.dataset.nf, id = b.dataset.id;
  if (a === 'x') { nfClose(); return; }
  if (a === 'hide') { notesHide(true); return; }
  if (a === 'send') { thSend(box, key); return; }
  if (a === 'old') { NF.old = !NF.old; thRepaint(box, key, true); return; }
  if (a === 'done' || a === 'reopen') {
    noteDone(id, a === 'done');
    if (a === 'done' && !notesAt(key).some(n => !n.done)) { toast('Nota resuelta.', 2200); if (box === NF.el) nfClose(); else { NP.view = 'notes'; npPaint(); } }
    else thRepaint(box, key, true);
    return;
  }
  if (a === 'del') { if (box === NF.el) nfClose(); noteDel(id); if (box !== NF.el && !notesAt(key).length) { NP.view = 'notes'; npPaint(); } return; }
  if (a === 'edit') {
    const m = b.closest('.nf-msg'), n = NOTES()[id]; if (!m || !n) return;
    $('.nf-text', m).outerHTML = `<div class="nf-row"><textarea class="nf-in" rows="1" data-edit="${ea(id)}" aria-label="Editar la nota">${esc(n.text)}</textarea><button class="nf-ic nf-go" data-nf="save" data-id="${ea(id)}" aria-label="Guardar" title="Guardar (Enter)">${NI.ok}</button></div>`;
    const ta = $('.nf-in', m); ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    return;
  }
  if (a === 'save') thSaveEdit(box, key, id);
  if (a === 'date') mnDatePop(b, id);   // nota al margen del guion rayado (guion-margen.js)
}

/* ---------- arrastrar «+ Nota» ---------- */
// en la pestaña Gastos no se dejan notas (ver noteSecOk)
function noteAnchorAt(x, y) { const a = noteAnchorIn(x, y); return a && a.on && a.on.sec === 'gastos' ? null : a; }
function noteAnchorIn(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el || el.closest('#modal, #pop, #notesPanel, .nf')) return null;
  const h = el.closest('[data-note]'), fr = v => Math.round(clamp(v, 0, 1) * 1e4) / 1e4;
  // sobre el texto del guion rayado: una nota al margen que señala esa letra (tab-script.js)
  const tx = noteSecOk('guion') ? mnAnchorAt(el, x, y) : null;
  if (tx) return tx;
  if (h && h.closest('#view')) {
    const k = h.dataset.note, i = k.indexOf(':'), t = k.slice(0, i), id = k.slice(i + 1), K = NOTE_KIND[t];
    const r = (h.tagName === 'TR' ? h.cells[0] : h).getBoundingClientRect();
    if (K && K.sec && noteSecOk(K.sec) && t !== 'txt') return { el: h, on: { t, id, sec: K.sec, tab: UI.tab, label: noteLabelOf(t, id), fx: fr((x - r.left) / Math.max(1, r.width)), fy: fr((y - r.top) / Math.max(1, r.height)) } };
  }
  const tb = el.closest('#tabs .tab[data-tab]');
  if (tb && !tb.hidden) return { el: tb, on: tabOn(tb.dataset.tab) };
  // sobre una etapa (Desarrollo, Imagen…): la nota va a su pestaña abierta, o a la primera visible
  const sh = el.closest('#tabs .stg-h');
  if (sh) { const ts = $$('.tab', sh.parentElement).filter(b => !b.hidden), t = ts.find(b => b.getAttribute('aria-selected') === 'true') || ts[0]; if (t) return { el: sh, on: tabOn(t.dataset.tab) }; }
  if (el.closest('#view')) {
    // en un espacio de la pestaña: el punto dentro de la vista que se desplaza (se mueve con ella)
    const sc = el.closest('#view [data-keep]') || noteScroller(), on = tabOn(UI.tab);
    if (sc) { const r = sc.getBoundingClientRect(); Object.assign(on, { fx: fr((x - r.left + sc.scrollLeft) / Math.max(1, sc.scrollWidth, sc.clientWidth)), py: Math.round(y - r.top + sc.scrollTop), ...(sc.dataset.keep ? { k: sc.dataset.keep } : {}) }); }
    return { el: sc || $('#tab-' + UI.tab), on };
  }
  return null;
}
const pointRect = e => ({ left: e.clientX - 2, right: e.clientX + 2, top: e.clientY - 2, bottom: e.clientY + 2 });
function scrollerAt(el) {
  for (let x = el; x && x !== document.body; x = x.parentElement) {
    const cs = getComputedStyle(x);
    if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (x.scrollHeight > x.clientHeight + 2 || x.scrollWidth > x.clientWidth + 2)) return x;
  }
  return null;
}
let NOTE_PLACE = false;
function noteDragInit() {
  const btn = $('#noteAdd'); if (!btn || btn._nd) return; btn._nd = true;
  btn.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (!canWriteNotes()) { noteMenu(btn); return; }
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false, ghost = null, hov = null, last = e, tick = 0;
    const hover = a => { const el = a && a.el; if (hov === el) return; if (hov) hov.classList.remove('note-hover'); hov = el; if (hov) hov.classList.add('note-hover'); if (ghost) $('.ng-lab', ghost).textContent = a ? noteLabel(a.on) || 'Esta pestaña' : 'Suelta sobre un plano, una escena, una tarea…'; };
    const edge = () => {
      const el = document.elementFromPoint(last.clientX, last.clientY), sc = el && scrollerAt(el);
      if (!sc) return;
      const r = sc.getBoundingClientRect(), d = 44;
      if (last.clientY < r.top + d) sc.scrollTop -= 14; else if (last.clientY > r.bottom - d) sc.scrollTop += 14;
      if (last.clientX < r.left + d) sc.scrollLeft -= 14; else if (last.clientX > r.right - d) sc.scrollLeft += 14;
    };
    const mv = ev => {
      last = ev;
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      if (!moved) {
        moved = true; closePop(); nfClose();
        ghost = document.createElement('div'); ghost.className = 'note-ghost'; ghost.innerHTML = NOTE_ICO + '<span class="ng-lab"></span>';
        document.body.appendChild(ghost); document.body.classList.add('note-dragging');
        tick = setInterval(edge, 40);
      }
      ghost.style.transform = `translate(${ev.clientX - 14}px, ${ev.clientY - 14}px)`;
      hover(noteAnchorAt(ev.clientX, ev.clientY));
    };
    const end = ev => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', end); removeEventListener('pointercancel', end);
      clearInterval(tick);
      if (hov) hov.classList.remove('note-hover');
      if (ghost) ghost.remove();
      document.body.classList.remove('note-dragging');
      if (!moved) { if (ev.type === 'pointerup') noteMenu(btn); return; }
      if (ev.type !== 'pointerup') return;
      const a = noteAnchorAt(ev.clientX, ev.clientY);
      if (a) noteCompose(a.on, pointRect(ev));
      else toast('Suelta la nota sobre un plano, una escena, un elemento, una tarea o una pestaña.', 3500);
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', end); addEventListener('pointercancel', end);
  });
  // con el teclado (Intro o Espacio): el mismo menú que al tocarlo (el mouse y el dedo ya lo abren en pointerdown)
  btn.addEventListener('click', e => { if (e.detail === 0) noteMenu(btn); });
}
/* un solo botón arriba: arrastrarlo pega una nota; tocarlo ofrece pegarla con un toque o ver notas y actividad */
function noteMenu(btn) {
  const open = noteRoots().filter(n => !n.done).length;
  if (NOTE_PLACE) { notePlace(false); return; }
  popover(btn, `<div class="menu">${canWriteNotes() ? `<button data-m="place">${NOTE_ICO} Pegar una nota</button>` : ''}<button data-m="panel">${NOTE_BUBBLE} ${$('#notesPanel.open') ? 'Cerrar notas y actividad' : 'Notas y actividad'}${open ? ` <span class="count">${open}</span>` : ''}</button><button data-m="hide">${NI.hide} ${notesHidden() ? 'Mostrar las notas' : 'Ocultar las notas en mi pantalla'}</button></div>`, p => p.addEventListener('click', e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    closePop();
    if (b.dataset.m === 'place') notePlace(true); else if (b.dataset.m === 'hide') notesHide(!notesHidden()); else if ($('#notesPanel.open')) npClose(); else npOpen();
  }));
}
/* sin arrastrar: el siguiente toque elige el lugar */
function notePlace(on) {
  NOTE_PLACE = !!on && !NOTE_PLACE;
  document.body.classList.toggle('note-placing', NOTE_PLACE);
  const b = $('#noteAdd'); if (b) b.setAttribute('aria-pressed', String(NOTE_PLACE));
  if (NOTE_PLACE) toast(`${TOUCHY ? 'Toca' : 'Elige'} dónde va la nota.`, 4000);
  else $$('.toast').forEach(t => t.remove());
}
let NOTE_SWALLOW = 0;
document.addEventListener('pointerdown', e => {
  if (!NOTE_PLACE || (e.target.closest && e.target.closest('#noteAdd'))) return;
  e.preventDefault(); e.stopImmediatePropagation();
  NOTE_SWALLOW = Date.now();
  const a = noteAnchorAt(e.clientX, e.clientY);
  notePlace(false);
  if (a) noteCompose(a.on, pointRect(e));
}, true);
document.addEventListener('click', e => { if (Date.now() - NOTE_SWALLOW < 700) { e.preventDefault(); e.stopPropagation(); NOTE_SWALLOW = 0; } }, true);
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (NOTE_PLACE) { notePlace(false); e.preventDefault(); return; }
  if (NF.el) { nfClose(); e.preventDefault(); return; }
  if ($('#notesPanel.open') && !$('#pop') && !$('#modal') && !$('#ask')) { npClose(); e.preventDefault(); }
});

/* ---------- describir un cambio: «cambió el plano 1.2», «agregó la tarea «Casting»» ---------- */
const chCanon = v => typeof canon === 'function' ? canon(v) : JSON.stringify(v);
function chDiff(B, A) {
  const out = { add: [], del: [], mod: [] };
  const toMap = x => Array.isArray(x) ? Object.fromEntries(x.filter(o => o && o.id != null).map(o => [o.id, o])) : x || {};
  const b = toMap(B), a = toMap(A);
  for (const k of Object.keys(a)) { if (!(k in b)) out.add.push(k); else if (chCanon(a[k]) !== chCanon(b[k])) out.mod.push(k); }
  for (const k of Object.keys(b)) if (!(k in a)) out.del.push(k);
  out.n = out.add.length + out.del.length + out.mod.length;
  return out;
}
const chQ = s => '«' + String(s || '').slice(0, 60) + '»';
const shotName = (id, shots) => D.code && D.code[id] ? 'el plano ' + D.code[id] : shots && shots[id] && shots[id].sc ? 'un plano de la escena ' + shots[id].sc : 'un plano';
const CHDESC = {
  guion(b, a) {
    // guion cerrado: cerrar, reabrir y las revisiones son el aviso (el equipo ve quién y qué color)
    const LB = (b.meta || {}).lock || {}, LA = (a.meta || {}).lock || {}, rn = r => typeof revName === 'function' ? revName(r.c).toLowerCase() : r.c;
    if (!LB.on && LA.on) return { what: 'cerró el guion final' };
    if (LB.on && !LA.on) return { what: 'reabrió el guion' };
    if (LA.on && !LB.rev && LA.rev) return { what: `abrió la revisión ${rn(LA.rev)} del guion` };
    if (LA.on && LB.rev && !LA.rev) { const r = (LA.revs || []).find(x => x.at === LB.rev.at && x.c === LB.rev.c); return { what: `cerró la revisión ${rn(LB.rev)} del guion${r && r.n ? ` (${r.n} ${r.n === 1 ? 'párrafo' : 'párrafos'})` : ' sin cambios'}` }; }
    if (chCanon(b.meta) !== chCanon(a.meta) && chCanon(b.paras) === chCanon(a.paras)) return { what: LA.on && chCanon(LB) !== chCanon(LA) ? 'cambió el acceso al guion cerrado' : 'cambió los datos del proyecto' };
    const B = b.paras || [], A = a.paras || [];
    let i = 0; while (i < B.length && i < A.length && chCanon(B[i]) === chCanon(A[i])) i++;
    let j = 0; while (j < B.length - i && j < A.length - i && chCanon(B[B.length - 1 - j]) === chCanon(A[A.length - 1 - j])) j++;
    const isH = x => x && (x.t === 'h' || x.t === 'scene');
    const sceneAt = k => { let n = 0, key = ''; for (let x = 0; x <= Math.min(k, A.length - 1); x++) if (isH(A[x])) { n++; key = A[x].n || String(n); } return key; };
    const s0 = sceneAt(i), s1 = sceneAt(Math.max(i, A.length - 1 - j));
    const hB = B.filter(isH).length, hA = A.filter(isH).length;
    if (hA > hB) return { what: hA - hB === 1 ? `agregó la escena ${s1 || ''}`.trim() : `agregó ${hA - hB} escenas`, ref: s1 ? 'guion|scene|' + s1 : '' };
    if (hA < hB) return { what: hB - hA === 1 ? 'quitó una escena del guion' : `quitó ${hB - hA} escenas del guion` };
    if (!s0) return { what: 'editó el guion' };
    return { what: s0 === s1 ? `editó la escena ${s0}` : `editó las escenas ${s0} a ${s1}`, ref: 'guion|scene|' + s0 };
  },
  desglose(b, a) {
    const E = chDiff(b.elements, a.elements), nm = id => ((a.elements || {})[id] || (b.elements || {})[id] || {}).name;
    if (E.n === 1) {
      const id = E.add[0] || E.del[0] || E.mod[0];
      return { what: E.add.length ? `agregó ${chQ(nm(id))} al desglose` : E.del.length ? `quitó ${chQ(nm(id))} del desglose` : `cambió ${chQ(nm(id))} en el desglose`, ref: E.del.length ? '' : 'desglose|el|' + id };
    }
    if (E.n > 1) return { what: `cambió ${E.n} elementos del desglose` };
    const tb = (b.tags || []).length, ta = (a.tags || []).length;
    if (ta !== tb) {
      const cnt = t => { const m = {}; for (const x of t || []) if (x && x.el) m[x.el] = (m[x.el] || 0) + 1; return m; };
      const cb = cnt(b.tags), ca = cnt(a.tags), ch = Object.keys({ ...cb, ...ca }).filter(k => (cb[k] || 0) !== (ca[k] || 0));
      if (ch.length === 1) return { what: `${ta > tb ? 'marcó' : 'desmarcó'} ${chQ(nm(ch[0]))} en el guion`, ref: 'desglose|el|' + ch[0] };
      return { what: ta > tb ? `marcó ${ta - tb} elementos en el guion` : `quitó ${tb - ta} marcas del guion` };
    }
    const S = chDiff(b.scenes, a.scenes);
    if (S.n) { const k = S.add[0] || S.mod[0] || S.del[0]; return { what: S.n === 1 ? `cambió la sinopsis de la escena ${k}` : 'cambió sinopsis de escenas', ref: S.n === 1 ? 'guion|scene|' + k : '' }; }
    if (chCanon(b.tags) !== chCanon(a.tags)) return { what: 'cambió marcas del guion' };
    return null;
  },
  storyboard(b, a) {
    const S = chDiff(b.shots, a.shots);
    if (S.n) {
      const ordOnly = S.mod.length && !S.add.length && !S.del.length && S.mod.every(id => { const x = { ...a.shots[id] }, y = { ...b.shots[id] }; delete x.ord; delete y.ord; return chCanon(x) === chCanon(y); });
      if (ordOnly) { const sc = a.shots[S.mod[0]].sc; return { what: `reordenó los planos de la escena ${sc}`, ref: 'guion|scene|' + sc }; }
      if (S.n === 1) {
        const id = S.add[0] || S.del[0] || S.mod[0];
        if (S.add.length) return { what: `agregó ${shotName(id, a.shots)}`, ref: 'storyboard|shot|' + id };
        if (S.del.length) return { what: `eliminó ${shotName(id, b.shots)}` };
        return { what: `cambió ${shotName(id, a.shots)}`, ref: 'storyboard|shot|' + id };
      }
      if (S.add.length && !S.del.length && !S.mod.length) return { what: `agregó ${S.add.length} planos` };
      if (S.del.length && !S.add.length && !S.mod.length) return { what: `eliminó ${S.del.length} planos` };
      return { what: `cambió ${S.n} planos` };
    }
    const L = chDiff(b.looks, a.looks);
    if (L.n) { const id = L.add[0] || L.mod[0] || L.del[0]; const e = P.elements && P.elements[id]; return { what: L.n === 1 && e ? `cambió el aspecto de ${chQ(e.name)}` : 'cambió el aspecto de los personajes', ref: L.n === 1 && e ? 'desglose|el|' + id : '' }; }
    if (chCanon(b.faces) !== chCanon(a.faces)) return { what: 'dibujó o cambió una expresión' };
    if (chCanon(b.plans) !== chCanon(a.plans) || chCanon(b.locPlans) !== chCanon(a.locPlans)) return { what: 'cambió un plano de planta' };
    if (chCanon(b.sets3d) !== chCanon(a.sets3d) || chCanon(b.locSet3d) !== chCanon(a.locSet3d)) return { what: 'cambió un escenario 3D' };
    if (b.aspect !== a.aspect) return { what: 'cambió el formato de imagen' };
    return null;
  },
  animatic(b, a) {
    const Dd = chDiff(b.dur, a.dur);
    if (Dd.n === 1) { const id = Dd.add[0] || Dd.mod[0] || Dd.del[0]; return { what: `cambió la duración de ${shotName(id)}`, ref: 'storyboard|shot|' + id }; }
    if (Dd.n > 1) return { what: `cambió la duración de ${Dd.n} planos` };
    return { what: 'editó el animatic' };
  },
  plan(b, a) {
    const B = (b.schedule || {}), A = (a.schedule || {});
    const days = it => { const m = {}; let d = 1; for (const x of it || []) { if (x && x.d) d++; else if (x && x.k) m[x.k + (x.sp || '')] = d; } return m; };
    const db = days(B.items), da = days(A.items), moved = Object.keys(da).filter(k => k in db && db[k] !== da[k]);
    if (moved.length === 1) { const k = moved[0].replace(/[^\w.-].*$/, ''); return { what: `movió la escena ${moved[0]} a la jornada ${da[moved[0]]}`, ref: 'guion|scene|' + k }; }
    if (moved.length > 1) return { what: `movió ${moved.length} escenas de jornada` };
    if (chCanon(B.items) !== chCanon(A.items)) return { what: (B.items || []).length === (A.items || []).length ? 'reordenó el plan de rodaje' : 'cambió las jornadas del plan' };
    if (B.start !== A.start || chCanon(B.off) !== chCanon(A.off)) return { what: 'cambió las fechas del plan de rodaje' };
    return { what: 'cambió el plan de rodaje' };
  },
  calendario(b, a) {
    const T = chDiff((b.calendar || {}).tasks, (a.calendar || {}).tasks), tb = Object.fromEntries(((b.calendar || {}).tasks || []).map(t => [t.id, t])), ta = Object.fromEntries(((a.calendar || {}).tasks || []).map(t => [t.id, t]));
    if (T.n === 1) {
      const id = T.add[0] || T.del[0] || T.mod[0], x = ta[id] || tb[id] || {};
      if (T.add.length) return { what: `agregó la tarea ${chQ(x.title)}`, ref: 'calendario|task|' + id };
      if (T.del.length) return { what: `eliminó la tarea ${chQ(x.title)}` };
      const y = tb[id] || {};
      if (!!x.done !== !!y.done) return { what: x.done ? `marcó ${chQ(x.title)} como hecha` : `reabrió ${chQ(x.title)}`, ref: 'calendario|task|' + id };
      if (x.start !== y.start || x.end !== y.end || chCanon(x.segs) !== chCanon(y.segs)) return { what: `movió ${chQ(x.title)}`, ref: 'calendario|task|' + id };
      return { what: `editó la tarea ${chQ(x.title)}`, ref: 'calendario|task|' + id };
    }
    if (T.n > 1) return { what: T.add.length === T.n ? `agregó ${T.n} tareas` : `cambió ${T.n} tareas del calendario` };
    return { what: 'cambió el calendario' };
  },
  llamado() { return { what: 'editó la hoja de llamado' }; },
  presupuesto(b, a) {
    const L = chDiff((b.budget || {}).lines, (a.budget || {}).lines), nm = id => (((a.budget || {}).lines || []).find(l => l.id === id) || ((b.budget || {}).lines || []).find(l => l.id === id) || {}).name;
    if (L.n === 1) { const id = L.add[0] || L.del[0] || L.mod[0]; return { what: L.add.length ? `agregó ${chQ(nm(id))} al presupuesto` : L.del.length ? `quitó ${chQ(nm(id))} del presupuesto` : `cambió ${chQ(nm(id))} en el presupuesto`, ref: L.del.length ? '' : 'presupuesto|line|' + id }; }
    if (L.n > 1) return { what: `cambió ${L.n} líneas del presupuesto` };
    return { what: 'cambió los ajustes del presupuesto' };
  },
  hoja(b, a) {
    const Dn = chDiff(b.done, a.done);
    if (Dn.n === 1) { const id = Dn.add[0] || Dn.del[0]; return { what: Dn.add.length ? `marcó ${shotName(id)} como rodado` : `quitó «Rodado» de ${shotName(id)}`, ref: 'storyboard|shot|' + id }; }
    const T = chDiff((b.sup || {}).takes, (a.sup || {}).takes);
    if (T.n === 1) { const id = T.add[0] || T.mod[0] || T.del[0], n = (((a.sup || {}).takes || {})[id] || []).length, m = (((b.sup || {}).takes || {})[id] || []).length; return { what: n > m ? `anotó la toma ${n} de ${shotName(id)}` : `cambió las tomas de ${shotName(id)}`, ref: 'storyboard|shot|' + id }; }
    const O = chDiff((b.sup || {}).obs, (a.sup || {}).obs);
    if (O.n === 1) { const id = O.add[0] || O.mod[0] || O.del[0]; return { what: `escribió observaciones de ${shotName(id)}`, ref: 'storyboard|shot|' + id }; }
    return { what: 'editó la hoja de script' };
  },
  notas(b, a) {
    const B = b.notes || {}, A = a.notes || {}, N = chDiff(B, A);
    if (!N.n) return null;
    const id = N.add[0] || N.mod[0] || N.del[0], n = A[id] || B[id], on = n.on || {};
    const where = on.t === 'txt' && typeof mnWhere === 'function' ? mnWhere(on) : noteLabel(on) || 'una pestaña';
    const ref = on.sec ? `${on.sec}|${on.t}|${on.id}` : '';
    if (N.add.length) return { what: n.re ? `respondió en ${where}` : `dejó una nota en ${where}`, ref };
    if (N.del.length) return { what: `borró una nota en ${where}`, ref };
    const o = B[id] || {};
    if (!!n.done !== !!o.done) return { what: `${n.done ? 'resolvió' : 'reabrió'} una nota en ${where}`, ref };
    if (n.text === o.text && o.on && on.d !== o.on.d) return { what: `cambió la fecha de una nota en ${where}`, ref };
    if (n.text === o.text && o.on && chCanon(on) !== chCanon(o.on)) return { what: `movió una nota en ${where}`, ref };
    return { what: `editó una nota en ${where}`, ref };
  },
};
function describeChange(sec, b, a) {
  let r = null;
  try { r = CHDESC[sec] ? CHDESC[sec](b || {}, a || {}) : null; } catch (e) { r = null; }
  if (!r && sec === 'notas') return null;
  r = r || { what: `cambió «${SECNAME[sec] || sec}»` };
  return { what: String(r.what).slice(0, 160), ref: r.ref || '' };
}

/* ---------- actividad ---------- */
const ACTV = { items: [], counts: [], next: 0, pid: null, loaded: false, loading: false };
const ACT_GAP = 180e3;
const actApi = () => API() && SHARE;
/* sin equipo: el registro va en el proyecto (los últimos 400 cambios y el total de cada persona) */
let ACT_BASE = {}, ACT_T = 0;
function actReset() {
  clearTimeout(ACT_T); ACT_BASE = {};
  ACTV.items = []; ACTV.counts = []; ACTV.next = 0; ACTV.pid = P ? P.id : null; ACTV.loaded = false;
  if (!P) return;
  for (const s of SEC_DATA) ACT_BASE[s] = chCanon(secGet(P, s));
  if (P.act && !Array.isArray(P.act.items)) P.act = null;
}
function actSoon() { clearTimeout(ACT_T); ACT_T = setTimeout(actTick, 1500); }
function actTick() {
  if (!P || actApi() || SHARE) return;    // con equipo y servidor la lleva el servidor
  const me = noteMe();
  for (const s of SEC_DATA) {
    const cur = chCanon(secGet(P, s));
    if (ACT_BASE[s] === undefined) { ACT_BASE[s] = cur; continue; }
    if (cur === ACT_BASE[s]) continue;
    const ch = describeChange(s, JSON.parse(ACT_BASE[s]), JSON.parse(cur));
    ACT_BASE[s] = cur;
    if (ch) actLocal(s, ch, me);
  }
}
function actLocal(sec, ch, me) {
  const A = P.act = P.act || { items: [], counts: {} };
  const t = Date.now(), last = A.items[0], note = sec === 'notas';
  if (last && last.uid === me.id && last.sec === sec && last.what === ch.what && last.ref === ch.ref && t - last.ts < ACT_GAP) { last.n = (last.n || 1) + 1; last.ts = t; }
  else {
    A.items.unshift({ id: uid('a'), uid: me.id, name: me.name, sec, what: ch.what, ref: ch.ref, n: 1, ts: t });
    if (A.items.length > 400) A.items.length = 400;
    const c = A.counts[me.id] = A.counts[me.id] || { name: me.name, n: 0, c: 0 };
    if (note) c.c++; else c.n++;
    c.last = t;
  }
  if ($('#notesPanel.open')) npPaint();
}
const actItems = () => actApi() ? ACTV.items : P && P.act ? P.act.items : [];
const actCounts = () => actApi() ? ACTV.counts : P && P.act ? Object.entries(P.act.counts).map(([uid, c]) => ({ uid, ...c })).sort((a, b) => b.n - a.n || b.c - a.c) : [];
async function actLoad(more) {
  if (!actApi() || ACTV.loading) return;
  if (ACTV.pid !== SHARE.pid) { ACTV.pid = SHARE.pid; ACTV.items = []; ACTV.counts = []; ACTV.next = 0; ACTV.loaded = false; }
  ACTV.loading = true;
  try {
    const r = (await apiFetch('GET', `/api/p/${encodeURIComponent(SHARE.pid)}/activity${more && ACTV.next ? '?before=' + ACTV.next : ''}`)).json;
    ACTV.items = more ? [...ACTV.items, ...r.items] : r.items; ACTV.counts = r.counts; ACTV.next = r.next; ACTV.loaded = true;
  } catch (e) { if (!more) ACTV.err = e.message; }
  ACTV.loading = false;
  if ($('#notesPanel.open')) npPaint();
}
/* un cambio que avisa el servidor (de cualquier persona, también los propios) */
function actRemote(pid, d) {
  if (!SHARE || SHARE.pid !== pid) return;
  if (ACTV.pid === pid && ACTV.loaded && d.aid) {
    const it = ACTV.items.find(x => x.id === d.aid);
    if (it) { it.n = (it.n || 1) + (d.aj ? 1 : 0); it.ts = d.ts || Date.now(); ACTV.items = [it, ...ACTV.items.filter(x => x !== it)]; }
    else ACTV.items.unshift({ id: d.aid, uid: d.uid, name: d.by, sec: d.sec, what: d.what, ref: d.ref || '', n: 1, ts: d.ts || Date.now() });
    if (!d.aj) {
      let c = ACTV.counts.find(x => x.uid === d.uid);
      if (!c) { c = { uid: d.uid, name: d.by, n: 0, c: 0 }; ACTV.counts.push(c); }
      if (d.sec === 'notas') c.c++; else c.n++;
      c.last = d.ts || Date.now();
      ACTV.counts.sort((a, b) => b.n - a.n || b.c - a.c);
    }
    if ($('#notesPanel.open')) npPaint();
  }
  if (SHARE.me && d.uid === SHARE.me.id) return;
  // Gastos sin detalle (a quien no ve todo Gastos el servidor no le dice quién ni qué): solo se trae su versión, sin aviso
  if (d.sec === 'gastos' && !d.by) return;
  // el aviso: quién cambió qué, con «Ver» para ir a eso
  const what = d.what || `cambió «${SECNAME[d.sec] || d.sec}»`;
  if (d.aj && Date.now() - (actRemote.last || 0) < 20000 && actRemote.lastKey === d.uid + what) return;    // lo mismo otra vez: un solo aviso
  actRemote.last = Date.now(); actRemote.lastKey = d.uid + what;
  toast(`${d.by || 'Alguien'} ${what}`, 5000, d.ref ? { label: 'Ver', fn: () => actGo(d.ref, d.sec === 'notas') } : undefined);
}
function actGo(ref, thread) {
  const [sec, t, ...r] = String(ref).split('|'), id = r.join('|');
  if (!t) return;
  const tab = t === 'tab' ? id : sec === 'hoja' ? 'sup' : NOTE_KIND[t] && NOTE_KIND[t].tab || SEC2TAB[sec];
  noteGoto(t, id, tab, thread);
}
/* ir a algo: cambia de pestaña, lo busca, lo muestra y (si se pide) abre su conversación */
function noteGoto(t, id, tab, thread, nid) {
  if (tab && !canSeeTab(tab)) { toast('No tienes acceso a esa pestaña.'); return; }
  if (nid && notesHidden()) ls.set('notesHide', false);
  if (nid) {
    // un globo clavado: se va a la pestaña, se muestra el globo y se abre su conversación ahí
    if (t === 'shot' && UI.sbScene) UI.sbScene = '';
    if (tab && tab !== UI.tab) setTab(tab); else render();
    setTimeout(() => {
      const b = $(`.nb[data-nid="${CSS.escape(nid)}"]`), key = t + ':' + id + '#' + nid;
      if (!b) { if (notesAt(key).length) noteThread(key, $('#noteAdd') || $('#tabs')); return; }
      const det = b.closest('details:not([open])'); if (det) { det.open = true; notesPaint(); }
      b.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      setTimeout(() => { const p = $(`.nb[data-nid="${CSS.escape(nid)}"]`); if (p) { flashNote(key); noteThread(key, p); } }, 380);
    }, 60);
    return;
  }
  if (t === 'shot' && UI.sbScene) UI.sbScene = '';
  if (t === 'el' && tab === 'breakdown') UI.bdView = 'elements';
  if (tab && tab !== UI.tab) setTab(tab); else render();
  setTimeout(() => {
    const key = t + ':' + id;
    // la que se ve (una nota al margen tiene su tarjeta y, en pantallas angostas, su marca)
    const el = t === 'tab' ? $('#tab-' + id) : $$(`#view [data-note="${CSS.escape(key)}"]`).find(x => x.offsetParent) || $(`#view [data-note="${CSS.escape(key)}"]`);
    if (!el) { if (thread && notesAt(key).length) noteThread(key, $('#noteAdd') || $('#tabs')); else toast('No se encontró en esta vista (puede estar oculto por un filtro).', 3500); return; }
    const det = el.closest('details:not([open])'); if (det) { det.open = true; notesPaint(); }
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    el.classList.remove('note-flash'); void el.offsetWidth; el.classList.add('note-flash');
    if (thread) setTimeout(() => { const b = $(`.nb[data-nb="${CSS.escape(key)}"]`) || el; if (notesAt(key).length) noteThread(key, b); }, 420);
  }, 60);
}

/* ---------- panel: notas y actividad ----------
   En la computadora es una columna angosta a la derecha que corre el área de trabajo (no la tapa);
   en el teléfono, una hoja translúcida que sube hasta la mitad. */
const NP = { view: 'notes', filter: 'open' };
function npOpen(view, key) {
  let pn = $('#notesPanel');
  if (!pn) {
    pn = document.createElement('aside'); pn.id = 'notesPanel'; pn.className = 'np';
    pn.setAttribute('role', 'complementary'); pn.setAttribute('aria-label', 'Notas y actividad');
    document.body.appendChild(pn);
    pn.addEventListener('click', npClick);
    thBind(pn, () => NP.view === 'thread' ? NP.key : null);
  }
  if (NP.view === 'thread' && pn.classList.contains('open') && key !== NP.key) thPending(pn);
  if (view) NP.view = view;
  if (key) NP.key = key;
  nfClose();
  lookClose();
  pn.classList.add('open'); document.body.classList.add('np-on');
  dispatchEvent(new Event('resize'));
  npPaint();
  if (NP.view === 'act') actLoad();
}
function npClose() {
  const pn = $('#notesPanel'); if (!pn || !pn.classList.contains('open')) return;
  if (NP.view === 'thread') { thPending(pn); NP.view = 'notes'; }
  pn.classList.remove('open'); document.body.classList.remove('np-on');
  dispatchEvent(new Event('resize'));
  notesPaint();
  if (UI.kbd) { const b = $('#noteAdd'); if (b) b.focus(); }
}
function npPaint() {
  const pn = $('#notesPanel'); if (!pn || !P) return;
  // una conversación: atrás, de qué es (tocarlo lleva a eso) y cerrar; abajo, responder
  if (NP.view === 'thread' && NP.key && notesAt(NP.key).length) {
    pn.innerHTML = `<div class="np-head"><button class="nf-ic" data-np="back" aria-label="Todas las notas" title="Todas las notas">${NI.prev}</button><button class="np-lab" data-np="locate" title="Ir a esto">${NOTE_ICO}<span>${esc(keyLabel(NP.key))}</span></button><button class="nf-ic" data-np="close" aria-label="Cerrar">${NI.x}</button></div><div class="th-box np-th">${threadBody(NP.key)}</div>`;
    for (const b of $$('.nb')) b.classList.toggle('nb-on', b.dataset.nb === NP.key);
    return;
  }
  if (NP.view === 'thread') NP.view = 'notes';
  for (const b of $$('.nb.nb-on')) b.classList.remove('nb-on');
  const roots = noteRoots(), open = roots.filter(n => !n.done), done = roots.filter(n => n.done);
  const head = `<div class="np-head"><div class="seg np-seg" role="group" aria-label="Ver"><button data-np="notes" aria-pressed="${ea(NP.view === 'notes')}">Notas${open.length ? ` ${open.length}` : ''}</button><button data-np="act" aria-pressed="${ea(NP.view === 'act')}">Actividad</button></div><button class="nf-ic" data-np="close" aria-label="Cerrar notas y actividad">${NI.x}</button></div>`;
  let body = '';
  if (NP.view === 'notes') {
    const list = (NP.filter === 'done' ? done : open).sort((a, b) => noteLast(b) - noteLast(a));
    body = `${done.length ? `<div class="np-filter"><button data-npf="open" aria-pressed="${ea(NP.filter === 'open')}">Abiertas</button><button data-npf="done" aria-pressed="${ea(NP.filter === 'done')}">Resueltas ${done.length}</button></div>` : ''}
      ${list.map(n => { const rs = noteReplies(n.id), tab = noteTabOf(n.on); return `<button class="np-item" data-go="${esc(pinKey(n))}" data-tab="${ea(tab)}">
        <span class="np-where"><b>${esc(noteLabel(n.on) || 'Nota')}</b><span>${esc(TAB_NAME[tab] || '')}</span></span>
        <span class="np-text">${esc(n.text)}</span>
        <span class="np-meta">${esc(noteMine(n) ? 'Tú' : n.name || '')} · ${agoText(noteLast(n))}${rs.length ? ` · ${rs.length === 1 ? '1 respuesta' : rs.length + ' respuestas'}` : ''}</span></button>`; }).join('')
      || `<p class="np-empty">${NP.filter === 'done' ? 'No hay notas resueltas.' : canWriteNotes() ? 'Sin notas. Arrastra el botón de nota hasta un plano, una escena, una tarea…' : 'Sin notas.'}</p>`}`;
  } else {
    const cs = actCounts(), items = actItems();
    body = actApi() && !ACTV.loaded ? `<p class="np-empty">${ACTV.err ? esc(ACTV.err) : 'Cargando…'}</p>` : `
      ${cs.length ? `<ul class="np-people">${cs.map(c => `<li><b>${esc(c.uid === noteMe().id ? youName(c.name) : c.name || 'Alguien')}</b><span class="tnum">${c.n} ${c.n === 1 ? 'cambio' : 'cambios'}${c.c ? ` · ${c.c} ${c.c === 1 ? 'nota' : 'notas'}` : ''}</span></li>`).join('')}</ul>` : ''}
      ${items.length ? `<ul class="np-act">${items.map(x => { const p = (x.ref || '').split('|'), tab = x.ref ? (p[0] === 'hoja' ? 'sup' : NOTE_KIND[p[1]] && NOTE_KIND[p[1]].tab || SEC2TAB[p[0]]) : SEC2TAB[x.sec], what = x.what || `cambió «${SECNAME[x.sec] || x.sec}»`; return `<li><${x.ref ? `button type="button" class="np-a" data-ref="${esc(x.ref)}" data-sec="${esc(x.sec)}"` : 'div class="np-a"'}><span>${x.uid === noteMe().id ? `<b>Tú</b> ${esc(youVerb(what))}` : `<b>${esc(x.name || 'Alguien')}</b> ${esc(what)}`}</span><small>${esc(TAB_NAME[tab] || SECNAME[x.sec] || '')} · ${agoText(x.ts)}${x.n > 1 ? ` · ×${x.n}` : ''}</small></${x.ref ? 'button' : 'div'}></li>`; }).join('')}</ul>
        ${actApi() && ACTV.next ? '<button class="linkbtn np-more" data-np="more">Ver más</button>' : ''}` : '<p class="np-empty">Aquí aparece quién cambió qué y cuándo.</p>'}`;
  }
  const sc = $('.np-body', pn), top = sc ? sc.scrollTop : 0;
  pn.innerHTML = head + `<div class="np-body">${body}</div>`;
  const nb = $('.np-body', pn); if (nb) nb.scrollTop = top;
}
function npClick(e) {
  const b = e.target.closest('[data-np],[data-npf],[data-go],[data-ref]'); if (!b) return;
  if (b.dataset.np === 'close') { npClose(); return; }
  if (b.dataset.np === 'back') { thPending($('#notesPanel')); NP.view = 'notes'; npPaint(); return; }
  if (b.dataset.np === 'locate') { const g = NP.key, h = g.indexOf('#'), k = h > 0 ? g.slice(0, h) : g, i = k.indexOf(':'), r = notesAt(g)[0]; noteGoto(k.slice(0, i), k.slice(i + 1), r ? noteTabOf(r.on) : null, false); return; }
  if (b.dataset.np === 'notes' || b.dataset.np === 'act') { NP.view = b.dataset.np; npPaint(); if (NP.view === 'act') actLoad(); return; }
  if (b.dataset.np === 'more') { actLoad(true); return; }
  if (b.dataset.npf) { NP.filter = b.dataset.npf; npPaint(); return; }
  if (nfSmall()) npClose();
  if (b.dataset.go) { const g = b.dataset.go, h = g.indexOf('#'), k = h > 0 ? g.slice(0, h) : g, i = k.indexOf(':'); noteGoto(k.slice(0, i), k.slice(i + 1), b.dataset.tab, true, h > 0 ? g.slice(h + 1) : null); return; }
  if (b.dataset.ref) actGo(b.dataset.ref, b.dataset.sec === 'notas');
}

/* ---------- el botón de arriba ---------- */
function notesInit() { noteDragInit(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', notesInit); else setTimeout(notesInit, 0);
// listo: ui.js llama a notesPaint, actSoon y actReset solo desde aquí en adelante
var NOTES_ON = true;
