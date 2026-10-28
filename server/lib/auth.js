/* ============================================================
   Cuentas y sesiones
   Sesión: cookie «fs_s» (HttpOnly, SameSite=Lax, Secure en https) con un
   token aleatorio; en la base solo se guarda su huella SHA-256.
   Toda escritura exige la cabecera X-FS (un sitio ajeno no puede enviarla
   sin permiso de CORS) y, si llega Origin, que sea el de la app.
   ============================================================ */
'use strict';
const { fail, parseCookies, cookie, addCookie, rid, sha256, now, normEmail } = require('./util');
const { verifyIdToken } = require('./google');
const { planOf, PLANS } = require('./perm');

const SESSION_DAYS = 30;
const COOKIE = 'fs_s';

function makeAuth(S, cfg) {
  const secure = /^https:/.test(cfg.baseUrl);
  const newId = () => 'u' + rid(12);

  function userJSON(u) {
    const plan = planOf(u), L = PLANS[plan];
    // own: proyectos de producción activos; scripts: guiones activos (los archivados no cuentan)
    const own = S.one("SELECT COUNT(*) n FROM projects WHERE owner=? AND kind='prod' AND deleted IS NULL AND archived IS NULL", u.id).n;
    const scripts = S.one("SELECT COUNT(*) n FROM projects WHERE owner=? AND kind='guion' AND deleted IS NULL AND archived IS NULL", u.id).n;
    const archived = S.one('SELECT COUNT(*) n FROM projects WHERE owner=? AND deleted IS NULL AND archived IS NOT NULL', u.id).n;
    return {
      id: u.id, email: u.email, name: u.name, picture: u.picture, plan, proUntil: u.pro_until || null,
      limits: { projects: L.projects, scripts: L.scripts, members: L.members, writers: L.writers, photos: L.photos, gastos: !!L.gastos, storageMB: L.storageMB }, own, scripts, archived,
      plans: Object.fromEntries(Object.entries(PLANS).map(([k, x]) => [k, { projects: x.projects, scripts: x.scripts, members: x.members, writers: x.writers, storageMB: x.storageMB, archived: x.archived, gastos: !!x.gastos }])),
      admin: cfg.adminEmails.includes(u.email), lang: u.lang === 'en' || u.lang === 'es' ? u.lang : null,
    };
  }

  /* invitaciones pendientes para este correo: pasan a ser membresías */
  function claimInvites(u) {
    const inv = S.all('SELECT i.* FROM invites i JOIN projects p ON p.id=i.pid WHERE i.email=? AND p.deleted IS NULL', u.email);
    for (const i of inv) {
      const p = S.one('SELECT owner FROM projects WHERE id=?', i.pid);
      if (p && p.owner !== u.id) S.run('INSERT OR IGNORE INTO members(pid,uid,role,perms,added) VALUES(?,?,?,?,?)', i.pid, u.id, i.role, i.perms, now());
      S.run('DELETE FROM invites WHERE pid=? AND email=?', i.pid, i.email);
    }
    return inv.map(i => i.pid);
  }

  async function loginGoogle(credential) {
    let g;
    try { g = await verifyIdToken(credential, cfg.googleClientId); }
    catch (e) { fail(401, 'No se pudo verificar tu cuenta de Google: ' + e.message, 'bad_token'); }
    const email = normEmail(g.email);
    const claimed = [];
    let isNew = false;
    const u = S.tx(() => {
      let u = S.one('SELECT * FROM users WHERE sub=?', g.sub);
      if (!u) {
        // el correo lo tenía otra cuenta de Google (correo reasignado): esa cuenta conserva sus datos y libera el correo
        const old = S.one('SELECT * FROM users WHERE email=?', email);
        if (old && old.sub && old.sub !== g.sub) {
          // el correo de administración no pasa a otra cuenta de Google: el panel se reconoce por el correo, y una cuenta
          // nueva con ese correo se quedaba con él (y la de siempre lo perdía). Si de verdad cambió, se arregla a mano
          if (cfg.adminEmails.includes(email)) fail(409, 'Este correo ya está en otra cuenta de FilmSpirit. Escríbenos para revisarlo.', 'email_taken');
          S.run('UPDATE users SET email=? WHERE id=?', old.email + '#' + old.id, old.id);
        }
        else if (old) u = old;
      }
      if (!u) {
        S.run('INSERT INTO users(id,sub,email,name,picture,created,seen) VALUES(?,?,?,?,?,?,?)', newId(), g.sub, email, g.name || email.split('@')[0], g.picture, now(), now());
        isNew = true;
        u = S.one('SELECT * FROM users WHERE sub=?', g.sub);
      } else {
        // el correo de una cuenta de Google puede cambiar; la cuenta se reconoce por «sub»
        const clash = email !== u.email && S.one('SELECT id FROM users WHERE email=? AND id<>?', email, u.id);
        S.run('UPDATE users SET sub=?, email=?, name=?, picture=?, seen=? WHERE id=?', g.sub, clash ? u.email : email, g.name || u.name, g.picture || u.picture, now(), u.id);
        u = S.one('SELECT * FROM users WHERE id=?', u.id);
      }
      // cuenta nueva (llegó por la invitación): entra a los proyectos a los que la invitaron. Una cuenta que ya existía
      // las ve en su lista y las acepta al abrir el proyecto (o las rechaza)
      if (isNew) claimed.push(...claimInvites(u));
      return u;
    });
    if (u.blocked) fail(403, 'Esta cuenta está suspendida. Escríbenos si crees que es un error.', 'blocked');
    return { u, claimed, isNew };
  }

  /* cerrar la sesión en todos los navegadores */
  function endAll(uid) { S.run('DELETE FROM sessions WHERE uid=?', uid); }
  /* eliminar la cuenta: sus proyectos (también para su equipo), su lugar en los equipos ajenos, invitaciones,
     sesiones y navegadores. Quedan los cobros (contabilidad), los reclamos y el registro de seguridad.
     (lote AD) Ya no queda la huella de la cuenta de Google (tabla gone): era para que el mes gratis no se repitiera */
  function deleteAccount(u) {
    S.tx(() => {
      const fresh = S.one('SELECT * FROM users WHERE id=?', u.id);
      S.run('DELETE FROM invites WHERE email=?', fresh.email);
      S.run('DELETE FROM waitlist WHERE email=? OR uid=?', fresh.email, u.id);
      S.run('DELETE FROM outbox WHERE to_addr=?', fresh.email);   // correos en cola (lib/mail.js): no se envían y no queda la dirección
      S.run('DELETE FROM devices WHERE uid=?', u.id);
      S.run('UPDATE codes SET owner=NULL WHERE owner=?', u.id);
      S.run('DELETE FROM users WHERE id=?', u.id);   // en cascada: sesiones, proyectos (secciones, historial, imágenes, equipo), membresías, suscripciones
    });
  }

  function startSession(res, u, req) {
    const token = rid(32);
    S.run('INSERT INTO sessions(hash,uid,created,expires,seen,ua,ip) VALUES(?,?,?,?,?,?,?)', sha256(token), u.id, now(), now() + SESSION_DAYS * 864e5, now(),
      String(req.headers['user-agent'] || '').slice(0, 200), req.ip || '');
    // las sesiones viejas de la misma cuenta se limpian (máximo 20 abiertas)
    S.run(`DELETE FROM sessions WHERE uid=? AND hash NOT IN (SELECT hash FROM sessions WHERE uid=? ORDER BY seen DESC LIMIT 20)`, u.id, u.id);
    addCookie(res, cookie(COOKIE, token, { maxAge: SESSION_DAYS * 86400, secure }));
  }
  function endSession(req, res) {
    const t = parseCookies(req)[COOKIE];
    if (t) S.run('DELETE FROM sessions WHERE hash=?', sha256(t));
    addCookie(res, cookie(COOKIE, '', { maxAge: 0, secure }));
    return t ? sha256(t) : '';
  }
  /* usuario de la sesión, o null. La sesión se renueva sola si se usa (cada día como mucho) */
  function current(req) {
    const t = parseCookies(req)[COOKIE];
    if (!t || t.length > 100) return null;
    const s = S.one('SELECT * FROM sessions WHERE hash=?', sha256(t));
    if (!s) return null;
    if (s.expires < now()) { S.run('DELETE FROM sessions WHERE hash=?', s.hash); return null; }
    const u = S.one('SELECT * FROM users WHERE id=?', s.uid);
    if (!u || u.blocked) return null;
    if (now() - (s.seen || 0) > 864e5) {
      S.run('UPDATE sessions SET seen=?, expires=? WHERE hash=?', now(), now() + SESSION_DAYS * 864e5, s.hash);
      S.run('UPDATE users SET seen=? WHERE id=?', now(), u.id);
    }
    return u;
  }
  /* ¿la sesión empezó hace menos de «ms»? (el panel de administración pide haber entrado con Google hace poco) */
  function recent(req, ms) {
    const t = parseCookies(req)[COOKIE];
    if (!t || t.length > 100) return false;
    const s = S.one('SELECT created FROM sessions WHERE hash=?', sha256(t));
    return !!s && now() - (s.created || 0) < ms;
  }
  function requireUser(req) {
    const u = current(req);
    if (!u) fail(401, 'Tu sesión terminó. Vuelve a entrar con Google.', 'no_session');
    return u;
  }
  /* protección contra envíos desde otros sitios */
  function checkWrite(req) {
    if (req.headers['x-fs'] !== '1') fail(403, 'Solicitud rechazada.', 'csrf');
    const o = req.headers.origin;
    if (o && o !== cfg.origin) fail(403, 'Solicitud rechazada.', 'csrf');
  }
  setInterval(() => { try { S.run('DELETE FROM sessions WHERE expires<?', now()); } catch (e) { } }, 3600e3).unref();

  return { loginGoogle, startSession, endSession, endAll, deleteAccount, current, recent, requireUser, checkWrite, userJSON, claimInvites };
}

module.exports = { makeAuth, COOKIE };
