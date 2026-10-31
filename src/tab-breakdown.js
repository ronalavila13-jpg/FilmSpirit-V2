/* ============================================================
   Pestaña 2 · DESGLOSE — hojas por escena y catálogo de elementos
   ============================================================ */
/* datos de la hoja de desglose de una escena, en el formato de la productora */
function dayOfScene(key) {
  const { days } = scheduleDays(P, D.sc);
  const i = days.findIndex(d => d.keys.includes(key));
  if (i < 0) return null;
  return { n: i + 1, date: shootDates(P, days.length)[i] };
}
function sheetData(s) {
  const meta = P.scenes[s.key] || {};
  const els = [...D.sem[s.idx]].map(id => P.elements[id]).filter(Boolean);
  const order = Object.fromEntries(CATS.map((c, i) => [c.id, i]));
  const box = {};
  for (const b of SHEET) box[b.id] = els.filter(e => b.cats.includes(e.cat)).sort((a, b2) => a.cat === 'cast' && b2.cat === 'cast' ? (D.castNum[a.id] || 99) - (D.castNum[b2.id] || 99) : (order[a.cat] - order[b2.cat]) || a.name.localeCompare(b2.name));
  const day = dayOfScene(s.key);
  return {
    no: s.idx + 1, pages: fmtEighths(D.metrics.eighths[s.idx]), fecha: day && day.date ? day.date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-',
    jornada: day ? day.n : null, productora: P.meta.company || '', titulo: P.meta.title, secuencia: s.key, decorado: meta.set || titleCase(s.loc), ie: s.ie, dn: s.dn === 'N' ? 'NOCHE' : 'DÍA',
    desc: meta.synopsis || synopsisOf(s), box, notes: meta.notes || '',
  };
}
/* la cabecera de una caja (lote I, mejora 7): el color de su categoría con la letra que se lee encima. Si ni la negra
   ni la blanca llegan a 4,5:1 (un rojo o un turquesa medios), el color se oscurece o se aclara apenas hasta que se lea */
