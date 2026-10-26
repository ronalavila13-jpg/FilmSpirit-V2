'use strict';
/* contadores de escritura y rachas de cada persona (pestaña Guion · src/guion-racha.js): se guardan en su cuenta
   (users.writing) para sumar con cualquiera de sus guiones y en cualquier navegador. Nadie más los ve.
   El navegador manda lo que sumó desde la última vez (palabras netas, segundos escribiendo y pensando, por día y por
   guion) y aquí se suma: dos pestañas o dos equipos a la vez no se pisan. El día lo pone el navegador (es el de la
   persona, con su hora); se aceptan solo días cercanos a hoy. La racha la calcula la app; aquí solo se guardan la mejor
   racha y los logros, que solo crecen. Todo lo que llega se limpia y tiene tope. */
const DAY = /^\d{4}-\d{2}-\d{2}$/, PID = /^[\w-]{1,40}$/;
const MILES = [3, 7, 14, 30, 50, 100];
const GOAL = { w: 100, m: 15 };
const MAX_DAYS = 800, DETAIL_DAYS = 70, MAX_SCRIPTS_DAY = 40, MAX_NAMES = 80, MAX_ADD = 200;
const int = (v, lo, hi) => { const n = Math.round(+v); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : 0; };
const name = s => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
const dayOk = d => typeof d === 'string' && DAY.test(d) && !isNaN(Date.parse(d + 'T12:00:00Z'));
const iso = t => new Date(t).toISOString().slice(0, 10);

function clean(o) {
  const W = { goal: { ...GOAL }, days: {}, names: {}, best: 0, got: {} };
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch (e) { o = null; } }
  if (!o || typeof o !== 'object') return W;
  if (o.goal && typeof o.goal === 'object') W.goal = { w: int(o.goal.w, 1, 5000) || GOAL.w, m: int(o.goal.m, 1, 600) || GOAL.m };
  if (o.days && typeof o.days === 'object') for (const [d, r] of Object.entries(o.days).slice(-MAX_DAYS - 50)) {
    if (!dayOk(d) || !r || typeof r !== 'object') continue;
    const x = { w: int(r.w, -1e6, 1e6), ws: int(r.ws, 0, 86400), ts: int(r.ts, 0, 86400) };
    if (r.s && typeof r.s === 'object') for (const [pid, v] of Object.entries(r.s).slice(0, MAX_SCRIPTS_DAY)) if (PID.test(pid) && Array.isArray(v)) (x.s = x.s || {})[pid] = [int(v[0], -1e6, 1e6), int(v[1], 0, 86400), int(v[2], 0, 86400)];
    W.days[d] = x;
  }
  if (o.names && typeof o.names === 'object') for (const [pid, t] of Object.entries(o.names).slice(0, MAX_NAMES)) if (PID.test(pid)) W.names[pid] = name(t);
  W.best = int(o.best, 0, 1e5);
  if (o.got && typeof o.got === 'object') for (const k of MILES) if (dayOk(o.got[k])) W.got[k] = o.got[k];
  return W;
}
/* los días muy viejos se van; el detalle por guion queda unas 10 semanas; los nombres, solo los que se usan */
function prune(W, now) {
  const ds = Object.keys(W.days).sort();
  for (const d of ds.slice(0, Math.max(0, ds.length - MAX_DAYS))) delete W.days[d];
  const lim = iso(now - DETAIL_DAYS * 864e5);
  for (const [d, r] of Object.entries(W.days)) if (d < lim) delete r.s;
  const used = new Set(Object.values(W.days).flatMap(r => Object.keys(r.s || {})));
  for (const pid of Object.keys(W.names)) if (!used.has(pid)) delete W.names[pid];
  return W;
}
/* suma lo que manda el navegador: { add: [{ d, pid, t, w, ws, ts }], goal?, best?, got? } */
function merge(cur, b, now = Date.now()) {
  const W = clean(cur);
  if (!b || typeof b !== 'object') return W;
  if (b.goal && typeof b.goal === 'object') W.goal = { w: int(b.goal.w, 1, 5000) || GOAL.w, m: int(b.goal.m, 1, 600) || GOAL.m };
  // un día cercano a hoy (con la hora de cualquier país, y lo que quedó sin mandar por unos días sin internet)
  const lo = iso(now - 10 * 864e5), hi = iso(now + 2 * 864e5);
  for (const a of (Array.isArray(b.add) ? b.add : []).slice(0, MAX_ADD)) {
    if (!a || typeof a !== 'object' || !dayOk(a.d) || a.d < lo || a.d > hi) continue;
    const w = int(a.w, -50000, 50000), ws = int(a.ws, 0, 86400), ts = int(a.ts, 0, 86400);
    if (!w && !ws && !ts) continue;
    const r = W.days[a.d] = W.days[a.d] || { w: 0, ws: 0, ts: 0 };
    r.w = int(r.w + w, -1e6, 1e6); r.ws = int(r.ws + ws, 0, 86400); r.ts = int(r.ts + ts, 0, 86400);
    if (typeof a.pid === 'string' && PID.test(a.pid)) {
      r.s = r.s || {};
      if (r.s[a.pid] || Object.keys(r.s).length < MAX_SCRIPTS_DAY) { const q = r.s[a.pid] || [0, 0, 0]; r.s[a.pid] = [int(q[0] + w, -1e6, 1e6), int(q[1] + ws, 0, 86400), int(q[2] + ts, 0, 86400)]; }
      const t = name(a.t); if (t) W.names[a.pid] = t;
    }
  }
  // la mejor racha y los logros solo crecen (un logro guarda el día en que se alcanzó por primera vez)
  W.best = Math.max(W.best, int(b.best, 0, 1e5));
  if (b.got && typeof b.got === 'object') for (const k of MILES) if (dayOk(b.got[k]) && !W.got[k] && b.got[k] <= hi) W.got[k] = b.got[k];
  return prune(W, now);
}
const writingOf = u => prune(clean(u && u.writing), Date.now());
module.exports = { clean, merge, writingOf, MILES };
