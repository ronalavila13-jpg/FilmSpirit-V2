/* ============================================================
   VERSIÓN 2 · HOJA DE LLAMADO (PDF «FilmSpirit · versión 2», página Hoja de llamado)
   Las jornadas en pestañas (y las hojas libres); la hoja en una tarjeta: la cabecera con el llamado general en
   amarillo, la locación, las escenas del día con sus planos, la citación de talentos, el equipo técnico (con los
   jefes de área), requerimientos, seguridad y notas, y el avance. Los datos y los campos son los de la v1
   (tab-call.js · callSheetData): lo que se escribe aquí se guarda igual y sale igual en el PDF y el Excel.
   ============================================================ */
V2_ACTS.call = () => (callEditable() && !callIsFree(callRef()) ? `<button type="button" class="v2-btn" data-v2a="cldate">${v2I('cal')}<span>Cambiar fecha</span></button>` : '')
  + v2Hist() + `<button type="button" class="v2-btn y" data-v2a="clpdf">${v2I('print')}<span>Ver y exportar PDF</span></button>`;
V2_DO.cldate = b => { if (typeof clDateMenu === 'function') clDateMenu(b); };
V2_DO.clpdf = b => { if (typeof exportPDF === 'function') exportPDF('call', b, { all: false }); };

const v2Hm = v => (v || '').replace('~', '');
/* «sábado 31 de octubre de 2026» */
const v2LongDate = d => d ? d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(',', '') : '';
const v2ShortDay = d => d ? `${V2_WD[d.getDay()]} ${d.getDate()}` : '';

