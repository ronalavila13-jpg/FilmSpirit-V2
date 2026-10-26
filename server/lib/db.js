/* ============================================================
   Base de datos (SQLite incluido en Node 22: node:sqlite)
   Un solo archivo en DATA_DIR/filmspirit.db, en modo WAL.
   Cada proyecto se guarda por secciones (las pestañas de SEC_LIST) con su
   versión; las imágenes, aparte, en binario.
   ============================================================ */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
// el aviso «experimental» de node:sqlite no aporta nada en los registros
{ const emit = process.emitWarning; process.emitWarning = function (w, ...a) { if (/SQLite/i.test(String(w && w.message || w))) return; return emit.call(process, w, ...a); }; }
const { DatabaseSync } = require('node:sqlite');

const MIGRATIONS = [
  // 1 · cuentas, sesiones, proyectos, equipo, secciones e imágenes
  `CREATE TABLE users(
     id TEXT PRIMARY KEY, sub TEXT UNIQUE, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL DEFAULT '', picture TEXT NOT NULL DEFAULT '',
     plan TEXT NOT NULL DEFAULT 'free', pro_until INTEGER, created INTEGER NOT NULL, seen INTEGER, blocked INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE sessions(
     hash TEXT PRIMARY KEY, uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created INTEGER NOT NULL, expires INTEGER NOT NULL, seen INTEGER, ua TEXT, ip TEXT);
   CREATE INDEX sessions_uid ON sessions(uid);
   CREATE TABLE projects(
     id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL DEFAULT '',
     created INTEGER NOT NULL, updated INTEGER NOT NULL, deleted INTEGER);
   CREATE INDEX projects_owner ON projects(owner);
   CREATE TABLE members(
     pid TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     role TEXT NOT NULL DEFAULT '', perms TEXT NOT NULL DEFAULT '{}', added INTEGER NOT NULL, PRIMARY KEY(pid, uid));
   CREATE INDEX members_uid ON members(uid);
   CREATE TABLE invites(
     pid TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, email TEXT NOT NULL, role TEXT NOT NULL DEFAULT '',
     perms TEXT NOT NULL DEFAULT '{}', added INTEGER NOT NULL, by TEXT, PRIMARY KEY(pid, email));
   CREATE INDEX invites_email ON invites(email);
   CREATE TABLE requests(
     pid TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     ts INTEGER NOT NULL, PRIMARY KEY(pid, uid));
   CREATE TABLE sections(
     pid TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, sec TEXT NOT NULL, v INTEGER NOT NULL,
     json TEXT NOT NULL, by TEXT, client TEXT, ts INTEGER NOT NULL, PRIMARY KEY(pid, sec));
   CREATE TABLE history(
     pid TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, sec TEXT NOT NULL, v INTEGER NOT NULL,
     z BLOB NOT NULL, by TEXT, ts INTEGER NOT NULL, PRIMARY KEY(pid, sec, v));
   CREATE TABLE frames(
     pid TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, k TEXT NOT NULL, v INTEGER NOT NULL,
     mime TEXT NOT NULL, data BLOB NOT NULL, bytes INTEGER NOT NULL, by TEXT, ts INTEGER NOT NULL, PRIMARY KEY(pid, k));`,
  // 2 · plan gratuito con más proyectos de los permitidos (después de dejar Pro): cuál sigue activo
  `ALTER TABLE users ADD COLUMN free_pid TEXT;
   ALTER TABLE users ADD COLUMN free_pid_ts INTEGER;`,
  // 3 · suscripciones (Mercado Pago), códigos de descuento, navegadores y libro de reclamaciones
  `ALTER TABLE users ADD COLUMN promo TEXT;
   ALTER TABLE users ADD COLUMN trial_used INTEGER NOT NULL DEFAULT 0;
   ALTER TABLE users ADD COLUMN signup_ip TEXT;
   ALTER TABLE users ADD COLUMN grant_until INTEGER;
   CREATE TABLE subs(
     id TEXT PRIMARY KEY, uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL DEFAULT 'mp', ext_id TEXT UNIQUE,
     cycle TEXT NOT NULL, base_amount REAL NOT NULL, amount REAL NOT NULL, status TEXT NOT NULL, code TEXT, disc_cycles INTEGER NOT NULL DEFAULT 0,
     trial INTEGER NOT NULL DEFAULT 0, payer_id TEXT, next_payment INTEGER, paid_cycles INTEGER NOT NULL DEFAULT 0, resume_at INTEGER,
     note TEXT, created INTEGER NOT NULL, updated INTEGER NOT NULL);
   CREATE INDEX subs_uid ON subs(uid);
   CREATE TABLE payments(
     ext_id TEXT PRIMARY KEY, sid TEXT, uid TEXT, amount REAL, status TEXT, ts INTEGER NOT NULL);
   CREATE TABLE codes(
     code TEXT PRIMARY KEY, kind TEXT NOT NULL, label TEXT NOT NULL DEFAULT '', owner TEXT, pct INTEGER NOT NULL DEFAULT 0,
     cycles INTEGER NOT NULL DEFAULT 0, trial_days INTEGER NOT NULL DEFAULT 0, max_uses INTEGER, uses INTEGER NOT NULL DEFAULT 0,
     expires INTEGER, active INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL);
   CREATE TABLE redemptions(code TEXT NOT NULL, uid TEXT NOT NULL, sid TEXT, ts INTEGER NOT NULL, PRIMARY KEY(code, uid));
   CREATE TABLE rewards(id TEXT PRIMARY KEY, uid TEXT NOT NULL, kind TEXT NOT NULL, days INTEGER NOT NULL, ts INTEGER NOT NULL, note TEXT);
   CREATE TABLE devices(dev TEXT NOT NULL, uid TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY(dev, uid));
   CREATE TABLE reclamos(
     n INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE, ts INTEGER NOT NULL, tipo TEXT NOT NULL, data TEXT NOT NULL,
     estado TEXT NOT NULL DEFAULT 'abierto', respuesta TEXT, resp_ts INTEGER);
   CREATE TABLE audit(ts INTEGER NOT NULL, uid TEXT, action TEXT NOT NULL, detail TEXT);`,
  // 4 · aviso antes del primer cobro
  `ALTER TABLE subs ADD COLUMN reminded INTEGER;`,
  // 5 · planes Pro y Studio, pagos fuera del Perú (Lemon Squeezy, en dólares), proyectos archivados, país e idioma
  `ALTER TABLE projects ADD COLUMN archived INTEGER;
   ALTER TABLE subs ADD COLUMN plan TEXT NOT NULL DEFAULT 'pro';
   ALTER TABLE subs ADD COLUMN currency TEXT NOT NULL DEFAULT 'PEN';
   ALTER TABLE subs ADD COLUMN portal TEXT;
   ALTER TABLE payments ADD COLUMN currency TEXT NOT NULL DEFAULT 'PEN';
   ALTER TABLE users ADD COLUMN grant_plan TEXT;
   ALTER TABLE users ADD COLUMN country TEXT;
   ALTER TABLE users ADD COLUMN lang TEXT;`,
  // 6 · actividad del equipo: quién cambió qué (los cambios seguidos de lo mismo se juntan) y cuántos cambios lleva cada persona
  `CREATE TABLE activity(
     id INTEGER PRIMARY KEY AUTOINCREMENT, pid TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, uid TEXT NOT NULL,
     sec TEXT NOT NULL, what TEXT NOT NULL DEFAULT '', ref TEXT NOT NULL DEFAULT '', n INTEGER NOT NULL DEFAULT 1, ts INTEGER NOT NULL);
   CREATE INDEX activity_pid ON activity(pid, id);
   CREATE TABLE act_count(
     pid TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, uid TEXT NOT NULL,
     n INTEGER NOT NULL DEFAULT 0, c INTEGER NOT NULL DEFAULT 0, last INTEGER, PRIMARY KEY(pid, uid));`,
  // 7 · paletas de cada persona (Apariencia › Colores del proyecto › Mis paletas), para usarlas en cualquier proyecto
  `ALTER TABLE users ADD COLUMN themes TEXT;`,
  // 8 · planes Guion, Indie, Pro y Studio: un proyecto es un guion o un proyecto de producción; lista de espera de Studio
  `ALTER TABLE projects ADD COLUMN kind TEXT NOT NULL DEFAULT 'prod';
   CREATE INDEX projects_owner_kind ON projects(owner, kind);
   CREATE TABLE waitlist(email TEXT NOT NULL, plan TEXT NOT NULL, uid TEXT, lang TEXT, country TEXT, ts INTEGER NOT NULL, PRIMARY KEY(email, plan));`,
  // 9 · cuentas eliminadas: solo la huella de la cuenta de Google y si ya usó el mes gratis (para que no se repita)
  `CREATE TABLE gone(h TEXT PRIMARY KEY, trial INTEGER NOT NULL DEFAULT 0, ts INTEGER NOT NULL);`,
  // 10 · contadores de escritura y racha de cada persona (pestaña Guion · lib/escritura.js)
  `ALTER TABLE users ADD COLUMN writing TEXT;`,
  // 11 · cola de correos (lib/mail.js): si el servicio de envío falla, se reintenta (antes se perdían)
  `CREATE TABLE outbox(
     id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL DEFAULT '', to_addr TEXT NOT NULL, subject TEXT NOT NULL,
     body TEXT NOT NULL, reply_to TEXT, tries INTEGER NOT NULL DEFAULT 0, next INTEGER NOT NULL, created INTEGER NOT NULL,
     sent INTEGER, dead INTEGER, err TEXT);
   CREATE INDEX outbox_next ON outbox(next) WHERE sent IS NULL AND dead IS NULL;`,
];

function open(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'filmspirit.db'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const ver = db.prepare('PRAGMA user_version').get().user_version;
  for (let i = ver; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN');
    try { db.exec(MIGRATIONS[i]); db.exec(`PRAGMA user_version=${i + 1}`); db.exec('COMMIT'); }
    catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  const cache = new Map();
  const q = sql => { let s = cache.get(sql); if (!s) { s = db.prepare(sql); cache.set(sql, s); } return s; };
  const one = (sql, ...a) => q(sql).get(...a) || null;
  const all = (sql, ...a) => q(sql).all(...a);
  const run = (sql, ...a) => q(sql).run(...a);
  let depth = 0;
  const tx = fn => {
    if (depth) return fn();
    depth++; db.exec('BEGIN IMMEDIATE');
    try { const r = fn(); db.exec('COMMIT'); return r; }
    catch (e) { try { db.exec('ROLLBACK'); } catch (e2) { } throw e; }
    finally { depth--; }
  };
  const gz = s => Buffer.from(zlib.deflateRawSync(Buffer.from(s, 'utf8')));
  const gunz = b => zlib.inflateRawSync(Buffer.from(b)).toString('utf8');
  return { db, one, all, run, tx, gz, gunz, close: () => db.close() };
}

module.exports = { open };
