/* ============================================================
   SCOUTING · MAPA GENERAL (lote W) — todas las candidatas de todos los lugares en un mapa
   En la barra de Scouting, «Por lugar | Mapa general». A la izquierda, los lugares con sus candidatas; a la derecha,
   el mapa (Leaflet con las teselas de OpenStreetMap, con su atribución). Las coordenadas salen del enlace del mapa de
   cada candidata (mapa-enlace.js) o se ponen a mano («Ubicar en el mapa»; el pin se arrastra para corregir).
   Leaflet se carga solo al abrir el mapa: en la web publicada desde jsdelivr; en el servidor y en el escritorio desde
   app/lib (lo copian server/make.js y desktop/make.js desde tools/leaflet).
   ============================================================ */
const LEAFLET_V = '1.9.4';
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
let LEAFLET_P = null;
function loadLeaflet() {
  if (window.L && window.L.map) return Promise.resolve(true);
  if (LEAFLET_P) return LEAFLET_P;
  const local = DESK || typeof LOCAL_LIBS !== 'undefined';
  const base = local ? 'lib/' : `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_V}/dist/`;
  // (el CDN con su huella: si el archivo cambiara, el navegador no lo usa)
  const SRI = { 'leaflet.js': 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=', 'leaflet.css': 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=' };
  const add = (tag, f) => new Promise((res, rej) => {
    const el = document.createElement(tag);
    if (tag === 'link') { el.rel = 'stylesheet'; el.href = base + f; } else el.src = base + f;
    if (!local) { el.integrity = SRI[f]; el.crossOrigin = 'anonymous'; }
    el.onload = res; el.onerror = () => { el.remove(); rej(new Error(f)); };
    document.head.appendChild(el);
  });
  return (LEAFLET_P = Promise.all([add('link', 'leaflet.css'), add('script', 'leaflet.js')]).then(() => !!(window.L && window.L.map))
    .catch(e => { console.warn('Mapa:', e); LEAFLET_P = null; return false; }));
}

/* ---------- datos: los lugares con sus candidatas, en el orden de la ficha ---------- */
const SM_ORDER = { visitar: 3, visitada: 2, aprobada: 1, descartada: 4 };
/* el estado que pinta el pin: elegida manda sobre los demás */
const smState = (pl, c) => pl.pick === c.id ? 'pick' : c.status;
const SM_LABEL = { pick: 'Elegida', aprobada: 'Aprobada', visitada: 'Visitada', visitar: 'Por visitar', descartada: 'Descartada' };
function smGroups() {
  return scoutPlaces().map(p => {
    const d = scPlaceData(p.b);
    const cands = [...d.cands].sort((a, b) => (b.id === d.pick) - (a.id === d.pick) || (SM_ORDER[a.status] || 9) - (SM_ORDER[b.status] || 9));
    return { ...p, d, cands };
  }).filter(g => g.cands.length);
}
/* las jornadas en que se rueda en ese lugar (solo si es la elegida): «1 · lun 2 nov» */
function smDays(b) {
  if (!P.schedule || !P.schedule.items) return '';
  const { days } = scheduleDays(P, D.sc), dates = shootDates(P, days.length), out = [];
  days.forEach((d, i) => { if (d.keys.some(k => { const s = D.sc.byKey[k]; return s && (s.locBase || s.loc) === b; })) out.push(i); });
  if (!out.length) return '';
  const f = i => dates[i] ? `${i + 1} · ${dates[i].toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')}` : String(i + 1);
  return out.length > 3 ? `${out.slice(0, 3).map(i => i + 1).join(', ')} y ${out.length - 3} más` : out.map(f).join(', ');
}

