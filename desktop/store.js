/* ============================================================
   Proyectos en disco: cada proyecto es un archivo .fsp (JSON; la extensión sale de brand.json, «fileExt»)
   - los .fmst de versiones anteriores se siguen listando, abriendo y respaldando
   - guardado atómico (archivo temporal + renombrar)
   - respaldos automáticos cada 10 minutos (se conservan 15 por proyecto)
   - recuperación desde el último respaldo si el archivo está dañado
   ============================================================ */
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const BACKUP_EVERY = 10 * 60 * 1000;
const BACKUP_KEEP = 15;
/* los ids de proyecto: letras, números, - y _ (así los crea el programa) */
const ID_OK = id => typeof id === 'string' && /^[\w-]{1,64}$/.test(id);

const safeName = s => String(s || 'Proyecto').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80).replace(/[. ]+$/, '') || 'Proyecto';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stamp = (d = new Date()) => d.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');

class ProjectStore {
  constructor({ root, userData, ext, legacy, appLabel, onError }) {
    this.root = root;
    this.ext = ext;
    this.exts = [...new Set([ext, ...(legacy || [])].filter(Boolean).map(e => String(e).toLowerCase()))];
    this.FORMAT = ext + '-1';
    this.appLabel = appLabel;
    this.idxPath = path.join(userData, 'proyectos.json');
    this.backRoot = path.join(root, 'Respaldos');
    this.docs = new Map();      // pid -> { path, doc, auto, lastBackup, chain, timer, waiters }
    this.onError = onError || (() => { });
    this.idx = [];
  }
  async init() {
    await fsp.mkdir(this.root, { recursive: true });
    try { this.idx = JSON.parse(await fsp.readFile(this.idxPath, 'utf8')) || []; } catch (e) { this.idx = []; }
  }
  async saveIndex() {
    const tmp = this.idxPath + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(this.idx, null, 1));
    await this.replace(tmp, this.idxPath);
  }
  entry(pid) { return this.idx.find(x => x.id === pid); }
  isProjFile(f) { const l = String(f).toLowerCase(); return this.exts.some(e => l.endsWith('.' + e)); }
  async replace(tmp, dest) {
    // en Windows el antivirus o la sincronización pueden bloquear el archivo un instante
    for (let i = 0; ; i++) {
      try { await fsp.rename(tmp, dest); return; }
      catch (e) { if (i >= 8 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e; await sleep(60 * (i + 1)); }
    }
  }
  /* lee solo la cabecera (id, título, fecha) sin cargar imágenes */
  async peek(file) {
    let fh;
    try {
      fh = await fsp.open(file, 'r');
      const buf = Buffer.alloc(4096);
      const { bytesRead } = await fh.read(buf, 0, 4096, 0);
      const head = buf.slice(0, bytesRead).toString('utf8');
      const id = /"id"\s*:\s*"([^"]+)"/.exec(head), title = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(head), up = /"updated"\s*:\s*(\d+)/.exec(head);
      const fm = /"format"\s*:\s*"([a-z0-9]+)-(equipo-)?\d+"/.exec(head);
      if (!fm || !id) return null;
      return { id: id[1], title: title ? JSON.parse('"' + title[1] + '"') : 'Sin título', updated: up ? +up[1] : 0, shared: !!fm[2] };
    } catch (e) { return null; } finally { if (fh) await fh.close(); }
  }
  async list() {
    // proyectos conocidos + los que aparezcan en la carpeta por defecto
    let changed = false;
    try {
      for (const f of await fsp.readdir(this.root)) {
        if (!this.isProjFile(f)) continue;
        const full = path.join(this.root, f);
        if (this.idx.some(x => samePath(x.path, full))) continue;
        const h = await this.peek(full);
        if (!h || !ID_OK(h.id)) continue;      // sin cabecera o con un id que el programa no crea: se abre con «Abrir», que le da uno nuevo
        if (this.entry(h.id)) continue;      // copia de un proyecto que ya está en otro lugar
        this.idx.push({ ...h, path: full }); changed = true;
      }
    } catch (e) { }
    const out = [];
    for (const x of this.idx) {
      if (this.docs.has(x.id)) { out.push(x); continue; }
      if (fs.existsSync(x.path)) out.push(x);
    }
    if (out.length !== this.idx.length) { this.idx = out; changed = true; }
    if (changed) await this.saveIndex().catch(() => { });
    return out.map(x => ({ id: x.id, title: x.title, updated: x.updated, path: x.path, shared: !!x.shared })).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  }
  async readDoc(file) {
    const txt = await fsp.readFile(file, 'utf8');
    const doc = JSON.parse(txt);
    if (!doc || !/^[a-z0-9]+-\d+$/.test(String(doc.format || ''))) throw new Error('formato');
    return doc;
  }
  async backupsOf(pid) {
    const dir = this.backupDir(pid);
    try { return (await fsp.readdir(dir)).filter(f => this.isProjFile(f)).sort().reverse().map(f => path.join(dir, f)); } catch (e) { return []; }
  }
  backupDir(pid) {
    const e = this.entry(pid);
    // la carpeta lleva solo letras, números, - y _ del id: un id armado a mano («x/../..») no puede salir de los respaldos
    return path.join(this.backRoot, safeName(e ? e.title : 'Proyecto') + ' · ' + String(pid).replace(/[^\w-]/g, '').slice(-6));
  }
  async open(pid) {
    if (this.docs.has(pid)) return this.docs.get(pid);
    const e = this.entry(pid);
    if (!e) return null;
    let doc, recovered = false;
    try { doc = await this.readDoc(e.path); }
    catch (err) {
      // archivo dañado o incompleto: se intenta el respaldo más reciente
      for (const b of await this.backupsOf(pid)) { try { doc = await this.readDoc(b); recovered = b; break; } catch (e2) { } }
      if (!doc) throw err;
    }
    const st = { path: e.path, doc, auto: !!e.auto, lastBackup: recovered ? Date.now() : 0, chain: Promise.resolve(), timer: null, waiters: [], recovered };
    this.docs.set(pid, st);
    if (recovered) {
      // se aparta el archivo dañado y se repara con el respaldo
      await fsp.rename(e.path, e.path + '.dañado-' + stamp()).catch(() => { });
      await this.write(pid, 0).catch(() => { });
      st.recovered = recovered;
    }
    return st;
  }
  async load(pid) {
    const st = await this.open(pid);
    if (!st) return null;
    const d = st.doc;
    return { script: JSON.stringify(d.script || { paras: [] }), data: JSON.stringify(d.data || {}), path: st.path, recovered: st.recovered || false };
  }
  async loadFrames(pid) {
    const st = await this.open(pid);
    return st ? (st.doc.frames || {}) : {};
  }
  async uniquePath(dir, base) {
    let p = path.join(dir, base + '.' + this.ext), n = 2;
    while (fs.existsSync(p)) p = path.join(dir, `${base} (${n++}).${this.ext}`);
    return p;
  }
  async ensure(pid, title) {
    if (this.docs.has(pid)) return this.docs.get(pid);
    if (this.entry(pid)) return this.open(pid);
    const file = await this.uniquePath(this.root, safeName(title));
    const doc = { format: this.FORMAT, app: this.appLabel, id: pid, title: title || 'Sin título', updated: Date.now(), script: { paras: [] }, data: {}, frames: {} };
    this.idx.push({ id: pid, title: doc.title, updated: doc.updated, path: file, auto: true });
    await this.saveIndex();
    const st = { path: file, doc, auto: true, lastBackup: Date.now(), chain: Promise.resolve(), timer: null, waiters: [], fresh: true };
    this.docs.set(pid, st);
    return st;
  }
  /* guarda guion y/o datos; se resuelve cuando ya está escrito en disco */
  async save(pid, title, parts) {
    const st = await this.ensure(pid, title);
    if (parts.script != null) st.doc.script = JSON.parse(parts.script);
    if (parts.data != null) st.doc.data = JSON.parse(parts.data);
    if (title && title !== st.doc.title) { st.doc.title = title; st.retitle = true; }
    return this.write(pid, 0);
  }
  async saveFrame(pid, key, url) {
    const st = this.docs.get(pid) || await this.ensure(pid, 'Proyecto');
    st.doc.frames = st.doc.frames || {};
    if (url) st.doc.frames[key] = url; else delete st.doc.frames[key];
    return this.write(pid, 250);    // agrupa varias imágenes seguidas en una sola escritura
  }
  write(pid, delay) {
    const st = this.docs.get(pid);
    return new Promise((res, rej) => {
      st.waiters.push([res, rej]);
      clearTimeout(st.timer);
      st.timer = setTimeout(() => {
        const ws = st.waiters; st.waiters = [];
        st.chain = st.chain.then(() => this.writeNow(pid)).then(() => ws.forEach(w => w[0](st.path)), err => { this.onError(err); ws.forEach(w => w[1](err)); });
      }, delay);
    });
  }
  async writeNow(pid) {
    const st = this.docs.get(pid);
    if (!st) return;
    const e = this.entry(pid);
    // si el proyecto vive en la carpeta por defecto con nombre automático, el archivo sigue al título
    if (st.retitle && st.auto && e && path.dirname(st.path) === this.root) {
      const want = safeName(st.doc.title);
      // un .fmst de una versión anterior pasa a .fsp al cambiar de nombre
      if (path.basename(st.path, path.extname(st.path)) !== want || path.extname(st.path).slice(1).toLowerCase() !== this.ext) {
        const np = await this.uniquePath(this.root, want);
        if (fs.existsSync(st.path)) await fsp.rename(st.path, np).catch(() => { });
        st.path = np;
      }
    }
    st.retitle = false;
    await fsp.mkdir(path.dirname(st.path), { recursive: true });
    if (!st.fresh && Date.now() - st.lastBackup > BACKUP_EVERY && fs.existsSync(st.path)) await this.backup(pid, st).catch(() => { });
    st.doc.updated = Date.now();
    st.doc.app = this.appLabel;
    // cabecera primero: permite listar proyectos leyendo solo el inicio del archivo
    const { format, app, id, title, updated, script, data, frames } = st.doc;
    const txt = JSON.stringify({ format, app, id, title, updated, script, data, frames: frames || {} });
    const tmp = st.path + '.guardando';
    await fsp.writeFile(tmp, txt);
    await this.replace(tmp, st.path);
    st.fresh = false;
    st.recovered = false;
    if (e) { e.title = title; e.updated = updated; e.path = st.path; await this.saveIndex().catch(() => { }); }
  }
  async backup(pid, st) {
    const dir = this.backupDir(pid);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.copyFile(st.path, path.join(dir, stamp() + '.' + this.ext));
    st.lastBackup = Date.now();
    const all = await this.backupsOf(pid);
    for (const old of all.slice(BACKUP_KEEP)) await fsp.unlink(old).catch(() => { });
  }
  async flushAll() {
    const jobs = [];
    for (const [pid, st] of this.docs) {
      if (st.timer && st.waiters.length) { clearTimeout(st.timer); const ws = st.waiters; st.waiters = []; st.chain = st.chain.then(() => this.writeNow(pid)).then(() => ws.forEach(w => w[0](st.path)), err => ws.forEach(w => w[1](err))); }
      jobs.push(st.chain.catch(() => { }));
    }
    await Promise.all(jobs);
  }
  /* abrir un archivo de proyecto desde cualquier carpeta */
  async openPath(file) {
    file = path.resolve(file);
    const known = this.idx.find(x => samePath(x.path, file));
    if (known) return known.id;
    const h = await this.peek(file);
    if (h && h.shared && !ID_OK(h.id)) throw new Error('El archivo del proyecto compartido no es válido.');
    if (h && h.shared) {
      // proyecto compartido: se registra; los datos los maneja team.js
      const clash = this.entry(h.id);
      if (clash) this.idx = this.idx.filter(x => x.id !== h.id);
      this.idx.push({ id: h.id, title: h.title, updated: Date.now(), path: file, shared: true, auto: false });
      await this.saveIndex();
      return h.id;
    }
    const doc = await this.readDoc(file);
    let id = doc.id;
    // un id que no es de los que crea el programa (con / .. u otros signos): el proyecto recibe uno nuevo
    if (!ID_OK(id)) { id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); doc.id = id; }
    const clash = this.entry(id);
    if (clash && fs.existsSync(clash.path)) {
      // es una copia de un proyecto que ya existe en otra ruta: se le da identidad propia
      id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      doc.id = id;
    } else if (clash) this.idx = this.idx.filter(x => x.id !== id);
    this.idx.push({ id, title: doc.title || 'Sin título', updated: doc.updated || 0, path: file, auto: false });
    await this.saveIndex();
    this.docs.set(id, { path: file, doc, auto: false, lastBackup: 0, chain: Promise.resolve(), timer: null, waiters: [] });
    if (id !== doc.id || clash) await this.write(id, 0);
    return id;
  }
  async saveAs(pid, file) {
    const st = await this.open(pid);
    if (!st) throw new Error('proyecto');
    await st.chain;
    st.path = path.resolve(file);
    st.auto = false;
    const e = this.entry(pid);
    if (e) { e.path = st.path; e.auto = false; }
    await this.write(pid, 0);
    return st.path;
  }
  /* el proyecto local pasa a ser compartido: el archivo original queda como respaldo */
  async markShared(pid, manifest, title) {
    const st = this.docs.get(pid);
    if (st) { clearTimeout(st.timer); await st.chain.catch(() => { }); this.docs.delete(pid); }
    const e = this.entry(pid);
    if (e && !e.shared && fs.existsSync(e.path)) {
      const dir = this.backupDir(pid);
      await fsp.mkdir(dir, { recursive: true });
      await fsp.rename(e.path, path.join(dir, 'antes de compartir ' + stamp() + '.' + this.ext)).catch(() => { });
    }
    this.idx = this.idx.filter(x => x.id !== pid);
    this.idx.push({ id: pid, title, updated: Date.now(), path: manifest, shared: true, auto: false });
    await this.saveIndex();
  }
  async touch(pid, title) {
    const e = this.entry(pid);
    if (!e) return;
    e.updated = Date.now(); if (title) e.title = title;
    clearTimeout(this._touchT); this._touchT = setTimeout(() => this.saveIndex().catch(() => { }), 1500);
  }
  isShared(pid) { const e = this.entry(pid); return !!(e && e.shared); }
  pathOf(pid) { const st = this.docs.get(pid), e = this.entry(pid); return st ? st.path : e ? e.path : null; }
  async remove(pid, trash) {
    const st = this.docs.get(pid);
    if (st) { clearTimeout(st.timer); await st.chain.catch(() => { }); this.docs.delete(pid); }
    const e = this.entry(pid);
    if (e && fs.existsSync(e.path)) await trash(e.path);
    this.idx = this.idx.filter(x => x.id !== pid);
    await this.saveIndex();
  }
}
function samePath(a, b) {
  if (!a || !b) return false;
  a = path.resolve(a); b = path.resolve(b);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}
module.exports = { ProjectStore, safeName };
