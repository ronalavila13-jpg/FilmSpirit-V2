/* ============================================================
   Pestaña · CONSTRUCCIÓN — argumento, escaleta y tarjetas (etapa Guion)
   Viaja con el guion (sección «guion» del equipo). La sinopsis de cada escena escrita es la misma del
   Guion rayado (P.scenes[clave].synopsis, que viaja con el desglose).
   Datos: P.build = {
     arg: { logline, storyline, sinopsis, argumento },
     cards: { id: { id, h, syn, after, ord, act, plot } }   escenas por escribir; «after» es la escena escrita que
                                                         las precede (null: al principio del guion)
     sc: { clave: { act, plot } }                          acto y trama de cada escena escrita
     acts: ['Acto I', 'Acto II', 'Acto III'], plots: [{ id, name, c }] }
   Escaleta y Tarjetas muestran las mismas escenas: las escritas siguen el orden del guion; moverlas mueve
   también su texto en el guion (se pregunta antes). «Pasar al guion» crea el encabezado donde le toca.
   ============================================================ */
const B_ARG = [
  ['logline', 'Logline', 'Una sola oración: quién es el protagonista, qué quiere y qué se lo impide.', [15, 50], 2],
  ['storyline', 'Storyline', 'La historia en unas cinco líneas: el inicio, el nudo y el desenlace.', [50, 130], 4],
  ['sinopsis', 'Sinopsis', 'La historia completa en alrededor de una página, con su final.', [250, 650], 10],
  ['argumento', 'Argumento', 'La historia contada en prosa, escena por escena o por secuencias, en presente.', [1200, 9000], 18],
];
const B_PLOT_C = ['#E0523A', '#3D7FD6', '#2F9A5B', '#C99A12', '#8D5CC8', '#D9669B'];
const B_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const B_VIEWS = [['arg', 'Argumento'], ['bio', 'Biografías'], ['esc', 'Escaleta'], ['cards', 'Tarjetas']];
/* biografía de personaje: los campos, en el orden en que se piensa un personaje */
const B_ROLES = ['', 'Protagonista', 'Antagonista', 'Secundario', 'Episódico', 'Otro'];
const B_BIO_F = [
  ['look', 'Apariencia', 'Cómo se ve: rasgos, cuerpo, cómo se viste y cómo se mueve.', 2],
  ['persona', 'Personalidad', 'Su carácter: cómo piensa, cómo habla, sus manías y sus contradicciones.', 3],
  ['past', 'Historia previa', 'De dónde viene y qué le pasó antes de que empiece la historia.', 3],
  ['want', 'Qué quiere', 'Su objetivo consciente: lo que persigue en la historia.', 2],
  ['need', 'Qué necesita', 'Lo que de verdad le falta, aunque no lo sepa.', 2],
  ['fear', 'Qué teme', 'Su miedo, su herida o lo que le impide conseguirlo.', 2],
  ['arc', 'Arco', 'Cómo cambia del principio al final (o por qué no cambia).', 2],
  ['rel', 'Relaciones', 'Con quién se cruza y qué es para cada uno.', 2],
  ['notes', 'Notas', '', 2],
];
const B_BIO_KEYS = ['name', 'age', 'role', ...B_BIO_F.map(f => f[0])];
const bWords = t => (String(t || '').match(/\S+/g) || []).length;
const buildEditable = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('guion'));
const synEditable = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('desglose'));
const bView = () => { const v = ls.get('bView', 'arg'); return B_VIEWS.some(x => x[0] === v) ? v : 'arg'; };

