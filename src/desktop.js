/* ============================================================
   APP DE ESCRITORIO · licencia, menú, abrir archivos y cierre seguro
   (solo se incluye en la versión instalable)
   ============================================================ */
const APPINFO = { name: 'FilmSpirit', ext: 'fmst', version: '', root: '', buyUrl: '', supportEmail: '' };
const editionName = () => APPINFO.name + ' ' + EDITION();
const licDate = s => { try { return new Date(s).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return s; } };

async function deskInit() {
  Object.assign(APPINFO, await DESK.info());
  await refreshLicense();
  DESK.onMenu(deskMenu);
  if (typeof shareInit === 'function') shareInit();
  DESK.onOpenFile(f => deskOpenPath(f));
  DESK.onFlush(deskFlush);
  DESK.onStoreError(m => { saveErr = 'No se pudo guardar en disco'; setSaveState(); toast('No se pudo guardar: ' + m, 6000); });
  const chip = document.createElement('button');
  chip.type = 'button'; chip.id = 'licChip'; chip.className = 'lic-chip';
  chip.onclick = () => licenseDialog();
  $('.topbar .spacer').after(chip);
  paintLicChip();
  const f = await DESK.initialFile();
  if (f) { try { return await DESK.openPath(f); } catch (e) { toast('No se pudo abrir ' + f.split(/[\\/]/).pop()); } }
  return null;
}
function deskReady() {
  // avisos de licencia al arrancar
  if (LIC.mode === 'trial' && LIC.daysLeft <= 3) toast(`Tu prueba de ${APPINFO.name} Pro termina en ${LIC.daysLeft} ${LIC.daysLeft === 1 ? 'día' : 'días'}.`, 5000);
  if (LIC.mode === 'free' && !ls.get('freeSeen', false)) { ls.set('freeSeen', true); setTimeout(() => licenseDialog(`La prueba de ${APPINFO.name} Pro terminó. Puedes seguir con ${APPINFO.name} Free o activar ${APPINFO.name} Pro.`), 600); }
}
async function refreshLicense() {
  try { LIC = await DESK.license.status(); } catch (e) { LIC = { mode: 'trial', daysLeft: 15 }; }
  paintLicChip();
  return LIC;
}
function paintLicChip() {
  document.title = editionName();
  paintBrand();   // el logotipo lleva la edición: FilmSpirit Free o FilmSpirit Pro
  const c = $('#licChip'); if (!c) return;
  c.hidden = LIC.mode === 'pro';
  c.className = 'lic-chip ' + LIC.mode;
  c.textContent = LIC.mode === 'trial' ? `Prueba de Pro · ${LIC.daysLeft} ${LIC.daysLeft === 1 ? 'día' : 'días'}` : 'Activar Pro';
  c.title = APPINFO.name + ' Pro';
}
/* cierre de la ventana: guarda todo lo pendiente, incluso un plano abierto en el editor */
async function deskFlush() {
  try { if (typeof EDT !== 'undefined' && EDT && EDT.saveNow) await EDT.saveNow(); } catch (e) { }
  for (let i = 0; i < 80 && (saving || dirty.size); i++) {
    if (!saving && dirty.size) await flushSave();
    else await new Promise(r => setTimeout(r, 50));
  }
}
async function deskOpenPath(f) {
  try { const pid = await DESK.openPath(f); await openProject(pid); }
  catch (e) { toast('No se pudo abrir ' + String(f).split(/[\\/]/).pop()); }
}
async function deskMenu(cmd) {
  // en Inicio no hay proyecto abierto: solo crear, abrir, importar y la licencia
  if (!P && !['new', 'open', 'import', 'license', 'about'].includes(cmd)) { toast('Abre un proyecto primero.'); return; }
  if (cmd.startsWith('tab:')) { closeModal(); if (typeof homeHide === 'function') homeHide(); return setTab(cmd.slice(4)); }
  if (cmd === 'new') return newBlankProject();
  if (cmd === 'import') { setTab('project'); return pickFile(SCRIPT_ACCEPT, 'import'); }
  if (cmd === 'open') {
    const pid = await DESK.openDialog().catch(() => { toast('Ese archivo no es un proyecto válido.'); return null; });
    if (pid) await openProject(pid);
    return;
  }
  if (cmd === 'save') {
    await flushSave();
    if (P && P._saved) toast('Guardado');
    return;
  }
  if ((cmd === 'saveas' || cmd === 'reveal') && P && P._shared) { DESK.team.openDir(P.id); return; }
  if (cmd === 'saveas') {
    if (!P._saved) { P._touched = true; dirty.add('data'); await flushSave(); }
    if (!P._saved) return;
    await flushSave();
    const where = await DESK.saveAs(P.id, P.meta.title).catch(() => null);
    if (where) { P._path = where; setSaveState(); toast('Ahora se guarda en ' + where.split(/[\\/]/).pop()); }
    return;
  }
  if (cmd === 'reveal') {
    if (!P._saved) { toast('Este proyecto todavía no se ha guardado.'); return; }
    await flushSave(); await DESK.reveal(P.id); return;
  }
  if (cmd === 'info') return setTab('project');
  if (cmd === 'license') return licenseDialog();
  if (cmd === 'about') return aboutDialog();
}

