/* ============================================================
   FILMSPIRIT · estado, derivados y guardado
   El resto del armazón, en el orden del armado: ventanas.js, pestanas.js, proyectos.js, importar.js y arranque.js
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const CLIENT = uid('c');
let P = null;               // proyecto abierto
let D = null;               // datos derivados
let FRAMES = {};            // shotId -> dataURL (dibujos de storyboard)
let FRAMES_PID = null;
const DESK = window.filmspiritDesk || null;   // app de escritorio (Electron)
let LIC = { mode: 'pro' };                 // en la web no hay límites; en escritorio lo fija desktop.js
// ediciones: Free (sin licencia), Indie, Pro (con licencia o durante la prueba) y Studio (web con cuentas)
const EDITION = () => LIC.mode === 'free' ? 'Free' : LIC.plan === 'studio' ? 'Studio' : LIC.plan === 'indie' ? 'Indie' : 'Pro';
/* logotipo de la barra superior y, a su lado, la edición; en pantallas angostas, solo el ícono */
function paintBrand() {
  const b = $('#brand'); if (!b) return;
  b.innerHTML = markSVG() + `<span class="brand-w">${logoSVG('')}<span class="brand-ed" aria-hidden="true">${esc(EDITION())}</span></span>`;
  b.setAttribute('aria-label', 'FilmSpirit ' + EDITION() + (typeof Store === 'undefined' || Store.kind !== 'mem' ? ' · Inicio' : ''));
  b.title = LIC.mode === 'trial' ? 'Prueba de FilmSpirit Pro' : 'FilmSpirit ' + EDITION();
}
const UI = {
  tab: 'script', scene: 0, mode: { tags: true, cov: true }, hidden: new Set(), zoom: 1,
  bdView: 'sheet', bdQ: '', bdCat: '', bdSug: false,
  sbView: 'panels', sbScene: '', supDay: 0, budNote: true, readOnly: false,
};
/* hora escrita a mano: «7» → 07:00, «730» → 07:30, «19.5» → 19:05 */
/* una hora que no se entiende («25:99», «abc») no se guarda: el campo vuelve a lo que tenía y se dice cómo escribirla
   (antes pasaba tal cual a la hoja de llamado y al plan) */