/* datos de versiones anteriores o de otra persona: en la forma que la pestaña espera */
function buildNormalize(Px) {
  const isO = o => o && typeof o === 'object' && !Array.isArray(o);
  const B = Px.build = isO(Px.build) ? Px.build : {};
  const A = B.arg = isO(B.arg) ? B.arg : {};
  for (const [k] of B_ARG) if (typeof A[k] !== 'string') A[k] = A[k] == null ? '' : String(A[k]);
  B.cards = isO(B.cards) ? B.cards : {};
  for (const [id, c] of Object.entries(B.cards)) {
    if (!isO(c)) { delete B.cards[id]; continue; }
    c.id = id; c.h = typeof c.h === 'string' ? c.h : ''; c.syn = typeof c.syn === 'string' ? c.syn : '';
    if (c.after != null && typeof c.after !== 'string') c.after = String(c.after);
    if (!Number.isFinite(+c.ord)) c.ord = 0; else c.ord = +c.ord;
    if (c.act != null && !Number.isInteger(c.act)) delete c.act;
    if (c.plot != null && typeof c.plot !== 'string') delete c.plot;
  }
  B.sc = isO(B.sc) ? B.sc : {};
  for (const [k, m] of Object.entries(B.sc)) { if (!isO(m)) { delete B.sc[k]; continue; } if (m.act != null && !Number.isInteger(m.act)) delete m.act; if (m.plot != null && typeof m.plot !== 'string') delete m.plot; }
  B.acts = Array.isArray(B.acts) ? B.acts.filter(a => typeof a === 'string').slice(0, 8) : [];
  if (!B.acts.length) B.acts = ['Acto I', 'Acto II', 'Acto III'].map(trData);
  B.plots = Array.isArray(B.plots) ? B.plots.filter(p => isO(p) && typeof p.id === 'string' && /^[\w-]{1,24}$/.test(p.id)).slice(0, 6) : null;
  if (!B.plots) B.plots = [{ id: 'p1', name: trData('Trama principal'), c: B_PLOT_C[0] }, { id: 'p2', name: trData('Subtrama'), c: B_PLOT_C[1] }];
  for (const p of B.plots) { p.name = typeof p.name === 'string' ? p.name : ''; if (!/^#[0-9A-Fa-f]{6}$/.test(p.c || '')) p.c = B_PLOT_C[0]; }
  B.bios = isO(B.bios) ? B.bios : {};
  for (const [id, b] of Object.entries(B.bios)) {
    if (!isO(b) || !/^[\w-]{1,40}$/.test(id)) { delete B.bios[id]; continue; }
    b.id = id; for (const k of B_BIO_KEYS) b[k] = typeof b[k] === 'string' ? b[k] : b[k] == null ? '' : String(b[k]);
    if (!B_ROLES.includes(b.role)) b.role = '';
    if (b.el != null && typeof b.el !== 'string') delete b.el;
    if (!Number.isFinite(+b.ord)) b.ord = 0;
  }
  return B;
}
const BLD = () => P.build || buildNormalize(P);
const bPlot = id => { const p = BLD().plots.find(x => x.id === id) || null; return p && lgMono() ? { ...p, c: lgGray(p.c) } : p; };   // en Monocromo, la trama en gris

/* ---------- el orden: escenas escritas en el orden del guion y las por escribir entre ellas ---------- */
function bItems() {
  const B = BLD(), S = D.sc.scenes, keys = new Set(S.map(s => s.key)), groups = new Map();
  for (const c of Object.values(B.cards)) {
    const g = c.after == null ? '' : keys.has(c.after) ? c.after : '~end';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(c);
  }
  for (const L of groups.values()) L.sort((a, b) => a.ord - b.ord);
  const out = [];
  const pushC = g => { for (const c of groups.get(g) || []) out.push({ id: 'cd:' + c.id, c, act: c.act, plot: c.plot }); };
  pushC('');
  for (const s of S) { const m = B.sc[s.key] || {}; out.push({ id: 'sc:' + s.key, s, act: m.act, plot: m.plot }); pushC(s.key); }
  pushC('~end');
  // cada acto empieza donde se marcó y sigue hasta el próximo (nunca se vuelve a uno anterior)
  const nA = B.acts.length; let cur = 0;
  for (const it of out) { const a = Number.isInteger(it.act) ? Math.min(nA - 1, Math.max(0, it.act)) : cur; it.eff = Math.max(cur, a); cur = it.eff; }
  return out;
}
const bSections = items => { const n = BLD().acts.length, secs = Array.from({ length: n }, () => []); for (const it of items || bItems()) secs[Math.min(n - 1, it.eff)].push(it.id); return secs; };
const bScWritable = () => buildEditable() && (typeof edEditable !== 'function' || edEditable());
/* por qué no se puede tocar el guion: el ejemplo sin guardar ofrece guardarlo; el guion cerrado, abrir una revisión */
function bNoWrite(what) {
  if (P._sample && !P._saved && Store.kind === 'api' && typeof adoptSample === 'function') { confirmBox('Proyecto de ejemplo', `Este es el proyecto de ejemplo. Para ${what}, primero guárdalo como un proyecto tuyo.`, 'Guardar como mi proyecto', adoptSample, false); return; }
  toast(typeof scriptLock === 'function' && scriptLock() ? `El guion está cerrado: abre una revisión para ${what}.` : `No tienes permiso para ${what}.`, 4200);
}
/* aplica un orden nuevo (por actos): acto de cada escena, lugar de las por escribir y, si cambió el orden de las
   escritas, el guion (antes se pregunta) */
function bApply(secs, moved) {
  const B = BLD(), flat = secs.flat();
  const oldSc = D.sc.scenes.map(s => s.key), newSc = flat.filter(id => id.startsWith('sc:')).map(id => id.slice(3));
  const reorder = newSc.join('\u0001') !== oldSc.join('\u0001');
  const commit = () => {
    secs.forEach((ids, ai) => ids.forEach(id => {
      if (id.startsWith('sc:')) { const k = id.slice(3); B.sc[k] = { ...(B.sc[k] || {}), act: ai }; }
      else { const c = B.cards[id.slice(3)]; if (c) c.act = ai; }
    }));
    let after = null, ord = 0;
    for (const id of flat) { if (id.startsWith('sc:')) { after = id.slice(3); ord = 0; } else { const c = B.cards[id.slice(3)]; if (c) { c.after = after; c.ord = ord++; } } }
    if (reorder) bReorderScript(newSc);
    changed('data'); render();
  };
  if (!reorder) { commit(); return; }
  if (!bScWritable()) { bNoWrite('mover escenas en el guion'); render(); return; }
  const k = moved && moved.startsWith('sc:') ? moved.slice(3) : '';
  askBox({
    title: 'Mover la escena en el guion', danger: false, ok: 'Mover',
    text: `La escena ${esc(k)} también se mueve en el guion, con su texto, sus marcas del desglose y sus planos. Conserva su número; si quieres, después renuméralas en el Guion. Se puede deshacer.`,
    onOk: commit, onCancel: () => render(),
  });
}
/* el guion con sus escenas en otro orden (lo de antes de la primera escena queda arriba) */
function bReorderScript(order) {
  edLockKeys();
  const S = computeScenes(P.paras).scenes, by = Object.fromEntries(S.map(s => [s.key, s]));
  const pre = S.length ? S[0].p0 : P.paras.length, idx = [];
  for (let i = 0; i < pre; i++) idx.push(i);
  const seen = new Set();
  for (const k of [...order, ...S.map(s => s.key)]) { const s = by[k]; if (!s || seen.has(k)) continue; seen.add(k); for (let i = s.p0; i < s.p1; i++) idx.push(i); }
  const map = new Array(P.paras.length).fill(null); idx.forEach((o, n) => { map[o] = { i: n }; });
  const moved = new Set();
  order.forEach((k, j) => { const s = by[k]; if (s && S.indexOf(s) !== j) moved.add(s.p0); });
  edRemap(idx.map(i => P.paras[i]), map);
  // guion cerrado con una revisión abierta: el encabezado de cada escena movida lleva la marca de la revisión
  if (typeof edRevMark === 'function') for (const o of moved) { const m = map[o]; if (m && P.paras[m.i]) edRevMark(P.paras[m.i]); }
  edCommit(true);
  derive();
}
function bMoveTo(id, act, index) {
  const secs = bSections();
  for (const s of secs) { const i = s.indexOf(id); if (i >= 0) s.splice(i, 1); }
  act = Math.max(0, Math.min(secs.length - 1, act));
  secs[act].splice(Math.max(0, Math.min(index, secs[act].length)), 0, id);
  bApply(secs, id);
}
/* «el Acto N empieza aquí»: esta escena y las que siguen en su acto pasan al N; las de antes que estaban en el N o
   después quedan en el anterior */
function bActFrom(id, k) {
  const items = bItems(), at = items.findIndex(it => it.id === id); if (at < 0) return;
  const secs = Array.from({ length: BLD().acts.length }, () => []);
  items.forEach((it, i) => { const a = i < at ? Math.min(it.eff, k - 1) : Math.max(it.eff, k); secs[Math.max(0, a)].push(it.id); });
  bApply(secs, null);
}
function bAddCard(act, focus = true) {
  const B = BLD(), secs = bSections();
  act = act == null ? Math.max(0, secs.length - 1) : Math.max(0, Math.min(secs.length - 1, act));
  const id = uid('k');
  B.cards[id] = { id, h: '', syn: '', after: null, ord: 0, act };
  secs[act].push('cd:' + id);
  bApply(secs, 'cd:' + id);
  if (focus) requestAnimationFrame(() => { const el = $(`[data-it="cd:${CSS.escape(id)}"] .b-h-in`); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } });
}
/* «Pasar al guion»: el encabezado (y un párrafo de acción) donde le toca, con la sinopsis de la tarjeta */
function bToScript(id) {
  const B = BLD(), c = B.cards[id]; if (!c) return;
  if (!bScWritable()) { bNoWrite('escribir en el guion'); return; }
  const S = computeScenes(P.paras).scenes, by = Object.fromEntries(S.map(s => [s.key, s]));
  const at = c.after != null && by[c.after] ? by[c.after].p1 : c.after != null ? P.paras.length : (S.length ? S[0].p0 : P.paras.length);
  edPush(true);
  edLockKeys();
  const head = (c.h || '').trim().toUpperCase();
  const r = edFormat() === 'av' ? avRow() : null;
  edInsert(at, r ? [{ t: 'h', x: head }, { t: 'v', x: '', r }, { t: 'u', x: '', r }] : [{ t: 'h', x: head }, { t: 'a', x: '' }]);
  P.paras[at].n = edNewKey(at);
  const key = P.paras[at].n;
  edCommit(true); derive();
  if (c.syn && synEditable()) { P.scenes[key] = { ...(P.scenes[key] || {}), synopsis: c.syn }; }
  const m = {}; if (Number.isInteger(c.act)) m.act = c.act; if (c.plot) m.plot = c.plot; B.sc[key] = m;
  for (const o of Object.values(B.cards)) if (o !== c && o.after === c.after && o.ord > c.ord) o.after = key;
  delete B.cards[id];
  changed('data'); render();
  toast(`La escena ${key} ya está en el guion.`, 5200, { label: 'Escribirla', fn: () => bOpenScene(key) });
}
function bOpenScene(key) {
  const s = sceneOfKey(key); if (!s) return;
  UI.scene = s.idx;
  setTab('script');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const el = $(`#view .ep[data-i="${s.p0}"]`);
    if (el) { el.scrollIntoView({ block: 'center' }); if (edEditable()) edSetCaret(s.p0 + 1 < P.paras.length && P.paras[s.p0 + 1].t !== 'h' ? s.p0 + 1 : s.p0, 0); }
  }));
}
function bDelCard(id) {
  const B = BLD(), c = B.cards[id]; if (!c) return;
  histNote('Quitar una escena por escribir', null, 'build');
  delete B.cards[id]; changed('data'); render();
  toastUndo('Escena por escribir quitada.');
}

