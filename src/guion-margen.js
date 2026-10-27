/* ============================================================
   NOTAS AL MARGEN DEL GUION RAYADO
   Una nota del equipo (notas.js, tipo «txt») pegada a una letra del guion. Se ve al costado de la página, con su
   fecha, y una flecha fina baja hasta el punto del texto (la palabra o lo elegido queda resaltado). Las notas de
   una página se ordenan de arriba abajo sin taparse. En el PDF del guion rayado van en el margen, igual.
   · Crear: soltar el botón de nota sobre el texto, «Pegar una nota» y tocar el texto, o elegir texto y «Nota».
   · Tocar la nota abre su conversación (responder, editar, resolver, borrar). Quien la escribió cambia la fecha
     (la del día en que se escribe, al empezar) y arrastra la punta de la flecha a otro lugar del texto.
   · Si el guion cambia, la nota busca el texto que señalaba (on.q) cerca de donde estaba.
   on = { t:'txt', id, sec:'guion', tab:'lined', label, p (párrafo), o (letra), q (texto de ahí), d (fecha), u (1: un tramo elegido) }
   ============================================================ */
const MN_GUT = 13.5;   // la columna de las notas al costado de la hoja, en «em» de la página (con su separación)
const MN = { sig: '' };
const mnOn = () => !!P && UI.tab === 'lined' && typeof edFormat === 'function' && edFormat() !== 'av';   // (lote AE) sin proyecto abierto (en Inicio), no
const mnNotes = () => typeof noteRoots === 'function' && P && P.notes ? noteRoots().filter(n => n.on && n.on.t === 'txt' && !n.done) : [];
const mnCanMove = n => typeof canWriteNotes === 'function' && canWriteNotes() && (noteMine(n) || !SHARE);
function mnDate(iso) {
  const d = new Date(String(iso || '') + 'T12:00:00');
  return isNaN(d) ? '' : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
}
/* la palabra que contiene la letra o (sus límites); entre palabras o sobre un signo, la más cercana */
function mnWord(x, o) {
  const w = /[\p{L}\p{N}'’_-]/u;
  let s = Math.min(o, x.length);
  if (!(s < x.length && w.test(x[s]))) {
    let r = s; while (r < x.length && !w.test(x[r])) r++;
    let l = s - 1; while (l >= 0 && !w.test(x[l])) l--;
    if (r < x.length && (l < 0 || r - s <= s - l)) s = r; else if (l >= 0) s = l; else return [s, Math.min(x.length, s + 1)];
  }
  let e = s;
  while (s > 0 && w.test(x[s - 1])) s--;
  while (e < x.length && w.test(x[e])) e++;
  return [s, e];
}
/* el lugar de la nota en el guion de ahora: donde estaba, o donde está ahora el texto que señalaba */
function mnResolve(on) {
  const ps = P.paras; if (!ps.length) return null;
  const q = String(on.q || ''), p = clamp(on.p | 0, 0, ps.length - 1), o = Math.max(0, on.o | 0);
  if (!q || ps[p].x.substr(o, q.length) === q) return { p, o: Math.min(o, ps[p].x.length), ok: !!q || (on.p | 0) === p };
  const near = (x, j) => { let b = -1; for (let k = x.indexOf(q); k >= 0; k = x.indexOf(q, k + 1)) if (b < 0 || Math.abs(k - j) < Math.abs(b - j)) b = k; return b; };
  for (let d = 0; d < ps.length; d++) for (const i of d ? [p + d, p - d] : [p]) {
    if (!ps[i]) continue;
    const k = near(ps[i].x, o); if (k >= 0) return { p: i, o: k, ok: true };
  }
  return { p, o: Math.min(o, ps[p].x.length), ok: false };
}
/* en qué página, renglón y columna (en letras) queda una letra; y los tramos de renglón de un pedazo de texto */
function mnSpans(p, a, b) {
  const pos = D.pos[p]; if (!pos) return [];
  const out = [];
  for (let pg = pos.pg0; pg <= pos.pg1; pg++) (D.pages[pg] || []).forEach((ln, li) => {
    if (ln.blank || ln.p !== p) return;
    const s = Math.max(a, ln.o), e = Math.min(b, ln.o + ln.len);
    if (e > s || (a === b && a >= ln.o && a <= ln.o + ln.len)) out.push({ pg, li, c0: ln.ind + s - ln.o, c1: ln.ind + Math.max(e, s) - ln.o });
  });
  return out;
}
/* las notas de cada página, listas para dibujar: dónde apunta la flecha y qué se resalta */
function mnItems() {
  const by = new Map();
  if (!P || !D || !D.pos) return by;
  for (const n of mnNotes()) {
    const r = mnResolve(n.on); if (!r) continue;
    const x = P.paras[r.p].x;
    let [a, b] = n.on.u && r.ok && n.on.q ? [r.o, r.o + String(n.on.q).length] : mnWord(x, r.o);
    if (b <= a) b = a;
    let segs = mnSpans(r.p, a, b);
    if (!segs.length) segs = mnSpans(r.p, r.o, r.o);
    if (!segs.length) continue;
    const pg = segs[0].pg;
    segs = segs.filter(s => s.pg === pg);
    // la flecha corre por la juntura de los renglones (entre las letras) y señala el comienzo o el final de lo marcado
    const s0 = segs[0], c1 = Math.max(s0.c1, s0.c0 + 1), tx = 9 + (s0.c0 + c1) / 2 * .6, ty = 6 + s0.li;
    if (!by.has(pg)) by.set(pg, []);
    by.get(pg).push({ n, r, segs, tx, ty, c0: s0.c0, c1, lost: !r.ok });
  }
  for (const list of by.values()) list.sort((a, b) => a.ty - b.ty || a.tx - b.tx);
  return by;
}
const mnSigOf = () => chCanonSafe([notesHidden(), ...mnNotes().map(n => [n.id, n.on, n.text, n.name, typeof noteReplies === 'function' ? noteReplies(n.id).length : 0])]);
const chCanonSafe = v => { try { return JSON.stringify(v); } catch (e) { return ''; } };
function mnLabel(on) {
  try {
    const r = mnResolve(on), i = r && D.sc.sceneOf ? D.sc.sceneOf[r.p] : -1, s = i >= 0 ? D.sc.scenes[i] : null;
    const sp = r ? mnSpans(r.p, r.o, r.o)[0] : null;
    return (on.d ? 'Nota del ' + mnDate(on.d) : 'Guion rayado') + ' · ' + (s ? 'escena ' + s.key : 'texto') + (sp ? ' · pág. ' + pageLabel(D.pages, sp.pg) : '');
  } catch (e) { return 'Guion rayado'; }
}
/* para la actividad: «dejó una nota en el guion rayado (escena 12)» */
function mnWhere(on) {
  try { const r = mnResolve(on), i = r && D.sc.sceneOf ? D.sc.sceneOf[r.p] : -1, sc = i >= 0 ? D.sc.scenes[i] : null; return 'el guion rayado' + (sc ? ` (escena ${sc.key})` : ''); }
  catch (e) { return 'el guion rayado'; }
}
/* el «on» de una nota nueva en una letra del guion (o en lo elegido: sel = el texto elegido) */
function mnOnAt(p, o, sel) {
  const x = P.paras[p].x;
  let s = o, q;
  if (sel) q = sel.slice(0, 80);
  else { s = mnWord(x, o)[0]; q = x.slice(s, s + 30); }
  const on = { t: 'txt', id: uid('tx'), sec: 'guion', tab: 'lined', p, o: s, q, d: isoDay(new Date()) };
  if (sel) on.u = 1;
  on.label = mnLabel(on);
  return on;
}
/* para notas.js: el punto del texto bajo el puntero, si es el guion rayado */
function mnCaret(x, y) {
  if (document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(x, y); return c ? { node: c.offsetNode, off: c.offset } : null; }
  if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); return r ? { node: r.startContainer, off: r.startOffset } : null; }
  return null;
}
function mnAnchorAt(el, x, y) {
  if (!mnOn() || !el || !el.closest || !P) return null;
  const ln = el.closest('#pages .page .ln[data-p]'); if (!ln || ln.classList.contains('blank')) return null;
  const c = mnCaret(x, y);
  let po = c && pointToPO(c.node, c.off);
  if (!po || po.p !== +ln.dataset.p) po = { p: +ln.dataset.p, o: +ln.dataset.o };
  if (!P.paras[po.p]) return null;
  return { el: ln, on: mnOnAt(po.p, po.o) };
}

