/* ============================================================
   AVISOS, VENTANAS, MENÚS Y DESCARGAS · el armazón de la interfaz
   (antes en ui.js; va justo después en el armado)
   ============================================================ */
/* ---------- avisos, modales y menús ---------- */
/* aviso breve; con act = { label, fn } lleva un botón (Deshacer, Reintentar) y espera mientras el puntero está encima */
function toast(msg, ms = 2600, act) {
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  // un error («No se pudo…») dura más, se anuncia enseguida y se cierra a mano: hay que alcanzar a leer qué hacer
  const err = /^No se pud/.test(String(msg));
  if (err) ms = Math.max(ms, 8000);
  t.className = 'toast' + (act ? ' act' : '') + (err ? ' bad' : ''); t.setAttribute('role', err ? 'alert' : 'status'); t.setAttribute('aria-live', err ? 'assertive' : 'polite');
  const s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
  let tm = 0;
  const go = d => { clearTimeout(tm); tm = setTimeout(() => t.remove(), d); };
  if (act) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = act.label;
    b.onclick = () => { t.remove(); act.fn(); };
    t.appendChild(b);
    t.addEventListener('pointerenter', () => clearTimeout(tm));
    t.addEventListener('pointerleave', () => go(2500));
  }
  if (err && !act) {
    const x = document.createElement('button'); x.type = 'button'; x.className = 'toast-x'; x.setAttribute('aria-label', 'Cerrar el aviso'); x.innerHTML = typeof ICO !== 'undefined' ? ICO.close : '×';
    x.onclick = () => t.remove(); t.appendChild(x);
    t.addEventListener('pointerenter', () => clearTimeout(tm)); t.addEventListener('pointerleave', () => go(4000));
  }
  document.body.appendChild(t);
  go(ms);
  return t;
}
/* error que la persona tiene que ver (no se guardó, no se subió…): un solo aviso a la vez, con «Reintentar» si se puede */
let PROBLEM_T = 0;
function problem(msg, retry) {
  if (Date.now() - PROBLEM_T < 1500 && !retry) return;
  PROBLEM_T = Date.now();
  console.warn('FilmSpirit:', msg);
  const t = toast(msg, retry ? 9000 : 5500, retry ? { label: 'Reintentar', fn: retry } : null);
  t.classList.add('bad');
}
/* valores de los campos de una ventana: si cambian, cerrar sin guardar pregunta antes */
const formState = r => $$('input,select,textarea,[aria-pressed]', r).filter(x => x.type !== 'file' && x.type !== 'password' && !x.closest('[data-noguard]'))
  .map(x => x.matches('[aria-pressed]') && !/^(INPUT|SELECT|TEXTAREA)$/.test(x.tagName) ? x.getAttribute('aria-pressed') : x.type === 'checkbox' || x.type === 'radio' ? x.checked : x.value).join('\u0001');
/* modal({ title, body, foot, wide, onMount, onClose, dirty, keep, noEsc, save })
   · tocar fuera cierra solo si el toque empezó y terminó fuera (soltar un arrastre en el borde no cierra);
     con keep, tocar fuera no cierra nunca (editores grandes)
   · dirty(): hay cambios sin guardar → al cerrar con ✕, Esc, fuera o «Cancelar» se pregunta (save: guardar desde la pregunta)
   · sin dirty, las ventanas con un botón principal que guarda preguntan si sus campos cambiaron (no al pulsar «Cancelar»)
   · un editor con cambios no se cierra si se abre otra ventana encima: queda debajo y vuelve al cerrarla */
/* con qué se está usando la app: el teclado (Tab, flechas) o el mouse o el dedo. El CSS marca el foco de las listas
   desplegables solo con el teclado (Chrome lo marca siempre en las listas, también al elegir con el mouse) */