/* ---------- vista ---------- */
const bAuto = el => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 2 + 'px'; };
function bWcText(k) {
  const d = B_ARG.find(x => x[0] === k), n = bWords(BLD().arg[k]);
  return `${n} ${n === 1 ? 'palabra' : 'palabras'} · lo usual: ${d[3][0]}–${d[3][1].toLocaleString('es-PE')}`;
}
/* el argumento en una hoja blanca tamaño A4; a la izquierda, los selectores de los textos cortos: al elegir uno, su
   cuadro se abre arriba en la hoja y empuja el argumento hacia abajo (se abren en su orden: logline, storyline…) */
const bArgOpen = () => { const o = ls.get('bArgOpen', []); return Array.isArray(o) ? o.filter(k => B_ARG.some(x => x[0] === k && k !== 'argumento')) : []; };
const bShortWc = k => { const n = bWords(BLD().arg[k]); return n ? String(n) : 'Vacío'; };
function bArgHTML() {
  const A = BLD().arg, ed = buildEditable(), open = new Set(bArgOpen());
  const [, aName, aHint] = B_ARG.find(x => x[0] === 'argumento');
  const nav = B_ARG.map(([k, name, hint], i) => {
    const main = k === 'argumento', on = main || open.has(k), has = !!A[k].trim();
    return `<button class="b-argbtn${main ? ' main' : ''}${has ? ' has' : ''}" data-act="b-argt" data-k="${ea(k)}" ${main ? '' : `aria-pressed="${ea(on)}"`} title="${ea(hint)}">
      <span class="b-n">${i + 1}</span><b class="b-argbt">${esc(name)}</b><small class="tnum" data-wcs="${ea(k)}">${esc(bShortWc(k))}</small></button>`;
  }).join('');
  const box = k => { const [, name, hint, , rows] = B_ARG.find(x => x[0] === k); return `<section class="b-box" data-box="${ea(k)}">
      <div class="b-box-h"><b>${esc(name)}</b><span class="b-wc" data-wc="${ea(k)}">${esc(bWcText(k))}</span><button class="icbtn" data-act="b-argt" data-k="${ea(k)}" aria-label="Cerrar ${ea(name)}" title="Cerrar">${ICO.close}</button></div>
      <textarea class="b-ta b-ta-box" rows="${rows}" data-bind="b-arg" data-k="${ea(k)}" aria-label="${ea(name)}" placeholder="${ea(ed ? hint : '—')}" ${ed ? '' : 'readonly'}>${esc(A[k])}</textarea></section>`; };
  return `<div class="b-argw">
    <nav class="b-argnav" aria-label="Textos del argumento"><h3 class="b-argh">Textos <small>palabras</small></h3><div class="hd-box b-argl">${nav}</div><p class="hint">De lo más corto a lo más largo. «Exportar» los arma seguidos en un PDF.</p></nav>
    <div class="b-sheet">
      <header class="b-sheet-h"><h2>${esc(P.meta.title || 'Proyecto')}</h2>${P.meta.author ? `<span>${esc(P.meta.author)}</span>` : ''}</header>
      ${B_ARG.filter(([k]) => open.has(k)).map(([k]) => box(k)).join('')}
      <section class="b-sheet-a"><div class="b-box-h"><b>${esc(aName)}</b><span class="b-wc" data-wc="argumento">${esc(bWcText('argumento'))}</span></div>
        <textarea class="b-ta b-ta-sheet" data-bind="b-arg" data-k="argumento" aria-label="${ea(aName)}" placeholder="${ea(ed ? aHint : '—')}" ${ed ? '' : 'readonly'}>${esc(A.argumento)}</textarea></section>
    </div>
  </div>`;
}
const bDot = c => `<i class="b-dot" style="--pc:${ea(c || 'transparent')}"></i>`;
function bItemHTML(it, n, board) {
  const B = BLD(), ed = buildEditable(), sed = it.s ? synEditable() : ed, pl = bPlot(it.plot);
  const syn = it.s ? ((P.scenes[it.s.key] || {}).synopsis || '') : it.c.syn;
  const tag = board ? 'div' : 'li';
  const head = it.s
    ? `<b class="b-h" title="${ea(it.s.heading)}">${esc(it.s.heading || 'Escena sin encabezado')}</b>`
    : `<input type="text" class="b-h-in" value="${esc(it.c.h)}" data-bind="b-card" data-id="${ea(it.c.id)}" data-f="h" placeholder="${ea(ed ? 'INT. LUGAR - DÍA' : '—')}" aria-label="Encabezado de la escena por escribir" ${ed ? '' : 'readonly'}>`;
  const synF = `<textarea class="b-syn" rows="${board ? 3 : 1}" ${it.s ? `data-bind="synopsis" data-key="${ea(it.s.key)}"` : `data-bind="b-card" data-id="${ea(it.c.id)}" data-f="syn"`} placeholder="${ea(sed ? 'Qué pasa en la escena' : '')}" aria-label="Sinopsis" ${sed ? '' : 'readonly'}>${esc(syn)}</textarea>`;
  const num = it.s ? esc(it.s.key) : '·';
  const meta = it.s ? `<span class="b-pg tnum" title="Largo en el guion">${fmtEighths(D.metrics.eighths[it.s.idx])}</span>` : '<span class="b-todo">Por escribir</span>';
  const tools = `<button class="b-plot" data-act="b-plot" data-it="${ea(it.id)}" style="--pc:${ea(pl ? pl.c : 'transparent')}" title="${ea(pl ? 'Trama: ' + pl.name : 'Sin trama')}" aria-label="${ea(pl ? 'Trama: ' + pl.name : 'Elegir trama')}" ${ed ? '' : 'disabled'}></button>
    ${!it.s && ed ? `<button class="btn sm b-tw" data-act="b-towrite" data-id="${ea(it.c.id)}" title="Crea su encabezado en el guion, en este lugar">Pasar al guion</button>` : ''}
    <button class="icbtn b-more" data-act="b-more" data-it="${ea(it.id)}" aria-haspopup="menu" aria-label="Más acciones" title="Mover, acto…">${ICO.more}</button>`;
  return `<${tag} class="${board ? 'b-card' : 'b-it'}${it.s ? '' : ' todo'}" data-it="${ea(it.id)}" style="--pc:${ea(pl ? pl.c : '')}">
    ${ed ? '<span class="b-grip" aria-hidden="true" title="Arrastra para mover">⠿</span>' : ''}
    ${board ? `<div class="b-top"><span class="b-k">${num}</span>${meta}<span class="grow"></span>${tools}</div>${head}${synF}`
      : `<span class="b-k">${num}</span><div class="b-main">${head}${synF}</div><div class="b-side">${meta}${tools}</div>`}
  </${tag}>`;
}
function bActsHTML(board) {
  const B = BLD(), items = bItems(), ed = buildEditable(), n = B.acts.length;
  const secs = Array.from({ length: n }, () => []);
  for (const it of items) secs[Math.min(n - 1, it.eff)].push(it);
  const actHead = (name, ai, L) => {
    const e8 = L.reduce((a, it) => a + (it.s ? D.metrics.eighths[it.s.idx] || 0 : 0), 0), todo = L.filter(it => !it.s).length;
    return `<header class="b-act-h"><input type="text" class="b-act-n" value="${esc(name)}" data-bind="b-actname" data-i="${ai}" aria-label="Nombre del acto ${ai + 1}" ${ed ? '' : 'readonly'}>
      <span class="hint tnum">${L.length} ${L.length === 1 ? 'escena' : 'escenas'}${e8 ? ` · ${fmtEighths(e8)} págs.` : ''}${todo ? ` · ${todo} por escribir` : ''}</span>
      <span class="grow"></span>${ed ? `<button class="btn ghost sm" data-act="b-add" data-a="${ai}" title="Agrega una escena por escribir al final de este acto">+ Escena</button>` : ''}</header>`;
  };
  const body = secs.map((L, ai) => board
    ? `<section class="b-col" data-act-i="${ai}" style="--ak:${ai % 2 ? 62 : 34}%">${actHead(B.acts[ai], ai, L)}<div class="b-cards" data-drop="${ai}">${L.map((it, j) => bItemHTML(it, j, true)).join('')}${L.length ? '' : '<p class="hint b-empty">Arrastra escenas aquí.</p>'}</div></section>`
    : `<section class="b-act" data-act-i="${ai}">${actHead(B.acts[ai], ai, L)}<ol class="b-list" data-drop="${ai}">${L.map((it, j) => bItemHTML(it, j, false)).join('')}${L.length ? '' : '<li class="hint b-empty">Arrastra escenas aquí o agrega una con «+ Escena».</li>'}</ol></section>`).join('');
  const foot = ed ? `<div class="b-acts-ed"><button class="btn ghost sm" data-act="b-act-add" ${n >= 8 ? 'disabled' : ''}>+ Acto</button>${n > 1 ? `<button class="btn ghost sm" data-act="b-act-rm" title="Las escenas del último acto pasan al anterior">Quitar el último acto</button>` : ''}<button class="btn ghost sm" data-act="b-plots">Tramas…</button></div>` : '';
  return board ? `<div class="b-board">${body}</div>${foot}` : `<div class="b-esc">${body}${foot}</div>`;
}
/* el título grande de cada vista (lote I): el nombre de la vista y, en gris, el proyecto y cuánto lleva */
function bHeadHTML(view, items, todo) {
  const name = (B_VIEWS.find(x => x[0] === view) || [, ''])[1], t = `<b data-no-tr>${esc(P.meta.title || 'Proyecto')}</b>`;
  if (view === 'arg') { const n = bWords(BLD().arg.argumento); return `<div class="hd b-hd">${hdHead({ title: name, sub: `${t} · <span data-wcm="argumento">${n} ${n === 1 ? 'palabra' : 'palabras'}</span> · lo usual, de 1 200 a 9 000` })}</div>`; }
  return `<div class="hd b-hd${view === 'cards' ? ' wide' : ''}">${hdHead({ title: name, sub: `${t} · ${items.length} ${items.length === 1 ? 'escena' : 'escenas'}${todo ? ` · ${todo} por escribir` : ''}` })}</div>`;
}
RENDER.build = function () {
  const v = $('#view'), view = bView(), ed = buildEditable();
  BLD();
  if (view === 'bio') { bBioRender(v, ed); return; }
  const items = view === 'arg' ? [] : bItems(), todo = items.filter(it => !it.s).length;
  v.innerHTML = `<div class="ws ws-1"><section class="center">
    <div class="bar">
      ${hdSeg(B_VIEWS.map(([k, n]) => ({ label: n, attrs: `data-act="b-view" data-v="${k}"`, on: view === k })), 'Vista')}
      ${view !== 'arg' && ed ? '<button class="btn hide-sm" data-act="b-add" title="Escena por escribir al final">+ Escena</button>' : ''}
      <span class="grow"></span>
      ${toolsHTML()}
    </div>
    <div class="scroller pad${view === 'cards' ? ' b-sc-board' : ''}" data-keep="b-${view}">${bHeadHTML(view, items, todo)}${view === 'arg' ? bArgHTML() : bActsHTML(view === 'cards')}</div>
  </section></div>`;
  bindView();
  $$('#view .b-ta, #view .b-syn').forEach(bAuto);
  if (view !== 'arg' && ed) bDragBind($('#view .scroller'));
};

