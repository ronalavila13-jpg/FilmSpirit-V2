/* ============================================================
   HISTORIAL DEL PROYECTO · deshacer y rehacer en todas las pestañas
   Cada tanda de cambios (lo que pasa entre una pausa y otra) es un paso. (lote AH) El paso guarda solo las diferencias
   finas: las rutas dentro del proyecto que cambiaron (call.days.<jornada>.crewCall, budget.lines[<línea>].rate…) con
   su valor de antes y de después, no la foto entera de cada parte. Así se deshace un cambio viejo aunque después se
   hicieran otros en la misma pestaña, mientras esos otros no hayan tocado lo mismo: cada ruta vuelve a su valor de
   antes solo si sigue con el que dejó ese paso; si algo posterior la cambió, no se pisa, no se deshace nada de ese
   paso y se avisa qué choca.
   Las listas con identidad (id; en el plan, la fila: escena y parte, jornada o evento; si no, su contenido cuando
   ninguno se repite) se comparan elemento por elemento: agregar, quitar y mover (el elemento recuerda a sus vecinos y
   su lugar tiene versión, como un valor más) no chocan con lo que se hace con otros elementos. Las demás listas son
   una sola ruta (las largas guardan solo el tramo que cambió, con la huella de la lista entera).
   (revisión) Tampoco se deshace suelto: lo que vuelve a poner marcas del desglose o planos sobre el texto del guion si
   el guion cambió después (sus lugares son párrafo y letras de ese texto); lo que haría desaparecer algo con id que
   todavía se usa (un elemento con marcas de después, una jornada con datos en la hoja); y lo que vuelve a una lista
   cuando su vecindario de antes ya no está (en el plan, nunca a otra jornada).
   Ctrl+Z y los botones de arriba deshacen lo último de la pestaña abierta; el panel «Historial» (el reloj, junto a
   deshacer) lista los cambios de la pestaña (o de todas) y deshace o rehace cualquiera.
   El guion (al escribir) y el animatic tienen su propio deshacer: sus pasos no se deshacen desde aquí, pero sí
   bloquean deshacer algo anterior que tocaron.
   ============================================================ */
const HIST = { base: null, undo: [], redo: [], label: '', frames: null, tab: '', timer: 0, chars: 0, seq: 0, ver: 0, cut: {}, view: 'tab', tick: 0, wait: false, sig: '', pos: new Map(), pn: 0 };
const HIST_MAX = 80, HIST_REDO = 40, HIST_CHARS = 24e6;
const TAB_NAME = { build: 'Historia', project: 'Proyecto', script: 'Guion', lined: 'Guion rayado', breakdown: 'Desglose', scout: 'Scouting', casting: 'Casting', board: 'Storyboard', animatic: 'Animatic', plan: 'Plan de rodaje', cal: 'Calendario', call: 'Hoja de llamado', budget: 'Presupuesto', gastos: 'Gastos', sup: 'Hoja de script' };
// «act» (el registro de actividad sin equipo) no se deshace
const histKeys = Px => Object.keys(Px).filter(k => k[0] !== '_' && k !== 'id' && k !== 'act' && typeof Px[k] !== 'function');
function histSnap(Px) { const o = {}; for (const k of histKeys(Px)) o[k] = JSON.stringify(Px[k]); return o; }
function histReset() {
  clearTimeout(HIST.timer);
  HIST.base = typeof P !== 'undefined' && P ? histSnap(P) : null;
  HIST.undo = []; HIST.redo = []; HIST.label = ''; HIST.frames = null; HIST.tab = ''; HIST.chars = 0; HIST.cut = {}; HIST.wait = false; HIST.pos = new Map(); HIST.ver++;
  histPaint();
}
/* antes de un cambio con nombre: «Tarea eliminada». frames: imágenes que el cambio borra (se devuelven al deshacer) */
function histNote(label, frames, tab) {
  histCapture();               // lo pendiente queda en su propio paso
  HIST.label = label || '';
  if (frames && Object.keys(frames).length) HIST.frames = { ...(HIST.frames || {}), ...frames };
  if (tab) HIST.tab = tab;
}
/* changed() avisa; la foto del estado se toma en una pausa */
function histSoon() {
  if (!HIST.base) return;
  if (!HIST.tab) HIST.tab = UI.tab;
  HIST.wait = true;
  clearTimeout(HIST.timer);
  HIST.timer = setTimeout(histCapture, 450);
}
const histOwn = tab => tab === 'animatic' || (tab === 'script' && !!UI.scriptEdit);
// (lote AH) al cambiar de pestaña, lo pendiente queda en su paso, en la pestaña donde se hizo (pestanas.js · setTab)
const histFlush = () => { if (HIST.wait) histCapture(); };

/* ---------- (lote AH) las diferencias finas ----------
   Una entrada es una de tres:
   · un valor: { p: ruta, a: JSON de antes, b: JSON de después } (sin a o sin b: no estaba o ya no está);
   · un elemento de una lista con identidad: { p: ruta de la lista, m: { i: id, k: clase }, a, b } si se agregó o se
     quitó, o { …, mv: 1 } si se movió; con su lugar (ai, bi), sus vecinos antes (ap, an) y después (bp, bn) y la
     versión de su lugar antes y después (av, pv: HIST.pos);
   · un tramo de una lista larga sin identidad: { p, sp: desde, na, nb, a, b, ha, hb } (ha y hb: la huella de la lista
     entera antes y después, para tocarla solo si sigue igual).
   En la ruta, un elemento de una lista va por su identidad ({ i, k }), no por su lugar: mover o borrar otros no la cambia. */
