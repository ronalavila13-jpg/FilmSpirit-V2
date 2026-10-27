/* ============================================================
   PERMISOS, ÁREAS DEL DESGLOSE Y GUION CERRADO · reglas compartidas
   Un solo lugar para las reglas del equipo. Lo usan la interfaz (web,
   servidor y escritorio), el servidor (server/lib/perm.js; make.js lo
   copia a server/areas.js) y el proceso principal del escritorio
   (desktop/team.js; make.js lo copia a desktop/areas.js), que rechaza
   los cambios firmados que no corresponden.
   · Permisos por pestaña: qué puede leer y editar cada persona.
   · Áreas del desglose: cada jefe de área edita solo sus cajas de la
     hoja de desglose. Las categorías de cada área son las de SHEET en
     core.js (test/permisos.test.js comprueba que coincidan).
   · Guion cerrado.
   ============================================================ */

/* ---------- permisos por pestaña ----------
   Antes había una copia en el servidor, otra en el escritorio y dos en la interfaz, y ya no coincidían: el escritorio
   entregaba la llave del presupuesto a cualquiera con ese permiso, y su limpieza de permisos aceptaba áreas como
   «__proto__». */
const SECS = ['guion', 'desglose', 'storyboard', 'animatic', 'plan', 'calendario', 'presupuesto', 'llamado', 'hoja'];   // en el orden de las pestañas de la app
// qué secciones necesita leer cada pestaña para funcionar
const SEC_DEPS = {
  guion: ['guion'], desglose: ['guion', 'desglose'], storyboard: ['guion', 'desglose', 'storyboard'], animatic: ['guion', 'desglose', 'storyboard', 'animatic'],
  plan: ['guion', 'desglose', 'plan'], presupuesto: ['guion', 'desglose', 'plan', 'presupuesto'], hoja: ['guion', 'desglose', 'storyboard', 'hoja'],
  calendario: ['guion', 'desglose', 'plan', 'calendario'], llamado: ['guion', 'desglose', 'plan', 'llamado'],
};
// el presupuesto es solo para producción: quien administra el proyecto o quien tenga uno de estos cargos
const PRODUCER_ROLES = ['Producción', 'Producción ejecutiva', 'Jefatura de producción'];
const isProducer = role => PRODUCER_ROLES.includes(role);
/* (lote AD) la etapa Guion (Historia y Guion) de un proyecto de producción: la ven el cargo «Guion», los de producción y
   quien administra el proyecto. Los demás leen el guion en el Guion rayado, el Desglose y las otras pestañas; en la web
   con cuentas el material de Historia (build) ni siquiera les llega (server/lib/perm.js · histHidden). En un guion
   (coescritura) no corre: ahí todos escriben */
const SCRIPT_STAGE_ROLES = ['Guion', ...PRODUCER_ROLES];
const seesScriptStage = who => !!who && (!!who.admin || SCRIPT_STAGE_ROLES.includes(who.role));
const ALLP =Object.fromEntries(SECS.map(s => [s, 'editar']));
/* los permisos guardables: «ver» o «editar» por sección y, con el desglose para editar, sus áreas (solo las de la
   hoja: no «__proto__», «constructor»… que existen en cualquier objeto) */
function cleanPerms(p) {
  const out = {};
  if (!p || typeof p !== 'object') return out;
  for (const s of SECS) if (p[s] === 'ver' || p[s] === 'editar') out[s] = p[s];
  if (p.gastos === 'ver' || p.gastos === 'editar') out.gastos = p.gastos;   // Gastos (web con cuentas): ver más abajo
  if (out.desglose === 'editar' && Array.isArray(p.areas)) out.areas = [...new Set(p.areas.filter(a => typeof a === 'string' && Object.prototype.hasOwnProperty.call(BD_AREAS, a)))];
  return out;
}
/* who: { admin, role, perms, ro } — quien administra el proyecto, su cargo, sus permisos y si está en solo lectura */
/* qué secciones puede leer: el guion, las que tiene y las que esas necesitan; el presupuesto, solo producción */
function permReadSet(who) {
  if (who.admin) return new Set(SECS);
  const s = new Set(['guion']), prod = isProducer(who.role);
  for (const [k, v] of Object.entries(who.perms || {})) if ((v === 'ver' || v === 'editar') && (k !== 'presupuesto' || prod)) for (const d of SEC_DEPS[k] || []) s.add(d);
  return s;
}
function permCanEdit(who, sec) {
  if (who.ro) return false;
  if (who.admin) return true;
  if (sec === 'presupuesto' && !isProducer(who.role)) return false;
  return (who.perms || {})[sec] === 'editar';
}
/* las áreas del desglose que puede editar (null: todas) */
const permAreas = who => !who.admin && who.perms && who.perms.desglose === 'editar' && Array.isArray(who.perms.areas) ? who.perms.areas : null;
// las fotos del desglose («bd~…») y las del casting («ca~…») viajan con el desglose; las del scouting («lc~…»), con
// el stripboard; las del punto de encuentro («cl~…»), con la hoja de llamado; las de los recibos y órdenes de
// compra («ga~…»), con Gastos (cada persona las suyas: gaFrameOk); el resto, con el storyboard
const frameSec = k => /^(bd|ca)~/.test(String(k)) ? 'desglose' : String(k).startsWith('lc~') ? 'plan' : String(k).startsWith('cl~') ? 'llamado' : String(k).startsWith('ga~') ? 'gastos' : 'storyboard';
const FRAME_SECS = ['storyboard', 'desglose', 'plan', 'llamado'];