document.addEventListener('change', e => {
  const el = e.target; if (!el || !el.matches || !el.matches('input.tm')) return;
  const v = el.value.trim(), ok = /^(\d{2}):(\d{2})$/.exec(normHM(v)); if (!v || (ok && +ok[1] < 24 && +ok[2] < 60)) return;
  e.stopImmediatePropagation();
  el.value = el.defaultValue;
  toast(`No se puede usar «${v}» como hora: escribe de 00:00 a 23:59 (por ejemplo 7, 0730 o 7:30 pm).`, 6000);
  requestAnimationFrame(() => { try { el.focus(); el.select(); } catch (er) { } });
}, true);
function normHM(v) {
  v = String(v || '').trim(); if (!v) return '';
  const m = /^\d{3,4}$/.test(v) ? [v, v.slice(0, -2), v.slice(-2)] : v.match(/^(\d{1,2})(?:[:.h ]?(\d{1,2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i);
  if (!m) return v;
  let h = +m[1], mi = +(m[2] || 0);
  if (m[3] && /p/i.test(m[3]) && h < 12) h += 12;
  if (m[3] && /a/i.test(m[3]) && h === 12) h = 0;
  return h < 24 && mi < 60 ? String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0') : v;
}
const tmIn = (val, ph, attrs, dis) => `<input type="text" inputmode="numeric" class="tm" maxlength="8" value="${esc(val || '')}" placeholder="${esc(ph || '')}" ${attrs} ${dis}>`;
const ls = {
  get(k, d) { try { const v = localStorage.getItem('filmspirit:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('filmspirit:' + k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem('filmspirit:' + k); } catch (e) { } },
};
/* nombre de un color para lectores de pantalla («Color rojo» en vez de «Color #C8382C») */
function colorName(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (!m) return String(hex || '');
  const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (l > .93) return 'blanco'; if (l < .12) return 'negro';
  if (sat < .14) return l > .7 ? 'gris claro' : l < .35 ? 'gris oscuro' : 'gris';
  let h = d === 0 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
  const tone = l < .3 ? ' oscuro' : l > .78 ? ' claro' : '';
  if (h >= 10 && h < 45 && l < .62 && sat < .6) return 'marrón' + (l > .5 ? ' claro' : l < .25 ? ' oscuro' : '');
  const name = h < 15 || h >= 345 ? 'rojo' : h < 40 ? 'naranja' : h < 65 ? 'amarillo' : h < 160 ? 'verde' : h < 200 ? 'celeste' : h < 255 ? 'azul' : h < 290 ? 'morado' : 'rosa';
  if (name === 'naranja' && l > .75) return 'beige';
  return name + tone;
}
/* apariencia: automática (sigue al sistema), clara u oscura; se elige en ⋯ de las pestañas */
const themeDark = t => t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
function applyTheme(t) {
  const r = document.documentElement;
  if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme;
}
/* la apariencia: una sola maqueta para claro y oscuro. El color queda para lo que significa algo en el oficio (día y
   noche, eventos, departamentos, revisiones); los estilos «Color» y «pastel» de antes se retiraron */
function applyLook() {
  const r = document.documentElement, t = ls.get('theme', 'auto'), dark = themeDark(t);
  applyTheme(t);
  r.dataset.tone = dark ? 'dark' : 'light';   // la apariencia que se ve (también en «Automática»): el CSS del oficio la usa
  const mc = document.querySelector('meta[name="theme-color"]'); if (mc) mc.content = dark ? '#1B1B1B' : '#FFFFFF';
  tgClose(); requestAnimationFrame(() => tabInView(false));
  if (window.LOOK_READY) screenApply();   // las letras van solo en la apariencia clara (leyenda.js)
}
applyLook();
// en «Automática», si el sistema pasa a oscuro (o a claro) el estilo sigue a la apariencia
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (ls.get('theme', 'auto') === 'auto') { applyLook(); if (typeof P !== 'undefined' && P) render(); } }); } catch (e) { }

/* ---------- derivados ---------- */
function derive() {
  const sc = computeScenes(P.paras);
  const pages = layoutScript(P.paras);
  const metrics = sceneMetrics(P.paras, pages, sc);
  const sem = sceneElementMap(P, sc);
  const castNum = castNumbers(P, sc, sem);
  // posición de cada párrafo en las páginas
  const pos = new Array(P.paras.length);
  pages.forEach((pg, pi) => pg.forEach((ln, li) => {
    if (ln.blank) return;
    for (const pp of ln.p2 != null ? [ln.p, ln.p2] : [ln.p]) {
      const q = pos[pp];
      if (!q) pos[pp] = { pg0: pi, li0: li, pg1: pi, li1: li };
      else { q.pg1 = pi; q.li1 = li; }
    }
  }));
  const shotsBy = {};
  for (const sh of Object.values(P.shots)) {
    if (!sc.byKey[sh.sc]) continue;
    (shotsBy[sh.sc] = shotsBy[sh.sc] || []).push(sh);
  }
  for (const k in shotsBy) shotsBy[k].sort((a, b) => a.ord - b.ord);
  // rayado: como en el papel, cada plano tiene su línea, en orden de izquierda a derecha sobre el texto
  // (lanes: la columna del plano; laneN: cuántas columnas tiene su escena). Con muchos planos en una escena,
  // los que no se pisan comparten columna para que las líneas no queden pegadas
  const code = {}, lanes = {}, laneN = {};
  for (const k in shotsBy) {
    Object.assign(code, shotCodes(k, shotsBy[k]));   // 1.1, 1.1A (no previsto), 1.1PU (pick-up)
    const ranged = shotsBy[k].filter(s => s.p0 != null);
    let n = ranged.length;
    if (n <= 10) ranged.forEach((s, i) => { lanes[s.id] = i; });
    else {
      const ends = [];
      for (const s of [...ranged].sort((a, b) => a.p0 - b.p0 || b.p1 - a.p1)) {
        let lane = ends.findIndex(e => e < s.p0);
        if (lane < 0) { lane = ends.length; ends.push(s.p1); } else ends[lane] = s.p1;
        lanes[s.id] = Math.min(lane, 13);
      }
      n = Math.min(ends.length, 14);
    }
    for (const s of ranged) laneN[s.id] = n;
  }
  if (sc.scenes.length) reconcileSchedule(P, sc);
  D = { sc, pages, metrics, sem, castNum, pos, shotsBy, code, lanes, laneN };
  if (typeof GUESS_C !== 'undefined') { GUESS_C.clear(); S3REV++; }
  if (UI.scene >= sc.scenes.length) UI.scene = Math.max(0, sc.scenes.length - 1);
  return D;
}
const sceneOfKey = k => D.sc.byKey[k];
const synopsisOf = s => {
  const m = P.scenes[s.key];
  if (m && m.synopsis) return m.synopsis;
  for (let i = s.p0 + 1; i < s.p1; i++) if ((P.paras[i].t === 'a' || P.paras[i].t === 'v') && P.paras[i].x.trim()) {
    const t = P.paras[i].x.trim();
    return t.length > 110 ? t.slice(0, 107).replace(/\s+\S*$/, '') + '…' : t;
  }
  return '';
};
function sceneCast(si) {
  return [...D.sem[si]].map(id => P.elements[id]).filter(e => e && e.cat === 'cast')
    .sort((a, b) => (D.castNum[a.id] || 99) - (D.castNum[b.id] || 99));
}
function shotTextExcerpt(sh, max = 160) {
  if (sh.p0 == null) return '';
  let t = '';
  for (let i = sh.p0; i <= sh.p1 && t.length < max; i++) {
    const p = P.paras[i];
    if (!p || p.t === 'h') continue;
    t += (p.t === 'c' ? p.x.toUpperCase() + ': ' : p.x + ' ');
  }
  t = t.trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

/* ---------- guardado ---------- */
const CH = 60000;
/* imágenes en la base de datos de la página: un documento no pasa de 256 KiB, así que
   las grandes (fotos del desglose) van en partes; el documento principal se escribe al final */
const FR_CH = 180000;
async function dbPutFrame(db, call, pid, k, url) {
  const ref = db.doc(`projects/${pid}/frames/${k}`);
  const old = await call(() => ref.get()).catch(() => null);
  const oldN = old && old.exists ? (old.data() || {}).n || 0 : 0;
  const parts = [];
  if (url && url.length > FR_CH) for (let i = 0; i < url.length; i += FR_CH) parts.push(url.slice(i, i + FR_CH));
  for (let i = 0; i < parts.length; i++) await call(() => db.doc(`projects/${pid}/frameparts/${k}~${i}`).set({ s: parts[i] }));
  if (!url) await call(() => ref.delete());
  else if (parts.length) await call(() => ref.set({ n: parts.length, v: Date.now() }));
  else await call(() => ref.set({ img: url }));
  for (let i = parts.length; i < oldN; i++) await call(() => db.doc(`projects/${pid}/frameparts/${k}~${i}`).delete()).catch(() => { });
}
async function dbFrameOf(db, call, pid, id, data) {
  if (!data) return null;
  if (data.img) return data.img;
  if (!data.n) return null;
  const ps = await Promise.all(Array.from({ length: data.n }, (_, i) => call(() => db.doc(`projects/${pid}/frameparts/${id}~${i}`).get())));
  return ps.every(x => x.exists) ? ps.map(x => x.data().s).join('') : null;
}
async function dbDropFrames(db, call, pid) {
  for (const c of ['frames', 'frameparts']) {
    const fr = await call(() => db.collection(`projects/${pid}/${c}`).get());
    for (const doc of fr.docs) await call(() => db.doc(`projects/${pid}/${c}/${doc.id}`).delete());
  }
}
const Store = {
  kind: 'mem', db: null, prev: {}, rev: {}, unsub: null,
  async init() {
    if (DESK) { this.kind = 'desk'; return; }
    if (API()) { this.kind = 'api'; await APITEAM.init(); return; }
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        const db = await window.claude.use('db');
        if (db) { this.db = db; this.kind = 'db'; if (TARGET === 'web') await WEBTEAM.init(db); return; }
      }
    } catch (e) { }
    try { localStorage.setItem('filmspirit:t', '1'); localStorage.removeItem('filmspirit:t'); this.kind = 'local'; } catch (e) { this.kind = 'mem'; }
  },
  async call(fn) {
    try { return await fn(); }
    catch (e) {
      if (e && e.code === 'unavailable') { await new Promise(r => setTimeout(r, 400 + Math.random() * 600)); return await fn(); }
      throw e;
    }
  },
  async list() {
    if (this.kind === 'desk') return DESK.list();
    if (this.kind === 'api') return APITEAM.list();
    if (this.kind === 'db') {
      const q = await this.call(() => this.db.collection('projects').get());
      // proyectos de equipo: solo los de mis equipos; los propios: solo los míos
      const W = TARGET === 'web' && WEBTEAM.ready() ? WEBTEAM : null;
      const teams = W ? await W.teams().catch(() => ({})) : {};
      return q.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.kind === 'filmspirit')
        .filter(x => x.shared ? !!(W && W.role(teams[x.id])) : (!x.owner || (W && x.owner === W.me)))
        .sort((a, b) => (b.updated || 0) - (a.updated || 0));
    }
    if (this.kind === 'local') return (ls.get('list', []) || []).sort((a, b) => (b.updated || 0) - (a.updated || 0));
    return [];
  },
  async load(pid) {
    let script, data;
    if (this.kind === 'desk') {
      const r = await DESK.load(pid);
      if (!r) return null;
      if (r.shared) return shareOpen(pid, r);
      script = r.script; data = r.data;
      if (r.recovered) setTimeout(() => toast('El archivo estaba dañado: se abrió el último respaldo automático.', 6000), 400);
    } else if (this.kind === 'api') {
      const st = await APITEAM.open(pid);
      if (st.error) {
        if (st.code === 'no_access') setTimeout(() => noAccessDialog(pid, st.error), 60);
        else if (st.code === 'plan_suspended') setTimeout(() => modal({ title: 'Sin acceso por ahora', body: `<p style="margin:0">${esc(st.error)}</p>`, foot: '<button class="btn primary" data-close>Entendido</button>' }), 60);
        else setTimeout(() => toast(st.error, 6000), 60);
        return CANCEL;
      }
      const Pn = shareBuild(st);
      // cambios hechos sin conexión: se aplican sobre lo que hay en el servidor
      if (st._loc && Object.keys(st._loc).length) { Pn._offLoc = st._loc; Pn._offBase = st._locBase; }
      return Pn;
    } else if (this.kind === 'db') {
      const head = await this.call(() => this.db.doc('projects/' + pid).get());
      if (!head.exists) return null;
      const h = head.data();
      if (h.shared) {
        if (TARGET !== 'web') return null;
        const st = await WEBTEAM.open(pid);
        if (st.error) { toast(st.error, 6000); return null; }
        return shareBuild(st);
      }
      const read = async (name, n) => {
        const parts = [];
        for (let i = 0; i < n; i++) {
          const d = await this.call(() => this.db.doc(`projects/${pid}/blobs/${name}-${i}`).get());
          parts.push(d.exists ? d.data().s : '');
        }
        this.prev[pid + name] = parts;
        return parts.join('');
      };
      script = await read('script', h.n_script || 0);
      data = await read('data', h.n_data || 0);
      this.rev[pid] = h.rev || 0;
    } else if (this.kind === 'local') {
      script = ls.get('p:' + pid + ':script', null);
      data = ls.get('p:' + pid + ':data', null);
      if (script == null) return null;
    } else return null;
    const Pn = Object.assign(newProject(), JSON.parse(data || '{}'), JSON.parse(script || '{}'));
    Pn.id = pid;
    return Pn;
  },
  serialize(Px, which) {
    if (which === 'script') return JSON.stringify({ paras: Px.paras });
    const { paras, id, ...rest } = Px;
    return JSON.stringify(rest);
  },
  async save(Px, which) {
    const pid = Px.id;
    const parts = {};
    for (const w of which) parts[w] = this.serialize(Px, w);
    if (this.kind === 'api') { if (!Px._shared) await APITEAM.ensureCreated(Px); return shareSave(Px); }
    if (Px._shared && typeof shareSave === 'function') return shareSave(Px);
    if (this.kind === 'desk') return DESK.save(pid, Px.meta.title, parts);
    if (this.kind === 'db') {
      const n = {};
      for (const w of ['script', 'data']) {
        const key = pid + w;
        if (!(w in parts)) { n[w] = (this.prev[key] || []).length; continue; }
        const str = parts[w], chunks = [];
        for (let i = 0; i < str.length; i += CH) chunks.push(str.slice(i, i + CH));
        if (!chunks.length) chunks.push('');
        const prev = this.prev[key] || [];
        for (let i = 0; i < chunks.length; i++)
          if (prev[i] !== chunks[i]) await this.call(() => this.db.doc(`projects/${pid}/blobs/${w}-${i}`).set({ s: chunks[i] }));
        for (let i = chunks.length; i < prev.length; i++) await this.call(() => this.db.doc(`projects/${pid}/blobs/${w}-${i}`).delete());
        this.prev[key] = chunks;
        n[w] = chunks.length;
      }
      this.rev[pid] = (this.rev[pid] || 0) + 1;
      const owner = TARGET === 'web' && WEBTEAM.me ? { owner: WEBTEAM.me } : {};
      await this.call(() => this.db.doc('projects/' + pid).set({
        kind: 'filmspirit', title: Px.meta.title, updated: Date.now(), rev: this.rev[pid], by: CLIENT, n_script: n.script, n_data: n.data, ...owner,
      }));
    } else if (this.kind === 'local') {
      for (const w in parts) localStorage.setItem('filmspirit:p:' + pid + ':' + w, JSON.stringify(parts[w]));
      const list = ls.get('list', []).filter(x => x.id !== pid);
      list.push({ id: pid, title: Px.meta.title, updated: Date.now() });
      ls.set('list', list);
    }
  },
  async remove(pid) {
    if (this.kind === 'desk') return DESK.remove(pid);
    if (this.kind === 'api') return SHARE && SHARE.pid === pid && SHARE.admin ? APITEAM.destroy(pid) : APITEAM.leave(pid);
    if (this.kind === 'db' && P && P._shared && P.id === pid) { if (SHARE && SHARE.admin) await WEBTEAM.destroy(pid); return; }
    if (this.kind === 'db') {
      const h = await this.call(() => this.db.doc('projects/' + pid).get());
      if (h.exists) {
        const d = h.data();
        for (let i = 0; i < (d.n_script || 0); i++) await this.call(() => this.db.doc(`projects/${pid}/blobs/script-${i}`).delete());
        for (let i = 0; i < (d.n_data || 0); i++) await this.call(() => this.db.doc(`projects/${pid}/blobs/data-${i}`).delete());
      }
      await dbDropFrames(this.db, f => this.call(f), pid);
      await this.call(() => this.db.doc('projects/' + pid).delete());
    } else if (this.kind === 'local') {
      for (const k of Object.keys(localStorage)) if (k.startsWith('filmspirit:p:' + pid + ':')) localStorage.removeItem(k);
      ls.set('list', ls.get('list', []).filter(x => x.id !== pid));
    }
  },
  async saveFrame(pid, sid, url) {
    if (P && P.id === pid && P._sample && !P._saved) return;     // el ejemplo sin adoptar: los dibujos quedan en memoria
    if (this.kind === 'api') {
      // el proyecto puede estar creándose en el servidor (su id cambia al crearse)
      const Px = P && (P.id === pid || P._oldId === pid) ? P : null;
      if (!Px || (Px._sample && !Px._saved)) return;
      if (!Px._shared) await APITEAM.ensureCreated(Px);
      return shareSaveFrame(Px.id, sid, url);
    }
    if (P && P._shared && P.id === pid && typeof shareSaveFrame === 'function') return shareSaveFrame(pid, sid, url);
    if (this.kind === 'desk') return DESK.saveFrame(pid, sid, url || null);
    if (this.kind === 'db') await dbPutFrame(this.db, f => this.call(f), pid, sid, url);
    else if (this.kind === 'local') {
      if (url) localStorage.setItem(`filmspirit:p:${pid}:frame:${sid}`, url); else localStorage.removeItem(`filmspirit:p:${pid}:frame:${sid}`);
    }
  },
  // índice de imágenes (clave → versión) sin bajarlas; solo con el servidor (los demás guardan en el equipo)
  async frameIndex(pid) { return this.kind === 'api' ? APITEAM.frameIndex(pid) : null; },
  async getFrames(pid, keys, idx) { return this.kind === 'api' ? APITEAM.getFrames(pid, keys, idx) : {}; },
  async loadFrames(pid) {
    if (this.kind === 'api') return APITEAM.loadFrames(pid);
    const out = {};
    if (this.kind === 'desk') return Object.assign(out, cleanFrames(await DESK.loadFrames(pid)));
    if (this.kind === 'db') {
      const q = await this.call(() => this.db.collection(`projects/${pid}/frames`).get());
      for (const d of q.docs) { const u = await dbFrameOf(this.db, f => this.call(f), pid, d.id, d.data()).catch(() => null); if (u) out[d.id] = u; }
    } else if (this.kind === 'local') {
      const pre = `filmspirit:p:${pid}:frame:`;
      for (const k of Object.keys(localStorage)) if (k.startsWith(pre)) out[k.slice(pre.length)] = localStorage.getItem(k);
    }
    return out;
  },
  watch(pid, onRemote) {
    if (this.unsub) { this.unsub(); this.unsub = null; }
    if (this.kind !== 'db' || (P && P._shared)) return;     // los proyectos de equipo los sigue WEBTEAM
    try {
      this.unsub = this.db.doc('projects/' + pid).onSnapshot(s => {
        if (!s.exists) return;
        const d = s.data();
        if (d.by && d.by !== CLIENT && (d.rev || 0) > (this.rev[pid] || 0)) onRemote(d);
      }, () => { });
    } catch (e) { }
  },
};

let dirty = new Set(), saving = false, saveErr = '';
const saveSoon = debounce(flushSave, DESK ? 450 : 1200);
function changed(which = 'data') {
  if (!P) return;
  P._touched = true;
  dirty.add(which);
  if (typeof S3REV !== 'undefined') S3REV++;
  setSaveState();
  saveSoon();
  histSoon();
  if (typeof NOTES_ON !== 'undefined') actSoon();
  callStaleSoon();   // una hoja de llamado ya enviada que quedó vieja (tab-call.js)
}
async function flushSave() {
  if (!P || !dirty.size || UI.readOnly) return;
  if (saving) { saveSoon(); return; }
  if (Store.kind === 'mem') { setSaveState(); return; }
  // el ejemplo no ocupa un proyecto (ni el del plan gratuito): se guarda solo si la persona lo pide
  if (P._sample && !P._saved) { dirty.clear(); setSaveState(); return; }
  if (Store.kind === 'api' && P._blocked) { dirty.clear(); setSaveState(); return; }
  saving = true;
  const Px = P;
  // modo gratuito del escritorio: un solo proyecto guardado
  if (Store.kind === 'desk' && LIC.mode === 'free' && !Px._saved) {
    const others = (await Store.list().catch(() => [])).filter(x => x.id !== Px.id && !x.shared).length;
    if (others >= (LIC.freeProjects || 1)) {
      dirty.clear(); saving = false; Px._blocked = true; setSaveState();
      if (!Px._blockNoticed && typeof freeLimitNotice === 'function') { Px._blockNoticed = true; freeLimitNotice(); }
      return;
    }
  }
  const which = [...dirty];
  dirty.clear();
  if (!Px._saved) { which.push('script', 'data'); }
  setSaveState();
  try {
    const where = await Store.save(Px, [...new Set(which)]);
    if (Store.kind === 'desk' && where) Px._path = where;
    const first = !Px._saved;
    Px._saved = true; Px._blocked = false;
    if (first && typeof refreshProjCount === 'function') refreshProjCount();   // un proyecto nuevo cuenta en «Proyectos»
    saveErr = '';
    if (Px === P) ls.set('last', Px.id);
    // el ejemplo recién adoptado: sus dibujos, que estaban solo en memoria
    if (Px._adoptFrames && Px === P) { delete Px._adoptFrames; for (const [k, u] of Object.entries(FRAMES)) if (u) Store.saveFrame(Px.id, k, u).catch(() => problem('Un dibujo del ejemplo no se pudo guardar.')); }
  } catch (e) {
    if (e && (e.code === 'limit_projects' || e.code === 'limit_scripts' || e.code === 'need_plan')) {
      Px._blocked = true; saving = false; setSaveState();
      if (!Px._blockNoticed && typeof freeLimitNotice === 'function') { Px._blockNoticed = true; freeLimitNotice(e.data && e.data.kind, e.message); }
      return;
    }
    if (Px === P) which.forEach(w => dirty.add(w));
    if (Store.kind === 'api') {
      // sin conexión o servidor ocupado: se reintenta solo; otros errores se avisan una vez
      const retry = e && (e.code === 'offline' || e.code === 'rate_limited' || e.status >= 500);
      if (retry) setTimeout(() => { if (dirty.size) saveSoon(); }, e && e.kept ? 15000 : 5000);
      saveErr = e && e.kept ? 'Sin conexión · guardado en este equipo' : e && e.code === 'offline' ? 'Sin conexión · reintentando' : e && e.code === 'no_session' ? 'Sin sesión' : 'No se pudo guardar';
      if (e && e.message && !retry && e.code !== 'no_session' && Date.now() - (flushSave.warned || 0) > 15000) { flushSave.warned = Date.now(); toast(e.message, 6000); }
    }
    else if (e && (e.code === 'invalid_argument') && Store.kind === 'db') { UI.readOnly = true; saveErr = 'Solo lectura'; renderBanner(); }
    else if (e && e.code === 'quota_exceeded') saveErr = 'El almacenamiento del proyecto está lleno';
    else if (e && e.name === 'QuotaExceededError') saveErr = 'El navegador no tiene más espacio';
    else saveErr = 'No se pudo guardar';
  }
  saving = false;
  setSaveState();
}
/* en la web (guardado en el navegador), recuerda guardar una copia .json cada semana */
function backupDue() {
  if (Store.kind !== 'local' || !P || !P._saved || P._sample) return 0;
  const day = 864e5, now = Date.now();
  let first = ls.get('bk0:' + P.id, 0); if (!first) { first = now; ls.set('bk0:' + P.id, now); }
  const last = ls.get('bk:' + P.id, 0);
  if (last) { const d = Math.floor((now - last) / day); return d >= 7 ? d : 0; }
  return now - first >= 3 * day ? 1 : 0;
}
/* por qué el proyecto abierto no se guarda (o '' si se guarda): el ejemplo, el plan gratuito o una vista sin almacenamiento */
function unsavedWhy() {
  if (!P) return '';
  if (Store.kind === 'mem') return 'mem';
  if (UI.readOnly) return '';
  if (P._blocked) return 'blocked';
  if (P._sample && !P._saved) return 'sample';
  return '';
}
function setSaveState() {
  const el = $('#saveState');
  if (!el) return;
  let cls = '', txt = 'Guardado';
  const why = unsavedWhy();
  if (why) { cls = 'warn'; txt = 'No se guarda'; }
  else if (UI.readOnly) { cls = 'local'; txt = 'Solo lectura'; }
  else if (saveErr) { cls = /^Sin conexión/.test(saveErr) ? 'off' : 'err'; txt = saveErr; }
  else if (typeof OFFLINE !== 'undefined' && OFFLINE.on) { cls = 'off'; txt = 'Sin conexión'; }
  else if (saving || dirty.size) { cls = 'busy'; txt = 'Guardando…'; }
  else if (!P || !P._saved) { cls = 'local'; txt = 'Sin cambios'; }
  else if (Store.kind === 'local') txt = 'Guardado en este navegador';
  el.className = 'save ' + cls;
  // lectores de pantalla: se anuncia solo cuando algo no se guarda (no cada «Guardando…»)
  if (cls === 'err' || cls === 'off') { el.setAttribute('role', 'alert'); } else el.removeAttribute('role');
  const bk = backupDue();
  el.innerHTML = (why
    ? `<button class="save-warn" type="button" aria-haspopup="dialog" aria-label="Este proyecto no se guarda: ver por qué y cómo guardarlo">${ICO.warn}<span class="hide-sm">No se guarda</span></button>`
    : `<i></i><span class="hide-sm">${esc(txt)}</span>`)
    + (bk ? `<button class="bk" type="button" title="Los proyectos de la web viven solo en este navegador. Una copia .${ea(PROJ_EXT)} te protege si se borran los datos del navegador.">${bk === 1 ? 'Guarda una copia' : `Sin copia hace ${bk} días`}</button>` : '');
  const b = $('.bk', el); if (b) b.onclick = () => backupProject();
  const w = $('.save-warn', el); if (w) w.onclick = () => unsavedPop(w);
  el.title = why ? '' : Store.kind === 'desk' && P && P._path && txt === 'Guardado' ? 'Guardado en ' + P._path : txt;
  // en el teléfono el estado va en el menú (⋯ o la cuenta): un punto avisa cuando algo no se guarda; sin conexión o con
  // un error de guardado, además, una franja con palabras debajo de la barra (en la computadora ya se lee arriba)
  const alert = !!why || cls === 'err' || cls === 'off';
  let ob = $('#offBanner');
  if (cls === 'err' || cls === 'off') {
    if (!ob && $('#banners')) { ob = document.createElement('div'); ob.id = 'offBanner'; ob.className = 'off-banner'; ob.setAttribute('role', 'status'); $('#banners').prepend(ob); }
    // solo si cambia: el aviso (role=status) se vuelve a leer en voz alta cada vez que se reescribe
    const msg = cls === 'off' && txt === 'Sin conexión' ? 'Sin conexión: lo que anotes queda en este equipo y se envía cuando vuelva internet.' : txt;
    if (ob && ob._msg !== msg) { ob._msg = msg; ob.innerHTML = `${ICO.warn}<span>${esc(msg)}</span>`; }
  } else if (ob) ob.remove();
  for (const b of [$('#moreBtn'), $('#acctBtn')]) if (b) b.toggleAttribute('data-alert', alert);
}
/* el triángulo de alerta: por qué no se guarda y las salidas (antes era la franja del ejemplo) */
function unsavedPop(anchor) {
  const why = unsavedWhy(); if (!why) return;
  const fsp = `<button data-w="backup">Guardar .${PROJ_EXT}</button>`;
  const body = why === 'sample' ? `<h5>Proyecto de ejemplo</h5>
      <p class="hint uw-p">Prueba todo lo que quieras: los cambios del ejemplo no se guardan. Para quedarte con tu trabajo:</p>
      <div class="menu"><button data-w="adopt">Guardar el ejemplo como mi proyecto</button><button data-w="import">Importar mi guion…</button><button data-w="blank">Empezar en blanco</button></div>`
    : why === 'mem' ? `<h5>Esta vista no puede guardar</h5>
      <p class="hint uw-p">Los cambios se pierden al cerrar. Guarda el proyecto como archivo .${PROJ_EXT} y ábrelo luego con «Abrir».</p>
      <div class="menu">${fsp}</div>`
    : `<h5>Sin guardar: ${Store.kind === 'api' ? 'límite del plan' : 'modo gratuito'}</h5>
      <p class="hint uw-p">${Store.kind === 'api' ? 'Llegaste al límite de tu plan, así que este proyecto no se guarda en tu cuenta' : 'El modo gratuito guarda un proyecto. Los cambios de este no se guardan'}; puedes llevártelo en un archivo .${PROJ_EXT}.</p>
      <div class="menu">${typeof freeLimitNotice === 'function' ? '<button data-w="plans">Ver cómo guardar más proyectos</button>' : ''}${fsp}</div>`;
  popover(anchor, body, p => p.addEventListener('click', e => {
    const x = e.target.closest('[data-w]'); if (!x) return;
    closePop();
    const k = x.dataset.w;
    if (k === 'adopt') adoptSample();
    if (k === 'import') pickFile(SCRIPT_ACCEPT, 'import');
    if (k === 'blank') newBlankProject();
    if (k === 'backup') backupProject();
    if (k === 'plans') freeLimitNotice(P && P._kind);
  }));
}
