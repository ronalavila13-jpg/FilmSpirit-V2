/* ============================================================
   Pestaña · SCOUTING — locaciones candidatas para cada lugar del guion (etapa Desarrollo)
   Viaja con el plan de rodaje (sección «plan» del equipo): al elegir una candidata, su nombre y su dirección
   pasan a las locaciones del plan, y de ahí a la hoja de llamado.
   Datos: P.scout = { places: { lugar: { cands: [{ id, name, addr, map, contact, phone, permit, cost, status,
     notes, ph: [{ id, w, h }] }], pick, note } } }   (lugar = la locación del encabezado, como en el plan)
   Fotos: FRAMES['lc~<candidata>~<foto>'] (WebP de 1200 px, como las del desglose)
   (lote W) Ubicación en el mapa general: lat, lng, geo ('link' | 'hand') y gmap en cada candidata (mapa-enlace.js);
   la vista «Mapa general» está en scout-mapa.js (UI.scView = 'map')
   ============================================================ */
const SC_ST = [['visitar', 'Por visitar'], ['visitada', 'Visitada'], ['aprobada', 'Aprobada'], ['descartada', 'Descartada']];
const SC_PERMIT = [['', 'Sin pedir'], ['pedido', 'Pedido'], ['ok', 'Aprobado'], ['no', 'No hace falta']];
const scoutEditable = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('plan'));
const candStr = v => typeof v === 'string' ? v : v == null ? '' : String(v);
/* candidatas y candidatos (scouting y casting): campos de texto, fotos y estado en la forma esperada */
function candNormalize(L, fields, sts) {
  return (Array.isArray(L) ? L : []).filter(c => c && typeof c === 'object' && typeof c.id === 'string' && /^[\w-]{1,40}$/.test(c.id)).map(c => {
    for (const f of fields) c[f] = candStr(c[f]);
    if (!sts.some(s => s[0] === c.status)) c.status = sts[0][0];
    c.ph = Array.isArray(c.ph) ? c.ph.filter(p => p && typeof p.id === 'string' && /^[\w-]{1,40}$/.test(p.id)).map(p => ({ id: p.id, w: +p.w || 0, h: +p.h || 0 })) : [];
    return c;
  });
}
const SC_FIELDS = ['name', 'addr', 'map', 'contact', 'phone', 'permit', 'cost', 'notes'];
function scoutNormalize(Px) {
  const isO = o => o && typeof o === 'object' && !Array.isArray(o);
  const S = Px.scout = isO(Px.scout) ? Px.scout : {};
  S.places = isO(S.places) ? S.places : {};
  for (const [b, pl] of Object.entries(S.places)) {
    if (!isO(pl)) { delete S.places[b]; continue; }
    pl.cands = candNormalize(pl.cands, SC_FIELDS, SC_ST);
    for (const c of pl.cands) { if (!SC_PERMIT.some(p => p[0] === c.permit)) c.permit = ''; candGeoClean(c); candGeoStore(c); }
    if (pl.pick != null && !pl.cands.some(c => c.id === pl.pick)) pl.pick = null;
    pl.note = candStr(pl.note);
  }
  return S;
}
const SCT = () => P.scout || scoutNormalize(P);
const scPlaceData = (b, make) => { const S = SCT(); if (!S.places[b] && make) S.places[b] = { cands: [], pick: null, note: '' }; return S.places[b] || { cands: [], pick: null, note: '' }; };
/* los lugares del guion (en el orden en que aparecen) y los que quedaron con candidatas aunque ya no estén */
function scoutPlaces() {
  const m = new Map();
  for (const s of D.sc.scenes) {
    const b = s.locBase || s.loc; if (!b) continue;
    if (!m.has(b)) m.set(b, { b, scenes: [], ie: new Set(), dn: new Set() });
    const x = m.get(b); x.scenes.push(s.key); x.ie.add(s.ie); x.dn.add(s.dn);
  }
  for (const b of Object.keys(SCT().places)) if (!m.has(b) && SCT().places[b].cands.length) m.set(b, { b, scenes: [], ie: new Set(), dn: new Set(), gone: true });
  return [...m.values()];
}

