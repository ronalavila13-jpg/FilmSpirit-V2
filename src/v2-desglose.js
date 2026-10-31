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
  { id: 'cast', name: 'Reparto', get color() { return CAT.cast.color; }, cats: ['cast'] },
  { id: 'props', name: 'Utilería', get color() { return CAT.props.color; }, cats: ['props', 'weapons'] },
  { id: 'setdress', name: 'Escenografía', get color() { return CAT.setdress.color; }, cats: ['setdress'] },
  { id: 'wardrobe', name: 'Vestuario', get color() { return CAT.wardrobe.color; }, cats: ['wardrobe', 'makeup'] },
  { id: 'light', name: 'Iluminación', get color() { return CAT.equip.color; }, cats: ['equip'], sub: 'light' },
  { id: 'sound', name: 'Sonido', get color() { return CAT.sound.color; }, cats: ['sound'] },
];
/* la tarjeta v2 de un elemento de la v1 */
function v2BdOf(el) {
  if (!el) return null;
  if (el.cat === 'equip') return el.sub === 'light' ? V2_BD[4] : null;
  return V2_BD.find(b => b.cats.includes(el.cat)) || null;
}
const v2BdColor = el => (CAT[el.cat] || {}).color || '#999';
const v2BdName = el => { const b = v2BdOf(el); return b ? b.name : (CAT[el.cat] || {}).name || el.cat; };

V2_ACTS.breakdown = () => v2Hist() + v2Export();
/* (lote AJ) la barra de la página, entre el encabezado de la escena y la página del guion: el marcador y anotar a mano.
   Son los del guion rayado (data-act «mk» e «ink»: tab-script.js y guion-anotar.js), con la forma de la v2 */
function v2BdToolsHTML() {
  const ed = v2BdEd(), c = typeof MK !== 'undefined' && MK.cat && CAT[MK.cat];
  const mk = ed && typeof mkCats === 'function' && mkCats().length ? `<button type="button" class="v2-btn v2-mk${c ? ' on' : ''}" data-act="mk" aria-haspopup="menu" aria-pressed="${ea(!!c)}" style="--mkc:${ea(c ? c.color : 'transparent')};--mkink:${ea(c ? mkInk(c.color) : 'inherit')}" title="Marcador: elige una categoría y cada selección queda etiquetada">${MK_SVG}<span>${c ? esc(c.name) : 'Marcador'}</span></button>` : '';
  const ink = typeof anoCan === 'function' && anoCan() && typeof anoIco === 'function' ? `<button type="button" class="v2-btn ink-btn" data-act="ink" aria-pressed="${ea(!!ANOT.on)}" title="Anotar a mano: lápiz, marcador, flechas y texto sobre el guion">${anoIco('pen')}<span>Anotar a mano</span></button>` : '';
  if (!mk && !ink) return '';
  return `<div class="v2-bdtools">${mk}${ink}${ed ? '<span class="v2-bdhint">Selecciona una palabra para marcarla, o usa el marcador.</span>' : ''}</div>`;
}
// el marcador elegido se ve en su botón (anotar a mano lo pinta guion-anotar.js · anoBtnPaint, por la clase ink-btn)
{ const _mp = mkPaint; mkPaint = function () { const r = _mp.apply(this, arguments); const t = UI.tab === 'breakdown' && $('#view .v2-bdtools'); if (t) t.outerHTML = v2BdToolsHTML(); return r; }; }

/* (lote AJ) la escena se ve en sus páginas del guion (el ancho y los márgenes estándar): las páginas que toca, con lo que
   queda fuera de la escena atenuado. Sobre ellas van las etiquetas, el marcador y las anotaciones a mano (las mismas
   piezas del guion rayado: tab-script.js y guion-anotar.js). */
const v2BdRange = s => { const a = s && D.pos[s.p0], b = s && D.pos[Math.max(s.p0, s.p1 - 1)]; return a && b ? [a.pg0, b.pg1] : [0, D.pages.length - 1]; };
/* la hoja al ancho de la tarjeta (51 em = 8,5 in: el ancho estándar del guion), sin el zoom del guion rayado */
function v2BdFit() {
  const sc = $('#scroller'), pg = $('#pages');
  if (UI.tab !== 'breakdown' || !sc || !pg) return;
  pg.style.setProperty('--fs', clamp(Math.floor(sc.clientWidth / 51 * 100) / 100, 6.5, 16) + 'px');
}
{ const _fp = fitPages; fitPages = function () { const r = _fp.apply(this, arguments); v2BdFit(); return r; }; }
/* la escena que empieza más abajo en su página: se abre en su encabezado (render · restoreScroll lo deja donde estaba si es
   la misma escena) */
