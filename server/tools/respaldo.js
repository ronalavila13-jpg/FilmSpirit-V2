/* ============================================================
   Respaldo diario de la base de datos
   Copia consistente (VACUUM INTO) comprimida en DATA_DIR/respaldos/, guarda 14 días.
   La usa el temporizador filmspirit-respaldo.timer (deploy/instalar.sh).
   Restaurar:  systemctl stop filmspirit
               gunzip -c /var/lib/filmspirit/respaldos/filmspirit-AAAA-MM-DD.db.gz > /var/lib/filmspirit/filmspirit.db
               rm -f /var/lib/filmspirit/filmspirit.db-wal /var/lib/filmspirit/filmspirit.db-shm
               chown filmspirit: /var/lib/filmspirit/filmspirit.db && systemctl start filmspirit
   ============================================================ */
'use strict';
{ const emit = process.emitWarning; process.emitWarning = function (w, ...a) { if (/SQLite/i.test(String(w && w.message || w))) return; return emit.call(process, w, ...a); }; }
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { DatabaseSync } = require('node:sqlite');

const { pipeline } = require('node:stream/promises');

const dir = process.env.DATA_DIR || '/var/lib/filmspirit';
const out = path.join(dir, 'respaldos');
fs.mkdirSync(out, { recursive: true });
// lo que dejó un respaldo que se cortó (una copia de la base del tamaño de la base): se borra antes de empezar
for (const f of fs.readdirSync(out)) if (/^\.tmp-\d+\.db$|\.part$/.test(f)) fs.rmSync(path.join(out, f), { force: true });
const day = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10);
const tmp = path.join(out, `.tmp-${process.pid}.db`);
const dest = path.join(out, `filmspirit-${day}.db.gz`);
(async () => {
  try {
    const db = new DatabaseSync(path.join(dir, 'filmspirit.db'));
    db.exec('PRAGMA busy_timeout=10000');
    db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    db.close();
    // se comprime por partes: la base puede pasar de 2 GB (las imágenes van dentro) y no cabe entera en memoria
    await pipeline(fs.createReadStream(tmp), zlib.createGzip({ level: 6 }), fs.createWriteStream(dest + '.part'));
    fs.renameSync(dest + '.part', dest);
  } finally {
    fs.rmSync(tmp, { force: true });
    fs.rmSync(dest + '.part', { force: true });
  }
  // se guardan los últimos 14
  const all = fs.readdirSync(out).filter(f => /^filmspirit-\d{4}-\d{2}-\d{2}\.db\.gz$/.test(f)).sort();
  for (const f of all.slice(0, Math.max(0, all.length - 14))) fs.unlinkSync(path.join(out, f));
  console.log(`Respaldo listo: ${dest} (${(fs.statSync(dest).size / 1048576).toFixed(1)} MB)`);
})().catch(e => { console.error('El respaldo falló:', e.message); process.exit(1); });
