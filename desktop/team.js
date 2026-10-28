/* ============================================================
   PROYECTOS COMPARTIDOS · carpeta sincronizada + cifrado por pestaña

   <carpeta>/
     <Título>.<ext>          manifiesto (equipo, permisos, versiones de llave), firmado por el productor
     equipo/<id>.id          secretos de cada persona, cifrados con SU contraseña (scrypt + AES-256-GCM)
     equipo/<id>.llaves      llaves de las pestañas que puede leer, selladas por el productor (X25519)
     datos/<sección>.dat     cada sección cifrada con su propia llave (AES-256-GCM) y firmada por quien la editó (Ed25519)
     datos/historial/        las últimas versiones de cada sección: cada versión dice de cuál parte (prev), así los
                             demás comprueban paso a paso los cambios de un jefe de área o del guion cerrado aunque
                             se hayan perdido versiones intermedias
     imagenes/<hash>.dat     imágenes: las del storyboard con la llave del storyboard; las fotos del
                             desglose («bd~…») y del casting («ca~…») con la llave del desglose; las del
                             scouting («lc~…») con la del plan de rodaje; las del punto de encuentro
                             («cl~…») con la de la hoja de llamado

   Quien no tiene la llave de una sección no puede leerla aunque copie la carpeta.
   Quien no tiene permiso de edición no puede escribir una versión que los demás acepten:
   cada archivo lleva la firma de su autor y se verifica contra los permisos firmados por el productor.
   ============================================================ */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const nacl = require('tweetnacl');
// las reglas del equipo (secciones, qué necesita leer cada una, quién ve el presupuesto, áreas del desglose, guion
// cerrado e imágenes): las mismas de la interfaz y del servidor (make.js copia src/areas.js aquí)
const { SECS, SEC_DEPS, PRODUCER_ROLES, cleanPerms, permReadSet, permCanEdit, frameSec, FRAME_SECS, bdViolates, scriptLockCheck, LOCK_MSG } = require(fs.existsSync(path.join(__dirname, 'areas.js')) ? './areas.js' : '../src/areas.js');
const hasFrameKey = S => FRAME_SECS.some(s => S.keys[s]);
// scrypt: N = 2^17 para las contraseñas nuevas (antes 2^15; cada archivo guarda los suyos y se sigue abriendo)
const KDF = { N: 131072, r: 8, p: 1 };
const KDF_OLD = { N: 32768, r: 8, p: 1 };
const kdfParams = k => { const N = k && +k.N, r = k && +k.r, p = k && +k.p; return N >= 16384 && N <= 1048576 && (N & (N - 1)) === 0 && r >= 1 && r <= 16 && p >= 1 && p <= 4 ? { N, r, p } : KDF_OLD; };
const POLL_MS = 2000;
// versiones guardadas por sección en datos/historial (para comprobar la cadena de cambios)
const HIST_MAX = 120;
// cuánto se espera a que la nube traiga la versión de la que parte un cambio antes de darlo por no comprobable
const PEND_MS = 120000;
const teamErr = (code, msg) => Object.assign(new Error(msg), { code });

const b64 = b => Buffer.from(b).toString('base64');
const unb = s => Buffer.from(s, 'base64');
const u8 = b => new Uint8Array(b.buffer ? b : Buffer.from(b));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const rid = p => p + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));
// JSON con claves ordenadas: la firma no depende del orden de escritura
const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}'
    : JSON.stringify(v);

/* qué secciones puede leer una persona del manifiesto (quien lo creó, todas; el presupuesto, solo producción) */
const readSet = (mem, m) => permReadSet({ admin: !!m && mem.id === m.owner, role: mem.role, perms: mem.perms });
function aesEnc(key, buf) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([c.update(buf), c.final()]);
  return { iv: b64(iv), tag: b64(c.getAuthTag()), ct: b64(ct) };
}
function aesDec(key, o) {
  const d = crypto.createDecipheriv('aes-256-gcm', key, unb(o.iv));
  d.setAuthTag(unb(o.tag));
  return Buffer.concat([d.update(unb(o.ct)), d.final()]);
}
const kdf = (secret, salt, prm = KDF) => new Promise((res, rej) => crypto.scrypt(String(secret).normalize('NFC'), salt, 32, { ...prm, maxmem: 256 * prm.N * prm.r + 32 * 1024 * 1024 }, (e, k) => e ? rej(e) : res(k)));
function newPassword() {
  const A = 'abcdefghjkmnpqrstuvwxyz', D = '23456789', all = A + A.toUpperCase() + D;
  const pick = s => s[crypto.randomInt(s.length)];
  return [0, 1, 2].map(() => pick(A.toUpperCase()) + pick(A) + pick(A) + pick(D)).join('-');   // p. ej. Kmr4-Tpa7-Xhe2
}
function newRecovery() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => A[crypto.randomInt(A.length)]).join('')).join('-');
}
async function atomicWrite(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + '.' + crypto.randomBytes(3).toString('hex') + '.tmp';
  await fsp.writeFile(tmp, data);
  for (let i = 0; ; i++) {
    try { await fsp.rename(tmp, file); return; }
    catch (e) { if (i >= 10 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) { await fsp.unlink(tmp).catch(() => { }); throw e; } await sleep(80 * (i + 1)); }
  }
}
const readJSON = async f => JSON.parse(await fsp.readFile(f, 'utf8'));

