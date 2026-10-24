/* ============================================================
   Permisos por pestaña y por área del desglose, y límites de cada plan.
   Las reglas de los permisos son las comunes de src/areas.js (make.js lo copia a server/areas.js): las mismas de la
   interfaz y del equipo del escritorio.
   ============================================================ */
'use strict';
const path = require('node:path');
const { SECS, SEC_DEPS, PRODUCER_ROLES, ALLP, cleanPerms, permReadSet, permCanEdit, permAreas, frameSec, PLAN_KEYS, PLAN_TIER, PLAN_NAME, PLAN_DEFAULTS,
  bdFilter, bdViolates, bdCanon, bdAreaOfCat, scriptLockCheck, lockPerson, LOCK_MSG,
  GASTOS, gaRole, gaSeesAll, gaClean, gaView, gaFilter, gaFrameOk, gaFrameEdit } = require(path.join(__dirname, '..', 'areas.js'));

const cleanRole = r => String(r || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 60);
// role: { admin, role, perms, ro } (api.js · roleOf)
const readSet = permReadSet, canEdit = permCanEdit, areasOf = permAreas;

/* ---------- notas y comentarios ----------
   Una sección más («notas»), aparte de las pestañas: todo el equipo la lee y escribe, pero cada nota va pegada
   a algo de una pestaña (on.sec) y solo la ve quien puede leer esa pestaña. Cada quien escribe, edita y borra
   las suyas (solo quien la escribió puede borrarla, también producción solo las suyas); cualquiera puede marcar
   una conversación como resuelta. La nota queda clavada donde se soltó: fx, fy (fracción del ancho y del alto de
   lo anotado) o, en una pestaña, py (píxeles desde arriba de la vista). */
const NOTES = 'notas';
/* gastos (areas.js · gaView y gaFilter): como las notas, la recibe todo el equipo pero cada quien solo lo suyo, y cada
   quien guarda solo lo que le toca. Es de Pro y Studio (PLANS[plan].gastos) */
const DATA_SECS = [...SECS, NOTES, GASTOS];
const canReadSec = (role, sec) => sec === NOTES || sec === GASTOS || readSet(role).has(sec);
const canEditData = (role, sec) => sec === NOTES || sec === GASTOS ? !role.ro : canEdit(role, sec);
const NOTE_ID = /^[\w-]{1,40}$/, NOTE_T = /^[a-z]{1,12}$/, NOTE_REF = /^[\w:.~-]{0,100}$/;
const MAX_NOTES = 3000, MAX_NOTE_TEXT = 4000;
const cleanText = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, n);
function cleanOn(on) {
  if (!on || typeof on !== 'object' || !SECS.includes(on.sec) || !NOTE_T.test(String(on.t || '')) || !NOTE_REF.test(String(on.id || ''))) return null;
  const o = { t: on.t, id: String(on.id || ''), sec: on.sec, label: cleanText(on.label, 120).replace(/\s+/g, ' ').trim() };
  if (typeof on.tab === 'string' && /^[a-z]{1,12}$/.test(on.tab)) o.tab = on.tab;
  const fr = v => typeof v === 'number' && isFinite(v) ? Math.round(Math.min(1, Math.max(0, v)) * 1e4) / 1e4 : null;
  if (fr(on.fx) != null) o.fx = fr(on.fx);
  if (fr(on.fy) != null) o.fy = fr(on.fy);
  if (typeof on.py === 'number' && isFinite(on.py)) o.py = Math.round(Math.min(2e5, Math.max(0, on.py)));
  if (typeof on.k === 'string' && /^[\w-]{1,20}$/.test(on.k)) o.k = on.k;
  // nota al margen del guion rayado (t «txt»): el punto del texto (párrafo, letra y el texto que había ahí, para
  // reencontrarlo si el guion cambia), su fecha y si señala un tramo elegido
  if (o.t === 'txt') {
    const int = v => typeof v === 'number' && isFinite(v) ? Math.round(Math.min(1e6, Math.max(0, v))) : null;
    if (int(on.p) != null) o.p = int(on.p);
    if (int(on.o) != null) o.o = int(on.o);
    if (typeof on.q === 'string') o.q = cleanText(on.q, 80);
    if (typeof on.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(on.d)) o.d = on.d;
    if (on.u === 1 || on.u === true) o.u = 1;
  }
  return o;
}
const notesOf = json => { try { const v = typeof json === 'string' ? JSON.parse(json) : json; return v && v.notes && typeof v.notes === 'object' && !Array.isArray(v.notes) ? v.notes : {}; } catch (e) { return {}; } };
/* profundidad de un JSON sin armarlo (corchetes y llaves fuera de los textos): las secciones de la app no pasan de
   unos 12 niveles; un JSON con miles de niveles desbordaría las funciones recursivas que lo comparan */
