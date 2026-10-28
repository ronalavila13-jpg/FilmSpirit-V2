/* ============================================================
   VERSIÓN 2 · DESGLOSE (PDF «FilmSpirit · versión 2», página Desglose)
   La escena en una franja (número y encabezado, largo, momento, jornada); a la izquierda su texto con los
   elementos subrayados del color de su categoría (se marca uno nuevo eligiendo una palabra); a la derecha, una
   tarjeta por categoría; abajo, todas las escenas en una tabla.
   Las categorías del PDF se guardan en las de la v1 (el proyecto sigue abriendo en la v1):
     Reparto → cast · Utilería → props y armas · Escenografía → ambientación · Vestuario → vestuario y maquillaje ·
     Iluminación → equipo especial marcado como luz (sub: 'light') · Sonido → efectos de sonido.
   Lo de otras categorías de la v1 (vehículos, animales, efectos…) aparece en su propia tarjeta, solo si hay algo.
   ============================================================ */
/* quién edita (como la v1, share.js): la sección «desglose» y, si el colaborador tiene áreas, solo sus categorías */
const v2BdEd = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('desglose'));
const v2BdCan = cat => v2BdEd() && (typeof canEditCat !== 'function' || canEditCat(cat));
const v2BdCanBox = id => { const b = V2_BD.find(x => x.id === id); return b ? b.cats.some(v2BdCan) : v2BdCan(id); };
const V2_BD = [
  { id: 'cast', name: 'Reparto', color: '#212121', cats: ['cast'] },
  { id: 'props', name: 'Utilería', color: '#F08A24', cats: ['props', 'weapons'] },
  { id: 'setdress', name: 'Escenografía', color: '#857A6F', cats: ['setdress'] },
  { id: 'wardrobe', name: 'Vestuario', color: '#5C5852', cats: ['wardrobe', 'makeup'] },
  { id: 'light', name: 'Iluminación', color: '#FFBE0B', cats: ['equip'], sub: 'light' },
  { id: 'sound', name: 'Sonido', color: '#BDB8B1', cats: ['sound'] },
];
/* la tarjeta v2 de un elemento de la v1 */
function v2BdOf(el) {
  if (!el) return null;
  if (el.cat === 'equip') return el.sub === 'light' ? V2_BD[4] : null;
  return V2_BD.find(b => b.cats.includes(el.cat)) || null;
}
const v2BdColor = el => { const b = v2BdOf(el); return b ? b.color : (CAT[el.cat] || {}).color || '#999'; };
const v2BdName = el => { const b = v2BdOf(el); return b ? b.name : (CAT[el.cat] || {}).name || el.cat; };

V2_ACTS.breakdown = () => {
  const n = D.sc.scenes.length, i = UI.scene;
  return `<div class="v2-step"><button type="button" data-v2a="bdstep" data-d="-1" ${i <= 0 ? 'disabled' : ''} aria-label="Escena anterior">${v2I('prev')}</button><span>Escena ${i + 1} de ${n}</span><button type="button" data-v2a="bdstep" data-d="1" ${i >= n - 1 ? 'disabled' : ''} aria-label="Escena siguiente">${v2I('next')}</button></div>`
    + v2Hist() + v2Export();
};
V2_DO.bdstep = b => { UI.scene = clamp(UI.scene + +b.dataset.d, 0, D.sc.scenes.length - 1); render(); };

/* el texto de la escena con sus elementos subrayados (sin el encabezado). Cada párrafo es una línea que se reacomoda al
   ancho de la tarjeta (como en el PDF); data-p y data-o sirven para marcar con el mouse (pointToPO, tab-script.js) */
