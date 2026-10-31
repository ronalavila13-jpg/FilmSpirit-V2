/* ============================================================
   GUION · herramientas de revisión (modo Escribir)
   · Panel a la derecha: resumen (páginas, escenas, palabras, duración), carátula, buscar y reemplazar,
     revisiones (cambios marcados con asterisco, con su color), personajes y notas del guion.
   · Sobre la página: los límites de página, los asteriscos de revisión y, a la izquierda del párrafo
     donde está el cursor, el ícono de su tipo (tocarlo cambia el tipo).
   ============================================================ */
const REV_COLORS = [['azul', 'Azul', '#6FA8DC'], ['rosa', 'Rosa', '#EE9AB8'], ['amarillo', 'Amarillo', '#E9C84A'], ['verde', 'Verde', '#7DBE78'],
  ['dorado', 'Dorado', '#D9A441'], ['salmon', 'Salmón', '#EF9A78'], ['cereza', 'Cereza', '#C94A5E'], ['blanco', 'Blanco', '#B9BEC6']];
const revColor = k => (REV_COLORS.find(c => c[0] === k) || REV_COLORS[0])[2];
const revName = k => (REV_COLORS.find(c => c[0] === k) || REV_COLORS[0])[1];
/* íconos del tipo de párrafo */
const ED_ICO = {
  h: '<rect x="3.5" y="9.5" width="17" height="10.5" rx="1.5"/><path d="M3.5 9.5 5 5h15.5L19 9.5"/><path d="M9 5 7.5 9.5M14 5l-1.5 4.5"/>',
  a: '<circle cx="14.5" cy="4.6" r="1.9"/><path d="M7 21.2l3.4-5.6 3.3 2.4v3.4"/><path d="M5.5 11.2 9.3 8.4h4.4l2.1 3.7 3.2.9"/><path d="M10.4 15.6l2.4-6.9"/>',
  c: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20.5a7 7 0 0 1 14 0"/>',
  p: '<path d="M9 3.8c-3.2 3.4-3.2 13 0 16.4M15 3.8c3.2 3.4 3.2 13 0 16.4"/>',
  d: '<path d="M20 14.5a2 2 0 0 1-2 2H8.5L4.5 20.5V6a2 2 0 0 1 2-2H18a2 2 0 0 1 2 2z"/><path d="M8.5 9h7M8.5 12h4.5"/>',
  tr: '<path d="M4 6v12"/><path d="M8 12h12M16 7.5l4.5 4.5-4.5 4.5"/>',
  sh: '<rect x="3" y="7" width="12.5" height="10" rx="2.6"/><path d="M15.5 10.6 21 7.6v8.8l-5.5-3z"/>',
};
const edIco = t => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ED_ICO[t] || ED_ICO.a}</svg>`;
const REV = { q: '', list: [], k: -1, paintT: 0 };
/* fecha «2026-10-17» → «17 de octubre de 2026» */
const revDate = iso => { const d = new Date(String(iso || '') + 'T12:00:00'); return isNaN(d) ? String(iso || '') : d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }); };
const localISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
// el color con que se marcan los cambios ahora (null: no se marcan). Con el guion cerrado, el de la revisión abierta
// (guion-cierre.js); si no, el de «Marcar los cambios»
const revOn = () => { const c = typeof lockRevColor === 'function' ? lockRevColor() : null; return c || (P && P.rev && P.rev.on ? P.rev.c || 'azul' : null); };
const edRevMark = p => { const c = revOn(); if (p && c) p.rv = c; return p; };

/* ---------- palabras cambiadas en la revisión ----------
   Además del asterisco del párrafo, lo que se escribe o cambia en una revisión queda con un fondo suave de su color:
   p.rvw = [[desde, hasta, color]] (cada tramo conserva el color de la revisión en que cambió: lo de la azul sigue azul
   aunque después haya cambios en la rosa) y p.rvd = [[posición, color]], donde se borró texto (una marquita fina).
   Se corren con el texto (como el formato: guion-formato.js), se reparten al partir un párrafo y se juntan al unir.
   Se quitan donde se quitan los asteriscos (al cerrar el guion y con «Quitar todas las marcas»). El PDF no cambia:
   solo asteriscos, como en la industria. En pantalla se ven ampliados a palabras completas. */
const RVW = { quiet: false };
const RVW_MAX = 400, RVD_MAX = 200;
/* une los tramos del mismo color que se tocan; lo más nuevo (al final de la lista) manda donde se pisan */
function rvwTidy(p) {
  const len = (p.x || '').length;
  if (p.rvw) {
    let out = [];
    for (const [s0, e0, c] of p.rvw) {
      const s = Math.max(0, Math.min(s0, len)), e = Math.max(0, Math.min(e0, len)); if (e <= s) continue;
      // lo nuevo tapa lo de antes en su tramo
      out = out.flatMap(([a, b, k]) => b <= s || a >= e ? [[a, b, k]] : [...(a < s ? [[a, s, k]] : []), ...(b > e ? [[e, b, k]] : [])]);
      out.push([s, e, c]);
    }
    out.sort((x, y) => x[0] - y[0]);
    const m = [];
    for (const r of out) { const l = m[m.length - 1]; if (l && l[2] === r[2] && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else m.push([r[0], r[1], r[2]]); }
    if (m.length) p.rvw = m.slice(-RVW_MAX); else delete p.rvw;
  }
  if (p.rvd) {
    const seen = new Set(), out = [];
    for (const [o0, c] of p.rvd) { const o = Math.max(0, Math.min(o0, len)), k = o + ':' + c; if (seen.has(k)) continue; seen.add(k); out.push([o, c]); }
    out.sort((x, y) => x[0] - y[0]);
    if (out.length) p.rvd = out.slice(-RVD_MAX); else delete p.rvd;
  }
}
/* el texto cambió de «pre» a «oldEnd» (lo de antes y lo de después igual): los tramos se corren y, en una revisión,
   lo nuevo queda con su color (lo borrado, con una marquita). Lo que se escribe pegado a un tramo no lo agranda:
   lleva el color de la revisión de ahora */
function rvwShift(p, pre, oldEnd, delta) {
  const c = RVW.quiet ? null : revOn(), newEnd = oldEnd + delta;
  if (!p.rvw && !p.rvd && !c) return;
  // ¿lo borrado era todo de esta misma revisión? (escribir y corregir en la misma revisión no deja marca de borrado)
  const own = oldEnd > pre && !!c && (() => { let x = pre; for (const [a, b, k] of p.rvw || []) { if (k !== c || b <= x) continue; if (a > x) return false; x = b; if (x >= oldEnd) return true; } return x >= oldEnd; })();
  const mS = x => x < pre ? x : x >= oldEnd ? x + delta : pre;
  const mE = x => x <= pre ? x : x >= oldEnd ? x + delta : pre;
  if (p.rvw) p.rvw = p.rvw.map(([s, e, k]) => [mS(s), mE(e), k]);
  if (p.rvd) p.rvd = p.rvd.map(([o, k]) => [o <= pre ? o : o >= oldEnd ? o + delta : pre, k]);
  if (c) {
    if (newEnd > pre) {
      (p.rvw = p.rvw || []).push([pre, newEnd, c]);
      // una marca de borrado del mismo color al borde de lo escrito ya no hace falta: se ve lo nuevo
      if (p.rvd) p.rvd = p.rvd.filter(([o, k]) => !(k === c && o >= pre && o <= newEnd));
    } else if (oldEnd > pre && !own) (p.rvd = p.rvd || []).push([pre, c]);
  }
  rvwTidy(p);
}
/* un tramo que cambió sin cambiar el texto (negrita, itálica, subrayado) */
function rvwMark(p, s, e) {
  const c = revOn(); if (!c || !p || e <= s) return;
  (p.rvw = p.rvw || []).push([s, e, c]); rvwTidy(p);
}
/* un párrafo nuevo escrito en la revisión: todo su texto es nuevo */
function rvwNew(p) {
  const c = revOn(); if (!c || !p || !p.x) return p;
  p.rvw = [[0, p.x.length, c]]; delete p.rvd;
  return p;
}
/* partir en «o»: lo de la izquierda queda, lo de la derecha pasa al párrafo nuevo */
function rvwSplit(p, o) {
  const L = {}, R = {};
  for (const [s, e, c] of p.rvw || []) { if (s < o) (L.rvw = L.rvw || []).push([s, Math.min(e, o), c]); if (e > o) (R.rvw = R.rvw || []).push([Math.max(0, s - o), e - o, c]); }
  for (const [x, c] of p.rvd || []) { if (x <= o) (L.rvd = L.rvd || []).push([x, c]); else (R.rvd = R.rvd || []).push([x - o, c]); }
  return [L, R];
}
/* pone en q los tramos de m (o los quita si no hay) */
function rvwPut(q, m) {
  for (const k of ['rvw', 'rvd']) if (m && m[k] && m[k].length) q[k] = m[k]; else delete q[k];
  rvwTidy(q); return q;
}
const rvwJoin = (a, b, o) => ({ rvw: [...(a.rvw || []), ...(b.rvw || []).map(([s, e, c]) => [s + o, e + o, c])], rvd: [...(a.rvd || []), ...(b.rvd || []).map(([x, c]) => [x + o, c])] });
const rvwClear = p => { delete p.rvw; delete p.rvd; };
/* en pantalla: el tramo ampliado a palabras completas (sin los espacios de las puntas), sin meterse en el tramo vecino
   de otro color. Si solo cambió un espacio o un signo, se marca con las palabras pegadas a él */
const RVW_W = /[\p{L}\p{N}'’]/u;
function rvwWords(x, list) {
  return list.map(([s, e, c], j) => {
    let a = s, b = e;
    const lo = j > 0 ? list[j - 1][1] : 0, hi = j < list.length - 1 ? list[j + 1][0] : x.length;
    if (/[\p{L}\p{N}]/u.test(x.slice(a, b))) {
      while (a < b && /\s/.test(x[a])) a++;
      while (b > a && /\s/.test(x[b - 1])) b--;
      if (RVW_W.test(x[a])) while (a > lo && RVW_W.test(x[a - 1])) a--;
      if (RVW_W.test(x[b - 1])) while (b < hi && RVW_W.test(x[b])) b++;
    } else {
      while (a > lo && RVW_W.test(x[a - 1])) a--;
      while (b < hi && RVW_W.test(x[b])) b++;
    }
    return [a, b, c];
  });
}
// el resaltado se pinta sin tocar el texto que se escribe: con la API de resaltados del navegador (CSS.highlights),
// un resaltado por color; si el navegador no la tiene, con rectángulos en la capa de adorno de la página
const RVW_API = typeof CSS !== 'undefined' && !!CSS.highlights && typeof Highlight === 'function';
/* rango del texto de un párrafo del editor: de la letra a a la letra b */
function edTextRange(ep, a, b) {
  const at = off => { let left = off, node = null, last = null; const w = document.createTreeWalker(ep, NodeFilter.SHOW_TEXT); while ((node = w.nextNode())) { last = node; if (left <= node.length) return [node, left]; left -= node.length; } return last ? [last, last.length] : [ep, 0]; };
  const r = document.createRange(), [n0, o0] = at(a), [n1, o1] = at(b);
  try { r.setStart(n0, o0); r.setEnd(n1, o1); } catch (e) { return null; }
  return r;
}
/* pinta las palabras cambiadas; devuelve el HTML de la capa de adorno (marcas de borrado y, sin la API, los fondos) */
function rvwPaint(ed, origin) {
  const by = {}, extra = [];
  for (const ep of ed.querySelectorAll('.ep[data-i]')) {
    const p = P.paras[+ep.dataset.i]; if (!p || (!p.rvw && !p.rvd)) continue;
    const x = p.x || '';
    for (const [a, b, c] of rvwWords(x, p.rvw || [])) { const r = edTextRange(ep, a, b); if (r) (by[c] = by[c] || []).push(r); }
    if (origin) for (const [o, c] of p.rvd || []) {
      const r = edTextRange(ep, o, o); if (!r) continue;
      const q = r.getClientRects()[0] || r.getBoundingClientRect(), h = q.height || parseFloat(getComputedStyle(ep).lineHeight) || 16;
      if (!q.left && !q.top) continue;
      extra.push(`<i class="ed-rvd" style="left:${ea((q.left - origin.left - 1).toFixed(1))}px;top:${ea((q.top - origin.top).toFixed(1))}px;height:${ea(h.toFixed(1))}px;--c:${ea(revColor(c))}" title="${esc(`Texto borrado en la revisión ${revName(c).toLowerCase()}`)}"></i>`);
    }
  }
  if (RVW_API) {
    for (const [k] of REV_COLORS) { const n = 'rvw-' + k; if (by[k] && by[k].length) CSS.highlights.set(n, new Highlight(...by[k])); else CSS.highlights.delete(n); }
  } else if (origin) {
    for (const [k, list] of Object.entries(by)) for (const r of list) for (const q of r.getClientRects()) if (q.width > .5)
      extra.unshift(`<i class="ed-rvw" style="left:${ea((q.left - origin.left).toFixed(1))}px;top:${ea((q.top - origin.top).toFixed(1))}px;width:${ea(q.width.toFixed(1))}px;height:${ea(q.height.toFixed(1))}px;--c:${ea(revColor(k))}"></i>`);
  }
  return extra.join('');
}
/* al salir del editor, los resaltados del navegador se quitan */
function rvwUnpaint() { if (RVW_API) for (const [k] of REV_COLORS) CSS.highlights.delete('rvw-' + k); }

/* ---------- datos del guion ---------- */
function scriptStats() {
  const words = P.paras.reduce((a, p) => a + ((p.x || '').match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || []).length, 0);
  const e8 = D.metrics && D.metrics.eighths ? D.metrics.eighths.reduce((a, b) => a + (b || 0), 0) : 0;
  return { pages: D.pages ? D.pages.length : 0, e8, scenes: D.sc ? D.sc.scenes.length : 0, words, mins: Math.max(1, Math.round(e8 / 8)) };
}
function scriptChars() {
  const m = new Map();
  P.paras.forEach((p, i) => {
    if (p.t !== 'c') return;
    const name = (p.x || '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
    if (!name) return;
    const r = m.get(name) || { name, n: 0, sc: new Set(), i };
    r.n++; const si = D.sc && D.sc.sceneOf ? D.sc.sceneOf[i] : -1; if (si >= 0) r.sc.add(si);
    m.set(name, r);
  });
  return [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}
const revChanged = () => {
  const by = new Map();
  P.paras.forEach((p, i) => { if (!p.rv) return; const si = D.sc && D.sc.sceneOf ? D.sc.sceneOf[i] : -1; const r = by.get(si) || { si, i, n: 0 }; r.n++; by.set(si, r); });
  return [...by.values()].sort((a, b) => a.i - b.i);
};
const scriptNotes = () => typeof noteRoots === 'function' ? noteRoots().filter(n => n.on && n.on.sec === 'guion').sort((a, b) => (b.ts || 0) - (a.ts || 0)) : [];

/* ---------- panel ---------- */
function reviewHTML() {
  const open = ls.get('revOpen', { sum: 1, cover: 1, find: 1, rev: 1, lock: 1, chars: 0, notes: 0 });
  const sec = (k, title, body, badge = '') => `<details class="rv" data-k="${k}" ${open[k] ? 'open' : ''}><summary><span>${title}</span>${badge}</summary><div class="rv-b" id="rv-${k}">${body}</div></details>`;
  const ed = edEditable(), R = P.rev || {}, nch = revChanged().reduce((a, r) => a + r.n, 0), nn = scriptNotes().length, LK = typeof scriptLock === 'function' ? scriptLock() : null;
  return `<div class="rv-top"><h2>Revisión del guion</h2><button class="btn ghost sm drawer-close" data-act="close-drawer">Cerrar</button></div>
    ${sec('sum', 'Resumen', revSumHTML())}
    ${sec('cover', 'Carátula', revCoverHTML(), P.meta.cover && P.meta.cover.on === false ? '<i class="rv-bd off">oculta</i>' : '')}
    ${sec('find', 'Buscar y reemplazar', `<div class="rv-find">${hdSearch(`<input type="search" id="rvQ" placeholder="Buscar en el guion" value="${esc(REV.q)}" autocomplete="off" aria-label="Buscar en el guion">`)}<span class="rv-n tnum" id="rvN"></span>
        <button class="icbtn" data-rv="prev" title="Anterior (Mayús + Intro)" aria-label="Anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button><button class="icbtn" data-rv="next" title="Siguiente (Intro)" aria-label="Siguiente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></div>
      ${ed ? `<div class="rv-find"><input type="text" id="rvR" placeholder="Reemplazar por" autocomplete="off" aria-label="Reemplazar por"><button class="btn sm" data-rv="rep">Reemplazar</button><button class="btn sm ghost" data-rv="repall" title="Reemplazar en todo el guion">Todo</button></div>` : ''}`)}
    ${sec('rev', 'Revisiones', revRevHTML(), LK && LK.rev ? `<i class="rv-bd" style="--c:${ea(revColor(LK.rev.c))}">${esc(revName(LK.rev.c))}</i>` : !LK && R.on ? `<i class="rv-bd" style="--c:${ea(revColor(R.c))}">${esc(revName(R.c))}</i>` : nch ? `<i class="rv-bd">${nch}</i>` : '')}
    ${sec('lock', 'Guion final', revLockHTML(), LK ? '<i class="rv-bd">cerrado</i>' : '')}
    ${sec('chars', 'Personajes', revCharsHTML())}
    ${sec('notes', 'Notas del guion', revNotesHTML(), nn ? `<i class="rv-bd">${nn}</i>` : '')}`;
}
function revSumHTML() {
  const s = scriptStats();
  return `<div class="rv-stats" title="${ea((s.e8 ? 'Largo en octavos: ' + fmtEighths(s.e8) + ' págs. ' : '') + 'Una página de guion equivale a cerca de un minuto en pantalla.')}"><div><b class="tnum">${s.pages}</b><span>${s.pages === 1 ? 'página' : 'páginas'}</span></div><div><b class="tnum">${s.scenes}</b><span>${s.scenes === 1 ? 'escena' : 'escenas'}</span></div>
    <div><b class="tnum">${s.words.toLocaleString('es-PE')}</b><span>palabras</span></div><div><b class="tnum">≈ ${s.mins} min</b><span>en pantalla</span></div></div>
    <p class="hint">${s.e8 ? `<span>Largo en octavos: ${fmtEighths(s.e8)} págs.</span> ` : ''}<span>Una página de guion equivale a cerca de un minuto en pantalla.</span></p>`;
}
function revCoverHTML() {
  const C = P.meta.cover || {}, ed = edEditable();
  return `<button class="rv-cov" data-act="rv-cover-edit" ${ed ? '' : 'disabled'} title="Editar la carátula">
      <b>${esc(P.meta.title || 'Sin título')}</b>${P.meta.author ? `<span>Escrito por ${esc(P.meta.author)}</span>` : ''}${C.based ? `<span>${esc(C.based)}</span>` : ''}
      <small>${esc([P.meta.draft, C.date ? revDate(C.date) : ''].filter(Boolean).join(' · '))}</small></button>
    <label class="opt-in"><input type="checkbox" data-rv="cover-on" ${C.on === false ? '' : 'checked'} ${ed ? '' : 'disabled'}> Mostrarla al inicio del guion y del PDF</label>`;
}
function revRevHTML() {
  const R = P.rev || {}, ed = edEditable(), ch = revChanged(), sc = D.sc ? D.sc.scenes : [], LK = typeof scriptLock === 'function' ? scriptLock() : null;
  const list = ch.length ? `<div class="rv-list">${ch.map(r => { const s = sc[r.si]; return `<button data-rv="go" data-i="${ea(r.i)}"><span class="k tnum">${s ? esc(s.key) : '—'}</span><span class="h">${s ? esc(s.heading) : 'Antes de la primera escena'}</span><span class="n tnum">${r.n}</span></button>`; }).join('')}</div>` : '';
  // guion cerrado: la revisión se abre y se cierra desde «Guion cerrado»; las marcas son el registro y no se quitan
  if (LK) return `<p class="hint">${LK.rev ? `Revisión ${esc(revName(LK.rev.c).toLowerCase())} del ${esc(revDate(LK.rev.date))}: lo que cambies queda resaltado con su color y el párrafo con un asterisco (*). En el PDF, solo el asterisco.` : 'El guion está cerrado: abre una revisión desde «Guion cerrado» para cambiarlo.'}</p>${list}`;
  return `${ed ? `<div class="rv-row"><label class="opt-in"><input type="checkbox" data-rv="rev-on" ${R.on ? 'checked' : ''}> Marcar los cambios</label>
      <select data-rv="rev-color" aria-label="Color de la revisión">${REV_COLORS.map(([k, n]) => `<option value="${k}" ${k === (R.c || 'azul') ? 'selected' : ''}>${n}</option>`).join('')}</select></div>` : ''}
    <p class="hint">${R.on ? `Revisión ${esc(revName(R.c).toLowerCase())}${R.date ? ' del ' + esc(revDate(R.date)) : ''}: lo que cambies queda resaltado con su color y el párrafo con un asterisco (*) en el margen. En el PDF, solo el asterisco.` : 'Al activarla, lo que cambies queda resaltado con el color de la revisión y el párrafo con un asterisco (*) en el margen, como en las revisiones de rodaje.'}</p>
    ${ch.length ? `<div class="rv-list">${ch.map(r => { const s = sc[r.si]; return `<button data-rv="go" data-i="${ea(r.i)}"><span class="k tnum">${s ? esc(s.key) : '—'}</span><span class="h">${s ? esc(s.heading) : 'Antes de la primera escena'}</span><span class="n tnum">${r.n}</span></button>`; }).join('')}</div>
      ${ed ? '<button class="btn sm ghost" data-rv="rev-clear">Quitar todas las marcas</button>' : ''}` : ''}`;
}
function revCharsHTML() {
  const L = scriptChars();
  if (!L.length) return '<p class="hint">Aún no hay personajes con diálogo.</p>';
  return `<div class="rv-chars"><div class="rv-ch hd"><span>Personaje</span><span>Diál.</span><span>Esc.</span></div>${L.map(r => `<button class="rv-ch" data-rv="go" data-i="${ea(r.i)}" title="Ir a su primer diálogo"><span>${esc(titleCase(r.name))}</span><span class="tnum">${r.n}</span><span class="tnum">${r.sc.size}</span></button>`).join('')}</div>`;
}
function revNotesHTML() {
  const L = scriptNotes();
  if (!L.length) return '<p class="hint">Las notas que dejes sobre el guion o sus escenas aparecen aquí.</p>';
  return `<div class="rv-notes">${L.slice(0, 40).map(n => `<button data-rv="note" data-nid="${esc(n.id)}"><span class="rv-nl">${esc(noteLabel(n.on) || 'Guion')}${n.done ? ' · resuelta' : ''}</span><span class="rv-nt">${esc((n.text || '').slice(0, 120))}</span><small>${esc(n.name || '')}</small></button>`).join('')}</div>`;
}
/* lo que cambia al escribir: resumen, revisiones, personajes y notas (no los campos de búsqueda) */
function revRefresh() {
  const box = $('#insp.rev'); if (!box) return;
  for (const [k, fn] of [['sum', revSumHTML], ['rev', revRevHTML], ['chars', revCharsHTML], ['notes', revNotesHTML], ['cover', revCoverHTML]]) {
    const el = $('#rv-' + k, box); if (el && !el.contains(document.activeElement)) el.innerHTML = fn();
  }
  if (REV.q) revFind(REV.q, true);
}
function bindReview() {
  const box = $('#insp.rev'); if (!box) return;
  box.addEventListener('toggle', e => { const d = e.target.closest && e.target.closest('details.rv'); if (!d) return; const o = ls.get('revOpen', {}); o[d.dataset.k] = d.open ? 1 : 0; ls.set('revOpen', o); }, true);
  const q = $('#rvQ', box);
  if (q) {
    q.addEventListener('input', () => revFind(q.value));
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); revStep(e.shiftKey ? -1 : 1); } if (e.key === 'Escape') { q.value = ''; revFind(''); } });
    if (REV.q) revFind(REV.q, true);
  }
  const r = $('#rvR', box);
  if (r) r.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); revReplace(); } });
  box.addEventListener('change', e => {
    const k = e.target.dataset.rv; if (!k || !edEditable()) return;
    if (k === 'cover-on') { P.meta.cover = { ...(P.meta.cover || {}), on: e.target.checked }; changed('data'); renderEditorDoc(); revRefresh(); }
    if (k === 'rev-on') { edPush(true); P.rev = { ...(P.rev || {}), on: e.target.checked, c: (P.rev && P.rev.c) || 'azul' }; if (P.rev.on) P.rev.date = localISO(); changed('data'); $('#rv-rev').innerHTML = revRevHTML(); revRefresh(); toast(P.rev.on ? `Revisión ${revName(P.rev.c).toLowerCase()}: los cambios quedan marcados con *.` : 'Ya no se marcan los cambios. Las marcas hechas siguen.'); }
    if (k === 'rev-color') { P.rev = { ...(P.rev || {}), c: e.target.value }; changed('data'); $('#rv-rev').innerHTML = revRevHTML(); revRefresh(); edDecoPaint(); }
  });
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-rv]'); if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
    const k = b.dataset.rv;
    if (k === 'next' || k === 'prev') revStep(k === 'next' ? 1 : -1);
    if (k === 'rep') revReplace();
    if (k === 'repall') revReplaceAll();
    if (k === 'go') { closeDrawers(); edSetCaret(+b.dataset.i, 0); edMarkScene(); edDecoPaint(); }
    if (k === 'note') { const n = NOTES()[b.dataset.nid]; if (n) noteGoto(n.on.t, n.on.id, noteTabOf(n.on), true, n.id); }
    if (k === 'rev-clear') confirmBox('Quitar las marcas de revisión', 'Se quitan los asteriscos y los resaltados de lo cambiado. El texto no cambia.', 'Quitar', () => { edPush(true); P.paras.forEach(p => { delete p.rv; rvwClear(p); }); edCommit(false); revRefresh(); edDecoPaint(); }, false);
  });
}

/* ---------- buscar y reemplazar ---------- */
function revFind(q, keep) {
  REV.q = q;
  const s = q.toLowerCase(), list = [];
  if (s) P.paras.forEach((p, i) => { const x = (p.x || '').toLowerCase(); let o = x.indexOf(s); while (o >= 0) { list.push({ i, o }); o = x.indexOf(s, o + s.length); } });
  REV.list = list;
  if (!keep || REV.k >= list.length) REV.k = -1;
  revCount();
}
function revCount() { const n = $('#rvN'); if (n) n.textContent = REV.q ? (REV.list.length ? `${REV.k >= 0 ? REV.k + 1 : 0}/${REV.list.length}` : 'Sin resultados') : ''; }
function revStep(dir) {
  if (!REV.list.length) return;
  if (REV.k < 0) { const c = edCaret(); const at = c ? REV.list.findIndex(m => m.i > c.i || (m.i === c.i && m.o >= c.o)) : 0; REV.k = dir > 0 ? (at < 0 ? 0 : at) : ((at < 0 ? REV.list.length : at) - 1 + REV.list.length) % REV.list.length; }
  else REV.k = (REV.k + dir + REV.list.length) % REV.list.length;
  const m = REV.list[REV.k]; edSelect(m.i, m.o, REV.q.length); revCount();
}
function edSelect(i, o, len) {
  const ep = $(`#ed .ep[data-i="${i}"]`); if (!ep) return;
  const at = off => { let left = off, node = null; const w = document.createTreeWalker(ep, NodeFilter.SHOW_TEXT); while ((node = w.nextNode())) { if (left <= node.length) return [node, left]; left -= node.length; } return [ep, 0]; };
  const r = document.createRange(), [a, ao] = at(o), [b, bo] = at(o + len);
  r.setStart(a, ao); r.setEnd(b, bo);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  const sc = $('#edScroll'), rc = ep.getBoundingClientRect();
  if (sc) { const bx = sc.getBoundingClientRect(); if (rc.bottom > bx.bottom - 40 || rc.top < bx.top + 40) sc.scrollTop += rc.top - bx.top - bx.height / 3; }
}
function revReplace() {
  if (!edEditable() || !REV.list.length) return;
  if (REV.k < 0) { revStep(1); return; }
  const m = REV.list[REV.k], rep = ($('#rvR') || {}).value || '', p = P.paras[m.i];
  if (!p || (p.x || '').slice(m.o, m.o + REV.q.length).toLowerCase() !== REV.q.toLowerCase()) { revFind(REV.q); return; }
  edPush(true);
  let x = p.x.slice(0, m.o) + rep + p.x.slice(m.o + REV.q.length);
  if (ED_UP.has(p.t)) x = x.toUpperCase();
  edSetText(m.i, x); edCommit(false); renderEditorDoc({ i: m.i, o: m.o + rep.length });
  const k = REV.k; revFind(REV.q, true); REV.k = k - 1; if (REV.list.length) revStep(1); else revCount();
}
function revReplaceAll() {
  if (!edEditable() || !REV.q) return;
  const rep = ($('#rvR') || {}).value || '', re = new RegExp(REV.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let n = 0;
  edPush(true);
  P.paras.forEach((p, i) => {
    if (!re.test(p.x || '')) return; re.lastIndex = 0;
    let x = p.x.replace(re, () => { n++; return rep; });
    if (ED_UP.has(p.t)) x = x.toUpperCase();
    edSetText(i, x); re.lastIndex = 0;
  });
  if (!n) return;
  edCommit(true); renderEditorDoc(); revFind(REV.q);
  toast(`${n} ${n === 1 ? 'reemplazo' : 'reemplazos'}.`);
}

/* ---------- carátula ---------- */
function coverHTML() {
  const C = P.meta.cover || {};
  if (C.on === false || edFormat() === 'av') return '';
  return `<button type="button" class="ed-cover" data-act="rv-cover-edit" title="Editar la carátula" aria-label="Carátula: editar">
    <span class="ec-mid"><b>${esc((P.meta.title || 'Sin título').toUpperCase())}</b>${P.meta.author ? `<span>${EN ? 'written by' : 'escrito por'}</span><span>${esc(P.meta.author)}</span>` : ''}${C.based ? `<span class="ec-b">${esc(C.based)}</span>` : ''}</span>
    <span class="ec-foot"><span>${esc(C.contact || '').replace(/\n/g, '<br>')}</span><span>${esc([P.meta.draft, C.date ? revDate(C.date) : ''].filter(Boolean).join('\n')).replace(/\n/g, '<br>')}</span></span></button>`;
}
function coverDialog() {
  if (!edEditable()) return;
  const C = P.meta.cover || {};
  modal({
    title: 'Carátula', body: `<label class="fld"><span>Título</span><input type="text" id="cvT" value="${esc(P.meta.title || '')}"></label>
      <label class="fld"><span>Escrito por</span><input type="text" id="cvA" value="${esc(P.meta.author || '')}" placeholder="Nombre del guionista"></label>
      <label class="fld"><span>Basado en <i class="hint">(opcional)</i></span><input type="text" id="cvB" value="${esc(C.based || '')}" placeholder="Basado en la novela de…"></label>
      <div class="grid2"><label class="fld"><span>Versión</span><input type="text" id="cvV" value="${esc(P.meta.draft || '')}" placeholder="Primer borrador"></label>
      <label class="fld"><span>Fecha</span><input type="date" id="cvD" value="${esc(C.date || '')}"></label></div>
      <label class="fld"><span>Contacto <i class="hint">(abajo a la izquierda)</i></span><textarea id="cvC" rows="3" placeholder="Nombre · teléfono · correo…">${esc(C.contact || '')}</textarea></label>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="cvOk">Guardar</button>',
    onMount: m => $('#cvOk', m).onclick = () => {
      const v = id => $(id, m).value.trim();
      P.meta.title = v('#cvT') || P.meta.title; P.meta.author = v('#cvA'); P.meta.draft = v('#cvV');
      P.meta.cover = { ...C, on: true, based: v('#cvB'), date: v('#cvD'), contact: $('#cvC', m).value.trim() };
      changed('data'); closeModal(); $('#projTitle').textContent = P.meta.title; renderEditorDoc(); revRefresh();
      toast('Carátula guardada: va al inicio del guion y del PDF.');
    },
  });
}

/* ---------- sobre la página: límites de página, asteriscos y el ícono del tipo de párrafo ---------- */
function edDecoPaint() {
  cancelAnimationFrame(REV.paintT);
  REV.paintT = requestAnimationFrame(() => {
    const page = $('#edHost .ed-page'), ed = $('#ed');
    // guion AV: solo el resaltado de las palabras cambiadas (no hay capa de adorno)
    if (ed && edFormat() === 'av') { rvwPaint(ed, null); return; }
    if (!page || !ed) return;
    let deco = $('.ed-deco', page);
    if (!deco) { deco = document.createElement('div'); deco.className = 'ed-deco'; deco.setAttribute('aria-hidden', 'true'); page.appendChild(deco); }
    const top0 = page.getBoundingClientRect().top, lh = parseFloat(getComputedStyle(ed).lineHeight) || 20;
    const elOf = i => ed.querySelector(`.ep[data-i="${i}"]`);
    let html = '';
    if (D.pages && D.sc && D.sc.sceneOf && D.sc.sceneOf.length === P.paras.length) {
      const seen = new Map();
      D.pages.forEach((pg, pi) => {
        const first = pg.find(l => !l.blank);
        if (pi > 0 && first) {
          const el = elOf(first.p);
          if (el) { const k = seen.get(first.p) || 0, epi = !k && P.paras[first.p].t === 'h' && epOk(P.paras[first.p].ep), y = el.getBoundingClientRect().top - top0 + (k ? k * lh : (epi ? -2.9 : -.72) * lh); html += `<div class="ed-pb" style="top:${ea(y.toFixed(1))}px"><span>${esc(pageLabel(D.pages, pi))}.</span></div>`; }
        }
        for (const l of pg) if (!l.blank) seen.set(l.p, (seen.get(l.p) || 0) + 1);
      });
    }
    // comienzo de cada episodio (series): su título encima del encabezado
    P.paras.forEach((p, i) => {
      if (p.t !== 'h' || !epOk(p.ep)) return;
      const el = elOf(i); if (!el) return;
      html += `<div class="ed-epi" style="top:${ea((el.getBoundingClientRect().top - top0 - 1.95 * lh).toFixed(1))}px"><span>${esc(epLabel(P, String(p.ep)))}</span></div>`;
    });
    P.paras.forEach((p, i) => {
      if (!p.rv) return;
      const el = elOf(i); if (!el) return;
      const r = el.getBoundingClientRect();
      html += `<div class="ed-rv" style="top:${ea((r.top - top0).toFixed(1))}px;height:${Math.max(lh, r.height).toFixed(1)}px;--c:${ea(revColor(p.rv))}" title="Cambiado en la revisión ${esc(revName(p.rv).toLowerCase())}">*</div>`;
    });
    // las palabras cambiadas (fondo de su color) y las marquitas de lo borrado
    html += rvwPaint(ed, page.getBoundingClientRect());
    deco.innerHTML = html;
    edIcoPaint();
  });
}
function edIcoPaint() {
  const page = $('#edHost .ed-page'), ed = $('#ed');
  if (!page || !ed || edFormat() === 'av' || !edEditable()) return;
  let b = $('.ed-ico', page);
  const c = document.activeElement === ed || (ed.contains(document.activeElement)) ? edCaret() : (b && b._c);
  if (!c || !P.paras[c.i]) { if (b) b.hidden = true; return; }
  const el = ed.querySelector(`.ep[data-i="${c.i}"]`); if (!el) return;
  if (!b) {
    b = document.createElement('button'); b.type = 'button'; b.className = 'ed-ico'; b.setAttribute('aria-haspopup', 'menu');
    b.addEventListener('pointerdown', e => e.preventDefault());   // el cursor se queda en el guion
    b.addEventListener('click', () => edTypeMenu(b));
    page.appendChild(b);
  }
  const t = P.paras[c.i].t, name = (ED_CINE.find(x => x[0] === t) || [t, 'Párrafo'])[1];
  b._c = c; b.hidden = false;
  b.innerHTML = edIco(t); b.title = `${name} · toca para cambiar el tipo (Tab o Ctrl + 1…7)`; b.setAttribute('aria-label', `Tipo de párrafo: ${name}. Cambiar`);
  b.style.top = (el.getBoundingClientRect().top - page.getBoundingClientRect().top) + 'px';
}
function edTypeMenu(b) {
  const c = b._c; if (!c) return;
  const cur = P.paras[c.i] && P.paras[c.i].t;
  popover(b, `<div class="menu ed-tm">${ED_CINE.map(([k, n], j) => `<button data-t="${k}" aria-pressed="${ea(k === cur)}">${edIco(k)}<span>${n}</span><kbd>Ctrl ${j + 1}</kbd></button>`).join('')}</div>`, p => p.addEventListener('click', e => {
    const x = e.target.closest('[data-t]'); if (!x) return; closePop();
    edPush(true); edSetType(c.i, x.dataset.t); edCommit(true); renderEditorDoc(c);
  }));
}
document.addEventListener('selectionchange', () => { if (UI.tab === 'script' && UI.scriptEdit && $('#ed') && $('#ed').contains(document.activeElement)) edIcoPaint(); });
addEventListener('resize', () => { if (UI.tab === 'script' && UI.scriptEdit) edDecoPaint(); });

ACT['rv-cover-edit'] = () => coverDialog();

/* en el teléfono, la revisión se abre desde «⋯» */
TOOLS_EXTRA.script = () => [
  ...(UI.scriptEdit && edEditable() ? [[ICO.check, 'Revisión del guion', () => { const a = $('#insp'); if (a) a.classList.add('open'); }]] : []),
  // la racha de escritura (guion-racha.js): en el teléfono la barra se desplaza; aquí está a mano
  ...(UI.scriptEdit && edEditable() && typeof wkPanel === 'function' ? [[wkFlame(wkStreak(wkRec()).state), 'Escritura', b => wkPanel(b)]] : []),
  ...(typeof scriptLock === 'function' && scriptLock() ? [[ICO.lock, 'Guion cerrado', () => lkPanel()]] : typeof lockCanClose === 'function' && lockCanClose() ? [[ICO.lock, 'Cerrar el guion final…', () => lkCloseDialog()]] : []),
];
