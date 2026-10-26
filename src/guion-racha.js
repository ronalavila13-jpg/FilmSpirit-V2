/* ============================================================
   GUION · contadores de escritura y rachas (pestaña Guion, al escribir)
   Por persona y por día:
   · palabras netas: las que suma lo que escribes menos las que borras (lo pegado no cuenta; lo que llega del equipo
     tampoco: solo los cambios hechos en el editor de esta persona, guion-editor.js · edWk);
   · tiempo escribiendo: los ratos tecleando (las pausas de menos de 15 s cuentan como escritura);
   · tiempo pensando: el guion abierto, la ventana a la vista y con el foco, pausas de 15 s a 10 min. Más de 10 min sin
     hacer nada es estar fuera y no cuenta.
   Meta del día: 100 palabras netas o 15 minutos escribiendo (lo que llegue primero); cada persona la cambia.
   Racha: días seguidos que cumplen la meta. Un día de descanso por semana (de lunes a domingo) no la corta.
   La racha es de la persona: suma con cualquiera de sus guiones (y se ve lo de cada guion). En la web con cuenta se
   guarda en la cuenta (/api/me/writing: el navegador manda lo que sumó y el servidor lo suma, así dos pestañas o dos
   equipos no se pisan); sin cuenta, en el escritorio o en la versión sin servidor, en este equipo. En coescritura cada
   quien ve solo lo suyo. Es del plan gratuito «Guion» (sin proGate).
   En la barra del guion, la llama de FilmSpirit (la de Tito, #DF3C13) con el número: encendida (hoy ya cumpliste), baja
   (aún no: la racha está en riesgo) o apagada (se cortó). Tocarla abre el panel «Escritura». A los 3, 7, 14, 30, 50 y
   100 días, un aviso breve con Tito celebrando (una vez cada logro).
   Datos: { goal: { w, m }, days: { 'AAAA-MM-DD': { w, ws, ts, s: { proyecto: [w, ws, ts] } } }, names: { proyecto: título },
            best, got: { 3: 'AAAA-MM-DD', … } }   (ws, ts en segundos)
   ============================================================ */
const WK_GOAL = { w: 100, m: 15 };
const WK_MILES = [3, 7, 14, 30, 50, 100];
const WK_PAUSE = 15e3, WK_AWAY = 600e3;
const WK_DAYS = 800, WK_DETAIL = 70;
const WK = { rec: null, key: '', q: [], dw: 0, skipT: 0, last: 0, lastK: '', accW: 0, accT: 0, saveT: 0, flushT: 0, sending: null, goalDirty: false, moveT: 0 };
const wkApi = () => typeof API === 'function' && API() && typeof APITEAM !== 'undefined' && !!APITEAM.me && !!APITEAM.me.id;
const wkWhere = () => wkApi() ? 'en tu cuenta' : typeof TARGET !== 'undefined' && TARGET === 'desktop' ? 'en esta computadora' : 'en este navegador';
/* palabras de un texto (las mismas que cuenta el resumen del guion) */
const wkWords = x => (String(x || '').match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || []).length;
const wkISO = t => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
const wkToday = () => wkISO(new Date());
const wkShift = (d, n) => { const t = new Date(d + 'T12:00:00'); t.setDate(t.getDate() + n); return wkISO(t); };
// el lunes de la semana de ese día (la semana va de lunes a domingo: un día de descanso por semana)
const wkWeek = d => { const t = new Date(d + 'T12:00:00'); t.setDate(t.getDate() - (t.getDay() + 6) % 7); return wkISO(t); };
const wkDayOk = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d + 'T12:00:00'));
const wkInt = (v, lo, hi) => { const n = Math.round(+v); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0; };