function v2BdToScene(s) {
  const sc = $('#scroller'), h = s && $(`#pages .ln[data-p="${s.p0}"]`); if (!sc || !h) return;
  if ((D.pos[s.p0] || {}).li0 < 12) { sc.scrollTop = 0; return; }
  const em = parseFloat(getComputedStyle($('#pages')).fontSize) || 12;
  sc.scrollTop = Math.max(0, sc.scrollTop + h.getBoundingClientRect().top - sc.getBoundingClientRect().top - 2.5 * em);
}
function v2BdDim() {
  const s = D.sc.scenes[UI.scene]; if (!s) return;
  for (const l of $$('#pages .ln[data-p]')) { const p = +l.dataset.p; l.classList.toggle('bd-out', p < s.p0 || p >= s.p1); }
}
/* fotos por elemento, como en la v1: el botón de la cámara abre la lámina de la caja (laminas.js) */
function v2BdPhBtn(id, name, list) {
  if (!list.length || typeof openLamina !== 'function') return '';
  const b = V2_BD.find(x => x.id === id), cat = b ? b.cats[0] : id, sh = SHEET.find(x => x.cats.includes(cat));
  if (!sh || sh.id === 'notes') return '';
  const n = list.reduce((a, e) => a + photosOf(e).length, 0);
  return `<button type="button" class="v2-bdph${n ? ' has' : ''}" data-act="bd-lam" data-box="${ea(sh.id)}" title="Fotos de ${ea(name.toLowerCase())}: una lámina con una foto por elemento" aria-label="Fotos de ${ea(name)}">${CAM_SVG}${n ? `<b>${n}</b>` : ''}</button>`;
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
      <h3><i style="background:${ea(color)}"></i>${esc(name)}<span>${list.length || 'vacío'}</span>${v2BdPhBtn(id, name, list)}</h3>
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

Object.assign(ACT, { 'bd-goto': b => { UI.scene = +b.dataset.i; render(); } });
RENDER.breakdown = (orig => function () {
  if (!V2.on) return orig.apply(this, arguments);
  const v = $('#view');
  if (!D.sc.scenes.length) { v.innerHTML = `<div class="v2-pg">${emptyScript()}</div>`; bindView(); return; }
  UI.scene = clamp(UI.scene || 0, 0, D.sc.scenes.length - 1);
  const s = D.sc.scenes[UI.scene];
  const day = dayOfScene(s.key);
  const dt = day && day.date ? `${V2_WD[day.date.getDay()]} ${day.date.getDate()} ${day.date.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '').toLowerCase()}` : '';
  const ed = v2BdEd();
  // (lote AJ) las marcas ya vienen confirmadas (también las de proyectos anteriores)
  if (ed && (P.tags.some(t => t.auto) || Object.values(P.elements).some(e => e.auto))) { P.tags.forEach(t => { t.auto = false; }); Object.values(P.elements).forEach(e => { e.auto = false; }); changed('data'); }
  // como el guion rayado: las escenas a la izquierda, la hoja al centro y, a un costado, la escena y sus etiquetas
  v.innerHTML = `<div class="v2-g3 v2-bd3" data-keep="bd">
    <aside class="v2-col v2-scenes" id="side">
      <div class="v2-colh"><h2>Escenas</h2><span>${D.pages.length} ${D.pages.length === 1 ? 'pág.' : 'págs.'}</span></div>
      <ul class="v2-sclist" id="slist">${v2SceneCards('bd-goto')}</ul>
    </aside>
    <section class="v2-bdtx v2-col">${v2BdToolsHTML()}<div class="scroller" id="scroller" data-keep="bdpg-${ea(s.idx)}"><div class="pages" id="pages">${pagesHTML(v2BdRange(s))}</div></div></section>
    <div class="v2-col v2-rcol v2-bdside">
      <section class="v2-card v2-bdinfo"><div class="h"><div><span>Escena ${esc(s.key)}</span><b class="sc">${esc(s.heading)}</b></div></div>
        <dl><div><dt>Largo</dt><dd>${esc(fmtEighths(D.metrics.eighths[s.idx]))} pág.</dd></div><div><dt>Momento</dt><dd>${esc(v2Moment(s))}</dd></div><div><dt>Jornada</dt><dd>${day ? esc(day.n + (dt ? ' · ' + dt : '')) : '—'}</dd></div></dl></section>
      <div class="v2-bdcards">${v2BdCards(s)}</div>
    </div>
  </div>`;
  fitPages(); v2BdDim(); v2BdToScene(s);
  if (typeof anoBind === 'function') anoBind($('#pages'));   // anotar a mano, aquí también
  bindView();
  v2BdBind();
})(RENDER.breakdown);

function v2BdBind() {
  const v = $('#view');
  if (v._v2bd) return; v._v2bd = true;
  v.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-v2sc]');
    if (tr && UI.tab === 'breakdown') { UI.scene = +tr.dataset.v2sc; render(); return; }
    const sn = e.target.closest('[data-v2sn]');
    if (sn && !sn.disabled) { UI.scene = clamp(UI.scene + +sn.dataset.v2sn, 0, D.sc.scenes.length - 1); render(); return; }
    const tg = e.target.closest('#pages .tg');
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
  const box = $('#pages'), s = getSelection();
  if (typeof ANOT !== 'undefined' && ANOT.on) return;
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
  if (typeof MK !== 'undefined' && MK.cat && v2BdCan(MK.cat)) { addTagFromSel(MK.cat); return; }   // con el marcador elegido, queda etiquetado al soltar
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
