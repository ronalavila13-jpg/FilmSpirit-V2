/* ============================================================
   GUION y GUION RAYADO — escribir (Guion) y marcar el desglose con etiquetas de color y el rayado de los planos
   (Guion rayado). Las dos pestañas comparten esta vista: Guion abre el editor; Guion rayado, las páginas para marcar.
   ============================================================ */
/* capas del guion rayado: en la pestaña Guion (solo lectura, sin editor) el texto se ve limpio */
const LAYERS = () => UI.tab === 'lined' ? UI.mode : { tags: false, cov: false };
function sceneListHTML(act) {
  const { scenes } = D.sc;
  return `${hdSide('Escenas', `${scenes.length} · ${D.pages.length} ${D.pages.length === 1 ? 'pág.' : 'págs.'}`, 'Buscar escena o locación')}
    <ul class="slist${ea((D.sc.eps || []).length ? ' slist-ep' : '')}" id="slist">${scenes.map(s => `${(D.sc.eps || []).filter(e => e.s0 === s.idx).map(epSideHead).join('')}<li data-q="${esc((s.key + ' ' + s.heading).toLowerCase())}"><button data-act="${ea(act)}" data-i="${ea(s.idx)}" ${s.idx === UI.scene ? 'aria-current="true"' : ''}>
      <span class="k">${esc(s.key)}</span>${(d => `<span class="h sh-h" title="${esc(s.heading + (d ? ' · ' + d : ''))}"><span class="sch">${esc(s.heading)}</span>${d ? `<span class="scd">${esc(d)}</span>` : ''}</span>`)(synopsisOf(s))}<span class="e tnum">${fmtEighths(D.metrics.eighths[s.idx])}</span></button></li>`).join('')}</ul>`;
}
function bindSceneSearch() {
  const q = $('#sceneQ');
  if (!q) return;
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase();
    $$('#slist li').forEach(li => { li.hidden = v && !li.dataset.q.includes(v); });
  });
}
function emptyScript() {
  const ed = typeof edEditable === 'function' && edEditable();
  // en las demás pestañas, su nombre arriba: se sabe dónde se está y que esta pestaña se arma con el guion
  const here = UI.tab !== 'script' && typeof TAB_NAMES !== 'undefined' && TAB_NAMES[UI.tab];
  return `<div class="empty">${here ? `<p class="eyebrow" style="margin:0"><span>${esc(here)}</span> · <span>se arma con el guion</span></p>` : ''}<h2>Escribe o importa tu guion</h2>
    <p style="max-width:50ch;margin:0">Escribe aquí en formato de cine o de dos columnas (AV), o importa Final Draft (.fdx), Fountain (.fountain) o PDF. Las escenas, el reparto y los elementos probables se marcan solos.</p>
    <div class="empty-acts">${ed ? '<button class="btn primary" data-act="write-cine">Escribir guion de cine</button><button class="btn" data-act="write-av">Escribir guion AV (dos columnas)</button>' : ''}<button class="btn${ea(ed ? ' ghost' : ' primary')}" data-act="import">Importar guion…</button></div>
    ${typeof myScriptsBtnHTML === 'function' ? `<p class="hint" style="margin:6px 0 0">¿Buscas otro guion? ${myScriptsBtnHTML()}</p>` : ''}</div>`;
}
const scriptModeHTML = () => UI.tab === 'script' && typeof scriptLock === 'function' && scriptLock() && edEditableBase()
  ? `<button class="btn" data-act="lk-panel" title="El guion está cerrado: abre una revisión para escribir">${ICO.lock} Abrir una revisión para escribir</button>` : '';

RENDER.script = function () {
  const v = $('#view');
  document.body.classList.toggle('hl-off', !!scriptLock());   // guion cerrado: los resaltados del guionista se ocultan (guion-formato.js)
  if (!P.paras.length) { v.innerHTML = emptyScript(); bindView(); return; }
  scriptModeFor(UI.tab);
  if (UI.scriptEdit && typeof edEditable === 'function' && edEditable()) {
    v.innerHTML = `<div class="ws ws-ed">
      <aside class="side" id="side">${sceneListHTML('ed-goto')}</aside>
      <section class="center">
        <div class="bar sc-bar">
          <button class="btn ghost icon only-narrow" data-act="drawer" data-d="#side" aria-label="Escenas" title="Escenas">${ICO.list}</button>
          ${typeof myScriptsBtnHTML === 'function' ? myScriptsBtnHTML() : ''}
          ${editorBarHTML()}
          <span class="grow"></span>${typeof wkChipHTML === 'function' ? wkChipHTML() : ''}${lockChipHTML()}
          <button class="btn ghost only-mid hide-sm" data-act="drawer" data-d="#insp" title="Revisión del guion: resumen, carátula, buscar, revisiones">${ICO.check} Revisión</button>
          ${toolsHTML()}
        </div>
        ${TOUCHY ? '' : tipHTML('ed-uso', edFormat() === 'av' ? 'Escribe el video a la izquierda y el audio a la derecha. Tab pasa a la celda siguiente; Ctrl + Intro agrega una fila. «NOMBRE: texto» en el audio cuenta como personaje.' : 'Intro pasa al párrafo que sigue (personaje → diálogo). Tab cambia el tipo de párrafo; Ctrl + 1…7 lo elige. Escribe «INT.» o «EXT.» para empezar una escena.')}
        <div class="scroller" id="edScroll" data-keep="scripted"><div id="edHost">${editorHTML()}</div></div>
      </section>
      <aside class="insp rev" id="insp" aria-label="Revisión del guion">${reviewHTML()}</aside>
    </div>`;
    document.body.classList.add('writing');   // escribir: en el modo oscuro, lo de alrededor en gris y atenuado (en el claro no cambia nada)
    bindView(); bindSceneSearch(); bindEditorDoc(); bindReview(); bindEdPinch();
    return;
  }
  v.innerHTML = `<div class="ws">
    <aside class="side" id="side">${sceneListHTML('goto')}</aside>
    <section class="center">
      <div class="bar">
        <button class="btn ghost icon only-narrow" data-act="drawer" data-d="#side" aria-label="Escenas" title="Escenas">${ICO.list}</button>
        ${UI.tab === 'script' && typeof myScriptsBtnHTML === 'function' ? myScriptsBtnHTML() : ''}
        ${scriptModeHTML()}
        ${UI.tab === 'lined' ? `<div class="hd-togs hide-sm" role="group" aria-label="Capas">
          <button type="button" data-act="mode" data-m="tags" aria-pressed="${ea(UI.mode.tags)}" title="Los colores del desglose sobre el texto">${ICO.ok}Etiquetas</button>
          <button type="button" data-act="mode" data-m="cov" aria-pressed="${ea(UI.mode.cov)}" title="Las líneas de los planos sobre el texto">${ICO.ok}Rayado</button>
          ${typeof anoChipHTML === 'function' ? anoChipHTML() : ''}
        </div>${typeof anoBtnHTML === 'function' ? anoBtnHTML() : ''}` : ''}
        ${UI.tab === 'lined' && !UI.readOnly ? mkBtnHTML() : ''}
        <div class="seg hide-sm" role="group" aria-label="Zoom"><button data-act="zoom" data-z="-1" aria-label="Alejar">−</button><button data-act="zoom" data-z="1" aria-label="Acercar">+</button></div>
        <span class="grow"></span>${lockChipHTML()}
        <button class="btn ghost only-narrow for-insp" data-act="drawer" data-d="#insp">Escena ${esc(D.sc.scenes[UI.scene] ? D.sc.scenes[UI.scene].key : '')}</button>
        ${toolsHTML()}
      </div>
      ${UI.tab === 'lined' && UI.mode.tags ? legendHTML('lined') : ''}
      <div class="scroller" id="scroller" data-keep="script"><div class="pages${ea(edFormat() === 'av' ? ' av-pages' : '')}" id="pages">${pagesHTML()}</div></div>
    </section>
    <aside class="insp ins" id="insp">${inspectorHTML()}</aside>
  </div>`;
  fitPages();
  bindView();
  bindSceneSearch();
  bindScript();
  mkPaint();
};

/* pellizco con dos dedos sobre la hoja (guion rayado, guion de solo lectura y editor del guion): lo acerca la app, no
   el navegador, así la barra de arriba, la de categorías y los menús quedan a tamaño normal, también dentro de visores
   que no avisan su zoom (como la app de Claude en el teléfono). Mientras se pellizca, la hoja solo se escala con una
   transformación alrededor del punto entre los dedos (rearmar el texto de un guion largo en cada cuadro daba saltos);
   al soltar cambia el tamaño de la letra y el desplazamiento se ajusta para que lo que estaba entre los dedos siga ahí.
   En el iPhone el navegador no hace su propio zoom de página: touch-action en el CSS y aquí preventDefault del toque
   con dos dedos y de los gesture* de Safari. La barra de arriba no se esconde por el gesto (pestanas.js · barsAutoHide).
   o: host() la pieza que se escala · anchors las piezas que sirven de ancla (la hoja, el párrafo) · reflow si el texto
   se reacomoda al ancho (el editor: de lado no hay que sostener nada) · get() / set(z) / min() / max() el zoom */
