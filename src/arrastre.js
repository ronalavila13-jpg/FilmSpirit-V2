/* ============================================================
   ARRASTRE · los mismos gestos en todas las barras (plan, calendario, animatic)
   · Con el ratón, la barra se agarra al primer clic: presionar y mover la arrastra al
     instante (las demás le hacen espacio; los cambios se aplican al soltar).
   · En pantallas táctiles, mantener el dedo un instante la levanta (deslizar desplaza la vista).
   · Presionar y arrastrar sobre un espacio vacío dibuja un recuadro que elige varias barras;
     después, arrastrar cualquiera de ellas mueve todas juntas.
   · Un clic corto elige; otro clic sobre la misma la suelta; un clic en un espacio vacío
     quita la selección (en todo el programa). Los campos de texto se editan como siempre.
   ============================================================ */
const HOLD_MS = 260, HOLD_TOL = 5;
/* pantalla táctil sin ratón: los textos de ayuda hablan del dedo en vez del clic derecho */
const TOUCHY = matchMedia('(hover:none) and (pointer:coarse)').matches;
/* gesto de presión: onLift(ev) al arrastrar con el ratón o al mantener el dedo; onSweep(ev) al arrastrar
   enseguida (sin onLift, o con grab: false); nada si es un clic */
function pressGesture(e, { target, onLift, onSweep, hold = HOLD_MS, grab = true }) {
  const x0 = e.clientX, y0 = e.clientY, touch = e.pointerType === 'touch';
  const field = e.target.closest && e.target.closest('input,textarea,select,[contenteditable="true"]');
  let last = e, over = false;
  const el = target || null;
  if (el && onLift) el.classList.add('pressing');
  const end = () => {
    over = true; clearTimeout(tm);
    if (el) el.classList.remove('pressing');
    removeEventListener('pointermove', mv, true); removeEventListener('pointerup', end, true); removeEventListener('pointercancel', end, true);
    removeEventListener('scroll', end, true); removeEventListener('pointerdown', other, true);
  };
  // un segundo dedo (pellizco) cancela el gesto
  const other = ev => { if (ev.pointerId !== e.pointerId) end(); };
  const mv = ev => {
    last = ev;
    if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < HOLD_TOL) return;
    end();
    // en un campo, arrastrar selecciona texto; en pantallas táctiles, desplaza la vista
    if (touch || field) return;
    // la garra: con el ratón, presionar y mover arrastra la barra al instante
    if (onLift && grab) { suppressClick(); document.body.classList.add('grabbing'); addEventListener('pointerup', ungrab, true); addEventListener('pointercancel', ungrab, true); onLift(ev); return; }
    if (onSweep) onSweep(ev);
  };
  const tm = onLift && (touch || !grab) ? setTimeout(() => {
    if (over) return;
    end();
    if (field) { try { field.blur(); getSelection().removeAllRanges(); } catch (er) { } }
    suppressClick();
    if (touch) holdTouch();
    onLift(last);
  }, hold) : 0;
  addEventListener('pointermove', mv, true); addEventListener('pointerup', end, true); addEventListener('pointercancel', end, true);
  addEventListener('scroll', end, true); addEventListener('pointerdown', other, true);
}
function ungrab() { document.body.classList.remove('grabbing'); removeEventListener('pointerup', ungrab, true); removeEventListener('pointercancel', ungrab, true); }
/* en pantallas táctiles, una vez levantada la barra el dedo arrastra y ya no desplaza la vista */
function holdTouch() {
  const stop = ev => { if (ev.cancelable) ev.preventDefault(); };
  const off = () => { removeEventListener('touchmove', stop, { passive: false }); removeEventListener('touchend', off, true); removeEventListener('touchcancel', off, true); };
  addEventListener('touchmove', stop, { passive: false }); addEventListener('touchend', off, true); addEventListener('touchcancel', off, true);
}
/* después de arrastrar, el clic que suelta el botón no abre menús ni campos */
function suppressClick() {
  const stop = ev => { ev.preventDefault(); ev.stopPropagation(); };
  addEventListener('click', stop, true);
  setTimeout(() => removeEventListener('click', stop, true), 450);
}
/* animación FLIP: se mide antes de mover, se mueve y cada elemento se desliza a su lugar nuevo */
function flipSnap(els) { const m = new Map(); for (const el of els) m.set(el, el.getBoundingClientRect()); return m; }
function flipPlay(snap, ms = 170) {
  for (const [el, r] of snap) {
    const n = el.getBoundingClientRect(), dx = r.left - n.left, dy = r.top - n.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    el.style.transition = 'none'; el.style.transform = `translate(${dx}px,${dy}px)`;
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = `transform ${ms}ms cubic-bezier(.2,.75,.25,1)`; el.style.transform = ''; }));
  }
}
const flipClear = els => els.forEach(el => { el.style.transition = ''; el.style.transform = ''; });
/* desplazamiento automático cerca de los bordes mientras se arrastra */
function edgeScroll(sc, x, y, axis = 'y') {
  if (!sc) return;
  const b = sc.getBoundingClientRect(), m = 54, k = 18;
  if (axis !== 'x') { if (y < b.top + m) sc.scrollTop -= k * (1 - (y - b.top) / m); else if (y > b.bottom - m) sc.scrollTop += k * (1 - (b.bottom - y) / m); }
  if (axis !== 'y') { if (x < b.left + m) sc.scrollLeft -= k * (1 - (x - b.left) / m); else if (x > b.right - m) sc.scrollLeft += k * (1 - (b.right - x) / m); }
}
/* recuadro de selección: items() da los elementos seleccionables; onPick(lista, terminado) */
function sweepSelect(start, { scroller, items, onPick, axis = 'both' }) {
  const box = document.createElement('div');
  box.className = 'sweep';
  document.body.appendChild(box);
  document.body.classList.add('sweeping');
  const sc0 = scroller ? { l: scroller.scrollLeft, t: scroller.scrollTop } : { l: 0, t: 0 };
  let cx = start.clientX, cy = start.clientY, raf = 0;
  const all = items();
  const paint = fin => {
    // el punto de partida se corre con el desplazamiento de la vista
    const ox = scroller ? scroller.scrollLeft - sc0.l : 0, oy = scroller ? scroller.scrollTop - sc0.t : 0;
    const x0 = start.clientX - ox, y0 = start.clientY - oy;
    const l = Math.min(x0, cx), t = Math.min(y0, cy), r = Math.max(x0, cx), btm = Math.max(y0, cy);
    Object.assign(box.style, { left: l + 'px', top: t + 'px', width: (r - l) + 'px', height: (btm - t) + 'px' });
    const hit = all.filter(el => { const q = el.getBoundingClientRect(); return (axis === 'y' || (q.right > l && q.left < r)) && (axis === 'x' || (q.bottom > t && q.top < btm)); });
    onPick(hit, fin);
  };
  const tick = () => { edgeScroll(scroller, cx, cy, axis === 'both' ? 'xy' : axis); paint(false); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  const mv = ev => { cx = ev.clientX; cy = ev.clientY; };
  const up = () => {
    cancelAnimationFrame(raf);
    removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true);
    paint(true); box.remove(); document.body.classList.remove('sweeping'); suppressClick();
  };
  addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
}

