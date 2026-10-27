/* ============================================================
   GUION · escribir y corregir el guion, en formato de cine o AV (dos columnas)
   El texto vive en P.paras [{ t, x, n?, r?, dur? }]:
     cine  h encabezado · a acción · c personaje · p acotación · d diálogo · tr transición · sh plano
     AV    h escena o bloque · v video · u audio (cada fila: un párrafo v y uno u con el mismo r)
   Las marcas del desglose (P.tags: párrafo + posiciones) y los planos (P.shots: p0…p1) apuntan al
   texto: cada cambio las corre para que sigan sobre las mismas palabras. Los números de escena se
   fijan (p.n) al cambiar la estructura, para que el desglose, el plan y la hoja de script sigan
   en su escena; una escena nueva toma el número de la anterior con letra (5A, 5B…). Renumerar
   todo es de Pro y Studio (y se lleva consigo el plan, los planos y las notas de cada escena).
   ============================================================ */
const ED_CINE = [['h', 'Escena'], ['a', 'Acción'], ['c', 'Personaje'], ['p', 'Acotación'], ['d', 'Diálogo'], ['tr', 'Transición'], ['sh', 'Plano']];
const ED_NEXT = { h: 'a', a: 'a', c: 'd', p: 'd', d: 'a', tr: 'h', sh: 'a', g: 'a', ct: 'a' };
const ED_TAB = ['a', 'c', 'p', 'd', 'tr', 'h'];
const ED_HINT = { h: 'INT. LUGAR – DÍA', a: 'Acción', c: 'PERSONAJE', p: '(acotación)', d: 'Diálogo', tr: 'CORTE A:', sh: 'PLANO', v: 'Video: lo que se ve', u: 'Audio: locución, diálogo, música, efectos' };
const ED = { undo: [], redo: [], last: 0, deriveT: 0, ac: null };
const ED_UP = new Set(['h', 'c', 'tr', 'sh']);
const edFormat = () => P.meta.format === 'av' ? 'av' : 'cine';
const edEditableBase = () => !UI.readOnly && (typeof canEditSec !== 'function' || canEditSec('guion')) && !(P._sample && !P._saved && Store.kind === 'api');
// guion cerrado (guion-cierre.js): solo se escribe con una revisión abierta y el código de la persona
const edEditable = () => edEditableBase() && (typeof lockWritable !== 'function' || lockWritable());
const avRow = () => uid('r');
// contadores de escritura (guion-racha.js): las palabras que suma o resta cada cambio hecho aquí (no lo que llega del equipo)
const edWords = x => typeof wkWords === 'function' ? wkWords(x) : 0;
const edWk = n => { if (n && typeof wkDelta === 'function') wkDelta(n); };

/* ---------- deshacer ---------- */
function edSnap() { return JSON.stringify({ paras: P.paras, tags: P.tags, shots: Object.values(P.shots).map(s => [s.id, s.p0, s.p1, s.sc]), format: P.meta.format || '' }); }
function edPush(force) {
  const now = Date.now();
  if (!force && now - ED.last < 900) return;     // las teclas seguidas se deshacen juntas
  ED.last = now;
  ED.undo.push(edSnap()); if (ED.undo.length > 120) ED.undo.shift();
  ED.redo = [];
}
function edRestore(snap) {
  const o = JSON.parse(snap);
  P.paras = o.paras; P.tags = o.tags; P.meta.format = o.format || undefined;
  for (const [id, p0, p1, sc] of o.shots) if (P.shots[id]) Object.assign(P.shots[id], { p0, p1, sc });
}
function edUndo(redo) {
  const from = redo ? ED.redo : ED.undo, to = redo ? ED.undo : ED.redo;
  if (!from.length) return;
  to.push(edSnap());
  const fmt = edFormat(), w0 = P.paras.reduce((a, p) => a + edWords(p.x), 0);
  edRestore(from.pop());
  edWk(P.paras.reduce((a, p) => a + edWords(p.x), 0) - w0);   // deshacer lo escrito lo resta (y rehacer lo suma)
  ED.last = 0;
  edCommit(true);
  if (fmt !== edFormat()) render(); else renderEditorDoc();
}

/* ---------- números de escena ---------- */
function edAutoKeys(paras) {
  // los mismos números que el resto de la app (en una serie, con el episodio delante: 101-1, 101-2…)
  return new Map(computeScenes(paras).scenes.map(s => [s.p0, s.key]));
}
/* fija los números actuales (antes de cambiar la estructura) */
function edLockKeys() { for (const [i, k] of edAutoKeys(P.paras)) if (!P.paras[i].n) P.paras[i].n = k; }
/* números que todavía guardan datos de una escena borrada (sinopsis, fila del plan, planos, Construcción): una
   escena nueva no los toma, para no heredar lo de otra. Deshacer el borrado sí los recupera */
function edRetiredKeys() {
  const out = [], add = o => { if (o && typeof o === 'object') out.push(...Object.keys(o)); };
  add(P.scenes); add(P.schedule && P.schedule.gone); add(P.sup && P.sup.sc); add(P.build && P.build.sc);
  for (const sh of Object.values(P.shots || {})) if (sh && sh.sc != null) out.push(String(sh.sc));
  for (const b of Object.values((P.build && P.build.beats) || {})) if (b && typeof b.on === 'string' && b.on.startsWith('sc:')) out.push(b.on.slice(3));   // (lote AD) Estructura
  return out;
}
/* número para un encabezado nuevo: siguiente entero al final, o la escena anterior con letra */
function edNewKey(i) {
  const used = new Set(P.paras.filter((p, j) => p.t === 'h' && j !== i && p.n).map(p => p.n));
  const taken = new Set([...used, ...edRetiredKeys()]);
  // en una serie, la escena es de su episodio: se cuenta solo dentro de él y el número lleva el episodio delante
  let ep = '';
  for (let j = i; j >= 0; j--) if (P.paras[j].t === 'h' && epOk(P.paras[j].ep)) { ep = String(P.paras[j].ep); break; }
  const pre = ep ? ep + '-' : '';
  let prev = null, after = false;
  for (let j = i - 1; j >= 0; j--) if (P.paras[j].t === 'h') { if (!ep || epPrefix(P.paras[j].n) === ep) prev = P.paras[j].n; break; }
  for (let j = i + 1; j < P.paras.length; j++) if (P.paras[j].t === 'h') { after = !(ep && epOk(P.paras[j].ep)); break; }
  if (!after && !(typeof scriptLock === 'function' && scriptLock())) {
    const ints = [...used].filter(k => k.startsWith(pre) && /^\d+$/.test(k.slice(pre.length))).map(k => +k.slice(pre.length));
    let n = ints.length ? Math.max(...ints) + 1 : 1;
    while (taken.has(pre + n)) n++;
    return pre + n;
  }
  const base = prev ? prev.replace(/[A-Z]+$/, '') : pre + '0';
  let n = prev && /[A-Z]$/.test(prev) ? prev.charCodeAt(prev.length - 1) - 64 + 1 : 1;
  let k;
  do { k = base + shotLetter(n++); } while (taken.has(k));
  return k;
}
function edFixKeys() {
  // al editar el primer encabezado de un guion sin números, se fijan todos
  if (P.paras.some(p => p.t === 'h' && !p.n) && P.paras.some(p => p.t === 'h' && p.n)) {
    P.paras.forEach((p, i) => { if (p.t === 'h' && !p.n) p.n = edNewKey(i); });
  }
  for (const p of P.paras) if (p.t !== 'h' && p.n) delete p.n;
  // el comienzo de un episodio va en un encabezado: si el suyo dejó de serlo, pasa al siguiente
  P.paras.forEach((p, i) => {
    if (p.t === 'h' || p.ep == null) return;
    const j = P.paras.findIndex((q, k) => k > i && q.t === 'h');
    if (j >= 0 && P.paras[j].ep == null) P.paras[j].ep = p.ep;
    delete p.ep;
  });
}
/* renumerar 1, 2, 3…: el plan, los planos, las notas y la hoja de script siguen a su escena */
function edRenumber() {
  if (typeof scriptLock === 'function' && scriptLock()) { toast('El guion está cerrado: sus números de escena no se cambian.'); return; }
  if (!proGate('scriptnum')) return;
  if (isSeries(P)) {
    // serie: cada episodio del 1 en adelante (101-1, 101-2…; 102-1…)
    const eps = computeScenes(P.paras).eps.map(e => e.n);
    const map = epApply(P, null, eps);
    if (UI.sbScene && UI.sbScene in map) UI.sbScene = map[UI.sbScene];
    edCommit(true); renderEditorDoc();
    toast(`Escenas renumeradas del 1 en adelante en cada uno de los ${eps.length} episodios.`);
    return;
  }
  const old = edAutoKeys(P.paras), map = {};
  let n = 0;
  for (const [i, k] of old) { const nk = String(++n); map[k] = nk; P.paras[i].n = nk; }
  renameSceneKeys(map);
  edCommit(true);
  renderEditorDoc();
  toast(`Escenas renumeradas del 1 al ${n}.`);
}
function renameSceneKeys(map) {
  sceneRename(P, map);   // core.js: el plan, los planos, las notas, la hoja de script, construcción y el desglose siguen a su escena
  if (UI.sbScene && UI.sbScene in map) UI.sbScene = map[UI.sbScene];
}