const barsHold = () => { if (typeof BARS_T !== 'undefined') BARS_T = Date.now(); };
function bindPinch(sc, o) {
  let G = null, raf = 0, settle = 0;
  const root = () => document.scrollingElement || document.documentElement;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const mid = t => [(t[0].clientX + t[1].clientX) / 2, (t[0].clientY + t[1].clientY) / 2];
  // la pieza bajo los dedos y dónde cae el punto dentro de ella (entre dos hojas, la más cercana)
  const anchorAt = (x, y) => {
    let el = document.elementFromPoint(x, y);
    el = el && el.closest && el.closest(o.anchors);
    if (!el || !sc.contains(el)) {
      el = null; let best = Infinity;
      for (const c of sc.querySelectorAll(o.anchors)) {
        const r = c.getBoundingClientRect(), d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
        if (d < best) { best = d; el = c; }
        if (r.top > y) break;
      }
    }
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { el, fx: (x - r.left) / (r.width || 1), fy: (y - r.top) / (r.height || 1) };
  };
  // dónde quedó el punto ancla respecto de los dedos (en px de la pantalla)
  const off = g => { const r = g.a.el.getBoundingClientRect(); return [o.reflow ? 0 : r.left + g.a.fx * r.width - g.m[0], r.top + g.a.fy * r.height - g.m[1]]; };
  const start = t => {
    const h = o.host(); if (!h) return;
    clearTimeout(settle); h.style.transition = ''; h.style.transform = '';
    const [mx, my] = mid(t), R = root();
    G = { h, d: Math.max(10, dist(t)), z: o.get(), k: 1, m0: [mx, my], m: [mx, my], s0: [sc.scrollLeft, sc.scrollTop],
      root: [R.scrollLeft, R.scrollTop], a: anchorAt(mx, my), o: [h.offsetLeft, h.offsetTop] };
    // mientras dura el gesto, lo que se puede desplazar no se achica (con la hoja escalada más chica, el navegador
    // correría el desplazamiento y la hoja saltaría)
    G.sp = document.createElement('i'); G.sp.className = 'pz-sp'; G.sp.setAttribute('aria-hidden', 'true');
    G.sp.style.left = (sc.scrollWidth - 1) + 'px'; G.sp.style.top = (sc.scrollHeight - 1) + 'px';
    sc.appendChild(G.sp);
    h.style.transformOrigin = '0 0'; h.style.willChange = 'transform';
    barsHold();
  };
  const frame = () => {
    raf = 0; if (!G) return;
    const { h, k } = G, r = sc.getBoundingClientRect(), cx = r.left + sc.clientLeft, cy = r.top + sc.clientTop;
    // el punto del contenido que estaba entre los dedos, escalado desde el rincón de la hoja, va a donde están ahora
    // (con el desplazamiento de este momento: si el navegador alcanzó a desplazar, se compensa)
    const ax = G.s0[0] + G.m0[0] - cx, ay = G.s0[1] + G.m0[1] - cy;
    const bx = sc.scrollLeft + G.m[0] - cx, by = sc.scrollTop + G.m[1] - cy;
    const tx = bx - G.o[0] - k * (ax - G.o[0]), ty = by - G.o[1] - k * (ay - G.o[1]);
    h.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${k.toFixed(4)})`;
    // la página entera no se mueve ni se esconde la barra de arriba
    const R = root(); if (R.scrollLeft !== G.root[0] || R.scrollTop !== G.root[1]) R.scrollTo(G.root[0], G.root[1]);
    barsHold();
  };
  const end = () => {
    const g = G; if (!g) return;
    G = null; cancelAnimationFrame(raf); raf = 0;
    g.sp.remove();
    g.h.style.transform = ''; g.h.style.willChange = '';
    const z = clamp(g.z * g.k, o.min(), o.max());
    if (Math.abs(z - g.z) > .002) o.set(z);
    if (g.a && g.a.el.isConnected) {
      const [dx, dy] = off(g); sc.scrollLeft += dx; sc.scrollTop += dy;
      // si un borde no deja (arriba del todo, la hoja más angosta que la pantalla), se acomoda deslizándose, sin salto
      const [ex, ey] = off(g);
      if (Math.abs(ex) > 1 || Math.abs(ey) > 1) {
        g.h.style.transition = 'none'; g.h.style.transform = `translate(${(-ex).toFixed(1)}px,${(-ey).toFixed(1)}px)`;
        g.h.getBoundingClientRect();
        g.h.style.transition = 'transform .18s ease-out'; g.h.style.transform = '';
        settle = setTimeout(() => { g.h.style.transition = ''; }, 240);
      }
    } else { const k = z / g.z; sc.scrollLeft = (g.s0[0] + g.m0[0]) * k - g.m[0]; sc.scrollTop = (g.s0[1] + g.m0[1]) * k - g.m[1]; }
    const R = root(); if (R.scrollLeft !== g.root[0] || R.scrollTop !== g.root[1]) R.scrollTo(g.root[0], g.root[1]);
    barsHold();
  };
  sc.addEventListener('touchstart', e => {
    if (e.touches.length < 2) return;
    // el segundo dedo: el navegador no desplaza ni hace zoom de página; el gesto es de la app
    if (e.cancelable) e.preventDefault();
    if (!G && e.touches.length === 2) start(e.touches);
  }, { passive: false });
  sc.addEventListener('touchmove', e => {
    if (!G || e.touches.length < 2) return;
    if (e.cancelable) e.preventDefault();
    G.k = clamp(G.z * dist(e.touches) / G.d, o.min(), o.max()) / G.z; G.m = mid(e.touches);
    if (!raf) raf = requestAnimationFrame(frame);
  }, { passive: false });
  const fin = e => { if (G && e.touches.length < 2) end(); };
  sc.addEventListener('touchend', fin); sc.addEventListener('touchcancel', fin);
  // Safari: el gesto de zoom del navegador no actúa sobre la hoja
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) sc.addEventListener(ev, e => e.preventDefault());
}
const ZOOM_MIN = .5, ZOOM_MAX = 4;
function fitPages() {
  const pages = $('#pages'), sc = $('#scroller');
  if (!pages || !sc) return;
  const w = sc.clientWidth - (typeof PHONE === 'function' && PHONE() ? 6 : 28);   // en el teléfono, la hoja al ancho
  // notas al margen (guion-margen.js): con espacio, en una columna al costado de la hoja; si no, una marca en el margen
  const mn = !!$('.mn-wrap', pages), side = mn && w >= 620;
  pages.classList.toggle('mn-side', side); pages.classList.toggle('mn-compact', mn && !side);
  const base = clamp(w / (side ? 51 + MN_GUT : 51), 6.5, 14);
  pages.style.setProperty('--fs', (base * UI.zoom).toFixed(2) + 'px');
  pages.style.setProperty('--pz', UI.zoom);   // en el teléfono la letra la pone el CSS; el zoom la multiplica
  if (mn) mnLayout();
}
/* el editor del guion: el pellizco agranda o achica la letra (la hoja sigue al ancho de la pantalla y el texto se
   reacomoda). En el iPhone la letra del editor no baja de 16 px (si no, el sistema agranda la página al escribir). */
const ED_ZMIN = () => typeof CSS !== 'undefined' && CSS.supports('-webkit-touch-callout', 'none') && matchMedia('(pointer:coarse)').matches ? 1 : .6;
function bindEdPinch() {
  const sc = $('#edScroll'); if (!sc) return;
  sc.style.setProperty('--ez', UI.edZoom || 1);
  bindPinch(sc, { host: () => $('#edHost'), anchors: '.ep, .ed-cover', reflow: true, min: ED_ZMIN, max: () => 3,
    get: () => UI.edZoom || 1, set: z => { UI.edZoom = z; sc.style.setProperty('--ez', z); } });
}

function tagsByPara() {
  const m = new Map();
  for (const t of P.tags) {
    if (t.p < 0 || !P.elements[t.el]) continue;
    if (UI.hidden.has(P.elements[t.el].cat)) continue;
    if (!m.has(t.p)) m.set(t.p, []);
    m.get(t.p).push(t);
  }
  return m;
}
function lineContent(ln, tbp) {
  const par = P.paras[ln.p];
  const a0 = ln.o, a1 = ln.o + ln.len;
  const tags = (tbp.get(ln.p) || []).filter(t => t.s < a1 && t.e > a0);
  // negrita, itálica, subrayado y resaltado del texto (guion-formato.js)
  const fr = typeof fmtOn === 'function' && fmtOn(par) ? fmtRuns(par, a0, a1).filter(r => r.f) : [];
  const fmt = (a, b) => { const html = esc(par.x.slice(a, b)); if (!fr.length) return html; const r = fr.find(q => q.a <= a && q.b >= b); return r ? `<span class="${fmtCls(r.f)}">${html}</span>` : html; };
  if (!tags.length || !LAYERS().tags) {
    if (!fr.length) return esc(par.x.slice(a0, a1));
    return fmtRuns(par, a0, a1).map(r => fmt(r.a, r.b)).join('');
  }
  const pts = new Set([a0, a1]);
  for (const r of fr) { pts.add(r.a); pts.add(r.b); }
  for (const t of tags) { pts.add(clamp(t.s, a0, a1)); pts.add(clamp(t.e, a0, a1)); }
  const arr = [...pts].sort((a, b) => a - b);
  let out = '';
  for (let i = 0; i < arr.length - 1; i++) {
    const a = arr[i], b = arr[i + 1];
    if (b <= a) continue;
    const seg = fmt(a, b);
    const cover = tags.filter(t => t.s <= a && t.e >= b);
    if (!cover.length) { out += seg; continue; }
    const el = P.elements[cover[0].el];
    const sug = cover.every(t => t.auto);
    // el guion no se traduce (data-no-tr): el nombre de la categoría sí, a mano
    const tip = trDone(cover.map(t => (EN ? tr(CAT[P.elements[t.el].cat].name) : CAT[P.elements[t.el].cat].name) + ': ' + P.elements[t.el].name).join(' · '));
    out += `<span class="tg${ea(sug ? ' sug' : '')}" style="--c:${ea(CAT[el.cat].color)}" data-t="${ea(cover.map(t => t.id).join(','))}" title="${esc(tip)}">${seg}</span>`;
  }
  return out;
}
function pagesHTML() {
  const tbp = tagsByPara();
  if (edFormat() === 'av') return avPagesHTML(tbp);
  const nums = edNumsOn();
  const firstOfScene = new Map(D.sc.scenes.map(s => [s.p0, s]));
  MN.items = mnOn() && !notesHidden() ? mnItems() : new Map(); MN.sig = mnOn() ? mnSigOf() : '';
  if (typeof anoPrep === 'function') anoPrep();   // anotaciones a mano (guion-anotar.js)
  return D.pages.map((pg, pi) => {
    let marks = '';
    const lines = pg.map((ln, li) => {
      if (ln.blank) return '<div class="ln blank"></div>';
      const s = firstOfScene.get(ln.p);
      if (s && s.ep && P.paras[s.p0].ep != null && D.pos[ln.p].pg0 === pi && D.pos[ln.p].li0 === li) marks += `<div class="epi-pg" data-no-tr>${esc(epLabel(P, s.ep).toUpperCase())}</div>`;   // primera página de un episodio
      if (s && D.pos[ln.p].pg0 === pi && D.pos[ln.p].li0 === li) marks += `<div class="scn${ea(nums ? '' : ' off')}" style="--i:${li}" id="scn-${ea(s.idx)}" data-si="${ea(s.idx)}" data-note="scene:${esc(s.key)}">${nums ? esc(s.key) : ''}</div>`;
      const up = ln.t === 'h' || ln.t === 'c' || ln.t === 'tr' || ln.t === 'sh';
      return `<div class="ln t-${ea(ln.t)}${ea(up ? ' up' : '')}" data-p="${ea(ln.p)}" data-o="${ea(ln.o)}" style="--ind:${ea(ln.ind)}">${lineContent(ln, tbp)}</div>`;
    }).join('');
    return `<div class="page${ea(LAYERS().tags ? '' : ' dim-tags')}" data-pg="${ea(pi)}"><div class="pgno">${pi > 0 || pageLabel(D.pages, 0) !== '1' ? esc(pageLabel(D.pages, pi)) + '.' : ''}</div>${marks}<div class="lines">${lines}</div>${coverageHTML(pi)}${typeof anoPageHTML === 'function' ? anoPageHTML(pi) : ''}${mnPageHTML(MN.items.get(pi))}</div>`;
  }).join('');
}
/* guion AV rayado: una tabla de dos columnas; cada celda es un párrafo marcable */
function avPagesHTML(tbp) {
  const nums = edNumsOn(), first = new Map(D.sc.scenes.map(s => [s.p0, s]));
  const cell = (i, cls) => { const x = P.paras[i].x; return `<div class="ln av-c ${ea(cls)}" data-p="${i}" data-o="0">${x ? lineContent({ p: i, o: 0, len: x.length }, tbp) : '<span class="hint">—</span>'}</div>`; };
  const rows = [];
  let n = 0;
  for (let i = 0; i < P.paras.length; i++) {
    const p = P.paras[i];
    if (p.t === 'h') { const s = first.get(i); rows.push(`<div class="av-rh" ${s ? `id="scn-${ea(s.idx)}" data-si="${ea(s.idx)}" data-note="scene:${esc(s.key)}"` : ''}><span class="scn-k">${nums && s ? esc(s.key) : ''}</span>${cell(i, 't-h up')}</div>`); continue; }
    const u = p.t === 'v' && P.paras[i + 1] && P.paras[i + 1].t === 'u' ? i + 1 : -1;
    rows.push(`<div class="av-rr"><span class="av-n tnum">${++n}</span>${cell(i, 't-v')}${u >= 0 ? cell(u, 't-u') : '<div></div>'}<span class="av-d tnum">${esc(p.dur || '')}</span></div>`);
    if (u >= 0) i = u;
  }
  return `<div class="page av-page${ea(LAYERS().tags ? '' : ' dim-tags')}"><div class="av-head"><span>#</span><span>Video</span><span>Audio</span><span>Dur.</span></div>${rows.join('')}</div>`;
}
function coverageHTML(pi) {
  if (!LAYERS().cov) return '';
  let out = '';
  for (const sh of Object.values(P.shots)) {
    if (sh.p0 == null || !D.code[sh.id]) continue;
    const a = D.pos[sh.p0], b = D.pos[sh.p1];
    if (!a || !b || pi < a.pg0 || pi > b.pg1) continue;
    const from = pi === a.pg0 ? a.li0 : 0;
    const to = pi === b.pg1 ? b.li1 : D.pages[pi].length - 1;
    const st = pi === a.pg0, en = pi === b.pg1;
    // la línea va sobre el texto (no tapa la selección); el número, arriba, es lo que se toca para abrir el plano
    out += `<div class="cv${ea(st ? ' st' : ' cont')}${ea(en ? ' en' : '')}${ea(sh.done ? ' done' : '')}" data-act="shot" data-id="${ea(sh.id)}" style="--lane:${ea(D.lanes[sh.id] || 0)};--n:${ea(D.laneN[sh.id] || 1)};--a:${ea(from)};--b:${ea(to)}"><span class="cvl" title="Plano ${ea(D.code[sh.id])} · ${esc(shotLabel(sh))}${st ? '' : ' (sigue)'}">${esc(D.code[sh.id])}</span></div>`;
  }
  return out;
}
function shotLabel(sh) { return [sh.size, sh.angle && sh.angle !== 'Normal' ? sh.angle : '', sh.move && sh.move !== 'Fijo' ? sh.move : ''].filter(Boolean).join(' · ') || 'Sin datos'; }

