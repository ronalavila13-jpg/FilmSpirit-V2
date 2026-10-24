/* ============================================================
   GUION · formato del texto: negrita, itálica, subrayado y resaltado
   Cada párrafo guarda sus tramos con formato en p.fm = { b: [[desde, hasta], …], i, u, h } (posiciones en
   su texto). Al escribir, borrar, partir o unir párrafos los tramos se corren con el texto (como las marcas
   del desglose): lo que se escribe al final de un tramo sigue con su formato; al comienzo, no.
   · En el editor cada tramo es un <span class="fm fb fi…">; si el navegador deja el texto distinto a lo
     guardado, el párrafo se vuelve a dibujar.
   · Se ve también en el guion rayado (Marcar), sale en el PDF (negrita, itálica y subrayado) y en Fountain
     (**negrita**, *itálica*, _subrayado_). El resaltado es una marca de trabajo: se ve en pantalla, no se imprime.
   · Barra de Escribir: B, I, U, resaltar y la revisión (marcar los cambios con su color).
   ============================================================ */
const FMT_KEYS = ['b', 'i', 'u', 'h'];
const FMT_NAME = { b: 'Negrita', i: 'Itálica', u: 'Subrayado', h: 'Resaltar' };
const fmtOn = p => !!(p && p.fm && FMT_KEYS.some(k => p.fm[k] && p.fm[k].length));
/* une tramos que se tocan o se pisan y quita los vacíos */
function fmtNorm(list, len) {
  const L = (list || []).map(([s, e]) => [Math.max(0, Math.min(s, len)), Math.max(0, Math.min(e, len))]).filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const r of L) { const l = out[out.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else out.push([r[0], r[1]]); }
  return out;
}
function fmtTidy(p) {
  if (!p.fm) return;
  const len = (p.x || '').length;
  for (const k of FMT_KEYS) { const n = fmtNorm(p.fm[k], len); if (n.length) p.fm[k] = n; else delete p.fm[k]; }
  for (const k of Object.keys(p.fm)) if (!FMT_KEYS.includes(k)) delete p.fm[k];
  if (!Object.keys(p.fm).length) delete p.fm;
}
const fmtCovers = (p, k, s, e) => { const L = (p.fm && p.fm[k]) || []; let x = s; for (const [a, b] of L) { if (a > x) break; if (b > x) x = b; if (x >= e) return true; } return x >= e; };
function fmtSet(p, k, s, e, on) {
  if (e <= s) return;
  p.fm = p.fm || {};
  const L = p.fm[k] || [];
  if (on) L.push([s, e]);
  else { const out = []; for (const [a, b] of L) { if (b <= s || a >= e) out.push([a, b]); else { if (a < s) out.push([a, s]); if (b > e) out.push([e, b]); } } p.fm[k] = out; fmtTidy(p); return; }
  p.fm[k] = L; fmtTidy(p);
}
/* el texto cambió de «pre» a «oldEnd» (lo de antes y lo de después igual): los tramos se corren */
function fmtShift(p, pre, oldEnd, delta) {
  if (!p.fm) return;
  const newEnd = oldEnd + delta, ins = pre === oldEnd;
  const mS = x => x < pre ? x : x >= oldEnd ? x + delta : pre;
  const mE = x => x < pre ? x : x === pre ? (ins ? x + delta : x) : x > oldEnd ? x + delta : newEnd;
  for (const k of FMT_KEYS) if (p.fm[k]) p.fm[k] = p.fm[k].map(([s, e]) => [mS(s), mE(e)]);
  fmtTidy(p);
}
/* partir en «o»: lo de la izquierda queda en el párrafo, lo de la derecha pasa al nuevo */
function fmtSplit(p, o) {
  if (!p.fm) return [null, null];
  const L = {}, R = {};
  for (const k of FMT_KEYS) for (const [s, e] of p.fm[k] || []) {
    if (s < o) (L[k] = L[k] || []).push([s, Math.min(e, o)]);
    if (e > o) (R[k] = R[k] || []).push([Math.max(0, s - o), e - o]);
  }
  return [Object.keys(L).length ? L : null, Object.keys(R).length ? R : null];
}
function fmtJoin(a, b, o) {
  if (!a.fm && !b.fm) return null;
  const out = {};
  for (const k of FMT_KEYS) { const l = [...((a.fm || {})[k] || []), ...((b.fm || {})[k] || []).map(([s, e]) => [s + o, e + o])]; if (l.length) out[k] = l; }
  return out;
}
/* tramos de [a0, a1) con el mismo formato: [{ a, b, f: 'bi' }] */
function fmtRuns(p, a0, a1) {
  if (!fmtOn(p)) return [{ a: a0, b: a1, f: '' }];
  const pts = new Set([a0, a1]);
  for (const k of FMT_KEYS) for (const [s, e] of p.fm[k] || []) { if (s > a0 && s < a1) pts.add(s); if (e > a0 && e < a1) pts.add(e); }
  const arr = [...pts].sort((x, y) => x - y), out = [];
  for (let j = 0; j < arr.length - 1; j++) {
    const a = arr[j], b = arr[j + 1]; if (b <= a) continue;
    const f = FMT_KEYS.filter(k => (p.fm[k] || []).some(([s, e]) => s <= a && e >= b)).join('');
    const l = out[out.length - 1];
    if (l && l.f === f) l.b = b; else out.push({ a, b, f });
  }
  return out;
}
const fmtCls = f => 'fm' + [...f].map(k => ' fm-' + k).join('');   // fm-b, fm-i… (.fi ya es de la ficha)
/* el texto de un párrafo en el editor, con sus tramos */
function edRich(p) {
  const x = p.x || '';
  if (!x) return '<br>';
  const tail = x.endsWith('\n') ? '<br>' : '';
  if (!fmtOn(p)) return esc(x) + tail;
  return fmtRuns(p, 0, x.length).map(r => r.f ? `<span class="${fmtCls(r.f)}">${esc(x.slice(r.a, r.b))}</span>` : esc(x.slice(r.a, r.b))).join('') + tail;
}
/* los tramos tal como quedaron en la pantalla (para saber si hay que volver a dibujar el párrafo) */
function fmtOfDom(ep) {
  const out = {}; let o = 0;
  for (const n of ep.childNodes) {
    const len = (n.textContent || '').length;
    if (n.nodeType === 1 && n.classList.contains('fm')) for (const k of FMT_KEYS) if (n.classList.contains('fm-' + k)) (out[k] = out[k] || []).push([o, o + len]);
    o += len;
  }
  const len = o, q = {};
  for (const k of FMT_KEYS) { const n = fmtNorm(out[k], len); if (n.length) q[k] = n; }
  return q;
}
const fmtKey = fm => JSON.stringify(FMT_KEYS.map(k => (fm && fm[k]) || []));
/* después de escribir: si la pantalla no coincide con lo guardado, el párrafo se vuelve a dibujar */
function edFmtSync(el, p) {
  if (!fmtOn(p) && !el.querySelector('.fm')) return;
  if (fmtKey(fmtOfDom(el)) === fmtKey(p.fm)) return;
  const c = edCaret();
  el.innerHTML = edRich(p);
  if (c && c.i === +el.dataset.i) edSetCaret(c.i, c.o);
}
/* elegir de (i, o) a (j, o2) en el editor */
function edSelectRange(a, b) {
  const pt = (i, o) => {
    const ep = $(`#ed .ep[data-i="${i}"]`); if (!ep) return null;
    let left = o, node = null; const w = document.createTreeWalker(ep, NodeFilter.SHOW_TEXT);
    while ((node = w.nextNode())) { if (left <= node.length) return [node, left]; left -= node.length; }
    return [ep, ep.childNodes.length];
  };
  const A = pt(a.i, a.o), B = pt(b.i, b.o); if (!A || !B) return;
  const r = document.createRange(); r.setStart(A[0], A[1]); r.setEnd(B[0], B[1]);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
/* la palabra donde está el cursor (para dar formato sin elegir texto) */
function edWordAt(i, o) {
  const x = (P.paras[i] || {}).x || '';
  const W = /[\p{L}\p{N}'’-]/u;
  let s = o, e = o;
  while (s > 0 && W.test(x[s - 1])) s--;
  while (e < x.length && W.test(x[e])) e++;
  return e > s ? { a: { i, o: s }, b: { i, o: e } } : null;
}
function fmtToggle(k) {
  if (!edEditable()) return;
  let r = edRange();
  if (!r) { toast('Pon el cursor en el guion o elige el texto.'); return; }
  if (r.collapsed) { const w = edWordAt(r.a.i, r.a.o); if (!w) { toast(`Elige el texto para ${FMT_NAME[k].toLowerCase() === 'resaltar' ? 'resaltarlo' : 'darle ' + FMT_NAME[k].toLowerCase()}.`); return; } r = { ...w, collapsed: false, word: true }; }
  const spans = [];
  for (let i = r.a.i; i <= r.b.i; i++) { const p = P.paras[i]; if (!p) continue; const s = i === r.a.i ? r.a.o : 0, e = i === r.b.i ? r.b.o : p.x.length; if (e > s) spans.push([p, s, e]); }
  if (!spans.length) return;
  const on = !spans.every(([p, s, e]) => fmtCovers(p, k, s, e));
  edPush(true);
  for (const [p, s, e] of spans) { fmtSet(p, k, s, e, on); edRevMark(p); }
  edCommit(false);
  const sel = { a: r.a, b: r.b };
  renderEditorDoc(r.a);
  if (!r.word) edSelectRange(sel.a, sel.b); else edSetCaret(r.a.i, r.b.o);
  edFmtPaint();
}

/* ---------- barra de Escribir ---------- */
const FMT_IC = {
  b: '<path d="M7 4.5h6a3.5 3.5 0 0 1 0 7H7zM7 11.5h7a4 4 0 0 1 0 8H7z"/>',
  i: '<path d="M10 4.5h8M6 19.5h8M14 4.5l-4 15"/>',
  u: '<path d="M7 4v7a5 5 0 0 0 10 0V4M5.5 20h13"/>',
  h: '<path d="m14.5 4.5 5 5L11 18H6v-5z"/><path d="M4 21h16" stroke-width="3"/>',
  rev: '<path d="M12 3.5v17M5 7.5l14 9M19 7.5 5 16.5"/>',
};
const fmtIco = k => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${FMT_IC[k]}</svg>`;
function fmtBarHTML() {
  if (!edEditable()) return '';
  const R = P.rev || {}, L = typeof scriptLock === 'function' ? scriptLock() : null, rc = L ? (L.rev ? L.rev.c : null) : R.on ? R.c || 'azul' : null;
  const kb = { b: 'Ctrl + B', i: 'Ctrl + I', u: 'Ctrl + U', h: '' };
  return `<span class="ed-fmt" role="group" aria-label="Formato">${FMT_KEYS.map(k => `<button class="btn ghost icon fmt-b fmt-${k}" type="button" data-act="ed-fmt" data-k="${k}" aria-pressed="false" title="${esc(FMT_NAME[k])}${kb[k] ? ' (' + kb[k] + ')' : ''}${k === 'h' ? ' · se ve en pantalla, no se imprime' : ''}" aria-label="${esc(FMT_NAME[k])}">${fmtIco(k)}</button>`).join('')}
    <button class="btn ghost icon fmt-rev" type="button" data-act="ed-rev" aria-pressed="${ea(!!rc)}" style="--c:${ea(rc ? revColor(rc) : 'transparent')}" title="${esc(L ? (L.rev ? `Revisión ${revName(L.rev.c).toLowerCase()} abierta: los cambios quedan con asterisco` : 'Guion cerrado') : rc ? `Marcando los cambios en ${revName(rc).toLowerCase()}: toca para el color o para dejar de marcar` : 'Revisión: marcar los cambios con un asterisco de color')}" aria-label="Revisión" aria-haspopup="menu">${fmtIco('rev')}<i class="fmt-dot"></i></button></span>`;
}
/* los botones encendidos según el texto donde está el cursor (o lo elegido) */
function edFmtPaint() {
  const bar = $('.ed-fmt'); if (!bar) return;
  const r = edRange();
  for (const k of FMT_KEYS) {
    const b = $(`.fmt-${k}`, bar); if (!b) continue;
    let on = false;
    if (r) {
      if (r.collapsed) { const p = P.paras[r.a.i]; const o = r.a.o; on = !!(p && p.fm && (p.fm[k] || []).some(([s, e]) => s < o && e >= o || (o === 0 && s === 0 && e > 0))); }
      else { on = true; for (let i = r.a.i; i <= r.b.i && on; i++) { const p = P.paras[i]; if (!p) continue; const s = i === r.a.i ? r.a.o : 0, e = i === r.b.i ? r.b.o : p.x.length; if (e > s && !fmtCovers(p, k, s, e)) on = false; } }
    }
    b.setAttribute('aria-pressed', on);
  }
}
function revMenu(btn) {
  const L = typeof scriptLock === 'function' ? scriptLock() : null;
  if (L) { if (L.rev && lockWho()) ACT['lk-revclose'](); else lkPanel(); return; }
  const R = P.rev || {};
  popover(btn, `<h5>Revisión</h5><div class="menu rev-pick">
      <button data-rv="off" aria-pressed="${ea(!R.on)}"><span class="rv-sw" style="--c:transparent"></span>No marcar los cambios</button><hr>
      ${REV_COLORS.map(([k, n, c]) => `<button data-rv="${k}" aria-pressed="${ea(!!R.on && (R.c || 'azul') === k)}"><span class="rv-sw" style="--c:${ea(c)}"></span>${esc(n)}</button>`).join('')}</div>
    <p class="hint" style="margin:6px 8px 2px;max-width:240px">Cada párrafo que cambies queda con un asterisco de ese color en el margen, también en el PDF.</p>`, p => p.addEventListener('click', e => {
    const b = e.target.closest('[data-rv]'); if (!b) return; closePop();
    const v = b.dataset.rv;
    edPush(true);
    if (v === 'off') P.rev = { ...(P.rev || {}), on: false };
    else { P.rev = { ...(P.rev || {}), on: true, c: v }; if (!R.on || R.c !== v) P.rev.date = localISO(); }
    changed('data');
    const bar = $('.ed-fmt'); if (bar) bar.outerHTML = fmtBarHTML();
    edFmtPaint(); if (typeof revRefresh === 'function') revRefresh(); edDecoPaint();
    toast(v === 'off' ? 'Ya no se marcan los cambios. Las marcas hechas siguen.' : `Revisión ${revName(v).toLowerCase()}: los cambios quedan marcados con *.`);
  }));
}
ACT['ed-fmt'] = b => fmtToggle(b.dataset.k);
ACT['ed-rev'] = b => revMenu(b);
document.addEventListener('selectionchange', () => { if (UI.tab === 'script' && UI.scriptEdit && $('#ed') && $('#ed').contains(document.activeElement)) edFmtPaint(); });

/* ---------- Fountain: **negrita**, *itálica*, _subrayado_ ---------- */
function fmtFountain(p) {
  const x = (p.x || '').replace(/\n/g, ' ');
  if (!fmtOn(p)) return x;
  return fmtRuns(p, 0, x.length).map(r => {
    let t = x.slice(r.a, r.b); if (!r.f.replace('h', '')) return t;
    const m = t.match(/^(\s*)(.*?)(\s*)$/);
    let inner = m[2]; if (!inner) return t;
    if (r.f.includes('u')) inner = '_' + inner + '_';
    if (r.f.includes('b') && r.f.includes('i')) inner = '***' + inner + '***';
    else if (r.f.includes('b')) inner = '**' + inner + '**';
    else if (r.f.includes('i')) inner = '*' + inner + '*';
    return m[1] + inner + m[3];
  }).join('');
}
/* leer el formato de Fountain en un párrafo ya leído: quita las marcas y guarda los tramos */
function fmtFromFountain(p) {
  let x = p.x || '';
  if (!/[*_]/.test(x)) return p;
  // \* es un asterisco de verdad (no marca); se aparta mientras se buscan las marcas
  x = x.replace(/\\\*/g, '\u0001');
  const fm = {};
  // el subrayado va entre _ que no están pegados a otras letras (MI_ARCHIVO_FINAL se queda como está)
  const rx = [[/\*\*\*(?=\S)(.+?)(?<=\S)\*\*\*/, 'bi'], [/\*\*(?=\S)(.+?)(?<=\S)\*\*/, 'b'], [/\*(?=\S)(.+?)(?<=\S)\*/, 'i'], [/(?<![\p{L}\p{N}])_(?=\S)(.+?)(?<=\S)_(?![\p{L}\p{N}])/u, 'u']];
  for (let guard = 0; guard < 200; guard++) {
    let best = null;
    for (const [re, f] of rx) { const m = re.exec(x); if (m && (!best || m.index < best.m.index)) best = { m, f }; }
    if (!best) break;
    const { m, f } = best, mark = (m[0].length - m[1].length) / 2, s = m.index, e = s + m[1].length;
    // las marcas salen del texto: los tramos que ya había se corren (lo de adentro, una marca; lo de después, dos)
    const mp = y => y <= s ? y : y <= s + mark + m[1].length ? Math.max(s, y - mark) : y - 2 * mark;
    for (const k of FMT_KEYS) if (fm[k]) fm[k] = fm[k].map(([a, b]) => [mp(a), mp(b)]);
    x = x.slice(0, s) + m[1] + x.slice(s + m[0].length);
    for (const k of f) (fm[k] = fm[k] || []).push([s, e]);
  }
  p.x = x.replace(/\u0001/g, '*'); p.fm = fm; fmtTidy(p);
  return p;
}
