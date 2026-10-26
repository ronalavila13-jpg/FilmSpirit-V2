/* ============================================================
   Pestaña · PROYECTO — datos, créditos, logos y encabezado de los documentos
   Viaja con el guion (sección «guion» del equipo); el formato de cuadro, con el storyboard.
   ============================================================ */
const projEditable = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('guion'));
const personName = x => typeof x === 'string' ? x : (x && x.name) || '';
function peopleListHTML(key, list, ed, rolePh) {
  return `<div class="pj-people" data-list="${ea(key)}">${list.map((x, i) => `<div class="pj-person">
      <input type="text" class="ti pj-pn" value="${esc(personName(x))}" data-bind="pj-person" data-list="${ea(key)}" data-i="${i}" data-k="name" placeholder="Nombre" aria-label="Nombre" ${ed ? '' : 'readonly'}>
      <input type="text" class="ti pj-pr" value="${esc(x.role || '')}" data-bind="pj-person" data-list="${ea(key)}" data-i="${i}" data-k="role" placeholder="${esc(ed ? rolePh : '')}" aria-label="Cargo" ${ed ? '' : 'readonly'}>
      ${ed ? `<button class="xbtn" data-act="pj-rm" data-list="${ea(key)}" data-i="${i}" aria-label="Quitar de los créditos" title="Quitar">${ICO.close}</button>` : ''}</div>`).join('')}
    ${ed ? `<button class="pj-plus" data-act="pj-add" data-list="${ea(key)}" title="Agregar en ${ea(key === 'directors' ? 'dirección' : 'producción')}" aria-label="Agregar en ${ea(key === 'directors' ? 'dirección' : 'producción')}">+</button>` : list.length ? '' : '<span class="hint">—</span>'}</div>`;
}
function headerPreviewHTML() {
  const M = P.meta, b = M.brand || {};
  const pOn = b.project !== false, cOn = b.company !== false;
  const left = pOn ? (M.projLogo ? `<img src="${esc(M.projLogo)}" alt=""><div><b class="lab">Stripboard</b><span>4 jornadas · lun 19 oct. a jue 22 oct.</span></div>` : `<div><b class="ttl">${esc(M.title)}</b><span>Stripboard · 4 jornadas</span></div>`)
    : `<div><b class="lab">Stripboard</b><span>4 jornadas</span></div>`;
  const right = cOn ? (M.logo ? `<img src="${esc(M.logo)}" alt="">` : M.company ? `<b class="co">${esc(M.company.toUpperCase())}</b>` : '') : '';
  return `<div class="pj-prev"><div class="pv-l">${left}</div><div class="pv-r">${right}<span>${esc(new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }))}</span></div></div>`;
}
const SCRIPT_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M6 3h8l4 4v14H6z"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M14 3v4h4M9 12h6M9 16h4"/></svg>';
RENDER.project = function () {
  const v = $('#view');
  const M = P.meta, ed = projEditable();
  const edAspect = !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('storyboard'));
  const dis = ed ? '' : 'disabled';
  const b = M.brand || { project: true, company: true };
  const nSc = D.sc.scenes.length, nPg = D.pages ? D.pages.length : 0;
  // la cabecera (lote I): el nombre del proyecto como título y lo del guion en gris; sin guion, cómo empezar
  const sub = `<b>Proyecto</b>${P.paras.length ? ` · ${nSc} ${nSc === 1 ? 'escena' : 'escenas'}${nPg ? ` · ${nPg} ${nPg === 1 ? 'página' : 'páginas'}` : ''}` : ''}${[M.author, M.draft].filter(Boolean).map(x => `<span data-no-tr> · ${esc(x)}</span>`).join('')}`;   // el « · » va dentro: el texto de antes no termina en « · » (en inglés no se traduciría)
  const head = hdHead({ title: `<span data-no-tr>${esc(M.title || 'Sin título')}</span>`, sub, act: P.paras.length && ed && !P._sample ? hdBtn('sec', 'Importar otra versión…', { icon: 'doc', attrs: 'data-act="import"' }) : '' });
  const start = P.paras.length ? '' : hdEmpty({ icon: 'doc', title: 'Importa el guion para empezar', text: `Final Draft (.fdx), Fountain (.fountain) o el PDF del guion${planAllows('pdf') ? '' : ' (con Pro)'}. Las escenas, el reparto y los elementos probables se marcan solos; el stripboard se arma con ellos.`, btn: ed ? hdBtn('pri', 'Importar guion', { attrs: 'data-act="import"' }) : '' });
  const mIn = (k, lab, phd) => `<input type="text" value="${esc(M[k] || '')}" data-bind="pj-meta" data-k="${k}" placeholder="${ea(ed ? phd : '-')}" aria-label="${ea(lab)}" ${ed ? '' : 'readonly'}>`;
  const gData = hdGroup('Datos', hdRow('Título', `<input type="text" class="pj-title" value="${esc(M.title)}" data-bind="pj-meta" data-k="title" aria-label="Título" ${ed ? '' : 'readonly'}>`)
    + hdRow('Guion', mIn('author', 'Guionista', 'Agregar')) + hdRow('Versión', mIn('draft', 'Versión', 'Versión y fecha')) + hdRow('Productora', mIn('company', 'Productora o empresa', 'Agregar'))
    + hdRow('Formato', `<select class="pj-sel" data-bind="pj-aspect" aria-label="Formato de cuadro" ${edAspect ? '' : 'disabled'}>${['16:9', '1.85:1', '2.39:1', '4:3', '9:16'].map(a => `<option ${a === M.aspect ? 'selected' : ''}>${a}</option>`).join('')}</select>`));
  // los créditos: con nadie, una fila «+»; con alguien, la lista de siempre (nombre, cargo y su ✕)
  const cred = (key, lab, addTxt, rolePh, title) => { const L = M[key] || []; return !L.length && ed ? hdAdd(lab, addTxt, `data-act="pj-add" data-list="${key}"`)
    : `<div class="pj-crg"${title ? ` title="${ea(title)}"` : ''}><span class="pj-crl">${lab}</span>${L.length || ed ? peopleListHTML(key, L, ed, rolePh) : '<span class="hd-row v ph">-</span>'}</div>`; };
  const gCred = hdGroup('Créditos', cred('directors', 'Dirección', 'Agregar a quien dirige', 'Cargo (opcional)') + cred('producers', 'Producción', 'Agregar a quien produce', 'Cargo: ejecutivo/a, general…', 'El presupuesto solo lo abre producción, cada persona con su código.'));
  const gLogos = `<div class="hd-g"><h3>Logos</h3><div class="hd-box pj-logos" title="${ea(planAllows('brand') ? 'PNG con fondo transparente o JPG. Se guarda una copia de hasta 600 px de ancho.' : 'Personalizar los documentos con tus logos es parte de Pro y Studio.')}">
      ${[['projLogo', 'Proyecto', M.title], ['logo', 'Empresa', M.company || 'Empresa']].map(([k, lab, alt]) => `<div class="pj-lg"><div class="pj-logo">${M[k] ? `<img src="${esc(M[k])}" alt="${esc(alt)}">` : HD_ICO.photo}</div>
        <span class="pj-lgt">${lab}${planAllows('brand') ? '' : ' <i class="pro-chip">PRO</i>'}</span>
        ${ed ? `<span class="pj-lb"><button class="linkbtn" data-act="pj-logo" data-k="${k}">${M[k] ? 'Cambiar' : 'Agregar logo'}</button>${M[k] ? `<button class="linkbtn muted" data-act="pj-logo-rm" data-k="${k}">Quitar</button>` : ''}</span>` : ''}</div>`).join('')}
    </div><p class="hd-foot">Salen en el encabezado de los PDF y del Excel.</p></div>`;
  v.innerHTML = `<div class="ws ws-1"><section class="center"><div class="scroller pad" data-keep="pj"><div class="pj">
    <section class="hd pj-top pj-wide" aria-label="Cabecera del proyecto">${head}${start}${hdGroups([gData, gCred, gLogos], 3)}</section>
    ${typeof kindCardHTML === 'function' ? kindCardHTML() : ''}
    ${typeof seriesCardHTML === 'function' ? seriesCardHTML() : ''}
    ${typeof isScriptKind === 'function' && isScriptKind() ? '' : teamCardHTML()}
    ${archiveCardHTML()}
    <div class="card pj-card pj-wide"><h2 class="eyebrow">Encabezado de los documentos</h2>
      <p class="hint" style="margin:0">Aparece en todos los PDF y en el Excel. Desmarca lo que no quieras mostrar.</p>
      <div class="pj-tog">
        <label class="chip"><input type="checkbox" data-bind="pj-brand" data-k="project" ${b.project !== false ? 'checked' : ''} ${dis}> ${M.projLogo ? 'Logo' : 'Nombre'} del proyecto</label>
        <label class="chip"><input type="checkbox" data-bind="pj-brand" data-k="company" ${b.company !== false ? 'checked' : ''} ${dis}> ${M.logo ? 'Logo' : 'Nombre'} de la empresa</label>
      </div>
      ${headerPreviewHTML()}
    </div>
  </div></div></section></div>`;
  bindView();
};
/* imagen subida → copia de hasta 600 px, en WebP de hasta unos 170 kB con su transparencia (imagenes.js) */
function readLogo(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, 600 / img.width, 300 / img.height), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src); res(imgUrl(c, { alpha: true }));
    };
    img.onerror = () => rej(new Error('imagen'));
    img.src = URL.createObjectURL(file);
  });
}
Object.assign(ACT, {
  'pj-logo': b => {
    if (!projEditable() || !proGate('brand')) return;
    const fi = document.createElement('input'); fi.type = 'file'; fi.accept = 'image/*';
    fi.onchange = async () => {
      const f = fi.files[0]; if (!f) return;
      try { P.meta[b.dataset.k] = await readLogo(f); changed('data'); render(); }
      catch (e) { toast('No se pudo leer esa imagen. Prueba con un JPG o un PNG.'); }
    };
    fi.click();
  },
  'pj-logo-rm': b => { if (!projEditable()) return; histNote('Quitar el logo'); delete P.meta[b.dataset.k]; changed('data'); render(); toastUndo('Logo quitado.'); },
  'pj-add': b => { if (!projEditable()) return; const k = b.dataset.list; P.meta[k] = (P.meta[k] || []).concat({ name: '', role: '' }); changed('data'); render(); requestAnimationFrame(() => { const i = $$(`.pj-people[data-list="${k}"] input[data-k="name"]`).pop(); if (i) i.focus(); }); },
  'pj-rm': b => { if (!projEditable()) return; histNote('Quitar un crédito'); P.meta[b.dataset.list].splice(+b.dataset.i, 1); changed('data'); render(); toastUndo('Quitado de los créditos.'); },
});
Object.assign(BIND, {
  'pj-meta': (el, ev) => {
    if (!projEditable()) return;
    const k = el.dataset.k;
    P.meta[k] = k === 'title' ? (el.value.trim() || trData('Proyecto sin título')) : el.value.trim();
    changed('data');
    if (ev === 'change') { if (k === 'title') $('#projTitle').textContent = P.meta.title; render(); }
  },
  'pj-aspect': el => { P.meta.aspect = el.value; THUMB3.clear(); changed('data'); render(); },
  'pj-person': (el, ev) => {
    if (!projEditable()) return;
    const list = P.meta[el.dataset.list] = (P.meta[el.dataset.list] || []).map(x => typeof x === 'string' ? { name: x, role: '' } : x);
    const x = list[+el.dataset.i]; if (!x) return;
    x[el.dataset.k] = el.value;
    changed('data');
  },
  'pj-brand': el => { P.meta.brand = { ...(P.meta.brand || { project: true, company: true }), [el.dataset.k]: el.checked }; changed('data'); render(); },
});

