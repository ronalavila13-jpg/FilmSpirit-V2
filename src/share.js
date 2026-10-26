/* ============================================================
   PROYECTO COMPARTIDO · secciones, permisos por pestaña y por área del
   desglose, y sincronización. En escritorio viaja por una carpeta de
   Drive/OneDrive/Dropbox (desktop/team.js); en la web, por la base de
   datos de la página y las cuentas de Claude (share-web.js).
   ============================================================ */
const TIO = () => DESK ? DESK.team : TARGET === 'server' ? APITEAM : WEBTEAM;   // transporte del equipo
// TARGET: para qué versión se armó (build.sh): 'web' (la página publicada en Claude), 'server' (la web con cuentas) o
// 'desktop'. Cada versión trae su transporte del equipo: DESK.team, APITEAM (share-api.js) o WEBTEAM (share-web.js)
const API = () => TARGET === 'server';   // web app con cuentas y servidor propio
const SEC_LIST = [['guion', 'Guion', 'script'], ['desglose', 'Desglose', 'breakdown'], ['storyboard', 'Storyboard', 'board'], ['animatic', 'Animatic', 'animatic'], ['plan', 'Plan de rodaje', 'plan'], ['calendario', 'Calendario', 'cal'], ['presupuesto', 'Presupuesto', 'budget'], ['llamado', 'Hoja de llamado', 'call'], ['hoja', 'Hoja de script', 'sup']];   // en el orden de las pestañas
const TAB2SEC = Object.fromEntries(SEC_LIST.map(([s, , t]) => [t, s]));
TAB2SEC.project = 'guion';   // la pestaña Proyecto viaja con el guion
TAB2SEC.lined = 'guion';     // el guion rayado también
TAB2SEC.build = 'guion';     // Construcción (argumento, escaleta y tarjetas) también
TAB2SEC.scout = 'plan';      // Scouting viaja con el plan de rodaje (la locación elegida pasa a sus locaciones)
TAB2SEC.casting = 'desglose';   // Casting viaja con el desglose (se edita con el área de reparto)
TAB2SEC.gastos = 'gastos';      // Gastos (solo la web con cuentas): su propia sección, con sus reglas (areas.js · gaRole)
const SECNAME = Object.fromEntries(SEC_LIST.map(([s, n]) => [s, n]));
/* además de las pestañas, las notas del equipo viajan en su propia sección: todos la leen y escriben (notas.js).
   En la web con cuentas, también Gastos: cada quien recibe y guarda solo lo suyo (el servidor lo recorta) */
const SEC_DATA = [...SEC_LIST.map(([s]) => s), 'notas', ...(typeof TARGET !== 'undefined' && TARGET === 'server' ? ['gastos'] : [])];
SECNAME.notas = 'Notas'; SECNAME.gastos = 'Gastos';
// qué necesita leer cada pestaña, quién ve el presupuesto y la limpieza de permisos: las reglas comunes (areas.js)
// permisos sugeridos por cargo (el productor puede ajustarlos).
// «areas»: cajas de la hoja de desglose que puede editar; sin «areas», todas.
const ROLES = [
  ['Producción', { guion: 'ver', desglose: 'ver', storyboard: 'ver', animatic: 'ver', plan: 'editar', calendario: 'editar', llamado: 'editar', presupuesto: 'editar', hoja: 'ver', gastos: 'editar' }],
  ['Producción ejecutiva', { guion: 'ver', desglose: 'ver', storyboard: 'ver', animatic: 'ver', plan: 'ver', calendario: 'ver', llamado: 'ver', presupuesto: 'editar', hoja: 'ver', gastos: 'editar' }],
  ['Dirección', { guion: 'ver', desglose: 'editar', storyboard: 'editar', animatic: 'editar', plan: 'ver', calendario: 'ver', llamado: 'ver', hoja: 'ver' }],
  ['Guion', { guion: 'editar', desglose: 'ver', storyboard: 'ver', calendario: 'ver', llamado: 'ver' }],
  ['Asistencia de dirección', { guion: 'ver', desglose: 'editar', storyboard: 'ver', plan: 'editar', calendario: 'editar', llamado: 'editar', hoja: 'editar' }],
  ['Jefatura de producción', { guion: 'ver', desglose: 'editar', storyboard: 'ver', plan: 'editar', calendario: 'editar', llamado: 'editar', presupuesto: 'editar', hoja: 'ver', gastos: 'editar' }],
  ['Dirección de fotografía', { guion: 'ver', desglose: 'ver', storyboard: 'editar', animatic: 'ver', plan: 'ver', calendario: 'ver', llamado: 'ver', hoja: 'ver', gastos: 'editar' }],
  ['Dirección de arte', { guion: 'ver', desglose: 'editar', areas: ['props', 'veh'], storyboard: 'ver', calendario: 'ver', llamado: 'ver', gastos: 'editar' }],
  ['Vestuario y maquillaje', { guion: 'ver', desglose: 'editar', areas: ['ward'], storyboard: 'ver', calendario: 'ver', llamado: 'ver', gastos: 'editar' }],
  ['Sonido', { guion: 'ver', desglose: 'editar', areas: ['sound'], storyboard: 'ver', calendario: 'ver', llamado: 'ver', gastos: 'editar' }],
  ['Efectos especiales', { guion: 'ver', desglose: 'editar', areas: ['sfx', 'equip'], storyboard: 'ver', calendario: 'ver', llamado: 'ver', gastos: 'editar' }],
  ['Casting', { guion: 'ver', desglose: 'editar', areas: ['cast', 'extras'], calendario: 'ver', llamado: 'ver' }],
  ['Script / continuidad', { guion: 'ver', desglose: 'ver', storyboard: 'ver', plan: 'ver', calendario: 'ver', llamado: 'ver', hoja: 'editar' }],
  ['Montaje', { guion: 'ver', storyboard: 'ver', animatic: 'editar', calendario: 'ver', hoja: 'ver' }],
  ['Personalizado', { guion: 'ver' }],
];
let SHARE = null;
const CANCEL = { cancel: true };
const errText = e => String(e && e.message || e || '').replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
// JSON con claves ordenadas: dos copias iguales producen el mismo texto
const canon = v => Array.isArray(v) ? '[' + v.map(x => x === undefined ? 'null' : canon(x)).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).filter(k => v[k] !== undefined && typeof v[k] !== 'function').sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}'
    : v === undefined ? undefined : JSON.stringify(v);
const sclone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
const omitK = (o, ks) => { const r = { ...o }; for (const k of ks) delete r[k]; return r; };