function v2BdTextHTML(s) {
  const tbp = new Map();
  for (const t of P.tags) { if (t.p <= s.p0 || t.p >= s.p1 || !P.elements[t.el]) continue; if (!tbp.has(t.p)) tbp.set(t.p, []); tbp.get(t.p).push(t); }
  let out = '', prev = '';
  for (let i = s.p0 + 1; i < s.p1; i++) {
    const par = P.paras[i]; if (!par || !par.x.trim()) continue;
    const x = par.x, tags = tbp.get(i) || [];
    let html = '';
    if (!tags.length) html = esc(x);
    else {
      const pts = [...new Set([0, x.length, ...tags.flatMap(t => [clamp(t.s, 0, x.length), clamp(t.e, 0, x.length)])])].sort((a, b) => a - b);
      for (let k = 0; k < pts.length - 1; k++) {
        const a = pts[k], b = pts[k + 1]; if (b <= a) continue;
        const cov = tags.filter(t => t.s <= a && t.e >= b), seg = esc(x.slice(a, b));
        if (!cov.length) { html += seg; continue; }
        const el = P.elements[cov[0].el];
        html += `<span class="v2-tg${cov.every(t => t.auto) ? ' sug' : ''}" style="--c:${ea(v2BdColor(el))}" data-t="${ea(cov.map(t => t.id).join(','))}" title="${esc(v2BdName(el) + ': ' + el.name)}">${seg}</span>`;
      }
    }
    const tight = (par.t === 'd' || par.t === 'p') && (prev === 'c' || prev === 'p' || prev === 'd');
    out += `<div class="ln v2-ln t-${ea(par.t)}${prev && !tight ? ' gap' : ''}" data-p="${ea(i)}" data-o="0">${html}</div>`;
    prev = par.t;
  }
  return out;
}
/* los elementos de la escena, por tarjeta */
function v2BdCards(s) {
  const els = [...D.sem[s.idx]].map(id => P.elements[id]).filter(Boolean);
  const byBox = new Map(V2_BD.map(b => [b.id, []]));
  const extra = new Map();
  for (const e of els) {
    if (e.cat === 'extras') continue;   // la figuración va en la tabla («Extras»)
    const b = v2BdOf(e);
    if (b) byBox.get(b.id).push(e);
    else { if (!extra.has(e.cat)) extra.set(e.cat, []); extra.get(e.cat).push(e); }
  }
  const ro = !v2BdEd();
  const tagIds = e => P.tags.filter(t => t.el === e.id && (t.p >= s.p0 && t.p < s.p1 || t.sc === s.key)).map(t => t.id).join(',');
  const chip = e => e.cat === 'cast'
    ? `<button type="button" class="v2-chip2" data-act="ficha" data-id="${ea(e.id)}" title="Ficha del personaje">${D.castNum[e.id] ? D.castNum[e.id] + ' · ' : ''}${esc(e.name)}</button>`
    : `<button type="button" class="v2-chip2${e.auto ? ' sug' : ''}" data-v2tags="${ea(tagIds(e))}" title="${esc(v2BdName(e))}">${esc(e.name)}</button>`;
  const card = (id, name, color, list, add) => `<section class="v2-card v2-bdc" data-box="${ea(id)}">
      <h3><i style="background:${ea(color)}"></i>${esc(name)}<span>${list.length || 'vacío'}</span></h3>
      <div class="v2-bdchips">${list.sort((a, b) => a.cat === 'cast' && b.cat === 'cast' ? (D.castNum[a.id] || 99) - (D.castNum[b.id] || 99) : a.name.localeCompare(b.name)).map(chip).join('')}${add && !ro && v2BdCanBox(id) ? `<button type="button" class="v2-add" data-v2add="${ea(id)}" aria-label="Añadir a ${ea(name)}" title="Añadir a ${ea(name.toLowerCase())}">${v2I('plus')}</button>` : ''}</div>
    </section>`;
  const sorted = list => list.sort((a, b) => a.cat === 'cast' && b.cat === 'cast' ? (D.castNum[a.id] || 99) - (D.castNum[b.id] || 99) : a.name.localeCompare(b.name));
  return V2_BD.map(b => card(b.id, b.name, b.color, sorted(byBox.get(b.id)), true)).join('')
    + [...extra].map(([c, list]) => card(c, (CAT[c] || {}).name || c, (CAT[c] || {}).color || '#999', sorted(list), true)).join('');
}
/* la tabla de todas las escenas */
function v2BdTable() {
  const fig = k => { const it = (P.schedule.items || []).filter(x => x.k === k && !x.e); const n = it.reduce((a, x) => a + (num(x.fig) || 0), 0); return n || ''; };
  const cnt = (s, cats, sub) => [...D.sem[s.idx]].map(id => P.elements[id]).filter(e => e && cats.includes(e.cat) && (!sub || e.sub === sub)).length;
  return `<h2 class="v2-h2">Todas las escenas</h2>
    <div class="v2-card v2-tbl"><table><thead><tr><th>Esc.</th><th>Encabezado</th><th>Pág.</th><th>Reparto</th><th>Utilería</th><th>Vestuario</th><th>Extras</th></tr></thead><tbody>
    ${D.sc.scenes.map(s => {
      const cast = sceneCast(s.idx).map(e => D.castNum[e.id]).filter(Boolean).sort((a, b) => a - b).join(', ');
      const u = cnt(s, ['props', 'weapons']), w = cnt(s, ['wardrobe', 'makeup']), f = fig(s.key);
      return `<tr data-v2sc="${ea(s.idx)}"${s.idx === UI.scene ? ' class="on"' : ''}><td><b>${esc(s.key)}</b></td><td class="h">${esc(s.heading)}</td><td>${esc(fmtEighths(D.metrics.eighths[s.idx]))}</td><td>${esc(cast || '—')}</td><td>${u || '—'}</td><td>${w || '—'}</td><td>${f || '—'}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

RENDER.breakdown = (orig => function () {
  if (!V2.on) return orig.apply(this, arguments);
  const v = $('#view');
  if (!D.sc.scenes.length) { v.innerHTML = `<div class="v2-pg">${emptyScript()}</div>`; bindView(); return; }
  UI.scene = clamp(UI.scene || 0, 0, D.sc.scenes.length - 1);
  const s = D.sc.scenes[UI.scene];
  const day = dayOfScene(s.key);
  const dt = day && day.date ? `${V2_WD[day.date.getDay()]} ${day.date.getDate()} ${day.date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '').toLowerCase()}` : '';
  const ed = v2BdEd();
  v.innerHTML = `<div class="v2-pg v2-bd" data-keep="bd">
    <section class="v2-card v2-strip">
      <div><span>Escena ${esc(s.key)}</span><b class="sc">${esc(s.heading)}</b></div>
      <div><span>Largo</span><b>${esc(fmtEighths(D.metrics.eighths[s.idx]))} pág.</b></div>
      <div><span>Momento</span><b>${esc(v2Moment(s))}</b></div>
      <div><span>Jornada</span><b>${day ? esc(day.n + (dt ? ' · ' + dt : '')) : '—'}</b></div>
    </section>
    <div class="v2-bdgrid">
      <section class="v2-card v2-bdtx"><div id="v2bdText" class="v2-bdlines">${v2BdTextHTML(s)}</div>
        ${ed ? '<p class="v2-bdhint">Selecciona una palabra para marcarla como elemento.</p>' : ''}</section>
      <div class="v2-bdcards">${v2BdCards(s)}</div>
    </div>
    ${v2BdTable()}
  </div>`;
  bindView();
  v2BdBind();
})(RENDER.breakdown);

function v2BdBind() {
  const v = $('#view');
  if (v._v2bd) return; v._v2bd = true;
  v.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-v2sc]');
    if (tr && UI.tab === 'breakdown') { UI.scene = +tr.dataset.v2sc; render(); return; }
    const tg = e.target.closest('#v2bdText .v2-tg');
    if (tg) { const sel = getSelection(); if (sel && !sel.isCollapsed && sel.toString().trim()) return; tagPopover(tg, tg.dataset.t.split(',')); return; }
    const ch = e.target.closest('[data-v2tags]');
    if (ch && ch.dataset.v2tags) { tagPopover(ch, ch.dataset.v2tags.split(',')); return; }
    const add = e.target.closest('[data-v2add]');
    if (add) {
      const id = add.dataset.v2add, b = V2_BD.find(x => x.id === id);
      add.outerHTML = `<input type="text" class="v2-addin" data-v2addin="${ea(id)}" placeholder="Añadir a ${ea((b ? b.name : (CAT[id] || {}).name || id).toLowerCase())}…" aria-label="Añadir elemento">`;
      const inp = $(`[data-v2addin="${CSS.escape(id)}"]`, v); if (inp) inp.focus();
    }
  });
  v.addEventListener('keydown', e => {
    const inp = e.target.closest && e.target.closest('[data-v2addin]'); if (!inp) return;
    if (e.key === 'Escape') { render(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const name = inp.value.trim(); if (!name) return;
    v2BdAdd(inp.dataset.v2addin, name);
  });
  v.addEventListener('focusout', e => { const inp = e.target.closest && e.target.closest('[data-v2addin]'); if (inp && !inp.value.trim()) setTimeout(() => { if (UI.tab === 'breakdown' && !$('[data-v2addin]:focus')) render(); }, 150); });
  v.addEventListener('mouseup', () => setTimeout(v2BdSel, 10));
  v.addEventListener('keyup', e => { if (e.shiftKey) v2BdSel(); });
}
/* añadir un elemento a una tarjeta: si su nombre está en el texto de la escena, queda marcado ahí */
function v2BdAdd(box, name) {
  const s = D.sc.scenes[UI.scene]; if (!s || !v2BdEd()) return;
  const b = V2_BD.find(x => x.id === box);
  const cat = b ? b.cats[0] : box;
  if (typeof canEditCat === 'function' && !canEditCat(cat)) return;
  const el = ensureElement(P, cat, cat === 'cast' ? normCue(name) : name.charAt(0).toUpperCase() + name.slice(1), false);
  el.auto = false;
  if (b && b.sub) el.sub = b.sub;
  let placed = false;
  const rx = new RegExp('(?<![\\p{L}\\p{N}])' + termPattern(name) + '(?![\\p{L}\\p{N}])', 'iu');
  for (let i = s.p0 + 1; i < s.p1 && !placed; i++) {
    const p = P.paras[i];
    if (p.t !== 'a' && p.t !== 'g' && !(cat === 'cast' && p.t === 'c')) continue;
    const m = rx.exec(p.x);
    if (m && !P.tags.some(t => t.p === i && t.s < m.index + m[0].length && m.index < t.e)) { P.tags.push({ id: uid('t'), el: el.id, p: i, s: m.index, e: m.index + m[0].length }); placed = true; }
  }
  if (!placed) P.tags.push({ id: uid('t'), el: el.id, p: -1, sc: s.key, s: 0, e: 0 });
  afterTagChange();
  requestAnimationFrame(() => { const a = $(`[data-v2add="${CSS.escape(box)}"]`); if (a) a.click(); });
}
/* elegir texto en la escena: el menú de las categorías (como el marcador del guion rayado) */
function v2BdSel() {
  if (UI.tab !== 'breakdown' || !v2BdEd()) return;
  const box = $('#v2bdText'), s = getSelection();
  if (!box || !s || s.isCollapsed || !s.rangeCount) { $$('.v2-bdpick').forEach(x => x.remove()); return; }
  const r = s.getRangeAt(0); if (!box.contains(r.commonAncestorContainer)) return;
  let a = pointToPO(r.startContainer, r.startOffset), b = pointToPO(r.endContainer, r.endOffset);
  if (!a || !b || a.p !== b.p) return;
  if (a.o > b.o) [a, b] = [b, a];
  const x = P.paras[a.p].x;
  while (a.o < b.o && /\s/.test(x[a.o])) a.o++;
  while (b.o > a.o && /\s|[.,;:]/.test(x[b.o - 1])) b.o--;
  if (b.o <= a.o) return;
  SEL = { a, b, text: x.slice(a.o, b.o) };
  $$('.v2-bdpick').forEach(el => el.remove());
  const rc = r.getBoundingClientRect();
  const extra = CATS.filter(c => !['cast', 'props', 'setdress', 'wardrobe', 'sound', 'extras'].includes(c.id) && v2BdCan(c.id));
  const pk = document.createElement('div'); pk.className = 'v2-bdpick';
  pk.innerHTML = V2_BD.filter(b => v2BdCanBox(b.id)).map(b => `<button type="button" data-k="${ea(b.id)}"><i style="background:${ea(b.color)}"></i>${esc(b.name)}</button>`).join('')
    + (v2BdCan('extras') ? `<button type="button" data-k="extras"><i style="background:${ea(CAT.extras.color)}"></i>Extras</button>` : '')
    + `<details><summary>Más</summary>${extra.map(c => `<button type="button" data-k="${ea(c.id)}"><i style="background:${ea(c.color)}"></i>${esc(c.name)}</button>`).join('')}</details>`;
  pk.style.left = Math.max(8, Math.min(innerWidth - 280, rc.left)) + 'px';
  pk.style.top = (rc.bottom + 8) + 'px';
  pk.addEventListener('mousedown', e => { if (!e.target.closest('summary')) e.preventDefault(); });
  pk.addEventListener('click', e => {
    const bt = e.target.closest('[data-k]'); if (!bt || !SEL) return;
    const k = bt.dataset.k, b = V2_BD.find(x => x.id === k);
    const cat = b ? b.cats[0] : k, name = SEL.text;
    pk.remove();
    addTagFromSel(cat);
    if (b && b.sub) { const el = Object.values(P.elements).find(e => e.cat === cat && deaccent(e.name.toLowerCase()) === deaccent(name.replace(/\s+/g, ' ').trim().toLowerCase())); if (el) { el.sub = b.sub; changed('data'); render(); } }
  });
  document.body.appendChild(pk);
  setTimeout(() => document.addEventListener('mousedown', function off(e) { if (!pk.contains(e.target)) { pk.remove(); document.removeEventListener('mousedown', off, true); } }, true), 0);
}
