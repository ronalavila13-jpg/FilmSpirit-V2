/* ============================================================
   COMPARTIR EN LA VERSIÓN WEB · la página publicada en Claude
   Los mismos permisos que en escritorio (pestañas y áreas del desglose),
   con las cuentas de Claude como identidad y la base de datos de la página
   como transporte. share.js usa este objeto igual que DESK.team.
     teams/<pid>                  equipo y permisos (solo el dueño de la página escribe)
     requests/<persona>           pedidos de acceso (cada persona escribe el suyo)
     projects/<pid>               cabecera del proyecto (shared: true)
     projects/<pid>/secs/<sec>    versión vigente de cada pestaña {v, tag, n, by, c}
     projects/<pid>/blobs/<sec>-<tag>-<i>   el contenido de esa versión, en trozos
     projects/<pid>/frames/<k>    imágenes del storyboard y fotos del desglose (las grandes, en frameparts/<k>~<i>)
   Los permisos los aplica la aplicación: a diferencia de escritorio, los
   datos no van cifrados, así que la página se comparte solo con el equipo.
   ============================================================ */
// los permisos (ALLP, cleanPerms, permReadSet): las reglas comunes de areas.js
const WEBTEAM = {
  db: null, user: null, me: null, owner: false, h: {}, subs: [], pid: null, team: null,
  vers: {}, tags: {}, plain: {}, read: new Set(), queue: {},
  async init(db) {
    this.db = db;
    try { this.user = await window.claude.use('user'); } catch (e) { this.user = null; }
    if (this.user) { try { this.me = await this.user.id(); this.owner = await this.user.isOwner(); } catch (e) { } }
    shareInit();
  },
  ready() { return !!(this.db && this.me); },
  on(ev, fn) { this.h[ev] = fn; },
  emit(ev, ...a) { const f = this.h[ev]; if (f) { try { f(...a); } catch (e) { console.warn('equipo:', e); } } },
  async names(ids) {
    const out = {};
    let ps = {};
    if (ids.length && this.user) { try { ps = await this.user.profiles(ids); } catch (e) { } }
    for (const id of ids) out[id] = (ps[id] && ps[id].name) || 'Alguien';
    return out;
  },
  async search(q) { try { return this.user ? await this.user.search(q || '') : []; } catch (e) { return []; } },
  /* quién soy en un equipo: null = sin acceso */
  role(team) {
    if (!team || !this.me) return null;
    if (team.owner === this.me) return { role: 'Producción', perms: ALLP, admin: true };
    const m = team.members && team.members[this.me];
    return m ? { role: m.role || '', perms: m.perms || {}, admin: false } : null;
  },
  async teams() {
    const q = await Store.call(() => this.db.collection('teams').get());
    return Object.fromEntries(q.docs.map(d => [d.id, d.data()]));
  },

  /* ---------- secciones: cada versión en trozos nuevos; la cabecera apunta a la vigente ---------- */
  async readSec(pid, s, d) {
    let txt = '';
    for (let i = 0; i < (d.n || 0); i++) {
      const c = await Store.call(() => this.db.doc(`projects/${pid}/blobs/${s}-${d.tag}-${i}`).get());
      if (!c.exists) return null;     // cambió mientras se leía: la versión nueva llega sola
      txt += c.data().s;
    }
    return txt;
  },
  async writeSec(pid, s, json) {
    const ref = this.db.doc(`projects/${pid}/secs/${s}`);
    const cur = await Store.call(() => ref.get());
    const old = cur.exists ? cur.data() : null;
    const v = Math.max(this.vers[s] || 0, old ? old.v || 0 : 0) + 1, tag = uid();
    const chunks = [];
    for (let i = 0; i < json.length; i += CH) chunks.push(json.slice(i, i + CH));
    if (!chunks.length) chunks.push('');
    for (let i = 0; i < chunks.length; i++) await Store.call(() => this.db.doc(`projects/${pid}/blobs/${s}-${tag}-${i}`).set({ s: chunks[i] }));
    this.vers[s] = v; this.tags[s] = tag; this.plain[s] = json;
    await Store.call(() => ref.set({ v, tag, n: chunks.length, by: this.me, c: CLIENT, ts: Date.now() }));
    // los trozos de la versión anterior se borran cuando ya nadie los está leyendo
    if (old && old.tag && old.tag !== tag) setTimeout(() => this.dropBlobs(pid, s, old.tag, old.n), 30000);
    Store.call(() => this.db.doc('projects/' + pid).update({ updated: Date.now() })).catch(() => { });
  },
  async dropBlobs(pid, s, tag, n) {
    for (let i = 0; i < (n || 0); i++) await Store.call(() => this.db.doc(`projects/${pid}/blobs/${s}-${tag}-${i}`).delete()).catch(() => { });
  },

  /* ---------- abrir ---------- */
  async state(pid, team, load) {
    const me = this.role(team), perms = me.admin ? ALLP : me.perms;
    const read = permReadSet({ admin: me.admin, role: me.role, perms }), sections = {}, unavailable = [];
    if (load) for (const [s] of SEC_LIST) {
      sections[s] = null;
      if (!read.has(s)) continue;
      const d = await Store.call(() => this.db.doc(`projects/${pid}/secs/${s}`).get());
      if (!d.exists) continue;
      const dd = d.data(), json = await this.readSec(pid, s, dd);
      if (json == null) { unavailable.push(s); continue; }
      this.vers[s] = dd.v; this.tags[s] = dd.tag; this.plain[s] = json;
      sections[s] = { json };
    }
    const ids = [team.owner, ...Object.keys(team.members || {})], nm = await this.names(ids);
    return {
      pid, title: team.title || '', admin: me.admin, perms: sclone(perms), read: [...read], unavailable,
      me: { id: this.me, name: nm[this.me] || (me.admin ? 'Producción' : 'Yo'), role: me.role },
      sections: load ? sections : undefined,
      members: me.admin ? [{ id: team.owner, name: nm[team.owner], role: 'Producción', perms: ALLP, owner: true },
        ...Object.entries(team.members || {}).map(([id, x]) => ({ id, name: nm[id], role: x.role || '', perms: x.perms || {} }))] : undefined,
    };
  },
  async open(pid) {
    if (!this.ready()) return { error: 'Para abrir un proyecto compartido entra a esta página con tu cuenta de Claude.' };
    const t = await Store.call(() => this.db.doc('teams/' + pid).get());
    const team = t.exists ? t.data() : null;
    if (!team) return { error: 'Este proyecto compartido ya no existe.' };
    if (!this.role(team)) return { error: `No tienes acceso a «${team.title || 'este proyecto'}». Pídelo desde el menú del proyecto › Pedir acceso.` };
    this.close();
    this.pid = pid; this.team = team; this.vers = {}; this.tags = {}; this.plain = {};
    const st = await this.state(pid, team, true);
    this.read = new Set(st.read);
    this.subscribe(pid);
    return st;
  },
  subscribe(pid) {
    const quiet = () => { };
    this.subs.push(this.db.collection(`projects/${pid}/secs`).onSnapshot(q => {
      for (const ch of q.docChanges()) {
        if (ch.type === 'removed') continue;
        const s = ch.doc.id, d = ch.doc.data();
        // una sección a la vez, en el orden en que llegan
        this.queue[s] = (this.queue[s] || Promise.resolve()).then(() => this.incoming(pid, s, d)).catch(e => console.warn('equipo:', e));
      }
    }, quiet));
    let firstT = true;
    this.subs.push(this.db.doc('teams/' + pid).onSnapshot(sn => {
      if (firstT) { firstT = false; return; }
      this.teamChanged(pid, sn.exists ? sn.data() : null).catch(e => console.warn('equipo:', e));
    }, quiet));
    let firstF = true;
    this.subs.push(this.db.collection(`projects/${pid}/frames`).onSnapshot(q => {
      if (firstF) { firstF = false; return; }
      for (const ch of q.docChanges()) {
        if (ch.type === 'removed') { this.emit('frame', pid, { k: ch.doc.id, u: null }); continue; }
        dbFrameOf(this.db, f => Store.call(f), pid, ch.doc.id, ch.doc.data()).then(u => { if (u) this.emit('frame', pid, { k: ch.doc.id, u }); }).catch(() => { });
      }
    }, quiet));
  },
  close() { for (const u of this.subs) { try { u(); } catch (e) { } } this.subs = []; this.pid = null; this.queue = {}; },

  /* ---------- cambios que llegan: se aceptan solo si quien los hizo podía hacerlos ---------- */
  async incoming(pid, s, d) {
    if (pid !== this.pid || !d || !this.read.has(s) || d.tag === this.tags[s] || d.c === CLIENT) return;
    const json = await this.readSec(pid, s, d);
    if (json == null || pid !== this.pid) return;
    const team = this.team, author = d.by, isOwner = author === team.owner;
    const mem = (team.members || {})[author] || {}, perms = isOwner ? ALLP : mem.perms || {};
    const nm = (await this.names([author]))[author];
    if (!permCanEdit({ admin: isOwner, role: mem.role, perms }, s)) return this.reject(pid, s, d, `Se ignoró un cambio en «${SECNAME[s]}» de ${nm}, que no tiene permiso para editarlo.`);
    const areas = !isOwner && s === 'desglose' ? bdAreasOf(perms) : null;
    if (areas && this.plain[s] != null && bdViolates(JSON.parse(this.plain[s]), JSON.parse(json), areas)) {
      // justo después de la versión que tenemos: se puede comparar con certeza
      if (d.v === (this.vers[s] || 0) + 1) return this.reject(pid, s, d, `${nm} cambió áreas del desglose que no le corresponden: se ignoró el cambio.`);
      this.emit('warn', pid, `Revisa el desglose: ${nm} pudo cambiar áreas que no le corresponden.`);
    }
    this.vers[s] = Math.max(this.vers[s] || 0, d.v || 0); this.tags[s] = d.tag; this.plain[s] = json;
    this.emit('update', pid, { sec: s, json, ver: d.v, by: nm, mine: false });
    return true;
  },
  reject(pid, s, d, msg) {
    this.tags[s] = d.tag;
    this.emit('warn', pid, msg);
    // producción repara la sección con la última versión válida
    const me = this.role(this.team);
    if (me && me.admin && this.plain[s] != null) this.writeSec(pid, s, this.plain[s]).catch(() => { });
  },
  async teamChanged(pid, team) {
    if (pid !== this.pid) return;
    const before = this.role(this.team), after = this.role(team);
    this.team = team;
    if (!after) { this.close(); this.emit('revoked', pid); return; }
    if (bdCanon(before && before.perms) !== bdCanon(after.perms)) {
      // permisos nuevos: se vuelve a abrir con lo que ahora puede leer
      this.vers = {}; this.tags = {}; this.plain = {};
      const st = await this.state(pid, team, true);
      this.read = new Set(st.read);
      this.emit('reload', pid, st);
      return;
    }
    if (after.admin) this.emit('manifest', pid, await this.state(pid, team, false));
  },

  /* ---------- lo que hace la interfaz ---------- */
  async save(pid, s, json) {
    const me = this.role(this.team);
    if (!me || pid !== this.pid) throw new Error('Sesión cerrada');
    if (!me.admin && me.perms[s] !== 'editar') throw new Error('Sin permiso de edición');
    // otra persona guardó una versión que todavía no llegó: primero se fusiona con ella (antes se escribía encima)
    const cur = await Store.call(() => this.db.doc(`projects/${pid}/secs/${s}`).get());
    const d = cur.exists ? cur.data() : null;
    if (d && d.tag && d.tag !== this.tags[s] && d.c !== CLIENT && (d.v || 0) > (this.vers[s] || 0) && await this.incoming(pid, s, d)) return { conflict: true };
    await this.writeSec(pid, s, json);
    return { ver: this.vers[s] };
  },
  async saveFrame(pid, k, url) {
    await dbPutFrame(this.db, f => Store.call(f), pid, k, url);
  },
  async updateTeam(pid, list) {
    const t = await Store.call(() => this.db.doc('teams/' + pid).get());
    const team = sclone(t.data());
    team.members = team.members || {};
    const added = [];
    for (const c of list) {
      if (c.add) { if (c.id && c.id !== team.owner) { team.members[c.id] = { role: c.role || '', perms: cleanPerms(c.perms) }; added.push(c.id); } continue; }
      if (!team.members[c.id]) continue;
      if (c.remove) { delete team.members[c.id]; continue; }
      if (c.perms) team.members[c.id].perms = cleanPerms(c.perms);
      if (c.role != null) team.members[c.id].role = c.role;
    }
    team.rev = (team.rev || 0) + 1;
    await Store.call(() => this.db.doc('teams/' + pid).set(team));
    this.team = team;
    // los pedidos de acceso atendidos se borran
    for (const id of added) {
      const ref = this.db.doc('requests/' + id);
      Store.call(() => ref.get()).then(r => {
        if (!r.exists) return;
        const pids = (r.data().pids || []).filter(x => x !== pid);
        return Store.call(() => pids.length ? ref.set({ pids, ts: r.data().ts || Date.now() }) : ref.delete());
      }).catch(() => { });
    }
    return { passwords: {}, rekeyed: [], state: await this.state(pid, team, false) };
  },
  async logout() { this.close(); },
  /* convertir el proyecto abierto en un proyecto de equipo */
  async create(Px) {
    const pid = Px.id, head = await Store.call(() => this.db.doc('projects/' + pid).get());
    const old = head.exists ? head.data() : {};
    const team = { owner: this.me, title: Px.meta.title, members: {}, rev: 1, created: Date.now() };
    await Store.call(() => this.db.doc('teams/' + pid).set(team));
    this.close(); this.pid = pid; this.team = team; this.vers = {}; this.tags = {}; this.plain = {};
    for (const [s] of SEC_LIST) await this.writeSec(pid, s, canon(secGet(Px, s)));
    await Store.call(() => this.db.doc('projects/' + pid).set({ kind: 'filmspirit', shared: true, title: Px.meta.title, updated: Date.now(), owner: this.me }));
    // el guardado de un solo bloque ya no se usa
    for (const [w, n] of [['script', old.n_script], ['data', old.n_data]]) for (let i = 0; i < (n || 0); i++) Store.call(() => this.db.doc(`projects/${pid}/blobs/${w}-${i}`).delete()).catch(() => { });
    const st = await this.state(pid, team, false);
    st.sections = Object.fromEntries(SEC_LIST.map(([s]) => [s, { json: this.plain[s] }]));
    this.read = new Set(st.read);
    this.subscribe(pid);
    return st;
  },
  async destroy(pid) {
    for (const [s] of SEC_LIST) {
      const d = await Store.call(() => this.db.doc(`projects/${pid}/secs/${s}`).get());
      if (d.exists) { await this.dropBlobs(pid, s, d.data().tag, d.data().n); await Store.call(() => this.db.doc(`projects/${pid}/secs/${s}`).delete()); }
    }
    await dbDropFrames(this.db, f => Store.call(f), pid);
    await Store.call(() => this.db.doc('teams/' + pid).delete());
    await Store.call(() => this.db.doc('projects/' + pid).delete());
    this.close();
  },

  /* ---------- pedidos de acceso ---------- */
  async requests(pid) {
    const q = await Store.call(() => this.db.collection('requests').get());
    const ids = q.docs.filter(d => (d.data().pids || []).includes(pid)).map(d => d.id);
    let ps = {};
    if (ids.length && this.user) { try { ps = await this.user.profiles(ids); } catch (e) { } }
    return ids.map(id => ({ id, name: (ps[id] && ps[id].name) || 'Alguien', avatarUrl: ps[id] ? ps[id].avatarUrl : '' }));
  },
  async requestable() {
    const [q, teams, mine] = await Promise.all([
      Store.call(() => this.db.collection('projects').get()), this.teams(),
      Store.call(() => this.db.doc('requests/' + this.me).get()).then(r => r.exists ? r.data().pids || [] : []).catch(() => []),
    ]);
    return q.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.kind === 'filmspirit' && x.shared && teams[x.id] && !this.role(teams[x.id]))
      .map(x => ({ id: x.id, title: x.title, asked: mine.includes(x.id) }));
  },
  async requestAccess(pid) {
    const ref = this.db.doc('requests/' + this.me);
    const cur = await Store.call(() => ref.get());
    const pids = [...new Set([...((cur.exists && cur.data().pids) || []), pid])];
    await Store.call(() => ref.set({ pids, ts: Date.now() }));
  },
};