const HIST_SPLICE = 1000, HIST_JSLIST = 20000, HIST_BAD = new Set(['__proto__', 'constructor', 'prototype']);
// huella corta de un texto (cyrb53)
function histHash(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
// la identidad de un elemento: su id; en el plan, la fila; si no, la huella de su contenido
const HIST_IK = {
  id: x => x && typeof x === 'object' && !Array.isArray(x) && (typeof x.id === 'string' || typeof x.id === 'number') ? String(x.id) : null,
  it: x => x && typeof x === 'object' ? (x.e ? 'e:' + x.e : x.d ? 'd:' + x.d : x.k != null ? 'k:' + x.k + '|' + (x.sp || '') : null) : null,
  js: x => 'h' + histHash(String(JSON.stringify(x))),
};
const histShape = p => p.map(s => typeof s === 'string' ? s : '[]').join('.');
function histIds(L, k) {
  const f = HIST_IK[k], ids = new Array(L.length), seen = new Set();
  for (let i = 0; i < L.length; i++) { const id = f(L[i]); if (id == null || seen.has(id)) return null; seen.add(id); ids[i] = id; }
  return ids;
}
function histKind(p, A, B) {
  const ks = histShape(p) === 'schedule.items' ? ['it'] : A.length + B.length > HIST_JSLIST ? ['id'] : ['id', 'js'];
  for (const k of ks) { const a = histIds(A, k), b = a && histIds(B, k); if (b) return { k, a, b }; }
  return null;
}
// lo que conserva su orden (el grupo más grande, con peso): lo demás «se movió». pos: el lugar de cada uno después
function histKeep(pos, w) {
  const n = pos.length, bit = new Array(n + 1).fill(-1), best = new Array(n), prev = new Array(n);
  const q = i => { let b = -1; for (; i > 0; i -= i & -i) if (bit[i] >= 0 && (b < 0 || best[bit[i]] > best[b])) b = bit[i]; return b; };
  const up = (i, x) => { for (; i <= n; i += i & -i) if (bit[i] < 0 || best[x] > best[bit[i]]) bit[i] = x; };
  let top = -1;
  for (let x = 0; x < n; x++) { const b = q(pos[x]); prev[x] = b; best[x] = (b >= 0 ? best[b] : 0) + (w ? w[x] : 1); up(pos[x] + 1, x); if (top < 0 || best[x] > best[top]) top = x; }
  const keep = new Set(); for (let x = top; x >= 0; x = prev[x]) keep.add(x);
  return keep;
}
const histN = e => (e.a ? e.a.length : 0) + (e.b ? e.b.length : 0) + (e.m ? 64 : 24);
function histDiff(a, b, p, out) {
  if (a === b) return;
  const oa = a !== null && typeof a === 'object', ob = b !== null && typeof b === 'object';
  if (!oa || !ob || Array.isArray(a) !== Array.isArray(b)) { const ja = JSON.stringify(a), jb = JSON.stringify(b); if (ja !== jb) out.push({ p: p.slice(), a: ja, b: jb }); return; }
  const n0 = out.length;
  if (Array.isArray(a)) histListDiff(a, b, p, out);
  else {
    const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    const exp = p.length === 3 && p[0] === 'call' && p[1] === 'days';   // las versiones enviadas de la hoja no son pasos
    for (const k of Object.keys(a)) if (!own(b, k) && !HIST_BAD.has(k) && !(exp && k === 'exp')) out.push({ p: [...p, k], a: JSON.stringify(a[k]) });
    for (const k of Object.keys(b)) {
      if (HIST_BAD.has(k) || (exp && k === 'exp')) continue;
      if (!own(a, k)) out.push({ p: [...p, k], b: JSON.stringify(b[k]) });
      else if (a[k] !== b[k]) { p.push(k); histDiff(a[k], b[k], p, out); p.pop(); }
    }
  }
  // muchas diferencias que pesan más que las dos fotos de esta parte: va entera, como una sola ruta
  if (out.length - n0 > 120) {
    let n = 0; for (let i = n0; i < out.length; i++) n += histN(out[i]);
    const ja = JSON.stringify(a), jb = JSON.stringify(b);
    if (n > ja.length + jb.length) out.splice(n0, out.length - n0, { p: p.slice(), a: ja, b: jb });
  }
}
function histListDiff(A, B, p, out) {
  const K = histKind(p, A, B);
  if (!K) {
    const ja = JSON.stringify(A), jb = JSON.stringify(B);
    if (ja === jb) return;
    if (ja.length + jb.length < HIST_SPLICE) { out.push({ p: p.slice(), a: ja, b: jb }); return; }
    // una lista larga sin identidad (un guion con párrafos repetidos): solo el tramo que cambió, con la huella de la lista
    const ea = A.map(x => JSON.stringify(x)), eb = B.map(x => JSON.stringify(x));
    let s = 0, e = 0;
    while (s < ea.length && s < eb.length && ea[s] === eb[s]) s++;
    while (e < ea.length - s && e < eb.length - s && ea[ea.length - 1 - e] === eb[eb.length - 1 - e]) e++;
    out.push({ p: p.slice(), sp: s, na: ea.length - s - e, nb: eb.length - s - e, a: '[' + ea.slice(s, ea.length - e).join(',') + ']', b: '[' + eb.slice(s, eb.length - e).join(',') + ']', ha: histHash(ja), hb: histHash(jb) });
    return;
  }
  const lp = p.slice(), ia = new Map(K.a.map((id, i) => [id, i])), ib = new Map(K.b.map((id, i) => [id, i]));
  const m = id => ({ i: id, k: K.k }), nb = (ids, i) => [i > 0 ? ids[i - 1] : null, i < ids.length - 1 ? ids[i + 1] : null];
  // en el plan, además, la jornada de cada fila (el corte que la cierra; '' : sin programar), antes y después
  const sg = K.k === 'it' ? ids => { const o = new Array(ids.length); let cur = ''; for (let i = ids.length - 1; i >= 0; i--) { if (ids[i][0] === 'd') cur = ids[i]; o[i] = cur; } return o; } : null;
  const sa = sg && sg(K.a), sb = sg && sg(K.b), segs = (e, i, j) => { if (sg) { if (i != null) e.as = sa[i]; if (j != null) e.bs = sb[j]; } return e; };
  K.a.forEach((id, i) => { if (!ib.has(id)) { const [ap, an] = nb(K.a, i); out.push(segs({ p: lp, m: m(id), a: JSON.stringify(A[i]), ai: i, ap, an }, i, null)); } });
  K.b.forEach((id, j) => { if (!ia.has(id)) { const [bp, bn] = nb(K.b, j); out.push(segs({ p: lp, m: m(id), b: JSON.stringify(B[j]), bi: j, bp, bn }, null, j)); } });
  if (K.k !== 'js') K.a.forEach((id, i) => { const j = ib.get(id); if (j !== undefined && A[i] !== B[j]) { p.push(m(id)); histDiff(A[i], B[j], p, out); p.pop(); } });
  // los que cambiaron de lugar: en el plan pesan más las jornadas y los eventos (se mueve la escena, no la jornada)
  const com = K.a.filter(id => ib.has(id)), rk = new Map(K.b.filter(id => ia.has(id)).map((id, r) => [id, r]));
  const keep = histKeep(com.map(id => rk.get(id)), K.k === 'it' ? com.map(id => id[0] === 'd' ? 3 : id[0] === 'e' ? 2 : 1) : null);
  com.forEach((id, x) => {
    if (keep.has(x)) return;
    const i = ia.get(id), j = ib.get(id), [ap, an] = nb(K.a, i), [bp, bn] = nb(K.b, j);
    out.push(segs({ p: lp, m: m(id), mv: 1, ai: i, ap, an, bi: j, bp, bn }, i, j));
  });
}
/* las diferencias de las partes que cambiaron (sus fotos en JSON); O y N: las partes de antes y de después */
function histChanges(base, now, keys) {
  const ch = [], O = {}, N = {};
  for (const k of keys) {
    const a = base[k], b = now[k];
    if (a === b) continue;
    O[k] = a === undefined ? undefined : JSON.parse(a); N[k] = b === undefined ? undefined : JSON.parse(b);
    if (a === undefined) ch.push({ p: [k], b });
    else if (b === undefined) ch.push({ p: [k], a });
    else histDiff(O[k], N[k], [k], ch);
  }
  return { ch, O, N };
}
/* ---------- buscar, comparar y poner valores en una ruta ---------- */
let HIST_C = null;   // durante una revisión: la identidad de cada elemento de las listas que se miran
function histIdx(L, k) {
  let c = HIST_C && HIST_C.get(L);
  if (!c || c.k !== k) { const ids = L.map(HIST_IK[k]); c = { k, ids, at: new Map(ids.map((id, i) => [id, i])) }; if (HIST_C) HIST_C.set(L, c); }
  return c;
}
const histFind = (L, s) => { const j = histIdx(L, s.k).at.get(s.i); return j === undefined ? -1 : j; };
/* el valor en una ruta: { v } (v undefined si no está; miss: falta además lo que lo contiene) o null si la ruta ya no se
   puede seguir (un elemento de una lista que ya no está, o un valor donde había un objeto) */
function histAt(R, p) {
  let o = R, miss = false;
  for (let i = 0; i < p.length; i++) {
    const s = p[i];
    if (o === undefined) { if (typeof s !== 'string') return null; miss = true; continue; }
    if (typeof s === 'string') {
      if (o === null || typeof o !== 'object' || Array.isArray(o)) return null;
      o = Object.prototype.hasOwnProperty.call(o, s) ? o[s] : undefined;
      if (o === undefined && i < p.length - 1) miss = true;
    } else {
      if (!Array.isArray(o)) return null;
      const j = histFind(o, s); if (j < 0) return null;
      o = o[j];
    }
  }
  return { v: o, miss };
}
/* dos versiones de la hoja de llamado (entera, sus jornadas o una jornada) iguales salvo las versiones enviadas */
function histSameBut(a, b, p = ['call']) {
  const strip = j => { try { const o = JSON.parse(j); if (o && typeof o === 'object') { if (p.length === 3) delete o.exp; else for (const d of Object.values((p.length === 1 ? o.days : o) || {})) if (d) delete d.exp; } return JSON.stringify(o); } catch { return j; } };
  return strip(a) === strip(b);
}
const histExpPath = p => p[0] === 'call' && p.length <= 3 && (p.length < 2 || p[1] === 'days');
/* las entradas de un paso que no están como se espera: side 'b' (como las dejó el paso: para deshacerlo) o 'a' (como
   estaban antes: para rehacerlo). Una lista vacía: se puede. later: los pasos hechos después (para los movimientos) */
function histMiss(R, ch, side, later = []) {
  const bad = [], put = side === 'a' ? 'b' : 'a';
  for (const e of ch) {
    if (e.m) {
      const r = histAt(R, e.p), L = r && r.v;
      if (!Array.isArray(L)) { bad.push(e); continue; }
      const c = histIdx(L, e.m.k), j = c.at.has(e.m.i) ? c.at.get(e.m.i) : -1;
      // el lugar del elemento es como un valor más (HIST.pos): choca si después se movió, se agregó o se quitó ese mismo
      // elemento, o se cambió la lista entera; que se muevan sus vecinos no (deshacer un movimiento no traba otros)
      const lp = histPs(e.p), whole = y => { if (y.m) return false; const yp = histPs(y.p); return lp === yp || lp.startsWith(yp + '\u0000'); };
      if (HIST.pos.get(histPk(e)) !== e[side === 'b' ? 'pv' : 'av'] || later.some(x => x.ch.some(whole))) bad.push(e);
      else if (e.mv ? j < 0 : e[side] === undefined ? j >= 0 : j < 0 || JSON.stringify(L[j]) !== e[side]) bad.push(e);
    } else if ('sp' in e) {
      const r = histAt(R, e.p), L = r && r.v;
      if (!Array.isArray(L) || histHash(JSON.stringify(L)) !== e['h' + side]) bad.push(e);
    } else {
      const r = histAt(R, e.p);
      if (!r) { bad.push(e); continue; }
      // la parte entera, con la foto de ahora a mano (si no hay cambios por anotar)
      const cur = e.p.length === 1 && R === P && !HIST.wait && HIST.base ? HIST.base[e.p[0]] : r.v === undefined ? undefined : JSON.stringify(r.v);
      const same = cur === e[side] || (histExpPath(e.p) && cur !== undefined && e[side] !== undefined && histSameBut(cur, e[side], e.p));
      // lo que contenía ya no está: no se arma de nuevo a medias
      if (!same || (r.miss && e[put] !== undefined)) bad.push(e);
    }
  }
  // (lote AH) lo que vuelve a una lista: ¿su vecindario de antes sigue en pie? (si no, en el plan, no hay dónde)
  const lists = new Map();
  for (const e of ch) if (e.m && !bad.includes(e) && (e.mv || e[put] !== undefined)) { const k = histPs(e.p); if (!lists.has(k)) lists.set(k, []); lists.get(k).push(e); }
  bad.pos = [];
  for (const es of lists.values()) {
    const L = histAt(R, es[0].p).v, all = ch.filter(e => e.m && histPs(e.p) === histPs(es[0].p));
    for (const e of histListPlan(histIdx(L, es[0].m.k).ids, all, put, es[0].m.k === 'it').bad) { bad.push(e); bad.pos.push(e); }
  }
  return bad;
}
function histSet(R, p, j) {
  let o = R;
  for (let i = 0; i < p.length - 1; i++) {
    const s = p[i];
    if (typeof s === 'string') { if (o[s] === null || typeof o[s] !== 'object') o[s] = {}; o = o[s]; } else o = o[histFind(o, s)];
  }
  const s = p[p.length - 1];
  if (j === undefined) delete o[s]; else o[s] = JSON.parse(j);
}
/* (lote AH) el orden nuevo de una lista: salen los que se van o se mueven y entran, en el orden del lado de destino
   (side), los que vuelven. Cada uno vuelve a su lugar solo si su vecindario de antes sigue en pie: su vecino de antes y
   el de después siguen juntos (contando como «después» al siguiente que no vuelve con este mismo paso). Si no:
   · en el plan (sched), si su vecino de antes o el de después sigue en la misma jornada (o en «sin programar»), junto a
     él; si tampoco, no hay dónde: es un choque (así una escena no vuelve a otra jornada);
   · en las demás listas, donde el orden no dice nada (marcas, líneas, equipo), junto al de antes, al comienzo si era el
     primero, junto al de después o en su lugar.
   ids: las identidades de ahora (no se toca). Devuelve { ids: el orden nuevo, bad: las entradas sin lugar } */
const histSegOf = (ids, j) => { for (let k = j; k < ids.length; k++) if (ids[k] != null && ids[k][0] === 'd') return ids[k]; return ''; };
function histListPlan(ids0, es, side, sched) {
  const go = new Set(es.filter(e => e.mv || e[side] === undefined).map(e => e.m.i));
  const ids = ids0.filter(id => !go.has(id)), bad = [];
  const ins = es.filter(e => e.mv || e[side] !== undefined).sort((x, y) => x[side + 'i'] - y[side + 'i']);
  const pend = new Set(ins.map(e => e.m.i)), byId = new Map(ins.map(e => [e.m.i, e]));
  // sus vecinos: los de donde estaba la última vez que salió (x: deshacer y rehacer enseguida son exactos) y los de
  // cuando se hizo el paso
  const cands = e => [e['x' + side], { p: e[side + 'p'], n: e[side + 'n'], s: e[side + 's'] }].filter(Boolean);
  const nextOf = (e, c) => { let nx = c.n; while (nx != null && pend.has(nx)) { const f = byId.get(nx), x = f['x' + side] || {}; nx = 'n' in x ? x.n : f[side + 'n']; } return nx; };
  for (const e of ins) {
    pend.delete(e.m.i);
    let k = -1;
    const C = cands(e).map(c => { const nx = nextOf(e, c); return { c, nx, a: c.p == null ? -1 : ids.indexOf(c.p), b: nx == null ? ids.length : ids.indexOf(nx) }; });
    for (const { c, a, b } of C) if ((c.p == null || a >= 0) && b >= 0 && b === a + 1) { k = b; break; }   // sus dos vecinos siguen juntos: exacto
    if (k < 0 && sched) {
      for (const { c, nx, a, b } of C) {
        if (c.s === undefined) continue;
        if (a >= 0 && histSegOf(ids, a + 1) === c.s) k = a + 1;
        else if (nx != null && b >= 0 && histSegOf(ids, b) === c.s) k = b;
        else if (c.p == null && histSegOf(ids, 0) === c.s) k = 0;
        if (k >= 0) break;
      }
    } else if (k < 0) { const { c, nx, a, b } = C[C.length - 1]; k = a >= 0 ? a + 1 : c.p == null ? 0 : nx != null && b >= 0 ? b : Math.min(e[side + 'i'], ids.length); }
    if (k < 0) { bad.push(e); continue; }
    ids.splice(k, 0, e.m.i);
  }
  return { ids, bad };
}
/* agregar, quitar y mover en una lista (ya revisado con histMiss). Lo que sale recuerda dónde estaba (sus vecinos, su
   lugar y su jornada) como su lugar del otro lado: así deshacer y rehacer enseguida dejan exactamente el mismo orden */
function histListPut(L, es, side) {
  const k = es[0].m.k, f = HIST_IK[k], o = side === 'a' ? 'b' : 'a', sched = k === 'it', cur = L.map(f), objs = new Map();
  L.forEach((x, j) => objs.set(cur[j], x));
  for (const e of es) {
    const j = cur.indexOf(e.m.i);
    if (j < 0 || !(e.mv || e[side] === undefined)) continue;
    e['x' + o] = { p: j > 0 ? cur[j - 1] : null, n: j < cur.length - 1 ? cur[j + 1] : null, s: sched ? histSegOf(cur, j) : undefined };
  }
  const { ids } = histListPlan(cur, es, side, sched);
  for (const e of es) if (!e.mv && e[side] !== undefined) objs.set(e.m.i, JSON.parse(e[side]));
  L.splice(0, L.length, ...ids.map(id => objs.get(id)).filter(x => x !== undefined));
  if (HIST_C) HIST_C.delete(L);
}
const histPs = p => p.map(s => typeof s === 'string' ? s : '\u0001' + s.i).join('\u0000');
// el lugar de un elemento de una lista: cada paso que lo agrega, lo quita o lo mueve le da una versión nueva (pv) y
// recuerda la de antes (av); deshacer y rehacer la devuelven, como a cualquier otro valor
const histPk = e => histPs(e.p) + '\u0002' + e.m.i;
function histPosPut(ch, side) {
  for (const e of ch) if (e.m) { const v = side === 'b' ? e.pv : e.av; if (v === undefined) HIST.pos.delete(histPk(e)); else HIST.pos.set(histPk(e), v); }
}
/* deja las rutas del paso como en side ('a': antes, para deshacer; 'b': después, para rehacer). Ya revisado con histMiss */
function histPut(R, ch, side) {
  const lists = new Map();
  for (const e of ch) {
    if (e.m) { const k = histPs(e.p); if (!lists.has(k)) lists.set(k, { p: e.p, es: [] }); lists.get(k).es.push(e); }
    else if ('sp' in e) { const L = histAt(R, e.p).v; L.splice(e.sp, side === 'a' ? e.nb : e.na, ...JSON.parse(e[side])); if (HIST_C) HIST_C.delete(L); }
    else histSet(R, e.p, e[side]);
  }
  for (const { p, es } of lists.values()) { const r = histAt(R, p); if (r && Array.isArray(r.v)) histListPut(r.v, es, side); }
}
/* ¿dos entradas tocan lo mismo? (una ruta dentro de la otra); con list, basta con que sean de la misma lista */
function histOver(x, y, list) {
  const a = histPs(list || !x.m ? x.p : [...x.p, x.m]), b = histPs(list || !y.m ? y.p : [...y.p, y.m]);
  return a === b || a.startsWith(b + '\u0000') || b.startsWith(a + '\u0000');
}

/* ---------- (lote AH) qué se cambió, en palabras: se arma al tomar el paso (con el antes y el después a mano) ----------
   Las partes: textos del programa (se traducen) y lo que escribió cada uno ({ v }, tal cual). */
const hv = v => ({ v: String(v) });
const hq = v => [EN ? '“' : '«', hv(v), EN ? '”' : '»'];
// un valor corto para mostrar («07:00», «150»); null si es largo, una lista o un sí/no
function histShort(j, fmt) {
  if (j === undefined) return '—';
  let v; try { v = JSON.parse(j); } catch (e) { return null; }
  if (v === null || v === '') return '—';
  if (fmt) { try { const x = fmt(v); if (x != null) return x; } catch (e) { } }
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string') return null;
  v = v.trim();
  return !v ? '—' : v.length > 28 || /\n/.test(v) ? null : v;
}
// los textos largos por naturaleza (descripciones, notas) no muestran «antes → después»
const HF_TEXT = new Set(['desc', 'notes', 'note', 'obs', 'tech', 'synopsis', 'text']);
function hArrow(e, fmt, def) { if (HF_TEXT.has(e.p[e.p.length - 1])) return []; const a = histShort(e.a === undefined && def ? JSON.stringify(def) : e.a, fmt), b = histShort(e.b === undefined && def ? JSON.stringify(def) : e.b, fmt); return a != null && b != null && a !== b ? [' ', hv(a), ' → ', hv(b)] : []; }
const hMin = v => typeof v === 'number' && typeof fmtDur === 'function' ? fmtDur(v) : null;
const hYmd = v => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(v); return m && typeof fmtDate === 'function' ? fmtDate(new Date(+m[1], m[2] - 1, +m[3])) : null; };
const hField = (map, f) => map[f] || 'datos';
const hTitle = s => typeof titleCase === 'function' ? titleCase(s || '') : String(s || '');
const HF_ROW = { dur: 'duración', fig: 'figuración', loc: 'locación', t: 'hora', tech: 'técnica', obs: 'observaciones', e8: 'largo', name: 'nombre', st: 'etapa' };
const HF_PLAN = { start: 'Inicio del rodaje', off: 'Días de descanso', call: 'Llamado general', pagesPerDay: 'Páginas por jornada', minPerPage: 'Minutos por página', stages: 'Etapas del rodaje', locs: 'Locaciones', setLoc: 'Locaciones', castMode: 'Reparto en el plan', colW: 'Ancho de las columnas' };
const HF_DAY = { crewCall: 'llamado', motor: 'listos motor', lunch: 'almuerzo', sunrise: 'amanecer', sunset: 'anochece', notes: 'nota para el equipo', quote: 'frase del día', end: 'fin de jornada', wx: 'clima', hi: 'máxima', lo: 'mínima', hum: 'humedad', hosp: 'centro de salud', meet: 'punto de encuentro', craft: 'catering', mov: 'movilidad', out: 'quién no viene', at: 'horas del cronograma', shotAt: 'hora de los planos', dur: 'duración de las escenas', dcall: 'citación de las áreas', crew: 'llamado del equipo', cast: 'reparto', vend: 'llamado de proveedores' };
const HF_CAST = { pu: 'recojo', call: 'llamado', mq: 'maquillaje', ves: 'vestuario', ready: 'listos', obs: 'observaciones' };
const HF_PERSON = { name: 'nombre', role: 'cargo', phone: 'teléfono', email: 'correo', dept: 'área', actor: 'actor o actriz', gear: 'equipo que lleva', contact: 'contacto' };
const HF_LINE = { name: 'concepto', qty: 'cantidad', unit: 'unidad', mult: 'días o semanas', rate: 'tarifa', note: 'nota', sec: 'partida', link: 'vínculo con el plan', qlink: 'vínculo con el plan' };
const HF_BUD = { currency: 'Moneda', contingency: 'Imprevistos (%)', igv: 'Impuesto', igvRate: 'Tasa del impuesto', taxName: 'Nombre del impuesto', fx: 'Tipo de cambio' };
const HF_SHOT = { size: 'tamaño', angle: 'ángulo', move: 'movimiento', lens: 'lente', support: 'soporte', dur: 'duración', desc: 'descripción', notes: 'notas', chars: 'personajes', done: 'rodado', ord: 'orden', s3: 'escena 3D', snd: 'sonido', sc: 'escena', p0: 'líneas del guion', p1: 'líneas del guion' };
const HF_EL = { name: 'nombre', cat: 'categoría', auto: 'sugerencia confirmada', notes: 'notas', note: 'notas', qty: 'cantidad', ph: 'fotos', photos: 'fotos', color: 'color' };
const HF_TASK = { title: 'nombre', start: 'fechas', end: 'fechas', segs: 'fechas', done: 'hecha', notes: 'notas', cat: 'tipo', who: 'responsable' };
const HF_META = { title: 'título', author: 'autor', draft: 'versión', directors: 'dirección', producers: 'producción', company: 'productora', brand: 'logos en los documentos', aspect: 'formato de imagen', pal: 'paleta de colores', eps: 'episodios', lock: 'guion cerrado' };
const HD_AREA = { paras: 'Guion', build: 'Historia', scout: 'Scouting', casting: 'Casting', notes: 'Notas', looks: 'Aspecto de los personajes', faces: 'Expresiones', plans: 'Plano de planta', locPlans: 'Plano de planta', sets3d: 'Escenarios 3D', locSet3d: 'Escenarios 3D', dur: 'Duración de los planos', animatic: 'Animatic', gastos: 'Gastos', aspect: 'Formato de imagen', frames: 'Imágenes', schedule: 'Plan de rodaje', call: 'Hoja de llamado', budget: 'Presupuesto', shots: 'Storyboard', calendar: 'Calendario', sup: 'Hoja de script', meta: 'Proyecto', bd: 'Desglose' };
// el número de cada jornada (por el id de su corte) y la jornada de cada fila del plan ('' : sin programar)
function histDays(items) {
  const num = new Map(), day = new Map(); let n = 0, cur = [];
  for (const it of items || []) { const id = HIST_IK.it(it); if (!id) continue; if (it.d) { num.set(id, ++n); for (const x of cur) day.set(x, id); cur = []; } else cur.push(id); }
  for (const x of cur) day.set(x, '');
  return { num, day };
}
const hScene = id => 'Escena ' + id.slice(2).replace('|', '');
function hRow(id, O, N) {
  if (id[0] === 'k') return [hScene(id)];
  const its = [...(((N.schedule || {}).items) || []), ...(((O.schedule || {}).items) || [])];
  if (id[0] === 'e') { const it = its.find(x => HIST_IK.it(x) === id) || {}; return it.name ? ['Evento', ' ', ...hq(it.name)] : ['Un evento']; }
  const n = histDays((N.schedule || {}).items).num.get(id) || histDays((O.schedule || {}).items).num.get(id);
  return [n ? 'Jornada ' + n : 'Una jornada'];
}
// lo que una jornada toma del plan cuando su campo está vacío (el llamado, listos motor, el almuerzo)
const hDayDef = (id, f) => { try { const d = callDays().days.find(x => x.id === id); return d ? callDefaults(d)[f] || '' : ''; } catch (e) { return ''; } };
// el número de una jornada de la hoja de llamado (por su id, en el plan de ahora)
const hCallDay = id => { const n = histDays(P && P.schedule && P.schedule.items).num.get('d:' + id); return n ? 'Jornada ' + n : 'Una jornada'; };
const hElName = id => { const e = (P && P.elements && P.elements[id]) || {}; return e.name ? hTitle(e.name) : ''; };
const hCrew = (C, id) => { const c = ((C && C.crew) || []).find(x => x.id === id) || ((P && P.call && P.call.crew) || []).find(x => x.id === id); return c ? (c.name || '').trim() || c.role || '' : ''; };
const hShot = (id, O, N) => { if (typeof D !== 'undefined' && D && D.code && D.code[id]) return 'Plano ' + D.code[id]; const s = ((N.shots || {})[id]) || ((O.shots || {})[id]); return s && s.sc ? 'Un plano de la escena ' + s.sc : 'Un plano'; };
const hSceneOfPara = i => { try { const x = D.sc.sceneOf[i]; return x >= 0 ? D.sc.scenes[x].key : ''; } catch (e) { return ''; } };
const hCat = c => (typeof CAT !== 'undefined' && CAT[c] ? CAT[c].name : c || '').toLowerCase();
const HD = {
  schedule(es, O, N) {
    const A = (O.schedule || {}).items || [], B = (N.schedule || {}).items || [], da = histDays(A), db = histDays(B);
    const rows = es.filter(e => e.p[1] === 'items' && e.m), brAdd = rows.filter(e => e.m.k === 'it' && e.m.i[0] === 'd' && e.a === undefined && !e.mv), brDel = rows.filter(e => e.m.k === 'it' && e.m.i[0] === 'd' && e.b === undefined && !e.mv);
    const mv = rows.filter(e => e.mv);   // (al agregar o quitar jornadas, lo que se corre va con ellas)
    if (brAdd.length && !brDel.length) return { d: [brAdd.length === 1 ? 'Jornada nueva' : brAdd.length + ' jornadas nuevas'], cov: [...brAdd, ...mv] };
    if (brDel.length && !brAdd.length) return { d: [brDel.length === 1 ? 'Jornada quitada' : brDel.length + ' jornadas quitadas'], cov: [...brDel, ...mv] };
    // escenas que cambian de jornada (por la jornada, no por su número: agregar una antes no las «mueve»)
    const sc = [...db.day.keys()].filter(id => id[0] === 'k' && da.day.has(id) && da.day.get(id) !== db.day.get(id));
    if (sc.length === 1) { const n = db.num.get(db.day.get(sc[0])); return { d: [hScene(sc[0]), ' ', n ? 'a la jornada ' + n : 'a «Sin programar»'], cov: mv }; }
    if (sc.length > 1) return { d: [sc.length + ' escenas cambian de jornada'], cov: mv };
    if (mv.length) {
      if (mv.every(e => e.m.i[0] === 'd')) return { d: ['Nuevo orden de las jornadas'], cov: mv };
      const ds = new Set(mv.filter(e => e.m.i[0] !== 'd').map(e => db.day.get(e.m.i))), n = ds.size === 1 ? db.num.get([...ds][0]) : 0;
      return { d: [n ? 'Nuevo orden en la jornada ' + n : 'Nuevo orden del plan'], cov: mv };
    }
    const add = rows.find(e => e.a === undefined), del = rows.find(e => e.b === undefined);
    if (add || del) {
      const e = add || del, id = e.m.i, x = JSON.parse(add ? e.b : e.a) || {};
      if (id[0] === 'e') return { d: ['Evento', ' ', ...hq(x.name || ''), ' ', add ? 'agregado' : 'quitado'], cov: [e] };
      if (x.sp) return { d: add ? ['Escena ' + x.k, ' ', 'dividida'] : ['Parte ' + x.k + x.sp, ' ', 'unida a su escena'], cov: [e] };
      return { d: [hScene(id), ' ', add ? 'en el plan' : 'fuera del plan'], cov: [e] };
    }
    const f = es.find(e => e.p[1] === 'items' && e.p.length > 3 && typeof e.p[3] === 'string');
    if (f) return { d: [...hRow(f.p[2].i, O, N), ': ', hField(HF_ROW, f.p[3]), ...hArrow(f, f.p[3] === 'dur' ? hMin : null)], cov: [f] };
    const g = es.find(e => e.p.length >= 2 && HF_PLAN[e.p[1]]);
    if (g) return { d: [HF_PLAN[g.p[1]], ...(g.p.length === 2 ? hArrow(g, g.p[1] === 'start' ? hYmd : null) : [])], cov: es.filter(e => HF_PLAN[e.p[1]] === HF_PLAN[g.p[1]]) };
    return null;
  },
  call(es, O, N) {
    // una jornada que aparece o se va entera (la primera vez que se escribe en ella): se cuenta por sus datos
    const ex = es.flatMap(x => {
      if (x.p[1] !== 'days' || x.p.length !== 3) return [x];
      const a = x.a ? JSON.parse(x.a) || {} : {}, b = x.b ? JSON.parse(x.b) || {} : {}, ks = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => k !== 'exp' && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
      return ks.length ? ks.map(k => ({ p: [...x.p, k], a: a[k] === undefined ? undefined : JSON.stringify(a[k]), b: b[k] === undefined ? undefined : JSON.stringify(b[k]), of: x })) : [x];
    });
    const e0 = ex.find(x => x.p[1] === 'days' && x.p.length >= 4) || ex[0], e = e0, C = N.call || O.call, cov = [e0.of || e0];
    if (e.p[1] === 'days' && e.p.length >= 4) {
      const day = hCallDay(e.p[2]), f = e.p[3], k = e.p[4];
      // vacío, el llamado (o listos motor, el almuerzo) sigue al del plan: se muestra ese
      let what = [hField(HF_DAY, f)], arrow = e.p.length === 4 ? hArrow(e, null, hDayDef(e.p[2], f)) : [];
      if (f === 'dcall' && k) { const d = (typeof CS_DEPTS !== 'undefined' ? CS_DEPTS : []).find(x => x[0] === k); what = ['citación', ' · ', d ? d[1] : 'un área']; arrow = hArrow(e); }
      else if (f === 'crew' && k) { what = ['llamado de', ' ', hv(hCrew(C, k) || '—')]; arrow = hArrow(e); }
      else if (f === 'cast' && k) { what = [HF_CAST[e.p[5]] || 'reparto', ' · ', hv(hElName(k) || '—')]; arrow = e.p.length === 6 ? hArrow(e) : []; }
      else if (f === 'vend' && k) { const v = ((C && C.vendors) || []).find(x => x.id === k); what = ['llamado de', ' ', hv((v && v.name) || '—')]; arrow = hArrow(e); }
      else if (f === 'at' && k) { what = ['hora', ' · ', k.startsWith('k:') ? hScene(k) : 'Un evento']; arrow = hArrow(e); }
      else if (f === 'out' && k) { what = [hv(hCrew(C, k) || '—'), ' ', e.b !== undefined ? 'no viene' : 'vuelve a la jornada']; arrow = []; }
      else if (f === 'hosp' || f === 'meet') arrow = [];
      return { d: [day, ': ', ...what, ...arrow], cov };
    }
    if (e.p[1] === 'days') return { d: [e.p.length === 3 ? hCallDay(e.p[2]) : 'Hoja de llamado', ': ', 'datos de la jornada'], cov };
    const lists = { crew: ['Equipo', HF_PERSON], vendors: ['Proveedores', HF_PERSON] };
    if (lists[e.p[1]]) {
      const [area, F] = lists[e.p[1]], all = e.p[1] === 'crew' ? (C && C.crew) || [] : (C && C.vendors) || [];
      const ad = es.filter(x => x.p[1] === e.p[1] && x.m && !x.mv && x.a === undefined), dl = es.filter(x => x.p[1] === e.p[1] && x.m && !x.mv && x.b === undefined);
      if (ad.length > 1 && !dl.length) return { d: [area, ': ', ad.length + ' agregados'], cov: ad };
      if (dl.length > 1 && !ad.length) return { d: [area, ': ', dl.length + ' quitados'], cov: dl };
      if (e.m && !e.mv) { const x = JSON.parse(e.a || e.b) || {}; return { d: [area, ': ', ...hq((x.name || '').trim() || x.role || '—'), ' ', e.a === undefined ? 'agregado' : 'quitado'], cov: [e] }; }
      if (e.mv) return { d: [area, ': ', 'nuevo orden'], cov: es.filter(x => x.mv) };
      const id = e.p[2] && e.p[2].i, x = all.find(y => y.id === id) || {};
      return { d: [area, ': ', ...hq((x.name || '').trim() || x.role || '—'), ' · ', hField(F, e.p[3]), ...hArrow(e)], cov: [e] };
    }
    if (e.p[1] === 'talent') return { d: ['Reparto', ': ', ...hq(hElName(e.p[2]) || '—'), ' · ', hField(HF_PERSON, e.p[3]), ...(e.p.length === 4 ? hArrow(e) : [])], cov: [e] };
    const top = { hospital: 'Centro de salud', client: 'Cliente', radio: 'Canales de radio', noThumbs: 'Miniaturas del cronograma', shotTimes: 'Hora por plano' };
    if (top[e.p[1]]) return { d: [top[e.p[1]], ...(e.p.length === 2 ? hArrow(e) : [])], cov: es.filter(x => x.p[1] === e.p[1]) };
    return null;
  },
  bd(es, O, N) {
    const EA = O.elements || (P && P.elements) || {}, EB = N.elements || (P && P.elements) || {};
    const el = id => EB[id] || EA[id] || {}, nm = id => hTitle(el(id).name) || '—';
    const tg = es.filter(e => e.p[0] === 'tags' && e.m && !e.mv), tAdd = tg.filter(e => e.a === undefined), tDel = tg.filter(e => e.b === undefined);
    const elAdd = es.filter(e => e.p[0] === 'elements' && e.p.length === 2 && e.a === undefined), elDel = es.filter(e => e.p[0] === 'elements' && e.p.length === 2 && e.b === undefined);
    const tags = (L, side) => L.map(e => JSON.parse(e[side]) || {});
    for (const [L, side, verb, verbN] of [[tAdd, 'b', 'en la escena ', 'en '], [tDel, 'a', 'quitado de la escena ', 'quitado de ']]) {
      if (!L.length) continue;
      const T = tags(L, side), ids = [...new Set(T.map(t => t.el))];
      if (ids.length !== 1) continue;
      const id = ids[0], c = hCat(el(id).cat), scs = [...new Set(T.map(t => hSceneOfPara(t.p)).filter(Boolean))];
      const where = scs.length === 1 ? verb + scs[0] : scs.length > 1 ? verbN + scs.length + ' escenas' : (side === 'b' ? 'marcado en el guion' : 'quitado del guion');
      return { d: [...hq(nm(id)), c ? ' (' : '', c, c ? ') ' : ' ', where], cov: [...L, ...elAdd.filter(e => e.p[1] === id), ...elDel.filter(e => e.p[1] === id)] };
    }
    if (tAdd.length) return { d: [tAdd.length + ' marcas en el guion'], cov: [...tAdd, ...elAdd] };
    if (tDel.length) return { d: [tDel.length + ' marcas quitadas'], cov: [...tDel, ...elDel] };
    const conf = es.filter(e => (e.p[0] === 'tags' || e.p[0] === 'elements') && e.p[e.p.length - 1] === 'auto');
    if (conf.length && conf.length === es.length) return { d: [conf.length === 1 ? 'Sugerencia confirmada' : 'Sugerencias confirmadas'], cov: conf };
    if (elAdd.length === 1) { const id = elAdd[0].p[1]; return { d: [...hq(nm(id)), ' (', hCat(el(id).cat), ') ', 'agregado al desglose'], cov: elAdd }; }
    if (elDel.length === 1) { const id = elDel[0].p[1]; return { d: [...hq(hTitle((EA[id] || {}).name) || '—'), ' ', 'eliminado del desglose'], cov: elDel }; }
    const ef = es.filter(e => e.p[0] === 'elements' && e.p.length >= 3);
    const ids = [...new Set(ef.map(e => e.p[1]))];
    if (ids.length === 1) {
      const id = ids[0], e = ef[0], f = e.p[2];
      if (f === 'cat' && e.p.length === 3) return { d: [...hq(nm(id)), ': ', 'categoría', ' ', hCat(JSON.parse(e.a || '""')), ' → ', hCat(JSON.parse(e.b || '""'))], cov: ef };
      if (f === 'name' && e.p.length === 3) return { d: ['Nombre', ': ', ...hq(hTitle(JSON.parse(e.a || '""'))), ' → ', ...hq(hTitle(JSON.parse(e.b || '""')))], cov: ef };
      return { d: [...hq(nm(id)), ': ', hField(HF_EL, f)], cov: ef };
    }
    if (ids.length > 1) return { d: [ids.length + ' elementos del desglose'], cov: ef };
    const s = es.find(e => e.p[0] === 'scenes' && e.p.length >= 2);
    if (s) return { d: ['Escena ' + s.p[1], ': ', s.p[2] === 'synopsis' || s.p.length === 2 ? 'sinopsis' : 'datos'], cov: es.filter(e => e.p[0] === 'scenes' && e.p[1] === s.p[1]) };
    return null;
  },
  budget(es, O, N) {
    const L = id => ((N.budget || {}).lines || []).find(x => x.id === id) || ((O.budget || {}).lines || []).find(x => x.id === id) || {};
    const ln = es.filter(e => e.p[1] === 'lines'), add = ln.filter(e => e.m && !e.mv && e.a === undefined), del = ln.filter(e => e.m && !e.mv && e.b === undefined);
    if (add.length === 1 && del.length === 0) return { d: ['Línea nueva', ': ', ...hq((JSON.parse(add[0].b) || {}).name || '—')], cov: add };
    if (del.length === 1 && add.length === 0) return { d: [...hq((JSON.parse(del[0].a) || {}).name || '—'), ' ', 'eliminada del presupuesto'], cov: del };
    if (add.length || del.length) return { d: [add.length + del.length + ' líneas del presupuesto'], cov: [...add, ...del] };
    const mv = ln.filter(e => e.mv);
    const f = ln.filter(e => e.p.length >= 4), ids = [...new Set(f.map(e => e.p[2].i))];
    if (ids.length === 1) { const e = f[0]; return { d: [...hq(L(ids[0]).name || '—'), ': ', hField(HF_LINE, e.p[3]), ...(e.p.length === 4 ? hArrow(e) : [])], cov: f.filter(x => x.p[3] === e.p[3]) }; }
    if (ids.length > 1) return { d: [ids.length + ' líneas del presupuesto'], cov: f };
    if (mv.length) return { d: ['Nuevo orden de las líneas'], cov: mv };
    const g = es.find(e => HF_BUD[e.p[1]]);
    if (g) return { d: [HF_BUD[g.p[1]], ...(g.p.length === 2 ? hArrow(g) : [])], cov: es.filter(e => e.p[1] === g.p[1]) };
    return null;
  },
  shots(es, O, N) {
    const add = es.filter(e => e.p.length === 2 && e.a === undefined), del = es.filter(e => e.p.length === 2 && e.b === undefined);
    if (add.length === 1 && !del.length) return { d: [hShot(add[0].p[1], O, N), ' ', 'agregado'], cov: add };
    if (del.length === 1 && !add.length) return { d: [hShot(del[0].p[1], O, N), ' ', 'eliminado'], cov: del };
    if (add.length || del.length) return { d: [(add.length + del.length) + ' planos'], cov: [...add, ...del] };
    const f = es.filter(e => e.p.length >= 3), ids = [...new Set(f.map(e => e.p[1]))];
    if (ids.length === 1) { const e = f[0], fs = new Set(f.map(x => x.p[2])); return { d: [hShot(ids[0], O, N), ': ', fs.size > 1 ? 'varios datos' : hField(HF_SHOT, e.p[2]), ...(fs.size === 1 && e.p.length === 3 ? hArrow(e) : [])], cov: f }; }
    if (ids.length > 1 && f.every(e => e.p[2] === 'ord')) { const s = ((N.shots || {})[ids[0]] || {}).sc; return { d: s ? ['Nuevo orden de los planos', ' · ', 'Escena ' + s] : ['Nuevo orden de los planos'], cov: f }; }
    if (ids.length > 1) return { d: [ids.length + ' planos'], cov: f };
    return null;
  },
  calendar(es, O, N) {
    const T = id => ((N.calendar || {}).tasks || []).find(x => x.id === id) || ((O.calendar || {}).tasks || []).find(x => x.id === id) || {};
    const t = es.filter(e => e.p[1] === 'tasks'), add = t.filter(e => e.m && !e.mv && e.a === undefined), del = t.filter(e => e.m && !e.mv && e.b === undefined);
    if (add.length === 1) return { d: ['Tarea nueva', ': ', ...hq((JSON.parse(add[0].b) || {}).title || '—')], cov: add };
    if (del.length === 1) return { d: [...hq((JSON.parse(del[0].a) || {}).title || '—'), ' ', 'eliminada'], cov: del };
    const f = t.filter(e => e.p.length >= 4), ids = [...new Set(f.map(e => e.p[2].i))];
    if (ids.length === 1) { const e = f[0]; return { d: [...hq(T(ids[0]).title || '—'), ': ', hField(HF_TASK, e.p[3]), ...(e.p.length === 4 && e.p[3] !== 'start' && e.p[3] !== 'end' ? hArrow(e) : [])], cov: f }; }
    if (ids.length > 1 || add.length || del.length) return { d: [(ids.length || add.length + del.length) + ' tareas del calendario'], cov: t };
    return null;
  },
  sup(es, O, N) {
    const e = es[0];
    if ((e.p[1] === 'takes' || e.p[1] === 'obs') && e.p[2]) return { d: [hShot(e.p[2], O, N), ': ', e.p[1] === 'takes' ? 'tomas' : 'observaciones'], cov: es.filter(x => x.p[1] === e.p[1] && x.p[2] === e.p[2]) };
    if (e.p[1] === 'sc' && e.p[2]) return { d: ['Escena ' + e.p[2], ': ', 'notas de script'], cov: es.filter(x => x.p[1] === 'sc' && x.p[2] === e.p[2]) };
    if (e.p[1] === 'day' && e.p[2]) return { d: [hCallDay(e.p[2]), ': ', 'parte diario'], cov: es.filter(x => x.p[1] === 'day' && x.p[2] === e.p[2]) };
    return null;
  },
  meta(es) { const e = es[0]; return e.p.length >= 2 && HF_META[e.p[1]] ? { d: ['Proyecto', ': ', HF_META[e.p[1]], ...(e.p.length === 2 ? hArrow(e) : [])], cov: es.filter(x => x.p[1] === e.p[1]) } : null; },
};
const HD_GROUP = { elements: 'bd', tags: 'bd', scenes: 'bd' };
const HD_TAB = { plan: ['schedule'], call: ['call'], breakdown: ['tags', 'elements', 'scenes'], lined: ['tags', 'elements'], script: ['tags', 'elements', 'scenes'], budget: ['budget'], board: ['shots'], cal: ['calendar'], sup: ['sup'], project: ['meta', 'call'] };
// lo que no cuenta como «otro cambio»: el registro del presupuesto, la marca de línea editada a mano y las filas guardadas
// por si vuelven al guion
const histAside = e => (e.p[0] === 'budget' && (e.p[1] === 'log' || (e.p[1] === 'lines' && (e.p[3] === 'ed' || e.p[3] === 'src')))) || (e.p[0] === 'schedule' && e.p[1] === 'gone');
// cuántas cosas distintas tocan unas entradas (un elemento de una lista, o un dato)
const histThings = es => new Set(es.map(e => histPs(e.m ? [...e.p, e.m] : e.p.slice(0, 4)))).size;
function histDescribe(ch, O, N, tab) {
  const es0 = ch.filter(e => !histAside(e)), by = {};
  if (!es0.length) return ch.length ? [HD_AREA[ch[0].p[0]] || 'Otros datos'] : null;
  for (const e of es0) (by[e.p[0]] = by[e.p[0]] || []).push(e);
  const k = (HD_TAB[tab] || []).find(x => by[x]) || Object.keys(by).sort((a, b) => by[b].length - by[a].length)[0];
  const g = HD_GROUP[k] || k, es = es0.filter(e => (HD_GROUP[e.p[0]] || e.p[0]) === g);
  let r = null;
  try { r = HD[g] ? HD[g](es, O, N) : null; } catch (e) { r = null; }
  // lo demás, genérico y honesto: «Historia · 3 cambios»
  if (!r || !r.d) { const n = histThings(es); r = { d: [HD_AREA[g] || 'Otros datos', ' · ', n === 1 ? '1 cambio' : n + ' cambios'], cov: es }; }
  const cov = new Set(r.cov || []), rest = histThings(es0.filter(e => !cov.has(e)));
  return rest > 0 ? [...r.d, ' ', rest === 1 ? 'y 1 cambio más' : 'y ' + rest + ' cambios más'] : r.d;
}

