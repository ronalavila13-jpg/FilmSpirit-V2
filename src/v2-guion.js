/* ============================================================
   VERSIÓN 2 · GUION (PDF «FilmSpirit · versión 2», página Guion)
   Tres columnas: las escenas (tarjetas con su número), el editor (tipo de párrafo en pestañas, la página
   y el párrafo donde se escribe resaltado) y, a la derecha, la escena (datos y personajes) y sus notas.
   El editor es el de la v1 (guion-editor.js): mismo texto, mismas marcas y mismo deshacer; aquí cambia la forma.
   ============================================================ */
const V2_TYPES = [['h', 'Escena'], ['a', 'Acción'], ['c', 'Personaje'], ['p', 'Paréntesis'], ['d', 'Diálogo'], ['tr', 'Transición'], ['sh', 'Plano']];
const V2_TYPE_ICO = {
  h: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 16 5-4 4 3 3-2 6 4"/><circle cx="8.5" cy="9.5" r="1.3"/>',
  a: '<circle cx="14.5" cy="4.8" r="1.8"/><path d="m10.5 21 2.5-5.5L9.5 13l1.8-4.2 4 1.2 2.4 3.2M13 15.5l2.4 5.5M9 9.5l-3.2 1.2"/>',
  c: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5z"/>',
  p: '<path d="M8.5 4c-3.4 4.4-3.4 11.6 0 16M15.5 4c3.4 4.4 3.4 11.6 0 16"/>',
  d: '<path d="M4.5 5h15v10.5H10L6 19.5v-4H4.5z"/>',
  tr: '<path d="M4 8h13l-3.2-3.2M20 16H7l3.2 3.2"/>',
  sh: '<rect x="3" y="7" width="12.5" height="10" rx="2"/><path d="m15.5 11 5.5-3v8l-5.5-3"/>',
};

V2_ACTS.script = () => v2WkBtn() + v2Hist() + v2Share() + v2Export();
/* la racha de escritura (guion-racha.js), que estaba en el «⋯» */
const v2WkBtn = () => !PHONE() && UI.scriptEdit && typeof edEditable === 'function' && edEditable() && typeof wkPanel === 'function' ? `<button type="button" class="v2-btn ic" data-v2a="wk" aria-haspopup="dialog" title="Escritura: tu racha y tu meta" aria-label="Escritura">${wkFlame(wkStreak(wkRec()).state)}</button>` : '';
V2_DO.wk = b => wkPanel(b);

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
  // los tipos de párrafo (con su atajo de Final Draft) y las herramientas de la v1: deshacer, rehacer, negrita, itálica,
  // subrayado, resaltar (con su paleta) y revisión (guion-formato.js · fmtBarHTML)
  const typeBtns = V2_TYPES.map(([k, n]) => `<button type="button" data-v2t="${k}" aria-pressed="false" title="${ea(v2TypeTip(k, n))}"><svg class="v2-ti" viewBox="0 0 24 24" aria-hidden="true">${V2_TYPE_ICO[k]}</svg><span class="v2-tn">${esc(n)}</span><kbd>${V2_MOD} + ${ED_CINE.findIndex(x => x[0] === k) + 1}</kbd></button>`).join('');
  // dos copias del mismo menú: la tira de arriba (pantallas medianas y teléfono) y la columna a la izquierda de la hoja (grandes)
  const sideTypes = av ? '' : `<div class="v2-types v2-types-side" role="group" aria-label="Tipo de párrafo">${typeBtns}</div>`;
  const types = (av ? '' : `<div class="v2-seg v2-types v2-types-top" role="group" aria-label="Tipo de párrafo">${typeBtns}</div>
    <select id="edType" class="v2-hide" aria-hidden="true" tabindex="-1">${ED_CINE.map(([k, n]) => `<option value="${k}">${esc(n)}</option>`).join('')}</select>`)
    + `<div class="v2-edtools" role="group" aria-label="Herramientas del guion"><button type="button" class="v2-tb" data-act="ed-undo" title="Deshacer (${V2_MOD}+Z)" aria-label="Deshacer">${ICO.undo}</button><button type="button" class="v2-tb" data-act="ed-redo" title="Rehacer (${V2_MOD}+${V2_MAC ? 'Mayús+Z' : 'Y'})" aria-label="Rehacer">${ICO.redo}</button>${typeof fmtBarHTML === 'function' ? fmtBarHTML() : ''}</div>`;
  v.innerHTML = `<div class="v2-g3 v2-guion">
    <aside class="v2-col v2-scenes" id="side">
      <div class="v2-colh"><h2>Escenas</h2><span>${D.pages.length} ${D.pages.length === 1 ? 'pág.' : 'págs.'}</span></div>
      <ul class="v2-sclist" id="slist">${v2SceneCards('ed-goto')}</ul>
    </aside>
    <section class="v2-col v2-ed">
      <div class="v2-edbar">${types}</div>
      <p class="v2-pinfo" id="v2PInfo">${esc(v2PageInfo(null))}</p>
      <div class="v2-edscroll" id="edScroll" data-keep="scripted"><div class="v2-edrow">${sideTypes}<div id="edHost">${editorHTML()}</div></div></div>
    </section>
    <div class="v2-col v2-rcol"><aside class="v2-side" id="v2Side">${v2GuionSide()}</aside><aside class="insp rev v2-insp" id="insp" aria-label="Revisión del guion">${reviewHTML()}</aside></div>
  </div>`;
  bindView(); bindEditorDoc(); bindEdPinch(); bindReview();
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
  // las herramientas: lo elegido en la hoja no se pierde al tocarlas (delegado: la v1 rehace sus botones)
  const tl = $('.v2-edtools', v); if (tl) tl.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
  v2EdKeysBind();
  v2EdFollowBind();
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
/* elegir una escena en la lista la marca (y muestra sus notas) al instante: antes esperaba al siguiente desplazamiento, que
   marcaba la escena de arriba de la hoja, o a un clic en el guion. El desplazamiento que provoca el salto no la cambia */