/* ---------- en pantalla ---------- */
/* las notas de una página: las tarjetas (al costado) o, en pantallas angostas, una marca en el margen; y las flechas */
function mnPageHTML(list) {
  if (!list || !list.length) return '';
  const team = typeof SHARE !== 'undefined' && !!SHARE;
  const cards = list.map(({ n, lost }) => {
    const rs = noteReplies(n.id).length, mine = noteMine(n), mv = mnCanMove(n);
    const who = team ? `<span class="mn-who">${esc(mine ? 'Tú' : n.name || 'Alguien')}</span>` : '';
    return `<div class="mn${ea(lost ? ' lost' : '')}" data-note="txt:${esc(n.on.id)}" data-nid="${ea(n.id)}" role="button" tabindex="0" aria-label="${esc(`Nota del ${mnDate(n.on.d)}: ${String(n.text).slice(0, 80)}. Abrir`)}">
      <div class="mn-h">${mv ? `<button type="button" class="mn-d" data-mn="date" title="Cambiar la fecha">${esc(mnDate(n.on.d) || 'Sin fecha')}</button>` : `<span class="mn-d">${esc(mnDate(n.on.d))}</span>`}${who}${rs ? `<span class="mn-r" title="${rs === 1 ? '1 respuesta' : rs + ' respuestas'}">${NOTE_ICO}${rs}</span>` : ''}</div>
      <div class="mn-t">${esc(n.text)}</div>${lost ? '<div class="mn-lost">El texto que señalaba cambió</div>' : ''}</div>`;
  }).join('');
  const dots = list.map(({ n }) => `<button type="button" class="mn-dot" data-note="txt:${esc(n.on.id)}" data-nid="${ea(n.id)}" aria-label="${esc(`Nota del ${mnDate(n.on.d)}: abrir`)}" title="${esc(mnDate(n.on.d) + ' · ' + String(n.text).slice(0, 80))}">${NOTE_ICO}</button>`).join('');
  return `<div class="mn-wrap"><svg class="mn-svg" viewBox="0 0 660 660" aria-hidden="true"></svg><div class="mn-col">${cards}</div><div class="mn-dots">${dots}</div></div>`;
}
/* acomodar: cada tarjeta a la altura de su punto, sin pisarse; luego las flechas */
function mnLayout() {
  const pages = $('#pages'); if (!pages) return;
  const side = pages.classList.contains('mn-side');
  const items = MN.items || new Map();
  for (const pgEl of $$('.page[data-pg]', pages)) {
    const w = $('.mn-wrap', pgEl); if (!w) continue;
    const list = items.get(+pgEl.dataset.pg) || [];
    const fs = parseFloat(getComputedStyle(pgEl).fontSize) || 13, svg = $('.mn-svg', w);
    const els = side ? $$('.mn', w) : $$('.mn-dot', w);
    const k = list.map((it, i) => ({ it, el: els[i], h: els[i] ? els[i].offsetHeight / fs : 1.4 }));
    const gap = side ? .55 : .3, want = (it, h) => side ? it.ty - .85 : it.ty + .06 - h / 2;
    let lim = 1;
    for (const c of k) { c.top = Math.max(want(c.it, c.h), lim); lim = c.top + c.h + gap; }
    lim = 65.4;   // si se pasan del pie de la hoja, suben
    for (let i = k.length - 1; i >= 0; i--) { const c = k[i]; if (c.top + c.h > lim) c.top = Math.max(.5, lim - c.h); lim = c.top - gap; }
    let d = '';
    const f = v => (v * 10).toFixed(1), rows = new Map();
    for (const c of k) {
      if (c.el) c.el.style.top = (c.top * fs).toFixed(1) + 'px';
      const { it } = c, row = rows.get(it.ty) || 0;   // otra nota en el mismo renglón: su línea va un poco más arriba
      rows.set(it.ty, row + 1);
      for (const s of it.segs) d += `<rect class="mn-hl" x="${f(9 + s.c0 * .6 - .05)}" y="${f(6 + s.li + .04)}" width="${f(Math.max(s.c1 - s.c0, 1) * .6 + .1)}" height="9.4" rx="1.2"/>`;
      // de la nota baja (o sube) por el margen, y sigue por la juntura de los renglones hasta lo señalado
      const x0 = side ? 51.8 : 46.25, y0 = c.top + (side ? Math.min(c.h / 2, .85) : c.h / 2);
      const yb = it.ty - .03 - Math.min(row, 3) * .17, xe = 9 + it.c1 * .6 + .08, xb = side ? 49.6 : 45.95, xm = (x0 + xb) / 2;
      const bend = Math.abs(y0 - yb) > .04 ? `C${f(xm)} ${f(y0)} ${f(xm)} ${f(yb)} ${f(xb)} ${f(yb)}` : `L${f(xb)} ${f(yb)}`;
      d += `<path class="mn-ln" data-nid="${ea(it.n.id)}" d="M${f(x0)} ${f(y0)} ${bend} L${f(xe + .5)} ${f(yb)}"/>`
        + `<path class="mn-ah" d="M${f(xe)} ${f(yb)} L${f(xe + .62)} ${f(yb - .3)} L${f(xe + .62)} ${f(yb + .3)} Z"/>`;
      if (mnCanMove(it.n)) d += `<circle class="mn-tip" data-nid="${ea(it.n.id)}" cx="${f(xe + .3)}" cy="${f(yb)}" r="4.4"><title>Arrastra la punta a otro lugar del texto</title></circle>`;
    }
    svg.innerHTML = d;
  }
}
/* las notas llegaron o cambiaron sin repintar la vista (otra persona, deshacer): se pone al día la página */
function mnSync() {
  if (!mnOn() || !$('#pages')) return;
  if (mnSigOf() !== MN.sig) { refreshPages(); fitPages(); }
  else if (typeof anoSync === 'function') anoSync();   // las anotaciones a mano (guion-anotar.js)
}
function mnBind(pages) {
  pages.addEventListener('click', e => {
    const dt = e.target.closest('.mn [data-mn="date"]');
    if (dt) { e.stopPropagation(); mnDatePop(dt, dt.closest('.mn').dataset.nid); return; }
    const c = e.target.closest('.mn, .mn-dot');
    if (!c) return;
    const n = NOTES()[c.dataset.nid]; if (!n) return;
    const s = getSelection(); if (s && !s.isCollapsed && c.contains(s.anchorNode)) return;   // copiando el texto de la nota
    e.stopPropagation();
    if (NF.el && NF.key === noteKey(n.on)) { nfClose(); return; }
    noteThread(noteKey(n.on), c);
  });
  pages.addEventListener('keydown', e => {
    const c = e.target.closest && e.target.closest('.mn'); if (!c || e.target !== c || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); c.click();
  });
  pages.addEventListener('pointerdown', e => { const t = e.target.closest && e.target.closest('.mn-tip'); if (t && e.button === 0) mnDrag(e, t); });
}
function mnDatePop(btn, nid) {
  const n = NOTES()[nid]; if (!n || !mnCanMove(n)) return;
  popover(btn, `<div class="mn-dp"><label class="fld"><span>Fecha de la nota</span><input type="date" value="${ea(n.on.d || isoDay(new Date()))}"></label><button class="btn ghost sm" data-today>Hoy</button></div>`, p => {
    const inp = $('input', p);
    const set = v => {
      closePop();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || v === n.on.d) return;
      noteMove(nid, { d: v }, 'Fecha de la nota');
      const lab = NF.el && NF.key === noteKey(n.on) && $('.nf-lab', NF.el); if (lab) lab.textContent = keyLabel(NF.key);
    };
    inp.addEventListener('change', () => set(inp.value));
    $('[data-today]', p).addEventListener('click', () => set(isoDay(new Date())));
    setTimeout(() => inp.focus(), 20);
  });
}
/* arrastrar la punta de la flecha a otro lugar del texto */
function mnDrag(e, tip) {
  const nid = tip.dataset.nid, n = NOTES()[nid]; if (!n || !mnCanMove(n)) return;
  e.preventDefault(); e.stopPropagation();
  const svg = tip.ownerSVGElement, pgEl = tip.closest('.page');
  const ln = svg.querySelector(`.mn-ln[data-nid="${CSS.escape(nid)}"]`);
  const d0 = ln ? ln.getAttribute('d') : '', m = /^M([\d.-]+) ([\d.-]+)/.exec(d0);
  document.body.classList.add('mn-dragging');
  tip.classList.add('on');
  let last = e;
  const mv = ev => {
    last = ev;
    if (!ln || !m) return;
    const r = pgEl.getBoundingClientRect(), k = 510 / r.width;   // 51em de página = 510 unidades
    const x = (ev.clientX - r.left) * k, y = (ev.clientY - r.top) * k, x0 = +m[1], y0 = +m[2], xm = (x0 + x) / 2;
    ln.setAttribute('d', `M${x0} ${y0} C${xm.toFixed(1)} ${y0} ${xm.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`);
    const ah = ln.nextElementSibling; if (ah && ah.classList.contains('mn-ah')) ah.style.display = 'none';
    tip.setAttribute('cx', x.toFixed(1)); tip.setAttribute('cy', y.toFixed(1));
  };
  const up = ev => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    document.body.classList.remove('mn-dragging');
    tip.style.pointerEvents = 'none';   // la punta va bajo el puntero: que se vea el texto de debajo
    const el = ev.type === 'pointerup' ? document.elementFromPoint(last.clientX, last.clientY) : null;
    const a = el && mnAnchorAt(el, last.clientX, last.clientY);
    tip.style.pointerEvents = '';
    if (a) { const { p, o, q } = a.on; noteMove(nid, { p, o, q, u: undefined, label: a.on.label }, 'Mover la flecha de la nota'); }
    else { mnLayout(); if (ev.type === 'pointerup') toast('Suelta la punta sobre el texto del guion.', 2600); }
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
/* desde lo elegido en el guion: una nota que señala ese tramo */
function mnFromSel() {
  if (!SEL || !canWriteNotes()) return;
  const { a, b } = SEL;
  const s = getSelection(), rect = s && s.rangeCount ? s.getRangeAt(0).getBoundingClientRect() : null;
  const sel = a.p === b.p ? P.paras[a.p].x.slice(a.o, b.o) : P.paras[a.p].x.slice(a.o);
  const on = mnOnAt(a.p, a.o, sel.trim() ? sel : null);
  hideSelTool(); if (s) s.removeAllRanges();
  if (notesHidden()) ls.set('notesHide', false);
  noteCompose(on, rect || { left: innerWidth / 2, right: innerWidth / 2, top: innerHeight / 2, bottom: innerHeight / 2 });
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (mnOn()) mnLayout(); });