/* ---------- tomar un paso ---------- */
function histCapture() {
  clearTimeout(HIST.timer); HIST.wait = false;
  if (typeof P === 'undefined' || !P || !HIST.base) return null;
  const now = histSnap(P), keys = [...new Set([...Object.keys(HIST.base), ...Object.keys(now)])].filter(k => HIST.base[k] !== now[k]);
  const { ch, O, N } = keys.length ? histChanges(HIST.base, now, keys) : { ch: [] }, oldParas = HIST.base.paras;
  HIST.base = now;
  if (keys.length) HIST.ver++;
  const tab = HIST.tab || UI.tab, label = HIST.label, frames = HIST.frames;
  HIST.label = ''; HIST.frames = null; HIST.tab = '';
  if (!ch.length && !frames) return null;
  for (const e of ch) if (e.m) { const k = histPk(e); e.av = HIST.pos.get(k); e.pv = ++HIST.pn; HIST.pos.set(k, e.pv); }
  const st = { id: uid('h'), t: Date.now(), ch, tab, label, frames, own: histOwn(tab), seq: ++HIST.seq, n: ch.reduce((a, e) => a + histN(e), 0) };
  // (lote AH) si deshacer o rehacer vuelve a poner lugares del texto del guion (marcas, planos): con qué texto valen
  const ua = ch.some(e => histOnText(e, 'a')), ub = ch.some(e => histOnText(e, 'b'));
  if (ua || ub) { const pa = String(oldParas || ''), pb = String(now.paras || ''); st.tx = { a: histHash(pa), b: pa === pb ? null : histHash(pb), ua, ub }; if (st.tx.b === null) st.tx.b = st.tx.a; }
  // las palabras se arman ahora, con el antes y el después a mano
  if (!label) { try { st.d = histDescribe(ch, O || {}, N || {}, tab); } catch (e) { st.d = null; } }
  HIST.undo.push(st); HIST.chars += st.n;
  if (!st.own) HIST.cut[tab] = st.seq;   // Ctrl+Mayús+Z no rehace lo deshecho antes de un cambio nuevo en la pestaña
  histTrim();
  histPaint();
  return st;
}
function histTrim() {
  while (HIST.redo.length > HIST_REDO) HIST.chars -= HIST.redo.shift().n;
  while (HIST.undo.length > HIST_MAX) HIST.chars -= HIST.undo.shift().n;
  while (HIST.chars > HIST_CHARS && (HIST.redo.length || HIST.undo.length > 1)) HIST.chars -= (HIST.redo.length ? HIST.redo : HIST.undo).shift().n;
}
/* un cambio que no es un paso (la versión con que salió una hoja de llamado): pasa a la foto base sin dejar paso */
function histQuiet(k) {
  if (!P || !HIST.base || !(k in P)) return;
  clearTimeout(HIST.timer); HIST.wait = false;
  HIST.base[k] = JSON.stringify(P[k]); HIST.ver++;
}
/* las versiones ya enviadas de cada jornada sobreviven a deshacer y rehacer: un archivo que salió no se «des-envía» */
const histKeepExp = () => { const o = {}; for (const [id, d] of Object.entries((P && P.call && P.call.days) || {})) if (d && d.exp) o[id] = d.exp; return o; };
const histPutExp = o => { if (!P.call || !P.call.days) return; for (const [id, e] of Object.entries(o)) { const d = P.call.days[id]; if (d) d.exp = e; } };
function histApply(s, side) {
  const keys = new Set(s.ch.map(e => e.p[0])), back = side === 'a';
  const exp = keys.has('call') ? histKeepExp() : null;
  histPut(P, s.ch, side); histPosPut(s.ch, side);
  normalizeProject(P);
  if (exp) histPutExp(exp);
  if (keys.has('faces') && typeof faceChanged === 'function') for (const id of Object.keys(P.faces || {})) faceChanged(id);
  if (s.frames) for (const [k, u] of Object.entries(s.frames)) {
    if (back) FRAMES[k] = u; else delete FRAMES[k];
    if (typeof IMGS !== 'undefined') IMGS.delete(k);
    if (!UI.readOnly) Store.saveFrame(P.id, k, back ? u : null).catch(() => problem('Una imagen no se pudo guardar al deshacer.'));
  }
  derive();
  HIST.base = histSnap(P); HIST.ver++;
  if (keys.has('paras') || keys.has('meta')) dirty.add('script');
  dirty.add('data'); P._touched = true; setSaveState(); saveSoon();
  render();
}