/* ---------- arrastrar para ordenar (con el mouse desde cualquier parte; con el dedo, desde el asa) ---------- */
function bDragBind(root) {
  if (!root || root._bd) return; root._bd = true;
  root.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !buildEditable()) return;
    const it = e.target.closest('[data-it]'); if (!it || !root.contains(it)) return;
    const grip = e.target.closest('.b-grip');
    if (!grip && (e.pointerType !== 'mouse' || e.target.closest('input,textarea,select,button,a,label'))) return;
    const x0 = e.clientX, y0 = e.clientY; let G = null, raf = 0, last = null;
    const start = () => {
      const r = it.getBoundingClientRect(), g = it.cloneNode(true);
      g.classList.add('b-ghost'); g.removeAttribute('data-it'); g.style.width = r.width + 'px';
      document.body.appendChild(g); it.classList.add('dragging');
      const ph = document.createElement(it.tagName === 'LI' ? 'li' : 'div'); ph.className = 'b-ph'; ph.style.height = r.height + 'px';
      it.after(ph);
      document.body.classList.add('b-dragging');
      return { g, ph, dx: x0 - r.left, dy: y0 - r.top };
    };
    const place = (x, y) => {
      const el = document.elementFromPoint(x, y), zone = el && el.closest('[data-drop]');
      if (!zone || !root.contains(zone)) return;
      const kids = [...zone.children].filter(k => k.dataset && k.dataset.it && k !== it);
      let before = null;
      // las tarjetas van en filas que se leen de izquierda a derecha; la escaleta, de arriba abajo
      const grid = zone.classList.contains('b-cards');
      for (const k of kids) { const r = k.getBoundingClientRect(); if (grid ? (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) : y < r.top + r.height / 2) { before = k; break; } }
      if (before) zone.insertBefore(G.ph, before); else { const em = $('.b-empty', zone); zone.insertBefore(G.ph, em && em.parentElement === zone ? em : null); }
    };
    const scroll = () => {
      if (!G || !last) return;
      const r = root.getBoundingClientRect(), m = 48;
      const dy = last.y < r.top + m ? -14 : last.y > r.bottom - m ? 14 : 0, dx = last.x < r.left + m ? -14 : last.x > r.right - m ? 14 : 0;
      if (dy) root.scrollTop += dy;
      const bd = $('.b-board', root); if (dx && bd) root.scrollLeft += dx;
      if (dx || dy) place(last.x, last.y);
      raf = requestAnimationFrame(scroll);
    };
    const move = ev => {
      if (!G) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return; G = start(); raf = requestAnimationFrame(scroll); }
      ev.preventDefault();
      last = { x: ev.clientX, y: ev.clientY };
      G.g.style.transform = `translate(${ev.clientX - G.dx}px,${ev.clientY - G.dy}px) rotate(1deg)`;
      place(ev.clientX, ev.clientY);
    };
    const end = ev => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end);
      cancelAnimationFrame(raf);
      if (!G) return;
      document.body.classList.remove('b-dragging');
      G.g.remove(); it.classList.remove('dragging');
      const zone = G.ph.parentElement;
      if (ev.type === 'pointercancel' || !zone || !zone.dataset.drop) { G.ph.remove(); return; }
      let idx = 0; for (const k of zone.children) { if (k === G.ph) break; if (k.dataset && k.dataset.it && k !== it) idx++; }
      G.ph.remove();
      bMoveTo(it.dataset.it, +zone.dataset.drop, idx);
    };
    addEventListener('pointermove', move, { passive: false }); addEventListener('pointerup', end); addEventListener('pointercancel', end);
  });
}