class Team {
  constructor({ ext, appLabel, send, seenFile }) {
    this.ext = ext;
    this.seenFile = seenFile || null;
    this.FORMAT = ext + '-equipo-1';
    this.appLabel = appLabel;
    this.send = send || (() => { });
    this.S = new Map();       // pid -> sesión abierta
  }
  isFormat(fmt) { return String(fmt || '') === this.FORMAT; }
  files(dir) {
    return { eq: path.join(dir, 'equipo'), datos: path.join(dir, 'datos'), img: path.join(dir, 'imagenes') };
  }
  async manifestOf(file) {
    const m = await readJSON(file);
    if (!this.isFormat(m.format)) throw new Error('No es un proyecto compartido.');
    return m;
  }
  verifyManifest(m, adminSign) {
    const { sig, ...rest } = m;
    if (!sig || !nacl.sign.detached.verify(Buffer.from(canon(rest)), u8(unb(sig)), u8(unb(adminSign)))) throw new Error('El manifiesto del proyecto no tiene una firma válida del productor.');
    return m;
  }
  signManifest(S, m) {
    const { sig, ...rest } = m;
    m.sig = b64(nacl.sign.detached(Buffer.from(canon(rest)), S.signSK));
    return m;
  }
  async info(file) {
    const m = await this.manifestOf(file);
    return { id: m.id, title: m.title, owner: m.owner, licensee: m.licensee || '', members: m.members.filter(x => x.active !== false).map(x => ({ id: x.id, name: x.name, role: x.role })) };
  }

  /* ---------- crear identidades y llaves ---------- */
  async wrapSecrets(secrets, password, recovery) {
    const out = {};
    const salt = crypto.randomBytes(16);
    out.kdf = { salt: b64(salt), ...KDF };
    Object.assign(out, aesEnc(await kdf(password, salt), Buffer.from(JSON.stringify(secrets))));
    if (recovery) {
      const rs = crypto.randomBytes(16);
      out.rec = { salt: b64(rs), kdf: { ...KDF }, ...aesEnc(await kdf(recovery.replace(/-/g, '').toUpperCase(), rs), Buffer.from(JSON.stringify(secrets))) };
    }
    return out;
  }
  newIdentity(adminKeys) {
    const sign = nacl.sign.keyPair(), box = nacl.box.keyPair();
    return {
      pub: { sign: b64(sign.publicKey), box: b64(box.publicKey) },
      secrets: { signSK: b64(sign.secretKey), boxSK: b64(box.secretKey), adminSign: adminKeys ? adminKeys.sign : b64(sign.publicKey), adminBox: adminKeys ? adminKeys.box : b64(box.publicKey) },
    };
  }
  sealGrant(S, member) {
    const rs = readSet(member, S.manifest);
    const keys = {};
    for (const s of rs) if (S.keys[s]) keys[s] = b64(S.keys[s]);
    const nonce = nacl.randomBytes(24);
    // la revisión y la persona van dentro de la caja: nadie puede volver a poner un sobre viejo cambiándole el número
    const msg = Buffer.from(JSON.stringify({ pid: S.pid, mid: member.id, rev: S.manifest.rev, keys, gens: S.manifest.gens }));
    return { rev: S.manifest.rev, nonce: b64(nonce), box: b64(nacl.box(u8(msg), nonce, u8(unb(member.box)), S.boxSK)) };
  }

  /* ---------- convertir un proyecto en compartido ---------- */
  async create({ dir, title, pid, adminName, password, sections, frames, licensee }) {
    await fsp.mkdir(dir, { recursive: true });
    const exists = (await fsp.readdir(dir)).filter(f => !f.startsWith('.'));
    if (exists.length) throw new Error('La carpeta elegida no está vacía.');
    const id = this.newIdentity(null);
    const me = { id: rid('m'), name: adminName || 'Producción', role: 'Producción', perms: Object.fromEntries(SECS.map(s => [s, 'editar'])), sign: id.pub.sign, box: id.pub.box, active: true };
    const recovery = newRecovery();
    const S = {
      pid, dir, file: path.join(dir, safeFile(title) + '.' + this.ext), me, admin: true,
      signSK: u8(unb(id.secrets.signSK)), boxSK: u8(unb(id.secrets.boxSK)), adminSign: id.pub.sign, adminBox: id.pub.box,
      keys: Object.fromEntries(SECS.map(s => [s, crypto.randomBytes(32)])), vers: {}, plain: {}, seen: new Map(), frameFiles: new Map(), frameKeys: new Map(),
      keyGens: Object.fromEntries(SECS.map(s => [s, 1])),
    };
    S.manifest = { format: this.FORMAT, app: this.appLabel, id: pid, title, created: Date.now(), owner: me.id, licensee: licensee || '', admin: { sign: id.pub.sign, box: id.pub.box }, members: [me], gens: Object.fromEntries(SECS.map(s => [s, 1])), rev: 1 };
    const F = this.files(dir);
    await atomicWrite(path.join(F.eq, me.id + '.id'), JSON.stringify({ id: me.id, v: 1, ...(await this.wrapSecrets(id.secrets, password, recovery)) }));
    for (const s of SECS) await this.writeSection(S, s, sections[s] || '{}');
    for (const [k, u] of Object.entries(frames || {})) await this.writeFrame(S, k, u);
    await atomicWrite(path.join(F.eq, me.id + '.llaves'), JSON.stringify(this.sealGrant(S, me)));
    this.signManifest(S, S.manifest);
    await atomicWrite(S.file, JSON.stringify(S.manifest, null, 1));
    return { file: S.file, recovery };
  }