function inspectorHTML() {
  const s = D.sc.scenes[UI.scene];
  if (!s) return '<p class="hint">El guion no tiene escenas.</p>';
  const meta = P.scenes[s.key] || {};
  const shots = D.shotsBy[s.key] || [];
  const els = [...D.sem[s.idx]].map(id => P.elements[id]).filter(Boolean);
  const byCat = CATS.map(c => [c, els.filter(e => e.cat === c.id)]).filter(x => x[1].length);
  return `
    <div class="hd ins-hd">${hdHead({ md: true, title: `Escena ${esc(s.key)}`, step: hdStep(s.idx > 0 ? `data-act="goto" data-i="${s.idx - 1}"` : null, s.idx < D.sc.scenes.length - 1 ? `data-act="goto" data-i="${s.idx + 1}"` : null, 'escena'),
      sub: `Página ${D.metrics.page[s.idx]} · ${fmtEighths(D.metrics.eighths[s.idx])} págs.`, act: '<button class="btn ghost sm drawer-close" data-act="close-drawer">Cerrar</button>' })}
      <h2 class="sch ins-sl">${esc(s.heading)}</h2>
      <div class="badges">${ieBadge(s)}${s.tod && !/^(D[IÍ]A|NOCHE)$/.test(s.tod) ? `<span class="badge">${esc(s.tod)}</span>` : ''}</div></div>
    <label class="hd-tx ins-syn"><span>Sinopsis</span><textarea rows="3" data-bind="synopsis" data-key="${esc(s.key)}" placeholder="${esc(synopsisOf({ ...s, key: '__' }))}">${esc(meta.synopsis || '')}</textarea></label>
    <section><h3 class="ih">Planos <span class="count">${shots.length}</span></h3>
      ${shots.map(sh => `<button class="shotrow${ea(sh.done ? ' done' : '')}" data-act="shot" data-id="${ea(sh.id)}"><span class="code">${esc(D.code[sh.id])}</span><span><span class="meta">${esc(shotLabel(sh))}${sh.lens ? ' · ' + esc(sh.lens) + 'mm' : ''}</span><span class="d">${esc(sh.desc || shotTextExcerpt(sh, 90) || 'Sin descripción')}</span></span>${sh.done ? '<span class="rod">Rodado</span>' : ''}</button>`).join('') || '<p class="hint" style="margin:0">Aún no hay planos. Selecciona texto y elige «Plano», o usa una de estas opciones.</p>'}
      <div style="display:flex;flex-wrap:wrap;gap:6px"><button class="btn sm" data-act="shot-scene">+ Plano de toda la escena</button>${shots.length ? '' : '<button class="btn sm" data-act="suggest">Sugerir planos</button>'}</div>
    </section>
    <section><h3 class="ih">Desglose <span class="count">${els.length}</span></h3>
      ${byCat.map(([c, list]) => `<div class="bdcat" style="--c:${ea(c.color)}"><div class="ttl"><span class="dot" style="--c:${ea(c.color)}"></span>${c.name}</div><div class="chips">${list.map(e => `<span class="chip${ea(e.auto ? ' sug' : '')}">${esc(e.name)}</span>`).join('')}</div></div>`).join('') || '<p class="hint" style="margin:0">Sin elementos marcados.</p>'}
    </section>
    ${tipHTML('guion-sel', 'Selecciona texto en el guion para marcarlo o crear un plano. Toca una marca para cambiarla.')}`;
}
function ieBadge(s) {
  const cls = s.dn === 'N' ? 'n' : (s.ie === 'EXT' ? 'ext' : '');
  return `<span class="badge ${ea(cls)}">${esc(s.ie)} · ${s.dn === 'N' ? 'NOCHE' : 'DÍA'}</span>`;
}
function refreshInspector() { const i = $('#insp'); if (i) { const open = i.classList.contains('open'); i.innerHTML = inspectorHTML(); if (open) i.classList.add('open'); } }
function refreshPages() {
  const pages = $('#pages');
  if (!pages) return;
  pages.innerHTML = pagesHTML();
  fitPages();
}

