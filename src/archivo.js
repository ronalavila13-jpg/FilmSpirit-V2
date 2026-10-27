/* ============================================================
   ARCHIVAR · el proyecto completo en un ZIP y proyectos archivados
   El ZIP lleva el archivo del proyecto (.fsp, se vuelve a abrir en FilmSpirit), todos los
   documentos en PDF y Excel que permite el plan, las imágenes (viñetas del storyboard, fotos
   del desglose, logos), el directorio del equipo y un LEEME con el índice.
   Archivar (web con cuentas): el proyecto queda en solo lectura (se ve y se exporta) y deja
   libre su lugar entre los proyectos activos del plan; se desarchiva cuando haya un lugar.
   ============================================================ */
const dataUrlBytes = u => { const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(u || '')); if (!m) return null; if (!m[2]) return new TextEncoder().encode(decodeURIComponent(m[3])); const b = atob(m[3]), out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out; };
const dataUrlExt = u => /^data:image\/png/i.test(u) ? 'png' : /^data:image\/webp/i.test(u) ? 'webp' : 'jpg';
const zipName = s => fileSafe(s).replace(/_/g, ' ').trim().replace(/\s+/g, '_') || 'archivo';

/* qué documentos lleva el ZIP: [nombre en el ZIP, tipo, opciones, función de Pro, ¿necesita escenas?] */
function zipDocs() {
  const av = edFormat() === 'av';
  return [
    ['01_Argumento.pdf', 'argumento', null, '', false],
    ['02_Premisa_y_mundo.pdf', 'premisa', null, '', false],
    ['03_Biografias.pdf', 'bios', null, '', false],
    ['04_Estructura.pdf', 'estructura', null, '', false],
    ['05_Escaleta.pdf', 'escaleta', null, '', false],
    ['06_Guion.pdf', 'screenplay', null, '', false],
    [av ? '07_Guion_AV_rayado.pdf' : '07_Guion_rayado.pdf', 'script', null, 'rayado', true],
    ['08_Desglose.pdf', 'breakdown', null, '', true],
    ['09_Scouting.pdf', 'scouting', { photos: true }, '', false],
    ['10_Casting.pdf', 'casting', { photos: true }, '', false],
    ['11_Storyboard.pdf', 'storyboard', { plan: false }, '', true],
    ['12_Storyboard_con_planta.pdf', 'storyboard', { plan: true }, 'planta', true],
    ['13_Guion_tecnico.pdf', 'shotlist', null, '', true],
    ['14_Animatic.pdf', 'animatic', null, '', true],
    ['15_Plan_de_rodaje.pdf', 'plan', null, 'prodpdf', true],
    ['16_Calendario.pdf', 'calendar', null, 'prodpdf', false],
    ['17_Hojas_de_llamado.pdf', 'call', { all: true }, 'prodpdf', true],
    ['18_Presupuesto.pdf', 'budget', null, 'prodpdf', false],
    ['19_Hoja_de_script.pdf', 'sup', null, 'prodpdf', true],
  ];
}
// cada documento sale si se ve su pestaña; el guion y el rayado, con el Guion rayado (lote AD: lo ve todo el equipo)
const DOC_TAB = { argumento: 'build', premisa: 'build', bios: 'build', estructura: 'build', escaleta: 'build', scouting: 'scout', casting: 'casting', screenplay: 'lined', script: 'lined', breakdown: 'breakdown', storyboard: 'board', shotlist: 'board', animatic: 'animatic', plan: 'plan', calendar: 'cal', call: 'call', budget: 'budget', sup: 'sup' };
async function buildProjectZip(step) {
  const files = [], skipped = [], base = zipName(P.meta.title);
  const add = (name, data) => files.push([base + '/' + name, data]);
  const say = t => { if (step) step(t); };
  // 1. el proyecto, para volver a abrirlo en FilmSpirit
  say('Proyecto');
  const frames = FRAMES_PID === P.id ? await framesAll() : await Store.loadFrames(P.id).catch(() => ({}));
  const data = JSON.parse(Store.serialize(P, 'data'));
  for (const k of Object.keys(data)) if (k.startsWith('_')) delete data[k];
  add(base + '.' + PROJ_EXT, JSON.stringify({ format: PROJ_EXT + '-1', app: appName() + ' web', id: P.id, title: P.meta.title, updated: Date.now(), script: { paras: P.paras }, data, frames }));
  if (P.paras.length) { OFFER_CAPTURE = []; try { exportFountain(); const [x] = OFFER_CAPTURE; if (x) add('Guion/' + base + '.fountain', x[1]); } finally { OFFER_CAPTURE = null; } }
  // 2. documentos en PDF (los que permite el plan y los permisos)
  for (const [name, kind, opts, gate, needSc] of zipDocs()) {
    if (gate && !planAllows(gate)) { skipped.push(name.replace(/^\d+_|\.pdf$/g, '').replace(/_/g, ' ') + ' (Pro y Studio)'); continue; }
    if (needSc && !D.sc.scenes.length) continue;
    if (typeof canSeeTab === 'function' && !canSeeTab(DOC_TAB[kind])) continue;
    if (kind === 'budget' && typeof budOpen === 'function' && !budOpen()) { skipped.push('Presupuesto (bloqueado con código)'); continue; }
    if (kind === 'calendar' && !P.calendar.tasks.length && !D.sc.scenes.length) continue;
    // Construcción, Scouting y Casting: solo si tienen algo
    if (kind === 'argumento' && !(P.build && Object.values(P.build.arg || {}).some(t => String(t || '').trim()))) continue;
    if (kind === 'escaleta' && !(bItems().length)) continue;
    if (kind === 'premisa' && !bPremHas()) continue;      // (lote AD) Premisa y mundo, y Estructura
    if (kind === 'estructura' && !bBeatsHas()) continue;
    if (kind === 'bios' && !Object.values((P.build || {}).bios || {}).some(b => b && (b.look || b.persona || b.past || b.want || b.need || b.fear || b.arc || b.rel || b.notes || '').trim())) continue;
    if (kind === 'scouting' && !Object.values((P.scout || {}).places || {}).some(p => p.cands && p.cands.length)) continue;
    if (kind === 'casting' && !Object.values((P.casting || {}).roles || {}).some(r => (r.cands && r.cands.length) || String(r.brief || '').trim())) continue;
    say(name.replace(/^\d+_|\.pdf$/g, '').replace(/_/g, ' '));
    OFFER_CAPTURE = [];
    try { await exportPDF(kind, null, opts || {}); const [x] = OFFER_CAPTURE; if (x) add('PDF/' + name, new Uint8Array(await x[1].arrayBuffer())); }
    catch (e) { console.warn('zip', kind, e); }
    finally { OFFER_CAPTURE = null; }
    await new Promise(r => setTimeout(r, 0));
  }
  // 3. Excel
  if (planAllows('excel')) {
    for (const [name, run, tab] of [['Plan_de_rodaje.xlsx', () => exportPlanXLSX(), 'plan'], ['Hojas_de_llamado.xlsx', () => exportCallXLSX(true), 'call'], ['Calendario.xlsx', () => exportCalXLSX(), 'cal']]) {
      if ((tab !== 'cal' && !D.sc.scenes.length) || (typeof canSeeTab === 'function' && !canSeeTab(tab))) continue;
      say(name.replace(/_|\.xlsx/g, ' '));
      OFFER_CAPTURE = [];
      try { await run(); const [x] = OFFER_CAPTURE; if (x) add('Excel/' + name, new Uint8Array(await x[1].arrayBuffer())); } catch (e) { console.warn('zip', name, e); } finally { OFFER_CAPTURE = null; }
    }
  } else skipped.push('Excel del plan, el llamado y el calendario (Pro y Studio)');
  // 4. imágenes
  say('Imágenes');
  if (D.sc.scenes.length) for (const s of D.sc.scenes) for (const sh of D.shotsBy[s.key] || []) {
    let u = null; try { u = frameOf(sh); } catch (e) { }
    const b = u && dataUrlBytes(u); if (b) add(`Imagenes/Storyboard/Esc_${zipName(s.key)}/Plano_${zipName(String(D.code[sh.id] || '').replace(/\./g, '-'))}.${dataUrlExt(u)}`, b);
  }
  // fotos del scouting y del casting
  for (const [b, pl] of Object.entries((P.scout || {}).places || {})) for (const c of pl.cands || []) (c.ph || []).forEach((p, i) => {
    const u = (frames || {})[`lc~${c.id}~${p.id}`], by = u && dataUrlBytes(u); if (by) add(`Imagenes/Scouting/${zipName(titleCase(b))}/${zipName(c.name || 'Candidata')}_${i + 1}.${dataUrlExt(u)}`, by);
  });
  for (const [el, r] of Object.entries((P.casting || {}).roles || {})) for (const c of r.cands || []) (c.ph || []).forEach((p, i) => {
    const u = (frames || {})[`ca~${el}~${c.id}~${p.id}`], by = u && dataUrlBytes(u); if (by) add(`Imagenes/Casting/${zipName(P.elements[el] ? titleCase(P.elements[el].name) : 'Personaje')}/${zipName(c.name || 'Candidato')}_${i + 1}.${dataUrlExt(u)}`, by);
  });
  // fotos del punto de encuentro de cada jornada
  callDays().days.forEach((d, j) => ((((P.call || {}).days || {})[d.id] || {}).meet || { ph: [] }).ph.forEach((p, i) => {
    const u = (frames || {})[`cl~${d.id}~${p.id}`], by = u && dataUrlBytes(u); if (by) add(`Imagenes/Punto_de_encuentro/Jornada_${j + 1}_${i + 1}.${dataUrlExt(u)}`, by);
  }));
  for (const [k, u] of Object.entries(frames || {})) {
    if (!k.startsWith('bd~')) continue;
    const el = P.elements[k.split('~')[1]]; if (!el) continue;
    const b = dataUrlBytes(u); if (b) add(`Imagenes/Desglose/${zipName(CAT[el.cat] ? CAT[el.cat].name : el.cat)}/${zipName(el.name)}_${k.split('~')[2] || '1'}.${dataUrlExt(u)}`, b);
  }
  for (const [k, n] of [['projLogo', 'logo_del_proyecto'], ['logo', 'logo_de_la_empresa']]) { const u = P.meta[k], b = u && dataUrlBytes(u); if (b) add(`Imagenes/Logos/${n}.${dataUrlExt(u)}`, b); }
  // 5. equipo
  const team = teamRows();
  if (team.length) add('Equipo/Directorio_del_equipo.csv', '﻿' + teamCSV(team));
  // 6. índice
  const list = files.map(f => '  ' + f[0].slice(base.length + 1)).join('\n');
  add('LEEME.txt', `${P.meta.title}\nArchivo del proyecto generado por ${appName()} el ${new Date().toLocaleString('es-PE')}.\n\n`
    + `Para volver a abrirlo: en ${appName()}, «Abrir proyecto» › «Abrir un archivo» y elige ${base}.${PROJ_EXT}.\n\nContenido:\n${list}\n`
    + (skipped.length ? `\nNo incluidos con tu plan actual:\n${skipped.map(x => '  · ' + x).join('\n')}\n` : '')
    + (LIC.mode === 'free' ? `\nLos PDF llevan la marca de agua de la versión gratuita (FilmSpiritpro.com).\n` : ''));
  say('Comprimiendo');
  await new Promise(r => setTimeout(r, 0));
  return { bytes: xlZip(files), n: files.length, skipped };
}
async function archiveZipDialog() {
  if (!P) return;
  if (!(await loadPdfLib())) { problem('No se pudo cargar el generador de PDF. Revisa tu conexión.', () => archiveZipDialog()); return; }
  await imgPrepPdf([P.meta.logo, P.meta.projLogo]);   // los logos en WebP van como PNG (imagenes.js)
  const m = modal({
    title: 'Descargar todo el proyecto',
    body: `<p style="margin:0">Un ZIP con el archivo del proyecto (.${PROJ_EXT}), el guion, los documentos en PDF${planAllows('excel') ? ' y Excel' : ''}, las imágenes del storyboard y del desglose, y el directorio del equipo.</p>
      <div class="prog"><i id="zpP" style="width:0"></i></div><p class="hint" id="zpT" style="margin:0">Preparando…</p>`,
    foot: '<button class="btn" data-close>Cerrar</button>',
  });
  const docs = zipDocs().length + 6; let k = 0;
  try {
    const r = await buildProjectZip(t => { k++; const p = $('#zpP', m), x = $('#zpT', m); if (p) p.style.width = Math.min(96, k / docs * 100) + '%'; if (x) x.textContent = t + '…'; });
    if (!$('#zpT', m)) return;      // cerró la ventana
    $('#zpP', m).style.width = '100%';
    $('#zpT', m).textContent = `${r.n} archivos · ${(r.bytes.length / 1048576).toFixed(1)} MB${r.skipped.length ? ` · sin ${r.skipped.length} documentos de Pro` : ''}`;
    await offerFile(zipName(P.meta.title) + '_archivo.zip', new Blob([r.bytes], { type: 'application/zip' }));
  } catch (e) { console.error(e); const x = $('#zpT', m); if (x) x.textContent = 'No se pudo armar el ZIP: ' + (e.message || e); }
}
/* archivar o desarchivar (web con cuentas: lo decide el servidor) */
async function archiveProject(on) {
  if (!P || Store.kind !== 'api' || !P._shared || !SHARE || !SHARE.admin) { toast('Solo producción puede archivar este proyecto.'); return; }
  const go = async (zip) => {
    try {
      if (dirty.size) await flushSave();
      if (zip) await archiveZipDialog();
      const r = await APITEAM.archive(P.id, on);
      SHARE.archived = r.archived; SHARE.ro = !!r.archived;
      toast(on ? 'Proyecto archivado: queda en solo lectura y libera su lugar.' : 'Proyecto desarchivado: ya puedes editarlo.', 4500);
      APITEAM.check(P.id);
      sharePaintTabs(); render();
    } catch (e) {
      if (e.code === 'limit_projects' || e.code === 'limit_scripts' || e.code === 'need_plan') freeLimitNotice(e.data && e.data.kind, e.message); else toast(e.message || 'No se pudo cambiar el proyecto.', 6000);
    }
  };
  if (!on) return go(false);
  const m = modal({
    title: 'Archivar el proyecto',
    body: `<p style="margin:0">«${esc(P.meta.title)}» quedará en <b>solo lectura</b>: tú y tu equipo pueden verlo y exportarlo, pero no editarlo. Deja libre su lugar entre los proyectos activos de tu plan. Puedes desarchivarlo cuando tengas un lugar libre.</p>
      <label class="opt"><input type="checkbox" id="arZip" checked><span><b>Descargar antes todo el proyecto en un ZIP</b><span class="hint">El archivo del proyecto, los documentos en PDF, las imágenes y el directorio del equipo.</span></span></label>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="arGo">Archivar</button>',
  });
  $('#arGo', m).onclick = () => { const zip = $('#arZip', m).checked; closeModal(); go(zip); };
}