/* ---------- datos ---------- */
/* lo guardado (en este equipo o lo que vino del servidor), limpio: lo mismo que acepta el servidor (server/lib/escritura.js) */
function wkClean(o) {
  const R = { goal: { ...WK_GOAL }, days: {}, names: {}, best: 0, got: {} };
  if (!o || typeof o !== 'object') return R;
  if (o.goal && typeof o.goal === 'object') R.goal = { w: wkInt(o.goal.w, 1, 5000) || WK_GOAL.w, m: wkInt(o.goal.m, 1, 600) || WK_GOAL.m };
  if (o.days && typeof o.days === 'object') for (const [d, r] of Object.entries(o.days)) {
    if (!wkDayOk(d) || !r || typeof r !== 'object') continue;
    const x = { w: wkInt(r.w, -1e6, 1e6), ws: wkInt(r.ws, 0, 86400), ts: wkInt(r.ts, 0, 86400) };
    if (r.s && typeof r.s === 'object') for (const [pid, v] of Object.entries(r.s).slice(0, 40)) if (/^[\w-]{1,40}$/.test(pid) && Array.isArray(v)) (x.s = x.s || {})[pid] = [wkInt(v[0], -1e6, 1e6), wkInt(v[1], 0, 86400), wkInt(v[2], 0, 86400)];
    R.days[d] = x;
  }
  if (o.names && typeof o.names === 'object') for (const [pid, t] of Object.entries(o.names).slice(0, 80)) if (/^[\w-]{1,40}$/.test(pid)) R.names[pid] = String(t || '').replace(/[\u0000-\u001f]/g, '').slice(0, 80);
  R.best = wkInt(o.best, 0, 1e5);
  if (o.got && typeof o.got === 'object') for (const k of WK_MILES) if (wkDayOk(o.got[k])) R.got[k] = o.got[k];
  return R;
}
/* suma un tramo { d, pid, t, w, ws, ts } (igual que el servidor) */
function wkApply(R, a) {
  const r = R.days[a.d] = R.days[a.d] || { w: 0, ws: 0, ts: 0 };
  r.w = wkInt(r.w + (a.w || 0), -1e6, 1e6); r.ws = wkInt(r.ws + (a.ws || 0), 0, 86400); r.ts = wkInt(r.ts + (a.ts || 0), 0, 86400);
  if (a.pid) {
    r.s = r.s || {};
    if (r.s[a.pid] || Object.keys(r.s).length < 40) { const q = r.s[a.pid] || [0, 0, 0]; r.s[a.pid] = [wkInt(q[0] + (a.w || 0), -1e6, 1e6), wkInt(q[1] + (a.ws || 0), 0, 86400), wkInt(q[2] + (a.ts || 0), 0, 86400)]; }
    if (a.t) R.names[a.pid] = a.t;
  }
}
/* los días muy viejos se van; el detalle por guion se guarda unas 10 semanas */
function wkPrune(R) {
  const ds = Object.keys(R.days).sort();
  for (const d of ds.slice(0, Math.max(0, ds.length - WK_DAYS))) delete R.days[d];
  const lim = wkShift(wkToday(), -WK_DETAIL);
  for (const [d, r] of Object.entries(R.days)) if (d < lim) delete r.s;
}
const wkKey = () => wkApi() ? 'escritura:' + APITEAM.me.id : 'escritura';
function wkRec() {
  const k = wkKey();
  if (!WK.rec || WK.key !== k) {
    WK.key = k; WK.rec = wkClean(ls.get(k, null));
    WK.q = wkApi() ? (Array.isArray(ls.get(k + ':q', [])) ? ls.get(k + ':q', []) : []) : [];
    if (wkApi()) wkPull();
  }
  return WK.rec;
}
const wkSave = () => { clearTimeout(WK.saveT); WK.saveT = setTimeout(() => { if (WK.rec) { wkPrune(WK.rec); ls.set(WK.key, WK.rec); } }, 1200); };
/* lo que hizo la persona en este guion, hoy: se suma y (con cuenta) se manda al servidor un poco después */
function wkAdd(w, ws, ts) {
  if (!P || (!w && !ws && !ts)) return;
  const R = wkRec(), a = { d: wkToday(), pid: String(P.id || 'guion').replace(/[^\w-]/g, '').slice(0, 40) || 'guion', t: String(P.meta.title || '').slice(0, 80), w: w || 0, ws: ws || 0, ts: ts || 0 };
  wkApply(R, a);
  if (wkApi()) {
    const q = WK.q.find(x => x.d === a.d && x.pid === a.pid);
    if (q) { q.w += a.w; q.ws += a.ws; q.ts += a.ts; q.t = a.t; } else WK.q.push({ ...a });
    ls.set(WK.key + ':q', WK.q);
    clearTimeout(WK.flushT); WK.flushT = setTimeout(wkFlush, 20000);
  }
  wkSave();
  wkMiles();
  wkPaintChip();
}
async function wkPull() {
  try {
    const r = await apiFetch('GET', '/api/me/writing');
    if (!r.json || !r.json.writing) return;
    const S = wkClean(r.json.writing);
    for (const a of WK.q) wkApply(S, a);   // lo que aún no llegó al servidor
    WK.rec = S; ls.set(WK.key, S); wkPaintChip(); wkPanelPaint();
    if (WK.q.length) wkFlush();
  } catch (e) { }
}
/* manda al servidor lo sumado; si no hay conexión, queda en la cola (en este navegador) y se manda después */
async function wkFlush(beacon) {
  if (!wkApi() || WK.sending || (!WK.q.length && !WK.goalDirty)) return;
  clearTimeout(WK.flushT);
  const R = wkRec(), batch = WK.q.splice(0), qk = WK.key + ':q', body = { add: batch, best: R.best, got: R.got };
  if (WK.goalDirty) body.goal = R.goal;
  WK.goalDirty = false; ls.set(qk, WK.q);
  if (beacon) {   // la página se cierra: no hay tiempo de esperar la respuesta
    try { fetch('/api/me/writing', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'X-FS': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch (e) { }
    return;
  }
  WK.sending = (async () => {
    try {
      const r = await apiFetch('POST', '/api/me/writing', body);
      if (r.json && r.json.writing && WK.key === qk.slice(0, -2)) {
        const S = wkClean(r.json.writing);
        for (const a of WK.q) wkApply(S, a);
        WK.rec = S; ls.set(WK.key, S); wkPaintChip(); wkPanelPaint();
      }
    } catch (e) {
      WK.q = [...batch, ...WK.q]; ls.set(qk, WK.q);
      if (body.goal) WK.goalDirty = true;
      clearTimeout(WK.flushT); WK.flushT = setTimeout(wkFlush, 60000);
    } finally { WK.sending = null; }
  })();
  return WK.sending;
}

/* ---------- palabras: las suma o resta cada cambio del editor (guion-editor.js) ---------- */
function wkDelta(n) { WK.dw += n; }
function wkSkipNext() { WK.skipT = Date.now(); }   // lo pegado (y cambiar el formato del guion) no cuenta
function wkCommit() {
  const n = WK.dw; WK.dw = 0;
  if (WK.skipT && Date.now() - WK.skipT < 1500) { WK.skipT = 0; return; }
  WK.skipT = 0;
  if (n) wkAdd(n, 0, 0);
}

/* ---------- tiempo: escribiendo y pensando ---------- */
const wkActive = () => !!P && UI.tab === 'script' && !!UI.scriptEdit && !!$('#ed') && document.visibilityState === 'visible' && document.hasFocus() && typeof edEditable === 'function' && edEditable();
/* el tiempo se junta en milisegundos y pasa a los datos en segundos enteros */
function wkTime(ms, writing) {
  if (writing) WK.accW += ms; else WK.accT += ms;
  const sw = Math.floor(WK.accW / 1000), st = Math.floor(WK.accT / 1000);
  if (sw || st) { WK.accW -= sw * 1000; WK.accT -= st * 1000; wkAdd(0, sw, st); }
}
/* cada actividad en el editor: 'w' escribir (cambia el texto), 'a' lo demás (mover el cursor, leer, desplazarse) */
function wkTick(kind) {
  if (!wkActive()) { wkStop(); return; }
  const now = Date.now();
  if (WK.last) {
    const g = now - WK.last;
    if (g < WK_PAUSE) wkTime(g, kind === 'w' && WK.lastK === 'w');   // pausa corta: sigue escribiendo (o mirando)
    else if (g <= WK_AWAY) wkTime(g, false);   // pausa de 15 s a 10 min: pensando
    // más de 10 min sin actividad: estuvo fuera y no cuenta
  }
  WK.last = now; WK.lastK = kind;
}
/* se fue (otra pestaña, otra ventana, cerró el guion): lo de desde la última actividad cuenta si fue poco */
function wkStop() {
  if (!WK.last) return;
  const g = Date.now() - WK.last;
  if (g < WK_PAUSE) wkTime(g, WK.lastK === 'w'); else if (g <= WK_AWAY) wkTime(g, false);
  WK.last = 0; WK.lastK = '';
}
document.addEventListener('input', e => { if (e.target && e.target.closest && e.target.closest('#ed')) wkTick('w'); }, true);
// moverse por el texto con el teclado es actividad (las teclas que escriben ya cuentan por su «input»)
document.addEventListener('keydown', e => { if (/^(Arrow|Page|Home$|End$)/.test(e.key) && e.target && e.target.closest && e.target.closest('#ed')) wkTick('a'); }, true);
document.addEventListener('pointerdown', e => { if (e.target && e.target.closest && e.target.closest('#edHost')) wkTick('a'); }, true);
document.addEventListener('scroll', e => { if (e.target && e.target.id === 'edScroll') { const t = Date.now(); if (t - WK.moveT > 4000) { WK.moveT = t; wkTick('a'); } } }, true);
document.addEventListener('mousemove', e => { const t = Date.now(); if (t - WK.moveT > 5000 && e.target && e.target.closest && e.target.closest('#edHost')) { WK.moveT = t; wkTick('a'); } }, { passive: true });
document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') { wkStop(); wkFlush(); } });
addEventListener('blur', () => wkStop());
addEventListener('pagehide', () => { wkStop(); if (WK.rec) ls.set(WK.key, WK.rec); wkFlush(true); });
// cada 5 s: si ya no está en el editor, se cierra el rato; más de 10 min sin actividad, se da por fuera
setInterval(() => {
  if (!WK.last) return;
  if (!wkActive()) wkStop();
  else if (Date.now() - WK.last > WK_AWAY) { WK.last = 0; WK.lastK = ''; }
}, 5000);

/* ---------- racha ---------- */
const wkMet = (R, d) => { const r = R.days[d]; return !!r && (r.w >= R.goal.w || r.ws >= R.goal.m * 60); };
/* días seguidos que cumplen la meta, de hoy hacia atrás. Hoy, si aún no cumple, no corta (el día no terminó).
   Un día sin cumplir por semana es de descanso: no suma, pero no corta */
function wkStreak(R, today = wkToday()) {
  const now = wkMet(R, today);
  let n = now ? 1 : 0, start = now ? today : null, d = wkShift(today, -1);
  const used = new Set(), rest = [];
  const first = Object.keys(R.days).sort()[0];
  for (let k = 0; k < 4000 && first && d >= first; k++, d = wkShift(d, -1)) {
    if (wkMet(R, d)) { n++; start = d; continue; }
    const w = wkWeek(d);
    if (used.has(w)) break;
    used.add(w); rest.push(d);
  }
  return { n, start, today: now, rest: rest.filter(x => start && x > start), state: now ? 'on' : n ? 'low' : 'off' };
}
/* mejor racha y logros (solo crecen); un logro nuevo se celebra */
function wkMiles() {
  const R = WK.rec; if (!R) return;
  const s = wkStreak(R), today = wkToday();
  let fresh = 0;
  if (s.n > R.best) R.best = s.n;
  for (const m of WK_MILES) if (s.n >= m && !R.got[m]) { R.got[m] = today; fresh = m; }
  if (fresh) { wkSave(); if (wkApi()) { clearTimeout(WK.flushT); WK.flushT = setTimeout(wkFlush, 1500); } wkCelebrate(fresh); }
}

/* ---------- la llama ---------- */
// encendida (on), baja (low: aún no hoy) o apagada (off). Trazo simple, en línea, con el naranja de la marca
function wkFlame(st, cls = '') {
  const outer = 'M12 2.4c.7 3 2.5 4.4 4.1 6.1 1.7 1.8 3 3.9 3 6.7 0 4.1-3.2 6.9-7.1 6.9s-7.1-2.8-7.1-6.9c0-2.7 1.2-4.5 2.7-6 .3 1.5 1 2.6 2.2 3.2-.5-3.7.5-7 2.2-10z';
  const inner = 'M12.1 12.3c.9 1.4 2.7 2.6 2.7 4.8 0 1.9-1.2 3.3-2.7 3.3s-2.7-1.4-2.7-3.3c0-1.2.5-2.1 1.2-2.8.1.8.5 1.4 1.1 1.6-.3-1.3-.1-2.5.4-3.6z';
  if (st === 'off') return `<svg class="wk-fl off ${ea(cls)}" viewBox="0 0 24 24" aria-hidden="true"><path class="wk-fo" d="${outer}"/><path class="wk-sm" d="M14.6 3.6c-1-.9-.2-1.8-1-2.6"/></svg>`;
  if (st === 'low') return `<svg class="wk-fl low ${ea(cls)}" viewBox="0 0 24 24" aria-hidden="true"><path class="wk-fo" d="${outer}"/><path class="wk-fi" d="${inner}"/></svg>`;
  return `<svg class="wk-fl on ${ea(cls)}" viewBox="0 0 24 24" aria-hidden="true"><path class="wk-fo" d="${outer}"/><path class="wk-fi" d="${inner}"/></svg>`;
}
/* Tito celebrando: la llama con cara, los brazos arriba y papel picado */
const WK_TITO = `<svg class="wk-tito" viewBox="0 0 64 64" aria-hidden="true">
  <g class="wk-conf"><rect x="6" y="12" width="4" height="4" rx="1" fill="#F5C400" transform="rotate(20 8 14)"/><rect x="53" y="9" width="4" height="4" rx="1" fill="#2FA8E0" transform="rotate(-15 55 11)"/><rect x="50" y="30" width="3.5" height="3.5" rx="1" fill="#3DB86A" transform="rotate(35 52 32)"/><rect x="9" y="33" width="3.5" height="3.5" rx="1" fill="#EC6AA4" transform="rotate(-25 11 35)"/><circle cx="16" cy="6" r="1.8" fill="#9B7BE0"/><circle cx="47" cy="20" r="1.6" fill="#F58A2E"/></g>
  <path d="M19 33 11 23M45 33l8-10" fill="none" stroke="#B82E0C" stroke-width="3.2" stroke-linecap="round"/>
  <path fill="#DF3C13" d="M32 6c1.6 7.6 6.4 11.3 10.5 15.7 4.5 4.8 7.8 10 7.8 17.3C50.3 50 42.3 57.6 32 57.6S13.7 50 13.7 39c0-7 3.2-11.7 7-15.6.8 3.9 2.6 6.8 5.7 8.3C25.2 22.1 27.6 13.5 32 6z"/>
  <path fill="#FFB23F" d="M32.2 30.5c2.4 3.7 7 6.8 7 12.6 0 5-3.2 8.6-7 8.6s-7-3.6-7-8.6c0-3.2 1.4-5.6 3.2-7.4.3 2.1 1.3 3.6 2.8 4.2-.8-3.5-.2-6.5 1-9.4z"/>
  <ellipse cx="27" cy="38.5" rx="2" ry="2.6" fill="#2A1208"/><ellipse cx="37" cy="38.5" rx="2" ry="2.6" fill="#2A1208"/>
  <path d="M27.5 45c2.6 2.6 6.4 2.6 9 0" fill="none" stroke="#2A1208" stroke-width="2" stroke-linecap="round"/></svg>`;
function wkChipHTML() {
  if (typeof edEditable !== 'function' || !edEditable()) return '';
  const s = wkStreak(wkRec());
  const tip = s.state === 'on' ? `Racha de ${s.n} ${s.n === 1 ? 'día' : 'días'}: hoy ya cumpliste tu meta` : s.state === 'low' ? `Racha de ${s.n} ${s.n === 1 ? 'día' : 'días'}: escribe hoy para no perderla` : 'Escritura: palabras, tiempo y racha';
  return `<button class="btn ghost wk-chip" type="button" data-act="wk-panel" data-st="${ea(s.state)}" aria-haspopup="dialog" title="${esc(tip)}" aria-label="${esc(tip)}">${wkFlame(s.state)}<span class="tnum">${s.n}</span></button>`;
}
function wkPaintChip() {
  const b = $('#view .wk-chip'); if (!b) return;
  const s = wkStreak(WK.rec || wkRec());
  if (b.dataset.st === s.state && b.textContent === String(s.n)) return;
  const was = b.dataset.st;
  b.outerHTML = wkChipHTML();
  if (was && was !== 'on' && s.state === 'on') { const n = $('#view .wk-chip'); if (n) { n.classList.add('lit'); setTimeout(() => n.classList.remove('lit'), 1400); } }   // se encendió
}

/* ---------- panel «Escritura» ---------- */
const wkMin = s => { const m = Math.round((s || 0) / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
const wkSigned = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toLocaleString('es-PE');
function wkPanelHTML() {
  const R = wkRec(), today = wkToday(), s = wkStreak(R), t = R.days[today] || { w: 0, ws: 0, ts: 0 };
  const head = s.state === 'on' ? 'Hoy ya cumpliste tu meta.' : s.state === 'low' ? 'Escribe hoy para no perder la racha.' : 'Cumple la meta hoy y empieza una racha.';
  const pct = Math.min(1, Math.max(t.w / R.goal.w, t.ws / (R.goal.m * 60), 0));
  // mapa de las últimas 8 semanas: una columna por semana (de lunes a domingo), más oscuro cuanto más se escribió
  const mon = wkWeek(today), cols = [];
  for (let wk = 7; wk >= 0; wk--) {
    const m0 = wkShift(mon, -7 * wk), cells = [];
    for (let k = 0; k < 7; k++) {
      const d = wkShift(m0, k);
      if (d > today) { cells.push('<i class="wk-c fut"></i>'); continue; }
      const r = R.days[d], w = r ? r.w : 0, met = wkMet(R, d);
      const lv = !r || (w <= 0 && r.ws < 60) ? 0 : met ? (w >= R.goal.w * 2 || r.ws >= R.goal.m * 120 ? 4 : 3) : w >= R.goal.w / 2 || r.ws >= R.goal.m * 30 ? 2 : 1;
      const rest = s.rest.includes(d);
      const tip = `${revDate(d)}: ${r ? `${wkSigned(w)} palabras · ${wkMin(r.ws)} escribiendo` : 'sin escribir'}${met ? ' · meta cumplida' : rest ? ' · día de descanso' : ''}`;
      cells.push(`<i class="wk-c l${lv}${ea(d === today ? ' now' : '')}${ea(rest ? ' rest' : '')}" title="${esc(tip)}"></i>`);
    }
    cols.push(`<span class="wk-col">${cells.join('')}</span>`);
  }
  // por guion: los últimos 7 días
  const by = new Map();
  for (let k = 0; k < 7; k++) { const r = R.days[wkShift(today, -k)]; if (!r || !r.s) continue; for (const [pid, v] of Object.entries(r.s)) { const x = by.get(pid) || [0, 0, 0]; by.set(pid, [x[0] + v[0], x[1] + v[1], x[2] + v[2]]); } }
  const scripts = [...by.entries()].filter(([, v]) => v[0] || v[1] > 59).sort((a, b) => b[1][1] - a[1][1] || b[1][0] - a[1][0]).slice(0, 6);
  const mine = P && String(P.id || '').replace(/[^\w-]/g, '').slice(0, 40);
  return `<div class="wk-pan">
    <div class="wk-hd">${wkFlame(s.state, 'big')}<div><b class="tnum">${s.n} ${s.n === 1 ? 'día seguido' : 'días seguidos'}</b><span class="hint">${esc(head)}</span></div></div>
    <div class="wk-today" aria-label="Hoy"><div><b class="tnum">${esc(wkSigned(t.w))}</b><span>palabras hoy</span></div><div><b class="tnum">${esc(wkMin(t.ws))}</b><span>escribiendo</span></div><div><b class="tnum">${esc(wkMin(t.ts))}</b><span>pensando</span></div></div>
    <div class="wk-goal"><span class="wk-gl">Meta del día</span><label><input type="number" class="tnum" id="wkGw" min="1" max="5000" step="10" value="${ea(R.goal.w)}" aria-label="Palabras por día"> palabras</label><span class="hint">${EN ? 'or' : 'o'}</span><label><input type="number" class="tnum" id="wkGm" min="1" max="600" step="5" value="${ea(R.goal.m)}" aria-label="Minutos escribiendo por día"> min escribiendo</label>
      <span class="wk-bar" role="progressbar" aria-label="Meta de hoy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}"><i style="width:${(pct * 100).toFixed(0)}%"></i></span></div>
    <div class="wk-row"><span>Mejor racha <b class="tnum">${R.best} ${R.best === 1 ? 'día' : 'días'}</b></span><span class="wk-miles" aria-label="Logros">${WK_MILES.map(m => `<i class="${ea(R.got[m] ? 'got' : '')}" title="${esc(R.got[m] ? `${m} días seguidos · ${revDate(R.got[m])}` : `Logro a los ${m} días`)}">${m}</i>`).join('')}</span></div>
    <div class="wk-map" aria-label="Las últimas 8 semanas"><span class="wk-dn" data-no-tr>${(EN ? ['M', '', 'W', '', 'F', '', 'S'] : ['L', '', 'M', '', 'V', '', 'D']).map(x => `<i>${x}</i>`).join('')}</span>${cols.join('')}</div>
    ${scripts.length ? `<details class="wk-scr"${scripts.length > 1 ? '' : ' open'}><summary>Por guion · 7 días</summary>${scripts.map(([pid, v]) => `<div class="${ea(pid === mine ? 'me' : '')}"><span>${esc(R.names[pid] || 'Guion')}</span><span class="tnum">${esc(wkSigned(v[0]))}</span><span class="tnum">${esc(wkMin(v[1]))}</span></div>`).join('')}</details>` : ''}
    <p class="hint wk-ft">Un día de descanso por semana no corta la racha. Solo tú ves tus números; se guardan ${esc(wkWhere())}.</p></div>`;
}
function wkPanel(btn) {
  wkStop();
  const p = popover(btn, wkPanelHTML(), pp => {
    pp.classList.add('wk-pop');
    pp.addEventListener('change', e => {
      const R = wkRec(), w = $('#wkGw', pp), m = $('#wkGm', pp);
      if (e.target !== w && e.target !== m) return;
      R.goal = { w: wkInt(w.value, 1, 5000) || WK_GOAL.w, m: wkInt(m.value, 1, 600) || WK_GOAL.m };
      w.value = R.goal.w; m.value = R.goal.m;
      WK.goalDirty = true; wkSave(); wkMiles(); wkPaintChip();
      if (wkApi()) { clearTimeout(WK.flushT); WK.flushT = setTimeout(wkFlush, 1500); }
      wkPanelPaint();
    });
  });
  return p;
}
/* el panel abierto se pone al día (sin perder lo que se está escribiendo en la meta) */
function wkPanelPaint() {
  const p = $('#pop.wk-pop'); if (!p || p.contains(document.activeElement) && /INPUT/.test(document.activeElement.tagName)) return;
  const op = $('details.wk-scr', p), was = op ? op.open : null;
  p.innerHTML = wkPanelHTML();
  if (was != null) { const d = $('details.wk-scr', p); if (d) d.open = was; }
}

/* ---------- logro: Tito celebra ---------- */
function wkCelebrate(m) {
  $$('.wk-cel').forEach(x => x.remove());
  const t = document.createElement('div');
  t.className = 'wk-cel'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
  t.innerHTML = `${WK_TITO}<div><small>Logro nuevo</small><b>¡${m} días seguidos escribiendo!</b><span>${m >= 30 ? 'Eso ya es costumbre. Sigue así.' : 'La llama sigue encendida.'}</span></div>`;
  t.addEventListener('click', () => t.remove());
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 4600);
  setTimeout(() => t.remove(), 5200);
}

ACT['wk-panel'] = b => wkPanel(b);
