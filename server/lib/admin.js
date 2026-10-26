/* ============================================================
   PANEL DE ADMINISTRACIÓN (/admin) · solo las cuentas de ADMIN_EMAILS
   Resumen, cuentas (dar o quitar Pro, suspender), códigos de descuento para
   influencers, suscripciones y libro de reclamaciones.
   Cada cambio queda en la bitácora (tabla audit).
   ============================================================ */
'use strict';
const { fail, sendJSON, readJSON, now } = require('./util');
const { FOREVER } = require('./billing');

const CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,39}$/;
const DAY = 864e5;
/* el panel pide haber entrado con Google hace poco (ADMIN_SESSION_HOURS, 12 de entrada): una sesión olvidada abierta
   en otro equipo no basta para dar planes, suspender cuentas o ver los reclamos */
const freshMs = () => Math.max(1, +(process.env.ADMIN_SESSION_HOURS || 12)) * 3600e3;

function makeAdmin(S, auth, billing, cfg, mail, reclamos, live, sec) {
  const isAdmin = u => cfg.adminEmails.includes(u.email);
  const userRow = u => ({
    id: u.id, email: u.email, name: u.name, plan: u.plan, proUntil: u.pro_until, grantUntil: u.grant_until, created: u.created, seen: u.seen,
    blocked: !!u.blocked, promo: u.promo,
    projects: S.one('SELECT COUNT(*) n FROM projects WHERE owner=? AND deleted IS NULL', u.id).n,
    member: S.one('SELECT COUNT(*) n FROM members WHERE uid=?', u.id).n,
    grantPlan: u.grant_plan, country: u.country,
    sub: S.one("SELECT plan, provider, currency, cycle, status, amount, next_payment next, code FROM subs WHERE uid=? AND status<>'pending' ORDER BY created DESC LIMIT 1", u.id),
  });

  async function handle(req, res, url) {
    const p = url.pathname;
    if (!p.startsWith('/api/admin/')) return false;
    const me = auth.requireUser(req);
    if (!isAdmin(me)) fail(403, 'Solo para administración.', 'not_admin');
    if (!auth.recent(req, freshMs())) fail(401, 'Por seguridad, vuelve a entrar con Google para usar el panel.', 'reauth');
    if (req.method !== 'GET') auth.checkWrite(req);
    const body = req.method === 'GET' ? {} : await readJSON(req, 64 * 1024);
    const log = (action, detail) => billing.audit(me.id, 'admin:' + action, detail);
    let m;

    if (p === '/api/admin/stats') {
      const t = now(), c = sql => S.one(sql).n;
      const subs = Object.fromEntries(S.all('SELECT status, COUNT(*) n FROM subs GROUP BY status').map(x => [x.status, x.n]));
      // ingreso mensual por moneda: soles (Mercado Pago) y dólares (Lemon Squeezy)
      const mrrBy = { PEN: 0, USD: 0 };
      for (const s of S.all("SELECT cycle, amount, currency FROM subs WHERE status='authorized'")) mrrBy[s.currency === 'USD' ? 'USD' : 'PEN'] += s.cycle === 'year' ? s.amount / 12 : s.amount;
      const mrr = mrrBy.PEN;
      return sendJSON(res, 200, {
        users: c('SELECT COUNT(*) n FROM users'), new7: S.one('SELECT COUNT(*) n FROM users WHERE created>?', t - 7 * DAY).n,
        active7: S.one('SELECT COUNT(*) n FROM users WHERE seen>?', t - 7 * DAY).n, pro: S.one("SELECT COUNT(*) n FROM users WHERE plan='pro' AND (pro_until IS NULL OR pro_until>?)", t).n,
        indie: S.one("SELECT COUNT(*) n FROM users WHERE plan='indie' AND (pro_until IS NULL OR pro_until>?)", t).n,
        scripts: c("SELECT COUNT(*) n FROM projects WHERE deleted IS NULL AND kind='guion'"), waitlist: c("SELECT COUNT(*) n FROM waitlist WHERE plan='studio'"),
        studio: S.one("SELECT COUNT(*) n FROM users WHERE plan='studio' AND (pro_until IS NULL OR pro_until>?)", t).n,
        projects: c('SELECT COUNT(*) n FROM projects WHERE deleted IS NULL'), archived: c('SELECT COUNT(*) n FROM projects WHERE deleted IS NULL AND archived IS NOT NULL'),
        subs, mrr: Math.round(mrr * 100) / 100, mrrUSD: Math.round(mrrBy.USD * 100) / 100,
        reclamos: S.one("SELECT COUNT(*) n FROM reclamos WHERE estado='abierto'").n, billing: billing.enabled(), mp: billing.mpOn(), ls: billing.lsOn(), paddle: billing.pdOn(), intl: billing.intlProv(), prices: billing.PRICE, allPrices: billing.PRICES,
        storageMB: Math.round((S.one('SELECT COALESCE(SUM(bytes),0) b FROM frames').b + S.one('SELECT COALESCE(SUM(LENGTH(json)),0) b FROM sections').b) / 1048576),
      });
    }
    if (p === '/api/admin/users' && req.method === 'GET') {
      const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
      const rows = q ? S.all("SELECT * FROM users WHERE lower(email) LIKE ? OR lower(name) LIKE ? OR promo LIKE ? ORDER BY created DESC LIMIT 100", `%${q}%`, `%${q}%`, `%${q.toUpperCase()}%`)
        : S.all('SELECT * FROM users ORDER BY created DESC LIMIT 100');
      return sendJSON(res, 200, rows.map(userRow));
    }
    if ((m = /^\/api\/admin\/users\/([\w-]+)$/.exec(p)) && req.method === 'POST') {
      const u = S.one('SELECT * FROM users WHERE id=?', m[1]); if (!u) fail(404, 'Cuenta no encontrada.', 'not_found');
      const gp = body.plan === 'studio' ? 'studio' : body.plan === 'indie' ? 'indie' : 'pro';
      if (body.grantDays) { const d = Math.max(1, Math.min(3650, +body.grantDays | 0)); await billing.grantDays(u.id, d, 'cortesia', body.note || 'panel', gp); log('grant', { uid: u.id, days: d, plan: gp }); }
      if (body.forever) { S.run('UPDATE users SET grant_until=?, grant_plan=? WHERE id=?', FOREVER, gp, u.id); billing.entitlement(u.id); log('forever', { uid: u.id, plan: gp }); }
      if (body.revoke) { S.run('UPDATE users SET grant_until=NULL, grant_plan=NULL WHERE id=?', u.id); if (['indie', 'pro', 'studio'].includes(u.plan) && !u.pro_until) S.run('UPDATE users SET pro_until=? WHERE id=?', now() - 1, u.id); billing.entitlement(u.id); log('revoke', { uid: u.id }); }
      if (body.block != null) { S.run('UPDATE users SET blocked=? WHERE id=?', body.block ? 1 : 0, u.id); if (body.block) { S.run('DELETE FROM sessions WHERE uid=?', u.id); if (live) live.closeWhere(c => c.uid === u.id); } log(body.block ? 'block' : 'unblock', { uid: u.id }); }
      return sendJSON(res, 200, userRow(S.one('SELECT * FROM users WHERE id=?', u.id)));
    }
    if (p === '/api/admin/codes' && req.method === 'GET') {
      return sendJSON(res, 200, S.all(`SELECT c.*, (SELECT COUNT(*) FROM subs s WHERE s.code=c.code AND s.status='authorized') active_subs,
        (SELECT COUNT(*) FROM payments p JOIN subs s ON s.id=p.sid WHERE s.code=c.code AND p.status='approved') paid,
        (SELECT COALESCE(SUM(p.amount),0) FROM payments p JOIN subs s ON s.id=p.sid WHERE s.code=c.code AND p.status='approved') collected,
        (SELECT COUNT(*) FROM payments p JOIN subs s ON s.id=p.sid WHERE s.code=c.code AND p.status<>'approved') refunds
        FROM codes c WHERE kind='promo' ORDER BY created DESC`));
    }
    if (p === '/api/admin/codes' && req.method === 'POST') {
      const code = String(body.code || '').trim().toUpperCase();
      if (!CODE_RE.test(code)) fail(400, 'El código debe tener de 3 a 40 letras, números o guiones.', 'bad_code');
      if (S.one('SELECT 1 x FROM codes WHERE code=?', code)) fail(409, 'Ese código ya existe.', 'exists');
      const pct = Math.max(0, Math.min(90, +body.pct | 0)), cycles = Math.max(0, Math.min(36, +body.cycles | 0)), trial = Math.max(0, Math.min(90, +body.trialDays | 0));
      if (!pct && !trial) fail(400, 'El código debe dar un descuento o días extra de prueba.', 'empty_code');
      const maxUses = body.maxUses ? Math.max(1, +body.maxUses | 0) : null, expires = body.expires ? Date.parse(body.expires + 'T23:59:59-05:00') || null : null;
      S.run('INSERT INTO codes(code,kind,label,pct,cycles,trial_days,max_uses,expires,created) VALUES(?,?,?,?,?,?,?,?,?)', code, 'promo', String(body.label || '').slice(0, 80), pct, cycles, trial, maxUses, expires, now());
      log('code_new', { code, pct, cycles, trial, maxUses, expires });
      return sendJSON(res, 201, S.one('SELECT * FROM codes WHERE code=?', code));
    }
    if ((m = /^\/api\/admin\/codes\/([A-Z0-9-]+)$/.exec(p)) && req.method === 'POST') {
      S.run('UPDATE codes SET active=? WHERE code=?', body.active ? 1 : 0, m[1]); log('code_active', { code: m[1], active: !!body.active });
      return sendJSON(res, 200, S.one('SELECT * FROM codes WHERE code=?', m[1]));
    }
    if (p === '/api/admin/subs' && req.method === 'GET') {
      return sendJSON(res, 200, S.all('SELECT s.*, u.email FROM subs s JOIN users u ON u.id=s.uid ORDER BY s.created DESC LIMIT 300'));
    }
    if ((m = /^\/api\/admin\/subs\/(\w+)\/sync$/.exec(p)) && req.method === 'POST') {
      const s = S.one('SELECT * FROM subs WHERE id=?', m[1]); if (!s || !s.ext_id) fail(404, 'Sin suscripción en el medio de pago.', 'not_found');
      if (s.provider === 'ls' || s.provider === 'paddle') await billing.syncAny(s); else await billing.syncPre(s.ext_id);
      return sendJSON(res, 200, S.one('SELECT * FROM subs WHERE id=?', m[1]));
    }
    if (p === '/api/admin/reclamos' && req.method === 'GET') {
      return sendJSON(res, 200, S.all('SELECT * FROM reclamos ORDER BY n DESC LIMIT 300').map(r => ({ ...r, data: JSON.parse(r.data) })));
    }
    if ((m = /^\/api\/admin\/reclamos\/(\d+)$/.exec(p)) && req.method === 'POST') {
      const r = S.one('SELECT * FROM reclamos WHERE n=?', +m[1]); if (!r) fail(404, 'No existe.', 'not_found');
      const resp = String(body.respuesta || '').trim().slice(0, 4000);
      if (!resp) fail(400, 'Escribe la respuesta.', 'missing');
      S.run("UPDATE reclamos SET respuesta=?, resp_ts=?, estado='respondido' WHERE n=?", resp, now(), r.n);
      const d = JSON.parse(r.data);
      const sent = await mail.deliver({ kind: 'reclamo-respuesta', to: d.email, subject: `Respuesta a tu ${r.tipo} ${r.code}`, text: `Hola ${d.nombre}:\n\nRespuesta a la hoja ${r.code} del libro de reclamaciones de FilmSpirit:\n\n${resp}\n\n${cfg.business.name || 'FilmSpirit'}` });
      log('reclamo_resp', { n: r.n });
      return sendJSON(res, 200, { ok: true, emailed: sent.sent, queued: !!sent.queued });
    }
    // lista de espera de Studio
    if (p === '/api/admin/waitlist' && req.method === 'GET') {
      return sendJSON(res, 200, S.all('SELECT w.email, w.plan, w.lang, w.country, w.ts, u.plan uplan FROM waitlist w LEFT JOIN users u ON u.email=w.email ORDER BY w.ts DESC LIMIT 2000'));
    }
    // seguridad: las últimas 24 horas (bloqueos por límite, inicios rechazados y firmas falsas de los avisos de pago)
    if (p === '/api/admin/security' && req.method === 'GET') {
      const s = sec.summary();
      const ss = S.one('SELECT COUNT(*) n, COUNT(DISTINCT uid) u FROM sessions WHERE expires>?', now());
      return sendJSON(res, 200, { ...s, sessions: ss.n, sessionUsers: ss.u, adminHours: freshMs() / 3600e3, admins: cfg.adminEmails });
    }
    if (p === '/api/admin/audit' && req.method === 'GET') {
      return sendJSON(res, 200, S.all('SELECT a.*, u.email FROM audit a LEFT JOIN users u ON u.id=a.uid ORDER BY a.ts DESC LIMIT 300'));
    }
    fail(404, 'No encontrado', 'not_found');
  }
  return { handle, isAdmin, fresh: req => auth.recent(req, freshMs()) };
}
module.exports = { makeAdmin };