let V2_HOLD = 0;
{
  const _go = ACT['ed-goto'];
  if (_go) ACT['ed-goto'] = function (b) {
    const r = _go.apply(this, arguments), s = D.sc && D.sc.scenes[+b.dataset.i];
    if (s) {
      V2_HOLD = performance.now() + 1500;
      UI.scene = +b.dataset.i;
      $$('#slist .v2-sc').forEach(x => x.setAttribute('aria-current', +x.dataset.i === UI.scene ? 'true' : 'false'));
      const side = $('#v2Side'), ta = $('#v2Reply');
      if (side && side.dataset.si !== String(UI.scene) && !(ta && ta.value.trim())) { side.innerHTML = v2GuionSide(); side.dataset.si = String(UI.scene); }
    }
    return r;
  };
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

/* el teléfono: las escenas y la escena con sus notas, en el «⋯» de la cabecera */
V2_MMORE.script = () => { const s = D.sc.scenes[UI.scene] || D.sc.scenes[0]; return P.paras.length ? [['gscenes', 'list', 'Escenas', `${D.sc.scenes.length} ${D.sc.scenes.length === 1 ? 'escena' : 'escenas'} · ${D.pages.length} ${D.pages.length === 1 ? 'pág.' : 'págs.'}`], s ? ['gside', 'note', `Escena ${s.key} y sus notas`, 'Locación, momento, personajes y notas'] : null].filter(Boolean) : []; };
Object.assign(V2_MDO, { gscenes: () => v2Sheet('gscenes'), gside: () => v2Sheet('gside') });
Object.assign(V2_SHEET, {
  gscenes: { tab: 'script', title: 'Escenas', closeOn: ['ed-goto'], html: () => `<ul class="v2-sclist">${v2SceneCards('ed-goto')}</ul>` },
  gside: { tab: 'script', title: 'Escena', html: v2GuionSide, after: box => {
    if (box._v2g) return; box._v2g = true;
    box.addEventListener('keydown', e => {
      const ta = e.target.closest && e.target.closest('#v2Reply');
      if (!ta || e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      const tx = ta.value.trim(); if (!tx) return;
      const s = D.sc.byKey[ta.dataset.sc]; if (!s) return;
      const roots = v2SceneNotes(s), last = roots[roots.length - 1];
      ta.value = '';
      if (last) noteAdd(last.on, tx, last.id); else noteAdd({ t: 'scene', id: s.key, sec: 'guion', tab: 'lined', label: 'Escena ' + s.key }, tx);
      setTimeout(() => v2SheetPaint(box), 0);
    });
  } },
});


/* ============================================================
   ATAJOS DE ESCRITURA, COMO EN FINAL DRAFT (lo pidió Ronald)
   La v1 ya traía Ctrl + 1…7 (el orden de Final Draft: escena, acción, personaje, acotación, diálogo, transición,
   plano), Intro al párrafo siguiente (personaje → diálogo → acción; vacío, pasa a acción), Ctrl + B · I · U,
   deshacer y rehacer, Ctrl + F y el autocompletar de personajes y encabezados. Aquí se suma:
   · Tab como en Final Draft: en una acción vacía, personaje; en un personaje vacío, transición; en un diálogo, una
     acotación (con el cursor dentro); en la acotación, vuelve al diálogo. Mayús + Tab, al revés. En los demás casos,
     el Tab de la v1.
   · Ctrl + Alt + 1…7 (⌘ ⌥ 1…7 en Mac): lo mismo que Ctrl + 1…7, porque en el navegador Ctrl + número puede cambiar de
     pestaña (Alt + 1…5 ya es la etapa). Con AltGr (la @ y la # de algunos teclados) no hace nada.
   · Ctrl + G: ir a una escena (el «Ir a» de Final Draft).
   · Autocompletar transiciones (CORTE A:, FUNDIDO A:…) y extensiones del personaje ((V.O.), (O.S.), (CONT.)).
   ============================================================ */
const V2_MAC = /Mac|iPhone|iPad/.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '');
const V2_MOD = V2_MAC ? '⌘' : 'Ctrl';
const v2TypeTip = (k, n) => { const i = ED_CINE.findIndex(x => x[0] === k) + 1; return i ? `${n} · ${V2_MOD}+${i} (${V2_MAC ? '⌘⌥' : 'Ctrl+Alt+'}${i})` : n; };
const V2_TRANS = ['CORTE A:', 'CORTE DIRECTO A:', 'FUNDIDO A:', 'FUNDIDO A NEGRO.', 'FUNDIDO DE ENTRADA:', 'DISOLVENCIA A:', 'ENCADENADO A:', 'CORTE A NEGRO.'];
const V2_EXT = ['V.O.', 'O.S.', 'CONT.', 'F.C.'];
{
  const _ek = edKey;
  edKey = function (e, av) {
    const mod = e.ctrlKey || e.metaKey;
    if (!av && !ED.ac) {
      // Ctrl + Alt + 1…7 (⌘ ⌥ 1…7): el tipo de párrafo
      if (mod && e.altKey && !e.shiftKey && /^Digit[1-7]$/.test(e.code || '') && !(e.getModifierState && e.getModifierState('AltGraph'))) {
        e.preventDefault(); const c = edCaret(); if (!c) return;
        edPush(true); edSetType(c.i, ED_CINE[+e.code.slice(5) - 1][0]); edCommit(true); renderEditorDoc(c); return;
      }
      if (e.key === 'Tab' && !mod && !e.altKey) {
        const c = edCaret(), p = c && P.paras[c.i];
        if (p) {
          const empty = !p.x.trim();
          let t = null;
          if (!e.shiftKey) {
            if (p.t === 'a' && empty) t = 'c';
            else if (p.t === 'c' && empty) t = 'tr';
            else if (p.t === 'p') t = 'd';
            else if (p.t === 'd') {
              e.preventDefault(); edPush(true); edLockKeys();
              let at;
              if (empty) { edSetType(c.i, 'p'); at = c.i; }
              else {
                // la acotación entra donde está el cursor: lo de antes queda como diálogo; lo de después, también
                if (c.o < p.x.length && c.o > 0) edSplit(c.i, c.o, 'd');
                at = c.o === 0 ? c.i : c.i + 1;
                edInsert(at, [{ t: 'p', x: '' }]);
              }
              edCommit(true); renderEditorDoc({ i: at, o: 0 }); return;
            }
          } else {
            if (p.t === 'c' && empty) t = 'a';
            else if (p.t === 'tr' && empty) t = 'c';
            else if (p.t === 'p' && empty) t = 'd';
          }
          if (t) { e.preventDefault(); edPush(true); edSetType(c.i, t); edCommit(true); renderEditorDoc(c); return; }
        }
      }
    }
    if (mod && !e.altKey && !e.shiftKey && (e.key === 'g' || e.key === 'G')) { e.preventDefault(); v2GoScene(); return; }
    return _ek.apply(this, arguments);
  };
}
/* el autocompletar de la v1 (personajes, encabezados) más transiciones y extensiones del personaje */
{
  const _al = edAcList;
  edAcList = function (i) {
    const p = P.paras[i], L = _al.apply(this, arguments);
    if (!p) return L;
    const q = (p.x || '').toUpperCase().trimStart();
    if (p.t === 'tr') return V2_TRANS.filter(x => x.startsWith(q) && x !== q).slice(0, 8);
    if (p.t === 'c' && !L.length) {
      const m = q.match(/^(.*?\S)\s*\(([^)]*)$/);
      if (m) return V2_EXT.filter(x => x.startsWith(m[2].trim()) && x !== m[2].trim()).map(x => `${m[1]} (${x})`);
    }
    return L;
  };
}
/* Ctrl + G: ir a una escena por su número o por parte de su encabezado */
function v2GoScene() {
  if (!D || !D.sc) return;
  const anchor = $('#v2PInfo') || $('.v2-edbar');
  popover(anchor, `<div class="v2-goto"><label for="v2GoQ">Ir a la escena</label><input id="v2GoQ" type="text" autocomplete="off" placeholder="Número o parte del encabezado"><p class="hint" id="v2GoH"></p></div>`, pp => {
    const q = $('#v2GoQ', pp), h = $('#v2GoH', pp);
    const find = () => {
      const t = deaccent(q.value.trim().toLowerCase()); if (!t) return -1;
      const sc = D.sc.scenes;
      let k = sc.findIndex(s => String(s.key).toLowerCase() === t);
      if (k < 0) k = sc.findIndex(s => deaccent(String(s.heading || P.paras[s.p0].x || '').toLowerCase()).includes(t));
      return k;
    };
    q.addEventListener('input', () => { const k = find(); h.textContent = k < 0 ? (q.value.trim() ? 'No hay una escena así.' : '') : `${D.sc.scenes[k].key} · ${P.paras[D.sc.scenes[k].p0].x}`; });
    q.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); const k = find(); if (k < 0) return; closePop(); edSetCaret(D.sc.scenes[k].p0, 0); });
    setTimeout(() => q.focus(), 0);
  });
}
/* cada vez que se arma la hoja: el autocompletar de las transiciones (la v1 solo lo abre en personajes y encabezados) */
function v2EdKeysBind() {
  const v = $('#view'); if (!v || v._v2k) return;   // en #view (queda): la hoja (#ed) se rehace
  v._v2k = true;
  v.addEventListener('input', e => {
    if (UI.tab !== 'script' || !e.target.closest || !e.target.closest('#ed')) return;
    const c = edCaret(); if (!c || !P.paras[c.i] || P.paras[c.i].t !== 'tr') return;
    const el = $(`#ed .ep[data-i="${c.i}"]`); if (el) edAcShow(el, c.i);
  });
}
/* los atajos, en «Atajos de teclado» (Ctrl + K › atajos) y en el «⋯» del Guion */
if (typeof KEYS !== 'undefined') {
  const g = KEYS.find(x => x[0] === 'Guion');
  if (g) g[1] = [
    ['Intro', 'Pasa al párrafo siguiente, como en Final Draft: personaje → diálogo → acción; en un párrafo vacío, lo vuelve acción'],
    ['Tab · Mayús + Tab', 'Como en Final Draft: en una acción vacía, personaje; en un personaje vacío, transición; en un diálogo, una acotación; en la acotación, de vuelta al diálogo'],
    ['Ctrl + 1…7 · Ctrl + Alt + 1…7', 'Escena, acción, personaje, acotación, diálogo, transición y plano (si Ctrl + número cambia de pestaña en tu navegador, usa Ctrl + Alt + número)'],
    ['Ctrl + B · I · U', 'Negrita, itálica y subrayado'],
    ['Ctrl + Z · Ctrl + Y', 'Deshacer y rehacer'],
    ['Ctrl + F', 'Buscar en el guion'],
    ['Ctrl + G', 'Ir a una escena (por su número o su encabezado)'],
    ['Tab · ↑ ↓', 'En la lista de sugerencias (personajes, encabezados, transiciones, (V.O.)…): elige'],
    ['Ctrl + Intro', 'En AV: agrega una fila'],
  ];
}
{
  const f = TOOLS_EXTRA.script;
  TOOLS_EXTRA.script = function () { return [...(f ? f.apply(this, arguments) : []), [ICO.list, 'Atajos de teclado', () => keysDialog()]]; };
}