/* ---------- deshacer y rehacer ---------- */
// el texto de un paso, en el idioma de la pantalla (ya traducido: lo que escribió cada uno queda tal cual)
function histText(s) {
  if (s._t != null) return s._t;
  const t = s.label ? tr(s.label) : s.d ? s.d.map(x => typeof x === 'string' ? tr(x) : x.v).join('') : tr(s.ch.length ? 'Un cambio' : 'Imágenes');
  return (s._t = trDone(t));
}
const histQ = t => EN ? '“' + t + '”' : '«' + t + '»';
const histName = s => trDone(histText(s) + (s.tab && TAB_NAME[s.tab] && s.tab !== UI.tab ? ` (${tr(TAB_NAME[s.tab])})` : ''));
const histLast = tab => { for (let i = HIST.undo.length - 1; i >= 0; i--) { const s = HIST.undo[i]; if (!s.own && s.tab === tab) return s; } return null; };
const histLastRedo = tab => HIST.redo.filter(s => s.tab === tab && s.useq > (HIST.cut[tab] || 0)).sort((a, b) => b.useq - a.useq)[0] || null;
/* ¿se puede deshacer (on: está hecho) o rehacer? null si se puede; si no, { why, by }: por qué y, si se sabe, el paso
   posterior que lo impide. why: 'val' (lo mismo cambió después), 'pos' (lo que tenía al lado cambió: no hay dónde
   volver), 'txt' (el guion cambió y lo que vuelve tiene lugares en su texto) o 'ref' (lo que se quitaría todavía se usa).
   Se guarda hasta que el proyecto vuelva a cambiar */