function licenseDialog(lead) {
  const L = LIC, n = APPINFO.name;
  const status = L.mode === 'pro'
    ? `<div class="lic-st pro"><b>${esc(n)} Pro activo</b><span>A nombre de ${esc(L.name || '—')}${L.email ? ' · ' + esc(L.email) : ''}</span><span class="hint">Licencia emitida el ${esc(licDate(L.issued))}${L.expires ? ' · vence el ' + esc(licDate(L.expires)) : ' · sin vencimiento'}</span></div>`
    : L.mode === 'trial'
      ? `<div class="lic-st trial"><b>Prueba de ${esc(n)} Pro</b><span>Quedan ${L.daysLeft} ${L.daysLeft === 1 ? 'día' : 'días'}. Todas las funciones están disponibles.</span><span class="hint">Al terminar, sigue funcionando como ${esc(n)} Free: un proyecto y PDF con marca de agua.</span></div>`
      : `<div class="lic-st free"><b>${esc(n)} Free</b><span>Puedes trabajar en ${LIC.freeProjects || 1} proyecto propio y los PDF llevan una marca de agua. Sin PDF de guion, Excel, video del animatic, fotos en el desglose ni presupuesto con código. Puedes entrar a proyectos compartidos sin límite.</span><span class="hint">Con ${esc(n)} Pro creas proyectos sin límite, exportas sin marca y compartes con tu equipo.</span></div>`;
  const m = modal({
    title: n + ' Pro',
    body: `<div class="brand">${logoSVG('pro', 'big')}</div>${lead ? `<p style="margin:0">${esc(lead)}</p>` : ''}${status}
      ${L.mode !== 'pro' ? `<label class="fld"><span>Clave de licencia de ${esc(n)} Pro</span><textarea id="licKey" rows="4" spellcheck="false" placeholder="${esc(APPINFO.ext.toUpperCase())}1.…" style="font-family:var(--font-script);font-size:12px;word-break:break-all"></textarea></label>
      <p class="hint" id="licErr" style="margin:0;color:var(--bad)" hidden></p>` : ''}`,
    foot: `${L.mode === 'pro' ? '<div class="left"><button class="btn ghost sm danger" id="licOff">Quitar la licencia de este equipo</button></div>' : (APPINFO.buyUrl ? `<div class="left"><button class="btn" id="licBuy">Comprar ${esc(n)} Pro</button></div>` : '')}
      <button class="btn" data-close>${L.mode === 'pro' ? 'Cerrar' : 'Ahora no'}</button>${L.mode !== 'pro' ? '<button class="btn primary" id="licOk">Activar Pro</button>' : ''}`,
  });
  const ok = $('#licOk', m);
  if (ok) ok.onclick = async () => {
    const k = $('#licKey', m).value.trim();
    if (!k) { $('#licKey', m).focus(); return; }
    const r = await DESK.license.activate(k);
    if (!r.ok) { const e = $('#licErr', m); e.textContent = r.err; e.hidden = false; return; }
    await refreshLicense();
    if (P) { P._blocked = false; P._blockNoticed = false; }
    closeModal();
    toast(`${APPINFO.name} Pro activado. ¡Gracias!`, 4000);
    if (P && P._touched && !P._saved) changed('data');
    setSaveState();
  };
  const buy = $('#licBuy', m); if (buy) buy.onclick = () => DESK.openExternal(APPINFO.buyUrl);
  const off = $('#licOff', m);
  if (off) off.onclick = () => confirmBox('Quitar la licencia', `Este equipo pasará a ${APPINFO.name} Free. Podrás activar la misma clave en otro equipo o volver a activarla aquí.`, 'Quitar', async () => {
    await DESK.license.deactivate(); await refreshLicense(); toast('Licencia quitada de este equipo.');
  });
}
function freeLimitNotice() {
  licenseDialog(`${APPINFO.name} Free permite ${LIC.freeProjects || 1} proyecto propio guardado. Este proyecto no se guardará hasta que actives ${APPINFO.name} Pro o elimines el otro proyecto.`);
}
async function aboutDialog() {
  const third = await DESK.thirdParty().catch(() => '');
  const L = LIC;
  modal({
    title: 'Acerca de ' + APPINFO.name, wide: true,
    body: `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div class="brand">${plateSVG()}</div><span class="badge">${esc(editionName())} · Versión ${esc(APPINFO.version)}</span></div>
      <p style="margin:0">${L.mode === 'pro' ? esc(editionName()) + ' · licenciado a ' + esc(L.name || L.email || '—') + '.' : L.mode === 'trial' ? 'Prueba de ' + esc(APPINFO.name) + ' Pro · quedan ' + L.daysLeft + ' días.' : esc(editionName()) + '.'}</p>
      <p class="hint" style="margin:0;word-break:break-all">Tus proyectos se guardan automáticamente en ${esc(APPINFO.root)}, con respaldos cada 10 minutos en la subcarpeta «Respaldos».</p>
      ${APPINFO.supportEmail ? `<p class="hint" style="margin:0">Soporte: ${esc(APPINFO.supportEmail)}</p>` : ''}
      <details><summary>Licencias de software de terceros</summary><pre class="lic-3p">${esc(third)}</pre></details>`,
    foot: '<button class="btn primary" data-close>Cerrar</button>',
  });
}