function v2CallTabs(X) {
  const cd = callDays(), ref = callRef();
  return `<div class="v2-cltabs">${cd.days.map((d, j) => `<button type="button" class="v2-clt${ref === j ? ' on' : ''}" data-act="cl-day" data-d="${j}">Jornada ${j + 1}${cd.dates[j] ? ' · ' + esc(v2ShortDay(callSheet(j, cd).date)) : ''}</button>`).join('')}
    ${callFrees().map(f => `<button type="button" class="v2-clt${ref === f.id ? ' on' : ''}" data-v2free="${ea(f.id)}">${esc((f.name || '').trim() || 'Hoja libre')}</button>`).join('')}
    ${callEditable() ? `<button type="button" class="v2-clt add" data-act="cl-free-new">${v2I('plus')}Hoja libre</button>` : ''}</div>`;
}
function v2CallHead(X) {
  // (lote AJ) en tres columnas, en el orden del PDF. Izquierda, dos cuadros: la productora con la jefatura de producción y la
  // dirección, y los contactos de rodaje · centro: el proyecto, la fecha, el llamado general y sus cuatro horas · derecha:
  // la locación (y las demás locaciones, en fila) y el centro de salud
  const L = X.loc, logo = imgDataOk(P.meta.logo), ed = callEditable(), TBC = 'Por confirmar';
  const item = k => `<div class="v2-chk"><span>${esc(k.lab)}</span><b${k.name ? '' : ' class="miss"'}>${esc(k.name || TBC)}</b>${k.phone ? `<a href="tel:${ea(k.phone.replace(/[^\\d+]/g, ''))}">${esc(k.phone)}</a>` : ''}</div>`;
  const tm = (f, val, ph, lab) => ed ? `<input type="text" class="tm v2-clmid" data-bind="cs-day" data-f="${f}" value="${esc(val)}" inputmode="numeric" maxlength="5" placeholder="${ea(ph || '--:--')}" aria-label="${ea(lab)}">` : `<b>${esc(val || ph || '—')}</b>`;
  const inf = X.free ? null : dayInfo(X.de.keys, X.de.rows), nSh = X.sched.rows.reduce((a, r) => a + (r.shots ? r.shots.length : 0), 0), nSc = X.de.keys.length;
  const sum = X.free ? '' : [inf.e ? fmtEighths(inf.e) + ' págs.' : '', nSc + (nSc === 1 ? ' escena' : ' escenas'), X.sched.byShot ? nSh + ' planos' : ''].filter(Boolean).join(' · ');
  const own = ((X.dd.loc || {}).name || '').trim(), more = !own && L.locs.length > 1 ? L.locs : [];
  const hin = (f, ph, lab, v) => ed ? `<input type="text" data-bind="cs-hosp" data-f="${f}" value="${esc((X.dd.hosp || {})[f] || '')}" placeholder="${ea(v || ph)}" aria-label="${ea(lab)}">` : (v ? `<span>${esc(v)}</span>` : '');
  return `<div class="v2-clhead v2-ch3">
      <div class="v2-chl">
        <div>${logo ? `<img class="v2-cllogo" src="${esc(logo)}" alt="">` : `<span class="v2-cllogo">${typeof logoSVG === 'function' ? logoSVG() : ''}</span>`}
          ${[...X.keyCrew.slice(0, 2), ...(X.keyMore || [])].map(item).join('')}</div>
        <div><h3>Contactos</h3>${X.contacts.map(item).join('')}</div>
      </div>
      <div class="v2-chc">
        <div class="v2-cht"><h2>${esc(P.meta.title || '')}</h2><p>Hoja de llamado · ${esc(X.free ? (X.title || 'Hoja libre') : `Jornada ${X.n + 1} de ${X.total}`)}</p><p class="d">${esc(X.date ? cap1(v2LongDate(X.date)) : 'Sin fecha')}</p></div>
        <div class="v2-clcall"><span>Llamado general</span>${ed ? `<input type="text" class="tm v2-clbig" data-bind="cs-day" data-f="crewCall" value="${esc(X.call || '')}" inputmode="numeric" maxlength="5" placeholder="--:--" aria-label="Llamado general">` : `<b>${esc(X.call || '--:--')}</b>`}</div>
        <div class="v2-ch4">
          <div><span>Listos motor</span>${tm('motor', X.dd.motor || '', v2Hm(X.motor), 'Listos motor')}</div>
          <div><span>Almuerzo</span>${tm('lunch', X.dd.lunch || '', v2Hm(X.lunch), 'Almuerzo')}</div>
          <div><span>Cierre de set</span>${tm('cierre', v2Hm(X.dd.cierre || X.cierre), '', 'Cierre de set')}</div>
          <div><span>Wrap</span>${tm('end', v2Hm(X.dd.end || X.end), '', 'Wrap')}</div>
        </div>
        ${sum ? `<p class="v2-chs">${esc(sum)}</p>` : ''}
        ${v2CallWx(X)}
      </div>
      <div class="v2-chr">
        <div class="v2-clloc">${v2I('pin')}<div><span>Locación</span><b class="n">${esc(more.length ? 'Locaciones del día' : L.name || 'Sin locación')}</b>
          ${more.length ? `<ul>${more.map(([n, ad]) => `<li><b>${esc(n)}</b>${ad ? `<span>${esc(ad)}</span>` : ''}</li>`).join('')}</ul>` : ed ? `<span class="v2-claddr${L.addr ? '' : ' miss'}"><i class="v2-dot"></i><input type="text" data-bind="cl-loc" data-f="addr" value="${esc((X.dd.loc || {}).addr || '')}" placeholder="${esc(L.pAddr || '[Dirección de la locación]')}" aria-label="Dirección de la locación"></span>` : `<span>${esc(L.addr || '')}</span>`}
          ${L.url || L.name ? `<a class="v2-btn k sm" href="${esc(L.url || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(L.name))}" target="_blank" rel="noopener">Ver mapa ${v2I('ext')}</a>` : ''}</div></div>
        <div class="v2-chh"><span>Centro de salud</span>${hin('name', 'Nombre del centro de salud', 'Centro de salud', X.hosp.name)}${hin('addr', 'Dirección', 'Dirección del centro de salud', X.hosp.addr)}${hin('phone', 'Teléfono', 'Teléfono del centro de salud', X.hosp.phone)}</div>
      </div>
    </div>`;
}
/* (lote AJ) el clima y los datos del día, dentro del recuadro del centro de la cabecera, bajo las páginas: el clima, y debajo
   máxima, mínima, humedad y lluvia; y viento, amanecer y anochecer */
