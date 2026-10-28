/* ============================================================
   VERSIÓN 2 · GUION (PDF «FilmSpirit · versión 2», página Guion)
   Tres columnas: las escenas (tarjetas con su número), el editor (tipo de párrafo en pestañas, la página
   y el párrafo donde se escribe resaltado) y, a la derecha, la escena (datos y personajes) y sus notas.
   El editor es el de la v1 (guion-editor.js): mismo texto, mismas marcas y mismo deshacer; aquí cambia la forma.
   ============================================================ */
const V2_TYPES = [['h', 'Escena'], ['a', 'Acción'], ['c', 'Personaje'], ['d', 'Diálogo'], ['p', 'Paréntesis'], ['tr', 'Transición']];

V2_ACTS.script = () => v2Hist() + v2Share() + v2Export();

function v2SceneCards(act) {
  const { scenes } = D.sc;
  return scenes.map(s => {
    const syn = synopsisOf(s, 90) || '';
    const e = fmtEighths(D.metrics.eighths[s.idx]);
    return `<li data-q="${esc((s.key + ' ' + s.heading).toLowerCase())}"><button type="button" class="v2-sc" data-act="${ea(act)}" data-i="${ea(s.idx)}"${s.idx === UI.scene ? ' aria-current="true"' : ''}>
      <span class="v2-sq">${esc(s.key)}</span><span class="v2-sct"><b>${esc(s.heading)}</b><small>${esc(e)}${syn ? ' · ' + esc(syn) : ''}</small></span></button></li>`;
  }).join('');
}
/* «Día · exterior», «Noche · interior» */
function v2Moment(s) {
  const t = (s.tod || (s.dn === 'N' ? 'NOCHE' : 'DÍA')).toLowerCase();
  const tod = t.charAt(0).toUpperCase() + t.slice(1);
  const ie = s.ie === 'EXT' ? 'exterior' : s.ie === 'INT/EXT' ? 'interior y exterior' : 'interior';
  return tod + ' · ' + ie;
}
/* «Cine Primavera · fachada» */
function v2Place(s) {
  const cap = x => x.toLowerCase().replace(/(^|\s|-)([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase());
  const parts = String(s.loc || '').split(/\s+-\s+/).filter(Boolean);
  if (!parts.length) return '';
  return [cap(parts[0]), ...parts.slice(1).map(x => x.toLowerCase())].join(' · ');
}
function v2EighthsLabel(e) {
  const t = fmtEighths(e);
  return t + (e > 8 ? ' de páginas' : ' de página');
}
/* las notas de la escena y de sus planos, con sus respuestas */
function v2SceneNotes(s) {
  if (typeof noteRoots !== 'function') return [];
  const shots = new Set((D.shotsBy[s.key] || []).map(x => x.id));
  return noteRoots().filter(n => !n.done && ((n.on.t === 'scene' && n.on.id === s.key) || (n.on.t === 'shot' && shots.has(n.on.id)))).sort((a, b) => a.ts - b.ts);
}
function v2NoteHTML(n, reply) {
  const own = typeof noteMine === 'function' && noteMine(n);
  const nm = n.name || 'Alguien', ini = v2Ini(nm);
  const tone = reply ? 'y' : 'k';
  return `<div class="v2-nt${reply ? ' re' : ''}"><span class="v2-av ${tone}">${esc(ini)}</span><div><p class="v2-ntw"><b>${esc(own ? youName(nm) : nm)}</b> · ${esc(v2Ago(n.ts))}</p><p class="v2-ntx">${esc(n.text)}</p></div></div>`;
}
function v2SceneCard(s) {
  if (!s) return '';
  const cast = sceneCast(s.idx);
  const syn = synopsisOf(s, 200, true) || '';
  return `<section class="v2-card v2-scard">
    <h3 class="v2-ch"><span class="v2-sq y">${esc(s.key)}</span>Escena ${esc(s.key)}</h3>
    ${syn ? `<p class="v2-syn">${esc(syn)}</p>` : ''}
    <dl class="v2-dl">
      <dt>Locación</dt><dd>${esc(v2Place(s))}</dd>
      <dt>Momento</dt><dd>${esc(v2Moment(s))}</dd>
      <dt>Largo</dt><dd>${esc(v2EighthsLabel(D.metrics.eighths[s.idx]))}</dd>
      ${cast.length ? `<dt>Personajes</dt><dd class="v2-chips">${cast.map(e => `<span class="v2-tag">${esc(e.name)}</span>`).join('')}</dd>` : ''}
    </dl>
  </section>`;
}
function v2NotesCard(s) {
  if (!s) return '';
  const roots = v2SceneNotes(s);
  const body = roots.map(n => v2NoteHTML(n, false) + noteReplies(n.id).map(r => v2NoteHTML(r, true)).join('')).join('');
  const w = typeof canWriteNotes === 'function' && canWriteNotes();
  return `<section class="v2-card v2-ncard">
    <h3 class="v2-ch">Notas</h3>
    ${body || '<p class="v2-mut">Todavía no hay notas en esta escena.</p>'}
    ${w ? `<label class="v2-lab" for="v2Reply">Responder</label><textarea id="v2Reply" class="v2-ta" rows="2" placeholder="Escribe una nota para el equipo" data-sc="${ea(s.key)}"></textarea>` : ''}
  </section>`;
}
function v2GuionSide() {
  const s = D.sc.scenes[UI.scene] || D.sc.scenes[0];
  return v2SceneCard(s) + v2NotesCard(s);
}
/* la página donde está el cursor: «Página 1 de 4 · Versión de muestra» */
function v2PageInfo(i) {
  const n = D.pages.length || 1;
  let pg = 1;
  if (i != null && D.pos && D.pos[i]) pg = D.pos[i].pg0 + 1;
  const draft = (P.meta.draft || '').trim();
  return `Página ${pg} de ${n}${draft ? ' · ' + draft : ''}`;
}

const v2GuionRender = function () {
  const v = $('#view');
  document.body.classList.toggle('hl-off', !!scriptLock());
  if (!P.paras.length) { v.innerHTML = `<div class="v2-pg">${emptyScript()}</div>`; bindView(); return; }
  UI.scriptEdit = true;
  scriptModeFor(UI.tab);
  const av = edFormat() === 'av';
  const types = av ? '' : `<div class="v2-seg v2-types" role="group" aria-label="Tipo de párrafo">${V2_TYPES.map(([k, n]) => `<button type="button" data-v2t="${k}" aria-pressed="false">${esc(n)}</button>`).join('')}</div>
    <select id="edType" class="v2-hide" aria-hidden="true" tabindex="-1">${ED_CINE.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select>`;
  v.innerHTML = `<div class="v2-g3 v2-guion">
    <aside class="v2-col v2-scenes" id="side">
      <div class="v2-colh"><h2>Escenas</h2><span>${D.pages.length} ${D.pages.length === 1 ? 'pág.' : 'págs.'}</span></div>
      <ul class="v2-sclist" id="slist">${v2SceneCards('ed-goto')}</ul>
    </aside>
    <section class="v2-col v2-ed">
      ${types}
      <p class="v2-pinfo" id="v2PInfo">${esc(v2PageInfo(null))}</p>
      <div class="v2-edscroll" id="edScroll" data-keep="scripted"><div id="edHost">${editorHTML()}</div></div>
    </section>
    <aside class="v2-col v2-side" id="v2Side">${v2GuionSide()}</aside>
  </div>`;
  bindView(); bindEditorDoc(); bindEdPinch();
  v2GuionBind();
  v2EdCaret();
  v2EdBadges();
};
/* en el margen derecho de la hoja: cuántas notas tiene cada plano (a la altura de su texto); un toque abre la conversación */
function v2EdBadges() {
  const page = $('#edHost .ed-page'), ed = $('#ed'); if (!page || !ed || typeof noteRoots !== 'function') return;
  $$('.v2-nbad', page).forEach(x => x.remove());
  const top0 = page.getBoundingClientRect().top;
  const by = {};
  for (const n of noteRoots()) if (!n.done && (n.on.t === 'shot' || n.on.t === 'scene')) (by[n.on.t + ':' + n.on.id] = by[n.on.t + ':' + n.on.id] || []).push(n);
  for (const k in by) {
    const [t, id] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
    let a = -1, b = -1;
    if (t === 'shot') { const sh = P.shots[id]; if (!sh || sh.p0 == null) continue; a = sh.p0; b = sh.p1 != null ? sh.p1 : sh.p0; }
    else { const s = D.sc.byKey[id]; if (!s) continue; a = s.p0; b = s.p0; }
    const ea0 = ed.querySelector(`.ep[data-i="${a}"]`), eb = ed.querySelector(`.ep[data-i="${b}"]`); if (!ea0 || !eb) continue;
    const y = (ea0.getBoundingClientRect().top + eb.getBoundingClientRect().bottom) / 2 - top0 - 11;
    const cnt = by[k].reduce((x, n) => x + 1 + noteReplies(n.id).length, 0);
    const el = document.createElement('button'); el.type = 'button'; el.className = 'v2-nbad'; el.style.top = y.toFixed(0) + 'px';
    el.setAttribute('aria-label', cnt === 1 ? '1 nota' : cnt + ' notas'); el.contentEditable = 'false';
    el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H10l-4 4v-4H5z"/></svg>${cnt}`;
    el.addEventListener('mousedown', e => e.preventDefault());
    el.addEventListener('click', () => { if (typeof noteThread === 'function') noteThread(k, el); });
    page.appendChild(el);
  }
}
RENDER.script = (orig => function () { return UI.tab === 'script' ? v2GuionRender() : orig.apply(this, arguments); })(RENDER.script);
RENDER.lined = (orig => function () { return orig.apply(this, arguments); })(RENDER.lined);

/* el párrafo donde está el cursor: resaltado; su tipo, elegido en las pestañas; la página, arriba */
let V2_CUR = -1;
function v2EdCaret() {
  if (UI.tab !== 'script') return;
  const c = typeof edCaret === 'function' ? edCaret() : null;
  const i = c ? c.i : -1;
  if (i !== V2_CUR) {
    $$('#ed .ep.v2-cur').forEach(x => x.classList.remove('v2-cur'));
    if (i >= 0) { const el = $(`#ed .ep[data-i="${i}"]`); if (el) el.classList.add('v2-cur'); }
    V2_CUR = i;
  }
  const t = i >= 0 && P.paras[i] ? P.paras[i].t : '';
  $$('.v2-types [data-v2t]').forEach(b => b.setAttribute('aria-pressed', b.dataset.v2t === t ? 'true' : 'false'));
  const pi = $('#v2PInfo'); if (pi) pi.textContent = v2PageInfo(i >= 0 ? i : null);
  // la escena del cursor: su tarjeta a la izquierda y sus datos a la derecha
  const sc = D && D.sc;
  if (sc && i >= 0 && sc.sceneOf.length === P.paras.length) {
    const si = sc.sceneOf[i];
    if (si >= 0 && $('#v2Side') && $('#v2Side').dataset.si !== String(si)) {
      const ta = $('#v2Reply');
      if (!(ta && (ta.value.trim() || document.activeElement === ta))) { UI.scene = si; $('#v2Side').innerHTML = v2GuionSide(); $('#v2Side').dataset.si = String(si); }
    }
  }
}
function v2GuionBind() {
  const v = $('#view');
  $$('.v2-types [data-v2t]', v).forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));   // el cursor se queda en la hoja
  $$('.v2-types [data-v2t]', v).forEach(b => b.addEventListener('click', () => {
    const ty = $('#edType'); if (!ty) return;
    ty.value = b.dataset.v2t; ty.dispatchEvent(new Event('change'));
    setTimeout(v2EdCaret, 0);
  }));
  const side = $('#v2Side'); if (side) side.dataset.si = String(UI.scene);
  if (!v._v2g) {
    v._v2g = true;
    document.addEventListener('selectionchange', () => { if (UI.tab === 'script' && $('#ed')) v2EdCaret(); });
    v.addEventListener('keydown', e => {
      const ta = e.target.closest && e.target.closest('#v2Reply');
      if (!ta || e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      const tx = ta.value.trim(); if (!tx) return;
      const s = D.sc.byKey[ta.dataset.sc]; if (!s) return;
      const roots = v2SceneNotes(s), last = roots[roots.length - 1];
      ta.value = '';
      if (last) noteAdd(last.on, tx, last.id);
      else noteAdd({ t: 'scene', id: s.key, sec: 'guion', tab: 'lined', label: 'Escena ' + s.key }, tx);
    });
  }
}
/* la escena elegida en la lista también se marca al moverse con el cursor (guion-editor.js · edMarkScene) */
{
  const _ems = typeof edMarkScene === 'function' ? edMarkScene : null;
  if (_ems) edMarkScene = function () { const r = _ems.apply(this, arguments); $$('#slist .v2-sc').forEach(b => b.setAttribute('aria-current', +b.dataset.i === UI.scene ? 'true' : 'false')); return r; };
}
/* la lista de escenas que rehace el editor al cambiar la estructura (guion-editor.js · edDerive) sale con la forma v2 */
{
  const _slh = sceneListHTML;
  sceneListHTML = function (act) {
    if (UI.tab === 'script' && $('#view .v2-guion')) return `<div class="v2-colh"><h2>Escenas</h2><span>${D.pages.length} ${D.pages.length === 1 ? 'pág.' : 'págs.'}</span></div><ul class="v2-sclist" id="slist">${v2SceneCards(act)}</ul>`;
    return _slh.apply(this, arguments);
  };
  const _edd = edDerive;
  edDerive = function () {
    const r = _edd.apply(this, arguments);
    if (UI.tab === 'script' && $('#v2Side')) { const ta = $('#v2Reply'); if (!(ta && (ta.value.trim() || document.activeElement === ta))) $('#v2Side').innerHTML = v2GuionSide(); v2EdCaret(); v2EdBadges(); }
    return r;
  };
}