/* ---------- pines: la forma y el color dicen el estado (también sin color) ---------- */
const SM_PIN = 'M0 0C-4 -6 -13 -15 -13 -25A13 13 0 1 1 13 -25C13 -15 4 -6 0 0Z';
function smPinSVG(st, o = {}) {
  const w = o.w || 26, h = Math.round(w * 44 / 30);
  const glyph = {
    pick: '<path class="g" d="M-5.5 -25.5 -1.5 -21.5 6 -29" fill="none" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
    aprobada: '<circle class="g" cx="0" cy="-25" r="5"/>',
    visitada: '<circle class="g" cx="0" cy="-25" r="4.5"/>',
    visitar: '<circle class="g" cx="0" cy="-25" r="4"/>',
    descartada: '<path class="g" d="M-4.5 -29.5 4.5 -20.5M4.5 -29.5 -4.5 -20.5" stroke-width="3" stroke-linecap="round"/>',
  }[st] || '';
  return `<svg class="sm-pin st-${ea(st)}" viewBox="-15 -42 30 44" width="${w}" height="${h}" aria-hidden="true"><path class="b" d="${SM_PIN}"/>${glyph}</svg>`;
}

/* ---------- la vista ---------- */
// el mapa vive fuera de la vista: al repintar la pestaña se vuelve a poner en su lugar (no se rehace ni pide teselas)
const SM = { el: null, map: null, layer: null, tiles: null, mk: new Map(), sel: null, placing: null, pid: null, fit: false, tileOk: false, tileErr: 0, failed: false, ask: new Set(), note: '' };
const smEditable = () => scoutEditable();
function smCandRow(g, c) {
  const st = smState(g.d, c), geo = candGeo(c), on = SM.sel === c.id;
  const sub = (st === 'pick' ? 'Elegida' : SM_LABEL[st] || '') + (geo ? '' : ' · sin ubicar');
  return `<button type="button" class="sm-row${on ? ' on' : ''}${st === 'descartada' ? ' off' : ''}${geo ? '' : ' nogeo'}" data-act="sm-sel" data-id="${ea(c.id)}" ${on ? 'aria-current="true"' : ''}>
    ${smPinSVG(st, { w: 16 })}<span class="t"><span class="n" data-no-tr>${esc(c.name.trim() || titleCase(g.b))}</span><span class="s${st === 'pick' ? ' pk' : ''}">${esc(sub)}</span></span></button>`;
}
/* el recuadro de las candidatas sin ubicar (las descartadas no cuentan) */
function smMissing(groups) {
  const L = [];
  for (const g of groups) for (const c of g.cands) if (c.status !== 'descartada' && !candGeo(c)) L.push({ g, c, why: candGeoWhy(c) });
  return L;
}
function smMissingHTML(L, ed) {
  if (!L.length) return '';
  const nm = x => `<span data-no-tr>${esc(x.c.name.trim() || titleCase(x.g.b))} (${esc(titleCase(x.g.b))})</span>`;
  const WHY = { none: 'no tiene enlace del mapa', short: TARGET === 'server' ? 'leyendo su enlace corto…' : 'su enlace corto no trae el lugar', nolink: 'su enlace no trae el lugar' };
  const txt = L.length === 1 ? `${nm(L[0])}: <span>${esc(WHY[L[0].why] || WHY.nolink)}</span>.` : `${L.slice(0, 2).map(nm).join(', ')}${L.length > 2 ? ` <span>y ${L.length - 2} más</span>` : ''}.`;
  return `<div class="sm-miss"><span class="hint"><b>${L.length} sin ubicar</b> · ${txt}</span>
    ${ed ? `<button type="button" class="linkbtn sm-place" data-act="sm-place" data-id="${ea(L[0].c.id)}">${ICO.pin}<span>Ubicar en el mapa</span></button>` : ''}</div>`;
}
function smLegendHTML(groups) {
  const n = { pick: 0, aprobada: 0, visitada: 0, visitar: 0, descartada: 0 };
  for (const g of groups) for (const c of g.cands) if (candGeo(c)) n[smState(g.d, c)]++;
  return `<div class="sm-lgd" role="list" aria-label="Leyenda">${['pick', 'aprobada', 'visitada', 'visitar', 'descartada'].map(k => `<span role="listitem" class="st-${k}${n[k] ? '' : ' zero'}">${smPinSVG(k, { w: 11 })}<span>${SM_LABEL[k]}</span><b class="tnum">${n[k]}</b></span>`).join('')}</div>`;
}
const SM_ICO = {
  in: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  out: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  all: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  go: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M9 6h9v9"/></svg>',
};
/* la barra de las dos vistas: «Por lugar | Mapa general» */
const smViewSeg = () => hdSeg([{ label: 'Por lugar', attrs: 'data-act="sc-view" data-v="place"', on: UI.scView !== 'map' }, { label: 'Mapa general', attrs: 'data-act="sc-view" data-v="map"', on: UI.scView === 'map' }], 'Vista');
function smRender() {
  const v = $('#view'), ed = smEditable(), groups = smGroups();
  if (P.id !== SM.pid) { SM.pid = P.id; SM.sel = null; SM.placing = null; SM.fit = false; }
  if (SM.sel && !scCand(SM.sel)) SM.sel = null;
  const nC = groups.reduce((a, g) => a + g.cands.length, 0), places = scoutPlaces(), picked = places.filter(p => scPlaceData(p.b).pick).length;
  const miss = smMissing(groups);
  smResolveShort(groups);
  const list = groups.length ? `<ul class="slist sm-list" id="slist">${groups.map(g => `<li data-q="${esc((g.b + ' ' + g.cands.map(c => c.name + ' ' + c.addr).join(' ')).toLowerCase())}"><section class="sm-grp">
      <div class="sm-gh"><b data-no-tr>${esc(titleCase(g.b))}</b><span class="tnum">${g.gone ? '—' : g.scenes.length + ' esc.'}</span></div>
      ${g.cands.map(c => smCandRow(g, c)).join('')}</section></li>`).join('')}</ul>`
    : `<p class="hint sm-none">Aún no hay candidatas. Agrégalas en «Por lugar»: las que tienen el enlace del mapa aparecen aquí solas.</p>`;
  const side = `${hdSide('Lugares', `${places.length} · ${picked} ${picked === 1 ? 'elegido' : 'elegidos'}`, 'Buscar lugar o candidata')}${list}${smMissingHTML(miss, ed)}`;
  v.innerHTML = `<div class="ws ws-2 sm-ws">
    <aside class="side" id="side">${side}</aside>
    <section class="center">
      <div class="bar"><button class="btn ghost only-narrow" data-act="drawer" data-d="#side">Lugares</button>${smViewSeg()}<span class="hint hide-sm tnum">${nC === 1 ? '1 candidata' : nC + ' candidatas'} en ${groups.length === 1 ? '1 lugar' : groups.length + ' lugares'}</span><span class="grow"></span>${toolsHTML()}</div>
      <div class="sm-wrap${SM.placing ? ' placing' : ''}" id="smWrap">
        <div class="sm-host" id="smHost"></div>
        <div class="sm-ctl">
          <button type="button" class="hide-sm" data-act="sm-zoom" data-v="1" aria-label="Acercar" title="Acercar">${SM_ICO.in}</button>
          <button type="button" class="hide-sm" data-act="sm-zoom" data-v="-1" aria-label="Alejar" title="Alejar">${SM_ICO.out}</button>
          <button type="button" data-act="sm-all" aria-label="Ver todas" title="Ver todas">${SM_ICO.all}</button>
        </div>
        ${smLegendHTML(groups)}
        <div class="sm-note" id="smNote" role="status" ${SM.note ? '' : 'hidden'}>${esc(SM.note)}</div>
        ${SM.placing ? smPlacingHTML() : ''}
        ${smCardHTML()}
      </div>
    </section></div>`;
  bindView(); bindSceneSearch();
  smMount(groups);
  smSheet();
}

