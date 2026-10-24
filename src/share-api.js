/* ============================================================
   WEB APP CON CUENTAS · servidor propio (VPS)
   Cada persona entra con su cuenta de Google. Los proyectos viven en el
   servidor por secciones (las mismas de share.js), con permisos por pestaña
   y por área que aplica el servidor. Un proyecto propio es un proyecto de
   equipo con una sola persona: comparte el mismo camino de guardado,
   fusión y cambios en vivo.
   share.js usa APITEAM igual que DESK.team o WEBTEAM.
   La cuenta, los planes y los pagos siguen en cuenta.js.
   ============================================================ */
const LOCAL_LIBS = true;   // pdf.js y demás librerías se sirven desde la misma web

/* ---------- llamadas al servidor ---------- */
/* lo guardado en este navegador para la cuenta (copias sin conexión, imágenes, viñetas): al salir o al entrar con otra
   cuenta se borra, así la siguiente persona no ve presupuestos ni teléfonos del equipo de la anterior */
async function clearLocalData() {
  try { await FCACHE.clear(); } catch (e) { }
  try { if (typeof TCACHE !== 'undefined') await TCACHE.clear(); } catch (e) { }
  try { if (typeof OFFLINE !== 'undefined') await OFFLINE.clear(); } catch (e) { }
  try { for (const k of Object.keys(localStorage)) if (k.startsWith('filmspirit:p:') || k === 'filmspirit:me') localStorage.removeItem(k); } catch (e) { }
}
async function apiFetch(method, path, body) {
  let r;
  try {
    r = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: { 'X-FS': '1', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) { const er = new Error('Sin conexión con el servidor. Revisa tu internet.'); er.code = 'offline'; throw er; }
  let j = null;
  try { j = await r.json(); } catch (e) { }
  // ¿se publicó otra versión de la app mientras esta pestaña estaba abierta? (inicio.js)
  if (typeof appVersionSeen === 'function') appVersionSeen(r.headers.get('X-FS-App'));
  if (r.status === 401) { reauthDialog(); const er = new Error((j && j.error) || 'Tu sesión terminó.'); er.code = 'no_session'; er.status = 401; throw er; }
  if (!r.ok && r.status !== 409) { const er = new Error((j && j.error) || 'Error del servidor (' + r.status + ')'); er.code = j && j.code; er.status = r.status; er.data = j; throw er; }
  return { status: r.status, json: j };
}

/* ---------- caché de imágenes en este navegador (IndexedDB) ----------
   Las imágenes no cambian a menudo: se guardan con su versión y solo se
   descargan las nuevas. Al cerrar sesión se borra. */
const FCACHE = {
  db: null,
  open() {
    if (this.db) return this.db;
    return (this.db = new Promise(res => {
      try {
        const rq = indexedDB.open('filmspirit-img', 1);
        rq.onupgradeneeded = () => { const s = rq.result.createObjectStore('f', { keyPath: 'id' }); s.createIndex('pid', 'pid'); };
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => res(null);
        rq.onblocked = () => res(null);
      } catch (e) { res(null); }
    }));
  },
  async tx(mode, fn) {
    const db = await this.open(); if (!db) return null;
    return new Promise(res => {
      try {
        const t = db.transaction('f', mode), st = t.objectStore('f');
        const out = fn(st);
        t.oncomplete = () => res(out && 'result' in out ? out.result : out);
        t.onerror = t.onabort = () => res(null);
      } catch (e) { res(null); }
    });
  },
  async all(pid) {
    const rows = await this.tx('readonly', st => st.index('pid').getAll(pid));
    return Object.fromEntries((rows || []).map(r => [r.k, r]));
  },
  put(pid, k, v, u) { return this.tx('readwrite', st => { st.put({ id: pid + '|' + k, pid, k, v, u }); }); },
  // solo las pedidas (no todo el proyecto a la memoria)
  async get(pid, keys) { const out = {}; await this.tx('readonly', st => { for (const k of keys) { const rq = st.get(pid + '|' + k); rq.onsuccess = () => { if (rq.result) out[k] = rq.result; }; } }); return out; },
  // qué claves hay guardadas (sin leer las imágenes)
  async keys(pid) { const r = await this.tx('readonly', st => st.index('pid').getAllKeys(pid)); return (r || []).map(id => String(id).slice(pid.length + 1)); },
  drop(pid, keys) { return this.tx('readwrite', st => { for (const k of keys) st.delete(pid + '|' + k); }); },
  async clear() { await this.tx('readwrite', st => { st.clear(); }); },
};

/* ---------- sin conexión: copia de los proyectos en este equipo ----------
   Al abrir un proyecto con internet se guarda una copia (IndexedDB). Sin internet:
   · la app abre desde el service worker (/app/sw.js) y el proyecto desde esta copia;
   · lo que cambias se guarda aquí («loc») y se envía al servidor al volver la conexión,
     sobre la última versión del servidor («srv»), con la misma fusión de los cambios del equipo;
   · las imágenes nuevas esperan en «fr» y se suben después;
   · se exporta igual (PDF, Excel, video, ZIP): todo se genera en el navegador. */
const OFFLINE = {
  on: false, db: null, timer: 0,
  open() {
    if (this.db) return this.db;
    return (this.db = new Promise(res => {
      try {
        const rq = indexedDB.open('filmspirit-off', 1);
        rq.onupgradeneeded = () => { rq.result.createObjectStore('p', { keyPath: 'pid' }); rq.result.createObjectStore('fr', { keyPath: 'id' }); };
        rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); rq.onblocked = () => res(null);
      } catch (e) { res(null); }
    }));
  },
  async run(store, mode, fn) {
    const db = await this.open(); if (!db) return null;
    return new Promise(res => {
      try {
        const t = db.transaction(store, mode), st = t.objectStore(store), out = fn(st);
        t.oncomplete = () => res(out && 'result' in out ? out.result : out);
        t.onerror = t.onabort = () => res(null);
      } catch (e) { res(null); }
    });
  },
  get(pid) { return this.run('p', 'readonly', st => st.get(pid)); },
  put(rec) { rec.at = Date.now(); return this.run('p', 'readwrite', st => { st.put(rec); }); },
  async all() { return (await this.run('p', 'readonly', st => st.getAll())) || []; },
  /* copia de un proyecto recién abierto con internet (se conservan los cambios aún sin enviar) */
  async mirror(pid, st) {
    const old = await this.get(pid);
    const srv = {};
    for (const [s, x] of Object.entries(st.sections || {})) if (x) srv[s] = { v: x.v, json: x.json };
    const { sections, ...head } = st;
    // una sección con cambios sin enviar conserva la versión de la que partieron (la base de la fusión de tres vías)
    const loc = (old && old.loc) || {};
    for (const s of Object.keys(loc)) if (old.srv && old.srv[s]) srv[s] = old.srv[s];
    await this.put({ pid, title: st.title, st: head, srv, loc });
  },
  /* lo que hay en el servidor para una sección. saved: el servidor aceptó lo que se envió (que ya incluía los cambios
     sin conexión, fusionados): la copia local sobra. Si no (llegó la versión de otra persona) y quedan cambios sin
     enviar, se conserva la base de la que partieron: así, al abrir, no se deshace lo que cambió el equipo */
  async setSrv(pid, s, v, json, saved) {
    const r = await this.get(pid); if (!r) return;
    if (saved || r.loc[s] == null || r.loc[s] === json) { r.srv[s] = { v, json }; delete r.loc[s]; }
    await this.put(r);
  },
  async setLoc(pid, s, json) { const r = await this.get(pid); if (!r) return false; r.loc[s] = json; await this.put(r); return true; },
  async dropLoc(pid, s, json) { const r = await this.get(pid); if (r && r.loc[s] != null && (json == null || r.loc[s] === json)) { delete r.loc[s]; await this.put(r); } },
  async pending() { return (await this.all()).filter(r => Object.keys(r.loc || {}).length); },
  /* imágenes guardadas sin conexión */
  putFrame(pid, k, url) { return this.run('fr', 'readwrite', st => { st.put({ id: pid + '|' + k, pid, k, url }); }); },
  async frames() { return (await this.run('fr', 'readonly', st => st.getAll())) || []; },
  dropFrame(id) { return this.run('fr', 'readwrite', st => { st.delete(id); }); },
  async clear() { await this.run('p', 'readwrite', st => { st.clear(); }); await this.run('fr', 'readwrite', st => { st.clear(); }); try { localStorage.removeItem('filmspirit:offList'); } catch (e) { } },
  /* cambia el estado y lo avisa una vez */
  set(on) {
    if (this.on === !!on) return;
    this.on = !!on;
    if (on) { toast('Sin conexión: sigues trabajando con la copia de este equipo. Tus cambios se envían cuando vuelva internet.', 6000); this.watch(); }
    else toast('Conexión recuperada: enviando tus cambios…', 3500);
    if (typeof setSaveState === 'function') setSaveState();
    document.body.classList.toggle('offline', this.on);
  },
  watch() {
    clearInterval(this.timer);
    this.timer = setInterval(() => this.reconnect(), 20000);
  },
  /* volvió internet: sesión, cambios pendientes, imágenes y suscripción a los cambios del equipo */
  async reconnect() {
    if (this.busy) return;
    this.busy = true;
    try {
      const r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
      if (r.status === 401) { clearInterval(this.timer); this.set(false); reauthDialog(); return; }
      if (!r.ok) return;
      APITEAM.setMe(await r.json());
      clearInterval(this.timer);
      this.set(false);
      // imágenes que esperaban
      let lost = 0, why = '';
      for (const f of await this.frames()) {
        try { await APITEAM.saveFrame(f.pid, f.k, f.url, true); await this.dropFrame(f.id); }
        catch (e) {
          if (e.code === 'offline') { this.set(true); return; }
          if (e.status >= 500 || e.code === 'rate_limited') continue;     // se reintenta la próxima vez
          lost++; why = e.message || ''; await this.dropFrame(f.id);
        }
      }
      if (lost) problem(`${lost === 1 ? 'Una imagen hecha' : lost + ' imágenes hechas'} sin conexión no se pudo subir${why ? ': ' + why : '.'}`);
      // proyecto abierto: se vuelve a suscribir y se guarda lo pendiente (shareSave compara con la versión del servidor)
      if (P && P._shared && SHARE && SHARE.pid === P.id) {
        APITEAM.check(P.id);
        dirty.add('data'); flushSave();
      }
      // otros proyectos con cambios guardados sin conexión
      for (const rec of await this.pending()) {
        if (P && rec.pid === P.id) continue;
        for (const [s, json] of Object.entries(rec.loc)) {
          const base = rec.srv[s] ? rec.srv[s].v : 0;
          try {
            const x = await apiFetch('PUT', `/api/p/${encodeURIComponent(rec.pid)}/s/${s}`, { json, base, c: CLIENT });
            if (x.status === 409) {
              // otra persona cambió esa parte: se fusiona al abrir el proyecto (queda pendiente)
              continue;
            }
            await this.setSrv(rec.pid, s, x.json.v, x.json.json || json, true);
          } catch (e) { if (e.code === 'offline') { this.set(true); return; } }
        }
      }
    } catch (e) { /* sigue sin red */ }
    finally { this.busy = false; }
  },
};
addEventListener('online', () => { if (OFFLINE.on) OFFLINE.reconnect(); });
addEventListener('offline', () => { if (Store && Store.kind === 'api') OFFLINE.set(true); });
/* presencia: con el programa en segundo plano más de un minuto, los demás te ven atenuado («en otra ventana») */
document.addEventListener('visibilitychange', () => {
  clearTimeout(APITEAM.awayT);
  if (document.visibilityState === 'hidden') APITEAM.awayT = setTimeout(() => APITEAM.setAway(true), 60e3);
  else APITEAM.setAway(false);
});
/* la app queda guardada en el navegador para abrirla sin internet */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) {
  addEventListener('load', () => { navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => { }); });
}