/* ---------- menús ---------- */
function bPlotMenu(btn) {
  const id = btn.dataset.it, B = BLD(), cur = (id.startsWith('sc:') ? (B.sc[id.slice(3)] || {}).plot : (B.cards[id.slice(3)] || {}).plot) || '';
  popover(btn, `<h5>Trama</h5><div class="menu">${B.plots.map(p => `<button data-p="${ea(p.id)}" aria-pressed="${ea(cur === p.id)}">${bDot(p.c)} ${esc(p.name || 'Sin nombre')}</button>`).join('')}<button data-p="" aria-pressed="${ea(!cur)}">${bDot('')} Sin trama</button></div>
    <button class="linkbtn" data-ed style="margin-top:6px">Editar las tramas…</button>`, p => p.addEventListener('click', e => {
    if (e.target.closest('[data-ed]')) { closePop(); bPlotsDialog(); return; }
    const b = e.target.closest('[data-p]'); if (!b) return;
    closePop();
    const v = b.dataset.p || undefined;
    if (id.startsWith('sc:')) { const k = id.slice(3); B.sc[k] = { ...(B.sc[k] || {}) }; if (v) B.sc[k].plot = v; else delete B.sc[k].plot; }
    else { const c = B.cards[id.slice(3)]; if (!c) return; if (v) c.plot = v; else delete c.plot; }
    changed('data'); render();
  }));
}
function bPlotsDialog() {
  const B = BLD(), list = B.plots.map(p => ({ ...p }));
  const m = modal({
    title: 'Tramas',
    body: `<p class="hint" style="margin:0">Cada escena puede llevar el color de su trama: así se ve en la escaleta y en las tarjetas cómo se alternan.</p><div class="b-plots" id="bPl"></div>
      <button class="btn sm" id="bPlAdd" style="justify-self:start">+ Trama</button>`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="bPlOk">Guardar</button>',
  });
  const paint = () => {
    $('#bPl', m).innerHTML = list.map((p, i) => `<div class="b-pl"><span class="b-sw">${B_PLOT_C.map(c => `<button type="button" class="b-swc" data-i="${i}" data-c="${ea(c)}" style="--pc:${ea(c)}" aria-pressed="${ea(p.c === c)}" aria-label="Color"></button>`).join('')}</span>
      <input type="text" class="ti" value="${esc(p.name)}" data-n="${i}" placeholder="Nombre de la trama" aria-label="Nombre de la trama"><button class="xbtn" data-rm="${i}" aria-label="Quitar la trama" title="Quitar">${ICO.close}</button></div>`).join('') || '<p class="hint">Sin tramas.</p>';
    $('#bPlAdd', m).disabled = list.length >= 6;
  };
  paint();
  m.addEventListener('input', e => { const t = e.target.closest('[data-n]'); if (t) list[+t.dataset.n].name = t.value; });
  m.addEventListener('click', e => {
    const s = e.target.closest('[data-c]'); if (s) { list[+s.dataset.i].c = s.dataset.c; paint(); return; }
    const r = e.target.closest('[data-rm]'); if (r) { list.splice(+r.dataset.rm, 1); paint(); }
  });
  $('#bPlAdd', m).onclick = () => { if (list.length >= 6) return; const used = new Set(list.map(p => p.c)); list.push({ id: uid('p'), name: '', c: B_PLOT_C.find(c => !used.has(c)) || B_PLOT_C[0] }); paint(); const ins = $$('#bPl input', m); ins[ins.length - 1].focus(); };
  $('#bPlOk', m).onclick = () => {
    B.plots = list.map(p => ({ id: p.id, name: p.name.trim(), c: p.c }));
    const ok = new Set(B.plots.map(p => p.id));
    for (const x of [...Object.values(B.cards), ...Object.values(B.sc)]) if (x.plot && !ok.has(x.plot)) delete x.plot;
    changed('data'); closeModal(); render();
  };
}
function bMoreMenu(btn) {
  const id = btn.dataset.it, B = BLD(), items = bItems(), i = items.findIndex(it => it.id === id), it = items[i];
  if (!it) return;
  const ed = buildEditable(), secs = bSections(items), sec = secs[it.eff], j = sec.indexOf(id);
  const rows = [];
  if (ed) {
    if (i > 0) rows.push(['up', 'Subir']);
    if (i < items.length - 1) rows.push(['down', 'Bajar']);
    B.acts.forEach((a, k) => { if (k !== it.eff) rows.push(['act' + k, it.s ? `El ${a || 'acto ' + (k + 1)} empieza aquí` : `Mover al ${a || 'acto ' + (k + 1)}`]); });
    if (!it.s) rows.push(['write', 'Pasar al guion']);
  }
  if (it.s) rows.push(['open', 'Ver en el guion']);
  if (ed && !it.s) rows.push(['del', 'Quitar']);
  popover(btn, `<div class="menu">${rows.map(([k, n]) => `<button data-m="${ea(k)}">${esc(n)}</button>`).join('')}</div>`, p => p.addEventListener('click', e => {
    const b = e.target.closest('[data-m]'); if (!b) return; closePop();
    const k = b.dataset.m;
    if (k === 'up') { if (j > 0) bMoveTo(id, it.eff, j - 1); else bMoveTo(id, it.eff - 1, secs[it.eff - 1].length); }
    else if (k === 'down') { if (j < sec.length - 1) bMoveTo(id, it.eff, j + 1); else bMoveTo(id, it.eff + 1, 0); }
    else if (k.startsWith('act')) { const a = +k.slice(3); if (it.s) bActFrom(id, a); else bMoveTo(id, a, a > it.eff ? 0 : secs[a].length); }
    else if (k === 'write') bToScript(id.slice(3));
    else if (k === 'open') bOpenScene(id.slice(3));
    else if (k === 'del') bDelCard(id.slice(3));
  }));
}

Object.assign(ACT, {
  'b-view': b => { ls.set('bView', b.dataset.v); render(); },
  'b-argt': b => {
    const k = b.dataset.k;
    if (k === 'argumento') { const t = $('.b-ta-sheet'); if (t) { t.scrollIntoView({ block: 'start', behavior: 'smooth' }); t.focus({ preventScroll: true }); } return; }
    const o = new Set(bArgOpen()), was = o.has(k);
    if (was) o.delete(k); else o.add(k);
    ls.set('bArgOpen', B_ARG.map(x => x[0]).filter(x => o.has(x)));
    render();
    if (!was) requestAnimationFrame(() => { const t = $(`.b-box[data-box="${CSS.escape(k)}"] textarea`); if (t) { t.focus({ preventScroll: true }); t.closest('.b-box').scrollIntoView({ block: 'nearest' }); } });
  },
  'b-add': b => bAddCard(b.dataset.a != null ? +b.dataset.a : null),
  'b-towrite': b => bToScript(b.dataset.id),
  'b-plot': b => bPlotMenu(b),
  'b-plots': () => bPlotsDialog(),
  'b-more': b => bMoreMenu(b),
  'b-act-add': () => { const B = BLD(); if (B.acts.length >= 8) return; B.acts.push('Acto ' + B_ROMAN[B.acts.length]); changed('data'); render(); },
  'b-act-rm': () => {
    const B = BLD(); if (B.acts.length < 2) return;
    const last = B.acts.length - 1;
    for (const x of [...Object.values(B.cards), ...Object.values(B.sc)]) if (Number.isInteger(x.act) && x.act >= last) x.act = last - 1;
    B.acts.pop(); changed('data'); render();
  },
});
Object.assign(BIND, {
  'b-arg': el => {
    const k = el.dataset.k; BLD().arg[k] = el.value; changed('data'); bAuto(el);
    const w = $(`[data-wc="${CSS.escape(k)}"]`); if (w) w.textContent = bWcText(k);
    const wm = $(`[data-wcm="${CSS.escape(k)}"]`); if (wm) { const n = bWords(el.value); wm.textContent = `${n} ${n === 1 ? 'palabra' : 'palabras'}`; }
    const ws = $(`[data-wcs="${CSS.escape(k)}"]`); if (ws) { ws.textContent = bShortWc(k); ws.closest('.b-argbtn').classList.toggle('has', !!el.value.trim()); }
  },
  'b-card': (el, ev) => { const c = BLD().cards[el.dataset.id]; if (!c) return; c[el.dataset.f] = el.dataset.f === 'h' && ev === 'change' ? el.value.toUpperCase() : el.value; if (el.dataset.f === 'h' && ev === 'change') el.value = c.h; if (el.tagName === 'TEXTAREA') bAuto(el); changed('data'); },
  'b-actname': el => { const B = BLD(); B.acts[+el.dataset.i] = el.value; changed('data'); },
});
// la sinopsis de una escena escrita (la misma del Guion rayado) crece con su texto
const B_SYN0 = BIND.synopsis;
BIND.synopsis = (el, ev) => { B_SYN0(el, ev); if (el.classList.contains('b-syn')) bAuto(el); };