/* ---------- operaciones sobre el texto (con marcas y planos) ---------- */
/* reconstruye P.paras a partir de un mapa: para cada párrafo viejo, dónde quedó y cuánto se corrió */
function edRemap(newParas, map) {
  P.tags = P.tags.filter(t => {
    if (t.p < 0) return true;
    const m = map[t.p];
    if (!m) return false;
    const len = newParas[m.i].x.length;
    const s = t.s + (m.d || 0), e = t.e + (m.d || 0);
    if (m.lo != null && (s < m.lo || e > m.hi)) return false;
    if (s < 0 || e > len || e <= s) return false;
    t.p = m.i; t.s = s; t.e = e; return true;
  });
  for (const sh of Object.values(P.shots)) {
    if (sh.p0 == null) continue;
    const a = edNear(map, sh.p0, 1, sh.p1), b = edNear(map, sh.p1, -1, sh.p0);
    if (a == null || b == null || b < a) { sh.p0 = null; sh.p1 = null; } else { sh.p0 = a; sh.p1 = b; }
  }
  P.paras = newParas;
}
const edNear = (map, i, dir, stop) => { for (let k = i; dir > 0 ? k <= stop : k >= stop; k += dir) if (map[k]) return map[k].i; return null; };
/* cambiar el texto de un párrafo: las marcas antes del cambio quedan, las de después se corren.
   hint: dónde quedó el cursor. Escribir o borrar una letra igual a la vecina («a» junto a «a», un espacio junto a otro)
   se puede leer en dos lugares; el cursor dice cuál fue (así lo nuevo de una revisión se marca justo donde se escribió) */