addEventListener('pointerdown', () => { document.documentElement.dataset.input = 'pointer'; }, true);
addEventListener('keydown', e => { if (e.key === 'Tab' || e.key.startsWith('Arrow')) document.documentElement.dataset.input = 'key'; }, true);
function modal({ title, body, foot, wide, onMount, onClose, dirty, keep, noEsc, save }) {
  const cur = $('#modal');
  let under = null;
  tgClose();
  if (cur && cur._dirty) { cur.id = ''; cur.hidden = true; under = cur; } else closeModal();
  const m = document.createElement('div');
  m.className = 'modal'; m.id = 'modal';
  m.innerHTML = `<div class="dlg${ea(wide ? ' wide' : '')}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header><h2>${esc(title)}</h2><button class="btn ghost sm" data-close aria-label="Cerrar">${ICO.close}</button></header>
    <div class="body">${body}</div>${foot ? `<footer>${foot}</footer>` : ''}</div>`;
  m._focus = document.activeElement;
  document.body.appendChild(m);
  m._onClose = onClose; m._dirty = dirty || null; m._keep = !!keep; m._noEsc = !!noEsc; m._save = save || null; m._under = under;
  m._t0 = Date.now();
  let downOut = false;
  m.addEventListener('pointerdown', e => { downOut = e.target === m; });
  m.addEventListener('click', e => {
    // un toque que llega enseguida de abrir (el segundo de un doble toque) no la cierra
    if (e.target === m) { if (downOut && !m._keep && Date.now() - m._t0 > 450) tryCloseModal('fuera'); downOut = false; return; }
    const c = e.target.closest('[data-close]');
    if (c && m.contains(c)) tryCloseModal(c.closest('header') ? 'x' : 'btn');
  });
  if (onMount) onMount(m);
  if (!dirty && $('footer .btn.primary:not([data-close])', m)) m._form0 = formState($('.body', m));
  // el foco entra a la ventana (si no lo puso ella misma) y Tab recorre solo lo de adentro
  setTimeout(() => {
    if (!m.isConnected || m.contains(document.activeElement)) return;
    const dlg = $('.dlg', m); dlg.tabIndex = -1;
    // en los editores (el del plano) y en el teléfono, el foco va a la ventana: no abre el teclado ni roba los atajos
    const first = !m._dirty && !matchMedia('(pointer:coarse)').matches && $('.body input:not([type=hidden]):not(:disabled):not([type=checkbox]):not([type=radio]):not([type=range]),.body textarea', m);
    (first || dlg).focus({ preventScroll: true });
  }, 0);
  m.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || m.hidden) return;
    const L = $$('a[href],button:not(:disabled),input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])', m).filter(x => x.offsetParent || x === document.activeElement);
    if (!L.length) return;
    const a = L[0], z = L[L.length - 1];
    if (e.shiftKey && (document.activeElement === a || !m.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  });
  return m;
}
function modalDirty(m) {
  if (!m) return false;
  if (m._dirty) return !!m._dirty();
  return m._form0 != null && formState($('.body', m)) !== m._form0;
}
/* cierre pedido por la persona: con cambios, primero pregunta */
function tryCloseModal(how) {
  const m = $('#modal'); if (!m) return;
  if (how === 'esc' && m._noEsc) return;
  if (modalDirty(m) && (how !== 'btn' || m._dirty)) askDiscard(() => { if (m.isConnected) closeModal(); }, { save: m._save });
  else closeModal();
}
/* cierre desde el código (después de guardar, al cambiar de ventana): sin preguntar */
function closeModal() {
  const m = $('#modal');
  if (!m) return;
  if (m._onClose) m._onClose();
  m.remove();
  if (m._under && m._under.isConnected) { m._under.id = 'modal'; m._under.hidden = false; }
  else if (m._focus && m._focus.isConnected && m._focus.focus) try { m._focus.focus({ preventScroll: true }); } catch (e) { }
}
/* pregunta encima de todo (no cierra lo que está abierto debajo). Esc o tocar fuera = cancelar */
function askBox({ title, text, ok, cancel = 'Cancelar', danger = true, onOk, onCancel, alt }) {
  const prev = $('#ask'); if (prev) prev.remove();
  const a = document.createElement('div');
  a.className = 'modal ask'; a.id = 'ask';
  a.innerHTML = `<div class="dlg" role="alertdialog" aria-modal="true" aria-labelledby="askT" aria-describedby="askD">
    <header><h2 id="askT">${esc(title)}</h2></header>
    <div class="body"><p id="askD" style="margin:0">${text}</p></div>
    <footer>${alt ? `<div class="left"><button class="btn" data-a="alt">${esc(alt.label)}</button></div>` : ''}<button class="btn" data-a="no">${esc(cancel)}</button><button class="btn ${ea(danger ? 'bad' : 'primary')}" data-a="ok">${esc(ok)}</button></footer></div>`;
  const back = document.activeElement;
  document.body.appendChild(a);
  let downOut = false;
  a.addEventListener('pointerdown', e => { downOut = e.target === a; });
  a._done = w => {
    a.remove();
    if (back && back.isConnected && back.focus) try { back.focus({ preventScroll: true }); } catch (e) { }
    if (w === 'ok') onOk && onOk(); else if (w === 'alt') alt.fn(); else onCancel && onCancel();
  };
  a.addEventListener('click', e => {
    if (e.target === a) { if (downOut) a._done('no'); return; }
    const b = e.target.closest('[data-a]'); if (b) a._done(b.dataset.a);
  });
  $('[data-a="no"]', a).focus();
  return a;
}
/* mientras hay una pregunta abierta, el teclado es solo suyo (este escucha se registra antes que los demás) */
addEventListener('keydown', e => {
  const a = document.getElementById('ask'); if (!a) return;
  e.stopImmediatePropagation();
  if (e.key === 'Escape') { e.preventDefault(); a._done('no'); }
  else if (e.key === 'Tab') {
    const bs = $$('button', a), i = bs.indexOf(document.activeElement);
    e.preventDefault(); bs[(i + (e.shiftKey ? -1 : 1) + bs.length) % bs.length].focus();
  }
}, true);
function askDiscard(fn, { save, text } = {}) {
  askBox({ title: '¿Descartar los cambios?', text: text || 'Lo que cambiaste en esta ventana no se guardará.', ok: 'Descartar', cancel: 'Seguir editando', onOk: fn, alt: save ? { label: 'Guardar', fn: save } : null });
}
/* ventanas propias (ficha, fotos, plano de planta): el mismo cuidado que los modales.
   Devuelve req(how): how = 'fuera' | 'x' | 'esc' */