  /* ---------- entrar ---------- */
  async login(pid, file, memberId, secret, useRecovery) {
    const m = await this.manifestOf(file);
    const dir = path.dirname(file), F = this.files(dir);
    const mem = m.members.find(x => x.id === memberId && x.active !== false);
    if (!mem) throw new Error('Esa persona ya no está en el equipo.');
    let w;
    try { w = await readJSON(path.join(F.eq, memberId + '.id')); } catch (e) { throw new Error('Todavía no llega tu acceso a esta carpeta. Espera a que termine de sincronizar.'); }
    let secrets;
    try {
      const wrap = useRecovery ? w.rec : w;
      if (!wrap) throw new Error();
      // cada archivo dice con qué parámetros se cifró (los anteriores a esta versión, 2^15)
      const prm = useRecovery ? (wrap.kdf ? kdfParams(wrap.kdf) : KDF_OLD) : kdfParams(wrap.kdf);
      const key = await kdf(useRecovery ? String(secret).replace(/[-\s]/g, '').toUpperCase() : secret, unb(wrap.kdf && !useRecovery ? wrap.kdf.salt : wrap.salt), prm);
      secrets = JSON.parse(aesDec(key, wrap).toString('utf8'));
    } catch (e) { throw new Error(useRecovery ? 'El código de recuperación no es correcto.' : 'La contraseña no es correcta.'); }
    this.verifyManifest(m, secrets.adminSign);
    if (m.admin.sign !== secrets.adminSign) throw new Error('El proyecto fue alterado: el productor no coincide.');
    // una copia vieja del manifiesto (firmada, pero anterior a la última que este equipo vio) no se acepta: así nadie
    // con acceso a la carpeta puede deshacer una baja del equipo o un cambio de llaves restaurando archivos viejos
    const seen = this.seenOf(m.id);
    if ((m.rev || 1) < (seen.rev || 0)) throw new Error('La carpeta tiene una copia anterior del proyecto (alguien restauró archivos viejos). Avisa a producción: puede recuperar la última versión desde el historial de versiones de Google Drive, OneDrive o Dropbox.');
    if (mem.sign !== b64(nacl.sign.keyPair.fromSecretKey(u8(unb(secrets.signSK))).publicKey)) throw new Error('Tu acceso fue restablecido por el productor. Pídele tu nueva contraseña.');
    const S = {
      pid, dir, file, me: mem, admin: memberId === m.owner, manifest: m,
      signSK: u8(unb(secrets.signSK)), boxSK: u8(unb(secrets.boxSK)), adminSign: secrets.adminSign, adminBox: secrets.adminBox,
      keys: {}, vers: {}, plain: {}, seen: new Map(), frameFiles: new Map(), frameKeys: new Map(), secrets, wrap: w,
      minVers: seen.vers || {}, frameTs: { ...(seen.ft || {}) },
    };
    await this.openGrant(S);
    // contraseña cifrada con los parámetros anteriores: se vuelve a cifrar con los nuevos (más resistentes)
    if (!useRecovery && kdfParams(w.kdf).N < KDF.N) this.changePasswordS(S, secret).catch(() => { });
    if (S.admin) await this.addMissingSections(S);
    if (S.admin && S.grantLegacy) await this.resealGrants(S).catch(() => { });
    this.close(pid);
    this.S.set(pid, S);
    const sections = {};
    for (const s of SECS) sections[s] = S.keys[s] ? await this.readSection(S, s).catch(e => { if (/anterior/.test(e.message) || e.code) this.send('team-warn', pid, e.message); return null; }) : null;
    this.noteSeen(S);
    this.startPoll(S);
    return this.state(S, sections);
  }
  state(S, sections) {
    const m = S.manifest;
    return {
      pid: S.pid, title: m.title, dir: S.dir, file: S.file, licensee: m.licensee || '',
      me: { id: S.me.id, name: S.me.name, role: S.me.role }, admin: S.admin,
      perms: S.admin ? Object.fromEntries(SECS.map(s => [s, 'editar'])) : { ...S.me.perms },
      read: Object.keys(S.keys), sections, vers: { ...S.vers },
      unavailable: sections ? Object.keys(S.keys).filter(k => !sections[k]) : [],
      members: S.admin ? m.members.filter(x => x.active !== false).map(x => ({ id: x.id, name: x.name, role: x.role, perms: x.perms, owner: x.id === m.owner })) : undefined,
    };
  }
  /* proyectos compartidos con una versión anterior: el productor crea las llaves de las secciones nuevas */
  async addMissingSections(S) {
    const add = SECS.filter(s => !S.manifest.gens[s]);
    if (!add.length) return;
    const m = JSON.parse(JSON.stringify(S.manifest));
    for (const s of add) { S.keys[s] = crypto.randomBytes(32); m.gens[s] = 1; S.keyGens[s] = 1; }
    m.rev = (m.rev || 1) + 1;
    S.manifest = m;
    for (const s of add) await this.writeSection(S, s, '{}');
    const F = this.files(S.dir);
    for (const mem of m.members) if (mem.active !== false) await atomicWrite(path.join(F.eq, mem.id + '.llaves'), JSON.stringify(this.sealGrant(S, mem)));
    this.signManifest(S, m);
    const txt = JSON.stringify(m, null, 1);
    await atomicWrite(S.file, txt);
    S.seen.set(S.file, sha(txt));
    this.noteSeen(S, m.rev);
  }
  /* sobres en el formato actual (con revisión y persona dentro) para todo el equipo */
  async resealGrants(S) {
    const F = this.files(S.dir);
    for (const mem of S.manifest.members) if (mem.active !== false) await atomicWrite(path.join(F.eq, mem.id + '.llaves'), JSON.stringify(this.sealGrant(S, mem)));
    S.grantLegacy = false;
  }
  async openGrant(S, txt) {
    const g = txt ? JSON.parse(txt) : await readJSON(path.join(this.files(S.dir).eq, S.me.id + '.llaves'));
    const open = nacl.box.open(u8(unb(g.box)), u8(unb(g.nonce)), u8(unb(S.adminBox)), S.boxSK);
    if (!open) throw new Error('No se pudieron abrir tus llaves de acceso.');
    const o = JSON.parse(Buffer.from(open).toString('utf8'));
    if (o.pid !== S.pid && o.pid !== S.manifest.id) throw new Error('Llaves de otro proyecto.');
    // el sobre tiene que ser el de esta revisión del manifiesto y con sus mismas cerraduras: un sobre anterior (de antes
    // de un cambio de llaves) no se acepta aunque alguien le cambie el número de afuera
    // (los sobres de versiones anteriores no traen revisión ni persona: valen si sus cerraduras son las actuales, y el
    // productor los vuelve a escribir al entrar)
    const gens = o.gens || {}, legacy = o.rev === undefined && o.mid === undefined;
    if ((!legacy && (o.mid !== S.me.id || !(o.rev >= S.manifest.rev))) || Object.keys(o.keys || {}).some(k => gens[k] !== S.manifest.gens[k]))
      throw teamErr('pending', 'Todavía no llegan tus llaves de acceso actualizadas. Espera a que termine de sincronizar.');
    S.grantLegacy = legacy;
    S.keys = Object.fromEntries(Object.entries(o.keys).map(([k, v]) => [k, unb(v)]));
    S.keyGens = { ...gens };
  }
  /* lo último que este equipo vio de cada proyecto: revisión del manifiesto y [generación, versión] de cada sección */
  seenAll() {
    if (this.seenCache) return this.seenCache;
    try { this.seenCache = this.seenFile ? JSON.parse(fs.readFileSync(this.seenFile, 'utf8')) || {} : {}; } catch (e) { this.seenCache = {}; }
    return this.seenCache;
  }
  seenOf(id) { const v = this.seenAll()[id]; return v && typeof v === 'object' ? v : {}; }
  noteSeen(S, rev) {
    if (!this.seenFile || !S.manifest) return;
    const all = this.seenAll(), cur = this.seenOf(S.manifest.id), vers = { ...(cur.vers || {}) };
    for (const s of SECS) {
      const g = S.manifest.gens[s] || 1, v = S.vers[s] || 0, p = vers[s] || [0, 0];
      // [llave, versión, huella de la última versión aceptada]: desde ella se comprueba la cadena al volver a entrar
      if (v && (g > p[0] || (g === p[0] && v >= p[1]))) vers[s] = [g, v, (S.envh || {})[s] || p[2] || ''];
    }
    all[S.manifest.id] = { rev: Math.max(cur.rev || 0, rev || S.manifest.rev || 0), vers, ft: { ...(cur.ft || {}), ...(S.frameTs || {}) } };
    clearTimeout(this.seenT);
    this.seenT = setTimeout(() => { atomicWrite(this.seenFile, JSON.stringify(all)).catch(() => { }); }, 400);
  }
  has(pid) { return this.S.has(pid); }
  close(pid) { const S = this.S.get(pid); if (S) { clearInterval(S.timer); this.S.delete(pid); } }