function edSetText(i, x, hint) {
  const p = P.paras[i]; if (!p || p.x === x) return false;
  const a0 = p.x, delta = x.length - a0.length;
  let pre = 0; while (pre < a0.length && pre < x.length && a0[pre] === x[pre]) pre++;
  let suf = 0; while (suf < a0.length - pre && suf < x.length - pre && a0[a0.length - 1 - suf] === x[x.length - 1 - suf]) suf++;
  if (hint != null && hint >= 0) {
    if (delta > 0 && a0.length - suf === pre) {   // solo se agregó texto: termina donde está el cursor
      const q = hint - delta;
      if (q >= 0 && q < pre && x.slice(0, q) === a0.slice(0, q) && x.slice(q + delta) === a0.slice(q)) { pre = q; suf = a0.length - q; }
    } else if (delta < 0 && x.length - suf === pre) {   // solo se borró: empezaba donde quedó el cursor
      const q = hint;
      if (q >= 0 && q < pre && x.slice(0, q) === a0.slice(0, q) && x.slice(q) === a0.slice(q - delta)) { pre = q; suf = x.length - q; }
    }
  }
  const oldEnd = a0.length - suf, newEnd = x.length - suf;
  P.tags = P.tags.filter(t => {
    if (t.p !== i) return true;
    let s = t.s, e = t.e;
    if (s >= oldEnd) s += delta; else if (s > pre) s = pre;
    if (e >= oldEnd) e += delta; else if (e > pre) e = Math.min(newEnd, Math.max(pre, e));
    if (e <= s) return false;
    t.s = s; t.e = e; return true;
  });
  p.x = x;
  edWk(edWords(x) - edWords(a0));
  if (p.fm) fmtShift(p, pre, oldEnd, delta);   // negrita, itálica… se corren con el texto (guion-formato.js)
  rvwShift(p, pre, oldEnd, delta);   // palabras cambiadas en la revisión: se corren y lo nuevo toma su color (guion-revision.js)
  // guion cerrado: si la página empezaba a mitad del párrafo, la marca se corre con el texto de antes
  if (p.lpg) p.lpg = p.lpg.map(m => +m[0] > 0 && +m[0] >= oldEnd ? [Math.max(1, +m[0] + delta), m[1]] : m);
  edRevMark(p);   // en una revisión, el párrafo cambiado queda marcado
  return true;
}
function edSplit(i, o, t2) {
  const p = P.paras[i], left = p.x.slice(0, o), right = p.x.slice(o);
  const np = edRevMark({ t: t2 || ED_NEXT[p.t] || 'a', x: right });
  const lp = o < p.x.length ? edRevMark({ ...p, x: left }) : { ...p, x: left };   // Intro al final: el párrafo no cambió
  if (p.fm) { const [fl, fr] = fmtSplit(p, o); if (fl) lp.fm = fl; else delete lp.fm; if (fr) { np.fm = fr; fmtTidy(np); } fmtTidy(lp); }
  { const [L, R] = rvwSplit(p, o); rvwPut(lp, L); rvwPut(np, R); }   // lo cambiado en la revisión va con su texto
  edWk(edWords(left) + edWords(right) - edWords(p.x));
  // guion cerrado: una página que empezaba en la parte de la derecha ahora empieza en el párrafo nuevo
  if (p.lpg) {
    const L = p.lpg.filter(m => !(+m[0] > 0) || +m[0] < o), R = p.lpg.filter(m => +m[0] > 0 && +m[0] >= o).map(m => [+m[0] - o, m[1]]);
    if (L.length) lp.lpg = L; else delete lp.lpg;
    if (R.length) np.lpg = R;
  }
  const out = [...P.paras.slice(0, i), lp, np, ...P.paras.slice(i + 1)];
  const map = P.paras.map((_, j) => ({ i: j < i ? j : j + 1 }));
  map[i] = { i };
  // las marcas que quedan a la derecha del corte pasan al párrafo nuevo
  P.tags.forEach(t => { if (t.p === i && t.s >= o) { t.p = -2; t.s -= o; t.e -= o; t._mv = 1; } else if (t.p === i && t.e > o) t.e = o; });
  edRemap(out, map);
  P.tags.forEach(t => { if (t._mv) { t.p = i + 1; delete t._mv; } });
  if (np.t === 'h') { if (out[i].t === 'h' && !out[i].x) { out[i].t = 'a'; } }
  return i + 1;
}
/* une el párrafo i con el anterior */
function edMerge(i) {
  if (i <= 0 || i >= P.paras.length) return null;
  const a = P.paras[i - 1], b = P.paras[i], o = a.x.length;
  const ab = edRevMark({ ...a, x: a.x + b.x });
  const fj = fmtJoin(a, b, o); if (fj) { ab.fm = fj; fmtTidy(ab); } else delete ab.fm;
  rvwPut(ab, rvwJoin(a, b, o));
  edWk(edWords(ab.x) - edWords(a.x) - edWords(b.x));
  if (b.lpg) ab.lpg = [...(a.lpg || []), ...b.lpg.map(m => [(+m[0] || 0) + o, m[1]])];   // la página sigue empezando donde empezaba
  if (b.ep != null && ab.ep == null) ab.ep = b.ep;   // el comienzo de un episodio no se pierde (edFixKeys lo lleva a su encabezado)
  const out = [...P.paras.slice(0, i - 1), ab, ...P.paras.slice(i + 1)];
  const map = P.paras.map((_, j) => ({ i: j < i ? j : j - 1 }));
  map[i] = { i: i - 1, d: o };
  edRemap(out, map);
  return { i: i - 1, o };
}
function edInsert(i, list) {
  // en una revisión, el texto de un párrafo nuevo es todo nuevo (salvo lo que solo se movió: _keep)
  list.forEach(q => { edRevMark(q); if (q._keep) delete q._keep; else rvwNew(q); edWk(edWords(q.x)); });
  const out = [...P.paras.slice(0, i), ...list, ...P.paras.slice(i)];
  edRemap(out, P.paras.map((_, j) => ({ i: j < i ? j : j + list.length })));
}
function edRemove(i, n) {
  // guion cerrado: si se borran páginas enteras, la que sigue lleva sus números (30-32)
  const gone = P.paras.slice(i, i + n).flatMap(p => p.lpg || []), nx = P.paras[i + n];
  if (gone.length && nx && !(nx.lpg || []).some(m => !(+m[0] > 0))) {
    const a = String(gone[0][1]).split('-')[0], z = String(gone[gone.length - 1][1]).split('-').pop();
    nx.lpg = [[0, a === z ? a : a + '-' + z], ...(nx.lpg || [])];
  }
  edWk(-P.paras.slice(i, i + n).reduce((a, p) => a + edWords(p.x), 0));
  const out = [...P.paras.slice(0, i), ...P.paras.slice(i + n)];
  edRemap(out, P.paras.map((_, j) => j < i ? { i: j } : j < i + n ? null : { i: j - n }));
}
/* borra de (i, o) a (j, o2): el resto del último párrafo se une al primero */
function edDeleteRange(i, o, j, o2) {
  if (i === j) { edSetText(i, P.paras[i].x.slice(0, o) + P.paras[i].x.slice(o2)); return; }
  edSetText(j, P.paras[j].x.slice(o2));
  edSetText(i, P.paras[i].x.slice(0, o));
  if (j - i > 1) edRemove(i + 1, j - i - 1);
  edMerge(i + 1);
}
function edSetType(i, t) {
  const p = P.paras[i]; if (!p || p.t === t) return;
  edLockKeys();
  p.t = t; edRevMark(p);
  // cambiar el tipo solo deja el asterisco: pasar a mayúsculas no cuenta como palabras cambiadas
  if (ED_UP.has(t)) { RVW.quiet = true; try { edSetText(i, p.x.toUpperCase()); } finally { RVW.quiet = false; } }
  if (t === 'h' && !p.n) p.n = edNewKey(i);
  if (t !== 'h') delete p.n;
}
/* después de cada cambio: números, planos en su escena, guardado y (con calma) lo derivado */
function edCommit(structural) {
  edFixKeys();
  if (structural) {
    const sc = computeScenes(P.paras);
    for (const sh of Object.values(P.shots)) if (sh.p0 != null && sc.sceneOf[sh.p0] >= 0) sh.sc = sc.scenes[sc.sceneOf[sh.p0]].key;
  }
  changed('script'); changed('data');
  if (typeof wkCommit === 'function') wkCommit();   // palabras de hoy (guion-racha.js)
  clearTimeout(ED.deriveT);
  ED.stale = true;
  ED.deriveT = setTimeout(edDerive, structural ? 250 : 700);
}
function edDerive() {
  clearTimeout(ED.deriveT);
  if (!ED.stale || !P) return;
  ED.stale = false;
  derive();
  const side = $('#side');
  if (side && UI.tab === 'script' && UI.scriptEdit) { const q = $('#sceneQ'), v = q ? q.value : ''; side.innerHTML = sceneListHTML('ed-goto'); bindSceneSearch(); const q2 = $('#sceneQ'); if (q2 && v) { q2.value = v; q2.dispatchEvent(new Event('input')); } edMarkScene(); }
  edPaintNums();
  if (UI.tab === 'script' && UI.scriptEdit) { revRefresh(); edDecoPaint(); }
}

