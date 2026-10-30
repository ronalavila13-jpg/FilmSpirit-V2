/* ============================================================
   VERSIÓN 2 · STORYBOARD (PDF «FilmSpirit · versión 2», página Storyboard)
   Las viñetas en cuadros de cuatro columnas, filtradas por escena; un clic elige el plano y lo muestra a la
   derecha con sus datos y sus notas; «Editar en 3D» abre el editor de la v1 (shot-editor.js). Con una escena
   elegida, las viñetas se arrastran para cambiar su orden (como en la v1). «Lista» es el guion técnico de la v1.
   ============================================================ */
/* quién edita (como la v1): la sección «storyboard» (ficha.js · fichaEditable) */
const v2SbEd = () => typeof fichaEditable === 'function' ? fichaEditable() : !UI.readOnly;
const v2SbShot = () => { const id = UI.v2Shot; return id && P.shots[id] ? P.shots[id] : null; };
/* (lote AJ) orden de las viñetas: «num» (el del guion) o «grupo»: primero cada grupo que se graba de una vez (el de su plano más bajo
   primero, y dentro de cada grupo por número) y después los planos sueltos. Solo cambia cómo se ven; los números no se tocan. */
const v2SbSort = () => UI.sbSort || (UI.sbSort = ls.get('sbSort', 'num'));
function v2SbOrd(shots) {
  if (v2SbSort() !== 'grupo') return shots;
  const G = shotGroups(), here = new Set(shots), seen = new Set(), out = [];
  for (const sh of shots) { const g = G.get(sh.id); if (!g || seen.has(g)) continue; seen.add(g); for (const x of g.members) if (here.has(x)) out.push(x); }
  for (const sh of shots) if (!G.has(sh.id)) out.push(sh);
  return out;
}
const v2SbList = () => { const sc = UI.sbScene ? [sceneOfKey(UI.sbScene)].filter(Boolean) : D.sc.scenes; return sc.flatMap(s => v2SbOrd(D.shotsBy[s.key] || [])); };
const v2Takes = sh => ((P.sup && P.sup.takes && P.sup.takes[sh.id]) || []).length;
const v2Secs = s => { s = Math.round(s); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ' ' + (s % 60) + ' s' : ''}`; };

V2_ACTS.board = () => `<div class="v2-seg" role="group" aria-label="Vista del storyboard">
    <button type="button" data-v2a="sbv" data-v="panels" aria-pressed="${ea(UI.sbView !== 'table')}">Cuadros</button><button type="button" data-v2a="sbv" data-v="table" aria-pressed="${ea(UI.sbView === 'table')}">Lista</button></div>`
  + `<button type="button" class="v2-btn" data-v2a="export">Exportar PDF</button>`
  + (!v2SbEd() ? '' : `<button type="button" class="v2-btn y" data-v2a="sbnew">${v2I('plus')}<span>Nuevo plano</span></button>`);
V2_DO.sbv = b => { UI.sbView = b.dataset.v; render(); };
V2_DO.sbnew = () => {
  const cur = v2SbShot(), s = UI.sbScene ? sceneOfKey(UI.sbScene) : cur ? sceneOfKey(cur.sc) : D.sc.scenes[UI.scene] || D.sc.scenes[0];
  if (s) newShot(s, s.p0 + 1 < s.p1 ? s.p0 + 1 : s.p0, s.p1 - 1, { size: 'PG' }, true);
};

function v2SbCard(sh, cur, G) {
  const nn = typeof notesAt === 'function' ? notesAt('shot:' + sh.id).reduce((a, n) => a + 1 + noteReplies(n.id).length, 0) : 0;
  const chars = (sh.chars || []).map(id => P.elements[id]).filter(Boolean).map(e => titleCase(e.name)).join(', ');
  const g = G && G.get(sh.id), lead = g && g.lead.id === sh.id;
  return `<div class="pcell v2-sbc${sh.id === cur ? ' on' : ''}${g ? ' v2-grp' : ''}" data-sid="${ea(sh.id)}" data-note="shot:${ea(sh.id)}"${g ? ` style="--gc:${g.color}"` : ''}>
    <button type="button" class="v2-sbb" data-v2pick="${ea(sh.id)}" aria-label="Plano ${esc(D.code[sh.id])}">
      <span class="v2-sbf">${sbFrames(sh)}${sh.done ? `<i class="v2-ok" title="Rodado">${v2I('check')}</i>` : ''}${nn ? `<i class="v2-nn">${v2I('note')}${nn}</i>` : ''}</span>
      <span class="v2-sbm"><b>${esc(D.code[sh.id])}</b>${g ? `<span class="v2-gt" title="Se graba de una vez con ${esc(g.members.filter(x => x !== sh).map(x => D.code[x.id]).join(', '))}: claqueta ${esc(D.code[g.lead.id])}">${lead ? '+' + (g.members.length - 1) : 'con ' + esc(D.code[g.lead.id])}</span>` : ''}<span class="v2-sz">${esc(sh.size || '—')}</span>${sh.lens ? `<span class="l">${esc(String(sh.lens))} mm</span>` : ''}<span class="d">${sh.dur ? esc(String(sh.dur)) + ' s' : ''}</span></span>
      ${sh.desc ? `<span class="v2-sbd">${esc(sh.desc)}</span>` : `<span class="v2-sbd mut">${esc(shotTextExcerpt(sh, 90))}</span>`}
      ${chars ? `<span class="v2-sbch">${esc(chars)}</span>` : ''}
    </button></div>`;
}
function v2SbPanel(sh) {
  if (!sh) return `<aside class="v2-card v2-sbp"><p class="v2-mut">Elige un plano para ver sus datos.</p></aside>`;
  const takes = v2Takes(sh);
  const kind = shot3D(sh) ? 'Viñeta 3D · maniquíes MakeHuman' : d2On(sh) ? 'Dibujo 2D' : sh.img ? 'Imagen' : 'Viñeta automática';
  const notes = typeof notesAt === 'function' ? notesAt('shot:' + sh.id) : [];
  const f = (l, v) => `<div><span>${esc(l)}</span><b>${esc(v || '—')}</b></div>`;
  return `<aside class="v2-card v2-sbp" data-sid="${ea(sh.id)}">
    <header><h2>Plano ${esc(D.code[sh.id])}</h2>${(() => { const g = shotGroups().get(sh.id); return g ? `<span class="v2-gt big" style="--gc:${g.color}">Claqueta ${esc(D.code[g.lead.id])}</span>` : ''; })()}${sh.done ? `<span class="v2-done">${v2I('check')}Rodado${takes ? ` · ${takes} ${takes === 1 ? 'toma' : 'tomas'}` : ''}</span>` : ''}</header>
    <div class="v2-sbbig">${sbFrames(sh)}</div>
    <div class="v2-sbk"><span>${esc(kind)}</span>${!v2SbEd() ? '' : `<button type="button" class="v2-btn" data-act="shot" data-id="${ea(sh.id)}">${v2I('cube')}<span>Editar en 3D</span></button>`}</div>
    ${sh.desc ? `<p class="v2-sbdesc">${esc(sh.desc)}</p>` : ''}
    <div class="v2-sbg">${f('Tamaño', SIZE_NAME[sh.size] || sh.size)}${f('Ángulo', sh.angle)}${f('Movimiento', sh.move)}${f('Lente', sh.lens ? sh.lens + ' mm' : '')}${f('Soporte', sh.support)}${f('Duración', sh.dur ? sh.dur + ' s' : '')}</div>
    ${notes.length ? `<div class="v2-sbn"><h3>Notas</h3>${notes.map(n => v2NoteHTML(n, false) + noteReplies(n.id).map(r => v2NoteHTML(r, true)).join('')).join('')}</div>` : ''}
  </aside>`;
}
V2_ICO.check = '<path d="m5 12.5 4.5 4.5L19 7"/>';
V2_ICO.note = '<path d="M5 5h14v10H10l-4 4v-4H5z"/>';
V2_ICO.cube = '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>';

RENDER.board = (orig => function () {
  if (!V2.on || UI.sbView === 'table') {
    const r = orig.apply(this, arguments);
    if (V2.on) { const s = $('#view .scroller'); if (s) s.insertAdjacentHTML('afterbegin', v2SbFilter()); }
    return r;
  }
  const v = $('#view');
  if (!D.sc.scenes.length) { v.innerHTML = `<div class="v2-pg">${emptyScript()}</div>`; bindView(); return; }
  ensureFrames('index');
  if (UI.sbScene && !sceneOfKey(UI.sbScene)) UI.sbScene = '';
  const list = v2SbList();
  if (!v2SbShot() || !list.includes(v2SbShot())) UI.v2Shot = (list[0] || {}).id || '';
  const cur = UI.v2Shot, ar = (ASPECTS[P.meta.aspect] || 16 / 9), G = shotGroups();
  v.innerHTML = `<div class="v2-pg v2-sb" style="--ar:${ea(ar)}">
    ${v2SbFilter()}${v2SbLegend(G)}
    <div class="v2-sbwrap">
      <div class="v2-sbgrid sb-grid"${UI.sbScene ? ` data-sc="${esc(UI.sbScene)}"` : ''}>${list.map(sh => v2SbCard(sh, cur, G)).join('') || `<p class="v2-mut">Sin planos todavía. Usa «Nuevo plano».</p>`}</div>
      ${v2SbPanel(v2SbShot())}
    </div>
    ${v2SbEd() ? '<div class="sb-selbar" id="sbSelBar" role="status" hidden></div>' : ''}
  </div>`;
  bindView();
  hydrateThumbs();
  v2SbBind();
  sbSelPaint();
})(RENDER.board);

function v2SbOrdBtn() {
  if (!shotGroups().size) return '';
  const o = v2SbSort();
  return `<span class="v2-ord" role="group" aria-label="Orden de los planos" title="Número: el orden del guion. Color: cada grupo que se graba de una vez junto, y después los sueltos (los números no cambian)"><span class="lab">Orden</span><button type="button" data-v2ord="num" aria-pressed="${o !== 'grupo'}">Número</button><button type="button" data-v2ord="grupo" aria-pressed="${o === 'grupo'}">Color</button></span>`;
}
function v2SbFilter() {
  const withShots = D.sc.scenes.filter(s => (D.shotsBy[s.key] || []).length);
  const all = Object.values(P.shots), done = all.filter(x => x.done).length, secs = all.reduce((a, x) => a + (num(x.dur) || 0), 0);
  return `<div class="v2-sbfil"><span class="lab">Escena</span>
    <button type="button" class="v2-fb${UI.sbScene ? '' : ' on'}" data-v2sc="">Todas</button>${withShots.map(s => `<button type="button" class="v2-fb${UI.sbScene === s.key ? ' on' : ''}" data-v2sc="${ea(s.key)}">${esc(s.key)}</button>`).join('')}
    <span class="v2-grow"></span>${v2SbOrdBtn()}<span class="v2-sbst">${all.length} ${all.length === 1 ? 'plano' : 'planos'} · ${done} ${done === 1 ? 'rodado' : 'rodados'}${secs ? ' · ' + v2Secs(secs) : ''}</span></div>`;
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
    const od = e.target.closest('[data-v2ord]'); if (od) { UI.sbSort = od.dataset.v2ord; ls.set('sbSort', UI.sbSort); render(); return; }
    const f = e.target.closest('[data-v2sc]'); if (f && f.closest('.v2-sbfil')) { UI.sbScene = f.dataset.v2sc; render(); return; }
    const p = e.target.closest('[data-v2pick]'); if (p && PHONE()) { UI.v2Shot = p.dataset.v2pick; v2Sheet('sbshot'); return; }
    if (p) { UI.v2Shot = p.dataset.v2pick; const old = $('.v2-sbc.on', v); if (old) old.classList.remove('on'); p.closest('.v2-sbc').classList.add('on'); const pn = $('.v2-sbp', v); if (pn) { pn.outerHTML = v2SbPanel(P.shots[UI.v2Shot]); hydrateThumbs(); } }
  });
  v.addEventListener('dblclick', e => { const p = e.target.closest('[data-v2pick]'); if (p && UI.tab === 'board' && !!v2SbEd()) openShot(p.dataset.v2pick); });
  v.addEventListener('contextmenu', e => { const c = e.target.closest('.v2-sbc'); if (!c || UI.tab !== 'board' || !v2SbEd()) return; e.preventDefault(); sbMoreMenu(c, P.shots[c.dataset.sid]); });
}

/* el teléfono: el plano elegido sube en una hoja (sus datos, sus notas y «Editar en 3D») */
V2_SHEET.sbshot = { tab: 'board', title: () => { const sh = v2SbShot(); return sh ? 'Plano ' + D.code[sh.id] : 'Plano'; }, closeOn: ['shot'], html: () => v2SbPanel(v2SbShot()), after: () => { if (typeof hydrateThumbs === 'function') hydrateThumbs(); } };
