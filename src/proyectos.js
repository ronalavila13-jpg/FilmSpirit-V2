/* ============================================================
   PROYECTOS · abrir, crear, normalizar, imágenes, activos y archivados
   (antes en ui.js; va después de pestanas.js en el armado)
   ============================================================ */
/* ---------- proyectos ---------- */
/* antes de cambiar de proyecto: lo pendiente del que está abierto termina de guardarse (con su equipo y sus permisos) */
async function settleSave() {
  // fotos que todavía se están subiendo (laminas.js · photosAdd): se espera a que terminen (hasta 2 minutos)
  if (typeof PHOTO_UP !== 'undefined' && PHOTO_UP.size) {
    toast('Terminando de subir las fotos…', 2500);
    await Promise.race([Promise.all([...PHOTO_UP]), new Promise(r => setTimeout(r, 120e3))]);
  }
  const wait = async () => { for (let i = 0; saving && i < 150; i++) await new Promise(r => setTimeout(r, 100)); };
  await wait();
  if (P && dirty.size && !UI.readOnly) await flushSave();
  await wait();
}
async function openProject(pid) {
  await settleSave();
  $('#view').innerHTML = '<div class="loading">Abriendo proyecto…</div>';
  let Pn = null;
  try { Pn = await Store.load(pid); } catch (e) { Pn = null; }
  if (Pn && Pn.cancel) { if (P) render(); else openSample(); return false; }
  if (!Pn) { toast('No se pudo abrir ese proyecto: puede que lo hayan borrado o que ya no tengas acceso. Búscalo en Proyectos.'); openSample(); return false; }
  Pn._saved = true;
  if (Store.kind === 'desk' && !Pn._shared) DESK.pathOf(pid).then(p => { Pn._path = p; setSaveState(); }).catch(() => { });
  setProject(Pn);
  return true;
}
/* ---------- (lote AD) el proyecto de ejemplo «La última función» ----------
   Uno solo por sesión: lo que cambias en él (y lo que dibujas) queda en la memoria mientras el programa siga abierto,
   también al pasar a otro proyecto y volver; al cerrar o recargar la página se pierde (y el navegador avisa antes:
   arranque.js · unsavedWork). No se guarda solo ni ocupa un lugar del plan; «Guardar como mi proyecto» (adoptSample) lo
   convierte en un proyecto tuyo. Toda forma de abrir el ejemplo pasa por aquí: Inicio, Proyectos, la portada
   (?ejemplo=1, también sin cuenta) y los botones «Explorar con un proyecto de ejemplo» */
const SAMPLE_MEM = { P: null, frames: null };
function openSample() {
  const keep = SAMPLE_MEM.P && SAMPLE_MEM.P._sample && !SAMPLE_MEM.P._saved ? SAMPLE_MEM.P : null;
  if (keep && P === keep) { homeHide(); render(); return P; }   // ya está abierto
  const Pn = keep || buildSample();
  if (!keep) SAMPLE_MEM.frames = null;
  SAMPLE_MEM.P = Pn;
  setProject(Pn);   // con sus dibujos, si ya se había abierto (setProject)
  return Pn;
}
/* el ejemplo va primero en Inicio y en Proyectos, destacado: en la web con cuentas, el plan gratis y quien entra sin
   cuenta. En los planes de pago queda el botón «Ejemplo» de siempre */
const sampleFirst = () => Store.kind === 'api' && !!(APITEAM.anon || !APITEAM.me || APITEAM.me.plan === 'free');
const SAMPLE_INVITE = 'Explora todas las funciones del programa';   // (lote AF) el texto que pidió Ronald
const sampleName = () => SAMPLE_TX[EN ? 'en' : 'es'].title;
// ¿hay cambios en el ejemplo que se perderían al cerrar la página?
const sampleTouched = () => !!(SAMPLE_MEM.P && SAMPLE_MEM.P._touched && SAMPLE_MEM.P._sample && !SAMPLE_MEM.P._saved);
function setProject(Pn) {
  if (P && P !== Pn && dirty.size && !saving) flushSave();
  // (lote AD) se sale del ejemplo: sus dibujos quedan en la memoria para cuando se vuelva (openSample)
  if (P && P !== Pn && P === SAMPLE_MEM.P && P._sample && !P._saved) SAMPLE_MEM.frames = FRAMES;
  dirty.clear();
  P = Pn;
  FRAMES = {}; FRAMES_PID = null; FRIDX = null; FR_KNOWN = null; FR_USE.clear(); FR_FAIL.clear();
  if (Pn === SAMPLE_MEM.P && Pn._sample && !Pn._saved && SAMPLE_MEM.frames) FRAMES = SAMPLE_MEM.frames;   // el ejemplo, con sus dibujos (lote AD)
  UI.scene = 0; UI.supDay = 0; UI.sbScene = '';
  normalizeProject(P);
  if (typeof SHARE !== 'undefined' && SHARE && (!P._shared || P.id !== SHARE.pid)) SHARE = null;
  if (TARGET === 'web' && WEBTEAM.pid && (!P._shared || P.id !== WEBTEAM.pid)) WEBTEAM.close();
  if (Store.kind === 'api') { if (APITEAM.pid && (!P._shared || P.id !== APITEAM.pid)) APITEAM.close(); apiUrl(P._shared ? P.id : null); }
  sharePaintTabs();
  derive();
  homeHide();
  posRestore();   // la pestaña y la escena donde quedó (inicio.js)
  if (P._shared && typeof shareSnapshot === 'function') shareSnapshot();
  if (P._offLoc && typeof merge3 === 'function') {
    for (const [s, j] of Object.entries(P._offLoc)) {
      try { const b = P._offBase && P._offBase[s] ? JSON.parse(P._offBase[s].json) : undefined; secPut(P, s, merge3(b, JSON.parse(j), secGet(P, s))); } catch (e) { console.warn('sin conexión:', e); }
    }
    delete P._offLoc; delete P._offBase;
    derive(); dirty.add('data'); saveSoon();
  }
  if (P.id && P._saved) { ls.set('last', P.id); Store.watch(P.id, remoteBanner); }
  histReset();
  if (typeof NOTES_ON !== 'undefined') actReset();
  sampleBanner();
  render();
  if (typeof refreshProjCount === 'function') refreshProjCount();
  ensureFrames('index');   // solo el índice y las fotos de los personajes (en el escritorio, todo: está en el equipo)
}
/* campos que agregaron versiones nuevas; los proyectos anteriores los reciben vacíos */
function normalizeProject(Px) {
  // un archivo dañado o armado a mano puede traer un texto o una lista donde va un objeto: se descarta (antes la
  // apertura se cortaba a la mitad y quedaba un proyecto a medio cargar)
  const notObj = v => v != null && (typeof v !== 'object' || Array.isArray(v));
  for (const k of ['schedule', 'budget', 'sup', 'meta', 'call', 'calendar', 'build', 'scout', 'casting']) if (notObj(Px[k])) delete Px[k];
  for (const k of ['scenes', 'shots', 'elements']) if (Px[k] == null || notObj(Px[k])) Px[k] = {};
  for (const k of ['paras', 'tags']) if (Px[k] != null && !Array.isArray(Px[k])) Px[k] = [];
  const S = Px.schedule = Px.schedule || {};
  if (!S.items) S.items = [];
  if (!S.stages) S.stages = [];
  if (!S.locs) S.locs = [];
  if (!S.setLoc) S.setLoc = {};
  if (!S.castMode) S.castMode = 'num';
  plColWClean(S);   // (lote AC) el ancho de las columnas del stripboard, limpio una vez aquí (plan-columnas.js)
  const B = Px.budget = Px.budget || { currency: 'S/', contingency: 0, igv: false, igvRate: 18, lines: [] };
  if (!B.taxName) B.taxName = 'IGV';
  if (!B.fx) B.fx = { on: false, rate: 3.75 };
  const Su = Px.sup = Px.sup || { takes: {}, sc: {}, day: {} };
  if (Su.supervisor == null) Su.supervisor = '';
  if (Su.roll == null) Su.roll = '';
  const M = Px.meta = Px.meta || { title: 'Proyecto' };
  if (!M.directors) M.directors = [];
  if (!M.producers) M.producers = [];
  if (!M.brand) M.brand = { project: true, company: true };
  const C = Px.call = Px.call || {};
  if (!C.crew) C.crew = [];
  if (!C.talent) C.talent = {};
  if (!C.vendors) C.vendors = [];
  if (!C.hospital) C.hospital = { name: '', addr: '', phone: '' };
  if (C.client == null) C.client = '';
  if (!C.days) C.days = {};
  const K = Px.calendar = Px.calendar || {};
  if (!K.tasks) K.tasks = [];
  cmNotesClean(K);   // notas de cada mes (cal-meses.js)
  if (!Px.notes || typeof Px.notes !== 'object' || Array.isArray(Px.notes)) Px.notes = {};   // notas y comentarios del equipo
  // escenas 3D: una dañada (sin claves o sin cámara) se descarta y el plano vuelve a la escena armada sola
  for (const sh of Object.values(Px.shots || {})) if (sh && sh.s3 && (typeof sh.s3 !== 'object' || !Array.isArray(sh.s3.keys) || !sh.s3.keys.length || !sh.s3.keys.every(k => k && typeof k === 'object' && k.cam && typeof k.cam === 'object' && k.o && typeof k.o === 'object'))) delete sh.s3;
  // escenas 3D de versiones anteriores; la cámara B, solo lo que se conoce
  for (const sh of Object.values(Px.shots || {})) if (sh && sh.s3) {
    s3FloorFix(sh.s3); s3CleanB(sh.s3);
    if (typeof carClean === 'function') carClean(sh.s3);   // el vehículo del interior: modelo que existe y color válido
    // las medidas de la planta: solo las que tienen dos puntas válidas (s3d-plan.js)
    if ('meas' in sh.s3) { const M = typeof measClean === 'function' ? measClean(sh.s3.meas) : []; if (M.length) sh.s3.meas = M; else delete sh.s3.meas; }
    // lote W · D: la escala de los objetos (s3d-model.js)
    if (Array.isArray(sh.s3.objs)) for (const o of sh.s3.objs) objScClean(o);
    // el foco a mano: metros sobre el eje de la cámara
    if ('focusD' in sh.s3) { const d = +sh.s3.focusD; if (isFinite(d) && d > 0) sh.s3.focusD = Math.round(clamp(d, FOCUS_D[0], FOCUS_D[1]) * 100) / 100; else delete sh.s3.focusD; }
  }
  sanitizeProject(Px);
  if (typeof set3dNormalize === 'function') set3dNormalize(Px);   // lote W · escala del escenario; (lote AD) sin escenarios construidos, modelos sobre un entorno
  // Construcción, Scouting y Casting (desde la 1.2): en la forma que esperan sus pestañas
  buildNormalize(Px);
  scoutNormalize(Px);
  castingNormalize(Px);
  callNormalize(Px);
  if (Px.meta && Px.meta.sensor != null && !(typeof SENSORS !== 'undefined' && SENSORS.some(x => x[0] === Px.meta.sensor && x[0] !== 'ff'))) delete Px.meta.sensor;
  fixTransCues(Px);
  return Px;
}
/* lo que viene de afuera (colaboradores, archivos, carpeta compartida) se deja en la forma que la app espera antes de
   mostrarlo: tipos de párrafo conocidos, números donde van números, colores válidos, notas con nombres válidos.
   Se llama al abrir un proyecto y cada vez que llega una sección de otra persona */