function histBlock(s, on) {
  if (s._v === HIST.ver && s._on === on) return s._b;
  const mine = !HIST_C; if (mine) HIST_C = new WeakMap();
  let b = null;
  try {
    const after = on ? s.seq : s.useq, later = HIST.undo.filter(x => x !== s && x.seq > after), put = on ? 'a' : 'b';
    const bad = histMiss(P, s.ch, on ? 'b' : 'a', later);
    if (bad.length) b = { why: bad.pos.length === bad.length ? 'pos' : 'val', by: histBy(s, bad, on) };
    // las marcas del desglose y los planos tienen lugares en el texto del guion (párrafo y letras, p0-p1): vuelven solo
    // sobre el mismo texto con que se hizo el paso
    else if (s.tx && s.tx['u' + put] && histParasHash() !== s.tx[on ? 'b' : 'a']) b = { why: 'txt', by: [...later].reverse().find(x => x.ch.some(e => e.p[0] === 'paras')) || null };
    else { const id = histOrphan(s, put); if (id) b = { why: 'ref', by: [...later].reverse().find(x => x.ch.some(e => e.p.includes(id) || [e.a, e.b].some(j => j && j.includes('"' + id + '"')))) || null }; }
  }
  catch (e) { b = { why: 'val', by: null }; }
  finally { if (mine) HIST_C = null; }
  s._v = HIST.ver; s._on = on; s._b = b;
  return b;
}
/* (lote AH) el texto del guion de ahora, en huella (la de la foto, si no hay cambios por anotar) */
function histParasHash() {
  const j = String((!HIST.wait && HIST.base ? HIST.base.paras : JSON.stringify(P.paras)) || '');
  if (HIST._ph && HIST._ph.j === j) return HIST._ph.h;
  HIST._ph = { j, h: histHash(j) };
  return HIST._ph.h;
}
/* ¿deshacer (put 'a') o rehacer (put 'b') vuelve a poner lugares del texto del guion? */
function histOnText(e, put) {
  const k = e.p[0], v = e[put];
  if (k === 'tags') {
    if (e.m && !e.mv) { if (v === undefined) return false; const t = JSON.parse(v); return !!t && t.p >= 0; }
    if (e.p.length === 1 || 'sp' in e) return v !== undefined;
    return e.p.length === 3 && ['p', 's', 'e'].includes(e.p[2]);
  }
  if (k === 'shots') {
    if (e.p.length === 1) return v !== undefined;
    if (e.p.length === 2) { if (v === undefined) return false; const x = JSON.parse(v); return !!x && x.p0 != null; }
    return e.p[2] === 'p0' || e.p[2] === 'p1';
  }
  return false;
}
/* (lote AH) ¿lo que desaparecería al deshacer (put 'a') o rehacer (put 'b') todavía se usa? Los ids son únicos: se
   cuenta cuántas veces está su id entre comillas en el proyecto (una sola pasada por versión), menos las que se van
   con este paso y más las que vuelven. Devuelve el primer id que quedaría usado, o null */