/* ---------- vista del editor ---------- */
const edNumsOn = () => planAllows('scriptnum') && P.meta.sceneNums !== false;
function editorBarHTML() {
  const av = edFormat() === 'av';
  // una sola fila: tipo de párrafo, deshacer y rehacer (el formato cine / AV está en Ajustes, en «⋯» al final de la barra)
  return `${av ? ''
      : `<label class="ed-type" title="Tipo de párrafo · Tab lo cambia, Ctrl + 1…7 lo elige"><span class="sr">Tipo de párrafo</span><select id="edType" aria-label="Tipo de párrafo">${ED_CINE.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>`}
    <button class="btn ghost icon" data-act="ed-undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer">${ICO.undo}</button><button class="btn ghost icon" data-act="ed-redo" title="Rehacer (Ctrl+Y)" aria-label="Rehacer">${ICO.redo}</button>${typeof fmtBarHTML === 'function' ? fmtBarHTML() : ''}`;
}
function editorHTML() {
  return edFormat() === 'av' ? avDocHTML() : `${coverHTML()}<div class="ed-page${ea(edNumsOn() ? ' nums' : '')}"><div class="ed-doc" id="ed" contenteditable="true" spellcheck="true" lang="es" role="textbox" aria-multiline="true" aria-label="Guion">${cineDocHTML()}</div></div>`;
}
const edParaHTML = (p, i, keys) => `<div class="ep t-${ea(p.t)}" data-i="${i}"${p.t === 'h' ? ` data-n="${esc(keys.get(i) || '')}"` : ''}${p.t === 'h' && epOk(p.ep) ? ` data-epi="${esc(p.ep)}"` : ''} data-ph="${esc(ED_HINT[p.t] || '')}">${edRich(p)}</div>`;
function cineDocHTML() {
  if (!P.paras.length) P.paras.push({ t: 'h', x: '', n: '1' });
  const keys = edAutoKeys(P.paras);
  return P.paras.map((p, i) => edParaHTML(p, i, keys)).join('');
}
function avDocHTML() {
  const keys = edAutoKeys(P.paras), rows = [];
  let n = 0;
  for (let i = 0; i < P.paras.length; i++) {
    const p = P.paras[i];
    if (p.t === 'h') { rows.push(`<div class="av-h" data-i="${i}"><span class="av-k">${edNumsOn() ? esc(keys.get(i) || '') : ''}</span><div class="ep t-h" data-i="${i}" contenteditable="true" spellcheck="true" data-ph="${esc(ED_HINT.h)}">${edRich(p)}</div><button class="av-m" data-act="ed-avmenu" data-i="${i}" aria-label="Opciones de la escena" contenteditable="false">${ICO.more}</button></div>`); continue; }
    if (p.t === 'v') {
      const u = P.paras[i + 1] && P.paras[i + 1].t === 'u' ? i + 1 : -1;
      rows.push(`<div class="av-r" data-i="${i}"><span class="av-n tnum">${++n}</span>
        <div class="ep t-v" data-i="${i}" contenteditable="true" spellcheck="true" data-ph="${esc(ED_HINT.v)}">${edRich(p)}</div>
        ${u >= 0 ? `<div class="ep t-u" data-i="${ea(u)}" contenteditable="true" spellcheck="true" data-ph="${esc(ED_HINT.u)}">${edRich(P.paras[u])}</div>` : '<div></div>'}
        <input class="av-d tnum" data-i="${i}" value="${esc(p.dur || '')}" placeholder="0:00" inputmode="numeric" aria-label="Duración de la fila" title="Duración (seg. o m:ss)">
        <button class="av-m" data-act="ed-avmenu" data-i="${i}" aria-label="Opciones de la fila">${ICO.more}</button></div>`);
      if (u >= 0) i = u;
      continue;
    }
    // párrafos sueltos de otro tipo (de un guion de cine convertido a medias): se muestran como video
    rows.push(`<div class="av-r" data-i="${i}"><span class="av-n tnum">${++n}</span><div class="ep t-v" data-i="${i}" contenteditable="true" spellcheck="true">${edRich(p)}</div><div></div><span></span><span></span></div>`);
  }
  const total = P.paras.filter(p => p.t === 'v').reduce((a, p) => a + avSecs(p.dur), 0);
  return `<div class="av-doc${ea(edNumsOn() ? ' nums' : '')}" id="ed"><div class="av-head"><span>#</span><span>Video</span><span>Audio</span><span title="Duración">Dur.</span><span></span></div>${rows.join('')}
    <div class="av-foot"><button class="btn sm" data-act="ed-avrow">+ Fila</button><button class="btn sm ghost" data-act="ed-avscene">+ Escena</button><span class="grow"></span><span class="hint tnum">Duración total ${avFmt(total)}</span></div></div>`;
}
const avSecs = v => { const s = String(v || '').trim(); if (!s) return 0; const m = s.match(/^(\d+):(\d{1,2})$/); return m ? +m[1] * 60 + +m[2] : num(s); };
const avFmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
function renderEditorDoc(caret) {
  const host = $('#edHost'); if (!host) return render();
  const c = caret || edCaret();
  host.innerHTML = editorHTML();
  bindEditorDoc();
  if (c) edSetCaret(c.i, c.o);
}
function edPaintNums() {
  const keys = edAutoKeys(P.paras);
  if (edFormat() === 'av') $$('#ed .av-h').forEach(r => { const k = $('.av-k', r); if (k) k.textContent = edNumsOn() ? keys.get(+r.dataset.i) || '' : ''; });
  else $$('#ed .ep.t-h').forEach(el => { el.dataset.n = keys.get(+el.dataset.i) || ''; });
}
function edMarkScene() {
  const c = edCaret(); if (!c) return;
  const sc = D && D.sc; if (!sc || sc.sceneOf.length !== P.paras.length) return;
  const si = sc.sceneOf[c.i];
  if (si >= 0 && si !== UI.scene) { UI.scene = si; $$('#slist button').forEach(b => b.setAttribute('aria-current', +b.dataset.i === si ? 'true' : 'false')); }
  const ty = $('#edType'); if (ty && P.paras[c.i]) ty.value = P.paras[c.i].t;
}

/* ---------- cursor: párrafo y posición en su texto ---------- */
function edPoint(node, off) {
  const el = node && (node.nodeType === 1 ? node : node.parentElement);
  const ep = el && el.closest && el.closest('#ed .ep');
  if (!ep) return null;
  const r = document.createRange();
  r.selectNodeContents(ep);
  try { r.setEnd(node, off); } catch (e) { return null; }
  return { i: +ep.dataset.i, o: Math.min(r.toString().length, (P.paras[+ep.dataset.i] || { x: '' }).x.length) };
}
function edCaret() {
  const s = getSelection(); if (!s || !s.rangeCount) return null;
  return edPoint(s.focusNode, s.focusOffset);
}
function edRange() {
  const s = getSelection(); if (!s || !s.rangeCount) return null;
  const r = s.getRangeAt(0);
  let a = edPoint(r.startContainer, r.startOffset), b = edPoint(r.endContainer, r.endOffset);
  if (!a || !b) {
    const eps = $$('#ed .ep').filter(e => r.intersectsNode(e));
    if (!eps.length) return null;
    if (!a) a = { i: +eps[0].dataset.i, o: 0 };
    if (!b) { const l = eps[eps.length - 1]; b = { i: +l.dataset.i, o: P.paras[+l.dataset.i].x.length }; }
  }
  return { a, b, collapsed: r.collapsed };
}
function edSetCaret(i, o) {
  const ep = $(`#ed .ep[data-i="${i}"]`); if (!ep) return;
  if (ep.isContentEditable === false) return;
  const r = document.createRange();
  let left = o, node = null;
  const w = document.createTreeWalker(ep, NodeFilter.SHOW_TEXT);
  while ((node = w.nextNode())) { if (left <= node.length) break; left -= node.length; }
  if (node) r.setStart(node, Math.max(0, Math.min(left, node.length))); else r.setStart(ep, 0);
  r.collapse(true);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  if (edFormat() === 'av' || document.activeElement !== $('#ed')) ep.focus && ep.closest('[contenteditable="true"]') && ep.closest('[contenteditable="true"]').focus({ preventScroll: true });
  const sc = $('#edScroll'), rc = ep.getBoundingClientRect();
  if (sc) { const b = sc.getBoundingClientRect(); if (rc.bottom > b.bottom - 40 || rc.top < b.top + 40) sc.scrollTop += rc.top - b.top - b.height / 3; }
}
/* el párrafo solo lleva texto: si el navegador metió etiquetas, se limpian */
function edClean(ep) {
  const okNode = n => n.nodeType === 3 || (n.nodeName === 'SPAN' && n.classList.contains('fm') && [...n.childNodes].every(c => c.nodeType === 3));
  if ([...ep.childNodes].every(n => okNode(n) || (n.nodeName === 'BR' && n === ep.lastChild))) return false;
  const c = edCaret(), txt = ep.innerText.replace(/\n$/, '');
  ep.textContent = txt;
  if (!txt) ep.innerHTML = '<br>';
  if (c && c.i === +ep.dataset.i) edSetCaret(c.i, c.o);
  return true;
}

/* ---------- teclado y escritura ---------- */
function bindEditorDoc() {
  const ed = $('#ed'); if (!ed) return;
  const av = edFormat() === 'av';
  const ro = !edEditable();
  if (ro) { $$('[contenteditable="true"]', ed.parentElement).forEach(x => x.setAttribute('contenteditable', 'false')); ed.setAttribute('contenteditable', 'false'); }
  if (ro) return;
  ed.addEventListener('beforeinput', e => edBeforeInput(e, av));
  ed.addEventListener('input', e => edInput(e, av));
  ed.addEventListener('keydown', e => edKey(e, av));
  ed.addEventListener('paste', e => edPaste(e, av));
  ed.addEventListener('drop', e => e.preventDefault());
  ed.addEventListener('keyup', () => { edMarkScene(); });
  ed.addEventListener('click', () => { edMarkScene(); edAcHide(); });
  ed.addEventListener('focusout', () => setTimeout(() => { if (!$('#ed') || !$('#ed').contains(document.activeElement)) edAcHide(); }, 150));
  if (av) {
    ed.addEventListener('change', e => {
      const d = e.target.closest('.av-d'); if (!d) return;
      const i = +d.dataset.i; edPush(true);
      P.paras[i].dur = d.value.trim(); if (!P.paras[i].dur) delete P.paras[i].dur;
      edCommit(false);
      const tot = P.paras.filter(p => p.t === 'v').reduce((a, p) => a + avSecs(p.dur), 0);
      const h = $('.av-foot .hint', ed); if (h) h.textContent = 'Duración total ' + avFmt(tot);
    });
  }
  const ty = $('#edType');
  if (ty) ty.onchange = () => { const r = edRange(); if (!r) return; edPush(true); for (let i = r.a.i; i <= r.b.i; i++) edSetType(i, ty.value); edCommit(true); renderEditorDoc(r.a); };
  // límites de página, asteriscos de revisión e ícono del tipo de párrafo (encima de la página, fuera del texto)
  if (!av) { ed.addEventListener('input', () => edDecoPaint()); ed.addEventListener('focus', () => edIcoPaint()); edDecoPaint(); if (document.fonts) document.fonts.ready.then(() => edDecoPaint()); }
  else { ed.addEventListener('input', () => edDecoPaint()); edDecoPaint(); }   // AV: solo las palabras cambiadas en la revisión
}
function edBeforeInput(e, av) {
  const t = e.inputType;
  if (/^format/.test(t) || t === 'insertFromDrop' || t === 'deleteByDrag') { e.preventDefault(); return; }
  const r = edRange(); if (!r) return;
  const multi = r.a.i !== r.b.i;
  const data = e.data != null ? e.data : e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
  if (t === 'insertParagraph' || t === 'insertLineBreak') {
    e.preventDefault();
    edPush(true);
    if (!r.collapsed) edDeleteRange(r.a.i, r.a.o, r.b.i, r.b.o);
    if (av) {
      // en una celda AV, Intro es un salto de línea dentro de la celda
      const p = P.paras[r.a.i];
      edSetText(r.a.i, p.x.slice(0, r.a.o) + '\n' + p.x.slice(r.a.o));
      edCommit(false); renderEditorDoc({ i: r.a.i, o: r.a.o + 1 }); return;
    }
    const p = P.paras[r.a.i];
    if (!p.x.trim() && p.t !== 'a' && p.t !== 'h') { edSetType(r.a.i, 'a'); edCommit(true); renderEditorDoc({ i: r.a.i, o: 0 }); return; }
    if (ED.ac && ED.ac.i === r.a.i) { edAcPick(); return; }
    if ((p.t === 'c' || p.t === 'a') && r.a.o >= p.x.length && isTransText(p.x)) edSetType(r.a.i, 'tr');   // «CORTE A:» no es un personaje
    const t2 = r.a.o === 0 && p.x ? p.t : ED_NEXT[p.t] || 'a';
    edLockKeys();
    let ni;
    if (r.a.o === 0 && p.x) { edInsert(r.a.i, [{ t: p.t === 'h' ? 'a' : p.t, x: '' }]); ni = r.a.i + 1; }
    else ni = edSplit(r.a.i, r.a.o, t2);
    if (P.paras[ni].t === 'h' && !P.paras[ni].n) P.paras[ni].n = edNewKey(ni);
    edCommit(true); renderEditorDoc({ i: ni, o: 0 });
    return;
  }
  if (multi && av) { e.preventDefault(); return; }     // en AV no se borra de una celda a otra
  if (multi) {
    e.preventDefault();
    edPush(true);
    edLockKeys();
    edDeleteRange(r.a.i, r.a.o, r.b.i, r.b.o);
    let o = r.a.o;
    if (/^insert/.test(t) && data) { const s = String(data).replace(/\r?\n/g, ' '); edSetText(r.a.i, P.paras[r.a.i].x.slice(0, o) + s + P.paras[r.a.i].x.slice(o)); o += s.length; }
    edCommit(true); renderEditorDoc({ i: r.a.i, o });
    return;
  }
  if (!av && r.collapsed && t === 'deleteContentBackward' && r.a.o === 0 && r.a.i > 0) {
    e.preventDefault(); edPush(true); edLockKeys();
    const c = edMerge(r.a.i); edCommit(true); renderEditorDoc(c); return;
  }
  if (!av && r.collapsed && t === 'deleteContentForward' && r.a.o === P.paras[r.a.i].x.length && r.a.i < P.paras.length - 1) {
    e.preventDefault(); edPush(true); edLockKeys();
    const c = edMerge(r.a.i + 1); edCommit(true); renderEditorDoc(c); return;
  }
  edPush(false);
}
function edInput(e, av) {
  const ep = e.target.closest && e.target.closest('.ep') || (getSelection().focusNode && getSelection().focusNode.parentElement && getSelection().focusNode.parentElement.closest('#ed .ep'));
  const targets = ep ? [ep] : $$('#ed .ep');
  const c0 = edCaret();   // dónde quedó el cursor: dónde se escribió o se borró (edSetText)
  let changedAny = false, struct = false;
  for (const el of targets) {
    edClean(el);
    const i = +el.dataset.i, p = P.paras[i]; if (!p) continue;
    // encabezados, personajes y transiciones se guardan en mayúsculas (como se ven)
    const txt = ED_UP.has(p.t) ? el.textContent.toUpperCase() : el.textContent;
    if (edSetText(i, txt, c0 && c0.i === i ? c0.o : null)) changedAny = true;
    if (!txt) el.innerHTML = '<br>';
    else if (!e.isComposing) edFmtSync(el, p);
    // «INT.» o «EXT.» al empezar una acción: pasa a encabezado de escena
    if (!av && p.t === 'a' && /^(INT|EXT|EST|I\/E|INT\.?\/EXT)[\.\s]/i.test(p.x) && p.x.length < 80) {
      const c = edCaret(); edSetType(i, 'h'); struct = true; edCommit(true); renderEditorDoc(c); return;
    }
    if (!av && p.t === 'c' || !av && p.t === 'h') edAcShow(el, i);
  }
  if (changedAny) edCommit(struct);
}
function edKey(e, av) {
  const mod = e.ctrlKey || e.metaKey;
  if (ED.ac && ['ArrowDown', 'ArrowUp', 'Escape', 'Tab'].includes(e.key)) {
    if (e.key === 'Escape') { edAcHide(); e.preventDefault(); return; }
    if (e.key === 'Tab') { e.preventDefault(); edAcPick(); return; }
    e.preventDefault(); ED.ac.sel = (ED.ac.sel + (e.key === 'ArrowDown' ? 1 : -1) + ED.ac.list.length) % ED.ac.list.length; edAcPaint(); return;
  }
  if (mod && !e.altKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); edUndo(e.shiftKey); return; }
  if (mod && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); edUndo(true); return; }
  if (mod && !e.altKey && !e.shiftKey && /^[biu]$/i.test(e.key)) { e.preventDefault(); fmtToggle(e.key.toLowerCase()); return; }
  if (mod && (e.key === 'f' || e.key === 'F')) { const q = $('#rvQ'); if (q) { e.preventDefault(); const dd = q.closest('details'); if (dd) dd.open = true; const ins = q.closest('#insp'); if (ins && !ins.offsetParent) ins.classList.add('open'); q.focus(); q.select(); } return; }
  const c = edCaret(); if (!c) return;
  if (av) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const cells = $$('#ed .ep'), k = cells.findIndex(x => +x.dataset.i === c.i);
      const nx = cells[k + (e.shiftKey ? -1 : 1)];
      if (nx) edSetCaret(+nx.dataset.i, e.shiftKey ? P.paras[+nx.dataset.i].x.length : 0);
      else if (!e.shiftKey) avAddRow(c.i);
      return;
    }
    if (mod && e.key === 'Enter') { e.preventDefault(); avAddRow(c.i); return; }
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    const p = P.paras[c.i], k = ED_TAB.indexOf(p.t);
    const t = ED_TAB[(k < 0 ? 0 : k + (e.shiftKey ? ED_TAB.length - 1 : 1)) % ED_TAB.length];
    edPush(true); edSetType(c.i, t); edCommit(true); renderEditorDoc(c);
    return;
  }
  if (mod && /^[1-7]$/.test(e.key)) { e.preventDefault(); edPush(true); edSetType(c.i, ED_CINE[+e.key - 1][0]); edCommit(true); renderEditorDoc(c); }
}
function edPaste(e, av) {
  e.preventDefault();
  const txt = (e.clipboardData && e.clipboardData.getData('text/plain') || '').replace(/\r/g, '');
  if (!txt) return;
  const r = edRange(); if (!r) return;
  if (av && r.a.i !== r.b.i && !(r.a.i === r.b.i && r.a.o === r.b.o)) return;
  edPush(true); edLockKeys();
  if (typeof wkSkipNext === 'function') wkSkipNext();   // lo pegado no cuenta como palabras escritas
  if (!(r.a.i === r.b.i && r.a.o === r.b.o)) edDeleteRange(r.a.i, r.a.o, r.b.i, r.b.o);
  const p = P.paras[r.a.i];
  if (av || !/\n/.test(txt.trim())) {
    const s = av ? txt : txt.replace(/\n+/g, ' ');
    edSetText(r.a.i, p.x.slice(0, r.a.o) + s + p.x.slice(r.a.o));
    edCommit(false); renderEditorDoc({ i: r.a.i, o: r.a.o + s.length }); return;
  }
  // varias líneas: se leen como Fountain (encabezados, personajes, diálogos)
  const parsed = parseFountain(txt).paras;
  if (!parsed.length) return;
  const tail = p.x.slice(r.a.o);
  edSetText(r.a.i, p.x.slice(0, r.a.o));
  const at = p.x ? r.a.i + 1 : r.a.i;
  if (!p.x) edRemove(r.a.i, 1);
  const list = parsed.map(q => ({ t: q.t, x: q.x }));
  if (tail) list.push({ t: p.t, x: tail, _keep: 1 });   // el resto del párrafo solo se movió
  edInsert(at, list);
  list.forEach((q, k) => { if (q.t === 'h') P.paras[at + k].n = edNewKey(at + k); });
  edCommit(true);
  const end = at + parsed.length - 1;
  renderEditorDoc({ i: end, o: P.paras[end].x.length });
}