  /* ---------- secciones ---------- */
  secFile(S, s) { return path.join(this.files(S.dir).datos, s + '.dat'); }
  sigText(pid, o) { return [pid, o.sec, o.gen, o.ver, o.by, o.ts, o.iv, o.tag, sha(o.ct), ...(o.prev != null ? ['p:' + o.prev] : [])].join('|'); }
  envId(S, o) { return sha(this.sigText(S.manifest.id, o)); }
  histDir(S) { return path.join(this.files(S.dir).datos, 'historial'); }
  histFile(S, s, id) { return path.join(this.histDir(S), s + '.' + String(id).replace(/[^0-9a-f]/g, '').slice(0, 40) + '.dat'); }
  /* cambios que se comprueban contra la versión de la que parten: los de un jefe de área en el desglose y todo cambio
     del guion (que puede estar cerrado). El productor y quien edita todo el desglose no tienen límites que comprobar */
  constrained(S, s, by) {
    if (by === S.manifest.owner) return false;
    if (s === 'guion') return true;
    if (s !== 'desglose') return false;
    const mem = S.manifest.members.find(x => x.id === by) || {};
    return !!(mem.perms && mem.perms.desglose === 'editar' && Array.isArray(mem.perms.areas));
  }
  stepErr(S, s, by, before, after) {
    const mem = S.manifest.members.find(x => x.id === by) || {};
    if (s === 'desglose') {
      const areas = mem.perms && Array.isArray(mem.perms.areas) ? mem.perms.areas : [];
      return bdViolates(JSON.parse(before), JSON.parse(after), areas) ? `${mem.name || 'Alguien'} cambió áreas del desglose que no le corresponden` : null;
    }
    const err = this.lockErr(S, by, before, after);
    return err ? `${mem.name || 'Alguien'} cambió el guion cerrado sin autorización: ${LOCK_MSG[err] || err}` : null;
  }
  async readHist(S, s, id) {
    const f = this.histFile(S, s, id);
    let txt;
    try { txt = await fsp.readFile(f, 'utf8'); } catch (e) { return null; }
    const p = JSON.parse(txt);
    if (p.sec !== s || this.envId(S, p) !== id) throw teamErr('unverified', `${path.basename(f)}: el historial no coincide`);
    if (p.gen !== S.manifest.gens[s]) throw teamErr('unverified', 'el cambio parte de una versión con otra llave');
    this.verifyItem(S, p, f);
    return { o: p, json: zlib.inflateRawSync(aesDec(S.keys[s], p)).toString('utf8') };
  }
  /* la cadena desde una versión ya aceptada (o desde una del productor o de alguien sin límites) hasta la nueva: cada
     paso de alguien con límites se compara con el anterior. Así no sirve saltarse números de versión ni esperar a que
     los demás estén desconectados */
  async verifyChain(S, s, o, json) {
    const ok = (S.okIds = S.okIds || {})[s] = S.okIds[s] || new Map();
    if (S.envh && S.envh[s] && S.plain[s] != null) ok.set(S.envh[s], S.plain[s]);
    const seenId = S.minVers && S.minVers[s] && S.minVers[s][2];
    // primera vez en esta computadora: no hay de dónde partir (como entrar al proyecto por primera vez)
    if (!ok.size && !seenId) return;
    const who = (S.manifest.members.find(x => x.id === o.by) || {}).name || 'alguien';
    const chain = [{ o, json }];
    let cur = o, before = null;
    for (let n = 0; ; n++) {
      if (!cur.prev) throw teamErr('unverified', `No se pudo comprobar el cambio de ${who} en ${s}: no dice de qué versión parte.`);
      if (ok.has(cur.prev)) { before = ok.get(cur.prev); if (before == null) { const h = await this.readHist(S, s, cur.prev); if (!h) throw teamErr('unverified', `No se pudo comprobar el cambio de ${who} en ${s}.`); before = h.json; } break; }
      if (n >= HIST_MAX) throw teamErr('unverified', `No se pudo comprobar el cambio de ${who} en ${s}: parte de una versión demasiado antigua.`);
      const h = await this.readHist(S, s, cur.prev);
      if (!h) throw teamErr('pending', `La versión de la que parte el cambio de ${who} aún no llega.`);
      // punto de partida de confianza: la última versión que vimos, una propia, o una de alguien sin límites
      if (cur.prev === seenId || h.o.by === S.me.id || !this.constrained(S, s, h.o.by)) { before = h.json; break; }
      chain.unshift(h); cur = h.o;
    }
    for (const c of chain) {
      if (c.o.by !== S.me.id && this.constrained(S, s, c.o.by)) { const err = this.stepErr(S, s, c.o.by, before, c.json); if (err) throw teamErr('violation', err); }
      before = c.json;
    }
  }
  /* las últimas versiones aceptadas (dos personas pueden partir de la misma) */
  accepted(S, s, id, json) {
    const ok = (S.okIds = S.okIds || {})[s] = S.okIds[s] || new Map();
    ok.delete(id); ok.set(id, json);
    while (ok.size > 6) ok.delete(ok.keys().next().value);
    (S.envh = S.envh || {})[s] = id;
  }
  async pruneHist(S, s) {
    const dir = this.histDir(S);
    let names;
    try { names = (await fsp.readdir(dir)).filter(n => n.startsWith(s + '.') && n.endsWith('.dat')); } catch (e) { return; }
    if (names.length <= HIST_MAX + 10) return;
    const st = [];
    for (const n of names) { try { st.push([n, (await fsp.stat(path.join(dir, n))).mtimeMs]); } catch (e) { } }
    st.sort((a, b) => a[1] - b[1]);
    for (const [n] of st.slice(0, st.length - HIST_MAX)) await fsp.unlink(path.join(dir, n)).catch(() => { });
  }
  canWrite(m, by, sec) {
    const mem = m.members.find(x => x.id === by && x.active !== false);
    if (!mem) return null;
    return permCanEdit({ admin: by === m.owner, role: mem.role, perms: mem.perms }, sec) ? mem : null;
  }
  verifyItem(S, o, file) {
    const m = S.manifest;
    const mem = this.canWrite(m, o.by, o.sec);
    if (!mem) throw new Error(`${path.basename(file)}: escrito por alguien sin permiso de edición`);
    if (!nacl.sign.detached.verify(Buffer.from(this.sigText(S.manifest.id, o)), u8(unb(o.sig)), u8(unb(mem.sign)))) throw new Error(`${path.basename(file)}: firma inválida`);
    return mem;
  }
  async writeSection(S, s, json, verHint) {
    const m = S.manifest, gen = m.gens[s];
    // nunca se cifra con una llave que no es la de la cerradura actual (también en la reparación automática)
    if (!S.keyGens || S.keyGens[s] !== gen) throw teamErr('pending', 'Tus llaves de acceso no están al día.');
    // la versión siempre sube respecto de la que hay en la carpeta (los demás rechazan versiones anteriores)
    let onDisk = 0;
    try { const c = JSON.parse(await fsp.readFile(this.secFile(S, s), 'utf8')); if (c && c.gen === gen && c.sec === s) onDisk = +c.ver || 0; } catch (e) { }
    const o = { sec: s, gen, ver: Math.max(S.vers[s] || 0, verHint || 0, onDisk) + 1, by: S.me.id, ts: Date.now() };
    Object.assign(o, aesEnc(S.keys[s], zlib.deflateRawSync(Buffer.from(json, 'utf8'))));
    // de qué versión parte (la última que esta computadora aceptó): firmado junto con lo demás
    o.prev = (S.envh || {})[s] || '';
    o.sig = b64(nacl.sign.detached(Buffer.from(this.sigText(m.id, o)), S.signSK));
    const txt = JSON.stringify(o);
    const f = this.secFile(S, s), id = this.envId(S, o);
    await atomicWrite(this.histFile(S, s, id), txt);
    await atomicWrite(f, txt);
    this.pruneHist(S, s).catch(() => { });
    S.vers[s] = o.ver; (S.vgen = S.vgen || {})[s] = gen; S.plain[s] = json;
    this.accepted(S, s, id, json);
    S.seen.set(f, sha(txt));
    this.noteSeen(S);
    return o.ver;
  }
  async readSection(S, s, txt) {
    const f = this.secFile(S, s);
    if (txt == null) { try { txt = await fsp.readFile(f, 'utf8'); } catch (e) { return null; } }
    const o = JSON.parse(txt);
    // la firma dice para qué sección es: un archivo firmado para otra sección (por ejemplo, alguien que solo edita la
    // hoja de script copiándolo sobre el guion) no se acepta
    if (o.sec !== s) throw new Error(`${path.basename(f)}: el archivo es de otra sección`);
    this.verifyItem(S, o, f);
    if (o.gen !== S.manifest.gens[s]) throw new Error('versión de llave antigua');
    // se compara (llave, versión): con una llave nueva la cuenta de versiones puede empezar más abajo
    const mv = S.minVers && S.minVers[s], cur = S.vers[s] || 0, cg = (S.vgen || {})[s] || 0;
    if ((mv && (o.gen < mv[0] || (o.gen === mv[0] && o.ver < mv[1]))) || o.gen < cg || (o.gen === cg && o.ver < cur)) throw new Error(`${path.basename(f)}: es una versión anterior a la que ya tenías (¿alguien restauró un archivo viejo?)`);
    const json = zlib.inflateRawSync(aesDec(S.keys[s], o)).toString('utf8');
    // jefe de área (solo sus cajas del desglose) y guion cerrado (solo en una revisión abierta y por quien producción
    // autorizó): se comprueba cada paso desde la última versión aceptada (verifyChain)
    if (o.by !== S.me.id && this.constrained(S, s, o.by)) await this.verifyChain(S, s, o, json);
    S.vers[s] = o.ver; (S.vgen = S.vgen || {})[s] = o.gen; S.plain[s] = json;
    this.accepted(S, s, this.envId(S, o), json);
    S.seen.set(f, sha(txt));
    this.noteSeen(S);
    return { json, ver: o.ver, by: o.by, ts: o.ts };
  }
  lockErr(S, by, before, after) {
    try {
      const mem = S.manifest.members.find(x => x.id === by) || {};
      return scriptLockCheck(JSON.parse(before), JSON.parse(after), { id: by, owner: by === S.manifest.owner, producer: PRODUCER_ROLES.includes(mem.role), canEdit: by === S.manifest.owner || (mem.perms || {}).guion === 'editar' });
    } catch (e) { return null; }
  }
  async save(pid, s, json) {
    const S = this.S.get(pid);
    if (!S) throw new Error('Sesión cerrada');
    if (!S.admin && (S.me.perms || {})[s] !== 'editar') throw new Error('Sin permiso de edición');
    if (!S.keys[s]) throw new Error('Sin llave');
    // el resto del equipo lo rechazaría: mejor avisar aquí
    if (s === 'guion' && S.plain.guion != null) { const err = this.lockErr(S, S.me.id, S.plain.guion, json); if (err) throw new Error(LOCK_MSG[err] || err); }
    // otra persona guardó esta sección después de lo último que leímos (la revisión de la carpeta es cada 2 s): no se
    // pisa. Se lee su versión, la app la fusiona con lo tuyo (contra la versión de la que partiste) y vuelve a guardar
    const f = this.secFile(S, s);
    try {
      const txt = await fsp.readFile(f, 'utf8'), c = JSON.parse(txt);
      if (c && c.sec === s && c.gen === S.manifest.gens[s] && c.by !== S.me.id && (+c.ver || 0) > (S.vers[s] || 0) && S.seen.get(f) !== sha(txt)) {
        const r = await this.readSection(S, s, txt);
        if (r) {
          const by = (S.manifest.members.find(x => x.id === r.by) || {}).name || 'Alguien';
          this.send('team-update', S.pid, { sec: s, json: r.json, ver: r.ver, by, mine: false });
          return { conflict: true };
        }
      }
    } catch (e) { }
    return { ver: await this.writeSection(S, s, json) };
  }