/* ---------- equipo: directorio del proyecto (el mismo de las hojas de llamado) ----------
   Cada persona: nombre, cargo, área, funciones, teléfono, correo, documento y notas.
   Vive con la hoja de llamado (P.call.crew); el reparto (actores) sale de P.call.talent. */
const TEAM_EXTRA = [['loc', 'Locaciones'], ['trans', 'Transporte y catering'], ['post', 'Posproducción y VFX'], ['other', 'Otros']];
const teamDepts = () => [...CS_DEPTS.map(([k, n]) => [k, n]), ...TEAM_EXTRA];
const teamEditable = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('llamado'));
const teamCanSee = () => typeof canSeeTab !== 'function' || canSeeTab('call');
function teamRows() {
  if (!teamCanSee()) return [];
  const names = Object.fromEntries(teamDepts());
  const rows = (P.call.crew || []).filter(c => (c.name || '').trim()).map(c => ({ area: names[c.dept] || c.dept, role: c.role, name: c.name, fn: c.fn || '', phone: c.phone || '', email: c.email || '', doc: c.doc || '', notes: c.notes || '' }));
  for (const e of Object.values(P.elements).filter(e => e.cat === 'cast')) {
    const t = (P.call.talent || {})[e.id] || {};
    if (t.actor || t.phone) rows.push({ area: 'Reparto', role: titleCase(e.name), name: t.actor || '', fn: 'Personaje ' + (D.castNum[e.id] || ''), phone: t.phone || '', email: t.email || '', doc: '', notes: '' });
  }
  return rows;
}
function teamCSV(rows) {
  // una celda que empieza con = + - @ (o tabulador) Excel la toma como fórmula: se antepone un apóstrofo
  const q = v => { v = String(v ?? ''); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return [['Área', 'Cargo', 'Nombre', 'Funciones', 'Teléfono', 'Correo', 'Documento', 'Notas'], ...rows.map(r => [r.area, r.role, r.name, r.fn, r.phone, r.email, r.doc, r.notes])].map(r => r.map(q).join(';')).join('\r\n');
}
function teamCardHTML() {
  if (!teamCanSee()) return '';
  if (P.call && !P.call.crew.length && teamEditable() && typeof callCrew === 'function') callCrew();
  const ed = teamEditable(), dis = ed ? '' : 'readonly', crew = P.call.crew || [];
  const q = (UI.teamQ || '').toLowerCase();
  const match = c => !q || [c.name, c.role, c.fn, c.email, c.phone].some(v => String(v || '').toLowerCase().includes(q));
  const show = UI.csShow || (UI.csShow = new Set()), more = UI.tmMore || (UI.tmMore = new Set());
  const vis = c => ((c.name || '').trim() || show.has(c.id)) && match(c);   // los cargos típicos sin nombre no se muestran
  const filled = crew.filter(c => (c.name || '').trim()).length;
  const add = (k, name) => ed ? `<button class="cs-add" data-act="tm-add" data-dept="${k}" title="Agregar en ${esc(name.toLowerCase())}" aria-label="Agregar en ${esc(name.toLowerCase())}">+</button>` : '';
  const row = c => `<div class="tm-row${ea(more.has(c.id) ? ' open' : '')}" data-id="${ea(c.id)}">
        <input type="text" class="ti tm-name" value="${esc(c.name || '')}" placeholder="Nombre" data-bind="tm-f" data-id="${ea(c.id)}" data-f="name" aria-label="Nombre" ${dis}>
        <input type="text" class="ti tm-role" value="${esc(c.role || '')}" placeholder="Cargo" data-bind="tm-f" data-id="${ea(c.id)}" data-f="role" aria-label="Cargo" ${dis}>
        <input type="tel" class="ti" value="${esc(c.phone || '')}" placeholder="Teléfono" data-bind="tm-f" data-id="${ea(c.id)}" data-f="phone" aria-label="Teléfono" ${dis}>
        <input type="email" class="ti" value="${esc(c.email || '')}" placeholder="Correo" data-bind="tm-f" data-id="${ea(c.id)}" data-f="email" aria-label="Correo" ${dis}>
        <button class="tm-mo${ea(c.fn || c.doc || c.notes ? ' has' : '')}" data-act="tm-more" data-id="${ea(c.id)}" aria-expanded="${ea(more.has(c.id))}" title="Documento, funciones y notas" aria-label="Más datos de ${esc(c.name || c.role || 'esta persona')}">${ICO.chev}</button>
        ${ed ? `<button class="xbtn tm-x" data-act="tm-del" data-id="${ea(c.id)}" aria-label="Quitar a ${esc(c.name || c.role || 'esta persona')}" title="Quitar">${ICO.close}</button>` : '<span></span>'}
        ${more.has(c.id) ? `<div class="tm-ex">
          <input type="text" class="ti tm-doc" value="${esc(c.doc || '')}" placeholder="DNI / documento" data-bind="tm-f" data-id="${ea(c.id)}" data-f="doc" aria-label="Documento" ${dis}>
          <textarea rows="1" class="ti tm-fn" placeholder="Funciones y responsabilidades" data-bind="tm-f" data-id="${ea(c.id)}" data-f="fn" aria-label="Funciones" ${dis}>${esc(c.fn || '')}</textarea>
          <input type="text" class="ti tm-notes" value="${esc(c.notes || '')}" placeholder="Notas: talla, dieta, contacto de emergencia…" data-bind="tm-f" data-id="${ea(c.id)}" data-f="notes" aria-label="Notas" ${dis}></div>` : ''}</div>`;
  const deps = teamDepts();
  const full = deps.filter(([k]) => crew.some(c => c.dept === k && vis(c)));
  const empty = q || !ed ? [] : deps.filter(([k]) => !full.some(f => f[0] === k));
  const groups = full.map(([k, name]) => `<div class="tm-dep" data-dep="${k}"><h3><span>${esc(name)}</span><span class="tm-n">${crew.filter(c => c.dept === k && (c.name || '').trim()).length || ''}</span>${add(k, name)}</h3>
      <div class="tm-list">${crew.filter(c => c.dept === k && vis(c)).map(row).join('')}</div></div>`).join('')
    + (empty.length ? `<div class="tm-folds"><p>${filled ? '<b>Áreas sin personas</b>' : '<b>Nadie del equipo tiene nombre todavía</b><small>Agrega a cada persona en su área; sale en las hojas de llamado.</small>'}</p><div class="tm-chips">${empty.map(([k, name]) => `<button type="button" class="tm-chip" data-act="tm-add" data-dept="${k}" title="Agregar en ${esc(name.toLowerCase())}">${ICO.plus}${esc(name)}</button>`).join('')}</div></div>` : '');
  const cast = Object.values(P.elements).filter(e => e.cat === 'cast').sort((a, b) => (D.castNum[a.id] || 99) - (D.castNum[b.id] || 99)).filter(e => !q || [e.name, ((P.call.talent || {})[e.id] || {}).actor].some(v => String(v || '').toLowerCase().includes(q)));
  const castHTML = cast.length ? `<div class="tm-dep" data-dep="cast"><h3><span>Reparto</span><span class="tm-n">${cast.length}</span></h3><div class="tm-list">${cast.map(e => { const t = (P.call.talent || {})[e.id] || {}; return `<div class="tm-row tm-cast">
      <span class="tm-char"><b>${esc(String(D.castNum[e.id] || ''))}</b>${esc(titleCase(e.name))}</span>
      <input type="text" class="ti" value="${esc(t.actor || '')}" placeholder="Actor / actriz" data-bind="tm-tal" data-id="${ea(e.id)}" data-f="actor" aria-label="Actor o actriz de ${esc(e.name)}" ${dis}>
      <input type="tel" class="ti" value="${esc(t.phone || '')}" placeholder="Teléfono" data-bind="tm-tal" data-id="${ea(e.id)}" data-f="phone" aria-label="Teléfono" ${dis}>
      <input type="email" class="ti" value="${esc(t.email || '')}" placeholder="Correo" data-bind="tm-tal" data-id="${ea(e.id)}" data-f="email" aria-label="Correo" ${dis}></div>`; }).join('')}</div></div>` : '';
  const accounts = typeof SHARE !== 'undefined' && SHARE && SHARE.members ? SHARE.members.filter(x => !x.pending && x.email && !crew.some(c => (c.email || '').toLowerCase() === x.email.toLowerCase())) : [];
  return `<div class="card pj-card pj-wide pj-team"><div class="pj-th"><h2 class="eyebrow">Equipo</h2><span class="hint">${filled} ${filled === 1 ? 'persona' : 'personas'} · el mismo directorio de las hojas de llamado</span><span class="grow"></span>
      ${hdSearch(`<input type="search" class="tm-q" placeholder="Buscar en el equipo" value="${esc(UI.teamQ || '')}" data-bind="tm-q" aria-label="Buscar en el equipo">`)}
      ${ed && accounts.length ? `<button class="btn sm ghost" data-act="tm-import" title="Agrega a quienes tienen acceso al proyecto en FilmSpirit">+ ${accounts.length} con cuenta</button>` : ''}
      <button class="btn sm ghost" data-act="tm-csv">CSV</button></div>
    <div class="tm-deps">${groups}${castHTML}${q && !full.length && !cast.length ? '<p class="hint">Nadie coincide con la búsqueda.</p>' : ''}</div></div>`;
}
function archiveCardHTML() {
  const api = Store.kind === 'api' && P._shared && typeof SHARE !== 'undefined' && SHARE;
  const arch = api && SHARE.archived;
  return `<div class="card pj-card pj-wide pj-arch"><h2 class="eyebrow">Archivo del proyecto</h2>
    <p class="hint" style="margin:0">${arch ? `Archivado el ${esc(new Date(SHARE.archived).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }))}: está en solo lectura y no ocupa un lugar entre tus proyectos activos.` : (EN ? trDone('Download the whole project as a ZIP: the .' + PROJ_EXT + ' file to reopen it, the script, the PDF' + (planAllows('excel') ? ' and Excel' : '') + ' documents, the images and the crew directory.' + (api && SHARE.admin ? ' Archiving it makes it read-only and frees up its slot among your plan’s active projects.' : ''))
      : 'Descarga todo el proyecto en un ZIP: el archivo .' + PROJ_EXT + ' para volver a abrirlo, el guion, los documentos en PDF' + (planAllows('excel') ? ' y Excel' : '') + ', las imágenes y el directorio del equipo.' + (api && SHARE.admin ? ' Al archivarlo queda en solo lectura y libera su lugar entre los proyectos activos de tu plan.' : ''))}</p>
    <div class="pj-lb"><button class="btn" data-act="pj-zip">Descargar todo (ZIP)</button>${api && SHARE.admin ? `<button class="btn ${ea(arch ? 'primary' : 'ghost')}" data-act="pj-archive">${arch ? 'Desarchivar' : 'Archivar el proyecto…'}</button>` : ''}</div></div>`;
}
Object.assign(ACT, {
  'pj-zip': () => archiveZipDialog(),
  'pj-archive': () => archiveProject(!SHARE.archived),
  'tm-add': b => { if (teamEditable()) crewAdd(b, b.dataset.dept); },
  'tm-more': b => { const m = UI.tmMore || (UI.tmMore = new Set()), id = b.dataset.id; m.has(id) ? m.delete(id) : m.add(id); render(); requestAnimationFrame(() => { const i = m.has(id) && $(`.tm-row[data-id="${id}"] .tm-doc`); if (i) i.focus(); }); },
  'tm-del': b => { if (!teamEditable()) return; const c = P.call.crew.find(x => x.id === b.dataset.id); histNote('Quitar del equipo'); P.call.crew = P.call.crew.filter(x => x.id !== b.dataset.id); changed('data'); render(); toastUndo(`${c && c.name ? c.name : c ? c.role : 'Persona'} quitado del equipo.`); },
  'tm-csv': () => { const rows = teamRows(); if (!rows.length) { toast('Todavía no hay nombres en el equipo.'); return; } offerFile(fileSafe(P.meta.title) + '_equipo.csv', '\ufeff' + teamCSV(rows)); },
  'tm-import': () => {
    if (!teamEditable()) return;
    const DEPT_OF = r => /dirección de fotograf|cámara|foto/i.test(r) ? 'cam' : /vestuario/i.test(r) ? 'ward' : /maquillaje|peinado/i.test(r) ? 'hmu' : /arte|ambient|utiler/i.test(r) ? 'art' : /sonid/i.test(r) ? 'sound' : /asistente de direcci|script|continuidad/i.test(r) ? 'dir' : /direcci|producci/i.test(r) ? 'prod' : 'other';
    let n = 0;
    for (const x of SHARE.members) {
      if (x.pending || !x.email || P.call.crew.some(c => (c.email || '').toLowerCase() === x.email.toLowerCase())) continue;
      const same = P.call.crew.find(c => !c.name && c.role && x.role && c.role.toLowerCase() === x.role.toLowerCase());
      if (same) { same.name = x.name; same.email = x.email; } else P.call.crew.push({ id: uid('c'), dept: DEPT_OF(x.role || ''), role: x.role || '', name: x.name || '', phone: '', email: x.email });
      n++;
    }
    changed('data'); render(); toast(`${n} ${n === 1 ? 'persona agregada' : 'personas agregadas'} al directorio.`);
  },
});
Object.assign(BIND, {
  'tm-f': el => { if (!teamEditable()) return; const c = P.call.crew.find(x => x.id === el.dataset.id); if (!c) return; c[el.dataset.f] = el.value; if (!c[el.dataset.f]) delete c[el.dataset.f]; changed('data'); },
  'tm-tal': el => { if (!teamEditable() || !safeKey(el.dataset.id) || !safeKey(el.dataset.f)) return; const T = P.call.talent[el.dataset.id] = Object.hasOwn(P.call.talent, el.dataset.id) ? P.call.talent[el.dataset.id] : {}; T[el.dataset.f] = el.value; changed('data'); },
  'tm-q': (el, ev) => { UI.teamQ = el.value; if (ev === 'input') { clearTimeout(BIND._tq); BIND._tq = setTimeout(() => { render(); const i = $('.tm-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } },
});
EXPORTS.project = () => [{ label: 'Todo el proyecto (ZIP)', hint: 'Proyecto, guion, PDF, imágenes y equipo', run: () => archiveZipDialog() }, { label: 'Directorio del equipo (CSV)', hint: 'Para Excel o Google Sheets', run: () => ACT['tm-csv']() }];
