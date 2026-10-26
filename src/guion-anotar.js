/* ============================================================
   GUION RAYADO · anotar a mano sobre las páginas
   El lápiz de la barra (junto a Etiquetas y Rayado) abre una barrita flotante: lápiz (fino), marcador (grueso y
   translúcido), flecha (recta o curva: sigue el gesto), cuadro de texto (letra manuscrita, Shantell Sans), borrador y
   deshacer; cinco colores y tres grosores. Se dibuja sobre el texto y en los márgenes.
   · Tableta: el lápiz digital dibuja (con su presión) y la mano no raya; con el lápiz a la vista, el dedo desplaza la
     página. Sin lápiz, el dedo dibuja (dos dedos acercan y desplazan, como siempre).
   · Cada anotación es una nota del equipo (notas.js, tipo «ink»): la ve todo el equipo que ve el guion, al tocarla se
     ve quién la hizo, cada quien borra solo lo suyo y el servidor la guarda con las mismas reglas que las notas
     (server/lib/perm.js · cleanOn). Pueden anotar quienes pueden escribir notas (canWriteNotes). No sale en la lista de
     notas (noteRoots las deja fuera).
   · Va pegada a un renglón del guion: el párrafo y la letra donde empieza el renglón, con su texto para reencontrarlo si
     el guion cambia (guion-margen.js · mnResolve). Los trazos guardan su posición relativa a ese renglón, así se mueven
     si el texto se reacomoda; si el párrafo desaparece, se pegan al más cercano.
   · Se ven solo en el guion rayado (no en Escribir), con la capa «Anotaciones» encendida; «Solo las mías» filtra.
     Salen en el PDF del guion rayado (vectoriales; una casilla las quita al exportar).
   on = { t:'ink', id, sec:'guion', tab:'lined', label, p, o, q, s: [trazo] }
   trazo = { k: 'p' lápiz | 'm' marcador | 'a' flecha | 't' texto, c: 'r'|'b'|'k'|'g'|'o', w: 1|2|3,
             d: [x, y, …] enteros en centésimas de «em» de la página (x desde el borde izquierdo del texto, y desde
             arriba del renglón), z?: presión 0…100 por punto (lápiz digital), tx?: el texto (cuadro de texto) }
     flecha: d = [x0, y0, x1, y1] recta o [x0, y0, x1, y1, cx, cy] curva (cx, cy: control de la curva)
   ============================================================ */
const ANOT_COLORS = [['r', 'Rojo'], ['b', 'Azul'], ['k', 'Negro'], ['g', 'Verde'], ['o', 'Naranja']];
// los mismos colores en el PDF (en pantalla salen del CSS: --an-r…, con su versión para el modo oscuro)
const ANOT_RGB = { r: [214, 48, 38], b: [40, 92, 214], k: [28, 29, 33], g: [30, 140, 82], o: [236, 116, 22] };
const ANOT_TOOLS = [['p', 'Lápiz'], ['m', 'Marcador'], ['a', 'Flecha'], ['t', 'Cuadro de texto'], ['e', 'Borrador']];
// grosor (centésimas de «em»: una línea del guion mide 100): fino, medio, grueso
const ANOT_W = { p: [9, 15, 24], m: [55, 85, 120], a: [10, 16, 26], t: [95, 120, 150] };
const ANOT_MAX_STROKES = 80, ANOT_MAX_PTS = 1200;
const ANOT = { on: false, tool: 'p', c: 'r', w: 1, undo: [], draw: null, pan: null, pen: false, last: null, items: new Map(), sig: '', ta: null };
{ const m = ls.get('ink', null); if (m && typeof m === 'object') { if (ANOT_TOOLS.some(t => t[0] === m.tool)) ANOT.tool = m.tool; if (Object.hasOwn(ANOT_RGB, m.c)) ANOT.c = m.c; if ([1, 2, 3].includes(m.w)) ANOT.w = m.w; } }
if (UI.mode && UI.mode.ink == null) UI.mode.ink = true;   // la capa «Anotaciones», encendida al abrir
const anoSaveTool = () => ls.set('ink', { tool: ANOT.tool, c: ANOT.c, w: ANOT.w });
const anoOn = () => UI.tab === 'lined' && typeof edFormat === 'function' && edFormat() !== 'av' && !!P;
const anoShown = () => anoOn() && UI.mode.ink !== false;
const anoCan = () => anoOn() && !UI.readOnly && typeof canWriteNotes === 'function' && canWriteNotes();
const anoMineOnly = () => !!ls.get('anoMine', false);
const anoMine = n => typeof noteMine === 'function' && (noteMine(n) || !SHARE);
const anoAll = () => typeof NOTES === 'function' ? Object.values(NOTES()).filter(n => n && !n.re && n.on && n.on.t === 'ink' && Array.isArray(n.on.s) && (typeof noteCanRead !== 'function' || noteCanRead(n))) : [];

/* ---------- datos: limpieza al abrir un proyecto (lo mismo que hace el servidor) ---------- */
function anoCleanOn(on) {
  if (!on || !Array.isArray(on.s)) return false;
  const out = [];
  for (const st of on.s.slice(0, ANOT_MAX_STROKES)) {
    if (!st || typeof st !== 'object' || !['p', 'm', 'a', 't'].includes(st.k) || !Array.isArray(st.d)) continue;
    const d = st.d.slice(0, ANOT_MAX_PTS * 2).map(v => Math.round(+v));
    if (!d.length || d.length % 2 || d.some(v => !isFinite(v) || Math.abs(v) > 1e5)) continue;
    if ((st.k === 't' && d.length !== 2) || (st.k === 'a' && d.length !== 4 && d.length !== 6)) continue;
    const o = { k: st.k, c: Object.hasOwn(ANOT_RGB, st.c) ? st.c : 'r', w: [1, 2, 3].includes(st.w) ? st.w : 1, d };
    if (st.k === 'p' && Array.isArray(st.z) && st.z.length === d.length / 2) o.z = st.z.map(v => Math.min(100, Math.max(0, Math.round(+v) || 0)));
    if (st.k === 't') { const tx = String(st.tx == null ? '' : st.tx).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, 500); if (!tx.trim()) continue; o.tx = tx; }
    out.push(o);
  }
  if (!out.length) return false;
  on.s = out;
  for (const k of ['p', 'o']) on[k] = Math.max(0, Math.round(+on[k]) || 0);
  if (typeof on.q !== 'string') on.q = ''; else on.q = on.q.slice(0, 80);
  return true;
}