  /* ---------- imágenes del storyboard y fotos del desglose ---------- */
  frameFile(S, k) { return path.join(this.files(S.dir).img, sha(S.manifest.id + ':' + k).slice(0, 32) + '.dat'); }
  async writeFrame(S, k, url) {
    const f = this.frameFile(S, k);
    if (!url) { await fsp.unlink(f).catch(() => { }); S.frameFiles.delete(f); S.seen.delete(f); return; }
    const sec = frameSec(k);
    if (!S.keys[sec]) throw new Error('Sin acceso a esa sección');
    if (!S.keyGens || S.keyGens[sec] !== S.manifest.gens[sec]) throw teamErr('pending', 'Tus llaves de acceso no están al día.');
    const o = { sec, gen: S.manifest.gens[sec], ver: 1, by: S.me.id, ts: Math.max(Date.now(), ((S.frameTs || {})[path.basename(f)] || 0) + 1) };
    Object.assign(o, aesEnc(S.keys[sec], Buffer.from(JSON.stringify({ k, u: url }), 'utf8')));
    o.sig = b64(nacl.sign.detached(Buffer.from(this.sigText(S.manifest.id, o)), S.signSK));
    const txt = JSON.stringify(o);
    await atomicWrite(f, txt);
    S.frameFiles.set(f, k); S.seen.set(f, sha(txt));
    (S.frameTs = S.frameTs || {})[path.basename(f)] = o.ts;
  }
  async saveFrame(pid, k, url) {
    const S = this.S.get(pid);
    if (!S) throw new Error('Sesión cerrada');
    if (!S.admin && (S.me.perms || {})[frameSec(k)] !== 'editar') throw new Error('Sin permiso de edición');
    await this.writeFrame(S, k, url);
  }
  async readFrame(S, f, txt) {
    const o = JSON.parse(txt);
    if (!FRAME_SECS.includes(o.sec)) throw new Error('imagen firmada para otra sección');
    const sec = o.sec;
    if (!S.keys[sec]) throw new Error('sin acceso');
    this.verifyItem(S, o, f);
    if (o.gen !== S.manifest.gens[sec]) throw new Error('versión de llave antigua');
    const { k, u } = JSON.parse(aesDec(S.keys[sec], o).toString('utf8'));
    if (frameSec(k) !== sec) throw new Error('imagen en una sección que no le corresponde');
    // el nombre del archivo sale de la clave de la imagen: copiar una imagen encima de otra no la reemplaza
    if (path.basename(this.frameFile(S, k)) !== path.basename(f)) throw new Error('imagen en un archivo que no le corresponde');
    // una imagen anterior (restaurada en la carpeta) no reemplaza a la que ya viste
    const ft = S.frameTs = S.frameTs || {}, base = path.basename(f);
    if (!(+o.ts > 0) || +o.ts < (ft[base] || 0)) throw new Error('imagen anterior a la que ya tenías');
    ft[base] = +o.ts;
    S.frameFiles.set(f, k); S.seen.set(f, sha(txt));
    this.noteSeen(S);
    return { k, u };
  }
  async loadFrames(pid) {
    const S = this.S.get(pid);
    if (!S || !hasFrameKey(S)) return {};
    const out = {}, dir = this.files(S.dir).img;
    let list = [];
    try { list = (await fsp.readdir(dir)).filter(f => f.endsWith('.dat')); } catch (e) { }
    for (const n of list) {
      const f = path.join(dir, n);
      try { const { k, u } = await this.readFrame(S, f, await fsp.readFile(f, 'utf8')); out[k] = u; } catch (e) { }
    }
    return out;
  }