/* ---------- transporte ---------- */
const APITEAM = {
  me: null, h: {}, pid: null, es: null, vers: {}, read: new Set(), queue: {}, creating: new Map(), st: null, esFails: 0,
  who: [], esTab: '', hereTab: '', hereT: 0, away: false, awayT: 0, whoStale: 0,   // presencia: quién más está, en qué pestaña y si a la vista
  async init() {
    let r;
    for (let i = 0; ; i++) {
      try { r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }); break; }
      catch (e) {
        // sin internet: se entra con la cuenta y los proyectos guardados en este equipo
        const me = ls.get('me', null);
        if (me && (i >= 1 || navigator.onLine === false)) { this.me = null; this.setMe(me, true); OFFLINE.set(true); shareInit(); return; }
        if (i >= 2) { $('#view').innerHTML = '<div class="loading">No se pudo conectar con FilmSpirit. Revisa tu internet y recarga la página.</div>'; throw e; }
        await new Promise(res => setTimeout(res, 1500));
      }
    }
    if (r.status === 401) { location.replace('/entrar?next=' + encodeURIComponent(location.pathname + location.search)); await new Promise(() => { }); }
    this.setMe(await r.json());
    shareInit();
  },
  setMe(me, cached) {
    this.me = me;
    LIC = { mode: me.plan === 'free' ? 'free' : 'pro', plan: me.plan, freeProjects: me.limits.projects, name: me.name, email: me.email };
    if (!cached) try { localStorage.setItem('filmspirit:me', JSON.stringify(me)); } catch (e) { }
    if (!cached && typeof langFromAccount === 'function') langFromAccount(me);   // el idioma de la cuenta (i18n.js)
    paintBrand(); accountButton();
  },
  async refreshMe() { try { this.setMe((await apiFetch('GET', '/api/me')).json); } catch (e) { } },
  ready() { return !!this.me; },
  on(ev, fn) { this.h[ev] = fn; },
  emit(ev, ...a) { const f = this.h[ev]; if (f) { try { f(...a); } catch (e) { console.warn('equipo:', e); } } },
  async list() {
    try {
      const r = await apiFetch('GET', '/api/projects');
      const out = r.json.map(x => ({ ...x, shared: x.shared || !x.mine }));
      ls.set('offList', out);
      return out;
    } catch (e) {
      if (e.code !== 'offline') throw e;
      OFFLINE.set(true);
      // sin conexión: solo los proyectos que tienen copia en este equipo
      const have = new Set((await OFFLINE.all()).map(r => r.pid));
      return (ls.get('offList', []) || []).filter(x => have.has(x.id));
    }
  },

  /* ---------- abrir ---------- */
  async open(pid) {
    let r;
    try { r = await apiFetch('GET', `/api/p/${encodeURIComponent(pid)}?full=1`); }
    catch (e) {
      if (e.code !== 'offline') return { error: e.message, code: e.code || 'error' };
      const rec = await OFFLINE.get(pid);
      if (!rec) return { error: 'Sin conexión: este proyecto no tiene copia en este equipo. Ábrelo una vez con internet para usarlo sin conexión.', code: 'offline' };
      OFFLINE.set(true);
      const st = { ...rec.st, sections: rec.srv, _loc: rec.loc, _locBase: rec.srv };
      this.close(this.pid === pid);
      this.pid = pid; this.st = st; this.vers = {}; this.read = new Set(st.read);
      for (const [s, x] of Object.entries(rec.srv)) if (x) this.vers[s] = x.v;
      this.subscribe(pid);
      return st;
    }
    const st = r.json;
    if (OFFLINE.on) OFFLINE.set(false);
    const prev = await OFFLINE.get(pid);
    if (prev && Object.keys(prev.loc || {}).length) { st._loc = prev.loc; st._locBase = prev.srv; }
    this.close(this.pid === pid);   // al volver a abrir el mismo proyecto, las caras quedan hasta el próximo aviso (sin parpadeo)
    this.pid = pid; this.st = st; this.vers = {}; this.read = new Set(st.read);
    for (const [s, x] of Object.entries(st.sections || {})) if (x) this.vers[s] = x.v;
    this.subscribe(pid);
    OFFLINE.mirror(pid, st);
    return st;
  },
  subscribe(pid) {
    if (typeof EventSource === 'undefined') return;
    if (this.es) { try { this.es.close(); } catch (e) { } this.es = null; }
    this.esTab = this.hereTab = typeof homeOn === 'function' && homeOn() ? 'home' : (UI.tab || '');
    const es = new EventSource(`/api/p/${encodeURIComponent(pid)}/events?c=${encodeURIComponent(CLIENT)}&tab=${encodeURIComponent(this.esTab)}`);
    this.es = es;
    es.onmessage = e => { let d; try { d = JSON.parse(e.data); } catch (er) { return; } this.esFails = 0; clearTimeout(this.whoStale); this.whoStale = 0; this.event(pid, d); };
    es.onerror = () => {
      if (es !== this.es) return;
      // sin canal un rato (sin internet, servidor reiniciando): no se muestran caras que quizá ya se fueron
      if (!this.whoStale && this.who.length) this.whoStale = setTimeout(() => { this.whoStale = 0; if (this.pid === pid) this.setWho(pid, [], true); }, 20000);
      // el navegador reintenta solo; si el servidor cerró del todo (sin acceso o sin sesión), se revisa
      if (es.readyState === 2) {
        this.es = null;
        const wait = Math.min(30000, 2000 * 2 ** this.esFails++);
        setTimeout(() => { if (this.pid === pid && !this.es) this.check(pid); }, wait);
      }
    };
  },
  async check(pid) {
    try {
      const st = (await apiFetch('GET', `/api/p/${encodeURIComponent(pid)}`)).json;
      if (this.pid !== pid) return;
      this.subscribe(pid);
      this.teamState(pid, st);
    } catch (e) {
      if (this.pid !== pid) return;
      if (e.status === 403 || e.status === 404) { this.close(); this.emit('revoked', pid); return; }
      setTimeout(() => { if (this.pid === pid && !this.es) this.check(pid); }, 15000);
    }
  },
  event(pid, d) {
    if (pid !== this.pid) return;
    if (d.t === 'hello') {
      for (const [s, v] of Object.entries(d.vers || {})) if (v > (this.vers[s] || 0)) this.pull(pid, s);
      if (d.who) this.setWho(pid, d.who);
      // el navegador se reconecta solo con la dirección de antes: si desde entonces cambió de pestaña, se avisa
      const cur = this.hereTab || UI.tab || '';
      if (cur !== this.esTab || this.away) this.here(cur, true);
      return;
    }
    if (d.t === 'who') { this.setWho(pid, d.list); return; }
    if (d.t === 'sec') {
      if (d.c !== CLIENT && d.v > (this.vers[d.sec] || 0)) this.pull(pid, d.sec);
      this.emit('activity', pid, d);    // quién cambió qué (también lo propio, para la lista de actividad)
      return;
    }
    if (d.t === 'frame') { if (d.c !== CLIENT) this.pullFrame(pid, d.k, d.v); return; }
    if (d.t === 'team') { this.check(pid); return; }
    if (d.t === 'request') { if (SHARE && SHARE.admin) toast('Alguien pidió acceso a este proyecto. Revísalo en Equipo y permisos.', 5000); return; }
    if (d.t === 'revoked' || d.t === 'deleted') { this.close(); this.emit('revoked', pid, d.t); }
  },
  /* una sección a la vez, en el orden en que llegan */
  pull(pid, s) {
    this.queue[s] = (this.queue[s] || Promise.resolve()).then(async () => {
      if (pid !== this.pid) return;
      const r = (await apiFetch('GET', `/api/p/${encodeURIComponent(pid)}/s/${s}`)).json;
      if (pid !== this.pid || !r.json || r.v <= (this.vers[s] || 0)) return;
      this.vers[s] = r.v;
      OFFLINE.setSrv(pid, s, r.v, r.json);
      this.emit('update', pid, { sec: s, json: r.json, ver: r.v, by: r.by, mine: false });
    }).catch(e => console.warn('equipo:', e));
  },
  async pullFrame(pid, k, v) {
    const lazy = typeof FRIDX !== 'undefined' && FRIDX && FRAMES_PID === pid;
    if (lazy) { if (v) FRIDX[k] = v; else delete FRIDX[k]; }
    if (!v) { FCACHE.drop(pid, [k]); this.emit('frame', pid, { k, u: null }); return; }
    // si no estaba cargada basta con el índice: se baja cuando algo la muestre
    if (lazy && !FRAMES[k] && !k.startsWith('ph~')) { this.emit('frame', pid, { k, idx: true }); return; }
    try {
      const r = (await apiFetch('POST', `/api/p/${encodeURIComponent(pid)}/frames/get`, { keys: [k] })).json;
      const f = r.frames[k];
      if (f && pid === this.pid) { FCACHE.put(pid, k, f.v, f.u); this.emit('frame', pid, { k, u: f.u }); }
    } catch (e) { }
  },
  /* cambió el equipo: si cambiaron mis permisos se vuelve a abrir con lo que ahora puedo leer */
  async teamState(pid, st) {
    const before = this.st;
    this.st = { ...before, ...st };
    const key = x => x ? JSON.stringify([x.read && [...x.read].sort(), bdCanon(x.perms), x.me && x.me.role]) : '';
    const planKey = x => x ? JSON.stringify([x.ownerPlan, x.readonly, x.limits, x.archived || null, x.kind || 'prod']) : '';
    if (key(before) === key(st) && planKey(before) !== planKey(st) && SHARE && SHARE.pid === pid) {
      // cambió el plan del proyecto (alguien pasó a Pro o volvió a Free): no hace falta volver a abrirlo
      SHARE.ownerPlan = st.ownerPlan; SHARE.ro = !!st.readonly; SHARE.limits = st.limits; SHARE.archived = st.archived || null; SHARE.kind = st.kind || 'prod';
      sharePaintTabs(); render();
    }
    if (key(before) !== key(st)) {
      const full = await this.open(pid);
      if (full.error) { this.close(); this.emit('revoked', pid); return; }
      this.emit('reload', pid, full);
      return;
    }
    this.emit('manifest', pid, st);
  },
  close(keepWho) {
    if (this.es) { try { this.es.close(); } catch (e) { } }
    this.es = null; this.pid = null; this.queue = {}; this.esFails = 0;
    clearTimeout(this.hereT); clearTimeout(this.whoStale); this.whoStale = 0;
    if (!keepWho && this.who.length) this.setWho(null, []);
  },
  /* ---------- presencia ---------- */
  setWho(pid, list, quiet) { this.who = Array.isArray(list) ? list.slice(0, 240) : []; this.emit('who', pid, this.who, quiet); },
  /* esta ventana pasó a otra pestaña del programa: se avisa (una vez, al quedarse) */
  here(tab, force) {
    if (!tab || (!force && tab === this.hereTab)) return;
    this.hereTab = tab; this.hereSend();
  },
  /* el programa quedó en segundo plano un rato (otra ventana, otra app) o volvió a la vista */
  setAway(on) { on = !!on; if (on === this.away) return; this.away = on; this.hereSend(); },
  hereSend() {
    if (!this.pid || !this.es || !this.hereTab) return;
    clearTimeout(this.hereT);
    const pid = this.pid, tab = this.hereTab, away = this.away;
    this.hereT = setTimeout(() => { if (this.pid === pid) apiFetch('POST', `/api/p/${encodeURIComponent(pid)}/here`, { c: CLIENT, tab, away }).catch(() => { }); }, 400);
  },

  /* ---------- guardar ---------- */
  async save(pid, s, json, ch) {
    let r;
    try { r = await apiFetch('PUT', `/api/p/${encodeURIComponent(pid)}/s/${s}`, { json, base: this.vers[s] || 0, c: CLIENT, ...(ch ? { what: ch.what, ref: ch.ref } : {}) }); }
    catch (e) {
      // sin conexión: el cambio queda en este equipo (y se envía al volver internet)
      if (e.code === 'offline' && await OFFLINE.setLoc(pid, s, json)) { OFFLINE.set(true); return { offline: true }; }
      throw e;
    }
    if (OFFLINE.on) OFFLINE.set(false);
    if (r.status !== 409) OFFLINE.setSrv(pid, s, r.json.v, r.json.json || json, true);
    else if (r.json.json != null) OFFLINE.setSrv(pid, s, r.json.v, r.json.json);
    // las versiones son del proyecto abierto: lo que termina de guardarse de otro (ya cerrado) no las toca
    const here = pid === this.pid;
    if (r.status === 409) {
      // otra persona guardó antes: se fusiona su versión con la tuya y se vuelve a guardar
      if (here) this.vers[s] = Math.max(this.vers[s] || 0, r.json.v);
      if (r.json.json != null) this.emit('update', pid, { sec: s, json: r.json.json, ver: r.json.v, by: r.json.by, mine: false });
      return { conflict: true };
    }
    const newer = here && (this.vers[s] || 0) > r.json.v;    // ya llegó una versión posterior mientras se guardaba
    if (here) this.vers[s] = Math.max(this.vers[s] || 0, r.json.v);
    if (r.json.json) { this.emit('update', pid, { sec: s, json: r.json.json, ver: r.json.v, by: '', mine: true }); return { conflict: true }; }
    return newer ? { conflict: true } : { ver: r.json.v };
  },
  async saveFrame(pid, k, url, retry) {
    FR_PEND.add(k);   // hasta que el servidor la confirme, la viñeta que la muestra no se guarda en este navegador
    try {
      const r = await apiFetch('PUT', `/api/p/${encodeURIComponent(pid)}/f`, { k, url: url || null, c: CLIENT });
      if (url) FCACHE.put(pid, k, r.json.v, url); else FCACHE.drop(pid, [k]);
      if (typeof FRIDX !== 'undefined' && FRIDX && FRAMES_PID === pid) { if (url) FRIDX[k] = r.json.v; else delete FRIDX[k]; }
      FR_PEND.delete(k);
    } catch (e) {
      // sin conexión: la imagen queda en el equipo y se sube después
      if (e.code === 'offline' && !retry) { OFFLINE.set(true); await OFFLINE.putFrame(pid, k, url || null); if (url) FCACHE.put(pid, k, 0, url); else FCACHE.drop(pid, [k]); if (typeof FRIDX !== 'undefined' && FRIDX && FRAMES_PID === pid) { if (url) FRIDX[k] = 0; else delete FRIDX[k]; } return; }
      if (e.code === 'plan_photos' || e.code === 'quota' || e.code === 'no_area') { if (!this.warned) { this.warned = 1; setTimeout(() => this.warned = 0, 8000); planNotice(e.message, e.code === 'plan_photos'); } }
      throw e;
    }
  },
  /* índice de las imágenes del proyecto (clave → versión), sin bajar ninguna */
  async frameIndex(pid) {
    try {
      const idx = (await apiFetch('GET', `/api/p/${encodeURIComponent(pid)}/frames`)).json || {};
      FCACHE.keys(pid).then(ks => { const old = ks.filter(k => !(k in idx)); if (old.length) FCACHE.drop(pid, old); }).catch(() => { });
      return idx;
    } catch (e) {
      if (e.code !== 'offline') throw e;
      // sin conexión: lo que está guardado en este navegador (versión desconocida)
      const ks = await FCACHE.keys(pid).catch(() => []);
      return Object.fromEntries(ks.map(k => [k, -1]));
    }
  },
  /* las imágenes pedidas: del navegador si están al día; si no, del servidor (de a 24) */
  async getFrames(pid, keys, idx) {
    const out = {}, need = [];
    const cached = await FCACHE.get(pid, keys).catch(() => ({}));
    for (const k of keys) { const c = cached[k]; if (c && (c.v === idx[k] || idx[k] === -1)) out[k] = c.u; else if (idx[k] !== -1) need.push(k); }
    while (need.length) {
      const ks = need.splice(0, 24);
      const r = (await apiFetch('POST', `/api/p/${encodeURIComponent(pid)}/frames/get`, { keys: ks })).json;
      for (const [k, f] of Object.entries(r.frames || {})) { out[k] = f.u; FCACHE.put(pid, k, f.v, f.u); if (idx[k] != null && idx[k] !== f.v) idx[k] = f.v; }
      if (r.more && r.more.length) need.unshift(...r.more);
    }
    return out;
  },
  async loadFrames(pid) {
    let idx;
    try { idx = (await apiFetch('GET', `/api/p/${encodeURIComponent(pid)}/frames`)).json; }
    catch (e) {
      if (e.code !== 'offline') throw e;
      // sin conexión: las imágenes guardadas en este navegador
      const cached = await FCACHE.all(pid).catch(() => ({}));
      return Object.fromEntries(Object.entries(cached).map(([k, c]) => [k, c.u]));
    }
    const cached = await FCACHE.all(pid).catch(() => ({}));
    const out = {}, need = [];
    for (const [k, v] of Object.entries(idx)) { const c = cached[k]; if (c && c.v === v) out[k] = c.u; else need.push(k); }
    FCACHE.drop(pid, Object.keys(cached).filter(k => !(k in idx)));
    while (need.length) {
      const keys = need.splice(0, 24);
      const r = (await apiFetch('POST', `/api/p/${encodeURIComponent(pid)}/frames/get`, { keys })).json;
      for (const [k, f] of Object.entries(r.frames || {})) { out[k] = f.u; FCACHE.put(pid, k, f.v, f.u); }
      if (r.more && r.more.length) need.unshift(...r.more);
    }
    return out;
  },

  /* ---------- crear en el servidor el proyecto que se acaba de hacer en el navegador ---------- */
  async ensureCreated(Px) {
    if (Px._shared) return;
    if (this.creating.has(Px)) return this.creating.get(Px);
    const job = (async () => {
      const sent = Object.fromEntries(SEC_DATA.map(s => [s, canon(secGet(Px, s))]));
      let st;
      try { st = (await apiFetch('POST', '/api/projects', { sections: sent, title: Px.meta.title, c: CLIENT, ...(Px._kind ? { kind: Px._kind } : {}) })).json; }
      catch (e) {
        if (e.code === 'offline' && !Px._offNew) { Px._offNew = true; OFFLINE.set(true); toast('Sin conexión: este proyecto nuevo se creará en tu cuenta cuando vuelva internet. Mientras tanto, no cierres esta pestaña.', 7000); }
        throw e;
      }
      OFFLINE.mirror(st.pid, { ...st, sections: Object.fromEntries(Object.entries(sent).map(([s, j]) => [s, { v: (st.vers || {})[s] || 1, json: j }])) });
      const oldId = Px.id;
      Px._oldId = oldId; Px.id = st.pid; Px._shared = true; Px._saved = true;
      if (FRAMES_PID === oldId) FRAMES_PID = st.pid;
      if (FR_KNOWN === oldId) FR_KNOWN = st.pid;
      if (P === Px) {
        SHARE = {
          pid: st.pid, me: st.me, admin: st.admin, perms: st.perms || {}, read: new Set(st.read), unavailable: new Set(), base: { ...sent },
          members: st.members || [], requests: st.requests || [], title: st.title, reverted: {}, pending: false, ownerPlan: st.ownerPlan, limits: st.limits, archived: st.archived || null, ro: !!st.readonly, kind: st.kind || 'prod',
        };
        this.close(); this.pid = st.pid; this.st = st; this.vers = { ...st.vers }; this.read = new Set(st.read);
        this.subscribe(st.pid);
        ls.set('last', st.pid); apiUrl(st.pid); sharePaintTabs();
      }
      this.refreshMe();
    })();
    this.creating.set(Px, job);
    try { await job; } finally { this.creating.delete(Px); }
  },

  /* ---------- equipo ---------- */
  async updateTeam(pid, list) {
    const out = list.map(c => c.add ? { add: true, email: c.email || c.name, role: c.role, perms: c.perms } : c);
    const r = (await apiFetch('PUT', `/api/p/${encodeURIComponent(pid)}/team`, { list: out })).json;
    this.st = { ...this.st, ...r.state };
    if (SHARE) SHARE.requests = r.state.requests || [];
    return { passwords: {}, rekeyed: [], state: r.state, added: r.added || [] };
  },
  async requests(pid) {
    const st = (await apiFetch('GET', `/api/p/${encodeURIComponent(pid)}`)).json;
    return st.requests || [];
  },
  async logout() { this.close(); },
  async leave(pid) { await apiFetch('POST', `/api/p/${encodeURIComponent(pid)}/leave`, {}); this.close(); this.refreshMe(); },
  async destroy(pid) { await apiFetch('DELETE', `/api/p/${encodeURIComponent(pid)}`); this.close(); FCACHE.tx('readwrite', st => { st.index('pid').openCursor(IDBKeyRange.only(pid)).onsuccess = e => { const c = e.target.result; if (c) { c.delete(); c.continue(); } }; }); this.refreshMe(); },
  async requestAccess(pid) { await apiFetch('POST', `/api/p/${encodeURIComponent(pid)}/request`, {}); },
  async archive(pid, on) { const r = (await apiFetch('POST', `/api/p/${encodeURIComponent(pid)}/archive`, { archived: !!on })).json; if (r.me) this.setMe(r.me); return r; },
};

/* la dirección lleva el proyecto abierto: se puede recargar o enviar como enlace */
function apiUrl(pid) {
  try { history.replaceState(null, '', pid ? '?p=' + encodeURIComponent(pid) : location.pathname); } catch (e) { }
}
function apiLink(pid) { return location.origin + '/app/?p=' + encodeURIComponent(pid); }