/* ---------- dónde va cada anotación ---------- */
/* el renglón de su ancla en el guion de ahora: { pg, li } */
function anoLine(on) {
  if (!D || !D.pos || !P.paras.length || typeof mnResolve !== 'function') return null;
  const r = mnResolve(on); if (!r) return null;
  const pos = D.pos[r.p]; if (!pos) return null;
  let best = null;
  for (let pg = pos.pg0; pg <= pos.pg1; pg++) (D.pages[pg] || []).forEach((ln, li) => { if (ln.blank || ln.p !== r.p) return; if (!best || ln.o <= r.o) best = { pg, li }; });
  return best;
}
/* las anotaciones de cada página, para dibujar (all: también con la capa apagada o desde otra pestaña, para el PDF) */
function anoItems(all) {
  const by = new Map();
  if (!all && !anoShown()) return by;
  const only = anoMineOnly();
  for (const n of anoAll()) {
    if (only && !anoMine(n)) continue;
    const L = anoLine(n.on); if (!L) continue;
    if (!by.has(L.pg)) by.set(L.pg, []);
    by.get(L.pg).push({ n, li: L.li, y0: (6 + L.li) * 100 });
  }
  return by;
}
const anoSigOf = () => { try { return JSON.stringify([anoShown(), anoMineOnly(), anoAll().map(n => [n.id, n.on.p, n.on.o, n.on.s.length, n.on.s.map(s => s.d.length)])]); } catch (e) { return ''; } };
/* «Guion rayado · escena 12 · pág. 4» (para la actividad y la nota) */
function anoLabel(on) {
  try {
    const r = mnResolve(on), i = r && D.sc.sceneOf ? D.sc.sceneOf[r.p] : -1, s = i >= 0 ? D.sc.scenes[i] : null, L = anoLine(on);
    return 'Guion rayado' + (s ? ' · escena ' + s.key : '') + (L ? ' · pág. ' + pageLabel(D.pages, L.pg) : '');
  } catch (e) { return 'Guion rayado'; }
}