  /* ---------- sincronización: revisa la carpeta cada 2 s ---------- */
  startPoll(S) {
    clearInterval(S.timer);
    S.busy = false;
    S.timer = setInterval(() => { if (!S.busy) { S.busy = true; this.poll(S).catch(() => { }).finally(() => { S.busy = false; }); } }, POLL_MS);
  }
  async changedText(S, f) {
    let st;
    try { st = await fsp.stat(f); } catch (e) { return null; }
    const mark = st.mtimeMs + ':' + st.size;
    if (S.stat && S.stat.get(f) === mark) return null;
    (S.stat = S.stat || new Map()).set(f, mark);
    let txt;
    try { txt = await fsp.readFile(f, 'utf8'); } catch (e) { return null; }
    if (S.seen.get(f) === sha(txt)) return null;
    return txt;
  }
  async poll(S) {
    if (this.S.get(S.pid) !== S) return;
    // 1) manifiesto (equipo, permisos o llaves cambiaron)
    const mt = await this.changedText(S, S.file);
    if (mt) {
      let m;
      try { m = this.verifyManifest(JSON.parse(mt), S.adminSign); } catch (e) { m = null; }
      if (m && m.rev > S.manifest.rev) {
        S.seen.set(S.file, sha(mt));
        this.noteSeen(S, m.rev);
        const me = m.members.find(x => x.id === S.me.id && x.active !== false);
        if (!me || me.sign !== S.me.sign) { this.close(S.pid); this.send('team-revoked', S.pid); return; }
        const before = JSON.stringify([S.me.perms, S.manifest.gens]);
        S.manifest = m; S.me = me;
        if (JSON.stringify([me.perms, m.gens]) !== before) {
          // permisos o cerraduras nuevas: hay que esperar a que llegue el sobre de llaves actualizado
          S.needReload = true;
        } else this.send('team-manifest', S.pid, this.state(S, null));
      }
    }
    // 2) sobre de llaves
    const gf = path.join(this.files(S.dir).eq, S.me.id + '.llaves');
    const gt = await this.changedText(S, gf);
    if (gt || S.needReload) {
      try {
        const g = JSON.parse(gt || await fsp.readFile(gf, 'utf8'));
        if (g.rev >= S.manifest.rev) {
          await this.openGrant(S, gt || null);
          S.seen.set(gf, sha(JSON.stringify(g)));
          if (S.needReload) {
            S.needReload = false;
            const sections = {};
            for (const s of SECS) sections[s] = S.keys[s] ? await this.readSection(S, s).catch(() => null) : null;
            S.frameFiles.clear();
            this.send('team-reload', S.pid, this.state(S, sections));
            return;
          }
        }
      } catch (e) { }
    }
    if (S.needReload) return;
    // 3) secciones
    for (const s of SECS) {
      if (!S.keys[s]) continue;
      const f = this.secFile(S, s);
      const txt = await this.changedText(S, f);
      if (!txt) continue;
      try {
        const r = await this.readSection(S, s, txt);
        if (r) {
          const by = (S.manifest.members.find(x => x.id === r.by) || {}).name || '';
          this.send('team-update', S.pid, { sec: s, json: r.json, ver: r.ver, by, mine: r.by === S.me.id });
        }
      } catch (e) {
        // llega antes que el manifiesto o antes que la versión de la que parte: se reintenta (un tiempo)
        const pend = S.pend = S.pend || new Map(), k = f + '|' + sha(txt);
        if (/llave/.test(e.message) || e.code === 'pending') {
          if (!pend.has(k)) pend.set(k, Date.now());
          if (Date.now() - pend.get(k) < PEND_MS) { S.stat && S.stat.delete(f); continue; }
          e = teamErr('unverified', e.message + ' No se aplicó.');
        }
        pend.delete(k);
        this.send('team-warn', S.pid, String(e.message || e)); S.seen.set(f, sha(txt));
        // el productor repara la sección con la última versión válida que tiene (si el cambio solo no se pudo
        // comprobar, no: podría borrar trabajo bueno que aún no llega)
        if (S.admin && S.plain[s] != null && e.code !== 'unverified') await this.writeSection(S, s, S.plain[s]).catch(() => { });
      }
    }
    // 4) imágenes
    if (hasFrameKey(S)) {
      const dir = this.files(S.dir).img;
      let list = [], listed = false;
      try { list = (await fsp.readdir(dir)).filter(f => f.endsWith('.dat')).map(n => path.join(dir, n)); listed = true; } catch (e) { }
      const now = new Set(list);
      for (const f of list) {
        const txt = await this.changedText(S, f);
        if (!txt) continue;
        try { const { k, u } = await this.readFrame(S, f, txt); this.send('team-frame', S.pid, { k, u }); }
        catch (e) { if (/llave/.test(e.message)) S.stat && S.stat.delete(f); else S.seen.set(f, sha(txt)); }
      }
      // si la carpeta no se pudo leer (un error pasajero de la nube), no se dan por borradas
      if (listed) for (const [f, k] of [...S.frameFiles]) if (!now.has(f)) { S.frameFiles.delete(f); S.stat && S.stat.delete(f); this.send('team-frame', S.pid, { k, u: null }); }
    }
  }

