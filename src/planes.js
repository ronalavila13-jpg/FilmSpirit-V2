/* ============================================================
   PLANES (web con cuentas) · guiones y proyectos de producción
   Guion (gratis): hasta 5 guiones activos, solo texto, coescritos por hasta 4 personas.
   Indie, Pro y Studio: guiones sin límite y proyectos de producción (2, 7 y 20 activos).
   Un guion se lleva a producción desde la pestaña Proyecto o desde cualquier pestaña de
   producción, que en un guion muestra qué se gana y el botón para hacerlo. Lo que no es del
   guion no se guarda en un guion (el servidor tampoco lo acepta).
   ============================================================ */
const SCRIPT_TABS = new Set(['script', 'project', 'build']);
const isScriptKind = () => Store.kind === 'api' && !!P && !P._sample && (P._shared ? !!(SHARE && SHARE.pid === P.id && SHARE.kind === 'guion') : P._kind === 'guion');
const TAB_GAIN = {
  lined: 'Marca sobre el guion el reparto, las locaciones y los elementos de cada escena.',
  breakdown: 'Reparto, locaciones, utilería, vestuario y efectos de cada escena, con fotos.',
  board: 'Los planos de cada escena, dibujados en 2D o con figuras 3D, con planta de cámara.',
  animatic: 'Los planos en el tiempo, con sonido, para ver la película antes de rodarla y exportarla en video.',
  plan: 'Las jornadas de rodaje, el orden de las escenas y los horarios, a partir del desglose.',
  cal: 'Las jornadas de preproducción, rodaje y posproducción en un calendario.',
  call: 'La hoja de llamado de cada jornada, lista para enviar al equipo.',
  budget: 'El presupuesto por partidas, en soles o dólares, protegido con código.',
  sup: 'La hoja de script del rodaje: tomas, continuidad y partes de cámara y sonido.',
  scout: 'Las locaciones candidatas, con fotos y mapa.',
  casting: 'El casting de cada personaje, con fotos y notas.',
};
/* las pestañas de producción de un guion: qué ganas al llevarlo a producción */
function planGate(tab) {
  if (!isScriptKind() || SCRIPT_TABS.has(tab)) return false;
  const me = APITEAM.me || { plan: 'free', limits: {} }, L = me.limits || {};
  const admin = !P._shared || (SHARE && SHARE.admin), paid = (L.projects || 0) > 0;
  const name = (typeof TAB_NAME !== 'undefined' && TAB_NAME[tab]) || 'Esta pestaña';
  const slots = paid ? `Usa 1 de tus ${L.projects} proyectos de producción (${me.own || 0} en uso).` : 'Los proyectos de producción son de Indie, Pro y Studio. Pro tiene 30 días de prueba gratis.';
  $('#view').innerHTML = `<div class="ws ws-1"><section class="center"><div class="scroller pad"><div class="kind-gate card">
    <div class="eyebrow">${esc(name)}</div>
    <h2>Lleva «${esc(P.meta.title || 'tu guion')}» a producción</h2>
    <p>${esc(TAB_GAIN[tab] || '')}</p>
    <p class="hint">Este proyecto es un guion: se guarda el texto y lo escriben hasta ${esc(String(L.writers || 4))} personas. En producción se suman el desglose, el storyboard, el animatic, el plan de rodaje, el calendario, la hoja de llamado y el presupuesto. El guion no cambia.</p>
    ${admin ? `<div class="kg-go"><button class="btn primary" data-act="kind-produce">${paid ? 'Llevar a producción' : 'Probar Pro 30 días gratis'}</button><span class="hint">${esc(slots)}</span></div>`
      : '<p class="hint"><b>Quien creó el guion puede llevarlo a producción.</b></p>'}
  </div></div></section></div>`;
  return true;
}
/* tarjeta de la pestaña Proyecto en un guion */
function kindCardHTML() {
  if (!isScriptKind()) return '';
  const me = APITEAM.me || { limits: {} }, L = me.limits || {}, paid = (L.projects || 0) > 0;
  const admin = !P._shared || (SHARE && SHARE.admin);
  return `<div class="card pj-card pj-wide pj-kindcard"><div class="eyebrow">Guion</div>
    <p style="margin:0">Este proyecto es un guion: lo escriben hasta ${esc(String(L.writers || 4))} personas y se guarda solo el texto${paid ? '; no ocupa un lugar entre tus proyectos de producción' : ''}. Cuando quieras desglosarlo y planificar el rodaje, llévalo a producción.</p>
    ${admin ? `<div class="pj-lb"><button class="btn primary" data-act="kind-produce">${paid ? 'Llevar a producción' : 'Llevar a producción · Pro 30 días gratis'}</button></div>` : ''}</div>`;
}
/* llevar el guion a producción: cuenta como uno de los proyectos de producción del plan */
async function produceProject() {
  if (!P || !isScriptKind()) return;
  const me = APITEAM.me || { limits: {} };
  if (!P._shared) {
    // aún no está en el servidor: basta con cambiar el tipo (se crea como proyecto de producción)
    if (!(me.limits && me.limits.projects)) { ls.set('produceAfter', 'new'); return freeLimitNotice('prod'); }
    if (!(await canCreateProject(false, 'prod'))) return;
    P._kind = 'prod'; P._blocked = false; changed('script'); changed('data');
    sharePaintTabs(); render(); toast('Listo: es un proyecto de producción.', 4000);
    return;
  }
  if (!SHARE || !SHARE.admin) { toast('Solo quien creó el guion puede llevarlo a producción.', 5000); return; }
  // sin plan de pago: los planes (con la prueba de Pro), sin pasar por el servidor
  if (!(me.limits && me.limits.projects)) { ls.set('produceAfter', P.id); return freeLimitNotice('prod'); }
  try {
    if (dirty.size) await flushSave();
    const r = (await apiFetch('POST', `/api/p/${encodeURIComponent(P.id)}/produce`, {})).json;
    ls.set('produceAfter', null);
    if (r.me) APITEAM.setMe(r.me);
    const tab = UI.tab;
    await openProject(P.id);
    if (tab && tab !== UI.tab && typeof setTab === 'function') setTab(tab);
    toast(`«${P.meta.title}» ya es un proyecto de producción.${r.over ? ` ${r.over} ${r.over === 1 ? 'persona del equipo queda' : 'personas del equipo quedan'} en pausa: tu plan permite menos personas por proyecto.` : ' Empieza por el desglose: «Desglose automático» marca lo probable de cada escena.'}`, 7000);
  } catch (e) {
    if (e.code === 'need_plan') { ls.set('produceAfter', P.id); return freeLimitNotice('prod', e.message); }
    if (e.code === 'limit_projects') return freeLimitNotice('prod', e.message);
    toast(e.message || 'No se pudo llevar a producción.', 6000);
  }
}
/* volvió del pago: si venía de «Llevar a producción», se hace ahora */
function produceAfterPay() {
  const want = ls.get('produceAfter', null);
  if (!want) return;
  ls.set('produceAfter', null);
  if (P && (want === P.id || (want === 'new' && !P._shared)) && isScriptKind()) produceProject();
}
/* tipo de un proyecto nuevo sin preguntar (importar, abrir un archivo): producción si hay lugar; si no, guion */
function autoKind() {
  const me = Store.kind === 'api' && APITEAM.me;
  if (!me) return null;
  if (!(me.limits && me.limits.projects)) return 'guion';
  return (me.own || 0) < me.limits.projects ? 'prod' : 'guion';
}
Object.assign(ACT, { 'kind-produce': () => produceProject() });
