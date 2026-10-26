/* ============================================================
   IMPORTAR · abrir un archivo (guion de Final Draft, Fountain o PDF, o un proyecto), el límite del plan al crear y
   restaurar una copia
   (antes en ui.js; va después de proyectos.js en el armado)
   ============================================================ */
/* ---------- importación ---------- */
const SCRIPT_ACCEPT = '.fdx,.fountain,.spmd,.txt,.pdf,application/pdf';
let pickMode = 'import';
/* lector de PDF (pdf.js), solo cuando se importa uno: va en el hilo principal, sin trabajador aparte */
let PDFJS_P = null;
function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (PDFJS_P) return PDFJS_P;
  const base = DESK || typeof LOCAL_LIBS !== 'undefined' ? 'lib/' : 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/';
  const load = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar el lector de PDF. Revisa tu conexión e inténtalo de nuevo.')); document.head.appendChild(s); });
  return (PDFJS_P = load(base + 'pdf.worker.min.js').then(() => load(base + 'pdf.min.js')).then(() => window.pdfjsLib).catch(e => { PDFJS_P = null; throw e; }));
}
async function readPDFScript(file) {
  const lib = await loadPdfJs();
  let doc;
  try { doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, verbosity: 0 }).promise; }
  catch (e) { throw new Error(/password/i.test(e && e.name) ? 'El PDF tiene contraseña. Quítasela y vuelve a importarlo.' : 'No se pudo abrir el PDF.'); }
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
    pages.push({ w: vp.width, h: vp.height, items: tc.items.filter(it => 'str' in it).map(it => ({ s: it.str, x: it.transform[4], y: vp.height - it.transform[5], w: it.width, h: Math.hypot(it.transform[2], it.transform[3]) || it.height })) });
  }
  doc.destroy();
  return parsePDFScript(pages);
}
function pickFile(accept, mode) {
  pickMode = mode;
  const f = $('#fileIn');
  f.accept = accept; f.value = '';
  f.click();
}
async function onFile(file) {
  if (!file) return;
  const isPDF = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
  const text = isPDF ? '' : await file.text();
  if (!isPDF && (pickMode === 'restore' || /\.(json|fsp|fmst)$/i.test(file.name))) return restoreBackup(text);
  if (isPDF && !proGate('pdf')) return;
  let parsed;
  try {
    if (isPDF) { toast('Leyendo el PDF…', 1600); parsed = await readPDFScript(file); }
    else if (/\.fdx$/i.test(file.name) || /^\s*<\?xml|<FinalDraft/i.test(text.slice(0, 400))) parsed = parseFDX(text);
    else { const fmt = typeof fmtFromFountain === 'function'; parsed = parseFountain(text, { keepEmph: fmt }); if (fmt) parsed.paras.forEach(fmtFromFountain); }   // **negrita**, *itálica*, _subrayado_ (antes se quitaban antes de llegar aquí y se perdían)
  } catch (e) { toast(e.message || 'No se pudo leer el archivo.', 5000); return; }
  if (!parsed.paras.length) { toast('El archivo no tiene texto de guion.'); return; }
  const sc = computeScenes(parsed.paras);
  const pages = layoutScript(parsed.paras);
  const title = parsed.title || titleCase(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
  const locked = P && P.paras.length && typeof scriptLock === 'function' && !!scriptLock();
  const canUpdate = P && P.paras.length && !P._sample && (!P._shared || (SHARE && SHARE.admin)) && !locked;
  const blank = P && !P.paras.length && !P._sample && !UI.readOnly && (!P._shared || (SHARE && SHARE.admin));
  const creatable = await canCreateProject(true, typeof autoKind === 'function' ? autoKind() : null);
  // otra versión del mismo guion (desde «Importar otra versión…» o con el mismo título): se propone actualizar
  // series: el guion de un episodio se agrega al final (si todavía no es serie, lo que hay pasa a ser el primero)
  const asEp = canUpdate && edFormat() !== 'av', epMode = asEp && pickMode === 'episode';
  const epN = asEp ? (typeof epNext === 'function' && isSeries(P) ? epNext() : '102') : '';
  const same = canUpdate && !epMode && (pickMode === 'version' || deaccent(String(title).toLowerCase().trim()) === deaccent(String(P.meta.title || '').toLowerCase().trim()));
  const m = modal({
    title: 'Importar guion',
    body: `<div><b>${esc(file.name)}</b><div class="hint">${pages.length} ${pages.length === 1 ? 'página' : 'páginas'} · ${sc.scenes.length} ${sc.scenes.length === 1 ? 'escena' : 'escenas'}${parsed.fdTags.length ? ' · ' + parsed.fdTags.length + ' marcas de Final Draft' : ''}</div></div>
      ${sc.scenes.length ? '' : '<div class="note">No encontré encabezados de escena (INT./EXT.). El desglose y el plan necesitan escenas.</div>'}
      ${locked ? `<div class="note">El guion de «${esc(P.meta.title)}» está cerrado: no se reemplaza con otra versión. Para cambiarlo, abre una revisión desde «Guion cerrado».</div>` : ''}
      ${blank ? `<label class="opt"><input type="radio" name="imode" value="fill" checked><span><b>Usar este guion en «${esc(P.meta.title)}»</b><span class="hint">El proyecto que acabas de crear.</span></span></label>` : ''}
      ${asEp ? `<label class="opt"><input type="radio" name="imode" value="episode" ${epMode ? 'checked' : ''}><span><b>Agregar como episodio de «${esc(P.meta.title)}»</b><span class="hint">${isSeries(P) ? 'Va al final de la serie, con sus escenas numeradas con el episodio delante.' : 'Para una serie: el guion que ya tiene pasa a ser el episodio 101 y este, el que sigue.'}</span>
        <span class="imp-ep"><input id="iepN" class="tnum" value="${ea(epN)}" maxlength="6" aria-label="Número del episodio" title="Número del episodio"><input id="iepT" value="${ea(parsed.title || '')}" placeholder="Título del episodio" maxlength="120" aria-label="Título del episodio"></span></span></label>` : ''}
      <label class="opt"><input type="radio" name="imode" value="new" ${blank || same || epMode ? '' : 'checked'}><span><b>Crear un proyecto nuevo</b><span class="hint">«${esc(title)}»</span></span></label>
      ${canUpdate ? `<label class="opt"><input type="radio" name="imode" value="update" ${same ? 'checked' : ''}><span><b>Actualizar el guion de «${esc(P.meta.title)}»</b><span class="hint">Conserva el desglose, los planos y el plan de rodaje donde el texto coincide; cada escena mantiene su número y las nuevas toman letra (12A).</span></span></label>` : ''}
      <label class="opt"><input type="checkbox" id="iauto" checked><span><b>Desglose automático</b><span class="hint">Marca reparto, locaciones y elementos probables como sugerencias (línea punteada) para que los confirmes.</span></span></label>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="impOk">Importar</button>`,
  });
  $('#impOk', m).onclick = () => {
    const mode = ($('input[name=imode]:checked', m) || {}).value;
    const auto = $('#iauto', m).checked;
    let added = 0, lost = 0;
    if (mode === 'episode') {
      const n = $('#iepN', m).value.trim(), t = $('#iepT', m).value;
      if (!epOk(n)) { toast('El número del episodio: hasta 6 letras o números, sin espacios (102, 2, S1E2).'); return; }
      if (computeScenes(P.paras).eps.some(e => e.n === n)) { toast(`Ya hay un episodio ${n}.`); return; }
      closeModal();
      histNote('Agregar episodio');
      const was = isSeries(P);
      const at = epAppend(P, parsed.paras, n, t, '101');
      const fd = parsed.fdTags.map(x => ({ ...x, p: x.p + at }));
      if (auto) added = autoBreakdown(P, { replaceAuto: false, fdTags: fd });
      else if (fd.length) added = autoBreakdown(P, { fdTags: fd, replaceAuto: false, noDict: true });
      changed('script'); changed('data');
      derive();
      importDone(`${was ? '' : 'Ahora es una serie · '}Episodio ${n} · ${sc.scenes.length} ${sc.scenes.length === 1 ? 'escena' : 'escenas'} · ${pages.length} ${pages.length === 1 ? 'página' : 'páginas'}${added ? ` · ${added} elementos sugeridos` : ''}`);
      return;
    }
    closeModal();
    if (mode === 'fill') {
      P.paras = parsed.paras;
      for (const [n, t] of Object.entries(parsed.epTitles || {})) epSetTitle(P, n, t);   // series en un solo Fountain
      if (!P.meta.title || P.meta.title === 'Proyecto sin título' || P.meta.title === trData('Proyecto sin título')) P.meta.title = title;
      if (auto) added = autoBreakdown(P, { fdTags: parsed.fdTags });
      else if (parsed.fdTags.length) added = autoBreakdown(P, { fdTags: parsed.fdTags, replaceAuto: false, noDict: true });
      derive();
      // las escenas quedan «sin programar»: las jornadas las arma cada quien (o «Sugerir jornadas» en el plan)
      if (D.sc.scenes.length) syncBudget(P, D.sc, D.sem);
      changed('script'); changed('data');
      importDone(`${pages.length} ${pages.length === 1 ? 'página' : 'páginas'} · ${sc.scenes.length} ${sc.scenes.length === 1 ? 'escena' : 'escenas'} · ${added} elementos sugeridos`);
    } else if (mode === 'update') {
      // qué escenas entran y cuáles salen (y de qué jornada), para decirlo al terminar
      const dayOf = {}; scheduleDays(P, D.sc).days.forEach((d, n) => d.keys.forEach(k => { dayOf[k] = n + 1; }));
      const k0 = new Set(D.sc.scenes.map(s => s.key));
      lost = remapProject(P, parsed.paras);
      if (auto) added = autoBreakdown(P, { replaceAuto: false, fdTags: parsed.fdTags });
      changed('script'); changed('data');
      derive();
      const k1 = new Set(D.sc.scenes.map(s => s.key)), nu = [...k1].filter(k => !k0.has(k)), out = [...k0].filter(k => !k1.has(k));
      const list = a => a.length > 6 ? a.slice(0, 6).join(', ') + '…' : a.join(', ');
      const outTxt = out.length ? ` ${out.length === 1 ? 'Ya no está la escena' : 'Ya no están las escenas'} ${list(out.map(k => k + (dayOf[k] ? ` (jornada ${dayOf[k]})` : '')))}.` : '';
      const nuTxt = nu.length ? ` ${nu.length === 1 ? 'Escena nueva' : 'Escenas nuevas'}: ${list(nu)}${P.schedule.items.some(it => it.d) ? ', en «Sin programar» del plan' : ''}.` : '';
      importDone(`Guion actualizado.${nuTxt}${outTxt}${lost ? ` ${lost} ${lost === 1 ? 'marca confirmada no encontró su texto' : 'marcas confirmadas no encontraron su texto'}.` : ''}${added ? ` ${added} ${added === 1 ? 'sugerencia nueva' : 'sugerencias nuevas'}.` : ''}`, nu.length || out.length ? 9000 : 4600);
    } else {
      if (!creatable) { if (typeof freeLimitNotice === 'function') freeLimitNotice(); return; }
      const Pn = newProject(title, parsed.paras);
      for (const [n, t] of Object.entries(parsed.epTitles || {})) epSetTitle(Pn, n, t);
      if (typeof autoKind === 'function' && autoKind()) Pn._kind = autoKind();
      if (auto) added = autoBreakdown(Pn, { fdTags: parsed.fdTags });
      else if (parsed.fdTags.length) added = autoBreakdown(Pn, { fdTags: parsed.fdTags, replaceAuto: false, noDict: true });
      Pn._saved = false;
      setProject(Pn);
      const scx = computeScenes(Pn.paras);
      if (scx.scenes.length) syncBudget(Pn, D.sc, D.sem);
      changed('script'); changed('data');
      importDone(`${pages.length} ${pages.length === 1 ? 'página' : 'páginas'} · ${sc.scenes.length} ${sc.scenes.length === 1 ? 'escena' : 'escenas'} · ${added} elementos sugeridos`);
    }
  };
}
/* importación lista: se abre el guion rayado para ver el resultado (escenas, reparto y elementos marcados) */
function importDone(msg, ms = 4600) {
  UI.scene = 0;
  setTab('lined');
  toast('✓ Guion importado · ' + msg, ms);
  requestAnimationFrame(() => { const v = $('#view .center') || $('#view'); if (v) { v.classList.add('flash'); setTimeout(() => v.classList.remove('flash'), 1400); } });
}
/* tipo de un proyecto nuevo en la web con cuentas: el plan Guion solo crea guiones; los demás, proyectos de producción */
const newKind = () => API() && APITEAM.me && !(APITEAM.me.limits && APITEAM.me.limits.projects) ? 'guion' : 'prod';
async function canCreateProject(quiet, kind) {
  if (Store.kind === 'api') {
    const me = APITEAM.me;
    if (!me || !me.limits) return true;
    // web con cuentas: guiones (plan Guion, 5) o proyectos de producción (Indie 2, Pro 7, Studio 20)
    const k = kind || newKind();
    if (k === 'guion' ? me.limits.scripts == null || (me.scripts || 0) < me.limits.scripts : (me.own || 0) < (me.limits.projects || 0)) return true;
    if (!quiet) freeLimitNotice(k);
    return false;
  }
  if (Store.kind !== 'desk' || LIC.mode !== 'free') return true;
  const n = (await Store.list().catch(() => [])).filter(x => !x.shared).length;
  if (n < (LIC.freeProjects || 1)) return true;
  if (!quiet && typeof freeLimitNotice === 'function') freeLimitNotice();
  return false;
}
async function restoreBackup(text) {
  let o;
  try { o = JSON.parse(text); } catch (e) { toast('Ese archivo no es un proyecto válido.'); return; }
  // archivo de proyecto (.fsp, antes .fmst): guion, datos e imágenes por separado
  if (o && o.script && o.data && Array.isArray(o.script.paras)) o = { ...o.data, paras: o.script.paras, frameImages: o.frames || {} };
  if (!o || !Array.isArray(o.paras)) { toast('Ese archivo no es un proyecto de FilmSpirit.'); return; }
  if (!(await canCreateProject())) return;
  // un archivo puede venir de cualquiera: sin claves peligrosas ni datos internos de la app (los que empiezan con «_»)
  cleanTree(o);
  for (const k of Object.keys(o)) if (k.startsWith('_')) delete o[k];
  const Pn = Object.assign(newProject(), o);
  if (typeof autoKind === 'function' && autoKind()) { Pn._kind = autoKind(); if (Pn._kind === 'guion') toast('Se abre como guion: en un guion se guardan el texto y las notas. Llévalo a producción para guardar lo demás.', 7000); }
  const imgs = cleanFrames(o.frameImages);
  delete Pn.frameImages; delete Pn.format;
  Pn.id = uid('p');
  const titles = new Set((await Store.list().catch(() => [])).map(x => x.title));
  Pn.meta.title = Pn.meta.title || 'Proyecto';
  if (titles.has(Pn.meta.title)) Pn.meta.title += ' (copia)';
  Pn._saved = false;
  setProject(Pn);
  changed('script'); changed('data');
  FRAMES = imgs; FRAMES_PID = Pn.id; FRIDX = null; FR_KNOWN = Pn.id;
  (async () => {
    const bad = [];
    for (const [sid, url] of Object.entries(imgs)) { try { await Store.saveFrame(Pn.id, sid, url); } catch (e) { bad.push([sid, url]); } }
    if (bad.length) problem(`${bad.length} ${bad.length === 1 ? 'imagen de la copia no se pudo guardar' : 'imágenes de la copia no se pudieron guardar'}.`, async () => { let n = 0; for (const [sid, url] of bad) { try { await Store.saveFrame(Pn.id, sid, url); } catch (e) { n++; } } if (n) problem(`Siguen sin guardarse ${n} imágenes.`); else toast('Imágenes guardadas.'); });
  })();
  render();
  toast(`«${Pn.meta.title}» abierto.`);
}