const MAX_DEPTH = 64;
function jsonDepth(str) {
  let d = 0, max = 0, inStr = false;
  for (let i = 0, n = str.length; i < n; i++) {
    const c = str.charCodeAt(i);
    if (inStr) { if (c === 92) i++; else if (c === 34) inStr = false; continue; }
    if (c === 34) inStr = true;
    else if (c === 123 || c === 91) { if (++d > max) { max = d; if (max > MAX_DEPTH) return max; } }
    else if (c === 125 || c === 93) d--;
  }
  return max;
}
const canonJ = v => Array.isArray(v) ? '[' + v.map(canonJ).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canonJ(v[k])).join(',') + '}' : JSON.stringify(v);
/* lo que una persona ve de las notas: solo las pegadas a pestañas que puede leer */
function notesView(json, role) {
  const read = readSet(role), out = {};
  for (const [id, n] of Object.entries(notesOf(json))) if (n && n.on && read.has(n.on.sec)) out[id] = n;
  return JSON.stringify({ notes: out });
}
/* guardar las notas de una persona sobre las vigentes: lo que no ve queda igual; de lo que ve, solo cambia lo
   suyo y el «resuelta». Devuelve el JSON completo que queda guardado. */
function notesMerge(curJson, val, user, role, t) {
  const cur = notesOf(curJson), inc = notesOf(val), read = readSet(role), out = {};
  const vis = n => n && n.on && read.has(n.on.sec);
  for (const [id, n] of Object.entries(cur)) {
    if (!vis(n)) { out[id] = n; continue; }
    const nw = inc[id];
    if (!nw || typeof nw !== 'object') { if (n.by !== user.id) out[id] = n; continue; }    // borrar: solo la propia
    const keep = { ...n };
    if (n.by === user.id) {
      const tx = cleanText(nw.text, MAX_NOTE_TEXT);
      if (tx.trim() && tx !== n.text) { keep.text = tx; keep.ed = t; }
      // quien la escribió puede moverla (la flecha a otro punto del texto, el globo a otro lugar) o cambiarle la
      // fecha, sin cambiar a qué está pegada
      const on = !n.re && cleanOn(nw.on);
      if (on && n.on && on.t === n.on.t && on.id === n.on.id && on.sec === n.on.sec && canonJ(on) !== canonJ(n.on)) keep.on = on;
    }
    if (!n.re) { if (nw.done) { if (!n.done) { keep.done = true; keep.doneBy = user.name; } } else { delete keep.done; delete keep.doneBy; } }
    out[id] = keep;
  }
  let count = Object.keys(out).length;
  for (const [id, nw] of Object.entries(inc)) {
    if (id in cur || count >= MAX_NOTES || !NOTE_ID.test(id) || !nw || typeof nw !== 'object') continue;
    const on = cleanOn(nw.on), text = cleanText(nw.text, MAX_NOTE_TEXT);
    if (!on || !read.has(on.sec) || !text.trim()) continue;
    const ts = typeof nw.ts === 'number' && Math.abs(nw.ts - t) < 600e3 ? Math.round(nw.ts) : t;
    const n = { id, on, by: user.id, name: user.name, ts, text };
    if (nw.re != null) { if (!NOTE_ID.test(String(nw.re))) continue; n.re = String(nw.re); }
    else if (nw.done) { n.done = true; n.doneBy = user.name; }
    out[id] = n; count++;
  }
  // respuestas cuya nota ya no existe: se van con ella
  for (const [id, n] of Object.entries(out)) if (n.re && !(out[n.re] && !out[n.re].re)) delete out[id];
  return JSON.stringify({ notes: out });
}