/* ---------- qué datos del proyecto van en cada sección ---------- */
function secGet(Px, s) {
  switch (s) {
    case 'guion': return { meta: omitK(Px.meta, ['aspect', 'hair', 'sensor']), paras: Px.paras, ...(Px.build ? { build: Px.build } : {}) };
    case 'desglose': return { elements: Object.fromEntries(Object.entries(Px.elements).map(([k, e]) => [k, omitK(e, ['look'])])), tags: Px.tags, scenes: Px.scenes, ...(Px.casting ? { casting: Px.casting } : {}), ...(Px.catCol && Object.keys(Px.catCol).length ? { catCol: Px.catCol } : {}) };
    case 'storyboard': return {
      shots: Object.fromEntries(Object.entries(Px.shots).map(([k, sh]) => [k, omitK(sh, ['done', 'dur'])])),
      plans: Px.plans || {}, locPlans: Px.locPlans || {}, sets3d: Px.sets3d || {}, locSet3d: Px.locSet3d || {}, aspect: Px.meta.aspect || '16:9',
      looks: Object.fromEntries(Object.entries(Px.elements).filter(([, e]) => e.look).map(([k, e]) => [k, e.look])),
      faces: Px.faces || {},
      ...(Px.scEls && Object.keys(Px.scEls).length ? { scEls: Px.scEls } : {}),   // luces, objetos y animales de cada escena
      ...(Px.envEsc && Object.keys(Px.envEsc).length ? { envEsc: Px.envEsc } : {}),   // lote W · la escala de la calle y los paisajes de cada locación
      ...(Px.meta.hair ? { hair: Px.meta.hair } : {}),   // cómo se dibuja el pelo de las figuras (Ajustes del storyboard)
      ...(Px.meta.sensor ? { sensor: Px.meta.sensor } : {}),   // el sensor de la cámara del proyecto (Ajustes del storyboard)
    };
    case 'animatic': return { animatic: Px.animatic || null, dur: Object.fromEntries(Object.entries(Px.shots).filter(([, sh]) => sh.dur != null && sh.dur !== '').map(([k, sh]) => [k, sh.dur])) };
    case 'plan': return { schedule: Px.schedule, ...(Px.scout ? { scout: Px.scout } : {}) };
    case 'presupuesto': return { budget: Px.budget };
    case 'hoja': return { sup: Px.sup, done: Object.fromEntries(Object.entries(Px.shots).filter(([, sh]) => sh.done).map(([k]) => [k, true])) };
    case 'calendario': return { calendar: Px.calendar || { tasks: [] } };
    case 'llamado': return { call: Px.call || {} };
    case 'notas': return { notes: Px.notes || {} };
    case 'gastos': return Px.gastos || secEmpty('gastos');
  }
}
function secEmpty(s) {
  switch (s) {
    case 'guion': return { meta: { title: 'Proyecto', author: '', draft: '' }, paras: [] };
    case 'desglose': return { elements: {}, tags: [], scenes: {} };
    case 'storyboard': return { shots: {}, plans: {}, locPlans: {}, sets3d: {}, locSet3d: {}, aspect: '16:9', looks: {}, faces: {} };
    case 'animatic': return { animatic: null, dur: {} };
    case 'plan': return { schedule: { start: '', off: [0], pagesPerDay: 4.5, call: '', items: [] } };
    case 'presupuesto': return { budget: { currency: 'S/', contingency: 0, igv: false, igvRate: 18, lines: [] } };
    case 'hoja': return { sup: { takes: {}, sc: {}, day: {}, obs: {} }, done: {} };
    case 'calendario': return { calendar: { tasks: [] } };
    case 'llamado': return { call: { crew: [], talent: {}, vendors: [], hospital: { name: '', addr: '', phone: '' }, client: '', days: {} } };
    case 'notas': return { notes: {} };
    case 'gastos': return { ocs: [], cajas: [], reemb: [], motivos: {} };
  }
}
function secPut(Px, s, d) {
  d = cleanTree(sclone(d) || secEmpty(s));
  switch (s) {
    case 'guion': { const hair = Px.meta && Px.meta.hair, sens = Px.meta && Px.meta.sensor; Px.meta = { ...d.meta, aspect: Px.meta && Px.meta.aspect || '16:9' }; if (hair) Px.meta.hair = hair; else delete Px.meta.hair; if (sens) Px.meta.sensor = sens; else delete Px.meta.sensor; Px.paras = d.paras || []; if (d.build) Px.build = d.build; else delete Px.build; break; }
    case 'desglose': {
      const looks = Object.fromEntries(Object.entries(Px.elements || {}).filter(([, e]) => e.look).map(([k, e]) => [k, e.look]));
      Px.elements = d.elements || {};
      for (const [k, l] of Object.entries(looks)) if (Object.hasOwn(Px.elements, k) && Px.elements[k] && typeof Px.elements[k] === 'object') Px.elements[k].look = l;
      Px.tags = d.tags || []; Px.scenes = d.scenes || {};
      if (d.casting) Px.casting = d.casting; else delete Px.casting;
      if (d.catCol && typeof d.catCol === 'object') Px.catCol = d.catCol; else delete Px.catCol;   // la leyenda del desglose (leyenda.js)
      break;
    }
    case 'storyboard': {
      const old = Px.shots || {};
      Px.shots = {};
      for (const [k, sh] of Object.entries(d.shots || {})) {
        if (old[k]) { if (old[k].done) sh.done = true; if (old[k].dur != null) sh.dur = old[k].dur; }
        Px.shots[k] = sh;
      }
      Px.plans = d.plans || {}; Px.locPlans = d.locPlans || {}; Px.sets3d = d.sets3d || {}; Px.locSet3d = d.locSet3d || {};
      if (d.scEls && typeof d.scEls === 'object') Px.scEls = d.scEls; else delete Px.scEls;
      if (d.envEsc && typeof d.envEsc === 'object') Px.envEsc = d.envEsc; else delete Px.envEsc;   // lote W
      Px.faces = d.faces || {}; if (typeof faceChanged === 'function') for (const id of Object.keys(Px.faces)) faceChanged(id);
      Px.meta.aspect = d.aspect || '16:9';
      if (d.hair) Px.meta.hair = d.hair; else delete Px.meta.hair;
      if (d.sensor) Px.meta.sensor = d.sensor; else delete Px.meta.sensor;
      for (const [k, e] of Object.entries(Px.elements)) { if (!e || typeof e !== 'object') continue; if (d.looks && Object.hasOwn(d.looks, k) && d.looks[k]) e.look = d.looks[k]; else delete e.look; }
      break;
    }
    case 'animatic':
      Px.animatic = d.animatic || undefined; if (!Px.animatic) delete Px.animatic;
      for (const [k, sh] of Object.entries(Px.shots)) { if (d.dur && d.dur[k] != null) sh.dur = d.dur[k]; else delete sh.dur; }
      break;
    case 'plan': Px.schedule = d.schedule; if (!Px.schedule.items) Px.schedule.items = []; if (d.scout) Px.scout = d.scout; else delete Px.scout; break;
    case 'presupuesto': Px.budget = d.budget; break;
    case 'hoja':
      Px.sup = d.sup || { takes: {}, sc: {}, day: {} };
      for (const [k, sh] of Object.entries(Px.shots)) { if (d.done && d.done[k]) sh.done = true; else delete sh.done; }
      break;
    case 'calendario': Px.calendar = d.calendar || { tasks: [] }; break;
    case 'llamado': Px.call = d.call || {}; break;
    case 'notas': Px.notes = d.notes && typeof d.notes === 'object' ? d.notes : {}; break;
    case 'gastos': Px.gastos = typeof gaClean === 'function' ? { ...gaClean(d), ...(Array.isArray(d.partidas) ? { partidas: d.partidas } : {}), ...(typeof d.moneda === 'string' ? { moneda: d.moneda } : {}), ...(d.impuesto && typeof d.impuesto === 'object' ? { impuesto: { name: String(d.impuesto.name || 'IGV').slice(0, 20), rate: +d.impuesto.rate || 0 } } : {}) } : d; break;
  }
  if (typeof normalizeProject === 'function') normalizeProject(Px);   // datos de versiones anteriores; y lo que llegó de otra persona, en la forma que la app espera
}
/* fusión de tres vías: aplica lo que cambió el otro sin pisar lo que cambiaste tú */
function merge3(b, l, r) {
  const cb = canon(b), cl = canon(l), cr = canon(r);
  if (cl === cb) return r;
  if (cr === cb || cl === cr) return l;
  const isO = x => x && typeof x === 'object' && !Array.isArray(x);
  if (isO(l) && isO(r) && (b === undefined || isO(b))) {
    const out = {}, B = b || {};
    for (const k of new Set([...Object.keys(B), ...Object.keys(l), ...Object.keys(r)])) {
      if (!safeKey(k)) continue;
      const v = merge3(B[k], l[k], r[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  const byId = a => Array.isArray(a) && a.every(x => x && typeof x === 'object' && typeof x.id === 'string');
  if (byId(l) && byId(r) && (b === undefined || byId(b))) {
    const B = new Map((b || []).map(x => [x.id, x])), L = new Map(l.map(x => [x.id, x])), R = new Map(r.map(x => [x.id, x]));
    const out = [];
    for (const id of [...r.map(x => x.id), ...l.map(x => x.id).filter(id => !R.has(id))]) {
      const v = merge3(B.get(id), L.get(id), R.get(id));
      if (v !== undefined) out.push(v);
    }
    return out;
  }
  // los párrafos del guion no tienen identificador: se fusionan como secuencia (diff3). Lo que cambió una sola persona
  // se toma de ella; solo cuando las dos cambiaron los mismos párrafos gana lo local. Antes ganaba el guion local entero
  // y se perdían los párrafos que la otra persona había cambiado en otro lugar
  if (Array.isArray(b) && isParas(l) && isParas(r)) { const m = mergeSeq(b, l, r); if (m) return m; }
  return l;     // conflicto en el mismo dato: gana el cambio local, que es el más reciente
}
const isParas = a => Array.isArray(a) && a.every(x => x && typeof x === 'object' && !Array.isArray(x) && typeof x.t === 'string' && typeof x.x === 'string');
/* para cada elemento de A, su pareja en C (o -1), por la subsecuencia común más larga. Las puntas iguales se recortan
   primero (lo normal es que cambie un tramo chico); si el tramo del medio es enorme, no se arriesga: null */
function seqMatch(A, C) {
  const out = new Int32Array(A.length).fill(-1);
  let a0 = 0, c0 = 0, a1 = A.length, c1 = C.length;
  while (a0 < a1 && c0 < c1 && A[a0] === C[c0]) out[a0++] = c0++;
  while (a0 < a1 && c0 < c1 && A[a1 - 1] === C[c1 - 1]) out[--a1] = --c1;
  const n = a1 - a0, m = c1 - c0;
  if (!n || !m) return out;
  if (n * m > 4e6) return null;
  const W = m + 1, T = new Uint16Array((n + 1) * W);
  for (let x = n - 1; x >= 0; x--) for (let y = m - 1; y >= 0; y--) T[x * W + y] = A[a0 + x] === C[c0 + y] ? T[(x + 1) * W + y + 1] + 1 : Math.max(T[(x + 1) * W + y], T[x * W + y + 1]);
  for (let x = 0, y = 0; x < n && y < m;) {
    if (A[a0 + x] === C[c0 + y]) { out[a0 + x] = c0 + y; x++; y++; }
    else if (T[(x + 1) * W + y] >= T[x * W + y + 1]) x++; else y++;
  }
  return out;
}
function mergeSeq(b, l, r) {
  const B = b.map(canon), L = l.map(canon), R = r.map(canon);
  const ml = seqMatch(B, L), mr = seqMatch(B, R);
  if (!ml || !mr) return null;
  const out = [];
  let bi = 0, li = 0, ri = 0;
  for (let i = 0; i <= B.length; i++) {
    const end = i === B.length;
    if (!end && (ml[i] < 0 || mr[i] < 0)) continue;
    // el tramo hasta este párrafo, que sigue igual en los tres
    const la = end ? L.length : ml[i], ra = end ? R.length : mr[i];
    const hb = B.slice(bi, i).join('\n'), hl = L.slice(li, la).join('\n'), hr = R.slice(ri, ra).join('\n');
    if (hl === hb) out.push(...r.slice(ri, ra));
    else if (!hb && hl !== hr) out.push(...l.slice(li, la), ...r.slice(ri, ra));   // las dos agregaron en el mismo lugar: quedan ambos
    else out.push(...l.slice(li, la));     // cambió solo lo local, los dos igual o los dos distinto (gana lo local)
    if (!end) out.push(l[la]);
    bi = i + 1; li = la + 1; ri = ra + 1;
  }
  return out;
}

/* ---------- permisos ---------- */
// guion cerrado (web): quien producción autorizó a revisarlo guarda el guion aunque su permiso sea «ver»; el servidor
// lo comprueba con la versión que tiene. En el equipo de escritorio hace falta el permiso de editar el guion (guion-cierre.js)
// X: el proyecto compartido a consultar (por defecto el abierto; un guardado en curso usa el suyo)
// Gastos: lo guarda (con sus reglas, que el servidor aplica) quien tiene algo que hacer ahí: ver gaCan en areas.js
const canEditSec = (s, X = SHARE) => s === 'gastos' ? !!X && API() && !X.ro && gaCan(gaWhoOf(X)).receipt : !X || (!X.ro && (s === 'notas' || X.admin || (X.perms[s] === 'editar' && !X.unavailable.has(s)) || (s === 'guion' && API() && !X.unavailable.has(s) && typeof lockMine === 'function' && !!lockMine())));
const canReadData = (s, X = SHARE) => s === 'notas' || (s === 'gastos' && API()) || X.read.has(s);
const canSeeTab = t => t === 'gastos' ? typeof gsTabOk === 'function' && gsTabOk() : !SHARE || TAB2SEC[t] === 'guion' || SHARE.admin || (!!SHARE.perms[TAB2SEC[t]] && (TAB2SEC[t] !== 'presupuesto' || isProducer(SHARE.me && SHARE.me.role)));
// quién soy en el proyecto, para las reglas de Gastos (areas.js)
// las pestañas con permiso, con Gastos en la web con cuentas (para los resúmenes de permisos)
const secListAll = () => API() ? [...SEC_LIST, ['gastos', 'Gastos', 'gastos']] : SEC_LIST;
const gaWhoOf = (X = SHARE) => X ? { admin: !!X.admin, role: X.me && X.me.role, perms: X.perms || {}, uid: X.me && X.me.id, ro: !!X.ro } : null;
/* áreas del desglose (reglas en areas.js): null = puede editar todas */
const bdAreasOf = perms => perms && perms.desglose === 'editar' && Array.isArray(perms.areas) ? perms.areas : null;
const myBdAreas = (X = SHARE) => X && !X.admin ? bdAreasOf(X.perms) : null;
const canEditArea = a => canEditSec('desglose') && (!myBdAreas() || myBdAreas().includes(a));
const canEditCat = c => canEditArea(bdAreaOfCat(c));
const canEditBdAll = () => canEditSec('desglose') && !myBdAreas();
const areasText = a => !a ? 'Todas las áreas' : !a.length ? 'Ninguna área' : a.map(id => (SHEET.find(b => b.id === id) || { name: id }).name).join(', ');
function sharePaintTabs() {
  $$('#tabs .tab').forEach(b => { b.hidden = !canSeeTab(b.dataset.tab); b.classList.toggle('kind-off', typeof isScriptKind === 'function' && isScriptKind() && !SCRIPT_TABS.has(b.dataset.tab)); });
  if (!canSeeTab(UI.tab)) { UI.tab = 'script'; if (typeof paintTabSel === 'function') paintTabSel(); }
  if (typeof applyTabPrefs === 'function') applyTabPrefs();
  let chip = $('#roChip');
  if (!chip) { chip = document.createElement('span'); chip.id = 'roChip'; chip.className = 'ro-chip'; $('#tabs').appendChild(chip); }
  const ro = SHARE && !canEditSec(TAB2SEC[UI.tab]);
  chip.hidden = !ro;
  chip.textContent = SHARE && SHARE.unavailable.has(TAB2SEC[UI.tab]) ? 'Esperando sincronización' : SHARE && SHARE.ro ? (SHARE.archived ? 'Solo lectura · archivado' : 'Solo lectura · límite del plan') : 'Solo lectura';
  if (API()) planBanner();
  chip.title = ro ? 'Puedes revisar y exportar esta pestaña, pero tus cambios no se guardan.' : '';
  // en un proyecto compartido, el botón del equipo ocupa su lugar
  // (en la web con cuentas todo proyecto es «de equipo»: producción sigue viendo Compartir y el botón del equipo aparece con más personas)
  const solo = API() && SHARE && SHARE.admin && (SHARE.members || []).length <= 1;
  const sb = $('#shareBtn'); if (sb) sb.hidden = !!SHARE && !(API() && SHARE.admin);
  let tb = $('#teamBtn');
  if (SHARE && !solo && !tb) {
    tb = document.createElement('button'); tb.type = 'button'; tb.id = 'teamBtn'; tb.className = 'team-btn'; tb.setAttribute('aria-haspopup', 'menu');
    tb.onclick = e => teamPanel(e.currentTarget);
    $('.topbar .spacer').after(tb);
  }
  if (tb) {
    tb.hidden = !SHARE || solo;
    // solo el primer nombre («Ronal», no el nombre completo): el completo va en su nombre accesible y en el globo
    if (SHARE) tb.innerHTML = `${ICO.team}<span class="hide-sm" data-no-tr>${esc(firstName(SHARE.me.name))}</span>`;
    // en el teléfono el nombre se oculta: el botón conserva su nombre accesible
    if (SHARE) { tb.setAttribute('aria-label', `${SHARE.me.name || 'Tú'}: equipo y permisos`); tb.title = `${SHARE.me.name || 'Tú'} · Equipo y permisos`; }
  }
  presencePaint();
}

/* ---------- presencia: quién más tiene abierto el proyecto ahora y en qué pestaña ----------
   Llega por el canal en vivo del servidor ({ t: 'who' }). Arriba, sus caras junto al botón del equipo (al tocarlas,
   la lista: cada uno con su pestaña, para ir ahí); en cada pestaña y en el ícono de su etapa, las caras de quienes
   están en ella. Quien tiene el programa en segundo plano hace rato sale atenuado («en otra ventana») y quien volvió
   a Inicio dice «en Inicio». Cada persona tiene su color fijo (PZ_COL: todos con la letra blanca bien legible) y las
   entradas y salidas se avisan a los lectores de pantalla, sin ruido en la pantalla. */
const PZ_PIC = /^https:\/\/[\w.-]+\.googleusercontent\.com\//;
const PZ_COL = ['#B42318', '#A43E0B', '#7A5800', '#3F6A12', '#0E6B4F', '#0A6680', '#2D5BB5', '#5B3FAE', '#8B2D80', '#6A4C3B', '#46536A'];
const pzCol = uid => { let h = 0; for (const ch of String(uid)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PZ_COL[h % PZ_COL.length]; };
let PZ_SEEN = null;   // quiénes estaban en el último aviso (para anunciar entradas y salidas)
function pzPeople() {
  if (!SHARE || !Array.isArray(SHARE.who)) return [];
  const meId = SHARE.me && SHARE.me.id, by = new Map();
  for (const w of SHARE.who) {
    if (!w || w.c === CLIENT || (meId && w.uid === meId)) continue;   // las otras ventanas propias no cuentan
    const o = by.get(w.uid) || { uid: w.uid, name: String(w.name || '').trim() || 'Alguien', pic: PZ_PIC.test(w.pic || '') ? w.pic : '', tabs: [], away: true, home: false };
    if (w.tab === 'home') o.home = true;
    else if (w.tab && TAB_NAMES[w.tab] && !o.tabs.includes(w.tab)) o.tabs.push(w.tab);
    if (!w.away && w.tab !== 'home') o.away = false;   // con una ventana a la vista y dentro del proyecto, está
    by.set(w.uid, o);
  }
  // primero quienes están a la vista y, entre ellos, los de esta misma pestaña
  const rank = p => (p.away ? 2 : 0) + (p.tabs.includes(UI.tab) ? 0 : 1);
  return [...by.values()].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
// iniciales: la primera letra del nombre y la del apellido (sin partir un emoji ni una letra con tilde compuesta)
const pzIni = name => { const w = name.split(/\s+/).filter(Boolean), f = x => (Array.from(x || '?')[0] || '?'); return (f(w[0]) + (w.length > 1 ? f(w[w.length - 1]) : '')).toUpperCase(); };
const pzAv = (p, cls) => { const ini = pzIni(p.name), t = cls === 'sm' ? Array.from(ini)[0] : ini; return `<span class="pz-av${cls ? ' ' + cls : ''}${p.away ? ' away' : ''}" style="--pzc:${pzCol(p.uid)}" data-ini="${ea(t)}" aria-hidden="true">${p.pic ? `<img src="${ea(p.pic)}" alt="" width="28" height="28" referrerpolicy="no-referrer" decoding="async">` : esc(t)}</span>`; };
// la foto de la cuenta no cargó: quedan las iniciales (sin manejadores en línea, que la política de seguridad no permite)
document.addEventListener('error', e => { const im = e.target; if (im && im.tagName === 'IMG' && im.parentElement && im.parentElement.classList.contains('pz-av')) { const sp = im.parentElement; im.remove(); sp.textContent = sp.dataset.ini || '?'; } }, true);
const pzWhere = p => (p.tabs.length ? p.tabs.map(t => TAB_NAMES[t]).join(' · ') : p.home ? 'En Inicio' : 'Abriendo el proyecto') + (p.away && !p.home ? ' · en otra ventana' : '');
/* entradas y salidas, para los lectores de pantalla (una región «polite» fija que no se ve) */
let PZ_PID = null;
function pzAnnounce(ppl) {
  // la región existe desde el principio (vacía), así los lectores anuncian también el primer cambio
  if (!$('#pzLive')) { const r = document.createElement('div'); r.id = 'pzLive'; r.className = 'sr'; r.setAttribute('role', 'status'); r.setAttribute('aria-live', 'polite'); document.body.appendChild(r); }
  if (!SHARE || SHARE.pid !== PZ_PID) { PZ_SEEN = null; PZ_PID = SHARE ? SHARE.pid : null; }   // otro proyecto: no se anuncia a todos como «entró»
  const now = new Map(ppl.map(p => [p.uid, p.name]));
  if (PZ_SEEN) {
    const msg = [...[...now].filter(([u]) => !PZ_SEEN.has(u)).map(([, n]) => `${n} entró al proyecto`), ...[...PZ_SEEN].filter(([u]) => !now.has(u)).map(([, n]) => `${n} salió del proyecto`)];
    if (msg.length) {
      $('#pzLive').textContent = msg.slice(0, 3).join('. ') + '.';
    }
  }
  PZ_SEEN = now;
}
const pzItems = ppl => ppl.map(p => {
  const t = p.tabs.find(x => typeof canSeeTab !== 'function' || canSeeTab(x)), here = !!t && t === UI.tab;
  return `<button type="button" role="menuitem" data-pzu="${ea(p.uid)}" data-pzt="${ea(t || '')}"${t && !here ? '' : ' aria-disabled="true"'}>${pzAv(p)}<span class="pz-who"><b data-no-tr>${esc(p.name)}</b><small>${esc(pzWhere(p))}${here ? ' · aquí' : ''}</small></span></button>`;
}).join('');
function presencePaint() {
  const ppl = pzPeople();
  pzAnnounce(ppl);
  let bx = $('#pzBar');
  const pop = $('#pop'), now = pop && $('#tmNow', pop), menu = now && $('.pz-menu', now);
  if (!ppl.length) {
    // se fueron todos: el panel del equipo abierto pierde la lista «Ahora en el proyecto» (y el foco, si estaba ahí,
    // pasa al botón del equipo)
    const hadFocus = !!bx && bx.contains(document.activeElement) || !!(now && now.contains(document.activeElement));
    if (now) { now.hidden = true; now.innerHTML = ''; }
    if (bx) bx.remove();
    if (hadFocus) { const tb = $('#teamBtn'); if (tb && !tb.hidden) tb.focus(); }
  } else {
    if (!bx) {
      bx = document.createElement('button'); bx.type = 'button'; bx.id = 'pzBar'; bx.className = 'pz-bar';
      bx.setAttribute('aria-haspopup', 'menu'); bx.setAttribute('aria-expanded', 'false');
      bx.onclick = e => teamPanel(e.currentTarget);
      const tb = $('#teamBtn'); if (tb) tb.before(bx); else $('.topbar .spacer').after(bx);
    }
    // hasta 4 caras (2 en el teléfono) y «+N»; solo se rehace si cambió algo (la animación es solo para quien llega)
    const max = matchMedia('(max-width: 600px)').matches ? 2 : 4, key = max + ':' + ppl.map(p => p.uid + (p.away ? '~' : '')).join('|');
    if (bx.dataset.k !== key) {
      const had = new Set((bx.dataset.k || '').replace(/^\d+:/, '').split('|').map(s => s.replace(/~$/, '')));
      bx.dataset.k = key;
      bx.innerHTML = ppl.slice(0, max).map(p => pzAv(p, had.has(p.uid) ? '' : 'in')).join('') + (ppl.length > max ? `<span class="pz-av pz-more" aria-hidden="true">+${ppl.length - max}</span>` : '');
    }
    bx.title = ppl.map(p => p.name + ' · ' + pzWhere(p)).join('\n');
    bx.setAttribute('aria-label', (ppl.length === 1 ? '1 persona más en el proyecto: ' : `${ppl.length} personas más en el proyecto: `) + ppl.map(p => `${p.name} (${pzWhere(p)})`).join(', '));
    // la lista abierta se pone al día, con el foco en la misma persona
    if (now) {
      const fu = menu && document.activeElement && menu.contains(document.activeElement) ? document.activeElement.dataset.pzu : null;
      now.innerHTML = tmNowHTML(ppl); now.hidden = false;
      if (fu) { const b = now.querySelector(`[data-pzu="${CSS.escape(fu)}"]`) || now.querySelector('[data-pzu]'); if (b) b.focus({ preventScroll: true }); }
    }
  }
  const dots = (host, here) => {
    let d = $(':scope > .pz-dots', host);
    if (!here.length) { if (d) d.remove(); return; }
    const key = here.map(p => p.uid).join('|');
    if (d && d.dataset.k === key) return;
    if (!d) { d = document.createElement('span'); d.className = 'pz-dots'; d.setAttribute('aria-hidden', 'true'); d.dataset.noTr = ''; host.appendChild(d); }
    d.dataset.k = key;
    d.innerHTML = here.slice(0, 3).map(p => pzAv(p, 'sm')).join('') + (here.length > 3 ? `<span class="pz-av sm pz-more">+</span>` : '');
  };
  $$('#tabs .tab').forEach(b => dots(b, ppl.filter(p => !p.away && p.tabs.includes(b.dataset.tab))));
  // con las pestañas agrupadas por etapa (la barra de íconos), también en el ícono de la etapa
  $$('#tabs .stg').forEach(w => { const h = $('.stg-h', w); if (!h) return; const tabs = $$('.tab', w).map(t => t.dataset.tab); dots(h, ppl.filter(p => !p.away && p.tabs.some(t => tabs.includes(t)))); });
}
/* el primer nombre («Ronal Waldir Avila Vaca» → «Ronal»), para el botón del equipo */
const firstName = n => String(n || '').trim().split(/\s+/)[0] || 'Tú';
const tmNowHTML = ppl => `<h5 id="pzMenuH">Ahora en el proyecto</h5><div class="menu pz-menu" role="menu" aria-labelledby="pzMenuH">${pzItems(ppl)}</div><p class="hint pz-hint">Toca a alguien para ir a su pestaña.</p>`;

/* ---------- abrir un proyecto compartido ---------- */
function shareBuild(st) {
  const Pn = newProject(st.title);
  Pn.id = st.pid;
  const who0 = SHARE && SHARE.pid === st.pid && SHARE.who ? SHARE.who : (API() && APITEAM.pid === st.pid ? APITEAM.who : []);   // presencia: sin parpadeo al reconstruir
  SHARE = {
    pid: st.pid, me: st.me, admin: st.admin, perms: st.perms || {}, read: new Set(st.read), unavailable: new Set(st.unavailable || []),
    base: {}, licensee: st.licensee, dir: st.dir, file: st.file, members: st.members || [], title: st.title, reverted: {}, pending: false,
    ownerPlan: st.ownerPlan, limits: st.limits, requests: st.requests || [], owner: st.owner, ro: !!st.readonly, archived: st.archived || null, kind: st.kind || 'prod',
    who: who0,
  };
  // las secciones que esta persona no puede leer quedan «de relleno» (vacías): nunca se guardan desde este proyecto,
  // aunque después le den permiso (antes se podía subir un presupuesto vacío encima del real)
  const ph = new Set();
  for (const s of SEC_DATA) {
    const sec = st.sections && st.sections[s];
    secPut(Pn, s, sec ? JSON.parse(sec.json) : secEmpty(s));
    if (!sec) ph.add(s);
  }
  Object.defineProperty(Pn, '_ph', { value: ph, writable: true, configurable: true });
  if (!Pn.meta.title) Pn.meta.title = st.title;
  Pn._shared = true; Pn._saved = true; Pn._path = st.file;
  return Pn;
}
function shareSnapshot() {
  if (!SHARE || !P || P.id !== SHARE.pid) return;
  for (const s of SEC_DATA) SHARE.base[s] = canon(secGet(P, s));
}
async function shareOpen(pid, r) {
  if (r.error) { toast(r.error, 6000); return null; }
  try { const st = await DESK.team.auto(pid); if (st) return shareBuild(st); } catch (e) { }
  const info = r.info;
  const canRem = await DESK.team.canRemember().catch(() => false);
  const last = await DESK.team.remembered(pid).catch(() => null) || ls.get('team:' + pid, null);
  return new Promise(resolve => {
    let done = false;
    const m = modal({
      title: 'Entrar a «' + info.title + '»',
      body: `<p class="hint" style="margin:0">Proyecto compartido${info.licensee ? ' de ' + esc(info.licensee) : ''}. Cada persona entra con su propia contraseña y ve solo las pestañas que le asignó producción.</p>
        <label class="fld"><span>¿Quién eres?</span><select id="lgM">${info.members.map(x => `<option value="${esc(x.id)}" ${x.id === last ? 'selected' : ''}>${esc(x.name)}${x.role ? ' · ' + esc(x.role) : ''}</option>`).join('')}</select></label>
        <label class="fld"><span id="lgL">Contraseña</span><input type="password" id="lgP" autocomplete="current-password"></label>
        ${canRem ? '<label class="chip" style="justify-self:start"><input type="checkbox" id="lgR"> Recordar en este equipo</label>' : ''}
        <p class="hint" id="lgE" style="margin:0;color:var(--bad)" hidden></p>
        <p class="hint" style="margin:0"><button class="linkbtn" id="lgRec" type="button" hidden>Olvidé mi contraseña de productor: usar el código de recuperación</button><span id="lgHelp">¿Olvidaste tu contraseña? Pídele a producción que te asigne una nueva.</span></p>`,
      foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="lgOk">Entrar</button>`,
      onClose: () => { if (!done) { done = true; resolve(CANCEL); } },
    });
    let rec = false;
    const sync = () => { const own = $('#lgM', m).value === info.owner; $('#lgRec', m).hidden = !own || rec; $('#lgHelp', m).hidden = own; };
    sync(); $('#lgM', m).onchange = sync;
    $('#lgRec', m).onclick = () => { rec = true; $('#lgL', m).textContent = 'Código de recuperación'; $('#lgP', m).type = 'text'; $('#lgP', m).placeholder = 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX'; $('#lgP', m).value = ''; $('#lgP', m).focus(); sync(); };
    const go = async () => {
      const mem = $('#lgM', m).value, pw = $('#lgP', m).value;
      if (!pw) { $('#lgP', m).focus(); return; }
      const b = $('#lgOk', m); b.disabled = true; b.textContent = 'Abriendo…';
      try {
        const st = await DESK.team.login(pid, mem, pw, rec, !!($('#lgR', m) && $('#lgR', m).checked));
        ls.set('team:' + pid, mem);
        done = true; closeModal();
        const Pn = shareBuild(st);
        resolve(Pn);
        if (rec) setTimeout(() => changePasswordDialog('Entraste con el código de recuperación. Elige una contraseña nueva.'), 500);
      } catch (e) { const er = $('#lgE', m); er.textContent = errText(e); er.hidden = false; b.disabled = false; b.textContent = 'Entrar'; }
    };
    $('#lgOk', m).onclick = go;
    $('#lgP', m).addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    setTimeout(() => $('#lgP', m).focus(), 50);
  });
}

/* ---------- guardar: solo las secciones que cambiaron y que puedes editar ---------- */
let lastUserAct = 0;
['pointerdown', 'keydown', 'input', 'change', 'drop'].forEach(ev => addEventListener(ev, () => { lastUserAct = Date.now(); }, true));
async function shareSave(Px) {
  // el proyecto compartido de este guardado, fijo de principio a fin: si mientras se espera al servidor se abre otro
  // proyecto o se recargan los permisos, se sigue guardando en el suyo, con sus permisos (antes se tomaba el que
  // estuviera abierto y lo de un proyecto podía terminar en otro). Lo que se ve en pantalla solo se toca si sigue abierto
  const SH = SHARE;
  if (!SH || Px.id !== SH.pid) return;
  const gone = () => SHARE !== SH || P !== Px;
  const ro = [];
  let off = false;
  for (const s of SEC_DATA) {
    const cur = canon(secGet(Px, s));
    if (cur === SH.base[s]) continue;
    if (!canReadData(s, SH) || SH.unavailable.has(s) || (Px._ph && Px._ph.has(s))) continue;     // datos de relleno: nunca se guardan
    if (s === 'notas' && !API()) continue;     // las notas del equipo viajan con el servidor; en los demás casos quedan en este equipo
    if (canEditSec(s, SH)) {
      let out = cur;
      const ar = s === 'desglose' && myBdAreas(SH);
      if (ar) {
        // jefe de área: se guarda solo lo que cae en sus cajas; lo demás se deshace
        const f = bdFilter(JSON.parse(SH.base[s]), JSON.parse(cur), ar);
        out = canon(f);
        if (out !== cur && !gone() && Date.now() - (SH.reverted[s] || 0) > 2000) {
          secPut(Px, s, f); SH.reverted[s] = Date.now(); derive(); if (typeof histRemote === 'function') histRemote(); render();
          toast(`Solo puedes editar ${areasText(ar)} en el desglose.`, 4000);
        }
        if (out === SH.base[s]) continue;
      }
      // qué cambió («cambió el plano 1.2»): el servidor lo anota en la actividad y lo avisa al equipo
      let ch = null;
      try { if (typeof describeChange === 'function') ch = describeChange(s, SH.base[s] != null ? JSON.parse(SH.base[s]) : undefined, JSON.parse(out)); } catch (e) { }
      (SH.sent = SH.sent || {})[s] = out;
      let r;
      try { r = await TIO().save(SH.pid, s, out, ch); }
      catch (e) {
        // guion cerrado: el servidor o el equipo no aceptan el cambio (otra persona cerró la revisión, quitó la autorización…)
        const msg = String(e && e.message || '').replace(/^Error invoking remote method '[^']*': (Error: )?/, '');
        if (s === 'guion' && ((e && /^lock_/.test(String(e.code || ''))) || Object.values(LOCK_MSG).includes(msg))) {
          if (gone()) continue;
          secPut(Px, s, JSON.parse(SH.base[s])); SH.reverted[s] = Date.now(); derive(); if (typeof histRemote === 'function') histRemote(); render();
          toast(msg || LOCK_MSG.lock_who, 5000); continue;
        }
        throw e;
      }
      // conflicto: llegó la versión de otra persona, se fusionó y se volverá a guardar
      if (r && r.conflict) continue;
      // sin conexión: quedó en este equipo; la base sigue siendo la del servidor para enviarlo después
      if (r && r.offline) { off = true; continue; }
      SH.base[s] = out; continue;
    }
    // lectura sin permiso de edición: se deshace lo que hizo la persona (no lo que se recalcula solo)
    if (Date.now() - lastUserAct < 2500 && Date.now() - (SH.reverted[s] || 0) > 2000) ro.push(s);
  }
  if (off) { const e = new Error('Sin conexión'); e.code = 'offline'; e.kept = true; throw e; }
  if (ro.length && !gone()) {
    for (const s of ro) { secPut(Px, s, JSON.parse(SH.base[s])); SH.reverted[s] = Date.now(); }
    derive(); if (typeof histRemote === 'function') histRemote(); render();
    toast(`Solo lectura: tus cambios en ${ro.map(s => '«' + SECNAME[s] + '»').join(' y ')} no se guardan.`, 4000);
  }
}
// cada imagen se guarda con su sección (frameSec, en areas.js): sin permiso de editarla, no se sube
async function shareSaveFrame(pid, k, url) {
  if (!canEditSec(frameSec(k))) { toast(`Solo lectura: las imágenes ${({ desglose: 'del desglose', plan: 'del scouting', llamado: 'de la hoja de llamado', gastos: 'de Gastos' })[frameSec(k)] || 'del storyboard'} no se guardan.`); return; }
  await TIO().saveFrame(pid, k, url || null);
}

/* ---------- cambios que llegan de los demás ---------- */
const busyUI = () => !!($('#modal') || $('#phModal') || $('#fpModal') || $('#s2Modal')) || (document.activeElement && document.activeElement.closest && document.activeElement.closest('#view') && (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable));
let shareNote = null;
function shareRefresh(note) {
  if (note) shareNote = note;
  SHARE.pending = true;
  if (!busyUI()) shareFlushRender(); else shareWait();
}
/* con algo abierto (un diálogo, un campo con el cursor) se espera a que se cierre: se revisa cada 0,9 s solo
   mientras haya cambios pendientes (antes se revisaba siempre, aunque no hubiera nada) */
let SHARE_WT = 0;
function shareWait() {
  if (SHARE_WT) return;
  const tick = () => { SHARE_WT = 0; if (!SHARE || !SHARE.pending) return; if (busyUI()) SHARE_WT = setTimeout(tick, 900); else shareFlushRender(); };
  SHARE_WT = setTimeout(tick, 900);
}
function shareFlushRender() {
  if (!SHARE || !SHARE.pending) return;
  SHARE.pending = false;
  // las miniaturas se rehacen solas si su plano cambió (su clave incluye la escena, las figuras y las imágenes)
  derive(); if (typeof histRemote === 'function') histRemote(); render(); sharePaintTabs();
  if (shareNote) { toast(shareNote, 3200); shareNote = null; }
}
function shareInit() {
  const T = TIO();
  T.on('update', (pid, u) => {
    if (!SHARE || SHARE.pid !== pid || !P || P.id !== pid) return;
    const remote = JSON.parse(u.json);
    // lo propio que el servidor corrigió (p. ej. una nota): se compara con lo que se envió, no con la base
    const from = u.mine && SHARE.sent && SHARE.sent[u.sec] != null ? SHARE.sent[u.sec] : SHARE.base[u.sec];
    const base = from != null ? JSON.parse(from) : undefined;
    const said = !u.mine && !API() && typeof describeChange === 'function' ? describeChange(u.sec, base, remote) : null;
    if (typeof histCapture === 'function') histCapture();    // lo propio pendiente, en su paso; lo que llega no es un paso
    const local = secGet(P, u.sec);
    const merged = merge3(base, local, remote);
    secPut(P, u.sec, merged);
    if (typeof histRemote === 'function') histRemote();
    SHARE.base[u.sec] = canon(remote);
    SHARE.unavailable.delete(u.sec);
    if (P._ph) P._ph.delete(u.sec);
    if (canon(merged) !== SHARE.base[u.sec] && canEditSec(u.sec)) changed('data');
    // con el servidor, el aviso «quién cambió qué» llega aparte (actividad); con los otros transportes, se arma aquí
    shareRefresh(u.mine || API() ? '' : `${u.by || 'Alguien'} ${said && said.what || `actualizó «${SECNAME[u.sec]}»`}`);
  });
  T.on('activity', (pid, d) => { if (typeof actRemote === 'function') actRemote(pid, d); });
  T.on('who', (pid, list, quiet) => { if (!SHARE || (pid && SHARE.pid !== pid)) return; SHARE.who = pid ? list : []; if (quiet || !pid) PZ_SEEN = null; presencePaint(); });
  addEventListener('resize', debounce(() => { if (SHARE && SHARE.who && SHARE.who.length) presencePaint(); }, 200));   // 2 o 4 caras según el ancho
  T.on('frame', (pid, f) => {
    if (!SHARE || SHARE.pid !== pid) return;
    if (f.idx) { if (typeof IMGS !== 'undefined') IMGS.delete(f.k); }
    else if (f.u) { if (frameOk(f.k, f.u)) FRAMES[f.k] = f.u; } else if (FRAME_KEY.test(String(f.k))) delete FRAMES[f.k];
    shareRefresh('');
  });
  T.on('manifest', (pid, st) => {
    if (!SHARE || SHARE.pid !== pid) return;
    SHARE.me = st.me; if (st.members) SHARE.members = st.members; if (st.requests) SHARE.requests = st.requests;
    if (st.title) SHARE.title = st.title;
    sharePaintTabs();
  });
  T.on('reload', async (pid, st) => {
    if (!SHARE || SHARE.pid !== pid) return;
    await settleSave();
    if (!SHARE || SHARE.pid !== pid) return;
    const tab = UI.tab, produced = SHARE.kind === 'guion' && (st.kind || 'prod') === 'prod', admin = SHARE.admin;
    const Pn = shareBuild(st);
    setProject(Pn); shareSnapshot();
    if (canSeeTab(tab)) setTab(tab);
    sharePaintTabs();
    // un guion que pasó a producción: quien lo hizo ya recibió su aviso
    if (produced) { if (!admin) toast(`«${st.title || Pn.meta.title}» pasó a ser un proyecto de producción.`, 5000); }
    else if (!admin) toast('Producción actualizó tus permisos en este proyecto.', 4500);
  });
  T.on('revoked', (pid, why) => {
    if (!SHARE || SHARE.pid !== pid) return;
    const admin = SHARE.admin;
    SHARE = null;
    setProject(buildSample()); sharePaintTabs();
    if (why === 'deleted' && admin) return;
    modal({ title: why === 'deleted' ? 'Proyecto eliminado' : 'Acceso cerrado', body: `<p style="margin:0">${why === 'deleted' ? 'Producción eliminó este proyecto.' : `Producción ${DESK ? 'cambió o quitó tu acceso a este proyecto. Si sigues en el equipo, pídele tu nueva contraseña.' : 'quitó tu acceso a este proyecto.'}`}</p>`, foot: '<button class="btn primary" data-close>Entendido</button>' });
  });
  T.on('warn', (pid, msg) => { if (SHARE && SHARE.pid === pid && SHARE.admin) toast(msg && /área/.test(msg) ? msg : `Se ignoró un cambio no autorizado en ${DESK ? 'la carpeta compartida' : 'el proyecto'}.`, 5000); });
}

/* ---------- convertir el proyecto en compartido ---------- */
async function shareDialog() {
  if (API()) return apiShare();
  if (P._shared) return teamDialog();
  if (!DESK) return shareDialogWeb();
  if (LIC.mode === 'free') { licenseDialog(`Compartir proyectos con el equipo es parte de ${APPINFO.name} Pro (también durante la prueba).`); return; }
  if (!P._saved) { toast('Guarda el proyecto antes de compartirlo (haz cualquier cambio o usa Archivo › Guardar).'); return; }
  let dir = null;
  const m = modal({
    title: 'Compartir con el equipo', wide: true,
    body: `<p style="margin:0">El proyecto se guardará en una carpeta que tu equipo recibe por <b>Google Drive, OneDrive o Dropbox</b>. Cada pestaña va cifrada con su propia llave: cada persona solo puede abrir lo que tú le asignes, aunque copie la carpeta.</p>
      <div class="grid2"><label class="fld"><span>Tu nombre</span><input type="text" id="shN" value="Producción"></label><span></span>
      <label class="fld"><span>Tu contraseña de productor</span><input type="password" id="shP" autocomplete="new-password" placeholder="Mínimo 12, con letras y números"></label>
      <label class="fld"><span>Repite la contraseña</span><input type="password" id="shP2" autocomplete="new-password"></label></div>
      <div class="fld"><span>Carpeta compartida</span><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn" id="shD" type="button">Elegir carpeta…</button><span class="hint" id="shDl" style="word-break:break-all">Elige una carpeta dentro de Google Drive, OneDrive o Dropbox. Se creará la subcarpeta «${esc(P.meta.title)}».</span></div></div>
      <p class="hint" id="shE" style="margin:0;color:var(--bad)" hidden></p>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="shOk">Compartir</button>`,
  });
  $('#shD', m).onclick = async () => { const d = await DESK.team.pickDir(); if (d) { dir = d; $('#shDl', m).textContent = d + ' › ' + P.meta.title; } };
  $('#shOk', m).onclick = async () => {
    const er = $('#shE', m), pw = $('#shP', m).value;
    const fail = t => { er.textContent = t; er.hidden = false; };
    if (pw.length < 12 || !/[a-záéíóúñ]/i.test(pw) || !/\d/.test(pw)) return fail('La contraseña de producción protege a todo el equipo: usa al menos 12 caracteres, con letras y números.');
    if (pw !== $('#shP2', m).value) return fail('Las contraseñas no coinciden.');
    if (!dir) return fail('Elige la carpeta compartida.');
    const b = $('#shOk', m); b.disabled = true; b.textContent = 'Cifrando…';
    try {
      await flushSave();
      const frames = FRAMES_PID === P.id ? await framesAll() : await Store.loadFrames(P.id).catch(() => ({}));
      const sections = Object.fromEntries(SEC_LIST.map(([s]) => [s, canon(secGet(P, s))]));
      const r = await DESK.team.create(P.id, { dir, title: P.meta.title, adminName: $('#shN', m).value.trim() || 'Producción', password: pw, sections, frames, licensee: LIC.name || '' });
      closeModal();
      const Pn = shareBuild(r.state);
      setProject(Pn); shareSnapshot(); sharePaintTabs();
      FRAMES = frames; FRAMES_PID = Pn.id; FR_KNOWN = Pn.id;
      recoveryDialog(r.recovery, r.dir);
    } catch (e) { b.disabled = false; b.textContent = 'Compartir'; fail(errText(e)); }
  };
}
function recoveryDialog(code, dir) {
  const m = modal({
    title: 'Proyecto compartido',
    body: `<p style="margin:0">Listo. El proyecto ahora vive en <b style="word-break:break-all">${esc(dir)}</b>.</p>
      <div class="lic-st trial"><b>Tu código de recuperación</b><span class="rec-code">${esc(code)}</span><span class="hint">Si olvidas tu contraseña de productor, es la única forma de volver a administrar el equipo. Anótalo y guárdalo fuera de la computadora. No se vuelve a mostrar.</span></div>
      <p class="hint" style="margin:0">Ahora agrega a las personas del equipo y comparte la carpeta con ellas desde Google Drive, OneDrive o Dropbox.</p>`,
    foot: `<button class="btn" id="rcCp">Copiar código</button><button class="btn primary" id="rcGo">Agregar al equipo</button>`,
  });
  $('#rcCp', m).onclick = () => { navigator.clipboard.writeText(code).then(() => toast('Código copiado'), () => { }); };
  $('#rcGo', m).onclick = () => { closeModal(); teamDialog(); };
}

/* ---------- equipo y permisos (productor) ---------- */
function permSelect(s, v, dis) {
  return `<select class="pm ${ea(v || 'none')}" data-sec="${ea(s)}" ${dis ? 'disabled' : ''} aria-label="${esc(SECNAME[s])}"><option value="" ${!v ? 'selected' : ''}>—</option><option value="ver" ${v === 'ver' ? 'selected' : ''}>Ver</option><option value="editar" ${v === 'editar' ? 'selected' : ''}>Editar</option></select>`;
}
/* botón de áreas del desglose: aparece cuando la persona puede editar el desglose */
function areaBtn(x) {
  if (x.owner || x.perms.desglose !== 'editar') return '';
  const a = x.perms.areas;
  return `<button type="button" class="area-btn ${ea(a ? 'some' : '')}" data-areas title="${esc(areasText(a))}">${!a ? 'Todas las áreas' : a.length === 1 ? esc((SHEET.find(b => b.id === a[0]) || {}).name || '1 área') : a.length + ' áreas'}</button>`;
}
function areaPicker(anchor, x, done) {
  const cur = x.perms.areas ? new Set(x.perms.areas) : null;
  popover(anchor, `<h5>Áreas del desglose</h5><p class="hint" style="margin:0 0 6px">Qué cajas de la hoja de desglose puede editar. Las demás las ve sin poder cambiarlas.</p>
    <label class="area-opt all"><input type="checkbox" data-all ${!cur ? 'checked' : ''}> Todas las áreas (también decorado y descripción)</label>
    ${SHEET.map(b => `<label class="area-opt"><input type="checkbox" data-a="${ea(b.id)}" ${!cur || cur.has(b.id) ? 'checked' : ''} ${!cur ? 'disabled' : ''}><span class="dot" style="--c:${ea(b.color)}"></span>${esc(b.name)}</label>`).join('')}`,
    p => p.addEventListener('change', e => {
      const all = $('[data-all]', p);
      if (e.target === all) $$('[data-a]', p).forEach(c => { c.disabled = all.checked; c.checked = true; });
      if (all.checked) delete x.perms.areas;
      else x.perms.areas = $$('[data-a]', p).filter(c => c.checked).map(c => c.dataset.a);
      done();
    }));
}
/* ¿se llegó al tope de personas del plan de quien es dueño? (Indie 1, Pro 30, Studio 60; un guion, 4) Lo dice y corta */
function teamLimitStop(count) {
  const total = API() && SHARE.limits ? SHARE.limits.members : null, freeMax = total != null ? Math.max(0, total - 1) : null;
  if (freeMax == null || count < freeMax) return false;
  const planNm = PLAN_NAME[SHARE.ownerPlan] || '';
  if (SHARE.ownerPlan === 'studio' || SHARE.kind === 'guion') toast(SHARE.kind === 'guion' ? `Un guion se escribe con hasta ${total} personas, contándote a ti.` : `El plan Studio permite hasta ${total} personas por proyecto, contándote a ti.`, 5000);
  else licenseDialog(freeMax ? `El plan ${planNm} permite ${total} personas por proyecto, contándote a ti. Con Studio, hasta ${((APITEAM.me && APITEAM.me.plans) || PLAN_DEFAULTS).studio.members}.` : `Indie es para una sola persona. Para trabajar en equipo con permisos por área, pasa a Pro.`, freeMax ? 'studio' : 'pro');
  return true;
}
function teamDialog(focusId) {
  if (!SHARE || !SHARE.admin) return;
  const WEB = !DESK && !API(), AP = API();
  // personas que se pueden sumar según el plan de quien es dueño (contándolo: Indie 1, Pro 30, Studio 60; un guion, 4)
  const total = AP && SHARE.limits ? SHARE.limits.members : null, freeMax = total != null ? Math.max(0, total - 1) : null;
  const planNm = PLAN_NAME[SHARE.ownerPlan] || '';
  // en un guion se coescribe: solo la columna del guion
  // Gastos: solo en la web con cuentas, con Pro o Studio
  const COLS = AP && SHARE.kind === 'guion' ? SEC_LIST.filter(([s]) => s === 'guion') : AP && gsPlanOk() ? [...SEC_LIST, ['gastos', 'Gastos', 'gastos']] : SEC_LIST;
  const rows = SHARE.members.map(x => ({ ...x, perms: sclone(x.perms || {}) }));
  const changes = new Map();     // id -> cambio
  const adds = [];
  const m = modal({
    title: 'Equipo y permisos', wide: true,
    body: `<p class="hint" style="margin:0">Elige qué pestañas puede <b>ver</b> o <b>editar</b> cada jefe de área. En el desglose, «Editar» puede limitarse a sus áreas: cada uno llena sus cajas y ve las demás. Ver una pestaña incluye leer el guion y el desglose; el presupuesto también incluye el plan (para contar los días de rodaje).${DESK ? ' Si alguien deja de poder leer algo, se cambian las cerraduras de esa parte.' : ''}</p>
      <div class="team-wrap"><table class="team-t"><thead><tr><th>Persona</th>${COLS.map(([, n]) => `<th>${esc(n)}</th>`).join('')}<th></th></tr></thead><tbody id="tmB"></tbody></table></div>
      <div class="team-add"><b>Agregar persona</b>
        ${AP ? `<div class="team-add-row"><input type="email" id="tmE" placeholder="Correo de su cuenta de Google" autocomplete="off" inputmode="email" aria-label="Correo"><select id="tmR" aria-label="Cargo">${ROLES.map(([r]) => `<option>${esc(r)}</option>`).join('')}</select><button class="btn" id="tmA" type="button">＋ Agregar</button></div>
        <div id="tmReq" class="team-hits"></div>
        <p class="hint" style="margin:0">Entrará con esa cuenta de Google; si aún no usa ${esc(appName())}, su cuenta gratuita se crea al entrar. Al guardar podrás copiar la invitación con el enlace.${freeMax != null ? ` <b>${SHARE.kind === 'guion' ? `Un guion se escribe con hasta ${total} personas, contándote a ti.` : freeMax ? `Plan ${planNm}: hasta ${total} personas por proyecto, contándote a ti.` : `Plan ${planNm}: solo tú. Para trabajar en equipo, pasa a Pro.`}</b>` : ''}</p>`
        : WEB ? `<div class="team-add-row"><select id="tmR" aria-label="Cargo">${ROLES.map(([r]) => `<option>${esc(r)}</option>`).join('')}</select><input type="search" id="tmQ" placeholder="Buscar por nombre en tu organización" autocomplete="off"></div>
        <div id="tmHits" class="team-hits"></div><div id="tmReq" class="team-hits"></div>
        <p class="hint" style="margin:0">¿No aparece? Compártele esta página desde <b>Compartir</b> (como editor, si no es de tu organización), pídele que la abra y que toque <b>Pedir acceso</b> en el menú del proyecto. Su pedido aparecerá aquí.</p>`
        : `<div class="team-add-row"><input type="text" id="tmN" placeholder="Nombre"><select id="tmR">${ROLES.map(([r]) => `<option>${esc(r)}</option>`).join('')}</select><button class="btn" id="tmA" type="button">＋ Agregar</button></div>`}</div>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="tmOk">Guardar cambios</button>`,
  });
  const paint = () => {
    $('#tmB', m).innerHTML = [...rows, ...adds].map((x, i) => {
      const own = x.owner, ch = changes.get(x.id) || {};
      if (ch.remove) return `<tr class="gone"><td colspan="${ea(COLS.length + 2)}"><s>${esc(x.name)}</s> · se quitará del equipo <button class="linkbtn" data-undo="${esc(x.id)}">deshacer</button></td></tr>`;
      const roleSel = own ? `<span class="hint">${esc(x.role || 'Producción')} · administra</span>` : `<select class="tm-role" aria-label="Cargo de ${esc(x.name)}">${[...new Set([...ROLES.map(r => r[0]), x.role].filter(Boolean))].map(r => `<option ${r === x.role ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>`;
      return `<tr data-id="${esc(x.id || '')}" data-i="${i}"><td><b>${esc(x.name)}</b>${AP && x.email && x.email !== x.name ? `<span class="hint tm-mail">${esc(x.email)}</span>` : ''}${roleSel}<span class="hint">${x.add ? 'nuevo' : ''}${x.pending ? 'invitación pendiente' : ''}${ch.reset ? ' · contraseña nueva' : ''}</span></td>
        ${COLS.map(([s]) => `<td>${own ? '<span class="pm-all">Editar</span>' : s === 'presupuesto' && !isProducer(x.role) ? '<span class="pm-no" title="Solo para cargos de producción">Solo producción</span>' : permSelect(s, x.perms[s]) + (s === 'desglose' ? areaBtn(x) : '')}</td>`).join('')}
        <td class="acts">${own ? '' : `${x.add || WEB ? '' : `<button class="btn ghost sm" data-reset title="Genera una contraseña nueva; la anterior deja de funcionar">Nueva contraseña</button>`}<button class="btn ghost sm danger" data-rm>${x.add ? 'Descartar' : 'Quitar'}</button>`}</td></tr>`;
    }).join('');
  };
  paint();
  if (focusId) { const tr = $(`#tmB tr[data-id="${CSS.escape(focusId)}"]`, m); if (tr) { tr.classList.add('tm-hl'); requestAnimationFrame(() => tr.scrollIntoView({ block: 'nearest' })); const f = $('select', tr); if (f) f.focus({ preventScroll: true }); } }
  const rowOf = el => { const tr = el.closest('tr'); const i = +tr.dataset.i; return i < rows.length ? rows[i] : adds[i - rows.length]; };
  const touch = x => { if (!x.add) changes.set(x.id, { ...(changes.get(x.id) || {}), id: x.id, perms: x.perms, role: x.role }); };
  $('#tmB', m).addEventListener('change', e => {
    const rs = e.target.closest('select.tm-role');
    if (rs) {
      const x = rowOf(rs); x.role = rs.value;
      // etiquetar como productor da acceso al presupuesto; quitar el cargo lo retira
      if (!isProducer(x.role)) delete x.perms.presupuesto;
      else if (!x.perms.presupuesto) x.perms.presupuesto = 'ver';
      touch(x); paint(); return;
    }
    const sel = e.target.closest('select.pm'); if (!sel) return;
    const x = rowOf(sel);
    if (sel.value) x.perms[sel.dataset.sec] = sel.value; else delete x.perms[sel.dataset.sec];
    if (sel.dataset.sec === 'desglose' && sel.value !== 'editar') delete x.perms.areas;
    touch(x); paint();
  });
  $('#tmB', m).addEventListener('click', e => {
    const u = e.target.closest('[data-undo]');
    if (u) { const c = changes.get(u.dataset.undo); if (c) { delete c.remove; } paint(); return; }
    const b = e.target.closest('button'); if (!b) return;
    const x = rowOf(b);
    if (b.hasAttribute('data-areas')) { areaPicker(b, x, () => { touch(x); paint(); }); return; }
    if (b.hasAttribute('data-rm')) { if (x.add) adds.splice(adds.indexOf(x), 1); else changes.set(x.id, { ...(changes.get(x.id) || {}), id: x.id, remove: true }); paint(); }
    if (b.hasAttribute('data-reset')) { changes.set(x.id, { ...(changes.get(x.id) || {}), id: x.id, reset: true }); paint(); }
  });
  const presetOf = role => AP && SHARE.kind === 'guion' ? { guion: 'editar' } : sclone((ROLES.find(r => r[0] === role) || [, {}])[1]);
  const addPerson = (name, id, email) => {
    const role = $('#tmR', m).value;
    if (id && [...rows, ...adds].some(x => x.id === id && !(changes.get(id) || {}).remove)) { toast(`${name} ya está en el equipo.`); return; }
    if (email && [...rows, ...adds].some(x => x.email === email && !(changes.get(x.id) || {}).remove)) { toast(`${email} ya está en el equipo.`); return; }
    if (teamLimitStop([...rows, ...adds].filter(x => !x.owner && !(changes.get(x.id) || {}).remove).length)) return;
    adds.push({ add: true, id, name, role, perms: presetOf(role), email });
    paint();
  };
  const showReqs = (list, byEmail) => {
    const box = $('#tmReq', m); if (!box) return;
    const fresh = list.filter(r => ![...rows, ...adds].some(x => x.id === r.id || (r.email && x.email === r.email)));
    box.innerHTML = fresh.length ? '<b class="hint" style="width:100%">Pidieron acceso</b>' + fresh.map((r, i) => `<button type="button" class="team-hit req" data-req="${i}">${r.avatarUrl ? `<img src="${esc(r.avatarUrl)}" alt="" referrerpolicy="no-referrer">` : ''}<span></span><em>Agregar</em></button>`).join('') : '';
    $$('.team-hit.req span', box).forEach((sp, i) => { sp.textContent = fresh[i].name + (byEmail && fresh[i].email ? ' · ' + fresh[i].email : ''); });
    box.onclick = e => { const b = e.target.closest('[data-req]'); if (!b) return; const r = fresh[+b.dataset.req]; if (byEmail) addPerson(r.email, undefined, r.email); else addPerson(r.name, r.id); b.remove(); };
  };
  if (AP) {
    const add = () => {
      const e = $('#tmE', m).value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) { toast('Escribe el correo de su cuenta de Google.'); $('#tmE', m).focus(); return; }
      if (SHARE.members.some(x => x.owner && x.email === e)) { toast('Ese es tu correo: ya administras el proyecto.'); return; }
      addPerson(e, undefined, e); $('#tmE', m).value = '';
    };
    $('#tmA', m).onclick = add;
    $('#tmE', m).addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    showReqs(SHARE.requests || [], true);
    TIO().requests(SHARE.pid).then(list => showReqs(list, true)).catch(() => { });
  } else if (WEB) {
    const hitsBox = $('#tmHits', m), q = $('#tmQ', m);
    const showHits = list => {
      hitsBox.innerHTML = list.length ? list.map((h, i) => `<button type="button" class="team-hit" data-hit="${i}"><img src="${esc(h.avatarUrl)}" alt="" referrerpolicy="no-referrer"><span></span></button>`).join('') : (q.value.trim() ? '<span class="hint">Sin resultados en tu organización.</span>' : '');
      $$('.team-hit span', hitsBox).forEach((sp, i) => { sp.textContent = list[i].name + (list[i].isMe ? ' (tú)' : ''); });
      hitsBox._list = list;
    };
    q.addEventListener('input', async () => showHits((await WEBTEAM.search(q.value)).filter(h => !h.isMe)));
    q.addEventListener('focus', async () => { if (!q.value) showHits((await WEBTEAM.search('')).filter(h => !h.isMe)); });
    hitsBox.addEventListener('click', e => { const b = e.target.closest('[data-hit]'); if (!b) return; const h = hitsBox._list[+b.dataset.hit]; addPerson(h.name, h.id); q.value = ''; showHits([]); });
    WEBTEAM.requests(SHARE.pid).then(list => showReqs(list, false)).catch(() => { });
  } else {
    $('#tmA', m).onclick = () => {
      const n = $('#tmN', m).value.trim();
      if (!n) { $('#tmN', m).focus(); return; }
      addPerson(n); $('#tmN', m).value = '';
    };
    $('#tmN', m).addEventListener('keydown', e => { if (e.key === 'Enter') $('#tmA', m).click(); });
  }
  $('#tmOk', m).onclick = async () => {
    const list = [...changes.values(), ...adds.map(a => ({ add: true, id: a.id, name: a.name, role: a.role, perms: a.perms, email: a.email }))];
    if (!list.length) { closeModal(); return; }
    const b = $('#tmOk', m); b.disabled = true; b.textContent = 'Guardando…';
    try {
      await flushSave();
      const r = await TIO().updateTeam(SHARE.pid, list);
      SHARE.members = r.state.members || SHARE.members;
      closeModal();
      if (AP) { sharePaintTabs(); if (r.added && r.added.length) invitationsDialog(r.added); else toast('Permisos guardados.'); return; }
      const named = Object.entries(r.passwords || {}).map(([id, pw]) => ({ ...(SHARE.members.find(x => x.id === id) || { name: '?' }), pw }));
      if (named.length) passwordsDialog(named, r.rekeyed);
      else toast(r.rekeyed && r.rekeyed.length ? `Permisos guardados. Se cambiaron las cerraduras de: ${r.rekeyed.map(s => SECNAME[s]).join(', ')}.` : 'Permisos guardados.', 5000);
    } catch (e) {
      b.disabled = false; b.textContent = 'Guardar cambios';
      if (e && e.code === 'limit_members' && SHARE.ownerPlan !== 'studio' && SHARE.kind !== 'guion') licenseDialog(e.message, SHARE.ownerPlan === 'pro' ? 'studio' : 'pro'); else toast(errText(e), 5000);
    }
  };
}
function inviteText(x) {
  const folder = (SHARE.dir || '').split(/[\\/]/).pop();
  const tabs = secListAll().filter(([s]) => x.perms && x.perms[s]).map(([s, n]) => `${n} (${x.perms[s] === 'editar' ? 'editar' : 'ver'})`).join(', ');
  return `Hola ${x.name}:\n\nTe sumé al proyecto «${SHARE.title}» en ${APPINFO.name}.${tabs ? '\nTienes acceso a: ' + tabs + '.' : ''}\n\n1. Instala ${APPINFO.name} en tu computadora (la versión Free basta para entrar).\n2. Acepta la carpeta compartida «${folder}» en tu Google Drive, OneDrive o Dropbox y deja que se sincronice.\n3. Abre el archivo «${(SHARE.file || '').split(/[\\/]/).pop()}» de esa carpeta.\n4. Elige tu nombre y escribe tu contraseña: ${x.pw}\n\nPuedes cambiarla luego en el botón con tu nombre › Cambiar mi contraseña.\nNo compartas la contraseña con nadie.`;
}
function passwordsDialog(list, rekeyed) {
  const m = modal({
    title: 'Contraseñas del equipo', wide: true,
    body: `<p style="margin:0">Envía a cada persona su contraseña por un canal privado. ${rekeyed && rekeyed.length ? `Se cambiaron las cerraduras de: ${rekeyed.map(s => SECNAME[s]).join(', ')}.` : ''}</p>
      ${list.map((x, i) => `<div class="pw-row"><div><b>${esc(x.name)}</b><span class="hint">${esc(x.role || '')}</span></div><code>${esc(x.pw)}</code><button class="btn sm" data-inv="${i}">Copiar invitación</button></div>`).join('')}
      <p class="hint" style="margin:0">Estas contraseñas no se vuelven a mostrar. Si alguien la pierde, usa «Nueva contraseña» en Equipo y permisos.</p>`,
    foot: '<button class="btn primary" data-close>Listo</button>',
  });
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-inv]'); if (!b) return;
    navigator.clipboard.writeText(inviteText(list[+b.dataset.inv])).then(() => toast('Invitación copiada'), () => { });
  });
}
function changePasswordDialog(lead) {
  const m = modal({
    title: 'Cambiar mi contraseña',
    body: `${lead ? `<p style="margin:0">${esc(lead)}</p>` : ''}<label class="fld"><span>Contraseña nueva</span><input type="password" id="cpA" autocomplete="new-password" placeholder="Mínimo 12, con letras y números"></label>
      <label class="fld"><span>Repítela</span><input type="password" id="cpB" autocomplete="new-password"></label><p class="hint" id="cpE" style="margin:0;color:var(--bad)" hidden></p>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="cpOk">Cambiar</button>',
  });
  $('#cpOk', m).onclick = async () => {
    const a = $('#cpA', m).value, er = $('#cpE', m);
    // la misma regla que al crear el equipo: el archivo con tu llave está en la carpeta compartida y cualquiera del equipo
    // puede copiarlo e intentar adivinarla sin límite
    if (a.length < 12 || !/[a-záéíóúñ]/i.test(a) || !/\d/.test(a)) { er.textContent = 'Usa al menos 12 caracteres, con letras y números.'; er.hidden = false; return; }
    if (a !== $('#cpB', m).value) { er.textContent = 'Las contraseñas no coinciden.'; er.hidden = false; return; }
    try { await DESK.team.changePassword(SHARE.pid, a); closeModal(); toast('Contraseña cambiada.'); } catch (e) { er.textContent = errText(e); er.hidden = false; }
  };
}
/* el panel del equipo: se abre desde las caras de quienes están ahora y desde el botón del equipo.
   · «Ahora en el proyecto»: quién está y en qué pestaña (tocar = ir ahí).
   · Tú: tu cargo y tus permisos.
   · Producción, en la web con cuentas, gestiona el equipo aquí mismo: el cargo de cada persona, sus permisos por
     pestaña (en Equipo y permisos), quitarla, invitar por correo y aceptar a quien pidió acceso. Cada cambio se guarda
     al momento. En el escritorio y en Drive sigue la tabla completa de Equipo y permisos. */
function teamPanel(anchor) {
  if (!SHARE) return;
  const AP = API(), adm = SHARE.admin && AP, ppl = pzPeople();
  const ar = bdAreasOf(SHARE.perms);
  const tabs = secListAll().filter(([s]) => SHARE.admin || SHARE.perms[s]).map(([s, n]) => `<li>${esc(n)} <span class="hint">${SHARE.admin || SHARE.perms[s] === 'editar' ? (s === 'desglose' && ar && !SHARE.admin ? 'editar: ' + esc(areasText(ar)) : 'editar') : 'ver'}</span></li>`).join('');
  const meAv = pzAv({ uid: SHARE.me.id || 'yo', name: SHARE.me.name || 'Tú', pic: PZ_PIC.test(SHARE.me.picture || '') ? SHARE.me.picture : '' });
  const p = popover(anchor, `<section id="tmNow" class="tm-sec"${ppl.length ? '' : ' hidden'}>${ppl.length ? tmNowHTML(ppl) : ''}</section>
    <section class="tm-sec tm-me">${meAv}<span class="tm-who"><b data-no-tr>${esc(SHARE.me.name || 'Tú')}</b><small>${esc(SHARE.me.role || '')}${SHARE.admin ? ' · administra el equipo' : ''}</small></span></section>
    ${adm ? '<section class="tm-sec" id="tmTeam"></section>' : `<ul class="perm-list">${tabs}</ul>`}
    <div class="menu">${SHARE.admin ? '<button data-t="team">Equipo y permisos…</button>' : ''}
      ${DESK ? `<button data-t="pw">Cambiar mi contraseña…</button>
      <button data-t="dir">Abrir la carpeta compartida</button>
      <hr><button data-t="out">Cerrar sesión</button>` : AP ? (SHARE.admin ? '' : '<hr><button data-t="leave">Salir de este proyecto…</button>') : '<hr><button data-t="out">Salir del proyecto</button>'}</div>`, pp => {
    pp.classList.add('tm-pop');
    pp.addEventListener('click', async e => {
      const pz = e.target.closest('[data-pzt]');
      if (pz) { if (pz.dataset.pzt && pz.getAttribute('aria-disabled') !== 'true') { closePop(); setTab(pz.dataset.pzt); } return; }
      const b = e.target.closest('.menu button[data-t]'); if (!b) return;
      closePop();
      const t = b.dataset.t;
      if (t === 'team') teamDialog();
      if (t === 'pw') changePasswordDialog();
      if (t === 'dir') DESK.team.openDir(SHARE.pid);
      if (t === 'leave') return confirmBox('Salir del proyecto', `Dejarás de ver «${esc(SHARE.title || P.meta.title)}». Producción puede volver a invitarte cuando quiera.`, 'Salir', async () => {
        try { await Store.remove(SHARE.pid); } catch (er) { toast(errText(er)); return; }
        SHARE = null; toast('Saliste del proyecto.');
        const rest = await Store.list().catch(() => []);
        if (rest.length) openProject(rest[0].id); else setProject(buildSample());
      });
      if (t === 'out') {
        await flushSave();
        const pid = SHARE.pid;
        try { ls.del(`budpin:${pid}:${SHARE && SHARE.me ? SHARE.me.id : ''}`); } catch (er) { }   // al salir, el código del presupuesto de este equipo se borra
        await TIO().logout(pid);
        SHARE = null; setProject(buildSample()); sharePaintTabs();
        toast(DESK ? 'Sesión cerrada.' : 'Saliste del proyecto.');
      }
    });
    if (adm) tmTeamMount(pp);
  });
  return p;
}
/* la parte de producción del panel: el equipo, quienes pidieron acceso e invitar */
function tmTeamMount(pp) {
  const box = $('#tmTeam', pp); if (!box) return;
  let openId = null, busy = false;
  const roleOpts = cur => [...new Set([...ROLES.map(r => r[0]), cur].filter(Boolean))].map(r => `<option${r === cur ? ' selected' : ''}>${esc(r)}</option>`).join('');
  const av = x => pzAv({ uid: x.id, name: x.name || x.email || '?', pic: PZ_PIC.test(x.picture || x.avatarUrl || '') ? (x.picture || x.avatarUrl) : '' });
  const paint = () => {
    // tú ya estás arriba: aquí van los demás (también las invitaciones que aún no se aceptan)
    const all = SHARE.members || [], mem = all.filter(x => x.id !== SHARE.me.id), fresh = (SHARE.requests || []).filter(r => !all.some(x => x.id === r.id || (r.email && x.email === r.email)));
    box.innerHTML = `<h5 id="tmTeamH">Equipo (${mem.length})</h5>
      ${mem.length ? '' : '<p class="hint tm-empty">Todavía no hay nadie más. Invita por correo.</p>'}
      <ul class="tm-list" aria-labelledby="tmTeamH">${mem.map(x => {
        const own = !!x.owner, op = openId === x.id;
        return `<li data-id="${ea(x.id)}"${op ? ' class="open"' : ''}>${av(x)}<span class="tm-who"><b data-no-tr>${esc(x.name || x.email)}</b><small>${esc(x.role || '')}${own ? ' · administra' : ''}${x.pending ? ' · invitación pendiente' : ''}</small></span>
          ${own ? '<span></span>' : `<button type="button" class="btn ghost sm tm-more" data-more aria-expanded="${op}" aria-controls="tmA-${ea(x.id)}" aria-label="Opciones de ${ea(x.name || x.email)}" title="Cargo, permisos o quitar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="4.5" cy="12" r="2.4"/><circle cx="12" cy="12" r="2.4"/><circle cx="19.5" cy="12" r="2.4"/></svg></button>
          <div class="tm-acts" id="tmA-${ea(x.id)}"${op ? '' : ' hidden'}>
            <label><span>Cargo</span><select data-role aria-label="Cargo de ${ea(x.name || x.email)}">${roleOpts(x.role)}</select></label>
            <div class="tm-acts-b"><button type="button" class="btn sm" data-perm>Permisos por pestaña…</button><button type="button" class="btn ghost sm danger" data-rm>Quitar del equipo…</button></div>
          </div>`}</li>`;
      }).join('')}</ul>
      ${fresh.length ? `<h6 class="tm-sub">Pidieron acceso</h6><ul class="tm-list tm-reqs">${fresh.map(r => `<li data-req="${ea(r.id)}">${av(r)}<span class="tm-who"><b data-no-tr>${esc(r.name || r.email)}</b><small data-no-tr>${esc(r.email || '')}</small></span><button type="button" class="btn sm" data-acc>Aceptar</button></li>`).join('')}</ul>` : ''}
      <form class="tm-inv" novalidate><h6 class="tm-sub">Invitar</h6>
        <input type="email" name="em" placeholder="Correo de su cuenta de Google" autocomplete="off" inputmode="email" aria-label="Correo de la persona que invitas">
        <select name="ro" aria-label="Cargo">${ROLES.map(([r]) => `<option>${esc(r)}</option>`).join('')}</select><button type="submit" class="btn primary sm">Invitar</button></form>`;
  };
  paint();
  const presetOf = role => SHARE.kind === 'guion' ? { guion: 'editar' } : sclone((ROLES.find(r => r[0] === role) || [, {}])[1]);
  // cada cambio se guarda al momento; si algo falla, se dice y el panel vuelve a como estaba
  const save = async (list, ok) => {
    if (busy) return null; busy = true; box.setAttribute('aria-busy', 'true');
    try {
      await flushSave();
      const r = await TIO().updateTeam(SHARE.pid, list);
      SHARE.members = r.state.members || SHARE.members;
      sharePaintTabs(); paint();
      if (ok) ok(r);
      return r;
    } catch (e) {
      if (e && e.code === 'limit_members' && SHARE.ownerPlan !== 'studio' && SHARE.kind !== 'guion') licenseDialog(e.message, SHARE.ownerPlan === 'pro' ? 'studio' : 'pro'); else toast(errText(e), 5000);
      paint(); return null;
    } finally { busy = false; box.removeAttribute('aria-busy'); }
  };
  box.addEventListener('click', e => {
    const li = e.target.closest('li[data-id]'), x = li && (SHARE.members || []).find(m => m.id === li.dataset.id);
    if (e.target.closest('[data-more]') && x) { openId = openId === x.id ? null : x.id; paint(); const f = $(`li[data-id="${CSS.escape(x.id)}"] ${openId ? 'select' : '[data-more]'}`, box); if (f) f.focus(); return; }
    if (e.target.closest('[data-perm]') && x) { closePop(); teamDialog(x.id); return; }
    if (e.target.closest('[data-rm]') && x) {
      const nm = x.name || x.email;
      confirmBox('Quitar del equipo', `${esc(nm)} dejará de ver «${esc(SHARE.title || P.meta.title)}». Puedes volver a invitarle cuando quieras.`, 'Quitar', () => save([{ id: x.id, remove: true }], () => { openId = null; paint(); toast(`${nm} ya no está en el equipo.`); }));
      return;
    }
    const rq = e.target.closest('li[data-req]');
    if (rq && e.target.closest('[data-acc]')) {
      const r = (SHARE.requests || []).find(q => q.id === rq.dataset.req); if (!r || !r.email) return;
      if (teamLimitStop((SHARE.members || []).filter(m => !m.owner).length)) return;
      const role = 'Personalizado';
      // entra con permisos mínimos y su fila queda abierta para elegirle el cargo
      save([{ add: true, email: r.email, role, perms: presetOf(role) }], () => {
        if ((SHARE.members || []).some(m => m.id === r.id)) { openId = r.id; paint(); const f = $(`li[data-id="${CSS.escape(r.id)}"] select`, box); if (f) f.focus(); }
        toast(`${r.name || r.email} ya está en el equipo. Elige su cargo.`, 5000);
      });
    }
  });
  box.addEventListener('change', e => {
    const sel = e.target.closest('select[data-role]'); if (!sel) return;
    const li = sel.closest('li[data-id]'), x = (SHARE.members || []).find(m => m.id === li.dataset.id); if (!x) return;
    const perms = sclone(x.perms || {});
    // etiquetar como productor da acceso al presupuesto; quitar el cargo lo retira (como en Equipo y permisos)
    if (!isProducer(sel.value)) delete perms.presupuesto; else if (!perms.presupuesto) perms.presupuesto = 'ver';
    save([{ id: x.id, role: sel.value, perms }], () => { const f = $(`li[data-id="${CSS.escape(x.id)}"] select`, box); if (f) f.focus(); toast(`Cargo guardado: ${sel.value}.`); });
  });
  box.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, em = f.elements.em.value.trim().toLowerCase(), role = f.elements.ro.value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { toast('Escribe el correo de su cuenta de Google.'); f.elements.em.focus(); return; }
    if ((SHARE.members || []).some(x => x.email === em)) { toast(SHARE.members.some(x => x.owner && x.email === em) ? 'Ese es tu correo: ya administras el proyecto.' : `${em} ya está en el equipo.`); return; }
    if (teamLimitStop((SHARE.members || []).filter(m => !m.owner).length)) return;
    save([{ add: true, email: em, role, perms: presetOf(role) }], r => { closePop(); if (r.added && r.added.length) invitationsDialog(r.added); });
  });
  // los pedidos de acceso al día (el estado que se abrió puede ser de hace rato)
  TIO().requests(SHARE.pid).then(list => { if (!box.isConnected) return; SHARE.requests = list; if (!busy && !box.contains(document.activeElement)) paint(); }).catch(() => { });
}
