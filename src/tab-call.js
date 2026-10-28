/* ============================================================
   Pestaña · HOJA DE LLAMADO — una por jornada, a partir del stripboard
   Encabezado (proyecto, productora, fecha, jornada), producción y dirección,
   centro de salud, horarios (almuerzo, amanecer, atardecer), clima, llamado
   general y locaciones; cronograma de la jornada; equipo técnico por área con
   su llamado; reparto con recojo y llamado; notas y avance.
   El directorio (nombres, teléfonos, correos) es del proyecto; los horarios,
   de cada jornada. (lote AH) Todo lo que llega del stripboard se puede cambiar
   en la hoja (queda solo en ella, con «volver a la guía»), hay hojas libres
   que no salen de ninguna jornada y la hoja va en cuadros, como una planilla.
   ============================================================ */
const CS_DEPTS = [
  ['prod', 'Producción', ['Dirección', 'Producción', 'Producción ejecutiva', 'Jefatura de producción', 'Asistencia de producción']],
  ['dir', 'Equipo de dirección', ['1.er asistente de dirección', '2.º asistente de dirección', 'Script / continuidad']],
  ['cam', 'Cámara', ['Dirección de fotografía', '1.er asistente de cámara', '2.º asistente de cámara', 'DIT / manejo de material']],
  ['ge', 'Eléctricos y maquinistas', ['Jefe de eléctricos (gaffer)', 'Eléctrico', 'Jefe de maquinistas (key grip)', 'Maquinista']],
  ['hmu', 'Maquillaje y peinado', ['Maquillaje', 'Peinado', 'Asistente de maquillaje']],
  ['ward', 'Vestuario', ['Diseño de vestuario', 'Vestuarista', 'Asistente de vestuario']],
  ['art', 'Arte', ['Dirección de arte', 'Ambientación', 'Utilería']],
  ['sound', 'Sonido', ['Sonidista', 'Microfonista']],
];
const capFirst = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
/* (lote AC) la escala de letras de la hoja (px en la pantalla) y sus grises (cuánto de la tinta sobre el fondo), en una
   sola tabla: la pantalla los toma como variables (--cl-cap… y --cl-2, --cl-3, --cl-sep…, puestas al cargar en la raíz;
   el teléfono achica algunas en shell.html) y el PDF los usa en la misma proporción (CLF y clTones, pdf-llamado.js) */
const CL_SCALE = { cap: 11.5, ft: 12.5, bd: 13.5, h3: 17, h2: 19, h1: 26, hero: 56 };
const CL_TONE = { 2: .66, 3: .52, sep: .13, sep2: .07, fill: .05 };
if (typeof document !== 'undefined' && document.documentElement) {
  const st = document.documentElement.style;
  for (const [k, v] of Object.entries(CL_SCALE)) st.setProperty('--cl-' + k, v + 'px');
  for (const [k, v] of Object.entries(CL_TONE)) st.setProperty('--cl-' + k, `color-mix(in srgb,var(--ink) ${Math.round(v * 100)}%,var(--surface))`);
}
/* (lote Y) el clima con su unidad pegada al número: la máxima y la mínima con «°», la humedad con «%» y, en «Clima», un
   número solo es la temperatura («29°»). Se guarda el número sin la unidad (si la escriben, se quita) y la unidad se
   pone al mostrarlo: en la pantalla aparece al lado apenas se escribe; en el PDF y el Excel, pegada al número.
   (lote AC) Una sola tabla de los datos con unidad (su etiqueta, su unidad, el ejemplo y la ayuda) para la pantalla, el
   PDF y el Excel */
const WX_FIELDS = [
  { f: 'hi', lab: 'Máx.', u: '°', ph: '°C', aria: 'Máxima', tip: 'Máxima (°C)' },
  { f: 'lo', lab: 'Mín.', u: '°', ph: '°C', aria: 'Mínima', tip: 'Mínima (°C)' },
  { f: 'hum', lab: 'Hum.', u: '%', ph: '%', aria: 'Humedad', tip: 'Humedad (%)' },
];
const WX_U = { wx: '°', ...Object.fromEntries(WX_FIELDS.map(x => [x.f, x.u])) };
const wxBare = v => String(v ?? '').trim().replace(/\s*(?:[°º]\s*[cC]?|%)$/, '').trim();
/* el número de un dato del clima, sin su unidad (o null si lo escrito no es un número) */
const wxNum = v => { const b = wxBare(v); return /^[-−]?\d+(?:[.,]\d+)?$/.test(b) ? b : null; };
const wxShow = (f, v) => { const n = wxNum(v); return n !== null ? n + WX_U[f] : String(v ?? '').trim(); };
/* el clima para mostrar: lo escrito en «Clima» (con «°» si es un número) y los pares [etiqueta, valor con su unidad] */
const wxParts = dd => ({ wx: wxShow('wx', dd.wx), pairs: WX_FIELDS.map(x => [x.lab, wxShow(x.f, dd[x.f])]).filter(([, v]) => v) });
const callEditable = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('llamado'));
const CALL = () => P.call;
/* hora por plano: apagada por defecto. En rodaje se trabaja con inicio y fin de escena; repartir la escena
   entre sus planos es solo una estimación y, con varias unidades, no se puede seguir */
const callShotTimes = () => !!(P.call && P.call.shotTimes);
/* la miniatura del storyboard en cada plano del cronograma (encendida salvo que se apague) */
const callThumbs = () => !(P.call && P.call.noThumbs) && typeof thumbCached === 'function';
const callThumb = sh => { const u = thumbCached(sh); return `<img class="cl-th${ea(u ? '' : ' wait')}" draggable="false" alt="" src="${ea(u || BLANK)}" ${u ? '' : `data-thumb="${ea(sh.id)}"`}>`; };
/* directorio del equipo: la primera vez se arma con los cargos típicos y los nombres del Proyecto */
function callCrew() {
  const C = CALL();
  if (!C.crew.length && callEditable()) {
    const dirs = (P.meta.directors || []).map(personName).filter(Boolean), prods = (P.meta.producers || []).filter(x => personName(x));
    const exec = prods.find(x => /ejecutiv/i.test(x.role || '')), prod = prods.find(x => x !== exec);
    for (const [dept, , roles] of CS_DEPTS) for (const role of roles) {
      const name = role === 'Dirección' ? (dirs[0] || '') : role === 'Producción' ? personName(prod) : role === 'Producción ejecutiva' ? personName(exec) : '';
      C.crew.push({ id: uid('c'), dept, role, name: name || '', phone: '', email: '' });
    }
    if (!(P._sample && !P._saved)) changed('data');     // en el ejemplo es solo de muestra: no cuenta como cambio
  }
  return C.crew;
}
function callDays() {
  if (!D.sc.scenes.length) return { days: [], dates: [] };
  const { days } = scheduleDays(P, D.sc);
  return { days, dates: shootDates(P, days.length) };
}
const dayData = id => (CALL().days[id] = CALL().days[id] || {});
const peekDay = id => CALL().days[id] || {};
/* ---------- (lote AH) la hoja abierta: una jornada del plan o una hoja libre ----------
   Una hoja es una jornada del plan (su número: 0, 1…) o una hoja libre (su id, «f…»): una hoja de llamado que no sale
   de ninguna jornada y se llena a mano, campo por campo. Las libres van en P.call.free [{ id, name }] y sus datos, como
   los de una jornada, en P.call.days[id] (así sirven los mismos campos). UI.callFree: la hoja libre abierta */
const callFrees = () => (P && P.call && Array.isArray(P.call.free) ? P.call.free : []);
const callFreeOf = id => callFrees().find(f => f.id === id) || null;
const callIsFree = ref => typeof ref === 'string';
const callRef = () => UI.callFree && callFreeOf(UI.callFree) ? UI.callFree : (UI.callDay || 0);
/* quien elige una jornada (aquí, en el calendario, en «Ver en › Llamado» del plan o en la hoja de script) escribe
   UI.callDay: con eso se cierra la hoja libre abierta */
if (typeof UI !== 'undefined') { let cd = UI.callDay; Object.defineProperty(UI, 'callDay', { get: () => cd, set: v => { cd = v; UI.callFree = null; }, enumerable: true, configurable: true }); }
/* sin las filas quitadas en esta hoja (dd.rx): la jornada que la hoja muestra (sus escenas, su reparto y sus horas) */
function callDayEff(d, dd) {
  const rx = (dd || peekDay(d.id)).rx; if (!rx || !Object.keys(rx).length) return d;
  const rows = d.rows.filter(i => !rx[itemKey(P.schedule.items[i])]);
  const keys = d.keys.filter(k => rows.some(i => P.schedule.items[i].k === k));
  return { ...d, rows, keys };
}
/* la hoja de ref: su jornada (d; la de una hoja libre no tiene filas; de: sin lo quitado), su número, la fecha que sale
   (own: la escrita solo en esta hoja; plan: la del plan) */
function callSheet(ref, cd) {
  cd = cd || callDays();
  if (callIsFree(ref)) {
    const f = callFreeOf(ref); if (!f) return null;
    const d = { id: f.id, keys: [], rows: [], brk: {}, free: true };
    return { ref, free: f, n: -1, d, de: d, total: cd.days.length, date: feDate(peekDay(f.id).date), plan: null, own: false };
  }
  const d = cd.days[ref]; if (!d) return null;
  const own = feDate(peekDay(d.id).date);
  return { ref, free: null, n: ref, d, de: callDayEff(d), total: cd.days.length, date: own || cd.dates[ref] || null, plan: cd.dates[ref] || null, own: !!own };
}
/* el nombre de la hoja: «Jornada 2 de 8» o el de la hoja libre */
const callSheetName = S => S.free ? (S.free.name || '').trim() || 'Hoja libre' : `Jornada ${S.n + 1} de ${S.total}`;
/* filas del cronograma: escenas y eventos de la jornada, con hora de inicio y de fin */
function callRows(d) {
  const items = d.rows.map(i => P.schedule.items[i]);
  // una sola hora por fila: la escrita en la hoja (o en el plan); si falta, la que sigue del llamado y los tiempos
  const at = peekDay(d.id).at, T = planDayTimes(d, at, peekDay(d.id).dur);
  const tOf = j => { const it = items[j], own = (at && at[itemKey(it)]) || it.t; if (own) return own; const x = T.get(d.rows[j]); return x && x.start != null ? minToHm(x.start) : ''; };
  return items.map((it, j) => {
    const end = '';
    const t0 = tOf(j);
    if (it.e) return { ev: true, it, name: it.name || 'Evento', t: t0, end, det: it.det || '' };
    const s = sceneOfKey(it.k);
    const props = [...D.sem[s.idx]].map(id => P.elements[id]).filter(e => e && ['props', 'setdress', 'weapons', 'vehicles', 'animals', 'sfx'].includes(e.cat)).map(e => e.name);
    return { ev: false, it, s, code: rowCode(it), ie: `${s.ie}${s.dn === 'N' ? ' · N' : ' · D'}`, loc: planLoc(it, s) || titleCase(s.locBase), t: t0, end, pages: fmtEighths(partEighths(it)), cast: castText(s), fig: it.fig, desc: [synopsisOf(s), props.length ? 'Utilería y arte: ' + props.join(', ') : ''].filter(Boolean).join(' · ') };
  });
}
function callDefaults(d) {
  if (d.free) return { crewCall: '', lunch: '' };   // (lote AH) una hoja libre: todo a mano
  const items = d.rows.map(i => P.schedule.items[i]);
  const ev = re => (items.find(x => x.e && re.test(x.name || '') && x.t) || {}).t || '';
  return { crewCall: ev(/llamado/i) || P.schedule.call || '', lunch: ev(/almuerzo/i) };
}
/* reparto de la jornada: personajes de sus escenas, con las escenas de cada uno */
function callCast(d) {
  const map = new Map();
  for (const k of d.keys) { const s = sceneOfKey(k); if (!s) continue; for (const e of sceneCast(s.idx)) { if (!map.has(e.id)) map.set(e.id, []); map.get(e.id).push(k); } }
  return [...map].map(([id, sc]) => ({ el: P.elements[id], sc })).sort((a, b) => (D.castNum[a.el.id] || 99) - (D.castNum[b.el.id] || 99));
}
function callLocs(d) {
  const seen = new Map();
  for (const i of d.rows) { const it = P.schedule.items[i]; if (!it.k) continue; const s = sceneOfKey(it.k); const n = planLoc(it, s) || titleCase(s.locBase); if (!seen.has(n)) seen.set(n, ((P.schedule.locs || []).find(l => l.name === n) || {}).addr || ''); }
  return [...seen];
}
/* (lote AH) la locación de la cabecera: su nombre y su dirección (las del plan o, si se escribieron en esta hoja, esas) */
function callLoc(de, dd) {
  const locs = callLocs(de), L = dd.loc || {}, m = dd.meet || {};
  const pName = locs.map(x => x[0]).join(' · '), pAddr = (locs[0] && locs[0][1]) || '';
  const name = (L.name || '').trim() || pName, addr = (L.addr || '').trim() || pAddr;
  return { locs, name, addr, pName, pAddr, url: mapLink(m, [[name, addr || (m.addr || '').trim()]]) };
}
/* ---------- lista para enviar ----------
   Lo que la hoja de una jornada necesita antes de salir: si falta, el PDF lo imprime como «Por confirmar» y se descubre en el set.
   Cada falta dice dónde se completa (sel: el campo de esta hoja; tab: otra pestaña). (lote AH) ref: la jornada o la hoja
   libre; la fecha se completa en la hoja (también la del plan: «Correr esta jornada…») */
function callMissing(ref) {
  const cd = callDays(), S = callSheet(ref, cd); if (!S) return [];
  const d = S.de, C = CALL(), dd = peekDay(d.id), def = callDefaults(d), out = [];
  if (!S.date) out.push({ k: 'date', txt: 'la fecha', sel: '.cl-dateb' });
  if (!(dd.crewCall || def.crewCall)) out.push({ k: 'call', txt: 'el llamado general', sel: '[data-bind="cs-day"][data-f="crewCall"]' });
  const m = dd.meet || {}, L = callLoc(d, dd);
  if (!(m.addr || '').trim() && !L.addr) out.push({ k: 'meet', txt: 'la dirección de la locación', sel: '.cl-laddr' });
  if (!((dd.hosp || {}).name || C.hospital.name || '').trim()) out.push({ k: 'hosp', txt: 'el centro de salud', sel: '[data-bind="cs-hosp"][data-f="name"]' });
  const noActor = callTalentRows(d, dd).filter(r => !r.free && !r.actor);
  if (noActor.length) out.push({ k: 'cast', txt: noActor.length === 1 ? 'quién hace a' : `quién hace a ${noActor.length} personajes`, name: noActor.length === 1 ? noActor[0].role : '', sel: `[data-bind="cs-tal"][data-id="${CSS.escape(noActor[0].el.id)}"][data-f="actor"]` });
  if (!C.crew.some(c => (c.name || '').trim() && !(dd.out || {})[c.id]) && !(dd.xcrew || []).some(x => (x.name || '').trim())) out.push({ k: 'crew', txt: 'el equipo', sel: '.cl-crew', hint: 'Nadie del equipo tiene nombre todavía.' });
  return out;
}
/* versiones: cada jornada guarda la última hoja que salió (dd.exp = { v, t, sig, sv }). La firma resume lo que se imprime
   (los mismos datos del Excel): si después cambia el plan, el equipo o la jornada, la hoja enviada quedó vieja */
/* (lote AB) la sinopsis tal como la tomaba la huella antes: hasta el lote W, cortada a 110 sin juntar espacios ('w');
   en los lotes X a AA, cortada a 110 con los espacios juntos ('x'). Una hoja exportada entonces (sin exp.sv) sigue
   contando como la misma si nada cambió, sin un aviso de «quedó vieja» de más */
function synOld(s, mode) {
  if (mode === 'x') return synopsisOf(s);
  const m = P.scenes[s.key]; if (m && m.synopsis) return m.synopsis;
  for (let i = s.p0 + 1; i < s.p1; i++) if ((P.paras[i].t === 'a' || P.paras[i].t === 'v') && P.paras[i].x.trim()) {
    const t = P.paras[i].x.trim();
    return t.length > 110 ? t.slice(0, 107).replace(/\s+\S*$/, '') + '…' : t;
  }
  return '';
}
/* (lote X) la sinopsis de la hoja de llamado (pantalla, PDF, Excel y la huella): hasta unas dos líneas (240 letras),
   cortada al final de una oración */
const CALL_SYN = 240;
const callSyn = s => synopsisOf(s, CALL_SYN, true);
const CALL_SV = 2;   // la versión de la huella: con la sinopsis que sale impresa (CALL_SYN)
/* (lote AH) lo que la huella toma de cada jornada del avance: sus escenas, su reparto, su llamado y su fecha */
const callAdvSig = (A, mode) => A && [A.rows.map(r => [r.code, r.set, mode === 'w' ? synOld(r.s, 'w') : r.syn, r.dn, r.cast, r.e8]), A.cast];
function callSig(n, cd, mode) {
  // lo que sale impreso, con los datos crudos (no el texto ya formateado: el mismo en español y en inglés) y sin
  // calcular los lentes de la planta 3D (caro); cd: callDays() ya calculado. (lote AB) La sinopsis entra como sale
  // impresa (CALL_SYN); mode 'w' o 'x': la huella de antes (synOld), para las hojas exportadas sin exp.sv.
  // (lote AH) Una hoja libre tiene su propia huella; lo cambiado en la hoja (filas, planos, fecha…) entra con sus datos
  // (dd) y el avance elegido a mano, con lo de sus jornadas
  if (callIsFree(n)) return callSigFree(n, cd);
  const { days, dates } = cd || callDays(), d = days[n]; if (!d) return '';
  const C = CALL(), dd = peekDay(d.id), M = P.meta, next = days[n + 1];
  const T = planDayTimes(d, dd.at, dd.dur);
  const el = id => { const e = P.elements[id]; return e ? e.cat + ':' + e.name : id; };
  const rows = d.rows.map(i => {
    const it = P.schedule.items[i], x = T.get(i) || {};
    if (it.e) return ['e', it.name, it.det, it.t, x.start, x.dur, it.hl];
    const s2 = sceneOfKey(it.k); if (!s2) return ['?', it.k];
    return [it.k, it.sp, s2.heading, mode ? synOld(s2, mode) : callSyn(s2), it.t, x.start, x.dur, it.fig, planLoc(it, s2), it.hl, partEighths(it), [...D.sem[s2.idx]].map(el).sort(),
      (D.shotsBy[it.k] || []).map(sh => [D.code[sh.id], sh.size, sh.desc, sh.lens, sh.snd, sh.chars, sh.support, sh.angle, sh.move])];
  });
  const day = x => x ? x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate() : '';
  const cdd = { days, dates }, own = Array.isArray(dd.adv) ? callAdvIds(n, cdd) : null;
  return hash53(JSON.stringify([M.title, M.company, M.directors, M.producers, (M.projLogo || '').length, (M.logo || '').length, day(dates[n]), rows, d.brk && d.brk.t,
    Object.entries(dd).filter(([k]) => k !== 'exp'), callDefaults(d), C.hospital, C.client, C.crew, C.vendors, C.shotTimes, C.radio, P.schedule.locs, P.schedule.legend, D.castNum,
    callCast(d).map(({ el: e, sc }) => [e.id, e.name, sc, callTalent(e.id)]),
    next ? [next.keys, day(dates[n + 1]), peekDay(next.id).crewCall, callDefaults(next).crewCall, callLocs(next), callAdvSig(callAdvance(n, cdd), mode)] : null,
    ...(own ? [own.map(id => { const j = days.findIndex(x => x.id === id), A = callAdvDay(j, cdd); return [id, callAdvSig(A, mode), A && A.call, A && A.locs, day(A && A.date)]; })] : []),
    ...(next && peekDay(next.id).date ? [peekDay(next.id).date] : [])])).toString(36);
}
/* (lote AH) la huella de una hoja libre: lo suyo, el equipo del proyecto y las jornadas de su avance */
function callSigFree(id, cd) {
  const f = callFreeOf(id); if (!f) return '';
  cd = cd || callDays();
  const C = CALL(), dd = peekDay(id), M = P.meta, day = x => x ? x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate() : '';
  return hash53(JSON.stringify(['free', f.name, M.title, M.company, M.directors, M.producers, (M.projLogo || '').length, (M.logo || '').length, Object.entries(dd).filter(([k]) => k !== 'exp'),
    C.hospital, C.client, C.crew, C.radio, callAdvIds(id, cd).map(x => { const j = cd.days.findIndex(y => y.id === x), A = callAdvDay(j, cd); return [x, callAdvSig(A), A && A.call, A && A.locs, day(A && A.date)]; })])).toString(36);
}
/* la versión con que sale ahora: la misma si nada cambió; si cambió, la siguiente. Si quien exporta no puede editar la
   hoja (o saca solo algunas páginas), su archivo no queda registrado: lleva la última versión si es la misma hoja, o
   ninguna (para que no circulen dos «v2» distintas) */
/* ¿la hoja que salió (exp) es la de ahora? Con la huella de ahora o, si salió antes del lote AB (sin sv), con la de
   entonces */