/* ---------- la tarjeta de la candidata elegida en el mapa o en la lista ---------- */
function smCardHTML() {
  const x = SM.sel && scCand(SM.sel); if (!x) return '';
  const { b, pl, c } = x, st = smState(pl, c), geo = candGeo(c), place = scoutPlaces().find(p => p.b === b);
  const ph = (c.ph || []).find(p => FRAMES[scPhKey(c.id, p.id)] || frameHas(scPhKey(c.id, p.id)));
  if (ph) candFramesNeed([scPhKey(c.id, ph.id)], 'scout');
  const url = ph && FRAMES[scPhKey(c.id, ph.id)];
  const permit = c.permit ? (SC_PERMIT.find(s => s[0] === c.permit) || [])[1] : '';
  const days = st === 'pick' ? smDays(b) : '';
  const rows = [
    place && place.scenes.length ? ['Escenas', esc(place.scenes.join(', '))] : null,
    permit ? ['Permiso', `<span class="${c.permit === 'ok' ? 'ok' : ''}">${esc(permit)}</span>`] : null,
    days ? ['Jornadas', esc(days)] : null,
  ].filter(Boolean);
  const go = safeUrl(c.map) || (geo ? `https://www.google.com/maps/dir/?api=1&destination=${geo.lat},${geo.lng}` : '');
  return `<article class="sm-card${ph ? ' has-ph' : ''}" aria-label="${ea(c.name || titleCase(b))}">
    <span class="sm-grab" aria-hidden="true"></span>
    ${ph ? `<div class="sm-ph">${url ? `<img src="${ea(url)}" alt="${ea(c.name || 'Locación')}" data-act="sc-view" data-id="${ea(c.id)}" data-p="${ea(ph.id)}">` : '<span class="cand-wait" aria-hidden="true"></span>'}</div>` : ''}
    <button type="button" class="sm-x" data-act="sm-close" aria-label="Cerrar" title="Cerrar">${ICO.close}</button>
    <div class="sm-cb">
      <div class="sm-tag"><span class="sm-st st-${ea(st)}">${esc(SM_LABEL[st] || '')}</span><span class="hint" data-no-tr>${esc((EN ? 'for ' : 'para ') + titleCase(b))}</span></div>
      <h3 data-no-tr>${esc(c.name.trim() || titleCase(b))}</h3>
      ${c.addr.trim() ? `<span class="sm-addr" data-no-tr>${esc(c.addr.trim())}</span>` : ''}
      ${geo ? '' : `<span class="sm-addr warn">Sin ubicar en el mapa</span>`}
      ${rows.length ? `<dl class="sm-dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
    </div>
    <div class="sm-cact">
      <button type="button" class="btn sm-open" data-act="sm-open" data-id="${ea(c.id)}">Abrir ficha</button>
      ${!geo && smEditable() && SM.placing !== c.id ? `<button type="button" class="btn" data-act="sm-place" data-id="${ea(c.id)}">${ICO.pin}<span>Ubicar</span></button>`
        : geo && go ? `<a class="btn sm-go" href="${ea(go)}" target="_blank" rel="noopener noreferrer">${SM_ICO.go}<span>Cómo llegar</span></a>` : ''}
    </div>
  </article>`;
}
/* el aviso de «toca donde está» */
function smPlacingHTML() {
  const x = scCand(SM.placing); if (!x) return '';
  // (el nombre no se traduce: la frase ya va en su idioma)
  return `<div class="sm-placing" role="status"><span data-no-tr>${esc(EN ? tr('Toca en el mapa dónde está «{0}».').replace('{0}', smName(x.b, x.c)) : `Toca en el mapa dónde está «${smName(x.b, x.c)}».`)}</span><button type="button" class="btn sm" data-act="sm-cancel">Cancelar</button></div>`;
}

/* ---------- el mapa (Leaflet) ---------- */
const smName = (b, c) => c.name.trim() || titleCase(b);
function smNote(msg) { SM.note = msg || ''; const n = $('#smNote'); if (!n) return; n.hidden = !msg; n.textContent = msg ? tr(msg) : ''; }
function smStartView() {
  let lima = false; try { lima = Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/Lima'; } catch (e) { }
  return lima ? [[-9.19, -75.02], 5] : [[15, -40], 2];
}
async function smMount(groups) {
  const host = $('#smHost'); if (!host) return;
  if (SM.el) { host.appendChild(SM.el); if (SM.map) { SM.map.invalidateSize(false); smSync(groups); } else if (SM.failed) smFailHTML(); return; }
  const el = SM.el = document.createElement('div');
  el.className = 'sm-map';
  host.appendChild(el);
  el.innerHTML = '<span class="sm-load hint">Cargando el mapa…</span>';
  const ok = await loadLeaflet();
  if (SM.el !== el) return;
  if (!ok) { SM.failed = true; SM.el = null; smFailHTML(); return; }
  SM.failed = false;
  el.innerHTML = '';
  const L = window.L, [c0, z0] = smStartView();
  const map = SM.map = L.map(el, { zoomControl: false, attributionControl: true, center: c0, zoom: z0, worldCopyJump: true, tapTolerance: 12 });
  map.attributionControl.setPrefix(false);
  SM.tiles = L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }).addTo(map);
  // sin internet o si las teselas no llegan: un aviso chico; la lista sigue
  SM.tiles.on('tileload', () => { SM.tileOk = true; SM.tileErr = 0; smNote(''); });
  SM.tiles.on('tileerror', () => { SM.tileErr++; if (!SM.tileOk || SM.tileErr > 6) smNote(navigator.onLine === false ? 'Sin conexión: el mapa no se ve, pero la lista sigue.' : 'El mapa no carga. La lista sigue funcionando.'); });
  map.on('click', e => { if (SM.placing) smPlaceAt(SM.placing, e.latlng.lat, e.latlng.lng); });
  SM.layer = L.layerGroup().addTo(map);
  if (navigator.onLine === false) smNote('Sin conexión: el mapa no se ve, pero la lista sigue.');
  if (UI.tab === 'scout' && UI.scView === 'map') smSync(smGroups());
}
function smFailHTML() {
  const host = $('#smHost'); if (!host) return;
  host.innerHTML = `<div class="sm-fail"><p>No se pudo cargar el mapa. Revisa tu conexión: la lista sigue funcionando.</p><button type="button" class="btn" data-act="sm-retry">Reintentar</button></div>`;
}
/* los pines: uno por candidata ubicada (se crean, se mueven o se quitan según los datos) */
function smSync(groups) {
  const L = window.L, map = SM.map; if (!L || !map) return;
  const ed = smEditable() && !SM.placing, seen = new Set(), pts = [];
  for (const g of groups) for (const c of g.cands) {
    const geo = candGeo(c); if (!geo) continue;
    const st = smState(g.d, c), on = SM.sel === c.id, key = [st, on, smName(g.b, c), ed].join('|');
    seen.add(c.id); pts.push([geo.lat, geo.lng]);
    let m = SM.mk.get(c.id);
    const icon = () => L.divIcon({ className: `sm-mk st-${st}${on ? ' on' : ''}`, html: `${smPinSVG(st, { w: on ? 33 : st === 'descartada' ? 20 : 26 })}<span class="lb">${esc(smName(g.b, c))}</span>`,
      iconSize: on ? [33, 48] : st === 'descartada' ? [20, 29] : [26, 38], iconAnchor: on ? [16.5, 47] : st === 'descartada' ? [10, 28] : [13, 37] });
    if (!m) {
      m = L.marker([geo.lat, geo.lng], { icon: icon(), draggable: ed, keyboard: true, title: smName(g.b, c), riseOnHover: true, autoPan: true });
      m._fs = { id: c.id, key };
      m.on('click', () => smSelect(m._fs.id, false));
      m.on('dragend', () => { const p = m.getLatLng(); smMoveTo(m._fs.id, p.lat, p.lng); });
      m.addTo(SM.layer); SM.mk.set(c.id, m);
    } else {
      const ll = m.getLatLng();
      if (Math.abs(ll.lat - geo.lat) > 1e-7 || Math.abs(ll.lng - geo.lng) > 1e-7) m.setLatLng([geo.lat, geo.lng]);
      if (m._fs.key !== key) { m.setIcon(icon()); m.options.title = smName(g.b, c); m._fs.key = key; }
      if (m.dragging) { if (ed) m.dragging.enable(); else m.dragging.disable(); }
    }
    m.setZIndexOffset(on ? 1000 : st === 'pick' ? 500 : st === 'descartada' ? -500 : 0);
  }
  for (const [id, m] of SM.mk) if (!seen.has(id)) { SM.layer.removeLayer(m); SM.mk.delete(id); }
  if (!SM.fit && pts.length) { SM.fit = true; smFitAll(false); }
  if (SM.placing) map.getContainer().classList.add('placing'); else map.getContainer().classList.remove('placing');
}
function smFitAll(anim = true) {
  const map = SM.map; if (!map) return;
  const pts = [...SM.mk.values()].map(m => m.getLatLng());
  if (!pts.length) { const [c0, z0] = smStartView(); map.setView(c0, z0, { animate: anim }); return; }
  if (pts.length === 1) { map.setView(pts[0], 16, { animate: anim }); return; }
  const card = !!$('.sm-card') && !PHONE();
  map.fitBounds(window.L.latLngBounds(pts), { paddingTopLeft: [56, PHONE() ? 64 : 48], paddingBottomRight: [card ? 340 : 48, PHONE() && $('.sm-card') ? 240 : 72], maxZoom: 16, animate: anim });
}

/* ---------- elegir, ubicar, mover ---------- */
/* repinta solo lo que cambia al elegir (la tarjeta, la lista, los pines): el mapa no se toca */
function smPaint() {
  const wrap = $('#smWrap'); if (!wrap) return;
  $$('.sm-row').forEach(r => { const on = r.dataset.id === SM.sel; r.classList.toggle('on', on); if (on) r.setAttribute('aria-current', 'true'); else r.removeAttribute('aria-current'); });
  const old = $('.sm-card', wrap), html = smCardHTML();
  if (old) old.remove();
  if (html) wrap.insertAdjacentHTML('beforeend', html);
  const pl = $('.sm-placing', wrap); if (pl) pl.remove();
  if (SM.placing) wrap.insertAdjacentHTML('beforeend', smPlacingHTML());
  wrap.classList.toggle('placing', !!SM.placing);
  smSheet();
  smSync(smGroups());
}
/* en el teléfono la tarjeta sube desde abajo: la atribución del mapa sube con ella (siempre a la vista) */
function smSheet() { const w = $('#smWrap'), c = w && $('.sm-card', w); if (w) w.style.setProperty('--sm-sheet', c && PHONE() ? c.offsetHeight + 'px' : '0px'); }
function smSelect(id, pan) {
  SM.sel = id;
  closeDrawers();
  smPaint();
  const m = id && SM.mk.get(id);
  if (m && pan && SM.map) {
    const z = Math.max(SM.map.getZoom(), 15), pt = SM.map.project(m.getLatLng(), z);
    // el pin a la vista, sin quedar debajo de la tarjeta
    const off = PHONE() ? [0, (($('.sm-card') || {}).offsetHeight || 0) / 2] : [($('.sm-card') ? 170 : 0), 0];
    SM.map.setView(SM.map.unproject(pt.add(off), z), z, { animate: true });
  }
}
function smPlaceAt(id, lat, lng) {
  const x = scCand(id); if (!x || !smEditable()) return;
  histNote('Ubicar una candidata en el mapa', null, 'scout');
  if (!candGeoHand(x.c, lat, lng)) return;
  SM.placing = null; SM.sel = id;
  changed('data'); render();
  toastUndo(`«${smName(x.b, x.c)}» quedó en el mapa. Arrastra su pin para corregirlo.`);
}
function smMoveTo(id, lat, lng) {
  const x = scCand(id); if (!x || !smEditable()) return;
  histNote('Mover el pin de una candidata', null, 'scout');
  candGeoHand(x.c, lat, lng);
  changed('data');
  setTimeout(render, 0);
  toastUndo('Pin movido.');
}
/* enlaces cortos (maps.app.goo.gl): solo en la web con cuentas, el servidor sigue el enlace y devuelve el largo */
function smResolveShort(groups) {
  if (TARGET !== 'server' || typeof apiFetch !== 'function') return;
  for (const g of groups) for (const c of g.cands) {
    const u = String(c.map || '').trim();
    if (!mapIsShort(u) || MAP_RES.has(u) || SM.ask.has(u) || candGeo(c)) continue;
    SM.ask.add(u);
    apiFetch('POST', '/api/maps/resolve', { url: u }).then(r => {
      const p = r && r.json && r.json.url ? mapLatLng(r.json.url) : null;
      MAP_RES.set(u, p);
      // queda guardado en la candidata, sin ser un paso de deshacer (no lo hizo la persona)
      const x = scCand(c.id);
      if (p && x && smEditable() && x.c.map.trim() === u) { histCapture(); if (candGeoStore(x.c)) { changed('data'); histQuiet('scout'); } }
      if (UI.tab === 'scout') lateRender();
    }).catch(e => { if (e && e.status && e.status !== 429) MAP_RES.set(u, null); else SM.ask.delete(u); if (UI.tab === 'scout') lateRender(); });
  }
}
Object.assign(ACT, {
  'sc-view': b => { UI.scView = b.dataset.v === 'map' ? 'map' : 'place'; ls.set('scView', UI.scView); if (UI.scView !== 'map') SM.placing = null; closeDrawers(); render(); },
  'sm-sel': b => { const x = scCand(b.dataset.id); if (!x) return; if (SM.placing && SM.placing !== b.dataset.id && !candGeo(x.c)) { SM.placing = b.dataset.id; } smSelect(b.dataset.id, true); },
  'sm-close': () => { SM.sel = null; smPaint(); },
  'sm-open': b => { const x = scCand(b.dataset.id); if (!x) return; UI.scView = 'place'; ls.set('scView', 'place'); UI.scPlace = x.b; SM.placing = null; render();
    requestAnimationFrame(() => { const el = $(`.cand[data-c="${CSS.escape(x.c.id)}"]`); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('sm-flash'); setTimeout(() => el.classList.remove('sm-flash'), 1600); } }); },
  'sm-zoom': b => { if (SM.map) { if (+b.dataset.v > 0) SM.map.zoomIn(); else SM.map.zoomOut(); } },
  'sm-all': () => smFitAll(true),
  'sm-place': b => {
    const x = scCand(b.dataset.id); if (!x || !smEditable()) return;
    if (!SM.map) { toast('El mapa todavía no carga.'); return; }
    SM.placing = x.c.id; SM.sel = x.c.id; closeDrawers(); smPaint();
  },
  'sm-cancel': () => { SM.placing = null; smPaint(); },
  'sm-retry': () => { SM.failed = false; SM.el = null; render(); },
});
addEventListener('keydown', e => { if (e.key === 'Escape' && SM.placing && UI.tab === 'scout' && !$('#pop') && !$('#modal')) { e.preventDefault(); SM.placing = null; smPaint(); } }, true);
addEventListener('resize', () => { if (SM.map && UI.tab === 'scout' && UI.scView === 'map') smSheet(); });
