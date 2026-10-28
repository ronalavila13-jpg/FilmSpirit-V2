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
const v2CallIn = (bind, f, val, lab, extra = '') => callEditable()
  ? `<input type="text" class="v2-cin${extra.includes('tm') ? ' tm' : ''}" data-bind="${ea(bind)}" data-f="${ea(f)}" value="${esc(val || '')}" aria-label="${ea(lab)}" ${extra.includes('tm') ? 'inputmode="numeric" maxlength="5" placeholder="--:--"' : ''}>`
  : `<span>${esc(val || '—')}</span>`;
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
  const L = X.loc, logo = imgDataOk(P.meta.logo);
  const dir = X.dir, prod = X.prod;
  return `<div class="v2-clhead">
      <div class="v2-clh1">
        ${logo ? `<img class="v2-cllogo" src="${esc(logo)}" alt="">` : `<span class="v2-cllogo">${typeof logoSVG === 'function' ? logoSVG() : ''}</span>`}
        <h2>${esc(P.meta.title || '')}</h2>
        <p>${esc(X.free ? (X.title || 'Hoja libre') : `Jornada ${X.n + 1} de ${X.total}`)}${X.date ? ' · ' + esc(v2LongDate(X.date)) : ''}</p>
        ${dir || prod ? `<p>${dir ? 'Dirección: ' + esc(dir) : ''}${dir && prod ? ' · ' : ''}${prod ? 'Producción: ' + esc(prod) : ''}</p>` : ''}
      </div>
      <div class="v2-clcall"><span>Llamado general</span>${callEditable() ? `<input type="text" class="tm v2-clbig" data-bind="cs-day" data-f="crewCall" value="${esc(X.call || '')}" inputmode="numeric" maxlength="5" placeholder="--:--" aria-label="Llamado general">` : `<b>${esc(X.call || '--:--')}</b>`}</div>
      <div class="v2-clends">
        <div><span>Cierre de set</span>${callEditable() ? `<input type="text" class="tm v2-clmid" data-bind="cs-day" data-f="cierre" value="${esc(v2Hm(X.dd.cierre || X.cierre))}" inputmode="numeric" maxlength="5" placeholder="--:--" aria-label="Cierre de set">` : `<b>${esc(v2Hm(X.cierre) || '—')}</b>`}</div>
        <div><span>Wrap</span>${callEditable() ? `<input type="text" class="tm v2-clmid" data-bind="cs-day" data-f="end" value="${esc(v2Hm(X.dd.end || X.end))}" inputmode="numeric" maxlength="5" placeholder="--:--" aria-label="Wrap">` : `<b>${esc(v2Hm(X.end) || '—')}</b>`}</div>
      </div>
      <div class="v2-clloc">${v2I('pin')}<b>${esc(L.name || 'Sin locación')}</b>
        ${callEditable() ? `<span class="v2-claddr${L.addr ? '' : ' miss'}"><i class="v2-dot"></i><input type="text" data-bind="cl-loc" data-f="addr" value="${esc((X.dd.loc || {}).addr || '')}" placeholder="${esc(L.pAddr || '[Dirección de la locación]')}" aria-label="Dirección de la locación"></span>` : `<span>${esc(L.addr || '')}</span>`}
        ${L.url ? `<a class="v2-btn k sm" href="${esc(L.url)}" target="_blank" rel="noopener">Ver mapa ${v2I('ext')}</a>` : ''}</div>
    </div>`;
}
function v2CallScenes(X) {
  const rows = X.sched.rows.filter(r => !r.ev && (r.s || r.free));
  if (!rows.length) return '';
  return `<h3 class="v2-clh">Escenas del día</h3>
    <div class="v2-cltbl"><table><thead><tr><th class="c-n">Esc.</th><th class="c-ie">I/E</th><th>Encabezado, sinopsis y planos</th><th class="c-m">Momento</th><th class="c-p">Págs.</th><th class="c-c">Reparto</th><th class="c-h">Hora aprox.</th></tr></thead><tbody>
    ${rows.map(r => {
      const v = r.v || r, s = r.s;
      if (!s) return `<tr><td class="c-n"><b>${esc(v.code || '')}</b></td><td class="c-ie">${esc(v.ie || '')}</td><td><b class="h">${esc(v.set || '')}</b>${v.syn ? `<span class="syn">${esc(v.syn)}</span>` : ''}</td><td class="c-m">${esc(v.dn || '')}</td><td class="c-p"><b>${esc(v.pages || '')}</b></td><td class="c-c">${esc(v.cast || '')}</td><td class="c-h"><b>${esc(r.t0 || '')}</b></td></tr>`;
      const t1 = r.start != null && r.dur ? minToHm(r.start + r.dur) : '';
      const shots = (r.shots || []).filter(x => x.sh).map(x => `<span class="v2-tag sm">${esc(D.code[x.sh.id] || '')} · ${esc(x.sh.size || '')}</span>`).join('');
      return `<tr><td class="c-n"><b>${esc(v.code || r.code)}</b></td><td class="c-ie">${esc(ieLab(s))}</td>
        <td><b class="h">${esc(setOf(s))}</b>${synopsisOf(s) ? `<span class="syn">${esc(synopsisOf(s))}</span>` : ''}${shots ? `<span class="shots">${shots}</span>` : ''}</td>
        <td class="c-m">${esc(DN_LAB[stripDN(s)] || '')}</td><td class="c-p"><b>${esc(r.pages || '')}</b></td><td class="c-c">${esc(castText(s))}</td><td class="c-h"><b>${esc(r.t0 || '')}${t1 ? ' – ' + esc(t1) : ''}</b></td></tr>`;
    }).join('')}</tbody></table></div>`;
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
function v2CallCrew(X) {
  const heads = new Set((X.heads || []).map(h => h.k));
  const rows = X.crew.flatMap(([area, list]) => list.map(r => ({ area, r })));
  if (!rows.length) return '';
  return `<h3 class="v2-clh">Equipo técnico <small>Jefes de área con su teléfono</small></h3>
    <div class="v2-cltbl"><table><thead><tr><th class="c-a">Área</th><th class="c-g">Cargo</th><th>Nombre</th><th class="c-t">Llamado</th><th class="c-ph">Teléfono</th></tr></thead><tbody>
    ${rows.map(({ area, r }) => `<tr><td class="c-a">${esc(area)}</td><td class="c-g"><b>${esc(r.role || '')}</b>${heads.has(r.k) || (X.keyCrew || []).some(k => k.k === r.k) ? ' <span class="v2-jefe">Jefe/a</span>' : ''}</td><td>${esc(r.name || '')}</td><td class="c-t"><b>${esc(r.call || '')}</b></td><td class="c-ph">${esc(r.phone || '—')}</td></tr>`).join('')}
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
    <section class="v2-clbox"><h3>Seguridad y notas</h3><dl>
      <dt>Hospital cercano</dt><dd>${ed ? `<span class="v2-claddr${hosp ? '' : ' miss'}"><i class="v2-dot"></i><input type="text" data-bind="cs-hosp" data-f="name" value="${esc((X.dd.hosp || {}).name || '')}" placeholder="${esc(hosp || '[Falta completar]')}" aria-label="Hospital cercano"></span>` : esc(hosp || '—')}</dd>
      ${breakfast ? `<dt>Desayuno</dt><dd>${esc(breakfast)} en la locación</dd>` : ''}
      <dt>Almuerzo</dt><dd>${ed ? `<input type="text" class="v2-cin tm" data-bind="cs-day" data-f="lunch" value="${esc(X.dd.lunch || '')}" placeholder="${esc(v2Hm(X.lunch) || '--:--')}" inputmode="numeric" maxlength="5" aria-label="Almuerzo">` : esc(v2Hm(X.lunch) || '—')}</dd>
      <dt>Nota</dt><dd>${ed ? `<textarea class="v2-cin" rows="2" data-bind="cs-day" data-f="notes" placeholder="Para el equipo: seguridad, estacionamiento…" aria-label="Nota">${esc(X.dd.notes || '')}</textarea>` : esc(X.dd.notes || '—')}</dd>
    </dl></section></div>`;
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
    <div class="v2-card v2-clsheet">
      <div class="v2-cltop">${changes && !X.free ? `<span>Lo que cambies aquí no toca el plan de rodaje. <button type="button" class="v2-link" data-v2reset>Volver a lo del plan</button></span>` : '<span></span>'}
        ${miss.length ? `<button type="button" class="v2-btn sm v2-pill" data-v2miss><i class="v2-dot" style="--v2-dc:var(--v2-red)"></i>Faltan ${miss.length} ${miss.length === 1 ? 'dato' : 'datos'} para enviarla</button>` : '<span class="v2-ok2">Lista para enviar</span>'}
        <button type="button" class="v2-xl${callXL() ? ' on' : ''}" data-act="cl-style" data-v="${callXL() ? 'apple' : 'excel'}" aria-pressed="${ea(callXL())}" title="${ea(callXL() ? 'Estilo Excel (en cuadros) en la hoja y el PDF: toca para volver al estilo Apple' : 'Estilo Apple: toca para pasar al estilo Excel, en cuadros')}" aria-label="Estilo Excel">${v2I('grid')}</button></div>
      ${v2CallHead(X)}
      ${v2CallScenes(X)}
      ${v2CallTalent(X)}
      ${v2CallCrew(X)}
      ${v2CallBoxes(X)}
      ${v2CallAdv(X)}
    </div>
  </div>`;
  bindView();
  v2CallBind();
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