/* ---------- en el PDF del guion rayado ----------
   En el margen derecho (en el izquierdo si la página tiene asteriscos de revisión, o si ya no caben): la fecha,
   el texto y una flecha fina al punto, con lo señalado resaltado. Coordenadas del PDF (puntos).
   mnPdfMark va antes del texto (el resaltado queda debajo de las letras); mnPdfPage, después. */
function mnPdfList(pi, all) { return (typeof notesHidden === 'function' && notesHidden()) || !all ? null : all.get(pi) || null; }
function mnPdfMark(doc, list, { LEFT, CW, base }) {
  if (!list) return;
  doc.setFillColor(255, 226, 120);
  for (const it of list) for (const s of it.segs) doc.rect(LEFT + s.c0 * CW - .5, base(s.li) - 9.2, Math.max(s.c1 - s.c0, 1) * CW + 1, 12, 'F');
}
function mnPdfPage(doc, list, { LEFT, CW, base, rev }) {
  if (!list || !list.length) return;
  const team = typeof SHARE !== 'undefined' && !!SHARE;
  const R = [548, 604], L = [16, 70], cols = rev ? [L, R] : [R, L];
  const lineH = 7, fsz = 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(fsz);
  const boxes = list.map(it => {
    const head = mnDate(it.n.on.d) + (team ? ' · ' + (noteMine(it.n) ? noteMe().name : it.n.name || '') : '');
    const lines = doc.splitTextToSize(pdfSafe(String(it.n.text)), 50).slice(0, 14);
    const ay = base(it.ty - 6) - 9.5;   // la parte de arriba del renglón
    return { it, head: pdfSafe(head), lines, h: 4 + lineH * (1 + lines.length), ay };
  });
  // en orden, sin pisarse; lo que no cabe en una columna pasa a la otra
  const place = (bx, col) => { let lim = 40; for (const b of bx) { b.top = Math.max(b.ay - 8, lim); lim = b.top + b.h + 4; b.col = col; } return lim <= 764; };
  const A = [...boxes], B = [];
  while (A.length > 1 && !place(A, cols[0])) B.unshift(A.pop());
  place(A, cols[0]); if (B.length) place(B, cols[1]);
  for (const bx of [A, B]) { let lim = 760; for (let i = bx.length - 1; i >= 0; i--) { const b = bx[i]; if (b.top + b.h > lim) b.top = Math.max(36, lim - b.h); lim = b.top - 4; } }
  const GOLD = [176, 132, 0], FILL = [255, 246, 214], rows = new Map();
  for (const b of boxes) {
    const [c0, c1] = b.col, it = b.it, rk = it.ty + (b.col[0] > 300 ? 'r' : 'l'), row = rows.get(rk) || 0;
    rows.set(rk, row + 1);
    doc.setFillColor(...FILL); doc.setDrawColor(...GOLD); doc.setLineWidth(.5);
    doc.roundedRect(c0, b.top, c1 - c0, b.h, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5.6); doc.setTextColor(...GOLD);
    doc.text(b.head, c0 + 3, b.top + 6.4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(fsz); doc.setTextColor(40, 34, 16);
    b.lines.forEach((l, i) => doc.text(l, c0 + 3, b.top + 6.4 + lineH * (i + 1)));
    // la flecha: baja por el margen y sigue por la juntura de los renglones hasta lo señalado
    const right = c0 > 300, sx = right ? c0 : c1, sy = b.top + Math.min(b.h / 2, 6);
    const yb = base(it.ty - 6) - 9.5 + .4 - Math.min(row, 3) * 1.8, xb = right ? 542 : 80;
    const xe = right ? LEFT + it.c1 * CW + 1 : LEFT + it.c0 * CW - 1, dir = right ? 1 : -1;
    doc.setDrawColor(...GOLD); doc.setLineWidth(.55);
    const xm = (sx + xb) / 2;
    doc.lines([[xm - sx, 0, xm - sx, yb - sy, xb - sx, yb - sy], [xe + dir * 3 - xb, 0]], sx, sy, [1, 1], 'S', false);
    doc.setFillColor(...GOLD); doc.triangle(xe, yb, xe + dir * 3.6, yb - 1.8, xe + dir * 3.6, yb + 1.8, 'F');
  }
  doc.setTextColor(0, 0, 0); doc.setFont('courier', 'normal'); doc.setFontSize(12);
}