/* planes (decisión del 19 de octubre de 2026, PLANES-Y-PRECIOS.md):
   · Guion (free): solo guiones (hasta 5), sin proyectos de producción; solo texto.
   · Indie: guiones sin límite y 2 proyectos de producción activos, solo para ti.
   · Pro: 7 proyectos activos, 30 personas por proyecto. · Studio: 20 proyectos, 60 personas.
   Un proyecto es un «guion» (kind 'guion': solo la pestaña del guion, coescritura) o un proyecto de producción
   (kind 'prod': todas las pestañas). projects y scripts cuentan los activos (los archivados no cuentan);
   members y writers son las personas del proyecto contando a quien lo creó (Indie: 1 = solo tú). */
const env = (k, d) => process.env[k] != null && process.env[k] !== '' ? +process.env[k] : d;
// archived: cuántos proyectos archivados puede guardar además de los activos (sin tope, una sola cuenta gratuita podía
// llenar el disco del servidor creando y archivando proyectos).
// Los números de siempre están en src/areas.js (PLAN_DEFAULTS, los mismos que muestra la app); estos se pueden cambiar
// con variables de entorno: FREE_PROJECTS, FREE_SCRIPTS, FREE_STORAGE_MB, FREE_ARCHIVED, INDIE_PROJECTS, INDIE_MEMBERS…
const ENV_FIELDS = { free: ['projects', 'scripts', 'storageMB', 'archived'], indie: ['projects', 'members', 'storageMB', 'archived'], pro: ['projects', 'members', 'storageMB', 'archived'], studio: ['projects', 'members', 'storageMB', 'archived'] };
const ENV_NAME = { projects: 'PROJECTS', scripts: 'SCRIPTS', members: 'MEMBERS', storageMB: 'STORAGE_MB', archived: 'ARCHIVED' };
const PLANS = Object.fromEntries(PLAN_KEYS.map(k => [k, { ...PLAN_DEFAULTS[k], ...Object.fromEntries(ENV_FIELDS[k].map(f => [f, env(k.toUpperCase() + '_' + ENV_NAME[f], PLAN_DEFAULTS[k][f])])) }]));
const TIER = PLAN_TIER;
const isPaidPlan = p => p === 'indie' || p === 'pro' || p === 'studio';
const planOf = u => u && isPaidPlan(u.plan) && (!u.pro_until || u.pro_until > Date.now()) ? u.plan : 'free';
/* lo que cuenta en un proyecto según su tipo: cuántos activos permite el plan y cuántas personas (con quien lo creó) */
const KINDS = ['guion', 'prod'];
const kindOf = p => p && p.kind === 'guion' ? 'guion' : 'prod';
const activeLimit = (plan, kind) => { const L = PLANS[plan]; return kind === 'guion' ? (L.scripts == null ? Infinity : L.scripts) : L.projects; };
const peopleLimit = (plan, kind) => kind === 'guion' ? PLANS[plan].writers : PLANS[plan].members;
// en un guion solo existen el guion y las notas
const SCRIPT_SECS = ['guion', 'notas'];

module.exports = {
  jsonDepth, MAX_DEPTH, SECS, SEC_DEPS, PRODUCER_ROLES, ALLP, cleanPerms, cleanRole, readSet, canEdit, areasOf, frameSec, PLANS, TIER, PLAN_NAME, isPaidPlan, planOf, KINDS, kindOf, activeLimit, peopleLimit, SCRIPT_SECS, bdFilter, bdViolates, bdCanon, bdAreaOfCat, scriptLockCheck, lockPerson, LOCK_MSG,
  NOTES, DATA_SECS, canReadSec, canEditData, notesView, notesMerge, notesOf, canonJ, cleanText,
  GASTOS, gaRole, gaSeesAll, gaClean, gaView, gaFilter, gaFrameOk, gaFrameEdit };