/* ---------- geometría ---------- */
const anoPts = d => { const o = []; for (let i = 0; i + 1 < d.length; i += 2) o.push([d[i], d[i + 1]]); return o; };
const anoF1 = v => Math.round(v * 10) / 10;
/* trazo suave: curvas entre los puntos medios */
function anoSmooth(pts) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}l.1 0`;
  if (pts.length === 2) return `M${pts[0][0]} ${pts[0][1]}L${pts[1][0]} ${pts[1][1]}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; d += `Q${a[0]} ${a[1]} ${anoF1((a[0] + b[0]) / 2)} ${anoF1((a[1] + b[1]) / 2)}`; }
  const z = pts[pts.length - 1]; return d + `L${z[0]} ${z[1]}`;
}
/* lápiz digital: el contorno del trazo, más ancho donde se apretó más (con puntas redondas) */
function anoOutline(pts, z, w) {
  const n = pts.length;
  const pr = i => { let s = 0, c = 0; for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) { s += z[k]; c++; } return s / c / 100; };
  const ww = pts.map((_, i) => w * (.3 + 1.05 * pr(i)) / 2);
  if (n === 1) { const [x, y] = pts[0], r = Math.max(2, ww[0]); return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`; }
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    L.push([pts[i][0] - dy * ww[i], pts[i][1] + dx * ww[i]]); R.push([pts[i][0] + dy * ww[i], pts[i][1] - dx * ww[i]]);
  }
  const cap = (c, r, from, to) => { const o = []; for (let k = 1; k < 6; k++) { const t = from + (to - from) * k / 6; o.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]); } return o; };
  const ang = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]);
  const a0 = ang(pts[1], pts[0]), a1 = ang(pts[n - 2], pts[n - 1]);
  const ring = [...L, ...cap(pts[n - 1], ww[n - 1], a1 + Math.PI / 2, a1 - Math.PI / 2), ...R.reverse(), ...cap(pts[0], ww[0], a0 + Math.PI / 2, a0 - Math.PI / 2)];
  return 'M' + ring.map(p => anoF1(p[0]) + ' ' + anoF1(p[1])).join('L') + 'Z';
}
/* flecha: el cuerpo (puntos de la curva, sin la punta) y la punta (triángulo que sigue la curva) */
function anoArrow(d, w) {
  const p0 = [d[0], d[1]], p1 = [d[2], d[3]], c = d.length >= 6 ? [d[4], d[5]] : null;
  const at = t => c ? [(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]] : [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
  const N = c ? 28 : 2, body = []; for (let i = 0; i <= N; i++) body.push(at(i / N));
  const tot = body.reduce((a, p, i) => i ? a + Math.hypot(p[0] - body[i - 1][0], p[1] - body[i - 1][1]) : 0, 0);
  const hl = Math.min(tot * .6, Math.max(42, w * 4.2)), hw = hl * .46;
  // la punta mira en la dirección del final de la curva
  const e = body[body.length - 1], q = c ? at(.92) : p0;
  let dx = e[0] - q[0], dy = e[1] - q[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  const base = [e[0] - dx * hl, e[1] - dy * hl];
  // el cuerpo termina dentro de la punta (con la punta redonda del trazo no se asoma)
  let acc = 0; const cut = tot - hl * .55, out = [body[0]];
  for (let i = 1; i < body.length; i++) { const s = Math.hypot(body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1]); if (acc + s >= cut) { const k = (cut - acc) / (s || 1); out.push([body[i - 1][0] + (body[i][0] - body[i - 1][0]) * k, body[i - 1][1] + (body[i][1] - body[i - 1][1]) * k]); break; } acc += s; out.push(body[i]); }
  const head = [e, [base[0] - dy * hw, base[1] + dx * hw], [base[0] + dy * hw, base[1] - dx * hw]];
  return { body: tot > 1 ? out : [body[0]], head };
}
/* el cuadro de texto: renglones y su tamaño aproximado (para tocarlo y borrarlo) */
function anoTextBox(st) {
  const fs = ANOT_W.t[st.w - 1] || 120, lines = String(st.tx || '').split('\n');
  return { x: st.d[0], y: st.d[1], w: Math.max(...lines.map(l => l.length), 1) * fs * .58, h: lines.length * fs * 1.22, fs, lines };
}

/* ---------- en pantalla ---------- */
function anoStrokeSVG(st, k) {
  const w = (ANOT_W[st.k] || ANOT_W.p)[st.w - 1] || 15, cl = `ik-c${st.c}`;
  if (st.k === 't') {
    const b = anoTextBox(st);
    return `<text class="ik-t ${cl}" data-k="${k}" x="${b.x}" y="${b.y}" font-size="${b.fs}">${b.lines.map((l, i) => `<tspan x="${b.x}" dy="${i ? b.fs * 1.22 : b.fs * .92}">${esc(l) || ' '}</tspan>`).join('')}</text>`;
  }
  if (st.k === 'a') { const A = anoArrow(st.d, w); return `<g class="ik-a ${cl}" data-k="${k}"><path class="ik-s" stroke-width="${w}" d="${anoSmooth(A.body.map(p => [anoF1(p[0]), anoF1(p[1])]))}"/><path class="ik-f" d="M${A.head.map(p => anoF1(p[0]) + ' ' + anoF1(p[1])).join('L')}Z"/></g>`; }
  const pts = anoPts(st.d);
  if (st.k === 'p' && st.z) return `<path class="ik-f ik-p ${cl}" data-k="${k}" d="${anoOutline(pts, st.z, w)}"/>`;
  return `<path class="ik-s ${st.k === 'm' ? 'ik-m' : 'ik-p'} ${cl}" data-k="${k}" stroke-width="${w}" d="${anoSmooth(pts)}"/>`;
}
const anoGroupSVG = it => `<g class="ink-g${ea(anoMine(it.n) ? ' mine' : '')}" data-nid="${ea(it.n.id)}" transform="translate(0 ${it.y0})">${it.n.on.s.map(anoStrokeSVG).join('')}</g>`;
/* la capa de anotaciones de una página (pagesHTML · tab-script.js) */
function anoPageHTML(pi) {
  if (!anoShown()) return '';
  const list = ANOT.items.get(pi) || [];
  return `<svg class="ink-svg" data-pg="${ea(pi)}" viewBox="0 0 10000 10000" aria-hidden="true" data-no-tr>${list.map(anoGroupSVG).join('')}</svg>`;
}
/* antes de dibujar las páginas */
function anoPrep() {
  ANOT.items = anoItems(); ANOT.sig = anoOn() ? anoSigOf() : '';
  // la letra manuscrita de los cuadros de texto (en la web se baja la primera vez; leyenda.js · fontLoad)
  if (typeof fontLoad === 'function' && [...ANOT.items.values()].some(L => L.some(it => it.n.on.s.some(s => s.k === 't')))) fontLoad('informal');
}
/* solo la capa de anotaciones (sin rehacer las páginas) */
function anoRepaint() {
  anoPrep();
  for (const pgEl of $$('#pages .page[data-pg]')) {
    const old = $('.ink-svg', pgEl), html = anoPageHTML(+pgEl.dataset.pg);
    if (old) old.outerHTML = html || ''; else if (html) pgEl.insertAdjacentHTML('beforeend', html);
  }
  anoChipPaint();
}
/* lo que llegó del equipo o de un deshacer: se pone al día (guion-margen.js · mnSync) */
const anoSync = () => { if (anoOn() && anoSigOf() !== ANOT.sig) anoRepaint(); };

/* ---------- cambios (pasan por el deshacer y se guardan con las notas) ---------- */
function anoPut(changes, label, undoable = true) {
  if (typeof histNote === 'function') histNote(label);
  const before = {};
  P.notes = { ...NOTES() };
  for (const [id, n] of Object.entries(changes)) { before[id] = P.notes[id] ? JSON.parse(JSON.stringify(P.notes[id])) : null; if (n) P.notes[id] = n; else delete P.notes[id]; }
  if (undoable) { ANOT.undo.push(before); if (ANOT.undo.length > 60) ANOT.undo.shift(); }
  changed('data');
  anoRepaint(); anoBarPaint();
}
function anoUndo() {
  const b = ANOT.undo.pop(); if (!b) { toast('No hay nada que deshacer.'); return; }
  ANOT.last = null;
  anoPut(b, 'Deshacer una anotación', false);
}
/* un trazo nuevo: se suma a la anotación de recién (la misma persona, en la misma página, hace pocos segundos) o
   empieza una nueva, pegada al renglón donde empezó el trazo */
function anoAdd(pg, st) {
  const lines = D.pages[pg] || [];
  const y = st.d[1] / 100 - 6;
  let li = Math.max(0, Math.min(lines.length - 1, Math.floor(y)));
  // el renglón con texto más cercano
  for (let k = 0; k < lines.length; k++) { const a = li - k, b = li + k; if (lines[a] && !lines[a].blank && lines[a].p != null) { li = a; break; } if (lines[b] && !lines[b].blank && lines[b].p != null) { li = b; break; } }
  const ln = lines[li]; if (!ln || ln.blank || ln.p == null) { toast('Anota sobre una página con texto.'); return; }
  const now = Date.now(), L = ANOT.last, prev = L && NOTES()[L.nid];
  if (prev && st.k !== 't' && L.pg === pg && now - L.t < 6000 && anoMine(prev) && prev.on.s.length < ANOT_MAX_STROKES) {
    const pl = anoLine(prev.on);
    if (pl && pl.pg === pg) {
      const dy = (6 + pl.li) * 100, s2 = { ...st, d: st.d.map((v, i) => i % 2 ? v - dy : v) };
      ANOT.last = { ...L, t: now };
      anoPut({ [prev.id]: { ...prev, on: { ...prev.on, s: [...prev.on.s, s2] } } }, 'Anotar a mano');
      return;
    }
  }
  const me = noteMe(), id = uid('n'), dy = (6 + li) * 100;
  const on = { t: 'ink', id: uid('ik'), sec: 'guion', tab: 'lined', label: '', p: ln.p, o: ln.o, q: P.paras[ln.p].x.slice(ln.o, ln.o + 30), s: [{ ...st, d: st.d.map((v, i) => i % 2 ? v - dy : v) }] };
  on.label = anoLabel(on);
  const n = { id, on, by: me.id, name: me.name, ts: now, text: st.k === 't' ? String(st.tx).slice(0, 400) : 'Anotación a mano' };
  ANOT.last = st.k === 't' ? null : { nid: id, pg, t: now };
  anoPut({ [id]: n }, st.k === 't' ? 'Cuadro de texto' : 'Anotar a mano');
}

/* ---------- tocar: qué trazo hay en un punto ---------- */
function anoSegDist(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
function anoHitStroke(st, p, tol) {
  const w = (ANOT_W[st.k] || ANOT_W.p)[st.w - 1] || 15;
  if (st.k === 't') { const b = anoTextBox(st); return p[0] >= b.x - tol && p[0] <= b.x + b.w + tol && p[1] >= b.y - tol && p[1] <= b.y + b.h + tol; }
  const pts = st.k === 'a' ? (A => [...A.body, A.head[0]])(anoArrow(st.d, w)) : anoPts(st.d);
  const r = w / 2 + tol;
  if (pts.length === 1) return Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]) <= r;
  for (let i = 1; i < pts.length; i++) if (anoSegDist(p, pts[i - 1], pts[i]) <= r) return true;
  return false;
}
/* lo que hay bajo un punto de una página (en unidades de su capa): [{ n, k }] de arriba abajo */
function anoHits(pg, p, tol, mineOnly) {
  const out = [];
  for (const it of [...(ANOT.items.get(pg) || [])].reverse()) {
    if (mineOnly && !anoMine(it.n)) continue;
    const q = [p[0], p[1] - it.y0];
    it.n.on.s.forEach((st, k) => { if (anoHitStroke(st, q, tol)) out.push({ n: it.n, k }); });
  }
  return out;
}
/* del puntero a la capa de anotaciones de su página: unidades de 1/100 de «em» */
function anoAt(e) {
  const pgEl = e.target && e.target.closest ? e.target.closest('#pages .page[data-pg]') : null;
  const el = pgEl || (document.elementsFromPoint(e.clientX, e.clientY).find(x => x.matches && x.matches('#pages .page[data-pg]')) || null);
  if (!el) return null;
  let svg = $('.ink-svg', el);
  if (!svg) { el.insertAdjacentHTML('beforeend', `<svg class="ink-svg" data-pg="${ea(el.dataset.pg)}" viewBox="0 0 10000 10000" aria-hidden="true" data-no-tr></svg>`); svg = $('.ink-svg', el); }
  const r = svg.getBoundingClientRect(), k = 10000 / (r.width || 1);
  return { pg: +el.dataset.pg, el, svg, x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, k };
}

/* ---------- dibujar ---------- */
function anoStart() {
  if (!anoCan()) return;
  ANOT.on = true;
  if (UI.mode.ink === false) { UI.mode.ink = true; const t = $('[data-act="mode"][data-m="ink"]'); if (t) t.setAttribute('aria-pressed', 'true'); }
  if (typeof MK !== 'undefined' && MK.cat) mkSet(null, true);   // el marcador del desglose se apaga
  if (typeof hideSelTool === 'function') hideSelTool();
  const s = getSelection(); if (s) s.removeAllRanges();
  anoRepaint(); anoPagesMode(); anoBarShow(); anoBtnPaint();
}
function anoStop() {
  ANOT.on = false; ANOT.draw = null; ANOT.pan = null; ANOT.last = null;
  anoTextClose(true);
  const b = $('#anoBar'); if (b) b.remove();
  anoPagesMode(); anoBtnPaint();
}
function anoPagesMode() {
  const pages = $('#pages'); if (!pages) return;
  pages.classList.toggle('ink-on', ANOT.on);
  pages.dataset.ink = ANOT.on ? ANOT.tool : '';
}
function anoBtnPaint() { const b = $('#view .ink-btn'); if (b) b.setAttribute('aria-pressed', ANOT.on ? 'true' : 'false'); }
const anoStrokeW = () => (ANOT_W[ANOT.tool] || ANOT_W.p)[ANOT.w - 1];
function anoDown(e) {
  if (!ANOT.on || !anoOn()) return;
  if (e.target.closest && e.target.closest('#anoBar, .ink-ta, .mn, .mn-dot, .mn-tip')) return;
  const touch = e.pointerType === 'touch', pen = e.pointerType === 'pen';
  if (pen) { ANOT.pen = true; ANOT.pan = null; }   // el lápiz manda: la mano que desplazaba se suelta
  // segundo dedo: el trazo de recién se cancela y los dos dedos acercan o desplazan (tab-script.js · bindPinch)
  if (touch && (ANOT.draw || ANOT.pan) && e.isPrimary === false) { anoCancel(); return; }
  if (touch && ANOT.draw && ANOT.draw.pen) return;   // la mano apoyada mientras dibuja el lápiz: no raya
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (anoTextOpen()) { anoTextClose(); e.preventDefault(); return; }
  // con el lápiz a la vista, el dedo desplaza la página
  if (touch && ANOT.pen) { const sc = $('#scroller'); if (sc) { ANOT.pan = { id: e.pointerId, y: e.clientY, x: e.clientX, top: sc.scrollTop, left: sc.scrollLeft }; } return; }
  const a = anoAt(e); if (!a) return;
  e.preventDefault(); e.stopPropagation();
  try { e.target.setPointerCapture && $('#pages').setPointerCapture(e.pointerId); } catch (er) { }
  if (ANOT.tool === 't') { ANOT.draw = { id: e.pointerId, tool: 't', a, x0: e.clientX, y0: e.clientY }; return; }
  if (ANOT.tool === 'e') { ANOT.draw = { id: e.pointerId, tool: 'e', pg: a.pg, a, hit: new Map() }; anoErase(a); return; }
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  g.setAttribute('class', `ik-live ${ANOT.tool === 'm' ? 'ik-s ik-m' : ANOT.tool === 'p' && pen ? 'ik-f ik-p' : 'ik-s ik-p'} ik-c${ANOT.c}`);
  if (!(ANOT.tool === 'p' && pen)) g.setAttribute('stroke-width', anoStrokeW());
  a.svg.appendChild(g);
  ANOT.draw = { id: e.pointerId, tool: ANOT.tool, pg: a.pg, a, pts: [[Math.round(a.x), Math.round(a.y)]], z: [Math.round((e.pressure || .5) * 100)], pen, touch, live: g, raf: 0 };
  anoLive();
}
function anoMove(e) {
  if (ANOT.pan && e.pointerId === ANOT.pan.id) { const sc = $('#scroller'); if (sc) { sc.scrollTop = ANOT.pan.top - (e.clientY - ANOT.pan.y); sc.scrollLeft = ANOT.pan.left - (e.clientX - ANOT.pan.x); } e.preventDefault(); return; }
  const D0 = ANOT.draw; if (!D0 || e.pointerId !== D0.id) return;
  e.preventDefault();
  if (D0.tool === 't') return;
  const r = D0.a.svg.getBoundingClientRect(), k = 10000 / (r.width || 1);
  if (D0.tool === 'e') { anoErase({ ...D0.a, x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }); return; }
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of evs.length ? evs : [e]) {
    const x = Math.round((ev.clientX - r.left) * k), y = Math.round((ev.clientY - r.top) * k), l = D0.pts[D0.pts.length - 1];
    if (Math.hypot(x - l[0], y - l[1]) < 5 * k / 10) continue;   // menos de medio píxel: no hace falta
    if (D0.pts.length >= ANOT_MAX_PTS) break;
    D0.pts.push([x, y]); D0.z.push(Math.round((ev.pressure || .5) * 100));
  }
  if (!D0.raf) D0.raf = requestAnimationFrame(anoLive);
}
/* el trazo mientras se dibuja */
function anoLive() {
  const D0 = ANOT.draw; if (!D0 || !D0.live) return;
  D0.raf = 0;
  const w = anoStrokeW();
  if (D0.tool === 'a') { const st = anoArrowFrom(D0.pts), A = anoArrow(st.d, w); D0.live.setAttribute('d', anoSmooth(A.body.map(p => [anoF1(p[0]), anoF1(p[1])])) + `M${A.head.map(p => anoF1(p[0]) + ' ' + anoF1(p[1])).join('L')}Z`); return; }
  D0.live.setAttribute('d', D0.tool === 'p' && D0.pen ? anoOutline(D0.pts, D0.z, w) : anoSmooth(D0.pts));
}
function anoUp(e) {
  if (ANOT.pan && e.pointerId === ANOT.pan.id) { ANOT.pan = null; return; }
  const D0 = ANOT.draw; if (!D0 || e.pointerId !== D0.id) return;
  ANOT.draw = null;
  if (D0.raf) cancelAnimationFrame(D0.raf);
  if (D0.live) D0.live.remove();
  if (e.type === 'pointercancel') return;
  if (D0.tool === 't') { if (Math.hypot(e.clientX - D0.x0, e.clientY - D0.y0) < 12) anoTextAt(D0.a, e.clientX, e.clientY); return; }
  if (D0.tool === 'e') { anoEraseEnd(D0); return; }
  let st;
  if (D0.tool === 'a') { st = anoArrowFrom(D0.pts); if (Math.hypot(st.d[2] - st.d[0], st.d[3] - st.d[1]) < 40) { toast('Arrastra para dibujar la flecha.', 2200); return; } }
  else {
    const keep = anoSimplify(D0.pts, D0.tool === 'm' ? 6 : 3);
    st = { k: D0.tool, c: ANOT.c, w: ANOT.w, d: keep.flatMap(i => D0.pts[i]) };
    if (D0.tool === 'p' && D0.pen) st.z = keep.map(i => D0.z[i]);
  }
  anoAdd(D0.pg, st);
}
function anoCancel() { const D0 = ANOT.draw; if (D0 && D0.live) D0.live.remove(); ANOT.draw = null; ANOT.pan = null; }
/* la flecha sigue el gesto: recta si se dibujó casi derecha; si no, una curva que pasa por la mitad del gesto */
function anoArrowFrom(pts) {
  const a = pts[0], b = pts[pts.length - 1];
  const st = { k: 'a', c: ANOT.c, w: ANOT.w, d: [a[0], a[1], b[0], b[1]] };
  if (pts.length < 3) return st;
  let tot = 0; const L = [0]; for (let i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(tot); }
  let i = L.findIndex(v => v >= tot / 2); if (i < 0) i = pts.length - 1;
  const m = pts[i], chord = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const dev = anoSegDist(m, a, b);
  if (dev > Math.max(35, chord * .1)) st.d.push(Math.round(2 * m[0] - (a[0] + b[0]) / 2), Math.round(2 * m[1] - (a[1] + b[1]) / 2));
  return st;
}
/* menos puntos con la misma forma (Ramer–Douglas–Peucker): devuelve los índices que quedan */
function anoSimplify(pts, tol) {
  if (pts.length < 3) return pts.map((_, i) => i);
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let mx = 0, at = -1;
    for (let i = a + 1; i < b; i++) { const d = anoSegDist(pts[i], pts[a], pts[b]); if (d > mx) { mx = d; at = i; } }
    if (mx > tol && at > 0) { keep[at] = 1; st.push([a, at], [at, b]); }
  }
  const out = []; keep.forEach((v, i) => { if (v) out.push(i); });
  return out;
}

/* ---------- borrador: solo lo propio ---------- */
function anoErase(a) {
  const D0 = ANOT.draw; if (!D0) return;
  const mine = anoHits(a.pg, [a.x, a.y], 22, true);
  // lo de otra persona no se borra: se avisa una vez
  if (!mine.length && !D0.warned && anoHits(a.pg, [a.x, a.y], 22, false).length) { D0.warned = true; toast('Solo puedes borrar tus anotaciones.', 2600); }
  for (const h of mine) {
    const set = D0.hit.get(h.n.id) || new Set(); set.add(h.k); D0.hit.set(h.n.id, set);
    const el = $(`.ink-g[data-nid="${CSS.escape(h.n.id)}"] [data-k="${h.k}"]`, a.svg); if (el) el.classList.add('ik-gone');
  }
}
function anoEraseEnd(D0) {
  if (!D0.hit.size) return;
  const ch = {};
  for (const [id, ks] of D0.hit) {
    const n = NOTES()[id]; if (!n || !anoMine(n)) continue;
    const s = n.on.s.filter((_, k) => !ks.has(k));
    ch[id] = s.length ? { ...n, on: { ...n.on, s } } : null;
  }
  ANOT.last = null;
  if (Object.keys(ch).length) anoPut(ch, 'Borrar una anotación');
}

/* ---------- cuadro de texto ---------- */
const anoTextOpen = () => !!(ANOT.ta && ANOT.ta.isConnected);
function anoTextAt(a, cx, cy) {
  anoTextClose();
  if (typeof fontLoad === 'function') fontLoad('informal');
  const fs = ANOT_W.t[ANOT.w - 1] / 100, pgFs = parseFloat(getComputedStyle(a.el).fontSize) || 13;
  const ta = document.createElement('textarea');
  ta.className = `ink-ta ik-c${ANOT.c}`; ta.rows = 1; ta.setAttribute('aria-label', 'Texto de la anotación');
  ta.placeholder = 'Escribe…';
  ta.style.fontSize = (fs * pgFs).toFixed(1) + 'px';
  const r = a.el.getBoundingClientRect();
  ta.style.left = (cx - r.left - 2) + 'px'; ta.style.top = (cy - r.top - fs * pgFs * .55) + 'px';
  a.el.appendChild(ta);
  ANOT.ta = ta; ta._a = { pg: a.pg, x: Math.round(a.x), y: Math.round(a.y - fs * 100 * .55), c: ANOT.c, w: ANOT.w };
  const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; ta.style.width = 'auto'; ta.style.width = Math.max(60, Math.min(r.width * .7, ta.scrollWidth + 6)) + 'px'; };
  ta.addEventListener('input', fit);
  ta.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); anoTextClose(true); } else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); anoTextClose(); } });
  ta.addEventListener('blur', () => setTimeout(() => { if (ANOT.ta === ta) anoTextClose(); }, 120));
  setTimeout(() => { ta.focus(); fit(); }, 0);
}
function anoTextClose(cancel) {
  const ta = ANOT.ta; if (!ta) return;
  ANOT.ta = null;
  const tx = ta.value.replace(/\s+$/, ''), A = ta._a;
  ta.remove();
  if (cancel || !tx.trim() || !A) return;
  anoAdd(A.pg, { k: 't', c: A.c, w: A.w, d: [A.x, A.y], tx: tx.slice(0, 500) });
}

/* ---------- la barrita flotante ---------- */
const ANOT_IC = {
  p: '<path d="M4.5 19.5l1-4.2L15.8 5a1.9 1.9 0 0 1 2.7 0l.5.5a1.9 1.9 0 0 1 0 2.7L8.7 18.5z"/><path d="M13.8 7l3.2 3.2"/>',
  m: '<path d="M14.8 3.8l5.4 5.4-8.7 8.7H7.3l-1.5-1.5v-4.2z"/><path d="M4 21h8.5" stroke-width="3.2" opacity=".55"/>',
  a: '<path d="M5 18.5C8 9.5 12.5 7 19 6.5"/><path d="M14.6 3.6 19.4 6.4l-3.2 4.4"/>',
  t: '<path d="M6 6.5h12M12 6.5V19M9.5 19h5"/>',
  e: '<path d="M9.6 19.5 4.4 14.3a1.6 1.6 0 0 1 0-2.3l7.5-7.5a1.6 1.6 0 0 1 2.3 0l5.3 5.3a1.6 1.6 0 0 1 0 2.3l-7.4 7.4z"/><path d="M9.6 19.5H20M7.5 9.2l7.4 7.4"/>',
  undo: '<path d="M9 14 4.5 9.5 9 5"/><path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3"/>',
  pen: '<path d="M4 20l1.2-4.6L15.6 5a2 2 0 012.8 0l.6.6a2 2 0 010 2.8L8.6 18.8z"/><path d="M13.6 7l3.4 3.4"/><path d="M14 20.5c1.6-1.4 3.2-1.4 4.8 0" />',
};
const anoIco = k => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ANOT_IC[k]}</svg>`;
/* la capa «Anotaciones» junto a Etiquetas y Rayado: solo si hay alguna (si no, no hay nada que mostrar u ocultar) */
function anoChipHTML() {
  if (!anoOn() || !anoAll().length) return '';
  return `<button type="button" data-act="mode" data-m="ink" aria-pressed="${ea(UI.mode.ink !== false)}" title="Las anotaciones a mano del equipo">${ICO.ok}Anotaciones</button>`;
}
function anoChipPaint() {
  const box = $('#view .hd-togs'); if (!box) return;
  const b = $('[data-m="ink"]', box), html = anoChipHTML();
  if (html && !b) box.insertAdjacentHTML('beforeend', html); else if (!html && b) b.remove();
}
/* en Ajustes del guion rayado (con equipo): ver solo las anotaciones propias */
function anoSettingsHTML() {
  if (!anoOn() || typeof SHARE === 'undefined' || !SHARE || !anoAll().length) return '';
  return `<div class="fld"><span>Anotaciones a mano</span><div class="menu"><button data-act="ano-mine">${anoMineOnly() ? '✓ ' : ''}Ver solo las mías</button></div></div>`;
}
/* el botón de lápiz de la barra del guion rayado (tab-script.js) */
function anoBtnHTML() {
  if (!anoCan()) return '';
  return `<button class="btn ghost icon ink-btn" type="button" data-act="ink" aria-pressed="${ea(ANOT.on)}" title="Anotar a mano: lápiz, marcador, flechas y texto sobre el guion" aria-label="Anotar a mano">${anoIco('pen')}</button>`;
}
function anoBarHTML() {
  const team = typeof SHARE !== 'undefined' && !!SHARE;
  return `<div class="ink-grp ink-tools" role="radiogroup" aria-label="Herramienta">${ANOT_TOOLS.map(([k, n]) => `<button type="button" role="radio" data-ano-t="${k}" aria-checked="${ea(ANOT.tool === k)}" title="${esc(n)}" aria-label="${esc(n)}">${anoIco(k)}</button>`).join('')}</div>
    <span class="ink-sep"></span><div class="ink-grp ink-cols" role="radiogroup" aria-label="Color">${ANOT_COLORS.map(([k, n]) => `<button type="button" role="radio" class="ink-col ik-c${k}" data-ano-c="${k}" aria-checked="${ea(ANOT.c === k)}" title="${esc(n)}" aria-label="${esc(n)}"><i></i></button>`).join('')}</div>
    <span class="ink-sep"></span><div class="ink-grp ink-wds" role="radiogroup" aria-label="Grosor">${[['1', 'Fino'], ['2', 'Medio'], ['3', 'Grueso']].map(([k, n]) => `<button type="button" role="radio" class="ink-wd" data-ano-w="${k}" aria-checked="${ea(String(ANOT.w) === k)}" title="${esc(n)}" aria-label="${esc(n)}"><i style="--d:${3 + (+k - 1) * 3}px"></i></button>`).join('')}</div>
    <span class="ink-sep"></span><button type="button" data-ink="undo" title="Deshacer" aria-label="Deshacer" ${ANOT.undo.length ? '' : 'disabled'}>${anoIco('undo')}</button>
    ${team ? `<button type="button" class="ink-mine" data-ink="mine" aria-pressed="${ea(anoMineOnly())}" title="Ver solo mis anotaciones">Solo las mías</button>` : ''}
    <button type="button" data-ink="close" title="Terminar de anotar (Esc)" aria-label="Terminar de anotar">${ICO.close}</button><span class="ink-br"></span>`;
}
function anoBarShow() {
  let b = $('#anoBar');
  if (!b) {
    b = document.createElement('div'); b.id = 'anoBar'; b.className = 'ink-bar'; b.setAttribute('role', 'toolbar'); b.setAttribute('aria-label', 'Anotar a mano');
    b.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });   // el texto que se escribe no pierde el foco
    b.addEventListener('click', e => {
      const x = e.target.closest('button'); if (!x || x.disabled) return;
      if (x.dataset.anoT) { ANOT.tool = x.dataset.anoT; anoTextClose(); }
      if (x.dataset.anoC) { ANOT.c = x.dataset.anoC; if (ANOT.ta) { ANOT.ta._a.c = ANOT.c; ANOT.ta.className = `ink-ta ik-c${ANOT.c}`; } }
      if (x.dataset.anoW) ANOT.w = +x.dataset.anoW;
      if (x.dataset.ink === 'undo') { anoUndo(); return; }
      if (x.dataset.ink === 'close') { anoStop(); return; }
      if (x.dataset.ink === 'mine') { ls.set('anoMine', !anoMineOnly()); anoRepaint(); }
      anoSaveTool(); anoPagesMode(); anoBarPaint();
    });
    ($('#view') || document.body).appendChild(b);   // dentro de la vista: si se cambia de pestaña, se va con ella
  }
  anoBarPaint(); anoBarPlace();
}
function anoBarPaint() { const b = $('#anoBar'); if (b) b.innerHTML = anoBarHTML(); }
/* abajo, al centro de la hoja (transparente: no tapa el guion) */
function anoBarPlace() {
  const b = $('#anoBar'), sc = $('#scroller'); if (!b) return;
  if (!sc) { anoStop(); return; }
  const r = sc.getBoundingClientRect();
  b.style.left = (r.left + r.width / 2) + 'px';
  b.style.bottom = Math.max(10, innerHeight - r.bottom + 14) + 'px';
}
addEventListener('resize', () => { if (ANOT.on) anoBarPlace(); });
// Esc termina; Ctrl+Z deshace la última anotación (antes que el deshacer general: historial.js)
addEventListener('keydown', e => {
  if (!ANOT.on || $('#pop') || $('#modal') || anoTextOpen()) return;
  if (e.key === 'Escape') { e.preventDefault(); anoStop(); }
  else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.stopPropagation(); anoUndo(); }
}, true);