function callSame(e, n, cd, sig) {
  if (!e || !e.sig) return false;
  if (e.sig === (sig || callSig(n, cd))) return true;
  if (callIsFree(n)) return false;
  return !e.sv && (e.sig === callSig(n, cd, 'x') || e.sig === callSig(n, cd, 'w'));
}
function callVer(n, cd, record = true) {
  const S = callSheet(n, cd); if (!S) return null;
  const e = peekDay(S.d.id).exp, sig = callSig(n, cd);
  if (callSame(e, n, cd, sig)) return { v: e.v, t: e.t, sig: e.sig, sv: e.sv, same: true };
  if (!record || !callEditable()) return null;
  return { v: ((e && e.v) || 0) + 1, t: Date.now(), sig, same: false };
}
const callVerTxt = V => { if (!V) return ''; const d = new Date(V.t); return `v${V.v} · ${d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace(/\.$/, '')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
/* (lote AH) en el documento (PDF y Excel) solo el número de la versión, sin la fecha ni la hora en que salió */
const callVerNum = V => V ? `v${V.v}` : '';
/* después de exportar: cada jornada que salió guarda su versión (si quien exporta puede editar la hoja). No es un paso
   de «Deshacer»: deshacer no puede borrar que una hoja ya salió (y que se reuse su número) */
function callExported(list, vers) {
  if (!callEditable()) return;
  histCapture();   // lo que estaba por anotarse en el historial va antes, por su lado
  const cd = callDays(); let ch = false;
  list.forEach(n => { const S = callSheet(n, cd), V = vers && vers[n]; if (!S || !V || V.same) return; dayData(S.d.id).exp = { v: V.v, t: V.t, sig: V.sig, sv: CALL_SV }; ch = true; });
  if (ch) { changed('data'); histQuiet('call'); if (UI.tab === 'call') render(); }
}
/* si un cambio hecho en otra pestaña (el plan, el equipo, el desglose…) deja vieja una hoja que ya salió, se avisa una
   vez por versión, sin pisar el aviso de «Deshacer» que pueda estar a la vista */
const CALL_STALE_SEEN = new Set(); let CALL_STALE_T = 0;
function callStaleSoon() {
  if (typeof P === 'undefined' || !P || !P.call || !P.call.days || UI.tab === 'call') return;
  if (!Object.values(P.call.days).some(d => d && d.exp)) return;
  clearTimeout(CALL_STALE_T);
  const check = (tries = 0) => {
    if (!P || UI.tab === 'call' || (typeof canSeeTab === 'function' && !canSeeTab('call'))) return;
    if ($('.toast') && tries < 12) { CALL_STALE_T = setTimeout(() => check(tries + 1), 1000); return; }
    const cd = callDays(), { days } = cd;
    const st = days.map((d, i) => ({ d, i, e: peekDay(d.id).exp })).filter(x => x.e && x.e.sig && !CALL_STALE_SEEN.has(x.d.id + ':' + x.e.v) && !callSame(x.e, x.i, cd));
    if (!st.length) return;
    st.forEach(x => CALL_STALE_SEEN.add(x.d.id + ':' + x.e.v));
    toast(st.length === 1 ? `Con este cambio, la hoja de llamado de la jornada ${st[0].i + 1} que exportaste (v${st[0].e.v}) quedó vieja.` : `Con este cambio, ${st.length} hojas de llamado que exportaste quedaron viejas.`,
      9000, { label: 'Ver la hoja', fn: () => { UI.callDay = st[0].i; UI.callFree = null; setTab('call'); } }).classList.add('t-stale');
  };
  CALL_STALE_T = setTimeout(() => typeof requestIdleCallback === 'function' ? requestIdleCallback(() => check(), { timeout: 3000 }) : check(), 2000);
}
/* (lote AH) los planos quitados en alguna hoja de llamado: { plano: [números de jornada] }, para su etiqueta en el
   storyboard y el guion técnico (tab-board.js, pdf.js). Cuenta el plano que está en la hoja (su escena es de esa
   jornada, como en callSched) y se quitó él o la fila de su escena. Volver a ponerlo en la hoja quita la etiqueta */
function callShotCuts() {
  const out = {}; if (typeof P === 'undefined' || !P || !P.call || !P.call.days || !D.sc.scenes.length) return out;
  scheduleDays(P, D.sc).days.forEach((d, n) => {
    const dd = P.call.days[d.id]; if (!dd || !(dd.shx || dd.rx)) return;
    const seen = new Set();
    for (const i of d.rows) {
      const it = P.schedule.items[i]; if (!it || !it.k) continue;
      const first = !seen.has(it.k); seen.add(it.k); if (!first || it.sp) continue;
      const rowGone = !!(dd.rx || {})[itemKey(it)];
      for (const sh of D.shotsBy[it.k] || []) if (rowGone || (dd.shx || {})[sh.id]) (out[sh.id] = out[sh.id] || []).push(n + 1);
    }
  });
  return out;
}
const callCutLabel = ns => !ns || !ns.length ? '' : 'Eliminado en la hoja de llamado · ' + (ns.length === 1 ? `Jornada ${ns[0]}` : `Jornadas ${ns.slice(0, -1).join(', ')} y ${ns[ns.length - 1]}`);
/* el estado de la hoja: faltas, si ya salió y si quedó vieja */
function callState(n) {
  const S = callSheet(n); if (!S) return null;
  const e = peekDay(S.d.id).exp, miss = callMissing(n);
  const stale = !!(e && e.sig && !callSame(e, n));
  return { miss, e, stale };
}
/* ---------- datos de cada jornada que agregó la 1.2 ----------
   dd.motor (listos motor), dd.dcall {área: hora}, dd.cast[personaje] {pu, call, ves, mq, ready, obs},
   dd.shotAt {plano: minutos desde el inicio de su escena} (la hora escrita de un plano en el cronograma),
   dd.meet {addr, note, links: [url], ph: [{id, w, h}]} (fotos en FRAMES['cl~<jornada>~<foto>']),
   dd.mov [{id, name, driver, pax: [persona]}]; persona = 'c:<id del equipo>' o 'a:<id del personaje>'.
   (lote AH) dd.date (la fecha solo en esta hoja), dd.cierre (cierre de set), dd.rov {fila: {campo: texto}} y dd.sov
   {plano: {campo: texto}} (lo cambiado sobre el stripboard), dd.rx / dd.shx / dd.castx {clave: 1} (lo quitado de la
   hoja), dd.xrows / dd.xsh / dd.xcast / dd.xcrew (filas libres), dd.adv [jornada] (el avance), dd.loc {name, addr},
   dd.props (la utilería especial escrita a mano), dd.cobs {persona: observaciones}; P.call.free [{ id, name }] */
function callNormalize(Px) {
  const C = Px.call; if (!C || typeof C !== 'object') return;
  // (lote AH) los campos de cada fila libre (texto)
  const CL_XF = { xrows: ['t', 'code', 'ie', 'set', 'syn', 'cast', 'dn', 'pages'], xsh: ['in', 't', 'code', 'desc', 'act', 'lens', 'snd', 'cast'],
    xcast: ['actor', 'role', 'pu', 'call', 'ves', 'mq', 'ready', 'phone', 'email', 'obs'], xcrew: ['dept', 'name', 'role', 'call', 'phone', 'email', 'obs'] };
  // (lote U) los canales de radio: una línea por proyecto («1 Producción, 2 Libre, 3 Transporte…»)
  if (C.radio != null && (typeof C.radio !== 'string' || !C.radio.trim())) delete C.radio;
  else if (C.radio) C.radio = C.radio.replace(/[\u0000-\u001f]+/g, ' ').slice(0, 300);
  // (lote AH) las hojas libres y quién es jefe de su área
  if (C.free != null) { C.free = Array.isArray(C.free) ? C.free.filter(f => f && typeof f.id === 'string' && /^f[\w-]{1,40}$/.test(f.id)).map(f => ({ id: f.id, name: typeof f.name === 'string' ? f.name.replace(/[\u0000-\u001f]+/g, ' ').slice(0, 80) : '' })) : []; if (!C.free.length) delete C.free; }
  if (Array.isArray(C.crew)) for (const c of C.crew) if (c && c.head != null && typeof c.head !== 'boolean') delete c.head;
  if (!C.days || typeof C.days !== 'object') return;
  const str = v => typeof v === 'string', obj = v => v && typeof v === 'object' && !Array.isArray(v);
  for (const dd of Object.values(C.days)) {
    if (!dd || typeof dd !== 'object') continue;
    if (dd.meet != null && (typeof dd.meet !== 'object' || Array.isArray(dd.meet))) delete dd.meet;
    if (dd.meet) {
      dd.meet.links = Array.isArray(dd.meet.links) ? dd.meet.links.filter(str).slice(0, 12) : [];
      dd.meet.ph = Array.isArray(dd.meet.ph) ? dd.meet.ph.filter(p => p && str(p.id)) : [];
      for (const f of ['addr', 'note']) if (dd.meet[f] != null && !str(dd.meet[f])) delete dd.meet[f];
    }
    if (dd.mov != null && !Array.isArray(dd.mov)) delete dd.mov;
    if (dd.mov) dd.mov = dd.mov.filter(v => v && str(v.id)).map(v => ({ id: v.id, name: str(v.name) ? v.name : '', driver: str(v.driver) ? v.driver : '', pax: Array.isArray(v.pax) ? v.pax.filter(str) : [] }));
    if (dd.dcall != null && (typeof dd.dcall !== 'object' || Array.isArray(dd.dcall))) delete dd.dcall;
    if (dd.shotAt != null && (typeof dd.shotAt !== 'object' || Array.isArray(dd.shotAt))) delete dd.shotAt;
    if (dd.shotAt) { for (const [k, v] of Object.entries(dd.shotAt)) if (typeof v !== 'number' || !isFinite(v) || v < 0) delete dd.shotAt[k]; if (!Object.keys(dd.shotAt).length) delete dd.shotAt; }
    // (lote U) el largo de una escena en esta hoja (minutos), cuando la hora de un plano la alargó
    if (dd.dur != null && (typeof dd.dur !== 'object' || Array.isArray(dd.dur))) delete dd.dur;
    if (dd.dur) { for (const [k, v] of Object.entries(dd.dur)) if (typeof v !== 'number' || !isFinite(v) || v < 1 || v > 1440) delete dd.dur[k]; if (!Object.keys(dd.dur).length) delete dd.dur; }
    // (lote AH) la fecha solo en esta hoja, el cierre de set y la utilería especial escrita a mano
    if (dd.date != null && !(str(dd.date) && /^\d{4}-\d{2}-\d{2}$/.test(dd.date))) delete dd.date;
    for (const f of ['cierre', 'props']) if (dd[f] != null && !str(dd[f])) delete dd[f];
    if (dd.props) dd.props = dd.props.slice(0, 2000);
    // lo cambiado sobre el stripboard: {fila o plano: {campo: texto}}
    for (const k of ['rov', 'sov']) {
      if (dd[k] != null && !obj(dd[k])) delete dd[k];
      if (!dd[k]) continue;
      for (const [id, o] of Object.entries(dd[k])) {
        if (!obj(o)) { delete dd[k][id]; continue; }
        for (const [f, v] of Object.entries(o)) if (!str(v)) delete o[f]; else o[f] = v.slice(0, 2000);
        if (!Object.keys(o).length) delete dd[k][id];
      }
      if (!Object.keys(dd[k]).length) delete dd[k];
    }
    // lo quitado de la hoja: {clave: 1}
    for (const k of ['rx', 'shx', 'castx']) {
      if (dd[k] != null && !obj(dd[k])) delete dd[k];
      if (!dd[k]) continue;
      for (const [id, v] of Object.entries(dd[k])) if (v) dd[k][id] = 1; else delete dd[k][id];
      if (!Object.keys(dd[k]).length) delete dd[k];
    }
    // las filas libres: su id, dónde van (at: la fila de al lado; up: arriba de ella) y sus campos (texto)
    for (const [k, fs] of Object.entries(CL_XF)) {
      if (dd[k] != null && !Array.isArray(dd[k])) delete dd[k];
      if (!dd[k]) continue;
      dd[k] = dd[k].filter(x => x && str(x.id)).map(x => {
        const o = { id: x.id.slice(0, 60), at: str(x.at) ? x.at.slice(0, 200) : '' };
        if (x.up === true) o.up = true;
        if (k === 'xcrew' && typeof x.head === 'boolean') o.head = x.head;
        for (const f of fs) if (str(x[f]) && x[f]) o[f] = x[f].slice(0, 2000);
        return o;
      });
      if (!dd[k].length) delete dd[k];
    }
    // el avance elegido a mano (las jornadas, por su id) y la locación y las observaciones escritas en la hoja
    if (dd.adv != null) { if (Array.isArray(dd.adv)) dd.adv = dd.adv.filter(str).slice(0, 60); else delete dd.adv; }
    if (dd.loc != null && !obj(dd.loc)) delete dd.loc;
    if (dd.loc) { for (const f of Object.keys(dd.loc)) if (!['name', 'addr'].includes(f) || !str(dd.loc[f]) || !dd.loc[f].trim()) delete dd.loc[f]; if (!Object.keys(dd.loc).length) delete dd.loc; }
    if (dd.cobs != null && !obj(dd.cobs)) delete dd.cobs;
    if (dd.cobs) { for (const [id, v] of Object.entries(dd.cobs)) if (!str(v) || !v.trim()) delete dd.cobs[id]; if (!Object.keys(dd.cobs).length) delete dd.cobs; }
  }
}
const clPhKey = (dayId, pid) => `cl~${dayId}~${pid}`;
const SND_OPTS = [['', '—'], ['si', 'Sí'], ['amb', 'Ambiente'], ['no', 'No (MOS)']];
const SND_NAME = { si: 'Sí', amb: 'Amb.', no: 'MOS' };
/* el plano en la hoja de llamado: descripción (tamaño, soporte, ángulo, movimiento), acción, lente, sonido y personajes */
function shotCallInfo(sh) {
  const els = (sh.chars || []).map(id => P.elements[id]).filter(Boolean);
  // (lote W) la descripción técnica: tamaño · soporte · ángulo · movimiento; quién sale va en «Personajes» (el reparto con
  // su número; los demás, por su nombre)
  const det = [sh.support || '', sh.angle && sh.angle !== 'Normal' ? sh.angle : 'Ángulo normal', sh.move && sh.move !== 'Fijo' ? sh.move : ''].filter(Boolean);
  const desc = [sh.size || '', ...det];
  let lens = '';
  if (sh.lens) lens = String(sh.lens).replace(/\s*mm$/i, '') + ' mm';
  else if (sh.ws !== '2d' && typeof s3Of === 'function') { try { lens = Math.round(s3Of(sh).keys[0].cam.lens) + ' mm'; } catch (e) { lens = ''; } }
  const cast = els.map(e => (e.cat === 'cast' && D.castNum[e.id]) || titleCase(e.name));
  return { code: D.code[sh.id] || '', size: sh.size || '', det, desc, act: sh.desc || shotTextExcerpt(sh, 90), lens, snd: SND_NAME[sh.snd] || '', cast };
}
/* la hora de cada plano dentro de su escena, en minutos desde el inicio de la escena. Los planos con hora escrita
   (dd.shotAt[plano], minutos desde el inicio de su escena: si la escena se mueve en el plan, sus planos van con ella)
   quedan fijos; los demás se reparten parejo entre el fijo anterior (o el inicio) y el siguiente (o el fin).
   lo/hi: entre qué horas puede ir cada plano (dentro de la escena y en el orden de los planos) */
function shotOffsets(shots, dur, at) {
  const n = shots.length, fix = shots.map(sh => { const v = at && at[sh.id]; return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(Math.max(0, dur - 1), v)) : null; });
  let m = 0; fix.forEach((v, i) => { if (v != null) { if (v < m) fix[i] = m; m = fix[i]; } });   // en orden aunque la escena se haya acortado
  const left = i => { for (let j = i - 1; j >= 0; j--) if (fix[j] != null) return [j, fix[j]]; return [0, 0]; };
  const right = i => { for (let j = i + 1; j < n; j++) if (fix[j] != null) return [j, fix[j]]; return [n, dur]; };
  const end = Math.max(0, dur - 1);   // un plano no empieza cuando la escena ya terminó
  const pos = fix.map((v, i) => {
    if (v != null) return v; if (i === 0) return 0;
    const [li, lv] = left(i), [ri, rv] = right(i);
    return lv + (rv - lv) * (i - li) / (ri - li);
  });
  return { pos, fix, lo: shots.map((_, i) => i ? left(i)[1] : 0), hi: shots.map((_, i) => { const [j, v] = right(i); return j === n ? end : v; }) };
}
/* (lote U) la hora escrita de un plano, sin límite de escena. Si la hora cabe entre el plano fijo anterior y el siguiente,
   queda como siempre. Si no: los planos fijos que estorban se corren lo mismo (el orden de los planos no cambia) y la
   escena se alarga o se corre para que quepa: hacia atrás, el comienzo se adelanta lo necesario (conserva el tiempo de
   los planos de antes); hacia adelante, el fin se atrasa (conserva el tiempo de los planos de después). El primer plano
   es el comienzo de la escena: cambiarlo corre la escena entera.
   o = { start, dur (minutos), pos: [minutos desde el inicio de cada plano], fix: [minutos o null], i: el plano, m: la hora
   (minutos, 0 a 1439) }. Devuelve { start, dur, fix: [minutos desde el nuevo inicio o null] } */
function shotRetime(o) {
  const { start, dur, pos, i } = o, n = pos.length;
  let off = o.m - (((start % 1440) + 1440) % 1440); if (off < -720) off += 1440; else if (off > 720) off -= 1440;   // jornadas que pasan la medianoche
  const A = start + off, abs = pos.map(p => start + p), F = o.fix.map(v => v == null ? null : start + v);
  const delta = A - abs[i], E = start + dur;
  if (i === 0) {   // el primer plano: la escena entera se corre (los demás conservan su lugar dentro de ella)
    const fx = o.fix.slice(); fx[0] = null;
    return { start: A, dur, fix: fx };
  }
  const prevF = () => { for (let j = i - 1; j > 0; j--) if (F[j] != null) return F[j]; return start; };
  const nextF = () => { for (let j = i + 1; j < n; j++) if (F[j] != null) return F[j]; return E - 1; };
  F[i] = A;
  if (A >= prevF() && A <= nextF()) return { start, dur, fix: F.map(v => v == null ? null : v - start) };
  let S = start, E2 = E;
  if (delta > 0) {
    // los fijos de después que estorban se corren lo mismo
    let prev = A;
    for (let j = i + 1; j < n; j++) if (F[j] != null) { if (F[j] <= prev) F[j] += delta; prev = F[j]; }
    let L = i; for (let j = n - 1; j > i; j--) if (F[j] != null) { L = j; break; }
    if (E - F[L] < n - L) E2 = F[L] + (E - abs[L]);   // los planos de después conservan su tiempo
  } else {
    let nxt = A;
    for (let j = i - 1; j > 0; j--) if (F[j] != null) { if (F[j] >= nxt) F[j] += delta; nxt = F[j]; }
    let f = i; for (let j = 1; j < i; j++) if (F[j] != null) { f = j; break; }
    if (F[f] - start < f) S = F[f] - (abs[f] - start);   // los planos de antes conservan su tiempo
  }
  return { start: S, dur: E2 - S, fix: F.map(v => v == null ? null : v - S) };
}
/* el cronograma de la hoja: escenas (con sus planos si el storyboard los tiene) y eventos, con sus horas.
   Las horas de las escenas son las del plan (escritas o estimadas); cada plano toma una parte igual de su escena,
   salvo los que tienen su hora escrita en la hoja (shotOffsets) */
/* (lote AC) el color de una escena en la hoja, una sola vez: el de su resaltado o el de su tira (como en el plan de
   rodaje); strip dice cuál ('hl' o la tira). Lo usan la pantalla, el PDF y el Excel */
const callRowColor = (it, s) => { const hc = hlc(it); return { col: hc || stripColor(s), strip: hc ? 'hl' : stripKey(s) }; };
/* ---------- (lote AH) la hoja cambia lo del stripboard sin tocarlo ----------
   Lo que llega del stripboard (por escena: hora, número, I/E, encabezado, sinopsis, reparto, D/N y páginas; por plano:
   descripción, acción, lente, sonido y personajes) se puede cambiar en la hoja: queda en dd.rov / dd.sov de esa hoja y
   nada más (ni el plan, ni el desglose, ni el storyboard cambian). clOv junta las dos cosas: v (lo que sale), b (lo del
   stripboard) y ov (los campos cambiados) */
function clOv(base, ov) {
  const v = { ...base }, on = {};
  if (ov) for (const [f, x] of Object.entries(ov)) if (f in base && typeof x === 'string') { v[f] = x; on[f] = true; }
  return { v, b: base, ov: on };
}
/* lo del stripboard en el idioma de la pantalla (en inglés, «Día» es «Day»): así se escribe encima y así se compara */
const clTr = t => EN && typeof tr === 'function' && t ? tr(t) : t;
/* las filas libres entre las de siempre: cada una va al lado de la fila con que se agregó (x.at; x.up: arriba de ella;
   '' es el comienzo). base y free: [{ k, … }] (free con su x); las que perdieron su fila van al final */
function clPlace(base, free) {
  const out = base.slice(); let left = free.slice(), prog = true;
  while (left.length && prog) {
    prog = false;
    left = left.filter(r => {
      const a = r.x.at || '', i = a ? out.findIndex(o => o.k === a) : -1;
      if (a && i < 0) return true;
      out.splice(r.x.up || !a ? Math.max(0, i) : i + 1, 0, r); prog = true; return false;
    });
  }
  return out.concat(left);
}
/* el cronograma de la hoja (lote AH): las filas del plan sin las quitadas, con lo cambiado en la hoja y las filas libres
   en su lugar; cada escena con sus planos (sin los quitados) y los planos libres. rows: hasta la última escena; close:
   lo que sigue (desmontaje, regreso…). gone: las filas y los planos quitados de esta hoja */
function callSched(d) {
  const dd = peekDay(d.id), de = d.free ? d : callDayEff(d, dd), T = planDayTimes(de, dd.at, dd.dur);
  const base = callRows(de), seen = new Set(), shx = dd.shx || {}, xsh = dd.xsh || [], gone = [];
  const hm = m => m == null ? '' : minToHm(((m % 1440) + 1440) % 1440);
  const rows = base.map((r, j) => {
    const it = P.schedule.items[de.rows[j]], x = T.get(de.rows[j]) || {}, key = itemKey(it), est = !((dd.at || {})[key] || it.t);
    const o = { ...r, key, k: 'r:' + key, start: x.start, dur: x.dur, est, t0: hm(x.start), t1: '' };
    const R = (dd.rov || {})[key];
    if (r.ev) return Object.assign(o, clOv({ name: r.name, det: r.det }, R));
    Object.assign(o, clOv({ code: r.code, ie: ieLab(r.s), set: setOf(r.s), syn: callSyn(r.s) || '', cast: castLine(r.s) + (r.fig ? ` · Fig. ${r.fig}` : ''), dn: DN_LAB[stripDN(r.s)], pages: r.pages }, R));
    const first = !seen.has(r.it.k); seen.add(r.it.k);
    const all = first && !r.it.sp ? (D.shotsBy[r.it.k] || []) : [], shots = all.filter(sh => !shx[sh.id]);
    for (const sh of all) if (shx[sh.id]) gone.push({ k: 's:' + sh.id, lab: `Plano ${D.code[sh.id] || ''}`.trim() });
    const P0 = x.start != null && x.dur ? shotOffsets(shots, x.dur, dd.shotAt) : null;
    const list = shots.map((sh, i) => {
      const a = P0 ? x.start + P0.pos[i] : null, b = P0 ? x.start + (i + 1 < shots.length ? P0.pos[i + 1] : x.dur) : null, I = shotCallInfo(sh);
      return { sh, ...I, k: 's:' + sh.id, t0: hm(a == null ? null : Math.round(a)), t1: hm(b == null ? null : Math.round(b)),
        fixed: !!(P0 && P0.fix[i] != null), a0: P0 ? P0.lo[i] : 0, b0: P0 ? P0.hi[i] : 0, lo: P0 ? hm(x.start + P0.lo[i]) : '', hi: P0 ? hm(x.start + P0.hi[i]) : '',
        ...clOv({ desc: I.desc.filter(Boolean).join(' · '), act: I.act || '', lens: I.lens, snd: sh.snd || '', cast: I.cast.join(', ') }, (dd.sov || {})[sh.id]) };
    });
    const fx = xsh.filter(f => f.in === o.k).map(f => ({ free: true, x: f, k: 'xs:' + f.id, code: f.code || '', t0: f.t || '', fixed: true, v: { desc: f.desc || '', act: f.act || '', lens: f.lens || '', snd: f.snd || '', cast: f.cast || '' }, b: {}, ov: {} }));
    o.shots = clPlace(list, fx);
    if (P0) Object.assign(o, { sStart: x.start, sDur: x.dur });
    o.set = titleCase(r.s.locBase || '');
    Object.assign(o, callRowColor(r.it, r.s));
    o.props = r.desc && r.desc.includes('Utilería y arte: ') ? r.desc.slice(r.desc.indexOf('Utilería y arte: ') + 17) : '';
    return o;
  });
  // las filas quitadas de esta hoja (para volver a ponerlas)
  if (!d.free) for (const i of d.rows) { const it = P.schedule.items[i], k = itemKey(it); if ((dd.rx || {})[k]) gone.unshift({ k: 'r:' + k, lab: it.e ? it.name || 'Evento' : `Esc. ${rowCode(it)}` }); }
  // las filas libres, al lado de la fila con que se agregaron
  const xr = (dd.xrows || []).map(f => ({ ev: false, free: true, x: f, key: 'x:' + f.id, k: 'x:' + f.id, t0: f.t || '', t: f.t || '', shots: [], col: '', strip: '',
    v: { code: f.code || '', ie: f.ie || '', set: f.set || '', syn: f.syn || '', cast: f.cast || '', dn: f.dn || '', pages: f.pages || '' }, b: {}, ov: {} }));
  const full = clPlace(rows, xr);
  // el cierre: los eventos después de la última escena (desmontaje, regreso…) y el fin de la jornada (el wrap)
  let last = -1; full.forEach((r, j) => { if (!r.ev) last = j; });
  const endAuto = d.free ? '' : d.brk.t || (T.end != null && de.rows.length ? hm(T.end) : '');
  // (lote AH) el cierre de set: cuando termina la última escena (lo que sigue es desmontaje y regreso)
  const lastSc = [...rows].reverse().find(r => !r.ev), cierreAuto = lastSc && lastSc.start != null && lastSc.dur ? hm(lastSc.start + lastSc.dur) : '';
  return { rows: last < 0 ? full : full.slice(0, last + 1), close: last < 0 ? [] : full.slice(last + 1), end: dd.end || endAuto, endAuto, cierre: dd.cierre || cierreAuto, cierreAuto,
    byShot: full.some(r => r.shots && r.shots.length), motor: (rows.find(r => !r.ev) || {}).t0 || '', gone };
}
/* (lote AH) cuántos cambios tiene la hoja sobre el stripboard (campos cambiados, filas y planos quitados o agregados,
   horas escritas), para «Volver a la guía del stripboard» */
const CL_GUIDE = ['rov', 'sov', 'rx', 'shx', 'xrows', 'xsh', 'at', 'dur', 'shotAt', 'castx', 'props', 'loc'];
function callChanges(dd) {
  let n = 0;
  for (const k of ['rov', 'sov']) for (const o of Object.values(dd[k] || {})) n += Object.keys(o).length;
  for (const k of ['rx', 'shx', 'castx', 'at', 'shotAt', 'loc']) n += Object.keys(dd[k] || {}).length;
  return n + (dd.xrows || []).length + (dd.xsh || []).length + (dd.props != null ? 1 : 0);
}
/* (lote AH) el reparto de la hoja: el de sus escenas (sin los quitados), con sus horarios de esta jornada, y las filas
   libres en su lugar */
function callTalentRows(de, dd) {
  const x = dd.castx || {};
  const base = callCast(de).filter(({ el }) => !x[el.id]).map(({ el, sc }) => {
    const T = callTalent(el.id), Z = (dd.cast || {})[el.id] || {};
    return { k: 'a:' + el.id, el, sc, actor: (T.actor || '').trim(), role: titleCase(el.name), num: D.castNum[el.id] || '', pu: Z.pu || '', call: Z.call || '', ves: Z.ves || '', mq: Z.mq || '', ready: Z.ready || '', obs: Z.obs || '', phone: T.phone || '', email: T.email || '' };
  });
  const free = (dd.xcast || []).map(f => ({ k: 'xa:' + f.id, x: f, free: true, sc: [], num: '', actor: (f.actor || '').trim(), role: f.role || '', pu: f.pu || '', call: f.call || '', ves: f.ves || '', mq: f.mq || '', ready: f.ready || '', obs: f.obs || '', phone: f.phone || '', email: f.email || '' }));
  return clPlace(base, free);
}
/* (lote AH) el equipo de la hoja por área: [área, nombre, filas, citación]. El directorio del proyecto (sin los que no
   vienen; show: los recién agregados aún sin nombre) y las filas libres de esta hoja en su lugar */
const callDepts = () => [...CS_DEPTS, ...(typeof TEAM_EXTRA !== 'undefined' ? TEAM_EXTRA : [])];
function callCrewRows(dd, call, show) {
  const C = CALL(), out = dd.out || {};
  return callDepts().map(([dept, name]) => {
    const base = C.crew.filter(c => c.dept === dept && !out[c.id] && ((c.name || '').trim() || (show && show.has(c.id)))).map(c => ({ k: 'c:' + c.id, c, name: (c.name || '').trim(), role: c.role || '', call: (dd.crew || {})[c.id] || '', phone: c.phone || '', email: c.email || '', obs: (dd.cobs || {})[c.id] || '', head: c.head }));
    const free = (dd.xcrew || []).filter(f => (f.dept || 'other') === dept || (dept === 'other' && !callDepts().some(([k]) => k === f.dept))).map(f => ({ k: 'xc:' + f.id, x: f, free: true, name: (f.name || '').trim(), role: f.role || '', call: f.call || '', phone: f.phone || '', email: f.email || '', obs: f.obs || '', head: f.head }));
    return [dept, name, clPlace(base, free), deptCall(dd, dept, call)];
  });
}
/* lo que sale impreso de una persona del equipo: con nombre (o, si es una fila libre, con algo escrito) */
const crewShown = r => r.name || (r.free && (r.role || r.phone || r.email));
/* personas que pueden ir en la movilidad: el equipo de la jornada (con nombre) y el reparto */
function callPeople(d, dd) {
  const crew = callCrewRows(dd, '').flatMap(([, , rows]) => rows).filter(r => r.name).map(r => ({ k: r.k, name: r.name, sub: r.role }));
  const cast = callTalentRows(d, dd).filter(r => r.actor || r.role).map(r => ({ k: r.k, name: r.actor || r.role, sub: r.actor ? r.role : 'Reparto' }));
  return [...crew, ...cast];
}
const callWho = (people, k) => people.find(p => p.k === k);
/* el conductor de un vehículo: un proveedor ('v:<id>', sigue si se le cambia el nombre), un nombre escrito ('t:<nombre>')
   o, de antes, alguien del equipo o del reparto ('c:'/'a:') */
function drvName(x, people) {
  const k = (x && x.driver) || ''; if (!k) return '';
  if (k.startsWith('v:')) { const v = CALL().vendors.find(o => o.id === k.slice(2)); return v ? (v.name || '').trim() : ''; }
  if (k.startsWith('t:')) return k.slice(2).trim();
  const p = callWho(people || [], k); return p ? p.name : '';
}
/* el área de cada persona del equipo: su hora (la del área, si no tiene propia; la del área, la general si no hay) */
const deptCall = (dd, dept, call) => (dd.dcall || {})[dept] || call;
/* teléfonos clave y jefes de equipo, del directorio */
const crewBy = (re, dd) => CALL().crew.filter(c => re.test(c.role || '') && (c.name || '').trim() && !(dd.out || {})[c.id]);
const mapsUrl = (m, locs) => { const l = (m.links || []).map(safeUrl).find(u => /google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(u)); const a = (m.addr || '').trim() || (locs[0] && locs[0][1]) || ''; return l || (a ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a) : ''); };
/* «Ver mapa»: el enlace cargado en el punto de encuentro (Google Maps o Waze); si no hay, la dirección */
const mapLink = (m, locs) => { const l = (m.links || []).map(safeUrl).filter(Boolean); return l.find(u => /google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(u)) || l.find(u => /waze\.com\//i.test(u)) || mapsUrl({ ...m, addr: '' }, locs) || mapsUrl(m, locs); };
const linkName = u => { try { const h = new URL(u).hostname.replace(/^www\./, ''); return /google\.|goo\.gl/.test(h) && /maps/.test(u) ? 'Google Maps' : /waze/.test(h) ? 'Waze' : h; } catch (e) { return 'Enlace'; } };
const imgOk = u => typeof u === 'string' && /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(u) && !/^data:image\/svg/i.test(u) ? u : '';
/* ---------- la hoja como la referencia (lote U), en cuadros (lote AH) ----------
   Una página que se lee de un vistazo, toda dentro de cuadros con líneas negras, como una planilla: arriba, la cabecera
   en tres columnas (la productora y su equipo clave con teléfono · el proyecto, la jornada, la fecha, el llamado general
   en grande con listos motor, almuerzo, cierre de set y wrap · el clima y la locación con su mapa); los jefes de área
   con su teléfono; la nota del 1.er asistente; el cronograma; el avance; los talentos y el equipo técnico, cada uno en
   su cuadro; y debajo lo demás: la utilería especial, el punto de encuentro, la movilidad, el centro de salud y los
   canales de radio. Sin encabezado ni pie de página */
const CL_ICO = {
  wx: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8.5" r="3"/><path d="M8.5 2.8v1.4M2.8 8.5h1.4M4.5 4.5l1 1M12.5 4.5l-1 1"/><path d="M9.5 19.5h8.6a3.2 3.2 0 0 0 .2-6.4 4.4 4.4 0 0 0-8.4 1 2.7 2.7 0 0 0-.4 5.4z"/></svg>',
  sun: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 16.5a6.5 6.5 0 0 1 13 0M3 16.5h18M12 4.5v3M5.9 8.9l1.6 1.6M18.1 8.9l-1.6 1.6M8 20h8"/></svg>',
  park: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M10 16.5v-9h3a2.6 2.6 0 0 1 0 5.2h-3"/></svg>',
  hosp: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8v8M8 12h8"/></svg>',
  radio: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="8" width="10" height="13" rx="2"/><path d="M10 8 8.5 3M10 12h4M10 15h4M10 18h2.5"/></svg>',
  phone: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/></svg>',
  move: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16V8.5A1.5 1.5 0 0 1 4.5 7H14v9M14 10h3.5l3.5 3.5V16h-7"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
};
/* el equipo clave de la cabecera: jefatura de producción, dirección y 1.er asistente de dirección, con su teléfono
   (del directorio; si falta, el nombre de Proyecto). (lote AH) k: su fila en el equipo (no se repite en los jefes de área) */
function callKeyCrew(dd) {
  const M = P.meta, one = re => crewBy(re, dd)[0] || null;
  const prods = (M.producers || []).filter(x => personName(x) && !/ejecutiv/i.test(x.role || ''));
  const jp = one(/jefatura de producci|jefe de producci/i) || one(/^producci[oó]n$/i), dir = one(/^direcci[oó]n$/i);
  const ad = one(/^(1\.?\s*er|primer) asistente de direcci/i) || one(/asistente de direcci/i);
  const it = (lab, c, alt) => ({ lab, k: c ? 'c:' + c.id : '', name: c ? c.name.trim() : alt || '', phone: c ? (c.phone || '').trim() : '', email: c ? (c.email || '').trim() : '' });
  return [it('Jefatura de producción', jp, prods.map(personName)[0]), it('Dirección', dir, (M.directors || []).map(personName).filter(Boolean)[0]), it('1.er asistente de dirección', ad)];
}
/* (lote W) lo demás que pedía «Equipo clave» antes de la hoja nueva: la producción (de Proyecto, si no es ya la jefatura
   de producción) y el cliente (Ajustes de la hoja, para publicidad). Solo si tienen nombre */
function callKeyMore(keyCrew) {
  const prods = (P.meta.producers || []).filter(x => personName(x) && !/ejecutiv/i.test(x.role || '')).map(personName);
  const jp = (keyCrew[0] || {}).name || '', pr = prods.filter(x => x !== jp).join(', ');
  return [pr ? { lab: 'Producción', name: pr, phone: '' } : null, (CALL().client || '').trim() ? { lab: 'Cliente', name: CALL().client.trim(), phone: '' } : null].filter(Boolean);
}
/* (lote AH) los jefes de área, con su teléfono, en un cuadro bajo la cabecera. En cada área, el jefe es quien se marcó
   como jefe (clic derecho en su fila: «Jefe de área»); si nadie, el primero con nombre cuyo cargo es el de jefe del área
   (dirección de fotografía, gaffer y key grip, maquillaje, diseño de vestuario, dirección de arte, sonidista…; en las
   demás áreas, un cargo de jefe, dirección, coordinación o supervisión). Quien ya sale en la cabecera (jefatura de
   producción, dirección, 1.er asistente) no se repite. head === false: se le quitó a mano */
const CL_HEAD = {
  prod: /jefatura de producci|jef[ae] de producci/i, dir: /^(1\.?\s*er|primer)a? asistente de direcci|^1st ad\b/i,
  cam: /direcci[oó]n de fotograf|director[a]? de fotograf|^(df|dp|dop)$|cinefot/i, ge: /gaffer|key grip|jef[ae] de (el[eé]ctric|maquinist|luces)/i,
  hmu: /^maquillaje( y peinado)?$|jef[ae] de maquillaje|diseñ\w* de maquillaje/i, ward: /diseñ\w* de vestuario|jef[ae] de vestuario|^vestuario$/i,
  art: /direcci[oó]n de arte|director[a]? de arte|diseñ\w* de producci/i, sound: /sonidista|sonido directo|jef[ae] de sonido/i,
};
const CL_HEAD_ANY = /\bjef[ae]\b|direcci[oó]n de|director[a]?\b|coordinaci[oó]n|coordinador[a]?|supervis/i;
const clIsHeadRole = (dept, role) => (CL_HEAD[dept] || CL_HEAD_ANY).test(role || '');
function callHeads(crewRows, keyCrew) {
  const skip = new Set(keyCrew.map(k => k.k).filter(Boolean)), out = [];
  for (const [dept, area, rows] of crewRows) {
    const named = rows.filter(r => r.name), marked = named.filter(r => r.head === true);
    const auto = named.filter(r => r.head !== false && clIsHeadRole(dept, r.role));
    for (const r of marked.length ? marked : auto.slice(0, dept === 'ge' ? 2 : 1)) if (!skip.has(r.k)) out.push({ k: r.k, dept, area, role: r.role || area, name: r.name, phone: r.phone, email: r.email });
  }
  return out;
}
/* ¿es jefe de su área? (para la marca en su fila y el menú) */
const callIsHead = (heads, r) => heads.some(h => h.k === r.k);
/* «Utilería especial»: la utilería, las armas y los efectos (categorías del desglose) de las escenas de la jornada */
const CL_PROPS = ['props', 'weapons', 'sfx'];
function callProps(d) {
  const out = [];
  for (const k of d.keys) {
    const s = sceneOfKey(k); if (!s) continue;
    for (const id of D.sem[s.idx]) { const e = P.elements[id]; if (e && CL_PROPS.includes(e.cat) && e.name && !out.includes(e.name)) out.push(e.name); }
  }
  return out;
}
/* (lote AH) la utilería especial como sale: la del desglose o la escrita en esta hoja */
const callPropsText = (de, dd) => dd.props != null ? dd.props.trim() : callProps(de).join(', ');
/* el reparto de una escena con su número: «Ana (1), Tito (2)» */
const castLine = s => sceneCast(s.idx).map(e => titleCase(e.name) + (D.castNum[e.id] ? ` (${D.castNum[e.id]})` : '')).join(', ');
/* el avance: una jornada del plan (aunque caiga después de días libres), con su llamado, sus locaciones y sus escenas.
   (lote AH) callAdvDay(j): la jornada j; callAdvance(n): la siguiente a n (null en la última, «Fin de rodaje») */
function callAdvDay(j, cd) {
  cd = cd || callDays(); const d = cd.days[j]; if (!d) return null;
  const S = callSheet(j, cd), de = S.de;
  const rows = de.rows.map(i => P.schedule.items[i]).filter(it => it && it.k).map(it => {
    const s = sceneOfKey(it.k); if (!s) return null;
    return { it, s, code: rowCode(it), ie: ieLab(s), set: setOf(s), syn: callSyn(s) || '', dn: DN_LAB[stripDN(s)], ...callRowColor(it, s), cast: sceneCast(s.idx).map(e => D.castNum[e.id]).filter(Boolean), e8: partEighths(it) };
  }).filter(Boolean);
  return { id: d.id, j, n: j + 1, date: S.date, call: peekDay(d.id).crewCall || callDefaults(d).crewCall, locs: callLocs(de).map(x => x[0]), rows,
    e8: rows.reduce((a, r) => a + r.e8, 0), cast: callCast(de).map(({ el }) => ({ n: D.castNum[el.id] || '', name: titleCase(el.name) })) };
}
const callAdvance = (n, cd) => callAdvDay(n + 1, cd);
/* (lote AH) las jornadas del avance de una hoja: las elegidas (dd.adv) o, si nadie eligió, la siguiente; en orden */
function callAdvIds(ref, cd) {
  cd = cd || callDays(); const S = callSheet(ref, cd); if (!S) return [];
  const own = peekDay(S.d.id).adv, ix = id => cd.days.findIndex(d => d.id === id);
  if (Array.isArray(own)) return own.filter(id => ix(id) >= 0 && id !== S.d.id).sort((a, b) => ix(a) - ix(b));
  return !S.free && cd.days[S.n + 1] ? [cd.days[S.n + 1].id] : [];
}
const callAdvances = (ref, cd) => { cd = cd || callDays(); return callAdvIds(ref, cd).map(id => callAdvDay(cd.days.findIndex(d => d.id === id), cd)).filter(Boolean); };
const advDate = A => A && A.date ? cap1(fmtDate(A.date)) : '';
/* el avance en una línea (el resumen para el chat y la línea del Excel) */
const advLine = A => !A ? tr('Fin de rodaje') : [tr(`Avance · Jornada ${A.n}`) + (A.date ? ' · ' + advDate(A) : ''), A.call ? tr(`llamado ${A.call}`) : '', A.locs.join(', '), A.rows.length ? tr(`${A.rows.length} ${A.rows.length === 1 ? 'escena' : 'escenas'}`) + ' · ' + tr(`${fmtEighths(A.e8)} págs.`) : ''].filter(Boolean).join(' · ');
/* el traslado: hacia dónde va (la locación de la escena que sigue) y su mapa */
function callMoveTo(rows, j, m) {
  const nx = rows.slice(j + 1).find(r => !r.ev && !r.free); if (!nx) return null;
  const name = nx.loc, addr = ((P.schedule.locs || []).find(l => l.name === name) || {}).addr || '';
  const det = ((rows[j].v && rows[j].v.det) || rows[j].det || '').trim(), q = addr || det || name;
  return { name, addr, url: q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '' };
}
const isMove = r => r.ev && /traslado|company move/i.test(r.name || '');
/* la hora del almuerzo que sale del cronograma (el evento «Almuerzo» de la jornada), si no se escribió */
const callLunch = S => (([...S.rows, ...S.close].find(r => r.ev && /almuerzo|lunch/i.test(r.name || '')) || {}).t0 || '');
/* (lote AH) un campo de la hoja sobre lo del stripboard: muestra lo que sale (lo cambiado o lo del stripboard) y, si se
   cambió, se nota apenas (ov) con lo del stripboard en su ayuda. Vacío vuelve a lo del stripboard. k: 'r' (fila) o 's'
   (plano); id: su clave; f: el campo; ta: de varias líneas */
function clOvIn(o, k, id, f, lab, { ta, cls = '', dis = '' } = {}) {
  const on = !!o.ov[f], val = on ? o.v[f] : clTr(o.b[f] || '');
  const tip = on ? `Cambiado en esta hoja. En el stripboard: «${o.b[f] || '—'}». Bórralo para volver a lo del stripboard.` : 'Lo cambiado aquí queda solo en esta hoja';
  const a = `class="cl-in${ta ? ' cl-ta' : ''}${on ? ' ov' : ''}${cls ? ' ' + cls : ''}" data-bind="cl-ov" data-k="${k}" data-id="${ea(id)}" data-f="${f}" aria-label="${ea(lab)}" title="${ea(tip)}" ${dis}`;
  return ta ? `<textarea rows="${clRows(val)}" ${a}>${esc(val)}</textarea>` : `<input type="text" value="${esc(val)}" ${a}>`;
}
/* una fila libre: todos sus campos se escriben (k: 'x' cronograma, 'xs' plano, 'xa' talento, 'xc' equipo) */
function clXIn(x, k, f, lab, { ta, cls = '', ph = '', dis = '', type = 'text' } = {}) {
  const val = x[f] || '', a = `class="cl-in${ta ? ' cl-ta' : ''}${cls ? ' ' + cls : ''}" data-bind="cl-xf" data-k="${k}" data-id="${ea(x.id)}" data-f="${f}" placeholder="${ea(ph)}" aria-label="${ea(lab)}" ${dis}`;
  return ta ? `<textarea rows="${clRows(val)}" ${a}>${esc(val)}</textarea>` : `<input type="${type}" value="${esc(val)}" ${a}>`;
}
/* las líneas de un campo de varias líneas, de entrada (donde el navegador no lo ajusta solo al texto) */
const clRows = t => Math.min(6, Math.max(1, String(t || '').split('\n').reduce((a, l) => a + Math.max(1, Math.ceil(l.length / 64)), 0)));
RENDER.call = function () {
  const v = $('#view');
  $$('.toast.t-stale').forEach(t => t.remove());   // ya se está en la hoja
  const frees = callFrees(), ed = callEditable(), dis = ed ? '' : 'disabled';
  if (!D.sc.scenes.length && !frees.length) { v.innerHTML = emptyScript(); bindView(); return; }
  const cd = callDays(), { days, dates } = cd;
  if (UI.callFree && !callFreeOf(UI.callFree)) UI.callFree = null;
  if (!days.length && !UI.callFree && frees.length) UI.callFree = frees[0].id;
  if (!days.length && !UI.callFree) { v.innerHTML = `<div class="ws ws-1"><section class="center"><div class="scroller pad"><p class="hint">Primero arma el plan de rodaje: cada jornada tendrá su hoja de llamado.</p>${ed ? `<p>${hdBtn('sec', 'Hoja libre', { icon: 'plus', sm: true, attrs: 'data-act="cl-free-new" title="Una hoja de llamado que no sale de ninguna jornada: se llena a mano"' })}</p>` : ''}</div></section></div>`; bindView(); return; }
  if (UI.callDay == null || (days.length && UI.callDay >= days.length)) { const f = UI.callFree; UI.callDay = 0; UI.callFree = f; }
  const ref = callRef(), S = callSheet(ref, cd), free = !!S.free, n = S.n, d = S.d, de = S.de, dt = S.date;
  const C = CALL(), dd = peekDay(d.id), def = callDefaults(d);
  callCrew();
  const M = P.meta;
  const hosp = { ...C.hospital, ...(dd.hosp || {}) };
  const inp = (f, ph, extra = '') => `<input type="text" value="${esc(dd[f] || '')}" placeholder="${esc(ph || '')}" data-bind="cs-day" data-f="${ea(f)}" ${dis} ${extra}>`;
  // (lote Y) un dato del clima con su unidad al lado del número (se ve apenas se escribe: wxSync)
  const uInp = (f, phd, lab, tip) => {
    const v = dd[f] || '', n = wxNum(v), on = n !== null;
    return `<span class="cl-u${on ? ' on' : ''}${f === 'wx' ? ' cl-uw' : ''}"><input type="text" value="${esc(on ? n : v)}" placeholder="${esc(phd || '')}" data-bind="cs-wx" data-f="${ea(f)}" ${dis} aria-label="${ea(lab)}" title="${ea(tip)}"${on ? ` size="${Math.max(1, n.length)}"` : ''}><i aria-hidden="true">${WX_U[f]}</i></span>`;
  };
  const fig = de.rows.reduce((a, i) => a + num(P.schedule.items[i].fig), 0);
  const call = dd.crewCall || def.crewCall;
  const inf = dayInfo(de.keys, de.rows);
  const ph = (t, alt = '') => ed ? t : alt;
  const show = UI.csShow || (UI.csShow = new Set());
  const xBtn = (act, id, lab = 'Quitar') => ed ? `<button class="cs-x" data-act="${ea(act)}" data-id="${ea(id)}" aria-label="${esc(lab)}" title="${esc(lab)}"${act === 'cs-crew-x' ? ' aria-haspopup="menu"' : ''}>${ICO.close}</button>` : '';
  const dateTxt = dt ? capFirst(dt.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')) : 'Sin fecha';
  const Sc = callSched(d), shotT = callShotTimes(), thumbs = callThumbs();
  const logo = imgOk(M.projLogo), clogo = imgOk(M.logo);
  const tel = p => p ? `<a href="tel:${ea(String(p).replace(/[^\d+]/g, ''))}">${esc(p)}</a>` : '';
  const m = dd.meet || {};
  // la hora de una fila del cronograma: se escribe aquí, libre (vacía: sigue del llamado y de los tiempos del plan)
  const rowTime = r => r.free ? (ed ? tmIn(r.x.t || '', 'Hora', `data-bind="cl-xf" data-k="x" data-id="${ea(r.x.id)}" data-f="t" aria-label="Hora de la fila"`, dis) : `<b class="tnum">${esc(r.x.t || '')}</b>`)
    : ed ? tmIn((dd.at || {})[r.key] || r.it.t || '', r.t0 || r.t || 'Hora', `data-bind="cl-at" data-k="${ea(r.key)}" aria-label="${ea('Hora de ' + (r.ev ? r.v.name : 'la escena ' + r.v.code))}" title="Escribe la hora; vacía, sigue a la fila anterior"`, dis) : `<b class="tnum">${esc(r.t0 || r.t || '')}</b>`;
  // arriba de todo, fuera de la hoja: el estado (lo que falta para enviarla, si la que salió quedó vieja o si está
  // lista) con «Copiar resumen» y «Enviar»
  const ST = callState(ref);
  const verTag = V => `<span data-no-tr>${esc(callVerTxt(V))}</span>`;
  // en el teléfono (o donde se pueda) el PDF se manda con el menú de compartir del sistema: WhatsApp, correo…
  const canShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';
  const copyBtn = hdBtn('sec', 'Copiar resumen', { sm: true, attrs: 'data-act="cl-copy" title="Fecha, llamado, locación con su mapa, centro de salud y el avance, para pegar en el chat junto al PDF"' });
  const sendBtn = (lab, pri) => hdBtn(pri ? 'pri' : 'sec', lab, { icon: 'share', sm: true, attrs: 'data-act="cl-exp"' });
  const status = ST.stale ? hdPill('bad', `Cambió desde la ${verTag(ST.e)}`) + copyBtn + sendBtn(canShare ? `Enviar v${ST.e.v + 1}` : `Exportar v${ST.e.v + 1}`, true)
    : ST.miss.length ? (ST.e ? hdPill('info', `Exportada: ${verTag(ST.e)}`) : '') + hdPill('warn', ST.miss.length === 1 ? 'Falta 1 dato para enviarla' : 'Faltan datos para enviarla', { n: ST.miss.length, chev: true, attrs: 'data-act="cl-miss" aria-haspopup="dialog"' })
    : ST.e ? hdPill('ok', `Exportada: ${verTag(ST.e)} · sin cambios`) + copyBtn + sendBtn(canShare ? 'Enviar de nuevo' : 'Exportar de nuevo')
    : hdPill('ok', 'Lista para enviar · saldrá como v1') + copyBtn + sendBtn(canShare ? 'Enviar PDF' : 'Exportar PDF', true);
  const stepA = i => i >= 0 && i < days.length ? `data-act="cl-day" data-d="${i}"` : null;
  // 1. la cabecera en tres columnas, cada dato en su celda
  const lunchAuto = def.lunch || callLunch(Sc);
  const fromPlan = !dd.crewCall && !!def.crewCall, motorPlan = !dd.motor && !!Sc.motor, lunchPlan = !dd.lunch && !!lunchAuto;
  // (lote W) a la izquierda, además del equipo clave, lo que pedía «Equipo clave» antes: la producción y el cliente
  const keyCrew = callKeyCrew(dd), keyMore = callKeyMore(keyCrew);
  const kcHTML = k => `<div class="cl-cell cl-kc"><span class="cl-kl">${esc(k.lab)}</span>${k.name ? `<b data-no-tr>${esc(k.name)}</b>` : `<span class="cl-dim">${ed ? 'Sin nombre' : 'Por confirmar'}</span>`}${k.phone ? `<span class="cl-kp">${CL_ICO.phone}${tel(k.phone)}</span>` : ''}</div>`;
  const colL = `<div class="cl-c1"><div class="cl-cell cl-coc">${clogo ? `<img class="cl-clogo" src="${ea(clogo)}" alt="">` : ''}${M.company ? `<b class="cl-co" data-no-tr>${esc(M.company)}</b>` : `<b class="cl-co cl-dim">Productora</b>`}</div>
    ${[...keyCrew, ...keyMore].map(kcHTML).join('')}</div>`;
  const eps = epsOfKeys(de.keys);
  // la fecha: un toque la cambia (solo en esta hoja o corriendo esta jornada y las siguientes en el plan)
  const dateBtn = ed ? `<button type="button" class="cl-dateb${dt ? '' : ' miss'}" data-act="cl-date" aria-haspopup="dialog" title="${ea(free ? 'Cambiar la fecha de la hoja' : 'Cambiar la fecha: solo en esta hoja o corriendo esta jornada y las siguientes en el plan')}">${esc(dateTxt)}</button>` : `<span class="cl-dateb">${esc(dateTxt)}</span>`;
  const tmCellH = (lab, f, val, phv, auto, tip) => `<label class="cl-tc"><span class="cl-kl">${esc(lab)}</span>${hdAuto(tmIn(val, phv || ph('Hora'), `data-bind="cs-day" data-f="${f}" aria-label="${ea(lab)}" title="${ea(tip)}"`, dis), auto)}</label>`;
  const colC = `<div class="cl-c2"><div class="cl-cell cl-tt0">${logo ? `<img class="cl-plogo" src="${ea(logo)}" alt="${ea(M.title || '')}">` : `<h2 class="cl-ttl" data-no-tr>${esc(M.title || '')}</h2>`}
      <div class="cl-jn">${!free && days.length > 1 ? hdStep(stepA(n - 1), stepA(n + 1)) : ''}<span>Hoja de llamado</span><span aria-hidden="true">·</span>${free ? (ed ? `<input type="text" class="cl-fname" value="${esc(S.free.name || '')}" placeholder="Nombre de la hoja" data-bind="cl-fname" maxlength="80" aria-label="Nombre de la hoja libre">` : `<span data-no-tr>${esc(callSheetName(S))}</span>`) : `<span>Jornada ${n + 1} de ${days.length}</span>`}${eps.length ? `<span class="cl-ep" data-no-tr>${esc(eps.length === 1 ? epLabel(P, eps[0]) : 'Episodios ' + eps.join(', '))}</span>` : ''}</div></div>
    <div class="cl-cell cl-date">${dateBtn}${S.own ? `<span class="cl-own"><span class="hd-tag">solo en esta hoja</span>${ed ? `<button type="button" class="linkbtn" data-act="cl-date-back" title="${ea(S.plan ? cap1(fmtDate(S.plan)) : '')}">Volver a la fecha del plan</button>` : ''}</span>` : ''}</div>
    <div class="cl-cell cl-callg"><span class="cl-kl">Llamado general</span><span class="cl-big">${tmIn(call, ph('Falta', '-'), `data-bind="cs-day" data-f="crewCall" aria-label="Llamado general"${!call && ed ? ' data-miss="1"' : ''}`, dis)}${fromPlan ? ' <span class="hd-tag">del plan</span>' : ''}</span></div>
    <div class="cl-cell cl-times">${tmCellH('Listos motor', 'motor', dd.motor, Sc.motor.replace('~', ''), motorPlan, 'La hora en que se rueda el primer plano')}${tmCellH('Almuerzo', 'lunch', dd.lunch || '', lunchAuto, lunchPlan, 'Hora del almuerzo')}
      ${tmCellH('Cierre de set', 'cierre', dd.cierre || '', Sc.cierreAuto, !dd.cierre && !!Sc.cierreAuto, 'Cuando termina la última escena (vacío: la del plan)')}${tmCellH('Wrap', 'end', dd.end || '', Sc.endAuto, !dd.end && !!Sc.endAuto, 'El fin de la jornada, con el desmontaje (vacío: la del plan)')}</div>
    ${ed || (dd.craft || '').trim() ? `<div class="cl-cell cl-sub"><label class="cl-craft"><span>Catering</span>${inp('craft', ph('Opcional'), 'aria-label="Catering" title="Por ejemplo: durante la jornada"')}</label></div>` : ''}
    ${free ? '' : `<div class="cl-cell cl-sum">${inf.e ? esc(fmtEighths(inf.e)) + ' págs. · ' : ''}${de.keys.length} ${de.keys.length === 1 ? 'escena' : 'escenas'}${Sc.byShot ? ` · ${Sc.rows.reduce((a, r) => a + (r.shots ? r.shots.length : 0), 0)} planos` : ''}</div>`}</div>`;
  const wxKeys = ['wx', 'hi', 'lo', 'hum', 'sunrise', 'sunset'], wxOpen = wxKeys.some(k => (dd[k] || '').trim()) || (UI.csOpen && UI.csOpen.has('wx'));
  // (lote AH) la locación en la cabecera: solo su nombre, su dirección y «Ver mapa»; lo demás del punto de encuentro, abajo
  const L = callLoc(de, dd), lMiss = !L.addr && !(m.addr || '').trim();
  const colR = `<div class="cl-c3">
    ${wxOpen ? `<div class="cl-cell cl-ir">${CL_ICO.wx}<div class="cl-wx">${uInp('wx', ph('Clima'), 'Clima', 'Soleado, nublado, lluvia, viento… o la temperatura')}<span class="cl-temp">${WX_FIELDS.map(x => `<span>${x.lab}</span>${uInp(x.f, ph(x.ph), x.aria, x.tip)}`).join('')}</span>
      <span class="cl-sunr"><label><span>Amanecer</span>${tmIn(dd.sunrise, ph('Hora', '-'), 'data-bind="cs-day" data-f="sunrise" aria-label="Amanecer"', dis)}</label><label><span>Anochece</span>${tmIn(dd.sunset, ph('Hora', '-'), 'data-bind="cs-day" data-f="sunset" aria-label="Anochece"', dis)}</label></span></div></div>`
    : ed ? `<div class="cl-cell"><button type="button" class="cl-ir cl-irb" data-act="cs-open" data-k="wx">${CL_ICO.wx}<span><b>Clima</b><small>Máxima y mínima, amanecer y anochecer</small></span></button></div>` : ''}
    <div class="cl-cell cl-ir cl-irl">${ICO.pin}<div><span class="cl-kl">Locación</span>
      ${ed ? `<input type="text" class="cl-lname${(dd.loc || {}).name && L.pName ? ' ov' : !(dd.loc || {}).name && L.pName ? ' hd-auto' : ''}" value="${esc((dd.loc || {}).name || '')}" placeholder="${ea(L.pName || 'Nombre de la locación')}" data-bind="cl-loc" data-f="name" ${dis} aria-label="Nombre de la locación" data-no-tr title="${ea(L.pName ? 'Vacío: la locación del plan de rodaje' : 'El nombre de la locación')}">
        <input type="text" class="cl-laddr${(dd.loc || {}).addr && L.pAddr ? ' ov' : !(dd.loc || {}).addr && L.pAddr ? ' hd-auto' : ''}" value="${esc((dd.loc || {}).addr || '')}" placeholder="${ea(L.pAddr || (m.addr || '').trim() || 'Falta la dirección')}" data-bind="cl-loc" data-f="addr" ${dis} aria-label="Dirección de la locación"${lMiss ? ' data-miss="1"' : ''} data-no-tr title="${ea(L.pAddr ? 'Vacía: la dirección del plan de rodaje' : 'La dirección de la locación')}">`
      : `${L.name ? `<b data-no-tr>${esc(L.name)}</b>` : ''}${L.addr || (m.addr || '').trim() ? `<small data-no-tr>${esc(L.addr || m.addr.trim())}</small>` : `<span class="cl-dim">Por confirmar</span>`}`}
      ${L.url ? `<a class="cl-map" href="${ea(L.url)}" target="_blank" rel="noopener noreferrer">Ver mapa</a>` : ''}</div></div></div>`;
  // 2. (lote AH) los jefes de área, con su teléfono, en un cuadro bajo la cabecera
  const crewSets = callCrewRows(dd, call, show), heads = callHeads(crewSets, keyCrew);
  const headsHTML = heads.length ? `<section class="cl-box cl-heads" aria-label="Jefes de área"><div class="cl-bh"><h3>Jefes de área</h3></div><div class="cl-hg">${heads.map(h => `<div class="cl-hc"><span class="cl-kl">${esc(h.role)}</span><b data-no-tr>${esc(h.name)}</b>${h.phone ? `<span class="cl-kp">${CL_ICO.phone}${tel(h.phone)}</span>` : ''}</div>`).join('')}</div></section>` : '';
  // 3. la nota del 1.er asistente, en su cuadro amarillo
  const notes = (dd.notes || '').trim(), noteOpen = notes || (UI.csOpen && UI.csOpen.has('notes'));
  const noteHTML = noteOpen ? `<section class="cl-box cl-note"><div class="cl-bh"><h3>Nota para el equipo</h3></div><textarea rows="${Math.min(10, Math.max(1, (dd.notes || '').split('\n').length))}" data-bind="cs-day" data-f="notes" aria-label="Nota para el equipo" placeholder="${ea(ph('Seguridad, ropa, estacionamiento, lo que no se puede publicar…'))}" ${dis}>${esc(dd.notes || '')}</textarea></section>`
    : ed ? `<div class="hd-box cl-noteadd">${hdAdd('Nota para el equipo', 'Seguridad, ropa, estacionamiento, lo que no se puede publicar. Sale debajo de la cabecera.', 'data-act="cs-open" data-k="notes"', lgCol('call', 'note'))}</div>` : '';
  // 4. el cronograma (lote AH: sin título; la cabecera de sus columnas basta): la hora (eventos) o el número de escena
  // (con su hora debajo), el encabezado con la sinopsis y el reparto con su número, D/N y las páginas; los traslados, una
  // banda celeste con su dirección y el mapa. Debajo de cada escena, sus planos. Quien edita la hoja cambia aquí lo que
  // llega del stripboard (queda solo en esta hoja) y, con clic derecho, agrega y quita filas
  const shotTime = x => x.free ? (ed ? tmIn(x.x.t || '', 'Hora', `data-bind="cl-xf" data-k="xs" data-id="${ea(x.x.id)}" data-f="t" aria-label="Hora del plano"`, dis) : `<small>${esc(x.x.t || '')}</small>`)
    : !ed ? `<small title="${ea(x.t0 + (x.t1 ? ' – ' + x.t1 : ''))}">${esc(x.t0)}</small>`
    : hdAuto(tmIn(x.fixed ? x.t0 : '', x.t0, `data-bind="cl-shat" data-id="${ea(x.sh.id)}" aria-label="${ea('Hora del plano ' + x.code)}" title="${ea('Escribe la hora del plano; si no cabe, su escena se alarga o se corre' + (x.fixed ? '. Borra la hora para repartir la escena parejo' : ''))}"`, dis), !x.fixed);
  const sndSel = (val, attrs) => `<select class="cl-snd" ${attrs} ${dis}>${SND_OPTS.map(([k, t]) => `<option value="${k}" ${val === k ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  const ovTxt = (x, f, txt) => `<span class="${x.ov[f] ? 'ov' : ''}"${x.ov[f] ? ` title="${ea('Cambiado en esta hoja. En el stripboard: «' + (x.b[f] || '—') + '»')}"` : ''}>${txt}</span>`;
  const shotRow = (r, x, col) => {
    const k = x.free ? 'xs' : 's', id = x.free ? x.x.id : x.sh.id;
    const fld = (f, lab, o) => x.free ? clXIn(x.x, 'xs', f, lab, { ...o, dis }) : clOvIn(x, 's', id, f, lab, { ...o, dis });
    const desc = ed ? fld('desc', 'Descripción del plano', { ta: true }) : x.free || x.ov.desc ? ovTxt(x, 'desc', esc(x.v.desc)) : `<b>${esc(x.size)}</b>${x.det.length ? `<span>${esc(x.det.join(' · '))}</span>` : ''}`;
    const act = ed ? fld('act', 'Acción', { ta: true }) : ovTxt(x, 'act', esc(x.v.act));
    const lens = ed ? fld('lens', 'Lente', { cls: 'cl-sm' }) : ovTxt(x, 'lens', esc(x.v.lens));
    const snd = ed ? sndSel(x.v.snd, `data-bind="${x.free ? 'cl-xf' : 'cl-ov'}" data-k="${k}" data-id="${ea(id)}" data-f="snd" aria-label="${ea('Sonido del plano ' + (x.code || ''))}"${x.ov.snd ? ' class="ov"' : ''}`) : ovTxt(x, 'snd', esc(SND_NAME[x.v.snd] || ''));
    const cast = ed ? fld('cast', 'Personajes', { cls: 'cl-sm' }) : (x.v.cast ? `<span class="cl-mlab">Personajes</span> ` : '') + ovTxt(x, 'cast', esc(x.v.cast));
    return `<tr class="cl-lsh${x.free ? ' cl-free' : ''}" style="--rc:${ea(col || 'transparent')}" data-cr="${k}:${ea(id)}" data-in="${ea(r.k)}"><td class="cl-ln cl-pc">${x.free ? (ed ? clXIn(x.x, 'xs', 'code', 'Número del plano', { cls: 'cl-code-in', ph: 'Plano', dis }) : `<span class="cl-code">${esc(x.code)}</span>`) : `<span class="cl-code">${esc(x.code)}</span>`}${shotT && (x.t0 || x.free) ? shotTime(x) : ''}</td>
    <td colspan="4"><div class="cl-shg${thumbs ? ' th' : ''}">${thumbs ? (x.sh ? callThumb(x.sh) : '<span class="cl-th0"></span>') : ''}<span class="cl-shd">${desc}</span><span class="cl-sha">${act}</span>
      <span class="cl-shm"><span class="cl-shset">${r.set && !x.free ? `<span class="cl-mlab">Set</span> ${esc(r.set)}` : ''}</span><span class="cl-shl tnum">${lens}</span><span class="cl-shs">${snd}</span><span class="cl-shc tnum">${cast}</span></span></div></td></tr>`;
  };
  const list = [...Sc.rows, ...Sc.close];
  const lrow = (r, j) => {
    if (r.free) {
      const f = (fl, lab, o) => clXIn(r.x, 'x', fl, lab, { ...o, dis });
      return `<tr class="cl-lsc cl-free" data-cr="x:${ea(r.x.id)}"><td class="cl-ln">${ed ? f('code', 'Número', { cls: 'cl-code-in', ph: 'Esc.' }) : `<span class="cl-sn tnum">${esc(r.v.code)}</span>`}${rowTime(r)}</td><td class="cl-lie">${ed ? f('ie', 'I/E', { cls: 'cl-sm', ph: 'I/E' }) : esc(r.v.ie)}</td>
        <td class="cl-lsd">${ed ? `${f('set', 'Escena o actividad', { ta: true, cls: 'cl-setin', ph: 'Escena o actividad' })}${f('syn', 'Detalle', { ta: true, cls: 'cl-synin', ph: 'Detalle' })}${f('cast', 'Reparto', { ta: true, cls: 'cl-castin', ph: 'Reparto' })}`
          : `${r.v.set ? `<b>${esc(r.v.set)}</b>` : ''}${r.v.syn ? `<span class="cl-syn">${esc(r.v.syn)}</span>` : ''}${r.v.cast ? `<span class="cl-lc">${esc(r.v.cast)}</span>` : ''}`}</td>
        <td class="cl-ldn">${ed ? f('dn', 'D/N', { cls: 'cl-sm', ph: 'D/N' }) : esc(r.v.dn)}</td><td class="cl-lpg tnum">${ed ? f('pages', 'Páginas', { cls: 'cl-sm cl-r', ph: 'Págs.' }) : esc(r.v.pages)}</td></tr>`;
    }
    const evTxt = () => ed ? `${clOvIn(r, 'r', r.key, 'name', 'Evento', { cls: 'cl-evn', dis })}${clOvIn(r, 'r', r.key, 'det', 'Detalle', { cls: 'cl-evd', dis })}` : `${ovTxt(r, 'name', `<b>${esc(r.v.name)}</b>`)}${r.v.det ? `<span data-no-tr>${ovTxt(r, 'det', esc(r.v.det))}</span>` : ''}`;
    if (isMove(r)) { const to = callMoveTo(list, j, m); return `<tr class="cl-lmv" data-cr="r:${ea(r.key)}"><td class="cl-ln">${rowTime(r)}</td><td colspan="4"><span class="cl-mvb">${CL_ICO.move}${evTxt()}${to ? `<span>→ <b>${esc(to.name)}</b>${to.addr ? ` · <span data-no-tr>${esc(to.addr)}</span>` : ''}</span>${to.url ? `<a href="${ea(to.url)}" target="_blank" rel="noopener noreferrer">Ver mapa</a>` : ''}` : ''}</span></td></tr>`; }
    if (r.ev) { const hc = hlc(r.it) || lgCol('plan', 'ev'); return `<tr class="cl-lev${ea(lgDark(hc))}" style="--rc:${ea(hc)}" data-cr="r:${ea(r.key)}"><td class="cl-ln">${rowTime(r)}</td><td colspan="4"><span class="cl-evb">${evTxt()}</span></td></tr>`; }
    const col = r.col, V = r.v, o = (f, lab, x) => clOvIn(r, 'r', r.key, f, lab, { ...x, dis });
    // (lote Z) la escena a todo color, como su tira en el plan de rodaje (con letra clara sobre un color oscuro)
    return `<tr class="cl-lsc${r.shots && r.shots.length ? ' has-sh' : ''}${ea(lgDark(col))}" data-strip="${ea(r.strip)}" style="--rc:${ea(col)}" data-cr="r:${ea(r.key)}"><td class="cl-ln">${ed ? o('code', 'Número de escena', { cls: 'cl-code-in' }) : `<span class="cl-sn tnum">${ovTxt(r, 'code', esc(V.code))}</span>`}${rowTime(r)}</td><td class="cl-lie">${ed ? o('ie', 'I/E', { cls: 'cl-sm' }) : ovTxt(r, 'ie', esc(V.ie))}</td>
      <td class="cl-lsd">${ed ? `${o('set', 'Encabezado', { ta: true, cls: 'cl-setin' })}${r.it.sp && !r.ov.set ? `<em class="cl-part">(parte ${esc(r.it.sp)})</em>` : ''}${o('syn', 'Sinopsis', { ta: true, cls: 'cl-synin' })}${o('cast', 'Reparto', { ta: true, cls: 'cl-castin' })}`
        : `<b>${ovTxt(r, 'set', esc(V.set))}${r.it.sp && !r.ov.set ? ` <em>(parte ${esc(r.it.sp)})</em>` : ''}</b><span class="m-only">${esc(V.ie)} · ${esc(V.dn)}</span>${V.syn ? `<span class="cl-syn">${ovTxt(r, 'syn', esc(V.syn))}</span>` : ''}${V.cast ? `<span class="cl-lc">${ovTxt(r, 'cast', esc(V.cast))}</span>` : ''}`}</td>
      <td class="cl-ldn">${ed ? o('dn', 'D/N', { cls: 'cl-sm' }) : ovTxt(r, 'dn', esc(V.dn))}</td><td class="cl-lpg tnum">${ed ? o('pages', 'Páginas', { cls: 'cl-sm cl-r' }) : ovTxt(r, 'pages', esc(V.pages))}</td></tr>`
      + (r.shots || []).map(x => shotRow(r, x, col)).join('');
  };
  const shHead = Sc.byShot ? `<tr class="cl-lhs"><th>Plano</th><th colspan="4"><div class="cl-shg${thumbs ? ' th' : ''}">${thumbs ? '<span></span>' : ''}<span>Descripción</span><span>Acción</span><span class="cl-shm"><span>Set</span><span>Lente</span><span>Sonido</span><span>Personajes</span></span></div></th></tr>` : '';
  const nSc = free ? (dd.xrows || []).length : de.keys.length, nLab = free ? (nSc === 1 ? 'fila' : 'filas') : nSc === 1 ? 'escena' : 'escenas';
  const schedHTML = `<section class="cl-box cl-list-s" aria-label="Cronograma"><table class="cl-list cl-sched cl-g"><thead><tr><th>Hora · Esc.</th><th>I/E</th><th>Escena</th><th>D/N</th><th>Págs.</th></tr>${shHead}</thead><tbody>
    ${list.map(lrow).join('') || `<tr data-cr="x0:"><td colspan="5" class="hint">${free ? (ed ? 'Hoja libre: agrega sus filas con «+ Fila» o con clic derecho.' : 'Sin filas.') : 'Jornada sin escenas.'}</td></tr>`}
    <tr class="cl-lend"><td class="cl-ln">${ed ? `<span class="cl-endt">${hdAuto(tmIn(dd.end || '', Sc.endAuto || 'Hora', 'data-bind="cs-day" data-f="end" aria-label="Wrap: fin de la jornada" title="Escribe la hora; vacía, la que sale de los tiempos"', dis), !dd.end && !!Sc.endAuto)}</span>` : `<b class="tnum">${esc(Sc.end || '')}</b>`}</td><td colspan="3"><b>Wrap · fin de jornada</b> <span class="cl-dim">· ${nSc} ${nLab}</span></td><td class="cl-lpg tnum"><small>Total</small> <b>${esc(fmtEighths(inf.e))}</b></td></tr></tbody></table></section>`;
  const chg = free ? 0 : callChanges(dd);
  const schedTools = `<div class="cl-tools">${Sc.byShot ? `<label class="cl-opt" title="Reparte la hora de cada escena entre sus planos. Apagado: solo la hora de cada escena"><input type="checkbox" data-bind="cl-shott" ${shotT ? 'checked' : ''} ${dis}> Hora por plano</label><label class="cl-opt" title="La viñeta del storyboard de cada plano"><input type="checkbox" data-bind="cl-thumbs" ${thumbs ? 'checked' : ''} ${dis}> Miniaturas</label>` : ''}
    ${chg ? `<span class="cl-chg" title="Lo cambiado aquí queda solo en esta hoja: el plan de rodaje, el desglose y el storyboard no cambian">${chg === 1 ? '1 cambio sobre el stripboard' : `${chg} cambios sobre el stripboard`}</span>${ed ? '<button type="button" class="linkbtn" data-act="cl-revert">Volver a la guía del stripboard</button>' : ''}` : ''}
    <span class="grow"></span>${ed ? `<button type="button" class="linkbtn" data-act="cl-row-end" data-t="x" title="Una fila libre al final del cronograma: todos sus campos se escriben">+ Fila</button>` : ''}${free ? '' : '<button class="linkbtn" data-act="cs-plan">Orden y tiempos en el plan de rodaje ›</button>'}</div>`;
  const goneChips = (list, lab) => list.length ? `<div class="cs-out cl-gone"><span>${lab}</span>${list.map(g => `<button class="chip" data-act="cl-back" data-cr="${ea(g.k)}" ${dis} title="Vuelve a esta hoja">${esc(g.lab)} <span aria-hidden="true">↺</span></button>`).join('')}</div>` : '';
  // 5. el avance: las jornadas elegidas (de entrada, la siguiente) o «Fin de rodaje»
  const advs = callAdvances(ref, cd), advOwn = Array.isArray(dd.adv), advDays = advs.map(A => A.id);
  const advTable = A => `<table class="cl-list cl-advt cl-g"><thead><tr><th colspan="6" class="cl-advh"><div class="cl-advhd"><b>Avance · Jornada ${A.n}${A.date ? ' · ' + esc(advDate(A)) : ''}</b><span class="hint">${A.call ? `Llamado general <b class="tnum">${esc(A.call)}</b>` : 'Llamado por confirmar'}${A.locs.length ? ` · <span>${esc(A.locs.join(', '))}</span>` : ''}</span><span class="grow"></span><button type="button" class="linkbtn" data-act="cl-day" data-d="${A.j}">Ver su hoja ›</button>${ed ? `<button type="button" class="cs-x" data-act="cl-adv-x" data-id="${ea(A.id)}" aria-label="${ea('Quitar la jornada ' + A.n + ' del avance')}" title="Quitar del avance">${ICO.close}</button>` : ''}</div></th></tr>
    <tr><th>Esc.</th><th>I/E</th><th>Escena</th><th>D/N</th><th>Reparto</th><th>Págs.</th></tr></thead><tbody>${A.rows.map(r => `<tr class="cl-lsc${ea(lgDark(r.col))}" data-strip="${ea(r.strip)}" style="--rc:${ea(r.col)}"><td class="cl-ln"><span class="cl-sn tnum">${esc(r.code)}</span></td><td class="cl-lie">${esc(r.ie)}</td><td class="cl-lsd"><b>${esc(r.set)}</b><span class="m-only">${esc(r.ie)} · ${esc(r.dn)}</span>${r.syn ? `<span class="cl-syn">${esc(r.syn)}</span>` : ''}</td><td class="cl-ldn">${esc(r.dn)}</td><td class="cl-lcn tnum">${esc(r.cast.join(', '))}</td><td class="cl-lpg tnum">${esc(fmtEighths(r.e8))}</td></tr>`).join('') || '<tr><td colspan="6" class="hint">Jornada sin escenas.</td></tr>'}
    <tr class="cl-advtot"><td colspan="6"><span>Total: <b class="tnum">${esc(fmtEighths(A.e8))} págs.</b></span>${A.cast.length ? `<span>Reparto: <span>${esc(A.cast.map(c => (c.n ? c.n + ' ' : '') + c.name).join(', '))}</span></span>` : ''}</td></tr></tbody></table>`;
  const lastDay = !free && n === days.length - 1;
  const advHTML = advs.length ? `<section class="cl-box cl-adv" aria-label="Avance">${advs.map(advTable).join('')}</section>`
    : !advOwn && lastDay ? '<section class="cl-box cl-adv"><p class="cl-fin">Fin de rodaje</p></section>' : '';
  const advTools = ed && days.length > (free ? 0 : 1) ? `<div class="cl-tools cl-advtools"><span class="grow"></span><button type="button" class="linkbtn" data-act="cl-adv-add" aria-haspopup="menu" title="Agregar cualquier jornada del plan como avance">+ Jornada al avance</button>${advOwn ? '<button type="button" class="linkbtn" data-act="cl-adv-auto" title="El avance vuelve a ser la jornada siguiente">Avance automático</button>' : ''}</div>` : '';
  // 6. (lote AH) la citación en dos cuadros: primero los talentos (el reparto), después el equipo técnico
  const NT = 10, tmCell = (lab, html) => `<td class="cl-tt"><span class="cl-mlab">${esc(lab)}</span>${html}</td>`;
  const contact = (bind, id, o, who) => `<td class="cl-pt"><input type="tel" value="${esc(o.phone || '')}" placeholder="${ea(ph('Teléfono'))}" data-bind="${bind}" data-id="${ea(id)}" data-f="phone" ${dis} aria-label="Teléfono de ${esc(who)}"><input type="email" class="cl-mail" value="${esc(o.email || '')}" placeholder="${ea(ph('Correo'))}" data-bind="${bind}" data-id="${ea(id)}" data-f="email" ${dis} aria-label="Correo de ${esc(who)}"></td>`;
  const tal = callTalentRows(de, dd);
  const talRow = r => {
    if (r.free) {
      const x = r.x, f = (fl, lab, o) => clXIn(x, 'xa', fl, lab, { ...o, dis }), t = (fl, lab, phd) => tmCell(lab, tmIn(x[fl] || '', ph(phd || '—'), `data-bind="cl-xf" data-k="xa" data-id="${ea(x.id)}" data-f="${fl}" aria-label="${ea(lab)}"`, dis));
      return `<tr class="cl-ca cl-free" data-cr="xa:${ea(x.id)}"><td class="cl-pn">${f('actor', 'Nombre', { ph: ph('Nombre') })}</td><td class="cl-pj">${f('role', 'Personaje', { ph: ph('Personaje') })}</td>
        ${t('pu', 'Recojo')}${t('call', 'Llamado', call || '—')}${t('ves', 'Vestuario')}${t('mq', 'Maquillaje')}${t('ready', 'Listos')}
        <td class="cl-pt">${f('phone', 'Teléfono', { ph: ph('Teléfono'), type: 'tel' })}${f('email', 'Correo', { ph: ph('Correo'), type: 'email', cls: 'cl-mail' })}</td><td class="cl-ob">${f('obs', 'Observaciones', { ph: ph('Observaciones') })}</td><td class="cl-px">${xBtn('cl-row-x', 'xa:' + x.id, 'Quitar la fila')}</td></tr>`;
    }
    const el = r.el, nm = r.role;
    const t = (f, lab, phd) => tmCell(lab, tmIn(r[f], phd, `data-bind="cs-cast" data-id="${ea(el.id)}" data-f="${f}" aria-label="${ea(lab)} de ${esc(nm)}"`, dis));
    return `<tr class="cl-ca" data-cr="a:${ea(el.id)}"><td class="cl-pn"><input type="text" value="${esc(r.actor)}" placeholder="${ea(ph('Sin asignar'))}" data-bind="cs-tal" data-id="${ea(el.id)}" data-f="actor" ${dis} aria-label="Actor o actriz de ${esc(el.name)}"${!r.actor && ed ? ' data-miss="1"' : ''}></td>
      <td class="cl-pj"><span class="cs-av tnum">${r.num || '·'}</span><b>${esc(nm)}</b><small class="tnum" title="Escenas de la jornada">Esc. ${esc(r.sc.join(', '))}</small></td>
      ${t('pu', 'Recojo', ph('—'))}${t('call', 'Llamado', call || '')}${t('ves', 'Vestuario', ph('—'))}${t('mq', 'Maquillaje', ph('—'))}${t('ready', 'Listos', ph('—'))}
      ${contact('cs-tal', el.id, r, el.name)}
      <td class="cl-ob"><input type="text" value="${esc(r.obs)}" placeholder="${ea(ph('Observaciones'))}" data-bind="cs-cast" data-id="${ea(el.id)}" data-f="obs" ${dis} aria-label="Observaciones de ${esc(nm)}"></td><td class="cl-px"></td></tr>`;
  };
  const castGone = callCast(de).filter(({ el }) => (dd.castx || {})[el.id]).map(({ el }) => ({ k: 'a:' + el.id, lab: titleCase(el.name) }));
  const talHTML = `<section class="cl-box cl-tal" aria-label="Talentos"><div class="cl-bh"><h3>Talentos</h3><span class="hint">${tal.length} ${tal.length === 1 ? 'persona' : 'personas'}${fig ? ` · figuración ${fig}` : ''}</span>${ed ? '<button type="button" class="cs-add" data-act="cl-row-end" data-t="xa" title="Agregar una fila libre de talentos" aria-label="Agregar una fila libre de talentos">+</button>' : ''}</div>
    <div class="cl-tw"><table class="cl-tbl cl-ptbl cl-talt cl-g"><thead><tr><th>Nombre</th><th>Personaje</th><th>Recojo</th><th>Llamado</th><th title="Vestuario">Vest.</th><th title="Maquillaje y peinado">Maq.</th><th>Listos</th><th>Teléfono</th><th>Observaciones</th><th></th></tr></thead><tbody>
      ${tal.map(talRow).join('') || `<tr data-cr="xa0:"><td colspan="${NT}" class="hint">Sin reparto en esta ${free ? 'hoja' : 'jornada'}.</td></tr>`}</tbody></table></div></section>${goneChips(castGone, 'Quitados de esta hoja:')}`;
  const NC = 7;
  const add = (dept, name) => ed ? `<button class="cs-add" data-act="cs-crew-add" data-dept="${ea(dept)}" title="Agregar en ${esc(name.toLowerCase())}" aria-label="Agregar en ${esc(name.toLowerCase())}">+</button>` : '';
  const full = crewSets.filter(([, , rows]) => rows.length), empty = crewSets.filter(x => !full.includes(x));
  const crewRow = (dept, r, dc) => {
    const head = callIsHead(heads, r) || keyCrew.some(k => k.k === r.k), hd = head ? '<small class="cl-jefe">jefe de área</small>' : '';
    if (r.free) {
      const x = r.x, f = (fl, lab, o) => clXIn(x, 'xc', fl, lab, { ...o, dis });
      return `<tr class="cl-cw cl-free" data-cr="xc:${ea(x.id)}"><td class="cl-pn">${f('name', 'Nombre', { ph: ph('Nombre') })}</td><td class="cl-pr">${f('role', 'Cargo', { ph: ph('Cargo') })}${hd}</td>
        ${tmCell('Llamado', tmIn(x.call || '', dc, `data-bind="cl-xf" data-k="xc" data-id="${ea(x.id)}" data-f="call" aria-label="Llamado" title="Vacío: la citación del área"`, dis))}
        <td class="cl-pt">${f('phone', 'Teléfono', { ph: ph('Teléfono'), type: 'tel' })}</td><td class="cl-pm">${f('email', 'Correo', { ph: ph('Correo'), type: 'email', cls: 'cl-mail' })}</td><td class="cl-ob">${f('obs', 'Observaciones', { ph: ph('Observaciones') })}</td><td class="cl-px">${xBtn('cl-row-x', 'xc:' + x.id, 'Quitar la fila')}</td></tr>`;
    }
    const c = r.c;
    return `<tr class="cl-cw" data-cr="c:${ea(c.id)}"><td class="cl-pn"><input type="text" class="cs-name" value="${esc(c.name)}" placeholder="${ea(ph('Nombre'))}" data-bind="cs-crew" data-id="${ea(c.id)}" data-f="name" ${dis} aria-label="Nombre de ${esc(c.role)}"></td>
      <td class="cl-pr"><input type="text" class="cs-role" value="${esc(c.role)}" data-bind="cs-crew" data-id="${ea(c.id)}" data-f="role" ${dis} aria-label="Cargo">${hd}</td>
      ${tmCell('Llamado', tmIn((dd.crew || {})[c.id], dc, `data-bind="cs-ccall" data-id="${ea(c.id)}" aria-label="Llamado de ${esc(c.role)}" title="Vacío: la citación del área"`, dis))}
      <td class="cl-pt"><input type="tel" value="${esc(c.phone || '')}" placeholder="${ea(ph('Teléfono'))}" data-bind="cs-crew" data-id="${ea(c.id)}" data-f="phone" ${dis} aria-label="Teléfono de ${esc(c.role)}"></td>
      <td class="cl-pm"><input type="email" class="cl-mail" value="${esc(c.email || '')}" placeholder="${ea(ph('Correo'))}" data-bind="cs-crew" data-id="${ea(c.id)}" data-f="email" ${dis} aria-label="Correo de ${esc(c.role)}"></td>
      <td class="cl-ob"><input type="text" value="${esc(r.obs)}" placeholder="${ea(ph('Observaciones'))}" data-bind="cl-cobs" data-id="${ea(c.id)}" ${dis} aria-label="Observaciones de ${esc(c.role)}"></td><td class="cl-px">${xBtn('cs-crew-x', c.id, 'Quitar de esta jornada o del equipo')}</td></tr>`;
  };
  const crewRowsHTML = full.map(([dept, name, rows, dc]) => `<tr class="cl-sep" data-cr="d:${ea(dept)}"><td colspan="2"><span>${esc(name)}</span>${add(dept, name)}</td><td class="cl-tt" title="Citación del área">${tmIn((dd.dcall || {})[dept], call || '', `data-bind="cl-dcall" data-dept="${ea(dept)}" aria-label="Citación de ${esc(name)}"`, dis)}</td><td colspan="${NC - 3}"></td></tr>`
    + rows.map(r => crewRow(dept, r, dc)).join('')).join('');
  const crewN = crewSets.reduce((a, [, , rows]) => a + rows.filter(r => r.name).length, 0), absent = C.crew.filter(c => (dd.out || {})[c.id]);
  const crewHTML = `<section class="cl-box cl-crew" aria-label="Equipo técnico"><div class="cl-bh"><h3>Equipo técnico</h3><span class="hint">${crewN} ${crewN === 1 ? 'persona' : 'personas'}</span><button type="button" class="linkbtn" data-act="cl-team">Directorio en Proyecto ›</button></div>
    <div class="cl-tw"><table class="cl-tbl cl-ptbl cl-eqt cl-g"><thead><tr><th>Nombre</th><th>Cargo</th><th>Llamado</th><th>Teléfono</th><th>Correo</th><th>Observaciones</th><th></th></tr></thead><tbody>
      ${crewRowsHTML || `<tr><td colspan="${NC}" class="hint">Sin equipo en esta ${free ? 'hoja' : 'jornada'}.</td></tr>`}</tbody></table></div></section>
    ${crewN ? '' : `<p class="hint cs-none">Nadie del equipo tiene nombre todavía. ${ed ? 'Agrégalo con «+» en cada área o carga el directorio completo en Proyecto: sirve para todas las jornadas.' : 'Se carga en Proyecto › Equipo.'}</p>`}
    ${empty.length && ed ? `<div class="cs-folds">${empty.map(([dept, name]) => `<div class="cs-fold"><span>${esc(name)}</span>${add(dept, name)}</div>`).join('')}</div>` : ''}
    ${absent.length ? `<div class="cs-out"><span>No vienen esta jornada:</span>${absent.map(c => `<button class="chip" data-act="cs-crew-back" data-id="${ea(c.id)}" ${dis} title="Vuelve a esta jornada">${esc(c.name || c.role)}${c.name ? ` <small>${esc(c.role)}</small>` : ''} <span aria-hidden="true">↺</span></button>`).join('')}</div>` : ''}`;
  // 7. (lote AH) debajo, lo demás, cada cosa en su cuadro: la utilería especial (lote U: antes, en la cabecera)…
  const propsAuto = callProps(de).join(', '), propsTxt = callPropsText(de, dd), propsOv = dd.props != null;
  const utlHTML = propsTxt || (ed && !free) || propsOv ? `<section class="cl-box cl-utl"><div class="cl-bh"><h3>Utilería especial</h3><span class="hint">${propsOv ? 'escrita en esta hoja' : 'del desglose'}</span></div><div class="cl-bb">${ed
    ? `<textarea rows="${clRows(propsTxt)}" class="cl-in cl-ta${propsOv ? ' ov' : ''}" data-bind="cl-props" aria-label="Utilería especial" placeholder="${ea(propsAuto || 'Utilería, armas, efectos…')}" title="${ea(propsOv ? 'Escrita en esta hoja. Bórrala para volver a la del desglose' + (propsAuto ? ': «' + propsAuto + '»' : '') : 'La utilería, las armas y los efectos del desglose de las escenas del día. Lo que escribas queda solo en esta hoja')}" ${dis}>${esc(propsTxt)}</textarea>`
    : `<p class="cl-util">${esc(propsTxt)}</p>`}</div></section>` : '';
  // …el punto de encuentro (lote W: su dirección, su referencia, los enlaces y las fotos; lote AH: debajo de la cabecera)…
  const links = (m.links || []).map(safeUrl);   // en el orden de m.links (para quitar uno)
  const phs = (m.ph || []).filter(p => frameHas(clPhKey(d.id, p.id)) || FRAMES[clPhKey(d.id, p.id)]);
  if (phs.length) candFramesNeed(phs.map(p => clPhKey(d.id, p.id)), 'call');
  const mAddr = (m.addr || '').trim(), mNote = (m.note || '').trim();
  const meetHTML = ed || mAddr || mNote || links.some(Boolean) || phs.length ? `<section class="cl-box cl-meet"><div class="cl-bh"><h3>Punto de encuentro</h3></div><div class="cl-bb cl-mp2"><div class="cl-mp">
      ${ed || mAddr ? `<input type="text" class="cl-addr" value="${esc(m.addr || '')}" placeholder="${esc(L.addr || ph('Dirección de citación'))}" data-bind="cl-meet" data-f="addr" ${dis} aria-label="Dirección del punto de encuentro"${L.addr && !mAddr ? ' title="Vacía: la dirección de la locación"' : ''}>` : ''}
      ${ed || mNote ? `<textarea rows="${Math.min(4, Math.max(1, Math.ceil((m.note || '').length / 60), (m.note || '').split('\n').length))}" class="cl-park" placeholder="${ea(ph('Referencia: puerta, estacionamiento, piso…'))}" data-bind="cl-meet" data-f="note" ${dis} aria-label="Referencia del punto de encuentro">${esc(m.note || '')}</textarea>` : ''}
      ${ed || links.some(Boolean) ? `<div class="cl-links">${links.map((u, i) => u ? `<span class="chip"><a href="${ea(u)}" target="_blank" rel="noopener noreferrer">${esc(linkName(u))}</a>${ed ? `<button class="x" data-act="cl-link-x" data-i="${i}" aria-label="Quitar el enlace" title="Quitar el enlace">${ICO.close}</button>` : ''}</span>` : '').join('')}${ed ? `<input type="url" class="cl-link-in" placeholder="+ Enlace (Google Maps, Waze…)" data-bind="cl-link" aria-label="Agregar un enlace">` : ''}</div>` : ''}</div>
      ${ed || phs.length ? `<div class="cl-mph">${candPhotosHTML({ id: d.id, ph: m.ph || [] }, pid => clPhKey(d.id, pid), ed, 'cl', 'cl-up', 'Punto de encuentro')}</div>` : ''}</div></section>` : '';
  // …la movilidad (lote W)…
  const people = callPeople(de, dd), mov = dd.mov || [];
  const used = new Set(mov.flatMap(x => [x.driver, ...x.pax]).filter(Boolean));
  const freeP = people.filter(p => !used.has(p.k));
  const prevMov = !free && n > 0 ? (peekDay(days[n - 1].id).mov || []) : [];
  const movHTML = mov.map((x, vi) => {
    const drv = drvName(x, people), pax = x.pax.map(k => callWho(people, k)).filter(Boolean);
    return `<div class="cl-veh"><div class="cl-veh-h"><span class="cl-vn tnum">${vi + 1}</span><input type="text" value="${esc(x.name || '')}" placeholder="${ea(ph('Vehículo (camioneta, auto, minivan…)'))}" data-bind="cl-veh" data-id="${ea(x.id)}" ${dis} aria-label="Vehículo ${vi + 1}">${xBtn('cl-veh-del', x.id, 'Quitar el vehículo')}</div>
      <div class="cl-veh-b"><label class="cl-drv"><span>Conductor</span><input type="text" list="clDrvL" data-bind="cl-drv" data-id="${ea(x.id)}" value="${esc(drv)}" placeholder="${ea(ph('Proveedor o nombre'))}" autocomplete="off" ${dis} aria-label="Conductor del vehículo ${vi + 1}: un proveedor o un nombre"></label>
      <div class="cl-pax">${pax.map(p => `<span class="cl-p">${esc(p.name)}<small>${esc(p.sub)}</small>${ed ? `<button class="x" data-act="cl-pax-x" data-id="${ea(x.id)}" data-k="${ea(p.k)}" aria-label="Quitar a ${esc(p.name)}" title="Quitar">${ICO.close}</button>` : ''}</span>`).join('')}${ed && freeP.length ? `<button class="cs-add" data-act="cl-pax-add" data-id="${ea(x.id)}" title="Agregar pasajeros" aria-label="Agregar pasajeros al vehículo ${vi + 1}" aria-haspopup="menu">+</button>` : ''}${!pax.length && !ed ? '<span class="hint">Sin pasajeros.</span>' : ''}</div>
      <span class="cl-cnt tnum">${(drv ? 1 : 0) + pax.length} ${(drv ? 1 : 0) + pax.length === 1 ? 'persona' : 'personas'}</span></div></div>`;
  }).join('');
  const movSec = mov.length || ed ? `<section class="cl-box cl-mov"><div class="cl-bh"><h3>Movilidad</h3><span class="hint">${mov.length ? `${mov.length} ${mov.length === 1 ? 'vehículo' : 'vehículos'}${freeP.length ? ` · ${freeP.length} sin asignar` : ''}` : ''}</span>${ed ? '<button class="cs-add" data-act="cl-veh-add" title="Agregar un vehículo" aria-label="Agregar un vehículo">+</button>' : ''}</div>
    ${mov.length && ed ? `<datalist id="clDrvL">${C.vendors.filter(v => (v.name || '').trim()).map(v => `<option value="${ea(v.name.trim())}">${esc([v.gear, v.contact].filter(Boolean).join(' · '))}</option>`).join('')}</datalist>` : ''}
    ${movHTML || `<p class="hint cs-none">Agrega los vehículos con «+»: el conductor (un proveedor o un nombre) y los pasajeros, del equipo y del reparto.${prevMov.length ? ` <button class="linkbtn" data-act="cl-mov-copy">Copiar la de la jornada ${n}</button>` : ''}</p>`}
    ${mov.length && freeP.length && ed ? `<p class="hint cl-free">Sin vehículo: ${esc(freeP.map(p => p.name).join(', '))}</p>` : ''}</section>` : '';
  // …y, al final (lote AH: antes, al pie de página), el centro de salud y los canales de radio, en un cuadro
  const hIn = (f, phd, lab, miss) => `<input type="${f === 'phone' ? 'tel' : 'text'}" value="${esc((dd.hosp || {})[f] || '')}" placeholder="${esc(C.hospital[f] || phd)}" data-bind="cs-hosp" data-f="${f}" ${dis} aria-label="${ea(lab)}"${C.hospital[f] ? ' class="hd-auto"' : ''}${miss ? ' data-miss="1"' : ''}>`;
  const hrHTML = `<section class="cl-box cl-hr"><div class="cl-fh">${CL_ICO.hosp}<div><span class="cl-kl">Centro de salud</span>${hIn('name', ph('Falta', '-'), 'Centro de salud', !(hosp.name || '').trim() && ed)}${hIn('phone', ph('Teléfono', '-'), 'Teléfono del centro de salud')}${hIn('addr', ph('Dirección', '-'), 'Dirección del centro de salud')}</div></div>
    <div class="cl-fr">${CL_ICO.radio}<div><span class="cl-kl">Canales de radio</span><input type="text" value="${esc(C.radio || '')}" placeholder="${ea(ph('1 Producción, 2 Libre, 3 Transporte…'))}" data-bind="cl-radio" maxlength="300" ${dis} aria-label="Canales de radio (para todas las jornadas)" title="Se escriben una vez y salen en todas las hojas"></div></div></section>`;
  // el selector: las jornadas del plan, las hojas libres y «+ Hoja libre»
  const sel = `<select data-bind="cs-sel" style="max-width:320px;width:auto" aria-label="Hoja de llamado">${days.map((x, i) => { const own = feDate(peekDay(x.id).date) || dates[i]; return `<option value="${i}" ${!free && i === n ? 'selected' : ''}>Jornada ${i + 1}${own ? ' · ' + esc(fmtDate(own)) : ''} · ${x.keys.length} esc.</option>`; }).join('')}
    ${frees.length ? `<optgroup label="Hojas libres">${frees.map(f => `<option value="f:${ea(f.id)}" ${free && f.id === S.free.id ? 'selected' : ''} data-no-tr>${esc((f.name || '').trim() || tr('Hoja libre'))}</option>`).join('')}</optgroup>` : ''}${ed ? '<option value="+">+ Hoja libre</option>' : ''}</select>`;
  v.innerHTML = `<div class="ws ws-1"><section class="center">
    <div class="bar">
      ${sel}${free && ed ? `<button type="button" class="btn ghost sm" data-act="cl-free-del" title="Borrar esta hoja libre" aria-label="Borrar esta hoja libre">${ICO.trash}</button>` : ''}
      <span class="grow"></span>
      ${toolsHTML()}
    </div>
    ${legendHTML('call')}
    <div class="scroller pad" data-keep="call"><div class="cs cl">
      <article class="cl-doc">
      <section class="hd cl-hd" aria-label="Cabecera de la hoja de llamado">
        <div class="cl-acts"><span class="grow"></span>${status}</div>
        <div class="cl-box cl-top">${colL}${colC}${colR}</div>
      </section>
      ${headsHTML}
      ${noteHTML}
      ${schedTools}${schedHTML}${goneChips(Sc.gone, 'Quitadas de esta hoja:')}
      ${advTools}${advHTML}
      ${talHTML}
      ${crewHTML}
      ${utlHTML}
      ${meetHTML}
      ${movSec}
      ${hrHTML}
      </article>
    </div></div></section></div>`;
  bindView();
  clBindRows(v);
  if (thumbs && typeof hydrateThumbs === 'function') hydrateThumbs();
};
/* (lote AH) el clic derecho en las filas de la hoja (cronograma, talentos, equipo): agregar una fila arriba o abajo,
   quitarla, volver a lo del stripboard y, en el equipo, «Jefe de área». En el teléfono, el dedo sostenido abre lo mismo */
function clBindRows(v) {
  if (v._clRows) return; v._clRows = true;
  const rowOf = t => UI.tab === 'call' && callEditable() ? t.closest && t.closest('.cl-doc [data-cr]') : null;
  let tm = 0, x0 = 0, y0 = 0, held = 0;
  const off = () => { clearTimeout(tm); tm = 0; };
  v.addEventListener('contextmenu', e => {
    const r = rowOf(e.target); if (!r) return;
    // el dedo sostenido ya lo abrió (o lo abre este evento, en Android): una sola vez
    if (Date.now() - held < 1500) { e.preventDefault(); return; }
    // en un campo con texto elegido queda el menú del sistema (copiar, pegar)
    if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.target.selectionStart !== e.target.selectionEnd) return;
    e.preventDefault(); off();
    clRowMenu({ left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY }, r);
  });
  v.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const r = rowOf(e.target); if (!r) return;
    x0 = e.clientX; y0 = e.clientY; off();
    tm = setTimeout(() => { tm = 0; held = Date.now(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); clRowMenu({ left: x0, right: x0, top: y0, bottom: y0 }, r); }, 550);
  });
  v.addEventListener('pointermove', e => { if (tm && Math.hypot(e.clientX - x0, e.clientY - y0) > 10) off(); });
  for (const t of ['pointerup', 'pointercancel', 'scroll']) v.addEventListener(t, off, true);
  // los campos de varias líneas crecen con lo que se escribe (donde el navegador no lo hace solo)
  v.addEventListener('input', e => { const t = e.target; if (t.classList && t.classList.contains('cl-ta') && !CSS.supports('field-sizing', 'content')) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; } });
}
const clSplit = cr => { const i = cr.indexOf(':'); return [cr.slice(0, i), cr.slice(i + 1)]; };
function clRowMenu(anchor, row) {
  const cr = row.dataset.cr, [k, id] = clSplit(cr), dd = peekDay(curDayId());
  const items = [];
  const canAdd = !['x0', 'xa0'].includes(k);
  if (k === 'd') items.push(['add-top', 'Agregar una fila en el área']);
  else if (canAdd) items.push(['up', 'Agregar fila arriba'], ['down', 'Agregar fila abajo']);
  else items.push(['first', 'Agregar una fila']);
  if (k === 'r' && row.classList.contains('cl-lsc')) items.push(['shot', 'Agregar un plano']);
  const ovOn = k === 'r' ? !!((dd.rov || {})[id] || (dd.at || {})[id] || (dd.dur || {})[id]) : k === 's' ? !!((dd.sov || {})[id] || (dd.shotAt || {})[id] != null) : false;
  if (ovOn) items.push(['guide', 'Volver a lo del stripboard']);
  if (k === 'c' || k === 'xc') {
    const S = callSheet(callRef()), dd2 = peekDay(S.d.id), heads = callHeads(callCrewRows(dd2, ''), callKeyCrew(dd2)), on = heads.some(h => h.k === cr);
    items.push(['head', on ? 'Ya no es jefe de área' : 'Jefe de área']);
  }
  if (!['d', 'x0', 'xa0'].includes(k)) items.push(['del', k === 'c' ? 'No viene esta jornada' : 'Quitar fila']);
  const what = { r: 'Fila del cronograma', s: 'Plano', x: 'Fila libre', xs: 'Plano libre', a: 'Talento', xa: 'Talento (fila libre)', c: 'Equipo técnico', xc: 'Equipo técnico (fila libre)', d: 'Equipo técnico', x0: 'Cronograma', xa0: 'Talentos' }[k] || '';
  popover(anchor, `<h5>${esc(what)}</h5><div class="menu cl-rmenu">${items.map(([m, t]) => `<button data-m="${m}"${m === 'del' ? ' style="color:var(--bad)"' : ''}>${esc(t)}</button>`).join('')}</div>`, p => p.addEventListener('click', e => {
    const b = e.target.closest('[data-m]'); if (!b) return; closePop();
    const mm = b.dataset.m;
    if (mm === 'up' || mm === 'down') clAddRow(cr, mm === 'up', row);
    else if (mm === 'add-top') clAddRow(cr, true, row);
    else if (mm === 'first') clAddRow(k === 'xa0' ? 'xa0:' : 'x0:', false, row);
    else if (mm === 'shot') clAddShot(cr);
    else if (mm === 'guide') clGuideRow(cr);
    else if (mm === 'head') clToggleHead(cr);
    else if (mm === 'del') clDelRow(cr, row);
  }));
}
/* una fila libre al lado de cr (up: arriba). En el cronograma, una fila (o un plano, junto a un plano); en los talentos,
   un talento; en el equipo, una persona del área de cr. Queda solo en esta hoja */
function clAddRow(cr, up, row) {
  const id = curDayId(); if (!id) return;
  const [k, rid] = clSplit(cr), dd = dayData(id), nid = uid('x'), at = ['x0', 'xa0', 'd'].includes(k) ? '' : cr, o = { id: nid, at, ...(up && at ? { up: true } : {}) };
  histNote('Agregar una fila');
  let kind = 'x';
  if (k === 'r' || k === 'x' || k === 'x0') (dd.xrows = dd.xrows || []).push(o);
  else if (k === 's' || k === 'xs') { kind = 'xs'; (dd.xsh = dd.xsh || []).push({ ...o, in: row && row.dataset.in || '' }); }
  else if (k === 'a' || k === 'xa' || k === 'xa0') { kind = 'xa'; (dd.xcast = dd.xcast || []).push(o); }
  else {
    kind = 'xc';
    const dept = k === 'd' ? rid : k === 'c' ? (CALL().crew.find(c => c.id === rid) || {}).dept : ((dd.xcrew || []).find(x => x.id === rid) || {}).dept;
    (dd.xcrew = dd.xcrew || []).push({ ...o, dept: dept || 'other', ...(k === 'd' ? { up: true } : {}) });
  }
  changed('data'); render();
  // se escribe primero lo principal de la fila: la escena o actividad, la descripción del plano, el nombre
  const f0 = { x: 'set', xs: 'desc', xa: 'actor', xc: 'name' }[kind];
  requestAnimationFrame(() => { const r = $(`[data-cr="${kind}:${CSS.escape(nid)}"]`), i = r && ($(`[data-f="${f0}"]`, r) || $('input,textarea', r)); if (i) { i.scrollIntoView({ block: 'nearest' }); i.focus(); } });
  toastUndo('Fila agregada: queda solo en esta hoja.');
}
/* al final de una tabla (el «+ Fila» del cronograma y el «+» de los talentos) */
function clRowEnd(t) {
  const S = callSheet(callRef()); if (!S) return;
  if (t === 'xa') { const T = callTalentRows(S.de, peekDay(S.d.id)); clAddRow(T.length ? T[T.length - 1].k : 'xa0:', false); return; }
  const Sc = callSched(S.d), all = [...Sc.rows, ...Sc.close];
  clAddRow(all.length ? all[all.length - 1].k : 'x0:', false);
}
/* un plano libre al final de los planos de una escena */
function clAddShot(cr) {
  const S = callSheet(callRef()); if (!S) return;
  const r = callSched(S.d).rows.find(o => o.k === cr); if (!r) return;
  const last = (r.shots || [])[r.shots.length - 1], id = curDayId(), dd = dayData(id), nid = uid('x');
  histNote('Agregar un plano');
  (dd.xsh = dd.xsh || []).push({ id: nid, in: cr, at: last ? last.k : '' });
  changed('data'); render();
  requestAnimationFrame(() => { const i = $(`[data-cr="xs:${CSS.escape(nid)}"] [data-f="desc"]`); if (i) { i.scrollIntoView({ block: 'nearest' }); i.focus(); } });
  toastUndo('Plano agregado: queda solo en esta hoja (el storyboard no cambia).');
}
/* quitar una fila de la hoja: las del stripboard y el reparto quedan quitadas solo aquí (se vuelven a poner con su ↺);
   un plano quitado lleva en el storyboard y el guion técnico la etiqueta «Eliminado en la hoja de llamado»; las filas
   libres se borran; alguien del equipo, «no viene esta jornada» */
function clDelRow(cr, row) {
  const id = curDayId(); if (!id) return;
  const [k, rid] = clSplit(cr), dd = dayData(id), set = (f, key) => { dd[f] = { ...(dd[f] || {}), [key]: 1 }; };
  histNote('Quitar una fila');
  if (k === 'r') set('rx', rid);
  else if (k === 's') set('shx', rid);
  else if (k === 'a') set('castx', rid);
  else if (k === 'c') set('out', rid);
  else {
    const f = { x: 'xrows', xs: 'xsh', xa: 'xcast', xc: 'xcrew' }[k]; if (!f || !dd[f]) return;
    const gone = dd[f].find(x => x.id === rid); if (!gone) return;
    // las que iban junto a esta fila pasan a su lugar
    for (const x of dd[f]) if (x.at === cr) { x.at = gone.at; if (gone.up) x.up = true; else delete x.up; }
    dd[f] = dd[f].filter(x => x.id !== rid); if (!dd[f].length) delete dd[f];
  }
  changed('data'); render();
  toastUndo(k === 's' ? 'Plano quitado de esta hoja. En el storyboard queda marcado como eliminado en la hoja de llamado.' : k === 'c' ? 'No viene a esta jornada.' : /^x/.test(k) ? 'Fila borrada.' : 'Quitada de esta hoja. El plan de rodaje no cambia.');
}
/* volver a poner en la hoja lo quitado (su ↺) */
function clBack(cr) {
  const id = curDayId(); if (!id) return;
  const [k, rid] = clSplit(cr), dd = dayData(id), f = { r: 'rx', s: 'shx', a: 'castx' }[k]; if (!f || !dd[f]) return;
  histNote('Volver a poner una fila');
  delete dd[f][rid]; if (!Object.keys(dd[f]).length) delete dd[f];
  changed('data'); render();
}
/* una fila o un plano vuelve a lo del stripboard: sus campos y su hora */
function clGuideRow(cr) {
  const id = curDayId(); if (!id) return;
  const [k, rid] = clSplit(cr), dd = dayData(id), del = (f, key) => { if (dd[f]) { delete dd[f][key]; if (!Object.keys(dd[f]).length) delete dd[f]; } };
  histNote('Volver a lo del stripboard');
  if (k === 'r') { del('rov', rid); del('at', rid); del('dur', rid); }
  else if (k === 's') { del('sov', rid); del('shotAt', rid); }
  changed('data'); render(); toastUndo('La fila vuelve a lo del stripboard.');
}
/* jefe de área (o ya no): en el directorio del proyecto (todas las hojas) o en la fila libre */
function clToggleHead(cr) {
  const S = callSheet(callRef()); if (!S) return;
  const [k, rid] = clSplit(cr), dd = peekDay(S.d.id), heads = callHeads(callCrewRows(dd, ''), callKeyCrew(dd)), on = heads.some(h => h.k === cr);
  const o = k === 'c' ? CALL().crew.find(c => c.id === rid) : (dayData(S.d.id).xcrew || []).find(x => x.id === rid); if (!o) return;
  histNote(on ? 'Ya no es jefe de área' : 'Jefe de área');
  // al marcar a alguien, los demás de su área que eran jefes por su cargo dejan de serlo en el cuadro (manda la marca)
  o.head = !on;
  changed('data'); render();
  toastUndo(on ? `${o.name || o.role || 'Ya'} no sale en «Jefes de área».` : `${o.name || o.role || 'Sale'} sale en «Jefes de área», con su teléfono.`);
}
/* (lote AH) la fecha de la hoja. En una jornada del plan se elige cada vez: «Solo esta hoja» (el plan y el calendario no
   cambian; la hoja tiene «Volver a la fecha del plan») o «Correr esta jornada y las siguientes» (en el plan y el
   calendario: callShiftDates). En una hoja libre, su fecha y nada más */
function clDateMenu(anchor) {
  const ref = callRef(), cd = callDays(), S = callSheet(ref, cd); if (!S) return;
  const iso = S.date ? feIso(S.date) : '', marks = typeof planShootMarks === 'function' ? planShootMarks() : null;
  const title = S.free ? 'Fecha de la hoja' : `Fecha de la jornada ${S.n + 1}`;
  popover(anchor, `<h5>${esc(title)}</h5><div class="fcal"><div class="fcal-box"></div>${fechaQuick(iso)}${marks && marks.size ? '<p class="fcal-leg"><i></i>Días de rodaje</p>' : ''}</div>`, p => {
    p.classList.add('pop-fcal');
    const pick = nd => {
      if (!nd || nd === iso) { closePop(); return; }
      if (S.free) { closePop(); clSetDate(S, nd, 'one'); return; }
      // la jornada y las que vienen después: cuántas y cuántos días se corren
      const delta = S.plan ? Math.round((feDate(nd) - feDate(feIso(S.plan))) / 864e5) : 0, last = cd.days.length, canPlan = planEditable();
      const what = !delta ? '' : Math.abs(delta) === 1 ? (delta > 0 ? '1 día después' : '1 día antes') : delta > 0 ? `${delta} días después` : `${-delta} días antes`;
      // (cada pedazo en su línea: así cada uno se traduce por su lado)
      p.innerHTML = `<h5>${esc(cap1(fechaFmt(nd)))}</h5><div class="menu cl-dscope">
        <button data-sc="one"><b>Solo esta hoja</b><small>El plan de rodaje y el calendario no cambian.</small></button>
        <button data-sc="all" ${canPlan ? '' : 'disabled'}><b>Correr esta jornada y las siguientes</b>${canPlan ? `<small>${last > S.n + 1 ? `Jornadas ${S.n + 1} a ${last}` : `Jornada ${S.n + 1}`}${what ? ` · <span>${what}</span>` : ''}</small><small>En el plan de rodaje y en el calendario.</small>` : '<small>Solo quien edita el plan de rodaje puede correr las fechas.</small>'}</button></div>`;
      p.querySelector('.cl-dscope').addEventListener('click', e => { const b = e.target.closest('[data-sc]'); if (!b || b.disabled) return; closePop(); clSetDate(S, nd, b.dataset.sc); });
      const f = p.querySelector('[data-sc="one"]'); if (f) f.focus();
    };
    fechaCalMount(p, iso, pick, marks);
    requestAnimationFrame(() => { const f = p.querySelector('.fcal-d[tabindex="0"]'); if (f && UI.kbd) f.focus(); });
  });
}
function clSetDate(S, iso, how) {
  if (how === 'all') {
    histNote(`Correr las fechas desde la jornada ${S.n + 1}`);
    const k = callShiftDates(S.n, iso);
    const dd = dayData(S.d.id); delete dd.date;
    changed('data'); render();
    toastUndo(k > 1 ? `Jornadas ${S.n + 1} a ${S.n + k} corridas en el plan y el calendario.` : `Jornada ${S.n + 1} con fecha nueva en el plan y el calendario.`);
    return;
  }
  histNote('Cambiar la fecha de la hoja');
  const dd = dayData(S.d.id);
  if (!S.free && S.plan && feIso(S.plan) === iso) delete dd.date; else dd.date = iso;
  changed('data'); render();
  toastUndo(S.free ? 'Fecha de la hoja cambiada.' : 'Fecha cambiada solo en esta hoja: el plan y el calendario siguen igual.');
}
/* (lote AH) correr la jornada n a la fecha iso y, con ella, las siguientes, en el plan de rodaje (y así en el calendario).
   Como salen las fechas (shootDates): la primera jornada empieza en «Empieza» (P.schedule.start); una jornada con fecha
   propia (brk.date) la fija y las demás siguen al próximo día de rodaje (sin los días libres). Aquí: la jornada n toma
   la fecha nueva (la primera, como comienzo del rodaje); las siguientes sin fecha propia la siguen solas; las que tenían
   fecha propia se corren los mismos días (a un día de rodaje y después de la anterior), también las de otras etapas.
   Devuelve cuántas jornadas cambiaron de fecha */
function callShiftDates(n, iso) {
  const Sch = P.schedule, { days } = scheduleDays(P, D.sc), before = shootDates(P, days.length), d = days[n];
  if (!d || !feDate(iso)) return 0;
  const nd = feDate(iso), delta = before[n] ? Math.round((nd - feDate(feIso(before[n]))) / 864e5) : 0, off = new Set(Sch.off || []);
  const work = x => { for (let g = 0; off.has(x.getDay()) && g < 7; g++) x = feAdd(x, 1); return x; };
  if (n === 0) { Sch.start = iso; delete d.brk.date; } else d.brk.date = iso;
  let prev = nd;
  for (let j = n + 1; j < days.length; j++) {
    const b = days[j].brk;
    if (b.date && feDate(b.date)) {
      let x = feAdd(feDate(b.date), delta);
      if (x <= prev) x = feAdd(prev, 1);
      x = work(x); b.date = feIso(x); prev = x;
    } else prev = work(feAdd(prev, 1));
  }
  const after = shootDates(P, days.length);
  return after.filter((x, j) => j >= n && (!before[j] || !x || feIso(x) !== feIso(before[j]))).length;
}
/* el punto de encuentro de la hoja abierta (create: lo crea si no existe) */
const meetOf = create => { const id = curDayId(); if (!id) return null; const d = create ? dayData(id) : peekDay(id); if (!d.meet && create) d.meet = { addr: '', note: '', links: [], ph: [] }; return d.meet || null; };
const movOf = vid => { const id = curDayId(); if (!id) return null; const d = dayData(id); return (d.mov || []).find(x => x.id === vid) || null; };
function paxMenu(b, vid) {
  const id = curDayId(); if (!id) return;
  const S = callSheet(callRef()), dd = peekDay(id), people = callPeople(S.de, dd), mov = dd.mov || [];
  const used = new Set(mov.flatMap(x => [x.driver, ...x.pax]).filter(Boolean)), free = people.filter(p => !used.has(p.k));
  if (!free.length) { toast('Todos ya tienen vehículo.'); return; }
  popover(b, `<h5>Agregar al vehículo</h5><div class="menu cl-pmenu">${free.map(p => `<button data-k="${ea(p.k)}">${esc(p.name)} <small>${esc(p.sub)}</small></button>`).join('')}</div>`, pp => pp.addEventListener('click', e => {
    const x = e.target.closest('[data-k]'); if (!x) return; closePop();
    const v = movOf(vid); if (!v) return;
    v.pax = [...v.pax, x.dataset.k]; changed('data'); render();
    // para agregar a varios seguidos, el menú vuelve a abrirse
    requestAnimationFrame(() => { const nb = $(`[data-act="cl-pax-add"][data-id="${CSS.escape(vid)}"]`); if (nb) paxMenu(nb, vid); });
  }));
}
/* (lote AH) las hojas libres: una nueva (abierta enseguida, con su nombre por escribir) y borrar la abierta */
function callFreeNew() {
  if (!callEditable()) return;
  histNote('Nueva hoja libre');
  const C = CALL(), f = { id: uid('f'), name: '' };
  C.free = [...callFrees(), f];
  UI.callFree = f.id; changed('data'); render();
  requestAnimationFrame(() => { const i = $('[data-bind="cl-fname"]'); if (i) i.focus(); });
  toastUndo('Hoja libre nueva: se llena a mano, campo por campo.');
}
/* el avance: agregar cualquier jornada (o quitarla); al tocarlo por primera vez se parte del avance automático */
function clAdvSet(fn) {
  const id = curDayId(); if (!id) return;
  const cd = callDays(), dd = dayData(id), cur = callAdvIds(callRef(), cd);
  histNote('Cambiar el avance');
  dd.adv = fn(cur.slice()).filter((x, i, a) => a.indexOf(x) === i);
  changed('data'); render();
}
Object.assign(ACT, {
  'cs-plan': () => setTab('plan'),
  'cl-exp': b => exportPDF('call', b, { all: false, share: true }),
  // el resumen para el chat: lo que se busca primero en el teléfono, con el enlace al mapa
  'cl-copy': async () => {
    const ref = callRef(), X = callSheetData(ref), m = X.meet;
    const addr = X.loc.addr || (m.addr || '').trim() || '', url = X.loc.url || mapsUrl(m, X.locs);
    const L = [`${P.meta.title} · ${tr('Hoja de llamado')} · ${X.free ? X.title : trDone(tr(X.title))}`, X.date ? capFirst(X.date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })) : '',
      `${tr('Llamado general')}: ${X.call || '—'}`, X.loc.name || addr ? `${tr('Locación')}: ${[X.loc.name, addr].filter(Boolean).join(' · ')}` : '', url ? `${tr('Mapa')}: ${url}` : '',
      `${tr('Centro de salud')}: ${[X.hosp.name, X.hosp.addr, X.hosp.phone].filter(Boolean).join(' · ') || '—'}`, (X.dd.notes || '').trim(), ...(X.advs.length ? X.advs.map(advLine) : X.lastDay ? [advLine(null)] : [])].filter(Boolean);
    try { await navigator.clipboard.writeText(L.join('\n')); toast('Resumen copiado: pégalo en el chat junto al PDF.', 3500); }
    catch (e) { toast('No se pudo copiar el resumen. Tu navegador no deja usar el portapapeles en esta vista.'); }
  },
  'cl-team': () => { setTab('project'); requestAnimationFrame(() => { const t = $('#view .pj-team'); if (t) { t.scrollIntoView({ block: 'start', behavior: 'smooth' }); const f = $('input, button', t); if (f) f.focus({ preventScroll: true }); } }); },
  // un dato que falta: se va a su campo (o a la pestaña donde se completa) y se marca un momento
  'cl-go': b => {
    const x = callMissing(callRef()).find(y => y.k === b.dataset.k); if (!x) { render(); return; }
    if (x.tab) { setTab(x.tab); if (x.hint) toast(x.hint, 4500); return; }
    const el = $('#view ' + x.sel); if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const f = el.matches('input, textarea, select, button') ? el : $('.cs-add, input', el);
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 250);
    el.classList.add('cl-flash'); setTimeout(() => el.classList.remove('cl-flash'), 1600);
  },
  'cl-veh-add': () => {
    const id = curDayId(); if (!id) return;
    const d = dayData(id), v = { id: uid('v'), name: '', driver: '', pax: [] };
    d.mov = [...(d.mov || []), v]; changed('data'); render();
    requestAnimationFrame(() => { const i = $(`[data-bind="cl-veh"][data-id="${CSS.escape(v.id)}"]`); if (i) i.focus(); });
  },
  'cl-veh-del': b => { const id = curDayId(); if (!id) return; const d = dayData(id); histNote('Quitar un vehículo'); d.mov = (d.mov || []).filter(x => x.id !== b.dataset.id); if (!d.mov.length) delete d.mov; changed('data'); render(); toastUndo('Vehículo quitado.'); },
  'cl-pax-add': b => paxMenu(b, b.dataset.id),
  'cl-pax-x': b => { const v = movOf(b.dataset.id); if (!v) return; v.pax = v.pax.filter(k => k !== b.dataset.k); changed('data'); render(); },
  // la movilidad de la jornada anterior, con las personas que vienen hoy
  'cl-mov-copy': () => {
    const id = curDayId(), S = callSheet(callRef()); if (!id || !S || S.free || !S.n) return;
    const { days } = callDays(), prev = peekDay(days[S.n - 1].id).mov || [];
    const here = new Set(callPeople(S.de, peekDay(id)).map(p => p.k));
    // el conductor (proveedor o nombre) se copia tal cual; si era alguien del equipo o del reparto, solo si viene hoy
    dayData(id).mov = prev.map(x => ({ id: uid('v'), name: x.name, driver: /^x?[ca]:/.test(x.driver || '') ? (here.has(x.driver) ? x.driver : '') : x.driver || '', pax: x.pax.filter(k => here.has(k)) }));
    changed('data'); render(); toastUndo(`Movilidad copiada de la jornada ${S.n}.`);
  },
  'cl-link-x': b => { const m = meetOf(true); if (!m) return; m.links = m.links.filter((_, i) => i !== +b.dataset.i); changed('data'); render(); },
  'cl-view': b => { const m = ((CALL().days || {})[b.dataset.id] || {}).meet || {}, ks = (m.ph || []).map(p => clPhKey(b.dataset.id, p.id)); photoViewer(ks, 'Punto de encuentro', { at: ks.indexOf(clPhKey(b.dataset.id, b.dataset.p)) }); },
  'cl-phdel': b => { const m = meetOf(true); if (!m) return; candDelPhoto(m, pid => clPhKey(b.dataset.id, pid), b.dataset.p, 'call'); render(); toastUndo('Foto quitada.'); },
  'cs-crew-add': b => crewAdd(b, b.dataset.dept),
  // una fila «+» de la cabecera (la nota, el clima): se abren sus campos y se escribe en el primero
  'cs-open': b => { (UI.csOpen || (UI.csOpen = new Set())).add(b.dataset.k); render(); requestAnimationFrame(() => { const i = b.dataset.k === 'notes' ? $('[data-bind="cs-day"][data-f="notes"]') : b.dataset.k === 'wx' ? $('[data-bind="cs-wx"][data-f="wx"]') : $('[data-bind="cs-hosp"][data-f="name"]'); if (i) i.focus(); }); },
  // ‹ › de la cabecera: la jornada anterior o la siguiente (la misma en la hoja de script)
  'cl-day': b => { UI.callDay = +b.dataset.d; UI.supDay = UI.callDay; UI.callFree = null; render(); },
  // el aviso «Faltan datos»: la lista, con dónde se completa cada uno; un toque lleva al campo
  'cl-miss': b => {
    const miss = callMissing(callRef()); if (!miss.length) { render(); return; }
    const WHERE = { date: 'Arriba, al centro', call: 'Arriba, al centro', meet: 'Locación, arriba a la derecha', hosp: 'Al final de la hoja', cast: 'Talentos', crew: 'Equipo técnico' };
    const items = miss.map(x => ({ txt: capFirst(x.txt) + (x.name ? ` <span data-no-tr>${esc(x.name)}</span>` : ''), sub: WHERE[x.k] || '', attrs: `data-k="${ea(x.k)}"` }));
    popover(b, hdPopList(miss.length === 1 ? 'Para enviarla falta 1 dato' : `Para enviarla faltan ${miss.length} datos`, items,
      `<span>${miss.length === 1 ? 'Sin ese dato, el PDF dice «Por confirmar».' : 'Sin esos datos, el PDF dice «Por confirmar».'}</span>${hdBtn('sec', 'Exportar igual', { sm: true, attrs: 'data-x="1"' })}`), p => p.addEventListener('click', e => {
      const x = e.target.closest('[data-k], [data-x]'); if (!x) return; closePop();
      if (x.dataset.x) ACT['cl-exp'](b); else ACT['cl-go'](x);
    }));
  },
  // ✕ de una persona: no viene esta jornada (lo normal) o sale del equipo del proyecto (todas las hojas)
  'cs-crew-x': b => {
    const C = CALL(), c = C.crew.find(x => x.id === b.dataset.id), id = curDayId(); if (!c || !id) return;
    const who = c.name || c.role;
    popover(b, `<div class="menu"><button data-m="out">No viene esta jornada</button><button data-m="del" style="color:var(--bad)">Quitar del equipo del proyecto…</button></div>`, p => p.addEventListener('click', e => {
      const x = e.target.closest('[data-m]'); if (!x) return; closePop();
      if (x.dataset.m === 'out') { histNote(`${who} no viene`); const d = dayData(id); d.out = { ...(d.out || {}), [c.id]: 1 }; changed('data'); render(); toastUndo(`${who} no viene a la jornada ${(UI.callDay || 0) + 1}.`); return; }
      confirmBox('Quitar del equipo', `${esc(who)}${c.name ? ` (${esc(c.role)})` : ''} sale del equipo del proyecto: desaparece de todas las hojas de llamado y de la pestaña Proyecto.`, 'Quitar del equipo', () => {
        histNote(`Quitar a ${who} del equipo`);
        C.crew = C.crew.filter(y => y.id !== c.id);
        for (const d of Object.values(C.days)) { if (d.out) delete d.out[c.id]; if (d.crew) delete d.crew[c.id]; }
        changed('data'); render(); toastUndo(`${who} salió del equipo del proyecto.`);
      });
    }));
  },
  'cs-crew-back': b => { const id = curDayId(); if (!id) return; const d = dayData(id); if (d.out) { delete d.out[b.dataset.id]; if (!Object.keys(d.out).length) delete d.out; } changed('data'); render(); },
  // (lote AH) la fecha, las filas, el avance y las hojas libres
  'cl-date': b => clDateMenu(b),
  'cl-date-back': () => { const S = callSheet(callRef()); if (!S || !S.own) return; histNote('Volver a la fecha del plan'); delete dayData(S.d.id).date; changed('data'); render(); toastUndo('La hoja vuelve a la fecha del plan.'); },
  'cl-row-end': b => clRowEnd(b.dataset.t),
  'cl-row-x': b => { const row = b.closest('[data-cr]'); clDelRow(b.dataset.id, row); },
  'cl-back': b => clBack(b.dataset.cr),
  'cl-revert': () => {
    const id = curDayId(); if (!id) return; const dd = peekDay(id), n = callChanges(dd);
    if (!n) return;
    confirmBox('Volver a la guía del stripboard', 'La hoja vuelve a lo que dice el stripboard: se deshacen los cambios hechos en ella (campos, horas, filas y planos quitados o agregados, la utilería y la locación escritas a mano). Las personas, los horarios del reparto y lo demás quedan como están.', 'Volver a la guía', () => {
      histNote('Volver a la guía del stripboard');
      const d = dayData(id); for (const k of CL_GUIDE) delete d[k];
      changed('data'); render(); toastUndo('La hoja vuelve a la guía del stripboard.');
    }, false);
  },
  'cl-adv-add': b => {
    const cd = callDays(), S = callSheet(callRef(), cd), cur = new Set(callAdvIds(callRef(), cd));
    const opts = cd.days.map((d, j) => ({ d, j })).filter(({ d }) => d.id !== S.d.id && !cur.has(d.id));
    if (!opts.length) { toast('Todas las jornadas ya están en el avance.'); return; }
    popover(b, `<h5>Agregar al avance</h5><div class="menu cl-pmenu">${opts.map(({ d, j }) => { const x = callSheet(j, cd); return `<button data-id="${ea(d.id)}">Jornada ${j + 1}${x.date ? ` <small>${esc(fmtDate(x.date))} · ${esc(callLocs(x.de).map(l => l[0]).join(', '))}</small>` : ''}</button>`; }).join('')}</div>`, p => p.addEventListener('click', e => {
      const x = e.target.closest('[data-id]'); if (!x) return; closePop();
      clAdvSet(l => [...l, x.dataset.id]);
    }));
  },
  'cl-adv-x': b => clAdvSet(l => l.filter(id => id !== b.dataset.id)),
  'cl-adv-auto': () => { const id = curDayId(); if (!id) return; histNote('Avance automático'); delete dayData(id).adv; changed('data'); render(); },
  'cl-free-new': () => callFreeNew(),
  'cl-free-del': () => {
    const S = callSheet(callRef()); if (!S || !S.free) return;
    const nm = callSheetName(S);
    confirmBox('Borrar la hoja libre', `«${esc(nm)}» y todo lo escrito en ella se borran.`, 'Borrar', () => {
      histNote('Borrar una hoja libre');
      const C = CALL(); C.free = callFrees().filter(f => f.id !== S.free.id); if (!C.free.length) delete C.free;
      delete C.days[S.free.id]; UI.callFree = null;
      changed('data'); render(); toastUndo(`Hoja libre «${nm}» borrada.`);
    });
  },
});
/* «+» de un área del equipo (hoja de llamado y Proyecto): elige uno de los cargos típicos aún sin nombre
   o un cargo nuevo; la fila aparece para escribir el nombre. Las filas sin nombre no se muestran ni se imprimen. */
function crewAdd(b, dept, after) {
  const C = CALL(), show = UI.csShow || (UI.csShow = new Set());
  const free = C.crew.filter(c => c.dept === dept && !(c.name || '').trim() && !show.has(c.id));
  const go = (c, field) => { show.add(c.id); changed('data'); render(); requestAnimationFrame(() => { const i = $(`[data-id="${c.id}"][data-f="${field}"]`); if (i) { i.focus(); if (field === 'role') i.select(); } if (after) after(c); }); };
  const fresh = () => { const c = { id: uid('c'), dept, role: 'Cargo', name: '', phone: '', email: '' }; C.crew.push(c); go(c, 'role'); };
  if (!free.length) return fresh();
  popover(b, `<div class="menu">${free.map(c => `<button data-c="${ea(c.id)}">${esc(c.role)}</button>`).join('')}<button data-c="" class="muted">Otro cargo…</button></div>`, p => p.addEventListener('click', e => {
    const x = e.target.closest('[data-c]'); if (!x) return; closePop();
    const c = C.crew.find(y => y.id === x.dataset.c); c ? go(c, 'name') : fresh();
  }));
}
/* (lote U) escribir la hora de un plano en la hoja de una jornada. La escena se alarga o se corre si hace falta
   (shotRetime) y eso queda solo en esta hoja: el comienzo de la escena en dd.at, su largo en dd.dur y los planos fijos en
   dd.shotAt; el plan de rodaje no cambia. Si la escena termina más tarde, las filas siguientes con hora escrita se corren
   lo mismo (las demás ya siguen a la anterior). Vacío: el plano vuelve al reparto parejo (y si en la escena ya no queda
   ningún plano fijo, la escena vuelve a su largo del plan). Devuelve si cambió algo. (lote AH) Sin las filas quitadas de
   la hoja ni los planos libres (que llevan su hora escrita) */
function callShotSet(d, shotId, v) {
  const dd = dayData(d.id), S = callSched(d), de = callDayEff(d, dd);
  const r = S.rows.find(o => o.shots && o.shots.some(x => x.sh && x.sh.id === shotId)); if (!r || r.sStart == null) return false;
  const shots = r.shots.filter(x => x.sh), i = shots.findIndex(x => x.sh.id === shotId), key = r.key;
  if (!v) {
    if (dd.shotAt) { delete dd.shotAt[shotId]; if (!Object.keys(dd.shotAt).length) delete dd.shotAt; }
    if (dd.dur && dd.dur[key] && !shots.some(x => x.sh.id !== shotId && dd.shotAt && dd.shotAt[x.sh.id] != null)) { delete dd.dur[key]; if (!Object.keys(dd.dur).length) delete dd.dur; }
    return true;
  }
  const P0 = shotOffsets(shots.map(x => x.sh), r.sDur, dd.shotAt);
  const R = shotRetime({ start: r.sStart, dur: r.sDur, pos: P0.pos, fix: P0.fix, i, m: hmToMin(v) });
  const oldEnd = r.sStart + r.sDur, newEnd = R.start + R.dur;
  // la escena en esta hoja: su comienzo, su largo y sus planos fijos
  if (R.start !== r.sStart) (dd.at = dd.at || {})[key] = minToHm(((R.start % 1440) + 1440) % 1440);
  if (R.dur !== r.sDur) (dd.dur = dd.dur || {})[key] = Math.max(1, Math.min(1440, Math.round(R.dur)));
  const at = {};
  shots.forEach((x, j) => { if (R.fix[j] != null) at[x.sh.id] = Math.max(0, Math.round(R.fix[j])); });
  for (const x of shots) if (dd.shotAt) delete dd.shotAt[x.sh.id];
  if (Object.keys(at).length) dd.shotAt = { ...(dd.shotAt || {}), ...at }; else if (dd.shotAt && !Object.keys(dd.shotAt).length) delete dd.shotAt;
  // las filas siguientes con hora escrita que ahora se pisarían con la escena se corren lo mismo
  const dE = newEnd - oldEnd;
  if (dE > 0) {
    const T = planDayTimes(de, dd.at, dd.dur), items = de.rows.map(ix => P.schedule.items[ix]);
    let j0 = items.findIndex(it => itemKey(it) === key), prevEnd = newEnd;
    for (let j = j0 + 1; j < items.length; j++) {
      const it = items[j], k = itemKey(it), own = hmToMin((dd.at || {})[k] || it.t), x = T.get(de.rows[j]) || {};
      let st = own;
      if (own != null) {
        let o2 = own; while (o2 < prevEnd - 720) o2 += 1440;   // pasada la medianoche
        if (o2 < prevEnd) { st = Math.max(o2 + dE, prevEnd); (dd.at = dd.at || {})[k] = minToHm(st % 1440); } else st = o2;
      } else st = prevEnd;
      prevEnd = st + (x.dur || 0);
    }
  }
  return true;
}
/* (lote Y) al escribir un número en el clima, su unidad aparece al lado («30°», «10%»); si se escribe la unidad a mano,
   no sale repetida (el campo la deja y se quita al guardar) */
function wxSync(el) {
  const box = el.closest('.cl-u'); if (!box) return;
  const raw = el.value.trim(), n = wxNum(raw), on = n !== null && n === raw;
  box.classList.toggle('on', on);
  if (on) el.size = Math.max(1, n.length); else el.removeAttribute('size');
}
const curDayId = () => { const S = callSheet(callRef()); return S ? S.d.id : null; };
const setOrDel = (o, k, v) => { if (v) o[k] = v; else delete o[k]; };
/* (lote AH) lo del stripboard de una fila o un plano de la hoja abierta (para saber si lo escrito es lo mismo) */
function clBaseOf(k, id) {
  const S = callSheet(callRef()); if (!S) return null;
  const Sc = callSched(S.d), all = [...Sc.rows, ...Sc.close];
  if (k === 'r') { const r = all.find(o => o.key === id); return r ? r.b : null; }
  for (const r of all) for (const x of r.shots || []) if (x.sh && x.sh.id === id) return x.b;
  return null;
}
Object.assign(BIND, {
  // la jornada o la hoja libre (la misma jornada en la hoja de script); «+ Hoja libre» crea una
  'cs-sel': el => {
    const v = el.value;
    if (v === '+') { el.value = UI.callFree ? 'f:' + UI.callFree : String(UI.callDay || 0); callFreeNew(); return; }
    if (v.startsWith('f:')) { UI.callFree = v.slice(2); render(); return; }
    UI.callFree = null; UI.callDay = +v; UI.supDay = UI.callDay; render();
  },
  'cs-day': (el, ev) => {
    const id = curDayId(); if (!id) return;
    let v = el.tagName === 'TEXTAREA' ? el.value : el.value.trim();
    if (el.classList.contains('tm')) {
      if (ev !== 'change') return;
      v = el.value = normHM(v);
      const S = callSheet(callRef()), def = callDefaults(S.d), f = el.dataset.f;
      // (lote AH) el cierre de set y el wrap: igual a lo que sale de los tiempos, se sigue lo calculado
      const auto = f === 'end' || f === 'cierre' ? callSched(S.d)[f === 'end' ? 'endAuto' : 'cierreAuto'] : def[f];
      if (auto && v === auto) v = '';   // igual al del plan: se sigue el plan
    }
    setOrDel(dayData(id), el.dataset.f, v); changed('data');
    if (ev === 'change' && el.classList.contains('tm')) render();
  },
  // (lote AC) el clima: la unidad aparece al escribir (wxSync) y se guarda el número sin ella
  'cs-wx': el => { const id = curDayId(); if (!id) return; wxSync(el); const v = el.value.trim(), n = wxNum(v); setOrDel(dayData(id), el.dataset.f, n ?? v); changed('data'); },
  'cs-hosp': el => { const id = curDayId(); if (!id) return; const d = dayData(id); d.hosp = d.hosp || {}; setOrDel(d.hosp, el.dataset.f, el.value.trim()); changed('data'); },
  'cs-crew': el => { const c = CALL().crew.find(x => x.id === el.dataset.id); if (!c) return; c[el.dataset.f] = el.value; changed('data'); },
  'cs-ccall': (el, ev) => { if (ev !== 'change') return; const id = curDayId(); if (!id) return; const d = dayData(id); d.crew = d.crew || {}; setOrDel(d.crew, el.dataset.id, el.value = normHM(el.value)); changed('data'); },
  'cs-tal': el => { const T = CALL().talent; T[el.dataset.id] = { ...(T[el.dataset.id] || {}) }; setOrDel(T[el.dataset.id], el.dataset.f, el.value.trim()); changed('data'); },
  'cs-cast': (el, ev) => {
    const txt = el.dataset.f === 'obs';
    if (!txt && ev !== 'change') return;
    const id = curDayId(); if (!id) return; const d = dayData(id); d.cast = d.cast || {}; d.cast[el.dataset.id] = { ...(d.cast[el.dataset.id] || {}) };
    setOrDel(d.cast[el.dataset.id], el.dataset.f, txt ? el.value.trim() : (el.value = normHM(el.value))); changed('data');
  },
  'cl-dcall': (el, ev) => { if (ev !== 'change') return; const id = curDayId(); if (!id) return; const d = dayData(id); d.dcall = d.dcall || {}; setOrDel(d.dcall, el.dataset.dept, el.value = normHM(el.value)); if (!Object.keys(d.dcall).length) delete d.dcall; changed('data'); render(); },
  // la hora de un plano (lote U): sin límite de escena; si no cabe, la escena se alarga o se corre (callShotSet)
  'cl-shat': (el, ev) => {
    if (ev !== 'change') return;
    const S = callSheet(callRef()), d = S && S.d; if (!d) return;
    const v = normHM(el.value); if (v && hmToMin(v) == null) return;   // la hora mal escrita ya la avisa el campo
    if (callShotSet(d, el.dataset.id, v)) { changed('data'); render(); }
  },
  // (lote U) los canales de radio: una vez por proyecto, salen en todas las hojas
  'cl-radio': el => { const v = el.value.replace(/[\u0000-\u001f]+/g, ' ').slice(0, 300); if (v.trim()) CALL().radio = v; else delete CALL().radio; changed('data'); },
  // la hora de una fila del cronograma, solo en esta hoja (el stripboard lleva los tiempos, no las horas)
  'cl-at': (el, ev) => {
    if (ev !== 'change') return; const id = curDayId(); if (!id) return;
    const v = el.value = normHM(el.value); if (v && hmToMin(v) == null) return;
    const d = dayData(id); d.at = d.at || {};
    setOrDel(d.at, el.dataset.k, v); if (!Object.keys(d.at).length) delete d.at;
    changed('data'); render();
  },
  'cl-thumbs': (el, ev) => { if (ev !== 'change') return; if (el.checked) delete CALL().noThumbs; else CALL().noThumbs = true; changed('data'); render(); },
  'cl-shott': (el, ev) => { if (ev !== 'change') return; if (el.checked) CALL().shotTimes = true; else delete CALL().shotTimes; changed('data'); render(); },
  // (lote AH) lo que llega del stripboard, cambiado en esta hoja (dd.rov / dd.sov): igual a lo del stripboard o vacío,
  // vuelve a lo del stripboard. El sonido de un plano también (antes se escribía en el storyboard)
  'cl-ov': (el, ev) => {
    if (ev !== 'change') return; const id = curDayId(); if (!id) return;
    const k = el.dataset.k, key = el.dataset.id, f = el.dataset.f, base = clBaseOf(k, key); if (!base) return;
    const v = el.tagName === 'SELECT' ? el.value : el.value.replace(/[\u0000-\u0009\u000b-\u001f]+/g, ' ').trim();
    const same = el.tagName === 'SELECT' ? v === (base[f] || '') : !v || v === clTr(base[f] || '').trim();
    const d = dayData(id), g = k === 'r' ? 'rov' : 'sov';
    d[g] = d[g] || {}; d[g][key] = { ...(d[g][key] || {}) };
    if (same) delete d[g][key][f]; else d[g][key][f] = v.slice(0, 2000);
    if (!Object.keys(d[g][key]).length) delete d[g][key]; if (!Object.keys(d[g]).length) delete d[g];
    changed('data'); render();
  },
  // (lote AH) un campo de una fila libre (cronograma, plano, talento o equipo); las horas, como horas
  'cl-xf': (el, ev) => {
    const tm = el.classList.contains('tm');
    if (tm && ev !== 'change') return;
    const id = curDayId(); if (!id) return;
    const f = { x: 'xrows', xs: 'xsh', xa: 'xcast', xc: 'xcrew' }[el.dataset.k], x = (dayData(id)[f] || []).find(o => o.id === el.dataset.id); if (!x) return;
    let v = el.tagName === 'SELECT' ? el.value : el.value.replace(/[\u0000-\u0009\u000b-\u001f]+/g, ' ');
    if (tm) { v = el.value = normHM(v); if (v && hmToMin(v) == null) return; }
    if (v.trim()) x[el.dataset.f] = v.slice(0, 2000); else delete x[el.dataset.f];
    changed('data'); if (tm || el.tagName === 'SELECT') render();
  },
  // (lote AH) las observaciones de alguien del equipo en esta jornada
  'cl-cobs': el => { const id = curDayId(); if (!id) return; const d = dayData(id); d.cobs = d.cobs || {}; setOrDel(d.cobs, el.dataset.id, el.value.trim()); if (!Object.keys(d.cobs).length) delete d.cobs; changed('data'); },
  // (lote AH) la utilería especial escrita a mano (vacía o igual a la del desglose: vuelve a la del desglose)
  'cl-props': (el, ev) => {
    if (ev !== 'change') return; const id = curDayId(); if (!id) return;
    const S = callSheet(callRef()), auto = callProps(S.de).join(', '), v = el.value.replace(/[\u0000-\u0009\u000b-\u001f]+/g, ' ').trim(), d = dayData(id);
    if (!v || v === auto) delete d.props; else d.props = v.slice(0, 2000);
    changed('data'); render();
  },
  // (lote AH) la locación de la cabecera escrita en esta hoja (vacía: la del plan)
  'cl-loc': (el, ev) => { const id = curDayId(); if (!id) return; const d = dayData(id); d.loc = { ...(d.loc || {}) }; setOrDel(d.loc, el.dataset.f, el.value.trim()); if (!Object.keys(d.loc).length) delete d.loc; changed('data'); if (ev === 'change') render(); },
  // (lote AH) el nombre de la hoja libre
  'cl-fname': (el, ev) => { const f = callFreeOf(UI.callFree); if (!f) return; f.name = el.value.replace(/[\u0000-\u001f]+/g, ' ').slice(0, 80); changed('data'); if (ev === 'change') render(); },
  'cl-veh': el => { const v = movOf(el.dataset.id); if (!v) return; v.name = el.value; changed('data'); },
  // el conductor: si lo escrito es el nombre de un proveedor, queda unido a él; si no, el nombre tal cual
  'cl-drv': (el, ev) => {
    if (ev !== 'change') return; const v = movOf(el.dataset.id); if (!v) return;
    const t = el.value.trim(), vd = t && CALL().vendors.find(o => (o.name || '').trim().toLowerCase() === t.toLowerCase());
    const nv = vd ? 'v:' + vd.id : t ? 't:' + t : '';
    const S = callSheet(callRef());
    if (nv === v.driver || (t && t === drvName(v, callPeople(S.de, peekDay(curDayId()))))) return;
    v.driver = nv; changed('data'); render();
  },
  'cl-meet': (el, ev) => { const m = meetOf(true); if (!m) return; setOrDel(m, el.dataset.f, el.value.trim()); changed('data'); if (ev === 'change') render(); },
  'cl-link': (el, ev) => {
    if (ev !== 'change' || !el.value.trim()) return;
    const u = safeUrl(el.value); if (!u) { toast('Escribe un enlace web (https://…).'); return; }
    const m = meetOf(true); if (!m) return;
    if (m.links.length >= 12) { toast('Hasta 12 enlaces por jornada.'); return; }
    m.links = [...m.links, u]; changed('data'); render();
    requestAnimationFrame(() => { const i = $('.cl-link-in'); if (i) i.focus(); });
  },
  'cl-up': async (el, ev) => {
    if (ev !== 'change' || !el.files.length) return;
    const id = curDayId(), m = meetOf(true); if (!id || !m) return;
    const n = await candAddPhotos(m, pid => clPhKey(id, pid), el.files);
    if (n) render();
  },
  'cs-vend': el => { const x = CALL().vendors.find(v => v.id === el.dataset.id); if (!x) return; x[el.dataset.f] = el.value; changed('data'); },
  'cs-vcall': (el, ev) => { if (ev !== 'change') return; const id = curDayId(); if (!id) return; const d = dayData(id); d.vend = d.vend || {}; setOrDel(d.vend, el.dataset.id, el.value = normHM(el.value)); changed('data'); },
  'cs-set': el => { const C = CALL(); if (el.dataset.f === 'client') C.client = el.value.trim(); else C.hospital = { ...C.hospital, [el.dataset.f]: el.value.trim() }; changed('data'); },
});
/* ---------- ajustes, ayuda y exportar ---------- */
SETTINGS.call = () => {
  const C = CALL(), dis = callEditable() ? '' : 'disabled';
  return `<div class="fld"><span>Centro de salud por defecto</span>
      <input type="text" value="${esc(C.hospital.name)}" data-bind="cs-set" data-f="name" placeholder="Nombre" ${dis}>
      <input type="text" value="${esc(C.hospital.addr)}" data-bind="cs-set" data-f="addr" placeholder="Dirección" ${dis}>
      <input type="tel" value="${esc(C.hospital.phone)}" data-bind="cs-set" data-f="phone" placeholder="Teléfono" ${dis}></div>
    <p class="hint" style="margin:0">Cada jornada puede tener el suyo, por ejemplo si la etapa se rueda en otra ciudad.</p>
    <label class="fld"><span>Cliente (publicidad)</span><input type="text" value="${esc(C.client)}" data-bind="cs-set" data-f="client" placeholder="Opcional" ${dis}></label>`;
};
HELP.call = [
  ['La hoja', 'Se lee de un vistazo y va toda en cuadros, como una planilla. Arriba, en tres columnas: la productora y su equipo clave con teléfono (jefatura de producción, dirección y 1.er asistente de dirección, y la producción y el cliente si los hay); el proyecto, la jornada, la fecha y el llamado general en grande, con listos motor, almuerzo, cierre de set, wrap y catering; el clima y la locación con su dirección y el mapa. Debajo, los jefes de área con su teléfono, la nota del 1.er asistente, el cronograma con los planos de cada escena, el avance, los talentos y el equipo técnico. Al final, la utilería especial, el punto de encuentro, la movilidad, el centro de salud y los canales de radio.'],
  ['De dónde sale', 'El cronograma, las locaciones y el reparto de cada jornada vienen del plan de rodaje y del desglose. Si cambias el plan, la hoja se actualiza sola. La utilería especial reúne la utilería, las armas y los efectos especiales del desglose de las escenas del día.'],
  ['Cambiar lo del stripboard', 'Todo lo que llega del stripboard se puede cambiar en la hoja: el número, el encabezado, la sinopsis, el reparto, D/N y las páginas de cada escena, y la descripción, la acción, el lente, el sonido y los personajes de cada plano. El cambio queda solo en esta hoja (el plan, el desglose y el storyboard no cambian) y se nota apenas, con una línea de puntos. Borra el campo para volver a lo del stripboard, o usa «Volver a la guía del stripboard» arriba del cronograma para la hoja entera.'],
  ['Agregar y quitar filas', 'Clic derecho en una fila del cronograma, de los talentos o del equipo técnico (en el teléfono, mantén el dedo): «Agregar fila arriba», «Agregar fila abajo» o «Quitar fila». Las filas agregadas se escriben enteras y quedan solo en esta hoja, no en el stripboard. Lo que quitas del stripboard queda abajo de la tabla, con ↺ para volver a ponerlo. Un plano quitado sale en el storyboard y en el guion técnico como «Eliminado en la hoja de llamado».'],
  ['La fecha', 'Toca la fecha de la cabecera para cambiarla. Elige «Solo esta hoja» (por ejemplo, para un día de lluvia: el plan y el calendario siguen igual y la hoja tiene «Volver a la fecha del plan») o «Correr esta jornada y las siguientes» (la jornada y todas las que vienen después se corren en el plan de rodaje y el calendario). Se deshace con Deshacer.'],
  ['Hojas libres', 'En el selector de jornadas, «+ Hoja libre» crea una hoja de llamado que no sale de ninguna jornada: se le pone nombre y se llena a mano, campo por campo (el cronograma, los talentos, las horas, la locación…). Sale en PDF y Excel con la misma estructura. Se borra con la papelera, junto al selector.'],
  ['Cronograma', 'A la izquierda, la hora de cada evento (carga, almuerzo…) o el número de cada escena con su hora debajo: toca una hora para cambiarla (vacía, sigue a la fila anterior con los tiempos del plan). Al centro, el encabezado, la sinopsis y el reparto con su número; a la derecha, las páginas en octavos. Debajo de cada escena, sus planos del storyboard: la miniatura, el tamaño, el soporte, el ángulo y el movimiento, la acción, el set, el lente, el sonido y los personajes («Miniaturas» las muestra u oculta). Los traslados salen como una banda celeste con su dirección y el mapa. Al final, el wrap y el total de páginas.'],
  ['Hora de cada plano', 'En el cronograma, con «Hora por plano» encendido, toca la hora de un plano (debajo de su número) para cambiarla. Si no cabe en su escena, la escena se alarga o empieza antes y las filas siguientes se corren con ella, solo en esta hoja (el plan de rodaje no cambia). El orden de los planos se mantiene. Vacía, el plano vuelve a repartirse parejo.'],
  ['Avance', 'Después del cronograma: de entrada, la jornada siguiente (aunque caiga después de días libres) con su fecha, el llamado, las locaciones, sus escenas, el total de páginas y quién del reparto trabaja. Con «+ Jornada al avance» agregas cualquier otra jornada; con su ✕ la quitas. En la última jornada dice «Fin de rodaje».'],
  ['Talentos y equipo técnico', 'Cada uno en su cuadro: primero los talentos (el reparto) y después el equipo técnico por área (el nombre del área separa, con su citación). Nombre, personaje o cargo, teléfono y correo se escriben aquí o en Proyecto y sirven para todas las jornadas. Las horas son de esta jornada: el recojo, el llamado, vestuario, maquillaje y listos del reparto, con sus observaciones, y el llamado de cada persona del equipo.'],
  ['Jefes de área', 'Debajo de la cabecera, cada jefe de área con su teléfono: en cada área, quien tiene el cargo de jefe (dirección de fotografía, gaffer y key grip, maquillaje, diseño de vestuario, dirección de arte, sonidista…). Para cambiarlo, clic derecho en una persona del equipo técnico: «Jefe de área».'],
  ['Canales de radio', 'Al final de la hoja, junto al centro de salud. Se escriben una vez (por ejemplo «1 Producción, 2 Libre, 3 Transporte») y salen en todas las jornadas.'],
  ['Movilidad', 'Cada vehículo con su conductor (un proveedor o un nombre) y sus pasajeros, del equipo y del reparto.'],
  ['La leyenda', 'Arriba de la hoja: las tiras del plan (la franja de color de cada escena), la jornada, los eventos y la nota para el equipo. Los del plan se cambian en su leyenda; la nota, aquí. El PDF y el Excel salen con los mismos colores.'],
  ['Exportar', 'PDF o Excel de esta jornada o de todas. Las filas del equipo sin nombre no se imprimen. «Copiar resumen» deja la fecha, el llamado, la locación con su mapa, el centro de salud y el avance listos para pegar en el chat.'],
];
/* el menú Exportar avisa antes: lo que le falta a la hoja y con qué versión sale (exportar igual es posible) */
function callExpHints() {
  const { days } = callDays(), ref = callRef();
  if (!days.length && !callIsFree(ref)) return { one: 'Lista para enviar o imprimir', all: 'Una hoja por jornada' };
  const ST = callState(ref), V = callVer(ref), bad = days.map((_, i) => i).filter(i => callMissing(i).length).length;
  return {
    one: ST && ST.miss.length ? `${ST.miss.length === 1 ? 'Falta 1 dato' : `Faltan ${ST.miss.length} datos`}: sale «Por confirmar»` : V ? (V.same ? `Lista · v${V.v}, sin cambios` : `Lista para enviar · sale como v${V.v}`) : 'Lista para enviar o imprimir',
    all: bad ? `Una hoja por jornada · ${bad} de ${days.length} con datos por completar` : 'Una hoja por jornada',
  };
}
EXPORTS.call = () => { const H = callExpHints(), free = callIsFree(callRef()), { days } = callDays(); return [
  { label: free ? 'Esta hoja (PDF)' : 'Esta jornada (PDF)', hint: H.one, run: btn => exportPDF('call', btn, { all: false }), pdf: { kind: 'call', opts: { all: false } } },
  ...(days.length ? [{ label: 'Todas las jornadas (PDF)', hint: H.all, run: btn => exportPDF('call', btn, { all: true }), pdf: { kind: 'call', opts: { all: true } } }] : []),
  { label: free ? 'Esta hoja (Excel)' : 'Esta jornada (Excel)', hint: 'Para editarla en Excel', run: () => exportCallXLSX(false), pro: 'excel' },
  ...(days.length ? [{ label: 'Todas las jornadas (Excel)', hint: 'Una hoja de cálculo por jornada', run: () => exportCallXLSX(true), pro: 'excel' }] : []),
]; };
EXPORTS_NOTE.call = () => {
  const ref = callRef(), ST = callState(ref); if (!ST || !ST.miss.length) return '';
  const S = callSheet(ref), a = ST.miss.map(x => `<span>${esc(x.txt)}</span>${x.name ? ` <span data-no-tr>${esc(x.name)}</span>` : ''}`), list = a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + (EN ? ' and ' : ' y ') + a[a.length - 1];
  const who = S.free ? `<span data-no-tr>${esc(callSheetName(S))}</span>` : `Jornada ${S.n + 1}`;
  return `<p class="xnote">${ICO.warn}<span><b>${who} · ${a.length === 1 ? 'falta 1 dato:' : `faltan ${a.length} datos:`}</b> ${list}. <span>Puedes exportarla igual: lo que falte dice «Por confirmar».</span></span></p>`;
};
/* datos de una hoja listos para imprimir (PDF y Excel). (lote AH) ref: la jornada o la hoja libre; con lo cambiado en la
   hoja, los jefes de área, el cierre de set y el wrap, la locación de la cabecera y el avance elegido */
function callSheetData(ref) {
  const cd = callDays(), S = callSheet(ref, cd), { days } = cd, d = S.d, de = S.de, C = CALL(), dd = peekDay(d.id), def = callDefaults(d), M = P.meta;
  const prods = (M.producers || []).filter(x => personName(x)), execs = prods.filter(x => /ejecutiv/i.test(x.role || ''));
  const call = dd.crewCall || def.crewCall;
  const hosp = { name: (dd.hosp || {}).name || C.hospital.name, addr: (dd.hosp || {}).addr || C.hospital.addr, phone: (dd.hosp || {}).phone || C.hospital.phone };
  const n = S.n, next = n >= 0 ? days[n + 1] : null;
  const sched = callSched(d), people = callPeople(de, dd), who = k => { const x = callWho(people, k); return x ? x.name : ''; };
  const role = re => CALL().crew.filter(c => re.test(c.role || '') && (c.name || '').trim() && !(dd.out || {})[c.id]);
  const keyCrew = callKeyCrew(dd), crewSets = callCrewRows(dd, call), advs = callAdvances(ref, cd);
  return {
    ref, S, free: S.free, title: callSheetName(S), sched, shotT: callShotTimes(), end: sched.end, cierre: sched.cierre, motor: dd.motor || sched.motor.replace('~', ''),
    keys: [...role(/asistente de direcci/i).slice(0, 1), ...role(/jefatura de producci|jefe de producci/i).slice(0, 1)],
    heads0: [['Dirección', (M.directors || []).map(personName).filter(Boolean).join(', ')], ['Producción', prods.filter(x => !execs.includes(x)).map(personName).join(', ')], ['Dir. de fotografía', role(/direcci[oó]n de fotograf/i).map(c => c.name).join(', ')], ['Dir. de arte', role(/direcci[oó]n de arte/i).map(c => c.name).join(', ')], ['Sonido', role(/sonidista|jefe de sonido/i).map(c => c.name).join(', ')], ['Prod. ejecutiva', execs.map(personName).join(', ')], ...(C.client ? [['Cliente', C.client]] : [])].filter(x => x[1]),
    eps: epsOfKeys(de.keys).map(e => epLabel(P, e)).join(' / '),   // series: los episodios de la jornada
    meet: dd.meet || {}, mov: (dd.mov || []).map(x => ({ name: x.name, driver: drvName(x, people), pax: x.pax.map(who).filter(Boolean) })),
    n, total: days.length, date: S.date, d, de, call, lunch: dd.lunch || def.lunch || callLunch(sched), dd, hosp,
    prod: prods.filter(x => !execs.includes(x)).map(personName).join(', '), exec: execs.map(personName).join(', '), dir: (M.directors || []).map(personName).filter(Boolean).join(', '),
    rows: callRows(de), locs: callLocs(de), loc: callLoc(de, dd), cast: callCast(de), talent: callTalentRows(de, dd), fig: de.rows.reduce((a, i) => a + num(P.schedule.items[i].fig), 0),
    // (lote AH) el equipo por área, con las filas libres y las observaciones de la jornada: [área, [personas], citación]
    crew: crewSets.map(([k, name, rows, dc]) => [name, rows.filter(crewShown).map(r => ({ ...r, call: r.call || dc })), dc]).filter(x => x[1].length),
    vend: C.vendors.filter(v => v.name).map(v => ({ ...v, call: (dd.vend || {})[v.id] || '' })),
    next: next ? { n: n + 2, date: callSheet(n + 1, cd).date, call: peekDay(next.id).crewCall || callDefaults(next).crewCall, locs: callLocs(next).map(x => x[0]).join(', '), sc: next.keys.join(', ') } : null,
    // (lote U) la hoja como la referencia: el equipo clave, la utilería especial, el avance y los canales de radio
    keyCrew, props: (P => P ? P.split(/\s*,\s*/).filter(Boolean) : [])(callPropsText(de, dd)), propsTxt: callPropsText(de, dd), adv: advs[0] || null, advs, lastDay: !S.free && n === days.length - 1 && !Array.isArray(dd.adv), radio: C.radio || '',
    keyMore: callKeyMore(keyCrew),   // (lote W) la producción y el cliente, en la cabecera
    heads: callHeads(crewSets, keyCrew),   // (lote AH) los jefes de área con su teléfono
  };
}
function exportCallXLSX(all) {
  if (!proGate('excel')) return;
  const cd = callDays(), { days } = cd, ref = callRef();
  if (!days.length && !callIsFree(ref)) { toast('Primero arma el stripboard.'); return; }
  const list = all ? days.map((_, i) => i) : [ref];
  const rec = !(typeof OFFER_CAPTURE !== 'undefined' && OFFER_CAPTURE), vers = Object.fromEntries(list.map(i => [i, callVer(i, cd, rec)]));
  const sheets = list.map(i => callSheetXLSX({ ...callSheetData(i), ver: vers[i] }));
  const bytes = xlsxBook(sheets, { title: P.meta.title + ' · Hoja de llamado' });
  const one = callSheet(list[0], cd), tail = all ? '_hojas_de_llamado.xlsx' : one.free ? `_hoja_de_llamado_${fileSafe(callSheetName(one))}.xlsx` : `_hoja_de_llamado_J${list[0] + 1}.xlsx`;
  offerFile(fileSafe(P.meta.title) + tail, new Blob([bytes], { type: XLSX_MIME }))
    .then(ok => { if (ok === true) callExported(list, vers); });   // («captured»: va dentro del ZIP del proyecto, no se envió)
}
/* el Excel de una hoja (lote W; lote AH: en cuadros con líneas negras, como la pantalla y el PDF). La cabecera (el equipo
   clave, el llamado general con listos motor, almuerzo, cierre de set y wrap, el clima y la locación), los jefes de
   área, la nota, el cronograma por escena con sus planos debajo (sin título: sus columnas bastan), el avance, los
   talentos, el equipo técnico y, al final, la utilería especial, el punto de encuentro, la movilidad, el centro de salud
   y los canales de radio. Sin proveedores (lote AH: siguen guardados) */
function callSheetXLSX(X) {
  const NC = 10, rows = [];
  const row = (cells, h) => rows.push(h == null ? { cells } : { cells, h });
  // como en la app y en el PDF: las tiras del plan, la nota en amarillo suave; todo con líneas negras
  const T = xlTab(), L = '#000000';
  const band = (v, fill = '#EDEDED', color = '#111111') => row([{ v, cs: NC, s: { bold: true, font: 'title', fill, color, h: 'left', size: 11, line: L } }], 20);
  const H = { bold: true, fill: '#F4F4F4', color: '#222222', line: L, size: 9 }, Y = { fill: lgMix(T.note, '#FFFFFF', .4), line: L };
  const SIDE = { line: L }, MID = { line: L }, MU = { color: '#555555', line: L }, CC = { h: 'center', line: L }, B = { line: L };
  const gap = () => row([{ v: '', cs: NC, s: { border: false } }], 6);
  // 1. la cabecera: el proyecto, la hoja y su versión (solo el número); tres columnas como en la hoja
  row([{ v: P.meta.title + (X.eps ? ' · ' + X.eps : ''), cs: 6, s: { bold: true, size: 16, font: 'title', line: L } }, { v: trDone(tr('Hoja de llamado') + ' · ' + tr(X.title)) + (X.ver ? ' · ' + callVerNum(X.ver) : ''), cs: 4, s: { size: 10, bold: true, line: L, h: 'right' } }], 30);
  const key = [P.meta.company, ...[...X.keyCrew, ...(X.keyMore || [])].map(k => `${k.lab}: ${k.name || 'Por confirmar'}${k.phone ? ' · ' + k.phone : ''}`)].filter(Boolean).join('\n');
  const date = X.date ? capFirst(X.date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) : 'Sin fecha';
  const mid = [date, 'LLAMADO GENERAL', X.call || '—', X.dd.craft && 'Catering: ' + X.dd.craft].filter(Boolean).join('\n');
  const W = wxParts(X.dd), wx = [W.wx, ...W.pairs.map(p => p.join(' '))].filter(Boolean).join(' · ');   // (lote Y) con la unidad pegada al número
  const right = [wx && 'Clima: ' + wx, [X.dd.sunrise && 'Amanecer ' + X.dd.sunrise, X.dd.sunset && 'Anochece ' + X.dd.sunset].filter(Boolean).join(' · '),
    'Locación: ' + ([X.loc.name, X.loc.addr || (X.meet.addr || '').trim()].filter(Boolean).join(' · ') || '—'), X.loc.url].filter(Boolean).join('\n');
  row([{ v: key || '—', cs: 3, s: SIDE }, { v: mid, cs: 4, s: { ...MID, bold: true, font: 'title', size: 12, h: 'center' } }, { v: right, cs: 3, s: SIDE }], 84);
  // (lote AH) listos motor, almuerzo, cierre de set y wrap, cada uno en su celda
  const LB = { ...B, h: 'right', color: '#555555', size: 9 }, VB = { ...B, h: 'center', bold: true, size: 12 };
  row([{ v: 'Listos motor', cs: 2, s: LB }, { v: X.motor || '', s: VB }, { v: 'Almuerzo', s: LB }, { v: X.lunch || '', s: VB }, { v: 'Cierre de set', cs: 2, s: LB }, { v: X.cierre || '', s: VB }, { v: 'Wrap', s: LB }, { v: X.end || '', s: VB }], 22);
  // 2. los jefes de área (de a dos por fila)
  if (X.heads.length) {
    gap(); band('Jefes de área');
    for (let i = 0; i < X.heads.length; i += 2) row([0, 1].map(j => { const h = X.heads[i + j]; return { v: h ? `${h.role}: ${h.name}${h.phone ? ' · ' + h.phone : ''}` : '', cs: 5, s: B }; }));
  }
  // 3. la nota
  if (X.dd.notes) { gap(); row([{ v: 'Nota para el equipo', cs: NC, s: { ...Y, bold: true, h: 'center' } }]); row([{ v: X.dd.notes, cs: NC, s: { ...Y, h: 'center' } }]); }
  const COLS = [22, 16, 9, 9, 9, 9, 9, 16, 16, 6];
  const lu = pdfPlanUsed(X.sched.rows.filter(r => r.it).map(r => r.it)); lu.note = !!(X.dd.notes || '').trim();
  const lg = xlLegend(lgDocItems('call', lu).map(([nm, c]) => nm === LG.call.note[0] ? [nm, Y.fill] : [nm, c]), COLS);
  if (lg.length) { row([], 6); rows.push(...lg); row([], 4); } else gap();
  // 4. el cronograma por escena, con sus planos debajo (lote AH: sin el título «Cronograma»)
  row([{ v: 'Hora · Esc.', s: H }, { v: 'I/E · D/N', s: H }, { v: 'Escena', cs: 7, s: H }, { v: 'Págs.', s: { ...H, h: 'right' } }]);
  if (X.sched.byShot) row([{ v: 'Plano · hora', s: H }, { v: 'Descripción', s: H }, { v: 'Acción', cs: 4, s: H }, { v: 'Lente', s: { ...H, h: 'center' } }, { v: 'Sonido', s: { ...H, h: 'center' } }, { v: 'Personajes', cs: 2, s: H }]);
  for (const r of [...X.sched.rows, ...X.sched.close]) {
    if (r.free) { row([{ v: [r.v.code, r.x.t].filter(Boolean).join('  '), s: { ...B, bold: true } }, { v: [r.v.ie, r.v.dn].filter(Boolean).join(' · '), s: { ...B, bold: true } }, { v: [r.v.set, r.v.syn, r.v.cast].filter(Boolean).join('\n'), cs: 7, s: B }, { v: r.v.pages, s: { ...B, h: 'right', bold: true } }]); continue; }
    if (r.ev) { const ef = hlc(r.it) || T.ev, ge = { fill: isMove(r) ? '#DDEFFC' : ef, line: L, color: lgInk(ef) === '#FFFFFF' && !isMove(r) ? '#FFFFFF' : '#222222' }; row([{ v: [r.t0 || r.t || '', r.t1 || r.end || ''].filter(Boolean).join(' - '), s: { ...ge, bold: true } }, { v: r.v.name + (r.v.det ? ' · ' + r.v.det : ''), cs: NC - 1, s: { ...ge, bold: true } }]); continue; }
    const fc = r.col, f = { fill: fc, line: L, ...(lgDark(fc) ? { color: '#F4F4F4' } : {}) };   // la tira estándar, como en el plan
    row([{ v: `${r.v.code}${r.t0 || r.t ? '  ' + (r.t0 || r.t) : ''}`, s: { ...f, bold: true } }, { v: `${r.v.ie} · ${r.v.dn}`, s: { ...f, bold: true } },
      { v: [r.v.set + (r.it.sp && !r.ov.set ? ` (parte ${r.it.sp})` : ''), r.v.syn, r.v.cast].filter(Boolean).join('\n'), cs: 7, s: { ...f, bold: true } }, { v: r.v.pages, s: { ...f, bold: true, h: 'right' } }]);
    for (const x of r.shots || []) row([{ v: x.code + (X.shotT && x.t0 ? '  ' + x.t0 : ''), s: { ...B, bold: true } }, { v: x.v.desc, s: B }, { v: x.v.act + (r.set && !x.free && !setOf(r.s).toLowerCase().includes(r.set.toLowerCase()) ? `\nSet: ${r.set}` : ''), cs: 4, s: B }, { v: x.v.lens, s: CC }, { v: SND_NAME[x.v.snd] || '', s: CC }, { v: x.v.cast, cs: 2, s: B }]);
  }
  const WR = { bold: true, line: L, fill: '#222222', color: '#FFFFFF' };
  row([{ v: X.end || '', s: { ...WR, h: 'center' } }, { v: 'Wrap · fin de jornada', cs: NC - 2, s: WR }, { v: fmtEighths(dayInfo(X.de.keys, X.de.rows).e), s: { ...WR, h: 'right' } }], 20);
  // 5. el avance: las jornadas elegidas (o «Fin de rodaje»)
  for (const A of X.advs) {
    gap(); band(trDone(tr(`Avance · Jornada ${A.n}`) + (A.date ? ' · ' + advDate(A) : '')) + (A.call ? ' · ' + trDone(tr(`llamado ${A.call}`)) : '') + (A.locs.length ? ' · ' + A.locs.join(', ') : ''));
    row([{ v: 'Esc.', s: H }, { v: 'I/E · D/N', s: H }, { v: 'Escena', cs: 5, s: H }, { v: 'Reparto', cs: 2, s: H }, { v: 'Págs.', s: { ...H, h: 'right' } }]);
    for (const r of A.rows) { const fc = r.col; row([{ v: r.code, s: { bold: true, fill: fc, line: L } }, { v: `${r.ie} · ${r.dn}`, s: B }, { v: r.set + (r.syn ? '\n' + r.syn : ''), cs: 5, s: B }, { v: r.cast.join(', '), cs: 2, s: B }, { v: fmtEighths(r.e8), s: { ...B, h: 'right', bold: true } }]); }
    row([{ v: `Total ${fmtEighths(A.e8)} págs.` + (A.cast.length ? ' · Reparto: ' + A.cast.map(c => (c.n ? c.n + ' ' : '') + c.name).join(', ') : ''), cs: NC, s: { ...MU, h: 'right' } }]);
  }
  if (!X.advs.length && X.lastDay) { gap(); band('FIN DE RODAJE'); }
  // 6. (lote AH) la citación en dos cuadros: los talentos y, después, el equipo técnico por área (con su citación)
  const tel = (t, e) => [t, e].filter(Boolean).join('\n');
  gap(); band('Talentos');
  row(['Nombre', 'Personaje', 'Recojo', 'Llamado', 'Vest.', 'Maq.', 'Listos', 'Teléfono', 'Observaciones', ''].map((v, j) => ({ v, cs: j === 8 ? 2 : 1, s: { ...H, ...(j >= 2 && j <= 6 ? { h: 'center' } : {}) } })).slice(0, 9));
  for (const r of X.talent) row([{ v: r.actor || 'Por confirmar', s: r.actor ? { ...B, bold: true } : MU }, { v: `${r.num ? r.num + '. ' : ''}${r.role}${r.sc && r.sc.length ? ` (esc. ${r.sc.join(', ')})` : ''}`, s: B }, { v: r.pu, s: CC }, { v: r.call || X.call || '', s: { ...CC, bold: true } }, { v: r.ves, s: CC }, { v: r.mq, s: CC }, { v: r.ready, s: CC }, { v: tel(r.phone, r.email), s: B }, { v: r.obs, cs: 2, s: B }]);
  if (!X.talent.length) row([{ v: 'Sin reparto', cs: NC, s: MU }]);
  if (X.fig) row([{ v: `Figuración: ${X.fig}`, cs: NC, s: MU }]);
  gap(); band('Equipo técnico');
  row(['Nombre', 'Cargo', 'Llamado', 'Teléfono', 'Correo', 'Observaciones'].map((v, j) => ({ v, cs: [2, 2, 1, 2, 2, 1][j], s: { ...H, ...(j === 2 ? { h: 'center' } : {}) } })));
  for (const [name, list, dc] of X.crew) {
    row([{ v: name.toUpperCase(), cs: 4, s: { ...H, fill: '#EDEDED' } }, { v: dc || '', s: { ...H, fill: '#EDEDED', h: 'center' } }, { v: '', cs: NC - 5, s: { ...H, fill: '#EDEDED' } }]);
    for (const c of list) row([{ v: c.name, cs: 2, s: { ...B, bold: true } }, { v: c.role, cs: 2, s: MU }, { v: c.call, s: { ...CC, bold: true } }, { v: c.phone || '', cs: 2, s: B }, { v: c.email || '', cs: 2, s: B }, { v: c.obs || '', s: B }]);
  }
  if (!X.crew.length) row([{ v: 'Por confirmar', cs: NC, s: MU }]);
  // 7. al final: la utilería especial, el punto de encuentro, la movilidad, el centro de salud y los canales de radio
  if (X.propsTxt) { gap(); band('Utilería especial'); row([{ v: X.propsTxt, cs: NC, s: B }]); }
  const m = X.meet, mLinks = (m.links || []).map(safeUrl).filter(Boolean);
  if ((m.addr || '').trim() || (m.note || '').trim() || mLinks.length) { gap(); band('Punto de encuentro'); row([{ v: [(m.addr || '').trim(), (m.note || '').trim(), ...mLinks].filter(Boolean).join('\n'), cs: NC, s: B }]); }
  if (X.mov.length) {
    gap(); band('Movilidad');
    row([{ v: 'Vehículo', cs: 2, s: H }, { v: 'Conductor', cs: 2, s: H }, { v: 'Pasajeros', cs: NC - 4, s: H }]);
    X.mov.forEach((x, i) => row([{ v: `${i + 1}. ${x.name || 'Vehículo'}`, cs: 2, s: { ...B, bold: true } }, { v: x.driver || '', cs: 2, s: B }, { v: x.pax.join(', '), cs: NC - 4, s: B }]));
  }
  gap();
  row([{ v: 'Centro de salud: ' + ([X.hosp.name, X.hosp.phone, X.hosp.addr].filter(Boolean).join(' · ') || 'Por confirmar'), cs: 6, s: { bold: true, line: L } }, { v: 'Canales de radio: ' + (X.radio || 'Por confirmar'), cs: 4, s: { line: L } }]);
  return { name: X.free ? String(X.title).slice(0, 28) : `Jornada ${X.n + 1}`, cols: COLS, rows, landscape: false };
}