/* ---------- autocompletar personajes y encabezados ---------- */
function edAcList(i) {
  const p = P.paras[i], q = p.x.toUpperCase().trim();
  if (p.t === 'c') {
    const names = new Set();
    for (const e of Object.values(P.elements)) if (e.cat === 'cast') names.add(e.name.toUpperCase());
    for (const x of P.paras) if (x.t === 'c' && x !== p) { const n = normCue(x.x); if (n) names.add(n); }
    return [...names].filter(n => n.startsWith(q) && n !== q).sort().slice(0, 8);
  }
  if (p.t === 'h') {
    if (!q) return ['INT. ', 'EXT. ', 'INT./EXT. '];
    const m = q.match(/^((?:INT\.?\/EXT\.?|INT\.|EXT\.|I\/E\.?)\s+)(.*)$/);
    if (!m) return ['INT. ', 'EXT. '].filter(x => x.startsWith(q) && x.trim() !== q);
    const rest = m[2];
    if (/\s[-–]\s*\S*$/.test(rest)) {
      const tod = rest.replace(/^.*\s[-–]\s*/, '');
      return ['DÍA', 'NOCHE', 'ATARDECER', 'AMANECER', 'CONTINUO', 'MÁS TARDE'].filter(x => x.startsWith(tod) && x !== tod).map(x => m[1] + rest.replace(/[^-–]*$/, ' ') + x).map(s => s.replace(/\s+/g, ' '));
    }
    const locs = new Set(P.paras.filter(x => x.t === 'h' && x !== p).map(x => headingInfo(x.x).locBase).filter(Boolean));
    return [...locs].filter(l => l.startsWith(rest) && l !== rest).sort().slice(0, 8).map(l => m[1] + l + ' - ');
  }
  return [];
}
function edAcShow(el, i) {
  const list = edAcList(i);
  if (!list.length) { edAcHide(); return; }
  ED.ac = { i, list, sel: 0 };
  let box = $('#edAc');
  if (!box) { box = document.createElement('div'); box.id = 'edAc'; box.className = 'ed-ac'; box.addEventListener('mousedown', e => { e.preventDefault(); const b = e.target.closest('[data-k]'); if (b) { ED.ac.sel = +b.dataset.k; edAcPick(); } }); document.body.appendChild(box); }
  const r = el.getBoundingClientRect();
  box.style.left = (r.left + (P.paras[i].t === 'c' ? r.width * .36 : 0)) + 'px'; box.style.top = (r.bottom + 4) + 'px';
  edAcPaint();
}
function edAcPaint() { const box = $('#edAc'); if (!box || !ED.ac) return; box.innerHTML = ED.ac.list.map((x, k) => `<button type="button" data-k="${k}" ${k === ED.ac.sel ? 'aria-selected="true"' : ''}>${esc(x.trim())}</button>`).join('') + '<small>Tab o Intro para elegir</small>'; }
function edAcHide() { ED.ac = null; const b = $('#edAc'); if (b) b.remove(); }
function edAcPick() {
  const a = ED.ac; if (!a) return;
  const v = a.list[a.sel]; edAcHide();
  edPush(true);
  edSetText(a.i, v);
  const p = P.paras[a.i];
  if (p.t === 'c' && !/\s$/.test(v)) {
    // personaje elegido: el cursor pasa al diálogo
    edLockKeys();
    if (!P.paras[a.i + 1] || P.paras[a.i + 1].t !== 'd' && P.paras[a.i + 1].t !== 'p') edInsert(a.i + 1, [{ t: 'd', x: '' }]);
    edCommit(true); renderEditorDoc({ i: a.i + 1, o: 0 }); return;
  }
  edCommit(false); renderEditorDoc({ i: a.i, o: v.length });
  const el = $(`#ed .ep[data-i="${a.i}"]`); if (el) edAcShow(el, a.i);
}