/* ---------- quién la hizo: tocar una anotación (sin estar dibujando) ---------- */
function anoWho(e) {
  if (ANOT.on || !anoShown() || !(ANOT.items && ANOT.items.size)) return false;
  if (e.target.closest && e.target.closest('.tg, .mn, .mn-dot, .cvl, .scn, #seltool')) return false;
  const s = getSelection(); if (s && !s.isCollapsed && s.toString().trim()) return false;
  const a = anoAt(e); if (!a) return false;
  const h = anoHits(a.pg, [a.x, a.y], 30, false)[0]; if (!h) return false;
  const n = h.n, mine = anoMine(n), can = mine && anoCan();
  const g = $(`.ink-g[data-nid="${CSS.escape(n.id)}"]`, a.svg); if (g) g.classList.add('sel');
  const when = n.ts ? new Date(n.ts).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '') : '';
  const p = popover({ left: e.clientX, right: e.clientX, top: e.clientY - 4, bottom: e.clientY + 4 }, `<div class="ink-who"><b>${esc(mine ? 'Tu anotación' : `Anotación de ${n.name || 'alguien'}`)}</b><span class="hint">${esc([when, n.on.s.length > 1 ? `${n.on.s.length} trazos` : ''].filter(Boolean).join(' · '))}</span>
    ${can ? '<div class="menu"><button data-ink-del style="color:var(--bad)">Borrar la anotación</button></div>' : ''}</div>`, pp => {
    pp._onClose = () => { const gg = $(`.ink-g.sel`); if (gg) gg.classList.remove('sel'); };
    pp.addEventListener('click', ev => { if (!ev.target.closest('[data-ink-del]')) return; closePop(); ANOT.last = null; anoPut({ [n.id]: null }, 'Borrar una anotación'); toastUndo('Anotación borrada.'); });
  });
  return !!p;
}