const NOTE_ID_RE = /^[\w-]{1,40}$/;
/* guion cerrado: lo que viene de un archivo o del equipo se deja con la forma esperada (los textos se escapan al mostrarlos) */
function sanitizeLock(meta) {
  const L = meta.lock;
  if (!L || typeof L !== 'object' || Array.isArray(L)) { delete meta.lock; return; }
  const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : v == null ? '' : String(v).slice(0, n);
  const hex = v => typeof v === 'string' && /^[0-9a-f]{16,128}$/.test(v) ? v : undefined;
  const color = c => typeof REV_COLORS === 'undefined' || REV_COLORS.some(x => x[0] === c) ? str(c, 12) : 'azul';
  const ts = v => Number.isFinite(+v) ? +v : 0;
  L.on = !!L.on; L.at = ts(L.at); L.by = str(L.by, 80);
  L.people = (Array.isArray(L.people) ? L.people : []).filter(p => p && typeof p === 'object' && typeof p.id === 'string').slice(0, 200).map(p => {
    const o = { id: str(p.id, 40), name: str(p.name, 80), role: str(p.role, 60), at: ts(p.at) };
    if (p.mid != null) o.mid = str(p.mid, 80);
    if (hex(p.s) && hex(p.h)) { o.s = p.s; o.h = p.h; }
    if (p.adm) o.adm = true;
    return o;
  });
  L.rec = L.rec && hex(L.rec.s) && hex(L.rec.h) ? { s: L.rec.s, h: L.rec.h } : null;
  L.rev = L.rev && typeof L.rev === 'object' ? { c: color(L.rev.c), at: ts(L.rev.at), by: str(L.rev.by, 80), date: /^\d{4}-\d{2}-\d{2}$/.test(String(L.rev.date)) ? L.rev.date : '' } : null;
  L.revs = (Array.isArray(L.revs) ? L.revs : []).filter(r => r && typeof r === 'object').slice(-200).map(r => ({ c: color(r.c), at: ts(r.at), end: ts(r.end), by: str(r.by, 80), n: Math.max(0, Math.round(+r.n) || 0), sc: (Array.isArray(r.sc) ? r.sc : []).slice(0, 60).map(k => str(k, 16)) }));
  L.log = (Array.isArray(L.log) ? L.log : []).filter(x => x && typeof x === 'object').slice(-1500).map(x => ({ t: ts(x.t), who: str(x.who, 80), txt: str(x.txt, 300) }));
  if (L.base && typeof L.base === 'object' && Array.isArray(L.base.paras)) {
    L.base = { at: ts(L.base.at), pages: Math.max(0, +L.base.pages || 0), scenes: Math.max(0, +L.base.scenes || 0), paras: L.base.paras.filter(p => p && typeof p === 'object').map(p => {
      const o = { t: typeof LAYOUT !== 'undefined' && Object.hasOwn(LAYOUT, p.t) ? p.t : 'a', x: str(p.x, 1e6) };
      if (p.n != null && /^[\w.*'\/-]{1,16}$/.test(String(p.n))) o.n = String(p.n);
      if (p.ep != null && epOk(p.ep)) o.ep = String(p.ep);
      if (typeof p.r === 'string') o.r = str(p.r, 40);
      if (p.dur != null) o.dur = str(p.dur, 12);
      return o;
    }) };
  } else delete L.base;
  if (L.reopened && typeof L.reopened === 'object') L.reopened = { at: ts(L.reopened.at), by: str(L.reopened.by, 80) }; else delete L.reopened;
}
function sanitizeProject(Px) {
  if (!Px || typeof Px !== 'object') return Px;
  cleanTree(Px);
  // elementos del desglose: objetos con nombre y una categoría que existe (una desconocida rompía el guion y el PDF)
  if (Px.elements && typeof Px.elements === 'object') for (const [id, e] of Object.entries(Px.elements)) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) { delete Px.elements[id]; continue; }
    if (!CAT[e.cat]) e.cat = 'notes';
    if (typeof e.name !== 'string') e.name = String(e.name ?? '');
  }
  if (Array.isArray(Px.paras)) {
    Px.paras = Px.paras.filter(p => p && typeof p === 'object' && !Array.isArray(p));
    for (const p of Px.paras) {
      if (typeof LAYOUT !== 'undefined' && !Object.hasOwn(LAYOUT, p.t)) p.t = 'a';
      if (typeof p.x !== 'string') p.x = String(p.x ?? '');
      if (p.n != null && (!/^[\w.*'\/-]{1,16}$/.test(String(p.n)) || !safeKey(p.n))) delete p.n;
      if (p.ep != null) { if (epOk(p.ep)) p.ep = String(p.ep); else delete p.ep; }   // comienzo de un episodio (series)
      // guion cerrado: dónde empieza cada página ([posición, número])
      if (p.lpg != null) { p.lpg = Array.isArray(p.lpg) ? p.lpg.filter(m => Array.isArray(m) && Number.isInteger(m[0]) && m[0] >= 0 && /^[\w-]{1,16}$/.test(String(m[1]))).map(m => [m[0], String(m[1])]).slice(0, 8) : []; if (!p.lpg.length) delete p.lpg; }
      if (p.rv != null && (typeof p.rv !== 'string' || !/^[a-z]{1,12}$/.test(p.rv))) delete p.rv;
      // palabras cambiadas en la revisión: tramos [desde, hasta, color] y lo borrado [posición, color] (guion-revision.js)
      const rvc = c => typeof c === 'string' && /^[a-z]{1,12}$/.test(c);
      if (p.rvw != null) { p.rvw = Array.isArray(p.rvw) ? p.rvw.filter(r => Array.isArray(r) && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] >= 0 && r[1] > r[0] && r[1] <= p.x.length && rvc(r[2])).map(r => [r[0], r[1], r[2]]).slice(0, 400) : []; if (!p.rvw.length) delete p.rvw; }
      if (p.rvd != null) { p.rvd = Array.isArray(p.rvd) ? p.rvd.filter(r => Array.isArray(r) && Number.isInteger(r[0]) && r[0] >= 0 && r[0] <= p.x.length && rvc(r[1])).map(r => [r[0], r[1]]).slice(0, 200) : []; if (!p.rvd.length) delete p.rvd; }
      // formato (negrita, itálica, subrayado, resaltado de seis colores): tramos [desde, hasta] dentro del texto
      if (p.fm != null) {
        if (!p.fm || typeof p.fm !== 'object' || Array.isArray(p.fm)) delete p.fm;
        else { const o = {}; for (const k of ['b', 'i', 'u', 'h', 'g', 'c', 'r', 'o', 'l']) if (Array.isArray(p.fm[k])) { const L = p.fm[k].filter(r => Array.isArray(r) && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] >= 0 && r[1] > r[0] && r[1] <= p.x.length).map(r => [r[0], r[1]]).slice(0, 400); if (L.length) o[k] = L; } if (Object.keys(o).length) p.fm = o; else delete p.fm; }
      }
    }
  }
  if (Px.meta && Px.meta.lock != null) sanitizeLock(Px.meta);
  // logos y planos de planta: solo imágenes incrustadas (imagenes.js · imgDataOk)
  if (Px.meta && typeof Px.meta === 'object') for (const k of ['logo', 'projLogo']) if (Px.meta[k] != null && !imgDataOk(Px.meta[k])) delete Px.meta[k];
  if (Px.plans && typeof Px.plans === 'object') for (const [id, pl] of Object.entries(Px.plans)) if (!pl || typeof pl !== 'object' || !imgDataOk(pl.img)) delete Px.plans[id];
  const B = Px.budget;
  if (B && typeof B === 'object') {
    for (const k of ['contingency', 'igvRate']) if (!numLike(B[k])) B[k] = 0;
    if (B.fx && typeof B.fx === 'object' && !numLike(B.fx.rate)) B.fx.rate = 3.75;
    if (Array.isArray(B.lines)) for (const l of B.lines) if (l && typeof l === 'object') for (const k of ['qty', 'mult', 'rate', 'amount', 'days']) if (k in l && !numLike(l[k])) l[k] = 0;
  }
  const Su = Px.sup;
  if (Su && Su.takes && typeof Su.takes === 'object') for (const [id, L] of Object.entries(Su.takes)) {
    if (!Array.isArray(L)) { delete Su.takes[id]; continue; }
    Su.takes[id] = L.filter(t => t && typeof t === 'object');
    for (const t of Su.takes[id]) { t.n = Math.max(0, Math.round(+t.n) || 0); if (!['ok', 'ng', 'bn'].includes(t.st)) t.st = 'ok'; }
  }
  if (typeof supClean === 'function') supClean(Su);   // (lote AD) lo nuevo de la hoja de script (tab-sup.js)
  const K = Px.calendar;
  if (K && Array.isArray(K.tasks)) {
    // fechas AAAA-MM-DD: sin inicio válido la tarea no se puede dibujar; sin fin válido, termina el mismo día
    const iso = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
    K.tasks = K.tasks.filter(t => t && typeof t === 'object' && iso(t.start));
    for (const t of K.tasks) {
      if (!iso(t.end)) t.end = t.start;
      if (t.segs != null) { t.segs = Array.isArray(t.segs) ? t.segs.filter(x => x && iso(x.start)).map(x => ({ start: x.start, end: iso(x.end) ? x.end : x.start })) : []; if (!t.segs.length) delete t.segs; }
    }
  }
  const Sc = Px.schedule;
  if (Sc && Array.isArray(Sc.items)) for (const it of Sc.items) if (it && typeof it === 'object' && 'fig' in it && !numLike(it.fig)) it.fig = '';
  const A = Px.animatic;
  if (A && typeof A === 'object') {
    if (A.trans && typeof A.trans === 'object') for (const [id, tr] of Object.entries(A.trans)) {
      if (!tr || typeof tr !== 'object') { delete A.trans[id]; continue; }
      if (tr.type != null && !/^[\w-]{1,20}$/.test(String(tr.type))) tr.type = 'cut';
      if (tr.f != null && !(isFinite(+tr.f))) tr.f = 12;
    }
    const au = A.audio;
    if (au && typeof au === 'object') for (const k of ['offset', 'vol']) if (au[k] != null && !isFinite(+au[k])) delete au[k];
  }
  // el máster de la escena y las capas del dibujo 2D (lote U): solo lo que se conoce
  if (Px.shots && typeof Px.shots === 'object') for (const sh of Object.values(Px.shots)) {
    if (!sh || typeof sh !== 'object') continue;
    if ('master' in sh && typeof sh.master !== 'boolean') delete sh.master;
    // lote W · D: los cambios de escenario del máster y el último que vio cada plano (s3d-model.js)
    if ('stgN' in sh && !(Number.isInteger(sh.stgN) && sh.stgN > 0)) delete sh.stgN;
    if ('stgSeen' in sh && !(typeof sh.stgSeen === 'string' && /^[\w~-]{1,80}:\d{1,9}$/.test(sh.stgSeen))) delete sh.stgSeen;
    if (sh.d2 && typeof sh.d2 === 'object' && Array.isArray(sh.d2.layers)) for (const L of sh.d2.layers) {
      if (!L || typeof L !== 'object') continue;
      if ('back' in L && (L.back !== true || L.kind !== 'image')) delete L.back;   // detrás de las figuras: solo imágenes
      if ('imp' in L && L.imp !== 'ref' && L.imp !== 'anno') delete L.imp;
    }
  }
  const N = Px.notes;
  if (N && typeof N === 'object') for (const [id, n] of Object.entries(N)) {
    const on = n && n.on;
    if (!NOTE_ID_RE.test(id) || !n || typeof n !== 'object' || !on || typeof on !== 'object' || !/^[a-z]{1,12}$/.test(String(on.t || '')) || !/^[\w:.~-]{0,100}$/.test(String(on.id || ''))
      || (on.t === 'tab' && !/^[a-z]{1,12}$/.test(String(on.id || ''))) || (n.re != null && !NOTE_ID_RE.test(String(n.re)))) { delete N[id]; continue; }
    // anotación a mano del guion rayado: sus trazos, limpios (guion-anotar.js); sin ninguno válido, se va
    if (on.t === 'ink' && typeof anoCleanOn === 'function' && !anoCleanOn(on)) { delete N[id]; continue; }
    n.id = id;
    if (typeof n.text !== 'string') n.text = String(n.text ?? '');
    if (typeof n.ts !== 'number' || !isFinite(n.ts)) n.ts = 0;
  }
  if (Px.act && Px.act.counts && typeof Px.act.counts === 'object') for (const c of Object.values(Px.act.counts)) if (c && typeof c === 'object') { c.n = +c.n || 0; c.c = +c.c || 0; }
  lgMigrate(Px);   // colores de la leyenda (leyenda.js)
  return Px;
}
/* «CORTE A», «FUNDIDO A», «DISUELVE A»… leídos como personajes en versiones anteriores: vuelven a ser transiciones
   (lo que quedó debajo como diálogo pasa a acción) y salen del reparto, con sus marcas */
function fixTransCues(Px) {
  const paras = Px.paras || [];
  for (let i = 0; i < paras.length; i++) {
    const p = paras[i];
    if (!p || p.t !== 'c' || !isTransText(p.x)) continue;
    p.t = 'tr';
    for (let j = i + 1; j < paras.length && (paras[j].t === 'd' || paras[j].t === 'p'); j++) paras[j].t = 'a';
  }
  const bad = new Set(Object.values(Px.elements || {}).filter(e => e.cat === 'cast' && isTransText(String(e.name || '').toUpperCase())).map(e => e.id));
  if (!bad.size) return;
  Px.tags = (Px.tags || []).filter(t => !bad.has(t.el));
  for (const id of bad) delete Px.elements[id];
}
/* ---------- imágenes del proyecto, a medida que hacen falta ----------
   Con cuenta en el servidor, al abrir un proyecto llega solo el índice (qué imágenes hay y su versión) y las fotos
   de los personajes (pocas y livianas: las usan las figuras 3D). El resto se baja cuando algo lo muestra: las
   viñetas que están a la vista en el storyboard o en el animatic, las fotos de una lámina del desglose al abrirla,
   las capas de un dibujo al editarlo, todo junto para un PDF o el ZIP. Lo bajado queda guardado en el navegador
   (la próxima vez no se descarga) y en la memoria se guarda solo lo usado hace poco, hasta FR_BUDGET: lo demás se
   suelta y, si vuelve a hacer falta, se lee del navegador. Varios pedidos seguidos viajan juntos.
   En la app de escritorio y sin cuenta las imágenes ya están en el equipo: se cargan todas, como antes (FRIDX nulo). */
let FRAMES_P = null;
let FRIDX = null;                         // índice clave → versión (nulo: todas las imágenes están en FRAMES)
let FR_KNOWN = null;                      // proyecto del que ya se sabe qué imágenes tiene (cargadas o en el índice)
const FR_PEND = new Set();                // imágenes cambiadas aquí que el servidor aún no confirmó (su viñeta no se guarda)
const FR_USE = new Map();                 // clave → último uso (para soltar primero lo más viejo)
const FR_LOAD = new Map();                // clave → carga en curso
const FR_Q = { keys: new Set(), p: null };
const FR_FAIL = new Map();                // clave → cuándo falló (no se insiste enseguida)
let FR_BUDGET = Math.round(Math.min(96, Math.max(24, (navigator.deviceMemory || 4) * 10))) * 1048576;   // en texto base64: 40 MB en un equipo de 4 GB, 24 MB en uno de 2 GB
let FR_HOLD = 0;                          // mientras se arma un PDF, un ZIP o un video no se suelta nada
let FR_RECENT = 30000;                    // lo usado en los últimos 30 s no se suelta
const frameGroup = k => k.startsWith('m3~') ? 'm3' : k.startsWith('ph~') ? 'ph' : k.startsWith('ga~') ? 'ga' : k.startsWith('bd~') ? 'bd' : k.startsWith('lc~') ? 'lc' : k.startsWith('ca~') ? 'ca' : k.startsWith('cl~') ? 'cl' : k.includes('~d~') ? 'd2' : 'sb';
/* ¿existe la imagen? (cargada o en el índice) */
const frameHas = k => !!FRAMES[k] || !!(FRIDX && k in FRIDX);
/* todas las imágenes de un plano (referencia, anotación, capas y cuadros 2D), cargadas o no */
const frameKeysOf = id => { const out = new Set(); for (const k of Object.keys(FRAMES)) if (k === id || k.startsWith(id + '~')) out.add(k); if (FRIDX) for (const k of Object.keys(FRIDX)) if (k === id || k.startsWith(id + '~')) out.add(k); return [...out]; };
/* las que necesita la viñeta (sin las capas del dibujo) */
const frameViewKeys = id => frameKeysOf(id).filter(k => !k.includes('~d~'));
/* firma para las miniaturas: cambia al cargar, al editar y cuando otra persona la cambia */
const frameSig = k => (FRAMES[k] ? FRAMES[k].length : frameHas(k) ? 'x' : 0) + ':' + ((FRIDX && FRIDX[k]) || 0);
function ensureFrames(scope = 'all') {
  if (!P) return Promise.resolve();
  if (FRAMES_PID !== P.id) {
    FRAMES_PID = P.id; FRIDX = null; FR_KNOWN = null;
    if (P._sample && !P._saved) { FRAMES_P = Promise.resolve(); FR_KNOWN = P.id; }
    else {
      const pid = P.id;
      FRAMES_P = (async () => {
        try {
          if (Store.kind === 'api') {
            let idx = {};   // un proyecto que aún no está en el servidor no tiene imágenes allá
            if (P._shared) try { idx = (await Store.frameIndex(pid)) || {}; } catch (e) { idx = {}; }
            if (!P || P.id !== pid) return;
            FRIDX = idx; FR_KNOWN = pid;
            await framesNeed(Object.keys(idx).filter(k => k.startsWith('ph~')));
          } else {
            const got = await Store.loadFrames(pid);
            if (!P || P.id !== pid) return;
            FRAMES = { ...got, ...FRAMES }; FR_KNOWN = pid;
          }
          if (['board', 'sup', 'breakdown', 'animatic'].includes(UI.tab)) render();
        } catch (e) { }
      })();
    }
  }
  const base = FRAMES_P || Promise.resolve();
  if (scope === 'index') return base;
  return base.then(() => { if (!FRIDX || !P) return; return framesNeed(Object.keys(FRIDX).filter(k => scope === 'all' || frameGroup(k) === scope)); });
}
/* pide imágenes (y las marca como usadas); devuelve una promesa que se cumple cuando están en FRAMES */
function framesNeed(keys) {
  const now = Date.now();
  for (const k of keys) FR_USE.set(k, now);
  if (!FRIDX || !P) return Promise.resolve();
  const waits = new Set();
  for (const k of keys) {
    if (FRAMES[k] || !(k in FRIDX) || now - (FR_FAIL.get(k) || 0) < 15000) continue;
    const w = FR_LOAD.get(k);
    if (w) waits.add(w); else { FR_Q.keys.add(k); waits.add(frameFlushSoon()); }
  }
  return waits.size ? Promise.all(waits).then(() => { }) : Promise.resolve();
}
function frameFlushSoon() {
  if (FR_Q.p) return FR_Q.p;
  return (FR_Q.p = new Promise(res => setTimeout(async () => {
    const keys = [...FR_Q.keys]; FR_Q.keys.clear(); FR_Q.p = null;
    const pid = P && P.id;
    const job = (async () => {
      try {
        const got = await Store.getFrames(pid, keys, FRIDX || {});
        if (!P || P.id !== pid) return;
        for (const [k, u] of Object.entries(got)) if (u && !FRAMES[k]) FRAMES[k] = u;
        const t = Date.now(); for (const k of keys) if (!got[k]) FR_FAIL.set(k, t);
        frameTrim();
      } catch (e) { const t = Date.now(); for (const k of keys) FR_FAIL.set(k, t); }
      finally { for (const k of keys) if (FR_LOAD.get(k) === job) FR_LOAD.delete(k); }
    })();
    for (const k of keys) FR_LOAD.set(k, job);
    await job; res();
  }, 12)));
}
/* las imágenes de una viñeta: null si ya están, o la promesa de su carga */
function framesReady(sh) {
  if (!FRIDX || !sh) return null;
  const ks = frameViewKeys(sh.id), now = Date.now();
  ks.forEach(k => FR_USE.set(k, now));
  const miss = ks.filter(k => !FRAMES[k]);
  return miss.length ? framesNeed(miss) : null;
}
/* suelta de la memoria lo usado hace más tiempo (sigue guardado en el navegador y en el servidor) */
function frameTrim() {
  if (!FRIDX || FR_HOLD) return;
  let tot = 0; const L = [];
  for (const k in FRAMES) { if (k.startsWith('ph~') || !(k in FRIDX) || !FRAMES[k]) continue; tot += FRAMES[k].length; L.push(k); }
  if (tot <= FR_BUDGET) return;
  const now = Date.now();
  const ids = [typeof EDT !== 'undefined' && EDT && EDT.id, typeof S2 !== 'undefined' && S2 && S2.id].filter(Boolean);
  const lam = !!document.querySelector('.lam-dlg');
  const pinned = k => ids.some(id => k === id || k.startsWith(id + '~')) || (lam && k.startsWith('bd~')) || (UI.tab === 'scout' && k.startsWith('lc~')) || (UI.tab === 'casting' && k.startsWith('ca~')) || (UI.tab === 'call' && k.startsWith('cl~'));
  L.sort((a, b) => (FR_USE.get(a) || 0) - (FR_USE.get(b) || 0));
  for (const k of L) {
    if (tot <= FR_BUDGET * .7) break;
    if (now - (FR_USE.get(k) || 0) < FR_RECENT || pinned(k)) continue;
    tot -= FRAMES[k].length; delete FRAMES[k];
    if (typeof IMGS !== 'undefined') IMGS.delete(k);
  }
}
/* mientras se arma algo que usa muchas imágenes a la vez (PDF, ZIP, video) */
async function framesHold(fn) { FR_HOLD++; try { return await fn(); } finally { FR_HOLD--; frameTrim(); } }
/* todas las imágenes del proyecto juntas (para el ZIP o la copia de seguridad), sin guardarlas en la memoria */
async function framesAll() {
  await ensureFrames('index');
  if (!FRIDX) return FRAMES;
  const miss = Object.keys(FRIDX).filter(k => !FRAMES[k]);
  const got = miss.length ? await Store.getFrames(P.id, miss, FRIDX).catch(() => ({})) : {};
  return { ...FRAMES, ...got };
}
/* acciones del proyecto abierto: se abre desde su fila en «Proyectos» (botón ⋯); antes era el menú del nombre */
async function projectMenu(anchor) {
  // dos acciones; debajo, solo lo que corresponde a este proyecto (carpeta, equipo, archivar, eliminar)
  const desk = Store.kind === 'desk';
  const extra = [
    desk && P._saved && !P._shared ? '<button data-m="dreveal">Mostrar el archivo en la carpeta</button>' : '',
    desk && P._shared ? '<button data-m="tdir">Abrir la carpeta compartida</button>' : '',
    Store.kind === 'api' && P._shared && !(SHARE && SHARE.admin) ? '<button data-m="leave">Salir de este proyecto…</button>' : '',
    Store.kind === 'api' && P._shared && SHARE && SHARE.admin ? `<button data-m="archive">${SHARE.archived ? 'Desarchivar el proyecto' : 'Archivar el proyecto…'}</button>` : '',
    P._saved && !(P._shared && !DESK && !(SHARE && SHARE.admin)) ? `<button data-m="delete" style="color:var(--bad)">${P._shared && DESK ? 'Quitar de mi lista…' : desk ? 'Mover a la papelera…' : 'Eliminar este proyecto…'}</button>` : ''
  ].join('');
  popover(anchor, `
    <h5>${esc(P.meta.title)}</h5>
    <div class="menu">
      <button data-m="${ea(desk && !P._shared ? 'dsaveas' : 'backup')}">Guardar .${PROJ_EXT}</button>
      <button data-m="zip">Descargar ZIP</button>
      ${extra ? '<hr>' + extra : ''}
    </div>`,
    p => p.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      closePop();
      const m = b.dataset.m;
      if (m === 'dsaveas' && P._sample && !P._saved) return adoptSample().then(() => deskMenu('saveas'));
      if (m === 'dsaveas' || m === 'dreveal') return deskMenu(m === 'dsaveas' ? 'saveas' : 'reveal');
      if (m === 'leave') return confirmBox('Salir del proyecto', `Dejarás de ver «${esc(P.meta.title)}». Producción puede volver a invitarte cuando quiera.`, 'Salir', async () => {
        try { await Store.remove(P.id); } catch (e) { toast(e.message || 'No se pudo salir del proyecto.'); return; }
        SHARE = null; toast('Saliste del proyecto.');
        const rest = await Store.list().catch(() => []);
        if (rest.length) openProject(rest[0].id); else openSample();
      });
      if (m === 'tdir') return DESK.team.openDir(P.id);
      if (m === 'backup') backupProject();
      if (m === 'zip') return archiveZipDialog();
      if (m === 'archive') return archiveProject(!SHARE.archived);
      if (m === 'delete' && P._shared && !DESK) return confirmBox(SHARE && SHARE.members && SHARE.members.length > 1 ? 'Eliminar proyecto de equipo' : 'Eliminar proyecto', `Se eliminará «${esc(P.meta.title)}»${SHARE && SHARE.members && SHARE.members.length > 1 ? ' para todo el equipo' : ''}, con su desglose, planos, plan y presupuesto. No se puede deshacer.`, 'Eliminar', async () => {
        try { await Store.remove(P.id); toast('Proyecto eliminado'); } catch (e) { toast('No se pudo eliminar. Revisa tu conexión y vuelve a intentarlo.'); return; }
        SHARE = null;
        const rest = await Store.list().catch(() => []);
        if (rest.length) openProject(rest[0].id); else openSample();
      });
      if (m === 'delete' && P._shared) return confirmBox('Quitar de mi lista', `«${esc(P.meta.title)}» desaparece de tu lista de proyectos. La carpeta compartida y el trabajo del equipo no se tocan; puedes volver a abrirla cuando quieras.`, 'Quitar', async () => {
        await Store.remove(P.id).catch(() => { }); SHARE = null;
        const rest = await Store.list().catch(() => []);
        if (rest.length) openProject(rest[0].id); else openSample();
      }, false);
      if (m === 'delete') confirmBox(Store.kind === 'desk' ? 'Mover a la papelera' : 'Eliminar proyecto', Store.kind === 'desk' ? `El archivo de «${esc(P.meta.title)}» se moverá a la papelera de reciclaje. Podrás recuperarlo desde ahí.` : `Se eliminará «${esc(P.meta.title)}» con su desglose, planos, plan y presupuesto. No se puede deshacer.`, Store.kind === 'desk' ? 'Mover a la papelera' : 'Eliminar', async () => {
        try { await Store.remove(P.id); toast('Proyecto eliminado'); } catch (e) { toast('No se pudo eliminar. Revisa tu conexión y vuelve a intentarlo.'); return; }
        const rest = await Store.list().catch(() => []);
        if (rest.length) openProject(rest[0].id); else openSample();
      });
    }));
}
/* ---------- nuevo, abrir y compartir (barra superior) ---------- */
const PROJ_EXT = 'fsp';
/* los proyectos guardados con versiones anteriores (.fmst) se siguen abriendo */
const PROJ_ACCEPT = `.${PROJ_EXT},.fmst,.json,application/json`;
const appName = () => (typeof APPINFO !== 'undefined' && APPINFO && APPINFO.name) || 'FilmSpirit';
/* kind: 'guion' (en blanco, para escribir) o 'prod'; sin decirlo, lo que permite el plan */
async function newBlankProject(kind) {
  const api = Store.kind === 'api', k = api ? kind || newKind() : null, script = (kind || k) === 'guion';
  if (!(await canCreateProject(false, k))) return;
  // sin repetir nombres en Inicio: «Guion sin título 2»
  const base = trData(script ? 'Guion sin título' : 'Proyecto sin título'), used = new Set(((typeof PROJ_LIST !== 'undefined' && PROJ_LIST) || []).map(x => x.title));
  let title = base; for (let n = 2; used.has(title); n++) title = base + ' ' + n;
  const Pn = newProject(title);
  if (k) Pn._kind = k;
  Pn._saved = false;
  if (script) {
    setProject(Pn);
    changed('data');
    setTab('script');
    // listo para escribir: el editor abierto con la primera escena
    if (typeof edEditable === 'function' && edEditable() && ACT['write-cine']) ACT['write-cine']();
    toast('Guion nuevo: escribe aquí. Se guarda solo; el título va en la pestaña Proyecto.', 4200);
    return;
  }
  setProject(Pn);
  changed('data');
  setTab('project');
  requestAnimationFrame(() => { const i = $('[data-bind="pj-meta"][data-k="title"]'); if (i) { i.focus(); i.select(); } });
  toast('Proyecto nuevo. Ponle nombre e importa el guion cuando lo tengas.', 3600);
}
/* ---------- proyectos: activos y archivados ----------
   Un solo lugar para cambiar de proyecto: arriba los dos grupos con su cantidad (Activos · Archivados),
   un buscador cuando hay muchos, la lista con cuándo se tocó cada uno y si es de equipo, y archivar o
   desarchivar sin abrir el proyecto. En la web con cuentas el archivado lo lleva el servidor (libera el
   lugar del plan y deja el proyecto en solo lectura); en el escritorio y en el navegador solo lo aparta. */