/* ---------- diálogos de la web ---------- */
async function shareDialogWeb() {
  if (!WEBTEAM.ready()) { toast('Para compartir, entra a esta página con tu cuenta de Claude.', 5000); return; }
  if (!WEBTEAM.owner) { toast('Solo quien es dueño de esta página puede compartir proyectos.', 5000); return; }
  if (!P._saved) { toast('Guarda el proyecto antes de compartirlo: haz cualquier cambio y espera a que diga «Guardado».', 5000); return; }
  const m = modal({
    title: 'Compartir con el equipo',
    body: `<p style="margin:0">Cada jefe de área entra a esta misma página con su cuenta de Claude y ve solo lo que le asignes: pestañas para <b>ver</b> o <b>editar</b> y, en el desglose, solo sus áreas.</p>
      <ol class="share-steps">
        <li>Toca <b>Compartir proyecto</b>: «${esc(P.meta.title)}» pasa a ser un proyecto de equipo.</li>
        <li>Comparte esta página con cada persona desde el botón <b>Compartir</b> de Claude. Para que pueda editar, debe tener permiso de editor (o de colaborador, si es de tu organización); con permiso de lector solo podrá ver.</li>
        <li>En <b>Equipo y permisos</b>, búscala por su nombre o agrégala cuando pida acceso, y elige su cargo.</li>
      </ol>
      <p class="hint" style="margin:0">Los permisos los aplica ${esc(document.title || 'la aplicación')}. A diferencia de la versión de escritorio, aquí los datos no van cifrados por pestaña: comparte la página solo con tu equipo.</p>`,
    foot: `<button class="btn" data-close>Cancelar</button><button class="btn primary" id="swOk">Compartir proyecto</button>`,
  });
  $('#swOk', m).onclick = async () => {
    const b = $('#swOk', m); b.disabled = true; b.textContent = 'Compartiendo…';
    try {
      await flushSave();
      const st = await WEBTEAM.create(P);
      closeModal();
      const Pn = shareBuild(st);
      const frames = FRAMES_PID === P.id ? FRAMES : null;
      setProject(Pn); sharePaintTabs();
      if (frames) { FRAMES = frames; FRAMES_PID = Pn.id; FR_KNOWN = Pn.id; }
      teamDialog();
    } catch (e) { b.disabled = false; b.textContent = 'Compartir proyecto'; toast(e && e.code === 'invalid_argument' ? 'Esta vista no puede guardar cambios en la página.' : 'No se pudo compartir: ' + errText(e), 5000); }
  };
}
async function requestDialogWeb() {
  if (!WEBTEAM.ready()) { toast('Entra a esta página con tu cuenta de Claude para pedir acceso.', 5000); return; }
  let list = [];
  try { list = await WEBTEAM.requestable(); } catch (e) { }
  const m = modal({
    title: 'Pedir acceso',
    body: list.length ? `<p class="hint" style="margin:0">Producción verá tu pedido en Equipo y permisos y te asignará tus pestañas y áreas.</p>
      <div class="req-list">${list.map((x, i) => `<div class="req-row"><span class="req-t"></span><button class="btn sm ${ea(x.asked ? '' : 'primary')}" data-rq="${i}" ${x.asked ? 'disabled' : ''}>${x.asked ? 'Pedido enviado' : 'Pedir acceso'}</button></div>`).join('')}</div>`
      : '<p style="margin:0">No hay proyectos compartidos a los que puedas pedir acceso. Si producción ya te agregó, ábrelos desde el menú del proyecto.</p>',
    foot: '<button class="btn" data-close>Cerrar</button>',
  });
  $$('.req-t', m).forEach((el, i) => { el.textContent = list[i].title || 'Proyecto'; });
  m.addEventListener('click', async e => {
    const b = e.target.closest('[data-rq]'); if (!b) return;
    b.disabled = true;
    try { await WEBTEAM.requestAccess(list[+b.dataset.rq].id); b.textContent = 'Pedido enviado'; b.classList.remove('primary'); }
    catch (er) { b.disabled = false; toast(er && er.code === 'invalid_argument' ? 'Con tu permiso actual solo puedes ver esta página. Pide a producción que te la comparta como editor.' : 'No se pudo enviar el pedido.', 6000); }
  });
}
