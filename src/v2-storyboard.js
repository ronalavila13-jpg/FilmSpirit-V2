/* ============================================================
   VERSIÓN 2 · STORYBOARD (PDF «FilmSpirit · versión 2», página Storyboard)
   Las viñetas en cuadros de cuatro columnas, filtradas por escena; un clic elige el plano (línea amarilla: la misma
   de Ctrl/Mayús+clic, que suma más) y un doble clic abre el editor de la v1 (shot-editor.js). Con una escena
   elegida, las viñetas se arrastran para cambiar su orden (como en la v1). «Lista» es el guion técnico de la v1.
   ============================================================ */
/* quién edita (como la v1): la sección «storyboard» (ficha.js · fichaEditable) */
const v2SbEd = () => typeof fichaEditable === 'function' ? fichaEditable() : !UI.readOnly;
const v2SbShot = () => P.shots[sbSelLast()] || null;   // el último plano elegido (tab-board.js)
/* (lote AJ) orden de las viñetas: «num» (el del guion) o «grupo»: cada grupo que se graba de una vez va junto, en el lugar de su
   plano más bajo (pasa delante de un plano suelto solo si su número es menor), y los sueltos conservan el suyo. Solo cambia
   cómo se ven; los números no se tocan. */
const v2SbSort = () => UI.sbSort || (UI.sbSort = ls.get('sbSort', 'num'));
function v2SbOrd(shots) {
  if (v2SbSort() !== 'grupo') return shots;
  const G = shotGroups(), here = new Set(shots), seen = new Set(), out = [];
  for (const sh of shots) {
    const g = G.get(sh.id);
    if (!g) out.push(sh);
    else if (!seen.has(g)) { seen.add(g); for (const x of g.members) if (here.has(x)) out.push(x); }
  }
  return out;
}
const v2SbList = () => { const sc = UI.sbScene ? [sceneOfKey(UI.sbScene)].filter(Boolean) : D.sc.scenes; return sc.flatMap(s => v2SbOrd(D.shotsBy[s.key] || [])); };
const v2Secs = s => { s = Math.round(s); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ' ' + (s % 60) + ' s' : ''}`; };

V2_ACTS.board = () => `<div class="v2-seg" role="group" aria-label="Vista del storyboard">
    <button type="button" data-v2a="sbv" data-v="panels" aria-pressed="${ea(UI.sbView !== 'table' && UI.sbView !== 'plantas')}">Cuadros</button><button type="button" data-v2a="sbv" data-v="plantas" aria-pressed="${ea(UI.sbView === 'plantas')}" title="La planta de cámara de cada plano, con su viñeta en miniatura">Plantas</button><button type="button" data-v2a="sbv" data-v="table" aria-pressed="${ea(UI.sbView === 'table')}">Lista</button></div>`
  + `<button type="button" class="v2-btn" data-v2a="export">Exportar PDF</button>`
  + (!v2SbEd() ? '' : `<button type="button" class="v2-btn y" data-v2a="sbnew">${v2I('plus')}<span>Nuevo plano</span></button>`);
V2_DO.sbv = b => { UI.sbView = b.dataset.v; render(); };
V2_DO.sbnew = () => {
  const cur = v2SbShot(), s = UI.sbScene ? sceneOfKey(UI.sbScene) : cur ? sceneOfKey(cur.sc) : D.sc.scenes[UI.scene] || D.sc.scenes[0];
  if (s) newShot(s, s.p0 + 1 < s.p1 ? s.p0 + 1 : s.p0, s.p1 - 1, { size: 'PG' }, true);
};

function v2SbCard(sh, G, plan) {
  const nn = typeof notesAt === 'function' ? notesAt('shot:' + sh.id).reduce((a, n) => a + 1 + noteReplies(n.id).length, 0) : 0;
  const chars = (sh.chars || []).map(id => P.elements[id]).filter(Boolean).map(e => titleCase(e.name)).join(', ');
  const g = G && G.get(sh.id), lead = g && g.lead.id === sh.id;
  return `<div class="pcell v2-sbc${sbSel().has(sh.id) ? ' sel' : ''}${g ? ' v2-grp' : ''}" data-sid="${ea(sh.id)}" data-note="shot:${ea(sh.id)}"${g ? ` style="--gc:${g.color}"` : ''}>
    <button type="button" class="v2-sbb" data-v2pick="${ea(sh.id)}" aria-label="Plano ${esc(D.code[sh.id])}">
      <span class="v2-sbf${plan ? ' v2-plf' : ''}">${plan ? v2PlImg(sh) + `<span class="v2-pli">${sbFrames(sh)}</span>` : sbFrames(sh)}${sh.done ? `<i class="v2-ok" title="Rodado">${v2I('check')}</i>` : ''}${nn ? `<i class="v2-nn">${v2I('note')}${nn}</i>` : ''}</span>
      <span class="v2-sbm"><b>${esc(D.code[sh.id])}</b>${g ? `<span class="v2-gt" title="Se graba de una vez con ${esc(g.members.filter(x => x !== sh).map(x => D.code[x.id]).join(', '))}: claqueta ${esc(D.code[g.lead.id])}">${lead ? '+' + (g.members.length - 1) : 'con ' + esc(D.code[g.lead.id])}</span>` : ''}<span class="v2-sz">${esc(sh.size || '—')}</span>${sh.lens ? `<span class="l">${esc(String(sh.lens))} mm</span>` : ''}<span class="d">${sh.dur ? esc(String(sh.dur)) + ' s' : ''}</span></span>
      ${sh.desc ? `<span class="v2-sbd">${esc(sh.desc)}</span>` : `<span class="v2-sbd mut">${esc(shotTextExcerpt(sh, 90))}</span>`}
      ${chars ? `<span class="v2-sbch">${esc(chars)}</span>` : ''}
    </button>${typeof iaPillHTML === 'function' ? iaPillHTML(sh) : ''}</div>`;
}
/* la vista «Plantas»: la planta de cámara de cada plano (planta-general.js · plantaShotCanvas), con su viñeta en una esquina.
   Se dibujan de a poco, sin frenar la pantalla, y se guardan por plano y firma de su escena 3D */
const PL_IMG = new Map();
const v2PlImg = sh => shot3D(sh) ? `<img class="v2-plm wait" data-plsh="${ea(sh.id)}" alt="Planta de cámara del plano ${ea(D.code[sh.id])}" src="${ea(BLANK)}" draggable="false">` : `<span class="v2-plm none">Dibujado a mano: sin planta de cámara</span>`;
function v2PlKey(sh, s3) { const j = JSON.stringify(s3); let h = 5381; for (let i = 0; i < j.length; i++) h = (h * 33 ^ j.charCodeAt(i)) >>> 0; return sh.id + ':' + h; }
function v2PlHydrate() {
  const imgs = $$('#view img.v2-plm[data-plsh]'); let i = 0;
  const step = () => {
    const t0 = performance.now();
    while (i < imgs.length && performance.now() - t0 < 24) {
      const im = imgs[i++], sh = im.isConnected && P.shots[im.dataset.plsh]; if (!sh) continue;
      try {
        const s3 = s3Of(sh), k = v2PlKey(sh, s3); let u = PL_IMG.get(k);
        if (!u) { u = plantaShotCanvas(s3, 320, 2, Math.round(320 * 9 / 16)).toDataURL(IMG_WEBP ? 'image/webp' : 'image/png', .9); PL_IMG.set(k, u); }
        im.src = u; im.classList.remove('wait');
      } catch (e) { }
    }
    if (i < imgs.length) setTimeout(step, 16);
  };
  step();
}
V2_ICO.layers = '<path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>';
V2_ICO.plant = '<path d="M4 4h16v16H4zM4 10h7M11 10v10M15 4v6h5"/><circle cx="15.5" cy="15" r="1.6"/>';
V2_ICO.check = '<path d="m5 12.5 4.5 4.5L19 7"/>';
V2_ICO.note = '<path d="M5 5h14v10H10l-4 4v-4H5z"/>';

RENDER.board = (orig => function () {
  if (!V2.on || UI.sbView === 'table') {
    const r = orig.apply(this, arguments);
    if (V2.on) { const s = $('#view .scroller'); if (s) s.insertAdjacentHTML('afterbegin', v2SbFilter()); v2SbBind(); }
    return r;
  }
  const v = $('#view');
  if (!D.sc.scenes.length) { v.innerHTML = `<div class="v2-pg">${emptyScript()}</div>`; bindView(); return; }
  ensureFrames('index');
  if (UI.sbScene && !sceneOfKey(UI.sbScene)) UI.sbScene = '';
  const list = v2SbList();
  const ar = (ASPECTS[P.meta.aspect] || 16 / 9), G = shotGroups(), plan = UI.sbView === 'plantas';
  v.innerHTML = `<div class="v2-pg v2-sb" style="--ar:${ea(ar)}">
    ${v2SbFilter()}${v2SbLegend(G)}
    ${plan ? v2SbPlans(G) : `<div class="v2-sbgrid sb-grid"${UI.sbScene ? ` data-sc="${esc(UI.sbScene)}"` : ''}>${list.map(sh => v2SbCard(sh, G)).join('') || `<p class="v2-mut">Sin planos todavía. Usa «Nuevo plano».</p>`}</div>`}
    ${v2SbEd() ? '<div class="sb-selbar" id="sbSelBar" role="status" hidden></div>' : ''}
  </div>`;
  bindView();
  hydrateThumbs();
  if (plan) v2PlHydrate();
  v2SbBind();
  sbSelPaint();
})(RENDER.board);

/* «Plantas»: cada escena con su encabezado (y el icono de su planta general) y, debajo, las tarjetas de sus planos */
function v2SbPlans(G) {
  const scenes = UI.sbScene ? [sceneOfKey(UI.sbScene)].filter(Boolean) : D.sc.scenes;
  const out = scenes.map(s => {
    const shots = v2SbOrd(D.shotsBy[s.key] || []); if (!shots.length) return '';
    const n = shots.length, has3d = shots.some(sh => shot3D(sh));
    return `<section class="v2-plsc"><header><h3><span class="no">Esc. ${esc(s.key)}</span><span class="sch">${esc(s.heading)}</span><span class="v2-mut">· ${n} ${n === 1 ? 'plano' : 'planos'}</span></h3>${has3d ? `<button type="button" class="v2-plgi" data-sc="${ea(s.key)}" title="Planta general de la escena: las cámaras de todos sus planos" aria-label="Planta general de la escena ${ea(s.key)}">${v2I('layers')}<span>Planta general</span></button>` : ''}</header>
      <div class="v2-sbgrid sb-grid"${UI.sbScene ? ` data-sc="${esc(UI.sbScene)}"` : ''}>${shots.map(sh => v2SbCard(sh, G, true)).join('')}</div></section>`;
  }).join('');
  return out || `<p class="v2-mut">Sin planos todavía. Usa «Nuevo plano».</p>`;
}
function v2SbOrdBtn() {
  if (!shotGroups().size) return '';
  const o = v2SbSort();
  return `<span class="v2-ord" role="group" aria-label="Orden de los planos" title="Número: el orden del guion. Color: cada grupo que se graba de una vez junto, en el lugar de su plano más bajo (los números no cambian)"><span class="lab">Orden</span><button type="button" data-v2ord="num" aria-pressed="${o !== 'grupo'}">Número</button><button type="button" data-v2ord="grupo" aria-pressed="${o === 'grupo'}">Color</button></span>`;
}
/* guion técnico: todos los planos o un plano por grupo de color (tab-board.js · sbColOn) */
function v2SbColBtn() {
  if (!shotGroups().size) return '';
  const o = sbColOn();
  return `<span class="v2-ord" role="group" aria-label="Planos de un mismo grupo" title="Todos: cada plano en su fila. Un plano: cada grupo de color deja solo su plano más bajo, para contar menos (con «+N»; un clic en él lo abre)"><span class="lab">Grupos</span><button type="button" data-v2col="" aria-pressed="${!o}">Todos</button><button type="button" data-v2col="1" aria-pressed="${o}">Un plano</button></span>`;
}
function v2SbFilter() {
  const withShots = D.sc.scenes.filter(s => (D.shotsBy[s.key] || []).length);
  const every = Object.values(P.shots), G = shotGroups(), all = UI.sbView === 'table' ? every.filter(x => !sbColHidden(x, G)) : every;   // con «Un plano», cada grupo cuenta uno
  const done = all.filter(x => x.done).length, secs = every.reduce((a, x) => a + (num(x.dur) || 0), 0);
  return `<div class="v2-sbfil"><span class="lab">Escena</span>
    <button type="button" class="v2-fb${UI.sbScene ? '' : ' on'}" data-v2sc="">Todas</button>${withShots.map(s => `<button type="button" class="v2-fb${UI.sbScene === s.key ? ' on' : ''}" data-v2sc="${ea(s.key)}">${esc(s.key)}</button>`).join('')}
    <span class="v2-grow"></span>${typeof iaSwitchHTML === 'function' ? iaSwitchHTML() : ''}${UI.sbView === 'table' ? v2SbColBtn() : v2SbOrdBtn()}<span class="v2-sbst">${all.length} ${all.length === 1 ? 'plano' : 'planos'}${all.length < every.length ? ` (${every.length} con sus grupos)` : ''} · ${done} ${done === 1 ? 'rodado' : 'rodados'}${secs ? ' · ' + v2Secs(secs) : ''}</span></div>`;
}
/* la leyenda de los planos que se graban de una vez: un color por grupo y la claqueta del más bajo */
function v2SbLegend(G) {
  const seen = new Set(), gs = [];
  for (const g of G.values()) if (!seen.has(g)) { seen.add(g); gs.push(g); }
  if (!gs.length) return '';
  return `<div class="v2-sbleg" aria-label="Planos que se graban de una vez"><span class="lab">Un solo tiro</span>${gs.map(g => `<span class="v2-lg" style="--gc:${g.color}"><i></i><b>Claqueta ${esc(D.code[g.lead.id])}</b><span>${esc(g.members.map(x => D.code[x.id]).join(' · '))}</span></span>`).join('')}</div>`;
}
function v2SbBind() {
  const v = $('#view');
  // con una escena elegida, las viñetas se arrastran para cambiar el orden (tab-board.js · boardDrag)
  const g = $('.v2-sbgrid', v);
  if (g && UI.sbScene && !!v2SbEd() && v2SbSort() !== 'grupo') g.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const cell = e.target.closest('.pcell'); if (!cell) return;
    pressGesture(e, { target: cell, onLift: ev => boardDrag(cell, ev) });
  });
  if (v._v2sb) return; v._v2sb = true;
  // Ctrl+clic (⌘ en Mac) o Mayús+clic en una viñeta: la elige o la suelta; el último elegido es el de origen al copiar atributos
  v.addEventListener('click', e => {
    if (UI.tab !== 'board' || !(e.ctrlKey || e.metaKey || e.shiftKey) || e.altKey) return;
    const c = e.target.closest('.v2-sbc'); if (!c || !v2SbEd()) return;
    e.preventDefault(); e.stopPropagation();
    sbSelToggle(c.dataset.sid);
  }, true);
  v.addEventListener('click', e => {
    if (UI.tab !== 'board') return;
    const iaG = e.target.closest('[data-v2iagen]'); if (iaG) { e.stopPropagation(); iaShotDialog(P.shots[iaG.dataset.v2iagen]); return; }
    const ia1 = e.target.closest('[data-v2ia]'); if (ia1) { e.stopPropagation(); iaShotToggle(P.shots[ia1.dataset.v2ia]); return; }
    const iaA = e.target.closest('[data-v2iaall]'); if (iaA) { iaAllSet(iaA.dataset.v2iaall === '1'); return; }
    const cg = e.target.closest('[data-v2col]'); if (cg) { UI.sbCol = cg.dataset.v2col; ls.set('sbCol', UI.sbCol); UI.sbOpen = new Set(); render(); return; }
    // el botón «Planta general» del encabezado de cada escena (vista «Plantas»): planta-general.js
    const gp = e.target.closest('.v2-plgi'); if (gp) { plantaGeneral(gp.dataset.sc); return; }
    const od = e.target.closest('[data-v2ord]'); if (od) { UI.sbSort = od.dataset.v2ord; ls.set('sbSort', UI.sbSort); render(); return; }
    const f = e.target.closest('[data-v2sc]'); if (f && f.closest('.v2-sbfil')) { UI.sbScene = f.dataset.v2sc; render(); return; }
    // un clic elige solo ese plano (amarillo); Ctrl/Mayús+clic, arriba, suma o suelta
    const p = e.target.closest('[data-v2pick]'), id = p && p.dataset.v2pick;
    if (id && !UI.readOnly && P.shots[id]) { const S = sbSel(); if (!(S.size === 1 && S.has(id))) { S.clear(); S.add(id); sbSelPaint(); } }
  });
  // doble clic: el editor del plano; en «Plantas», con la planta de cámara a pantalla completa (en «Cuadros» abre el encuadre)
  v.addEventListener('dblclick', e => {
    const p = e.target.closest('[data-v2pick]'); if (!p || UI.tab !== 'board' || !v2SbEd()) return;
    const sh = P.shots[p.dataset.v2pick]; UI.edPlan = !!(sh && UI.sbView === 'plantas' && shot3D(sh));
    openShot(p.dataset.v2pick);
  });
  v.addEventListener('contextmenu', e => { const c = e.target.closest('.v2-sbc'); if (!c || UI.tab !== 'board' || !v2SbEd()) return; e.preventDefault(); sbMoreMenu(c, P.shots[c.dataset.sid]); });
}