/* ---------- planes de la web con cuentas ----------
   Los números de siempre. En el servidor se pueden cambiar con variables de entorno (server/lib/perm.js); la app usa
   los que le manda el servidor (me.plans) y estos solo mientras todavía no llegaron. */
const PLAN_KEYS = ['free', 'indie', 'pro', 'studio'];
const PLAN_TIER = { free: 0, indie: 1, pro: 2, studio: 3 };
const PLAN_NAME = { free: 'Guion', indie: 'Indie', pro: 'Pro', studio: 'Studio' };
// gastos: la pestaña Gastos (órdenes de compra, caja chica, reembolsos y pagos), solo en Pro y Studio
const PLAN_DEFAULTS = {
  free: { projects: 0, scripts: 5, writers: 4, members: 1, photos: false, gastos: false, storageMB: 100, archived: 10 },
  indie: { projects: 2, scripts: null, writers: 4, members: 1, photos: true, gastos: false, storageMB: 5000, archived: 20 },
  pro: { projects: 7, scripts: null, writers: 4, members: 30, photos: true, gastos: true, storageMB: 20000, archived: 60 },
  studio: { projects: 20, scripts: null, writers: 4, members: 60, photos: true, gastos: true, storageMB: 100000, archived: 200 },
};

/* ---------- gastos (solo la web con cuentas, planes Pro y Studio) ----------
   Una sección aparte del presupuesto, «gastos» = { ocs, cajas, reemb, motivos }, para que quien rinde su caja chica no
   reciba el presupuesto (que el servidor solo entrega a producción). No es una pestaña con permiso como las de SECS:
   todo el equipo la puede recibir, pero cada persona recibe solo lo suyo (gaView) y guarda solo lo que le toca
   (gaFilter), como las notas. El permiso «gastos» (ver/editar) dice qué papel tiene cada quien (gaRole):
   · prod: quien administra o un cargo de producción («Producción», «Producción ejecutiva») con «editar»: todo
     (crea, aprueba, paga y anula órdenes de compra; entrega dinero, revisa recibos y cierra cajas).
   · jefe: «Jefatura de producción» con «editar»: crea y aprueba órdenes, entrega dinero y revisa recibos.
   · ver: un cargo de producción con «ver»: el resumen y los pagos, sin cambiar nada.
   · area: otro cargo con «editar» (jefe/a de área): pide órdenes de compra de su área (quedan en borrador), rinde su
     propia caja chica y pide reembolsos de lo que pagó de su bolsillo. Solo ve lo suyo.
   · own: los demás: si tienen una caja chica a su nombre, la ven y la rinden. Nada más.
   Montos en la moneda del presupuesto, con dos decimales. Lo pagado, revisado o anulado ya no se edita: se anula con
   un motivo. Quién aprobó, pagó, revisó o anuló lo anota el servidor, no el navegador. */