/* ============================================================
   LA ESCENA Y LA PÁGINA SIGUEN A LA HOJA (lo pidió Ronald): al desplazarse por el guion, la escena que está arriba se
   marca en la lista de la izquierda (que se corre para que se vea), «Página N de M» cambia y el panel de la derecha
   muestra esa escena, salvo si se está escribiendo una nota. Con el cursor sigue mandando la escena donde se escribe.
   ============================================================ */
function v2EdTopPara() {
  const sc = $('#edScroll'), eps = $$('#ed .ep'); if (!sc || !eps.length) return -1;
  const y = sc.getBoundingClientRect().top + 48;
  let lo = 0, hi = eps.length - 1, k = 0;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (eps[m].getBoundingClientRect().bottom < y) lo = m + 1; else { k = m; hi = m - 1; } }
  return +eps[k].dataset.i;
}
function v2EdFollow() {
  if (UI.tab !== 'script' || !D || !D.sc || D.sc.sceneOf.length !== P.paras.length || performance.now() < V2_HOLD) return;
  const i = v2EdTopPara(); if (i < 0) return;
  const pi = $('#v2PInfo'); if (pi) pi.textContent = v2PageInfo(i);
  const si = D.sc.sceneOf[i]; if (si == null || si < 0) return;
  const list = $('#slist');
  if (list) {
    let cur = null;
    $$('.v2-sc', list).forEach(b => { const on = +b.dataset.i === si; b.setAttribute('aria-current', on ? 'true' : 'false'); if (on) cur = b; });
    const box = list.closest('.v2-scenes');
    if (cur && box) {
      const r = cur.getBoundingClientRect(), R = box.getBoundingClientRect();
      if (r.top < R.top + 50) box.scrollTop += r.top - R.top - 50;
      else if (r.bottom > R.bottom - 12) box.scrollTop += r.bottom - R.bottom + 12;
    }
  }
  const side = $('#v2Side');
  if (side && side.dataset.si !== String(si)) {
    const ta = $('#v2Reply');
    if (!(ta && (ta.value.trim() || document.activeElement === ta))) { UI.scene = si; side.innerHTML = v2GuionSide(); side.dataset.si = String(si); }
  }
}
function v2EdFollowBind() {
  const sc = $('#edScroll'); if (!sc || sc._v2f) return;
  sc._v2f = true;
  let raf = 0;
  sc.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; v2EdFollow(); }); }, { passive: true });
  for (const ev of ['wheel', 'touchstart', 'pointerdown']) sc.addEventListener(ev, () => { V2_HOLD = 0; }, { passive: true });   // quien se desplaza o toca la hoja vuelve a mandar
}

/* (lote AJ) en la computadora la revisión del guion está siempre a la vista: «⋯» ya no la ofrece (en el teléfono, sí) */
{
  const f = typeof TOOLS_EXTRA !== 'undefined' && TOOLS_EXTRA.script;
  if (f) TOOLS_EXTRA.script = function () { return PHONE() ? f.apply(this, arguments) : []; };   // (el teléfono conserva su «⋯»)
}