const histIdsIn = j => { const o = new Set(); if (j) for (const x of j.matchAll(/"id":"([^"\\]{1,80})"/g)) o.add(x[1]); return o; };
const histOcc = (j, id) => j ? j.split('"' + id + '"').length - 1 : 0;
function histOrphan(s, put) {
  const o = put === 'a' ? 'b' : 'a', gone = new Set();
  for (const e of s.ch) {
    if (e[o] === undefined) continue;
    const keep = histIdsIn(e[put]);
    for (const id of histIdsIn(e[o])) if (!keep.has(id)) gone.add(id);
    // las jornadas y los eventos del plan no tienen «id», sino su corte o su evento
    if (e.m && e.m.k === 'it' && !e.mv && e[put] === undefined && (e.m.i[0] === 'd' || e.m.i[0] === 'e')) gone.add(e.m.i.slice(2));
  }
  if (!gone.size) return null;
  const refs = histRefs();
  for (const id of gone) {
    let n = refs.get(id) || 0;
    for (const e of s.ch) {
      const last = e.p[e.p.length - 1], key = !e.m && !('sp' in e) && last === id;
      n -= histOcc(e[o], id) + (key && e[o] !== undefined && e[put] === undefined ? 1 : 0);
      n += histOcc(e[put], id) + (key && e[put] !== undefined && e[o] === undefined ? 1 : 0);
    }
    if (n > 0) return id;
  }
  return null;
}
// cuántas veces está cada texto corto entre comillas en el proyecto (ids y claves); una pasada por versión
function histRefs() {
  if (HIST._refs && HIST._refs.v === HIST.ver && !HIST.wait) return HIST._refs.m;
  const snap = !HIST.wait && HIST.base ? HIST.base : histSnap(P), m = new Map(), rx = /"([\w:|.-]{1,80})"/g;
  for (const j of Object.values(snap)) if (j) for (const x of j.matchAll(rx)) m.set(x[1], (m.get(x[1]) || 0) + 1);
  if (!HIST.wait) HIST._refs = { v: HIST.ver, m };
  return m;
}
// el paso posterior que tocó lo mismo (el más reciente); si no hay, el que tocó la misma lista
function histBy(s, bad, on) {
  const after = on ? s.seq : s.useq, later = HIST.undo.filter(x => x !== s && x.seq > after);
  for (const list of [false, true]) for (let i = later.length - 1; i >= 0; i--) if (later[i].ch.some(e => bad.some(b => (!list || b.m) && histOver(e, b, list)))) return later[i];
  return null;
}
/* qué choca, en palabras: «No se puede deshacer «X»: lo volviste a cambiar después (Y).» short: para el panel */
function histWhy(s, b, on, short) {
  const L = b && b.by, w = b && b.why, named = L && !L.own ? ' (' + histText(L) + ')' : '';
  let why;
  if (w === 'txt') why = tr('el guion cambió después') + named;
  else if (w === 'ref') why = tr(L ? 'todavía se usa en lo que hiciste después' : 'todavía se usa en el proyecto') + named;
  else if (w === 'pos') why = tr('lo que tenía al lado cambió después') + (L ? ' (' + histText(L) + ')' : '');
  else why = !L ? tr(short ? 'Se cambió después' : 'eso cambió después')
    : L.own ? tr(L.tab === 'animatic' ? 'después lo cambiaste en el animatic' : 'después lo cambiaste al escribir el guion')
    : (L.tab === s.tab ? tr('lo volviste a cambiar después') : tr('después lo cambiaste en') + ' ' + tr(TAB_NAME[L.tab] || 'otra pestaña')) + ' (' + histText(L) + ')';
  if (short) return trDone(why.charAt(0).toUpperCase() + why.slice(1));
  return trDone(tr(on ? 'No se puede deshacer' : 'No se puede rehacer') + ' ' + histQ(histText(s)) + ': ' + why + '.');
}
function histUndo(id) {
  if (UI.readOnly) return false;
  histCapture();
  const s = id ? HIST.undo.find(x => x.id === id) : histLast(UI.tab);
  if (!s || s.own) { if (!id) toast('No hay nada que deshacer.'); return false; }
  const b = histBlock(s, true);
  if (b) { toast(histWhy(s, b, true), 6500); return false; }
  HIST_C = new WeakMap();
  try { histApply(s, 'a'); } finally { HIST_C = null; }
  HIST.undo.splice(HIST.undo.indexOf(s), 1);
  s.useq = ++HIST.seq; HIST.redo.push(s);
  histTrim();
  if (!id) toast(trDone(tr('Deshecho:') + ' ' + histName(s) + '.'), 3000, { label: 'Rehacer', fn: () => histRedo(s.id) });
  histPaint();
  return true;
}
function histRedo(id) {
  if (UI.readOnly) return false;
  histCapture();
  const s = id ? HIST.redo.find(x => x.id === id) : histLastRedo(UI.tab);
  if (!s) { if (!id) toast('No hay nada que rehacer.'); return false; }
  // solo si nada de lo que toca cambió desde que se deshizo
  const b = histBlock(s, false);
  if (b) { toast(histWhy(s, b, false), 6500); return false; }
  HIST_C = new WeakMap();
  try { histApply(s, 'b'); } finally { HIST_C = null; }
  HIST.redo.splice(HIST.redo.indexOf(s), 1);
  s.seq = ++HIST.seq; delete s.useq; HIST.undo.push(s);
  histTrim();
  if (!id) toast(trDone(tr('Rehecho:') + ' ' + histName(s) + '.'), 2400);
  histPaint();
  return true;
}
/* cambios que llegan del equipo: no son pasos de uno; los pasos que tocaban lo mismo ya no se pueden deshacer */
function histRemote() {
  if (!P || !HIST.base) return;
  const now = histSnap(P), keys = [...new Set([...Object.keys(HIST.base), ...Object.keys(now)])].filter(k => HIST.base[k] !== now[k]);
  const { ch } = keys.length ? histChanges(HIST.base, now, keys) : { ch: [] };
  HIST.base = now; HIST.ver++;
  if (!ch.length) return;
  for (const e of ch) if (e.m) HIST.pos.set(histPk(e), ++HIST.pn);   // lo que movió el equipo tiene otro lugar
  // lo que tocó el equipo y lo que lo contiene: una ruta de un paso choca si está dentro o contiene a una de estas
  const full = new Set(), pre = new Set();
  for (const e of ch) { const p = e.m ? [...e.p, e.m] : e.p; for (let i = 1; i <= p.length; i++) pre.add(histPs(p.slice(0, i))); full.add(histPs(p)); }
  const hit = e => { const p = e.m ? [...e.p, e.m] : e.p; if (pre.has(histPs(p))) return true; for (let i = 1; i < p.length; i++) if (full.has(histPs(p.slice(0, i)))) return true; return false; };
  const keep = s => !s.ch.some(hit);
  HIST.undo = HIST.undo.filter(keep); HIST.redo = HIST.redo.filter(keep);
  HIST.chars = HIST.undo.reduce((a, s) => a + s.n, 0) + HIST.redo.reduce((a, s) => a + s.n, 0);
  histPaint();
}
/* aviso con «Deshacer»: se llama después del cambio (derive y render ya hechos o por hacer) */
function toastUndo(msg, ms = 6500) {
  setTimeout(() => {
    const st = histCapture() || HIST.undo[HIST.undo.length - 1];
    if (!st || UI.readOnly) { toast(msg, 3000); return; }
    toast(msg, ms, { label: 'Deshacer', fn: () => histUndo(st.id) });
  }, 0);
}

/* ---------- (lote AH) el panel «Historial»: los cambios de la pestaña (o de todas), del más nuevo al más viejo ----------
   Como «Personalización»: una columna a la derecha que corre el área de trabajo (no la tapa); en el teléfono, una hoja
   que sube hasta un poco más de la mitad y deja ver arriba lo que se deshace. Se cierra con la ✕, el reloj o Esc. */
function histPanel() {
  let pn = $('#histPanel');
  if (!pn) {
    pn = document.createElement('aside'); pn.id = 'histPanel'; pn.className = 'np hp';
    pn.setAttribute('aria-label', 'Historial de cambios');
    document.body.appendChild(pn);
    pn.addEventListener('click', histPanelClick);
  }
  if (typeof npClose === 'function') npClose();
  if (typeof lookClose === 'function') lookClose();
  closePop();
  HIST.view = ls.get('histView', 'tab') === 'all' ? 'all' : 'tab';
  pn.classList.add('open'); document.body.classList.add('np-on');
  const b = $('#histBtn'); if (b) b.setAttribute('aria-expanded', 'true');
  clearInterval(HIST.tick); HIST.tick = setInterval(() => histPanelPaint(true), 30000);   // «hace 2 min» al día
  dispatchEvent(new Event('resize'));
  histPanelPaint(true);
}
function histPanelClose() {
  const pn = $('#histPanel'); if (!pn || !pn.classList.contains('open')) return;
  pn.classList.remove('open'); clearInterval(HIST.tick);
  if (!$('#notesPanel.open') && !$('#lookPanel.open')) document.body.classList.remove('np-on');
  const b = $('#histBtn'); if (b) { b.setAttribute('aria-expanded', 'false'); if (pn.contains(document.activeElement) && !b.hidden && b.getClientRects().length) b.focus(); }
  dispatchEvent(new Event('resize'));
}
const histPanelToggle = () => $('#histPanel.open') ? histPanelClose() : histPanel();
function histPanelPaint(force) {
  const pn = $('#histPanel'); if (!pn || !pn.classList.contains('open') || typeof P === 'undefined' || !P) return;
  const all = HIST.view === 'all', tab = UI.tab, ro = UI.readOnly;
  // render() llama a histPaint en cada pintada: el panel se arma de nuevo solo si algo cambió
  const sig = [HIST.ver, HIST.seq, HIST.undo.length, HIST.redo.length, tab, HIST.view, ro, histOwn(tab), P.id].join('|');
  if (!force && sig === HIST.sig) return;
  HIST.sig = sig;
  const list = [...HIST.undo.map(s => [s, true]), ...HIST.redo.map(s => [s, false])].filter(([s]) => !s.own && (all || s.tab === tab)).sort((x, y) => y[0].t - x[0].t || y[0].seq - x[0].seq);
  const focus = pn.contains(document.activeElement) ? document.activeElement.dataset.id || document.activeElement.dataset.hpv || (document.activeElement.dataset.hp === 'close' ? 'close' : '') : '';
  const body = $('.np-body', pn), top = body ? body.scrollTop : 0;
  HIST_C = new WeakMap();
  let items = '';
  try {
    items = list.map(([s, on]) => {
      const b = ro ? null : histBlock(s, on), when = [agoText(s.t), all ? TAB_NAME[s.tab] || '' : '', on ? '' : 'Deshecho'].filter(Boolean).join(' · ');
      return `<li class="hp-it${on ? '' : ' off'}${b ? ' bl' : ''}"><div class="hp-tx"><span class="hp-d" data-no-tr>${esc(histText(s))}</span><small>${esc(when)}</small>${b ? `<small class="hp-why" data-no-tr>${esc(histWhy(s, b, on, true))}</small>` : ''}</div>`
        + (b || ro ? '' : `<button type="button" class="btn sm${on ? '' : ' ghost'}" data-hp="${on ? 'undo' : 'redo'}" data-id="${ea(s.id)}" aria-label="${ea(trDone(tr(on ? 'Deshacer' : 'Rehacer') + ': ' + histText(s)))}">${on ? 'Deshacer' : 'Rehacer'}</button>`) + '</li>';
    }).join('');
  } finally { HIST_C = null; }
  const own = histOwn(tab) ? `<p class="lk-scope ro hp-own"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg><span>${tab === 'animatic' ? 'El animatic tiene su propio deshacer: ↶ ↷ en su barra o Ctrl + Z.' : 'Al escribir, el guion tiene su propio deshacer: ↶ ↷ en su barra o Ctrl + Z.'}</span></p>` : '';
  pn.innerHTML = `<div class="np-head"><b class="lk-title">Historial</b><button type="button" class="nf-ic" data-hp="close" aria-label="Cerrar el historial">${ICO.close}</button></div>
  <div class="np-body hp-body"><div class="lk-tabs" role="tablist" aria-label="Qué cambios ver">${[['tab', TAB_NAME[tab] || 'Esta pestaña'], ['all', 'Todas las pestañas']].map(([k, n]) => `<button type="button" role="tab" data-hpv="${k}" aria-selected="${ea(HIST.view === k)}">${esc(n)}</button>`).join('')}</div>
  ${own}${items ? `<ol class="hp-list">${items}</ol>` : `<p class="np-empty hp-empty">${all ? 'Todavía no hay cambios.' : 'Todavía no hay cambios en esta pestaña.'}</p>`}
  <p class="hint hp-foot">${items ? 'Deshacer uno no toca los que hiciste después. ' : ''}El historial dura mientras el proyecto está abierto.</p></div>`;
  const nb = $('.np-body', pn); if (nb && top) nb.scrollTop = top;   // al deshacer, el panel no vuelve arriba
  if (focus) { const f = focus === 'close' ? $('[data-hp="close"]', pn) : $(`[data-id="${CSS.escape(focus)}"],[data-hpv="${CSS.escape(focus)}"]`, pn); (f || $('[data-hp="close"]', pn)).focus(); }
}
function histPanelClick(e) {
  const b = e.target.closest('[data-hp],[data-hpv]'); if (!b) return;
  if (b.dataset.hp === 'close') { histPanelClose(); return; }
  if (b.dataset.hpv) { HIST.view = b.dataset.hpv; ls.set('histView', HIST.view); histPanelPaint(true); return; }
  if (b.dataset.hp === 'undo') histUndo(b.dataset.id); else if (b.dataset.hp === 'redo') histRedo(b.dataset.id);
}
/* botones de la barra superior: deshacer y rehacer de la pestaña abierta (sin deshacer propio) y el historial */
function histPaint() {
  const u = $('#undoBtn'), r = $('#redoBtn'), h = $('#histBtn'), on = typeof P !== 'undefined' && !!P;
  if (h) h.hidden = !on || UI.readOnly;
  histPanelPaint();
  if (!u || !r) return;
  const own = histOwn(UI.tab), off = !on || UI.readOnly || own;
  u.hidden = r.hidden = off;
  if (off) return;
  const s = histLast(UI.tab), b = s && histBlock(s, true), x = histLastRedo(UI.tab);
  u.disabled = !s || !!b;
  r.disabled = !x;
  u.title = s ? (b ? histWhy(s, b, true) : trDone(tr('Deshacer') + ': ' + histName(s) + ' (Ctrl+Z)')) : 'Deshacer (Ctrl+Z)';
  r.title = x ? trDone(tr('Rehacer') + ': ' + histName(x) + ' (Ctrl+Mayús+Z)') : 'Rehacer (Ctrl+Mayús+Z)';
}
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#histBtn')) histPanelToggle(); });
/* Esc cierra el historial solo si no hay nada encima (un menú, una ventana como la vista previa de los PDF, una pregunta).
   Se escucha antes que el Esc general (ventanas.js), que cierra la ventana sin marcar la tecla: si no, un Esc cerraba las dos */
addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#histPanel.open') && !e.defaultPrevented && !$('#pop') && !$('#modal') && !$('#ask')) { e.preventDefault(); histPanelClose(); }
}, true);
/* Ctrl+Z fuera de los campos de texto, de los editores, de las ventanas (la vista previa de los PDF es una) y de las
   pestañas con deshacer propio */
addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.defaultPrevented) return;
  const k = e.key.toLowerCase();
  if (k !== 'z' && k !== 'y') return;
  if (!P || histOwn(UI.tab) || $('#modal') || $('#ask') || $('.s2') || $('.acc-ed') || $('.fi-modal') || $('.fp-modal')) return;
  const a = document.activeElement;
  if (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;   // el navegador deshace lo escrito
  e.preventDefault();
  if (k === 'y' || e.shiftKey) histRedo(); else histUndo();
});