/* ---------- AV: filas y escenas ---------- */
function avAddRow(afterI, before) {
  edPush(true); edLockKeys();
  // después de la fila (o de la escena) donde está el cursor
  let at = P.paras.length;
  if (afterI != null) {
    const p = P.paras[afterI];
    if (before) at = p.t === 'u' ? afterI - 1 : afterI;
    else at = p && p.t === 'v' ? afterI + 2 : p && p.t === 'u' ? afterI + 1 : afterI + 1;
  }
  const r = avRow();
  edInsert(at, [{ t: 'v', x: '', r }, { t: 'u', x: '', r }]);
  edCommit(true); renderEditorDoc({ i: at, o: 0 });
}
function avAddScene(afterI) {
  edPush(true); edLockKeys();
  let at = P.paras.length;
  if (afterI != null) { at = afterI + 1; while (at < P.paras.length && P.paras[at].t !== 'h') at++; }
  const r = avRow();
  edInsert(at, [{ t: 'h', x: '' }, { t: 'v', x: '', r }, { t: 'u', x: '', r }]);
  P.paras[at].n = edNewKey(at);
  edCommit(true); renderEditorDoc({ i: at, o: 0 });
}
function avMenu(b) {
  const i = +b.dataset.i, p = P.paras[i], head = p.t === 'h';
  popover(b, `<div class="menu">
    ${head ? '<button data-a="row">Agregar fila al inicio</button><button data-a="scene">Agregar escena después</button><hr><button data-a="del" style="color:var(--bad)">Quitar el encabezado</button>'
      : '<button data-a="above">Insertar fila arriba</button><button data-a="below">Insertar fila abajo</button><button data-a="up">Subir</button><button data-a="down">Bajar</button><hr><button data-a="del" style="color:var(--bad)">Eliminar fila</button>'}</div>`, pop => pop.addEventListener('click', e => {
    const x = e.target.closest('[data-a]'); if (!x) return; closePop();
    const a = x.dataset.a;
    if (a === 'row') return avAddRow(i);
    if (a === 'scene') return avAddScene(i);
    if (a === 'above') return avAddRow(i, true);
    if (a === 'below') return avAddRow(i);
    edPush(true); edLockKeys();
    const n = head ? 1 : P.paras[i + 1] && P.paras[i + 1].t === 'u' ? 2 : 1;
    if (a === 'del') { edRemove(i, n); edCommit(true); renderEditorDoc({ i: Math.max(0, i - 1), o: 0 }); return; }
    // subir o bajar una fila: se mueve junto con sus marcas
    const rowAt = j => { if (j < 0 || j >= P.paras.length || P.paras[j].t === 'h') return null; return P.paras[j].t === 'u' ? j - 1 : j; };
    const other = a === 'up' ? rowAt(i - 1) : rowAt(i + n);
    if (other == null) return;
    const on = P.paras[other + 1] && P.paras[other + 1].t === 'u' ? 2 : 1;
    const [x0, n0, x1, n1] = a === 'up' ? [other, on, i, n] : [i, n, other, on];
    const out = [...P.paras.slice(0, x0), ...P.paras.slice(x1, x1 + n1), ...P.paras.slice(x0, x0 + n0), ...P.paras.slice(x1 + n1)];
    const map = P.paras.map((_, j) => ({ i: j < x0 || j >= x1 + n1 ? j : j >= x1 ? x0 + (j - x1) : x0 + n1 + (j - x0) }));
    edRemap(out, map);
    edCommit(true); renderEditorDoc({ i: a === 'up' ? x0 : x0 + n1, o: 0 });
  }));
}