/* tocar dos veces para abrir o desplegar: en zonas donde un toque suelto abría cosas sin querer
   (el calendario en el teléfono). El primer toque se ignora (con un aviso breve) y el segundo,
   si llega pronto sobre lo mismo, sigue su camino normal. */
/* solo con el dedo o el lápiz: con el ratón (o el teclado) un clic basta */
function doubleTap(root, sel, hint) {
  let k0 = '', t0 = 0, warned = 0, kind = '';
  const key = el => [el.dataset.act || '', el.dataset.open || '', el.dataset.id || '', el.dataset.ph || '', el.dataset.d || '', el.dataset.s || ''].join('|');
  root.addEventListener('pointerdown', e => { kind = e.pointerType; }, true);
  root.addEventListener('click', e => {
    const el = e.target.closest(sel);
    if (!el || !root.contains(el)) return;
    if (kind !== 'touch' && kind !== 'pen') return;
    const k = key(el), now = Date.now();
    if (k === k0 && now - t0 < 450) { k0 = ''; return; }
    k0 = k; t0 = now;
    e.preventDefault(); e.stopImmediatePropagation();
    if (hint && now - warned > 6000) { warned = now; toast(hint, 1800); }
  }, true);
}
/* doble toque sobre un elemento (también con el ratón): onDouble(el) */
function onDoubleTap(root, sel, onDouble) {
  let k0 = null, t0 = 0, x0 = 0, y0 = 0;
  root.addEventListener('click', e => {
    const el = e.target.closest(sel);
    if (!el || !root.contains(el)) return;
    const k = el.dataset.id + '|' + (el.dataset.s || ''), now = Date.now();
    if (k === k0 && now - t0 < 450 && Math.hypot(e.clientX - x0, e.clientY - y0) < 30) { k0 = null; onDouble(el, e); return; }
    k0 = k; t0 = now; x0 = e.clientX; y0 = e.clientY;
  });
}

/* ---------- quitar la selección con un clic en un espacio vacío (regla de todo el programa) ----------
   Cada pestaña registra cómo limpia su selección y qué zonas la conservan (los elementos elegibles,
   que manejan su propio clic, y los paneles que trabajan sobre la selección). */
const DESEL = {};
function deselectOn(tab, clear, keep = '') { DESEL[tab] = { clear, keep }; }
const DESEL_SKIP = 'input,textarea,select,button,a,label,summary,option,canvas,video,[contenteditable="true"],[data-act],[data-open],[data-bind],[role="button"],.pop,#pop,#modal,.dlg,.sweep';
document.addEventListener('click', e => {
  const d = typeof UI !== 'undefined' && DESEL[UI.tab];
  const t = e.target;
  if (!d || !t || !t.closest || !t.closest('#view')) return;
  if (t.closest(DESEL_SKIP) || (d.keep && t.closest(d.keep))) return;
  const s = getSelection && getSelection();
  if (s && !s.isCollapsed && String(s).trim()) return;   // terminó de seleccionar texto
  d.clear();
});
/* clic sobre algo ya elegido lo suelta, salvo que sea el segundo clic de un doble clic (que abre) */
const CLICK2 = { k: null, t: 0 };
function secondClick(k) { const now = Date.now(), dbl = CLICK2.k === k && now - CLICK2.t < 450; CLICK2.k = dbl ? null : k; CLICK2.t = now; return dbl; }