HELP.build = [
  ['Argumento', 'Logline, storyline, sinopsis y argumento, de lo más corto a lo más largo. Al lado de cada título ves cuántas palabras lleva y lo usual para ese texto (es una guía, no un límite).'],
  ['Escaleta y Tarjetas', 'Son dos vistas de las mismas escenas: la escaleta como lista y las tarjetas en filas, de izquierda a derecha, con cada acto en su franja (uno debajo del otro). Las escenas que ya están en el guion aparecen solas, en su orden, con su sinopsis (la misma del Guion rayado).'],
  ['Escenas por escribir', '«+ Escena» agrega una escena que aún no está en el guion (con borde punteado). Arrástrala a su lugar y, cuando quieras escribirla, «Pasar al guion» crea su encabezado justo ahí.'],
  ['Mover', 'Arrastra una escena (con el dedo, desde ⠿) o usa ⋯ › Subir y Bajar. Si mueves una escena escrita a otro lugar, se pregunta antes de moverla también en el guion, con su texto, sus marcas y sus planos.'],
  ['Actos', 'Cada acto empieza donde lo marcas: ⋯ › «El Acto II empieza aquí». Sus nombres se cambian tocándolos; «+ Acto» agrega otro.'],
  ['Tramas', 'El punto de color de cada escena es su trama. «Tramas…» cambia sus nombres y colores.'],
  ['Exportar', 'El argumento sale en un PDF con portada y los textos seguidos (eliges cuáles); la escaleta, como tabla por actos; y las tarjetas, cuatro por hoja para recortar.'],
];
EXPORTS.build = () => [
  { label: 'Argumento', hint: 'PDF con portada: logline, storyline, sinopsis y argumento seguidos', run: btn => bArgExportDialog(btn) },
  { label: 'Escaleta', hint: 'PDF: las escenas por acto, con su sinopsis y su trama', run: btn => exportPDF('escaleta', btn), pdf: { kind: 'escaleta', opts: null } },
  { label: 'Tarjetas para recortar', hint: 'PDF: cuatro tarjetas por hoja', run: btn => exportPDF('tarjetas', btn), pdf: { kind: 'tarjetas', opts: null } },
];
function bArgExportDialog(btn) {
  const A = BLD().arg;
  const m = modal({
    title: 'Exportar el argumento',
    body: `<p class="hint" style="margin:0">Salen seguidos, en este orden, después de una portada con el título.</p>
      ${B_ARG.map(([k, name]) => `<label class="opt"><input type="checkbox" data-k="${ea(k)}" ${A[k].trim() ? 'checked' : 'disabled'}><span><b>${esc(name)}</b><span class="hint">${A[k].trim() ? esc(bWcText(k).split(' · ')[0]) : 'Vacío'}</span></span></label>`).join('')}`,
    foot: '<button class="btn" data-close>Cancelar</button><button class="btn primary" id="bxGo">Exportar PDF</button>',
  });
  $('#bxGo', m).onclick = () => {
    const parts = $$('input[data-k]:checked', m).map(x => x.dataset.k);
    if (!parts.length) { toast('Elige al menos un texto.'); return; }
    closeModal(); exportPDF('argumento', btn, { parts });
  };
}

/* ---------- PDF ---------- */
function pdfArgumento(opts = {}) {
  const doc = newDoc('portrait'), A = BLD().arg, W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const parts = B_ARG.filter(([k]) => (opts.parts || B_ARG.map(x => x[0])).includes(k) && A[k].trim());
  const M = 72, TW = W - M * 2;
  // portada
  // portada: la barra de la pestaña arriba, el título en la letra de los títulos y una raya de su color
  doc.setFillColor(...PT.bar); doc.rect(0, 0, W, 64, 'F'); doc.setFillColor(...PT.c); doc.rect(0, 64, W, 2.4, 'F');
  doc.setFont('title', 'bold'); doc.setFontSize(28); doc.setTextColor(...INK);
  const tl = doc.splitTextToSize(pdfSafe(P.meta.title || 'Proyecto'), TW);
  let y = H * .38;
  doc.text(tl, W / 2, y, { align: 'center' }); y += tl.length * 32 + 6;
  doc.setDrawColor(...PT.deep); doc.setLineWidth(2); doc.line(W / 2 - 26, y, W / 2 + 26, y); y += 26;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...MUTED);
  doc.text(pdfSafe(parts.map(p => p[1]).join('  ·  ')), W / 2, y, { align: 'center' }); y += 40;
  doc.setTextColor(...INK);
  if (P.meta.author) { doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text('Guion', W / 2, y, { align: 'center' }); y += 15; doc.setFontSize(12); doc.setTextColor(...INK); doc.text(pdfSafe(P.meta.author), W / 2, y, { align: 'center' }); y += 28; }
  const foot = [P.meta.company, P.meta.draft, new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })].filter(Boolean).join('  ·  ');
  doc.setFontSize(9); doc.setTextColor(...MUTED); doc.text(pdfSafe(foot), W / 2, H - 72, { align: 'center' });
  // los textos, seguidos
  doc.addPage('letter', 'portrait'); y = M;
  const LH = 16;
  for (const [k, name] of parts) {
    if (y > M && y + 90 > H - M) { doc.addPage('letter', 'portrait'); y = M; }
    if (y > M) y += 18;
    doc.setFont('title', 'bold'); doc.setFontSize(16); doc.setTextColor(...INK); doc.text(pdfSafe(name), M, y + 12);
    doc.setDrawColor(...PT.deep); doc.setLineWidth(1.6); doc.line(M, y + 20, M + 32, y + 20);
    y += 38;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11.5); doc.setTextColor(...INK);
    const paras = A[k].replace(/\r/g, '').split(/\n+/).map(t => t.trim()).filter(Boolean);
    for (const t of paras) {
      const L = doc.splitTextToSize(pdfSafe(t), TW);
      for (const ln of L) {
        if (y + LH > H - M) { doc.addPage('letter', 'portrait'); y = M; doc.setFont('helvetica', 'normal'); doc.setFontSize(11.5); doc.setTextColor(...INK); }
        doc.text(ln, M, y + 11); y += LH;
      }
      y += 7;
    }
  }
  // números de página (sin la portada)
  const n = doc.getNumberOfPages();
  for (let i = 2; i <= n; i++) {
    doc.setPage(i);
    doc.setFillColor(...PT.bar); doc.rect(0, 0, W, 20, 'F'); doc.setFillColor(...PT.c); doc.rect(0, 20, W, 1.6, 'F');
    doc.setFont('title', 'bold'); doc.setFontSize(8); doc.setTextColor(...PT.barInk); doc.text(pdfSafe(`${P.meta.title || ''}  ·  Argumento`), M, 13.4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(pdfSafe(P.meta.title || ''), M, H - 36); doc.text(`${i - 1} / ${n - 1}`, W - M, H - 36, { align: 'right' });
  }
  return { doc, name: fileSafe(P.meta.title) + '_argumento.pdf' };
}
function pdfEscaleta() {
  const doc = newDoc('portrait'), B = BLD(), items = bItems();
  const y = docHeader(doc, 'Escaleta', `${items.length} escenas`);
  // (lote K) cada acto es un bloque; el encabezado de la escena en negrita y la sinopsis debajo, en gris
  const blocks = [];
  B.acts.forEach((a, ai) => {
    const L = items.filter(it => it.eff === ai);
    if (!L.length) return;
    const body = [[pdfRich([{ segs: [{ t: a || 'Acto ' + (ai + 1), st: 'bold' }, { t: `   ${L.length} ${L.length === 1 ? 'escena' : 'escenas'}`, col: MUTED }] }], { colSpan: 4, fillColor: PDF_GROUP })]];
    for (const it of L) {
      const pl = bPlot(it.plot), syn = it.s ? ((P.scenes[it.s.key] || {}).synopsis || '') : it.c.syn;
      body.push([{ content: it.s ? pdfSafe(it.s.key) : '', styles: { fontStyle: 'bold' } }, pdfRich([{ t: it.s ? it.s.heading : (it.c.h || '').toUpperCase() || 'Escena por escribir', st: 'bold' }, syn ? { t: syn, fs: PF.small + .2, col: MUTED } : null, it.s ? null : { t: 'Por escribir', fs: PF.small, col: MUTED, tr: 1 }]),
        pl ? pdfSafe(pl.name) : '', { content: it.s ? fmtEighths(D.metrics.eighths[it.s.idx]) : '', styles: { halign: 'right' } }]);
    }
    blocks.push(body);
  });
  pdfBlocks(doc, y, { ...TBL, head: [['Esc.', 'Escena y sinopsis', 'Trama', 'Largo']], columnStyles: { 0: { cellWidth: 36 }, 2: { cellWidth: 100 }, 3: { cellWidth: 46, halign: 'right' } } }, blocks);
  pageNumbers(doc, 'Escaleta');
  return { doc, name: fileSafe(P.meta.title) + '_escaleta.pdf' };
}
/* cuatro tarjetas por hoja carta, con su línea de corte */
function pdfTarjetas() {
  const doc = newDoc('portrait'), B = BLD(), items = bItems(), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const M = 30, G = 18, cw = (W - M * 2 - G) / 2, ch = (H - M * 2 - G) / 2;
  items.forEach((it, i) => {
    const q = i % 4; if (i && !q) doc.addPage('letter', 'portrait');
    const x = M + (q % 2) * (cw + G), y0 = M + Math.floor(q / 2) * (ch + G);
    const pl = bPlot(it.plot), syn = it.s ? ((P.scenes[it.s.key] || {}).synopsis || '') : it.c.syn;
    doc.setDrawColor(190, 194, 200); doc.setLineWidth(.5); doc.setLineDashPattern([3, 3], 0); doc.rect(x, y0, cw, ch); doc.setLineDashPattern([], 0);
    if (pl) { doc.setFillColor(...rgb(pl.c)); doc.rect(x, y0, cw, 8, 'F'); }
    doc.setFont('title', 'bold'); doc.setFontSize(22); doc.setTextColor(...INK);
    doc.text(pdfSafe(it.s ? it.s.key : '·'), x + 16, y0 + 40);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
    doc.text(pdfSafe([B.acts[it.eff], pl ? pl.name : '', it.s ? '' : 'por escribir'].filter(Boolean).join('  ·  ')), x + cw - 16, y0 + 26, { align: 'right' });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK);
    const hl = doc.splitTextToSize(pdfSafe(it.s ? it.s.heading : (it.c.h || '').toUpperCase() || 'ESCENA POR ESCRIBIR'), cw - 32).slice(0, 3);
    doc.text(hl, x + 16, y0 + 62);
    let y = y0 + 62 + hl.length * 14 + 8;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
    const sl = doc.splitTextToSize(pdfSafe(syn), cw - 32), max = Math.floor((y0 + ch - 16 - y) / 14);
    doc.text(sl.slice(0, Math.max(0, max)), x + 16, y + 10);
  });
  if (!items.length) { doc.setFontSize(11); doc.text('Sin escenas.', M, M + 20); }
  return { doc, name: fileSafe(P.meta.title) + '_tarjetas.pdf' };
}
PDFX.argumento = pdfArgumento; PDFX.escaleta = pdfEscaleta; PDFX.tarjetas = pdfTarjetas;