const GASTOS = 'gastos';
const GA_PAY_ROLES = ['Producción', 'Producción ejecutiva'];
// los ids de las partidas del presupuesto (BUD_SECTIONS de core.js; test/gastos.test.js comprueba que coincidan)
const GA_SECS = ['dev', 'pre', 'cast', 'extras', 'crew', 'camera', 'sound', 'art', 'ward', 'loc', 'trans', 'food', 'post', 'gen'];
// las partidas en las que un jefe de área puede pedir órdenes de compra, según su cargo (sin cargo conocido: todas)
const GA_ROLE_SECS = {
  'Dirección de arte': ['art', 'trans'], 'Vestuario y maquillaje': ['ward'], 'Sonido': ['sound'], 'Dirección de fotografía': ['camera'],
  'Efectos especiales': ['art', 'camera'], 'Casting': ['cast', 'extras'], 'Asistencia de dirección': ['pre', 'food', 'trans'],
  'Dirección': ['pre'], 'Guion': ['dev'], 'Montaje': ['post'], 'Script / continuidad': ['gen'],
};
const GA_LIM = { ocs: 3000, cajas: 300, given: 300, recibos: 1500, reemb: 3000 };
const GA_OC_ST = ['draft', 'ok', 'paid', 'void'], GA_RB_ST = ['pend', 'ok', 'paid', 'void'];
const GA_PAY = ['transf', 'efectivo', 'cheque', 'yape', 'tarjeta'], GA_KIND = ['boleta', 'factura', 'rh', 'sc'];
function gaRole(who) {
  if (!who) return 'none';
  if (who.admin) return 'prod';
  const g = (who.perms || {}).gastos;
  if (isProducer(who.role)) return g === 'editar' ? (GA_PAY_ROLES.includes(who.role) ? 'prod' : 'jefe') : g === 'ver' ? 'ver' : 'own';
  return g === 'editar' ? 'area' : 'own';
}
const gaSeesAll = r => r === 'prod' || r === 'jefe' || r === 'ver';
const gaAreaSecs = who => (who && GA_ROLE_SECS[who.role]) || GA_SECS;
// limpieza: lo que llega del navegador o de la base, con tipos, topes y largos
const gaNum = v => { const n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? Math.round(Math.min(1e10, Math.max(0, n)) * 100) / 100 : 0; };
const gaDate = v => { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return ''; const d = new Date(v + 'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === v ? v : ''; };
const gaTxt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const gaId = v => typeof v === 'string' && /^[\w-]{1,40}$/.test(v) ? v : '';
const gaOne = (v, list, d) => list.includes(v) ? v : d;
const gaObj = v => v && typeof v === 'object' && !Array.isArray(v);
const gaStamp = s => gaObj(s) ? { by: gaId(s.by), name: gaTxt(s.name, 80), at: Math.max(0, Math.round(+s.at || 0)), ...(s.why != null ? { why: gaTxt(s.why, 300) } : {}), ...(s.date != null ? { date: gaDate(s.date) } : {}), ...(s.how != null ? { how: gaOne(s.how, ['devuelto', 'reembolsado'], 'devuelto') } : {}), ...(s.amount != null ? { amount: gaNum(s.amount) } : {}) } : null;
const gaUniq = (arr, max, f) => { const seen = new Set(), out = []; for (const x of Array.isArray(arr) ? arr : []) { if (out.length >= max) break; const y = f(x); if (y && !seen.has(y.id)) { seen.add(y.id); out.push(y); } } return out; };
const gaMoney = x => ({ line: gaId(x.line), sec: gaOne(x.sec, GA_SECS, ''), amount: gaNum(x.amount) });
function gaOcClean(x) {
  if (!gaObj(x) || !gaId(x.id)) return null;
  const o = { id: x.id, num: gaTxt(x.num, 12), uid: gaId(x.uid), name: gaTxt(x.name, 80), vendor: gaTxt(x.vendor, 120), ruc: gaTxt(x.ruc, 20).replace(/[^\w-]/g, ''),
    desc: gaTxt(x.desc, 300), ...gaMoney(x), igv: !!x.igv, date: gaDate(x.date), pay: gaOne(x.pay, GA_PAY, 'transf'), note: gaTxt(x.note, 300),
    state: gaOne(x.state, GA_OC_ST, 'draft'), by: gaId(x.by), at: Math.max(0, Math.round(+x.at || 0)) };
  if (x.ph) o.ph = 1;
  for (const k of ['ok', 'paid', 'void']) { const s = gaStamp(x[k]); if (s) o[k] = s; }
  return o;
}
function gaRecClean(x) {
  if (!gaObj(x) || !gaId(x.id)) return null;
  const o = { id: x.id, date: gaDate(x.date), shop: gaTxt(x.shop, 120), desc: gaTxt(x.desc, 300), ...gaMoney(x), kind: gaOne(x.kind, GA_KIND, 'boleta'), by: gaId(x.by), at: Math.max(0, Math.round(+x.at || 0)) };
  if (x.ph) o.ph = 1;
  for (const k of ['ok', 'void']) { const s = gaStamp(x[k]); if (s) o[k] = s; }
  return o;
}
function gaCajaClean(x) {
  if (!gaObj(x) || !gaId(x.id)) return null;
  const o = { id: x.id, uid: gaId(x.uid), name: gaTxt(x.name, 80), role: gaTxt(x.role, 60),
    given: gaUniq(x.given, GA_LIM.given, g => gaObj(g) && gaId(g.id) ? { id: g.id, amount: gaNum(g.amount), date: gaDate(g.date), by: gaId(g.by), name: gaTxt(g.name, 80), at: Math.max(0, Math.round(+g.at || 0)) } : null),
    recibos: gaUniq(x.recibos, GA_LIM.recibos, gaRecClean) };
  const c = gaStamp(x.closed); if (c) o.closed = c;
  return o;
}
function gaRbClean(x) {
  if (!gaObj(x) || !gaId(x.id)) return null;
  const o = { id: x.id, uid: gaId(x.uid), name: gaTxt(x.name, 80), desc: gaTxt(x.desc, 300), ...gaMoney(x), km: gaNum(x.km), kmRate: gaNum(x.kmRate), date: gaDate(x.date),
    state: gaOne(x.state, GA_RB_ST, 'pend'), by: gaId(x.by), at: Math.max(0, Math.round(+x.at || 0)) };
  if (x.ph) o.ph = 1;
  for (const k of ['ok', 'paid', 'void']) { const s = gaStamp(x[k]); if (s) o[k] = s; }
  return o;
}
function gaClean(g) {
  g = gaObj(g) ? g : {};
  const mot = {};
  if (gaObj(g.motivos)) for (const s of GA_SECS) { const t = gaTxt(g.motivos[s], 500); if (t) mot[s] = t; }
  return { ocs: gaUniq(g.ocs, GA_LIM.ocs, gaOcClean), cajas: gaUniq(g.cajas, GA_LIM.cajas, gaCajaClean), reemb: gaUniq(g.reemb, GA_LIM.reemb, gaRbClean), motivos: mot };
}
/* lo que recibe cada persona. lines: las líneas del presupuesto ([{ id, sec, name }]); a quien no ve el presupuesto
   le llegan sus nombres y partidas (sin montos) para elegir a qué partida va cada gasto, y la moneda (cur) */
function gaView(g, who, lines, cur) {
  g = gaClean(g);
  const r = gaRole(who);
  if (gaSeesAll(r)) return g;
  const mine = x => !!(who && who.uid && x.uid === who.uid);
  const out = { ocs: r === 'area' ? g.ocs.filter(mine) : [], cajas: g.cajas.filter(mine), reemb: r === 'area' ? g.reemb.filter(mine) : g.reemb.filter(x => mine(x) && x.state !== 'pend'), motivos: {} };
  if (r === 'area' || out.cajas.length || out.reemb.length) {
    out.partidas = (Array.isArray(lines) ? lines : []).filter(l => l && gaId(l.id) && GA_SECS.includes(l.sec)).slice(0, 2000).map(l => ({ id: l.id, sec: l.sec, name: gaTxt(l.name, 120) }));
    if (cur) out.moneda = gaTxt(cur, 8);
  }
  return out;
}
/* ¿qué puede hacer esta persona? (para la interfaz; el servidor lo decide con gaFilter) */
function gaCan(who) {
  const r = gaRole(who), ro = !!(who && who.ro);
  const all = !ro && (r === 'prod' || r === 'jefe');
  return { role: r, seesAll: gaSeesAll(r), ocNew: all || (!ro && r === 'area'), ocApprove: all, ocPay: !ro && r === 'prod', void: !ro && r === 'prod',
    give: all, review: all, close: !ro && r === 'prod', rbNew: all || (!ro && r === 'area'), motivos: all, receipt: !ro && r !== 'ver' && r !== 'none' };
}
/* lo que se guarda: «next» sobre «cur» con solo los cambios que le corresponden a quien guarda. ctx: { t: ahora,
   name: su nombre, lines: las líneas del presupuesto (para saber de qué partida es cada una) }. Lo que la persona no
   ve queda igual (que no esté en lo que manda no es que lo borró). */
function gaFilter(cur, next, who, ctx) {
  cur = gaClean(cur); next = gaClean(next);
  const r = gaRole(who), can = gaCan(who), t = (ctx && ctx.t) || Date.now();
  if (r === 'ver' || r === 'none' || (who && who.ro)) return cur;
  const me = (who && who.uid) || '', stamp = (more) => ({ by: me, name: gaTxt(ctx && ctx.name, 80), at: t, ...(more || {}) });
  const lineSec = new Map((ctx && Array.isArray(ctx.lines) ? ctx.lines : []).filter(l => l && l.id).map(l => [l.id, l.sec]));
  // la partida: la de su línea del presupuesto si la tiene; si no, la que se eligió
  const fixSec = x => { const s = x.line && lineSec.get(x.line); if (s && GA_SECS.includes(s)) x.sec = s; return x; };
  const all = r === 'prod' || r === 'jefe';
  const mine = x => !!me && x.uid === me;
  // lo que esta persona ve (lo mismo que le manda gaView): lo demás queda como estaba
  const vOc = x => all || (r === 'area' && mine(x)), vCaja = x => all || mine(x), vRb = x => all || (mine(x) && (r === 'area' || x.state !== 'pend'));
  const byId = a => new Map(a.map(x => [x.id, x]));
  const FIELDS_OC = ['vendor', 'ruc', 'desc', 'line', 'sec', 'amount', 'igv', 'date', 'pay', 'note', 'ph'];
  const take = (to, from, fields) => { for (const f of fields) { if (from[f] === undefined) delete to[f]; else to[f] = from[f]; } return to; };
  const secOk = x => all || gaAreaSecs(who).includes(x.sec);
  // número de orden: lo pone el servidor, seguido (OC-001, OC-002…)
  let maxN = cur.ocs.reduce((m, o) => Math.max(m, +(String(o.num).match(/(\d+)$/) || [0, 0])[1]), 0);
  const nextNum = () => 'OC-' + String(++maxN).padStart(3, '0');

  /* órdenes de compra */
  const C = byId(cur.ocs), N = byId(next.ocs), ocs = [];
  for (const c of cur.ocs) {
    if (!vOc(c)) { ocs.push(c); continue; }
    const n = N.get(c.id);
    if (!n) { if (c.state === 'draft' && (all || mine(c))) continue; ocs.push(c); continue; }    // solo se borra un borrador
    const o = { ...c };
    if ((c.state === 'draft' && (all || mine(c))) || (c.state === 'ok' && all)) take(o, fixSec({ ...n }), FIELDS_OC);
    if (!secOk(o)) take(o, c, FIELDS_OC);
    if (c.state === 'draft' && n.state === 'ok' && can.ocApprove) { o.state = 'ok'; o.ok = stamp(); }
    else if (c.state === 'ok' && n.state === 'paid' && can.ocPay) { o.state = 'paid'; o.paid = stamp({ date: (n.paid && n.paid.date) || gaDate(new Date(t).toISOString().slice(0, 10)) }); }
    if (c.state !== 'void' && n.state === 'void' && can.void && n.void && n.void.why) { o.state = 'void'; o.void = stamp({ why: n.void.why }); }
    ocs.push(o);
  }
  for (const n of next.ocs) {
    if (C.has(n.id) || !can.ocNew) continue;
    const o = fixSec({ ...n, num: nextNum(), by: me, at: t });
    if (!all) { o.uid = me; o.name = gaTxt(ctx && ctx.name, 80); }
    if (!secOk(o)) { maxN--; continue; }
    delete o.ok; delete o.paid; delete o.void;
    // producción y la jefatura las crean aprobadas; las de un jefe de área esperan su aprobación
    if (all) { o.state = 'ok'; o.ok = stamp(); } else o.state = 'draft';
    ocs.push(o);
  }

  /* caja chica */
  const CJ = byId(cur.cajas), NJ = byId(next.cajas), cajas = [];
  const recEdit = (c, rc) => !c.closed && !rc.ok && !rc.void && (all || rc.by === me);
  for (const c of cur.cajas) {
    if (!vCaja(c)) { cajas.push(c); continue; }
    const n = NJ.get(c.id);
    if (!n) { if (r === 'prod' && !c.recibos.length && !c.closed) continue; cajas.push(c); continue; }   // se quita una caja sin recibos
    if (c.closed) { cajas.push(c); continue; }
    const o = { ...c };
    if (all) { o.uid = n.uid; o.name = n.name; o.role = n.role; }
    // entregas: se suman (con quién entregó); quitar una, solo producción
    const G = byId(c.given);
    o.given = c.given.filter(g => r === 'prod' ? n.given.some(x => x.id === g.id) : true);
    if (can.give) for (const g of n.given) if (!G.has(g.id) && g.amount > 0) o.given.push({ id: g.id, amount: g.amount, date: g.date || gaDate(new Date(t).toISOString().slice(0, 10)), ...stamp() });
    // recibos
    const R = byId(c.recibos), NR = byId(n.recibos), recs = [];
    for (const rc of c.recibos) {
      const nr = NR.get(rc.id);
      if (!nr) { if (recEdit(c, rc)) continue; recs.push(rc); continue; }
      let x = { ...rc };
      if (recEdit(c, rc)) x = { ...fixSec({ ...nr }), id: rc.id, by: rc.by, at: rc.at };
      delete x.ok; delete x.void;
      if (rc.ok) x.ok = rc.ok; else if (nr.ok && can.review) x.ok = stamp();
      if (rc.void) x.void = rc.void; else if (nr.void && nr.void.why && can.void) x.void = stamp({ why: nr.void.why });
      if (rc.ok && !x.void) x = { ...rc };     // revisado: no cambia (solo se anula)
      recs.push(x);
    }
    for (const nr of n.recibos) if (!R.has(nr.id) && can.receipt && (all || mine(c))) { const x = fixSec({ ...nr, by: me, at: t }); delete x.ok; delete x.void; recs.push(x); }
    o.recibos = recs.slice(0, GA_LIM.recibos);
    // se cierra con todo revisado o anulado (si no, los recibos pendientes quedarían congelados sin revisar)
    if (n.closed && can.close && o.recibos.every(x => x.void || x.ok)) {
      const given = o.given.reduce((a, g) => a + g.amount, 0), spent = o.recibos.filter(x => !x.void).reduce((a, x) => a + x.amount, 0);
      o.closed = stamp({ how: given >= spent ? 'devuelto' : 'reembolsado', amount: Math.round(Math.abs(given - spent) * 100) / 100 });
    }
    cajas.push(o);
  }
  if (all) for (const n of next.cajas) {
    if (CJ.has(n.id)) continue;
    cajas.push({ id: n.id, uid: n.uid, name: n.name, role: n.role,
      given: n.given.filter(g => g.amount > 0).map(g => ({ id: g.id, amount: g.amount, date: g.date || gaDate(new Date(t).toISOString().slice(0, 10)), ...stamp() })),
      recibos: n.recibos.map(nr => { const x = fixSec({ ...nr, by: me, at: t }); delete x.ok; delete x.void; return x; }) });
  }

  /* reembolsos */
  const CR = byId(cur.reemb), NB = byId(next.reemb), reemb = [];
  const FIELDS_RB = ['desc', 'line', 'sec', 'amount', 'km', 'kmRate', 'date', 'ph'];
  for (const c of cur.reemb) {
    if (!vRb(c)) { reemb.push(c); continue; }
    const n = NB.get(c.id);
    if (!n) { if (c.state === 'pend' && (all || mine(c))) continue; reemb.push(c); continue; }
    const o = { ...c };
    if ((c.state === 'pend' && (all || mine(c))) || (c.state === 'ok' && all)) take(o, fixSec({ ...n }), FIELDS_RB);
    if (all && c.state !== 'paid' && c.state !== 'void') { o.uid = n.uid; o.name = n.name; }
    if (c.state === 'pend' && n.state === 'ok' && can.ocApprove) { o.state = 'ok'; o.ok = stamp(); }
    else if (c.state === 'ok' && n.state === 'paid' && can.ocPay) { o.state = 'paid'; o.paid = stamp({ date: (n.paid && n.paid.date) || gaDate(new Date(t).toISOString().slice(0, 10)) }); }
    if (c.state !== 'void' && n.state === 'void' && can.void && n.void && n.void.why) { o.state = 'void'; o.void = stamp({ why: n.void.why }); }
    reemb.push(o);
  }
  for (const n of next.reemb) {
    if (CR.has(n.id) || !can.rbNew) continue;
    const o = fixSec({ ...n, by: me, at: t });
    delete o.ok; delete o.paid; delete o.void;
    if (all) { o.state = 'ok'; o.ok = stamp(); } else { o.uid = me; o.name = gaTxt(ctx && ctx.name, 80); o.state = 'pend'; }
    reemb.push(o);
  }

  const motivos = can.motivos ? next.motivos : cur.motivos;
  return gaClean({ ocs, cajas, reemb, motivos });
}
/* las fotos de Gastos: «ga~oc~<orden>», «ga~rb~<reembolso>» y «ga~<caja>~<recibo>». Quién las ve y quién las sube */
// el índice de cada documento se arma una sola vez: el servidor revisa cientos de fotos contra el mismo documento
const GA_IDX = new WeakMap();
function gaIndex(g) {
  const src = gaObj(g) ? g : {};
  let ix = GA_IDX.get(src);
  if (!ix) {
    const c = gaClean(src), byId = a => new Map(a.map(o => [o.id, o]));
    ix = { oc: byId(c.ocs), rb: byId(c.reemb), cajas: new Map(c.cajas.map(o => [o.id, { caja: o, rec: byId(o.recibos) }])) };
    GA_IDX.set(src, ix);
  }
  return ix;
}
function gaFrameItem(g, k) {
  const m = /^ga~([\w-]{1,40})~([\w-]{1,40})$/.exec(String(k));
  if (!m) return null;
  const ix = gaIndex(g);
  if (m[1] === 'oc') return { kind: 'oc', id: m[2], x: ix.oc.get(m[2]) || null };
  if (m[1] === 'rb') return { kind: 'rb', id: m[2], x: ix.rb.get(m[2]) || null };
  const c = ix.cajas.get(m[1]);
  return { kind: 'rec', id: m[2], caja: c ? c.caja : null, x: c ? c.rec.get(m[2]) || null : null };
}
function gaFrameOk(g, who, k) {
  const r = gaRole(who), it = gaFrameItem(g, k);
  if (!it) return false;
  if (gaSeesAll(r)) return true;
  const me = who && who.uid;
  if (!me) return false;
  if (it.kind === 'rec') return !!(it.caja && it.caja.uid === me);
  return !!(it.x && it.x.uid === me && (it.kind !== 'oc' || r === 'area'));
}
function gaFrameEdit(g, who, k) {
  const r = gaRole(who), it = gaFrameItem(g, k), me = who && who.uid;
  if (!it || (who && who.ro) || r === 'ver' || r === 'none') return false;
  const all = r === 'prod' || r === 'jefe';
  if (it.kind === 'rec') {
    if (!it.caja || it.caja.closed || !(all || it.caja.uid === me)) return false;
    return !it.x || (!it.x.ok && !it.x.void && (all || it.x.by === me));    // un recibo nuevo (todavía sin guardar) o uno sin revisar
  }
  if (all) return !it.x || !(it.x.state === 'paid' || it.x.state === 'void');
  if (r !== 'area') return false;
  return !it.x || (it.x.uid === me && it.x.state === (it.kind === 'oc' ? 'draft' : 'pend'));
}

/* ---------- áreas del desglose ---------- */
const BD_AREAS = {
  cast: ['cast'], equip: ['equip'], sfx: ['sfx', 'vfx'], extras: ['extras'], props: ['props', 'setdress', 'weapons'],
  ward: ['wardrobe', 'makeup'], veh: ['vehicles', 'animals'], sound: ['sound'], notes: ['notes', 'stunts'],
};
const bdAreaOfCat = c => Object.keys(BD_AREAS).find(a => BD_AREAS[a].includes(c)) || 'notes';
// JSON con claves ordenadas, para comparar dos versiones
const bdCanon = v => Array.isArray(v) ? '[' + v.map(x => x === undefined ? 'null' : bdCanon(x)).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + bdCanon(v[k])).join(',') + '}'
  : v === undefined ? undefined : JSON.stringify(v);
/* el desglose «b» con solo los cambios de «l» que caen dentro de las áreas permitidas.
   Elementos y marcas: los de categorías permitidas. Escenas: solo las notas, si el área «notes» está permitida. */
function bdFilter(b, l, areas) {
  areas = new Set(areas || []);
  b = b || {}; l = l || {};
  const bE = b.elements || {}, lE = l.elements || {}, bT = b.tags || [], lT = l.tags || [], bS = b.scenes || {}, lS = l.scenes || {};
  const cats = new Set([...areas].flatMap(a => BD_AREAS[a] || []));
  const ok = c => cats.has(c);
  const out = { elements: { ...bE }, tags: [], scenes: JSON.parse(JSON.stringify(bS)) };
  for (const id of new Set([...Object.keys(bE), ...Object.keys(lE)])) {
    const be = bE[id], le = lE[id];
    if (bdCanon(be) === bdCanon(le)) continue;
    if ((!be || ok(be.cat)) && (!le || ok(le.cat))) { if (le) out.elements[id] = le; else delete out.elements[id]; }
  }
  // categoría de la marca según el desglose ya filtrado: si se rechazó el cambio de un elemento, vale su categoría
  // anterior (antes valía la que decía el cambio, y un jefe de área podía borrar marcas de otras áreas)
  const catT = t => (out.elements[t.el] || bE[t.el] || {}).cat;
  const B = new Map(bT.map(t => [t.id, t])), L = new Map(lT.map(t => [t.id, t])), keep = new Map(B);
  for (const id of new Set([...B.keys(), ...L.keys()])) {
    const bt = B.get(id), lt = L.get(id);
    if (bdCanon(bt) === bdCanon(lt)) continue;
    if ((!bt || ok(catT(bt))) && (!lt || ok(catT(lt)))) { if (lt) keep.set(id, lt); else keep.delete(id); }
  }
  out.tags = [...lT.filter(t => keep.has(t.id)).map(t => keep.get(t.id)), ...bT.filter(t => keep.has(t.id) && !L.has(t.id))];
  if (areas.has('notes')) for (const k of new Set([...Object.keys(bS), ...Object.keys(lS)])) {
    const ln = (lS[k] || {}).notes, bn = (bS[k] || {}).notes;
    if (ln === bn) continue;
    const sc = { ...(out.scenes[k] || {}) };
    if (ln == null) delete sc.notes; else sc.notes = ln;
    out.scenes[k] = sc;
  }
  // el casting viaja con el desglose: lo cambia quien tiene el área de reparto; para los demás queda como estaba
  // (sin esto, guardar el desglose de un jefe de área lo borraba)
  const src = areas.has('cast') ? l : b;
  if (src.casting !== undefined) out.casting = src.casting;
  // los colores de las categorías (la leyenda del desglose) los cambia quien edita todo el desglose, no un jefe de área
  if (b.catCol !== undefined) out.catCol = b.catCol;
  return out;
}
/* ¿«a» cambia algo fuera de las áreas permitidas respecto de «b»? */
const bdViolates = (b, a, areas) => bdCanon(bdFilter(b, a, areas)) !== bdCanon(a || {});

/* ---------- guion cerrado (guion final) ----------
   meta.lock = { on, at, by, people: [{ id, name, role, mid, s, h, adm }], rec, rev, revs, log, base }
   people[].mid: su cuenta (web) o su lugar en el equipo (escritorio); adm: puede reabrir y cambiar quiénes.
   Con el guion cerrado:
   · el texto (paras y formato) solo cambia con una revisión abierta y lo cambia una persona autorizada;
   · la revisión y el registro (rev, revs, log) los cambia una persona autorizada; cada una pone su propio código;
   · quiénes, el código de recuperación y reabrir: quien administra el proyecto o una persona con adm.
   Cerrarlo: quien administra o un cargo de producción. who: { id, owner, producer, canEdit } */
const LOCK_FREE = ['rev', 'revs', 'log'];
// tope del registro (el mismo de src/guion-cierre.js: LOCK_LOG_MAX); las revisiones cerradas no tienen tope: nunca se quitan
const LOCK_CAP = { log: 1500, revs: Infinity };
const lockOf = v => v && v.meta && v.meta.lock && typeof v.meta.lock === 'object' ? v.meta.lock : null;
const lockPerson = (v, id) => { const L = lockOf(v); return L && L.on && id && Array.isArray(L.people) ? L.people.find(p => p && p.mid && p.mid === id) || null : null; };
function scriptLockCheck(cur, next, who) {
  const L = lockOf(cur), N = lockOf(next), on = x => !!(x && x.on);
  const same = (a, b) => bdCanon(a === undefined ? null : a) === bdCanon(b === undefined ? null : b);
  if (!on(L)) {
    if (!on(N)) return who.canEdit ? null : 'no_edit';
    return who.canEdit && (who.owner || who.producer) ? null : 'lock_producer';
  }
  const me = lockPerson(cur, who.id);
  if (who.owner || (me && me.adm)) return null;
  if (!on(N)) return 'lock_admin';
  const pick = (x, keep) => { const o = {}; for (const [k, v] of Object.entries(x || {})) if (LOCK_FREE.includes(k) === keep) o[k] = v; return o; };
  const conf = x => { const o = pick(x, false); o.people = (Array.isArray(o.people) ? o.people : []).map(p => me && p && p.mid === me.mid ? { ...p, s: null, h: null, at: null } : p); return o; };
  if (!same(conf(L), conf(N))) return 'lock_admin';
  const text = !same((cur || {}).paras, (next || {}).paras) || !same(cur.meta.format, next.meta.format);
  const rest = x => { const o = { ...((x || {}).meta || {}) }; delete o.lock; delete o.format; return o; };
  if ((text || !same(pick(L, true), pick(N, true))) && !me) return 'lock_who';
  // el registro y las revisiones ya cerradas solo crecen (lo más viejo puede salir por el tope)
  // (antes se aceptaba quitar cualquier cantidad de lo más viejo: quien revisa podía dejar el registro en una sola línea).
  // Lo viejo solo puede salir cuando lo nuevo llega al tope (LOCK_CAP)
  const grows = (a, b, cap) => { a = Array.isArray(a) ? a : []; b = Array.isArray(b) ? b : []; if (!a.length) return true; if (!b.length) return false; const j = a.findIndex(x => bdCanon(x) === bdCanon(b[0])); if (j < 0 || a.length - j > b.length || !a.slice(j).every((x, k) => bdCanon(x) === bdCanon(b[k]))) return false; return j === 0 || b.length >= cap; };
  if (!grows(L.log, N.log, LOCK_CAP.log) || !grows(L.revs, N.revs, LOCK_CAP.revs)) return 'lock_log';
  if (text && !(L.rev || N.rev)) return 'lock_rev';
  if (!same(rest(cur), rest(next)) && !who.canEdit && !me) return 'no_edit';
  return null;
}
const LOCK_MSG = {
  no_edit: 'No tienes permiso para editar el guion.',
  lock_producer: 'Solo producción puede cerrar el guion.',
  lock_admin: 'Solo producción puede cambiar quién revisa el guion cerrado o reabrirlo.',
  lock_who: 'El guion está cerrado: solo las personas autorizadas pueden revisarlo.',
  lock_rev: 'El guion está cerrado: para cambiar el texto hay que abrir una revisión.',
  lock_log: 'El registro del guion cerrado no se puede borrar ni cambiar.',
};
if (typeof module !== 'undefined') module.exports = {
  SECS, SEC_DEPS, PRODUCER_ROLES, isProducer, SCRIPT_STAGE_ROLES, seesScriptStage, ALLP, cleanPerms, permReadSet, permCanEdit, permAreas, frameSec, FRAME_SECS,
  PLAN_KEYS, PLAN_TIER, PLAN_NAME, PLAN_DEFAULTS,
  GASTOS, GA_SECS, GA_ROLE_SECS, GA_PAY, GA_KIND, gaRole, gaSeesAll, gaAreaSecs, gaClean, gaView, gaCan, gaFilter, gaFrameItem, gaFrameOk, gaFrameEdit,
  BD_AREAS, bdAreaOfCat, bdCanon, bdFilter, bdViolates, scriptLockCheck, lockPerson, LOCK_MSG };