/* ---------- interacción con el texto ---------- */
let SEL = null;
function bindScript() {
  const sc = $('#scroller');
  sc.addEventListener('scroll', debounce(trackScene, 120));
  const av = edFormat() === 'av';   // el guion AV rayado: el texto se reacomoda al ancho, el ancla es la fila
  bindPinch(sc, { host: () => $('#pages'), anchors: av ? '.av-rr, .av-rh' : '.page', reflow: av, min: () => ZOOM_MIN, max: () => ZOOM_MAX,
    get: () => UI.zoom, set: z => { UI.zoom = z; fitPages(); } });
  const pages = $('#pages');
  mnBind(pages);
  if (typeof anoBind === 'function') anoBind(pages);   // anotar a mano (guion-anotar.js)
  pages.addEventListener('click', e => {
    const tg = e.target.closest('.tg');
    if (tg && LAYERS().tags) {
      const s = getSelection();
      if (s && !s.isCollapsed && s.toString().trim()) return;
      tagPopover(tg, tg.dataset.t.split(','));
    }
  });
}
document.addEventListener('selectionchange', debounce(onSelection, 160));
function trackScene() {
  const sc = $('#scroller');
  if (!sc) return;
  const top = sc.getBoundingClientRect().top + 80;
  let cur = -1;
  for (const m of $$('[data-si]', sc)) { if (m.getBoundingClientRect().top <= top) cur = +m.dataset.si; else break; }
  if (cur < 0) cur = 0;
  if (cur !== UI.scene) {
    UI.scene = cur;
    refreshInspector();
    $$('#slist button').forEach(b => b.setAttribute('aria-current', +b.dataset.i === cur ? 'true' : 'false'));
    const btn = $('.bar .for-insp');
    if (btn && D.sc.scenes[cur]) btn.textContent = 'Escena ' + D.sc.scenes[cur].key;
  }
}
function gotoScene(i) {
  UI.scene = i;
  const m = $('#scn-' + i), sc = $('#scroller');
  if (m && sc) sc.scrollTop += m.getBoundingClientRect().top - sc.getBoundingClientRect().top - 24;
  refreshInspector();
  $$('#slist button').forEach(b => b.setAttribute('aria-current', +b.dataset.i === i ? 'true' : 'false'));
}
function pointToPO(node, off) {
  let el = node && (node.nodeType === 1 ? node : node.parentElement);
  const ln = el && el.closest && el.closest('.ln');
  if (!ln || ln.classList.contains('blank') || ln.dataset.p == null) return null;
  const r = document.createRange();
  r.setStart(ln, 0);
  try { r.setEnd(node, off); } catch (e) { return null; }
  return { p: +ln.dataset.p, o: +ln.dataset.o + r.toString().length };
}
function onSelection() {
  if (UI.tab !== 'lined') return;
  const s = getSelection();
  const pages = $('#pages');
  if (!s || s.isCollapsed || !pages || !s.rangeCount) { if (!$('#seltool:hover') && Date.now() - SELT_TOUCH > 700) hideSelTool(); return; }
  const r = s.getRangeAt(0);
  if (!pages.contains(r.commonAncestorContainer)) { hideSelTool(); return; }
  let a = pointToPO(r.startContainer, r.startOffset), b = pointToPO(r.endContainer, r.endOffset);
  if (!a || !b) {
    // el rango empieza o termina fuera de una línea: buscar las líneas incluidas
    const lns = $$('.ln[data-p]', pages).filter(l => r.intersectsNode(l));
    if (!lns.length) { hideSelTool(); return; }
    if (!a) a = { p: +lns[0].dataset.p, o: +lns[0].dataset.o };
    if (!b) { const l = lns[lns.length - 1]; b = { p: +l.dataset.p, o: +l.dataset.o + l.textContent.length }; }
  }
  if (a.p > b.p || (a.p === b.p && a.o > b.o)) [a, b] = [b, a];
  if (a.p === b.p) {
    const x = P.paras[a.p].x;
    while (a.o < b.o && /\s/.test(x[a.o])) a.o++;
    while (b.o > a.o && /\s|[.,;:]/.test(x[b.o - 1])) b.o--;
    if (b.o <= a.o) { hideSelTool(); return; }
  }
  SEL = { a, b, text: a.p === b.p ? P.paras[a.p].x.slice(a.o, b.o) : '' };
  if (MK.cat && a.p === b.p && !selSheet() && canEditCat(MK.cat)) {
    if (UI.pdown) { MK.pending = true; return; }   // se marca al soltar el botón
    addTagFromSel(MK.cat); return;
  }
  showSelTool(r.getBoundingClientRect());
}
/* ---------- marcador: una categoría elegida y cada selección queda marcada en ella ---------- */
const MK = { cat: null, pending: false, tipT: 0 };
const mkCats = () => CATS.filter(c => typeof canEditCat !== 'function' || canEditCat(c.id));
function mkBtnHTML() {
  const c = MK.cat && CAT[MK.cat];
  return `<button class="btn mk-btn hide-sm${c ? ' on' : ''}" data-act="mk" aria-haspopup="menu" aria-pressed="${ea(!!c)}" style="--mkc:${ea(c ? c.color : 'transparent')};--mkink:${ea(c ? mkInk(c.color) : 'inherit')}" title="Marcador: elige una categoría y resalta en el guion. Alt + rueda del ratón cambia de categoría; Esc lo apaga.">${MK_SVG}<span class="mk-n">${c ? esc(c.name) : 'Marcador'}</span>${ICO.chev}</button>`;
}
// el resaltador: un solo trazo (cuerpo con punta biselada) y la raya que deja
const MK_SVG = '<svg class="mk-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3.5 20.5 9 11 18.5H6.5L5 17v-4.5z"/><path d="M4 21.5h8"/></svg>';
/* la letra sobre el color de la categoría: oscura en los claros, blanca en los oscuros */
function mkInk(hex) {
  const h = String(hex || '').replace('#', ''); if (h.length < 6) return '#1A1A1A';
  const L = [0, 2, 4].map(i => { const v = parseInt(h.slice(i, i + 2), 16) / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
  const Y = .2126 * L[0] + .7152 * L[1] + .0722 * L[2];
  return (Y + .05) / (.0103 + .05) >= 1.05 / (Y + .05) ? '#1A1A1A' : '#FFFFFF';   // la de más contraste
}
/* el puntero del marcador: la flechita de siempre, solo con el color de la categoría */
function mkCursor(col) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M4 2.6 19 13.4l-6.7 1.1-3.9 6.4z" fill="${col}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 4 3, default`;
}
function mkPaint() {
  const c = MK.cat && CAT[MK.cat], pages = $('#pages');
  document.body.classList.toggle('mk-on', !!c && UI.tab === 'lined');
  if (pages) pages.style.cursor = c && UI.tab === 'lined' ? mkCursor(c.color) : '';
  const b = $('#view .mk-btn'); if (b) b.outerHTML = mkBtnHTML();
}
function mkSet(cat, silent) {
  MK.cat = cat && CAT[cat] ? cat : null;
  if (MK.cat) { ls.set('markerLast', MK.cat); if (!UI.mode.tags) { UI.mode.tags = true; refreshPages(); const t = $('[data-act="mode"][data-m="tags"]'); if (t) t.setAttribute('aria-pressed', 'true'); } }
  hideSelTool();
  mkPaint();
  if (!silent && MK.cat) toast(`Marcador: ${CAT[MK.cat].name}. Selecciona texto en el guion para marcarlo.`, 3200);
}
function mkTip(x, y) {
  const c = MK.cat && CAT[MK.cat]; if (!c) return;
  let t = $('#mkTip');
  if (!t) { t = document.createElement('div'); t.id = 'mkTip'; t.className = 'mk-tip'; t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  t.style.setProperty('--c', c.color); t.style.setProperty('--ink', mkInk(c.color));
  t.textContent = c.name;
  t.style.left = Math.min(innerWidth - 220, x + 26) + 'px'; t.style.top = Math.min(innerHeight - 40, y + 10) + 'px';
  t.classList.add('on'); clearTimeout(MK.tipT); MK.tipT = setTimeout(() => t.classList.remove('on'), 900);
}
function mkMenu(btn) {
  const L = mkCats();
  popover(btn, `<h5>Marcador</h5><p class="hint" style="margin:0 0 8px">Elige la categoría y selecciona texto en el guion: queda marcado al soltar. Alt + rueda del ratón cambia de categoría.</p>
    <div class="menu mk-menu">${L.map(c => `<button data-cat="${ea(c.id)}" aria-pressed="${ea(MK.cat === c.id)}"><i class="mk-sw" style="--c:${ea(c.color)}"></i>${esc(c.name)}</button>`).join('')}</div>
    ${MK.cat ? '<button class="btn sm" data-off style="margin-top:8px">Apagar el marcador <kbd>Esc</kbd></button>' : ''}`, p => p.addEventListener('click', e => {
    const b = e.target.closest('[data-cat],[data-off]'); if (!b) return;
    closePop(); mkSet(b.dataset.cat || null);
  }));
}
// soltar el botón después de seleccionar con el marcador: ahí se marca
document.addEventListener('pointerup', () => { if (MK.pending) { MK.pending = false; setTimeout(onSelection, 0); } }, true);
// Esc apaga el marcador (si no hay un menú o una ventana abierta)
addEventListener('keydown', e => { if (e.key === 'Escape' && MK.cat && UI.tab === 'lined' && !$('#pop') && !$('#modal') && !$('#ask')) { mkSet(null); } });
// Alt + rueda sobre el guion: la categoría siguiente o la anterior (si estaba apagado, se enciende)
addEventListener('wheel', e => {
  if (!e.altKey || UI.tab !== 'lined' || UI.readOnly || !e.target.closest || !e.target.closest('#scroller')) return;
  e.preventDefault();
  const L = mkCats(); if (!L.length) return;
  const now = Date.now(); if (now - (MK.wheelT || 0) < 70) return; MK.wheelT = now;
  const cur = MK.cat || ls.get('markerLast', null);
  let i = L.findIndex(c => c.id === cur);
  if (!MK.cat && i >= 0) i -= Math.sign(e.deltaY || 1);   // el primer giro enciende el último que se usó
  i = ((i < 0 ? -1 : i) + Math.sign(e.deltaY || 1) + L.length) % L.length;
  mkSet(L[i].id, true);
  mkTip(e.clientX, e.clientY);
}, { passive: false, capture: true });
/* con el guion ampliado con los dedos (zoom del navegador), la barra se dibuja dentro de lo que
   se ve y a tamaño normal de pantalla: el visor visual manda, no la ventana del diseño */
const vvZoom = () => { const v = window.visualViewport; return v && v.scale > 1.04 ? v : null; };
const selSheet = () => matchMedia('(max-width:760px), (pointer:coarse)').matches || !!vvZoom();
let SELT_TOUCH = 0, SELT_RAF = 0;
function showSelTool(rect) {
  let t = $('#seltool');
  const single = SEL.a.p === SEL.b.p;
  if (!t) {
    t = document.createElement('div');
    t.id = 'seltool'; t.className = 'seltool';
    t.addEventListener('pointerdown', e => { SELT_TOUCH = Date.now(); e.preventDefault(); });
    t.addEventListener('touchstart', () => { SELT_TOUCH = Date.now(); }, { passive: true });
    t.addEventListener('mousedown', e => e.preventDefault());
    t.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || !SEL) return;
      if (b.dataset.cat) addTagFromSel(b.dataset.cat);
      if (b.dataset.shot != null) shotFromSel();
      if (b.dataset.mnote != null) mnFromSel();
      if (b.dataset.close != null) { hideSelTool(); getSelection().removeAllRanges(); }
    });
    document.body.appendChild(t);
  }
  const cats = CATS.filter(c => canEditCat(c.id)).sort((x, y) => (y.id === MK.cat) - (x.id === MK.cat));   // jefe de área: solo sus categorías; la del marcador, primero
  const sheet = selSheet();
  // una nota al margen que señala lo elegido (guion-margen.js)
  const nb = mnOn() && typeof canWriteNotes === 'function' && canWriteNotes() ? `<button class="btn ghost sm" data-mnote title="Una nota al margen, con la fecha, que señala lo elegido">${NOTE_BUBBLE} Nota</button>` : '';
  t.classList.toggle('sheet', sheet);
  if (sheet) {
    // en el teléfono: hoja abajo con el texto elegido y las categorías con su nombre completo
    const q = SEL.text ? SEL.text.replace(/\s+/g, ' ').trim() : '';
    t.innerHTML = `<div class="st-head"><span class="st-q">${single ? (q ? '«' + esc(q.length > 40 ? q.slice(0, 39) + '…' : q) + '»' : '') + (cats.length ? ' · elige la categoría' : '') : 'Varios párrafos'}</span>
      <button class="btn primary sm" data-shot>+ Plano</button>${nb}<button class="btn ghost sm" data-close aria-label="Cerrar">${ICO.close}</button></div>
      ${single && cats.length ? `<div class="cats">${cats.map(c => `<button data-cat="${ea(c.id)}" style="--c:${ea(c.color)}"><span class="dot"></span><span class="nm">${esc(c.name)}</span></button>`).join('')}</div>` : ''}`;
  } else {
    t.innerHTML = `${single && cats.length ? `<div class="cats">${cats.map(c => `<button data-cat="${ea(c.id)}" style="--c:${ea(c.color)}" title="${ea(c.name)}"><span class="dot"></span>${c.short}</button>`).join('')}</div><span class="sep"></span>` : single ? '' : '<span class="hint" style="padding:0 4px">Varios párrafos</span>'}
    <button class="btn primary sm" data-shot>+ Plano</button>${nb}<button class="btn ghost sm" data-close aria-label="Cerrar">${ICO.close}</button>`;
  }
  placeSelTool(rect);
}
function placeSelTool(rect) {
  const t = $('#seltool'); if (!t) return;
  if (!rect) { const s = getSelection(); if (s && s.rangeCount && !s.isCollapsed) rect = s.getRangeAt(0).getBoundingClientRect(); }
  const vv = vvZoom();
  t.classList.toggle('zoomed', !!vv);
  if (vv) {
    // la barra mide lo que mide la pantalla y se reduce con el zoom: se ve igual que sin ampliar
    const k = vv.scale, sw = vv.width * k, w = Math.min(560, sw - 16);
    t.style.setProperty('--zw', w + 'px');
    t.style.setProperty('--zs', 1 / k);
    const h = t.offsetHeight / k, bottom = vv.offsetTop + vv.height - h - 10 / k;
    // si tapa el texto elegido, sube arriba de lo que se ve
    const up = rect && rect.bottom > bottom - 6 / k && rect.top > vv.offsetTop + h + 16 / k;
    t.style.setProperty('--zx', (vv.offsetLeft + (vv.width - w / k) / 2) + 'px');
    t.style.setProperty('--zy', (up ? vv.offsetTop + 10 / k : bottom) + 'px');
    return;
  }
  if (t.classList.contains('sheet')) {   // en el teléfono queda fija abajo (CSS), o arriba si tapa el texto
    t.classList.toggle('top', !!rect && rect.bottom > innerHeight - t.offsetHeight - 24 && rect.top > t.offsetHeight + 90);
    return;
  }
  if (!rect) return;
  const w = t.offsetWidth, h = t.offsetHeight;
  let x = clamp(rect.left + rect.width / 2 - w / 2, 12, innerWidth - w - 12);
  let y = rect.top - h - 10;
  if (y < 60) y = rect.bottom + 10;
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
if (window.visualViewport) {
  const follow = () => { cancelAnimationFrame(SELT_RAF); SELT_RAF = requestAnimationFrame(() => { if ($('#seltool')) placeSelTool(); }); };
  visualViewport.addEventListener('resize', follow);
  visualViewport.addEventListener('scroll', follow);
}
function hideSelTool() { const t = $('#seltool'); if (t) t.remove(); }

function addTagFromSel(cat) {
  if (!SEL || SEL.a.p !== SEL.b.p || UI.readOnly || !canEditCat(cat)) return;
  const { a, b } = SEL;
  let name = SEL.text.replace(/\s+/g, ' ').trim();
  if (cat === 'cast') name = normCue(name);
  else if (name === name.toUpperCase() && name.length > 3) name = titleCase(name);
  else name = name.charAt(0).toUpperCase() + name.slice(1);
  const el = ensureElement(P, cat, name, false);
  el.auto = false;
  P.tags = P.tags.filter(t => !(t.p === a.p && t.s === a.o && t.e === b.o));
  P.tags.push({ id: uid('t'), el: el.id, p: a.p, s: a.o, e: b.o });
  getSelection().removeAllRanges();
  hideSelTool();
  afterTagChange();
  toastUndo(`${CAT[cat].name}: ${name}`, 3500);
}
function afterTagChange() {
  changed('data');
  const sc = D.sc;
  D.sem = sceneElementMap(P, sc);
  D.castNum = castNumbers(P, sc, D.sem);
  if (UI.tab === 'lined') { refreshPages(); refreshInspector(); }
  else render();
}
/* ¿puede cambiar esta marca? (solo lectura, o un jefe de área con una categoría que no es de sus cajas: no) */
const tagCanEdit = el => !UI.readOnly && !!el && (typeof canEditCat !== 'function' || canEditCat(el.cat));
function tagPopover(anchor, ids) {
  const tags = ids.map(id => P.tags.find(t => t.id === id)).filter(t => t && P.elements[t.el]);
  if (!tags.length) return;
  popover(anchor, tags.map(t => {
    const el = P.elements[t.el], cat = CAT[el.cat] || CAT.misc || { name: el.cat, color: '#999' };
    const n = P.tags.filter(x => x.el === el.id).length;
    // sin permiso: solo se ve qué es (antes se podía cambiar o quitar y el cambio se perdía al recargar)
    if (!tagCanEdit(el)) return `<div style="display:grid;gap:6px" data-tag="${ea(t.id)}">
      <h5 style="display:flex;gap:6px;align-items:center"><span class="dot" style="--c:${ea(cat.color)}"></span>${esc(el.name)}</h5>
      <p class="hint" style="margin:0 6px 4px">${esc(cat.name)}${n > 1 ? ` · ${n} marcas` : ''}</p></div>`;
    return `<div style="display:grid;gap:6px" data-tag="${ea(t.id)}">
      <h5 style="display:flex;gap:6px;align-items:center"><span class="dot" style="--c:${ea(cat.color)}"></span>${esc(el.name)}${t.auto ? ' <span class="count">· sugerido</span>' : ''}</h5>
      <label class="fld"><span>Categoría${n > 1 ? ` · cambia sus ${n} marcas` : ''}</span><select data-f="cat" aria-label="Categoría">${CATS.map(c => `<option value="${ea(c.id)}"${c.id === el.cat ? ' selected' : ''}${typeof canEditCat === 'function' && !canEditCat(c.id) ? ' disabled' : ''}>${c.name}</option>`).join('')}</select></label>
      <div class="menu">
        ${t.auto ? '<button data-f="ok">Confirmar marca</button>' : ''}
        <button data-f="del">Quitar esta marca</button>
        ${n > 1 ? `<button data-f="delall" style="color:var(--bad)">Quitar las ${n} marcas de «${esc(el.name)}»</button>` : ''}
      </div></div>`;
  }).join('<hr style="border:0;border-top:1px solid var(--line);margin:2px 0">'), p => {
    p.addEventListener('change', e => {
      const box = e.target.closest('[data-tag]');
      const t = P.tags.find(x => x.id === box.dataset.tag);
      if (!t || e.target.dataset.f !== 'cat') return;
      const old = P.elements[t.el], to = e.target.value;
      if (!old || !CAT[to] || to === old.cat || !tagCanEdit(old) || (typeof canEditCat === 'function' && !canEditCat(to))) return;
      // el mismo elemento cambia de categoría (sus fotos, su ficha, su papel en el casting, la hoja de llamado, los planos
      // y el presupuesto siguen con él); si ya había uno con ese nombre en la otra categoría, se unen (como en el desglose)
      const twin = Object.values(P.elements).find(x => x.id !== old.id && x.cat === to && deaccent(x.name.toLowerCase()) === deaccent(old.name.toLowerCase()));
      const nn = P.tags.filter(x => x.el === old.id).length;
      histNote(`Cambiar la categoría de «${old.name}»`);
      P.tags.forEach(x => { if (x.el === old.id) { if (twin) x.el = twin.id; x.auto = false; } });
      if (twin) { twin.auto = false; delete P.elements[old.id]; } else { old.cat = to; old.auto = false; }
      closePop(); afterTagChange();
      toastUndo(twin ? `«${titleCase(old.name)}» se unió a «${titleCase(twin.name)}» en ${CAT[to].name}.` : nn > 1 ? `«${titleCase(old.name)}» pasó a ${CAT[to].name}, con sus ${nn} marcas.` : `«${titleCase(old.name)}» pasó a ${CAT[to].name}.`);
    });
    p.addEventListener('click', e => {
      const b = e.target.closest('button[data-f]');
      if (!b) return;
      const box = b.closest('[data-tag]');
      const t = P.tags.find(x => x.id === box.dataset.tag);
      if (!t || !tagCanEdit(P.elements[t.el])) return;
      const nm = titleCase(P.elements[t.el].name), nn = P.tags.filter(x => x.el === t.el).length;
      if (b.dataset.f !== 'ok') histNote(b.dataset.f === 'del' ? 'Quitar una marca' : `Quitar las marcas de «${nm}»`);
      if (b.dataset.f === 'ok') { t.auto = false; P.elements[t.el].auto = false; }
      if (b.dataset.f === 'del') P.tags = P.tags.filter(x => x.id !== t.id);
      if (b.dataset.f === 'delall') { const id = t.el; P.tags = P.tags.filter(x => x.el !== id); delete P.elements[id]; }
      pruneElements();
      closePop(); afterTagChange();
      if (b.dataset.f === 'del') toastUndo(nn > 1 ? `Marca de «${nm}» quitada.` : `«${nm}» ya no está en el desglose.`);
      if (b.dataset.f === 'delall') toastUndo(`Quitadas las ${nn} marcas: «${nm}» ya no está en el desglose.`);
    });
  });
}
function pruneElements() {
  const used = new Set(P.tags.map(t => t.el));
  for (const id of Object.keys(P.elements)) if (!used.has(id)) delete P.elements[id];
}

/* ---------- acciones compartidas de la vista ---------- */
const ACT = {
  import: () => { if (scriptLock() && P.paras.length) { toast('El guion está cerrado: para cambiarlo, abre una revisión desde «Guion cerrado».', 4500); return; } pickFile(SCRIPT_ACCEPT, P.paras.length && !P._sample ? 'version' : 'import'); },   // con guion: «otra versión» del mismo
  goto: b => { gotoScene(+b.dataset.i); closeDrawers(); },
  drawer: b => openDrawer(b.dataset.d),
  'close-drawer': () => closeDrawers(),
  mk: b => mkMenu(b),
  mode: b => { UI.mode[b.dataset.m] = !UI.mode[b.dataset.m]; b.setAttribute('aria-pressed', UI.mode[b.dataset.m]); refreshPages(); },
  zoom: b => { UI.zoom = clamp(UI.zoom * (+b.dataset.z > 0 ? 1.15 : 1 / 1.15), ZOOM_MIN, ZOOM_MAX); fitPages(); },
  'cat-toggle': b => { const c = b.dataset.c; UI.hidden.has(c) ? UI.hidden.delete(c) : UI.hidden.add(c); b.setAttribute('aria-pressed', !UI.hidden.has(c)); refreshPages(); },
  shot: b => openShot(b.dataset.id),
  'shot-scene': b => { const s = D.sc.scenes[b.dataset.i != null ? +b.dataset.i : UI.scene]; if (s) newShot(s, s.p0 + 1 < s.p1 ? s.p0 + 1 : s.p0, s.p1 - 1, { size: 'PG' }, true); },
  suggest: b => { const s = D.sc.scenes[b.dataset.i != null ? +b.dataset.i : UI.scene]; if (s) suggestShots(s); },
  pdf: b => exportPDF(b.dataset.k, b),
};
Object.assign(ACT, BARRA_ACT);
function bindView() {
  const v = $('#view');
  if (v._bound) return;
  v._bound = true;
  v.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || !v.contains(b)) return;
    const f = ACT[b.dataset.act];
    if (f) { e.preventDefault(); f(b, e); }
  });
  v.addEventListener('input', e => { const el = e.target.closest('[data-bind]'); if (el && BIND[el.dataset.bind]) BIND[el.dataset.bind](el, 'input'); });
  v.addEventListener('change', e => { const el = e.target.closest('[data-bind]'); if (el && BIND[el.dataset.bind]) BIND[el.dataset.bind](el, 'change'); });
}
const BIND = {
  synopsis: (el, ev) => { const k = el.dataset.key; P.scenes[k] = P.scenes[k] || {}; P.scenes[k].synopsis = el.value; changed('data'); },
};

/* ---------- planos (compartido con storyboard y hoja de script) ---------- */
function newShot(s, p0, p1, fields = {}, open = true) {
  const list = D.shotsBy[s.key] || [];
  const sh = {
    id: uid('s'), sc: s.key, ord: (list.length ? list[list.length - 1].ord : 0) + 1,
    p0: p0 != null ? clamp(p0, s.p0, s.p1 - 1) : null, p1: p1 != null ? clamp(p1, s.p0, s.p1 - 1) : null,
    size: 'PM', angle: 'Normal', move: 'Fijo', lens: '', support: '', dur: '', desc: '', chars: [], notes: '', done: false, ...fields,
  };
  if (!fields.chars) {
    const castIds = sceneCast(s.idx).map(e => e.id);
    sh.chars = castIds.filter(id => P.tags.some(t => t.el === id && t.p >= (sh.p0 ?? s.p0) && t.p <= (sh.p1 ?? s.p1)) ||
      (sh.p0 != null && P.paras.slice(sh.p0, sh.p1 + 1).some(p => p.t === 'c' && normCue(p.x) === P.elements[id].name)));
  }
  P.shots[sh.id] = sh;
  changed('data');
  derive();
  if (open === 'quiet') { if (UI.tab === 'lined') { refreshPages(); refreshInspector(); } else render(); }   // sin salir del guion
  else if (open) openShot(sh.id, true);
  else render();
  return sh;
}
function shotFromSel() {
  if (!SEL || UI.readOnly) return;
  const si = D.sc.sceneOf[SEL.a.p];
  if (si < 0) { toast('Esa parte del guion no pertenece a ninguna escena.'); return; }
  const s = D.sc.scenes[si];
  const p1 = Math.min(SEL.b.p, s.p1 - 1);
  getSelection().removeAllRanges();
  hideSelTool();
  const text = SEL.text || P.paras.slice(SEL.a.p, p1 + 1).map(p => p.x).join(' ');
  quickShotDialog(s, SEL.a.p, p1, text);
  return text;
}
/* plano rápido desde el guion: escala, ángulo y movimiento, y se sigue marcando.
   La cámara y las figuras se arman solas en 3D; los ajustes finos, luego en el storyboard. */
function quickShotDialog(s, p0, p1, text) {
  const F = { size: 'PM', angle: 'Normal', move: 'Fijo', support: '', ...ls.get('quickShot', {}) };
  const szName = k => (SIZES.find(x => x[0] === k) || [k, k])[1];
  // todo el plano en una línea (escala, ángulo, movimiento y soporte), la descripción en otra y un check para agregarlo
  const OPTS = {
    size: ['Escala', SIZES.map(([k, n]) => [k, n])],
    angle: ['Ángulo', ANGLES.map(a => [a, a === 'Normal' ? 'Ángulo normal' : a])],
    move: ['Movimiento', MOVES.map(a => [a, a === 'Fijo' ? 'Cámara fija' : a])],
    support: ['Soporte', [['', 'Sin soporte'], ...SUPPORTS.map(a => [a, a])]],
  };
  const sel = f => { const [lab, list] = OPTS[f]; return `<select class="qs-sel" data-f="${ea(f)}" aria-label="${ea(lab)}" title="${ea(lab)}">${list.map(([v, n]) => `<option value="${esc(v)}" ${F[f] === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}${list.some(([v]) => v === F[f]) ? '' : `<option selected value="${esc(F[f])}">${esc(F[f])}</option>`}</select>`; };
  const q = String(text || '').replace(/\s+/g, ' ').trim();
  const m = modal({
    title: `Nuevo plano · Esc. ${s.key}`,
    body: `<div class="qs-line">${['size', 'angle', 'move', 'support'].map(sel).join('')}</div>
      <div class="qs-line qs-l2"><input type="text" id="qsDesc" placeholder="Descripción (opcional)" aria-label="Descripción del plano" autocomplete="off">
        <button class="qs-3d" id="qs3d" type="button" title="Agregar y abrir su espacio 3D para ajustar cámara y figuras" aria-label="Agregar y abrir en 3D">3D</button>
        <button class="qs-ok" id="qsOk" type="button" title="Agregar el plano (Intro)" aria-label="Agregar el plano"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></button></div>`,
  });
  m.classList.add('qs-modal');
  if (q) { const h = $('header h2', m); h.insertAdjacentHTML('beforeend', ` <small class="qs-x" title="${esc(q)}">«${esc(q)}»</small>`); }
  m.addEventListener('change', e => { const x = e.target.closest('.qs-sel'); if (x) F[x.dataset.f] = x.value; });
  const go = open3d => {
    if (!P || !D.sc.scenes[s.idx]) return;
    ls.set('quickShot', { size: F.size, angle: F.angle, move: F.move, support: F.support });
    const desc = $('#qsDesc', m).value.trim();
    closeModal();
    const sh = newShot(s, p0, p1, { size: F.size, angle: F.angle, move: F.move, support: F.support, desc }, open3d ? true : 'quiet');
    if (!open3d) toast(`✓ Plano ${D.code[sh.id] || ''} agregado a la escena ${s.key}: ${szName(F.size).toLowerCase()}${F.angle !== 'Normal' ? ', ' + F.angle.toLowerCase() : ''}${F.move !== 'Fijo' ? ', ' + F.move.toLowerCase() : ''}${F.support ? ', ' + F.support.toLowerCase() : ''}. Puedes seguir marcando.`, 4200);
  };
  $('#qsOk', m).onclick = () => go(false);
  $('#qs3d', m).onclick = () => go(true);
  m.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing && !(e.target.closest && e.target.closest('button,select'))) { e.preventDefault(); go(false); } });
  if (!matchMedia('(pointer:coarse)').matches) setTimeout(() => { const d = $('#qsDesc', m); if (d) d.focus(); }, 30);
}
function suggestShots(s) {
  const existing = D.shotsBy[s.key] || [];
  const make = [];
  const first = s.p0 + 1 < s.p1 ? s.p0 + 1 : s.p0, last = s.p1 - 1;
  const cast = sceneCast(s.idx);
  // el máster (lote U): los demás planos de la escena toman de él la ubicación de los personajes y el escenario
  // (s3d-model.js · s3Follow). Si la escena ya tiene uno, ese se queda
  const hasM = typeof shotMaster === 'function' && !!shotMaster(s.key);
  make.push({ p0: first, p1: last, size: s.ie === 'EXT' ? 'PG' : 'PE', move: 'Fijo', desc: 'Plano máster de la escena', chars: cast.map(e => e.id), ...(hasM ? {} : { master: true }) });
  // un plano por personaje con diálogo
  const speakers = new Map();
  for (let i = s.p0 + 1; i < s.p1; i++) {
    const p = P.paras[i];
    if (p.t !== 'c') continue;
    const n = normCue(p.x);
    let j = i + 1;
    while (j < s.p1 && (P.paras[j].t === 'd' || P.paras[j].t === 'p')) j++;
    const r = speakers.get(n) || { a: i, b: j - 1 };
    r.b = j - 1;
    speakers.set(n, r);
  }
  const els = Object.values(P.elements);
  for (const [n, r] of speakers) {
    const el = els.find(e => e.cat === 'cast' && e.name === n);
    make.push({ p0: r.a, p1: r.b, size: speakers.size > 1 ? 'PMC' : 'PM', move: 'Fijo', desc: (el ? el.name : n) + ' — ' + trData('reacción y diálogo'), chars: el ? [el.id] : [] });
  }
  // insertos de utilería mencionada en la acción
  const propTags = P.tags.filter(t => t.p > s.p0 && t.p < s.p1 && P.elements[t.el] && ['props', 'vfx'].includes(P.elements[t.el].cat));
  const seen = new Set();
  for (const t of propTags) {
    if (seen.has(t.el) || seen.size >= 3) continue;
    seen.add(t.el);
    make.push({ p0: t.p, p1: t.p, size: 'PD', move: 'Fijo', desc: 'Detalle: ' + P.elements[t.el].name.toLowerCase(), chars: [] });
  }
  let ord = existing.length ? existing[existing.length - 1].ord : 0;
  let n = 0;
  for (const f of make) {
    if (existing.some(e => e.p0 === f.p0 && e.p1 === f.p1 && e.size === f.size)) continue;
    const sh = { id: uid('s'), sc: s.key, ord: ++ord, angle: 'Normal', lens: '', support: '', dur: '', notes: '', done: false, auto: true, ...f };
    P.shots[sh.id] = sh; n++;
  }
  changed('data'); derive(); render();
  toast(n ? `${n} planos sugeridos para la escena ${s.key}. Ajusta tamaño, ángulo y movimiento.` : 'La escena ya tiene esos planos.');
}