function bdBar(hex) {
  if (!lgHexOk(hex)) return { bg: hex, ink: '#1A1A1A' };
  let bg = hex.toUpperCase(); const ink = lgContrast(bg, '#FFFFFF') >= lgContrast(bg, '#1A1A1A') ? '#FFFFFF' : '#1A1A1A';
  for (let i = 0; i < 12 && lgContrast(bg, ink) < 4.6; i++) bg = lgMix(bg, ink === '#FFFFFF' ? '#000000' : '#FFFFFF', .94);
  return { bg, ink };
}
const itemLabel = e => (e.cat === 'vfx' ? 'VFX: ' : e.cat === 'stunts' ? 'Riesgo: ' : '') + e.name;
Object.assign(ACT, {
  'bd-scene': b => { UI.scene = +b.dataset.i; closeDrawers(); UI.bdView = 'sheet'; render(); },
  'bd-view': b => { UI.bdView = b.dataset.v; render(); },
  'bd-add': b => {
    const sec = b.closest('.sbx'); if (!sec) return;
    sec.classList.add('adding');
    const t = sec.querySelector(b.dataset.box === 'notes' && !sec.querySelector('ol') ? 'textarea' : '[data-add]') || sec.querySelector('textarea');
    if (t) t.focus();
  },
  'bd-step': b => { UI.scene = clamp(UI.scene + +b.dataset.d, 0, D.sc.scenes.length - 1); render(); },
  // una caja vacía, desde «Sin elementos todavía»: aparece con su campo para escribir
  'bd-open': b => {
    const s = D.sc.scenes[UI.scene]; if (!s) return;
    if (UI.bdOpenK !== s.key) { UI.bdOpenK = s.key; UI.bdOpen = new Set(); }
    UI.bdOpen.add(b.dataset.box); render();
    requestAnimationFrame(() => { const sec = $(`#view .sbx[data-box="${CSS.escape(b.dataset.box)}"]`); if (!sec) return; const t = sec.querySelector(b.dataset.box === 'notes' ? 'textarea' : '[data-add]'); if (t) t.focus(); });
  },
  // el aviso de sugeridos: cómo se confirman, y confirmar los de la escena o los de todo el guion
  'bd-sug': b => {
    const s = D.sc.scenes[UI.scene]; if (!s) return;
    const here = Object.values(P.elements).filter(e => e.auto && D.sem[s.idx].has(e.id) && canEditCat(e.cat)), all = Object.values(P.elements).filter(e => e.auto).length;
    if (!here.length) { render(); return; }
    popover(b, `<h3 class="hd-poph">${here.length === 1 ? '1 sugerido por confirmar' : `${here.length} sugeridos por confirmar`}</h3><p class="hd-popp">Están en gris en la hoja: pasa el mouse sobre cada uno para confirmarlo (✓) o quitarlo (✕), o confírmalos juntos.</p>
      <footer class="hd-popf">${hdBtn('pri', here.length === 1 ? 'Confirmar' : `Confirmar los ${here.length}`, { sm: true, attrs: 'data-x="scene"' })}${canEditBdAll() && all > here.length ? hdBtn('sec', `Los ${all} de todo el guion`, { sm: true, attrs: 'data-x="all"' }) : ''}</footer>`, p => p.addEventListener('click', e => {
      const x = e.target.closest('[data-x]'); if (!x) return; closePop();
      if (x.dataset.x === 'all') { ACT['bd-confirm-all'](); return; }
      histNote('Confirmar sugerencias de la escena');
      const ids = new Set(here.map(e2 => e2.id)); here.forEach(e2 => { e2.auto = false; }); P.tags.forEach(t => { if (ids.has(t.el)) t.auto = false; });
      afterTagChange(); toastUndo(here.length === 1 ? 'Sugerido confirmado.' : `${here.length} sugeridos confirmados.`);
    }));
  },
  'el-ok': b => { const e = P.elements[b.dataset.id]; if (!e || !canEditCat(e.cat)) return; e.auto = false; P.tags.forEach(t => { if (t.el === e.id) t.auto = false; }); afterTagChange(); },
  'el-off': b => {
    const s = sceneOfKey(b.dataset.k), id = b.dataset.id;
    if (!P.elements[id] || !canEditCat(P.elements[id].cat)) return;
    P.tags = P.tags.filter(t => !(t.el === id && ((t.p >= s.p0 && t.p < s.p1) || (t.p < 0 && t.sc === s.key))));
    pruneElements(); afterTagChange();
    toastUndo(`Quitado de la escena ${s.key}.`);
  },
  'el-del': b => {
    const e = P.elements[b.dataset.id];
    if (!e || !canEditCat(e.cat)) return;
    const n = P.tags.filter(t => t.el === e.id).length;
    confirmBox('Eliminar elemento', `Se quitarán las ${n} marcas de «${esc(e.name)}» en el guion.`, 'Eliminar', () => {
      histNote(`Eliminar «${e.name}»`);
      P.tags = P.tags.filter(t => t.el !== e.id); delete P.elements[e.id]; afterTagChange();
      toastUndo(`«${titleCase(e.name)}» eliminado del desglose.`);
    });
  },
  'bd-confirm-all': () => { if (!canEditBdAll()) return; histNote('Confirmar sugerencias'); Object.values(P.elements).forEach(e => { e.auto = false; }); P.tags.forEach(t => { t.auto = false; }); afterTagChange(); toastUndo('Sugerencias confirmadas.'); },
  'bd-rerun': () => canEditBdAll() && confirmBox('Volver a desglosar', 'Se recalculan las sugerencias automáticas. Tus marcas manuales y las ya confirmadas se conservan.', 'Desglosar', () => {
    histNote('Volver a desglosar');
    const n = autoBreakdown(P, { replaceAuto: true });
    afterTagChange(); toastUndo(n + ' sugerencias.');
  }, false),
});
Object.assign(BIND, {
  'bd-set': el => { if (!canEditBdAll()) return; const k = el.dataset.key; P.scenes[k] = P.scenes[k] || {}; P.scenes[k].set = el.value; changed('data'); },
  scnotes: (el) => { if (!canEditArea('notes')) return; const k = el.dataset.key; P.scenes[k] = P.scenes[k] || {}; P.scenes[k].notes = el.value; changed('data'); },
  'bd-q': debounce(el => { UI.bdQ = el.value; const pos = el.selectionStart; render(); const n = $('[data-bind="bd-q"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }, 250),
  'bd-cat': el => { UI.bdCat = el.value; render(); },
  'bd-sug': el => { UI.bdSug = el.checked; render(); },
  'el-name': (el, ev) => {
    if (ev !== 'change') return;
    const e = P.elements[el.dataset.id];
    const name = el.value.trim();
    if (!e || !name || !canEditCat(e.cat)) return;
    const twin = Object.values(P.elements).find(x => x.id !== e.id && x.cat === e.cat && deaccent(x.name.toLowerCase()) === deaccent(name.toLowerCase()));
    histNote(twin ? `Fusionar «${e.name}» con «${twin.name}»` : `Renombrar «${e.name}»`);
    const n = P.tags.filter(t => t.el === e.id).length;
    if (twin) { P.tags.forEach(t => { if (t.el === e.id) t.el = twin.id; }); delete P.elements[e.id]; }
    else e.name = name;
    syncCastBudgetNames();
    afterTagChange();
    // ya existía uno con ese nombre: se unen (se dice y se puede deshacer)
    if (twin) toastUndo(`«${titleCase(e.name)}» se unió a «${titleCase(twin.name)}», que ya existía${n ? `: ${n} ${n === 1 ? 'marca' : 'marcas'} pasan a él` : ''}.`);
  },
  'el-cat': el => {
    const e = P.elements[el.dataset.id];
    if (!e || !canEditCat(e.cat) || !canEditCat(el.value)) return;
    const twin = Object.values(P.elements).find(x => x.id !== e.id && x.cat === el.value && deaccent(x.name.toLowerCase()) === deaccent(e.name.toLowerCase()));
    histNote(`Cambiar la categoría de «${e.name}»`);
    const n = P.tags.filter(t => t.el === e.id).length;
    if (twin) { P.tags.forEach(t => { if (t.el === e.id) t.el = twin.id; }); delete P.elements[e.id]; }
    else e.cat = el.value;
    afterTagChange();
    toastUndo(twin ? `«${titleCase(e.name)}» se unió a «${titleCase(twin.name)}» en ${CAT[el.value].name}.` : `«${titleCase(e.name)}» pasó a ${CAT[el.value].name}${n > 1 ? `, con sus ${n} marcas` : ''}.`);
  },
});
function syncCastBudgetNames() {
  for (const l of P.budget.lines) if (l.link && l.link.startsWith('cast:') && P.elements[l.link.slice(5)]) l.name = P.elements[l.link.slice(5)].name;
}
// añadir elemento desde la hoja de desglose (Enter)
document.addEventListener('keydown', e => {
  const inp = e.target.closest && e.target.closest('[data-add]');
  if (!inp || e.key !== 'Enter') return;
  e.preventDefault();
  const name = inp.value.trim();
  if (!name || UI.readOnly) return;
  const s = D.sc.scenes[UI.scene];
  const pick = inp.parentElement && inp.parentElement.querySelector('[data-addcat]');
  const cat = pick ? pick.value : inp.dataset.add;
  if (!canEditCat(cat)) return;
  const el = ensureElement(P, cat, cat === 'cast' ? normCue(name) : name.charAt(0).toUpperCase() + name.slice(1), false);
  el.auto = false;
  // si el texto aparece en la escena, se marca en el guion; si no, queda como elemento de la escena
  let placed = false;
  const rx = new RegExp('(?<![\\p{L}\\p{N}])' + termPattern(name) + '(?![\\p{L}\\p{N}])', 'iu');
  for (let i = s.p0 + 1; i < s.p1 && !placed; i++) {
    const p = P.paras[i];
    if (p.t !== 'a' && p.t !== 'g' && !(cat === 'cast' && p.t === 'c')) continue;
    const m = rx.exec(p.x);
    if (m && !P.tags.some(t => t.p === i && t.s < m.index + m[0].length && m.index < t.e)) { P.tags.push({ id: uid('t'), el: el.id, p: i, s: m.index, e: m.index + m[0].length }); placed = true; }
  }
  if (!placed) P.tags.push({ id: uid('t'), el: el.id, p: -1, sc: s.key, s: 0, e: 0 });
  afterTagChange();
  const again = $(`[data-add="${inp.dataset.add}"]`);
  if (again) { again.closest('.sbx').classList.add('adding'); again.focus(); }
});
// la línea para añadir se pliega al salir de ella sin escribir
document.addEventListener('focusout', e => {
  const sec = e.target.closest && e.target.closest('.sbx.adding'); if (!sec) return;
  setTimeout(() => { if (sec.isConnected && !sec.contains(document.activeElement) && !(sec.querySelector('[data-add]') || {}).value) sec.classList.remove('adding'); }, 120);
});

/* ---------- ajustes, ayuda y exportar ---------- */
SETTINGS.breakdown = () => canEditBdAll()
  ? '<p class="hint" style="margin:0">Recalcula las sugerencias automáticas en todo el guion. Tus marcas manuales y las ya confirmadas se conservan.</p><div class="menu"><button data-act="bd-rerun" data-pclose>Volver a desglosar el guion…</button></div>'
  : '<p class="hint" style="margin:0">Sin ajustes disponibles para tu acceso.</p>';
HELP.breakdown = [
  ['La leyenda', 'Arriba: el color de cada categoría. Toca uno para cambiarlo en todo el proyecto: las marcas del guion rayado, las cajas de la hoja de desglose y los PDF. Lo cambia quien edita todo el desglose.'],
  ['Sugeridos', 'Los elementos en gris los propuso el programa. Pasa el mouse sobre uno para confirmarlo (✓) o quitarlo (✕), o usa «Confirmar sugeridos» para todos.'],
  ['Agregar', 'Pulsa «+» en el título de la caja (o escribe debajo del último elemento) y luego Intro. En el guion, selecciona texto y elige la categoría.'],
  ['Elementos', 'La vista «Elementos» lista todo el desglose con sus escenas, para buscar y filtrar por categoría.'],
  ['Fotos', 'El ícono de cámara de cada caja abre su lámina: sube fotos JPG o PNG de cada elemento y anota talla, color o referencia. Se imprimen con o sin fotos desde la lámina o desde Exportar.'],
  ['Personajes', 'El cuerpo, la estatura, las tallas y las fotos de cada personaje: Storyboard › Personajes.'],
];
EXPORTS.breakdown = () => [
  pdfItem('Hojas de desglose (PDF)', 'breakdown', 'Una hoja por escena, con colores por categoría'),
  { label: 'Hojas de desglose con fotos (PDF)', hint: 'Cada hoja seguida de la lámina con las fotos de la escena', run: btn => exportPDF('breakdown', btn, { photos: true }), pdf: { kind: 'breakdown', opts: { photos: true } } },
  { label: 'Desglose de un área (PDF)…', hint: 'Solo lo de un departamento (sonido, vestuario, atrezzo…), escena por escena', run: btn => bdAreaDialog(btn) },
  { label: 'Lámina por área (PDF)…', hint: 'Vestuario, atrezzo, reparto… de todo el proyecto, con o sin fotos', run: btn => laminaAreaMenu(btn) },
];
/* desglose de un área: la lista por escenas o el guion solo con sus etiquetas */
function bdAreaDialog(btn) {
  const mem = ls.get('pdfArea', null) || {}, id = SHEET.some(b => b.id === mem.box) ? mem.box : 'sound', as = mem.as === 'script' ? 'script' : 'list';
  const rayado = planAllows('rayado');
  const opt = (v, title, hint) => `<label class="opt rg-opt"><input type="radio" name="bda" value="${v}" ${as === v ? 'checked' : ''}><span><b>${title}</b><span class="hint">${hint}</span></span></label>`;
  const m = modal({
    title: 'Desglose de un área',
    body: `<label class="fld"><span>Área</span><select id="bdaBox">${SHEET.map(b => `<option value="${ea(b.id)}" ${b.id === id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label>
      <div class="rg" style="margin-top:12px">
        ${opt('list', 'Lista por escenas', 'Cada escena con los elementos del área, sus octavos y su jornada; al final, cada elemento con las escenas donde aparece.')}
        ${opt('script', 'Guion etiquetado' + (rayado ? '' : ' <i class="pro-chip">PRO</i>'), 'El guion marcado solo con las etiquetas de esta área, para leerlo con su color.')}
      </div>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="bdaGo">Exportar PDF</button>',
  });
  $('#bdaGo', m).onclick = () => {
    const box = $('#bdaBox', m).value, how = ($('input[name=bda]:checked', m) || {}).value || 'list', B = SHEET.find(b => b.id === box);
    ls.set('pdfArea', { box, as: how });
    closeModal();
    if (how === 'script') exportPDF('script', btn, { tags: true, cov: false, cats: B.cats, area: box });
    else exportPDF('area', btn, { box });
  };
}