  /* ---------- administración del equipo (solo el productor) ---------- */
  async updateTeam(pid, changes) {
    const S = this.S.get(pid);
    if (!S || !S.admin) throw new Error('Solo el productor administra el equipo.');
    const m = JSON.parse(JSON.stringify(S.manifest));
    const F = this.files(S.dir);
    const passwords = {};
    const lostRead = new Set();          // secciones que alguien deja de poder leer → cambiar cerraduras
    const adminKeys = { sign: S.adminSign, box: S.adminBox };
    for (const c of changes) {
      if (c.add) {
        const id = this.newIdentity(adminKeys), pw = c.password || newPassword();
        const mem = { id: rid('m'), name: c.name, role: c.role || '', perms: cleanPerms(c.perms), sign: id.pub.sign, box: id.pub.box, active: true };
        await atomicWrite(path.join(F.eq, mem.id + '.id'), JSON.stringify({ id: mem.id, v: 1, ...(await this.wrapSecrets(id.secrets, pw)) }));
        m.members.push(mem);
        passwords[mem.id] = pw;
        continue;
      }
      const mem = m.members.find(x => x.id === c.id);
      if (!mem || mem.id === m.owner) continue;
      const before = readSet(mem, m);
      if (c.remove) {
        mem.active = false;
        for (const s of before) lostRead.add(s);
        await fsp.unlink(path.join(F.eq, mem.id + '.llaves')).catch(() => { });
        await fsp.unlink(path.join(F.eq, mem.id + '.id')).catch(() => { });
        continue;
      }
      if (c.name) mem.name = c.name;
      if (c.role != null) mem.role = c.role;
      if (c.perms) mem.perms = cleanPerms(c.perms);
      // el cargo también cuenta: quien deja de ser de producción deja de leer el presupuesto
      if (c.role != null || c.perms) { const after = readSet(mem, m); for (const s of before) if (!after.has(s)) lostRead.add(s); }
      if (c.reset) {
        // contraseña nueva = identidad nueva; la anterior deja de valer
        const id = this.newIdentity(adminKeys), pw = c.password || newPassword();
        mem.sign = id.pub.sign; mem.box = id.pub.box;
        await atomicWrite(path.join(F.eq, mem.id + '.id'), JSON.stringify({ id: mem.id, v: 1, ...(await this.wrapSecrets(id.secrets, pw)) }));
        passwords[mem.id] = pw;
        for (const s of before) lostRead.add(s);
      }
    }
    m.rev = (m.rev || 1) + 1;
    // cambiar cerraduras: llave nueva y se vuelve a cifrar lo que alguien dejó de poder leer
    // lo último de cada sección: primero lo que está en la carpeta (pudo llegar un cambio de alguien después de lo que
    // tenemos en memoria), si no, lo que tenemos
    const plains = {};
    for (const s of lostRead) { const r = await this.readSection(S, s).catch(() => null); plains[s] = r ? r.json : S.plain[s]; }
    // las imágenes de toda sección que cambia de llave (también las del scouting y las del punto de encuentro)
    const oldFrames = [...lostRead].some(s => FRAME_SECS.includes(s)) ? await this.loadFrames(pid) : null;
    for (const s of lostRead) { S.keys[s] = crypto.randomBytes(32); m.gens[s] = (m.gens[s] || 1) + 1; S.keyGens[s] = m.gens[s]; }
    S.manifest = m;
    for (const s of lostRead) if (plains[s] != null) await this.writeSection(S, s, plains[s]);
    if (oldFrames) for (const [k, u] of Object.entries(oldFrames)) if (lostRead.has(frameSec(k))) await this.writeFrame(S, k, u);
    S.manifest = m;
    for (const mem of m.members) if (mem.active !== false) await atomicWrite(path.join(F.eq, mem.id + '.llaves'), JSON.stringify(this.sealGrant(S, mem)));
    this.signManifest(S, m);
    const txt = JSON.stringify(m, null, 1);
    await atomicWrite(S.file, txt);
    S.seen.set(S.file, sha(txt));
    this.noteSeen(S, m.rev);
    return { passwords, state: this.state(S, null), rekeyed: [...lostRead] };
  }
  async changePassword(pid, newPw) {
    const S = this.S.get(pid);
    if (!S) throw new Error('Sesión cerrada');
    return this.changePasswordS(S, newPw);
  }
  async changePasswordS(S, newPw) {
    const f = path.join(this.files(S.dir).eq, S.me.id + '.id');
    const w = await readJSON(f);
    const fresh = await this.wrapSecrets(S.secrets || {
      signSK: b64(S.signSK), boxSK: b64(S.boxSK), adminSign: S.adminSign, adminBox: S.adminBox,
    }, newPw);
    if (w.rec) fresh.rec = w.rec;       // el código de recuperación del productor se mantiene
    await atomicWrite(f, JSON.stringify({ id: S.me.id, v: 1, ...fresh }));
  }
}
function safeFile(s) {
  return String(s || 'Proyecto').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[<>:"/\\|?*\x00-\x1F]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80).replace(/[. ]+$/, '') || 'Proyecto';
}
module.exports = { Team, SECS, DEPS: SEC_DEPS, readSet, newPassword, safeFile };
