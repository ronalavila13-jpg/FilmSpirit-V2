/* ============================================================
   API de proyectos
   Un proyecto = secciones (las pestañas de SEC_LIST) con su versión + imágenes.
   Los permisos se aplican aquí: cada quien lee solo lo que le toca y solo
   guarda lo que puede editar (en el desglose, solo sus áreas).
   Guardar una sección exige la versión de la que partió el cambio («base»):
   si otra persona guardó antes, responde 409 con la versión vigente y el
   navegador fusiona y vuelve a guardar.
   ============================================================ */
'use strict';
const { fail, sendJSON, readJSON, rateLimit, rid, now, normEmail, isEmail, parseCookies, sha256 } = require('./util');
const P = require('./perm');

const MB = 1024 * 1024;
const MAX_SEC = 12 * MB, MAX_CREATE = 40 * MB, MAX_FRAME = 8 * MB, MAX_BATCH = 24 * MB;
const KEY_RE = /^[\w.~-]{1,200}$/;
/* ancho y alto según la cabecera del archivo (PNG, JPEG, WebP), o null si no es lo que dice ser */
function imageSize(b, mime) {
  try {
    if (/png$/.test(mime)) return b.length > 24 && b.readUInt32BE(0) === 0x89504e47 && b.toString('latin1', 12, 16) === 'IHDR' ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null;
    if (/jpe?g$/.test(mime)) {
      if (b[0] !== 0xff || b[1] !== 0xd8) return null;
      for (let i = 2; i + 9 < b.length;) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1];
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7) || m === 0xff) { i += m === 0xff ? 1 : 2; continue; }
        const len = b.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
        i += 2 + len;
      }
      return null;
    }
    if (/webp$/.test(mime)) {
      if (b.length < 30 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP') return null;
      const f = b.toString('latin1', 12, 16);
      if (f === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
      if (f === 'VP8L') { const x = b.readUInt32LE(21); return { w: 1 + (x & 0x3fff), h: 1 + ((x >> 14) & 0x3fff) }; }
      if (f === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    }
  } catch (e) { }
  return null;
}
const DATA_RE = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
// modelos 3D importados (escenarios y personajes): gzip del formato propio de la app, que empieza con «FSM1»
const M3_RE = /^data:(model\/x-fsm);base64,([A-Za-z0-9+/]+={0,2})$/;
/* se revisa por partes, sin trabar el servidor (antes, gunzipSync lo dejaba detenido para todos) y sin guardar el modelo
   entero en memoria: solo el encabezado; el resto se cuenta (hasta 96 MB) para saber que el archivo está completo.
   Así varios modelos a la vez no llenan la memoria (descomprimidos enteros eran hasta 96 MB cada uno) */
const M3_RAW_MAX = 96 * 1024 * 1024, M3_HEAD_MAX = 16 * 1024 * 1024;
function m3Ok(b) {
  if (b.length < 20 || b[0] !== 0x1f || b[1] !== 0x8b) return Promise.resolve(false);
  return new Promise(resolve => {
    const z = require('node:zlib').createGunzip();
    const parts = [];
    let have = 0, need = 8, total = 0, done = false, head8 = null;
    const end = ok => { if (done) return; done = true; z.removeAllListeners('data'); z.on('error', () => { }); z.destroy(); resolve(ok); };
    z.on('data', c => {
      if (done) return;
      total += c.length;
      if (total > M3_RAW_MAX) return end(false);
      let off = 0;
      while (off < c.length && have < need) {
        const take = Math.min(need - have, c.length - off);
        parts.push(c.subarray(off, off + take)); have += take; off += take;
        if (need === 8 && have === 8) {
          head8 = Buffer.concat(parts);
          if (head8.toString('latin1', 0, 4) !== 'FSM1') return end(false);
          const n = head8.readUInt32LE(4);
          if (n < 2 || n > M3_HEAD_MAX) return end(false);
          need = 8 + n;
        }
      }
    });
    z.on('error', () => end(false));
    z.on('end', () => {
      if (done) return;
      if (!head8 || have < need) return end(false);
      try { const h = JSON.parse(Buffer.concat(parts).toString('utf8', 8, need)); end(!!(h && Array.isArray(h.parts))); } catch (e) { end(false); }
    });
    z.end(b);
  });
}
/* historial de cada sección: una copia de la versión anterior como mucho cada 5 minutos (antes, en cada guardado:
   mientras se escribía el guion se archivaba el guion entero cada 1,2 s y las 40 copias cubrían solo los últimos
   minutos). Al volver a editar después de una pausa se guarda la versión de antes de empezar. Si otra persona guarda
   encima de lo tuyo, tu versión se copia aunque no hayan pasado los 5 minutos (como mucho una vez por minuto: dos
   personas escribiendo a la vez no vuelven a copiar en cada guardado). */
const HIST_KEEP = 40, HIST_GAP = 5 * 60e3, HIST_GAP_OTHER = 60e3;
const SECNAME = { guion: 'Guion', desglose: 'Desglose', storyboard: 'Storyboard', animatic: 'Animatic', plan: 'Plan de rodaje', calendario: 'Calendario', llamado: 'Hoja de llamado', presupuesto: 'Presupuesto', hoja: 'Hoja de script', notas: 'Notas', gastos: 'Gastos' };
const MAX_GA_FRAME = 2 * MB;   // la foto de un recibo llega comprimida a unos 300 kB
const ACT_GAP = 180e3, ACT_KEEP = 3000;
const REF_RE = /^[a-z]+\|[a-z]{1,12}\|[\w:.~-]{0,100}$/;

function makeApi(S, auth, live, cfg) {
  const project = pid => typeof pid === 'string' && pid.length < 60 ? S.one('SELECT * FROM projects WHERE id=? AND deleted IS NULL', pid) : null;
  const userById = id => S.one('SELECT * FROM users WHERE id=?', id);
  /* más proyectos activos de los que permite el plan (al bajar de plan): siguen activos el elegido y los más
     recientes hasta el límite; los demás quedan en solo lectura. Los archivados no cuentan y siempre son de
     solo lectura. En cada proyecto entran solo las primeras personas del equipo que permite el plan. */
  const SWITCH_DAYS = 30;
  // los activos de una cuenta, de un tipo (guiones o proyectos de producción)
  const activeOwn = (uid, kind = 'prod') => S.all('SELECT id, updated FROM projects WHERE owner=? AND kind=? AND deleted IS NULL AND archived IS NULL ORDER BY updated DESC', uid, kind);
  function activeSet(owner, kind = 'prod') {
    const L = P.activeLimit(P.planOf(owner), kind), mine = activeOwn(owner.id, kind);
    if (mine.length <= L) return null;     // dentro del límite: todos activos
    if (L <= 0) return new Set();          // el plan no tiene de estos: todos en solo lectura (Guion con proyectos de producción)
    let pick = owner.free_pid && mine.some(x => x.id === owner.free_pid) ? owner.free_pid : null;
    if (!pick) {
      // elegido por el sistema (el más reciente): la persona puede cambiarlo una vez sin esperar
      pick = mine[0].id;
      S.run('UPDATE users SET free_pid=?, free_pid_ts=NULL WHERE id=?', pick, owner.id);
    }
    return new Set([pick, ...mine.filter(x => x.id !== pick).slice(0, L - 1).map(x => x.id)]);
  }
  function planState(p) {
    const owner = userById(p.owner);
    if (p.archived) return { owner, ro: true, why: 'archived' };
    const act = activeSet(owner, P.kindOf(p));
    return act && !act.has(p.id) ? { owner, ro: true, why: 'plan' } : { owner, ro: false, why: '' };
  }
  // en un guion solo se leen y guardan el guion y las notas
  const readable = (p, r, sec) => P.kindOf(p) === 'guion' ? P.SCRIPT_SECS.includes(sec) : P.canReadSec(r, sec);
  /* ---------- gastos: cada persona recibe y guarda solo lo suyo (areas.js · gaView y gaFilter) ---------- */
  const gaWho = (r, uid) => ({ ...r, uid });
  // las líneas del presupuesto (id, partida y nombre; sin montos): para saber de qué partida es cada gasto
  const budInfo = pid => { const s = S.one("SELECT json FROM sections WHERE pid=? AND sec='presupuesto'", pid); const b = (s && safeParse(s.json) || {}).budget || {};
    const rate = +b.igvRate, tax = { name: (typeof b.taxName === 'string' && b.taxName.trim().slice(0, 20)) || 'IGV', rate: isFinite(rate) && rate >= 0 && rate <= 100 ? rate : 18 };
    return { cur: typeof b.currency === 'string' ? b.currency : 'S/', tax, lines: Array.isArray(b.lines) ? b.lines.filter(l => l && typeof l === 'object').map(l => ({ id: String(l.id || ''), sec: String(l.sec || ''), name: String(l.name || '') })) : [] }; };
  const budLines = pid => budInfo(pid).lines;
  const gaCur = pid => { const s = S.one("SELECT json FROM sections WHERE pid=? AND sec='gastos'", pid); return s ? safeParse(s.json) : null; };
  const gaViewJson = (p, json, r, uid) => {
    const B = budInfo(p.id), v = P.gaView(json == null ? {} : typeof json === 'string' ? safeParse(json) : json, gaWho(r, uid), B.lines, B.cur);
    // quien ve todo Gastos pero no el presupuesto (p. ej. producción ejecutiva solo con «ver» en Gastos): las partidas sin
    // montos, la moneda y el impuesto (para el total de cada orden y los pagos)
    if (P.gaSeesAll(P.gaRole(r)) && !P.readSet(r).has('presupuesto')) { v.partidas = B.lines.filter(l => l.id).map(l => ({ id: l.id, sec: l.sec, name: l.name.slice(0, 120) })); v.moneda = B.cur; v.impuesto = B.tax; }
    return JSON.stringify(v);
  };
  /* lo que recibe cada persona de una sección: las notas que puede ver, su parte de Gastos y el guion sin Historia si no
     ve la etapa Guion (lote AD · perm.js · histHidden); lo demás, tal cual */
  const secView = (p, r, uid, sec, json) => json == null ? null : sec === P.NOTES ? P.notesView(json, r, P.histHidden(p, r)) : sec === P.GASTOS ? gaViewJson(p, json, r, uid) : sec === 'guion' ? P.guionView(json, P.histHidden(p, r)) : json;
  // ¿quién de los conectados ve todo Gastos? (los avisos con detalle van solo a ellos)
  const gaSeer = p => { const memo = new Map(); return c => { if (!memo.has(c.uid)) { const r = roleOf(p, c.uid); memo.set(c.uid, !!r && !r.suspended && P.gaSeesAll(P.gaRole(r))); } return memo.get(c.uid); }; };
  const gaPlanOk = p => !!P.PLANS[ownerPlan(p)].gastos;
  const GA_PLAN = 'Gastos (órdenes de compra, caja chica y reembolsos) es parte de FilmSpirit Pro y Studio.';
  // a quién se avisa que cambió una imagen: a quien puede ver su sección (en Gastos, a quien puede ver esa foto)
  const frameTo = (p, k, sec) => {
    if (sec !== P.GASTOS) return c => c.read.has(sec);
    const g = gaCur(p.id) || {}, memo = new Map();
    return c => { if (!memo.has(c.uid)) { const r = roleOf(p, c.uid); memo.set(c.uid, !!r && !r.suspended && P.gaFrameOk(g, gaWho(r, c.uid), k)); } return memo.get(c.uid); };
  };
  function roleOf(p, uid) {
    if (!p) return null;
    const ps = planState(p);
    if (p.owner === uid) return { admin: true, role: 'Producción', perms: P.ALLP, ro: ps.ro, why: ps.why };
    const m = S.one('SELECT role, perms, added FROM members WHERE pid=? AND uid=?', p.id, uid);
    if (!m) return null;
    const plan = P.planOf(ps.owner);
    const before = S.one('SELECT COUNT(*) n FROM members WHERE pid=? AND (added<? OR (added=? AND uid<?))', p.id, m.added, m.added, uid).n;
    if (before >= P.peopleLimit(plan, P.kindOf(p)) - 1) return { suspended: true, plan, kind: P.kindOf(p) };
    return { admin: false, role: m.role, perms: JSON.parse(m.perms || '{}'), ro: ps.ro, why: ps.why };
  }
  function access(pid, u) {
    const p = project(pid);
    if (!p) fail(404, 'Este proyecto ya no existe.', 'not_found');
    let r = roleOf(p, u.id);
    // invitación pendiente para su correo: abrir el proyecto (el enlace que le mandaron o la lista) es aceptarla
    if (!r && acceptInvite(p, u)) r = roleOf(p, u.id);
    if (!r) fail(403, 'No tienes acceso a este proyecto.', 'no_access');
    if (r.suspended) fail(403, r.kind === 'guion' ? `Un guion se escribe con hasta ${P.PLANS[r.plan].writers} personas y tú quedaste fuera. Pídele a quien lo creó que libere un lugar.`
      : P.peopleLimit(r.plan, 'prod') <= 1 ? `El plan ${P.PLAN_NAME[r.plan]} de este proyecto es para una sola persona y tú quedaste fuera. Pídele a producción que pase a Pro para trabajar en equipo.`
        : `El plan ${P.PLAN_NAME[r.plan]} de este proyecto permite ${P.peopleLimit(r.plan, 'prod')} personas y tú quedaste fuera. Pídele a producción que cambie de plan o que libere un lugar.`, 'plan_suspended');
    return { p, r };
  }
  function acceptInvite(p, u) {
    const i = S.one('SELECT * FROM invites WHERE pid=? AND email=?', p.id, u.email);
    if (!i || p.owner === u.id) return false;
    S.tx(() => {
      S.run('INSERT OR IGNORE INTO members(pid,uid,role,perms,added) VALUES(?,?,?,?,?)', p.id, u.id, i.role, i.perms, now());
      S.run('DELETE FROM invites WHERE pid=? AND email=?', p.id, u.email);
      S.run('DELETE FROM requests WHERE pid=? AND uid=?', p.id, u.id);
    });
    teamChanged(p.id);
    return true;
  }
  const roMsg = r => r.why === 'archived' ? 'Este proyecto está archivado: desarchívalo para editarlo.' : 'Este proyecto está en solo lectura: tu plan permite menos proyectos activos.';
  const ownerPlan = p => P.planOf(userById(p.owner));
  /* (lote AD) lo exclusivo de Studio: los mapas del scouting (los enlaces cortos que resuelve el servidor) y los
     escenarios 3D importados (sus modelos «m3~s~…» y sus plantas «m3p~…»). Va según el plan de quien es dueño del
     proyecto: si es Studio, todo su equipo los usa en él. Sin proyecto (uno nuevo que todavía no está en el servidor),
     según el plan de la cuenta, que será su dueña. Lo que un proyecto ya tiene se sigue viendo y se puede quitar */
  const STUDIO_MSG = {
    mapas: 'Los mapas del scouting son parte de FilmSpirit Studio. En este proyecto los habilita el plan de quien lo administra.',
    set3d: 'Importar escenarios 3D es parte de FilmSpirit Studio. En este proyecto lo habilita el plan de quien lo administra.',
  };
  const isStudioFrame = k => k.startsWith('m3~s~') || k.startsWith('m3p~');
  function studioOk(pid, u) {
    if (pid == null || pid === '') return P.planOf(u) === 'studio';
    const p = project(String(pid)); if (!p) return false;
    const r = roleOf(p, u.id);
    return !!r && !r.suspended && ownerPlan(p) === 'studio';
  }
  const teamCount = pid => S.one('SELECT (SELECT COUNT(*) FROM members WHERE pid=?) + (SELECT COUNT(*) FROM invites WHERE pid=?) n', pid, pid).n;
  // espacio de la cuenta: imágenes, secciones y su historial (todo cuenta para la cuota del plan). Lo eliminado también
  // cuenta mientras se guarda (30 días, por si hay que recuperarlo): antes, crear y eliminar en ciclo llenaba el disco.
  // Se recalcula a lo más una vez por minuto por cuenta; entre medio se suma lo que crece (antes cada guardado sumaba
  // de nuevo todo lo de la cuenta, y con mucho guardado eso trababa el servidor)
  const STORE = new Map();
  const storageScan = uid => S.one('SELECT COALESCE(SUM(f.bytes),0) b FROM frames f JOIN projects p ON p.id=f.pid WHERE p.owner=?', uid).b
    + S.one('SELECT COALESCE(SUM(LENGTH(s.json)),0) b FROM sections s JOIN projects p ON p.id=s.pid WHERE p.owner=?', uid).b
    + S.one('SELECT COALESCE(SUM(LENGTH(h.z)),0) b FROM history h JOIN projects p ON p.id=h.pid WHERE p.owner=?', uid).b;
  const storageOf = uid => { const c = STORE.get(uid), t = Date.now(); if (c && t - c.t < 60e3) return c.b; const b = storageScan(uid); STORE.set(uid, { b, t }); return b; };
  const storageAdd = (uid, d) => { const c = STORE.get(uid); if (c) c.b = Math.max(0, c.b + d); };
  setInterval(() => { const t = Date.now(); for (const [k, c] of STORE) if (t - c.t > 600e3) STORE.delete(k); }, 300e3).unref();
  const quotaMsg = 'Se llenó el espacio de la cuenta de este proyecto. Archiva o elimina proyectos que ya no uses, o pasa a un plan con más espacio. Lo que eliminas sigue ocupando espacio 30 días.';
  /* lecturas pesadas (el proyecto entero, una sección, imágenes): un tope de bytes por persona cada 5 minutos, que una
     cuenta no pueda trabar el servidor pidiendo lo mismo una y otra vez */
  const readCost = (u, bytes) => rateLimit('rd:' + u.id, 1.5e9, 300e3, bytes);

  /* «have»: las versiones que el navegador ya tiene guardadas (?have=guion.12,desglose.5). Al abrir el proyecto, esas
     secciones no se vuelven a enviar si siguen en la misma versión: va { v, same: 1, n } (n: su largo en bytes, para que
     el navegador compruebe su copia). Las notas y Gastos se envían siempre: cada persona recibe su propia vista. */
  const HAVE_RE = /^([a-z]{1,20})\.(\d{1,9})$/;
  function parseHave(str) {
    const out = {};
    for (const x of String(str || '').split(',').slice(0, 24)) {
      const m = HAVE_RE.exec(x);
      if (m && P.DATA_SECS.includes(m[1]) && m[1] !== P.NOTES && m[1] !== P.GASTOS) out[m[1]] = +m[2];
    }
    return out;
  }
  function state(p, u, r, full, have) {
    const kind = P.kindOf(p), script = kind === 'guion';
    const read = script ? new Set(['guion']) : P.readSet(r), owner = userById(p.owner), plan = P.planOf(owner);
    const perms = script ? { guion: r.admin ? 'editar' : (r.perms || {}).guion === 'editar' ? 'editar' : 'ver' } : r.admin ? P.ALLP : r.perms;
    const out = {
      pid: p.id, title: p.title, kind, admin: r.admin, perms, read: [...read], unavailable: [], readonly: r.ro ? r.why || 'plan' : '', archived: p.archived || null,
      me: { id: u.id, name: u.name, email: u.email, role: r.role }, vers: {},
      owner: { id: owner.id, name: owner.name }, ownerPlan: plan,
      limits: { members: P.peopleLimit(plan, kind), photos: !script && P.PLANS[plan].photos, gastos: !script && !!P.PLANS[plan].gastos, projects: P.PLANS[plan].projects, scripts: P.PLANS[plan].scripts, writers: P.PLANS[plan].writers },
    };
    if (full) out.sections = {};
    const hv = have || {}, hist = P.histHidden(p, r);
    for (const s of S.all('SELECT sec, v FROM sections WHERE pid=?', p.id)) {
      if (!readable(p, r, s.sec)) continue;
      out.vers[s.sec] = s.v;
      if (!full) continue;
      // el guion sin Historia (lote AD): el largo es el de lo que esta persona recibe, que es lo que tiene guardado
      if (hv[s.sec] === s.v) { out.sections[s.sec] = { v: s.v, same: 1, n: s.sec === 'guion' && hist ? Buffer.byteLength(P.guionView(S.one("SELECT json FROM sections WHERE pid=? AND sec='guion'", p.id).json, true)) : S.one('SELECT length(CAST(json AS BLOB)) n FROM sections WHERE pid=? AND sec=?', p.id, s.sec).n }; continue; }
      const json = S.one('SELECT json FROM sections WHERE pid=? AND sec=?', p.id, s.sec).json;
      out.sections[s.sec] = { json: secView(p, r, u.id, s.sec, json), v: s.v };
    }
    // gastos sin guardar todavía: vacío (versión 0), para que se pueda guardar el primero
    if (full && !script && !out.sections[P.GASTOS]) out.sections[P.GASTOS] = { json: gaViewJson(p, null, r, u.id), v: 0 };
    if (full) for (const s of P.DATA_SECS) if (!(s in out.sections) && (!script || P.SCRIPT_SECS.includes(s))) out.sections[s] = null;
    if (r.admin) {
      out.members = [{ id: owner.id, name: owner.name, email: owner.email, picture: owner.picture, role: 'Producción', perms: P.ALLP, owner: true },
        ...S.all('SELECT m.uid, m.role, m.perms, u.name, u.email, u.picture FROM members m JOIN users u ON u.id=m.uid WHERE m.pid=? ORDER BY m.added', p.id)
          .map(m => ({ id: m.uid, name: m.name, email: m.email, picture: m.picture, role: m.role, perms: JSON.parse(m.perms || '{}') })),
        ...S.all('SELECT * FROM invites WHERE pid=? ORDER BY added', p.id)
          .map(i => ({ id: 'inv:' + i.email, name: i.email, email: i.email, role: i.role, perms: JSON.parse(i.perms || '{}'), pending: true }))];
      out.requests = S.all(`SELECT r.uid, u.name, u.email, u.picture FROM requests r JOIN users u ON u.id=r.uid
        WHERE r.pid=? AND r.uid NOT IN (SELECT uid FROM members WHERE pid=?) ORDER BY r.ts`, p.id, p.id)
        .map(x => ({ id: x.uid, name: x.name, email: x.email, avatarUrl: x.picture }));
    }
    return out;
  }
  const evaluate = (p, uid) => { const r = roleOf(p, uid); return r && !r.suspended ? { read: P.kindOf(p) === 'guion' ? new Set(['guion']) : P.readSet(r), hist: P.histHidden(p, r) } : null; };
  // (lote AD) una nota en la pestaña Historia: quien no ve la etapa Guion no recibe su aviso ni la ve en la actividad
  const HIST_REF = 'guion|tab|build';
  const teamChanged = pid => { const p = project(pid); live.teamChanged(pid, c => p ? evaluate(p, c.uid) : null); };

  function parseSec(str, what) {
    if (typeof str !== 'string') fail(400, `Faltan los datos de ${what}.`, 'bad_section');
    if (str.length > MAX_SEC) fail(413, `«${what}» es demasiado grande para guardarse.`, 'too_large');
    if (P.jsonDepth(str) > P.MAX_DEPTH) fail(400, `Los datos de ${what} tienen demasiados niveles.`, 'bad_section');
    try { const v = JSON.parse(str); if (!v || typeof v !== 'object' || Array.isArray(v)) throw 0; return v; }
    catch (e) { fail(400, `Los datos de ${what} no son válidos.`, 'bad_section'); }
  }
  const safeParse = str => { try { const v = JSON.parse(str); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } };
  const NEED_PLAN = `Los proyectos de producción (desglose, storyboard, plan de rodaje, calendario, hoja de llamado y presupuesto) son de Indie, Pro y Studio. Para conocerlos sin pagar, explora el proyecto de ejemplo.`;
  const limitMsg = (plan, kind = 'prod') => kind === 'guion'
    ? `El plan Guion permite ${P.PLANS.free.scripts} guiones activos. Archiva uno que terminaste o pasa a Indie, Pro o Studio (guiones sin límite).`
    : plan === 'free' ? NEED_PLAN
      : plan === 'indie' ? `Tu plan Indie permite ${P.PLANS.indie.projects} proyectos de producción activos. Archiva uno que ya no uses o pasa a Pro (${P.PLANS.pro.projects}).`
        : plan === 'pro' ? `Tu plan Pro permite ${P.PLANS.pro.projects} proyectos de producción activos. Archiva uno que ya no uses o pasa a Studio (${P.PLANS.studio.projects}).`
          : `Tu plan permite ${P.PLANS[plan].projects} proyectos de producción activos a la vez. Archiva uno que ya no uses.`;
  const titleOf = g => String(g && g.meta && g.meta.title || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200);
  const SCRIPT_ONLY = 'Este proyecto es un guion: llévalo a producción (pestaña Proyecto) para usar el desglose, el storyboard y lo demás.';

  /* ---------- rutas ---------- */
  const routes = [];
  const on = (method, re, fn) => routes.push({ method, re, fn });

  on('GET', /^\/api\/projects$/, (req, res, u) => {
    const mine = S.all('SELECT p.id, p.title, p.updated, p.archived, p.kind, (SELECT COUNT(*) FROM members m WHERE m.pid=p.id) n FROM projects p WHERE p.owner=? AND p.deleted IS NULL', u.id)
      .map(x => ({ id: x.id, title: x.title, updated: x.updated, kind: P.kindOf(x), mine: true, shared: x.n > 0, role: 'Producción', archived: x.archived || null }));
    const theirs = S.all(`SELECT p.id, p.title, p.updated, p.archived, p.kind, m.role, u.name owner FROM members m JOIN projects p ON p.id=m.pid JOIN users u ON u.id=p.owner
      WHERE m.uid=? AND p.deleted IS NULL`, u.id).map(x => ({ id: x.id, title: x.title, updated: x.updated, kind: P.kindOf(x), mine: false, shared: true, role: x.role, owner: x.owner, archived: x.archived || null }));
    // invitaciones pendientes: se aceptan al abrir el proyecto o se rechazan
    const inv = S.all(`SELECT p.id, p.title, p.kind, i.added, i.role, u.name owner FROM invites i JOIN projects p ON p.id=i.pid JOIN users u ON u.id=p.owner
      WHERE i.email=? AND p.deleted IS NULL AND p.owner<>?`, u.email, u.id).map(x => ({ id: x.id, title: x.title, updated: x.added, kind: P.kindOf(x), mine: false, shared: true, role: x.role, owner: x.owner, archived: null, invited: true }));
    sendJSON(res, 200, [...inv, ...mine, ...theirs].sort((a, b) => (b.invited ? 1 : 0) - (a.invited ? 1 : 0) || b.updated - a.updated));
  });

  on('POST', /^\/api\/projects$/, async (req, res, u) => {
    rateLimit('np:' + u.id, 60, 3600e3);
    const b = await readJSON(req, MAX_CREATE);
    const plan = P.planOf(u), L = P.PLANS[plan];
    // guion o proyecto de producción; sin decirlo: lo que permite el plan (Guion, solo guiones)
    const kind = P.KINDS.includes(b.kind) ? b.kind : L.projects > 0 ? 'prod' : 'guion';
    if (kind === 'prod' && !L.projects) fail(403, NEED_PLAN, 'need_plan', { plan, kind });
    const lim = P.activeLimit(plan, kind), own = activeOwn(u.id, kind).length;
    if (own >= lim) fail(403, limitMsg(plan, kind), kind === 'guion' ? 'limit_scripts' : 'limit_projects', { limit: lim, plan, kind });
    if (lim !== Infinity) {
      const saved = S.one('SELECT COUNT(*) n FROM projects WHERE owner=? AND kind=? AND deleted IS NULL', u.id, kind).n;
      if (saved >= lim + L.archived) fail(403, `Llegaste al máximo de ${kind === 'guion' ? 'guiones' : 'proyectos'} guardados de tu plan (${lim + L.archived}, contando los archivados). Elimina los archivados que ya no necesites.`, 'limit_saved', { limit: lim + L.archived, plan, kind });
    } else if (S.one('SELECT COUNT(*) n FROM projects WHERE owner=? AND deleted IS NULL', u.id).n >= 2000) fail(403, 'Llegaste al máximo de proyectos guardados en una cuenta. Elimina los que ya no necesites.', 'limit_saved', { limit: 2000, plan, kind });
    const secs = b.sections && typeof b.sections === 'object' ? b.sections : {};
    const parsed = {};
    // gastos no se crea con el proyecto: empieza vacío y lo llena producción (con sus reglas)
    for (const [s, str] of Object.entries(secs)) { if (!P.DATA_SECS.includes(s) || s === P.GASTOS || (kind === 'guion' && !P.SCRIPT_SECS.includes(s))) continue; parsed[s] = parseSec(str, SECNAME[s]); }
    const bytes = Object.keys(parsed).reduce((n, s) => n + secs[s].length, 0);
    if (storageOf(u.id) + bytes > L.storageMB * MB) fail(413, quotaMsg, 'quota');
    const pid = 'p' + rid(12), t = now();
    // las notas del proyecto nuevo son de quien lo crea
    if (parsed[P.NOTES]) secs[P.NOTES] = P.notesMerge(null, parsed[P.NOTES], u, { admin: true, role: 'Producción', perms: P.ALLP }, t);
    const title = titleOf(parsed.guion) || String(b.title || '').trim().slice(0, 200) || 'Proyecto sin título';
    S.tx(() => {
      S.run('INSERT INTO projects(id,owner,title,created,updated,kind) VALUES(?,?,?,?,?,?)', pid, u.id, title, t, t, kind);
      for (const s of Object.keys(parsed)) S.run('INSERT INTO sections(pid,sec,v,json,by,client,ts) VALUES(?,?,?,?,?,?,?)', pid, s, 1, secs[s], u.id, String(b.c || '').slice(0, 40), t);
    });
    storageAdd(u.id, bytes);
    const p = project(pid);
    sendJSON(res, 201, state(p, u, roleOf(p, u.id), false));
  });

  on('GET', /^\/api\/p\/([\w-]+)$/, (req, res, u, m, url) => {
    const { p, r } = access(m[1], u), full = url.searchParams.get('full') === '1';
    const have = full ? parseHave(url.searchParams.get('have')) : null;
    // lo que de verdad se envía (lo que el navegador ya tiene no cuenta)
    if (full) readCost(u, S.all('SELECT sec, v, LENGTH(json) n FROM sections WHERE pid=?', p.id).reduce((b, s) => b + (have[s.sec] === s.v ? 0 : s.n), 0));
    sendJSON(res, 200, state(p, u, r, full, have));
  });

  on('DELETE', /^\/api\/p\/([\w-]+)$/, (req, res, u, m) => {
    const { p, r } = access(m[1], u);
    if (!r.admin) fail(403, 'Solo producción puede eliminar el proyecto.', 'not_admin');
    S.run('UPDATE projects SET deleted=? WHERE id=?', now(), p.id);
    live.closeAll(p.id, { t: 'deleted' });
    sendJSON(res, 200, { ok: true });
  });

  on('POST', /^\/api\/p\/([\w-]+)\/leave$/, (req, res, u, m) => {
    const { p, r } = access(m[1], u);
    if (r.admin) fail(400, 'Eres quien administra este proyecto: no puedes salir de él.', 'is_owner');
    S.run('DELETE FROM members WHERE pid=? AND uid=?', p.id, u.id);
    teamChanged(p.id);
    sendJSON(res, 200, { ok: true });
  });

  /* rechazar una invitación (o quitarla de la lista) */
  on('POST', /^\/api\/p\/([\w-]+)\/decline$/, (req, res, u, m) => {
    const p = project(m[1]);
    if (p) { S.run('DELETE FROM invites WHERE pid=? AND email=?', p.id, u.email); teamChanged(p.id); }
    sendJSON(res, 200, { ok: true });
  });

  /* pedir acceso a un proyecto (por ejemplo, al abrir un enlace sin estar en el equipo) */
  on('POST', /^\/api\/p\/([\w-]+)\/request$/, (req, res, u, m) => {
    rateLimit('rq:' + u.id, 30, 3600e3);
    const p = project(m[1]);
    if (p && !roleOf(p, u.id)) {
      S.run('INSERT OR REPLACE INTO requests(pid,uid,ts) VALUES(?,?,?)', p.id, u.id, now());
      live.broadcast(p.id, { t: 'request' }, c => c.uid === p.owner);
    }
    sendJSON(res, 200, { ok: true });
  });

  /* ---------- secciones ---------- */
  on('GET', /^\/api\/p\/([\w-]+)\/s\/(\w+)$/, (req, res, u, m) => {
    const { p, r } = access(m[1], u), sec = m[2];
    if (!P.DATA_SECS.includes(sec)) fail(404, 'Sección desconocida.', 'not_found');
    if (!readable(p, r, sec)) fail(403, P.kindOf(p) === 'guion' ? SCRIPT_ONLY : `No tienes acceso a «${SECNAME[sec]}».`, P.kindOf(p) === 'guion' ? 'script_only' : 'no_read');
    const s = S.one('SELECT v, json, by FROM sections WHERE pid=? AND sec=?', p.id, sec);
    if (s) readCost(u, s.json.length);
    if (sec === P.GASTOS) return sendJSON(res, 200, { v: s ? s.v : 0, json: gaViewJson(p, s ? s.json : null, r, u.id), by: s && P.gaSeesAll(P.gaRole(r)) ? (userById(s.by) || {}).name || '' : '' });
    sendJSON(res, 200, s ? { v: s.v, json: secView(p, r, u.id, sec, s.json), by: (userById(s.by) || {}).name || '' } : { v: 0, json: null });
  });

  on('PUT', /^\/api\/p\/([\w-]+)\/s\/(\w+)$/, async (req, res, u, m) => {
    const { p, r } = access(m[1], u), sec = m[2];
    if (!P.DATA_SECS.includes(sec)) fail(404, 'Sección desconocida.', 'not_found');
    if (P.kindOf(p) === 'guion' && !P.SCRIPT_SECS.includes(sec)) fail(403, SCRIPT_ONLY, 'script_only');
    if (r.ro) fail(403, roMsg(r), 'read_only');
    // primero el cuerpo y después lo guardado: desde aquí hasta escribir no hay más esperas, así nadie guarda en medio
    // (antes se leía lo guardado, se esperaba el cuerpo y dos guardados casi a la vez respondían «listo» y uno se perdía)
    if (!P.canEditData(r, sec) && sec !== 'guion') fail(403, `No tienes permiso para editar «${SECNAME[sec]}».`, 'no_edit');
    const b = await readJSON(req, MAX_SEC + 4096);
    const cur = S.one('SELECT v, json, by FROM sections WHERE pid=? AND sec=?', p.id, sec);
    // guion cerrado: quien producción autorizó a revisarlo guarda el guion aunque su permiso sea «ver»
    const curG = sec === 'guion' && cur ? safeParse(cur.json) : null;
    if (!P.canEditData(r, sec) && !(curG && P.lockPerson(curG, u.id))) fail(403, `No tienes permiso para editar «${SECNAME[sec]}».`, 'no_edit');
    let json = b.json;
    const val = parseSec(json, SECNAME[sec]);
    const curV = cur ? cur.v : 0;
    const notes = sec === P.NOTES, gastos = sec === P.GASTOS, view = j => secView(p, r, u.id, sec, j), hist = P.histHidden(p, r);
    if (gastos && !gaPlanOk(p)) fail(403, GA_PLAN, 'plan_gastos');
    if (+b.base !== curV) return sendJSON(res, 409, { error: 'Otra persona guardó antes.', code: 'conflict', v: curV, json: cur ? view(cur.json) : null, by: cur ? (userById(cur.by) || {}).name || '' : '' });
    // guion cerrado: solo con una revisión abierta y por las personas autorizadas; reabrir y cambiar quiénes, producción
    if (sec === 'guion') {
      const err = P.scriptLockCheck(curG || {}, val, { id: u.id, owner: !!r.admin, producer: P.PRODUCER_ROLES.includes(r.role), canEdit: P.canEdit(r, 'guion') });
      if (err) fail(err === 'no_edit' ? 403 : 423, P.LOCK_MSG[err] || 'El guion está cerrado.', err);
    }
    let filtered = false;
    if (gastos) {
      // cada quien solo cambia lo que le toca (aprobar, pagar, revisar, anular… según su papel); lo que no ve queda igual
      const was = cur ? safeParse(cur.json) : null, g = P.gaFilter(was || {}, val, gaWho(r, u.id), { t: now(), name: u.name || u.email, lines: budLines(p.id) });
      if (P.canonJ(g) === P.canonJ(was || P.gaClean({}))) return sendJSON(res, 200, { v: curV, json: view(cur ? cur.json : null) });
      const full = JSON.stringify(g);
      json = full;
      filtered = P.canonJ(JSON.parse(view(full))) !== P.canonJ(val);
    }
    if (notes) {
      // cada quien solo cambia lo suyo; lo que no ve queda igual
      const full = P.notesMerge(cur ? cur.json : null, val, u, r, now(), hist);
      if (cur && P.canonJ(JSON.parse(full)) === P.canonJ(JSON.parse(cur.json))) return sendJSON(res, 200, { v: curV, json: view(cur.json) });
      json = full;
      filtered = P.canonJ(JSON.parse(view(full))) !== P.canonJ(val);
    }
    // quien no ve Historia (lote AD): guarda el guion con la Historia vigente (que no la tenga no es que la borró)
    if (sec === 'guion' && hist) {
      const g = P.guionKeepHist(cur ? cur.json : null, val);
      if (P.canonJ(g) !== P.canonJ(val)) { json = JSON.stringify(g); filtered = P.canonJ(JSON.parse(view(json))) !== P.canonJ(val); }
    }
    // jefe de área: solo se guarda lo que cae en sus cajas del desglose
    const ar = sec === 'desglose' ? P.areasOf(r) : null;
    if (ar) {
      const f = P.bdCanon(P.bdFilter(cur ? JSON.parse(cur.json) : {}, val, ar));
      if (f !== P.bdCanon(val)) { json = f; filtered = true; }
    }
    // cuota: lo que crece cuenta (guardar algo igual o más chico siempre se puede)
    const grow = json.length - (cur ? cur.json.length : 0);
    if (grow > 0 && storageOf(p.owner) + grow > P.PLANS[ownerPlan(p)].storageMB * MB) fail(413, quotaMsg, 'quota');
    const v = curV + 1, t = now();
    let act = null, snap = false;
    S.tx(() => {
      const last = cur ? S.one('SELECT ts FROM history WHERE pid=? AND sec=? ORDER BY v DESC LIMIT 1', p.id, sec) : null;
      if (cur && (!last || t - last.ts >= HIST_GAP || (cur.by !== u.id && t - last.ts >= HIST_GAP_OTHER))) {
        snap = true;
        S.run('INSERT OR REPLACE INTO history(pid,sec,v,z,by,ts) VALUES(?,?,?,?,?,?)', p.id, sec, cur.v, S.gz(cur.json), cur.by, t);
        // las HIST_KEEP copias más recientes (las versiones guardadas ya no son seguidas: se cuentan las filas)
        S.run('DELETE FROM history WHERE pid=? AND sec=? AND v < (SELECT MIN(v) FROM (SELECT v FROM history WHERE pid=? AND sec=? ORDER BY v DESC LIMIT ?))', p.id, sec, p.id, sec, HIST_KEEP);
      }
      S.run('INSERT OR REPLACE INTO sections(pid,sec,v,json,by,client,ts) VALUES(?,?,?,?,?,?,?)', p.id, sec, v, json, u.id, String(b.c || '').slice(0, 40), t);
      if (sec === 'guion') S.run('UPDATE projects SET updated=?, title=? WHERE id=?', t, titleOf(val) || p.title, p.id);
      else S.run('UPDATE projects SET updated=? WHERE id=?', t, p.id);
      act = logActivity(p, u, sec, b, t);
    });
    storageAdd(p.owner, json.length - (cur ? cur.json.length : 0) + (snap ? Math.round(cur.json.length / 4) : 0));   // + la versión anterior si pasó al historial (comprimida, aprox.)
    // el aviso dice quién cambió qué; lo recibe quien puede ver la pestaña (y, en una nota, la pestaña donde está pegada)
    const refSec = act.ref ? act.ref.split('|')[0] : '';
    if (gastos) {
      // el detalle (quién, qué) solo a quien ve todo Gastos; a los demás, que hay una versión nueva (piden la suya)
      const sees = gaSeer(p);
      live.broadcast(p.id, { t: 'sec', sec, v, by: u.name, uid: u.id, what: act.what, ref: act.ref, aid: act.id || 0, aj: act.joined ? 1 : 0, ts: t, c: String(b.c || '') }, c => sees(c));
      live.broadcast(p.id, { t: 'sec', sec, v, c: String(b.c || '') }, c => !sees(c));
    } else live.broadcast(p.id, { t: 'sec', sec, v, by: u.name, uid: u.id, what: act.what, ref: act.ref, aid: act.id || 0, aj: act.joined ? 1 : 0, ts: t, c: String(b.c || '') },
      c => (notes || c.read.has(sec)) && (!refSec || c.read.has(refSec)) && !(c.hist && act.ref === HIST_REF));
    sendJSON(res, 200, filtered ? { v, json: view(json) } : { v });
  });

  /* ---------- imágenes (dibujos del storyboard y fotos del desglose) ---------- */
  on('GET', /^\/api\/p\/([\w-]+)\/frames$/, (req, res, u, m) => {
    const { p, r } = access(m[1], u), read = P.readSet(r);
    const out = {};
    if (P.kindOf(p) === 'guion') return sendJSON(res, 200, out);
    let ga;     // las fotos de Gastos: cada quien las suyas
    const okFrame = k => P.frameSec(k) === P.GASTOS ? P.gaFrameOk(ga === undefined ? (ga = gaCur(p.id) || {}) : ga, gaWho(r, u.id), k) : read.has(P.frameSec(k));
    for (const f of S.all('SELECT k, v FROM frames WHERE pid=?', p.id)) if (okFrame(f.k)) out[f.k] = f.v;
    sendJSON(res, 200, out);
  });
  on('POST', /^\/api\/p\/([\w-]+)\/frames\/get$/, async (req, res, u, m) => {
    const { p, r } = access(m[1], u), read = P.kindOf(p) === 'guion' ? new Set() : P.readSet(r);
    let ga;
    const okFrame = k => P.frameSec(k) === P.GASTOS ? P.kindOf(p) !== 'guion' && P.gaFrameOk(ga === undefined ? (ga = gaCur(p.id) || {}) : ga, gaWho(r, u.id), k) : read.has(P.frameSec(k));
    const b = await readJSON(req, 64 * 1024);
    const keys = Array.isArray(b.keys) ? b.keys.filter(k => typeof k === 'string' && KEY_RE.test(k)).slice(0, 400) : [];
    const out = {}; let size = 0, more = [];
    for (const k of keys) {
      if (size > MAX_BATCH) { more.push(k); continue; }
      if (!okFrame(k)) continue;
      const f = S.one('SELECT v, mime, data FROM frames WHERE pid=? AND k=?', p.id, k);
      if (!f) continue;
      const url = `data:${f.mime};base64,${Buffer.from(f.data).toString('base64')}`;
      size += url.length; out[k] = { v: f.v, u: url };
    }
    readCost(u, size);
    sendJSON(res, 200, { frames: out, more });
  });
  on('PUT', /^\/api\/p\/([\w-]+)\/f$/, async (req, res, u, m) => {
    const { p, r } = access(m[1], u);
    const b = await readJSON(req, MAX_FRAME * 1.4 + 4096);
    const k = String(b.k || '');
    if (!KEY_RE.test(k)) fail(400, 'Imagen con nombre inválido.', 'bad_key');
    const sec = P.frameSec(k), ga = sec === P.GASTOS;
    if (P.kindOf(p) === 'guion') fail(403, SCRIPT_ONLY, 'script_only');
    if (r.ro) fail(403, roMsg(r), 'read_only');
    // fotos de Gastos (recibos, órdenes de compra, reembolsos): de Pro y Studio, y cada quien las de lo suyo
    if (ga && !gaPlanOk(p)) fail(403, GA_PLAN, 'plan_gastos');
    if (ga && !P.gaFrameEdit(gaCur(p.id) || {}, gaWho(r, u.id), k)) fail(403, 'No puedes cambiar esta foto: el gasto es de otra persona o ya se revisó.', 'no_edit');
    if (!ga && !P.canEdit(r, sec)) fail(403, `No tienes permiso para guardar imágenes ${sec === 'desglose' ? (k.startsWith('ca~') ? 'del casting' : 'del desglose') : sec === 'plan' ? 'del scouting' : sec === 'llamado' ? 'de la hoja de llamado' : 'del storyboard'}.`, 'no_edit');
    const ar = sec === 'desglose' ? P.areasOf(r) : null;
    if (ar) {
      const d = S.one("SELECT json FROM sections WHERE pid=? AND sec='desglose'", p.id);
      const el = d ? (JSON.parse(d.json).elements || {})[k.split('~')[1]] : null;
      if (el && !ar.includes(P.bdAreaOfCat(el.cat))) fail(403, 'Solo puedes agregar fotos en tus áreas del desglose.', 'no_area');
    }
    const t = now();
    if (b.url == null) {
      const del = S.run('DELETE FROM frames WHERE pid=? AND k=?', p.id, k);
      if (del.changes) STORE.delete(p.owner);
      if (del.changes) live.broadcast(p.id, { t: 'frame', k, v: 0, c: String(b.c || '') }, frameTo(p, k, sec));
      return sendJSON(res, 200, { v: 0 });
    }
    // fotos del desglose, del casting, del scouting y del punto de encuentro: de Pro y Studio
    if ((sec === 'desglose' || k.startsWith('lc~') || k.startsWith('cl~')) && !P.PLANS[ownerPlan(p)].photos) fail(403, `Las fotos ${k.startsWith('ca~') ? 'del casting' : k.startsWith('lc~') ? 'del scouting' : k.startsWith('cl~') ? 'del punto de encuentro' : 'en el desglose'} son parte de FilmSpirit Pro y Studio.`, 'plan_photos');
    const m3 = k.startsWith('m3~');
    if (m3 && !P.PLANS[ownerPlan(p)].photos) fail(403, 'Los modelos 3D importados son de los planes Indie, Pro y Studio.', 'plan_photos');
    if (isStudioFrame(k) && ownerPlan(p) !== 'studio') fail(403, STUDIO_MSG.set3d, 'plan_studio');
    const mm = (m3 ? M3_RE : DATA_RE).exec(typeof b.url === 'string' ? b.url : '');
    if (!mm) fail(400, m3 ? 'El modelo 3D no tiene un formato válido.' : 'La imagen no tiene un formato válido (PNG, JPEG o WebP).', 'bad_image');
    const data = Buffer.from(mm[2], 'base64');
    if (data.length > (ga ? MAX_GA_FRAME : MAX_FRAME)) fail(413, m3 ? 'El modelo 3D es demasiado grande (máximo 8 MB).' : 'La imagen es demasiado grande.', 'too_large');
    if (m3) { if (!(await m3Ok(data))) fail(400, 'El modelo 3D no tiene un formato válido.', 'bad_image'); }
    else {
      // que sea de verdad una imagen del tipo que dice y de un tamaño razonable (una «bomba» de pocos KB y
      // cientos de megapíxeles colgaría el navegador de quien la abre)
      const dim = imageSize(data, mm[1]);
      if (!dim) fail(400, 'La imagen no tiene un formato válido (PNG, JPEG o WebP).', 'bad_image');
      if (dim.w > 12000 || dim.h > 12000 || dim.w * dim.h > 40e6) fail(400, 'La imagen tiene demasiados píxeles (máximo 40 megapíxeles).', 'bad_image');
    }
    const limit = P.PLANS[ownerPlan(p)].storageMB * MB;
    const old = S.one('SELECT v, bytes FROM frames WHERE pid=? AND k=?', p.id, k);
    if (storageOf(p.owner) - (old ? old.bytes : 0) + data.length > limit) fail(413, quotaMsg, 'quota');
    const v = (old ? old.v : 0) + 1;
    S.run('INSERT OR REPLACE INTO frames(pid,k,v,mime,data,bytes,by,ts) VALUES(?,?,?,?,?,?,?,?)', p.id, k, v, mm[1], data, data.length, u.id, t);
    storageAdd(p.owner, data.length - (old ? old.bytes : 0));
    S.run('UPDATE projects SET updated=? WHERE id=?', t, p.id);
    live.broadcast(p.id, { t: 'frame', k, v, c: String(b.c || '') }, frameTo(p, k, sec));
    sendJSON(res, 200, { v });
  });

  /* ---------- equipo ---------- */
  on('PUT', /^\/api\/p\/([\w-]+)\/team$/, async (req, res, u, m) => {
    const { p, r } = access(m[1], u);
    if (!r.admin) fail(403, 'Solo producción administra el equipo.', 'not_admin');
    const b = await readJSON(req, 256 * 1024);
    const list = Array.isArray(b.list) ? b.list.slice(0, 200) : [];
    const owner = userById(p.owner), plan = P.planOf(owner), kind = P.kindOf(p), maxPeople = P.peopleLimit(plan, kind);
    const added = [], before = teamCount(p.id);
    S.tx(() => {
      for (const c of list) {
        if (!c || typeof c !== 'object') continue;
        // en un guion se coescribe: solo el guion (editar o ver)
        const cp = P.cleanPerms(c.perms), role = P.cleanRole(c.role), perms = JSON.stringify(kind === 'guion' ? { guion: cp.guion === 'ver' ? 'ver' : 'editar' } : cp);
        if (c.add) {
          const email = normEmail(c.email);
          if (!isEmail(email)) fail(400, `«${String(c.email || '').slice(0, 80)}» no parece un correo válido.`, 'bad_email');
          if (email === owner.email) continue;
          const who = S.one('SELECT * FROM users WHERE email=?', email);
          // se agrega directo solo a quien pidió entrar; a los demás les llega una invitación que aceptan al abrir el
          // proyecto. Así nadie aparece en un proyecto ajeno sin querer, y la respuesta no revela si el correo tiene
          // cuenta ni su nombre de Google
          const asked = who && S.one('SELECT 1 x FROM requests WHERE pid=? AND uid=?', p.id, who.id);
          if (who && asked) {
            S.run('INSERT INTO members(pid,uid,role,perms,added) VALUES(?,?,?,?,?) ON CONFLICT(pid,uid) DO UPDATE SET role=excluded.role, perms=excluded.perms', p.id, who.id, role, perms, now());
            S.run('DELETE FROM requests WHERE pid=? AND uid=?', p.id, who.id);
            S.run('DELETE FROM invites WHERE pid=? AND email=?', p.id, email);
            added.push({ email, name: who.name, pending: false });
          } else {
            S.run('INSERT INTO invites(pid,email,role,perms,added,by) VALUES(?,?,?,?,?,?) ON CONFLICT(pid,email) DO UPDATE SET role=excluded.role, perms=excluded.perms', p.id, email, role, perms, now(), u.id);
            added.push({ email, name: email, pending: true });
          }
          continue;
        }
        const id = String(c.id || '');
        if (id.startsWith('inv:')) {
          const email = normEmail(id.slice(4));
          if (c.remove) S.run('DELETE FROM invites WHERE pid=? AND email=?', p.id, email);
          else {
            const cur = S.one('SELECT * FROM invites WHERE pid=? AND email=?', p.id, email);
            if (cur) S.run('UPDATE invites SET role=?, perms=? WHERE pid=? AND email=?', c.role != null ? role : cur.role, c.perms ? perms : cur.perms, p.id, email);
          }
          continue;
        }
        if (id === p.owner) continue;
        if (c.remove) { S.run('DELETE FROM members WHERE pid=? AND uid=?', p.id, id); continue; }
        if (c.dismiss) { S.run('DELETE FROM requests WHERE pid=? AND uid=?', p.id, id); continue; }
        const cur = S.one('SELECT * FROM members WHERE pid=? AND uid=?', p.id, id);
        if (cur) S.run('UPDATE members SET role=?, perms=? WHERE pid=? AND uid=?', c.role != null ? role : cur.role, c.perms ? perms : cur.perms, p.id, id);
      }
      const after = teamCount(p.id);
      if (after > maxPeople - 1 && after > before) fail(403, kind === 'guion'
        ? `Un guion se escribe con hasta ${maxPeople} personas, contándote a ti.`
        : maxPeople <= 1 ? `Tu plan ${P.PLAN_NAME[plan]} es para una sola persona. Para trabajar en equipo, pasa a Pro (hasta ${P.PLANS.pro.members} personas por proyecto).`
          : plan === 'pro' ? `Tu plan Pro permite ${maxPeople} personas por proyecto, contándote a ti. Con Studio, hasta ${P.PLANS.studio.members}.`
            : `Un proyecto puede tener hasta ${maxPeople} personas, contándote a ti.`, 'limit_members', { limit: maxPeople, plan, kind });
    });
    teamChanged(p.id);
    sendJSON(res, 200, { state: state(p, u, r, false), added });
  });

  /* más proyectos que los del plan: elegir cuál sigue activo (una vez cada 30 días) */
  on('POST', /^\/api\/p\/([\w-]+)\/activate$/, (req, res, u, m) => {
    const { p, r } = access(m[1], u);
    if (!r.admin) fail(403, 'Solo producción puede elegir el proyecto activo.', 'not_admin');
    if (p.archived) fail(400, 'Primero desarchiva el proyecto.', 'archived');
    const me = userById(u.id), act = activeSet(me, P.kindOf(p));
    if (!act || act.has(p.id)) return sendJSON(res, 200, { ok: true });
    if (!P.activeLimit(P.planOf(me), P.kindOf(p))) fail(403, limitMsg(P.planOf(me), P.kindOf(p)), 'need_plan', { plan: P.planOf(me) });
    if (me.free_pid_ts && now() - me.free_pid_ts < SWITCH_DAYS * 864e5) {
      const d = new Date(me.free_pid_ts + SWITCH_DAYS * 864e5);
      fail(403, `Puedes cambiar tu proyecto activo una vez cada ${SWITCH_DAYS} días. El próximo cambio: ${d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}.`, 'switch_wait');
    }
    S.run('UPDATE users SET free_pid=?, free_pid_ts=? WHERE id=?', p.id, now(), u.id);
    for (const x of activeOwn(u.id, P.kindOf(p))) teamChanged(x.id);
    sendJSON(res, 200, { ok: true });
  });

  /* archivar: el proyecto queda en solo lectura (se puede ver y exportar) y no cuenta para el límite del plan */
  on('POST', /^\/api\/p\/([\w-]+)\/archive$/, async (req, res, u, m) => {
    const { p, r } = access(m[1], u);
    if (!r.admin) fail(403, 'Solo producción puede archivar el proyecto.', 'not_admin');
    const b = await readJSON(req, 1024);
    if (b.archived === false) {
      if (!p.archived) return sendJSON(res, 200, { ok: true, archived: null });
      const plan = P.planOf(userById(u.id)), kind = P.kindOf(p), L = P.activeLimit(plan, kind);
      if (activeOwn(u.id, kind).length >= L) fail(403, limitMsg(plan, kind), !L ? 'need_plan' : kind === 'guion' ? 'limit_scripts' : 'limit_projects', { limit: L, plan, kind });
      S.run('UPDATE projects SET archived=NULL, updated=? WHERE id=?', now(), p.id);
    } else if (!p.archived) S.run('UPDATE projects SET archived=? WHERE id=?', now(), p.id);
    for (const x of S.all('SELECT id FROM projects WHERE owner=? AND deleted IS NULL', u.id)) teamChanged(x.id);
    const after = project(p.id);
    sendJSON(res, 200, { ok: true, archived: after.archived || null, me: auth.userJSON(userById(u.id)) });
  });

  /* llevar un guion a producción: pasa a ser un proyecto de producción (cuenta en los proyectos del plan) */
  on('POST', /^\/api\/p\/([\w-]+)\/produce$/, (req, res, u, m) => {
    const { p, r } = access(m[1], u);
    if (!r.admin) fail(403, 'Solo quien creó el guion puede llevarlo a producción.', 'not_admin');
    if (p.archived) fail(400, 'Primero desarchiva el guion.', 'archived');
    if (P.kindOf(p) === 'prod') return sendJSON(res, 200, { ok: true, kind: 'prod' });
    const me = userById(u.id), plan = P.planOf(me), L = P.PLANS[plan];
    if (!L.projects) fail(403, NEED_PLAN, 'need_plan', { plan });
    if (activeOwn(u.id, 'prod').length >= L.projects) fail(403, limitMsg(plan, 'prod'), 'limit_projects', { limit: L.projects, plan, kind: 'prod' });
    S.run("UPDATE projects SET kind='prod', updated=? WHERE id=?", now(), p.id);
    // quienes coescribían siguen en el equipo con el guion; lo demás lo asigna producción
    teamChanged(p.id);
    const q = project(p.id), over = Math.max(0, teamCount(p.id) - (P.peopleLimit(plan, 'prod') - 1));
    sendJSON(res, 200, { ok: true, kind: 'prod', over, state: state(q, u, roleOf(q, u.id), false), me: auth.userJSON(userById(u.id)) });
  });

  /* ---------- actividad: quién cambió qué y cuántos cambios lleva cada persona ----------
     «what» lo describe el navegador de quien guarda («cambió el plano 1.2»); «ref», a qué cosa se refiere
     (sección|tipo|id), para ir a verla. Los guardados seguidos de lo mismo (3 min) cuentan como un cambio. */
  function logActivity(p, u, sec, b, t) {
    const what = P.cleanText(b && b.what, 160).replace(/\s+/g, ' ').trim();
    const ref = typeof (b && b.ref) === 'string' && REF_RE.test(b.ref) && (P.SECS.includes(b.ref.split('|')[0]) || b.ref.split('|')[0] === P.GASTOS) ? b.ref : '';
    const last = S.one('SELECT id, sec, what, ref, ts FROM activity WHERE pid=? AND uid=? ORDER BY id DESC LIMIT 1', p.id, u.id);
    if (last && last.sec === sec && last.what === what && last.ref === ref && t - last.ts < ACT_GAP) {
      S.run('UPDATE activity SET n=n+1, ts=? WHERE id=?', t, last.id);
      S.run('UPDATE act_count SET last=? WHERE pid=? AND uid=?', t, p.id, u.id);
      return { what, ref, id: last.id, joined: true };
    }
    const note = sec === P.NOTES;
    const id = Number(S.run('INSERT INTO activity(pid,uid,sec,what,ref,ts) VALUES(?,?,?,?,?,?)', p.id, u.id, sec, what, ref, t).lastInsertRowid);
    S.run('INSERT INTO act_count(pid,uid,n,c,last) VALUES(?,?,?,?,?) ON CONFLICT(pid,uid) DO UPDATE SET n=n+excluded.n, c=c+excluded.c, last=excluded.last', p.id, u.id, note ? 0 : 1, note ? 1 : 0, t);
    if (id % 200 === 0) S.run('DELETE FROM activity WHERE pid=? AND id < (SELECT MIN(id) FROM (SELECT id FROM activity WHERE pid=? ORDER BY id DESC LIMIT ?))', p.id, p.id, ACT_KEEP);
    return { what, ref, id };
  }
  on('GET', /^\/api\/p\/([\w-]+)\/activity$/, (req, res, u, m, url) => {
    const { p, r } = access(m[1], u);
    // lo de Gastos (quién aprobó, pagó o rindió qué), solo para quien ve todo Gastos
    const gaAll = P.gaSeesAll(P.gaRole(r));
    const hist = P.histHidden(p, r);
    const vis = a => readable(p, r, a.sec) && (a.sec !== P.GASTOS || gaAll) && (!a.ref || readable(p, r, a.ref.split('|')[0])) && !(hist && a.ref === HIST_REF);
    const lim = Math.min(200, Math.max(1, +url.searchParams.get('n') || 60));
    let cursor = +url.searchParams.get('before') || Number.MAX_SAFE_INTEGER;
    const items = [];
    for (let i = 0; i < 10 && items.length < lim; i++) {
      const rows = S.all('SELECT a.id, a.uid, a.sec, a.what, a.ref, a.n, a.ts, u.name FROM activity a LEFT JOIN users u ON u.id=a.uid WHERE a.pid=? AND a.id<? ORDER BY a.id DESC LIMIT 200', p.id, cursor);
      for (const a of rows) { cursor = a.id; if (vis(a)) { items.push({ id: a.id, uid: a.uid, name: a.name || '', sec: a.sec, what: a.what, ref: a.ref, n: a.n, ts: a.ts }); if (items.length >= lim) break; } }
      if (rows.length < 200) break;
    }
    const counts = S.all('SELECT c.uid, c.n, c.c, c.last, u.name, u.picture FROM act_count c LEFT JOIN users u ON u.id=c.uid WHERE c.pid=? ORDER BY c.n DESC, c.c DESC', p.id)
      .map(c => ({ uid: c.uid, name: c.name || '', picture: c.picture || '', n: c.n, c: c.c, last: c.last }));
    sendJSON(res, 200, { items, counts, next: items.length >= lim ? items[items.length - 1].id : 0 });
  });

  /* ---------- cambios en vivo ---------- */
  on('GET', /^\/api\/p\/([\w-]+)\/events$/, (req, res, u, m, url) => {
    const { p, r } = access(m[1], u);
    if (live.count(u.id) >= 24) fail(429, 'Hay demasiadas pestañas abiertas con tu cuenta.', 'too_many');
    const read = P.kindOf(p) === 'guion' ? new Set(['guion']) : P.readSet(r), vers = {};
    for (const s of S.all('SELECT sec, v FROM sections WHERE pid=?', p.id)) if (readable(p, r, s.sec)) vers[s.sec] = s.v;
    live.open(req, res, p.id, { uid: u.id, sh: sha256(parseCookies(req).fs_s || ''), client: String(url.searchParams.get('c') || '').slice(0, 40), read, hist: P.histHidden(p, r),
      name: u.name || String(u.email || '').split('@')[0], pic: u.picture || '', tab: String(url.searchParams.get('tab') || '').slice(0, 12) }, { t: 'hello', vers });
  });
  /* presencia: en qué pestaña del programa está esta ventana (los demás lo ven junto a sus fotos) */
  on('POST', /^\/api\/p\/([\w-]+)\/here$/, async (req, res, u, m) => {
    const { p } = access(m[1], u);
    const b = await readJSON(req, 1024);
    live.here(p.id, u.id, String(b.c || '').slice(0, 40), String(b.tab || '').slice(0, 12), b.away === true);
    sendJSON(res, 200, { ok: true });
  });

  async function handle(req, res, url) {
    for (const rt of routes) {
      if (rt.method !== req.method) continue;
      const m = rt.re.exec(url.pathname);
      if (!m) continue;
      const u = auth.requireUser(req);
      if (req.method !== 'GET') { auth.checkWrite(req); rateLimit('w:' + u.id, 4000, 300e3); }
      await rt.fn(req, res, u, m, url);
      return true;
    }
    return false;
  }
  /* cambió el plan de una cuenta (pago, vencimiento o administración): sus proyectos se vuelven a evaluar */
  function planChanged(uid) { for (const x of S.all('SELECT id FROM projects WHERE owner=? AND deleted IS NULL', uid)) teamChanged(x.id); }
  return { handle, state, roleOf, project, planChanged, studioOk, STUDIO_MSG };
}

module.exports = { makeApi };
