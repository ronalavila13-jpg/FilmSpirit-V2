/* ============================================================
   Licencias sin conexión
   Clave = PRODUCTO1.<datos en base64url>.<firma Ed25519 en base64url>
   La app solo tiene la clave pública: puede verificar, no emitir.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nacl = require('tweetnacl');

const DAY = 86400000;
const b64u = {
  enc: buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'),
};

function parseKey(raw, cfg) {
  const key = String(raw || '').replace(/\s+/g, '');
  if (key.length > 2000) return { ok: false, err: 'La clave no es válida.' };
  const prefix = cfg.ext.toUpperCase() + '1.';
  if (!key.toUpperCase().startsWith(prefix)) return { ok: false, err: 'La clave no corresponde a ' + cfg.name + '.' };
  const parts = key.slice(prefix.length).split('.');
  if (parts.length !== 2) return { ok: false, err: 'La clave está incompleta. Cópiala entera, sin cortar.' };
  let data, sig, info;
  try { data = b64u.dec(parts[0]); sig = b64u.dec(parts[1]); info = JSON.parse(data.toString('utf8')); }
  catch (e) { return { ok: false, err: 'La clave está dañada. Vuelve a copiarla.' }; }
  const pub = Buffer.from(cfg.publicKey, 'base64');
  if (sig.length !== 64 || !nacl.sign.detached.verify(new Uint8Array(data), new Uint8Array(sig), new Uint8Array(pub)))
    return { ok: false, err: 'La clave no es válida.' };
  // el emisor siempre pone el producto: una clave sin él no es de FilmSpirit
  if (!info || typeof info !== 'object' || info.p !== cfg.ext) return { ok: false, err: 'La clave es de otro producto.' };
  if (info.x != null && !(Date.now() <= Date.parse(info.x) + DAY)) return { ok: false, err: 'La licencia venció el ' + info.x + '.', info };
  return { ok: true, key, info };
}

class License {
  constructor(cfg, userData, appData) {
    this.cfg = cfg;
    this.file = path.join(userData, 'licencia.json');
    // segunda marca del inicio de la prueba, fuera de la carpeta del programa
    this.mark = path.join(appData, '.' + crypto.createHash('sha1').update(cfg.appId).digest('hex').slice(0, 12));
    this.st = {};
  }
  load() {
    try { this.st = JSON.parse(fs.readFileSync(this.file, 'utf8')) || {}; } catch (e) { this.st = {}; }
    let m = 0;
    try { m = +fs.readFileSync(this.mark, 'utf8') || 0; } catch (e) { }
    const now = Date.now();
    const start = Math.min(...[this.st.trialStart, m, now].filter(v => v > 0));
    const changed = start !== this.st.trialStart || m !== start;
    this.st.trialStart = start;
    // si el reloj se atrasa, se usa la última fecha vista
    this.st.lastSeen = Math.max(this.st.lastSeen || 0, now);
    this.persist(changed);
    return this;
  }
  persist(mark = true) {
    try { fs.mkdirSync(path.dirname(this.file), { recursive: true }); fs.writeFileSync(this.file, JSON.stringify(this.st, null, 1)); } catch (e) { }
    if (mark) try { fs.writeFileSync(this.mark, String(this.st.trialStart)); } catch (e) { }
  }
  status() {
    const c = this.cfg;
    if (this.st.key) {
      const r = parseKey(this.st.key, c);
      if (r.ok) return { mode: 'pro', name: r.info.n || '', email: r.info.e || '', plan: r.info.t || 'pro', issued: r.info.i || '', expires: r.info.x || '', id: r.info.id || '' };
    }
    const now = Math.max(Date.now(), this.st.lastSeen || 0);
    const used = Math.floor((now - this.st.trialStart) / DAY);
    const left = Math.max(0, c.trialDays - used);
    if (left > 0) return { mode: 'trial', daysLeft: left, trialDays: c.trialDays };
    return { mode: 'free', freeProjects: c.freeProjects };
  }
  activate(raw) {
    const r = parseKey(raw, this.cfg);
    if (!r.ok) return { ok: false, err: r.err };
    this.st.key = r.key;
    this.st.activated = new Date().toISOString();
    this.persist(false);
    return { ok: true, status: this.status() };
  }
  deactivate() {
    delete this.st.key; delete this.st.activated;
    this.persist(false);
    return this.status();
  }
}
module.exports = { License, parseKey, b64u };