const archLocal = () => new Set(ls.get('archivados', []) || []);
const projArchived = o => Store.kind === 'api' ? !!o.archived : archLocal().has(o.id);
const canArchive = o => Store.kind === 'api' ? !!o.mine : Store.kind !== 'mem';
let PROJ_LIST = null;   // la última lista leída (para el contador de la barra)
async function projList() { const l = await Store.list(); PROJ_LIST = l; paintProjCount(); return l; }
/* el contador del botón «Proyectos»: los activos */
function paintProjCount() {
  const b = $('#openBtn'); if (!b || !PROJ_LIST) return;
  const mine = PROJ_LIST.filter(o => !o.invited), act = mine.filter(o => !projArchived(o)).length, arc = mine.length - act;
  let c = b.querySelector('.pc'); if (!c) { c = document.createElement('i'); c.className = 'pc'; b.appendChild(c); }
  c.textContent = act; c.hidden = !PROJ_LIST.length;
  b.title = `Cambiar de proyecto · ${act} ${act === 1 ? 'activo' : 'activos'}${arc ? ` · ${arc} ${arc === 1 ? 'archivado' : 'archivados'}` : ''}`;
}
const refreshProjCount = debounce(() => { projList().catch(() => { }); }, 600);
async function openMenu(anchor, tab) {
  let list = [], err = false;
  try { list = await projList(); } catch (e) { err = true; }
  const act = () => list.filter(o => !projArchived(o)), arc = () => list.filter(projArchived);
  let cur = tab || (P && arc().some(o => o.id === P.id) ? 'arc' : 'act'), q = '';
  const ico = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const IC_ARCH = ico('<rect x="3.5" y="4" width="17" height="4.5" rx="1"/><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 12.5h4"/>');
  const IC_UN = ico('<rect x="3.5" y="4" width="17" height="4.5" rx="1"/><path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M12 17v-5M9.5 14.5 12 12l2.5 2.5"/>');
  const meta = o => [Store.kind === 'api' && o.kind === 'guion' ? '<b class="pj-kind">guion</b>' : '', Store.kind === 'api' && o.archived ? 'solo lectura' : '', agoText(o.updated), o.shared ? (o.mine ? 'equipo' : `de ${esc(o.owner || 'otra persona')}`) : '', o.role && !o.mine ? esc(o.role.toLowerCase()) : ''].filter(Boolean).join(' · ');
  const row = o => {
    // invitación pendiente (web con cuentas): se acepta al abrir el proyecto, o se rechaza con ✕
    if (o.invited) return `<div class="pj-row pj-inv" data-id="${esc(o.id)}"><button class="pj-open" data-open="${esc(o.id)}"><span class="pj-t">${esc(o.title || 'Sin título')}</span><span class="pj-m"><b>invitación</b> de ${esc(o.owner || 'otra persona')}${o.role ? ' · ' + esc(String(o.role).toLowerCase()) : ''} · ábrelo para unirte</span></button><button class="pj-act" data-decline="${esc(o.id)}" title="Rechazar la invitación" aria-label="Rechazar la invitación a ${esc(o.title || 'Sin título')}">${ICO.close}</button></div>`;
    const open = P && o.id === P.id, a = projArchived(o);
    const btn = canArchive(o) ? `<button class="pj-act" data-arch="${esc(o.id)}" data-on="${ea(a ? 0 : 1)}" title="${ea(a ? 'Desarchivar: vuelve a los activos' : (Store.kind === 'api' ? 'Archivar: queda en solo lectura y libera su lugar' : 'Archivar: sale de la lista de activos'))}" aria-label="${ea(a ? 'Desarchivar' : 'Archivar')} ${esc(o.title || 'Sin título')}">${a ? IC_UN : IC_ARCH}</button>` : '';
    const more = open ? `<button class="pj-act" data-more="1" title="Acciones de este proyecto: guardar .${ea(PROJ_EXT)}, ZIP, eliminar…" aria-label="Acciones de este proyecto"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></svg></button>` : '';
    return `<div class="pj-row${ea(open ? ' on' : '')}" data-id="${esc(o.id)}"><button class="pj-open" data-open="${esc(o.id)}" ${open ? 'aria-current="true"' : ''}><span class="pj-t">${esc(o.title || 'Sin título')}</span><span class="pj-m">${open ? '<b>abierto</b>' + (meta(o) ? ' · ' : '') : ''}${meta(o)}</span></button>${more}${btn}</div>`;
  };
  // (lote AD) el plan gratis y sin cuenta: el ejemplo, primero y destacado (no se borra ni se archiva: no está guardado)
  const firstS = sampleFirst();
  const sampleRow = () => {
    const open = !!(P && P === SAMPLE_MEM.P && P._sample && !P._saved);
    return `<div class="pj-list pj-samp"><div class="pj-row pj-sample${ea(open ? ' on' : '')}"><button class="pj-open" data-m="sample" ${open ? 'aria-current="true"' : ''}><span class="pj-t" data-no-tr>${esc(sampleName())}</span><span class="pj-m"><span class="pj-ex">Ejemplo</span>${open ? '<b>abierto</b> · ' : ''}${esc(SAMPLE_INVITE)}</span></button>${open ? `<button class="pj-act" data-more="1" title="Acciones de este proyecto" aria-label="Acciones de este proyecto"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></svg></button>` : ''}</div></div>`;
  };
  const html = () => {
    const A = act(), R = arc(), L = (cur === 'arc' ? R : A).filter(o => !q || deaccent(String(o.title || '')).toLowerCase().includes(deaccent(q).toLowerCase()));
    const me = Store.kind === 'api' && APITEAM.me ? APITEAM.me : null;   // al día (archivar lo cambia)
    const lim = Store.kind === 'api' && APITEAM.anon ? '<p class="pj-lim"><span>Sin cuenta</span> · <button type="button" class="linkbtn" data-m="signup">Crea tu cuenta gratis</button></p>' : me && me.limits ? `<p class="pj-lim">${me.limits.projects ? `${me.own} de ${me.limits.projects} ${me.limits.projects === 1 ? 'proyecto de producción' : 'proyectos de producción'}${me.scripts ? ` · ${me.scripts} ${me.scripts === 1 ? 'guion' : 'guiones'}` : ''}` : `${me.scripts || 0} de ${me.limits.scripts} guiones activos`} de tu plan</p>` : '';
    const empty = err ? '<p class="pj-empty bad">No se pudo cargar la lista de proyectos. <button class="btn sm" data-m="retry">Reintentar</button></p>'
      : q ? `<p class="pj-empty">Ningún proyecto ${cur === 'arc' ? 'archivado ' : ''}con «${esc(q)}».</p>`
        : cur === 'arc' ? '<p class="pj-empty">No hay proyectos archivados. Archiva los que ya terminaste: salen de esta lista y se pueden recuperar cuando quieras.</p>'
          : '<p class="pj-empty">Aún no hay proyectos guardados aquí.</p>';
    return `<div class="pj-hd"><h5>Proyectos</h5>${lim}</div>
      <div class="pj-tabs" role="tablist" aria-label="Proyectos">
        <button role="tab" data-tab="act" aria-selected="${ea(cur === 'act')}"><span>Activos</span><i>${A.length}</i></button>
        <button role="tab" data-tab="arc" aria-selected="${ea(cur === 'arc')}"><span>Archivados</span><i>${R.length}</i></button>
      </div>
      ${list.length > 6 ? `<label class="pj-q">${ICO.search}<input type="search" id="pjQ" placeholder="Buscar proyecto" value="${esc(q)}" autocomplete="off" aria-label="Buscar proyecto"></label>` : ''}
      ${firstS && cur === 'act' && (!q || deaccent(sampleName()).toLowerCase().includes(deaccent(q).toLowerCase())) ? sampleRow() : ''}
      ${P && cur === 'act' && !q && !list.some(o => o.id === P.id) && !(firstS && P === SAMPLE_MEM.P) ? `<div class="pj-list pj-cur"><div class="pj-row on"><button class="pj-open" disabled><span class="pj-t">${esc(P.meta.title || 'Sin título')}</span><span class="pj-m"><b>abierto</b> · ${P._sample ? 'ejemplo, sin guardar' : 'sin guardar'}</span></button><button class="pj-act" data-more="1" title="Acciones de este proyecto" aria-label="Acciones de este proyecto"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></svg></button></div></div>` : ''}
      <div class="pj-list" role="tabpanel">${L.map(row).join('') || empty}</div>
      <div class="pj-ft">${Store.kind !== 'mem' ? '<button class="btn sm ghost" data-m="home">Inicio</button>' : ''}<button class="btn sm" data-m="new">+ Nuevo</button><button class="btn sm ghost" data-m="file" title="Abrir un archivo de proyecto (.${ea(PROJ_EXT)})">Abrir archivo .${PROJ_EXT}</button>${firstS ? '' : '<button class="btn sm ghost" data-m="sample">Ejemplo</button>'}</div>`;
  };
  const pp = popover(anchor, html(), p => {
    p.classList.add('pop-pj');
    const repaint = keepFocus => { const qi = $('#pjQ', p), had = keepFocus && qi && document.activeElement === qi, pos = qi ? qi.selectionStart : 0; p.innerHTML = html(); if (had) { const n = $('#pjQ', p); n.focus(); n.setSelectionRange(pos, pos); } };
    p.addEventListener('input', e => { if (e.target.id === 'pjQ') { q = e.target.value; repaint(true); } });
    p.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.id === 'pjQ') { const f = p.querySelector('.pj-open'); if (f) { e.preventDefault(); f.click(); } }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && (e.target.id === 'pjQ' || e.target.closest('.pj-list'))) {
        const L = [...p.querySelectorAll('.pj-open')]; if (!L.length) return;
        e.preventDefault(); const i = L.indexOf(document.activeElement);
        L[i < 0 ? (e.key === 'ArrowDown' ? 0 : L.length - 1) : (i + (e.key === 'ArrowDown' ? 1 : -1) + L.length) % L.length].focus();
      }
    });
    p.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.tab) { cur = b.dataset.tab; repaint(); return; }
      if (b.dataset.more) { closePop(); projectMenu($('#openBtn')); return; }
      if (b.dataset.decline) {
        try { await apiFetch('POST', `/api/p/${encodeURIComponent(b.dataset.decline)}/decline`, {}); } catch (er) { toast(er.message || 'No se pudo rechazar.', 4000); return; }
        list = list.filter(x => x.id !== b.dataset.decline); PROJ_LIST = list; paintProjCount(); repaint(); toast('Invitación rechazada.'); return;
      }
      if (b.dataset.arch) {
        const o = list.find(x => x.id === b.dataset.arch), on = b.dataset.on === '1'; if (!o) return;
        // el proyecto abierto (web con cuentas): el mismo camino que su menú (ofrece el ZIP antes de archivar)
        if (Store.kind === 'api' && P && o.id === P.id && on) { closePop(); return archiveProject(true); }
        try {
          if (Store.kind === 'api') { const r = await APITEAM.archive(o.id, on); o.archived = r.archived; if (P && o.id === P.id && SHARE) { SHARE.archived = r.archived; SHARE.ro = !!r.archived; render(); } }
          else { const s2 = archLocal(); if (on) s2.add(o.id); else s2.delete(o.id); ls.set('archivados', [...s2]); }
          toast(on ? `«${o.title || 'Sin título'}» archivado.${Store.kind === 'api' ? ' Queda en solo lectura y libera su lugar.' : ''}` : `«${o.title || 'Sin título'}» vuelve a los activos.`, 3500);
        } catch (er) { if (/^(limit_projects|limit_scripts|need_plan)$/.test(er.code || '') && typeof freeLimitNotice === 'function') { closePop(); freeLimitNotice(er.data && er.data.kind, er.message); } else toast(er.message || 'No se pudo cambiar.', 5000); return; }
        PROJ_LIST = list; paintProjCount(); repaint(); return;
      }
      closePop();
      if (b.dataset.open) { if (!P || b.dataset.open !== P.id) openProject(b.dataset.open); return; }
      if (b.dataset.m === 'home') return homeShow();
      if (b.dataset.m === 'new') return newMenu($('#newBtn'));
      if (b.dataset.m === 'file') return Store.kind === 'desk' ? deskMenu('open') : pickFile(PROJ_ACCEPT, 'restore');
      if (b.dataset.m === 'sample') openSample();
      if (b.dataset.m === 'signup') anonAsk('');
      if (b.dataset.m === 'retry') openMenu(anchor, cur);
    });
    if (list.length > 6 && !matchMedia('(pointer:coarse)').matches) setTimeout(() => { const qi = $('#pjQ', p); if (qi && document.activeElement !== qi) qi.focus(); }, 30);
  });
  return pp;
}
/* compartir: el equipo en el escritorio y en la página publicada; en otros casos, una copia para enviar */
function shareProject(anchor) {
  if (Store.kind === 'api') return apiShare(anchor);
  if (P && P._sample && !P._saved && Store.kind !== 'mem') return confirmBox('Compartir', 'Este es el proyecto de ejemplo. Para compartirlo, primero guárdalo como un proyecto tuyo.', 'Guardar como mi proyecto', adoptSample, false);
  if (P && P._shared) return teamDialog();
  if (Store.kind === 'desk') return shareDialog();
  if (Store.kind === 'db' && TARGET === 'web' && WEBTEAM.ready()) return WEBTEAM.owner ? shareDialog() : requestDialogWeb();
  popover(anchor, `<h5>Compartir</h5>
    <p class="hint" style="margin:0 6px">Trabajar en equipo, con permisos por área, funciona en ${esc(appName())} para Windows y en la página publicada en Claude.</p>
    <p class="hint" style="margin:0 6px">Desde aquí puedes enviar una copia: quien la reciba la abre con «Abrir proyecto».</p>
    <div class="menu"><button data-m="backup">Descargar una copia (.${PROJ_EXT})</button></div>`,
    p => p.addEventListener('click', e => { if (e.target.closest('[data-m="backup"]')) { closePop(); backupProject(); } }));
}
async function backupProject() {
  // el mismo formato que los archivos del escritorio: se abre con doble clic en FilmSpirit para Windows
  const data = JSON.parse(Store.serialize(P, 'data'));
  for (const k of Object.keys(data)) if (k.startsWith('_')) delete data[k];
  const frames = FRAMES_PID === P.id ? await framesAll() : await Store.loadFrames(P.id).catch(() => ({}));
  const doc = { format: PROJ_EXT + '-1', app: appName() + ' web', id: P.id, title: P.meta.title, updated: Date.now(), script: { paras: P.paras }, data, frames };
  await offerFile(fileSafe(P.meta.title) + '.' + PROJ_EXT, JSON.stringify(doc));
  ls.set('bk:' + P.id, Date.now()); setSaveState();
}
const fileSafe = s => deaccent(String(s || 'proyecto')).replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'proyecto';