/* ---------- en la vista del guion rayado ---------- */
function anoBind(pages) {
  pages.addEventListener('pointerdown', anoDown, true);
  pages.addEventListener('pointermove', anoMove, true);
  pages.addEventListener('pointerup', anoUp, true);
  pages.addEventListener('pointercancel', anoUp, true);
  // dibujando, un toque no abre etiquetas, planos ni notas
  pages.addEventListener('click', e => { if (ANOT.on && !(e.target.closest && e.target.closest('#anoBar, .ink-ta'))) { e.preventDefault(); e.stopPropagation(); } }, true);
  pages.addEventListener('click', e => { if (anoWho(e)) e.stopPropagation(); });
  // dibujando con el dedo o el lápiz, la página no se desplaza (el desplazamiento con el dedo lo hace anoMove)
  pages.addEventListener('touchstart', e => { if (ANOT.on && (ANOT.draw || ANOT.pan) && e.touches.length === 1) e.preventDefault(); }, { passive: false });
  pages.addEventListener('touchmove', e => { if (ANOT.on && (ANOT.draw || ANOT.pan) && e.touches.length === 1) e.preventDefault(); }, { passive: false });
  pages.addEventListener('selectstart', e => { if (ANOT.on && !(e.target.closest && e.target.closest('.ink-ta'))) e.preventDefault(); });
  if (ANOT.on) { if (anoCan()) { anoPagesMode(); anoBarShow(); } else anoStop(); }
}
/* al salir del guion rayado se deja de anotar */
document.addEventListener('pointerdown', () => { if (ANOT.on && !$('#pages')) anoStop(); }, true);