function guardOverlay(ov, { dirty, close, save }) {
  let downOut = false;
  ov.addEventListener('pointerdown', e => { downOut = e.target === ov; }, true);
  return how => {
    if (how === 'fuera' && !downOut) return;
    downOut = false;
    if (how === 'esc' && $('#pop')) { closePop(); return; }
    if (dirty && dirty()) askDiscard(close, { save }); else close();
  };
}
function confirmBox(title, text, okLabel, fn, danger = true) {
  // al aceptar, se cierra también la ventana de debajo (si no es un editor con cambios); al cancelar, se vuelve a ella
  askBox({ title, text, ok: okLabel, danger, onOk: () => { const m = $('#modal'); if (m && !m._dirty) closeModal(); fn(); } });
}
function popover(anchor, html, onMount) {
  closePop();
  const p = document.createElement('div');
  p.className = 'pop'; p.id = 'pop';
  p.innerHTML = html;
  const byKey = !!UI.kbd && !!(anchor && anchor.matches && anchor.matches(':focus'));
  p._back = anchor && anchor.focus ? anchor : null;
  if (p._back && p._back.setAttribute && p._back.hasAttribute('aria-haspopup')) p._back.setAttribute('aria-expanded', 'true');
  document.body.appendChild(p);
  // en el teléfono, lo que se abre desde una barra (la de arriba, las etapas, la de cada pestaña) cuelga de su botón;
  // lo demás sube desde abajo como una hoja
  if (anchor && anchor.closest && anchor.closest('.topbar, #tabs, #view .bar') && matchMedia('(max-width: 760px)').matches) p.classList.add('pop-drop');
  const r = anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor;
  popPlace(p, r);
  setTimeout(() => document.addEventListener('pointerdown', popOutside, true), 0);
  if (onMount) onMount(p);
  // con el teclado: el foco entra al menú y las flechas recorren sus opciones
  const items = () => $$('.menu button:not(:disabled), [role="option"], [role="menuitem"]', p).filter(b => b.offsetParent);
  p.addEventListener('keydown', e => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    const L = items(); if (!L.length) return;
    const i = L.indexOf(document.activeElement);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? L.length - 1 : i < 0 ? 0 : (i + (e.key === 'ArrowDown' ? 1 : -1) + L.length) % L.length;
    e.preventDefault(); L[j].focus();
  });
  if (byKey) { const f = items()[0] || $('input,select,textarea,button', p); if (f) f.focus(); }
  return p;
}
/* debajo del botón si cabe, si no encima; nunca fuera de la pantalla (si es muy alto, se desplaza por dentro).
   En el teléfono el CSS lo convierte en una hoja que sube desde abajo. */
function popPlace(p, r) {
  const pw = p.offsetWidth, ph = Math.min(p.offsetHeight, innerHeight - 16);
  // si no cabe hacia la derecha, se alinea al borde derecho de su botón (no pegado al borde de la ventana)
  let x = r.left + pw > innerWidth - 12 ? (r.right != null ? r.right : r.left) - pw : r.left, y = r.bottom + 6;
  x = Math.min(x, innerWidth - pw - 12);
  if (y + ph > innerHeight - 8) y = r.top - ph - 6 >= 8 ? r.top - ph - 6 : Math.max(8, innerHeight - 8 - ph);
  p.style.left = Math.max(12, x) + 'px'; p.style.top = y + 'px';
  p.style.setProperty('--px', Math.max(8, x) + 'px'); p.style.setProperty('--py', y + 'px');   // (los menús que cuelgan, en el teléfono)
}
/* un menú con trabajo dentro (dibujar una cara) define p._keep(): tocar fuera o Esc pregunta antes de cerrarlo */
function popOutside(e) {
  const p = $('#pop'); if (!p || p.contains(e.target)) return;
  if (e.target.closest && e.target.closest('#ask')) return;
  if (p._keep && p._keep()) { e.preventDefault(); e.stopPropagation(); askDiscard(closePop, { save: p._save }); return; }
  closePop();
}
function tryClosePop() { const p = $('#pop'); if (!p) return; if (p._keep && p._keep()) askDiscard(closePop, { save: p._save }); else closePop(); }
/* repintado pedido por una carga en segundo plano (figuras 3D, imágenes): si hay un arrastre en curso
   espera a que se suelte, para no cortar el gesto a la mitad */