/* ---------- ajustes, ayuda y exportar ---------- */
const numsFld = () => `<div class="fld"><span>Números de escena${planAllows('scriptnum') ? '' : ' <i class="pro-chip">PRO</i>'}</span>
    <div class="menu"><button data-act="ed-nums">${edNumsOn() ? '✓ ' : ''}Mostrar los números en el guion y en el PDF</button>${edEditable() && !scriptLock() ? '<button data-act="ed-renum" data-pclose>Renumerar todas las escenas (1, 2, 3…)</button>' : ''}</div>
    <span class="hint">Al escribir, las escenas nuevas toman el número de la anterior con letra (5A, 5B) para no mover el plan ni el desglose.</span></div>`;
SETTINGS.script = () => `${typeof edEditable === 'function' && edEditable() ? `<div class="fld"><span>Formato del guion</span><div class="seg" role="group" aria-label="Formato"><button data-act="ed-format" data-f="cine" aria-pressed="${ea(edFormat() !== 'av')}" title="Escena, acción, personaje, diálogo">Cine</button><button data-act="ed-format" data-f="av" aria-pressed="${ea(edFormat() === 'av')}" title="Video y audio (publicidad, documental, televisión)">AV · dos columnas</button></div></div>` : ''}
  ${numsFld()}
  ${epCan() || isSeries(P) ? `<div class="fld"><span>Serie de TV</span><div class="menu">${isSeries(P) ? `<button data-act="ep-open" data-pclose>Episodios (${(D.sc.eps || []).length})…</button>` : '<button data-act="ep-convert" data-pclose>Convertir en serie…</button>'}</div><span class="hint">${isSeries(P) ? 'Cada episodio numera sus escenas con su número delante (101-1, 101-2…) y empieza en página nueva.' : 'Para una serie: un episodio tras otro en el mismo proyecto, con sus escenas numeradas 101-1, 101-2…'}</span></div>` : ''}
  <div class="fld"><span>Guion final</span>${scriptLock() ? `<div class="menu"><button data-act="lk-panel" data-pclose>${ICO.lock} Guion cerrado: revisiones y acceso…</button></div>` : lockCanClose() ? `<div class="menu"><button data-act="lk-close" data-pclose>${ICO.lock} Cerrar el guion final…</button></div>` : ''}
    <span class="hint">${scriptLock() ? 'Cerrado: los cambios se hacen en revisiones de color; los números de escena y de página no se mueven.' : 'Al cerrarlo queda de solo lectura, con los números de escena y de página fijos; los cambios se hacen en revisiones de color.'}</span></div>`;