/* ---------- PDF del guion rayado: vectoriales, en el mismo lugar ----------
   La página del PDF es la de la pantalla a 12 puntos por «em» (51 × 66 em = 612 × 792 pt): el texto empieza a los
   108 pt y el renglón li arriba en 72 + 12·li */
const anoPdfItems = () => edFormat() === 'av' ? new Map() : anoItems(true);
function anoPdfPage(doc, list) {
  if (!list || !list.length) return;
  const X = v => 108 + v * .12, Y = (y0, v) => (y0 + v) * .12;
  doc.setLineCap('round'); doc.setLineJoin('round');
  const poly = (pts, y0, mode) => { if (pts.length < 2) return; const s = pts.map(p => [X(p[0]), Y(y0, p[1])]); doc.lines(s.slice(1).map((p, i) => [p[0] - s[i][0], p[1] - s[i][1]]), s[0][0], s[0][1], [1, 1], mode, mode === 'F'); };
  for (const it of list) for (const st of it.n.on.s) {
    const rgb = (Object.hasOwn(ANOT_RGB, st.c) && ANOT_RGB[st.c]) || ANOT_RGB.r, w = (ANOT_W[st.k] || ANOT_W.p)[st.w - 1] || 15;
    doc.setDrawColor(...rgb); doc.setFillColor(...rgb);
    if (st.k === 't') {
      const b = anoTextBox(st), fx = typeof pdfFontX === 'function' ? pdfFontX(doc, 'shantell') : '';
      doc.setFont(fx || 'helvetica', 'normal'); doc.setFontSize(b.fs * .12); doc.setTextColor(...rgb);
      b.lines.forEach((l, i) => doc.text(pdfSafe(l), X(b.x), Y(it.y0, b.y + b.fs * .92 + i * b.fs * 1.22)));
      continue;
    }
    if (st.k === 'a') {
      const A = anoArrow(st.d, w);
      doc.setLineWidth(w * .12); poly(A.body, it.y0, 'S');
      poly(A.head, it.y0, 'F');
      continue;
    }
    const pts = anoPts(st.d);
    if (st.k === 'm') { try { doc.saveGraphicsState(); doc.setGState(new doc.GState({ opacity: .32, 'stroke-opacity': .32 })); } catch (e) { } }
    if (pts.length === 1) doc.circle(X(pts[0][0]), Y(it.y0, pts[0][1]), w * .06, 'F');   // un toque: un punto
    else if (st.k === 'p' && st.z) {
      // el contorno del lápiz con presión, como en pantalla
      const ring = anoOutline(pts, st.z, w).replace(/^M|Z$/g, '').split('L').map(s => s.split(' ').map(Number)).filter(p => p.length === 2 && p.every(isFinite));
      poly(ring, it.y0, 'F');
    }
    else { doc.setLineWidth(w * .12); poly(pts, it.y0, 'S'); }
    if (st.k === 'm') { try { doc.restoreGraphicsState(); } catch (e) { } }
  }
  doc.setLineCap('butt'); doc.setLineJoin('miter');
  doc.setTextColor(0, 0, 0); doc.setDrawColor(0, 0, 0); doc.setFont('courier', 'normal'); doc.setFontSize(12);
}

ACT.ink = () => { if (ANOT.on) anoStop(); else anoStart(); };
ACT['ano-mine'] = () => { ls.set('anoMine', !anoMineOnly()); anoRepaint(); anoBarPaint(); };   // Ajustes se vuelve a dibujar solo (barra.js · livePop)
