/* ============================================================
   Pestaña · CASTING — candidatos para cada personaje del reparto (etapa Desarrollo)
   Viaja con el desglose (sección «desglose» del equipo): lo edita quien puede editar el área de reparto. El
   elegido pasa como actor o actriz, con su teléfono, a la hoja de llamado.
   Datos: P.casting = { roles: { personaje: { brief, cands: [{ id, name, age, phone, email, agency, link, notes,
     status, ph: [{ id, w, h }] }], pick } } }   (personaje = id del elemento del reparto)
   Fotos: FRAMES['ca~<personaje>~<candidato>~<foto>'] (así el servidor sabe que son del área de reparto)
   ============================================================ */
const CA_ST = [['convocado', 'Convocado'], ['prueba', 'En prueba'], ['callback', 'Segunda prueba'], ['descartado', 'Descartado']];
const CA_FIELDS = ['name', 'age', 'phone', 'email', 'agency', 'link', 'notes'];
const castingEditable = () => !UI.readOnly && (typeof canEditArea !== 'function' || canEditArea('cast'));
function castingNormalize(Px) {
  const isO = o => o && typeof o === 'object' && !Array.isArray(o);
  const C = Px.casting = isO(Px.casting) ? Px.casting : {};
  C.roles = isO(C.roles) ? C.roles : {};
  for (const [id, r] of Object.entries(C.roles)) {
    if (!isO(r) || !/^[\w-]{1,40}$/.test(id)) { delete C.roles[id]; continue; }
    r.cands = candNormalize(r.cands, CA_FIELDS, CA_ST);
    if (r.pick != null && !r.cands.some(c => c.id === r.pick)) r.pick = null;
    r.brief = candStr(r.brief);
  }
  return C;
}
const CST = () => P.casting || castingNormalize(P);
const caRole = (id, make) => { const C = CST(); if (!C.roles[id] && make) C.roles[id] = { brief: '', cands: [], pick: null }; return C.roles[id] || { brief: '', cands: [], pick: null }; };
const caPhKey = (el, cid, pid) => `ca~${el}~${cid}~${pid}`;
const castPick = id => { const r = CST().roles[id]; return r && r.pick ? r.cands.find(c => c.id === r.pick) || null : null; };
/* la hoja de llamado: lo que se escribió ahí manda; si falta, el elegido en el casting */
function callTalent(id) {
  const T = ((P.call && P.call.talent) || {})[id] || {}, c = castPick(id);
  return c ? { ...T, actor: T.actor || c.name || '', phone: T.phone || c.phone || '' } : T;
}
/* los personajes del reparto, por su número; los que ya no tienen escenas, al final */
function castingRoles() {
  const n = id => D.castNum[id] || 1e4;
  return Object.values(P.elements).filter(e => e && e.cat === 'cast').sort((a, b) => n(a.id) - n(b.id) || a.name.localeCompare(b.name, 'es'));
}
function caScenes(id) { const out = []; D.sem.forEach((set, si) => { if (set.has(id)) out.push(D.sc.scenes[si].key); }); return out; }
function caCur(roles) {
  if (!roles.some(e => e.id === UI.caRole)) UI.caRole = roles.length ? roles[0].id : '';
  return roles.find(e => e.id === UI.caRole) || null;
}
function caCandHTML(el, r, c, ed) {
  const picked = r.pick === c.id, link = safeUrl(c.link);
  return `<article class="cand cand-p${picked ? ' picked' : ''}${c.status === 'descartado' ? ' off' : ''}" data-c="${ea(c.id)}">
    ${candPhotosHTML(c, pid => caPhKey(el.id, c.id, pid), ed, 'ca', 'ca-up', c.name || 'Candidato')}
    <div class="cand-b">
      <div class="cand-t"><input type="text" class="ti cand-n" value="${esc(c.name)}" data-bind="ca-c" data-id="${ea(c.id)}" data-f="name" placeholder="${ea(ed ? 'Nombre del actor o la actriz' : '—')}" aria-label="Nombre" ${ed ? '' : 'readonly'}>
        ${picked ? '<span class="badge ok">Elegido</span>' : ''}${ed ? `<button class="icbtn" data-act="ca-more" data-id="${ea(c.id)}" aria-haspopup="menu" aria-label="Más acciones" title="Quitar">${ICO.more}</button>` : ''}</div>
      <div class="cand-g">
        ${candSel(c, 'status', CA_ST, 'ca-c', ed, 'Estado')}
        ${candFld(c, 'age', 'Edad', 'ca-c', ed, 'inputmode="numeric"')}
        ${candFld(c, 'phone', 'Teléfono', 'ca-c', ed, '', 'tel')}
        ${candFld(c, 'email', 'Correo', 'ca-c', ed, '', 'email')}
        ${candFld(c, 'agency', 'Agencia o representante', 'ca-c', ed)}
        <label class="cand-fl"><span>Video de prueba${link ? ` · <a href="${ea(link)}" target="_blank" rel="noopener noreferrer">Abrir</a>` : ''}</span><input type="url" class="cand-in" value="${esc(c.link)}" data-bind="ca-c" data-id="${ea(c.id)}" data-f="link" placeholder="${ea(ed ? 'Enlace al video o self-tape' : '')}" ${ed ? '' : 'readonly'}></label>
      </div>
      <textarea class="cand-in cand-nt" rows="2" data-bind="ca-c" data-id="${ea(c.id)}" data-f="notes" placeholder="${ea(ed ? 'Cómo le fue en la prueba, disponibilidad, tarifa…' : '')}" aria-label="Notas" ${ed ? '' : 'readonly'}>${esc(c.notes)}</textarea>
      ${ed ? `<div class="cand-a">${picked ? `<button class="btn" data-act="ca-unpick" data-id="${ea(c.id)}">Quitar la elección</button>` : `<button class="btn" data-act="ca-pick" data-id="${ea(c.id)}" title="Queda como actor o actriz del personaje en la hoja de llamado">Elegir para el papel</button>`}</div>` : ''}
    </div>
  </article>`;
}
RENDER.casting = function () {
  const v = $('#view');
  const roles = castingRoles();
  if (!D.sc.scenes.length && !roles.length) { v.innerHTML = emptyScript(); bindView(); return; }
  const ed = castingEditable(), cur = caCur(roles);
  const chosen = roles.filter(e => castPick(e.id)).length;
  const side = `${hdSide('Personajes', `${roles.length} · ${chosen} ${chosen === 1 ? 'elegido' : 'elegidos'}`, 'Buscar personaje')}
    <ul class="slist" id="slist">${roles.map(e => { const r = caRole(e.id), pk = castPick(e.id); return `<li data-q="${esc(e.name.toLowerCase() + ' ' + (pk ? pk.name.toLowerCase() : ''))}"><button data-act="ca-role" data-id="${ea(e.id)}" ${cur && cur.id === e.id ? 'aria-current="true"' : ''}>
      <span class="k tnum">${D.castNum[e.id] || '·'}</span>
      <span class="h" title="${esc(e.name)}">${esc(titleCase(e.name))}${pk ? `<small>${esc(pk.name)}</small>` : ''}${(x => x ? `<small class="epi-kind" title="Episodios: ${esc(x.eps.join(', '))}">${x.kind} · ${x.eps.length} de ${x.of} ep.</small>` : '')(epCastInfo(e.id))}</span>
      <span class="e">${pk ? '<i class="cand-ok" title="Elegido">✓</i>' : r.cands.length ? `<i class="cand-cnt tnum" title="Candidatos">${r.cands.length}</i>` : ''}</span></button></li>`; }).join('')}</ul>`;
  let body = roles.length ? '<p class="hint">Elige un personaje de la lista.</p>' : hdEmpty({ icon: 'people', title: 'Aún no hay personajes en el reparto', text: 'Los personajes salen del desglose: marca el reparto en el Guion rayado o en el Desglose y aparecen aquí.' });
  if (cur) {
    const r = caRole(cur.id), sc = caScenes(cur.id);
    candFramesNeed(r.cands.flatMap(c => (c.ph || []).map(p => caPhKey(cur.id, c.id, p.id))), 'casting');
    const order = [...r.cands].sort((a, b) => (b.id === r.pick) - (a.id === r.pick) || (a.status === 'descartado') - (b.status === 'descartado'));
    const T = ((P.call && P.call.talent) || {})[cur.id] || {}, pk = castPick(cur.id);
    const differ = pk && T.actor && T.actor.trim() && T.actor.trim() !== pk.name.trim();
    const addBtn = ed ? hdBtn('pri', 'Agregar candidato', { icon: 'plus', attrs: 'data-act="ca-add"' }) : '';
    body = `<section class="hd cand-hd">${hdHead({ title: `${D.castNum[cur.id] ? `<span class="cand-num">${D.castNum[cur.id]}</span>` : ''}${esc(titleCase(cur.name))}`, sub: sc.length ? `${sc.length} ${sc.length === 1 ? 'escena' : 'escenas'} · ${esc(sc.join(', '))}${(x => x ? ` · <b>${x.kind}</b>: ${x.eps.length === x.of ? 'en todos los episodios' : `episodios ${esc(x.eps.join(', '))}`}` : '')(epCastInfo(cur.id))}` : 'Sin escenas en el guion', act: order.length ? addBtn : '' })}</section>
      <label class="hd-tx hd-txc cand-pn"><span>Perfil buscado</span><textarea class="cand-in" rows="2" data-bind="ca-brief" placeholder="${ea(ed ? 'Edad, rasgos, acento, habilidades (manejar, nadar, cantar)' : '')}" ${ed ? '' : 'readonly'}>${esc(r.brief)}</textarea></label>
      ${differ ? `<p class="hint cand-warn">En la hoja de llamado figura «${esc(T.actor)}»: lo escrito ahí manda.</p>` : ''}
      ${order.length ? `<div class="cand-grid">${order.map(c => caCandHTML(cur, r, c, ed)).join('')}</div>`
        : hdEmpty({ icon: 'people', title: `Aún no hay candidatos para ${esc(titleCase(cur.name))}`, text: 'Agrega a cada actor o actriz que se presente: foto, contacto, agencia, el enlace a su prueba y tus notas. El elegido pasa a la hoja de llamado.', btn: addBtn })}`;
  }
  v.innerHTML = `<div class="ws ws-2">
    <aside class="side" id="side">${side}</aside>
    <section class="center">
      <div class="bar"><button class="btn ghost only-narrow" data-act="drawer" data-d="#side">Personajes</button><span class="grow"></span>${toolsHTML()}</div>
      <div class="scroller pad" data-keep="ca-${ea(cur ? cur.id : '')}">${body}</div>
    </section></div>`;
  bindView(); bindSceneSearch();
};
function caCand(id) { for (const [el, r] of Object.entries(CST().roles)) { const c = r.cands.find(x => x.id === id); if (c) return { el, r, c }; } return null; }
function caPick(id) {
  const x = caCand(id); if (!x) return;
  const { el, r, c } = x, prev = castPick(el), e = P.elements[el];
  if (!c.name.trim()) { toast('Escribe primero su nombre.'); const f = $(`.cand[data-c="${CSS.escape(id)}"] .cand-n`); if (f) f.focus(); return; }
  r.pick = id;
  // a la hoja de llamado, si ahí no se escribió otro nombre
  let to = false;
  if (typeof canEditSec !== 'function' || canEditSec('llamado')) {
    const C = P.call; C.talent = C.talent || {};
    const T = C.talent[el] = { ...(C.talent[el] || {}) };
    if (!T.actor || (prev && T.actor === prev.name)) { T.actor = c.name.trim(); to = true; }
    if (c.phone.trim() && (!T.phone || (prev && T.phone === prev.phone))) T.phone = c.phone.trim();
  }
  changed('data'); render();
  toast(`${c.name.trim()} es ${e ? titleCase(e.name) : 'el personaje'}${to ? ' en la hoja de llamado' : ''}.`, 4200);
}
function caUnpick(id) {
  const x = caCand(id); if (!x) return;
  const { el, r, c } = x;
  r.pick = null;
  if (typeof canEditSec !== 'function' || canEditSec('llamado')) {
    const T = (P.call.talent || {})[el];
    if (T && T.actor === c.name.trim()) { delete T.actor; if (T.phone === c.phone.trim()) delete T.phone; }
  }
  changed('data'); render();
}
Object.assign(ACT, {
  'ca-role': b => { UI.caRole = b.dataset.id; closeDrawers(); render(); },
  'ca-add': () => {
    const el = UI.caRole; if (!el) return;
    const r = caRole(el, true), id = uid('c');
    r.cands.push({ id, name: '', age: '', phone: '', email: '', agency: '', link: '', notes: '', status: 'convocado', ph: [] });
    changed('data'); render();
    requestAnimationFrame(() => { const f = $(`.cand[data-c="${CSS.escape(id)}"] .cand-n`); if (f) { f.scrollIntoView({ block: 'center' }); f.focus(); } });
  },
  'ca-pick': b => caPick(b.dataset.id),
  'ca-unpick': b => caUnpick(b.dataset.id),
  'ca-more': b => {
    const x = caCand(b.dataset.id); if (!x) return;
    popover(b, '<div class="menu"><button data-m="del">Quitar al candidato</button></div>', p => p.addEventListener('click', e => {
      if (!e.target.closest('[data-m]')) return; closePop();
      const frames = Object.fromEntries((x.c.ph || []).map(p => [caPhKey(x.el, x.c.id, p.id), FRAMES[caPhKey(x.el, x.c.id, p.id)]]).filter(([, u]) => u));
      histNote('Quitar un candidato', frames, 'casting');
      if (x.r.pick === x.c.id) caUnpick(x.c.id);
      for (const p of x.c.ph || []) { const k = caPhKey(x.el, x.c.id, p.id); delete FRAMES[k]; Store.saveFrame(P.id, k, null).catch(() => { }); }
      x.r.cands = x.r.cands.filter(c => c !== x.c);
      changed('data'); render(); toastUndo('Candidato quitado.');
    }));
  },
  'ca-view': b => { const x = caCand(b.dataset.id); if (!x) return; const ks = (x.c.ph || []).map(p => caPhKey(x.el, x.c.id, p.id)); photoViewer(ks, x.c.name, { at: ks.indexOf(caPhKey(x.el, x.c.id, b.dataset.p)) }); },
  'ca-phdel': b => { const x = caCand(b.dataset.id); if (!x) return; candDelPhoto(x.c, pid => caPhKey(x.el, x.c.id, pid), b.dataset.p, 'casting'); render(); toastUndo('Foto quitada.'); },
});
Object.assign(BIND, {
  'ca-c': (el, ev) => {
    const x = caCand(el.dataset.id); if (!x) return;
    const f = el.dataset.f, old = x.c[f];
    x.c[f] = el.value;
    // el elegido cambió su nombre o su teléfono: la hoja de llamado lo sigue (si decía lo mismo)
    if (ev === 'change' && x.r.pick === x.c.id && (f === 'name' || f === 'phone') && (typeof canEditSec !== 'function' || canEditSec('llamado'))) {
      const T = (P.call.talent || {})[x.el], k = f === 'name' ? 'actor' : 'phone';
      if (T && T[k] === String(old).trim()) T[k] = el.value.trim();
    }
    changed('data');
    if (ev === 'change' && (f === 'status' || f === 'link')) render();
  },
  'ca-brief': el => { const r = caRole(UI.caRole, true); r.brief = el.value; changed('data'); },
  'ca-up': async (el, ev) => {
    if (ev !== 'change' || !el.files.length) return;
    const x = caCand(el.dataset.id); if (!x) return;
    const n = await candAddPhotos(x.c, pid => caPhKey(x.el, x.c.id, pid), el.files);
    if (n) render();
  },
});
HELP.casting = [
  ['Personajes', 'A la izquierda, el reparto del desglose con su número; el elegido de cada personaje lleva ✓.'],
  ['Perfil buscado', 'Qué pide el papel: edad, rasgos, acento, habilidades. Sale en el PDF para la convocatoria.'],
  ['Candidatos', '«+ Candidato» agrega a cada actor o actriz que se presenta: fotos, edad, contacto, agencia, el enlace a su prueba y tus notas. El estado va de convocado a segunda prueba (o descartado).'],
  ['Elegir', '«Elegir para el papel» lo deja como actor o actriz del personaje en la hoja de llamado, con su teléfono, salvo que ahí ya hayas escrito otro nombre.'],
  ['Equipo', 'El casting viaja con el desglose: lo edita quien puede editar el área de reparto (por ejemplo, el cargo Casting).'],
  ['Exportar', 'Un PDF por personaje con su perfil y sus candidatos (con o sin fotos), o solo el reparto elegido.'],
];
EXPORTS.casting = () => [
  { label: 'Casting', hint: 'PDF con fotos: cada personaje, su perfil y sus candidatos', run: btn => exportPDF('casting', btn, { photos: true }), pdf: { kind: 'casting', opts: { photos: true } } },
  { label: 'Casting sin fotos', hint: 'PDF liviano, para imprimir', run: btn => exportPDF('casting', btn, { photos: false }), pdf: { kind: 'casting', opts: { photos: false } } },
  { label: 'Reparto elegido', hint: 'PDF: el elegido de cada personaje, con foto y contacto', run: btn => exportPDF('casting', btn, { photos: true, picked: true }), pdf: { kind: 'casting', opts: { photos: true, picked: true } } },
];
function pdfCasting(opts = {}) {
  const doc = newDoc('portrait'), roles = castingRoles().filter(e => caRole(e.id).cands.length || caRole(e.id).brief.trim());
  const label = opts.picked ? 'Reparto elegido' : 'Casting';
  PDF_CAND_HEAD = [label, `${roles.length} personajes`];
  let y = docHeader(doc, ...PDF_CAND_HEAD, { x0: 40 });
  try {
    if (!roles.length) { doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text('Aún no hay candidatos.', 40, y + 10); }
    for (const e of roles) {
      const r = caRole(e.id);
      let L = [...r.cands].sort((a, b) => (b.id === r.pick) - (a.id === r.pick));
      if (opts.picked) L = L.filter(c => c.id === r.pick);
      if (opts.picked && !L.length) continue;
      const sc = caScenes(e.id);
      y = pdfGroupBand(doc, y, `${D.castNum[e.id] ? D.castNum[e.id] + '. ' : ''}${titleCase(e.name)}`, sc.length ? `${sc.length} ${sc.length === 1 ? 'escena' : 'escenas'}` : '');
      if (r.brief.trim() && !opts.picked) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED); const nl = doc.splitTextToSize(pdfSafe('Perfil: ' + r.brief), doc.internal.pageSize.getWidth() - 80); doc.text(nl, 40, y + 4); y += nl.length * 11 + 6; }
      for (const c of L) {
        y = pdfCandBlock(doc, y, c, pid => caPhKey(e.id, c.id, pid), [
          ['Estado', (CA_ST.find(s => s[0] === c.status) || [])[1]], ['Edad', c.age], ['Contacto', [c.phone, c.email].filter(Boolean).join(' · ')], ['Agencia', c.agency], ['Video', c.link], ['Notas', c.notes],
        ], opts, c.name || 'Sin nombre', c.id === r.pick ? 'ELEGIDO' : '');
      }
    }
  } finally { PDF_CAND_HEAD = null; }
  pageNumbers(doc, label);
  return { doc, name: fileSafe(P.meta.title) + (opts.picked ? '_reparto_elegido' : '_casting') + (opts.photos === false ? '_sin_fotos' : '') + '.pdf' };
}
PDFX.casting = pdfCasting;
