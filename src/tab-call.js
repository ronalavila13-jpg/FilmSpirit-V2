/* ============================================================
   Pestaña · HOJA DE LLAMADO — una por jornada, a partir del stripboard
   Encabezado (proyecto, productora, fecha, jornada), producción y dirección,
   centro de salud, horarios (almuerzo, amanecer, atardecer), clima, llamado
   general y locaciones; cronograma de la jornada; equipo técnico por área con
   su llamado; reparto con recojo y llamado; proveedores; notas y avance.
   El directorio (nombres, teléfonos, correos) es del proyecto; los horarios,
   de cada jornada.
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
/* ---------- lista para enviar ----------
   Lo que la hoja de una jornada necesita antes de salir: si falta, el PDF lo imprime como «Por confirmar» y se descubre en el set.
   Cada falta dice dónde se completa (sel: el campo de esta hoja; tab: otra pestaña). */
function callMissing(n) {
  const { days, dates } = callDays(), d = days[n]; if (!d) return [];
  const C = CALL(), dd = peekDay(d.id), def = callDefaults(d), out = [];
  if (!dates[n]) out.push({ k: 'date', txt: 'la fecha', tab: 'plan', hint: 'Se pone en el plan de rodaje: «Empieza».' });
  if (!(dd.crewCall || def.crewCall)) out.push({ k: 'call', txt: 'el llamado general', sel: '[data-bind="cs-day"][data-f="crewCall"]' });
  const m = dd.meet || {}, locs = callLocs(d);
  if (!(m.addr || '').trim() && !(locs[0] && locs[0][1])) out.push({ k: 'meet', txt: 'la dirección de citación', sel: '.cl-addr' });
  if (!((dd.hosp || {}).name || C.hospital.name || '').trim()) out.push({ k: 'hosp', txt: 'el centro de salud', sel: '[data-bind="cs-hosp"][data-f="name"]' });
  const noActor = callCast(d).filter(({ el }) => !(callTalent(el.id).actor || '').trim());
  if (noActor.length) out.push({ k: 'cast', txt: noActor.length === 1 ? 'quién hace a' : `quién hace a ${noActor.length} personajes`, name: noActor.length === 1 ? titleCase(noActor[0].el.name) : '', sel: `[data-bind="cs-tal"][data-id="${CSS.escape(noActor[0].el.id)}"][data-f="actor"]` });
  if (!C.crew.some(c => (c.name || '').trim() && !(dd.out || {})[c.id])) out.push({ k: 'crew', txt: 'el equipo', sel: '.cl-crew', hint: 'Nadie del equipo tiene nombre todavía.' });
  return out;
}
/* versiones: cada jornada guarda la última hoja que salió (dd.exp = { v, t, sig }). La firma resume lo que se imprime
   (los mismos datos del Excel): si después cambia el plan, el equipo o la jornada, la hoja enviada quedó vieja */
function callSig(n, cd) {
  // lo que sale impreso, con los datos crudos (no el texto ya formateado: el mismo en español y en inglés) y sin
  // calcular los lentes de la planta 3D (caro); cd: callDays() ya calculado
  const { days, dates } = cd || callDays(), d = days[n]; if (!d) return '';
  const C = CALL(), dd = peekDay(d.id), M = P.meta, next = days[n + 1];
  const T = planDayTimes(d, dd.at, dd.dur);
  const el = id => { const e = P.elements[id]; return e ? e.cat + ':' + e.name : id; };
  const rows = d.rows.map(i => {
    const it = P.schedule.items[i], x = T.get(i) || {};
    if (it.e) return ['e', it.name, it.det, it.t, x.start, x.dur, it.hl];
    const s2 = sceneOfKey(it.k); if (!s2) return ['?', it.k];
    return [it.k, it.sp, s2.heading, synopsisOf(s2), it.t, x.start, x.dur, it.fig, planLoc(it, s2), it.hl, partEighths(it), [...D.sem[s2.idx]].map(el).sort(),
      (D.shotsBy[it.k] || []).map(sh => [D.code[sh.id], sh.size, sh.desc, sh.lens, sh.snd, sh.chars, sh.support, sh.angle, sh.move])];
  });
  const day = x => x ? x.getFullYear() + '-' + (x.getMonth() + 1) + '-' + x.getDate() : '';
  return hash53(JSON.stringify([M.title, M.company, M.directors, M.producers, (M.projLogo || '').length, (M.logo || '').length, day(dates[n]), rows, d.brk && d.brk.t,
    Object.entries(dd).filter(([k]) => k !== 'exp'), callDefaults(d), C.hospital, C.client, C.crew, C.vendors, C.shotTimes, C.radio, P.schedule.locs, P.schedule.legend, D.castNum,
    callCast(d).map(({ el: e, sc }) => [e.id, e.name, sc, callTalent(e.id)]),
    next ? [next.keys, day(dates[n + 1]), peekDay(next.id).crewCall, callDefaults(next).crewCall, callLocs(next), (A => A && [A.rows.map(r => [r.code, r.set, r.syn, r.dn, r.cast, r.e8]), A.cast])(callAdvance(n, { days, dates }))] : null])).toString(36);
}
/* la versión con que sale ahora: la misma si nada cambió; si cambió, la siguiente. Si quien exporta no puede editar la
   hoja (o saca solo algunas páginas), su archivo no queda registrado: lleva la última versión si es la misma hoja, o
   ninguna (para que no circulen dos «v2» distintas) */