/* ---------- cambiar de formato: cine ↔ AV, conservando las marcas ---------- */
function edConvert(to) {
  if (to === edFormat()) return;
  edPush(true); edLockKeys();
  if (typeof wkSkipNext === 'function') wkSkipNext();   // cambiar el formato no es escribir
  const out = [], map = [];
  if (to === 'av') {
    let row = null;
    const newRow = () => { row = { v: { t: 'v', x: '', r: avRow() }, u: null }; row.u = { t: 'u', x: '', r: row.v.r }; out.push(row.v, row.u); return row; };
    for (let i = 0; i < P.paras.length; i++) {
      const p = P.paras[i];
      if (p.t === 'h') { out.push({ t: 'h', x: p.x, n: p.n }); map[i] = { i: out.length - 1 }; row = null; continue; }
      if (p.t === 'c') {
        // personaje + acotación + diálogo → una celda de audio «NOMBRE: (acotación) diálogo»
        const r = row && !row.u.x ? row : newRow(), ui = out.indexOf(r.u);
        r.u.x = p.x.trim() + ':'; map[i] = { i: ui, d: 0, lo: 0, hi: r.u.x.length };
        let j = i + 1;
        while (j < P.paras.length && (P.paras[j].t === 'p' || P.paras[j].t === 'd')) {
          const q = P.paras[j], d0 = r.u.x.length + 1;
          r.u.x += ' ' + q.x.trim(); map[j] = { i: ui, d: d0 - (q.x.length - q.x.trimStart().length) };
          j++;
        }
        i = j - 1; row = null; continue;
      }
      const r = newRow();
      r.v.x = p.x; map[i] = { i: out.indexOf(r.v) };
      if (p.t === 'tr') { r.v.x = ''; r.u.x = p.x; map[i] = { i: out.indexOf(r.u) }; }
    }
    if (!out.length) { const r = avRow(); out.push({ t: 'h', x: '', n: '1' }, { t: 'v', x: '', r }, { t: 'u', x: '', r }); }
  } else {
    for (let i = 0; i < P.paras.length; i++) {
      const p = P.paras[i];
      if (p.t === 'h') { out.push({ t: 'h', x: p.x, n: p.n }); map[i] = { i: out.length - 1 }; continue; }
      if (p.t === 'u') {
        // «NOMBRE: texto» → personaje y diálogo; lo demás, acción
        const m = p.x.match(/^\s*([\p{Lu}][\p{Lu}\d .'’()-]{0,40}?)\s*:\s*/u);
        if (m) {
          out.push({ t: 'c', x: m[1].trim() }); map[i] = { i: out.length - 1, d: -p.x.indexOf(m[1]), lo: 0, hi: m[1].trim().length };
          const rest = p.x.slice(m[0].length).replace(/\n/g, ' ');
          if (rest.trim()) { out.push({ t: 'd', x: rest }); map[i] = { i: out.length - 1, d: -m[0].length }; }
        } else if (p.x.trim()) { out.push({ t: 'a', x: p.x.replace(/\n/g, ' ') }); map[i] = { i: out.length - 1 }; }
        continue;
      }
      if (!p.x.trim() && p.t === 'v') continue;
      out.push({ t: p.t === 'v' ? 'a' : p.t, x: p.x.replace(/\n+/g, ' ') }); map[i] = { i: out.length - 1 };
    }
    if (!out.length) out.push({ t: 'h', x: '', n: '1' });
  }
  edRemap(out, map);
  P.meta.format = to === 'av' ? 'av' : undefined;
  if (to !== 'av') delete P.meta.format;
  edCommit(true);
  render();
  toast(to === 'av' ? 'Guion en formato AV: video a la izquierda, audio a la derecha.' : 'Guion en formato de cine.');
}

/* ---------- empezar un guion desde cero ---------- */
function startWriting(fmt) {
  if (!edEditable()) return;
  if (!P.paras.length) {
    if (fmt === 'av') { const r = avRow(); P.paras = [{ t: 'h', x: '', n: '1' }, { t: 'v', x: '', r }, { t: 'u', x: '', r }]; P.meta.format = 'av'; }
    else { P.paras = [{ t: 'h', x: '', n: '1' }]; delete P.meta.format; }
    edCommit(true); derive();
  }
  if (UI.tab !== 'script') setTab('script'); else render();   // se escribe en la pestaña Guion
  requestAnimationFrame(() => edSetCaret(0, 0));
}

/* al pasar de Guion (escribir) a otra pestaña: sugerencias del desglose para el texto nuevo (las marcas
   existentes no se tocan). Guion abre el editor; Guion rayado, el guion para marcar. */
function scriptModeFor(t) {
  const on = t === 'script';
  if (UI.scriptEdit && !on && UI.tab === 'script' && P && P.paras.length && edEditable() && (typeof canEditBdAll !== 'function' || canEditBdAll())) {
    const n = autoBreakdown(P, { replaceAuto: false });
    if (n) { changed('data'); setTimeout(() => toast(`${n} ${n === 1 ? 'elemento sugerido' : 'elementos sugeridos'} en el texto nuevo (línea punteada).`, 3600), 300); }
  }
  if (!!UI.scriptEdit !== on) { ED.stale = true; edDerive(); hideSelTool(); if (!on) rvwUnpaint(); }
  UI.scriptEdit = on;
}

Object.assign(ACT, {
  'ed-mode': b => setTab(b.dataset.m === 'edit' ? 'script' : 'lined'),   // Guion = escribir; Guion rayado = marcar
  'ed-format': b => { if (!edEditable()) return; if (typeof scriptLock === 'function' && scriptLock()) { toast('El guion está cerrado: su formato no se cambia.'); return; } const to = b.dataset.f; if (to === edFormat()) return; if (P.paras.some(p => p.x.trim())) confirmBox('Cambiar el formato del guion', to === 'av' ? 'El guion pasa a dos columnas: la acción va al video y los personajes con sus diálogos al audio. Las marcas del desglose y los planos se conservan.' : 'El guion pasa a formato de cine: el video queda como acción y las líneas «NOMBRE: texto» del audio como personaje y diálogo.', 'Cambiar', () => edConvert(to), false); else edConvert(to); },
  'ed-undo': () => edUndo(false), 'ed-redo': () => edUndo(true),
  'ed-goto': b => { closeDrawers(); const s = D.sc.scenes[+b.dataset.i]; if (s) edSetCaret(s.p0, 0); },
  'ed-avrow': () => { const c = edCaret(); avAddRow(c ? c.i : null); },
  'ed-avscene': () => { const c = edCaret(); avAddScene(c ? c.i : null); },
  'ed-avmenu': b => avMenu(b),
  'ed-renum': () => edRenumber(),
  'ed-nums': () => { if (!proGate('scriptnum')) return; P.meta.sceneNums = P.meta.sceneNums === false; changed('data'); render(); },
  'write-cine': () => startWriting('cine'), 'write-av': () => startWriting('av'),
});

/* ---------- exportar en Fountain (texto plano que abren Final Draft, Highland, WriterSolo…) ---------- */
function exportFountain() {
  const M = P.meta, out = [`Title: ${M.title || ''}`];
  if (M.author) out.push(`Credit: Escrito por`, `Author: ${M.author}`);
  if (M.draft) out.push(`Draft date: ${M.draft}`);
  out.push('', '');
  const nums = edNumsOn(), keys = edAutoKeys(P.paras);
  for (let i = 0; i < P.paras.length; i++) {
    const p = P.paras[i], x = p.x.replace(/\n/g, ' ');
    if (p.t === 'h' && epOk(p.ep)) out.push(`# ${epLabel(P, String(p.ep)).replace(' · ', ': ')}`, '');   // series: dónde empieza cada episodio
    if (p.t === 'h') { const h = /^(INT|EXT|EST|I\/E)/i.test(x) ? x.toUpperCase() : '.' + x.toUpperCase(); out.push(h + (nums ? ` #${keys.get(i)}#` : ''), ''); continue; }
    if (p.t === 'c') { out.push(/[a-z]/.test(x) ? '@' + x : x.toUpperCase()); continue; }
    if (p.t === 'p') { out.push(x.startsWith('(') ? x : `(${x})`); continue; }
    if (p.t === 'd') { out.push(fmtFountain(p), ''); continue; }
    if (p.t === 'tr') { out.push('> ' + x.toUpperCase(), ''); continue; }
    if (p.t === 'ct') { out.push(`> ${x} <`, ''); continue; }
    if (p.t === 'v') { const u = P.paras[i + 1] && P.paras[i + 1].t === 'u' ? P.paras[++i].x : ''; if (x.trim()) out.push('VIDEO: ' + x); if (u.trim()) out.push('', 'AUDIO: ' + u.replace(/\n/g, ' ')); if (p.dur) out.push(`[[${p.dur}]]`); out.push(''); continue; }
    out.push((p.t === 'a' && x === x.toUpperCase() && /\p{Lu}/u.test(x) ? '!' : '') + fmtFountain(p), '');
  }
  offerFile(fileSafe(M.title) + '.fountain', out.join('\n').replace(/\n{3,}/g, '\n\n'));
}