/* ---------- fotos (compartido con el casting) ---------- */
async function candAddPhotos(c, keyOf, files) {
  if (!proGate('photos')) return 0;
  const list = [...files].filter(f => /^image\/(jpeg|png|webp)$/.test(f.type));
  if (!list.length) { toast('Elige fotos JPG, PNG o WebP.'); return 0; }
  let n = 0;
  for (const f of list) {
    let r;
    try { r = await compressPhoto(f); } catch (err) { toast('No se pudo leer ' + f.name + '.'); continue; }
    const id = uid('f'), k = keyOf(id);
    try { await Store.saveFrame(P.id, k, r.url); }
    catch (err) { toast('No se pudo guardar la foto: ' + (err && err.code === 'quota_exceeded' ? 'se llenó el espacio de la página.' : /quota/i.test(String(err && err.name)) ? 'no queda espacio en este navegador.' : err && err.message && /permiso/i.test(err.message) ? err.message : 'inténtalo de nuevo.'), 4200); break; }
    FRAMES[k] = r.url;
    c.ph = [...(c.ph || []), { id, w: r.w, h: r.h }];
    n++;
  }
  if (n) { changed('data'); toast(`${n} ${n === 1 ? 'foto agregada' : 'fotos agregadas'}.`); }
  return n;
}
function candDelPhoto(c, keyOf, pid, tab) {
  const k = keyOf(pid);
  histNote('Quitar una foto', FRAMES[k] ? { [k]: FRAMES[k] } : null, tab);
  delete FRAMES[k];
  Store.saveFrame(P.id, k, null).catch(() => { });
  c.ph = (c.ph || []).filter(x => x.id !== pid);
  changed('data');
}
/* las fotos que faltan bajar: se piden una vez y la pestaña se vuelve a pintar al llegar */
const CAND_ASKED = new Set();
function candFramesNeed(keys, tab) {
  if (!P) return;
  const go = () => {
    const miss = keys.filter(k => frameHas(k) && !FRAMES[k] && !CAND_ASKED.has(P.id + '|' + k));
    if (!miss.length) return;
    miss.forEach(k => CAND_ASKED.add(P.id + '|' + k));
    framesNeed(miss).then(() => { if (UI.tab === tab && miss.some(k => FRAMES[k])) lateRender(); });
  };
  if (typeof FR_KNOWN !== 'undefined' && FR_KNOWN === P.id) go();
  else ensureFrames('index').then(() => { if (UI.tab === tab) { go(); if (keys.some(k => FRAMES[k])) lateRender(); } });
}
function candPhotosHTML(c, keyOf, ed, act, upBind, label) {
  const ph = (c.ph || []).filter(p => frameHas(keyOf(p.id)) || FRAMES[keyOf(p.id)]);
  const img = p => { const u = FRAMES[keyOf(p.id)]; return u ? `<img src="${ea(u)}" alt="${esc(label)}" data-act="${ea(act)}-view" data-id="${ea(c.id)}" data-p="${ea(p.id)}">` : '<span class="cand-wait" aria-hidden="true"></span>'; };
  const up = ed ? (planAllows('photos') ? `<label class="cand-up" title="Agregar fotos">${CAM_SVG}<span>Fotos</span><input type="file" class="file-in" accept="image/jpeg,image/png,image/webp" multiple data-bind="${ea(upBind)}" data-id="${ea(c.id)}"></label>`
    : `<button type="button" class="cand-up" data-act="cand-pro">${CAM_SVG}<span>Fotos <i class="pro-chip">PRO</i></span></button>`) : '';
  if (!ph.length) return `<div class="cand-ph empty">${up || '<span class="hint">Sin fotos.</span>'}</div>`;
  return `<div class="cand-ph"><figure class="cand-main">${img(ph[0])}${ed ? `<button class="cand-x" data-act="${ea(act)}-phdel" data-id="${ea(c.id)}" data-p="${ea(ph[0].id)}" aria-label="Quitar la foto" title="Quitar la foto">${ICO.close}</button>` : ''}</figure>
    ${ph.length > 1 || up ? `<div class="cand-th">${ph.slice(1).map(p => `<figure>${img(p)}${ed ? `<button class="cand-x" data-act="${ea(act)}-phdel" data-id="${ea(c.id)}" data-p="${ea(p.id)}" aria-label="Quitar la foto" title="Quitar">${ICO.close}</button>` : ''}</figure>`).join('')}${up}</div>` : ''}</div>`;
}
/* el texto de un campo de la tarjeta */
const candFld = (c, f, label, bind, ed, attrs = '', type = 'text') => `<label class="cand-fl"><span>${esc(label)}</span><input type="${type}" class="cand-in" value="${esc(c[f] || '')}" data-bind="${ea(bind)}" data-id="${ea(c.id)}" data-f="${ea(f)}" ${attrs} ${ed ? '' : 'readonly'}></label>`;
const candSel = (c, f, opts, bind, ed, label) => `<label class="cand-fl"><span>${esc(label)}</span><select class="cand-in" data-bind="${ea(bind)}" data-id="${ea(c.id)}" data-f="${ea(f)}" ${ed ? '' : 'disabled'}>${opts.map(([k, n]) => `<option value="${ea(k)}" ${c[f] === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
const safeUrl = u => { const s = String(u || '').trim(); if (!s) return ''; const w = /^[a-z][\w+.-]*:/i.test(s) ? s : 'https://' + s; return /^https?:\/\//i.test(w) ? w : ''; };

/* ---------- vista ---------- */
const scPhKey = (cid, pid) => `lc~${cid}~${pid}`;
function scCurPlace(places) {
  if (!places.some(p => p.b === UI.scPlace)) UI.scPlace = places.length ? places[0].b : '';
  return places.find(p => p.b === UI.scPlace) || null;
}
function scCandHTML(pl, c, ed) {
  const picked = pl.pick === c.id, cur = (P.budget && P.budget.currency) || 'S/';
  return `<article class="cand${picked ? ' picked' : ''}${c.status === 'descartada' ? ' off' : ''}" data-c="${ea(c.id)}">
    ${candPhotosHTML(c, pid => scPhKey(c.id, pid), ed, 'sc', 'sc-up', c.name || 'Locación')}
    <div class="cand-b">
      <div class="cand-t"><input type="text" class="ti cand-n" value="${esc(c.name)}" data-bind="sc-c" data-id="${ea(c.id)}" data-f="name" placeholder="${ea(ed ? 'Nombre de la locación' : '—')}" aria-label="Nombre de la locación" ${ed ? '' : 'readonly'}>
        ${picked ? '<span class="badge ok">Elegida</span>' : ''}${ed ? `<button class="icbtn" data-act="sc-more" data-id="${ea(c.id)}" aria-haspopup="menu" aria-label="Más acciones" title="Duplicar o quitar">${ICO.more}</button>` : ''}</div>
      <div class="cand-g">
        ${candSel(c, 'status', SC_ST, 'sc-c', ed, 'Estado')}
        ${candSel(c, 'permit', SC_PERMIT, 'sc-c', ed, 'Permiso')}
        ${candFld(c, 'addr', 'Dirección', 'sc-c', ed, `placeholder="${ea(ed ? 'Calle, número, distrito' : '')}"`)}
        <label class="cand-fl"><span>Mapa${safeUrl(c.map) ? ` · <a href="${ea(safeUrl(c.map))}" target="_blank" rel="noopener noreferrer">Abrir</a>` : ''}</span><input type="url" class="cand-in" value="${esc(c.map)}" data-bind="sc-c" data-id="${ea(c.id)}" data-f="map" placeholder="${ea(ed ? 'Enlace de Google Maps' : '')}" ${ed ? '' : 'readonly'}></label>
        ${candFld(c, 'contact', 'Contacto', 'sc-c', ed, `placeholder="${ea(ed ? 'Quién da el permiso' : '')}"`)}
        ${candFld(c, 'phone', 'Teléfono', 'sc-c', ed, '', 'tel')}
        ${candFld(c, 'cost', `Costo por día (${cur})`, 'sc-c', ed, 'inputmode="decimal"')}
      </div>
      <textarea class="cand-in cand-nt" rows="2" data-bind="sc-c" data-id="${ea(c.id)}" data-f="notes" placeholder="${ea(ed ? 'Luz, ruido, acceso, estacionamiento, corriente, baños, horarios…' : '')}" aria-label="Notas" ${ed ? '' : 'readonly'}>${esc(c.notes)}</textarea>
      ${ed ? `<div class="cand-a">${picked ? `<button class="btn" data-act="sc-unpick" data-id="${ea(c.id)}">Quitar la elección</button>` : `<button class="btn" data-act="sc-pick" data-id="${ea(c.id)}" title="Pasa al plan de rodaje como la locación de estas escenas">Elegir esta locación</button>`}</div>` : ''}
    </div>
  </article>`;
}
RENDER.scout = function () {
  const v = $('#view');
  if (!D.sc.scenes.length && !Object.keys(SCT().places).length) { v.innerHTML = emptyScript(); bindView(); return; }
  if (UI.scView == null) UI.scView = ls.get('scView', 'place') === 'map' ? 'map' : 'place';
  if (UI.scView === 'map') { smRender(); return; }
  const ed = scoutEditable(), places = scoutPlaces(), cur = scCurPlace(places);
  const picked = places.filter(p => scPlaceData(p.b).pick).length;
  const side = `${hdSide('Lugares', `${places.length} · ${picked} ${picked === 1 ? 'elegido' : 'elegidos'}`, 'Buscar lugar')}
    <ul class="slist" id="slist">${places.map(p => { const d = scPlaceData(p.b), pk = d.pick && d.cands.find(c => c.id === d.pick); return `<li data-q="${esc(p.b.toLowerCase() + ' ' + (pk ? pk.name.toLowerCase() : ''))}"><button data-act="sc-place" data-b="${ea(p.b)}" ${cur && cur.b === p.b ? 'aria-current="true"' : ''}>
      <span class="k">${pk ? '<i class="cand-ok" title="Elegida">✓</i>' : d.cands.length ? `<i class="cand-cnt tnum" title="Candidatas">${d.cands.length}</i>` : '<i class="cand-none"></i>'}</span>
      <span class="h" title="${esc(p.b)}">${esc(titleCase(p.b))}${pk ? `<small>${esc(pk.name)}</small>` : ''}</span><span class="e tnum">${p.gone ? '—' : p.scenes.length + ' esc.'}</span></button></li>`; }).join('')}</ul>`;
  let body = '<p class="hint">Elige un lugar de la lista.</p>';
  if (cur) {
    // (lote I) en palabras: «Exterior e interior · Día y noche»
    const IE = { EXT: 'Exterior', INT: 'Interior', 'INT/EXT': 'Interior y exterior', 'EXT/INT': 'Exterior e interior' };
    const ie = [...cur.ie].map(x => IE[x] || x), dn = [...cur.dn].map(x => x === 'N' ? 'noche' : 'día');
    const d = scPlaceData(cur.b), info = [cur.scenes.length ? `Escenas ${cur.scenes.join(', ')}` : 'Ya no está en el guion', ie.length ? ie[0] + ie.slice(1).map(x => (/^i/i.test(x) ? ' e ' : ' y ') + x.toLowerCase()).join('') : '', dn.length ? capFirst(dn.join(' y ')) : ''].filter(Boolean).join(' · ');
    const keys = d.cands.flatMap(c => (c.ph || []).map(p => scPhKey(c.id, p.id)));
    candFramesNeed(keys, 'scout');
    const order = [...d.cands].sort((a, b) => (b.id === d.pick) - (a.id === d.pick) || (a.status === 'descartada') - (b.status === 'descartada'));
    const addBtn = ed ? hdBtn('pri', 'Agregar candidata', { icon: 'plus', attrs: 'data-act="sc-add"' }) : '';
    body = `<section class="hd cand-hd">${hdHead({ title: esc(titleCase(cur.b)), sub: esc(info), act: (order.length ? addBtn : '') + (typeof sbScoutBtn === 'function' ? sbScoutBtn(cur) : '') })}</section>
      ${order.length ? `<div class="cand-grid">${order.map(c => scCandHTML(d, c, ed)).join('')}</div>`
        : hdEmpty({ icon: 'pin', title: 'Aún no hay candidatas', text: `Agrega cada sitio que visites con sus fotos, su dirección y quién da el permiso. Al elegir una, pasa al plan de rodaje como la locación de ${cur.scenes.length === 1 ? 'su escena' : 'sus ' + cur.scenes.length + ' escenas'}.`, btn: addBtn })}
      <label class="hd-tx hd-txc cand-pn"><span>Notas del lugar</span><textarea class="cand-in" rows="2" data-bind="sc-pnote" placeholder="${ea(ed ? 'Qué pide el guion: época, tamaño, vista, acceso para el equipo' : '')}" ${ed ? '' : 'readonly'}>${esc(d.note)}</textarea></label>`;
  }
  v.innerHTML = `<div class="ws ws-2">
    <aside class="side" id="side">${side}</aside>
    <section class="center">
      <div class="bar"><button class="btn ghost only-narrow" data-act="drawer" data-d="#side">Lugares</button>${smViewSeg()}<span class="grow"></span>${toolsHTML()}</div>
      <div class="scroller pad" data-keep="sc-${ea(cur ? cur.b : '')}">${body}</div>
    </section></div>`;
  bindView(); bindSceneSearch();
};
function scCand(id) { for (const [b, pl] of Object.entries(SCT().places)) { const c = pl.cands.find(x => x.id === id); if (c) return { b, pl, c }; } return null; }
/* la elegida, en el plan: el lugar del guion apunta a ella y su dirección queda en la lista de locaciones */
function scSyncPick(b, oldName) {
  const pl = scPlaceData(b), c = pl.pick && pl.cands.find(x => x.id === pl.pick); if (!c) return;
  const S = P.schedule; S.setLoc = S.setLoc || {}; S.locs = S.locs || [];
  const name = c.name.trim() || titleCase(b);
  if (oldName && oldName !== name) {
    const others = Object.entries(S.setLoc).some(([k, v]) => k !== b && v === oldName);
    const L = S.locs.find(l => l.name === oldName);
    if (L && !others && !S.locs.some(l => l.name === name)) L.name = name;
  }
  S.setLoc[b] = name;
  const L = S.locs.find(l => l.name === name);
  if (L) { if (c.addr.trim()) L.addr = c.addr.trim(); } else S.locs.push({ name, addr: c.addr.trim() });
}
function scPick(id) {
  const x = scCand(id); if (!x) return;
  const { b, pl, c } = x;
  if (!c.name.trim()) c.name = titleCase(b);
  pl.pick = id;
  if (c.status === 'visitar' || c.status === 'visitada') c.status = 'aprobada';
  scSyncPick(b);
  const n = D.sc.scenes.filter(s => (s.locBase || s.loc) === b).length;
  changed('data'); render();
  toast(`«${c.name}» queda como la locación de ${n === 1 ? 'su escena' : n + ' escenas'} en el plan de rodaje.`, 4600);
}
function scUnpick(id) {
  const x = scCand(id); if (!x) return;
  const { b, pl, c } = x, S = P.schedule;
  pl.pick = null;
  if (S.setLoc && S.setLoc[b] === (c.name.trim() || titleCase(b))) delete S.setLoc[b];
  changed('data'); render();
}
Object.assign(ACT, {
  'sc-place': b => { UI.scPlace = b.dataset.b; closeDrawers(); render(); },
  'sc-add': () => {
    const b = UI.scPlace; if (!b) return;
    const pl = scPlaceData(b, true), id = uid('l');
    pl.cands.push({ id, name: '', addr: '', map: '', contact: '', phone: '', permit: '', cost: '', status: 'visitar', notes: '', ph: [] });
    changed('data'); render();
    requestAnimationFrame(() => { const el = $(`.cand[data-c="${CSS.escape(id)}"] .cand-n`); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } });
  },
  'sc-pick': b => scPick(b.dataset.id),
  'sc-unpick': b => scUnpick(b.dataset.id),
  'sc-more': b => {
    const x = scCand(b.dataset.id); if (!x) return;
    popover(b, '<div class="menu"><button data-m="dup">Duplicar</button><button data-m="del">Quitar la candidata</button></div>', p => p.addEventListener('click', e => {
      const m = e.target.closest('[data-m]'); if (!m) return; closePop();
      if (m.dataset.m === 'dup') { const c = { ...JSON.parse(JSON.stringify(x.c)), id: uid('l'), ph: [], name: x.c.name ? x.c.name + ' (copia)' : '' }; x.pl.cands.splice(x.pl.cands.indexOf(x.c) + 1, 0, c); changed('data'); render(); }
      else {
        const frames = Object.fromEntries((x.c.ph || []).map(p => [scPhKey(x.c.id, p.id), FRAMES[scPhKey(x.c.id, p.id)]]).filter(([, u]) => u));
        histNote('Quitar una candidata', frames, 'scout');
        if (x.pl.pick === x.c.id) scUnpick(x.c.id);
        for (const p of x.c.ph || []) { const k = scPhKey(x.c.id, p.id); delete FRAMES[k]; Store.saveFrame(P.id, k, null).catch(() => { }); }
        x.pl.cands = x.pl.cands.filter(c => c !== x.c);
        changed('data'); render(); toastUndo('Candidata quitada.');
      }
    }));
  },
  // la foto en grande, con las demás de la misma locación para pasar con las flechas
  'sc-view': b => { const x = scCand(b.dataset.id); if (!x) return; const ks = (x.c.ph || []).map(p => scPhKey(x.c.id, p.id)); photoViewer(ks, x.c.name || '', { at: ks.indexOf(scPhKey(x.c.id, b.dataset.p)) }); },
  'sc-phdel': b => { const x = scCand(b.dataset.id); if (!x) return; candDelPhoto(x.c, pid => scPhKey(x.c.id, pid), b.dataset.p, 'scout'); render(); toastUndo('Foto quitada.'); },
  'cand-pro': () => proGate('photos'),
});
Object.assign(BIND, {
  'sc-c': (el, ev) => {
    const x = scCand(el.dataset.id); if (!x) return;
    const f = el.dataset.f, old = x.c.name.trim() || titleCase(x.b);
    x.c[f] = el.value;
    if (f === 'map' && ev === 'change') candGeoStore(x.c);   // (lote W) las coordenadas del enlace nuevo
    if (x.pl.pick === x.c.id && (f === 'name' || f === 'addr') && ev === 'change') scSyncPick(x.b, f === 'name' ? old : null);
    changed('data');
    if (ev === 'change' && (f === 'status' || f === 'map')) render();
  },
  'sc-pnote': el => { const pl = scPlaceData(UI.scPlace, true); pl.note = el.value; changed('data'); },
  'sc-up': async (el, ev) => {
    if (ev !== 'change' || !el.files.length) return;
    const x = scCand(el.dataset.id); if (!x) return;
    const n = await candAddPhotos(x.c, pid => scPhKey(x.c.id, pid), el.files);
    if (n) render();
  },
});
HELP.scout = [
  ['Lugares', 'A la izquierda, cada lugar que pide el guion (la locación del encabezado de sus escenas), con cuántas candidatas tiene y la elegida (✓).'],
  ['Candidatas', '«+ Candidata» agrega un sitio que visitaste o que vas a visitar: fotos, dirección, enlace al mapa, quién da el permiso, su teléfono, el costo por día y notas (luz, ruido, acceso…).'],
  ['Elegir', '«Elegir esta locación» la deja como la locación de esas escenas en el plan de rodaje, con su dirección; de ahí pasa a la hoja de llamado.'],
  ['Mapa general', 'En «Mapa general», todas las candidatas de todos los lugares en un mapa: el pin dice su estado (rojo con ✓ la elegida, oscuro la aprobada, blanco la visitada, punteado la que falta visitar, gris chico la descartada). Toca un pin o una candidata de la lista para ver su tarjeta, con «Abrir ficha» y «Cómo llegar». El lugar sale solo del enlace de Google Maps; si el enlace no lo trae, «Ubicar en el mapa» y toca dónde está (el pin se arrastra para corregir).'],
  ['Equipo', 'El scouting viaja con el plan de rodaje: lo edita quien puede editar el plan.'],
  ['Exportar', 'Un dossier en PDF con cada lugar y sus candidatas, con o sin fotos, o solo con las elegidas.'],
];
EXPORTS.scout = () => [
  { label: 'Dossier de locaciones', hint: 'PDF con fotos: cada lugar y sus candidatas', run: btn => exportPDF('scouting', btn, { photos: true }), pdf: { kind: 'scouting', opts: { photos: true } } },
  { label: 'Dossier sin fotos', hint: 'PDF liviano, para imprimir', run: btn => exportPDF('scouting', btn, { photos: false }), pdf: { kind: 'scouting', opts: { photos: false } } },
  { label: 'Locaciones elegidas', hint: 'PDF: solo la elegida de cada lugar, con fotos', run: btn => exportPDF('scouting', btn, { photos: true, picked: true }), pdf: { kind: 'scouting', opts: { photos: true, picked: true } } },
];

/* ---------- PDF (compartido con el casting): una tarjeta por candidata, con sus datos y sus fotos ---------- */
function pdfCandBlock(doc, y, c, keyOf, rows, opts, title, tag) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;
  const sub = docHeaderSub(doc);
  const ph = opts.photos ? (c.ph || []).filter(p => FRAMES[keyOf(p.id)]) : [];
  const cols = 3, gap = 8, bw = (W - M * 2 - gap * (cols - 1)) / cols, bh = bw * .7;
  // (lote K) los datos en la letra del cuerpo, con su interlineado
  const LH = PF.body * PF.lh;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(PF.body);
  const lines = rows.filter(([, v]) => String(v || '').trim()).map(([k, v]) => doc.splitTextToSize(pdfSafe(`${k}: ${v}`), W - M * 2));
  const need = 20 + lines.reduce((a, L) => a + L.length * LH, 0) + (ph.length ? bh + gap : 0) + 12;
  if (y + Math.min(need, 20 + 44 + bh) > H - 40) { doc.addPage(); y = sub(); }
  doc.setFont('title', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK);
  doc.text(pdfSafe(title), M, y + 10);
  if (tag) { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...OKC); doc.text(pdfSafe(tag), W - M, y + 10, { align: 'right' }); }
  y += 18;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(PF.body); doc.setTextColor(...INK);
  for (const L of lines) { if (y + L.length * LH > H - 40) { doc.addPage(); y = sub(); } doc.text(L, M, y + 7); y += L.length * LH; }
  if (ph.length) {
    y += 4;
    ph.slice(0, 6).forEach((p, j) => {
      const col = j % cols;
      if (col === 0 && j) y += bh + gap;
      if (col === 0 && y + bh > H - 40) { doc.addPage(); y = sub(); }
      const url = photoForPdf(keyOf(p.id));
      let w = p.w || 4, h = p.h || 3;
      const k = Math.min(bw / w, bh / h), iw = w * k, ih = h * k, x0 = M + col * (bw + gap);
      doc.setFillColor(...PT.soft); doc.rect(x0, y, bw, bh, 'F');
      try { doc.addImage(url, 'JPEG', x0 + (bw - iw) / 2, y + (bh - ih) / 2, iw, ih, undefined, 'FAST'); } catch (e) { if (typeof PDF_MISS !== 'undefined') PDF_MISS++; }
    });
    y += bh + gap;
  }
  y += 8;
  doc.setDrawColor(...PT.line); doc.setLineWidth(.5); doc.line(M, y - 5, W - M, y - 5);
  return y;
}
/* encabezado de las páginas siguientes de un PDF de candidatas (el mismo de la primera) */
let PDF_CAND_HEAD = null;
const docHeaderSub = doc => () => PDF_CAND_HEAD ? docHeader(doc, PDF_CAND_HEAD[0], PDF_CAND_HEAD[1]) : 50;
function pdfGroupBand(doc, y, title, sub) {
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;
  if (y + 80 > H - 40) { doc.addPage(); y = docHeaderSub(doc)(); }
  doc.setFillColor(...PT.fill2); doc.rect(M, y, W - M * 2, 24, 'F');
  doc.setFont('title', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...INK); doc.text(pdfSafe(title), M + 8, y + 16);
  if (sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.text(pdfSafe(sub), W - M - 8, y + 16, { align: 'right' }); }
  return y + 34;
}
function pdfScouting(opts = {}) {
  const doc = newDoc('portrait'), places = scoutPlaces().filter(p => scPlaceData(p.b).cands.length);
  const cur = (P.budget && P.budget.currency) || 'S/';
  const label = opts.picked ? 'Locaciones elegidas' : 'Scouting de locaciones';
  PDF_CAND_HEAD = [label, `${places.length} lugares`];
  let y = docHeader(doc, ...PDF_CAND_HEAD);
  try {
    if (!places.length) { doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text('Aún no hay candidatas.', 40, y + 10); }
    for (const p of places) {
      const d = scPlaceData(p.b);
      let L = [...d.cands].sort((a, b) => (b.id === d.pick) - (a.id === d.pick));
      if (opts.picked) L = L.filter(c => c.id === d.pick);
      if (!L.length) continue;
      y = pdfGroupBand(doc, y, titleCase(p.b), p.scenes.length ? 'Escenas ' + p.scenes.join(', ') : '');
      if (d.note.trim() && !opts.picked) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED); const nl = doc.splitTextToSize(pdfSafe(d.note), doc.internal.pageSize.getWidth() - 80); doc.text(nl, 40, y + 4); y += nl.length * 11 + 6; }
      for (const c of L) {
        y = pdfCandBlock(doc, y, c, pid => scPhKey(c.id, pid), [
          ['Estado', (SC_ST.find(s => s[0] === c.status) || [])[1]], ['Dirección', c.addr], ['Mapa', c.map], ['Contacto', [c.contact, c.phone].filter(Boolean).join(' · ')],
          ['Permiso', c.permit ? (SC_PERMIT.find(s => s[0] === c.permit) || [])[1] : ''], ['Costo por día', c.cost ? `${cur} ${c.cost}` : ''], ['Notas', c.notes],
        ], opts, c.name || 'Sin nombre', c.id === d.pick ? 'ELEGIDA' : '');
      }
    }
  } finally { PDF_CAND_HEAD = null; }
  pageNumbers(doc, label);
  return { doc, name: fileSafe(P.meta.title) + (opts.picked ? '_locaciones_elegidas' : '_scouting') + (opts.photos === false ? '_sin_fotos' : '') + '.pdf' };
}
PDFX.scouting = pdfScouting;