function callVer(n, cd, record = true) {
  const { days } = cd || callDays(), d = days[n]; if (!d) return null;
  const e = peekDay(d.id).exp, sig = callSig(n, cd);
  if (e && e.sig === sig) return { v: e.v, t: e.t, sig, same: true };
  if (!record || !callEditable()) return null;
  return { v: ((e && e.v) || 0) + 1, t: Date.now(), sig, same: false };
}
const callVerTxt = V => { if (!V) return ''; const d = new Date(V.t); return `v${V.v} · ${d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace(/\.$/, '')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
/* después de exportar: cada jornada que salió guarda su versión (si quien exporta puede editar la hoja). No es un paso
   de «Deshacer»: deshacer no puede borrar que una hoja ya salió (y que se reuse su número) */
function callExported(list, vers) {
  if (!callEditable()) return;
  histCapture();   // lo que estaba por anotarse en el historial va antes, por su lado
  const { days } = callDays(); let ch = false;
  list.forEach(n => { const d = days[n], V = vers && vers[n]; if (!d || !V || V.same) return; dayData(d.id).exp = { v: V.v, t: V.t, sig: V.sig }; ch = true; });
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
    const st = days.map((d, i) => ({ d, i, e: peekDay(d.id).exp })).filter(x => x.e && x.e.sig && !CALL_STALE_SEEN.has(x.d.id + ':' + x.e.v) && x.e.sig !== callSig(x.i, cd));
    if (!st.length) return;
    st.forEach(x => CALL_STALE_SEEN.add(x.d.id + ':' + x.e.v));
    toast(st.length === 1 ? `Con este cambio, la hoja de llamado de la jornada ${st[0].i + 1} que exportaste (v${st[0].e.v}) quedó vieja.` : `Con este cambio, ${st.length} hojas de llamado que exportaste quedaron viejas.`,
      9000, { label: 'Ver la hoja', fn: () => { UI.callDay = st[0].i; setTab('call'); } }).classList.add('t-stale');
  };
  CALL_STALE_T = setTimeout(() => typeof requestIdleCallback === 'function' ? requestIdleCallback(() => check(), { timeout: 3000 }) : check(), 2000);
}
/* el estado de la jornada: faltas, si ya salió y si quedó vieja */
function callState(n) {
  const { days } = callDays(), d = days[n]; if (!d) return null;
  const e = peekDay(d.id).exp, miss = callMissing(n);
  const stale = !!(e && e.sig && e.sig !== callSig(n));
  return { miss, e, stale };
}
/* ---------- datos de cada jornada que agregó la 1.2 ----------
   dd.motor (listos motor), dd.dcall {área: hora}, dd.cast[personaje] {pu, call, ves, mq, ready, obs},
   dd.shotAt {plano: minutos desde el inicio de su escena} (la hora escrita de un plano en el cronograma),
   dd.meet {addr, note, links: [url], ph: [{id, w, h}]} (fotos en FRAMES['cl~<jornada>~<foto>']),
   dd.mov [{id, name, driver, pax: [persona]}]; persona = 'c:<id del equipo>' o 'a:<id del personaje>' */
function callNormalize(Px) {
  const C = Px.call; if (!C || typeof C !== 'object') return;
  // (lote U) los canales de radio: una línea por proyecto («1 Producción, 2 Libre, 3 Transporte…»)
  if (C.radio != null && (typeof C.radio !== 'string' || !C.radio.trim())) delete C.radio;
  else if (C.radio) C.radio = C.radio.replace(/[\u0000-\u001f]+/g, ' ').slice(0, 300);
  if (!C.days || typeof C.days !== 'object') return;
  const str = v => typeof v === 'string';
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
  }
}
const clPhKey = (dayId, pid) => `cl~${dayId}~${pid}`;
const SND_OPTS = [['', '—'], ['si', 'Sí'], ['amb', 'Ambiente'], ['no', 'No (MOS)']];
const SND_NAME = { si: 'Sí', amb: 'Amb.', no: 'MOS' };
/* el plano en la hoja de llamado: descripción (tamaño, quién, soporte, ángulo), acción, lente, sonido y reparto */
function shotCallInfo(sh) {
  const els = (sh.chars || []).map(id => P.elements[id]).filter(Boolean);
  const det = [els.map(e => titleCase(e.name)).join(', '), sh.support || '', sh.angle && sh.angle !== 'Normal' ? sh.angle : 'Ángulo normal', sh.move && sh.move !== 'Fijo' ? sh.move : ''].filter(Boolean);
  const desc = [sh.size || '', ...det];
  let lens = '';
  if (sh.lens) lens = String(sh.lens).replace(/\s*mm$/i, '') + ' mm';
  else if (sh.ws !== '2d' && typeof s3Of === 'function') { try { lens = Math.round(s3Of(sh).keys[0].cam.lens) + ' mm'; } catch (e) { lens = ''; } }
  const cast = els.filter(e => e.cat === 'cast').map(e => D.castNum[e.id] || titleCase(e.name));
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
function callSched(d) {
  const dd = peekDay(d.id), T = planDayTimes(d, dd.at, dd.dur);
  const base = callRows(d), seen = new Set();
  const hm = m => m == null ? '' : minToHm(m);
  const rows = base.map((r, j) => {
    const it = P.schedule.items[d.rows[j]], x = T.get(d.rows[j]) || {}, est = !((dd.at || {})[itemKey(it)] || it.t);
    const o = { ...r, key: itemKey(it), start: x.start, dur: x.dur, est, t0: hm(x.start), t1: '' };
    if (!r.ev) {
      const first = !seen.has(r.it.k); seen.add(r.it.k);
      const shots = first && !r.it.sp ? (D.shotsBy[r.it.k] || []) : [];
      const P0 = x.start != null && x.dur ? shotOffsets(shots, x.dur, peekDay(d.id).shotAt) : null;
      o.shots = shots.map((sh, i) => {
        const a = P0 ? x.start + P0.pos[i] : null, b = P0 ? x.start + (i + 1 < shots.length ? P0.pos[i + 1] : x.dur) : null;
        return { sh, ...shotCallInfo(sh), t0: hm(a == null ? null : Math.round(a)), t1: hm(b == null ? null : Math.round(b)),
          fixed: !!(P0 && P0.fix[i] != null), a0: P0 ? P0.lo[i] : 0, b0: P0 ? P0.hi[i] : 0, lo: P0 ? hm(x.start + P0.lo[i]) : '', hi: P0 ? hm(x.start + P0.hi[i]) : '' };
      });
      if (P0) Object.assign(o, { sStart: x.start, sDur: x.dur });
      o.set = titleCase(r.s.locBase || '');
      o.props = r.desc && r.desc.includes('Utilería y arte: ') ? r.desc.slice(r.desc.indexOf('Utilería y arte: ') + 17) : '';
    }
    return o;
  });
  // el cierre: los eventos después de la última escena (desmontaje, regreso…) y el fin de la jornada
  let last = -1; rows.forEach((r, j) => { if (!r.ev) last = j; });
  const end = dd.end || d.brk.t || (T.end != null ? hm(T.end) : '');
  return { rows: last < 0 ? rows : rows.slice(0, last + 1), close: last < 0 ? [] : rows.slice(last + 1), end, byShot: rows.some(r => r.shots && r.shots.length), motor: (rows.find(r => !r.ev) || {}).t0 || '' };
}
/* personas que pueden ir en la movilidad: el equipo de la jornada (con nombre) y el reparto */
function callPeople(d, dd) {
  const crew = CALL().crew.filter(c => (c.name || '').trim() && !(dd.out || {})[c.id]).map(c => ({ k: 'c:' + c.id, name: c.name.trim(), sub: c.role }));
  const cast = callCast(d).map(({ el }) => { const T = callTalent(el.id); return { k: 'a:' + el.id, name: (T.actor || '').trim() || titleCase(el.name), sub: (T.actor || '').trim() ? titleCase(el.name) : 'Reparto' }; });
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
const mapLink = (m, locs) => { const l = (m.links || []).map(safeUrl).filter(Boolean); return l.find(u => /google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(u)) || l.find(u => /waze\.com\//i.test(u)) || mapsUrl(m, locs); };
const linkName = u => { try { const h = new URL(u).hostname.replace(/^www\./, ''); return /google\.|goo\.gl/.test(h) && /maps/.test(u) ? 'Google Maps' : /waze/.test(h) ? 'Waze' : h; } catch (e) { return 'Enlace'; } };
const imgOk = u => typeof u === 'string' && /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(u) && !/^data:image\/svg/i.test(u) ? u : '';
/* ---------- la hoja como la referencia (lote U) ----------
   Una página que se lee de un vistazo: arriba, en tres columnas, la productora y su equipo clave con teléfono; el
   proyecto, la jornada, la fecha y el llamado general en grande; el clima, el punto de encuentro y la locación con su
   mapa. Luego la nota del 1.er asistente con la utilería especial, el cronograma en lista, el avance de la jornada
   siguiente y una sola tabla de personas (el reparto y el equipo por área). Al pie, el centro de salud y los canales de
   radio. Lo que la referencia no tiene (por plano, horarios del reparto, punto de encuentro con fotos, movilidad,
   proveedores) va después, con el mismo estilo (en el PDF, en la página siguiente). */
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
   (del directorio; si falta, el nombre de Proyecto) */
function callKeyCrew(dd) {
  const M = P.meta, one = re => crewBy(re, dd)[0] || null;
  const prods = (M.producers || []).filter(x => personName(x) && !/ejecutiv/i.test(x.role || ''));
  const jp = one(/jefatura de producci|jefe de producci/i) || one(/^producci[oó]n$/i), dir = one(/^direcci[oó]n$/i);
  const ad = one(/^(1\.?\s*er|primer) asistente de direcci/i) || one(/asistente de direcci/i);
  const it = (lab, c, alt) => ({ lab, name: c ? c.name.trim() : alt || '', phone: c ? (c.phone || '').trim() : '', email: c ? (c.email || '').trim() : '' });
  return [it('Jefatura de producción', jp, prods.map(personName)[0]), it('Dirección', dir, (M.directors || []).map(personName).filter(Boolean)[0]), it('1.er asistente de dirección', ad)];
}
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
/* el reparto de una escena con su número: «Ana (1), Tito (2)» */
const castLine = s => sceneCast(s.idx).map(e => titleCase(e.name) + (D.castNum[e.id] ? ` (${D.castNum[e.id]})` : '')).join(', ');
/* el avance: solo la jornada siguiente (aunque caiga después de días libres), con su llamado, sus locaciones y sus escenas;
   null en la última jornada («Fin de rodaje») */
function callAdvance(n, cd) {
  const { days, dates } = cd || callDays(), d = days[n + 1]; if (!d) return null;
  const rows = d.rows.map(i => P.schedule.items[i]).filter(it => it && it.k).map(it => {
    const s = sceneOfKey(it.k); if (!s) return null;
    return { it, s, code: rowCode(it), ie: ieLab(s), set: setOf(s), syn: synopsisOf(s) || '', dn: DN_LAB[stripDN(s)], strip: stripKey(s), cast: sceneCast(s.idx).map(e => D.castNum[e.id]).filter(Boolean), e8: partEighths(it) };
  }).filter(Boolean);
  return { n: n + 2, date: dates[n + 1], call: peekDay(d.id).crewCall || callDefaults(d).crewCall, locs: callLocs(d).map(x => x[0]), rows,
    e8: rows.reduce((a, r) => a + r.e8, 0), cast: callCast(d).map(({ el }) => ({ n: D.castNum[el.id] || '', name: titleCase(el.name) })) };
}
const advDate = A => A && A.date ? cap1(fmtDate(A.date)) : '';
/* el avance en una línea (el resumen para el chat y la línea del Excel) */
const advLine = A => !A ? tr('Fin de rodaje') : [tr(`Avance · Jornada ${A.n}`) + (A.date ? ' · ' + advDate(A) : ''), A.call ? tr(`llamado ${A.call}`) : '', A.locs.join(', '), A.rows.length ? tr(`${A.rows.length} ${A.rows.length === 1 ? 'escena' : 'escenas'}`) + ' · ' + tr(`${fmtEighths(A.e8)} págs.`) : ''].filter(Boolean).join(' · ');
/* el traslado: hacia dónde va (la locación de la escena que sigue) y su mapa */
function callMoveTo(rows, j, m) {
  const nx = rows.slice(j + 1).find(r => !r.ev); if (!nx) return null;
  const name = nx.loc, addr = ((P.schedule.locs || []).find(l => l.name === name) || {}).addr || '';
  const det = (rows[j].det || '').trim(), q = addr || det || name;
  return { name, addr, url: q ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q) : '' };
}
const isMove = r => r.ev && /traslado|company move/i.test(r.name || '');
/* la hora del almuerzo que sale del cronograma (el evento «Almuerzo» de la jornada), si no se escribió */
const callLunch = S => (([...S.rows, ...S.close].find(r => r.ev && /almuerzo|lunch/i.test(r.name || '')) || {}).t0 || '');
RENDER.call = function () {
  const v = $('#view');
  $$('.toast.t-stale').forEach(t => t.remove());   // ya se está en la hoja
  if (!D.sc.scenes.length) { v.innerHTML = emptyScript(); bindView(); return; }
  const { days, dates } = callDays();
  if (!days.length) { v.innerHTML = `<div class="ws ws-1"><section class="center"><div class="scroller pad"><p class="hint">Primero arma el plan de rodaje: cada jornada tendrá su hoja de llamado.</p></div></section></div>`; bindView(); return; }
  if (UI.callDay == null || UI.callDay >= days.length) UI.callDay = 0;
  const n = UI.callDay, d = days[n], dt = dates[n];
  const ed = callEditable(), dis = ed ? '' : 'disabled';
  const C = CALL(), dd = peekDay(d.id), def = callDefaults(d);
  const crewAll = callCrew(), out = dd.out || {}, crew = crewAll.filter(c => !out[c.id]), absent = crewAll.filter(c => out[c.id]), cast = callCast(d), locs = callLocs(d);
  const M = P.meta;
  const hosp = { ...C.hospital, ...(dd.hosp || {}) };
  const inp = (f, ph, extra = '') => `<input type="text" value="${esc(dd[f] || '')}" placeholder="${esc(ph || '')}" data-bind="cs-day" data-f="${ea(f)}" ${dis} ${extra}>`;
  const fig = d.rows.reduce((a, i) => a + num(P.schedule.items[i].fig), 0);
  const call = dd.crewCall || def.crewCall;
  const inf = dayInfo(d.keys, d.rows);
  const crewN = crew.filter(c => (c.name || '').trim()).length;
  const ph = (t, alt = '') => ed ? t : alt;
  const show = UI.csShow || (UI.csShow = new Set());
  const xBtn = (act, id, lab = 'Quitar') => ed ? `<button class="cs-x" data-act="${ea(act)}" data-id="${ea(id)}" aria-label="${esc(lab)}" title="${esc(lab)}"${act === 'cs-crew-x' ? ' aria-haspopup="menu"' : ''}>${ICO.close}</button>` : '';
  const dateTxt = dt ? capFirst(dt.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')) : 'Sin fecha';
  const S = callSched(d), shotT = callShotTimes(), thumbs = callThumbs();
  const edSnd = !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('storyboard'));   // el sonido es del plano: lo marca quien edita el storyboard
  const logo = imgOk(M.projLogo), clogo = imgOk(M.logo);
  const tel = p => p ? `<a href="tel:${ea(String(p).replace(/[^\d+]/g, ''))}">${esc(p)}</a>` : '';
  const m = dd.meet || {}, mUrl = mapsUrl(m, locs);
  // la hora de una fila del cronograma: se escribe aquí, libre (vacía: sigue del llamado y de los tiempos del plan)
  const rowTime = r => ed ? tmIn((dd.at || {})[r.key] || r.it.t || '', r.t0 || r.t || 'Hora', `data-bind="cl-at" data-k="${ea(r.key)}" aria-label="${ea('Hora de ' + (r.ev ? r.name : 'la escena ' + r.code))}" title="Escribe la hora; vacía, sigue a la fila anterior"`, dis) : `<b class="tnum">${esc(r.t0 || r.t || '')}</b>`;
  // arriba de todo: la marca y, a la derecha, el estado de la hoja (lo que falta para enviarla, si la que salió quedó
  // vieja o si está lista) con «Copiar resumen» y «Enviar»
  const ST = callState(n);
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
  // 1. la cabecera en tres columnas
  const lunchAuto = def.lunch || callLunch(S);
  const fromPlan = !dd.crewCall && !!def.crewCall, motorPlan = !dd.motor && !!S.motor, lunchPlan = !dd.lunch && !!lunchAuto;
  const keyCrew = callKeyCrew(dd);
  const colL = `<div class="cl-c1">${clogo ? `<img class="cl-clogo" src="${ea(clogo)}" alt="">` : ''}${M.company ? `<b class="cl-co" data-no-tr>${esc(M.company)}</b>` : `<b class="cl-co cl-dim">Productora</b>`}
    ${keyCrew.map(k => `<div class="cl-kc"><span class="cl-kl">${esc(k.lab)}</span>${k.name ? `<b data-no-tr>${esc(k.name)}</b>` : `<span class="cl-dim">${ed ? 'Sin nombre' : 'Por confirmar'}</span>`}${k.phone ? `<span class="cl-kp">${CL_ICO.phone}${tel(k.phone)}</span>` : ''}</div>`).join('')}</div>`;
  const colC = `<div class="cl-c2">${logo ? `<img class="cl-plogo" src="${ea(logo)}" alt="${ea(M.title || '')}">` : `<h2 class="cl-ttl" data-no-tr>${esc(M.title || '')}</h2>`}
    <div class="cl-jn">${days.length > 1 ? hdStep(stepA(n - 1), stepA(n + 1)) : ''}<span>Jornada ${n + 1} de ${days.length}</span>${(E => E.length ? `<span class="cl-ep" data-no-tr>${esc(E.length === 1 ? epLabel(P, E[0]) : 'Episodios ' + E.join(', '))}</span>` : '')(epsOfKeys(d.keys))}</div>
    <div class="cl-date">${esc(dateTxt)}</div>
    <div class="cl-callg"><span class="cl-kl">Llamado general</span><span class="cl-big">${tmIn(call, ph('Falta', '-'), `data-bind="cs-day" data-f="crewCall" aria-label="Llamado general"${!call && ed ? ' data-miss="1"' : ''}`, dis)}${fromPlan ? ' <span class="hd-tag">del plan</span>' : ''}</span></div>
    <div class="cl-sub"><label><span>Listos motor</span>${hdAuto(tmIn(dd.motor, S.motor.replace('~', '') || ph('Hora', '-'), 'data-bind="cs-day" data-f="motor" aria-label="Listos motor" title="La hora en que se rueda el primer plano"', dis), motorPlan)}</label>
      <label><span>Almuerzo</span>${hdAuto(tmIn(dd.lunch || '', lunchAuto || ph('Hora', '-'), 'data-bind="cs-day" data-f="lunch" aria-label="Almuerzo" title="Hora del almuerzo"', dis), lunchPlan)}</label>
      ${ed || (dd.craft || '').trim() ? `<label class="cl-craft"><span>Catering</span>${inp('craft', ph('Opcional'), 'aria-label="Catering" title="Por ejemplo: durante la jornada"')}</label>` : ''}</div>
    <div class="cl-sum">${inf.e ? esc(fmtEighths(inf.e)) + ' págs. · ' : ''}${d.keys.length} ${d.keys.length === 1 ? 'escena' : 'escenas'}${S.byShot ? ` · ${S.rows.reduce((a, r) => a + (r.shots ? r.shots.length : 0), 0)} planos` : ''}</div></div>`;
  const wxKeys = ['wx', 'hi', 'lo', 'hum', 'sunrise', 'sunset'], wxOpen = wxKeys.some(k => (dd[k] || '').trim()) || (UI.csOpen && UI.csOpen.has('wx'));
  const locAddr = (m.addr || '').trim() || (locs[0] && locs[0][1]) || '';
  const colR = `<div class="cl-c3">
    ${wxOpen ? `<div class="cl-ir">${CL_ICO.wx}<div class="cl-wx">${inp('wx', ph('Clima'), 'aria-label="Clima" title="Soleado, nublado, lluvia, viento…"')}<span class="cl-temp"><span>Máx.</span>${inp('hi', ph('°C'), 'aria-label="Máxima" title="Máxima (°C)"')}<span>Mín.</span>${inp('lo', ph('°C'), 'aria-label="Mínima" title="Mínima (°C)"')}<span>Hum.</span>${inp('hum', ph('%'), 'aria-label="Humedad" title="Humedad (%)"')}</span></div></div>
    <div class="cl-ir">${CL_ICO.sun}<div class="cl-sunr"><label><span>Amanecer</span>${tmIn(dd.sunrise, ph('Hora', '-'), 'data-bind="cs-day" data-f="sunrise" aria-label="Amanecer"', dis)}</label><label><span>Anochece</span>${tmIn(dd.sunset, ph('Hora', '-'), 'data-bind="cs-day" data-f="sunset" aria-label="Anochece"', dis)}</label></div></div>`
    : ed ? `<button type="button" class="cl-ir cl-irb" data-act="cs-open" data-k="wx">${CL_ICO.wx}<span><b>Clima</b><small>Máxima y mínima, amanecer y anochecer</small></span></button>` : ''}
    <div class="cl-ir">${CL_ICO.park}<textarea rows="${Math.min(4, Math.max(1, Math.ceil((m.note || '').length / 36), (m.note || '').split('\n').length))}" class="cl-park" placeholder="${ea(ph('Punto de encuentro o estacionamiento'))}" data-bind="cl-meet" data-f="note" ${dis} aria-label="Punto de encuentro o estacionamiento">${esc(m.note || '')}</textarea></div>
    <div class="cl-ir cl-irl">${ICO.pin}<div>${locs.length ? locs.map(([nm, ad]) => `<b>${esc(nm)}</b>${ad ? `<small data-no-tr>${esc(ad)}</small>` : ''}`).join('') : '<span class="cl-dim">Asigna locaciones en el plan de rodaje</span>'}
      ${!locs.some(x => x[1]) && locAddr ? `<small data-no-tr>${esc(locAddr)}</small>` : ''}${mapLink(m, locs) ? `<a class="cl-map" href="${ea(mapLink(m, locs))}" target="_blank" rel="noopener noreferrer">Ver mapa</a>` : ed ? `<button type="button" class="linkbtn cl-map" data-act="cl-maplink">+ Enlace del mapa</button>` : ''}</div></div></div>`;
  // 2. la nota del 1.er asistente, al centro, y la utilería especial
  const notes = (dd.notes || '').trim(), noteOpen = notes || (UI.csOpen && UI.csOpen.has('notes')), props = callProps(d);
  const noteHTML = (noteOpen ? `<div class="cl-note"><h3>Nota para el equipo</h3><textarea rows="${Math.min(10, Math.max(1, (dd.notes || '').split('\n').length))}" data-bind="cs-day" data-f="notes" aria-label="Nota para el equipo" placeholder="${ea(ph('Seguridad, ropa, estacionamiento, lo que no se puede publicar…'))}" ${dis}>${esc(dd.notes || '')}</textarea></div>`
    : ed ? `<div class="hd-box cl-noteadd">${hdAdd('Nota para el equipo', 'Seguridad, ropa, estacionamiento, lo que no se puede publicar. Sale al centro, debajo de la cabecera.', 'data-act="cs-open" data-k="notes"', lgCol('call', 'note'))}</div>` : '')
    + (props.length ? `<p class="cl-util"><b>Utilería especial:</b> <span>${esc(props.join(', '))}</span></p>` : '');
  // 3. el cronograma en lista: la hora (eventos) o el número de escena (con su hora debajo), el encabezado con la sinopsis
  // y el reparto con su número, D/N y las páginas; los traslados, una banda celeste con su dirección y el mapa
  const list = [...S.rows, ...S.close];
  const lrow = (r, j) => {
    if (isMove(r)) { const to = callMoveTo(list, j, m); return `<tr class="cl-lmv"><td class="cl-ln">${rowTime(r)}</td><td colspan="4"><span class="cl-mvb">${CL_ICO.move}<b>${esc(r.name)}</b>${r.det ? `<span data-no-tr>${esc(r.det)}</span>` : ''}${to ? `<span>→ <b>${esc(to.name)}</b>${to.addr ? ` · <span data-no-tr>${esc(to.addr)}</span>` : ''}</span>${to.url ? `<a href="${ea(to.url)}" target="_blank" rel="noopener noreferrer">Ver mapa</a>` : ''}` : ''}</span></td></tr>`; }
    if (r.ev) { const hc = hlc(r.it) || lgCol('plan', 'ev'); return `<tr class="cl-lev${ea(lgDark(hc))}" style="--rc:${ea(hc)}"><td class="cl-ln">${rowTime(r)}</td><td colspan="4"><b>${esc(r.name)}</b>${r.det ? `<span data-no-tr>${esc(r.det)}</span>` : ''}</td></tr>`; }
    const col = hlc(r.it) || stripColor(r.s), dn = DN_LAB[stripDN(r.s)], syn = synopsisOf(r.s);
    return `<tr class="cl-lsc" style="--rc:${ea(col)}"><td class="cl-ln"><span class="cl-sn tnum">${esc(r.code)}</span>${rowTime(r)}</td><td class="cl-lie">${esc(ieLab(r.s))}</td>
      <td class="cl-lsd"><b>${esc(setOf(r.s))}${r.it.sp ? ` <em>(parte ${esc(r.it.sp)})</em>` : ''}</b><span class="m-only">${esc(ieLab(r.s))} · ${esc(dn)}</span>${syn ? `<span class="cl-syn">${esc(syn)}</span>` : ''}${castLine(r.s) ? `<span class="cl-lc">${esc(castLine(r.s))}${r.fig ? ` · Fig. ${esc(String(r.fig))}` : ''}</span>` : ''}</td>
      <td class="cl-ldn">${esc(dn)}</td><td class="cl-lpg tnum">${esc(r.pages)}</td></tr>`;
  };
  const schedHTML = `<table class="cl-list"><thead><tr><th>Hora · Esc.</th><th>I/E</th><th>Escena</th><th>D/N</th><th>Págs.</th></tr></thead><tbody>
    ${list.map(lrow).join('') || '<tr><td colspan="5" class="hint">Jornada sin escenas.</td></tr>'}
    <tr class="cl-lend"><td class="cl-ln">${ed ? `<span class="cl-endt">${tmIn(dd.end || '', S.end || 'Hora', 'data-bind="cl-end" aria-label="Hora de fin de jornada" title="Escribe la hora; vacía, la que sale de los tiempos"', dis)}</span>` : `<b class="tnum">${esc(S.end || '')}</b>`}</td><td colspan="3"><b>Fin de jornada</b> <span class="cl-dim">· ${d.keys.length} ${d.keys.length === 1 ? 'escena' : 'escenas'}</span></td><td class="cl-lpg tnum"><small>Total</small> <b>${esc(fmtEighths(inf.e))}</b></td></tr></tbody></table>`;
  // 4. el avance: la jornada siguiente (o «Fin de rodaje»)
  const A = callAdvance(n);
  const advHTML = `<section class="cl-sec cl-adv"><header><h3>${A ? `Avance · Jornada ${A.n}${A.date ? ' · ' + esc(advDate(A)) : ''}` : 'Avance de la jornada siguiente'}</h3>${A ? `<span class="hint">${A.call ? `Llamado general <b class="tnum">${esc(A.call)}</b>` : 'Llamado por confirmar'}${A.locs.length ? ` · <span>${esc(A.locs.join(', '))}</span>` : ''}</span>${days.length > 1 ? `<button type="button" class="linkbtn" data-act="cl-day" data-d="${n + 1}">Ver su hoja ›</button>` : ''}` : ''}</header>
    ${A ? `<table class="cl-list cl-advt"><thead><tr><th>Esc.</th><th>I/E</th><th>Escena</th><th>D/N</th><th>Reparto</th><th>Págs.</th></tr></thead><tbody>${A.rows.map(r => `<tr class="cl-lsc" style="--rc:${ea(hlc(r.it) || lgCol('plan', r.strip))}"><td class="cl-ln"><span class="cl-sn tnum">${esc(r.code)}</span></td><td class="cl-lie">${esc(r.ie)}</td><td class="cl-lsd"><b>${esc(r.set)}</b><span class="m-only">${esc(r.ie)} · ${esc(r.dn)}</span>${r.syn ? `<span class="cl-syn">${esc(r.syn)}</span>` : ''}</td><td class="cl-ldn">${esc(r.dn)}</td><td class="cl-lcn tnum">${esc(r.cast.join(', '))}</td><td class="cl-lpg tnum">${esc(fmtEighths(r.e8))}</td></tr>`).join('') || '<tr><td colspan="6" class="hint">Jornada sin escenas.</td></tr>'}</tbody></table>
    <p class="cl-tot"><span>Total: <b class="tnum">${esc(fmtEighths(A.e8))} págs.</b></span>${A.cast.length ? `<span>Reparto: <span>${esc(A.cast.map(c => (c.n ? c.n + ' ' : '') + c.name).join(', '))}</span></span>` : ''}</p>` : '<p class="cl-fin">Fin de rodaje</p>'}</section>`;
  // 5. una sola tabla de personas: primero el reparto, luego el equipo por área (el nombre del área separa, fino)
  const depts = [...CS_DEPTS, ...(typeof TEAM_EXTRA !== 'undefined' ? TEAM_EXTRA : []).filter(([dp]) => crew.some(c => c.dept === dp && ((c.name || '').trim() || show.has(c.id))))];
  const vis = c => (c.name || '').trim() || show.has(c.id);
  const add = (dept, name) => ed ? `<button class="cs-add" data-act="cs-crew-add" data-dept="${ea(dept)}" title="Agregar en ${esc(name.toLowerCase())}" aria-label="Agregar en ${esc(name.toLowerCase())}">+</button>` : '';
  const full = depts.filter(([dept]) => crew.some(c => c.dept === dept && vis(c))), empty = depts.filter(x => !full.includes(x));
  const castRows = cast.map(({ el, sc }) => {
    const T = callTalent(el.id), X = (dd.cast || {})[el.id] || {};
    return `<tr><td class="cl-pn"><input type="text" value="${esc(T.actor || '')}" placeholder="${ea(ph('Sin asignar'))}" data-bind="cs-tal" data-id="${ea(el.id)}" data-f="actor" ${dis} aria-label="Actor o actriz de ${esc(el.name)}"${!(T.actor || '').trim() && ed ? ' data-miss="1"' : ''}></td>
      <td class="cl-pj"><span class="cs-av tnum">${D.castNum[el.id] || '·'}</span><b>${esc(titleCase(el.name))}</b><small class="tnum" title="Escenas de la jornada">Esc. ${esc(sc.join(', '))}</small></td>
      <td class="cl-tt">${tmIn(X.call, call || '', `data-bind="cs-cast" data-id="${ea(el.id)}" data-f="call" aria-label="Llamado de ${esc(titleCase(el.name))}"`, dis)}</td>
      <td><input type="tel" value="${esc(T.phone || '')}" placeholder="${ea(ph('Teléfono'))}" data-bind="cs-tal" data-id="${ea(el.id)}" data-f="phone" ${dis} aria-label="Teléfono de ${esc(el.name)}"></td>
      <td><input type="email" value="${esc(T.email || '')}" placeholder="${ea(ph('Correo'))}" data-bind="cs-tal" data-id="${ea(el.id)}" data-f="email" ${dis} aria-label="Correo de ${esc(el.name)}"></td><td></td></tr>`;
  }).join('');
  const crewRows = full.map(([dept, name]) => { const dc = deptCall(dd, dept, call); return `<tr class="cl-sep"><td colspan="2"><span>${esc(name)}</span>${add(dept, name)}</td><td class="cl-tt" title="Citación del área">${tmIn((dd.dcall || {})[dept], call || '', `data-bind="cl-dcall" data-dept="${ea(dept)}" aria-label="Citación de ${esc(name)}"`, dis)}</td><td colspan="3"></td></tr>`
    + crew.filter(c => c.dept === dept && vis(c)).map(c => `<tr class="cl-cw"><td class="cl-pn"><input type="text" class="cs-name" value="${esc(c.name)}" placeholder="${ea(ph('Nombre'))}" data-bind="cs-crew" data-id="${ea(c.id)}" data-f="name" ${dis} aria-label="Nombre de ${esc(c.role)}"></td>
      <td class="cl-pr"><input type="text" class="cs-role" value="${esc(c.role)}" data-bind="cs-crew" data-id="${ea(c.id)}" data-f="role" ${dis} aria-label="Cargo"></td>
      <td class="cl-tt">${tmIn((dd.crew || {})[c.id], dc, `data-bind="cs-ccall" data-id="${ea(c.id)}" aria-label="Llamado de ${esc(c.role)}" title="Vacío: la citación del área"`, dis)}</td>
      <td><input type="tel" value="${esc(c.phone || '')}" placeholder="${ea(ph('Teléfono'))}" data-bind="cs-crew" data-id="${ea(c.id)}" data-f="phone" ${dis} aria-label="Teléfono"></td>
      <td><input type="email" value="${esc(c.email || '')}" placeholder="${ea(ph('Correo'))}" data-bind="cs-crew" data-id="${ea(c.id)}" data-f="email" ${dis} aria-label="Correo"></td><td class="cl-px">${xBtn('cs-crew-x', c.id, 'Quitar de esta jornada o del equipo')}</td></tr>`).join(''); }).join('');
  const peopleHTML = `<section class="cl-sec cl-crew cl-people"><header><h3>Personas</h3><span class="hint">${cast.length} ${cast.length === 1 ? 'personaje' : 'personajes'}${fig ? ` · figuración ${fig}` : ''} · ${crewN} del equipo</span><button type="button" class="linkbtn" data-act="cl-team">Directorio en Proyecto ›</button></header>
    <div class="cl-tw"><table class="cl-tbl cl-ptbl"><thead><tr><th>Nombre</th><th>Rol / Personaje</th><th>Llamado</th><th>Teléfono</th><th>Correo</th><th></th></tr></thead><tbody>
      ${cast.length ? `<tr class="cl-sep"><td colspan="6"><span>Reparto</span></td></tr>${castRows}` : ''}${crewRows}
      ${!cast.length && !crewRows ? '<tr><td colspan="6" class="hint">Sin reparto ni equipo en esta jornada.</td></tr>' : ''}</tbody></table></div>
    ${crewN ? '' : `<p class="hint cs-none">Nadie del equipo tiene nombre todavía. ${ed ? 'Agrégalo con «+» en cada área o carga el directorio completo en Proyecto: sirve para todas las jornadas.' : 'Se carga en Proyecto › Equipo.'}</p>`}
    ${empty.length && ed ? `<div class="cs-folds">${empty.map(([dept, name]) => `<div class="cs-fold"><span>${esc(name)}</span>${add(dept, name)}</div>`).join('')}</div>` : ''}
    ${absent.length ? `<div class="cs-out"><span>No vienen esta jornada:</span>${absent.map(c => `<button class="chip" data-act="cs-crew-back" data-id="${ea(c.id)}" ${dis} title="Vuelve a esta jornada">${esc(c.name || c.role)}${c.name ? ` <small>${esc(c.role)}</small>` : ''} <span aria-hidden="true">↺</span></button>`).join('')}</div>` : ''}</section>`;
  // 6. el pie: el centro de salud y los canales de radio
  const hIn = (f, phd, lab, miss) => `<input type="${f === 'phone' ? 'tel' : 'text'}" value="${esc((dd.hosp || {})[f] || '')}" placeholder="${esc(C.hospital[f] || phd)}" data-bind="cs-hosp" data-f="${f}" ${dis} aria-label="${ea(lab)}"${C.hospital[f] ? ' class="hd-auto"' : ''}${miss ? ' data-miss="1"' : ''}>`;
  const footHTML = `<footer class="cl-foot"><div class="cl-fh">${CL_ICO.hosp}<div><span class="cl-kl">Centro de salud</span>${hIn('name', ph('Falta', '-'), 'Centro de salud', !(hosp.name || '').trim() && ed)}${hIn('phone', ph('Teléfono', '-'), 'Teléfono del centro de salud')}${hIn('addr', ph('Dirección', '-'), 'Dirección del centro de salud')}</div></div>
    <div class="cl-fr">${CL_ICO.radio}<div><span class="cl-kl">Canales de radio</span><input type="text" value="${esc(C.radio || '')}" placeholder="${ea(ph('1 Producción, 2 Libre, 3 Transporte…'))}" data-bind="cl-radio" maxlength="300" ${dis} aria-label="Canales de radio (para todas las jornadas)" title="Se escriben una vez y salen en todas las hojas"></div></div></footer>`;
  // 7. lo que la referencia no tiene: por plano, horarios del reparto, punto de encuentro, movilidad y proveedores
  const shotTime = x => !ed ? `<small title="${ea(x.t0 + (x.t1 ? ' – ' + x.t1 : ''))}">${esc(x.t0)}</small>`
    : hdAuto(tmIn(x.fixed ? x.t0 : '', x.t0, `data-bind="cl-shat" data-id="${ea(x.sh.id)}" aria-label="${ea('Hora del plano ' + x.code)}" title="${ea('Escribe la hora del plano; si no cabe, su escena se alarga o se corre' + (x.fixed ? '. Borra la hora para repartir la escena parejo' : ''))}"`, dis), !x.fixed);
  const shotRows = S.rows.filter(r => !r.ev && r.shots.length).map(r => {
    const hc = hlc(r.it), col = hc || stripColor(r.s);
    return `<tr class="cl-sc${ea(lgDark(col))}" style="--rb:${ea(barOf(col))};--rc:${ea(col)}"><td class="cl-t tnum"><b>${esc(r.t0 || r.t || '')}</b></td><td colspan="6"><span class="cs-no">${esc(r.code)}</span><b class="sch">${esc(r.s.heading)}</b><span class="cl-pg tnum">${esc(r.pages)} págs.</span>${r.props ? `<span class="cl-props">Utilería y arte: ${esc(r.props)}</span>` : ''}</td></tr>`
      + r.shots.map(x => `<tr class="cl-sh"><td class="cl-t cl-pc tnum"><span class="cl-code">${esc(x.code)}</span>${shotT && x.t0 ? shotTime(x) : ''}</td><td class="cl-d${thumbs ? ' th' : ''}">${thumbs ? callThumb(x.sh) : ''}<b>${esc(x.size)}</b>${x.det.length ? `<span>${esc(x.det.join(' · '))}</span>` : ''}</td><td>${esc(x.act)}</td><td>${esc(r.set)}</td><td class="tnum">${esc(x.lens)}</td><td>${edSnd ? `<select class="cl-snd" data-bind="cl-snd" data-id="${ea(x.sh.id)}" aria-label="Sonido del plano ${esc(x.code)}">${SND_OPTS.map(([k, t]) => `<option value="${k}" ${(x.sh.snd || '') === k ? 'selected' : ''}>${t}</option>`).join('')}</select>` : esc(x.snd || '—')}</td><td class="tnum">${esc(x.cast.join(', ') || '—')}</td></tr>`).join('');
  }).join('');
  const shotsHTML = S.byShot ? `<section class="cl-card cl-sched cl-shots"><header><h3>Cronograma por plano</h3><span class="hint">del storyboard${shotT ? (ed ? ' · toca la hora de un plano para cambiarla' : ' · la hora de cada plano') : ''}</span><label class="cl-opt" title="Reparte la hora de cada escena entre sus planos. Apagado: solo la hora de cada escena"><input type="checkbox" data-bind="cl-shott" ${shotT ? 'checked' : ''} ${dis}> Hora por plano</label><label class="cl-opt" title="La viñeta del storyboard de cada plano"><input type="checkbox" data-bind="cl-thumbs" ${thumbs ? 'checked' : ''} ${dis}> Miniaturas</label></header>
    <div class="cl-tw"><table class="cl-tbl"><thead><tr><th>Hora · plano</th><th>Descripción</th><th>Acción</th><th>Set</th><th>Lente</th><th>Sonido</th><th>Personajes</th></tr></thead><tbody>${shotRows}</tbody></table></div></section>` : '';
  const anyTimes = cast.some(({ el }) => { const X = (dd.cast || {})[el.id] || {}; return ['pu', 'ves', 'mq', 'ready', 'obs'].some(f => X[f]); });
  const castTimes = cast.length && (ed || anyTimes) ? `<section class="cl-card cl-cast"><header><h3>Reparto · horarios</h3><span class="hint">recojo, vestuario, maquillaje y listos</span></header>
    <div class="cl-tw"><table class="cl-tbl cl-ctbl"><thead><tr><th>Personaje</th><th>Recojo</th><th title="Vestuario">Vest.</th><th title="Maquillaje y peinado">Maq.</th><th>Listos</th><th>Obs.</th></tr></thead><tbody>${cast.map(({ el }) => {
      const X = (dd.cast || {})[el.id] || {};
      const t = (f, phd, lab) => `<td class="cl-tt">${tmIn(X[f], phd, `data-bind="cs-cast" data-id="${ea(el.id)}" data-f="${f}" aria-label="${ea(lab)} de ${esc(titleCase(el.name))}"`, dis)}</td>`;
      return `<tr><td class="cl-pj"><span class="cs-av tnum">${D.castNum[el.id] || '·'}</span><b>${esc(titleCase(el.name))}</b></td>${t('pu', ph('—'), 'Recojo')}${t('ves', ph('—'), 'Vestuario')}${t('mq', ph('—'), 'Maquillaje y peinado')}${t('ready', ph('—'), 'Listos')}
        <td class="cl-ob"><input type="text" value="${esc(X.obs || '')}" placeholder="${ea(ph('—'))}" data-bind="cs-cast" data-id="${ea(el.id)}" data-f="obs" ${dis} aria-label="Observaciones de ${esc(titleCase(el.name))}"></td></tr>`;
    }).join('')}</tbody></table></div></section>` : '';
  // punto de encuentro y movilidad
  const people = callPeople(d, dd), mov = dd.mov || [];
  const used = new Set(mov.flatMap(x => [x.driver, ...x.pax]).filter(Boolean));
  const free = people.filter(p => !used.has(p.k));
  const prevMov = n > 0 ? (peekDay(days[n - 1].id).mov || []) : [];
  const phs = (m.ph || []).filter(p => frameHas(clPhKey(d.id, p.id)) || FRAMES[clPhKey(d.id, p.id)]);
  if (phs.length) candFramesNeed(phs.map(p => clPhKey(d.id, p.id)), 'call');
  const movHTML = mov.map((x, vi) => {
    const drv = drvName(x, people), pax = x.pax.map(k => callWho(people, k)).filter(Boolean);
    return `<div class="cl-veh"><div class="cl-veh-h"><span class="cl-vn tnum">${vi + 1}</span><input type="text" value="${esc(x.name || '')}" placeholder="${ea(ph('Vehículo (camioneta, auto, minivan…)'))}" data-bind="cl-veh" data-id="${ea(x.id)}" ${dis} aria-label="Vehículo ${vi + 1}">${xBtn('cl-veh-del', x.id, 'Quitar el vehículo')}</div>
      <div class="cl-veh-b"><label class="cl-drv"><span>Conductor</span><input type="text" list="clDrvL" data-bind="cl-drv" data-id="${ea(x.id)}" value="${esc(drv)}" placeholder="${ea(ph('Proveedor o nombre'))}" autocomplete="off" ${dis} aria-label="Conductor del vehículo ${vi + 1}: un proveedor o un nombre"></label>
      <div class="cl-pax">${pax.map(p => `<span class="cl-p">${esc(p.name)}<small>${esc(p.sub)}</small>${ed ? `<button class="x" data-act="cl-pax-x" data-id="${ea(x.id)}" data-k="${ea(p.k)}" aria-label="Quitar a ${esc(p.name)}" title="Quitar">${ICO.close}</button>` : ''}</span>`).join('')}${ed && free.length ? `<button class="cs-add" data-act="cl-pax-add" data-id="${ea(x.id)}" title="Agregar pasajeros" aria-label="Agregar pasajeros al vehículo ${vi + 1}" aria-haspopup="menu">+</button>` : ''}${!pax.length && !ed ? '<span class="hint">Sin pasajeros.</span>' : ''}</div>
      <span class="cl-cnt tnum">${(drv ? 1 : 0) + pax.length} ${(drv ? 1 : 0) + pax.length === 1 ? 'persona' : 'personas'}</span></div></div>`;
  }).join('');
  const moreHTML = `<div class="cl-more">${shotsHTML}${castTimes}
    <div class="cl-two cl-cols"><div class="cl-col">
      <section class="cl-card cl-meet">
        <header><h3>Punto de encuentro</h3>${mUrl ? `<a class="btn sm cl-maps" href="${ea(mUrl)}" target="_blank" rel="noopener noreferrer">${ICO.pin} Abrir en Google Maps</a>` : ''}</header>
        <div class="cl-mb">
          <input type="text" class="cl-addr" value="${esc(m.addr || '')}"${!(m.addr || '').trim() && !(locs[0] && locs[0][1]) && ed ? ' data-miss="1"' : ''} placeholder="${esc((locs[0] && locs[0][1]) || ph('Falta la dirección de citación', '—'))}" data-bind="cl-meet" data-f="addr" ${dis} aria-label="Dirección del punto de encuentro">
          <div class="cl-links">${(m.links || []).map((u, i) => safeUrl(u) ? `<span class="chip"><a href="${ea(safeUrl(u))}" target="_blank" rel="noopener noreferrer">${esc(linkName(safeUrl(u)))}</a>${ed ? `<button class="x" data-act="cl-link-x" data-i="${i}" aria-label="Quitar el enlace" title="Quitar el enlace">${ICO.close}</button>` : ''}</span>` : '').join('')}
            ${ed ? `<input type="url" class="cl-link-in" placeholder="+ Enlace (Google Maps, Waze…)" data-bind="cl-link" aria-label="Agregar un enlace">` : ''}</div>
          ${candPhotosHTML({ id: d.id, ph: m.ph || [] }, pid => clPhKey(d.id, pid), ed, 'cl', 'cl-up', 'Punto de encuentro')}
        </div>
      </section></div>
      <div class="cl-col"><section class="cl-card cl-mov">
        <header><h3>Movilidad</h3><span class="hint">${mov.length ? `${mov.length} ${mov.length === 1 ? 'vehículo' : 'vehículos'}${free.length ? ` · ${free.length} sin asignar` : ''}` : ''}</span>${ed ? '<button class="cs-add" data-act="cl-veh-add" title="Agregar un vehículo" aria-label="Agregar un vehículo">+</button>' : ''}</header>
        ${mov.length && ed ? `<datalist id="clDrvL">${C.vendors.filter(v => (v.name || '').trim()).map(v => `<option value="${ea(v.name.trim())}">${esc([v.gear, v.contact].filter(Boolean).join(' · '))}</option>`).join('')}</datalist>` : ''}
        ${movHTML || `<p class="hint cs-none">${ed ? 'Agrega los vehículos con «+»: el conductor (un proveedor o un nombre) y los pasajeros, del equipo y del reparto.' : 'Sin movilidad.'}${ed && prevMov.length ? ` <button class="linkbtn" data-act="cl-mov-copy">Copiar la de la jornada ${n}</button>` : ''}</p>`}
        ${mov.length && free.length && ed ? `<p class="hint cl-free">Sin vehículo: ${esc(free.map(p => p.name).join(', '))}</p>` : ''}
      </section>
      <section class="cl-card cl-vendc"><header><h3>Proveedores</h3>${ed ? '<button class="cs-add" data-act="cs-vend-add" title="Agregar un proveedor" aria-label="Agregar un proveedor">+</button>' : ''}</header>
        ${C.vendors.length ? `<div class="cs-list">${C.vendors.map(x => `<div class="cs-pr cs-ve"><div class="cs-nm"><input type="text" class="cs-name" value="${esc(x.name || '')}" placeholder="${ea(ph('Proveedor'))}" data-bind="cs-vend" data-id="${ea(x.id)}" data-f="name" ${dis} aria-label="Proveedor"><input type="text" class="cs-role" value="${esc(x.gear || '')}" placeholder="${ea(ph('Equipo o servicio'))}" data-bind="cs-vend" data-id="${ea(x.id)}" data-f="gear" ${dis} aria-label="Equipo"></div>
          <div class="cs-nm"><input type="text" value="${esc(x.contact || '')}" placeholder="${ea(ph('Contacto'))}" data-bind="cs-vend" data-id="${ea(x.id)}" data-f="contact" ${dis} aria-label="Contacto"><input type="tel" class="cs-role" value="${esc(x.phone || '')}" placeholder="${ea(ph('Teléfono'))}" data-bind="cs-vend" data-id="${ea(x.id)}" data-f="phone" ${dis} aria-label="Teléfono"></div>
          <div class="cs-call">${tmIn((dd.vend || {})[x.id], '', `data-bind="cs-vcall" data-id="${ea(x.id)}" aria-label="Llamado"`, dis)}</div>${xBtn('cs-vend-del', x.id)}</div>`).join('')}</div>` : `<p class="hint cs-none">${ed ? 'Agrega con «+» los proveedores de la jornada (cámara, luces, transporte…).' : 'Sin proveedores.'}</p>`}
      </section></div></div></div>`;
  v.innerHTML = `<div class="ws ws-1"><section class="center">
    <div class="bar">
      <select data-bind="cs-sel" style="max-width:320px;width:auto" aria-label="Jornada">${days.map((x, i) => `<option value="${i}" ${i === n ? 'selected' : ''}>Jornada ${i + 1}${dates[i] ? ' · ' + esc(fmtDate(dates[i])) : ''} · ${x.keys.length} esc.</option>`).join('')}</select>
      <span class="grow"></span>
      ${toolsHTML()}
    </div>
    ${legendHTML('call')}
    <div class="scroller pad" data-keep="call"><div class="cs cl">
      <article class="cl-doc">
      <section class="hd cl-hd" aria-label="Cabecera de la hoja de llamado">
        <div class="cl-acts"><span class="grow"></span>${status}</div>
        <div class="cl-top">${colL}${colC}${colR}</div>
      </section>
      <section class="cl-notes">${noteHTML}</section>
      <section class="cl-sec cl-list-s"><header><h3>Cronograma</h3><span class="hint">${ed ? 'toca una hora para cambiarla' : 'horas de la jornada'}</span><button class="linkbtn" data-act="cs-plan">Orden y tiempos en el plan de rodaje ›</button></header>${schedHTML}</section>
      ${advHTML}
      ${peopleHTML}
      ${footHTML}
      </article>
      ${moreHTML}
    </div></div></section></div>`;
  bindView();
  if (thumbs && typeof hydrateThumbs === 'function') hydrateThumbs();
};
/* el punto de encuentro de la jornada abierta (create: lo crea si no existe) */
const meetOf = create => { const id = curDayId(); if (!id) return null; const d = create ? dayData(id) : peekDay(id); if (!d.meet && create) d.meet = { addr: '', note: '', links: [], ph: [] }; return d.meet || null; };
const movOf = vid => { const id = curDayId(); if (!id) return null; const d = dayData(id); return (d.mov || []).find(x => x.id === vid) || null; };
function paxMenu(b, vid) {
  const id = curDayId(); if (!id) return;
  const { days } = callDays(), d = days[UI.callDay], dd = peekDay(id), people = callPeople(d, dd), mov = dd.mov || [];
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
Object.assign(ACT, {
  'cs-plan': () => setTab('plan'),
  'cl-exp': b => exportPDF('call', b, { all: false, share: true }),
  // el resumen para el chat: lo que se busca primero en el teléfono, con el enlace al mapa
  'cl-copy': async () => {
    const n = UI.callDay || 0, X = callSheetData(n), m = X.meet, loc = X.locs[0];
    const addr = (m.addr || '').trim() || (loc && loc[1]) || '', url = mapsUrl(m, X.locs);
    const L = [`${P.meta.title} · ${tr('Hoja de llamado')} · ${tr(`Jornada ${n + 1} de ${X.total}`)}`, X.date ? capFirst(X.date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })) : '',
      `${tr('Llamado general')}: ${X.call || '—'}`, loc ? `${tr('Locación')}: ${loc[0]}${addr ? ' · ' + addr : ''}` : '', url ? `${tr('Mapa')}: ${url}` : '',
      `${tr('Centro de salud')}: ${[X.hosp.name, X.hosp.addr, X.hosp.phone].filter(Boolean).join(' · ') || '—'}`, (X.dd.notes || '').trim(), advLine(X.adv)].filter(Boolean);
    try { await navigator.clipboard.writeText(L.join('\n')); toast('Resumen copiado: pégalo en el chat junto al PDF.', 3500); }
    catch (e) { toast('No se pudo copiar el resumen. Tu navegador no deja usar el portapapeles en esta vista.'); }
  },
  'cl-team': () => { setTab('project'); requestAnimationFrame(() => { const t = $('#view .pj-team'); if (t) { t.scrollIntoView({ block: 'start', behavior: 'smooth' }); const f = $('input, button', t); if (f) f.focus({ preventScroll: true }); } }); },
  // un dato que falta: se va a su campo (o a la pestaña donde se completa) y se marca un momento
  'cl-go': b => {
    const x = callMissing(UI.callDay || 0).find(y => y.k === b.dataset.k); if (!x) { render(); return; }
    if (x.tab) { setTab(x.tab); if (x.hint) toast(x.hint, 4500); return; }
    const el = $('#view ' + x.sel); if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const f = el.matches('input, textarea, select, button') ? el : $('.cs-add, input', el);
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 250);
    el.classList.add('cl-flash'); setTimeout(() => el.classList.remove('cl-flash'), 1600);
  },
  // sin enlace ni dirección: baja al campo de enlaces del punto de encuentro
  'cl-maplink': () => {
    const el = $('#view .cl-link-in'); if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => el.focus({ preventScroll: true }), 250);
    const box = el.closest('.cl-links') || el; box.classList.add('cl-flash'); setTimeout(() => box.classList.remove('cl-flash'), 1600);
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
    const id = curDayId(); if (!id || !UI.callDay) return;
    const { days } = callDays(), d = days[UI.callDay], prev = peekDay(days[UI.callDay - 1].id).mov || [];
    const here = new Set(callPeople(d, peekDay(id)).map(p => p.k));
    // el conductor (proveedor o nombre) se copia tal cual; si era alguien del equipo o del reparto, solo si viene hoy
    dayData(id).mov = prev.map(x => ({ id: uid('v'), name: x.name, driver: /^[ca]:/.test(x.driver || '') ? (here.has(x.driver) ? x.driver : '') : x.driver || '', pax: x.pax.filter(k => here.has(k)) }));
    changed('data'); render(); toastUndo(`Movilidad copiada de la jornada ${UI.callDay}.`);
  },
  'cl-link-x': b => { const m = meetOf(true); if (!m) return; m.links = m.links.filter((_, i) => i !== +b.dataset.i); changed('data'); render(); },
  'cl-view': b => { const m = ((CALL().days || {})[b.dataset.id] || {}).meet || {}, ks = (m.ph || []).map(p => clPhKey(b.dataset.id, p.id)); photoViewer(ks, 'Punto de encuentro', { at: ks.indexOf(clPhKey(b.dataset.id, b.dataset.p)) }); },
  'cl-phdel': b => { const m = meetOf(true); if (!m) return; candDelPhoto(m, pid => clPhKey(b.dataset.id, pid), b.dataset.p, 'call'); render(); toastUndo('Foto quitada.'); },
  'cs-crew-add': b => crewAdd(b, b.dataset.dept),
  // una fila «+» de la cabecera (la nota, el clima): se abren sus campos y se escribe en el primero
  'cs-open': b => { (UI.csOpen || (UI.csOpen = new Set())).add(b.dataset.k); render(); requestAnimationFrame(() => { const f = { notes: 'notes', wx: 'wx' }[b.dataset.k], i = f ? $(`[data-bind="cs-day"][data-f="${f}"]`) : $('[data-bind="cs-hosp"][data-f="name"]'); if (i) i.focus(); }); },
  // ‹ › de la cabecera: la jornada anterior o la siguiente (la misma en la hoja de script)
  'cl-day': b => { UI.callDay = +b.dataset.d; UI.supDay = UI.callDay; render(); },
  // el aviso «Faltan datos»: la lista, con dónde se completa cada uno; un toque lleva al campo
  'cl-miss': b => {
    const miss = callMissing(UI.callDay || 0); if (!miss.length) { render(); return; }
    const WHERE = { date: 'En el plan de rodaje', call: 'Arriba, al centro', meet: 'Punto de encuentro, después de la hoja', hosp: 'Al pie de la hoja', cast: 'Personas', crew: 'Personas' };
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
  'cs-vend-add': () => { const v = { id: uid('v'), name: '', gear: '', phone: '', contact: '' }; CALL().vendors.push(v); changed('data'); render(); requestAnimationFrame(() => { const i = $(`[data-bind="cs-vend"][data-id="${v.id}"][data-f="name"]`); if (i) i.focus(); }); },
  'cs-vend-del': b => { const C = CALL(), v = C.vendors.find(x => x.id === b.dataset.id); histNote('Quitar un proveedor'); C.vendors = C.vendors.filter(x => x.id !== b.dataset.id); changed('data'); render(); toastUndo(`${v && v.name ? v.name : 'Proveedor'} quitado.`); },
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
   ningún plano fijo, la escena vuelve a su largo del plan). Devuelve si cambió algo */
function callShotSet(d, shotId, v) {
  const dd = dayData(d.id), S = callSched(d);
  const r = S.rows.find(o => o.shots && o.shots.some(x => x.sh.id === shotId)); if (!r || r.sStart == null) return false;
  const shots = r.shots, i = shots.findIndex(x => x.sh.id === shotId), key = r.key;
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
    const T = planDayTimes(d, dd.at, dd.dur), items = d.rows.map(ix => P.schedule.items[ix]);
    let j0 = items.findIndex(it => itemKey(it) === key), prevEnd = newEnd;
    for (let j = j0 + 1; j < items.length; j++) {
      const it = items[j], k = itemKey(it), own = hmToMin((dd.at || {})[k] || it.t), x = T.get(d.rows[j]) || {};
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
const curDayId = () => { const { days } = callDays(); return days[UI.callDay] ? days[UI.callDay].id : null; };
const setOrDel = (o, k, v) => { if (v) o[k] = v; else delete o[k]; };
Object.assign(BIND, {
  'cs-sel': el => { UI.callDay = +el.value; UI.supDay = UI.callDay; render(); },   // la misma jornada en la hoja de script
  'cs-day': (el, ev) => {
    const id = curDayId(); if (!id) return;
    let v = el.tagName === 'TEXTAREA' ? el.value : el.value.trim();
    if (el.classList.contains('tm')) {
      if (ev !== 'change') return;
      v = el.value = normHM(v);
      const { days } = callDays(), def = callDefaults(days[UI.callDay]);
      if (def[el.dataset.f] && v === def[el.dataset.f]) v = '';   // igual al del plan: se sigue el plan
    }
    setOrDel(dayData(id), el.dataset.f, v); changed('data');
    if (ev === 'change' && el.classList.contains('tm')) render();
  },
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
    const { days } = callDays(), d = days[UI.callDay]; if (!d) return;
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
  'cl-end': (el, ev) => { if (ev !== 'change') return; const id = curDayId(); if (!id) return; const v = el.value = normHM(el.value); if (v && hmToMin(v) == null) return; setOrDel(dayData(id), 'end', v); changed('data'); render(); },
  'cl-thumbs': (el, ev) => { if (ev !== 'change') return; if (el.checked) delete CALL().noThumbs; else CALL().noThumbs = true; changed('data'); render(); },
  'cl-shott': (el, ev) => { if (ev !== 'change') return; if (el.checked) CALL().shotTimes = true; else delete CALL().shotTimes; changed('data'); render(); },
  'cl-snd': (el, ev) => { if (ev !== 'change') return; const sh = P.shots[el.dataset.id]; if (!sh) return; if (el.value) sh.snd = el.value; else delete sh.snd; changed('data'); },
  'cl-veh': el => { const v = movOf(el.dataset.id); if (!v) return; v.name = el.value; changed('data'); },
  // el conductor: si lo escrito es el nombre de un proveedor, queda unido a él; si no, el nombre tal cual
  'cl-drv': (el, ev) => {
    if (ev !== 'change') return; const v = movOf(el.dataset.id); if (!v) return;
    const t = el.value.trim(), vd = t && CALL().vendors.find(o => (o.name || '').trim().toLowerCase() === t.toLowerCase());
    const nv = vd ? 'v:' + vd.id : t ? 't:' + t : '';
    if (nv === v.driver || (t && t === drvName(v, callPeople(callDays().days[UI.callDay], peekDay(curDayId()))))) return;
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
  ['La hoja', 'Una página que se lee de un vistazo, en el orden de las hojas de llamado de la industria. Arriba, en tres columnas: la productora y su equipo clave con teléfono (jefatura de producción, dirección y 1.er asistente de dirección); el proyecto, la jornada, la fecha y el llamado general en grande; el clima, el punto de encuentro o estacionamiento y la locación con su mapa. Luego la nota del 1.er asistente con la utilería especial, el cronograma, el avance de la jornada siguiente y las personas. Al pie, el centro de salud y los canales de radio.'],
  ['De dónde sale', 'El cronograma, las locaciones y el reparto de cada jornada vienen del plan de rodaje y del desglose. Si cambias el plan, la hoja se actualiza sola. La utilería especial reúne la utilería, las armas y los efectos especiales del desglose de las escenas del día.'],
  ['Cronograma', 'A la izquierda, la hora de cada evento (carga, almuerzo…) o el número de cada escena con su hora debajo: toca una hora para cambiarla (vacía, sigue a la fila anterior con los tiempos del plan). Al centro, el encabezado, la sinopsis y el reparto con su número; a la derecha, las páginas en octavos. Los traslados salen como una banda celeste con su dirección y el mapa. Al final, el fin de jornada y el total de páginas.'],
  ['Hora de cada plano', 'En «Cronograma por plano» (debajo de la hoja), con «Hora por plano» encendido, toca la hora de un plano para cambiarla. Si no cabe en su escena, la escena se alarga o empieza antes y las filas siguientes se corren con ella, solo en esta hoja (el plan de rodaje no cambia). El orden de los planos se mantiene. Vacía, el plano vuelve a repartirse parejo.'],
  ['Avance de la jornada siguiente', 'Después del cronograma, la jornada siguiente (aunque caiga después de días libres): su fecha, el llamado, las locaciones, sus escenas, el total de páginas y quién del reparto trabaja. En la última jornada dice «Fin de rodaje».'],
  ['Personas', 'Una sola tabla: primero el reparto y luego el equipo por área (el nombre del área separa). Nombre, rol o personaje, llamado, teléfono y correo se escriben aquí o en Proyecto y sirven para todas las jornadas; el llamado es de esta jornada. Cada área tiene su citación (vacía: el llamado general).'],
  ['Canales de radio', 'Al pie de la hoja. Se escriben una vez (por ejemplo «1 Producción, 2 Libre, 3 Transporte») y salen en todas las jornadas.'],
  ['Después de la hoja', 'Lo que la referencia no tiene: el cronograma por plano con sus miniaturas, el sonido y la hora de cada plano; los horarios del reparto (recojo, vestuario, maquillaje, listos); el punto de encuentro con su dirección, enlaces y fotos; la movilidad y los proveedores. En el PDF va en la página siguiente.'],
  ['La leyenda', 'Arriba de la hoja: las tiras del plan (la franja de color de cada escena), la jornada, los eventos y la nota para el equipo. Los del plan se cambian en su leyenda; la nota, aquí. El PDF y el Excel salen con los mismos colores.'],
  ['Exportar', 'PDF o Excel de esta jornada o de todas. Las filas del equipo sin nombre no se imprimen. «Copiar resumen» deja la fecha, el llamado, la locación con su mapa, el centro de salud y el avance listos para pegar en el chat.'],
];
/* el menú Exportar avisa antes: lo que le falta a la jornada y con qué versión sale (exportar igual es posible) */
function callExpHints() {
  const { days } = callDays(), n = UI.callDay || 0;
  if (!days.length) return { one: 'Lista para enviar o imprimir', all: 'Una hoja por jornada' };
  const ST = callState(n), V = callVer(n), bad = days.map((_, i) => i).filter(i => callMissing(i).length).length;
  return {
    one: ST && ST.miss.length ? `${ST.miss.length === 1 ? 'Falta 1 dato' : `Faltan ${ST.miss.length} datos`}: sale «Por confirmar»` : V ? (V.same ? `Lista · v${V.v}, sin cambios` : `Lista para enviar · sale como v${V.v}`) : 'Lista para enviar o imprimir',
    all: bad ? `Una hoja por jornada · ${bad} de ${days.length} con datos por completar` : 'Una hoja por jornada',
  };
}
EXPORTS.call = () => { const H = callExpHints(); return [
  { label: 'Esta jornada (PDF)', hint: H.one, run: btn => exportPDF('call', btn, { all: false }), pdf: { kind: 'call', opts: { all: false } } },
  { label: 'Todas las jornadas (PDF)', hint: H.all, run: btn => exportPDF('call', btn, { all: true }), pdf: { kind: 'call', opts: { all: true } } },
  { label: 'Esta jornada (Excel)', hint: 'Para editarla en Excel', run: () => exportCallXLSX(false), pro: 'excel' },
  { label: 'Todas las jornadas (Excel)', hint: 'Una hoja de cálculo por jornada', run: () => exportCallXLSX(true), pro: 'excel' },
]; };
EXPORTS_NOTE.call = () => {
  const n = UI.callDay || 0, ST = callState(n); if (!ST || !ST.miss.length) return '';
  const a = ST.miss.map(x => `<span>${esc(x.txt)}</span>${x.name ? ` <span data-no-tr>${esc(x.name)}</span>` : ''}`), list = a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + (EN ? ' and ' : ' y ') + a[a.length - 1];
  return `<p class="xnote">${ICO.warn}<span><b>${a.length === 1 ? `Jornada ${n + 1} · falta 1 dato:` : `Jornada ${n + 1} · faltan ${a.length} datos:`}</b> ${list}. <span>Puedes exportarla igual: lo que falte dice «Por confirmar».</span></span></p>`;
};
/* datos de una jornada listos para imprimir (PDF y Excel) */
function callSheetData(n) {
  const { days, dates } = callDays(), d = days[n], C = CALL(), dd = peekDay(d.id), def = callDefaults(d), M = P.meta;
  const prods = (M.producers || []).filter(x => personName(x)), execs = prods.filter(x => /ejecutiv/i.test(x.role || ''));
  const call = dd.crewCall || def.crewCall;
  const hosp = { name: (dd.hosp || {}).name || C.hospital.name, addr: (dd.hosp || {}).addr || C.hospital.addr, phone: (dd.hosp || {}).phone || C.hospital.phone };
  const next = days[n + 1];
  const sched = callSched(d), people = callPeople(d, dd), who = k => { const x = callWho(people, k); return x ? x.name : ''; };
  const role = re => CALL().crew.filter(c => re.test(c.role || '') && (c.name || '').trim() && !(dd.out || {})[c.id]);
  return {
    sched, shotT: callShotTimes(), end: sched.end, motor: dd.motor || sched.motor.replace('~', ''),
    keys: [...role(/asistente de direcci/i).slice(0, 1), ...role(/jefatura de producci|jefe de producci/i).slice(0, 1)],
    heads: [['Dirección', (M.directors || []).map(personName).filter(Boolean).join(', ')], ['Producción', prods.filter(x => !execs.includes(x)).map(personName).join(', ')], ['Dir. de fotografía', role(/direcci[oó]n de fotograf/i).map(c => c.name).join(', ')], ['Dir. de arte', role(/direcci[oó]n de arte/i).map(c => c.name).join(', ')], ['Sonido', role(/sonidista|jefe de sonido/i).map(c => c.name).join(', ')], ['Prod. ejecutiva', execs.map(personName).join(', ')], ...(C.client ? [['Cliente', C.client]] : [])].filter(x => x[1]),
    eps: epsOfKeys(d.keys).map(e => epLabel(P, e)).join(' / '),   // series: los episodios de la jornada
    meet: dd.meet || {}, mov: (dd.mov || []).map(x => ({ name: x.name, driver: drvName(x, people), pax: x.pax.map(who).filter(Boolean) })),
    n, total: days.length, date: dates[n], d, call, lunch: dd.lunch || def.lunch || callLunch(sched), dd, hosp,
    prod: prods.filter(x => !execs.includes(x)).map(personName).join(', '), exec: execs.map(personName).join(', '), dir: (M.directors || []).map(personName).filter(Boolean).join(', '),
    rows: callRows(d), locs: callLocs(d), cast: callCast(d), fig: d.rows.reduce((a, i) => a + num(P.schedule.items[i].fig), 0),
    crew: [...CS_DEPTS, ...(typeof TEAM_EXTRA !== 'undefined' ? TEAM_EXTRA : [])].map(([k, name]) => [name, C.crew.filter(c => c.dept === k && (c.name || '').trim() && !(dd.out || {})[c.id]).map(c => ({ ...c, call: (dd.crew || {})[c.id] || deptCall(dd, k, call) })), deptCall(dd, k, call)]).filter(x => x[1].length),
    vend: C.vendors.filter(v => v.name).map(v => ({ ...v, call: (dd.vend || {})[v.id] || '' })),
    next: next ? { n: n + 2, date: dates[n + 1], call: peekDay(next.id).crewCall || callDefaults(next).crewCall, locs: callLocs(next).map(x => x[0]).join(', '), sc: next.keys.join(', ') } : null,
    // (lote U) la hoja como la referencia: el equipo clave, la utilería especial, el avance y los canales de radio
    keyCrew: callKeyCrew(dd), props: callProps(d), adv: callAdvance(n), radio: C.radio || '',
  };
}
function exportCallXLSX(all) {
  if (!proGate('excel')) return;
  const { days } = callDays();
  if (!days.length) { toast('Primero arma el stripboard.'); return; }
  const list = all ? days.map((_, i) => i) : [UI.callDay || 0];
  const cd = callDays(), rec = !(typeof OFFER_CAPTURE !== 'undefined' && OFFER_CAPTURE), vers = Object.fromEntries(list.map(i => [i, callVer(i, cd, rec)]));
  const sheets = list.map(i => callSheetXLSX({ ...callSheetData(i), ver: vers[i] }));
  const bytes = xlsxBook(sheets, { title: P.meta.title + ' · Hoja de llamado' });
  offerFile(fileSafe(P.meta.title) + (all ? '_hojas_de_llamado.xlsx' : `_hoja_de_llamado_J${list[0] + 1}.xlsx`), new Blob([bytes], { type: XLSX_MIME }))
    .then(ok => { if (ok === true) callExported(list, vers); });   // («captured»: va dentro del ZIP del proyecto, no se envió)
}
function callSheetXLSX(X) {
  const NC = 8, rows = [], C = CALL();
  const row = (cells, h) => rows.push(h == null ? { cells } : { cells, h });
  // como en la app y en el PDF: secciones en el color de la barra, tiras de día y de noche, la nota en amarillo suave
  const T = xlTab(), L = T.line;
  const band = (v, fill = T.bar, color = T.ink) => row([{ v, cs: NC, s: { bold: true, font: 'title', fill, color, h: fill === T.black ? 'center' : 'left', size: 12, line: L } }], 22);
  const H = { bold: true, fill: T.fill, color: '#222222', line: L }, Y = { fill: lgMix(T.note, '#FFFFFF', .4), line: L }, G = { fill: T.ev, line: L };
  const SIDE = { fill: T.fill, line: '#FFFFFF' }, MID = { fill: T.fill2, line: '#FFFFFF' };
  const span = (r, a, b) => [r.t0 || r.t || '', r.t1 || r.end || ''].filter(Boolean).join(' - ');
  // cabecera: teléfonos clave, título y jefes de equipo
  row([{ v: P.meta.title, cs: 4, s: { bold: true, size: 16, font: 'title', fill: T.bar, color: T.ink, line: T.bar } }, { v: [...X.heads, ...(X.eps ? [['Episodios', X.eps]] : [])].map(([k, v]) => `${k}: ${v}`).join('\n'), cs: 4, s: { size: 9, fill: T.bar, color: T.ink, line: T.bar } }], 30);
  row([{ v: '', cs: NC, s: { fill: T.c, border: false } }], 4);
  if (X.ver) row([{ v: trDone(tr('Hoja de llamado') + ' · ' + tr(`Jornada ${X.n + 1} de ${X.total}`) + ' · ' + callVerTxt(X.ver)), cs: NC, s: { size: 9, color: '#555555' } }]);
  if (X.keys.length) row([{ v: X.keys.map(c => `${c.role}: ${c.name}${c.phone ? ' ' + c.phone : ''}`).join('   ·   '), cs: NC, s: { size: 9 } }]);
  // franja: clima · fecha y llamado general · datos de la jornada
  const wx = [X.dd.wx && 'Previsión: ' + X.dd.wx, (X.dd.hi || X.dd.lo) && `Temperatura: ${[X.dd.hi, X.dd.lo].filter(Boolean).join(' / ')} °C`, X.dd.hum && `Humedad: ${X.dd.hum} %`, X.dd.sunrise && 'Amanecer: ' + X.dd.sunrise, X.dd.sunset && 'Anochece: ' + X.dd.sunset].filter(Boolean).join('\n');
  const info = [`Jornada ${X.n + 1} de ${X.total}`, `Horario: ${X.call || '—'} a ${X.end || '—'}`, `Listos motor: ${X.motor || '—'}`, X.lunch && 'Almuerzo: ' + X.lunch, X.dd.craft && 'Catering: ' + X.dd.craft, 'Centro de salud: ' + ([X.hosp.name, X.hosp.addr, X.hosp.phone].filter(Boolean).join(' · ') || '—'), X.radio && 'Canales de radio: ' + X.radio].filter(Boolean).join('\n');
  row([{ v: wx || 'Clima: —', cs: 3, s: SIDE }, { v: `${X.date ? capFirst(X.date.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) : 'Sin fecha'}\nLLAMADO GENERAL\n${X.call || '—'}`, cs: 2, s: { ...MID, bold: true, font: 'title', size: 13, h: 'center' } }, { v: info, cs: 3, s: SIDE }], 78);
  row([{ v: 'Locación: ' + (X.locs.map(([n, a]) => n + (a ? ' (' + a + ')' : '')).join(' · ') || '—'), cs: NC, s: { bold: true } }]);
  if (X.dd.notes) { row([{ v: 'Nota para el equipo', cs: NC, s: { ...Y, bold: true, h: 'center' } }]); row([{ v: X.dd.notes, cs: NC, s: { ...Y, h: 'center' } }]); }
  if (X.props.length) row([{ v: 'Utilería especial: ' + X.props.join(', '), cs: NC, s: { h: 'center' } }]);   // (lote U)
  const COLS = [14, 8, 34, 34, 16, 9, 9, 14];
  const lu = pdfPlanUsed(X.sched.rows.map(r => r.it)); lu.note = !!(X.dd.notes || '').trim();
  const lg = xlLegend(lgDocItems('call', lu).map(([nm, c]) => nm === LG.call.note[0] ? [nm, Y.fill] : [nm, c]), COLS);
  if (lg.length) { row([], 6); rows.push(...lg); row([], 4); }
  band('CRONOGRAMA');
  row(['Hora', 'Plano', 'Descripción', 'Acción', 'Set', 'Lente', 'Sonido', 'Personajes'].map(v => ({ v, s: H })));
  for (const r of X.sched.rows) {
    if (r.ev) { const ge = { fill: hlc(r.it) || T.ev, line: L, color: lgInk(hlc(r.it) || T.ev) === '#FFFFFF' ? '#FFFFFF' : '#222222' }; row([{ v: span(r), s: { ...ge, bold: true } }, { v: r.name + (r.det ? ' · ' + r.det : ''), cs: NC - 1, s: { ...ge, bold: true, h: 'center' } }]); continue; }
    const fc = hlc(r.it) || stripColor(r.s), f = { fill: fc, line: L, ...(lgDark(fc) ? { color: '#F4F4F4' } : {}) };   // (lote U) la tira estándar, como en el plan
    row([{ v: span(r), s: { ...f, bold: true } }, { v: r.code, s: { ...f, bold: true, h: 'center' } }, { v: `${r.s.heading} · ${r.pages} págs.${r.props ? '\nUtilería y arte: ' + r.props : ''}`, cs: NC - 2, s: { ...f, bold: true } }]);
    if (!r.shots.length) row([{ v: '' }, { v: r.it.sp ? 'Parte ' + r.it.sp : '' }, { v: 'Escena completa' }, { v: synopsisOf(r.s) || '' }, { v: r.set }, { v: '' }, { v: '' }, { v: r.cast + (r.fig ? ` · fig. ${r.fig}` : '') }]);
    for (const x of r.shots) row([{ v: X.shotT ? span(x) : '', s: { h: 'center' } }, { v: x.code, s: { bold: true, h: 'center' } }, { v: `${x.size}${x.size && x.det.length ? ' · ' : ''}${x.det.join(' · ')}` }, { v: x.act }, { v: r.set }, { v: x.lens, s: { h: 'center' } }, { v: x.snd || '—', s: { h: 'center' } }, { v: x.cast.join(', ') || '—', s: { h: 'center' } }]);
  }
  for (const r of X.sched.close) row([{ v: span(r), s: { bold: true } }, { v: r.name + (r.det ? ' · ' + r.det : ''), cs: NC - 1, s: { bold: true } }]);
  band('FIN DE JORNADA: ' + (X.end || '—'), T.black, lgInk(T.black));
  band('REPARTO');
  row(['Personaje', 'Actor / actriz', 'Teléfono', 'Recojo', 'Llamado', 'Vest. / Maq.', 'Listos', 'Obs.'].map(v => ({ v, s: H })));
  for (const { el, sc } of X.cast) { const T = callTalent(el.id), Z = (X.dd.cast || {})[el.id] || {}; row([{ v: `${D.castNum[el.id] || ''}. ${titleCase(el.name)} (esc. ${sc.join(', ')})`, s: { bold: true } }, { v: T.actor || '' }, { v: T.phone || '' }, { v: Z.pu || '', s: { h: 'center' } }, { v: Z.call || X.call || '', s: { h: 'center', bold: true } }, { v: [Z.ves, Z.mq].map(x => x || '—').join(' / '), s: { h: 'center' } }, { v: Z.ready || '', s: { h: 'center' } }, { v: Z.obs || '' }]); }
  if (X.fig) row([{ v: `Figuración: ${X.fig}`, cs: NC, s: { bold: true } }]);
  band('CITACIÓN DEL EQUIPO');
  for (const [name, list, dc] of X.crew) {
    row([{ v: name.toUpperCase(), cs: 7, s: { ...H, fill: T.fill2 } }, { v: dc || '', s: { ...H, fill: T.fill2, h: 'center' } }]);
    for (const c of list) row([{ v: c.role, cs: 3, s: { ...G, bold: true } }, { v: c.name, cs: 2 }, { v: c.phone, cs: 2 }, { v: c.call, s: { h: 'center', bold: true } }]);
  }
  if (X.vend.length) {
    band('PROVEEDORES');
    row([{ v: 'Proveedor', cs: 2, s: H }, { v: 'Equipo o servicio', cs: 2, s: H }, { v: 'Teléfono', s: H }, { v: 'Contacto', cs: 2, s: H }, { v: 'Llamado', s: H }]);
    for (const x of X.vend) row([{ v: x.name, cs: 2, s: { bold: true } }, { v: x.gear, cs: 2 }, { v: x.phone }, { v: x.contact, cs: 2 }, { v: x.call, s: { h: 'center' } }]);
  }
  const m = X.meet;
  if (m.addr || m.note || (m.links || []).length || X.mov.length) {
    band('PUNTO DE ENCUENTRO Y MOVILIDAD');
    row([{ v: 'Dirección de citación: ' + ([m.addr, m.note].filter(Boolean).join(' · ') || '—'), cs: NC, s: { bold: true } }]);
    for (const u of (m.links || []).map(safeUrl).filter(Boolean)) row([{ v: u, cs: NC }]);
    if (X.mov.length) { row([{ v: 'Vehículo', cs: 2, s: H }, { v: 'Conductor', cs: 2, s: H }, { v: 'Pasajeros', cs: 4, s: H }]); X.mov.forEach((x, i) => row([{ v: `${i + 1}. ${x.name || 'Vehículo'}`, cs: 2, s: { bold: true } }, { v: x.driver || '—', cs: 2 }, { v: x.pax.join(', ') || '—', cs: 4 }])); }
  }
  // (lote U) el avance de la jornada siguiente (o «Fin de rodaje»), en una línea
  row([{ v: trDone(advLine(X.adv)), cs: NC, s: { italic: true, border: false } }]);
  return { name: `Jornada ${X.n + 1}`, cols: COLS, rows, landscape: false };
}