let LATE_R = false;
/* cómo se usa el programa ahora: con el teclado (los menús reciben el foco) o con el puntero */
addEventListener('keydown', e => { if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ' || e.key.startsWith('Arrow')) UI.kbd = true; }, true);
addEventListener('pointerdown', () => { UI.kbd = false; }, true);
/* varias cargas seguidas (imágenes, figuras) se juntan en una sola pintada */
let LATE_T = 0;
function lateRender() { if (UI.pdown) { LATE_R = true; return; } clearTimeout(LATE_T); LATE_T = setTimeout(() => { if (UI.pdown) LATE_R = true; else render(); }, 90); }
document.addEventListener('pointerdown', () => { UI.pdown = true; }, true);
for (const t of ['pointerup', 'pointercancel']) document.addEventListener(t, () => { UI.pdown = false; if (LATE_R) { LATE_R = false; setTimeout(render, 0); } }, true);
function closePop() {
  const p = $('#pop');
  if (p) {
    const back = p._back, had = p.contains(document.activeElement);
    p.remove();
    if (back && back.setAttribute && back.hasAttribute('aria-expanded')) back.setAttribute('aria-expanded', 'false');
    // el foco vuelve al botón que lo abrió (o a su equivalente si la vista se repintó)
    const to = back && back.isConnected ? back : back && back.dataset && back.dataset.act ? $(`[data-act="${CSS.escape(back.dataset.act)}"]${back.dataset.id ? `[data-id="${CSS.escape(back.dataset.id)}"]` : ''}`) : null;
    if (had && to) try { to.focus({ preventScroll: true }); } catch (e) { }
    if (p._onClose) { const f = p._onClose; p._onClose = null; f(); }
  }
  document.removeEventListener('pointerdown', popOutside, true);
}
/* Esc cierra solo lo de más arriba: el menú, si no la ventana (preguntando si hay cambios), si no el panel lateral */
addEventListener('keydown', e => {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  if ($('#pop')) { tryClosePop(); return; }
  if ($('#modal')) { tryCloseModal('esc'); return; }
  if ($('.side.open,.insp.open')) { closeDrawers(); return; }
  hideSelTool();
});

/* ---------- descargas ---------- */
let DL = null;
let OFFER_CAPTURE = null;    // al armar el ZIP del proyecto, los archivos se juntan aquí en vez de descargarse
async function offerFile(filename, data) {
  // devuelve true si el archivo salió (para guardar, por ejemplo, la versión de la hoja de llamado que se envió);
  // «captured» si quedó dentro del ZIP del proyecto (no salió a nadie)
  filename = trFile(filename);   // en inglés, «_call_sheet.pdf» (i18n.js)
  if (OFFER_CAPTURE) { OFFER_CAPTURE.push([filename, data]); return 'captured'; }
  if (DESK) {
    try {
      const bytes = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : new TextEncoder().encode(String(data));
      const where = await DESK.saveFile(filename, bytes);
      if (where) { toast('Guardado: ' + where.split(/[\\/]/).pop()); return true; }
    } catch (e) { problem('No se pudo guardar el archivo. Revisa que la carpeta exista y tenga espacio, y vuelve a exportar.'); }
    return false;
  }
  try {
    if (DL === null && window.claude && window.claude.use) DL = (await window.claude.use('downloads')) || false;
  } catch (e) { DL = false; }
  if (DL) {
    try { await DL.save({ filename, data }); toast('Archivo listo: ' + filename); return true; }
    catch (e) {
      if (e && e.code === 'declined') return false;
      if (e && e.code === 'rate_limited') toast('Ya hay una descarga esperando tu confirmación.');
      else problem('No se pudo ofrecer el archivo en esta vista. Abre FilmSpirit en su propia pestaña y vuelve a exportar.');
    }
    return false;
  }
  try {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return true;
  } catch (e) { problem('Las descargas no están disponibles en esta vista. Abre FilmSpirit en su propia pestaña y vuelve a exportar.'); return false; }
}