/* ---------- funciones de Pro ----------
   En la web publicada en Claude todo está abierto; en escritorio manda la licencia; en la web app con
   cuentas, el plan de la cuenta o el de quien es dueño del proyecto (si es Pro, su equipo usa las funciones Pro en él). */
// importar y escribir guiones (Final Draft, Fountain y PDF; cine y dos columnas) es libre en todos los planes
const PRO_ONLY = {
  excel: 'Exportar a Excel', video: 'Exportar el animatic en video',
  photos: 'Agregar fotos al desglose', budlock: 'Proteger el presupuesto con código', nomark: 'Exportar sin marca de agua',
  brand: 'Personalizar el proyecto con logos', rayado: 'Exportar el guion rayado', scriptnum: 'Numerar las escenas del guion',
  planta: 'Exportar el storyboard con la planta de cámara', modelo3d: 'Importar modelos 3D', prodpdf: 'Exportar en PDF las pestañas de producción', usd: 'Convertir el presupuesto a dólares',
};
const PAID = p => p === 'pro' || p === 'studio';
function planAllows(f) {
  if (LIC.mode !== 'free' || f === 'pdf') return true;
  return !!(typeof SHARE !== 'undefined' && SHARE && P && SHARE.pid === P.id && PAID(SHARE.ownerPlan));
}
function proGate(f) {
  if (planAllows(f)) return true;
  const msg = `${PRO_ONLY[f] || 'Esta función'} es parte de ${appName()} Pro y Studio.`;
  if (typeof licenseDialog === 'function') licenseDialog(msg); else toast(msg, 4000);
  return false;
}