/* ---------- biografías de personaje ---------- */
const bNorm = t => String(t || '').trim().toUpperCase().replace(/\s+/g, ' ');
/* los personajes del reparto (con su número) y los que se crearon aquí antes de estar en el guion; una biografía
   creada a mano se une al personaje del desglose que tenga su mismo nombre */
function bBioList() {
  const B = BLD(), out = [], used = new Set();
  let moved = false;
  const cast = castingRoles();
  for (const e of cast) {
    let b = B.bios[e.id] || Object.values(B.bios).find(x => x.el === e.id);
    if (!b) { b = Object.values(B.bios).find(x => !x.el && !used.has(x.id) && bNorm(x.name) && bNorm(x.name) === bNorm(e.name)); if (b) { b.el = e.id; moved = true; } }
    if (b) used.add(b.id);
    out.push({ id: b ? b.id : e.id, e, b: b || null });
  }
  for (const b of Object.values(B.bios).sort((a, z) => a.ord - z.ord)) if (!used.has(b.id) && !(b.el && P.elements[b.el])) out.push({ id: b.id, e: null, b });
  if (moved) changed('data');
  return out;
}
const bBioName = it => it.e ? titleCase(it.e.name) : (it.b && it.b.name.trim()) || 'Personaje sin nombre';
function bBioOf(it, make) {
  if (it.b || !make) return it.b;
  const B = BLD(), id = it.e ? it.e.id : uid('h');
  B.bios[id] = { id, el: it.e ? it.e.id : undefined, name: it.e ? it.e.name : '', age: '', role: '', ord: Object.keys(B.bios).length };
  for (const [k] of B_BIO_F) B.bios[id][k] = '';
  if (!B.bios[id].el) delete B.bios[id].el;
  it.b = B.bios[id];
  return it.b;
}
function bBioRender(v, ed) {
  const list = bBioList();
  if (!list.some(it => it.id === UI.bioSel)) UI.bioSel = list.length ? list[0].id : '';
  const cur = list.find(it => it.id === UI.bioSel) || null;
  const filled = it => it.b && B_BIO_F.some(([k]) => it.b[k].trim());
  const side = `${hdSide('Personajes', String(list.length), 'Buscar personaje')}
    <ul class="slist" id="slist">${list.map(it => `<li data-q="${esc(bBioName(it).toLowerCase())}"><button data-act="b-bio-sel" data-id="${ea(it.id)}" ${cur && cur.id === it.id ? 'aria-current="true"' : ''}>
      <span class="k tnum">${it.e && D.castNum[it.e.id] ? D.castNum[it.e.id] : '·'}</span>
      <span class="h">${esc(bBioName(it))}${it.b && it.b.role ? `<small class="b-bio-r">${esc(it.b.role)}</small>` : ''}</span>
      <span class="e">${filled(it) ? '<i class="cand-ok" title="Con biografía">✓</i>' : ''}</span></button></li>`).join('')}</ul>
    ${ed ? '<div class="b-bio-add"><button class="btn sm" data-act="b-bio-new" title="Un personaje que aún no está en el guion">+ Personaje</button></div>' : ''}`;
  let body = hdEmpty({ icon: 'people', title: 'Aún no hay personajes', text: 'Los del reparto del desglose aparecen solos. Con «Agregar personaje» creas uno que todavía no está en el guion; cuando aparezca con el mismo nombre, su biografía lo sigue.', btn: ed ? hdBtn('pri', 'Agregar personaje', { icon: 'plus', attrs: 'data-act="b-bio-new"' }) : '' });
  if (cur) {
    const b = cur.b || {}, val = k => esc(b[k] || ''), dis = ed ? '' : 'readonly';
    const sc = cur.e && typeof caScenes === 'function' ? caScenes(cur.e.id) : [];
    const canCast = cur.e && typeof castingEditable === 'function' && castingEditable() && (b.age || b.look || '').trim();
    body = `<section class="hd cand-hd">${hdHead({ title: `${cur.e && D.castNum[cur.e.id] ? `<span class="cand-num">${D.castNum[cur.e.id]}</span>` : ''}${esc(bBioName(cur))}`,
        sub: cur.e ? (sc.length ? `${sc.length} ${sc.length === 1 ? 'escena' : 'escenas'} · ${esc(sc.join(', '))}` : 'En el reparto, sin escenas') : 'Aún no está en el guion',
        act: `${canCast ? hdBtn('sec', 'Usar en el Casting', { attrs: 'data-act="b-bio-cast" title="Copia la edad y la apariencia al perfil buscado del Casting"' }) : ''}${ed && !cur.e ? `<button class="icbtn" data-act="b-bio-more" data-id="${ea(cur.id)}" aria-haspopup="menu" aria-label="Más acciones" title="Quitar">${ICO.more}</button>` : ''}` })}</section>
      <div class="b-bio">
        <div class="b-bio-g">
          ${cur.e ? '' : `<label class="cand-fl b-bio-n"><span>Nombre</span><input type="text" class="cand-in" value="${val('name')}" data-bind="b-bio" data-id="${ea(cur.id)}" data-f="name" placeholder="${ea(ed ? 'Como aparecerá en el guion' : '')}" ${dis}></label>`}
          <label class="cand-fl"><span>Edad</span><input type="text" class="cand-in" value="${val('age')}" data-bind="b-bio" data-id="${ea(cur.id)}" data-f="age" inputmode="numeric" placeholder="${ea(ed ? 'Ej.: 34' : '')}" ${dis}></label>
          <label class="cand-fl"><span>Papel en la historia</span><select class="cand-in" data-bind="b-bio" data-id="${ea(cur.id)}" data-f="role" ${ed ? '' : 'disabled'}>${B_ROLES.map(r => `<option value="${ea(r)}" ${b.role === r ? 'selected' : ''}>${esc(r || '—')}</option>`).join('')}</select></label>
        </div>
        ${B_BIO_F.map(([k, name, hint, rows]) => `<label class="b-bio-f"><span>${esc(name)}</span><textarea class="cand-in b-bio-ta" rows="${rows}" data-bind="b-bio" data-id="${ea(cur.id)}" data-f="${ea(k)}" placeholder="${ea(ed ? hint : '')}" ${dis}>${val(k)}</textarea></label>`).join('')}
      </div>`;
  }
  // la barra va arriba de la lista y de la ficha, como en las otras vistas: al pasar a Biografías no se corre
  v.innerHTML = `<div class="ws ws-1">
    <section class="center">
      <div class="bar">
        ${hdSeg(B_VIEWS.map(([k, n]) => ({ label: n, attrs: `data-act="b-view" data-v="${k}"`, on: k === 'bio' })), 'Vista')}
        <button class="btn ghost only-narrow" data-act="drawer" data-d="#side">Personajes</button>
        <span class="grow"></span>${toolsHTML()}
      </div>
      <div class="b-bio-cols">
        <aside class="side" id="side">${side}</aside>
        <div class="scroller pad" data-keep="b-bio-${ea(cur ? cur.id : '')}">${body}</div>
      </div>
    </section></div>`;
  bindView(); bindSceneSearch();
  $$('#view .b-bio textarea').forEach(bAuto);
}
function bBioItem(id) { return bBioList().find(it => it.id === id) || null; }
Object.assign(ACT, {
  'b-bio-sel': b => { UI.bioSel = b.dataset.id; closeDrawers(); render(); },
  'b-bio-new': () => {
    const it = { id: '', e: null, b: null }; const bio = bBioOf(it, true);
    UI.bioSel = bio.id; changed('data'); render();
    requestAnimationFrame(() => { const f = $('.b-bio-n input'); if (f) f.focus(); });
  },
  'b-bio-more': b => {
    const id = b.dataset.id;
    popover(b, '<div class="menu"><button data-m="del">Quitar el personaje</button></div>', p => p.addEventListener('click', e => {
      if (!e.target.closest('[data-m]')) return; closePop();
      histNote('Quitar una biografía', null, 'build');
      delete BLD().bios[id]; changed('data'); render(); toastUndo('Personaje quitado.');
    }));
  },
  'b-bio-cast': () => {
    const it = bBioItem(UI.bioSel); if (!it || !it.e || !it.b) return;
    const brief = [it.b.age.trim() ? `${it.b.age.trim()}${/^\d+$/.test(it.b.age.trim()) ? ' años' : ''}.` : '', it.b.look.trim()].filter(Boolean).join(' ');
    const r = caRole(it.e.id, true);
    const go = () => { r.brief = brief; changed('data'); toast(`Listo: el perfil buscado de ${titleCase(it.e.name)} en el Casting.`, 3600, { label: 'Ver', fn: () => { UI.caRole = it.e.id; setTab('casting'); } }); };
    if (r.brief.trim() && r.brief.trim() !== brief) askBox({ title: 'Reemplazar el perfil buscado', danger: false, ok: 'Reemplazar', text: `En el Casting ya dice: «${esc(r.brief.trim().slice(0, 160))}». ¿Lo reemplazas por la edad y la apariencia de la biografía?`, onOk: go });
    else go();
  },
});
Object.assign(BIND, {
  'b-bio': (el, ev) => {
    const it = bBioItem(el.dataset.id); if (!it) return;
    const b = bBioOf(it, true), f = el.dataset.f;
    b[f] = el.value; changed('data');
    if (el.tagName === 'TEXTAREA') bAuto(el);
    if (ev === 'change' && (f === 'name' || f === 'role')) render();
  },
});
HELP.build.splice(1, 0, ['Biografías', 'Una ficha por personaje: edad, papel en la historia, apariencia, personalidad, historia previa, qué quiere, qué necesita, qué teme, su arco y sus relaciones. Los del reparto aparecen solos; «+ Personaje» crea uno que aún no está en el guion. «Usar en el Casting» lleva la edad y la apariencia a su perfil buscado.']);
EXPORTS.build = (prev => () => { const L = prev(); L.splice(1, 0, { label: 'Biografías de personajes', hint: 'PDF: la ficha de cada personaje', run: btn => exportPDF('bios', btn), pdf: { kind: 'bios', opts: null } }); return L; })(EXPORTS.build);
function pdfBios() {
  const doc = newDoc('portrait'), W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40;
  const list = bBioList().filter(it => it.b && (it.b.age || it.b.role || B_BIO_F.some(([k]) => it.b[k].trim())));
  let y = docHeader(doc, 'Biografías de personajes', `${list.length} ${list.length === 1 ? 'personaje' : 'personajes'}`);
  const next = need => { if (y + need > H - 44) { doc.addPage(); y = docHeader(doc, 'Biografías de personajes', ''); } };
  if (!list.length) { doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text('Aún no hay biografías.', M, y + 10); }
  list.forEach((it, i) => {
    if (i) { next(120); y += 6; }
    y = pdfGroupBand(doc, y, `${it.e && D.castNum[it.e.id] ? D.castNum[it.e.id] + '. ' : ''}${bBioName(it)}`, [it.b.role, it.b.age.trim() ? it.b.age.trim() + (/^\d+$/.test(it.b.age.trim()) ? ' años' : '') : ''].filter(Boolean).join(' · '));
    for (const [k, name] of B_BIO_F) {
      const t = it.b[k].trim(); if (!t) continue;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
      const L = doc.splitTextToSize(pdfSafe(t), W - M * 2);
      next(28 + Math.min(L.length, 4) * 12);
      // (lote K) el nombre del campo en minúscula normal, negrita y gris; el texto con su interlineado
      doc.setFont('helvetica', 'bold'); doc.setFontSize(PF.small); doc.setTextColor(...MUTED); doc.text(pdfSafe(name), M, y + 8); y += 13;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK);
      for (const ln of L) { next(13); doc.text(ln, M, y + 8); y += 9.5 * PF.lh; }
      y += 9;
    }
  });
  pageNumbers(doc, 'Biografías');
  return { doc, name: fileSafe(P.meta.title) + '_biografias.pdf' };
}
PDFX.bios = pdfBios;
