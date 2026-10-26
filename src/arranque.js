/* ============================================================
   ARRANQUE · boot(), que el armado llama al final de todo
   (antes al final de ui.js; va después de importar.js en el armado)
   ============================================================ */
/* ---------- arranque ---------- */
async function boot() {
  paintBrand();
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) setTab(b.dataset.tab); });
  tabGroupsBuild();
  // (lote W) abre el panel «Personalización» (leyenda.js) en «Tu pantalla»: modo, pestañas visibles, colores y letra
  { const tc = document.createElement('button'); tc.type = 'button'; tc.id = 'tabsCfg'; tc.className = 'tabs-cfg'; tc.title = 'Personalización: modo, pestañas visibles, colores y letra'; tc.setAttribute('aria-label', 'Personalización'); tc.setAttribute('aria-controls', 'lookPanel'); tc.innerHTML = ICO.more; tc.onclick = () => lookToggle('me'); $('#tabs').appendChild(tc); }
  $('#tabs').addEventListener('scroll', tabFade, { passive: true });
  addEventListener('resize', debounce(() => tabInView(false), 200));
  $('#newBtn').onclick = e => newMenu(e.currentTarget);
  // el logo vuelve a Inicio (inicio.js)
  $('#brand').addEventListener('click', () => { if (Store.kind !== 'mem') homeShow(); });
  $('#undoBtn').onclick = () => histUndo();
  $('#redoBtn').onclick = () => histRedo();
  $('#openBtn').onclick = e => openMenu(e.currentTarget);
  $('#shareBtn').onclick = e => shareProject(e.currentTarget);
  $('#helpBtn').onclick = e => helpMenu(e.currentTarget);   // barra.js
  $('#moreBtn').onclick = e => phoneMenu(e.currentTarget);   // el teléfono: proyectos, ayuda e idioma (barra.js)
  barsAutoHide();
  // al pasar de teléfono a computadora (o al girar la tableta), la barra de la pestaña se arma de nuevo
  tabsPlace();
  try { matchMedia('(max-width: 760px)').addEventListener('change', () => { tgClose(); closePop(); tabsPlace(); barsShow(); if (P && !document.body.classList.contains('home')) render(); }); } catch (e) { }
  $('#langBtn').onclick = e => langMenu(e.currentTarget);   // i18n.js
  $('#projBtn').onclick = () => { if (UI.tab !== 'project') setTab('project'); };   // el título abre Proyecto: datos, logos y equipo
  if (API()) document.documentElement.dataset.srv = '1';   // con servidor: la imagen de Inicio (/portada/)
  $('#fileIn').addEventListener('change', e => onFile(e.target.files[0]));
  const t = ls.get('tab', 'script');
  UI.tab = RENDER[t] ? t : 'script';
  paintTabSel();
  $('#tabs').addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key) || !e.target.closest('.tab')) return;
    const list = $$('#tabs .stg .tab').filter(b => !b.hidden), i = list.indexOf(e.target.closest('.tab'));
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
    e.preventDefault(); list[j].focus(); setTab(list[j].dataset.tab);
  });
  sharePaintTabs();
  requestAnimationFrame(() => tabInView(false));
  await Store.init();
  const first = Store.kind === 'desk' && typeof deskInit === 'function' ? await deskInit() : Store.kind === 'api' ? apiStartPid() : null;
  let list = [], listErr = null;
  try { list = await Store.list(); } catch (e) { listErr = e; }
  const last = ls.get('last', null);
  // recargó la pestaña (F5, Ctrl + Mayús + R, una versión nueva): vuelve al proyecto que tenía abierto (inicio.js)
  const here0 = typeof hereGet === 'function' ? hereGet() : null;
  const back = !first && typeof hereResume === 'function' ? hereResume(list, listErr) : null;
  // si la lista no cargó, se intenta abrir el último proyecto igual (no el ejemplo, que haría pensar que se perdió todo)
  const pick = first ? { id: first } : back ? { id: back.pid } : list.find(x => x.id === last) || list[0] || (listErr && last ? { id: last } : null);
  if (listErr) setTimeout(() => problem('No se pudo cargar la lista de proyectos.', () => location.reload()), 400);
  // sin enlace ni archivo que abrir: Inicio, con los proyectos del último abierto al primero (inicio.js)
  const home = !first && !back && Store.kind !== 'mem' && (list.length || !listErr) && !(Store.kind === 'api' && PAGO_SID);
  if (!first && Store.kind === 'api' && !PAGO_SID && await landingScene()) { /* la escena de la portada, abierta como guion nuevo */ }
  else if (home) { await homeShow(); }
  else if (pick) {
    const ok = await openProject(pick.id);
    if (ok && here0 && here0.pid === pick.id) hereScroll(here0);   // también con el enlace ?p= de la web
    // enlace a un proyecto sin acceso: se abre el último propio
    const alt = !ok && Store.kind === 'api' && first ? list.find(x => x.id === last) || list[0] : null;
    if (alt) await openProject(alt.id);
  }
  else setProject(buildSample());
  if (Store.kind === 'api') apiPaymentReturn();
  if (typeof deskReady === 'function') deskReady();
  setSaveState();
  addEventListener('resize', debounce(() => { if (UI.tab === 'lined' || UI.tab === 'script') fitPages(); }, 150));
  addEventListener('beforeunload', e => {
    if (dirty.size) flushSave();
    // en la web, el navegador pregunta antes de cerrar si algo no llegó a guardarse (el escritorio guarda al cerrar)
    if (!DESK && unsavedWork()) { e.preventDefault(); e.returnValue = ''; }
  });
}
/* la escena escrita en la hoja de la portada (server/web/portada.js, «Guardar guion»): queda en este navegador y, al
   entrar a la app con la cuenta, se abre como un guion nuevo (con el límite del plan, como cualquier proyecto nuevo) */
async function landingScene() {
  if (Store.kind !== 'api') return false;
  let o = null;
  try { o = JSON.parse(localStorage.getItem('fs_escena') || 'null'); localStorage.removeItem('fs_escena'); } catch (e) { return false; }
  if (!o || !Array.isArray(o.paras) || Date.now() - (Number(o.at) || 0) > 7 * 864e5) return false;
  const paras = o.paras.filter(p => p && ['h', 'a', 'c', 'd'].includes(p.t) && typeof p.x === 'string' && p.x.trim())
    .slice(0, 40).map(p => ({ t: p.t, x: p.x.trim().slice(0, 600) }));
  if (!paras.length) return false;
  const kind = typeof autoKind === 'function' ? autoKind() : null;
  if (!(await canCreateProject(false, kind))) return false;
  const Pn = newProject(String(o.title || '').trim().slice(0, 80) || trData('Proyecto sin título'), paras);
  if (kind) Pn._kind = kind;
  Pn._saved = false;
  setProject(Pn);
  changed('script'); changed('data');
  setTab('script');
  toast('Tu escena de la portada quedó guardada como un guion nuevo.', 5200);
  return true;
}
/* trabajo que se perdería al cerrar la pestaña */
function unsavedWork() {
  if (!P || UI.readOnly) return false;
  if (typeof PHOTO_UP !== 'undefined' && PHOTO_UP.size) return true;   // fotos que se están subiendo (laminas.js)
  if (modalDirty($('#modal')) || (typeof S2 !== 'undefined' && S2 && S2.dirty)) return true;
  if (P._sample && !P._saved) return !!P._touched;
  if (Store.kind === 'mem') return !!P._touched;
  if (P._blocked) return !!P._touched;
  return !!(dirty.size || saving || (saveErr && !/^Sin conexión · guardado/.test(saveErr)));
}