function v2CallWx(X) {
  const ed = callEditable(), dd = X.dd;
  const cell = (lab, f, bind, ph, u, tmc, cls) => {
    const raw = dd[f] || '', n = wxNum(raw), val = n !== null ? n : raw;
    return `<div class="${cls}"><span>${esc(lab)}</span>${ed ? `<span class="v2-wu"><input type="text" class="${tmc ? 'tm' : ''}" data-bind="${bind}" data-f="${f}" value="${esc(val)}" placeholder="${ea(ph)}" aria-label="${ea(lab)}"${tmc ? ' inputmode="numeric" maxlength="5"' : ''}>${u && n !== null ? `<i>${esc(u)}</i>` : ''}</span>` : `<b>${esc(val ? val + (n !== null ? u : '') : '—')}</b>`}</div>`;
  };
  const F = Object.fromEntries(WX_FIELDS.map(x => [x.f, x])), c3 = (f, lab) => cell(lab || F[f].lab, f, 'cs-wx', F[f].ph, WX_U[f], false, 'c3');
  return `<div class="v2-clwx" aria-label="Clima y datos del día">${cell('Clima', 'wx', 'cs-wx', 'Soleado, nublado…', WX_U.wx, false, 'c12')}${c3('hi')}${c3('lo')}${c3('hum')}${c3('rain', 'Lluvia')}${cell('Viento', 'wind', 'cs-wx', F.wind.ph, WX_U.wind, false, 'c4')}${cell('Amanece', 'sunrise', 'cs-day', '--:--', '', true, 'c4')}${cell('Anochece', 'sunset', 'cs-day', '--:--', '', true, 'c4')}</div>`;
}
function v2CallNote(X) {
  const ed = callEditable(), n = X.dd.notes || '';
  if (!ed && !n.trim()) return '';
  return `<section class="v2-clbox v2-clnote"><h3>Nota para el equipo</h3>${ed ? `<textarea class="v2-cin" rows="2" data-bind="cs-day" data-f="notes" placeholder="Seguridad, ropa, estacionamiento, lo que no se puede publicar…" aria-label="Nota para el equipo">${esc(n)}</textarea>` : `<p>${esc(n)}</p>`}</section>`;
}
function v2CallQuote(X) {
  const ed = callEditable();
  return `<section class="v2-clbox v2-clquote"><h3>Frase del día</h3>${ed ? `<textarea class="v2-cin" rows="2" data-bind="cs-day" data-f="quote" placeholder="${ea(X.quote)}" aria-label="Frase del día">${esc(X.quoteOwn ? X.dd.quote : '')}</textarea>${X.quoteOwn ? '' : '<small>Una frase para animar al equipo. Escribe la tuya o se queda esta.</small>'}` : `<p>«${esc(X.quote)}»</p>`}</section>`;
}
function v2CallScenes(X) {
  // (lote AJ) como la hoja exportada: Hora · Esc., I/E, Escena (encabezado, sinopsis y reparto con su número), D/N y páginas,
  // la fila de la escena con el color de su tira y, debajo, sus planos con su miniatura
  const all = [...X.sched.rows, ...X.sched.close];
  if (!all.length) return '';
  const byShot = X.sched.byShot, th = callThumbs(), dis = callEditable() ? '' : 'disabled', inf = dayInfo(X.de.keys, X.de.rows);
  const opts = byShot ? `<span class="v2-clopts"><label title="Reparte la hora de cada escena entre sus planos"><input type="checkbox" data-bind="cl-shott" ${X.shotT ? 'checked' : ''} ${dis}> Hora por plano</label><label title="La viñeta del storyboard de cada plano"><input type="checkbox" data-bind="cl-thumbs" ${th ? 'checked' : ''} ${dis}> Miniaturas del storyboard</label></span>` : '';
  const small = t => t ? `<small>${esc(t)}</small>` : '';
  const body = all.map(r => {
    const V = r.v || {};
    if (r.free) return `<tr class="sc"><td class="c-he"><b>${esc(V.code || '')}</b>${small(r.x && r.x.t)}</td><td class="c-ie">${esc(V.ie || '')}</td><td><b class="h">${esc(V.set || '')}</b>${V.syn ? `<span class="syn">${esc(V.syn)}</span>` : ''}${V.cast ? `<b class="cs">${esc(V.cast)}</b>` : ''}</td><td class="c-m">${esc(V.dn || '')}</td><td class="c-p"><b>${esc(V.pages || '')}</b></td></tr>`;
    if (r.ev) return `<tr class="ev${isMove(r) ? ' mv' : ''}"><td class="c-he"><b>${esc(r.t0 || r.t || '')}</b></td><td colspan="4"><b>${esc(V.name || r.name || '')}</b>${V.det ? ` <span>${esc(V.det)}</span>` : ''}</td></tr>`;
    const col = r.col, dk = typeof lgDark === 'function' && lgDark(col);
    const head = `<tr class="sc" style="--sc:${ea(col)};--sci:${dk ? '#f4f4f4' : '#111'}"><td class="c-he"><b>${esc(V.code || '')}</b>${small(r.t0 || r.t)}</td><td class="c-ie">${esc(V.ie || '')}</td><td><b class="h">${esc((V.set || '') + (r.it && r.it.sp && !(r.ov && r.ov.set) ? ` (parte ${r.it.sp})` : ''))}</b>${V.syn ? `<span class="syn">${esc(V.syn)}</span>` : ''}${V.cast ? `<b class="cs">${esc(V.cast)}</b>` : ''}</td><td class="c-m">${esc(V.dn || '')}</td><td class="c-p"><b>${esc(V.pages || '')}</b></td></tr>`;
    const shots = (r.shots || []).map(x => {
      const xv = x.v || {}, setX = !x.free && r.set && r.s && !setOf(r.s).toLowerCase().includes(r.set.toLowerCase()) ? r.set : '';
      const desc = x.free || (x.ov && x.ov.desc) ? esc(xv.desc || '') : `<b>${esc(x.size || '')}</b>${(x.det || []).length ? ` <span>${x.size ? '· ' : ''}${esc(x.det.join(' · '))}</span>` : ''}`;
      return `<tr class="sh"><td class="c-he"><b>${esc(x.code || '')}</b>${X.shotT ? small(x.t0) : ''}</td><td colspan="2"><div class="v2-shg">${th && x.sh ? callThumb(x.sh) : ''}<div><div>${desc}</div>${xv.act ? `<div class="act">${esc(xv.act)}</div>` : ''}${setX ? `<small>Set: ${esc(setX)}</small>` : ''}</div></div></td><td class="c-m">${esc(xv.lens || '')}${small(xv.snd && (typeof SND_NAME !== 'undefined' && SND_NAME[xv.snd] || xv.snd))}</td><td class="c-p">${esc(xv.cast || '')}</td></tr>`;
    }).join('');
    return head + shots;
  }).join('');
  const nSc = X.de.keys.length;
  return `<div class="v2-clhr"><h3 class="v2-clh">Escenas del día</h3>${opts}</div>
    <div class="v2-cltbl v2-clsc"><table><thead><tr><th class="c-he">Hora · Esc.</th><th class="c-ie">I/E</th><th>Escena</th><th class="c-m">D/N</th><th class="c-p">Págs.</th></tr>${byShot ? '<tr class="h2"><th>Plano</th><th colspan="2">Descripción y acción</th><th>Lente · Sonido</th><th>Personajes</th></tr>' : ''}</thead>
    <tbody>${body}<tr class="wr"><td class="c-he"><b>${esc(X.end || '')}</b></td><td colspan="3"><b>Wrap · fin de jornada</b> <span>${nSc} ${nSc === 1 ? 'escena' : 'escenas'}</span></td><td class="c-p">Total <b>${esc(fmtEighths(inf.e))}</b></td></tr></tbody></table></div>`;
}
function v2CallTalent(X) {
  if (!X.talent.length) return '';
  const ed = callEditable();
  const tin = (r, f, v, lab, tm) => ed && !r.free ? `<input type="text" class="v2-cin${tm ? ' tm' : ''}" data-bind="${tm ? 'cs-cast' : 'cs-tal'}" data-id="${ea(r.el.id)}" data-f="${ea(f)}" value="${esc(v || '')}" aria-label="${ea(lab)}"${tm ? ' inputmode="numeric" maxlength="5" placeholder="--:--"' : ''}>` : esc(v || '—');
  return `<h3 class="v2-clh">Citación de talentos</h3>
    <div class="v2-cltbl"><table><thead><tr><th class="c-n">N.º</th><th class="c-r">Personaje</th><th>Actor o actriz</th><th class="c-t">Llamado</th><th class="c-t">Maquillaje</th><th class="c-t">En set</th><th class="c-ph">Teléfono</th></tr></thead><tbody>
    ${X.talent.map(r => `<tr><td class="c-n"><b>${esc(String(r.num || ''))}</b></td><td class="c-r"><b>${esc((r.role || '').toUpperCase())}</b></td>
      <td>${tin(r, 'actor', r.actor, 'Actor o actriz')}</td><td class="c-t"><b>${tin(r, 'call', r.call || X.call, 'Llamado', 1)}</b></td><td class="c-t">${tin(r, 'mq', r.mq, 'Maquillaje', 1)}</td><td class="c-t">${tin(r, 'ready', r.ready, 'En set', 1)}</td><td class="c-ph">${tin(r, 'phone', r.phone, 'Teléfono')}</td></tr>`).join('')}
    </tbody></table></div>`;
}
const V2_AREA = { 'Equipo de dirección': 'Dirección', 'Cámara': 'Fotografía' };
function v2CallCrew(X) {
  const heads = new Set((X.heads || []).map(h => h.k));
  // las áreas con los nombres del PDF: Dirección (la directora y su equipo), Producción, Fotografía… y Continuidad al final
  const area = (a, r) => /script|continuidad/i.test(r.role || '') ? 'Continuidad' : /^direct|^direcci[oó]n$/i.test(r.role || '') && a === 'Producción' ? 'Dirección' : V2_AREA[a] || a;
  const ord = a => a === 'Dirección' ? 0 : a === 'Continuidad' ? 2 : 1;
  const rows = X.crew.flatMap(([a, list]) => list.map(r => ({ area: area(a, r), r }))).map((x, i) => ({ ...x, i })).sort((p, q) => ord(p.area) - ord(q.area) || p.i - q.i);
  if (!rows.length) return '';
  return `<h3 class="v2-clh">Equipo técnico <small>Jefes de área con su teléfono</small></h3>
    <div class="v2-cltbl"><table><thead><tr><th class="c-a">Área</th><th class="c-g">Cargo</th><th>Nombre</th><th class="c-t">Llamado</th><th class="c-ph">Teléfono</th></tr></thead><tbody>
    ${rows.map(({ area, r }) => `<tr><td class="c-a">${esc(area)}</td><td class="c-g"><b>${esc(r.role || '')}</b>${heads.has(r.k) || (r.head === true) ? ' <span class="v2-jefe">Jefe/a</span>' : ''}</td><td>${esc(r.name || '')}</td><td class="c-t"><b>${esc(r.call || '')}</b></td><td class="c-ph">${esc(r.phone || '—')}</td></tr>`).join('')}
    </tbody></table></div>`;
}
function v2CallBoxes(X) {
  const els = cats => { const out = []; for (const k of X.de.keys) { const s = sceneOfKey(k); if (!s) continue; for (const id of D.sem[s.idx]) { const e = P.elements[id]; if (e && cats.includes(e.cat) && !out.includes(e.name)) out.push(e.name); } } return out.join(', '); };
  const req = [['Utilería', X.propsTxt || els(['props', 'weapons', 'sfx'])], ['Vestuario', els(['wardrobe', 'makeup'])], ['Vehículos', els(['vehicles', 'animals'])], ['Equipo', els(['equip'])]].filter(x => x[1]);
  const breakfast = (X.sched.rows.find(r => r.ev && /desayuno/i.test(r.name || '')) || {}).t0 || '';
  const hosp = (X.hosp && X.hosp.name) || '';
  const ed = callEditable();
  return `<div class="v2-clboxes">
    ${req.length ? `<section class="v2-clbox"><h3>Requerimientos</h3><dl>${req.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></section>` : ''}
    ${breakfast ? `<section class="v2-clbox"><h3>Jornada</h3><dl>
      ${breakfast ? `<dt>Desayuno</dt><dd>${esc(breakfast)} en la locación</dd>` : ''}
    </dl></section>` : ''}</div>`;
}
function v2CallAdv(X) {
  const A = X.adv;
  if (!A) return X.free ? '' : `<section class="v2-cladv"><header><b>Fin de rodaje</b><span>Esta es la última jornada del plan.</span></header></section>`;
  const loc = A.locs.join(', ');
  return `<section class="v2-cladv"><header><b>Avance · jornada ${A.n}</b><span>${esc(A.date ? cap1(A.date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')) : '')}${A.call ? ' · llamado ' + esc(A.call) : ''}${loc ? ' · ' + esc(loc) : ''}</span>
      ${callEditable() ? `<button type="button" class="v2-btn sm" data-v2adv>Elegir otra jornada</button>` : ''}</header>
    <div class="v2-cladvl">${A.rows.map(r => `<span><b>${esc(r.code)}</b>${esc(r.ie)}. ${esc(titleCase(r.set))} · ${esc((r.dn || '').toLowerCase())}</span>`).join('')}</div></section>`;
}

RENDER.call = (orig => function () {
  if (!V2.on) return orig.apply(this, arguments);
  const v = $('#view');
  if (!D.sc.scenes.length && !callFrees().length) { v.innerHTML = `<div class="v2-pg">${emptyScript()}</div>`; bindView(); return; }
  const cd = callDays();
  if (!callIsFree(callRef()) && !cd.days[callRef()]) {
    if (!cd.days.length) { if (callFrees().length) UI.callFree = callFrees()[0].id; else return orig.apply(this, arguments); }
    else UI.callDay = 0;
  }
  callCrew();
  const X = callSheetData(callRef());
  const miss = callMissing(callRef()), changes = callChanges(X.dd);
  v.innerHTML = `<div class="v2-pg v2-cl">
    ${v2CallTabs(X)}
    <div class="v2-card v2-clsheet${callXL() ? ' v2-clx' : ''}">
      <div class="v2-cltop">${changes && !X.free ? `<span>Lo que cambies aquí no toca el plan de rodaje. <button type="button" class="v2-link" data-v2reset>Volver a lo del plan</button></span>` : '<span></span>'}
        ${miss.length ? `<button type="button" class="v2-btn sm v2-pill" data-v2miss><i class="v2-dot" style="--v2-dc:var(--v2-red)"></i>Faltan ${miss.length} ${miss.length === 1 ? 'dato' : 'datos'} para enviarla</button>` : '<span class="v2-ok2">Lista para enviar</span>'}
        <button type="button" class="v2-xl${callXL() ? ' on' : ''}" data-act="cl-style" data-v="${callXL() ? 'apple' : 'excel'}" aria-pressed="${ea(callXL())}" title="${ea(callXL() ? 'Estilo Cuadrícula (en la hoja y en el PDF): toca para volver al estilo Limpio' : 'Estilo Limpio (en la hoja y en el PDF): toca para pasar al estilo Cuadrícula')}" aria-label="Estilo Cuadrícula">${v2I('grid')}</button></div>
      ${v2CallHead(X)}
      ${v2CallNote(X)}
      ${v2CallScenes(X)}
      ${v2CallTalent(X)}
      ${v2CallCrew(X)}
      ${v2CallBoxes(X)}
      ${v2CallQuote(X)}
      ${v2CallAdv(X)}
    </div>
  </div>`;
  bindView();
  v2CallBind();
  if (callThumbs() && typeof hydrateThumbs === 'function') hydrateThumbs();
})(RENDER.call);
V2_ICO.pin = '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>';
V2_ICO.ext = '<path d="M8 16 16 8M10 8h6v6"/>';

function v2CallBind() {
  const v = $('#view');
  if (v._v2cl) return; v._v2cl = true;
  v.addEventListener('click', e => {
    if (UI.tab !== 'call') return;
    const f = e.target.closest('[data-v2free]'); if (f) { UI.callFree = f.dataset.v2free; render(); return; }
    const m = e.target.closest('[data-v2miss]');
    if (m) {
      const list = callMissing(callRef());
      popover(m, `<div class="menu"><h6>Antes de enviarla, falta:</h6>${list.map((x, i) => `<button type="button" data-i="${i}">${esc(x.txt)}${x.name ? ' ' + esc(x.name) : ''}</button>`).join('')}</div>`,
        p => p.addEventListener('click', ev => { const b = ev.target.closest('[data-i]'); if (!b) return; closePop(); const x = list[+b.dataset.i]; if (x.tab) { setTab(x.tab); return; } const el = x.sel && ($(x.sel, v) || $(({ call: '[data-f="crewCall"]', meet: '[data-bind="cl-loc"]', hosp: '[data-bind="cs-hosp"]', cast: '[data-bind="cs-tal"][data-f="actor"]', date: '' })[x.k] || '#none', v)); if (el && el.focus) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } else if (x.k === 'date' && typeof clDateMenu === 'function') clDateMenu(m); else if (x.k === 'crew') setTab('project'); }));
      return;
    }
    if (e.target.closest('[data-v2reset]')) {
      const id = curDayId(); if (!id) return;
      const dd = dayData(id);
      histNote('Volver a lo del stripboard');
      for (const k of ['rov', 'sov', 'rx', 'shx', 'castx', 'at', 'shotAt', 'dur', 'xrows', 'xsh', 'props', 'loc']) delete dd[k];
      changed('data'); render(); toastUndo('La hoja vuelve a lo del plan de rodaje.');
      return;
    }
    const a = e.target.closest('[data-v2adv]');
    if (a) {
      const cd = callDays(), S = callSheet(callRef(), cd), own = callAdvIds(callRef(), cd);
      popover(a, `<div class="menu">${cd.days.map((d, j) => d.id === S.d.id ? '' : `<button type="button" data-id="${ea(d.id)}"${own.includes(d.id) ? ' aria-current="true"' : ''}>Jornada ${j + 1}${cd.dates[j] ? ' · ' + esc(v2ShortDay(callSheet(j, cd).date)) : ''}</button>`).join('')}</div>`,
        p => p.addEventListener('click', ev => { const b = ev.target.closest('[data-id]'); if (!b) return; closePop(); const dd = dayData(S.d.id); dd.adv = [b.dataset.id]; changed('data'); render(); }));
    }
  });
  // las horas se escriben como 0700 → 07:00 (normHM, tab-call.js) y repintan al salir del campo
}