/* ---------- (lote AD) lo exclusivo de Studio: los mapas del scouting ('mapas') y los escenarios 3D importados ('set3d')
   Va según el plan de quien es dueño del proyecto abierto: si es Studio, todo su equipo los usa en él aunque cada quien
   tenga otro plan (el servidor también lo controla: los enlaces cortos de los mapas y la subida de los modelos). En el
   escritorio manda la licencia (LIC.plan); en la web publicada en Claude todo está abierto, y en el proyecto de ejemplo
   también, para poder explorarlo. Lo que un proyecto ya tiene se sigue viendo: esto decide si se agrega o se cambia.
   Lo usan otras partes de la app (con guardas typeof): studioFeat(k), studioLockHTML(k) y studioAsk(k) ---------- */
const STUDIO_FEATS = {
  mapas: { lead: 'Los mapas en Scouting son parte de FilmSpirit Studio.', what: 'El enlace al mapa de cada candidata y el «Mapa general», con todas las locaciones en un mapa, su estado y cómo llegar.' },
  set3d: { lead: 'Los escenarios 3D importados son parte de FilmSpirit Studio.', what: 'Importar el modelo 3D de una locación (de SketchUp, Blender…) como escenario de los planos, ajustarlo y hacer su versión liviana.' },
};
/* ¿el proyecto abierto puede usar esa función? */
function studioFeat(k) {
  if (!P) return false;
  if (P._sample && !P._saved) return true;
  if (TARGET === 'web') return true;
  if (DESK) return LIC.mode === 'pro' && LIC.plan === 'studio';
  if (typeof Store !== 'undefined' && Store.kind === 'api') {
    if (typeof SHARE !== 'undefined' && SHARE && SHARE.pid === P.id) return SHARE.ownerPlan === 'studio';
    return !P._shared && LIC.plan === 'studio';   // todavía no está en el servidor: será de esta cuenta
  }
  return true;
}
/* el candado chico con «Studio», junto a lo que es de Studio */
function studioLockHTML(k) { return `<span class="st-lock" data-k="${ea(k || '')}" title="Función de FilmSpirit Studio">${ICO.lock}<span>Studio</span></span>`; }
/* la ventana que explica que es de Studio, con «Ver planes de suscripción» */
function studioAsk(k) {
  const F = STUDIO_FEATS[k] || STUDIO_FEATS.mapas, api = typeof Store !== 'undefined' && Store.kind === 'api';
  // alguien del equipo (no quien administra): en este proyecto lo decide el plan de quien lo administra
  const team = api && P && P._shared && typeof SHARE !== 'undefined' && SHARE && SHARE.pid === P.id && !SHARE.admin;
  const why = DESK ? 'Se activan con una licencia de FilmSpirit Studio.'
    : team ? 'En este proyecto los habilita el plan de quien lo administra: si tiene Studio, todo el equipo los usa.'
      : 'Con Studio los usa todo tu equipo en tus proyectos, aunque cada persona tenga otro plan.';
  const m = modal({
    title: 'Función de Studio',
    body: `<div class="st-ask">${studioLockHTML(k)}<p><b>${esc(F.lead)}</b></p><p>${esc(F.what)}</p><p>${esc(why)}</p><p class="hint">Lo que este proyecto ya tiene se sigue viendo.</p></div>`,
    foot: `<button class="btn" data-close>Ahora no</button><button class="btn primary" id="stGo">Ver planes de suscripción</button>`,
  });
  $('#stGo', m).onclick = () => {
    closeModal();
    if (typeof licenseDialog !== 'function') return;
    if (api) licenseDialog('', 'studio'); else licenseDialog(F.lead);
  };
  return m;
}