SETTINGS.lined = () => `<div class="fld sm-fld"><span>Ver en el guion</span><div class="seg" role="group" aria-label="Capas"><button data-act="mode" data-m="tags" aria-pressed="${ea(UI.mode.tags)}">Etiquetas</button><button data-act="mode" data-m="cov" aria-pressed="${ea(UI.mode.cov)}">Rayado</button>${typeof anoOn === 'function' && anoOn() ? `<button data-act="mode" data-m="ink" aria-pressed="${ea(UI.mode.ink !== false)}">Anotaciones</button>` : ''}</div></div>
  <div class="fld"><span>Categorías de las etiquetas</span><div class="legend cat-chips">${CATS.map(c => `<button data-act="cat-toggle" data-c="${ea(c.id)}" aria-pressed="${ea(!UI.hidden.has(c.id))}" style="--c:${ea(c.color)};--ci:${ea(mkInk(c.color))}" title="Mostrar u ocultar ${ea(c.name)} en el guion">${esc(c.name)}</button>`).join('')}</div>
  <span class="hint">Toca una categoría para ocultarla o mostrarla en el guion.</span></div>${typeof anoSettingsHTML === 'function' ? anoSettingsHTML() : ''}`;
HELP.script = [
  ['Escribir', 'Aquí redactas el guion en formato de cine o de dos columnas (AV). Intro pasa al párrafo que sigue, Tab cambia su tipo y Ctrl + 1…7 lo elige: escena, acción, personaje, acotación, diálogo, transición y plano. Los nombres de personaje y las locaciones se completan solos.'],
  ['Formato y revisión', 'La barra tiene negrita (Ctrl+B), itálica (Ctrl+I), subrayado (Ctrl+U) y resaltar: elige el texto (o deja el cursor en una palabra) y toca el botón. La flechita del resaltador elige entre seis colores (o lo quita). Salen en el PDF y en Fountain; el resaltado es una marca de trabajo, no se imprime y se oculta con el guion cerrado. El último botón marca los cambios: lo cambiado queda resaltado con el color de la revisión y el párrafo con un asterisco (en el PDF, solo el asterisco).'],
  ['Escritura y racha', 'La llamita de la barra cuenta lo que escribes cada día: palabras netas, tiempo escribiendo y pensando. Si llegas a tu meta (100 palabras o 15 minutos, la cambias en su panel), la racha suma un día; un día de descanso por semana no la corta. Es tuya: suma con todos tus guiones y nadie más la ve.'],
  ['AV a dos columnas', 'Video a la izquierda, audio a la derecha y la duración de cada fila. Tab pasa de celda en celda; Ctrl + Intro agrega una fila. En el audio, «NOMBRE: texto» cuenta como personaje para el desglose.'],
  ['Marcar el desglose', 'Las etiquetas del desglose y el rayado de los planos están en la pestaña Guion rayado, en Desarrollo. Al pasar allí, el texto nuevo trae sus sugerencias.'],
  ['Guion final', 'En Ajustes («⋯» al final de la barra), «Cerrar el guion final» lo deja de solo lectura con los números de escena y de página fijos (lo nuevo va con letra: escena 12A, página 30A). Para cambiarlo, una persona autorizada abre una revisión de color con su código: cada párrafo cambiado queda con asterisco y el registro dice quién hizo qué. Solo producción lo reabre.'],
];
HELP.lined = [
  ['Marcar el desglose', 'Selecciona texto en el guion y elige la categoría: personaje, atrezo, vestuario… Toca una etiqueta para cambiarla o quitarla.'],
  ['Crear planos', 'Selecciona el texto que cubre el plano y elige «Plano». Las líneas sobre el texto son el rayado: cada una muestra qué cubre su plano, con el número arriba (tócalo para abrir el plano).'],
  ['Notas al margen', 'Suelta el botón de nota (arriba) sobre una palabra del guion, o elige texto y toca «Nota»: la nota queda al costado de la página con la fecha del día y una flecha fina hasta ese lugar. Tócala para responder, editarla o resolverla. Si es tuya, toca la fecha para cambiarla y arrastra la punta de la flecha a otro lugar del texto. Salen en el PDF del guion rayado.'],
  ['Anotar a mano', 'El lápiz de la barra abre las herramientas: lápiz, marcador, flecha (recta o curva, sigue tu gesto), cuadro de texto y borrador, con cinco colores y tres grosores. Se dibuja sobre el texto y en los márgenes; cada anotación queda pegada a su renglón. Con un lápiz digital, el lápiz dibuja y el dedo desplaza la página. Las ve todo el equipo: toca una para ver quién la hizo. «Anotaciones» las muestra u oculta, y salen en el PDF del guion rayado.'],
  ['Etiquetas y Rayado', 'Muestran u ocultan los colores del desglose y las líneas de los planos. En Ajustes («⋯» al final de la barra) eliges qué categorías se ven.'],
  ['Exportar', 'El PDF del guion rayado sale como lo ves: con el rayado de los planos, con las etiquetas o con las dos, y con las categorías que tengas a la vista. También puedes sacar solo las etiquetas de un área (sonido, vestuario, atrezzo…) para cada departamento.'],
  ['Escenas', 'La lista de la izquierda salta a cada escena; el panel de la derecha muestra su sinopsis, sus planos y su desglose.'],
  ['Escribir', 'Para escribir o corregir el texto, usa la pestaña Guion.'],
];
EXPORTS.script = () => [pdfItem('Guion (PDF)', 'screenplay', edFormat() === 'av' ? 'Dos columnas: video y audio' : 'Formato estándar de cine, listo para leer o imprimir'), pdfItem('Guion rayado (PDF)…', 'script', 'Elige qué lleva: el rayado de los planos, las etiquetas del desglose o solo las de un área', { ask: true }), { label: 'Guion en Fountain (.fountain)', hint: 'Texto plano que abren Final Draft, Highland y otros', run: () => exportFountain() }];
EXPORTS.lined = () => [pdfItem('Guion rayado (PDF)…', 'script', 'Elige qué lleva: el rayado de los planos, las etiquetas del desglose o solo las de un área', { ask: true }), pdfItem('Guion (PDF)', 'screenplay', edFormat() === 'av' ? 'Dos columnas: video y audio' : 'Formato estándar de cine, listo para leer o imprimir')];
RENDER.lined = RENDER.script;
